#!/usr/bin/env node
/**
 * Haalt vaarwegen, bruggen en sluizen op uit OpenStreetMap (Overpass API) en schrijft data/osm_raw.json.
 * Daarna:  python3 scripts/build_graph.py
 *
 * Gebruik:  node scripts/fetch_osm.mjs            (standaard: Groene Hart + Hollandse Plassen)
 *           node scripts/fetch_osm.mjs 51.85 4.20 52.52 5.32   (eigen bbox: zuid west noord oost)
 */
import fs from 'node:fs';
import path from 'node:path';

const [S, W, N, E] = process.argv.length >= 6 ? process.argv.slice(2, 6).map(Number) : [51.85, 4.2, 52.52, 5.32];
const ENDPOINTS = ['https://overpass.openstreetmap.fr/api/interpreter', 'https://overpass-api.de/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter'];

async function query(q) {
  for (let attempt = 0; attempt < 9; attempt++) {
    const ep = ENDPOINTS[attempt % ENDPOINTS.length];
    try {
      const r = await fetch(ep, { method: 'POST', body: 'data=' + encodeURIComponent(q) });
      const txt = await r.text();
      if (r.status === 200 && txt.startsWith('{')) return JSON.parse(txt);
      console.warn(`${ep}: ${r.status}`);
    } catch (e) {
      console.warn(`${ep}: ${e.message}`);
    }
    await new Promise((res) => setTimeout(res, 8000));
  }
  throw new Error('Overpass niet bereikbaar');
}

// bbox in tegels van ~0.34 x 0.56 graden, zodat elke query klein blijft
const tiles = [];
for (let la = S; la < N - 0.001; la += 0.335) for (let lo = W; lo < E - 0.001; lo += 0.56) tiles.push([la, lo, Math.min(la + 0.335, N), Math.min(lo + 0.56, E)].map((x) => x.toFixed(3)).join(','));

const keepW = ['name', 'waterway', 'maxheight', 'maxheight:physical', 'maxdraught', 'maxdraft', 'maxwidth', 'maxspeed', 'boat', 'motorboat', 'CEMT', 'tunnel', 'bridge', 'lock', 'lock_name', 'access', 'name:nl', 'alt_name', 'loc_name'];
const keepB = ['name', 'bridge', 'bridge:movable', 'bridge:name', 'seamark:type', 'seamark:bridge:category', 'seamark:bridge:clearance_height', 'seamark:bridge:clearance_height_closed', 'seamark:name', 'maxheight', 'highway', 'railway', 'man_made', 'waterway', 'lock', 'lock_name', 'movable', 'name:nl'];

const ways = [], feats = [];
const seenW = new Set(), seenB = new Set();
const CS = 0.002;
const cells = new Set();
const cellOf = (la, lo) => Math.floor(la / CS) + ':' + Math.floor(lo / CS);
const addLine = (g) => {
  for (let k = 0; k < g.length; k++) {
    const [la, lo] = g[k];
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) cells.add(Math.floor(la / CS + a) + ':' + Math.floor(lo / CS + b));
    if (k > 0) {
      const [pla, plo] = g[k - 1];
      const n = Math.ceil(Math.max(Math.abs(la - pla), Math.abs(lo - plo)) / CS);
      for (let s = 1; s < n; s++) cells.add(cellOf(pla + (la - pla) * (s / n), plo + (lo - plo) * (s / n)));
    }
  }
};
const nearWater = (g) => {
  for (let k = 0; k < g.length; k++) {
    if (cells.has(cellOf(g[k][0], g[k][1]))) return true;
    if (k > 0) {
      const [pla, plo] = g[k - 1], [la, lo] = g[k];
      const n = Math.ceil(Math.max(Math.abs(la - pla), Math.abs(lo - plo)) / CS);
      for (let s = 1; s < n; s++) if (cells.has(cellOf(pla + (la - pla) * (s / n), plo + (lo - plo) * (s / n)))) return true;
    }
  }
  return false;
};

for (const [i, bbox] of tiles.entries()) {
  console.log(`vaarwegen tegel ${i + 1}/${tiles.length}`);
  const j = await query(`[out:json][timeout:180];(way["waterway"="canal"](${bbox});way["waterway"="river"](${bbox});way["waterway"="fairway"](${bbox}););out tags geom;`);
  for (const el of j.elements) {
    if (el.type !== 'way' || seenW.has(el.id) || !el.geometry) continue;
    seenW.add(el.id);
    const t = {};
    for (const k of keepW) if (el.tags?.[k] != null) t[k] = el.tags[k];
    const g = el.geometry.map((p) => [+p.lat.toFixed(6), +p.lon.toFixed(6)]);
    ways.push({ id: el.id, t, g });
    addLine(g);
  }
}
for (const [i, bbox] of tiles.entries()) {
  console.log(`bruggen en sluizen tegel ${i + 1}/${tiles.length}`);
  const j = await query(`[out:json][timeout:180];(way["bridge"]["highway"](${bbox});way["bridge"]["railway"](${bbox});way["man_made"="bridge"](${bbox});node["seamark:type"="bridge"](${bbox});node["waterway"="lock_gate"](${bbox});way["waterway"="lock_gate"](${bbox});way["lock"="yes"](${bbox});node["lock"="yes"](${bbox});node["waterway"="weir"](${bbox});way["waterway"="weir"](${bbox});node["waterway"="dam"](${bbox});way["waterway"="dam"](${bbox}););out tags geom;`);
  for (const el of j.elements) {
    const key = el.type + el.id;
    if (seenB.has(key)) continue;
    seenB.add(key);
    const g = el.type === 'node' ? [[+el.lat.toFixed(6), +el.lon.toFixed(6)]] : el.geometry?.map((p) => [+p.lat.toFixed(6), +p.lon.toFixed(6)]);
    if (!g || !nearWater(g)) continue;
    const t = {};
    for (const k of keepB) if (el.tags?.[k] != null) t[k] = el.tags[k];
    feats.push({ id: el.id, ty: el.type, t, g });
  }
}
const out = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'data', 'osm_raw.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ bbox: [S, W, N, E], ways, feats }));
console.log(`klaar: ${ways.length} vaarwegen, ${feats.length} bruggen/sluizen -> ${out}`);
