import { getAiApiKey } from '../key';
import { EMBEDDED_GROQ_API_KEY } from '../embeddedKey';
import type { AiMessage, AiProvider } from '../types';

/**
 * Proveedor Groq (https://groq.com).
 *
 * - Plan gratuito sin tarjeta, con límites por modelo (peticiones/minuto
 *   y tokens/día). Ver límites en console.groq.com/settings/limits.
 * - API compatible con OpenAI: mismo formato de chat completions.
 *
 * La API key se resuelve así (en orden):
 *   1. Keychain del teléfono (si el usuario pegó una manualmente).
 *   2. Key embebida al compilar (`embeddedKey.ts`, generada con
 *      `pnpm ai:key`; archivo ignorado por git, nunca se sube al repo).
 *
 * Seguridad: la key solo viaja en el header Authorization, por HTTPS.
 * Nunca se registra en logs ni se incluye en mensajes de error.
 * Nota: una key embebida puede extraerse del APK con ingeniería
 * inversa; usa el tramo gratuito y rotala en console.groq.com si
 * detectas abuso.
 */
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';
// Modelo vigente en el tramo gratuito (verificado oct-2026).
// Groq retira modelos cada cierto tiempo: si la API responde 404 de
// modelo, hay que actualizar esta constante.
const MODEL = 'openai/gpt-oss-120b';
const TIMEOUT_MS = 60_000;

export async function getEffectiveApiKey(): Promise<string | null> {
  const keychainKey = await getAiApiKey().catch(() => null);
  if (keychainKey) return keychainKey;
  const embedded = EMBEDDED_GROQ_API_KEY.trim();
  return embedded ? embedded : null;
}

export class GroqProvider implements AiProvider {
  readonly id = 'groq';
  readonly name = 'Groq';

  async isConfigured(): Promise<boolean> {
    const key = await getEffectiveApiKey().catch(() => null);
    return Boolean(key);
  }

  async chat(messages: AiMessage[]): Promise<string> {
    const key = await getEffectiveApiKey();
    if (!key)
      throw new Error(
        'La IA no está disponible en esta versión de la app.',
      );

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: MODEL,
          // gpt-oss es un modelo de razonamiento: esfuerzo bajo para no
          // gastar el presupuesto de tokens en razonar.
          reasoning_effort: 'low',
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          max_tokens: 800,
          temperature: 0.7,
        }),
        signal: controller.signal,
      });

      if (res.status === 401 || res.status === 403)
        throw new Error(
          'No pudimos conectar con la IA en este momento. Inténtalo más tarde.',
        );
      if (res.status === 429)
        throw new Error(
          'La IA está recibiendo muchas solicitudes en este momento. Espera un minuto e inténtalo de nuevo.',
        );
      if (res.status === 404)
        throw new Error(
          'La IA no está disponible en este momento. Inténtalo más tarde.',
        );
      if (!res.ok)
        throw new Error(
          'La IA no está disponible en este momento. Inténtalo más tarde.',
        );

      const data = (await res.json()) as {
        choices?: { message?: { content?: unknown } }[];
      };
      const reply = data.choices?.[0]?.message?.content;
      if (typeof reply !== 'string' || !reply.trim())
        throw new Error('La IA no pudo responder ahora mismo. Inténtalo de nuevo.');
      return reply;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError')
        throw new Error('La IA tardó demasiado en responder. Inténtalo de nuevo.');
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
