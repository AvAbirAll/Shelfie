import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// ── Firebase ──────────────────────────────────────────────
import { initializeApp } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider, signInWithPopup,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile
} from 'firebase/auth';
import {
  getFirestore, doc, setDoc, getDoc
} from 'firebase/firestore';

const fbConfig = {
  apiKey: "AIzaSyBvbp6Z3Ha4FCmuZ2ErQ9xVB0teD2s8JuY",
  authDomain: "shelfie-911.firebaseapp.com",
  projectId: "shelfie-911",
  storageBucket: "shelfie-911.firebasestorage.app",
  messagingSenderId: "146732929065",
  appId: "1:146732929065:web:668e213d55498436b20c38"
};

const fbApp = initializeApp(fbConfig);
const fbAuth = getAuth(fbApp);
const fbDb = getFirestore(fbApp);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// ── Constants ─────────────────────────────────────────────
const CURRENCIES = {
  EUR:{s:'€',r:0.0084}, USD:{s:'$',r:0.0090}, GBP:{s:'£',r:0.0072},
  BDT:{s:'৳',r:1}, INR:{s:'₹',r:0.74}, JPY:{s:'¥',r:1.34},
  AED:{s:'د.إ',r:0.033}, SGD:{s:'S$',r:0.012}, CAD:{s:'CA$',r:0.012},
  AUD:{s:'A$',r:0.014}, TRY:{s:'₺',r:0.27}, SAR:{s:'﷼',r:0.034},
  CHF:{s:'₣',r:0.0082}, CNY:{s:'¥',r:0.065}
};

const CATEGORIES = ['All','Grains','Spices','Drinks','Dairy','Snacks','Bakery','Frozen','Canned','Personal Care','Cleaning','Other'];

const DEMO_PRODUCTS = [
  {id:'d1',name:'Basmati Rice',company:'ACI Foods',category:'Grains',unit:'1kg',buyPrice:126,sellPrice:155,qty:45,expiry:'2025-12-01',photo:null,priceHistory:[],createdAt:Date.now()-86400000*30},
  {id:'d2',name:'Mustard Oil',company:'Radhuni',category:'Spices',unit:'1L',buyPrice:189,sellPrice:230,qty:18,expiry:'2025-08-15',photo:null,priceHistory:[],createdAt:Date.now()-86400000*20},
  {id:'d3',name:'Mango Juice',company:'Pran',category:'Drinks',unit:'250ml',buyPrice:51.75,sellPrice:68,qty:60,expiry:'2025-06-30',photo:null,priceHistory:[],createdAt:Date.now()-86400000*10},
  {id:'d4',name:'Full Cream Milk',company:'Milk Vita',category:'Dairy',unit:'500ml',buyPrice:70,sellPrice:88,qty:7,expiry:'2025-03-28',photo:null,priceHistory:[],createdAt:Date.now()-86400000*5},
  {id:'d5',name:'Turmeric Powder',company:'BD Foods',category:'Spices',unit:'200g',buyPrice:57.75,sellPrice:78,qty:30,expiry:'2026-01-10',photo:null,priceHistory:[],createdAt:Date.now()-86400000*2},
  {id:'d6',name:'Potato Chips',company:'Bombay Sweets',category:'Snacks',unit:'100g',buyPrice:34.5,sellPrice:48,qty:5,expiry:'2025-05-20',photo:null,priceHistory:[],createdAt:Date.now()-86400000}
];

// ── Storage helpers ───────────────────────────────────────
const lsGet = (k, fb=null) => { try { const v=localStorage.getItem(k); return v?JSON.parse(v):fb; } catch { return fb; } };
const lsSet = (k, v) => { try { localStorage.setItem(k,JSON.stringify(v)); } catch {} };

const loadProducts = (email) => lsGet(`sh3_d_${email}`, DEMO_PRODUCTS);
const saveProducts = (email, items) => lsSet(`sh3_d_${email}`, items);
const loadTrash = (email) => lsGet(`sh3_t_${email}`, []);
const saveTrash = (email, items) => lsSet(`sh3_t_${email}`, items);
const loadCurrency = (email) => lsGet(`sh3_c_${email}`, 'BDT');
const saveCurrency = (email, c) => lsSet(`sh3_c_${email}`, c);
const loadOrders = (email) => lsGet(`sh3_o_${email}`, []);
const saveOrders = (email, items) => lsSet(`sh3_o_${email}`, items);

// ── Firestore sync ────────────────────────────────────────
async function syncToFirestore(uid, email, products, currency) {
  try {
    await setDoc(doc(fbDb, 'users', uid, 'data', 'products'), { items: JSON.stringify(products), updated: Date.now() });
    await setDoc(doc(fbDb, 'users', uid, 'data', 'settings'), { currency });
  } catch (e) { console.warn('Firestore sync failed:', e.message); }
}

async function loadFromFirestore(uid) {
  try {
    const pd = await getDoc(doc(fbDb, 'users', uid, 'data', 'products'));
    const sd = await getDoc(doc(fbDb, 'users', uid, 'data', 'settings'));
    return {
      products: pd.exists() ? JSON.parse(pd.data().items || '[]') : null,
      currency: sd.exists() ? sd.data().currency : null
    };
  } catch (e) { console.warn('Firestore load failed:', e.message); return { products: null, currency: null }; }
}

// ── Utils ─────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2,10)+Date.now().toString(36);
const formatPrice = (v, cur) => `${CURRENCIES[cur]?.s||'৳'}${v?.toFixed(2)||'0.00'}`;
const margin = (b,s) => b>0?Math.round(((s-b)/b)*100):0;

const expiryStatus = (dateStr) => {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr)-new Date())/(1000*60*60*24));
  if (diff < 0) return {label:'Expired',color:'#D95F3B',bg:'#FDF0ED',days:diff};
  if (diff === 0) return {label:'Today!',color:'#D95F3B',bg:'#FDF0ED',days:diff};
  if (diff === 1) return {label:'Tomorrow!',color:'#E8A020',bg:'#FDF4E7',days:diff};
  if (diff <= 7) return {label:`${diff}d left`,color:'#E8A020',bg:'#FDF4E7',days:diff};
  if (diff <= 30) return {label:`${diff}d`,color:'#2D5A3F',bg:'#EBF2ED',days:diff};
  return {label:`${diff}d`,color:'#9B9590',bg:'var(--surface2)',days:diff};
};

// ── Icons (inline SVG) ────────────────────────────────────
const Ic = ({ name, size=20, color='currentColor', ...p }) => {
  const paths = {
    home: 'M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z M9 21V12h6v9',
    stock: 'M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16',
    lens: 'M11 19a8 8 0 100-16 8 8 0 000 16z M21 21l-4.35-4.35',
    orders: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2 M9 5a2 2 0 002 2h2a2 2 0 002-2 M9 5a2 2 0 012-2h2a2 2 0 012 2 M9 12h6 M9 16h4',
    stats: 'M18 20V10 M12 20V4 M6 20v-6',
    plus: 'M12 5v14 M5 12h14',
    trash: 'M3 6h18 M8 6V4h8v2 M19 6l-1 14H6L5 6',
    back: 'M19 12H5 M12 19l-7-7 7-7',
    close: 'M18 6L6 18 M6 6l12 12',
    check: 'M20 6L9 17l-5-5',
    edit: 'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7 M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z',
    restore: 'M1 4v6h6 M23 20v-6h-6 M20.49 9A9 9 0 005.64 5.64L1 10 M23 14l-4.64 4.36A9 9 0 013.51 15',
    camera: 'M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z M12 17a4 4 0 100-8 4 4 0 000 8z',
    user: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 11a4 4 0 100-8 4 4 0 000 8z',
    google: null,
    sun: 'M12 17a5 5 0 100-10 5 5 0 000 10z M12 1v2 M12 21v2 M4.22 4.22l1.42 1.42 M18.36 18.36l1.42 1.42 M1 12h2 M21 12h2 M4.22 19.78l1.42-1.42 M18.36 5.64l1.42-1.42',
    moon: 'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z',
    bell: 'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 01-3.46 0',
    currency: 'M12 1v22 M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6',
    download: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4 M7 10l5 5 5-5 M12 15V3',
    warning: 'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z M12 9v4 M12 17h.01',
    info: 'M12 22a10 10 0 100-20 10 10 0 000 20z M12 8v4 M12 16h.01',
    chart: 'M18 20V10 M12 20V4 M6 20v-6',
    package: 'M16.5 9.4l-9-5.19 M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12',
    star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    fire: 'M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z',
    logout: 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4 M16 17l5-5-5-5 M21 12H9',
    photo: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
    globe: 'M12 22a10 10 0 100-20 10 10 0 000 20z M2 12h20 M12 2a15.3 15.3 0 010 20 15.3 15.3 0 010-20z',
    ai: 'M12 2a2 2 0 012 2v2a2 2 0 01-2 2 2 2 0 01-2-2V4a2 2 0 012-2z M12 16a2 2 0 012 2v2a2 2 0 01-2 2 2 2 0 01-2-2v-2a2 2 0 012-2z M2 12a2 2 0 012-2h2a2 2 0 012 2 2 2 0 01-2 2H4a2 2 0 01-2-2z M16 12a2 2 0 012-2h2a2 2 0 012 2 2 2 0 01-2 2h-2a2 2 0 01-2-2z M5.636 5.636a2 2 0 012.828 0L10.1 7.272a2 2 0 010 2.828 2 2 0 01-2.828 0L5.636 8.464a2 2 0 010-2.828z M13.9 13.9a2 2 0 012.828 0l1.636 1.636a2 2 0 010 2.828 2 2 0 01-2.828 0L13.9 16.728a2 2 0 010-2.828z',
  };
  if (name === 'google') return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...p}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      {paths[name] && paths[name].split(' M').map((d,i) => (
        <path key={i} d={(i===0?'':' M')+d} />
      ))}
    </svg>
  );
};

