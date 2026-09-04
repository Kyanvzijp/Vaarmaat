import type { GraphData, LatLng, WayInfo } from './types';
import { fastDist, projectOnSegment } from './geo';

export interface Snap {
  /** dichtstbijzijnde knoop (eindpunt van de edge) */
  node: number;
  /** de edge waarop het punt geprojecteerd is, en de positie erop (0 = eerste knoop, 1 = tweede) */
  edge: number;
  t: number;
  /** afstand van het gekozen punt tot het water (m) */
  dist: number;
  /** het punt op het water */
  snapped: LatLng;
  comp: number;
}

const URBAN = /gracht|singel|burgwal|vest\b|binnenhaven|stadsgracht|haven\b/i;

/**
 * Snelheidsplafond (km/u, 0 = geen) en kostenfactor per vaarweg als OSM geen maxspeed geeft.
 * Grachten en singels: 6 km/u. Naamloze kanalen zijn meestal polderslootjes: langzaam en onaantrekkelijk,
 * zodat de route de echte vaarwegen volgt. Koppelstukjes (gaten in de data) zijn kort maar ongewenst.
 */
function classifyWay(w: WayInfo): [number, number] {
  if (w.t === 'connector') return [4, 3];
  if (w.t === 'fairway') return [0, 1];
  if (!w.n) return w.t === 'river' ? [9, 1.3] : [6, 1.8];
  if (URBAN.test(w.n)) return [6, 1];
  return [0, 1];
}

/** Geladen graaf met adjacency en ruimtelijke index */
export class Graph {
  data: GraphData;
  /** adjacency: nodeId -> lijst van edge indices */
  adj: Int32Array[];
  /** per edge: bruggen en sluizen */
  edgeBridges: Map<number, number[]> = new Map();
  edgeLocks: Map<number, number[]> = new Map();
  /** snelheidsplafond per vaarweg (km/u) als OSM geen maximum kent: grachten en naamloze sloten langzamer */
  wayCap: Float32Array;
  /** kostenfactor per vaarweg voor de routekeuze (1 = neutraal); naamloze sloten en koppelstukjes zijn onaantrekkelijk */
  wayFactor: Float32Array;
  private cellSize = 0.01; // ~1.1 km
  private grid: Map<string, number[]> = new Map(); // cell -> edge ids

  constructor(data: GraphData) {
    this.data = data;
    const n = data.nodes.length;
    const counts = new Int32Array(n);
    for (const e of data.edges) {
      counts[e[0]]++;
      counts[e[1]]++;
    }
    const lists: number[][] = Array.from({ length: n }, () => []);
    data.edges.forEach((e, i) => {
      lists[e[0]].push(i);
      lists[e[1]].push(i);
    });
    this.adj = lists.map((l) => Int32Array.from(l));

    this.wayCap = new Float32Array(data.ways.length);
    this.wayFactor = new Float32Array(data.ways.length);
    data.ways.forEach((w, i) => {
      const [cap, factor] = classifyWay(w);
      this.wayCap[i] = cap;
      this.wayFactor[i] = factor;
    });

    data.bridges.forEach((b, i) => {
      const l = this.edgeBridges.get(b.e) ?? [];
      l.push(i);
      this.edgeBridges.set(b.e, l);
    });
    data.locks.forEach((l, i) => {
      const arr = this.edgeLocks.get(l.e) ?? [];
      arr.push(i);
      this.edgeLocks.set(l.e, arr);
    });

    // ruimtelijke index op edges
    data.edges.forEach((e, i) => {
      const a = data.nodes[e[0]];
      const b = data.nodes[e[1]];
      const minLat = Math.min(a[0], b[0]), maxLat = Math.max(a[0], b[0]);
      const minLon = Math.min(a[1], b[1]), maxLon = Math.max(a[1], b[1]);
      for (let la = Math.floor(minLat / this.cellSize); la <= Math.floor(maxLat / this.cellSize); la++) {
        for (let lo = Math.floor(minLon / this.cellSize); lo <= Math.floor(maxLon / this.cellSize); lo++) {
          const k = `${la}:${lo}`;
          const arr = this.grid.get(k);
          if (arr) arr.push(i);
          else this.grid.set(k, [i]);
        }
      }
    });
  }

  get nodes() {
    return this.data.nodes;
  }
  get edges() {
    return this.data.edges;
  }

