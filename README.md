# Weë — World Encode Entity

> **La red social para la generación de la IA.**
> Una plataforma donde las personas descubren y usan herramientas de Inteligencia Artificial para crear, y comparten lo creado con comunidades que también crean con IA.

Weë combina en un solo ecosistema lo que hoy está disperso: **red social + herramientas de IA + creación de contenido + comunidades + descubrimiento**. La IA es el motor. La comunidad es el ecosistema. La red social es el tejido que conecta todo.

Las instrucciones definitivas de producto y UX están en [`docs/UX.md`](./docs/UX.md); la visión original, en [`docs/VISION.md`](./docs/VISION.md). Este README describe **lo que existe hoy en el código** y cómo trabajar con él.

Una app, tres plataformas: **iOS, Android y Web** desde el mismo código (React Native + Expo).

---

## Estado actual vs. visión

El código actual nace de una versión anterior del producto (red social anónima). Muchas piezas de la visión ya existen como base; otras todavía no.

| Área de la visión | Hoy en el código | Estado |
|---|---|---|
| **Home** (feed + comunidades + Weëls) | `LandingScreen` (nativo) / `WebLandingScreen` (web) — banner "Tu creatividad no tiene límites", "Explora comunidades" (8 categorías sociales), fila de Weëls, pestaña **Comunidad** con filtros (Publicaciones · Imágenes · Videos · Preguntas · Tutoriales) | ✅ Implementado según `docs/UX.md` |
| **Home (solo lo esencial)** | `WebLandingScreen` (web) y `LandingScreen` (nativo): `HeroCarousel` (4 banners de diseño en `assets/images/hero/`), `CommunitiesEntry` (buscar o crear comunidad, sin catálogo), `WeelsRow`, feed "Creado por la comunidad" con `utils/feedFilters.ts` | ✅ Rediseñado 2026-09-06 |
| **Menú ☰ único** | `DrawerMenu` — Perfil Real / Perfil Weë, Comunidades, Weëls, WeeTalk, **WEË AI** (con categorías), Credits, Notificaciones, Guardados, Configuración, Ayuda | ✅ Implementado |
| **Botón "+" → Crear** | `CreateSheet` — Publicación, Weël, Imagen, Video, Texto, Pregunta + acceso a WEË AI; `CreateScreen` recibe `kind` | ✅ Implementado |
| **"Cómo lo hice"** (herramientas, prompt, proceso) | `CreateScreen` → `Post.aiTools / aiPrompt / aiProcess` → `HowIMadeIt` dentro de `PostCard` (prompt copiable) | ✅ Implementado |
| **Credits siempre visibles** | `CreditsPill` en `Header` (`hooks/useWallet.ts`) → `CreditStoreScreen` / `WalletScreen` / `creditsService`; el saldo y el historial los mueve solo el **Credit Engine** (`functions/src/credits`, [`docs/CREDITS.md`](docs/CREDITS.md)) | ✅ Implementado |
| **WEË AI** (11 experiencias: Weë Design, Studio, Photo, Writer, Music, Beauty, Chef, Home, Business, Travel, Brain) | `WeeCreatorScreen` + `constants/weeExperiences.ts` — buscador por intención "¿Qué quieres crear?", ejemplos por experiencia; cada especialista con su pantalla (`constants/specialists.ts`). Regla: "El usuario elige el resultado. Weë elige la IA." (`docs/CREATOR.md`) | ✅ 10 secciones conectadas a IA real por el WEË AI ENGINE (Gemini, Seedance, ElevenLabs; modo demo sin claves), Weë Brain como asistente con búsqueda y contexto (`brainChat`), fotos por Storage, Credits por el Credit Engine (precios placeholder), **Mis proyectos** y **Mis documentos** en Firestore. ⚠️ Weë Music intacta en modo demo; Weë Business sin publicar en redes (sin APIs sociales) |
| **Descubrimiento de IA** ("quiero hacer X" → especialista recomendado) | buscador de `WeeCreatorScreen` (`matchExperiences`, por palabras clave; Weë Brain lo hará con un LLM) | ⚠️ Base |
| **Weëls** (videos cortos) | `ReelsScreen` — feed de video, descarga **con watermark** (`services/videoDownload.ts`); el compositor limita un Weël a **15 s** y lo marca con `Post.isWeel` | ✅ Base existente (falta: watermark de marca Weë al compartir) |
| **Guardados** (🔖) | `bookmarksService` (`users/{uid}/bookmarks`), `hooks/useBookmarks.ts`, botón en `PostCard`, `SavedPostsScreen` desde el menú ☰ | ✅ Implementado |
| **WeeTalk** (chat) | `InboxScreen` / `ConversationScreen` — mensajes, audio, temas de chat | ✅ Base existente |
| **Comunidades** (Weë Filmmakers, Weë Influencers, Weë Designers…) | `CommunityScreen`, `CommunitiesManagementScreen`, `communityService`, `constants/communityCategories.ts` | ✅ Base existente; son comunidades, nunca secciones |
| **Perfil doble (Real + Weë)** | `WeeProfileCreationScreen` + `AiAvatarScreen` — perfil alterno con **avatar generado por IA** (Cloud Functions + Gemini) | ✅ Base existente (el uid guardado sigue llevando el prefijo heredado `hidi_`) |
| Feed heredado, búsqueda, notificaciones push, páginas legales | `HomeScreen`, `SearchScreen`, `NotificationsScreen`, `public/` | ✅ Existente |
| Weë Business (negocios, catálogo y reseñas) | `WeeBiz*Screen`, `weeBizService`, `businesses/{businessId}` | ✅ Producto vivo. La *identidad* Perfil Biz (`users/biz_*`) se eliminó el 2026-09-19: un negocio será una Página, no una cara |
| Flujo Influencer (idea → guion → video → voz → subtítulos → thumbnail) | — (será un flujo dentro de WEË AI; "Weë Influencers" es una comunidad) | ❌ No existe aún |
| Trending, IA dentro de WeeTalk, marketplace, contenido promocionado | — | ❌ No existe aún |

