import { useState } from "react";

const SECTIONS = [
  { id: "overview", label: "Architecture Overview" },
  { id: "directory", label: "Directory Structure" },
  { id: "ingestion", label: "Data Ingestion" },
  { id: "models", label: "DB Schema" },
  { id: "api", label: "FastAPI Routes" },
  { id: "geojson", label: "GeoJSON Output" },
  { id: "frontend", label: "React Frontend" },
  { id: "leaflet", label: "Leaflet Map" },
  { id: "flows", label: "Transfer Flows" },
  { id: "scaling", label: "Scaling Strategy" },
];

const CODE = {
  directory: `cfb-recruiting-map/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                  # FastAPI app entry point
│   │   ├── config.py                # Settings / env vars
│   │   ├── database.py              # SQLite engine + session factory
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── recruit.py           # SQLAlchemy ORM model
│   │   │   ├── transfer.py
│   │   │   └── school.py            # School coordinates lookup
│   │   ├── schemas/
│   │   │   ├── recruit.py           # Pydantic response models
│   │   │   └── transfer.py
│   │   ├── routers/
│   │   │   ├── recruits.py          # /recruits endpoints
│   │   │   ├── transfers.py         # /transfers + /transfer-flows
│   │   │   └── schools.py           # /schools
│   │   ├── services/
│   │   │   ├── geo_service.py       # GeoDataFrame helpers
│   │   │   └── filter_service.py    # Shared query filter logic
│   │   └── ingestion/
│   │       ├── __init__.py
│   │       ├── cfbd_client.py       # CollegeFootballData API wrapper
│   │       ├── ingest_recruits.py   # Pull + store recruit data
│   │       ├── ingest_transfers.py  # Pull + store transfer data
│   │       └── geocode_schools.py   # Resolve school lat/lng
├── data/
│   ├── cfb_recruiting.db            # SQLite database
│   └── schools_coords.csv           # School coordinates seed file
├── scripts/
│   ├── seed_db.py                   # One-time DB init + seed
│   └── weekly_update.py             # Cron-ready refresh script
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── map/
│   │   │   │   ├── MapContainer.tsx      # Leaflet map root
│   │   │   │   ├── RecruitsLayer.tsx     # Recruit markers
│   │   │   │   ├── TransfersLayer.tsx    # Transfer markers
│   │   │   │   ├── FlowLinesLayer.tsx    # Arc polylines
│   │   │   │   └── PlayerPopup.tsx       # Popup card
│   │   │   ├── filters/
│   │   │   │   ├── FilterPanel.tsx       # School/year/stars filters
│   │   │   │   └── useFilters.ts         # Filter state hook
│   │   │   └── comparison/
│   │   │       ├── ComparisonPanel.tsx   # Two-school compare
│   │   │       └── StatsCard.tsx
│   │   ├── hooks/
│   │   │   ├── useRecruits.ts
│   │   │   ├── useTransfers.ts
│   │   │   └── useTransferFlows.ts
│   │   ├── types/
│   │   │   └── index.ts              # Shared TypeScript types
│   │   ├── api/
│   │   │   └── client.ts             # Axios/fetch API wrapper
│   │   └── utils/
│   │       ├── starRating.ts
│   │       └── colorScale.ts
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── .env
├── requirements.txt
└── README.md`,

  ingestion: `# backend/app/ingestion/cfbd_client.py
import httpx
from typing import Any
from app.config import settings

class CFBDClient:
    BASE_URL = "https://api.collegefootballdata.com"

    def __init__(self):
        self.headers = {
            "Authorization": f"Bearer {settings.CFBD_API_KEY}",
            "Accept": "application/json",
        }

    def get(self, path: str, params: dict = {}) -> list[dict]:
        url = f"{self.BASE_URL}{path}"
        with httpx.Client(timeout=30) as client:
            resp = client.get(url, headers=self.headers, params=params)
            resp.raise_for_status()
            return resp.json()

    def get_recruits(self, year: int) -> list[dict]:
        return self.get("/recruiting/players", {"year": year})

    def get_transfers(self, year: int) -> list[dict]:
        return self.get("/player/portal", {"year": year})


# backend/app/ingestion/ingest_recruits.py
import pandas as pd
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.recruit import Recruit
from app.ingestion.cfbd_client import CFBDClient

def parse_hometown(hometown_str: str) -> tuple[float | None, float | None]:
    """Parse the {'latitude': '...', 'longitude': '...'} dict string."""
    try:
        import ast
        d = ast.literal_eval(hometown_str)
        return float(d.get("latitude", 0)), float(d.get("longitude", 0))
    except Exception:
        return None, None

def ingest_recruits(years: list[int]):
    client = CFBDClient()
    db: Session = SessionLocal()
    rows = []

    for year in years:
        data = client.get_recruits(year)
        for p in data:
            lat, lon = parse_hometown(str(p.get("hometownInfo", "")))
            rows.append(Recruit(
                athlete_id=p.get("athleteId"),
                recruit_type=p.get("recruitType"),
                year=p.get("year"),
                ranking=p.get("ranking"),
                name=p.get("name"),
                school=p.get("school"),
                committed_to=p.get("committedTo"),
                position=p.get("position"),
                height=p.get("height"),
                weight=p.get("weight"),
                stars=p.get("stars"),
                rating=p.get("rating"),
                city=p.get("city"),
                state=p.get("stateProvince"),
                country=p.get("country"),
                latitude=lat,
                longitude=lon,
            ))

    db.bulk_save_objects(rows)
    db.commit()
    db.close()
    print(f"Ingested {len(rows)} recruits")`,

  models: `# backend/app/models/recruit.py
from sqlalchemy import Column, Integer, String, Float, Index
from app.database import Base

class Recruit(Base):
    __tablename__ = "recruits"

    id = Column(Integer, primary_key=True, autoincrement=True)
    athlete_id = Column(Integer, index=True)
    recruit_type = Column(String)       # HighSchool | JUCO | PrepSchool
    year = Column(Integer, index=True)
    ranking = Column(Integer)
    name = Column(String, index=True)
    school = Column(String)             # High school
    committed_to = Column(String, index=True)
    position = Column(String, index=True)
    height = Column(Float)
    weight = Column(Integer)
    stars = Column(Integer, index=True)
    rating = Column(Float)
    city = Column(String)
    state = Column(String)
    country = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)

    __table_args__ = (
        Index("ix_recruits_year_school", "year", "committed_to"),
    )


# backend/app/models/transfer.py
from sqlalchemy import Column, Integer, String, Float, DateTime, Index
from app.database import Base

class Transfer(Base):
    __tablename__ = "transfers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    season = Column(Integer, index=True)
    name = Column(String, index=True)
    position = Column(String, index=True)
    origin = Column(String, index=True)
    destination = Column(String, index=True)
    transfer_date = Column(DateTime)
    rating = Column(Float)
    stars = Column(Integer, index=True)
    eligibility = Column(String)
    # Origin school coordinates
    origin_lat = Column(Float)
    origin_lon = Column(Float)
    # Destination school coordinates
    dest_lat = Column(Float)
    dest_lon = Column(Float)

    __table_args__ = (
        Index("ix_transfers_season_dest", "season", "destination"),
        Index("ix_transfers_season_origin", "season", "origin"),
    )


# backend/app/models/school.py
from sqlalchemy import Column, Integer, String, Float
from app.database import Base

class School(Base):
    __tablename__ = "schools"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, unique=True, index=True)
    abbreviation = Column(String)
    conference = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)`,

  api: `# backend/app/routers/recruits.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.recruit import Recruit
from app.services.geo_service import to_point_geojson

router = APIRouter(prefix="/recruits", tags=["recruits"])

@router.get("")
def get_recruits(
    school: str | None = Query(None),
    year: int | None = Query(None),
    stars: int | None = Query(None),       # minimum stars
    position: str | None = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Recruit).filter(
        Recruit.latitude.isnot(None),
        Recruit.longitude.isnot(None),
    )
    if school:
        q = q.filter(Recruit.committed_to.ilike(f"%{school}%"))
    if year:
        q = q.filter(Recruit.year == year)
    if stars:
        q = q.filter(Recruit.stars >= stars)
    if position:
        q = q.filter(Recruit.position.ilike(f"%{position}%"))

    results = q.limit(2000).all()
    return to_point_geojson(results, "recruit")


# backend/app/routers/transfers.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.transfer import Transfer
from app.services.geo_service import to_point_geojson, to_linestring_geojson

router = APIRouter(prefix="/transfers", tags=["transfers"])

@router.get("")
def get_transfers(
    school: str | None = None,
    year: int | None = None,
    stars: int | None = None,
    position: str | None = None,
    direction: str | None = Query(None, regex="^(in|out)$"),
    db: Session = Depends(get_db),
):
    q = db.query(Transfer)
    if school:
        if direction == "in":
            q = q.filter(Transfer.destination.ilike(f"%{school}%"))
        elif direction == "out":
            q = q.filter(Transfer.origin.ilike(f"%{school}%"))
        else:
            q = q.filter(
                (Transfer.origin.ilike(f"%{school}%")) |
                (Transfer.destination.ilike(f"%{school}%"))
            )
    if year:
        q = q.filter(Transfer.season == year)
    if stars:
        q = q.filter(Transfer.stars >= stars)
    if position:
        q = q.filter(Transfer.position.ilike(f"%{position}%"))

    results = q.limit(2000).all()
    return to_point_geojson(results, "transfer")


@router.get("/flows")
def get_transfer_flows(
    school: str | None = None,
    year: int | None = None,
    stars: int | None = None,
    direction: str | None = Query(None, regex="^(in|out)$"),
    db: Session = Depends(get_db),
):
    """Returns LineString GeoJSON for arc flow visualization."""
    q = db.query(Transfer).filter(
        Transfer.origin_lat.isnot(None),
        Transfer.dest_lat.isnot(None),
    )
    if school:
        if direction == "in":
            q = q.filter(Transfer.destination.ilike(f"%{school}%"))
        elif direction == "out":
            q = q.filter(Transfer.origin.ilike(f"%{school}%"))
        else:
            q = q.filter(
                (Transfer.origin.ilike(f"%{school}%")) |
                (Transfer.destination.ilike(f"%{school}%"))
            )
    if year:
        q = q.filter(Transfer.season == year)
    if stars:
        q = q.filter(Transfer.stars >= stars)

    results = q.limit(1000).all()
    return to_linestring_geojson(results)`,

  geojson: `# backend/app/services/geo_service.py
import geopandas as gpd
from shapely.geometry import Point, LineString
import numpy as np

def to_point_geojson(records: list, record_type: str) -> dict:
    """Convert ORM records to GeoJSON FeatureCollection."""
    features = []
    for r in records:
        lat = getattr(r, "latitude", None) or getattr(r, "origin_lat", None)
        lon = getattr(r, "longitude", None) or getattr(r, "origin_lon", None)
        if not lat or not lon:
            continue

        props = {k: v for k, v in r.__dict__.items()
                 if not k.startswith("_")}
        props["record_type"] = record_type

        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
            "properties": props,
        })

    return {"type": "FeatureCollection", "features": features}


def _arc_points(
    lon1: float, lat1: float,
    lon2: float, lat2: float,
    n: int = 32,
) -> list[list[float]]:
    """
    Generate a great-circle arc between two points.
    Adds vertical bow so flows don't overlap on straight segments.
    """
    lons = np.linspace(lon1, lon2, n)
    lats = np.linspace(lat1, lat2, n)
    dist = np.sqrt((lon2 - lon1)**2 + (lat2 - lat1)**2)
    bow = np.sin(np.linspace(0, np.pi, n)) * dist * 0.15  # 15% bow height
    perp_lat = -(lon2 - lon1) / (dist + 1e-9)
    perp_lon =  (lat2 - lat1) / (dist + 1e-9)
    lons = lons + perp_lon * bow
    lats = lats + perp_lat * bow
    return [[float(lo), float(la)] for lo, la in zip(lons, lats)]


def to_linestring_geojson(transfers: list) -> dict:
    features = []
    for t in transfers:
        if not all([t.origin_lat, t.origin_lon, t.dest_lat, t.dest_lon]):
            continue
        coords = _arc_points(t.origin_lon, t.origin_lat, t.dest_lon, t.dest_lat)
        features.append({
            "type": "Feature",
            "geometry": {"type": "LineString", "coordinates": coords},
            "properties": {
                "name": t.name,
                "position": t.position,
                "origin": t.origin,
                "destination": t.destination,
                "season": t.season,
                "stars": t.stars,
                "rating": t.rating,
                "eligibility": t.eligibility,
            },
        })
    return {"type": "FeatureCollection", "features": features}


# Example output for a single transfer flow:
# {
#   "type": "FeatureCollection",
#   "features": [{
#     "type": "Feature",
#     "geometry": {
#       "type": "LineString",
#       "coordinates": [
#         [-97.4, 35.2], [-96.1, 36.8], [-94.5, 37.1], ...  // 32-point arc
#       ]
#     },
#     "properties": {
#       "name": "John Doe",
#       "position": "QB",
#       "origin": "Oklahoma",
#       "destination": "Alabama",
#       "season": 2025,
#       "stars": 4,
#       "rating": 0.92
#     }
#   }]
# }`,

  frontend: `// frontend/src/types/index.ts
export interface Recruit {
  id: number;
  name: string;
  year: number;
  position: string;
  stars: number;
  rating: number;
  city: string;
  state: string;
  committed_to: string;
  school: string;          // high school
  latitude: number;
  longitude: number;
  recruit_type: string;
}

export interface Transfer {
  id: number;
  name: string;
  position: string;
  origin: string;
  destination: string;
  season: number;
  stars: number;
  rating: number;
  eligibility: string;
  origin_lat: number;
  origin_lon: number;
  dest_lat: number;
  dest_lon: number;
}

export interface FilterState {
  school: string;
  year: number | null;
  minStars: number;
  position: string;
  showRecruits: boolean;
  showTransfers: boolean;
  transferDirection: "in" | "out" | "both";
  comparisonSchool: string;   // for comparison mode
}

// frontend/src/api/client.ts
const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function fetchGeoJSON(path: string, params: Record<string, string>) {
  const url = new URL(BASE + path);
  Object.entries(params).forEach(([k, v]) => v && url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(\`API error \${res.status}\`);
  return res.json();
}

export const api = {
  recruits: (p: Record<string, string>) => fetchGeoJSON("/recruits", p),
  transfers: (p: Record<string, string>) => fetchGeoJSON("/transfers", p),
  transferFlows: (p: Record<string, string>) => fetchGeoJSON("/transfers/flows", p),
  schools: () => fetchGeoJSON("/schools", {}),
};


// frontend/src/hooks/useTransferFlows.ts
import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { FilterState } from "../types";

export function useTransferFlows(filters: FilterState) {
  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!filters.showTransfers || !filters.school) return;
    setLoading(true);
    api.transferFlows({
      school: filters.school,
      year: filters.year?.toString() ?? "",
      stars: filters.minStars > 0 ? filters.minStars.toString() : "",
      direction: filters.transferDirection === "both" ? "" : filters.transferDirection,
    })
      .then(setGeojson)
      .finally(() => setLoading(false));
  }, [filters.school, filters.year, filters.minStars, filters.showTransfers, filters.transferDirection]);

  return { geojson, loading };
}`,

  leaflet: `// frontend/src/components/map/MapContainer.tsx
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { RecruitsLayer } from "./RecruitsLayer";
import { FlowLinesLayer } from "./FlowLinesLayer";
import type { FilterState } from "../../types";

interface Props { filters: FilterState; }

export function MapContainer({ filters }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!divRef.current || mapRef.current) return;
    mapRef.current = L.map(divRef.current, {
      center: [39.5, -98.35],
      zoom: 4,
      zoomControl: true,
    });
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      { attribution: "© CartoDB", maxZoom: 19 }
    ).addTo(mapRef.current);

    return () => { mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={divRef} style={{ width: "100%", height: "100%" }} />
      {mapRef.current && (
        <>
          <RecruitsLayer map={mapRef.current} filters={filters} />
          <FlowLinesLayer map={mapRef.current} filters={filters} />
        </>
      )}
    </div>
  );
}


// frontend/src/components/map/FlowLinesLayer.tsx
import { useEffect, useRef } from "react";
import L from "leaflet";
import { useTransferFlows } from "../../hooks/useTransferFlows";
import type { FilterState } from "../../types";

const INBOUND_COLOR = "#22d3ee";   // cyan
const OUTBOUND_COLOR = "#f97316";  // orange

interface Props { map: L.Map; filters: FilterState; }

export function FlowLinesLayer({ map, filters }: Props) {
  const layerRef = useRef<L.GeoJSON | null>(null);
  const { geojson } = useTransferFlows(filters);

  useEffect(() => {
    layerRef.current?.remove();
    if (!geojson) return;

    layerRef.current = L.geoJSON(geojson, {
      style: (feature) => {
        const isInbound = feature?.properties?.destination
          ?.toLowerCase()
          .includes(filters.school.toLowerCase());
        return {
          color: isInbound ? INBOUND_COLOR : OUTBOUND_COLOR,
          weight: 1.5,
          opacity: 0.7,
          dashArray: "4 4",
        };
      },
      onEachFeature: (feature, layer) => {
        const p = feature.properties;
        layer.bindPopup(\`
          <div class="popup-card">
            <strong>\${p.name}</strong>
            <span class="position">\${p.position}</span>
            <div>\${p.origin} → \${p.destination}</div>
            <div>\${"★".repeat(p.stars || 0)} \${p.rating?.toFixed(4) ?? "N/A"}</div>
          </div>
        \`);
        layer.on("mouseover", () => (layer as L.Polyline).setStyle({ weight: 3, opacity: 1 }));
        layer.on("mouseout", () => layerRef.current?.resetStyle(layer));
      },
    }).addTo(map);
  }, [geojson, map, filters.school]);

  return null;
}`,

  flows: `Transfer flow arcs are generated server-side in geo_service.py using a
perpendicular bow offset — this prevents straight lines from overlapping
on busy corridors (e.g. SEC transfers).

The algorithm:
  1. Take origin (school A lat/lon) and destination (school B lat/lon)
  2. Linearly interpolate 32 evenly-spaced waypoints
  3. Compute the perpendicular direction to the line (rotate 90°)
  4. Apply a sine-curved offset along the perpendicular:
       offset = sin(t * π) * distance * 0.15
     This creates a smooth arc that peaks at the midpoint
  5. Output as GeoJSON LineString

School coordinates are resolved via a separate lookup table (schools table
in SQLite, seeded from the CFBD /teams endpoint). During transfer ingestion,
each row is joined to this table on origin/destination name to populate
origin_lat, origin_lon, dest_lat, dest_lon.

For V2, upgrade arc generation to true great-circle paths using the
haversine formula, and animate them with Leaflet.motion or deck.gl
TripsLayer for a smooth flowing effect.

Color coding:
  - Cyan  (#22d3ee) = inbound transfers (gaining a player)
  - Orange (#f97316) = outbound transfers (losing a player)
  - Line weight scales with star rating (optional V2 enhancement)`,

  scaling: `V2 / Production Scaling Roadmap
═══════════════════════════════

① Heatmaps
   - Add /recruits/heatmap endpoint returning binned density grid
   - Frontend: replace markers with Leaflet.heat when zoom < 7
   - Backend: use pandas .groupby(['lat_bin','lon_bin']).count()

② Timeline Slider
   - All endpoints already accept ?year= — slider just updates this param
   - Add "animate" mode: step through years on a timer (React useEffect interval)
   - Store per-year data in IndexedDB to avoid re-fetching

③ Advanced School Comparison
   - /schools/{name}/stats endpoint returns: transfers_in, transfers_out,
     avg_rating_in, avg_rating_out, net_gain, position breakdown
   - Add Recharts radar chart for head-to-head position comparison

④ Automated Weekly Updates
   - scripts/weekly_update.py already structured as a standalone script
   - Deploy as a cron job (GitHub Actions schedule, Railway cron, etc.)
   - Add "last_updated" timestamp table to surface staleness warnings

⑤ Public Deployment Stack
   - Backend: Railway or Render (free tier friendly for FastAPI + SQLite)
   - Frontend: Vercel or Netlify (Vite build)
   - Upgrade SQLite → PostgreSQL + PostGIS for production concurrency
   - Add Redis caching on expensive GeoJSON endpoints (TTL 1 hour)
   - CDN-cache static GeoJSON snapshots for the current season

⑥ deck.gl Migration (V3 stretch goal)
   - Replace Leaflet arc lines with deck.gl ArcLayer for GPU-accelerated
     rendering of 10,000+ flows simultaneously
   - ArcLayer natively supports animated, colored, width-scaled arcs
   - Keep Leaflet for base tiles; overlay deck.gl canvas on top`,
};

