/** Gesproken instructies via de spraaksynthese van de browser (nl-NL) */
let enabled = true;
let lastText = '';
let lastTime = 0;

export function setVoiceEnabled(v: boolean) {
  enabled = v;
  if (!v && 'speechSynthesis' in window) window.speechSynthesis.cancel();
}

export function voiceAvailable(): boolean {
  return 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}

export function speak(text: string, force = false) {
  if (!enabled || !voiceAvailable()) return;
  if (!force && text === lastText && Date.now() - lastTime < 20000) return;
  lastText = text;
  lastTime = Date.now();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'nl-NL';
  u.rate = 1.0;
  const voices = window.speechSynthesis.getVoices();
  const nl = voices.find((v) => v.lang.toLowerCase().startsWith('nl'));
  if (nl) u.voice = nl;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

/** Zet afstand om in spreektaal */
export function spokenDistance(m: number): string {
  if (m < 60) return 'nu';
  if (m < 1000) return `over ${Math.round(m / 50) * 50} meter`;
  const km = m / 1000;
  return `over ${km < 10 ? km.toFixed(1).replace('.', ',') : Math.round(km)} kilometer`;
}
