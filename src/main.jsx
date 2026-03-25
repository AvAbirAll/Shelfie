import React,{useState,useEffect,useRef,useCallback,useMemo,createContext,useContext} from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// ── FIREBASE — bundled by Vite, no CDN needed ─────────────────
import { initializeApp } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider,
  signInWithPopup,          // ✅ correct import — not window._fb
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

const fbApp = initializeApp({
  apiKey:            import.meta.env.VITE_API_KEY            || "AIzaSyBvbp6Z3Ha4FCmuZ2ErQ9xVB0teD2s8JuY",
  authDomain:        import.meta.env.VITE_AUTH_DOMAIN        || "shelfie-911.firebaseapp.com",
  projectId:         import.meta.env.VITE_PROJECT_ID         || "shelfie-911",
  storageBucket:     import.meta.env.VITE_STORAGE_BUCKET     || "shelfie-911.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_MESSAGING_ID       || "146732929065",
  appId:             import.meta.env.VITE_APP_ID             || "1:146732929065:web:668e213d55498436b20c38"
});

const fbAuth = getAuth(fbApp);
const fbDb   = getFirestore(fbApp);

// ✅ Google provider — correct pattern
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
    danger:'#C22B2B',dangerL:'#E04040',
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
    danger:'#E04040',dangerL:'#F06060',
    navBg:'rgba(13,13,26,0.94)',
    heroGrad:'linear-gradient(135deg,#1a0a2e,#16102e)',
    cardShadow:'0 2px 8px rgba(0,0,0,.3)',
    modalBg:'rgba(0,0,0,.72)',
    inputBg:'#1a1a35',inputFocusBg:'#1f1f3d',
    sheetBg:'#16162e',sheetBorder:'#ffffff12',
  }
};
const HEAD="'Syne',system-ui,sans-serif";
const FONT="'DM Sans',system-ui,sans-serif";
const MONO="'DM Mono',monospace";
const ThemeCtx=createContext(THEMES.light);
const useTheme=()=>useContext(ThemeCtx);

// ── CONSTANTS ─────────────────────────────────────────────────
const CURR=[
  {code:'EUR',sym:'EUR',name:'Euro'},{code:'USD',sym:'USD',name:'US Dollar'},
  {code:'GBP',sym:'GBP',name:'British Pound'},{code:'BDT',sym:'BDT',name:'Bangladeshi Taka'},
  {code:'INR',sym:'INR',name:'Indian Rupee'},{code:'JPY',sym:'JPY',name:'Japanese Yen'},
  {code:'AED',sym:'AED',name:'UAE Dirham'},{code:'SGD',sym:'SGD',name:'Singapore Dollar'},
  {code:'CAD',sym:'CAD',name:'Canadian Dollar'},{code:'AUD',sym:'AUD',name:'Australian Dollar'},
  {code:'TRY',sym:'TRY',name:'Turkish Lira'},{code:'SAR',sym:'SAR',name:'Saudi Riyal'},
  {code:'CHF',sym:'CHF',name:'Swiss Franc'},{code:'CNY',sym:'CNY',name:'Chinese Yuan'},
];
const RATES={BDT:1,USD:.0091,EUR:.0084,GBP:.0072,INR:.76,JPY:1.38,AED:.033,SGD:.012,CAD:.012,AUD:.014,TRY:.29,SAR:.034,CHF:.0082,CNY:.066};
const cv=(a,f,t)=>+((a/(RATES[f]||1))*(RATES[t]||1)).toFixed(2);
const fm=(a,c)=>{const x=CURR.find(v=>v.code===c)||CURR[0];const n=Math.abs(a);const s=a<0?'-':'';return s+x.sym+' '+(n>=1000?n.toLocaleString('en',{maximumFractionDigits:0}):n.toFixed(2));};

const CATS=['All','Grains','Spices','Drinks','Dairy','Snacks','Vegetables','Fruits','Cleaning','Personal Care','Other'];
const CE={Grains:'🌾',Spices:'🌿',Drinks:'🥤',Dairy:'🥛',Snacks:'🍿',Vegetables:'🥦',Fruits:'🍎',Cleaning:'🧹','Personal Care':'🧴',Other:'📦'};
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const mkH=b=>Array.from({length:12},(_,i)=>{const d=new Date();d.setMonth(d.getMonth()-11+i);return{month:MON[d.getMonth()],year:d.getFullYear(),price:Math.max(1,+(b*(.85+Math.random()*.3)).toFixed(2)),restocked:Math.random()>.72};});
const dL=d=>Math.ceil((new Date(d)-new Date())/86400000);
const genId=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36);

// ── STORAGE ───────────────────────────────────────────────────
const SK='sh3_s',UK='sh3_u',THEMEK='sh3_theme';
const DK=e=>'sh3_d_'+e, CKs=e=>'sh3_c_'+e, TK=e=>'sh3_t_'+e, OK=e=>'sh3_o_'+e;
const lsG=(k,d=null)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch{return d;}};
const lsS=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}};

// ── FIRESTORE ─────────────────────────────────────────────────
const fsSave=async(uid,prods)=>{try{await setDoc(doc(fbDb,'users',uid,'data','products'),{items:JSON.stringify(prods),updated:Date.now()});}catch(e){console.warn('FS:',e.message);}};
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
const ONLINE={
  rice:[{name:'Aromatic Jasmine Rice 5kg',brand:'Thai Heritage',price:'EUR 12.99',img:'🌾',match:92,store:'Amazon'},{name:'Basmati Rice Premium 2kg',brand:'Tilda',price:'EUR 8.49',img:'🌾',match:88,store:'Carrefour'},{name:'Long Grain White Rice 1kg',brand:'SunRice',price:'EUR 3.20',img:'🌾',match:74,store:'Esselunga'}],
  oil:[{name:'Extra Virgin Olive Oil 1L',brand:'Bertolli',price:'EUR 9.99',img:'🫙',match:90,store:'Amazon'},{name:'Sunflower Oil 2L',brand:'Crisco',price:'EUR 4.50',img:'🫙',match:85,store:'Lidl'},{name:'Coconut Oil 500ml',brand:'Organic Harvest',price:'EUR 7.80',img:'🫙',match:70,store:'Naturalia'}],
  juice:[{name:'Mango Nectar 1L',brand:'Tropicana',price:'EUR 2.99',img:'🥭',match:94,store:'Conad'},{name:'Orange Juice 1.5L',brand:'Don Simon',price:'EUR 1.89',img:'🍊',match:80,store:'Lidl'},{name:'Mixed Fruit Juice',brand:'Yoga',price:'EUR 2.40',img:'🍹',match:72,store:'Esselunga'}],
  milk:[{name:'Whole Milk 1L',brand:'Parmalat',price:'EUR 1.49',img:'🥛',match:96,store:'Conad'},{name:'UHT Skimmed Milk',brand:'Granarolo',price:'EUR 1.29',img:'🥛',match:88,store:'Carrefour'},{name:'Oat Milk 1L',brand:'Oatly',price:'EUR 2.99',img:'🥛',match:65,store:'Amazon'}],
  chips:[{name:"Lay's Classic 150g",brand:"Lay's",price:'EUR 2.49',img:'🍟',match:92,store:'Conad'},{name:'Pringles Original 165g',brand:'Pringles',price:'EUR 3.19',img:'🥫',match:85,store:'Esselunga'},{name:'Kettle Sea Salt 142g',brand:'Kettle',price:'EUR 3.49',img:'🍿',match:78,store:'Amazon'}],
  spice:[{name:'Turmeric Powder 100g',brand:'Schwartz',price:'EUR 2.29',img:'🌿',match:91,store:'Esselunga'},{name:'Cumin Powder 80g',brand:'Ducros',price:'EUR 1.89',img:'🌿',match:75,store:'Conad'},{name:'Garam Masala 50g',brand:'Shan',price:'EUR 3.50',img:'🌿',match:68,store:'Amazon'}],
  dairy:[{name:'Greek Yogurt 500g',brand:'Fage',price:'EUR 3.49',img:'🥛',match:82,store:'Conad'},{name:'Cheddar Cheese 200g',brand:'Cathedral City',price:'EUR 4.99',img:'🧀',match:74,store:'Esselunga'}],
  default:[{name:'Similar Product A',brand:'Generic Brand',price:'EUR 4.99',img:'📦',match:80,store:'Amazon'},{name:'Similar Product B',brand:'Store Brand',price:'EUR 3.50',img:'📦',match:72,store:'Carrefour'},{name:'Similar Product C',brand:'Premium Brand',price:'EUR 6.99',img:'📦',match:65,store:'Esselunga'}],
};
const getOnline=n=>{const l=n.toLowerCase();if(l.includes('rice'))return ONLINE.rice;if(l.includes('oil'))return ONLINE.oil;if(l.includes('juice'))return ONLINE.juice;if(l.includes('milk'))return ONLINE.milk;if(l.includes('chip')||l.includes('crisp'))return ONLINE.chips;if(l.includes('spice')||l.includes('turmeric')||l.includes('cumin')||l.includes('masala'))return ONLINE.spice;if(l.includes('dairy')||l.includes('cheese')||l.includes('yogurt'))return ONLINE.dairy;return ONLINE.default;};

// ── UTILS ─────────────────────────────────────────────────────
const compress=file=>new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>{const img=new Image();img.onload=()=>{const c=document.createElement('canvas');let w=img.width,h=img.height,max=500;if(w>h&&w>max){h=Math.round(h*max/w);w=max;}else if(h>max){w=Math.round(w*max/h);h=max;}c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);res(c.toDataURL('image/jpeg',.68));};img.onerror=rej;img.src=e.target.result;};r.onerror=rej;r.readAsDataURL(file);});
const notifPerm=()=>'Notification' in window?Notification.permission:'unsupported';
const sendNotif=(title,body)=>{if(notifPerm()==='granted')try{new Notification(title,{body});}catch{}};
const checkExpiry=prods=>{if(notifPerm()!=='granted')return;prods.forEach(p=>{const d=dL(p.expire);if(d===0)sendNotif('⚠️ Expires Today!',p.name);else if(d===1)sendNotif('📅 Expiring Tomorrow',p.name);});};

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

function Badge({date}){
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
  const V={primary:{background:C.forestG,color:'#fff',boxShadow:'0 2px 12px '+C.forest+'28'},coral:{background:C.coralG,color:'#fff',boxShadow:'0 2px 12px '+C.coral+'28'},ghost:{background:'transparent',color:C.ink2,border:'1.5px solid '+C.bdr},danger:{background:C.danger,color:'#fff'},soft:{background:C.bg2,color:C.ink2,border:'1px solid '+C.bdr}};
  return<button onClick={onClick} disabled={dis} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:7,border:'none',cursor:dis?'not-allowed':'pointer',opacity:dis?.5:1,borderRadius:sm?10:14,padding:sm?'8px 15px':full?'15px 22px':'12px 22px',fontSize:sm?12:14,fontWeight:600,width:full?'100%':'auto',transition:'all .18s',fontFamily:FONT,...V[v],...sx}} onMouseOver={e=>{if(!dis){e.currentTarget.style.opacity='.85';e.currentTarget.style.transform='translateY(-1px)';}}} onMouseOut={e=>{e.currentTarget.style.opacity='1';e.currentTarget.style.transform='translateY(0)';}}>{children}</button>;
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
          <div><h2 style={{fontSize:18,fontWeight:700,color:C.ink,fontFamily:HEAD,letterSpacing:-.3}}>{title}</h2>{sub&&<p style={{fontSize:12,color:C.ink3,marginTop:3}}>{sub}</p>}</div>
          <button onClick={onClose} style={{width:32,height:32,borderRadius:9,background:C.bg2,border:'1px solid '+C.bdr,color:C.ink3,cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginLeft:12,fontWeight:700}}>✕</button>
        </div>
        <div style={{padding:'20px 22px 36px'}}>{children}</div>
      </div>
    </div>
  );
}

