import type { AiMessage, AiProvider } from '../types';

/**
 * Proveedor por defecto: no llama a ningún servicio externo.
 * Responde "Próximamente" hasta que se conecte un proveedor real.
 * Ver `docs/conectar-ia.md` para el paso a paso.
 */
export class StubProvider implements AiProvider {
  readonly id = 'stub';
  readonly name = 'Próximamente';

  async isConfigured(): Promise<boolean> {
    return true;
  }

  async chat(messages: AiMessage[]): Promise<string> {
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    const preview = lastUser
      ? ` Recibí tu mensaje: “${lastUser.content.slice(0, 80)}${
          lastUser.content.length > 80 ? '…' : ''
        }”.`
      : '';
    // Pequeña pausa para que se sienta como una respuesta real.
    await new Promise<void>(resolve => setTimeout(() => resolve(), 900));
    return (
      `🚀 **Próximamente** — el asistente de IA de HabitLook aún no está conectado.${preview}\n\n` +
      'Cuando conectes un proveedor (ver `docs/conectar-ia.md`), responderé usando ' +
      'el contexto que elijas compartir: tu plan, metas, notas o gastos. ' +
      'Nada se envía a ningún servicio sin que tú lo decidas mensaje a mensaje.'
    );
  }
}
