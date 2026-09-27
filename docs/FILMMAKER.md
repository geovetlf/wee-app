# Weë Filmmaker — el dominio de una producción (F1-A)

> Estado: **F1-A construida**. Es un dominio puro: no guarda, no genera, no cobra, no tiene interfaz y
> no está conectado a nada. Vive en `functions/src/filmmaker/` y no se exporta desde `functions/src/index.ts`.
> Pruebas: `functions/test/filmmaker-modelo.test.mjs`, dentro de la cadena de `npm test`.

## Propósito

Una persona dice «quiero un anuncio de 20 segundos de una zapatilla, de noche, en vertical» y Weë le enseña cinco
planos que puede tocar uno a uno. Para poder enseñarlos, cambiarlos y, más adelante, generarlos, la producción
tiene que existir antes como algo que se pueda **comprobar**: intención, dirección, formato, escenas, planos,
personajes, lugares, objetos, audio, montaje y entrega. Eso es F1-A, y nada más.

El dominio no sabe dónde se guarda, cómo se genera, con qué proveedor ni con qué modelo, cuánto cuesta, cómo se
ejecuta ni cómo se renderiza. El mismo dato da siempre el mismo resultado: aquí no hay reloj, ni azar, ni red.

## Los cinco archivos

| Archivo | Qué hace |
|---|---|
| `modelo.ts` | Los tipos de la producción, sus vocabularios cerrados, los presets de formato y lo que se deriva sin decidir nada: unidades generables, duraciones en milisegundos, la intención creativa y la continuidad **efectivas** de cada plano, la estimación de habla |
| `validacion.ts` | `validarProduccion(produccion, { stage })` → problemas con código, gravedad, ruta, parámetros y clave de mensaje. `integridad()` = solo los errores de forma |
| `operaciones.ts` | El lenguaje cerrado de los cambios (`aplicarOperacion`, `aplicarOperaciones`) y lo pendiente de rehacer (`pendientesEntre`) |
| `recomendaciones.ts` | `recomendar(produccion)` → sugerencias deterministas con propuestas escritas como operaciones. Nunca se aplican solas |
| `requisitos.ts` | `requisitosDeProduccion(produccion)` → borradores de `SceneNode`/`ShotNode`, requisitos por plano, audio, vista previa y montaje, resumen por capacidad, línea de tiempo y tarjetas de storyboard |

## El modelo

`FilmmakerProduction` es un agregado:

| Sección | Qué representa |
|---|---|
| `intent` | Lo que se pidió, en lenguaje natural si hace falta: objetivo, tipo, público, duración, formato, tono, estilo, tema, narrativa, restricciones comprobables, referencias, prioridades y el texto libre de la persona |
| `creativeDirection` | Cómo se va a ver: estilo visual, ánimo, tono, ritmo, color y `cinematography`, que es un `CreativeParameters` del Core (cámara, plano, óptica, movimiento, **luz**, **composición**, transición, encuadre) |
| `format` / `duration` | Proporción (16:9, 9:16, 1:1, 4:5, 4:3, 21:9), resolución, preset de origen; objetivo de duración y si es estricto |
| `scenes[]` → `shots[]` | Escenas con propósito narrativo, duración, hora, clima, lugar, reparto, estados de personaje, acciones, diálogo sin plano, dirección visual y de audio, continuidad y de qué escenas continúan. Planos con duración, descripción, dirección visual, sujeto, personajes, objetos, acciones, diálogo, audio, referencias, continuidad, dependencias, calidad y prompt avanzado |
| `characters` / `locations` / `objects` | Fichas descriptivas con `AppearanceProfile` (rostro, pelo, cuerpo, vestuario, accesorios, maquillaje, materiales, colores, luz, estilo visual, entorno), referencias y, si ya son Elements de la cuenta, su `ElementBinding` |
| `references` | Materiales que la producción usa, señalados por `assetId` o por Element —**nunca por URL**—, con su tipo y su papel (estilo, personaje, primer fotograma…) |
| `audio` | La voz del narrador y los sonidos (`music`, `sfx`, `ambience`) con su tramo. La voz de cada personaje está en su ficha; el diálogo, en escenas y planos |
| `continuity` | Reglas que valen para toda la producción |
| `generation` | Preferencias, no órdenes: calidad y vista previa (`frames`) |
| `editPlan` / `exportPlan` | Mezcla por pista, subtítulos y marcas; entregas con formato, resolución, duración máxima, modo de subtítulos y destino |
| `metadata` | `revision` (sube uno con cada operación que cambia algo), idioma de trabajo y etiquetas |

