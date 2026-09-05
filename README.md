# Weë — World Enhanced Entity

> **La red social para la generación de la IA.**
> Una plataforma donde las personas descubren y usan herramientas de Inteligencia Artificial para crear, y comparten lo creado con comunidades que también crean con IA.

WEE combina en un solo ecosistema lo que hoy está disperso: **red social + herramientas de IA + creación de contenido + comunidades + descubrimiento**. La IA es el motor. La comunidad es el ecosistema. La red social es el tejido que conecta todo.

La visión completa del producto está en [`docs/VISION.md`](./docs/VISION.md). Este README describe **lo que existe hoy en el código** y cómo trabajar con él.

Una app, tres plataformas: **iOS, Android y Web** desde el mismo código (React Native + Expo).

---

## Estado actual vs. visión

El código actual nace de una versión anterior del producto (red social anónima). Muchas piezas de la visión ya existen como base; otras todavía no.

| Área de la visión | Hoy en el código | Estado |
|---|---|---|
| **Wave** (feed principal) | `HomeScreen` — feed paginado, categorías, votos acuerdo/desacuerdo, likes, reposts, follows | ✅ Base existente |
| **Weels** (videos cortos) | `ReelsScreen` — feed de video, descarga **con watermark** (`services/videoDownload.ts`) | ✅ Base existente (falta: renombrar, límite de 15 s, watermark de marca) |
| **Weetalk** (chat) | `InboxScreen` / `ConversationScreen` — mensajes, audio, temas de chat | ✅ Base existente |
| **Communities** | `CommunityScreen`, `CommunitiesManagementScreen`, `communityService` | ✅ Base existente |
| **Perfil doble (Real + WEE)** | `HidiCreationScreen` + `AiAvatarScreen` — perfil alterno con **avatar generado por IA** (Cloud Functions + Gemini) | ✅ Base existente (`Hidi` es el nombre interno heredado del perfil WEE) |
| **Credits** | `CreditStoreScreen`, `WalletScreen`, `creditsService` — packs y costos por función de IA | ✅ Base existente |
| Búsqueda, notificaciones push, landing web, páginas legales | `SearchScreen`, `NotificationsScreen`, `public/` | ✅ Existente |
| WeeBiz (perfiles y productos de negocios) | `WeeBiz*Screen`, `weeBizService` | ⚠️ Heredado; no está en la visión actual, a evaluar |
| **WEE Creator** (hub de apps de IA por categoría) | — | ❌ No existe aún |
| **Descubrimiento de IA** ("quiero hacer X" → herramientas recomendadas) | — | ❌ No existe aún |
| **WEE Influencer** (idea → guion → video → voz → subtítulos → thumbnail) | — | ❌ No existe aún |
| IA dentro de Weetalk, marketplace, contenido promocionado | — | ❌ No existe aún |

Regla para evaluar cualquier funcionalidad nueva (`docs/VISION.md`, §39):

> *¿Esto ayuda a una persona a crear, compartir, aprender, conectar o trabajar mejor con Inteligencia Artificial?*

---

## Stack

- **App:** Expo SDK 54 (managed) · React Native 0.81 · React 19 · TypeScript · React Navigation 7 · React Native Web
- **Backend:** Firebase — Authentication (anónimo, email/contraseña, Google), Firestore, Storage, Cloud Functions (Node 20)
- **IA:** Cloud Functions que llaman a **Gemini** (`gemini-3-pro-image-preview`) para generar el avatar del perfil WEE y reemplazar personas en fotos (`functions/src/`)
- **Media:** Cloudinary (transformaciones de imagen por URL), `react-native-compressor`, `expo-av`
- **Builds y actualizaciones:** EAS Build + `expo-updates` (actualizaciones OTA sin pasar por las tiendas)
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

Requisitos: Node 20+ y npm. Para móvil, además, cuenta en [expo.dev](https://expo.dev) y la CLI de EAS.

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

### Android / iOS — compilar una vez, iterar al instante

El development build es un "contenedor" con los módulos nativos. Se compila **una sola vez**; después el código JS llega al dispositivo por WiFi en segundos. Solo hay que recompilar si cambian dependencias nativas o `app.json`.

```bash
npm install -g eas-cli
eas login
eas build --profile development --platform android   # genera un APK instalable
npx expo start --dev-client                           # conecta el dispositivo por WiFi
```

Para iOS desde Windows no hay compilación local: se usa EAS Build en la nube y hace falta cuenta Apple Developer para instalar en un iPhone.

### Actualizar las apps publicadas sin pasar por las tiendas

```bash
eas update --branch production --message "descripción del cambio"
```

Envía el JS nuevo a iOS y Android a la vez. Solo los cambios nativos requieren un build nuevo y resubir a las tiendas.

> **Pendiente:** `app.json` y `eas.json` todavía apuntan a la cuenta de Expo y al Apple ID del desarrollador anterior (`owner`, `extra.eas.projectId`, `updates.url`, `submit.production.ios`). Hay que reapuntarlos a la cuenta actual antes del primer build.

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
├── screens/                 # Home (Wave), Reels (Weels), Inbox/Conversation (Weetalk), Community,
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

- [`docs/VISION.md`](./docs/VISION.md) — visión y principios del producto
- [`DEPLOY_WEB.md`](./DEPLOY_WEB.md) — despliegue web (Vercel / Firebase Hosting)
- [`VERCEL_ENV_SETUP.md`](./VERCEL_ENV_SETUP.md) — variables de entorno en Vercel
- [`GOOGLE_SIGNIN_SETUP.md`](./GOOGLE_SIGNIN_SETUP.md) · [`GOOGLE_SETUP.md`](./GOOGLE_SETUP.md) — Google Sign-In
- [`FIREBASE_STORAGE_SETUP.md`](./FIREBASE_STORAGE_SETUP.md) · [`FIREBASE_STORAGE_RULES.md`](./FIREBASE_STORAGE_RULES.md) — Storage
- [`LIKES_AND_FOLLOWS_GUIDE.md`](./LIKES_AND_FOLLOWS_GUIDE.md) — modelo de likes y follows

---

## Problemas conocidos

- `screens/WebLandingScreen.tsx` llama a `postsService.getPostsPaginated(null, 20)`, que no existe; el método real es `getPublicPostsPaginated(limitCount, lastDoc)`. Por eso el feed de la landing web aparece vacío.
- `firestore.rules` compila con advertencias (funciones sin usar, variables que sombrean `request`).
- Varios paquetes de Expo están por debajo de la versión esperada por el SDK 54 (`npx expo install --fix`).

---

## Licencia

Repositorio privado. Todos los derechos reservados hasta que se defina una licencia.

## Autor

[@geovetlf](https://github.com/geovetlf)
