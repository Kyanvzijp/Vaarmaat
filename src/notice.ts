// Korte meldingen (styleguide 10), gedeeld door web en app.

export type NoticeKind = 'info' | 'succes' | 'fout';

export interface Notice {
  id: number;
  text: string;
  kind: NoticeKind;
  /** bijvoorbeeld "Ongedaan maken" */
  action?: { label: string; run: () => void };
}

export type Notify = (text: string, kind?: NoticeKind, action?: Notice['action']) => void;

/** Succes en info verdwijnen na 4 seconden; met een actie of bij een fout blijft de melding 8 seconden staan */
export const noticeDuration = (n: Notice) => (n.action || n.kind === 'fout' ? 8000 : 4000);
