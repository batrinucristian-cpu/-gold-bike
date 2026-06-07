import { useState, useRef, useCallback, useEffect } from "react";
import { db } from "./firebase";
import {
  collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc
} from "firebase/firestore";

const uid = () => Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (d) => d ? new Date(d).toLocaleDateString("ro-RO", { day: "2-digit", month: "long", year: "numeric" }) : "—";
const fmtShort = (d) => d ? new Date(d).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const STATUSES = ["Preluat", "În lucru", "Gata", "Livrat"];
const SC = {
  "Preluat":  { bg: "#FFF8E1", text: "#F57F17", dot: "#FFC107" },
  "În lucru": { bg: "#E3F2FD", text: "#0D47A1", dot: "#1E88E5" },
  "Gata":     { bg: "#E8F5E9", text: "#1B5E20", dot: "#43A047" },
  "Livrat":   { bg: "#ECEFF1", text: "#37474F", dot: "#78909C" },
};
const COMANDA_ST = { "De comandat": "#FF7043", "Comandat": "#1E88E5", "Sosit": "#43A047" };

const SERVICE = {
  nume: "Gold Bike Service",
  adresa: "Adresa ta aici",
  tel: "07xx xxx xxx",
  email: "email@goldbike.ro",
  cui: "RO00000000",
  zileGratuite: 7,
  taxaZi: 10,
};

const LEGAL = (o, cl, service) => `
CONDIȚII GENERALE DE SERVICE – ${service.nume}

1. IDENTIFICARE PĂRȚI
Prestator: ${service.nume}, ${service.adresa}, CUI ${service.cui}, Tel: ${service.tel}
Client: ${cl?.nume || "—"}, ${cl?.adresa || "—"}, Tel: ${cl?.tel || "—"}

2. OBIECT CONTRACT
Clientul predă spre reparare bicicleta: ${o.bicicleta}
Defecte declarate la predare: ${o.defect}
Data predării: ${fmt(o.data)}

3. DEVIZ ESTIMATIV
Clientul a luat la cunoștință devizul estimativ și autorizează efectuarea lucrărilor. Prețul final poate varia față de estimare dacă în cursul reparației se descoperă defecte suplimentare. Orice modificare semnificativă va fi comunicată clientului înainte de execuție.

4. TERMEN DE RIDICARE ȘI TAXĂ DE DEPOZITARE
Clientul va fi notificat când bicicleta este gata. După ${service.zileGratuite} zile lucrătoare de la notificare, se va percepe o taxă de depozitare de ${service.taxaZi} lei/zi calendaristică. ${service.nume} nu răspunde pentru bunurile neridicate după 90 de zile.

5. LIMITAREA RĂSPUNDERII
${service.nume} nu răspunde pentru defecte nedeclarate la predare, uzura naturală sau daune independente de reparația efectuată. Răspunderea prestatorului este limitată la valoarea lucrărilor efectuate.

6. PROTECȚIA DATELOR (GDPR)
Datele personale ale clientului sunt prelucrate exclusiv în scopul prestării serviciilor. Nu vor fi transmise terților fără consimțământ. Clientul are dreptul de acces, rectificare și ștergere. Contact: ${service.email}

Prin semnătură, clientul confirmă că a citit și acceptat toate condițiile de mai sus.
`.trim();

