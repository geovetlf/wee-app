# Weë Design — las decisiones del dueño para cerrarlo

> **Estado: preparado para que lo responda el dueño. Este documento no toma ninguna decisión.**
> Ronda R7-Design (2026-10-11, noche), tarea D, sobre `a64ff24`. Lo único que escribe esta tarea es este archivo:
> no toca `DESIGN.md`, ni `WEE-DESIGN-UIUX-DECISIONS.md`, ni el código, ni las pruebas.

**Qué es.** La tabla de respuestas que desbloquea el cierre de Weë Design: once decisiones —D1 a D7 de
[DESIGN.md](DESIGN.md) §4 y DEC-01, DEC-02, DEC-05 y DEC-06 de [WEE-DESIGN-UIUX-DECISIONS.md](WEE-DESIGN-UIUX-DECISIONS.md) §2—
con su texto literal, sus opciones, lo que cada una cambia para la persona, los archivos y las cercas que tocaría, sus riesgos,
una recomendación técnica y su coste. Después, qué decisiones hacen falta de verdad para cerrar y cuáles son mejoras (§3), y la
pregunta de estructura visual que plantea el encargo, con sus alternativas (§4). Los anexos traen la evidencia ejecutada.

**Qué no es.** No es una auditoría nueva: usa el estado real de [WEE-DESIGN-CIERRE.md](WEE-DESIGN-CIERRE.md) y su corredor
(`node functions/test/_design-cierre.mjs`). No introduce ninguna estructura visual: la de «hero + herramientas plegadas + muro» no
existe hoy en Design (§4). Las **recomendaciones técnicas** son opiniones razonadas y rotuladas **[O]**: se pueden ignorar.

**Marcas de evidencia.** Cada afirmación sobre el código lleva `archivo:línea` de esta rama y una marca:
**[L]** leído, sin ejecutar · **[E]** ejecutado por mí en esta rama el 2026-10-11 (salidas en el Anexo B) · **[I]** inferido o
estimado (se dice cómo) · **[O]** opinión. Una afirmación sobre el código sin marca explícita es **[L]**.

**Escala de coste.** S = hasta un día de una persona con sus pruebas · M = de dos a cuatro días · L = una semana o más, o necesita
autorización (una cerca de integridad) o verificación con un proveedor. Es una estimación mía **[I]**; la única cifra que trae el
repositorio es la de P1 («1–2 días con su suite», `docs/WEE-DESIGN-CIERRE.md:148`). Ningún precio de Credits aparece aquí: los
calcula `creatorQuote` (CLAUDE.md §7).

---

## Cómo contestar (treinta segundos)

Copia el bloque y rellena letras. Las letras son las de los documentos fuente; DEC-06 no las trae y aquí son a, b y c. Un hueco sin
rellenar quiere decir «todavía no contesto». Una respuesta que sea «no ahora» también cuenta (§3.4).

```
DEC-01 = _     DEC-02 = _     DEC-05 = _     DEC-06 = _
D1 = _   D2 = _   D3 = _   D4 = _   D5 = _   D6 = _   D7 = _
Solo registro (hacen falta para CL-23): D8 = _   D9 = _
Estructura de la pantalla (§4) = _
```

Si prefieres contestar «las que recomienda el documento» o «las que recomienda este análisis [O]», están en la columna
correspondiente del índice de abajo, y resumidas aquí (son **recomendaciones, no respuestas**: ninguna está registrada):

```
Las que marca cada documento fuente [L]:  DEC-01 = B · DEC-02 = B · DEC-05 = A · DEC-06 = a · D1 = A · D2 = B · D3 = C · D4 = A
                                          D5 = A · D6 = A · D7 = A · D8 = «A ahora, B después» · D9 = «A + C»
Las de este análisis [O]:                 DEC-01 = B · DEC-02 = B (si DEC-01 no es A) · DEC-05 = A · DEC-06 = a · D1 = A · D2 = B
                                          D3 = C (en dos escalones) · D4 = A · D5 = A · D6 = A (C como parada) · D7 = A (condicionada)
                                          D8 y D9: sin análisis aquí (solo registro, §3.4) · Estructura (§4) = A
```

Para registrar una respuesta, quien coordina la escribe en la fila de la decisión con el formato del Anexo D; **esta tarea no escribe
ninguna**. D8 y D9 no tienen ficha: son solo registro (§3.4).

## Lo que conviene saber antes de contestar

1. **Registrar las trece respuestas (estas once más D8 y D9) cierra solo dos criterios del corredor: CL-05 y CL-23.** Los otros
   siete que hoy esperan al dueño (CL-01, 02, 09, 13, 14, 15 y 16) pasan de «espera una decisión» a «abierto»: dejan de esperarte y
   pasan a ser trabajo. Con las trece registradas el corredor da 6 cumplidos · 18 abiertos · 0 esperando decisión · 4 manuales
   (hoy: 4 · 11 · 9 · 4). **[E: simulación en memoria, Anexo B2]**
2. **Sin D8 y D9, CL-23 no se cumple** aunque contestes las once: pide trece de trece (`functions/test/_design-cierre.mjs:267-272`
   y `docs/WEE-DESIGN-CIERRE.md:278`). **[E]**
3. **Hay respuestas que dejan un criterio imposible de cumplir tal como está escrito**; entonces el criterio hay que reescribirlo o
   retirarlo, y eso no lo hace esta tarea: D2-A o D2-C con CL-02; D3-A con CL-13; D4-B con CL-15; D6-B o D6-C con CL-16 (§3.2).
4. **D4 y D5 están acopladas por el motor:** solo dos modelos de imagen de Weë escriben texto (los dos de Gemini) y la política de
   resolución solo tiene medidas verificadas para 1:1 en ellos; para un afiche con texto en vertical u horizontal no hay modelo con
   medida verificada. **[E]** (D5, Anexo B5)
5. **Qué archivo toca qué cerca de integridad** está medido (Anexo A): las plantillas, los prompts y las entradas del servidor de
   Design no mueven ninguna; `creator/index.ts` mueve F4; el motor de imagen mueve E4 y F1; los precios mueven F2; el contenido
   mueve F3. **[E]**
6. **Hogar & Diseño no tiene hoy ninguna puerta visible en toda la aplicación** (solo se llega escribiéndolo en Weë AI o en Weë
   Brain). **[E: búsqueda en `screens/`, `components/`, `utils/` y `navigation/`]**
7. **De las 35 formas de empezar que enseña la pantalla, el servidor entiende «qué es» sin preguntar 13 en español y 3 en
   inglés.** **[E]** (coincide con `docs/WEE-ACEPTACION.md:76`)
