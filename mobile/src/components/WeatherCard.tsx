import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { LatLng } from '@shared/types';
import { assess, beaufort, fetchWeather, weatherGridPoint, weatherIcon, weatherKey, windName, type Weather } from '@shared/weather';
import { useNow } from '../useNow';
import { Btn, Muted, P } from './ui';
import { C, T } from '../theme';

const clock = (iso: string) => new Date(iso).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });

type Result = { key: string; w?: Weather; failed?: boolean };

export default function WeatherCard({ point, label, compact }: { point: LatLng | null; label?: string; compact?: boolean }) {
  // het weer hangt aan een rastervak van ongeveer 2 km, zodat een nieuwe GPS-positie het niet steeds opnieuw ophaalt
  const key = point ? weatherKey(point) : null;
  const [attempt, setAttempt] = useState(0);
  const [res, setRes] = useState<Result | null>(null);
  const now = useNow(60000);
  useEffect(() => {
    if (!key || !point) return;
    const ac = new AbortController();
    fetchWeather(weatherGridPoint(point), ac.signal)
      .then((w) => setRes({ key, w }))
      .catch(() => {
        if (!ac.signal.aborted) setRes({ key, failed: true });
      });
    return () => ac.abort();
    // point zelf hoort niet in de afhankelijkheden: alleen een ander rastervak haalt het weer opnieuw op
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);
  if (!point) return <Muted>Kies een vertrekpunt of bestemming voor het weer.</Muted>;
  const cur = res?.key === key ? res : null;
  if (cur?.failed)
    return (
      <View style={{ gap: 8, alignItems: 'flex-start' }}>
        <Muted>Het weer is nu niet beschikbaar. Controleer je verbinding en probeer het opnieuw.</Muted>
        <Btn small title="Opnieuw" onPress={() => { setRes(null); setAttempt((a) => a + 1); }} />
      </View>
    );
  const w = cur?.w;
  if (!w) return <Muted>Weer laden…</Muted>;
  const a = assess(w);
  const upcoming = w.hours.filter((h) => new Date(h.time).getTime() >= now - 3600e3).slice(0, compact ? 8 : 24);
  const badge = a.level === 'ok' ? { bg: C.okBg, fg: C.ok, t: 'Goed vaarweer' } : a.level === 'let_op' ? { bg: C.warnBg, fg: C.warn, t: 'Let op' } : { bg: C.errBg, fg: C.err, t: 'Niet varen' };
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={[T.label, { color: C.ink }]}>{label ?? 'Weer op de route'}</Text>
        <Text style={[st.badge, { backgroundColor: badge.bg, color: badge.fg }]}>{badge.t}</Text>
      </View>
      <P style={{ fontSize: 14 }}>{a.text}</P>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {upcoming.map((h) => (
          <View key={h.time} style={st.hour}>
            <Muted>{clock(h.time)}</Muted>
            <Text style={{ fontSize: 20 }}>{weatherIcon(h.code)}</Text>
            <Text style={[T.label, { color: C.ink }]}>{Math.round(h.temp)}°</Text>
            <Text style={{ transform: [{ rotate: `${h.dir}deg` }], color: C.ink }}>↓</Text>
            <Muted>{windName(h.dir)} {beaufort(h.wind)}{beaufort(h.gust) > beaufort(h.wind) ? `-${beaufort(h.gust)}` : ''}</Muted>
            {h.rain > 0.1 && <Muted>💧{h.rain.toFixed(1).replace('.', ',')}</Muted>}
          </View>
        ))}
      </ScrollView>
      {w.sunrise && w.sunset && (
        <Muted>Zon op {clock(w.sunrise)}, onder {clock(w.sunset)}. Verlichting verplicht tussen zonsondergang en zonsopkomst. Bron: Open-Meteo.</Muted>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  badge: { ...T.label, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  hour: { alignItems: 'center', gap: 2, backgroundColor: C.canvas, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10, minWidth: 64 },
});
