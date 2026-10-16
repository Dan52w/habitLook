import { getAiApiKey } from '../key';
import type { AiMessage, AiProvider } from '../types';

/**
 * Proveedor Groq (https://groq.com).
 *
 * - Plan gratuito sin tarjeta, con límites por modelo (peticiones/minuto
 *   y tokens/día). Ver límites de tu cuenta en console.groq.com/settings/limits.
 * - API compatible con OpenAI: mismo formato de chat completions.
 * - La API key vive en el Keychain del sistema (ver ../key.ts): nunca se
 *   registra en logs, nunca va en el código ni en la BD.
 */
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';
const TIMEOUT_MS = 60_000;

export class GroqProvider implements AiProvider {
  readonly id = 'groq';
  readonly name = 'Groq';

  async isConfigured(): Promise<boolean> {
    const key = await getAiApiKey().catch(() => null);
    return Boolean(key);
  }

  async chat(messages: AiMessage[]): Promise<string> {
    const key = await getAiApiKey();
    if (!key) throw new Error('Falta la API key de Groq.');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // La key solo viaja en el header Authorization, por HTTPS.
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          max_tokens: 800,
          temperature: 0.7,
        }),
        signal: controller.signal,
      });

      if (res.status === 401)
        throw new Error(
          'La API key de Groq no es válida. Revísala en la configuración del asistente.',
        );
      if (res.status === 429)
        throw new Error(
          'Límite gratuito de Groq alcanzado. Espera un momento e inténtalo de nuevo.',
        );
      if (!res.ok)
        throw new Error(`Groq respondió con error ${res.status}.`);

      const data = (await res.json()) as {
        choices?: { message?: { content?: unknown } }[];
      };
      const reply = data.choices?.[0]?.message?.content;
      if (typeof reply !== 'string' || !reply.trim())
        throw new Error('Groq devolvió una respuesta vacía.');
      return reply;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError')
        throw new Error('Groq tardó demasiado en responder (timeout).');
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
