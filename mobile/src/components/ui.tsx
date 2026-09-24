// Bouwstenen volgens docs/STYLEGUIDE.md hoofdstuk 5: knoppen, chips, velden, schakelaars, waarschuwingen en sheets.
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View, useWindowDimensions, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { C, RADIUS, SHADOW, T } from '../theme';

type BtnKind = 'primary' | 'secondary' | 'danger';

export function Btn({ title, onPress, kind = 'secondary', small, disabled, style, flex }: { title: string; onPress?: () => void; kind?: BtnKind; small?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle>; flex?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [s.btn, small && s.btnSmall, s[kind], flex && { flex: 1 }, disabled && { opacity: 0.5 }, pressed && { opacity: 0.75 }, style]}
    >
      <Text style={[small ? s.btnSmallText : T.label, kind === 'primary' ? { color: '#fff' } : kind === 'danger' ? { color: C.err } : { color: C.ink }]}>{title}</Text>
    </Pressable>
  );
}

export function IconBtn({ label, onPress, a11y, size = 30 }: { label: string; onPress: () => void; a11y: string; size?: number }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={a11y} onPress={onPress} hitSlop={8} style={({ pressed }) => [s.iconBtn, { width: size, height: size, borderRadius: size / 2 }, pressed && { opacity: 0.7 }]}>
      <Text style={{ fontSize: 18, color: C.ink, lineHeight: 20 }}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ title, active, onPress, dark }: { title: string; active?: boolean; onPress: () => void; dark?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, active && (dark ? s.chipDark : s.chipActive)]}>
      <Text style={[T.label, { color: active ? (dark ? '#fff' : C.blueDark) : C.ink }]}>{title}</Text>
    </Pressable>
  );
}

export function Muted({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[T.meta, { color: C.muted }, style]}>{children}</Text>;
}

export function P({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[T.body, { color: C.ink }, style]}>{children}</Text>;
}

export function H1({ children }: { children: ReactNode }) {
  return <Text style={[T.h1, { color: C.ink }]}>{children}</Text>;
}

export function H2({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[T.h2, { color: C.ink }, style]}>{children}</Text>;
}

export function Warn({ children, level = 'warn' }: { children: ReactNode; level?: 'soft' | 'warn' | 'err' }) {
  const bg = level === 'soft' ? C.canvas : level === 'warn' ? C.warnBg : C.errBg;
  const fg = level === 'soft' ? C.muted : level === 'warn' ? C.warn : C.err;
  return (
    <View style={[s.warnBox, { backgroundColor: bg }]}>
      <Text style={[T.meta, { color: fg }]}>{children}</Text>
    </View>
  );
}

export function Toggle({ label, value, onChange, disabled }: { label: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <Pressable style={s.toggle} onPress={() => !disabled && onChange(!value)} accessibilityRole="switch" accessibilityState={{ checked: value, disabled }}>
      <Text style={[T.body, { flex: 1, color: disabled ? C.muted : C.ink }]}>{label}</Text>
      <Switch value={value} onValueChange={onChange} disabled={disabled} trackColor={{ true: C.blue, false: C.line }} />
    </Pressable>
  );
}

/** Tekst naar getal; accepteert zowel komma als punt */
function parseNum(v: string): number {
  return parseFloat(v.replace(',', '.'));
}

const fmtNum = (v: number) => String(v).replace('.', ',');

export function NumField({ label, hint, value, unit, min, max, onChange, integer }: { label: string; hint?: string; value: number; unit: string; min: number; max: number; onChange: (v: number) => void; integer?: boolean }) {
  const [text, setText] = useState(fmtNum(value));
  useEffect(() => {
    if (parseNum(text) !== value) setText(fmtNum(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <View style={s.field}>
      <Text style={[T.label, { color: C.ink }]}>
        {label}
        {hint ? <Text style={[T.meta, { color: C.muted }]}> {hint}</Text> : null}
      </Text>
      <View style={s.fieldInput}>
        <TextInput
          style={s.input}
          value={text}
          keyboardType={integer ? 'number-pad' : 'decimal-pad'}
          onChangeText={(t) => {
            setText(t);
            const n = parseNum(t);
            if (!isNaN(n)) onChange(Math.min(max, Math.max(min, n)));
          }}
          onBlur={() => setText(fmtNum(value))}
          accessibilityLabel={label}
        />
        <Text style={[T.meta, { color: C.muted }]}>{unit}</Text>
      </View>
    </View>
  );
}

export function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <View style={s.field}>
      <Text style={[T.label, { color: C.ink }]}>{label}</Text>
      <View style={s.fieldInput}>
        <TextInput style={s.input} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={C.muted} accessibilityLabel={label} />
      </View>
    </View>
  );
}

export function Row({ children, style, wrap }: { children: ReactNode; style?: StyleProp<ViewStyle>; wrap?: boolean }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, wrap && { flexWrap: 'wrap' }, style]}>{children}</View>;
}