function printDeviz(o, cl, service) {
  const totalP = (o.piese||[]).reduce((s,p)=>s+Number(p.cant)*Number(p.pret),0);
  const total = totalP + Number(o.manopera||0);
  const win = window.open("","_blank");
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Deviz – ${cl?.nume}</title>
  <style>body{font-family:Arial,sans-serif;max-width:700px;margin:40px auto;color:#222;font-size:13px}h1{font-size:20px;margin:0}h2{font-size:14px;margin:16px 0 8px;border-bottom:1px solid #ddd;padding-bottom:4px}.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #E63946}.badge{background:#E63946;color:#fff;padding:3px 10px;border-radius:4px;font-size:11px;font-weight:bold}table{width:100%;border-collapse:collapse;margin-bottom:12px}th{background:#F5F5F5;padding:7px 10px;text-align:left;font-size:11px;border:1px solid #E0E0E0}td{padding:7px 10px;border:1px solid #E0E0E0}.total{font-size:16px;font-weight:900;color:#E63946;text-align:right;margin:8px 0}.legal{font-size:10px;color:#555;margin-top:20px;padding:12px;background:#F9F9F9;border-radius:6px;white-space:pre-line;line-height:1.6}.sig{margin-top:30px;display:flex;justify-content:space-between}.sig-box{text-align:center;width:45%}.sig-box img{max-width:200px;border:1px solid #ddd;border-radius:6px}.sig-line{border-top:1px solid #222;margin-top:40px;padding-top:4px;font-size:11px}@media print{body{margin:20px}}</style></head><body>
  <div class="header"><div><h1>🔧 ${service.nume}</h1><div style="color:#666;margin-top:4px">${service.adresa} · ${service.tel} · ${service.email}</div><div style="color:#888;font-size:11px">CUI: ${service.cui}</div></div><div style="text-align:right"><div class="badge">DEVIZ DE LUCRĂRI</div><div style="margin-top:6px;font-size:12px">Nr. ${o.id.toUpperCase()}<br>Data: ${fmt(o.data)}</div></div></div>
  <h2>Date client & bicicletă</h2>
  <table><tr><th>Client</th><td>${cl?.nume||"—"}</td><th>Telefon</th><td>${cl?.tel||"—"}</td></tr><tr><th>Adresă</th><td>${cl?.adresa||"—"}</td><th>Email</th><td>${cl?.email||"—"}</td></tr><tr><th>Bicicletă</th><td colspan="3">${o.bicicleta}</td></tr><tr><th>Defecte raportate</th><td colspan="3">${o.defect}</td></tr>${o.lucrarilEfectuate?`<tr><th>Lucrări efectuate</th><td colspan="3">${o.lucrarilEfectuate}</td></tr>`:""}</table>
  <h2>Piese înlocuite</h2>
  <table><tr><th>Denumire</th><th>Cant.</th><th>Preț unitar</th><th>Total</th></tr>${(o.piese||[]).map(p=>`<tr><td>${p.nume}</td><td style="text-align:center">${p.cant}</td><td style="text-align:right">${p.pret} lei</td><td style="text-align:right">${Number(p.cant)*Number(p.pret)} lei</td></tr>`).join("")}<tr><td colspan="3" style="text-align:right;font-weight:bold">Subtotal piese</td><td style="text-align:right">${totalP} lei</td></tr><tr><td colspan="3" style="text-align:right;font-weight:bold">Manoperă</td><td style="text-align:right">${o.manopera||0} lei</td></tr></table>
  <div class="total">TOTAL DE PLATĂ: ${total} lei</div>
  <div class="legal">${LEGAL(o,cl,service)}</div>
  <div class="sig"><div class="sig-box"><div class="sig-line">Prestator: ${service.nume}</div></div><div class="sig-box">${o.semnatura ? `<img src="${o.semnatura}" />` : ""}<div class="sig-line">Client: ${cl?.nume||"—"}<br>Data: ${fmt(today())}</div></div></div>
  <script>window.onload=()=>{window.print()}<\/script></body></html>`);
  win.document.close();
}

const Badge = ({ s }) => { const c=SC[s]||SC["Preluat"]; return <span style={{background:c.bg,color:c.text,borderRadius:20,padding:"3px 11px",fontSize:11,fontWeight:700,display:"inline-flex",alignItems:"center",gap:5}}><span style={{width:6,height:6,borderRadius:"50%",background:c.dot}}/>{s}</span>; };
const Label = ({ t }) => <div style={{fontSize:10,fontWeight:800,color:"#9E9E9E",textTransform:"uppercase",letterSpacing:1.2,marginBottom:5}}>{t}</div>;
const TA = ({ value, onChange, placeholder, rows=3 }) => <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{width:"100%",padding:"10px 12px",borderRadius:10,border:"1.5px solid #E0E0E0",fontSize:13,outline:"none",resize:"vertical",boxSizing:"border-box",background:"#FAFAFA",fontFamily:"inherit"}}/>;
const Btn = ({ onClick, children, color="#E63946", outline, small, disabled, style:sx }) => <button onClick={onClick} disabled={disabled} style={{padding:small?"7px 14px":"12px 0",borderRadius:small?8:12,fontSize:small?12:14,fontWeight:700,cursor:disabled?"not-allowed":"pointer",border:outline?`2px solid ${color}`:"none",background:outline?"transparent":color,color:outline?color:"#fff",flex:small?"unset":1,opacity:disabled?0.5:1,transition:"opacity 0.15s",...sx}}>{children}</button>;
const Card = ({ children, style:sx }) => <div style={{background:"#fff",borderRadius:14,padding:16,marginBottom:12,boxShadow:"0 1px 6px rgba(0,0,0,0.07)",...sx}}>{children}</div>;

function Modal({ title, onClose, children, wide }) {
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:100,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{background:"#F2F3F8",borderRadius:"24px 24px 0 0",width:"100%",maxWidth:wide?560:480,maxHeight:"92vh",overflowY:"auto",padding:"24px 20px 40px",animation:"slideUp 0.25s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{fontWeight:900,fontSize:18,color:"#1a1a2e"}}>{title}</div>
        <button onClick={onClose} style={{background:"#EBEBF0",border:"none",borderRadius:"50%",width:32,height:32,cursor:"pointer",fontSize:15}}>✕</button>
      </div>
      {children}
    </div>
  </div>;
}

function SignaturePad({ onSave, onClose, legalText }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const getPos = (e,c) => { const r=c.getBoundingClientRect(); const s=e.touches?e.touches[0]:e; return [s.clientX-r.left,s.clientY-r.top]; };
  const start = e => { drawing.current=true; const c=canvasRef.current; const ctx=c.getContext("2d"); const [x,y]=getPos(e,c); ctx.beginPath(); ctx.moveTo(x,y); e.preventDefault(); };
  const move  = e => { if(!drawing.current)return; const c=canvasRef.current; const ctx=c.getContext("2d"); const [x,y]=getPos(e,c); ctx.lineWidth=2.5; ctx.lineCap="round"; ctx.strokeStyle="#1a1a2e"; ctx.lineTo(x,y); ctx.stroke(); e.preventDefault(); };
  const stop  = () => { drawing.current=false; };
  const clear = () => { const c=canvasRef.current; c.getContext("2d").clearRect(0,0,c.width,c.height); };
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{background:"#fff",borderRadius:"20px 20px 0 0",width:"100%",maxWidth:500,maxHeight:"90vh",overflowY:"auto",padding:"20px 20px 32px"}}>
        <div style={{fontWeight:900,fontSize:16,marginBottom:10}}>✍️ Semnătură & acordul clientului</div>
        <div style={{background:"#F9F9F9",border:"1px solid #E0E0E0",borderRadius:10,padding:12,fontSize:10,color:"#444",maxHeight:200,overflowY:"auto",marginBottom:14,lineHeight:1.7,whiteSpace:"pre-line"}}>{legalText}</div>
        <div style={{fontSize:12,color:"#E63946",fontWeight:700,marginBottom:8}}>Prin semnătură confirm că am citit și accept condițiile de mai sus:</div>
        <canvas ref={canvasRef} width={440} height={140} style={{border:"2px solid #E63946",borderRadius:12,touchAction:"none",cursor:"crosshair",width:"100%",background:"#FAFAFA"}}
          onMouseDown={start} onMouseMove={move} onMouseUp={stop} onMouseLeave={stop}
          onTouchStart={start} onTouchMove={move} onTouchEnd={stop}/>
        <div style={{display:"flex",gap:8,marginTop:12}}>
          <Btn onClick={clear} color="#888" outline small>Șterge</Btn>
          <Btn onClick={onClose} color="#888" outline small>Anulează</Btn>
          <Btn onClick={()=>onSave(canvasRef.current.toDataURL("image/png"))} small>Salvează</Btn>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [orders,  setOrders]  = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState("comenzi");
  const [sel,     setSel]     = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [showSig, setShowSig] = useState(false);
  const [showProg,setShowProg]= useState(false);
  const [search,  setSearch]  = useState("");
  const [fStatus, setFStatus] = useState("Toate");
  const fileRef = useRef(null);

  // ── Firebase listeners ──────────────────────────────────────────────────────
  useEffect(() => {
    const unsubOrders = onSnapshot(collection(db, "orders"), snap => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    const unsubClients = onSnapshot(collection(db, "clients"), snap => {
      setClients(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubOrders(); unsubClients(); };
  }, []);

  const selOrder = orders.find(o => o.id === sel);

  // ── Firebase helpers ────────────────────────────────────────────────────────
  const saveOrder = async (id, data) => {
    await setDoc(doc(db, "orders", id), data);
  };
  const saveClient = async (id, data) => {
    await setDoc(doc(db, "clients", id), data);
  };
  const patchOrder = async (id, delta) => {
    await updateDoc(doc(db, "orders", id), delta);
  };

  // ── New order form ──────────────────────────────────────────────────────────
  const emptyForm = {clientId:"",numeNou:"",telNou:"",adresaNou:"",emailNou:"",bicicleta:"",defect:"",observatii:"",nextRevizieData:""};
  const [form,setForm] = useState(emptyForm);
  const setF = k=>v=>setForm(f=>({...f,[k]:v}));

  async function handleSaveOrder() {
    if(!form.bicicleta||!form.defect) return;
    let cid = form.clientId;
    if(!cid && form.numeNou) {
      cid = uid();
      await saveClient(cid, { nume:form.numeNou, tel:form.telNou, email:form.emailNou, adresa:form.adresaNou });
    }
    if(!cid) return;
    const id = uid();
    await saveOrder(id, { clientId:cid, bicicleta:form.bicicleta, defect:form.defect, status:"Preluat", data:today(), observatii:form.observatii, lucrarilEfectuate:"", poze:[], semnatura:null, piese:[], comenziPiese:[], manopera:0, nextRevizieData:form.nextRevizieData, dataNotificare:"" });
    setForm(emptyForm);
    setShowNew(false);
  }

  // ── Photos ──────────────────────────────────────────────────────────────────
  function handlePhotos(e) {
    const files = Array.from(e.target.files);
    e.target.value = "";
    files.forEach(f => {
      const r = new FileReader();
      r.onload = async ev => {
        const order = orders.find(o => o.id === sel);
        const newPoze = [...(order.poze||[]), { id:uid(), url:ev.target.result, name:f.name }];
        await patchOrder(sel, { poze: newPoze });
      };
      r.readAsDataURL(f);
    });
  }

  // ── Piese ───────────────────────────────────────────────────────────────────
  const addPiesa = async (id) => {
    const o = orders.find(x=>x.id===id);
    await patchOrder(id, { piese:[...(o.piese||[]),{id:uid(),nume:"",cant:1,pret:0}] });
  };
  const patchPiesa = async (oid, pid, delta) => {
    const o = orders.find(x=>x.id===oid);
    await patchOrder(oid, { piese: o.piese.map(p=>p.id!==pid?p:{...p,...delta}) });
  };
  const delPiesa = async (oid, pid) => {
    const o = orders.find(x=>x.id===oid);
    await patchOrder(oid, { piese: o.piese.filter(p=>p.id!==pid) });
  };

  // ── Comenzi piese ───────────────────────────────────────────────────────────
  const addComanda = async (id) => {
    const o = orders.find(x=>x.id===id);
    await patchOrder(id, { comenziPiese:[...(o.comenziPiese||[]),{id:uid(),nume:"",furnizor:"",status:"De comandat"}] });
  };
  const patchComanda = async (oid, cid, delta) => {
    const o = orders.find(x=>x.id===oid);
    await patchOrder(oid, { comenziPiese: o.comenziPiese.map(c=>c.id!==cid?c:{...c,...delta}) });
  };
  const delComanda = async (oid, cid) => {
    const o = orders.find(x=>x.id===oid);
    await patchOrder(oid, { comenziPiese: o.comenziPiese.filter(c=>c.id!==cid) });
  };

  const filtered = orders.filter(o=>{
    const cl=clients.find(c=>c.id===o.clientId);
    const q=search.toLowerCase();
    return ((cl?.nume||"").toLowerCase().includes(q)||o.bicicleta.toLowerCase().includes(q)||o.defect.toLowerCase().includes(q))&&(fStatus==="Toate"||o.status===fStatus);
  });
  const counts=STATUSES.reduce((a,s)=>({...a,[s]:orders.filter(o=>o.status===s).length}),{});
  const totalPiese=o=>(o.piese||[]).reduce((s,p)=>s+Number(p.cant)*Number(p.pret),0);
  const totalCost =o=>totalPiese(o)+Number(o.manopera||0);
  const bikeHistory=selOrder?orders.filter(o=>o.clientId===selOrder.clientId&&o.bicicleta===selOrder.bicicleta).sort((a,b)=>b.data.localeCompare(a.data)):[];
  const revizii=orders.filter(o=>o.nextRevizieData&&o.status!=="Livrat").sort((a,b)=>a.nextRevizieData.localeCompare(b.nextRevizieData));

  if(loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#F2F3F8",flexDirection:"column",gap:16}}><div style={{fontSize:40}}>🔧</div><div style={{fontWeight:700,color:"#1a1a2e"}}>Gold Bike Service</div><div style={{color:"#aaa",fontSize:14}}>Se încarcă datele...</div></div>;

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",background:"#F2F3F8",minHeight:"100vh",maxWidth:480,margin:"0 auto",paddingBottom:80}}>
      <style>{`@keyframes slideUp{from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1}} input:focus,textarea:focus,select:focus{border-color:#E63946!important;background:#fff!important;outline:none} ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:#ddd;border-radius:4px}`}</style>

      {/* HEADER */}
      <div style={{background:"linear-gradient(135deg,#1a1a2e 0%,#16213e 100%)",padding:"48px 20px 24px",color:"#fff"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{fontSize:22,fontWeight:900,letterSpacing:-0.5}}>🚲 Gold Bike <span style={{color:"#E63946"}}>Service</span></div>
            <div style={{fontSize:11,opacity:0.55,marginTop:2}}>Management complet service biciclete</div>
          </div>
          <button onClick={()=>setShowProg(true)} style={{background:"rgba(230,57,70,0.2)",border:"1.5px solid rgba(230,57,70,0.5)",borderRadius:10,padding:"7px 12px",color:"#E63946",fontSize:11,fontWeight:700,cursor:"pointer"}}>📅 Revizii</button>
        </div>
        <div style={{display:"flex",gap:8,marginTop:16}}>
          {[["Preluate","Preluat"],["În lucru","În lucru"],["Gata","Gata"],["Livrate","Livrat"]].map(([lb,key])=>(
            <div key={key} onClick={()=>{setFStatus(fStatus===key?"Toate":key);setTab("comenzi");}} style={{background:fStatus===key?"rgba(230,57,70,0.25)":"rgba(255,255,255,0.08)",borderRadius:10,padding:"8px 6px",flex:1,textAlign:"center",cursor:"pointer",border:fStatus===key?"1px solid rgba(230,57,70,0.5)":"1px solid transparent",transition:"all 0.2s"}}>
              <div style={{fontSize:20,fontWeight:900}}>{counts[key]||0}</div>
              <div style={{fontSize:9,opacity:0.75}}>{lb}</div>
            </div>
          ))}
        </div>
      </div>

      {/* TABS */}
      <div style={{display:"flex",background:"#fff",borderBottom:"1px solid #EBEBEB"}}>
        {[["comenzi","📋 Comenzi"],["clienti","👤 Clienți"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{flex:1,padding:"13px 0",background:"none",border:"none",cursor:"pointer",fontSize:13,fontWeight:tab===k?800:500,color:tab===k?"#E63946":"#9E9E9E",borderBottom:tab===k?"2.5px solid #E63946":"2.5px solid transparent"}}>{l}</button>
        ))}
      </div>

      <div style={{padding:"14px 14px 0"}}>
        {tab==="comenzi"&&(<>
          <div style={{position:"relative",marginBottom:10}}>
            <span style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",fontSize:14}}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Caută client, bicicletă, defect..." style={{width:"100%",padding:"10px 12px 10px 34px",borderRadius:12,border:"1.5px solid #E0E0E0",fontSize:13,outline:"none",background:"#fff",boxSizing:"border-box"}}/>
          </div>
          <div style={{display:"flex",gap:7,marginBottom:12,overflowX:"auto",paddingBottom:2}}>
            {["Toate",...STATUSES].map(s=>(
              <button key={s} onClick={()=>setFStatus(s)} style={{padding:"5px 13px",borderRadius:20,border:"1.5px solid",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",borderColor:fStatus===s?"#E63946":"#E0E0E0",background:fStatus===s?"#E63946":"#fff",color:fStatus===s?"#fff":"#666"}}>{s}</button>
            ))}
          </div>
          {filtered.length===0&&<div style={{textAlign:"center",color:"#bbb",padding:40,fontSize:14}}>Nicio comandă. Apasă + pentru a adăuga!</div>}
          {filtered.map(o=>{
            const cl=clients.find(c=>c.id===o.clientId);
            const pending=(o.comenziPiese||[]).filter(c=>c.status==="De comandat").length;
            return (
              <div key={o.id} onClick={()=>setSel(o.id)} style={{background:"#fff",borderRadius:14,padding:14,marginBottom:10,boxShadow:"0 1px 6px rgba(0,0,0,0.07)",cursor:"pointer",borderLeft:`4px solid ${SC[o.status]?.dot||"#ccc"}`,transition:"transform 0.12s"}}
                onMouseDown={e=>e.currentTarget.style.transform="scale(0.98)"} onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5}}>
                  <div><div style={{fontWeight:700,fontSize:14,color:"#1a1a2e"}}>{cl?.nume||"—"}</div><div style={{fontSize:11,color:"#aaa",marginTop:1}}>{o.bicicleta}</div></div>
                  <Badge s={o.status}/>
                </div>
                <div style={{fontSize:12,color:"#666",marginBottom:6,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{o.defect}</div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#bbb",flexWrap:"wrap",gap:4}}>
                  <span>📞 {cl?.tel||"—"}</span>
                  <span style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {(o.poze||[]).length>0&&<span>📷{o.poze.length}</span>}
                    {o.semnatura&&<span>✍️</span>}
                    {pending>0&&<span style={{color:"#FF7043",fontWeight:700}}>📦{pending}</span>}
                    {totalCost(o)>0&&<span style={{color:"#43A047",fontWeight:700}}>{totalCost(o)} lei</span>}
                    <span>📅{fmtShort(o.data)}</span>
                  </span>
                </div>
              </div>
            );
          })}
          <button onClick={()=>setShowNew(true)} style={{position:"fixed",bottom:88,right:20,width:54,height:54,borderRadius:"50%",background:"#E63946",border:"none",color:"#fff",fontSize:26,cursor:"pointer",boxShadow:"0 4px 18px rgba(230,57,70,0.45)",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
        </>)}

        {tab==="clienti"&&clients.map(c=>{
          const cos=orders.filter(o=>o.clientId===c.id);
          return <Card key={c.id}>
            <div style={{fontWeight:800,fontSize:15,color:"#1a1a2e"}}>{c.nume}</div>
            <div style={{fontSize:12,color:"#888",marginTop:2}}>📞 {c.tel} {c.email&&`· ${c.email}`}</div>
            {c.adresa&&<div style={{fontSize:11,color:"#bbb",marginTop:1}}>📍 {c.adresa}</div>}
            <div style={{marginTop:10,display:"flex",flexWrap:"wrap",gap:6}}>{[...new Set(cos.map(o=>o.bicicleta))].map((b,i)=><span key={i} style={{background:"#F0F4FF",borderRadius:8,padding:"3px 10px",fontSize:11,color:"#3949AB"}}>🚲 {b}</span>)}</div>
            <div style={{marginTop:6,fontSize:11,color:"#bbb"}}>{cos.length} comenzi · Total: {cos.reduce((s,o)=>s+totalCost(o),0)} lei</div>
          </Card>;
        })}
      </div>

      {/* NAV */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:"#fff",borderTop:"1px solid #EBEBEB",display:"flex"}}>
        {[["comenzi","📋","Comenzi"],["clienti","👤","Clienți"]].map(([k,ic,lb])=>(
          <button key={k} onClick={()=>setTab(k)} style={{flex:1,padding:"8px 0 12px",background:"none",border:"none",cursor:"pointer",color:tab===k?"#E63946":"#bbb",fontSize:11,fontWeight:700}}>
            <div style={{fontSize:20}}>{ic}</div>{lb}
          </button>
        ))}
      </div>

      {/* DETAIL MODAL */}
      {sel&&selOrder&&(()=>{
        const cl=clients.find(c=>c.id===selOrder.clientId);
        return <Modal title="Detalii comandă" onClose={()=>setSel(null)} wide>
          <div style={{display:"flex",gap:6,marginBottom:14,overflowX:"auto"}}>
            {STATUSES.map(s=><button key={s} onClick={()=>patchOrder(sel,{status:s})} style={{padding:"6px 12px",borderRadius:10,border:`2px solid ${SC[s].dot}`,background:selOrder.status===s?SC[s].dot:"transparent",color:selOrder.status===s?"#fff":SC[s].text,fontWeight:700,fontSize:11,cursor:"pointer",whiteSpace:"nowrap"}}>{s}</button>)}
          </div>
          <Btn onClick={()=>printDeviz(selOrder,cl,SERVICE)} color="#1565C0" outline small style={{marginBottom:14,width:"100%"}}>🖨️ Tipărește deviz / PDF</Btn>
          <Card><Label t="Client"/><div style={{fontWeight:800,fontSize:15}}>{cl?.nume}</div><div style={{fontSize:13,color:"#888",marginTop:2}}>📞 {cl?.tel} {cl?.email&&`· ${cl.email}`}</div>{cl?.adresa&&<div style={{fontSize:11,color:"#bbb",marginTop:1}}>📍 {cl.adresa}</div>}</Card>
          <Card><Label t="Bicicletă & defecte"/><div style={{fontWeight:700,fontSize:14,marginBottom:4}}>🚲 {selOrder.bicicleta}</div><div style={{fontSize:13,color:"#555"}}>{selOrder.defect}</div></Card>
          <Card><Label t="Observații inițiale (client)"/><TA value={selOrder.observatii||""} onChange={v=>patchOrder(sel,{observatii:v})} placeholder="Ce a spus clientul..."/></Card>
          <Card style={{borderLeft:"3px solid #43A047"}}><Label t="🔧 Lucrări efectuate (mecanic)"/><TA value={selOrder.lucrarilEfectuate||""} onChange={v=>patchOrder(sel,{lucrarilEfectuate:v})} placeholder="Descrie exact ce s-a reparat..." rows={4}/></Card>
          <Card>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><Label t="Piese înlocuite"/><Btn onClick={()=>addPiesa(sel)} small color="#3949AB">+ Piesă</Btn></div>
            {(selOrder.piese||[]).length===0&&<div style={{fontSize:12,color:"#bbb"}}>Nicio piesă</div>}
            {(selOrder.piese||[]).map(p=>(
              <div key={p.id} style={{display:"flex",gap:5,marginBottom:7,alignItems:"center"}}>
                <input value={p.nume} onChange={e=>patchPiesa(sel,p.id,{nume:e.target.value})} placeholder="Denumire" style={{flex:3,padding:"7px 9px",borderRadius:8,border:"1.5px solid #E0E0E0",fontSize:12,outline:"none"}}/>
                <input value={p.cant} type="number" min={1} onChange={e=>patchPiesa(sel,p.id,{cant:e.target.value})} style={{flex:"0 0 44px",padding:"7px 5px",borderRadius:8,border:"1.5px solid #E0E0E0",fontSize:12,outline:"none",textAlign:"center"}}/>
                <input value={p.pret} type="number" min={0} onChange={e=>patchPiesa(sel,p.id,{pret:e.target.value})} placeholder="Lei" style={{flex:1,padding:"7px 8px",borderRadius:8,border:"1.5px solid #E0E0E0",fontSize:12,outline:"none",textAlign:"right"}}/>
                <button onClick={()=>delPiesa(sel,p.id)} style={{background:"#FFEBEE",border:"none",borderRadius:8,padding:"7px 9px",cursor:"pointer",color:"#E63946",fontWeight:700}}>✕</button>
              </div>
            ))}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10,paddingTop:10,borderTop:"1px dashed #E0E0E0"}}>
              <span style={{fontSize:13,fontWeight:700,color:"#555"}}>Manoperă (lei):</span>
              <input value={selOrder.manopera||""} type="number" min={0} onChange={e=>patchOrder(sel,{manopera:e.target.value})} style={{width:80,padding:"7px 10px",borderRadius:8,border:"1.5px solid #E0E0E0",fontSize:13,outline:"none",textAlign:"right"}}/>
            </div>
            {totalCost(selOrder)>0&&<div style={{marginTop:8,textAlign:"right",fontSize:16,fontWeight:900,color:"#43A047"}}>TOTAL: {totalCost(selOrder)} lei</div>}
          </Card>
          <Card style={{borderLeft:"3px solid #FF7043"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><Label t="📦 Piese de comandat"/><Btn onClick={()=>addComanda(sel)} small color="#FF7043">+ Adaugă</Btn></div>
            {(selOrder.comenziPiese||[]).length===0&&<div style={{fontSize:12,color:"#bbb"}}>Nicio piesă de comandat</div>}
            {(selOrder.comenziPiese||[]).map(c=>(
              <div key={c.id} style={{marginBottom:8,padding:"10px",background:"#FFF8F6",borderRadius:10,border:"1px solid #FFE0D0"}}>
                <div style={{display:"flex",gap:5,marginBottom:6}}>
                  <input value={c.nume} onChange={e=>patchComanda(sel,c.id,{nume:e.target.value})} placeholder="Denumire piesă" style={{flex:2,padding:"6px 9px",borderRadius:7,border:"1.5px solid #E0E0E0",fontSize:12,outline:"none"}}/>
                  <input value={c.furnizor} onChange={e=>patchComanda(sel,c.id,{furnizor:e.target.value})} placeholder="Furnizor" style={{flex:1,padding:"6px 9px",borderRadius:7,border:"1.5px solid #E0E0E0",fontSize:12,outline:"none"}}/>
                  <button onClick={()=>delComanda(sel,c.id)} style={{background:"#FFEBEE",border:"none",borderRadius:7,padding:"6px 9px",cursor:"pointer",color:"#E63946",fontWeight:700}}>✕</button>
                </div>
                <div style={{display:"flex",gap:5}}>{["De comandat","Comandat","Sosit"].map(st=><button key={st} onClick={()=>patchComanda(sel,c.id,{status:st})} style={{padding:"4px 10px",borderRadius:6,border:`1.5px solid ${COMANDA_ST[st]}`,background:c.status===st?COMANDA_ST[st]:"transparent",color:c.status===st?"#fff":COMANDA_ST[st],fontSize:10,fontWeight:700,cursor:"pointer"}}>{st}</button>)}</div>
              </div>
            ))}
          </Card>
          <Card style={{borderLeft:"3px solid #1565C0"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><Label t="📷 Fotografii bicicletă"/><Btn onClick={()=>fileRef.current?.click()} small color="#1565C0">+ Adaugă</Btn><input ref={fileRef} type="file" accept="image/*" multiple capture="environment" style={{display:"none"}} onChange={handlePhotos}/></div>
            {(selOrder.poze||[]).length===0
              ?<div style={{background:"#F0F4FF",borderRadius:10,padding:"20px",textAlign:"center",color:"#90A4AE",fontSize:13,border:"2px dashed #BBDEFB"}}><div style={{fontSize:28,marginBottom:4}}>📷</div>Apasă + pentru a fotografia bicicleta</div>
              :<><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{(selOrder.poze||[]).map(pz=><div key={pz.id} style={{position:"relative"}}><img src={pz.url} alt={pz.name} style={{width:90,height:90,objectFit:"cover",borderRadius:12,border:"2px solid #BBDEFB",display:"block"}}/><button onClick={async()=>{const o=orders.find(x=>x.id===sel);await patchOrder(sel,{poze:o.poze.filter(x=>x.id!==pz.id)});}} style={{position:"absolute",top:-7,right:-7,background:"#E63946",border:"2px solid #fff",borderRadius:"50%",width:22,height:22,color:"#fff",fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900}}>✕</button></div>)}</div><div style={{marginTop:8,fontSize:11,color:"#90A4AE"}}>{(selOrder.poze||[]).length} fotografii</div></>
            }
          </Card>
          <Card>
            <Label t="Data notificării client"/>
            <input type="date" value={selOrder.dataNotificare||""} onChange={e=>patchOrder(sel,{dataNotificare:e.target.value})} style={{width:"100%",padding:"10px 12px",borderRadius:10,border:"1.5px solid #E0E0E0",fontSize:14,outline:"none",boxSizing:"border-box",background:"#FAFAFA"}}/>
            {selOrder.dataNotificare&&(()=>{
              const days=Math.ceil((new Date()-new Date(selOrder.dataNotificare))/(1000*60*60*24))-SERVICE.zileGratuite;
              if(days>0) return <div style={{marginTop:8,background:"#FFEBEE",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#E63946",fontWeight:700}}>⚠️ Taxă depozitare: {days} zile × {SERVICE.taxaZi} lei = {days*SERVICE.taxaZi} lei</div>;
              const ramas=SERVICE.zileGratuite-Math.ceil((new Date()-new Date(selOrder.dataNotificare))/(1000*60*60*24));
              return <div style={{marginTop:8,background:"#E8F5E9",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#388E3C"}}>✅ În termen – mai sunt {ramas} zile gratuite</div>;
            })()}
          </Card>
          <Card style={{borderLeft:"3px solid #E63946"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><Label t="Semnătură & acord client"/><Btn onClick={()=>setShowSig(true)} small color={selOrder.semnatura?"#888":"#E63946"} outline={!!selOrder.semnatura}>{selOrder.semnatura?"✏️ Resemnează":"✍️ Semnează"}</Btn></div>
            {selOrder.semnatura?<img src={selOrder.semnatura} alt="Semnătură" style={{maxWidth:"100%",border:"1.5px solid #E0E0E0",borderRadius:10,background:"#FAFAFA"}}/>:<div style={{fontSize:12,color:"#bbb",padding:"16px 0",textAlign:"center"}}>Nesemnat</div>}
          </Card>
          <Card><Label t="Următoarea revizie"/><input type="date" value={selOrder.nextRevizieData||""} onChange={e=>patchOrder(sel,{nextRevizieData:e.target.value})} style={{width:"100%",padding:"10px 12px",borderRadius:10,border:"1.5px solid #E0E0E0",fontSize:14,outline:"none",boxSizing:"border-box",background:"#FAFAFA"}}/></Card>
          {bikeHistory.length>1&&<Card><Label t={`Istoric ${selOrder.bicicleta}`}/>{bikeHistory.map(h=><div key={h.id} onClick={()=>setSel(h.id)} style={{padding:"10px 0",borderBottom:"1px solid #F0F0F0",cursor:"pointer"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:13,fontWeight:600,color:"#1a1a2e"}}>{fmt(h.data)}</span><Badge s={h.status}/></div><div style={{fontSize:12,color:"#777",marginTop:3}}>{h.defect}</div>{h.lucrarilEfectuate&&<div style={{fontSize:11,color:"#43A047",marginTop:2}}>✔ {h.lucrarilEfectuate.slice(0,60)}{h.lucrarilEfectuate.length>60?"…":""}</div>}{totalCost(h)>0&&<div style={{fontSize:11,color:"#888",marginTop:1}}>Cost: {totalCost(h)} lei</div>}</div>)}</Card>}
        </Modal>;
      })()}

      {/* NEW ORDER */}
      {showNew&&<Modal title="Comandă nouă" onClose={()=>setShowNew(false)}>
        <Card><Label t="Client existent"/>
          <select value={form.clientId} onChange={e=>setF("clientId")(e.target.value)} style={{width:"100%",padding:"10px 12px",borderRadius:10,border:"1.5px solid #E0E0E0",fontSize:14,outline:"none",background:"#FAFAFA"}}>
            <option value="">— Selectează client existent —</option>
            {clients.map(c=><option key={c.id} value={c.id}>{c.nume} ({c.tel})</option>)}
          </select>
        </Card>
        {!form.clientId&&<Card><Label t="Sau client nou"/>{[["numeNou","Nume complet"],["telNou","Telefon"],["emailNou","Email"],["adresaNou","Adresă"]].map(([k,ph])=><div key={k} style={{marginBottom:8}}><input value={form[k]} onChange={e=>setF(k)(e.target.value)} placeholder={ph} style={{width:"100%",padding:"9px 12px",borderRadius:10,border:"1.5px solid #E0E0E0",fontSize:13,outline:"none",boxSizing:"border-box",background:"#FAFAFA"}}/></div>)}</Card>}
        <Card><Label t="Bicicletă"/><input value={form.bicicleta} onChange={e=>setF("bicicleta")(e.target.value)} placeholder="ex. Trek FX3 – Negru" style={{width:"100%",padding:"9px 12px",borderRadius:10,border:"1.5px solid #E0E0E0",fontSize:13,outline:"none",boxSizing:"border-box",background:"#FAFAFA"}}/></Card>
        <Card><Label t="Defecte raportate"/><TA value={form.defect} onChange={setF("defect")} placeholder="Descrie defectele..."/></Card>
        <Card><Label t="Observații inițiale"/><TA value={form.observatii} onChange={setF("observatii")} placeholder="Opțional" rows={2}/></Card>
        <Card><Label t="Revizie planificată"/><input type="date" value={form.nextRevizieData} onChange={e=>setF("nextRevizieData")(e.target.value)} style={{width:"100%",padding:"9px 12px",borderRadius:10,border:"1.5px solid #E0E0E0",fontSize:14,outline:"none",boxSizing:"border-box",background:"#FAFAFA"}}/></Card>
        <div style={{display:"flex",gap:10}}><Btn onClick={()=>setShowNew(false)} color="#888" outline>Anulează</Btn><Btn onClick={handleSaveOrder} disabled={!form.bicicleta||!form.defect||(!form.clientId&&!form.numeNou)}>Salvează</Btn></div>
      </Modal>}

      {showSig&&selOrder&&<SignaturePad onSave={sig=>{patchOrder(sel,{semnatura:sig});setShowSig(false);}} onClose={()=>setShowSig(false)} legalText={LEGAL(selOrder,clients.find(c=>c.id===selOrder.clientId),SERVICE)}/>}

      {showProg&&<Modal title="📅 Programări revizii" onClose={()=>setShowProg(false)}>
        {revizii.length===0&&<div style={{textAlign:"center",color:"#bbb",padding:30}}>Nicio revizie planificată</div>}
        {revizii.map(o=>{
          const cl=clients.find(c=>c.id===o.clientId);
          const days=Math.ceil((new Date(o.nextRevizieData)-new Date())/(1000*60*60*24));
          const past=days<0; const urgent=days<=7&&days>=0;
          return <div key={o.id} onClick={()=>{setShowProg(false);setSel(o.id);}} style={{background:past?"#FFEBEE":urgent?"#FFF8E1":"#fff",borderRadius:12,padding:14,marginBottom:10,cursor:"pointer",border:`1.5px solid ${past?"#FFCDD2":urgent?"#FFE082":"#E0E0E0"}`}}>
            <div style={{display:"flex",justifyContent:"space-between"}}><div style={{fontWeight:700,fontSize:14}}>{cl?.nume}</div><span style={{fontSize:11,fontWeight:700,color:past?"#E63946":urgent?"#F57F17":"#43A047"}}>{past?`Întârziat ${-days}z`:days===0?"Azi!":days===1?"Mâine":`în ${days} zile`}</span></div>
            <div style={{fontSize:12,color:"#888",marginTop:2}}>🚲 {o.bicicleta}</div>
            <div style={{fontSize:11,color:"#bbb",marginTop:4}}>📅 {fmt(o.nextRevizieData)}</div>
          </div>;
        })}
      </Modal>}
    </div>
  );
}

