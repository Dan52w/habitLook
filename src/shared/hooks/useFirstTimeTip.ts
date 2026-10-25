import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getSetting, setSetting } from '../../db/repositories/settings';

/**
 * Muestra un consejo la primera vez que se abre una función (pestaña).
 * Al cerrarlo queda guardado y no vuelve a aparecer.
 */
export function useFirstTimeTip(key: string) {
  const [visible, setVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getSetting(`tip_seen_${key}`)
        .then(seen => {
          if (alive && seen !== '1') setVisible(true);
        })
        .catch(() => undefined);
      return () => {
        alive = false;
      };
    }, [key]),
  );

  const dismiss = useCallback(async () => {
    setVisible(false);
    try {
      await setSetting(`tip_seen_${key}`, '1');
    } catch {
      // Si no se pudo guardar, el consejo se mostrará de nuevo: no es grave.
    }
  }, [key]);

  return { visible, dismiss };
}

/** Todas las claves de consejos, para el botón "volver a verlos" de Perfil. */
export const TIP_KEYS = ['inicio', 'contabilidad', 'notas', 'ia', 'perfil'];

export async function resetAllTips(): Promise<void> {
  await Promise.all(TIP_KEYS.map(key => setSetting(`tip_seen_${key}`, '0')));
}
