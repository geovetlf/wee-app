# INTEGRACIÓN · el flujo extremo a extremo — anexo de evidencia

> Anexo de [`INTEGRACION-FLUJO-E2E.md`](INTEGRACION-FLUJO-E2E.md) (ronda R7 · tarea H · 2026-10-11 · base `d867774`).
> Son las **salidas tal cual** de lo que se ejecutó, recortadas solo de trazas de pila y de líneas de registro repetidas.
> Todo se ejecutó **en memoria y sin red**: sin emulador, sin proveedor, sin producción, sin `.env`. Los guiones
> (`verificar-mapa.mjs`, `sonda-destino.mjs`, `sonda-palabras.mjs`) viven fuera del repositorio, en `R7\H-mapa\`, y no escriben nada.

## A0. Cómo se montó

- **Cliente.** `functions/test/filmmaker-cliente.mjs` (el cargador que ya usan las suites) transpila al vuelo los `.ts` de la app y los
  evalúa con dobles solo para `react-native`: es el código REAL de `utils/destinoDeIntencion.ts` y de `constants/*.ts`.
- **Servidor.** `functions/lib` (compilado, el mismo que se sube) con `firebase-admin/firestore.getFirestore` sustituido por una
  Firestore en memoria (copiada de `functions/test/video-asincrono.test.mjs:62-163`; solo se ampliaron `<`, `<=`, `>`, `>=` y el orden
  por campo en `Consulta`, que pide `runtime/conversaciones.ts:71`). Reales: el Credit Engine, el router, el libro, el limitador, los
  callables (`creatorChat`, `creatorQuote`, `creatorRun`, `brainChat`, `generateVideo`), el conductor, el Job Engine, el barrendero.
  De mentira: el proveedor. Sin claves, el router cae a `mock` (modo demo); en S5 se instala un doble de DeepSeek **solo** durante S5
  (con él puesto en S4, `text.generate` deja de admitir el demo: el router pregunta a TODOS los adaptadores, `engine/router.ts:244`).
- **Instrumentos.** Las funciones que atraviesa la petición se envuelven (no se cambian) para dejar constancia del recorrido:
  `runCapability`, `engine.generate`, `engine.route`, `videoEngine.generate`, `creditEngine.{spend,complete,refund}Credits` y `adapter.run`.

## A1. La caja del Studio con 12 frases (`sonda-destino.mjs`, código REAL del cliente)

```
flags del cliente: {"FILMMAKER_EN_LA_APP":false,"MUNDO_3D_EN_LA_APP":false}

[A] destinoDeIntencion(texto, { dentroDe: "studio" }) sin puerta elegida (lo que hace alCrear):
  es | Quiero un video de 10 segundos para mi cafetería         => studio (origen=palabras)
  es | Hazme un logo para mi cafetería                          => null  -> el Studio enseña «Creando…» y «Creación lista» SIN llamar a nadie (setTimeout)
  es | Una canción relajante para estudiar                      => beauty (origen=palabras)
  es | Una receta de pasta con lo que tengo en la nevera        => beauty (origen=palabras)
  es | Quiero mejorar esta foto de mi abuela                    => photo (origen=palabras)
  es | Escribe un poema sobre el mar                            => writer (origen=palabras)
  es | Planea un viaje a Cusco de cinco días                    => null
  es | Un plan de negocio para vender velas                     => null
  es | Hola, no sé qué quiero hacer                             => null
  es | Una animación de mi gato bailando                        => studio (origen=palabras)
  en | I want a short video for my coffee shop                  => studio (origen=palabras)
  en | Make me a logo for my bakery                             => beauty (origen=palabras)

[B] con puerta declarada (entrar por Imágenes / Videos / Texto / Voz) la puerta manda:
  puerta images  => photo (origen=puerta)      puerta videos  => studio (origen=puerta)
  puerta text    => writer (origen=puerta)     puerta voice   => music (origen=puerta)

[C] `sugeridaPorBrain` (el servidor decidiendo): ¿quién lo pasa? -> ninguna pantalla; solo existe la opción en la firma.
  con sugeridaPorBrain='design' y dentroDe='studio' => null (design no cabe en studio)
  con sugeridaPorBrain='design' sin dentroDe       => design (origen=brain)
```

**Por qué `beauty`** (`sonda-palabras.mjs`): `matchExperiences` (`constants/weeExperiences.ts:368-380`) encaja una clave `k` con una palabra `w` de
≥ 3 letras si `k.startsWith(w) || w.startsWith(k)` (`:372`).

```
Una canción relajante para estudiar                  -> palabras clave de beauty que encajan: ["unas"]
Una receta de pasta con lo que tengo en la nevera    -> palabras clave de beauty que encajan: ["unas"]
Make me a logo for my bakery                         -> (diccionario inglés, `encajaEnSuIdioma`, `weeExperiences.ts:300-303`: `'makeup'.startsWith('make')` con `w.length >= 4`)
```

La clave `unas` (`constants/weeExperiences.ts:132`, junto a `uñas`) encaja con **cualquier frase en español que contenga el artículo «una»**.
Sin una puerta elegida, `StudioScreen.alCrear` toma `candidatas[0]`, la primera del registro (`destinoDeIntencion.ts:150`).

## A2. Las puertas (S1, `decidirRuntime`, `runtime/puerta.ts:156`)

Resumen de la salida (cada fila es una configuración de `aiSettings/runtime`; cada columna, qué puerta lo pregunta):

| Configuración | `brainChat` text.generate | `brainChat` text.search | `generateVideo` video.generate | `generateWorld` world.generate | `creatorRun` image.generate |
|---|---|---|---|---|---|
| sin documento (por defecto) | LEGACY (deshabilitada) | LEGACY | LEGACY | LEGACY | LEGACY |
| `{ habilitado: false, … }` | LEGACY (deshabilitada) | LEGACY | LEGACY | LEGACY | LEGACY |
| abierta solo `text.generate` para la cuenta | **CORE (abierta)** | LEGACY (capacidad_no_migrada) | LEGACY | LEGACY | LEGACY |
| abierta `text.generate` **sin lista** de cuentas | LEGACY (sin_lista_de_cuentas) | LEGACY | LEGACY | LEGACY | LEGACY |
| abierta solo `video.generate` (experiencias: studio) | LEGACY | LEGACY | **CORE (abierta)** | LEGACY | LEGACY |
| forma antigua `{capacidades, cuentas}` | LEGACY (configuracion_ilegible) | LEGACY | LEGACY | LEGACY | LEGACY |

`creatorRun`/`creatorChat`/`creatorQuote` **no llaman a `decidirRuntime`** (inventario A9): la fila de `creatorRun` es la respuesta de la puerta
si alguien le preguntara, no algo que ocurra. Fijado también por `puerta-canario` (30 ✔) y `brain-canary` (88 ✔).

## A3. La foto de Weë Brain para el especialista (S2, `assertInputImageUrl`, `creator/inputs.ts:42`)

```
  ADMITE  · users/<uid>/creator-inputs/a.jpg (lo que sube CreatorFlow)
  ADMITE  · users/<uid>/brain-attachments/a.jpg (lo que sube Weë Brain)
  RECHAZA · users/<otro>/brain-attachments/a.jpg (de otra cuenta) → bad_image_url
  RECHAZA · cubo ajeno → bad_image_url
  RECHAZA · host que no es de Weë → bad_image_url
```

Resuelve el UNKNOWN de R6 (M-14). La regla es `direccionDeLaCuenta` (`engine/http.ts:304`): host del Storage de Weë, cubo de Weë y
**cualquier** carpeta `users/<uid>/`. `uploadCreatorImage` devuelve tal cual una URL que ya está en el Storage (`isAlreadyUploaded`).

## A4. El Gateway del conductor, compuesto como `runtime/index.ts:653-662` (S3)

```
  (a) SIN resolutor de upstream → status=completed · el adaptador recibió input.upstream=undefined (llamadas al proveedor: 1)
  (b) CON resolutor → status=completed · el adaptador recibió input.upstream=[{"stepId":"a","capability":"text.generate","materialType":"text","assetId":"asset_0123…","contenido":"texto del paso anterior"}]
  (c) resolutor que no puede resolver → status=failed · error=INVALID_REQUEST/invalid_request · llamadas nuevas al proveedor: 0
```

Ninguna prueba existente cubre (a): `runtime-conductor.test.mjs` compone el Gateway **con** `upstream` por defecto (`:134`) y nadie pasa `upstream: false`.

## A5. `CreatorFlow` de punta a punta (S4, `creatorChat` → `creatorQuote` → `creatorRun`, todo en memoria)

S4a — **Weë Studio**, un vídeo con voz (el `goal` es lo que arma `StudioScreen.alCrear`: «Video cinematográfico: …texto… · controles dichos con palabras»):

```
  goal que manda la pantalla: 335 caracteres
  trabajo guardado: goal.length=300 ← RECORTADO (la pantalla mandó 335) · ¿lleva creative/adjuntos/workspace? NO: ninguno
  creatorChat → status=planned · plan=text.generate+video.generate+voice.tts · creditsEstimated=182 · demo=true
  creatorQuote(high) → creditsEstimated=222 niveles=["standard:97","high:222","max:767"]
  creatorRun → aborted · GENERATION_FAILED · No pude terminar tu creación. No te cobré: inténtalo de nuevo.
  trabajo final: status=failed · creditsCharged=0 · «No me salió bien esta vez. No te cobré…»
  pasos: text.generate:done(2cr) | video.generate:pending | voice.tts:failed
  Credit Engine: usage_auto_1… status=REFUNDED amount=-222 · saldo 5000 → 5000
  traza: spendCredits → runCapability(text.generate) → engine.generate → router.execute → mock.run(text.generate) → refundCredits
  Core: jobs=0 workflowRuns=0 jobQueue=0
```

El fallo es el guion de prueba sin «NARRACIÓN:»: `vozSinNarracion` (`creator/index.ts:640`, `creator/inputs.ts:93-105`) para el trabajo antes de pagar el vídeo.

S4d — **Weë Studio**, animar una foto (el único plan de vídeo que el modo demo puede terminar; la foto es de la carpeta de la cuenta):

```
  creatorChat → planned · plan=vision.describe+video.image_to_video · creditsEstimated=162
  creatorRun → {"jobId":"auto_3","status":"done"} · creditsCharged=162 · «✨ Listo»
  pasos: vision.describe:done(2cr) | video.image_to_video:done(160cr) · resultados: text[demo] | video[demo][url]
  Credit Engine: COMPLETED amount=-162 · saldo 5000 → 4838
  traza: spendCredits → runCapability(vision.describe) → engine.generate → router.execute → mock.run
         → videoEngine.generate → engine.generate → router.execute → mock.run(video.image_to_video) → completeCredits
  Core: jobs=0 workflowRuns=0 jobQueue=0
```

S4b — **Weë Design** por `CreatorFlow` (un logo):

```
  creatorChat → planned · plan=text.generate+image.generate · creditsEstimated=23
  creatorRun → {"jobId":"auto_3","status":"done"} · creditsCharged=23 · «✨ Listo»
  resultados: text[demo][texto] | image[demo][url]
  Credit Engine: usage_auto_3… COMPLETED amount=-23 · saldo 5000 → 4977
  libro: text.generate/mock/COMPLETED/cobrado=2 | image.generate/mock/COMPLETED/cobrado=21
  traza: spendCredits → runCapability(text.generate) → engine.generate → router.execute → mock.run → runCapability(image.generate) → … → mock.run → completeCredits
  Core: jobs=0 workflowRuns=0 jobQueue=0
```

S4c — **Weë Chef** (una receta): `creditsEstimated=5`, `done`, `creditsCharged=5`, saldo 4977 → 4972; misma traza; Core a 0.

## A6. Weë Brain, por los dos caminos, y el barrido (S5; DeepSeek es un doble)

```
  LEGACY (puerta cerrada): ruta=LEGACY motivo=deshabilitada · respuesta ok
     claves devueltas a la app: bloque,chatId,credits,demo,duplicate,messageId,sources,suggestedExperience,text · suggestedExperience=design · credits=0 · bloque={usadas:1,total:12,restantes:11}
     traza: engine.generate → router.execute → deepseek.run (DOBLE) · jobs=0 workflowRuns=0 jobQueue=0 · aiGenerations +1
  CORE (puerta abierta para la cuenta, solo text.generate): ruta=CORE motivo=abierta · respuesta ok · MISMAS claves · bloque={usadas:2,…}
     traza: engine.route (la cadena de producto) → deepseek.run (DOBLE) — sin router.execute · jobs=1 workflowRuns=1 jobQueue=0 · aiGenerations +1
     jobs/…: state=completed capability=text.generate impl=deepseek/deepseek-flash attempts=1 liquidacion=pendiente routeOrigin=cadena mode=sync maxAttempts=3
       input guardado = [contextRef, locale] → contextRef=[chatId, kind, messageId, quotedInputHash] (referencia, NO el texto)
     workflowRuns/…: state=done goal=brain.reply pasos del workflow=pensar(text.generate) · ejecución=pensar:done
  barrendero (runtime/barrendero.ts) tras el trabajo del Core: {mirados:1, liquidados:0, reembolsados:0, esperando:0, aReconciliar:0, yaEstaban:0, fallos:1}
     visto: accion=liquidar desenlace=fallo requestId=brain_m_core_0001 importe=0
     completeCredits(brain_m_core_0001, finalAmount:0) → ERROR TRANSACTION_NOT_FOUND · No existe esa operación
     segunda pasada: mirados=1 fallos=1 → el trabajo vuelve a salir en CADA pasada mientras falle
     job.liquidacion ahora=pendiente · creditTransactions/usage_brain_m_core_0001 existe? false (la respuesta 2 de 12 no cobra: no hay reserva)
  cuenta fuera de la lista (puerta abierta): ruta=LEGACY motivo=cuenta_fuera_de_la_prueba · trabajos nuevos del Core: 0
  repetir m_core_0001 en su conversación (con chatId): duplicate=true · llamadas nuevas al proveedor: 0
  repetir m_core_0001 sin chatId (borde que la app no genera: messageId nuevo por envío): DUPLICATE_REQUEST «Esa creación ya está en marcha» · llamadas nuevas: 0
```

El motivo del fallo del barrendero se lee en `creator/brain.ts:574-579` (siempre pasa `creditTransactionId` y `creditRequestId`),
`runtime/liquidacion.ts:122-137,194` (`reservaDe` acepta importe 0; `completed` ⇒ `liquidar`) y `runtime/barrendero.ts:162-167`
(un `fallo` no se marca liquidado). Documentado como «11 de cada 12 no cobran» en `RUNTIME.md` §12.6 y §13.10 (mensajes 1–11: «Asientos 0»).

## A7. `generateVideo` con la puerta cerrada (S6)

```
  generateVideo → {"status":"COMPLETED","demo":true,"credits":160,"hasUrl":true,"assetId":null}
  traza: spendCredits → videoEngine.generate → engine.generate → router.execute → mock.run(video.generate) → completeCredits
  colecciones Core: jobs=0 workflowRuns=0 (nuevos)
```

La rama del Core de `generateVideo` no se re-ejecutó aquí: la fijan `video-asincrono` (64 ✔: puerta, conductor, Job Engine, almacén,
reconciliador, barrendero y Credit Engine de verdad sobre una Firestore en memoria) y `f1d-generacion` (100 ✔).

Resumen de colecciones al terminar toda la sonda: `creatorJobs:4, aiGenerations:11, creditTransactions:8, jobs:1, workflowRuns:1, jobQueue:0, assets:0, brainChats:4, mediaObjects:0`
(el único trabajo del Core es el de la puerta abierta de S5; `assets` y `mediaObjects` a 0: un resultado de prueba no se materializa, `creator/index.ts:508`).

## A8. Pruebas existentes ejecutadas (todas ligeras, una a una, sin emulador)

56 suites, **5 310 comprobaciones ✔, 0 ✘** (`R7\H-mapa\logs\resumen-pruebas.txt`):

| Suite | ✔ | Suite | ✔ | Suite | ✔ |
|---|---|---|---|---|---|
| `runtime-map` | 166 | `core-brain` | 143 | `brain-vivo` | 108 |
| `runtime-conductor` | 121 | `core-planner` | 104 | `brain-contexto` | 54 |
| `puerta-canario` | 30 | `core-orchestrator` | 185 | `brain-deepseek` | 83 |
| `video-asincrono` | 64 | `core-workflow` | 207 | `cajas-weeai` | 52 |
| `f1d-generacion` | 100 | `core-router` | 186 | `studio-capas` | 44 |
| `idempotencia-de-cobro` | 48 | `core-gateway` | 128 | `studio-video` | 66 |
| `creator-reclamo` | 25 | `core-job` | 288 | `studio-imagen` | 34 |
| `brain-canary` | 88 | `core-content` | 108 | `studio-voz` | 50 |
| `runtime-liquidacion` | 106 | `content` | 38 | `filmmaker-navegacion` | 34 |
| `runtime-asincrono` | 188 | `job-queue` | 92 | `mundo3d-app` | 44 |
| `camino-durable` | 43 | `cola-durable` | 72 | `crear-mundo-3d` | 78 |
| `mundo3d-asincrono` | 47 | `mundo3d-costes` | 60 | `creator` | 640 |
| `plazos-y-liquidacion` | 45 | `chef-weeai` | 47 | `planner` | 37 |
| `router` | 95 | `router-parity` | 48 | `router-politica` | 36 |
| `gateway-autoridad` | 28 | `gateway-plazo` | 5 | `runtime-paridad` | 33 |
| `sombra-experiencia` | 147 | `sombra-sin-texto` | 24 | `providers` | 209 |
| `media-canary` | 107 | `credits` | 256 | `credits-weeai` | 37 |
| `proyectos-i18n` | 40 | `photo-canary` | 59 | `upstream-consumidor` | 35 |
| `continuidad-referencias` | 56 | `puente-pre-f1d` | 42 | | |

`puente-pre-f1d` (las cercas F1–F4) sigue en 42 ✔ y `git status` está limpio en `functions/src`: **no se movió ninguna cerca**, porque no se tocó ningún archivo
de producto.

## A9. Inventario estático (lectura de `functions/src` y del cliente en `d867774`)

**Quién construye o consulta el conductor** (fuera de `runtime/`):

```
creator/brain.ts:446   decidirRuntime(...)        creator/brain.ts:546   conductorDeWee(...)      creator/brain.ts:559   pensadorSobreConductor(...)
creator/video.ts:398   decidirRuntime(...)        creator/video.ts:579   conductorDeWee(...)      creator/video.ts:586   pedirMedio(...)
creator/mundo.ts:243   decidirRuntime(...)        creator/mundo.ts:482   conductorDeWee(...)      creator/mundo.ts:489   pedirMedio(...)
creator/index.ts       (creatorChat, creatorQuote, creatorRun): ninguna mención de runtime, conductor ni orchestr
```

**Quién entra en el router** (`engine.generate`, `engine.route`, `runCapability`):

```
engine.generate:  gateway/index.ts:30 · creator/brain.ts:491 · creator/index.ts:428 (sombra) · engine/video.ts:151 · evals/dominios/router.ts:32
engine.route:     creator/credits.ts:175 · creator/mundo.ts:255 · engine/disponibilidad.ts:84 · engine/video.ts:157 · runtime/index.ts:90
runCapability:    creator/index.ts:735,744,767 · creator/planner.ts:175
```

**Composiciones del Core sin llamador fuera del Core** (importadores desde fuera de `core/` y de su propia carpeta):

```
planner/index.ts       ← creator/planner.ts:7 (solo disponibilidadDeWee) · creator/sombra.ts:19 · skills/index.ts:15
orchestrator/index.ts  ← runtime/conductor.ts:40
workflow/index.ts      ← nadie                      router/index.ts, router/politica.ts ← nadie (router/index.ts solo importa registry)
skills/index.ts        ← nadie                      financial/index.ts ← nadie
job/index.ts           ← media/canary.ts, runtime/conductor.ts, runtime/ejecutor.ts, runtime/index.ts
barrerRecuperables     ← definición job/worker.ts:213 y un comentario (runtime/cola.ts:28); 0 llamadores
runtime/cola-durable.ts ← 0 importadores            `limites:` pasado a conductorDeWee en brain.ts/video.ts/mundo.ts ← nunca
```

**Callables exportados frente al cliente** (`functions/src/index.ts` exporta 38; los nombres que aparecen entre comillas en `services/`, `hooks/`, `screens/`…):

| Con llamador en el cliente | Sin llamador en el cliente |
|---|---|
| `creatorChat`, `creatorQuote`, `creatorRun` (`creatorService.ts`) · `brainChat`, `brainQuote` (`brainService.ts`) · `generateVideo` (`videoService.ts`, solo `useTomaDePlano`) · `generateWorld` (`mundoService.ts`, solo `Mundo3DScreen`) · `productions` (`filmmakerService.ts`) · `shots` (`tomaService.ts:59`) · `deleteAsset` · `getCredits*`, `getCreditCost`, `validatePurchase`, `spendCredits` (cerrada a clientes) · `reportContent` · `votePoll` · `burnViewOnce` · `requestEContact`, `acceptEContact` · `generateAvatarWithGemini`, `avatarReplacement` · `engineAdmin` · `disponibilidadDeCapacidades` | `elements` (los textos «elements» del cliente son el espejo del dominio, no una llamada) · `evalRun` · `seedanceCallback` (webhook) · `publicPostPage` (rewrite de hosting) · `nacimientoDeCuenta` (disparador) · `moderationAdmin` · `barridoDeLiquidacion` (programada) · `mediaCanary` · `grantCredits`, `refundCredits`, `restorePurchase`, `creditsAdmin` · `sendPushNotification`, `sendMessagePushNotification` (disparadores) |

**Banderas del cliente** (`constants/studioExperiences.ts:418,446`, `constants/designReferencia.ts:40`): `FILMMAKER_EN_LA_APP = false`, `MUNDO_3D_EN_LA_APP = false`,
`DESIGN_REFERENCIA_EN_LA_APP = false`. Con ellas cerradas, `App.tsx:215-236` no registra los enlaces de `Production`, `Mundo3D` ni `DesignReferencia`, y
`StudioScreen.alCrear` no navega a ninguna. Las rutas `Production` y `Mundo3D` siguen registradas en la pila (`navigation/MainStackNavigator.tsx:370-371`).

**Lo desplegado frente a `d867774`** (`ops/produccion.json`, documental; `git diff --stat <commit vivo> HEAD`): `brainChat` `2da2881` (sin `contextoParaBrain`:
0 apariciones; +143/−24 en `creator/brain.ts`) · `creatorChat` `05ab31b` y `creatorRun` `5d87f1f` (+157/−23 y +161/−24 en `creator/index.ts`) ·
`generateVideo` `7f11d51` (+33/−1 en `creator/video.ts`) · `barridoDeLiquidacion` `96b3f7a` (sin el cierre del coste de RUNTIME §25c).