const COLORS = {
  bg: "#0a0f1a",
  panel: "#0e1520",
  border: "#1e2d40",
  accent: "#22d3ee",
  orange: "#f97316",
  text: "#e2e8f0",
  muted: "#64748b",
  highlight: "#1e3a5f",
  green: "#4ade80",
};

function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div style={{ position: "relative", marginTop: 12 }}>
      <button
        onClick={copy}
        style={{
          position: "absolute", top: 8, right: 8,
          background: copied ? COLORS.green : COLORS.highlight,
          color: copied ? "#000" : COLORS.accent,
          border: "none", borderRadius: 4, padding: "3px 10px",
          fontSize: 11, cursor: "pointer", fontFamily: "monospace",
          transition: "all 0.2s",
        }}
      >{copied ? "✓ Copied" : "Copy"}</button>
      <pre style={{
        background: "#060c16",
        border: `1px solid ${COLORS.border}`,
        borderRadius: 8,
        padding: "16px 20px",
        overflowX: "auto",
        fontSize: 12,
        lineHeight: 1.65,
        color: "#a8d8f0",
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
        margin: 0,
        whiteSpace: "pre",
      }}>{code}</pre>
    </div>
  );
}

function Badge({ text, color = COLORS.accent }) {
  return (
    <span style={{
      background: color + "20",
      color,
      border: `1px solid ${color}40`,
      borderRadius: 4,
      padding: "2px 8px",
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.05em",
      textTransform: "uppercase",
    }}>{text}</span>
  );
}

