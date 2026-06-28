import { useState, useRef, useEffect } from "react";

// ═══════════════════════════════════════════════════════════
//  N O R A — app completa
//  3 schermate di lavoro (Lavori · Agenda · Archivio) + viste (Spesa · Rubrica · Conti)
//  CONFERMA NETTA: chiamate/voce → casella d'attesa → conferma → agenda
//  Production planner invisibile. Tema chiaro. Voce primaria.
// ═══════════════════════════════════════════════════════════

const C = {
  bg:"#F4F1EA", card:"#FFFFFF", cardSoft:"#FAF8F3",
  ink:"#1F2937", inkSoft:"#566071", mute:"#8A93A2", line:"#E7E2D6",
  copper:"#C2410C", copperBg:"#FDEDE4",
  blu:"#1D6FE0", bluBg:"#E4EFFC", verde:"#15803D", verdeBg:"#E3F4E8",
  viola:"#7C3AED", violaBg:"#F0E9FC", arancio:"#D97706", arancioBg:"#FCF0DC",
  grigio:"#6B7280", grigioBg:"#EFF0F2", rosso:"#DC2626", rossoBg:"#FDE8E8",
};

const TAPPE = {
  chiamata:     { label:"Chiamata",      ink:C.copper, bg:C.copperBg, icon:"📞" },
  sopralluogo:  { label:"Sopralluogo",   ink:C.blu,    bg:C.bluBg,    icon:"🔍" },
  preventivo:   { label:"Preventivo",    ink:C.arancio,bg:C.arancioBg,icon:"📋" },
  lavoro:       { label:"Lavoro",        ink:C.verde,  bg:C.verdeBg,  icon:"🔧", ripetibile:true },
  rilavorazione:{ label:"Rilavorazione", ink:C.rosso,  bg:C.rossoBg,  icon:"🔄" },
  manutenzione: { label:"Manutenzione",  ink:C.viola,  bg:C.violaBg,  icon:"🔄", ripetibile:true },
  materiale:    { label:"Materiale",     ink:C.grigio, bg:C.grigioBg, icon:"📦" },
  pagamento:    { label:"Pagamento",     ink:C.verde,  bg:C.verdeBg,  icon:"💰" },
};
const PROPONE_DOPO = {
  chiamata:"sopralluogo", sopralluogo:"preventivo", preventivo:"lavoro",
  lavoro:"pagamento", rilavorazione:"pagamento", manutenzione:"pagamento",
  materiale:"lavoro", pagamento:null,
};

const iso = d => d.toISOString().split("T")[0];
const today = (o=0) => { const d=new Date(); d.setDate(d.getDate()+o); return iso(d); };
const MESI=["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];
const MESIB=["gen","feb","mar","apr","mag","giu","lug","ago","set","ott","nov","dic"];
const GIORNI=["L","M","M","G","V","S","D"];
const fmtData = s => { if(!s) return ""; const d=new Date(s+"T00:00"); return `${d.getDate()} ${MESIB[d.getMonth()]}`; };
const fmtLungo = s => { const d=new Date(s+"T00:00"); const g=["domenica","lunedì","martedì","mercoledì","giovedì","venerdì","sabato"]; return `${g[d.getDay()]} ${d.getDate()} ${MESI[d.getMonth()]}`; };

let _id = 400;
const nid = () => ++_id;

let CLIENTI = [
  { id:1, nome:"Mario Rossi", tel:"333 1234567", indirizzo:"Via Roma 12, Milano", impianto:"Caldaia Baxi Luna 3 (2019)" },
  { id:2, nome:"Laura Bianchi", tel:"347 9876543", indirizzo:"C.so Buenos Aires 88, Milano", impianto:"Clima Samsung (2022)" },
  { id:3, nome:"Cond. Monza 45", tel:"02 8765432", indirizzo:"Viale Monza 45, Milano", impianto:"Centrale Ferroli (2017)" },
];
const FORNITORI = [
  { id:51, nome:"Termoidraulica Rossi", tel:"02 1112233", tipo:"Ricambi caldaie" },
  { id:52, nome:"Idrotherm", tel:"02 4455667", tipo:"Materiale idraulico" },
  { id:53, nome:"Clima Store", tel:"02 7788990", tipo:"Condizionatori e gas" },
];

// lavori già confermati e attivi
const LAVORI_INIT = [
  { id:1, clienteId:2, titolo:"Condizionatore non parte", categoria:"lavoro", stato:"attivo",
    materiali:[{id:nid(),nome:"Gas R32",qty:1,prezzo:45,preso:false},{id:nid(),nome:"Staffa muro",qty:1,prezzo:35,preso:true}],
    tappe:[
      { id:nid(), tipo:"chiamata", data:today(-1), fatta:true, nota:"Il clima non si accende" },
      { id:nid(), tipo:"lavoro", data:today(0), ora:"14:30", fatta:false, nota:"" },
    ] },
  { id:2, clienteId:1, titolo:"Manutenzione caldaia annuale", categoria:"manutenzione", stato:"attivo",
    materiali:[{id:nid(),nome:"Filtro gas",qty:1,prezzo:18,preso:false},{id:nid(),nome:"Guarnizioni",qty:4,prezzo:2.5,preso:false}],
    tappe:[
      { id:nid(), tipo:"manutenzione", data:today(0), ora:"09:00", fatta:false, nota:"Revisione obbligatoria", ripete:true, ogni:"anno" },
    ] },
  { id:3, clienteId:3, titolo:"Revisione centrale termica", categoria:"preventivo", stato:"attivo",
    materiali:[],
    tappe:[
      { id:nid(), tipo:"chiamata", data:today(-3), fatta:true, nota:"Vuole rifare la centrale" },
      { id:nid(), tipo:"sopralluogo", data:today(-2), fatta:true, nota:"Serve sostituire tutto" },
      { id:nid(), tipo:"preventivo", data:today(2), ora:"16:00", fatta:false, nota:"Preparare stima", importo:2400 },
    ] },
  { id:4, clienteId:1, titolo:"Perdita rubinetto cucina", categoria:"lavoro", stato:"archiviato",
    tappe:[
      { id:nid(), tipo:"lavoro", data:today(-12), fatta:true, nota:"Sostituita cartuccia", materiali:[{nome:"Cartuccia",qty:1,prezzo:14}] },
      { id:nid(), tipo:"pagamento", data:today(-12), fatta:true, importo:90 },
    ] },
];

// casella d'attesa: input da confermare (chiamate/voce)
const ATTESA_INIT = [
  { id:nid(), fonte:"chiamata", tel:"348 5556677", nomeSentito:"Giuseppe Ferri",
    trascrizione:"Buongiorno sono Ferri di via Torino, ho una perdita d'acqua sotto il lavandino della cucina, sta uscendo parecchia acqua, riuscite a passare domani mattina?",
    analizzato:false },
];

// chiamate "in arrivo" simulabili (per dimostrare il flusso ripetibile)
const CHIAMATE_POOL = [
  { fonte:"chiamata", tel:"333 1234567", nomeSentito:"Mario Rossi",
    trascrizione:"Sono Rossi, la caldaia fa un rumore strano e non scalda bene, quando potete venire a controllare?" },
  { fonte:"voce", tel:null, nomeSentito:null,
    trascrizione:"Nota per me: domani devo comprare due valvole termostatiche e un tubo da mezzo pollice dalla Idrotherm" },
  { fonte:"chiamata", tel:"02 9998877", nomeSentito:"Studio Verdi",
    trascrizione:"Salve, siamo lo studio Verdi, vorremmo un preventivo per rifare l'impianto del bagno del nostro ufficio." },
];

async function ai(messages, system="") {
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:600,system,messages}),
    });
    const d = await r.json();
    return d.content?.map(b=>b.type==="text"?b.text:"").join("")||"";
  } catch(e){ return ""; }
}

