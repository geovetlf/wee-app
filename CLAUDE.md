# CLAUDE.md — Weë (World Encode Entity)

## Qué es este proyecto

Red social para personas que utilizan Inteligencia Artificial: descubrir, aprender, crear, compartir y conectar. La IA es el motor; la comunidad es el corazón. Las **instrucciones definitivas de producto, estructura y UX** están en [`docs/UX.md`](docs/UX.md) y prevalecen sobre [`docs/VISION.md`](docs/VISION.md) (visión original) cuando se contradicen. Estado real del código en [`README.md`](README.md). La arquitectura de IA de WEE Creator (10 experiencias, WEE Brain, multi-proveedor) está en [`docs/CREATOR.md`](docs/CREATOR.md) y actualiza el §6–§7 de UX.md.

Filosofía de UX: **"Muchas posibilidades por detrás. Una experiencia simple por delante."** Toda decisión de UX/UI prioriza simplicidad, claridad, amigabilidad, descubrimiento, creación y comunidad. No agregar funciones, menús ni secciones solo porque sean posibles.

Toda funcionalidad nueva se evalúa con una pregunta:

> ¿Esto ayuda a una persona a crear, compartir, aprender, conectar o trabajar mejor con Inteligencia Artificial?

## Arquitectura definitiva (docs/UX.md)

- **Home = la experiencia social.** Contenido, usuarios, comunidades, Weëls, trabajos con IA, preguntas y tendencias. Debe sentirse como una red social, no como un catálogo de herramientas. **Nunca usar "WEE Social" como nombre** de sección ni en el menú: el Home ya es lo social.
- **WEE Creator = la IA que trabaja por ti.** Es el único espacio que conserva nombre propio. Responde a "¿Qué quieres crear?" bajo la regla **"El usuario elige el resultado. WEE elige la IA."**: la persona dice qué quiere lograr en lenguaje normal; nunca ve modelos, APIs, proveedores ni prompts técnicos. Solo hay **10 experiencias visibles**, nombres de identidad que no se cambian: 🎨 WEE Design, 🎬 WEE Studio, 📸 WEE Photo, ✍️ WEE Writer, 🎵 WEE Music, 💄 WEE Beauty, 👨‍🍳 WEE Chef, 🏠 WEE Home, 💼 WEE Business, 🧠 WEE Brain. Una experiencia ≠ una API: cada una puede combinar varios proveedores, y **WEE Brain** es el cerebro/orquestador (entiende, pregunta, arma prompts internos, elige y coordina herramientas, explica resultados). Fuente única: `constants/weeExperiences.ts`. Se abre desde el menú ☰ (iconos pequeños y discretos, sin tarjetas enormes). Detalle en `docs/CREATOR.md`.
- **Un solo menú ☰:** Perfil (Perfil Real · Perfil WEE) · Explora (Comunidades · Weëls) · WeeTalk · WEE Creator (categorías) · 💳 Credits · 🔔 Notificaciones · 🔖 Guardados · ⚙️ Configuración · ❓ Ayuda. Barra inferior: Inicio · Buscar · + · WeeTalk · Perfil.
- **Comunidades, no secciones.** WEE Filmmakers, WEE Influencers, WEE Designers, WEE Writers, WEE Musicians, WEE Developers, WEE Entrepreneurs, WEE Gamers, etc. son comunidades dentro del Home. Nunca crear "WEE Influencer Section", "WEE Filmmaker Section", "WEE Communities" ni similares. Las herramientas que usan viven en WEE Creator (conectados, no mezclados).
- **"Explora comunidades"** (Home) muestra temáticas sociales, no herramientas: Cine & Animación, Arte & Creatividad, Creadores & Influencers, Negocios & Emprendimiento, Tecnología & IA, Gaming & Mundos Virtuales, Educación & Aprendizaje, Futuro & Sociedad. Fuente única: `constants/communityCategories.ts` (alimenta landing nativa y web, home, semilla de Firestore y tags). Nunca nombrarlas "Video IA / Imagen IA".
- **Credits** son parte central: saldo visible pero elegante (💳 250 Credits) arriba del Home, dentro de WEE Creator y en el menú.
- **Botón +** abre Crear: Publicación, Weël, Imagen, Video, Texto, Pregunta; conecta con WEE Creator si hace falta una herramienta.
- **Weëls:** videos de hasta 15 s, compartibles fuera de WEE, con pequeño watermark de WEE. Sección "Weëls" en el Home.
- **"Cómo lo hice" y prompts:** una publicación puede mostrar resultado, herramientas usadas, prompt (con "Copiar prompt") y proceso.
- **Perfil Real + Perfil WEE** (WEE = World Encode Entity), diferencia muy clara, sin complicar.
- **Identidad visual:** fondo blanco, amarillo/dorado #F5B731 como color principal, gris oscuro #1F2937 para textos, tarjetas blancas con bordes suaves y sombras ligeras, mucho espacio. No cambiar a estética oscura/neón.

## Mapa de nombres (producto → código actual)

| Producto | Código hoy |
|---|---|
| Home (feed, Explora comunidades, Comunidades populares) | `HomeScreen`, `LandingScreen`, `WebLandingScreen`, `postsService`, `constants/communityCategories.ts` |
| Weëls (videos ≤15 s con watermark) | `ReelsScreen`, `videoDownload.ts`; el compositor (`CreateScreen`, `kind: 'weel'`) limita a 15 s y marca `Post.isWeel` |
| WeeTalk (chat) | `InboxScreen`, `ConversationScreen`, `messagesService` |
| Comunidades | `CommunityScreen`, `communityService` |
| Perfil WEE (identidad alterna) | `HidiCreationScreen`, `AiAvatarScreen`, `getHidiProfile` — "Hidi" es el nombre heredado |
| Credits | `CreditStoreScreen`, `WalletScreen`, `creditsService` |
| Menú ☰ único | `components/DrawerMenu.tsx` |
| Hoja Crear del + | `components/CreateSheet.tsx`, botón en `navigation/TabNavigator.tsx`, `CreateScreen` recibe `kind` |
| WEE Creator (10 experiencias) | `screens/WeeCreatorScreen.tsx`, `constants/weeExperiences.ts`; "Avísame cuando esté" → `services/creatorInterestService.ts` (`creatorInterests/{uid}_{experienceId}`). WEE Brain (orquestación) e integraciones reales pendientes |
| "Cómo lo hice" y prompts | `Post.aiTools/aiPrompt/aiProcess` (`firestoreService`), `CreateScreen`, `components/HowIMadeIt.tsx` en `PostCard` |
| Credits visibles en el header | `components/CreditsPill.tsx`, `hooks/useWallet.ts` |
| Guardados (🔖 del menú) | `services/bookmarksService.ts` (`users/{uid}/bookmarks/{postId}`, reglas en `firestore.rules`), `hooks/useBookmarks.ts`, botón en `PostCard`, `screens/SavedPostsScreen.tsx` |
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
- Cloud Functions (`functions/src`) usan Gemini para el avatar del perfil WEE.
- UI y textos en español. Comentarios en español o inglés según el archivo circundante.

## Forma de trabajar acordada

1. Web primero (ciclo instantáneo), después Android (dev build), iOS al final.
2. Bugs conocidos listados en README → "Problemas conocidos". No corregirlos sin que el usuario lo pida.
3. Commits y push solo cuando el usuario lo pida.
4. El canvas de diseño (`design/canvas/`) se actualiza reensamblando desde los `.dc.html`; el HTML ensamblado no se versiona.
