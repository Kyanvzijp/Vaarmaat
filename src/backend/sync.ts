// Synchronisatie tussen localStorage (gast) en Supabase (ingelogd), SPEC 6.1.
// Eerste versie: bij inloggen eenmalig lokale data uploaden (bestaande rijen op de server winnen),
// daarna per wijziging een upsert en bij opstarten alles ophalen. De wachtrij voor offline
// wijzigingen (IndexedDB) is nog niet gebouwd; zie docs/BACKEND.md.
import { supabase } from '@/integrations/supabase/client';
import type { Json, LogRow, TripRow } from '@/integrations/supabase/types';
import type { BoatProfile, LatLng, LogEntry, Trip } from '@/types';
import { loadTrips, saveTrips, loadLogs, saveLogs, loadFavs, saveFavs, loadLessonProgress, saveLessonProgress, loadSettings, saveSettings, type LessonProgress, type Settings } from '@/store';
import { loadProfile, saveProfile } from '@/profile';

export interface SyncResult {
  trips: Trip[];
  logs: LogEntry[];
  favs: string[];
  lessons: LessonProgress;
  profile: BoatProfile;
  settings: Settings;
}

const asJson = (v: unknown) => v as Json;

const tripToRow = (t: Trip, userId: string): TripRow => ({
  id: t.id,
  user_id: userId,
  name: t.name,
  waypoints: asJson(t.waypoints),
  hours_per_day: t.hoursPerDay,
  start_time: t.startTime,
  notes: t.notes ?? null,
  created_at: t.createdAt,
  updated_at: new Date().toISOString(),
});
const rowToTrip = (r: TripRow): Trip => ({
  id: r.id,
  name: r.name,
  waypoints: r.waypoints as unknown as { name: string; point: LatLng }[],
  hoursPerDay: Number(r.hours_per_day),
  startTime: r.start_time,
  createdAt: r.created_at,
  notes: r.notes ?? undefined,
});

const logToRow = (l: LogEntry, userId: string): LogRow => ({
  id: l.id,
  user_id: userId,
  date: l.date,
  from: l.from,
  to: l.to,
  distance: l.distance,
  duration: l.duration,
  max_speed: l.maxSpeed,
  avg_speed: l.avgSpeed,
  track: asJson(l.track),
  created_at: l.date,
  updated_at: new Date().toISOString(),
});
const rowToLog = (r: LogRow): LogEntry => ({
  id: r.id,
  date: r.date,
  from: r.from,
  to: r.to,
  distance: Number(r.distance),
  duration: Number(r.duration),
  maxSpeed: Number(r.max_speed),
  avgSpeed: Number(r.avg_speed),
  track: r.track as unknown as LatLng[],
});

/** Eenmalig na inloggen: lokale gastdata naar de server. Rijen die daar al staan blijven staan. */
export async function uploadLocal(userId: string): Promise<void> {
  if (!supabase) return;
  const trips = loadTrips();
  const logs = loadLogs();
  const favs = loadFavs();
  const lessons = loadLessonProgress();
  if (trips.length) await supabase.from('trips').upsert(trips.map((t) => tripToRow(t, userId)), { ignoreDuplicates: true });
  if (logs.length) await supabase.from('logs').upsert(logs.map((l) => logToRow(l, userId)), { ignoreDuplicates: true });
  if (favs.length) await supabase.from('favourites').upsert(favs.map((poi_id) => ({ user_id: userId, poi_id })), { ignoreDuplicates: true });
  const progressRows = [
    ...lessons.read.map((lesson_id) => ({ user_id: userId, lesson_id, read_at: new Date().toISOString(), quiz_score: lessons.quiz[lesson_id] ?? null })),
    ...Object.entries(lessons.quiz)
      .filter(([id]) => !lessons.read.includes(id))
      .map(([lesson_id, quiz_score]) => ({ user_id: userId, lesson_id, read_at: null, quiz_score })),
  ];
  if (progressRows.length) await supabase.from('lesson_progress').upsert(progressRows, { ignoreDuplicates: true });
  const { data: prof } = await supabase.from('profiles').select('boat, settings').eq('id', userId).maybeSingle();
  const boatEmpty = !prof || !prof.boat || Object.keys(prof.boat as object).length === 0;
  if (boatEmpty) await supabase.from('profiles').upsert({ id: userId, boat: asJson(loadProfile()), settings: asJson(loadSettings()) });
}

