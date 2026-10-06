# Mapa de fronteras de Weë

Para quien revisa un cambio y necesita saber, de cada frontera del código, **dónde vive, qué documento la define,
qué suites la vigilan y si está conectada**. Solo hechos del código; no describe arquitectura futura. Medido el
2026-10-01 sobre `i18n/da-dk` (`d306a58` + cambios sin commit). Si un documento y el código no coinciden, manda el
código (§ 4 lista las contradicciones halladas).

- **Conectada**: exportada en `functions/src/index.ts` y desplegada, o llamada por código vivo de la app.
- **Preparada sin conectar**: construida y probada, pero sin exportar, sin importador en producción, o detrás de una
  puerta cerrada por defecto (`aiSettings/runtime`, `aiSettings/sombra`, `FILMMAKER_EN_LA_APP`,
  `APP_CHECK_OBLIGATORIO`).
- **Desplegada** = está en `ops/produccion.json` (34 funciones, verificado 2026-09-30). Las suites son
  `functions/test/<nombre>.test.mjs` salvo que digan `.emulator`.

## 1. Las fronteras, en una tabla

| Frontera | Dónde vive | Qué la define | Suites principales | Estado |
|---|---|---|---|---|
| **Gateway / adaptadores** | `functions/src/engine/providers/` (un adaptador por proveedor, registrados en `ADAPTERS` de `engine/registry.ts`); `engine/gateway.ts`; compatibilidad `functions/src/gateway/` (`runCapability`); contrato `core/gateway.ts` | `docs/CORE.md` § El AI Gateway; `docs/AI-ENGINE.md`; `docs/RUNTIME.md` § 4 | `core-gateway`, `gateway-autoridad`, `gateway-plazo`, `providers` | **Conectada**: `runCapability` → `engine.generate` en `creatorChat`/`creatorRun`. **Preparada**: `crearGatewayDelMotor` solo lo usa el conductor (puerta cerrada); `gatewayDeWee` no tiene llamador en producción |
| **Router** | `engine/router.ts` (instancia única en `engine/index.ts`); contrato `core/router.ts`; `functions/src/router/` | `docs/AI-ENGINE.md` § Cómo decide el router; `docs/CORE.md` § WEE Router; `docs/RUNTIME.md` §§ 4 y 6 | `router`, `router-parity`, `core-router`, `router-politica`, `router-frontera-real` | **Conectada**: `engine/router.ts` decide cada llamada de IA. **Preparada**: `core/router.ts`, solo dentro del conductor. `router/index.ts` y `router/politica.ts` no tienen importador |
| **Runtime (conductor)** | `functions/src/runtime/` (`puerta.ts`, `configuracion.ts`, `conductor.ts`, `index.ts`…); barrido en `settlement/programado.ts` | `docs/RUNTIME.md` §§ 11–25 | `runtime-conductor`, `runtime-liquidacion`, `runtime-asincrono`, `puerta-canario`, `brain-canary`, `camino-durable`, `mundo3d-asincrono`, `mundo3d-gobernanza`, `listas-por-capacidad`, `mundo3d-costes`, `mundo3d.emulator` | **Conectada**: `barridoDeLiquidacion` (programada, desplegada). **Preparada**: el conductor está dentro de `brainChat`, `generateVideo` y `generateWorld` (esta, sin desplegar: `no_se_despliegan`), pero `aiSettings/runtime` está cerrada por defecto (sin documento, `decidirRuntime` devuelve `legacy`); cada puerta fija su única capacidad en `CAPACIDAD_DEL_CANARY` (`text.generate` en `creator/brain.ts`, `video.generate` en `creator/video.ts`, `world.generate` en `creator/mundo.ts`), y cada capacidad exige SU lista de cuentas (`porCapacidad`: sin lista o vacía, nadie; la de una no abre otra). Su código cierra también, en el libro, el coste de lo que el proveedor aceptó (RUNTIME §25c); el barrido desplegado hoy es la versión de antes |
| **Planner / Orchestrator / Workflow** | Vivo: `creator/planner.ts` + `creator/templates.ts` y el bucle de `creatorRun` (`creator/index.ts`). Core: `functions/src/planner/`, `orchestrator/`, `workflow/`, `core/planner.ts`, `core/orchestrator.ts`, `core/workflow.ts`; sombra en `creator/sombra.ts` | `docs/CORE.md` §§ WEE Planner, WEE Workflow Engine, WEE Orchestrator; `docs/RUNTIME.md` § 4; `docs/ALGORITHM-ENGINE.md` | `planner`, `core-planner`, `core-workflow`, `core-orchestrator`, `autoridad-core` | **Conectada**: el planner de `creator/` (`creatorChat`). **Preparada**: el Planner del Core solo corre en la sombra (`aiSettings/sombra`, cerrada y por cuentas); el Orchestrator, solo desde el conductor; `workflow/index.ts` sin importador. Excepción: `creator/planner.ts` importa `disponibilidadDeWee` de `planner/index.ts` |
| **Job** | Vivo: `creatorJobs` (lo escribe `creator/index.ts`, lo escucha `services/creatorService.ts`). Core: `functions/src/job/`, `core/job.ts`, `core/job-queue.ts`, `runtime/almacen.ts` (`jobs`), `runtime/cola*.ts` | `docs/CORE.md` § WEE Job Engine; `docs/RUNTIME.md` § 11 | `core-job`, `job-queue`, `cola-durable`, `camino-durable`, `creator-reclamo` | **Conectada**: `creatorJobs`. **Preparada**: el Job Engine del Core, solo vía conductor y `mediaCanary` |
| **Media** | `functions/src/media/` (R2, almacén, entrega, subida, proceso, reconciliación), contrato `core/media/`; colección `mediaObjects` | Sin documento propio: `docs/RUNTIME.md` § 21, `docs/SECURITY.md` § 5 (R2), `docs/F11-MIGRACION.md` | `media-core`, `media-upload-core`, `media-delivery-core`, `media-proceso-core`, `media-canary` | **Preparada**: solo `mediaCanary` está exportada (administración, `assertAdmin`); ninguna otra Function importa `media/`. Las fotos de WEË AI siguen por Storage (`services/creatorUploads.ts`) |
| **Content Core / Asset** | `functions/src/content/` (`deleteAsset`, `materializador.ts`), contrato `core/content/`; colección `assets` (lectura propia, escritura `false`); cliente `services/assetsService.ts`, `screens/MisCreacionesScreen.tsx` | `docs/CORE.md` § WEE Content Core; `docs/F11-MIGRACION.md` | `content`, `core-content`, `f11-ui`, `vista-espejo`, `puente-pre-f1d` | **Conectada**: `deleteAsset` y la materialización desde `creatorRun`/`generateVideo`. **Preparada**: los contratos de contenido y publicación (las publicaciones las sigue escribiendo el cliente); la migración de lo legacy, preparada y NO ejecutada |
| **Financial Core / Credit Engine** | `functions/src/credits/` (motor, catálogo `creditCosts.ts`, precios `aiPricing.ts`); `creator/credits.ts`, `creator/brainUsage.ts`; liquidación `runtime/liquidacion.ts` + `settlement/`; Core en `functions/src/financial/` y `core/financial/`; cliente `creditsService`, `hooks/useWallet.ts` | `docs/CREDITS.md`; `docs/CORE.md` § WEE Financial Core; `docs/RUNTIME.md` §§ 14, 17 | `credits`, `idempotencia-de-cobro`, `credits-cliente-cerrado`, `core-financial`, `runtime-liquidacion`, `liquidacion-pendiente` | **Conectada**: el Credit Engine (9 callables, desplegadas; `spendCredits` solo para administración). **Preparada**: `financial/` y `core/financial/`, sin importador en `src` |
| **Payment Router** | `functions/src/payments/` + `core/financial/commerce.ts` | Sin documento propio: `docs/CREDITS.md` § 7 | `credits` (idempotencia de una compra), `core-financial` (el enrutador puro) | **Conectada solo con el proveedor de prueba**; las tiendas reales, **preparadas sin conectar** (§ 3) |
| **Trust & Safety** | Denuncias: `functions/src/moderation/` (`reportContent`, `moderationAdmin`), contrato `core/moderation.ts`, colecciones `reports` (cerrada al cliente) y `moderationLimits`; cliente `components/ReportSheet.tsx` + `services/moderationService.ts`. App Check: `functions/src/opciones.ts`, `config/appCheck*.ts`. Logs: `engine/sanitize.ts` | `docs/MODERATION.md`; `docs/SECURITY.md` § 7 (App Check) | `moderation`, `moderation.emulator`, `app-check`, `security`, `seguridad-11x4a`, `cabeceras-seguridad` | **Conectada**: denuncias (sin ejecutor ni evaluación con IA, `MODERATION.md` § 6) y la censura de logs. **Preparada**: App Check (`APP_CHECK_OBLIGATORIO = false`) |
| **Identity** | `functions/src/identity/` (`cuentas.ts`, `nacimiento.ts`, `compatibilidad.ts`), contratos `core/identity.ts`, `core/account-identity.ts`, `core/social-identity.ts`; colecciones `users`, `accounts`, `accountNumbers`, `entities`; cliente `utils/econtactModel.ts`, `utils/perfilCanonico.ts` | `docs/IDENTITY.md` (§ 12 cómo nace hoy, § 13 frontera con `hidi_`) | `identidad-de-cuenta`, `cuenta-identidad`, `identidad-social`, `privacidad-identidad`, `core-identity-events`, `creacion-de-perfil` | **Conectada**: `nacimientoDeCuenta` (desplegada); `identity/cuentas.ts` lo usan moderación, vídeo, WeeTalk, media y las puertas de Studio |
| **Social Graph** | Colecciones y reglas de `firestore.rules`; servicios del cliente; `functions/src/social/` | Sin documento propio (§ 2) | `econtact`, `econtact-rules.emulator`, `encuestas`, `weetalk-view-once`, `avisos-cupo`, `comunidades-siembra`, `posts-rules.emulator`, `fronteras-rules.emulator` | **Conectada** (§ 2) |
| **i18n** | `i18n/` (`idiomas.ts`, `diccionarios.ts`, `formato.ts`, `servidor.ts`, `textos/<idioma>/`), `contexts/IdiomaContext.tsx`, `locales/` (permisos de iOS); servidor `functions/src/shared/idiomaDelServidor.ts`, `textosDelServidor.ts`, `idiomaDelTexto.ts` | `docs/I18N.md` (§ 9b lo que escribe el servidor) y las guías `docs/I18N-*.md` | `i18n`, `i18n-servidor`, `i18n-servidor-fuentes`, `idioma-servidor-coherencia`, `i18n-huella`, `i18n-permisos-ios` | **Conectada**. La única puerta es `listo` en `i18n/idiomas.ts` (el árabe, `false`) |
| **Weë Studio** | Cliente: `screens/StudioScreen.tsx`, `screens/ProductionScreen.tsx`, `components/studio/`, `constants/studioExperiences.ts`, `services/filmmakerService.ts`, `services/tomaService.ts`. Servidor: `functions/src/filmmaker/`, `productions/`, `shots/`, `elements/`, `creator/toma.ts`, `creator/video.ts` | `docs/FILMMAKER.md`; `docs/INTEGRACION-PRODUCCION.md` §§ 2 y 7 | `filmmaker-modelo`, `filmmaker-navegacion`, `productions-runtime`, `f1d-generacion`, `studio-video` | **Conectada**: un clip suelto (Studio → `CreatorFlow` → `creatorRun`); `productions` y `shots`, exportadas y desplegadas. **Preparada**: Filmmaker en la app (`FILMMAKER_EN_LA_APP = false`); `elements`, exportada pero **no desplegada** (`ops/despliegue/grupos.json` → `no_se_despliegan`); la toma de un plano por `generateVideo` responde `route_unavailable` mientras `aiSettings/runtime` esté cerrada |
| **Weë Brain** | `functions/src/creator/brain.ts` (`brainChat`, `brainQuote`), `creator/brainUsage.ts`, `functions/src/brain/` (`crearBrainDeWee`), `core/brain.ts`, `runtime/pensador.ts`; colecciones `brainChats`, `brainUsage`; cliente `screens/BrainChatScreen.tsx`, `hooks/useBrainChat.ts`, `services/brainService.ts` | `docs/AI-ENGINE.md` § Weë Brain; `docs/CORE.md` § Weë Brain; `docs/RUNTIME.md` § 13 | `core-brain`, `brain-canary`, `brain-deepseek`, `brain-vivo`, `brain-contexto` | **Conectada** (desplegada; `crearBrainDeWee` en cada respuesta). **Preparada**: el camino por el conductor, solo con `aiSettings/runtime` abierta y la capacidad `text.generate` |

