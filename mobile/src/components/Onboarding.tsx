// Onboarding bij de eerste start (verbeterplan ONB-01 en ONB-02). Zelfde stappen en teksten als ../../src/components/Onboarding.tsx.
import { useState, type ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BoatProfile } from '@shared/types';
import { BOAT_TYPES } from '@shared/profile';
import { LESSONS, CHECKLISTS } from '@shared/content/lessons';
import {
  WELCOME,
  HEIGHT_HELP,
  UNSURE_HELP,
  DISCLAIMER_TITLE,
  DISCLAIMER_POINTS,
  DISCLAIMER_ACCEPT,
  RENTAL_TITLE,
  RENTAL_TEXT,
  boatTypeLine,
  chooseBoatType,
  markUnsure,
  type OnboardingStep,
} from '@shared/onboarding';
import { Btn, Card, Chip, H1, Muted, NumField, P, Row } from './ui';
import { C, T } from '../theme';

export type OnboardingTarget = 'checklist' | 'voorrang' | 'veiligheid';

interface Props {
  start: OnboardingStep;
  profile: BoatProfile;
  onProfile: (p: BoatProfile) => void;
  onAccept: (skipped: boolean) => void;
  onClose: () => void;
  onOpen: (target: OnboardingTarget) => void;
  top: number;
  bottom: number;
}

const lesson = (id: string) => LESSONS.find((l) => l.id === id)!;
const vertrek = CHECKLISTS.find((c) => c.id === 'vertrek')!;
const RENTAL_LINKS: { target: OnboardingTarget; icon: string; title: string; text: string }[] = [
  { target: 'checklist', icon: vertrek.icon, title: vertrek.title, text: `${vertrek.items.length} punten, in een paar minuten klaar.` },
  { target: 'voorrang', icon: lesson('voorrang').icon, title: lesson('voorrang').title, text: lesson('voorrang').summary },
  { target: 'veiligheid', icon: lesson('veiligheid').icon, title: lesson('veiligheid').title, text: lesson('veiligheid').summary },
];

/** Tekening: van de waterlijn tot het hoogste punt, opgebouwd uit vlakken */
function HeightDrawing() {
  return (
    <View style={d.box} accessible accessibilityRole="image" accessibilityLabel="Hoogte boven water: van de waterlijn tot het hoogste punt van de boot">
      <View style={d.water} />
      <View style={d.hull} />
      <View style={d.cabin} />
      <View style={d.bimini} />
      <View style={d.mast} />
      <View style={[d.guide, { top: 16, left: 128, width: 86 }]} />
      <View style={[d.guide, { top: 86, left: 186, width: 28 }]} />
      <View style={d.arrow} />
      <View style={[d.head, { top: 14 }]} />
      <View style={[d.head, d.headDown, { top: 80 }]} />
    </View>
  );
}