// ═══════════════════════════════════════════════════════════
export default function NoraApp() {
  const [tab, setTab] = useState("agenda");
  const [lavori, setLavori] = useState(LAVORI_INIT);
  const [attesa, setAttesa] = useState(ATTESA_INIT);
  const [apertoId, setApertoId] = useState(null);
  const [confermaId, setConfermaId] = useState(null);
  const [nuovoOpen, setNuovoOpen] = useState(false);
  const [feedback, setFeedback] = useState(null); // messaggio "aggiunto in agenda"

  const cl = id => CLIENTI.find(c=>c.id===id);

  const aggiornaLavoro = (id,patch) => setLavori(p=>p.map(l=>l.id===id?{...l,...patch}:l));
  const aggiungiTappa = (lavoroId,tappa) => setLavori(p=>p.map(l=>l.id===lavoroId?{...l,tappe:[...l.tappe,{id:nid(),fatta:false,...tappa}]}:l));
  const completaTappa = (lavoroId,tappaId) => setLavori(p=>p.map(l=>{
    if(l.id!==lavoroId)return l;
    return {...l, tappe:l.tappe.map(t=>t.id===tappaId?{...t,fatta:true,data:t.data||today(0)}:t)};
  }));
  const creaLavoro = (lavoro) => { const nuovo={id:nid(),stato:"attivo",materiali:lavoro.materiali||[],...lavoro}; setLavori(p=>[nuovo,...p]); return nuovo.id; };

  // materiali a livello di lavoro (risorsa, non fase). flag "preso" = comprato.
  const aggiungiMateriale = (lavoroId, mat) => setLavori(p=>p.map(l=>l.id===lavoroId
    ? {...l, materiali:[...(l.materiali||[]), {id:nid(), preso:false, ...mat}]} : l));
  const toggleMateriale = (lavoroId, matId) => setLavori(p=>p.map(l=>l.id===lavoroId
    ? {...l, materiali:(l.materiali||[]).map(m=>m.id===matId?{...m,preso:!m.preso}:m)} : l));
  const rimuoviMateriale = (lavoroId, matId) => setLavori(p=>p.map(l=>l.id===lavoroId
    ? {...l, materiali:(l.materiali||[]).filter(m=>m.id!==matId)} : l));


  const simulaChiamata = () => {
    const c = CHIAMATE_POOL[Math.floor(Math.random()*CHIAMATE_POOL.length)];
    setAttesa(p=>[{id:nid(),...c,analizzato:false},...p]);
    setTab("lavori");
  };

  // NOTA VOCALE: la detti, finisce nella casella d'attesa come una chiamata → da confermare
  const simulaNotaVocale = () => {
    const noteVocali = CHIAMATE_POOL.filter(c=>c.fonte==="voce");
    const altre = [
      { fonte:"voce", tel:null, nomeSentito:null, trascrizione:"Promemoria: lunedì manutenzione caldaia da Rossi in via Roma, portare filtro e guarnizioni" },
      { fonte:"voce", tel:null, nomeSentito:null, trascrizione:"Nota: richiamare Bianchi per il preventivo del condizionatore, era interessata" },
    ];
    const pool = [...noteVocali, ...altre];
    const v = pool[Math.floor(Math.random()*pool.length)];
    const nuovo = { id:nid(), ...v, analizzato:false };
    setAttesa(p=>[nuovo,...p]);
    setTab("lavori");
    setConfermaId(nuovo.id); // apre subito la conferma
  };

  // feedback temporaneo
  const mostraFeedback = (msg) => { setFeedback(msg); setTimeout(()=>setFeedback(null), 2600); };

  const confermaAttesa = (attesaItem, datiConfermati) => {
    // crea il lavoro dalla conferma
    const { clienteId, categoria, titolo, quando, ora, urgenza, note } = datiConfermati;
    const tappe = [];
    if(attesaItem.fonte==="chiamata") {
      tappe.push({ id:nid(), tipo:"chiamata", data:today(0), fatta:true, nota:attesaItem.trascrizione });
    }
    // la tappa operativa proposta (programmata, NON fatta)
    if(categoria==="materiale") {
      tappe.push({ id:nid(), tipo:"materiale", data:quando||today(1), fatta:false, nota:note||titolo, materiali:[] });
    } else {
      tappe.push({ id:nid(), tipo:categoria, data:quando||today(1), ora:ora||"", fatta:false, nota:note||"", materiali:[] });
    }
    creaLavoro({ clienteId, titolo, categoria, urgenza:urgenza||"media", tappe });
    setAttesa(p=>p.filter(a=>a.id!==attesaItem.id));
    setConfermaId(null);
  };

  return (
    <div style={{ background:C.bg, minHeight:"100vh", color:C.ink,
      fontFamily:"'Inter',system-ui,sans-serif", maxWidth:480, margin:"0 auto",
      padding:"16px 16px 96px", position:"relative" }}>

      {/* header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:38, height:38, borderRadius:11,
            background:`linear-gradient(135deg,${C.copper},#E2562A)`, display:"flex",
            alignItems:"center", justifyContent:"center", fontSize:19 }}>🔧</div>
          <div>
            <div style={{ fontSize:19, fontWeight:800, letterSpacing:-0.4, lineHeight:1 }}>Nora</div>
            <div style={{ fontSize:11.5, color:C.mute, marginTop:2 }}>l'assistente dell'idraulico</div>
          </div>
        </div>
        {/* bottone demo: simula una chiamata in arrivo */}
        <button onClick={simulaChiamata} style={{ background:C.copperBg, border:`1px solid ${C.copper}44`,
          borderRadius:10, color:C.copper, fontSize:11.5, fontWeight:700, padding:"7px 11px", cursor:"pointer" }}>
          📞 Simula chiamata
        </button>
      </div>

      {/* contenuto per tab */}
      {tab==="lavori" && <Lavori lavori={lavori} attesa={attesa} cl={cl}
        onApri={setApertoId} onConferma={setConfermaId}
        onNotaVocale={simulaNotaVocale} onManuale={()=>setNuovoOpen(true)} />}
      {tab==="agenda" && <Agenda lavori={lavori} cl={cl} onApri={setApertoId} />}
      {tab==="spesa" && <Spesa lavori={lavori} toggleMateriale={toggleMateriale} />}
      {tab==="rubrica" && <Rubrica />}
      {tab==="conti" && <Conti lavori={lavori} />}

      {/* TOAST feedback "aggiunto in agenda" */}
      {feedback && (
        <div style={{ position:"fixed", bottom:90, left:"50%", transform:"translateX(-50%)",
          background:C.verde, color:"#fff", borderRadius:14, padding:"13px 20px", zIndex:120,
          fontSize:14.5, fontWeight:700, boxShadow:"0 6px 20px rgba(21,128,61,0.35)",
          display:"flex", alignItems:"center", gap:9, maxWidth:"90%" }}>
          <span style={{ fontSize:18 }}>✓</span> {feedback}
        </div>
      )}

      {/* overlay conferma */}
      {confermaId!==null && (
        <ConfermaInput item={attesa.find(a=>a.id===confermaId)} cl={cl}
          onConferma={confermaAttesa} onAnnulla={()=>setConfermaId(null)} />
      )}

      {/* overlay scheda lavoro */}
      {apertoId!==null && (
        <SchedaLavoro lavoro={lavori.find(l=>l.id===apertoId)} cl={cl}
          aggiungiTappa={aggiungiTappa} completaTappa={completaTappa}
          aggiornaLavoro={aggiornaLavoro} creaLavoro={creaLavoro}
          aggiungiMateriale={aggiungiMateriale} toggleMateriale={toggleMateriale} rimuoviMateriale={rimuoviMateriale}
          onChiudi={()=>setApertoId(null)} />
      )}

      {/* overlay nuovo manuale → va dritto in agenda con feedback */}
      {nuovoOpen && <NuovoLavoro creaLavoro={creaLavoro} cl={cl}
        onFatto={(id, quando)=>{
          setNuovoOpen(false);
          setTab("agenda");
          mostraFeedback(`Aggiunto in agenda${quando?` per ${fmtData(quando)}`:""}`);
        }}
        onChiudi={()=>setNuovoOpen(false)} />}

      {/* nav */}
      <nav style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)",
        width:"100%", maxWidth:480, background:C.card, borderTop:`1px solid ${C.line}`,
        display:"flex", justifyContent:"space-around", padding:"9px 0 16px", zIndex:30 }}>
        {[["lavori","📥","In arrivo"],["agenda","📅","Agenda"],["spesa","🛒","Spesa"],["rubrica","📇","Rubrica"],["conti","📊","Conti"]].map(([id,ic,lb])=>{
          const badge = id==="lavori" && attesa.length>0 ? attesa.length : null;
          return (
            <button key={id} onClick={()=>setTab(id)} style={{ background:"none", border:"none",
              cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3,
              color: tab===id?C.copper:C.mute, fontSize:11, fontWeight:tab===id?700:500, position:"relative" }}>
              <span style={{ fontSize:22 }}>{ic}</span>{lb}
              {badge && <span style={{ position:"absolute", top:-4, right:8, background:C.rosso,
                color:"#fff", fontSize:10, fontWeight:800, minWidth:17, height:17, borderRadius:9,
                display:"flex", alignItems:"center", justifyContent:"center", padding:"0 4px" }}>{badge}</span>}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  LAVORI — casella d'attesa (da confermare) + lavori attivi
// ═══════════════════════════════════════════════════════════
function Lavori({ lavori, attesa, cl, onApri, onConferma, onNotaVocale, onManuale }) {
  const attivi = lavori.filter(l=>l.stato==="attivo");
  const prossima = l => l.tappe.find(t=>!t.fatta);

  return (
    <div>
      {/* CASELLA D'ATTESA */}
      {attesa.length>0 && (
        <div style={{ marginBottom:22 }}>
          <div style={{ fontSize:13, fontWeight:800, color:C.copper, letterSpacing:0.5,
            textTransform:"uppercase", marginBottom:12, display:"flex", alignItems:"center", gap:7 }}>
            <span style={{ background:C.rosso, color:"#fff", borderRadius:20, padding:"1px 8px", fontSize:12 }}>{attesa.length}</span>
            Da confermare
          </div>
          {attesa.map(a=>(
            <div key={a.id} onClick={()=>onConferma(a.id)} style={{ background:C.card,
              border:`2px solid ${C.copper}`, borderRadius:15, padding:"14px 16px", marginBottom:10,
              cursor:"pointer", boxShadow:"0 4px 14px rgba(194,65,12,0.12)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                <span style={{ fontSize:15 }}>{a.fonte==="chiamata"?"📞":"🎙️"}</span>
                <span style={{ fontSize:12, fontWeight:800, color:C.copper }}>
                  {a.fonte==="chiamata"?"CHIAMATA RICEVUTA":"NOTA VOCALE"}
                </span>
              </div>
              <div style={{ fontSize:16, fontWeight:700 }}>{a.nomeSentito || "Nota personale"}</div>
              <div style={{ fontSize:13.5, color:C.inkSoft, marginTop:4, lineHeight:1.45,
                display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                {a.trascrizione}
              </div>
              <div style={{ marginTop:10, fontSize:13, fontWeight:700, color:C.copper }}>
                Tocca per controllare e confermare →
              </div>
            </div>
          ))}
        </div>
      )}

      {/* casella vuota = sei in pari */}
      {attesa.length===0 && (
        <div style={{ textAlign:"center", padding:"26px 16px 18px" }}>
          <div style={{ fontSize:40, marginBottom:10 }}>✓</div>
          <div style={{ fontSize:16, fontWeight:700, color:C.ink }}>Tutto controllato</div>
          <div style={{ fontSize:13.5, color:C.mute, marginTop:4, lineHeight:1.4 }}>
            Le chiamate in arrivo le trovi qui da confermare.
          </div>
        </div>
      )}

      {/* DUE PORTE D'INGRESSO — pari */}
      <div style={{ fontSize:13, fontWeight:800, color:C.mute, letterSpacing:0.8,
        textTransform:"uppercase", marginBottom:12, marginTop: attesa.length>0?6:0 }}>Aggiungi qualcosa</div>
      <div style={{ display:"flex", gap:11 }}>
        {/* nota vocale → passa per conferma */}
        <button onClick={onNotaVocale} style={{ flex:1,
          background:`linear-gradient(135deg,${C.copper},#E2562A)`, border:"none", borderRadius:16,
          padding:"20px 14px", cursor:"pointer", color:"#fff", boxShadow:"0 5px 16px rgba(194,65,12,0.28)" }}>
          <div style={{ fontSize:30, marginBottom:7 }}>🎙️</div>
          <div style={{ fontSize:15, fontWeight:800 }}>Nota vocale</div>
          <div style={{ fontSize:11.5, opacity:0.9, marginTop:2 }}>parla, poi confermi</div>
        </button>
        {/* manuale → dritto in agenda */}
        <button onClick={onManuale} style={{ flex:1,
          background:C.card, border:`2px solid ${C.copper}`, borderRadius:16,
          padding:"20px 14px", cursor:"pointer", color:C.copper }}>
          <div style={{ fontSize:30, marginBottom:7 }}>✍️</div>
          <div style={{ fontSize:15, fontWeight:800 }}>Scrivi a mano</div>
          <div style={{ fontSize:11.5, color:C.inkSoft, marginTop:2 }}>va dritto in agenda</div>
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  CONFERMA INPUT — Nora mostra cosa ha capito, tu confermi/correggi
// ═══════════════════════════════════════════════════════════
function ConfermaInput({ item, cl, onConferma, onAnnulla }) {
  const [loading, setLoading] = useState(true);
  // tutti i campi che Nora estrae / che pippuzzo completa
  const [cat, setCat] = useState("lavoro");
  const [titolo, setTitolo] = useState("");
  const [indirizzo, setIndirizzo] = useState("");
  const [data, setData] = useState("");
  const [ora, setOra] = useState("");
  const [urgenza, setUrgenza] = useState("media");
  const [note, setNote] = useState("");
  const [nomeMod, setNomeMod] = useState("");

  useEffect(()=>{ if(item) analizza(); }, []);

  if(!item) return null;

  const clienteNoto = CLIENTI.find(c=>c.tel && item.tel && c.tel.replace(/\s/g,"")===item.tel.replace(/\s/g,""));

  const analizza = async () => {
    setLoading(true);
    const sys = `Sei Nora, assistente di un idraulico. Analizza questo input (chiamata o nota) ed estrai TUTTE le informazioni presenti. Rispondi SOLO con JSON puro:
{"categoria":"sopralluogo|lavoro|preventivo|manutenzione|materiale","titolo":"max 6 parole sul problema","indirizzo":"indirizzo se menzionato altrimenti stringa vuota","data":"YYYY-MM-DD se deducibile (oggi è ${today(0)}, 'domani'=${today(1)}) altrimenti vuota","ora":"HH:MM se menzionata (es 'le tre'=15:00, 'mattina'=vuoto perché generico) altrimenti vuota","urgenza":"bassa|media|alta in base al tono","note":"altri dettagli utili non già nei campi sopra, es citofono rotto, chiamare prima, ecc; stringa vuota se niente"}
Regole categoria: guasto da riparare=lavoro; richiesta stima=preventivo; da valutare di persona=sopralluogo; manutenzione periodica=manutenzione; nota su materiali=materiale.
IMPORTANTE: lascia VUOTI i campi non esplicitamente presenti nell'input. Non inventare orari o indirizzi.`;
    const r = await ai([{role:"user",content:item.trascrizione}], sys);
    try {
      const p = JSON.parse(r.replace(/```json|```/g,"").trim());
      setCat(p.categoria||"lavoro");
      setTitolo(p.titolo||"");
      setIndirizzo(p.indirizzo||"");
      setData(p.data||"");
      setOra(p.ora||"");
      setUrgenza(p.urgenza||"media");
      setNote(p.note||"");
    } catch(e){ setCat("lavoro"); setTitolo("Da definire"); }
    setLoading(false);
  };

  const conferma = () => {
    let clienteId;
    const nomeFinale = nomeMod || (clienteNoto ? clienteNoto.nome : item.nomeSentito) || "Nota personale";
    if(clienteNoto) {
      clienteId = clienteNoto.id;
      if(indirizzo && !clienteNoto.indirizzo) clienteNoto.indirizzo = indirizzo; // arricchisci se mancava
    } else {
      const nuovo = { id:nid(), nome:nomeFinale, tel:item.tel||"", indirizzo:indirizzo||"", impianto:"" };
      CLIENTI.push(nuovo); clienteId = nuovo.id;
    }
    onConferma(item, { clienteId, categoria:cat, titolo, quando:data||today(1), ora, urgenza, note });
  };

  const t = TAPPE[cat];
  // stile per campo vuoto da completare (evidenziato arancione)
  const vuoto = (val) => !val;
  const bordoVuoto = `1.5px solid ${C.arancio}`;

  return (
    <Overlay onChiudi={onAnnulla}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
        <span style={{ fontSize:18 }}>{item.fonte==="chiamata"?"📞":"🎙️"}</span>
        <span style={{ fontSize:13, fontWeight:800, color:C.copper, letterSpacing:0.4 }}>
          {item.fonte==="chiamata"?"CHIAMATA — CONFERMA":"NOTA VOCALE — CONFERMA"}
        </span>
        <button onClick={onAnnulla} style={{ marginLeft:"auto", background:"none", border:"none", color:C.mute, fontSize:28, cursor:"pointer" }}>×</button>
      </div>

      {/* trascrizione originale */}
      <div style={{ background:C.cardSoft, border:`1px solid ${C.line}`, borderRadius:11,
        padding:"11px 14px", marginBottom:16, fontSize:13.5, color:C.inkSoft, lineHeight:1.5, fontStyle:"italic" }}>
        "{item.trascrizione}"
      </div>

      {loading ? (
        <div style={{ textAlign:"center", padding:"24px 0", color:C.copper, fontSize:15, fontWeight:600 }}>
          ✨ Nora sta leggendo la chiamata...
        </div>
      ) : (
        <>
          <div style={{ fontSize:12.5, color:C.inkSoft, marginBottom:14, padding:"8px 12px",
            background:C.copperBg, borderRadius:9 }}>
            Controlla cosa ha capito Nora. <b style={{ color:C.arancio }}>I campi arancioni</b> sono da completare.
          </div>

          {/* CLIENTE */}
          <Label>Cliente</Label>
          {clienteNoto ? (
            <div style={{ background:C.verdeBg, border:`1px solid ${C.verde}44`, borderRadius:11,
              padding:"12px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:15.5, fontWeight:700 }}>{clienteNoto.nome}</span>
              <span style={{ fontSize:12, color:C.verde, fontWeight:600 }}>già in rubrica ✓</span>
            </div>
          ) : (
            <Inp value={nomeMod || item.nomeSentito || ""} placeholder="Nome cliente"
              onChange={e=>setNomeMod(e.target.value)} />
          )}

          {/* TELEFONO (read-only, già preso) */}
          {item.tel && (
            <>
              <Label>Telefono</Label>
              <div style={{ background:C.cardSoft, border:`1px solid ${C.line}`, borderRadius:11,
                padding:"12px 14px", fontSize:15, color:C.inkSoft }}>{item.tel}</div>
            </>
          )}

          {/* TIPO */}
          <Label>Tipo di lavoro</Label>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:7 }}>
            {["sopralluogo","lavoro","preventivo","manutenzione","materiale"].map(k=>{
              const tk=TAPPE[k]; const sel=cat===k;
              return <button key={k} onClick={()=>setCat(k)} style={{ background: sel?tk.bg:C.card,
                border:`1.5px solid ${sel?tk.ink:C.line}`, borderRadius:10, padding:"11px", cursor:"pointer",
                color: sel?tk.ink:C.inkSoft, fontSize:13.5, fontWeight:sel?700:500,
                display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>{tk.icon} {tk.label}</button>;
            })}
          </div>

          {/* DESCRIZIONE */}
          <Label>Cosa c'è da fare</Label>
          <Inp value={titolo} placeholder="Descrizione del lavoro"
            onChange={e=>setTitolo(e.target.value)}
            style={vuoto(titolo) ? { border:bordoVuoto } : {}} />

          {/* INDIRIZZO */}
          <Label>Indirizzo {vuoto(indirizzo) && !clienteNoto?.indirizzo && <span style={{ color:C.arancio }}>· manca</span>}</Label>
          <Inp value={indirizzo || clienteNoto?.indirizzo || ""} placeholder="Dove intervenire"
            onChange={e=>setIndirizzo(e.target.value)}
            style={(vuoto(indirizzo) && !clienteNoto?.indirizzo) ? { border:bordoVuoto } : {}} />

          {/* GIORNO + ORA */}
          <div style={{ display:"flex", gap:10 }}>
            <div style={{ flex:1.3 }}>
              <Label>Giorno {vuoto(data) && <span style={{ color:C.arancio }}>· da mettere</span>}</Label>
              <Inp type="date" value={data} onChange={e=>setData(e.target.value)}
                style={vuoto(data) ? { border:bordoVuoto } : {}} />
            </div>
            <div style={{ flex:1 }}>
              <Label>Ora {vuoto(ora) && <span style={{ color:C.arancio }}>· ?</span>}</Label>
              <Inp type="time" value={ora} onChange={e=>setOra(e.target.value)}
                style={vuoto(ora) ? { border:bordoVuoto } : {}} />
            </div>
          </div>

          {/* URGENZA */}
          <Label>Urgenza</Label>
          <div style={{ display:"flex", gap:7 }}>
            {[["bassa","Bassa",C.verde],["media","Media",C.arancio],["alta","Alta",C.rosso]].map(([v,l,col])=>{
              const sel=urgenza===v;
              return <button key={v} onClick={()=>setUrgenza(v)} style={{ flex:1,
                background: sel?col:C.card, border:`1.5px solid ${sel?col:C.line}`, borderRadius:10,
                color: sel?"#fff":C.inkSoft, fontSize:13.5, fontWeight: sel?700:500, padding:"10px", cursor:"pointer" }}>{l}</button>;
            })}
          </div>

          {/* NOTE */}
          <Label>Note {note && <span style={{ color:C.verde }}>· Nora ha sentito qualcosa</span>}</Label>
          <textarea value={note} onChange={e=>setNote(e.target.value)}
            placeholder="Altri dettagli (citofono, accessi, richieste...)"
            style={{ width:"100%", background:C.card, border:`1.5px solid ${C.line}`, borderRadius:11,
            color:C.ink, fontSize:15, padding:"12px 14px", minHeight:60, resize:"vertical",
            boxSizing:"border-box", fontFamily:"inherit" }} />

          {/* AZIONI */}
          <div style={{ display:"flex", gap:10, marginTop:18 }}>
            <button onClick={conferma} style={{ flex:2, background:C.verde, border:"none", borderRadius:12,
              color:"#fff", fontSize:15.5, fontWeight:700, padding:"15px", cursor:"pointer" }}>
              ✓ Conferma e schedula
            </button>
            <button onClick={onAnnulla} style={{ flex:1, background:C.card, border:`1.5px solid ${C.line}`,
              borderRadius:12, color:C.inkSoft, fontSize:14, fontWeight:600, padding:"15px", cursor:"pointer" }}>Ignora</button>
          </div>
        </>
      )}
    </Overlay>
  );
}


// ═══════════════════════════════════════════════════════════
//  AGENDA — giorno/mese + attivi/archivio
// ═══════════════════════════════════════════════════════════
function Agenda({ lavori, cl, onApri }) {
  const [vista, setVista] = useState("lista");
  const [mostra, setMostra] = useState("attivi"); // attivi | archivio
  const [cursore, setCursore] = useState(new Date());
  const [giorno, setGiorno] = useState(today(0));

  if(mostra==="archivio") {
    const archiviati = lavori.filter(l=>l.stato==="archiviato");
    return (
      <div>
        <Intestazione vista={vista} setVista={setVista} mostra={mostra} setMostra={setMostra} />
        <div style={{ fontSize:13, fontWeight:800, color:C.mute, letterSpacing:0.8, textTransform:"uppercase", marginBottom:12, marginTop:6 }}>Archivio · {archiviati.length}</div>
        {archiviati.length===0 ? <div style={{ color:C.mute, fontSize:14.5, textAlign:"center", padding:"28px 0" }}>Niente in archivio</div>
          : archiviati.map(l=>{ const c=cl(l.clienteId); const cat=TAPPE[l.categoria];
            const pag=l.tappe.find(t=>t.tipo==="pagamento");
            return (
              <div key={l.id} onClick={()=>onApri(l.id)} style={{ background:C.card, border:`1px solid ${C.line}`,
                borderLeft:`5px solid ${cat.ink}`, borderRadius:14, padding:"13px 15px", marginBottom:10, cursor:"pointer", opacity:0.85 }}>
                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <div><div style={{ fontSize:16, fontWeight:700 }}>{c?.nome}</div>
                    <div style={{ fontSize:13.5, color:C.inkSoft }}>{l.titolo}</div></div>
                  {pag?.importo>0 && <div style={{ fontSize:15, fontWeight:800, color:C.verde }}>€{pag.importo}</div>}
                </div>
              </div>
            ); })}
      </div>
    );
  }

  const anno=cursore.getFullYear(), mese=cursore.getMonth();
  const offset=(new Date(anno,mese,1).getDay()+6)%7;
  const ngiorni=new Date(anno,mese+1,0).getDate();
  const celle=[]; for(let i=0;i<offset;i++)celle.push(null); for(let g=1;g<=ngiorni;g++)celle.push(g);

  // tutte le tappe-con-data dei lavori attivi
  const tappeData = lavori.filter(l=>l.stato==="attivo").flatMap(l=>l.tappe.filter(t=>t.data&&!t.fatta).map(t=>({...t,lavoroId:l.id,clienteId:l.clienteId,titolo:l.titolo})));
  const diGiorno = d => tappeData.filter(t=>t.data===d).sort((a,b)=>(a.ora||"").localeCompare(b.ora||""));
  const cambia = d => { const n=new Date(cursore); n.setMonth(n.getMonth()+d); setCursore(n); };

  return (
    <div>
      <Intestazione vista={vista} setVista={setVista} mostra={mostra} setMostra={setMostra} />

      {vista==="lista" ? (
        <ListaSenzaBuchi tappeData={tappeData} cl={cl} onApri={onApri} />
      ) : vista==="mese" ? (
        <>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", margin:"8px 0 14px" }}>
            <button onClick={()=>cambia(-1)} style={navBtn}>‹</button>
            <div style={{ fontWeight:700, fontSize:17, textTransform:"capitalize" }}>{MESI[mese]} {anno}</div>
            <button onClick={()=>cambia(1)} style={navBtn}>›</button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:5, marginBottom:6 }}>
            {GIORNI.map((g,i)=><div key={i} style={{ textAlign:"center", fontSize:12, color:C.mute, fontWeight:700, paddingBottom:5 }}>{g}</div>)}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:5 }}>
            {celle.map((g,i)=>{
              if(!g) return <div key={i}/>;
              const d=iso(new Date(anno,mese,g)); const evs=diGiorno(d);
              const isOggi=d===today(0), isSel=d===giorno;
              return (
                <button key={i} onClick={()=>{ setGiorno(d); setVista("giorno"); }} style={{ aspectRatio:"1",
                  borderRadius:11, cursor:"pointer", position:"relative", padding:2,
                  border: isSel?`2.5px solid ${C.copper}`:`1px solid ${C.line}`,
                  background: isOggi?C.copperBg:C.card, display:"flex", flexDirection:"column",
                  alignItems:"center", justifyContent:"center" }}>
                  <span style={{ fontSize:15, fontWeight: isOggi?800:600, color: isOggi?C.copper:C.ink }}>{g}</span>
                  {evs.length>0 && <div style={{ display:"flex", gap:2.5, marginTop:3, flexWrap:"wrap", justifyContent:"center", maxWidth:34 }}>
                    {evs.slice(0,4).map((e,j)=><div key={j} style={{ width:6, height:6, borderRadius:"50%", background:TAPPE[e.tipo].ink }}/>)}
                  </div>}
                </button>
              );
            })}
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:11, marginTop:16, padding:"12px 14px",
            background:C.card, borderRadius:12, border:`1px solid ${C.line}` }}>
            {Object.entries(TAPPE).filter(([k])=>["sopralluogo","preventivo","lavoro","manutenzione"].includes(k)).map(([k,v])=>(
              <div key={k} style={{ display:"flex", alignItems:"center", gap:6, fontSize:12.5, color:C.inkSoft }}>
                <div style={{ width:10, height:10, borderRadius:"50%", background:v.ink }}/>{v.label}</div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize:18, fontWeight:800, margin:"10px 0 14px", textTransform:"capitalize" }}>
            {giorno===today(0)?"Oggi · ":""}{fmtLungo(giorno)}
          </div>
          {diGiorno(giorno).length===0
            ? <div style={{ color:C.mute, fontSize:14.5, textAlign:"center", padding:"26px 0" }}>Niente in programma</div>
            : diGiorno(giorno).map(t=>{ const c=cl(t.clienteId); const ti=TAPPE[t.tipo];
                return (
                  <div key={t.id} onClick={()=>onApri(t.lavoroId)} style={{ background:C.card, border:`1px solid ${C.line}`,
                    borderLeft:`5px solid ${ti.ink}`, borderRadius:14, padding:"13px 15px", marginBottom:10, cursor:"pointer",
                    display:"flex", gap:12, alignItems:"center" }}>
                    <div style={{ fontSize:16, fontWeight:800, color:ti.ink, minWidth:46 }}>{t.ora||""}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:16, fontWeight:700 }}>{c?.nome}</div>
                      <div style={{ fontSize:13.5, color:C.inkSoft }}>{ti.icon} {t.titolo}</div>
                      <div style={{ fontSize:12.5, color:C.mute, marginTop:3 }}>📍 {c?.indirizzo}</div>
                    </div>
                  </div>
                ); })}
        </>
      )}
    </div>
  );
}
// lista dei prossimi lavori in fila, saltando i giorni vuoti
function ListaSenzaBuchi({ tappeData, cl, onApri }) {
  const futuri = tappeData
    .filter(t=>t.data >= today(0))
    .sort((a,b)=> a.data===b.data ? (a.ora||"").localeCompare(b.ora||"") : a.data.localeCompare(b.data));

  if(futuri.length===0) return (
    <div style={{ color:C.mute, fontSize:14.5, textAlign:"center", padding:"40px 0" }}>
      Niente in programma nei prossimi giorni
    </div>
  );

  // raggruppa per data
  const gruppi = {};
  futuri.forEach(t=>{ (gruppi[t.data] ||= []).push(t); });

  const etichetta = d => d===today(0) ? "Oggi" : d===today(1) ? "Domani" : fmtLungo(d);

  return (
    <div style={{ marginTop:8 }}>
      {Object.entries(gruppi).map(([data,tappe])=>(
        <div key={data} style={{ marginBottom:18 }}>
          <div style={{ fontSize:12.5, fontWeight:800, color:C.copper, letterSpacing:0.4,
            textTransform:"uppercase", marginBottom:9, textTransform:"capitalize" }}>
            {etichetta(data)}
          </div>
          {tappe.map(t=>{ const c=cl(t.clienteId); const ti=TAPPE[t.tipo];
            return (
              <div key={t.id} onClick={()=>onApri(t.lavoroId)} style={{ background:C.card, border:`1px solid ${C.line}`,
                borderLeft:`5px solid ${ti.ink}`, borderRadius:14, padding:"13px 15px", marginBottom:9, cursor:"pointer",
                display:"flex", gap:12, alignItems:"center" }}>
                <div style={{ fontSize:16, fontWeight:800, color:ti.ink, minWidth:46 }}>{t.ora||""}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:16, fontWeight:700 }}>{c?.nome}</div>
                  <div style={{ fontSize:13.5, color:C.inkSoft }}>{ti.icon} {t.titolo}</div>
                  <div style={{ fontSize:12.5, color:C.mute, marginTop:3 }}>📍 {c?.indirizzo}</div>
                </div>
              </div>
            ); })}
        </div>
      ))}
    </div>
  );
}
function Intestazione({ vista, setVista, mostra, setMostra }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
      <div style={{ fontSize:22, fontWeight:800 }}>Agenda</div>
      <div style={{ display:"flex", gap:6 }}>
        {mostra==="attivi" && (
          <div style={{ display:"flex", gap:3, background:C.card, borderRadius:10, padding:3, border:`1px solid ${C.line}` }}>
            {[["lista","Lista"],["mese","Mese"],["giorno","Giorno"]].map(([v,l])=>(
              <button key={v} onClick={()=>setVista(v)} style={{ background: vista===v?C.copper:"transparent",
                border:"none", borderRadius:8, color: vista===v?"#fff":C.mute, fontSize:12.5,
                fontWeight: vista===v?700:500, padding:"6px 12px", cursor:"pointer" }}>{l}</button>
            ))}
          </div>
        )}
        <button onClick={()=>setMostra(mostra==="attivi"?"archivio":"attivi")} style={{ background:C.card,
          border:`1px solid ${C.line}`, borderRadius:10, color: mostra==="archivio"?C.copper:C.mute,
          fontSize:12.5, fontWeight:700, padding:"6px 12px", cursor:"pointer" }}>
          {mostra==="attivi"?"📦 Archivio":"← Agenda"}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  SCHEDA LAVORO — storia + cosa viene dopo (dal cuore)
// ═══════════════════════════════════════════════════════════
function SchedaLavoro({ lavoro, cl, aggiungiTappa, completaTappa, aggiornaLavoro, creaLavoro, aggiungiMateriale, toggleMateriale, rimuoviMateriale, onChiudi }) {
  const [sceltaOpen, setSceltaOpen] = useState(false);
  const [matNome, setMatNome] = useState("");
  const [matQty, setMatQty] = useState("1");
  const [matPrezzo, setMatPrezzo] = useState("");
  if(!lavoro) return null;
  const l = lavoro;
  const c = cl(l.clienteId);
  const tuttoFatto = l.tappe.every(t=>t.fatta);
  // il lavoro è ricorrente se una sua tappa lo è
  const tappaRicorrente = l.tappe.find(t=>t.ripete);

  // chiude il lavoro registrando il pagamento, e se ricorrente riprogramma il prossimo
  const chiudiConPagamento = ({ importo, pagato }) => {
    // aggiungo la tappa pagamento (già fatta)
    aggiungiTappa(l.id, { tipo:"pagamento", data:today(0), fatta:true, importo:Number(importo)||0, pagato });
    aggiornaLavoro(l.id, { stato:"archiviato" });
    // riprogrammazione automatica della manutenzione ricorrente
    if(tappaRicorrente) {
      const mesi = { mese:1, "3mesi":3, "6mesi":6, anno:12 }[tappaRicorrente.ogni] || 12;
      const prossima = new Date(); prossima.setMonth(prossima.getMonth()+mesi);
      creaLavoro({
        clienteId:l.clienteId, titolo:l.titolo, categoria:l.categoria,
        tappe:[{ id:nid(), tipo:tappaRicorrente.tipo, data:iso(prossima), ora:tappaRicorrente.ora||"09:00",
          fatta:false, nota:"Ricorrenza automatica", ripete:true, ogni:tappaRicorrente.ogni, materiali:[] }],
      });
    }
    onChiudi();
  };

  return (
    <Overlay onChiudi={onChiudi}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:21, fontWeight:800 }}>{c?.nome}</div>
          <div style={{ fontSize:15, color:C.inkSoft, marginTop:2 }}>{l.titolo}</div>
        </div>
        <button onClick={onChiudi} style={{ background:"none", border:"none", color:C.mute, fontSize:28, cursor:"pointer", lineHeight:1 }}>×</button>
      </div>

      <div style={{ display:"flex", gap:9, marginBottom:20 }}>
        <a href={`tel:${c?.tel}`} style={{ flex:1, background:C.verde, color:"#fff", textDecoration:"none", borderRadius:11, padding:"11px", fontSize:14.5, fontWeight:700, textAlign:"center" }}>📞 Chiama</a>
        {c?.indirizzo && <a href={`https://maps.google.com/?q=${encodeURIComponent(c.indirizzo)}`} target="_blank" rel="noopener" style={{ flex:1, background:C.bluBg, color:C.blu, textDecoration:"none", borderRadius:11, padding:"11px", fontSize:14.5, fontWeight:700, textAlign:"center" }}>🧭 Naviga</a>}
      </div>

      {/* STORIA */}
      <div style={{ fontSize:13, fontWeight:800, color:C.mute, letterSpacing:0.8, textTransform:"uppercase", marginBottom:14 }}>Cosa è successo</div>
      <div style={{ position:"relative", paddingLeft:30, marginBottom:8 }}>
        <div style={{ position:"absolute", left:13, top:8, bottom:20, width:2, background:C.line }}/>
        {l.tappe.map(t=>{ const ti=TAPPE[t.tipo];
          return (
            <div key={t.id} style={{ position:"relative", marginBottom:16 }}>
              <div style={{ position:"absolute", left:-30, top:0, width:28, height:28, borderRadius:"50%",
                background: t.fatta?ti.ink:C.card, border:`2px solid ${ti.ink}`, display:"flex",
                alignItems:"center", justifyContent:"center", fontSize:13 }}>
                {t.fatta ? <span style={{ color:"#fff" }}>✓</span> : ti.icon}
              </div>
              <div style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:12, padding:"11px 14px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:15, fontWeight:700, color:ti.ink }}>{ti.icon} {ti.label}</span>
                  <span style={{ fontSize:12.5, color:C.mute }}>
                    {t.fatta ? (t.data?fmtData(t.data):"fatto") : (t.ora?`${fmtData(t.data)} · ${t.ora}`:t.data?`📅 ${fmtData(t.data)}`:"da pianificare")}
                  </span>
                </div>
                {t.nota && <div style={{ fontSize:13, color:C.inkSoft, marginTop:5, lineHeight:1.4 }}>{t.nota}</div>}
                {t.importo>0 && <div style={{ fontSize:13.5, color:C.verde, fontWeight:700, marginTop:4 }}>€{t.importo}</div>}
                {t.ripete && <div style={{ fontSize:12, color:C.viola, marginTop:4 }}>🔄 Si ripete ogni {t.ogni}</div>}
                {t.materiali && t.materiali.length>0 && (
                  <div style={{ marginTop:7, paddingTop:7, borderTop:`1px solid ${C.line}` }}>
                    {t.materiali.map((m,j)=><div key={j} style={{ fontSize:12.5, color:C.inkSoft, display:"flex", justifyContent:"space-between" }}><span>📦 {m.nome} ×{m.qty}</span><span>€{(m.prezzo*m.qty).toFixed(0)}</span></div>)}
                  </div>
                )}
                {!t.fatta && (
                  <button onClick={()=>{ completaTappa(l.id,t.id); setSceltaOpen(true); }} style={{ width:"100%", marginTop:10, background:ti.ink,
                    border:"none", borderRadius:9, color:"#fff", fontSize:14.5, fontWeight:700, padding:"11px", cursor:"pointer" }}>✓ Fatto</button>
                )}
              </div>
            </div>
          ); })}
      </div>

      {/* MATERIALI — risorsa del lavoro, fluiscono nella spesa */}
      <div style={{ fontSize:13, fontWeight:800, color:C.mute, letterSpacing:0.8, textTransform:"uppercase", margin:"18px 0 12px" }}>
        Materiali {(lavoro.materiali||[]).length>0 && `· €${(lavoro.materiali||[]).reduce((s,m)=>s+m.prezzo*m.qty,0).toFixed(0)}`}
      </div>
      {(lavoro.materiali||[]).map(m=>(
        <div key={m.id} style={{ display:"flex", alignItems:"center", gap:10, background:C.card,
          border:`1px solid ${C.line}`, borderRadius:11, padding:"10px 13px", marginBottom:7 }}>
          <button onClick={()=>toggleMateriale(lavoro.id, m.id)} style={{ width:24, height:24, borderRadius:7,
            flexShrink:0, border:`2px solid ${m.preso?C.verde:C.line}`, background:m.preso?C.verde:"transparent",
            display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:14, cursor:"pointer", padding:0 }}>
            {m.preso?"✓":""}
          </button>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14.5, color: m.preso?C.mute:C.ink, textDecoration: m.preso?"line-through":"none" }}>
              {m.nome} ×{m.qty}
            </div>
            <div style={{ fontSize:11.5, color: m.preso?C.verde:C.arancio }}>{m.preso?"comprato":"da comprare"}</div>
          </div>
          <span style={{ fontSize:14, color:C.inkSoft, fontWeight:600 }}>€{(m.prezzo*m.qty).toFixed(0)}</span>
          <button onClick={()=>rimuoviMateriale(lavoro.id, m.id)} style={{ background:"none", border:"none", color:C.mute, fontSize:18, cursor:"pointer" }}>×</button>
        </div>
      ))}
      {/* aggiungi materiale */}
      <div style={{ display:"flex", gap:7, marginTop:8 }}>
        <Inp placeholder="Materiale" value={matNome} onChange={e=>setMatNome(e.target.value)} style={{ flex:3 }}/>
        <Inp placeholder="Qt" type="number" value={matQty} onChange={e=>setMatQty(e.target.value)} style={{ flex:1 }}/>
        <Inp placeholder="€" type="number" value={matPrezzo} onChange={e=>setMatPrezzo(e.target.value)} style={{ flex:1 }}/>
        <button onClick={()=>{ if(!matNome)return; aggiungiMateriale(lavoro.id,{nome:matNome,qty:Number(matQty)||1,prezzo:Number(matPrezzo)||0}); setMatNome(""); setMatQty("1"); setMatPrezzo(""); }}
          style={{ background:C.copper, border:"none", borderRadius:10, color:"#fff", fontSize:20, width:44, cursor:"pointer", flexShrink:0 }}>+</button>
      </div>
      <div style={{ fontSize:11.5, color:C.mute, marginTop:7, marginBottom:4 }}>
        I materiali "da comprare" finiscono in automatico nella Lista della spesa.
      </div>

      {/* IL BIVIO — appare da solo dopo aver spuntato fatto, o a richiesta */}
      {sceltaOpen ? (
        <SceltaProssima
          ricorrente={!!tappaRicorrente}
          onScelto={t=>{ aggiungiTappa(l.id,t); setSceltaOpen(false); }}
          onChiudiConPagamento={chiudiConPagamento}
          onAnnulla={()=>setSceltaOpen(false)} />
      ) : (
        <button onClick={()=>setSceltaOpen(true)} style={{ width:"100%", background:"transparent",
          border:`1.5px dashed ${C.line}`, borderRadius:14, padding:"13px", cursor:"pointer", marginTop:4,
          color:C.inkSoft, fontSize:14, fontWeight:600 }}>
          + Aggiungi una fase o chiudi il lavoro
        </button>
      )}
    </Overlay>
  );
}

