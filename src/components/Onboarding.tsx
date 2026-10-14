import { useEffect, useRef, useState } from 'react';
import type { BoatProfile } from '../types';
import { BOAT_TYPES } from '../profile';
import { LESSONS, CHECKLISTS } from '../content/lessons';
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
} from '../onboarding';

export type OnboardingTarget = 'checklist' | 'voorrang' | 'veiligheid';

interface Props {
  /** 'welkom' bij de eerste start, 'afspraak' als alleen een nieuwe versie van de disclaimer bevestigd moet worden */
  start: OnboardingStep;
  profile: BoatProfile;
  onProfile: (p: BoatProfile) => void;
  /** disclaimer bevestigd; `skipped` als de boot niet is ingesteld */
  onAccept: (skipped: boolean) => void;
  onClose: () => void;
  onOpen: (target: OnboardingTarget) => void;
}

const lesson = (id: string) => LESSONS.find((l) => l.id === id)!;
const vertrek = CHECKLISTS.find((c) => c.id === 'vertrek')!;
/** Wat iemand die voor het eerst vaart vooraf doorneemt; titels en uitleg komen uit de lessen zelf */
const RENTAL_LINKS: { target: OnboardingTarget; icon: string; title: string; text: string }[] = [
  { target: 'checklist', icon: vertrek.icon, title: vertrek.title, text: `${vertrek.items.length} punten, in een paar minuten klaar.` },
  { target: 'voorrang', icon: lesson('voorrang').icon, title: lesson('voorrang').title, text: lesson('voorrang').summary },
  { target: 'veiligheid', icon: lesson('veiligheid').icon, title: lesson('veiligheid').title, text: lesson('veiligheid').summary },
];

/** Tekst naar getal; accepteert komma en punt */
const parseNum = (v: string) => parseFloat(v.replace(',', '.'));
const fmtNum = (v: number) => String(v).replace('.', ',');

function NumInput({ id, label, value, unit, min, max, onChange }: { id: string; label: string; value: number; unit: string; min: number; max: number; onChange: (v: number) => void }) {
  const [text, setText] = useState(fmtNum(value));
  const [shown, setShown] = useState(value);
  if (shown !== value) {
    setShown(value);
    if (parseNum(text) !== value) setText(fmtNum(value));
  }
  const n = parseNum(text);
  const invalid = text.trim() !== '' && (isNaN(n) || n < min || n > max);
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <span className={`field-input ${invalid ? 'invalid' : ''}`}>
        <input
          id={id}
          inputMode="decimal"
          value={text}
          aria-invalid={invalid}
          onChange={(e) => {
            setText(e.target.value);
            const v = parseNum(e.target.value);
            if (!isNaN(v) && v >= min && v <= max) {
              setShown(v);
              onChange(v);
            }
          }}
        />
        <em>{unit}</em>
      </span>
      {invalid && <small className="field-error">Vul een getal in tussen {fmtNum(min)} en {fmtNum(max)}.</small>}
    </label>
  );
}

/** Tekening: van de waterlijn tot het hoogste punt */
function HeightDrawing() {
  return (
    <svg className="height-drawing" viewBox="0 0 240 118" role="img" aria-label="Hoogte boven water: van de waterlijn tot het hoogste punt van de boot">
      <rect className="hd-water" x="0" y="86" width="240" height="32" />
      <path className="hd-wave" d="M0 86 q10 -4 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0" />
      <path className="hd-hull" d="M24 66 H186 L172 94 H40 Z" />
      <rect className="hd-cabin" x="70" y="46" width="72" height="20" rx="4" />
      <path className="hd-bimini" d="M92 46 L96 30 H132 L136 46" />
      <line className="hd-mast" x1="128" y1="30" x2="128" y2="16" />
      <line className="hd-guide" x1="128" y1="16" x2="214" y2="16" />
      <line className="hd-guide" x1="186" y1="86" x2="214" y2="86" />
      <line className="hd-arrow" x1="208" y1="20" x2="208" y2="82" />
      <path className="hd-head" d="M203 24 L208 16 L213 24 Z M203 78 L208 86 L213 78 Z" />
    </svg>
  );
}

