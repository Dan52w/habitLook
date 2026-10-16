# IA de HabitLook — vía backend propio

La app **nunca** habla con Groq directamente y **nunca** ve la API key.
El flujo es:

```
Teléfono (app) ──POST /api/chat──▶ habitlook-backend (Render)
   x-app-key: secreto embebido         │
                                       ▼
                              api.groq.com (GROQ_API_KEY en Render)
```

La app arma el prompt completo (system + contexto que el usuario
eligió + historial) y lo envía al backend; el backend valida,
autentica, limita por IP y reenvía a Groq.

## Repositorio del backend

**`Dan52w/habitlook-backend`** (privado) — Express + TypeScript.

## Desplegar en Render (una sola vez)

1. Crea el repo `habitlook-backend` en GitHub y sube el código
   (está en `~/workspace/habitlook-backend`).
2. En Render: **New → Blueprint**, conecta el repo (usa `render.yaml`).
3. En el dashboard del servicio → **Environment**, define:
   - `GROQ_API_KEY`: tu key de https://console.groq.com/keys
     (gratis, sin tarjeta).
   - `APP_API_KEY`: secreto compartido app → backend. Genera uno:
     `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
4. Deploy. Anota la URL, p. ej. `https://habitlook-backend.onrender.com`.

El plan gratuito de Render basta. Nota: en el plan free el servicio
se "duerme" tras inactividad y la primera petición tarda ~30-60 s en
despertarlo (el timeout de la app es 60 s).

## Compilar la app con IA activada

```powershell
# Una sola vez por máquina de build
pnpm backend:secrets
# Te pide: URL del backend y el APP_API_KEY (el mismo de Render)
pnpm android
```

Esto genera `src/services/ai/embeddedSecrets.ts` (en `.gitignore`,
nunca se sube al repo). La app resultante habla con tu backend sin
pedir nada al usuario.

Sin secretos embebidos, la IA queda inactiva (el chat muestra el
proveedor "Próximamente").

## Probar el backend

```bash
curl -X POST https://tu-backend.onrender.com/api/chat \
  -H "Content-Type: application/json" \
  -H "x-app-key: TU_APP_API_KEY" \
  -d '{"messages":[{"role":"user","content":"hola"}]}'
# → {"reply":"..."}
```

## Seguridad

- `GROQ_API_KEY` solo existe como variable de entorno en Render.
  Nunca en código, nunca en el repo, nunca en el teléfono.
- `APP_API_KEY`: secreto compartido. Embebido en la app al compilar
  (extraíble del APK con ingeniería inversa, como cualquier secreto
  en cliente) + rate limit por IP en el backend (40 req / 15 min).
  Si se abusa: rota el `APP_API_KEY` en Render y recompila; la key de
  Groq sigue a salvo.
- Validación de entrada: máx. 30 mensajes, 8000 caracteres por
  mensaje, 30000 en total; JSON limitado a 100kb.
- Comparación del `x-app-key` en tiempo constante.
- Helmet: cabeceras HTTP seguras. `trust proxy` para IP real tras
  el proxy de Render.
- Los errores al cliente son genéricos y amables; nunca filtran la
  key ni detalles internos.
- En la app: solo HTTPS, timeout de 60 s, y el prompt delimita los
  datos como `<datos_usuario>` no confiables (anti prompt-injection).

## Arquitectura en la app

| Archivo | Rol |
|---|---|
| `src/features/ai/AiScreen.tsx` | Chat + selector de contexto |
| `src/services/ai/service.ts` | Registro; usa backend si hay secreto embebido |
| `src/services/ai/providers/backend.ts` | `POST /api/chat` con `x-app-key` |
| `src/services/ai/embeddedSecrets.ts` | URL + secreto (generado, ignorado por git) |
| `scripts/inject-backend.js` | Genera `embeddedSecrets.ts` (`pnpm backend:secrets`) |
| `src/services/ai/context.ts` | Construye el texto de cada contexto elegido |
| `src/services/ai/prompts.ts` | System prompt + anti-inyección + historial |

## Modelo de IA

`openai/gpt-oss-120b` por defecto en el backend (tramo gratuito,
verificado oct-2026), con `reasoning_effort: 'low'` y
`max_tokens: 800`. Se cambia **sin tocar código** con la variable
`GROQ_MODEL` en Render. Para **más cuota diaria**, un modelo más
pequeño suele tener límites más altos: `openai/gpt-oss-20b`.

**Ojo:** Groq retira modelos cada cierto tiempo (ya retiró
`llama-3.3-70b-versatile`); si la IA deja de responder, revisa
https://console.groq.com/docs/models y actualiza `GROQ_MODEL`.
`meta-llama/llama-prompt-guard-2-86m` **no** es un modelo de chat
(es un clasificador anti prompt-injection): no sirve como asistente.

## Optimizaciones futuras

- **Streaming (SSE)**: hoy la app espera la respuesta completa. Con
  `stream: true` en Groq + Server-Sent Events, el usuario vería el
  texto generarse en tiempo real. Requiere cambios en ambos lados.
- **Caché de respuestas** para preguntas repetidas.
- **Límites por dispositivo** (identificador anónimo) además de por IP.

## Respuestas con formato

Las respuestas de la IA se renderizan con un mini-markdown propio
(`src/shared/components/MarkdownText.tsx`): **negritas**, *cursivas*,
`código`, títulos y listas. Sin dependencias nuevas.

## La IA puede crear planes, metas y notas

Si el usuario pide un plan, la IA propone el texto y puede adjuntar un
bloque ```plan con acciones JSON. La app lo valida estrictamente
(`src/services/ai/plan.ts`: máximo 12 acciones, horas HH:MM válidas,
tipos conocidos; si algo falla se rechaza todo) y muestra una tarjeta
"📋 Plan propuesto" con botón **Aplicar plan**. Solo se crea algo si el
usuario toca ese botón: nunca es automático. Acciones soportadas:
`time_block` (bloque del día, no recurrente), `goal` (meta con
frecuencia once/daily/weekly) y `note` (nota). Las categorías se
resuelven por nombre o se crean.

## Conversaciones guardadas

Los chats se persisten en SQLite (`ai_chats`, `ai_messages`, migración
011) con el estado del plan (pendiente/aplicado/descartado). La lista de
conversaciones permite retomar, crear nuevas y eliminar.

## Rangos de contexto

- **Plan**: Hoy, Semana o Mes (chips bajo las tarjetas de contexto).
- **Gastos**: periodo actual o últimos 3 periodos (máximo, para no
  sobrecargar a la IA).