export default function Onboarding({ start, profile, onProfile, onAccept, onClose, onOpen, top, bottom }: Props) {
  const disclaimerOnly = start === 'afspraak';
  const [step, setStep] = useState<OnboardingStep>(start);
  const [skipped, setSkipped] = useState(false);
  const flow: OnboardingStep[] = disclaimerOnly ? ['afspraak'] : skipped ? ['welkom', 'afspraak'] : ['welkom', 'boot', 'maten', 'afspraak', ...(profile.rental ? (['huur'] as const) : [])];
  const index = flow.indexOf(step);
  const back = !disclaimerOnly && index > 0 && step !== 'huur' ? () => setStep(flow[index - 1]) : null;
  const heightOk = profile.height > 0 && profile.speed > 0;

  let body: ReactNode = null;
  let actions: ReactNode = null;
  if (step === 'welkom') {
    body = (
      <>
        <Image source={require('../../assets/icon.png')} style={st.logo} accessibilityIgnoresInvertColors />
        <H1>{WELCOME.title}</H1>
        <P style={{ fontSize: 17, lineHeight: 24 }}>{WELCOME.promise}</P>
        {WELCOME.points.map((p) => (
          <Row key={p} style={{ alignItems: 'flex-start' }}>
            <Text style={[T.body, { color: C.blue }]}>•</Text>
            <P style={{ flex: 1 }}>{p}</P>
          </Row>
        ))}
        <Muted>Eerst je boot: dan rekent de app alleen routes waar jouw boot onderdoor en doorheen past.</Muted>
      </>
    );
    actions = (
      <>
        <Btn kind="primary" title="Boot instellen" onPress={() => setStep('boot')} />
        <Btn title="Later" onPress={() => { setSkipped(true); setStep('afspraak'); }} />
      </>
    );
  } else if (step === 'boot') {
    body = (
      <>
        <H1>Wat voor boot vaar je?</H1>
        <View style={st.types} accessibilityRole="radiogroup">
          {BOAT_TYPES.map((t) => {
            const active = profile.type === t.id;
            return (
              <Pressable key={t.id} accessibilityRole="radio" accessibilityState={{ checked: active }} onPress={() => onProfile(chooseBoatType(profile, t.id))} style={[st.type, active && st.typeActive]}>
                <Text style={{ fontSize: 28 }}>{t.icon}</Text>
                <Text style={[T.label, { fontSize: 14, color: C.ink }]}>{t.label}</Text>
                <Muted>{boatTypeLine(t)}</Muted>
              </Pressable>
            );
          })}
        </View>
        <Text style={[T.label, { fontSize: 14, color: C.ink, marginTop: 6 }]}>Is het een huurboot?</Text>
        <Row>
          <Chip active={!!profile.rental} title="Ja, ik huur" onPress={() => onProfile({ ...profile, rental: true })} />
          <Chip active={!profile.rental} title="Nee" onPress={() => onProfile({ ...profile, rental: false })} />
        </Row>
      </>
    );
    actions = <Btn kind="primary" title="Volgende" onPress={() => setStep('maten')} />;
  } else if (step === 'maten') {
    body = (
      <>
        <H1>Hoe groot is je boot?</H1>
        <HeightDrawing />
        <P style={{ fontSize: 14 }}>{HEIGHT_HELP}</P>
        <NumField label="Hoogte boven water" value={profile.height} min={0.2} max={30} unit="m" onChange={(v) => onProfile({ ...profile, height: v, heightUnsure: false })} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <NumField label="Diepgang" value={profile.draft} min={0} max={5} unit="m" onChange={(v) => onProfile({ ...profile, draft: v })} />
          <NumField label="Kruissnelheid" value={profile.speed} min={1} max={60} unit="km/u" onChange={(v) => onProfile({ ...profile, speed: v })} />
        </View>
        <Pressable accessibilityRole="button" style={st.link} onPress={() => { onProfile(markUnsure(profile)); setStep('afspraak'); }}>
          <Text style={[T.label, { fontSize: 15, color: C.blueDark, textDecorationLine: 'underline' }]}>Ik weet het niet precies</Text>
        </Pressable>
        <Muted>{UNSURE_HELP}</Muted>
      </>
    );
    actions = <Btn kind="primary" title="Volgende" disabled={!heightOk} onPress={() => setStep('afspraak')} />;
  } else if (step === 'afspraak') {
    body = (
      <>
        <H1>{DISCLAIMER_TITLE}</H1>
        {disclaimerOnly && <P style={{ fontSize: 14 }}>We hebben deze afspraken aangepast. Lees ze even door.</P>}
        {DISCLAIMER_POINTS.map((p, i) => (
          <View key={p.title} style={st.point}>
            <Text style={st.pointNr}>{i + 1}</Text>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[T.label, { fontSize: 15, color: C.ink }]}>{p.title}</Text>
              <Text style={[T.body, { fontSize: 14, lineHeight: 20, color: C.ink }]}>{p.text}</Text>
            </View>
          </View>
        ))}
        <Muted>Je leest dit later terug onder Aan boord, Instellingen, Over Vaarmaat.</Muted>
      </>
    );
    actions = (
      <Btn
        kind="primary"
        title={DISCLAIMER_ACCEPT}
        onPress={() => {
          onAccept(skipped);
          if (!disclaimerOnly && !skipped && profile.rental) setStep('huur');
          else onClose();
        }}
      />
    );
  } else if (step === 'huur') {
    body = (
      <>
        <H1>{RENTAL_TITLE}</H1>
        <P style={{ fontSize: 14 }}>{RENTAL_TEXT}</P>
        {RENTAL_LINKS.map((l) => (
          <Card key={l.target} icon={l.icon} title={l.title} lines={[l.text]} onPress={() => onOpen(l.target)} />
        ))}
      </>
    );
    actions = <Btn kind="primary" title="Naar de kaart" onPress={onClose} />;
  }

  return (
    <View style={[st.wrap, { paddingTop: top + 8, paddingBottom: bottom + 12 }]} accessibilityViewIsModal>
      {!disclaimerOnly && (
        <View style={st.top}>
          {back ? (
            <Pressable accessibilityRole="button" onPress={back} style={st.back}>
              <Text style={[T.label, { fontSize: 15, color: C.blueDark }]}>‹ Terug</Text>
            </Pressable>
          ) : (
            <View />
          )}
          <View style={st.dots} accessibilityLabel={`Stap ${index + 1} van ${flow.length}`}>
            {flow.map((s, i) => (
              <View key={s} style={[st.dot, i < index && { backgroundColor: C.muted }, i === index && st.dotActive]} />
            ))}
          </View>
        </View>
      )}
      <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 12 }} keyboardShouldPersistTaps="handled">
        {body}
      </ScrollView>
      <View style={{ gap: 8 }}>{actions}</View>
    </View>
  );
}

