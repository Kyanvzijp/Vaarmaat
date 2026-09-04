#!/usr/bin/env node
/**
 * Haalt havens, aanlegplaatsen, voorzieningen, verboden gebieden en bedieningsinfo van bruggen/sluizen op uit OpenStreetMap
 * en schrijft data/osm_pois_raw.json. Daarna: python3 scripts/build_pois.py
 * Gebruik: node scripts/fetch_pois.mjs [zuid west noord oost]
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
    } catch (e) { console.warn(`${ep}: ${e.message}`); }
    await new Promise((res) => setTimeout(res, 8000));
  }
  throw new Error('Overpass niet bereikbaar');
}
const tiles = [];
for (let la = S; la < N - 0.001; la += 0.335) for (let lo = W; lo < E - 0.001; lo += 0.56) tiles.push([la, lo, Math.min(la + 0.335, N), Math.min(lo + 0.56, E)].map((x) => x.toFixed(3)).join(','));
const els = { P: [], O: [] };
const seen = new Set();
const add = (bucket, j) => {
  for (const el of j.elements) {
    const key = el.type + el.id;
    if (seen.has(key)) continue;
    seen.add(key);
    const c = el.type === 'node' ? [el.lat, el.lon] : el.center ? [el.center.lat, el.center.lon] : null;
    if (!c) continue;
    els[bucket].push({ id: el.id, ty: el.type, t: el.tags || {}, p: [+c[0].toFixed(6), +c[1].toFixed(6)] });
  }
};
for (const [i, b] of tiles.entries()) {
  console.log(`voorzieningen tegel ${i + 1}/${tiles.length}`);
  add('P', await query(`[out:json][timeout:180];(nwr["leisure"="marina"](${b});nwr["seamark:type"~"^(harbour|mooring|berth|anchorage|anchor_berth|restricted_area|small_craft_facility|fuel)$"](${b});nwr["mooring"](${b});nwr["harbour"](${b});nwr["waterway"~"^(fuel|boatyard|dock|sanitary_dump_station|water_point)$"](${b});nwr["amenity"="fuel"]["boat"~"yes|designated"](${b});nwr["leisure"="slipway"](${b});nwr["shop"~"^(boat|chandler)$"](${b});nwr["amenity"="sanitary_dump_station"](${b}););out tags center;`));
}
for (const [i, b] of tiles.entries()) {
  console.log(`bruggen en sluizen tegel ${i + 1}/${tiles.length}`);
  add('O', await query(`[out:json][timeout:180];(nwr["bridge:movable"](${b});nwr["bridge"="movable"](${b});nwr["seamark:bridge:category"](${b});nwr["seamark:type"="bridge"](${b});nwr["waterway"="lock_gate"](${b});nwr["lock"="yes"](${b});nwr["seamark:type"~"^(lock_basin|gate)$"](${b});nwr["waterway"="lock"](${b}););out tags center;`));
}
const out = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'data', 'osm_pois_raw.json');
fs.writeFileSync(out, JSON.stringify(els));
console.log(`klaar: ${els.P.length} voorzieningen, ${els.O.length} bruggen/sluizen -> ${out}`);
