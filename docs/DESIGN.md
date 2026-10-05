# Weë Design — preparación de arquitectura

**Estado:** preparación, sin construir nada. Lo que este documento afirma del código está comprobado sobre `main`
(`e50464a`). Las decisiones de producto están marcadas como **pendientes del dueño**, con un valor por defecto recomendado
que **no** se ha aplicado.

Reglas que mandan sobre todo lo de abajo (CLAUDE.md):
- las interfaces de Weë AI son la referencia visual definitiva y no se rediseñan: todo se conecta por debajo;
- todas las cajas son el mismo Weë Brain: no hay otro asistente, ni otro router, ni otro motor de contexto;
- la persona elige el resultado y Weë elige la IA;
- toda IA se cobra por el Credit Engine;
- no se llama a ninguna API fuera de un adaptador;
- todo texto nuevo va por i18n.

## 1. Lo que hay hoy: dos Weë Design que no se tocan

| | Dónde | Qué hace |
|---|---|---|
| **La pantalla montada** | `screens/DesignScreen.tsx` (`SpecialistScreen.tsx:111` la monta para `design`) | La caja común (`StudioPromptComposer` → `CajaDePrompt`), las puertas de `constants/designTools.ts` y los ajustes. **«Crear» es una demostración:** `alCrear` arranca un `setTimeout` (`DesignScreen.tsx:100-111`). No llama al servidor, no reserva Credits y no guarda nada. |
| **La experiencia `design` del servidor** | `functions/src/creator/templates.ts` (`TEMPLATES.design`) | Real, por `CreatorFlow` → `creatorChat` → `creatorQuote` → `creatorRun`: un concepto (`text.generate`) y 3 propuestas (`image.generate`), con reserva, cobro o reembolso, y los materiales en `assets`. Hoy se llega por la búsqueda de Weë AI y por Weë Brain, **no** desde la caja de la pantalla. |

**Conectarlas es un puente pequeño sobre contratos que ya existen.** Lo que falta es decidir el alcance (§4).

**Huecos verificados en el camino del servidor:**
- **Una foto de referencia se sube y se ignora:** `image.generate` no está en `IMAGE_INPUT_CAPS` (`creator/inputs.ts:14-23`).
- **Un afiche pide texto en la imagen,** pero `kind: 'design'` no está en `TEXT_KINDS` (`engine/imageModels.ts:208`). Va al nivel estándar, donde ningún modelo escribe texto.
- **«Historia» o «imprimir» solo añaden una frase al encargo:** el paso de imagen no lleva `aspectRatio`, aunque el adaptador y la Resolution Policy ya lo admiten.
- **«Editar» abre un trabajo nuevo desde cero.**

## 2. Contratos: todo como extensión de lo que existe

| Contrato | Estado | Qué falta |
|---|---|---|
| Caja → Weë Brain | **Existe**: `ContextoDeExperiencia` + `creatorChat` | **Extender:** la caja de Design arma el mismo contexto que Studio (`workspace: 'design'`, los presets de la puerta, los ajustes como palabras en el `goal`). Ningún contrato nuevo. |
| Plan | **Existe**: `TEMPLATES.design` / `home` | **Extender:** `aspectRatio` según el destino, `kind` según la intención, y ramas nuevas solo si se deciden (§4). Las preguntas nuevas, con sus claves en i18n. |
| Capacidades y routing | **Existe**: `image.generate/edit/reference/background_remove` con gemini → flux → seedream | **Extender solo si se decide:** referencia (`image.reference`) y edición (`image.edit`). Ningún proveedor nuevo. |
| Material | **Existe**: `assets` con variantes y `provenance` | **Extender:** el linaje (`previousVersionId`, `sourceAssetIds`) al editar. Sin capas ni vectorial: si algún día hacen falta, es una decisión. |
| Memoria de proyecto | **Existe**: `creatorProjects`, `ProjectItem` | **Nuevo pequeño, solo si se decide:** logo y paleta en el proyecto, con un solo dueño para Design y Business. |
| Credits | **Existe** de punta a punta (`ai_image*`, `ai_text`) | Nada: ningún precio nuevo. |
| Moderación | **Existe**: el rechazo del proveedor se reembolsa; hay denuncias | **Nuevo pequeño, solo si se define una política** (§4, D9). |

## 3. Integración con el motor central y con lo transversal

- **Brain, Planner, Job Engine, Router y Gateway:** la caja de Design es una puerta más de `CreatorFlow`. No tiene Brain, Planner, cola ni router propios. El Core Runtime no se toca: migrar `image.*` al conductor exige autorización explícita.
- **Credits:** el camino de cobro de `creatorQuote`/`creatorRun` es el que usará Design. Su único crítico conocido (C-1: `creatorQuote` podía dejar Credits retenidos) se corrige en su propio PR, antes de construir nada sobre él.
- **Evals:** un **dominio `design`** dentro del Eval Engine común: un adaptador en `ops/evals/dominios/`, una línea en el registro, y su dataset y su baseline.
  - Decide a $0 con las funciones puras que ya existen (`TEMPLATES.design.infer/buildPlan`, la elección de modelo y el precio).
  - Sus graders miden lo que no depende de una decisión: las capacidades del plan, el número de propuestas, no volver a preguntar lo deducido y el suelo de coste.
