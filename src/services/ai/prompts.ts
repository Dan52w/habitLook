import type { AiContextBlock, AiMessage } from './types';

/**
 * Arma los mensajes finales: system prompt + contexto del usuario
 * + historial de la conversación.
 *
 * El contexto SOLO incluye lo que el usuario seleccionó explícitamente
 * en la pantalla de chat. Nada se envía en segundo plano.
 */
export function buildPrompt(
  history: AiMessage[],
  contextBlocks: AiContextBlock[],
): AiMessage[] {
  const contextText =
    contextBlocks.length > 0
      ? '\n\n## Datos que el usuario eligió compartir\n' +
        contextBlocks.map(b => `### ${b.label}\n${b.text}`).join('\n\n')
      : '\n\n(El usuario no adjuntó ningún dato en este mensaje.)';

  const system: AiMessage = {
    role: 'system',
    content:
      'Eres el asistente de HabitLook, una app local-first de hábitos, ' +
      'rutinas, notas y contabilidad personal. Hablas español, eres cálido, ' +
      'directo y práctico. Das consejos accionables y breves; si algo no ' +
      'está en los datos compartidos, lo dices en vez de inventarlo. ' +
      'Nunca pides datos sensibles fuera de la app.' +
      contextText,
  };

  return [system, ...history];
}
