import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { light, useTheme } from '../../shared/theme/ThemeProvider';
import { SectionHeader } from '../../shared/components/SectionHeader';
import { setSetting } from '../../db/repositories/settings';
import {
  createCategory,
  listCategories,
} from '../../db/repositories/categories';
import { createGoal } from '../../db/repositories/goals';
import {
  getReminderPermissionStatus,
  requestReminderPermission,
} from '../../services/notifications';
import {
  CUSTOM_CATEGORY,
  GOAL_PRESETS,
  ONBOARDING_DONE_KEY,
  type GoalPreset,
} from './presets';

type Props = {
  onDone: () => void;
};

const TOTAL_STEPS = 4;

async function ensureCategoryFor(
  name: string,
  color: string,
  emoji: string,
): Promise<string> {
  const existing = await listCategories();
  const match = existing.find(c => c.name.toLowerCase() === name.toLowerCase());
  if (match) return match.id;
  if (existing.length > 0) return existing[0].id;
  const created = await createCategory(name, color, emoji);
  return created.id;
}

export function OnboardingScreen({ onDone }: Props) {
  const theme = useTheme();
  const [step, setStep] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [notifGranted, setNotifGranted] = useState<boolean | null>(null);
  const [creating, setCreating] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [createdGoalTitle, setCreatedGoalTitle] = useState<string | null>(null);

  useEffect(() => {
    getReminderPermissionStatus()
      .then(status => setNotifGranted(status.notifications))
      .catch(() => setNotifGranted(false));
  }, []);

  const finish = async () => {
    if (finishing) return;
    setFinishing(true);
    try {
      await setSetting(ONBOARDING_DONE_KEY, '1');
    } catch {}
    onDone();
  };

  const createFirstGoal = async (preset: GoalPreset) => {
    if (creating) return;
    setCreating(true);
    try {
      const categoryId = await ensureCategoryFor(
        preset.categoryName,
        preset.categoryColor,
        preset.emoji,
      );
      await createGoal({
        categoryId,
        title: preset.goalTitle,
        targetType: preset.targetType,
        targetValue: preset.targetValue,
        period: 'daily',
      });
      setCreatedGoalTitle(preset.goalTitle);
    } catch {}
    setCreating(false);
    setStep(3);
  };

  const createCustomGoal = async () => {
    const title = customTitle.trim();
    if (!title || creating) return;
    setCreating(true);
    try {
      const categoryId = await ensureCategoryFor(
        CUSTOM_CATEGORY.name,
        CUSTOM_CATEGORY.color,
        CUSTOM_CATEGORY.emoji,
      );
      await createGoal({
        categoryId,
        title,
        targetType: 'boolean',
        targetValue: 1,
        period: 'daily',
      });
      setCreatedGoalTitle(title);
    } catch {}
    setCreating(false);
    setStep(3);
  };

  const askPermission = async () => {
    try {
      await requestReminderPermission();
    } catch {}
    setStep(2);
  };

  const renderDots = () => (
    <View style={styles.dots} accessibilityRole="progressbar">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            theme.isLight && lightStyles.dot,
            i === step && styles.dotActive,
            i === step && theme.isLight && lightStyles.dotActive,
            i < step && styles.dotDone,
          ]}
        />
      ))}
    </View>
  );

  const renderPrimaryButton = (
    label: string,
    onPress: () => void,
    disabled = false,
  ) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.primaryButton,
        theme.isLight && lightStyles.primaryButton,
        disabled && styles.primaryButtonDisabled,
      ]}
    >
      <Text
        style={[
          styles.primaryButtonText,
          theme.isLight && lightStyles.primaryButtonText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );

  const renderSecondaryButton = (label: string, onPress: () => void) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.secondaryButton}
    >
      <Text
        style={[styles.secondaryButtonText, theme.isLight && lightStyles.muted]}
      >
        {label}
      </Text>
    </Pressable>
  );

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <>
            <SectionHeader eyebrow="Bienvenido" title="HabitLook" />
            <Text style={[styles.icon, styles.iconSpaced]}>🌱</Text>
            <Text style={[styles.body, theme.isLight && lightStyles.body]}>
              Tus hábitos, tu dinero y tus ideas, en un solo lugar.
            </Text>
            <Text style={[styles.body, theme.isLight && lightStyles.body]}>
              Sin cuentas y sin nube: todo vive cifrado en tu teléfono.
            </Text>
            <View style={styles.actions}>
              {renderPrimaryButton('Comenzar', () => setStep(1))}
            </View>
          </>
        );
      case 1:
        return (
          <>
            <SectionHeader eyebrow="Notificaciones" title="¿Te avisamos?" />
            <Text style={[styles.icon, styles.iconSpaced]}>🔔</Text>
            <Text style={[styles.body, theme.isLight && lightStyles.body]}>
              Te recordamos tus hábitos y metas en el momento que elijas.
            </Text>
            <Text
              style={[
                styles.bodySmall,
                theme.isLight && lightStyles.muted,
              ]}
            >
              Puedes cambiarlo cuando quieras desde Perfil.
            </Text>
            <View style={styles.actions}>
              {notifGranted === null ? (
                <ActivityIndicator
                  color={theme.isLight ? light.accent : '#FAFAFA'}
                />
              ) : notifGranted ? (
                <>
                  <Text
                    style={[
                      styles.granted,
                      theme.isLight && lightStyles.granted,
                    ]}
                  >
                    ✓ Notificaciones activadas
                  </Text>
                  {renderPrimaryButton('Continuar', () => setStep(2))}
                </>
              ) : (
                <>
                  {renderPrimaryButton('Activar', askPermission)}
                  {renderSecondaryButton('Ahora no', () => setStep(2))}
                </>
              )}
            </View>
          </>
        );
      case 2:
        return (
          <>
            <SectionHeader eyebrow="Tu primera meta" title="Empieza con una" />
            <Text
              style={[
                styles.bodySmall,
                styles.bodySmallSpaced,
                theme.isLight && lightStyles.muted,
              ]}
            >
              Elige una para que tu inicio nunca esté vacío. Podrás crear más
              cuando quieras.
            </Text>
            <View style={styles.chips}>
              {GOAL_PRESETS.map(preset => (
                <Pressable
                  key={preset.label}
                  onPress={() => createFirstGoal(preset)}
                  disabled={creating}
                  accessibilityRole="button"
                  accessibilityLabel={`Crear meta: ${preset.goalTitle}`}
                  style={[
                    styles.chip,
                    theme.isLight && lightStyles.chip,
                  ]}
                >
                  <Text style={styles.chipEmoji}>{preset.emoji}</Text>
                  <Text
                    style={[
                      styles.chipLabel,
                      theme.isLight && lightStyles.text,
                    ]}
                  >
                    {preset.label}
                  </Text>
                </Pressable>
              ))}
              <Pressable
                onPress={() => setShowCustomInput(v => !v)}
                disabled={creating}
                accessibilityRole="button"
                accessibilityLabel="Crear mi propia meta"
                style={[styles.chip, theme.isLight && lightStyles.chip]}
              >
                <Text style={styles.chipEmoji}>✍️</Text>
                <Text
                  style={[styles.chipLabel, theme.isLight && lightStyles.text]}
                >
                  Crear la mía
                </Text>
              </Pressable>
            </View>
            {showCustomInput ? (
              <View style={styles.customRow}>
                <TextInput
                  value={customTitle}
                  onChangeText={setCustomTitle}
                  placeholder="Ej. Tomar agua al despertar"
                  placeholderTextColor={
                    theme.isLight ? light.muted : '#8E94A5'
                  }
                  accessibilityLabel="Nombre de tu meta"
                  style={[
                    styles.input,
                    theme.isLight && lightStyles.input,
                  ]}
                />
                {renderPrimaryButton('Crear meta', createCustomGoal, !customTitle.trim() || creating)}
              </View>
            ) : null}
            {creating ? (
              <ActivityIndicator
                color={theme.isLight ? light.accent : '#FAFAFA'}
                style={styles.loaderSpaced}
              />
            ) : null}
          </>
        );
      default:
        return (
          <>
            <SectionHeader eyebrow="Listo" title="Así se usa" />
            {createdGoalTitle ? (
              <Text
                style={[
                  styles.createdGoal,
                  theme.isLight && lightStyles.createdGoal,
                ]}
              >
                🎯 Tu primera meta está lista: {createdGoalTitle}
              </Text>
            ) : null}
            <View style={styles.bullets}>
              <Text style={[styles.bullet, theme.isLight && lightStyles.body]}>
                📅 Registra tu día en Inicio
              </Text>
              <Text style={[styles.bullet, theme.isLight && lightStyles.body]}>
                💰 Organiza tu dinero en Contabilidad
              </Text>
              <Text style={[styles.bullet, theme.isLight && lightStyles.body]}>
                ✨ El asistente IA ya está en su pestaña
              </Text>
            </View>
            <View style={styles.actions}>
              {renderPrimaryButton(
                'Entrar a la app',
                finish,
                finishing,
              )}
            </View>
          </>
        );
    }
  };

  return (
    <SafeAreaView
      style={[styles.safe, theme.isLight && lightStyles.safe]}
      edges={['top', 'bottom', 'left', 'right']}
    >
      <View style={styles.topRow}>
        <View style={styles.dotsWrap}>{renderDots()}</View>
        <Pressable
          onPress={finish}
          accessibilityRole="button"
          accessibilityLabel="Omitir introducción"
          style={styles.skip}
        >
          <Text
            style={[styles.skipText, theme.isLight && lightStyles.muted]}
          >
            Omitir
          </Text>
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {renderStep()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0E0E0F',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#282828',
  },
  dotActive: {
    backgroundColor: '#FAFAFA',
    width: 24,
  },
  dotDone: {
    backgroundColor: '#555555',
  },
  skip: {
    paddingVertical: 8,
    paddingLeft: 16,
  },
  skipText: {
    color: '#A3A3A3',
    fontSize: 14,
    fontWeight: '600',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  icon: {
    fontSize: 56,
    textAlign: 'center',
  },
  iconSpaced: {
    marginTop: 24,
  },
  dotsWrap: {
    flex: 1,
  },
  loaderSpaced: {
    marginTop: 12,
  },
  body: {
    color: '#FAFAFA',
    fontSize: 17,
    lineHeight: 26,
    textAlign: 'center',
    marginTop: 12,
  },
  bodySmall: {
    color: '#C7C7CC',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
  },
  bodySmallSpaced: {
    marginTop: 12,
  },
  granted: {
    color: '#64D9A0',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  actions: {
    marginTop: 28,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#0E0E0F',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#A3A3A3',
    fontSize: 15,
    fontWeight: '600',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 20,
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  chipEmoji: {
    fontSize: 18,
  },
  chipLabel: {
    color: '#FAFAFA',
    fontSize: 15,
    fontWeight: '600',
  },
  customRow: {
    marginTop: 16,
    gap: 12,
  },
  input: {
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    color: '#FAFAFA',
    fontSize: 16,
  },
  createdGoal: {
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 14,
    padding: 16,
    color: '#FAFAFA',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 20,
  },
  bullets: {
    marginTop: 20,
    gap: 14,
  },
  bullet: {
    color: '#FAFAFA',
    fontSize: 16,
    lineHeight: 24,
  },
});

const lightStyles = StyleSheet.create({
  safe: {
    backgroundColor: light.background,
  },
  dot: {
    backgroundColor: light.border,
  },
  dotActive: {
    backgroundColor: light.text,
  },
  muted: {
    color: light.muted,
  },
  text: {
    color: light.text,
  },
  body: {
    color: light.text,
  },
  granted: {
    color: '#1E7A4C',
  },
  primaryButton: {
    backgroundColor: light.accent,
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  chip: {
    backgroundColor: light.surface,
    borderColor: light.border,
  },
  input: {
    backgroundColor: light.surface,
    borderColor: light.border,
    color: light.text,
  },
  createdGoal: {
    backgroundColor: light.surface,
    borderColor: light.border,
    color: light.text,
  },
});
