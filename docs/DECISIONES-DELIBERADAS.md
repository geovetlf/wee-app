# Decisiones deliberadas de Weë

Lo que un revisor —una persona, Claude o el revisor automático ([`REVISION.md`](REVISION.md),
`ops/revision/`)— **no debe tratar automáticamente como defecto**, porque es una decisión
tomada con su razón, o una deuda ya escrita con su sitio y su dueño.

**Esta lista no sirve para esconder problemas.** Cada entrada dice qué la convertiría en
defecto: si eso ocurre, se informa como defecto aunque la entrada exista. Y no todas son
iguales:

| Estado | Qué significa para quien revisa |
|---|---|
| **DECIDIDA** | Es así a propósito. No se informa salvo que se cumpla su condición de defecto |
| **DEUDA DECLARADA** | Es un problema conocido, escrito y acotado. **No es correcto**: no se informa como hallazgo nuevo, pero sí cualquier cosa que lo agrave o lo extienda |
| **PENDIENTE DEL DUEÑO** | Nadie la ha aceptado. Se informa como riesgo abierto que remite a [`DECISIONES-PENDIENTES.md`](DECISIONES-PENDIENTES.md), no como algo que arreglar sin él |
| **EN REVISIÓN** | Se está investigando. Ni defecto ni decisión todavía |

**Cómo entra una decisión aquí:** con su razón comprobable y su evidencia (documento y sección,
commit o archivo), su alcance y la condición que la convertiría en defecto. Sin evidencia, no
entra (al final, las que se descartaron por eso). Las referencias van por nombre de símbolo o
de sección, no por número de línea, porque las líneas se mueven.

Revisado el 2026-10-01 sobre `i18n/da-dk` (`d306a58` + cambios sin commit).

---

## Arquitectura y código

### DD-01 · `LandingScreen` y `WebLandingScreen` son dos pantallas

- **Decisión:** el Home tiene una pantalla para web y otra para nativo.
- **Razón:** la web lleva una versión simplificada; `CLAUDE.md` § Stack admite divergencias puntuales con `Platform.OS`.
- **Evidencia:** `navigation/HomeStackNavigator.tsx` (`Platform.OS === 'web' ? WebLandingScreen : LandingScreen`, comentario «Use simplified screen for web»); nace en `084923e` (2026-04-16); `functions/test/home.test.mjs` 36, 52 y 109 exigen el mismo cableado en las dos.
- **Alcance:** solo la ruta `Landing` del Home.
- **Sería defecto si:** una de las dos recibe una función o un arreglo que la otra no tiene sin razón de plataforma, o las pruebas dejan de mirar las dos.
- **Estado:** DECIDIDA.

### DD-02 · Dos routers y dos almacenes de trabajos conviven

- **Decisión:** producción enruta con `engine/router.ts` y guarda trabajos en `creatorJobs`; el Router y el Job Engine del Core (`core/router.ts`, `core/job.ts`, almacén `jobs/`) existen y solo los usa el conductor, detrás de una puerta cerrada.
- **Razón:** el Router del Core, solo, elegiría otro modelo en 15 de 28 capacidades; con la capa de compatibilidad (`runtime/resolucion.ts`) coincide en 21 de 21. Migrar sin esa garantía cambiaría proveedores en silencio.
- **Evidencia:** [`RUNTIME.md`](RUNTIME.md) § 3 (tabla), § 4 («Router», «Job Engine»), § 6 (P2 y P2b); `CLAUDE.md` § Forma de trabajar 10.
- **Alcance:** Router, Gateway y Job Engine.
- **Sería defecto si:** aparece un tercer router o almacén; código legacy llama al Router del Core fuera del conductor; una capacidad pasa al Core sin autorización explícita; o la puerta `aiSettings/runtime` se abre por defecto.
- **Estado:** DECIDIDA (migración por fases).

### DD-03 · Composiciones del Core preparadas y NO conectadas