  degree(node: number): number {
    return this.adj[node].length;
  }

  otherEnd(edge: number, node: number): number {
    const e = this.data.edges[edge];
    return e[0] === node ? e[1] : e[0];
  }

  /** Vind dichtstbijzijnde punt op het vaarwegennet. Geeft edge, punt en afstand. */
  nearestEdge(p: LatLng, maxDist = 3000, comp?: number): { edge: number; point: LatLng; dist: number; t: number } | null {
    type Hit = { edge: number; point: LatLng; dist: number; t: number };
    let best: Hit | null = null;
    const seen = new Set<number>();
    for (let ring = 0; ring <= Math.ceil(maxDist / 1100); ring++) {
      const cla = Math.floor(p[0] / this.cellSize);
      const clo = Math.floor(p[1] / this.cellSize);
      for (let la = cla - ring; la <= cla + ring; la++) {
        for (let lo = clo - ring; lo <= clo + ring; lo++) {
          if (Math.abs(la - cla) !== ring && Math.abs(lo - clo) !== ring) continue;
          const cell = this.grid.get(`${la}:${lo}`);
          if (!cell) continue;
          for (const ei of cell) {
            if (seen.has(ei)) continue;
            seen.add(ei);
            const e = this.data.edges[ei];
            if (comp !== undefined && this.data.comp[e[0]] !== comp) continue;
            const [t, d, q] = projectOnSegment(p, this.data.nodes[e[0]], this.data.nodes[e[1]]);
            if (best === null || d < (best as Hit).dist) best = { edge: ei, point: q, dist: d, t };
          }
        }
      }
      // als de beste al dichterbij is dan de volgende ring kan opleveren: klaar
      const b = best as Hit | null;
      if (b && b.dist < ring * 1100 * 0.7) break;
    }
    const b = best as Hit | null;
    if (!b || b.dist > maxDist) return null;
    return b;
  }

  /** Dichtstbijzijnde punt op het net: de edge, de positie erop (t) en de dichtstbijzijnde knoop */
  nearestNode(p: LatLng, maxDist = 3000, comp?: number): Snap | null {
    const ne = this.nearestEdge(p, maxDist, comp);
    if (!ne) return null;
    const e = this.data.edges[ne.edge];
    const node = ne.t < 0.5 ? e[0] : e[1];
    return { node, edge: ne.edge, t: ne.t, dist: ne.dist, snapped: ne.point, comp: this.data.comp[node] };
  }

  /** Snap twee punten op hetzelfde samenhangende vaarwegennet */
  snapPair(a: LatLng, b: LatLng, maxDist = 3000): { a: Snap; b: Snap } | null {
    const A = this.nearestNode(a, maxDist);
    const B = this.nearestNode(b, maxDist);
    if (!A || !B) return null;
    if (A.comp === B.comp) return { a: A, b: B };
    const B2 = this.nearestNode(b, maxDist, A.comp);
    const A2 = this.nearestNode(a, maxDist, B.comp);
    const opt1 = B2 ? A.dist + B2.dist : Infinity;
    const opt2 = A2 ? A2.dist + B.dist : Infinity;
    if (!isFinite(opt1) && !isFinite(opt2)) {
      // beide naar het hoofdnet
      const A0 = this.nearestNode(a, maxDist * 2, 0);
      const B0 = this.nearestNode(b, maxDist * 2, 0);
      return A0 && B0 ? { a: A0, b: B0 } : null;
    }
    return opt1 <= opt2 ? { a: A, b: B2! } : { a: A2!, b: B };
  }

  wayOf(edge: number) {
    return this.data.ways[this.data.edges[edge][3]];
  }

  edgeLength(edge: number) {
    return this.data.edges[edge][2];
  }

  edgeMid(edge: number): LatLng {
    const e = this.data.edges[edge];
    const a = this.data.nodes[e[0]], b = this.data.nodes[e[1]];
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  }

  distBetween(a: number, b: number) {
    return fastDist(this.data.nodes[a], this.data.nodes[b]);
  }
}

let cached: Promise<Graph> | null = null;
export function loadGraph(url = `${import.meta.env.BASE_URL}data/graph.json`): Promise<Graph> {
  if (!cached) {
    cached = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`Kon vaarwegdata niet laden (${r.status})`);
        return r.json() as Promise<GraphData>;
      })
      .then((d) => new Graph(d));
  }
  return cached;
}
