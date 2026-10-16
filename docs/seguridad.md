# Seguridad de HabitLook

Auditoría realizada el 2026-10-15. La app es local-first: sin cuentas,
sin servidores propios y sin tráfico de red (hasta que se conecte IA).

## Postura actual

| Área | Estado |
|---|---|
| BD cifrada (SQLCipher) | ✅ Clave aleatoria de 256 bits en Keychain (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`) |
| Consultas SQL | ✅ 100% parametrizadas (`?`); sin concatenación |
| Importación de respaldos | ✅ Validada: allowlist de columnas del esquema real + regex estricta + solo primitivas + límite 50 MB |
| Exportación | ✅ Se limpia el archivo temporal tras compartir; la UI advierte que el JSON no está cifrado |
| API key de IA | ✅ `src/services/ai/key.ts` → Keychain del sistema, no en `settings` |
| Tráfico de red (Android) | ✅ `network_security_config.xml`: `cleartextTrafficPermitted="false"` (solo HTTPS) |
| Tráfico de red (iOS) | ✅ `NSAllowsArbitraryLoads = false` (solo HTTPS) |
| Backup de Android | ✅ `allowBackup="false"` (la BD cifrada no sale por backup del sistema) |
| Componentes exportados | ✅ Solo `MainActivity` (launcher); widget y resto no exportados |
| Logs | ✅ Sin datos sensibles en `console` |
| Release Android | ✅ No debuggable por defecto |

## Hallazgos corregidos

1. **CRÍTICO — Inyección SQL en importar respaldo**: los nombres de
   columna del JSON se interpolaban directo al `INSERT`. Ahora se
   validan contra las columnas reales (`PRAGMA table_info`) más regex
   `/^[a-z_][a-z0-9_]*$/`, y los valores deben ser primitivos.
   Tests en `__tests__/security.test.ts`.
2. **Import sin límite de tamaño**: un JSON gigante podía agotar memoria.
   Límite de 50 MB antes de leer.
3. **Archivo temporal de exportación**: se eliminaba nunca; ahora se
   borra tras compartir (el JSON es texto plano).
4. **API key en `settings`**: el ejemplo de la guía la guardaba en texto
   plano en la BD. Ahora `src/services/ai/key.ts` usa Keychain.

## IA con Groq (conectada el 2026-10-16)

- [x] Proveedor `GroqProvider` (`openai/gpt-oss-120b`, tramo gratuito)
- [x] Key embebida al compilar (`pnpm ai:key` → `embeddedKey.ts`,
      ignorado por git, nunca se sube al repo); fallback a key manual
      en Keychain si el build no trae embebida
- [x] Mensajes de error amables para usuarios normales (sin jerga de
      "cuota gratuita": 429/401/404/timeout → "inténtalo más tarde")
- [x] La key nunca se registra en logs ni aparece en errores
- [x] Solo HTTPS en ambas plataformas; timeout de 60 s
- [x] `buildPrompt()` delimita los datos como `<datos_usuario>` no
      confiables (anti prompt-injection)
- [x] Nada se envía sin selección explícita del usuario, mensaje a mensaje
- [ ] **Riesgo conocido**: la key embebida puede extraerse del APK con
      ingeniería inversa. Mitigación actual: tramo gratuito (daño
      limitado) + rotación en console.groq.com. A futuro: proxy propio.
- [ ] **Vigilar**: Groq retira modelos (ya retiró
      `llama-3.3-70b-versatile`); si la IA falla con "no disponible",
      actualizar `MODEL` en `groq.ts`

## Lista para conectar IA

- [x] Clave en Keychain (`getAiApiKey` / `setAiApiKey` / `clearAiApiKey`)
- [x] Solo HTTPS en ambas plataformas
- [x] `buildPrompt()` delimita los datos como `<datos_usuario>` no
      confiables y ordena no seguir instrucciones embebidas en ellos
      (notas/gastos podrían contener prompt-injection)
- [x] Nada se envía sin selección explícita del usuario, mensaje a mensaje
- [x] Ejemplo OpenAI con timeout (60 s) y validación de respuesta
- [x] UI en la pestaña IA para pegar/quitar la key (Keychain)
- [ ] **Pendiente**: al conectar, revisar que el proveedor no registre
      los prompts (ej. en OpenAI, optar por no entrenamiento si aplica)

## Notas

- Las notificaciones muestran nombres de actividades/metas en la
  pantalla de bloqueo: es el comportamiento esperado de recordatorios;
  el usuario puede ocultarlo en ajustes del sistema por canal.
- `settings` viaja en los respaldos JSON (texto plano): no guardar ahí
  secretos. La key de IA ya no lo hace.