function SceltaProssima({ ricorrente, onScelto, onChiudiConPagamento, onAnnulla }) {
  const [vista, setVista] = useState("scelta"); // scelta | pagamento | fasi
  const [config, setConfig] = useState(null);

  // --- LIVELLO 1: la domanda binaria ---
  if(vista==="scelta") {
    return (
      <div style={{ background:C.cardSoft, border:`1.5px solid ${C.copper}`, borderRadius:16, padding:"18px 16px", marginTop:4 }}>
        <div style={{ fontSize:16, fontWeight:800, marginBottom:4, textAlign:"center" }}>Il lavoro è finito?</div>
        <div style={{ fontSize:12.5, color:C.inkSoft, marginBottom:16, textAlign:"center" }}>Scegli tu cosa fare</div>

        {/* HO FINITO — grande, verde, il caso normale */}
        <button onClick={()=>setVista("pagamento")} style={{ width:"100%",
          background:`linear-gradient(135deg,${C.verde},#0F6B30)`, border:"none", borderRadius:14,
          padding:"18px", cursor:"pointer", color:"#fff", marginBottom:11,
          boxShadow:"0 5px 16px rgba(21,128,61,0.3)" }}>
          <div style={{ fontSize:30, marginBottom:5 }}>✓</div>
          <div style={{ fontSize:17, fontWeight:800 }}>Ho finito qui</div>
          <div style={{ fontSize:12.5, opacity:0.92, marginTop:2 }}>Registra l'incasso e chiudi</div>
        </button>

        {/* SERVE ANCORA — secondario, il caso raro */}
        <button onClick={()=>setVista("fasi")} style={{ width:"100%",
          background:C.card, border:`1.5px solid ${C.line}`, borderRadius:14,
          padding:"15px", cursor:"pointer", color:C.ink }}>
          <div style={{ fontSize:15.5, fontWeight:700 }}>+ Serve ancora qualcosa</div>
          <div style={{ fontSize:12.5, color:C.inkSoft, marginTop:2 }}>Sopralluogo, preventivo, altro intervento…</div>
        </button>

        <button onClick={onAnnulla} style={{ width:"100%", marginTop:12, background:"transparent",
          border:"none", color:C.mute, fontSize:13.5, cursor:"pointer", padding:"6px" }}>Annulla</button>
      </div>
    );
  }

  // --- LIVELLO 2a: pagamento veloce ---
  if(vista==="pagamento") {
    return <ChiusuraPagamento ricorrente={ricorrente}
      onConferma={onChiudiConPagamento} onIndietro={()=>setVista("scelta")} />;
  }

  // --- LIVELLO 2b: le fasi, scelte dall'utente, SENZA pagamento e SENZA proposta ---
  if(config) return <ConfiguraTappa tipo={config} onSalva={onScelto} onIndietro={()=>setConfig(null)} />;

  const fasi = ["sopralluogo","preventivo","lavoro","rilavorazione","manutenzione"];
  return (
    <div style={{ background:C.cardSoft, border:`1.5px solid ${C.copper}`, borderRadius:16, padding:"16px", marginTop:4 }}>
      <button onClick={()=>setVista("scelta")} style={{ background:"none", border:"none", color:C.inkSoft,
        fontSize:13.5, cursor:"pointer", padding:0, marginBottom:12 }}>‹ indietro</button>
      <div style={{ fontSize:15, fontWeight:800, marginBottom:13 }}>Cosa serve fare ora?</div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {fasi.map(k=>{ const t=TAPPE[k];
          return (
            <button key={k} onClick={()=>setConfig(k)} style={{ background:C.card,
              border:`1.5px solid ${C.line}`, borderRadius:12, padding:"14px 15px", cursor:"pointer",
              display:"flex", alignItems:"center", gap:13, textAlign:"left" }}>
              <span style={{ fontSize:22 }}>{t.icon}</span>
              <div style={{ flex:1, fontSize:15.5, fontWeight:700, color:t.ink }}>{t.label}</div>
              <span style={{ color:C.mute, fontSize:18 }}>›</span>
            </button>
          ); })}
      </div>
    </div>
  );
}