const st = StyleSheet.create({
  // op Android tekent elevation boven zIndex: hoger dan de bovenbalk en sheets (elevation 8)
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.surface, paddingHorizontal: 16, zIndex: 900, elevation: 22 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  back: { minHeight: 44, justifyContent: 'center', paddingRight: 12 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.line },
  dotActive: { width: 20, backgroundColor: C.blue },
  logo: { width: 72, height: 72, alignSelf: 'center', marginTop: 8, borderRadius: 16 },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  type: { width: '48%', flexGrow: 1, minHeight: 88, gap: 2, padding: 10, borderRadius: 12, backgroundColor: C.canvas, borderWidth: 1, borderColor: C.line },
  typeActive: { backgroundColor: C.blueSoft, borderColor: C.blue, borderWidth: 2 },
  link: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  point: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  pointNr: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.blueSoft, color: C.blueDark, textAlign: 'center', lineHeight: 28, fontWeight: '700', overflow: 'hidden' },
});

const d = StyleSheet.create({
  box: { width: 240, height: 118, alignSelf: 'center' },
  water: { position: 'absolute', left: 0, right: 0, top: 86, height: 32, backgroundColor: C.water, borderTopWidth: 2, borderTopColor: C.blue },
  hull: { position: 'absolute', left: 24, top: 66, width: 162, height: 28, backgroundColor: C.ink, borderBottomLeftRadius: 20, borderBottomRightRadius: 8 },
  cabin: { position: 'absolute', left: 70, top: 46, width: 72, height: 20, borderWidth: 2, borderColor: C.ink, backgroundColor: C.canvas, borderRadius: 4 },
  bimini: { position: 'absolute', left: 92, top: 30, width: 44, height: 16, borderWidth: 2, borderBottomWidth: 0, borderColor: C.ink, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  mast: { position: 'absolute', left: 127, top: 16, width: 2, height: 14, backgroundColor: C.ink },
  guide: { position: 'absolute', height: 1, backgroundColor: C.muted },
  arrow: { position: 'absolute', left: 207, top: 20, width: 2, height: 62, backgroundColor: C.port },
  head: { position: 'absolute', left: 203, width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5, borderBottomWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: C.port },
  headDown: { transform: [{ rotate: '180deg' }] },
});
