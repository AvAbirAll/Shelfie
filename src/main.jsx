import React,{useState,useEffect,useRef,useCallback,useMemo,createContext,useContext} from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// ── FIREBASE (bundled — no CDN, works in Italy) ───────────────
import { initializeApp } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider, signInWithPopup,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut as fbSignOut, onAuthStateChanged, updateProfile
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

const fbApp = initializeApp({
  apiKey: import.meta.env.VITE_API_KEY || "AIzaSyBvbp6Z3Ha4FCmuZ2ErQ9xVB0teD2s8JuY",
  authDomain: import.meta.env.VITE_AUTH_DOMAIN || "shelfie-911.firebaseapp.com",
  projectId: import.meta.env.VITE_PROJECT_ID || "shelfie-911",
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET || "shelfie-911.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_MESSAGING_ID || "146732929065",
  appId: import.meta.env.VITE_APP_ID || "1:146732929065:web:668e213d55498436b20c38"
});
const fbAuth = getAuth(fbApp);
const fbDb = getFirestore(fbApp);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// ── THEME ─────────────────────────────────────────────────────
const THEMES = {
  light:{
    bg:'#FAFAF8',bg2:'#F4F1EC',bg3:'#EDE8E0',
    surf:'#FFFFFF',card:'#FFFFFE',card2:'#F8F5F0',
    bdr:'#E8E2D9',bdr2:'#D9D1C4',
    ink:'#0F0E0C',ink2:'#2C2A26',ink3:'#6B6560',ink4:'#9B9590',ink5:'#C8C2BA',
    forest:'#9F1239',forestL:'#BE123C',
    forestG:'linear-gradient(135deg,#9F1239,#BE123C)',
    coral:'#EA580C',coralL:'#F97316',
    coralG:'linear-gradient(135deg,#EA580C,#F97316)',
    amber:'#D97706',amberL:'#F59E0B',
    indigo:'#1E40AF',indigoL:'#3B82F6',
    ok:'#059669',okL:'#10B981',warn:'#C47A14',
    danger:'#C22B2B',
    navBg:'rgba(255,255,255,0.92)',
    heroGrad:'linear-gradient(135deg,#881337,#9F1239)',
    cardShadow:'0 1px 4px rgba(15,14,12,.06)',
    modalBg:'rgba(15,14,12,.42)',
    inputBg:'#F8F5F0',inputFocusBg:'#FFFFFF',
    sheetBg:'#FFFFFF',sheetBorder:'#E8E2D9',
  },
  dark:{
    bg:'#0d0d1a',bg2:'#12122a',bg3:'#16162e',
    surf:'#1a1a35',card:'#1a1a35',card2:'#1f1f3d',
    bdr:'#ffffff12',bdr2:'#ffffff1f',
    ink:'#f1f5f9',ink2:'#e2e8f0',ink3:'#94a3b8',ink4:'#64748b',ink5:'#334155',
    forest:'#4A8A62',forestL:'#5EA87A',
    forestG:'linear-gradient(135deg,#2D5A3F,#4A8A62)',
    coral:'#E8754F',coralL:'#F4A484',
    coralG:'linear-gradient(135deg,#EA580C,#F97316)',
    amber:'#F0B840',amberL:'#F7C948',
    indigo:'#6B82E8',indigoL:'#8B9CF8',
    ok:'#22A060',okL:'#34C878',warn:'#E8A020',
    danger:'#E04040',
    navBg:'rgba(13,13,26,0.94)',
    heroGrad:'linear-gradient(135deg,#1a0a2e,#16102e)',
    cardShadow:'0 2px 8px rgba(0,0,0,.3)',
    modalBg:'rgba(0,0,0,.72)',
    inputBg:'#1a1a35',inputFocusBg:'#1f1f3d',
    sheetBg:'#16162e',sheetBorder:'#ffffff12',
  }
};

const HEAD = "'Syne',system-ui,sans-serif";
const FONT = "'DM Sans',system-ui,sans-serif";
const MONO = "'DM Mono',monospace";

const ThemeCtx = createContext(THEMES.light);
const useTheme = () => useContext(ThemeCtx);

// ── CONSTANTS ─────────────────────────────────────────────────
const CURR=[
  {code:'EUR',sym:'EUR'},{code:'USD',sym:'USD'},{code:'GBP',sym:'GBP'},
  {code:'BDT',sym:'BDT'},{code:'INR',sym:'INR'},{code:'JPY',sym:'JPY'},
  {code:'AED',sym:'AED'},{code:'SGD',sym:'SGD'},{code:'CAD',sym:'CAD'},
  {code:'AUD',sym:'AUD'},{code:'TRY',sym:'TRY'},{code:'SAR',sym:'SAR'},
  {code:'CHF',sym:'CHF'},{code:'CNY',sym:'CNY'},
];
const RATES={BDT:1,USD:.0091,EUR:.0084,GBP:.0072,INR:.76,JPY:1.38,AED:.033,SGD:.012,CAD:.012,AUD:.014,TRY:.29,SAR:.034,CHF:.0082,CNY:.066};
const cv=(a,f,t)=>+((a/(RATES[f]||1))*(RATES[t]||1)).toFixed(2);
const fm=(a,c)=>{const x=CURR.find(v=>v.code===c)||CURR[0];const n=Math.abs(a);const s=a<0?'-':'';return s+x.sym+' '+(n>=1000?n.toLocaleString('en',{maximumFractionDigits:0}):n.toFixed(2));};

const CATS=['All','Grains','Spices','Drinks','Dairy','Snacks','Vegetables','Fruits','Cleaning','Personal Care','Other'];
const CE={Grains:'🌾',Spices:'🌿',Drinks:'🥤',Dairy:'🥛',Snacks:'🍿',Vegetables:'🥦',Fruits:'🍎',Cleaning:'🧹','Personal Care':'🧴',Other:'📦'};
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const mkH=b=>Array.from({length:12},(_,i)=>{const d=new Date();d.setMonth(d.getMonth()-11+i);return{month:MON[d.getMonth()],year:d.getFullYear(),price:Math.max(1,+(b*(.85+Math.random()*.3)).toFixed(2))};});
const dL=d=>Math.ceil((new Date(d)-new Date())/86400000);
const uid=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36);

// ── STORAGE ───────────────────────────────────────────────────
const SK='sh3_s',UK='sh3_u';
const DK=e=>'sh3_d_'+e, CKs=e=>'sh3_c_'+e, TK=e=>'sh3_t_'+e, OK=e=>'sh3_o_'+e, THEMEK='sh3_theme';
const lsG=(k,d=null)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch{return d;}};
const lsS=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}};

// ── FIRESTORE ─────────────────────────────────────────────────
const fsSave=async(uid,products)=>{try{await setDoc(doc(fbDb,'users',uid,'data','products'),{items:JSON.stringify(products),updated:Date.now()});}catch(e){console.warn('FS save:',e.message);}};
const fsLoad=async(uid)=>{try{const s=await getDoc(doc(fbDb,'users',uid,'data','products'));return s.exists()?JSON.parse(s.data().items):null;}catch{return null;}};
const fsSaveSettings=async(uid,s)=>{try{await setDoc(doc(fbDb,'users',uid,'data','settings'),s);}catch{}};
const fsLoadSettings=async(uid)=>{try{const s=await getDoc(doc(fbDb,'users',uid,'data','settings'));return s.exists()?s.data():null;}catch{return null;}};

// ── DEMO DATA ─────────────────────────────────────────────────
const DEMO=[
  {id:'1',name:'Basmati Rice',company:'ACI Foods',base:120,vat:5,buy:126,sell:155,expire:'2025-12-01',added:'2024-01-15',cat:'Grains',photo:null,unit:'1 kg',cur:'BDT',qty:50,hist:mkH(120),restock:3,expConf:false},
  {id:'2',name:'Mustard Oil',company:'Radhuni',base:180,vat:5,buy:189,sell:230,expire:'2026-09-10',added:'2024-01-10',cat:'Spices',photo:null,unit:'1 L',cur:'BDT',qty:30,hist:mkH(180),restock:2,expConf:false},
  {id:'3',name:'Mango Juice',company:'Pran',base:45,vat:15,buy:51.75,sell:68,expire:'2025-08-28',added:'2024-02-01',cat:'Drinks',photo:null,unit:'250 ml',cur:'BDT',qty:120,hist:mkH(45),restock:5,expConf:false},
  {id:'4',name:'Full Cream Milk',company:'Milk Vita',base:70,vat:0,buy:70,sell:88,expire:'2025-04-30',added:'2024-03-20',cat:'Dairy',photo:null,unit:'500 ml',cur:'BDT',qty:8,hist:mkH(70),restock:4,expConf:false},
  {id:'5',name:'Turmeric Powder',company:'BD Foods',base:55,vat:5,buy:57.75,sell:78,expire:'2026-06-15',added:'2024-01-05',cat:'Spices',photo:null,unit:'200 g',cur:'BDT',qty:80,hist:mkH(55),restock:1,expConf:false},
  {id:'6',name:'Potato Chips',company:'Bombay Sweets',base:30,vat:15,buy:34.5,sell:48,expire:'2025-07-20',added:'2024-02-10',cat:'Snacks',photo:null,unit:'100 g',cur:'BDT',qty:200,hist:mkH(30),restock:6,expConf:false},
];

// ── ONLINE RESULTS (Smart Lens) ───────────────────────────────
const ONLINE_DB={
  rice:[{name:'Aromatic Jasmine Rice 5kg',brand:'Thai Heritage',price:'EUR 12.99',img:'🌾',match:92,store:'Amazon'},{name:'Basmati Rice Premium 2kg',brand:'Tilda',price:'EUR 8.49',img:'🌾',match:88,store:'Carrefour'},{name:'Long Grain White Rice 1kg',brand:'SunRice',price:'EUR 3.20',img:'🌾',match:74,store:'Esselunga'}],
  oil:[{name:'Extra Virgin Olive Oil 1L',brand:'Bertolli',price:'EUR 9.99',img:'🫙',match:90,store:'Amazon'},{name:'Sunflower Oil 2L',brand:'Crisco',price:'EUR 4.50',img:'🫙',match:85,store:'Lidl'},{name:'Coconut Oil 500ml',brand:'Organic Harvest',price:'EUR 7.80',img:'🫙',match:70,store:'Naturalia'}],
  juice:[{name:'Mango Nectar 1L',brand:'Tropicana',price:'EUR 2.99',img:'🥭',match:94,store:'Conad'},{name:'Orange Juice 1.5L',brand:'Don Simon',price:'EUR 1.89',img:'🍊',match:80,store:'Lidl'},{name:'Mixed Fruit Juice 1L',brand:'Yoga',price:'EUR 2.40',img:'🍹',match:72,store:'Esselunga'}],
  milk:[{name:'Whole Milk 1L',brand:'Parmalat',price:'EUR 1.49',img:'🥛',match:96,store:'Conad'},{name:'UHT Skimmed Milk 1L',brand:'Granarolo',price:'EUR 1.29',img:'🥛',match:88,store:'Carrefour'},{name:'Oat Milk 1L',brand:'Oatly',price:'EUR 2.99',img:'🥛',match:65,store:'Amazon'}],
  chips:[{name:"Lay's Classic 150g",brand:"Lay's",price:'EUR 2.49',img:'🍟',match:92,store:'Conad'},{name:'Pringles Original 165g',brand:'Pringles',price:'EUR 3.19',img:'🥫',match:85,store:'Esselunga'},{name:'Kettle Sea Salt 142g',brand:'Kettle',price:'EUR 3.49',img:'🍿',match:78,store:'Amazon'}],
  spice:[{name:'Ground Turmeric 100g',brand:'Schwartz',price:'EUR 2.29',img:'🌿',match:88,store:'Esselunga'},{name:'Coriander Powder 80g',brand:'Ducros',price:'EUR 1.89',img:'🌿',match:75,store:'Conad'}],
  default:[{name:'Similar Product A',brand:'Generic Brand',price:'EUR 4.99',img:'📦',match:80,store:'Amazon'},{name:'Similar Product B',brand:'Store Brand',price:'EUR 3.50',img:'📦',match:72,store:'Carrefour'},{name:'Similar Product C',brand:'Premium Brand',price:'EUR 6.99',img:'📦',match:65,store:'Esselunga'}],
};
const getOnline=n=>{const l=n.toLowerCase();if(l.includes('rice'))return ONLINE_DB.rice;if(l.includes('oil'))return ONLINE_DB.oil;if(l.includes('juice'))return ONLINE_DB.juice;if(l.includes('milk'))return ONLINE_DB.milk;if(l.includes('chip')||l.includes('crisp'))return ONLINE_DB.chips;if(l.includes('spice')||l.includes('turmeric')||l.includes('cumin'))return ONLINE_DB.spice;return ONLINE_DB.default;};

// ── IMAGE COMPRESS ────────────────────────────────────────────
const compress=file=>new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>{const img=new Image();img.onload=()=>{const c=document.createElement('canvas');let w=img.width,h=img.height,max=500;if(w>h&&w>max){h=Math.round(h*max/w);w=max;}else if(h>max){w=Math.round(w*max/h);h=max;}c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);res(c.toDataURL('image/jpeg',.68));};img.onerror=rej;img.src=e.target.result;};r.onerror=rej;r.readAsDataURL(file);});

// ── NOTIFICATIONS ─────────────────────────────────────────────
const notifSupported=()=>'Notification' in window && 'serviceWorker' in navigator;
const getNotifPerm=()=>notifSupported()?Notification.permission:'unsupported';

const sendNotif=(title,body,icon='📦')=>{
  if(getNotifPerm()==='granted'){
    try{new Notification(title,{body,icon:'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>'+icon+'</text></svg>'});}catch{}
  }
};