Las funciones exportadas (37) por módulo: `generateAvatar` (2) · `creator` (`creatorChat`, `creatorQuote`, `creatorRun`) ·
`creator/brain` (2) · `creator/video` (`generateVideo`) · `engine/webhooks` (`seedanceCallback`) · `public/postPage` ·
`engine/admin` (`engineAdmin`) · `content` (`deleteAsset`) · `social` (`votePoll`, `burnViewOnce`, `requestEContact`,
`acceptEContact`) · `identity/nacimiento` · `moderation` (2) · las puertas `elements`, `shots`, `productions` ·
`settlement/programado` (`barridoDeLiquidacion`) · `media/canary` · `credits` (9: saldo, historial, coste, `spendCredits`,
`grantCredits`, `refundCredits`, `validatePurchase`, `restorePurchase`, `creditsAdmin`) · `evals` (`evalRun`, de administración) ·
`creator/mundo` (`generateWorld`) · y dos disparadores de push definidos en `index.ts` (`sendPushNotification`,
`sendMessagePushNotification`). Todas desplegadas salvo las de `no_se_despliegan` (`ops/despliegue/grupos.json`):
`elements`, `evalRun` y `generateWorld` (lo fija `runtime-map`, prueba 5).

### 1b. El camino de una capacidad de IA desde la app (`world.generate`, misión de gobernanza, 2026-10-06)

