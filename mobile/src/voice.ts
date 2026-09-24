// Gesproken instructies via de spraaksynthese van het toestel (nl-NL). Zelfde API als ../../src/voice.ts.
import * as Speech from 'expo-speech';

let enabled = true;
let lastText = '';
let lastTime = 0;

export function setVoiceEnabled(v: boolean) {
  enabled = v;
  if (!v) Speech.stop();
}

export function voiceAvailable(): boolean {
  return true;
}

export function speak(text: string, force = false) {
  if (!enabled) return;
  if (!force && text === lastText && Date.now() - lastTime < 20000) return;
  lastText = text;
  lastTime = Date.now();
  Speech.stop();
  Speech.speak(text, { language: 'nl-NL', rate: 1.0 });
}

// De tekstomzetting is platformonafhankelijk en komt uit de webversie.
export { spokenDistance } from '@shared/voice';
