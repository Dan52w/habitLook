import { getSetting } from '../../db/repositories/settings';
import type { AiChatResult, AiMessage, AiProvider } from './types';
import { StubProvider } from './providers/stub';
import { BackendProvider } from './providers/backend';

const PROVIDERS: AiProvider[] = [
  new StubProvider(),
  new BackendProvider(),
  // Para agregar otro proveedor, implementa AiProvider y añádelo aquí.
];

export function listAiProviders(): AiProvider[] {
  return PROVIDERS;
}

export async function getAiProvider(): Promise<AiProvider> {
  const wanted = await getSetting('ai_provider').catch(() => null);
  const found = PROVIDERS.find(p => p.id === wanted);
  if (found) return found;
  // Sin selección explícita: usa el backend si trae secreto embebido.
  const backend = PROVIDERS.find(p => p.id === 'backend');
  if (backend && (await backend.isConfigured().catch(() => false))) return backend;
  return PROVIDERS[0];
}

/**
 * Punto de entrada único para hablar con la IA.
 * El proveedor por defecto es el stub ("Próximamente").
 */
export async function chatWithAi(messages: AiMessage[]): Promise<AiChatResult> {
  const provider = await getAiProvider();
  const configured = await provider.isConfigured().catch(() => false);
  if (!configured) {
    return {
      reply:
        '⚠️ El proveedor de IA no está configurado. Revisa `docs/conectar-ia.md` para conectarlo.',
      providerId: provider.id,
    };
  }
  const reply = await provider.chat(messages);
  return { reply, providerId: provider.id };
}