```
APP (Weë Studio → 3D World → Crear mundo 3D)
 → Composer (utils/crearMundo3D.ts: la petición en el contrato de Weë, sin un campo de proveedor)
 → capacidad de Weë (generateWorld · world.generate, core/mundo3d.ts)
 → Runtime Gate (aiSettings/runtime: habilitada → capacidad → SU LISTA DE CUENTAS (porCapacidad) → experiencia; decidirRuntime)
 → Elegibilidad (jurisdicción del Perfil Real, solo países del catálogo; engine/jurisdiccion.ts + engine/elegibilidad.ts)
 → Router (engine/router.ts: solo modelos elegibles; si uno queda fuera, otro elegible, solo)
 → Provider (un adaptador en engine/providers/, el único que habla con la API oficial)
 → Job (Job Engine del Core por el conductor; el barrido reconcilia, materializa y liquida: el dinero y, en el libro,
   el coste de lo aceptado —aiGenerations en curso hasta su desenlace—)
 → Asset (material `world` de la cuenta, con su procedencia y sus derechos)
```

**La app nunca llama a un proveedor directamente**: no conoce ni su nombre, ni su modelo, ni su clave; solo la
capacidad de Weë y el contrato de Weë. Lo vigilan `mundo3d-app` (H1–H4: nada de la app nombra un proveedor, un modelo,
una clave ni una licencia) y `mundo3d-gobernanza` (A–G). El cupo («5 mundos que salen») y los Credits van por los
motores de siempre (`engine/limits.ts`, Credit Engine), entre la elegibilidad y el conductor.

