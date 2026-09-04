import type { Graph, Snap } from './graph';
import type { BoatProfile, LatLng, RouteResult, RouteStep } from './types';
import { bearing, turnAngle, formatHeight, fastDist, projectOnSegment } from './geo';

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

/**
 * Realistische tijden. De kruissnelheid uit het profiel is wat je op open water haalt; in de praktijk
 * vaar je langzamer door bochten, wind, ander verkeer en langs steigers. Een vaste brug kost tijd om
 * rustig onderdoor te gaan, bij een sluis wacht je eerst aan het remmingwerk voordat je schut.
 */
export const REALISM = {
  /** deel van de kruissnelheid dat je gemiddeld haalt */
  efficiency: 0.9,
  /** seconden per vaste brug (vaart minderen, uitlijnen) */
  fixedBridge: 30,
  /** seconden per brug met onbekende hoogte (onzekerheid) */
  unknownBridge: 45,
  /** seconden extra per beweegbare brug die laag (< 1 m) of naamloos is: vaak zelfbediening of op afspraak */
  smallMovableExtra: 300,
  /** seconden aanmeren en wachten voor een sluis, boven op de schuttijd uit het profiel */
  lockApproach: 300,
};

export interface EdgeEval {
  /** kosten voor de routekeuze (seconden maal voorkeursfactor), of Infinity als niet bevaarbaar */
  cost: number;
  /** zuivere vaartijd in seconden */
  time: number;
  /** wachten en schutten in seconden */
  wait: number;
  blockedReason?: string;
}

const BLOCKED = (reason: string): EdgeEval => ({ cost: Infinity, time: Infinity, wait: 0, blockedReason: reason });

/** Kosten (in seconden) om een edge te bevaren met dit bootprofiel */
export function evalEdge(g: Graph, edge: number, p: BoatProfile): EdgeEval {
  const way = g.wayOf(edge);
  const wayIdx = g.edges[edge][3];
  if (way.nb) return BLOCKED('vaarverbod');
  if (way.nm && p.type !== 'kano') return BLOCKED('verboden voor motorboten');
  if (way.d != null && p.draft > way.d) return BLOCKED(`te ondiep (max ${formatHeight(way.d)})`);
  if (way.w != null && p.width > way.w) return BLOCKED(`te smal (max ${formatHeight(way.w)})`);
  if (way.h != null && p.height + p.margin > way.h) return BLOCKED(`doorvaarthoogte ${formatHeight(way.h)}`);

  let speed = p.speed;
  if (way.s != null && way.s < speed) speed = way.s;
  const cap = g.wayCap[wayIdx];
  if (cap > 0 && cap < speed) speed = cap;
  speed = Math.max(speed * REALISM.efficiency, 1);
  let time = (g.edgeLength(edge) / 1000 / speed) * 3600;
  let wait = 0;

  const bridges = g.edgeBridges.get(edge);
  if (bridges) {
    for (const bi of bridges) {
      const b = g.data.bridges[bi];
      if (b.h == null) {
        if (b.m) {
          if (!p.allowMovable) return BLOCKED(`beweegbare brug ${b.n ?? ''}`.trim());
          wait += p.bridgeWait * 60 + (b.n ? 0 : REALISM.smallMovableExtra);
        } else if (p.avoidUnknownBridges) {
          return BLOCKED(`brug met onbekende hoogte ${b.n ?? ''}`.trim());
        } else {
          time += REALISM.unknownBridge;
        }
        continue;
      }
      if (p.height + p.margin <= b.h) {
        time += REALISM.fixedBridge;
        continue;
      }
      if (b.m && p.allowMovable) {
        wait += p.bridgeWait * 60 + (b.h < 1.0 || !b.n ? REALISM.smallMovableExtra : 0);
      } else {
        return BLOCKED(`${b.n ?? 'brug'} te laag (${formatHeight(b.h)})`);
      }
    }
  }
  const locks = g.edgeLocks.get(edge);
  if (locks) wait += locks.length * (p.lockWait * 60 + REALISM.lockApproach);
  return { cost: (time + wait) * g.wayFactor[wayIdx], time, wait };
}

/** Begin- of eindpunt van een zoektocht: een knoop plus de kosten van het stukje edge tot het geprojecteerde punt */
interface Terminal {
  node: number;
  cost: number;
  time: number;
  wait: number;
  /** lengte van het stukje edge (m) */
  len: number;
}

/** Beide eindknopen van de edge waarop het punt ligt, met de kosten van het deel tot het punt */
function terminals(g: Graph, snap: Snap | undefined, node: number, p: BoatProfile): Terminal[] {
  if (!snap) return [{ node, cost: 0, time: 0, wait: 0, len: 0 }];
  const e = g.edges[snap.edge];
  const ev = evalEdge(g, snap.edge, p);
  if (!isFinite(ev.cost)) return [{ node: snap.node, cost: 0, time: 0, wait: 0, len: 0 }];
  const out: Terminal[] = [];
  for (const [n, frac] of [
    [e[0], snap.t],
    [e[1], 1 - snap.t],
  ] as [number, number][]) {
    out.push({ node: n, cost: ev.cost * frac, time: ev.time * frac, wait: ev.wait * frac, len: e[2] * frac });
  }
  return out;
}

