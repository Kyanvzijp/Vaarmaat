import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MapView from './components/MapView';
import SearchBox from './components/SearchBox';
import ProfilePanel from './components/ProfilePanel';
import RoutePanel from './components/RoutePanel';
import NavPanel from './components/NavPanel';
import LessonsView from './components/LessonsView';
import TripsView from './components/TripsView';
import MoreView from './components/MoreView';
import PoiPanel from './components/PoiPanel';
import ApproachCard, { type Approach } from './components/ApproachCard';
import Toast, { type Notice, type NoticeKind } from './components/Toast';
import TripNameDialog from './components/TripNameDialog';
import Onboarding, { type OnboardingTarget } from './components/Onboarding';
import EmergencyView from './components/EmergencyView';
import { onboardingStart, completeOnboarding, acceptDisclaimer, boatCheck, boatCheckText, type OnboardingStep } from './onboarding';
import { loadGraph, type Graph } from './graph';
import { loadProfile, saveProfile, BOAT_TYPES } from './profile';
import { locateOnRoute, nextCue, placeKey, OFF_ROUTE, type NavState } from './navigation';
import { REROUTE, newRerouteTimer, onOtherWaterway, shouldReroute, passedWaypoints, leadsBackToRoute, rerouteMessage } from './reroute';
import { useWakeLock } from './components/useWakeLock';
import { routeWaypoints, planStages, type Stage } from './trip';
import { loadPois, poisNear, OVERNIGHT_KINDS } from './pois';
import { loadTrips, saveTrips, loadLogs, saveLogs, loadSettings, saveSettings, loadFavs, saveFavs, saveActiveTrip, uid, type Settings } from './store';
import { addFix, buildLogEntry, startActiveTrip } from './logbook';
import { speak, setVoiceEnabled } from './voice';
import type { ActiveTrip, BoatProfile, LatLng, LogEntry, RouteResult, RouteStep, Poi, Trip } from './types';
import type { Place } from './geocode';
import { haversine, formatDistance } from './geo';

type Tab = 'kaart' | 'tochten' | 'leren' | 'meer';
type Picking = number | null; // index van waypoint dat op de kaart gekozen wordt

/** Zo vaak (ms) wordt de tocht die je vaart lokaal bewaard */
const SAVE_EVERY = 15000;

const wpKey = (pts: { point: LatLng }[]) => pts.map((p) => placeKey(p.point)).join('|');

