import type { Graph } from './graph';
import type { BoatProfile, LatLng, RouteResult, RouteStep } from './types';
import { bearing, turnAngle, formatHeight, fastDist } from './geo';

/** Eenvoudige binaire min-heap op (cost, node) */
class Heap {
  keys: number[] = [];
  vals: number[] = [];
  push(k: number, v: number) {
    this.keys.push(k);
    this.vals.push(v);
    let i = this.keys.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.keys[p] <= this.keys[i]) break;
      [this.keys[p], this.keys[i]] = [this.keys[i], this.keys[p]];
      [this.vals[p], this.vals[i]] = [this.vals[i], this.vals[p]];
      i = p;
    }
  }
  pop(): [number, number] | undefined {
    if (this.keys.length === 0) return undefined;
    const top: [number, number] = [this.keys[0], this.vals[0]];
    const lk = this.keys.pop()!, lv = this.vals.pop()!;
    if (this.keys.length > 0) {
      this.keys[0] = lk;
      this.vals[0] = lv;
      let i = 0;
      const n = this.keys.length;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < n && this.keys[l] < this.keys[m]) m = l;
        if (r < n && this.keys[r] < this.keys[m]) m = r;
        if (m === i) break;
        [this.keys[m], this.keys[i]] = [this.keys[i], this.keys[m]];
        [this.vals[m], this.vals[i]] = [this.vals[i], this.vals[m]];
        i = m;
      }
    }
    return top;
  }
  get size() {
    return this.keys.length;
  }
}

export interface EdgeEval {
  /** seconden, of Infinity als niet bevaarbaar */
  cost: number;
  blockedReason?: string;
}

/** Kosten (in seconden) om een edge te bevaren met dit bootprofiel */
export function evalEdge(g: Graph, edge: number, p: BoatProfile): EdgeEval {
  const way = g.wayOf(edge);
  if (way.nb) return { cost: Infinity, blockedReason: 'vaarverbod' };
  if (way.nm && p.type !== 'kano') return { cost: Infinity, blockedReason: 'verboden voor motorboten' };
  if (way.d != null && p.draft > way.d) return { cost: Infinity, blockedReason: `te ondiep (max ${formatHeight(way.d)})` };
  if (way.w != null && p.width > way.w) return { cost: Infinity, blockedReason: `te smal (max ${formatHeight(way.w)})` };
  if (way.h != null && p.height + p.margin > way.h) return { cost: Infinity, blockedReason: `doorvaarthoogte ${formatHeight(way.h)}` };

  let speed = p.speed;
  if (way.s != null && way.s < speed) speed = way.s;
  if (speed <= 0) speed = 1;
  let cost = (g.edgeLength(edge) / 1000 / speed) * 3600;

  const bridges = g.edgeBridges.get(edge);
  if (bridges) {
    for (const bi of bridges) {
      const b = g.data.bridges[bi];
      if (b.h == null) {
        if (b.m) {
          if (!p.allowMovable) return { cost: Infinity, blockedReason: `beweegbare brug ${b.n ?? ''}`.trim() };
          cost += p.bridgeWait * 60;
        } else if (p.avoidUnknownBridges) {
          return { cost: Infinity, blockedReason: `brug met onbekende hoogte ${b.n ?? ''}`.trim() };
        } else {
          cost += 20; // kleine onzekerheidsstraf
        }
        continue;
      }
      if (p.height + p.margin <= b.h) continue; // past eronder
      if (b.m && p.allowMovable) {
        cost += p.bridgeWait * 60;
      } else {
        return { cost: Infinity, blockedReason: `${b.n ?? 'brug'} te laag (${formatHeight(b.h)})` };
      }
    }
  }
  const locks = g.edgeLocks.get(edge);
  if (locks) cost += locks.length * p.lockWait * 60;
  return { cost };
}

interface DijkstraResult {
  nodes: number[];
  edges: number[];
  cost: number;
}

