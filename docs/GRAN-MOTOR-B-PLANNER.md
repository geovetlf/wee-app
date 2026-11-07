# Gran Motor — Paquete B: Planner, Weë Brain y Algorithm Engine

Rama `gran-motor/b-planner` (local, sin push), base `42ddf6a6` (integra los paquetes A y C). Fecha: 2026-10-16.
Alcance: Planner (Core y Legacy), Weë Brain, Algorithm Engine A0–A9 (solo verificación) y equivalencia de las 11 plantillas.
Regla: **se fija la semántica con pruebas ANTES de cambiar nada; solo se corrige lo demostrado** (la prueba falla antes y pasa después).
Producción no se toca. No se da autoridad al Algorithm Engine, no se abre ninguna puerta, no se sube el contrato (1.12 en código, 1.9 en producción).

Evidencia reproducible: `cd functions && npm run build && node test/gran-motor-b-planner.test.mjs && node test/gran-motor-b-algoritmo.test.mjs`
(3,4 s y 4 s; ambas registradas en la cadena `npm test` y en el dominio `brain-planner` / `algoritmo` de `ops/guardian/dominios.json`, registro mecánico sin re-anclar nada).

## 1. Resumen ejecutivo

| | |
|---|---|
| Defectos demostrados y corregidos | 2 (B-1 respuesta sin texto entregada y cobrada; B-2 palabras pegadas al quitar la marca de derivar). Ambos en `core/brain.ts`; la suite nueva falla las 2 comprobaciones de B-1 y B-2 antes del cambio y pasa después |
| Hallazgo heredado del paquete C (el `catch` de Core Brain traga el error del pensador) | **No es un defecto**: es el diseño, y el reembolso seguro se decide en `creator/brain.ts` con el fallo que el pensador GUARDÓ. Hoy no puede producir un reembolso indebido (en la ruta del Core no hay cobro por delante). Queda un endurecimiento latente (D-B2) |
| Equivalencia Core/Legacy (11 plantillas, 827 combinaciones de respuestas, 607 formas distintas del plan) | 0 diferencias estructurales, 0 «no soportado», mismo número de pasos y orden de capacidades que Legacy en todas las formas listas, el Core nunca inventa una dependencia. Lo que el Core no trae de Legacy se reduce a 5 motivos conocidos |
| Algorithm Engine | 10/10 niveles implementados, exportados por la puerta única, en el ciclo y con suite propia; **un solo consumidor real** (`creator/sombra.ts` ← `creatorChat`, sin autoridad). 7 de 11 experiencias llegan a `decidir`; photo, beauty, home y music no |
| Decisiones reservadas al dueño | D-B1 … D-B5 (sección 7) |

## 2. Planner: Core frente a Legacy

Son dos cosas distintas y no se sustituyen (CLAUDE.md § 5 y § 10; `docs/RUNTIME.md` § Planner): **Legacy** (`creator/planner.ts`, `getPlanner` → `templatePlanner`/`llmPlanner`) conduce una conversación guiada por plantillas y devuelve un plan por experiencia; **el Core** (`core/planner.ts` + `planner/index.ts`) convierte un *entendimiento* en un plan de capacidades. El puente `creator/necesidades.ts` (`pasosParaElCore`) traduce el plan de Legacy al contrato del Core; es lo que se compara aquí.

### 2.1 Auditoría por punto pedido

