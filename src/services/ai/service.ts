import { getSetting } from '../../db/repositories/settings';
import type { AiChatResult, AiMessage, AiProvider } from './types';
import { StubProvider } from './providers/stub';

const PROVIDERS: AiProvider[] = [
  new StubProvider(),
  // Para conectar una IA real, agrega aquí tu proveedor:
  //   new OpenAiProvider(),
  // y sigue el paso a paso en docs/conectar-ia.md
];

export function listAiProviders(): AiProvider[] {
  return PROVIDERS;
}

export async function getAiProvider(): Promise<AiProvider> {
  const wanted = await getSetting('ai_provider').catch(() => null);
  const found = PROVIDERS.find(p => p.id === wanted);
  return found ?? PROVIDERS[0];
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
