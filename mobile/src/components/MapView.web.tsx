// Alleen voor de browser-preview (npm run web): react-native-maps bestaat niet op het web.
// Tekent route, punten, bruggen en sluizen als eenvoudige SVG op een vlak, zodat schermen en routering
// zonder telefoon te testen zijn. De echte app gebruikt MapView.tsx.
import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { LatLng } from '@shared/types';
import type { MapHandle, MapProps } from './MapView';
import { C } from '../theme';

type Props = MapProps;
type Box = { minLat: number; maxLat: number; minLon: number; maxLon: number };

const DEFAULT: Box = { minLat: 51.95, maxLat: 52.4, minLon: 4.3, maxLon: 4.95 };

function boxOf(pts: LatLng[]): Box {
  if (pts.length < 2) return DEFAULT;
  let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
  for (const [a, b] of pts) {
    minLat = Math.min(minLat, a);
    maxLat = Math.max(maxLat, a);
    minLon = Math.min(minLon, b);
    maxLon = Math.max(maxLon, b);
  }
  const pad = Math.max(maxLat - minLat, maxLon - minLon) * 0.15 + 0.005;
  return { minLat: minLat - pad * 1.6, maxLat: maxLat + pad * 0.6, minLon: minLon - pad, maxLon: maxLon + pad };
}

const MapView = forwardRef<MapHandle, Props>(function MapView(p, ref) {
  const [size, setSize] = useState({ w: 400, h: 800 });
  const [box, setBox] = useState<Box>(DEFAULT);
  useImperativeHandle(ref, () => ({
    fit: (coords) => setBox(boxOf(coords)),
    center: () => undefined,
  }), []);
  const sel = p.routes[p.selected];
  const xy = useMemo(() => (q: LatLng) => [((q[1] - box.minLon) / (box.maxLon - box.minLon)) * size.w, ((box.maxLat - q[0]) / (box.maxLat - box.minLat)) * size.h] as const, [box, size]);
  const path = (pts: LatLng[]) => pts.map((q) => xy(q).join(',')).join(' ');
  return (
    <View
      style={[StyleSheet.absoluteFill, { backgroundColor: C.water }]}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      <svg
        width={size.w}
        height={size.h}
        onClick={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const x = e.clientX - r.left, y = e.clientY - r.top;
          p.onMapPress([box.maxLat - (y / size.h) * (box.maxLat - box.minLat), box.minLon + (x / size.w) * (box.maxLon - box.minLon)]);
        }}
      >
        {p.routes.map((r, i) => (i === p.selected ? null : <polyline key={r.id} points={path(r.coords)} fill="none" stroke="#7a8699" strokeOpacity={0.6} strokeWidth={6} onClick={() => p.onSelect(i)} />))}
        {sel && <polyline points={path(sel.coords)} fill="none" stroke="#fff" strokeWidth={10} />}
        {sel && <polyline points={path(sel.coords)} fill="none" stroke={C.blue} strokeWidth={6} />}
        {sel?.bridges.map((b, i) => <circle key={`b${i}`} cx={xy(b.point)[0]} cy={xy(b.point)[1]} r={6} fill={b.movable ? C.movable : C.bridge} stroke="#fff" strokeWidth={2} />)}
        {sel?.locks.map((l, i) => <circle key={`l${i}`} cx={xy(l.point)[0]} cy={xy(l.point)[1]} r={7} fill={C.lock} stroke="#fff" strokeWidth={2} />)}
        {p.track.length > 1 && <polyline points={path(p.track)} fill="none" stroke={C.track} strokeWidth={3} strokeDasharray="2 6" />}
        {p.waypoints.map((w, i) => (
          <circle key={`w${i}`} cx={xy(w.point)[0]} cy={xy(w.point)[1]} r={10} fill={i === 0 ? C.starboard : i === p.waypoints.length - 1 ? C.port : C.blue} stroke="#fff" strokeWidth={2} />
        ))}
        {p.gps && <circle cx={xy(p.gps.pos)[0]} cy={xy(p.gps.pos)[1]} r={8} fill={C.blue} stroke="#fff" strokeWidth={3} />}
      </svg>
      <Text style={styles.note} pointerEvents="none">Browser-preview zonder kaarttegels</Text>
    </View>
  );
});

export default MapView;

const styles = StyleSheet.create({
  note: { position: 'absolute', left: 6, bottom: 2, fontSize: 9, color: C.muted },
});
