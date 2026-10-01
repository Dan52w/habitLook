import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { light, useTheme } from '../theme/ThemeProvider';

type Props = { visible: boolean; title: string; onClose: () => void; children: React.ReactNode };

export function AppModal({ visible, title, onClose, children }: Props) {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, theme.isLight && lightStyles.sheet]}>
          <View style={styles.header}>
            <Text style={[styles.title, theme.isLight && lightStyles.title]}>{title}</Text>
            <Pressable accessibilityRole="button" onPress={onClose} hitSlop={12}><Text style={styles.close}>×</Text></Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(4, 5, 10, .7)' },
  sheet: { maxHeight: '88%', backgroundColor: '#151823', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 18 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingBottom: 14, borderBottomWidth: 1, borderColor: '#282C3C' },
  title: { color: '#F8F7FB', fontSize: 19, fontWeight: '700' },
  close: { color: '#B8A2DE', fontSize: 32, lineHeight: 32 },
  content: { padding: 20, paddingBottom: 44, gap: 14 },
});
const lightStyles = StyleSheet.create({ sheet: { backgroundColor: light.surface }, title: { color: light.text } });