export default function Onboarding({ start, profile, onProfile, onAccept, onClose, onOpen }: Props) {
  const disclaimerOnly = start === 'afspraak';
  const [step, setStep] = useState<OnboardingStep>(start);
  const [skipped, setSkipped] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  // bij elke stap de focus op de kop, zodat schermlezers en toetsenbord meegaan
  useEffect(() => headingRef.current?.focus(), [step]);

  const flow: OnboardingStep[] = disclaimerOnly ? ['afspraak'] : skipped ? ['welkom', 'afspraak'] : ['welkom', 'boot', 'maten', 'afspraak', ...(profile.rental ? (['huur'] as const) : [])];
  const index = flow.indexOf(step);
  const back = !disclaimerOnly && index > 0 && step !== 'huur' ? () => setStep(flow[index - 1]) : null;
  const heightOk = profile.height > 0 && profile.speed > 0;

  return (
    <div className="onboarding">
      <div className="onb-card" role="dialog" aria-modal="true" aria-labelledby="onb-title">
        {!disclaimerOnly && (
          <div className="onb-top">
            {back ? <button className="onb-back" onClick={back}>‹ Terug</button> : <span />}
            <ol className="onb-dots" aria-label={`Stap ${index + 1} van ${flow.length}`}>
              {flow.map((s, i) => (
                <li key={s} className={i === index ? 'active' : i < index ? 'done' : ''} />
              ))}
            </ol>
          </div>
        )}

        {step === 'welkom' && (
          <>
            <img className="onb-logo" src="/favicon.svg" alt="" width={72} height={72} />
            <h2 id="onb-title" ref={headingRef} tabIndex={-1}>{WELCOME.title}</h2>
            <p className="onb-lead">{WELCOME.promise}</p>
            <ul className="onb-points">
              {WELCOME.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <p className="muted small">Eerst je boot: dan rekent de app alleen routes waar jouw boot onderdoor en doorheen past.</p>
            <div className="onb-actions">
              <button className="primary" onClick={() => setStep('boot')}>Boot instellen</button>
              <button className="link" onClick={() => { setSkipped(true); setStep('afspraak'); }}>Later</button>
            </div>
          </>
        )}

        {step === 'boot' && (
          <>
            <h2 id="onb-title" ref={headingRef} tabIndex={-1}>Wat voor boot vaar je?</h2>
            <div className="onb-types" role="radiogroup" aria-label="Boottype">
              {BOAT_TYPES.map((t) => (
                <button key={t.id} role="radio" aria-checked={profile.type === t.id} className={`onb-type ${profile.type === t.id ? 'active' : ''}`} onClick={() => onProfile(chooseBoatType(profile, t.id))}>
                  <span className="onb-type-icon" aria-hidden="true">{t.icon}</span>
                  <b>{t.label}</b>
                  <small>{boatTypeLine(t)}</small>
                </button>
              ))}
            </div>
            <fieldset className="onb-rental">
              <legend>Is het een huurboot?</legend>
              <div className="onb-choice">
                <button className={`chip ${profile.rental ? 'active' : ''}`} aria-pressed={!!profile.rental} onClick={() => onProfile({ ...profile, rental: true })}>Ja, ik huur</button>
                <button className={`chip ${!profile.rental ? 'active' : ''}`} aria-pressed={!profile.rental} onClick={() => onProfile({ ...profile, rental: false })}>Nee</button>
              </div>
            </fieldset>
            <div className="onb-actions">
              <button className="primary" onClick={() => setStep('maten')}>Volgende</button>
            </div>
          </>
        )}

        {step === 'maten' && (
          <>
            <h2 id="onb-title" ref={headingRef} tabIndex={-1}>Hoe groot is je boot?</h2>
            <HeightDrawing />
            <p className="small">{HEIGHT_HELP}</p>
            <NumInput id="onb-height" label="Hoogte boven water" value={profile.height} unit="m" min={0.2} max={30} onChange={(v) => onProfile({ ...profile, height: v, heightUnsure: false })} />
            <div className="grid2">
              <NumInput id="onb-draft" label="Diepgang" value={profile.draft} unit="m" min={0} max={5} onChange={(v) => onProfile({ ...profile, draft: v })} />
              <NumInput id="onb-speed" label="Kruissnelheid" value={profile.speed} unit="km/u" min={1} max={60} onChange={(v) => onProfile({ ...profile, speed: v })} />
            </div>
            <button
              className="link onb-unsure"
              onClick={() => {
                onProfile(markUnsure(profile));
                setStep('afspraak');
              }}
            >
              Ik weet het niet precies
            </button>
            <p className="muted small">{UNSURE_HELP}</p>
            <div className="onb-actions">
              <button className="primary" disabled={!heightOk} onClick={() => setStep('afspraak')}>Volgende</button>
            </div>
          </>
        )}

        {step === 'afspraak' && (
          <>
            <h2 id="onb-title" ref={headingRef} tabIndex={-1}>{DISCLAIMER_TITLE}</h2>
            {disclaimerOnly && <p className="small">We hebben deze afspraken aangepast. Lees ze even door.</p>}
            <ol className="onb-disclaimer">
              {DISCLAIMER_POINTS.map((p) => (
                <li key={p.title}>
                  <b>{p.title}</b>
                  <span>{p.text}</span>
                </li>
              ))}
            </ol>
            <p className="muted small">Je leest dit later terug onder Aan boord, Instellingen, Over Vaarmaat.</p>
            <div className="onb-actions">
              <button
                className="primary"
                onClick={() => {
                  onAccept(skipped);
                  if (!disclaimerOnly && !skipped && profile.rental) setStep('huur');
                  else onClose();
                }}
              >
                {DISCLAIMER_ACCEPT}
              </button>
            </div>
          </>
        )}

        {step === 'huur' && (
          <>
            <h2 id="onb-title" ref={headingRef} tabIndex={-1}>{RENTAL_TITLE}</h2>
            <p className="small">{RENTAL_TEXT}</p>
            <div className="cards">
              {RENTAL_LINKS.map((l) => (
                <button key={l.target} className="card" onClick={() => onOpen(l.target)}>
                  <span className="card-icon" aria-hidden="true">{l.icon}</span>
                  <span className="card-body"><b>{l.title}</b><small>{l.text}</small></span>
                </button>
              ))}
            </div>
            <div className="onb-actions">
              <button className="primary" onClick={onClose}>Naar de kaart</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
