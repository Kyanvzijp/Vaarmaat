import { useState } from 'react';

/** Dialoog om een tocht een naam te geven, in de stijl van de app (vervangt window.prompt) */
export default function TripNameDialog({ initial, onCancel, onSave }: { initial: string; onCancel: () => void; onSave: (name: string) => void }) {
  const [name, setName] = useState(initial);
  const valid = name.trim().length > 0;
  return (
    <div className="dialog-bg" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <form
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="trip-name-title"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSave(name.trim());
        }}
        onKeyDown={(e) => e.key === 'Escape' && onCancel()}
      >
        <h2 id="trip-name-title">Tocht bewaren</h2>
        <label className="field">
          <span>Naam van de tocht</span>
          <span className="field-input">
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onFocus={(e) => e.target.select()} maxLength={80} />
          </span>
        </label>
        <div className="actions">
          <button type="button" onClick={onCancel}>Annuleren</button>
          <button type="submit" className="primary" disabled={!valid}>Bewaren</button>
        </div>
      </form>
    </div>
  );
}
