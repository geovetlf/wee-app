# Weë — World Encode Entity

> **La red social para la generación de la IA.**
> Una plataforma donde las personas descubren y usan herramientas de Inteligencia Artificial para crear, y comparten lo creado con comunidades que también crean con IA.

WEE combina en un solo ecosistema lo que hoy está disperso: **red social + herramientas de IA + creación de contenido + comunidades + descubrimiento**. La IA es el motor. La comunidad es el ecosistema. La red social es el tejido que conecta todo.

Las instrucciones definitivas de producto y UX están en [`docs/UX.md`](./docs/UX.md); la visión original, en [`docs/VISION.md`](./docs/VISION.md). Este README describe **lo que existe hoy en el código** y cómo trabajar con él.

Una app, tres plataformas: **iOS, Android y Web** desde el mismo código (React Native + Expo).

---

## Estado actual vs. visión

El código actual nace de una versión anterior del producto (red social anónima). Muchas piezas de la visión ya existen como base; otras todavía no.

| Área de la visión | Hoy en el código | Estado |
|---|---|---|
| **Home** (feed + comunidades + Weëls) | `LandingScreen` (nativo) / `WebLandingScreen` (web) — banner "Tu creatividad no tiene límites", "Explora comunidades" (8 categorías sociales), fila de Weëls, pestaña **Comunidad** con filtros (Publicaciones · Imágenes · Videos · Preguntas · Tutoriales) | ✅ Implementado según `docs/UX.md` |
| **Menú ☰ único** | `DrawerMenu` — Perfil Real / Perfil WEE, Comunidades, Weëls, WeeTalk, **WEE Creator** (con categorías), Credits, Notificaciones, Guardados, Configuración, Ayuda | ✅ Implementado |
| **Botón "+" → Crear** | `CreateSheet` — Publicación, Weël, Imagen, Video, Texto, Pregunta + acceso a WEE Creator; `CreateScreen` recibe `kind` | ✅ Implementado |
| **"Cómo lo hice"** (herramientas, prompt, proceso) | `CreateScreen` → `Post.aiTools / aiPrompt / aiProcess` → `HowIMadeIt` dentro de `PostCard` (prompt copiable) | ✅ Implementado |
| **Credits siempre visibles** | `CreditsPill` en `Header` (`hooks/useWallet.ts`) → `CreditStoreScreen` / `WalletScreen` / `creditsService` | ✅ Implementado |
| **WEE Creator** (10 experiencias: WEE Design, Studio, Photo, Writer, Music, Beauty, Chef, Home, Business, Brain) | `WeeCreatorScreen` + `constants/weeExperiences.ts` — buscador por intención "¿Qué quieres crear?", ejemplos por experiencia, "Disponible hoy: Avatar IA"; el resto ofrece "Avísame cuando esté", que registra el interés en `creatorInterests` (`creatorInterestService`). Regla: "El usuario elige el resultado. WEE elige la IA." (`docs/CREATOR.md`) | ⚠️ Pantalla lista; WEE Brain e integraciones reales pendientes |
| **Descubrimiento de IA** ("quiero hacer X" → especialista recomendado) | buscador de `WeeCreatorScreen` (`matchExperiences`, por palabras clave; WEE Brain lo hará con un LLM) | ⚠️ Base |
| **Weëls** (videos cortos) | `ReelsScreen` — feed de video, descarga **con watermark** (`services/videoDownload.ts`); el compositor limita un Weël a **15 s** y lo marca con `Post.isWeel` | ✅ Base existente (falta: watermark de marca WEE al compartir) |
| **Guardados** (🔖) | `bookmarksService` (`users/{uid}/bookmarks`), `hooks/useBookmarks.ts`, botón en `PostCard`, `SavedPostsScreen` desde el menú ☰ | ✅ Implementado |
| **WeeTalk** (chat) | `InboxScreen` / `ConversationScreen` — mensajes, audio, temas de chat | ✅ Base existente |
| **Comunidades** (WEE Filmmakers, WEE Influencers, WEE Designers…) | `CommunityScreen`, `CommunitiesManagementScreen`, `communityService`, `constants/communityCategories.ts` | ✅ Base existente; son comunidades, nunca secciones |
| **Perfil doble (Real + WEE)** | `HidiCreationScreen` + `AiAvatarScreen` — perfil alterno con **avatar generado por IA** (Cloud Functions + Gemini) | ✅ Base existente (`Hidi` es el nombre interno heredado del perfil WEE) |
| Feed heredado, búsqueda, notificaciones push, páginas legales | `HomeScreen`, `SearchScreen`, `NotificationsScreen`, `public/` | ✅ Existente |
| WeeBiz (perfiles y productos de negocios) | `WeeBiz*Screen`, `weeBizService` | ⚠️ Heredado; no está en la visión actual, a evaluar |
| Flujo Influencer (idea → guion → video → voz → subtítulos → thumbnail) | — (será un flujo dentro de WEE Creator; "WEE Influencers" es una comunidad) | ❌ No existe aún |
| Trending, IA dentro de WeeTalk, marketplace, contenido promocionado | — | ❌ No existe aún |