function dijkstra(g: Graph, from: number, to: number, p: BoatProfile, penalty?: Map<number, number>): DijkstraResult | null {
  const n = g.nodes.length;
  const dist = new Float64Array(n).fill(Infinity);
  const prevNode = new Int32Array(n).fill(-1);
  const prevEdge = new Int32Array(n).fill(-1);
  const done = new Uint8Array(n);
  const heap = new Heap();
  dist[from] = 0;
  heap.push(0, from);
  // A* heuristiek: rechte lijn / max snelheid
  const target = g.nodes[to];
  const hs = (Math.max(p.speed, 1) / 3.6) * 1.05;
  const h = (node: number) => {
    const a = g.nodes[node];
    const x = (target[1] - a[1]) * 111320 * Math.cos((a[0] * Math.PI) / 180);
    const y = (target[0] - a[0]) * 110540;
    return Math.sqrt(x * x + y * y) / hs;
  };
  while (heap.size) {
    const [, u] = heap.pop()!;
    if (done[u]) continue;
    done[u] = 1;
    if (u === to) break;
    const adj = g.adj[u];
    for (let i = 0; i < adj.length; i++) {
      const ei = adj[i];
      const v = g.otherEnd(ei, u);
      if (done[v]) continue;
      const ev = evalEdge(g, ei, p);
      if (!isFinite(ev.cost)) continue;
      let c = ev.cost;
      if (penalty) {
        const f = penalty.get(ei);
        if (f) c *= f;
      }
      const nd = dist[u] + c;
      if (nd < dist[v]) {
        dist[v] = nd;
        prevNode[v] = u;
        prevEdge[v] = ei;
        heap.push(nd + h(v), v);
      }
    }
  }
  if (!isFinite(dist[to])) return null;
  const nodes: number[] = [];
  const edges: number[] = [];
  let cur = to;
  while (cur !== from) {
    nodes.push(cur);
    edges.push(prevEdge[cur]);
    cur = prevNode[cur];
  }
  nodes.push(from);
  nodes.reverse();
  edges.reverse();
  return { nodes, edges, cost: dist[to] };
}

function buildResult(g: Graph, r: DijkstraResult, p: BoatProfile, id: number, label: string, fromPoint?: LatLng, toPoint?: LatLng): RouteResult {
  const coords: LatLng[] = r.nodes.map((n) => g.nodes[n]);
  const cum: number[] = [0];
  let distance = 0;
  for (const e of r.edges) {
    distance += g.edgeLength(e);
    cum.push(distance);
  }
  // werkelijke reistijd zonder penalty-factoren
  let duration = 0;
  for (const e of r.edges) duration += evalEdge(g, e, p).cost;

  const bridges: RouteResult['bridges'] = [];
  const locks: RouteResult['locks'] = [];
  let lowest: number | null = null;
  let unknown = 0;
  r.edges.forEach((e, i) => {
    const bl = g.edgeBridges.get(e);
    if (bl)
      for (const bi of bl) {
        const b = g.data.bridges[bi];
        bridges.push({ name: b.n, height: b.h, movable: !!b.m, at: cum[i] + g.edgeLength(e) / 2, point: b.p, ops: b.o });
        if (b.h == null) unknown++;
        else if (lowest == null || b.h < lowest) lowest = b.h;
      }
    const ll = g.edgeLocks.get(e);
    if (ll)
      for (const li of ll) {
        const l = g.data.locks[li];
        locks.push({ name: l.n, at: cum[i] + g.edgeLength(e) / 2, point: l.p, ops: l.o });
      }
  });

  const waterways: string[] = [];
  for (const e of r.edges) {
    const nm = g.wayOf(e).n;
    if (nm && waterways[waterways.length - 1] !== nm) waterways.push(nm);
  }
  const warnings: string[] = [];
  if (unknown > 0) warnings.push(`${unknown} brug${unknown > 1 ? 'gen' : ''} met onbekende doorvaarthoogte op de route. Controleer ter plaatse.`);
  const movableCount = bridges.filter((b) => b.movable && (b.height == null || b.height < p.height + p.margin)).length;
  if (movableCount > 0) warnings.push(`${movableCount} beweegbare brug${movableCount > 1 ? 'gen' : ''} moet${movableCount > 1 ? 'en' : ''} voor je open. Let op bedieningstijden.`);

  const steps = buildSteps(g, r, coords, cum, bridges, locks, p);
  const res: RouteResult = { id, label, coords: [...coords], nodeIds: r.nodes, edgeIds: r.edges, distance, duration, cum: [...cum], steps, bridges, locks, lowestBridge: lowest, unknownBridges: unknown, waterways, warnings };
  attachEndpoints(res, p, fromPoint, toPoint);
  return res;
}

/** Voeg het exacte vertrek- en aankomstpunt toe (het stukje van de wal naar de vaarweg) */
function attachEndpoints(res: RouteResult, p: BoatProfile, fromPoint?: LatLng, toPoint?: LatLng) {
  const speedMs = Math.max(p.speed, 1) / 3.6;
  if (fromPoint) {
    const d0 = fastDist(fromPoint, res.coords[0]);
    if (d0 > 5) {
      res.coords.unshift(fromPoint);
      res.cum = [0, ...res.cum.map((c) => c + d0)];
      res.distance += d0;
      res.duration += d0 / speedMs;
      for (const s of res.steps) {
        s.at += d0;
        s.idx += 1;
      }
      res.steps[0].at = 0;
      res.steps[0].idx = 0;
      res.steps[0].point = fromPoint;
      res.steps[0].dist += d0;
      for (const b of res.bridges) b.at += d0;
      for (const l of res.locks) l.at += d0;
    }
  }
  if (toPoint) {
    const d1 = fastDist(res.coords[res.coords.length - 1], toPoint);
    if (d1 > 5) {
      res.coords.push(toPoint);
      res.distance += d1;
      res.cum.push(res.distance);
      res.duration += d1 / speedMs;
      const arrive = res.steps[res.steps.length - 1];
      arrive.at = res.distance;
      arrive.idx = res.coords.length - 1;
      arrive.point = toPoint;
      if (res.steps.length > 1) res.steps[res.steps.length - 2].dist += d1;
    }
  }
}