- **Decisión:** `functions/src/router/`, `functions/src/workflow/`, `functions/src/skills/` y `functions/src/financial/` existen y ninguna ruta de producción los importa (comprobado: ningún archivo de `functions/src` fuera de cada carpeta importa su `index.ts`).
- **Razón:** son las piezas del runtime objetivo, construidas y probadas antes de conectarlas; `skills/` tiene el mecanismo y el catálogo vacío a propósito.
- **Evidencia:** [`RUNTIME.md`](RUNTIME.md) § 3 («Financial NOT CONNECTED — `financial/index.ts` no lo carga nadie»), § 4 («Workflow y Orchestrator»: «Las composiciones del Core no las carga ninguna ruta de producción»), § 7; [`CAPABILITY-MAP.md`](CAPABILITY-MAP.md) § A («mecanismo listo, catálogo vacío a propósito»).
- **Alcance:** esas cuatro carpetas y, desde el cierre del 2026-10-01, también `functions/src/media/` (Media Cloud: subida, entrega, proceso, recolección, migración, uso, reconciliación) y `functions/src/runtime/cola*.ts` + `runtime/camino-durable` (la cola durable del Job Engine). Esas dos no eran restos: sus commits lo dicen —`53d56ea` «Nada conectado: ningún archivo lo importa, `index.ts` no lo exporta y no hay infraestructura creada», `1e26ac0` «Nada de esto está conectado. No hay Function, no hay programador, no hay puerta: el GC no corre», `f0743a2`, `85fca5f` y `d19f3c8` en los mismos términos— y la cadena las ejecuta (`media-*`, `cola-durable`, `camino-durable`); [`MAPA-DE-FRONTERAS.md`](MAPA-DE-FRONTERAS.md) las marca «Preparada». `falso.ts`, `fuente-falsa.ts` y `procesador-falso.ts` son dobles de prueba que viven en `src` a propósito.
- **Sería defecto si:** una ruta de producción empieza a cargarlas sin la autorización de `CLAUDE.md` § 10, o divergen de sus contratos sin que fallen sus pruebas.
- **Estado:** DECIDIDA. **Excepciones que NO están cubiertas:** `engine/pipelines/drama.ts` y `router/politica.ts` (ver «No son decisiones deliberadas»).

### DD-04 · `hidi_` y `profileType: 'hidi'` son datos heredados

- **Decisión:** el Perfil Weë se guarda con el identificador de la época HideTok y no se renombra.
- **Razón:** renombrarlo es una migración de datos (usuarios, publicaciones, seguimientos, conversaciones, votos, Storage) y de reglas sin nada visible a cambio.
- **Evidencia:** `CLAUDE.md` § Mapa de nombres («Perfil Weë»); [`IDENTITY.md`](IDENTITY.md) § 13; `utils/econtactModel.ts` (`identidadWeeDe`, `cuentaDeIdentidad`); `functions/src/identity/compatibilidad.ts`; inventario en [`LEGADO-HIDETOK.md`](LEGADO-HIDETOK.md) § 5.3.
- **Alcance:** el identificador guardado. Nunca el vocabulario visible.
- **Sería defecto si:** «Hidi» aparece como texto de interfaz (lo caza `econtact.test.mjs` 288); código nuevo compone el prefijo a mano en vez de usar `identidadWeeDe` (las cuatro claves de caché de `contexts/UserProfileContext.tsx` que lo hacían se corrigieron en el cierre del 2026-10-01); o alguien deduce la cuenta quitando el prefijo en vez de leer `linkedAccountId`.
- **Estado:** DECIDIDA.

### DD-05 · Espejos generados de Filmmaker en el cliente

- **Decisión:** `services/filmmaker/espejo/**` (16 archivos) es código duplicado del servidor, generado.
- **Razón:** Metro deja `functions/` fuera del bundle y la pantalla de producción necesita el dominio entero; escribirlo otra vez serían dos verdades.
- **Evidencia:** cabecera «GENERADO por scripts/espejo-filmmaker.mjs … no se edita a mano» en los 16; `scripts/espejo-filmmaker.mjs`; `functions/test/filmmaker-espejo.test.mjs`.
- **Alcance:** esa carpeta.
- **Sería defecto si:** se edita a mano, o el espejo deja de coincidir con `functions/src/filmmaker/` sin que falle su prueba.
- **Estado:** DECIDIDA.

### DD-06 · `utils/destinoDeIntencion.ts` no es un router de IA

- **Decisión:** elige entre la sugerencia de Weë Brain (`suggestedExperience`) y `matchExperiences`, y dice qué contexto se lleva al destino.
- **Razón:** la caja de Weë Studio tiene que responder al toque mientras el servidor no contesta; no añade un tercer resolutor.
- **Evidencia:** su cabecera («Esto NO es un router»: sin palabras clave nuevas, sin modelo, sin proveedor, sin llamada a ninguna IA); `CLAUDE.md` § 10.
- **Alcance:** la caja de Weë Studio (`screens/StudioScreen.tsx`).
- **Sería defecto si:** gana palabras clave propias, un modelo o una llamada a IA.
- **Estado:** DECIDIDA.