## 2. Social Graph: lo que existe

No hay un servicio ni un documento que lo reúna: son colecciones de Firestore con sus reglas, escritas casi todas
por el cliente.

| Qué | Colección y regla (`firestore.rules`) | Quién la usa |
|---|---|---|
| Publicaciones (los reposts son publicaciones con `isRepost`/`originalPostId`; no hay colección `reposts`) | `posts`, con `pollVotes` dentro | `services/firestoreService.ts`, `hooks/useReposts.ts`; votos de encuesta por la callable `votePoll` (`social/polls.ts`) |
| Comentarios y votos | `comments`, `commentVotes`, `votes` | `firestoreService`, `voteService`, `useVote` |
| Me gusta | `likes` | `services/likesService.ts` (solo lo importa `UserProfileScreen`) |
| Seguir | `follows` | Solo reglas: en este árbol ningún archivo del cliente la usa |
| ËContact (contactos entre caras) | `econtacts` | callables `requestEContact`/`acceptEContact` (`social/econtact.ts`), `services/econtactService.ts` |
| Seguir un negocio (Weë Business) | `businessFollows` | `screens/WeeBizProfileScreen.tsx` y el hook de ËContact |
| Comunidades y miembros | `communities`, `communities/{id}/members` | `services/communityService.ts`, `hooks/useCommunities.ts` |
| Guardados | `users/{uid}/bookmarks` | `services/bookmarksService.ts`, `hooks/useBookmarks.ts` |
| WeeTalk | `conversations`, `conversations/{id}/messages` | `services/messagesService.ts`; «ver una vez» por `burnViewOnce` (`social/weetalk.ts`) |
| Avisos | `notifications` | disparadores `sendPushNotification` y `sendMessagePushNotification` (`index.ts`), textos en `social/avisos.ts` |
| Bloqueos | — | No existen: ni colección ni regla |

