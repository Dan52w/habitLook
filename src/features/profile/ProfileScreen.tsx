import React, { useCallback, useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSetting, setSetting } from '../../db/repositories/settings';
import {
  ensureNotificationPermission,
  getReminderPermissionStatus,
  openBatterySettings,
  openExactAlarmSettings,
  openNotificationPermissionSettings,
  rescheduleActivityReminders,
  scheduleReminderTest,
} from '../../services/notifications';
import { exportBackup, importBackupFromPicker } from '../../services/backup';
import { light, useTheme } from '../../shared/theme/ThemeProvider';
import { useAppDialog } from '../../shared/context/DialogContext';
import { HabitLookLogo } from '../../shared/components/HabitLookLogo';
import { SectionHeader } from '../../shared/components/SectionHeader';

const SoonBadge = ({ isLight }: { isLight: boolean }) => (
  <View style={[styles.soon, isLight && lightStyles.soon]}>
    <Text style={[styles.soonText, isLight && lightStyles.soonText]}>
      PRÓXIMAMENTE
    </Text>
  </View>
);

const REMINDER_OPTIONS: [string, string][] = [
  ['0', 'No avisar'],
  ['5', '5 min'],
  ['10', '10 min'],
  ['15', '15 min'],
  ['30', '30 min'],
  ['60', '1 hora'],
];