/** Definitielijst: label links, waarde rechts */
export function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={s.fact}>
      <Text style={[T.meta, { color: C.muted, width: 86 }]}>{label}</Text>
      <View style={{ flex: 1 }}>{typeof children === 'string' ? <Text style={[T.meta, { color: C.ink }]}>{children}</Text> : children}</View>
    </View>
  );
}

export function Card({ icon, iconColor, title, lines, onPress, children }: { icon: string; iconColor?: string; title: string; lines?: (string | null | undefined)[]; onPress?: () => void; children?: ReactNode }) {
  const body = (
    <>
      <Text style={[s.cardIcon, iconColor ? { color: iconColor } : null]}>{icon}</Text>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[T.label, { fontSize: 15, color: C.ink }]}>{title}</Text>
        {lines?.filter(Boolean).map((l, i) => (
          <Text key={i} style={[T.meta, { color: i === 0 ? C.ink : C.muted }]}>{l}</Text>
        ))}
        {children}
      </View>
    </>
  );
  if (!onPress) return <View style={s.card}>{body}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.card, pressed && { backgroundColor: C.canvas }]}>
      {body}
    </Pressable>
  );
}

/** Sheet onderin: maximaal 46 procent van de hoogte ingeklapt, 78 procent uitgeklapt */
export function Sheet({ children, expanded, onToggle, bottom = 0 }: { children: ReactNode; expanded?: boolean; onToggle?: () => void; bottom?: number }) {
  const { height } = useWindowDimensions();
  return (
    <View style={[s.sheet, { bottom, maxHeight: height * (expanded ? 0.78 : 0.46) }]}>
      <Pressable onPress={onToggle} hitSlop={10} style={s.grip} accessibilityLabel={expanded ? 'Inklappen' : 'Uitklappen'}>
        <View style={s.gripBar} />
      </Pressable>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 14, gap: 10 }} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </View>
  );
}

export function SheetHead({ title, sub, onClose }: { title: ReactNode; sub?: ReactNode; onClose?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
      <View style={{ flex: 1, gap: 2 }}>
        {typeof title === 'string' ? <H1>{title}</H1> : title}
        {sub ? typeof sub === 'string' ? <Muted>{sub}</Muted> : sub : null}
      </View>
      {onClose && <IconBtn label="×" a11y="Sluiten" onPress={onClose} />}
    </View>
  );
}

const s = StyleSheet.create({
  btn: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', minHeight: 44, borderWidth: 1, borderColor: 'transparent' },
  btnSmall: { paddingVertical: 5, paddingHorizontal: 10, minHeight: 32, borderRadius: 10 },
  btnSmallText: { fontSize: 12, fontWeight: '600' },
  primary: { backgroundColor: C.blue },
  secondary: { backgroundColor: C.canvas, borderColor: C.line },
  danger: { backgroundColor: C.errBg },
  iconBtn: { backgroundColor: C.canvas, alignItems: 'center', justifyContent: 'center' },
  chip: { borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12, backgroundColor: C.canvas, borderWidth: 1, borderColor: C.line },
  chipActive: { backgroundColor: C.blueSoft, borderColor: C.blue },
  chipDark: { backgroundColor: C.ink, borderColor: C.ink },
  warnBox: { borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  field: { gap: 4, flex: 1, minWidth: 140 },
  fieldInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.canvas, borderColor: C.line, borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, minHeight: 44 },
  input: { flex: 1, width: 0, minWidth: 0, fontSize: 15, color: C.ink, paddingVertical: 8 },
  fact: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  card: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, alignItems: 'flex-start' },
  cardIcon: { fontSize: 22, width: 30, textAlign: 'center' },
  sheet: { position: 'absolute', left: 0, right: 0, backgroundColor: C.surface, borderTopLeftRadius: RADIUS, borderTopRightRadius: RADIUS, ...SHADOW },
  grip: { alignItems: 'center', paddingVertical: 8 },
  gripBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#cfd6e2' },
});
