import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, CircleMarker, useMap, useMapEvents, Tooltip, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import type { LatLng, Poi, RouteResult, RouteStep } from '../types';
import { formatHeight, formatDistance } from '../geo';
import { POI_META } from '../pois';
import type { Stage } from '../trip';

const pin = (color: string, label: string) =>
  L.divIcon({
    className: 'pin-wrap',
    html: `<div class="pin" style="--c:${color}"><span>${label}</span></div>`,
    iconSize: [30, 40],
    iconAnchor: [15, 40],
  });
const startIcon = pin('#0a8f5b', 'A');
const endIcon = pin('#d33b3b', 'B');
const viaIcon = (n: number) => pin('#0a66ff', String(n));
const stopIcon = (n: number) => L.divIcon({ className: 'pin-wrap', html: `<div class="pin stop" style="--c:#8a2be2"><span>🛏️</span><em>dag ${n}</em></div>`, iconSize: [30, 40], iconAnchor: [15, 40] });

const boatIcon = (heading: number) =>
  L.divIcon({
    className: 'boat-wrap',
    html: `<div class="boat" style="transform: rotate(${heading}deg)"><svg viewBox="0 0 24 24" width="34" height="34"><path d="M12 2 L19 20 L12 16 L5 20 Z" fill="#0a66ff" stroke="white" stroke-width="1.5"/></svg></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });

const poiIconCache = new Map<string, L.DivIcon>();
const poiIcon = (poi: Poi, fav: boolean) => {
  const key = poi.k + (fav ? 'f' : '');
  let ic = poiIconCache.get(key);
  if (!ic) {
    const m = POI_META[poi.k];
    ic = L.divIcon({ className: 'poi-wrap', html: `<div class="poi-marker ${fav ? 'fav' : ''}" style="--c:${m.color}">${m.icon}</div>`, iconSize: [26, 26], iconAnchor: [13, 13] });
    poiIconCache.set(key, ic);
  }
  return ic;
};

interface Props {
  waypoints: { point: LatLng; name: string }[];
  routes: RouteResult[];
  selected: number;
  onSelect: (i: number) => void;
  onMapClick?: (p: LatLng) => void;
  picking: boolean;
  gps: { pos: LatLng; heading: number | null } | null;
  follow: boolean;
  onUserMove: () => void;
  focusStep: RouteStep | null;
  focusPoint: LatLng | null;
  fitKey: number;
  navigating: boolean;
  pois: Poi[];
  showPois: boolean;
  onPoiClick: (p: Poi) => void;
  favs: Set<string>;
  stages: Stage[];
  track: LatLng[];
}

function Events({ onMapClick, onUserMove, onView }: { onMapClick?: (p: LatLng) => void; onUserMove: () => void; onView: (b: L.LatLngBounds, z: number) => void }) {
  const map = useMapEvents({
    click(e) {
      onMapClick?.([e.latlng.lat, e.latlng.lng]);
    },
    dragstart() {
      onUserMove();
    },
    moveend() {
      onView(map.getBounds(), map.getZoom());
    },
    zoomend() {
      onView(map.getBounds(), map.getZoom());
    },
  });
  useEffect(() => {
    onView(map.getBounds(), map.getZoom());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function Fit({ routes, selected, fitKey, waypoints }: { routes: RouteResult[]; selected: number; fitKey: number; waypoints: { point: LatLng }[] }) {
  const map = useMap();
  useEffect(() => {
    const r = routes[selected];
    const wide = window.innerWidth >= 900;
    const opts = { paddingTopLeft: (wide ? [480, 40] : [30, 230]) as [number, number], paddingBottomRight: (wide ? [40, 40] : [30, Math.round(window.innerHeight * 0.48)]) as [number, number] };
    if (r) map.fitBounds(L.latLngBounds(r.coords.map((c) => L.latLng(c[0], c[1]))), opts);
    else if (waypoints.length >= 2) map.fitBounds(L.latLngBounds(waypoints.map((w) => L.latLng(w.point[0], w.point[1]))), opts);
    else if (waypoints.length === 1) map.setView(waypoints[0].point, 13);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);
  return null;
}

function Follow({ gps, follow, navigating }: { gps: Props['gps']; follow: boolean; navigating: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (follow && gps) map.setView(gps.pos, navigating ? Math.max(map.getZoom(), 15) : map.getZoom(), { animate: true });
  }, [gps, follow, navigating, map]);
  return null;
}

function FocusStep({ step, point }: { step: RouteStep | null; point: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (step) map.setView(step.point, 16, { animate: true });
  }, [step, map]);
  useEffect(() => {
    if (point) map.setView(point, Math.max(map.getZoom(), 14), { animate: true });
  }, [point, map]);
  return null;
}

export default function MapView(p: Props) {
  const center = useMemo<LatLng>(() => [52.17, 4.62], []);
  const sel = p.routes[p.selected];
  const [view, setView] = useState<{ b: L.LatLngBounds; z: number } | null>(null);
  const visiblePois = useMemo(() => {
    if (!p.showPois || !view || view.z < 12) return [] as Poi[];
    const b = view.b.pad(0.1);
    const out: Poi[] = [];
    const important = view.z < 14;
    for (const poi of p.pois) {
      if (important && !(poi.k === 'marina' || poi.k === 'harbour' || poi.k === 'fuel' || p.favs.has(poi.id))) continue;
      if (b.contains(L.latLng(poi.p[0], poi.p[1]))) out.push(poi);
      if (out.length > 600) break;
    }
    return out;
  }, [p.pois, p.showPois, view, p.favs]);

  return (
    <MapContainer center={center} zoom={11} className={`map ${p.picking ? 'picking' : ''}`} zoomControl={false} attributionControl={true}>
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Kaart">
          <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' maxZoom={19} />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Satelliet">
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="Tiles &copy; Esri" maxZoom={19} />
        </LayersControl.BaseLayer>
        <LayersControl.Overlay checked name="Zeekaart symbolen (OpenSeaMap)">
          <TileLayer url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openseamap.org">OpenSeaMap</a>' maxZoom={18} />
        </LayersControl.Overlay>
      </LayersControl>
      <Events onMapClick={p.onMapClick} onUserMove={p.onUserMove} onView={(b, z) => setView({ b, z })} />
      <Fit routes={p.routes} selected={p.selected} fitKey={p.fitKey} waypoints={p.waypoints} />
      <Follow gps={p.gps} follow={p.follow} navigating={p.navigating} />
      <FocusStep step={p.focusStep} point={p.focusPoint} />

      {visiblePois.map((poi) => (
        <Marker key={poi.id} position={poi.p} icon={poiIcon(poi, p.favs.has(poi.id))} eventHandlers={{ click: () => p.onPoiClick(poi) }} zIndexOffset={poi.k === 'marina' ? 200 : 100}>
          <Tooltip>{poi.n ?? POI_META[poi.k].label}</Tooltip>
        </Marker>
      ))}

      {p.track.length > 1 && <Polyline positions={p.track} pathOptions={{ color: '#ff5a1f', weight: 3, opacity: 0.8, dashArray: '2 6' }} />}

      {p.routes.map((r, i) =>
        i === p.selected ? null : (
          <Polyline key={r.id} positions={r.coords} pathOptions={{ color: '#7a8699', weight: 6, opacity: 0.6 }} eventHandlers={{ click: () => p.onSelect(i) }}>
            <Tooltip sticky>{r.label}</Tooltip>
          </Polyline>
        ),
      )}
      {sel && (
        <>
          <Polyline positions={sel.coords} pathOptions={{ color: '#ffffff', weight: 10, opacity: 0.9 }} />
          <Polyline positions={sel.coords} pathOptions={{ color: '#0a66ff', weight: 6, opacity: 1 }} />
          {[sel.access?.start, sel.access?.end].map((leg, i) =>
            leg ? (
              <Polyline key={`a${i}`} positions={[leg.point, leg.water]} pathOptions={{ color: '#5d6b85', weight: 3, opacity: 0.9, dashArray: '4 8' }}>
                <Tooltip>Over land: {formatDistance(leg.walkDistance)} lopen</Tooltip>
              </Polyline>
            ) : null,
          )}
          {sel.bridges.map((b, i) => (
            <CircleMarker key={`b${i}`} center={b.point} radius={6} pathOptions={{ color: '#fff', fillColor: b.movable ? '#e08a00' : '#334', fillOpacity: 1, weight: 2 }}>
              <Tooltip>{b.name ?? 'Brug'} · {b.movable ? 'beweegbaar · ' : ''}{formatHeight(b.height)}</Tooltip>
            </CircleMarker>
          ))}
          {sel.locks.map((l, i) => (
            <CircleMarker key={`l${i}`} center={l.point} radius={7} pathOptions={{ color: '#fff', fillColor: '#8a2be2', fillOpacity: 1, weight: 2 }}>
              <Tooltip>{l.name ?? 'Sluis'}</Tooltip>
            </CircleMarker>
          ))}
          {p.stages.filter((s) => s.stop).map((s) => (
            <Marker key={`s${s.day}`} position={s.stop!.poi.p} icon={stopIcon(s.day)} zIndexOffset={500}>
              <Tooltip>Overnachting dag {s.day}: {s.stop!.poi.n ?? 'aanlegplaats'}</Tooltip>
            </Marker>
          ))}
        </>
      )}
      {p.waypoints.map((w, i) => (
        <Marker key={`w${i}`} position={w.point} icon={i === 0 ? startIcon : i === p.waypoints.length - 1 ? endIcon : viaIcon(i)} zIndexOffset={600} />
      ))}
      {p.gps && <Marker position={p.gps.pos} icon={boatIcon(p.gps.heading ?? 0)} zIndexOffset={1000} />}
    </MapContainer>
  );
}