// ── Components ────────────────────────────────────────────
const Btn = ({ children, onClick, variant='primary', disabled, full, sm, style, ...p }) => {
  const base = {
    display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8,
    fontFamily:'var(--ff-body)', fontWeight:600, cursor:disabled?'not-allowed':'pointer',
    border:'none', outline:'none', transition:'all 0.18s', userSelect:'none',
    opacity: disabled?0.5:1, width: full?'100%':undefined,
    borderRadius: sm?10:14, padding: sm?'8px 16px':'13px 24px',
    fontSize: sm?13:15, ...style
  };
  const variants = {
    primary: { background:'var(--primary)', color:'#fff' },
    accent: { background:'var(--accent)', color:'#fff' },
    ghost: { background:'transparent', color:'var(--text)', border:'1.5px solid var(--border)' },
    danger: { background:'#FDF0ED', color:'var(--accent)' },
    soft: { background:'var(--surface2)', color:'var(--text)' },
  };
  return <button style={{...base,...variants[variant]}} onClick={!disabled?onClick:undefined} {...p}>{children}</button>;
};

const Card = ({ children, style, onClick, ...p }) => (
  <div onClick={onClick} style={{
    background:'var(--surface)', borderRadius:'var(--radius)',
    border:'1.5px solid var(--border)', padding:16,
    cursor:onClick?'pointer':'default', transition:'box-shadow 0.18s',
    ...style
  }} {...p}>{children}</div>
);