// chiusura veloce col pagamento — la cosa che fa guadagnare
function ChiusuraPagamento({ ricorrente, onConferma, onIndietro }) {
  const [importo, setImporto] = useState("");
  const [pagato, setPagato] = useState(null); // true=ora, false=da fatturare

  const puoChiudere = pagato!==null;

  return (
    <div style={{ background:C.cardSoft, border:`1.5px solid ${C.verde}`, borderRadius:16, padding:"18px 16px", marginTop:4 }}>
      <button onClick={onIndietro} style={{ background:"none", border:"none", color:C.inkSoft,
        fontSize:13.5, cursor:"pointer", padding:0, marginBottom:14 }}>‹ indietro</button>

      <div style={{ fontSize:17, fontWeight:800, marginBottom:3 }}>Quanto ti ha pagato?</div>
      <div style={{ fontSize:12.5, color:C.inkSoft, marginBottom:16 }}>L'importo del lavoro</div>

      {/* importo grande */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18,
        background:C.card, border:`1.5px solid ${C.line}`, borderRadius:13, padding:"4px 16px" }}>
        <span style={{ fontSize:26, fontWeight:800, color:C.verde }}>€</span>
        <input type="number" value={importo} onChange={e=>setImporto(e.target.value)} placeholder="0"
          autoFocus style={{ flex:1, border:"none", outline:"none", background:"transparent",
          fontSize:30, fontWeight:800, color:C.ink, padding:"12px 0", fontFamily:"inherit", width:"100%" }}/>
      </div>

      {/* pagato ora vs da fatturare */}
      <div style={{ fontSize:13.5, fontWeight:600, color:C.inkSoft, marginBottom:9 }}>Come?</div>
      <div style={{ display:"flex", gap:10, marginBottom:18 }}>
        <button onClick={()=>setPagato(true)} style={{ flex:1,
          background: pagato===true?C.verdeBg:C.card, border:`2px solid ${pagato===true?C.verde:C.line}`,
          borderRadius:13, padding:"15px 10px", cursor:"pointer" }}>
          <div style={{ fontSize:24, marginBottom:4 }}>💵</div>
          <div style={{ fontSize:14, fontWeight:700, color: pagato===true?C.verde:C.ink }}>Pagato ora</div>
          <div style={{ fontSize:11, color:C.inkSoft, marginTop:1 }}>contanti o POS</div>
        </button>
        <button onClick={()=>setPagato(false)} style={{ flex:1,
          background: pagato===false?C.arancioBg:C.card, border:`2px solid ${pagato===false?C.arancio:C.line}`,
          borderRadius:13, padding:"15px 10px", cursor:"pointer" }}>
          <div style={{ fontSize:24, marginBottom:4 }}>📄</div>
          <div style={{ fontSize:14, fontWeight:700, color: pagato===false?C.arancio:C.ink }}>Da fatturare</div>
          <div style={{ fontSize:11, color:C.inkSoft, marginTop:1 }}>incasso dopo</div>
        </button>
      </div>

      {ricorrente && (
        <div style={{ background:C.violaBg, border:`1px solid ${C.viola}44`, borderRadius:11,
          padding:"11px 14px", marginBottom:16, fontSize:13, color:C.viola, display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:16 }}>🔄</span>
          <span>Nora riprogrammerà la prossima manutenzione da sola.</span>
        </div>
      )}

      <button onClick={()=>onConferma({ importo, pagato })} disabled={!puoChiudere}
        style={{ width:"100%", background: puoChiudere?C.verde:C.line, border:"none", borderRadius:13,
        color:"#fff", fontSize:16, fontWeight:700, padding:"16px", cursor: puoChiudere?"pointer":"not-allowed" }}>
        ✓ Chiudi lavoro
      </button>
    </div>
  );
}

