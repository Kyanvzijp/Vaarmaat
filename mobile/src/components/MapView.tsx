// Kaart met react-native-maps: OpenStreetMap als basis (of satelliet), OpenSeaMap-symbolen erover,
// route, alternatieven, bruggen, sluizen, POI's, overnachtingen, spoor en de bootpositie. Zie STYLEGUIDE 5 en 7.
import { forwardRef, memo, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Map, { Marker, Polyline, UrlTile, type MapPressEvent, type Region } from 'react-native-maps';
import type { LatLng, Poi, RouteResult, RouteStep } from '@shared/types';
import { POI_META } from '@shared/pois';
import type { Stage } from '@shared/trip';
import { C, SHADOW } from '../theme';

const OSM = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const SEAMARKS = 'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png';
const START: Region = { latitude: 52.17, longitude: 4.62, latitudeDelta: 0.35, longitudeDelta: 0.35 };

const ll = (p: LatLng) => ({ latitude: p[0], longitude: p[1] });
const zoomOf = (r: Region) => Math.log2(360 / Math.max(r.longitudeDelta, 1e-6));
const deltaFor = (zoom: number) => 360 / 2 ** zoom;

export interface MapHandle {
  /** route of punten passend in beeld, met ruimte voor bovenbalk en sheet */
  fit: (coords: LatLng[], padding: { top: number; bottom: number }) => void;
  center: (p: LatLng, minZoom?: number) => void;
}

export interface MapProps {
  waypoints: { point: LatLng; name: string }[];
  routes: RouteResult[];
  selected: number;
  onSelect: (i: number) => void;
  onMapPress: (p: LatLng) => void;
  gps: { pos: LatLng; heading: number | null } | null;
  follow: boolean;
  onUserMove: () => void;
  focusStep: RouteStep | null;
  navigating: boolean;
  pois: Poi[];
  showPois: boolean;
  onPoiPress: (p: Poi) => void;
  favs: Set<string>;
  stages: Stage[];
  track: LatLng[];
  /** ruimte bovenin voor de kaartknoppen */
  topInset: number;
}

function Pin({ color, label }: { color: string; label: string }) {
  return (
    <View style={st.pinWrap}>
      <View style={[st.pin, { backgroundColor: color }]}>
        <Text style={st.pinText}>{label}</Text>
      </View>
      <View style={[st.pinTip, { borderTopColor: color }]} />
    </View>
  );
}

const PoiMarker = memo(function PoiMarker({ poi, fav, onPress }: { poi: Poi; fav: boolean; onPress: (p: Poi) => void }) {
  const m = POI_META[poi.k];
  return (
    <Marker coordinate={ll(poi.p)} onPress={() => onPress(poi)} tracksViewChanges={false} anchor={{ x: 0.5, y: 0.5 }} zIndex={poi.k === 'marina' ? 200 : 100} title={poi.n ?? m.label}>
      <View style={[st.poi, { borderColor: fav ? C.fav : m.color }, fav && { borderWidth: 3 }]}>
        <Text style={st.poiIcon}>{m.icon}</Text>
      </View>
    </Marker>
  );
});

function Dot({ p, color, size, title }: { p: LatLng; color: string; size: number; title: string }) {
  return (
    <Marker coordinate={ll(p)} tracksViewChanges={false} anchor={{ x: 0.5, y: 0.5 }} title={title} zIndex={300}>
      <View style={{ width: size * 2 + 4, height: size * 2 + 4, borderRadius: size + 2, backgroundColor: color, borderColor: '#fff', borderWidth: 2 }} />
    </Marker>
  );
}

const MapView = forwardRef<MapHandle, MapProps>(function MapView(p, ref) {
  const map = useRef<Map>(null);
  const [region, setRegion] = useState<Region>(START);
  const [satellite, setSatellite] = useState(false);
  const [seamarks, setSeamarks] = useState(true);
  const sel = p.routes[p.selected];

  useImperativeHandle(ref, () => ({
    fit(coords, padding) {
      if (coords.length === 0) return;
      if (coords.length === 1) {
        map.current?.animateToRegion({ ...ll(coords[0]), latitudeDelta: deltaFor(13), longitudeDelta: deltaFor(13) });
        return;
      }
      // dun lange routes uit; voor het kader zijn een paar honderd punten genoeg
      const step = Math.max(1, Math.floor(coords.length / 300));
      const pts = coords.filter((_, i) => i % step === 0 || i === coords.length - 1).map(ll);
      map.current?.fitToCoordinates(pts, { edgePadding: { top: padding.top, bottom: padding.bottom, left: 30, right: 30 }, animated: true });
    },
    center(pos, minZoom) {
      const z = Math.max(zoomOf(region), minZoom ?? 0);
      map.current?.animateToRegion({ ...ll(pos), latitudeDelta: deltaFor(z), longitudeDelta: deltaFor(z) }, 400);
    },
  }), [region]);

  // volgen: kaart centreert op de boot, in navigatiemodus op zoom 15 of hoger
  useEffect(() => {
    if (!p.follow || !p.gps) return;
    const z = p.navigating ? Math.max(zoomOf(region), 15) : zoomOf(region);
    map.current?.animateToRegion({ ...ll(p.gps.pos), latitudeDelta: deltaFor(z), longitudeDelta: deltaFor(z) }, 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.gps, p.follow, p.navigating]);

  useEffect(() => {
    if (p.focusStep) map.current?.animateToRegion({ ...ll(p.focusStep.point), latitudeDelta: deltaFor(16), longitudeDelta: deltaFor(16) }, 400);
  }, [p.focusStep]);

  // STYLEGUIDE 7: onder zoom 12 geen POI's, onder 14 alleen havens, tankstations en favorieten, nooit meer dan 600
  const visiblePois = useMemo(() => {
    const z = zoomOf(region);
    if (!p.showPois || z < 12) return [] as Poi[];
    const padLat = region.latitudeDelta * 0.6, padLon = region.longitudeDelta * 0.6;
    const important = z < 14;
    const out: Poi[] = [];
    for (const poi of p.pois) {
      if (important && !(poi.k === 'marina' || poi.k === 'harbour' || poi.k === 'fuel' || p.favs.has(poi.id))) continue;
      if (Math.abs(poi.p[0] - region.latitude) > padLat || Math.abs(poi.p[1] - region.longitude) > padLon) continue;
      out.push(poi);
      if (out.length >= 600) break;
    }
    return out;
  }, [p.pois, p.showPois, region, p.favs]);

  const onPress = (e: MapPressEvent) => {
    if (e.nativeEvent.action === 'marker-press') return;
    const c = e.nativeEvent.coordinate;
    p.onMapPress([c.latitude, c.longitude]);
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <Map
        ref={map}
        style={StyleSheet.absoluteFill}
        initialRegion={START}
        mapType={satellite ? 'satellite' : Platform.OS === 'android' ? 'none' : 'standard'}
        onPress={onPress}
        onPanDrag={p.onUserMove}
        onRegionChangeComplete={setRegion}
        rotateEnabled={false}
        pitchEnabled={false}
        showsCompass={false}
        showsPointsOfInterests={false}
        toolbarEnabled={false}
        minZoomLevel={9}
        maxZoomLevel={19}
      >
        {!satellite && <UrlTile urlTemplate={OSM} maximumZ={19} shouldReplaceMapContent zIndex={-2} tileSize={256} />}
        {seamarks && <UrlTile urlTemplate={SEAMARKS} maximumZ={18} zIndex={-1} tileSize={256} />}

        {visiblePois.map((poi) => (
          <PoiMarker key={poi.id} poi={poi} fav={p.favs.has(poi.id)} onPress={p.onPoiPress} />
        ))}

        {p.track.length > 1 && <Polyline coordinates={p.track.map(ll)} strokeColor={C.track} strokeWidth={3} lineDashPattern={[2, 6]} />}

        {p.routes.map((r, i) =>
          i === p.selected ? null : <Polyline key={r.id} coordinates={r.coords.map(ll)} strokeColor="rgba(122,134,153,0.6)" strokeWidth={6} tappable onPress={() => p.onSelect(i)} />,
        )}
        {sel && <Polyline coordinates={sel.coords.map(ll)} strokeColor="rgba(255,255,255,0.9)" strokeWidth={10} zIndex={1} />}
        {sel && <Polyline coordinates={sel.coords.map(ll)} strokeColor={C.blue} strokeWidth={6} zIndex={2} />}
        {sel &&
          [sel.access?.start, sel.access?.end].map((leg, i) =>
            leg ? <Polyline key={`a${i}`} coordinates={[ll(leg.point), ll(leg.water)]} strokeColor={C.muted} strokeWidth={3} lineDashPattern={[4, 8]} zIndex={2} /> : null,
          )}
        {sel?.bridges.map((b, i) => <Dot key={`b${i}`} p={b.point} size={6} color={b.movable ? C.movable : C.bridge} title={b.name ?? 'Brug'} />)}
        {sel?.locks.map((l, i) => <Dot key={`l${i}`} p={l.point} size={7} color={C.lock} title={l.name ?? 'Sluis'} />)}
        {sel &&
          p.stages
            .filter((s) => s.stop)
            .map((s) => (
              <Marker key={`s${s.day}`} coordinate={ll(s.stop!.poi.p)} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={false} zIndex={500} title={`Overnachting dag ${s.day}: ${s.stop!.poi.n ?? 'aanlegplaats'}`}>
                <View style={{ alignItems: 'center' }}>
                  <Pin color={C.lock} label="🛏️" />
                  <Text style={st.dayBadge}>dag {s.day}</Text>
                </View>
              </Marker>
            ))}

        {p.waypoints.map((w, i) => (
          <Marker key={`w${i}-${w.point[0]}-${w.point[1]}`} coordinate={ll(w.point)} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={false} zIndex={600} title={w.name}>
            <Pin color={i === 0 ? C.starboard : i === p.waypoints.length - 1 ? C.port : C.blue} label={i === 0 ? 'A' : i === p.waypoints.length - 1 ? 'B' : String(i)} />
          </Marker>
        ))}

        {p.gps && (
          <Marker coordinate={ll(p.gps.pos)} anchor={{ x: 0.5, y: 0.5 }} zIndex={1000} flat>
            <View style={[st.boat, { transform: [{ rotate: `${p.gps.heading ?? 0}deg` }] }]}>
              <Text style={st.boatArrow}>▲</Text>
            </View>
          </Marker>
        )}
      </Map>

      <View style={[st.layers, { top: p.topInset }]}>
        <Pressable style={st.layerBtn} onPress={() => setSatellite((v) => !v)} accessibilityLabel="Wissel kaart en satelliet">
          <Text style={st.layerText}>{satellite ? '🗺️' : '🛰️'}</Text>
        </Pressable>
        <Pressable style={[st.layerBtn, !seamarks && { opacity: 0.5 }]} onPress={() => setSeamarks((v) => !v)} accessibilityLabel="Zeekaartsymbolen aan of uit">
          <Text style={st.layerText}>⚓</Text>
        </Pressable>
      </View>
      <Text style={st.attrib} pointerEvents="none">© OpenStreetMap · OpenSeaMap</Text>
    </View>
  );
});

export default MapView;

const st = StyleSheet.create({
  pinWrap: { alignItems: 'center', width: 30, height: 40 },
  pin: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  pinText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  pinTip: { width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 10, borderLeftColor: 'transparent', borderRightColor: 'transparent', marginTop: -1 },
  dayBadge: { backgroundColor: C.lock, color: '#fff', fontSize: 11, fontWeight: '700', paddingHorizontal: 6, borderRadius: 999, overflow: 'hidden', marginTop: 2 },
  poi: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#fff', borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  poiIcon: { fontSize: 13 },
  boat: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(10,102,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  boatArrow: { color: C.blue, fontSize: 24, lineHeight: 26, textShadowColor: '#fff', textShadowRadius: 3 },
  layers: { position: 'absolute', right: 12, gap: 8 },
  layerBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...SHADOW },
  layerText: { fontSize: 20 },
  attrib: { position: 'absolute', left: 6, bottom: 2, fontSize: 9, color: C.muted, backgroundColor: 'rgba(255,255,255,0.7)', paddingHorizontal: 4 },
});
