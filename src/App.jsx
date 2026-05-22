import { useState, useRef, useEffect } from "react";

// ── Configuration ─────────────────────────────────────────────────────────────
const STICKS = [
  { id:"A", pts:10, label:"Bleu – Rouge – Bleu",                 segs:["blue","red","blue"]             },
  { id:"B", pts:20, label:"Rayures diagonales bleues",            segs:["diag"]                          },
  { id:"C", pts:2,  label:"1 Bleu + 1 Rouge espacés",             segs:["blue","gap","red"]              },
  { id:"D", pts:5,  label:"Rouge – Bleu – Rouge – Bleu – Rouge",  segs:["red","blue","red","blue","red"] },
  { id:"E", pts:3,  label:"Bleu – Jaune – Rouge",                 segs:["blue","yel","red"]              },
];
const TOTAL = 145;
const SEG_COLORS = { blue:"#378ADD", red:"#E24B4A", yel:"#EF9F27" };
const TYPE_COLOR  = { A:"#1d4ed8", B:"#0891b2", C:"#7c3aed", D:"#b45309", E:"#15803d" };
const API_KEY_STORAGE = "mika_api_key";

// ── Prompt ────────────────────────────────────────────────────────────────────
const PROMPT = `Analyze the Mikado sticks in this photo. Each stick is ~180 mm long.

For EACH stick, examine THREE fixed positions:
  P1 = 14% from the near end  (~25 mm from tip)
  P2 = 47% from the near end  (~85 mm — midpoint)
  P3 = 81% from the near end  (~145 mm from tip)

"Near end" = tip closest to top-left corner of the image.
At each position report: none | blue | red | yellow
Report "none" only if you see clearly empty beige/cream at that position.

DiagStripes = yes if ENTIRE surface has continuous diagonal blue/beige stripes.
DenseSegs   = yes if ~5 small evenly-spaced colored squares visible.

CRITICAL for P2: report "none" only if absolutely no colored square at midpoint.

One line per stick:
STICK N: P1=[color] P2=[color] P3=[color] DiagStripes=[yes/no] DenseSegs=[yes/no]

End with: TOTAL: N sticks`;

// ── JS Classification ─────────────────────────────────────────────────────────
function parseSticks(text) {
  const re = /STICK\s+\d+:\s+P1=(\w+)\s+P2=(\w+)\s+P3=(\w+)\s+DiagStripes=(yes|no)\s+DenseSegs=(yes|no)/gi;
  const sticks = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    sticks.push({
      p1: m[1].toLowerCase(), p2: m[2].toLowerCase(), p3: m[3].toLowerCase(),
      diag: m[4].toLowerCase() === "yes", dense: m[5].toLowerCase() === "yes"
    });
  }
  return sticks;
}

function classifyOne({ p1, p2, p3, diag, dense }) {
  if (diag)                                          return "B";
  if (["yellow","orange","golden"].includes(p2))     return "E";
  if (p2 === "none") {
    if (p1==="red"  && p3==="red")                   return "D";
    if (p1==="blue" && p3==="blue")                  return "A";
    return "C";
  }
  if (dense)                                         return "D";
  if (p2 === "blue") {
    if (p1 === "none" && p3 === "red")               return "A"; // A: center red seen as blue, P1 missed
    return "D";
  }
  if (p2 === "red") {
    if (p1==="blue" && p3==="blue")                  return "A";
    if (p1==="none" && p3==="blue")                  return "A";
    if (p1==="blue" && p3==="none")                  return "C";
    if (p1==="red"  && p3==="blue")                  return "A";
    if (p1==="none" && p3==="none")                  return "A";
    if (p1==="blue" && p3==="red")                   return "D";
    if (p1==="none" && p3==="red")                   return "D";
    if (p1==="red"  && p3==="red")                   return "D";
    if (p1==="red"  && p3==="none")                  return "D";
  }
  return "E";
}

function classifyAll(text) {
  const sticks = parseSticks(text);
  const counts = { A:0, B:0, C:0, D:0, E:0 };
  const detail = sticks.map((s, i) => {
    const type = classifyOne(s);
    counts[type]++;
    return { n:i+1, type, p1:s.p1, p2:s.p2, p3:s.p3 };
  });
  return { counts, detail, total: sticks.length };
}

