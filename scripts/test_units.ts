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
