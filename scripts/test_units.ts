// Unit-tests voor gedeelde logica zonder browser: navigatie, tussenpunten, logboek en GPX.
// Draaien met: npm run test:units
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Graph } from '../src/graph.ts';
import { routeWaypoints } from '../src/trip.ts';
import { locateOnRoute, remainingTimeFor, placeKey } from '../src/navigation.ts';
import { DEFAULT_PROFILE } from '../src/profile.ts';
import { KNOWN_PLACES } from '../src/geocode.ts';
import { buildLogEntry, startActiveTrip, addFix, toGpx } from '../src/logbook.ts';
import { weatherKey } from '../src/weather.ts';
import { formatDegMin, formatDecimalDeg } from '../src/geo.ts';
import { describeLocation, maydayLines, shareText } from '../src/emergency.ts';
import { onboardingStart, completeOnboarding, acceptDisclaimer, boatCheck, boatCheckText, chooseBoatType, markUnsure, DISCLAIMER_VERSION } from '../src/onboarding.ts';
import { DEFAULT_SETTINGS } from '../src/store.ts';
import { nextCue, nextAnnounced } from '../src/navigation.ts';
import { shouldReroute, newRerouteTimer, passedWaypoints, leadsBackToRoute, rerouteMessage } from '../src/reroute.ts';
import { spokenDuration } from '../src/geo.ts';
import type { NavState } from '../src/navigation.ts';
import type { LatLng, LogEntry } from '../src/types.ts';

const g = new Graph(JSON.parse(fs.readFileSync(new URL('../public/data/graph.json', import.meta.url), 'utf8')));
const place = (n: string) => {
  const p = KNOWN_PLACES.find((x) => x.name.startsWith(n))!;
  return { point: p.point, name: p.name };
};

test('tussenpunt is een eigen stap met de naam van het punt', () => {
  const out = routeWaypoints(g, [place('Kaag'), place('Leiden centrum'), place('Alphen')], DEFAULT_PROFILE);
  const r = out.routes[0];
  assert.ok(r, 'route gevonden');
  const wp = r.steps.filter((s) => s.kind === 'waypoint');
  assert.equal(wp.length, 1);
  assert.equal(wp[0].text, 'Tussenpunt 1: Leiden centrum');
  assert.ok(!r.steps.some((s) => /via via|Tussenstop/.test(s.text)));
});

test('resterende tijd springt niet omhoog bij stilliggen', () => {
  const r = routeWaypoints(g, [place('Kaag'), place('Leiden centrum')], DEFAULT_PROFILE).routes[0];
  const remaining = r.distance / 2;
  const planned = r.duration / 2;
  assert.equal(Math.round(remainingTimeFor(r, remaining, 0)), Math.round(planned));
  assert.equal(Math.round(remainingTimeFor(r, remaining, null)), Math.round(planned));
  assert.equal(Math.round(remainingTimeFor(r, remaining, 10070)), Math.round(planned), 'GPS-sprong telt niet');
  // tien minuten stil voor een sluis: de verwachte aankomst schuift precies tien minuten op, niet uren
  const pos = r.coords[Math.floor(r.coords.length / 2)];
  const t0 = Date.UTC(2026, 6, 12, 10, 0);
  const a = locateOnRoute(r, pos, 0, 0, t0);
  const b = locateOnRoute(r, pos, a.segIdx, 0, t0 + 600_000);
  assert.equal(Math.round((b.eta - a.eta) / 1000), 600);
  // varend op kruissnelheid blijft de aankomst dicht bij de planning
  const c = locateOnRoute(r, pos, 0, DEFAULT_PROFILE.speed, t0);
  assert.ok(Math.abs(c.remainingTime - a.remainingTime) < a.remainingTime * 0.25);
});

test('sleutel per plek is stabiel en onderscheidend', () => {
  assert.equal(placeKey([52.123456, 4.987654]), placeKey([52.1234561, 4.9876539]));
  assert.notEqual(placeKey([52.1234, 4.9876]), placeKey([52.1235, 4.9876]));
});

