import React, { createContext, useCallback, useContext, useState } from 'react';
import { AppDialog, DialogButton, DialogConfig } from '../components/AppDialog';

type DialogOptions = {
  title: string;
  message?: string;
  type?: 'info' | 'warning' | 'error' | 'success' | 'destructive';
  buttons?: DialogButton[];
};

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
};

type AlertOptions = {
  title: string;
  message?: string;
  type?: 'info' | 'warning' | 'error' | 'success';
  buttonText?: string;
  onClose?: () => void;
};

type DialogContextType = {
  showDialog: (options: DialogOptions) => void;
  showConfirm: (options: ConfirmOptions) => void;
  showAlert: (options: AlertOptions) => void;
  hideDialog: () => void;
};

const DialogContext = createContext<DialogContextType | null>(null);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<DialogConfig>({
    visible: false,
    title: '',
  });

  const hideDialog = useCallback(() => {
    setConfig(prev => ({ ...prev, visible: false }));
  }, []);

  const showDialog = useCallback(
    (options: DialogOptions) => {
      setConfig({
        visible: true,
        title: options.title,
        message: options.message,
        type: options.type,
        buttons: options.buttons || [{ text: 'Aceptar', style: 'default' }],
        onClose: hideDialog,
      });
    },
    [hideDialog],
  );

  const showConfirm = useCallback(
    ({
      title,
      message,
      confirmText = 'Aceptar',
      cancelText = 'Cancelar',
      destructive = false,
      onConfirm,
      onCancel,
    }: ConfirmOptions) => {
      setConfig({
        visible: true,
        title,
        message,
        type: destructive ? 'destructive' : 'warning',
        buttons: [
          {
            text: cancelText,
            style: 'cancel',
            onPress: onCancel,
          },
          {
            text: confirmText,
            style: destructive ? 'destructive' : 'default',
            onPress: onConfirm,
          },
        ],
        onClose: hideDialog,
      });
    },
    [hideDialog],
  );

  const showAlert = useCallback(
    ({
      title,
      message,
      type = 'info',
      buttonText = 'Entendido',
      onClose,
    }: AlertOptions) => {
      setConfig({
        visible: true,
        title,
        message,
        type,
        buttons: [
          {
            text: buttonText,
            style: 'default',
            onPress: onClose,
          },
        ],
        onClose: hideDialog,
      });
    },
    [hideDialog],
  );

  return (
    <DialogContext.Provider
      value={{
        showDialog,
        showConfirm,
        showAlert,
        hideDialog,
      }}
    >
      {children}
      <AppDialog {...config} onClose={hideDialog} />
    </DialogContext.Provider>
  );
}

export function useAppDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useAppDialog must be used within a DialogProvider');
  }
  return context;
}
