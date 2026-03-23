"""
fetch_data.py — Pull 2026 CFB recruiting & transfer portal data from the
College Football Data API and save to public/data/{recruits,transfers}.json

Transfer pins are placed at the player's recruit hometown (looked up from
10 years of historical recruit data), falling back to destination school
coords when no hometown match is found.

Requirements:
    pip install requests

Usage:
    set CFBD_API_KEY=your_key_here   (Windows CMD)
    python scripts/fetch_data.py

Get a free API key at: https://collegefootballdata.com/key
"""

import json
import os
import re
import requests
from pathlib import Path

# ── CONFIG ────────────────────────────────────────────────────────────────────
API_KEY  = os.environ.get("CFBD_API_KEY", "")
BASE_URL = "https://api.collegefootballdata.com"
OUT_DIR  = Path(__file__).parent.parent / "public" / "data"
HEADERS  = {"Authorization": f"Bearer {API_KEY}"}

# How many years back to search for recruit hometowns.
# 10 years covers freshmen through 5th-year seniors comfortably.
RECRUIT_HISTORY_YEARS = range(2016, 2026)  # 2016 – 2025


def cfbd_get(path: str, params: dict) -> list:
    if not API_KEY:
        raise SystemExit(
            "ERROR: Set CFBD_API_KEY environment variable first.\n"
            "Get a free key at https://collegefootballdata.com/key"
        )
    resp = requests.get(f"{BASE_URL}{path}", headers=HEADERS, params=params, timeout=30)
    resp.raise_for_status()
    return resp.json()


def normalize_name(name: str) -> str:
    """Lowercase, strip punctuation/suffixes for fuzzy name matching."""
    name = name.lower().strip()
    # Remove generational suffixes
    name = re.sub(r"\b(jr\.?|sr\.?|ii|iii|iv)\b", "", name)
    # Remove punctuation
    name = re.sub(r"[^a-z\s]", "", name)
    return re.sub(r"\s+", " ", name).strip()


def fetch_school_coords() -> dict[str, tuple[float, float]]:
    print("Fetching school coordinates...", flush=True)
    teams = cfbd_get("/teams", {})
    coords = {}
    for t in teams:
        name = t.get("school")
        lat  = (t.get("location") or {}).get("latitude")
        lon  = (t.get("location") or {}).get("longitude")
        if name and lat and lon:
            coords[name] = (float(lat), float(lon))
    print(f"  {len(coords)} schools", flush=True)
    return coords


def build_hometown_lookup() -> dict[str, dict]:
    """
    Fetch 10 years of recruit data and build a name -> hometown lookup.
    When a name appears multiple times, keep the entry with the highest
    rating (best data quality).
    """
    print(f"Building hometown lookup from {RECRUIT_HISTORY_YEARS.start}–{RECRUIT_HISTORY_YEARS.stop - 1}...", flush=True)

    lookup: dict[str, dict] = {}  # normalized_name -> {lat, lon, city, state}

    for year in RECRUIT_HISTORY_YEARS:
        print(f"  Fetching {year} recruits...", flush=True)
        try:
            raw = cfbd_get("/recruiting/players", {"year": year})
        except Exception as e:
            print(f"  WARNING: Failed to fetch {year}: {e}", flush=True)
            continue

        for r in raw:
            hometown = r.get("hometownInfo") or {}
            lat = hometown.get("latitude") or r.get("latitude")
            lon = hometown.get("longitude") or r.get("longitude")
            if lat is None or lon is None:
                continue

            name = r.get("name") or ""
            if not name:
                continue

            key = normalize_name(name)
            rating = r.get("rating") or 0.0

            # Keep the highest-rated entry for this name
            if key not in lookup or rating > lookup[key].get("_rating", 0):
                lookup[key] = {
                    "lat":    float(lat),
                    "lon":    float(lon),
                    "city":   r.get("city") or "",
                    "state":  r.get("stateProvince") or "",
                    "_rating": rating,
                }

    print(f"  Lookup contains {len(lookup)} unique player names", flush=True)
    return lookup


def fetch_recruits() -> list[dict]:
    print("Fetching 2026 recruits...", flush=True)
    raw = cfbd_get("/recruiting/players", {"year": 2026})
    print(f"  {len(raw)} raw records", flush=True)

    out = []
    for r in raw:
        hometown = r.get("hometownInfo") or {}
        lat = hometown.get("latitude") or r.get("latitude")
        lon = hometown.get("longitude") or r.get("longitude")

        out.append({
            "name":        r.get("name") or "",
            "pos":         r.get("position") or "",
            "stars":       r.get("stars") or 0,
            "rating":      round(r.get("rating") or 0.0, 4),
            "committedTo": r.get("committedTo") or "",
            "year":        2026,
            "city":        r.get("city") or "",
            "state":       r.get("stateProvince") or "",
            "lat":         float(lat) if lat is not None else None,
            "lon":         float(lon) if lon is not None else None,
            "type":        "recruit",
        })

    with_coords = sum(1 for r in out if r["lat"] is not None)
    print(f"  {with_coords}/{len(out)} have coordinates", flush=True)
    return out


def fetch_transfers(hometown_lookup: dict, school_coords: dict) -> list[dict]:
    print("Fetching 2026 transfer portal...", flush=True)
    raw = cfbd_get("/player/portal", {"year": 2026})
    print(f"  {len(raw)} raw records", flush=True)

    matched = 0
    fallback = 0
    no_coords = 0

    out = []
    for t in raw:
        origin = t.get("origin") or ""
        dest   = t.get("destination") or ""
        full_name = f"{t.get('firstName', '')} {t.get('lastName', '')}".strip()

        # 1. Try hometown lookup from historical recruit data
        key = normalize_name(full_name)
        hometown = hometown_lookup.get(key)

        if hometown:
            lat   = hometown["lat"]
            lon   = hometown["lon"]
            city  = hometown["city"]
            state = hometown["state"]
            matched += 1
        else:
            # 2. Fall back to destination school, then origin school
            coords = school_coords.get(dest) or school_coords.get(origin)
            if coords:
                lat, lon = coords
                fallback += 1
            else:
                lat = lon = None
                no_coords += 1
            city = state = ""

        out.append({
            "name":   full_name,
            "pos":    t.get("position") or "",
            "stars":  t.get("stars") or 0,
            "rating": round(t.get("rating") or 0.0, 4),
            "origin": origin,
            "dest":   dest,
            "date":   (t.get("transferDate") or "")[:10],
            "lat":    lat,
            "lon":    lon,
            "city":   city,
            "state":  state,
            "type":   "transfer",
        })

    print(f"  Hometown match: {matched} | School fallback: {fallback} | No coords: {no_coords}", flush=True)
    return out


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    school_coords   = fetch_school_coords()
    hometown_lookup = build_hometown_lookup()
    recruits        = fetch_recruits()
    transfers       = fetch_transfers(hometown_lookup, school_coords)

    with open(OUT_DIR / "recruits.json", "w", encoding="utf-8") as f:
        json.dump(recruits, f, separators=(",", ":"))
    print(f"\nSaved {len(recruits)} recruits", flush=True)

    with open(OUT_DIR / "transfers.json", "w", encoding="utf-8") as f:
        json.dump(transfers, f, separators=(",", ":"))
    print(f"Saved {len(transfers)} transfers", flush=True)

    print("\nDone! Click Refresh in the app to reload the data.", flush=True)


if __name__ == "__main__":
    main()