test('logboek: korte tocht telt niet, echte tocht wel, met tijden', () => {
  const t0 = Date.UTC(2026, 6, 12, 10, 0);
  const a = startActiveTrip('Kaag', 'Leiden', t0);
  const start: LatLng = [52.2166, 4.5934];
  for (let i = 0; i < 40; i++) addFix(a, [start[0] - i * 0.0001, start[1]], 9, t0 + i * 5000);
  assert.equal(a.track.length, 40);
  assert.equal(buildLogEntry(a, t0 + 30_000), null, 'korter dan een minuut');
  const e = buildLogEntry(a, t0 + 40 * 5000)!;
  assert.ok(e.distance > 400 && e.distance < 500);
  assert.equal(e.times?.length, e.track.length);
  // een GPS-sprong telt niet als topsnelheid
  addFix(a, [start[0] - 0.01, start[1]], 11235, t0 + 201_000);
  assert.equal(a.maxSpeed, 9);
  // punten dichter dan 8 m bij elkaar worden niet bewaard
  assert.equal(addFix(a, [start[0] - 0.01 - 0.00001, start[1]], 9, t0 + 999_000), false);
});

test('GPX is geldig bij speciale tekens en bevat tijden', () => {
  const l: LogEntry = { id: 'x', date: '2026-07-12T10:00:00.000Z', from: 'Kaag & Braassem', to: '<Leiden>', distance: 1000, duration: 600, maxSpeed: 9, avgSpeed: 6, track: [[52.2, 4.5], [52.21, 4.51]], times: [Date.UTC(2026, 6, 12, 10, 0), Date.UTC(2026, 6, 12, 10, 1)] };
  const gpx = toGpx(l);
  assert.ok(gpx.includes('Kaag &amp; Braassem naar &lt;Leiden&gt;'));
  assert.ok(!/&(?!amp;|lt;|gt;|quot;)/.test(gpx), 'geen losse ampersand');
  assert.equal((gpx.match(/<time>/g) ?? []).length, 3, 'tijd in metadata en per punt');
  const old = toGpx({ ...l, times: undefined });
  assert.equal((old.match(/<time>/g) ?? []).length, 1, 'oude tochten zonder tijden per punt');
});

test('weer: kleine verschuiving geeft dezelfde sleutel', () => {
  assert.equal(weatherKey([52.2166, 4.5934]), weatherKey([52.2171, 4.5941]));
  assert.notEqual(weatherKey([52.2166, 4.5934]), weatherKey([52.25, 4.5934]));
});

test('positie in graden en decimale minuten', () => {
  assert.equal(formatDegMin([52.2166667, 4.5933333]), '52° 13,00′ N, 4° 35,60′ O');
  assert.equal(formatDegMin([52.0001, 4.05]), '52° 00,01′ N, 4° 03,00′ O');
  assert.equal(formatDegMin([51.9999999, -0.5]), '52° 00,00′ N, 0° 30,00′ W', 'afronding naar 60 minuten loopt door');
  assert.equal(formatDecimalDeg([52.2166, 4.5934]), '52,21660° N, 4,59340° O');
});

test('noodscherm omschrijft waar je bent, ook zonder route', () => {
  const pois = JSON.parse(fs.readFileSync(new URL('../public/data/pois.json', import.meta.url), 'utf8'));
  const r = routeWaypoints(g, [place('Kaag'), place('Leiden centrum')], DEFAULT_PROFILE).routes[0];
  const onWater = r.coords[Math.floor(r.coords.length * 0.8)];
  const d = describeLocation(g, pois, onWater);
  assert.ok(d.waterway, 'naam van de vaarweg');
  assert.ok(d.near && d.near.dist < 5000, 'iets bekends in de buurt');
  assert.match(d.near!.text, /^(bij |\d.* ten (noorden|noordoosten|oosten|zuidoosten|zuiden|zuidwesten|westen|noordwesten) van )/);
  const lines = maydayLines('Mijn sloep', onWater, d);
  assert.equal(lines[0], 'Mayday, Mayday, Mayday');
  assert.equal(lines[1], 'Hier is Mijn sloep, Mijn sloep, Mijn sloep');
  assert.ok(lines[3].includes(formatDegMin(onWater)));
  assert.ok(shareText('Mijn sloep', onWater, d).includes('openstreetmap.org/?mlat='));
  // ver weg van alles: geen vaarweg en niets in de buurt, maar wel een positie
  const sea = describeLocation(g, pois, [52.6, 3.5]);
  assert.equal(sea.waterway, null);
  assert.equal(sea.near, null);
  assert.ok(maydayLines('', null, null)[3].includes('[waar je bent]'));
});

