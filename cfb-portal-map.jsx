import { useState, useEffect, useRef, useMemo } from "react";

const FBS = new Set(["Air Force", "Akron", "Alabama", "App State", "Arizona", "Arizona State", "Arkansas", "Arkansas State", "Army", "Auburn", "BYU", "Ball State", "Baylor", "Boise State", "Boston College", "Bowling Green", "Buffalo", "California", "Central Michigan", "Charlotte", "Cincinnati", "Clemson", "Coastal Carolina", "Colorado", "Colorado State", "Duke", "East Carolina", "Eastern Michigan", "Florida", "Florida Atlantic", "Florida International", "Florida State", "Fresno State", "Georgia", "Georgia Southern", "Georgia State", "Georgia Tech", "Hawaii", "Houston", "Illinois", "Indiana", "Iowa", "Iowa State", "Jacksonville State", "Kansas", "Kansas State", "Kennesaw State", "Kent State", "Kentucky", "LSU", "Liberty", "Louisiana", "Louisville", "Marshall", "Maryland", "Memphis", "Miami", "Michigan", "Michigan State", "Middle Tennessee", "Minnesota", "Mississippi State", "Missouri", "NC State", "Navy", "Nebraska", "Nevada", "New Mexico", "New Mexico State", "North Carolina", "North Texas", "Northern Illinois", "Northwestern", "Notre Dame", "Ohio", "Ohio State", "Oklahoma", "Oklahoma State", "Old Dominion", "Ole Miss", "Oregon", "Penn State", "Pittsburgh", "Purdue", "Rice", "Rutgers", "SMU", "Sam Houston", "San Diego State", "South Alabama", "South Carolina", "South Florida", "Southern Miss", "Stanford", "Syracuse", "TCU", "Tennessee", "Texas", "Texas A&M", "Texas State", "Texas Tech", "Toledo", "Troy", "Tulane", "Tulsa", "UAB", "UCF", "UCLA", "UL Monroe", "UNLV", "USC", "UTEP", "UTSA", "Utah", "Utah State", "Vanderbilt", "Virginia", "Virginia Tech", "Wake Forest", "Washington", "West Virginia", "Western Kentucky", "Western Michigan", "Wisconsin", "Wyoming"]);

// ── THEME ─────────────────────────────────────────────────────────────────────
const C = {
  recruit:  "#E8A800",  // recruit gold
  xferIn:   "#3db87a",  // transfer in green
  xferOut:  "#e03b2e",  // transfer out red
  xferAll:  "#6da8d8",  // transfer (no school) blue
  bg:       "#0b1120",  // deep navy
  sidebar:  "#0e1627",  // navy sidebar
  card:     "#162035",  // card bg
  border:   "#243352",  // border
  text:     "#e8eef8",  // near-white
  muted:    "#7a8eaa",  // muted blue-gray
  accent:   "#e03b2e",  // ESPN red
  accentDim:"#8c1f19",  // dimmer red
};

// ── MAP TILE OPTIONS ──────────────────────────────────────────────────────────
const TILES = {
  standard: { label:"Standard", url:"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",                        attr:"© OpenStreetMap contributors" },
  light:    { label:"Light",    url:"https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",            attr:"© OpenStreetMap contributors © CARTO" },
  dark:     { label:"Dark",     url:"https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",             attr:"© OpenStreetMap contributors © CARTO" },
};

const POSITIONS = ["All","QB","RB","WR","TE","OT","IOL","DL","EDGE","LB","CB","S","ATH","K","P","LS","WDE","SDE","DT","ILB","OLB","OG","OC","FB","DUAL","PRO","APB"];


// ── STARS ─────────────────────────────────────────────────────────────────────
function Stars({ n }) {
  return <span>{[1,2,3,4,5].map(i=>(
    <span key={i} style={{color:i<=n?C.recruit:"#1e2e4a",fontSize:13}}>★</span>
  ))}</span>;
}

// ── STAT BOX ──────────────────────────────────────────────────────────────────
function StatBox({ val, label, color, wide }) {
  return (
    <div style={{
      background:C.bg, borderRadius:4, padding:"10px 12px",
      gridColumn:wide?"span 2":"span 1",
      borderLeft:`3px solid ${color}`,
      borderTop:`1px solid ${C.border}`,
      borderRight:`1px solid ${C.border}`,
      borderBottom:`1px solid ${C.border}`,
    }}>
      <div style={{fontSize:30,fontWeight:800,color,lineHeight:1,fontVariantNumeric:"tabular-nums",letterSpacing:-0.5}}>
        {String(val)}
      </div>
      <div style={{fontSize:13,letterSpacing:1.5,color:C.muted,textTransform:"uppercase",marginTop:6,fontWeight:600}}>{label}</div>
    </div>
  );
}

