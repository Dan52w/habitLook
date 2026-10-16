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

## IA vía backend propio (implementado el 2026-10-16)

Arquitectura: app → `habitlook-backend` (Render) → Groq. La API key de
Groq **nunca** sale del servidor ni llega al teléfono.

- [x] Backend `Dan52w/habitlook-backend`: Express+TS, `POST /api/chat`,
      `GET /health`, `render.yaml` para despliegue
- [x] `GROQ_API_KEY` solo como variable de entorno en Render
- [x] Auth app → backend: header `x-app-key` (comparación en tiempo
      constante); secreto embebido en la app con `pnpm backend:secrets`
      (archivo ignorado por git)
- [x] Rate limit 40 req / 15 min por IP; validación de entrada
      (30 mensajes, 8000 chars/mensaje, 30000 total, JSON 100kb)
- [x] Helmet + `trust proxy`; errores genéricos sin filtrar nada
- [x] App: `BackendProvider` (solo HTTPS, timeout 60 s); sin UI de
      keys — funciona sin pedir nada al usuario
- [x] Mensajes de error amables para usuarios normales
- [x] Prompt anti-inyección (`<datos_usuario>` no confiable) y envío
      solo de contexto seleccionado, mensaje a mensaje
- [ ] **Riesgo conocido**: el `APP_KEY` embebido puede extraerse del
      APK; el daño se limita con rate limit + rotación (la key de Groq
      sigue a salvo). A futuro: límites por dispositivo.
- [ ] **Vigilar**: Groq retira modelos; si la IA falla, actualizar
      `MODEL` en el backend (`src/groq.ts`)
- [ ] **Pendiente del usuario**: crear el repo `habitlook-backend` en
      GitHub (el conector no tiene permiso), subir el código y
      desplegar el Blueprint en Render con `GROQ_API_KEY` y `APP_API_KEY`

## Lista para conectar IA (histórico: key directa en app, descartado)

Se evaluó y descartó llamar a Groq directo desde la app: la key
quedaba expuesta en el APK. La arquitectura con backend lo resuelve.

## Notas

- Las notificaciones muestran nombres de actividades/metas en la
  pantalla de bloqueo: es el comportamiento esperado de recordatorios;
  el usuario puede ocultarlo en ajustes del sistema por canal.
- `settings` viaja en los respaldos JSON (texto plano): no guardar ahí
  secretos. La key de IA ya no lo hace.