| Punto | Legacy | Core | Veredicto / prueba |
|---|---|---|---|
| Descomposición de tareas | La fija la plantilla (`buildPlan`), una forma por combinación de respuestas | La declara Brain (`steps`) o se deduce de `capabilities` ordenadas por el catálogo | Equivalentes en las 11 plantillas (sección 3). PROBADO |
| Selección de capacidades | Codificada en la plantilla | Del catálogo; una desconocida o inventada se rechaza (`unknown_capability`) | PROBADO |
| Dependencias y orden | `dependsOn` por id, siempre hacia atrás (comprobado en las 607 formas) | `needs.upstream.stepKey`, solo hacia atrás por construcción: no caben ciclos ni auto-dependencia | PROBADO (sec. A y B de la suite) |
| Entradas y salidas de cada paso | `input` revuelto (`kind`, `brief`, `count`, `quality`, `aspectRatio`…) | `input {kind, brief}`, `count`, `hints` por paso, `produces` | El puente reparte cada campo a su dueño; lo que no tiene sitio se lista (sección 2.2) |
| GENERACIÓN frente a TRANSFORMACIÓN | `IMAGE_INPUT_CAPS` + rechazo del trabajo sin foto (`needsInputImage`) en ejecución | Un paso declarado que trabaja material ajeno y no lo tiene → `needs_clarification` `material:image` ANTES de que exista trabajo, proveedor o Credit; un paso que acepta texto + material se puede dirigir y se completa con su generación (modo deducido) | PROBADO (sección B de la suite). Ver D-B1 |
| Reutilización de intermedios | Todo `dependsOn` pasa `previous` entero | Solo la dependencia declarada y LEÍDA (29 de 41 aristas transmiten material; 12 solo ordenaban y el puente no las convierte) | PROBADO: el resultado intermedio se usa donde se declaró y en ningún otro sitio |
| Pasos duplicados | Ids únicos por construcción | `duplicate_step_key` si se repite la clave; la misma capacidad dos veces SÍ es legítima (3 pasos, conjunto de 2) | PROBADO |
| Validación antes de ejecutar | Parcial, en ejecución | En la frontera: claves, referencias, modalidades, variantes, `count` entero 1..techo (no se recorta), proveedor/modelo prohibidos, pistas | PROBADO |
| Experiencias con varias operaciones | Pasos encadenados | Mismo número y orden de capacidades en toda forma lista | PROBADO |
| Determinismo e inmutabilidad | — | Mismo entendimiento → mismo plan (`plan_<requestId>`); no comparte objetos con quien llama | PROBADO |

### 2.2 Tabla de diferencias Core / Legacy

| # | Diferencia | Dónde se ve | Clase | Justificación |
|---|---|---|---|---|
| 1 | Función distinta: conversación guiada frente a entendimiento→plan | arquitectura | JUSTIFICADA | Producto (CLAUDE.md § 5/§ 10); el camino es un adaptador, no un segundo planificador |
| 2 | Frase por paso (`purpose`) | 100 % de los pasos | JUSTIFICADA | Texto de interfaz de Legacy; el Core pone la del catálogo |
| 3 | `explainToUser` (la promesa a la persona) | todos los planes | JUSTIFICADA | Producto, no plan |
| 4 | Aristas que solo ordenaban (p. ej. Home `tips`←`ideas`, 20 formas) | `steps[tips].dependsOn` | JUSTIFICADA | El consumidor no lee nada del productor; convertirla sería inventar un consumo |
| 5 | `resolution` no viaja | pasos de foto de alta resolución | JUSTIFICADA | La calcula la Resolution Policy en ejecución con la foto delante |
| 6 | El Core añade `produces`, `hints` (calidad, duración, encuadre) y el conjunto `capabilities` | casi todos | JUSTIFICADA | Información derivada, no es un error (`CORE_ADDS_INFORMATION`) |
| 7 | Las claves de paso cambian (`key`) y los ids se reescriben (`s1-text_generate`) | todos | JUSTIFICADA | Representación equivalente |
| 8 | **La voz elegida no tiene sitio en el contrato del Core** (`audio.voice`, G15) | 4 formas de Music/Writer | **INJUSTIFICADA, abierta (fase G15)** | Pérdida de información; solo importaría el día que el Core tuviera autoridad |
| 9 | **El foco de Weë Home no tiene sitio** (`ideas.focus`, G14) | 20 formas de Home | **INJUSTIFICADA, abierta (fase G14)** | Ídem |
| 10 | **El entendimiento del puente declara `attachments: []`**: la sombra no pasa las fotos del trabajo, así que toda forma con paso de foto sale `needs_clarification material:image` | photo (40/45 formas), beauty (42/42), home (74/94), chef (22/82), studio (5/65) | **INJUSTIFICADA como cobertura (límite del puente de la sombra, NO de `necesidades.ts`)** | Medido: con la foto en el entendimiento, **las 328 formas** de esas cinco experiencias salen listas. Ampliar `creator/sombra.ts` es zona roja: decisión D-B3 |
| 11 | `music.generate` no es ROUTABLE | music (61/70 formas `unsupported`) | JUSTIFICADA | Weë Music no se conecta todavía (CLAUDE.md § 5) |
| 12 | Modo deducido: un paso de edición/transformación sin material se completa con una generación previa (`image.edit` sin foto → `image.generate` + `image.edit`); el modo declarado pregunta | `core/planner.ts` (regla 86/87 de `core-planner`) | DECISIÓN (D-B1) | Está decidida y probada por el catálogo («acepta texto además del material = se puede dirigir»), pero no mira la **intención** (`edit`/`transform`). Hoy solo la recorre la sombra |
| 13 | `pasosParaElCore` ignora sin anotarlo un `dependsOn` hacia un id que no existe | `creator/necesidades.ts` | Menor (B-4) | Ninguna plantilla lo hace (sec. A); el comentario del archivo promete «se cuentan» |
| 14 | Dónde se pregunta por la foto: Legacy al ejecutar, Core al planificar | — | JUSTIFICADA (mejora) | El Core pregunta antes de que haya trabajo ni Credits |

