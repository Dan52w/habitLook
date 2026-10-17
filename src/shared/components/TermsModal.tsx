import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppModal } from './AppModal';
import { light, useTheme } from '../theme/ThemeProvider';

const SECTIONS: { title: string; body: string }[] = [
  {
    title: 'Tus datos se quedan contigo',
    body: 'Todo lo que registras (hábitos, metas, rutinas, notas y contabilidad) se guarda cifrado en tu propio dispositivo. No necesitas crear una cuenta y no tenemos servidores recolectando tu información.',
  },
  {
    title: 'La IA viene incluida, pero no se usa sola',
    body: 'La app trae integrado el acceso al asistente IA: no tienes que instalar ni configurar nada. Aun así, ningún dato sale de tu teléfono hasta que tú decidas usarla: solo se envía lo que selecciones explícitamente (por ejemplo, el plan de ese día, tus metas o tu contabilidad) junto con tu mensaje.',
  },
  {
    title: 'Qué viaja cuando usas la IA',
    body: 'Tu mensaje y el contexto que elegiste viajan al servicio de IA de la app y de ahí al proveedor de IA (Groq), que genera la respuesta. No almacenamos tus conversaciones en nuestros servidores; Groq procesa cada solicitud según sus propias políticas.',
  },
  {
    title: 'Respaldos',
    body: 'Las copias de seguridad las creas tú desde tu dispositivo y contienen tus datos. Guárdalas en un lugar seguro y no las compartas con nadie.',
  },
  {
    title: 'Permisos',
    body: 'La app solo pide los permisos que necesita para funcionar: notificaciones (para los recordatorios que tú programas). Nada más.',
  },
  {
    title: 'Uso responsable',
    body: 'La IA puede equivocarse: verifica la información importante antes de actuar. No uses la app para fines ilícitos ni para dañar a terceros.',
  },
  {
    title: 'Contacto',
    body: 'Akmon Studios · akmonstudios@gmail.com · WhatsApp +57 301 764 8260. Al usar HabitLook aceptas estos términos.',
  },
];

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function TermsModal({ visible, onClose }: Props) {
  const theme = useTheme();
  const isLight = theme.isLight;
  return (
    <AppModal visible={visible} title="Términos y privacidad" onClose={onClose}>
      <View style={styles.wrap}>
        {SECTIONS.map(section => (
          <View key={section.title}>
            <Text style={[styles.title, isLight && lightStyles.title]}>
              {section.title}
            </Text>
            <Text style={[styles.body, isLight && lightStyles.body]}>
              {section.body}
            </Text>
          </View>
        ))}
        <Text style={[styles.updated, isLight && lightStyles.updated]}>
          Última actualización: octubre de 2026
        </Text>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16, paddingBottom: 8 },
  title: { color: '#D9C9F3', fontSize: 14, fontWeight: '800', marginBottom: 4 },
  body: { color: '#B9B3C7', fontSize: 13, lineHeight: 19 },
  updated: { color: '#5B5F6B', fontSize: 11, marginTop: 4 },
});

const lightStyles = StyleSheet.create({
  title: { color: light.accent },
  body: { color: '#5A5468' },
  updated: { color: light.muted },
});
