# Weë Chef · lote 1 — fichas para empezar (CHEF-01, 02, 03a, 03b, 04) y las dos decisiones que lo frenan

> **Estado (ronda R8, 2026-10-12, agente CHF): CHEF-04 IMPLEMENTADA en la rama `r8/chef` (`3bb91118`, sin integrar); CHEF-01, 02, 03a y 03b PREPARADAS, nada empezado.** Citas re-verificadas contra `c3f7f9a7` (las desplazadas, corregidas) y medidas `[M]` de 03a re-hechas en esa base; cada ficha lleva un bloque «Al día en R8».
>
> **Estado anterior (ronda R7-Design, 2026-10-11 noche, agente R): PREPARADO, NADA EMPEZADO.** Estas fichas no cambian `functions/src`, `screens/`, `constants/`
> ni ninguna prueba: nombran los archivos que habrá que tocar, el contrato que se propone y las pruebas que habrá que escribir.
> Base: `a64ff24`. Parte de `docs/WEE-CHEF-ESPECIFICACION.md` (no se reescribe; se cita por línea) y de `functions/test/chef-caracterizacion.test.mjs`
> (42 ✔ hoy). **Pendiente del dueño: D-1 y D-3 (§1). Ninguna de las dos se da por aprobada aquí.**

**Etiquetas.** `[X]` ya existe en el repositorio. `[P]` propuesta de contrato (no existe; la firma es una propuesta). `[L]` leído, con `archivo:línea`. `[E]` ejecutado por mí
(los logs están en `C:\Users\Geovet\AppData\Local\Temp\bloque\integracion\cierre\ronda-r7-design\R-docs\logs\`; `LEEME.txt` dice qué es cada uno). `[M]` medido en una simulación **en memoria**
(no escribe ningún archivo del repositorio). `AC-nn`, `D-CHEF-n`, `R-n`, `CHEF-nn` y `D-n` son los identificadores de la especificación. «Estimación» = rotulada como tal, no medida.

**Lo que ya existe y estas fichas reutilizan (nada de lo siguiente se vuelve a escribir) `[X]`:** `ContextoDeExperiencia` (`constants/weeWorkspaces.ts:181-232`; desde R7-Design trae también `projectId?`, `:226-231`), `WorkspaceId` incluye `'chef'` (`:49`);
`TEMPLATES.chef` con `q()`, `opt()`, `step()`, `chosen()`, `decided()` (`functions/src/creator/templates.ts:36-80,1190-1358`); `Plan`/`PlanStep`; `buildTextPrompt` y `KIND_INSTRUCTIONS` (`prompts.ts:425,495`);
`AJUSTES_DE_COCINA`, `TARJETAS_DE_CHEF`, `PanelDeChef`, `ENTRADAS_POR_PANEL` (`constants/chefTools.ts`); `AjustesContextuales`; `CajaDePrompt`/`useCajaQueCrece`; `creatorService.start(…, presetAnswers, …)` →
`creatorChat` (`creator/index.ts:342-350`) → `respuestaPara` (`planner.ts:83-92`); el Credit Engine por el camino de siempre (`creatorQuote` → `creatorRun`); `sinMarcasInternas` (`utils/textoDeResultado.ts:28`);
`contextoDeDesign` (`utils/designReferencia.ts:523-545`), el precedente de una función pura que arma un `ContextoDeExperiencia`. **Ninguna ficha crea un segundo Brain, Planner, Router, Job Engine, Credits ni almacén.**

---

## 1. Las dos decisiones del dueño que frenan el lote: D-1 y D-3

### 1.1 El texto EXACTO (`docs/WEE-CHEF-ESPECIFICACION.md`, §8.2)

Cabecera de la tabla (`:531`):

```
| ID | Decisión | Opciones | Recomendación | Bloquea |
```

**D-1** (`:533`):

```
| **D-1** | Estructura visual de Chef | A) mantener el lugar de trabajo del 2026-09-15 y añadir lo nuevo plegado · B) volver a hero + muro de sección (reescribe `ChefScreen` y 47 comprobaciones; contradice «un solo muro») | **A**; y corregir el texto de `CLAUDE.md` §5 | CHEF-07/08/10 (no el lote 1) |
```

**D-3** (`:535`):

```
| **D-3** | Información nutricional | A) estimación rotulada, sin fuentes (lote 1) · B) con búsqueda con fuentes (exige variante nueva: CHEF-16) · C) no ofrecerla | **A** ahora, B después | CHEF-03 |
```

Y la frase que las une (`:546`):

```
**Mínimo para arrancar el lote 1:** confirmar **D-3 = A** (nutrición como estimación rotulada) y que **D-1 = A** (no se rediseña la pantalla). El resto del lote es independiente de cualquier decisión.
```

La columna «Recomendación» es de la especificación (G): **no es una decisión del dueño**. Nada de esto está aprobado.

### 1.2 Contexto mínimo para decidir

**D-1 — qué es hoy Chef y por qué hay una pregunta.** Hoy `ChefScreen` es un lugar de trabajo: cabecera → caja → ocho funciones → «Mis proyectos» (`screens/ChefScreen.tsx:256-349`),
desde el 2026-09-15, sin hero, sin muro y sin fotos de comida, y lo vigilan 47 comprobaciones (`chef-weeai.test.mjs`: 47 ✔ [E]). Los encargos de la ronda R7 anterior describían una estructura que Chef **ya no tiene** (hero + herramientas plegadas + muro de sección; el muro de sección se retiró el 2026-09-13, `4ff271e`):
`docs/WEE-CHEF-ESPECIFICACION.md:36-44`. La imagen `design/references/wee-chef.jpg` (2026-09-05) sí muestra aquella estructura, y `CLAUDE.md` §5 sigue llamando «definitiva» a esa referencia: una tensión documental que la propia decisión resuelve. (`CLAUDE.md` no lo toco yo.)

**D-3 — qué es hoy la nutrición y qué promete.** Hoy «Información nutricional» es solo un panel de nueve entradas que deja una frase empezada y acaba en «receta + foto del plato» (D-CHEF-1; `chef-caracterizacion` `:176-178`). Su subtítulo dice **«Calorías, macros y alérgenos»** (`i18n/textos/es/chef.ts`, `nutritionSubtitle`) y una de sus entradas es **«Alérgenos»** (`constants/chefTools.ts:128`):
con la opción A (una estimación rotulada, sin fuentes) esa promesa de «alérgenos» es más fuerte que lo que una estimación sin fuentes puede sostener (R-10, seguridad alimentaria; D-4, alergias, sin decidir). **No lo decido: lo señalo para quien decida.**

### 1.3 Alternativas y qué cambia en las fichas con cada una

| Decisión | Opción | Qué implica en este lote |
|---|---|---|
| **D-1** | **A** — mantener el lugar de trabajo y añadir lo nuevo plegado | Las fichas son las de abajo. Lo «plegado» (Mi cocina, Mis recetas, De la comunidad) es de CHEF-07/08, lote 2. |
| | **B** — volver a hero + muro de sección | **CHEF-02 y CHEF-03b se tiran o se rehacen** (editan `ChefScreen.tsx`, que B reescribe) junto con las 47 comprobaciones de `chef-weeai` y `aceptacion-pantallas` A–D; contradice la decisión de producto del 2026-09-13 «un solo muro» (commit `4ff271e`, citada en `docs/WEE-CHEF-ESPECIFICACION.md:40` y en la propia fila de D-1). **CHEF-01, 03a y 04 no se ven afectadas** (servidor y funciones puras). |
| **D-3** | **A** — estimación rotulada, sin fuentes | CHEF-03a ofrece `nutrition` con el plan de un paso `text.generate`/`answer`. |
| | **B** — con búsqueda con fuentes | `nutrition` pasaría a `text.search` (una forma nueva: `ai_search`, R-6) y exige la variante nueva de CHEF-16 en `core/registry/capabilities.ts` (+~12 líneas), que **mueve F3** (`puente-pre-f1d.test.mjs:745-747`) y los pines de variantes (`variantes-con-significado`, `core-registry`): **requiere autorización y reanclaje de F3**. 03a se parte: `swap` y `shopping` ahora, `nutrition` después. |
| | **C** — no ofrecerla | 03a entrega solo `swap` y `shopping`; la tarjeta y el panel de nutrición se quitan de la pantalla (cambian, entre otras, `chef-weeai` #1, #2, #5, #18, #19 y `aceptacion-pantallas` ACE-C-01/03: «ocho funciones» pasa a siete). |

### 1.4 Qué bloquea cada una, ficha por ficha

| | CHEF-01 | CHEF-02 | CHEF-03a | CHEF-03b | CHEF-04 |
|---|---|---|---|---|---|
| **D-1 = A** | no | **sí** | no | **sí** | no |
| **D-3** | no | no | **sí**, la opción `nutrition` (`swap` y `shopping` no dependen: *inferido*) | **sí**, la tarjeta de nutrición | no |

**Una incoherencia dentro de la especificación, para que no sorprenda:** la fila de D-1 dice que bloquea «CHEF-07/08/10 (no el lote 1)» (`:533`), pero `:546` la incluye en el «mínimo para arrancar el lote 1». Por lectura, D-1 solo frena de verdad a las dos fichas que editan `ChefScreen` (02 y 03b); las otras tres pueden empezar sin ella.
La especificación y el informe de G dicen lo mismo en `:546` y en su §6; aquí se afina la lectura, sin dar por cerrada ninguna de las dos decisiones.

---

## 2. Las fichas

Orden de lectura de cada ficha: objetivo · qué cambia para la persona · archivos · contrato · dependencias · pruebas en rojo primero · criterios de aceptación · pines · cercas · i18n · esfuerzo · lista para empezar / terminada.

### CHEF-01 — La lista de compras de Chef sirve para comprar

**Objetivo.** Que el paso de lista de compras de Weë Chef use una instrucción propia de cocina —secciones del supermercado, cantidades consolidadas, sin tope— en vez de la de Weë Home («zona del espacio», «6–8 elementos», «nivel de gasto»), sin tocar la instrucción genérica ni el catálogo del Core (D-CHEF-3).

**Qué cambia para la persona.** La lista de un menú sale por secciones del supermercado, con cantidades juntas y sin el recorte a 6–8 elementos; deja de hablar de «cambios y compras» de un espacio.

**Archivos.**
- *Modificar:* `functions/src/creator/prompts.ts` y nada más del servidor: una tabla por experiencia junto a `KIND_INSTRUCTIONS` (`:425-484`) y una línea en `buildTextPrompt` (`:510`).
- *Leer:* `functions/src/creator/inputs.ts:107-129` (`stepInputFor`), `creator/necesidades.ts:57,72`, `creator/templates.ts:1333-1345`.
- *Pruebas:* `functions/test/chef-caracterizacion.test.mjs:200-213`.
- *No tocar:* `KIND_INSTRUCTIONS` (lo lee `necesidades.ts:57,72` y lo fija `puente-necesidades.test.mjs:325`: `/KIND_INSTRUCTIONS\[kind\]/` en `necesidades.ts` y `export const KIND_INSTRUCTIONS` en `prompts.ts`), `core/registry/capabilities.ts`, `inputs.ts`.

**Contrato `[P]`** (el diseño que medí con un prototipo desechable en una copia fuera del repositorio; no es el código a adoptar):

```ts
// functions/src/creator/prompts.ts — PROPUESTA (no existe)
/** Instrucciones propias de una experiencia: solo donde la de `KIND_INSTRUCTIONS` no le sirve. `KIND_INSTRUCTIONS` no se toca. */
const INSTRUCCION_PROPIA: Partial<Record<ExperienceId, Record<string, string>>> = {
  chef: { shopping: 'Escribe la lista de la compra: agrupada por secciones del supermercado, con cantidades consolidadas entre recetas y sin tope de elementos.' },
};
export const instruccionDe = (experienceId: ExperienceId, kind: string): string | undefined =>
  INSTRUCCION_PROPIA[experienceId]?.[kind] ?? KIND_INSTRUCTIONS[kind];
