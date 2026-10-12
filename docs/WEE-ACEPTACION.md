# Weë — escenarios de aceptación de Weë Design y de la preparación de Weë Chef

**Qué es.** El catálogo priorizado de lo que una persona tiene que poder hacer en Weë Design y en Weë Chef, con **cómo se
comprueba hoy cada cosa** y qué falta para poder comprobarla. Comprobado sobre `d867774` (ronda R7, 2026-10-11, tarea J).
Cada escenario lleva un id (`ACE-D-nn` Design, `ACE-C-nn` Chef, `ACE-T-nn` transversal) y las pruebas nuevas lo citan en el
nombre de cada comprobación: buscar el id en `functions/test/aceptacion-*.test.mjs` lleva a lo que lo vigila.

**Qué no es.** No es una auditoría: Design lo cierra la tarea F (`docs/WEE-DESIGN-CIERRE.md`), Chef lo especifica la tarea G
(`docs/WEE-CHEF-ESPECIFICACION.md`, con sus `AC-nn` y `D-CHEF-n`) y el camino de punta a punta lo mapea la H
(`docs/INTEGRACION-FLUJO-E2E.md`, con sus `B-nn`). Esos tres documentos son de **otras ramas de la misma ronda** y, mientras no se
fusionen, no existen en esta: se citan por sus ids. Aquí se **cruza** con ellas —cada fila dice qué id suyo le corresponde— y se
añade lo que ninguna tenía: **ejecutar** los recorridos de la persona.

## 0. Cómo se lee

**Cómo se comprueba cada escenario** (las letras salen del encargo de la ronda):

| Letra | Qué es | Coste |
|---|---|---|
| **a** | Una prueba que YA existe y se puede reutilizar (se da `archivo:línea` y qué fija) | Ligera: `node functions/test/<x>.test.mjs` |
| **b** | Una prueba NUEVA de esta ronda, aislada y determinista (`aceptacion-*.test.mjs`) | Ligera, sin red ni emulador |
| **c** | Requiere un emulador de Firebase (`demo-wee`) | PESADA: Java 21, un emulador cada vez, 3–4 min |
| **d** | Requiere un navegador, un servidor de desarrollo o un dispositivo | PESADA: Expo web o Android, una persona delante |
| **e** | Requiere un proveedor real o producción | No ejecutable en esta ronda: gasto real, claves, decisión del dueño |

**Estado hoy:** **PASA** (lo comprueba una prueba que se ejecuta) · **PARCIAL** (una parte pasa, otra no) · **HUECO** (se
reprodujo con código de verdad que hoy NO se cumple; entre corchetes el id del hueco, que una prueba vigila) · **NO SOPORTADO**
(no existe y es decisión de producto, y la pantalla no lo promete) · **SIN VERIFICAR** (solo se comprueba con c, d o e).

**Prioridad:** **P0** dinero, seguridad o «sin esto el flujo principal no funciona» · **P1** flujo principal con la experiencia
degradada · **P2** calidad de la experiencia · **P3** futuro.

**Huecos conocidos.** Un hueco es un escenario que hoy no se cumple y que ya está medido. La prueba lo escribe como lo que
DEBERÍA pasar y da por bueno que no pase (`⚠ HUECO CONOCIDO`); si alguien lo arregla, la prueba **falla a propósito**
(`✘ HUECO CERRADO`) para que se marque PASA aquí y se convierta en una comprobación normal. §7 lo explica.

**BLOCKED — HUMAN DECISION.** Así empieza el nombre de una comprobación que **fija el comportamiento de hoy de algo que espera una
decisión humana** (el dueño o la tarea que lo cierra): cuando se decida, se **invierte solo esa**, y ninguna otra del conjunto
depende del resultado. Hoy son dos, y las dos están en su propia comprobación: `ACE-C-09` (recorte a 300 caracteres: H `B-03 i`) y
la unión «idea (ajustes)» de `aceptacion-pantallas` C (el mismo `B-03 i`). Eran tres: `ACE-D-06` («Crear» de Design es una demostración: H `B-01`)
se cerró con el puente de `docs/WEE-DESIGN-PUENTE.md`, que trae sus propias comprobaciones de este tipo (D1 y D7: ningún preset; D6: las referencias no viajan).

## 1. El framework de pruebas que hay (y se usa de verdad)

Nada de lo de abajo es nuevo: se reutiliza todo. **No hay** Jest, Playwright, Detox, Cypress ni `react-test-renderer`, y esta
ronda no añadió ninguno.

| Qué | Cómo se usa | Dónde |
|---|---|---|
| Suites `node` sobre el servidor compilado | `node functions/test/<x>.test.mjs` (necesita `npm --prefix functions run build`: leen `functions/lib`). Cada una cuenta con `check(nombre, cond)` y sale con 1 si algo falla. 300 están en la cadena de `npm test`; el corredor `_cadena.mjs` las lanza de 4 en 4 y repite una vez, en solitario, la que falle con carga (440 s, PESADO) | `functions/test/*.test.mjs` |
| Pruebas de estructura y texto de la app | Leen el `.tsx` y comprueban con expresiones regulares que la pantalla tiene la forma acordada (`chef-weeai`, `cajas-weeai`, `ajustes-weeai`, `credits-weeai`…). Cada una lleva su `CONTROL:` que demuestra que el detector muerde | las mismas |
| El código de la app ejecutado en Node | `crearCargador` (`filmmaker-cliente.mjs`) transpila al vuelo un `.ts/.tsx` y sustituye por dobles lo que no es de Weë (React Native, Firebase, navegación) | `functions/test/filmmaker-cliente.mjs` |
| Pantallas dibujadas con `react-dom/server` | Es React, ya instalado: se dibuja la pantalla con dobles mínimos de React Native y se llama a lo que haría un dedo (`filmmaker-ui`, `f1d-cliente`, `composer-entry`). **Esta ronda** lo ordena en un entorno reutilizable | `_pantallas.mjs` (nuevo) |
| Firestore en memoria | Cada suite de dinero lleva la suya (`credits.test`, `idempotencia-de-cobro`, `creator-reclamo`, `plazos-y-liquidacion`). **Esta ronda** deja una compartida con transacciones serializadas, lote y lectura de campo | `_firestore-en-memoria.mjs` (nuevo) |
| Suites de emulador | `node functions/test/_emuladores.mjs [--solo <fragmento>]` lee de la cabecera de cada `*.emulator.mjs` su `firebase emulators:exec --only … --project demo-…` y la lanza en una sesión limpia. 40 suites; Java 21 portable en `%LOCALAPPDATA%\wee-tools`; solo proyectos `demo-*`; el emulador de Functions solo sin secretos locales | `functions/test/*.emulator.mjs` |
| Tipos | `npx tsc --noEmit` con `NODE_OPTIONS=--max-old-space-size=4096`: línea base **0 errores** (PESADO) | raíz |
| Web local | `npm run functions:emulator` (compila y levanta Auth, Firestore, Functions y Storage de `demo-wee`; el motor cae en `mock`) y `npm run web:demo` (Expo web, puerto 8082, apuntando a los emuladores). Se conduce a mano: en React Native Web los clics y el teclado sobre hojas modales fallan a menudo, y lo que funciona es ejecutar JavaScript en la página (pulsar el elemento más interno cuyo texto coincide y asignar los campos con el asignador nativo de valor seguido de un evento `input`) | `scripts/web-demo.mjs`, `scripts/emulators.mjs` |

