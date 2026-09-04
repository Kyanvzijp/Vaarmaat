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
import { loadGraph, type Graph } from './graph';
import { loadProfile, saveProfile, BOAT_TYPES } from './profile';
import { locateOnRoute, type NavState } from './navigation';
import { routeWaypoints, planStages, type Stage } from './trip';
import { loadPois, poisNear, OVERNIGHT_KINDS } from './pois';
import { loadTrips, saveTrips, loadLogs, saveLogs, loadSettings, saveSettings, loadFavs, saveFavs, uid, type Settings } from './store';
import { speak, setVoiceEnabled, spokenDistance } from './voice';
import type { BoatProfile, LatLng, RouteResult, RouteStep, Poi, Trip, LogEntry } from './types';
import type { Place } from './geocode';
import { haversine, formatDistance } from './geo';

type Tab = 'kaart' | 'tochten' | 'leren' | 'meer';
type Picking = number | null; // index van waypoint dat op de kaart gekozen wordt

export default function App() {
  const [graph, setGraph] = useState<Graph | null>(null);
  const [pois, setPois] = useState<Poi[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [profile, setProfile] = useState<BoatProfile>(loadProfile);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [showProfile, setShowProfile] = useState(false);
  const [tab, setTab] = useState<Tab>('kaart');
  const [lessonToOpen, setLessonToOpen] = useState<string | null>(null);

  // planner
  const [waypoints, setWaypoints] = useState<(Place | null)[]>([null, null]);
  const [picking, setPicking] = useState<Picking>(null);
  const [routes, setRoutes] = useState<RouteResult[]>([]);
  const [selected, setSelected] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [routeTab, setRouteTab] = useState<'route' | 'stappen' | 'tocht' | 'aanleggen' | 'weer'>('route');
  const [fitKey, setFitKey] = useState(0);
  const [focusStep, setFocusStep] = useState<RouteStep | null>(null);
  const [focusPoint, setFocusPoint] = useState<LatLng | null>(null);
  const [multiDay, setMultiDay] = useState(false);
  const [trips, setTrips] = useState<Trip[]>(loadTrips);
  const [favs, setFavs] = useState<string[]>(loadFavs);
  const [poi, setPoi] = useState<Poi | null>(null);

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
  const approachedRef = useRef<Set<string>>(new Set());
  const navStartRef = useRef<{ t: number; maxSpeed: number; speeds: number[] } | null>(null);

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

  const route = routes[selected];
  const stages: Stage[] = useMemo(() => {
    if (!route || !multiDay) return [];
    return planStages(route, pois, settings.hoursPerDay, settings.startTime, from?.name ?? 'Vertrek', to?.name ?? 'Bestemming');
  }, [route, multiDay, pois, settings.hoursPerDay, settings.startTime, from, to]);
  useEffect(() => {
    if (route && route.duration > settings.hoursPerDay * 3600) setMultiDay(true);
  }, [route, settings.hoursPerDay]);

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

  const pickMyLocation = (i: number) => {
    startGps();
    const apply = (pos: LatLng) => setWp(i, { name: 'Mijn locatie', detail: 'GPS', point: pos, kind: 'gps' });
    if (gps) apply(gps.pos);
    else
      navigator.geolocation?.getCurrentPosition(
        (p) => apply([p.coords.latitude, p.coords.longitude]),
        () => setMessage('Kon je locatie niet bepalen. Sta locatie toe of kies een punt op de kaart.'),
        { enableHighAccuracy: true, timeout: 15000 },
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
        const logs = [entry, ...loadLogs()];
        saveLogs(logs);
        setMessage(`Tocht opgeslagen in het logboek: ${formatDistance(d)}.`);
      }
    }
    navStartRef.current = null;
  };
  const recalc = () => {
    if (!gps) return;
    const pl: Place = { name: 'Mijn locatie', detail: 'GPS', point: gps.pos, kind: 'gps' };
    const pts = [pl, ...filled.slice(1)];
    setWaypoints([pl, ...waypoints.slice(1)]);
    segRef.current = 0;
    doRoute(pts, profile);
  };

  const saveTrip = () => {
    if (filled.length < 2) return;
    const name = window.prompt('Naam van de tocht', `${from?.name ?? ''} naar ${to?.name ?? ''}`);
    if (!name) return;
    const t: Trip = { id: uid(), name, waypoints: filled.map((w) => ({ name: w.name, point: w.point })), hoursPerDay: settings.hoursPerDay, startTime: settings.startTime, createdAt: new Date().toISOString() };
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

  const boatType = BOAT_TYPES.find((b) => b.id === profile.type);
  const weatherPoint = gps?.pos ?? from?.point ?? to?.point ?? null;
  const favSet = useMemo(() => new Set(favs), [favs]);

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
        onUserMove={() => setFollow(false)}
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
                  <button className="icon-btn" title="Tussenpunt verwijderen" onClick={() => removeWp(i)}>–</button>
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
            <div className="hint error">
              {message} <button onClick={() => setMessage(null)}>ok</button>
            </div>
          )}
        </div>
      )}

      {tab === 'kaart' && !navigating && !poi && !showProfile && routes.length === 0 && (
        <button className="fab" onClick={() => { startGps(); setFollow(true); }} title="Mijn locatie">📍</button>
      )}
      {tab === 'kaart' && !navigating && gps && !follow && routes.length > 0 && (
        <button className="fab" onClick={() => setFollow(true)} title="Centreer op mijn locatie">📍</button>
      )}

      {showProfile && <ProfilePanel profile={profile} onChange={setProfile} onClose={() => setShowProfile(false)} />}

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
          onSaveTrip={saveTrip}
          destPois={destPois}
          onPoi={(p) => setPoi(p)}
          onFocus={(p) => setFocusPoint([...p])}
          weatherPoint={from?.point ?? null}
          tab={routeTab}
          onTab={setRouteTab}
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
          <TripsView trips={trips} onOpen={openTrip} onDelete={(id) => setTrips((ts) => ts.filter((t) => t.id !== id))} onNew={() => { setWaypoints([null, null]); setRoutes([]); setTab('kaart'); }} />
        </div>
      )}
      {tab === 'leren' && (
        <div className="overlay">
          <LessonsView key={lessonToOpen ?? 'list'} initial={lessonToOpen} />
        </div>
      )}
      {tab === 'meer' && (
        <div className="overlay">
          <MoreView settings={settings} onSettings={setSettings} profile={profile} onEditProfile={() => { setTab('kaart'); setShowProfile(true); }} weatherPoint={weatherPoint} />
        </div>
      )}

      <nav className="tabbar">
        {(
          [
            ['kaart', '🗺️', navigating ? 'Navigatie' : 'Kaart'],
            ['tochten', '🧭', 'Tochten'],
            ['leren', '🎓', 'Leren'],
            ['meer', '⛵', 'Aan boord'],
          ] as [Tab, string, string][]
        ).map(([id, icon, label]) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => { setTab(id); if (id !== 'leren') setLessonToOpen(null); }}>
            <span>{icon}</span>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