// buildTextPrompt, prompts.ts:510:   KIND_INSTRUCTIONS[kind] || '…'   →   instruccionDe(experienceId, kind) || '…'
```

Entrada/salida: `(experiencia, kind)` → la instrucción propia o la genérica; nada más cambia. **El texto de la instrucción no es copy final** (lo revisa quien conozca el producto). Ningún archivo nuevo en `functions/src`: F1 lo prohíbe y cuenta los archivos nuevos aunque no estén en un commit (`puente-pre-f1d.test.mjs:578-579,715`).

**Hallazgo que la especificación no recoge — el menú usa `shopping` en DOS pasos.** El plan de menú es `menu → prices → list` y **dos de sus pasos llevan `kind: 'shopping'`**: `prices` (`text.search`, `templates.ts:1340`) y `list` (`text.generate`, `:1341`).
`stepInputFor` llama a `buildTextPrompt` con la misma `kind` para las dos capacidades (`inputs.ts:117-120`), así que **hoy el paso de precios recibe también la instrucción de Home** `[E]` (ejecuté `stepInputFor` sobre el plan de menú real: `logs/stepInputFor-menu-chef.log`), y con la tabla propuesta recibiría también la de Chef.
Dos salidas, **a decidir antes de empezar**: **(A)** una sola instrucción de Chef para `shopping` que valga para la lista y para los precios (lo que midió G y mi prototipo); **(B)** indexar la tabla por `(experiencia, capacidad, kind)` y que `inputs.ts` pase la capacidad (un archivo más y una firma, y una segunda frase para los precios).

**Dependencias.** Ninguna de otras fichas ni de D-1/D-3. **CHEF-03a la necesita** (usa el mismo mecanismo para `answer`). Cierre de Design: la tarea S toca `prompts.ts` «solo lo que haga falta» (BRIEF-S), en otra región: conflicto improbable.

**Pruebas en rojo primero.** Invertir `chef-caracterizacion.test.mjs:203-208` — ``HOY · D-CHEF-3 · el prompt del paso `list` de Chef (kind `shopping`) habla de «zona del espacio» y «6–8 elementos»`` — a
``ARREGLADO · D-CHEF-3 · el prompt del paso `list` de Chef pide secciones del supermercado y cantidades, y no habla de «zona del espacio» ni de «6–8 elementos»`` (primero la aserción nueva contra el código de hoy: **rojo**; después el cambio: verde).
Se mantienen tal cual `CONTRATO · esa instrucción es la de Weë Home y a Home le sirve…` (`:209-211`) y ``CONTRATO · … el catálogo ya describe `shopping` de `text.search` como «qué comprar y cuánto cuesta»`` (`:212-213`).
*Nuevas:* el prompt de Chef para `shopping` ≠ el de Home; el de Home, byte a byte el de hoy; el de `recipe`, `menu` y `describe` de Chef, sin cambio; y lo que se decida para `prices`.

**Criterios de aceptación.** AC-08 (`docs/WEE-CHEF-ESPECIFICACION.md:418`); AC-09 (`:419`) sigue verde.

**Pines que se mueven.** Ninguno de los pines de planes. `[M]` 31 suites con la simulación en memoria y `[E]` 27 con el prototipo en la copia desechable (incluidas `runtime-map`, `ci-workflow`, `puente-pre-f1d` y `video-asincrono`): **solo se mueve `chef-caracterizacion` D-CHEF-3** (`logs/sim-instr-P.tsv`, `suites-chef01-prototipo.tsv`).

**Cercas.** Ninguna se mueve `[E]`. F1 admite `prompts.ts` por nombre, sin tamaño (`puente-pre-f1d.test.mjs:595-597`). Vigilantes de texto de `prompts.ts` a respetar `[L]`: `techo-de-propuestas.test.mjs:552` (el archivo no puede contener la secuencia «count»), `vocabulario-entender.test.mjs:162` (ni `TEMPLATES`, `buildPlan` ni `creator/templates`), `puente-necesidades.test.mjs:325`, `brain-deepseek.test.mjs:159` (ni `switch (locale)` ni `IDIOMAS`), `continuidad-intencion.test.mjs:255` (ni `elementId`). Se comprueba con las suites anteriores más `git diff --stat -- functions/src` = solo `prompts.ts`.

**i18n.** Ninguna clave, ni servidor ni cliente: la instrucción va en español al modelo y el idioma de la respuesta lo pide `recordatorioDeIdioma` (`prompts.ts:403-408`).

**Esfuerzo (estimación).** S (≤ 4 h).

**Lista para empezar:** la salida (A) o (B) para `prices` elegida; el texto de la instrucción revisado por producto (su calidad con un modelo real es UNKNOWN: solo un canary la mide, CHEF-18). **Terminada:** el HOY invertido en verde; las 27 suites sin cambios; `escaneo-secretos` y `ci-workflow` en verde.

**Al día en R8 (2026-10-12, base `c3f7f9a7`).** Citas re-verificadas (`prompts.ts`, `inputs.ts` y `necesidades.ts` no han cambiado desde `a64ff24`; `templates.ts` sí, +30 líneas por la región de Design ya integrada). Re-medido `[M]` con `simula-chef.mjs instruccion-chef` sobre las 8 suites de plan: **solo cae `chef-caracterizacion` D-CHEF-3** (logs en `RD8\CHF-chef\logs\simulacion\`).

| Archivo | Leer / modificar / no tocar | Propiedad frente a las otras fichas y al cierre de Design |
|---|---|---|
| `functions/src/creator/prompts.ts` | **modificar** (tabla `INSTRUCCION_PROPIA` junto a `KIND_INSTRUCTIONS`, una línea en `buildTextPrompt`) | de la persona 1 (01 → 03a); la región de Design no lo toca hoy |
| `functions/test/chef-caracterizacion.test.mjs` | modificar solo `:203-208` | compartido con 02/03a/03b, cada una en sus líneas |
| `inputs.ts`, `necesidades.ts`, `core/registry/capabilities.ts`, `KIND_INSTRUCTIONS` | no tocar | cercas F1/F3 y `puente-necesidades` |

**Contrato.** `[X]` `buildTextPrompt(experienceId, kind, brief, goal, purpose, previous, locale)` (`prompts.ts:495-518`) y `KIND_INSTRUCTIONS` (`:425`); `[P]` `instruccionDe(experienceId, kind)`, la tabla de arriba. **Ningún motor paralelo:** el paso sigue `creatorRun` → WEË AI ENGINE → Router → adaptador; no hay ni otro prompt-builder ni otra capa: es una entrada de tabla. Los Credits salen igual (`creatorQuote`).

**Qué decisión la bloquea.** Ninguna del dueño (ni D-1 ni D-3). Solo la elección técnica (A)/(B) para `prices` y la revisión de producto del texto.

**Qué se puede preparar sin tocar código funcional.**
- *Borrador de la instrucción para revisión de producto* (no es copy final; el idioma de la respuesta lo pone `recordatorioDeIdioma`): «Escribe la lista de la compra del menú: agrupa los ingredientes por sección del supermercado (frutas y verduras, carnes y pescados, lácteos y huevos, panadería, despensa, congelados, otros) con una línea «SECCIÓN: <nombre>» delante de cada grupo; junta en una sola línea el mismo ingrediente aunque salga en varias recetas y suma sus cantidades con su unidad; no pongas tope de elementos; no inventes precios.» — la marca «SECCIÓN:» es la que ya lee `leerLista` (CHEF-04, implementada): si producto la acepta, la lista sale lista para CHEF-08 sin otro paso.
- *Para `prices` (salida A):* la misma instrucción vale como guía de qué buscar; *(salida B):* segunda frase «Busca el precio actual de cada ingrediente de la lista, con su fuente; si no lo encuentras, dilo».
- *Pines antes/después:* `chef-caracterizacion` D-CHEF-3 se invierte; el resto de suites, sin cambio (medido arriba).
- *Orden de commits:* 1) la comprobación ARREGLADO en rojo; 2) la tabla + la línea de `buildTextPrompt`; 3) `docs/WEE-ACEPTACION.md` (AC-08).

**Los seis puntos de R7-Design que la tocan:** el prompt de `prices` (punto 1 de §5) **sigue igual** (`inputs.ts:117-120`, `templates.ts:1340-1341`): bloquea el inicio hasta elegir (A)/(B), **no necesita al dueño**.


---

### CHEF-02 — Los ajustes de cocina viajan como respuestas y la caja no deja perder la dieta

**Objetivo.** Que lo elegido en «Ajustes de la receta» (personas y tiempo) viaje como respuestas que el servidor ya entiende (`presets`) y con `workspace: 'chef'`, y que la caja avise antes de pasar de los 300 caracteres que el servidor lee (D-CHEF-4 y D-CHEF-5).

**Qué cambia para la persona.** (1) Lo que elige en Personas y Tiempo ya no se le vuelve a preguntar en la conversación, **en ningún idioma** (hoy el deductor solo lee español). (2) La caja enseña un contador y no deja pasar de lo que el servidor leerá —la idea más lo que los ajustes añaden—, de modo que la dieta, que se pega al final, ya no se pierde sin aviso. **Dieta y dificultad siguen viajando solo como texto**: el servidor no tiene pregunta para ellas hasta CHEF-06 (lote 2).

**Archivos.**
- *Modificar:* `constants/chefTools.ts`; `screens/ChefScreen.tsx` (`abrirFlujo` `:130-144`, `alEnviar` `:146-154`, el montaje de la caja `:268-288`); `components/creator/CajaDePrompt.tsx` (Props `:22-65`, `TextInput` `:125-140`: una prop opcional).
- *Crear:* `utils/contextoDeChef.ts` `[P: nombre]`, cliente (F1 mira `functions/src`: no le afecta). Mismo patrón que `contextoDeDesign` (`utils/designReferencia.ts:523-545`).
- *Leer:* `constants/weeWorkspaces.ts:181-232`; `screens/CreatorFlowScreen.tsx:52,71-74,151-182,459`; `functions/src/creator/index.ts:310,342-350`; `planner.ts:83-131`; `components/creator/CampoQueCrece.tsx:69-74` (el precedente de un contador).
- *Pruebas:* `chef-caracterizacion.test.mjs` (grupo B), `chef-weeai.test.mjs`, `aceptacion-pantallas.test.mjs` (aditivo) y una suite nueva.

**Contrato `[P]`** (la firma es una propuesta; lo que ya existe se reutiliza):

```ts
// constants/chefTools.ts — PROPUESTA
/** Los ajustes cuyo grupo y cuyas opciones YA son una pregunta del servidor, con los mismos ids (`people` 1·2·4·8, `time` 15·30·60). `auto` no se manda. `diet` y `level` NO están: no hay pregunta hasta CHEF-06. */
export const AJUSTES_QUE_SON_PREGUNTA: readonly string[] = ['people', 'time'];

