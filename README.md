# Weë — World Encode Entity

> **La red social para la generación de la IA.**
> Una plataforma donde las personas descubren y usan herramientas de Inteligencia Artificial para crear, y comparten lo creado con comunidades que también crean con IA.

Weë combina en un solo ecosistema lo que hoy está disperso: **red social + herramientas de IA + creación de contenido + comunidades + descubrimiento**. La IA es el motor. La comunidad es el ecosistema. La red social es el tejido que conecta todo.

Las instrucciones definitivas de producto y UX están en [`docs/UX.md`](./docs/UX.md); la visión original, en [`docs/VISION.md`](./docs/VISION.md). Este README describe **lo que existe hoy en el código** y cómo trabajar con él.

Una app, tres plataformas: **iOS, Android y Web** desde el mismo código (React Native + Expo).

---

## Estado actual vs. visión

El repositorio empezó con otro nombre (HideTok) antes de ser Weë (`db070a9`, 2026-04-14). De aquel nombre solo quedan identificadores técnicos con datos o servicios detrás; cuáles son y cómo se migran está en [`docs/LEGADO-HIDETOK.md`](docs/LEGADO-HIDETOK.md). Muchas piezas de la visión ya existen como base; otras todavía no. El mapa de las fronteras del código (dónde vive cada una, qué la define, qué la vigila y si está conectada) está en [`docs/MAPA-DE-FRONTERAS.md`](docs/MAPA-DE-FRONTERAS.md).

| Área de la visión | Hoy en el código | Estado |
|---|---|---|
| **Home** (lo que se monta hoy) | `LandingScreen` (nativo) / `WebLandingScreen` (web), ruta `Landing`: Header → saludo y buscador (`HomeGreeting`) → publicar (`ComposerEntry`) → fila de Weëls (`WeelsRow`) → Wäll con filtros por sección de Weë (`utils/feedFilters.ts`), desde 072d2bf (2026-09-10). `components/HeroCarousel.tsx` no lo monta nadie | ⚠️ **Definición pendiente del dueño**: no coincide con la decisión escrita del 2026-09-06 (`docs/UX.md` §16, carrusel + Comunidades + «Creado por la comunidad»). Ver `CLAUDE.md` § Arquitectura |
| **Menú ☰ único** | `DrawerMenu` — Perfil Real / Perfil Weë, Comunidades, Weëls, WeeTalk, **WEË AI** (con categorías), Credits, Notificaciones, Guardados, Configuración, Ayuda | ✅ Implementado |
| **Botón "+" → Crear** | `CreateSheet` — Publicación, Weël, Imagen, Video, Texto, Pregunta + acceso a WEË AI; `CreateScreen` recibe `kind` | ✅ Implementado |
| **"Cómo lo hice"** (herramientas, prompt, proceso) | `CreateScreen` → `Post.aiTools / aiPrompt / aiProcess` → `HowIMadeIt` dentro de `PostCard` (prompt copiable) | ✅ Implementado |
| **Credits siempre visibles** | `CreditsPill` en `Header` (`hooks/useWallet.ts`) → `CreditStoreScreen` / `WalletScreen` / `creditsService`; el saldo y el historial los mueve solo el **Credit Engine** (`functions/src/credits`, [`docs/CREDITS.md`](docs/CREDITS.md)) | ✅ Implementado |
| **WEË AI** (11 experiencias: Weë Design, Studio, Photo, Writer, Music, Beauty, Chef, Home, Business, Travel, Brain; 7 visibles como sección —Photo, Beauty, Home y Writer se abren desde Weë Studio o Weë Design, `HIDDEN_AS_SECTION`—) | `WeeCreatorScreen` + `constants/weeExperiences.ts` — buscador por intención "¿Qué quieres crear?", ejemplos por experiencia; cada especialista con su pantalla (`constants/specialists.ts`). Regla: "El usuario elige el resultado. Weë elige la IA." (`docs/CREATOR.md`) | ✅ 10 secciones conectadas a IA real por el WEË AI ENGINE (Gemini, Seedance, ElevenLabs; modo demo sin claves), Weë Brain como asistente con búsqueda y contexto (`brainChat`), fotos por Storage, Credits por el Credit Engine (precios placeholder), **Mis proyectos** y **Mis documentos** en Firestore. ⚠️ Weë Music intacta en modo demo; Weë Business sin publicar en redes (sin APIs sociales) |
| **Descubrimiento de IA** ("quiero hacer X" → especialista recomendado) | buscador de `WeeCreatorScreen` (`matchExperiences`, por palabras clave; Weë Brain lo hará con un LLM) | ⚠️ Base |
| **Weëls** (videos cortos) | `ReelsScreen` — feed de video; fuera de Weë se comparte el **enlace** de la publicación (`utils/compartirFuera.ts`, desde 3df8267), no el archivo; el compositor limita un Weël a **15 s** y lo marca con `Post.isWeel`. la descarga con marca de agua (`services/videoDownload.ts`) nunca se conectó y se retiró el 2026-10-01 | ✅ Base existente (sin marca de agua: la de `docs/UX.md` §10 no existe hoy) |
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
- **Backend:** Firebase — Authentication (anónimo, email/contraseña, Google), Firestore, Storage, Cloud Functions (Node 24: `firebase.json` → `runtime: nodejs24`, `functions/package.json` → `engines.node: 24`)
- **IA:** el **WEË AI ENGINE** (`functions/src/engine`, un adaptador por proveedor) para WEË AI; el avatar del Perfil Weë y el reemplazo de personas en fotos llaman a **Gemini** (`gemini-3-pro-image`, configurable con `GEMINI_IMAGE_MODEL_PRO`; `functions/src/vertexAI.ts`). Ver § WEË AI ENGINE
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

