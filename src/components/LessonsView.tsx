import { useState } from 'react';
import { LESSONS, type Lesson, type LessonSection } from '../content/lessons';
import { loadLessonProgress, saveLessonProgress, type LessonProgress } from '../store';

const LIGHT: Record<string, string> = { red: '#e0261c', green: '#1fa33a', yellow: '#f2c200', white: '#f4f4f4', blue: '#1b5cff' };

export function Signal({ lights }: { lights: string[] }) {
  return (
    <span className="signal">
      {lights.map((l, i) => (
        <span key={i} className="light" style={{ background: LIGHT[l] ?? '#999' }} />
      ))}
    </span>
  );
}

function Section({ s }: { s: LessonSection }) {
  return (
    <section className="lesson-section">
      <h3>{s.title}</h3>
      {s.body && <p>{s.body}</p>}
      {s.steps && (
        <ol className="lesson-steps">
          {s.steps.map((st, i) => (
            <li key={i}>{st}</li>
          ))}
        </ol>
      )}
      {s.signals && (
        <div className="signals">
          {s.signals.map((sg, i) => (
            <div key={i} className="signal-row">
              <Signal lights={sg.lights} />
              <div>
                <b>{sg.label}</b>
                <small>{sg.meaning}</small>
              </div>
            </div>
          ))}
        </div>
      )}
      {s.tips && (
        <div className="tips">
          {s.tips.map((t, i) => (
            <p key={i}>💡 {t}</p>
          ))}
        </div>
      )}
      {s.warning && <div className="warn">⚠️ {s.warning}</div>}
    </section>
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
    <div className="page lesson">
      <div className="page-head">
        <button className="back" onClick={onBack}>‹ Leren</button>
        <h2>{lesson.icon} {lesson.title}</h2>
        <p className="muted small">{lesson.minutes} min lezen · {lesson.summary}</p>
      </div>
      <div className="quick">
        <b>In het kort</b>
        <ul>
          {lesson.quick.map((q, i) => (
            <li key={i}>{q}</li>
          ))}
        </ul>
      </div>
      {lesson.sections.map((s, i) => (
        <Section key={i} s={s} />
      ))}
      {lesson.quiz.length > 0 && (
        <section className="lesson-section quiz">
          <h3>Test jezelf</h3>
          {!showQuiz && <button onClick={() => setShowQuiz(true)}>Start de {lesson.quiz.length} vragen</button>}
          {showQuiz &&
            lesson.quiz.map((q, qi) => (
              <div key={qi} className="quiz-q">
                <b>{q.q}</b>
                {q.options.map((o, oi) => {
                  const chosen = answers[qi];
                  const cls = chosen == null ? '' : oi === q.answer ? 'right' : chosen === oi ? 'wrong' : '';
                  return (
                    <button key={oi} className={`quiz-opt ${cls}`} disabled={chosen != null} onClick={() => setAnswers({ ...answers, [qi]: oi })}>
                      {o}
                    </button>
                  );
                })}
                {answers[qi] != null && <small className="muted">{q.explain}</small>}
              </div>
            ))}
          {done && <div className="warn soft">Score: {Math.round((score ?? 0) * 100)}%</div>}
        </section>
      )}
      <button className="primary" onClick={finish}>{done ? 'Klaar, opslaan' : 'Gelezen'}</button>
    </div>
  );
}

export default function LessonsView({ initial }: { initial?: string | null }) {
  const [progress, setProgress] = useState<LessonProgress>(loadLessonProgress);
  const [open, setOpen] = useState<string | null>(initial ?? null);
  const lesson = LESSONS.find((l) => l.id === open);
  if (lesson) return <LessonView lesson={lesson} onBack={() => setOpen(null)} progress={progress} onProgress={setProgress} />;
  const readCount = progress.read.length;
  return (
    <div className="page">
      <div className="page-head">
        <h2>Leren</h2>
        <p className="muted small">Korte modules over sluizen, bruggen, regels en veiligheid. {readCount} van {LESSONS.length} gelezen. Tijdens het varen krijg je de passende module automatisch als een sluis of brug nadert.</p>
      </div>
      <div className="cards">
        {LESSONS.map((l) => {
          const q = progress.quiz[l.id];
          return (
            <button key={l.id} className="card" onClick={() => setOpen(l.id)}>
              <span className="card-icon">{l.icon}</span>
              <span className="card-body">
                <b>{l.title}</b>
                <small>{l.summary}</small>
                <small className="muted">{l.minutes} min{progress.read.includes(l.id) ? ' · gelezen' : ''}{q != null ? ` · quiz ${Math.round(q * 100)}%` : ''}</small>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
