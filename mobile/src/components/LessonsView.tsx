import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LESSONS, type Lesson, type LessonSection } from '@shared/content/lessons';
import { loadLessonProgress, saveLessonProgress, type LessonProgress } from '@shared/store';
import { Btn, Card, H1, H2, Muted, P, Warn } from './ui';
import { C, T } from '../theme';
import { page } from './styles';

const LIGHT: Record<string, string> = { red: '#e0261c', green: '#1fa33a', yellow: '#f2c200', white: '#f4f4f4', blue: '#1b5cff' };

/** Bruglichten: verticale zwarte balk met lampjes, van boven naar beneden zoals bij de echte brug */
export function Signal({ lights }: { lights: string[] }) {
  return (
    <View style={st.signal}>
      {lights.map((l, i) => (
        <View key={i} style={[st.light, { backgroundColor: LIGHT[l] ?? '#999', shadowColor: LIGHT[l] ?? '#999' }]} />
      ))}
    </View>
  );
}

function Section({ s }: { s: LessonSection }) {
  return (
    <View style={{ gap: 8 }}>
      <H2>{s.title}</H2>
      {s.body && <P>{s.body}</P>}
      {s.steps?.map((stp, i) => (
        <P key={i}>{i + 1}. {stp}</P>
      ))}
      {s.signals?.map((sg, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <Signal lights={sg.lights} />
          <View style={{ flex: 1 }}>
            <Text style={[T.label, { color: C.ink }]}>{sg.label}</Text>
            <Muted>{sg.meaning}</Muted>
          </View>
        </View>
      ))}
      {s.tips?.map((t, i) => (
        <P key={i} style={{ fontSize: 14 }}>💡 {t}</P>
      ))}
      {s.warning && <Warn>⚠️ {s.warning}</Warn>}
    </View>
  );
}

export function LessonView({ lesson, onBack, progress, onProgress }: { lesson: Lesson; onBack: () => void; progress: LessonProgress; onProgress: (p: LessonProgress) => void }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showQuiz, setShowQuiz] = useState(false);
  const done = Object.keys(answers).length === lesson.quiz.length && lesson.quiz.length > 0;
  const score = done ? lesson.quiz.filter((q, i) => answers[i] === q.answer).length / lesson.quiz.length : null;
  const finish = () => {
    const p: LessonProgress = { read: progress.read.includes(lesson.id) ? progress.read : [...progress.read, lesson.id], quiz: { ...progress.quiz, ...(score != null ? { [lesson.id]: score } : {}) } };
    onProgress(p);
    saveLessonProgress(p);
    onBack();
  };
  return (
    <ScrollView contentContainerStyle={[page.page, { gap: 16 }]}>
      <Pressable onPress={onBack} hitSlop={10}>
        <Text style={[T.label, { color: C.blue }]}>‹ Leren</Text>
      </Pressable>
      <View style={{ gap: 4 }}>
        <H1>{lesson.icon} {lesson.title}</H1>
        <Muted>{lesson.minutes} min lezen · {lesson.summary}</Muted>
      </View>
      <View style={st.quick}>
        <Text style={[T.label, { color: C.ink }]}>In het kort</Text>
        {lesson.quick.map((q, i) => (
          <P key={i} style={{ fontSize: 14 }}>• {q}</P>
        ))}
      </View>
      {lesson.sections.map((s, i) => (
        <Section key={i} s={s} />
      ))}
      {lesson.quiz.length > 0 && (
        <View style={{ gap: 10 }}>
          <H2>Test jezelf</H2>
          {!showQuiz && <Btn title={`Start de ${lesson.quiz.length} vragen`} onPress={() => setShowQuiz(true)} />}
          {showQuiz &&
            lesson.quiz.map((q, qi) => (
              <View key={qi} style={{ gap: 6 }}>
                <Text style={[T.label, { fontSize: 15, color: C.ink }]}>{q.q}</Text>
                {q.options.map((o, oi) => {
                  const chosen = answers[qi];
                  const right = chosen != null && oi === q.answer;
                  const wrong = chosen != null && chosen === oi && oi !== q.answer;
                  return (
                    <Pressable key={oi} disabled={chosen != null} onPress={() => setAnswers({ ...answers, [qi]: oi })} style={[st.opt, right && { backgroundColor: C.okBg, borderColor: C.ok }, wrong && { backgroundColor: C.errBg, borderColor: C.err }]}>
                      <Text style={[T.body, { fontSize: 14, color: right ? C.ok : wrong ? C.err : C.ink }]}>{right ? '✓ ' : wrong ? '✗ ' : ''}{o}</Text>
                    </Pressable>
                  );
                })}
                {answers[qi] != null && <Muted>{q.explain}</Muted>}
              </View>
            ))}
          {done && <Warn level="soft">Score: {Math.round((score ?? 0) * 100)}%</Warn>}
        </View>
      )}
      <Btn kind="primary" title={done ? 'Klaar, opslaan' : 'Gelezen'} onPress={finish} />
    </ScrollView>
  );
}

export default function LessonsView({ initial }: { initial?: string | null }) {
  const [progress, setProgress] = useState<LessonProgress>(loadLessonProgress);
  const [open, setOpen] = useState<string | null>(initial ?? null);
  const lesson = LESSONS.find((l) => l.id === open);
  if (lesson) return <LessonView lesson={lesson} onBack={() => setOpen(null)} progress={progress} onProgress={setProgress} />;
  return (
    <ScrollView contentContainerStyle={page.page}>
      <H1>Leren</H1>
      <Muted>Korte modules over sluizen, bruggen, regels en veiligheid. {progress.read.length} van {LESSONS.length} gelezen. Tijdens het varen krijg je de passende module automatisch als een sluis of brug nadert.</Muted>
      {LESSONS.map((l) => {
        const q = progress.quiz[l.id];
        return <Card key={l.id} icon={l.icon} title={l.title} lines={[l.summary, `${l.minutes} min${progress.read.includes(l.id) ? ' · gelezen' : ''}${q != null ? ` · quiz ${Math.round(q * 100)}%` : ''}`]} onPress={() => setOpen(l.id)} />;
      })}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  signal: { backgroundColor: '#222', borderRadius: 8, padding: 5, gap: 4 },
  light: { width: 14, height: 14, borderRadius: 7, shadowOpacity: 0.9, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } },
  quick: { backgroundColor: C.blueSoft, borderRadius: 12, padding: 12, gap: 4 },
  opt: { borderWidth: 1, borderColor: C.line, backgroundColor: C.canvas, borderRadius: 12, padding: 12 },
});