function ConfiguraTappa({ tipo, onSalva, onIndietro }) {
  const t = TAPPE[tipo];
  const [data, setData] = useState(today(tipo==="pagamento"?0:1));
  const [ora, setOra] = useState("09:00");
  const [nota, setNota] = useState("");
  const [importo, setImporto] = useState("");
  const [ripete, setRipete] = useState(false);
  const [ogni, setOgni] = useState("anno");

  const salva = () => {
    const tappa = { tipo, data, nota };
    if(tipo!=="materiale" && tipo!=="pagamento") tappa.ora = ora;
    if(tipo==="pagamento"||tipo==="preventivo") tappa.importo = Number(importo)||0;
    if(t.ripetibile && ripete){ tappa.ripete=true; tappa.ogni=ogni; }
    if(tipo==="pagamento") tappa.fatta = true;
    onSalva(tappa);
  };

  return (
    <div style={{ background:C.cardSoft, border:`1.5px solid ${t.ink}`, borderRadius:14, padding:"16px", marginTop:4 }}>
      <button onClick={onIndietro} style={{ background:"none", border:"none", color:C.inkSoft, fontSize:13.5, cursor:"pointer", padding:0, marginBottom:12 }}>‹ indietro</button>
      <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:16 }}>
        <span style={{ fontSize:24 }}>{t.icon}</span>
        <span style={{ fontSize:18, fontWeight:800, color:t.ink }}>{t.label}</span>
      </div>
      <button onClick={()=>alert(`🎙️ In Nora reale: "${t.label} ${tipo==="pagamento"?"90 euro":"domani alle 10"}" — Nora compila da sola.`)}
        style={{ width:"100%", background:C.copperBg, border:`1px solid ${C.copper}44`, borderRadius:11, padding:"12px",
        cursor:"pointer", marginBottom:14, display:"flex", alignItems:"center", justifyContent:"center", gap:8, color:C.copper, fontSize:14, fontWeight:600 }}>
        🎙️ Dillo a voce
      </button>
      {tipo!=="materiale" && tipo!=="pagamento" && (
        <div style={{ display:"flex", gap:10, marginBottom:12 }}>
          <div style={{ flex:1 }}><Label>Giorno</Label><Inp type="date" value={data} onChange={e=>setData(e.target.value)}/></div>
          <div style={{ flex:1 }}><Label>Ora</Label><Inp type="time" value={ora} onChange={e=>setOra(e.target.value)}/></div>
        </div>
      )}
      {(tipo==="pagamento"||tipo==="preventivo") && <div style={{ marginBottom:12 }}><Label>Importo €</Label><Inp type="number" placeholder="0" value={importo} onChange={e=>setImporto(e.target.value)}/></div>}
      <Label>Nota (facoltativa)</Label>
      <Inp placeholder="..." value={nota} onChange={e=>setNota(e.target.value)}/>
      {t.ripetibile && (
        <div style={{ marginTop:14 }}>
          <button onClick={()=>setRipete(!ripete)} style={{ width:"100%", background: ripete?C.violaBg:C.card,
            border:`1.5px solid ${ripete?C.viola:C.line}`, borderRadius:11, padding:"12px 14px", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontSize:14.5, fontWeight:600, color: ripete?C.viola:C.inkSoft }}>🔄 Si ripete nel tempo</span>
            <span style={{ width:42, height:24, borderRadius:20, background: ripete?C.viola:C.line, position:"relative" }}>
              <span style={{ position:"absolute", top:2, left: ripete?20:2, width:20, height:20, borderRadius:"50%", background:"#fff", transition:"all .2s" }}/>
            </span>
          </button>
          {ripete && <div style={{ display:"flex", gap:7, marginTop:10 }}>
            {[["mese","mese"],["3mesi","3 mesi"],["6mesi","6 mesi"],["anno","anno"]].map(([v,l])=>(
              <button key={v} onClick={()=>setOgni(v)} style={{ flex:1, background: ogni===v?C.viola:C.card,
                border:`1px solid ${ogni===v?C.viola:C.line}`, borderRadius:9, color: ogni===v?"#fff":C.inkSoft,
                fontSize:11.5, fontWeight:600, padding:"9px 4px", cursor:"pointer" }}>{l}</button>
            ))}
          </div>}
        </div>
      )}
      <Btn onClick={salva} style={{ marginTop:18, background:t.ink }}>Aggiungi {t.label.toLowerCase()}</Btn>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  NUOVO LAVORO MANUALE