### 2.3 Equivalencia por experiencia (las 11 plantillas, puente real)

Cada fila: todas las combinaciones de respuestas respetando `when`, formas distintas del plan, y qué dice el Core. «Foto» = `needs_clarification` con `material:image` (el entendimiento del puente no lleva adjuntos).

| Experiencia (id) | Formas | Listas | Piden foto | No soportada | Llega a `decidir` (respuestas por defecto) |
|---|---|---|---|---|---|
| Weë Design (`design`) | 104 | 104 | 0 | 0 | sí |
| Weë Studio (`studio`) | 65 | 60 | 5 | 0 | sí |
| Weë Photo (`photo`) | 45 | 5 | 40 | 0 | **no** (`sin_plan_del_core`) |
| Weë Writer (`writer`) | 44 | 44 | 0 | 0 | sí |
| Weë Music (`music`) | 70 | 9 | 0 | 61 | **no** (`music.generate` sin servir) |
| Weë Fashion (`beauty`, id conservado) | 42 | 0 | 42 | 0 | **no** |
| Weë Chef (`chef`) | 82 | 60 | 22 | 0 | sí |
| Hogar & Diseño (`home`) | 94 | 20 | 74 | 0 | **no** |
| Weë Business (`business`) | 24 | 24 | 0 | 0 | sí |
| Weë Travel (`travel`) | 32 | 32 | 0 | 0 | sí |
| Weë Brain (`brain`) | 5 | 5 | 0 | 0 | sí |

Todas las formas listas: 0 `STRUCTURAL_MISMATCH`, 0 `UNSUPPORTED`, mismo número de pasos y mismo orden de capacidades, y toda dependencia del Core ya existía en Legacy. photo, beauty, home y music no llegan a `decidir` por las causas 10 y 11 de la tabla anterior (el puente `necesidades.ts` expresa las fotos bien: es la sombra la que no las pasa). **No se amplió el puente.**

## 3. Weë Brain (auditoría)

| Aspecto | Hallazgo | Estado |
|---|---|---|
| Una sola inteligencia, muchas puertas | `crearBrainDeWee` es la única composición; `creator/brain.ts` (brainChat) y `creator/sombra.ts` la reutilizan; no hay segundo sistema conversacional | OK |
| Intención | `clasificarIntencion` por señales (búsqueda web, marca, puerta de entrada, adjuntos, pregunta); el modo «entender» (JSON del modelo) valida contra el catálogo y no está conectado a la persona | PROBADO (`core-brain`, `brain-pasos`, esta suite) |
| Contexto autorizado | `armarContexto` usa la petición YA validada (no la cruda); límites de turnos y de caracteres; adjuntos de clase cerrada | PROBADO: mensaje desmesurado o adjunto inventado → `INVALID_REQUEST` con 0 llamadas al proveedor |
| Selección de experiencia | La marca `[[WEE:id]]` solo vale si el id está en la lista de derivar; una inventada se ignora y se avisa (`suggestion_rejected`) | PROBADO |
| Plan coherente | El entendimiento de Brain se planifica sin traducción (2 pasos, el segundo depende del primero) | PROBADO |
| Entradas/adjuntos/parámetros | `peticionAlMotor` pura: prompt, history, imagen/documento/audio; el modelo no recibe nada que no viniera | PROBADO (`core-brain`) |
| Entrega y errores | Cualquier fallo del pensador sale como `failed` / `PROVIDER_ERROR` / `thinker_failed` sin mensaje ni traza; `throw null` y `throw` síncrono no se escapan | PROBADO |
| Coherencia intención→plan→ejecución→respuesta | Cotizar y ejecutar construyen la entrada con la MISMA función (`brainInput`) y la huella de la entrada cotizada viaja al conductor; el Core no cobra ni reembolsa | PROBADO (`brain-canary`, esta suite, lectura de `creator/brain.ts`) |
| Credits | `core/brain.ts` no menciona Credits; `creator/brain.ts` cobra solo tras responder (bloque de doce) y reembolsa solo si devolver es seguro | PROBADO por fuente + `brain-canary`, `runtime-premigracion` |