### DD-07 · Dos rutas llamadas `Create`

- **Decisión:** la pestaña `Create` de la barra inferior es un marcador sin pantalla; el compositor es la ruta `Create` de la pila principal.
- **Razón:** el + abre la hoja Crear (`CreateSheet`); la pestaña solo reserva el hueco y, si alguien llega por URL, devuelve al inicio.
- **Evidencia:** `navigation/TabNavigator.tsx` (`CreateTabPlaceholder` y su comentario); `navigation/MainStackNavigator.tsx` (`<Stack.Screen name="Create" component={CreateWrapper}>`).
- **Sería defecto si:** el marcador pinta contenido, o navegar a `Create` acaba en el que no toca.
- **Estado:** DECIDIDA.

## IA

### DD-08 · Puertas cerradas por defecto

- **Decisión:** varias capacidades existen y están apagadas hasta que el dueño las abra:
  - `aiSettings/runtime` (el conductor del Core; TRES puertas, cada una con su `CAPACIDAD_DEL_CANARY`: `creator/brain.ts`, `creator/video.ts` y `creator/mundo.ts` —la tercera, `generateWorld` → `world.generate`, asíncrona y sin desplegar, confirmada por el dueño el 2026-10-06—; la del mundo exige además lista de cuentas, `LISTA_DE_CUENTAS_OBLIGATORIA`: sin lista o con la lista vacía, para nadie);
  - `aiSettings/sombra` (la sombra del plan; sin comodín);
  - `FILMMAKER_EN_LA_APP = false` (`constants/studioExperiences.ts`);
  - `MUNDO_3D_EN_LA_APP = false` (`constants/studioExperiences.ts`): Weë Studio → 3D World → «Crear mundo 3D» se ve, bloqueada con su motivo, sin pantalla ni enlace;
  - App Check preparado y no exigido (`APP_CHECK_OBLIGATORIO = false`, `functions/src/opciones.ts`; `config/appCheck.web.ts` sin clave no hace nada);
  - el interruptor de parada de la IA `aiSettings/global.iaDetenida`, **apagado** por defecto (la IA funciona; encenderlo detiene toda generación nueva).
- **Razón:** cada una espera una decisión o una medida del dueño.
- **Evidencia:** `CLAUDE.md` § 10; [`RUNTIME.md`](RUNTIME.md) §§ 3-4, 13 y 25; [`3D-EXPERIENCIA.md`](3D-EXPERIENCIA.md); `functions/test/mundo3d-gobernanza.test.mjs`; [`SECURITY.md`](SECURITY.md) § 7; [`AI-ENGINE.md`](AI-ENGINE.md) («El interruptor de la IA»); `engine/registry.ts` (`iaDetenida: false`); [`DECISIONES-PENDIENTES.md`](DECISIONES-PENDIENTES.md) («Lanzar Weë Filmmaker»).
- **Sería defecto si:** una puerta se abre por defecto o para todos sin lista de cuentas (para el mundo, además, si se abre sin lista o con la lista vacía); el código la rodea; la configuración amplía lo que una puerta declara en su código, convierte una puerta en otra, habilita una capacidad no declarada u otro proveedor o modelo; o aparece una cuarta puerta sin autorización explícita.
- **Estado:** DECIDIDA. App Check apagado **además** agrava DD-18 (pendiente).

### DD-09 · Weë Brain fijado a DeepSeek, sin respaldo

- **Decisión:** Weë Brain pide DeepSeek por nombre (`prefs.modelId` + `allowedProviders: ['deepseek']`); DeepSeek no está en ninguna cadena por defecto.
- **Razón:** coste; y un respaldo que nadie eligió es un cambio de proveedor silencioso. Si DeepSeek cae, Brain falla y se ve.
- **Evidencia:** `engine/registry.ts` (comentario «DEEPSEEK NO ESTÁ AQUÍ, Y ES A PROPÓSITO», decisión del 2026-09-16); `creator/brain.ts` (`MODELO_DE_BRAIN`); `functions/test/brain-deepseek.test.mjs`.
- **Sería defecto si:** DeepSeek entra como respaldo de otra cadena, o Brain cambia de proveedor sin decirlo.
- **Estado:** DECIDIDA.