Lo que **nunca había** hasta esta ronda: nadie ejecutaba `creatorChat` → `creatorQuote` → `creatorRun` de punta a punta, que es el
**único** camino por el que hoy se crea algo en Design y en Chef (ni en proceso ni en emulador; `docs/DESIGN.md` §5 ya lo pedía).
Cada pieza tenía sus pruebas —el planificador, el precio, el reclamo del trabajo, el Credit Engine—, la mayoría con el dinero
sustituido por un doble. Ver §6.

## 2. Lo que se midió y conviene saber antes de leer las tablas

Todo esto se **reprodujo con código de verdad** (no solo leído); entre paréntesis, la prueba que lo vigila y la tarea que lo
cruza.

1. **(Cerrado por el puente de `docs/WEE-DESIGN-PUENTE.md`; lo que sigue es el hallazgo de `d867774`.) El botón «Crear» de la pantalla montada de Weë Design es una demostración**: espera 1,6 s, dice «Creación lista» y no hay
   ningún trabajo, ningún Credit movido ni ninguna navegación. Los ajustes y las referencias que se eligen no viajan a ninguna
   parte (`DesignScreen.tsx:100-112`; hueco `ACE-D-06`; H `B-01`; `docs/DESIGN.md` §1). El camino real existe y funciona, pero
   solo se llega por la búsqueda de Weë AI y por Weë Brain.
2. **El camino real, ejecutado entero, cumple lo que promete el dinero**: el plan trae su precio antes de crear; mirarlo no cuesta;
   lo cobrado es EXACTAMENTE lo mostrado (y lo que repartió el libro de generaciones entre los pasos suma lo mismo); si el proveedor
   falla, el dinero vuelve exacto y la frase dice «No te cobré»; si no alcanza, el trabajo se queda planificado y se retoma tras
   conseguir Credits; pulsar dos veces cobra una (`aceptacion-recorrido-servidor`, 51 comprobaciones).
3. **De las 35 formas de empezar que enseña Weë Design, el servidor entiende «qué es» sin repreguntar 13 en español y 3 en inglés.**
   Las otras 22 acaban en «Cuéntame qué necesitas» aunque la persona acabe de tocar «Una cabaña» (`aceptacion-conversacion` C;
   trinquete). La IA que entiende texto lo haría mejor; esto es el **suelo** determinista.
4. **«Una mascota para mi marca» se entiende como un logo** (la palabra «marca» gana a «mascota» porque el logo se comprueba primero)
   y **un afiche «para una historia» no sale vertical** (la plantilla solo escribe «en vertical» en el encargo y no fija la
   proporción) (huecos `ACE-D-07b`, `ACE-D-06b`).
5. **En Chef, lo elegido en los ajustes de cocina (dieta, nivel…) viaja entre paréntesis AL FINAL de la idea, y el servidor corta la
   idea en 300 caracteres**: con una idea larga («sin gluten» o una alergia) la restricción desaparece sin avisar y la caja no
   limita la longitud. Reproducido con la pantalla de verdad y `creatorChat` de verdad (hueco `ACE-C-09`; G `D-CHEF-5`; H `B-03`).
   Y aunque la restricción llegue, **el plan que se enseña antes de gastar no la menciona** (huecos `ACE-C-09b`, `ACE-C-09c`; G
   `AC-19`).
6. **No se puede cancelar una creación en marcha** (el estado `cancelled` existe y nadie lo escribe), y la pantalla es honesta: no
   ofrece cancelar. **Un trabajo que se queda «en marcha» porque murió el proceso solo se cierra y se devuelve si alguien vuelve a
   llamar a `creatorRun` para él**: ninguna tarea programada lee `creatorJobs` (el barrido es del Core), y la pantalla no ofrece
   nada para un trabajo «en marcha» (huecos `ACE-D-13`, `ACE-T-04`).
7. **Los tres paneles nuevos de Chef no tienen plan propio**: «Sustituir ingredientes» exige la foto de la nevera por culpa de la
   palabra «ingredientes» de su título, «Lista de compras» recibe la instrucción de Hogar & Diseño y «Información nutricional»
   acaba en una receta con foto. **Los fija la tarea G** (`D-CHEF-1/2/3`, `chef-caracterizacion.test.mjs`); aquí solo se citan
   (`ACE-C-11/12/13`).
8. **La pantalla de Chef hace lo que dice**, tocada de verdad: ocho funciones en su orden, en español y en inglés; las cinco que
   abren la conversación llevan su opción de siempre y esa opción existe en la plantilla del servidor; las tres de panel no
   navegan; sin sesión llevan a entrar; el gesto de atrás de Android cierra el panel antes de salir; el micrófono avisa
   «próximamente» y no finge dictar (`aceptacion-pantallas`, 67 comprobaciones).

## 3. Weë Design