### 3.1 El `catch` del Core Brain que «traga» el error del pensador

Verificado: `crearBrain` atrapa lo que lance el pensador y devuelve `failed` genérico; el error original (con su `weeError`/código) no sale.
**No es un defecto**, por tres razones comprobadas:

1. Es deliberado y está documentado en el propio código: la respuesta nunca filtra mensajes ni trazas de proveedor (probado con un mensaje con una «clave» que no sale).
2. Quien necesita el original lo **guarda antes de relanzar**: el pensador del camino de siempre (`causaDelFallo`) y el del conductor (`falloDelConductor`, solo si es `FalloDelPensador`). Después `creator/brain.ts` relanza la causa original, no la genérica.
3. La regla «reembolsar SOLO si `reembolsoSeguro`» está puesta: `devolverEsSeguro = !falloDelConductor || falloDelConductor.reembolsoSeguro`, y `queHacerConElCobro` con `devolverEsSeguro=false` no toca el dinero.

**Efecto real en el reembolso hoy: ninguno.** En la ruta del Core (`porElCore` ⇒ `text.generate` ⇒ no es búsqueda) el cobro va DESPUÉS de responder (`spend = cobroDelBloque`), así que mientras el pensador falla `spend` es `null` y no hay nada que reembolsar. El único cobro por delante es el de la búsqueda (`text.search`), que nunca va por el conductor. Esto queda fijado por pruebas de fuente (D2 de la suite).

**Endurecimiento latente (no aplicado, D-B2):** si algún día `text.search` (cobro por delante) pasara por el Core, una excepción *cruda* del conductor (p. ej. Firestore caído tras salir hacia el proveedor) no es un `FalloDelPensador`, `falloDelConductor` quedaría vacío y `devolverEsSeguro` valdría `true`: se reembolsaría un resultado desconocido. La corrección sería exigir evidencia positiva en la ruta del Core (`porElCore ? falloDelConductor?.reembolsoSeguro === true : true`). No se aplica porque no hay un caso que lo active, `creator/brain.ts` es zona roja y abrir la búsqueda al Core es una tercera puerta.

## 4. Algorithm Engine A0–A9: implementado / consumido / probado

Evidencia: `functions/test/gran-motor-b-algoritmo.test.mjs` (64 comprobaciones; verifica archivos, puerta única, motor en el ciclo y suite registrada) + las 13 suites `algorithm-*` ejecutadas en esta base (todas exit 0, ≤ 6 s cada una).

| Nivel | Módulos (`core/algorithm/`) | Implementado | Consumido por | Probado por | Evidencia |
|---|---|---|---|---|---|
| A0 Foundation | types, capability, signals, canonical, objective, budget, strategy, authority, scoring | sí | todos los demás niveles (contrato) | `algorithm-foundation` | exit 0 · 1 s |
| A1 Decision | decision, value, registry, decision-engine, baseline | sí | `decidir` (ciclo A9) | `algorithm-decision`, `algorithm-quality` | exit 0 |
| A2 Decomposition | decomposition, decomposition-engine | sí | `decidir` | `algorithm-decomposition` | exit 0 |
| A3 Strategy | strategy-engine | sí | `decidir` | `algorithm-strategy` | exit 0 |
| A4 Parallelization | parallelization, parallelization-engine | sí | `decidir` (solo recomienda; el Orchestrator deduce de `dependsOn`) | `algorithm-parallelization` | exit 0 |
| A5 Optimization | optimization, optimization-engine | sí | `decidir` | `algorithm-optimization` | exit 0 |
| A6 Verification / Recovery | verification, verification-engine, recovery, recovery-engine | sí | **`cerrar`: ningún consumidor en producción** (sin evaluadores ni productor de observaciones) | `algorithm-verification` | exit 0 |
| A7 Feedback / Learning | feedback, learning, feedback-engine | sí | **`cerrar`: ningún consumidor**; aprendizaje por cuenta bloqueado | `algorithm-feedback` | exit 0 |
| A8 Filtering / Context | context, context-engine | sí | `decidir` (sin lo aprendido: la sombra no pasa historial) | `algorithm-context` | exit 0 |
| A9 Cycle | integration, integration-cycle | sí | `creator/sombra.ts` → `ciclo.decidir(...)` | `algorithm-cycle`, `algorithm-agnostic` | exit 0 |

