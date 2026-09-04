export type LatLng = [number, number]; // [lat, lon]

export interface WayInfo {
  /** naam van de vaarweg */
  n: string | null;
  /** type: canal, river, fairway, ditch, ... */
  t: string;
  /** maximale doorvaarthoogte (m) op deze vaarweg zelf, null = onbekend */
  h: number | null;
  /** maximale diepgang (m) */
  d: number | null;
  /** maximale breedte (m) */
  w: number | null;
  /** maximumsnelheid km/h */
  s: number | null;
  /** motorboot verboden */
  nm?: 1;
  /** boten verboden */
  nb?: 1;
}

export interface BridgeInfo {
  n: string | null;
  /** bedieningsinfo */
  o?: OpsInfo;
  /** doorvaarthoogte (m), null = onbekend */
  h: number | null;
  /** beweegbaar */
  m: 0 | 1;
  /** edge index */
  e: number;
  p: LatLng;
}

export interface LockInfo {
  n: string | null;
  o?: OpsInfo;
  e: number;
  p: LatLng;
}

export interface GraphData {
  meta: { bbox: number[]; source: string; generated: string; nodes: number; edges: number };
  nodes: LatLng[];
  /** component-id per knoop (0 = grootste samenhangende vaarwegennet) */
  comp: number[];
  /** [a, b, lengteMeters, wayIndex] */
  edges: [number, number, number, number][];
  ways: WayInfo[];
  bridges: BridgeInfo[];
  locks: LockInfo[];
}

export type BoatType = 'sloep' | 'motorboot' | 'zeilboot' | 'zeilboot_mast' | 'speedboot' | 'kano';

export interface BoatProfile {
  type: BoatType;
  name: string;
  /** hoogte boven water (m) */
  height: number;
  /** diepgang (m) */
  draft: number;
  /** breedte (m) */
  width: number;
  /** kruissnelheid km/h */
  speed: number;
  /** beweegbare bruggen gebruiken */
  allowMovable: boolean;
  /** gemiddelde wachttijd beweegbare brug (min) */
  bridgeWait: number;
  /** gemiddelde wachttijd sluis (min) */
  lockWait: number;
  /** veiligheidsmarge onder bruggen (m) */
  margin: number;
  /** vermijd bruggen met onbekende hoogte */
  avoidUnknownBridges: boolean;
}

export interface RouteStep {
  kind: 'depart' | 'left' | 'right' | 'slight_left' | 'slight_right' | 'sharp_left' | 'sharp_right' | 'straight' | 'bridge' | 'movable_bridge' | 'lock' | 'arrive' | 'uturn';
  text: string;
  detail?: string;
  /** afstand vanaf start (m) */
  at: number;
  /** afstand tot volgende stap (m) */
  dist: number;
  point: LatLng;
  /** index in route.coords */
  idx: number;
}

export interface RouteResult {
  id: number;
  label: string;
  coords: LatLng[];
  nodeIds: number[];
  edgeIds: number[];
  /** meter */
  distance: number;
  /** seconden, inclusief wachttijden */
  duration: number;
  /** cumulatieve afstand per coord */
  cum: number[];
  steps: RouteStep[];
  bridges: { name: string | null; height: number | null; movable: boolean; at: number; point: LatLng; ops?: OpsInfo }[];
  locks: { name: string | null; at: number; point: LatLng; ops?: OpsInfo }[];
  lowestBridge: number | null;
  unknownBridges: number;
  waterways: string[];
  warnings: string[];
}

export type PoiKind = 'marina' | 'mooring' | 'harbour' | 'fuel' | 'slipway' | 'pumpout' | 'water' | 'shop' | 'anchorage' | 'no_mooring' | 'no_anchor' | 'restricted' | 'boatyard';

export interface Poi {
  id: string;
  k: PoiKind;
  n: string | null;
  p: LatLng;
  /** extra info: website, phone, opening_hours, fee, capacity, description, operator, category */
  t: Record<string, string>;
}

/** Bedieningsinformatie voor bruggen en sluizen */
export interface OpsInfo {
  /** bedieningstijden (OSM opening_hours) */
  oh?: string;
  /** marifoonkanaal */
  vhf?: string;
  tel?: string;
  op?: string;
  web?: string;
  /** zelfbediening */
  self?: 1;
  note?: string;
}

export interface Trip {
  id: string;
  name: string;
  waypoints: { name: string; point: LatLng }[];
  hoursPerDay: number;
  startTime: string; // HH:MM
  createdAt: string;
  notes?: string;
}

export interface LogEntry {
  id: string;
  date: string;
  from: string;
  to: string;
  distance: number;
  duration: number;
  maxSpeed: number;
  avgSpeed: number;
  track: LatLng[];
}