Todo lo anterior está conectado y sus callables y disparadores, desplegados.

## 3. Payment Router: lo que existe

- **`functions/src/payments/purchaseValidation.ts`**: una tabla de proveedores `apple`, `google`, `stripe` y `test`.
  `validatePurchase` concede los Credits con `creditEngine.grantCredits` e id `<proveedor>_<id>` (idempotente);
  `restorePurchases` existe. **Apple, Google y Stripe solo lanzan `NOT_IMPLEMENTED`**; no hay webhook de Stripe.
- **`payments/providers/test.ts`**: la compra de prueba (`priceUsd: 0`). Encendida si `CREDITS_TEST_PURCHASES` es
  `'true'`; apagada si es `'false'`; sin variable, solo en el emulador o fuera de `get-wee`. Es la única variable de
  pagos que lee el código; las de Apple, Google Play y Stripe solo aparecen en comentarios y documentos.
- **Callables** (en `credits/index.ts`, exportadas y desplegadas): `validatePurchase` (por defecto, el proveedor
  `test`) y `restorePurchase`. Los paquetes, en `credits/creditCosts.ts` (ids `zone.wee.credits.*`).
- **Cliente**: `screens/CreditStoreScreen.tsx` compra siempre con `'test'` (`creditsService.purchase`); un
  `NOT_IMPLEMENTED` o `PURCHASE_INVALID` enseña «compras próximamente». Nadie llama a `restorePurchase`.
- **Aparte, sin conectar**: un enrutador de pagos puro en `core/financial/commerce.ts` (`enrutarPago`,
  `prepararCheckout`) con una pasarela `sandbox` en `financial/index.ts` (`docs/CORE.md` § WEE Financial Core). No lo
  importa nada de producción ni está unido a `payments/`.
- **Sin suite propia**: `payments/` no tiene una prueba dedicada.

## 4. Contradicciones entre documentos y código (2026-10-01)

- `docs/RUNTIME.md` § 4 da al Router, al Gateway y al Job Engine por «NOT CONNECTED» y § 21.1 por «conectados y
  probados» (lo fueron en los canaries); el código: solo detrás de `aiSettings/runtime`, que está cerrada.
- `docs/CORE.md` § El AI Gateway dice que Brain entra por `functions/src/gateway/`; `creator/brain.ts` importa
  `engine` directamente.
- `docs/FILMMAKER.md` y el comentario de `productions/puerta.ts` dicen «sin desplegar»; `ops/produccion.json` tiene
  `productions` y `shots` desplegadas (2026-09-28).
- Comentarios que dicen «nada de producción pasa por aquí» en `runtime/conductor.ts`: el código está dentro de
  `brainChat`, `generateVideo` y `generateWorld` (aunque la puerta lo deje en `legacy`). `runtime/puerta.ts`,
  `runtime/index.ts` y `runtime/liquidacion.ts` ya lo dicen con precisión (misión de gobernanza, 2026-10-06): nada pasa
  CAMINO DEL CORE; el barrido desplegado sí compone la liquidación.
- `docs/RUNTIME.md` § 4 cita líneas de `creator/brain.ts` que ya se movieron.
- ~~`services/econtactService.ts` decía que `followsService` «sigue existiendo»~~: corregido en el cierre del 2026-10-01.