Pantallas implicadas: `screens/DesignScreen.tsx` (la montada: `SpecialistScreen.tsx:117`), el flujo real `screens/CreatorFlowScreen.tsx`
(`creatorChat` → `creatorQuote` → `creatorRun`) y la referencia funcional `screens/DesignReferenciaScreen.tsx`, **con la puerta
cerrada** (nadie llega a ella).

| ID | P | Escenario (precondición → pasos → resultado esperado) | Hoy | Cómo se comprueba |
|---|---|---|---|---|
| **ACE-D-01** | P0 | **Entrar a Weë Design.** Con o sin sesión → ☰ / barra lateral / Weë AI / `/design` → se ve la pantalla de Design: cabecera, caja, puertas, galería; nada se crea ni se cobra al entrar | PASA | **a** `cajas-weeai:258-259,274-290`, `credits-weeai:140,154`, `navegacion-enlaces:197`, `creator.test:837` · **b** `aceptacion-pantallas` E · **d** web |
| **ACE-D-02** | P1 | **La caja crece con el texto sin perder sus botones; estructura de la familia de Weë AI** (CLAUDE.md §9) | PASA (por lectura del código) | **a** `cajas-weeai` (52 comprobaciones), `foundation-de-experiencias` nº 16-18 · **d** teclado, tableta, escritorio |
| **ACE-D-03** | P1 | **Puertas y puntos de partida.** Tocar una puerta (seis en portada, una tras «Ver todas») → elegir un punto → vuelve a la portada con la idea empezada, sin pisar lo escrito; atrás deshace UN paso | PASA la pantalla · PARCIAL la comprensión: el servidor entiende 13/35 (es) y 3/35 (en) sin repreguntar | **a** `cajas-weeai:258-259 (21)` · **b** `aceptacion-pantallas` F; `aceptacion-conversacion` C (trinquete 13/3) · **d** gesto de atrás real |
| **ACE-D-04** | P2 | **Ajustes de un diseño** (estilo, materiales, luz, formato, calidad): se eligen sin gastar nada y se ven | PASA con el puente de Design (`docs/WEE-DESIGN-PUENTE.md`): se eligen, se ven y **viajan en palabras** en el objetivo; formato y calidad no cambian el plan (solo son palabras) | **a** `ajustes-weeai:173,185` · **b** `aceptacion-pantallas` F; `puente-design` A4-A6 |
| **ACE-D-05** | P2 | **Adjuntar una referencia** de verdad (galería/cámara), que se vea y viaje con la petición | HUECO: son nombres de muestra sin selector, y el micrófono está enganchado a la misma función (`DesignScreen.tsx:120,194`; H `B-03 (iii)`). Y aunque se subiera una foto, el servidor la ignora para `image.generate` (`creator/inputs.ts:14-23`, `IMAGE_INPUT_CAPS`; decisión D6). Observación impresa, no pin: F puede arreglarlo | **b** `aceptacion-pantallas` F (observación) · **d** selector real · F (tarea) |
| **ACE-D-06** | P0 | **Enviar la solicitud desde la caja de Design.** Con una idea → «Crear» → abre `CreatorFlow` (experiencia `design`) con lo escrito y lo elegido, que pregunta lo que falta y enseña el plan con su precio | **PASA con el puente de Design** (`docs/WEE-DESIGN-PUENTE.md`; antes era el hueco [ACE-D-06], un temporizador de 1,6 s y «Creación lista» sin nada detrás): «Crear» abre `CreatorFlow` con lo escrito y los ajustes en palabras; sin sesión va a Login; no lleva presets ni foto | **a** `cajas-weeai:288 (23)` · **b** `aceptacion-pantallas` E; `puente-design` (A, B, C, D) · F2 de `docs/DESIGN.md` §5; decisiones D1, D2, D7 que el puente **presupone** y no toma; H `B-01` |
| **ACE-D-06b** | P1 | **Formatos.** Un afiche «para una historia» sale vertical (9:16) | **HUECO [ACE-D-06b]**: la plantilla solo escribe «en vertical» en el encargo (`templates.ts:299,582`) | **b** `aceptacion-conversacion` D · decisión D5 |
| **ACE-D-07** | P0 | **La conversación guiada** (`CreatorFlow`, experiencia `design`). Una frase → Weë entiende lo que ya dijo, pregunta lo mínimo (≤ 3, con «No sé» o texto libre), explica el plan con palabras de persona y sin proveedores | PASA el suelo determinista; huecos de inferencia [ACE-D-07b]. La IA que entiende texto no se mide aquí | **a** `planner.test:119-120 (3)`, `i18n-servidor` (todo lo que puede llegar se reconoce) · **b** `aceptacion-conversacion` A, B, D; `aceptacion-recorrido-servidor` A · **e** calidad de `text.structure` |
| **ACE-D-07b** | P1 | «Una mascota para mi marca» se entiende como un personaje | **HUECO [ACE-D-07b]**: sale logo (`templates.ts:454-456`) | **b** `aceptacion-conversacion` D |
| **ACE-D-08** | P0 | **El precio, antes de crear.** El plan trae desglose y niveles; mirarlo no cuesta; cambiar de nivel reprecia y sigue sin cobrar; el total es la suma de los pasos y lo estimado del trabajo | PASA | **a** `estimate-plan`, `credits.test:335`, `creator-reclamo:185-203 (Q1-Q5)`, `creator.test:1014-1038 (9,10)` · **b** `aceptacion-recorrido-servidor` A; `aceptacion-conversacion` A (10 formas de plan) · **d** cómo se ve la tarjeta · **e** precios reales (hoy son de PRUEBA y se marcan como tales) |
| **ACE-D-09** | P0 | **Crear.** Concepto + tres propuestas; progreso por pasos; el trabajo queda hecho; lo cobrado es lo mostrado | PASA con el proveedor de prueba · **sin verificar con uno real** | **a** `creator-reclamo:112-134 (1-10)` · **b** `aceptacion-recorrido-servidor` A · **c** *(no existe la suite de emulador del recorrido: §6)* · **d** `JobProgress` · **e** Gemini / Flux / Seedream |
| **ACE-D-10** | P0 | **El proveedor falla.** Error comprensible, «No te cobré», el dinero vuelve exacto, reintentar funciona | PASA | **a** `idempotencia-de-cobro:338-386 (F1,H1-H5)`, `coste-de-los-fallos`, `plazos-y-liquidacion` · **b** `aceptacion-recorrido-servidor` C; `aceptacion-errores-y-estados` A, B, E |
| **ACE-D-11** | P0 | **No alcanzan los Credits.** El error dice cuánto hace falta y cuánto hay; el trabajo sigue planificado y no parpadea «en marcha»; tras conseguir Credits, el mismo trabajo se crea | PASA | **a** `creator-reclamo:128-134 (7-10)`, `credits.test:178-179` · **b** `aceptacion-recorrido-servidor` D; `aceptacion-errores-y-estados` C (en 16 idiomas) · **d** la tienda |
| **ACE-D-12** | P0 | **Doble pulsación / dos dispositivos:** un solo cobro; volver a pulsar sobre lo hecho no cobra | PASA | **a** `creator-reclamo:112-119 (1-6)` · **b** `aceptacion-recorrido-servidor` A, D |
| **ACE-D-13** | P1 | **Cancelar una creación en marcha** | **NO SOPORTADO [ACE-D-13]**: `cancelled` lo lee la pantalla y nadie lo escribe (`creator/types.ts:150-167`); la pantalla no ofrece cancelar (honesto) | **b** `aceptacion-recorrido-servidor` F (hueco), `aceptacion-errores-y-estados` D · `docs/WEE-DESIGN-FLOWS.md` §4 · G `AC-34` |
| **ACE-D-14** | P1 | **Recuperarse de un proceso muerto.** Un trabajo «en marcha» cuyo plazo venció se cierra y se devuelve | PARCIAL: el servidor lo hace **si se vuelve a llamar** a `creatorRun`; nada lo llama solo ni la pantalla lo ofrece [ACE-T-04] | **a** `plazos-y-liquidacion:264,296,325,328 (25,29,32,33)`, `liquidacion-pendiente`, `reservas-colgadas` (solo informa) · **b** `aceptacion-recorrido-servidor` F (hueco) · **c** barrido real |
| **ACE-D-15** | P0 | **Reabrir un trabajo** (Mis creaciones, un proyecto, la dirección con su id) y volver al punto en que quedó: preguntando → la pregunta; planificado → plan y precio; en marcha → progreso; hecho → resultado | PARCIAL: el documento guarda todo lo necesario (**b**); cómo se pinta cada estado es de **d** | **b** `aceptacion-recorrido-servidor` A · **a** `design-referencia` I9, I26 · **d** reabrir cada estado |
| **ACE-D-16** | P1 | **Ver y usar el resultado:** elegir una propuesta, «otra versión» (cuesta lo visto), editar con palabras (recrea, sin linaje), descargar, publicar en el Wäll con «cómo lo hice», guardar en un proyecto | PASA por estructura; el gesto real es de **d** | **a** `creator.test:1007-1090 (8-10, 1-8)`, `composer*` · **d** descarga y publicación |
| **ACE-D-17** | P1 | **Proyectos.** Crear un proyecto, guardar un trabajo en él, ver sus trabajos; nadie toca los de otra persona; un trabajo solo cambia de proyecto | PARCIAL | **a** `proyectos-i18n`, `composer.test:440`, `fronteras-rules.emulator:379-386` (proyectos ajenos) · **c** la regla de `creatorJobs` (solo `projectId` y `updatedAt`, `firestore.rules:1061-1066`) **no tiene prueba de emulador dirigida** · **d** · H `B-12` |
| **ACE-D-18** | P1 | **Mis creaciones:** lista de los materiales de la cuenta, abrir en su mesa, retirar | PASA en servidor | **a** `content.test`, `f11-ui`, `activos-*` · **c** `activos-*.emulator` · **d** |
| **ACE-D-19** | P2 | **Persistencia entre sesiones.** Trabajos y materiales sí; lo escrito en la caja, los ajustes y las referencias de Design NO (estado local) | PARCIAL (diseñado así) | **b** `aceptacion-pantallas` F · `aceptacion-recorrido-servidor` A · **d** cerrar y abrir |
| **ACE-D-20** | P2 | **Estados vacíos honestos:** galería de muestra dicha como muestra (sin fotos de archivo); «Mis creaciones» vacío | PASA | **a** `cajas-weeai:288`, `proyectos-i18n` · **b** `aceptacion-pantallas` E · **d** |
| **ACE-D-21** | P0 | **Errores comprensibles en 16 idiomas** | PASA | **a** `no-disponible:198-205 (C5)` · **b** `aceptacion-errores-y-estados` A, B |
| **ACE-D-22** | P0 | **Sin sesión** nadie crea, cotiza ni conversa: «Inicia sesión para crear con Weë» | PASA en servidor | **b** `aceptacion-recorrido-servidor` E · **d** el salto a Login |
| **ACE-D-23** | P0 | **Privacidad.** El trabajo de otra persona no se contesta, no se cotiza y no se crea; cotizar ni confirma que exista | PASA en servidor | **b** `aceptacion-recorrido-servidor` E · **c** la lectura de `creatorJobs` en las reglas |
| **ACE-D-24** | P2 | **Responsive y accesibilidad:** teléfono, tableta 768–1023, escritorio; roles, etiquetas, foco, contraste | SIN VERIFICAR | **b** (dos puertas por fila en el teléfono) · **d** |
| **ACE-D-25** | P2 | **La referencia funcional** (cadena imagen → 3D → entregar, estados de trabajo, sin proveedores ni precios inventados) | PASA en simulación; **no es la pantalla montada** y la puerta está cerrada | **a** `foundation-de-experiencias` grupo I (27 secciones) · F |
| **ACE-D-26** | P2 | **3D y mundos:** apagado y explicado («no disponible», con su motivo) | PASA | **a** `design-referencia` I22-I23, `mundo3d-*` · **e** proveedor 3D (Línea B) |
| **ACE-D-27** | P0 | **Llegar a Design escribiendo.** En la caja del Studio o en la búsqueda de Weë AI: «Hazme un logo para mi cafetería» → llega a Weë Design (o a Weë Brain), no a una demostración ni a otra experiencia | **HUECO**: desde la caja del Studio no hay destino y se enseña «Creando…» sin llamar a nadie; desde la búsqueda decide una tabla de palabras (H `B-02`). **Lo arregla K en el cliente (TDD, otro worktree)** | **b** *no se escribe aquí*: la prueba de `B-02` es de K; este catálogo solo referencia el escenario · H `sonda-destino.log` |