Regla para evaluar cualquier funcionalidad nueva (`docs/VISION.md`, §39):

> *¿Esto ayuda a una persona a crear, compartir, aprender, conectar o trabajar mejor con Inteligencia Artificial?*

---

## Stack

- **App:** Expo SDK 54 (managed) · React Native 0.81 · React 19 · TypeScript · React Navigation 7 · React Native Web
- **Backend:** Firebase — Authentication (anónimo, email/contraseña, Google), Firestore, Storage, Cloud Functions (Node 20)
- **IA:** Cloud Functions que llaman a **Gemini** (`gemini-3-pro-image-preview`) para generar el avatar del perfil WEE y reemplazar personas en fotos (`functions/src/`)
- **Media:** Cloudinary (transformaciones de imagen por URL), `react-native-compressor`, `expo-av`
- **Builds:** Gradle local para Android (sin cuenta de Expo, sin EAS, sin Android Studio). `expo-updates` está desactivado en `app.json`; EAS y las actualizaciones OTA quedan como opción futura
- **Web:** Metro bundler; landing y páginas legales estáticas en `public/` (Firebase Hosting / Vercel)

> **Expo Go no funciona con este proyecto.** Usa módulos nativos (`@react-native-google-signin`, `expo-notifications`, `expo-media-library`, `react-native-compressor`, `expo-updates`). Para móvil se necesita un **development build** (ver más abajo).

---

## Entornos de Firebase

Hay **dos proyectos** de Firebase. Nunca desarrolles contra producción.

| Alias | Proyecto | Uso |
|---|---|---|
| `dev` (y `default`) | `wee-dev-geovet` | Desarrollo. Base limpia. |
| `prod` | `get-wee` | **Producción.** App publicada, usuarios reales. |

Los alias viven en `.firebaserc`. Como `default` apunta a dev, cualquier `firebase deploy` sin `--project` cae en dev. Producción hay que pedirla explícitamente:

```bash
firebase deploy --only firestore --project prod
```

Cada entorno tiene sus propios archivos de configuración de cliente:

| Archivo | Qué es | Generar con |
|---|---|---|
| `.env` | Claves web (`EXPO_PUBLIC_FIREBASE_*`) | `firebase apps:sdkconfig WEB <appId> --project <alias>` |
| `google-services.json` | Config Android | `firebase apps:sdkconfig ANDROID <appId> --out google-services.json --project <alias>` |
| `GoogleService-Info.plist` | Config iOS | `firebase apps:sdkconfig IOS <appId> --out GoogleService-Info.plist --project <alias>` |

`app.config.js` permite apuntar los archivos nativos a otra ruta con las variables `GOOGLE_SERVICES_JSON` y `GOOGLE_SERVICES_PLIST` (útil en EAS Build).

En un proyecto de Firebase nuevo hay que activar en la consola: **Authentication** (Anónimo, Email/Contraseña, Google), **Firestore** y **Storage** (los proyectos nuevos requieren plan Blaze para Storage). Reglas e índices se despliegan desde el repo:

```bash
firebase deploy --only firestore,storage
```

---

## Puesta en marcha

Requisitos: Node 20+ y npm. Para Android, además, JDK 17 y el Android SDK (ver más abajo). No hace falta cuenta de Expo.

```bash
git clone https://github.com/geovetlf/wee-app.git
cd wee-app
npm install
cp .env.example .env        # completar con las claves del proyecto dev
```

### Web (el ciclo más rápido)

```bash
npx expo start --web
```

Abre `http://localhost:8081`. Cada cambio se recarga solo.

### Android — compilar una vez, iterar al instante (sin cuenta de Expo)

En la PC: **JDK 17** y el **Android SDK** (bastan las *command-line tools*; no hace falta Android Studio) con `ANDROID_HOME` apuntando a él y `platform-tools` en el PATH. En el celular: *Opciones de desarrollador → Depuración USB* (en Xiaomi/HyperOS, además *Instalar vía USB* y *Depuración USB (ajustes de seguridad)*).

El development build es un "contenedor" con los módulos nativos. Se compila **una sola vez**; después el código JS llega al celular en segundos. Solo hay que recompilar si cambian dependencias nativas o `app.json`.

```bash
npx expo prebuild --platform android --no-install   # genera android/ (ignorada por git, regenerable)
npm run android:build                                # APK debug, solo arm64-v8a
npm run android:install                              # instala por USB (adb install -r)
adb reverse tcp:8081 tcp:8081                        # Metro llega al celular por el cable, sin WiFi
npx expo start --dev-client                          # Metro para celular y web
```