8. **Las once no cierran Design por sí solas:** quedan criterios de trabajo (CL-03, 04, 10–12, 17, 18, 20, 24, 25) y otros que
   necesitan al dueño por otro lado (CL-19 con H0 #6, CL-21, CL-22, y D8 y D9 para CL-23). Anexo C.

## 1. Índice: las once decisiones de un vistazo

«Doc.» es la opción que el documento fuente marca como «Recomendado» (no se ha aplicado). «Análisis» es mi recomendación **[O]**.

| Id | Pregunta (resumida) | Opciones | Doc. | Análisis [O] | Criterios que toca | Coste de la del análisis | Depende de |
|---|---|---|---|---|---|---|---|
| **D1** | ¿Qué es Weë Design? | A todo · B físico · C gráfico | A | A | CL-01, 05 | M | DEC-01 |
| **D2** | Entregables de la primera versión | A seis intenciones · B A + Hogar & Diseño · C logo, post y concepto | B | B | CL-01, 02 | S (sobre P1) | D1 |
| **D3** | Editar después de generar | A recrear · B editar la elegida con linaje · C frases editan, «Otra versión» recrea | C | C | CL-13 | M–L | (comparte con D6-B) |
| **D4** | Texto dentro de la imagen y nivel de logos | A logos y afiches con modelo que escribe · B nunca · C siempre que se escriba | A | A | CL-15 | S–M | D1, D5 |
| **D5** | Formatos | A 1:1, 4:5, 9:16, 16:9 · B A + impresión · C 1:1 y 9:16 | A | A | CL-14 | M | D4 |
| **D6** | Referencias que sube la persona | A inspiración · B base que se transforma · C ocultar | A | A (C como parada) | CL-09, 16 | M–L (C: S–M) | D1, D2 |
| **D7** | Puertas sin capacidad detrás | A llevarlas a lo que existe · B retirarlas · C esperar un proveedor 3D | A | A (condicionada) | CL-01, 05 | M | D1, D2, DEC-12 |
| **DEC-01** | ¿La referencia sustituye algún día a `DesignScreen`? | A nunca · B sí, tras la identidad · C sí, ya | B | B | CL-23 (re-basa todo si C) | 0 ahora | — |
| **DEC-02** | Con la puerta abierta, ¿por dónde se entra? | A solo por dirección · B acceso discreto en `DesignScreen` · C ☰ y barra lateral | B | B | CL-23 | S–M | DEC-01 |
| **DEC-05** | ¿Se oculta la barra global en el teléfono? | A no · B sí | A | A | CL-23 | 0 | DEC-01, DEC-02 |
| **DEC-06** | Destinos de exportación | a la lista de DEC-06a · b otra · c formatos visibles | a | a | CL-23 | 0 | DEC-01, DEC-20 |

Los números de las columnas «Doc.» y «Criterios» salen de `docs/DESIGN.md:63-69`, `docs/WEE-DESIGN-UIUX-DECISIONS.md:26-29` y del
«Mapa de decisiones» de `docs/WEE-DESIGN-CIERRE.md:266-269`, que coincide con los campos `decision` del corredor
(`functions/test/_design-cierre.mjs:76,87,112,146,182,192,202,214,268`). **[L]**

---

## 2. Las fichas

Cada ficha trae los ocho campos: **1** texto literal y contexto · **2** opciones · **3** qué habilita o bloquea · **4** impacto
visual y funcional, **5** archivos y contratos y **6** riesgos y pruebas, estos tres por opción · **7** recomendación técnica [O] ·
**8** coste y orden de dependencia. Las cercas de integridad se nombran como en el Anexo A (`puente-pre-f1d` F1–F4 y E4).

---

### D1 — ¿Qué es Weë Design?

**1 · Texto literal y contexto.**

> «¿Qué es Weë Design? Hoy se contradicen el menú (gráfico), la referencia visual (todo), la pantalla (físico) y la plantilla
> (gráfico + concepto).» — `docs/DESIGN.md:63`

Lo que dice hoy cada sitio **[L]**:

- **Menú de Weë AI** (gráfico): «Logos, posters, ilustraciones y material para tus redes» (`constants/weeExperiences.ts:76`;
  `i18n/textos/es/creator.ts:8`), con los ejemplos «Un logo para mi negocio», «Un post para Instagram» y «La portada de mi libro»
  (`creator.ts:19-21`); igual en `docs/CREATOR.md:123`.
- **Referencia visual y prompt maestro** (todo): «Diseña lo que imagines.» … «Desde un logo hasta un auto, un producto o un mundo
  completo.» (`i18n/textos/es/catalogo.ts:73-74`), catorce categorías con foto (`design/references/wee-design.jpg`) y
  `docs/CREATOR-BUILD.md:27`: «No se limita al diseño gráfico: "Diseña lo que imagines" — autos, helicópteros, … logos, identidad
  visual, posters…».
- **Pantalla montada** (físico): «Diseña sin límites.» «Espacios, productos, objetos y mucho más.» (`i18n/textos/es/design.ts:14-15`)
  y siete puertas físicas: Interiores, Arquitectura, Producto, Mobiliario, Vehículos, Renders y 3D, Espacios
  (`constants/designTools.ts:43-72`). Sus categorías «son puertas, no límites» (`designTools.ts:8-14`).
- **Plantilla del servidor** (mixto): seis intenciones —logo, afiche, producto, vehículo o máquina, lugar, personaje—
  (`functions/src/creator/templates.ts:354-361`), más la plantilla `home` (Hogar & Diseño), que `constants/weeWorkspaces.ts:77-78` ya
  coloca en el lugar de trabajo `design`.
- **Reglas que mandan:** «Muchas posibilidades por detrás. Una experiencia simple por delante.» (`CLAUDE.md:9`); las interfaces de
  Weë AI «no se rediseñan, no se simplifican ni se reemplazan» sin el dueño (`CLAUDE.md:78`).

**2 · Opciones.**

| | Opción (texto del documento) | Marca |
|---|---|---|
| A | Todo «lo que imagines» | **Recomendada del documento**, «con cada puerta llevada a una intención de la plantilla» |
| B | Solo lo físico y los espacios | La pantalla de hoy se parece a esta |
| C | Solo diseño gráfico | El menú de hoy se parece a esta |

El documento no marca ninguna como «mantener lo de hoy»: hoy conviven las tres (de ahí la contradicción).

**3 · Qué habilita o bloquea.** CL-01 (con D2 y D7) y CL-05 (con D7) (`functions/test/_design-cierre.mjs:76,112`;
`docs/WEE-DESIGN-CIERRE.md:266`). Propuesta P1, «Crear» llega a `CreatorFlow` (`WEE-DESIGN-CIERRE.md:129-148`). Fase F2 de
`docs/DESIGN.md:79`. El hueco `ACE-D-06` de `aceptacion-pantallas`, fijado como «BLOCKED — HUMAN DECISION» (`docs/WEE-ACEPTACION.md:113`).
**Efecto en el corredor [E]:** D1 sola no cambia ningún estado; CL-05 pasa a «cumplido» cuando D1 y D7 están registradas (su sonda
solo lee el registro, `_design-cierre.mjs:113`); CL-01 pasa a «abierto» con D1, D2 y D7. La respuesta **no cambia el código de P1**
(el mismo `navigate('CreatorFlow', …)`): cambia lo que promete cada puerta.

**4 · 5 · 6 · Por opción.**

**A — Todo.**
- *Qué ve y qué puede hacer la persona.* Las mismas siete puertas, pero cada punto de partida lleva a una intención de la plantilla
  (`presets`) en vez de limitarse a escribir una frase en la caja. Hoy el servidor solo deduce «qué es» de **13 de las 35** frases de
  partida en español y de **3 en inglés** **[E]** (por puerta, Anexo B3); el resto cae en la pregunta «Cuéntame qué necesitas y te
  propongo por dónde empezar» con seis opciones **sin «🤷 No sé»** (`templates.ts:354-361`; es CL-10, que arregla otra tarea). Logos,
  afiches y personajes no tienen puerta: se llega escribiéndolos en la caja «¿Qué quieres diseñar hoy?» (`design.ts:18`) o desde Weë
  AI. Queda una pregunta dentro de A: ¿se añaden puertas gráficas? (la referencia visual trae «Logos e identidad», «Afiches y
  publicidad» y «Personajes y criaturas»). Añadirlas rompe `design-cierre` A1: siete puertas, seis en portada
  (`functions/test/design-cierre.test.mjs:50-53`).
- *Archivos y contratos.* `constants/designTools.ts` (cada punto gana su intención), `screens/DesignScreen.tsx` (P1),
  `utils/contextoDeDesign.ts` (nuevo, extraído de `utils/designReferencia.ts:523`), `i18n/textos/*/design.ts` ×16 solo si cambian
  textos. Servidor: nada (la plantilla ya tiene las seis). **Cercas: ninguna.** **[E]** (Anexo A)
- *Riesgos y pruebas.* Suite nueva `puente-design.test.mjs` (molde de `puente-studio`), ajustar `cajas-weeai` 23
  (`WEE-DESIGN-CIERRE.md:140-141`), `aceptacion-pantallas` ACE-D-06 y `aceptacion-conversacion` (las 35 puertas); `foundation-de-experiencias`
  I17 sigue en verde si el contexto va inline (`WEE-DESIGN-CIERRE.md:138-139`). Sin emulador. Coste **M**.

**B — Solo lo físico y los espacios.**
- *Qué ve y qué puede hacer la persona.* Es lo que enseña la pantalla hoy. Los tres tipos gráficos dejan de ser lo que la pantalla
  ofrece, pero la plantilla los sigue sirviendo si se escriben o si llegan desde Weë AI o Weë Brain. La contradicción del menú
  («Logos, posters…») sigue en pie salvo que se cambien sus textos.
- *Archivos y contratos.* Para la pantalla, ninguno. Para ser coherente: `i18n/textos/*/creator.ts` (`design`, `designEx1-3`) ×16 y
  quizá `constants/weeExperiences.ts:76`. Cercas: ninguna.
- *Riesgos y pruebas.* Contradice el prompt maestro (`CREATOR-BUILD.md:27` incluye logos, identidad visual y posters). Deja sin puerta
  lo que la plantilla ya sabe hacer. Mismas pruebas de P1. Coste **S–M**.

**C — Solo diseño gráfico.**
- *Qué ve y qué puede hacer la persona.* Las siete puertas físicas se sustituyen por puertas gráficas; un yate, una silla o una casa
  dejan de tener puerta (siguen sirviéndose si se escriben). Cambia la cabecera («Diseña sin límites. Espacios, productos…»).
- *Archivos y contratos.* Todo el catálogo `constants/designTools.ts` y sus 49 claves de puertas y puntos
  (`i18n/textos/es/design.ts:29-79`) ×16; `design-cierre` A1–A5, `aceptacion-pantallas` ACE-D-03/20/24 y `aceptacion-conversacion`
  (las 35 puertas) hay que reescribirlas. Cercas: ninguna.
- *Riesgos y pruebas.* Es la que más reescribe y la que más choca con «no se rediseñan» (`CLAUDE.md:78`). Coste **L**.

**7 · Recomendación técnica [O].** **A**, como el documento. Razones: (1) es la única coherente con el prompt maestro y con la
referencia visual del propio dueño (`CREATOR-BUILD.md:27`); (2) el servidor ya sirve las seis intenciones con un solo motor de imagen
(`templates.ts:577-585`), así que A no pide trabajo de servidor; (3) las puertas ya son «puertas, no límites» (`designTools.ts:8-14`),
de modo que asociarles una intención no cambia lo que la pantalla promete. Matiz: dentro de A recomiendo **no** añadir puertas
gráficas en la primera versión (mantener «seis puertas, no un catálogo», `components/design/DesignExplore.tsx:19-28`). **Qué me haría
cambiar:** si logos y afiches van a vivir en Weë Business (entonces B más un traslado), o si el uso real mostrara que casi nadie pide
lo físico (se mediría con `creatorJobs` por `answers.what`; no lo medí).

**8 · Coste y orden.** **M** **[I]** (P1 «1–2 días con su suite», `WEE-DESIGN-CIERRE.md:148`, más la tabla puerta→intención). Se
contesta **junto con D2 y D7** y antes que D4–D6. Depende de DEC-01 solo en cuanto a «qué pantalla».

---

### D2 — Entregables de la primera versión

**1 · Texto literal y contexto.**

> «Entregables de la primera versión» — `docs/DESIGN.md:64`

- **Hogar & Diseño** (`home`) rediseña la foto de un espacio conservando paredes y ventanas (`image.space_restyle`), propone ideas,
  distribución y lista de compras (`templates.ts:1362-1516`). **No tiene ninguna puerta visible en toda la aplicación [E]:** el menú
  la oculta (`constants/weeExperiences.ts:199`, `HIDDEN_AS_SECTION`), su fila de `constants/specialists.ts:279` no se pinta porque
  `screens/SpecialistScreen.tsx:117` devuelve `DesignScreen` antes, y se declaró «dentro de Weë Design» (`weeExperiences.ts:392-398`).
  Lo único que navega a `experienceId: 'home'` es la referencia cerrada (`utils/designReferencia.ts:533`). Solo se llega
  describiéndolo en Weë AI o en Weë Brain.
- Hoy, de la pantalla de Design no sale ningún trabajo: «Crear» es un temporizador de 1,6 s (`screens/DesignScreen.tsx:27,102-113`).
- Weë Studio es el único lugar de trabajo que solo encamina (`WORKSPACES_QUE_ENCAMINAN = ['studio']`, `constants/weeWorkspaces.ts:112`):
  Design está pensado para crear él mismo, y `home` ya está dentro de su lugar de trabajo (`weeWorkspaces.ts:77-78`).

**2 · Opciones.**

| | Opción (texto del documento) | Marca |
|---|---|---|
| A | Las 6 intenciones de la plantilla | Lo que hace la plantilla `design` sin `home` |
| B | A + Hogar & Diseño con puerta propia | **Recomendada del documento** |
| C | Solo logo, post y concepto | — («concepto» no está definido en el documento; lo leo como la intención genérica de «No sé qué diseñar» **[I]**) |

Ninguna equivale a «mantener lo de hoy» (hoy la pantalla no crea).

**3 · Qué habilita o bloquea.** CL-01 (con D1 y D7; cualquier opción) y **CL-02 (solo B)**; la sonda de CL-02 busca el texto `'home'`
en `DesignScreen.tsx`, `designTools.ts` o `components/design/*` (`_design-cierre.mjs:85-93`). Propuestas P1 y **P2** (puerta a Hogar &
Diseño, `WEE-DESIGN-CIERRE.md:150-155`). Fase F2 (`DESIGN.md:79`). **Efecto [E]:** registrar D2 pasa CL-02 a «abierto» (D2 sola
basta, `_design-cierre.mjs:87`) y, junto con D1 y D7, CL-01.

**4 · 5 · 6 · Por opción.**

**A — Las 6 intenciones.**
- *Qué ve y qué puede hacer la persona.* «Crear» abre el flujo de Design con las seis intenciones; nadie puede transformar la foto de
  su espacio desde Design.
- *Archivos y contratos.* Los de P1 (D1). Cercas: ninguna.
- *Riesgos y pruebas.* **CL-02 no puede cumplirse tal como está escrito** («hay una puerta desde Design a Hogar & Diseño»): habría que
  reescribirlo o retirarlo. Única excepción: que D7-A lleve «Un antes y después» a `home`, porque la sonda solo busca el texto `'home'`;
  pero eso contradice D2-A, que deja Hogar & Diseño fuera de la primera versión. Coste: 0 sobre P1.

**B — A + Hogar & Diseño con puerta propia.**
- *Qué ve y qué puede hacer la persona.* Un renglón nuevo bajo las puertas, «Hogar & Diseño — Transforma y rediseña tu hogar o espacio
  a partir de una foto.» (`i18n/textos/es/catalogo.ts:96-97`), que abre `CreatorFlow` con `experienceId: 'home'`; `CreatorFlow`
  ya espera la foto antes de crear (`screens/CreatorFlowScreen.tsx:212,473`).
- *Archivos y contratos.* `components/design/DesignHogar.tsx` (nuevo, un renglón; lee título y subtítulo del catálogo con
  `useEspecialista('design')`, acción `home`: **sin claves nuevas**), `screens/DesignScreen.tsx`. Cercas: ninguna.
- *Riesgos y pruebas.* Dos comprobaciones nuevas en `puente-design`; `design-cierre` A1 cuenta las puertas del catálogo, y este renglón
  no lo es. Coste **S** sobre P1.

**C — Solo logo, post y concepto.**
- *Qué ve y qué puede hacer la persona.* Tres cosas en la primera versión. Las siete puertas físicas quedarían casi todas sin destino,
  así que C solo es coherente con D1-C.
- *Archivos y contratos.* El catálogo entero (como D1-C). Cercas: ninguna.
- *Riesgos y pruebas.* CL-02 imposible tal como está escrito (igual que A). Coste **M–L** (arrastra D1-C).

**7 · Recomendación técnica [O].** **B**, como el documento. Evidencia: Hogar & Diseño no tiene hoy puerta en ninguna parte **[E]**; el
registro de lugares de trabajo ya lo pone dentro de Design (`weeWorkspaces.ts:77-78`); P2 es un componente pequeño sin claves nuevas
(`WEE-DESIGN-CIERRE.md:152-155`). **Qué me haría cambiar:** que el dueño quiera que transformar la foto de un espacio viva en otra
parte (Weë Studio, por ejemplo): entonces A, y CL-02 se retira.

**8 · Coste y orden.** **S** sobre P1 **[I]**. Después de D1, junto con D7 (su «antes y después» necesita esta puerta).

---

### D3 — Editar después de generar

**1 · Texto literal y contexto.**

> «Editar después de generar» — `docs/DESIGN.md:65`

Lo que hay hoy **[L]**:

- Tras un resultado, `ResultCard` ofrece cuatro frases rápidas —«Hazlo más realista», «Cámbiale el color», «Más llamativo», «Más
  simple» (`i18n/textos/es/weeai.ts:86-89`; `components/creator/ResultCard.tsx:282,650`)— y «Crear otra versión» (`ResultCard.tsx:681`).
  Las dos abren un **trabajo nuevo** con el objetivo (más «· Cambio: …»), sin la propuesta elegida y sin las respuestas, salvo en Weë
  Travel (`screens/CreatorFlowScreen.tsx:335,352-357`). La tarjeta lo dice: «Cada cambio vuelve a crear ≈ N Credits. Se descuentan al
  terminar.» (`weeai.ts:200`; `ResultCard.tsx:620`).
- La **propuesta elegida existe** como estado de la tarjeta («✓ Elegida · Propuesta N», `ResultCard.tsx:235`, `weeai.ts:192`), pero
  `onEdit` y `onAnotherVersion` no la reciben (`ResultCard.tsx:172-173`).
- La caja para escribir el cambio a mano **se retiró por decisión del usuario el 2026-09-15** («los cambios se piden con las frases
  de arriba», `ResultCard.tsx:661-668`): una edición real, hoy, solo podría pedirse con esas cuatro frases.
- Un material nuevo no apunta a ninguno anterior: `materialesDeResultado` solo guarda la procedencia (`functions/src/creator/index.ts:500-550`);
  `previousVersionId` y `sourceAssetIds` no los escribe ningún camino (`docs/WEE-DESIGN-UIUX-AUDIT.md:179`); las funciones de linaje
  (`core/content/linaje.ts`) no tienen llamadores y «Guardar como versión» (`content/versiones.ts`) no se exporta
  (`versiones.ts:36-37`).
- `image.edit` ya recibe la foto de la persona (`functions/src/creator/inputs.ts:14-23`) y un resultado generado vive en la carpeta de
  la cuenta, que es lo que acepta `assertInputImageUrl` (`inputs.ts:36-49`). **[I]** Cómo manda el cliente esa dirección no lo comprobé.

**2 · Opciones.**

| | Opción (texto del documento) | Marca |
|---|---|---|
| A | Recrear desde cero | **Equivale a hoy** |
| B | Editar la propuesta elegida (`image.edit`, con linaje) | — |
| C | Las frases rápidas editan y «Otra versión» recrea | **Recomendada del documento** |

El documento no dice si C lleva linaje ni si «Otra versión» conserva las respuestas; CL-13 pide las dos cosas («Editar o pedir otra
versión conserva las respuestas y deja linaje», `docs/WEE-DESIGN-CIERRE.md:245`).

**3 · Qué habilita o bloquea.** **CL-13** (`_design-cierre.mjs:181-187`; `WEE-DESIGN-CIERRE.md:266`); hallazgo H-4
(`UIUX-AUDIT.md:222`); fase F4 (`DESIGN.md:81`); **ninguna de P1 a P10 la cubre** (CL-13 no tiene propuesta en
`WEE-DESIGN-CIERRE.md` §7); vecina DEC-18, «reintentos gratis», hoy A (`UIUX-DECISIONS.md:39`). **La sonda de
CL-13 es más débil que su título:** pasa en cuanto deja de estar escrito `CONSERVA_EL_CONTEXTO = experience.id === 'travel'`
(`_design-cierre.mjs:184`); no mide edición ni linaje **[L]**. **Efecto [E]:** registrar D3 pasa CL-13 a «abierto».

**4 · 5 · 6 · Por opción.**

**A — Recrear desde cero.**
- *Qué ve y qué puede hacer la persona.* Igual que hoy: cada cambio abre un trabajo, vuelve a crear las tres propuestas y se paga de
  nuevo, con el precio a la vista.
- *Archivos y contratos.* Ninguno. Cercas: ninguna.
- *Riesgos y pruebas.* **CL-13 no puede cumplirse tal como está escrito**: habría que reescribirlo o retirarlo. Coste 0 (más
  reescribir el criterio).

**B — Editar la propuesta elegida, con linaje.**
- *Qué ve y qué puede hacer la persona.* Elige una propuesta y pide un cambio: Weë edita **esa** imagen (una, no tres) y la nueva
  queda como versión de la elegida; el precio es el de una edición. «Otra versión» también parte de la elegida.
- *Archivos y contratos.* Cliente: `components/creator/ResultCard.tsx` y `screens/CreatorFlowScreen.tsx` (compartidas con las demás
  secciones: «la decide el dueño de `CreatorFlow`», `WEE-DESIGN-CIERRE.md:193`). Servidor: una rama de edición en
  `functions/src/creator/templates.ts` y `inputs.ts` (sin cerca), y el **linaje**, que obliga a tocar `functions/src/creator/index.ts`
  (**cerca F4**) o `functions/src/content/*` (**cerca F3**) **[E]**. `core/content/linaje.ts` también es F3.
- *Riesgos y pruebas.* No se reancla ninguna cerca: hace falta un diff y tu autorización. Pantalla compartida. El linaje no tendría
  quién lo lea (la franja «Versiones» de la referencia está apagada, `docs/WEE-DESIGN-FLOWS.md:130,162`). Pruebas: `creator.test.mjs`,
  `stepInputFor`, reembolso, suite de emulador de P10 (PESADA), `puente-pre-f1d`. Coste **L**.

**C — Las frases rápidas editan; «Otra versión» recrea.**
- *Qué ve y qué puede hacer la persona.* Las cuatro frases cambian la propuesta elegida con una edición (una imagen) en lugar de
  rehacer las tres; «Crear otra versión» sigue recreando.
- *Archivos y contratos.* Como B, pero con dos escalones **[I]**: (1) edición con las frases y respuestas conservadas, que solo
  toca `ResultCard.tsx` (para que `onEdit` reciba la elegida), `CreatorFlowScreen.tsx` y la plantilla/entradas del servidor:
  **ninguna cerca**; (2) linaje, que vuelve a ser F4 o F3.
- *Riesgos y pruebas.* Las de B para el escalón 2. Coste **M** el escalón 1, **L** con linaje.

**7 · Recomendación técnica [O].** **C**, como el documento, **en dos escalones**: primero la edición con las frases (sin cercas),
después el linaje con tu autorización para tocar F4. Dentro de la respuesta hay una pregunta que solo tú puedes contestar: *¿CL-13 se
cierra con linaje (hay que autorizar la cerca) o sin él (se reescribe su texto)?* **Qué me haría cambiar:** si no quieres pagar
ediciones (DEC-18 sigue en A: cada cambio se cobra) o prefieres no tocar `CreatorFlow` (pantalla compartida): entonces A y reescribir
CL-13.

**8 · Coste y orden.** **M–L** **[I]**. Independiente de D1; **comparte la maquinaria de «material como entrada» con D6-B**. Se
puede contestar después del bloque D1–D2–D7.

---

### D4 — Texto dentro de la imagen, y el nivel de los logos

**1 · Texto literal y contexto.**

> «Texto dentro de la imagen, y el nivel de los logos» — `docs/DESIGN.md:66`

- Los **logos ya piden texto legible:** su paso de imagen lleva `kind: 'logo'` (`functions/src/creator/templates.ts:582`), que está en
  `TEXT_KINDS` (`functions/src/engine/imageModels.ts:208`): modelo que escribe texto y nivel **«alto»** **[E]** (Anexo B4). O sea,
  «logos en el nivel alto» **ya es lo de hoy**.
- Los **afiches no:** su paso lleva `kind: 'design'` (`templates.ts:582`), que no escribe texto y va al nivel «estándar» **[E]**;
  y sin embargo el prompt interno le dice «No text or watermarks unless the design itself is a logo or poster with the requested
  words» (`functions/src/creator/prompts.ts:699`). El modelo y la instrucción no se corresponden.
- Solo **dos** modelos de Weë escriben texto, los dos de Gemini (`imageModels.ts:165-171,193-199`); FLUX y Seedream no
  (`rendersText: false`) **[E]**.
- Vecina: D9 pide «revisión legal antes de anunciar logos» (`DESIGN.md:71`).

**2 · Opciones.**

| | Opción (texto del documento) | Marca |
|---|---|---|
| A | Solo logos y afiches, con un modelo que escriba texto (el afiche se cotiza más caro) | **Recomendada del documento**, «logos en el nivel alto» |
| B | Nunca | — |
| C | Siempre que se escriba | — |

«Hoy» es A **sin la parte de los afiches**: los logos escriben texto, los afiches no.

**3 · Qué habilita o bloquea.** **CL-15** (`_design-cierre.mjs:201-211`; `WEE-DESIGN-CIERRE.md:247,266`); propuesta P8
(`WEE-DESIGN-CIERRE.md:203-208`); fase F3 (`DESIGN.md:80`). La sonda construye un afiche (qué=afiche, mensaje=promoción, dónde=feed) y
exige `imageRequirements(...).text === true`; hoy da `false` **[E]**. Pasa con A o con C; **con B no puede pasar**. **Efecto [E]:**
registrar D4 pasa CL-15 a «abierto». Acoplada con D5 (ver abajo).

**4 · 5 · 6 · Por opción.**

**A — Logos y afiches con un modelo que escriba texto.**
- *Qué ve y qué puede hacer la persona.* El afiche sale con el texto escrito con mucha más probabilidad; antes de crear, el plan enseña
  un total **más alto** (el paso de imagen pasa del nivel «estándar» al «alto» **[E]**). Los logos no cambian **[E]**. El importe lo
  calcula `creatorQuote` con la tarifa oficial del modelo elegido: no se copia aquí (CLAUDE.md §7).
- *Archivos y contratos.* `functions/src/creator/templates.ts:582` (el `kind` del afiche pasa a `poster`, que ya está en
  `TEXT_KINDS`), `functions/src/creator/prompts.ts:553-570` (`IMAGE_TASK_EN` no trae `poster`; una línea opcional), `creator.test.mjs`
  (los `kind` del plan, `WEE-DESIGN-CIERRE.md:207`). **Cercas: ninguna** **[E]**. No hace falta tocar `engine/imageModels.ts` (movería
  E4 y F1) ni los precios (moverían F2): el precio sale de la tarifa del modelo elegido.
- *Riesgos y pruebas.* El afiche cuesta más (decisión de producto, ya anunciada en el texto de la opción). Y **D5**: un afiche con texto
  en vertical o en horizontal no tiene medida verificada hoy (ver D5). Pruebas: `creator.test.mjs`, `techo-de-propuestas`,
  `credits-weeai`, `puente-pre-f1d` (sigue 42/42 **[E]** con un cambio mínimo en `templates.ts`/`prompts.ts`). Coste **S–M**.

**B — Nunca.**
- *Qué ve y qué puede hacer la persona.* Ningún texto dentro de la imagen, tampoco en los logos: dejarían de escribir el nombre de la
  marca que la propia plantilla pregunta («¿Qué nombre o texto quieres que aparezca?», `templates.ts:364`). Es un retroceso respecto de
  hoy.
- *Archivos y contratos.* Sacar `logo` de `TEXT_KINDS` (`imageModels.ts:208`: **mueve E4 y F1** **[E]**) y quitar la pregunta `name` de la
  plantilla.
- *Riesgos y pruebas.* **CL-15 no puede cumplirse tal como está escrito.** Contradice la plantilla. Coste S de código, M de producto.

**C — Siempre que se escriba.**
- *Qué ve y qué puede hacer la persona.* Cualquier pieza en la que la persona pida un texto lo lleva (un cartel de producto, una portada
  de personaje…); más piezas en el nivel alto, más caras, y con un precio menos predecible.
- *Archivos y contratos.* Detectar «hay texto pedido» en la plantilla o en el planificador (`templates.ts`; si fuera con el
  planificador de IA, `creator/planner.ts` **mueve F1** **[E]**); posiblemente `creator/index.ts` (**F4**) si el `kind` se decide al
  ejecutar.
- *Riesgos y pruebas.* Falsos positivos y negativos (el deductor de la plantilla es de palabras clave en español: 13 de 35 frases de
  partida entendidas, Anexo B3). Coste **M**.

**7 · Recomendación técnica [O].** **A**, como el documento. Es el único cambio pequeño que cierra CL-15, no toca ninguna cerca y
alinea el modelo con lo que el prompt ya pide. **Matiz importante:** si no quieres que el afiche suba de precio, la respuesta honesta
es «A solo para logos» (que es lo de hoy); no es ninguna de las tres letras y CL-15 tendría que reescribirse. **Qué me haría cambiar:**
medir con `creatorQuote` (modo real) que el afiche en nivel alto resulta inaceptable; o que D5 obligue a verificar Gemini antes de
prometer texto en formatos no cuadrados.

**8 · Coste y orden.** **S–M** **[I]**. Depende de D1 (con D1-B los afiches pierden peso) y está **acoplada a D5**; se decide junto
con D5. D9 (legal de los logos) es independiente.

---

### D5 — Formatos

**1 · Texto literal y contexto.**

> «Formatos» — `docs/DESIGN.md:67`

- La hoja de ajustes de Design ya tiene un grupo «Formato»: Automático · Cuadrado · Vertical · Horizontal (`constants/designTools.ts:108-111`;
  `i18n/textos/es/studio.ts:50-53`), pero lo elegido **no viaja a ninguna parte** (`screens/DesignScreen.tsx:85,271-280`).
- La pregunta del afiche, «¿Dónde vas a publicarlo?», ofrece Instagram o Facebook · Una historia · WhatsApp · Para imprimir · No sé
  (`templates.ts:381-387`) y solo añade una frase al encargo —«en vertical, para una historia», «en formato A4, listo para imprimir»—
  (`templates.ts:297-302`). **Ningún paso de imagen lleva `aspectRatio`** **[E]** (las ocho ramas, Anexo B4), aunque `creatorRun` ya lo
  lee (`functions/src/creator/index.ts:721`) y el precio lo recibe (`functions/src/credits/aiPricing.ts:371`).
- La política de resolución nombra siete proporciones —1:1, 16:9, 9:16, 4:3, 3:4, 2:3, 3:2—: **no 4:5** (`functions/src/engine/resolutionPolicy.ts:132-140`),
  y «A4» no es una proporción que entienda (`ratioOf`, `:180-190`) **[L]**.
- **[E]** FLUX y Seedream resuelven medidas para 1:1, 4:5, 9:16, 16:9 y 3:4. Los dos modelos de Gemini, **que son los únicos que
  escriben texto**, solo tienen medidas declaradas para 1:1 y la política contesta «no puedo» (`null`) a cualquier otra proporción:
  «Proporciones distintas de 1:1 sin verificar en la documentación oficial» (`resolutionPolicy.ts:97-124`). El adaptador de Gemini sí
  envía `aspectRatio` si llega (`functions/src/engine/providers/gemini.ts:374`), pero esa medida no está verificada. **UNKNOWN:** si
  Gemini devuelve exactamente la proporción pedida (no se llamó a ningún proveedor).
- Hallazgo F-06 (`WEE-DESIGN-CIERRE.md:118`): al ofrecer proporciones hay que pasar las medidas reales al precio
  (`imageModels.ts:345-352`) para los modelos que cobran por megapíxel (FLUX); Gemini cobra por imagen y tamaño, no por megapíxel.

**2 · Opciones.**

| | Opción (texto del documento) | Marca |
|---|---|---|
| A | 1:1, 4:5, 9:16 y 16:9 | **Recomendada del documento** |
| B | A + impresión | — |
| C | Solo 1:1 y 9:16 | — |

Ninguna equivale a hoy (hoy toda imagen sale 1:1).

**3 · Qué habilita o bloquea.** **CL-14** (`_design-cierre.mjs:191-199`; `WEE-DESIGN-CIERRE.md:246,266`); propuesta P7
(`WEE-DESIGN-CIERRE.md:196-201`); fase F5 (`DESIGN.md:82`); el hueco `ACE-D-06b`, «un afiche para una historia se crea en vertical»,
de `aceptacion-conversacion` **[E]**. **Matiz de proceso:** `DESIGN.md` §5 pone el 9:16 de «historia» en F1 «sin alcance» (`:78`) y D5
en F5; el corredor liga CL-14 entera a D5. La sonda solo mira que el paso de «historia» lleve un `aspectRatio` en texto: **las tres
opciones la cumplen**. Y como el corredor da «cumplido» cuando la sonda pasa, aunque D5 no esté registrada (`_design-cierre.mjs:330`),
F1 puede hacerse antes de contestar. **Efecto [E]:** registrar D5 pasa CL-14 a «abierto».

**4 · 5 · 6 · Por opción.**

**A — 1:1, 4:5, 9:16 y 16:9.**
- *Qué ve y qué puede hacer la persona.* Elige «Cuadrado», «Vertical» u «Horizontal» en los ajustes (o contesta la pregunta del afiche)
  y las tres propuestas salen en esa proporción en vez de siempre cuadradas. «4:5» no tiene palabra en la hoja: «Vertical» tendría que
  decir 4:5 o 9:16, o ganar una palabra nueva ×16.
- *Archivos y contratos.* `functions/src/creator/templates.ts` (cada rama devuelve `aspectRatio`), `screens/DesignScreen.tsx`
  (los ajustes viajan), `i18n/textos/*/design.ts` o `studio.ts` si hay palabra nueva. La etiqueta `4:5` en
  `engine/resolutionPolicy.ts` (opcional: `ratioOf` ya entiende cualquier «a:b») y las medidas verificadas de Gemini exigirían tocar
  `resolutionPolicy.ts`: **mueve E4 y F1** **[E]**.
- *Riesgos y pruebas.* Verificar las proporciones de Gemini con la documentación del proveedor (sin llamar a nadie); `creator.test.mjs`,
  `techo-de-propuestas`, la comprobación del precio (F-06), suite de P10. Coste **M**.

**B — A + impresión.**
- *Qué ve y qué puede hacer la persona.* «Para imprimir» da un formato de papel. Hoy no hay proporción de A4 ni resolución de impresión:
  el objetivo «alta» son 3 MP (`resolutionPolicy.ts:39-42`) y un A4 a 300 ppp son unos 8,3 MP **[I: 2480×3508 px, cálculo mío]**.
- *Archivos y contratos.* Los de A más la política de resolución (**E4 y F1**) y, si cambia el servicio de precio, `aiPricing.ts`
  (**F2**).
- *Riesgos y pruebas.* Es la opción con más incógnitas. Coste **M–L**.

**C — Solo 1:1 y 9:16.**
- *Qué ve y qué puede hacer la persona.* Cuadrado y vertical de historia (lo que el afiche ya nombra como «Instagram o Facebook» e
  «Una historia»). «Horizontal» de la hoja de ajustes seguiría sin llegar al motor, salvo que se quite del catálogo
  (`designTools.ts:110`).
- *Archivos y contratos.* `templates.ts`; ninguna etiqueta nueva (1:1 y 9:16 ya están en `ASPECT_LABELS`). **Cercas: ninguna** **[L]**.
- *Riesgos y pruebas.* Un afiche con texto en 9:16 sigue dependiendo de Gemini sin medida verificada. Coste **S–M**.

**7 · Recomendación técnica [O].** **A**, como el documento, **entrando por tres de las cuatro:** 1:1, 9:16 y 16:9 son justo lo que la
hoja ya llama Cuadrado, Vertical y Horizontal y están en `ASPECT_LABELS`; 4:5 es la única que pide palabra y proporción nuevas. Con
D4-A, antes de prometer texto en vertical u horizontal hay que **verificar con el proveedor** las proporciones de Gemini. **Qué me
haría cambiar:** que el proveedor no confirme proporciones distintas de 1:1 para el modelo que escribe texto (entonces C solo para
piezas sin texto) o que el dueño quiera impresión ya (B, con su política de resolución).

**8 · Coste y orden.** **M** **[I]**. Depende de D4 (las dos se contestan juntas) y de D1. Si se toca la política de resolución hace
falta autorización para las cercas E4 y F1.

---

### D6 — Referencias que sube la persona

**1 · Texto literal y contexto.**

> «Referencias que sube la persona» — `docs/DESIGN.md:68`

- Los botones «Añadir» y «Referencia» llaman a la **misma** función, que añade un nombre de muestra `referencia-N.png` sin selector de
  archivos (`screens/DesignScreen.tsx:122-131`; `i18n/textos/es/studio.ts:19`). La ficha se puede quitar (CL-08, ya hecho), pero **nada
  viaja**: lo adjuntado no sale de la pantalla (`DesignScreen.tsx:86`). «Dictar» ya dice «Próximamente» (`:213`).
- Aunque viajara una foto, el servidor la ignoraría: `IMAGE_INPUT_CAPS` no incluye `image.generate` ni `image.reference` **[E]**
  (`functions/src/creator/inputs.ts:14-23`), y `CreatorFlow` enseñaría «Foto lista» igualmente (F-07, `WEE-DESIGN-CIERRE.md:119`).
- `image.reference` existe y es enrutable: cadena gemini → flux → seedream (`functions/src/engine/registry.ts:96`), con los tres
  adaptadores (`providers/gemini.ts:123`, `flux.ts:78`, `seedream.ts:34`), y se cobra por la familia de imagen
  (`functions/src/credits/creditCosts.ts:189-193`).
- Weë Studio ya tiene el selector real: guarda un `Adjunto { clase: 'referencia' }` y manda `adjuntos` e `imageUri`
  (`screens/StudioScreen.tsx:249-285,340-350`).
- Un trabajo cuyo plan tenga un paso que trabaje sobre foto no arranca sin ella (`functions/src/creator/index.ts:119-123`): el plan solo
  puede llevar un paso `image.reference` si hay referencia, y hoy `buildPlan(goal, answers)` no ve la foto (`WEE-DESIGN-CIERRE.md:170-171`).
- La observación `ACE-D-05` de `aceptacion-pantallas` deja constancia de los nombres de muestra (`docs/WEE-ACEPTACION.md:112`).

**2 · Opciones.**

| | Opción (texto del documento) | Marca |
|---|---|---|
| A | Inspiración de estilo (`image.reference`) | **Recomendada del documento** |
| B | Una base que se transforma | — |
| C | Ocultar el botón hasta decidir | La más cercana a «dejar de fingir» (hoy no hay nada real) |

**3 · Qué habilita o bloquea.** **CL-09** (`_design-cierre.mjs:145-151`): pasa cuando desaparece de la pantalla el texto
`` `referencia-${ ``, o sea con **cualquiera de las tres**. **CL-16** (`:213-221`): pasa solo si `IMAGE_INPUT_CAPS` incluye
`image.reference` o `image.generate`, o sea **solo con A** (B usaría `image.edit`, que ya estaba; C no usa nada). Propuesta P4
(`WEE-DESIGN-CIERRE.md:165-173`); fase F4 (`DESIGN.md:81`). **Efecto [E]:** registrar D6 pasa CL-09 y CL-16 a «abiertos».

**4 · 5 · 6 · Por opción.**

**A — Inspiración de estilo.**
- *Qué ve y qué puede hacer la persona.* «Referencia» abre la galería, la foto aparece como ficha con aspa y el diseño se **inspira** en
  ella (estilo, no se copia). `CreatorFlow` cotiza con la referencia puesta.
- *Archivos y contratos.* Cliente: `DesignScreen.tsx` (el selector de `StudioScreen.tsx:340-350`, `adjuntos` e `imageUri`). Servidor:
  `functions/src/creator/inputs.ts` (`IMAGE_INPUT_CAPS` gana `image.reference`; `stepInputFor` solo inyecta la foto en los pasos cuya
  capacidad está en esa lista, `inputs.ts:113`; **ninguna plantilla ni pipeline actual usa `image.reference`** **[E]**,
  `pipelines/drama.ts` no tiene importadores) y `templates.ts` (un paso `image.reference` solo si hay referencia). Los tres adaptadores
  ya leen la foto de entrada (`providers/gemini.ts:216-219,361`, `flux.ts:136-138`, `seedream.ts:159-164`) **[L]**. El precio sale de
  `aiPricing` (los modelos por megapíxel facturan también la imagen de entrada). **Cercas: ninguna** **[E]** en `inputs.ts` y
  `templates.ts`; si el precio exigiera tocar `aiPricing.ts` o `creditCosts.ts` se movería F2.
- *Riesgos y pruebas.* Una referencia puede contener rostros: la vecina DEC-24 (personas reales y proveedores, `UIUX-DECISIONS.md:44`)
  pide revisión legal. **UNKNOWN:** la instrucción interna de `image.reference` en el adaptador de Gemini habla de «crear una imagen de
  referencia coherente para reutilizar» (`providers/gemini.ts:243`), no de «inspirarse en una foto»: puede hacer falta una frase propia
  en `creator/prompts.ts` (sin cerca) y comprobar cómo responde el modelo (no se llamó a ningún proveedor). Pruebas:
  `creator.test.mjs` (plan con referencia), `stepInputFor`, `puente-design`, `cajas-weeai`, suite de P10 (emulador). Coste **M–L**.

**B — Una base que se transforma.**
- *Qué ve y qué puede hacer la persona.* La foto o el boceto es la base y se transforma (es «Transformar», no «inspirar»). Para un
  espacio ya existe Hogar & Diseño (`home`).
- *Archivos y contratos.* Una rama nueva en `templates.ts` con `image.edit` (ya recibe foto) y el mismo «material como entrada» que D3.
  Cercas: ninguna en `templates.ts`/`inputs.ts`.
- *Riesgos y pruebas.* **CL-16 no puede cumplirse tal como está escrito** (la sonda no reconoce `image.edit`). La única forma de que
  la sonda pasara sería añadir `image.generate` a `IMAGE_INPUT_CAPS`, y entonces **todo plan de Design exigiría una foto** para
  arrancar (`exigirFotoSiHaceFalta`, `functions/src/creator/index.ts:119-123`): no lo recomiendo. Coste **M–L**.

**C — Ocultar el botón hasta decidir.**
- *Qué ve y qué puede hacer la persona.* Desaparecen «Añadir» y «Referencia» de la caja (quedan «Ajustes» y «Dictar»): ya no hay
  referencia de mentira.
- *Archivos y contratos.* `components/studio/StudioPromptComposer.tsx` (props opcionales; **componente compartido con Studio**, P5,
  `WEE-DESIGN-CIERRE.md:175-182`) y `DesignScreen.tsx`. Cercas: ninguna.
- *Riesgos y pruebas.* Studio debe seguir pasándolas; `design-cierre` B3 y B4 han de aceptar «sin referencias». **CL-16 no puede
  cumplirse** (no hay referencia que usar). Coste **S–M**.

**7 · Recomendación técnica [O].** **A**, como el documento. `image.reference` ya existe y no pide ninguna cerca; el trabajo es
cliente y plan. **C es una buena parada** si hay prisa: es una pura adición hacia A (no hay que deshacer nada) y cierra CL-09 ya.
**Qué me haría cambiar:** no querer imágenes de personas en el flujo hasta resolver DEC-24 (C), o querer que el «Transformar» de
Design sea la prioridad (B).

**8 · Coste y orden.** **M–L**; C, **S–M** **[I]**. Después de D1 y D2 (qué intenciones aceptan referencia; `home` ya recibe foto);
**comparte maquinaria con D3** (material como entrada).

---

### D7 — Puertas sin capacidad detrás

**1 · Texto literal y contexto.**

> «Puertas sin capacidad detrás (maqueta 3D, recorrido, antes/después)» — `docs/DESIGN.md:69`

- La puerta «Renders y 3D» («Visualiza tus ideas en alto realismo.», `design.ts:41-42`) trae cinco puntos de partida: «Un render
  realista», «Una maqueta 3D», «Una vista aérea», «Un recorrido» y «Un antes y después» (`constants/designTools.ts:64-67`;
  `design.ts:75-79`). Solo escriben una frase en la caja (`screens/DesignScreen.tsx:116-120`).
- Detrás hay solo imagen. El catálogo del Core declara `3d.*` y `render.*` sin cadena, sin adaptador y sin precio
  (`docs/WEE-DESIGN-UIUX-AUDIT.md:114,126-128`): «Una maqueta 3D» y «Un recorrido» prometen lo que nadie sirve; «Un render realista»
  y «Una vista aérea» salen como imágenes; «Un antes y después» solo existe dentro de Hogar & Diseño (necesita la foto del espacio).
- **[E]** Ninguno de los cinco puntos de «Renders y 3D» deduce hoy una intención (0 de 5, Anexo B3).
- Weë Studio no genera, encamina (`constants/weeWorkspaces.ts:112`); ir de Design a Studio para un vídeo es **DEC-12**, que no está
  entre las once (`UIUX-DECISIONS.md:35`).

**2 · Opciones.**

| | Opción (texto del documento) | Marca |
|---|---|---|
| A | Llevarlas a lo que existe (Studio, Hogar & Diseño, imagen) | **Recomendada del documento** |
| B | Retirarlas | — |
| C | Esperar a un proveedor 3D | **Equivale a hoy** |

**3 · Qué habilita o bloquea.** **CL-05** (`_design-cierre.mjs:111-114`) y **CL-01** (con D1 y D2). **Un criterio, dos lecturas:** la
sonda de CL-05 solo lee que D1 y D7 estén registradas (cualquier respuesta la cierra), pero su título dice «Las puertas prometen lo
que el motor hace hoy»; con C se registra y las puertas siguen prometiendo lo que no hay. Propuesta P1 y fase F2. **Efecto [E]:**
D1 + D2 + D7 → CL-05 «cumplido» y CL-01 y CL-02 «abiertos».

**4 · 5 · 6 · Por opción.**

**A — Llevarlas a lo que existe.**
- *Qué ve y qué puede hacer la persona.* «Un antes y después» lleva a Hogar & Diseño (pide la foto de su espacio); «Un recorrido» lleva
  a Weë Studio con lo escrito (si DEC-12 = A); «Una maqueta 3D» se dice como lo que es (una imagen) o se renombra; «Un render realista»
  y «Una vista aérea» siguen escribiéndose y salen como imagen.
- *Archivos y contratos.* `constants/designTools.ts` (cada punto con su destino), `components/design/DesignPanel.tsx` y
  `screens/DesignScreen.tsx` (hoy elegir un punto solo escribe texto, `DesignScreen.tsx:116-120`: un punto que navega es comportamiento
  nuevo), `i18n/textos/*/design.ts` (`reModel`, `rendersTitle`, `reWalkthrough`…) ×16. Cercas: ninguna.
- *Riesgos y pruebas.* Depende de D2-B (Hogar) y de DEC-12 (Studio). `design-cierre` A1/A2, `aceptacion-pantallas` ACE-D-03 y
  `aceptacion-conversacion` (las 35 puertas), `puente-design`. Coste **M**.

**B — Retirarlas.**
- *Qué ve y qué puede hacer la persona.* Desaparecen los puntos sin capacidad. `design-cierre` A1 exige entre tres y seis puntos por
  puerta y siete puertas con seis en portada (`design-cierre.test.mjs:50-53`): quitar tres de los cinco puntos de «Renders y 3D»
  deja dos, así que habría que quitar la puerta entera (seis puertas, cinco en portada) y cambiar A1. Se pierden «Un render realista» y
  «Una vista aérea», que sí funcionan como imagen.
- *Archivos y contratos.* `designTools.ts`, `design-cierre` A1, `aceptacion-*`. Cercas: ninguna.
- *Riesgos y pruebas.* Es la opción que más deja claro lo que Design hace hoy. Coste **S–M**.

**C — Esperar a un proveedor 3D.**
- *Qué ve y qué puede hacer la persona.* Nada cambia: «Una maqueta 3D» sigue en pantalla y, si se escribe, el servidor la trata como
  texto sin intención (pregunta de seis opciones sin «No sé»).
- *Archivos y contratos.* Ninguno. Cercas: ninguna.
- *Riesgos y pruebas.* Lo que afirma CL-05 sigue sin ser verdad. Coste 0.

**7 · Recomendación técnica [O].** **A, condicionada:** «Un antes y después» a Hogar & Diseño solo si D2 = B; «Un recorrido» a Studio
solo si DEC-12 = A; si no, B para esos dos puntos. «Una maqueta 3D» se renombra o se retira en cualquier caso mientras no haya 3D. C no
la recomiendo salvo que se oculten esos tres puntos (que es B). **Qué me haría cambiar:** la aparición de un proveedor 3D elegible (hoy
ninguna capacidad 3D está aprobada, `UIUX-DECISIONS.md:52`).

**8 · Coste y orden.** **M** **[I]**. Después de D1 y D2; DEC-12 es vecina.

---

### DEC-01 — ¿La referencia funcional sustituye algún día a `DesignScreen`?

**1 · Texto literal y contexto.**

> «¿La referencia funcional sustituye algún día a `DesignScreen`? (CLAUDE.md §5: las interfaces de Weë AI no se rediseñan sin el dueño)»
> — `docs/WEE-DESIGN-UIUX-DECISIONS.md:26`

- La «referencia funcional» (`screens/DesignReferenciaScreen.tsx`, `components/designReferencia/*`) es un **espacio de trabajo**:
  barra de comandos de ocho verbos (Crear, Transformar, Editar, Materiales, Animar, Escena, Imprimir, Entregar), biblioteca
  (Creaciones, Proyecto, Escena, Referencias), lienzo, inspector, franja de trabajos y la caja anclada con la intención Crear,
  Transformar o Editar (`docs/WEE-DESIGN-WORKSPACE-ARCHITECTURE.md:35-46`); en el teléfono, cuatro superficies (`:55-64`). Su marco es
  `CreatorShell` (`DesignReferenciaScreen.tsx:73,434`).
- Está **detrás de una puerta cerrada:** `DESIGN_REFERENCIA_EN_LA_APP = false` (`constants/designReferencia.ts:40`), sin enlace
  (`App.tsx:239`), sin entrada en ningún menú, y `DesignScreen` ni la nombra (`functions/test/design-referencia.mjs:312-313`).
- **Conecta de verdad** «Crear» y «Transformar» con `CreatorFlow` (`DesignReferenciaScreen.tsx:268-269`; `contextoDeDesign`,
  `utils/designReferencia.ts:523-545`), las creaciones de la cuenta, los proyectos, los trabajos, el saldo, descargar, publicar una
  imagen, guardar en un proyecto y los derechos visibles (`WORKSPACE-ARCHITECTURE.md:120-122`).
- **[E]** Su registro tiene 107 capacidades: 94 son de Weë Design y 13 están marcadas «fuera». De las 94, **12 funcionan**, **7 son
  parciales** y **75 se ven apagadas con su motivo** (11 piden servidor, 21 proveedor, 23 son candidatas nuevas, 10 están en revisión y
  10 planeadas; Anexo B6). Es decir, el 80 % de sus capacidades está apagado.
- Es «funcional y provisional»: lleva el sello «Referencia funcional» y estética neutra, y la misión de **identidad visual** es otra que
  «NO empieza ahora» (`UIUX-DECISIONS.md:78-82`). `docs/WEE-DESIGN-CIERRE.md:289-290` deja «abrir la puerta de la referencia o sustituir
  la pantalla (DEC-01)» **fuera** de «terminado».

**2 · Opciones.**

| | Opción (texto del documento) | Marca |
|---|---|---|
| A | Nunca: conviven | **Equivale a hoy** (conviven, con la puerta cerrada) |
| B | Sí, después de la misión de identidad | **Recomendada del documento** |
| C | Sí, ya | — |

**3 · Qué habilita o bloquea.** Solo CL-23 (registro), y ninguna propuesta P1 a P10 ni fase de `DESIGN.md` §5 depende de ella: el
«Mapa de decisiones» dice «DEC-01, 02, 05 y 06 → solo si se promueve la referencia a pantalla montada» (`WEE-DESIGN-CIERRE.md:266-269`). **Pero es la compuerta de todas las demás:** con A o B, D1–D7 hablan
de `DesignScreen`; con C, los criterios CL-01 a CL-05, CL-09, CL-24 y CL-26 apuntan a una pantalla que dejaría de montarse y habría
que re-basarlos. **Efecto [E]:** DEC-01 sola no cambia ningún estado del corredor.

**4 · 5 · 6 · Por opción.**

**A — Nunca: conviven.**
- *Qué ve y qué puede hacer la persona.* Nada cambia, ni ahora ni después: la pantalla de siempre; la referencia sigue cerrada o sirve
  de espacio aparte (según DEC-02).
- *Archivos y contratos.* Ninguno. Cercas: ninguna.
- *Riesgos y pruebas.* Se renuncia a un único espacio de trabajo; se puede reabrir cambiando la respuesta. Coste 0.

**B — Sí, después de la misión de identidad.**
- *Qué ve y qué puede hacer la persona.* Nada cambia ahora. Queda escrito que, cuando exista la identidad visual, el espacio de trabajo
  sustituye a la pantalla.
- *Archivos y contratos.* Ninguno ahora. Después: ver C más la identidad (lenguaje visual, paneles, iconografía, responsive,
  accesibilidad; `UIUX-DECISIONS.md:80-82`) y la revisión nativa de los textos de los 14 idiomas que hoy no la tienen
  (`UIUX-DECISIONS.md:71-72`).
- *Riesgos y pruebas.* Compromete a hacer la segunda misión. Coste 0 ahora, **L** después.

**C — Sí, ya.**
- *Qué ve y qué puede hacer la persona.* La pantalla de Design deja de ser cabecera, caja, seis puertas y muestras, y pasa a ser el
  espacio de trabajo con su sello «Referencia funcional»; el teléfono pasa a cuatro superficies; el 80 % de las capacidades que enseña
  están apagadas con su motivo.
- *Archivos y contratos.* `constants/designReferencia.ts:40` (puerta), `App.tsx:239`, `navigation/MainStackNavigator.tsx:372-373` y
  `screens/SpecialistScreen.tsx:117` (montar la referencia en lugar de `DesignScreen`). Pruebas que existen para que esto **no**
  pase y habría que invertir: `foundation-de-experiencias` I17 (`design-referencia.mjs:302-313`), `navegacion-enlaces` 31–34;
  y reapuntar `design-cierre`, `cajas-weeai`, `credits-weeai` y `aceptacion-pantallas`. i18n: `designRef.ts` ×16 sin revisión nativa.
  Cercas `puente-pre-f1d`: ninguna (todo cliente) **[L]**.
- *Riesgos y pruebas.* Contradice `CLAUDE.md:78` y «No agregar funciones, menús ni secciones solo porque sean posibles»
  (`CLAUDE.md:9`). **[I]** La referencia parece cubrir por sí sola CL-01, 02, 03, 04 y 09, pero **no lo verifiqué ejecutándola**
  (puerta cerrada, sin web: CL-26). Coste **L**.

**7 · Recomendación técnica [O].** **B**, como el documento. La referencia ya hace lo que `DesignScreen` no hace (crear de verdad),
pero el 80 % apagado choca con «Una experiencia simple por delante» y la identidad visual todavía no existe; B anota la dirección sin
comprometer trabajo. **Qué me haría cambiar:** si no habrá misión de identidad (A); o si hay que cerrar CL-01 a CL-05 por el camino más
corto y se acepta la estética neutra (C, con su coste en pruebas).

**8 · Coste y orden.** **0** ahora con A o B **[I]**. **Se contesta primero:** dice a qué pantalla se refieren todas las demás.

---

### DEC-02 — Con la puerta abierta, ¿por dónde se entra?

**1 · Texto literal y contexto.**

> «Con la puerta abierta, ¿por dónde se entra?» — `docs/WEE-DESIGN-UIUX-DECISIONS.md:27`

- Hoy **no se entra por ninguna parte:** con la puerta cerrada la ruta existe en la pila pero el enlace `design/referencia/:grupo?` no
  se registra (`App.tsx:239`; `navigation/MainStackNavigator.tsx:373`).
- El guardián I17 exige que la puerta sea una constante cerrada, que ningún botón de la app lleve a la referencia y que `DesignScreen`
  «no sepa que la referencia existe» (`functions/test/design-referencia.mjs:302,312-313`); F-08 recuerda que reutilizar
  `contextoDeDesign` desde la pantalla obliga a extraerlo o a aflojar esa guarda (`WEE-DESIGN-CIERRE.md:120`).
- Las entradas del menú ☰ y de las barras laterales recorren el registro de experiencias y van a `Specialist { id }`
  (`components/DrawerMenu.tsx:239`, `components/Sidebar.tsx:296`, `components/creator/CreatorSidebar.tsx:48,80`). El menú es «un solo
  menú ☰» (`CLAUDE.md:19`).

**2 · Opciones.**

| | Opción (texto del documento) | Marca |
|---|---|---|
| A | Solo por dirección (`/design/referencia`, hoy) | **Equivale a hoy** |
| B | Un acceso discreto en `DesignScreen` | **Recomendada del documento** («sin tocar el menú») |
| C | Una entrada en el ☰ y la barra lateral | — |

**3 · Qué habilita o bloquea.** Solo CL-23 (ninguna P ni fase de §5). **Solo tiene sentido si la puerta se abre**, así que depende de DEC-01 (con A «nunca
sustituir» puede seguir abriéndose como espacio aparte, o no abrirse nunca). **Efecto [E]:** sola no cambia ningún estado.

**4 · 5 · 6 · Por opción.**

**A — Solo por dirección.**
- *Qué ve y qué puede hacer la persona.* Nada visible: entra quien conozca la dirección.
- *Archivos y contratos.* Ninguno. Cercas: ninguna. Coste 0.
- *Riesgos y pruebas.* Ninguno nuevo; I17 y `navegacion-enlaces` 31–34 siguen como están.

**B — Un acceso discreto en `DesignScreen`.**
- *Qué ve y qué puede hacer la persona.* Un acceso pequeño dentro de la pantalla de Design; quien lo vea puede probar el espacio de
  trabajo.
- *Archivos y contratos.* `screens/DesignScreen.tsx` pasa a nombrar la referencia, lo que **rompe I17** (`design-referencia.mjs:312-313`,
  suite `foundation-de-experiencias`) y hay que aflojarlo a propósito; `navegacion-enlaces` 31–34; una etiqueta nueva ×16 en
  `i18n/textos/*/design.ts`. Cercas `puente-pre-f1d`: ninguna.
- *Riesgos y pruebas.* Se enseña a las personas un espacio marcado «Referencia funcional» y provisional (`UIUX-DECISIONS.md:61`).
  Coste **S–M**.

**C — Una entrada en el ☰ y la barra lateral.**
- *Qué ve y qué puede hacer la persona.* Un destino más en el menú y en la barra de escritorio.
- *Archivos y contratos.* `components/DrawerMenu.tsx`, `components/Sidebar.tsx`, `components/creator/CreatorSidebar.tsx`,
  `constants/weeMenu.ts`; invierte I17 («ningún botón de la app lleva a la referencia»). Cercas: ninguna.
- *Riesgos y pruebas.* Choca con «Un solo menú ☰» y con «No agregar … menús» (`CLAUDE.md:9,19`). Coste **M**.

**7 · Recomendación técnica [O].** **B**, como el documento, **si DEC-01 no es A** (mientras la puerta esté cerrada es indiferente y
cuesta 0 registrarla). Evita tocar el menú, que es la parte más protegida de la app. **Qué me haría cambiar:** DEC-01 = A (entonces A).

**8 · Coste y orden.** **S–M** **[I]**; 0 mientras no se abra la puerta. Después de DEC-01; antes de DEC-05.

---

### DEC-05 — ¿Se oculta la barra global inferior dentro del workspace en el teléfono?

**1 · Texto literal y contexto.**

> «¿Se oculta la barra global inferior dentro del workspace en el teléfono?» — `docs/WEE-DESIGN-UIUX-DECISIONS.md:28`

- La barra global (Inicio, Buscar, +, WeeTalk, Perfil) se oculta en escritorio, en `Login`, `Register`, `Create`, `Reels`, `Settings`,
  `WeeProfileCreation`, `AiAvatar` y en una conversación abierta (`navigation/NavegacionGlobal.tsx:29-40,125-133`). **Ni `Design` ni
  `DesignReferencia` están en la lista**: en el teléfono la barra está puesta, y la pantalla de Design le reserva sitio
  (`screens/DesignScreen.tsx:30,176`).
- En la referencia, en tableta y teléfono, la caja va anclada como `pie` del marco y la barra global «sigue» (`WORKSPACE-ARCHITECTURE.md:35`).
- Solo afecta a la referencia (puerta cerrada).

**2 · Opciones.**

| | Opción (texto del documento) | Marca |
|---|---|---|
| A | No (hoy) | **Recomendada del documento** («mientras la referencia no sea la pantalla de Design»); **equivale a hoy** |
| B | Sí (`SIN_BARRA`) | — |

**3 · Qué habilita o bloquea.** Solo CL-23 (ninguna P ni fase de §5). Depende de DEC-01 y DEC-02. **Efecto [E]:** sola no cambia ningún
estado.

**4 · 5 · 6 · Por opción.**

**A — No.**
- *Qué ve y qué puede hacer la persona.* La barra sigue visible en el teléfono dentro del espacio de trabajo: cinco destinos a un toque,
  a costa de alto para el lienzo y la caja.
- *Archivos y contratos.* Ninguno. Cercas: ninguna. Coste 0.
- *Riesgos y pruebas.* Ninguno nuevo.

**B — Sí.**
- *Qué ve y qué puede hacer la persona.* El espacio de trabajo ocupa toda la pantalla del teléfono; para salir, el volver.
- *Archivos y contratos.* `navigation/NavegacionGlobal.tsx:29` (añadir `'DesignReferencia'` a `SIN_BARRA`).
  `functions/test/home.test.mjs:1732` fija el comienzo de ese conjunto con una expresión que no se rompe al añadir una entrada al final
  **[I]**. Cercas: ninguna.
- *Riesgos y pruebas.* Sin la barra, salir a otra sección es solo el volver. Comprobarlo en un teléfono (CL-26, manual). Coste **S**.

**7 · Recomendación técnica [O].** **A**, como el documento: cuesta 0, es lo de hoy y solo importa si la referencia llega a abrirse en
el teléfono. **Qué me haría cambiar:** una prueba en un teléfono real en la que la barra robe espacio a la caja anclada.

**8 · Coste y orden.** **0** (B: **S**) **[I]**. La última de las tres de la referencia.

---

### DEC-06 — Los destinos de exportación

**1 · Texto literal y contexto.**

> «Los destinos de exportación» — opciones: «La lista de DEC-06a, otra, o formatos visibles» — `docs/WEE-DESIGN-UIUX-DECISIONS.md:29`
>
> DEC-06a: «**Exportar por destino** (juego, animación, impresión, web y AR, render, edición profesional, 🤷 No sé) en vez de por
> formato» — por «CREATOR.md §14: sin lenguaje técnico» — `UIUX-DECISIONS.md:13`

- **La lista ya está en el código:** `DESTINOS_DE_ENTREGA` (`constants/designReferencia.ts:842-850`) con «Un juego», «Animación»,
  «Imprimirlo», «Web o realidad aumentada», «Una imagen de presentación», «Un programa profesional» y «🤷 No sé»
  (`i18n/textos/es/designRef.ts:236-242`, `:73`; `studio.ts:363`).
- **Hoy no tiene efecto visible:** «Exportar para un programa» (C31) está `BACKEND_REQUIRED` (necesita `3d.convert` y `3d.export`,
  que son `DECLARED`, y el conversor de Weë de DEC-20) y «A tu programa 3D» (C70) está `REVIEW_REQUIRED` (DEC-21) **[E]**
  (Anexo B6; `WORKSPACE-ARCHITECTURE.md:262-271`). Solo vive en la referencia: la pantalla montada no exporta nada.
- Regla: «No mostrar por defecto: prompt, negative prompt, seed, parámetros técnicos, modelo…»; un modo avanzado «oculto por defecto»
  (`docs/CREATOR.md:100-104`); DEC-08, «¿Modo avanzado?», recomienda «No» hasta que haya capacidades 3D reales
  (`UIUX-DECISIONS.md:31`).

**2 · Opciones.** El documento no les pone letra; aquí **a, b y c**.

| | Opción (texto del documento) | Marca |
|---|---|---|
| a | La lista de DEC-06a | **Recomendada del documento** («los formatos solo en un modo avanzado oculto»); ya está en el código |
| b | Otra | — |
| c | Formatos visibles | — |

**3 · Qué habilita o bloquea.** Solo CL-23 (ninguna P ni fase de §5). Depende de DEC-01 (la referencia) y, para tener efecto, de DEC-20 y
DEC-21 (fuera de las once). **Efecto [E]:** sola no cambia ningún estado.

**4 · 5 · 6 · Por opción.**

**a — La lista de DEC-06a.**
- *Qué ve y qué puede hacer la persona.* Cuando exista el conversor, «¿Para qué lo quieres?» con siete respuestas y sin extensiones.
- *Archivos y contratos.* Ninguno (ya está). Cercas: ninguna. Coste 0.
- *Riesgos y pruebas.* Ninguno nuevo: `design-referencia.mjs:225` (I11) ya exige que cada destino lleve a una capacidad que existe.

**b — Otra lista.**
- *Qué ve y qué puede hacer la persona.* La que diga el dueño.
- *Archivos y contratos.* `DESTINOS_DE_ENTREGA` y los textos ×16 (`designRef.ts`); si una clave es nueva, también `i18n/huella.json`.
  Cercas: ninguna.
- *Riesgos y pruebas.* I11 y los dieciséis diccionarios. Coste **S**.

**c — Formatos visibles.**
- *Qué ve y qué puede hacer la persona.* GLB, FBX, OBJ, USDZ, STL, 3MF a la vista (`WORKSPACE-ARCHITECTURE.md:262`).
- *Archivos y contratos.* Los de b más los ajustes de entrega (`constants/designCadena.ts`, `AJUSTES_DE_ENTREGA`). Cercas: ninguna.
- *Riesgos y pruebas.* Contradice `CREATOR.md:100-104` y el fundamento de DEC-06a. Coste **S–M**.

**7 · Recomendación técnica [O].** **a**, como el documento: ya está hecha y no hay nada que construir mientras no exista el
conversor. **Qué me haría cambiar:** una lista de destinos distinta que traiga el dueño (b) tras ver cómo los entienden las personas.

**8 · Coste y orden.** **0** **[I]**. Depende de DEC-01 y, para tener efecto, de DEC-20.

---

## 3. Obligatorias para cerrar, mejoras opcionales y secuencia

### 3.1 Qué hace el corredor con una respuesta (hechos)

- El corredor lee una decisión buscando la marca de registro **dentro de la fila** de esa decisión en `docs/DESIGN.md` §4 o en
  `docs/WEE-DESIGN-UIUX-DECISIONS.md` §2 (`functions/test/_design-cierre.mjs:44-45`; formato en el Anexo D).
- Para un criterio de código, `evaluar` mira **primero la comprobación**: si el código ya cumple, el criterio queda «cumplido»
  aunque su decisión no esté registrada; si no cumple y falta una decisión, queda «espera una decisión»; si no cumple y ya están todas,
  queda «abierto» (`_design-cierre.mjs:322-335`). **Las decisiones no cierran criterios de código: dicen qué código hay que escribir**
  (y, por el proceso de la ronda, no se integra código que presuponga una decisión sin registrar).
- **Solo dos criterios leen el registro como comprobación:** CL-05 (D1 y D7, `_design-cierre.mjs:113`) y CL-23 (las trece,
  `:267-272`).

Lo que diría el corredor si se registrara cada decisión **[E, simulación en memoria; el disco no cambia; Anexo B2]**:

| Se registra | CL-01 | CL-02 | CL-05 | CL-09 | CL-13 | CL-14 | CL-15 | CL-16 | CL-23 | Cumplidos · abiertos · esperan · manuales |
|---|---|---|---|---|---|---|---|---|---|---|
| Nada (hoy) | espera | espera | espera | espera | espera | espera | espera | espera | espera | 4 · 11 · 9 · 4 |
| Solo D1 | espera | espera | espera | espera | espera | espera | espera | espera | espera | 4 · 11 · 9 · 4 |
| D1 + D2 | espera | **abierto** | espera | espera | espera | espera | espera | espera | espera | 4 · 12 · 8 · 4 |
| D1 + D2 + D7 | **abierto** | abierto | **cumplido** | espera | espera | espera | espera | espera | espera | 5 · 13 · 6 · 4 |
| Solo D6 | espera | espera | espera | **abierto** | espera | espera | espera | **abierto** | espera | 4 · 13 · 7 · 4 |
| Solo D3 | espera | espera | espera | espera | **abierto** | espera | espera | espera | espera | 4 · 12 · 8 · 4 |
| Solo D4 | espera | espera | espera | espera | espera | espera | **abierto** | espera | espera | 4 · 12 · 8 · 4 |
| Solo D5 | espera | espera | espera | espera | espera | **abierto** | espera | espera | espera | 4 · 12 · 8 · 4 |
| Solo DEC-01, 02, 05 y 06 | espera | espera | espera | espera | espera | espera | espera | espera | espera | 4 · 11 · 9 · 4 |
| Las once de este documento | abierto | abierto | **cumplido** | abierto | abierto | abierto | abierto | abierto | **espera** | 5 · 18 · 1 · 4 |
| Las trece (con D8 y D9) | abierto | abierto | **cumplido** | abierto | abierto | abierto | abierto | abierto | **cumplido** | 6 · 18 · 0 · 4 |

### 3.2 Hay que decidir para poder cerrar

«Cerrar» aquí es lo que define `docs/WEE-DESIGN-CIERRE.md` §9: los 28 criterios en «cumplido», ninguno esperando una decisión
(`WEE-DESIGN-CIERRE.md:278`). Por eso, en sentido estricto, **las trece respuestas son obligatorias** (CL-23). La tabla separa lo que
además condiciona **qué código** se escribe y si el criterio puede llegar a cumplirse.

| Decisión | Criterio que depende de ella | ¿Una respuesta cualquiera lo cierra? | Respuestas con las que el criterio, tal como está escrito, **no puede cumplirse** | Opción mínima (la que menos construye) | Lo que cuesta la recomendada [I] |
|---|---|---|---|---|---|
| **D1** | CL-05 (con D7); CL-01 (con D2 y D7) | CL-05: **sí, cualquiera** (la sonda solo lee el registro). CL-01: ninguna lo cierra sola; lo cierra el código de P1, igual con A, B o C | ninguna | **B** (la pantalla de hoy; no se toca ninguna puerta), o A sin añadir puertas | M (A) |
| **D2** | CL-02; CL-01 | CL-02: **solo B**. CL-01: cualquiera, con P1 | **A y C** dejan CL-02 imposible (salvo que D7-A lleve «Un antes y después» a `home`, lo que contradice A) | La única que cierra CL-02 es **B** y es pequeña (P2: un renglón, sin claves nuevas). Sin construir nada: A, y reescribir CL-02 | S sobre P1 (B) |
| **D3** | CL-13 | **Solo B o C** | **A** | La sonda se cierra con un cambio solo de cliente que conserve las respuestas (S, sin linaje); el **texto** del criterio exige además linaje | M–L (C); L con linaje |
| **D4** | CL-15 | **Solo A o C** | **B** | **A** (el afiche pasa a `kind: 'poster'`; el afiche cuesta más) | S–M (A) |
| **D5** | CL-14 | Cualquiera de A, B o C, con código | ninguna | **C** (1:1 y 9:16, que ya están en la política) | M (A) |
| **D6** | CL-09; CL-16 | CL-09: cualquiera. CL-16: **solo A** | **B y C** dejan CL-16 imposible | **C** (ocultar «Añadir» y «Referencia») cierra CL-09 con un cambio pequeño; CL-16 no | M–L (A) |
| **D7** | CL-05 (con D1); CL-01 (con D1 y D2) | CL-05: cualquiera (la sonda). Su **texto** solo lo cumplen A y B | **C** deja el texto de CL-05 falso | **C** (= hoy) registra sin tocar nada, pero deja la promesa; la mínima honesta es **B** (retirar las puertas sin capacidad) | M (A) |
| **DEC-01, 02, 05, 06** | CL-23 | **Sí, cualquiera** | — (DEC-01 = C re-basa CL-01 a 05, 09, 24 y 26) | A, A, A y a: lo de hoy | 0 (DEC-01 B, DEC-05 A, DEC-06 a); S–M (DEC-02 B) |
| **D8, D9** (fuera de las once) | CL-23 | **Sí, cualquiera** | — | D8 = A; D9 = A | — |

«Sin construir nada nuevo» solo es posible con **D1-B** (la pantalla de hoy, aparte de P1, que hace falta con cualquier respuesta),
**D7-C** (es lo de hoy, con la promesa sin cumplir) y las respuestas de puro registro. En D3, D4, D5 y D6 la opción más pequeña que
cierra su criterio escribe código, aunque sea poco (una línea de plantilla en D4-A, un cambio de cliente en D3-C, dos botones menos en
D6-C).

Cómo leer «no puede cumplirse tal como está escrito»: la lista de cierre y el corredor son del dueño y de quien coordina; **esta tarea
no los edita**. Si eliges una de esas respuestas, el criterio afectado hay que reescribirlo o retirarlo para que Design pueda llegar a
28 de 28 (el corredor solo tiene cuatro estados —cumplido, abierto, espera una decisión y manual— y ninguno es «retirado»;
`_design-cierre.mjs:5-18`).

### 3.3 Mejoras opcionales (pueden venir después sin impedir «terminado»)

Una mejora es opcional si el cierre, **tal como está escrito**, no la exige. Las dos primeras filas (†) lo son **solo si se reescribe un
criterio**: tal como están hoy, CL-16 exige D6-A y CL-13 exige linaje (§3.2).

| Mejora | Decisión que la habilita | Qué gana la persona | Por qué puede esperar |
|---|---|---|---|
| † Referencias de estilo reales | D6-A (en lugar de ocultar con D6-C) | Que el diseño se inspire en su foto | CL-09 se cierra con C; **solo si CL-16 se reescribe** (hoy exige A) |
| † Editar la propuesta elegida, con versiones | D3-B o C | Cambiar una imagen sin rehacer las tres ni pagarlas de nuevo; historia de versiones | Conservar las respuestas (parte cliente) cierra la sonda de CL-13; **solo si se reescribe el texto del criterio**, que exige además linaje |
| Formato vertical de feed (4:5) e impresión | D5-A (4:5) y D5-B | Piezas listas para cada sitio | CL-14 se cierra con 1:1 y 9:16 (C) |
| Texto escrito en cualquier pieza | D4-C | Carteles y portadas con su texto | CL-15 se cierra con A (logos y afiches) |
| Puertas que llevan a Studio y a Hogar & Diseño | D7-A (con DEC-12 y D2-B) | «Un recorrido» y «Un antes y después» que de verdad llevan a algo | CL-05 se cumple retirándolas (B) |
| Memoria de marca compartida con Weë Business | D8-B o C | Que el logo y la paleta se reutilicen | «Nada que construir hoy» (`WEE-DESIGN-CIERRE.md:267`) |
| Regla propia contra imitar marcas o personas | D9-C | Menos riesgo legal | Ídem |
| El espacio de trabajo como pantalla de Design | DEC-01-B o C, DEC-02-B o C, DEC-05-B | Crear, transformar y editar en un solo espacio | «Quedan fuera de terminado» (`WEE-DESIGN-CIERRE.md:289`) |
| Una estructura distinta de la pantalla (hero, plegables, franja de comunidad) | Las alternativas B a E de §4 | Según la alternativa | Hoy la estructura cumple lo que el cierre pide (`WEE-DESIGN-CIERRE.md:78-93`) |

### 3.4 CL-23 es un criterio de registro: qué respuestas son solo «no ahora»

CL-23 pide **trece de trece** registradas (`_design-cierre.mjs:267-272`; `WEE-DESIGN-CIERRE.md:278`) y no construye nada. Hay
respuestas que son de puro registro porque **no obligan a escribir código** ni cambian la pantalla:

| Decisión | Respuesta de puro registro («no ahora») | Respuestas que sí comprometen trabajo |
|---|---|---|
| DEC-01 | A (nunca) o B (después de la identidad) | C |
| DEC-02 | A (solo por dirección) | B, C |
| DEC-05 | A (no) | B |
| DEC-06 | a (la lista de DEC-06a, ya hecha) | b, c |
| D8 | A (nada en la primera versión) | B, C |
| D9 | A (no prometer exclusividad, cláusula en los términos y revisión legal antes de anunciar logos; es una tarea legal fuera del código y no condiciona cerrar) | B (etiqueta en los logos), C (regla de moderación) |
| D3, D6, D7 | A (recrear), C (ocultar) y C (esperar) son «no ahora» válidas para el registro, **pero** dejan CL-13, CL-16 y el texto de CL-05 sin poder cumplirse (§3.2) | el resto |

Textos literales de D8 y D9, que completan la hoja de respuesta:

> «Memoria de marca o brand kit» — A) Nada en la primera versión · B) Memoria de proyecto compartida con Weë Business · C) Solo en Weë
> Business — Recomendado: «A ahora, B después» — `docs/DESIGN.md:70`
>
> «Uso comercial y moderación propia» — A) No prometer exclusividad, cláusula en los términos y revisión legal antes de anunciar logos ·
> B) Etiquetar los logos como «propuesta» · C) Una regla que rechace imitar marcas o personas reales — Recomendado: «A + C» —
> `docs/DESIGN.md:71`

Si no se contestan D8 y D9, CL-23 queda «espera» y Design no llega a «terminado» según §9.1, aunque lo demás esté hecho **[E]**
(Anexo B2, escenario «las once»). Aviso de nombres: este D9 es el de uso comercial, no el «cobro proporcional (D9)» del Algorithm
Engine (`WEE-DESIGN-CIERRE.md:74-76`).

### 3.5 Secuencia de decisión recomendada [O]

1. **DEC-01** (compuerta): dice a qué pantalla se refieren las demás; con A o B no cambia nada y desbloquea la lectura del resto.
2. **D1 → D2 → D7**, en bloque: desbloquean CL-01, CL-02 y CL-05 (tres de los cinco bloqueadores), P1 y P2, y el hueco `ACE-D-06`.
   Es lo que más abre por respuesta: cada una cambia lo que promete «Crear».
3. **D6**: es independiente del bloque y cierra una mentira visible (las referencias de muestra). Incluso la parada C es útil.
4. **D4 y D5 juntas:** están acopladas por el motor (modelos que escriben texto y proporciones verificadas).
5. **D3:** la más grande; toca pantallas compartidas y, con linaje, una cerca. Va después de que el flujo de «Crear» sea real.
6. **Solo registro:** DEC-02, DEC-05, DEC-06, D8 y D9 (CL-23); no bloquean nada de lo anterior.

Es coherente con el orden de construcción que ya propone el cierre: «F0 (CL-17) y CL-10/11/20 no esperan a nadie → CL-01 + CL-02 +
CL-03 (P1, P2) con CL-18 (P10) → CL-04 (P3) → CL-14 y CL-15 (P7, P8) → CL-09, CL-13 y CL-16 (P4) → resto»
(`WEE-DESIGN-CIERRE.md:271-272`): esta secuencia solo dice qué respuestas se deben antes de que cada paso pueda empezar.

### 3.6 Grafo de dependencias entre las once

```
DEC-01 ── compuerta ───────────────────────────────────────────────────────────────┐
  │  (A o B: todo lo demás habla de DesignScreen)                                  │  (C: re-basar CL-01…05, 09, 24 y 26)
  ▼
 D1 ──► D2 ──► D7 ─────────► CL-01 · CL-02 · CL-05 ──► P1 · P2
  │      │      └─ vecina: DEC-12 («Un recorrido» → Weë Studio)
  │      └────► D6 ◄──────► D3            (comparten «material como entrada»: D6-B es D3-B)
  ▼
 D4 ◄──────────► D5                       (los modelos que escriben texto solo tienen medida verificada en 1:1)

DEC-01 ──► DEC-02 ──► DEC-05              (solo si la puerta de la referencia llega a abrirse)
DEC-01 ──► DEC-06 ◄── DEC-20              (los destinos solo tienen efecto con el conversor de Weë)

D8, D9: no dependen de las once. D9 toca a D4 (logos con texto) y D8 a D6 (referencias).
```

---

## 4. La estructura visual: estado actual, alternativas e impacto

El encargo del dueño menciona **«hero como entrada, herramientas en secciones desplegables cerradas por defecto y muro social como
superficie principal»**. Esta sección no lo introduce: dice qué hay, qué alternativas contempla el repositorio y qué implicaría cada
una, y formula la pregunta que falta.

### 4.1 Qué existe y qué no, con su evidencia

- **«Hero como entrada» es del Home, no de Design.** Es el carrusel de cuatro banners entregados por diseño (`docs/UX.md:124`;
  `components/HeroCarousel.tsx`), que **ningún archivo importa hoy** **[E: búsqueda en `screens/`, `components/`, `navigation/` y
  `App.tsx`]**; y `docs/UX.md:147` dice que la estructura del Home «está pendiente del dueño». En Design, lo más parecido es la cabecera
  (`CabeceraDeSeccion`: la W, el nombre, el lema y la descripción), que `docs/WEE-DESIGN-CIERRE.md:85` da por cumplida.
- **«Herramientas plegadas» solo existe en Weë Travel:** el estado `herramientasAbiertas`, que se cierra al entrar y al que el atrás
  de Android pliega primero (`screens/SpecialistScreen.tsx:58,64,88-98`), y su `TravelLauncher` (`:200-206`). Design no lo usa.
- **«Muro como superficie principal» se retiró el 2026-09-13** (`4ff271e`, «un solo muro»): «ya no hay muros de sección: Weë tiene uno
  solo, el Wäll» (`services/firestoreService.ts:606-611`), que ya se filtra por «Weë Design» (`utils/feedFilters.ts:93`). Una prueba lo
  fija: «Design ya no tiene muro propio» (`functions/test/creator.test.mjs:852`). Quedan comentarios que aún lo describen
  (`constants/specialists.ts:286,295-301`, CL-25).
- **Design y Chef son un lugar de trabajo propio desde `f28cee9`** (2026-09-15): cabecera → caja → … ; la decisión del usuario de ese
  día quedó escrita en la cabecera común: «arriba de una sección no va nada más que esto» y «sin adornos»
  (`components/creator/CabeceraDeSeccion.tsx:50-52,202-210`). Para Chef, `docs/WEE-CHEF-ESPECIFICACION.md:40-41` registra lo mismo.
- **La referencia visual de Design** (`design/references/wee-design.jpg`, 2026-09-05) **no es un espacio de trabajo, es una portada:**
  un banner con foto, «¿Qué quieres diseñar hoy?» con catorce categorías con foto, «Ejemplos de diseños creados con WEE» y una caja
  abajo. La pantalla de hoy es otra cosa a propósito (seis puertas sin fotos, «seis puertas, no un catálogo»,
  `components/design/DesignExplore.tsx:18-28`); `CLAUDE.md:78` sigue llamando «definitiva» a esas referencias.

### 4.2 El estado actual, de arriba abajo

`screens/DesignScreen.tsx` (a `a64ff24`). «Real» = hace lo que dice; «demostración» = no hay nada detrás.

| # | Bloque (lo que ve la persona) | Componente y archivo | Líneas | Real o demostración |
|---|---|---|---|---|
| 0 | Marco y desplazamiento; la caja crece sin perder sus botones (CLAUDE.md §9). En escritorio, columna centrada de 720 y **sin** barra lateral de Weë AI (no monta `CreatorShell`) | `SafeAreaView`, `EspacioDeEscritura`, `PaginaDeCajas` | `DesignScreen.tsx:99-100,173-183` | Real |
| 1 | **Cabecera:** volver, la W, «WeëDesign», el saldo; lema «Diseña sin límites.»; descripción «Espacios, productos, objetos y mucho más. Dale forma a tus ideas.» | `StudioHeader` → `components/creator/CabeceraDeSeccion.tsx` (+ `CreditsPill`) | `:184` | Real (el saldo, con sesión) |
| 2 | **La caja** «¿Qué quieres diseñar hoy?» con cuatro botones grises (Añadir, Referencia, Ajustes, Dictar) y el amarillo | `StudioPromptComposer` → `CajaDePrompt` | `:200-217` | Caja real. **«Crear» es un temporizador** (`:102-113`); «Añadir» y «Referencia» añaden un **nombre de muestra** (`:122-131`); «Dictar» dice «Próximamente» (`:213`); «Ajustes» abre la hoja, pero lo elegido **no viaja** |
| 3 | **Fichas** de lo adjuntado, con aspa | `FichaDeContexto` | `:219-232` | Demostración (nombres de muestra) |
| 4 | **«Explora»** + «Ver todas →» y **seis puertas** (Interiores, Arquitectura, Producto, Mobiliario, Vehículos, Renders y 3D), a dos por fila en el teléfono y tres en el resto | `DesignExplore` (`components/design/DesignExplore.tsx`) | `:234` | Navegación real; la puerta solo abre una lista |
| 5 | **Puntos de partida:** dentro de una puerta, «Empieza por» con cinco filas; «Ver todas» enseña las siete puertas. Pantalla completa; el atrás de Android deshace un paso | `DesignPanel` (`components/design/DesignPanel.tsx`) | `:146-171` | Navegación real; elegir un punto **solo escribe una frase** en la caja (`:116-120`) |
| 6 | **«Mis creaciones»** + «Ver todas →» | `FilaDeCreaciones` (`components/creator/FilaDeCreaciones.tsx`) con `CREACIONES_DE_DESIGN` | `:245-250` | **Demostración:** cuatro muestras, «Salón luminoso», «Casa entre pinos», «Yate de 15 metros», «Butaca de madera» (`constants/designTools.ts:137-142`); «Ver todas →» va a Mis proyectos |
| 7 | **Aviso flotante** «Creando…» y «Creación lista», con «Esto es una demostración: todavía no hay nada generado de verdad.» | `AvisoDeCreacion` (compartido con Studio) | `:256-260` | Demostración |
| 8 | **Hoja de ajustes:** Estilo, Materiales, Iluminación, Formato, Calidad, todos con «Automático» primero | `AjustesContextuales` + `AJUSTES_DE_DESIGN` | `:271-280` | Hoja real; sin efecto |

**No hay:** un hero propio, secciones plegables, un muro, la lista de trabajos en curso, una puerta a Hogar & Diseño, ni barra
lateral de Weë AI en escritorio. **Lo real de verdad está en el servidor** (`TEMPLATES.design` y `TEMPLATES.home`, con precio, reserva,
cobro o reembolso y materiales), y se llega por la búsqueda de Weë AI, Weë Brain y «Mis creaciones» (`WEE-DESIGN-CIERRE.md:17-24`).

### 4.3 Las alternativas

Cada una dice qué cambia para la persona, qué archivos, pruebas e i18n toca, con qué decisiones ya tomadas choca, el riesgo y el
esfuerzo **[I]**. **B y D se pueden combinar; C y E excluyen al resto.** Una misma respuesta puede servir a Weë Chef (su D-1 y su D-2
preguntan lo mismo, `docs/WEE-CHEF-ESPECIFICACION.md:533-534`): comparten cabecera y caja desde `f28cee9`.

**A — Mantener** la estructura de hoy.
- *Cambia:* nada. Es lo que `WEE-DESIGN-CIERRE.md:78-93` respeta: para el hero dice «Nada: ya cumple», para el muro «Nada: no se añade
  muro», y fija que Design no sea un catálogo (`design-cierre` A1).
- *Archivos y pruebas:* ninguno. Las de hoy siguen en verde **[E]**: `design-cierre` 36/36, `cajas-weeai` 52/52, `ajustes-weeai` 50/50,
  `credits-weeai` 37/37, `navegacion-enlaces` 44/44, `aceptacion-pantallas` 67 y 1 hueco.
- *Choca con:* nada. *Riesgo:* ninguno. *Esfuerzo:* 0.

**B — «Explora» plegada al entrar** (F la estimó en «unas 25 líneas», `WEE-DESIGN-CIERRE.md:86`).
- *Cambia:* la persona ve cabecera, caja, «Explora ▸» **cerrada** y «Mis creaciones»; al tocar «Explora» se abren las seis puertas, y al
  volver a entrar están cerradas otra vez (el mismo comportamiento de Weë Travel). Ya no hay una rejilla de puertas bajo la caja.
- *Archivos, pruebas, i18n:* `components/design/DesignExplore.tsx` (el plegado) y `screens/DesignScreen.tsx` (un estado, y el atrás de
  Android pliega antes de deshacer el camino, como `SpecialistScreen.tsx:88-98`). Pruebas que lo fijan hoy: `design-cierre` A1 y B5
  (no se rompen), `cajas-weeai` 21 (`:258`, el atrás de Design), `aceptacion-pantallas` ACE-D-01, ACE-D-20 y ACE-D-24 (esperan
  `DesignExplore` con `porFila: 2`). i18n: 0 claves si el plegado se dice con `accessibilityState` **[I]**; con texto nuevo, ×16.
- *Choca con:* `CLAUDE.md:78` («no se simplifican»): el plegado oculta lo que la referencia visual enseña abierto; y con la intención
  de `DesignExplore.tsx:18-28` (las puertas, bajo la caja y a la vista). No choca con «un solo muro».
- *Riesgo:* se pierde descubrimiento: las puertas ayudan a quien no sabe qué diseñar. Bajo en lo técnico. *Esfuerzo:* **S**.

**C — Hero propio + secciones plegables.**
- *Cambia:* arriba un hero (imagen y lema) y debajo las puertas y el resto en secciones desplegables cerradas.
- *Lo que hay para hacerlo:* **ningún activo de imagen de Design** **[E]** (`assets/images/` solo trae `hero/` con los cuatro banners del
  Home, `hero-couple.png`, `brain/` y los logos; el coche de `wee-design.jpg` es una maqueta, no un activo); el único componente de
  hero de sección, `components/creator/SpecialistHero.tsx`, es una tarjeta con emoji e ilustración de muestra y está **huérfano**
  (CL-25 pide borrarlo); los textos del hero antiguo siguen en `i18n/textos/es/catalogo.ts:73-78` (`designHeadline`, `designIntro`, tres
  sellos y `designNote`).
- *Archivos, pruebas, i18n:* reescribir el cuerpo de `DesignScreen.tsx`; un componente nuevo; `DesignExplore` pasa a secciones; **no**
  tocar `CabeceraDeSeccion` (la usan todas las secciones). Pruebas: `design-cierre` A1 y B5, `cajas-weeai` (orden de la pantalla),
  `aceptacion-pantallas` ACE-D-01; si se hace igual en Chef, `chef-weeai` (47 comprobaciones). i18n: textos nuevos ×16.
- *Choca con:* `CLAUDE.md:78`; la decisión del usuario del 2026-09-15 «arriba de una sección no va nada más que esto» y «sin adornos»
  (`CabeceraDeSeccion.tsx:50-52,202-210`); el cambio de `f28cee9`; y CL-25. Es la forma de la D-1-B de Chef («volver a hero + muro de
  sección»), que su especificación desaconseja (`WEE-CHEF-ESPECIFICACION.md:533`).
- *Riesgo:* alto en producto (se pierde la familia visual con Studio y Chef) y depende de imágenes que nadie ha entregado.
  *Esfuerzo:* **L**.

**D — Muro de sección de vuelta, o franja «De la comunidad» de solo lectura** (D-2 de Chef, opción B).
- *Cambia:* bajo «Mis creaciones», una franja de publicaciones recientes hechas con Weë Design (solo lectura: tocar abre la
  publicación), o un muro completo.
- *Lo que hay:* el filtro del Wäll por «Weë Design» (`utils/feedFilters.ts:93`), `paginaDeLaSeccion` (`utils/sectionFeed.ts:358`) y
  `PostCard`, que la especificación de Chef da por reutilizables (`WEE-CHEF-ESPECIFICACION.md:358-359`).
- *Archivos, pruebas, i18n:* `DesignScreen.tsx` y un componente nuevo de franja; «De la comunidad» ×16. Las comprobaciones que dicen que
  la pantalla «no importa ningún servicio» (`aceptacion-pantallas.test.mjs:372-374`; `design-cierre.test.mjs:113-114`) fijan la
  demostración y P1 ya las cambia; B2 no lista un servicio de publicaciones (solo `creatorService|assetsService|projectsService|brainService`).
  `creator.test.mjs:852` solo prohíbe `wall:` en la ficha de `specialists.ts`.
- *Choca con:* «un solo muro» (`4ff271e`); «Comunidades, no secciones» (`CLAUDE.md:17`); Chef D-2 recomienda A, «sin muro propio»
  (`WEE-CHEF-ESPECIFICACION.md:534`). Una franja de lectura no es un muro de sección, pero duplica el filtro del Wäll.
- *Riesgo:* moderación (contenido de terceros dentro de una pantalla de creación), estado vacío y consulta por sección. *Esfuerzo:*
  **M** (franja), **L** (muro).

**E — Sustituir la pantalla por la referencia funcional** (es DEC-01 = C; ver su ficha).
- *Cambia:* el espacio de trabajo (barra de comandos, biblioteca, lienzo, inspector, trabajos, caja anclada) en lugar de esta pantalla;
  94 capacidades en su índice, de las que **19 funcionan y 75 se ven apagadas** **[E]**.
- *Archivos, pruebas, i18n:* los de DEC-01-C (puerta, `App.tsx`, `MainStackNavigator.tsx`, `SpecialistScreen.tsx`; I17,
  `navegacion-enlaces`, `cajas-weeai`, `credits-weeai`, `design-cierre`, `aceptacion-pantallas`; `designRef.ts` ×16 sin revisión nativa).
- *Choca con:* `CLAUDE.md:78` y `:9`; `WEE-DESIGN-CIERRE.md:289-290`. *Riesgo:* alto. *Esfuerzo:* **L**.

| | A mantener | B Explora plegada | C hero + plegables | D franja o muro | E la referencia |
|---|---|---|---|---|---|
| Qué cambia para la persona | nada | las puertas se abren con un toque | hero arriba, todo plegado | una franja de comunidad | otro espacio de trabajo |
| Esfuerzo [I] | 0 | S | L | M (franja), L (muro) | L |
| Toca cercas `puente-pre-f1d` | no | no | no | no | no |
| Choca con decisiones tomadas | — | `CLAUDE.md:78` | `CLAUDE.md:78`, 2026-09-15, `f28cee9`, CL-25 | `4ff271e`, `CLAUDE.md:17` | `CLAUDE.md:78`, `:9` |
| Reescribe pruebas | no | pocas | varias | pocas | muchas |
| Criterios de cierre que se re-basan | — | — | CL-01 a 05, 09, 24, 26 | — | CL-01 a 05, 09, 24, 26 |

### 4.4 La decisión que se necesita para elegir

La pregunta exacta, con las alternativas (la respuesta es una letra, o dos si son B y D):

> **¿Qué ve la persona al entrar en Weë Design?**
> **A)** Lo de hoy: cabecera, caja, «Explora» con seis puertas, «Mis creaciones».
> **B)** Lo de hoy con «Explora» plegada al entrar.
> **C)** Un hero propio arriba y las puertas en secciones desplegables cerradas.
> **D)** A o B, más una franja «De la comunidad» de solo lectura (o el muro de sección de vuelta).
> **E)** El espacio de trabajo de la referencia funcional en lugar de esta pantalla (es DEC-01 = C).

**Recomendación técnica [O].** **A**, y que lo plegable, si se quiere, entre por **B** y más adelante. Razones: la estructura de hoy ya
cumple lo que el cierre exige (`WEE-DESIGN-CIERRE.md:78-93`); C choca con tres decisiones escritas y no tiene imágenes; D reabre lo que
el dueño cerró con «un solo muro»; E es DEC-01 = C y no tiene identidad visual. B es la única que se puede probar en un día. **Qué me
haría cambiar:** que el dueño entregue las imágenes de un hero de Design y quiera revisar la decisión del 2026-09-15 (C), o que la
medición de uso muestre que las puertas no se tocan (B).

**Qué NO se hará hasta que responda:**
- No se añade ningún hero, ninguna sección plegable, ninguna franja ni ningún muro, y no se monta la referencia.
- No se toca `components/design/DesignExplore.tsx` ni el orden de la pantalla (cabecera, caja, fichas, «Explora», «Mis creaciones»).
- El cierre sigue su curso con A: CL-26, la verificación visual, se hará sobre la pantalla de hoy.
- Con C o E, la lista de cierre se re-basa (CL-01 a CL-05, CL-09, CL-24 y CL-26).
- **[O]** Conviene no borrar `components/creator/SpecialistHero.tsx` (CL-25) mientras C siga sobre la mesa: es lo único del repositorio
  que se parece a un hero de sección.

---

## Anexo A — Qué cerca de integridad mueve cada archivo [E]

Medido el 2026-10-11 en un worktree limpio: se añadió **una línea de comentario** al final de cada archivo, se ejecutó
`node functions/test/puente-pre-f1d.test.mjs` y se restauró el archivo con `git checkout -- <archivo>`; `git status` quedó vacío
después de cada prueba. Línea base sin tocar nada: **42 de 42** en 4,5 s. Una línea basta para mover una cerca de tamaño exacto; un
cambio real mueve lo mismo. **No se reancla ninguna:** si una opción exige tocar uno de estos archivos, se entrega el diff, su
justificación y su impacto, y decide el dueño (regla de la ronda).

| Archivo | Cerca de `puente-pre-f1d` que se mueve | Qué fija esa cerca (`functions/test/puente-pre-f1d.test.mjs`) |
|---|---|---|
| `functions/src/creator/templates.ts` | **ninguna** | está nombrado en F1 (`:596`) pero ninguna cerca fija su tamaño |
| `functions/src/creator/inputs.ts` | **ninguna** | igual |
| `functions/src/creator/prompts.ts` | **ninguna** | igual |
| `functions/src/creator/types.ts` | **ninguna** | |
| `functions/src/creator/planner.ts` | F1 (#37) | el conjunto de archivos de `functions/src` tocados desde `b023f24`, por nombre (`:715`) |
| `functions/src/creator/index.ts` | F4 (#40) | tamaño exacto de `creatorRun` y de `creator/credits.ts` (`:778-788`) |
| `functions/src/engine/imageModels.ts` | E4 (#36) y F1 (#37) | tamaño exacto de cada archivo de `engine/` (`:524-564`) y el conjunto de nombres |
| `functions/src/engine/resolutionPolicy.ts` | E4 y F1 | igual |
| `functions/src/credits/aiPricing.ts` | F1 y F2 (#38) | el Credit Engine, el Router y `creditCosts`, sin tocar (`:739-740`) |
| `functions/src/credits/creditCosts.ts` | F2 | igual |
| `functions/src/content/versiones.ts` | F3 (#39) | tamaño exacto de `content/` y del núcleo (`:764-769`) |
| `functions/src/core/content/linaje.ts` | F3 | igual |

Lo que esto significa para las opciones: **D4-A, D6-A y D3 (sin linaje) no mueven ninguna cerca**; D5 y D4-B/C (si tocan la política de
resolución o `TEXT_KINDS`) mueven E4 y F1; D3 con linaje mueve F4 o F3; un cambio de precios movería F2. Las suites de cliente tienen
sus propias comprobaciones de estructura (Anexo B7), pero no son cercas de integridad.

## Anexo B — Evidencia ejecutada

Los guiones están en la carpeta de la ronda (`…\ronda-r7-design\D-decisiones\evidencia\`, fuera del repositorio): se ejecutan con
`cwd` = raíz del worktree y solo leen. Aquí van los resultados que usa este documento.

### B1 · El corredor, sin tocar nada (`node functions/test/_design-cierre.mjs`)

**4 cumplidos** (CL-06, 07, 08, 27) · **11 abiertos** (CL-03, 04, 10, 11, 12, 17, 18, 19, 20, 24, 25) · **9 esperan una decisión**
(CL-01, 02, 05, 09, 13, 14, 15, 16, 23) · **4 manuales** (CL-21, 22, 26, 28). Coincide con `docs/WEE-DESIGN-CIERRE.md:15`.

### B2 · Simulación del registro, en memoria (`simulacion-registro-en-memoria.mjs`)

Se parchea `fs.readFileSync` para que el corredor lea `DESIGN.md` y `UIUX-DECISIONS.md` con la marca añadida a las filas elegidas; el
disco no cambia. La tabla de resultados es la de §3.1. Dos lecturas que no estaban escritas: **D1 sola no cambia nada** (CL-05 y CL-01
necesitan además D7 y D2) y **D2 sola basta para pasar CL-02 a «abierto»**.

### B3 · Las puertas frente a la plantilla (`sondeo-puertas-vs-plantilla.mjs`)

Qué intención de `TEMPLATES.design` (`templates.ts:451-475`, deductor de palabras clave **sin** planificador de IA) saca el servidor de
la frase que escribe la pantalla al elegir cada punto de partida.

| Puerta | Frases de partida (es) | Deducidas | Sin deducir |
|---|---|---|---|
| Interiores | Un salón · Una cocina · Un dormitorio · Un baño · Remodelar un espacio | **0 de 5** | las cinco (cocina, dormitorio, baño y «remodelar» sí dan señal a Hogar & Diseño) |
| Arquitectura | Una casa moderna · Una fachada · Un edificio · Una cabaña · Una ampliación | 3 de 5 (lugar) | Una cabaña · Una ampliación |
| Producto | Un objeto cotidiano · Un envase · Un accesorio · Un aparato · Una joya | 1 de 5 (producto) | Un objeto cotidiano · Un accesorio · Un aparato · Una joya |
| Mobiliario | Una silla · Un sofá · Una mesa · Una estantería · Una lámpara | 3 de 5 (producto) | Un sofá · Una estantería |
| Vehículos | Un auto · Una moto · Un barco o un yate · Un avión · Un dron | 4 de 5 (vehículo o máquina) | Un barco o un yate |
| Renders y 3D | Un render realista · Una maqueta 3D · Una vista aérea · Un recorrido · Un antes y después | **0 de 5** | las cinco |
| Espacios (solo en «Ver todas») | Un jardín · Una terraza · Un local comercial · Un restaurante · Un espacio público | 2 de 5 (lugar) | Un local comercial · Un restaurante · Un espacio público |
| **Total** | 35 | **13** (es) · **3** (en: «Packaging», «A motorbike», «A drone») | 22 (es) · 32 (en) |

Coincide con `docs/WEE-ACEPTACION.md:76` («13 en español y 3 en inglés»). **UNKNOWN:** con el planificador de IA (`llmPlanner`,
`creator/planner.ts:157-258`) el servidor podría deducir más; no se midió (sin proveedores).

### B4 · Lo que el plan de `design` arma hoy (`sondeo-d4-niveles.mjs`)

| Rama | Capacidad del paso de imagen | `kind` | `aspectRatio` |
|---|---|---|---|
| Logo | `image.generate` | `logo` | ninguno |
| Afiche (feed, historia, imprimir) | `image.generate` | `design` | **ninguno** |
| Producto, vehículo, lugar, personaje | `image.generate` | `design` | ninguno |

| `kind` | ¿Pide un modelo que escriba texto? | Nivel |
|---|---|---|
| `design` | no | estándar |
| `logo` | sí | alto |
| `poster` | sí | alto |
| `cover` | sí | alto |

Con `kind: 'logo'` el motor elige `gemini-3.1-flash-image` (nivel alto); con `kind: 'poster'` también; con `kind: 'design'`,
`flux-2-klein-9b` (estándar).

### B5 · Modelos de imagen y proporciones verificadas (`sondeo-d5-proporciones.mjs`)

| Modelo | Nivel | ¿Escribe texto? | Rejilla | 1:1 | 4:5 | 9:16 | 16:9 | 3:4 |
|---|---|---|---|---|---|---|---|---|
| `flux-2-klein-9b` | estándar | no | continua | 1024×1024 | 912×1136 | 768×1360 | 1360×768 | 880×1168 |
| `gemini-3.1-flash-lite-image` | estándar | no | discreta, solo cuadrada | 1024×1024 | **no puedo** | **no puedo** | **no puedo** | **no puedo** |
| `seedream-4-0-250828` | estándar | no | continua | 1024×1024 | 912×1136 | 768×1360 | 1360×768 | 880×1168 |
| `seedream-5-0-lite-260128` | estándar | no | continua | 1920×1920 | 1728×2160 | 1440×2560 | 2560×1440 | 1664×2224 |
| `gemini-3.1-flash-image` | alto | **sí** | discreta, solo cuadrada | 2048×2048 | **no puedo** | **no puedo** | **no puedo** | **no puedo** |
| `flux-2-pro` | alto | no | continua | 1776×1776 | 1584×1984 | 1328×2368 | 2368×1328 | 1536×2048 |
| `gemini-3-pro-image` | máximo | **sí** | discreta, solo cuadrada | 4096×4096 | **no puedo** | **no puedo** | **no puedo** | **no puedo** |

(«no puedo» = `resolveForModel` devuelve `null`, `engine/resolutionPolicy.ts:97-124`; cada fila con el nivel de su propio modelo.) Las
proporciones con nombre son siete y no incluyen 4:5 (`ASPECT_LABELS`, `resolutionPolicy.ts:132-140`).

### B6 · Qué hay dentro de la referencia funcional (`sondeo-referencia-conteos.mjs`)

Registro `CAPACIDADES_DE_DESIGN` (`constants/designReferencia.ts`): **107** capacidades; **94** de Weë Design y 13 «fuera». De las 94:
**12 existen** (C07 rediseñar un espacio, C29 antes y después, C30 descargar, C33 publicar, C55 sugerencias, C56 descubrir capacidades,
C57 confirmar el coste, C58 explorar materiales, C63 filtrar, C64 crear proyecto, C65 cambiar de proyecto, C66 historial), **7 son
parciales** (C01 concepto, C10 vídeo de presentación, C11 cambiar con palabras, C12 otra versión, C34 guardar en proyecto, C54 agente,
C59 linaje) y **75 están apagadas** (11 piden servidor, 21 proveedor, 23 candidatas nuevas, 10 en revisión, 10 planeadas). Las dos
puertas están cerradas: `DESIGN_REFERENCIA_EN_LA_APP = false` y `ELEGIR_QUIEN_LO_HACE_EN_LA_APP = false`. Destinos de entrega: siete,
que remiten a `exportFor` (`BACKEND_REQUIRED`), `print3d` (`PROVIDER_REQUIRED`), `photoRender` (`PROVIDER_REQUIRED`) y `externalTools`
(`REVIEW_REQUIRED`): **ninguno se sirve hoy**. Las cinco capacidades que dependen de `3d.convert` o `3d.export` (C31, C32, C52, C78 y
C96) están todas sin servir (`BACKEND_REQUIRED`, `PROVIDER_REQUIRED`, `NEW_CANDIDATE` o `REVIEW_REQUIRED`).

### B7 · Líneas base de las suites de cliente [E]

| Suite | Resultado | Duración |
|---|---|---|
| `design-cierre` | 36/36 | 1 s |
| `cajas-weeai` | 52/52 | 1 s |
| `ajustes-weeai` | 50/50 | 0 s |
| `credits-weeai` | 37/37 | 1 s |
| `navegacion-enlaces` | 44/44 | 1 s |
| `aceptacion-pantallas` | 67 y 1 hueco conocido (ACE-D-06) | 3 s |
| `aceptacion-conversacion` | 30 y 5 huecos conocidos (entre ellos ACE-D-06b y ACE-D-07b) | 2 s |
| `puente-pre-f1d` | 42/42 | 4,5 s |

### B8 · Hogar & Diseño no tiene puerta visible

Búsqueda de `experienceId: 'home'`, `opens: 'home'` y `'home'` como destino en `screens/`, `components/`, `utils/` y `navigation/`:
solo `utils/designReferencia.ts:533` (la referencia cerrada) y el propio `CreatorFlowScreen` (que ya la trata como destino:
`:66,450,469`). El menú la oculta (`constants/weeExperiences.ts:199`) y su fila de `specialists.ts:279` no se pinta
(`screens/SpecialistScreen.tsx:117`).

## Anexo C — Lo que las once NO cierran

| Criterio | Quién lo cierra | Qué necesita del dueño |
|---|---|---|
| CL-03, CL-04 | línea de Design (P1, P3) | CL-03 viaja con P1, que presupone D1, D2 y D7; CL-04 no necesita nada |
| CL-10, CL-11 | servidor (tarea S de esta ronda) | nada |
| CL-12, CL-20, CL-24 | cliente (tarea C de esta ronda); CL-12 es de la pantalla compartida `CreatorFlow` | nada |
| CL-17 | dominio `design` del Eval Engine (tarea E) | nada |
| CL-18 | infraestructura (suite de emulador, PESADA; solapa con J) | nada de producto |
| **CL-19** | servidor + dueño | **H0 #6** (cancelación real): «cambia los diez adaptadores; la orden fue no reescribir los Provider Adapters; preparable con su sí» (`docs/DECISIONES-PENDIENTES.md:59`), y las reglas de dinero #7 y #8 (`:66`) |
| **CL-21** | el dueño | ejecutar `node ops/reconciliacion/reservas-colgadas.mjs` con datos reales (H0 #15b) |
| **CL-22** | dueño + infraestructura | autorizar el canario y fijar los Credits de bienvenida de cuentas anónimas, la cifra del tope de gasto diario y el cupo del planificador (`docs/DESIGN.md:89-92`) |
| CL-25 | línea de Design | nada (pero ver §4: `SpecialistHero.tsx`) |
| CL-26 | quien tenga la web con emuladores | nada; manual |
| CL-27, CL-28 | cumplido; quien integre | nada |
| Vecinas fuera de las once | — | **DEC-12** (Design → Studio, necesaria para D7-A «Un recorrido»), **DEC-18** (reintentos gratis, toca a D3), **DEC-20** y **DEC-21** (conversor y complementos, tocan a DEC-06), **DEC-24** (fotos de personas, toca a D6), **D8** y **D9** (CL-23) |

## Anexo D — Cómo se registra una respuesta, y nombres que chocan

**Cómo se registra.** Lo dice el propio repositorio (`docs/DESIGN.md:9-10`, y `docs/WEE-DESIGN-CIERRE.md:268-269`); lo escribe quien
coordina o el dueño, **no** esta tarea:

> Para registrar una decisión de §4, escribe `**DECIDIDA (fecha): opción**` en su fila: el corredor la lee.

La fila es la de la tabla de `docs/DESIGN.md` §4 (D1–D9) o la de `docs/WEE-DESIGN-UIUX-DECISIONS.md` §2 (DEC-xx). Una suite vigila que
cada fila exista con su nombre (`functions/test/design-cierre.test.mjs`, C4, 13 filas): **no se renombran las filas**.

**Nombres que chocan** (para contestar sin ambigüedad, di siempre «Design D3», «Chef D-1»…):

- **D1–D9** de Weë Design (`DESIGN.md` §4) ≠ el «cobro proporcional (D9)» del Algorithm Engine (`docs/DECISIONES-PENDIENTES.md:17`)
  ≠ el **D1** de la matriz de coordinación de la ronda R7 (autorizar y reanclar E4 y H2; `coordinacion\MATRIZ-R7.md`, fuera del
  repositorio) ≠ **D-1…D-12** de Weë Chef (`docs/WEE-CHEF-ESPECIFICACION.md:533-544`).
- **DEC-03** de Weë Design (la caja de la referencia va a `CreatorFlow`) ≠ **DEC-03** del Content Core («Guardar como versión»,
  `functions/src/content/versiones.ts`).
- **Hogar & Diseño** es la experiencia `home`; «Weë Home» ya no se lee en pantalla (`weeExperiences.ts:392-398`).

## Anexo E — Lo que no pude verificar

- **El aspecto en pantalla:** no se arrancó la web (pesada y sin las variables que no se leen): CL-26 sigue manual. No describo
  colores, tamaños ni espacios: describo estructura y textos.
- **El comportamiento de Gemini** en proporciones distintas de 1:1 y de `image.reference` con una foto de estilo: no se llamó a ningún
  proveedor (`resolutionPolicy.ts:97-124`; `providers/gemini.ts:243`).
- **Cuántas frases de partida deduce el planificador con IA** (solo se midió el de plantillas).
- **El precio en Credits** de un afiche en nivel alto o de una edición: lo calcula `creatorQuote`; no se copia ninguna cifra.
- **Si la referencia funcional cubre CL-01, 02, 03, 04 y 09 ejecutándola con la puerta abierta:** lo leí, no lo ejecuté.
- **El coste S, M y L** es mi estimación, no una medida.