// ═══════════════════════════════════════════════════════════
function NuovoLavoro({ creaLavoro, cl, onFatto, onChiudi }) {
  const [clienteId, setClienteId] = useState("");
  const [cat, setCat] = useState("lavoro");
  const [titolo, setTitolo] = useState("");
  const [indirizzo, setIndirizzo] = useState("");
  const [data, setData] = useState(today(1));
  const [ora, setOra] = useState("");
  const [note, setNote] = useState("");

  const clienteSel = clienteId ? CLIENTI.find(c=>c.id===Number(clienteId)) : null;

  const salva = () => {
    if(!clienteId||!titolo) return;
    // arricchisci indirizzo cliente se mancava
    if(indirizzo && clienteSel && !clienteSel.indirizzo) clienteSel.indirizzo = indirizzo;
    creaLavoro({ clienteId:Number(clienteId), titolo, categoria:cat,
      tappe:[{ id:nid(), tipo:cat, data, ora:ora||"", fatta:false, nota:note||"", materiali:[] }] });
    onFatto(null, data);
  };

  return (
    <Overlay onChiudi={onChiudi}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
        <span style={{ fontSize:18 }}>✍️</span>
        <span style={{ fontSize:13, fontWeight:800, color:C.copper, letterSpacing:0.4 }}>NUOVO EVENTO A MANO</span>
        <button onClick={onChiudi} style={{ marginLeft:"auto", background:"none", border:"none", color:C.mute, fontSize:28, cursor:"pointer" }}>×</button>
      </div>
      <div style={{ fontSize:12.5, color:C.inkSoft, marginBottom:14, padding:"8px 12px",
        background:C.copperBg, borderRadius:9 }}>
        Va dritto in agenda, senza passare per la conferma.
      </div>

      <Label>Tipo di lavoro</Label>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:7 }}>
        {["sopralluogo","lavoro","preventivo","manutenzione","materiale"].map(k=>{ const t=TAPPE[k]; const sel=cat===k;
          return <button key={k} onClick={()=>setCat(k)} style={{ background: sel?t.bg:C.card,
            border:`1.5px solid ${sel?t.ink:C.line}`, borderRadius:10, padding:"11px", cursor:"pointer",
            color: sel?t.ink:C.inkSoft, fontSize:13.5, fontWeight:sel?700:500,
            display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>{t.icon} {t.label}</button>; })}
      </div>

      <Label>Cliente</Label>
      <Sel value={clienteId} onChange={e=>setClienteId(e.target.value)}>
        <option value="">Seleziona...</option>
        {CLIENTI.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
      </Sel>

      <Label>Cosa c'è da fare</Label>
      <Inp placeholder="es. Perde la caldaia" value={titolo} onChange={e=>setTitolo(e.target.value)}/>

      {clienteSel && !clienteSel.indirizzo && (
        <>
          <Label>Indirizzo</Label>
          <Inp placeholder="Dove intervenire" value={indirizzo} onChange={e=>setIndirizzo(e.target.value)}/>
        </>
      )}

      {cat!=="materiale" && (
        <div style={{ display:"flex", gap:10 }}>
          <div style={{ flex:1.3 }}><Label>Giorno</Label><Inp type="date" value={data} onChange={e=>setData(e.target.value)}/></div>
          <div style={{ flex:1 }}><Label>Ora</Label><Inp type="time" value={ora} onChange={e=>setOra(e.target.value)}/></div>
        </div>
      )}

      <Label>Note (facoltative)</Label>
      <Inp placeholder="Altri dettagli..." value={note} onChange={e=>setNote(e.target.value)}/>

      <Btn onClick={salva} style={{ marginTop:18 }}>Aggiungi in agenda</Btn>
    </Overlay>
  );
}


// ═══════════════════════════════════════════════════════════
//  SPESA · RUBRICA · CONTI (viste)
// ═══════════════════════════════════════════════════════════
function Spesa({ lavori, toggleMateriale }) {
  // materiali da comprare = quelli con preso=false, dai lavori attivi
  const items = lavori.filter(l=>l.stato==="attivo").flatMap(l=>
    (l.materiali||[]).filter(m=>!m.preso).map(m=>({...m, lavoroId:l.id, lavoro:l.titolo})));

  if(items.length===0) return (
    <div><div style={{ fontSize:22, fontWeight:800, marginBottom:6 }}>Lista della spesa</div>
      <div style={{ color:C.mute, fontSize:14.5, textAlign:"center", padding:"30px 0" }}>
        Niente da comprare 🎉<br/><span style={{ fontSize:12.5 }}>I materiali da prendere compaiono qui dai lavori aperti</span>
      </div></div>
  );

  const tot = items.reduce((s,m)=>s+m.prezzo*m.qty,0);
  return (
    <div>
      <div style={{ fontSize:22, fontWeight:800, marginBottom:6 }}>Lista della spesa</div>
      <div style={{ fontSize:14, color:C.inkSoft, marginBottom:18 }}>Spunta quando l'hai comprato</div>
      <div style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:15, padding:"6px 0", marginBottom:16 }}>
        {items.map((m,i)=>(
          <div key={m.id} onClick={()=>toggleMateriale(m.lavoroId, m.id)} style={{ display:"flex", alignItems:"center",
            gap:12, padding:"13px 16px", cursor:"pointer", borderBottom: i<items.length-1?`1px solid ${C.line}`:"none" }}>
            <div style={{ width:24, height:24, borderRadius:7, flexShrink:0, border:`2px solid ${C.line}`,
              display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:15 }}></div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:15, color:C.ink }}>{m.nome} ×{m.qty}</div>
              <div style={{ fontSize:12, color:C.mute }}>per: {m.lavoro}</div>
            </div>
            <div style={{ fontSize:14, color:C.inkSoft, fontWeight:600 }}>€{(m.prezzo*m.qty).toFixed(0)}</div>
          </div>
        ))}
      </div>
      <div style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:12, padding:"13px 16px",
        display:"flex", justifyContent:"space-between", fontWeight:700, fontSize:16 }}>
        <span>Totale da comprare</span><span style={{ color:C.copper }}>€{tot.toFixed(0)}</span>
      </div>
    </div>
  );
}

