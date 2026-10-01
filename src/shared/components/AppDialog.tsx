import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { light, useTheme } from '../theme/ThemeProvider';

export type DialogButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void | Promise<void>;
};

export type DialogConfig = {
  visible: boolean;
  title: string;
  message?: string;
  type?: 'info' | 'warning' | 'error' | 'success' | 'destructive';
  buttons?: DialogButton[];
  onClose?: () => void;
};

type Props = DialogConfig;

export function AppDialog({
  visible,
  title,
  message,
  type = 'info',
  buttons = [{ text: 'Aceptar', style: 'default' }],
  onClose,
}: Props) {
  const theme = useTheme();

  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case 'destructive':
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'success':
        return '✓';
      case 'info':
      default:
        return '✦';
    }
  };

  const getIconBg = () => {
    switch (type) {
      case 'destructive':
      case 'error':
        return '#4A1D24';
      case 'warning':
        return '#4D3800';
      case 'success':
        return '#14412B';
      case 'info':
      default:
        return '#2E234B';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'destructive':
      case 'error':
        return '#F09AA9';
      case 'warning':
        return '#FBBF24';
      case 'success':
        return '#4ADE80';
      case 'info':
      default:
        return '#C4B5FD';
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.card, theme.isLight && lightStyles.card]}>
          <View style={[styles.iconContainer, { backgroundColor: getIconBg() }]}>
            <Text style={[styles.iconText, { color: getIconColor() }]}>{getIcon()}</Text>
          </View>

          <Text style={[styles.title, theme.isLight && lightStyles.title]}>{title}</Text>

          {message ? (
            <Text style={[styles.message, theme.isLight && lightStyles.message]}>
              {message}
            </Text>
          ) : null}

          <View style={styles.buttonRow}>
            {buttons.map((button, index) => {
              const isCancel = button.style === 'cancel';
              const isDestructive = button.style === 'destructive' || type === 'destructive';

              let btnStyle = styles.defaultBtn;
              let txtStyle = styles.defaultBtnText;

              if (isDestructive) {
                btnStyle = styles.destructiveBtn;
                txtStyle = styles.destructiveBtnText;
              } else if (isCancel) {
                btnStyle = theme.isLight ? lightStyles.cancelBtn : styles.cancelBtn;
                txtStyle = theme.isLight ? lightStyles.cancelBtnText : styles.cancelBtnText;
              }

              return (
                <Pressable
                  key={index}
                  onPress={async () => {
                    if (button.onPress) {
                      await button.onPress();
                    }
                    if (onClose) {
                      onClose();
                    }
                  }}
                  style={[styles.btnBase, btnStyle]}
                >
                  <Text style={[styles.btnTextBase, txtStyle]}>{button.text}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 12, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#171B27',
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#262C3E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconText: {
    fontSize: 20,
    fontWeight: '800',
  },
  title: {
    color: '#F8F7FB',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    color: '#9CA3AF',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 4,
  },
  btnBase: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  btnTextBase: {
    fontSize: 14,
    fontWeight: '700',
  },
  defaultBtn: {
    backgroundColor: '#A78BFA',
  },
  defaultBtnText: {
    color: '#171421',
    fontWeight: '800',
  },
  destructiveBtn: {
    backgroundColor: '#E85D75',
  },
  destructiveBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  cancelBtn: {
    backgroundColor: '#252A39',
  },
  cancelBtnText: {
    color: '#D1D5DB',
  },
});

const lightStyles = StyleSheet.create({
  card: {
    backgroundColor: light.surface,
    borderColor: light.border,
  },
  title: {
    color: light.text,
  },
  message: {
    color: light.muted,
  },
  cancelBtn: {
    backgroundColor: light.surfaceMuted,
    borderWidth: 1,
    borderColor: light.border,
  },
  cancelBtnText: {
    color: light.textSecondary,
  },
});