Luego abrí la app en el celular y elegí `http://localhost:8081`, o lanzala ya conectada:

```bash
adb shell am start -a android.intent.action.VIEW -d "wee://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081"
```

La primera compilación es larga (descarga Gradle, dependencias y el NDK; ~45 min si se compilan las 4 arquitecturas). `android:build` compila solo `arm64-v8a`, así que las siguientes tardan mucho menos.

### iOS

Desde Windows no hay compilación local: hace falta una Mac con Xcode, o un servicio en la nube con Macs (EAS Build, Codemagic, GitHub Actions), y una cuenta Apple Developer para instalar en un iPhone. Pendiente de decidir.

### EAS y actualizaciones OTA (opcional, no configurado)

`expo-updates` está **desactivado** (`app.json` → `updates.enabled: false`): `app.json` y `eas.json` todavía referencian la cuenta de Expo y el Apple ID del desarrollador anterior (`owner`, `extra.eas.projectId`, `submit.production.ios`). Si algún día se usa EAS, hay que reapuntar esos campos a la cuenta actual antes del primer build.

---

## Scripts

```bash
npm start                          # Expo (menú interactivo)
npm run web                        # solo web
npm run android                    # build local Android (requiere Android Studio)
npm run ios                        # build local iOS (requiere macOS)
npx expo export --platform web     # build estático de web
```

---

## Estructura del proyecto

```
wee-app/
├── App.tsx                  # Raíz: providers, navegación, splash
├── app.json / app.config.js # Config Expo (bundle zone.wee.app, plugins, deep links wee.zone)
├── eas.json                 # Perfiles de build: development / preview / production
├── firebase.json            # Firestore, Storage, Functions, Hosting
├── firestore.rules / firestore.indexes.json / storage.rules
├── components/              # UI reutilizable (PostCard, Header, Sidebar, MessageBubble, avatars/…)
├── config/                  # firebase.ts (inicialización), linking.ts (deep links)
├── constants/               # design.ts (tokens), chatThemes.ts, weebizCategories.ts
├── contexts/                # Auth, UserProfile, Theme, PushNotification, TabBar, Scroll
├── hooks/                   # useCommunities, useFollow, useLikes, useReposts, useVote, useResponsive…
├── navigation/              # Auth / Main / Home / Inbox / Profile stacks + TabNavigator
├── screens/                 # Landing/Home, WeeCreator, Reels (Weëls), Inbox/Conversation (WeeTalk), Community,
│                            # HidiCreation + AiAvatar (perfil WEE), CreditStore/Wallet, WeeBiz*, Search…
├── services/                # firestoreService, messagesService, communityService, creditsService,
│                            # avatarGenerationService, storageService, cloudinaryService, videoDownload…
├── functions/src/           # Cloud Functions: generateAvatar.ts, vertexAI.ts (Gemini)
├── public/                  # Landing, app.html, privacy-policy, terms, support (hosting)
├── legal/                   # Textos legales
└── docs/VISION.md           # Visión del producto
```

---

## Documentación adicional

- [`docs/UX.md`](./docs/UX.md) — **instrucciones definitivas** de producto, estructura y UX (prevalecen)
- [`docs/VISION.md`](./docs/VISION.md) — visión y principios del producto
- [`DEPLOY_WEB.md`](./DEPLOY_WEB.md) — despliegue web (Vercel / Firebase Hosting)
- [`VERCEL_ENV_SETUP.md`](./VERCEL_ENV_SETUP.md) — variables de entorno en Vercel
- [`GOOGLE_SIGNIN_SETUP.md`](./GOOGLE_SIGNIN_SETUP.md) · [`GOOGLE_SETUP.md`](./GOOGLE_SETUP.md) — Google Sign-In
- [`FIREBASE_STORAGE_SETUP.md`](./FIREBASE_STORAGE_SETUP.md) · [`FIREBASE_STORAGE_RULES.md`](./FIREBASE_STORAGE_RULES.md) — Storage
- [`LIKES_AND_FOLLOWS_GUIDE.md`](./LIKES_AND_FOLLOWS_GUIDE.md) — modelo de likes y follows

---

## Problemas conocidos

- En web, `PushNotificationProvider` lanza `Notifications.removeNotificationSubscription is not a function` (lo atrapa el ErrorBoundary; no afecta el uso).
- Con sesión cerrada, la landing lee `communities` y Firestore responde `permission-denied` (en dev aparece un diálogo "Error detectado").
- `firestore.rules` compila con advertencias (funciones sin usar, variables que sombrean `request`).
- Varios paquetes de Expo están por debajo de la versión esperada por el SDK 54 (`npx expo install --fix`).

---

## Licencia

Repositorio privado. Todos los derechos reservados hasta que se defina una licencia.

## Autor

[@geovetlf](https://github.com/geovetlf)
