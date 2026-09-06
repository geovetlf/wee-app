# CLAUDE.md — Weë (World Encode Entity)

## Qué es este proyecto

Red social para personas que utilizan Inteligencia Artificial: descubrir, aprender, crear, compartir y conectar. La IA es el motor; la comunidad es el corazón. Las **instrucciones definitivas de producto, estructura y UX** están en [`docs/UX.md`](docs/UX.md) y prevalecen sobre [`docs/VISION.md`](docs/VISION.md) (visión original) cuando se contradicen. Estado real del código en [`README.md`](README.md). La arquitectura de IA de Weë Creator (10 experiencias, Weë Brain, multi-proveedor) está en [`docs/CREATOR.md`](docs/CREATOR.md) y actualiza el §6–§7 de UX.md. El **prompt maestro de construcción** (10 especialistas con experiencia propia, todo con datos simulados antes de cualquier API real, proyectos, Credits simulados, orden de 16 fases) está en [`docs/CREATOR-BUILD.md`](docs/CREATOR-BUILD.md) con las referencias visuales en `design/references/`. La capa multimodelo que ejecuta cada paso es el **WEË AI ENGINE** ([`docs/AI-ENGINE.md`](docs/AI-ENGINE.md), `functions/src/engine`): Weë → WEË AI ENGINE → AI ROUTER → proveedor especializado; nunca código atado a un solo proveedor.

Filosofía de UX: **"Muchas posibilidades por detrás. Una experiencia simple por delante."** Toda decisión de UX/UI prioriza simplicidad, claridad, amigabilidad, descubrimiento, creación y comunidad. No agregar funciones, menús ni secciones solo porque sean posibles.

Toda funcionalidad nueva se evalúa con una pregunta:

> ¿Esto ayuda a una persona a crear, compartir, aprender, conectar o trabajar mejor con Inteligencia Artificial?

## Arquitectura definitiva (docs/UX.md)

- **Home = la experiencia social.** Contenido, usuarios, comunidades, Weëls, trabajos con IA, preguntas y tendencias. Debe sentirse como una red social, no como un catálogo de herramientas. **Nunca usar "Weë Social" como nombre** de sección ni en el menú: el Home ya es lo social.
- **Weë Creator = la IA que trabaja por ti.** Es el único espacio que conserva nombre propio. Responde a "¿Qué quieres crear?" bajo la regla **"El usuario elige el resultado. Weë elige la IA."**: la persona dice qué quiere lograr en lenguaje normal; nunca ve modelos, APIs, proveedores ni prompts técnicos. Solo hay **10 experiencias visibles**, nombres de identidad que no se cambian: 🎨 Weë Design, 🎬 Weë Studio, 📸 Weë Photo, ✍️ Weë Writer, 🎵 Weë Music, 💄 Weë Beauty, 👨‍🍳 Weë Chef, 🏠 Weë Home, 💼 Weë Business, 🧠 Weë Brain. Una experiencia ≠ una API: cada una puede combinar varios proveedores, y **Weë Brain** es el cerebro/orquestador (entiende, pregunta, arma prompts internos, elige y coordina herramientas, explica resultados). Segunda regla: **"No hagas que el usuario aprenda a usar la IA. Haz que la IA aprenda a ayudar al usuario."** Reglas derivadas: Weë es didáctico (pregunta cosas sencillas con opciones, siempre con **🤷 No sé**); prompts, negative prompts, seeds, parámetros, modelos y nombres de API **nunca se muestran por defecto** (un modo avanzado solo opcional y oculto); capas USUARIO → Weë → Weë Brain/Orchestrator → AI Gateway → proveedor, para cambiar proveedores sin que el usuario aprenda nada; una petición puede encadenar varios especialistas (Brain → Writer → Design → Studio → voz → Music) y el usuario solo ve el resultado; **Weë es la interfaz**: integrar APIs reales investigadas (§10), nunca enlaces a otras páginas de IA; todo consume **Credits** por acción, pero **no inventar precios** hasta conocer el coste real de cada API (costo API + infraestructura + otros + margen = precio en Credits). Fuente única: `constants/weeExperiences.ts`. Se abre desde el menú ☰ (iconos pequeños y discretos, sin tarjetas enormes). Detalle en `docs/CREATOR.md`.
- **Un solo menú ☰:** Perfil (Perfil Real · Perfil Weë) · Explora (Comunidades · Weëls) · WeeTalk · Weë Creator (categorías) · 💳 Credits · 🔔 Notificaciones · 🔖 Guardados · ⚙️ Configuración · ❓ Ayuda. Barra inferior: Inicio · Buscar · + · WeeTalk · Perfil.
- **Comunidades, no secciones.** Weë Filmmakers, Weë Influencers, Weë Designers, Weë Writers, Weë Musicians, Weë Developers, Weë Entrepreneurs, Weë Gamers, etc. son comunidades dentro del Home. Nunca crear "Weë Influencer Section", "Weë Filmmaker Section", "Weë Communities" ni similares. Las herramientas que usan viven en Weë Creator (conectados, no mezclados).
- **"Explora comunidades"** (Home) muestra temáticas sociales, no herramientas: Cine & Animación, Arte & Creatividad, Creadores & Influencers, Negocios & Emprendimiento, Tecnología & IA, Gaming & Mundos Virtuales, Educación & Aprendizaje, Futuro & Sociedad. Fuente única: `constants/communityCategories.ts` (alimenta landing nativa y web, home, semilla de Firestore y tags). Nunca nombrarlas "Video IA / Imagen IA".
- **Credits** son parte central: saldo visible pero elegante (💳 250 Credits) arriba del Home, dentro de Weë Creator y en el menú.
- **Botón +** abre Crear: Publicación, Weël, Imagen, Video, Texto, Pregunta; conecta con Weë Creator si hace falta una herramienta.
- **Weëls:** videos de hasta 15 s, compartibles fuera de Weë, con pequeño watermark de Weë. Sección "Weëls" en el Home.
- **"Cómo lo hice" y prompts:** una publicación puede mostrar resultado, herramientas usadas, prompt (con "Copiar prompt") y proceso.
- **Perfil Real + Perfil Weë** (Weë = World Encode Entity), diferencia muy clara, sin complicar. **Perfil Real = app blanca; Perfil Weë activo = app oscura** (decisión del usuario, 2026-09-05; el cambio de tema vive en `DrawerMenu`/`Header` con `setThemeMode`). No "corregirlo". El **Perfil Biz** (negocio/tienda, pantallas `WeeBiz*`, acento morado) se mantiene como tercera identidad opcional (decisión del usuario, 2026-09-05).
- **Identidad visual:** fondo blanco, amarillo/dorado #F5B731 como color principal, gris oscuro #1F2937 para textos, tarjetas blancas con bordes suaves y sombras ligeras, mucho espacio. No cambiar a estética oscura/neón; la única excepción es el tema oscuro mientras el Perfil Weë está activo.

