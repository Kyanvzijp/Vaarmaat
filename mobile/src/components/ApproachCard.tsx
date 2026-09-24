import { Linking, StyleSheet, Text, View } from 'react-native';
import type { OpsInfo } from '@shared/types';
import { LESSONS } from '@shared/content/lessons';
import { formatDistance, formatHeight } from '@shared/geo';
import { Btn, Fact, IconBtn, Muted } from './ui';
import { C, RADIUS, SHADOW, T } from '../theme';

export interface Approach {
  kind: 'lock' | 'movable_bridge';
  name: string;
  /** afstand (m) */
  dist: number;
  /** minuten tot aankomst */
  minutes: number;
  height: number | null;
  ops?: OpsInfo;
  key: string;
}

const Link = ({ url, children }: { url: string; children: string }) => (
  <Text style={[T.meta, { color: C.blue }]} onPress={() => Linking.openURL(url)}>{children}</Text>
);

export function OpsFacts({ ops }: { ops?: OpsInfo }) {
  if (!ops) return <Muted>Geen bedieningsinformatie bekend. Kijk op het bord bij het object of in de app van de beheerder.</Muted>;
  return (
    <View>
      {ops.vhf && <Fact label="Marifoon">{`kanaal ${ops.vhf}`}</Fact>}
      {ops.oh && <Fact label="Bediening">{ops.oh}</Fact>}
      {ops.tel && <Fact label="Telefoon"><Link url={`tel:${ops.tel.replace(/\s/g, '')}`}>{ops.tel}</Link></Fact>}
      {ops.op && <Fact label="Beheerder">{ops.op}</Fact>}
      {ops.self && <Fact label="Bediening">zelfbediening</Fact>}
      {ops.web && <Fact label="Website"><Link url={ops.web}>{ops.web.replace(/^https?:\/\//, '').slice(0, 40)}</Link></Fact>}
      {ops.note && <Fact label="Info">{ops.note}</Fact>}
    </View>
  );
}

export default function ApproachCard({ a, onOpenLesson, onDismiss, top }: { a: Approach; onOpenLesson: (id: string) => void; onDismiss: () => void; top: number }) {
  const lesson = LESSONS.find((l) => l.id === (a.kind === 'lock' ? 'sluis' : 'brug'))!;
  return (
    <View style={[st.card, { top, borderLeftColor: a.kind === 'lock' ? C.lock : C.movable }]}>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
        <Text style={{ fontSize: 30 }}>{a.kind === 'lock' ? '🔒' : '🌉'}</Text>
        <View style={{ flex: 1 }}>
          <Muted>Over ongeveer {a.minutes} min · {formatDistance(a.dist)}</Muted>
          <Text style={[T.h2, { color: C.ink }]}>{a.kind === 'lock' ? 'Sluis' : 'Beweegbare brug'}: {a.name}</Text>
          {a.height != null && <Muted>doorvaarthoogte {formatHeight(a.height)}</Muted>}
        </View>
        <IconBtn label="×" a11y="Sluiten" onPress={onDismiss} />
      </View>
      <OpsFacts ops={a.ops} />
      <Text style={[T.label, { color: C.ink }]}>Voorbereiden</Text>
      {lesson.quick.map((q, i) => (
        <Text key={i} style={[T.meta, { color: C.ink }]}>• {q}</Text>
      ))}
      <Btn kind="primary" title={`${lesson.icon} Uitleg: ${lesson.title}`} onPress={() => onOpenLesson(lesson.id)} />
    </View>
  );
}

const st = StyleSheet.create({
  card: { position: 'absolute', left: 12, right: 12, backgroundColor: '#fff', borderRadius: RADIUS, borderLeftWidth: 6, padding: 12, gap: 6, maxHeight: '60%', ...SHADOW },
});
