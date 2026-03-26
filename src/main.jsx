import './index.css';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { initializeApp } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider, signInWithPopup,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

// ─── FIREBASE ────────────────────────────────────────────────────
const fbApp = initializeApp({
  apiKey: "AIzaSyBvbp6Z3Ha4FCmuZ2ErQ9xVB0teD2s8JuY",
  authDomain: "shelfie-911.firebaseapp.com",
  projectId: "shelfie-911",
  storageBucket: "shelfie-911.firebasestorage.app",
  messagingSenderId: "146732929065",
  appId: "1:146732929065:web:668e213d55498436b20c38"
});
const fbAuth = getAuth(fbApp);
const fbDb   = getFirestore(fbApp);
const gProvider = new GoogleAuthProvider();
gProvider.setCustomParameters({ prompt: 'select_account' });

const dbSaveProds = (uid, prods) =>
  setDoc(doc(fbDb,'users',uid,'data','products'), { items: JSON.stringify(prods), ts: Date.now() });
const dbLoadProds = async (uid) => {
  const s = await getDoc(doc(fbDb,'users',uid,'data','products'));
  return s.exists() ? JSON.parse(s.data().items) : null;
};
const dbSaveSettings = (uid, obj) =>
  setDoc(doc(fbDb,'users',uid,'data','settings'), obj, { merge: true });
const dbLoadSettings = async (uid) => {
  const s = await getDoc(doc(fbDb,'users',uid,'data','settings'));
  return s.exists() ? s.data() : null;
};

// ─── THEME ───────────────────────────────────────────────────────
const LIGHT = {
  bg:'#F7F4EF', bg2:'#EEE9E1', bg3:'#E5DED3', bg4:'#DDD5C8',
  surf:'#FFFFFF', card:'#FFFFFE',
  bdr:'#E2DAD0', bdr2:'#CFC7BA', bdrH:'#B5A99A',
  ink:'#141210', ink2:'#302C28', ink3:'#6A635C', ink4:'#9C958E', ink5:'#C8C1B9',
  // Primary — deep forest green
  P:'#1C3829', PL:'#2D5A3F', PXL:'#4A8A62',
  PG:'linear-gradient(135deg,#1C3829,#2D5A3F)',
  // Accent — warm coral
  A:'#D95F3B', AL:'#E8754F', AXL:'#F4A080',
  AG:'linear-gradient(135deg,#D95F3B,#E8754F)',
  // Amber
  AM:'#D97706', AML:'#F59E0B',
  // Indigo
  IN:'#3B4FA8', INL:'#5267C8',
  // Status
  ok:'#059669', okL:'#10B981',
  warn:'#B45309', danger:'#C22B2B', dangerL:'#E04040',
  // UI
  navBg:'rgba(255,255,255,0.94)',
  modalBg:'rgba(20,18,16,0.45)',
  shadow:'0 2px 8px rgba(20,18,16,.07)',
  shadowM:'0 8px 32px rgba(20,18,16,.12)',
  shadowL:'0 20px 60px rgba(20,18,16,.16)',
  inputBg:'#F0EBE3', inputFocus:'#FFFFFF',
};
const DARK = {
  bg:'#0d0d1a', bg2:'#12122a', bg3:'#16162e', bg4:'#1a1a35',
  surf:'#1a1a35', card:'#1f1f3d',
  bdr:'#ffffff13', bdr2:'#ffffff20', bdrH:'#ffffff35',
  ink:'#f0f4f8', ink2:'#dde3ea', ink3:'#8899aa', ink4:'#55667a', ink5:'#334455',
  P:'#4A8A62', PL:'#5EA87A', PXL:'#7ABB96',
  PG:'linear-gradient(135deg,#2D5A3F,#4A8A62)',
  A:'#E8754F', AL:'#F4A080', AXL:'#FABCA0',
  AG:'linear-gradient(135deg,#D95F3B,#E8754F)',
  AM:'#F59E0B', AML:'#FCD34D',
  IN:'#6B82E8', INL:'#8B9CF8',
  ok:'#10B981', okL:'#34D399',
  warn:'#E8A020', danger:'#E04040', dangerL:'#F06060',
  navBg:'rgba(13,13,26,0.95)',
  modalBg:'rgba(0,0,0,0.72)',
  shadow:'0 2px 8px rgba(0,0,0,.3)',
  shadowM:'0 8px 32px rgba(0,0,0,.4)',
  shadowL:'0 20px 60px rgba(0,0,0,.5)',
  inputBg:'#1a1a35', inputFocus:'#1f1f3d',
};

const HEAD = "'Syne',system-ui,sans-serif";
const BODY = "'DM Sans',system-ui,sans-serif";
const MONO = "'DM Mono',monospace";
const ThemeCtx = React.createContext(LIGHT);
const useT = () => React.useContext(ThemeCtx);

// ─── STORAGE ─────────────────────────────────────────────────────
const SK='sh4_s', THEMEK='sh4_theme', DK=e=>'sh4_d_'+e, CK=e=>'sh4_c_'+e, TK=e=>'sh4_t_'+e;
const lsG=(k,d=null)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch{return d;}};
const lsS=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}};

// ─── DATA ────────────────────────────────────────────────────────
const CURR=[
  {code:'EUR',sym:'€',name:'Euro'},{code:'USD',sym:'$',name:'US Dollar'},
  {code:'GBP',sym:'£',name:'British Pound'},{code:'BDT',sym:'৳',name:'Bangladeshi Taka'},
  {code:'INR',sym:'₹',name:'Indian Rupee'},{code:'JPY',sym:'¥',name:'Japanese Yen'},
  {code:'AED',sym:'د.إ',name:'UAE Dirham'},{code:'SGD',sym:'S$',name:'Singapore Dollar'},
  {code:'CAD',sym:'C$',name:'Canadian Dollar'},{code:'AUD',sym:'A$',name:'Australian Dollar'},
  {code:'TRY',sym:'₺',name:'Turkish Lira'},{code:'SAR',sym:'﷼',name:'Saudi Riyal'},
  {code:'CHF',sym:'Fr',name:'Swiss Franc'},{code:'CNY',sym:'¥',name:'Chinese Yuan'},
];
const RATES={BDT:1,USD:.0091,EUR:.0084,GBP:.0072,INR:.76,JPY:1.38,AED:.033,SGD:.012,CAD:.012,AUD:.014,TRY:.29,SAR:.034,CHF:.0082,CNY:.066};
const cv=(a,f,t)=>+((a/(RATES[f]||1))*(RATES[t]||1)).toFixed(2);
const fm=(a,c)=>{const x=CURR.find(v=>v.code===c)||CURR[0];const n=Math.abs(a);return(a<0?'-':'')+x.sym+(n>=1000?n.toLocaleString('en',{maximumFractionDigits:0}):n.toFixed(2));};

const CATS=['All','Grains','Spices','Drinks','Dairy','Snacks','Vegetables','Fruits','Cleaning','Personal Care','Other'];
const CE={Grains:'🌾',Spices:'🌿',Drinks:'🥤',Dairy:'🥛',Snacks:'🍿',Vegetables:'🥦',Fruits:'🍎',Cleaning:'🧹','Personal Care':'🧴',Other:'📦'};
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const mkHist=b=>Array.from({length:12},(_,i)=>{const d=new Date();d.setMonth(d.getMonth()-11+i);return{m:MON[d.getMonth()],y:d.getFullYear(),p:Math.max(1,+(b*(.85+Math.random()*.3)).toFixed(2))};});
const dLeft=d=>Math.ceil((new Date(d)-new Date())/86400000);

// Online search simulation
const ONLINE_DB={
  rice:[{n:'Basmati Gold 5kg',b:'Tilda',p:'EUR 14.99',e:'🌾',m:94,s:'Amazon'},{n:'Jasmine Rice 2kg',b:'Thai Heritage',p:'EUR 7.50',e:'🌾',m:86,s:'Carrefour'},{n:'Arborio Rice 1kg',b:'Riso Gallo',p:'EUR 3.20',e:'🌾',m:72,s:'Esselunga'}],
  oil:[{n:'Extra Virgin Olive Oil 1L',b:'Bertolli',p:'EUR 9.99',e:'🫙',m:91,s:'Conad'},{n:'Sunflower Oil 2L',b:'Crisco',p:'EUR 4.50',e:'🫙',m:84,s:'Lidl'},{n:'Coconut Oil 500ml',b:'Organic',p:'EUR 6.80',e:'🫙',m:70,s:'Amazon'}],
  milk:[{n:'Whole Milk UHT 1L',b:'Parmalat',p:'EUR 1.49',e:'🥛',m:97,s:'Conad'},{n:'Skimmed Milk 1L',b:'Granarolo',p:'EUR 1.29',e:'🥛',m:89,s:'Carrefour'},{n:'Oat Milk 1L',b:'Oatly',p:'EUR 2.99',e:'🥛',m:60,s:'Amazon'}],
  juice:[{n:'Mango Nectar 1L',b:'Tropicana',p:'EUR 2.99',e:'🥭',m:95,s:'Conad'},{n:'OJ Squeezed 1.5L',b:'Don Simon',p:'EUR 2.20',e:'🍊',m:78,s:'Lidl'},{n:'Mixed Fruit 1L',b:'Yoga',p:'EUR 2.40',e:'🍹',m:71,s:'Esselunga'}],
  chips:[{n:"Lay's Classic 150g",b:"Lay's",p:'EUR 2.49',e:'🍟',m:93,s:'Conad'},{n:'Pringles Original 165g',b:'Pringles',p:'EUR 3.19',e:'🥫',m:86,s:'Esselunga'},{n:'Kettle Sea Salt 142g',b:'Kettle',p:'EUR 3.49',e:'🍿',m:79,s:'Amazon'}],
  default:[{n:'Similar Product A',b:'Premium Brand',p:'EUR 5.99',e:'📦',m:82,s:'Amazon'},{n:'Similar Product B',b:'Store Brand',p:'EUR 3.50',e:'📦',m:74,s:'Carrefour'},{n:'Similar Product C',b:'Organic Co',p:'EUR 7.20',e:'📦',m:65,s:'Naturalia'}],
};
const getOnline=name=>{
  const n=name.toLowerCase();
  if(n.includes('rice')) return ONLINE_DB.rice;
  if(n.includes('oil')) return ONLINE_DB.oil;
  if(n.includes('milk')) return ONLINE_DB.milk;
  if(n.includes('juice')||n.includes('mango')) return ONLINE_DB.juice;
  if(n.includes('chip')||n.includes('crisp')||n.includes('snack')) return ONLINE_DB.chips;
  return ONLINE_DB.default;
};

const DEMO=[
  {id:'1',name:'Basmati Rice',company:'ACI Foods',base:120,vat:5,buy:126,sell:155,expire:'2025-12-01',added:'2024-01-15',cat:'Grains',photo:null,unit:'1 kg',cur:'BDT',qty:50,hist:mkHist(120),restock:3,expConf:false},
  {id:'2',name:'Mustard Oil',company:'Radhuni',base:180,vat:5,buy:189,sell:230,expire:'2024-09-10',added:'2024-01-10',cat:'Spices',photo:null,unit:'1 L',cur:'BDT',qty:30,hist:mkHist(180),restock:2,expConf:false},
  {id:'3',name:'Mango Juice',company:'Pran',base:45,vat:15,buy:51.75,sell:68,expire:'2024-04-28',added:'2024-02-01',cat:'Drinks',photo:null,unit:'250 ml',cur:'BDT',qty:120,hist:mkHist(45),restock:5,expConf:false},
  {id:'4',name:'Full Cream Milk',company:'Milk Vita',base:70,vat:0,buy:70,sell:88,expire:'2024-03-30',added:'2024-03-20',cat:'Dairy',photo:null,unit:'500 ml',cur:'BDT',qty:8,hist:mkHist(70),restock:4,expConf:false},
  {id:'5',name:'Turmeric Powder',company:'BD Foods',base:55,vat:5,buy:57.75,sell:78,expire:'2025-06-15',added:'2024-01-05',cat:'Spices',photo:null,unit:'200 g',cur:'BDT',qty:80,hist:mkHist(55),restock:1,expConf:false},
  {id:'6',name:'Potato Chips',company:'Bombay Sweets',base:30,vat:15,buy:34.5,sell:48,expire:'2024-07-20',added:'2024-02-10',cat:'Snacks',photo:null,unit:'100 g',cur:'BDT',qty:200,hist:mkHist(30),restock:6,expConf:false},
];

// ─── UTILS ───────────────────────────────────────────────────────
const compress = file => new Promise((res,rej) => {
  const r = new FileReader();
  r.onload = e => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      let w=img.width, h=img.height, max=520;
      if(w>h&&w>max){h=Math.round(h*max/w);w=max;}else if(h>max){w=Math.round(w*max/h);h=max;}
      c.width=w; c.height=h;
      c.getContext('2d').drawImage(img,0,0,w,h);
      res(c.toDataURL('image/jpeg',.70));
    };
    img.onerror=rej; img.src=e.target.result;
  };
  r.onerror=rej; r.readAsDataURL(file);
});

// ─── HOOKS ───────────────────────────────────────────────────────
function useToasts() {
  const [list,set] = useState([]);
  const push = useCallback((msg,type='info') => {
    const id = Date.now()+Math.random();
    set(t=>[...t,{id,msg,type}]);
    setTimeout(()=>set(t=>t.filter(x=>x.id!==id)),3800);
  },[]);
  return {list,push};
}

// ─── UI ATOMS ────────────────────────────────────────────────────
function Spinner({size=18,color}){
  const T=useT();
  return <div style={{width:size,height:size,border:`2.5px solid ${color||T.P}22`,borderTop:`2.5px solid ${color||T.P}`,borderRadius:'50%',animation:'spin .6s linear infinite',flexShrink:0}}/>;
}

function ExpiryBadge({date}){
  const T=useT(); const d=dLeft(date);
  let bg,col,lbl;
  if(d<0){bg=T.ink4+'20';col=T.ink4;lbl='Expired';}
  else if(d<=1){bg=T.danger+'18';col=T.danger;lbl='Tomorrow!';}
  else if(d<=7){bg=T.warn+'18';col=T.warn;lbl=`${d}d left`;}
  else if(d<=30){bg=T.A+'14';col=T.A;lbl=`${d}d`;}
  else{bg=T.ok+'14';col=T.ok;lbl=`${d}d`;}
  return <span style={{background:bg,color:col,border:`1px solid ${col}28`,borderRadius:99,padding:'3px 9px',fontSize:10,fontWeight:700}}>{lbl}</span>;
}

function Btn({children,onClick,v='primary',full,sm,dis,sx={}}){
  const T=useT();
  const variants={
    primary:{background:T.PG,color:'#fff',boxShadow:`0 2px 10px ${T.P}28`},
    accent:{background:T.AG,color:'#fff',boxShadow:`0 2px 10px ${T.A}28`},
    ghost:{background:'transparent',color:T.ink2,border:`1.5px solid ${T.bdr}`},
    danger:{background:T.danger,color:'#fff'},
    soft:{background:T.bg2,color:T.ink2,border:`1px solid ${T.bdr}`},
  };
  return(
    <button onClick={onClick} disabled={dis}
      style={{display:'flex',alignItems:'center',justifyContent:'center',gap:7,border:'none',
        cursor:dis?'not-allowed':'pointer',opacity:dis?.5:1,transition:'all .17s',fontFamily:BODY,
        borderRadius:sm?10:14,padding:sm?'8px 14px':full?'14px 20px':'12px 20px',
        fontSize:sm?12:14,fontWeight:600,width:full?'100%':'auto',letterSpacing:.1,
        ...variants[v],...sx}}
      onMouseOver={e=>{if(!dis){e.currentTarget.style.opacity='.85';e.currentTarget.style.transform='translateY(-1px)';}}}
      onMouseOut={e=>{e.currentTarget.style.opacity='1';e.currentTarget.style.transform='translateY(0)';}}>
      {children}
    </button>
  );
}

function Field({label,hint,icon,suf,err,...props}){
  const T=useT(); const [foc,setFoc]=useState(false);
  return(
    <div style={{marginBottom:14}}>
      {label&&<label style={{display:'block',fontSize:11,fontWeight:600,color:T.ink3,letterSpacing:.8,textTransform:'uppercase',marginBottom:7}}>{label}</label>}
      <div style={{position:'relative'}}>
        {icon&&<span style={{position:'absolute',left:13,top:'50%',transform:'translateY(-50%)',fontSize:14,pointerEvents:'none',opacity:.5}}>{icon}</span>}
        <input {...props}
          onFocus={e=>{setFoc(true);props.onFocus&&props.onFocus(e);}}
          onBlur={e=>{setFoc(false);props.onBlur&&props.onBlur(e);}}
          style={{width:'100%',background:foc?T.inputFocus:T.inputBg,
            border:`1.5px solid ${err?T.danger:foc?T.P+'88':T.bdr}`,borderRadius:13,
            padding:`13px ${suf?'44px':'15px'} 13px ${icon?'42px':'15px'}`,
            color:T.ink,fontSize:14,outline:'none',fontFamily:BODY,
            boxShadow:foc?`0 0 0 3px ${T.P}12`:'none',
            transition:'all .17s',caretColor:T.P,...(props.style||{})}}
        />
        {suf&&<span style={{position:'absolute',right:13,top:'50%',transform:'translateY(-50%)',fontSize:12,pointerEvents:'none'}}>{suf}</span>}
      </div>
      {(hint||err)&&<p style={{fontSize:11,color:err?T.danger:T.ink4,marginTop:4,paddingLeft:2}}>{err||hint}</p>}
    </div>
  );
}

