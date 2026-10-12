# Weë Chef — especificación para empezar a implementarlo

**Ronda R7 · tarea G · 2026-10-11 · sobre `d867774` (rama `r7/g-chef-preparacion`).**
Esto es análisis y especificación: no cambia ni una línea de producto. Lo único que se ejecutó y se añadió es una prueba de
caracterización aislada (`functions/test/chef-caracterizacion.test.mjs`, 42 comprobaciones) que fija lo que este documento afirma.
No se consultó producción ni ninguna base de datos real: lo que se dice de producción sale de documentos del repositorio y se marca así.

**Leyenda de evidencia** (cada afirmación sobre el código lleva `archivo:línea` relativo a la raíz del repositorio):
`[L]` leído en el código o en un documento · `[E]` ejecutado por mí (log en `R7\G-chef\`) · `[M]` medido en el catálogo de PRUEBA ·
`[I]` inferido leyendo (no reproducido) · `[P]` propuesta de este documento (todavía no existe).
**Estados de capacidad:** `EXISTE-CONECTADO` (hay camino de ejecución de punta a punta) · `EXISTE-AISLADO` (hay pieza, sin camino
que la use o sin servidor detrás) · `FALTA` · `REQ. NO DEFINIDO` (no hay requisito escrito: hace falta una decisión).

---

## 0. Resumen

1. **Qué es Weë Chef hoy.** Un lugar de trabajo propio (`screens/ChefScreen.tsx`, desde el 2026-09-15) con una caja, ocho funciones y «Mis
   proyectos», que crea por **un solo camino**: `CreatorFlow → creatorChat → creatorQuote → creatorRun → WEË AI ENGINE` (el camino
   *legacy*; el orquestador del Core no atiende Chef). Ese camino produce **cuatro formas de plan** y nada más [E].
2. **Lo que funciona de punta a punta:** receta desde una idea, receta con la foto de los ingredientes, menú con precios con fuente
   y lista de compras, retoque de la foto del plato, coste visible antes de crear, reembolso total si algo falla, publicar en el Wäll.
3. **Lo que parece existir y no existe:** información nutricional, sustituir ingredientes y lista de compras son **solo paneles que dejan
   una frase empezada**; el servidor no tiene nada propio para ellos y los manda a planes que no son suyos. Escalado de porciones,
   alergias, memoria de cocina, despensa, recetas como entidad, conversación libre con contexto de cocina y muro de sección: **no hay nada**.
4. **Once defectos reproducidos o leídos (D-CHEF-1…11, §1.4)**. Los tres primeros afectan a lo que la persona paga y entiende:
   un panel acaba en «receta + foto del plato» [E], otro exige una foto sin motivo [E] y la lista de compras usa la instrucción de Weë Home [E].
5. **Los briefs describen una estructura que Chef ya no tiene** (hero + herramientas plegadas + muro de sección): §0.1.
6. **Primer lote (§8):** cinco tareas acotadas (seis piezas), sin proveedor, sin emulador y sin mover ninguna cerca de integridad; necesitan dos
   confirmaciones del dueño. Lo que **no** se puede hacer sin su autorización (entrada cruzada entre trabajos, variantes nuevas en el
   catálogo del Core, memoria persistente) está descrito como propuesta con su diff previsto, no implementado.

**Si vas a implementar:** lee este resumen, §6.1 y §8; ejecuta `node functions/test/chef-caracterizacion.test.mjs` (es tu «antes»); cada tarea nombra sus archivos, sus pruebas y lo que depende de ella.
**Identificadores:** `D-CHEF-n` defectos (§1.4) · `R-n` riesgos (§7) · `AC-nn` aceptación (§5) · `CHEF-nn` tareas (§6) · `D-n` decisiones del dueño (§8).

### 0.1 Premisas del encargo que NO se sostienen en `d867774`

| Premisa (BRIEF-F / BRIEF-G) | Lo que hay | Evidencia |
|---|---|---|
| «Chef es el piloto del muro social dentro de una sección» | El muro de sección **se retiró** el 2026-09-13 (commit `4ff271e`, «un solo muro»): hoy hay UN Wäll y de qué sección viene cada publicación lo dice su etiqueta. `ChefScreen` no monta ningún muro. Lo que queda son comentarios y configuración sin consumidor. | `services/firestoreService.ts:606`, `utils/feedFilters.ts:9`, `screens/ChefScreen.tsx:44` `[L]`; `functions/test/chef-caracterizacion.test.mjs` §E `[E]` |
| «Hero de entrada, secciones desplegables cerradas, muro como superficie principal» | Ese era el orden de la ficha de especialista (fases 2E-37/40/41/43). Chef dejó de usarla el 2026-09-15 (`f28cee9`): hoy es **cabecera → caja → ocho funciones → Mis proyectos**, y lo vigilan 47 comprobaciones. El «plegado» solo existe hoy en Weë Travel. | `screens/SpecialistScreen.tsx:119`, `screens/ChefScreen.tsx:256-349`, `functions/test/chef-weeai.test.mjs:1-18,128-131` `[L]`, `[E]` |
| «`design/references/wee-chef.jpg` es la referencia visual definitiva» | La imagen (2026-09-05) muestra hero con foto de pasta, seis tarjetas, chat, «Recetas populares» con fotos y banner de foto. La decisión de producto del 2026-09-15 la sustituyó: «sin emojis y sin fotografías de comida». `CLAUDE.md` §5 sigue diciendo «definitiva»: hay una **tensión documental** que resuelve la decisión D-1 (§8). | `design/references/wee-chef.jpg` (vista), `functions/test/chef-weeai.test.mjs:3-6,183-197`, `CLAUDE.md` §5 `[L]` |
| «Weë Brain con `experienceId: chef` = conversación contextual» | Esa conversación es **guiada** (preguntas con opciones, `creatorChat`). El chat libre de Weë Brain **no recibe** experiencia ni contexto, y al derivar a Chef solo viaja la última frase. | `functions/src/creator/brain.ts:149-169`, `screens/BrainChatScreen.tsx:243` `[L]`; test §B `[E]` |
| «Escalado de porciones, si ya existe en alguna función pura» | No existe en ninguna parte del código ni de los textos (búsqueda de porción/escalar/alergia/calorías: solo etiquetas de i18n y un panel). | búsqueda `[E]` (`R7\G-chef\logs\`) |

---

## 1. Mapa de funcionalidades

### 1.1 La estructura de la sección hoy

`SpecialistScreen` entrega `ChefScreen` (`screens/SpecialistScreen.tsx:119`; `:49` evita leer trabajos para Chef porque ya los lee ella).
Orden fijado por `chef-weeai.test.mjs` (#13): `CabeceraDeSeccion` (`ChefScreen.tsx:257`) → `CajaDePrompt` con cinco botones
(añadir foto, cámara, galería, dictar —avisa «próximamente»—, ajustes: `:268-288`) → fichas de lo que viaja (foto, ajustes puestos: `:295-337`) →
`ChefAcciones` (ocho tarjetas, `:342`) → `ChefProyectos` (`:345-349`). Un panel (nutrición, sustituir, compras) **se come la pantalla**
sin navegar (`:227-240`) y el gesto de atrás de Android lo cierra antes de salir (`:215-224`). Los ajustes (personas, tiempo, dieta, dificultad)
viven en una hoja (`AjustesContextuales`, `:358-366`) y no cuestan nada.

### 1.2 Tabla de funcionalidades

| # | Capacidad | Estado | Qué hay / qué falta | Evidencia |
|---|---|---|---|---|
| 1 | Crear una receta desde una idea | EXISTE-CONECTADO | Plan `recipe → dish` (texto + foto del plato). La instrucción pide título con emoji, personas, tiempo, ingredientes con cantidades (•), pasos numerados y consejo. | `functions/src/creator/templates.ts:1316-1326`, `prompts.ts:440-441`, `ChefScreen.tsx:130-154` `[L]` `[E]` |
| 2 | Cocinar con la foto de la nevera | EXISTE-CONECTADO (con D-CHEF-2) | Plan `look → recipe → dish`; `look` es `vision.describe` y exige foto. | `templates.ts:1318`, `inputs.ts:14-23`, `creator/index.ts:119-123,594` `[L]` |
| 3 | Aprovechar lo que hay (despensa, sobras) | PARCIAL | Solo con foto de lo que hay ahora; si se escribe «con los ingredientes que tengo: …» la palabra «ingredientes» también fuerza la foto (D-CHEF-2). No hay despensa persistente. | repro `[E]`; `templates.ts:1212` |
| 4 | Menú de varios días | EXISTE-CONECTADO | Plan `menu → prices → list`; pregunta `days` (tres días / toda la semana). Sin estructura por comida ni calendario. | `templates.ts:1303-1315,1202-1206`, `prompts.ts:442` |
| 5 | Postre, saludable, «No sé qué cocinar» | EXISTE-CONECTADO | Misma forma `recipe → dish`; sin tarjeta propia en la pantalla (el postre se pide escribiendo). | `templates.ts:1316-1326`, `constants/chefTools.ts:43-100` |
| 6 | Retocar la foto de mi plato | EXISTE-CONECTADO sin puerta (D-CHEF-7) | Plan `image.edit` con dirección de retoque («no tocar lo que no se pidió»). En la pantalla solo se llega por la pregunta `what`. | `templates.ts:1265-1300`, `prompts.ts:641-662`, `creator.test.mjs:294-345` |
| 7 | Foto del plato generada | EXISTE-CONECTADO | `image.generate`/`dish` con dirección fotográfica (65 mm, luz lateral, textura). **Siempre**: no hay receta sin foto (R-5). | `templates.ts:1320`, `prompts.ts:616-631` |
| 8 | Dieta (vegetariana, vegana, sin gluten, sin lactosa, sin azúcar) | EXISTE-AISLADO | Solo un ajuste de la pantalla que se pega como texto al final del objetivo. El servidor no tiene pregunta `diet`. | `chefTools.ts:197-207`, `ChefScreen.tsx:150-152`; test §B `[E]` |
| 9 | Alergias | FALTA · REQ. NO DEFINIDO | Ni ajuste, ni pregunta, ni aviso, ni perfil. Solo existen las entradas de panel «Alérgenos» y «Sin frutos secos» (frases empezadas). | `chefTools.ts:128,136-137` |
| 10 | Cultura, religión, cocina regional | REQ. NO DEFINIDO | Nada en el código. El ejemplo «Lomo saltado · Clásico peruano» es configuración sin consumidor. | `constants/specialists.ts:544` (`chefEj4`) |
| 11 | Dificultad | EXISTE-AISLADO | Ajuste `level` solo como texto. | `chefTools.ts:209-219` |
| 12 | Personas / porciones al pedir | EXISTE-CONECTADO | Pregunta `people` (1·2·4·8); la plantilla escribe «para dos/la familia…». | `templates.ts:1189-1195,1301` |
| 13 | **Escalar porciones después** | **FALTA** | Ninguna función. Cambiar de 4 a 6 = «otra versión» = trabajo nuevo y cobro entero (R-1). | búsqueda `[E]` |
| 14 | Ingredientes con cantidad y unidad estructurados | FALTA | Solo prosa del modelo (`• …`). No hay lector, ni conversión de unidades. | `prompts.ts:440` |
| 15 | Sustituir ingredientes | EXISTE-AISLADO (D-CHEF-2) | Panel con diez entradas que solo escribe una frase; el servidor no tiene plan propio y la deduce como «cocinar con lo que tengo». | `chefTools.ts:131-142`, repro `[E]` |
| 16 | Información nutricional | EXISTE-AISLADO (D-CHEF-1) · REQ. NO DEFINIDO | Panel con nueve entradas; acaba en «receta + foto del plato». Falta decidir fuente, tolerancia y aviso. | `chefTools.ts:120-130`, repro `[E]` |
| 17 | Lista de compras de un menú | EXISTE-CONECTADO (D-CHEF-3) | Paso `list`/`shopping`, pero con la instrucción de Weë Home. | `templates.ts:1311`, `prompts.ts:450-451` |
| 18 | Lista de compras de una receta, consolidada, marcable | FALTA | El panel «Lista de compras» deja una frase y acaba en receta + foto (D-CHEF-1). Sin casillas, sin pasillos, sin consolidar entre recetas. | `chefTools.ts:143-150`, repro `[E]` |
| 19 | Precios de los ingredientes | EXISTE-CONECTADO · REQ. NO DEFINIDO (país, moneda, tienda) | Paso `prices` = `text.search` «con la fuente». Las fuentes se enseñan (`sources`). Sin país ni moneda en el contexto. | `templates.ts:1310`, `ResultCard.tsx:419-428` |
| 20 | Presupuesto como límite («menú de 50 €») | FALTA · REQ. NO DEFINIDO | Ninguna entrada ni restricción de coste. | — |
| 21 | Planificar comidas (desayuno/comida/cena por día, calendario) | PARCIAL | Menú por días en texto; si el modelo escribe «Día N» al principio de línea, la tarjeta lo pliega por días `[I]`. Nada estructurado. | `ResultCard.tsx:38-96`, `prompts.ts:442` |
| 22 | Adaptar una receta existente (pegada o guardada) | FALTA | No hay entrada de «una receta»: el objetivo cabe en 300 caracteres y un trabajo no puede leer el resultado de otro. | `creator/index.ts:310` |
| 23 | Organizar recetas (guardar, buscar, favoritas, colecciones) | PARCIAL | **¿Se puede guardar una receta o un menú semanal? Sí, como trabajo dentro de un proyecto** («Guardar en proyecto» del resultado, nombre sugerido «Mi …»); **no** como receta: no hay entidad receta, ni favoritas, ni búsqueda, y el cliente solo puede escribir `projectId` en un trabajo. | `services/projectsService.ts:79-87`, `firestore.rules:1061-1066` `[L]`; test §D `[E]` |
| 24 | Historial de lo cocinado | PARCIAL (D-CHEF-9) | «Mis proyectos» = últimos 8 trabajos de Chef **de cualquier estado**, leyendo hasta 6 páginas. | `ChefScreen.tsx:94`, `utils/paginarTrabajos.ts:21` |
| 25 | Conversación guiada (preguntas con opciones y «No sé») | EXISTE-CONECTADO | Cinco preguntas (`what`, `change`, `people`, `time`, `days`) con `when`; deducción local en español o por LLM (`text.structure`). | `templates.ts:1165-1206`, `planner.ts:119-132,201-260` |
| 26 | Conversación libre con contexto de cocina | FALTA | `brainChat` no recibe experiencia. | `creator/brain.ts:149-169` |
| 27 | Ajustes que viajan como respuestas (no solo como texto) | FALTA (D-CHEF-4) | Los ids de `people`/`time` coinciden con los del servidor [E], pero se mandan pegados al objetivo. `workspace` no se manda. | `ChefScreen.tsx:130-144`, test §B `[E]` |
| 28 | Memoria persistente (preferencias, despensa, restricciones) | FALTA · REQ. NO DEFINIDO | Es el equivalente de la «memoria de marca» de Design (D8): una sola decisión para las dos. | `docs/DESIGN.md` §4 D8 `[L]` |
| 29 | Dictado por voz | EXISTE-AISLADO | El botón avisa «próximamente»; existe la capacidad `audio.transcribe` (ROUTABLE), sin interfaz. | `ChefScreen.tsx:279-285`, `core/registry/capabilities.ts:308` |
| 30 | Leer la receta en voz alta | EXISTE-AISLADO | `voice.tts` es ROUTABLE y Chef no la usa; coste relativo alto (R-8). | `engine/registry.ts:113`, `credits/creditCosts.ts:36` |
| 31 | Compartir / publicar una receta | EXISTE-CONECTADO con límites (D-CHEF-8) | Va al Wäll con `sourceSection: 'chef'` y firma «Weë Chef»; texto crudo cortado a 480 de 500. | `screens/CreatorFlowScreen.tsx:400-430`, `CreateScreen.tsx:372` |
| 32 | Muro / comunidad dentro de Chef | No existe por decisión (D-2) | Hay UN Wäll con el filtro «Weë Chef». | `utils/feedFilters.ts:87-93`, `services/firestoreService.ts:606` |
| 33 | Coste visible antes de crear; reserva, cobro y reembolso | EXISTE-CONECTADO | `PlanCard` muestra pasos y total (con «precio de prueba»); `creatorRun` reserva todo y, si algo falla, reembolsa todo. | `components/creator/PlanCard.tsx`, `creator/index.ts:611-624,799,817` |
| 34 | Cancelar / reintentar | PARCIAL | No se puede cancelar un trabajo en marcha (`cancelled` no lo escribe nadie). «Intentar de nuevo» abre OTRO trabajo y vuelve a preguntar (D-CHEF-6). | `creator/types.ts:150-167`, `CreatorFlowScreen.tsx:335,619`, test §F `[E]` |
| 35 | Trabajos largos | EXISTE-CONECTADO (síncrono) | Los cuatro planes caben en una sola llamada (plazo 900 s; la app espera 15 min). No hay trabajos asíncronos de Chef y no hacen falta. | `creator/index.ts:53-54`, `services/creatorService.ts:187` |
| 36 | Idiomas | EXISTE-CONECTADO (cliente) · PARCIAL (servidor) | `chef.ts` en los 16 idiomas; los textos que escribe el servidor (preguntas, opciones, plan) solo en es/en/da, el resto cae al inglés. | `i18n/textos/*/chef.ts`, `docs/I18N.md` §10 |

### 1.3 Qué capacidades del Core usa Chef y quién las sirve hoy

| Capacidad | Catálogo | Variante que usa Chef | Cadena por defecto (se cambia en Firestore, no en código) | Servicio de Credits (precio de PRUEBA) |
|---|---|---|---|---|
| `text.generate` | ROUTABLE | `recipe`, `menu`, `shopping` | gemini → claude → openai (`engine/registry.ts:85`) | `ai_text` (`creditCosts.ts:64`) |
| `text.search` | ROUTABLE | `shopping` | gemini (búsqueda con fuentes) (`registry.ts:87`) | `ai_search` (`creditCosts.ts:68`) |
| `vision.describe` | ROUTABLE | `describe` | gemini (`registry.ts:91`) | `ai_text` (rama por defecto, `creditCosts.ts:232`) |
| `image.generate` | ROUTABLE | `dish` | gemini → flux → seedream (`registry.ts:95`) | `ai_image*` según nivel (`creditCosts.ts:189-193`) |
| `image.edit` | ROUTABLE | `dish_edit` | gemini → flux → seedream (`registry.ts:97`) | `ai_image_enhance*` (`creditCosts.ts:194-199`) |
| `text.structure` | ROUTABLE | — (lo usa el planificador, no se cobra) | gemini → claude → openai (`registry.ts:86`) | sin servicio: coste del proveedor, no de la persona |
| `voice.tts` · `audio.transcribe` · `doc.render` | ROUTABLE · ROUTABLE · DECLARED (cadena vacía) | — | `registry.ts:113,94,116` | — |

Las capacidades de imagen las comparten Design, Business, Home, Beauty y Photo; Chef solo usa las variantes `dish` y `dish_edit`, y **ninguna** pasa por el
conductor del Core: son *legacy* (`creatorRun` → `runCapability`, `creator/index.ts:744-767`; `CLAUDE.md` §10 solo declara tres puertas, ninguna de imagen). Sin claves de
proveedor todo cae al adaptador de prueba (modo demo, resultados marcados). Las variantes `recipe`, `menu`, `shopping` (de `text.generate` y de `text.search`), `dish`, `dish_edit` y `describe` **ya están declaradas** en el
catálogo del Core (`core/registry/capabilities.ts:205-284`) y no hay variantes de nutrición, sustitución ni compra de supermercado: añadirlas
es un cambio del Core (cerca F3), ver §4 y la propuesta CHEF-16.

### 1.4 Defectos y huecos (reproducidos o leídos)

| ID | Tipo | Sev. | Qué pasa | Cómo se ve | Prueba |
|---|---|---|---|---|---|
| **D-CHEF-1** | defecto reproducible | alta | «Información nutricional» y «Lista de compras · De una receta» acaban en el plan **receta + foto del plato**: se paga una foto que no se pidió y el plan dice «Voy a preparar una receta…». | `R7\G-chef\repro-chef-paneles.log` §1-2 | `chef-caracterizacion` §C |
| **D-CHEF-2** | defecto reproducible | alta | «Sustituir ingredientes» se deduce como «cocinar con lo que tengo» (por la palabra *ingredientes* del título del panel): el plan empieza con `vision.describe` y el cliente exige foto. En inglés la regla del cliente no coincide. | `repro-chef-foto.log` | §C |
| **D-CHEF-3** | defecto reproducible | media | La lista de compras de Chef usa `KIND_INSTRUCTIONS.shopping`, escrita para Weë Home («agrupa por zona del espacio, prioriza 6–8 elementos, nivel de gasto»). | `repro-chef-paneles.log` §3 | §C |
| **D-CHEF-4** | integración incompleta | media | Los ajustes (personas, tiempo) viajan solo como texto; el deductor local solo lee español, así que en otros idiomas Weë vuelve a preguntar lo ya elegido (lo que `CLAUDE.md` §10 prohíbe). `diet` y `level` no tienen pregunta en el servidor. | test §B/§C | §B, §C |
| **D-CHEF-5** | defecto reproducible · seguridad alimentaria | media | El servidor corta el objetivo a 300 caracteres y los ajustes (la dieta) se pegan **al final**: con una idea larga la restricción se pierde sin aviso. La caja no limita la longitud. | `creator/index.ts:310`, `ChefScreen.tsx:150-152` | §B |
| **D-CHEF-6** | integración incompleta | media | «Crear otra versión», «Intentar de nuevo» y los retoques abren un trabajo nuevo **sin las respuestas** (solo Weë Travel las conserva): se vuelve a preguntar y se vuelve a cobrar el plan entero. | `CreatorFlowScreen.tsx:335,352-363,619` | §B |
| **D-CHEF-7** | hueco `[I]` | baja | El retoque de la foto del plato y el postre no tienen tarjeta; la foto de la caja, si estaba vacía, deja el objetivo «Cocinar con los ingredientes que tengo» (→ `cook`). `edit` solo sale si ninguna palabra clave se dispara y se elige en `what`. | `ChefScreen.tsx:202` | §C |
| **D-CHEF-8** | defecto `[I]` | baja | «Publicar» manda el texto **crudo** de todos los resultados, cortado a 480 (el compositor admite 500): una receta completa no cabe y, si es corta, puede colarse la línea interna `IMAGEN:`. | `CreatorFlowScreen.tsx:400-410` | §E |
| **D-CHEF-9** | UX/operación | baja | «Mis proyectos» lista también conversaciones sin terminar y trabajos fallidos (con su estado debajo), así que el texto de vacío «Todavía no has cocinado nada» no sale aunque nada se haya cocinado; y lee hasta 6 páginas por foco. | `ChefScreen.tsx:94`, `ChefProyectos.tsx:54-80` | §E |
| **D-CHEF-10** | deuda de documentación | baja | Comentarios y configuración del muro piloto (`specialists.ts:286,445,538`), la ficha de Chef (ejemplos, caja de idea, acciones) sin consumidor, y los briefs que describen una estructura que ya no existe. | `constants/specialists.ts:499-547` | §E |
| **D-CHEF-11** | integración incompleta | baja | Las cuatro «frases rápidas» del resultado («hazlo más realista», «cambia el color»…) son de imagen genérica, solo salen si hay imagen y regeneran **todo el plan** (receta + foto). No hay ninguna frase de cocina («para seis», «sin gluten», «más barato»). | `ResultCard.tsx:282,645-659` | — `[L]` |

### 1.5 El contexto que viaja a Weë Brain y el que falta (CLAUDE.md §10)

| Dato | ¿Viaja hoy? | Por dónde | Falta |
|---|---|---|---|
| Experiencia (`chef`) | Sí | `experienceId` → `creatorChat` | — |
| Lo que escribió la persona | Sí, ≤ 300 caracteres | `goal` (`creator/index.ts:310`) | Aviso cuando se corta (D-CHEF-5) |
| Acción elegida (receta, cocinar, menú, saludable, «No sé») | Sí | `preset` → `presetAnswers` (`:342-350`) | Las tres funciones nuevas (CHEF-03) |
| Personas, tiempo, días | Solo como texto | pegado al `goal` | `presets` con los mismos ids (CHEF-02) |
| Dieta, dificultad | Solo como texto | pegado al `goal` | Pregunta propia (CHEF-06) |
| Alergias, cultura | No existen | — | REQ. NO DEFINIDO (D-4, D-5) |
| Foto (nevera / plato) | Sí | `imageUri` → Storage → `imageUrl` | Distinguir «mis ingredientes» de «mi plato» (CHEF-10) |
| Idioma | Sí | `locale` (la plantilla escribe en español; el texto del paso sale en el idioma pedido) | — |
| Lugar de trabajo (`workspace: 'chef'`) | No | `ContextoDeExperiencia` lo admite; el servidor no lo lee | Declararlo (CHEF-02); es transporte |
| Proyecto | Después de crear | `ProjectPicker` → `assignJob` | `projectId` al crear (el servidor ya lo acepta, `index.ts:329`) |
| Receta anterior / resultado de otro trabajo | No | — | Entrada cruzada (CHEF-15, requiere autorización) |
| Preferencias de la persona | No | — | Memoria (CHEF-17, requiere decisión) |
| País / moneda / unidades | No | solo `locale` | REQ. NO DEFINIDO (D-8) |

---

## 2. Contratos de entrada y salida

**Principios.** (1) Todo lo nuevo reutiliza los contratos que ya existen —`ContextoDeExperiencia`, `TEMPLATES.chef`, `Plan`/`PlanStep`,
`JobResult`, `Asset`, `ProjectItem`—; los tipos de abajo son **propuesta documental**, no código. (2) Los catálogos guardan claves, no
frases (`CLAUDE.md` §8). (3) Los identificadores `questionId`/`optionId` ya usados **no se renombran** (viajan al servidor y están en trabajos
guardados). (4) Nada de lo propuesto exige tocar una cerca de integridad en el primer lote (§4.2).

### 2.1 Entrada desde la pantalla (existente: `constants/weeWorkspaces.ts:181-226`)

| Campo de `ContextoDeExperiencia` | Hoy | Propuesto para Chef |
|---|---|---|
| `experienceId` | `'chef'` | igual |
| `workspace` | no se manda | `'chef'` (declarativo; solo `StudioScreen` y Design lo mandan hoy) |
| `goal` | idea + ajustes pegados («idea (ajustes)») | la idea; los ajustes viajan además como `presets` |
| `preset` | `{ what: recipe · cook · menu · healthy · idk }` | además `nutrition`, `swap`, `shopping` (CHEF-03) |
| `presets` | no se manda | `[{people}, {time}, {days}]` con los ids de siempre (`1·2·4·8`, `15·30·60`, `3·7`) y, tras CHEF-06, `{diet}` |
| `imageUri` | foto elegida | igual |
| `adjuntos` | no se usa | **no** se amplía `ClaseDeAdjunto` (tipo compartido): la foto sigue siendo `imageUri` |

### 2.2 El servidor (existente, no se cambia en el primer lote)

`creatorChat(data)` recibe `{ jobId?, experienceId?, goal?, answer?, presetAnswers?, projectId?, imageUrl?, locale? }`
(`creator/index.ts:196-209`) y devuelve `{ jobId, status, question | plan, creditsEstimated, pricing, demo, inputImageUrl }` (`:229-238`).
Límites: objetivo 300 caracteres (`:310`), respuesta escrita 300 (`:300`), respuesta deducida de un campo libre 200 (`planner.ts:61`).
`creatorQuote({ jobId, quality? })` guarda calidad y precio en una transacción (`:444-481`). `creatorRun({ jobId, locale })` reclama,
reserva, ejecuta los pasos en orden y liquida o reembolsa (`:552-833`).

### 2.3 La plantilla de Chef y sus cuatro formas de plan

| Pregunta | Opciones (ids estables) | Cuándo se hace |
|---|---|---|
| `what` | `recipe` `cook` `menu` `healthy` `dessert` `edit` `idk` | siempre, salvo que llegue contestada o se deduzca |
| `change` | `light` `background` `appetizing` `pro` `clean` `idk` (+ texto libre) | solo si `what = edit` |
| `people` | `1` `2` `4` `8` `idk` (+ texto) | si `what ≠ edit` |
| `time` | `15` `30` `60` `idk` (+ texto) | si `what` no es `menu` ni `edit` |
| `days` | `3` `7` `idk` (+ texto) | solo si `what = menu` |

(`templates.ts:1165-1206`.) Formas de plan `[E]` (recorriendo las 211 combinaciones de respuesta) y su coste en el **catálogo de PRUEBA, modo simulado** `[M]`:

| Forma | Pasos (id · capacidad · variante) | Foto de la persona | Credits de prueba |
|---|---|---|---|
| A · receta | `recipe` text.generate/recipe → `dish` image.generate/dish | no | `ai_text` 2 + `ai_image_lite` 3 = **5** |
| B · cocinar con lo que tengo | `look` vision.describe/describe → A | **sí** | `ai_text` 2 + 2 + `ai_image_lite` 3 = **7** |
| C · menú | `menu` text.generate/menu → `prices` text.search/shopping → `list` text.generate/shopping | no | `ai_text` 2 + `ai_search` 3 + `ai_text` 2 = **7** |
| D · retocar el plato | `dish` image.edit/dish_edit | **sí** | `ai_image_enhance_lite` **3** |

Esos números son placeholders del Credit Engine (`creditCosts.ts:20-71`; `pricingMode: simulated` por defecto) y los fija
`estimate-plan.test.mjs:56-125` (que además mide 3 en modo real para la forma A). **No son precios**: no se comunican ni se copian a ninguna pantalla.
Chef aporta 4 formas y 9 pasos a los pines «35 formas / 74 pasos» de `brain-pasos`, `pasos-repetidos` y `entrada-de-paso` `[E]`.

### 2.4 Propuesta: tres funciones con plan propio (CHEF-03)

Sin variantes nuevas en el catálogo (se reutilizan las declaradas) y sin foto del plato:

| Opción de `what` (`optionId`) | Plan | Variante | Instrucción propia de Chef (en `prompts.ts`, por experiencia) |
|---|---|---|---|
| `nutrition` | `facts` text.generate | `answer` | estimación **por porción**, rotulada como aproximada, sin cifras inventadas, sin consejo médico |
| `swap` | `swap` text.generate | `answer` | qué cambiar, en qué cantidad y cómo afecta al resultado; respeta la restricción dicha |
| `shopping` | `list` text.generate | `shopping` | lista de la compra: por sección del supermercado, con cantidades consolidadas y sin tope de elementos |

El texto de cada panel («Calorías», «Sin lactosa», «Para la semana»…) sigue llegando en el `goal`; no se añade ninguna pregunta nueva en v1.
Los ids de las entradas de panel (`chefTools.ts:119-151`) ya son buenos `optionId` para una segunda iteración (`focus`, `reason`, `listFor`).

### 2.5 Propuesta: leer la receta que ya sale y escalarla en el dispositivo (CHEF-04); marcas solo con la tarjeta (CHEF-07)

No se cambia `JobResult.content` (sigue siendo texto: `creator/types.ts:103-132`) ni, en el lote 1, el prompt.

**Paso 1 · lote 1 (CHEF-04): un lector tolerante del formato de HOY.** El prompt de receta ya pide título con emoji, personas, tiempo total, ingredientes con cantidades (•),
pasos numerados y un consejo (`prompts.ts:440-441`), y las reglas de formato piden «listas con • y pasos numerados» (`prompts.ts:486-487`). El lector se apoya en eso
(viñetas = ingredientes, líneas numeradas = pasos, primera línea = título, la línea con «personas» y minutos = porciones y tiempo), descarta la línea interna `IMAGEN:`
(`utils/textoDeResultado.ts:19`) y **nunca adivina**: si una línea no se entiende, se conserva tal cual y no se escala.

**Paso 2 · lote 2 (CHEF-07): marcas.** Para que la lectura no dependa de cómo titule el modelo, el prompt pasa a pedir
`INGREDIENTES:` y `PASOS:` copiadas en español en cualquier idioma, como Weë Travel hace con `DÍA N ·` y `PRESUPUESTO:` (`prompts.ts:385-393,403-408,432`;
`ResultCard.tsx:38-96`). **Solo se activan junto con la tarjeta**: es la tarjeta quien las traduce a cada idioma; en el resultado genérico se verían en español.

```
<emoji> <TÍTULO>
Para <N> personas · <tiempo total>
INGREDIENTES:
• <cantidad> <unidad> de <ingrediente>
PASOS:
1. …
CONSEJO: …
IMAGEN: <en inglés>                ← marca interna que ya se oculta (textoDeResultado.ts:19)
```

El lector es una **función pura del cliente** (nueva, sin proveedor):

```ts
// PROPUESTA — no existe
interface RecetaLeida {
  titulo: string; emoji?: string;
  porciones?: number; minutos?: number;                 // ausentes si el texto no los dice
  ingredientes: { texto: string; cantidad?: number; unidad?: string; nombre?: string }[];  // `texto` = línea original: fallo cerrado
  pasos: string[]; consejo?: string;
}
leerReceta(texto: string): RecetaLeida | null           // null = no se pudo leer → se enseña el texto tal cual
escalarReceta(r: RecetaLeida, porciones: number): RecetaLeida | null
```

**Reglas de escalado propuestas** (`[P]`; **requieren revisión de alguien que cocine** antes de darlas por buenas: UNKNOWN su validez culinaria):

| Cosa | Regla |
|---|---|
| Factor | `nuevas / base`, con `base` leída de «Para N personas» o, si falta, de la respuesta `people`; sin base no se escala; fuera de 0,25–10 se rechaza |
| g · ml · kg · l | proporcional; g/ml redondeados a 5 si ≥ 100, a 1 si ≥ 10, a 0,5 si menos; kg/l a 0,05 |
| cucharadas, cucharaditas, tazas | proporcional, redondeado a ¼ |
| piezas (huevos, dientes de ajo…) | al entero más cercano (a la mitad cuando tiene sentido), marcado «≈» si hubo redondeo |
| «al gusto», «una pizca», «un chorrito» | no se tocan |
| tiempos, temperaturas, tamaño de molde | **no se escalan**; si el factor es > 2 o < 0,5, aviso: «revisa los tiempos y el tamaño del molde» |
| fracciones | se muestran con el formateador del idioma (`i18n/formato.ts`), nunca `toLocaleString('es')` |

La lista de compras estructurada sale del mismo texto con una marca más (`SECCIÓN:`) y se lee con otra función pura (`leerLista`); el estado de las casillas es **local al
dispositivo** en v1 (limitación: no viaja entre dispositivos).

### 2.6 Propuesta: dónde se guarda una receta (decisión D-6)

| Opción | Qué es | Coste y límites | Recomendación |
|---|---|---|---|
| **P0** | La receta sigue siendo el resultado del trabajo (`creatorJobs.results`); se lee con `leerReceta` y se agrupa con `projectId`. | Cero almacenamiento nuevo, cero reglas, cero cercas. Sin búsqueda ni favoritas. | **Lote 1** |
| **P1** | Reutilizar `users/{uid}/writerDocuments` (`documentsService`) con `jobId`. | Mezcla recetas con textos de Writer en «Mis documentos»; reglas ya existen (`firestore.rules:283`). | No recomendada |
| **P2** | Subcolección propia `users/{uid}/chefRecipes` (receta estructurada). | Reglas + despliegue + migración + i18n; depende de la decisión de memoria (D8 de Design). | Tras D-4/D-6 |

Un **Element** no sirve para la receta: no admite texto (`core/element.ts:254-259` prohíbe `content`/`data`), solo nombre, descripción ≤ 500 y referencias a
materiales; y la callable `elements` no se despliega (`ops/despliegue/grupos.json:45`). Sí podría servir, más adelante, para «mi plato estrella» (producto + fotos).
El texto de una receta tampoco es un material: `materialesDeResultado` solo crea ficha cuando el resultado tiene URL (`creator/index.ts:509`) [E, test §D].

### 2.7 Errores y estados que ya existen (se reutilizan tal cual)

`INSUFFICIENT_CREDITS` → aviso con saldo, coste y tienda (`CreatorFlowScreen.tsx:317-319,600-614`); `RATE_LIMITED`, `TIMEOUT`, `DUPLICATE_REQUEST`,
`NOT_AVAILABLE` (por motivo) → `humanizeCreatorError` (`services/creatorService.ts:237-259`); `needs_image` → «Sube una foto…» antes de reservar nada
(`creator/index.ts:594`); fallo de un paso → reembolso y `failed` con «No me salió bien. No te cobré.» (`:817-826`). Estados del trabajo: `asking · planned · running ·
done · failed` (`cancelled` está declarado y nadie lo escribe).

---

## 3. Flujos de usuario principales

Todos pasan por el mismo camino; lo que cambia es la entrada y qué muestra la tarjeta de resultado. «Hoy» = lo que hace el código; «Con el plan» = tras las tareas citadas.

### Flujo 1 — «¿Qué cocino con lo que tengo?»
**Entrada:** tarjeta «Usar mis ingredientes» o el botón de foto de la caja → foto de la nevera → «Cocinar».
**Pasos:** (1) foto (permiso de cámara o galería; si se cancela no pasa nada, `ChefScreen.tsx:184-206`) → ficha «Foto añadida»; (2) opcional: ajustes (personas, tiempo, dieta);
(3) `CreatorFlow` sube la foto al Storage de Weë y abre el trabajo; (4) Weë pregunta solo lo que falta (personas, tiempo); (5) `PlanCard`: «Voy a mirar tu foto → escribir la receta → foto del plato · ≈ N Credits (precio de prueba)»;
(6) «Crear» → `JobProgress` (tres pasos); (7) `ResultCard`: receta + foto del plato.
| Estado | Hoy | Con el plan |
|---|---|---|
| vacío | sin sesión → Login; sin foto, el `UploadBox` sigue visible y «Crear» avisa «Sube una foto» | al añadir una foto, la pantalla pregunta si es de sus ingredientes o de su plato; sin foto no se pide (CHEF-10) |
| carga | «Subiendo tu foto…», «Weë está pensando…», cotizando, progreso por pasos | igual |
| error | foto no sube; sin Credits (saldo/coste/tienda); `needs_image`; proveedor falla → reembolso total (R-3) | igual; el reintento conserva lo contestado (CHEF-05) |
| éxito | texto de la receta + foto; descargar, publicar, guardar en proyecto, «otra versión» | `RecetaCard` con porciones y copiar (CHEF-07) |
| reintento | «Intentar de nuevo» = trabajo nuevo, vuelve a preguntar (D-CHEF-6) | conserva las respuestas (CHEF-05) |
| cancelación | antes de «Crear»: salir; queda un trabajo `asking`/`planned` sin coste. En marcha: **no se puede** | igual (cancelar es F4, propuesta aparte) |

### Flujo 2 — Receta con mis restricciones, y sustituir o ver la nutrición
**Entrada:** escribir «lasaña sin lactosa para cuatro» con los ajustes puestos, o el panel «Sustituir ingredientes» / «Información nutricional».
**Hoy:** el panel deja una frase; el plan resultante no es el que promete (D-CHEF-1/2); la dieta va como texto y puede cortarse (D-CHEF-5).
**Con el plan:** CHEF-02 manda personas/tiempo como respuestas; CHEF-03 da a cada panel su plan de **texto, sin foto**; CHEF-06 (tras D-4/D-5) añade la dieta y las alergias
como restricción **obligatoria** que aparece en la frase del plan («sin gluten»).
| Estado | Con el plan |
|---|---|
| vacío | la caja pide la idea; las fichas muestran lo elegido y se quitan de un toque |
| carga | igual que el flujo 1 |
| error | igual; una cifra nutricional siempre sale rotulada como estimación |
| éxito | resultado de texto (más corto y barato que receta + foto) |
| reintento / cancelación | como el flujo 1 |

### Flujo 3 — Menú de la semana, lista de compras y precios
**Entrada:** «Crear un menú» o el panel «Lista de compras · Para la semana».
**Pasos:** personas y días (3 o 7) → `PlanCard` «Voy a armar un menú …, y te dejo la lista de compras» → tres pasos (menú, precios con fuente, lista) → resultado por días plegables (si el modelo escribe «Día N»), presupuesto con fuentes y lista → «Guardar en proyecto: Mi semana».
| Estado | Hoy | Con el plan |
|---|---|---|
| carga | tres pasos; el de precios usa búsqueda con fuentes (más lento) | igual |
| error | si falla la lista tras el menú: reembolso total y el menú se conserva (R-3) | igual (política de cobro parcial: decisión aparte) |
| éxito | la lista sale con la instrucción de Home (D-CHEF-3) | CHEF-01: por sección del supermercado, con cantidades; CHEF-08: casillas locales |
| precios | «con la fuente»; sin país ni moneda (D-8) | etiquetados «orientativos» |

### Flujo 4 — Trabajar sobre una receta ya hecha (porciones, sustituir, otra versión)
**Entrada:** abrir un trabajo desde «Mis proyectos» o desde un proyecto (`CreatorFlow { jobId }`, `ChefScreen.tsx:347`).
**Hoy:** el resultado es texto; cambiar de 4 a 6 = «otra versión» (trabajo nuevo, cobro entero) o escribirlo en la caja.
**Con el plan (lote 2):** `RecetaCard` lee la receta (`leerReceta`); el control de porciones **reescala en el dispositivo, gratis y al instante** (`escalarReceta`);
«Cambiar algo» abre el plan corto `swap` (texto, sin foto) con su coste a la vista. Sin el lector: se enseña el texto tal cual y no hay control.
| Estado | Con el plan |
|---|---|
| vacío | un trabajo sin receta legible no ofrece porciones |
| error | el lector devuelve `null` → texto sin control; nada se rompe |
| éxito | cantidades reescaladas con aviso «≈» donde hubo redondeo y «revisa tiempos» si el factor es grande |
| cancelación | reescalar no gasta nada: no hay nada que cancelar |

### Flujo 5 — Retocar la foto de mi plato y compartirla
**Entrada:** foto del plato + «Retocar mi foto» (hoy solo vía la pregunta `what`, D-CHEF-7; CHEF-10 le da puerta).
**Pasos:** foto → «¿Qué quieres cambiar?» (luz, fondo, más apetitoso, de restaurante, quitar algo, o texto libre) → plan `image.edit` → antes/después → publicar en el Wäll o descargar.
| Estado | Hoy |
|---|---|
| vacío | sin foto, «Crear» avisa; la foto debe ser de la persona (carpeta propia del Storage) |
| error | el proveedor rechaza la entrada (`input_rejected`) → mensaje y reembolso; foto que no es comida: sin comprobación (UNKNOWN) |
| éxito | `ResultCard` con antes/después; «Publicar en mi comunidad» (`sourceSection: chef`) y descarga |
| reintento | otra versión = trabajo nuevo (misma foto, coste de una edición) |

**Cómo encaja Chef sin copiar a Studio ni a Design (propuesta, depende de D-1).** Studio **encamina** a otras experiencias (`WORKSPACES_QUE_ENCAMINAN = ['studio']`,
`weeWorkspaces.ts:112`) y Design trabaja sobre un lienzo con inspector; Chef **crea** y su pieza central es **la receta como documento vivo**
(porciones, sustitución, nutrición, compra), no un lienzo. Se conserva el orden aprobado (cabecera → caja → funciones → recetas, blanco y dorado, iconos de un trazo,
sin fotos de stock: solo la foto del plato de la persona) y lo nuevo entra **plegado por defecto** con el patrón que ya existe (`herramientasAbiertas`,
`SpecialistScreen.tsx:58`, `TravelLauncher`): «Mi cocina» (restricciones y preferencias elegidas), «Mis recetas» (lo cocinado) y, solo si el dueño lo pide, «De la comunidad»
(`paginaDeLaSeccion` + `PostCard`, ya existen). La superficie principal es la caja y la receta; el muro social es el Wäll.

---

## 4. Dependencias reales

### 4.1 De otras tareas y decisiones

| De quién | Qué necesita Chef | Estado real | Efecto |
|---|---|---|---|
| **Design (F)** | Su lista de cierre, qué archivos compartidos toca y sus decisiones D1–D9 | En curso (al escribir esto, `R7\F-design\` solo tenía logs) | Chef comparte con Design `screens/CreatorFlowScreen.tsx`, `components/creator/ResultCard.tsx`, `constants/weeWorkspaces.ts`, `functions/src/creator/{templates,prompts}.ts` y los catálogos `i18n/textos/*/catalogo.ts` y `weeai.ts`. Las tareas que tocan esos archivos (CHEF-05, 07, 12) esperan a F. |
| **Design D3 / D8 / D9** | Patrón de «editar tras generar», de «memoria» y de política de contenido | Sin decidir (`docs/DESIGN.md` §4) | CHEF-06 y CHEF-17 **no** deciden por su cuenta: reutilizan lo que se decida para Design. |
| **Almacenamiento (E)** | Foto del plato como material (`assets`); texto sin material | La foto ya se cataloga (`creator/index.ts:500-550`); en producción `assets` estaba a 0 al medir `[L]` R6 | Ninguna tarea del lote 1 toca `content/`, `core/media/`, `media/`. |
| **Mapa (H) / Rendimiento (I) / Aceptación (J)** | Que Chef esté en el mapa y en los escenarios | — | Los defectos D-CHEF-1…11, las lecturas de «Mis proyectos» (D-CHEF-9) y el fallo a medias (R-3) son insumos directos. |
| **Dueño** | Decisiones D-1…D-12 (§8) | Pendientes | Bloquean solo lo marcado en §6. |

### 4.2 Qué se puede y qué no se puede tocar sin mover una cerca (`puente-pre-f1d`, 42 comprobaciones en verde `[E]`)

| Zona | Regla | Consecuencia para Chef |
|---|---|---|
| `functions/src/creator/templates.ts`, `prompts.ts`, `inputs.ts`, `types.ts` | F1 las admite **por nombre** (`puente-pre-f1d.test.mjs:595-602`); sin tamaño exacto | **Libres** para el lote 1 |
| un archivo NUEVO en `functions/src` | F1 falla (lista exacta por nombre, `:715`) | Nada nuevo en el servidor sin reanclar |
| `creator/index.ts`, `creator/credits.ts` | F4: tamaño exacto (`:778-788`) | Sin entrada cruzada ni reintento del paso fallido (CHEF-15) |
| `creator/planner.ts`, `experiencias.ts`, `sombra.ts`… | no están en la lista de F1 (no se han tocado desde `b023f24`) | Cerrados |
| `credits/*`, `core/*`, `engine/*`, `content/*` | F2/F3/E4: tamaño exacto | Sin variantes nuevas del catálogo (CHEF-16), sin precios |
| cliente (`screens/`, `components/`, `constants/`, `utils/`, `services/`) | no hay cerca | Libre, con `tsc` en 0 |
| `firestore.rules`, `storage.rules` | Las leen otras pruebas y se despliegan aparte | Sin colecciones nuevas en el lote 1 |

### 4.3 Qué pines se mueven al tocar la plantilla de Chef (`[E]` todas en verde hoy)

Medido **simulando en memoria** una opción nueva de `what` con un plan de un solo paso `text.generate` (`R7G-chefsimula-plan-nuevo.mjs`, sin tocar ningún archivo), se mueven **seis** suites:
`brain-pasos` (35 formas · 74 pasos · 67 variantes), `pasos-repetidos` (35 secuencias · 74 instancias · 68), `entrada-de-paso` (64 de 65 pasos, 47 frases), `pistas-de-paso` (65 pasos),
`puente-necesidades` (35 formas · 74 pasos · 41 aristas; 32 formas fieles) e `i18n-servidor` (reconstruye **todo** lo que el servidor puede escribir y exige que el catálogo lo reconozca).
`estimate-plan`, `planner` y `chef-weeai` siguen verdes. La «forma» se mide por la secuencia de capacidades (`entrada-de-paso.test.mjs:76-88`), así que las tres opciones de CHEF-03a, que son
un solo `text.generate`, suman **una** forma y **un** paso (35→36, 74→75). Cada texto nuevo del servidor son **tres** diccionarios (es, en, da; tipados contra el español);
cada clave nueva de interfaz son **dieciséis** (`docs/I18N.md` §7).

### 4.4 De proveedores y de infraestructura

Ningún proveedor nuevo: todo sale de capacidades ROUTABLE y de las cadenas actuales. Sin claves, todo corre en modo demo. La **calidad real** de lo que escribe el modelo
(parseo de la receta, respeto de una restricción, cifras) **no se puede medir sin un proveedor real** → UNKNOWN hasta un canary autorizado (CHEF-18).
`main` no es producción: según `docs/DESIGN.md` §5, `creatorChat`/`creatorRun` corren en producción código anterior a los arreglos de la auditoría H0 y **este camino completo no tiene
suite de emulador** (AC-26) `[L]`.

---

## 5. Pruebas de aceptación

«Sin emulador/proveedor» = se ejecuta con `node functions/test/<x>.test.mjs` sobre `functions/lib`. Estado: **VERDE** (hoy pasa), **ROJO** (hoy no se cumple; la tarea lo pone en verde), **N/A** (no existe aún).

| ID | Criterio comprobable | Cómo | Sin emulador/proveedor | Hoy | Tarea |
|---|---|---|---|---|---|
| AC-01 | Receta estándar: plan `recipe → dish` y coste mostrado antes de crear | `estimate-plan`, `chef-weeai` #17, `chef-caracterizacion` §A | sí | VERDE | — |
| AC-02 | Menú: `menu → prices → list` | `chef-caracterizacion` §A | sí | VERDE | — |
| AC-03 | Solo `cook` y `edit` exigen foto | §A | sí | VERDE | — |
| AC-04 | Ninguna frase de panel exige foto salvo «con lo que tengo» | §C (invertir D-CHEF-2) | sí | ROJO | CHEF-03b |
| AC-05 | «Información nutricional» → plan **sin** foto del plato | §C (invertir D-CHEF-1) | sí | ROJO | CHEF-03a |
| AC-06 | «Sustituir ingredientes» → plan de texto, sin `vision.describe` | §C | sí | ROJO | CHEF-03a + 03b |
| AC-07 | «Lista de compras» → plan con paso `shopping` y sin foto del plato | §C | sí | ROJO | CHEF-03a |
| AC-08 | La instrucción de compra de Chef agrupa por sección del supermercado, con cantidades, sin «zona del espacio» ni tope de 6–8; la de Home no cambia | §C (invertir D-CHEF-3) + `variantes-con-significado` | sí | ROJO | CHEF-01 |
| AC-09 | Todo `kind` nuevo es una variante declarada en el catálogo | §A | sí | VERDE | debe seguir |
| AC-10 | Ningún precio escrito en Chef; el coste sale de `creatorQuote` | `chef-weeai` #35-36 | sí | VERDE | — |
| AC-11 | Personas y tiempo elegidos viajan como `presets` válidos y **no se vuelven a preguntar**, en cualquier idioma | función pura + planificador: la primera pregunta no es `people` | sí | ROJO | CHEF-02 |
| AC-12 | El contexto lleva `workspace: 'chef'` | §B | sí | ROJO | CHEF-02 |
| AC-13 | Una restricción no se corta en silencio: la caja avisa antes de 300 caracteres o la restricción viaja fuera del texto | §B (invertir D-CHEF-5) | sí | ROJO | CHEF-02 / 06 |
| AC-14 | «Otra versión» e «Intentar de nuevo» de Chef conservan las respuestas | §B (invertir D-CHEF-6) | sí | ROJO | CHEF-05 |
| AC-15 | `leerReceta` extrae título, porciones, tiempo, ingredientes y pasos de ≥ 10 textos de ejemplo y descarta `IMAGEN:` | pruebas con textos escritos a mano (**no** son salida real del modelo) | sí | N/A | CHEF-04 |
| AC-16 | `escalarReceta`: ×1 idéntica; 4→6 y 4→1 con la tabla de §2.5; «al gusto» y tiempos intactos; factor fuera de 0,25–10 rechazado | idem | sí | N/A | CHEF-04 |
| AC-17 | Si la receta no se puede leer, no hay control de porciones y el texto sale tal cual | idem | sí | N/A | CHEF-04 / 07 |
| AC-18 | El prompt de receta pide `INGREDIENTES:`/`PASOS:` y conserva `IMAGEN:`; las marcas se copian en español en cualquier idioma | prueba de prompt (`instruccionDeSalida`) | sí | N/A | CHEF-07 |
| AC-19 | Una restricción declarada llega al paso de receta como **obligatoria** y aparece en la frase del plan | brief + `explainToUser`, con catálogo es/en/da | sí | ROJO | CHEF-06 |
| AC-20 | Toda cifra nutricional sale rotulada como estimación | prueba de prompt + prueba de la tarjeta | sí | ROJO | CHEF-03a (texto) · CHEF-07 (tarjeta) |
| AC-21 | Con la alergia «frutos secos», la receta real **no** contiene frutos secos en N ejecuciones | canary con proveedor real | **no (autorización)** | UNKNOWN | CHEF-18 |
| AC-22 | Fallo de la foto tras la receta: `failed`, reembolso total, receta conservada | `chef-caracterizacion` §F (ejecuta `creatorRun`) | sí | VERDE (caracteriza R-3) | política de cobro parcial: decisión |
| AC-23 | Doble toque en «Crear»: un solo cobro | `creator-reclamo` | sí | VERDE | — |
| AC-24 | Sin Credits: saldo/coste/tienda y el trabajo no pasa a `running` | `creator-reclamo` 7-10 | sí | VERDE | — |
| AC-25 | Timeout del cliente: el trabajo sigue y llega por Firestore | emulador | **no** | UNKNOWN | CHEF-14 |
| AC-26 | Recorrido completo `creatorChat → creatorQuote → creatorRun` (receta, menú, retoque) con el adaptador de prueba | suite de emulador (PESADA) | **no** | N/A | CHEF-14 |
| AC-27 | Orden cabecera → caja → funciones → recetas; sin emojis ni fotos de stock | `chef-weeai` | sí | VERDE | debe seguir (o cambiarse con D-1) |
| AC-28 | Todo texto nuevo por i18n (16 idiomas) y catálogos con claves | `catalogo-i18n`, `experiencias-i18n`, `i18n-servidor`, `tsc` | sí | VERDE | debe seguir |
| AC-29 | «Mis recetas» no cuenta conversaciones sin terminar ni fallidas como cocinadas | prueba de la lista | sí | ROJO | CHEF-11 |
| AC-30 | El texto publicado no lleva `IMAGEN:`, no pasa de 500 y empieza por el título | prueba de `handlePublish` extraído | sí | ROJO | CHEF-12 |
| AC-31 | Publicar desde Chef marca `sourceSection: 'chef'` y `aiTools: ['Weë Chef']`; el Wäll con el filtro «Weë Chef» lo muestra | `home`, `muro`, `chef-caracterizacion` §E | sí | VERDE | — |

> **Al día en R9-2 (2026-10-12, rama `r9/chef-2` desde `508666fb`; la columna «Hoy» de arriba es la de `d867774` y no se reescribe).** Ejecutado con `node functions/test/<x>.test.mjs` sobre `functions/lib` recién compilado:
> - **AC-08 → VERDE en el prompt** (CHEF-01 integrada, `1c60b30e`): `chef-caracterizacion` «ARREGLADO · D-CHEF-3» y `chef-lista` (34). El **texto** de la instrucción sigue **PENDIENTE de revisión de producto**; lo que escribe un modelo real, sin verificar (CHEF-18). Por lo mismo, la fila 17 de §1.2 («con la instrucción de Weë Home») y la fila D-CHEF-3 de §1.4 describen el estado de `d867774`.
> - **AC-11 y AC-12 → VERDES en la función pura** (`utils/contextoDeChef.ts`, `chef-contexto` 31: presets con los ids del servidor; con ellos el planificador real no repregunta, con objetivos en inglés y en danés). **En la pantalla siguen ROJOS**: `ChefScreen` no la llama (lo fija `chef-contexto` «PENDIENTE DE DECISIÓN (D-1)»). Espera a **D-1**.
> - **AC-13 → ROJO**: solo existe `largoParaElServidor` (cuenta como el servidor); la caja que avisa es una de las tres salidas *BLOCKED — HUMAN DECISION* (regla 7 de CHEF-02).
> - **AC-15 y AC-16 → VERDES** (CHEF-04, `chef-receta` 403 con los textos escritos a mano, **no** salida de un modelo); las **reglas culinarias** del escalado siguen **SIN REVISAR** por alguien que cocine (13 preguntas en `docs/WEE-CHEF-TAREAS-LOTE-1.md`, CHEF-04).
> - **AC-17 → VERDE la parte de las funciones** (`null` cuando no se puede leer); «no hay control de porciones en pantalla» es de CHEF-07 (N/A).
> - **AC-04…07, AC-14, AC-19, AC-20, AC-29, AC-30:** sin cambio (esperan a CHEF-03a/03b —D-3, D-1, «Para la semana»—, CHEF-05 —aplazada—, CHEF-06/07/11/12).

**Línea base ejecutada en `d867774` (todo verde):** `chef-weeai` 47 · `estimate-plan` 22 · `planner` 37 · `creator` 640 · `puente-pre-f1d` 42 · `credits-weeai` 37 · `cajas-weeai` 52 ·
`home` 362 · `muro` 165 · `composer` 144 · `catalogo-i18n` 48 · `experiencias-i18n` 43 · `i18n-servidor` 26 · `brain-pasos` 36 · `pasos-repetidos` 54 · `entrada-de-paso` 28 · `pistas-de-paso` 26 ·
`puente-necesidades` 39 · `ci-workflow` 41 · **`chef-caracterizacion` 42 (nueva)**. Duraciones de 0 a 17 s cada una `[E]`.

---

## 6. Tareas de implementación

Esfuerzo `[P]` = estimación (S ≤ 4 h · M ≈ 0,5–1,5 d · L ≈ 2–4 d), no medida. «Paralelo con» dice qué puede avanzar a la vez sin tocar los mismos archivos. Ninguna tarea de los lotes 1 y 2 necesita proveedor real ni
mueve una cerca; las de §6.3 sí necesitan autorización y **no** se implementan sin ella.

### 6.1 Lote 1 — sin decisiones que bloqueen, sin cercas, sin proveedor

(En el resto del documento, «CHEF-03» = 03a + 03b.)

| ID | Tarea | Archivos | Pruebas | Esfuerzo | Depende de | Paralelo con |
|---|---|---|---|---|---|---|
| **CHEF-01** | **La lista de compras de Chef sirve para comprar** (D-CHEF-3). Instrucciones por experiencia **sin** tocar `KIND_INSTRUCTIONS` (el puente la lee, `puente-necesidades.test.mjs:325`) ni la clave `shopping` (catálogo): Chef pide secciones del supermercado, cantidades consolidadas y sin tope. | `functions/src/creator/prompts.ts` | invertir D-CHEF-3 en `chef-caracterizacion` (mira el prompt que se arma para Chef); AC-08. **Medido:** con una instrucción propia de Chef simulada en memoria (`R7G-chefsimula-compra-chef.mjs`) siguen verdes `creator`, `entrada-de-paso`, `variantes-con-significado`, `puente-necesidades`, `i18n-idioma-de-salida`, `cierre-servidor`, `necesidades-de-paso`, `encadenar-pasos`, `pistas-de-paso`, `estimate-plan` y `planner` | S | — | 02, 04 |
| **CHEF-02** | **Los ajustes viajan como respuestas** (D-CHEF-4/5, AC-11/12/13): función pura `contextoDeChef` que arma `ContextoDeExperiencia` con `workspace: 'chef'` y `presets` desde `AJUSTES_DE_COCINA` (`auto` no se manda); `abrirFlujo` la usa; la caja no deja pasar de 300 caracteres **contando lo que los ajustes añaden** y lo enseña (contador numérico). El texto «(ajustes)» se queda para que lo lea el modelo. | `constants/chefTools.ts` (mapa ajuste → `{questionId, optionId}`), `screens/ChefScreen.tsx`, `utils/` (función pura nueva), `components/creator/CajaDePrompt.tsx` (prop opcional `maximo`, como ya son `sinMarco` y `accionesDerecha`: sin ella la caja es la de siempre) | invertir D-CHEF-4/5 en `chef-caracterizacion`; planificador con `presets` → la primera pregunta no es `people`; `chef-weeai` #15 y `cajas-weeai` siguen verdes | S–M | — | 01, 04 |
| **CHEF-03a** | **Servidor: nutrición, sustituir y lista de compras con plan propio, sin foto** (D-CHEF-1/2, AC-05…07, 20): tres opciones nuevas de `what` (`nutrition`, `swap`, `shopping`); tres ramas de `buildPlan` con variantes ya declaradas (`answer`, `answer`, `shopping`) y sus instrucciones por experiencia (el mecanismo de CHEF-01); cada cifra nutricional, rotulada como estimación; los textos del servidor (opciones, frase del plan, nombre de cada paso) en es/en/da. | `functions/src/creator/templates.ts`, `prompts.ts`, `i18n/textos/{es,en,da}/servidor/{opciones,plan}.ts` y `plan/casa.ts` | invertir D-CHEF-1 en `chef-caracterizacion`; las seis suites de §4.3 (`brain-pasos`, `pasos-repetidos`, `entrada-de-paso`, `pistas-de-paso`, `puente-necesidades`, `i18n-servidor`; +1 forma y +1 paso: 35→36, 74→75), `estimate-plan`, `planner`, `creator` | M | 01; decisión D-3A | 02 + 03b |
| **CHEF-03b** | **Cliente: la pantalla manda la intención de cada panel** (D-CHEF-2, AC-04, 06): las tres tarjetas llevan `preset`; **la pantalla recuerda el panel elegido** y manda su `preset` al enviar la frase empezada (si la persona la borra, se olvida), porque el deductor local solo lee español; `needsPhoto` solo mira las palabras del objetivo cuando no llega ningún `preset` (`!params.preset && …`). | `constants/chefTools.ts`, `screens/ChefScreen.tsx`, `screens/CreatorFlowScreen.tsx` (una línea; **compartido con F**) | invertir D-CHEF-2 en `chef-caracterizacion`; `chef-weeai` (#5, #21 siguen verdes), `tsc` | S | acuerdo de ids con 03a; va con 02 (mismos archivos de la pantalla) | 03a, 04 |
| **CHEF-04** | **Leer y escalar una receta: funciones puras** (AC-15…17): `leerReceta` (tolerante, del formato de hoy: §2.5), `escalarReceta` (reglas de §2.5) y `leerLista`, en el cliente, con ≥ 10 textos de ejemplo escritos a mano (no son salida real del modelo). **No toca el prompt ni la i18n**: sin interfaz todavía, no cambia nada de lo que la persona ve. | `utils/` (archivos nuevos del cliente) y una suite nueva `functions/test/chef-receta.test.mjs` que las ejecuta con `typescript.transpileModule` (como `chef-weeai.test.mjs`), con su paso en `functions/package.json` | la suite nueva; `tsc` | M | — | todas |
| **CHEF-05** | **Reintentar y «otra versión» sin perder lo contestado** (D-CHEF-6, AC-14): `CONSERVA_EL_CONTEXTO` incluye a Chef y `handleAnotherVersion`/reintento pasan las respuestas (`yaDichas`). | `screens/CreatorFlowScreen.tsx` (**compartido con F: empezar cuando F cierre**) | invertir D-CHEF-6; `travel` sigue igual; `creator` | S | cierre de F | 01-04 |

Orden y reparto sugeridos: **persona 1** 01 → 03a (comparten `prompts.ts` y `templates.ts`); **persona 2** 02 → 03b (comparten `ChefScreen.tsx` y `chefTools.ts`); **persona 3** 04 (solo cliente, sin tocar nada compartido); 05 al final, cuando F cierre. **Quién actualiza los pines 35/74**: solo CHEF-03a (una persona, un commit).

### 6.2 Lote 2 — necesitan una decisión del dueño (§8)

| ID | Tarea | Archivos | Decisión | Esfuerzo | Depende de |
|---|---|---|---|---|---|
| **CHEF-06** | Dieta y alergias como pregunta con **restricción dura** (AC-19, 13) | `templates.ts` (pregunta `diet`, condicionada a `what ≠ edit`), `prompts.ts` (regla de «obligatoria»), i18n es/en/da, `chefTools.ts` | D-4, D-5 (y D8 de Design si se guarda) | M | 02, 03 |
| **CHEF-07** | `RecetaCard`: la receta como documento (porciones, copiar, guardar en proyecto, aviso «≈»); ocupa el hueco de los textos del resultado cuando `leerReceta` acierta. **Junto con ella** entran las marcas `INGREDIENTES:`/`PASOS:` en el prompt (AC-18), que la tarjeta consume y traduce | `components/chef/` (nuevo), `components/creator/ResultCard.tsx` (un punto de enganche; **compartido con F**), `functions/src/creator/prompts.ts`, `i18n/textos/*/chef.ts` (16) | D-1 | M–L | 04, cierre de F |
| **CHEF-08** | Lista de compras marcable (estado local por trabajo, `AsyncStorage`) | `components/chef/`, `i18n` | D-1 | M | 03, 04, 07 |
| **CHEF-09** | Foto del plato **opcional** (palanca de coste R-5): nueva forma de plan «receta sin foto» | `templates.ts`, `PlanCard`/`ChefScreen`, i18n es/en/da, pines | D-7 | M | 03 |
| **CHEF-10** | Puerta al retoque de la foto y a «con lo que tengo»: al añadir una foto, la pantalla pregunta si es de sus ingredientes o de su plato y manda `preset` `cook` o `edit`; sin foto no manda `cook`. En `templates.ts`, la palabra «ingredientes» deja de bastar para deducir `cook` (el deductor no sabe si hay foto y `planner.ts` está congelado: la decisión la toma el cliente) | `ChefScreen.tsx`, `chefTools.ts`, `templates.ts`, i18n (16) | D-1 | S–M | 02, 03b |
| **CHEF-11** | «Mis recetas»: solo lo cocinado (estados `done`; con opción de ver lo demás); nombre según D-10 | `ChefScreen.tsx`, `ChefProyectos.tsx`, i18n (16 si se renombra) | D-10 | S | — |
| **CHEF-12** | Publicar una receta con sentido: título + resumen + foto, sin `IMAGEN:`, ≤ 500 | `screens/CreatorFlowScreen.tsx` (**compartido**) | D-2 | S–M | cierre de F |
| **CHEF-13** | Dominio `chef` del Eval Engine a $0 (sin proveedor): plan por intención, no volver a preguntar lo deducido, restricción conservada | `ops/evals/dominios/chef.mjs` + una línea en `ops/evals/dominios.mjs` (**la misma que toque Design**) | — | M | cierre de F |
| **CHEF-14** | Suite de **emulador** del recorrido Chef con el adaptador de prueba (AC-25/26) — PESADA | `functions/test/chef-recorrido.emulator.mjs` | — | M | — |

### 6.3 Propuestas que requieren autorización (no se implementan)

| ID | Propuesta | Diff previsto y cerca que se movería | Por qué |
|---|---|---|---|
| **CHEF-15** | **Entrada cruzada** `sourceJobId` en `creatorChat`: el servidor lee el resultado de OTRO trabajo propio y lo inyecta como `previous` (lista de compras de una receta guardada, adaptarla, escalarla con ayuda del modelo) | `functions/src/creator/index.ts` (~+25 líneas) + `inputs.ts`; mueve **F4** (`'157\t23\t…'` de `creator/index.ts`, `puente-pre-f1d.test.mjs:787`) | Sin ella, «operar sobre una receta» solo cabe en 300 caracteres de objetivo |
| **CHEF-16** | **Variantes de catálogo** `nutrition`, `swap`, `groceries` en `text.generate`/`text.search` (y búsqueda con fuentes para nutrición) | `core/registry/capabilities.ts` (+~12 líneas); mueve **F3** (`'6\t0\t…capabilities.ts'`, `:745-747`) y los pines de variantes (`variantes-con-significado`, `core-registry`) | Es la forma correcta a largo plazo; CHEF-01/03 la evitan con instrucciones por experiencia |
| **CHEF-17** | **Memoria de cocina** (dieta, alergias, personas habituales, despensa): P2 `users/{uid}/chefRecipes` y perfil | reglas + índices + despliegue + migración | Mismo patrón que la memoria de marca de Design (D8): una sola decisión |
| **CHEF-18** | **Canary real** de calidad: parseo de recetas reales, respeto de restricciones, cifras | proveedor real y una cuenta de prueba | Es lo único que mide la fiabilidad del modelo (UNKNOWN hoy) |
| **CHEF-19** | Voz: dictado (`audio.transcribe`, grabación) y leer en voz alta (`voice.tts`) | cliente + servicio de Credits `ai_audio` | Coste relativo alto (R-8) y la migración de audio está pendiente |
| **CHEF-20** | Vídeo-receta encadenando con Weë Studio | cadena de especialistas | Aplazado: no es de Chef |

---

## 7. Riesgos de coste y de operaciones

Todas las cifras de Credits son de **PRUEBA** (modo simulado); las tarifas reales de proveedor no están verificadas (`docs/COSTES.md`) y producción cotiza en modo simulado. Ningún valor de este apartado es un precio.

| ID | Riesgo | Evidencia | Qué medir / mitigación |
|---|---|---|---|
| **R-1** | **Reintentos y variantes regeneran todo.** «Otra versión», «Intentar de nuevo» y las frases rápidas abren un trabajo nuevo con el plan entero (receta + foto = 5 de prueba cada vez) y vuelven a preguntar. Cambiar porciones sería otra generación. | `CreatorFlowScreen.tsx:335,352-363,619`, `ResultCard.tsx:645-659` `[L]` | CHEF-05; escalado local gratis (CHEF-04/07); frases de cocina |
| **R-2** | **Conversaciones abandonadas.** Cada mensaje puede costar una llamada de planificación (`text.structure`, no se cobra a la persona) y el trabajo queda `asking`; no hay limpieza. | `creator/planner.ts:157-194,254-256`, `creator/index.ts:385` `[L]` | Medir en `creatorJobs`/`aiGenerations` la proporción `asking : planned : done` (UNKNOWN; lectura de producción **no** hecha); `ChefProyectos` las muestra (D-CHEF-9) |
| **R-3** | **Fallo a medias: reembolso total y resultado parcial conservado.** Si la foto falla tras escribir la receta, la persona no paga nada y **conserva la receta**; Weë pagó el texto al proveedor (con proveedor real). Reproducido ejecutando `creatorRun`. «Intentar de nuevo» no reintenta el paso: abre otro trabajo. | `creator/index.ts:809-828`, `chef-caracterizacion` §F `[E]` | Frecuencia UNKNOWN: medir `aiGenerations` por trabajo `failed` con pasos `done`. Opciones: reintentar solo el paso fallido (CHEF-15, F4) o cobrar lo hecho (política de Credits: **decisión del dueño**, no se toca el protocolo financiero) |
| **R-4** | **La receta no es un material ni una entidad.** Vive dentro del trabajo; el cliente no puede marcarla (solo `projectId`). Sin búsqueda ni favoritas ni copia propia. | `creator/index.ts:509`, `firestore.rules:1061-1066`, §D `[E]` | P0 en lote 1; P2 con decisión (CHEF-17) |
| **R-5** | **Foto del plato en toda receta** (3 de los 5 Credits de prueba) aunque la persona solo quiera el texto; en menús no hay foto. «Máxima calidad» sube la foto a `ai_image_pro` (18 de prueba). | `templates.ts:1320`, `creditCosts.ts:26,189-193` `[M]` | CHEF-09 (opcional); mostrar niveles solo si cambian el precio (ya ocurre) |
| **R-6** | **Búsqueda con fuentes en cada menú** (`ai_search`): cuota gratuita de búsquedas de Google y coste por consulta a escala. | `creditCosts.ts:66-68` `[L]` | Hacer el paso de precios opcional o cachearlo por (menú, país); medir `creatorUsage/{día}` |
| **R-7** | **Cupos por persona y día** (por defecto texto 400, visión 200, imagen 80): una persona que planifica mucho podría chocar; el aviso existe (`weeai.errRateLimited`). | `engine/limits.ts:13-16`, `docs/COSTES.md` `[L]` | Valores reales en Firestore: UNKNOWN |
| **R-8** | **Voz.** Leer una receta (~1 500 caracteres) costaría `ai_audio` 20 de prueba por cada 1 000 caracteres: más que la receta entera. | `creditCosts.ts:36` `[M]` | No entra en el lote 1; cotizar siempre antes |
| **R-9** | **Trabajo colgado** (proceso muerto con Credits retenidos): se repara al volver a llamar `creatorRun` o con el script de reservas colgadas del dueño. Chef es síncrono y corto, riesgo bajo pero no nulo. | `creator/index.ts:580-590`, `docs/COSTES.md` `[L]` | Ya hay `liquidacionPendiente` (`types.ts:231`) |
| **R-10** | **Seguridad alimentaria y salud.** Una alergia no declarada o mal respetada, una temperatura de cocción o una cifra nutricional inventada pueden hacer daño y dañar la reputación. Hoy ninguna restricción es obligatoria ni hay rótulo de «estimación». | D-CHEF-5, `prompts.ts` (sin regla) `[L]` | Restricción dura + rótulos (CHEF-03/06); revisión legal y de producto **antes** de prometer nada (D-4); canary (CHEF-18) |
| **R-11** | **Lecturas de «Mis proyectos».** Cada vez que Chef toma el foco se leen hasta 6 páginas de 20 trabajos para encontrar 8 de Chef (cota 120 lecturas). | `ChefScreen.tsx:94`, `paginarTrabajos.ts:21,50` `[L]` | Cota conocida; el dato real depende de cuántos trabajos no-Chef tenga la persona (UNKNOWN). CHEF-11 |
| **R-12** | **Publicación truncada o con línea interna.** Una receta completa no cabe en 500 y puede colarse `IMAGEN:`. | `CreatorFlowScreen.tsx:400-410` `[I]` | CHEF-12 |
| **R-13** | **Coste de coordinación.** Cada texto del servidor son 3 diccionarios, cada clave de interfaz 16; la plantilla de Chef mueve pines que comparten otras ramas (Design incluida). | `docs/I18N.md` §7, §4.3 | Un solo responsable de pines y de la traducción por lote; reutilizar claves existentes |
| **R-14** | **`main` no es producción.** El camino de Chef corre en producción código anterior a H0 y no tiene suite de emulador del recorrido. | `docs/DESIGN.md` §5 `[L]` | CHEF-14 antes de lanzar; canary gobernado (dueño) |
| **R-15** | **Precios de prueba.** En modo real el mismo plan cuesta distinto (3 frente a 5 para la forma A `[M]`). Ningún número de Chef puede comunicarse. | `estimate-plan.test.mjs:95-125` | Hasta que el dueño fije precios reales |
| **R-16** | **Textos del servidor en 13 idiomas salen en inglés** (solo es/en/da declaran la sección). | `docs/I18N.md` §10 | Decisión de producto sobre traducción del servidor |

---

## 8. Primer lote y decisiones del dueño

### 8.1 Primer lote (puede empezar en cuanto se cierre Design)

**CHEF-01 · CHEF-02 · CHEF-03 · CHEF-04 · CHEF-05** (§6.1). Todo se prueba con `node functions/test/…` sobre `functions/lib` más `tsc` en 0 (PESADO, una vez al final).
Reparto: §6.1. Criterio de lote cerrado: AC-04…08, 11…17 y 20 (la parte de texto) en verde, `puente-pre-f1d` y las
suites de §5 sin tocar, y `chef-caracterizacion` con sus comprobaciones «HOY» de D-CHEF-1…6 invertidas y renombradas «ARREGLADO» (no borradas).

### 8.2 Decisiones del dueño

| ID | Decisión | Opciones | Recomendación | Bloquea |
|---|---|---|---|---|
| **D-1** | Estructura visual de Chef | A) mantener el lugar de trabajo del 2026-09-15 y añadir lo nuevo plegado · B) volver a hero + muro de sección (reescribe `ChefScreen` y 47 comprobaciones; contradice «un solo muro») | **A**; y corregir el texto de `CLAUDE.md` §5 | CHEF-07/08/10 (no el lote 1) |
| **D-2** | Muro y compartir | A) sin muro propio; se publica en el Wäll (hoy) · B) franja «De la comunidad» de solo lectura · C) un tipo de publicación «receta» | **A**; resolver el límite de 500 con CHEF-12 | CHEF-12 |
| **D-3** | Información nutricional | A) estimación rotulada, sin fuentes (lote 1) · B) con búsqueda con fuentes (exige variante nueva: CHEF-16) · C) no ofrecerla | **A** ahora, B después | CHEF-03 |
| **D-4** | Alergias y dietas | ¿se aceptan alergias (obligatorias) además de dietas (preferencias)? lista cerrada con «No sé»; texto de aviso; revisión legal | decidir antes de CHEF-06 | CHEF-06, 17 |
| **D-5** | Cultura y religión (halal, kosher, regional) | texto libre en v1 · lista cerrada pequeña después | texto libre | CHEF-06 |
| **D-6** | Dónde se guarda una receta | P0 · P1 · P2 (§2.6) | **P0** ahora, P2 con D-4 y la memoria de Design | CHEF-17 |
| **D-7** | Foto del plato | A) siempre · B) opcional (activada por defecto) · C) solo bajo petición | **B** | CHEF-09 |
| **D-8** | Precios y presupuesto | país/moneda, fuente, «menú de X €» como límite | v1: estimación con fuente rotulada «orientativa»; sin límite hasta definir mercado | futuras |
| **D-9** | Voz | dictado y leer en voz alta | aplazar | CHEF-19 |
| **D-10** | Nombre de «Mis proyectos» (son trabajos) | mantener · «Mis recetas» (16 diccionarios) | **«Mis recetas»** con CHEF-11 | CHEF-11 |
| **D-11** | Autorización de **reanclar F4** para CHEF-15 y del paso fallido | sí con diff y pruebas de §6.3 · no | decidir tras ver el uso | CHEF-15 |
| **D-12** | Canary real y dominio de evals | autorizar un canary con una cuenta de prueba | tras el lote 1 | CHEF-18 |

**Mínimo para arrancar el lote 1:** confirmar **D-3 = A** (nutrición como estimación rotulada) y que **D-1 = A** (no se rediseña la pantalla). El resto del lote es independiente de cualquier decisión.

---

## Anexo A · Cómo reproducir lo ejecutado (la suite está en el repositorio; los guiones `R7/G-chef/*` son evidencia de la ronda, fuera de él)

```
cd <worktree wt-r7-chef>          # nada de esto necesita red, emulador ni claves
node functions/test/chef-caracterizacion.test.mjs            # 42 comprobaciones, ~11 s
node R7/G-chef/repro-chef-paneles.mjs                        # paneles → qué plan sale; instrucción de compra de Chef
node R7/G-chef/repro-chef-foto.mjs                           # cuándo se pide foto, cliente frente a servidor
node R7/G-chef/repro-chef-formas.mjs                         # las 4 formas de plan y su coste de PRUEBA
node R7/G-chef/sabotaje-chef.mjs D-CHEF-3                    # «arregla» un defecto en memoria: la comprobación HOY debe ponerse en rojo
```

## Anexo B · Fuera de alcance de este documento

No se implementó ninguna capacidad de Chef; no se tocó `functions/src`; no se reanclaron cercas; no se consultó producción; no se llamó a ningún proveedor; no se inventó ningún precio.
Quedan sin responder, y marcados UNKNOWN, la calidad real del modelo para recetas y restricciones, la frecuencia de fallos a medias, la proporción de conversaciones abandonadas y
los valores reales de cupos y tarifas en producción.
