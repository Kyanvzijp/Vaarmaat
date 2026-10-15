// Noodscherm (verbeterplan VEI-01): bellen, positie doorgeven en Mayday voorlezen. Altijd gratis en zonder internet.
// Zelfde inhoud als ../../src/components/EmergencyView.tsx; de logica komt uit @shared/emergency.
import { useMemo } from 'react';
import { Linking, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import type { Graph } from '@shared/graph';
import type { LatLng, Poi } from '@shared/types';
import type { Notify } from '@shared/notice';
import { formatDecimalDeg, formatDegMin, formatDistance } from '@shared/geo';
import { ALARM_NUMBER, EMERGENCY_TEXT, KNRM_URL, KUSTWACHT_NUMBER, describeLocation, maydayLines, shareText, tel } from '@shared/emergency';
import { Btn, Muted, P } from './ui';
import { C, RADIUS, T } from '../theme';

interface Props {
  gps: { pos: LatLng; acc: number } | null;
  gpsError: string | null;
  graph: Graph | null;
  pois: Poi[];
  boatName: string;
  onClose: () => void;
  notify: Notify;
  top: number;
  bottom: number;
}

const open = (url: string, notify: Notify) => Linking.openURL(url).catch(() => notify('Dat lukt niet op dit toestel. Bel het nummer zelf.', 'fout'));

export default function EmergencyView({ gps, gpsError, graph, pois, boatName, onClose, notify, top, bottom }: Props) {
  const pos = gps?.pos ?? null;
  // omschrijving alleen opnieuw als je echt verplaatst bent, niet bij elke GPS-positie
  const key = pos ? `${pos[0].toFixed(4)},${pos[1].toFixed(4)}` : null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const desc = useMemo(() => (pos ? describeLocation(graph, pois, pos) : null), [key, graph, pois]);
  const [lat, lon] = pos ? formatDegMin(pos).split(', ') : ['', ''];
  const text = pos && desc ? shareText(boatName, pos, desc) : '';

  return (
    <View style={[st.wrap, { paddingTop: top }]} accessibilityViewIsModal>
      <ScrollView contentContainerStyle={[st.inner, { paddingBottom: bottom + 24 }]}>
        <View style={st.head}>
          <Text style={[T.display, { color: C.err }]} accessibilityRole="header">{EMERGENCY_TEXT.title}</Text>
          <Btn title="Sluiten" onPress={onClose} />
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel={`Bel ${ALARM_NUMBER}`} onPress={() => open(tel(ALARM_NUMBER), notify)} style={({ pressed }) => [st.call, pressed && { opacity: 0.85 }]}>
          <Text style={st.callBig}>📞 Bel {ALARM_NUMBER}</Text>
          <Text style={[T.body, { color: C.surface }]}>{EMERGENCY_TEXT.lifeThreat}</Text>
        </Pressable>

        <View style={st.card} accessibilityLiveRegion="polite">
          <Muted>Jouw positie</Muted>
          {pos ? (
            <>
              <Text style={st.dmm} selectable>{lat}{'\n'}{lon}</Text>
              <Muted>{formatDecimalDeg(pos)}</Muted>
              {desc?.waterway && <Text style={st.where}>{desc.waterway}</Text>}
              {desc?.near && <Text style={st.where}>{desc.near.text}</Text>}
              {gps!.acc > 0 && <Muted>Nauwkeurig tot {formatDistance(gps!.acc)}</Muted>}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                <Btn kind="primary" title="Deel positie" flex onPress={() => Share.share({ message: text }).catch(() => notify('Delen lukt niet. Lees je positie voor of neem hem over.', 'fout'))} />
                <Btn title="Sms" flex onPress={() => open(`sms:${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(text)}`, notify)} />
              </View>
            </>
          ) : gpsError ? (
            <P>{gpsError} Geef je positie dan door aan de hand van wat je ziet: de naam van de vaarweg, een brug of een haven.</P>
          ) : (
            <P>Positie zoeken… Ga zo mogelijk naar buiten of houd je telefoon vrij van afdekking.</P>
          )}
        </View>

        <View style={st.card}>
          <P>{EMERGENCY_TEXT.noLifeThreat}</P>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
            <Btn title={`Bel Kustwacht ${KUSTWACHT_NUMBER}`} flex onPress={() => open(tel(KUSTWACHT_NUMBER), notify)} />
            <Btn title="KNRM (website)" flex onPress={() => open(KNRM_URL, notify)} />
          </View>
        </View>

        <View style={st.card}>
          <Text style={[T.h2, { color: C.ink }]} accessibilityRole="header">Mayday via de marifoon</Text>
          <Text style={[T.body, { fontSize: 14, lineHeight: 20, color: C.ink }]}>{EMERGENCY_TEXT.vhf}</Text>
          {maydayLines(boatName, pos, desc).map((l, i) => (
            <Text key={i} style={[T.body, { fontSize: 16, lineHeight: 24, color: l.startsWith('[') ? C.muted : C.ink, fontStyle: l.startsWith('[') ? 'italic' : 'normal' }]}>
              {i + 1}. {l}
            </Text>
          ))}
        </View>

        <Muted>{EMERGENCY_TEXT.offline}</Muted>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  // op Android tekent elevation boven zIndex: hoger dan de navigatiebalken en sheets (elevation 8)
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.surface, zIndex: 850, elevation: 20 },
  inner: { paddingHorizontal: 16, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 56 },
  call: { backgroundColor: C.err, borderRadius: RADIUS, minHeight: 88, padding: 16, alignItems: 'center', justifyContent: 'center', gap: 2 },
  callBig: { fontSize: 28, lineHeight: 34, fontWeight: '700', color: C.surface },
  card: { backgroundColor: C.canvas, borderRadius: 14, padding: 14, gap: 6 },
  dmm: { fontSize: 28, lineHeight: 34, fontWeight: '700', color: C.ink, fontVariant: ['tabular-nums'] },
  where: { ...T.h2, color: C.ink },
});