// ── PLAYER CARD ───────────────────────────────────────────────────────────────
function PlayerCard({ p, onClose, mobile }) {
  if (!p) return null;
  const isT = p.type === "transfer";
  return (
    <div style={{
      position:"absolute",
      ...(mobile ? {
        bottom:0, left:0, right:0, width:"auto",
        borderRadius:"8px 8px 0 0", padding:"16px 20px 24px",
      } : {
        bottom:20, right:20, width:280,
        borderRadius:6, padding:"16px 18px",
      }),
      zIndex:2000,
      background:C.card, border:`1px solid ${C.border}`,
      borderTop:`3px solid ${isT ? C.xferAll : C.recruit}`,
      boxShadow:"0 24px 60px rgba(0,0,0,.85)", fontFamily:"inherit",
      animation:"fu .15s ease",
    }}>
      <style>{`@keyframes fu{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
        <div>
          <div style={{fontSize:19,fontWeight:800,color:C.text,lineHeight:1.15,letterSpacing:0.2}}>{p.name}</div>
          <div style={{fontSize:12,letterSpacing:1.5,color:C.muted,marginTop:4,textTransform:"uppercase",fontWeight:600}}>
            {p.pos} · {isT ? "Transfer" : "2026 Recruit"}
          </div>
        </div>
        <button onClick={onClose}
          style={{background:"none",border:"none",cursor:"pointer",fontSize:20,lineHeight:1,padding:"2px 4px",color:C.muted}}>×</button>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,paddingBottom:12,borderBottom:`1px solid ${C.border}`}}>
        <Stars n={p.stars}/>
        {p.rating>0&&<span style={{fontSize:13,color:C.muted,fontWeight:500}}>{p.rating.toFixed(4)}</span>}
      </div>
      {isT ? (
        <div style={{fontSize:14,lineHeight:1.9,fontWeight:500}}>
          <div style={{display:"flex",gap:10,marginBottom:3}}>
            <span style={{color:C.xferOut,fontWeight:800,width:42,flexShrink:0,letterSpacing:1}}>FROM</span>
            <span style={{color:C.text}}>{p.origin||"—"}</span>
          </div>
          <div style={{display:"flex",gap:10,marginBottom:10}}>
            <span style={{color:C.xferIn,fontWeight:800,width:42,flexShrink:0,letterSpacing:1}}>TO</span>
            <span style={{color:C.text}}>{p.dest||"Undecided"}</span>
          </div>
          <div style={{color:C.muted,fontSize:13,fontWeight:500}}>{p.city}{p.state?`, ${p.state}`:""}{p.date?` · ${p.date}`:""}</div>
        </div>
      ) : (
        <div style={{fontSize:14,lineHeight:1.9,fontWeight:500}}>
          <div style={{display:"flex",gap:10,marginBottom:3}}>
            <span style={{color:C.recruit,fontWeight:800,width:60,flexShrink:0,letterSpacing:1}}>COMMIT</span>
            <span style={{color:C.text}}>{p.committedTo||"Uncommitted"}</span>
          </div>
          <div style={{color:C.muted,fontSize:13,fontWeight:500}}>{p.city}{p.state?`, ${p.state}`:""} · Class of {p.year}</div>
        </div>
      )}
    </div>
  );
}

// ── TOGGLE ────────────────────────────────────────────────────────────────────
function Toggle({ label, active, onToggle, color }) {
  return (
    <div onClick={onToggle} style={{
      display:"flex",alignItems:"center",gap:9,padding:"8px 10px",
      borderRadius:4,cursor:"pointer",marginBottom:4,userSelect:"none",
      background:active?"rgba(255,255,255,0.04)":"transparent",
      border:`1px solid ${active?C.border:"transparent"}`,
    }}>
      <div style={{
        width:9,height:9,borderRadius:"50%",flexShrink:0,
        background:active?color:C.border,
        boxShadow:active?`0 0 8px ${color}80`:"none",
      }}/>
      <span style={{fontSize:15,fontWeight:600,color:active?C.text:C.muted}}>{label}</span>
      <span style={{marginLeft:"auto",fontSize:13,letterSpacing:1,fontWeight:700,
        color:active?color:C.muted}}>{active?"ON":"OFF"}</span>
    </div>
  );
}

const SEL = {
  width:"100%",background:C.bg,border:`1px solid ${C.border}`,
  color:C.text,padding:"10px 12px",fontSize:15,borderRadius:4,
  cursor:"pointer",outline:"none",fontFamily:"inherit",fontWeight:500,
};
const LBL = {fontSize:13,letterSpacing:2,color:C.muted,textTransform:"uppercase",marginBottom:10,display:"block",fontWeight:700};
const SEC = (extra={}) => ({padding:"13px 14px",borderBottom:`1px solid ${C.border}`,...extra});

// ── RESPONSIVE ────────────────────────────────────────────────────────────────
function useWindowWidth() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return w;
}

// ── DIVBTN ────────────────────────────────────────────────────────────────────
function DivBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      flex:1,padding:"9px 4px",fontSize:13,letterSpacing:1.5,textTransform:"uppercase",fontWeight:700,
      background:active?C.accent:"transparent",
      color:active?"#fff":C.muted,
      border:`1px solid ${active?C.accent:C.border}`,
      borderRadius:3,cursor:"pointer",fontFamily:"inherit",
    }}>{label}</button>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function PortalFlow() {
  const mapRef        = useRef(null);
  const mapObj        = useRef(null);
  const markerLayer   = useRef(null);
  const rendererRef   = useRef(null);
  const tileLayerRef  = useRef(null);

  const [ready,      setReady]      = useState(false);
  const [picked,     setPicked]     = useState(null);
  const [school,     setSchool]     = useState("All");
  const [pos,        setPos]        = useState("All");
  const minStars = 0;
  const [division,   setDivision]   = useState("All");
  const [showR,      setShowR]      = useState(true);
  const [showT,      setShowT]      = useState(true);
  const [recruits,   setRecruits]   = useState([]);
  const [transfers,  setTransfers]  = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [mapStyle,   setMapStyle]   = useState("light");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const winW      = useWindowWidth();
  const isMobile  = winW < 640;
  const sidebarW  = winW < 640 ? 280 : winW < 1024 ? 220 : 300;

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
      const t = TILES["light"];
      tileLayerRef.current = L.tileLayer(t.url, { attribution: t.attr, maxZoom:19 }).addTo(map);
      L.control.zoom({position:"bottomright"}).addTo(map);

      markerLayer.current = L.layerGroup().addTo(map);
      mapObj.current = map;
      setReady(true);
    }
    init().catch(console.error);
  }, []);

  // ── SWAP TILE LAYER ──────────────────────────────────────────────────────────
  useEffect(() => {
    if(!ready || !mapObj.current || !tileLayerRef.current) return;
    const L = window.L;
    mapObj.current.removeLayer(tileLayerRef.current);
    const t = TILES[mapStyle];
    tileLayerRef.current = L.tileLayer(t.url, { attribution: t.attr, maxZoom:19 }).addTo(mapObj.current);
    tileLayerRef.current.bringToBack();
  }, [mapStyle, ready]);

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
    <div style={{display:"flex",height:"100vh",background:C.bg,fontFamily:"'Barlow Condensed','Barlow',-apple-system,sans-serif",color:C.text,overflow:"hidden"}}>

      {/* Mobile backdrop */}
      {isMobile&&drawerOpen&&(
        <div onClick={()=>setDrawerOpen(false)} style={{
          position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:2500,
        }}/>
      )}

      {/* ── SIDEBAR ─────────────────────────────────────────────────────────── */}
      <div style={{
        ...(isMobile ? {
          position:"fixed",top:0,left:0,height:"100%",zIndex:2600,
          transform:drawerOpen?"translateX(0)":"translateX(-100%)",
          transition:"transform 0.25s ease",
        } : {}),
        width:sidebarW,flexShrink:0,background:C.sidebar,
        borderRight:`1px solid ${C.border}`,display:"flex",
        flexDirection:"column",overflowY:"auto",
      }}>

      {isMobile&&(
        <button onClick={()=>setDrawerOpen(false)} style={{
          position:"absolute",top:12,right:12,background:"none",border:"none",
          cursor:"pointer",fontSize:22,lineHeight:1,color:C.muted,padding:"2px 6px",
        }}>×</button>
      )}

        {/* Logo */}
        <div style={{padding:"18px 16px 14px",borderBottom:`1px solid ${C.border}`}}>
          <div style={{display:"flex",alignItems:"baseline",gap:0,marginBottom:4}}>
            <span style={{fontSize:28,fontWeight:800,color:C.text,letterSpacing:0}}>Portal</span>
            <span style={{fontSize:28,fontWeight:800,color:C.accent,letterSpacing:0}}>Flow</span>
          </div>
          <div style={{width:40,height:3,background:C.accent,borderRadius:2,marginBottom:8}}/>
          <div style={{fontSize:12,color:C.muted,letterSpacing:2,fontWeight:700,textTransform:"uppercase"}}>CFB Recruiting &amp; Transfer Portal</div>
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

        {/* Position */}
        <div style={SEC()}>
          <span style={LBL}>Position</span>
          <select style={SEL} value={pos} onChange={e=>setPos(e.target.value)}>
            {POSITIONS.map(p=><option key={p} value={p}>{p}</option>)}
          </select>
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
          <div style={{fontSize:12,lineHeight:2.2,color:C.muted}}>
            {[
              [C.recruit, "Recruit — 2026 class hometown"],
              [C.xferIn,  "Transfer In  (green = arriving)"],
              [C.xferOut, "Transfer Out (red = departing)"],
              [C.xferAll, "Transfer — no school selected"],
            ].map(([col,lbl])=>(
              <div key={lbl} style={{display:"flex",alignItems:"center",gap:9}}>
                <div style={{width:10,height:10,borderRadius:"50%",background:col,flexShrink:0,boxShadow:`0 0 6px ${col}60`}}/>
                <span style={{color:C.text,fontSize:14,fontWeight:500}}>{lbl}</span>
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
            display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:18}}>
            <div>
              <div style={{fontSize:36,fontWeight:800,lineHeight:1,textAlign:"center"}}>
                <span style={{color:C.text}}>Portal</span><span style={{color:C.accent}}>Flow</span>
              </div>
              <div style={{width:48,height:3,background:C.accent,borderRadius:2,margin:"8px auto 0"}}/>
            </div>
            <div style={{width:200,height:3,background:C.border,borderRadius:2,overflow:"hidden"}}>
              <div style={{height:"100%",background:`linear-gradient(90deg,${C.accent},${C.recruit})`,
                animation:"ld 1.2s ease infinite alternate",borderRadius:2}}/>
            </div>
            <style>{`@keyframes ld{from{width:10%}to{width:95%}}`}</style>
            <div style={{fontSize:11,color:C.muted,letterSpacing:2,fontWeight:700,textTransform:"uppercase"}}>Loading Map...</div>
          </div>
        )}

        {/* Hamburger (mobile) */}
        {ready&&isMobile&&(
          <button onClick={()=>setDrawerOpen(true)} style={{
            position:"absolute",top:12,left:12,zIndex:1000,
            background:"rgba(11,17,32,0.90)",border:`1px solid ${C.border}`,
            borderRadius:5,padding:"7px 12px",cursor:"pointer",color:C.text,
            fontSize:18,lineHeight:1,backdropFilter:"blur(6px)",
          }}>&#9776;</button>
        )}

        {/* Map style picker */}
        {ready&&(
          <div style={{position:"absolute",bottom:isMobile?70:24,left:12,zIndex:1000,
            background:"rgba(11,17,32,0.90)",border:`1px solid ${C.border}`,
            borderRadius:5,padding:"6px 8px",backdropFilter:"blur(6px)",
            display:"flex",gap:5}}>
            {Object.entries(TILES).map(([key,{label}])=>(
              <button key={key} onClick={()=>setMapStyle(key)} style={{
                padding:"5px 10px",fontSize:12,letterSpacing:1,textTransform:"uppercase",fontWeight:700,
                background:mapStyle===key?C.accent:"transparent",
                color:mapStyle===key?"#fff":C.muted,
                border:`1px solid ${mapStyle===key?C.accent:C.border}`,
                borderRadius:3,cursor:"pointer",fontFamily:"inherit",
              }}>{label}</button>
            ))}
          </div>
        )}

        {/* Count badge + Refresh */}
        {ready&&(
          <div style={{position:"absolute",top:12,right:12,zIndex:1000,
            background:"rgba(11,17,32,0.90)",border:`1px solid ${C.border}`,
            borderRadius:5,padding:"8px 16px",backdropFilter:"blur(6px)",
            display:"flex",gap:isMobile?10:18,alignItems:"center"}}>
            {!isMobile&&school!=="All"&&<span style={{color:C.accent,fontWeight:800,fontSize:14,letterSpacing:0.3}}>{school}</span>}
            <span>
              <span style={{color:C.recruit,fontWeight:800,fontSize:14}}>{stats.r.toLocaleString()}</span>
              <span style={{color:C.muted,fontSize:11,marginLeft:5,fontWeight:600}}>{isMobile?"R":"Recruits"}</span>
            </span>
            <span>
              <span style={{color:C.xferAll,fontWeight:800,fontSize:14}}>{stats.tTotal.toLocaleString()}</span>
              <span style={{color:C.muted,fontSize:11,marginLeft:5,fontWeight:600}}>{isMobile?"T":"Transfers"}</span>
            </span>
            {!isMobile&&(
              <button onClick={()=>loadData(true)} disabled={refreshing} style={{
                background:"transparent",border:`1px solid ${C.border}`,borderRadius:3,
                color:refreshing?C.muted:C.accent,cursor:refreshing?"default":"pointer",
                fontSize:12,letterSpacing:1,padding:"4px 10px",fontFamily:"inherit",
                textTransform:"uppercase",fontWeight:700,
              }}>{refreshing?"...":" Refresh"}</button>
            )}
          </div>
        )}

        <PlayerCard p={picked} onClose={()=>setPicked(null)} mobile={isMobile}/>
      </div>
    </div>
  );
}