export default function App({ recovered = null }: { recovered?: LogEntry | null }) {
  const [graph, setGraph] = useState<Graph | null>(null);
  const [pois, setPois] = useState<Poi[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [profile, setProfile] = useState<BoatProfile>(loadProfile);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [showProfile, setShowProfile] = useState(false);
  const [tab, setTab] = useState<Tab>('kaart');
  const [lessonToOpen, setLessonToOpen] = useState<string | null>(null);
  const [moreTab, setMoreTab] = useState<'weer' | 'check' | 'log' | 'inst'>('weer');
  /** onboarding bij de eerste start, of alleen de disclaimer als die is gewijzigd */
  const [onboarding, setOnboarding] = useState<OnboardingStep | null>(() => onboardingStart(settings));
  const [showEmergency, setShowEmergency] = useState(false);

  // planner
  const [waypoints, setWaypoints] = useState<(Place | null)[]>([null, null]);
  const [picking, setPicking] = useState<Picking>(null);
  const [routes, setRoutes] = useState<RouteResult[]>([]);
  const [selected, setSelected] = useState(0);
  /** foutmelding van de planner, in de bovenbalk */
  const [message, setMessage] = useState<string | null>(null);
  /** korte melding onderin (succes, info, fout), ook tijdens navigatie */
  const [notice, setNotice] = useState<Notice | null>(() =>
    recovered ? { id: 1, kind: 'succes', text: `Je vorige tocht (${formatDistance(recovered.distance)}) is bewaard in het logboek.` } : null,
  );
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [routeTab, setRouteTab] = useState<'route' | 'stappen' | 'tocht' | 'aanleggen' | 'weer'>('route');
  const [fitKey, setFitKey] = useState(0);
  const [focusStep, setFocusStep] = useState<RouteStep | null>(null);
  const [focusPoint, setFocusPoint] = useState<LatLng | null>(null);
  /** eigen keuze voor de dagindeling, alleen geldig voor de tussenpunten waarvoor hij gemaakt is */
  const [multiDayChoice, setMultiDayChoice] = useState<{ key: string; on: boolean } | null>(null);
  const [trips, setTrips] = useState<Trip[]>(loadTrips);
  const [favs, setFavs] = useState<string[]>(loadFavs);
  const [poi, setPoi] = useState<Poi | null>(null);
  const [naming, setNaming] = useState<string | null>(null);

  // GPS en navigatie
  const [gps, setGps] = useState<{ pos: LatLng; heading: number | null; speed: number | null; acc: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);
  const [follow, setFollow] = useState(false);
  const [nav, setNav] = useState<NavState | null>(null);
  const [approach, setApproach] = useState<Approach | null>(null);
  const [track, setTrack] = useState<LatLng[]>([]);
  const watchRef = useRef<number | null>(null);
  const segRef = useRef(0);
  const lastPosRef = useRef<{ pos: LatLng; t: number } | null>(null);
  const spokenRef = useRef<Set<string>>(new Set());
  const rerouteRef = useRef(newRerouteTimer());
  const approachedRef = useRef<Set<string>>(new Set());
  const activeRef = useRef<ActiveTrip | null>(null);
  const savedAtRef = useRef(0);

  const notify = useCallback((text: string, kind: NoticeKind = 'succes', action?: Notice['action']) => setNotice({ id: Date.now(), text, kind, action }), []);
  /** korte trilling bij een nieuwe instructie en bij de naderingskaart (styleguide 10), uit te zetten */
  const haptic = () => {
    if (settings.haptics && 'vibrate' in navigator) navigator.vibrate(30);
  };
  // scherm aan tijdens navigatie (NAV-03); lukt dat niet, dan één keer een tip
  useWakeLock(navigating, () => {
    if (settings.wakeLockTipShown) return;
    setSettings((s) => ({ ...s, wakeLockTipShown: true }));
    notify('Tip: zet de automatische schermvergrendeling van je telefoon uit tijdens het varen. Je browser kan het scherm niet zelf aan houden.', 'info');
  });
  const closeNotice = useCallback(() => setNotice(null), []);

  useEffect(() => {
    loadGraph()
      .then(setGraph)
      .catch((e: Error) => setLoadError(e.message));
    loadPois().then(setPois);
  }, []);
  useEffect(() => saveProfile(profile), [profile]);
  useEffect(() => {
    saveSettings(settings);
    setVoiceEnabled(settings.voice);
  }, [settings]);
  useEffect(() => saveTrips(trips), [trips]);
  useEffect(() => saveFavs(favs), [favs]);

  const filled = useMemo(() => waypoints.filter((w): w is Place => !!w), [waypoints]);
  const from = waypoints[0];
  const to = waypoints[waypoints.length - 1];

  const doRoute = useCallback(
    (pts: Place[], prof: BoatProfile) => {
      if (!graph || pts.length < 2) return;
      setBusy(true);
      setMessage(null);
      setTimeout(() => {
        const t0 = performance.now();
        const out = routeWaypoints(graph, pts.map((p) => ({ point: p.point, name: p.name })), prof);
        console.info(`route berekend in ${Math.round(performance.now() - t0)} ms`);
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

  const route: RouteResult | undefined = routes[selected];
  const routeKey = wpKey(filled);
  // dagindeling: automatisch aan als de route langer is dan het dagbudget, tenzij je zelf iets kiest
  const multiDay = multiDayChoice?.key === routeKey ? multiDayChoice.on : !!route && route.duration > settings.hoursPerDay * 3600;
  const setMultiDay = (on: boolean) => setMultiDayChoice({ key: routeKey, on });
  const stages: Stage[] = useMemo(() => {
    if (!route || !multiDay) return [];
    return planStages(route, pois, settings.hoursPerDay, settings.startTime, from?.name ?? 'Vertrek', to?.name ?? 'Bestemming');
  }, [route, multiDay, pois, settings.hoursPerDay, settings.startTime, from, to]);

  const destPois = useMemo(() => (to ? poisNear(pois, to.point, 2500, OVERNIGHT_KINDS).slice(0, 8) : []), [pois, to]);

  const setWp = (i: number, p: Place | null) => setWaypoints((w) => w.map((x, j) => (j === i ? p : x)));
  const addVia = () => setWaypoints((w) => [...w.slice(0, -1), null, w[w.length - 1]]);
  const removeWp = (i: number) => setWaypoints((w) => (w.length <= 2 ? w.map((x, j) => (j === i ? null : x)) : w.filter((_, j) => j !== i)));
  const swap = () => setWaypoints((w) => [...w].reverse());

  const startGps = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setGpsError('Geen GPS beschikbaar in deze browser');
      return;
    }
    if (watchRef.current != null) return;
    watchRef.current = navigator.geolocation.watchPosition(
      (p) => {
        const pos: LatLng = [p.coords.latitude, p.coords.longitude];
        let speed = p.coords.speed != null && !isNaN(p.coords.speed) ? p.coords.speed * 3.6 : null;
        let heading = p.coords.heading != null && !isNaN(p.coords.heading) ? p.coords.heading : null;
        const last = lastPosRef.current;
        if (last) {
          const dt = (p.timestamp - last.t) / 1000;
          const d = haversine(last.pos, pos);
          if (speed == null && dt > 0) speed = (d / dt) * 3.6;
          if (heading == null && d > 3) {
            const dLon = (pos[1] - last.pos[1]) * Math.cos((pos[0] * Math.PI) / 180);
            const dLat = pos[0] - last.pos[0];
            heading = ((Math.atan2(dLon, dLat) * 180) / Math.PI + 360) % 360;
          }
        }
        lastPosRef.current = { pos, t: p.timestamp };
        setGps({ pos, heading, speed, acc: p.coords.accuracy });
        setGpsError(null);
      },
      (err) => setGpsError(err.code === 1 ? 'Locatietoegang geweigerd. Sta locatie toe in je browserinstellingen.' : 'Kon positie niet bepalen.'),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 },
    );
  }, []);

  /** GPS uit zodra niets de positie meer nodig heeft: na navigatie en als je de kaart niet meer laat volgen */
  const stopGps = useCallback(() => {
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current = null;
    lastPosRef.current = null;
    setGps(null);
  }, []);

  // app naar de achtergrond: GPS uit als je niet navigeert, en de tocht die je vaart meteen bewaren
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (activeRef.current) saveActiveTrip(activeRef.current);
        if (!navigating) stopGps();
      } else if (navigating || follow || showEmergency) {
        startGps();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [navigating, follow, showEmergency, startGps, stopGps]);
  useEffect(() => () => {
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
  }, []);

  // navigatie-update bij nieuwe GPS positie: positie op route, spraak, nadering sluis/brug, spoor
  useEffect(() => {
    if (!navigating || !gps || !route) return;
    const st = locateOnRoute(route, gps.pos, segRef.current, gps.speed ?? profile.speed);
    segRef.current = st.segIdx;
    setNav(st);
    const active = activeRef.current;
    if (active && addFix(active, gps.pos, gps.speed)) {
      setTrack([...active.track]);
      if (Date.now() - savedAtRef.current > SAVE_EVERY) {
        saveActiveTrip(active);
        savedAtRef.current = Date.now();
      }
    }
    // van de route af (NAV-02): na 20 seconden, of meteen als je op een andere vaarweg bent, een nieuwe route
    const now = Date.now();
    const other = !!graph && st.offRoute > REROUTE.otherWaterway && onOtherWaterway(graph, route, gps.pos);
    if (graph && shouldReroute(st, now, rerouteRef.current, other)) {
      rerouteRef.current.lastAt = now;
      reroute(true, st);
      return;
    }
    // spraak (NAV-01): alleen instructies, met sleutels per plek zodat een herberekende route ze niet herhaalt
    const cue = nextCue(route, st, spokenRef.current);
    if (cue) {
      for (const k of cue.keys) spokenRef.current.add(k);
      speak(cue.text);
      haptic();
    }
    if (st.offRoute >= OFF_ROUTE && !spokenRef.current.has('off')) {
      spokenRef.current.add('off');
      speak('Je bent van de route af. Vaar terug, of de app zoekt zo een nieuwe route.');
    }
    if (st.offRoute < OFF_ROUTE) spokenRef.current.delete('off');
    // nadering sluis of beweegbare brug: tutorial en bedieningsinfo
    const speedKmh = Math.max(gps.speed ?? profile.speed, 2);
    const horizon = (settings.prepMinutes / 60) * speedKmh * 1000;
    const upcoming = [
      ...route.locks.map((l) => ({ kind: 'lock' as const, name: l.name ?? 'sluis', at: l.at, height: null as number | null, ops: l.ops, key: `lock:${placeKey(l.point)}` })),
      ...route.bridges.filter((b) => b.movable && (b.height == null || b.height < profile.height + profile.margin)).map((b) => ({ kind: 'movable_bridge' as const, name: b.name ?? 'brug', at: b.at, height: b.height, ops: b.ops, key: `br:${placeKey(b.point)}` })),
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
      haptic();
    }
    if (st.remaining < 30 && st.offRoute < OFF_ROUTE && !spokenRef.current.has('arrived')) {
      spokenRef.current.add('arrived');
      const leg = route.access?.end;
      const msg = leg ? `Je bent aangekomen bij het water. Nog ${formatDistance(leg.walkDistance)} lopen naar ${leg.name}.` : 'Je bent aangekomen op je bestemming.';
      speak(msg);
      notify(msg);
    }
    // alleen bij een nieuwe GPS-positie of route; reroute en haptic lezen de actuele state en mogen dit niet triggeren
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gps, navigating, route, graph, profile.speed, profile.height, profile.margin, settings.prepMinutes, notify]);

  const pickMyLocation = (i: number) => {
    const apply = (pos: LatLng) => setWp(i, { name: 'Mijn locatie', detail: 'GPS', point: pos, kind: 'gps' });
    if (gps) apply(gps.pos);
    else if (!('geolocation' in navigator)) setMessage('Geen GPS beschikbaar in deze browser. Kies een punt op de kaart.');
    else
      navigator.geolocation.getCurrentPosition(
        (p) => apply([p.coords.latitude, p.coords.longitude]),
        () => setMessage('Kon je locatie niet bepalen. Sta locatie toe of kies een punt op de kaart.'),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
      );
  };

  const onMapClick = (p: LatLng) => {
    if (picking == null) {
      setPoi(null);
      return;
    }
    const snapped = graph?.nearestNode(p, 2500) ?? null;
    setWp(picking, { name: snapped ? `Punt op kaart (${p[0].toFixed(4)}, ${p[1].toFixed(4)})` : 'Punt op kaart', detail: snapped ? 'vaarweg' : 'geen vaarweg in de buurt', point: snapped ? snapped.snapped : p, kind: 'map' });
    setPicking(null);
  };

  const onUserMove = () => {
    setFollow(false);
    if (!navigating && !showEmergency) stopGps();
  };

  const openEmergency = () => {
    setShowEmergency(true);
    startGps();
  };
  const closeEmergency = () => {
    setShowEmergency(false);
    if (!navigating && !follow) stopGps();
  };

  /** Vanuit de onboarding (huurboot) direct naar de vertrekchecklist of een les */
  const openFromOnboarding = (target: OnboardingTarget) => {
    setOnboarding(null);
    if (target === 'checklist') {
      setMoreTab('check');
      setTab('meer');
    } else {
      setLessonToOpen(target);
      setTab('leren');
    }
  };
  const confirmBoat = () => setSettings((s) => (s.boatConfirmed ? s : { ...s, boatConfirmed: true }));
  const check = boatCheck(settings, profile);

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
    rerouteRef.current = newRerouteTimer();
    activeRef.current = startActiveTrip(from?.name ?? 'Vertrek', to?.name ?? 'Bestemming');
    saveActiveTrip(activeRef.current);
    savedAtRef.current = Date.now();
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
    stopGps();
    // logboek
    const active = activeRef.current;
    activeRef.current = null;
    saveActiveTrip(null);
    const entry = active ? buildLogEntry(active) : null;
    if (entry) {
      saveLogs([entry, ...loadLogs()]);
      notify(`Tocht opgeslagen in het logboek: ${formatDistance(entry.distance)}.`);
    }
  };
  /**
   * Nieuwe route vanaf je positie naar de tussenpunten die nog komen (NAV-02). `auto` als de app het zelf doet
   * omdat je van de route af bent. Lukt het niet, of leidt de nieuwe route je alleen terug naar de oude, dan
   * blijft de oude route staan: je zit nooit vast in de navigatie.
   */
  const reroute = (auto: boolean, st: NavState | null = nav) => {
    if (!graph || !route) return;
    if (!gps) {
      if (!auto) notify('Nog geen GPS positie. Wacht even en probeer het opnieuw.', 'info');
      return;
    }
    const along = st?.along ?? 0;
    const rest = filled.slice(1 + passedWaypoints(route, along));
    const pl: Place = { name: 'Mijn locatie', detail: 'GPS', point: gps.pos, kind: 'gps' };
    const out = routeWaypoints(graph, [pl, ...rest].map((p) => ({ point: p.point, name: p.name })), profile);
    if (out.routes.length === 0) {
      if (!auto) notify('Geen nieuwe route gevonden. Vaar terug naar de route of stop de navigatie.', 'fout');
      return;
    }
    const fresh = out.routes[0];
    if (auto && st && leadsBackToRoute(graph, route, fresh, st)) return;
    const msg = rerouteMessage(st?.remainingTime ?? route.duration, fresh.duration);
    setWaypoints([pl, ...rest]);
    setRoutes(out.routes);
    setSelected(0);
    setApproach(null);
    segRef.current = 0;
    notify(msg.text, 'info');
    speak(msg.spoken, true);
    haptic();
  };
  const recalc = () => reroute(false);

  const saveTrip = (name: string) => {
    if (filled.length < 2) return;
    const t: Trip = { id: uid(), name, waypoints: filled.map((w) => ({ name: w.name, point: w.point })), hoursPerDay: settings.hoursPerDay, startTime: settings.startTime, createdAt: new Date().toISOString() };
    setTrips((ts) => [t, ...ts]);
    setNaming(null);
    notify('Tocht bewaard onder Mijn tochten.');
  };
  const openTrip = (t: Trip) => {
    setWaypoints(t.waypoints.map((w) => ({ name: w.name, detail: 'tocht', point: w.point, kind: 'place' as const })));
    setSettings((s) => ({ ...s, hoursPerDay: t.hoursPerDay, startTime: t.startTime }));
    setMultiDayChoice({ key: wpKey(t.waypoints), on: true });
    setRouteTab('tocht');
    setTab('kaart');
  };
  const deleteTrip = (id: string) => {
    const i = trips.findIndex((t) => t.id === id);
    if (i < 0) return;
    const removed = trips[i];
    setTrips((ts) => ts.filter((t) => t.id !== id));
    notify(`Tocht "${removed.name}" gewist.`, 'info', { label: 'Ongedaan maken', run: () => setTrips((ts) => (ts.some((t) => t.id === id) ? ts : [...ts.slice(0, i), removed, ...ts.slice(i)])) });
  };

  const routeToPoi = (p: Poi, asFrom: boolean) => {
    const pl: Place = { name: p.n ?? 'Aanlegplaats', detail: 'haven', point: p.p, kind: 'harbour' };
    if (asFrom) setWp(0, pl);
    else setWp(waypoints.length - 1, pl);
    setPoi(null);
    setTab('kaart');
  };

  const boatType = BOAT_TYPES.find((b) => b.id === profile.type);
  const weatherPoint = gps?.pos ?? from?.point ?? to?.point ?? null;
  const favSet = useMemo(() => new Set(favs), [favs]);
  // tijdens navigatie is de tabbalk weg: vanuit Leren, Tochten of Aan boord altijd terug kunnen
  const backToNav = navigating && (
    <button className="back-to-nav" onClick={() => setTab('kaart')}>‹ Terug naar navigatie</button>
  );

  return (
    <div className={`app ${navigating ? 'navigating' : ''} tab-${tab}`}>
      <MapView
        waypoints={filled.map((w) => ({ point: w.point, name: w.name }))}
        routes={routes}
        selected={selected}
        onSelect={setSelected}
        onMapClick={onMapClick}
        picking={picking != null}
        gps={gps ? { pos: gps.pos, heading: gps.heading } : null}
        follow={follow}
        onUserMove={onUserMove}
        focusStep={focusStep}
        focusPoint={focusPoint}
        fitKey={fitKey}
        navigating={navigating}
        pois={pois}
        showPois={settings.showPois && tab === 'kaart'}
        onPoiClick={(p) => {
          setPoi(p);
          setShowProfile(false);
        }}
        favs={favSet}
        stages={stages}
        track={track}
      />

      {tab === 'kaart' && !navigating && (
        <div className="topbar">
          <div className="brand">
            <span className="logo">⚓</span>
            <div>
              <b>Vaarmaat</b>
              <small>Groene Hart &amp; Hollandse Plassen</small>
            </div>
            <button className="boat-btn" onClick={() => setShowProfile(true)} title="Bootprofiel">
              {boatType?.icon} <span>{profile.name}</span> <small>{profile.height.toFixed(2).replace('.', ',')} m · {profile.speed} km/u</small>
            </button>
          </div>
          <div className="searches">
            {waypoints.map((w, i) => (
              <div key={i} className="wp-row">
                <SearchBox
                  label={i === 0 ? 'A' : i === waypoints.length - 1 ? 'B' : String(i)}
                  placeholder={i === 0 ? 'Vertrekpunt (bijv. Kaag)' : i === waypoints.length - 1 ? 'Bestemming (bijv. Leiden)' : 'Tussenpunt'}
                  value={w}
                  onSelect={(p) => setWp(i, p)}
                  onUseGps={() => pickMyLocation(i)}
                  onPickOnMap={() => setPicking(i)}
                  picking={picking === i}
                />
                {waypoints.length > 2 && i !== 0 && i !== waypoints.length - 1 && (
                  <button className="icon-btn" title="Tussenpunt verwijderen" aria-label="Tussenpunt verwijderen" onClick={() => removeWp(i)}>–</button>
                )}
              </div>
            ))}
            <div className="wp-tools">
              <button onClick={addVia} disabled={waypoints.length >= 8}>+ Tussenpunt</button>
              <button onClick={swap} title="Wissel richting">⇅ Omkeren</button>
            </div>
          </div>
          {picking != null && (
            <div className="hint">
              Tik op de kaart om {picking === 0 ? 'het vertrekpunt' : picking === waypoints.length - 1 ? 'de bestemming' : 'het tussenpunt'} te kiezen. <button onClick={() => setPicking(null)}>Annuleren</button>
            </div>
          )}
          {!graph && !loadError && <div className="hint">Vaarwegen laden…</div>}
          {loadError && <div className="hint error">{loadError}</div>}
          {busy && <div className="hint">Route berekenen…</div>}
          {message && !busy && (
            <div className="hint error" role="alert">
              {message} <button onClick={() => setMessage(null)}>Sluiten</button>
            </div>
          )}
        </div>
      )}

      {tab === 'kaart' && !navigating && !poi && !showProfile && (routes.length === 0 || !follow) && (
        <button className="fab" onClick={() => { startGps(); setFollow(true); }} title={routes.length === 0 ? 'Mijn locatie' : 'Centreer op mijn locatie'} aria-label={routes.length === 0 ? 'Mijn locatie' : 'Centreer op mijn locatie'}>📍</button>
      )}

      {showProfile && (
        <ProfilePanel
          profile={profile}
          onChange={(p) => {
            setProfile(p);
            confirmBoat();
          }}
          onClose={() => setShowProfile(false)}
        />
      )}

      {tab === 'kaart' && poi && !showProfile && (
        <PoiPanel
          poi={poi}
          dist={gps ? haversine(gps.pos, poi.p) : undefined}
          onClose={() => setPoi(null)}
          onRouteTo={() => routeToPoi(poi, false)}
          onRouteFrom={() => routeToPoi(poi, true)}
          fav={favSet.has(poi.id)}
          onFav={() => setFavs((f) => (f.includes(poi.id) ? f.filter((x) => x !== poi.id) : [...f, poi.id]))}
        />
      )}

      {tab === 'kaart' && !showProfile && !navigating && !poi && routes.length > 0 && (
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
          onSaveTrip={() => filled.length >= 2 && setNaming(`${from?.name ?? ''} naar ${to?.name ?? ''}`)}
          destPois={destPois}
          onPoi={(p) => setPoi(p)}
          onFocus={(p) => setFocusPoint([...p])}
          weatherPoint={from?.point ?? null}
          tab={routeTab}
          onTab={setRouteTab}
          boatCheck={check ? { kind: check, text: boatCheckText(check, profile) } : null}
          onBoatEdit={() => setShowProfile(true)}
          onBoatOk={confirmBoat}
        />
      )}

      {navigating && (
        <>
          <NavPanel
            route={route}
            nav={nav}
            destination={to?.name ?? 'je bestemming'}
            speedKmh={gps?.speed ?? null}
            heading={gps?.heading ?? null}
            gpsError={gpsError}
            onStop={stopNavigation}
            onRecalc={recalc}
            following={follow}
            onFollow={() => { startGps(); setFollow(true); }}
            voice={settings.voice}
            onVoice={() => setSettings((s) => ({ ...s, voice: !s.voice }))}
            onEmergency={openEmergency}
          />
          {approach && tab === 'kaart' && (
            <ApproachCard
              a={approach}
              onDismiss={() => setApproach(null)}
              onOpenLesson={(id) => {
                setLessonToOpen(id);
                setTab('leren');
              }}
            />
          )}
        </>
      )}

      {tab === 'tochten' && (
        <div className="overlay">
          {backToNav}
          <TripsView trips={trips} onOpen={openTrip} onDelete={deleteTrip} onNew={() => { setWaypoints([null, null]); setRoutes([]); setTab('kaart'); }} />
        </div>
      )}
      {tab === 'leren' && (
        <div className="overlay">
          {backToNav}
          <LessonsView key={lessonToOpen ?? 'list'} initial={lessonToOpen} />
        </div>
      )}
      {tab === 'meer' && (
        <div className="overlay">
          {backToNav}
          <MoreView
            key={moreTab}
            initialTab={moreTab}
            settings={settings}
            onSettings={setSettings}
            profile={profile}
            onEditProfile={() => { setTab('kaart'); setShowProfile(true); }}
            weatherPoint={weatherPoint}
            notify={notify}
            onEmergency={openEmergency}
            onRestartOnboarding={() => { setTab('kaart'); setOnboarding('welkom'); }}
          />
        </div>
      )}

      {showEmergency && <EmergencyView gps={gps ? { pos: gps.pos, acc: gps.acc } : null} gpsError={gpsError} graph={graph} pois={pois} boatName={profile.name} onClose={closeEmergency} notify={notify} />}
      {onboarding && (
        <Onboarding
          start={onboarding}
          profile={profile}
          onProfile={setProfile}
          onAccept={(skipped) => setSettings((s) => (onboarding === 'afspraak' ? acceptDisclaimer(s) : completeOnboarding(s, profile, skipped)))}
          onClose={() => setOnboarding(null)}
          onOpen={openFromOnboarding}
        />
      )}
      <Toast notice={notice} onClose={closeNotice} />
      {naming != null && <TripNameDialog initial={naming} onCancel={() => setNaming(null)} onSave={saveTrip} />}

      <nav className="tabbar">
        {(
          [
            ['kaart', '🗺️', navigating ? 'Navigatie' : 'Kaart'],
            ['tochten', '🧭', 'Tochten'],
            ['leren', '🎓', 'Leren'],
            ['meer', '⛵', 'Aan boord'],
          ] as [Tab, string, string][]
        ).map(([id, icon, label]) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => { setTab(id); if (id !== 'leren') setLessonToOpen(null); if (id === 'meer') setMoreTab('weer'); }}>
            <span aria-hidden="true">{icon}</span>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