const Sheet = ({ open, onClose, children, title }) => {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);
  if (!open) return null;
  return (
    <div style={{position:'fixed',inset:0,zIndex:200,display:'flex',flexDirection:'column',justifyContent:'flex-end'}}>
      <div style={{position:'absolute',inset:0,background:'rgba(15,14,12,0.5)',backdropFilter:'blur(4px)'}} onClick={onClose}/>
      <div style={{position:'relative',background:'var(--surface)',borderRadius:'24px 24px 0 0',maxHeight:'92vh',display:'flex',flexDirection:'column',animation:'slideUp 0.3s ease'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 20px 0',flexShrink:0}}>
          {title && <div style={{fontFamily:'var(--ff-head)',fontWeight:700,fontSize:18}}>{title}</div>}
          <button onClick={onClose} style={{marginLeft:'auto',background:'var(--surface2)',border:'none',borderRadius:50,width:32,height:32,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text2)'}}>
            <Ic name="close" size={16}/>
          </button>
        </div>
        <div style={{overflowY:'auto',flex:1,padding:'16px 20px 32px'}}>{children}</div>
      </div>
    </div>
  );
};

const Modal = ({ open, onClose, children, title }) => {
  if (!open) return null;
  return (
    <div style={{position:'fixed',inset:0,zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{position:'absolute',inset:0,background:'rgba(15,14,12,0.6)',backdropFilter:'blur(6px)'}} onClick={onClose}/>
      <div style={{position:'relative',background:'var(--surface)',borderRadius:'var(--radius)',padding:24,width:'100%',maxWidth:400,animation:'scaleIn 0.25s ease'}}>
        {title && <div style={{fontFamily:'var(--ff-head)',fontWeight:700,fontSize:18,marginBottom:16}}>{title}</div>}
        {children}
      </div>
    </div>
  );
};

const Input = ({ label, value, onChange, type='text', placeholder, prefix, suffix, style, ...p }) => (
  <div style={{display:'flex',flexDirection:'column',gap:6,...style}}>
    {label && <label style={{fontSize:13,fontWeight:500,color:'var(--text2)'}}>{label}</label>}
    <div style={{position:'relative',display:'flex',alignItems:'center'}}>
      {prefix && <span style={{position:'absolute',left:12,color:'var(--text3)',fontSize:14}}>{prefix}</span>}
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{width:'100%',background:'var(--surface2)',border:'1.5px solid var(--border)',borderRadius:10,
          padding:`11px ${suffix?40:12}px 11px ${prefix?32:12}px`,fontSize:15,color:'var(--text)',
          fontFamily:'var(--ff-body)',outline:'none',transition:'border-color 0.18s'}}
        onFocus={e=>e.target.style.borderColor='var(--primary)'}
        onBlur={e=>e.target.style.borderColor='var(--border)'} {...p}/>
      {suffix && <span style={{position:'absolute',right:12,color:'var(--text3)',fontSize:14}}>{suffix}</span>}
    </div>
  </div>
);

const Badge = ({ children, color='var(--text2)', bg='var(--surface2)' }) => (
  <span style={{display:'inline-flex',alignItems:'center',gap:4,padding:'3px 8px',borderRadius:20,fontSize:11,fontWeight:600,color,background:bg}}>{children}</span>
);

const Spinner = ({ size=24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{animation:'spin 0.8s linear infinite'}}>
    <circle cx="12" cy="12" r="10" fill="none" stroke="var(--border)" strokeWidth="3"/>
    <path d="M12 2a10 10 0 0110 10" fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round"/>
  </svg>
);

// ── Auth Screen ───────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const gLogin = async () => {
    setLoading(true); setErr('');
    try {
      const result = await signInWithPopup(fbAuth, googleProvider);
      const u = result.user;
      onAuth({ uid: u.uid, email: u.email, name: u.displayName, photo: u.photoURL });
    } catch (e) {
      if (e.code !== 'auth/popup-closed-by-user') setErr('Google sign-in failed. Try again.');
    } finally { setLoading(false); }
  };

  const emailAuth = async () => {
    if (!email || !pass) { setErr('Fill in all fields.'); return; }
    setLoading(true); setErr('');
    try {
      let result;
      if (mode === 'signup') {
        result = await createUserWithEmailAndPassword(fbAuth, email, pass);
        if (name) await updateProfile(result.user, { displayName: name });
      } else {
        result = await signInWithEmailAndPassword(fbAuth, email, pass);
      }
      const u = result.user;
      onAuth({ uid: u.uid, email: u.email, name: u.displayName || name || email.split('@')[0], photo: u.photoURL });
    } catch (e) {
      const msgs = { 'auth/email-already-in-use':'Email already in use.', 'auth/wrong-password':'Wrong password.', 'auth/user-not-found':'No account with that email.', 'auth/weak-password':'Password too short (min 6 chars).' };
      setErr(msgs[e.code] || e.message);
    } finally { setLoading(false); }
  };

  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:24,background:'var(--bg)'}}>
      <div style={{width:'100%',maxWidth:380,animation:'fadeUp 0.4s ease'}}>
        {/* Logo */}
        <div style={{textAlign:'center',marginBottom:40}}>
          <div style={{width:64,height:64,background:'var(--primary)',borderRadius:20,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',boxShadow:'0 8px 24px rgba(28,56,41,0.3)'}}>
            <Ic name="package" size={32} color="#fff"/>
          </div>
          <h1 style={{fontFamily:'var(--ff-head)',fontWeight:800,fontSize:30,color:'var(--text)'}}>Shelfie Pro</h1>
          <p style={{color:'var(--text2)',marginTop:4}}>Smart inventory management</p>
        </div>

        {/* Google */}
        <button onClick={gLogin} disabled={loading} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:10,padding:'13px 24px',background:'var(--surface)',border:'1.5px solid var(--border)',borderRadius:14,cursor:'pointer',fontFamily:'var(--ff-body)',fontWeight:600,fontSize:15,color:'var(--text)',marginBottom:20,transition:'all 0.18s'}}>
          <Ic name="google" size={20}/> Continue with Google
        </button>

        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
          <div style={{flex:1,height:1,background:'var(--border)'}}/>
          <span style={{color:'var(--text3)',fontSize:13}}>or</span>
          <div style={{flex:1,height:1,background:'var(--border)'}}/>
        </div>

        {/* Email form */}
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {mode==='signup' && <Input label="Name" value={name} onChange={setName} placeholder="Your name"/>}
          <Input label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com"/>
          <Input label="Password" type="password" value={pass} onChange={setPass} placeholder="••••••••"/>
          {err && <div style={{padding:'10px 12px',background:'var(--red-soft)',borderRadius:10,color:'var(--accent)',fontSize:13}}>{err}</div>}
          <Btn full onClick={emailAuth} disabled={loading}>
            {loading ? <Spinner size={18}/> : (mode==='login'?'Sign In':'Create Account')}
          </Btn>
        </div>

        <p style={{textAlign:'center',marginTop:20,color:'var(--text2)',fontSize:14}}>
          {mode==='login'?'No account? ':'Already have one? '}
          <button onClick={()=>{setMode(m=>m==='login'?'signup':'login');setErr('');}} style={{background:'none',border:'none',color:'var(--primary)',fontWeight:600,cursor:'pointer',fontFamily:'var(--ff-body)'}}>
            {mode==='login'?'Sign up':'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}

// ── Product Card ──────────────────────────────────────────
function ProductCard({ p, currency, onClick, onDelete }) {
  const exp = expiryStatus(p.expiry);
  const m = margin(p.buyPrice, p.sellPrice);
  const low = p.qty < 10;
  return (
    <div onClick={onClick} style={{background:'var(--surface)',borderRadius:'var(--radius)',border:'1.5px solid var(--border)',padding:14,display:'flex',gap:12,cursor:'pointer',transition:'box-shadow 0.18s',position:'relative'}}>
      <div style={{width:52,height:52,borderRadius:12,background:p.photo?'transparent':'var(--green-soft)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,overflow:'hidden'}}>
        {p.photo ? <img src={p.photo} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <Ic name="package" size={24} color="var(--primary)"/>}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8}}>
          <div style={{minWidth:0}}>
            <div style={{fontWeight:600,fontSize:15,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div>
            <div style={{color:'var(--text3)',fontSize:12,marginTop:1}}>{p.company} · {p.unit}</div>
          </div>
          <button onClick={e=>{e.stopPropagation();onDelete(p.id);}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text3)',padding:2,flexShrink:0}}>
            <Ic name="trash" size={15}/>
          </button>
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:8}}>
          <div>
            <span style={{fontFamily:'var(--ff-mono)',fontWeight:500,fontSize:16,color:'var(--text)'}}>{formatPrice(p.sellPrice,currency)}</span>
            <span style={{fontSize:11,color:'var(--text3)',marginLeft:4}}>sell</span>
          </div>
          <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap',justifyContent:'flex-end'}}>
            {low && <Badge color="#E8A020" bg="var(--amber-soft)">Low: {p.qty}</Badge>}
            {exp && <Badge color={exp.color} bg={exp.bg}>{exp.label}</Badge>}
            <Badge color={m>=20?'#2D5A3F':'var(--text2)'} bg={m>=20?'var(--green-soft)':'var(--surface2)'}>{m}%</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Add Product Wizard ────────────────────────────────────
function AddProductSheet({ open, onClose, onSave, existing, currency }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [category, setCategory] = useState('Other');
  const [unit, setUnit] = useState('');
  const [qty, setQty] = useState('1');
  const [buyPrice, setBuyPrice] = useState('');
  const [vat, setVat] = useState('0');
  const [sellPrice, setSellPrice] = useState('');
  const [expiry, setExpiry] = useState('');
  const [photo, setPhoto] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const fileRef = useRef();

  const restock = existing?.find(p => p.name.toLowerCase() === name.toLowerCase());

  useEffect(() => {
    if (!open) { setStep(1);setName('');setCompany('');setCategory('Other');setUnit('');setQty('1');setBuyPrice('');setVat('0');setSellPrice('');setExpiry('');setPhoto(null); }
  }, [open]);

  const effectiveBuy = () => {
    const b = parseFloat(buyPrice)||0;
    const v = parseFloat(vat)||0;
    return b + (b * v / 100);
  };

  const marginPct = () => {
    const b = effectiveBuy(), s = parseFloat(sellPrice)||0;
    return b > 0 ? Math.round(((s-b)/b)*100) : 0;
  };

  const handlePhoto = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const max = 400;
        let w = img.width, h = img.height;
        if (w > max) { h = h*(max/w); w = max; }
        if (h > max) { w = w*(max/h); h = max; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        setPhoto(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const aiDetect = () => {
    setAiLoading(true);
    setTimeout(() => {
      if (!name) setName('Product ' + Math.floor(Math.random()*100));
      if (!company) setCompany('Auto Detected Co.');
      if (!buyPrice) setBuyPrice(String(Math.floor(Math.random()*200+50)));
      if (!sellPrice) setSellPrice(String(Math.floor(Math.random()*100+100)));
      setAiLoading(false);
    }, 1500);
  };

  const save = () => {
    if (!name || !buyPrice || !sellPrice) return;
    const product = {
      id: uid(), name, company, category, unit, qty: parseInt(qty)||1,
      buyPrice: effectiveBuy(), sellPrice: parseFloat(sellPrice)||0,
      expiry, photo, priceHistory: [], createdAt: Date.now()
    };
    onSave(product);
    onClose();
  };

  const useRestock = () => {
    if (restock) { setBuyPrice(String(restock.buyPrice)); setSellPrice(String(restock.sellPrice)); setUnit(restock.unit); setCategory(restock.category); setCompany(restock.company); }
  };

  const cats = CATEGORIES.filter(c=>c!=='All');

  return (
    <Sheet open={open} onClose={onClose} title={`Add Product — Step ${step}/3`}>
      {/* Step indicators */}
      <div style={{display:'flex',gap:6,marginBottom:24}}>
        {[1,2,3].map(s=>(
          <div key={s} style={{flex:1,height:4,borderRadius:4,background:s<=step?'var(--primary)':'var(--border)',transition:'background 0.3s'}}/>
        ))}
      </div>

      {step === 1 && (
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div style={{display:'flex',gap:10}}>
            <div onClick={()=>fileRef.current?.click()} style={{width:64,height:64,borderRadius:12,background:'var(--green-soft)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,overflow:'hidden',border:'2px dashed var(--border)'}}>
              {photo ? <img src={photo} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <Ic name="camera" size={24} color="var(--primary)"/>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{display:'none'}} onChange={handlePhoto}/>
            <Btn variant="soft" sm onClick={aiDetect} disabled={aiLoading} style={{flex:1}}>
              {aiLoading ? <Spinner size={16}/> : <><Ic name="ai" size={14}/> AI Detect</>}
            </Btn>
          </div>
          <Input label="Product Name *" value={name} onChange={setName} placeholder="e.g. Basmati Rice"/>
          {restock && (
            <div style={{padding:'10px 12px',background:'var(--green-soft)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{fontSize:13,color:'var(--primary)'}}>📦 Found existing — use past data?</div>
              <Btn sm variant="primary" onClick={useRestock}>Use</Btn>
            </div>
          )}
          <Input label="Company / Brand" value={company} onChange={setCompany} placeholder="e.g. ACI Foods"/>
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            <label style={{fontSize:13,fontWeight:500,color:'var(--text2)'}}>Category</label>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {cats.map(c=>(
                <button key={c} onClick={()=>setCategory(c)} style={{padding:'6px 12px',borderRadius:20,fontSize:13,fontWeight:500,border:'1.5px solid',borderColor:category===c?'var(--primary)':'var(--border)',background:category===c?'var(--green-soft)':'transparent',color:category===c?'var(--primary)':'var(--text2)',cursor:'pointer',transition:'all 0.15s'}}>{c}</button>
              ))}
            </div>
          </div>
          <div style={{display:'flex',gap:10}}>
            <Input label="Unit" value={unit} onChange={setUnit} placeholder="e.g. 1kg" style={{flex:1}}/>
            <Input label="Quantity" type="number" value={qty} onChange={setQty} placeholder="1" style={{flex:1}}/>
          </div>
          <Btn full onClick={()=>setStep(2)} disabled={!name}>Next →</Btn>
        </div>
      )}

      {step === 2 && (
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div style={{display:'flex',gap:10}}>
            <Input label="Base Buy Price" type="number" value={buyPrice} onChange={setBuyPrice} prefix={CURRENCIES[currency]?.s} style={{flex:2}}/>
            <Input label="VAT %" type="number" value={vat} onChange={setVat} suffix="%" style={{flex:1}}/>
          </div>
          {parseFloat(vat)>0 && (
            <div style={{padding:'10px 12px',background:'var(--surface2)',borderRadius:10,fontSize:13,color:'var(--text2)'}}>
              Effective buy price: <span style={{fontFamily:'var(--ff-mono)',color:'var(--text)',fontWeight:500}}>{formatPrice(effectiveBuy(),currency)}</span>
            </div>
          )}
          <Input label="Selling Price" type="number" value={sellPrice} onChange={setSellPrice} prefix={CURRENCIES[currency]?.s}/>
          {buyPrice && sellPrice && (
            <div style={{padding:'12px 14px',background:marginPct()>=0?'var(--green-soft)':'var(--red-soft)',borderRadius:10,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:13,color:'var(--text2)'}}>Profit margin</span>
              <span style={{fontFamily:'var(--ff-mono)',fontWeight:600,fontSize:16,color:marginPct()>=0?'var(--primary)':'var(--accent)'}}>{marginPct()}%</span>
            </div>
          )}
          <div style={{display:'flex',gap:10}}>
            <Btn full variant="ghost" onClick={()=>setStep(1)}>← Back</Btn>
            <Btn full onClick={()=>setStep(3)} disabled={!buyPrice||!sellPrice}>Next →</Btn>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <Input label="Expiry Date" type="date" value={expiry} onChange={setExpiry}/>
          {expiry && (() => { const s=expiryStatus(expiry); return s && (
            <div style={{padding:'10px 12px',background:s.bg,borderRadius:10,color:s.color,fontSize:13,fontWeight:500}}>⏰ {s.label}</div>
          )})()}
          {/* Summary */}
          <Card style={{background:'var(--green-soft)',border:'1.5px solid var(--primary)20'}}>
            <div style={{fontFamily:'var(--ff-head)',fontWeight:700,marginBottom:10}}>Summary</div>
            <div style={{display:'flex',flexDirection:'column',gap:6,fontSize:14}}>
              <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'var(--text2)'}}>Product</span><span style={{fontWeight:500}}>{name}</span></div>
              <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'var(--text2)'}}>Buy</span><span style={{fontFamily:'var(--ff-mono)'}}>{formatPrice(effectiveBuy(),currency)}</span></div>
              <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'var(--text2)'}}>Sell</span><span style={{fontFamily:'var(--ff-mono)'}}>{formatPrice(parseFloat(sellPrice)||0,currency)}</span></div>
              <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'var(--text2)'}}>Margin</span><span style={{fontWeight:600,color:'var(--primary)'}}>{marginPct()}%</span></div>
            </div>
          </Card>
          <div style={{display:'flex',gap:10}}>
            <Btn full variant="ghost" onClick={()=>setStep(2)}>← Back</Btn>
            <Btn full variant="accent" onClick={save}>Save Product</Btn>
          </div>
        </div>
      )}
    </Sheet>
  );
}

// ── Product Detail Sheet ──────────────────────────────────
function ProductDetailSheet({ open, onClose, product, currency, onEdit, onDelete }) {
  if (!product) return null;
  const exp = expiryStatus(product.expiry);
  const m = margin(product.buyPrice, product.sellPrice);

  return (
    <Sheet open={open} onClose={onClose} title={product.name}>
      <div style={{display:'flex',flexDirection:'column',gap:16}}>
        {product.photo && <img src={product.photo} style={{width:'100%',height:200,objectFit:'cover',borderRadius:12}}/>}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <Card style={{textAlign:'center'}}>
            <div style={{color:'var(--text3)',fontSize:12,marginBottom:4}}>Buy Price</div>
            <div style={{fontFamily:'var(--ff-mono)',fontWeight:600,fontSize:18,color:'var(--text)'}}>{formatPrice(product.buyPrice,currency)}</div>
          </Card>
          <Card style={{textAlign:'center'}}>
            <div style={{color:'var(--text3)',fontSize:12,marginBottom:4}}>Sell Price</div>
            <div style={{fontFamily:'var(--ff-mono)',fontWeight:600,fontSize:18,color:'var(--primary)'}}>{formatPrice(product.sellPrice,currency)}</div>
          </Card>
          <Card style={{textAlign:'center'}}>
            <div style={{color:'var(--text3)',fontSize:12,marginBottom:4}}>Margin</div>
            <div style={{fontFamily:'var(--ff-mono)',fontWeight:600,fontSize:18,color:m>=20?'var(--primary)':'var(--text)'}}>{m}%</div>
          </Card>
          <Card style={{textAlign:'center'}}>
            <div style={{color:'var(--text3)',fontSize:12,marginBottom:4}}>Qty in Stock</div>
            <div style={{fontFamily:'var(--ff-mono)',fontWeight:600,fontSize:18,color:product.qty<10?'var(--accent)':'var(--text)'}}>{product.qty}</div>
          </Card>
        </div>
        <Card>
          <div style={{display:'flex',flexDirection:'column',gap:8,fontSize:14}}>
            {[['Company',product.company],['Category',product.category],['Unit',product.unit],['Expiry',product.expiry||'—']].map(([k,v])=>(
              <div key={k} style={{display:'flex',justifyContent:'space-between'}}>
                <span style={{color:'var(--text3)'}}>{k}</span>
                <span style={{fontWeight:500}}>{v}</span>
              </div>
            ))}
          </div>
        </Card>
        {exp && <div style={{padding:'12px 14px',background:exp.bg,borderRadius:12,color:exp.color,fontWeight:600,fontSize:14}}>⏰ Expiry: {exp.label}</div>}
        <div style={{display:'flex',gap:10}}>
          <Btn full variant="ghost" onClick={()=>onDelete(product.id)}><Ic name="trash" size={16}/> Delete</Btn>
          <Btn full variant="primary" onClick={()=>onEdit(product)}><Ic name="edit" size={16}/> Edit</Btn>
        </div>
      </div>
    </Sheet>
  );
}

// ── Lens Screen ───────────────────────────────────────────
function LensScreen({ products, currency, onClose }) {
  const [mode, setMode] = useState('text');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef();

  const search = useCallback(() => {
    if (!query.trim()) { setResults([]); return; }
    setLoading(true);
    setTimeout(() => {
      const q = query.toLowerCase();
      const own = products.filter(p =>
        p.name.toLowerCase().includes(q) || (p.company||'').toLowerCase().includes(q) || (p.category||'').toLowerCase().includes(q)
      ).map(p => ({ ...p, source:'own', match: p.name.toLowerCase().startsWith(q)?95:75 }));

      const online = [
        { id:'o1',name:query+' 1kg',company:'Online Store',sellPrice:(Math.random()*200+50).toFixed(2),source:'online',match:70 },
        { id:'o2',name:query+' Pack',company:'Market Place',sellPrice:(Math.random()*150+40).toFixed(2),source:'online',match:60 },
      ];
      setResults([...own, ...online]);
      setLoading(false);
    }, 800);
  }, [query, products]);

  useEffect(() => { const t = setTimeout(search,400); return ()=>clearTimeout(t); }, [search]);

  return (
    <div style={{position:'fixed',inset:0,zIndex:150,background:'var(--bg)',display:'flex',flexDirection:'column',animation:'fadeIn 0.2s'}}>
      {/* Header */}
      <div style={{padding:'56px 20px 16px',background:'var(--surface)',borderBottom:'1.5px solid var(--border)'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
          <button onClick={onClose} style={{background:'var(--surface2)',border:'none',borderRadius:10,padding:8,cursor:'pointer',color:'var(--text)'}}>
            <Ic name="back" size={20}/>
          </button>
          <h2 style={{fontFamily:'var(--ff-head)',fontWeight:700,fontSize:20}}>Smart Lens</h2>
        </div>
        <div style={{display:'flex',gap:6,marginBottom:12}}>
          {['text','photo'].map(m=>(
            <button key={m} onClick={()=>setMode(m)} style={{flex:1,padding:'8px 16px',borderRadius:10,border:'1.5px solid',borderColor:mode===m?'var(--primary)':'var(--border)',background:mode===m?'var(--green-soft)':'transparent',color:mode===m?'var(--primary)':'var(--text2)',fontWeight:600,fontSize:13,cursor:'pointer',fontFamily:'var(--ff-body)',textTransform:'capitalize'}}>
              {m==='text'?'🔍 Text':'📷 Photo'}
            </button>
          ))}
        </div>
        {mode==='text' ? (
          <Input value={query} onChange={setQuery} placeholder="Search by name, brand, category…"/>
        ) : (
          <Btn full variant="soft" onClick={()=>fileRef.current?.click()}><Ic name="camera" size={18}/> Scan / Upload Photo</Btn>
        )}
        <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={()=>{setQuery('detected product');setMode('text');}}/>
      </div>

      {/* Results */}
      <div style={{flex:1,overflowY:'auto',padding:'16px 20px',display:'flex',flexDirection:'column',gap:10}}>
        {loading ? <div style={{display:'flex',justifyContent:'center',padding:40}}><Spinner/></div> :
         results.length === 0 && query ? (
          <div style={{textAlign:'center',padding:40,color:'var(--text3)'}}>No results found</div>
         ) : results.map(r => (
          <div key={r.id} style={{background:'var(--surface)',borderRadius:14,border:'1.5px solid var(--border)',padding:14,display:'flex',gap:12,alignItems:'center'}}>
            <div style={{width:44,height:44,borderRadius:10,background:r.source==='own'?'var(--green-soft)':'var(--amber-soft)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <Ic name={r.source==='own'?'package':'globe'} size={20} color={r.source==='own'?'var(--primary)':'var(--amber)'}/>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:600,fontSize:14,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.name}</div>
              <div style={{color:'var(--text3)',fontSize:12}}>{r.company}</div>
            </div>
            <div style={{textAlign:'right',flexShrink:0}}>
              <div style={{fontFamily:'var(--ff-mono)',fontWeight:500,fontSize:15}}>{formatPrice(parseFloat(r.sellPrice)||0,currency)}</div>
              <div style={{fontSize:11,color:r.source==='own'?'var(--primary)':'var(--amber)',fontWeight:600}}>{r.match}% match {r.source==='online'&&'· AI'}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Home Screen ───────────────────────────────────────────
function HomeScreen({ products, currency, user }) {
  const today = new Date();
  const expiring = products.filter(p => { const e=expiryStatus(p.expiry); return e&&e.days<=7; });
  const lowStock = products.filter(p=>p.qty<10);
  const totalInvest = products.reduce((s,p)=>s+p.buyPrice*p.qty,0);
  const totalSell = products.reduce((s,p)=>s+p.sellPrice*p.qty,0);

  return (
    <div style={{padding:'0 20px 24px',overflowY:'auto',height:'100%'}}>
      {/* Greeting */}
      <div style={{padding:'60px 0 24px'}}>
        <div style={{color:'var(--text3)',fontSize:14}}>Good {today.getHours()<12?'morning':today.getHours()<18?'afternoon':'evening'} 👋</div>
        <h1 style={{fontFamily:'var(--ff-head)',fontWeight:800,fontSize:26,marginTop:4}}>{user.name?.split(' ')[0]||'Welcome'}</h1>
      </div>

      {/* KPI strip */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:20}}>
        {[
          {label:'Investment',val:totalInvest,icon:'package',color:'var(--primary)',bg:'var(--green-soft)'},
          {label:'Sell Value',val:totalSell,icon:'chart',color:'var(--indigo)',bg:'#EEF0FB'},
          {label:'Potential Profit',val:totalSell-totalInvest,icon:'star',color:'#E8A020',bg:'var(--amber-soft)'},
          {label:'Expiring Soon',val:expiring.length,icon:'warning',raw:true,color:'var(--accent)',bg:'var(--red-soft)'},
        ].map(k=>(
          <Card key={k.label} style={{background:k.bg,border:'none'}}>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:8}}>
              <span style={{fontSize:12,color:k.color,fontWeight:600}}>{k.label}</span>
              <Ic name={k.icon} size={16} color={k.color}/>
            </div>
            <div style={{fontFamily:'var(--ff-mono)',fontWeight:700,fontSize:18,color:k.color}}>
              {k.raw ? k.val : formatPrice(k.val,currency)}
            </div>
          </Card>
        ))}
      </div>

      {/* Alerts */}
      {expiring.length > 0 && (
        <div style={{marginBottom:16}}>
          <div style={{fontFamily:'var(--ff-head)',fontWeight:700,fontSize:15,marginBottom:10}}>⚠️ Expiring Soon</div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {expiring.slice(0,3).map(p=>{
              const e=expiryStatus(p.expiry);
              return <div key={p.id} style={{background:'var(--surface)',border:'1.5px solid var(--border)',borderRadius:12,padding:'10px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{fontWeight:500,fontSize:14}}>{p.name}</div>
                <Badge color={e.color} bg={e.bg}>{e.label}</Badge>
              </div>;
            })}
          </div>
        </div>
      )}

      {/* Low stock */}
      {lowStock.length > 0 && (
        <div>
          <div style={{fontFamily:'var(--ff-head)',fontWeight:700,fontSize:15,marginBottom:10}}>📦 Low Stock</div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {lowStock.slice(0,3).map(p=>(
              <div key={p.id} style={{background:'var(--surface)',border:'1.5px solid var(--border)',borderRadius:12,padding:'10px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{fontWeight:500,fontSize:14}}>{p.name}</div>
                <Badge color="#E8A020" bg="var(--amber-soft)">Only {p.qty} left</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {expiring.length===0 && lowStock.length===0 && (
        <div style={{textAlign:'center',padding:'40px 0',color:'var(--text3)'}}>
          <div style={{fontSize:40,marginBottom:10}}>✅</div>
          <div style={{fontWeight:600}}>All good! No alerts.</div>
        </div>
      )}
    </div>
  );
}

// ── Stock Screen ──────────────────────────────────────────
function StockScreen({ products, currency, onProductClick, onDelete }) {
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('All');
  const [detail, setDetail] = useState(null);

  const filtered = useMemo(() => {
    return products.filter(p => {
      const q = search.toLowerCase();
      const matchQ = !q || p.name.toLowerCase().includes(q) || (p.company||'').toLowerCase().includes(q);
      const matchC = cat==='All' || p.category===cat;
      return matchQ && matchC;
    });
  }, [products, search, cat]);

  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column'}}>
      <div style={{padding:'56px 20px 12px',flexShrink:0}}>
        <h2 style={{fontFamily:'var(--ff-head)',fontWeight:800,fontSize:22,marginBottom:14}}>Inventory</h2>
        <Input value={search} onChange={setSearch} placeholder="Search products…" prefix={<Ic name="lens" size={14}/>}/>
        <div style={{display:'flex',gap:6,marginTop:10,overflowX:'auto',paddingBottom:2}}>
          {CATEGORIES.map(c=>(
            <button key={c} onClick={()=>setCat(c)} style={{flexShrink:0,padding:'6px 12px',borderRadius:20,fontSize:13,fontWeight:500,border:'1.5px solid',borderColor:cat===c?'var(--primary)':'var(--border)',background:cat===c?'var(--green-soft)':'transparent',color:cat===c?'var(--primary)':'var(--text2)',cursor:'pointer',transition:'all 0.15s',fontFamily:'var(--ff-body)'}}>{c}</button>
          ))}
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'0 20px 24px',display:'flex',flexDirection:'column',gap:8}}>
        {filtered.length === 0 ? (
          <div style={{textAlign:'center',padding:'60px 0',color:'var(--text3)'}}>
            <Ic name="package" size={40} color="var(--border)"/>
            <div style={{marginTop:12,fontWeight:500}}>No products found</div>
          </div>
        ) : filtered.map(p => (
          <ProductCard key={p.id} p={p} currency={currency} onClick={()=>setDetail(p)} onDelete={onDelete}/>
        ))}
      </div>

      <ProductDetailSheet open={!!detail} product={detail} currency={currency}
        onClose={()=>setDetail(null)} onDelete={id=>{onDelete(id);setDetail(null);}} onEdit={()=>setDetail(null)}/>
    </div>
  );
}

// ── Orders Screen ─────────────────────────────────────────
function OrdersScreen({ email, products }) {
  const [orders, setOrders] = useState(() => loadOrders(email));
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const save = (o) => { setOrders(o); saveOrders(email,o); };

  const addOrder = () => {
    if (!newItem.trim()) return;
    save([...orders, {id:uid(),name:newItem,notes:newNotes,urgent:false,done:false,createdAt:Date.now()}]);
    setNewItem(''); setNewNotes(''); setShowAdd(false);
  };

  const toggle = (id,key) => save(orders.map(o=>o.id===id?{...o,[key]:!o[key]}:o));
  const del = (id) => save(orders.filter(o=>o.id!==id));

  const lowStock = products.filter(p=>p.qty<10).filter(p=>!orders.some(o=>o.name.toLowerCase()===p.name.toLowerCase()));

  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column'}}>
      <div style={{padding:'56px 20px 12px',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <h2 style={{fontFamily:'var(--ff-head)',fontWeight:800,fontSize:22}}>To Order</h2>
          <Btn sm variant="accent" onClick={()=>setShowAdd(true)}><Ic name="plus" size={14}/> Add</Btn>
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'0 20px 24px',display:'flex',flexDirection:'column',gap:8}}>
        {lowStock.length > 0 && (
          <div style={{padding:'10px 14px',background:'var(--amber-soft)',borderRadius:12,marginBottom:4}}>
            <div style={{fontSize:12,color:'var(--amber)',fontWeight:600,marginBottom:6}}>⚠️ Low stock — add to order?</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {lowStock.map(p=>(
                <button key={p.id} onClick={()=>save([...orders,{id:uid(),name:p.name,notes:'',urgent:true,done:false,createdAt:Date.now()}])}
                  style={{padding:'4px 10px',borderRadius:16,fontSize:12,fontWeight:500,background:'var(--surface)',border:'1.5px solid var(--amber)',color:'var(--amber)',cursor:'pointer',fontFamily:'var(--ff-body)'}}>
                  + {p.name} ({p.qty})
                </button>
              ))}
            </div>
          </div>
        )}

        {orders.length === 0 ? (
          <div style={{textAlign:'center',padding:'60px 0',color:'var(--text3)'}}>
            <Ic name="orders" size={40} color="var(--border)"/>
            <div style={{marginTop:12,fontWeight:500}}>No orders yet</div>
          </div>
        ) : orders.map(o => (
          <div key={o.id} style={{background:'var(--surface)',border:'1.5px solid',borderColor:o.urgent?'#E8A02060':'var(--border)',borderRadius:14,padding:'12px 14px',opacity:o.done?0.5:1,transition:'opacity 0.2s'}}>
            <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
              <button onClick={()=>toggle(o.id,'done')} style={{width:22,height:22,borderRadius:6,border:'2px solid',borderColor:o.done?'var(--primary)':'var(--border)',background:o.done?'var(--primary)':'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1}}>
                {o.done && <Ic name="check" size={12} color="#fff"/>}
              </button>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:14,textDecoration:o.done?'line-through':'none'}}>{o.name}</div>
                {o.notes && <div style={{color:'var(--text3)',fontSize:12,marginTop:2}}>{o.notes}</div>}
              </div>
              <div style={{display:'flex',gap:6,flexShrink:0}}>
                <button onClick={()=>toggle(o.id,'urgent')} style={{padding:'3px 8px',borderRadius:8,border:'1.5px solid',borderColor:o.urgent?'var(--amber)':'var(--border)',background:o.urgent?'var(--amber-soft)':'transparent',color:o.urgent?'var(--amber)':'var(--text3)',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'var(--ff-body)'}}>
                  {o.urgent?'🔥 Urgent':'Urgent'}
                </button>
                <button onClick={()=>del(o.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text3)',padding:2}}><Ic name="close" size={14}/></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="Add Order Item">
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <Input label="Item name" value={newItem} onChange={setNewItem} placeholder="e.g. Basmati Rice"/>
          <Input label="Notes (optional)" value={newNotes} onChange={setNewNotes} placeholder="e.g. 5kg bag"/>
          <div style={{display:'flex',gap:10,marginTop:4}}>
            <Btn full variant="ghost" onClick={()=>setShowAdd(false)}>Cancel</Btn>
            <Btn full onClick={addOrder} disabled={!newItem.trim()}>Add</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Stats Screen ──────────────────────────────────────────
function StatsScreen({ products, currency }) {
  const totalInvest = products.reduce((s,p)=>s+p.buyPrice*p.qty,0);
  const totalSell = products.reduce((s,p)=>s+p.sellPrice*p.qty,0);
  const profit = totalSell - totalInvest;
  const expiring = products.filter(p=>{const e=expiryStatus(p.expiry);return e&&e.days<=30;});

  // Category breakdown
  const catData = {};
  products.forEach(p=>{ catData[p.category]=(catData[p.category]||0)+p.sellPrice*p.qty; });
  const catArr = Object.entries(catData).sort((a,b)=>b[1]-a[1]);
  const maxCat = catArr[0]?.[1]||1;

  // Top margin products
  const topMargin = [...products].sort((a,b)=>margin(b.buyPrice,b.sellPrice)-margin(a.buyPrice,a.sellPrice)).slice(0,3);
  const medals = ['🥇','🥈','🥉'];

  return (
    <div style={{height:'100%',overflowY:'auto'}}>
      <div style={{padding:'56px 20px 24px'}}>
        <h2 style={{fontFamily:'var(--ff-head)',fontWeight:800,fontSize:22,marginBottom:20}}>Analytics</h2>

        {/* KPIs */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:20}}>
          {[
            {label:'Investment',val:formatPrice(totalInvest,currency),color:'var(--indigo)',bg:'#EEF0FB'},
            {label:'Sell Value',val:formatPrice(totalSell,currency),color:'var(--primary)',bg:'var(--green-soft)'},
            {label:'Profit',val:formatPrice(profit,currency),color:profit>=0?'var(--primary)':'var(--accent)',bg:profit>=0?'var(--green-soft)':'var(--red-soft)'},
            {label:'Expiring (30d)',val:expiring.length,color:'var(--accent)',bg:'var(--red-soft)'},
          ].map(k=>(
            <Card key={k.label} style={{background:k.bg,border:'none'}}>
              <div style={{color:k.color,fontSize:12,fontWeight:600,marginBottom:6}}>{k.label}</div>
              <div style={{fontFamily:'var(--ff-mono)',fontWeight:700,fontSize:18,color:k.color}}>{k.val}</div>
            </Card>
          ))}
        </div>

        {/* Category breakdown */}
        {catArr.length > 0 && (
          <Card style={{marginBottom:16}}>
            <div style={{fontFamily:'var(--ff-head)',fontWeight:700,fontSize:15,marginBottom:14}}>Category Breakdown</div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {catArr.map(([cat,val])=>(
                <div key={cat}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:4}}>
                    <span style={{fontWeight:500}}>{cat}</span>
                    <span style={{fontFamily:'var(--ff-mono)',color:'var(--text2)'}}>{formatPrice(val,currency)}</span>
                  </div>
                  <div style={{height:6,background:'var(--surface2)',borderRadius:3,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${(val/maxCat)*100}%`,background:'var(--primary)',borderRadius:3,transition:'width 0.6s ease'}}/>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Top margin */}
        {topMargin.length > 0 && (
          <Card>
            <div style={{fontFamily:'var(--ff-head)',fontWeight:700,fontSize:15,marginBottom:14}}>Top Margin Products</div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {topMargin.map((p,i)=>(
                <div key={p.id} style={{display:'flex',alignItems:'center',gap:12}}>
                  <span style={{fontSize:22}}>{medals[i]}</span>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:14}}>{p.name}</div>
                    <div style={{color:'var(--text3)',fontSize:12}}>{p.company}</div>
                  </div>
                  <div style={{fontFamily:'var(--ff-mono)',fontWeight:600,fontSize:16,color:'var(--primary)'}}>{margin(p.buyPrice,p.sellPrice)}%</div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// ── Trash Screen ──────────────────────────────────────────
function TrashScreen({ email, onRestore }) {
  const [trash, setTrash_] = useState(() => loadTrash(email));

  const save = (t) => { setTrash_(t); saveTrash(email,t); };
  const restore = (id) => {
    const item = trash.find(t=>t.id===id);
    if (item) { save(trash.filter(t=>t.id!==id)); onRestore(item); }
  };

  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column'}}>
      <div style={{padding:'56px 20px 12px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
        <h2 style={{fontFamily:'var(--ff-head)',fontWeight:800,fontSize:22}}>Trash</h2>
        {trash.length>0 && <Btn sm variant="danger" onClick={()=>save([])}>Empty All</Btn>}
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'0 20px 24px',display:'flex',flexDirection:'column',gap:8}}>
        {trash.length === 0 ? (
          <div style={{textAlign:'center',padding:'60px 0',color:'var(--text3)'}}>
            <Ic name="trash" size={40} color="var(--border)"/>
            <div style={{marginTop:12,fontWeight:500}}>Trash is empty</div>
          </div>
        ) : trash.map(p=>(
          <div key={p.id} style={{background:'var(--surface)',border:'1.5px solid var(--border)',borderRadius:14,padding:'12px 14px',display:'flex',alignItems:'center',gap:12}}>
            <div style={{flex:1}}>
              <div style={{fontWeight:600,fontSize:14}}>{p.name}</div>
              <div style={{color:'var(--text3)',fontSize:12}}>{p.company}</div>
            </div>
            <Btn sm variant="soft" onClick={()=>restore(p.id)}><Ic name="restore" size={14}/> Restore</Btn>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Install App Sheet ─────────────────────────────────────
function InstallSheet({ open, onClose }) {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isAndroid = /android/i.test(navigator.userAgent);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const nativeInstall = async () => {
    if (deferredPrompt) { deferredPrompt.prompt(); onClose(); }
  };

  const steps = isIOS
    ? ['Open this page in Safari','Tap the Share button (box with arrow)','Scroll down and tap "Add to Home Screen"','Tap "Add" to confirm']
    : isAndroid
    ? ['Open in Chrome','Tap the 3-dot menu (⋮) at top right','Tap "Add to Home Screen"','Tap "Add" to confirm']
    : ['Open in Chrome','Look for the install icon (⊕) in the address bar','Click it and follow the prompts','Or: Chrome menu → "Install Shelfie Pro"'];

  return (
    <Sheet open={open} onClose={onClose} title="Install App">
      <div style={{display:'flex',flexDirection:'column',gap:20}}>
        <div style={{textAlign:'center',padding:'20px 0'}}>
          <div style={{width:64,height:64,background:'var(--primary)',borderRadius:20,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',boxShadow:'0 8px 24px rgba(28,56,41,0.3)'}}>
            <Ic name="package" size={32} color="#fff"/>
          </div>
          <div style={{fontFamily:'var(--ff-head)',fontWeight:700,fontSize:18}}>Shelfie Pro</div>
          <div style={{color:'var(--text3)',fontSize:13,marginTop:4}}>
            {isIOS?'iPhone / iPad':isAndroid?'Android':'Desktop'} instructions
          </div>
        </div>

        {deferredPrompt && (
          <Btn full variant="accent" onClick={nativeInstall}>
            <Ic name="download" size={18}/> Install Now (One Tap)
          </Btn>
        )}

        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {steps.map((step,i)=>(
            <div key={i} style={{display:'flex',gap:12,alignItems:'flex-start',padding:'10px 14px',background:'var(--surface2)',borderRadius:12}}>
              <div style={{width:24,height:24,borderRadius:50,background:'var(--primary)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,flexShrink:0}}>{i+1}</div>
              <div style={{fontSize:14,color:'var(--text)'}}>{step}</div>
            </div>
          ))}
        </div>
      </div>
    </Sheet>
  );
}

// ── Profile Screen ────────────────────────────────────────
function ProfileScreen({ user, currency, onCurrencyChange, onSignOut, theme, onThemeChange }) {
  const [showInstall, setShowInstall] = useState(false);
  const [notifState, setNotifState] = useState(Notification?.permission||'default');

  const requestNotif = async () => {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    setNotifState(perm);
  };

  const joinDate = new Date(user.joinDate||Date.now()).toLocaleDateString('en-US',{year:'numeric',month:'long'});

  return (
    <div style={{height:'100%',overflowY:'auto'}}>
      <div style={{padding:'56px 20px 40px',display:'flex',flexDirection:'column',gap:20}}>
        {/* Avatar */}
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,paddingBottom:8}}>
          <div style={{width:80,height:80,borderRadius:50,background:'var(--green-soft)',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',border:'3px solid var(--primary)20'}}>
            {user.photo ? <img src={user.photo} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <Ic name="user" size={36} color="var(--primary)"/>}
          </div>
          <div style={{fontFamily:'var(--ff-head)',fontWeight:700,fontSize:20}}>{user.name}</div>
          <div style={{color:'var(--text3)',fontSize:14}}>{user.email}</div>
          <div style={{color:'var(--text3)',fontSize:12}}>Member since {joinDate}</div>
        </div>

        {/* Download App */}
        <Card onClick={()=>setShowInstall(true)} style={{cursor:'pointer',display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:40,height:40,borderRadius:12,background:'var(--green-soft)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <Ic name="download" size={20} color="var(--primary)"/>
          </div>
          <div style={{flex:1}}>
            <div style={{fontWeight:600,fontSize:15}}>Download App</div>
            <div style={{color:'var(--text3)',fontSize:12}}>Install for quick access</div>
          </div>
          <Ic name="back" size={16} color="var(--text3)" style={{transform:'rotate(180deg)'}}/>
        </Card>

        {/* Appearance */}
        <Card>
          <div style={{fontWeight:600,fontSize:15,marginBottom:14}}>Appearance</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
            {[{val:'system',label:'System',icon:'globe'},{val:'light',label:'Light',icon:'sun'},{val:'dark',label:'Moon',icon:'moon'}].map(t=>(
              <button key={t.val} onClick={()=>onThemeChange(t.val)} style={{padding:'10px 8px',borderRadius:12,border:'1.5px solid',borderColor:theme===t.val?'var(--primary)':'var(--border)',background:theme===t.val?'var(--green-soft)':'transparent',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:6,fontFamily:'var(--ff-body)'}}>
                <Ic name={t.icon} size={18} color={theme===t.val?'var(--primary)':'var(--text3)'}/>
                <span style={{fontSize:12,fontWeight:500,color:theme===t.val?'var(--primary)':'var(--text2)'}}>{t.label}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* Currency */}
        <Card>
          <div style={{fontWeight:600,fontSize:15,marginBottom:14}}>Currency</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
            {Object.keys(CURRENCIES).map(c=>(
              <button key={c} onClick={()=>onCurrencyChange(c)} style={{padding:'6px 12px',borderRadius:20,fontSize:13,fontWeight:600,border:'1.5px solid',borderColor:currency===c?'var(--primary)':'var(--border)',background:currency===c?'var(--green-soft)':'transparent',color:currency===c?'var(--primary)':'var(--text2)',cursor:'pointer',fontFamily:'var(--ff-mono)',transition:'all 0.15s'}}>
                {c}
              </button>
            ))}
          </div>
        </Card>

        {/* Notifications */}
        <Card style={{display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:40,height:40,borderRadius:12,background:'var(--amber-soft)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <Ic name="bell" size={20} color="var(--amber)"/>
          </div>
          <div style={{flex:1}}>
            <div style={{fontWeight:600,fontSize:15}}>Push Notifications</div>
            <div style={{color:'var(--text3)',fontSize:12}}>{notifState==='granted'?'Enabled':notifState==='denied'?'Blocked in browser':'Not yet enabled'}</div>
          </div>
          {notifState!=='granted' && notifState!=='denied' && (
            <Btn sm onClick={requestNotif}>Enable</Btn>
          )}
        </Card>

        {/* Sign Out */}
        <Btn full variant="danger" onClick={onSignOut}>
          <Ic name="logout" size={18}/> Sign Out
        </Btn>
      </div>

      <InstallSheet open={showInstall} onClose={()=>setShowInstall(false)}/>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────
function App() {
  const [user, setUser] = useState(() => lsGet('sh3_s', null));
  const [products, setProducts] = useState([]);
  const [tab, setTab] = useState('home');
  const [showLens, setShowLens] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [currency, setCurrency] = useState('BDT');
  const [theme, setTheme] = useState(() => lsGet('sh3_theme','system'));
  const [authLoading, setAuthLoading] = useState(true);

  // Theme effect
  useEffect(() => {
    const apply = (t) => {
      const isDark = t==='dark' || (t==='system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.setAttribute('data-theme', isDark?'dark':'light');
    };
    apply(theme);
    if (theme==='system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => apply('system');
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [theme]);

  const changeTheme = (t) => { setTheme(t); lsSet('sh3_theme',t); };

  // Firebase auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(fbAuth, async (fbUser) => {
      if (fbUser) {
        const u = { uid:fbUser.uid, email:fbUser.email, name:fbUser.displayName||fbUser.email?.split('@')[0], photo:fbUser.photoURL, joinDate:Date.now() };
        setUser(u); lsSet('sh3_s',u);
        const fs = await loadFromFirestore(fbUser.uid);
        const prods = fs.products || loadProducts(fbUser.email);
        const cur = fs.currency || loadCurrency(fbUser.email);
        setProducts(prods); setCurrency(cur);
      } else {
        setUser(null); lsSet('sh3_s',null);
      }
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  const handleAuth = async (u) => {
    setUser(u); lsSet('sh3_s',u);
    const fs = await loadFromFirestore(u.uid);
    const prods = fs.products || loadProducts(u.email);
    const cur = fs.currency || loadCurrency(u.email);
    setProducts(prods); setCurrency(cur);
  };

  const handleSignOut = async () => {
    try { await signOut(fbAuth); } catch {}
    setUser(null); lsSet('sh3_s',null);
  };

  const saveProds = useCallback((prods) => {
    setProducts(prods);
    if (user) { saveProducts(user.email,prods); syncToFirestore(user.uid,user.email,prods,currency).catch(()=>{}); }
  }, [user, currency]);

  const addProduct = (p) => saveProds([p,...products]);
  const deleteProduct = (id) => {
    const item = products.find(p=>p.id===id);
    if (item && user) { const t=[item,...loadTrash(user.email)].slice(0,50); saveTrash(user.email,t); }
    saveProds(products.filter(p=>p.id!==id));
  };
  const restoreProduct = (p) => saveProds([p,...products]);

  const changeCurrency = (c) => {
    setCurrency(c);
    if (user) { saveCurrency(user.email,c); syncToFirestore(user.uid,user.email,products,c).catch(()=>{}); }
  };

  if (authLoading) return (
    <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)'}}>
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:16}}>
        <div style={{width:56,height:56,background:'var(--primary)',borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <Ic name="package" size={28} color="#fff"/>
        </div>
        <Spinner/>
      </div>
    </div>
  );

  if (!user) return <AuthScreen onAuth={handleAuth}/>;

  const navTabs = [
    {id:'home',icon:'home',label:'Home'},
    {id:'stock',icon:'stock',label:'Stock'},
    {id:'orders',icon:'orders',label:'Orders'},
    {id:'stats',icon:'stats',label:'Stats'},
    {id:'profile',icon:'user',label:'Profile'},
  ];

  return (
    <div style={{height:'100vh',display:'flex',flexDirection:'column',background:'var(--bg)',position:'relative'}}>
      {/* Main content area */}
      <div style={{flex:1,overflow:'hidden',position:'relative'}}>
        {tab==='home' && <HomeScreen products={products} currency={currency} user={user}/>}
        {tab==='stock' && <StockScreen products={products} currency={currency} onProductClick={()=>{}} onDelete={deleteProduct}/>}
        {tab==='orders' && <OrdersScreen email={user.email} products={products}/>}
        {tab==='stats' && <StatsScreen products={products} currency={currency}/>}
        {tab==='profile' && <ProfileScreen user={user} currency={currency} onCurrencyChange={changeCurrency} onSignOut={handleSignOut} theme={theme} onThemeChange={changeTheme}/>}
        {showTrash && <TrashScreen email={user.email} onRestore={(p)=>{restoreProduct(p);setShowTrash(false);}}/>}
      </div>

      {/* Trash button bottom-left */}
      <button onClick={()=>setShowTrash(s=>!s)} style={{position:'fixed',bottom:86,left:20,zIndex:50,width:40,height:40,borderRadius:12,background:'var(--surface)',border:'1.5px solid var(--border)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text3)',boxShadow:'0 2px 8px var(--shadow)'}}>
        <Ic name="trash" size={18}/>
      </button>

      {/* Add FAB bottom-right */}
      <button onClick={()=>setShowAdd(true)} style={{position:'fixed',bottom:86,right:20,zIndex:50,width:48,height:48,borderRadius:14,background:'var(--accent)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',boxShadow:'0 4px 16px rgba(217,95,59,0.4)'}}>
        <Ic name="plus" size={22}/>
      </button>

      {/* Bottom Nav */}
      <div style={{height:'var(--nav-h)',background:'var(--surface)',borderTop:'1.5px solid var(--border)',display:'flex',alignItems:'stretch',position:'relative',flexShrink:0,paddingBottom:'env(safe-area-inset-bottom)'}}>
        {navTabs.slice(0,2).map(t=>(
          <button key={t.id} onClick={()=>{setTab(t.id);setShowTrash(false);}} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:4,border:'none',background:'none',cursor:'pointer',color:tab===t.id?'var(--primary)':'var(--text3)',fontFamily:'var(--ff-body)',transition:'color 0.18s'}}>
            <Ic name={t.icon} size={20} color={tab===t.id?'var(--primary)':'var(--text3)'}/>
            <span style={{fontSize:11,fontWeight:tab===t.id?600:400}}>{t.label}</span>
          </button>
        ))}

        {/* Center Lens FAB */}
        <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <button onClick={()=>setShowLens(true)} style={{width:56,height:56,borderRadius:50,background:'var(--accent)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 20px rgba(217,95,59,0.45)',marginBottom:20,transition:'transform 0.18s'}}>
            <Ic name="lens" size={24} color="#fff"/>
          </button>
        </div>

        {navTabs.slice(2,4).map(t=>(
          <button key={t.id} onClick={()=>{setTab(t.id);setShowTrash(false);}} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:4,border:'none',background:'none',cursor:'pointer',color:tab===t.id?'var(--primary)':'var(--text3)',fontFamily:'var(--ff-body)',transition:'color 0.18s'}}>
            <Ic name={t.icon} size={20} color={tab===t.id?'var(--primary)':'var(--text3)'}/>
            <span style={{fontSize:11,fontWeight:tab===t.id?600:400}}>{t.label}</span>
          </button>
        ))}

        <button onClick={()=>{setTab('profile');setShowTrash(false);}} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:4,border:'none',background:'none',cursor:'pointer',color:tab==='profile'?'var(--primary)':'var(--text3)',fontFamily:'var(--ff-body)',transition:'color 0.18s'}}>
          {user.photo ? <img src={user.photo} style={{width:22,height:22,borderRadius:50,objectFit:'cover',border:tab==='profile'?'2px solid var(--primary)':'2px solid transparent',transition:'border 0.18s'}}/> : <Ic name="user" size={20} color={tab==='profile'?'var(--primary)':'var(--text3)'}/>}
          <span style={{fontSize:11,fontWeight:tab==='profile'?600:400}}>Profile</span>
        </button>
      </div>

      {/* Modals */}
      {showLens && <LensScreen products={products} currency={currency} onClose={()=>setShowLens(false)}/>}
      <AddProductSheet open={showAdd} onClose={()=>setShowAdd(false)} onSave={addProduct} existing={products} currency={currency}/>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