Regla para evaluar cualquier funcionalidad nueva (`docs/VISION.md`, §39):

> *¿Esto ayuda a una persona a crear, compartir, aprender, conectar o trabajar mejor con Inteligencia Artificial?*

---

## Stack

- **App:** Expo SDK 54 (managed) · React Native 0.81 · React 19 · TypeScript · React Navigation 7 · React Native Web
- **Backend:** Firebase — Authentication (anónimo, email/contraseña, Google), Firestore, Storage, Cloud Functions (Node 20)
- **IA:** Cloud Functions que llaman a **Gemini** (`gemini-3-pro-image-preview`) para generar el avatar del perfil Weë y reemplazar personas en fotos (`functions/src/`)
- **Media:** Cloudinary (transformaciones de imagen por URL), `react-native-compressor`, `expo-av`
- **Builds:** Gradle local para Android (sin cuenta de Expo, sin EAS, sin Android Studio). `expo-updates` está desactivado en `app.json`; EAS y las actualizaciones OTA quedan como opción futura
- **Web:** Metro bundler; landing y páginas legales estáticas en `public/` (Firebase Hosting / Vercel)

> **Expo Go no funciona con este proyecto.** Usa módulos nativos (`@react-native-google-signin`, `expo-notifications`, `expo-media-library`, `react-native-compressor`, `expo-updates`). Para móvil se necesita un **development build** (ver más abajo).

---

## Entornos de Firebase

Hay **un solo proyecto real**: `get-wee` (alias `default` y `prod` en `.firebaserc`). Es producción: la app publicada, con usuarios reales. Desde el 2026-09-13 no se separa dev/prod; `wee-dev-geovet` existe pero no se usa (el alias `dev` es un resto). Para trabajar en local se usan los emuladores con un proyecto `demo-*`, que no puede tocar nada real.