function Rubrica() {
  const [tab, setTab] = useState("clienti");
  const lista = tab==="clienti" ? CLIENTI : FORNITORI;
  return (
    <div>
      <div style={{ fontSize:22, fontWeight:800, marginBottom:16 }}>Rubrica</div>
      <div style={{ display:"flex", gap:8, marginBottom:18, background:C.card, borderRadius:12, padding:4, border:`1px solid ${C.line}` }}>
        {[["clienti","👥 Clienti"],["fornitori","🏭 Fornitori"]].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{ flex:1, background: tab===t?C.copper:"transparent",
            border:"none", borderRadius:9, color: tab===t?"#fff":C.inkSoft, fontSize:15, fontWeight:tab===t?700:600,
            padding:"11px", cursor:"pointer" }}>{l}</button>
        ))}
      </div>
      {lista.map(item=>(
        <div key={item.id} style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:14,
          padding:"15px 16px", marginBottom:10, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:16.5, fontWeight:700 }}>{item.nome}</div>
            <div style={{ fontSize:14, color:C.inkSoft, marginTop:3 }}>{item.tel}</div>
            {item.impianto && <div style={{ fontSize:13.5, color:C.mute, marginTop:2 }}>🔩 {item.impianto}</div>}
            {item.tipo && <div style={{ fontSize:13.5, color:C.mute, marginTop:2 }}>{item.tipo}</div>}
          </div>
          <a href={`tel:${item.tel}`} style={{ background:C.verde, color:"#fff", textDecoration:"none", borderRadius:11,
            width:46, height:46, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>📞</a>
        </div>
      ))}
    </div>
  );
}