Cuidado: `firebase deploy` sin `--project` cae en **producción**. Por eso ningún despliegue sale de un portátil ni de un worktree: el primer `predeploy` de cada objetivo de `firebase.json` (`scripts/solo-desde-el-workflow.mjs`) lo rechaza fuera del workflow `despliegue.yml` de `main`.

Archivos de configuración de cliente (apuntan a `get-wee`):

| Archivo | Qué es | Generar con |
|---|---|---|
| `.env` | Claves web (`EXPO_PUBLIC_FIREBASE_*`) | `firebase apps:sdkconfig WEB <appId> --project <alias>` |
| `google-services.json` | Config Android | `firebase apps:sdkconfig ANDROID <appId> --out google-services.json --project <alias>` |
| `GoogleService-Info.plist` | Config iOS | `firebase apps:sdkconfig IOS <appId> --out GoogleService-Info.plist --project <alias>` |

`app.config.js` permite apuntar los archivos nativos a otra ruta con las variables `GOOGLE_SERVICES_JSON` y `GOOGLE_SERVICES_PLIST` (útil en EAS Build).

### Iniciar sesión con Google

Lo que hace el código hoy (`contexts/AuthContext.tsx`):

- **Web:** `signInWithPopup` con `GoogleAuthProvider` de Firebase Authentication. No necesita variables; sí que el proveedor Google esté activado en Authentication de `get-wee` y que el dominio esté en sus *Authorized domains*.
- **Android / iOS:** `@react-native-google-signin/google-signin` (plugin en `app.json`, con el `iosUrlScheme` del cliente de iOS) da el `idToken`, y Firebase lo convierte en sesión con `GoogleAuthProvider.credential` + `signInWithCredential`. El módulo se configura con `webClientId = EXPO_PUBLIC_GOOGLE_CLIENT_ID`: el identificador del cliente OAuth **web** del proyecto (el que usa Firebase Auth para validar el token), no el de Android ni el de iOS. Sin esa variable el botón queda desactivado con un aviso, a propósito. En Android, además, la huella SHA-1 del certificado con el que se firma el APK tiene que estar registrada en la app Android del proyecto de Firebase; si Google no está activado, `google-services.json` llega sin ningún `oauth_client`.
- Cambiar `EXPO_PUBLIC_GOOGLE_CLIENT_ID` o el plugin pide recompilar el development build.