## Mapa de nombres (producto → código actual)

| Producto | Código hoy |
|---|---|
| Home (feed, Explora comunidades, Comunidades populares) | `HomeScreen`, `LandingScreen`, `WebLandingScreen`, `postsService`, `constants/communityCategories.ts` |
| Weëls (videos ≤15 s con watermark) | `ReelsScreen`, `videoDownload.ts`; el compositor (`CreateScreen`, `kind: 'weel'`) limita a 15 s y marca `Post.isWeel` |
| WeeTalk (chat) | `InboxScreen`, `ConversationScreen`, `messagesService` |
| Comunidades | `CommunityScreen`, `communityService` |
| Perfil Weë (identidad alterna) | `HidiCreationScreen`, `AiAvatarScreen`, `getHidiProfile` — "Hidi" es el nombre heredado |
| Credits | `CreditStoreScreen`, `WalletScreen`, `creditsService`; en Weë Creator los precios son **de prueba** (`functions/src/creator/credits.ts`, `CREATOR_PRICING_MODE=simulated` por defecto, 240 Credits de bienvenida) hasta medir las APIs reales (`pricing/{capacidad}`, modo `real`) |
| Menú ☰ único | `components/DrawerMenu.tsx` |
| Hoja Crear del + | `components/CreateSheet.tsx`, botón en `navigation/TabNavigator.tsx`, `CreateScreen` recibe `kind` |
| Weë Creator (10 experiencias) | `screens/WeeCreatorScreen.tsx`, `constants/weeExperiences.ts`; "Avísame cuando esté" → `services/creatorInterestService.ts` (`creatorInterests/{uid}_{experienceId}`). Weë Brain (orquestación) e integraciones reales pendientes |
| "Cómo lo hice" y prompts | `Post.aiTools/aiPrompt/aiProcess` (`firestoreService`), `CreateScreen`, `components/HowIMadeIt.tsx` en `PostCard` |
| Credits visibles en el header | `components/CreditsPill.tsx`, `hooks/useWallet.ts` |
| Mis proyectos (Weë Creator) | `services/projectsService.ts` (`creatorProjects`, `projectId` en `creatorJobs`), `screens/ProjectsScreen.tsx`, `screens/ProjectScreen.tsx`, `components/creator/ProjectPicker.tsx` ("Guardar en proyecto" en `ResultCard`) |
| Guardados (🔖 del menú) | `services/bookmarksService.ts` (`users/{uid}/bookmarks/{postId}`, reglas en `firestore.rules`), `hooks/useBookmarks.ts`, botón en `PostCard`, `screens/SavedPostsScreen.tsx` |
| Ayuda (❓ del menú, también Términos/Privacidad y Configuración → Ayuda) | `screens/HelpScreen.tsx` (ruta `Help {section?}`) |
| Panel del WEË AI ENGINE (Configuración → Weë AI Engine, solo administración) | `screens/EngineAdminScreen.tsx` (ruta `EngineAdmin`), `services/aiEngineService.ts` → callable `engineAdmin`; admin = claim `admin` o uid en `WEE_ADMIN_UIDS` (`functions/.env.wee-dev-geovet` en dev) |
| Avisos y confirmaciones que funcionan en web | `utils/notify.ts` (`notify`, `confirmAction`): en React Native Web `Alert.alert` no muestra nada |
| Barra lateral de escritorio (mismo menú que el ☰) | `components/Sidebar.tsx`; columna derecha `components/RightSidebar.tsx` |
| Diseño de referencia | `design/canvas/` |

