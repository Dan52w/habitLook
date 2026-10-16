# Conectar una IA real al asistente de HabitLook

El asistente ya está **listo en la app**: pestaña IA en la navegación,
pantalla de chat, selector de contexto (plan, metas, notas, gastos) y
capa de proveedores. Lo único pendiente es enchufar un proveedor real
en lugar del `StubProvider` ("Próximamente").

## Cómo funciona hoy

```
┌─────────────┐    ┌──────────────────┐    ┌──────────────┐
│  AiScreen   │───▶│  service.ts      │───▶│  Proveedor   │
│ (chat +     │    │  chatWithAi()    │    │  (stub hoy,  │
│  contexto)  │    │  getAiProvider() │    │   OpenAI…)   │
└─────────────┘    └──────────────────┘    └──────────────┘
        │                  │
        ▼                  ▼
  context.ts          settings
  (plan, metas,        ai_provider
   notas, gastos)      ai_api_key*
```

*Clave sugerida, ver paso 4.

**Archivos clave:**

| Archivo | Rol |
|---|---|
| `src/features/ai/AiScreen.tsx` | Pantalla de chat + selector de contexto |
| `src/services/ai/types.ts` | Contrato `AiProvider` que todo proveedor implementa |
| `src/services/ai/service.ts` | Registro de proveedores y `chatWithAi()` |
| `src/services/ai/context.ts` | Construye el texto de cada contexto elegido |
| `src/services/ai/prompts.ts` | Arma el system prompt + contexto + historial |
| `src/services/ai/providers/stub.ts` | Proveedor actual: responde "Próximamente" |

**Modelo de privacidad:** nada se envía a ningún servicio salvo lo que el
usuario selecciona explícitamente (chips de contexto) y envía con un
mensaje. Sin selección, el prompt lo dice claro.

---

## Paso a paso: conectar OpenAI (ejemplo)

### 1. Crea el proveedor

Crea `src/services/ai/providers/openai.ts`:

```ts
import { getAiApiKey } from '../key';
import type { AiMessage, AiProvider } from '../types';

const API_URL = 'https://api.openai.com/v1/chat/completions';
const TIMEOUT_MS = 60_000;

export class OpenAiProvider implements AiProvider {
  readonly id = 'openai';
  readonly name = 'OpenAI GPT';

  async isConfigured(): Promise<boolean> {
    const key = await getAiApiKey();
    return Boolean(key);
  }

  async chat(messages: AiMessage[]): Promise<string> {
    const key = await getAiApiKey();
    if (!key) throw new Error('Falta la API key (guárdala con setAiApiKey)');
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
          model: 'gpt-4o-mini', // o el modelo que prefieras
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          max_tokens: 800,
          temperature: 0.7,
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`OpenAI ${res.status}: ${text.slice(0, 200)}`);
      }
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content;
      if (!reply || typeof reply !== 'string')
        throw new Error('Respuesta vacía del proveedor');
      return reply;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError')
        throw new Error('La IA tardó demasiado en responder (timeout)');
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
```

> Otros proveedores (Anthropic, Gemini, Ollama local) siguen el mismo
> patrón: implementa `AiProvider` cambiando solo `chat()`.

### 2. Regístralo

En `src/services/ai/service.ts`, agrega el import y la instancia:

```ts
import { OpenAiProvider } from './providers/openai';

const PROVIDERS: AiProvider[] = [
  new StubProvider(),
  new OpenAiProvider(),
];
```

### 3. Guarda la API key

Ya está implementado: usa `src/services/ai/key.ts`.

```ts
import { setAiApiKey } from '../key';

await setAiApiKey('sk-...'); // Keychain del sistema, cifrada por el SO
```

La clave **nunca** va en la tabla `settings`: aunque la BD está cifrada
con SQLCipher, las credenciales pertenecen al Keychain (control de
acceso del dispositivo y no viajan en los respaldos JSON, que son
texto plano). El proveedor la lee con `getAiApiKey()`.

Opción simple solo para prototipar: `setSetting('ai_api_key', key)`.
No la uses en producción.

Pendiente en la UI: agregar el campo para pegar la key en
Perfil → Asistente IA.

### 4. Actívalo

```ts
await setSetting('ai_provider', 'openai');
```

`getAiProvider()` lo leerá y `chatWithAi()` usará OpenAI. Si la key
falta, `isConfigured()` devuelve `false` y el chat muestra un aviso en
lugar de fallar en silencio.

### 5. Prueba

1. `pnpm android` (o iOS) con el teléfono conectado.
2. Pestaña **IA** → selecciona "Gastos del periodo" → escribe
   "¿En qué gasté más esta semana?".
3. Deberías recibir el análisis usando el contexto serializado
   (mira `context.ts` para el formato exacto que recibe el modelo).

---

## Formato del prompt

`prompts.ts` arma:

```
[system] Eres el asistente de HabitLook… (instrucciones en español)

## Datos que el usuario eligió compartir
### Plan de hoy
Plan del 2026-10-15:
• 08:00–09:00: Trabajo
…

### Gastos · 12 – 18 oct
Gastos del periodo 12 – 18 oct (2026-10-12 a 2026-10-18):
• Ingresos: $…
• Gastos: $…
Por categoría:
  - Comida: $…
Comparación con el periodo anterior: …

[user] ¿En qué gasté más esta semana?
```

## Agregar más contextos

1. Agrega el id a `ContextId` y a `CONTEXT_OPTIONS` en `context.ts`.
2. Implementa `buildXBlock()` que devuelva `{ id, label, text }`.
3. Llámalo en `buildContextBlocks()`.

Ideas: racha de metas, resumen del mes contable, bloques de la semana,
nota(s) específica(s) seleccionada(s).

## Costos y límites a tener en cuenta

- Los contextos se serializan a texto: con muchos gastos/notas el
  prompt crece. `buildNotesBlock()` limita a 15 notas y 160
  caracteres; haz lo mismo al agregar contextos.
- `max_tokens: 800` mantiene respuestas cortas y baratas.
- Todo el tráfico sale del teléfono solo cuando el usuario envía un
  mensaje: documenta esto en la pantalla si cambias el modelo.
