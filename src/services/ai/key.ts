import * as Keychain from 'react-native-keychain';

const KEYCHAIN_SERVICE = 'com.akmonstudios.habitlook.aikey';

/**
 * API key del proveedor de IA, guardada en el Keychain del sistema
 * (cifrada por el SO), NO en la tabla `settings`.
 *
 * Aunque la BD está cifrada con SQLCipher, las credenciales pertenecen
 * al almacén de credenciales del sistema: tienen control de acceso
 * biométrico/dispositivo y no viajan en los respaldos JSON (que son
 * texto plano).
 */
export async function getAiApiKey(): Promise<string | null> {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: KEYCHAIN_SERVICE,
    });
    return credentials ? credentials.password : null;
  } catch {
    return null;
  }
}

export async function setAiApiKey(apiKey: string): Promise<void> {
  const key = apiKey.trim();
  if (!key) {
    await clearAiApiKey();
    return;
  }
  await Keychain.setGenericPassword('habitlook-ai', key, {
    service: KEYCHAIN_SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function clearAiApiKey(): Promise<void> {
  await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE }).catch(
    () => undefined,
  );
}