## 4. Weë Chef (preparación)

Pantalla: `screens/ChefScreen.tsx` (`SpecialistScreen.tsx:119`): cabecera → caja → ocho funciones → «Mis proyectos». Toda creación pasa por
`CreatorFlow` con `experienceId: 'chef'`, que enseña el plan con su coste antes de gastar. **No tiene muro propio** (el comentario
del «piloto del muro» sobrevive en `constants/specialists.ts`; G `D-CHEF-10`). Las filas citan los `AC-nn` y los `D-CHEF-n` de la
especificación de G (rama `r7/g-chef-preparacion`, sin fusionar a la hora de escribir esto).

| ID | P | Escenario | Hoy | Cómo se comprueba |
|---|---|---|---|---|
| **ACE-C-01** | P0 | **Entrar a Weë Chef:** ocho funciones en su orden, caja vacía con sus cinco controles, «Mis proyectos»; entrar no llama a nadie | PASA | **a** `chef-weeai` (40 comprobaciones) · **b** `aceptacion-pantallas` A · G `AC-27` · **d** |
| **ACE-C-02** | P0 | **Elegir una función con conversación** (ingredientes, receta, menú, saludable, «No sé qué cocinar»): abre `CreatorFlow` con su opción de siempre, que existe en la plantilla del servidor; sin sesión, entrar | PASA | **a** `chef-weeai` nº 3-4 y 15-16 · **b** `aceptacion-pantallas` B |
| **ACE-C-03** | P1 | **Funciones con panel** (nutrición, sustituir, compras): se abren dentro, elegir deja la frase empezada, atrás cierra el panel antes de salir | PASA la mecánica · el resultado de cada función es **HUECO** (C-11, C-12, C-13) | **a** `chef-weeai` nº 18-23 · **b** `aceptacion-pantallas` B · **d** gesto de atrás de Android real |
| **ACE-C-04** | P0 | **Escribir una idea y enviar.** Caja vacía no hace nada; los ajustes de cocina (personas, tiempo, dieta, nivel) se eligen sin gastar, se ven como fichas, se quitan de un toque y viajan como palabras | PASA (la unión «idea (ajustes)» está fijada aparte, *BLOCKED — HUMAN DECISION*: ver `ACE-C-09`) | **a** `chef-weeai` nº 34, `ajustes-weeai` · **b** `aceptacion-pantallas` C · G `D-CHEF-4` · H `B-03 (ii)`: `creative`, `adjuntos` y `workspace` solo viajan como palabras |
| **ACE-C-05** | P0 | **Foto de ingredientes.** Cámara/galería; una foto sola ya es una petición; «cocinar con lo que tengo» exige foto y sin foto no cobra; la foto de otra persona se rechaza | PASA | **a** `creator.test:595-660` · **b** `aceptacion-pantallas` C; `aceptacion-recorrido-servidor` B · **d** cámara y permisos reales |
| **ACE-C-06** | P0 | **Una receta** (texto + foto del plato): personas y tiempo se piden o se deducen, el plan lo dice con las palabras de la persona, precio antes, cobro igual | PASA | **a** `estimate-plan:65-72`, `chef-weeai` nº 17 · **b** `aceptacion-recorrido-servidor` B; `aceptacion-conversacion` B · G `AC-01` |
| **ACE-C-07** | P1 | **No volver a preguntar lo dicho** («para la familia», «en 15 minutos», «para dos») | PARCIAL: personas y tiempo se deducen en español; **no** «toda la semana», ni nada en inglés o danés | **a** `planner.test:80-120` · **b** `aceptacion-conversacion` B (trinquete por frase) · G `D-CHEF-4` |
| **ACE-C-08** | P1 | **Menú de la semana + lista de compras + precios:** tres pasos encadenados, cada uno con su precio | PASA la estructura y el cobro · precios con búsqueda web real **sin verificar** | **a** `creator.test:569` · **b** `aceptacion-recorrido-servidor` B · **e** búsqueda con fuente · G `AC-02` |
| **ACE-C-09** | P0 | **Restricciones (dieta, alergia).** (i) llegan al modelo, (ii) no se pierden, (iii) se ven en el plan antes de gastar | (i) PASA · (ii) **HUECO [ACE-C-09]** — *BLOCKED — HUMAN DECISION*: se cortan a 300 caracteres (`creator/index.ts:310`; H `B-03 i`) · (iii) **HUECO [ACE-C-09b, ACE-C-09c]** | **b** `aceptacion-conversacion` D; `aceptacion-recorrido-servidor` F; `aceptacion-pantallas` C (la unión) · G `D-CHEF-5`, `AC-13`, `AC-19` · **e** `AC-21`: que una receta real no contenga el alérgeno es de un canario con proveedor |
| **ACE-C-10** | P1 | **Escalado de porciones.** «Para 10 personas» dicho en la frase se entiende y llega al plan sin repreguntar; y escalar una receta ya hecha | **HUECO [ACE-C-10]** (la cifra se pregunta de nuevo; no hay función de escalar después: G fila 13, `AC-16`) | **b** `aceptacion-conversacion` D |
| **ACE-C-11** | P1 | **Sustituir ingredientes** lleva a sustituir, sin la foto de la nevera | **HUECO** (G `D-CHEF-2`) | G `chef-caracterizacion` §C · `AC-04`, `AC-06` |
| **ACE-C-12** | P2 | **Lista de compras de comida** (por secciones del supermercado, con cantidades), no la instrucción de Hogar & Diseño | **HUECO** (G `D-CHEF-3`) | G `chef-caracterizacion` §C · `AC-08` |
| **ACE-C-13** | P1 | **Información nutricional** como resultado propio y rotulado como estimación | **HUECO / requisito sin definir** (G `D-CHEF-1`) | G `chef-caracterizacion` §C · `AC-05`, `AC-20` |
| **ACE-C-14** | P2 | **Retocar la foto del plato:** un solo paso (`image.edit`), exige foto, el plato se queda como está | PASA en servidor · sin tarjeta en la pantalla (G `D-CHEF-7`) | **a** `creator.test:294-345`, `estimate-plan` |
| **ACE-C-15** | P0 | **Créditos en Chef:** precio antes; cobro igual; reembolso exacto; saldo insuficiente; doble toque | PASA | **b** `aceptacion-recorrido-servidor` B, D · **a** `creator-reclamo` · G `AC-22..24` |
| **ACE-C-16** | P1 | **Mis proyectos:** sin sesión → vacío; sin trabajos → «todavía no has cocinado nada»; con trabajos → los de Chef, con su estado; abrir uno reabre ESE; «Ver todos» | PASA (con un matiz: cuenta también conversaciones sin terminar y fallidas, G `D-CHEF-9`) | **a** `chef-weeai` nº 29 · **b** `aceptacion-pantallas` D |
| **ACE-C-17** | P1 | **Guardar una receta o un menú y volver a ella.** Hoy: como trabajo dentro de un proyecto; no existe «receta» como cosa | PARCIAL | **a** `composer.test:440` · **c**/**d** · G fila 23 |
| **ACE-C-18** | P2 | **Imágenes de platos:** coste por receta y calidad | SIN VERIFICAR | **e** · G `R-8` |
| **ACE-C-19** | P3 | **Muro social dentro de Chef** | NO EXISTE por decisión | G `D-2`, `D-CHEF-10` |
| **ACE-C-20** | P1 | **Los 16 idiomas.** Pantalla, funciones, paneles y errores salen en el idioma de la persona | PASA el cliente · el servidor solo escribe es/en/da (el resto cae al inglés: G fila 36) | **a** `catalogo-i18n`, `experiencias-i18n`, `chef-weeai` E · **b** `aceptacion-pantallas` A (en inglés), `aceptacion-errores-y-estados` B |
| **ACE-C-21** | P2 | **Accesibilidad:** cada función es un botón con su nombre; la caja tiene nombre para quien la escucha | PASA por estructura · lector real **sin verificar** | **b** `aceptacion-pantallas` A · **d** lector de pantalla |
| **ACE-C-22** | P1 | **Fallo a medias** (la foto del plato falla tras escribir la receta): el trabajo falla, se reembolsa todo y la receta se conserva | PASA (caracterizado) | G `chef-caracterizacion` §F, `AC-22` · el mismo código de reembolso que `ACE-D-10` (`aceptacion-recorrido-servidor` C lo ejecuta con un plan de Design, no con el de Chef) |
| **ACE-C-23** | P0 | **Llegar a Chef escribiendo.** «Una receta de pasta con lo que tengo en la nevera», en la caja del Studio o en la búsqueda de Weë AI, lleva a Weë Chef (o a Weë Brain), no a Weë Beauty | **HUECO**: va a Weë Beauty por un prefijo («una» → `unas`; `constants/weeExperiences.ts:132`; H `B-02`). **Lo arregla K en el cliente (TDD, otro worktree)** | **b** *no se escribe aquí* (de K) · H `sonda-destino.log`, `sonda-palabras.log` |

## 5. Transversales

| ID | P | Escenario | Hoy | Cómo se comprueba |
|---|---|---|---|---|
| **ACE-T-01** | P0 | **El dinero.** Precio visto → reserva → cobro igual o reembolso exacto, sin doble cobro; el libro reparte lo cobrado entre los pasos | PASA | **a** `credits.test`, `idempotencia-de-cobro`, `creator-reclamo`, `plazos-y-liquidacion` · **b** `aceptacion-recorrido-servidor` A–D; `aceptacion-conversacion` A · cruza con I (`07-coherencia`: 1.296 ejecuciones reales de `creatorRun`, el cobrado nunca supera lo cotizado) |
| **ACE-T-02** | P0 | **Errores comprensibles:** una frase entera por causa, sin códigos, trazas ni proveedores; distinta cuando el gesto es distinto | PASA | **b** `aceptacion-errores-y-estados` A |
| **ACE-T-03** | P1 | **Estados de un trabajo:** los mismos seis en el servidor y en la app, con texto propio en cada idioma | PASA | **b** `aceptacion-errores-y-estados` D · **a** `foundation-de-experiencias` I9 (los quince de la referencia) |
| **ACE-T-04** | P1 | **Un trabajo abandonado se cierra solo** (ver ACE-D-14) | **HUECO [ACE-T-04]** | **b** `aceptacion-recorrido-servidor` F |
| **ACE-T-05** | P1 | **Conexión.** La app se cansa de esperar (15 min) sin que sea un error de la persona; sin red, una frase de «sin conexión» | PASA la lógica · la red real es de **d** | **b** `aceptacion-errores-y-estados` A · **d** |
| **ACE-T-06** | P1 | **Idiomas:** 16 diccionarios propios; cada error está en el suyo, no por el respaldo | PASA | **b** `aceptacion-errores-y-estados` B, C |
| **ACE-T-07** | P0 | **A dónde va lo que se escribe en la caja del Studio** (y en la búsqueda de Weë AI): a la experiencia que corresponde, o a Weë Brain si no hay una clara; nunca a una que no tiene que ver | **HUECO** (H `B-02`, reproducido por H con 12 frases y el código real del cliente: 4 caen en la demostración, 3 van a Weë Beauty por prefijos: «una canción relajante», «una receta de pasta…», «make me a logo…»; `sugeridaPorBrain` no tiene llamador). **K lo arregla** | Escenario de aceptación del flujo principal. **No se reimplementa ni se prueba aquí**: la prueba la escribe K (con las frases de H como datos) · **d** cualquier caja |
| **ACE-T-08** | P1 | **Sin claves, el modo demo termina cada experiencia de punta a punta** (CLAUDE.md §5) | Design y Chef: PASA · el vídeo de Weë Studio: **HUECO** (H `B-11`: el guion de prueba no trae «NARRACIÓN:», `vozSinNarracion` para el trabajo antes del vídeo y se reembolsa todo; solo afecta a desarrollo y a pruebas sin claves) | **b** `aceptacion-recorrido-servidor` A, B (Design y Chef) · Studio: H `S4a`, sin prueba nueva aquí |

## 6. Las pruebas nuevas de esta ronda

Todas **ligeras** (sin red, sin emulador, sin claves), en la cadena de `npm test` (`functions/package.json`: 304 suites) y
deterministas (tres ejecuciones seguidas de cada una, mismo resultado: `R7\J-aceptacion\logs\repeticion-3x.log`). Usan el
compilado: `npm --prefix functions run build` antes.

| Archivo | Qué hace | Comprobaciones · huecos | Tiempo |
|---|---|---|---|
| `aceptacion-recorrido-servidor.test.mjs` | Ejecuta `creatorChat` → `creatorQuote` → `creatorRun` COMPILADOS con el Credit Engine y el libro de verdad y el proveedor de prueba; solo sustituye dónde se guardan los documentos. Design (un logo de una frase a su cobro), Chef (receta, menú, con y sin foto), el proveedor que falla, no alcanzan los Credits, doble pulsación, sin sesión y sesión ajena | 51 · 3 | 4–10 s |
| `aceptacion-conversacion.test.mjs` | Los 604 planes posibles de Design, Hogar & Diseño y Chef recorridos como los recorre una persona; 14 frases reales con su trinquete («nunca pregunta más ni entiende menos»); las 35 puertas de Design; los huecos de Design y de las restricciones de Chef | 30 · 5 | 2–3 s |
| `aceptacion-errores-y-estados.test.mjs` | Cada causa de error (servidor → Firebase → app) en los 16 idiomas; los seis estados; los textos de progreso y de «no te cobré» de las 28 capacidades | 22 · 0 | 5–6 s |
| `aceptacion-pantallas.test.mjs` | Dibuja con `react-dom/server` la pantalla de Chef (funciones, paneles, ajustes, foto, mis proyectos, en español y en inglés) y la de Design (puertas, atrás, ajustes, referencias, «Crear») y TOCA cada botón por su etiqueta | 67 · 1 | 7–13 s |

Módulos de apoyo (no son suites): `_aceptacion.mjs` (el comprobador con `hueco()`, las esperas aceleradas y el detector de
proveedores), `_firestore-en-memoria.mjs` y `_pantallas.mjs`.

**Cómo se sabe que muerden.** Con las cuatro en verde se aplicaron dieciséis casos de UNA línea cada uno: quince sabotajes
(cobrar un Credit de menos, no reembolsar, no exigir la foto, no comprobar el dueño, quitar «no te cobré», dejar de entender
«familia» o «logo», mandar una tarjeta de Chef a otra experiencia, saltarse el Login, perder los ajustes, conectar «Crear» de
Design, pisar lo escrito, cambiar un identificador que viaja al servidor, alterar el catálogo, dejar escapar un error técnico) y
un control negativo (un cambio inofensivo). Los quince pusieron en rojo la suite que debían y el control no la rompió. Cada
archivo se restauró y se comprobó por hash y con `git status`. El guion y su registro están en `R7\J-aceptacion\`
(`sabotajes-aceptacion.log`).

**Qué NO prueban** (para que nadie crea que cubren más): ningún precio concreto (son de prueba y cambian: solo que lo
cobrado es lo mostrado); ninguna calidad de IA; reglas de seguridad de Firestore, índices ni Storage; el aspecto, el
desplazamiento, el teclado ni los gestos reales; y nada de `CreatorFlowScreen` por dentro (el plan, el progreso y el
resultado dibujados): esa pantalla es compartida y de unas 860 líneas con unos veinte módulos; el mismo entorno sirve y es
la **propuesta (b) siguiente**, pero no se hizo para no competir con F.

## 7. Cómo se mantiene esto

1. **Un hueco se cierra.** Una de las pruebas dice `✘ HUECO CERRADO [ACE-…]`: alguien arregló lo que este catálogo daba por roto.
   Se cambia `hueco(id, …)` por `check(…)` en esa suite, la fila de arriba pasa a **PASA** y se quita su mención de §2.
   Quien integra varias ramas a la vez puede ejecutar con `ACEPTACION_TOLERA_CIERRES=1` para que un cierre se avise sin romper la
   cadena; no es el valor por defecto.
2. **Un trinquete mejora.** `aceptacion-conversacion` lo cuenta («mejora sobre lo anotado…»): sube el mínimo (`13`/`3` de las
   puertas) o actualiza `RECORRIDOS` cuando se quiera. Que **empeore** sí falla.
3. **Una pantalla cambia.** Las suites de pantalla se hablan con el CONTRATO de cada pieza, no con su marcado. Si una tarea mueve
   cómo se importa una pieza, el cargador dice «import sin doble: …»: se añade el doble en `doblesDeChef`/`doblesDeDesign`.
4. **Se fusiona con F y con G.** F toca Design (`DesignScreen`, `components/design*`): `aceptacion-pantallas` E y F son las que
   pueden necesitar un ajuste. G trae `chef-caracterizacion`, que fija los tres paneles (`ACE-C-11/12/13`); cuando se arreglen,
   se invierten allí, no aquí. Tras fusionar, ejecutar las cuatro `aceptacion-*` y `ci-workflow`.

## 8. Lo que todavía requiere emulador, dispositivo o integración real

Todo lo de abajo es PESADO o no ejecutable en esta ronda. **Uno cada vez** (candado `pesado.mjs`); ninguno se lanzó.

### 8.1 (c) Emulador — `demo-wee`, sin secretos

| Qué | Comando | Qué añadiría sobre lo ya comprobado | Coste |
|---|---|---|---|
| Reglas de `creatorProjects` (ya probadas) y **reglas de `creatorJobs`** (solo `projectId` y `updatedAt`; lectura solo del dueño): **no hay prueba dirigida** | `node functions/test/_emuladores.mjs --solo fronteras-rules` (existe) + una sección nueva para `creatorJobs` | ACE-D-17, ACE-D-23: que de verdad no se pueda escribir otra cosa ni leer lo ajeno | Java 21; 3–4 min (lo anotó el candado de la tarea E); RAM sin medir |
| La foto de entrada (`users/{uid}/creator-inputs`): subida real y reglas de Storage | `--solo urls-del-storage`, `--solo fronteras-storage` (existen) | ACE-C-05 de punta a punta | igual |
| **El recorrido completo con Functions emuladas** (propuesta, **no escrita**): `aceptacion-recorrido.emulator.mjs` que haga lo de `aceptacion-recorrido-servidor` llamando a los callables por HTTP con un token del emulador de Auth, con el motor en `mock` | `firebase emulators:exec --only auth,firestore,functions --project demo-wee "node functions/test/aceptacion-recorrido.emulator.mjs"` (el corredor admite Functions solo sin secretos locales) | Lo que la prueba en proceso NO puede: verificación del token, reglas, transacciones de verdad, tiempos reales. Es el `AC-26` de G y lo que pedía `docs/DESIGN.md` §5 | Java 21 + Functions; sin medir (estimado: algo más que lo anterior) |
| El barrido programado de verdad sobre un trabajo abandonado (ACE-T-04) | Hoy no existe barrido de `creatorJobs`: primero hay que decidir uno | — | — |

### 8.2 (d) Navegador, servidor de desarrollo o dispositivo

| Qué | Procedimiento | Escenarios | Coste |
|---|---|---|---|
| Web contra los emuladores | Terminal 1: `npm run functions:emulator` (compila `functions/lib` y levanta los emuladores). Terminal 2: `npm run web:demo` (Expo web, `http://localhost:8082`). Entrar con la cuenta anónima del emulador (pide el formulario de alta), ☰ → Weë AI → Design o Chef. Conducir con el navegador de Claude o a mano | ACE-D-01, D-02 (caja que crece y teclado), D-15 (reabrir en cada estado), D-16 (descargar, publicar, guardar), D-19, D-24 (390, 768 y 1280 px; roles y etiquetas), C-01, C-03, C-21 | Java + Metro/Expo; sin medir (estimado: varios minutos de arranque); un servidor cada vez |
| Android | Compilación de desarrollo local (Gradle) y Metro por USB o wifi, sobre un teléfono real | ACE-C-03 (gesto de atrás real), C-05 (cámara y permisos), D-05 (selector de referencias real), teclado y barra del sistema | un teléfono y una persona delante |
| `npx tsc --noEmit` | `NODE_OPTIONS=--max-old-space-size=4096 npx tsc --noEmit` | Solo si se toca `.ts/.tsx` de la app (esta ronda no se tocó ninguno) | PESADO, 1–3 min |

### 8.3 (e) Proveedor real o producción — no ejecutable aquí

| Qué | Por qué no | Qué haría falta |
|---|---|---|
| Calidad y coste de lo que devuelve una IA de verdad (imágenes de Design, platos de Chef, texto de las recetas) | Claves de proveedor y gasto real | Un canario gobernado y una decisión del dueño |
| La IA que entiende texto (`text.structure`): cuánto mejora la comprensión sobre el suelo medido (13/35 puertas) | Gemini real | Un canario; medir con las mismas 35 frases |
| `AC-21` de G: que una receta con la alergia «frutos secos» no contenga frutos secos en N ejecuciones | Seguridad alimentaria con un proveedor real | Un canario con N ejecuciones y revisión humana |
| Precios reales y búsqueda web con fuente del menú | Precios de PRUEBA hoy (`CLAUDE.md` §7: no se inventan) | Medir `providerCost` primero |
| Producción | `creatorRun` y `creatorChat` de `main` no son los de producción y este camino nunca ha corrido allí (`docs/DESIGN.md` §5) | Despliegue gobernado: decisión del dueño |

## 9. Cruces con las otras tareas de la ronda

| Tarea | Qué coincide | Qué se hizo aquí |
|---|---|---|
| **F** Design | `ACE-D-06` (Crear es demo; H `B-01`), `ACE-D-05` (micrófono y referencias de muestra), `ACE-D-06b`/`ACE-D-07b` (formatos y logo/personaje) | Solo se pinea lo que F no puede arreglar sin decisión. El micrófono y las referencias de muestra son una **observación impresa**, no un pin: un arreglo local lo cambiaría con razón |
| **G** Chef | `D-CHEF-1…5`, `AC-nn`, `chef-caracterizacion` | `ACE-C-09/09b/09c/10` los vigilan aquí con el código real (`creatorChat` ejecutado, no solo leído); los tres paneles (`ACE-C-11/12/13`) se dejan **solo** a G para no tener dos suites que se inverten a la vez. G marca `AC-26` (recorrido completo) como «requiere emulador»: **la parte sin reglas ni token ya se ejecuta en proceso** (`aceptacion-recorrido-servidor`) |
| **H** Mapa | `B-01` (Crear demo), `B-02` (la caja del Studio decide por prefijos), `B-03` (i recorte a 300, ii contexto que no cruza, iii nombres inventados y micrófono), `B-11` (demo sin vídeo), `B-12` (proyecto sin validación) | `B-01` y `B-03 (i)` se fijan con su marca *BLOCKED — HUMAN DECISION* en una comprobación propia (ver §0); `B-03 (iii)` es una observación impresa; `B-02` y `B-11` **solo se referencian** (`ACE-T-07`, `ACE-D-27`, `ACE-C-23`, `ACE-T-08`): K arregla `B-02` en el cliente con su propia prueba |
| **K** (nueva) | Arreglo de `B-02` en el cliente, TDD, otro worktree | Ninguna prueba de esta ronda toca `constants/weeExperiences.ts` ni `utils/destinoDeIntencion.ts`: no hay nada que invertir cuando K fusione |
| **I** Rendimiento | Su banco ejecuta `creatorRun` real 1.296 veces con un Firestore doble; yo también ejecuto `creatorRun` real | Distinto propósito: aquí se afirma el contrato de la persona (lo cobrado es lo mostrado, el dinero vuelve exacto), allí se mide el coste; los invariantes coinciden (cobrado ≤ cotizado) |
| **D** Router | Contabilidad ante fallos de Firestore | No se tocó: las suites usan el Router y el libro de verdad sin romper Firestore |