- **Hillclimb:** cuando el dominio exista, puede declarar su superficie. Por ejemplo, el nivel de modelo para cada `kind`, siempre con valores cerrados y el de producción como baseline. Nunca aplica nada.
- **Build Guardian:** ya cubre las rutas de Design con las zonas y las reglas de siempre. Si Design necesita una zona propia, eso lo decide el dueño.

## 4. Decisiones de producto pendientes (del dueño)

Cada una lleva un valor por defecto **recomendado** que no se ha aplicado.

| | Pregunta | Opciones | Recomendado |
|---|---|---|---|
| D1 | ¿Qué es Weë Design? Hoy se contradicen el menú (gráfico), la referencia visual (todo), la pantalla (físico) y la plantilla (gráfico + concepto). | A) Todo «lo que imagines» · B) Solo lo físico y los espacios · C) Solo diseño gráfico | **A**, con cada puerta llevada a una intención de la plantilla |
| D2 | Entregables de la primera versión | A) Las 6 intenciones de la plantilla · B) A + Hogar & Diseño con puerta propia · C) Solo logo, post y concepto | **B** |
| D3 | Editar después de generar | A) Recrear desde cero · B) Editar la propuesta elegida (`image.edit`, con linaje) · C) Las frases rápidas editan y «Otra versión» recrea | **C** |
| D4 | Texto dentro de la imagen, y el nivel de los logos | A) Solo logos y afiches, con un modelo que escriba texto (el afiche se cotiza más caro) · B) Nunca · C) Siempre que se escriba | **A**, logos en el nivel alto |
| D5 | Formatos | A) 1:1, 4:5, 9:16 y 16:9 · B) A + impresión · C) Solo 1:1 y 9:16 | **A** |
| D6 | Referencias que sube la persona | A) Inspiración de estilo (`image.reference`) · B) Una base que se transforma · C) Ocultar el botón hasta decidir | **A** |
| D7 | Puertas sin capacidad detrás (maqueta 3D, recorrido, antes/después) | A) Llevarlas a lo que existe (Studio, Hogar & Diseño, imagen) · B) Retirarlas · C) Esperar a un proveedor 3D | **A** |
| D8 | Memoria de marca o brand kit | A) Nada en la primera versión · B) Memoria de proyecto compartida con Weë Business · C) Solo en Weë Business | **A ahora, B después** |
| D9 | Uso comercial y moderación propia | A) No prometer exclusividad, cláusula en los términos y revisión legal antes de anunciar logos · B) Etiquetar los logos como «propuesta» · C) Una regla que rechace imitar marcas o personas reales | **A + C** |

## 5. Plan por fases

| Fase | Necesita | Qué es | Puertas |
|---|---|---|---|
| **F0** | nada | Dominio `design` en el Eval Engine, a $0, con su dataset y su baseline del comportamiento de hoy. Los huecos de §1 aparecen medidos, no supuestos. | Cadena, G3, `evals-dominios` (un solo bucle), baseline reproducible por hash |
| **F1** | nada de alcance | Cumplir lo que la plantilla ya promete: `aspectRatio` 9:16 para «historia». | El dominio `design` da ACCEPT frente a F0; ninguna pantalla cambia |
| **F2** | D1, D2, D7 | Conectar la caja: `alCrear` → `CreatorFlow` con el contexto común; las puertas pasan claves, no frases. | Una suite de puente con el molde de `puente-studio`; `cajas-weeai`, `ajustes-weeai` y `credits-weeai`; i18n; emuladores con el adaptador `mock` (precio antes de crear, reserva y luego liquidación o reembolso) |
| **F3** | D4 | Texto en la imagen para afiches y logos. | Graders de F0 en ACCEPT; el precio, visible antes de crear |
| **F4** | D3, D6 | Referencia y edición con linaje. | `stepInputFor`, reembolso, emulador |
| **F5** | D5, D8, D9 | Impresión, memoria de proyecto y política propia. | Según lo que se decida |

**Antes de lanzar Design a personas** (preparación del motor, 2026-10-05):
- **En el modo de precios de prueba, el resultado de muestra se cobra a propósito** (`engine/pricing.ts`), para que los números se vean reales mientras se desarrolla. El modo demo entra cuando una capacidad no tiene proveedor real: pasa hoy en Weë Music, 30 Credits de prueba por una muestra. Design no debe depender de ninguna capacidad sin proveedor.
- **Este camino nunca ha corrido en producción.** Antes hace falta una suite de emulador del recorrido completo y un canario gobernado.
- **`main` no es producción.** `creatorRun`, `creatorChat` y compañía corren código anterior a los arreglos de la auditoría H0, y desplegarlos es una decisión del dueño.

**Decisiones del dueño que condicionan lanzar algo de imágenes:**
- los Credits de bienvenida para cuentas anónimas, con App Check apagado;
- la cifra del tope de gasto diario;
- el cupo del planificador.
