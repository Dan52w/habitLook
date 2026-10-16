import { EMBEDDED_BACKEND_URL, EMBEDDED_APP_KEY } from '../embeddedSecrets';
import type { AiMessage, AiProvider } from '../types';

/**
 * Proveedor IA vía backend propio (habitlook-backend, desplegado en Render).
 *
 * La app NUNCA ve la API key de Groq: solo habla con el backend, y el
 * backend habla con Groq. La key de Groq vive como variable de entorno
 * en Render.
 *
 * Autenticación app → backend: header `x-app-key` con el secreto
 * compartido, embebido al compilar con `pnpm backend:secrets`
 * (archivo ignorado por git). El backend además limita por IP.
 */
const DEFAULT_BACKEND_URL = 'https://habitlook-backend.onrender.com';
const TIMEOUT_MS = 60_000;

function backendUrl(): string {
  const custom = EMBEDDED_BACKEND_URL.trim();
  return (custom || DEFAULT_BACKEND_URL).replace(/\/+$/, '');
}

export class BackendProvider implements AiProvider {
  readonly id = 'backend';
  readonly name = 'HabitLook IA';

  async isConfigured(): Promise<boolean> {
    return EMBEDDED_APP_KEY.trim().length > 0;
  }

  async chat(messages: AiMessage[]): Promise<string> {
    const appKey = EMBEDDED_APP_KEY.trim();
    if (!appKey)
      throw new Error('La IA no está disponible en esta versión de la app.');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${backendUrl()}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-key': appKey,
        },
        body: JSON.stringify({
          messages: messages.map(m => ({ role: m.role, content: m.content })),
        }),
        signal: controller.signal,
      });

      if (res.status === 429)
        throw new Error(
          'La IA está recibiendo muchas solicitudes en este momento. Espera un minuto e inténtalo de nuevo.',
        );
      if (!res.ok)
        throw new Error(
          'La IA no está disponible en este momento. Inténtalo más tarde.',
        );

      const data = (await res.json()) as { reply?: unknown; error?: unknown };
      // El backend ya devuelve mensajes amables en `error`.
      if (typeof data.reply === 'string' && data.reply.trim()) return data.reply;
      throw new Error(
        typeof data.error === 'string' && data.error
          ? data.error
          : 'La IA no pudo responder ahora mismo. Inténtalo de nuevo.',
      );
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError')
        throw new Error('La IA tardó demasiado en responder. Inténtalo de nuevo.');
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
