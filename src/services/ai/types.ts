export type AiRole = 'user' | 'assistant' | 'system';

export type AiMessage = {
  role: AiRole;
  content: string;
};

/**
 * Un bloque de contexto que el usuario eligió compartir con la IA.
 * `text` es la versión serializada que se inyecta en el prompt.
 */
export type AiContextBlock = {
  id: string;
  label: string;
  text: string;
};

export type AiChatResult = {
  reply: string;
  providerId: string;
};

/**
 * Contrato que debe cumplir cualquier proveedor de IA
 * (OpenAI, Anthropic, Gemini, Ollama local, etc.).
 *
 * Para agregar uno nuevo:
 *  1. Crea `src/services/ai/providers/<nombre>.ts` que implemente
 *     esta interfaz.
 *  2. Regístralo en `src/services/ai/service.ts` (PROVIDERS).
 *  3. Guarda su API key con `setSetting('ai_api_key', ...)` o en
 *     el Keychain; el proveedor la lee en `isConfigured()`.
 */
export interface AiProvider {
  /** Identificador único, ej. 'stub' | 'openai'. */
  readonly id: string;
  /** Nombre visible, ej. 'OpenAI GPT'. */
  readonly name: string;
  /** true si tiene todo lo necesario para responder (API key, etc.). */
  isConfigured(): Promise<boolean>;
  /**
   * Envía los mensajes y devuelve la respuesta del asistente.
   * `context` ya viene serializado dentro de los mensajes (system).
   */
  chat(messages: AiMessage[]): Promise<string>;
}
