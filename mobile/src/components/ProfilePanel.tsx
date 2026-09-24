import { View } from 'react-native';
import type { BoatProfile } from '@shared/types';
import { BOAT_TYPES, applyBoatType } from '@shared/profile';
import { Btn, Chip, Muted, NumField, Row, Sheet, SheetHead, TextField, Toggle } from './ui';

export default function ProfilePanel({ profile, onChange, onClose, bottom }: { profile: BoatProfile; onChange: (p: BoatProfile) => void; onClose: () => void; bottom: number }) {
  const set = (patch: Partial<BoatProfile>) => onChange({ ...profile, ...patch });
  return (
    <Sheet expanded bottom={bottom}>
      <SheetHead title="Mijn boot" onClose={onClose} />
      <Row wrap>
        {BOAT_TYPES.map((t) => (
          <Chip key={t.id} active={profile.type === t.id} title={`${t.icon} ${t.label}`} onPress={() => onChange(applyBoatType(profile, t.id))} />
        ))}
      </Row>
      <TextField label="Naam" value={profile.name} onChange={(v) => set({ name: v })} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
        <NumField label="Hoogte boven water" hint="(hoogste punt)" value={profile.height} min={0} max={30} unit="m" onChange={(v) => set({ height: v })} />
        <NumField label="Diepgang" value={profile.draft} min={0} max={5} unit="m" onChange={(v) => set({ draft: v })} />
        <NumField label="Breedte" value={profile.width} min={0} max={20} unit="m" onChange={(v) => set({ width: v })} />
        <NumField label="Kruissnelheid" value={profile.speed} min={1} max={60} unit="km/u" onChange={(v) => set({ speed: v })} />
        <NumField label="Marge onder bruggen" value={profile.margin} min={0} max={1} unit="m" onChange={(v) => set({ margin: v })} />
      </View>
      <Toggle label="Beweegbare bruggen laten openen als de boot er niet onderdoor past" value={profile.allowMovable} onChange={(v) => set({ allowMovable: v })} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
        {profile.allowMovable && <NumField integer label="Wachttijd per brugopening" value={profile.bridgeWait} min={0} max={60} unit="min" onChange={(v) => set({ bridgeWait: v })} />}
        <NumField integer label="Tijd per sluis" value={profile.lockWait} min={0} max={90} unit="min" onChange={(v) => set({ lockWait: v })} />
      </View>
      <Toggle label="Vermijd bruggen waarvan de doorvaarthoogte onbekend is" value={profile.avoidUnknownBridges} onChange={(v) => set({ avoidUnknownBridges: v })} />
      <Muted>De route wordt berekend op basis van hoogte + marge. Doorvaarthoogtes komen uit OpenStreetMap en kunnen afwijken van de werkelijkheid (waterstand). Controleer altijd ter plaatse.</Muted>
      <Btn kind="primary" title="Opslaan" onPress={onClose} />
    </Sheet>
  );
}
