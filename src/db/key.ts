import * as Keychain from 'react-native-keychain';

const KEYCHAIN_SERVICE = 'com.akmonstudios.habitlook.dbkey';

function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  const cryptoApi = (
    globalThis as unknown as {
      crypto: { getRandomValues: (array: Uint8Array) => Uint8Array };
    }
  ).crypto;
  cryptoApi.getRandomValues(bytes); // requiere el polyfill importado en index.js
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export async function getOrCreateDbKey(): Promise<string> {
  const existing = await Keychain.getGenericPassword({
    service: KEYCHAIN_SERVICE,
  });
  if (existing) return existing.password;

  const key = randomHex(32); // 256 bits
  await Keychain.setGenericPassword('habitlook-db', key, {
    service: KEYCHAIN_SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  return key;
}