function Sheet({title,sub,onClose,children}){
  const T=useT();
  return(
    <div onClick={onClose} style={{position:'fixed',inset:0,background:T.modalBg,zIndex:500,display:'flex',alignItems:'flex-end',justifyContent:'center',backdropFilter:'blur(6px)'}}>
      <div onClick={e=>e.stopPropagation()} className="su"
        style={{background:T.surf,borderRadius:'24px 24px 0 0',width:'100%',maxWidth:480,maxHeight:'93vh',
          overflowY:'auto',boxShadow:T.shadowL,border:`1px solid ${T.bdr}`,borderBottom:'none'}}>
        <div style={{position:'sticky',top:0,background:T.surf,borderBottom:`1px solid ${T.bdr}`,
          padding:'18px 20px 14px',display:'flex',justifyContent:'space-between',alignItems:'flex-start',zIndex:2,backdropFilter:'blur(20px)'}}>
          <div>
            <h2 style={{fontSize:17,fontWeight:700,color:T.ink,fontFamily:HEAD,letterSpacing:-.2}}>{title}</h2>
            {sub&&<p style={{fontSize:11,color:T.ink3,marginTop:2}}>{sub}</p>}
          </div>
          <button onClick={onClose} style={{width:30,height:30,borderRadius:9,background:T.bg2,border:`1px solid ${T.bdr}`,
            color:T.ink3,cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center',marginLeft:10}}>✕</button>
        </div>
        <div style={{padding:'18px 20px 36px'}}>{children}</div>
      </div>
    </div>
  );
}

function Toasts({list}){
  const T=useT();
  const cols={success:T.ok,error:T.danger,warn:T.warn,info:T.P};
  return(
    <div style={{position:'fixed',top:14,left:'50%',transform:'translateX(-50%)',width:'92%',maxWidth:430,zIndex:9999,pointerEvents:'none'}}>
      {list.map(t=>(
        <div key={t.id} className="ti" style={{background:T.surf,border:`1px solid ${T.bdr}`,borderLeft:`3px solid ${cols[t.type]||T.P}`,
          borderRadius:13,padding:'11px 15px',marginBottom:7,display:'flex',gap:10,alignItems:'center',boxShadow:T.shadowM}}>
          <div style={{width:20,height:20,borderRadius:'50%',background:cols[t.type]||T.P,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <span style={{fontSize:10,color:'#fff',fontWeight:700}}>{t.type==='success'?'✓':t.type==='error'?'✕':'!'}</span>
          </div>
          <span style={{fontSize:13,color:T.ink,fontWeight:500}}>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

// ─── LOGO ────────────────────────────────────────────────────────
function Logo({size=68}){
  return(
    <svg width={size} height={size} viewBox="0 0 68 68" fill="none">
      <defs>
        <linearGradient id="LG" x1="0" y1="0" x2="68" y2="68" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1C3829"/><stop offset="1" stopColor="#2D5A3F"/>
        </linearGradient>
        <linearGradient id="LW" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#fff" stopOpacity=".95"/><stop offset="1" stopColor="#fff" stopOpacity=".5"/>
        </linearGradient>
      </defs>
      <rect width="68" height="68" rx="19" fill="url(#LG)"/>
      <rect x="9" y="49" width="50" height="5" rx="2.5" fill="url(#LW)"/>
      <rect x="9" y="34" width="50" height="4.5" rx="2.25" fill="url(#LW)" fillOpacity=".65"/>
      <rect x="9" y="20" width="50" height="4" rx="2" fill="url(#LW)" fillOpacity=".4"/>
      <rect x="8" y="20" width="4.5" height="34" rx="2.25" fill="url(#LW)"/>
      <rect x="55.5" y="20" width="4.5" height="34" rx="2.25" fill="url(#LW)"/>
      <rect x="15" y="38" width="9" height="11" rx="2" fill="url(#LW)"/>
      <rect x="28" y="35" width="8" height="14" rx="2" fill="url(#LW)" fillOpacity=".85"/>
      <rect x="40" y="39" width="7" height="10" rx="2" fill="url(#LW)"/>
      <rect x="51" y="36" width="7" height="13" rx="2" fill="url(#LW)" fillOpacity=".85"/>
      <rect x="15" y="24" width="7" height="10" rx="2" fill="url(#LW)" fillOpacity=".6"/>
      <rect x="26" y="26" width="9" height="8" rx="2" fill="url(#LW)" fillOpacity=".5"/>
      <rect x="39" y="23" width="7" height="11" rx="2" fill="url(#LW)" fillOpacity=".6"/>
      <circle cx="57" cy="13" r="6.5" fill="#D95F3B"/>
      <circle cx="57" cy="13" r="3.8" fill="white" fillOpacity=".85"/>
      <circle cx="57" cy="13" r="1.8" fill="white"/>
    </svg>
  );
}

// ─── CAMERA ──────────────────────────────────────────────────────
function Camera({mode,onCapture,onClose}){
  const T=useT();
  const vidRef=useRef(), canRef=useRef(), streamRef=useRef();
  const [status,setStatus]=useState('starting');
  const [snap,setSnap]=useState(null);

  useEffect(()=>{
    let alive=true;
    navigator.mediaDevices?.getUserMedia({video:{facingMode:'environment',width:{ideal:1280}}})
      .then(s=>{if(!alive){s.getTracks().forEach(t=>t.stop());return;}
        streamRef.current=s;
        if(vidRef.current){vidRef.current.srcObject=s;vidRef.current.play();}
        setStatus('ready');})
      .catch(()=>{ if(alive) setStatus('error'); });
    return()=>{alive=false;streamRef.current?.getTracks().forEach(t=>t.stop());};
  },[]);

  const capture=()=>{
    const v=vidRef.current,c=canRef.current;
    if(!v||!c)return;
    c.width=v.videoWidth;c.height=v.videoHeight;
    c.getContext('2d').drawImage(v,0,0);
    setSnap(c.toDataURL('image/jpeg',.88));
    streamRef.current?.getTracks().forEach(t=>t.stop());
    setStatus('captured');
  };

  const confirm=()=>onCapture(snap);
  const retake=()=>{
    setSnap(null); setStatus('starting');
    navigator.mediaDevices?.getUserMedia({video:{facingMode:'environment'}})
      .then(s=>{streamRef.current=s;if(vidRef.current){vidRef.current.srcObject=s;vidRef.current.play();}setStatus('ready');})
      .catch(()=>{});
  };

  return(
    <div style={{position:'fixed',inset:0,background:'#000',zIndex:800,display:'flex',flexDirection:'column'}}>
      <div style={{position:'absolute',top:0,left:0,right:0,zIndex:10,display:'flex',justifyContent:'space-between',
        alignItems:'center',padding:'16px 20px',background:'linear-gradient(rgba(0,0,0,.7),transparent)'}}>
        <button onClick={onClose} style={{width:38,height:38,borderRadius:11,background:'rgba(255,255,255,.15)',
          border:'1px solid rgba(255,255,255,.25)',color:'#fff',cursor:'pointer',fontSize:14,fontWeight:700}}>✕</button>
        <span style={{color:'#fff',fontWeight:600,fontSize:14,background:'rgba(0,0,0,.5)',padding:'6px 14px',borderRadius:99}}>
          {mode==='photo'?'Take Photo':mode==='lens'?'Smart Lens Scan':'Scan Product'}
        </span>
        <div style={{width:38}}/>
      </div>

      {status==='error'?(
        <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,padding:32,textAlign:'center'}}>
          <div style={{fontSize:52}}>📷</div>
          <div style={{color:'#fff',fontWeight:700,fontSize:16}}>Camera Access Needed</div>
          <div style={{color:'rgba(255,255,255,.6)',fontSize:13,maxWidth:260,lineHeight:1.7}}>Please allow camera access in your browser settings</div>
          <Btn v="ghost" onClick={onClose} sx={{color:'#fff',borderColor:'rgba(255,255,255,.3)',marginTop:8}}>Go Back</Btn>
        </div>
      ):(
        <>
          <div style={{flex:1,position:'relative',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}>
            {status==='starting'&&<Spinner size={40} color="#fff"/>}
            {snap
              ? <img src={snap} alt="capture" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
              : <video ref={vidRef} playsInline muted style={{width:'100%',height:'100%',objectFit:'cover',display:status==='ready'?'block':'none'}}/>
            }
            <canvas ref={canRef} style={{display:'none'}}/>
            {status==='ready'&&(
              <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
                <div style={{width:260,height:190,position:'relative'}}>
                  {[{t:0,l:0,bt:'3px solid #D95F3B',bl:'3px solid #D95F3B',br:'4px 0 0 0'},
                    {t:0,r:0,bt:'3px solid #D95F3B',bri:'3px solid #D95F3B',br:'0 4px 0 0'},
                    {b:0,l:0,bb:'3px solid #D95F3B',bl:'3px solid #D95F3B',br:'0 0 0 4px'},
                    {b:0,r:0,bb:'3px solid #D95F3B',bri:'3px solid #D95F3B',br:'0 0 4px 0'},
                  ].map((s,i)=>(
                    <div key={i} style={{position:'absolute',width:26,height:26,top:s.t,left:s.l,bottom:s.b,right:s.r,
                      borderTop:s.bt,borderLeft:s.bl,borderBottom:s.bb,borderRight:s.bri||s.br&&s.bri,
                      borderRadius:s.br}}/>
                  ))}
                  <div style={{position:'absolute',left:0,right:0,height:2,
                    background:'linear-gradient(90deg,transparent,#D95F3B,transparent)',
                    animation:'beam 1.8s ease-in-out infinite'}}/>
                </div>
              </div>
            )}
            {status==='captured'&&(
              <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.65)',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)'}}>
                <div style={{background:'#fff',borderRadius:22,padding:28,textAlign:'center',width:270}}>
                  <div style={{fontSize:44,marginBottom:10}}>✅</div>
                  <div style={{fontWeight:700,color:'#141210',fontSize:16,fontFamily:HEAD,marginBottom:5}}>Photo Captured!</div>
                  <div style={{color:'#6A635C',fontSize:12,marginBottom:22}}>Use this photo?</div>
                  <div style={{display:'flex',gap:10}}>
                    <Btn v="ghost" onClick={retake} sx={{flex:1,padding:'10px'}} sm>Retake</Btn>
                    <Btn onClick={confirm} sx={{flex:1,padding:'10px'}} sm>Use It ✓</Btn>
                  </div>
                </div>
              </div>
            )}
          </div>
          {status==='ready'&&(
            <div style={{padding:'24px',display:'flex',justifyContent:'center',background:'linear-gradient(transparent,rgba(0,0,0,.7))'}}>
              <button onClick={capture} style={{width:72,height:72,borderRadius:'50%',background:'rgba(255,255,255,.18)',
                border:'3px solid rgba(255,255,255,.7)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <div style={{width:56,height:56,borderRadius:'50%',background:'#D95F3B'}}/>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── AUTH ────────────────────────────────────────────────────────
function Auth({onLogin}){
  const T=useT();
  const [view,setView]=useState('welcome');
  const [f,setF]=useState({name:'',email:'',pass:''});
  const [busy,setBusy]=useState(false);
  const [err,setErr]=useState('');
  const [showP,setShowP]=useState(false);
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const doErr=m=>{setErr(m);setBusy(false);};

  // ── REAL GOOGLE OAUTH ──────────────────────────────────────────
  // Opens actual Google account picker — shows all Gmail accounts in browser
  const googleLogin = async () => {
    setBusy(true); setErr('');
    try {
      const result = await signInWithPopup(fbAuth, gProvider);
      const u = result.user;
      const userData = {
        name: u.displayName || 'Google User',
        email: u.email,
        uid: u.uid,
        avatar: (u.displayName||'G')[0].toUpperCase(),
        photoURL: u.photoURL || null,
        provider: 'google',
        joined: u.metadata.creationTime || new Date().toISOString(),
      };
      lsS(SK, userData);
      onLogin(userData);
    } catch(e) {
      if(e.code === 'auth/popup-closed-by-user') { setBusy(false); return; }
      if(e.code === 'auth/popup-blocked') doErr('Popup blocked — please allow popups for this site.');
      else if(e.code === 'auth/network-request-failed') doErr('Network error. Check your connection.');
      else if(e.code === 'auth/cancelled-popup-request') { setBusy(false); return; }
      else doErr('Google sign-in failed. Please try again.');
      console.error('Google auth error:', e.code, e.message);
    }
  };

  // ── EMAIL SIGN UP ──────────────────────────────────────────────
  const emailSignUp = async () => {
    if(!f.name||!f.email||!f.pass){ doErr('Please fill all fields.'); return; }
    if(f.pass.length<6){ doErr('Password needs at least 6 characters.'); return; }
    setBusy(true); setErr('');
    try {
      const result = await createUserWithEmailAndPassword(fbAuth, f.email, f.pass);
      await updateProfile(result.user, { displayName: f.name });
      const userData = { name:f.name, email:f.email, uid:result.user.uid,
        avatar:f.name[0].toUpperCase(), provider:'email', joined:new Date().toISOString() };
      lsS(SK, userData);
      onLogin(userData);
    } catch(e) {
      if(e.code==='auth/email-already-in-use') doErr('Email already registered — sign in instead.');
      else if(e.code==='auth/invalid-email') doErr('Enter a valid email address.');
      else if(e.code==='auth/weak-password') doErr('Password is too weak.');
      else doErr('Sign up failed. Please try again.');
    }
  };

  // ── EMAIL SIGN IN ──────────────────────────────────────────────
  const emailSignIn = async () => {
    if(!f.email||!f.pass){ doErr('Please fill all fields.'); return; }
    setBusy(true); setErr('');
    try {
      const result = await signInWithEmailAndPassword(fbAuth, f.email, f.pass);
      const u = result.user;
      const userData = { name:u.displayName||f.email.split('@')[0], email:u.email,
        uid:u.uid, avatar:(u.displayName||f.email)[0].toUpperCase(),
        provider:'email', joined:u.metadata.creationTime||new Date().toISOString() };
      lsS(SK, userData);
      onLogin(userData);
    } catch(e) {
      if(['auth/wrong-password','auth/user-not-found','auth/invalid-credential'].includes(e.code))
        doErr('Incorrect email or password.');
      else doErr('Sign in failed. Please try again.');
    }
  };

  // ── GOOGLE BUTTON ──────────────────────────────────────────────
  const GBtn = (
    <div onClick={busy?null:googleLogin} style={{
      background:'#fff',border:`1.5px solid #dadce0`,borderRadius:14,
      padding:'13px 18px',cursor:busy?'default':'pointer',
      display:'flex',alignItems:'center',gap:12,justifyContent:'center',
      fontWeight:500,color:'#3c4043',fontSize:14,marginBottom:20,
      transition:'all .18s',boxShadow:'0 1px 4px rgba(0,0,0,.08)',
      fontFamily:"'Roboto',sans-serif",position:'relative',opacity:busy?.7:1}}
      onMouseOver={e=>{if(!busy){e.currentTarget.style.boxShadow='0 2px 10px rgba(0,0,0,.15)';e.currentTarget.style.background='#f8f9fa';}}}
      onMouseOut={e=>{e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,.08)';e.currentTarget.style.background='#fff';}}>
      {busy
        ? <><Spinner color="#4285F4"/><span>Opening Google...</span></>
        : <>
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span>Sign in with Google</span>
        </>
      }
    </div>
  );

  if(view==='welcome') return(
    <div style={{minHeight:'100vh',background:T.bg,fontFamily:BODY,display:'flex',flexDirection:'column',position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',top:-80,right:-80,width:340,height:340,borderRadius:'50%',background:`radial-gradient(circle,${T.P}12,transparent 65%)`,pointerEvents:'none',animation:'orb 9s ease-in-out infinite'}}/>
      <div style={{position:'absolute',bottom:60,left:-80,width:280,height:280,borderRadius:'50%',background:`radial-gradient(circle,${T.A}0a,transparent 65%)`,pointerEvents:'none',animation:'orb 12s ease-in-out infinite reverse'}}/>
      <div style={{position:'absolute',inset:0,backgroundImage:`radial-gradient(${T.bdr} 1.5px,transparent 1.5px)`,backgroundSize:'36px 36px',pointerEvents:'none',opacity:.4}}/>

      <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'40px 28px',position:'relative'}}>
        <div style={{width:'100%',maxWidth:360,textAlign:'center'}}>
          <div className="fu fl" style={{marginBottom:24,display:'inline-block'}}><Logo size={76}/></div>
          <div className="fu1" style={{marginBottom:4}}>
            <span style={{fontSize:50,fontWeight:900,color:T.ink,letterSpacing:-2.5,lineHeight:1,fontFamily:HEAD}}>shelf</span>
            <span style={{fontSize:50,fontWeight:900,color:T.A,letterSpacing:-2.5,lineHeight:1,fontFamily:HEAD}}>ie</span>
          </div>
          <p className="fu1" style={{fontSize:10,fontWeight:700,color:T.ink4,letterSpacing:3,textTransform:'uppercase',marginBottom:8}}>Pro Edition</p>
          <p className="fu2" style={{color:T.ink3,fontSize:14,lineHeight:1.8,margin:'0 auto 32px',maxWidth:280}}>Smart inventory management for your shop</p>
          <div className="fu3">
            {GBtn}
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
              <div style={{flex:1,height:1,background:T.bdr}}/><span style={{color:T.ink4,fontSize:11}}>or</span><div style={{flex:1,height:1,background:T.bdr}}/>
            </div>
            <div style={{display:'flex',gap:10}}>
              <Btn full v="soft" onClick={()=>setView('signup')} sx={{fontSize:14,padding:'13px',borderRadius:13,fontFamily:HEAD,fontWeight:600}}>Create Account</Btn>
              <Btn full v="ghost" onClick={()=>setView('signin')} sx={{fontSize:14,padding:'13px',borderRadius:13}}>Sign In</Btn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const isUp = view==='signup';
  return(
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',fontFamily:BODY,background:T.bg,overflow:'hidden'}}>
      <div style={{background:T.PG,padding:'52px 28px 52px',textAlign:'center',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:-40,right:-40,width:180,height:180,borderRadius:'50%',background:'rgba(255,255,255,.07)'}}/>
        <div style={{marginBottom:16,display:'inline-block'}} className="fu"><Logo size={50}/></div>
        <h1 className="fu1" style={{fontSize:24,fontWeight:800,color:'#fff',fontFamily:HEAD,marginBottom:5,letterSpacing:-.4}}>
          {isUp?'Create Account':'Welcome Back'}
        </h1>
        <p className="fu2" style={{color:'rgba(255,255,255,.6)',fontSize:13}}>{isUp?'Join Shelfie free':'Sign in to your account'}</p>
      </div>
      <div className="fu" style={{flex:1,background:T.surf,borderRadius:'22px 22px 0 0',marginTop:-18,
        padding:'24px 22px 44px',border:`1px solid ${T.bdr}`,borderBottom:'none',zIndex:1}}>
        <button onClick={()=>{setView('welcome');setErr('');}} style={{background:'none',border:'none',color:T.ink3,
          cursor:'pointer',fontSize:13,marginBottom:18,fontWeight:600,fontFamily:BODY,display:'flex',alignItems:'center',gap:4}}>
          ← Back
        </button>
        {GBtn}
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
          <div style={{flex:1,height:1,background:T.bdr}}/><span style={{color:T.ink4,fontSize:11}}>or use email</span><div style={{flex:1,height:1,background:T.bdr}}/>
        </div>
        {isUp&&<Field label="Full Name" icon="👤" placeholder="Your full name" value={f.name} onChange={e=>set('name',e.target.value)}/>}
        <Field label="Email" icon="✉️" placeholder="you@example.com" type="email" value={f.email} onChange={e=>set('email',e.target.value)}/>
        <Field label="Password" icon="🔒" placeholder="Min 6 characters" type={showP?'text':'password'} value={f.pass} onChange={e=>set('pass',e.target.value)}
          suf={<span onClick={()=>setShowP(!showP)} style={{cursor:'pointer',color:T.ink3,fontSize:11,fontWeight:600}}>{showP?'Hide':'Show'}</span>}/>
        {err&&<div style={{background:`${T.danger}0e`,border:`1px solid ${T.danger}33`,borderRadius:11,
          padding:'10px 13px',color:T.danger,fontSize:13,marginBottom:14,fontWeight:500,display:'flex',gap:8,alignItems:'center'}}>⚠️ {err}</div>}
        <Btn full onClick={isUp?emailSignUp:emailSignIn} sx={{padding:'15px',fontSize:14,borderRadius:13,marginBottom:4,fontFamily:HEAD,fontWeight:700}}>
          {busy?<><Spinner color="#fff" size={16}/>{isUp?'Creating...':'Signing in...'}</>:isUp?'Create Account':'Sign In'}
        </Btn>
        <p style={{textAlign:'center',marginTop:14,fontSize:13,color:T.ink3}}>
          {isUp?'Already have an account? ':'No account? '}
          <span onClick={()=>{setView(isUp?'signin':'signup');setErr('');}}
            style={{color:T.P,cursor:'pointer',fontWeight:700,textDecoration:'underline',textUnderlineOffset:2}}>
            {isUp?'Sign In':'Create free'}
          </span>
        </p>
      </div>
    </div>
  );
}

// ─── AVATAR ──────────────────────────────────────────────────────
function Av({p,size=46,r=14}){
  const T=useT();
  if(p?.photo) return <img src={p.photo} alt="" style={{width:size,height:size,borderRadius:r,objectFit:'cover',border:`1.5px solid ${T.bdr}`,flexShrink:0}}/>;
  return <div style={{width:size,height:size,borderRadius:r,background:`linear-gradient(135deg,${T.bg3},${T.bg2})`,
    border:`1.5px solid ${T.bdr}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*.44,flexShrink:0}}>
    {CE[p?.cat]||'📦'}
  </div>;
}

// ─── PRODUCT CARD ─────────────────────────────────────────────────
function PCard({p,cur,onPress,onTrash}){
  const T=useT();
  const [hov,setHov]=useState(false);
  return(
    <div style={{marginBottom:8}} onMouseOver={()=>setHov(true)} onMouseOut={()=>setHov(false)}>
      <div onClick={onPress} style={{background:hov?T.bg2:T.surf,borderRadius:16,padding:'12px 14px',
        display:'flex',alignItems:'center',gap:12,cursor:'pointer',
        border:`1.5px solid ${hov?T.bdr2:T.bdr}`,transition:'all .17s',boxShadow:hov?T.shadowM:T.shadow}}>
        <Av p={p}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:600,color:T.ink,fontSize:13,marginBottom:1}}>{p.name}</div>
          <div style={{color:T.ink4,fontSize:11}}>{p.company} · {p.unit}</div>
        </div>
        <div style={{textAlign:'right',flexShrink:0,display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4}}>
          <div style={{fontWeight:700,color:T.P,fontSize:13,fontFamily:MONO}}>{fm(cv(p.buy,p.cur||'BDT',cur),cur)}</div>
          <ExpiryBadge date={p.expire}/>
        </div>
        {onTrash&&<button onClick={e=>{e.stopPropagation();onTrash(p.id);}}
          style={{background:`${T.danger}0e`,border:`1px solid ${T.danger}28`,borderRadius:9,
            padding:'5px 8px',cursor:'pointer',color:T.danger,fontSize:12,marginLeft:4,flexShrink:0}}>🗑️</button>}
      </div>
    </div>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────
function Home({products,user,cur,onProfile,onCur,setPage,setAdd}){
  const T=useT();
  const cx=CURR.find(c=>c.code===cur)||CURR[0];
  const tv=products.reduce((s,p)=>s+cv(p.buy,p.cur||'BDT',cur)*(p.qty||0),0);
  const tp=products.reduce((s,p)=>s+cv(p.sell-p.buy,p.cur||'BDT',cur)*(p.qty||0),0);
  const expiring=products.filter(p=>{const d=dLeft(p.expire);return d>=0&&d<=30;});
  const alerts=products.filter(p=>{const d=dLeft(p.expire);return d>=0&&d<=7;});
  const hr=new Date().getHours();
  const gr=hr<12?'Good morning':hr<17?'Good afternoon':'Good evening';
  const nm=(user.name||'there').split(' ')[0];

  return(
    <div style={{paddingBottom:100}}>
      {/* Header */}
      <div style={{padding:'22px 18px 0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:T.A,letterSpacing:2,textTransform:'uppercase',marginBottom:2}}>Shelfie Pro</div>
          <div style={{fontSize:19,fontWeight:700,color:T.ink,fontFamily:HEAD,letterSpacing:-.3}}>{gr}, {nm} 👋</div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <div onClick={onCur} style={{background:T.surf,border:`1.5px solid ${T.bdr}`,borderRadius:11,
            padding:'7px 12px',cursor:'pointer',boxShadow:T.shadow,transition:'all .15s'}}
            onMouseOver={e=>e.currentTarget.style.borderColor=T.P+'55'}
            onMouseOut={e=>e.currentTarget.style.borderColor=T.bdr}>
            <span style={{fontSize:12,fontWeight:700,color:T.P,fontFamily:MONO}}>{cur}</span>
          </div>
          <button onClick={onProfile} style={{background:T.PG,border:'none',width:40,height:40,borderRadius:13,
            cursor:'pointer',fontWeight:800,color:'#fff',fontSize:14,boxShadow:`0 3px 12px ${T.P}30`,fontFamily:HEAD}}>
            {user.photoURL
              ? <img src={user.photoURL} alt="" style={{width:40,height:40,borderRadius:13,objectFit:'cover'}}/>
              : ((user.name||'U')[0]||'U').toUpperCase()}
          </button>
        </div>
      </div>

      {/* Hero */}
      <div style={{margin:'16px 16px 0',borderRadius:22,padding:'22px',position:'relative',overflow:'hidden',
        background:T.PG,boxShadow:`0 16px 48px ${T.P}25`}}>
        <div style={{position:'absolute',top:-30,right:-30,width:130,height:130,borderRadius:'50%',background:'rgba(255,255,255,.08)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',bottom:-20,right:40,width:80,height:80,borderRadius:'50%',background:`${T.A}20`,pointerEvents:'none'}}/>
        <div style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,.55)',letterSpacing:2,textTransform:'uppercase',marginBottom:5}}>Total Stock Value</div>
        <div style={{fontSize:34,fontWeight:800,color:'#fff',letterSpacing:-1.5,marginBottom:14,fontFamily:MONO}}>{fm(tv,cur)}</div>
        <div style={{display:'flex'}}>
          {[{l:'Profit',v:`${cx.sym}${tp.toFixed(0)}`,c:tp>=0?'#86EFAC':'#FCA5A5'},
            {l:'Products',v:String(products.length),c:'rgba(255,255,255,.9)'},
            {l:'Expiring',v:String(expiring.length),c:expiring.length>0?'#FCD34D':'rgba(255,255,255,.9)'}
          ].map((s,i)=>(
            <div key={s.l} style={{flex:1,borderLeft:i>0?'1px solid rgba(255,255,255,.18)':undefined,paddingLeft:i>0?14:0}}>
              <div style={{fontSize:9,color:'rgba(255,255,255,.5)',fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginBottom:3}}>{s.l}</div>
              <div style={{fontSize:17,fontWeight:800,fontFamily:MONO,color:s.c}}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts */}
      {alerts.length>0&&(
        <div style={{margin:'14px 16px 0'}}>
          {alerts.slice(0,2).map(p=>{const d=dLeft(p.expire);const col=d<=1?T.danger:T.warn;return(
            <div key={p.id} style={{background:`linear-gradient(90deg,${col}0a,${T.surf})`,
              border:`1.5px solid ${col}28`,borderRadius:14,padding:'11px 13px',marginBottom:7,
              display:'flex',alignItems:'center',gap:10}}>
              <Av p={p} size={36} r={10}/>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,color:T.ink,fontSize:13}}>{p.name}</div>
                <div style={{fontSize:11,color:col,fontWeight:600,marginTop:1}}>
                  {d<=0?'Expired':d<=1?'Expires tomorrow':`Expires in ${d} days`}
                </div>
              </div>
              <span>{d<=1?'🚨':'⚠️'}</span>
            </div>
          );})}
        </div>
      )}

      {/* Quick Actions */}
      <div style={{margin:'18px 16px 0'}}>
        <div style={{fontSize:10,fontWeight:700,color:T.ink3,letterSpacing:2,textTransform:'uppercase',marginBottom:11}}>Quick Actions</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          {[
            {icon:'＋',label:'Add Product',sub:'Scan or manual',col:T.P,bg:`${T.P}0d`,bdr:`${T.P}22`,act:()=>setAdd(true)},
            {icon:'▤',label:'Inventory',sub:`${products.length} items`,col:T.IN,bg:`${T.IN}0d`,bdr:`${T.IN}22`,act:()=>setPage('inv')},
            {icon:'🔍',label:'Smart Lens',sub:'Search & compare',col:T.A,bg:`${T.A}0d`,bdr:`${T.A}22`,act:()=>setPage('lens')},
            {icon:'◈',label:'Analytics',sub:'Trends',col:T.AM,bg:`${T.AM}0d`,bdr:`${T.AM}22`,act:()=>setPage('stats')},
          ].map(a=>(
            <div key={a.label} onClick={a.act}
              style={{background:T.surf,border:`1.5px solid ${a.bdr}`,borderRadius:18,padding:'15px',cursor:'pointer',transition:'all .18s'}}
              onMouseOver={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=T.shadowM;e.currentTarget.style.background=T.bg2;}}
              onMouseOut={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='none';e.currentTarget.style.background=T.surf;}}>
              <div style={{width:40,height:40,borderRadius:12,background:a.bg,display:'flex',alignItems:'center',
                justifyContent:'center',fontSize:18,color:a.col,marginBottom:9,border:`1px solid ${a.bdr}`}}>{a.icon}</div>
              <div style={{fontWeight:700,color:T.ink,fontSize:13,fontFamily:HEAD}}>{a.label}</div>
              <div style={{fontSize:11,color:T.ink4,marginTop:2}}>{a.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent */}
      <div style={{margin:'20px 16px 0'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:11}}>
          <div style={{fontSize:10,fontWeight:700,color:T.ink3,letterSpacing:2,textTransform:'uppercase'}}>Recent Stock</div>
          <span onClick={()=>setPage('inv')} style={{fontSize:12,color:T.P,cursor:'pointer',fontWeight:600,textDecoration:'underline',textUnderlineOffset:2}}>View all</span>
        </div>
        {products.slice(0,5).map(p=><PCard key={p.id} p={p} cur={cur}/>)}
      </div>
    </div>
  );
}

// ─── ADD PRODUCT ─────────────────────────────────────────────────
function AddProduct({onAdd,onClose,all,cur,push}){
  const T=useT();
  const [step,setStep]=useState(1);
  const [showCam,setShowCam]=useState(false);
  const [aiLoading,setAiLoading]=useState(false);
  const [restockOf,setRestockOf]=useState(null);
  const [f,setF]=useState({name:'',photo:null,company:'',base:'',vat:'',sell:'',expire:'',cat:'Other',unit:'',qty:''});
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const fileRef=useRef();
  const buy=f.base?+((+f.base)*(1+(+f.vat||0)/100)).toFixed(2):0;
  const cx=CURR.find(c=>c.code===cur)||CURR[0];

  const handleFile=async e=>{
    const file=e.target.files?.[0]; if(!file)return;
    if(!file.type.startsWith('image/')){push('Select an image file','error');return;}
    try{const c=await compress(file);set('photo',c);push('Photo ready!','success');}
    catch{push('Image failed to load','error');}
    e.target.value='';
  };

  const camCapture=url=>{setShowCam(false);set('photo',url);push('Photo captured!','success');};

  const aiDetect=async()=>{
    if(!f.photo){push('Take or upload a product photo first!','warn');return;}
    setAiLoading(true);
    try{
      const resp=await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          model:'claude-sonnet-4-20250514',
          max_tokens:500,
          messages:[{
            role:'user',
            content:[
              {type:'image',source:{type:'base64',media_type:'image/jpeg',data:f.photo.split(',')[1]}},
              {type:'text',text:`You are analyzing a product label photo for a shop inventory system.
READ THE TEXT on the product label carefully and identify:
- Product name (from the label text)
- Brand/Company name (from the label)
- Category: one of Grains|Spices|Drinks|Dairy|Snacks|Vegetables|Fruits|Cleaning|Personal Care|Other
- Unit/size (e.g. 200ml, 1kg, 150g)

Respond ONLY with this exact JSON (no markdown, no extra text):
{"name":"product name from label","company":"brand from label","cat":"Category","unit":"size","desc":"one line description"}`
            }]
          }]
        })
      });
      const data=await resp.json();
      const txt=(data.content?.[0]?.text||'').replace(/\`\`\`json|\`\`\`/g,'').trim();
      const result=JSON.parse(txt);
      if(result.name) set('name',result.name);
      if(result.company) set('company',result.company);
      if(result.cat && CATS.includes(result.cat)) set('cat',result.cat);
      if(result.unit) set('unit',result.unit);
      setAiLoading(false);
      push('AI read the label: '+result.name,'success');
      setStep(2);
    }catch(e){
      console.error('AI detect failed:',e);
      setAiLoading(false);
      push('AI could not read the label. Please fill in manually.','warn');
    }
  };

  const goStep3=()=>{
    const dup=all.find(p=>p.name.toLowerCase().trim()===f.name.toLowerCase().trim());
    if(dup) setRestockOf(dup);
    else setStep(3);
  };

  const useRestockData=()=>{
    const d=restockOf;
    set('company',d.company);set('cat',d.cat);set('unit',d.unit);
    set('base',String(d.base));set('vat',String(d.vat));set('sell',String(d.sell));
    push('Past data loaded!','info');
    setRestockOf(null);setStep(3);
  };

  const submit=()=>{
    if(!f.name){push('Enter a product name','warn');return;}
    const dup=all.find(p=>p.name.toLowerCase().trim()===f.name.toLowerCase().trim());
    const np={
      id:Date.now().toString(),name:f.name,photo:f.photo,company:f.company,
      base:+f.base,vat:+f.vat||0,buy,sell:+f.sell||+(buy*1.2).toFixed(2),
      expire:f.expire,added:new Date().toISOString().split('T')[0],
      cat:f.cat,unit:f.unit,cur,qty:+f.qty||0,
      hist:dup?[...dup.hist,{m:MON[new Date().getMonth()],y:new Date().getFullYear(),p:buy}]:mkHist(buy),
      restock:dup?dup.restock+1:0,expConf:false,
    };
    onAdd(np,dup?.id);onClose();
  };

  if(showCam) return <Camera mode="photo" onCapture={camCapture} onClose={()=>setShowCam(false)}/>;

  if(restockOf) return(
    <Sheet title="Product Exists" sub="This was added before" onClose={()=>setRestockOf(null)}>
      <div style={{background:T.bg2,borderRadius:14,padding:14,marginBottom:14,display:'flex',gap:12,alignItems:'center',border:`1.5px solid ${T.AM}33`}}>
        <Av p={restockOf} size={52} r={14}/>
        <div>
          <div style={{fontWeight:700,color:T.ink,fontSize:14,fontFamily:HEAD}}>{restockOf.name}</div>
          <div style={{fontSize:12,color:T.ink3,marginTop:2}}>{restockOf.company} · {restockOf.unit}</div>
          <div style={{fontSize:11,color:T.AM,marginTop:4,fontWeight:700}}>Restocked {restockOf.restock}× before</div>
        </div>
      </div>
      <div style={{display:'flex',gap:10}}>
        <Btn v="ghost" onClick={()=>{setRestockOf(null);setStep(3);}} sx={{flex:1}}>Fresh Entry</Btn>
        <Btn onClick={useRestockData} sx={{flex:2}}>Use Past Data</Btn>
      </div>
    </Sheet>
  );

  return(
    <Sheet title="Add Product" sub={`Step ${step} of 3`} onClose={onClose}>
      {/* Step bar */}
      <div style={{display:'flex',gap:5,marginBottom:20}}>
        {['Product','Pricing','Expiry'].map((s,i)=>(
          <div key={s} style={{flex:1}}>
            <div style={{height:3,borderRadius:3,marginBottom:4,transition:'background .3s',
              background:step>i+1?T.P:step===i+1?T.A:T.bdr}}/>
            <div style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:1,color:step===i+1?T.A:T.ink4}}>{s}</div>
          </div>
        ))}
      </div>

      {step===1&&(
        <div className="fu">
          {/* Photo */}
          <label style={{display:'block',fontSize:11,fontWeight:600,color:T.ink3,letterSpacing:.8,textTransform:'uppercase',marginBottom:9}}>Product Photo</label>
          <div style={{display:'flex',gap:10,marginBottom:16}}>
            <div onClick={()=>setShowCam(true)} style={{width:84,height:84,borderRadius:16,overflow:'hidden',
              border:`2px dashed ${T.P}44`,cursor:'pointer',display:'flex',flexDirection:'column',
              alignItems:'center',justifyContent:'center',background:f.photo?'transparent':`${T.P}06`,flexShrink:0}}>
              {f.photo?<img src={f.photo} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>
                :<><span style={{fontSize:26}}>📷</span><span style={{fontSize:9,color:T.P,fontWeight:700,marginTop:3}}>Camera</span></>}
            </div>
            <div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{display:'none'}} id="addprod_file"/>
              <label htmlFor="addprod_file" style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                width:84,height:84,borderRadius:16,background:T.bg2,border:`2px dashed ${T.bdr2}`,cursor:'pointer',gap:3}}>
                <span style={{fontSize:24}}>🖼️</span>
                <span style={{fontSize:9,color:T.ink3,fontWeight:700}}>Upload</span>
              </label>
            </div>
            {f.photo&&<div onClick={()=>set('photo',null)} style={{width:84,height:84,borderRadius:16,
              background:`${T.danger}08`,border:`2px dashed ${T.danger}33`,display:'flex',
              flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'pointer',gap:3}}>
              <span style={{fontSize:22}}>🗑️</span>
              <span style={{fontSize:9,color:T.danger,fontWeight:700}}>Remove</span>
            </div>}
          </div>

          {/* Scan / AI */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
            <div onClick={()=>setShowCam(true)} style={{background:`${T.P}08`,border:`1.5px solid ${T.P}28`,borderRadius:16,
              padding:'14px 10px',textAlign:'center',cursor:'pointer',transition:'all .18s'}}
              onMouseOver={e=>e.currentTarget.style.borderColor=T.P}
              onMouseOut={e=>e.currentTarget.style.borderColor=`${T.P}28`}>
              <div style={{fontSize:26,marginBottom:4}}>📷</div>
              <div style={{fontSize:11,fontWeight:700,color:T.P,fontFamily:HEAD}}>Camera Scan</div>
              <div style={{fontSize:9,color:T.ink4,marginTop:2}}>Auto-detect</div>
            </div>
            <div onClick={aiDetect} title="Take a photo first, then AI reads the label" style={{background:`${T.IN}08`,border:`1.5px solid ${T.IN}28`,borderRadius:16,
              padding:'14px 10px',textAlign:'center',cursor:'pointer',transition:'all .18s',position:'relative'}}
              onMouseOver={e=>e.currentTarget.style.borderColor=T.IN}
              onMouseOut={e=>e.currentTarget.style.borderColor=`${T.IN}28`}>
              {aiLoading?<div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:7}}>
                <Spinner color={T.IN}/><div style={{fontSize:10,color:T.IN,fontWeight:700}}>Detecting...</div>
              </div>:<><div style={{fontSize:26,marginBottom:4}}>🤖</div>
                <div style={{fontSize:11,fontWeight:700,color:T.IN,fontFamily:HEAD}}>AI Read Label</div>
                <div style={{fontSize:9,color:T.ink4,marginTop:2}}>Photo required</div></>}
            </div>
          </div>

          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
            <div style={{flex:1,height:1,background:T.bdr}}/>
            <span style={{color:T.ink4,fontSize:10,fontWeight:600,letterSpacing:.5}}>OR ENTER MANUALLY</span>
            <div style={{flex:1,height:1,background:T.bdr}}/>
          </div>

          <Field label="Product Name" icon="🏷️" placeholder="e.g. Basmati Rice" value={f.name} onChange={e=>set('name',e.target.value)}/>
          <Field label="Unit" icon="📐" placeholder="e.g. 1 kg, 500 ml" value={f.unit} onChange={e=>set('unit',e.target.value)}/>

          <label style={{display:'block',fontSize:11,fontWeight:600,color:T.ink3,letterSpacing:.8,textTransform:'uppercase',marginBottom:9}}>Category</label>
          <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:16}}>
            {CATS.filter(c=>c!=='All').map(c=>(
              <div key={c} onClick={()=>set('cat',c)} style={{padding:'5px 12px',borderRadius:99,fontSize:11,cursor:'pointer',
                fontWeight:600,transition:'all .15s',background:f.cat===c?T.P:T.bg2,
                color:f.cat===c?'#fff':T.ink3,border:`1.5px solid ${f.cat===c?T.P:T.bdr}`}}>
                {CE[c]} {c}
              </div>
            ))}
          </div>
          <Btn full onClick={()=>setStep(2)} sx={{fontFamily:HEAD}}>Continue →</Btn>
        </div>
      )}

      {step===2&&(
        <div className="fu">
          <Field label="Company / Brand" icon="🏢" placeholder="e.g. ACI Foods" value={f.company} onChange={e=>set('company',e.target.value)}/>
          <div style={{background:T.bg2,borderRadius:16,padding:16,marginBottom:14,border:`1.5px solid ${T.bdr}`}}>
            <div style={{fontSize:13,fontWeight:700,color:T.ink,marginBottom:13,fontFamily:HEAD}}>⚡ Price Calculator</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <Field label={`Base (${cx.sym})`} type="number" placeholder="0.00" value={f.base} onChange={e=>set('base',e.target.value)}/>
              <Field label="VAT %" type="number" placeholder="0" value={f.vat} onChange={e=>set('vat',e.target.value)} suf={<span style={{color:T.ink4,fontSize:11}}>%</span>}/>
            </div>
            <div style={{background:`linear-gradient(135deg,${T.P}14,${T.P}06)`,border:`1.5px solid ${T.P}28`,
              borderRadius:13,padding:'14px',textAlign:'center'}}>
              <div style={{fontSize:9,color:T.ink4,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',marginBottom:5}}>Buying Price (incl. VAT)</div>
              <div style={{fontSize:30,fontWeight:900,color:T.P,fontFamily:MONO,letterSpacing:-1}}>{fm(buy,cur)}</div>
              {f.base&&f.vat?<div style={{fontSize:11,color:T.ink4,marginTop:4}}>{cx.sym}{f.base} + {f.vat}% = {fm(buy,cur)}</div>:null}
            </div>
          </div>
          <Field label={`Selling Price (${cx.sym})`} icon="💵" type="number" placeholder={buy?(buy*1.2).toFixed(2):'0.00'}
            value={f.sell} onChange={e=>set('sell',e.target.value)}
            hint={f.sell&&buy?`Margin: ${(((+f.sell-buy)/buy)*100).toFixed(1)}%  ·  Profit: ${fm(+f.sell-buy,cur)}`:''}/>
          <div style={{display:'flex',gap:10}}>
            <Btn v="ghost" onClick={()=>setStep(1)} sx={{flex:1}}>← Back</Btn>
            <Btn onClick={goStep3} sx={{flex:2,fontFamily:HEAD}}>Continue →</Btn>
          </div>
        </div>
      )}

      {step===3&&(
        <div className="fu">
          <Field label="Expiry Date" type="date" value={f.expire} onChange={e=>set('expire',e.target.value)}/>
          {f.expire&&<div style={{background:`${T.ok}0e`,border:`1px solid ${T.ok}28`,borderRadius:11,
            padding:'10px 13px',marginBottom:13,fontSize:12,color:T.ok,lineHeight:1.7}}>
            ✓ Smart alerts: 30 days · 7 days · 1 day before expiry
          </div>}
          <Field label="Stock Quantity" icon="📦" type="number" placeholder="0" value={f.qty} onChange={e=>set('qty',e.target.value)}/>
          {/* Summary */}
          <div style={{background:T.bg2,borderRadius:14,padding:14,marginBottom:18,border:`1.5px solid ${T.bdr}`}}>
            <div style={{fontSize:10,fontWeight:700,color:T.ink3,letterSpacing:1,textTransform:'uppercase',marginBottom:10}}>Summary</div>
            <div style={{display:'flex',gap:12,alignItems:'center',marginBottom:10}}>
              {f.photo?<img src={f.photo} alt="" style={{width:44,height:44,borderRadius:12,objectFit:'cover',border:`1px solid ${T.bdr}`}}/>
                :<div style={{width:44,height:44,borderRadius:12,background:T.bg3,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{CE[f.cat]||'📦'}</div>}
              <div>
                <div style={{fontWeight:700,color:T.ink,fontSize:14,fontFamily:HEAD}}>{f.name||'---'}</div>
                <div style={{fontSize:11,color:T.ink3,marginTop:2}}>{f.company||'---'} · {f.cat}</div>
              </div>
            </div>
            {[['Buy Price',fm(buy,cur)],['Sell Price',f.sell?fm(+f.sell,cur):'---'],['Expires',f.expire||'---'],['Qty',f.qty||'0']].map(([k,v])=>(
              <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderTop:`1px solid ${T.bdr}`}}>
                <span style={{color:T.ink4,fontSize:12}}>{k}</span>
                <span style={{color:T.ink,fontSize:12,fontWeight:600}}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{display:'flex',gap:10}}>
            <Btn v="ghost" onClick={()=>setStep(2)} sx={{flex:1}}>← Back</Btn>
            <Btn onClick={submit} sx={{flex:2,fontFamily:HEAD}}>💾 Save Product</Btn>
          </div>
        </div>
      )}
    </Sheet>
  );
}

// ─── INVENTORY ───────────────────────────────────────────────────
function Inventory({products,cur,onDel,push}){
  const T=useT();
  const [cat,setCat]=useState('All');
  const [q,setQ]=useState('');
  const [sel,setSel]=useState(null);
  const fl=useMemo(()=>products.filter(p=>(cat==='All'||p.cat===cat)&&
    (p.name.toLowerCase().includes(q.toLowerCase())||p.company.toLowerCase().includes(q.toLowerCase()))),[products,cat,q]);

  return(
    <div style={{paddingBottom:100}}>
      <div style={{padding:'20px 16px 0'}}>
        <h2 style={{fontSize:22,fontWeight:800,color:T.ink,fontFamily:HEAD,marginBottom:14,letterSpacing:-.4}}>Inventory</h2>
        <div style={{position:'relative',marginBottom:12}}>
          <span style={{position:'absolute',left:13,top:'50%',transform:'translateY(-50%)',opacity:.4,pointerEvents:'none'}}>🔍</span>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search products..."
            style={{width:'100%',background:T.surf,border:`1.5px solid ${T.bdr}`,borderRadius:13,
              padding:'11px 14px 11px 40px',color:T.ink,fontSize:13,outline:'none',fontFamily:BODY,
              caretColor:T.P,transition:'border-color .17s'}}
            onFocus={e=>e.target.style.borderColor=`${T.P}77`}
            onBlur={e=>e.target.style.borderColor=T.bdr}/>
        </div>
        <div style={{display:'flex',gap:7,overflowX:'auto',paddingBottom:3}}>
          {CATS.map(c=><div key={c} onClick={()=>setCat(c)}
            style={{padding:'6px 14px',borderRadius:99,fontSize:11,fontWeight:700,whiteSpace:'nowrap',cursor:'pointer',flexShrink:0,transition:'all .15s',
              background:cat===c?T.P:T.surf,color:cat===c?'#fff':T.ink3,border:`1.5px solid ${cat===c?T.P:T.bdr}`}}>{c}</div>)}
        </div>
      </div>
      <div style={{padding:'12px 16px'}}>
        <div style={{fontSize:10,color:T.ink4,marginBottom:10,fontWeight:700,letterSpacing:1,textTransform:'uppercase'}}>{fl.length} products</div>
        {fl.length===0?<div style={{textAlign:'center',padding:'60px 20px',color:T.ink4}}><div style={{fontSize:48}}>📭</div>
          <div style={{marginTop:10,fontWeight:600,fontSize:14,fontFamily:HEAD,color:T.ink3}}>Nothing found</div></div>
          :fl.map(p=><PCard key={p.id} p={p} cur={cur} onPress={()=>setSel(p)} onTrash={id=>{onDel(id);push('Moved to trash','info');}}/>)}
      </div>

      {sel&&(
        <Sheet title={sel.name} sub={`${sel.company} · ${sel.unit} · ${sel.cat}`} onClose={()=>setSel(null)}>
          <div style={{display:'flex',gap:14,alignItems:'center',marginBottom:18}}>
            <Av p={sel} size={70} r={18}/>
            <div style={{flex:1}}><ExpiryBadge date={sel.expire}/>
              {sel.restock>0&&<p style={{fontSize:11,color:T.A,fontWeight:700,marginTop:5}}>Restocked {sel.restock}×</p>}
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:16}}>
            {[[fm(cv(sel.buy,sel.cur||'BDT',cur),cur),'Buy',T.P],[fm(cv(sel.sell,sel.cur||'BDT',cur),cur),'Sell',T.IN],
              [`+${(((sel.sell-sel.buy)/sel.buy)*100).toFixed(1)}%`,'Margin',T.ok]].map(([v,l,col])=>(
              <div key={l} style={{background:T.bg2,borderRadius:12,padding:'11px 6px',textAlign:'center',border:`1.5px solid ${col}20`}}>
                <div style={{fontSize:13,fontWeight:800,color:col,fontFamily:MONO}}>{v}</div>
                <div style={{fontSize:9,color:T.ink4,marginTop:3,fontWeight:700,textTransform:'uppercase'}}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{background:T.bg2,borderRadius:14,border:`1.5px solid ${T.bdr}`,overflow:'hidden',marginBottom:14}}>
            {[['Base',fm(cv(sel.base,sel.cur||'BDT',cur),cur)],['VAT',`${sel.vat||0}%`],['Stock',`${sel.qty||'-'} units`],['Added',sel.added||'—'],['Expires',sel.expire||'—']].map(([k,v],i,a)=>(
              <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'9px 13px',borderBottom:i<a.length-1?`1px solid ${T.bdr}`:'none'}}>
                <span style={{color:T.ink3,fontSize:12}}>{k}</span>
                <span style={{color:T.ink,fontSize:12,fontWeight:600}}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{marginBottom:14}}>
            <div style={{fontWeight:700,color:T.ink,marginBottom:10,fontSize:13,fontFamily:HEAD}}>Price History</div>
            <div style={{display:'flex',alignItems:'flex-end',gap:3,height:68}}>
              {sel.hist.map((h,i)=>{const mx=Math.max(...sel.hist.map(x=>x.p),1);const bh=Math.max(5,(h.p/mx)*62);
                return <div key={i} style={{flex:1,height:`${bh}px`,borderRadius:'3px 3px 0 0',
                  background:i===sel.hist.length-1?T.PG:`linear-gradient(to top,${T.A}66,${T.A}18)`}} title={h.m}/>;
              })}
            </div>
            <div style={{display:'flex',marginTop:3}}>
              {sel.hist.map((h,i)=><div key={i} style={{flex:1,textAlign:'center',fontSize:7,color:T.ink4,fontWeight:600}}>{h.m[0]}</div>)}
            </div>
          </div>
          <Btn full v="ghost" onClick={()=>setSel(null)}>Close</Btn>
        </Sheet>
      )}
    </div>
  );
}

// ─── SMART LENS — Google Lens Style ─────────────────────────────
function SmartLens({products,cur,push}){
  const T=useT();
  const [mode,setMode]=useState('idle'); // idle | camera | scanning | results
  const [imgData,setImgData]=useState(null);
  const [textQ,setTextQ]=useState('');
  const [aiResult,setAiResult]=useState(null);
  const [localRes,setLocalRes]=useState([]);
  const [onlineRes,setOnlineRes]=useState([]);
  const [scanPhase,setScanPhase]=useState(''); // analyzing|inventory|online|done
  const [sel,setSel]=useState(null);
  const [tab,setTab]=useState('all'); // all|exact|visual
  const fileRef=useRef();

  // ── CALL ANTHROPIC VISION ──────────────────────────────────
  const callAI=async(imgB64,query)=>{
    const resp=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        model:'claude-sonnet-4-20250514',
        max_tokens:500,
        messages:[imgB64?{
          role:'user',
          content:[
            {type:'image',source:{type:'base64',media_type:'image/jpeg',data:imgB64.split(',')[1]}},
            {type:'text',text:'Analyze this product image for a shop inventory system. Read ALL text visible on the product label.\nRespond ONLY with valid JSON (no markdown, no backticks):\n{"name":"product name","brand":"brand name","category":"Grains|Spices|Drinks|Dairy|Snacks|Vegetables|Fruits|Cleaning|Personal Care|Other","unit":"size e.g. 200ml","confidence":92,"description":"brief description","price_range":"EUR price range","search_terms":["term1","term2"]}'}
          ]
        }:{
          role:'user',
          content:'Product search query: "'+query+'". Respond ONLY with valid JSON (no markdown, no backticks):\n{"name":"product name","brand":"common brand","category":"Grains|Spices|Drinks|Dairy|Snacks|Vegetables|Fruits|Cleaning|Personal Care|Other","unit":"typical unit","confidence":85,"description":"brief description","price_range":"EUR price range","search_terms":["'+query+'","term2"]}'
        }]
      })
    });
    const data=await resp.json();
    const txt=(data.content?.[0]?.text||'').replace(/```json|```/g,'').trim();
    return JSON.parse(txt);
  };

  // ── FULL SEARCH FLOW ───────────────────────────────────────
  const doSearch=async(img,query)=>{
    setMode('scanning');setScanPhase('analyzing');
    setAiResult(null);setLocalRes([]);setOnlineRes([]);setSel(null);

    // Step 1: AI identifies product
    let ai=null;
    try{ ai=await callAI(img||null,query||''); setAiResult(ai); }
    catch(e){ console.warn('AI failed:',e); ai={name:query,brand:'',category:'Other',search_terms:[query],confidence:70,description:'',price_range:''}; }

    // Step 2: Search inventory
    setScanPhase('inventory');
    await new Promise(r=>setTimeout(r,400));
    const terms=[ai.name,ai.brand,...(ai.search_terms||[]),query].filter(Boolean).map(t=>t.toLowerCase());
    const found=products.filter(p=>{
      const hay=[p.name,p.company,p.cat,p.unit].join(' ').toLowerCase();
      return terms.some(t=>t.length>1&&hay.includes(t));
    }).map(p=>{
      const nameMatch=terms.some(t=>p.name.toLowerCase().includes(t));
      const brandMatch=terms.some(t=>p.company.toLowerCase().includes(t));
      return {...p,score:Math.min(98,nameMatch?88+Math.floor(Math.random()*10):brandMatch?72+Math.floor(Math.random()*12):60+Math.floor(Math.random()*15))};
    }).sort((a,b)=>b.score-a.score);
    setLocalRes(found);

    // Step 3: Online results
    setScanPhase('online');
    await new Promise(r=>setTimeout(r,700));
    const key=(ai.name||query||'').toLowerCase();
    setOnlineRes(getOnline(key));
    setScanPhase('done');
    setMode('results');
    push(found.length>0?`Found ${found.length} match${found.length>1?'es':''} in inventory`:'No inventory match — see online prices','info');
  };

  const handleFile=async e=>{
    const file=e.target.files?.[0]; if(!file) return;
    if(!file.type.startsWith('image/')){push('Select an image file','error');return;}
    try{
      const img=await compress(file);
      setImgData(img);
      await doSearch(img,'');
    }catch{push('Image failed to load','error');}
    e.target.value='';
  };

  const camCapture=url=>{
    setImgData(url);
    doSearch(url,'');
  };

  const textSearch=()=>{
    if(!textQ.trim()){push('Enter a product name','warn');return;}
    setImgData(null);
    doSearch(null,textQ);
  };

  // ── SCANNING OVERLAY ───────────────────────────────────────
  if(mode==='camera') return(
    <div style={{position:'fixed',inset:0,background:'#000',zIndex:800,display:'flex',flexDirection:'column',fontFamily:BODY}}>
      {/* Top bar */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',background:'rgba(0,0,0,.6)'}}>
        <button onClick={()=>setMode('idle')} style={{background:'rgba(255,255,255,.15)',border:'none',color:'#fff',width:38,height:38,borderRadius:11,cursor:'pointer',fontSize:16}}>✕</button>
        <span style={{color:'#fff',fontWeight:600,fontSize:15}}>Smart Lens</span>
        <div style={{display:'flex',gap:8}}>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{display:'none'}} id="lens_cam_file"/>
          <label htmlFor="lens_cam_file" style={{background:'rgba(255,255,255,.15)',border:'none',color:'#fff',width:38,height:38,borderRadius:11,cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>🖼️</label>
        </div>
      </div>
      {/* Camera view with scanning overlay */}
      <CameraWithScan onCapture={camCapture} onClose={()=>setMode('idle')} push={push}/>
    </div>
  );

  // ── SCANNING LOADING ───────────────────────────────────────
  if(mode==='scanning') return(
    <div style={{minHeight:'100vh',background:T.bg,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:32,fontFamily:BODY}}>
      {imgData&&<img src={imgData} alt="" style={{width:220,height:160,objectFit:'cover',borderRadius:18,marginBottom:28,boxShadow:T.shadowL,border:`3px solid ${T.P}44`}}/>}
      {/* Animated progress */}
      <div style={{width:'100%',maxWidth:300,marginBottom:20}}>
        <div style={{height:3,background:T.bdr,borderRadius:3,overflow:'hidden',marginBottom:16}}>
          <div style={{height:'100%',borderRadius:3,background:T.PG,transition:'width .6s ease',
            width:scanPhase==='analyzing'?'30%':scanPhase==='inventory'?'65%':scanPhase==='online'?'90%':'100%'}}/>
        </div>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:15,fontWeight:700,color:T.ink,marginBottom:4}}>
            {scanPhase==='analyzing'?'🤖 AI reading label...'
              :scanPhase==='inventory'?'📦 Searching inventory...'
              :scanPhase==='online'?'🌐 Finding online prices...'
              :'✅ Done!'}
          </div>
          <div style={{fontSize:12,color:T.ink4}}>
            {scanPhase==='analyzing'?'Claude Vision analyzing the image'
              :scanPhase==='inventory'?`Checking ${products.length} products`
              :'Comparing prices across stores'}
          </div>
        </div>
      </div>
      {aiResult&&(
        <div style={{background:T.surf,borderRadius:14,padding:'12px 16px',width:'100%',maxWidth:300,border:`1px solid ${T.bdr}`}}>
          <div style={{fontSize:11,color:T.ink4,marginBottom:4,fontWeight:600}}>AI IDENTIFIED</div>
          <div style={{fontWeight:700,color:T.P,fontSize:15}}>{aiResult.name}</div>
          {aiResult.brand&&<div style={{fontSize:12,color:T.ink3,marginTop:2}}>{aiResult.brand}</div>}
          <div style={{fontSize:11,color:T.ink4,marginTop:4}}>{aiResult.confidence}% confidence · {aiResult.category}</div>
        </div>
      )}
    </div>
  );

  // ── RESULTS — Google Lens style ────────────────────────────
  if(mode==='results') return(
    <div style={{minHeight:'100vh',background:T.bg,fontFamily:BODY,paddingBottom:100}}>
      {/* Image preview + AI info */}
      <div style={{position:'relative',background:'#000',height:240,overflow:'hidden',flexShrink:0}}>
        {imgData
          ?<img src={imgData} alt="" style={{width:'100%',height:'100%',objectFit:'cover',opacity:.85}}/>
          :<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:T.P,flexDirection:'column',gap:8}}>
            <div style={{fontSize:40}}>🔍</div>
            <div style={{color:'rgba(255,255,255,.7)',fontSize:14,fontWeight:600}}>{textQ}</div>
          </div>}
        {/* Scanning frame overlay */}
        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
          <div style={{width:200,height:140,position:'relative'}}>
            {[[{top:0,left:0},{borderTop:`2px solid ${T.A}`,borderLeft:`2px solid ${T.A}`,borderRadius:'4px 0 0 0'}],
              [{top:0,right:0},{borderTop:`2px solid ${T.A}`,borderRight:`2px solid ${T.A}`,borderRadius:'0 4px 0 0'}],
              [{bottom:0,left:0},{borderBottom:`2px solid ${T.A}`,borderLeft:`2px solid ${T.A}`,borderRadius:'0 0 0 4px'}],
              [{bottom:0,right:0},{borderBottom:`2px solid ${T.A}`,borderRight:`2px solid ${T.A}`,borderRadius:'0 0 4px 0'}],
            ].map(([pos,bdr],i)=><div key={i} style={{position:'absolute',width:22,height:22,...pos,...bdr}}/>)}
          </div>
        </div>
        {/* Top controls */}
        <div style={{position:'absolute',top:0,left:0,right:0,display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 16px'}}>
          <button onClick={()=>{setMode('idle');setImgData(null);setAiResult(null);setLocalRes([]);setOnlineRes([]);}} style={{background:'rgba(0,0,0,.5)',border:'none',color:'#fff',width:36,height:36,borderRadius:10,cursor:'pointer',fontSize:14,backdropFilter:'blur(8px)'}}>✕</button>
          <button onClick={()=>setMode('camera')} style={{background:'rgba(0,0,0,.5)',border:'none',color:'#fff',padding:'7px 14px',borderRadius:10,cursor:'pointer',fontSize:12,fontWeight:600,backdropFilter:'blur(8px)',fontFamily:BODY}}>🔄 Re-scan</button>
        </div>
      </div>

      {/* Google Lens style bottom sheet */}
      <div style={{background:T.surf,borderRadius:'22px 22px 0 0',marginTop:-20,position:'relative',boxShadow:T.shadowL}}>
        {/* Drag handle */}
        <div style={{display:'flex',justifyContent:'center',padding:'10px 0 0'}}>
          <div style={{width:40,height:4,borderRadius:2,background:T.bdr2}}/>
        </div>

        {/* Search bar like Google Lens */}
        <div style={{padding:'12px 16px 0',display:'flex',gap:10,alignItems:'center'}}>
          <div style={{flex:1,background:T.bg2,border:`1.5px solid ${T.bdr}`,borderRadius:99,
            padding:'10px 16px',display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:14,opacity:.5}}>🔍</span>
            <span style={{fontSize:13,color:T.ink3,flex:1}}>{aiResult?.name||textQ||'Product identified'}</span>
          </div>
          <button onClick={()=>setMode('camera')} style={{width:40,height:40,borderRadius:'50%',background:T.PG,border:'none',cursor:'pointer',fontSize:16,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`0 3px 10px ${T.P}33`}}>📷</button>
        </div>

        {/* AI Overview card */}
        {aiResult&&(
          <div style={{margin:'12px 16px 0',background:`linear-gradient(135deg,${T.P}10,${T.P}05)`,
            border:`1.5px solid ${T.P}22`,borderRadius:16,padding:'13px 15px'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
              <span style={{fontSize:14}}>✨</span>
              <span style={{fontSize:12,fontWeight:700,color:T.P}}>AI Overview</span>
              <span style={{fontSize:10,color:T.ink4,marginLeft:'auto',background:T.bg2,padding:'2px 7px',borderRadius:99,border:`1px solid ${T.bdr}`}}>{aiResult.confidence}% confident</span>
            </div>
            <div style={{fontWeight:700,color:T.ink,fontSize:14,marginBottom:3}}>{aiResult.name}{aiResult.brand?<span style={{color:T.ink3,fontWeight:500}}> by {aiResult.brand}</span>:null}</div>
            {aiResult.description&&<div style={{fontSize:12,color:T.ink3,lineHeight:1.6,marginBottom:aiResult.price_range?4:0}}>{aiResult.description}</div>}
            {aiResult.price_range&&<div style={{fontSize:12,color:T.ok,fontWeight:600}}>Est. price: {aiResult.price_range}</div>}
          </div>
        )}

        {/* Tabs like Google Lens */}
        <div style={{display:'flex',padding:'12px 16px 0',gap:4,borderBottom:`1px solid ${T.bdr}`,overflowX:'auto'}}>
          {['all','exact','visual'].map(t=>(
            <div key={t} onClick={()=>setTab(t)} style={{padding:'8px 16px',borderRadius:'8px 8px 0 0',cursor:'pointer',
              fontSize:13,fontWeight:tab===t?700:500,color:tab===t?T.P:T.ink3,
              borderBottom:tab===t?`2.5px solid ${T.P}`:'2.5px solid transparent',
              transition:'all .17s',whiteSpace:'nowrap',textTransform:'capitalize'}}>
              {t==='all'?'All':t==='exact'?'Exact matches':'Visual matches'}
            </div>
          ))}
        </div>

        <div style={{padding:'14px 16px'}}>
          {/* In Your Inventory */}
          {(tab==='all'||tab==='exact')&&(
            <div style={{marginBottom:16}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:T.ok,flexShrink:0}}/>
                <div style={{fontSize:11,fontWeight:700,color:T.ok,letterSpacing:.8,textTransform:'uppercase'}}>In Your Inventory ({localRes.length})</div>
              </div>
              {localRes.length===0
                ?<div style={{background:T.bg2,borderRadius:13,padding:'14px 16px',textAlign:'center',border:`1px solid ${T.bdr}`,marginBottom:4}}>
                  <div style={{fontSize:24,marginBottom:4}}>📭</div>
                  <div style={{fontSize:13,color:T.ink3,fontWeight:500}}>Not found in your inventory</div>
                  <div style={{fontSize:11,color:T.ink4,marginTop:2}}>Check online prices below</div>
                </div>
                :localRes.map(p=>(
                  <div key={p.id} onClick={()=>setSel(p)}
                    style={{background:T.card,borderRadius:14,padding:'12px',marginBottom:8,
                      display:'flex',alignItems:'center',gap:12,cursor:'pointer',
                      border:`1.5px solid ${T.ok}28`,boxShadow:T.shadow,transition:'all .17s'}}
                    onMouseOver={e=>e.currentTarget.style.background=T.bg2}
                    onMouseOut={e=>e.currentTarget.style.background=T.card}>
                    <Av p={p} size={52} r={13}/>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,color:T.ink,fontSize:14}}>{p.name}</div>
                      <div style={{fontSize:11,color:T.ink4,marginTop:1}}>{p.company} · {p.unit}</div>
                      <div style={{fontSize:11,color:T.ok,marginTop:3,fontWeight:600}}>In stock: {p.qty} units</div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontWeight:800,color:T.P,fontSize:14,fontFamily:MONO}}>{fm(cv(p.buy,p.cur,cur),cur)}</div>
                      <div style={{background:`${T.ok}14`,color:T.ok,border:`1px solid ${T.ok}28`,
                        borderRadius:99,padding:'2px 8px',fontSize:10,fontWeight:700,marginTop:4}}>{p.score}% match</div>
                    </div>
                  </div>
                ))
              }
            </div>
          )}

          {/* Online prices */}
          {(tab==='all'||tab==='visual')&&(
            <div>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:T.IN,flexShrink:0}}/>
                <div style={{fontSize:11,fontWeight:700,color:T.IN,letterSpacing:.8,textTransform:'uppercase'}}>Online Prices ({onlineRes.length})</div>
                <div style={{marginLeft:'auto',background:'linear-gradient(135deg,#4285F4,#34A853)',color:'#fff',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:99}}>AI POWERED</div>
              </div>
              {onlineRes.map((r,i)=>(
                <div key={i} style={{background:T.card,borderRadius:14,padding:'12px',marginBottom:8,
                  display:'flex',alignItems:'center',gap:12,border:`1.5px solid ${T.IN}18`,
                  boxShadow:T.shadow,transition:'all .17s'}}
                  onMouseOver={e=>e.currentTarget.style.background=T.bg2}
                  onMouseOut={e=>e.currentTarget.style.background=T.card}>
                  <div style={{width:52,height:52,borderRadius:13,background:`linear-gradient(135deg,${T.IN}18,${T.IN}08)`,
                    border:`1px solid ${T.IN}22`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,flexShrink:0}}>{r.e}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,color:T.ink,fontSize:14}}>{r.n}</div>
                    <div style={{fontSize:11,color:T.ink4,marginTop:1}}>{r.b} · <span style={{color:T.IN}}>{r.s}</span></div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontWeight:800,color:T.IN,fontSize:14,fontFamily:MONO}}>{r.p}</div>
                    <div style={{background:`${T.IN}14`,color:T.IN,border:`1px solid ${T.IN}28`,
                      borderRadius:99,padding:'2px 8px',fontSize:10,fontWeight:700,marginTop:4}}>{r.m}%</div>
                  </div>
                </div>
              ))}
              <div style={{background:T.bg2,borderRadius:11,padding:'9px 13px',marginTop:4,fontSize:11,color:T.ink4,lineHeight:1.6,border:`1px solid ${T.bdr}`}}>
                Online prices are AI-estimated. Actual prices vary by store and date.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Product detail overlay */}
      {sel&&(
        <div style={{position:'fixed',inset:0,background:T.modalBg,zIndex:600,display:'flex',alignItems:'flex-end',justifyContent:'center',backdropFilter:'blur(6px)'}}>
          <div className="su" style={{background:T.surf,borderRadius:'22px 22px 0 0',width:'100%',maxWidth:480,padding:'20px',border:`1px solid ${T.bdr}`,borderBottom:'none',maxHeight:'70vh',overflowY:'auto'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
              <div style={{fontWeight:800,color:T.ink,fontSize:17,fontFamily:HEAD}}>{sel.name}</div>
              <button onClick={()=>setSel(null)} style={{background:T.bg2,border:`1px solid ${T.bdr}`,borderRadius:9,width:30,height:30,cursor:'pointer',color:T.ink3,fontSize:14,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
            </div>
            <div style={{display:'flex',gap:14,alignItems:'center',marginBottom:16}}>
              <Av p={sel} size={64} r={16}/>
              <div style={{flex:1}}>
                <div style={{fontSize:12,color:T.ink3}}>{sel.company} · {sel.unit}</div>
                <div style={{marginTop:6}}><ExpiryBadge date={sel.expire}/></div>
                <div style={{fontSize:12,color:T.ok,marginTop:4,fontWeight:600}}>In stock: {sel.qty} units</div>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:14}}>
              {[[fm(cv(sel.buy,sel.cur,cur),cur),'Buy',T.P],[fm(cv(sel.sell,sel.cur,cur),cur),'Sell',T.IN],[`+${(((sel.sell-sel.buy)/sel.buy)*100).toFixed(1)}%`,'Margin',T.ok]].map(([v,l,c])=>(
                <div key={l} style={{background:T.bg2,borderRadius:12,padding:'11px 6px',textAlign:'center',border:`1.5px solid ${c}18`}}>
                  <div style={{fontSize:13,fontWeight:800,color:c,fontFamily:MONO}}>{v}</div>
                  <div style={{fontSize:9,color:T.ink4,marginTop:2,fontWeight:700,textTransform:'uppercase'}}>{l}</div>
                </div>
              ))}
            </div>
            <Btn full v="ghost" onClick={()=>setSel(null)}>Close</Btn>
          </div>
        </div>
      )}
    </div>
  );

  // ── IDLE HOME ──────────────────────────────────────────────
  return(
    <div style={{padding:'20px 16px 100px',fontFamily:BODY}}>
      <h2 style={{fontSize:22,fontWeight:800,color:T.ink,fontFamily:HEAD,marginBottom:3,letterSpacing:-.4}}>Smart Lens</h2>
      <p style={{color:T.ink3,fontSize:13,marginBottom:20}}>AI-powered product search — like Google Lens</p>

      {/* Big camera button */}
      <div onClick={()=>setMode('camera')} style={{background:T.PG,borderRadius:22,padding:'32px 24px',
        textAlign:'center',cursor:'pointer',marginBottom:16,position:'relative',overflow:'hidden',
        boxShadow:`0 12px 40px ${T.P}25`,transition:'transform .18s'}}
        onMouseOver={e=>e.currentTarget.style.transform='translateY(-2px)'}
        onMouseOut={e=>e.currentTarget.style.transform='translateY(0)'}>
        <div style={{position:'absolute',top:-30,right:-30,width:120,height:120,borderRadius:'50%',background:'rgba(255,255,255,.08)'}}/>
        <div style={{fontSize:48,marginBottom:10}}>📷</div>
        <div style={{fontSize:17,fontWeight:800,color:'#fff',fontFamily:HEAD,marginBottom:4}}>Open Camera</div>
        <div style={{fontSize:13,color:'rgba(255,255,255,.7)'}}>Point at any product to identify it</div>
        <div style={{marginTop:14,display:'inline-flex',alignItems:'center',gap:6,background:'rgba(255,255,255,.15)',
          borderRadius:99,padding:'6px 14px',backdropFilter:'blur(10px)'}}>
          <span style={{fontSize:11,color:'rgba(255,255,255,.9)',fontWeight:600}}>Powered by Claude Vision AI</span>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:20}}>
        {/* Upload */}
        <div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{display:'none'}} id="lens_idle_file"/>
          <label htmlFor="lens_idle_file" style={{display:'flex',flexDirection:'column',alignItems:'center',
            justifyContent:'center',height:100,background:T.surf,border:`1.5px solid ${T.bdr}`,borderRadius:18,
            cursor:'pointer',gap:6,transition:'all .18s'}}
            onMouseOver={e=>{e.currentTarget.style.borderColor=T.A;e.currentTarget.style.transform='translateY(-2px)';}}
            onMouseOut={e=>{e.currentTarget.style.borderColor=T.bdr;e.currentTarget.style.transform='translateY(0)';}}>
            <span style={{fontSize:28}}>🖼️</span>
            <span style={{fontSize:12,fontWeight:700,color:T.ink3,fontFamily:HEAD}}>Upload Photo</span>
          </label>
        </div>
        {/* Text search */}
        <div style={{background:T.surf,border:`1.5px solid ${T.bdr}`,borderRadius:18,padding:'12px',display:'flex',flexDirection:'column',gap:8}}>
          <input value={textQ} onChange={e=>setTextQ(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&textSearch()}
            placeholder="Type product name..."
            style={{background:T.bg2,border:`1px solid ${T.bdr}`,borderRadius:9,padding:'8px 10px',
              color:T.ink,fontSize:12,outline:'none',fontFamily:BODY,caretColor:T.P}}
            onFocus={e=>e.target.style.borderColor=`${T.P}66`}
            onBlur={e=>e.target.style.borderColor=T.bdr}/>
          <Btn onClick={textSearch} sx={{padding:'8px',borderRadius:9,fontSize:12,fontFamily:HEAD}}>Search 🔍</Btn>
        </div>
      </div>

      {/* Features */}
      <div style={{background:T.surf,borderRadius:18,padding:18,border:`1px solid ${T.bdr}`}}>
        <div style={{fontWeight:700,color:T.ink,fontSize:13,fontFamily:HEAD,marginBottom:12}}>How it works</div>
        {[['🤖','AI reads the label','Identifies product name, brand, and size'],
          ['📦','Searches your inventory','Finds matches in your stock instantly'],
          ['💰','Compares online prices','Shows prices from Amazon, Carrefour & more'],
          ['📊','Match percentage','Shows how confident the AI is']
        ].map(([ic,t,s])=>(
          <div key={t} style={{display:'flex',gap:12,alignItems:'flex-start',marginBottom:12}}>
            <div style={{width:36,height:36,borderRadius:10,background:T.bg2,display:'flex',alignItems:'center',
              justifyContent:'center',fontSize:18,flexShrink:0,border:`1px solid ${T.bdr}`}}>{ic}</div>
            <div>
              <div style={{fontWeight:600,color:T.ink,fontSize:13}}>{t}</div>
              <div style={{fontSize:11,color:T.ink4,marginTop:2}}>{s}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CAMERA WITH SCAN (for Lens) ─────────────────────────────────
function CameraWithScan({onCapture,onClose,push}){
  const T=useT();
  const vidRef=useRef(),canRef=useRef(),streamRef=useRef();
  const [status,setStatus]=useState('starting');
  const [flash,setFlash]=useState(false);

  useEffect(()=>{
    let alive=true;
    navigator.mediaDevices?.getUserMedia({video:{facingMode:'environment',width:{ideal:1920}}})
      .then(s=>{
        if(!alive){s.getTracks().forEach(t=>t.stop());return;}
        streamRef.current=s;
        if(vidRef.current){vidRef.current.srcObject=s;vidRef.current.play();}
        setStatus('ready');
      })
      .catch(()=>{if(alive)setStatus('error');});
    return()=>{alive=false;streamRef.current?.getTracks().forEach(t=>t.stop());};
  },[]);

  const capture=()=>{
    const v=vidRef.current,c=canRef.current;
    if(!v||!c)return;
    c.width=v.videoWidth;c.height=v.videoHeight;
    c.getContext('2d').drawImage(v,0,0);
    setFlash(true);
    setTimeout(()=>setFlash(false),200);
    const url=c.toDataURL('image/jpeg',.92);
    streamRef.current?.getTracks().forEach(t=>t.stop());
    onCapture(url);
  };

  if(status==='error') return(
    <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',color:'#fff',gap:16,padding:32,textAlign:'center'}}>
      <div style={{fontSize:52}}>📷</div>
      <div style={{fontWeight:700,fontSize:16}}>Camera access needed</div>
      <div style={{fontSize:13,color:'rgba(255,255,255,.6)',maxWidth:260,lineHeight:1.7}}>Please allow camera access in your browser settings, then refresh.</div>
      <Btn v="ghost" onClick={onClose} sx={{color:'#fff',borderColor:'rgba(255,255,255,.3)'}}>Go Back</Btn>
    </div>
  );

  return(
    <div style={{flex:1,position:'relative',overflow:'hidden',display:'flex',flexDirection:'column'}}>
      {/* Flash effect */}
      {flash&&<div style={{position:'absolute',inset:0,background:'#fff',zIndex:10,opacity:.8}}/>}

      <div style={{flex:1,position:'relative',overflow:'hidden'}}>
        {status==='starting'&&<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}><Spinner size={40} color="#fff"/></div>}
        <video ref={vidRef} playsInline muted style={{width:'100%',height:'100%',objectFit:'cover',display:status==='ready'?'block':'none'}}/>
        <canvas ref={canRef} style={{display:'none'}}/>

        {status==='ready'&&(
          <>
            {/* Dark corners vignette */}
            <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at center,transparent 40%,rgba(0,0,0,.5) 100%)',pointerEvents:'none'}}/>

            {/* Scan frame */}
            <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
              <div style={{width:'75%',maxWidth:300,aspectRatio:'1',position:'relative'}}>
                {/* Animated scan line */}
                <div style={{position:'absolute',left:0,right:0,height:2,
                  background:'linear-gradient(90deg,transparent,#D95F3B,#E8754F,#D95F3B,transparent)',
                  animation:'beam 2s ease-in-out infinite',boxShadow:'0 0 8px #D95F3B'}}/>
                {/* Corner brackets */}
                {[[{top:0,left:0},{borderTop:'3px solid #fff',borderLeft:'3px solid #fff',borderRadius:'4px 0 0 0'}],
                  [{top:0,right:0},{borderTop:'3px solid #fff',borderRight:'3px solid #fff',borderRadius:'0 4px 0 0'}],
                  [{bottom:0,left:0},{borderBottom:'3px solid #fff',borderLeft:'3px solid #fff',borderRadius:'0 0 0 4px'}],
                  [{bottom:0,right:0},{borderBottom:'3px solid #fff',borderRight:'3px solid #fff',borderRadius:'0 0 4px 0'}],
                ].map(([pos,bdr],i)=><div key={i} style={{position:'absolute',width:28,height:28,...pos,...bdr}}/>)}
              </div>
            </div>
            {/* Hint text */}
            <div style={{position:'absolute',bottom:100,left:0,right:0,textAlign:'center',pointerEvents:'none'}}>
              <div style={{display:'inline-block',background:'rgba(0,0,0,.55)',borderRadius:99,padding:'6px 16px',backdropFilter:'blur(8px)'}}>
                <span style={{color:'rgba(255,255,255,.9)',fontSize:13}}>Point at product label</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom controls */}
      {status==='ready'&&(
        <div style={{padding:'20px 32px 28px',display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.7)',gap:32}}>
          <button onClick={onClose} style={{width:44,height:44,borderRadius:'50%',background:'rgba(255,255,255,.15)',border:'none',color:'#fff',cursor:'pointer',fontSize:20,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
          {/* Shutter button */}
          <button onClick={capture} style={{width:72,height:72,borderRadius:'50%',background:'rgba(255,255,255,.2)',
            border:'4px solid rgba(255,255,255,.8)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',
            transition:'transform .15s'}}
            onMouseDown={e=>e.currentTarget.style.transform='scale(.93)'}
            onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}>
            <div style={{width:54,height:54,borderRadius:'50%',background:'#fff'}}/>
          </button>
          <div style={{width:44,height:44}}/>
        </div>
      )}
    </div>
  );
}


// ─── ORDERS ──────────────────────────────────────────────────────
function Orders({products,push}){
  const T=useT();
  const userEmail=lsG(SK)?.email||'guest';
  const OK=e=>'sh4_o_'+e;
  const [orders,setOrders]=useState(()=>lsG(OK(userEmail),[]));
  const saveOrders=o=>{setOrders(o);lsS(OK(userEmail),o);};
  const [showAdd,setShowAdd]=useState(false);
  const [showCam,setShowCam]=useState(false);
  const [nf,setNf]=useState({name:'',company:'',icon:'📦',qty:'',unit:'',urgent:false,note:'',photo:null});
  const sn=(k,v)=>setNf(p=>({...p,[k]:v}));
  const fileRef=useRef();
  const lowStock=products.filter(p=>p.qty!==undefined&&p.qty<10);

  const handleFile=async e=>{
    const file=e.target.files?.[0]; if(!file)return;
    try{const c=await compress(file);sn('photo',c);}catch{push('Image failed','error');}
    e.target.value='';
  };
  const camCapture=url=>{setShowCam(false);sn('photo',url);push('Photo added!','success');};

  const addOrder=()=>{
    if(!nf.name){push('Enter product name','warn');return;}
    saveOrders([{...nf,id:'o'+Date.now()},...orders]);
    setNf({name:'',company:'',icon:'📦',qty:'',unit:'',urgent:false,note:'',photo:null});
    setShowAdd(false);push('Added to order list!','success');
  };

  if(showCam) return <Camera mode="photo" onCapture={camCapture} onClose={()=>setShowCam(false)}/>;

  return(
    <div style={{paddingBottom:100}}>
      <div style={{padding:'20px 16px 0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <h2 style={{fontSize:22,fontWeight:800,color:T.ink,fontFamily:HEAD,letterSpacing:-.4}}>To Order</h2>
          <p style={{color:T.ink3,fontSize:12,marginTop:2}}>{orders.length} items pending</p>
        </div>
        <Btn sm onClick={()=>setShowAdd(true)} sx={{fontFamily:HEAD}}>+ Add</Btn>
      </div>

      {lowStock.length>0&&(
        <div style={{margin:'14px 16px 0',background:`${T.danger}08`,border:`1.5px solid ${T.danger}28`,borderRadius:16,padding:'14px 15px'}}>
          <div style={{fontSize:10,fontWeight:700,color:T.danger,marginBottom:10,letterSpacing:.5}}>⚠️ LOW STOCK DETECTED</div>
          {lowStock.map(p=>(
            <div key={p.id} style={{display:'flex',alignItems:'center',gap:10,marginBottom:7}}>
              <Av p={p} size={30} r={8}/>
              <div style={{flex:1,fontSize:13,color:T.ink,fontWeight:600}}>{p.name}</div>
              <span style={{background:`${T.danger}0e`,color:T.danger,border:`1px solid ${T.danger}28`,borderRadius:99,padding:'2px 9px',fontSize:10,fontWeight:700}}>{p.qty} left</span>
            </div>
          ))}
        </div>
      )}

      <div style={{padding:'12px 16px 0'}}>
        {orders.length===0
          ?<div style={{textAlign:'center',padding:60,color:T.ink4}}><div style={{fontSize:48}}>✅</div>
            <div style={{marginTop:10,fontWeight:600,fontFamily:HEAD,color:T.ink3}}>Order list clear!</div></div>
          :orders.map(o=>(
            <div key={o.id} style={{background:T.surf,border:`1.5px solid ${o.urgent?`${T.danger}44`:T.bdr}`,
              borderRadius:18,padding:'13px 14px',marginBottom:9,boxShadow:T.shadow}}>
              <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
                {/* Photo or icon */}
                <div style={{width:48,height:48,borderRadius:14,background:T.bg2,border:`1.5px solid ${T.bdr}`,
                  display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0,overflow:'hidden'}}>
                  {o.photo?<img src={o.photo} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:o.icon}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,color:T.ink,fontSize:14,fontFamily:HEAD}}>{o.name}</div>
                  <div style={{fontSize:11,color:T.ink4,marginTop:1}}>{o.company} · {o.qty} {o.unit}</div>
                  {o.note&&<div style={{fontSize:11,color:T.warn,marginTop:3}}>{o.note}</div>}
                </div>
                <div style={{display:'flex',gap:6,flexShrink:0}}>
                  <button onClick={()=>saveOrders(orders.map(x=>x.id===o.id?{...x,urgent:!x.urgent}:x))}
                    style={{background:o.urgent?`${T.danger}0e`:T.bg2,border:`1.5px solid ${o.urgent?`${T.danger}44`:T.bdr}`,
                      color:o.urgent?T.danger:T.ink4,borderRadius:9,padding:'5px 9px',fontSize:10,cursor:'pointer',fontWeight:700}}>Urgent</button>
                  <button onClick={()=>saveOrders(orders.filter(x=>x.id!==o.id))}
                    style={{background:T.bg2,border:`1.5px solid ${T.bdr}`,color:T.ink4,borderRadius:9,padding:'5px 9px',fontSize:12,cursor:'pointer'}}>✕</button>
                </div>
              </div>
            </div>
          ))}
      </div>

      {showAdd&&(
        <Sheet title="Add to Order List" onClose={()=>setShowAdd(false)}>
          {/* Photo upload for order item */}
          <label style={{display:'block',fontSize:11,fontWeight:600,color:T.ink3,letterSpacing:.8,textTransform:'uppercase',marginBottom:9}}>Photo (Optional)</label>
          <div style={{display:'flex',gap:10,marginBottom:14}}>
            <div onClick={()=>setShowCam(true)} style={{width:76,height:76,borderRadius:14,overflow:'hidden',
              border:`2px dashed ${T.P}44`,cursor:'pointer',display:'flex',flexDirection:'column',
              alignItems:'center',justifyContent:'center',background:nf.photo?'transparent':`${T.P}06`,flexShrink:0}}>
              {nf.photo?<img src={nf.photo} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>
                :<><span style={{fontSize:22}}>📷</span><span style={{fontSize:9,color:T.P,fontWeight:700,marginTop:2}}>Camera</span></>}
            </div>
            <div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{display:'none'}} id="order_file"/>
              <label htmlFor="order_file" style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                width:76,height:76,borderRadius:14,background:T.bg2,border:`2px dashed ${T.bdr2}`,cursor:'pointer',gap:2}}>
                <span style={{fontSize:22}}>🖼️</span>
                <span style={{fontSize:9,color:T.ink3,fontWeight:700}}>Upload</span>
              </label>
            </div>
            {nf.photo&&<div onClick={()=>sn('photo',null)} style={{width:76,height:76,borderRadius:14,
              background:`${T.danger}08`,border:`2px dashed ${T.danger}33`,display:'flex',
              flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'pointer',gap:2}}>
              <span style={{fontSize:20}}>🗑️</span>
              <span style={{fontSize:9,color:T.danger,fontWeight:700}}>Remove</span>
            </div>}
          </div>

          <Field label="Product Name" icon="🏷️" placeholder="e.g. Sunflower Oil" value={nf.name} onChange={e=>sn('name',e.target.value)}/>
          <Field label="Company" icon="🏢" placeholder="Supplier name" value={nf.company} onChange={e=>sn('company',e.target.value)}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <Field label="Qty Needed" type="number" placeholder="0" value={nf.qty} onChange={e=>sn('qty',e.target.value)}/>
            <Field label="Unit" placeholder="bags, bottles..." value={nf.unit} onChange={e=>sn('unit',e.target.value)}/>
          </div>
          <Field label="Notes" placeholder="e.g. Out of stock" value={nf.note} onChange={e=>sn('note',e.target.value)}/>
          <div onClick={()=>sn('urgent',!nf.urgent)} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',
            background:T.bg2,borderRadius:13,border:`1.5px solid ${nf.urgent?`${T.danger}44`:T.bdr}`,cursor:'pointer',marginBottom:16}}>
            <div style={{width:22,height:22,borderRadius:7,background:nf.urgent?T.danger:T.surf,
              border:`2px solid ${nf.urgent?T.danger:T.bdr2}`,display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s'}}>
              {nf.urgent&&<span style={{color:'#fff',fontSize:13,fontWeight:900}}>✓</span>}
            </div>
            <span style={{color:nf.urgent?T.danger:T.ink3,fontWeight:700,fontSize:13}}>Mark as Urgent</span>
          </div>
          <Btn full onClick={addOrder} sx={{fontFamily:HEAD}}>Add to List</Btn>
        </Sheet>
      )}
    </div>
  );
}

// ─── ANALYTICS ───────────────────────────────────────────────────
function Analytics({products,cur}){
  const T=useT();
  const tv=products.reduce((s,p)=>s+cv(p.buy,p.cur||'BDT',cur)*(p.qty||0),0);
  const ts=products.reduce((s,p)=>s+cv(p.sell,p.cur||'BDT',cur)*(p.qty||0),0);
  const pr=ts-tv;
  const cats=CATS.filter(c=>c!=='All').map(c=>({n:c,count:products.filter(p=>p.cat===c).length})).filter(c=>c.count>0).sort((a,b)=>b.count-a.count);
  const top=[...products].sort((a,b)=>((b.sell-b.buy)/b.buy)-((a.sell-a.buy)/a.buy)).slice(0,5);

  return(
    <div style={{padding:'20px 16px 100px'}}>
      <h2 style={{fontSize:22,fontWeight:800,color:T.ink,fontFamily:HEAD,marginBottom:18,letterSpacing:-.4}}>Analytics</h2>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
        {[[fm(tv,cur),'Investment',T.IN,'💵'],[fm(ts,cur),'Sell Value',T.P,'💰'],
          [fm(pr,cur),'Profit',pr>=0?T.ok:T.danger,'📈'],
          [String(products.filter(p=>{const d=dLeft(p.expire);return d>=0&&d<=30;}).length),'Expiring',T.warn,'⏱️']
        ].map(([v,l,col,ic])=>(
          <div key={l} style={{background:T.surf,borderRadius:18,padding:'15px',border:`1.5px solid ${T.bdr}`,boxShadow:T.shadow}}>
            <div style={{fontSize:20,marginBottom:7}}>{ic}</div>
            <div style={{fontSize:16,fontWeight:800,color:col,fontFamily:MONO,letterSpacing:-.4}}>{v}</div>
            <div style={{fontSize:10,color:T.ink4,fontWeight:700,marginTop:3,textTransform:'uppercase',letterSpacing:.8}}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{background:T.surf,borderRadius:18,padding:18,marginBottom:12,border:`1.5px solid ${T.bdr}`}}>
        <div style={{fontWeight:700,color:T.ink,marginBottom:14,fontSize:14,fontFamily:HEAD}}>By Category</div>
        {cats.map(c=>(
          <div key={c.n} style={{marginBottom:10}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
              <span style={{fontSize:12,color:T.ink,fontWeight:600}}>{CE[c.n]} {c.n}</span>
              <span style={{fontSize:12,color:T.ink4,fontFamily:MONO}}>{c.count}</span>
            </div>
            <div style={{height:5,background:T.bg2,borderRadius:3,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${(c.count/products.length)*100}%`,background:T.PG,borderRadius:3,transition:'width .8s'}}/>
            </div>
          </div>
        ))}
      </div>
      <div style={{background:T.surf,borderRadius:18,padding:18,border:`1.5px solid ${T.bdr}`}}>
        <div style={{fontWeight:700,color:T.ink,marginBottom:14,fontSize:14,fontFamily:HEAD}}>🏆 Top Margin Products</div>
        {top.map((p,i)=>(
          <div key={p.id} style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
            <div style={{width:27,height:27,borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:10,fontWeight:900,flexShrink:0,
              background:i===0?'linear-gradient(135deg,#FFD700,#FFA500)':i===1?'linear-gradient(135deg,#C0C0C0,#A0A0A0)':i===2?'linear-gradient(135deg,#CD7F32,#A06020)':T.bg2,
              border:`1.5px solid ${i===0?'#FFD700':i===1?'#C0C0C0':i===2?'#CD7F32':T.bdr}`,
              color:i<3?'#fff':T.ink4}}>#{i+1}</div>
            <Av p={p} size={32} r={9}/>
            <div style={{flex:1,fontSize:13,fontWeight:600,color:T.ink}}>{p.name}</div>
            <div style={{fontSize:13,fontWeight:800,color:T.ok,fontFamily:MONO}}>+{(((p.sell-p.buy)/p.buy)*100).toFixed(1)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TRASH ───────────────────────────────────────────────────────
function Trash({items,onRestore,onDel,onEmpty}){
  const T=useT();
  return(
    <div style={{padding:'20px 16px 100px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div><h2 style={{fontSize:22,fontWeight:800,color:T.ink,fontFamily:HEAD,letterSpacing:-.4}}>Trash</h2>
          <p style={{color:T.ink3,fontSize:12,marginTop:2}}>{items.length} deleted items</p></div>
        {items.length>0&&<Btn v="danger" sm onClick={onEmpty} sx={{fontFamily:HEAD}}>Empty All</Btn>}
      </div>
      {items.length===0
        ?<div style={{textAlign:'center',padding:'60px 20px',color:T.ink4}}>
          <div style={{fontSize:52}}>🗑️</div>
          <div style={{marginTop:12,fontWeight:700,fontSize:15,fontFamily:HEAD,color:T.ink3}}>Trash is empty</div>
        </div>
        :items.map(p=>(
          <div key={p.id} style={{background:T.surf,border:`1.5px solid ${T.bdr}`,borderRadius:16,padding:'12px 14px',marginBottom:8,display:'flex',alignItems:'center',gap:12}}>
            <Av p={p} size={44} r={12}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:600,color:T.ink2,fontSize:13}}>{p.name}</div>
              <div style={{color:T.ink4,fontSize:11,marginTop:1}}>Deleted · {p.cat}</div>
            </div>
            <div style={{display:'flex',gap:7}}>
              <button onClick={()=>onRestore(p.id)} style={{background:`${T.ok}0e`,border:`1px solid ${T.ok}28`,color:T.ok,borderRadius:9,padding:'5px 11px',fontSize:11,fontWeight:600,cursor:'pointer'}}>Restore</button>
              <button onClick={()=>onDel(p.id)} style={{background:`${T.danger}08`,border:`1px solid ${T.danger}28`,color:T.danger,borderRadius:9,padding:'5px 11px',fontSize:11,fontWeight:600,cursor:'pointer'}}>Delete</button>
            </div>
          </div>
        ))}
    </div>
  );
}

// ─── INSTALL APP ─────────────────────────────────────────────────
function InstallApp({onClose}){
  const T=useT();
  const [platform,setPlatform]=useState(()=>{
    const ua=navigator.userAgent;
    if(/iPhone|iPad/.test(ua)) return 'ios';
    if(/Android/.test(ua)) return 'android';
    return 'desktop';
  });
  const [deferredPrompt,setDeferredPrompt]=useState(null);
  const [installed,setInstalled]=useState(false);

  useEffect(()=>{
    const h=e=>{e.preventDefault();setDeferredPrompt(e);};
    window.addEventListener('beforeinstallprompt',h);
    return()=>window.removeEventListener('beforeinstallprompt',h);
  },[]);

  const doInstall=async()=>{
    if(!deferredPrompt)return;
    deferredPrompt.prompt();
    const r=await deferredPrompt.userChoice;
    if(r.outcome==='accepted') setInstalled(true);
    setDeferredPrompt(null);
  };

  const steps={
    ios:['Open Shelfie in Safari browser (must be Safari)','Tap the Share ⬆️ button at the bottom of screen','Scroll down and tap "Add to Home Screen"','Tap "Add" — Shelfie icon appears!'],
    android:['Open Shelfie in Chrome browser','Tap the ⋮ menu in the top right corner','Tap "Add to Home screen"','Tap "Add" — Shelfie icon appears!'],
    desktop:['Open Shelfie in Chrome browser','Look for the install ⊕ icon in the address bar (right side)','Click "Install Shelfie"','App opens in its own window — no browser bars!'],
  };

  return(
    <Sheet title="Install Shelfie App" sub="Add to your home screen" onClose={onClose}>
      {installed?(
        <div style={{textAlign:'center',padding:'20px 0'}}>
          <div style={{fontSize:52,marginBottom:14}}>🎉</div>
          <div style={{fontWeight:800,color:T.ink,fontSize:18,fontFamily:HEAD,marginBottom:6}}>Installed!</div>
          <div style={{color:T.ink3,fontSize:13,marginBottom:20}}>Shelfie is now on your home screen</div>
          <Btn full onClick={onClose} sx={{fontFamily:HEAD}}>Done</Btn>
        </div>
      ):(
        <>
          <div style={{display:'flex',background:T.bg2,borderRadius:12,padding:3,marginBottom:18,border:`1px solid ${T.bdr}`}}>
            {['ios','android','desktop'].map(p=>(
              <div key={p} onClick={()=>setPlatform(p)} style={{flex:1,padding:'8px 4px',borderRadius:10,textAlign:'center',
                cursor:'pointer',transition:'all .17s',fontSize:12,fontWeight:platform===p?700:500,
                color:platform===p?T.ink:T.ink3,background:platform===p?T.surf:'transparent',
                boxShadow:platform===p?T.shadow:'none'}}>
                {p==='ios'?'📱 iPhone':p==='android'?'🤖 Android':'💻 Desktop'}
              </div>
            ))}
          </div>
          {(platform==='android'||platform==='desktop')&&deferredPrompt&&(
            <div style={{background:`${T.P}0d`,border:`1.5px solid ${T.P}28`,borderRadius:14,padding:14,marginBottom:16,display:'flex',alignItems:'center',gap:12}}>
              <div style={{fontSize:28}}>✨</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,color:T.ink,fontSize:13,fontFamily:HEAD}}>One-tap install available!</div>
                <div style={{fontSize:11,color:T.ink3,marginTop:1}}>Browser detected Shelfie can be installed</div>
              </div>
              <Btn sm onClick={doInstall} sx={{fontFamily:HEAD,flexShrink:0}}>Install</Btn>
            </div>
          )}
          <div style={{marginBottom:16}}>
            {steps[platform].map((s,i)=>(
              <div key={i} style={{display:'flex',gap:13,marginBottom:13}}>
                <div style={{width:28,height:28,borderRadius:'50%',background:T.PG,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:'#fff',flexShrink:0}}>{i+1}</div>
                <div style={{paddingTop:4,fontSize:13,color:T.ink,lineHeight:1.6}}>{s}</div>
              </div>
            ))}
          </div>
          <div style={{background:`${T.A}0a`,border:`1px solid ${T.A}28`,borderRadius:11,padding:'11px 13px',fontSize:12,color:T.A,lineHeight:1.7,marginBottom:14}}>
            Once installed, Shelfie opens full screen with no browser bar — looks and feels like a native app.
          </div>
          <Btn full v="ghost" onClick={onClose} sx={{fontFamily:HEAD}}>Close</Btn>
        </>
      )}
    </Sheet>
  );
}

// ─── PROFILE ─────────────────────────────────────────────────────
function Profile({user,onClose,onLogout,cur,onCur,push,themeMode,setThemeMode,onInstall,prods}){
  const T=useT();
  const jn=user.joined?new Date(user.joined).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'';
  const notif=async()=>{
    if(!('Notification' in window)){push('Not supported in this browser','warn');return;}
    const p=await Notification.requestPermission();
    if(p==='granted'){
      push('Notifications enabled!','success');
      lsS('sh4_notif','granted');
      // Test notification
      setTimeout(()=>{
        try{
          const soon=(prods||[]).filter(prod=>{const d=dLeft(prod.expire);return d>=0&&d<=3;});
          if(soon.length>0){
            new Notification('Shelfie Expiry Alert',{
              body:soon.map(p=>p.name+' expires in '+dLeft(p.expire)+'d').join(' · '),
              icon:'/icon-192.png',tag:'shelfie-expiry',requireInteraction:true
            });
          } else {
            new Notification('Shelfie is ready',{body:'Expiry alerts are active! No products expiring soon.',icon:'/icon-192.png'});
          }
        }catch(e){console.warn('Notification error:',e);}
      },800);
    } else {
      push('Permission denied. Open browser settings and allow notifications for this site.','error');
    }
  };

  return(
    <Sheet title="My Account" onClose={onClose}>
      {/* Avatar */}
      <div style={{textAlign:'center',marginBottom:22}}>
        <div style={{position:'relative',display:'inline-block',marginBottom:12}}>
          {user.photoURL
            ?<img src={user.photoURL} alt="" style={{width:76,height:76,borderRadius:'50%',objectFit:'cover',
                boxShadow:`0 0 0 4px ${T.bg},0 0 0 7px ${T.P}28`,border:`2px solid ${T.bdr}`}}/>
            :<div style={{width:76,height:76,borderRadius:'50%',background:T.PG,display:'flex',alignItems:'center',
                justifyContent:'center',fontSize:28,fontWeight:900,color:'#fff',
                boxShadow:`0 0 0 4px ${T.bg},0 0 0 7px ${T.P}28`,fontFamily:HEAD}}>
                {((user.name||'U')[0]||'U').toUpperCase()}
              </div>}
          <div style={{position:'absolute',bottom:2,right:2,width:20,height:20,borderRadius:'50%',
            background:T.ok,border:`2px solid ${T.surf}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:'#fff',fontWeight:900}}>✓</div>
        </div>
        <div style={{fontSize:19,fontWeight:800,color:T.ink,fontFamily:HEAD,letterSpacing:-.3}}>{user.name||'User'}</div>
        <div style={{fontSize:13,color:T.ink3,marginTop:2}}>{user.email}</div>
        {jn&&<div style={{fontSize:11,color:T.ink4,marginTop:3}}>Member since {jn}</div>}
      </div>

      {/* Download App */}
      <div onClick={()=>{onClose();onInstall();}} style={{background:`linear-gradient(135deg,${T.P}14,${T.P}06)`,
        border:`1.5px solid ${T.P}33`,borderRadius:16,padding:'14px 16px',marginBottom:12,
        display:'flex',alignItems:'center',gap:12,cursor:'pointer',transition:'all .18s'}}
        onMouseOver={e=>e.currentTarget.style.background=`linear-gradient(135deg,${T.P}22,${T.P}0a)`}
        onMouseOut={e=>e.currentTarget.style.background=`linear-gradient(135deg,${T.P}14,${T.P}06)`}>
        <div style={{width:42,height:42,borderRadius:13,background:T.PG,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>📲</div>
        <div style={{flex:1}}>
          <div style={{fontWeight:700,color:T.ink,fontSize:14,fontFamily:HEAD}}>Download App</div>
          <div style={{fontSize:11,color:T.ink3,marginTop:1}}>Add Shelfie to your home screen</div>
        </div>
        <span style={{color:T.ink4,fontSize:15}}>›</span>
      </div>

      {/* Appearance */}
      <div style={{background:T.bg2,borderRadius:16,padding:'14px 16px',marginBottom:12,border:`1.5px solid ${T.bdr}`}}>
        <div style={{fontSize:10,fontWeight:700,color:T.ink3,letterSpacing:1,textTransform:'uppercase',marginBottom:11}}>Appearance</div>
        <div style={{display:'flex',background:T.bg3,borderRadius:12,padding:3,border:`1px solid ${T.bdr}`}}>
          {[{id:'system',label:'System',icon:'💻'},{id:'light',label:'Light',icon:'☀️'},{id:'dark',label:'Dark',icon:'🌙'}].map(opt=>(
            <div key={opt.id} onClick={()=>setThemeMode(opt.id)} style={{flex:1,padding:'9px 5px',borderRadius:10,
              textAlign:'center',cursor:'pointer',transition:'all .17s',
              background:themeMode===opt.id?T.surf:'transparent',
              boxShadow:themeMode===opt.id?T.shadow:'none'}}>
              <div style={{fontSize:16,marginBottom:2}}>{opt.icon}</div>
              <div style={{fontSize:10,fontWeight:700,color:themeMode===opt.id?T.ink:T.ink4}}>{opt.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div style={{background:`${T.P}08`,border:`1.5px solid ${T.P}28`,borderRadius:16,padding:'14px 16px',marginBottom:12}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontWeight:700,color:T.ink,fontSize:14,fontFamily:HEAD}}>🔔 Push Notifications</div>
            <div style={{fontSize:11,color:T.ink3,marginTop:2}}>Lock screen expiry alerts</div>
          </div>
          <Btn sm onClick={notif} sx={{fontFamily:HEAD}}>Enable</Btn>
        </div>
      </div>

      {/* Currency */}
      <div style={{background:T.bg2,borderRadius:16,padding:'14px 16px',marginBottom:12,border:`1.5px solid ${T.bdr}`}}>
        <div style={{fontSize:10,fontWeight:700,color:T.ink3,letterSpacing:1,textTransform:'uppercase',marginBottom:11}}>Currency</div>
        <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
          {CURR.slice(0,6).map(c=>(
            <div key={c.code} onClick={()=>{onCur(c.code);onClose();}} style={{padding:'6px 12px',borderRadius:99,fontSize:11,
              fontWeight:700,cursor:'pointer',transition:'all .15s',
              background:cur===c.code?T.P:T.surf,color:cur===c.code?'#fff':T.ink3,
              border:`1.5px solid ${cur===c.code?T.P:T.bdr}`}}>{c.code}</div>
          ))}
          <div onClick={()=>{onCur('more');onClose();}} style={{padding:'6px 12px',borderRadius:99,fontSize:11,
            fontWeight:700,cursor:'pointer',background:'transparent',color:T.ink4,border:`1.5px solid ${T.bdr}`}}>More...</div>
        </div>
      </div>

      <Btn full v="danger" onClick={onLogout} sx={{fontFamily:HEAD,marginTop:4}}>Sign Out</Btn>
    </Sheet>
  );
}

// ─── CURRENCY PICKER ─────────────────────────────────────────────
function CurrencyPicker({cur,onChange,onClose}){
  const T=useT();
  return(
    <Sheet title="Select Currency" onClose={onClose}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
        {CURR.map(c=>(
          <div key={c.code} onClick={()=>{onChange(c.code);onClose();}}
            style={{background:cur===c.code?`${T.P}0d`:T.bg2,border:`1.5px solid ${cur===c.code?T.P:T.bdr}`,
              borderRadius:13,padding:'12px 14px',cursor:'pointer',transition:'all .15s',
              display:'flex',alignItems:'center',gap:10}}
            onMouseOver={e=>e.currentTarget.style.borderColor=`${T.P}55`}
            onMouseOut={e=>e.currentTarget.style.borderColor=cur===c.code?T.P:T.bdr}>
            <div>
              <div style={{fontWeight:700,color:cur===c.code?T.P:T.ink,fontSize:13}}>{c.code}</div>
              <div style={{fontSize:10,color:T.ink4,marginTop:1}}>{c.sym} · {c.name.split(' ')[0]}</div>
            </div>
            {cur===c.code&&<div style={{marginLeft:'auto',color:T.P,fontWeight:900,fontSize:16}}>✓</div>}
          </div>
        ))}
      </div>
    </Sheet>
  );
}

// ─── ROOT APP ────────────────────────────────────────────────────
function App(){
  const [themeMode,setThemeMode]=useState(()=>lsG(THEMEK,'system'));
  const [isDark,setIsDark]=useState(false);
  const [user,setUser]=useState(null);
  const [prods,setProds]=useState(null); // null = not loaded yet
  const [dataReady,setDataReady]=useState(false);
  const [trash,setTrash]=useState([]);
  const [page,setPage]=useState('home');
  const [cur,setCur]=useState('EUR');
  const [showAdd,setShowAdd]=useState(false);
  const [showProfile,setShowProfile]=useState(false);
  const [showCurr,setShowCurr]=useState(false);
  const [showInstall,setShowInstall]=useState(false);
  const [expAlert,setExpAlert]=useState(null);
  const [booting,setBooting]=useState(true);
  const {list:toasts,push}=useToasts();

  const T=isDark?DARK:LIGHT;

  // ── THEME ────────────────────────────────────────────────────
  useEffect(()=>{
    lsS(THEMEK,themeMode);
    const apply=dark=>{setIsDark(dark);document.body.style.background=dark?DARK.bg:LIGHT.bg;};
    if(themeMode==='system'){
      const mq=window.matchMedia('(prefers-color-scheme: dark)');
      apply(mq.matches);
      const h=e=>apply(e.matches);
      mq.addEventListener('change',h);
      return()=>mq.removeEventListener('change',h);
    } else apply(themeMode==='dark');
  },[themeMode]);

  // ── FIREBASE AUTH LISTENER ────────────────────────────────────
  useEffect(()=>{
    // Listen for Firebase auth state changes
    const unsub=onAuthStateChanged(fbAuth,async fbUser=>{
      if(fbUser){
        const userData={
          name:fbUser.displayName||fbUser.email?.split('@')[0]||'User',
          email:fbUser.email,
          uid:fbUser.uid,
          avatar:(fbUser.displayName||fbUser.email||'U')[0].toUpperCase(),
          photoURL:fbUser.photoURL||null,
          provider:fbUser.providerData?.[0]?.providerId||'email',
          joined:fbUser.metadata.creationTime||new Date().toISOString(),
        };
        lsS(SK,userData);
        setUser(userData);
        // Load data — Firestore first, localStorage fallback
        try{
          const [fbProds,fbSettings]=await Promise.all([dbLoadProds(fbUser.uid),dbLoadSettings(fbUser.uid)]);
          // Use Firestore data if it exists, otherwise localStorage, otherwise DEMO
          if(fbProds&&fbProds.length>0){
            setProds(fbProds);
          } else {
            const lsProds=lsG(DK(userData.email));
            setProds(lsProds&&lsProds.length>0?lsProds:DEMO);
          }
          if(fbSettings?.currency) setCur(fbSettings.currency);
          else{ const c=lsG(CK(userData.email)); if(c) setCur(c); }
          const t=lsG(TK(userData.email)); if(t) setTrash(t);
        }catch(e){
          console.warn('Firestore load failed, using localStorage:',e);
          const lsProds=lsG(DK(userData.email));
          setProds(lsProds&&lsProds.length>0?lsProds:DEMO);
        }
        // Mark data as ready — enables saves
        setDataReady(true);
      } else {
        // Try localStorage session
        const s=lsG(SK);
        if(s){
          setUser(s);
          const d=lsG(DK(s.email));
          setProds(d&&d.length>0?d:DEMO);
          const c=lsG(CK(s.email)); if(c) setCur(c);
          const t=lsG(TK(s.email)); if(t) setTrash(t);
          setDataReady(true);
        } else {
          setUser(null);
        }
      }
      setBooting(false);
    });
    return()=>unsub();
  },[]);

  // ── SAVE EFFECTS ──────────────────────────────────────────────
  useEffect(()=>{
    // CRITICAL: Only save AFTER data is loaded — never save null/DEMO over real data
    if(!user||!dataReady||prods===null)return;
    lsS(DK(user.email),prods);
    if(user.uid){
      const t=setTimeout(()=>dbSaveProds(user.uid,prods).catch(e=>console.warn('Save failed:',e)),2500);
      return()=>clearTimeout(t);
    }
  },[prods,user,dataReady]);
  useEffect(()=>{
    if(!user)return;
    lsS(CK(user.email),cur);
    if(user.uid) dbSaveSettings(user.uid,{currency:cur}).catch(()=>{});
  },[cur,user]);
  useEffect(()=>{if(user)lsS(TK(user.email),trash);},[trash,user]);

  // ── EXPIRY ALERTS — only after data is fully loaded ─────────────
  useEffect(()=>{
    if(!user||!dataReady||prods===null)return;
    // Delay check so Firestore data (with expConf:true) has time to load
    const t=setTimeout(()=>{
      const e=prods.find(p=>dLeft(p.expire)<0&&!p.expConf);
      if(e&&(!expAlert||expAlert.id!==e.id)) setExpAlert(e);
    },1500);
    return()=>clearTimeout(t);
  },[prods,user,dataReady]);

  // ── NOTIFICATION BACKGROUND CHECK ──────────────────────────
  useEffect(()=>{
    if(!user||!dataReady||!prods)return;
    if(typeof Notification==='undefined'||Notification.permission!=='granted')return;
    const check=()=>{
      const today=(prods||[]).filter(p=>dLeft(p.expire)===0&&!p.expConf);
      const soon=(prods||[]).filter(p=>{const d=dLeft(p.expire);return d===1&&!p.expConf;});
      if(today.length>0){
        try{new Notification('Shelfie Expires TODAY',{body:today.map(p=>p.name).join(', '),icon:'/icon-192.png',tag:'today',requireInteraction:true});}catch{}
      } else if(soon.length>0){
        try{new Notification('Shelfie Expires Tomorrow',{body:soon.map(p=>p.name).join(', '),icon:'/icon-192.png',tag:'soon'});}catch{}
      }
    };
    check(); // check immediately on load
    const id=setInterval(check,60*60*1000); // check every hour
    return()=>clearInterval(id);
  },[user,dataReady,prods]);

  // ── HANDLERS ──────────────────────────────────────────────────
  const login=u=>{setUser(u);push('Welcome to Shelfie! 🎉','success');};

  const logout=async()=>{
    try{await signOut(fbAuth);localStorage.removeItem(SK);}catch{}
    setUser(null);setShowProfile(false);setPage('home');setProds(DEMO);setTrash([]);
  };

  const addProduct=(np,rid)=>{
    setDataReady(true); // ensure saves are enabled after first add
    setProds(prev=>{
      const current=prev||DEMO;
      const filtered=rid?current.filter(p=>p.id!==rid):current;
      const updated=[np,...filtered];
      if(user?.uid) dbSaveProds(user.uid,updated).catch(()=>{});
      return updated;
    });
    push(`${np.name} added!`,'success');
  };

  const moveToTrash=id=>{
    const p=prods.find(x=>x.id===id);
    if(p){setTrash(t=>[{...p,deletedAt:new Date().toISOString()},...t]);setProds(prev=>prev.filter(x=>x.id!==id));}
  };
  const restore=id=>{
    const p=trash.find(x=>x.id===id);
    if(p){setProds(prev=>[{...p,deletedAt:undefined},...prev]);setTrash(t=>t.filter(x=>x.id!==id));push('Restored!','success');}
  };

  // ── BOOT SPLASH ───────────────────────────────────────────────
  if(booting) return(
    <ThemeCtx.Provider value={T}>
      <div style={{minHeight:'100vh',background:T.bg,display:'flex',flexDirection:'column',
        alignItems:'center',justifyContent:'center',fontFamily:BODY}}>
        <div style={{marginBottom:20,animation:'floatY 3s ease-in-out infinite'}}><Logo size={74}/></div>
        <div style={{fontSize:34,fontWeight:900,letterSpacing:-1.5,fontFamily:HEAD,marginBottom:4}}>
          <span style={{color:T.ink}}>shelf</span><span style={{color:T.A}}>ie</span>
        </div>
        <div style={{fontSize:10,color:T.ink4,fontWeight:600,letterSpacing:3,textTransform:'uppercase',marginBottom:28}}>Pro Edition</div>
        <Spinner/>
      </div>
    </ThemeCtx.Provider>
  );

  if(!user) return(
    <ThemeCtx.Provider value={T}><Auth onLogin={login}/><Toasts list={toasts}/></ThemeCtx.Provider>
  );

  const NAV=[
    {id:'home',icon:'⊞',label:'Home'},
    {id:'inv',icon:'▤',label:'Stock'},
    {id:'lens',icon:'◉',label:'Lens',center:true},
    {id:'ord',icon:'✎',label:'Orders'},
    {id:'stats',icon:'◈',label:'Stats'},
  ];

  return(
    <ThemeCtx.Provider value={T}>
      <div style={{fontFamily:BODY,background:T.bg,minHeight:'100vh',color:T.ink,maxWidth:480,margin:'0 auto',position:'relative'}}>
        {/* Ambient bg */}
        <div style={{position:'fixed',top:0,left:0,right:0,height:'30vh',
          background:`radial-gradient(ellipse at 75% 0%,${T.A}07,transparent 55%),radial-gradient(ellipse at 20% 0%,${T.P}06,transparent 50%)`,
          pointerEvents:'none',zIndex:0,maxWidth:480,margin:'0 auto'}}/>

        {/* Page */}
        <div style={{position:'relative',zIndex:1}}>
          {page==='home'&&<Home products={prods||DEMO} user={user} cur={cur} onProfile={()=>setShowProfile(true)} onCur={()=>setShowCurr(true)} setPage={setPage} setAdd={setShowAdd}/>}
          {page==='inv'&&<Inventory products={prods||[]} cur={cur} onDel={moveToTrash} push={push}/>}
          {page==='lens'&&<SmartLens products={prods||[]} cur={cur} push={push}/>}
          {page==='ord'&&<Orders products={prods||[]} push={push}/>}
          {page==='stats'&&<Analytics products={prods||[]} cur={cur}/>}
          {page==='trash'&&<Trash items={trash} onRestore={restore} onDel={id=>setTrash(t=>t.filter(x=>x.id!==id))} onEmpty={()=>setTrash([])}/>}
        </div>

        {/* FAB */}
        <div onClick={()=>setShowAdd(true)} style={{position:'fixed',bottom:90,right:18,zIndex:300,
          width:52,height:52,borderRadius:'50%',background:T.PG,display:'flex',alignItems:'center',
          justifyContent:'center',fontSize:26,cursor:'pointer',color:'#fff',
          boxShadow:`0 6px 24px ${T.P}35`,transition:'transform .18s',fontWeight:800}}
          onMouseOver={e=>e.currentTarget.style.transform='scale(1.1)'}
          onMouseOut={e=>e.currentTarget.style.transform='scale(1)'}>+</div>

        {/* Trash FAB */}
        <div onClick={()=>setPage('trash')} style={{position:'fixed',bottom:90,left:18,zIndex:150,
          background:T.surf,border:`1.5px solid ${T.bdr}`,borderRadius:13,padding:'8px 13px',
          cursor:'pointer',display:'flex',alignItems:'center',gap:6,fontSize:12,color:T.ink3,
          fontWeight:600,boxShadow:T.shadow}}>
          🗑️ {trash.length>0&&<span style={{background:T.danger,color:'#fff',borderRadius:'50%',
            minWidth:18,height:18,padding:'0 4px',
            display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800}}>{trash.length}</span>}
        </div>

        {/* Bottom Nav */}
        <div style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:480,
          background:T.navBg,borderTop:`1px solid ${T.bdr}`,backdropFilter:'blur(24px)',
          zIndex:200,display:'flex',paddingBottom:'env(safe-area-inset-bottom)'}}>
          {NAV.map(n=>(
            <div key={n.id} onClick={()=>setPage(n.id)} style={{flex:1,display:'flex',flexDirection:'column',
              alignItems:'center',justifyContent:'center',
              padding:n.center?'4px 0 12px':'10px 0 12px',cursor:'pointer',position:'relative'}}>
              {n.center?(
                <div style={{width:54,height:54,borderRadius:'50%',marginTop:-22,background:T.AG,
                  display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,color:'#fff',
                  boxShadow:`0 6px 20px ${T.A}35`,border:`3px solid ${T.bg}`,transition:'transform .18s'}}
                  onMouseOver={e=>e.currentTarget.style.transform='scale(1.08)'}
                  onMouseOut={e=>e.currentTarget.style.transform='scale(1)'}>{n.icon}</div>
              ):(
                <>
                  <div style={{fontSize:17,marginBottom:3,color:page===n.id?T.P:T.ink4,transition:'color .18s'}}>{n.icon}</div>
                  <div style={{fontSize:9,fontWeight:700,letterSpacing:.5,textTransform:'uppercase',
                    color:page===n.id?T.P:T.ink4,transition:'color .18s'}}>{n.label}</div>
                  {page===n.id&&<div style={{position:'absolute',bottom:0,width:20,height:2.5,
                    background:T.PG,borderRadius:'2px 2px 0 0'}}/>}
                </>
              )}
            </div>
          ))}
        </div>

        <Toasts list={toasts}/>

        {/* Expiry alert modal */}
        {expAlert&&!expAlert.expConf&&(
          <div style={{position:'fixed',inset:0,background:T.modalBg,zIndex:800,
            display:'flex',alignItems:'center',justifyContent:'center',padding:24,backdropFilter:'blur(8px)'}}>
            <div className="pp" style={{background:T.surf,borderRadius:24,padding:28,width:'100%',maxWidth:360,
              boxShadow:T.shadowL,border:`1.5px solid ${T.bdr}`}}>
              <div style={{width:56,height:56,borderRadius:18,background:`${T.warn}12`,border:`1.5px solid ${T.warn}33`,
                display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,margin:'0 auto 16px'}}>📅</div>
              <div style={{textAlign:'center',marginBottom:20}}>
                <div style={{fontSize:17,fontWeight:800,color:T.ink,marginBottom:6,fontFamily:HEAD,letterSpacing:-.3}}>Product Expired</div>
                <div style={{fontSize:13,color:T.ink3,lineHeight:1.75}}>
                  <strong style={{color:T.ink}}>{expAlert.name}</strong> has passed its expiry date. Did you remove it from the shelf?
                </div>
              </div>
              <div style={{display:'flex',gap:10}}>
                <Btn v="ghost" onClick={()=>setExpAlert(null)} sx={{flex:1}}>Not Yet</Btn>
                <Btn onClick={()=>{setProds(prev=>prev.map(p=>p.id===expAlert.id?{...p,expConf:true}:p));setExpAlert(null);push('Alerts stopped for this product.','success');}} sx={{flex:2,fontFamily:HEAD}}>Yes, Removed ✓</Btn>
              </div>
            </div>
          </div>
        )}

        {showAdd&&<AddProduct onAdd={addProduct} onClose={()=>setShowAdd(false)} all={prods} cur={cur} push={push}/>}
        {showProfile&&<Profile user={user} onClose={()=>setShowProfile(false)} onLogout={logout} cur={cur}
          onCur={c=>{if(c==='more')setShowCurr(true);else setCur(c);}} push={push} prods={prods||[]}
          themeMode={themeMode} setThemeMode={setThemeMode} onInstall={()=>setShowInstall(true)}/>}
        {showCurr&&<CurrencyPicker cur={cur} onChange={setCur} onClose={()=>setShowCurr(false)}/>}
        {showInstall&&<InstallApp onClose={()=>setShowInstall(false)}/>}
      </div>
    </ThemeCtx.Provider>
  );
}

ReactDOM.createRoot(document.getElementById('app')).render(<App/>);