// ── Stick visual ──────────────────────────────────────────────────────────────
function StickVisual({ segs, sm }) {
  const w=sm?8:10, h=sm?8:10;
  return (
    <div style={{display:"flex",gap:2,alignItems:"center",flexShrink:0}}>
      {segs.map((s,i) => {
        if (s==="gap")  return <span key={i} style={{width:sm?4:6}}/>;
        if (s==="diag") return <span key={i} style={{width:sm?28:38,height:h,borderRadius:2,
          background:"repeating-linear-gradient(45deg,#378ADD 0,#378ADD 3px,#f0e6d2 3px,#f0e6d2 6px)"}}/>;
        return <span key={i} style={{width:w,height:h,borderRadius:2,background:SEG_COLORS[s]}}/>;
      })}
    </div>
  );
}

// ── Settings screen ───────────────────────────────────────────────────────────
function Settings({ onSave }) {
  const [key, setKey] = useState(() => localStorage.getItem(API_KEY_STORAGE) || "");
  return (
    <div style={{fontFamily:"system-ui,sans-serif",maxWidth:430,margin:"0 auto",padding:"32px 20px"}}>
      <h1 style={{fontSize:26,fontWeight:700,margin:"0 0 8px",letterSpacing:-0.5}}>🎋 Mika</h1>
      <p style={{fontSize:13,color:"#888",marginBottom:32}}>Configuration initiale</p>

      <div style={{background:"#f7f7f5",borderRadius:14,padding:"20px",marginBottom:20}}>
        <p style={{fontSize:14,fontWeight:600,margin:"0 0 8px"}}>Clé API Anthropic</p>
        <p style={{fontSize:12,color:"#888",margin:"0 0 12px",lineHeight:1.5}}>
          Obtenez votre clé sur{" "}
          <a href="https://console.anthropic.com" target="_blank" rel="noreferrer"
            style={{color:"#1d4ed8"}}>console.anthropic.com</a>
        </p>
        <input
          type="password"
          value={key}
          onChange={e => setKey(e.target.value)}
          placeholder="sk-ant-..."
          style={{width:"100%",padding:"10px 12px",fontSize:14,borderRadius:10,
            border:"1px solid #ddd",outline:"none",marginBottom:4}}
        />
        <p style={{fontSize:11,color:"#aaa",margin:"6px 0 0"}}>
          Stockée localement sur cet appareil uniquement.
        </p>
      </div>

      <button
        onClick={() => { localStorage.setItem(API_KEY_STORAGE, key.trim()); onSave(); }}
        disabled={!key.trim().startsWith("sk-")}
        style={{width:"100%",padding:14,fontSize:16,fontWeight:700,borderRadius:12,
          border:"none",background:key.trim().startsWith("sk-")?"#1a1a1a":"#ccc",
          color:"#fff",cursor:key.trim().startsWith("sk-")?"pointer":"not-allowed"}}
      >
        Enregistrer et démarrer
      </button>
    </div>
  );
}