| Dónde | Proyecto | Uso |
|---|---|---|
| Producción | `get-wee` | La app publicada. Solo cambia por el despliegue ([`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)); Claude no despliega ([`docs/SECURITY.md`](docs/SECURITY.md)). |
| Local | `demo-wee` (emuladores) | Desarrollo y pruebas: Auth, Firestore, Functions y Storage emulados en 127.0.0.1, sin claves, todo en modo demo. |

```bash
npm run functions:emulator   # los cuatro emuladores con el proyecto demo-wee (Java 21+)
npm run web:demo             # la app web (http://localhost:8082) conectada a esos emuladores
```

Cuidado: `firebase deploy` sin `--project` cae en **producción**.

Archivos de configuración de cliente (apuntan a `get-wee`):

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
cp .env.example .env        # configuración web de Firebase (get-wee); para local sin tocarlo: npm run web:demo
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
│                            # WeeProfileCreation + AiAvatar (Perfil Weë), CreditStore/Wallet, WeeBiz*, Search…
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

## WEË AI ENGINE (multimodelo)

Weë no usa "una IA": orquesta muchas. Cada paso de WEË AI pasa por `functions/src/engine` — **WEË AI → Auth → Credit Engine → AI ROUTER → servicio (texto, búsqueda, visión, imagen, video, audio) → proveedor** — y la persona solo ve "✨ Crear con IA" / "Generando tu Weël…". El router elige modelo según calidad, velocidad, coste, disponibilidad y límites diarios, hace fallback automático dentro de cada modalidad (video: **solo la familia Seedance 2.5 / 2.0** de ByteDance, sin Kling, Runway, Veo ni otro modelo como respaldo; ver `docs/AI-ENGINE.md` → Weë Video Engine), registra cada generación en `aiGenerations` (requestId, servicio, proveedor, modelo, estado PENDING → PROCESSING → COMPLETED/FAILED, providerCost en USD separado de creditsCharged, tipos de entrada/salida) y se configura desde Firestore (`aiProviders`, `aiRouting`, `aiSettings`) sin tocar código. Proveedores de esta fase: **Gemini** (texto, búsqueda con Google, visión, imagen Nano Banana 2/Pro), **Seedance** (video: solo la familia Seedance 2.5 / 2.0 por la API oficial de BytePlus ModelArk) y **ElevenLabs** (voz); preparados además MiniMax (solo voz), FLUX, Seedream, Claude y OpenAI; música con hueco reservado (sin Suno mientras no haya API oficial con licencia). Sin clave, un proveedor no existe para el router y todo sigue en modo demo. Detalle en [`docs/AI-ENGINE.md`](docs/AI-ENGINE.md).

## Credit Engine

Los Credits los mueve únicamente el servidor: `Cliente → Firebase Auth → Cloud Functions → Credit Engine → Firestore`. El saldo vive en el perfil real (`users.creditsBalance`, `creditsLifetimeEarned`, `creditsLifetimeSpent`) y cada movimiento queda en `creditTransactions` (tipo, monto, saldo antes/después, concepto, estado `PENDING → AUTHORIZED → COMPLETED` o `FAILED → REFUNDED`). Reglas: nadie escribe esos campos desde la app (`firestore.rules`); los montos salen del catálogo del servidor (valores de prueba configurables en `functions/src/credits/creditCosts.ts` o `creditCosts/{servicio}`); transacciones atómicas sin saldo negativo; `requestId` determinista para que una operación repetida no cobre dos veces y un fallo de IA se reembolse una sola vez; la billetera anterior (`wallets`) se migra sola la primera vez. Pagos (Apple / Google / Stripe) preparados en `functions/src/payments` pero no conectados. Pruebas: `npm run test:engine`. Detalle en [`docs/CREDITS.md`](docs/CREDITS.md).

## WEË AI con IA real (10 secciones; Weë Music en una fase posterior)

Las interfaces de las 11 secciones no cambian: **la misma Weë, pero ahora funciona**. Weë Brain, Design, Photo, Studio, Business, Home, Beauty, Writer, Chef y Travel llaman a Cloud Functions (`functions/src/creator`: `creatorChat` / `creatorRun` para los especialistas, `brainChat` para Weë Brain), que pasan por Auth → Credit Engine → WEË AI ENGINE → proveedor. Cada sección usa los servicios que le corresponden: Brain (texto con contexto, búsqueda con fuentes, foto adjunta, derivación), Design (concepto + imágenes), Photo (visión + edición multimodal: mejorar, quitar objetos, fondo, restaurar, retoque, transformar, colorizar, crear), Studio (guion → video con Seedance → narración con ElevenLabs; animar una foto), Business (ideas, contenido, respuestas, análisis y documentos con Gemini; sin publicar en redes hasta tener sus APIs), Home (visión + rediseño del espacio + lista de compras), Beauty (visión + cambio de look sobre la foto), Writer (textos que quedan en "Mis documentos", `users/{uid}/writerDocuments`) y Chef (foto de ingredientes → receta → foto del plato). Weë Music sigue intacta en modo demo.

En local, las Functions corren en el **emulador** con el proyecto `demo-wee` (Java 21 o superior), junto con Auth, Firestore y Storage:

```bash
npm run functions:install   # una vez
npm run functions:emulator  # Auth :9099, Firestore :8080, Functions :5001 y Storage :9199, solo en 127.0.0.1
npm run web:demo            # la app web conectada a los cuatro (http://localhost:8082)
```

`npm run web:demo` pone a la app en el proyecto `demo-wee` y le da las cuatro variables `EXPO_PUBLIC_{AUTH,FIRESTORE,FUNCTIONS,STORAGE}_EMULATOR_HOST`. En el celular (dev build por USB) hacen falta las mismas variables al arrancar Metro y `adb reverse` de los puertos 9099, 8080, 5001 y 9199. Sin esas variables, la app usa el proyecto real.

**Claves:** viven solo en Cloud Secret Manager de producción (`functions/src/secrets.ts`), nunca en el portátil ni en el repo; custodia y rotación en [`docs/SECURITY.md`](docs/SECURITY.md). En local no hacen falta: sin claves, cada proveedor no existe para el router y la sección responde en modo demo con resultados de muestra. El emulador se niega a arrancar si encuentra una clave de proveedor en `functions/.env.local`. El coste real de cada llamada queda en `aiGenerations` (`providerCost`) y acumulado en `aiUsage/{día}` y `creatorUsage/{día}`; los Credits que se cobran salen del catálogo placeholder del Credit Engine hasta fijar precios definitivos.

Qué hace hoy: en cualquier especialista, **Empezar** abre la conversación guiada (2–3 preguntas con opciones, siempre con "🤷 No sé"), muestra el plan y su coste ("Gratis en modo demo"), ejecuta los pasos por el AI Gateway con el proveedor de prueba `mock` (sin gastar dinero) y devuelve un resultado de muestra con **Crear otra versión / Editar / Publicar en mi comunidad**. Los trabajos se guardan en `creatorJobs` ("Mis creaciones"). Los precios (`pricing/{capacidad}`) siguen vacíos a propósito: se llenan cuando se midan los costes reales de cada API.

## Problemas conocidos

- El chequeo de tipos (`npx tsc --noEmit`) está limpio (0 errores desde el 2026-09-06); mantenerlo así al añadir código. Las pruebas del WEË AI ENGINE se corren con `npm run test:engine`.
- `PushNotificationProvider` en web: resuelto (se retiran las suscripciones con `remove()`).


---

## Licencia

Repositorio privado. Todos los derechos reservados hasta que se defina una licencia.

## Autor

[@geovetlf](https://github.com/geovetlf)
