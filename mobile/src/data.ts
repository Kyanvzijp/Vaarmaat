// Voorberekende data uit ../public/data, meegebundeld in de app zodat routeren ook offline werkt.
// Het laden gebeurt pas na de eerste render, zodat de kaart direct verschijnt.
import { Graph } from '@shared/graph';
import type { GraphData, Poi } from '@shared/types';

let graph: Promise<Graph> | null = null;
let pois: Promise<Poi[]> | null = null;

const later = <T,>(fn: () => T) => new Promise<T>((resolve, reject) => setTimeout(() => {
  try {
    resolve(fn());
  } catch (e) {
    reject(e);
  }
}, 0));

export function loadGraph(): Promise<Graph> {
  if (!graph) graph = later(() => new Graph(require('@data/graph.json') as GraphData));
  return graph;
}

export function loadPois(): Promise<Poi[]> {
  if (!pois) pois = later(() => require('@data/pois.json') as Poi[]);
  return pois;
}