interface DijkstraResult {
  nodes: number[];
  edges: number[];
  cost: number;
  start: Terminal;
  end: Terminal;
}

function dijkstra(g: Graph, sources: Terminal[], targets: Terminal[], goal: LatLng, p: BoatProfile, penalty?: Map<number, number>): DijkstraResult | null {
  const n = g.nodes.length;
  const dist = new Float64Array(n).fill(Infinity);
  const prevNode = new Int32Array(n).fill(-1);
  const prevEdge = new Int32Array(n).fill(-1);
  const done = new Uint8Array(n);
  const heap = new Heap();
  // A* heuristiek: rechte lijn naar het doel op kruissnelheid (altijd sneller dan de werkelijkheid, dus toelaatbaar)
  const hs = (Math.max(p.speed, 1) / 3.6) * 1.05;
  const h = (node: number) => {
    const a = g.nodes[node];
    const x = (goal[1] - a[1]) * 111320 * Math.cos((a[0] * Math.PI) / 180);
    const y = (goal[0] - a[0]) * 110540;
    return Math.sqrt(x * x + y * y) / hs;
  };
  const startOf = new Map<number, Terminal>();
  for (const s of sources) {
    if (s.cost < dist[s.node]) {
      dist[s.node] = s.cost;
      startOf.set(s.node, s);
      heap.push(s.cost + h(s.node), s.node);
    }
  }
  const targetOf = new Map<number, Terminal>();
  for (const t of targets) if (!targetOf.has(t.node) || t.cost < targetOf.get(t.node)!.cost) targetOf.set(t.node, t);
  let best: { node: number; total: number } | null = null;
  while (heap.size) {
    const [key, u] = heap.pop()!;
    if (best && key >= best.total) break;
    if (done[u]) continue;
    done[u] = 1;
    const tgt = targetOf.get(u);
    if (tgt) {
      const total = dist[u] + tgt.cost;
      if (!best || total < best.total) best = { node: u, total };
    }
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
  if (!best) return null;
  const nodes: number[] = [];
  const edges: number[] = [];
  let cur = best.node;
  while (prevNode[cur] !== -1) {
    nodes.push(cur);
    edges.push(prevEdge[cur]);
    cur = prevNode[cur];
  }
  nodes.push(cur);
  nodes.reverse();
  edges.reverse();
  return { nodes, edges, cost: best.total, start: startOf.get(cur)!, end: targetOf.get(best.node)! };
}

/** Positie van een object op een edge, gemeten in de vaarrichting (0..1) */
function fracOnEdge(g: Graph, edge: number, fromNode: number, point: LatLng): number {
  const e = g.edges[edge];
  const [t] = projectOnSegment(point, g.nodes[e[0]], g.nodes[e[1]]);
  return fromNode === e[0] ? t : 1 - t;
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
  let sailTime = 0;
  let waitTime = 0;
  for (const e of r.edges) {
    const ev = evalEdge(g, e, p);
    sailTime += ev.time;
    waitTime += ev.wait;
  }

  const bridges: RouteResult['bridges'] = [];
  const locks: RouteResult['locks'] = [];
  let lowest: number | null = null;
  let unknown = 0;
  r.edges.forEach((e, i) => {
    const len = g.edgeLength(e);
    const bl = g.edgeBridges.get(e);
    if (bl)
      for (const bi of bl) {
        const b = g.data.bridges[bi];
        bridges.push({ name: b.n, height: b.h, movable: !!b.m, at: cum[i] + fracOnEdge(g, e, r.nodes[i], b.p) * len, point: b.p, ops: b.o });
        if (b.h == null) unknown++;
        else if (lowest == null || b.h < lowest) lowest = b.h;
      }
    const ll = g.edgeLocks.get(e);
    if (ll)
      for (const li of ll) {
        const l = g.data.locks[li];
        locks.push({ name: l.n, at: cum[i] + fracOnEdge(g, e, r.nodes[i], l.p) * len, point: l.p, ops: l.o });
      }
  });
  bridges.sort((a, b) => a.at - b.at);
  locks.sort((a, b) => a.at - b.at);

  const waterways: string[] = [];
  for (const e of r.edges) {
    const nm = g.wayOf(e).n;
    if (nm && waterways[waterways.length - 1] !== nm) waterways.push(nm);
  }
  const warnings: string[] = [];
  if (unknown > 0) warnings.push(`${unknown} brug${unknown > 1 ? 'gen' : ''} met onbekende doorvaarthoogte op de route. Controleer ter plaatse.`);
  const movableCount = bridges.filter((b) => b.movable && (b.height == null || b.height < p.height + p.margin)).length;
  if (movableCount > 0) warnings.push(`${movableCount} beweegbare brug${movableCount > 1 ? 'gen' : ''} moet${movableCount > 1 ? 'en' : ''} voor je open. Let op bedieningstijden.`);

  const steps = r.edges.length > 0 ? buildSteps(g, r, coords, cum, bridges, locks, p) : [];
  const res: RouteResult = {
    id,
    label,
    coords: [...coords],
    nodeIds: r.nodes,
    edgeIds: r.edges,
    distance,
    duration: sailTime + waitTime,
    sailTime,
    waitTime,
    cum: [...cum],
    steps,
    bridges,
    locks,
    lowestBridge: lowest,
    unknownBridges: unknown,
    waterways,
    warnings,
  };
  attachEndpoints(res, r.start, r.end, fromPoint, toPoint);
  return res;
}

/** Voeg de stukjes edge tot het geprojecteerde vertrek- en aankomstpunt toe */
function attachEndpoints(res: RouteResult, start: Terminal, end: Terminal, fromPoint?: LatLng, toPoint?: LatLng) {
  if (fromPoint) {
    const d0 = fastDist(fromPoint, res.coords[0]);
    if (d0 > 5) {
      res.coords.unshift(fromPoint);
      res.cum = [0, ...res.cum.map((c) => c + d0)];
      res.distance += d0;
      res.sailTime += start.time;
      res.waitTime += start.wait;
      for (const s of res.steps) {
        s.at += d0;
        s.idx += 1;
      }
      if (res.steps.length) {
        res.steps[0].at = 0;
        res.steps[0].idx = 0;
        res.steps[0].point = fromPoint;
        res.steps[0].dist += d0;
      }
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
      res.sailTime += end.time;
      res.waitTime += end.wait;
      const arrive = res.steps[res.steps.length - 1];
      if (arrive) {
        arrive.at = res.distance;
        arrive.idx = res.coords.length - 1;
        arrive.point = toPoint;
        if (res.steps.length > 1) res.steps[res.steps.length - 2].dist += d1;
      }
    }
  }
  res.duration = res.sailTime + res.waitTime;
}

/** Vertrek en bestemming liggen op hetzelfde vaarwegsegment: rechtstreeks varen */
function sameEdgeRoute(g: Graph, a: Snap, b: Snap, p: BoatProfile, id: number, label: string): RouteResult | null {
  const ev = evalEdge(g, a.edge, p);
  if (!isFinite(ev.cost)) return null;
  const frac = Math.abs(a.t - b.t);
  const distance = g.edgeLength(a.edge) * frac;
  const name = g.wayOf(a.edge).n;
  const steps: RouteStep[] = [
    { kind: 'depart', text: name ? `Vertrek over ${name}` : 'Vertrek', at: 0, dist: distance, point: a.snapped, idx: 0 },
    { kind: 'arrive', text: name ? `Bestemming bereikt via ${name}` : 'Bestemming bereikt', at: distance, dist: 0, point: b.snapped, idx: 1 },
  ];
  return {
    id,
    label,
    coords: [a.snapped, b.snapped],
    nodeIds: [],
    edgeIds: [a.edge],
    distance,
    duration: (ev.time + ev.wait) * frac,
    sailTime: ev.time * frac,
    waitTime: ev.wait * frac,
    cum: [0, distance],
    steps,
    bridges: [],
    locks: [],
    lowestBridge: null,
    unknownBridges: 0,
    waterways: name ? [name] : [],
    warnings: [],
  };
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
    steps.push({ kind: 'lock', text: `Schut door ${l.name ?? 'sluis'}`, detail: `reken op ca. ${p.lockWait + Math.round(REALISM.lockApproach / 60)} min`, at: l.at, dist: 0, point: l.point, idx: idxAt(l.at) });
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
  /** exacte start/eindpositie op het water (wordt als kort stukje aan de route geplakt) */
  fromPoint?: LatLng;
  toPoint?: LatLng;
  /** volledige snap-informatie; dan begint en eindigt de zoektocht op het geprojecteerde punt in plaats van de dichtstbijzijnde knoop */
  fromSnap?: Snap;
  toSnap?: Snap;
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
  const goal = req.toPoint ?? g.nodes[to];
  if (req.fromSnap && req.toSnap && req.fromSnap.edge === req.toSnap.edge) {
    const r = sameEdgeRoute(g, req.fromSnap, req.toSnap, profile, 0, 'Snelste route');
    if (r) return { routes: [r] };
  }
  const search = (prof: BoatProfile, penalty?: Map<number, number>) => dijkstra(g, terminals(g, req.fromSnap, from, prof), terminals(g, req.toSnap, to, prof), goal, prof, penalty);
  const main = search(profile);
  if (!main) {
    // probeer zonder hoogte/beperkingen om uit te leggen waarom
    const relaxed: BoatProfile = { ...profile, height: 0, draft: 0, width: 0, allowMovable: true, avoidUnknownBridges: false };
    const test = search(relaxed);
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
    const alt = search(profile, penalty);
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
