import { useState, useEffect, useRef, useMemo } from "react";

const FBS = new Set(["Air Force", "Akron", "Alabama", "App State", "Arizona", "Arizona State", "Arkansas", "Arkansas State", "Army", "Auburn", "BYU", "Ball State", "Baylor", "Boise State", "Boston College", "Bowling Green", "Buffalo", "California", "Central Michigan", "Charlotte", "Cincinnati", "Clemson", "Coastal Carolina", "Colorado", "Colorado State", "Duke", "East Carolina", "Eastern Michigan", "Florida", "Florida Atlantic", "Florida International", "Florida State", "Fresno State", "Georgia", "Georgia Southern", "Georgia State", "Georgia Tech", "Hawaii", "Houston", "Illinois", "Indiana", "Iowa", "Iowa State", "Jacksonville State", "Kansas", "Kansas State", "Kennesaw State", "Kent State", "Kentucky", "LSU", "Liberty", "Louisiana", "Louisville", "Marshall", "Maryland", "Memphis", "Miami", "Michigan", "Michigan State", "Middle Tennessee", "Minnesota", "Mississippi State", "Missouri", "NC State", "Navy", "Nebraska", "Nevada", "New Mexico", "New Mexico State", "North Carolina", "North Texas", "Northern Illinois", "Northwestern", "Notre Dame", "Ohio", "Ohio State", "Oklahoma", "Oklahoma State", "Old Dominion", "Ole Miss", "Oregon", "Penn State", "Pittsburgh", "Purdue", "Rice", "Rutgers", "SMU", "Sam Houston", "San Diego State", "South Alabama", "South Carolina", "South Florida", "Southern Miss", "Stanford", "Syracuse", "TCU", "Tennessee", "Texas", "Texas A&M", "Texas State", "Texas Tech", "Toledo", "Troy", "Tulane", "Tulsa", "UAB", "UCF", "UCLA", "UL Monroe", "UNLV", "USC", "UTEP", "UTSA", "Utah", "Utah State", "Vanderbilt", "Virginia", "Virginia Tech", "Wake Forest", "Washington", "West Virginia", "Western Kentucky", "Western Michigan", "Wisconsin", "Wyoming"]);

// ── THEME ─────────────────────────────────────────────────────────────────────
const C = {
  recruit:  "#C8A96E",
  xferIn:   "#4D9E6A",
  xferOut:  "#B85C4A",
  xferAll:  "#7A8FA6",
  bg:       "#0e1008",
  sidebar:  "#111408",
  card:     "#181c0e",
  border:   "#2a2e1a",
  text:     "#d4cdb8",
  muted:    "#5a5e48",
  accent:   "#C8A96E",
  accentDim:"#7a6540",
};

const POSITIONS = ["All","QB","RB","WR","TE","OT","IOL","DL","EDGE","LB","CB","S","ATH","K","P","LS","WDE","SDE","DT","ILB","OLB","OG","OC","FB","DUAL","PRO","APB"];


// ── STARS ─────────────────────────────────────────────────────────────────────
function Stars({ n }) {
  return <span>{[1,2,3,4,5].map(i=>(
    <span key={i} style={{color:i<=n?"#C8A96E":"#2a2e1a",fontSize:13}}>★</span>
  ))}</span>;
}

// ── STAT BOX ──────────────────────────────────────────────────────────────────
function StatBox({ val, label, color, wide }) {
  return (
    <div style={{
      background:C.bg, borderRadius:5, padding:"10px 12px",
      gridColumn:wide?"span 2":"span 1",
      borderLeft:`3px solid ${color}`,
      borderTop:`1px solid ${C.border}`,
      borderRight:`1px solid ${C.border}`,
      borderBottom:`1px solid ${C.border}`,
    }}>
      <div style={{fontSize:22,fontWeight:700,color,lineHeight:1,fontVariantNumeric:"tabular-nums",letterSpacing:-0.5}}>
        {String(val)}
      </div>
      <div style={{fontSize:8,letterSpacing:2.5,color:C.muted,textTransform:"uppercase",marginTop:4}}>{label}</div>
    </div>
  );
}

