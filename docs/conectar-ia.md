# IA de HabitLook — Groq (gratis)

El asistente usa **Groq** (`src/services/ai/providers/groq.ts`).

## ¿Es gratis?

**Sí.** Groq tiene plan gratuito sin pedir tarjeta: te registras en
https://console.groq.com, creas una API key en
https://console.groq.com/keys y listo. El plan gratuito tiene límites
por modelo (peticiones por minuto y tokens por día); si los superas, la
API responde 429 y la app te avisa que esperes. Revisa tus límites
reales en https://console.groq.com/settings/limits (varían por modelo).

Modelo usado: `llama-3.3-70b-versatile` (rápido y capaz, dentro del
tramo gratuito). La app maneja 401 (key inválida) y 429 (cuota
alcanzada) con mensajes claros.

## Cómo conectarlo (2 minutos)

1. Crea tu key gratuita en https://console.groq.com/keys
   (empieza por `gsk_`).
2. Abre la pestaña **IA** en la app → tarjeta **"Conectar Groq (gratis)"**.
3. Pega la key y toca **Guardar key**.

Listo: el chat usa Groq automáticamente. La key se guarda cifrada en
el Keychain del teléfono (iOS Keychain / Android Keystore) y nunca
sale del dispositivo salvo a `https://api.groq.com` por HTTPS cuando
envías un mensaje.

Para quitarla: **Quitar API key de Groq** en la misma pantalla.

## Seguridad

- La key **nunca** va en el código, ni en la BD (`settings`), ni en
  respaldos. Solo en el Keychain del sistema.
- La key nunca se registra en logs; los errores solo muestran el
  código de estado (401/429).
- Solo HTTPS (Android: `network_security_config.xml`;
  iOS: `NSAllowsArbitraryLoads = false`).
- Timeout de 60 s por petición.
- El prompt delimita tus datos como `<datos_usuario>` no confiables:
  el modelo no debe seguir instrucciones embebidas en notas o gastos.
- Solo se envía lo que seleccionas en "Qué quieres compartir",
  mensaje a mensaje. Nada en segundo plano.

## Arquitectura

```
┌──────────────┐     ┌──────────────┐     ┌───────────────┐
│   AiScreen   │────▶│  service.ts  │────▶│ GroqProvider  │
│ (chat + key) │     │  chatWithAi()│     │  (groq.ts)    │
└──────────────┘     └──────────────┘     └───────────────┘
        │                   │                     │
        ▼                   ▼                     ▼
  context.ts          getAiProvider()        key.ts (Keychain)
  (plan, metas,  ──▶ usa Groq si hay key,
   notas, gastos)     si no, stub
```

**Archivos clave:**

| Archivo | Rol |
|---|---|
| `src/features/ai/AiScreen.tsx` | Chat + tarjeta para pegar/quitar la key |
| `src/services/ai/types.ts` | Contrato `AiProvider` |
| `src/services/ai/service.ts` | Registro y `chatWithAi()`; Groq por defecto si hay key |
| `src/services/ai/providers/groq.ts` | Llamadas a la API de Groq |
| `src/services/ai/key.ts` | `getAiApiKey` / `setAiApiKey` / `clearAiApiKey` (Keychain) |
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
- `max_tokens: 800` mantiene respuestas cortas y dentro de la cuota.
- Todo el tráfico sale del teléfono solo cuando el usuario envía un
  mensaje.