export default function Blueprint() {
  const [active, setActive] = useState("overview");

  const renderContent = () => {
    switch (active) {
      case "overview":
        return (
          <div>
            <h2 style={{ color: COLORS.accent, fontSize: 22, marginBottom: 6, fontFamily: "'Space Grotesk', sans-serif" }}>
              CFB Recruiting & Transfer Map — V1 Architecture
            </h2>
            <p style={{ color: COLORS.muted, marginBottom: 24, lineHeight: 1.7, fontSize: 13 }}>
              A professional open-source replacement for your ArcGIS Pro pipeline.
              The system ingests data from the CollegeFootballData API, processes it with GeoPandas,
              serves it via FastAPI GeoJSON endpoints, and renders it in a Leaflet-based React frontend.
              Designed so each layer is independently testable and horizontally extensible.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              {[
                { label: "Backend", stack: ["Python 3.11+", "FastAPI", "SQLAlchemy", "SQLite", "GeoPandas", "Shapely"], color: COLORS.accent },
                { label: "Frontend", stack: ["React 18 + TypeScript", "Vite", "Leaflet.js", "TailwindCSS", "Recharts (V2)"], color: COLORS.orange },
                { label: "Data Pipeline", stack: ["CFBD REST API", "pandas ingestion", "Hometown lat/lon parsing", "School coord lookup", "Weekly cron script"], color: COLORS.green },
                { label: "GeoJSON API", stack: ["/recruits", "/transfers", "/transfers/flows", "?school=", "?year= ?stars= ?position="], color: "#a78bfa" },
              ].map(({ label, stack, color }) => (
                <div key={label} style={{
                  background: COLORS.panel,
                  border: `1px solid ${color}30`,
                  borderRadius: 10,
                  padding: 16,
                }}>
                  <div style={{ color, fontWeight: 700, fontSize: 13, marginBottom: 10, letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</div>
                  {stack.map(s => (
                    <div key={s} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                      <span style={{ color, fontSize: 10 }}>▸</span>
                      <span style={{ color: COLORS.text, fontSize: 12 }}>{s}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ color: COLORS.accent, fontWeight: 700, fontSize: 12, marginBottom: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>Data Flow</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 12 }}>
                {[
                  { label: "CFBD API", color: COLORS.orange },
                  { label: "→", color: COLORS.muted },
                  { label: "cfbd_client.py", color: COLORS.accent },
                  { label: "→", color: COLORS.muted },
                  { label: "ingest_*.py", color: COLORS.accent },
                  { label: "→", color: COLORS.muted },
                  { label: "SQLite DB", color: COLORS.green },
                  { label: "→", color: COLORS.muted },
                  { label: "FastAPI", color: COLORS.accent },
                  { label: "→", color: COLORS.muted },
                  { label: "GeoJSON", color: "#a78bfa" },
                  { label: "→", color: COLORS.muted },
                  { label: "Leaflet Map", color: COLORS.orange },
                ].map(({ label, color }, i) => (
                  <span key={i} style={{ color, fontFamily: label.startsWith("→") ? "sans-serif" : "monospace" }}>{label}</span>
                ))}
              </div>
            </div>

            <div style={{ background: "#0d1f12", border: `1px solid ${COLORS.green}30`, borderRadius: 10, padding: 16 }}>
              <div style={{ color: COLORS.green, fontWeight: 700, fontSize: 12, marginBottom: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Mapping: Your ArcPy → Open Source Equivalents
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
                {[
                  ["arcpy.conversion.ExportTable", "pandas.read_csv() → SQLAlchemy insert"],
                  ["arcpy.management.CalculateField (Arcade)", "pandas string ops / ast.literal_eval"],
                  ["arcpy.gapro.JoinFeatures", "pandas.merge() on name column"],
                  ["arcpy.management.XYTableToPoint", "geopandas.GeoDataFrame(geometry=gpd.points_from_xy(...))"],
                  ["ArcGIS File Geodatabase", "SQLite + GeoJSON endpoints"],
                  ["ArcGIS Online WebMap", "Leaflet + React frontend"],
                ].map(([old, neww]) => (
                  <div key={old} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0", borderBottom: `1px solid ${COLORS.border}` }}>
                    <div style={{ color: COLORS.orange, flex: 1, fontFamily: "monospace", fontSize: 11 }}>{old}</div>
                    <div style={{ color: COLORS.muted, padding: "0 4px" }}>→</div>
                    <div style={{ color: COLORS.green, flex: 1, fontFamily: "monospace", fontSize: 11 }}>{neww}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "scaling":
        return (
          <div>
            <h2 style={{ color: COLORS.accent, fontSize: 20, marginBottom: 16, fontFamily: "'Space Grotesk', sans-serif" }}>Scaling & Future Extensions</h2>
            <CodeBlock code={CODE.scaling} />
          </div>
        );

      case "flows":
        return (
          <div>
            <h2 style={{ color: COLORS.accent, fontSize: 20, marginBottom: 16, fontFamily: "'Space Grotesk', sans-serif" }}>Transfer Flow Arc Generation</h2>
            <div style={{
              background: COLORS.panel, border: `1px solid ${COLORS.border}`,
              borderRadius: 10, padding: 20, fontSize: 13, color: COLORS.text,
              lineHeight: 1.8, marginBottom: 16,
            }}>
              {CODE.flows.split("\n").map((line, i) => (
                <div key={i} style={{
                  color: line.startsWith("  ") ? COLORS.muted : line.match(/^[①-⑥]|^The|^School|^Color|^For/) ? COLORS.text : COLORS.accent,
                  fontFamily: line.startsWith("  ") ? "monospace" : "inherit",
                  fontSize: line.startsWith("  ") ? 12 : 13,
                  marginBottom: 2,
                }}>{line}</div>
              ))}
            </div>

            <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 16 }}>
              <div style={{ color: COLORS.accent, fontWeight: 700, fontSize: 12, marginBottom: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Arc Bow Formula
              </div>
              <CodeBlock code={`# The bow offset in geo_service.py

dist = sqrt((lon2 - lon1)² + (lat2 - lat1)²)

# t = 0..1 along the path
bow_t = sin(t * π) * dist * 0.15

# Perpendicular direction (rotated 90°)
perp_lat = -(lon2 - lon1) / dist
perp_lon =  (lat2 - lat1) / dist

# Final coordinates
lon[t] = lerp(lon1, lon2, t) + perp_lon * bow_t
lat[t] = lerp(lat1, lat2, t) + perp_lat * bow_t`} />
            </div>
          </div>
        );

      const codeMap = {
        directory: "directory", ingestion: "ingestion", models: "models",
        api: "api", geojson: "geojson", frontend: "frontend", leaflet: "leaflet",
      };

      default: {
        const titles = {
          directory: "Directory Structure",
          ingestion: "Data Ingestion Scripts",
          models: "Database Schema (SQLAlchemy)",
          api: "FastAPI Route Examples",
          geojson: "GeoJSON Service + Output",
          frontend: "React Frontend Structure",
          leaflet: "Leaflet Map Integration",
        };
        const key = active;
        return (
          <div>
            <h2 style={{ color: COLORS.accent, fontSize: 20, marginBottom: 16, fontFamily: "'Space Grotesk', sans-serif" }}>
              {titles[key]}
            </h2>
            <CodeBlock code={CODE[key]} />
          </div>
        );
      }
    }
  };

  return (
    <div style={{
      background: COLORS.bg,
      minHeight: "100vh",
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      color: COLORS.text,
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        background: COLORS.panel,
        borderBottom: `1px solid ${COLORS.border}`,
        padding: "12px 24px",
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}>
        <div style={{
          background: COLORS.accent,
          color: "#000",
          borderRadius: 6,
          width: 32, height: 32,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, fontWeight: 700,
        }}>🏈</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.02em" }}>
            CFB Recruiting & Transfer Map
          </div>
          <div style={{ color: COLORS.muted, fontSize: 11 }}>Open-Source Architecture Blueprint — V1</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <Badge text="FastAPI" color={COLORS.accent} />
          <Badge text="GeoPandas" color={COLORS.green} />
          <Badge text="Leaflet" color={COLORS.orange} />
          <Badge text="React + TS" color="#a78bfa" />
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex", flex: 1 }}>
        {/* Sidebar */}
        <div style={{
          width: 200,
          background: COLORS.panel,
          borderRight: `1px solid ${COLORS.border}`,
          padding: "12px 0",
          flexShrink: 0,
        }}>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "9px 20px",
                background: active === s.id ? COLORS.highlight : "transparent",
                color: active === s.id ? COLORS.accent : COLORS.muted,
                border: "none",
                borderLeft: active === s.id ? `2px solid ${COLORS.accent}` : "2px solid transparent",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: active === s.id ? 600 : 400,
                transition: "all 0.15s",
              }}
            >{s.label}</button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: 28, overflowY: "auto", maxHeight: "calc(100vh - 58px)" }}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
