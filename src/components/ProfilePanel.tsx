import type { BoatProfile } from '../types';
import { BOAT_TYPES, applyBoatType } from '../profile';

interface Props {
  profile: BoatProfile;
  onChange: (p: BoatProfile) => void;
  onClose: () => void;
}

function NumField({ label, value, step, min, max, unit, onChange, hint }: { label: string; value: number; step: number; min: number; max: number; unit: string; onChange: (v: number) => void; hint?: string }) {
  return (
    <label className="field">
      <span>{label}{hint && <small> {hint}</small>}</span>
      <span className="field-input">
        <input type="number" inputMode="decimal" step={step} min={min} max={max} value={value} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} />
        <em>{unit}</em>
      </span>
    </label>
  );
}

export default function ProfilePanel({ profile, onChange, onClose }: Props) {
  const set = (patch: Partial<BoatProfile>) => onChange({ ...profile, ...patch });
  return (
    <div className="sheet profile">
      <div className="sheet-head">
        <h2>Mijn boot</h2>
        <button className="icon-btn" onClick={onClose} aria-label="Sluiten">×</button>
      </div>
      <div className="boat-types">
        {BOAT_TYPES.map((t) => (
          <button key={t.id} className={`chip ${profile.type === t.id ? 'active' : ''}`} onClick={() => onChange(applyBoatType(profile, t.id))}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>
      <label className="field">
        <span>Naam</span>
        <span className="field-input"><input value={profile.name} onChange={(e) => set({ name: e.target.value })} /></span>
      </label>
      <div className="grid2">
        <NumField label="Hoogte boven water" hint="(hoogste punt)" value={profile.height} step={0.05} min={0} max={30} unit="m" onChange={(v) => set({ height: v })} />
        <NumField label="Diepgang" value={profile.draft} step={0.05} min={0} max={5} unit="m" onChange={(v) => set({ draft: v })} />
        <NumField label="Breedte" value={profile.width} step={0.1} min={0} max={20} unit="m" onChange={(v) => set({ width: v })} />
        <NumField label="Kruissnelheid" value={profile.speed} step={0.5} min={1} max={60} unit="km/u" onChange={(v) => set({ speed: v })} />
        <NumField label="Marge onder bruggen" value={profile.margin} step={0.05} min={0} max={1} unit="m" onChange={(v) => set({ margin: v })} />
      </div>
      <label className="toggle">
        <input type="checkbox" checked={profile.allowMovable} onChange={(e) => set({ allowMovable: e.target.checked })} />
        <span>Beweegbare bruggen laten openen als de boot er niet onderdoor past</span>
      </label>
      {profile.allowMovable && (
        <div className="grid2">
          <NumField label="Wachttijd per brugopening" value={profile.bridgeWait} step={1} min={0} max={60} unit="min" onChange={(v) => set({ bridgeWait: v })} />
          <NumField label="Tijd per sluis" value={profile.lockWait} step={1} min={0} max={90} unit="min" onChange={(v) => set({ lockWait: v })} />
        </div>
      )}
      {!profile.allowMovable && (
        <div className="grid2">
          <NumField label="Tijd per sluis" value={profile.lockWait} step={1} min={0} max={90} unit="min" onChange={(v) => set({ lockWait: v })} />
        </div>
      )}
      <label className="toggle">
        <input type="checkbox" checked={profile.avoidUnknownBridges} onChange={(e) => set({ avoidUnknownBridges: e.target.checked })} />
        <span>Vermijd bruggen waarvan de doorvaarthoogte onbekend is</span>
      </label>
      <p className="muted small">De route wordt berekend op basis van hoogte + marge. Doorvaarthoogtes komen uit OpenStreetMap en kunnen afwijken van de werkelijkheid (waterstand). Controleer altijd ter plaatse.</p>
      <button className="primary" onClick={onClose}>Opslaan</button>
    </div>
  );
}