// ── Main app ──────────────────────────────────────────────────────────────────
export default function App() {
  const [hasKey,    setHasKey]    = useState(() => !!localStorage.getItem(API_KEY_STORAGE));
  const [showSettings, setShowSettings] = useState(false);
  const [imgSrc,    setImgSrc]    = useState(null);
  const [imgB64,    setImgB64]    = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [descText,  setDescText]  = useState("");
  const [showDesc,  setShowDesc]  = useState(false);
  const [showDetail,setShowDetail]= useState(false);
  const [error,     setError]     = useState(null);
  const [counts,    setCounts]    = useState(null);
  const [detail,    setDetail]    = useState([]);
  const [detected,  setDetected]  = useState(null);
  const fileRef = useRef();

  if (!hasKey || showSettings) {
    return <Settings onSave={() => { setHasKey(true); setShowSettings(false); }} />;
  }

  const handleFile = e => {
    const f = e.target.files[0]; if (!f) return;
    setImgSrc(URL.createObjectURL(f));
    setCounts(null); setError(null); setDescText(""); setDetected(null); setDetail([]);
  };

  // Load base64 when imgSrc changes
  const loadB64 = (file) => {
    const r = new FileReader();
    r.onload = ev => setImgB64(ev.target.result.split(",")[1]);
    r.readAsDataURL(file);
  };

  const handleFileWithB64 = e => {
    const f = e.target.files[0]; if (!f) return;
    setImgSrc(URL.createObjectURL(f));
    setCounts(null); setError(null); setDescText(""); setDetected(null); setDetail([]);
    // Compress image to stay under 5 MB API limit
    const img = new Image();
    img.onload = () => {
      const MAX = 1600;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else       { w = Math.round(w * MAX / h); h = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      const b64 = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
      setImgB64(b64);
    };
    img.src = URL.createObjectURL(f);
  };

  const analyze = async () => {
    if (!imgB64) return;
    setError(null); setCounts(null); setDetail([]); setDescText(""); setDetected(null); setLoading(true);
    const apiKey = localStorage.getItem(API_KEY_STORAGE) || "";
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1200,
          messages: [{ role:"user", content:[
            { type:"image", source:{ type:"base64", media_type:"image/jpeg", data:imgB64 } },
            { type:"text",  text: PROMPT }
          ]}]
        })
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error.message);
      const desc = data.content.find(b => b.type==="text")?.text?.trim() ?? "";
      setDescText(desc);
      const { counts:c, detail:d, total } = classifyAll(desc);
      setCounts(c); setDetail(d); setDetected(total);
    } catch(err) {
      setError("Erreur : " + err.message);
    } finally { setLoading(false); }
  };

  const adjust = (id, delta) => setCounts(p => ({...p, [id]: Math.max(0,(p[id]||0)+delta)}));
  const reset  = () => {
    setImgSrc(null); setImgB64(null); setCounts(null);
    setError(null); setDescText(""); setDetected(null); setDetail([]);
  };

  const myScore  = counts ? STICKS.reduce((s,k) => s+(counts[k.id]||0)*k.pts, 0) : 0;
  const oppScore = TOTAL - myScore;
  const won = myScore > oppScore, tie = myScore === oppScore;
  const sc = won?"#15803d":tie?"#555":"#b91c1c";
  const sb = won?"#f0fdf4":tie?"#f7f7f5":"#fff5f5";
  const se = won?"#bbf7d0":tie?"#e8e8e8":"#fecaca";
  const card = { background:"#fff", border:"1px solid #e8e8e8", borderRadius:14, overflow:"hidden", marginBottom:12 };
  const row  = { display:"flex", alignItems:"center", padding:"10px 14px", gap:8 };

  return (
    <div style={{fontFamily:"system-ui,sans-serif",maxWidth:430,margin:"0 auto",padding:"16px 14px 48px"}}>

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <div>
          <h1 style={{fontSize:26,fontWeight:700,margin:0,letterSpacing:-0.5}}>🎋 Mika</h1>
          <p style={{fontSize:12,color:"#888",marginTop:2}}>Scoring Mikado · Total : {TOTAL} pts</p>
        </div>
        <button onClick={() => setShowSettings(true)}
          style={{background:"none",border:"none",fontSize:20,cursor:"pointer",padding:6,color:"#aaa"}}>
          ⚙️
        </button>
      </div>

      {/* Photo zone */}
      {imgSrc
        ? <div onClick={()=>{ if(!loading) reset(); }}
            style={{borderRadius:14,overflow:"hidden",border:"1px solid #e8e8e8",
              marginBottom:12,cursor:loading?"default":"pointer"}}>
            <img src={imgSrc} style={{width:"100%",display:"block"}} alt="Baguettes"/>
            {!loading && <div style={{padding:"7px 12px",fontSize:12,color:"#888",
              textAlign:"center",background:"#fafafa"}}>
              Appuyer pour recommencer ✕
            </div>}
          </div>
        : <div style={{position:"relative",border:"1.5px dashed #ccc",borderRadius:14,
            minHeight:200,display:"flex",flexDirection:"column",alignItems:"center",
            justifyContent:"center",gap:8,marginBottom:12,background:"#fafafa",overflow:"hidden"}}>
            <span style={{fontSize:44,pointerEvents:"none"}}>📸</span>
            <span style={{fontSize:15,fontWeight:600,color:"#333",pointerEvents:"none"}}>
              Photographier les baguettes
            </span>
            <span style={{fontSize:12,color:"#999",textAlign:"center",padding:"0 30px",
              lineHeight:1.6,pointerEvents:"none"}}>
              Baguettes séparées · fond sombre<br/>Vue de dessus, bien éclairées
            </span>
            <input type="file" accept="image/*" capture="environment" onChange={handleFileWithB64}
              style={{position:"absolute",inset:0,opacity:0,cursor:"pointer",
                width:"100%",height:"100%"}}/>
          </div>
      }

      {/* Analyze button */}
      {imgSrc && !counts && (
        loading
          ? <div style={{background:"#f7f7f5",borderRadius:12,padding:"14px 16px",
              marginBottom:10,textAlign:"center"}}>
              <p style={{fontSize:14,color:"#555",margin:0}}>📷 Analyse en cours…</p>
              <div style={{height:4,background:"#e8e8e8",borderRadius:2,marginTop:10,overflow:"hidden"}}>
                <div style={{height:"100%",background:"#1a1a1a",borderRadius:2,
                  animation:"prog 2s ease-in-out infinite alternate"}}/>
              </div>
              <style>{`@keyframes prog{from{width:30%}to{width:95%}}`}</style>
            </div>
          : <button onClick={analyze}
              style={{width:"100%",padding:14,fontSize:16,fontWeight:700,borderRadius:12,
                border:"none",background:"#1a1a1a",color:"#fff",cursor:"pointer",marginBottom:10}}>
              ✨ Analyser les baguettes
            </button>
      )}

      {error && <div style={{background:"#fff5f5",border:"1px solid #fecaca",borderRadius:10,
        padding:"10px 12px",marginBottom:10}}>
        <p style={{color:"#b91c1c",fontSize:13,margin:0}}>{error}</p>
      </div>}

      {/* Debug panels */}
      {descText && <div style={card}>
        <button onClick={()=>setShowDesc(p=>!p)} style={{width:"100%",display:"flex",
          justifyContent:"space-between",alignItems:"center",padding:"10px 14px",
          background:"none",border:"none",cursor:"pointer"}}>
          <span style={{fontSize:11,fontWeight:700,color:"#999",letterSpacing:0.5}}>POSITIONS DÉTECTÉES</span>
          <span style={{fontSize:12,color:"#aaa"}}>{showDesc?"▲":"▼"}</span>
        </button>
        {showDesc && <pre style={{fontSize:11,color:"#555",padding:"0 14px 12px",margin:0,
          whiteSpace:"pre-wrap",lineHeight:1.6,borderTop:"1px solid #f0f0f0",paddingTop:10}}>
          {descText}
        </pre>}
      </div>}

      {detail.length > 0 && <div style={card}>
        <button onClick={()=>setShowDetail(p=>!p)} style={{width:"100%",display:"flex",
          justifyContent:"space-between",alignItems:"center",padding:"10px 14px",
          background:"none",border:"none",cursor:"pointer"}}>
          <span style={{fontSize:11,fontWeight:700,color:"#999",letterSpacing:0.5}}>CLASSIFICATION PAR STICK</span>
          <span style={{fontSize:12,color:"#aaa"}}>{showDetail?"▲":"▼"}</span>
        </button>
        {showDetail && <div style={{borderTop:"1px solid #f0f0f0"}}>
          {detail.map((d,i) => (
            <div key={i} style={{display:"flex",alignItems:"center",padding:"6px 14px",gap:8,
              borderBottom:i<detail.length-1?"1px solid #f5f5f5":"none"}}>
              <span style={{fontSize:11,color:"#aaa",minWidth:16}}>#{d.n}</span>
              <span style={{fontSize:11,color:"#888",flex:1}}>
                P1=<b>{d.p1}</b> P2=<b>{d.p2}</b> P3=<b>{d.p3}</b>
              </span>
              <span style={{fontSize:12,fontWeight:700,color:TYPE_COLOR[d.type]||"#333",
                background:`${TYPE_COLOR[d.type]}18`,borderRadius:6,padding:"2px 8px"}}>
                {d.type}
              </span>
            </div>
          ))}
        </div>}
      </div>}

      {/* Score */}
      {counts && <>
        <div style={{background:sb,border:`1px solid ${se}`,borderRadius:14,
          padding:"18px 16px",textAlign:"center",marginBottom:12}}>
          <p style={{fontSize:13,fontWeight:700,color:sc,margin:0}}>
            {won?"🎉 Victoire !":tie?"Égalité":"Défaite"}
          </p>
          <p style={{fontSize:52,fontWeight:700,color:sc,lineHeight:1,margin:"6px 0"}}>{myScore}</p>
          <p style={{fontSize:13,color:sc}}>Adversaire : <strong>{oppScore} pts</strong></p>
          {detected > 0 && <p style={{fontSize:11,color:sc,opacity:0.65,marginTop:4}}>
            {detected} baguette{detected>1?"s":""} analysée{detected>1?"s":""}
          </p>}
        </div>

        <div style={card}>
          <div style={{padding:"10px 14px",borderBottom:"1px solid #f0f0f0"}}>
            <p style={{fontSize:11,fontWeight:700,color:"#999",letterSpacing:0.5,margin:0}}>
              DÉTAIL — CORRIGER SI NÉCESSAIRE
            </p>
          </div>
          {STICKS.map((sk,i) => (
            <div key={sk.id} style={{...row,borderBottom:i<STICKS.length-1?"1px solid #f5f5f5":"none"}}>
              <StickVisual segs={sk.segs} sm/>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontSize:12,margin:0,fontWeight:500,overflow:"hidden",
                  textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{sk.label}</p>
                <p style={{fontSize:11,color:"#aaa",margin:"1px 0 0"}}>
                  {sk.pts} pts × {counts[sk.id]} = <strong style={{color:"#555"}}>{sk.pts*counts[sk.id]}</strong>
                </p>
              </div>
              <div style={{display:"flex",alignItems:"center",flexShrink:0}}>
                <button onClick={()=>adjust(sk.id,-1)} style={{width:34,height:34,
                  borderRadius:"8px 0 0 8px",border:"1px solid #ddd",background:"#fafafa",
                  fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",
                  justifyContent:"center",color:"#555"}}>−</button>
                <span style={{width:34,height:34,display:"flex",alignItems:"center",
                  justifyContent:"center",border:"1px solid #ddd",borderLeft:"none",
                  borderRight:"none",fontSize:15,fontWeight:700,color:"#222"}}>
                  {counts[sk.id]}
                </span>
                <button onClick={()=>adjust(sk.id,+1)} style={{width:34,height:34,
                  borderRadius:"0 8px 8px 0",border:"1px solid #ddd",background:"#fafafa",
                  fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",
                  justifyContent:"center",color:"#555"}}>+</button>
              </div>
            </div>
          ))}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
            padding:"11px 14px",borderTop:"1px solid #e8e8e8"}}>
            <span style={{fontWeight:700,fontSize:14}}>Total</span>
            <span style={{fontWeight:700,fontSize:17}}>{myScore} pts</span>
          </div>
        </div>

        <button onClick={reset} style={{width:"100%",padding:12,fontSize:14,borderRadius:12,
          border:"1px solid #ddd",background:"transparent",cursor:"pointer",color:"#444"}}>
          📸 Nouvelle photo
        </button>
      </>}

      {/* Reference table */}
      {!counts && !loading && <div style={card}>
        <div style={{padding:"10px 14px",borderBottom:"1px solid #f0f0f0"}}>
          <p style={{fontSize:11,fontWeight:700,color:"#999",letterSpacing:0.5,margin:0}}>
            VALEUR DES BAGUETTES
          </p>
        </div>
        {STICKS.map((sk,i) => (
          <div key={sk.id} style={{...row,borderBottom:i<STICKS.length-1?"1px solid #f5f5f5":"none"}}>
            <StickVisual segs={sk.segs}/>
            <div style={{flex:1}}>
              <p style={{fontSize:13,margin:0,fontWeight:500}}>{sk.label}</p>
            </div>
            <span style={{borderRadius:8,padding:"3px 10px",fontSize:13,fontWeight:600,
              background:"#f0f0f0",color:"#555",flexShrink:0}}>{sk.pts} pts</span>
          </div>
        ))}
      </div>}
    </div>
  );
}
