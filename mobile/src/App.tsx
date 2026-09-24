// Vaarmaat als native app (iOS en Android). Zelfde opbouw als ../../src/App.tsx: deze component is de enige
// eigenaar van planner- en navigatiestate, de panelen zijn presentational. De rekenlogica komt uit ../../src.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BackHandler, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import type { Graph } from '@shared/graph';
import { loadProfile, saveProfile, BOAT_TYPES } from '@shared/profile';
import { locateOnRoute, type NavState } from '@shared/navigation';
import { routeWaypoints, planStages, type Stage } from '@shared/trip';
import { poisNear, OVERNIGHT_KINDS } from '@shared/pois';
import { loadTrips, saveTrips, loadLogs, saveLogs, loadSettings, saveSettings, loadFavs, saveFavs, uid, type Settings } from '@shared/store';
import type { BoatProfile, LatLng, RouteResult, RouteStep, Poi, Trip, LogEntry } from '@shared/types';
import type { Place } from '@shared/geocode';
import { haversine, formatDistance } from '@shared/geo';
import { loadGraph, loadPois } from './data';
import { speak, setVoiceEnabled, spokenDistance } from './voice';
import MapView, { type MapHandle } from './components/MapView';
import SearchBox from './components/SearchBox';
import ProfilePanel from './components/ProfilePanel';
import RoutePanel, { type RouteTab } from './components/RoutePanel';
import NavPanel from './components/NavPanel';
import LessonsView from './components/LessonsView';
import TripsView from './components/TripsView';
import MoreView from './components/MoreView';
import PoiPanel from './components/PoiPanel';
import ApproachCard, { type Approach } from './components/ApproachCard';
import { Btn, IconBtn, Row } from './components/ui';
import { C, RADIUS, SHADOW, T } from './theme';

type Tab = 'kaart' | 'tochten' | 'leren' | 'meer';
type Picking = number | null; // index van waypoint dat op de kaart gekozen wordt
type Gps = { pos: LatLng; heading: number | null; speed: number | null; acc: number };

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Main />
    </SafeAreaProvider>
  );
}