function turnKind(angle: number): RouteStep['kind'] {
  const a = Math.abs(angle);
  if (a < 25) return 'straight';
  if (a < 60) return angle > 0 ? 'slight_right' : 'slight_left';
  if (a < 135) return angle > 0 ? 'right' : 'left';
  if (a < 165) return angle > 0 ? 'sharp_right' : 'sharp_left';
  return 'uturn';
}

const turnText: Record<string, string> = {
  straight: 'Ga rechtdoor',
  slight_right: 'Houd rechts aan',
  slight_left: 'Houd links aan',
  right: 'Sla rechtsaf',
  left: 'Sla linksaf',
  sharp_right: 'Sla scherp rechtsaf',
  sharp_left: 'Sla scherp linksaf',
  uturn: 'Keer om',
};

function buildSteps(
  g: Graph,
  r: DijkstraResult,
  coords: LatLng[],
  cum: number[],
  bridges: RouteResult['bridges'],
  locks: RouteResult['locks'],
  p: BoatProfile,
): RouteStep[] {
  const steps: RouteStep[] = [];
  const firstName = g.wayOf(r.edges[0]).n;
  steps.push({ kind: 'depart', text: firstName ? `Vertrek over ${firstName}` : 'Vertrek', at: 0, dist: 0, point: coords[0], idx: 0 });

  // Koersverandering wordt gemeten over een venster van ~60 m voor en na de knoop, zodat bochtige vaarwegen niet elke knik een afslag opleveren.
  const lookPoint = (i: number, dir: 1 | -1, meters: number): LatLng => {
    let j = i;
    while (j + dir >= 0 && j + dir < coords.length && Math.abs(cum[j + dir] - cum[i]) < meters) j += dir;
    if (j === i && j + dir >= 0 && j + dir < coords.length) j += dir;
    return coords[j];
  };

  for (let i = 1; i < r.nodes.length - 1; i++) {
    const node = r.nodes[i];
    const inEdge = r.edges[i - 1];
    const outEdge = r.edges[i];
    const inName = g.wayOf(inEdge).n;
    const outName = g.wayOf(outEdge).n;
    const deg = g.degree(node);
    const nameChanged = inName !== outName && outName != null;
    if (deg < 3 && !nameChanged) continue;

    const bIn = bearing(lookPoint(i, -1, 60), coords[i]);
    const bOut = bearing(coords[i], lookPoint(i, 1, 60));
    const angle = turnAngle(bIn, bOut);
    let kind = turnKind(angle);

    // Is er op deze kruising een andere vaarweg die rechter doorgaat dan de gekozen? Zo niet, dan 'volg je gewoon het water'.
    let straighterExists = false;
    let othersExist = false;
    for (const ei of g.adj[node]) {
      if (ei === inEdge || ei === outEdge) continue;
      othersExist = true;
      const v = g.otherEnd(ei, node);
      const bo = bearing(coords[i], g.nodes[v]);
      if (Math.abs(turnAngle(bIn, bo)) + 10 < Math.abs(angle)) straighterExists = true;
    }
    const followsWater = !othersExist || !straighterExists;
    if (followsWater && kind !== 'uturn') {
      if (!nameChanged) continue;
      if (Math.abs(angle) < 60) {
        steps.push({ kind: 'straight', text: `Vaar door op ${outName}`, at: cum[i], dist: 0, point: coords[i], idx: i });
        continue;
      }
    }
    if (kind === 'straight' && !nameChanged) continue;
    if (kind === 'straight' && nameChanged) kind = 'straight';
    let text = turnText[kind];
    if (outName) text += ` naar ${outName}`;
    // vermijd dubbele meldingen binnen 40 m
    const last = steps[steps.length - 1];
    if (last && last.kind !== 'depart' && cum[i] - last.at < 40 && last.kind !== 'bridge' && last.kind !== 'lock' && last.kind !== 'movable_bridge') {
      last.text = text;
      last.kind = kind;
      last.at = cum[i];
      last.point = coords[i];
      last.idx = i;
      continue;
    }
    steps.push({ kind, text, at: cum[i], dist: 0, point: coords[i], idx: i });
  }

  // bruggen en sluizen invoegen als stappen
  const idxAt = (at: number) => {
    let lo = 0, hi = cum.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] < at) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  for (const b of bridges) {
    const mustOpen = b.height == null ? b.movable : b.height < p.height + p.margin;
    const kind: RouteStep['kind'] = b.movable && mustOpen ? 'movable_bridge' : 'bridge';
    const name = b.name ?? 'brug';
    const detail = b.height == null ? 'doorvaarthoogte onbekend' : `doorvaarthoogte ${formatHeight(b.height)}`;
    const text = kind === 'movable_bridge' ? `Wacht op opening ${name}` : `Vaar onder ${name} door`;
    steps.push({ kind, text, detail, at: b.at, dist: 0, point: b.point, idx: idxAt(b.at) });
  }
  for (const l of locks) {
    steps.push({ kind: 'lock', text: `Schut door ${l.name ?? 'sluis'}`, detail: `reken op ca. ${p.lockWait} min`, at: l.at, dist: 0, point: l.point, idx: idxAt(l.at) });
  }
  steps.sort((a, b) => a.at - b.at);
  const total = cum[cum.length - 1];
  const lastName = g.wayOf(r.edges[r.edges.length - 1]).n;
  steps.push({ kind: 'arrive', text: lastName ? `Bestemming bereikt via ${lastName}` : 'Bestemming bereikt', at: total, dist: 0, point: coords[coords.length - 1], idx: coords.length - 1 });
  for (let i = 0; i < steps.length - 1; i++) steps[i].dist = steps[i + 1].at - steps[i].at;
  return steps;
}