// Check expiry and send notifications
const checkExpiryNotifs=(products)=>{
  if(getNotifPerm()!=='granted')return;
  products.forEach(p=>{
    const d=dL(p.expire);
    if(d===0)sendNotif('⚠️ Expires Today!',p.name+' expires today. Check your shelf!','⚠️');
    else if(d===1)sendNotif('📅 Expiring Tomorrow',p.name+' expires tomorrow.','📅');
    else if(d===7)sendNotif('🔔 Expiring in 7 days',p.name+' expires in one week.','🔔');
  });
};

// ── HOOKS ─────────────────────────────────────────────────────
function useToasts(){
  const [list,setList]=useState([]);
  const push=useCallback((msg,type='info')=>{
    const id=Date.now()+Math.random();
    setList(t=>[...t,{id,msg,type}]);
    setTimeout(()=>setList(t=>t.filter(x=>x.id!==id)),3800);
  },[]);
  return{list,push};
}

// ── UI ATOMS ──────────────────────────────────────────────────
function Spin({s=18,col}){const C=useTheme();return<div style={{width:s,height:s,border:'2.5px solid '+(col||C.forest)+'22',borderTop:'2.5px solid '+(col||C.forest),borderRadius:'50%',animation:'spin .6s linear infinite',flexShrink:0}}/>;}

function ExpBadge({date}){
  const C=useTheme();const d=dL(date);
  let bg,col,lbl;
  if(d<0){bg=C.ink4+'18';col=C.ink4;lbl='Expired';}
  else if(d===0){bg=C.danger+'18';col=C.danger;lbl='Today!';}
  else if(d<=1){bg=C.danger+'18';col=C.danger;lbl='Tomorrow!';}
  else if(d<=7){bg=C.warn+'18';col=C.warn;lbl=d+'d left';}
  else if(d<=30){bg=C.coral+'14';col=C.coral;lbl=d+'d';}
  else{bg=C.ok+'12';col=C.ok;lbl=d+'d';}
  return<span style={{background:bg,color:col,border:'1px solid '+col+'28',borderRadius:99,padding:'3px 10px',fontSize:10,fontWeight:600}}>{lbl}</span>;
}

function Btn({children,onClick,v='primary',full,sm,dis,sx={}}){
  const C=useTheme();
  const V={
    primary:{background:C.forestG,color:'#fff',boxShadow:'0 2px 12px '+C.forest+'28'},
    coral:{background:C.coralG,color:'#fff',boxShadow:'0 2px 12px '+C.coral+'28'},
    ghost:{background:'transparent',color:C.ink2,border:'1.5px solid '+C.bdr},
    danger:{background:C.danger,color:'#fff'},
    soft:{background:C.bg2,color:C.ink2,border:'1px solid '+C.bdr},
  };
  return(
    <button onClick={onClick} disabled={dis}
      style={{display:'flex',alignItems:'center',justifyContent:'center',gap:7,border:'none',cursor:dis?'not-allowed':'pointer',opacity:dis?.5:1,borderRadius:sm?10:14,padding:sm?'8px 15px':full?'15px 22px':'12px 22px',fontSize:sm?12:14,fontWeight:600,width:full?'100%':'auto',transition:'all .18s',fontFamily:FONT,...V[v],...sx}}
      onMouseOver={e=>{if(!dis){e.currentTarget.style.opacity='.85';e.currentTarget.style.transform='translateY(-1px)';}}}
      onMouseOut={e=>{e.currentTarget.style.opacity='1';e.currentTarget.style.transform='translateY(0)';}}>
      {children}
    </button>
  );
}

function Inp({label,hint,pre,suf,err,...props}){
  const C=useTheme();const[foc,setFoc]=useState(false);
  return(
    <div style={{marginBottom:15}}>
      {label&&<label style={{display:'block',fontSize:11,fontWeight:600,color:C.ink3,letterSpacing:.8,textTransform:'uppercase',marginBottom:7}}>{label}</label>}
      <div style={{position:'relative'}}>
        {pre&&<span style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',fontSize:14,pointerEvents:'none',zIndex:1,opacity:.5}}>{pre}</span>}
        <input {...props} onFocus={e=>{setFoc(true);props.onFocus&&props.onFocus(e);}} onBlur={e=>{setFoc(false);props.onBlur&&props.onBlur(e);}}
          style={{width:'100%',background:foc?C.inputFocusBg:C.inputBg,border:'1.5px solid '+(err?C.danger:foc?C.forest+'88':C.bdr),borderRadius:13,padding:'13px '+(suf?'50px':'16px')+' 13px '+(pre?'44px':'16px'),color:C.ink,fontSize:14,outline:'none',fontFamily:FONT,boxShadow:foc?'0 0 0 3px '+C.forest+'10':'none',transition:'all .18s',caretColor:C.forest,...(props.style||{})}}/>
        {suf&&<span style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}>{suf}</span>}
      </div>
      {(hint||err)&&<p style={{fontSize:11,color:err?C.danger:C.ink4,marginTop:5,paddingLeft:2}}>{err||hint}</p>}
    </div>
  );
}

function Sheet({title,sub,onClose,children}){
  const C=useTheme();
  useEffect(()=>{document.body.style.overflow='hidden';return()=>{document.body.style.overflow='';};},[]);
  return(
    <div onClick={onClose} style={{position:'fixed',inset:0,background:C.modalBg,zIndex:500,display:'flex',alignItems:'flex-end',justifyContent:'center',backdropFilter:'blur(6px)'}}>
      <div onClick={e=>e.stopPropagation()} className="su" style={{background:C.sheetBg,borderRadius:'24px 24px 0 0',width:'100%',maxWidth:480,maxHeight:'92vh',overflowY:'auto',boxShadow:'0 -24px 80px rgba(0,0,0,.18)',border:'1px solid '+C.sheetBorder,borderBottom:'none'}}>
        <div style={{padding:'20px 22px 0',display:'flex',justifyContent:'space-between',alignItems:'flex-start',position:'sticky',top:0,background:C.sheetBg,backdropFilter:'blur(20px)',paddingBottom:16,borderBottom:'1px solid '+C.bdr,zIndex:2}}>
          <div>
            <h2 style={{fontSize:18,fontWeight:700,color:C.ink,fontFamily:HEAD,letterSpacing:-.3}}>{title}</h2>
            {sub&&<p style={{fontSize:12,color:C.ink3,marginTop:3}}>{sub}</p>}
          </div>
          <button onClick={onClose} style={{width:32,height:32,borderRadius:9,background:C.bg2,border:'1px solid '+C.bdr,color:C.ink3,cursor:'pointer',fontSize:13,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginLeft:12,fontWeight:700}}>✕</button>
        </div>
        <div style={{padding:'20px 22px 36px'}}>{children}</div>
      </div>
    </div>
  );
}

function Modal({title,children,onClose}){
  const C=useTheme();
  useEffect(()=>{document.body.style.overflow='hidden';return()=>{document.body.style.overflow='';};},[]);
  return(
    <div onClick={onClose} style={{position:'fixed',inset:0,background:C.modalBg,zIndex:600,display:'flex',alignItems:'center',justifyContent:'center',padding:24,backdropFilter:'blur(8px)'}}>
      <div onClick={e=>e.stopPropagation()} className="pp" style={{background:C.surf,borderRadius:24,padding:28,width:'100%',maxWidth:360,boxShadow:'0 24px 80px rgba(0,0,0,.2)',border:'1.5px solid '+C.bdr}}>
        {title&&<div style={{fontFamily:HEAD,fontWeight:700,fontSize:18,color:C.ink,marginBottom:16}}>{title}</div>}
        {children}
      </div>
    </div>
  );
}

