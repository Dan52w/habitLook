# HabitLook

**HabitLook** es una app móvil *local-first* para gestionar tu vida diaria en un solo lugar: **hábitos y metas**, **rutinas y bloques de tiempo**, **notas** y **contabilidad personal**. Funciona 100% en tu dispositivo: sin cuenta, sin internet obligatorio y con la base de datos cifrada.

En el futuro integrará modelos de IA que ayuden a mejorar los hábitos de quien la use, siempre con consentimiento explícito y procesamiento local primero.

---

## ✨ Características

### 🕐 Inicio — Tu día en un reloj
- Reloj circular de la jornada con segmentos de actividad por categoría.
- Los huecos sin planear se marcan automáticamente como tiempo **Libre**.
- Tarjeta de estado actual: qué estás haciendo ahora y qué sigue.
- Mini-calendario para navegar entre días.
- **Planificador**: crea bloques de tiempo por categoría, con hora de inicio/fin, días recurrentes o fecha única.
- **Metas (hábitos)**: diarias o semanales, de tipo duración, conteo o sí/no, con registro de avance y barra de progreso.
- **Recordatorios**: notificaciones antes de cada actividad (configurable: 5 min a 1 hora), con acciones *Iniciar* y *Posponer 10 min* desde la propia notificación.

### 💰 Contabilidad
- Múltiples cuentas: bancos, efectivo y otras, cada una con su saldo calculado en tiempo real.
- Registro de **ingresos y gastos**, con categorías (8 precargadas: Comida, Transporte, Salud, Hogar, Ocio, Educación, Compras, Otros) y notas.
- **Gastos divididos**: paga un gasto entre varias cuentas.
- **Transferencias** entre cuentas con validación de saldo.
- Resumen semanal/mensual, historial filtrable y edición de movimientos.
- Las cuentas con movimientos no se eliminan: se **archivan** para no romper el historial.

### 📝 Notas
- Notas rápidas con búsqueda y filtro por categoría.
- Asociables a categorías y bloques de tiempo.

### 👤 Perfil
- Modo claro / oscuro.
- Ajustes de recordatorios y verificación de permisos (notificaciones, alarmas exactas, batería).
- **Respaldo local**: exporta tus datos a un JSON portable e impórtalos después (fusionar o reemplazar).
- Bóveda local cifrada: indicador de estado.

---

## 🔒 Privacidad

- Todos los datos viven en el teléfono, en una base **SQLite cifrada con SQLCipher**.
- La llave de cifrado (256 bits) se genera una vez y se guarda en el **Keychain (iOS)** / **Keystore (Android)**, nunca en la base de datos.
- No hay cuentas, analíticas ni envío de datos a servidores.

---

## 🛠️ Stack

| Capa | Tecnología |
|---|---|
| App | React Native 0.87 (CLI) + React 19 + TypeScript |
| Navegación | React Navigation 7 (bottom tabs) |
| Base de datos | op-sqlite con SQLCipher |
| Notificaciones | Notifee (triggers, acciones, alarmas exactas) |
| Archivos/Respaldo | react-native-fs, react-native-share, documents/picker |
| UI | react-native-svg, safe-area-context, theme claro/oscuro propio |
| Tests | Jest (24 tests: utilidades + repositorios) |
| Paquetes | **pnpm** (lockfile `pnpm-lock.yaml`) |

---

## ✅ Requisitos