### DD-10 · El vídeo es solo Seedance (2.5 / 2.0), sin respaldo

- **Evidencia:** `CLAUDE.md` § Forma de trabajar 6; [`AI-ENGINE.md`](AI-ENGINE.md) § «Weë Video Engine» (decisión del 2026-09-07).
- **Razón:** decisión de producto: una sola familia por la API oficial de BytePlus ModelArk.
- **Sería defecto si:** aparece Kling, Runway, Veo u otro modelo de vídeo, aunque sea como respaldo.
- **Estado:** DECIDIDA.

### DD-11 · Weë Music sin conectar

- **Evidencia:** `CLAUDE.md` § Forma de trabajar 5 y 6 (ni Suno ni otra API sin licencia oficial; la interfaz queda intacta).
- **Sería defecto si:** se conecta una API musical sin decisión, o se rehace o se quita su interfaz.
- **Estado:** DECIDIDA.

### DD-12 · El avatar habla con Gemini fuera de un adaptador (`vertexAI.ts`)

- **Decisión:** `generateAvatar.ts` → `vertexAI.ts` llama al proveedor sin router, sin límites, sin respaldo y sin fila en `aiGenerations`. Cobra bien (Credit Engine).
- **Evidencia:** [`RUNTIME.md`](RUNTIME.md) § 4 («La única duplicación de runtime que existe hoy») y § 11.1 (fila «Avatar», riesgo ALTO); `functions/test/runtime-map.test.mjs` 104 y 105 lo acotan a ese único archivo y ese único llamador.
- **Sería defecto si:** aparece otra llamada a un proveedor fuera de `engine/providers/`, o `vertexAI.ts` gana otro llamador.
- **Estado:** DEUDA DECLARADA (su arreglo es un adaptador; no se migra antes de que el conductor garantice Credits y plazos).

### DD-13 · `seedanceCallback` se autentica con un testigo en la URL

- **Decisión:** el webhook de Seedance compara un testigo de la URL en tiempo constante; no comprueba firma.
- **Razón:** ModelArk no publica HMAC ni firma para sus avisos; no se inventa una que no existe. El hueco para enchufarla está marcado (`comprobarFirma`).
- **Evidencia:** `functions/src/engine/webhooks.ts` («Sobre la firma que no hay», `mismoTestigo`); `functions/test/webhook-seedance.test.mjs`.
- **Sería defecto si:** la comparación deja de ser de tiempo constante, el testigo aparece en un registro, el endpoint acepta sin testigo, o el proveedor publica una firma y no se comprueba.
- **Estado:** DECIDIDA.

### DD-14 · `templates.brain` sigue siendo una plantilla de Workplace

- **Evidencia:** [`CORE.md`](CORE.md) (deudas de fases cerradas: «la plantilla `templates.brain` … otro precio (`ai_text`), otra cadena de proveedores y sin idioma — deuda declarada de Fases 4/5»).
- **Sería defecto si:** se le añaden usos nuevos o diverge más del contrato de `core/brain.ts`.
- **Estado:** DEUDA DECLARADA (no aceptada como correcta).

## Datos y seguridad

### DD-15 · `users` y `posts` se leen sin sesión

- **Decisión:** `match /users/{userId}` y `match /posts/{postId}` tienen `allow read: if true`.
- **Razón:** el muro pinta a quien publicó incluso sin sesión, y la página pública de una publicación se ve sin cuenta. Lo privado de la cuenta vive en `users/{id}/private/account` y el token en `pushTokens/{uid}`; ningún cliente puede volver a escribir esos campos en el perfil público (`accountFields`).
- **Evidencia:** `firestore.rules` (comentarios «LO DE LA CUENTA NO VA EN EL PERFIL PÚBLICO» y «⚠ DEUDA CONOCIDA: ESTE DOCUMENTO MEZCLA LA CUENTA Y EL PERFIL»); `scripts/limpiar-cuenta-en-users.mjs` (limpieza de los documentos antiguos, con autorización aparte).
- **Sería defecto si:** un campo de la cuenta vuelve a poder escribirse en `users/{id}`; o llegan las publicaciones privadas (`isPrivate: true`, ya obligatorio de declarar) y la lectura de `posts` sigue abierta.
- **Estado:** DECIDIDA (lectura pública) + DEUDA DECLARADA (`linkedAccountId`, `creditsBalance` y los campos antiguos aún comparten documento; se arregla separando, no con una regla).