export interface RouteRequest {
  from: number;
  to: number;
  /** exacte start/eindpositie (wordt als kort stukje aan de route geplakt) */
  fromPoint?: LatLng;
  toPoint?: LatLng;
  profile: BoatProfile;
  alternatives?: number;
}

export interface RouteOutcome {
  routes: RouteResult[];
  /** waarom er geen route is, of waarom de snelste route zonder beperkingen niet kan */
  blockedInfo?: string;
}

const overlap = (a: RouteResult, b: RouteResult) => {
  const set = new Set(a.edgeIds);
  let shared = 0;
  for (const e of b.edgeIds) if (set.has(e)) shared += 1;
  return shared / Math.max(1, b.edgeIds.length);
};

export function computeRoutes(g: Graph, req: RouteRequest): RouteOutcome {
  const { from, to, profile } = req;
  const main = dijkstra(g, from, to, profile);
  if (!main) {
    // probeer zonder hoogte/beperkingen om uit te leggen waarom
    const relaxed: BoatProfile = { ...profile, height: 0, draft: 0, width: 0, allowMovable: true, avoidUnknownBridges: false };
    const test = dijkstra(g, from, to, relaxed);
    if (test) {
      // zoek de eerste blokkade op de vrije route
      let reason = '';
      for (const e of test.edges) {
        const ev = evalEdge(g, e, profile);
        if (!isFinite(ev.cost)) {
          reason = ev.blockedReason ?? '';
          break;
        }
      }
      return { routes: [], blockedInfo: `Geen route gevonden voor deze boot. De kortste route wordt geblokkeerd door: ${reason || 'een beperking'}. Pas de boothoogte, diepgang of brugopties aan.` };
    }
    return { routes: [], blockedInfo: 'Geen vaarverbinding gevonden tussen deze punten binnen het kaartgebied.' };
  }
  const routes: RouteResult[] = [buildResult(g, main, profile, 0, 'Snelste route', req.fromPoint, req.toPoint)];

  const wanted = req.alternatives ?? 2;
  const penalty = new Map<number, number>();
  for (const e of main.edges) penalty.set(e, 1.7);
  let tries = 0;
  while (routes.length < wanted + 1 && tries < 4) {
    tries++;
    const alt = dijkstra(g, from, to, profile, penalty);
    if (!alt) break;
    const res = buildResult(g, alt, profile, routes.length, `Alternatief ${routes.length}`, req.fromPoint, req.toPoint);
    const tooSimilar = routes.some((r) => overlap(r, res) > 0.75);
    const tooLong = res.duration > routes[0].duration * 1.6 + 600;
    for (const e of alt.edges) penalty.set(e, (penalty.get(e) ?? 1) * 1.7);
    if (tooSimilar || tooLong) continue;
    routes.push(res);
  }
  // labels: alternatief met minste bruggen / kortste afstand
  const shortest = routes.reduce((a, b) => (b.distance < a.distance ? b : a));
  const fewest = routes.reduce((a, b) => (b.bridges.length < a.bridges.length ? b : a));
  routes.forEach((r, i) => {
    if (i === 0) return;
    if (r === shortest && r.distance < routes[0].distance) r.label = 'Kortste afstand';
    else if (r === fewest && r.bridges.length < routes[0].bridges.length) r.label = 'Minste bruggen';
    else r.label = `Alternatief ${i}`;
  });
  return { routes };
}