function Main() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const mapRef = useRef<MapHandle>(null);

  const [graph, setGraph] = useState<Graph | null>(null);
  const [pois, setPois] = useState<Poi[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [profile, setProfile] = useState<BoatProfile>(loadProfile);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [showProfile, setShowProfile] = useState(false);
  const [tab, setTab] = useState<Tab>('kaart');
  const [lessonToOpen, setLessonToOpen] = useState<string | null>(null);
  const [topbarH, setTopbarH] = useState(200);

  // planner
  const [waypoints, setWaypoints] = useState<(Place | null)[]>([null, null]);
  const [picking, setPicking] = useState<Picking>(null);
  const [routes, setRoutes] = useState<RouteResult[]>([]);
  const [selected, setSelected] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [routeTab, setRouteTab] = useState<RouteTab>('route');
  const [fitKey, setFitKey] = useState(0);
  const [focusStep, setFocusStep] = useState<RouteStep | null>(null);
  const [multiDay, setMultiDay] = useState(false);
  const [trips, setTrips] = useState<Trip[]>(loadTrips);
  const [favs, setFavs] = useState<string[]>(loadFavs);
  const [poi, setPoi] = useState<Poi | null>(null);
  const [naming, setNaming] = useState<string | null>(null);

  // GPS en navigatie
  const [gps, setGps] = useState<Gps | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);
  const [follow, setFollow] = useState(false);
  const [nav, setNav] = useState<NavState | null>(null);
  const [approach, setApproach] = useState<Approach | null>(null);
  const [track, setTrack] = useState<LatLng[]>([]);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const watchStarting = useRef(false);
  const segRef = useRef(0);
  const lastPosRef = useRef<{ pos: LatLng; t: number } | null>(null);
  const spokenRef = useRef<Set<string>>(new Set());
  const approachedRef = useRef<Set<string>>(new Set());
  const navStartRef = useRef<{ t: number; maxSpeed: number; speeds: number[] } | null>(null);

  useEffect(() => {
    loadGraph()
      .then(setGraph)
      .catch((e: Error) => setLoadError(`Kon vaarwegdata niet laden (${e.message})`));
    loadPois().then(setPois);
    return () => watchRef.current?.remove();
  }, []);
  useEffect(() => saveProfile(profile), [profile]);
  useEffect(() => {
    saveSettings(settings);
    setVoiceEnabled(settings.voice);
  }, [settings]);
  useEffect(() => saveTrips(trips), [trips]);
  useEffect(() => saveFavs(favs), [favs]);

  // scherm aan houden tijdens navigatie (STYLEGUIDE 8)
  useEffect(() => {
    if (!navigating) return;
    activateKeepAwakeAsync('nav').catch(() => undefined);
    return () => {
      deactivateKeepAwake('nav').catch(() => undefined);
    };
  }, [navigating]);

  const filled = useMemo(() => waypoints.filter((w): w is Place => !!w), [waypoints]);
  const from = waypoints[0];
  const to = waypoints[waypoints.length - 1];
  const tabbarH = navigating ? 0 : 58 + insets.bottom;

  const doRoute = useCallback(
    (pts: Place[], prof: BoatProfile) => {
      if (!graph || pts.length < 2) return;
      setBusy(true);
      setMessage(null);
      setTimeout(() => {
        const out = routeWaypoints(graph, pts.map((p) => ({ point: p.point, name: p.name })), prof);
        if (out.routes.length === 0) {
          setMessage(out.error ?? 'Geen route gevonden.');
          setRoutes([]);
        } else {
          setRoutes(out.routes);
          setSelected(0);
          setFitKey((k) => k + 1);
        }
        setBusy(false);
      }, 20);
    },
    [graph],
  );

  // automatisch routeren zodra alle punten bekend zijn of het profiel wijzigt
  useEffect(() => {
    const complete = waypoints.length >= 2 && waypoints.every((w) => !!w);
    if (complete && graph && !navigating) doRoute(filled, profile);
    if (!complete) setRoutes([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waypoints, graph, profile]);

  const route = routes[selected];
  const stages: Stage[] = useMemo(() => {
    if (!route || !multiDay) return [];
    return planStages(route, pois, settings.hoursPerDay, settings.startTime, from?.name ?? 'Vertrek', to?.name ?? 'Bestemming');
  }, [route, multiDay, pois, settings.hoursPerDay, settings.startTime, from, to]);
  useEffect(() => {
    if (route && route.duration > settings.hoursPerDay * 3600) setMultiDay(true);
  }, [route, settings.hoursPerDay]);

  // route passend in beeld, met ruimte voor de bovenbalk en de sheet
  useEffect(() => {
    if (fitKey === 0) return;
    const pts = route ? route.coords : filled.map((w) => w.point);
    mapRef.current?.fit(pts, { top: topbarH + 20, bottom: Math.round(height * 0.48) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  const destPois = useMemo(() => (to ? poisNear(pois, to.point, 2500, OVERNIGHT_KINDS).slice(0, 8) : []), [pois, to]);

  const setWp = (i: number, p: Place | null) => setWaypoints((w) => w.map((x, j) => (j === i ? p : x)));
  const addVia = () => setWaypoints((w) => [...w.slice(0, -1), null, w[w.length - 1]]);
  const removeWp = (i: number) => setWaypoints((w) => (w.length <= 2 ? w.map((x, j) => (j === i ? null : x)) : w.filter((_, j) => j !== i)));
  const swap = () => setWaypoints((w) => [...w].reverse());

  const onFix = useCallback((loc: Location.LocationObject) => {
    const pos: LatLng = [loc.coords.latitude, loc.coords.longitude];
    // iOS geeft -1 als snelheid of koers onbekend is
    let speed = loc.coords.speed != null && loc.coords.speed >= 0 ? loc.coords.speed * 3.6 : null;
    let heading = loc.coords.heading != null && loc.coords.heading >= 0 && (speed == null || speed > 0.5) ? loc.coords.heading : null;
    const last = lastPosRef.current;
    if (last) {
      const dt = (loc.timestamp - last.t) / 1000;
      const d = haversine(last.pos, pos);
      if (speed == null && dt > 0) speed = (d / dt) * 3.6;
      if (heading == null && d > 3) {
        const dLon = (pos[1] - last.pos[1]) * Math.cos((pos[0] * Math.PI) / 180);
        const dLat = pos[0] - last.pos[0];
        heading = ((Math.atan2(dLon, dLat) * 180) / Math.PI + 360) % 360;
      }
    }
    lastPosRef.current = { pos, t: loc.timestamp };
    setGps({ pos, heading, speed, acc: loc.coords.accuracy ?? 0 });
    setGpsError(null);
  }, []);

  /** Vraagt toestemming en start het volgen van de positie; geeft de eerste positie terug als die er is */
  const startGps = useCallback(async (): Promise<LatLng | null> => {
    if (watchRef.current || watchStarting.current) return gps?.pos ?? null;
    watchStarting.current = true;
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        setGpsError('Locatietoegang geweigerd. Sta locatie toe in de instellingen van je telefoon.');
        return null;
      }
      watchRef.current = await Location.watchPositionAsync({ accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 2 }, onFix);
      const first = await Location.getLastKnownPositionAsync({ maxAge: 60000 });
      if (first) onFix(first);
      return first ? [first.coords.latitude, first.coords.longitude] : null;
    } catch {
      setGpsError('Kon positie niet bepalen.');
      return null;
    } finally {
      watchStarting.current = false;
    }
  }, [gps, onFix]);

  // navigatie-update bij nieuwe GPS positie: positie op route, spraak, nadering sluis/brug, spoor
  useEffect(() => {
    if (!navigating || !gps || !route) return;
    const st = locateOnRoute(route, gps.pos, segRef.current, gps.speed ?? profile.speed);
    segRef.current = st.segIdx;
    setNav(st);
    setTrack((t) => (t.length === 0 || haversine(t[t.length - 1], gps.pos) > 8 ? [...t, gps.pos] : t));
    if (navStartRef.current && gps.speed != null) {
      navStartRef.current.maxSpeed = Math.max(navStartRef.current.maxSpeed, gps.speed);
      navStartRef.current.speeds.push(gps.speed);
    }
    // spraak
    const next = st.next;
    if (next && st.offRoute < 120) {
      const key = (m: string) => `${next.idx}:${next.kind}:${m}`;
      const far = next.kind === 'lock' || next.kind === 'movable_bridge' ? 1000 : 600;
      if (st.toNext < far && st.toNext > 250 && !spokenRef.current.has(key('far'))) {
        spokenRef.current.add(key('far'));
        speak(`${spokenDistance(st.toNext)} ${next.text.toLowerCase()}`);
      } else if (st.toNext <= 250 && st.toNext > 40 && !spokenRef.current.has(key('near'))) {
        spokenRef.current.add(key('near'));
        speak(`${spokenDistance(st.toNext)} ${next.text.toLowerCase()}${next.detail ? `, ${next.detail}` : ''}`);
      } else if (st.toNext <= 40 && !spokenRef.current.has(key('now'))) {
        spokenRef.current.add(key('now'));
        speak(next.text);
      }
    }
    if (st.offRoute >= 120 && !spokenRef.current.has('off')) {
      spokenRef.current.add('off');
      speak('Je bent van de route af. Vaar terug of herbereken.');
    }
    if (st.offRoute < 120) spokenRef.current.delete('off');
    // nadering sluis of beweegbare brug: tutorial en bedieningsinfo
    const speedKmh = Math.max(gps.speed ?? profile.speed, 2);
    const horizon = (settings.prepMinutes / 60) * speedKmh * 1000;
    const upcoming = [
      ...route.locks.map((l) => ({ kind: 'lock' as const, name: l.name ?? 'sluis', at: l.at, height: null as number | null, ops: l.ops, key: `lock:${l.at.toFixed(0)}` })),
      ...route.bridges.filter((b) => b.movable && (b.height == null || b.height < profile.height + profile.margin)).map((b) => ({ kind: 'movable_bridge' as const, name: b.name ?? 'brug', at: b.at, height: b.height, ops: b.ops, key: `br:${b.at.toFixed(0)}` })),
    ]
      .filter((o) => o.at > st.along + 50 && o.at - st.along < horizon)
      .sort((a, b) => a.at - b.at);
    const first = upcoming[0];
    if (first && !approachedRef.current.has(first.key)) {
      approachedRef.current.add(first.key);
      const dist = first.at - st.along;
      const minutes = Math.round((dist / 1000 / speedKmh) * 60);
      setApproach({ kind: first.kind, name: first.name, dist, minutes, height: first.height, ops: first.ops, key: first.key });
      speak(`Over ongeveer ${minutes} minuten ${first.kind === 'lock' ? 'sluis' : 'beweegbare brug'} ${first.name}. Bekijk de voorbereiding op het scherm.`, true);
    }
    if (st.remaining < 30 && !spokenRef.current.has('arrived')) {
      spokenRef.current.add('arrived');
      const leg = route.access?.end;
      const msg = leg ? `Je bent aangekomen bij het water. Nog ${formatDistance(leg.walkDistance)} lopen naar ${leg.name}.` : 'Je bent aangekomen op je bestemming.';
      speak(msg);
      setMessage(msg);
    }
  }, [gps, navigating, route, profile.speed, profile.height, profile.margin, settings.prepMinutes]);

  const pickMyLocation = async (i: number) => {
    const pos = gps?.pos ?? (await startGps()) ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }).then((p) => [p.coords.latitude, p.coords.longitude] as LatLng).catch(() => null));
    if (pos) setWp(i, { name: 'Mijn locatie', detail: 'GPS', point: pos, kind: 'gps' });
    else setMessage('Kon je locatie niet bepalen. Sta locatie toe of kies een punt op de kaart.');
  };

  const onMapPress = (p: LatLng) => {
    if (picking == null) {
      setPoi(null);
      return;
    }
    const snapped = graph?.nearestNode(p, 2500) ?? null;
    setWp(picking, { name: snapped ? `Punt op kaart (${p[0].toFixed(4)}, ${p[1].toFixed(4)})` : 'Punt op kaart', detail: snapped ? 'vaarweg' : 'geen vaarweg in de buurt', point: snapped ? snapped.snapped : p, kind: 'map' });
    setPicking(null);
  };

  const startNavigation = () => {
    startGps();
    setNavigating(true);
    setFollow(true);
    setExpanded(false);
    setPoi(null);
    setTab('kaart');
    segRef.current = 0;
    spokenRef.current = new Set();
    approachedRef.current = new Set();
    navStartRef.current = { t: Date.now(), maxSpeed: 0, speeds: [] };
    setTrack([]);
    setNav(null);
    setApproach(null);
    speak(`Navigatie gestart naar ${to?.name ?? 'je bestemming'}. ${route ? formatDistance(route.distance) : ''}.`, true);
  };
  const stopNavigation = () => {
    setNavigating(false);
    setFollow(false);
    setNav(null);
    setApproach(null);
    setFitKey((k) => k + 1);
    // logboek
    const s = navStartRef.current;
    if (s && track.length > 1) {
      let d = 0;
      for (let i = 1; i < track.length; i++) d += haversine(track[i - 1], track[i]);
      const dur = (Date.now() - s.t) / 1000;
      if (d > 200 && dur > 60) {
        const entry: LogEntry = {
          id: uid(),
          date: new Date(s.t).toISOString(),
          from: from?.name ?? 'Vertrek',
          to: to?.name ?? 'Bestemming',
          distance: d,
          duration: dur,
          maxSpeed: s.maxSpeed,
          avgSpeed: (d / 1000 / dur) * 3600,
          track: track.filter((_, i) => i % Math.max(1, Math.floor(track.length / 800)) === 0),
        };
        saveLogs([entry, ...loadLogs()]);
        setMessage(`Tocht opgeslagen in het logboek: ${formatDistance(d)}.`);
      }
    }
    navStartRef.current = null;
  };
  const recalc = () => {
    if (!gps) return;
    const pl: Place = { name: 'Mijn locatie', detail: 'GPS', point: gps.pos, kind: 'gps' };
    setWaypoints([pl, ...waypoints.slice(1)]);
    segRef.current = 0;
    doRoute([pl, ...filled.slice(1)], profile);
  };

  const saveTrip = (name: string) => {
    if (filled.length < 2 || !name.trim()) return;
    const t: Trip = { id: uid(), name: name.trim(), waypoints: filled.map((w) => ({ name: w.name, point: w.point })), hoursPerDay: settings.hoursPerDay, startTime: settings.startTime, createdAt: new Date().toISOString() };
    setTrips((ts) => [t, ...ts]);
    setMessage('Tocht bewaard onder Mijn tochten.');
  };
  const openTrip = (t: Trip) => {
    setWaypoints(t.waypoints.map((w) => ({ name: w.name, detail: 'tocht', point: w.point, kind: 'place' as const })));
    setSettings((s) => ({ ...s, hoursPerDay: t.hoursPerDay, startTime: t.startTime }));
    setMultiDay(true);
    setRouteTab('tocht');
    setTab('kaart');
  };

  const routeToPoi = (p: Poi, asFrom: boolean) => {
    const pl: Place = { name: p.n ?? 'Aanlegplaats', detail: 'haven', point: p.p, kind: 'harbour' };
    if (asFrom) setWp(0, pl);
    else setWp(waypoints.length - 1, pl);
    setPoi(null);
    setTab('kaart');
  };

  // Android terugknop: eerst panelen en tabbladen sluiten, dan pas de app
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (naming != null) return setNaming(null), true;
      if (poi) return setPoi(null), true;
      if (showProfile) return setShowProfile(false), true;
      if (picking != null) return setPicking(null), true;
      if (tab !== 'kaart') return setTab('kaart'), true;
      if (expanded) return setExpanded(false), true;
      return false;
    });
    return () => sub.remove();
  }, [naming, poi, showProfile, picking, tab, expanded]);

  const boatType = BOAT_TYPES.find((b) => b.id === profile.type);
  const weatherPoint = gps?.pos ?? from?.point ?? to?.point ?? null;
  const favSet = useMemo(() => new Set(favs), [favs]);
  const onMap = tab === 'kaart';

  return (
    <View style={st.app}>
      <MapView
        ref={mapRef}
        waypoints={filled.map((w) => ({ point: w.point, name: w.name }))}
        routes={routes}
        selected={selected}
        onSelect={setSelected}
        onMapPress={onMapPress}
        gps={gps ? { pos: gps.pos, heading: gps.heading } : null}
        follow={follow}
        onUserMove={() => setFollow(false)}
        focusStep={focusStep}
        navigating={navigating}
        pois={pois}
        showPois={settings.showPois && onMap}
        onPoiPress={(p) => {
          setPoi(p);
          setShowProfile(false);
        }}
        favs={favSet}
        stages={stages}
        track={track}
        topInset={navigating ? insets.top + 150 : insets.top + topbarH + 8}
      />

      {onMap && !navigating && (
        <View style={[st.topbar, { paddingTop: insets.top + 8 }]} onLayout={(e) => setTopbarH(e.nativeEvent.layout.height - insets.top)}>
          <Row>
            <Text style={{ fontSize: 22 }}>⚓</Text>
            <View style={{ flex: 1 }}>
              <Text style={[T.h2, { color: C.ink }]}>Vaarmaat</Text>
              <Text style={[T.micro, { color: C.muted }]}>Groene Hart en Hollandse Plassen</Text>
            </View>
            <Pressable style={st.boatBtn} onPress={() => { setShowProfile(true); setPoi(null); }} accessibilityLabel="Bootprofiel">
              <Text style={[T.label, { color: C.ink }]} numberOfLines={1}>{boatType?.icon} {profile.name}</Text>
              <Text style={[T.micro, { color: C.muted }]}>{profile.height.toFixed(2).replace('.', ',')} m · {profile.speed} km/u</Text>
            </Pressable>
          </Row>
          {waypoints.map((w, i) => (
            <Row key={i} style={{ alignItems: 'flex-start', zIndex: waypoints.length - i }}>
              <SearchBox
                label={i === 0 ? 'A' : i === waypoints.length - 1 ? 'B' : String(i)}
                placeholder={i === 0 ? 'Vertrekpunt (bijv. Kaag)' : i === waypoints.length - 1 ? 'Bestemming (bijv. Leiden)' : 'Tussenpunt'}
                value={w}
                onSelect={(p) => setWp(i, p)}
                onUseGps={() => pickMyLocation(i)}
                onPickOnMap={() => setPicking(i)}
                picking={picking === i}
              />
              {waypoints.length > 2 && i !== 0 && i !== waypoints.length - 1 && <View style={{ paddingTop: 7 }}><IconBtn label="–" a11y="Tussenpunt verwijderen" onPress={() => removeWp(i)} /></View>}
            </Row>
          ))}
          <Row>
            <Btn small title="+ Tussenpunt" onPress={addVia} disabled={waypoints.length >= 8} />
            <Btn small title="⇅ Omkeren" onPress={swap} />
          </Row>
          {picking != null && (
            <Hint>
              Tik op de kaart om {picking === 0 ? 'het vertrekpunt' : picking === waypoints.length - 1 ? 'de bestemming' : 'het tussenpunt'} te kiezen.{' '}
              <Text style={{ color: C.blue, fontWeight: '600' }} onPress={() => setPicking(null)}>Annuleren</Text>
            </Hint>
          )}
          {!graph && !loadError && <Hint>Vaarwegen laden…</Hint>}
          {loadError && <Hint error>{loadError}</Hint>}
          {busy && <Hint>Route berekenen…</Hint>}
          {message && !busy && (
            <Hint error>
              {message} <Text style={{ fontWeight: '700' }} onPress={() => setMessage(null)}>ok</Text>
            </Hint>
          )}
        </View>
      )}

      {onMap && !navigating && !poi && !showProfile && (routes.length === 0 || (gps && !follow)) && (
        <Pressable
          style={[st.fab, { bottom: routes.length > 0 ? height * 0.46 + 12 : tabbarH + 16 }]}
          onPress={async () => {
            const pos = await startGps();
            setFollow(true);
            if (pos) mapRef.current?.center(pos, 14);
          }}
          accessibilityLabel="Mijn locatie"
        >
          <Text style={{ fontSize: 22 }}>📍</Text>
        </Pressable>
      )}

      {showProfile && onMap && <ProfilePanel profile={profile} onChange={setProfile} onClose={() => setShowProfile(false)} bottom={tabbarH} />}

      {onMap && poi && !showProfile && (
        <PoiPanel
          poi={poi}
          dist={gps ? haversine(gps.pos, poi.p) : undefined}
          onClose={() => setPoi(null)}
          onRouteTo={() => routeToPoi(poi, false)}
          onRouteFrom={() => routeToPoi(poi, true)}
          fav={favSet.has(poi.id)}
          onFav={() => setFavs((f) => (f.includes(poi.id) ? f.filter((x) => x !== poi.id) : [...f, poi.id]))}
          bottom={tabbarH}
        />
      )}

      {onMap && !showProfile && !navigating && !poi && routes.length > 0 && (
        <RoutePanel
          routes={routes}
          selected={selected}
          profile={profile}
          onSelect={(i) => { setSelected(i); setFitKey((k) => k + 1); }}
          onStart={startNavigation}
          onStepClick={(s) => setFocusStep(s)}
          onClose={() => { setRoutes([]); setWaypoints((w) => [w[0], null]); }}
          expanded={expanded}
          onToggle={() => setExpanded((e) => !e)}
          stages={stages}
          multiDay={multiDay}
          onMultiDay={setMultiDay}
          hoursPerDay={settings.hoursPerDay}
          onHours={(h) => setSettings((s) => ({ ...s, hoursPerDay: h }))}
          onSaveTrip={() => setNaming(`${from?.name ?? ''} naar ${to?.name ?? ''}`)}
          destPois={destPois}
          onPoi={(p) => setPoi(p)}
          onFocus={(p) => mapRef.current?.center(p, 14)}
          weatherPoint={from?.point ?? null}
          tab={routeTab}
          onTab={setRouteTab}
          bottom={tabbarH}
        />
      )}

      {navigating && route && (
        <>
          <NavPanel
            route={route}
            nav={nav}
            speedKmh={gps?.speed ?? null}
            heading={gps?.heading ?? null}
            gpsError={gpsError}
            onStop={stopNavigation}
            onRecalc={recalc}
            following={follow}
            onFollow={() => setFollow(true)}
            voice={settings.voice}
            onVoice={() => setSettings((s) => ({ ...s, voice: !s.voice }))}
            top={insets.top + 8}
            bottom={insets.bottom}
          />
          {approach && onMap && (
            <ApproachCard
              a={approach}
              top={insets.top + 140}
              onDismiss={() => setApproach(null)}
              onOpenLesson={(id) => {
                setLessonToOpen(id);
                setTab('leren');
              }}
            />
          )}
        </>
      )}

      {!onMap && (
        <View style={[st.overlay, { paddingTop: insets.top, bottom: tabbarH }]}>
          {navigating && (
            <Pressable style={st.backToNav} onPress={() => setTab('kaart')}>
              <Text style={[T.label, { color: '#fff' }]}>‹ Terug naar navigatie</Text>
            </Pressable>
          )}
          {tab === 'tochten' && <TripsView trips={trips} onOpen={openTrip} onDelete={(id) => setTrips((ts) => ts.filter((t) => t.id !== id))} onNew={() => { setWaypoints([null, null]); setRoutes([]); setTab('kaart'); }} />}
          {tab === 'leren' && <LessonsView key={lessonToOpen ?? 'list'} initial={lessonToOpen} />}
          {tab === 'meer' && <MoreView settings={settings} onSettings={setSettings} profile={profile} onEditProfile={() => { setTab('kaart'); setShowProfile(true); }} weatherPoint={weatherPoint} />}
        </View>
      )}

      {!navigating && (
        <View style={[st.tabbar, { height: tabbarH, paddingBottom: insets.bottom }]}>
          {(
            [
              ['kaart', '🗺️', 'Kaart'],
              ['tochten', '🧭', 'Tochten'],
              ['leren', '🎓', 'Leren'],
              ['meer', '⛵', 'Aan boord'],
            ] as [Tab, string, string][]
          ).map(([id, icon, label]) => (
            <Pressable
              key={id}
              style={st.tab}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === id }}
              onPress={() => {
                setTab(id);
                if (id !== 'leren') setLessonToOpen(null);
              }}
            >
              <Text style={{ fontSize: 20, opacity: tab === id ? 1 : 0.6 }}>{icon}</Text>
              <Text style={[T.micro, { color: tab === id ? C.blue : C.muted, fontWeight: tab === id ? '700' : '400' }]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <TripNameModal value={naming} onCancel={() => setNaming(null)} onSave={(n) => { saveTrip(n); setNaming(null); }} />
    </View>
  );
}

function Hint({ children, error }: { children: ReactNode; error?: boolean }) {
  return (
    <View style={[st.hint, error && { backgroundColor: C.errBg }]}>
      <Text style={[T.meta, { color: error ? C.err : C.ink }]}>{children}</Text>
    </View>
  );
}

function TripNameModal({ value, onCancel, onSave }: { value: string | null; onCancel: () => void; onSave: (name: string) => void }) {
  const [name, setName] = useState('');
  useEffect(() => {
    if (value != null) setName(value);
  }, [value]);
  return (
    <Modal visible={value != null} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={st.modalBg}>
        <View style={st.modal}>
          <Text style={[T.h2, { color: C.ink }]}>Naam van de tocht</Text>
          <TextInput style={st.modalInput} value={name} onChangeText={setName} autoFocus selectTextOnFocus onSubmitEditing={() => onSave(name)} accessibilityLabel="Naam van de tocht" />
          <Row>
            <Btn title="Annuleren" onPress={onCancel} flex />
            <Btn kind="primary" title="Bewaren" onPress={() => onSave(name)} disabled={!name.trim()} flex />
          </Row>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const st = StyleSheet.create({
  app: { flex: 1, backgroundColor: C.water },
  topbar: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: '#fff', paddingHorizontal: 12, paddingBottom: 10, gap: 8, borderBottomLeftRadius: RADIUS, borderBottomRightRadius: RADIUS, ...SHADOW },
  boatBtn: { backgroundColor: C.canvas, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, maxWidth: 170, minHeight: 44, justifyContent: 'center' },
  hint: { backgroundColor: C.blueSoft, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  fab: { position: 'absolute', right: 12, width: 52, height: 52, borderRadius: 26, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...SHADOW },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: C.surface },
  backToNav: { backgroundColor: C.ink, margin: 12, marginBottom: 0, borderRadius: 12, padding: 12, alignItems: 'center' },
  tabbar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: C.line },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 44 },
  modalBg: { flex: 1, backgroundColor: 'rgba(18,32,58,0.4)', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: '#fff', borderRadius: RADIUS, padding: 16, gap: 12 },
  modalInput: { backgroundColor: C.canvas, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 12, minHeight: 44, fontSize: 15, color: C.ink },
});