// ── PLAYER CARD ───────────────────────────────────────────────────────────────
function PlayerCard({ p, onClose }) {
  if (!p) return null;
  const isT = p.type === "transfer";
  return (
    <div style={{
      position:"absolute", bottom:20, right:20, zIndex:2000,
      width:260, background:C.card, border:`1px solid ${C.border}`,
      borderRadius:8, padding:"16px 18px",
      boxShadow:"0 20px 50px rgba(0,0,0,.9)", fontFamily:"inherit",
      animation:"fu .15s ease",
    }}>
      <style>{`@keyframes fu{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
        <div>
          <div style={{fontSize:14,fontWeight:700,color:C.text,lineHeight:1.2}}>{p.name}</div>
          <div style={{fontSize:9,letterSpacing:2,color:C.accentDim,marginTop:3,textTransform:"uppercase"}}>
            {p.pos} · {isT ? "TRANSFER" : "2026 RECRUIT"}
          </div>
        </div>
        <button onClick={onClose}
          style={{background:"none",border:"none",cursor:"pointer",fontSize:20,lineHeight:1,padding:0,color:C.muted}}>×</button>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,paddingBottom:12,borderBottom:`1px solid ${C.border}`}}>
        <Stars n={p.stars}/>
        {p.rating>0&&<span style={{fontSize:11,color:C.muted}}>{p.rating.toFixed(4)}</span>}
      </div>
      {isT ? (
        <div style={{fontSize:11,lineHeight:2}}>
          <div style={{display:"flex",gap:10,marginBottom:4}}>
            <span style={{color:C.xferOut,fontWeight:700,width:34,flexShrink:0}}>FROM</span>
            <span style={{color:C.text}}>{p.origin||"—"}</span>
          </div>
          <div style={{display:"flex",gap:10,marginBottom:10}}>
            <span style={{color:C.xferIn,fontWeight:700,width:34,flexShrink:0}}>TO</span>
            <span style={{color:C.text}}>{p.dest||"Undecided"}</span>
          </div>
          <div style={{color:C.muted,fontSize:10}}>{p.city}{p.state?`, ${p.state}`:""}{p.date?` · ${p.date}`:""}</div>
        </div>
      ) : (
        <div style={{fontSize:11,lineHeight:2}}>
          <div style={{display:"flex",gap:10,marginBottom:4}}>
            <span style={{color:C.accent,fontWeight:700,width:56,flexShrink:0}}>COMMIT</span>
            <span style={{color:C.text}}>{p.committedTo||"Uncommitted"}</span>
          </div>
          <div style={{color:C.muted,fontSize:10}}>{p.city}{p.state?`, ${p.state}`:""} · Class of {p.year}</div>
        </div>
      )}
    </div>
  );
}

// ── TOGGLE ────────────────────────────────────────────────────────────────────
function Toggle({ label, active, onToggle, color }) {
  return (
    <div onClick={onToggle} style={{
      display:"flex",alignItems:"center",gap:9,padding:"7px 10px",
      borderRadius:4,cursor:"pointer",marginBottom:4,userSelect:"none",
      background:active?"#181c0e":"transparent",
      border:`1px solid ${active?C.border:"transparent"}`,
    }}>
      <div style={{
        width:8,height:8,borderRadius:"50%",flexShrink:0,
        background:active?color:C.border,
        boxShadow:active?`0 0 7px ${color}70`:"none",
      }}/>
      <span style={{fontSize:11,color:active?C.text:C.muted}}>{label}</span>
      <span style={{marginLeft:"auto",fontSize:8,letterSpacing:1.5,
        color:active?C.accentDim:C.muted}}>{active?"ON":"OFF"}</span>
    </div>
  );
}

const SEL = {
  width:"100%",background:C.bg,border:`1px solid ${C.border}`,
  color:C.text,padding:"7px 9px",fontSize:11,borderRadius:4,
  cursor:"pointer",outline:"none",fontFamily:"inherit",
};
const LBL = {fontSize:8,letterSpacing:3,color:C.muted,textTransform:"uppercase",marginBottom:7,display:"block"};
const SEC = (extra={}) => ({padding:"12px 14px",borderBottom:`1px solid ${C.border}`,...extra});

// ── DIVBTN ────────────────────────────────────────────────────────────────────
function DivBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      flex:1,padding:"6px 4px",fontSize:9,letterSpacing:2,textTransform:"uppercase",
      background:active?C.accentDim:"transparent",
      color:active?C.text:C.muted,
      border:`1px solid ${active?C.accentDim:C.border}`,
      borderRadius:3,cursor:"pointer",fontFamily:"inherit",
    }}>{label}</button>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function PortalFlow() {
  const mapRef      = useRef(null);
  const mapObj      = useRef(null);
  const markerLayer = useRef(null);
  const rendererRef = useRef(null);

  const [ready,      setReady]      = useState(false);
  const [zoom,       setZoom]       = useState(4);
  const [picked,     setPicked]     = useState(null);
  const [school,     setSchool]     = useState("All");
  const [pos,        setPos]        = useState("All");
  const [minStars,   setMinStars]   = useState(0);
  const [division,   setDivision]   = useState("All");
  const [showR,      setShowR]      = useState(true);
  const [showT,      setShowT]      = useState(true);
  const [recruits,   setRecruits]   = useState([]);
  const [transfers,  setTransfers]  = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // ── LOAD DATA ───────────────────────────────────────────────────────────────
  const loadData = (bust = false) => {
    setRefreshing(true);
    const ts = bust ? `?t=${Date.now()}` : "";
    const base = import.meta.env.BASE_URL;
    Promise.all([
      fetch(`${base}data/recruits.json${ts}`).then(r => r.json()),
      fetch(`${base}data/transfers.json${ts}`).then(r => r.json()),
    ]).then(([r, t]) => {
      setRecruits(r);
      setTransfers(t);
    }).catch(console.error).finally(() => setRefreshing(false));
  };

  useEffect(() => { loadData(); }, []);

  const schools = useMemo(() => {
    const s = new Set(["All"]);
    recruits.forEach(r => { if(r.committedTo) s.add(r.committedTo); });
    transfers.forEach(t => { if(t.origin) s.add(t.origin); if(t.dest) s.add(t.dest); });
    let list = Array.from(s);
    if(division === "FBS") list = list.filter(x => x === "All" || FBS.has(x));
    if(division === "FCS") list = list.filter(x => x === "All" || !FBS.has(x));
    return list.sort((a, b) => a === "All" ? -1 : a.localeCompare(b));
  }, [division, recruits, transfers]);

  useEffect(() => {
    if(school !== "All" && !schools.includes(school)) setSchool("All");
  }, [schools]);

  const filteredR = useMemo(() => {
    if(!showR) return [];
    return recruits.filter(r =>
      (school === "All" || r.committedTo === school) &&
      (pos === "All" || r.pos === pos) &&
      r.stars >= minStars &&
      (division === "All" || (division === "FBS"
        ? FBS.has(r.committedTo)
        : (r.committedTo && !FBS.has(r.committedTo))))
    );
  }, [school, pos, minStars, division, showR, recruits]);

  const filteredT = useMemo(() => {
    if(!showT) return [];
    return transfers.filter(t =>
      (school === "All" || t.origin === school || t.dest === school) &&
      (pos === "All" || t.pos === pos) &&
      t.stars >= minStars &&
      (division === "All" || (division === "FBS"
        ? (FBS.has(t.origin) || FBS.has(t.dest))
        : (!FBS.has(t.origin) || !FBS.has(t.dest))))
    );
  }, [school, pos, minStars, division, showT, transfers]);

  const stats = useMemo(() => {
    const isAll = school === "All";
    const tIn  = isAll ? filteredT : filteredT.filter(t => t.dest === school);
    const tOut = isAll ? [] : filteredT.filter(t => t.origin === school && t.dest !== school);
    const net  = tIn.length - tOut.length;
    return { r: filteredR.length, tTotal: filteredT.length, tIn: tIn.length, tOut: tOut.length, net };
  }, [filteredR, filteredT, school]);

  // ── INIT MAP ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if(mapObj.current || !mapRef.current) return;
    const load = (tag, attrs) => new Promise((res, rej) => {
      const sel = tag === "link" ? `link[href="${attrs.href}"]` : `script[src="${attrs.src}"]`;
      if(document.querySelector(sel)) { res(); return; }
      const el = document.createElement(tag);
      Object.assign(el, attrs);
      el.onload = res; el.onerror = rej;
      document.head.appendChild(el);
    });
    async function init() {
      await load("script", {src:"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"});
      if(!mapRef.current || mapObj.current) return;
      const L = window.L;
      rendererRef.current = L.canvas({ padding: 0.5 });
      const map = L.map(mapRef.current, {center:[38.5,-96], zoom:4, zoomControl:false, preferCanvas:true, renderer:rendererRef.current});
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:"© OpenStreetMap contributors", maxZoom:19,
      }).addTo(map);
      L.control.zoom({position:"bottomright"}).addTo(map);
      map.on("zoomend", () => setZoom(map.getZoom()));
      markerLayer.current = L.layerGroup().addTo(map);
      mapObj.current = map;
      setReady(true);
    }
    init().catch(console.error);
  }, []);

  // ── RENDER MARKERS ───────────────────────────────────────────────────────────
  useEffect(() => {
    if(!ready || !mapObj.current) return;
    const L = window.L;
    markerLayer.current.clearLayers();

    const rPts = filteredR.filter(r => r.lat && r.lon);
    const tPts = filteredT.filter(t => t.lat && t.lon);

    const tColor = (t) => {
      if(school === "All") return C.xferAll;
      if(t.dest === school) return C.xferIn;
      return C.xferOut;
    };

    const renderer = rendererRef.current;
    rPts.forEach(r => {
      const m = L.circleMarker([r.lat, r.lon], {renderer, radius:5, fillColor:C.recruit, color:"rgba(255,255,255,0.15)", weight:1, fillOpacity:0.85});
      m.on("click", () => setPicked(r));
      markerLayer.current.addLayer(m);
    });
    tPts.forEach(t => {
      const m = L.circleMarker([t.lat, t.lon], {renderer, radius:5, fillColor:tColor(t), color:"rgba(255,255,255,0.15)", weight:1, fillOpacity:0.85});
      m.on("click", () => setPicked(t));
      markerLayer.current.addLayer(m);
    });
  }, [ready, filteredR, filteredT, school]);

  const netColor = stats.net > 0 ? C.xferIn : stats.net < 0 ? C.xferOut : C.muted;

  return (
    <div style={{display:"flex",height:"100vh",background:C.bg,fontFamily:"'DM Mono',monospace,'Courier New'",color:C.text,overflow:"hidden"}}>

      {/* ── SIDEBAR ─────────────────────────────────────────────────────────── */}
      <div style={{width:268,flexShrink:0,background:C.sidebar,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",overflowY:"auto"}}>

        {/* Logo */}
        <div style={{padding:"18px 16px 14px",borderBottom:`1px solid ${C.border}`}}>
          <div style={{display:"flex",alignItems:"baseline",gap:0,marginBottom:5}}>
            <span style={{fontSize:24,fontWeight:800,color:C.text,letterSpacing:-1}}>Portal</span>
            <span style={{fontSize:24,fontWeight:800,color:C.accent,letterSpacing:-1}}>Flow</span>
          </div>
          <div style={{fontSize:8,color:C.muted,letterSpacing:3}}>CFB RECRUITING &amp; TRANSFER PORTAL</div>
          <div style={{marginTop:10,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:7,fontSize:9,color:C.muted}}>
              <div style={{width:5,height:5,borderRadius:"50%",background:C.muted}}/>
              MARKERS · ZOOM {zoom}
            </div>
            <button onClick={()=>loadData(true)} disabled={refreshing} style={{
              background:"transparent",border:`1px solid ${C.border}`,borderRadius:3,
              color:refreshing?C.muted:C.accent,cursor:refreshing?"default":"pointer",
              fontSize:8,letterSpacing:1.5,padding:"3px 7px",fontFamily:"inherit",
              textTransform:"uppercase",
            }}>{refreshing?"..." : "Refresh"}</button>
          </div>
        </div>

        {/* Division */}
        <div style={SEC()}>
          <span style={LBL}>Division</span>
          <div style={{display:"flex",gap:5}}>
            {["All","FBS","FCS"].map(v=>(
              <DivBtn key={v} val={v} label={v} active={division===v} onClick={()=>setDivision(v)}/>
            ))}
          </div>
        </div>

        {/* School */}
        <div style={SEC()}>
          <span style={LBL}>School</span>
          <select style={SEL} value={school} onChange={e=>setSchool(e.target.value)}>
            {schools.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Position + Stars */}
        <div style={SEC()}>
          <span style={LBL}>Position</span>
          <select style={{...SEL,marginBottom:14}} value={pos} onChange={e=>setPos(e.target.value)}>
            {POSITIONS.map(p=><option key={p} value={p}>{p}</option>)}
          </select>
          <span style={LBL}>Min Stars{minStars>0?" — "+"★".repeat(minStars):""}</span>
          <input type="range" min={0} max={5} step={1} value={minStars}
            onChange={e=>setMinStars(Number(e.target.value))}
            style={{width:"100%",accentColor:C.accent}}/>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:C.muted,marginTop:2}}>
            <span>Any</span><span>★★★★★</span>
          </div>
        </div>

        {/* Layers */}
        <div style={SEC()}>
          <span style={LBL}>Layers</span>
          <Toggle label={`2026 Recruits  ${stats.r.toLocaleString()}`}  active={showR} onToggle={()=>setShowR(v=>!v)} color={C.recruit}/>
          <Toggle label={`Transfers  ${stats.tTotal.toLocaleString()}`} active={showT} onToggle={()=>setShowT(v=>!v)} color={C.xferAll}/>
        </div>

        {/* Legend */}
        <div style={SEC()}>
          <span style={LBL}>Legend</span>
          <div style={{fontSize:10,lineHeight:2.3,color:C.muted}}>
            {[
              [C.recruit, "Recruit — 2026 class hometown"],
              [C.xferIn,  "Transfer In  (green = arriving)"],
              [C.xferOut, "Transfer Out (red = departing)"],
              [C.xferAll, "Transfer — no school selected"],
            ].map(([col,lbl])=>(
              <div key={lbl} style={{display:"flex",alignItems:"center",gap:9}}>
                <div style={{width:9,height:9,borderRadius:"50%",background:col,flexShrink:0,border:"1.5px solid rgba(255,255,255,.15)"}}/>
                <span style={{color:C.text,fontSize:10}}>{lbl}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div style={{padding:"12px 14px"}}>
          <span style={LBL}>{school==="All"?"All Schools":school}</span>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
            <StatBox val={stats.r.toLocaleString()}      label="2026 Recruits"   color={C.recruit}/>
            <StatBox val={stats.tTotal.toLocaleString()}  label="Total Transfers" color={C.xferAll}/>
            <StatBox val={stats.tIn.toLocaleString()}     label="Transfers In"    color={C.xferIn}/>
            <StatBox val={stats.tOut.toLocaleString()}    label="Transfers Out"   color={C.xferOut}/>
            {school!=="All"&&(
              <StatBox
                val={(stats.net>0?"+":"")+stats.net}
                label="Net Portal"
                color={netColor}
                wide={true}
              />
            )}
          </div>
        </div>

      </div>

      {/* ── MAP ──────────────────────────────────────────────────────────────── */}
      <div style={{flex:1,position:"relative"}}>
        <div ref={mapRef} style={{width:"100%",height:"100%"}}/>

        {!ready&&(
          <div style={{position:"absolute",inset:0,background:C.bg,zIndex:9999,
            display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
            <div style={{fontSize:28,fontWeight:800,letterSpacing:-1}}>
              <span style={{color:C.text}}>Portal</span><span style={{color:C.accent}}>Flow</span>
            </div>
            <div style={{width:200,height:2,background:C.border,borderRadius:2,overflow:"hidden"}}>
              <div style={{height:"100%",background:`linear-gradient(90deg,${C.accent},${C.xferIn})`,
                animation:"ld 1.2s ease infinite alternate",borderRadius:2}}/>
            </div>
            <style>{`@keyframes ld{from{width:10%}to{width:95%}}`}</style>
            <div style={{fontSize:9,color:C.muted,letterSpacing:3}}>LOADING MAP ENGINE...</div>
          </div>
        )}

        {/* Mode badge */}
        {ready&&(
          <div style={{position:"absolute",top:12,left:12,zIndex:1000,
            background:"rgba(17,20,8,.92)",border:`1px solid ${C.border}`,
            borderRadius:4,padding:"5px 12px",fontSize:9,letterSpacing:2,
            color:C.muted,backdropFilter:"blur(4px)",textTransform:"uppercase"}}>
            ● MARKERS · Z{zoom}
          </div>
        )}

        {/* Count badge */}
        {ready&&(
          <div style={{position:"absolute",top:12,right:12,zIndex:1000,
            background:"rgba(17,20,8,.92)",border:`1px solid ${C.border}`,
            borderRadius:4,padding:"6px 14px",fontSize:10,backdropFilter:"blur(4px)",
            display:"flex",gap:16,alignItems:"center"}}>
            {school!=="All"&&<span style={{color:C.accent,fontWeight:700,fontSize:11}}>{school}</span>}
            <span>
              <span style={{color:C.recruit,fontWeight:700}}>{stats.r.toLocaleString()}</span>
              <span style={{color:C.muted,fontSize:9,marginLeft:4}}>recruits</span>
            </span>
            <span>
              <span style={{color:C.xferAll,fontWeight:700}}>{stats.tTotal.toLocaleString()}</span>
              <span style={{color:C.muted,fontSize:9,marginLeft:4}}>transfers</span>
            </span>
          </div>
        )}

        <PlayerCard p={picked} onClose={()=>setPicked(null)}/>
      </div>
    </div>
  );
}
