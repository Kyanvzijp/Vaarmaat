// Korte melding onderin (STYLEGUIDE 10): succes, info of fout, met optioneel een actie zoals Ongedaan maken.
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { noticeDuration, type Notice } from '@shared/notice';
import { C, SHADOW, T } from '../theme';

export default function Toast({ notice, onClose, bottom }: { notice: Notice | null; onClose: () => void; bottom: number }) {
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(onClose, noticeDuration(notice));
    return () => clearTimeout(t);
  }, [notice, onClose]);
  if (!notice) return null;
  const colors = notice.kind === 'succes' ? { bg: C.okBg, fg: C.ok } : notice.kind === 'fout' ? { bg: C.errBg, fg: C.err } : { bg: C.ink, fg: C.surface };
  return (
    <View style={[st.toast, { bottom, backgroundColor: colors.bg }]} accessibilityRole={notice.kind === 'fout' ? 'alert' : 'text'} accessibilityLiveRegion={notice.kind === 'fout' ? 'assertive' : 'polite'}>
      <Text style={[T.body, { flex: 1, color: colors.fg }]}>{notice.text}</Text>
      {notice.action && (
        <Pressable
          accessibilityRole="button"
          style={st.btn}
          onPress={() => {
            notice.action!.run();
            onClose();
          }}
        >
          <Text style={[T.label, { color: colors.fg, textDecorationLine: 'underline' }]}>{notice.action.label}</Text>
        </Pressable>
      )}
      <Pressable accessibilityRole="button" accessibilityLabel="Melding sluiten" style={st.btn} onPress={onClose}>
        <Text style={{ fontSize: 20, color: colors.fg }}>×</Text>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  // boven noodscherm en onboarding; op Android bepaalt elevation de volgorde
  toast: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 14, paddingVertical: 4, borderRadius: 12, ...SHADOW, zIndex: 950, elevation: 24 },
  btn: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
});