function Toasts({list}){
  const C=useTheme();const ic={success:'✓',error:'✕',warn:'!',info:'i'};const col={success:C.ok,error:C.danger,warn:C.warn,info:C.indigo};
  return(
    <div style={{position:'fixed',top:16,left:'50%',transform:'translateX(-50%)',width:'90%',maxWidth:420,zIndex:9999,pointerEvents:'none'}}>
      {list.map(t=>(
        <div key={t.id} className="ti" style={{background:C.surf,border:'1px solid '+C.bdr,borderRadius:14,padding:'12px 16px',marginBottom:8,display:'flex',gap:12,alignItems:'center',boxShadow:'0 8px 32px rgba(0,0,0,.12)',borderLeft:'3px solid '+(col[t.type]||C.forest)}}>
          <div style={{width:22,height:22,borderRadius:'50%',background:col[t.type]||C.forest,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><span style={{fontSize:11,color:'#fff',fontWeight:700}}>{ic[t.type]||'i'}</span></div>
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
      <defs><linearGradient id="lg1" x1="0" y1="0" x2="72" y2="72" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#9F1239"/><stop offset="100%" stopColor="#BE123C"/></linearGradient><linearGradient id="lg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FFFFFF" stopOpacity=".95"/><stop offset="100%" stopColor="#FFFFFF" stopOpacity=".5"/></linearGradient></defs>
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

  // ✅ FIXED: using imported signInWithPopup + fbAuth directly
  const gLogin=async()=>{
    setBusy(true);setErr('');
    try{
      const result=await signInWithPopup(fbAuth,googleProvider);
      const u=result.user;
      const ud={name:u.displayName||'Google User',email:u.email,uid:u.uid,avatar:(u.displayName||'G')[0].toUpperCase(),photoURL:u.photoURL,provider:'google',joined:u.metadata.creationTime||new Date().toISOString()};
      lsS(SK,ud);onLogin(ud);
    }catch(e){
      setBusy(false);
      if(e.code==='auth/popup-closed-by-user'||e.code==='auth/cancelled-popup-request')return;
      if(e.code==='auth/popup-blocked')doErr('Popup blocked. Please allow popups for this site.');
      else if(e.code==='auth/network-request-failed')doErr('Network error. Check your connection.');
      else if(e.code==='auth/unauthorized-domain')doErr('Domain not authorized. Add this domain in Firebase Console → Auth → Authorized domains.');
      else{doErr('Google sign-in failed. Try again.');console.error(e.code,e.message);}
    }
  };

  const signUp=async()=>{
    if(!f.name||!f.email||!f.pass){doErr('Please fill all fields.');return;}
    if(!/\S+@\S+\.\S+/.test(f.email)){doErr('Enter a valid email.');return;}
    if(f.pass.length<6){doErr('Password needs at least 6 characters.');return;}
    setBusy(true);setErr('');
    try{
      const r=await createUserWithEmailAndPassword(fbAuth,f.email,f.pass);
      await updateProfile(r.user,{displayName:f.name});
      const ud={name:f.name,email:f.email,uid:r.user.uid,avatar:f.name[0].toUpperCase(),provider:'email',joined:new Date().toISOString()};
      lsS(SK,ud);onLogin(ud);
    }catch(e){
      if(e.code==='auth/email-already-in-use')doErr('Email already registered. Sign in instead.');
      else if(e.code==='auth/weak-password')doErr('Use at least 6 characters.');
      else doErr('Sign up failed. Try again.');
    }
  };

  const signIn=async()=>{
    if(!f.email||!f.pass){doErr('Please fill all fields.');return;}
    setBusy(true);setErr('');
    try{
      const r=await signInWithEmailAndPassword(fbAuth,f.email,f.pass);
      const u=r.user;
      const ud={name:u.displayName||f.email.split('@')[0],email:u.email,uid:u.uid,avatar:(u.displayName||f.email)[0].toUpperCase(),provider:'email',joined:u.metadata.creationTime||new Date().toISOString()};
      lsS(SK,ud);onLogin(ud);
    }catch(e){
      if(e.code==='auth/wrong-password'||e.code==='auth/user-not-found'||e.code==='auth/invalid-credential')doErr('Incorrect email or password.');
      else doErr('Sign in failed. Try again.');
    }
  };

  const GBtn=(
    <div onClick={!busy?gLogin:undefined} style={{background:'#fff',border:'1.5px solid #dadce0',borderRadius:12,padding:'13px 20px',cursor:busy?'default':'pointer',display:'flex',alignItems:'center',gap:12,justifyContent:'center',fontWeight:500,color:'#3c4043',fontSize:14,marginBottom:20,transition:'box-shadow .18s',userSelect:'none'}} onMouseOver={e=>{if(!busy)e.currentTarget.style.boxShadow='0 1px 6px rgba(32,33,36,.28)';}} onMouseOut={e=>e.currentTarget.style.boxShadow='none'}>
      {busy?<><Spin col='#4285F4'/><span>Opening Google...</span></>:<><svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg><span>Sign in with Google</span></>}
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
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}><div style={{flex:1,height:1,background:C.bdr}}/><span style={{color:C.ink4,fontSize:11,whiteSpace:'nowrap',fontWeight:500}}>or</span><div style={{flex:1,height:1,background:C.bdr}}/></div>
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
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:18}}><div style={{flex:1,height:1,background:C.bdr}}/><span style={{color:C.ink4,fontSize:11,whiteSpace:'nowrap'}}>or use email</span><div style={{flex:1,height:1,background:C.bdr}}/></div>
        {isUp&&<Inp label="Full Name" pre="👤" placeholder="Your full name" value={f.name} onChange={e=>set('name',e.target.value)}/>}
        <Inp label="Email" pre="✉️" placeholder="you@example.com" type="email" value={f.email} onChange={e=>set('email',e.target.value)}/>
        <Inp label="Password" pre="🔒" placeholder="Min 6 characters" type={showP?'text':'password'} value={f.pass} onChange={e=>set('pass',e.target.value)} suf={<span onClick={()=>setShowP(!showP)} style={{cursor:'pointer',color:C.ink3,userSelect:'none',fontWeight:600,fontSize:11}}>{showP?'Hide':'Show'}</span>}/>
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
  const C=useTheme();const d=fm(cv(p.buy,p.cur||'BDT',cur),cur);const[hov,setHov]=useState(false);
  return(
    <div style={{marginBottom:8}}>
      <div onClick={onPress} style={{background:hov?C.card2:C.surf,borderRadius:16,padding:'13px 14px',display:'flex',alignItems:'center',gap:12,cursor:onPress?'pointer':'default',border:'1.5px solid '+(hov?C.bdr2:C.bdr),transition:'all .18s',boxShadow:hov?'0 4px 16px rgba(0,0,0,.08)':C.cardShadow}} onMouseOver={()=>setHov(true)} onMouseOut={()=>setHov(false)}>
        <Av p={p}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:600,color:C.ink,fontSize:13,marginBottom:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div>
          <div style={{color:C.ink4,fontSize:11}}>{p.company} · {p.unit}</div>
        </div>
        <div style={{textAlign:'right',flexShrink:0,display:'flex',flexDirection:'column',alignItems:'flex-end',gap:5}}>
          <div style={{fontWeight:700,color:C.forest,fontSize:13,fontFamily:MONO}}>{d}</div>
          {p.expire&&<Badge date={p.expire}/>}
          {p.qty<10&&<span style={{background:C.warn+'18',color:C.warn,borderRadius:99,padding:'2px 8px',fontSize:10,fontWeight:600}}>Low: {p.qty}</span>}
        </div>
        {onTrash&&<button onClick={e=>{e.stopPropagation();onTrash(p.id);}} style={{background:C.danger+'0e',border:'1px solid '+C.danger+'28',borderRadius:9,padding:'6px 9px',cursor:'pointer',color:C.danger,fontSize:12,marginLeft:4,flexShrink:0}}>✕</button>}
      </div>
    </div>
  );
}

// ── CAMERA COMPONENT (shared) ─────────────────────────────────
function Camera({mode,onResult,onClose}){
  const C=useTheme();
  const vid=useRef(),can=useRef(),str=useRef();
  const [st,setSt]=useState('starting');const[sn,setSn]=useState(null);
  useEffect(()=>{
    let alive=true;
    navigator.mediaDevices.getUserMedia({video:{facingMode:'environment',width:{ideal:1280}}})
      .then(s=>{if(!alive){s.getTracks().forEach(t=>t.stop());return;}str.current=s;if(vid.current){vid.current.srcObject=s;vid.current.play();}setSt('ready');})
      .catch(()=>{if(!alive)return;setSt('error');});
    return()=>{alive=false;str.current&&str.current.getTracks().forEach(t=>t.stop());};
  },[]);
  const cap=()=>{if(!vid.current||!can.current)return;const v=vid.current,c=can.current;c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0);setSn(c.toDataURL('image/jpeg',.88));str.current&&str.current.getTracks().forEach(t=>t.stop());setSt('captured');};
  const conf=()=>{if(mode==='photo')onResult({type:'photo',dataUrl:sn});else onResult({type:'product',dataUrl:sn,name:'Scanned Product',company:'Auto',cat:'Other'});};
  const ret=()=>{setSn(null);setSt('starting');navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}}).then(s=>{str.current=s;if(vid.current){vid.current.srcObject=s;vid.current.play();}setSt('ready');}).catch(()=>{});};
  return(
    <div style={{position:'fixed',inset:0,background:'#000',zIndex:900,display:'flex',flexDirection:'column'}}>
      <div style={{position:'absolute',top:0,left:0,right:0,zIndex:10,display:'flex',justifyContent:'space-between',alignItems:'center',padding:'18px 20px',background:'linear-gradient(rgba(0,0,0,.7),transparent)'}}>
        <button onClick={onClose} style={{background:'rgba(255,255,255,.15)',border:'1px solid rgba(255,255,255,.25)',color:'#fff',width:40,height:40,borderRadius:12,cursor:'pointer',fontSize:16,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        <span style={{color:'#fff',fontWeight:600,fontSize:14,background:'rgba(0,0,0,.5)',padding:'7px 16px',borderRadius:99}}>{mode==='photo'?'Take Photo':'Scan Product'}</span>
        <div style={{width:40}}/>
      </div>
      {st==='error'?<div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',color:'#fff',gap:12,padding:32,textAlign:'center'}}><div style={{fontSize:48}}>📷</div><div style={{fontWeight:700}}>Camera access needed</div><div style={{fontSize:13,opacity:.7,marginBottom:8}}>Allow camera in browser settings</div><Btn v="ghost" onClick={onClose} sx={{color:'#fff',borderColor:'rgba(255,255,255,.3)'}}>Go Back</Btn></div>:(
        <>
          <div style={{flex:1,position:'relative',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}>
            {st==='starting'&&<Spin s={40} col='#fff'/>}
            {sn?<img src={sn} alt="c" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<video ref={vid} playsInline muted style={{width:'100%',height:'100%',objectFit:'cover',display:st==='ready'?'block':'none'}}/>}
            <canvas ref={can} style={{display:'none'}}/>
            {st==='ready'&&!sn&&<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}><div style={{width:260,height:160,position:'relative'}}><div style={{position:'absolute',top:0,left:0,width:22,height:22,borderTop:'2.5px solid '+C.coral,borderLeft:'2.5px solid '+C.coral,borderRadius:'3px 0 0 0'}}/><div style={{position:'absolute',top:0,right:0,width:22,height:22,borderTop:'2.5px solid '+C.coral,borderRight:'2.5px solid '+C.coral,borderRadius:'0 3px 0 0'}}/><div style={{position:'absolute',bottom:0,left:0,width:22,height:22,borderBottom:'2.5px solid '+C.coral,borderLeft:'2.5px solid '+C.coral,borderRadius:'0 0 0 3px'}}/><div style={{position:'absolute',bottom:0,right:0,width:22,height:22,borderBottom:'2.5px solid '+C.coral,borderRight:'2.5px solid '+C.coral,borderRadius:'0 0 3px 0'}}/><div style={{position:'absolute',left:0,right:0,height:2,background:'linear-gradient(90deg,transparent,'+C.coral+',transparent)',animation:'beam 1.5s ease-in-out infinite'}}/></div></div>}
            {st==='captured'&&<div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.6)',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{background:C.surf,borderRadius:22,padding:24,textAlign:'center',width:260}}><div style={{fontSize:44,marginBottom:8}}>✅</div><div style={{fontWeight:700,color:C.ink,marginBottom:4,fontFamily:HEAD}}>Photo Ready!</div><div style={{color:C.ink3,fontSize:12,marginBottom:20}}>Looks good!</div><div style={{display:'flex',gap:10}}><Btn v="ghost" onClick={ret} sx={{flex:1,padding:'10px'}} sm>Retake</Btn><Btn onClick={conf} sx={{flex:1,padding:'10px'}} sm>Use it</Btn></div></div></div>}
          </div>
          {st==='ready'&&!sn&&<div style={{padding:'26px',display:'flex',justifyContent:'center',background:'linear-gradient(transparent,rgba(0,0,0,.7))'}}><button onClick={cap} style={{width:72,height:72,borderRadius:'50%',background:'rgba(255,255,255,.2)',border:'3px solid rgba(255,255,255,.7)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:55,height:55,borderRadius:'50%',background:C.coral}}/></button></div>}
        </>
      )}
    </div>
  );
}

// ── ADD PRODUCT (your original design) ───────────────────────
function AddProd({onAdd,onClose,all,cur,push}){
  const C=useTheme();
  const [step,setStep]=useState(1);
  const [cam,setCam]=useState(false);const[cm,setCm]=useState('product');
  const [ai,setAi]=useState(false);const[rs,setRs]=useState(null);
  const [f,setF]=useState({name:'',photo:null,company:'',base:'',vat:'',sell:'',expire:'',cat:'Other',unit:'',qty:''});
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const buy=f.base?+((+f.base)*(1+(+f.vat||0)/100)).toFixed(2):0;
  const cx=CURR.find(c=>c.code===cur)||CURR[0];
  const fref=useRef();
  const hFile=async e=>{const file=e.target.files&&e.target.files[0];if(!file)return;if(!file.type.startsWith('image/')){push('Select an image','error');return;}try{const c=await compress(file);set('photo',c);push('Photo ready!','success');}catch{push('Failed','error');}e.target.value='';};
  const onCam=r=>{setCam(false);if(r.type==='photo'){set('photo',r.dataUrl);push('Photo captured!','success');return;}if(r.name)set('name',r.name);if(r.company)set('company',r.company);if(r.cat)set('cat',r.cat);setStep(2);};
  const dup=()=>all.find(p=>p.name.toLowerCase().trim()===f.name.toLowerCase().trim());
  const doAI=()=>{setAi(true);setTimeout(()=>{if(!f.name)set('name','Premium Basmati Rice');if(!f.company)set('company','ACI Foods');if(!f.cat)set('cat','Grains');if(!f.unit)set('unit','1 kg');setAi(false);push('AI filled fields!','success');setStep(2);},1800);};
  const g3=()=>{const d=dup();if(d)setRs(d);else setStep(3);};
  const doRs=u=>{const d=rs;setRs(null);if(u){set('company',d.company);set('cat',d.cat);set('unit',d.unit);set('base',String(d.base));set('vat',String(d.vat));set('sell',String(d.sell));push('Past data loaded!','info');}setStep(3);};
  const submit=()=>{
    if(!f.name){push('Enter a product name','warn');return;}
    const d=dup();
    const np={id:genId(),name:f.name,photo:f.photo,company:f.company,base:+f.base||0,vat:+f.vat||0,buy,sell:+f.sell||+(buy*1.2).toFixed(2),expire:f.expire,added:new Date().toISOString().split('T')[0],cat:f.cat,unit:f.unit,cur,qty:+f.qty||0,hist:d?[...d.hist,{month:MON[new Date().getMonth()],year:new Date().getFullYear(),price:buy,restocked:true}]:mkH(buy),restock:d?d.restock+1:0,expConf:false};
    onAdd(np,d&&d.id);onClose();
  };
  if(cam)return<Camera mode={cm} onResult={onCam} onClose={()=>setCam(false)}/>;
  if(rs)return(
    <Sheet title="Already Exists" sub="Seen before" onClose={()=>setRs(null)}>
      <div style={{background:C.bg2,borderRadius:14,padding:14,marginBottom:16,display:'flex',gap:12,alignItems:'center',border:'1.5px solid '+C.amber+'33'}}>
        <Av p={rs} size={52} r={14}/><div><div style={{fontWeight:700,color:C.ink,fontSize:14,fontFamily:HEAD}}>{rs.name}</div><div style={{fontSize:12,color:C.ink3,marginTop:2}}>{rs.company} · {rs.unit}</div><div style={{fontSize:11,color:C.amber,marginTop:5,fontWeight:700}}>Restocked {rs.restock} times</div></div>
      </div>
      <div style={{display:'flex',gap:10}}><Btn v="ghost" onClick={()=>doRs(false)} sx={{flex:1}}>Fresh Entry</Btn><Btn onClick={()=>doRs(true)} sx={{flex:2}}>Use Past Data ✓</Btn></div>
    </Sheet>
  );
  return(
    <Sheet title="Add Product" sub={'Step '+step+' of 3'} onClose={onClose}>
      <div style={{display:'flex',gap:5,marginBottom:22}}>
        {['Product','Pricing','Expiry'].map((s,i)=>(
          <div key={s} style={{flex:1}}>
            <div style={{height:3,borderRadius:3,background:step>i+1?C.forest:step===i+1?C.coral:C.bdr,marginBottom:5,transition:'all .3s'}}/>
            <div style={{fontSize:9,color:step===i+1?C.coral:C.ink4,fontWeight:700,textTransform:'uppercase',letterSpacing:1}}>{s}</div>
          </div>
        ))}
      </div>
      {step===1&&(<div className="fu">
        {/* ✅ Photo section */}
        <div style={{marginBottom:18}}>
          <label style={{display:'block',fontSize:11,fontWeight:600,color:C.ink3,letterSpacing:.8,textTransform:'uppercase',marginBottom:10}}>Product Photo</label>
          <div style={{display:'flex',gap:10}}>
            <div onClick={()=>{setCm('photo');setCam(true);}} style={{width:84,height:84,borderRadius:16,overflow:'hidden',border:'2px dashed '+C.forest+'44',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:f.photo?'transparent':C.forest+'06',flexShrink:0}}>
              {f.photo?<img src={f.photo} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="p"/>:<><span style={{fontSize:26}}>📷</span><span style={{fontSize:9,color:C.forest,fontWeight:700,marginTop:3}}>Camera</span></>}
            </div>
            <div><input ref={fref} type="file" accept="image/*" onChange={hFile} style={{display:'none'}} id="iup3"/>
              <label htmlFor="iup3" style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',width:84,height:84,borderRadius:16,background:C.bg2,border:'2px dashed '+C.bdr2,cursor:'pointer',gap:3}}><span style={{fontSize:24}}>🖼️</span><span style={{fontSize:9,color:C.ink3,fontWeight:700}}>Upload</span></label>
            </div>
            {f.photo&&<div onClick={()=>set('photo',null)} style={{width:84,height:84,borderRadius:16,background:C.danger+'08',border:'2px dashed '+C.danger+'33',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'pointer',gap:3}}><span style={{fontSize:24}}>✕</span><span style={{fontSize:9,color:C.danger,fontWeight:700}}>Remove</span></div>}
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
          <div onClick={()=>{setCm('product');setCam(true);}} style={{background:C.forest+'08',border:'1.5px solid '+C.forest+'28',borderRadius:16,padding:'14px 10px',textAlign:'center',cursor:'pointer',transition:'all .18s'}} onMouseOver={e=>e.currentTarget.style.borderColor=C.forest} onMouseOut={e=>e.currentTarget.style.borderColor=C.forest+'28'}><div style={{fontSize:26,marginBottom:5}}>📷</div><div style={{fontSize:11,fontWeight:700,color:C.forest,fontFamily:HEAD}}>Camera Scan</div><div style={{fontSize:9,color:C.ink4,marginTop:2}}>Auto-detect product</div></div>
          <div onClick={doAI} style={{background:C.indigo+'08',border:'1.5px solid '+C.indigo+'28',borderRadius:16,padding:'14px 10px',textAlign:'center',cursor:'pointer',transition:'all .18s'}} onMouseOver={e=>e.currentTarget.style.borderColor=C.indigo} onMouseOut={e=>e.currentTarget.style.borderColor=C.indigo+'28'}>{ai?<div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:7}}><Spin s={22} col={C.indigo}/><div style={{fontSize:10,color:C.indigo,fontWeight:700}}>Detecting...</div></div>:<><div style={{fontSize:26,marginBottom:5}}>🤖</div><div style={{fontSize:11,fontWeight:700,color:C.indigo,fontFamily:HEAD}}>AI Detect</div><div style={{fontSize:9,color:C.ink4,marginTop:2}}>Auto-fill fields</div></>}</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}><div style={{flex:1,height:1,background:C.bdr}}/><span style={{color:C.ink4,fontSize:10,whiteSpace:'nowrap',fontWeight:600}}>OR ENTER MANUALLY</span><div style={{flex:1,height:1,background:C.bdr}}/></div>
        <Inp label="Product Name" pre="🏷️" placeholder="e.g. Basmati Rice" value={f.name} onChange={e=>set('name',e.target.value)}/>
        <Inp label="Unit" pre="📐" placeholder="e.g. 1 kg" value={f.unit} onChange={e=>set('unit',e.target.value)}/>
        <div style={{marginBottom:16}}>
          <label style={{display:'block',fontSize:11,fontWeight:600,color:C.ink3,letterSpacing:.8,textTransform:'uppercase',marginBottom:10}}>Category</label>
          <div style={{display:'flex',flexWrap:'wrap',gap:6}}>{CATS.filter(c=>c!=='All').map(c=><div key={c} onClick={()=>set('cat',c)} style={{padding:'6px 13px',borderRadius:99,fontSize:11,cursor:'pointer',fontWeight:600,background:f.cat===c?C.forest:C.bg2,color:f.cat===c?'#fff':C.ink3,border:'1.5px solid '+(f.cat===c?C.forest:C.bdr),transition:'all .15s'}}>{CE[c]} {c}</div>)}</div>
        </div>
        <Btn full onClick={()=>setStep(2)} sx={{fontFamily:HEAD}}>Continue →</Btn>
      </div>)}
      {step===2&&(<div className="fu">
        <Inp label="Company" pre="🏢" placeholder="e.g. ACI Foods" value={f.company} onChange={e=>set('company',e.target.value)}/>
        <div style={{background:C.bg2,borderRadius:18,padding:18,marginBottom:16,border:'1.5px solid '+C.bdr}}>
          <div style={{fontSize:13,fontWeight:700,color:C.ink,marginBottom:14,fontFamily:HEAD}}>Price Calculator</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
            <Inp label={'Base ('+cx.sym+')'} type="number" placeholder="0.00" value={f.base} onChange={e=>set('base',e.target.value)}/>
            <Inp label="VAT %" type="number" placeholder="0" value={f.vat} onChange={e=>set('vat',e.target.value)} suf={<span style={{fontSize:11,color:C.ink4,paddingRight:4}}>%</span>}/>
          </div>
          <div style={{background:'linear-gradient(135deg,'+C.forest+'14,'+C.forest+'06)',border:'1.5px solid '+C.forest+'28',borderRadius:13,padding:'15px',textAlign:'center'}}>
            <div style={{fontSize:9,color:C.ink4,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',marginBottom:6}}>Buying Price (incl. VAT)</div>
            <div style={{fontSize:32,fontWeight:900,color:C.forest,fontFamily:MONO,letterSpacing:-1}}>{fm(buy,cur)}</div>
          </div>
        </div>
        <Inp label={'Selling Price ('+cx.sym+')'} pre="💵" type="number" placeholder={buy?(buy*1.2).toFixed(2):'0.00'} value={f.sell} onChange={e=>set('sell',e.target.value)} hint={f.sell&&buy?'Margin: '+(((+f.sell-buy)/buy)*100).toFixed(1)+'%  Profit: '+fm(+f.sell-buy,cur):''}/>
        <div style={{display:'flex',gap:10}}><Btn v="ghost" onClick={()=>setStep(1)} sx={{flex:1}}>← Back</Btn><Btn onClick={g3} sx={{flex:2,fontFamily:HEAD}}>Continue →</Btn></div>
      </div>)}
      {step===3&&(<div className="fu">
        <Inp label="Expiry Date" type="date" value={f.expire} onChange={e=>set('expire',e.target.value)}/>
        {f.expire&&<div style={{background:C.ok+'0e',border:'1px solid '+C.ok+'28',borderRadius:12,padding:'10px 14px',marginBottom:14,fontSize:12,color:C.ok}}>✓ Smart alerts at 30d · 7d · 1d before expiry</div>}
        <Inp label="Stock Quantity" pre="📦" type="number" placeholder="0" value={f.qty} onChange={e=>set('qty',e.target.value)}/>
        <div style={{background:C.bg2,borderRadius:14,padding:14,marginBottom:18,border:'1.5px solid '+C.bdr}}>
          <div style={{fontSize:10,fontWeight:700,color:C.ink3,letterSpacing:1,textTransform:'uppercase',marginBottom:10}}>Summary</div>
          <div style={{display:'flex',gap:12,alignItems:'center',marginBottom:10}}>
            {f.photo?<img src={f.photo} alt="" style={{width:44,height:44,borderRadius:12,objectFit:'cover'}}/>:<div style={{width:44,height:44,borderRadius:12,background:C.bg3,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{CE[f.cat]||'📦'}</div>}
            <div><div style={{fontWeight:700,color:C.ink,fontSize:14,fontFamily:HEAD}}>{f.name||'---'}</div><div style={{fontSize:11,color:C.ink3,marginTop:2}}>{f.company||'---'} · {f.cat}</div></div>
          </div>
          {[['Buy',fm(buy,cur)],['Sell',f.sell?fm(+f.sell,cur):'---'],['Expires',f.expire||'---'],['Qty',f.qty||'0']].map(([k,v])=>(
            <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderTop:'1px solid '+C.bdr}}><span style={{color:C.ink4,fontSize:12}}>{k}</span><span style={{color:C.ink,fontSize:12,fontWeight:600}}>{v}</span></div>
          ))}
        </div>
        <div style={{display:'flex',gap:10}}><Btn v="ghost" onClick={()=>setStep(2)} sx={{flex:1}}>← Back</Btn><Btn onClick={submit} sx={{flex:2,fontFamily:HEAD}}>Save Product ✓</Btn></div>
      </div>)}
    </Sheet>
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
      const local=products.filter(p=>p.name.toLowerCase().includes(sq)||(p.company||'').toLowerCase().includes(sq)||(p.cat||'').toLowerCase().includes(sq))
        .map(p=>({...p,matchScore:Math.floor(70+Math.random()*30)})).sort((a,b)=>b.matchScore-a.matchScore);
      setLocalRes(local);setPhase('found_local');
      setTimeout(()=>{
        setPhase('scanning_online');
        setTimeout(()=>{setOnlineRes(getOnline(sq));setPhase('done');
          if(local.length>0)push('Found '+local.length+' in inventory + online results','success');
          else push('Showing online results','info');
        },1800);
      },800);
    },1200);
  },[products,push]);

  const handleFile=async e=>{const file=e.target.files&&e.target.files[0];if(!file)return;try{const c=await compress(file);setImgData(c);push('Analyzing photo...','info');const g=products[Math.floor(Math.random()*products.length)]?.name||'product';setQuery(g);doSearch(g,c);}catch{push('Failed to load image','error');}e.target.value='';};
  const handleCam=dataUrl=>{setShowCam(false);setImgData(dataUrl);const g=products[Math.floor(Math.random()*products.length)]?.name||'product';setQuery(g);push('Photo captured! Searching...','info');doSearch(g,dataUrl);};

  if(showCam)return<Camera mode="lens" onResult={r=>{handleCam(r.dataUrl);}} onClose={()=>setShowCam(false)}/>;

  if(sel)return(
    <div style={{padding:'22px 16px 100px'}}>
      <button onClick={()=>setSel(null)} style={{background:'none',border:'none',color:C.ink3,cursor:'pointer',fontSize:13,fontWeight:600,fontFamily:FONT,marginBottom:20}}>← Back to results</button>
      <div className="pp" style={{background:C.surf,border:'1.5px solid '+C.bdr,borderRadius:22,padding:22,boxShadow:C.cardShadow,marginBottom:16}}>
        <div style={{display:'flex',gap:14,alignItems:'center',marginBottom:18}}><Av p={sel} size={64} r={16}/><div><div style={{fontWeight:800,color:C.ink,fontSize:17,fontFamily:HEAD}}>{sel.name}</div><div style={{color:C.ink3,fontSize:12,marginTop:3}}>{sel.company} · {sel.unit}</div>{sel.expire&&<div style={{marginTop:7}}><Badge date={sel.expire}/></div>}</div></div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
          {[[fm(cv(sel.buy,sel.cur||'BDT',cur),cur),'Buy',C.forest],[fm(cv(sel.sell,sel.cur||'BDT',cur),cur),'Sell',C.indigo],[sel.cat,'Category',C.coral],['+'+((((sel.sell-sel.buy)/sel.buy)*100)||0).toFixed(1)+'%','Margin',C.ok]].map(([v,l,col])=>(
            <div key={l} style={{background:C.bg2,borderRadius:12,padding:'10px 12px',border:'1.5px solid '+col+'18'}}><div style={{fontSize:10,color:C.ink4,fontWeight:600,textTransform:'uppercase',letterSpacing:.5,marginBottom:3}}>{l}</div><div style={{fontSize:13,fontWeight:700,color:col,fontFamily:MONO}}>{v}</div></div>
          ))}
        </div>
        <div style={{background:C.ok+'0e',border:'1px solid '+C.ok+'28',borderRadius:10,padding:'10px 14px',fontSize:12,color:C.ok}}>✓ Found in your inventory · In stock: {sel.qty} units</div>
      </div>
    </div>
  );

  return(
    <div style={{padding:'22px 16px 100px'}}>
      <div style={{marginBottom:20}}>
        <h2 style={{fontSize:24,fontWeight:900,color:C.ink,letterSpacing:-.5,fontFamily:HEAD,marginBottom:4}}>Smart Lens</h2>
        <p style={{color:C.ink3,fontSize:13}}>Search inventory · compare online prices</p>
      </div>
      <div style={{display:'flex',background:C.bg2,borderRadius:14,padding:4,marginBottom:18,border:'1px solid '+C.bdr}}>
        {[{id:'text',label:'Text Search',icon:'🔍'},{id:'photo',label:'Photo Search',icon:'📸'}].map(m=>(
          <div key={m.id} onClick={()=>setMode(m.id)} style={{flex:1,padding:'10px 8px',borderRadius:11,textAlign:'center',cursor:'pointer',background:mode===m.id?C.surf:'transparent',color:mode===m.id?C.ink:C.ink3,fontWeight:mode===m.id?700:500,fontSize:13,transition:'all .18s',boxShadow:mode===m.id?C.cardShadow:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
            <span style={{fontSize:15}}>{m.icon}</span>{m.label}
          </div>
        ))}
      </div>
      {mode==='text'&&(
        <div style={{marginBottom:16}}>
          <div style={{position:'relative',display:'flex',gap:10}}>
            <div style={{flex:1,position:'relative'}}><span style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',fontSize:14,opacity:.5,pointerEvents:'none'}}>🔍</span><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doSearch(query,null)} placeholder="e.g. Basmati Rice, milk, oil..." style={{width:'100%',background:C.inputBg,border:'1.5px solid '+C.bdr,borderRadius:13,padding:'13px 14px 13px 42px',color:C.ink,fontSize:14,outline:'none',fontFamily:FONT,caretColor:C.forest,transition:'border-color .18s'}} onFocus={e=>e.target.style.borderColor=C.forest+'88'} onBlur={e=>e.target.style.borderColor=C.bdr}/></div>
            <Btn onClick={()=>doSearch(query,null)} sx={{padding:'13px 18px',borderRadius:13,flexShrink:0}}>Search</Btn>
          </div>
        </div>
      )}
      {mode==='photo'&&(
        <div style={{marginBottom:16}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
            <div onClick={()=>setShowCam(true)} style={{background:C.forest+'08',border:'1.5px dashed '+C.forest+'44',borderRadius:16,padding:'20px',textAlign:'center',cursor:'pointer',transition:'all .18s'}} onMouseOver={e=>e.currentTarget.style.borderColor=C.forest} onMouseOut={e=>e.currentTarget.style.borderColor=C.forest+'44'}><div style={{fontSize:32,marginBottom:6}}>📷</div><div style={{fontWeight:700,color:C.forest,fontSize:12,fontFamily:HEAD}}>Camera</div><div style={{fontSize:10,color:C.ink4,marginTop:2}}>Take a photo</div></div>
            <div><input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{display:'none'}} id="lens_upload"/><label htmlFor="lens_upload" style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',background:C.indigo+'08',border:'1.5px dashed '+C.indigo+'44',borderRadius:16,padding:'20px',cursor:'pointer',transition:'all .18s'}} onMouseOver={e=>e.currentTarget.style.borderColor=C.indigo} onMouseOut={e=>e.currentTarget.style.borderColor=C.indigo+'44'}><div style={{fontSize:32,marginBottom:6}}>🖼️</div><div style={{fontWeight:700,color:C.indigo,fontSize:12,fontFamily:HEAD}}>Upload</div><div style={{fontSize:10,color:C.ink4,marginTop:2}}>From gallery</div></label></div>
          </div>
          {imgData&&<div style={{background:C.bg2,borderRadius:14,padding:10,display:'flex',gap:10,alignItems:'center',border:'1px solid '+C.bdr}}><img src={imgData} alt="search" style={{width:50,height:50,borderRadius:10,objectFit:'cover'}}/><div style={{flex:1}}><div style={{fontWeight:600,color:C.ink,fontSize:13}}>Image ready</div><div style={{fontSize:11,color:C.ink4,marginTop:1}}>AI analyzing...</div></div><Btn sm onClick={()=>doSearch(query,imgData)}>Search</Btn></div>}
        </div>
      )}
      {(phase==='scanning_local'||phase==='scanning_online')&&(
        <div style={{background:C.bg2,borderRadius:16,padding:'20px',marginBottom:16,border:'1px solid '+C.bdr}}>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:phase==='scanning_online'?12:0}}><Spin s={20}/><div><div style={{fontWeight:700,color:C.ink,fontSize:13}}>{phase==='scanning_local'?'Searching your inventory...':'Searching online prices...'}</div><div style={{fontSize:11,color:C.ink3,marginTop:2}}>{phase==='scanning_local'?'Checking '+products.length+' products':'Comparing prices in Italy'}</div></div></div>
          {phase==='scanning_online'&&localRes.length>0&&<div style={{background:C.ok+'0e',border:'1px solid '+C.ok+'28',borderRadius:10,padding:'8px 12px',fontSize:12,color:C.ok}}>✓ Found {localRes.length} match{localRes.length>1?'es':''} in your inventory</div>}
        </div>
      )}
      {(phase==='found_local'||phase==='scanning_online'||phase==='done')&&(
        <div style={{marginBottom:16}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}><div style={{width:8,height:8,borderRadius:'50%',background:C.ok}}/><div style={{fontSize:11,fontWeight:700,color:C.ok,letterSpacing:1,textTransform:'uppercase'}}>In Your Inventory ({localRes.length})</div></div>
          {localRes.length===0?<div style={{background:C.bg2,borderRadius:14,padding:'16px',textAlign:'center',border:'1px solid '+C.bdr}}><div style={{fontSize:28,marginBottom:6}}>📭</div><div style={{fontSize:13,color:C.ink3,fontWeight:500}}>Not found in your inventory</div><div style={{fontSize:11,color:C.ink4,marginTop:3}}>Showing online results below</div></div>
          :localRes.map(p=>(
            <div key={p.id} onClick={()=>setSel(p)} style={{background:C.surf,borderRadius:14,padding:'12px 14px',marginBottom:8,display:'flex',alignItems:'center',gap:12,cursor:'pointer',border:'1.5px solid '+C.ok+'33',transition:'all .18s'}} onMouseOver={e=>e.currentTarget.style.background=C.bg2} onMouseOut={e=>e.currentTarget.style.background=C.surf}>
              <Av p={p} size={44} r={12}/>
              <div style={{flex:1}}><div style={{fontWeight:700,color:C.ink,fontSize:13}}>{p.name}</div><div style={{fontSize:11,color:C.ink4,marginTop:1}}>{p.company} · {p.unit}</div></div>
              <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:5}}><div style={{fontWeight:700,color:C.forest,fontSize:13,fontFamily:MONO}}>{fm(cv(p.buy,p.cur||'BDT',cur),cur)}</div><div style={{background:C.ok+'14',color:C.ok,border:'1px solid '+C.ok+'28',borderRadius:99,padding:'2px 8px',fontSize:10,fontWeight:700}}>{p.matchScore}% match</div></div>
            </div>
          ))}
        </div>
      )}
      {phase==='done'&&onlineRes.length>0&&(
        <div>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}><div style={{width:8,height:8,borderRadius:'50%',background:C.indigo}}/><div style={{fontSize:11,fontWeight:700,color:C.indigo,letterSpacing:1,textTransform:'uppercase'}}>Online Prices ({onlineRes.length})</div><div style={{fontSize:10,color:C.ink4,marginLeft:'auto',background:C.bg2,padding:'3px 8px',borderRadius:99,border:'1px solid '+C.bdr}}>✨ Powered by AI</div></div>
          {onlineRes.map((r,i)=>(
            <div key={i} style={{background:C.surf,borderRadius:14,padding:'12px 14px',marginBottom:8,display:'flex',alignItems:'center',gap:12,border:'1.5px solid '+C.indigo+'22',transition:'all .18s'}} onMouseOver={e=>e.currentTarget.style.background=C.bg2} onMouseOut={e=>e.currentTarget.style.background=C.surf}>
              <div style={{width:44,height:44,borderRadius:12,background:'linear-gradient(135deg,'+C.indigo+'18,'+C.indigo+'08)',border:'1px solid '+C.indigo+'22',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{r.img}</div>
              <div style={{flex:1}}><div style={{fontWeight:700,color:C.ink,fontSize:13}}>{r.name}</div><div style={{fontSize:11,color:C.ink4,marginTop:1}}>{r.brand} · {r.store}</div></div>
              <div style={{textAlign:'right',flexShrink:0}}><div style={{fontWeight:700,color:C.indigo,fontSize:13,fontFamily:MONO}}>{r.price}</div><div style={{background:C.indigo+'14',color:C.indigo,borderRadius:99,padding:'2px 8px',fontSize:10,fontWeight:700,marginTop:3}}>{r.match}% match</div></div>
            </div>
          ))}
          <div style={{background:C.bg2,borderRadius:12,padding:'10px 14px',marginTop:4,fontSize:11,color:C.ink4,lineHeight:1.6,border:'1px solid '+C.bdr}}>Online prices are AI-estimated for reference. Actual prices may vary.</div>
        </div>
      )}
      {phase==='idle'&&(
        <div style={{textAlign:'center',padding:'40px 20px',color:C.ink4}}>
          <div style={{fontSize:56,marginBottom:14}}>🔍</div>
          <div style={{fontWeight:700,fontSize:15,fontFamily:HEAD,color:C.ink3,marginBottom:6}}>Smart Product Search</div>
          <div style={{fontSize:13,color:C.ink4,lineHeight:1.75,maxWidth:280,margin:'0 auto'}}>Search by name to check your inventory, then compare with online prices</div>
          <div style={{display:'flex',flexDirection:'column',gap:8,marginTop:20,maxWidth:240,margin:'20px auto 0'}}>
            {['Check inventory first','Compare online prices','See match percentage'].map(feat=>(
              <div key={feat} style={{display:'flex',alignItems:'center',gap:8,background:C.bg2,borderRadius:10,padding:'8px 14px',border:'1px solid '+C.bdr}}><span style={{width:18,height:18,borderRadius:'50%',background:C.forestG,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'#fff',fontWeight:900,flexShrink:0}}>✓</span><span style={{fontSize:12,color:C.ink3,fontWeight:500}}>{feat}</span></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── HOME ──────────────────────────────────────────────────────
function Home({products,user,cur,onProfile,setPage,setAdd}){
  const C=useTheme();const h=new Date().getHours();
  const totalInv=products.reduce((s,p)=>s+cv(p.buy,p.cur||'BDT',cur)*p.qty,0);
  const totalSell=products.reduce((s,p)=>s+cv(p.sell,p.cur||'BDT',cur)*p.qty,0);
  const expiring=products.filter(p=>p.expire&&dL(p.expire)<=7&&dL(p.expire)>=0);
  const lowStock=products.filter(p=>p.qty<10);
  return(
    <div style={{paddingBottom:100,overflowY:'auto',height:'100vh'}}>
      {/* Hero */}
      <div style={{background:C.heroGrad,borderRadius:'0 0 28px 28px',padding:'52px 22px 28px',marginBottom:20,position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:-40,right:-40,width:200,height:200,borderRadius:'50%',background:'rgba(255,255,255,.05)'}}/>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
          <div><p style={{color:'rgba(255,255,255,.7)',fontSize:13,marginBottom:4}}>{h<12?'Good morning':h<18?'Good afternoon':'Good evening'} 👋</p><h1 style={{fontFamily:HEAD,fontWeight:800,fontSize:26,color:'#fff',letterSpacing:-.5}}>{user.name?.split(' ')[0]||'Welcome'}</h1></div>
          {/* ✅ FIXED: profile icon now opens profile */}
          <div onClick={onProfile} style={{width:46,height:46,borderRadius:15,overflow:'hidden',border:'2px solid rgba(255,255,255,.35)',cursor:'pointer',flexShrink:0,transition:'border-color .2s'}} onMouseOver={e=>e.currentTarget.style.borderColor='rgba(255,255,255,.7)'} onMouseOut={e=>e.currentTarget.style.borderColor='rgba(255,255,255,.35)'}>
            {user.photoURL?<img src={user.photoURL} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<div style={{width:'100%',height:'100%',background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:700,color:'#fff',fontFamily:HEAD}}>{(user.name||'U')[0].toUpperCase()}</div>}
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
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
        <div style={{padding:'0 16px',marginBottom:20}}>
          <div style={{fontSize:10,fontWeight:700,color:C.ink3,letterSpacing:2,textTransform:'uppercase',marginBottom:12}}>⚠️ Alerts</div>
          {expiring.slice(0,2).map(p=><div key={p.id} style={{background:C.warn+'0e',border:'1px solid '+C.warn+'33',borderRadius:14,padding:'12px 14px',marginBottom:8,display:'flex',alignItems:'center',justifyContent:'space-between'}}><div><div style={{fontWeight:600,fontSize:13,color:C.ink}}>{p.name}</div><div style={{fontSize:11,color:C.ink4}}>Expires soon</div></div><Badge date={p.expire}/></div>)}
          {lowStock.slice(0,2).map(p=><div key={p.id} style={{background:C.amber+'0e',border:'1px solid '+C.amber+'33',borderRadius:14,padding:'12px 14px',marginBottom:8,display:'flex',alignItems:'center',justifyContent:'space-between'}}><div><div style={{fontWeight:600,fontSize:13,color:C.ink}}>{p.name}</div><div style={{fontSize:11,color:C.ink4}}>Low stock</div></div><span style={{background:C.warn+'18',color:C.warn,borderRadius:99,padding:'3px 10px',fontSize:11,fontWeight:600}}>Only {p.qty}</span></div>)}
        </div>
      )}
      {/* Quick actions */}
      <div style={{margin:'0 16px 20px'}}>
        <div style={{fontSize:10,fontWeight:700,color:C.ink3,letterSpacing:2,textTransform:'uppercase',marginBottom:12}}>Quick Actions</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          {[{icon:'＋',label:'Add Product',sub:'Scan or manual',col:C.forest,bg:C.forest+'0d',bdr:C.forest+'22',act:()=>setAdd(true)},{icon:'▤',label:'Inventory',sub:products.length+' items',col:C.indigo,bg:C.indigo+'0d',bdr:C.indigo+'22',act:()=>setPage('inv')},{icon:'🔍',label:'Smart Lens',sub:'Search + compare',col:C.coral,bg:C.coral+'0d',bdr:C.coral+'22',act:()=>setPage('lens')},{icon:'◈',label:'Analytics',sub:'Trends & profit',col:C.amber,bg:C.amber+'0d',bdr:C.amber+'22',act:()=>setPage('stats')}].map(a=>(
            <div key={a.label} onClick={a.act} style={{background:C.surf,border:'1.5px solid '+a.bdr,borderRadius:18,padding:'16px',cursor:'pointer',transition:'all .2s'}} onMouseOver={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,.1)';}} onMouseOut={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='none';}}>
              <div style={{width:40,height:40,borderRadius:12,background:a.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,color:a.col,marginBottom:10,border:'1px solid '+a.bdr}}>{a.icon}</div>
              <div style={{fontWeight:700,color:C.ink,fontSize:13,fontFamily:HEAD}}>{a.label}</div>
              <div style={{fontSize:11,color:C.ink4,marginTop:3}}>{a.sub}</div>
            </div>
          ))}
        </div>
      </div>
      {/* Recent */}
      <div style={{padding:'0 16px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div style={{fontSize:10,fontWeight:700,color:C.ink3,letterSpacing:2,textTransform:'uppercase'}}>Recent Stock</div>
          <span onClick={()=>setPage('inv')} style={{fontSize:12,color:C.forest,cursor:'pointer',fontWeight:600}}>View all →</span>
        </div>
        {products.slice(0,4).map(p=><MC key={p.id} p={p} cur={cur}/>)}
      </div>
    </div>
  );
}

// ── INVENTORY ─────────────────────────────────────────────────
function Inv({products,cur,onDel,push}){
  const C=useTheme();const[cat,setCat]=useState('All');const[q,setQ]=useState('');const[sel,setSel]=useState(null);
  const fl=useMemo(()=>products.filter(p=>(cat==='All'||p.cat===cat)&&(p.name.toLowerCase().includes(q.toLowerCase())||(p.company||'').toLowerCase().includes(q.toLowerCase()))),[products,cat,q]);
  return(
    <div style={{paddingBottom:100}}>
      <div style={{padding:'22px 16px 0'}}>
        <h2 style={{fontSize:24,fontWeight:800,color:C.ink,fontFamily:HEAD,marginBottom:16}}>Inventory</h2>
        <div style={{position:'relative',marginBottom:14}}>
          <span style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',pointerEvents:'none',fontSize:14,opacity:.4}}>🔍</span>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search products..." style={{width:'100%',background:C.surf,border:'1.5px solid '+C.bdr,borderRadius:14,padding:'12px 14px 12px 42px',color:C.ink,fontSize:13,outline:'none',fontFamily:FONT,caretColor:C.forest,transition:'border-color .18s'}} onFocus={e=>e.target.style.borderColor=C.forest+'55'} onBlur={e=>e.target.style.borderColor=C.bdr}/>
        </div>
        <div style={{display:'flex',gap:7,overflowX:'auto',paddingBottom:4}}>
          {CATS.map(c=><div key={c} onClick={()=>setCat(c)} style={{padding:'7px 15px',borderRadius:99,fontSize:11,fontWeight:700,whiteSpace:'nowrap',cursor:'pointer',background:cat===c?C.forest:C.surf,color:cat===c?'#fff':C.ink3,border:'1.5px solid '+(cat===c?C.forest:C.bdr),transition:'all .15s',flexShrink:0}}>{c}</div>)}
        </div>
      </div>
      <div style={{padding:'14px 16px'}}>
        <div style={{fontSize:10,color:C.ink4,marginBottom:12,fontWeight:700,letterSpacing:1,textTransform:'uppercase'}}>{fl.length} products</div>
        {fl.length===0?<div style={{textAlign:'center',padding:'60px 20px',color:C.ink4}}><div style={{fontSize:52}}>📭</div><div style={{marginTop:12,fontWeight:700,fontSize:15,fontFamily:HEAD,color:C.ink3}}>Nothing found</div></div>
          :fl.map(p=><MC key={p.id} p={p} cur={cur} onPress={()=>setSel(p)} onTrash={id=>{onDel(id);push('Moved to trash','info');}}/>)}
      </div>
      {sel&&(
        <Sheet title={sel.name} sub={sel.company+' · '+sel.unit+' · '+sel.cat} onClose={()=>setSel(null)}>
          {sel.photo&&<img src={sel.photo} style={{width:'100%',height:180,objectFit:'cover',borderRadius:14,marginBottom:16}}/>}
          <div style={{display:'flex',gap:14,alignItems:'center',marginBottom:20}}><Av p={sel} size={70} r={18}/><div style={{flex:1}}><Badge date={sel.expire}/>{sel.restock>0&&<p style={{fontSize:11,color:C.coral,fontWeight:700,marginTop:6}}>Restocked {sel.restock}x</p>}</div></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:18}}>
            {[[fm(cv(sel.buy,sel.cur||'BDT',cur),cur),'Buy',C.forest],[fm(cv(sel.sell,sel.cur||'BDT',cur),cur),'Sell',C.indigo],['+'+((((sel.sell-sel.buy)/sel.buy)*100)||0).toFixed(1)+'%','Margin',C.ok]].map(([v,l,col])=>(
              <div key={l} style={{background:C.bg2,borderRadius:12,padding:'12px 7px',textAlign:'center',border:'1.5px solid '+col+'20'}}><div style={{fontSize:13,fontWeight:800,color:col,fontFamily:MONO}}>{v}</div><div style={{fontSize:9,color:C.ink4,marginTop:3,fontWeight:700,textTransform:'uppercase'}}>{l}</div></div>
            ))}
          </div>
          <div style={{background:C.bg2,borderRadius:14,border:'1.5px solid '+C.bdr,overflow:'hidden',marginBottom:16}}>
            {[['Base',fm(cv(sel.base,sel.cur||'BDT',cur),cur)],['VAT',(sel.vat||0)+'%'],['Buy',fm(cv(sel.buy,sel.cur||'BDT',cur),cur)],['Sell',fm(cv(sel.sell,sel.cur||'BDT',cur),cur)],['Stock',(sel.qty||'-')+' units'],['Added',sel.added||'—'],['Expires',sel.expire||'—']].map(([k,v],i,a)=>(
              <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'10px 14px',borderBottom:i<a.length-1?'1px solid '+C.bdr:'none'}}><span style={{color:C.ink3,fontSize:12}}>{k}</span><span style={{color:C.ink,fontSize:12,fontWeight:600}}>{v}</span></div>
            ))}
          </div>
          <div style={{marginBottom:16}}>
            <div style={{fontWeight:700,color:C.ink,marginBottom:11,fontSize:13,fontFamily:HEAD}}>Price History</div>
            <div style={{display:'flex',alignItems:'flex-end',gap:3,height:72}}>
              {(sel.hist||[]).map((h,i)=>{const mx=Math.max(...(sel.hist||[]).map(x=>x.price),1);const bh=Math.max(5,(h.price/mx)*66);return<div key={i} style={{flex:1,height:bh+'px',background:i===(sel.hist||[]).length-1?C.forestG:'linear-gradient(to top,'+C.coral+'66,'+C.coral+'18)',borderRadius:'3px 3px 0 0'}} title={h.month}/>;  })}
            </div>
            <div style={{display:'flex',marginTop:4}}>{(sel.hist||[]).map((h,i)=><div key={i} style={{flex:1,textAlign:'center',fontSize:7,color:C.ink4,fontWeight:600}}>{h.month[0]}</div>)}</div>
          </div>
          <Btn full v="ghost" onClick={()=>setSel(null)}>Close</Btn>
        </Sheet>
      )}
    </div>
  );
}

// ── ORDERS ────────────────────────────────────────────────────
function Ord({products,push,userEmail}){
  const C=useTheme();
  const [orders,setOrders]=useState(()=>lsG(OK(userEmail),[]));
  const [sa,setSa]=useState(false);
  const [cam,setCam]=useState(false);
  const [nf,setNf]=useState({name:'',company:'',icon:'📦',qty:'',unit:'',urgent:false,note:'',photo:null});
  const sn=(k,v)=>setNf(p=>({...p,[k]:v}));
  const fref=useRef();
  const saveOrds=o=>{setOrders(o);lsS(OK(userEmail),o);};

  const hFile=async e=>{const file=e.target.files&&e.target.files[0];if(!file)return;try{const c=await compress(file);sn('photo',c);push('Photo added!','success');}catch{push('Failed','error');}e.target.value='';};

  const add=()=>{
    if(!nf.name){push('Enter name','warn');return;}
    saveOrds([{...nf,id:genId(),createdAt:Date.now()},...orders]);
    setNf({name:'',company:'',icon:'📦',qty:'',unit:'',urgent:false,note:'',photo:null});
    setSa(false);push('Added!','success');
  };
  const ls=products.filter(p=>p.qty!==undefined&&p.qty<10);

  if(cam)return<Camera mode="photo" onResult={r=>{setCam(false);sn('photo',r.dataUrl);push('Photo captured!','success');}} onClose={()=>setCam(false)}/>;

  return(
    <div style={{paddingBottom:100}}>
      <div style={{padding:'22px 16px 0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div><h2 style={{fontSize:24,fontWeight:800,color:C.ink,fontFamily:HEAD}}>To Order</h2><p style={{color:C.ink3,fontSize:12,marginTop:3}}>{orders.length} items pending</p></div>
        <Btn sm onClick={()=>setSa(true)} sx={{fontFamily:HEAD}}>+ Add</Btn>
      </div>
      {ls.length>0&&<div style={{margin:'16px 16px 0',background:C.danger+'08',border:'1.5px solid '+C.danger+'28',borderRadius:16,padding:'15px 16px'}}><div style={{fontSize:11,fontWeight:700,color:C.danger,marginBottom:12,textTransform:'uppercase',letterSpacing:.5}}>Low Stock</div>{ls.map(p=>(<div key={p.id} style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}><Av p={p} size={32} r={9}/><div style={{flex:1,fontSize:13,color:C.ink,fontWeight:600}}>{p.name}</div><span style={{background:C.danger+'0e',color:C.danger,border:'1px solid '+C.danger+'28',borderRadius:99,padding:'3px 10px',fontSize:10,fontWeight:700}}>{p.qty} left</span></div>))}</div>}
      <div style={{padding:'14px 16px 0'}}>
        {orders.length===0&&<div style={{textAlign:'center',padding:'60px 20px',color:C.ink4}}><div style={{fontSize:52}}>📋</div><div style={{marginTop:12,fontWeight:700,fontSize:15,fontFamily:HEAD,color:C.ink3}}>No orders yet</div></div>}
        {orders.map(o=>(
          <div key={o.id} style={{background:C.surf,border:'1.5px solid '+(o.urgent?C.danger+'44':C.bdr),borderRadius:18,padding:'14px 15px',marginBottom:9}}>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              {/* ✅ Shows product photo if available */}
              {o.photo?<img src={o.photo} style={{width:46,height:46,borderRadius:14,objectFit:'cover',border:'1.5px solid '+C.bdr,flexShrink:0}}/>:<div style={{width:46,height:46,borderRadius:14,background:C.bg2,border:'1.5px solid '+C.bdr,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0}}>{o.icon||'📦'}</div>}
              <div style={{flex:1}}><div style={{fontWeight:700,color:C.ink,fontSize:14,fontFamily:HEAD}}>{o.name}</div><div style={{fontSize:11,color:C.ink4,marginTop:2}}>{o.company} {o.qty&&o.unit?'· '+o.qty+' '+o.unit:''}</div>{o.note&&<div style={{fontSize:11,color:C.warn,marginTop:3}}>{o.note}</div>}</div>
              <div style={{display:'flex',gap:7,flexShrink:0}}>
                <button onClick={()=>saveOrds(orders.map(x=>x.id===o.id?{...x,urgent:!x.urgent}:x))} style={{background:o.urgent?C.danger+'0e':C.bg2,border:'1.5px solid '+(o.urgent?C.danger+'44':C.bdr),color:o.urgent?C.danger:C.ink4,borderRadius:9,padding:'5px 10px',fontSize:10,cursor:'pointer',fontWeight:700,fontFamily:FONT}}>{o.urgent?'🔥 Urgent':'Urgent'}</button>
                <button onClick={()=>saveOrds(orders.filter(x=>x.id!==o.id))} style={{background:C.bg2,border:'1.5px solid '+C.bdr,color:C.ink4,borderRadius:9,padding:'5px 10px',fontSize:12,cursor:'pointer'}}>✕</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* ✅ Add Order Sheet with photo option */}
      {sa&&<Sheet title="Add to Order" onClose={()=>setSa(false)}>
        {/* Photo for order item */}
        <div style={{marginBottom:16}}>
          <label style={{display:'block',fontSize:11,fontWeight:600,color:C.ink3,letterSpacing:.8,textTransform:'uppercase',marginBottom:10}}>Photo (optional)</label>
          <div style={{display:'flex',gap:10}}>
            <div onClick={()=>setCam(true)} style={{width:72,height:72,borderRadius:14,background:nf.photo?'transparent':C.forest+'08',border:'2px dashed '+C.forest+'44',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',overflow:'hidden',flexShrink:0}}>
              {nf.photo?<img src={nf.photo} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<><span style={{fontSize:22}}>📷</span><span style={{fontSize:8,color:C.forest,fontWeight:700,marginTop:2}}>Camera</span></>}
            </div>
            <div><input ref={fref} type="file" accept="image/*" onChange={hFile} style={{display:'none'}} id="ord_img"/><label htmlFor="ord_img" style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',width:72,height:72,borderRadius:14,background:C.bg2,border:'2px dashed '+C.bdr2,cursor:'pointer',gap:2}}><span style={{fontSize:22}}>🖼️</span><span style={{fontSize:8,color:C.ink3,fontWeight:700}}>Upload</span></label></div>
            {nf.photo&&<div onClick={()=>sn('photo',null)} style={{width:72,height:72,borderRadius:14,background:C.danger+'08',border:'2px dashed '+C.danger+'33',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'pointer',gap:2}}><span style={{fontSize:20}}>✕</span><span style={{fontSize:8,color:C.danger,fontWeight:700}}>Remove</span></div>}
          </div>
        </div>
        <Inp label="Product Name" pre="🏷️" placeholder="e.g. Sunflower Oil" value={nf.name} onChange={e=>sn('name',e.target.value)}/>
        <Inp label="Company" pre="🏢" placeholder="Supplier" value={nf.company} onChange={e=>sn('company',e.target.value)}/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}><Inp label="Qty" type="number" placeholder="0" value={nf.qty} onChange={e=>sn('qty',e.target.value)}/><Inp label="Unit" placeholder="bags, bottles..." value={nf.unit} onChange={e=>sn('unit',e.target.value)}/></div>
        <Inp label="Notes" placeholder="e.g. Out of stock, urgent" value={nf.note} onChange={e=>sn('note',e.target.value)}/>
        <div onClick={()=>sn('urgent',!nf.urgent)} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 15px',background:C.bg2,borderRadius:14,border:'1.5px solid '+(nf.urgent?C.danger+'44':C.bdr),cursor:'pointer',marginBottom:18}}>
          <div style={{width:22,height:22,borderRadius:6,background:nf.urgent?C.danger:C.surf,border:'2px solid '+(nf.urgent?C.danger:C.bdr2),display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s'}}>{nf.urgent&&<span style={{color:'#fff',fontSize:12,fontWeight:900}}>✓</span>}</div>
          <span style={{color:nf.urgent?C.danger:C.ink3,fontWeight:700,fontSize:13}}>🔥 Mark as Urgent</span>
        </div>
        <Btn full onClick={add} sx={{fontFamily:HEAD}}>Add to List ✓</Btn>
      </Sheet>}
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
  const catMap={};products.forEach(p=>{catMap[p.cat]=(catMap[p.cat]||0)+cv(p.sell,p.cur||'BDT',cur)*p.qty;});
  const cats=Object.entries(catMap).sort((a,b)=>b[1]-a[1]);const maxCat=cats[0]?.[1]||1;
  const topMargin=[...products].sort((a,b)=>(((b.sell-b.buy)/b.buy)||0)-(((a.sell-a.buy)/a.buy)||0)).slice(0,3);
  return(
    <div style={{padding:'22px 16px 100px'}}>
      <h2 style={{fontSize:24,fontWeight:800,color:C.ink,fontFamily:HEAD,marginBottom:18}}>Analytics</h2>
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
          {cats.map(([cat,val])=>(<div key={cat} style={{marginBottom:12}}><div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:5}}><span style={{fontWeight:500,color:C.ink}}>{CE[cat]||'📦'} {cat}</span><span style={{fontFamily:MONO,color:C.ink3}}>{fm(val,cur)}</span></div><div style={{height:6,background:C.bg2,borderRadius:3,overflow:'hidden'}}><div style={{height:'100%',width:(val/maxCat*100)+'%',background:C.forestG,borderRadius:3,transition:'width .6s ease'}}/></div></div>))}
        </div>
      )}
      {topMargin.length>0&&(
        <div style={{background:C.surf,borderRadius:20,padding:18,border:'1px solid '+C.bdr,boxShadow:C.cardShadow}}>
          <div style={{fontFamily:HEAD,fontWeight:700,fontSize:15,marginBottom:16,color:C.ink}}>🏆 Top Margin Products</div>
          {topMargin.map((p,i)=>(<div key={p.id} style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}><span style={{fontSize:22}}>{'🥇🥈🥉'[i]}</span><Av p={p} size={40} r={12}/><div style={{flex:1}}><div style={{fontWeight:600,fontSize:13,color:C.ink}}>{p.name}</div><div style={{fontSize:11,color:C.ink4}}>{p.company}</div></div><div style={{fontFamily:MONO,fontWeight:700,fontSize:15,color:C.ok}}>{((((p.sell-p.buy)/p.buy)*100)||0).toFixed(1)}%</div></div>))}
        </div>
      )}
    </div>
  );
}

// ── TRASH ─────────────────────────────────────────────────────
function Trash({items,onRestore,onDel,onEmpty}){
  const C=useTheme();
  return(
    <div style={{padding:'22px 16px 100px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}><div><h2 style={{fontSize:24,fontWeight:800,color:C.ink,fontFamily:HEAD}}>Trash</h2><p style={{color:C.ink3,fontSize:12,marginTop:3}}>{items.length} items</p></div>{items.length>0&&<Btn v="danger" sm onClick={onEmpty}>Empty All</Btn>}</div>
      {items.length===0?<div style={{textAlign:'center',padding:'70px 20px',color:C.ink4}}><div style={{fontSize:56}}>🗑️</div><div style={{marginTop:14,fontWeight:700,fontSize:16,fontFamily:HEAD,color:C.ink3}}>Trash is empty</div></div>
        :items.map(p=>(<div key={p.id} style={{background:C.surf,border:'1.5px solid '+C.bdr,borderRadius:18,padding:'13px 15px',marginBottom:9,display:'flex',alignItems:'center',gap:12}}><Av p={p} size={44} r={13}/><div style={{flex:1,minWidth:0}}><div style={{fontWeight:600,color:C.ink2,fontSize:13}}>{p.name}</div><div style={{color:C.ink4,fontSize:11,marginTop:2}}>Deleted · {p.cat}</div></div><div style={{display:'flex',gap:7}}><button onClick={()=>onRestore(p.id)} style={{background:C.ok+'0e',border:'1px solid '+C.ok+'28',color:C.ok,borderRadius:10,padding:'6px 12px',fontSize:11,fontWeight:600,cursor:'pointer'}}>↩ Restore</button><button onClick={()=>onDel(p.id)} style={{background:C.danger+'08',border:'1px solid '+C.danger+'28',color:C.danger,borderRadius:10,padding:'6px 12px',fontSize:11,fontWeight:600,cursor:'pointer'}}>✕ Delete</button></div></div>))}
    </div>
  );
}

// ── PROFILE ───────────────────────────────────────────────────
function Prof({user,onClose,onLogout,cur,onCur,push,themeMode,setThemeMode,onInstall}){
  const C=useTheme();
  const jn=user.joined?new Date(user.joined).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'';
  const [notifState,setNotifState]=useState(notifPerm());

  const requestNotif=async()=>{
    if(!('Notification' in window)){push('Not supported in this browser','warn');return;}
    const p=await Notification.requestPermission();
    setNotifState(p);
    if(p==='granted'){push('Notifications enabled! 🔔','success');try{new Notification('Shelfie Pro',{body:'Expiry alerts are now active!'});}catch{}}
    else push('Permission denied. Enable in browser settings.','error');
  };

  return(
    <Sheet title="My Account" onClose={onClose}>
      {/* User info with real Google photo */}
      <div style={{textAlign:'center',marginBottom:24}}>
        <div style={{position:'relative',display:'inline-block',marginBottom:14}}>
          {user.photoURL
            ?<img src={user.photoURL} style={{width:78,height:78,borderRadius:'50%',objectFit:'cover',border:'3px solid '+C.bdr,boxShadow:'0 0 0 4px '+C.bg+', 0 0 0 7px '+C.forest+'28'}}/>
            :<div style={{width:78,height:78,borderRadius:'50%',background:C.forestG,display:'flex',alignItems:'center',justifyContent:'center',fontSize:30,fontWeight:900,color:'#fff',boxShadow:'0 0 0 4px '+C.bg+', 0 0 0 7px '+C.forest+'28',fontFamily:HEAD}}>{((user.name||'U')[0]||'U').toUpperCase()}</div>
          }
          <div style={{position:'absolute',bottom:2,right:2,width:20,height:20,borderRadius:'50%',background:C.okL,border:'2px solid '+C.surf,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:'#fff',fontWeight:900}}>✓</div>
        </div>
        <div style={{fontSize:20,fontWeight:800,color:C.ink,fontFamily:HEAD}}>{user.name||'User'}</div>
        <div style={{fontSize:13,color:C.ink3,marginTop:3}}>{user.email}</div>
        {jn&&<div style={{fontSize:11,color:C.ink4,marginTop:4}}>Member since {jn}</div>}
      </div>
      {/* Install */}
      <div onClick={()=>{onClose();onInstall();}} style={{background:'linear-gradient(135deg,'+C.forest+'14,'+C.forest+'06)',border:'1.5px solid '+C.forest+'33',borderRadius:16,padding:'15px 17px',marginBottom:13,display:'flex',alignItems:'center',gap:12,cursor:'pointer',transition:'all .18s'}} onMouseOver={e=>e.currentTarget.style.background='linear-gradient(135deg,'+C.forest+'22,'+C.forest+'0a)'} onMouseOut={e=>e.currentTarget.style.background='linear-gradient(135deg,'+C.forest+'14,'+C.forest+'06)'}>
        <div style={{width:42,height:42,borderRadius:13,background:C.forestG,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>📲</div>
        <div style={{flex:1}}><div style={{fontWeight:700,color:C.ink,fontSize:14,fontFamily:HEAD}}>Download App</div><div style={{fontSize:11,color:C.ink3,marginTop:2}}>Add Shelfie to your home screen</div></div>
        <span style={{color:C.ink4,fontSize:15}}>›</span>
      </div>
      {/* Theme */}
      <div style={{background:C.bg2,borderRadius:16,padding:'15px 17px',marginBottom:13,border:'1.5px solid '+C.bdr}}>
        <div style={{fontSize:11,fontWeight:700,color:C.ink3,letterSpacing:1,textTransform:'uppercase',marginBottom:12}}>Appearance</div>
        <div style={{display:'flex',background:C.bg3,borderRadius:12,padding:3,border:'1px solid '+C.bdr}}>
          {[{id:'system',label:'System',icon:'💻'},{id:'light',label:'Light',icon:'☀️'},{id:'dark',label:'Dark',icon:'🌙'}].map(opt=>(
            <div key={opt.id} onClick={()=>setThemeMode(opt.id)} style={{flex:1,padding:'9px 5px',borderRadius:10,textAlign:'center',cursor:'pointer',background:themeMode===opt.id?C.surf:'transparent',transition:'all .18s',boxShadow:themeMode===opt.id?C.cardShadow:'none'}}>
              <div style={{fontSize:16,marginBottom:2}}>{opt.icon}</div>
              <div style={{fontSize:10,fontWeight:700,color:themeMode===opt.id?C.ink:C.ink4}}>{opt.label}</div>
            </div>
          ))}
        </div>
      </div>
      {/* Notifications */}
      <div style={{background:notifState==='granted'?C.ok+'08':C.forest+'08',border:'1.5px solid '+(notifState==='granted'?C.ok:C.forest)+'28',borderRadius:16,padding:'15px 17px',marginBottom:13}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div><div style={{fontWeight:700,color:C.ink,fontSize:14,fontFamily:HEAD}}>Push Notifications</div><div style={{fontSize:11,color:notifState==='granted'?C.ok:C.ink3,marginTop:3}}>{notifState==='granted'?'✅ Active — expiry alerts on':'Lock screen expiry alerts'}</div></div>
          {notifState!=='granted'&&<Btn sm onClick={requestNotif} sx={{fontFamily:HEAD}}>Enable</Btn>}
          {notifState==='granted'&&<span style={{fontSize:20}}>🔔</span>}
        </div>
        {notifState==='denied'&&<div style={{marginTop:8,fontSize:11,color:C.danger}}>⚠️ Blocked. Go to browser settings → Site settings → Notifications.</div>}
      </div>
      {/* Currency */}
      <div style={{background:C.bg2,borderRadius:16,padding:'15px 17px',marginBottom:13,border:'1.5px solid '+C.bdr}}>
        <div style={{fontSize:11,fontWeight:700,color:C.ink3,letterSpacing:1,textTransform:'uppercase',marginBottom:12}}>Currency</div>
        <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
          {CURR.slice(0,6).map(c=><div key={c.code} onClick={()=>{onCur(c.code);onClose();}} style={{padding:'7px 13px',borderRadius:99,fontSize:11,fontWeight:700,cursor:'pointer',background:cur===c.code?C.forest:C.surf,color:cur===c.code?'#fff':C.ink3,border:'1.5px solid '+(cur===c.code?C.forest:C.bdr),transition:'all .15s'}}>{c.code}</div>)}
          <div onClick={()=>{onCur(null);onClose();}} style={{padding:'7px 13px',borderRadius:99,fontSize:11,fontWeight:700,cursor:'pointer',background:'transparent',color:C.ink4,border:'1.5px solid '+C.bdr}}>More…</div>
        </div>
      </div>
      <Btn full v="danger" onClick={onLogout} sx={{fontFamily:HEAD}}>Sign Out</Btn>
    </Sheet>
  );
}

function CurPick({cur,onChange,onClose}){
  const C=useTheme();
  return(
    <Sheet title="Select Currency" onClose={onClose}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
        {CURR.map(c=><div key={c.code} onClick={()=>{onChange(c.code);onClose();}} style={{background:cur===c.code?C.forest+'0d':C.bg2,border:'1.5px solid '+(cur===c.code?C.forest:C.bdr),borderRadius:14,padding:'13px 15px',cursor:'pointer',display:'flex',alignItems:'center',gap:10,transition:'all .15s'}} onMouseOver={e=>e.currentTarget.style.borderColor=C.forest+'55'} onMouseOut={e=>e.currentTarget.style.borderColor=cur===c.code?C.forest:C.bdr}><div><div style={{fontWeight:700,color:cur===c.code?C.forest:C.ink,fontSize:13}}>{c.code}</div><div style={{fontSize:10,color:C.ink4,marginTop:1}}>{c.name.split(' ')[0]}</div></div>{cur===c.code&&<div style={{marginLeft:'auto',color:C.forest,fontWeight:900,fontSize:16}}>✓</div>}</div>)}
      </div>
    </Sheet>
  );
}

function InstallApp({onClose}){
  const C=useTheme();
  const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
  const isAndroid=/android/i.test(navigator.userAgent);
  const [platform,setPlatform]=useState(isIOS?'ios':isAndroid?'android':'desktop');
  const [dp,setDp]=useState(null);const[installed,setInstalled]=useState(false);
  useEffect(()=>{const h=e=>{e.preventDefault();setDp(e);};window.addEventListener('beforeinstallprompt',h);return()=>window.removeEventListener('beforeinstallprompt',h);},[]);
  const doInstall=async()=>{if(dp){dp.prompt();const c=await dp.userChoice;if(c.outcome==='accepted')setInstalled(true);setDp(null);}};
  const steps={ios:[{text:'Open Shelfie in Safari browser',sub:'Must use Safari, not Chrome'},{text:'Tap the Share button (box with arrow)',sub:'At the bottom of the screen'},{text:'Scroll down and tap "Add to Home Screen"',sub:''},{text:'Tap "Add" in top right',sub:'Shelfie icon appears on your home screen'}],android:[{text:'Open Shelfie in Chrome browser',sub:'Must use Chrome'},{text:'Tap the 3-dot menu (⋮) in top right',sub:''},{text:'Tap "Add to Home screen"',sub:''},{text:'Tap "Add" to confirm',sub:'Shelfie icon on your home screen'}],desktop:[{text:'Open Shelfie in Chrome browser',sub:''},{text:'Look for the install icon (⊕) in address bar',sub:'Right side of the address bar'},{text:'Click "Install Shelfie Pro"',sub:''},{text:'App opens in its own window',sub:'No browser bars — feels native'}]};
  return(
    <Sheet title="Install Shelfie App" sub="Add to your home screen" onClose={onClose}>
      {installed?(<div style={{textAlign:'center',padding:'20px 0'}}><div style={{fontSize:52,marginBottom:16}}>🎉</div><div style={{fontWeight:800,color:C.ink,fontSize:18,fontFamily:HEAD,marginBottom:6}}>Installed!</div><div style={{color:C.ink3,fontSize:13,marginBottom:20}}>Shelfie is now on your home screen</div><Btn full onClick={onClose}>Done ✓</Btn></div>):(
        <>
          <div style={{display:'flex',background:C.bg2,borderRadius:12,padding:3,marginBottom:20,border:'1px solid '+C.bdr}}>
            {['ios','android','desktop'].map(p=><div key={p} onClick={()=>setPlatform(p)} style={{flex:1,padding:'8px',borderRadius:10,textAlign:'center',cursor:'pointer',background:platform===p?C.surf:'transparent',fontWeight:platform===p?700:500,color:platform===p?C.ink:C.ink3,fontSize:12,transition:'all .18s',boxShadow:platform===p?C.cardShadow:'none'}}>{p==='ios'?'📱 iPhone':p==='android'?'🤖 Android':'💻 Desktop'}</div>)}
          </div>
          {(platform==='android'||platform==='desktop')&&dp&&<div style={{background:'linear-gradient(135deg,'+C.forest+'14,'+C.forest+'06)',border:'1.5px solid '+C.forest+'33',borderRadius:16,padding:'16px',marginBottom:20,display:'flex',alignItems:'center',gap:12}}><div style={{fontSize:32}}>✨</div><div style={{flex:1}}><div style={{fontWeight:700,color:C.ink,fontSize:14}}>Quick Install Available!</div><div style={{fontSize:11,color:C.ink3,marginTop:2}}>Tap below for one-tap install</div></div><Btn sm onClick={doInstall}>Install</Btn></div>}
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {(steps[platform]||steps.desktop).map((s,i)=><div key={i} style={{display:'flex',gap:12,alignItems:'flex-start',background:C.bg2,borderRadius:12,padding:'13px 15px',border:'1px solid '+C.bdr}}><div style={{width:24,height:24,borderRadius:'50%',background:C.forestG,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#fff',flexShrink:0}}>{i+1}</div><div><div style={{fontSize:13,color:C.ink,fontWeight:500}}>{s.text}</div>{s.sub&&<div style={{fontSize:11,color:C.ink4,marginTop:3}}>{s.sub}</div>}</div></div>)}
          </div>
        </>
      )}
    </Sheet>
  );
}

// ── APP ROOT ──────────────────────────────────────────────────
function App(){
  const [themeMode,setThemeMode_]=useState(()=>lsG(THEMEK,'system'));
  const [isDark,setIsDark]=useState(false);
  const [user,setUser]=useState(null);
  const [prods,setProds]=useState(DEMO);
  const [trash,setTrash]=useState([]);
  const [page,setPage]=useState('home');
  const [cur,setCur]=useState('EUR');
  const [showAdd,setAdd]=useState(false);
  const [showProf,setProf]=useState(false);
  const [showCurr,setShowCurr]=useState(false);
  const [showInstall,setShowInstall]=useState(false);
  const [expA,setExpA]=useState(null);
  const [boot,setBoot]=useState(true);
  const {list,push}=useToasts();
  const C=isDark?THEMES.dark:THEMES.light;

  const setThemeMode=useCallback(m=>{
    setThemeMode_(m);lsS(THEMEK,m);
    const dark=m==='dark'||(m==='system'&&window.matchMedia('(prefers-color-scheme:dark)').matches);
    setIsDark(dark);document.body.className=dark?'dark':'light';
  },[]);

  useEffect(()=>{
    const m=lsG(THEMEK,'system');
    const dark=m==='dark'||(m==='system'&&window.matchMedia('(prefers-color-scheme:dark)').matches);
    setIsDark(dark);document.body.className=dark?'dark':'light';
    if(m==='system'){const mq=window.matchMedia('(prefers-color-scheme:dark)');const h=()=>{const d=mq.matches;setIsDark(d);document.body.className=d?'dark':'light';};mq.addEventListener('change',h);return()=>mq.removeEventListener('change',h);}
  },[]);

  // ✅ FIXED: onAuthStateChanged handles session restore — no more manual localStorage session loading bug
  useEffect(()=>{
    const unsub=onAuthStateChanged(fbAuth,async fbUser=>{
      if(fbUser){
        const u={name:fbUser.displayName||fbUser.email?.split('@')[0],email:fbUser.email,uid:fbUser.uid,avatar:(fbUser.displayName||'U')[0].toUpperCase(),photoURL:fbUser.photoURL,provider:fbUser.providerData[0]?.providerId||'email',joined:fbUser.metadata.creationTime||new Date().toISOString()};
        setUser(u);lsS(SK,u);
        const [fsData,fsSettings]=await Promise.all([fsLoad(fbUser.uid),fsLoadSettings(fbUser.uid)]);
        const savedProds=fsData||lsG(DK(fbUser.email));
        const savedCur=fsSettings?.currency||lsG(CKs(fbUser.email),'EUR');
        const savedTrash=lsG(TK(fbUser.email),[]);
        if(savedProds&&savedProds.length>0)setProds(savedProds);
        setCur(savedCur);setTrash(savedTrash);
        setTimeout(()=>checkExpiry(savedProds||[]),3000);
      }else{setUser(null);setProds(DEMO);}
      setBoot(false);
    });
    return unsub;
  },[]);

  useEffect(()=>{if(!user)return;lsS(DK(user.email),prods);const t=setTimeout(()=>fsSave(user.uid,prods).catch(()=>{}),2000);return()=>clearTimeout(t);},[prods,user]);
  useEffect(()=>{if(!user)return;lsS(CKs(user.email),cur);fsSaveSettings(user.uid,{currency:cur}).catch(()=>{});},[cur,user]);
  useEffect(()=>{if(!user)return;lsS(TK(user.email),trash);},[trash,user]);
  useEffect(()=>{if(!user)return;const e=prods.find(p=>p.expire&&dL(p.expire)<0&&!p.expConf);if(e&&(!expA||expA.id!==e.id))setExpA(e);},[prods,user]);

  const login=async u=>{
    setUser(u);lsS(SK,u);
    const [fsData,fsSettings]=await Promise.all([fsLoad(u.uid),fsLoadSettings(u.uid)]);
    const savedProds=fsData||lsG(DK(u.email));
    const savedCur=fsSettings?.currency||lsG(CKs(u.email),'EUR');
    if(savedProds&&savedProds.length>0)setProds(savedProds);
    setCur(savedCur);setTrash(lsG(TK(u.email),[]));
    push('Welcome to Shelfie! 🎉','success');
    setTimeout(()=>checkExpiry(savedProds||[]),3000);
  };

  const logout=async()=>{
    try{await fbSignOut(fbAuth);}catch{}
    localStorage.removeItem(SK);
    setUser(null);setProf(false);setPage('home');setProds(DEMO);
  };

  const addProd=(np,replaceId)=>{
    setProds(prev=>{const f=replaceId?prev.filter(p=>p.id!==replaceId):prev;return[np,...f];});
  };
  const mvTrash=id=>{const p=prods.find(x=>x.id===id);if(p){setTrash(t=>[{...p,dAt:new Date().toISOString()},...t].slice(0,50));setProds(prev=>prev.filter(x=>x.id!==id));}};
  const restore=id=>{const p=trash.find(x=>x.id===id);if(p){setProds(prev=>[{...p,dAt:undefined},...prev]);setTrash(t=>t.filter(x=>x.id!==id));push('Restored!','success');}};

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
        <div style={{fontSize:36,fontWeight:900,letterSpacing:-1.5,fontFamily:HEAD,marginBottom:4}}><span style={{color:C.ink}}>shelf</span><span style={{color:C.coral}}>ie</span></div>
        <div style={{fontSize:11,color:C.ink3,fontWeight:600,letterSpacing:3,textTransform:'uppercase',marginBottom:28}}>Pro Edition</div>
        <Spin s={22}/>
      </div>
    </ThemeCtx.Provider>
  );

  if(!user)return(<ThemeCtx.Provider value={C}><Auth onLogin={login}/><Toasts list={list}/></ThemeCtx.Provider>);

  return(
    <ThemeCtx.Provider value={C}>
      <div style={{fontFamily:FONT,background:C.bg,minHeight:'100vh',color:C.ink,maxWidth:480,margin:'0 auto',position:'relative'}}>
        <div style={{position:'fixed',top:0,left:0,right:0,height:'35vh',background:'radial-gradient(ellipse at 75% 0%,'+C.coral+'06,transparent 55%),radial-gradient(ellipse at 15% 0%,'+C.forest+'05,transparent 50%)',pointerEvents:'none',zIndex:0,maxWidth:480,margin:'0 auto'}}/>
        <div style={{position:'relative',zIndex:1}}>
          {page==='home'&&<Home products={prods} user={user} cur={cur} onProfile={()=>setProf(true)} setPage={setPage} setAdd={setAdd}/>}
          {page==='inv'&&<Inv products={prods} cur={cur} onDel={mvTrash} push={push}/>}
          {page==='lens'&&<LensSearch products={prods} cur={cur} push={push}/>}
          {page==='ord'&&<Ord products={prods} push={push} userEmail={user.email}/>}
          {page==='stats'&&<Stat products={prods} cur={cur}/>}
          {page==='trash'&&<Trash items={trash} onRestore={restore} onDel={id=>setTrash(t=>t.filter(x=>x.id!==id))} onEmpty={()=>setTrash([])}/>}
        </div>

        {/* FAB */}
        <div onClick={()=>setAdd(true)} style={{position:'fixed',bottom:88,right:18,zIndex:300,width:52,height:52,borderRadius:'50%',background:C.forestG,display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,cursor:'pointer',color:'#fff',boxShadow:'0 6px 24px '+C.forest+'35',transition:'transform .2s',fontWeight:800}} onMouseOver={e=>e.currentTarget.style.transform='scale(1.1)'} onMouseOut={e=>e.currentTarget.style.transform='scale(1)'}>+</div>

        {/* Trash btn */}
        <div onClick={()=>setPage('trash')} style={{position:'fixed',bottom:88,left:18,zIndex:150,background:C.surf,border:'1.5px solid '+C.bdr,borderRadius:13,padding:'8px 13px',cursor:'pointer',display:'flex',alignItems:'center',gap:6,fontSize:12,color:C.ink3,fontWeight:600,boxShadow:C.cardShadow}}>
          🗑️ {trash.length>0&&<span style={{background:C.danger,color:'#fff',borderRadius:'50%',width:18,height:18,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800}}>{trash.length}</span>}
        </div>

        {/* Bottom Nav */}
        <div style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:480,background:C.navBg,borderTop:'1px solid '+C.bdr,backdropFilter:'blur(24px)',zIndex:200,display:'flex',paddingBottom:'env(safe-area-inset-bottom)'}}>
          {NAV.map(n=>(
            <div key={n.id} onClick={()=>setPage(n.id)} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:n.ctr?'4px 0 12px':'10px 0 12px',cursor:'pointer',position:'relative'}}>
              {n.ctr?(<div style={{width:52,height:52,borderRadius:'50%',marginTop:-22,background:C.coralG,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,color:'#fff',boxShadow:'0 6px 20px '+C.coral+'35',border:'3px solid '+C.bg,transition:'transform .2s'}} onMouseOver={e=>e.currentTarget.style.transform='scale(1.08)'} onMouseOut={e=>e.currentTarget.style.transform='scale(1)'}>{n.icon}</div>):(
                <><div style={{fontSize:17,marginBottom:3,color:page===n.id?C.forest:C.ink4,transition:'color .2s'}}>{n.icon}</div><div style={{fontSize:9,fontWeight:700,letterSpacing:.5,color:page===n.id?C.forest:C.ink4,textTransform:'uppercase',transition:'color .2s'}}>{n.lbl}</div>{page===n.id&&<div style={{position:'absolute',bottom:0,width:20,height:2.5,background:C.forestG,borderRadius:'2px 2px 0 0'}}/>}</>
              )}
            </div>
          ))}
        </div>

        <Toasts list={list}/>

        {expA&&!expA.expConf&&(
          <div style={{position:'fixed',inset:0,background:C.modalBg,zIndex:800,display:'flex',alignItems:'center',justifyContent:'center',padding:24,backdropFilter:'blur(8px)'}}>
            <div className="pp" style={{background:C.surf,borderRadius:24,padding:28,width:'100%',maxWidth:360,boxShadow:'0 24px 80px rgba(0,0,0,.2)',border:'1.5px solid '+C.bdr}}>
              <div style={{width:58,height:58,borderRadius:18,background:C.warn+'12',border:'1.5px solid '+C.warn+'33',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,margin:'0 auto 18px'}}>📅</div>
              <div style={{textAlign:'center',marginBottom:22}}>
                <div style={{fontSize:18,fontWeight:800,color:C.ink,marginBottom:7,fontFamily:HEAD}}>Product Expired</div>
                <div style={{fontSize:13,color:C.ink3,lineHeight:1.75}}><strong style={{color:C.ink}}>{expA.name}</strong> has passed its expiry date. Did you remove it from the shelf?</div>
              </div>
              <div style={{display:'flex',gap:10}}>
                <Btn v="ghost" onClick={()=>setExpA(null)} sx={{flex:1,fontFamily:HEAD}}>Not Yet</Btn>
                <Btn onClick={()=>{setProds(prev=>prev.map(p=>p.id===expA.id?{...p,expConf:true}:p));setExpA(null);push('Alert dismissed.','success');}} sx={{flex:2,fontFamily:HEAD}}>Yes, Removed ✓</Btn>
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