function Toasts({list}){
  const C=useTheme();
  const ic={success:'✓',error:'✕',warn:'!',info:'i'};
  const col={success:C.ok,error:C.danger,warn:C.warn,info:C.indigo};
  return(
    <div style={{position:'fixed',top:16,left:'50%',transform:'translateX(-50%)',width:'90%',maxWidth:420,zIndex:9999,pointerEvents:'none'}}>
      {list.map(t=>(
        <div key={t.id} className="ti" style={{background:C.surf,border:'1px solid '+C.bdr,borderRadius:14,padding:'12px 16px',marginBottom:8,display:'flex',gap:12,alignItems:'center',boxShadow:'0 8px 32px rgba(0,0,0,.12)',borderLeft:'3px solid '+(col[t.type]||C.forest)}}>
          <div style={{width:22,height:22,borderRadius:'50%',background:col[t.type]||C.forest,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <span style={{fontSize:11,color:'#fff',fontWeight:700}}>{ic[t.type]||'i'}</span>
          </div>
          <span style={{fontSize:13,color:C.ink,fontWeight:500,flex:1}}>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

// ── LOGO ──────────────────────────────────────────────────────
function Logo({size=72}){
  return(
    <svg width={size} height={size} viewBox="0 0 72 72" fill="none">
      <defs>
        <linearGradient id="lg1" x1="0" y1="0" x2="72" y2="72" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#9F1239"/><stop offset="100%" stopColor="#BE123C"/></linearGradient>
        <linearGradient id="lg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FFFFFF" stopOpacity=".95"/><stop offset="100%" stopColor="#FFFFFF" stopOpacity=".5"/></linearGradient>
      </defs>
      <rect width="72" height="72" rx="20" fill="url(#lg1)"/>
      <rect x="10" y="52" width="52" height="5.5" rx="2.75" fill="url(#lg2)"/>
      <rect x="10" y="36" width="52" height="5" rx="2.5" fill="url(#lg2)" fillOpacity=".65"/>
      <rect x="10" y="21" width="52" height="4" rx="2" fill="url(#lg2)" fillOpacity=".4"/>
      <rect x="9" y="21" width="4.5" height="36" rx="2.25" fill="url(#lg2)"/>
      <rect x="58.5" y="21" width="4.5" height="36" rx="2.25" fill="url(#lg2)"/>
      <rect x="16" y="41" width="9" height="11" rx="2" fill="url(#lg2)"/>
      <rect x="29" y="38" width="8" height="14" rx="2" fill="url(#lg2)" fillOpacity=".8"/>
      <rect x="41" y="42" width="7" height="10" rx="2" fill="url(#lg2)"/>
      <rect x="52" y="39" width="8" height="13" rx="2" fill="url(#lg2)" fillOpacity=".8"/>
      <rect x="16" y="25" width="7" height="11" rx="2" fill="url(#lg2)" fillOpacity=".6"/>
      <circle cx="60" cy="14" r="7" fill="#D95F3B"/>
      <circle cx="60" cy="14" r="4" fill="white" fillOpacity=".8"/>
      <circle cx="60" cy="14" r="2" fill="white"/>
    </svg>
  );
}

// ── AVATAR ────────────────────────────────────────────────────
function Av({p,size=46,r=14}){
  const C=useTheme();
  if(p.photo)return<img src={p.photo} alt={p.name} style={{width:size,height:size,borderRadius:r,objectFit:'cover',border:'1.5px solid '+C.bdr,flexShrink:0}}/>;
  return<div style={{width:size,height:size,borderRadius:r,background:'linear-gradient(135deg,'+C.bg3+','+C.bg2+')',border:'1.5px solid '+C.bdr,display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*.44,flexShrink:0}}>{CE[p.cat]||'📦'}</div>;
}

// ── AUTH ──────────────────────────────────────────────────────
function Auth({onLogin}){
  const C=useTheme();
  const [view,setView]=useState('welcome');
  const [f,setF]=useState({name:'',email:'',pass:''});
  const [busy,setBusy]=useState(false);
  const [err,setErr]=useState('');
  const [showP,setShowP]=useState(false);
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const doErr=m=>{setErr(m);setBusy(false);};

  // ✅ FIXED: using imported functions directly, not window._fb
  const gLogin=async()=>{
    setBusy(true);setErr('');
    try{
      const result=await signInWithPopup(fbAuth,googleProvider);
      const u=result.user;
      const userData={name:u.displayName||'Google User',email:u.email,uid:u.uid,avatar:(u.displayName||'G')[0].toUpperCase(),photoURL:u.photoURL,provider:'google',joined:u.metadata.creationTime||new Date().toISOString()};
      lsS(SK,userData);onLogin(userData);setBusy(false);
    }catch(e){
      setBusy(false);
      if(e.code==='auth/popup-closed-by-user'||e.code==='auth/cancelled-popup-request')return;
      if(e.code==='auth/popup-blocked')doErr('Popup blocked. Please allow popups for this site in your browser.');
      else if(e.code==='auth/network-request-failed')doErr('Network error. Check your connection.');
      else{doErr('Google sign-in failed. Try again.');console.error('Auth error:',e.code,e.message);}
    }
  };

  const signUp=async()=>{
    if(!f.name||!f.email||!f.pass){doErr('Please fill all fields.');return;}
    if(!/\S+@\S+\.\S+/.test(f.email)){doErr('Enter a valid email.');return;}
    if(f.pass.length<6){doErr('Password must be at least 6 characters.');return;}
    setBusy(true);setErr('');
    try{
      const result=await createUserWithEmailAndPassword(fbAuth,f.email,f.pass);
      await updateProfile(result.user,{displayName:f.name});
      const u={name:f.name,email:f.email,uid:result.user.uid,avatar:f.name[0].toUpperCase(),provider:'email',joined:new Date().toISOString()};
      lsS(SK,u);onLogin(u);setBusy(false);
    }catch(e){
      if(e.code==='auth/email-already-in-use')doErr('Email already registered. Sign in instead.');
      else if(e.code==='auth/weak-password')doErr('Use at least 6 characters.');
      else doErr('Sign up failed. Please try again.');
    }
  };

  const signIn=async()=>{
    if(!f.email||!f.pass){doErr('Please fill all fields.');return;}
    setBusy(true);setErr('');
    try{
      const result=await signInWithEmailAndPassword(fbAuth,f.email,f.pass);
      const u=result.user;
      const userData={name:u.displayName||f.email.split('@')[0],email:u.email,uid:u.uid,avatar:(u.displayName||f.email)[0].toUpperCase(),provider:'email',joined:u.metadata.creationTime||new Date().toISOString()};
      lsS(SK,userData);onLogin(userData);setBusy(false);
    }catch(e){
      if(e.code==='auth/wrong-password'||e.code==='auth/user-not-found'||e.code==='auth/invalid-credential')doErr('Incorrect email or password.');
      else doErr('Sign in failed. Please try again.');
    }
  };

  const GBtn=(
    <div onClick={!busy?gLogin:undefined}
      style={{background:'#fff',border:'1.5px solid #dadce0',borderRadius:12,padding:'13px 20px',cursor:busy?'default':'pointer',display:'flex',alignItems:'center',gap:12,justifyContent:'center',fontWeight:500,color:'#3c4043',fontSize:14,marginBottom:20,transition:'box-shadow .18s'}}
      onMouseOver={e=>{if(!busy)e.currentTarget.style.boxShadow='0 1px 6px rgba(32,33,36,.28)';}}
      onMouseOut={e=>e.currentTarget.style.boxShadow='none'}>
      {busy
        ?<><Spin col='#4285F4'/><span>Opening Google...</span></>
        :<><svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg><span>Sign in with Google</span></>}
    </div>
  );

  if(view==='welcome')return(
    <div style={{minHeight:'100vh',background:C.bg,fontFamily:FONT,display:'flex',flexDirection:'column',position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',top:-80,right:-80,width:360,height:360,borderRadius:'50%',background:'radial-gradient(circle,'+C.forest+'12,transparent 65%)',pointerEvents:'none',animation:'orbFloat 9s ease-in-out infinite'}}/>
      <div style={{position:'absolute',bottom:60,left:-80,width:300,height:300,borderRadius:'50%',background:'radial-gradient(circle,'+C.coral+'0a,transparent 65%)',pointerEvents:'none',animation:'orbFloat 12s ease-in-out infinite reverse'}}/>
      <div style={{position:'absolute',inset:0,backgroundImage:'radial-gradient('+C.bdr+' 1.5px,transparent 1.5px)',backgroundSize:'36px 36px',pointerEvents:'none',opacity:.35}}/>
      <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'40px 28px',position:'relative'}}>
        <div style={{width:'100%',maxWidth:360,textAlign:'center'}}>
          <div className="fu fl" style={{marginBottom:24,display:'inline-block'}}><Logo size={80}/></div>
          <div className="fu1" style={{marginBottom:4}}>
            <span style={{fontSize:52,fontWeight:900,color:C.ink,letterSpacing:-2.5,lineHeight:1,fontFamily:HEAD}}>shelf</span>
            <span style={{fontSize:52,fontWeight:900,color:C.coral,letterSpacing:-2.5,lineHeight:1,fontFamily:HEAD}}>ie</span>
          </div>
          <p className="fu1" style={{fontSize:10,fontWeight:700,color:C.ink4,letterSpacing:3,textTransform:'uppercase',marginBottom:10}}>Pro Edition</p>
          <p className="fu2" style={{color:C.ink3,fontSize:14,lineHeight:1.8,margin:'0 auto 36px',maxWidth:280}}>Smart inventory management for your shop</p>
          <div className="fu3">
            {GBtn}
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
              <div style={{flex:1,height:1,background:C.bdr}}/><span style={{color:C.ink4,fontSize:11,whiteSpace:'nowrap',fontWeight:500}}>or</span><div style={{flex:1,height:1,background:C.bdr}}/>
            </div>
            <div style={{display:'flex',gap:10}}>
              <Btn full onClick={()=>setView('signup')} v="soft" sx={{fontSize:13,padding:'13px',borderRadius:12}}>Create Account</Btn>
              <Btn full v="ghost" onClick={()=>setView('signin')} sx={{fontSize:13,padding:'13px',borderRadius:12}}>Sign In</Btn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const isUp=view==='signup';
  return(
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',fontFamily:FONT,background:C.bg,overflow:'hidden'}}>
      <div style={{background:'linear-gradient(150deg,'+C.forest+' 0%,'+C.forestL+' 100%)',padding:'52px 28px 52px',textAlign:'center',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:-40,right:-40,width:180,height:180,borderRadius:'50%',background:'rgba(255,255,255,.07)',pointerEvents:'none'}}/>
        <div style={{marginBottom:16,display:'inline-block'}} className="fu"><Logo size={50}/></div>
        <h1 className="fu1" style={{fontSize:25,fontWeight:800,color:'#fff',fontFamily:HEAD,marginBottom:5,letterSpacing:-.4}}>{isUp?'Create Account':'Welcome Back'}</h1>
        <p className="fu2" style={{color:'rgba(255,255,255,.6)',fontSize:13}}>{isUp?'Join Shelfie for free':'Sign in to your account'}</p>
      </div>
      <div className="fu" style={{flex:1,background:C.surf,borderRadius:'22px 22px 0 0',marginTop:-18,padding:'26px 22px 44px',border:'1px solid '+C.bdr,borderBottom:'none',zIndex:1}}>
        <button onClick={()=>{setView('welcome');setErr('');}} style={{background:'none',border:'none',color:C.ink3,cursor:'pointer',fontSize:13,marginBottom:20,fontWeight:600,fontFamily:FONT}}>← Back</button>
        {GBtn}
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:18}}>
          <div style={{flex:1,height:1,background:C.bdr}}/><span style={{color:C.ink4,fontSize:11,whiteSpace:'nowrap'}}>or use email</span><div style={{flex:1,height:1,background:C.bdr}}/>
        </div>
        {isUp&&<Inp label="Full Name" pre="👤" placeholder="Your full name" value={f.name} onChange={e=>set('name',e.target.value)}/>}
        <Inp label="Email" pre="✉️" placeholder="you@example.com" type="email" value={f.email} onChange={e=>set('email',e.target.value)}/>
        <Inp label="Password" pre="🔒" placeholder="Min 6 characters" type={showP?'text':'password'} value={f.pass} onChange={e=>set('pass',e.target.value)}
          suf={<span onClick={()=>setShowP(!showP)} style={{cursor:'pointer',color:C.ink3,userSelect:'none',fontWeight:600,fontSize:11}}>{showP?'Hide':'Show'}</span>}/>
        {err&&<div style={{background:C.danger+'0e',border:'1px solid '+C.danger+'33',borderRadius:11,padding:'10px 13px',color:C.danger,fontSize:13,marginBottom:14,fontWeight:500}}>⚠️ {err}</div>}
        <Btn full onClick={isUp?signUp:signIn} sx={{padding:'15px',fontSize:14,borderRadius:12,marginBottom:4}}>
          {busy?<><Spin col='#fff'/>{isUp?'Creating...':'Signing in...'}</>:isUp?'Create Account →':'Sign In →'}
        </Btn>
        <p style={{textAlign:'center',marginTop:16,fontSize:13,color:C.ink3}}>
          {isUp?'Already have an account? ':'No account? '}
          <span onClick={()=>{setView(isUp?'signin':'signup');setErr('');}} style={{color:C.forest,cursor:'pointer',fontWeight:700}}>{isUp?'Sign In':'Create free'}</span>
        </p>
      </div>
    </div>
  );
}

// ── PRODUCT CARD ──────────────────────────────────────────────
function MC({p,cur,onPress,onTrash}){
  const C=useTheme();
  const d=fm(cv(p.buy,p.cur||'BDT',cur),cur);
  const [hov,setHov]=useState(false);
  return(
    <div style={{marginBottom:8}}>
      <div onClick={onPress} style={{background:hov?C.card2:C.surf,borderRadius:16,padding:'13px 14px',display:'flex',alignItems:'center',gap:12,cursor:onPress?'pointer':'default',border:'1.5px solid '+(hov?C.bdr2:C.bdr),transition:'all .18s',boxShadow:hov?'0 4px 16px rgba(0,0,0,.08)':C.cardShadow}}
        onMouseOver={()=>setHov(true)} onMouseOut={()=>setHov(false)}>
        <Av p={p}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:600,color:C.ink,fontSize:13,marginBottom:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div>
          <div style={{color:C.ink4,fontSize:11}}>{p.company} · {p.unit}</div>
        </div>
        <div style={{textAlign:'right',flexShrink:0,display:'flex',flexDirection:'column',alignItems:'flex-end',gap:5}}>
          <div style={{fontWeight:700,color:C.forest,fontSize:13,fontFamily:MONO}}>{d}</div>
          {p.expire&&<ExpBadge date={p.expire}/>}
          {p.qty<10&&<span style={{background:C.warn+'18',color:C.warn,borderRadius:99,padding:'2px 8px',fontSize:10,fontWeight:600}}>Low: {p.qty}</span>}
        </div>
        {onTrash&&<button onClick={e=>{e.stopPropagation();onTrash(p.id);}} style={{background:C.danger+'0e',border:'1px solid '+C.danger+'28',borderRadius:9,padding:'6px 9px',cursor:'pointer',color:C.danger,fontSize:12,marginLeft:4,flexShrink:0}}>✕</button>}
      </div>
    </div>
  );
}

// ── SMART LENS ────────────────────────────────────────────────
function LensSearch({products,cur,push}){
  const C=useTheme();
  const [mode,setMode]=useState('text');
  const [query,setQuery]=useState('');
  const [imgData,setImgData]=useState(null);
  const [phase,setPhase]=useState('idle');
  const [localRes,setLocalRes]=useState([]);
  const [onlineRes,setOnlineRes]=useState([]);
  const [sel,setSel]=useState(null);
  const [showCam,setShowCam]=useState(false);
  const fileRef=useRef();

  const doSearch=useCallback((q,img)=>{
    if(!q&&!img){push('Enter a product name or take a photo','warn');return;}
    setPhase('scanning_local');setLocalRes([]);setOnlineRes([]);setSel(null);
    const sq=(q||'product').toLowerCase();
    setTimeout(()=>{
      const local=products.filter(p=>p.name.toLowerCase().includes(sq)||p.company.toLowerCase().includes(sq)||(p.cat||'').toLowerCase().includes(sq))
        .map(p=>({...p,matchScore:Math.floor(70+Math.random()*30)})).sort((a,b)=>b.matchScore-a.matchScore);
      setLocalRes(local);setPhase('found_local');
      setTimeout(()=>{
        setPhase('scanning_online');
        setTimeout(()=>{
          const online=getOnline(sq);setOnlineRes(online);setPhase('done');
          if(local.length===0&&online.length>0)push('Found '+online.length+' online results','success');
          else if(local.length>0)push('Found '+local.length+' in inventory + '+online.length+' online','success');
          else push('No results found','warn');
        },1800);
      },800);
    },1200);
  },[products,push]);

  const handleFile=async(e)=>{
    const file=e.target.files&&e.target.files[0];if(!file)return;
    if(!file.type.startsWith('image/')){push('Please select an image','error');return;}
    try{
      const compressed=await compress(file);setImgData(compressed);
      push('Image loaded! Analyzing...','info');
      const guess=products[Math.floor(Math.random()*products.length)]?.name||'product';
      setQuery(guess);doSearch(guess,compressed);
    }catch{push('Failed to load image','error');}
    e.target.value='';
  };

  // Camera component
  function CameraView({onCapture,onClose}){
    const vid=useRef(),can=useRef(),str=useRef();
    const [st,setSt]=useState('starting');
    useEffect(()=>{
      let alive=true;
      navigator.mediaDevices.getUserMedia({video:{facingMode:'environment',width:{ideal:1280}}})
        .then(s=>{if(!alive){s.getTracks().forEach(t=>t.stop());return;}str.current=s;if(vid.current){vid.current.srcObject=s;vid.current.play();}setSt('ready');})
        .catch(()=>{if(!alive)return;setSt('error');});
      return()=>{alive=false;str.current&&str.current.getTracks().forEach(t=>t.stop());};
    },[]);
    const cap=()=>{
      if(!vid.current||!can.current)return;
      const v=vid.current,c=can.current;c.width=v.videoWidth;c.height=v.videoHeight;
      c.getContext('2d').drawImage(v,0,0);
      str.current&&str.current.getTracks().forEach(t=>t.stop());
      onCapture(c.toDataURL('image/jpeg',.88));
    };
    return(
      <div style={{position:'fixed',inset:0,background:'#000',zIndex:900,display:'flex',flexDirection:'column'}}>
        <div style={{position:'absolute',top:0,left:0,right:0,zIndex:10,display:'flex',justifyContent:'space-between',alignItems:'center',padding:'18px 20px',background:'linear-gradient(rgba(0,0,0,.7),transparent)'}}>
          <button onClick={onClose} style={{background:'rgba(255,255,255,.15)',border:'1px solid rgba(255,255,255,.25)',color:'#fff',width:40,height:40,borderRadius:12,cursor:'pointer',fontSize:18,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
          <span style={{color:'#fff',fontWeight:600,fontSize:14,background:'rgba(0,0,0,.5)',padding:'7px 16px',borderRadius:99}}>Smart Lens Scan</span>
          <div style={{width:40}}/>
        </div>
        {st==='error'?(
          <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',color:'#fff',gap:12,padding:32,textAlign:'center'}}>
            <div style={{fontSize:48}}>📷</div>
            <div style={{fontWeight:700}}>Camera access needed</div>
            <div style={{fontSize:13,opacity:.7}}>Allow camera access in your browser settings</div>
            <Btn v="ghost" onClick={onClose} sx={{color:'#fff',borderColor:'rgba(255,255,255,.3)'}}>Go Back</Btn>
          </div>
        ):(
          <>
            <div style={{flex:1,position:'relative',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}>
              {st==='starting'&&<Spin s={40} col='#fff'/>}
              <video ref={vid} playsInline muted style={{width:'100%',height:'100%',objectFit:'cover',display:st==='ready'?'block':'none'}}/>
              <canvas ref={can} style={{display:'none'}}/>
              {st==='ready'&&(
                <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
                  <div style={{width:260,height:200,position:'relative',animation:'searchPulse 2s ease-in-out infinite'}}>
                    <div style={{position:'absolute',top:0,left:0,width:28,height:28,borderTop:'3px solid '+C.coral,borderLeft:'3px solid '+C.coral,borderRadius:'4px 0 0 0'}}/>
                    <div style={{position:'absolute',top:0,right:0,width:28,height:28,borderTop:'3px solid '+C.coral,borderRight:'3px solid '+C.coral,borderRadius:'0 4px 0 0'}}/>
                    <div style={{position:'absolute',bottom:0,left:0,width:28,height:28,borderBottom:'3px solid '+C.coral,borderLeft:'3px solid '+C.coral,borderRadius:'0 0 0 4px'}}/>
                    <div style={{position:'absolute',bottom:0,right:0,width:28,height:28,borderBottom:'3px solid '+C.coral,borderRight:'3px solid '+C.coral,borderRadius:'0 0 4px 0'}}/>
                    <div style={{position:'absolute',left:0,right:0,height:2,background:'linear-gradient(90deg,transparent,'+C.coral+',transparent)',animation:'beam 1.5s ease-in-out infinite'}}/>
                    <div style={{position:'absolute',bottom:-32,left:0,right:0,textAlign:'center',color:C.coral,fontSize:12,fontWeight:700}}>Point at product</div>
                  </div>
                </div>
              )}
            </div>
            {st==='ready'&&(
              <div style={{padding:'26px',display:'flex',justifyContent:'center',background:'linear-gradient(transparent,rgba(0,0,0,.7))'}}>
                <button onClick={cap} style={{width:72,height:72,borderRadius:'50%',background:'rgba(255,255,255,.2)',border:'3px solid rgba(255,255,255,.7)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <div style={{width:55,height:55,borderRadius:'50%',background:C.coral}}/>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  const handleCam=async(dataUrl)=>{setShowCam(false);setImgData(dataUrl);const g=products[Math.floor(Math.random()*products.length)]?.name||'product';setQuery(g);push('Photo captured! Searching...','info');doSearch(g,dataUrl);};

  if(showCam)return<CameraView onCapture={handleCam} onClose={()=>setShowCam(false)}/>;

  if(sel){
    return(
      <div style={{padding:'22px 16px 100px'}}>
        <button onClick={()=>setSel(null)} style={{background:'none',border:'none',color:C.ink3,cursor:'pointer',fontSize:13,fontWeight:600,fontFamily:FONT,marginBottom:20,display:'flex',alignItems:'center',gap:5}}>← Back to results</button>
        <div className="pp" style={{background:C.surf,border:'1.5px solid '+C.bdr,borderRadius:22,padding:22,boxShadow:C.cardShadow,marginBottom:16}}>
          <div style={{display:'flex',gap:14,alignItems:'center',marginBottom:18}}>
            <Av p={sel} size={64} r={16}/>
            <div><div style={{fontWeight:800,color:C.ink,fontSize:17,fontFamily:HEAD}}>{sel.name}</div><div style={{color:C.ink3,fontSize:12,marginTop:3}}>{sel.company} · {sel.unit}</div>{sel.expire&&<div style={{marginTop:7}}><ExpBadge date={sel.expire}/></div>}</div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
            {[[fm(cv(sel.buy,sel.cur||'BDT',cur),cur),'Buy Price',C.forest],[fm(cv(sel.sell,sel.cur||'BDT',cur),cur),'Sell Price',C.indigo],[sel.cat,'Category',C.coral],['+'+((((sel.sell-sel.buy)/sel.buy)*100)||0).toFixed(1)+'%','Margin',C.ok]].map(([v,l,col])=>(
              <div key={l} style={{background:C.bg2,borderRadius:12,padding:'10px 12px',border:'1.5px solid '+col+'18'}}>
                <div style={{fontSize:10,color:C.ink4,fontWeight:600,marginBottom:2,textTransform:'uppercase',letterSpacing:.5}}>{l}</div>
                <div style={{fontSize:13,fontWeight:700,color:col,fontFamily:MONO}}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{background:C.ok+'0e',border:'1px solid '+C.ok+'28',borderRadius:10,padding:'10px 14px',fontSize:12,color:C.ok}}>✓ Found in your inventory · In stock: {sel.qty} units</div>
        </div>
      </div>
    );
  }

  return(
    <div style={{padding:'22px 16px 100px'}}>
      <div style={{marginBottom:20}}>
        <h2 style={{fontSize:24,fontWeight:900,color:C.ink,letterSpacing:-.5,fontFamily:HEAD,marginBottom:4}}>Smart Lens</h2>
        <p style={{color:C.ink3,fontSize:13}}>Search your inventory · find prices online</p>
      </div>

      {/* Mode toggle */}
      <div style={{display:'flex',background:C.bg2,borderRadius:14,padding:4,marginBottom:18,border:'1px solid '+C.bdr}}>
        {[{id:'text',label:'Text Search',icon:'🔍'},{id:'photo',label:'Photo Search',icon:'📸'}].map(m=>(
          <div key={m.id} onClick={()=>setMode(m.id)} style={{flex:1,padding:'10px 8px',borderRadius:11,textAlign:'center',cursor:'pointer',background:mode===m.id?C.surf:'transparent',color:mode===m.id?C.ink:C.ink3,fontWeight:mode===m.id?700:500,fontSize:13,transition:'all .18s',boxShadow:mode===m.id?C.cardShadow:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
            <span style={{fontSize:15}}>{m.icon}</span>{m.label}
          </div>
        ))}
      </div>

      {/* Text search */}
      {mode==='text'&&(
        <div style={{marginBottom:16}}>
          <div style={{position:'relative',display:'flex',gap:10}}>
            <div style={{flex:1,position:'relative'}}>
              <span style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',fontSize:14,opacity:.5,pointerEvents:'none'}}>🔍</span>
              <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doSearch(query,null)}
                placeholder="e.g. Basmati Rice, milk, oil..."
                style={{width:'100%',background:C.inputBg,border:'1.5px solid '+C.bdr,borderRadius:13,padding:'13px 14px 13px 42px',color:C.ink,fontSize:14,outline:'none',fontFamily:FONT,caretColor:C.forest,transition:'border-color .18s'}}
                onFocus={e=>e.target.style.borderColor=C.forest+'88'} onBlur={e=>e.target.style.borderColor=C.bdr}/>
            </div>
            <Btn onClick={()=>doSearch(query,null)} sx={{padding:'13px 18px',borderRadius:13,flexShrink:0}}>Search</Btn>
          </div>
        </div>
      )}

      {/* Photo search */}
      {mode==='photo'&&(
        <div style={{marginBottom:16}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
            <div onClick={()=>setShowCam(true)} style={{background:C.forest+'08',border:'1.5px dashed '+C.forest+'44',borderRadius:16,padding:'20px',textAlign:'center',cursor:'pointer',transition:'all .18s'}} onMouseOver={e=>e.currentTarget.style.borderColor=C.forest} onMouseOut={e=>e.currentTarget.style.borderColor=C.forest+'44'}>
              <div style={{fontSize:32,marginBottom:6}}>📷</div>
              <div style={{fontWeight:700,color:C.forest,fontSize:12,fontFamily:HEAD}}>Camera</div>
              <div style={{fontSize:10,color:C.ink4,marginTop:2}}>Take a photo</div>
            </div>
            <div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{display:'none'}} id="lens_upload"/>
              <label htmlFor="lens_upload" style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',background:C.indigo+'08',border:'1.5px dashed '+C.indigo+'44',borderRadius:16,padding:'20px',cursor:'pointer',transition:'all .18s'}} onMouseOver={e=>e.currentTarget.style.borderColor=C.indigo} onMouseOut={e=>e.currentTarget.style.borderColor=C.indigo+'44'}>
                <div style={{fontSize:32,marginBottom:6}}>🖼️</div>
                <div style={{fontWeight:700,color:C.indigo,fontSize:12,fontFamily:HEAD}}>Upload</div>
                <div style={{fontSize:10,color:C.ink4,marginTop:2}}>From gallery</div>
              </label>
            </div>
          </div>
          {imgData&&(
            <div style={{background:C.bg2,borderRadius:14,padding:10,display:'flex',gap:10,alignItems:'center',border:'1px solid '+C.bdr}}>
              <img src={imgData} alt="search" style={{width:50,height:50,borderRadius:10,objectFit:'cover'}}/>
              <div style={{flex:1}}><div style={{fontWeight:600,color:C.ink,fontSize:13}}>Image ready</div><div style={{fontSize:11,color:C.ink4,marginTop:1}}>AI analyzing...</div></div>
              <Btn sm onClick={()=>doSearch(query,imgData)}>Search</Btn>
            </div>
          )}
        </div>
      )}

      {/* Loading phases */}
      {(phase==='scanning_local'||phase==='scanning_online')&&(
        <div style={{background:C.bg2,borderRadius:16,padding:'20px',marginBottom:16,border:'1px solid '+C.bdr}}>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:phase==='scanning_online'?12:0}}>
            <Spin s={20}/>
            <div>
              <div style={{fontWeight:700,color:C.ink,fontSize:13}}>{phase==='scanning_local'?'Searching your inventory...':'Searching online prices...'}</div>
              <div style={{fontSize:11,color:C.ink3,marginTop:2}}>{phase==='scanning_local'?'Checking '+products.length+' products':'Comparing prices across stores in Italy'}</div>
            </div>
          </div>
          {phase==='scanning_online'&&localRes.length>0&&(
            <div style={{background:C.ok+'0e',border:'1px solid '+C.ok+'28',borderRadius:10,padding:'8px 12px',fontSize:12,color:C.ok}}>✓ Found {localRes.length} match{localRes.length>1?'es':''} in your inventory</div>
          )}
        </div>
      )}

      {/* Inventory results */}
      {(phase==='found_local'||phase==='scanning_online'||phase==='done')&&(
        <div style={{marginBottom:16}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:C.ok}}/>
            <div style={{fontSize:11,fontWeight:700,color:C.ok,letterSpacing:1,textTransform:'uppercase'}}>In Your Inventory ({localRes.length})</div>
          </div>
          {localRes.length===0?(
            <div style={{background:C.bg2,borderRadius:14,padding:'16px',textAlign:'center',border:'1px solid '+C.bdr}}>
              <div style={{fontSize:28,marginBottom:6}}>📭</div>
              <div style={{fontSize:13,color:C.ink3,fontWeight:500}}>Not found in your inventory</div>
              <div style={{fontSize:11,color:C.ink4,marginTop:3}}>Showing online results below</div>
            </div>
          ):localRes.map(p=>(
            <div key={p.id} onClick={()=>setSel(p)} style={{background:C.surf,borderRadius:14,padding:'12px 14px',marginBottom:8,display:'flex',alignItems:'center',gap:12,cursor:'pointer',border:'1.5px solid '+C.ok+'33',transition:'all .18s'}} onMouseOver={e=>e.currentTarget.style.background=C.bg2} onMouseOut={e=>e.currentTarget.style.background=C.surf}>
              <Av p={p} size={44} r={12}/>
              <div style={{flex:1}}><div style={{fontWeight:700,color:C.ink,fontSize:13}}>{p.name}</div><div style={{fontSize:11,color:C.ink4,marginTop:1}}>{p.company} · {p.unit}</div></div>
              <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:5}}>
                <div style={{fontWeight:700,color:C.forest,fontSize:13,fontFamily:MONO}}>{fm(cv(p.buy,p.cur||'BDT',cur),cur)}</div>
                <div style={{background:C.ok+'14',color:C.ok,border:'1px solid '+C.ok+'28',borderRadius:99,padding:'2px 8px',fontSize:10,fontWeight:700}}>{p.matchScore}% match</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Online results */}
      {phase==='done'&&onlineRes.length>0&&(
        <div>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:C.indigo}}/>
            <div style={{fontSize:11,fontWeight:700,color:C.indigo,letterSpacing:1,textTransform:'uppercase'}}>Online Prices ({onlineRes.length})</div>
            <div style={{fontSize:10,color:C.ink4,marginLeft:'auto',background:C.bg2,padding:'3px 8px',borderRadius:99,border:'1px solid '+C.bdr}}>✨ Powered by AI</div>
          </div>
          {onlineRes.map((r,i)=>(
            <div key={i} style={{background:C.surf,borderRadius:14,padding:'12px 14px',marginBottom:8,display:'flex',alignItems:'center',gap:12,border:'1.5px solid '+C.indigo+'22',transition:'all .18s'}} onMouseOver={e=>e.currentTarget.style.background=C.bg2} onMouseOut={e=>e.currentTarget.style.background=C.surf}>
              <div style={{width:44,height:44,borderRadius:12,background:'linear-gradient(135deg,'+C.indigo+'18,'+C.indigo+'08)',border:'1px solid '+C.indigo+'22',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{r.img}</div>
              <div style={{flex:1}}><div style={{fontWeight:700,color:C.ink,fontSize:13}}>{r.name}</div><div style={{fontSize:11,color:C.ink4,marginTop:1}}>{r.brand} · {r.store}</div></div>
              <div style={{textAlign:'right',flexShrink:0}}>
                <div style={{fontWeight:700,color:C.indigo,fontSize:13,fontFamily:MONO}}>{r.price}</div>
                <div style={{background:C.indigo+'14',color:C.indigo,borderRadius:99,padding:'2px 8px',fontSize:10,fontWeight:700,marginTop:3}}>{r.match}% match</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {phase==='idle'&&(
        <div style={{textAlign:'center',padding:'40px 0',color:C.ink4}}>
          <div style={{fontSize:48,marginBottom:12}}>🔍</div>
          <div style={{fontWeight:600,color:C.ink3,fontSize:14}}>Search anything</div>
          <div style={{fontSize:12,marginTop:6,lineHeight:1.7}}>First checks your inventory<br/>Then shows online prices</div>
        </div>
      )}
    </div>
  );
}

// ── ADD PRODUCT ───────────────────────────────────────────────
function AddProd({onAdd,onClose,all,cur,push}){
  const C=useTheme();
  const [step,setStep]=useState(1);
  const [f,setF]=useState({name:'',company:'',cat:'Other',unit:'',qty:'1',base:'',vat:'0',sell:'',expire:'',photo:null});
  const [aiLoad,setAiLoad]=useState(false);
  const fileRef=useRef();
  const set=(k,v)=>setF(p=>({...p,[k]:v}));

  const restock=all.find(p=>p.name.toLowerCase()===f.name.toLowerCase()&&f.name.length>2);
  const effBuy=()=>{const b=parseFloat(f.base)||0;const v=parseFloat(f.vat)||0;return+(b+(b*v/100)).toFixed(2);};
  const marginPct=()=>{const b=effBuy(),s=parseFloat(f.sell)||0;return b>0?Math.round(((s-b)/b)*100):0;};

  const aiDetect=()=>{
    setAiLoad(true);
    setTimeout(()=>{
      if(!f.name)set('name','Detected Product '+Math.floor(Math.random()*100));
      if(!f.company)set('company','Auto Brand');
      if(!f.base)set('base',String(Math.floor(Math.random()*200+50)));
      if(!f.sell)set('sell',String(Math.floor(Math.random()*100+100)));
      setAiLoad(false);push('AI filled fields!','success');
    },1500);
  };

  const handlePhoto=async(e)=>{const file=e.target.files&&e.target.files[0];if(!file)return;try{set('photo',await compress(file));push('Photo added!','success');}catch{push('Photo failed','error');}};

  const save=()=>{
    if(!f.name||!f.base||!f.sell){push('Fill required fields','error');return;}
    const np={id:uid(),name:f.name,company:f.company,cat:f.cat,unit:f.unit,qty:parseInt(f.qty)||1,base:parseFloat(f.base)||0,vat:parseFloat(f.vat)||0,buy:effBuy(),sell:parseFloat(f.sell)||0,expire:f.expire,photo:f.photo,cur:'BDT',hist:mkH(effBuy()),restock:0,expConf:false,added:new Date().toISOString()};
    onAdd(np);push(np.name+' added!','success');onClose();
  };

  const cats=CATS.filter(c=>c!=='All');

  return(
    <Sheet title={`Add Product — Step ${step}/3`} onClose={onClose}>
      {/* Step bar */}
      <div style={{display:'flex',gap:6,marginBottom:22}}>
        {[1,2,3].map(s=><div key={s} style={{flex:1,height:4,borderRadius:4,background:s<=step?C.forestG:'var(--bdr, '+C.bdr+')',transition:'background .3s'}}/>)}
      </div>

      {step===1&&(
        <div>
          <div style={{display:'flex',gap:10,marginBottom:16,alignItems:'center'}}>
            <div onClick={()=>fileRef.current?.click()} style={{width:64,height:64,borderRadius:14,background:C.bg2,border:'2px dashed '+C.bdr,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',overflow:'hidden',flexShrink:0}}>
              {f.photo?<img src={f.photo} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{fontSize:24}}>📸</span>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{display:'none'}} onChange={handlePhoto}/>
            <Btn v="soft" sm onClick={aiDetect} dis={aiLoad} sx={{flex:1}}>
              {aiLoad?<><Spin s={14}/> Detecting...</>:<>✨ AI Detect</>}
            </Btn>
          </div>
          <Inp label="Product Name *" pre="📦" placeholder="e.g. Basmati Rice" value={f.name} onChange={e=>set('name',e.target.value)}/>
          {restock&&(
            <div style={{background:C.ok+'0e',border:'1px solid '+C.ok+'33',borderRadius:12,padding:'10px 14px',marginBottom:14,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{fontSize:13,color:C.ok}}>📦 Existing product found — use past data?</div>
              <Btn sm onClick={()=>{set('company',restock.company);set('cat',restock.cat);set('unit',restock.unit);set('base',String(restock.base));set('sell',String(restock.sell));push('Past data loaded!','success');}}>Use</Btn>
            </div>
          )}
          <Inp label="Company / Brand" pre="🏢" placeholder="e.g. ACI Foods" value={f.company} onChange={e=>set('company',e.target.value)}/>
          <div style={{marginBottom:15}}>
            <label style={{display:'block',fontSize:11,fontWeight:600,color:C.ink3,letterSpacing:.8,textTransform:'uppercase',marginBottom:8}}>Category</label>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {cats.map(c=><button key={c} onClick={()=>set('cat',c)} style={{padding:'6px 12px',borderRadius:20,fontSize:12,fontWeight:500,border:'1.5px solid',borderColor:f.cat===c?C.forest:C.bdr,background:f.cat===c?C.forest+'12':'transparent',color:f.cat===c?C.forest:C.ink3,cursor:'pointer',transition:'all .15s'}}>{CE[c]||'📦'} {c}</button>)}
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <Inp label="Unit" placeholder="e.g. 1kg" value={f.unit} onChange={e=>set('unit',e.target.value)}/>
            <Inp label="Qty" type="number" placeholder="1" value={f.qty} onChange={e=>set('qty',e.target.value)}/>
          </div>
          <Btn full onClick={()=>setStep(2)} dis={!f.name}>Next →</Btn>
        </div>
      )}

      {step===2&&(
        <div>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:12}}>
            <Inp label="Base Buy Price *" pre={CURR.find(c=>c.code==='BDT')?.sym||'BDT'} type="number" placeholder="0.00" value={f.base} onChange={e=>set('base',e.target.value)}/>
            <Inp label="VAT %" type="number" placeholder="0" value={f.vat} onChange={e=>set('vat',e.target.value)} suf={<span style={{color:C.ink4,fontSize:12}}>%</span>}/>
          </div>
          {parseFloat(f.vat)>0&&(
            <div style={{background:C.bg2,borderRadius:12,padding:'10px 14px',marginBottom:14,fontSize:13,color:C.ink3}}>
              Effective buy: <strong style={{color:C.ink,fontFamily:MONO}}>{fm(effBuy(),'BDT')}</strong>
            </div>
          )}
          <Inp label="Selling Price *" pre={CURR.find(c=>c.code==='BDT')?.sym||'BDT'} type="number" placeholder="0.00" value={f.sell} onChange={e=>set('sell',e.target.value)}/>
          {f.base&&f.sell&&(
            <div style={{background:marginPct()>=0?C.ok+'0e':C.danger+'0e',border:'1px solid '+(marginPct()>=0?C.ok:C.danger)+'28',borderRadius:12,padding:'12px 16px',marginBottom:14,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:13,color:C.ink3}}>Profit margin</span>
              <span style={{fontFamily:MONO,fontWeight:700,fontSize:16,color:marginPct()>=0?C.ok:C.danger}}>{marginPct()}%</span>
            </div>
          )}
          <div style={{display:'flex',gap:10}}>
            <Btn full v="ghost" onClick={()=>setStep(1)}>← Back</Btn>
            <Btn full onClick={()=>setStep(3)} dis={!f.base||!f.sell}>Next →</Btn>
          </div>
        </div>
      )}

      {step===3&&(
        <div>
          <Inp label="Expiry Date" type="date" value={f.expire} onChange={e=>set('expire',e.target.value)}/>
          {f.expire&&<div style={{marginBottom:14}}><ExpBadge date={f.expire}/></div>}
          <div style={{background:C.bg2,borderRadius:16,padding:16,marginBottom:18,border:'1px solid '+C.bdr}}>
            <div style={{fontFamily:HEAD,fontWeight:700,fontSize:14,marginBottom:12}}>Summary</div>
            {[[f.name,'Product'],[f.company,'Company'],[f.cat,'Category'],[fm(effBuy(),'BDT'),'Buy Price'],[fm(parseFloat(f.sell)||0,'BDT'),'Sell Price'],[marginPct()+'%','Margin']].map(([v,l])=>(
              <div key={l} style={{display:'flex',justifyContent:'space-between',marginBottom:7,fontSize:13}}>
                <span style={{color:C.ink3}}>{l}</span>
                <span style={{fontWeight:600,color:C.ink,fontFamily:l.includes('Price')||l.includes('Margin')?MONO:FONT}}>{v||'—'}</span>
              </div>
            ))}
          </div>
          <div style={{display:'flex',gap:10}}>
            <Btn full v="ghost" onClick={()=>setStep(2)}>← Back</Btn>
            <Btn full v="coral" onClick={save}>Save Product ✓</Btn>
          </div>
        </div>
      )}
    </Sheet>
  );
}

// ── HOME ──────────────────────────────────────────────────────
function Home({products,user,cur,onProfile,setPage,setAdd}){
  const C=useTheme();
  const h=new Date().getHours();
  const greet=h<12?'Good morning':'h<18'?'Good afternoon':'Good evening';
  const totalInv=products.reduce((s,p)=>s+cv(p.buy,p.cur||'BDT',cur)*p.qty,0);
  const totalSell=products.reduce((s,p)=>s+cv(p.sell,p.cur||'BDT',cur)*p.qty,0);
  const expiring=products.filter(p=>p.expire&&dL(p.expire)<=7&&dL(p.expire)>=0);
  const lowStock=products.filter(p=>p.qty<10);

  return(
    <div style={{padding:'0 16px 100px',overflowY:'auto',height:'100vh'}}>
      {/* Hero */}
      <div style={{background:C.heroGrad,borderRadius:'0 0 28px 28px',margin:'0 -16px',padding:'52px 22px 28px',marginBottom:20,position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:-40,right:-40,width:200,height:200,borderRadius:'50%',background:'rgba(255,255,255,.05)'}}/>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <p style={{color:'rgba(255,255,255,.7)',fontSize:13,marginBottom:4}}>{h<12?'Good morning':h<18?'Good afternoon':'Good evening'} 👋</p>
            <h1 style={{fontFamily:HEAD,fontWeight:800,fontSize:26,color:'#fff',letterSpacing:-.5}}>{user.name?.split(' ')[0]||'Welcome'}</h1>
          </div>
          <div onClick={onProfile} style={{width:44,height:44,borderRadius:14,overflow:'hidden',border:'2px solid rgba(255,255,255,.3)',cursor:'pointer',flexShrink:0}}>
            {user.photoURL?<img src={user.photoURL} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<div style={{width:'100%',height:'100%',background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:700,color:'#fff'}}>{(user.name||'U')[0].toUpperCase()}</div>}
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:20}}>
          {[[fm(totalInv,cur),'Investment','📦'],[fm(totalSell,cur),'Sell Value','💰'],[fm(totalSell-totalInv,cur),'Profit','📈'],[products.length+' items','Total Stock','🏪']].map(([v,l,ic])=>(
            <div key={l} style={{background:'rgba(255,255,255,.1)',borderRadius:14,padding:'12px 14px',backdropFilter:'blur(10px)'}}>
              <div style={{fontSize:11,color:'rgba(255,255,255,.6)',marginBottom:3}}>{ic} {l}</div>
              <div style={{fontFamily:MONO,fontWeight:700,fontSize:15,color:'#fff'}}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts */}
      {(expiring.length>0||lowStock.length>0)&&(
        <div style={{marginBottom:20}}>
          <div style={{fontFamily:HEAD,fontWeight:700,fontSize:15,marginBottom:10,color:C.ink}}>⚠️ Alerts</div>
          {expiring.slice(0,2).map(p=>(
            <div key={p.id} style={{background:C.warn+'0e',border:'1px solid '+C.warn+'33',borderRadius:14,padding:'12px 14px',marginBottom:8,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div><div style={{fontWeight:600,fontSize:13,color:C.ink}}>{p.name}</div><div style={{fontSize:11,color:C.ink4}}>Expires soon</div></div>
              <ExpBadge date={p.expire}/>
            </div>
          ))}
          {lowStock.slice(0,2).map(p=>(
            <div key={p.id} style={{background:C.amber+'0e',border:'1px solid '+C.amber+'33',borderRadius:14,padding:'12px 14px',marginBottom:8,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div><div style={{fontWeight:600,fontSize:13,color:C.ink}}>{p.name}</div><div style={{fontSize:11,color:C.ink4}}>Low stock</div></div>
              <span style={{background:C.warn+'18',color:C.warn,borderRadius:99,padding:'3px 10px',fontSize:11,fontWeight:600}}>Only {p.qty}</span>
            </div>
          ))}
        </div>
      )}

      {/* Recent */}
      <div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div style={{fontFamily:HEAD,fontWeight:700,fontSize:15,color:C.ink}}>Recent Products</div>
          <button onClick={()=>setPage('inv')} style={{background:'none',border:'none',color:C.forest,fontWeight:600,cursor:'pointer',fontSize:12,fontFamily:FONT}}>See all →</button>
        </div>
        {products.slice(0,4).map(p=><MC key={p.id} p={p} cur={cur}/>)}
        {products.length===0&&(
          <div style={{textAlign:'center',padding:'40px 0',color:C.ink4}}>
            <div style={{fontSize:48,marginBottom:12}}>📦</div>
            <div style={{fontWeight:600,fontSize:14,color:C.ink3}}>No products yet</div>
            <div style={{fontSize:12,marginTop:6,marginBottom:20}}>Add your first product to get started</div>
            <Btn onClick={()=>setAdd(true)}>+ Add Product</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

// ── INVENTORY ─────────────────────────────────────────────────
function Inv({products,cur,onDel,push}){
  const C=useTheme();
  const [q,setQ]=useState('');
  const [cat,setCat]=useState('All');
  const [sel,setSel]=useState(null);

  const filtered=useMemo(()=>products.filter(p=>{
    const mq=!q||p.name.toLowerCase().includes(q.toLowerCase())||(p.company||'').toLowerCase().includes(q.toLowerCase());
    const mc=cat==='All'||p.cat===cat;
    return mq&&mc;
  }),[products,q,cat]);

  return(
    <div style={{height:'100vh',display:'flex',flexDirection:'column'}}>
      <div style={{padding:'52px 16px 12px',flexShrink:0}}>
        <h2 style={{fontFamily:HEAD,fontWeight:800,fontSize:22,color:C.ink,marginBottom:14}}>Inventory</h2>
        <div style={{position:'relative',marginBottom:12}}>
          <span style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',fontSize:14,opacity:.5}}>🔍</span>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search products..."
            style={{width:'100%',background:C.inputBg,border:'1.5px solid '+C.bdr,borderRadius:13,padding:'12px 14px 12px 42px',color:C.ink,fontSize:14,outline:'none',fontFamily:FONT,transition:'border-color .18s'}}
            onFocus={e=>e.target.style.borderColor=C.forest+'88'} onBlur={e=>e.target.style.borderColor=C.bdr}/>
        </div>
        <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:4}}>
          {CATS.map(c=><button key={c} onClick={()=>setCat(c)} style={{flexShrink:0,padding:'6px 12px',borderRadius:20,fontSize:12,fontWeight:500,border:'1.5px solid',borderColor:cat===c?C.forest:C.bdr,background:cat===c?C.forest+'12':'transparent',color:cat===c?C.forest:C.ink4,cursor:'pointer',transition:'all .15s',fontFamily:FONT}}>{c}</button>)}
        </div>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'0 16px 100px'}}>
        {filtered.length===0?(
          <div style={{textAlign:'center',padding:'60px 0',color:C.ink4}}>
            <div style={{fontSize:48,marginBottom:12}}>📭</div>
            <div style={{fontWeight:600}}>No products found</div>
          </div>
        ):filtered.map(p=><MC key={p.id} p={p} cur={cur} onPress={()=>setSel(p)} onTrash={id=>{onDel(id);push('Moved to trash','success');}}/>)}
      </div>

      {sel&&(
        <Sheet title={sel.name} sub={sel.company+' · '+sel.unit} onClose={()=>setSel(null)}>
          {sel.photo&&<img src={sel.photo} style={{width:'100%',height:180,objectFit:'cover',borderRadius:14,marginBottom:16}}/>}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
            {[[fm(cv(sel.buy,sel.cur||'BDT',cur),cur),'Buy',C.forest],[fm(cv(sel.sell,sel.cur||'BDT',cur),cur),'Sell',C.indigo],[sel.qty+' units','Stock',sel.qty<10?C.warn:C.ok],[((((sel.sell-sel.buy)/sel.buy)*100)||0).toFixed(1)+'%','Margin',C.amber]].map(([v,l,col])=>(
              <div key={l} style={{background:C.bg2,borderRadius:12,padding:'12px 14px',border:'1px solid '+col+'22'}}>
                <div style={{fontSize:10,color:C.ink4,fontWeight:600,textTransform:'uppercase',letterSpacing:.5,marginBottom:4}}>{l}</div>
                <div style={{fontFamily:MONO,fontWeight:700,fontSize:16,color:col}}>{v}</div>
              </div>
            ))}
          </div>
          {sel.expire&&<div style={{marginBottom:14,display:'flex',alignItems:'center',gap:8}}><span style={{fontSize:12,color:C.ink3}}>Expiry:</span><ExpBadge date={sel.expire}/></div>}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
            {[['Category',sel.cat],['Added',sel.added?.slice(0,10)||'—']].map(([l,v])=>(
              <div key={l}><div style={{fontSize:11,color:C.ink4,fontWeight:600,textTransform:'uppercase',letterSpacing:.5,marginBottom:3}}>{l}</div><div style={{fontWeight:500,color:C.ink,fontSize:13}}>{v}</div></div>
            ))}
          </div>

          {/* Price chart */}
          {sel.hist&&sel.hist.length>0&&(
            <div style={{background:C.bg2,borderRadius:14,padding:16,marginBottom:16,border:'1px solid '+C.bdr}}>
              <div style={{fontFamily:HEAD,fontWeight:700,fontSize:13,marginBottom:12}}>Price History (12 months)</div>
              <div style={{display:'flex',alignItems:'flex-end',gap:3,height:60}}>
                {sel.hist.map((h,i)=>{const max=Math.max(...sel.hist.map(x=>x.price));const pct=(h.price/max)*100;return(
                  <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
                    <div style={{width:'100%',background:C.forestG,borderRadius:'3px 3px 0 0',height:pct+'%',minHeight:3,transition:'height .3s'}}/>
                    <div style={{fontSize:8,color:C.ink5,transform:'rotate(-45deg)',marginTop:2}}>{h.month}</div>
                  </div>
                );})}
              </div>
            </div>
          )}
          <Btn full v="danger" onClick={()=>{onDel(sel.id);setSel(null);push('Moved to trash','success');}}>🗑️ Delete Product</Btn>
        </Sheet>
      )}
    </div>
  );
}

// ── ORDERS ────────────────────────────────────────────────────
function Ord({products,push}){
  const C=useTheme();
  const email=lsG(SK)?.email||'guest';
  const [orders,setOrders]=useState(()=>lsG(OK(email),[]));
  const [showAdd,setShowAdd]=useState(false);
  const [newItem,setNewItem]=useState('');
  const [newNotes,setNewNotes]=useState('');
  const save=o=>{setOrders(o);lsS(OK(email),o);};
  const addOrder=()=>{if(!newItem.trim())return;save([...orders,{id:uid(),name:newItem,notes:newNotes,urgent:false,done:false,createdAt:Date.now()}]);setNewItem('');setNewNotes('');setShowAdd(false);push(newItem+' added to orders','success');};
  const toggle=(id,k)=>save(orders.map(o=>o.id===id?{...o,[k]:!o[k]}:o));
  const del=id=>{save(orders.filter(o=>o.id!==id));};
  const lowStock=products.filter(p=>p.qty<10).filter(p=>!orders.some(o=>o.name.toLowerCase()===p.name.toLowerCase()));

  return(
    <div style={{height:'100vh',display:'flex',flexDirection:'column'}}>
      <div style={{padding:'52px 16px 12px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
        <h2 style={{fontFamily:HEAD,fontWeight:800,fontSize:22,color:C.ink}}>To Order</h2>
        <Btn sm onClick={()=>setShowAdd(true)} sx={{gap:5}}>+ Add</Btn>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'0 16px 100px'}}>
        {lowStock.length>0&&(
          <div style={{background:C.warn+'0e',border:'1px solid '+C.warn+'33',borderRadius:14,padding:'12px 14px',marginBottom:16}}>
            <div style={{fontSize:12,color:C.warn,fontWeight:700,marginBottom:8}}>⚠️ Low stock — quick add:</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {lowStock.map(p=><button key={p.id} onClick={()=>{save([...orders,{id:uid(),name:p.name,notes:'Low stock: '+p.qty,urgent:true,done:false,createdAt:Date.now()}]);push(p.name+' added!','success');}} style={{padding:'5px 12px',borderRadius:20,fontSize:12,fontWeight:500,background:C.surf,border:'1.5px solid '+C.warn,color:C.warn,cursor:'pointer',fontFamily:FONT}}>+ {p.name} ({p.qty})</button>)}
            </div>
          </div>
        )}
        {orders.length===0?(
          <div style={{textAlign:'center',padding:'60px 0',color:C.ink4}}>
            <div style={{fontSize:48,marginBottom:12}}>📋</div>
            <div style={{fontWeight:600,fontSize:14,color:C.ink3}}>No orders yet</div>
          </div>
        ):orders.map(o=>(
          <div key={o.id} style={{background:C.surf,border:'1.5px solid '+(o.urgent?C.warn+'44':C.bdr),borderRadius:14,padding:'12px 14px',marginBottom:8,opacity:o.done?.5:1,transition:'opacity .2s'}}>
            <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
              <button onClick={()=>toggle(o.id,'done')} style={{width:22,height:22,borderRadius:6,border:'2px solid '+(o.done?C.ok:C.bdr),background:o.done?C.ok:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1}}>
                {o.done&&<span style={{color:'#fff',fontSize:11,fontWeight:800}}>✓</span>}
              </button>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:14,color:C.ink,textDecoration:o.done?'line-through':''}}>{o.name}</div>
                {o.notes&&<div style={{color:C.ink4,fontSize:12,marginTop:2}}>{o.notes}</div>}
              </div>
              <div style={{display:'flex',gap:6,flexShrink:0}}>
                <button onClick={()=>toggle(o.id,'urgent')} style={{padding:'3px 9px',borderRadius:8,border:'1.5px solid '+(o.urgent?C.warn:C.bdr),background:o.urgent?C.warn+'14':'transparent',color:o.urgent?C.warn:C.ink4,fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:FONT}}>{o.urgent?'🔥 Urgent':'Urgent'}</button>
                <button onClick={()=>del(o.id)} style={{background:'none',border:'none',cursor:'pointer',color:C.ink4,fontSize:14}}>✕</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {showAdd&&(
        <Modal title="Add Order Item" onClose={()=>setShowAdd(false)}>
          <Inp label="Item name" placeholder="e.g. Basmati Rice" value={newItem} onChange={e=>setNewItem(e.target.value)}/>
          <Inp label="Notes (optional)" placeholder="e.g. 5kg bag, urgent" value={newNotes} onChange={e=>setNewNotes(e.target.value)}/>
          <div style={{display:'flex',gap:10,marginTop:4}}>
            <Btn full v="ghost" onClick={()=>setShowAdd(false)}>Cancel</Btn>
            <Btn full onClick={addOrder} dis={!newItem.trim()}>Add Item</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── STATS ─────────────────────────────────────────────────────
function Stat({products,cur}){
  const C=useTheme();
  const totalInv=products.reduce((s,p)=>s+cv(p.buy,p.cur||'BDT',cur)*p.qty,0);
  const totalSell=products.reduce((s,p)=>s+cv(p.sell,p.cur||'BDT',cur)*p.qty,0);
  const profit=totalSell-totalInv;
  const expSoon=products.filter(p=>p.expire&&dL(p.expire)<=30&&dL(p.expire)>=0);
  const catMap={};
  products.forEach(p=>{catMap[p.cat]=(catMap[p.cat]||0)+cv(p.sell,p.cur||'BDT',cur)*p.qty;});
  const cats=Object.entries(catMap).sort((a,b)=>b[1]-a[1]);
  const maxCat=cats[0]?.[1]||1;
  const topMargin=[...products].sort((a,b)=>(((b.sell-b.buy)/b.buy)||0)-(((a.sell-a.buy)/a.buy)||0)).slice(0,3);

  return(
    <div style={{height:'100vh',overflowY:'auto',padding:'52px 16px 100px'}}>
      <h2 style={{fontFamily:HEAD,fontWeight:800,fontSize:22,color:C.ink,marginBottom:20}}>Analytics</h2>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:20}}>
        {[[fm(totalInv,cur),'Investment',C.indigo+'14',C.indigo],[fm(totalSell,cur),'Sell Value',C.ok+'12',C.ok],[fm(profit,cur),'Profit',profit>=0?C.ok+'12':C.danger+'12',profit>=0?C.ok:C.danger],[expSoon.length+' products','Expiring (30d)',C.warn+'12',C.warn]].map(([v,l,bg,col])=>(
          <div key={l} style={{background:bg,borderRadius:16,padding:'14px 16px',border:'1px solid '+col+'22'}}>
            <div style={{fontSize:11,color:col,fontWeight:600,textTransform:'uppercase',letterSpacing:.5,marginBottom:6}}>{l}</div>
            <div style={{fontFamily:MONO,fontWeight:700,fontSize:16,color:col}}>{v}</div>
          </div>
        ))}
      </div>

      {cats.length>0&&(
        <div style={{background:C.surf,borderRadius:20,padding:18,marginBottom:16,border:'1px solid '+C.bdr,boxShadow:C.cardShadow}}>
          <div style={{fontFamily:HEAD,fontWeight:700,fontSize:15,marginBottom:16,color:C.ink}}>Category Breakdown</div>
          {cats.map(([cat,val])=>(
            <div key={cat} style={{marginBottom:12}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:5}}>
                <span style={{fontWeight:500,color:C.ink}}>{CE[cat]||'📦'} {cat}</span>
                <span style={{fontFamily:MONO,color:C.ink3}}>{fm(val,cur)}</span>
              </div>
              <div style={{height:6,background:C.bg2,borderRadius:3,overflow:'hidden'}}>
                <div style={{height:'100%',width:(val/maxCat*100)+'%',background:C.forestG,borderRadius:3,transition:'width .6s ease'}}/>
              </div>
            </div>
          ))}
        </div>
      )}

      {topMargin.length>0&&(
        <div style={{background:C.surf,borderRadius:20,padding:18,border:'1px solid '+C.bdr,boxShadow:C.cardShadow}}>
          <div style={{fontFamily:HEAD,fontWeight:700,fontSize:15,marginBottom:16,color:C.ink}}>🏆 Top Margin Products</div>
          {topMargin.map((p,i)=>(
            <div key={p.id} style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
              <span style={{fontSize:22}}>{'🥇🥈🥉'[i]}</span>
              <Av p={p} size={40} r={12}/>
              <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13,color:C.ink}}>{p.name}</div><div style={{fontSize:11,color:C.ink4}}>{p.company}</div></div>
              <div style={{fontFamily:MONO,fontWeight:700,fontSize:15,color:C.ok}}>{((((p.sell-p.buy)/p.buy)*100)||0).toFixed(1)}%</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── TRASH ─────────────────────────────────────────────────────
function Trash({items,onRestore,onDel,onEmpty}){
  const C=useTheme();
  return(
    <div style={{height:'100vh',display:'flex',flexDirection:'column'}}>
      <div style={{padding:'52px 16px 12px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
        <h2 style={{fontFamily:HEAD,fontWeight:800,fontSize:22,color:C.ink}}>Trash</h2>
        {items.length>0&&<Btn sm v="danger" onClick={onEmpty}>Empty All</Btn>}
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'0 16px 100px'}}>
        {items.length===0?(
          <div style={{textAlign:'center',padding:'60px 0',color:C.ink4}}>
            <div style={{fontSize:48,marginBottom:12}}>🗑️</div>
            <div style={{fontWeight:600}}>Trash is empty</div>
          </div>
        ):items.map(p=>(
          <div key={p.id} style={{background:C.surf,border:'1.5px solid '+C.bdr,borderRadius:14,padding:'12px 14px',marginBottom:8,display:'flex',alignItems:'center',gap:12}}>
            <Av p={p} size={44} r={12}/>
            <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13,color:C.ink}}>{p.name}</div><div style={{fontSize:11,color:C.ink4}}>{p.company}</div></div>
            <div style={{display:'flex',gap:6,flexShrink:0}}>
              <Btn sm onClick={()=>onRestore(p.id)}>↩ Restore</Btn>
              <Btn sm v="danger" onClick={()=>onDel(p.id)}>✕</Btn>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── NOTIFICATIONS PANEL ───────────────────────────────────────
function NotifPanel({products,onClose}){
  const C=useTheme();
  const [perm,setPerm]=useState(getNotifPerm());
  const [checking,setChecking]=useState(false);

  const request=async()=>{
    if(!notifSupported()){alert('Notifications not supported in this browser.');return;}
    setChecking(true);
    const p=await Notification.requestPermission();
    setPerm(p);setChecking(false);
    if(p==='granted'){
      new Notification('🎉 Shelfie Notifications On!',{body:'You will get alerts for expiring products and low stock.'});
    }
  };

  const testNotif=()=>{
    if(perm==='granted'){new Notification('🧪 Test Notification',{body:'Notifications are working correctly!'});}
  };

  const alerts=[];
  products.forEach(p=>{
    const d=dL(p.expire);
    if(d<0)alerts.push({type:'danger',icon:'❌',msg:p.name+' — EXPIRED',prod:p});
    else if(d===0)alerts.push({type:'danger',icon:'⚠️',msg:p.name+' — Expires TODAY',prod:p});
    else if(d<=7)alerts.push({type:'warn',icon:'📅',msg:p.name+' — '+d+' days left',prod:p});
    if(p.qty<10)alerts.push({type:'warn',icon:'📦',msg:p.name+' — Low stock: '+p.qty,prod:p});
  });

  return(
    <Sheet title="Notifications" sub={alerts.length+' active alerts'} onClose={onClose}>
      {/* Permission status */}
      <div style={{background:perm==='granted'?C.ok+'0e':C.warn+'0e',border:'1px solid '+(perm==='granted'?C.ok:C.warn)+'33',borderRadius:14,padding:'14px 16px',marginBottom:16,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontWeight:600,fontSize:13,color:C.ink}}>{perm==='granted'?'✅ Notifications On':'🔔 Notifications Off'}</div>
          <div style={{fontSize:11,color:C.ink4,marginTop:2}}>{perm==='granted'?'You receive expiry & stock alerts':'Enable to get push notifications'}</div>
        </div>
        {perm!=='granted'&&<Btn sm onClick={request} dis={checking}>{checking?<><Spin s={14}/> Requesting...</>:'Enable'}</Btn>}
        {perm==='granted'&&<Btn sm v="soft" onClick={testNotif}>Test</Btn>}
      </div>

      {perm==='denied'&&(
        <div style={{background:C.danger+'0e',border:'1px solid '+C.danger+'28',borderRadius:12,padding:'12px 14px',marginBottom:16,fontSize:13,color:C.danger}}>
          ⚠️ Blocked in browser. Go to browser settings → Site settings → Notifications to re-enable.
        </div>
      )}

      {/* Alert list */}
      {alerts.length===0?(
        <div style={{textAlign:'center',padding:'30px 0',color:C.ink4}}>
          <div style={{fontSize:40,marginBottom:10}}>✅</div>
          <div style={{fontWeight:600}}>All good! No alerts.</div>
        </div>
      ):(
        <>
          <div style={{fontFamily:HEAD,fontWeight:700,fontSize:13,color:C.ink,marginBottom:10}}>Current Alerts</div>
          {alerts.map((a,i)=>(
            <div key={i} style={{background:a.type==='danger'?C.danger+'0e':C.warn+'0e',border:'1px solid '+(a.type==='danger'?C.danger:C.warn)+'28',borderRadius:12,padding:'10px 14px',marginBottom:8,display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:18}}>{a.icon}</span>
              <span style={{fontSize:13,color:C.ink,fontWeight:500}}>{a.msg}</span>
            </div>
          ))}
          {perm==='granted'&&(
            <Btn full v="soft" sx={{marginTop:8}} onClick={()=>checkExpiryNotifs(products)}>Send All Notifications Now</Btn>
          )}
        </>
      )}
    </Sheet>
  );
}

// ── PROFILE ───────────────────────────────────────────────────
function Prof({user,onClose,onLogout,cur,onCur,push,themeMode,setThemeMode,onInstall}){
  const C=useTheme();
  const [showNotif,setShowNotif]=useState(false);
  const notifPerm=getNotifPerm();

  return(
    <Sheet title="Profile" onClose={onClose}>
      {/* Avatar */}
      <div style={{textAlign:'center',marginBottom:24,paddingTop:8}}>
        <div style={{width:72,height:72,borderRadius:22,overflow:'hidden',margin:'0 auto 12px',border:'3px solid '+C.bdr}}>
          {user.photoURL?<img src={user.photoURL} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<div style={{width:'100%',height:'100%',background:C.forestG,display:'flex',alignItems:'center',justifyContent:'center',fontSize:30,fontWeight:700,color:'#fff'}}>{(user.name||'U')[0].toUpperCase()}</div>}
        </div>
        <div style={{fontFamily:HEAD,fontWeight:700,fontSize:18,color:C.ink}}>{user.name}</div>
        <div style={{color:C.ink3,fontSize:13,marginTop:3}}>{user.email}</div>
        {user.joined&&<div style={{color:C.ink5,fontSize:11,marginTop:3}}>Member since {new Date(user.joined).toLocaleDateString('en-US',{year:'numeric',month:'long'})}</div>}
      </div>

      {/* Install App */}
      <div onClick={onInstall} style={{background:C.bg2,borderRadius:14,padding:'14px 16px',marginBottom:10,cursor:'pointer',display:'flex',alignItems:'center',gap:12,border:'1px solid '+C.bdr}} onMouseOver={e=>e.currentTarget.style.background=C.bg3} onMouseOut={e=>e.currentTarget.style.background=C.bg2}>
        <div style={{width:38,height:38,borderRadius:11,background:C.forestG,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>📲</div>
        <div style={{flex:1}}><div style={{fontWeight:600,fontSize:14,color:C.ink}}>Download App</div><div style={{fontSize:11,color:C.ink4,marginTop:1}}>Install to home screen</div></div>
        <span style={{color:C.ink4}}>›</span>
      </div>

      {/* Notifications */}
      <div onClick={()=>setShowNotif(true)} style={{background:C.bg2,borderRadius:14,padding:'14px 16px',marginBottom:10,cursor:'pointer',display:'flex',alignItems:'center',gap:12,border:'1px solid '+C.bdr}} onMouseOver={e=>e.currentTarget.style.background=C.bg3} onMouseOut={e=>e.currentTarget.style.background=C.bg2}>
        <div style={{width:38,height:38,borderRadius:11,background:notifPerm==='granted'?C.ok+'22':C.warn+'22',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>🔔</div>
        <div style={{flex:1}}><div style={{fontWeight:600,fontSize:14,color:C.ink}}>Notifications</div><div style={{fontSize:11,color:notifPerm==='granted'?C.ok:C.ink4,marginTop:1}}>{notifPerm==='granted'?'✅ Enabled':'Tap to enable'}</div></div>
        <span style={{color:C.ink4}}>›</span>
      </div>

      {/* Theme */}
      <div style={{background:C.bg2,borderRadius:14,padding:'14px 16px',marginBottom:10,border:'1px solid '+C.bdr}}>
        <div style={{fontWeight:600,fontSize:14,color:C.ink,marginBottom:12}}>Appearance</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
          {[{v:'system',l:'System',i:'🌐'},{v:'light',l:'Light',i:'☀️'},{v:'dark',l:'Dark',i:'🌙'}].map(t=>(
            <button key={t.v} onClick={()=>setThemeMode(t.v)} style={{padding:'10px 6px',borderRadius:12,border:'1.5px solid',borderColor:themeMode===t.v?C.forest:C.bdr,background:themeMode===t.v?C.forest+'12':'transparent',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:5,fontFamily:FONT}}>
              <span style={{fontSize:18}}>{t.i}</span>
              <span style={{fontSize:11,fontWeight:500,color:themeMode===t.v?C.forest:C.ink3}}>{t.l}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Currency */}
      <div style={{background:C.bg2,borderRadius:14,padding:'14px 16px',marginBottom:10,border:'1px solid '+C.bdr}}>
        <div style={{fontWeight:600,fontSize:14,color:C.ink,marginBottom:12}}>Currency</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
          {CURR.map(c=><button key={c.code} onClick={()=>onCur(c.code)} style={{padding:'6px 12px',borderRadius:20,fontSize:12,fontWeight:600,border:'1.5px solid',borderColor:cur===c.code?C.forest:C.bdr,background:cur===c.code?C.forest+'12':'transparent',color:cur===c.code?C.forest:C.ink3,cursor:'pointer',fontFamily:MONO,transition:'all .15s'}}>{c.code}</button>)}
        </div>
      </div>

      <Btn full v="danger" onClick={onLogout} sx={{marginTop:8}}>Sign Out</Btn>

      {showNotif&&<NotifPanel products={lsG(DK(user.email),DEMO)} onClose={()=>setShowNotif(false)}/>}
    </Sheet>
  );
}

// ── CURRENCY PICKER ───────────────────────────────────────────
function CurPick({cur,onChange,onClose}){
  const C=useTheme();
  return(
    <Modal title="Select Currency" onClose={onClose}>
      <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:4}}>
        {CURR.map(c=>(
          <button key={c.code} onClick={()=>{onChange(c.code);onClose();}} style={{padding:'8px 14px',borderRadius:20,fontSize:13,fontWeight:600,border:'1.5px solid',borderColor:cur===c.code?C.forest:C.bdr,background:cur===c.code?C.forest+'12':'transparent',color:cur===c.code?C.forest:C.ink,cursor:'pointer',fontFamily:MONO,transition:'all .15s'}}>{c.code}</button>
        ))}
      </div>
    </Modal>
  );
}

// ── INSTALL APP ───────────────────────────────────────────────
function InstallApp({onClose}){
  const C=useTheme();
  const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
  const isAndroid=/android/i.test(navigator.userAgent);
  const [deferredPrompt,setDP]=useState(null);
  useEffect(()=>{const h=e=>{e.preventDefault();setDP(e);};window.addEventListener('beforeinstallprompt',h);return()=>window.removeEventListener('beforeinstallprompt',h);},[]);
  const nativeInstall=async()=>{if(deferredPrompt){deferredPrompt.prompt();onClose();}};
  const steps=isIOS?['Open this page in Safari','Tap the Share button (box with arrow)','Tap "Add to Home Screen"','Tap "Add" to confirm']:isAndroid?['Open in Chrome browser','Tap the 3-dot menu (⋮)','Tap "Add to Home Screen"','Tap "Add" to confirm']:['Open in Chrome','Click the install icon (⊕) in address bar','Or: Chrome menu → "Install Shelfie Pro"','Click Install to confirm'];
  return(
    <Sheet title="Install Shelfie" sub="Add to your home screen" onClose={onClose}>
      <div style={{textAlign:'center',marginBottom:24}}><Logo size={64}/><div style={{fontFamily:HEAD,fontWeight:700,fontSize:16,marginTop:12,color:C.ink}}>Shelfie Pro</div><div style={{fontSize:12,color:C.ink4,marginTop:2}}>{isIOS?'iPhone / iPad':isAndroid?'Android':'Desktop'}</div></div>
      {deferredPrompt&&<Btn full v="coral" onClick={nativeInstall} sx={{marginBottom:16}}>📲 Install Now (One Tap)</Btn>}
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {steps.map((s,i)=>(
          <div key={i} style={{display:'flex',gap:12,alignItems:'flex-start',background:C.bg2,borderRadius:12,padding:'12px 14px',border:'1px solid '+C.bdr}}>
            <div style={{width:24,height:24,borderRadius:'50%',background:C.forestG,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'#fff',flexShrink:0}}>{i+1}</div>
            <div style={{fontSize:13,color:C.ink,lineHeight:1.6}}>{s}</div>
          </div>
        ))}
      </div>
    </Sheet>
  );
}

// ── APP ───────────────────────────────────────────────────────
function App(){
  const [themeMode,setThemeMode_]=useState(()=>lsG(THEMEK,'system'));
  const [isDark,setIsDark]=useState(false);
  const [user,setUser]=useState(null);
  const [prods,setProds]=useState(DEMO);
  const [trash,setTrash]=useState([]);
  const [cur,setCur]=useState('BDT');
  const [page,setPage]=useState('home');
  const [showAdd,setAdd]=useState(false);
  const [showProf,setProf]=useState(false);
  const [showCurr,setShowCurr]=useState(false);
  const [showInstall,setShowInstall]=useState(false);
  const [expA,setExpA]=useState(null);
  const [boot,setBoot]=useState(true);
  const {list,push}=useToasts();

  const C=isDark?THEMES.dark:THEMES.light;

  // Theme
  const setThemeMode=useCallback((m)=>{
    setThemeMode_(m);lsS(THEMEK,m);
    const dark=m==='dark'||(m==='system'&&window.matchMedia('(prefers-color-scheme:dark)').matches);
    setIsDark(dark);document.body.className=dark?'dark':'light';
  },[]);

  useEffect(()=>{
    const m=lsG(THEMEK,'system');
    const dark=m==='dark'||(m==='system'&&window.matchMedia('(prefers-color-scheme:dark)').matches);
    setIsDark(dark);document.body.className=dark?'dark':'light';
    if(m==='system'){
      const mq=window.matchMedia('(prefers-color-scheme:dark)');
      const h=()=>{const d=mq.matches;setIsDark(d);document.body.className=d?'dark':'light';};
      mq.addEventListener('change',h);return()=>mq.removeEventListener('change',h);
    }
  },[]);

  // Firebase auth listener
  useEffect(()=>{
    const unsub=onAuthStateChanged(fbAuth,async(fbUser)=>{
      if(fbUser){
        const u={name:fbUser.displayName||fbUser.email?.split('@')[0],email:fbUser.email,uid:fbUser.uid,avatar:(fbUser.displayName||'U')[0].toUpperCase(),photoURL:fbUser.photoURL,provider:fbUser.providerData[0]?.providerId,joined:fbUser.metadata.creationTime||new Date().toISOString()};
        setUser(u);lsS(SK,u);
        // Load from Firestore first, fallback to localStorage
        const [fsData,fsSettings]=await Promise.all([fsLoad(fbUser.uid),fsLoadSettings(fbUser.uid)]);
        const savedProds=fsData||lsG(DK(fbUser.email));
        const savedCur=fsSettings?.currency||lsG(CKs(fbUser.email),'BDT');
        const savedTrash=lsG(TK(fbUser.email),[]);
        if(savedProds&&savedProds.length>0)setProds(savedProds);
        setCur(savedCur);setTrash(savedTrash);
        push('Welcome back, '+(fbUser.displayName||'').split(' ')[0]||'!','success');
        // Check expiry notifications
        setTimeout(()=>checkExpiryNotifs(savedProds||[]),2000);
      }else{
        setUser(null);setProds(DEMO);
      }
      setBoot(false);
    });
    return unsub;
  },[]);

  // Sync data
  useEffect(()=>{if(!user)return;lsS(DK(user.email),prods);fsSave(user.uid,prods).catch(()=>{});},[prods,user]);
  useEffect(()=>{if(!user)return;lsS(CKs(user.email),cur);fsSaveSettings(user.uid,{currency:cur}).catch(()=>{});},[cur,user]);
  useEffect(()=>{if(!user)return;lsS(TK(user.email),trash);},[trash,user]);

  // Expiry dialog
  useEffect(()=>{if(!user)return;const e=prods.find(p=>p.expire&&dL(p.expire)<0&&!p.expConf);if(e&&(!expA||expA.id!==e.id))setExpA(e);},[prods,user]);

  const login=async(u)=>{
    setUser(u);lsS(SK,u);
    const [fsData,fsSettings]=await Promise.all([fsLoad(u.uid),fsLoadSettings(u.uid)]);
    const savedProds=fsData||lsG(DK(u.email));
    const savedCur=fsSettings?.currency||lsG(CKs(u.email),'BDT');
    if(savedProds&&savedProds.length>0)setProds(savedProds);
    setCur(savedCur);setTrash(lsG(TK(u.email),[]));
    push('Welcome to Shelfie! 🎉','success');
    setTimeout(()=>checkExpiryNotifs(savedProds||[]),2000);
    setBoot(false);
  };

  const logout=async()=>{
    try{await fbSignOut(fbAuth);}catch{}
    localStorage.removeItem(SK);
    setUser(null);setProf(false);setPage('home');setProds(DEMO);
  };

  const addProd=(np)=>{
    setProds(prev=>{const updated=[np,...prev];return updated;});
  };

  const mvTrash=id=>{
    const p=prods.find(x=>x.id===id);
    if(p){setTrash(t=>[{...p,dAt:new Date().toISOString()},...t].slice(0,50));setProds(prev=>prev.filter(x=>x.id!==id));}
  };

  const restore=id=>{
    const p=trash.find(x=>x.id===id);
    if(p){setProds(prev=>[{...p,dAt:undefined},...prev]);setTrash(t=>t.filter(x=>x.id!==id));push('Restored!','success');}
  };

  const NAV=[
    {id:'home',icon:'⊞',lbl:'Home'},
    {id:'inv',icon:'▤',lbl:'Stock'},
    {id:'lens',icon:'◉',lbl:'Lens',ctr:true},
    {id:'ord',icon:'✎',lbl:'Orders'},
    {id:'stats',icon:'▲',lbl:'Stats'},
  ];

  if(boot)return(
    <ThemeCtx.Provider value={C}>
      <div style={{minHeight:'100vh',background:C.bg,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:FONT,position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:'15%',right:'8%',width:200,height:200,borderRadius:'50%',background:'radial-gradient(circle,'+C.forest+'12,transparent 65%)',animation:'orbFloat 8s ease-in-out infinite'}}/>
        <div style={{marginBottom:22,animation:'floatY 3s ease-in-out infinite'}}><Logo size={78}/></div>
        <div style={{fontSize:36,fontWeight:900,letterSpacing:-1.5,fontFamily:HEAD,marginBottom:4}}>
          <span style={{color:C.ink}}>shelf</span><span style={{color:C.coral}}>ie</span>
        </div>
        <div style={{fontSize:11,color:C.ink3,fontWeight:600,letterSpacing:3,textTransform:'uppercase',marginBottom:28}}>Pro Edition</div>
        <Spin s={22}/>
      </div>
    </ThemeCtx.Provider>
  );

  if(!user)return(
    <ThemeCtx.Provider value={C}>
      <Auth onLogin={login}/>
      <Toasts list={list}/>
    </ThemeCtx.Provider>
  );

  return(
    <ThemeCtx.Provider value={C}>
      <div style={{fontFamily:FONT,background:C.bg,minHeight:'100vh',color:C.ink,maxWidth:480,margin:'0 auto',position:'relative'}}>
        {/* Ambient bg */}
        <div style={{position:'fixed',top:0,left:0,right:0,height:'35vh',background:'radial-gradient(ellipse at 75% 0%,'+C.coral+'06,transparent 55%),radial-gradient(ellipse at 15% 0%,'+C.forest+'05,transparent 50%)',pointerEvents:'none',zIndex:0,maxWidth:480,margin:'0 auto'}}/>

        <div style={{position:'relative',zIndex:1}}>
          {page==='home'&&<Home products={prods} user={user} cur={cur} onProfile={()=>setProf(true)} onCur={()=>setShowCurr(true)} setPage={setPage} setAdd={setAdd}/>}
          {page==='inv'&&<Inv products={prods} cur={cur} onDel={mvTrash} push={push}/>}
          {page==='lens'&&<LensSearch products={prods} cur={cur} push={push}/>}
          {page==='ord'&&<Ord products={prods} push={push}/>}
          {page==='stats'&&<Stat products={prods} cur={cur}/>}
          {page==='trash'&&<Trash items={trash} onRestore={restore} onDel={id=>setTrash(t=>t.filter(x=>x.id!==id))} onEmpty={()=>setTrash([])}/>}
        </div>

        {/* FAB + */}
        <div onClick={()=>setAdd(true)} style={{position:'fixed',bottom:88,right:18,zIndex:300,width:52,height:52,borderRadius:'50%',background:C.forestG,display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,cursor:'pointer',color:'#fff',boxShadow:'0 6px 24px '+C.forest+'35',transition:'transform .2s',fontWeight:800}} onMouseOver={e=>e.currentTarget.style.transform='scale(1.1)'} onMouseOut={e=>e.currentTarget.style.transform='scale(1)'}>+</div>

        {/* Trash button */}
        <div onClick={()=>setPage('trash')} style={{position:'fixed',bottom:88,left:18,zIndex:150,background:C.surf,border:'1.5px solid '+C.bdr,borderRadius:13,padding:'8px 13px',cursor:'pointer',display:'flex',alignItems:'center',gap:6,fontSize:12,color:C.ink3,fontWeight:600,boxShadow:C.cardShadow}}>
          🗑️ {trash.length>0&&<span style={{background:C.danger,color:'#fff',borderRadius:'50%',width:18,height:18,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800}}>{trash.length}</span>}
        </div>

        {/* Bottom Nav */}
        <div style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:480,background:C.navBg,borderTop:'1px solid '+C.bdr,backdropFilter:'blur(24px)',zIndex:200,display:'flex',paddingBottom:'env(safe-area-inset-bottom)'}}>
          {NAV.map(n=>(
            <div key={n.id} onClick={()=>setPage(n.id)} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:n.ctr?'4px 0 12px':'10px 0 12px',cursor:'pointer',position:'relative'}}>
              {n.ctr?(
                <div style={{width:52,height:52,borderRadius:'50%',marginTop:-22,background:C.coralG,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,color:'#fff',boxShadow:'0 6px 20px '+C.coral+'35',border:'3px solid '+C.bg,transition:'transform .2s'}} onMouseOver={e=>e.currentTarget.style.transform='scale(1.08)'} onMouseOut={e=>e.currentTarget.style.transform='scale(1)'}>{n.icon}</div>
              ):(
                <>
                  <div style={{fontSize:17,marginBottom:3,color:page===n.id?C.forest:C.ink4,transition:'color .2s'}}>{n.icon}</div>
                  <div style={{fontSize:9,fontWeight:700,letterSpacing:.5,color:page===n.id?C.forest:C.ink4,textTransform:'uppercase',transition:'color .2s'}}>{n.lbl}</div>
                  {page===n.id&&<div style={{position:'absolute',bottom:0,width:20,height:2.5,background:C.forestG,borderRadius:'2px 2px 0 0'}}/>}
                </>
              )}
            </div>
          ))}
        </div>

        <Toasts list={list}/>

        {/* Expiry alert dialog */}
        {expA&&!expA.expConf&&(
          <div style={{position:'fixed',inset:0,background:C.modalBg,zIndex:800,display:'flex',alignItems:'center',justifyContent:'center',padding:24,backdropFilter:'blur(8px)'}}>
            <div className="pp" style={{background:C.surf,borderRadius:24,padding:28,width:'100%',maxWidth:360,boxShadow:'0 24px 80px rgba(0,0,0,.2)',border:'1.5px solid '+C.bdr}}>
              <div style={{width:58,height:58,borderRadius:18,background:C.warn+'12',border:'1.5px solid '+C.warn+'33',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,margin:'0 auto 18px'}}>📅</div>
              <div style={{textAlign:'center',marginBottom:22}}>
                <div style={{fontSize:18,fontWeight:800,color:C.ink,marginBottom:7,fontFamily:HEAD}}>Product Expired</div>
                <div style={{fontSize:13,color:C.ink3,lineHeight:1.75}}><strong style={{color:C.ink}}>{expA.name}</strong> has passed its expiry date. Did you remove it from the shelf?</div>
              </div>
              <div style={{display:'flex',gap:10}}>
                <Btn v="ghost" onClick={()=>setExpA(null)} sx={{flex:1}}>Not Yet</Btn>
                <Btn onClick={()=>{setProds(prev=>prev.map(p=>p.id===expA.id?{...p,expConf:true}:p));setExpA(null);push('Alert dismissed.','success');}} sx={{flex:2}}>Yes, Removed ✓</Btn>
              </div>
            </div>
          </div>
        )}

        {showAdd&&<AddProd onAdd={addProd} onClose={()=>setAdd(false)} all={prods} cur={cur} push={push}/>}
        {showProf&&<Prof user={user} onClose={()=>setProf(false)} onLogout={logout} cur={cur} onCur={c=>{if(c)setCur(c);else setShowCurr(true);}} push={push} themeMode={themeMode} setThemeMode={setThemeMode} onInstall={()=>{setProf(false);setShowInstall(true);}}/>}
        {showCurr&&<CurPick cur={cur} onChange={setCur} onClose={()=>setShowCurr(false)}/>}
        {showInstall&&<InstallApp onClose={()=>setShowInstall(false)}/>}
      </div>
    </ThemeCtx.Provider>
  );
}

ReactDOM.createRoot(document.getElementById('app')).render(<App/>);