/** Bij opstarten en na inloggen: alles van de server halen en lokaal samenvoegen (server wint per record). */
export async function pullRemote(userId: string): Promise<SyncResult | null> {
  if (!supabase) return null;
  const [trips, logs, favs, progress, profile] = await Promise.all([
    supabase.from('trips').select('*').eq('user_id', userId).order('updated_at', { ascending: false }),
    supabase.from('logs').select('*').eq('user_id', userId).order('date', { ascending: false }),
    supabase.from('favourites').select('poi_id').eq('user_id', userId),
    supabase.from('lesson_progress').select('*').eq('user_id', userId),
    supabase.from('profiles').select('boat, settings').eq('id', userId).maybeSingle(),
  ]);

  const mergeById = <T extends { id: string }>(local: T[], remote: T[]) => {
    const map = new Map(local.map((x) => [x.id, x]));
    for (const r of remote) map.set(r.id, r);
    return [...map.values()];
  };

  const mergedTrips = mergeById(loadTrips(), (trips.data ?? []).map(rowToTrip)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const mergedLogs = mergeById(loadLogs(), (logs.data ?? []).map(rowToLog)).sort((a, b) => b.date.localeCompare(a.date));
  const mergedFavs = [...new Set([...loadFavs(), ...(favs.data ?? []).map((f) => f.poi_id)])];
  const local = loadLessonProgress();
  const mergedLessons: LessonProgress = { read: [...local.read], quiz: { ...local.quiz } };
  for (const p of progress.data ?? []) {
    if (p.read_at && !mergedLessons.read.includes(p.lesson_id)) mergedLessons.read.push(p.lesson_id);
    if (p.quiz_score != null) mergedLessons.quiz[p.lesson_id] = Math.max(mergedLessons.quiz[p.lesson_id] ?? 0, Number(p.quiz_score));
  }
  const remoteBoat = profile.data?.boat as Partial<BoatProfile> | null | undefined;
  const mergedProfile: BoatProfile = remoteBoat && Object.keys(remoteBoat).length ? { ...loadProfile(), ...remoteBoat } : loadProfile();
  const remoteSettings = profile.data?.settings as Partial<Settings> | null | undefined;
  const mergedSettings: Settings = { ...loadSettings(), ...(remoteSettings ?? {}) };

  saveTrips(mergedTrips);
  saveLogs(mergedLogs);
  saveFavs(mergedFavs);
  saveLessonProgress(mergedLessons);
  saveProfile(mergedProfile);
  saveSettings(mergedSettings);
  return { trips: mergedTrips, logs: mergedLogs, favs: mergedFavs, lessons: mergedLessons, profile: mergedProfile, settings: mergedSettings };
}

// Per wijziging (alleen aanroepen als de gebruiker is ingelogd) ---------------

export async function pushTrip(userId: string, trip: Trip): Promise<void> {
  await supabase?.from('trips').upsert(tripToRow(trip, userId));
}
export async function deleteTrip(userId: string, tripId: string): Promise<void> {
  await supabase?.from('trips').delete().eq('user_id', userId).eq('id', tripId);
}
export async function pushLog(userId: string, log: LogEntry): Promise<void> {
  await supabase?.from('logs').upsert(logToRow(log, userId));
}
export async function deleteLog(userId: string, logId: string): Promise<void> {
  await supabase?.from('logs').delete().eq('user_id', userId).eq('id', logId);
}
export async function setFavourite(userId: string, poiId: string, on: boolean): Promise<void> {
  if (!supabase) return;
  if (on) await supabase.from('favourites').upsert({ user_id: userId, poi_id: poiId }, { ignoreDuplicates: true });
  else await supabase.from('favourites').delete().eq('user_id', userId).eq('poi_id', poiId);
}
export async function pushLessonProgress(userId: string, lessonId: string, readAt: string | null, quizScore: number | null): Promise<void> {
  await supabase?.from('lesson_progress').upsert({ user_id: userId, lesson_id: lessonId, read_at: readAt, quiz_score: quizScore });
}
export async function pushProfile(userId: string, profile: BoatProfile, settings: Settings): Promise<void> {
  await supabase?.from('profiles').upsert({ id: userId, boat: asJson(profile), settings: asJson(settings) });
}