// utils/contextoDeChef.ts — PROPUESTA (función pura: sin React ni traductor)
import type { ContextoDeExperiencia } from '../constants/weeWorkspaces';
export interface EntradaDeContextoDeChef {
  objetivo?: string;                                    // la idea con los ajustes ya pegados por `chef.goalWith`: la unión sigue siendo de la pantalla
  preset?: { questionId: string; optionId: string };    // por dónde se entró (una tarjeta o, tras CHEF-03b, un panel)
  ajustes: Readonly<Record<string, string>>;            // grupo → id de opción (`auto` = no decide nada)
  imageUri?: string;
}
export const contextoDeChef = (e: EntradaDeContextoDeChef): Omit<ContextoDeExperiencia, 'experienceId'>;
//   → { workspace: 'chef', goal, imageUri, preset?, presets? }
//   presets = [preset?, …ajustes de AJUSTES_QUE_SON_PREGUNTA distintos de 'auto'], UNA respuesta por pregunta (la del `preset` manda)
export const largoParaElServidor = (objetivo: string): number;   // objetivo.trim().length

// components/creator/CajaDePrompt.tsx — PROPUESTA: `maximo?: number`, opcional, como ya son `sinMarco` y `accionesDerecha`.
//   Con ella: `maxLength` en el campo y un contador numérico `n/máximo`; sin ella, la caja es exactamente la de hoy.
// screens/ChefScreen.tsx: `maximo = 300 − (lo que añaden los ajustes pegados)`.
```

**Reglas del contrato**, cada una verificada `[L]`/`[E]`:
1. **`preset` (singular) se conserva además de `presets`.** `CreatorFlowScreen.tsx:71-74` (`needsPhoto`) y `:459` leen `params.preset?.optionId`; y `:167` hace `yaDichas ?? params.presets ?? (params.preset ? [params.preset] : undefined)`: **no los suma**. Si se manda `presets`, el `preset` de la tarjeta debe ir también **dentro** de `presets`, o se pierde.
2. **Una respuesta por pregunta**: el servidor las empuja a `job.answers` sin deduplicar (`creator/index.ts:342-350`).
3. **Contar como el servidor**: `String(data.goal).trim().slice(0, 300)` cuenta unidades UTF-16 y tras `trim()` (`:310`); un contador por puntos de código (`Array.from`, como `CampoQueCrece.tsx:74`) dejaría pasar un emoji de más.
4. **El literal de la llamada se conserva** — `navigation.navigate('CreatorFlow', { experienceId: 'chef', …` (lo fijan `chef-weeai.test.mjs:138-139`, #15, y `chef-caracterizacion` `:130-133`, que corta el código entre `const abrirFlujo` y `const alEnviar`): `contextoDeChef` devuelve el resto, que se esparce, y esos dos nombres y su orden no cambian.
5. **La unión «idea (ajustes)» no cambia** (`chef.goalWith`): es el pin *BLOCKED — HUMAN DECISION* de `aceptacion-pantallas.test.mjs:232-233` (H B-03 i · G D-CHEF-4).
6. No existe un ajuste de «días» (`AJUSTES_DE_COCINA` solo tiene personas, tiempo, dieta y nivel): `days` no se manda.
7. **Punto a confirmar (no lo decido):** que la caja de Chef avise es **una de las tres opciones** que H y J dejaron como *BLOCKED — HUMAN DECISION* para el recorte a 300 (`aceptacion-recorrido-servidor.test.mjs:371-372`: «que la caja avise, o subir el tope del servidor —mueve la cerca F4—, o que la restricción viaje fuera del texto»). CHEF-02 la implementa tal como la propone la especificación y **no cierra el hueco del servidor** (`ACE-C-09` sigue como HUECO CONOCIDO). Si el dueño prefiere otra opción, el contador y `maximo` se retiran sin afectar a `contextoDeChef`.
8. Qué hace la caja si el texto ya es más largo que el máximo (los ajustes se eligieron después): [P] bloquear el envío o dejar enviar con el contador en aviso —**decidir al implementar**; bloquear es lo que más protege la dieta.

**Dependencias.** **D-1 = A.** Ninguna de otras fichas. `CreatorFlowScreen.tsx` **no** se toca. `CajaDePrompt.tsx` es compartido con Studio, Design, Music, Business, Travel y Brain (`cajas-weeai.test.mjs:126,148`, `brain-vivo.test.mjs:290` fijan su forma): una prop opcional no los mueve `[L]`; ni la tarea S, ni la C, ni la P lo tocan (BRIEF-P prohíbe `StudioPromptComposer`; BRIEF-C no lo nombra).

**Pruebas en rojo primero** (con nombres):
- Invertir `chef-caracterizacion.test.mjs:131-133` — ``HOY · D-CHEF-4 · la pantalla manda al flujo solo experienceId, goal, preset e imageUri: ni `presets`, ni `workspace` `` — a `ARREGLADO · D-CHEF-4 · la pantalla manda workspace 'chef' y presets (personas y tiempo)`. **Ojo:** la comprobación de hoy es **textual** (`!/presets\s*:/` y `!/workspace\s*:/` sobre el trozo de `abrirFlujo`) y **puede seguir en verde por casualidad** tras el cambio: hay que invertirla de forma explícita, con la función pura y la pantalla en proceso, y no esperar a que caiga.
- Dividir `:143-145` — `HOY · D-CHEF-5 · el servidor corta el objetivo a 300 caracteres y la restricción (al final) se pierde sin aviso` — en `CONTRATO · el servidor corta el objetivo a 300` (sigue) y `ARREGLADO · D-CHEF-5 · la caja no deja pasar de 300 contando lo que los ajustes añaden`.
- **Se quedan como HOY:** `:128-129` (`diet`/`level` sin pregunta), `:134-135` (la unión), `:150-151` (D-CHEF-6, de CHEF-05), `:156-157` (Brain), `:196-198` (deductor en español).
- *Nuevas*, suite `functions/test/chef-contexto.test.mjs` `[P: nombre]`, en la cadena: `AC-11 · people y time elegidos viajan como presets con los ids del servidor y auto no viaja` · `AC-11 · el planificador con esos presets no vuelve a preguntar people ni time, con un objetivo en inglés y en danés` · `AC-12 · el contexto lleva workspace 'chef'` · `AC-13 · largoParaElServidor cuenta como slice(0, 300) tras trim` · `el preset de la tarjeta va dentro de presets Y como preset` · `una sola respuesta por pregunta` · `diet y level no viajan como presets` · sabotaje: quitar el `trim` o contar por puntos de código debe romper una.
- *Aditivas en proceso* (`aceptacion-pantallas`, con `_pantallas.mjs`): tocar una tarjeta con ajustes puestos → `navegacion[0][2].presets` y `.workspace`; la caja recibe `maximo`.

**Criterios de aceptación.** AC-11, AC-12, AC-13 (`docs/WEE-CHEF-ESPECIFICACION.md:421-423`).

**Pines que se mueven.** Ninguno de planes. `chef-weeai` #15 y #34 intactos si se respeta la regla 4; `aceptacion-pantallas` ACE-C-02 (`:132-134`) y ACE-C-04 (`:201-203`, `:223-233`) siguen verdes porque `preset` se conserva, `goal` es el mismo y la unión no cambia.

**Cercas.** Ninguna: cliente. `tsc --noEmit` de la app en 0 errores (PESADO, una vez al final). `cajas-weeai` y `brain-vivo` intactas (se comprueba ejecutándolas).

**i18n.** **Cliente:** ninguna clave si el contador es solo `n/300` (precedente `CampoQueCrece.tsx:74`, sin palabras). Una frase de aviso nueva exigiría 1 clave × 16 idiomas (`docs/I18N.md` §4 y §7); AC-13 pide «un contador numérico». **Servidor:** ninguna.

**Esfuerzo (estimación).** S–M (0,5–1 día).

**Lista para empezar:** D-1 = A; la regla 7 confirmada (o el contador fuera); la regla 8 elegida. **Terminada:** las comprobaciones invertidas y nuevas en verde; `chef-weeai` 47/47 y `aceptacion-pantallas` 68/68 (más las aditivas); `cajas-weeai` y `brain-vivo` en verde; `tsc` 0; `docs/WEE-ACEPTACION.md` actualizado (ACE-C-04, C-07 y C-09 con su matiz).

**Al día en R8 (2026-10-12, base `c3f7f9a7`).** `ChefScreen.tsx`, `chefTools.ts`, `CajaDePrompt.tsx` y `CampoQueCrece.tsx` no han cambiado desde `a64ff24`; `CreatorFlowScreen.tsx` sí (tarea C de R7-Design: CL-12 y CL-20), pero la regla 1 **sigue valiendo**: la llamada es ahora `creatorService.start(experience.id, goal, yaDichas ?? params.presets ?? (params.preset ? [params.preset] : undefined), imageUrl, params.projectId, locale)` (`CreatorFlowScreen.tsx:167`): `presets` y `preset` siguen sin sumarse. `ContextoDeExperiencia` trae además `projectId?` (`weeWorkspaces.ts:226-231`): `contextoDeChef` no lo necesita (se viene de Chef, no de un proyecto). **Aviso:** NAV (R8) toca `ChefScreen.tsx` en otras líneas (P11/CL-25): re-verificar `:130-154` y `:268-288` al empezar.

| Archivo | Leer / modificar / no tocar | Propiedad |
|---|---|---|
| `utils/contextoDeChef.ts` `[P: nombre]` | **crear** (función pura) | persona 2 (02 → 03b) |
| `constants/chefTools.ts` | modificar (`AJUSTES_QUE_SON_PREGUNTA`) | persona 2; 03b añade `PRESET_DE_PANEL` en el mismo archivo, después |
| `screens/ChefScreen.tsx` | modificar `abrirFlujo`/`alEnviar`/montaje de la caja | persona 2; **NAV (R8) también lo toca**: hunks mínimos |
| `components/creator/CajaDePrompt.tsx` | modificar (prop opcional `maximo`) | compartido con seis secciones: solo la prop |
| `screens/CreatorFlowScreen.tsx`, `functions/src/**` | **no tocar** | — |

**Contrato.** `[X]` `ContextoDeExperiencia` (`weeWorkspaces.ts:181-232`), `AJUSTES_DE_COCINA`, `creatorService.start(…, presetAnswers, imageUrl, projectId, locale)`, `creatorChat` → `respuestaPara`, el precedente `contextoDeDesign`; `[P]` `contextoDeChef`, `largoParaElServidor`, `AJUSTES_QUE_SON_PREGUNTA`, la prop `maximo`. **Ningún motor paralelo:** las respuestas viajan por el `presetAnswers` que el servidor ya entiende; no se crea ni otro Brain, ni otro planificador, ni otro canal de contexto.

**Qué decisión la bloquea.** **D-1 = A** (PENDIENTE DE DECISIÓN): edita `ChefScreen.tsx`, que D-1 = B reescribiría. Y la regla 7 (la caja que avisa a 300 es una de las tres salidas *BLOCKED — HUMAN DECISION*): **PENDIENTE DE DECISIÓN** del dueño. **Sin D-1 puede empezar** `utils/contextoDeChef.ts` con su suite (pura, sin pantalla) y `AJUSTES_QUE_SON_PREGUNTA`; la pantalla y la caja esperan.

**Qué se puede preparar sin tocar código funcional.**
- *Tabla de datos* (sale de `chefTools.ts` y de la plantilla, `templates.ts:1219-1231`): `people` → `1·2·4·8`; `time` → `15·30·60`; `auto` no viaja; `diet` y `level` no viajan (sin pregunta hasta CHEF-06).
- *Fixtures de la suite `chef-contexto`:* { tarjeta `recipe`, people 4, time auto } → `presets = [{what:recipe},{people:4}]` y `preset = {what:recipe}`; { sin tarjeta, people 2, time 30 } → `presets = [{people:2},{time:30}]`, sin `preset`; { panel (tras 03b), people auto } → solo el del panel. Objetivos en danés e inglés para AC-11.
- *i18n:* **ninguna clave** si el contador es solo `n/300`; si producto quiere una frase de aviso, 1 clave × 16 diccionarios (`chef.limiteDeCaracteres` `[P]`).
- *Pines antes/después:* `chef-caracterizacion` `:131-133` y `:143-145` (se invierten de forma explícita, no por casualidad); `chef-weeai` 47/47 y `aceptacion-pantallas` 68/68 sin cambio.
- *Orden de commits:* 1) `contextoDeChef` + su suite (puede ir antes de D-1); 2) tras D-1: pantalla + caja + las comprobaciones invertidas; 3) `WEE-ACEPTACION.md`.

**Los seis puntos de R7-Design que la tocan:** `presets ?? [preset]` (punto 6) **sigue igual** (`:167`): no bloquea, la regla 1 lo resuelve; las pruebas textuales (punto 7) **siguen** en `:131-133`: no bloquea, se invierten a propósito; la caja que avisa a 300 (punto 9) **sigue siendo de las tres opciones bloqueadas**: necesita al dueño; el contador por UTF-16 (punto 11) sigue (`creator/index.ts:310`): no bloquea.


---

### CHEF-03a — Servidor: nutrición, sustituir y lista de compras con plan propio, sin foto

**Objetivo.** Que Weë Chef tenga en el servidor tres peticiones de solo texto —información nutricional (estimación rotulada), sustituir ingredientes y lista de compras— con plan propio de un paso, sin foto del plato y sin pedir la foto de la nevera (D-CHEF-1 y D-CHEF-2, parte servidor).

**Qué cambia para la persona.** Con CHEF-03b, cada panel da lo que promete: un resultado de texto, más corto y de menos pasos que «receta + foto del plato». **Sola**, 03a solo añade tres opciones a la pregunta guiada «¿Qué quieres hacer?»: por eso se integran juntas.

**Archivos.**
- *Modificar:* `functions/src/creator/templates.ts` (Chef `:1190-1358`: opciones de `what` `:1195-1203`; `buildPlan` `:1277-1357`; condiciones `when` de `people` `:1225` y `time` `:1231`); `functions/src/creator/prompts.ts` (las instrucciones: el mecanismo de CHEF-01); `i18n/textos/{es,en,da}/servidor/opciones.ts` y `…/servidor/plan/casa.ts`; `docs/WEE-ACEPTACION.md` (estado de ACE-C-11/12/13).
- *Se GENERAN, no se editan a mano:* `i18n/textos/es/servidor/opciones.ts` y `preguntas.ts` (`node scripts/i18n-guia-del-servidor.mjs`, tras `npm run build`) e `i18n/huella.json` (`node scripts/i18n-huella.mjs`).
- *Pruebas:* `chef-caracterizacion.test.mjs` (grupos A y C) y los pines de §«Pines».

**Contrato `[P]`** (las opciones y los ids son los de la especificación, `:204-215`; el resto, propuesta):

| `what` (id estable) | Paso | Capacidad | `kind` (variante **ya declarada**) | Foto | Qué pide |
|---|---|---|---|---|---|
| `nutrition` | `facts` | `text.generate` | `answer` | no | estimación **por porción**, rotulada como aproximada, sin cifras inventadas ni consejo médico |
| `swap` | `swap` | `text.generate` | `answer` | no | qué cambiar, en qué cantidad y cómo afecta; respeta la restricción dicha |
| `shopping` | `list` | `text.generate` | `shopping` | no | por sección del supermercado, cantidades consolidadas, sin tope |

```ts
// functions/src/creator/templates.ts, plantilla de Chef — PROPUESTA (no existe); las etiquetas son las que usé en la medición, no copy final
q('what', '¿Qué quieres hacer?', [
  /* …las siete opciones de hoy, con sus ids intactos (`recipe` … `edit`)… */
  opt('nutrition', '🔢 Información nutricional'),
  opt('swap', '🔁 Sustituir ingredientes'),
  opt('shopping', '🛒 Lista de compras'),
  IDK,                                                   // sigue siendo la última
]),
// buildPlan, antes del tramo de menú y receta (`kind = what.idk ? 'recipe' : what.id`, templates.ts:1282):
//   nutrition → step('facts', 'text.generate', '<propósito>', { input: { kind: 'answer',   brief: '<regla de nutrición>' } })
//   swap      → step('swap',  'text.generate', '<propósito>', { input: { kind: 'answer',   brief: '<regla de sustitución>' } })
//   shopping  → step('list',  'text.generate', 'Hacer la lista de compras', { input: { kind: 'shopping', brief: '<regla de compra>' } })
// y `explainToUser` con una frase propia por rama (es/en/da en servidor/plan/casa.ts)
```

Sin variantes nuevas en el catálogo del Core (F3 intacta) y sin archivos nuevos en `functions/src` (F1). `buildPlan` devuelve el `Plan` de siempre (`{ experience: 'chef', goal, steps: [PlanStep], explainToUser }`); la persona ve `purpose` y `explainToUser`, no `facts`/`swap`/`list`. Los ids `nutrition`, `swap` y `shopping` son los mismos que `PanelDeChef` (`constants/chefTools.ts:41`): **ese es el «acuerdo de ids» con 03b**. **Ningún precio se escribe**: el coste sale de `estimatePlan` → `creatorQuote`.

**Puntos de contrato que la especificación no cierra** (cerrarlos antes de empezar; propuesta `[P]`):
1. **`people`/`time` para las opciones nuevas.** Hoy `people` se pregunta si `what ≠ edit` (`:1225`) y `time` si `what` no es `menu` ni `edit` (`:1231`): sin tocar las condiciones, las tres opciones nuevas preguntarían «¿Para cuántas personas?» y «¿Cuánto tiempo tienes?». `[P]` `nutrition` y `swap`: ninguna de las dos; `shopping`: solo `people` (las cantidades dependen de cuántos comen). `[M]` no cambia qué suites se mueven (las mismas ocho), solo el número de planes que enumera `i18n-servidor` (1 435 hoy → 1 525 sin tocar `when` → 1 443 con la propuesta; re-medido en `c3f7f9a7` en la ronda R8: en `a64ff24` eran 1 403 → 1 493 → 1 411, la diferencia son las opciones nuevas de Design).
2. **Dos opciones comparten `kind: 'answer'`** y la tabla de CHEF-01 se indexa por `(experiencia, kind)`: `nutrition` y `swap` recibirían la misma instrucción de Chef para `answer`. La genérica (`KIND_INSTRUCTIONS.answer`, `prompts.ts:455-456`) acaba con «Próximos pasos» y 3 acciones y **recomienda a Weë Chef**: no sirve. `[P]` una instrucción de Chef para `answer` válida para ambas y la regla concreta de cada una en el `brief` del paso (`input.brief`, que llega al modelo como «Lo que eligió: …», `prompts.ts:508`); alternativa: clave por paso (toca `inputs.ts`).
3. **`infer`:** `[P]` **no añadir palabras clave** para las tres (podrían secuestrar frases de receta: «un pollo bajo en calorías»). Con 03b el panel manda el `preset`, y el planificador con LLM ya ve las opciones nuevas.
4. **La entrada «Para la semana» (y «De un menú») del panel de compras** hoy llega al plan de menú —menú, precios y lista— por las palabras «semana» y «menú» (`templates.ts:1241`); con `shopping` pasaría al plan de un solo paso. Si no se quiere ese cambio, el panel manda `what: menu` para esas entradas (03b admite un mapa por entrada). **Pregunta abierta.**
5. **D-3.** La opción `nutrition` y su frase del plan dependen de la opción que se elija (§1).

**Dependencias.** **CHEF-01** (el mecanismo); **D-3** (solo `nutrition`, *inferido*); acuerdo de ids con 03b; D-1 no. **Cierre de Design — archivos compartidos:** `templates.ts` lo toca también la tarea **S** (CL-10 «No sé» y CL-11 en la región de Design; **ya integrada en `c3f7f9a7`**, desplazó la de Chef +30 líneas) y esta ficha la de Chef (`:1190-1358`): regiones distintas. Pero **`i18n/textos/*/servidor/opciones.ts` y `preguntas.ts` y `i18n/huella.json` son generados**: quien integre el segundo **los regenera** con los dos scripts en lugar de resolver el conflicto a mano.

**Pruebas en rojo primero.**
- Invertir `chef-caracterizacion.test.mjs:176-178` — `HOY · D-CHEF-1 · «Información nutricional» acaba en el plan de una receta CON foto del plato (no hay un plan de nutrición)` — a `ARREGLADO · D-CHEF-1 · con la respuesta what=nutrition el plan es un solo paso de texto, sin ningún image.*`; `:179-181` («De una receta» → receta + foto) a `…con what=shopping, un paso shopping y sin image.*`; `:182-184` («Para la semana») según el punto 4. Las comprobaciones deben pasar **`presetAnswers`** (`{ questionId: 'what', optionId }`), no solo el texto, porque `infer` no cambia.
- Reescribir el grupo A: `:84-85` `CONTRATO · … exactamente cuatro formas de plan` → siete firmas (`id:capacidad(kind)`); y `:112-114` `CONTRATO · Chef aporta 4 formas y 9 pasos a los pines «35 formas / 74 pasos»` → contar **por secuencia de capacidades**, que es lo que cuentan las otras suites: **cinco formas y diez pasos**. (La comprobación de hoy cuenta por `firma`, más fina, y solo coincidía por casualidad: con 03a daría «7 formas · 12 pasos» `[M]`.)
- *Nuevas* (en `chef-caracterizacion`, sin tocar la cadena): `AC-05 · nutrition: un solo paso text.generate/answer, sin image.* ni vision.*` · `AC-07 · shopping: un paso shopping, sin foto del plato` · `AC-06 · swap: ni look ni vision.describe, no necesita foto de la persona (needsInputImage = false)` · `AC-20 · la frase del plan de nutrición y el brief del paso dicen «estimación»` · `AC-09 · cada kind nuevo es una variante declarada del catálogo` · `buildTextPrompt('chef','answer',…)` no contiene «Próximos pasos» ni recomienda a Weë Chef · coste: el plan de un paso se cotiza con `estimate-plan` (**a medir; no es un precio**).

**Criterios de aceptación.** AC-05, AC-06 (con 03b), AC-07 (con 03b), AC-09 (sigue verde), AC-20 (la parte de texto; la tarjeta es CHEF-07) — `docs/WEE-CHEF-ESPECIFICACION.md:415-417,419,430`.

**Pines que se mueven** `[M]` — simulación en memoria con las tres opciones, 46 suites barridas (`logs/sim-tres-T.tsv`; con las condiciones de `people`/`time` de la propuesta, `sim-tresW-T.tsv`: las mismas ocho). **Una sola persona (la de 03a), un solo commit, actualiza todo esto:**

| Suite | Línea del pin | Hoy → con 03a |
|---|---|---|
| `brain-pasos.test.mjs` | `:281-282` (`FORMAS.length === 35 && pasosTotales === 74 && exactas === 35`) y `:284-285` (`conKind === 67`) | 35→**36** formas · 74→**75** pasos · 67→**68** variantes |
| `pasos-repetidos.test.mjs` | `:264` (`SEC === 35 && PASOS === 74`) y `:267` (`ANTES === 68`) | 35→**36** · 74→**75** · 68→**69** (`PASOS - ANTES === 6`, igual) |
| `entrada-de-paso.test.mjs` | `:154-155` (`conKind === 64 && pasos === 65`) y `:162-163` (`briefsPropios === 47 && conBrief === 65`) | 64→**65** · 65→**66** · 47→**48** · 65→**66** |
| `pistas-de-paso.test.mjs` | `:200` (`conPista === 12 && pasos === 65`) | 65→**66** |
| `puente-necesidades.test.mjs` | `:97-98` (`FORMAS.length === 35 && TOTAL_PASOS === 74 && TOTAL_ARISTAS === 41`) y `:218-219` (`fieles === 32 && … === 35`) | 36 · 75 · 41 aristas · fieles **33** de 36 |
| `i18n-servidor.test.mjs` | `:97` (la guía del catálogo = la del servidor) y `:224` (todo plan posible se reconoce) | no son cifras: exigen las tres opciones y las frases y pasos nuevos en español (y traducidos en en/da) |
| `i18n-auditoria.test.mjs` | `:267` (el flujo guiado, en danés: «43 preguntas, 242 opciones» → 245; eran 233 en `a64ff24`) | idem: faltan las claves `chef…` en danés |
| `chef-caracterizacion.test.mjs` | `:84-85`, `:112-114` y los HOY de D-CHEF-1 | como arriba |

(G midió **seis** suites con una sola opción de una frase; con las tres opciones y los diccionarios completos se mueven **ocho**: se añade `i18n-auditoria`, que valida el flujo guiado en danés. Los números exactos dependen de que cada paso lleve `kind` y `brief`; se confirman al implementar.)

**Cercas.** No se mueve ninguna **si no se crea un archivo en `functions/src` y no se toca el catálogo del Core**: F1 (`puente-pre-f1d.test.mjs:715`; `templates.ts` y `prompts.ts` ya están por nombre, `:596-597`), F2 y F3 (sin tocar `credits/` ni `core/`), F4 (`creator/index.ts` no se toca), E4/H2 (nada en `engine/`). Se comprueba con `puente-pre-f1d` (42/42), `video-asincrono` (64/64), `runtime-map` y `git diff --stat -- functions/src` = solo `creator/templates.ts` y `creator/prompts.ts`.

**i18n.** **Servidor (es/en/da, tipado contra el español: no compila si falta una):** 3 opciones (`chefWhatNutrition`, `chefWhatSwap`, `chefWhatShopping`, que genera la guía a partir de los ids) + 3 frases del plan en `plan/casa.ts` (una por rama; `[P]` `chefExplicaNutricion`, `chefExplicaSustituir`, `chefExplicaCompra`) + 2 nombres de paso nuevos (el de la lista reutiliza `chefPasoListaDeCompras`) ≈ **8 textos × 3 diccionarios**; después, los dos scripts. El danés queda sin revisión humana (`i18n-revision`). **Cliente (16 idiomas):** ninguna clave (los títulos de las tarjetas y paneles ya existen: `chef.nutritionTitle`…). Las frases viejas no se tocan: no hace falta `anteriores.ts` (`docs/I18N.md` §9b).

**Esfuerzo (estimación).** M (0,5–1,5 días): ocho suites y tres traducciones.

**Lista para empezar:** D-3 (§1); CHEF-01 integrada; los puntos 1–4 cerrados; el texto de las tres instrucciones, de las tres frases y de los tres nombres revisado por producto. **Terminada:** los HOY de D-CHEF-1 invertidos; las ocho suites actualizadas y en verde; `i18n-huella` e `i18n-servidor-fuentes` en verde; cercas intactas; `docs/WEE-ACEPTACION.md`: ACE-C-12 y C-13 → PASA (con 03b, C-11).

**Al día en R8 (2026-10-12, base `c3f7f9a7`).** La plantilla de Chef está ahora en `templates.ts:1190-1358` (+30 por la región de Design integrada); su contenido no ha cambiado. **Re-medido `[M]`** con `simula-chef.mjs` (en memoria) sobre las 8 suites de plan: se mueven **las mismas ocho** con los **mismos pines** (35→36, 74→75, 67→68, 68→69, 64→65, 47→48, 65→66, fieles 32→33); cambian dos cifras derivadas, ya corregidas arriba: los planes de `i18n-servidor` (1 435 → 1 525 sin tocar `when`, → 1 443 con la propuesta) y las opciones del flujo guiado en danés de `i18n-auditoria` (242 → 245).

| Archivo | Leer / modificar / no tocar | Propiedad |
|---|---|---|
| `functions/src/creator/templates.ts` (solo Chef, `:1190-1358`) | **modificar** | persona 1, después de 01; la región de Design no se toca |
| `functions/src/creator/prompts.ts` | modificar (las instrucciones `answer`/`shopping` de Chef en la tabla de 01) | persona 1 |
| `i18n/textos/{es,en,da}/servidor/opciones.ts`, `plan/casa.ts` | modificar (es a mano solo lo que no se genera) | persona 1; los generados, con los scripts |
| las 8 suites de pines | **una persona, un commit** | solo 03a |
| `core/registry/capabilities.ts`, `creator/index.ts`, `engine/*`, `credits/*` | **no tocar** | cercas F1–F4/E4 |

**Contrato.** `[X]` `TEMPLATES.chef` con `q()`/`opt()`/`step()`, `Plan`/`PlanStep`, las variantes `answer` y `shopping` ya declaradas en el catálogo del Core, `estimatePlan` → `creatorQuote`; `[P]` las tres opciones y las tres ramas de `buildPlan` de la tabla de arriba. **Ningún motor paralelo:** tres ramas de la plantilla de siempre, ejecutadas por `creatorRun` y el WEË AI ENGINE; sin variante nueva, sin archivo nuevo en `functions/src`, sin precio escrito.

**Qué decisión la bloquea.** **D-3** (PENDIENTE DE DECISIÓN) para la opción `nutrition` y su frase. **Sin D-3 pueden empezar `swap` y `shopping`** (*inferido*: no dependen de la nutrición), con la misma ronda de pines repetida cuando entre `nutrition` —o, mejor, esperar y hacer un solo commit de pines—. D-1 no la bloquea.

**Qué se puede preparar sin tocar código funcional.**
- *Borradores para revisión de producto* (no son copy final): opciones — «🔢 Información nutricional», «🔁 Sustituir ingredientes», «🛒 Lista de compras»; frases del plan — «Voy a calcular la información nutricional por porción: es una estimación, no un análisis.», «Voy a proponerte cómo sustituir lo que pides sin que el plato pierda su sentido.», «Voy a hacerte la lista de compras, por secciones del supermercado.»; nombres de paso — «Calcular la información nutricional», «Proponer cómo sustituir los ingredientes», y la lista reutiliza `chefPasoListaDeCompras`. *Instrucción `answer` de Chef:* «Responde a lo que se pide sobre cocina en menos de 200 palabras, sin «Próximos pasos» y sin recomendar otros especialistas. Si das cifras de nutrición, son una ESTIMACIÓN por porción y lo dices; nunca un consejo médico. Si se pide sustituir por una alergia, no afirmes que el resultado es seguro para esa alergia.» (R-10).
- *Claves de i18n por idioma (servidor, es/en/da):* `chefWhatNutrition`, `chefWhatSwap`, `chefWhatShopping` (las genera la guía) + `chefExplicaNutricion`, `chefExplicaSustituir`, `chefExplicaCompra` `[P]` + dos nombres de paso `[P]` ≈ 8 × 3; cliente: ninguna.
- *Pines antes/después:* la tabla de §«Pines», confirmada en `c3f7f9a7`.
- *Orden de commits:* 1) los HOY de D-CHEF-1 invertidos en rojo (con `presetAnswers`); 2) plantilla + instrucciones + diccionarios + scripts generadores; 3) **un** commit con los 8 pines; 4) `WEE-ACEPTACION.md`.

**Los seis puntos de R7-Design que la tocan:** `people`/`time` (punto 3) **sigue** (`:1225`, `:1231`): bloquea el inicio hasta fijar los `when`, **no necesita al dueño**; «Para la semana» (punto 4) **sigue** (`:1241`): **necesita al dueño** (o mandar `what: menu` desde esas entradas); `answer` compartido (punto 2) sigue: técnica, no del dueño.


---

### CHEF-03b — Cliente: la pantalla manda la intención de cada panel

**Objetivo.** Que cada panel (nutrición, sustituir, compras) mande al servidor su propia intención al enviar la frase empezada, y que el cliente deje de exigir una foto de ingredientes por la palabra «ingredientes» del título del panel (D-CHEF-2, parte cliente).

**Qué cambia para la persona.** «Sustituir ingredientes · Sin lactosa: una lasaña» deja de abrir un plan que empieza mirando una foto y de pedir «Sube una foto»; cada panel crea su resultado de texto.

**Archivos.** *Modificar:* `constants/chefTools.ts`; `screens/ChefScreen.tsx` (recordar el panel al elegir una entrada `:164-170`, mandarlo en `alEnviar` `:146-154`); `screens/CreatorFlowScreen.tsx` (una línea de `needsPhoto`, `:65-74`; **compartido**). *Leer:* `components/chef/ChefPanel.tsx`; `functions/test/_pantallas.mjs` (en esa prueba **solo `useState` persiste entre dibujados; `useRef` no**: la memoria del panel debe ser un `useState`).

**Contrato `[P]`:**

```ts
// constants/chefTools.ts — PROPUESTA
/** La intención de cada panel: la respuesta a `what` que el servidor ya entiende tras CHEF-03a. Los ids son los de `PanelDeChef`. */
export const PRESET_DE_PANEL: Readonly<Record<PanelDeChef, { questionId: 'what'; optionId: PanelDeChef }>> = {
  nutrition: { questionId: 'what', optionId: 'nutrition' },
  swap:      { questionId: 'what', optionId: 'swap' },
  shopping:  { questionId: 'what', optionId: 'shopping' },
};
```

En la pantalla: un estado (`useState`) con `{ panel, inicio }` que se pone al elegir una entrada (`inicio` = la frase empezada que ya se calcula, `t('chef.panelStart', …)`); `alEnviar` manda `preset: PRESET_DE_PANEL[panel]` **solo si el texto sigue empezando por `inicio`** (la persona puede haberlo borrado o reescrito) y lo pasa a `contextoDeChef` de CHEF-02. En `CreatorFlowScreen`, `needsPhoto` solo mira las palabras del objetivo cuando **no llega ningún `preset`**: `(!params.preset && /ingredientes|nevera|refri|foto/i.test(params.goal || ''))` en `:74`.
`[P, mejor]` extraer esa regla a una función pura de `utils/` para probar el comportamiento sin leer texto fuente.

**Contradicción detectada en la especificación (§6.1 CHEF-03b: «las tres tarjetas llevan `preset`»).** Si se añade `preset` a `TARJETAS_DE_CHEF`, `chef-weeai.test.mjs:72-76` (#3, «las cinco que abren la conversación»: `conPreset.length === 5`) y `:88` (#6, «ninguna tarjeta tiene las dos cosas») **caen**. La salida propuesta es el **mapa aparte** `PRESET_DE_PANEL` (arriba): las tarjetas no cambian y #3, #5 y #6 siguen verdes. (La alternativa, modificar #3 y #6, es tocar una cerca de la pantalla que la especificación no prevé.)

**Puntos abiertos.** (a) «Para la semana» y «De un menú» del panel de compras: ver CHEF-03a punto 4. (b) `alElegirEntrada` sigue llamando a `setPrompt(t('chef.panelStart', { panel: …, que: … }))` tal cual: lo fija `chef-weeai` #21 (`:158-159`). (c) Si D-3 = C, la tarjeta de nutrición desaparece (§1.3).

**Dependencias.** **CHEF-03a** (los ids: sin 03a un `preset` `swap` no existe en la plantilla y `respuestaPara` lo descarta, `planner.ts:83-92`, y se vuelve a `infer`); **CHEF-02** (`contextoDeChef`, y que `preset` vaya también dentro de `presets`); **D-1 = A**; D-3. **Cierre de Design — archivo compartido:** `CreatorFlowScreen.tsx`: la tarea **C** de R7-Design (CL-12 reintento de cotización, CL-20 `projectId`) **ya está integrada en `c3f7f9a7`** (sus hunks quedan en `:80-92`, `:115-117`, `:166-167`, `:306`, `:405-406`, `:637-639`); después vendrá CHEF-05 (`:351`, `:368-379`; espera a la decisión D3 de Design). El hunk de 03b (`:71-74`) no toca ninguno, pero es **un mismo archivo**: revisar con `git diff` que ningún hunk se pisa y comprobar al empezar si alguna tarea de R8 lo cambió.

**Pruebas en rojo primero.**
- Invertir `chef-caracterizacion.test.mjs:186-188` — `HOY · D-CHEF-2 · «Sustituir ingredientes» se deduce como «cocinar con lo que tengo»: el plan empieza mirando una foto` — a `ARREGLADO · D-CHEF-2 · con what=swap el plan no empieza por vision.describe y no necesita foto`.
- Invertir `:189-194` — `HOY · D-CHEF-2 · y el cliente exige esa foto porque el título del panel contiene la palabra «ingredientes»`. **Ojo:** la comprobación de hoy lee el literal `/ingredientes|nevera|refri|foto/i.test(params.goal || '')` de `CreatorFlowScreen.tsx` y **seguiría en verde** tras el cambio (el literal sigue ahí): invertirla de forma explícita (función pura, o la guarda `!params.preset` exigida por expresión regular sobre `needsPhoto`).
- *Nuevas en proceso* (`aceptacion-pantallas`, aditivas, con `_pantallas.mjs`): elegir «Sin lactosa» en «Sustituir ingredientes», terminar la frase y enviar → `navegacion[0][2].preset` = `{ what: swap }` y `presets` lo incluye; **borrar la frase empezada → ya no manda `swap`**; sin panel → como hoy (ACE-C-04 intactos).

**Criterios de aceptación.** AC-04, AC-06 (con 03a), y AC-05/07 en pantalla (con 03a) — `docs/WEE-CHEF-ESPECIFICACION.md:414-417`.

**Pines que se mueven.** `chef-caracterizacion` D-CHEF-2 (×2) y la de «Para la semana» del panel de compras; `chef-weeai` ninguno (con el mapa aparte); `aceptacion-pantallas` ACE-C-03 intactos (el panel se sigue abriendo dentro, atrás cierra el panel, la frase empezada es la misma).
**Cercas.** Ninguna (cliente). `tsc` 0.
**i18n.** Ninguna clave.
**Esfuerzo (estimación).** S (≤ 4 h), una vez 02 y 03a están.

**Lista para empezar:** 02 y 03a integradas; D-1 = A; el punto (a) resuelto; `CreatorFlowScreen.tsx` al día con la tarea C. **Terminada:** invertidas y nuevas en verde; `chef-weeai` 47/47; `aceptacion-pantallas` 68/68 más las nuevas; ACE-C-11 → PASA en `docs/WEE-ACEPTACION.md`; `tsc` 0.

**Al día en R8 (2026-10-12, base `c3f7f9a7`).** `needsPhoto` sigue en `CreatorFlowScreen.tsx:65-74` con la misma forma: `preset cook` ‖ `preset edit` ‖ la expresión de las palabras, sin mirar si llega otro `preset` (`:74`); el cambio propuesto (`!params.preset && …`) sigue siendo una línea. La tarea C ya está integrada: la espera «después de C» está cumplida. NAV (R8) toca `ChefScreen.tsx`: re-verificar `:146-170` al empezar.

| Archivo | Leer / modificar / no tocar | Propiedad |
|---|---|---|
| `constants/chefTools.ts` | modificar (`PRESET_DE_PANEL`) | persona 2, tras 02 |
| `screens/ChefScreen.tsx` | modificar (recordar el panel, mandarlo en `alEnviar`) | persona 2; NAV también lo toca |
| `screens/CreatorFlowScreen.tsx` | **una línea** de `needsPhoto` (o una función pura de `utils/`, mejor) | compartido; revisar hunks |
| `components/chef/ChefPanel.tsx`, `functions/src/**` | no tocar | — |

**Contrato.** `[X]` `PanelDeChef` (`chefTools.ts:41`), `TARJETAS_DE_CHEF` (sin cambio), `t('chef.panelStart', …)`, `params.preset`; `[P]` `PRESET_DE_PANEL`, el estado `{ panel, inicio }`, la guarda de `needsPhoto`. **Ningún motor paralelo:** la intención viaja como la respuesta `what` que el planificador ya entiende.

**Qué decisión la bloquea.** **D-1 = A** y **D-3** (la tarjeta de nutrición): PENDIENTES DE DECISIÓN. Depende además de 03a (los ids) y de 02 (`contextoDeChef`). **Sin decisiones** puede prepararse la función pura de `needsPhoto` con su prueba (no cambia comportamiento hasta que se use).

**Qué se puede preparar sin tocar código funcional.**
- *La tabla `PRESET_DE_PANEL`* (arriba), y *el mapa por entrada* si el dueño quiere que «Para la semana» y «De un menú» sigan en el menú: `{ shopping: { week: 'menu', menu: 'menu' } }` `[P]` (ids de entrada de `chefTools.ts:143-150`).
- *Casos en proceso para `aceptacion-pantallas`:* elegir «Sin lactosa» en Sustituir → `preset {what: swap}` y dentro de `presets`; borrar la frase → ya no; sin panel → como hoy.
- *i18n:* ninguna clave.
- *Orden de commits:* 1) la guarda de `needsPhoto` como función pura + prueba; 2) `PRESET_DE_PANEL` + pantalla, tras 03a/02; 3) `WEE-ACEPTACION.md` (ACE-C-11).

**Los seis puntos de R7-Design que la tocan:** «las tres tarjetas llevan `preset`» (punto 5) **sigue**: se resuelve con el mapa aparte, no necesita al dueño; la prueba textual de `:189-194` (punto 7) **sigue**: se invierte a propósito; «Para la semana» (punto 4): **necesita al dueño**.


---

### CHEF-04 — Leer y escalar una receta: funciones puras

**Objetivo.** Tener, en el cliente y sin interfaz todavía, funciones puras que lean el texto de una receta, la escalen a otras porciones y lean una lista de compras, con **fallo cerrado**: lo que no se entiende devuelve `null` y el texto sale tal cual (AC-15…17).

**Qué cambia para la persona.** Nada todavía: las usará `RecetaCard` (CHEF-07, lote 2, que depende de D-1).

**Archivos.**
- *Crear:* `utils/recetaDeChef.ts` `[P: nombre]` (archivo nuevo del **cliente**: F1 mira `functions/src`, no le afecta) y `functions/test/chef-receta.test.mjs`, una suite que se carga con el cargador de pruebas del cliente, con su paso en `functions/package.json` (el script `test` es **una sola línea de 311 pasos**: añadir el tuyo al final de la lista de pasos nuevos; la unión la hace quien coordina).
- *Leer:* `utils/textoDeResultado.ts:19-31` (`sinMarcasInternas`, que se **reutiliza**: no se copia la expresión de `IMAGEN:`), `functions/src/creator/prompts.ts:440-441,486-487` (el formato que el prompt pide hoy), `functions/test/filmmaker-cliente.mjs` (`crearCargador`: transpila y **resuelve** los imports relativos; el `ejecutar` de `chef-weeai.test.mjs:40-48` los **quita**, así que no sirve si el módulo importa otro), `i18n/formato.ts:41` (solo para quien pinte).

**Contrato `[P]`** (el de la especificación §2.5, con los detalles que faltaban):

```ts
// utils/recetaDeChef.ts — PROPUESTA (no existe); funciones puras: sin React, sin traductor, sin red
export interface RecetaLeida {
  titulo: string; emoji?: string;
  porciones?: number; minutos?: number;                    // ausentes si el texto no los dice
  ingredientes: { texto: string; cantidad?: number; unidad?: string; nombre?: string }[];   // `texto` = la línea original: fallo cerrado
  pasos: string[]; consejo?: string;
}
export const leerReceta = (texto: string): RecetaLeida | null;                    // null = no se pudo leer → se enseña el texto tal cual
export const escalarReceta = (r: RecetaLeida, porciones: number): RecetaLeida | null;   // null = no se escala (sin base, factor fuera de 0,25–10…)
export const leerLista = (texto: string): { secciones: { nombre: string; lineas: { texto: string; cantidad?: number; unidad?: string }[] }[] } | null;
```

Las reglas de escalado son las de la especificación (`docs/WEE-CHEF-ESPECIFICACION.md:255-265`: factor `nuevas/base` con la base de «Para N personas» o de la respuesta `people`; g y ml redondeados a 5/1/0,5; cucharadas y tazas a ¼; piezas al entero con «≈»; «al gusto/una pizca/un chorrito» intactos; tiempos, temperaturas y molde **no** se escalan) y **siguen `[P]`: requieren la revisión de alguien que cocine antes de darlas por buenas (UNKNOWN su validez culinaria)**.
Límites que esta ficha fija `[P]`: (1) v1 solo **español** en las palabras (`personas`, `g kg ml l cucharada cucharadita taza pizca al gusto`): en otro idioma `leerReceta` puede devolver `null` (es seguro) hasta CHEF-07, que pide `INGREDIENTES:` y `PASOS:` en español en todos los idiomas; (2) devuelven números: **el formateo es de quien pinta** (`i18n/formato.ts`, nunca `toLocaleString('es')`); (3) el aviso «revisa los tiempos y el molde» lo escribe la tarjeta, no estas funciones; (4) el estado de las casillas de la lista no es de aquí (local al dispositivo, CHEF-08).
Reutiliza `[X]`: `sinMarcasInternas`, el formato que el prompt de receta ya pide, el cargador de pruebas del cliente. **No toca el prompt, la i18n ni ningún componente: no crea ningún motor.**

**Dependencias.** Ninguna de otras fichas ni de D-1/D-3; **nada compartido con la tarea de cierre de Design** (archivos nuevos del cliente); solo `functions/package.json` (una línea). **Es la ficha que puede empezar ya.**

**Pruebas en rojo primero.** La suite nueva (rojo = las funciones no existen; después verde), con nombres: `AC-15 · leerReceta: título, porciones, tiempo, ingredientes y pasos de los N textos de ejemplo` (≥ 10, **escritos a mano y rotulados «NO son salida real del modelo»**: con emoji y «Para 4 personas · 45 minutos»; sin tiempo; sin porciones; con «½ taza», con «2–3», con «al gusto»; con pasos de dos dígitos; con `CONSEJO:`; con la línea `IMAGEN:`; con viñetas «-» y «•»; con numeración «1)» y «1.»; **un texto que no es una receta → `null`**) · `AC-15 · descarta la línea IMAGEN:` · `AC-16 · escalarReceta ×1 devuelve lo mismo` · `4→6`, `4→1` y `4→2 con la tabla` · `«al gusto» y «una pizca» no se tocan` · `tiempos y temperaturas no se escalan` · `factor fuera de 0,25–10 → null` · `sin porciones base → null` · `la línea que no se entiende se conserva y no se escala` · `AC-17 · si no se pudo leer, null` · `leerLista agrupa por «SECCIÓN:»`. **Control:** un sabotaje (otro redondeo) debe romper al menos una comprobación.

**Criterios de aceptación.** AC-15, AC-16, AC-17 (`docs/WEE-CHEF-ESPECIFICACION.md:425-427`; la parte de «sin control en pantalla» es de CHEF-07).
**Pines que se mueven.** Ninguno. **Cercas.** Ninguna; `ci-workflow` 13 exige el paso en la cadena (se comprueba ejecutándolo).
**i18n.** Ninguna.
**Esfuerzo (estimación).** M (0,5–1,5 días; casi todo son los casos de cantidades).

**Lista para empezar:** ya (ninguna decisión). **Terminada:** suite en verde y en la cadena; el sabotaje la rompe; `tsc` 0; `escaneo-secretos` y `ci-workflow` en verde; reglas de escalado revisadas por una persona que cocine (o rotuladas «sin revisar»).

**IMPLEMENTADA en la rama `r8/chef` (R8, 2026-10-12) — CORREGIDO EN RAMA AISLADA, NO integrada.** Commit `3bb91118` sobre `c3f7f9a7`: `utils/recetaDeChef.ts` + `functions/test/chef-receta.test.mjs` (399 comprobaciones, en la cadena: paso al final de `functions/package.json`). Nadie más crea ni importa el archivo (comprobado en las ramas y en los worktrees de R8). Detalle y evidencia: `RD8\CHF-chef\informe.md`.

**API real** (afina el contrato `[P]` de arriba, sin quitarle nada; las razones, en el informe):

```ts
export type UnidadDeCocina = 'g' | 'kg' | 'ml' | 'l' | 'cucharada' | 'cucharadita' | 'taza' | 'vaso' | 'pizca';
export interface LineaConCantidad { texto: string; cantidad?: number; hasta?: number; unidad?: UnidadDeCocina; nombre?: string }
export interface IngredienteLeido extends LineaConCantidad { aproximado?: boolean; sinEscalar?: boolean }
export interface RecetaLeida { titulo: string; emoji?: string; porciones?: number; minutos?: number;
  ingredientes: IngredienteLeido[]; pasos: string[]; consejo?: string; otras?: string[] }        // todo `readonly`
export interface ListaLeida { secciones: { nombre: string; lineas: LineaConCantidad[] }[]; otras?: string[] }
export const leerReceta: (texto: string) => RecetaLeida | null;
export const escalarReceta: (r: RecetaLeida, porciones: number) => RecetaLeida | null;
export const leerLista: (texto: string) => ListaLeida | null;
export const factorDeEscala: (base: number, nuevas: number) => number | null;   // null fuera de 0,25–10
export const pideRevisarTiempos: (factor: number) => boolean;                   // > 2 o < 0,5: la tarjeta escribe el aviso
```

Lo añadido al contrato y por qué: `hasta` (un rango «2–3» no cabe en un número), `aproximado` (el «≈» de §2.5), `sinEscalar` (la línea que no se entendió se conserva y la tarjeta tiene que poder avisarlo), `otras` (lo que no es título, porciones, ingrediente, paso ni consejo no se tira en silencio), `nombre` también en las líneas de lista, y las dos funciones auxiliares (la condición del aviso no se reescribe en la tarjeta). **Contrato con quien pinte (CHEF-07):** `texto` nunca se reescribe; una línea con `cantidad` se pinta con `cantidad` + `unidad` + `nombre`; se escala siempre desde la receta leída (una ya escalada con redondeos devuelve `null`); el nombre no se conjuga («1 huevo» ×3 sigue siendo «huevo»: lo resuelve la tarjeta o una tabla revisada); `leerReceta` se llama solo con el resultado del paso `recipe` (un menú con viñetas y números podría leerse como receta).

**Reglas culinarias: siguen `[P]` y SIN REVISAR por alguien que cocine** (UNKNOWN su validez). Lo implementado: g/ml a 0,5 / 1 / 5 según salga < 10 / ≥ 10 / ≥ 100; kg y l a 0,05; cucharadas, cucharaditas, tazas y vasos a ¼; piezas al entero; mitades hacia arriba; nunca a cero (el mínimo medible, con «≈»); «al gusto», pizca, chorrito, poco, puñado y el tamaño de un molde, intactos; pasos, minutos, temperaturas y molde, sin tocar. No se lee (se conserva y avisa): «1.000 g», unidades que v1 no conoce (dl, cl, oz, lb, cups…), «docena», «par», «cuartos», otra cantidad dentro («1 taza (240 ml)»), calificativos («rasa», «sopera»), «1 taza y media», aproximados («unos 200 g»).

**Esfuerzo real:** una sesión (frente a la estimación M). **Pendiente para darla por terminada del todo:** la revisión culinaria de las reglas y su integración (la hace el coordinador).


---

## 3. Orden y paralelismo

**Tres personas a la vez, sin tocar los mismos archivos:**

| Persona | Fichas, en orden | Archivos (solo suyos) |
|---|---|---|
| **1 — servidor** | CHEF-01 → CHEF-03a | `functions/src/creator/prompts.ts` y `templates.ts`; `i18n/textos/{es,en,da}/servidor/*`; los pines de §03a |
| **2 — pantalla** | CHEF-02 → CHEF-03b | `constants/chefTools.ts`; `screens/ChefScreen.tsx`; `components/creator/CajaDePrompt.tsx`; `utils/contextoDeChef.ts`; **una línea** de `screens/CreatorFlowScreen.tsx` |
| **3 — funciones puras** | CHEF-04 — **hecha en `r8/chef` (R8)**; la persona 3 queda libre para la función pura de `contextoDeChef` (02) o la de `needsPhoto` (03b), que no esperan a D-1 | `utils/recetaDeChef.ts` y su suite nueva |

**Qué espera a qué.** 01 → 03a (el mecanismo de instrucciones por experiencia). 02 → 03b (`contextoDeChef`). **03a antes que 03b** (los ids: sin 03a, el `preset` de un panel no existe y se descarta; sin 03b, 03a solo añade opciones a la pregunta). D-1 = A → 02 y 03b. D-3 → la opción `nutrition` de 03a y la tarjeta de nutrición de 03b. La tarea C (Design, cliente) → **ya integrada en `c3f7f9a7`**: esa espera está cumplida (`CreatorFlowScreen.tsx`). La tarea S (Design, servidor) → también integrada en `c3f7f9a7`; si otra tarea vuelve a tocar los textos del servidor, quien integre la segunda regenera los diccionarios generados y `i18n/huella.json`. CHEF-05 (reintento y «otra versión» sin perder lo contestado; no es una de estas fichas) espera al cierre de Design y a su decisión D3: toca las mismas líneas que CL-13 (`CreatorFlowScreen.tsx:351,368-379`).
**Camino crítico:** 01 → 03a → 03b.

**Archivos que sí comparten varias fichas o varias tareas — coordinar:**

| Archivo | Quién lo toca | Cómo se evita el pisotón |
|---|---|---|
| `functions/test/chef-caracterizacion.test.mjs` | 01 (D-CHEF-3), 02 (D-CHEF-4/5), 03a (grupos A y C), 03b (D-CHEF-2) | Cada ficha edita **solo sus líneas** (arriba); integrar en el orden 01, 03a, 02, 03b, con commits pequeños |
| `docs/WEE-ACEPTACION.md` | 02 (ACE-C-04/07/09), 03a/03b (ACE-C-11/12/13) | Un commit final del lote, de una persona |
| `functions/package.json` (una línea) | 04 (+1 paso); 02 si añade `chef-contexto` | La unión la hace quien coordina (`R7\integracion\resolver-package.mjs`); no reescribir la línea |
| `i18n/huella.json`, `i18n/textos/*/servidor/{opciones,preguntas}.ts` (generados) | 03a y la tarea S | Regenerar con `scripts/i18n-guia-del-servidor.mjs` y `scripts/i18n-huella.mjs`, no fusionar a mano |
| `functions/src/creator/templates.ts`, `prompts.ts` | 01/03a y la tarea S (región de Design) | Regiones distintas; revisar el `diff` al integrar |
| `screens/CreatorFlowScreen.tsx` | 03b (1 línea), la tarea C (CL-12, CL-20), CHEF-05 | Integrar después de C; `git diff` de hunks |

**Quién actualiza los pines 35/74 y los de i18n:** solo CHEF-03a, una persona, un commit.

---

## 4. Riesgos de coste del lote (R-1…R-16 de la especificación que lo tocan; **sin ningún precio**)

Todas las cifras de Credits de la especificación son del **catálogo de PRUEBA, modo simulado** (`docs/WEE-CHEF-ESPECIFICACION.md:200-201,498`); no se comunican ni se copian a ninguna pantalla.

| Riesgo | Qué hace el lote |
|---|---|
| **R-1** reintentos y variantes regeneran todo | **No lo resuelve** (es CHEF-05). Sí añade planes de **un solo paso de texto** (`ai_text`, una unidad del catálogo de prueba, frente a las cinco de «receta + foto» o las siete del menú: `docs/WEE-CHEF-ESPECIFICACION.md:195-198`) para nutrición, sustituir y compras: lo que antes costaba una receta con foto pasa a costar un paso de texto. A confirmar con `estimate-plan`. |
| **R-3** fallo a medias: reembolso total y resultado parcial conservado | Los tres planes nuevos son de **un paso**: no hay «a medias». |
| **R-5** foto del plato en toda receta | **No se toca** (CHEF-09, lote 2): las recetas siguen llevando foto. |
| **R-6** búsqueda con fuentes en cada menú | **No se toca**; la opción B de D-3 la ampliaría (`ai_search` para nutrición). |
| **R-7** cupos por persona y día (texto 400 por defecto) | Los planes nuevos consumen cupo de texto; mucho menos que uno de imagen. Valores reales: UNKNOWN. |
| **R-10** seguridad alimentaria y salud | **Sin resolver**: la nutrición se rotula como estimación (AC-20), pero «Alérgenos» y las sustituciones sin lactosa o sin frutos secos tocan alergias, y D-4 (alergias) sigue sin decidir. La instrucción de `swap` **no debe afirmar que algo es seguro para una alergia**. Solo un canary (CHEF-18) mide cuánto respeta el modelo una restricción. |
| **R-13** coste de coordinación (3 diccionarios por texto del servidor; pines compartidos) | Una persona y un commit para los pines (§3); un solo responsable de la traducción del lote. |
| **R-14** `main` no es producción y no hay suite de emulador del recorrido de Chef | **Sigue**: CHEF-14 (lote 2). Todo el lote se prueba con `node functions/test/…` sobre `functions/lib` y `tsc`. |
| **R-15** precios de prueba | Ningún número de Chef se comunica; `no son precios`. |
| **R-16** textos del servidor en 13 idiomas salen en inglés | Los textos nuevos del servidor existen solo en es/en/da (como todos). |
| **R-1 (CHEF-04, R8)** | `escalarReceta` ya existe: cambiar de 4 a 6 porciones podrá hacerse en el dispositivo, sin trabajo nuevo ni cobro, cuando la tarjeta (CHEF-07) la use. Hasta entonces, nada cambia en el coste. Sin ningún precio. |
| R-2, R-4, R-8, R-9, R-11, R-12 | No los toca el lote. |

---

## 5. Puntos abiertos que esta preparación encontró (no están en la especificación)

| # | Qué | Dónde | Propuesta `[P]` | Quién cierra |
|---|---|---|---|---|
| 1 | El paso `prices` (búsqueda) también recibe la instrucción de `shopping` | `inputs.ts:117-120`, `templates.ts:1340-1341` | Elegir (A) una instrucción para los dos o (B) por capacidad | quien implemente 01, antes de empezar |
| 2 | `nutrition` y `swap` comparten `kind: 'answer'` | `prompts.ts:455-456` | Una instrucción de Chef para `answer` + la regla de cada una en el `brief` | quien implemente 03a |
| 3 | `people`/`time` se preguntarían para las opciones nuevas | `templates.ts:1225,1231` | `when` que las excluya (ninguna / solo `people` para compras) | 03a |
| 4 | «Para la semana» y «De un menú» cambiarían de plan (menú → lista) | `templates.ts:1241`, `chef-caracterizacion.test.mjs:182-184` | Decidirlo o mandar `what: menu` desde esas entradas | dueño o quien implemente 03a/03b |
| 5 | «Las tres tarjetas llevan `preset`» rompe `chef-weeai` #3 y #6 | `chef-weeai.test.mjs:72-76,88` | El mapa aparte `PRESET_DE_PANEL` | 03b |
| 6 | `params.presets ?? [params.preset]`: si se manda `presets`, el `preset` se pierde | `CreatorFlowScreen.tsx:167` | `contextoDeChef` pone el `preset` **dentro** de `presets` y como `preset` | 02 |
| 7 | Dos comprobaciones HOY son textuales y siguen en verde tras el arreglo | `chef-caracterizacion.test.mjs:131-133,189-194` | Invertirlas explícitamente (función pura o pantalla en proceso) | 02 y 03b |
| 8 | La comprobación «cuatro formas / 9 pasos» cuenta por `firma`, no por secuencia de capacidades | `chef-caracterizacion.test.mjs:112-114` | Reescribirla por secuencia (cinco formas y diez pasos con 03a) | 03a |
| 9 | La caja que avisa es **una de las tres** opciones que J dejó como *BLOCKED — HUMAN DECISION* | `aceptacion-recorrido-servidor.test.mjs:371-372` | Confirmar con el dueño, o retirar el contador de 02 | dueño |
| 10 | D-1 «no bloquea el lote 1» (`:533`) frente a «mínimo para arrancar» (`:546`) | `docs/WEE-CHEF-ESPECIFICACION.md` | Leerla como §1.4: frena a 02 y 03b | dueño |
| 11 | El contador por puntos de código no coincide con el corte del servidor (UTF-16) | `CampoQueCrece.tsx:74` frente a `creator/index.ts:310` | Contar con `trim().length` | 02 |
| 12 | `i18n-auditoria` es una octava suite que se mueve | `i18n-auditoria.test.mjs:267` | Incluirla en el commit de pines | 03a |
| 13 | «Alérgenos» y «Calorías, macros y alérgenos» prometen más que una estimación sin fuentes | `chefTools.ts:128`, `i18n/textos/es/chef.ts` | Señalarlo en D-3 y en R-10 | dueño |
| 14 (R8) | Las reglas culinarias de `escalarReceta` están implementadas y SIN REVISAR por alguien que cocine | `utils/recetaDeChef.ts` (`pasoDe`, `esIntacta`) | Revisión de una persona que cocine antes de que la tarjeta las use | dueño / producto |
| 15 (R8) | El nombre de una pieza no se conjuga al escalar («1 huevo» → 3 «huevo») | `utils/recetaDeChef.ts` | Resolverlo en la tarjeta (CHEF-07) o con una tabla de plurales revisada | quien haga CHEF-07 |
| 16 (R8) | `leerReceta` no sabe de qué paso viene el texto: un menú con viñetas y números podría leerse como receta | `utils/recetaDeChef.ts` | La tarjeta la llama solo con el resultado del paso `recipe` | CHEF-07 |
| 17 (R8) | La instrucción de compra de CHEF-01 puede pedir la marca «SECCIÓN:» que ya lee `leerLista` | `prompts.ts`, `utils/recetaDeChef.ts` | Incluirla en el borrador de CHEF-01 si producto lo acepta | producto / quien haga 01 |
| 18 (R8) | `sinMarcasInternas` (reutilizada) tiene retroceso cuadrático con tiras largas de espacios (≈1,6 s con 19 000) | `utils/textoDeResultado.ts:19` | `recetaDeChef` se protege colapsando las tiras antes de llamarla; el resultado genérico (`ResultCard`) sigue expuesto: arreglo aparte, fuera de Chef | quien lleve `textoDeResultado` |

---

## 6. Evidencia ejecutada para estas fichas `[E]` / `[M]`

| Qué | Resultado | Log |
|---|---|---|
| `chef-caracterizacion` (el «antes») | 42 ✔ · 0 ✘ · exit 0 · 3 s | `hoy-chef-caracterizacion.log` |
| `chef-weeai` · `aceptacion-pantallas` | 47 ✔ · 0 ✘ · 68 ✔ · 0 ✘ y 1 hueco conocido (ACE-D-06, Design) | `hoy-chef-weeai.log`, `hoy-aceptacion-pantallas.log` |
| Control: 46 suites que leen la plantilla de Chef, sin simulación | 0 fallos (167 s) | `sim-control-T.tsv` |
| Simulación `[M]` de las tres opciones de 03a (literal de §2.4) | **8 suites** se mueven: `brain-pasos`, `chef-caracterizacion`, `entrada-de-paso`, `i18n-auditoria`, `i18n-servidor`, `pasos-repetidos`, `pistas-de-paso`, `puente-necesidades` | `sim-tres-T.tsv` |
| Lo mismo con las condiciones `when` de la propuesta | las mismas 8 | `sim-tresW-T.tsv` |
| Simulación `[M]` de CHEF-01 (31 suites) y prototipo desechable en la copia `[E]` (27 suites, con `runtime-map`, `ci-workflow`, `puente-pre-f1d`, `video-asincrono`) | solo `chef-caracterizacion` D-CHEF-3 | `sim-instr-P.tsv`, `suites-chef01-prototipo.tsv` |
| `stepInputFor` real sobre el plan de menú de Chef | `prices` y `list` reciben la instrucción de Home | `stepInputFor-menu-chef.log` |
| **R8 · CHEF-04** `chef-receta` (rojo con el módulo ausente → verde) | 399 ✔ · 0 ✘ · exit 0 | `RD8\CHF-chef\logs\rojo-1-sin-modulo.log`, `verde-8.log` |
| **R8 · CHEF-04** defecto «1 taza y media» (rojo → verde) | 7 ✘ → 0 ✘ | `rojo-2-y-media.log`, `verde-3-tras-y-media.log` |
| **R8 · CHEF-04** sabotaje (85 mutantes; el pedido: otro redondeo de g/ml) | 85/85 caen; el pedido tumba 8 comprobaciones; módulo restaurado con `git checkout --`, limpio | `mutantes-4.log` |
| **R8** re-medida `[M]` de 03a (dos modos) y de 01 sobre `c3f7f9a7` | las mismas 8 suites y los mismos pines; 1 435 → 1 525 / 1 443 planes; 01: solo D-CHEF-3 | `logs\simulacion\` |
| **R8** `tsc --noEmit` de la app (candado) · `escaneo-secretos` · `ci-workflow` | 0 errores · 0 secretos (2 071 archivos) · 41 ✔ | `tsc-app.log`, `escaneo-secretos-2.log`, `ci-workflow-2.log` |

**Reproducible con** `R7-Design\R-docs\herramientas\simula-chef.mjs <modo> <suite>` (parchea el módulo ya compilado **en memoria**, no escribe nada) y `barrido-simulado.sh`. **No se ha implementado nada de Chef**: ni `src`, ni `screens`, ni `constants`, ni pruebas nuevas; el prototipo de CHEF-01 vivió solo en una copia desechable fuera de todo worktree y no se conserva en el repositorio.
**No ejecutado:** `tsc --noEmit` de la app (no hay código nuevo); la cadena entera; emuladores; ningún proveedor real; ninguna calidad del modelo (UNKNOWN hasta un canary autorizado, CHEF-18).