Algunas decisiones de forma:

- **Un solo espacio de ids** para toda la producción, con la forma de los ids de planos del Core
  (`[A-Za-z0-9_-]{4,128}`). Así una ruta como `scenes.sc01.shots.sh03` señala una sola cosa.
- **`order` es la posición**, desde 0, como en `SceneNode`/`ShotNode`. La persona ve «Escena 1»:
  `escenaPorNumero` y `planoPorNumero` traducen el número humano.
- **Una escena con planos dura lo que suman**; si además declara su duración, las dos cifras tienen que cuadrar
  (tolerancia de 50 ms) y las operaciones la mantienen al día. Una escena sin planos se genera entera, como un
  plano implícito.
- **Una línea de diálogo vive en un solo sitio**: en su plano, o en la escena si aún no tiene plano.
  `dialogue` se ve hablar, `voiceover` se oye sin verse y `narration` es del narrador.
- **Lo que no se repite**: la luz, la composición, el encuadre y la transición son de `CreativeParameters`;
  el momento del día es una hora (`dawn`…`night`) y no un tipo de luz; la calidad es la de `ExecutionHints`;
  las proporciones, las relaciones espaciales, las fuerzas de continuidad y los tipos de material son los del Core.

### Lo que vale en cada plano

`creativoEfectivo` completa lo del plano con lo de su escena y después con lo de la producción, con
`completarCreativos` del Core (lo más cercano manda). El encuadre es siempre el formato. Una cámara quieta no
hereda velocidad: es la regla de coherencia del Core.

`continuidadEfectiva` decide cada aspecto por el nivel más cercano que hable de él: si una escena libera la ropa,
eso manda sobre la producción que la conservaba. Los anclajes y las relaciones espaciales se suman.

## Validación

Códigos, no frases. Cada problema es `{ code, severity, path, parameters, messageKey }` y `messageKey` es
`filmmaker.validation.<code>`: la interfaz de F1-C pondrá la frase en el idioma de quien mira.

Dos etapas: en `draft`, lo que falta es un aviso; en `ready`, lo que impide producir es un error. La forma rota
—un campo desconocido o prohibido, un id repetido o inválido, una referencia colgando, un ciclo, una duración
imposible— es un error en las dos.

| Grupo | Códigos |
|---|---|
| Forma | `shape_invalid`, `field_unknown`, `field_forbidden`, `value_invalid`, `id_invalid`, `id_duplicated`, `order_mismatch`, `format_invalid`, `duration_invalid`, `limit_exceeded` |
| Referencias | `reference_dangling`, `reference_duplicated`, `reference_source_missing`, `relation_missing` |
| Dependencias | `dependency_cycle`, `dependency_invalid` |
| Coherencia | `constraints_incompatible` |
| Etapa | `production_empty`, `scene_duration_missing`, `shot_duration_missing`, `scene_duration_mismatch`, `duration_total_mismatch` |

**Lo que un nodo no puede llevar** es lo que ya prohíbe el Core: `claveProhibidaDeNodo` (proveedor, modelo,
semilla, prompt, URL, credenciales, bytes, vectores…), importada y aplicada en cada nodo de la producción, sin
cambiar la regla. La única excepción es `advanced.prompt` de un plano: el prompt avanzado es texto de la persona,
vive aparte y nunca pasa a un `ShotNode`.

## Operaciones

Un lenguaje cerrado y tipado. Cada operación comprueba que tiene sentido, se aplica sin tocar la producción de
entrada, comprueba que el resultado no está roto y dice qué queda **posiblemente** pendiente de rehacer.

| Grupo | Operaciones |
|---|---|
| Escenas | `add_scene`, `remove_scene`, `reorder_scene`, `duplicate_scene`, `split_scene`, `merge_scenes` |
| Planos | `add_shot`, `remove_shot`, `reorder_shot`, `duplicate_shot`, `split_shot`, `merge_shots` |
| Tiempo | `extend_duration`, `shorten_duration`, `change_target_duration` |
| Cómo se ve | `change_camera`, `change_movement`, `change_lighting`, `change_style`, `change_weather`, `change_time_of_day`, `change_location`, `change_subject`, `edit_text` |
| Quién sale | `replace_character`, `set_character_state`, `replace_reference` |
| Diálogo | `add_dialogue`, `change_dialogue`, `remove_dialogue` |
| Audio, formato y entregas | `modify_audio`, `change_format`, `change_export` |