### DD-16 · Contadores que mueve el cliente, acotados

- **Decisión:** likes, comentarios, miembros, seguidores y demás contadores los mueve el cliente con `increment()`, y las reglas solo dejan moverlos de uno en uno, enteros y nunca bajo cero (`contadorSano`). `auraScore` y `reviewCount` de un negocio solo se acotan por rango (`contadoresDelNegocioSanos`), porque se recalculan.
- **Razón:** contarlos en el servidor es de otra fase; esto acota el daño a lo que hace la operación legítima.
- **Evidencia:** `firestore.rules` (`contadorSano`, `contadoresDelNegocioSanos` y sus comentarios).
- **Sería defecto si:** un contador nuevo entra sin `contadorSano`, o uno acepta saltos distintos de ±1.
- **Estado:** DEUDA DECLARADA (acotada, no resuelta).

### DD-17 · Payment Router y Financial Core: solo contrato

- **Decisión:** no hay ninguna pasarela real; existe el contrato y una pasarela de pruebas, `sandbox`. Lo que cobra hoy es `credits/creditEngine.ts`.
- **Evidencia:** [`CORE.md`](CORE.md) § «WEE Financial Core» («Por dónde se cobra», «Ninguna pasarela real, y una de mentira»); [`RUNTIME.md`](RUNTIME.md) § 3.
- **Sería defecto si:** aparecen SDK, claves o endpoints de una pasarela fuera de un adaptador, o algo cobra fuera del Credit Engine.
- **Estado:** DECIDIDA.

### DD-18 · 240 Credits de bienvenida también a cuentas anónimas

- **No es una decisión aceptada.** Hoy cada cuenta nueva, también la de invitado, recibe 240 Credits con App Check apagado: es el vector de abuso más barato.
- **Evidencia:** [`DECISIONES-PENDIENTES.md`](DECISIONES-PENDIENTES.md) («Bienvenida de cuentas anónimas»); `CLAUDE.md` § Mapa de nombres («240 de bienvenida»).
- **Para quien revisa:** se informa como riesgo abierto que remite al dueño; no se «arregla» sin él.
- **Estado:** PENDIENTE DEL DUEÑO.

## Idioma e interfaz

### DD-19 · Prompts internos y textos del servidor en español

- **Decisión:** los prompts internos, los textos que guarda el servidor y las marcas que la app lee (`IMAGEN:`, `PROBAR:`, `NARRACIÓN:`…) se escriben en español; la app los reconoce (`i18n/servidor.ts`) y los pinta en el idioma activo; a la IA se le pide la salida en el idioma de la persona (`instruccionDeSalida`). Las páginas estáticas de `public/` están en español y no pasan por la capa de idioma.
- **Evidencia:** [`I18N.md`](I18N.md) § 9 (tabla) y § 9b; `functions/src/creator/prompts.ts`; `functions/test/i18n-servidor.test.mjs` e `i18n-servidor-fuentes.test.mjs`.
- **Sería defecto si:** una frase del servidor llega a pantalla sin reconocerse, un prompt interno se le enseña a la persona, o una llamada a la IA sale sin el idioma de quien la pide.
- **Estado:** DECIDIDA.

### DD-20 · Las tres frases de `ErrorBoundary` no usan `t()`

- **Razón:** tienen que funcionar aunque la capa de idioma haya reventado.
- **Evidencia:** [`I18N.md`](I18N.md) § 9; `functions/test/i18n.test.mjs` 41c (una fila por diccionario registrado).
- **Sería defecto si:** falta la fila de un idioma registrado, o la pantalla de error empieza a depender del traductor.
- **Estado:** DECIDIDA.

### DD-21 · `window.confirm` en web, con los botones en el idioma del navegador

- **Razón:** en React Native Web `Alert.alert` no muestra nada; `window.confirm` pone sus propios botones y no deja cambiarlos. Sustituirlo por una ventana propia sería rediseñar, no traducir. El título y el mensaje sí van traducidos.
- **Evidencia:** `utils/notify.ts` (`confirmAction` y su comentario).
- **Sería defecto si:** el título o el mensaje llegan sin traducir.
- **Estado:** DECIDIDA.

### DD-22 · La espera de las fuentes es `#0A0A0A`