export function ProfileScreen() {
  const theme = useTheme();
  const { showAlert, showDialog } = useAppDialog();
  const [reminder, setReminder] = useState('15');
  const [notificationStatus, setNotificationStatus] = useState({
    notifications: false,
    exactAlarms: false,
  });

  const refreshNotificationStatus = useCallback(() => {
    getReminderPermissionStatus()
      .then(setNotificationStatus)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    getSetting('reminder_minutes').then(value => setReminder(value ?? '15'));
    refreshNotificationStatus();
  }, [refreshNotificationStatus]);

  const saveReminder = async (minutes: string) => {
    if (minutes !== '0') {
      const allowed = await ensureNotificationPermission();
      if (!allowed) {
        showDialog({
          title: 'Permiso necesario',
          message:
            'Activa las notificaciones para recibir recordatorios de tus actividades.',
          type: 'warning',
          buttons: [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Abrir ajustes',
              style: 'default',
              onPress: openNotificationPermissionSettings,
            },
          ],
        });
        return;
      }
      const status = await getReminderPermissionStatus();
      // Las alarmas exactas solo existen en Android; en iOS este permiso no aplica.
      if (Platform.OS === 'android' && !status.exactAlarms) {
        showDialog({
          title: 'Alarmas exactas',
          message:
            'Para que los recordatorios suenen con total precisión en Android, permite las alarmas exactas.',
          type: 'warning',
          buttons: [
            { text: 'Continuar', style: 'cancel' },
            {
              text: 'Abrir ajustes',
              style: 'default',
              onPress: openExactAlarmSettings,
            },
          ],
        });
      }
    }
    await setSetting('reminder_minutes', minutes);
    await rescheduleActivityReminders();
    setReminder(minutes);
    refreshNotificationStatus();
    showAlert({
      title: 'Recordatorios actualizados',
      message:
        minutes === '0'
          ? 'Se cancelaron los recordatorios programados.'
          : `Te avisaremos ${
              minutes === '60' ? '1 hora' : `${minutes} minutos`
            } antes de tus próximas actividades.`,
      type: 'success',
    });
  };

  const testReminder = async () => {
    const allowed = await ensureNotificationPermission();
    if (!allowed) {
      showDialog({
        title: 'Permiso necesario',
        message: 'Permite las notificaciones para ejecutar la prueba.',
        type: 'warning',
        buttons: [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Abrir ajustes',
            style: 'default',
            onPress: openNotificationPermissionSettings,
          },
        ],
      });
      return;
    }
    try {
      await scheduleReminderTest();
      showAlert({
        title: 'Prueba programada',
        message:
          'Deberías recibir una notificación en 10 segundos, incluso con la app cerrada.',
        type: 'success',
      });
    } catch {
      showAlert({
        title: 'No se pudo programar',
        message: 'Revisa los permisos de notificaciones y alarmas exactas.',
        type: 'error',
      });
    }
  };

  const openAiAssistant = () => {
    showAlert({
      title: 'Próximamente',
      message:
        'El asistente de IA de HabitLook está en camino: te ayudará a mejorar tus hábitos con sugerencias personalizadas, siempre con tu consentimiento explícito y sin enviar tus datos.',
      type: 'info',
      buttonText: 'Entendido',
    });
  };

  const exportData = async () => {    try {
      await exportBackup();
    } catch (error) {
      showAlert({
        title: 'No se pudo exportar',
        message: error instanceof Error ? error.message : 'Inténtalo de nuevo.',
        type: 'error',
      });
    }
  };

  const importData = () => {
    showDialog({
      title: 'Importar respaldo',
      message:
        'Fusionar conserva los datos actuales; reemplazar los elimina y los sustituye por el respaldo.',
      type: 'warning',
      buttons: [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Fusionar',
          style: 'default',
          onPress: async () => {
            try {
              await importBackupFromPicker('merge');
              showAlert({
                title: 'Respaldo importado',
                message: 'Tus datos se fusionaron correctamente.',
                type: 'success',
              });
            } catch (error) {
              if (error instanceof Error && /cancel/i.test(error.message))
                return;
              showAlert({
                title: 'No se pudo importar',
                message:
                  error instanceof Error
                    ? error.message
                    : 'El archivo no es válido.',
                type: 'error',
              });
            }
          },
        },
        {
          text: 'Reemplazar',
          style: 'destructive',
          onPress: async () => {
            try {
              await importBackupFromPicker('replace');
              showAlert({
                title: 'Respaldo restaurado',
                message: 'Tus datos fueron reemplazados por el respaldo.',
                type: 'success',
              });
            } catch (error) {
              if (error instanceof Error && /cancel/i.test(error.message))
                return;
              showAlert({
                title: 'No se pudo importar',
                message:
                  error instanceof Error
                    ? error.message
                    : 'El archivo no es válido.',
                type: 'error',
              });
            }
          },
        },
      ],
    });
  };

  return (
    <SafeAreaView
      style={[styles.container, theme.isLight && lightStyles.container]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader eyebrow="PERFIL" title="Tu espacio, tus reglas" />

        <View style={[styles.hero, theme.isLight && lightStyles.hero]}>
          <HabitLookLogo size={48} />
          <View style={styles.heroInfo}>
            <Text
              style={[styles.heroTitle, theme.isLight && lightStyles.heroTitle]}
            >
              HabitLook
            </Text>
            <Text
              style={[styles.heroText, theme.isLight && lightStyles.heroText]}
            >
              Tu bóveda personal · Sin cuenta · 100% privado
            </Text>
          </View>
        </View>

        <View style={[styles.aiCard, theme.isLight && lightStyles.aiCard]}>
          <View style={styles.titleLine}>
            <View style={styles.aiTitleRow}>
              <Text style={styles.aiIcon}>✨</Text>
              <Text
                style={[styles.aiTitle, theme.isLight && lightStyles.aiTitle]}
              >
                Asistente IA
              </Text>
            </View>
            <SoonBadge isLight={theme.isLight} />
          </View>
          <Text
            style={[styles.aiText, theme.isLight && lightStyles.aiText]}
          >
            Sugerencias inteligentes sobre tus hábitos, rutinas y gastos.
            Siempre local primero y con tu permiso explícito.
          </Text>
          <Pressable
            onPress={openAiAssistant}
            style={[styles.aiButton, theme.isLight && lightStyles.aiButton]}
          >
            <Text
              style={[
                styles.aiButtonText,
                theme.isLight && lightStyles.aiButtonText,
              ]}
            >
              Probar el asistente
            </Text>
          </Pressable>
        </View>

        <Text style={[styles.section, theme.isLight && lightStyles.section]}>
          Privacidad
        </Text>

        <View style={[styles.card, theme.isLight && lightStyles.card]}>
          <Text
            style={[styles.cardTitle, theme.isLight && lightStyles.cardTitle]}
          >
            Bóveda local cifrada
          </Text>
          <Text
            style={[styles.cardText, theme.isLight && lightStyles.cardText]}
          >
            Tus categorías, metas, notas y gastos se guardan cifrados en este
            dispositivo.
          </Text>
          <View style={styles.status}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Activa</Text>
          </View>
        </View>

        <View style={[styles.card, theme.isLight && lightStyles.card]}>
          <View style={styles.titleLine}>
            <Text
              style={[styles.cardTitle, theme.isLight && lightStyles.cardTitle]}
            >
              Respaldo en la nube
            </Text>
            <SoonBadge isLight={theme.isLight} />
          </View>
          <Text
            style={[styles.cardText, theme.isLight && lightStyles.cardText]}
          >
            No se envía ningún dato fuera del teléfono. La copia cifrada estará
            disponible más adelante.
          </Text>
        </View>

        <Text style={[styles.section, theme.isLight && lightStyles.section]}>
          Ajustes
        </Text>

        <View style={[styles.card, theme.isLight && lightStyles.card]}>
          <View style={styles.titleLine}>
            <View>
              <Text
                style={[
                  styles.cardTitle,
                  theme.isLight && lightStyles.cardTitle,
                ]}
              >
                Apariencia
              </Text>
              <Text
                style={[styles.cardText, theme.isLight && lightStyles.cardText]}
              >
                {theme.isLight
                  ? 'Modo claro (marfil suave)'
                  : 'Modo oscuro (obsidiana)'}
              </Text>
            </View>
            <Switch
              value={theme.isLight}
              onValueChange={value => theme.setMode(value ? 'light' : 'dark')}
              trackColor={{ false: '#3A3F50', true: '#B89BE3' }}
              thumbColor={theme.isLight ? '#FFFDF8' : '#BAC0CE'}
            />
          </View>
        </View>

        <View style={[styles.card, theme.isLight && lightStyles.card]}>
          <Text
            style={[styles.cardTitle, theme.isLight && lightStyles.cardTitle]}
          >
            Recordatorios de actividades
          </Text>
          <Text
            style={[styles.cardText, theme.isLight && lightStyles.cardText]}
          >
            Te avisaremos antes de cada actividad nueva que programes.
          </Text>
          <View style={styles.reminderChoices}>
            {REMINDER_OPTIONS.map(([value, label]) => (
              <Pressable
                key={value}
                onPress={() => saveReminder(value)}
                style={[
                  styles.reminder,
                  theme.isLight && lightStyles.reminder,
                  reminder === value && styles.reminderActive,
                  theme.isLight &&
                    reminder === value &&
                    lightStyles.reminderActive,
                ]}
              >
                <Text
                  style={[
                    styles.reminderText,
                    theme.isLight && lightStyles.reminderText,
                    reminder === value && styles.reminderTextActive,
                    theme.isLight &&
                      reminder === value &&
                      lightStyles.reminderTextActive,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={[styles.card, theme.isLight && lightStyles.card]}>
          <Text
            style={[styles.cardTitle, theme.isLight && lightStyles.cardTitle]}
          >
            Estado de notificaciones
          </Text>
          <Text
            style={[styles.cardText, theme.isLight && lightStyles.cardText]}
          >
            Comprueba aquí los permisos que necesita HabitLook para avisarte a
            tiempo.
          </Text>
          <View style={styles.status}>
            <View
              style={[
                styles.statusDot,
                !notificationStatus.notifications && styles.statusDotOff,
              ]}
            />
            <Text
              style={[
                styles.statusText,
                theme.isLight && lightStyles.statusText,
                !notificationStatus.notifications && styles.statusTextOff,
              ]}
            >
              Notificaciones:{' '}
              {notificationStatus.notifications ? 'permitidas' : 'pendientes'}
            </Text>
          </View>
          {Platform.OS === 'android' && (
            <View style={styles.status}>
              <View
                style={[
                  styles.statusDot,
                  !notificationStatus.exactAlarms && styles.statusDotOff,
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  theme.isLight && lightStyles.statusText,
                  !notificationStatus.exactAlarms && styles.statusTextOff,
                ]}
              >
                Alarmas exactas:{' '}
                {notificationStatus.exactAlarms ? 'permitidas' : 'pendientes'}
              </Text>
            </View>
          )}
          <View style={styles.statusActions}>
            <Pressable
              onPress={openNotificationPermissionSettings}
              style={[
                styles.statusButton,
                theme.isLight && lightStyles.statusButton,
              ]}
            >
              <Text
                style={[
                  styles.statusButtonText,
                  theme.isLight && lightStyles.statusButtonText,
                ]}
              >
                Notificaciones
              </Text>
            </Pressable>
            {Platform.OS === 'android' && (
              <Pressable
                onPress={openExactAlarmSettings}
                style={[
                  styles.statusButton,
                  theme.isLight && lightStyles.statusButton,
                ]}
              >
                <Text
                  style={[
                    styles.statusButtonText,
                    theme.isLight && lightStyles.statusButtonText,
                  ]}
                >
                  Alarmas
                </Text>
              </Pressable>
            )}
            {Platform.OS === 'android' && (
              <Pressable
                onPress={openBatterySettings}
                style={[
                  styles.statusButton,
                  theme.isLight && lightStyles.statusButton,
                ]}
              >
                <Text
                  style={[
                    styles.statusButtonText,
                    theme.isLight && lightStyles.statusButtonText,
                  ]}
                >
                  Batería
                </Text>
              </Pressable>
            )}
          </View>
          <Pressable onPress={testReminder} style={styles.testButton}>
            <Text style={styles.testButtonText}>Probar en 10 segundos</Text>
          </Pressable>
        </View>

        <Text style={[styles.section, theme.isLight && lightStyles.section]}>
          Funciones futuras
        </Text>

        <View style={[styles.card, theme.isLight && lightStyles.card]}>
          <View style={styles.titleLine}>
            <Text
              style={[styles.cardTitle, theme.isLight && lightStyles.cardTitle]}
            >
              Tiempo de pantalla
            </Text>
            <SoonBadge isLight={theme.isLight} />
          </View>
          <Text
            style={[styles.cardText, theme.isLight && lightStyles.cardText]}
          >
            La lectura se incorporará desde los permisos del sistema, siempre de
            forma local y opcional.
          </Text>
        </View>

        <Text style={[styles.section, theme.isLight && lightStyles.section]}>
          Datos
        </Text>

        <Pressable
          style={[styles.row, theme.isLight && lightStyles.row]}
          onPress={exportData}
        >
          <View>
            <Text
              style={[styles.rowTitle, theme.isLight && lightStyles.rowTitle]}
            >
              Exportar mis datos
            </Text>
            <Text
              style={[styles.rowText, theme.isLight && lightStyles.rowText]}
            >
              Copia local en JSON portable (sin cifrar)
            </Text>
          </View>
          <Text
            style={[styles.rowAction, theme.isLight && lightStyles.rowAction]}
          >
            Exportar
          </Text>
        </Pressable>

        <Pressable
          style={[styles.row, theme.isLight && lightStyles.row]}
          onPress={importData}
        >
          <View>
            <Text
              style={[styles.rowTitle, theme.isLight && lightStyles.rowTitle]}
            >
              Importar respaldo
            </Text>
            <Text
              style={[styles.rowText, theme.isLight && lightStyles.rowText]}
            >
              Restaura o fusiona un archivo de HabitLook
            </Text>
          </View>
          <Text
            style={[styles.rowAction, theme.isLight && lightStyles.rowAction]}
          >
            Importar
          </Text>
        </Pressable>

        <Text style={[styles.footnote, theme.isLight && lightStyles.footnote]}>
          HabitLook funciona sin iniciar sesión. Las suscripciones y servicios
          en línea no forman parte de esta versión local.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0D14' },
  content: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 12,
    paddingBottom: 40,
  },
  hero: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    backgroundColor: '#181B25',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#262C3E',
    padding: 16,
    marginVertical: 4,
  },
  heroInfo: { flex: 1 },
  heroTitle: { color: '#F5F6F9', fontSize: 16, fontWeight: '700' },
  heroText: { color: '#9DA3B2', marginTop: 3, fontSize: 12, lineHeight: 16 },
  aiCard: {
    backgroundColor: '#211C33',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#4A3D6B',
    padding: 16,
    gap: 10,
  },
  aiTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiIcon: { fontSize: 20 },
  aiTitle: { color: '#EDE9FB', fontWeight: '800', fontSize: 16 },
  aiText: { color: '#B9B0D6', fontSize: 13, lineHeight: 19 },
  aiButton: {
    backgroundColor: '#A78BFA',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 2,
  },
  aiButtonText: { color: '#171421', fontWeight: '800', fontSize: 14 },
  section: {
    color: '#C9B6E8',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginTop: 8,
  },
  card: {
    backgroundColor: '#181B25',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262C3E',
    padding: 15,
    gap: 8,
  },
  reminderChoices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 3,
  },
  reminder: {
    backgroundColor: '#252A39',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  reminderActive: { backgroundColor: '#A78BFA' },
  reminderText: { color: '#DDE0E8', fontSize: 12, fontWeight: '700' },
  reminderTextActive: { color: '#171421' },
  titleLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    alignItems: 'center',
  },
  cardTitle: { color: '#F2F3F6', fontWeight: '700', fontSize: 15 },
  cardText: { color: '#A1A6B6', fontSize: 13, lineHeight: 19 },
  status: { flexDirection: 'row', gap: 7, alignItems: 'center' },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#64D9A0',
  },
  statusDotOff: { backgroundColor: '#E895A4' },
  statusText: { color: '#79D8A2', fontSize: 12, fontWeight: '700' },
  statusTextOff: { color: '#E895A4' },
  statusActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 3,
  },
  statusButton: {
    backgroundColor: '#252A39',
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  statusButtonText: { color: '#DDE0E8', fontSize: 11, fontWeight: '700' },
  testButton: {
    alignItems: 'center',
    backgroundColor: '#A78BFA',
    borderRadius: 11,
    paddingVertical: 11,
    marginTop: 4,
  },
  testButtonText: { color: '#171421', fontWeight: '800', fontSize: 12 },
  soon: {
    backgroundColor: '#38313F',
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  soonText: {
    color: '#DAB7F0',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'center',
    backgroundColor: '#181B25',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262C3E',
    padding: 15,
  },
  rowTitle: { color: '#F2F3F6', fontWeight: '700' },
  rowText: { color: '#9298A9', marginTop: 4, fontSize: 12 },
  rowAction: { color: '#C9B6E8', fontWeight: '800', fontSize: 12 },
  footnote: { color: '#73798B', fontSize: 12, lineHeight: 18, marginTop: 8 },
});

const lightStyles = StyleSheet.create({
  container: { backgroundColor: light.background },
  hero: {
    backgroundColor: light.surface,
    borderWidth: 1,
    borderColor: light.border,
  },
  heroTitle: { color: light.text },
  heroText: { color: light.muted },
  aiCard: {
    backgroundColor: '#F1EAFB',
    borderColor: '#C9B3E8',
  },
  aiTitle: { color: '#4A3573' },
  aiText: { color: '#6B5B8A' },
  aiButton: { backgroundColor: light.accent },
  aiButtonText: { color: '#FFFFFF' },
  section: { color: light.accent },
  card: {
    backgroundColor: light.surface,
    borderWidth: 1,
    borderColor: light.border,
  },
  cardTitle: { color: light.text },
  cardText: { color: light.muted },
  statusText: { color: '#2E8555' },
  statusButton: {
    backgroundColor: light.surfaceMuted,
    borderWidth: 1,
    borderColor: light.border,
  },
  statusButtonText: { color: light.textSecondary },
  reminder: {
    backgroundColor: light.surfaceMuted,
    borderWidth: 1,
    borderColor: light.border,
  },
  reminderActive: {
    backgroundColor: light.accent,
    borderColor: light.accent,
  },
  reminderText: { color: light.muted },
  reminderTextActive: { color: '#FFFFFF' },
  soon: {
    backgroundColor: '#ECE3FA',
  },
  soonText: {
    color: light.accent,
  },
  row: {
    backgroundColor: light.surface,
    borderWidth: 1,
    borderColor: light.border,
  },
  rowTitle: { color: light.text },
  rowText: { color: light.muted },
  rowAction: { color: light.accent },
  footnote: { color: light.muted },
});