Reglas del lenguaje:

- **Todo o nada**: `aplicarOperaciones` aplica un lote entero o no aplica ninguna, y dice cuál falló.
- **Ámbito**: cambiar la cámara, la luz o el estilo en un ámbito (producción, escena, plano) lo hace valer en todo
  lo que contiene: se quitan las anulaciones más cercanas de esas mismas rutas.
- **Nada destructivo sin confirmar**: quitar una escena o un plano que se llevaría un sonido o una marca se para
  y dice qué se perdería; con `cascade: true` se quita y se informa. Las dependencias que apuntaban a lo quitado
  se sueltan solas, y quien dependía queda pendiente.
- **Ids nuevos derivados** (`sc01-2`, `sc01-3`…), o los que se pidan si están libres. Sin azar.
- **La revisión** sube uno por cada operación que cambia algo; una que no cambia nada no la sube.

Weë Brain hablará este idioma en F2. Ejemplo: «en la escena 3 quiero que la cámara se acerque lentamente al rostro
mientras empieza a llover» son tres operaciones (`change_movement` con `push_in` y `slow` en el ámbito de la escena,
`change_subject` con `focus: face`, `change_weather` con `rain`). F1-A no interpreta lenguaje ni llama a ningún
modelo: solo define el idioma y sus garantías.

### Lo pendiente de rehacer

No hay una regla por operación. Se calcula la **firma** de cada cosa que se genera —todo lo que influye en su
resultado, ya resuelto: la intención creativa efectiva, las fichas completas de quién y qué sale, las referencias,
la continuidad, lo que se dice a cámara, el formato y la dirección— antes y después. Queda pendiente lo que
cambió, lo nuevo y lo que depende de ello (por `dependsOn`, escena a escena, y el plano que continúa al anterior
si conserva `temporal.previousShot`). Las voces y los sonidos se calculan igual. Es un cálculo, no un estado:
no se marca nada como `stale`.

## Recomendaciones

Deterministas, sin IA, con sus umbrales a la vista (`HEURISTICAS`, `RITMO_DE_HABLA`). Cada una trae código,
gravedad, ruta, parámetros y **propuestas**: alternativas escritas como operaciones, probadas antes de ofrecerse.
Ninguna se aplica sola.

| Código | Cuándo |
|---|---|
| `too_many_scenes_for_duration` | Menos de 2 s por escena. Propone alargar el objetivo o juntar escenas |
| `dialogue_exceeds_duration` | Lo que se dice no cabe en el plano o en la escena (estimado, y se dice que lo es) |
| `audio_longer_than_video` | Un sonido más largo que su tramo |
| `character_continuity_inconsistent` | Un vestuario fijado que se cambia, o ropa distinta entre dos planos seguidos |
| `scene_without_shots` | Una escena sin planos |
| `shot_too_short_for_actions` | Menos de 1,5 s por acción |
| `requirements_incompatible` | Una entrega que exige reencuadrar o reescalar |
| `setting_changes_in_continuation` | Una escena que continúa otra y cambia de sitio, hora o clima |
| `duration_off_target` | Más de un 20 % de desvío de un objetivo que solo orienta |

## Requisitos

`requisitosDeProduccion` solo traduce una producción `ready`. Produce:

- **Borradores del Core**: la parte de dominio de `SceneNode` y `ShotNode`. Con lo que pone quien guarda (cuenta,
  proyecto, horas), `validarEscena` y `validarPlano` del Core los aceptan tal cual. Ni `ShotNode` ni ningún otro
  contrato se ha modificado para ello. El prompt avanzado no llega a ningún borrador.
- **Requisitos** con capacidad del catálogo, entrada, salida esperada (la que el catálogo dice que produce),
  duración, formato, referencias, calidad pedida, continuidad exigida y orden:

| Qué | Capacidad |
|---|---|
| Un plano con primer fotograma / con imágenes de referencia / solo descrito | `video.image_to_video` / `video.reference` / `video.generate` |
| Una línea de diálogo, voz en off o narración | `voice.tts` |
| Música / efectos / ambiente | `music.generate` / `audio.sfx` / `audio.generate` |
| Fotograma de vista previa (si `generation.preview = 'frames'`) | `image.reference` / `image.generate` |
| Montar varios planos y el audio; cortar una entrega | `video.montage` |
| Subtítulos | `subtitle.generate` |
| Pasar a vertical / reencuadrar a otra proporción, grabar subtítulos | `video.vertical` / `video.compose` |

- Lo que haría falta y **el catálogo no tiene** (hoy: reescalar vídeo) se declara `capability_not_in_catalog`.
  No se inventa una capacidad.
- Un **resumen por capacidad** (cuántas y cuántos segundos) para que una fase posterior pueda cotizar. Sin precios.
- La **línea de tiempo** y las **tarjetas de storyboard** (descripción, duración, tipo de plano, cámara, lo que se
  dice, y qué le falta). La miniatura será la vista previa del plano; el estado de la tarjeta es creativo
  (`complete`/`incomplete`), no el de ningún trabajo.

Que una capacidad esté en el catálogo no significa que hoy se pueda servir: música y efectos están pendientes y el
montaje no tiene quien lo sirva. Decirlo es del Registry, no de Filmmaker.

## Responsabilidades y fronteras

Filmmaker **produce**: intención creativa, plan de producción, requisitos de escena, de plano y de capacidad.

Filmmaker **no es**:

- **otro Brain**: interpretar lo que la persona dice es de Weë Brain, que en F2 hablará el idioma de las operaciones;
- **otro Planner**: decidir cómo se ejecutan los requisitos es del Planner y del Router;
- **otro Workflow ni otro Orchestrator**;
- **otro Job Engine**: no crea trabajos ni estados de ejecución;
- **otro Credit Engine**: no cobra ni pone precio;
- **un motor de render**.

**Proveedores**: ni uno nombrado, ni en el código ni en los comentarios. Las capacidades son las del catálogo del
Core y los requisitos dicen QUÉ, nunca CON QUÉ.

**Credits**: F1-A no cobra, no calcula precios y no toca el Credit Engine. El resumen por capacidad es lo que una
fase posterior cotizará.

**Jobs**: F1-A no crea trabajos ni cambia el Job Engine. Lo pendiente de rehacer es un cálculo, y la preparación de
una tarjeta de storyboard es un estado creativo, separado del ciclo de vida de un trabajo.

**Scenes/Shots del Core**: `SceneNode` y `ShotNode` no se modifican ni se sustituyen. Filmmaker compone sus
contratos (`CreativeParameters`, `ContinuityRequirements` derivado, `ElementBinding`, `claveProhibidaDeNodo`) y
traduce a borradores que el Core acepta.

## Decisiones (ADR)

**ADR-FM-001 · Alcance de F1-A.** F1-A es un módulo propio, `functions/src/filmmaker/`, sin «Engine» en ningún
nombre y sin exportarse. **No cambia**: el contrato 1.12 del Algorithm Engine ni A0–A9, S2 y sus decisiones,
`ShotNode`/`SceneNode` ni ningún contrato del Core (SHOT 1.0, CONTINUITY 1.0, CREATIVE 1, ELEMENT 1.0), los
proveedores ni sus adaptadores, la ejecución (runtime, canaries, asíncrono, webhooks), el Credit Engine, el Job
Engine, Firestore, las reglas, los índices, la interfaz ni producción. No introduce un Brain ni un Planner nuevos.
Fuera de `functions/src/filmmaker/`, F1-A solo añade este documento y `functions/test/filmmaker-modelo.test.mjs`, y una
línea en `functions/package.json` para que esa suite entre en la cadena de `npm test`.

**ADR-FM-002 · Componer los contratos del Core, no copiarlos.** El modelo usa `CreativeParameters`, deriva
`ContinuityRule` de `ContinuityRequirements` (mismos aspectos, fuerza y listas; anclajes con ids de la producción),
usa `ElementBinding`, `AssetKind`, la calidad de `ExecutionHints` y la forma de id de los planos. Lo que el Core ya
nombra no tiene un segundo vocabulario aquí.

**ADR-FM-003 · Lo derivado se deriva.** Los requisitos, la línea de tiempo, las tarjetas y lo pendiente de rehacer se
calculan desde la producción y no se guardan en ella: así no pueden desfasarse.