function Conti({ lavori }) {
  const chiusi = lavori.filter(l=>l.stato==="archiviato");
  const pagamenti = lavori.flatMap(l=>l.tappe.filter(t=>t.tipo==="pagamento"&&t.fatta));
  const incassato = pagamenti.reduce((s,t)=>s+(t.importo||0),0);
  const attivi = lavori.filter(l=>l.stato==="attivo").length;
  const daIncassare = lavori.filter(l=>l.stato==="attivo").flatMap(l=>l.tappe.filter(t=>t.tipo==="preventivo")).reduce((s,t)=>s+(t.importo||0),0);
  const perCat={}; lavori.forEach(l=>{ perCat[l.categoria]=(perCat[l.categoria]||0)+1; });
  const maxC=Math.max(...Object.values(perCat),1);

  const Stat = ({label,val,color}) => (
    <div style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:14, padding:"16px 17px" }}>
      <div style={{ fontSize:13, color:C.inkSoft }}>{label}</div>
      <div style={{ fontSize:24, fontWeight:800, color, marginTop:4 }}>{val}</div>
    </div>
  );
  return (
    <div>
      <div style={{ fontSize:22, fontWeight:800, marginBottom:6 }}>I tuoi conti</div>
      <div style={{ fontSize:14, color:C.inkSoft, marginBottom:18 }}>Come sta andando</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:11, marginBottom:11 }}>
        <Stat label="Incassato" val={`€${incassato}`} color={C.verde} />
        <Stat label="In preventivo" val={`€${daIncassare}`} color={C.arancio} />
        <Stat label="Lavori attivi" val={attivi} color={C.blu} />
        <Stat label="Chiusi" val={chiusi.length} color={C.viola} />
      </div>
      <div style={{ fontSize:13, fontWeight:800, color:C.mute, letterSpacing:0.8, textTransform:"uppercase", margin:"20px 0 12px" }}>Tipi di lavoro</div>
      <div style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:15, padding:"16px 17px" }}>
        {Object.entries(perCat).map(([k,n])=>(
          <div key={k} style={{ marginBottom:13 }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:14.5, marginBottom:6 }}>
              <span style={{ color:C.inkSoft }}>{TAPPE[k]?.icon} {TAPPE[k]?.label}</span><span style={{ fontWeight:700 }}>{n}</span>
            </div>
            <div style={{ height:9, background:C.bg, borderRadius:5, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${(n/maxC)*100}%`, background:TAPPE[k]?.ink, borderRadius:5 }}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  PRIMITIVES
// ═══════════════════════════════════════════════════════════
const navBtn = { background:C.card, border:`1px solid ${C.line}`, borderRadius:11, color:C.ink,
  fontSize:24, width:42, height:42, cursor:"pointer", lineHeight:1, fontWeight:300 };
const Label = ({children}) => (<div style={{ fontSize:14, color:C.inkSoft, marginBottom:7, marginTop:14, fontWeight:600 }}>{children}</div>);
const Inp = ({style,...p}) => (<input {...p} style={{ width:"100%", background:C.card, border:`1.5px solid ${C.line}`, borderRadius:11, color:C.ink, fontSize:15.5, padding:"13px 15px", boxSizing:"border-box", fontFamily:"inherit", ...style }}/>);
const Sel = ({style,...p}) => (<select {...p} style={{ width:"100%", background:C.card, border:`1.5px solid ${C.line}`, borderRadius:11, color:C.ink, fontSize:15.5, padding:"13px 15px", boxSizing:"border-box", fontFamily:"inherit", ...style }}/>);
const Btn = ({children,style,...p}) => (<button {...p} style={{ width:"100%", background:C.copper, border:"none", borderRadius:13, color:"#fff", fontSize:16, fontWeight:700, padding:"15px", cursor:"pointer", ...style }}>{children}</button>);
function Overlay({ children, onChiudi }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(31,41,55,0.55)", zIndex:90, display:"flex", alignItems:"flex-end" }} onClick={onChiudi}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.bg, width:"100%", maxWidth:480, margin:"0 auto",
        borderRadius:"24px 24px 0 0", maxHeight:"92vh", overflowY:"auto", padding:"24px 20px 32px" }}>{children}</div>
    </div>
  );
}