En un proyecto de Firebase nuevo hay que activar en la consola: **Authentication** (Anónimo, Email/Contraseña, Google), **Firestore** y **Storage** (los proyectos nuevos requieren plan Blaze para Storage). Reglas, índices, Functions y hosting viven en el repositorio, pero **no hay camino manual para desplegarlos**: producción cambia solo por commit en `main` → CI → aprobación del dueño → workflow ([`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)).

---

## Puesta en marcha

Requisitos: Node 24 (el de la CI, `.github/workflows/ci.yml`, y el del runtime de Functions) y npm. Para Android, además, JDK 17 y el Android SDK (ver más abajo). No hace falta cuenta de Expo.

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

`expo-updates` está **desactivado** (`app.json` → `updates.enabled: false`): `app.json` y `eas.json` todavía referencian la cuenta de Expo y el Apple ID del desarrollador anterior (`owner`, `extra.eas.projectId`, `submit.production.ios`), y el `slug` sigue siendo el heredado (`hidetok-simple`), atado a ese proyecto de EAS. Si algún día se usa EAS, hay que reapuntar esos campos a la cuenta actual antes del primer build; el orden está en [`docs/LEGADO-HIDETOK.md`](docs/LEGADO-HIDETOK.md).

---

## Scripts

```bash
npm start                          # Expo (menú interactivo)
npm run web                        # solo web
npm run android                    # expo run:android (JDK 17 + Android SDK; no hace falta Android Studio)
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
├── components/              # UI reutilizable (PostCard, Header, Sidebar, BarraInferior, avatars/…)
├── config/                  # firebase.ts (inicialización), linking.ts (deep links)
├── constants/               # design.ts (tokens), chatThemes.ts, weebizCategories.ts
├── contexts/                # Auth, UserProfile, Theme, PushNotification, TabBar, Scroll
├── hooks/                   # useCommunities, useReposts, useVote, useBookmarks, useResponsive…
├── navigation/              # Auth / Main / Home / Inbox / Profile stacks + TabNavigator
├── screens/                 # Landing/Home, WeeCreator, Reels (Weëls), Inbox/Conversation (WeeTalk), Community,
│                            # WeeProfileCreation + AiAvatar (Perfil Weë), CreditStore/Wallet, WeeBiz*, Search…
├── services/                # firestoreService, messagesService, communityService, creditsService,
│                            # avatarGenerationService, storageService, cloudinaryService, assetDownload…
├── functions/src/           # Cloud Functions (Node 24): creator, engine, credits, runtime, core… (docs/MAPA-DE-FRONTERAS.md)
├── locales/                 # Textos de los permisos nativos de iOS por idioma (app.json → locales)
├── public/                  # Landing (raíz de get-wee), privacy-policy, terms, support, .well-known
├── legal/                   # Textos legales
└── docs/VISION.md           # Visión del producto
```

---

## Documentación adicional

- [`docs/UX.md`](./docs/UX.md) — **instrucciones definitivas** de producto, estructura y UX (prevalecen)
- [`docs/VISION.md`](./docs/VISION.md) — visión y principios del producto
- [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) — cómo cambia producción (el único camino) · [`docs/HARNESS.md`](./docs/HARNESS.md) — el mapa del Weë Agent Harness
- [`docs/DECISIONES-PENDIENTES.md`](./docs/DECISIONES-PENDIENTES.md) — lo que espera al dueño · [`docs/DECISIONES-DELIBERADAS.md`](./docs/DECISIONES-DELIBERADAS.md) — lo que parece un defecto y es una decisión con su razón
- [`docs/MAPA-DE-FRONTERAS.md`](./docs/MAPA-DE-FRONTERAS.md) — cada frontera del código: dónde vive, qué documento la define, qué suites la vigilan y si está conectada
- [`docs/LEGADO-HIDETOK.md`](./docs/LEGADO-HIDETOK.md) — lo que queda del nombre antiguo y su migración. Las siete guías de la raíz de aquella época (Netlify, Vercel, Google Sign-In, Storage, likes y follows) se retiraron el 2026-10-01: siguen en la historia de git (§ 7 de ese documento)

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

En modo demo (sin claves, como en los emuladores): en cualquier especialista, **Empezar** abre la conversación guiada (2–3 preguntas con opciones, siempre con "🤷 No sé"), muestra el plan y su coste ("Gratis en modo demo"), ejecuta los pasos con el proveedor de prueba `mock` (sin gastar dinero) y devuelve un resultado de muestra con **Crear otra versión / Editar / Publicar en mi comunidad**. Los trabajos se guardan en `creatorJobs` ("Mis creaciones"). Los Credits de cada operación salen de un solo sitio, `functions/src/credits/aiPricing.ts`: tarifa oficial del proveedor → USD → Credits con el margen de `aiSettings/global`, o el catálogo de prueba de `creditCosts.ts` mientras `pricingMode` sea `simulated` ([`docs/CREDITS.md`](docs/CREDITS.md)).

## Problemas conocidos

Esta lista ya no se lleva a mano aquí (se quedaba atrás). Lo abierto vive en dos sitios:

- **Lo que espera una decisión del dueño** (producto, cifras, operación): [`docs/DECISIONES-PENDIENTES.md`](docs/DECISIONES-PENDIENTES.md).
- **Los hallazgos conocidos del revisor**, con su línea base: `ops/revision/baseline.json` (cómo se revisa: [`docs/REVISION.md`](docs/REVISION.md)). Antes de dar algo por defecto nuevo, mira si es una decisión con su razón: [`docs/DECISIONES-DELIBERADAS.md`](docs/DECISIONES-DELIBERADAS.md).

Y dos reglas que siguen: el chequeo de tipos (`npx tsc --noEmit`) está limpio (0 errores desde el 2026-09-06) y se mantiene así; las pruebas se corren con `npm run test:engine` (compila Functions y encadena las suites) o, sin pararse en el primer fallo y también en Windows, con `npm run functions:build` y después `node test/_cadena.mjs` desde `functions/` (la misma lista que usa la CI).


---

## Licencia

Repositorio privado. Todos los derechos reservados hasta que se defina una licencia.

## Autor

[@geovetlf](https://github.com/geovetlf)