test('onboarding: eerste start, overslaan, opnieuw bevestigen', () => {
  assert.equal(onboardingStart(DEFAULT_SETTINGS), 'welkom');
  const p = chooseBoatType(DEFAULT_PROFILE, 'motorboot');
  assert.equal(p.name, 'Mijn motorjacht');
  assert.equal(p.height, 2.6);
  assert.equal(chooseBoatType({ ...DEFAULT_PROFILE, name: 'De Kraai' }, 'motorboot').name, 'De Kraai');
  const done = completeOnboarding(DEFAULT_SETTINGS, p, false);
  assert.equal(onboardingStart(done), null);
  assert.equal(boatCheck(done, p), null);
  // overgeslagen: de eerste route vraagt of het profiel klopt
  const skipped = completeOnboarding(DEFAULT_SETTINGS, DEFAULT_PROFILE, true);
  assert.equal(onboardingStart(skipped), null);
  assert.equal(boatCheck(skipped, DEFAULT_PROFILE), 'skipped');
  assert.equal(boatCheckText('skipped', DEFAULT_PROFILE), 'Je route is berekend voor een sloep van 1,40 m hoog. Klopt dat?');
  assert.equal(boatCheck({ ...skipped, boatConfirmed: true }, DEFAULT_PROFILE), null);
  // geschatte hoogte: standaard van het type, gemarkeerd, en de route blijft vindbaar
  const unsure = markUnsure({ ...DEFAULT_PROFILE, height: 3 });
  assert.equal(unsure.height, 1.4);
  assert.equal(unsure.heightUnsure, true);
  assert.equal(unsure.avoidUnknownBridges, false);
  assert.equal(routeWaypoints(g, [place('Kaag'), place('Leiden centrum')], unsure).routes.length > 0, true);
  assert.equal(boatCheck(completeOnboarding(DEFAULT_SETTINGS, unsure, false), unsure), 'unsure');
  // nieuwe versie van de disclaimer: alleen die opnieuw
  const old = { ...done, disclaimerVersion: DISCLAIMER_VERSION - 1 };
  assert.equal(onboardingStart(old), 'afspraak');
  assert.equal(onboardingStart(acceptDisclaimer(old)), null);
});

const pointAt = (r: { cum: number[]; coords: LatLng[] }, at: number): LatLng => {
  const i = Math.max(0, r.cum.findIndex((c) => c >= at));
  return r.coords[i];
};

test('NAV-01: ruime vaste bruggen zijn stil, krappe krijgen een waarschuwing, onbekende worden samengevat', () => {
  const r = routeWaypoints(g, [place('Kaag'), place('Leiden centrum')], DEFAULT_PROFILE).routes[0];
  const bridges = r.steps.filter((s) => s.kind === 'bridge');
  assert.ok(bridges.some((s) => s.quiet), 'stille bruggen');
  const tight = bridges.find((s) => s.text.startsWith('Let op: Schrijversbrug'));
  assert.equal(tight?.text, 'Let op: Schrijversbrug 1,60 m, je hebt 0,20 m ruimte');
  assert.ok(!tight?.quiet);
  const cluster = bridges.find((s) => /^Let op: de komende \d+ bruggen hebben een onbekende doorvaarthoogte$/.test(s.text));
  assert.ok(cluster && !cluster.quiet, 'gezamenlijke melding voor onbekende bruggen');
  // de navigatie slaat stille stappen over
  for (let at = 0; at < r.distance; at += 250) {
    const st = locateOnRoute(r, pointAt(r, at), 0, 9);
    assert.ok(!st.next?.quiet, `geen stille stap als volgende instructie bij ${at} m`);
  }
});

test('NAV-01: aankondigingen op 600, 250 en 40 m, met daarna bij een stap vlak erachter', () => {
  const r = routeWaypoints(g, [place('Kaag'), place('Leiden centrum')], DEFAULT_PROFILE).routes[0];
  const first = r.steps.find((s) => !s.quiet && s.kind !== 'depart' && s.at > 1000)!;
  const spoken = new Set<string>();
  // toestand op een bepaalde afstand voor de stap
  const at = (d: number, step = first) => ({ next: step, toNext: d, offRoute: 5 }) as NavState;
  assert.equal(nextCue(r, at(800), spoken), null, 'te ver weg');
  const far = nextCue(r, at(500), spoken)!;
  assert.match(far.text, /^over 500 meter /);
  far.keys.forEach((k) => spoken.add(k));
  assert.equal(nextCue(r, at(480), spoken), null, 'niet twee keer');
  const near = nextCue(r, at(150), spoken)!;
  assert.match(near.text, /^over 150 meter /);
  near.keys.forEach((k) => spoken.add(k));
  assert.equal(nextCue(r, at(20), spoken)!.text.startsWith(first.text), true, 'bij de stap zelf');
  // twee instructies binnen 200 m: de tweede wordt meteen genoemd
  const pair = r.steps.find((s) => !s.quiet && s.kind !== 'depart' && (nextAnnounced(r, s)?.at ?? Infinity) - s.at <= 200 && nextAnnounced(r, s)?.kind !== 'arrive');
  assert.ok(pair, 'route heeft twee instructies vlak na elkaar');
  const cue = nextCue(r, at(450, pair), new Set())!;
  assert.ok(cue.text.includes(', daarna '), cue.text);
  // van de route af: geen instructies
  assert.equal(nextCue(r, { ...at(500), offRoute: 200 } as NavState, new Set()), null);
});

