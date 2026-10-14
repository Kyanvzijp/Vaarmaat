import { useEffect } from 'react';
import { noticeDuration, type Notice } from '../notice';

export type { Notice, NoticeKind } from '../notice';

/** Korte melding onderin (styleguide 10): succes en info verdwijnen na 4 seconden, met een actie of bij een fout na 8. */
export default function Toast({ notice, onClose }: { notice: Notice | null; onClose: () => void }) {
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(onClose, noticeDuration(notice));
    return () => clearTimeout(t);
  }, [notice, onClose]);
  if (!notice) return null;
  return (
    <div key={notice.id} className={`toast ${notice.kind}`} role={notice.kind === 'fout' ? 'alert' : 'status'} aria-live={notice.kind === 'fout' ? 'assertive' : 'polite'}>
      <span>{notice.text}</span>
      {notice.action && (
        <button
          className="toast-action"
          onClick={() => {
            notice.action!.run();
            onClose();
          }}
        >
          {notice.action.label}
        </button>
      )}
      <button className="toast-close" onClick={onClose} aria-label="Melding sluiten">×</button>
    </div>
  );
}
