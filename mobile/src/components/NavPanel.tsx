// Navigatiemodus volgens STYLEGUIDE 8: instructiebalk bovenin, vijf getallen en drie knoppen onderin.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NavState } from '@shared/navigation';
import type { RouteResult } from '@shared/types';
import { compassName, formatDistance, formatDuration, formatSpeed } from '@shared/geo';
import { STEP_ICONS } from '@shared/stepIcons';
import { C, SHADOW, T } from '../theme';

interface Props {
  /** kan tijdelijk ontbreken; de Stop-knop blijft dan altijd beschikbaar */
  route: RouteResult | undefined;
  nav: NavState | null;
  destination: string;
  speedKmh: number | null;
  heading: number | null;
  gpsError: string | null;
  onStop: () => void;
  onRecalc: () => void;
  following: boolean;
  onFollow: () => void;
  voice: boolean;
  onVoice: () => void;
  onEmergency: () => void;
  top: number;
  bottom: number;
}

const BAR_BG: Record<string, string> = { movable_bridge: '#6a4300', bridge: '#6a4300', lock: '#4a1f8a', arrive: C.starboard };

function Bar({ icon, bg, small, big, detail, action }: { icon: string; bg: string; small?: string; big: string; detail?: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={[st.bar, { backgroundColor: bg }]}>
      <Text style={{ fontSize: 34 }}>{icon}</Text>
      <View style={{ flex: 1 }}>
        {small && <Text style={st.barSmall}>{small}</Text>}
        <Text style={st.barBig}>{big}</Text>
        {detail && <Text style={st.barSmall}>{detail}</Text>}
      </View>
      {action && (
        <Pressable style={st.barBtn} onPress={action.onPress} accessibilityRole="button">
          <Text style={[T.label, { color: C.ink }]}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

/** Binnen deze afstand (m) van het eindpunt ben je aangekomen */
const ARRIVED = 30;

export default function NavPanel({ route, nav, destination, speedKmh, heading, gpsError, onStop, onRecalc, following, onFollow, voice, onVoice, onEmergency, top, bottom }: Props) {
  const next = nav?.next;
  const eta = nav ? new Date(nav.eta).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }) : '--:--';
  const off = nav ? nav.offRoute > 120 : false;
  // alleen aangekomen als je ook echt op de route bent: ver ernaast valt je positie op het eindpunt
  const arrived = !!nav && !off && nav.remaining < ARRIVED;
  const leg = route?.access?.end;
  const then = route && nav && next && !off && !arrived ? route.steps[route.steps.indexOf(next) + 1] : undefined;
  return (
    <>
      <View style={[st.top, { top }]} accessibilityLiveRegion="polite">
        {!route ? (
          <Bar icon="⚠️" bg="#7a1f1f" big="Geen route" detail="Herbereken vanaf je positie of stop de navigatie" action={{ label: 'Herbereken', onPress: onRecalc }} />
        ) : gpsError ? (
          <Bar icon="⚠️" bg="#7a1f1f" big="Geen GPS" detail={gpsError} />
        ) : !nav ? (
          <Bar icon="📡" bg={C.ink} big="Wachten op GPS positie…" detail="Zorg dat locatie is toegestaan" />
        ) : arrived ? (
          <Bar icon="🏁" bg={C.starboard} big="Je bent aangekomen" detail={leg ? `Nog ${formatDistance(leg.walkDistance)} lopen naar ${leg.name}` : destination} action={{ label: 'Klaar', onPress: onStop }} />
        ) : off ? (
          <Bar icon="↩️" bg="#7a1f1f" big={`Je bent ${formatDistance(nav.offRoute)} van de route`} detail="Vaar terug naar de route of herbereken" action={{ label: 'Herbereken', onPress: onRecalc }} />
        ) : (
          next && <Bar icon={STEP_ICONS[next.kind]} bg={BAR_BG[next.kind] ?? C.ink} small={`over ${formatDistance(nav.toNext)}`} big={next.text} detail={next.detail} />
        )}
        {then && (
          <View style={st.then}>
            <Text style={[T.meta, { color: C.muted }]}>daarna {STEP_ICONS[then.kind]} {then.text}</Text>
          </View>
        )}
      </View>
      <View style={[st.bottom, { paddingBottom: bottom + 12 }]}>
        <View style={st.stats}>
          <Stat v={speedKmh != null ? formatSpeed(speedKmh) : '–'} l="snelheid" />
          <Stat v={nav ? formatDuration(nav.remainingTime) : '–'} l="resterend" />
          <Stat v={nav ? formatDistance(nav.remaining) : '–'} l="afstand" />
          <Stat v={eta} l="aankomst" />
          <Stat v={heading != null ? `${Math.round(heading)}° ${compassName(heading)}` : '–'} l="koers" />
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {!following && <NavBtn label="📍 Volg mij" onPress={onFollow} flex />}
          <NavBtn label={voice ? '🔊' : '🔇'} onPress={onVoice} a11y="Gesproken instructies aan of uit" />
          <NavBtn label="Nood" onPress={onEmergency} sos a11y="Noodscherm openen" />
          <NavBtn label="■ Stop" onPress={onStop} danger flex />
        </View>
      </View>
    </>
  );
}

function Stat({ v, l }: { v: string; l: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={[T.h2, { color: C.ink, fontSize: 16 }]} numberOfLines={1} adjustsFontSizeToFit>{v}</Text>
      <Text style={[T.micro, { color: C.muted }]}>{l}</Text>
    </View>
  );
}

function NavBtn({ label, onPress, danger, sos, flex, a11y }: { label: string; onPress: () => void; danger?: boolean; sos?: boolean; flex?: boolean; a11y?: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y ?? label} style={({ pressed }) => [st.navBtn, danger && { backgroundColor: C.errBg }, sos && { backgroundColor: C.err, borderColor: C.err }, flex && { flex: 1 }, pressed && { opacity: 0.75 }]}>
      <Text style={[T.label, { fontSize: 16, color: sos ? C.surface : danger ? C.err : C.ink }]}>{label}</Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  top: { position: 'absolute', left: 12, right: 12, gap: 6 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 14, ...SHADOW },
  barSmall: { ...T.meta, color: 'rgba(255,255,255,0.85)' },
  barBig: { ...T.display, fontSize: 24, lineHeight: 28, color: '#fff' },
  barBtn: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, minHeight: 44, justifyContent: 'center' },
  then: { alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, ...SHADOW },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 12, gap: 12, ...SHADOW },
  stats: { flexDirection: 'row' },
  navBtn: { minHeight: 56, minWidth: 56, borderRadius: 12, backgroundColor: C.canvas, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
});
