# Probar HabitLook en dispositivos reales

Guía práctica para instalar la app en tu teléfono y compartirla con amigos
antes de un lanzamiento público. Asume que ya hiciste `git pull` y `pnpm install`.

---

## Android — APK

### Opción A: APK de depuración (la más rápida, ideal para probar tú)

1. Conecta tu teléfono por USB con la **depuración USB** activada
   (Ajustes → Opciones de desarrollador → Depuración USB).
2. En la raíz del proyecto (Windows):
   ```bat
   pnpm start
   ```
   y en otra terminal:
   ```bat
   pnpm android
   ```
   Esto compila e instala directo en el teléfono.

   Si prefieres el archivo APK para instalarlo manualmente:
   ```bat
   cd android
   gradlew.bat assembleDebug
   ```
   El APK queda en:
   ```
   android\app\build\outputs\apk\debug\app-debug.apk
   ```
3. Pásalo al teléfono por WhatsApp, Drive, correo o USB, ábrelo y toca
   **Instalar** (acepta "instalar apps desconocidas" si lo pide).

> El APK debug sirve perfecto para pruebas, pero **no** se puede subir a
> Google Play.

### Opción B: APK release firmado (para compartir con amigos)

El APK release es más rápido y no necesita el servidor Metro.

1. Crea tu llave de firma (una sola vez). Con el JDK instalado:
   ```bat
   keytool -genkeypair -v -storetype PKCS12 ^
     -keystore habitlook-release.keystore -alias habitlook ^
     -keyalg RSA -keysize 2048 -validity 10000
   ```
   Guarda el archivo `.keystore` y **no lo subas al repo** ni lo pierdas:
   sin él no podrás actualizar la app después.

2. Crea el archivo `android/keystore.properties` (está en `.gitignore`):
   ```properties
   storeFile=../habitlook-release.keystore
   storePassword=TU_CLAVE_DEL_KEYSTORE
   keyAlias=habitlook
   keyPassword=TU_CLAVE_DE_LA_LLAVE
   ```

3. En `android/app/build.gradle`, dentro del bloque `android { ... }`,
   agrega antes de `buildTypes`:
   ```gradle
   signingConfigs {
       release {
           def props = new Properties()
           file("../keystore.properties").withInputStream { props.load(it) }
           storeFile file(props['storeFile'])
           storePassword props['storePassword']
           keyAlias props['keyAlias']
           keyPassword props['keyPassword']
       }
   }
   ```
   y en `buildTypes { release { ... } }` agrega:
   ```gradle
   signingConfig signingConfigs.release
   ```

4. Genera el APK:
   ```bat
   cd android
   gradlew.bat assembleRelease
   ```
   Queda en `android\app\build\outputs\apk\release\app-release.apk`.

5. Compártelo con tus amigos por cualquier medio; al instalarlo verán que
   viene de "origen desconocido" (normal fuera de Play Store).

> Para Google Play en el futuro se usa el **AAB** (`gradlew.bat bundleRelease`)
> en vez del APK.

### Requisitos en Windows

- **JDK 17** (ni 8 ni 21): `java -version` debe decir 17.
- Variable `ANDROID_HOME` apuntando al SDK
  (ej: `C:\Users\tu_usuario\AppData\Local\Android\Sdk`).
- `local.properties` dentro de `android/` con:
  ```properties
  sdk.dir=C\:\\Users\\tu_usuario\\AppData\\Local\\Android\\Sdk
  ```

---

## iPhone — probar con amigos

En iOS no existe "pasar un APK": Apple solo permite instalar por
**TestFlight** o por Xcode directo. El camino sano para probar con amigos
es TestFlight.

### Requisitos

- Una **Mac con Xcode** (no se puede compilar iOS en Windows).
- Cuenta de **Apple Developer Program** ($99 USD/año). Sin ella no hay
  TestFlight.

### Paso a paso con TestFlight (recomendado)

1. En la Mac:
   ```sh
   pnpm install
   cd ios && pod install && cd ..
   ```
2. Abre `ios/habitLook.xcworkspace` en Xcode (siempre el `.xcworkspace`).
3. Target **habitLook** → **Signing & Capabilities** → activa
   *Automatically manage signing* e inicia sesión con tu Apple ID de
   desarrollador.
4. Cambia el destino a **Any iOS Device (arm64)** y ve a
   **Product → Archive**. Al terminar se abre el Organizer.
5. **Distribute App → App Store Connect → Upload** y sigue el asistente.
6. Entra a [App Store Connect](https://appstoreconnect.apple.com) →
   **TestFlight**:
   - **Internal testing**: agrega a tu equipo (hasta 100 personas); la
     build está disponible casi de inmediato, sin revisión.
   - **External testing**: hasta 10.000 personas con solo su correo;
     Apple hace una revisión beta ligera (normalmente < 24 h).
7. Tus amigos instalan la app **TestFlight** desde el App Store, aceptan
   la invitación por correo y listo.

### Alternativa sin cuenta de pago: Xcode directo

Sirve para 1–2 iPhones, no para un grupo:

1. Conecta el iPhone a la Mac, selecciónalo como destino en Xcode y
   pulsa **Run** (▶).
2. Con cuenta gratuita el certificado dura **7 días** y hay límite de
   dispositivos; cada semana hay que reinstalar.

---

## Checklist antes de compartir

- [ ] `git pull` en la máquina donde compiles (el fix de Android ya está en `main`).
- [ ] La app abre, el reloj del día carga y se puede registrar un gasto.
- [ ] Probar en modo avión: todo debe funcionar (es 100% local).
- [ ] En Android release, revisar que las notificaciones lleguen con la app cerrada.
- [ ] Pedir a tus amigos: modelo de teléfono, versión del sistema y capturas
      si algo falla.

---

*Dudas o errores de compilación: revisa el [README](../README.md) o abre un
issue en el repo.*