**ADR-FM-004 · El prompt avanzado, en un solo sitio.** `shot.advanced.prompt` es el único lugar donde se admite la
clave `prompt`; no admite semilla, modelo ni proveedor, no entra en `creative` y no llega a ningún `ShotNode`.
Solo viaja al requisito de su plano. Cómo se guarda, cómo se enseña y cómo se usa al generar sigue pendiente (D9).

### Decisiones de dominio tomadas en F1-A

- La transición de un plano (`creative.transition.type`) es la que lo une con el **siguiente**.
- Una escena con planos se alarga o se acorta por su **último** plano.
- Al dividir un plano, el diálogo se queda en la primera parte; al dividir una escena, sus líneas sin plano se
  quedan en la primera y los sonidos que la cubrían pasan a cubrir las dos.
- Ambiente → `audio.generate`; efectos → `audio.sfx`. Es un mapeo a capacidades que ya existen; el Planner puede
  cambiarlo sin tocar Filmmaker.
- Las duraciones de los presets son valores por defecto de Weë, editables, no límites de ninguna plataforma.
- Una escena que continúa otra propaga lo pendiente, pero no impone orden de generación: eso es del Planner.

## Decisiones aplazadas

Las catorce decisiones de la auditoría siguen **pendientes**. F1-A no resuelve ninguna por adelantado:

| # | Decisión | Estado |
|---|---|---|
| D1 | Nombre visible y en código | pendiente (el módulo se llama `filmmaker`, sin «Engine») |
| D2 | Dónde vive la producción (reutilizar `scenes`/`shots` o un agregado propio) | pendiente: los borradores sirven para las dos opciones |
| D3 | Entrada en Weë Studio | pendiente |
| D4 | Ejecución por plano | pendiente |
| D5 | Vídeo asíncrono | pendiente |
| D6 | Weë Brain para intención y cambios | pendiente: el idioma de las operaciones ya existe |
| D7 | Montaje y render | pendiente |
| D8 | Duración y publicación (Weëls ≤ 15 s) | pendiente |
| D9 | Prompt avanzado: guardarlo, enseñarlo y usarlo | pendiente (solo está decidido dónde vive en el dominio, ADR-FM-004) |
| D10 | Identidad de personajes | pendiente: sin biometría ni embeddings |
| D11 | Precios, límites y cancelación | pendiente: no hay precios en F1-A |
| D12 | Versiones y «restaurar» | pendiente: ids estables y `revision` lo permiten |
| D13 | Reproductor | pendiente |
| D14 | Vocabulario de cámara v2 (extreme wide, full, MCU, over-the-shoulder, insert, zoom, rack focus, leading lines) | pendiente: se usa el vocabulario actual del Core |

## Lo que el lenguaje aún no tiene

Añadir, editar o quitar personajes, lugares, objetos y referencias; cambiar la dirección creativa de la producción
(salvo estilo, cámara, movimiento y luz); cambiar una transición; mover un plano a otra escena. No los pide F1-A y
entrarán cuando una fase los necesite (F1-C, F2).

## Próximas fases

| Fase | Cómo usa este dominio |
|---|---|
| F1-B | Guarda la producción (D2) y aplica operaciones en el servidor, con `revision` para no pisar cambios |
| F1-C | Pinta el storyboard con las tarjetas y traduce los `messageKey` a frases en todos los idiomas |
| F1-D | Genera un plano a partir de su requisito (D4) |
| F2 | Weë Brain convierte lo que se dice en operaciones y enseña las recomendaciones |
| F3 | Personajes y continuidad: fichas, `ElementBinding` y apariencia |
| F4 | Generación de varios planos, con los requisitos y el resumen por capacidad para cotizar |
| F5 | Línea de tiempo, audio y montaje sobre los requisitos de ensamblado |
| F6 | Director avanzado: prompt avanzado (D9), versiones (D12) |

## Pruebas

`functions/test/filmmaker-modelo.test.mjs` (con `npm run build` antes): modelo, formatos y presets, validación,
operaciones, lo pendiente, recomendaciones, requisitos contra los validadores del Core, fronteras y determinismo.
La batería de sabotajes de F1-A se ejecuta como las de S2, con el mismo corredor externo; llevar las baterías al
repositorio es una decisión aparte, todavía abierta.