**Consumidores reales (medido): uno.** `creator/sombra.ts` importa el motor; `creatorChat` (`creator/index.ts`) llama a `sombraDelPlan` **una vez, después de `ref.set(clean(job))`, con el plan ya hecho y sin usar el resultado** (sin autoridad). Router, Orchestrator, Job Engine, Gateway, Credits, Brain, Runtime, vídeo, mundo 3D y Filmmaker no lo mencionan; `paraRouter` y `cerrar` (A6, A6r, A7) no tienen llamante; `core/index.ts` no lo re-exporta; el Core no lo importa. La puerta `aiSettings/sombra` está cerrada por defecto y solo abre por cuentas nombradas. La documentación previa (`75672a3d`) se **verificó contra esta base** y se adaptó su suite de cobertura; los **12 sabotajes** demuestran que desconectar la llamada, añadir un segundo importador, llamar desde `creatorRun`, mover la llamada antes de guardar, usar su resultado, consumir `paraRouter`/`cerrar` o re-exportarlo desde el Core hacen fallar la suite.

Alcance por experiencia (plantillas reales, puerta abierta en un doble): llegan a `decidir` `brain`, `business`, `chef`, `design`, `studio`, `travel`, `writer`; **no** `beauty`, `home`, `music`, `photo` (sección 2.2, filas 10–11). La única prueba real en producción es la de Travel con el contrato **1.9** (producción corre 1.9; el código local 1.12; subir a 1.13 es decisión del dueño).

## 5. Hallazgos priorizados

| Id | Criticidad | Hallazgo | Estado |
|---|---|---|---|
| B-1 | **Media** | Core Brain entregaba como `answered`/`ready_to_plan` una respuesta **sin texto** (contenido vacío, solo espacios o solo la marca de derivar). Los adaptadores rechazan el vacío del proveedor pero ANTES de quitar la marca; el texto vacío se guardaba como mensaje de Weë y **se cobraba** | **CORREGIDO** (`core/brain.ts`: `PROVIDER_ERROR`/`empty_reply` solo en `conversar`; el fallo normal con su reembolso) |
| B-2 | Baja | Una marca `[[WEE:…]]` en mitad del texto pegaba las palabras («mira [[…]] hola» → «mirahola») | **CORREGIDO** (un espacio si queda texto a los dos lados; el caso normal —marca al final— no cambia) |
| B-3 | Informativo | El `catch` de Core Brain traga el error del pensador | **NO es defecto**; fijado con pruebas (sec. 3.1) |
| B-5 | Media (cobertura) | La sombra no pasa adjuntos: 4 de 11 experiencias (photo, beauty, home, music) no llegan a `decidir`; 328 formas de photo/beauty/home/studio/chef saldrían listas con la foto | Documentado; decisión D-B3 |
| B-4 | Baja | `pasosParaElCore` ignora sin anotar un `dependsOn` a un id inexistente | Documentado; sin caso real |
| B-6 | Baja | G14 (foco de Home) y G15 (voz) siguen sin transporte en el Core | Abiertos por su fase |
| B-7 | Baja | Dos comprobaciones de `algoritmo-cobertura`/`sombra` heredadas eran débiles (la de «tras guardar» pasaba aunque se moviera la llamada) | Endurecida en la suite nueva (sabotaje 8) |

## 6. Correcciones y pruebas

| Commit | Contenido |
|---|---|
| `f8a377b6` | `fix(brain)`: B-1 y B-2 en `functions/src/core/brain.ts` + suite `gran-motor-b-planner` (79 comprobaciones: A) coherencia de las 607 formas de Legacy, B) semántica del Planner, C) equivalencia de las 11 plantillas, D) Brain y reembolso seguro). Antes del cambio fallaban exactamente las 2 comprobaciones de B-1 y B-2 (una tercera fallo fue un error de la propia prueba, corregido antes de confirmar) |
| `03c1f37f` | `test(algoritmo)`: suite `gran-motor-b-algoritmo` (64) + registro mecánico de las dos suites en `functions/package.json` y `ops/guardian/dominios.json` |

