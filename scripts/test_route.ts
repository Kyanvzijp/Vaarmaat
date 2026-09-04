import fs from 'node:fs';
import { Graph } from '../src/graph.ts';
import { computeRoutes } from '../src/routing.ts';
import { DEFAULT_PROFILE } from '../src/profile.ts';
import { KNOWN_PLACES } from '../src/geocode.ts';
import { formatDistance, formatDuration } from '../src/geo.ts';

const data = JSON.parse(fs.readFileSync(new URL('../public/data/graph.json', import.meta.url), 'utf8'));
const t0 = Date.now();
const g = new Graph(data);
console.log('graph loaded', Date.now() - t0, 'ms');
// componenten
const seen = new Uint8Array(g.nodes.length); let comps: number[] = [];
for (let i = 0; i < g.nodes.length; i++) { if (seen[i]) continue; let size = 0; const st = [i]; seen[i] = 1; while (st.length) { const u = st.pop()!; size++; for (const e of g.adj[u]) { const v = g.otherEnd(e, u); if (!seen[v]) { seen[v] = 1; st.push(v); } } } comps.push(size); }
comps.sort((a, b) => b - a); console.log('components', comps.length, 'largest', comps.slice(0, 5));

const pl = (n: string) => KNOWN_PLACES.find(p => p.name.startsWith(n))!;
const pairs: [string, string][] = [['Kaag', 'Leiden centrum'], ['Alphen', 'Kaag'], ['Alphen', 'Amsterdam centrum'], ['Leiden centrum', 'Gouda'], ['Kaag', 'Haarlem'], ['Alphen', 'Utrecht'], ['Kaag', 'Loosdrechtse'], ['Delft', 'Leiden centrum']];
const argvH = process.argv[2] ? parseFloat(process.argv[2]) : null;
for (const [a, b] of pairs) {
  const pr = g.snapPair(pl(a).point, pl(b).point, 2500);
  if (!pr) { console.log(a, b, 'snap failed'); continue; }
  const A = pr.a, B = pr.b;
  const prof = { ...DEFAULT_PROFILE, height: argvH ?? DEFAULT_PROFILE.height };
  const t1 = Date.now();
  const r = computeRoutes(g, { from: A.node, to: B.node, profile: prof, alternatives: 2 });
  console.log(`\n=== ${a} -> ${b} (${Date.now() - t1} ms) snap ${Math.round(A.dist)}/${Math.round(B.dist)} m`);
  if (!r.routes.length) { console.log('  ', r.blockedInfo); continue; }
  for (const rt of r.routes) console.log(`  ${rt.label}: ${formatDistance(rt.distance)} ${formatDuration(rt.duration)} bruggen=${rt.bridges.length} laagste=${rt.lowestBridge} onbekend=${rt.unknownBridges} sluizen=${rt.locks.length} via ${rt.waterways.slice(0, 8).join(' > ')}`);
  const main = r.routes[0];
  for (const s of main.steps.slice(0, 40)) console.log(`   ${formatDistance(s.at).padStart(8)}  ${s.kind.padEnd(14)} ${s.text}${s.detail ? ' (' + s.detail + ')' : ''}`);
}