- **Razón:** es el color del splash (`app.json` → `splash.backgroundColor`); en blanco había un fogonazo entre el splash y la app.
- **Evidencia:** `App.tsx` (comentario «LA ESPERA DE LAS FUENTES SE PINTA DEL COLOR DEL SPLASH»; usa `CustomDarkTheme.colors.background`).
- **Sería defecto si:** esa superficie se queda más allá de la carga de las fuentes, o deja de coincidir con el splash.
- **Estado:** DECIDIDA.

### DD-23 · Perfil Real blanco, Perfil Weë oscuro

- **Evidencia:** `CLAUDE.md` § Arquitectura (decisión del usuario, 2026-09-05: «No "corregirlo"»); [`UX.md`](UX.md) § 14.
- **Sería defecto si:** el tema no sigue al perfil activo, o aparece estética oscura fuera del Perfil Weë.
- **Estado:** DECIDIDA.

## Operación

### DD-24 · `.firebaserc` → `default` es producción

- **Decisión:** `get-wee` es el único proyecto real y es `default`; `wee-dev-geovet` existe y no se usa. Lo local corre en emuladores `demo-*`.
- **Evidencia:** `CLAUDE.md` § Firebase (decisión del 2026-09-13); `README.md` § Entornos; `.firebaserc`; el `predeploy` `scripts/solo-desde-el-workflow.mjs` rechaza cualquier despliegue fuera del workflow; `functions/test/_emulador.mjs` exige `demo-*`.
- **Sería defecto si:** un despliegue puede salir de un portátil o de un worktree, o una prueba puede correr contra un proyecto que no es `demo-*`.
- **Estado:** DECIDIDA.

### DD-25 · `rellenarTexto` existe dos veces, a propósito

- **Decisión:** la página pública (`functions/src/public/postPageHtml.ts`) tiene su propia copia de `rellenarTexto` en lugar de importar la de `functions/src/shared/idiomaDelServidor.ts`.
- **Razón:** ese archivo «no importa nada» para que sus pruebas lo transpilen y lo ejecuten solo, sin levantar Firebase (lo dice su cabecera).
- **Evidencia:** la cabecera de `postPageHtml.ts`; `functions/test/pagina-publica.test.mjs`; y `functions/test/idioma-servidor-coherencia.test.mjs` #6, que comprueba que las dos copias dan lo mismo (revisión post-auditoría 2026-10-01).
- **Sería defecto si:** las dos copias se comportan distinto, o aparece una tercera.
- **Estado:** DECIDIDA.

---

## No son decisiones deliberadas

Candidatas que se revisaron y **no** entran, con el porqué. Si aparecen en una revisión, se
tratan como lo que dice la última columna.

| Candidata | Por qué no entra | Cómo se trata |
|---|---|---|
| `engine/pipelines/drama.ts` sin conectar | [`RUNTIME.md`](RUNTIME.md) § 9: «no lo importa nada y no tiene pruebas … Candidato a retirada, con aprobación». No es una decisión de conservarlo | Retirada pendiente de aprobación |
| `router/politica.ts` frente a `runtime/resolucion.ts` | Investigado en la revisión post-auditoría (2026-10-01): **no es accidental**. Son dos piezas para la misma pregunta —que el Router del Core obedezca la cadena de producto—: S6-C (`529bec1`, `5ecebbd`) envuelve el registro y no la usa nadie fuera de sus pruebas; el conductor usa `resolucion.ts` (F12-D). Divergen en un detalle (`allowedProviders`). Escrito en [`RUNTIME.md`](RUNTIME.md) § 11.11 | DEUDA DECLARADA: antes de conectar `router/`, se elige UNA y se resuelve la divergencia; no se fusionan ahora porque fusionarlas es tocar el conductor |
| El tamaño de `core/job.ts` (2.702 líneas hoy) | [`RUNTIME.md`](RUNTIME.md) § 4 solo lo describe (2.616 cuando se midió); no hay ninguna decisión escrita que lo acepte | Observación de mantenimiento, sin decisión |
| `public/app.html` | Mini-cliente heredado que escribía en producción fuera de la capa de servicios; nada vivo lo enlazaba | RETIRADO en el cierre del 2026-10-01 ([`LEGADO-HIDETOK.md`](LEGADO-HIDETOK.md) § 7). Sigue servido en `get-wee` hasta el próximo despliegue de `hosting:get-wee` |
| El Home que se monta hoy frente al de [`UX.md`](UX.md) § 16 | Ninguno de los dos está confirmado: `CLAUDE.md` § Arquitectura lo deja pendiente del dueño | PENDIENTE DEL DUEÑO |