## 7. Decisiones reservadas al dueño

| Id | Decisión | Recomendación |
|---|---|---|
| D-B1 | ¿Un paso de **edición/transformación** (`intent` `edit`/`transform`) sin el material de la persona debe PREGUNTAR en vez de completarse con una generación, también en el modo deducido? Hoy solo lo recorre la sombra; el modo declarado ya pregunta | Sí, antes de que el modo «entender» llegue a la persona. Cambio pequeño en `core/planner.ts` + un caso en `core-planner` |
| D-B2 | Exigir evidencia positiva para reembolsar en la ruta del Core (`falloDelConductor?.reembolsoSeguro === true`) | Aplicarlo en el mismo cambio que cualquier migración de `text.search` o de otra capacidad con cobro por delante; no antes |
| D-B3 | Ampliar el entendimiento del puente de la sombra con las fotos del trabajo (`creator/sombra.ts`, zona roja) para que photo, beauty y home lleguen a `decidir` | Solo si se quiere medir esas tres con el motor; la sombra no gobierna nada |
| D-B4 | G14/G15: dónde viaja el foco de Home y la voz en el contrato del Core | Antes de cualquier autoridad del Core sobre Writer/Music/Home |
| D-B5 | Contrato 1.13 y despliegue de la 1.12 (producción corre 1.9); qué Router puntuaría con `paraRouter` | Heredadas del Algorithm Engine (§ 21 de `ALGORITHM-ENGINE.md`); este paquete no las toca |

## 8. Estado por componente (escala: DISEÑADO · IMPLEMENTADO · INTEGRADO · PROBADO · VALIDADO EN FLUJO REAL · DESPLEGADO · PREPARADO PARA PRODUCCIÓN)

| Componente | Estado | Nota |
|---|---|---|
| Planner Legacy (`creator/planner.ts`) | INTEGRADO · PROBADO · DESPLEGADO | Autoridad de ejecución hoy |
| Planner Core (`core/planner.ts`, `planner/`) | IMPLEMENTADO · PROBADO | Solo en sombra; sin autoridad |
| Puente `creator/necesidades.ts` | IMPLEMENTADO · INTEGRADO (sombra) · PROBADO | Límite de cobertura en la sombra, no aquí |
| Weë Brain Core (`core/brain.ts`) | INTEGRADO · PROBADO | Corregido B-1/B-2 en la rama; **no desplegado** |
| Weë Brain `brainChat` | DESPLEGADO (Legacy); canary del Core CERRADA | Sin cambios |
| Algorithm Engine A0–A9 | IMPLEMENTADO · PROBADO | INTEGRADO solo como sombra; sin autoridad; PREPARED |
| Equivalencia Core/Legacy (11 plantillas) | PROBADO | Diferencias clasificadas (sec. 2.2) |
| Nada de lo anterior | VALIDADO EN FLUJO REAL con esta rama / PREPARADO PARA PRODUCCIÓN | No se ejecutó flujo real, emuladores ni despliegue |

## 9. Qué se probó y qué no

PROBADO (ejecutado en esta rama): las dos suites nuevas; `core-brain`, `core-planner`, `planner`, `brain-pasos`, `brain-contexto`, `brain-bloque`, `brain-demo-no-cobra`, `brain-canary`, `brain-deepseek`, `brain-operacion`, `brain-vivo`, `encadenar-pasos`, `necesidades-de-paso`, `puente-necesidades`, `puente-studio`, `runtime-paridad`, `runtime-premigracion`, `sombra-experiencia`, `sombra-sin-texto`, `canary-sombra-atribucion`, `canary-sombra-assets`, las 13 `algorithm-*`, `guardian-dominios`, `guardian-aserciones`, `guardian-contencion`. Todas exit 0.
INFERIDO: que `brainChat` por el Core y por Legacy son equivalentes en entrada (misma función `brainInput`, misma huella cotizada) — leído y respaldado por `brain-canary`, no ejecutado de punta a punta con proveedor.
NO EJECUTADO: la cadena completa (prohibida por memoria), los emuladores, `cotas-de-tiempo`, cualquier llamada real, el flujo real de usuario, el despliegue.