Al renombrar cosas heredadas (HideTok, Hidi), hacerlo de forma coordinada y no a medias.

## Firebase: dos entornos — nunca tocar producción sin pedirlo

- `wee-dev-geovet` = **dev** (alias `dev` y `default` en `.firebaserc`).
- `get-wee` = **producción** (alias `prod`): app publicada, usuarios reales.
- `firebase deploy` sin `--project` cae en dev. Producción solo con `--project prod` y confirmación explícita del usuario.
- `.env`, `google-services.json` locales apuntan a dev. El `GoogleService-Info.plist` versionado es de producción.

## Stack y restricciones

- Expo SDK 54 managed, React Native 0.81, React 19, TypeScript, React Navigation 7, React Native Web. Un solo código para iOS, Android y Web; divergencias puntuales con `Platform.OS` o archivos `.web.tsx` / `.native.tsx`.
- **Expo Go no sirve** (módulos nativos). Android = development build local con Gradle (sin cuenta de Expo ni EAS), luego Metro por USB/WiFi. `expo-updates` desactivado.
- Cloud Functions (`functions/src`) usan Gemini para el avatar del perfil Weë.
- **Escritura de la marca: siempre "Weë"** (con diéresis) en todo texto visible, nombres de especialistas (Weë Brain, Weë Design…), "Weë Creator", docs y comentarios. Nunca "WEE" ni "Wee" en textos nuevos; los identificadores de código (WEE_EXPERIENCES, WeeCreatorScreen) no cambian.
- UI y textos en español. Comentarios en español o inglés según el archivo circundante.

## Forma de trabajar acordada

1. Web primero (ciclo instantáneo), después Android (dev build), iOS al final.
2. Bugs conocidos listados en README → "Problemas conocidos". No corregirlos sin que el usuario lo pida.
3. Commits y push solo cuando el usuario lo pida.
4. El canvas de diseño (`design/canvas/`) se actualiza reensamblando desde los `.dc.html`; el HTML ensamblado no se versiona.
5. Weë Creator se construye según `docs/CREATOR-BUILD.md`: primero toda la experiencia navegable con el proveedor `mock` (sin APIs reales, sin costos reales: Credits simulados y marcados como tales), cada especialista con su propia pantalla (configuración en `constants/specialists.ts` + piezas compartidas en `components/creator/`), en escritorio con barra lateral y en móvil con ☰ + barra inferior. El adaptador de Gemini existe pero queda dormido sin clave.
6. Weë Creator: la lógica vive en `functions/src/creator` (Weë Brain: `planner.ts` + `templates.ts`, trabajos en `creatorJobs`) y el **WEË AI ENGINE** en `functions/src/engine` (`router.ts` elige modelo/calidad/coste/fallback, `registry.ts` proveedores y cadenas por defecto, `config.ts` lee `aiProviders`/`aiRouting`/`aiSettings` de Firestore, `ledger.ts` escribe `aiGenerations`, `providers/` un adaptador por proveedor, `pipelines/drama.ts` blueprint de AI Drama, `admin.ts` callable `engineAdmin`). `functions/src/gateway` es solo compatibilidad. Reglas: un proveedor nuevo = un adaptador + una línea en `ADAPTERS`; nunca llamar a una API de IA fuera de un adaptador; cadenas y prioridades se cambian en Firestore, no en código; sin música de Suno mientras no haya API oficial con licencia. En dev las Functions corren en el emulador (`npm run functions:emulator`, `.env` con `EXPO_PUBLIC_FUNCTIONS_EMULATOR_HOST=localhost`). Gemini entra por `functions/src/gateway/providers/gemini.ts` (clave `GEMINI_API_KEY` en `functions/.env.local`, nunca versionada) y los prompts internos viven en `functions/src/creator/prompts.ts`. Nunca poner claves de proveedores en el cliente; nunca inventar precios en `pricing` (medir primero en `creatorUsage/{día}`); el cliente (`services/creatorService.ts`, `screens/CreatorFlowScreen.tsx`, `components/creator/`) solo muestra preguntas, plan, progreso y resultados.
