# IA de HabitLook — Groq (gratis)

El asistente usa **Groq** (`src/services/ai/providers/groq.ts`) y viene
listo para usuarios normales: **no tienen que configurar nada**.

## ¿Es gratis?

**Sí.** Groq tiene plan gratuito sin pedir tarjeta. El tramo gratuito
tiene límites por modelo (peticiones por minuto y tokens por día); si
se superan, la app muestra un mensaje amable pidiendo esperar. Revisa
los límites en https://console.groq.com/settings/limits.

Modelo usado: `openai/gpt-oss-120b` (vigente en el tramo gratuito,
verificado oct-2026). **Ojo:** Groq retira modelos cada cierto tiempo
(ya retiró `llama-3.3-70b-versatile`); si la IA deja de responder con
"no está disponible", revisa el catálogo en
https://console.groq.com/docs/models y actualiza `MODEL` en `groq.ts`.

## Cómo compilar la app con IA activada (desarrollador)

La API key se **embebe al compilar** desde tu máquina (nunca se sube
al repo):

```powershell
# Una sola vez: genera src/services/ai/embeddedKey.ts (ignorado por git)
$env:GROQ_API_KEY="gsk-tu-key"
pnpm ai:key

# O interactivo:
pnpm ai:key
```

Luego compila normal: `pnpm android`. La app resultante ya trae la IA
funcionando, sin que el usuario pegue ninguna key.

- Tu key: https://console.groq.com/keys (gratis, sin tarjeta).
- El archivo generado está en `.gitignore`; el repo solo lleva la
  plantilla `embeddedKey.ts.example`.
- `postinstall` genera el archivo vacío si falta, para no romper `tsc`.
- Si compilas **sin** key embebida, la pestaña IA muestra una tarjeta
  para pegarla manualmente (se guarda en el Keychain del teléfono).

### Rotar la key

Si sospechas abuso (la key embebida puede extraerse del APK con
ingeniería inversa): genera una nueva en console.groq.com/keys,
revoca la vieja, corre `pnpm ai:key` de nuevo y recompila.

## Seguridad

- La key **nunca** va en el código, ni en la BD (`settings`), ni en
  respaldos. En el dispositivo: Keychain del sistema (key manual) o
  constante embebida en el build.
- La key solo viaja en el header `Authorization`, por HTTPS. Nunca se
  registra en logs ni aparece en mensajes de error.
- Solo HTTPS (Android: `network_security_config.xml`;
  iOS: `NSAllowsArbitraryLoads = false`). Timeout de 60 s.
- El prompt delimita tus datos como `<datos_usuario>` no confiables:
  el modelo no debe seguir instrucciones embebidas en notas o gastos.
- Solo se envía lo que seleccionas en "Qué quieres compartir",
  mensaje a mensaje. Nada en segundo plano.
- Riesgo conocido: la key embebida **sí** puede extraerse del APK.
  Mitigación: es el tramo gratuito (daño limitado) + rotación de key.
  A futuro, un proxy propio eliminaría este riesgo.

## Arquitectura

```
┌──────────────┐     ┌──────────────┐     ┌───────────────┐
│   AiScreen   │────▶│  service.ts  │────▶│ GroqProvider  │
│ (chat + key  │     │  chatWithAi()│     │  (groq.ts)    │
│  manual si   │     └──────────────┘     └───────────────┘
│  no hay key  │            │                     │
│  embebida)   │            ▼                     ▼
└──────────────┘     getAiProvider()        getEffectiveApiKey()
                     usa Groq si hay key ──▶ Keychain → embebida
```

**Archivos clave:**

| Archivo | Rol |
|---|---|
| `src/features/ai/AiScreen.tsx` | Chat + tarjeta de key manual (solo sin key embebida) |
| `src/services/ai/types.ts` | Contrato `AiProvider` |
| `src/services/ai/service.ts` | Registro y `chatWithAi()`; Groq por defecto si hay key |
| `src/services/ai/providers/groq.ts` | Llamadas a la API de Groq + `getEffectiveApiKey()` |
| `src/services/ai/key.ts` | `getAiApiKey` / `setAiApiKey` / `clearAiApiKey` (Keychain) |
| `src/services/ai/embeddedKey.ts` | Key embebida (generado, ignorado por git) |
| `scripts/inject-ai-key.js` | Genera `embeddedKey.ts` (`pnpm ai:key`) |
| `src/services/ai/context.ts` | Construye el texto de cada contexto elegido |
| `src/services/ai/prompts.ts` | System prompt + anti-inyección + historial |

## Agregar otro proveedor

1. Implementa `AiProvider` (`id`, `name`, `isConfigured()`, `chat()`).
2. Regístralo en `PROVIDERS` en `service.ts`.
3. Guarda su key con `setAiApiKey` (o crea otro servicio de Keychain
   si necesitas varias keys).

## Costos y límites a tener en cuenta

- Los contextos se serializan a texto: con muchos gastos/notas el
  prompt crece. `buildNotesBlock()` limita a 15 notas y 160
  caracteres; haz lo mismo al agregar contextos.
- `max_tokens: 800` + `reasoning_effort: 'low'` mantienen respuestas
  cortas y dentro de la cuota (gpt-oss es modelo de razonamiento).
- Todo el tráfico sale del teléfono solo cuando el usuario envía un
  mensaje.