test('NAV-02: herberekenen na 20 seconden, op een andere vaarweg meteen, hoogstens eens per 30 seconden', () => {
  const t = newRerouteTimer();
  const st = (off: number) => ({ offRoute: off }) as NavState;
  const t0 = 1_000_000;
  assert.equal(shouldReroute(st(100), t0, t, false), false);
  assert.equal(shouldReroute(st(100), t0 + 19_000, t, false), false);
  assert.equal(shouldReroute(st(100), t0 + 21_000, t, false), true);
  t.lastAt = t0 + 21_000;
  assert.equal(shouldReroute(st(100), t0 + 40_000, t, false), false, 'niet binnen 30 seconden');
  assert.equal(shouldReroute(st(100), t0 + 52_000, t, false), true);
  t.lastAt = t0 + 52_000;
  assert.equal(shouldReroute(st(30), t0 + 90_000, t, false), false, 'terug op de route');
  assert.equal(t.offSince, null);
  assert.equal(shouldReroute(st(50), t0 + 91_000, t, true), true, 'andere vaarweg: meteen');
  assert.equal(shouldReroute(st(50), t0 + 92_000, t, false), false, '50 m op dezelfde vaarweg is geen afwijking');
});

test('NAV-02: oude route houden als de nieuwe er alleen naar terugleidt; gepasseerde tussenpunten overslaan', () => {
  const old = routeWaypoints(g, [place('Kaag'), place('Leiden centrum')], DEFAULT_PROFILE).routes[0];
  const here = pointAt(old, 3000);
  const fromHere = routeWaypoints(g, [{ point: here, name: 'hier' }, place('Leiden centrum')], DEFAULT_PROFILE).routes[0];
  assert.equal(leadsBackToRoute(g, old, fromHere, locateOnRoute(old, here, 0, 9)), true, 'sluit aan waar je al bent');
  assert.equal(leadsBackToRoute(g, old, fromHere, { along: 0, segIdx: 0 }), false, 'sluit pas ver verderop aan: nieuwe route');
  const via = routeWaypoints(g, [place('Kaag'), place('Leiden centrum'), place('Alphen')], DEFAULT_PROFILE).routes[0];
  const wp = via.steps.find((s) => s.kind === 'waypoint')!;
  assert.equal(passedWaypoints(via, wp.at - 500), 0);
  assert.equal(passedWaypoints(via, wp.at + 100), 1);
});

test('NAV-02: melding met het verschil in tijd', () => {
  assert.deepEqual(rerouteMessage(600, 840), { text: 'Nieuwe route berekend, 4 min langer.', spoken: 'Nieuwe route berekend, 4 minuten langer.' });
  assert.equal(rerouteMessage(3600, 600).text, 'Nieuwe route berekend, 50 min korter.');
  assert.equal(rerouteMessage(600, 650).text, 'Nieuwe route berekend, ongeveer even lang.');
  assert.equal(spokenDuration(3900), '1 uur en 5 minuten');
  assert.equal(spokenDuration(60), '1 minuut');
});

test('na een GPS-sprong vindt de navigatie je positie op de route terug', () => {
  const r = routeWaypoints(g, [place('Kaag'), place('Leiden centrum')], DEFAULT_PROFILE).routes[0];
  const sea = locateOnRoute(r, [52.2, 4.25], 0, 9);
  assert.equal(sea.segIdx, r.coords.length - 2, 'ver op zee valt je positie op het eindpunt');
  const back = locateOnRoute(r, [52.161184, 4.510902], sea.segIdx, 9);
  assert.ok(back.offRoute < 20, `weer op de route (${Math.round(back.offRoute)} m)`);
  assert.ok(back.along < r.distance - 500);
});