- **Node.js** ≥ 22.11
- **pnpm** 10 (`corepack enable` o [instalador oficial](https://pnpm.io/installation))
- Para Android: Android Studio + SDK + JDK 17
- Para iOS: macOS con **Xcode** (último estable) + CocoaPods (`sudo gem install cocoapods`)

---

## 🚀 Instalación

```sh
# 1. Clonar
git clone https://github.com/Dan52w/habitLook.git
cd habitLook

# 2. Instalar dependencias (usa pnpm, no npm)
pnpm install

# 3. Iniciar Metro
pnpm start
```

En otra terminal:

```sh
pnpm android   # compila e instala en emulador/dispositivo Android
pnpm ios       # compila e instala en simulador iOS (solo macOS)
```

> La primera vez en iOS, instala los pods: `cd ios && pod install && cd ..`
> (el CLI de React Native ya lo hace automáticamente con `pnpm ios`).

---

## 📜 Scripts

| Comando | Qué hace |
|---|---|
| `pnpm start` | Inicia el servidor Metro |
| `pnpm android` | Ejecuta en Android |
| `pnpm ios` | Ejecuta en simulador iOS |
| `pnpm test` | Corre los tests con Jest |
| `pnpm lint` | Revisa el código con ESLint |
| `pnpm typecheck` | Verificación de tipos con `tsc --noEmit` |

---

## 📁 Estructura del proyecto

```
habitLook/
├── App.tsx / index.js          # Entrada (registra notificaciones en 2.º plano)
├── app.json                    # Nombre y displayName
├── src/
│   ├── app/
│   │   ├── App.tsx             # Bootstrap: BD, permisos, tema, diálogos
│   │   └── navigation/
│   │       └── RootTabs.tsx    # 4 pestañas: Inicio, Contabilidad, Notas, Perfil
│   ├── db/
│   │   ├── client.ts           # Apertura de BD cifrada + seeds iniciales
│   │   ├── key.ts              # Llave de 256 bits en Keychain/Keystore
│   │   ├── migrations/         # Migraciones versionadas 001 → 009
│   │   └── repositories/       # Acceso a datos por dominio:
│   │       # accounts, expenseCategories, expenses, transfers,
│   │       # categories, timeBlocks, goals, notes, settings
│   ├── features/
│   │   ├── clock/              # Reloj del día, planificador, timeline
│   │   ├── goals/              # Metas/hábitos: composer + progreso
│   │   ├── accounting/         # Cuentas, movimientos, transferencias, historial
│   │   ├── notes/              # Notas
│   │   └── profile/            # Ajustes, permisos, respaldo, tema
│   ├── services/
│   │   ├── notifications.ts    # Permisos, programación y acciones de avisos
│   │   ├── backup.ts           # Exportar/importar JSON
│   │   └── todayWidget.ts      # Datos para el widget de hoy
│   └── shared/
│       ├── components/         # AppModal, AppDialog, HabitLookLogo, iconos
│       ├── context/            # DialogContext (alertas/confirmaciones propias)
│       ├── theme/              # ThemeProvider claro/oscuro
│       └── utils/              # date.ts (fechas locales), etc.
├── __tests__/                  # Tests de utilidades y repositorios
├── android/                    # Proyecto nativo Android
└── ios/                        # Proyecto nativo iOS (bundle: com.akmonstudios.habitlook)
```

---

## 🗄️ Base de datos

- **Motor**: SQLite cifrado (SQLCipher vía `@op-engineering/op-sqlite`).
- **Archivo**: `habitlook.db` en el almacenamiento privado de la app.
- **Migraciones**: versionadas en `src/db/migrations/index.ts` (`001_init` → `009_expense_category_seeds`). Se aplican automáticamente al abrir la app, dentro de transacciones, y quedan registradas en la tabla `_migrations`.
- **Tablas principales**: `categories`, `time_blocks` (+ `time_block_exceptions`, `time_block_status`), `goals` + `goal_progress`, `notes`, `accounts`, `expense_categories`, `expenses` + `expense_splits`, `transfers`, `settings`.
- **Seeds iniciales**: categorías *Estudio* y *Ejercicio*, cuenta *Efectivo* y 8 categorías de gasto.

Para agregar un cambio de esquema: crea la migración `010_...` en el arreglo `MIGRATIONS` (nunca edites una migración ya publicada) y prueba con `pnpm test`.

---

## 📲 Exportar a iOS (iPhone)

El proyecto iOS ya está configurado y listo para compilar. Pasos para llevarlo a un iPhone real o a TestFlight.

### 1. Preparar el entorno (solo macOS)
1. Instala **Xcode** desde la App Store y ábrelo una vez para aceptar la licencia.
2. Instala CocoaPods: `sudo gem install cocoapods`.
3. En la raíz del proyecto:
   ```sh
   pnpm install
   cd ios && pod install && cd ..
   ```

### 2. Configuración ya aplicada
- **Bundle Identifier**: `com.akmonstudios.habitlook`
- **Display Name**: `HabitLook`
- **Región**: español (`CFBundleDevelopmentRegion = es`)
- Versión inicial `1.0` (build `1`)

### 3. Firmar la app
1. Abre `ios/habitLook.xcworkspace` en Xcode (⚠️ siempre el `.xcworkspace`, no el `.xcodeproj`).
2. Selecciona el target **habitLook** → pestaña **Signing & Capabilities**.
3. Marca **Automatically manage signing** e inicia sesión con tu Apple ID (o el del equipo).
4. Xcode generará el provisioning profile automáticamente.

### 4. Probar en tu iPhone
1. Conecta el iPhone por cable y selecciónalo como destino en Xcode.
2. Pulsa **Run** (▶). Acepta el permiso de notificaciones cuando la app lo pida.

### 5. Publicar en TestFlight / App Store
1. En Xcode: **Product → Archive**. Cuando termine, se abre el Organizer.
2. **Distribute App → App Store Connect** y sigue el asistente (requiere cuenta de Apple Developer, $99 USD/año).
3. En [App Store Connect](https://appstoreconnect.apple.com) crea la app con el bundle `com.akmonstudios.habitlook`, sube capturas y envíala a revisión.

### Pendientes manuales (una sola vez)
- **Icono de la app**: agrega los tamaños del icono en `ios/habitLook/Images.xcassets/AppIcon.appiconset/` (Xcode → Assets → AppIcon, arrastra un PNG de 1024×1024 y Xcode genera el resto).
- **Pantalla de lanzamiento**: personaliza `LaunchScreen.storyboard` si quieres algo distinto al fondo por defecto.

> Nota: SQLCipher ya viene activado (`"op-sqlite": { "sqlcipher": true }` en `package.json`), así que la base de datos queda cifrada también en iOS sin pasos extra.

---

## 🤖 Android

```sh
pnpm android
```

Para un APK/AAB de release: `cd android && ./gradlew bundleRelease`. Necesitas configurar tu keystore de firma en `android/gradle.properties` (no incluido en el repo).

---

## 📱 Probar en dispositivos reales

Guía paso a paso para instalar la app en tu teléfono y compartirla con amigos
antes del lanzamiento: [docs/probar-en-dispositivos.md](docs/probar-en-dispositivos.md)
(APK debug/release en Windows, TestFlight en iPhone, checklist previo).

---

## 🧭 Roadmap

- [ ] **Asistentes de IA**: análisis de hábitos y sugerencias personalizadas (con consentimiento explícito).
- [ ] Respaldo cifrado en la nube.
- [ ] Tiempo de pantalla (UsageStats / Screen Time) como fuente de datos local.
- [ ] Widget de "hoy" en la pantalla de inicio.
- [ ] Rachas (streaks) y estadísticas semanales de hábitos.

---

## 🧪 Calidad

```sh
pnpm typecheck   # TypeScript sin errores
pnpm lint        # ESLint sin errores
pnpm test        # 24 tests en verde
```

---

## 📄 Licencia

Proyecto privado de **Akmon Studios**. Todos los derechos reservados.

---

*Hecho con React Native, pnpm y SQLite cifrado. Tus datos son tuyos.*
