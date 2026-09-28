# Weë Filmmaker — la producción: su dominio (F1-A), su persistencia (F1-B) y su interfaz (F1-C)

> Estado: **F1-A y F1-B construidas; la callable `productions`, conectada y sin desplegar**. F1-A es un dominio
> puro: no guarda, no genera, no cobra y no tiene interfaz; vive en `functions/src/filmmaker/`. F1-B lo guarda:
> `functions/src/productions/`, con reglas e índice **preparados y sin desplegar**, y la callable `productions`, que
> `functions/src/index.ts` **exporta** y el mapa del runtime declara (35 Functions al conectarla, ADR-FM-010; 37 desde
> la Fase 8 del Filmmaker Engine, que añade `renders` y `renderWorker`). Pruebas:
> `functions/test/filmmaker-modelo.test.mjs` y `functions/test/productions-runtime.test.mjs`, dentro de la cadena de
> `npm test`, y `functions/test/productions.emulator.mjs` y `functions/test/productions-callable.emulator.mjs`, fuera
> de ella.
>
> **F1-C construida, sin desplegar**: la producción en la app, dentro de Weë Studio —«Varias escenas»—: el servicio de
> cliente (`services/filmmakerService.ts`), el espejo generado del dominio, el estado optimista con CAS, el storyboard,
> la línea de tiempo y el panel Director, en los once idiomas. No genera, no cobra y no llama a ningún proveedor.

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
- **La revisión** sube uno por cada operación que cambia algo; una que no cambia nada no la sube. Eso es en
  memoria: **guardada** (F1-B), la revisión cuenta lotes confirmados y sube una sola vez por lote.

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
(Desde la Fase 8 del motor, el montaje lo sirve el render propio —una tarea general del Job Engine, no una capacidad
del Router—; sin desplegar.)

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
Solo viaja al requisito de su plano. Cómo se guarda lo decide ADR-FM-008 (F1-B); al generar se usa desde la Fase 13
del Filmmaker Engine (abajo); cómo se enseña y cómo se edita siguen pendientes (D9).

**ADR-FM-005 · D2: la producción es un agregado propio, `productions`.**

- *Contexto.* F1-A dejó el dominio sin sitio donde vivir. La auditoría de F1-B comprobó que las `scenes`/`shots`
  del Core no sirven como storyboard: su esquema es cerrado (un `ShotNode` no admite duración, diálogo, acciones,
  sujeto, estados, referencias, calidad ni audio), prohíben el prompt por diseño, `actualizarPlano` sube la versión
  en cualquier cambio —también al reordenar—, sus ids son globales, `shots` no usa transacciones, la lectura se
  corta en 50 escenas y un plano no se borra, solo se archiva.
- *Decisión.* `productions/{productionId}` guarda la producción sin sus escenas y su sobre;
  `productions/{productionId}/productionScenes/{sceneId}`, cada escena con sus planos. La producción es la **verdad
  creativa**. Las `scenes`/`shots` del Core se reutilizarán en F1-D como unidades de generación —la foto de lo que
  se pidió generar—, nunca al revés. `ShotNode` no se toca y SHOT sigue en 1.0: ningún consumidor necesita los
  campos del storyboard dentro de un `ShotNode` (la duración es un `ExecutionHint`, el diálogo es un requisito de
  voz, el prompt está prohibido, la relación con la producción es `projectId = productionId`).
  `FILMMAKER_MODEL_VERSION` sigue en 1.
- *Consecuencias.* Impacto en el Core: cero. Un bloque de reglas y un índice nuevos. Leer una producción cuesta
  1 + S lecturas (S ≤ 200). Los ids de escenas y planos son locales, así que duplicar es copiar. F1-D tendrá que
  derivar ids globales deterministas para los nodos del Core.
- *Alternativas descartadas.* Guardar el storyboard en `scenes`/`shots` (por lo de arriba); un solo documento
  gigante (1 MiB no da para una producción real); un documento por plano (hasta 1000 escrituras por lote, por encima
  de las 500 de una transacción); subir SHOT a 1.1 (no hay consumidor que lo necesite, y el prompt seguiría
  prohibido).

**ADR-FM-006 · Concurrencia: una revisión por lote, con CAS.**

- *Contexto.* Dos pestañas, la interfaz de F1-C y Weë Brain en F2 pueden cambiar la misma producción a la vez. Sin
  control, el último en escribir borraría en silencio lo del otro (`shots` hoy es así).
- *Decisión.* `metadata.revision` sube una vez por lote confirmado. `apply` lleva `expectedRevision`, que se compara
  dentro de la MISMA transacción que escribe; si no coincide, `revision_conflict` (`aborted`, con
  `currentRevision`) y no se escribe nada. Todo un lote va en una transacción —raíz, escenas que cambian, escenas
  que se quitan y la entrada del registro— y respeta el límite de 500 escrituras. Un lote que no cambia nada no
  escribe. `operationId` reconoce reintentos: el mismo lote se devuelve como `alreadyApplied`.
- *Consecuencias.* Ante un conflicto, el cliente recarga y vuelve a aplicar lo suyo, que es determinista (F1-C). La
  raíz se escribe en cada lote: la interfaz tendrá que agrupar cambios. Cada lote lee la producción entera
  (≤ 20 MB, ~300 ms para 50 operaciones sobre 1000 planos, medido).
- *Alternativas descartadas.* El último gana; fusionar campo a campo (se saltaría la validación del agregado);
  una revisión por escena (rompería las reglas que cruzan escenas); contar operaciones como hace el dominio en
  memoria (se decidió una revisión por lote).

**ADR-FM-007 · Un registro pequeño para poder restaurar.**

- *Contexto.* D12 pide historia y la posibilidad de restaurar una revisión, sin un sistema de versiones gigante.
- *Decisión.* `productions/{productionId}/productionRevisions/{revisión}`, solo se añade (`create`, nunca `set`):
  la revisión 0 es la foto entera (`create` o `duplicate`) y cada revisión siguiente, el lote que la produjo, tal
  como se aplicó. Cada entrada lleva revisión, `operationId`, tipo, lote o foto, hora, cuenta y actor, versión del
  modelo y `result` (huella sha256, escenas, planos, operaciones aplicadas, si cambió el montaje). No lleva nada
  de proveedores, ni credenciales, ni lo pendiente —que se calcula—. `reconstruirRevision` rehace cualquier
  revisión con la foto y los lotes y comprueba la huella en cada paso. Duplicar no copia el historial: la copia
  empieza su revisión 0 con su propia foto y dice de dónde viene (`source`). Archivar no es una revisión.
- *Consecuencias.* Restaurar será posible en F6 sin rehacer nada aquí. La foto tiene que caber en un documento: una
  producción de más de 1 MB en total no se puede duplicar hasta que F6 parta las fotos. Leer el registro se corta
  en 1000 entradas (F6: fotos intermedias). Reconstruir depende del determinismo de F1-A y de la versión del modelo,
  que cada entrada guarda.
- *Alternativas descartadas.* Una foto entera por revisión (tamaño y coste); el registro como única verdad
  (cada lectura tendría que rehacerlo todo); guardar lo pendiente (es derivado); copiar el historial al duplicar
  (límite de escrituras y un significado confuso); ramas (nadie las pidió).

**ADR-FM-008 · El prompt avanzado, guardado dentro de la producción (D9, en parte).**

- *Contexto.* D9 se aprobó en su parte de guardar: `shot.advanced.prompt` tiene que conservarse, ser solo de su
  dueño y servir en F6, sin cambiar todavía cómo se genera.
- *Decisión.* Se guarda donde el dominio lo pone —en su plano, dentro del documento de la escena— y viaja en el
  registro cuando un lote lo trae. Lo valida el dominio (opcional, texto, ≤ 4000 caracteres, solo la clave
  `prompt`: un prompt negativo, un modelo o un prompt fuera de `advanced` son `field_forbidden`). Solo lo lee su
  dueño. Nunca aparece en una lista, nunca entra en `ShotNode` ni en un contrato del Core, este módulo no escribe
  registros de ejecución (ni `console` ni `logger`) y en F1-B no llega a ningún proveedor.
- *Consecuencias.* F6 podrá usarlo. La generación no cambia: `requisitos.ts` sigue llevándolo solo al requisito de
  su plano (ADR-FM-004). Es contenido de la persona: no se traduce.
- *Alternativas descartadas.* Una colección aparte para los prompts (otra verdad y otra regla); no guardarlo (se
  perdería trabajo de la persona); cifrarlo aparte (Firestore ya cifra en reposo y no hay una necesidad que lo
  justifique hoy).

**ADR-FM-009 · La callable existe y NO está conectada.**

- *Contexto.* Exportar una Function nueva cambia lo que producción expone —el mapa del runtime cuenta 34— y todavía
  no hay interfaz que la use.
- *Decisión.* `productions` vive en `functions/src/productions/puerta.ts`, con el patrón del repositorio (una
  callable y un campo `op`: `create`, `get`, `list`, `apply`, `archive`, `unarchive`, `duplicate`), y **no** se
  exporta desde `functions/src/index.ts`. El mapa del runtime sigue en 34. Reglas e índice quedan preparados, sin
  desplegar.
- *Consecuencias.* Nada en producción puede llamarla. Conectarla es un paso aparte y autorizado: exportarla,
  declararla en `runtime-map` (34 → 35) y desplegar reglas, índice y Function. Mientras tanto se prueba directamente
  (`atenderProducciones` y `.run` con una base de mentira) y contra el emulador.
- *Alternativas descartadas.* Conectarla ya (superficie nueva sin interfaz ni autorización); un endpoint HTTP aparte
  (otra forma de autenticar); una callable por operación (repetiría la resolución de la cuenta siete veces).
- *Actualización.* La conexión se autorizó después y se hizo como paso aparte, sin desplegar: ADR-FM-010.

**ADR-FM-010 · La conexión de `productions`, y lo que pone en producción.**

- *Contexto.* F1-C tiene que poder llamar a `productions`, también en el emulador de Functions, que solo sirve lo que
  `functions/src/index.ts` exporta. Exportarla vuelve vivo el dominio de F1-A que la puerta usa —`modelo`,
  `validacion` y `operaciones`—, y `runtime-map` no solo cuenta Functions: fija, módulo a módulo, qué símbolos del
  Core nombra el código que se despliega. La conexión los cambia, y eso se autorizó uno por uno.
- *Decisión.* `productions` se exporta desde `functions/src/index.ts` en una línea, junto a `elements` y `shots`.
  `runtime-map` la declara (34 → 35) y amplía EXACTAMENTE cinco listas de símbolos del Core, conservando lo que ya
  tenían:

  | Lista | Lo que añade la conexión |
  |---|---|
  | `asset` | `TIPOS_DE_MATERIAL` |
  | `core/creative.js` | `completarCreativos`, `validarCreativos`, `versionCreativaActual`, `PROPORCIONES`, `RUTAS_CREATIVAS`, `valorCreativo` |
  | `core/shot.js` | `claveProhibidaDeNodo`, `FORMA_DE_ID_DE_PLANO`, `MAX_NOMBRE_DE_ESCENA`, `MAX_NARRATIVA`, `MAX_ELEMENTOS_POR_NODO`, `MAX_DEPENDENCIAS_DE_PLANO` |
  | `core/continuity.js` | `validarContinuidad`, `ASPECTOS_DE_CONTINUIDAD`, `FUERZAS_DE_CONTINUIDAD`, `RELACIONES_ESPACIALES`, `MAX_ANCLAJES`, `MAX_RELACIONES_ESPACIALES` |
  | `core/language.js` | `normalizarEtiqueta` |

  Son vocabularios, límites y validadores puros; `completarCreativos` resuelve en memoria la intención creativa
  efectiva de cada plano para calcular lo pendiente de rehacer. Una valla nueva fija que la conexión pone en
  producción estos veinte y ninguno más, cada uno de su módulo, y que carga cinco módulos: la puerta, el almacén y
  tres del dominio. Nada se despliega.
- *Consecuencias.* El runtime compilado y el emulador la sirven con sus guardas (`productions-callable.emulator.mjs`).
  Ningún motor cambia de estado: no se invoca ninguna fábrica ni se carga ninguna composición nueva. La frase de
  `runtime-map` que decía que producción no compone intención creativa se corrigió: ahora la completa, en memoria,
  sin generar nada. `requisitos` y `recomendaciones` siguen fuera de la ruta. F1-A no cambia. Desplegar la
  Function, las reglas y el índice es otro paso, con su propia autorización.
- *Actualización (F1-C, autorizada).* La valla G12 de F1-A decía que el compilado no carga Filmmaker y solo miraba el
  texto de `lib/index.js`. Ahora recorre su grafo de `require` y comprueba lo que de verdad protege: el dominio se
  carga SOLO a través de `productions`, y solo `modelo`, `validacion` y `operaciones`.
- *Alternativas descartadas.* Cargarla de forma perezosa para que la valla no viera el dominio (le escondería el
  cambio); ampliar las listas sin fijar cuáles son los veinte (un símbolo veintiuno pasaría en silencio); desplegar a
  la vez (necesita su propia autorización).

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

De las catorce decisiones de la auditoría, F1-B resolvió D2 y D12 (mínima) y D9 en parte, con autorización; F1-C
resolvió D1 y D3, y F1-D resolvió D4 y D5 y, en parte, D8 y D11, cada una con la autorización de su fase. Las demás
siguen **pendientes**:

| # | Decisión | Estado |
|---|---|---|
| D1 | Nombre visible y en código | **decidida** en F1-C: `filmmaker` en el código, sin «Engine»; «Varias escenas» a la vista y «Director» para el modo que dirige |
| D2 | Dónde vive la producción (reutilizar `scenes`/`shots` o un agregado propio) | **decidida** en F1-B (ADR-FM-005): `productions` + `productionScenes`; el Core será la unidad de generación en F1-D |
| D3 | Entrada en Weë Studio | **decidida** en F1-C: dentro de Videos, «Varias escenas» abre la producción desde la caja del Studio; un solo clip sigue yendo a CreatorFlow |
| D4 | Ejecución por plano | **decidida** en F1-D: una toma de UNA unidad —un plano, o una escena sin planos— por `generateVideo` con el plano, hacia el Core; sin lotes |
| D5 | Vídeo asíncrono | **decidida** en F1-D: el camino asíncrono del Core (PRE-F1-D), un intento, los plazos de `plazos.ts`; la app escucha la reserva de Credits de la toma |
| D6 | Weë Brain para intención y cambios | **decidida** en la Fase 9 del motor (2026-09-28): `brainChat` con la producción abierta como contexto; propone operaciones de F1-A comprobadas en memoria y la persona las aplica por `productions`; mismo precio, camino de siempre |
| D7 | Montaje y render | **decidida** en la Fase 8 del motor (2026-09-28): FFmpeg propio (`ffmpeg-static`) como tarea general del Job Engine; el resultado, material `asset_` de la cuenta más un registro en la producción; gratis con cinco al día; exportar o publicar el montaje, pendiente (D8) |
| D8 | Duración y publicación (Weëls ≤ 15 s) | **en parte**: una toma dura de 4 a 15 s —lo pedido se enseña junto a lo generado, y más de 15 s se rechaza proponiendo dividir—; publicar, pendiente |
| D9 | Prompt avanzado: guardarlo, enseñarlo y usarlo | **en parte**: guardarlo, decidido (ADR-FM-008); **usarlo al generar, decidido en la Fase 13 del motor** (2026-09-28): se AÑADE detrás del texto de Weë, que no cambia, en un bloque fijo en la última línea, entero, sin enlaces ni órdenes de proveedor (plantilla `fm-plano-2`); enseñarlo (un modo avanzado oculto) y editarlo (`update_shot` sigue con `not_editable_yet`), pendientes |
| D10 | Identidad de personajes | **decidida** en la Fase 10 del motor (2026-09-28): vínculo verificado a un Element de la cuenta; la identidad al generar sigue siendo lo escrito en la ficha; imágenes de referencia, más adelante con su canary; sin biometría ni embeddings |
| D11 | Precios, límites y cancelación | **en parte**: el precio es una cotización del Credit Engine antes de generar, el cupo es el de Weë Studio (12 vídeos al día) y un duplicado no cobra ni gasta cupo (F1-D); cancelar, pendiente |
| D12 | Versiones y «restaurar» | **decidida** en la Fase 12 del motor (2026-09-28), sobre su parte mínima (ADR-FM-006 y 007): restaurar es volver a una revisión anterior como una revisión NUEVA (`restore`), con CAS, sin perder ninguna; enseñarlo en la app, en el pase de UX |
| D13 | Reproductor | pendiente: «Ver vídeo» abre la dirección del material |
| D14 | Vocabulario de cámara v2 (extreme wide, full, MCU, over-the-shoulder, insert, zoom, rack focus, leading lines) | pendiente: se usa el vocabulario actual del Core |

## Lo que el lenguaje aún no tiene

F1-A no tenía cómo añadir, editar o quitar personajes, lugares, objetos y referencias, cambiar la dirección creativa
de la producción, cambiar una transición ni mover un plano a otra escena. Lo tiene desde la fase 1 del Filmmaker
Engine (abajo). Queda fuera, a propósito: **cambiar el prompt avanzado** (se guarda desde F1-B, ADR-FM-008; editarlo
es de F6 y `update_shot` lo rechaza con `not_editable_yet`). **Vincular una ficha a un Element de la cuenta** se puede
desde la fase 10 del Filmmaker Engine (F3, abajo): guardar comprueba el Element.

## F1-B · La producción, guardada

Construida, probada y **conectada, sin desplegar**: `functions/src/productions/index.ts` (el almacén) y
`functions/src/productions/puerta.ts` (la callable `productions`, que `functions/src/index.ts` exporta; ADR-FM-010). No genera,
no cobra, no crea trabajos, no toca `scenes`/`shots` del Core, ni Elements, ni proveedores.

### Dónde vive

| Ruta | Qué guarda |
|---|---|
| `productions/{productionId}` | La producción **sin** sus escenas —todo `FilmmakerProduction` salvo `scenes`— y su sobre: `ownerAccountId`, `status` (`active`/`archived`), `createdAt`, `updatedAt` y, archivada, `archivedAt` (milisegundos, como el Core) |
| `productions/{productionId}/productionScenes/{sceneId}` | Una `ProductionScene` entera, con sus planos (≤ 100) y su prompt avanzado, más `ownerAccountId` y `productionId` para que las reglas no lean la raíz |
| `productions/{productionId}/productionRevisions/{revisión}` | El registro: una entrada por revisión, con el número en el id (`0000000000`…), que solo se añade |

- El id de una producción lo genera el cliente al azar (`[A-Za-z0-9_-]{20,128}`, como un id automático de
  Firestore; los `__…__` están reservados). Los de escenas, planos y fichas son locales a la producción.
- **El documento es el contrato**: todo lo que entra y lo que sale pasa por `integridad()` de F1-A. Una producción
  guardada que no la pasa es `production_corrupted` para su dueña; para cualquier otra cuenta, no existe.
- Lo derivado no se guarda (ADR-FM-003): ni lo pendiente, ni la línea de tiempo, ni los requisitos, ni contadores.

### La puerta

| `op` | Qué hace |
|---|---|
| `create` | Una producción vacía (`title` + `aspectRatio`/`resolution`, o `preset`) o una entera como borrador (`production`), en la revisión 0. Crear dos veces lo mismo devuelve la que hay; el mismo id con otra cosa, `production_id_taken` |
| `get` | La producción entera y su sobre: la raíz y sus escenas (≤ 201 lecturas) |
| `list` | Resúmenes —sin escenas, planos ni prompts— de una cuenta y un estado (`active` por defecto), `updatedAt` descendente, ≤ 50 por página, cursor `after` |
| `apply` | `{ productionId, expectedRevision, operations[], operationId? }` → las operaciones de F1-A, todo o nada, con CAS; devuelve la producción, la revisión, lo pendiente y `timelineChanged` |
| `archive` / `unarchive` | Cambian el sobre: no borran nada ni tocan la revisión. Repetirlo es un no-op (`changed: false`) |
| `duplicate` | Otra producción de la misma cuenta (`newProductionId`), activa y en su revisión 0, con `title` opcional; no copia materiales, Elements ni nodos del Core |

La cuenta sale **siempre** de la sesión (`cuentaDelPrincipalEnWee`); lo de otra cuenta contesta igual que lo que no
existe. Los errores no llevan frases: `message` es el código y `details` trae `code`, `messageKey`
(`filmmaker.persistence.<código>`) y los problemas del dominio con sus propias claves.

| Código | Callable |
|---|---|
| `production_not_found` | `not-found` |
| `revision_conflict` (con `currentRevision`) | `aborted` |
| `production_archived`, `history_too_long` | `failed-precondition` |
| `production_id_taken`, `operation_id_reused` | `already-exists` |
| `production_corrupted`, `history_broken` | `data-loss` |
| el resto (`production_invalid`, `operations_invalid`, `reference_rejected`, `element_binding_rejected` desde F3, tamaños, ids…) | `invalid-argument` |

### Revisión, CAS y registro

Ver ADR-FM-006 y ADR-FM-007. En corto: una revisión por lote; `expectedRevision` se compara en la transacción que
escribe; un lote sin cambios no escribe ni deja entrada; el mismo `operationId` con el mismo lote es un reintento
(`alreadyApplied`) y con otro, `operation_id_reused`; la revisión 0 es la foto y las siguientes, los lotes;
`leerRegistro` + `reconstruirRevision` rehacen cualquier revisión comprobando su huella. Restaurar existe desde la
Fase 12 del Filmmaker Engine (abajo): una revisión nueva de tipo `restore`.

Archivada, una producción se lee, se lista entre las archivadas, se duplica y se desarchiva; no admite lotes.

### Límites

| Qué | Cuánto | Código |
|---|---|---|
| Operaciones por lote | 50 | `operations_too_many` |
| Un documento | 1 000 000 bytes (Firestore admite 1 MiB) | `document_too_large` |
| Una producción entera (raíz y escenas) | 20 000 000 bytes | `production_too_large` |
| Una transacción | 500 escrituras y 9 000 000 bytes | `transaction_too_large` |
| Una página de la lista | 50 | `list_query_invalid` |
| El registro leído de una vez | 1000 entradas | `history_too_long` |

Los tamaños se cuentan con la fórmula que publica Firestore. Lo que no cabe se rechaza con su código: **nada se
parte en silencio**. Los límites del dominio (200 escenas, 100 planos por escena, 1000 planos) mandan igual.

### Lo que F1-B todavía no deja pasar

- **Un Element de verdad**: hasta F3, cualquier `ElementBinding` era `element_binding_not_supported`. Desde la fase 10
  del Filmmaker Engine se comprueba (abajo); `shots` sigue sin tocarse para ello.
- **Un material que no sea tuyo**: cada `assetId` nuevo se comprueba con `leerMaterial` y `puedeReferenciar` del
  Core: `not_found` (no existe o es de otra cuenta, la misma respuesta), `not_usable` o `kind_mismatch`. Solo se
  guarda el id: ni URL, ni bytes, ni la ficha.
- **Un id de escena que Firestore reserva** (`__…__`): `id_not_storable`.

### Reglas e índice

Las tres colecciones las lee solo su dueña y el cliente no escribe en ninguna; van al final de `firestore.rules`,
detrás de C3. Un índice, el de la lista: `productions` (`ownerAccountId` ↑, `status` ↑, `updatedAt` ↓). Las escenas
y el registro se leen por ruta y no necesitan ninguno. La guarda de `moderation` que fija el total de índices sube
de 35 a 36, como subió con cada fase que añadió uno. Nada de esto está desplegado.

## F1-C · La producción en la app

### El espejo del dominio

La pantalla de producción necesita el dominio entero —validar y aplicar una operación en local antes de guardarla,
lo pendiente, las recomendaciones, la línea de tiempo y las tarjetas del storyboard—, y `metro.config.js` deja
`functions/` fuera del bundle. Escribirlo otra vez en el cliente sería tener dos verdades, así que no se escribe:
`scripts/espejo-filmmaker.mjs` **imprime** el árbol sintáctico de cada archivo de F1-A —con el compilador de
TypeScript de la app, sin comentarios— en `services/filmmaker/espejo/`, con las mismas rutas relativas. Entran los
cinco archivos de `functions/src/filmmaker/` y su cierre de importaciones en el Core (contratos y vocabularios puros,
sin Firebase ni red ni reloj); de `core/gateway.ts` solo el tipo `ExecutionHints`, que es lo único que `modelo.ts`
toma de él. La app entra por una sola puerta, `services/filmmaker/dominio.ts`, que solo reexporta.

`node scripts/espejo-filmmaker.mjs` lo regenera y `--check` solo comprueba. `functions/test/filmmaker-espejo.test.mjs`
lo vuelve a generar en memoria y exige que coincida byte a byte con lo que hay en disco; compara con el compilador,
tipo a tipo y campo a campo, las exportaciones de los dos árboles; y carga los dos y comprueba que los vocabularios,
las operaciones, lo pendiente, las recomendaciones, la línea de tiempo, las tarjetas y los requisitos dan lo mismo.
Si F1-A cambia y nadie regenera, o si alguien toca el espejo a mano, la cadena se pone en rojo.

### El servicio de cliente

`services/filmmakerService.ts` es la **única** frontera de la app con la callable: `createProduction`,
`getProduction`, `listProductions`, `applyProductionOperations`, `archiveProduction`, `unarchiveProduction` y
`duplicateProduction`, una por cada `op` de la puerta. Manda solo los argumentos funcionales —nunca la cuenta:
no tiene dónde ponerla— y devuelve tipos del dominio y números, sin `Timestamp` ni nada de Firebase, leídos campo a
campo para que lo que el servidor añada de más no llegue a un componente. No lanza: contesta un resultado, o un
fallo con el código del servidor, su `messageKey` (`filmmaker.persistence.*`) y los problemas del dominio, en una de
nueve formas que la pantalla sabe tratar (`conflicto`, `no_encontrada`, `archivada`, `rechazada`, `sin_sesion`,
`sin_cuenta`, `sin_conexion`, `no_disponible`, `desconocido`). Los ids —de la producción, de cada lote, de cada
escena y plano nuevos— se generan en el cliente, así que repetir una petición que no se sabe si llegó es repetir la
misma. Lo usan los hooks de la producción (`hooks/useProduccion.ts`, `hooks/useProducciones.ts`); ningún
componente lo llama suelto.

### El estado optimista y el CAS

`utils/produccionOptimista.ts` es un reductor puro: cada gesto se aplica en local con `aplicarOperaciones` de F1-A
—el espejo— y se ve al momento; si F1-A lo rechaza, se dice por qué y nada cambia. Los gestos esperan y viajan
agrupados en UN lote congelado —sus operaciones, su `operationId` y la revisión confirmada como `expectedRevision`—,
sin partir un gesto entre dos lotes ni pasar de las 50 operaciones del servidor. Confirmado, la revisión del servidor
manda y lo hecho mientras tanto se vuelve a aplicar encima.

`utils/controladorDeProduccion.ts` decide cuándo se manda: espera a que la persona pare (agrupar, 900 ms), manda un
lote cada vez y, al salir de la pantalla, lo que quedaba. Si la red falla, el lote se queda como estaba y
«Reintentar» lo repite **tal cual**: el servidor reconoce el id y no lo aplica dos veces. Si el servidor rechaza el
lote por lo que se mandó, se deshace el gesto culpable (`parameters.index`) o el lote entero, y se dice. Si contesta
`aborted` por la revisión, se trae la versión de ahora, se vuelve a aplicar encima todo lo que el servidor no tenía,
gesto a gesto, y se manda con la revisión nueva: lo de la otra persona no se pisa y lo tuyo que ya no cabe se aparta
**con su problema**, nunca en silencio. Tras tres conflictos seguidos se para y se pregunta. No hay temporizadores de
progreso ni estados inventados: la única espera es la de agrupar gestos.

### La pantalla

`screens/ProductionScreen.tsx` (ruta `Production`, `studio/produccion/:productionId?` en la web), montada sobre
`CreatorShell` y con las piezas de `components/studio/produccion/`. Con una producción abierta: la cabecera
(`ProductionHeader`: título, estado —`ProductionStatus`— y guardado —`ProductionSaveState`—, duplicar, archivar y
desarchivar), los avisos (`ProductionAvisos`: archivada, conflicto y lo que ya no cabía, gesto rechazado), la línea de
tiempo (`ProductionTimelinePreview`), el storyboard (`ProductionStoryboard` → `ProductionSceneCard` →
`ProductionShotCard`) y el panel Director (`ProductionDirectorPanel`, con `ProductionFormatSelector`,
`ProductionDurationSummary`, `ProductionInspector`, `ProductionRecommendations` y `ProductionAudio`). Sin producción: la
producción que nace de lo escrito en Weë Studio (`ProductionNewCard`) y tus producciones de verdad
(`ProductionList`); vacíos y errores, con `ProductionEmptyState`. En escritorio, storyboard y Director a dos columnas;
en el teléfono, en dos pestañas.

Lo que enseña sale de F1-A: las tarjetas del storyboard, la línea de tiempo, las recomendaciones, la validación en
`ready` y lo pendiente de rehacer; los nombres de la cámara, de la biblioteca de Weë Studio
(`constants/camaraCinematica.ts`). Los estados son los que existen: borrador, lista para generar (validación `ready` y
cada tarjeta completa), con dependencias pendientes, archivada; y guardado, cambios sin guardar, guardando, conflicto y
error. «Generar» se ve como lo que es hoy —todavía no disponible— y el coste, pendiente de cotización. No hay
miniaturas: cada plano dice «Sin vista previa». La voz, el diálogo, la música, los efectos y el ambiente se enseñan
como estructura, y hacerlos, como no disponible.

Se edita solo lo que F1-A sabe cambiar con una operación: reordenar, duplicar, dividir y unir escenas y planos,
alargar y acortar, la duración objetivo, el formato, el título y la descripción de una escena, la descripción de un
plano, el clima y el momento del día, y la cámara, el movimiento y la luz. Personajes, lugares, referencias, la
intención y el título de la producción se ven y no se editan: el lenguaje no tiene operaciones para ellos y F1-C no
las inventa. Los campos de texto usan `components/creator/CampoQueCrece.tsx`, que crece como las cajas de Weë AI
(CLAUDE.md §9) con la misma pieza, `useCajaQueCrece`. Las recomendaciones traen sus alternativas: «Aceptar» aplica
esa propuesta como un gesto y «Rechazar» la aparta; ninguna se aplica sola.

### La entrada: «Varias escenas» dentro de Weë Studio

La caja «¿Qué quieres crear?» del Studio sigue siendo la única. Dentro de la puerta Videos, «Varias escenas»
(`multiScene`) ya no está bloqueada: declara `produccion: true` en `constants/studioExperiences.ts` y
`abreLaProduccion` lo lee del catálogo, no de las palabras de lo escrito. Al pulsar Crear, `StudioScreen` navega a
`Production` con lo escrito y los controles elegidos, antes de decidir ningún destino de `CreatorFlow`: un solo clip va
a `CreatorFlow`, como siempre; varias escenas, a la producción. El Studio solo navega: la producción la crea su
pantalla, con `createProduction`, cuando la persona elige dónde se va a ver. La idea se guarda como intención y los
controles como dirección de toda la producción; no se interpreta nada —eso es de Weë Brain, en F2—. La valla
`studio-video` se actualizó con autorización: doce conectadas (siguen haciendo `video.generate`), una que abre la
producción y nunca un plan de un clip, y dos bloqueadas con su motivo. Las cuatro puertas no cambian y no hay quinta.

### Los textos

El módulo `filmmaker` está en los once diccionarios: 255 claves (267 en ruso, con sus formas `_few`/`_many`). Los
`messageKey` del dominio tienen tres tramos (`filmmaker.<área>.<código>`) y los diccionarios son planos, así que
`utils/mensajesDeFilmmaker.ts` los lee con una regla —`filmmaker.validation.shape_invalid` →
`filmmaker.valShapeInvalid`— y cada código de F1-A y F1-B tiene su frase. El catálogo `constants/filmmaker.ts` guarda
claves, no frases. «Video de Instagram» y no la otra palabra, como en Weë Business. La valla `CLAVES_PT` subió de
2 427 a 2 682 con autorización.

### Probarlo en local, de punta a punta

`config/firebase.ts` conecta Auth y Firestore a sus emuladores SOLO si se piden (`EXPO_PUBLIC_AUTH_EMULATOR_HOST`,
`EXPO_PUBLIC_FIRESTORE_EMULATOR_HOST`, como ya hacía con Functions y Storage); sin esas variables no cambia nada. Con un
proyecto `demo-…`, la app web habla con los emuladores y con nada más:

```
firebase emulators:start --only auth,functions,firestore --project demo-wee-filmmaker
EXPO_PUBLIC_FIREBASE_PROJECT_ID=demo-wee-filmmaker EXPO_PUBLIC_FIREBASE_API_KEY=demo-api-key (y el resto de EXPO_PUBLIC_FIREBASE_* de demostración)
EXPO_PUBLIC_FUNCTIONS_EMULATOR_HOST=127.0.0.1 EXPO_PUBLIC_AUTH_EMULATOR_HOST=127.0.0.1 EXPO_PUBLIC_FIRESTORE_EMULATOR_HOST=127.0.0.1 npx expo start --web
```

Así se probó F1-C en el navegador: Studio → Videos → «Varias escenas» → Crear → la producción, creada con la callable;
gestos guardados por lotes, recarga, conflicto entre dos pestañas reconstruido sin pisar nada, archivar, desarchivar y
duplicar. `functions/test/filmmaker-servicio.emulator.mjs` hace lo mismo desde Node con el SDK de cliente de verdad.

### Lo que F1-C no hace, y lo que queda pendiente

No genera vídeo, miniaturas, voz ni música; no cobra ni cotiza; no conecta Weë Brain; no llama al motor, al Router, al
Job Engine ni a ningún proveedor; no añade operaciones; no cambia las reglas de Firestore; no convierte escenas ni
planos en `SceneNode`/`ShotNode` del Core, que siguen siendo la unidad de generación de F1-D. `creatorProjectId` no
existe en el contrato de F1-A/F1-B y no se añadió (cambiarlo sería otro contrato): enlazar una producción con un
proyecto de Weë AI queda como decisión pendiente, y `projectItems` no se toca. Tampoco se sincroniza en vivo: otra
pestaña ve lo nuevo al volver a abrir la producción, y un conflicto se resuelve al guardar.

## F1-D · La toma de un plano

Una unidad —un plano, o una escena sin planos— se genera de una en una, con un «Generar» explícito:

    producción guardada (revisión R) → ShotRequirement (F1-A) → «Generar» → requestId de la toma (servidor)
      → generateVideo → texto compuesto en el servidor → Credit Engine → video.generate → Seedance, asíncrono
      → material asset_ → enlace verificado → ShotNode.producedAssetId

### En el servidor

- `functions/src/creator/plano.ts` traduce el requisito a la petición de vídeo: puro, versionado
  (`PLANTILLA_DE_PLANO`), sin proveedores, sin Credits y sin importar `filmmaker/`. Solo lee lo que tiene sentido
  para el vídeo —descripción, cámara y composición en texto, continuidad textual, duración, formato, calidad y
  sonido—, quita las direcciones web del texto y no pasa de 3000 caracteres. El mismo requisito da el mismo texto.
- Rechaza con su motivo, sin desviar a legacy ni degradar nada: una capacidad que no es `video.generate`,
  referencias o fotogramas de partida, prompt avanzado (hasta la Fase 13 del motor, que lo usa), diálogo a cámara (sin lip-sync), sin descripción,
  más de 15 s, un formato que el proveedor no tiene (4:5 se bloquea y se proponen 9:16 o 1:1), sin calidad elegida,
  una calidad que no llega a la resolución de la producción sin cambiar de modelo, y sonido pedido contra una
  producción «sin música» o «sin diálogo». La duración generada es `max(4, ceil(pedida))`.
- `functions/src/creator/toma.ts` nombra y ordena las tomas: `fm.<32 hex de cuenta|producción|unidad>.<toma>`,
  determinista y dentro del tope del Core (≤ 87 con un uid de 28 caracteres); una toma viva por unidad, en orden y
  hasta 50. Lee la producción guardada de la cuenta (la revisión debe ser la guardada) y firma la unidad —la raíz
  de la producción y su escena— para saber después si cambió.
- `generateVideo` acepta `plano` (y `cotizar`, `creditosCotizados`). La puerta se decide ANTES de reservar: una toma
  solo va por el Core y, si no puede, se rechaza (`route_unavailable`) sin tocar cupo ni Credits. Cotizar no
  reserva nada; generar exige el precio que se enseñó (`price_changed` si cambió). El precio sale de
  `loadCostOverrides()` + `priceVideo`, como el resto: Filmmaker no calcula Credits. La reserva lleva en su meta de
  qué producción, unidad, toma, revisión y firma es. Lo que el cliente mande al lado del plano —texto, requestId,
  imágenes, referencias, duración, formato, modelo— no se usa.
- El cupo es el de Weë Studio (12 vídeos al día); una operación repetida no lo gasta otra vez, tampoco si llega
  dos veces a la vez (`engine/limits.ts`). El adaptador de Seedance le manda a ModelArk el plazo de `plazos.ts`
  (`execution_expires_after`, 2 h) solo al aceptar y soltar: si vence, el barrido lo cierra y devuelve exacto.
- `shots` gana `shot.result`: la app dice QUÉ toma de qué plano y el servidor comprueba lo demás —la reserva es de
  la persona y está cobrada, coincide con la toma, la unidad sigue ahí con la misma firma y el material nació de
  esa ejecución, es de la cuenta, está listo y es un vídeo—. Crea la escena y el plano del Core (`fm_…`,
  `projectId` = la producción) y fija el resultado en una transacción, con la versión que vio la app si la manda.
  Si el plano cambió, no se enlaza: el vídeo queda en Mis creaciones, cobrado una vez y sin regenerar.
  `producedAssetId` ya no viaja por `shot.update`, y los nodos `fm_` no se escriben a mano.
- Un vídeo que llegó a Storage sin su ficha se adopta sin volver a descargarlo: el objeto lleva la marca de su
  material y solo se adopta el que la lleva (`content/materializador.ts`).

### En la app

`utils/controladorDeToma.ts` (sin React, sin Firebase y sin frases) consulta la unidad, cotiza con la calidad que
elige la persona —no hay una por defecto—, genera una vez por clic, escucha la reserva de Credits de la toma
(AUTHORIZED es «en proceso»; COMPLETED, pedir el enlace; REFUNDED o FAILED, que falló y se devolvió) y deja de
escuchar al terminar o al salir. `hooks/useTomaDePlano.ts` es el único consumidor de `services/videoService.ts`
(`quoteTake`, `generateTake`) y usa `services/tomaService.ts` para la reserva, el enlace y la dirección del vídeo.
La pantalla compone los dos hooks; `ProductionShotGeneration` solo pinta, en el panel Director, con 50 claves
`filmmaker.take*` en los once diccionarios. La unidad sale de lo GUARDADO: con cambios sin guardar no se genera.
El «Generar» de la producción entera sigue sin estar.

### Lo que F1-D no hace, y lo que queda dicho

No genera varias unidades a la vez, ni monta, renderiza o exporta; no hay voz, música, efectos, lip-sync,
personajes/Elements, transformación de vídeo ni prompt avanzado. La puerta `aiSettings/runtime` sigue cerrada por
defecto. Para el canary real (2026-09-28) se desplegaron `generateVideo`, `barridoDeLiquidacion`, `shots` y
`productions` desde `96b3f7a`; lo de después del canary está sin desplegar. Límites conocidos al cerrar F1-D, y
cómo quedaron: el requisito lo calculaba el espejo de F1-A en la app y el servidor solo comprobaba la cuenta, la
producción, la revisión, la firma y la procedencia —desde la Fase 5 del Filmmaker Engine lo calcula el servidor—;
«aceptado» y «trabajando» se veían igual, «en proceso», porque la app solo podía leer la reserva —desde la Fase 2 el
servidor los distingue (`shot.takes`), y la app los proyectará en la pasada de UX—; que el material sea `video`
depende del tipo que devuelve la descarga; y la cuenta es el uid.

### F1-D tras el canary real (2026-09-28)

El canary en producción validó la cadena entera con **Seedance 2.0 fast** («Estándar»: 75 Credits reservados y
cobrados exactos, `asset_…`, `producedAssetId`, sin doble cobro) y la devolución exacta de un **404 de ModelArk**
(Seedance 2.0 sin activar en la cuenta: «Alta»). Lo que enseñó, cerrado sin cambiar ese comportamiento:

- **Coste real del proveedor** (fase 1): la fila del libro ya no se cierra al aceptar; el coste va separado en
  estimado, real y estado, y lo real sale de los tokens que ModelArk declara al terminar (ver `docs/AI-ENGINE.md`
  § Credits). Nunca 0 por defecto.
- **Por qué no salió** (fase 2): `functions/src/creator/fallos.ts` convierte el error del Core en una de cinco
  categorías —`MODEL_UNAVAILABLE`, `PROVIDER_TEMPORARY_ERROR`, `PROVIDER_REJECTED`, `TIMEOUT`,
  `UNKNOWN_PROVIDER_ERROR`— y es lo único que llega a la app (con `refunded` si el reembolso está confirmado); nada de
  dentro: ni el HTTP, ni el adaptador, ni ids. La consulta de una unidad dice además cómo acabó el TRABAJO de su
  última toma (`outcome`, `failure`), para no enseñar «en proceso» de algo que ya terminó.
- **Qué calidades hay** (fase 3): `MODELOS_VALIDADOS_PARA_TOMAS` en `creator/video.ts` —hoy, solo Seedance 2.0
  fast—. «Alta» (Seedance 2.0), «Máxima» (Seedance 2.5) y cualquier 4K se rechazan con `model_unavailable` antes de
  tocar cupo o Credits, y la consulta devuelve `qualities` con lo que de verdad se puede pedir para ESE plano
  (modelo validado y resolución a la que llega). Una calidad no se desvía a otro modelo para poder ofrecerla.
- **Dinero** (fase 4): cotización = reserva; el cobro es lo que el trabajo guarda de su reserva y el Credit Engine
  nunca captura más de lo autorizado; fallo, vencimiento y rechazo devuelven exacto, una vez.
- **El vídeo en su plano** (fase 5): `enlazarToma` no deja que una toma más vieja pise el vídeo de una posterior ya
  cobrada (`take_superseded`).
- **Vista previa** (fase 6): la tarjeta decía «Sin vista previa» porque pintaba la producción de F1-A y el resultado
  vive en el `ShotNode` del Core, cuyo nombre solo calcula el servidor. `shots` gana `shot.videos` (qué unidad tiene
  puesto qué material, solo lectura) y la tarjeta enseña ese vídeo, quieto y sin sonido; sin él, sigue diciendo que
  no hay vista previa. No hay miniatura generada (el materializador no hace pósters): es el propio vídeo.
- **En la app**: calidades apagadas con su porqué, la frase de cada categoría —«reembolsados» solo cuando es
  verdad—, los tres números de la toma (reservados, cobrados, reembolsados) y la fase «cerrando» cuando el trabajo
  ya falló y la devolución no ha llegado. 18 claves `filmmaker.take*` nuevas en los once diccionarios.

Pruebas: `functions/test/f1d-postcanary.test.mjs` (en la cadena); `f1d-cliente` (sección PC) y `filmmaker-ui`
(sección V). Nada desplegado; la puerta, cerrada.

## Filmmaker Engine

Encargo del usuario del 2026-09-28: seguir el roadmap de abajo hasta dejar el motor terminado, sin romper los
contratos cerrados del vídeo (asíncrono, un conductor, una toma = una reserva y un trabajo, `asset_`,
`producedAssetId`), del dinero (reserva, cobro y reembolso exactos, `NOT_REFUNDABLE`, el POST sin respuesta como
desconocido) ni la validación en el servidor. Las vallas de las fases anteriores que fijaban «F1-A, productions y el
Core, sin tocar» dejan pasar SOLO la lista nominal de `functions/test/motor-filmmaker-alcance.mjs`, donde cada fase
dice qué archivo toca y por qué; el dinero no puede estar en ella.

### Fase 1 · El lenguaje completo

23 operaciones nuevas, detrás de las 33 de F1-A y sin mover ninguna (56 en total), con el mismo contrato: forma
cerrada, todas o ninguna, integridad comprobada después de cada una y lo pendiente calculado por firmas.

| Grupo | Operaciones |
|---|---|
| Fichas | `add_character`, `update_character`, `remove_character` · `add_location`, `update_location`, `remove_location` · `add_object`, `update_object`, `remove_object` · `add_reference`, `update_reference`, `remove_reference` |
| Producción | `rename_production`, `change_intent`, `change_direction`, `change_mood`, `change_transition`, `change_continuity`, `change_generation` |
| Escenas y planos | `update_scene`, `update_shot`, `move_shot` |
| Montaje | `change_edit_plan` (`set_track`, `remove_track`, `set_subtitles`, `upsert_marker`, `remove_marker`) |

- **Campo a campo.** `update_*`, `change_intent` y `change_direction` cambian solo los campos que traen (`null`
  quita); cada campo se sustituye entero. El id y la posición no se cambian (`not_editable`), y lo que ya tiene su
  operación lo dice (`use_dedicated_operation`: el título y la descripción son `edit_text`, el estilo `change_style`,
  el ánimo `change_mood`, la cámara, el movimiento, la luz y la transición las suyas…): dos maneras de cambiar lo
  mismo acabarían diciendo cosas distintas.
- **Quitar una ficha.** Si nadie la señala, se va. Si alguien la señala, se para con `operation_blocked`, `reason:
  in_use` y las rutas; con `cascade` se sueltan todas sus señales —listas de ids, campos, anclajes de continuidad— y
  se van los registros que solo existían por ella: su estado en una escena, sus relaciones, las restricciones que la
  nombran y **las líneas que decía**. Como los ids son únicos en toda la producción, basta el nombre de la clave. Un
  sujeto o una voz que se quedan vacíos se quitan.
- **Lo pendiente sale solo**: cambiar la ropa de un personaje deja pendientes justo sus planos; su voz, solo sus
  líneas; el montaje (pistas, subtítulos, marcas) no deja nada pendiente porque no cambia lo que se genera.
- **Sin códigos nuevos**: los problemas usan los de F1-A, así que no hay frases nuevas en los once diccionarios.
- La persistencia no cambió: `productions` ya comprobaba cada material NUEVO de una referencia (dueño, `ready`,
  clase) comparando antes y después, y rechazaba los vínculos a Elements hasta F3 (fase 10). El espejo de la app se
  regeneró (`scripts/espejo-filmmaker.mjs`).

Pruebas: `functions/test/filmmaker-lenguaje.test.mjs` (en la cadena), con una batería de sabotajes sobre el compilado
(9/9) fuera del repositorio.

### Fase 2 · El estado y la traza de una toma

De una toma se sabían cosas sueltas —la reserva, el trabajo del Core, el material, la fila del libro y el plano— y la
app solo veía la reserva, así que «aceptada» y «trabajando» se veían igual y lo que no se sabía cómo había acabado
parecía «en proceso». `functions/src/creator/estadoDeToma.ts` las junta en UNA respuesta, calculada solo de lo escrito:
no guarda nada, no mueve dinero, no reintenta y no pregunta al proveedor. Lo del dinero lo sigue diciendo
`decidirLiquidacion` —la misma función con la que el barrido cobra o devuelve—: no es un segundo sistema de estados.

| Estado | Qué dice lo guardado |
|---|---|
| `queued` | reservada y sin trabajo todavía (lo está creando la llamada que reservó), o el trabajo en la cola |
| `preparing` | un trabajador la tiene y el proveedor todavía no ha dicho que la tiene |
| `accepted` | el proveedor la aceptó y le puso nombre. ModelArk no distingue de forma durable su cola de su trabajo, así que no se inventa un «generando» |
| `processing` | el proveedor terminó bien y el vídeo ya está en casa —el trabajo solo se cierra después de guardarlo—; falta cerrar el cobro |
| `completed` | cobrada exacta, con su vídeo |
| `failed` | acabó sin vídeo y el dinero está volviendo: el trabajo falló sin dudas, o la reserva se quedó sin trabajo más de lo que vive la llamada que tenía que crearlo (`abandoned`, con el `PLAZO_DE_VIDEO_MS` de `generateVideo`, el mismo número) |
| `refunded` | devuelta entera |
| `reconciling` | salió y no se sabe cómo acabó (el POST sin respuesta, una aceptada que venció), o lo escrito se contradice: ni se cobra ni se devuelve |

- **La traza** (`trazasDeLaUnidad`) dice de cada toma de qué cuenta, producción, escena, plano y toma es, con qué
  request, revisión, firma, plantilla y huella se pidió (lo escribió el servidor en la reserva al reservar), y su
  trabajo, su fila del libro (por la transacción de la reserva), su material (por su procedencia) y su plano. El coste
  del proveedor va en dólares y aparte, `null` si no se sabe; los Credits, en tres números —reservado, cobrado y
  devuelto— con la misma regla que ya usaba la app.
- **El vídeo en su plano**, con las reglas de `enlazarToma`: `linked`, `pending` (se puede enlazar), `superseded` (una
  toma posterior ya está cobrada), `stale` (el plano cambió) o `none`.
- **`shots` gana `shot.takes`** (producción, escena y unidad): las tomas de la unidad con su estado, su motivo, la
  categoría del fallo, los Credits, su vídeo si es suyo y está listo, y el enlace. Nada de dentro: ni el trabajo, ni el
  proveedor, ni su coste, ni la huella, ni el texto con que se pidió. De una unidad ajena o inexistente, ninguna; y si
  no se puede leer el trabajo, contesta un error en vez de adivinar un estado.
- La consulta de F1-D (`takes.current` de la cotización, con `outcome`/`failure`) sigue igual para la app de hoy;
  proyectar los estados nuevos en la interfaz queda para la pasada de UX.

Pruebas: `functions/test/filmmaker-toma-estado.test.mjs` (en la cadena): la tabla de estados contra
`decidirLiquidacion`, el dinero contra la regla de la app, y de punta a punta sobre el arnés de F1-D —aceptada,
en casa, cobrada, enlazada, sustituida, plano cambiado, fallo al pedir, fallo después, POST sin respuesta, reserva sin
trabajo, cuentas separadas y la traza entera—.

### Fase 3 · La producción, de un vistazo

Lo que la orquestación de una producción tiene que saber antes de hacer nada con ella. `estadoDeLaProduccion`
(`creator/estadoDeToma.ts`) da sus unidades en el orden de la línea de tiempo —escena y plano, por el `order` que F1-A
obliga a que coincida con la posición; Firestore devuelve las escenas por identificador, así que se ordena—, cuántas
tomas tiene cada una, la última tal como la ve la app, el vídeo que tiene puesto su plano y un resumen: cuántas unidades
tienen vídeo, el estado de la última toma de cada una, los Credits reservados, cobrados y devueltos de TODAS las tomas,
qué unidades faltan y si ya se puede montar.

- **Lista para montar** solo cuando todas las unidades tienen en su plano el material LISTO de una de sus tomas. Un
  plano que apunta a un material borrado, o una toma cobrada cuyo plano cambió y no se enlazó, no cuentan. Una
  producción sin unidades nunca está lista, y si hubo más unidades que el tope (400) se dice (`truncated`) y tampoco.
- Hecha de lo mismo que la Fase 2: las unidades guardadas (`unidadesGuardadas`, que ahora usa también `shot.videos`,
  con la misma regla y el mismo resultado) y la traza de cada una. No carga el dominio de F1-A.
- **`shots` gana `shot.production`** (la producción): la vista, hecha solo de vistas de toma. Nada de dentro. De una
  producción ajena o inexistente, una producción vacía, igual que `shot.videos`.

Es el punto de partida de lo que viene: la generación de varios planos sabe qué no repetir, y el montaje final sabe
si puede empezar y con qué material.

Pruebas: la sección E de `functions/test/filmmaker-toma-estado.test.mjs`.

### Fase 4 · La reserva que se quedó sin trabajo

Si el proceso muere entre reservar los Credits de una toma y crear su trabajo, la reserva se quedaba retenida para
siempre: la app la enseñaba «en proceso» y ese plano no dejaba pedir otra toma. Ahora el barrido la devuelve cuando ya
pasó la vida de la llamada que tenía que crear el trabajo (más 5 minutos), exacta y una vez, por el puerto de
liquidación del runtime; la toma pasa a `refunded` y el plano se puede volver a pedir. Solo eso, por decisión del
usuario (2026-09-28): el POST que salió y no volvió sigue retenido, para una persona. Detalle en `docs/RUNTIME.md` § 25.

Pruebas: la sección F de `functions/test/filmmaker-toma-estado.test.mjs`.

### Fase 5 · El requisito de cada plano, calculado por el servidor

Hasta aquí el requisito de un plano —y con él el texto que va al proveedor, la duración, el formato y las calidades—
lo calculaba la app con su espejo de F1-A, y el servidor lo aceptaba con su forma. Por decisión del usuario
(2026-09-28), `creator/requisitoDelServidor.ts` lo calcula en el servidor: lee la producción guardada con el lector de
`productions` —con su dueño— en la revisión pedida, calcula sus requisitos con F1-A y se queda con el de la unidad.
Ese es el que usa `generateVideo` para todo; el de la app se lee con la misma función y solo se COMPARA.

- **Si no es el mismo**, no se genera: ni reserva, ni cupo, ni POST. Se contesta `production_changed` con la causa
  (`requirement_mismatch`), que es lo que la app ya sabe resolver: vuelve a leer lo guardado y a pedir. Otro texto,
  otra duración para pagar menos o referencias coladas se paran antes del dinero —antes, otro texto lo paraba la
  idempotencia del Credit Engine, y unas referencias coladas, la evaluación del plano—.
- **La valla G12 se amplió por nombre**: el compilado carga `modelo`, `validacion`, `operaciones` y `requisitos`, por
  dos puertas y solo por ellas —`productions/puerta` y `creator/requisitoDelServidor`—; `requisitos` entra solo por la
  segunda y `recomendaciones` sigue fuera.
- El requisito del servidor y el del espejo de la app son el mismo en producciones de verdad, unidad a unidad —con
  personaje, lugar, objeto, dirección y una escena sin planos—, y su texto también.

Pruebas: `functions/test/filmmaker-requisito-servidor.test.mjs` (en la cadena), y G12 en `filmmaker-modelo.test.mjs`.

### Fase 6 · Varios planos a la vez (F4)

`generateVideo` gana el modo `produccion` (`productionId`, `revision`, `quality` y, si se quiere, `units`): con
`cotizar`, el presupuesto del lote; sin él, el lote por `creditosCotizados` —el total—. Lo hace
`creator/lotes.ts`, y no decide nada de lo que ya decide la puerta: cada unidad vuelve a entrar por ELLA MISMA como
una toma, con el requisito que calcula el servidor (Fase 5), y su cotización, su cupo, su reserva y su trabajo son
los de siempre. No hay un cobro del lote —sería otro Credit Engine—: el total es la suma de las tomas, y cada una se
cobra o se devuelve por su cuenta.

- **El presupuesto** dice, en el orden de la línea de tiempo, qué pasa con cada unidad: `generate` (su toma y su
  precio, el mismo que su cotización suelta), `done` (su plano ya tiene su vídeo), `in_flight` (tiene una toma en
  marcha) o `blocked` (con el porqué de la puerta: una duración, un diálogo, la puerta del Core cerrada…). Y el
  total, lo que se salta, el resumen por capacidad de F1-A y si hay saldo. No toca nada.
- **Generar** vuelve a presupuestar y solo sigue por el total que se enseñó (`price_changed` si no). Sin Credits para
  el total no empieza ninguna (`insufficient_credits`). Después, una a una y en orden, y al primer fallo se para
  (`stoppedAt`): lo que falla en un lote —el cupo del día, el saldo, la puerta— haría fallar las siguientes igual. Lo
  que ya empezó sigue en marcha, y la toma que falló se devuelve como cualquier toma.
- Como mucho 12 unidades por lote, las del cupo diario de vídeo (`batch_too_large`).

Pruebas: `functions/test/filmmaker-lotes.test.mjs` (en la cadena).

### Fase 7 · El montaje final, como manifiesto (F5, primera parte)

El render final es una capacidad del motor, no un botón, y antes de ejecutarlo hay que saber exactamente qué se
monta. `creator/composicion.ts` lo dice en un manifiesto (`fm-montaje-1`), puro y con su huella —la misma entrada da
el mismo, y un renderizador puede usarla para no hacer dos veces lo mismo—:

- **Los planos**, en el orden de la línea de tiempo de F1-A que calcula el servidor (Fase 5), cada uno con el vídeo
  que tiene puesto su plano —solo si es el material listo de una de sus tomas (Fase 3)—, recortado a la duración que
  se pidió desde su principio, con su sonido si su requisito lo pidió.
- **Las transiciones** de F1-A, montadas así: `dissolve` → fundido encadenado; `fade` → fundido a negro; `whip` →
  barrido; `cut`, `match_cut` y `seamless` → corte (las dos últimas son intención de edición, y se guarda cuál era).
  Una transición dura 0,5 s —F1-A no lo dice— y nunca más de la mitad de ninguno de los dos planos que une; el
  montaje dura la línea de tiempo menos lo que se solapa, y se dicen las dos cifras.
- **La salida**: la que F1-A le pide al montaje (o la de la producción), con el cuadro calculado de la proporción y
  del lado corto de la resolución, a 24 fps, mp4 con h264, y con pista de sonido solo si algún plano la tiene.
- **Si no se puede**, se dice: los planos sin vídeo (`not_ready`, con cuáles), nada que montar, una producción sin
  resolución (no se inventa) o una proporción que no se sabe montar.

`creator/ffmpeg.ts` traduce el manifiesto a los argumentos de FFmpeg —FFmpeg propio, decisión del usuario—: una
lista para ejecutarse sin shell, con solo números y nombres fijos en el grafo de filtros; las rutas son argumentos
sueltos y ningún identificador ni texto de una persona entra en él. Recorta, escala sin deformar con bandas,
normaliza a 24 fps, concatena los cortes, solapa las transiciones con `xfade` y pone silencio a los planos mudos
cuando la salida lleva sonido. `shots` gana `shot.montage` (producción y revisión): el manifiesto, o por qué no.

Nada de esto ejecuta un render: no hay FFmpeg instalado todavía, ni dónde correrlo, ni dónde guardar el resultado.
Eso es la segunda parte de F5, y pide decisiones (instalar el binario, dónde corre, dónde se guarda y si cuesta
Credits).

Pruebas: `functions/test/filmmaker-montaje.test.mjs` (en la cadena).

### Fase 8 · El render final, ejecutado (F5, segunda parte)

Decisiones del usuario (2026-09-28): FFmpeg propio (`ffmpeg-static`, dependencia del servidor) como **tarea general del
Job Engine**; el resultado, un **material `asset_`** de la cuenta más un **registro en la producción**; y **gratis, con
cinco al día por cuenta**, hasta medir el coste real. Sus Functions se despliegan solo con autorización aparte.

- **Pedir** (`creator/render.ts`, callable `renders`, `op: 'render.request'`, producción y revisión). La cuenta sale de
  la sesión y qué se monta lo calcula el servidor: el manifiesto de la Fase 7 en la revisión pedida. En orden: la
  **puerta** —`aiSettings/render`, cerrada si no existe; abre por cuenta (`cuentas`) o para todas solo con
  `todas: true`, y habilitada sin cuentas NO abre—, el manifiesto, los **topes** (60 planos, 10 minutos, 480p a 1080p:
  4K no, porque ningún plano llega), **¿ya está?** (el mismo montaje hecho, en marcha o por reconciliar se devuelve tal
  cual), el **cupo del día** en el limitador de siempre (`aiRateLimits`, clave `render`, deduplicado por petición), el
  **trabajo** por `crearTrabajo` y, después, el **registro**. No toca Credits por ningún camino.
- **Las identidades**, calculadas: la petición `fmr.<32 hex de cuenta|producción|huella>.<serie>` —el mismo montaje pide
  el mismo trabajo; la serie solo sube cuando el anterior terminó sin vídeo— y el material
  `asset_<32 hex de la petición>`, el mismo para todos los intentos de un trabajo.
- **El trabajo**: tarea `media.render` (sin capacidad, sin proveedor), con su política —dos intentos, 20 min por
  intento, concesión de 60 s renovada durante todo el intento (desde la Fase 11; antes, solo mientras FFmpeg montaba),
  90 min de vida— y un paquete que lleva referencias y el manifiesto, nunca bytes ni una URL.
- **El registro**: `productions/{id}/productionRenders/{huella}` —montaje, revisión, serie, trabajo, material, formato,
  duración—, sin estado: el estado sale del material y del trabajo. Lo escribe solo el servidor; la cuenta dueña lo lee.
- **Ejecutar** (`creator/renderizador.ts`): la tercera implementación del único puerto del trabajador, `JobExecutor`.
  Lee el paquete recalculando su identidad y la huella del manifiesto (uno tocado no se monta); si el material ya
  está, termina; si su objeto está sin ficha y lleva su marca, lo **adopta** sin montar; baja los planos —solo
  materiales de la cuenta, listos, de vídeo y del Storage de Weë, nunca por URL—; los mira con FFmpeg (un plano que
  pidió sonido y no trae pista se monta con silencio); monta con `spawn` **sin shell**; comprueba la salida —duración
  con 0,25 s de tolerancia, cuadro, h264 y pista de sonido—; la guarda **solo si no existe**
  (`users/{cuenta}/ai-generations/{material}.mp4`, con la marca del material) y crea la ficha en el Content Core, con
  `sourceAssetIds` = sus planos (un **derivado**) y en `metadata` la producción, la revisión y la huella del montaje.
- **El trabajador** (`creator/renders.ts`, `renderWorker`, cada minuto, 30 min, 4 GiB, 2 vCPU, una petición por
  instancia): una composición como la del canary de medios —el almacén de siempre, la cola de invocación, el motor con
  la política del render, `atenderEntrega` y este ejecutor—. Cada pasada busca en el almacén los trabajos sin terminar,
  **descarta lo que no es un render —ni, desde la Fase 11, un póster— antes de evaluar nada**, recupera las concesiones
  caducadas, reconcilia y avisa lo que toca; no empieza un montaje que no quepa entero en lo que le queda de invocación.
- **Reconciliar**: si un trabajador muere a mitad, el Job Engine deja el trabajo esperando —salió y no se sabe—. Para
  un render la respuesta es el material: si está, `succeeded`; si no está pasados dos minutos, `failed`
  (`render_lost`), y el Job Engine decide si hay otro intento. Es `recibirEvento`, el mismo camino que un aviso de
  proveedor.
- **Estados**, los de la Fase 2 que le tocan: `queued`, `processing`, `reconciling`, `completed` y `failed` (con un
  código: `package_manifest`, `clip_not_available`, `render_lost`…). `render.status` (producción y huella del montaje)
  y `render.list` (producción) lo enseñan; lo ajeno y lo inexistente contestan igual.

El requisito `video.montage` de F1-A (montar los planos y el audio) lo sirve este render: no pasa por el Router ni por el
catálogo de capacidades de IA, porque no es IA. La valla `job-queue` #65 pasa de dos composiciones del trabajador a tres, por nombre y con este motivo. Las reglas
ganan `productionRenders`. Nada se despliega en esta fase.

Pruebas: `functions/test/filmmaker-render.test.mjs` (en la cadena), con FFmpeg de verdad sobre vídeos mp4 generados en
la propia prueba.

### Fase 9 · Weë Brain con la producción abierta (F2)

Decisión del usuario (2026-09-28): la caja del editor de una producción es **Weë Brain** —el mismo, por `brainChat`— y
lo único que cambia es el contexto (CLAUDE.md §10). Contesta como siempre y, si la persona pide cambios, los **propone** en
el lenguaje de F1-A; **nada se aplica sin que la persona lo confirme**.

- **Entra** (`BrainChatInput.produccion`): del cliente llega solo `productionId`. La producción se lee del servidor, de la
  cuenta de la sesión, ANTES del cupo y de los Credits: una que no existe o no es de la cuenta para el mensaje sin gastar
  nada (`invalid-argument`). La revisión que manda la app no decide nada: la propuesta dice sobre cuál se comprobó.
- **Se cuenta** (`creator/produccionEnBrain.ts`): un resumen con los identificadores entre corchetes —escenas, planos,
  duraciones, cámara, luz, movimiento, transición, diálogo, personajes, lugares— y las **recomendaciones de F1-A**
  (`recomendar`), hasta 12 000 caracteres (lo que no cabe se dice). Lo que escribió la persona entra en una línea,
  acotado y **sin corchetes dobles**, para que no pueda hacerse pasar por una marca de Weë Brain.
- **Se le enseña** (`creator/prompts.ts`): cómo proponer —un bloque `[[WEE-CAMBIOS]]{"operations":[…]}[[/WEE-CAMBIOS]]` al
  final, doce operaciones como mucho, ids tal cual, nada inventado—, las operaciones del día a día y sus valores. El
  vocabulario es el del Core y el de F1-A: la suite lo compara con el código.
- **Se cobra igual**: la producción va en la MISMA entrada que se cotiza (`brainQuote`) y se envía, con el mismo servicio
  (`ai_brain`) y el mismo bloque de doce respuestas. Contarla cuenta en el precio como cualquier mensaje largo.
- **Por el camino de siempre**: un mensaje con producción no pasa por el conductor aunque el canary de Weë Brain esté
  abierto (`porElCore … && !produccion`); el canary no se amplía.
- **La respuesta**: el texto SIN el bloque —esté bien o mal— y, aparte, `proposal` (la producción, su revisión base, las
  operaciones, cuántas cambian algo, lo que quedaría pendiente de rehacer y si cambia el montaje) o `proposalIssue`:
  `invalid` (con los códigos de F1-A en `proposalProblems`), `unreadable` (JSON roto o respuesta cortada),
  `too_many` o `no_changes`. Con dos bloques cuenta el último. Se comprueba aplicándola **en memoria** con
  `aplicarOperaciones`: si una falla, no se propone ninguna.
- **Se guarda** en la conversación: desde qué producción y revisión se habló (nunca la producción) y la propuesta; repetir
  el mensaje devuelve la misma sin volver a preguntar.
- **Se aplica** por `productions` (`op: apply`) con la revisión base: si la producción cambió entre medias, el CAS lo dice.
  Sin derivar a otro especialista: ya está donde tiene que estar.

Vallas reancladas por nombre con esta autorización: `core-brain` 100–101 y `brain-deepseek` 40–41 (la producción como
quinto argumento de `brainInput`), `runtime-map` 97d (siete módulos: entra `recomendaciones`) y `filmmaker-modelo`
G12–G12c (una tercera puerta al dominio, con nombre: `creator/produccionEnBrain`). La interfaz —enseñar la propuesta y
el botón de aplicarla— es del pase de UX.

Pruebas: `functions/test/filmmaker-brain.test.mjs` (en la cadena).

### Fase 10 · Los vínculos a Elements, verificados (F3)

Decisión del usuario (2026-09-28): **vínculo verificado, todavía sin imágenes**. Un personaje, un lugar, un objeto o una
referencia de la producción puede vincularse a un Element guardado de la cuenta (`ElementBinding` = `{ elementId, version }`),
y guardar deja de rechazarlo «hasta F3»: lo comprueba.

- **Qué se comprueba** (`productions/index.ts`, en la misma política que ya comprobaba los materiales): cada vínculo NUEVO
  o CAMBIADO —el que no estaba igual antes— apunta a un Element **de la cuenta** (lo ajeno contesta lo mismo que lo que no
  existe), **activo**, de una **clase que encaja** con su ficha y en su **versión de ahora**. Si no, `element_binding_rejected`
  (`invalid-argument`) con la ruta de la ficha y su motivo: `not_found`, `archived`, `wrong_kind`,
  `version_mismatch`, o `not_allowed_here` para un `elementId` fuera de una ficha. No se escribe nada.
- **Qué encaja** (`CLASES_DE_ELEMENTO_POR_FICHA`): personaje → personaje; lugar → lugar o escena guardada; objeto → objeto,
  producto o marca; referencia → cualquiera. Las clases son las del Core; la suite lo comprueba.
- **Lo que ya estaba no se vuelve a mirar**: archivar un Element después NO bloquea la producción —la ficha sigue valiendo
  por lo que tiene escrito y el resto se sigue editando—; cambiar el vínculo sí se comprueba otra vez, y quitarlo siempre se
  puede. Un mismo Element en varias fichas se lee una vez.
- **Cómo se lee**: por el runtime de Elements (`leerElemento`, S4), que ya valida la fila y mira de quién es. Guardar solo
  LEE Elements: ni los escribe ni los cambia.
- **Generar no cambia**: un vínculo no es una imagen de referencia, así que el plano sigue siendo `video.generate` y su
  prompt (`fm-plano-1`) sale de lo escrito en la ficha —nombre, descripción, rasgos, vestuario—, sin nombrar el Element.
  Usar las imágenes del Element al generar es una capacidad sin validar (vídeo con referencias) y llegará con su canary.

Vallas reancladas por nombre con esta autorización: `productions-runtime` X1, X3, Y3 y Z7 (el rechazo «hasta F3», el import
de `elements` y el código de la callable) y `f1d-generacion` AH (`productions` por la lista del motor).

Pruebas: `functions/test/filmmaker-elementos.test.mjs` (en la cadena).

### Fase 11 · Los pósters: una imagen fija de cada vídeo

Decisión del usuario (2026-09-28): **pósters de las tomas**. Una imagen fija del vídeo de cada plano y del montaje
final, sacada con nuestro FFmpeg y guardada como **variante** del material. Sin IA, sin Credits, sin proveedores. Hasta
ahora cada tarjeta del storyboard cargaba el vídeo entero de su plano para enseñar un fotograma quieto.

- **Qué es** (`creator/poster.ts`): una `AssetVariant` con `kind: 'poster'` en el material del vídeo —el contrato del
  Content Core, sin cambiarlo—, escrita con `anotarVariante` tal cual. Un JPEG con el lado mayor de 640 px (el otro, en
  proporción), del segundo 1, o de la mitad de un vídeo que dure menos de dos.
- **Dónde**: junto a su vídeo, en la carpeta de la cuenta, `users/{cuenta}/ai-generations/{material}~poster.jpg`, con la
  marca `{material}:poster`. La virgulilla no cabe en un identificador de material, así que ese nombre no puede ser el
  de ningún material, y queda fuera del prefijo `{material}.` con el que el materializador adopta objetos. Las reglas no
  cambian (la del Storage ya cubre esa carpeta), y al retirar el vídeo su póster se borra con él.
- **Pedirlos** (callable `renders`, `op: 'poster.request'`; del cliente solo llega la producción): el servidor calcula de
  qué vídeos —los que tienen puestos sus planos (F1-D) y los montajes terminados (Fase 8)— y, por cada uno sin póster,
  crea un **trabajo** del Job Engine: tarea `media.video_poster` (`media.poster` ya es de Media Cloud), sin capacidad ni
  proveedor, con su política —dos intentos, 5 min por intento, concesión de 60 s, una hora de vida—. Idempotente: la
  petición es `fmp.<32 hex de cuenta|material>.<serie>`; la serie solo sube cuando el anterior terminó sin póster, y
  como mucho hasta tres. Cupo técnico en el limitador de siempre (clave `poster`, 400 al día) y 60 trabajos nuevos por
  llamada; los demás, en la siguiente. La **puerta es la del render** (`aiSettings/render`), cerrada por defecto:
  cerrada, se contesta lo que hay y no se pide nada. `op: 'poster.list'` solo contesta.
- **Lo que contesta**, por vídeo: `ready` (con su tamaño y su **dirección**), `pending`, `failed` (con un código),
  `missing`, o `not_supported` (no es un vídeo listo del Storage de Weë, o ya tiene el póster de otro —Media Cloud—,
  que no se pisa). La dirección la calcula el servidor al leer —la ruta más el token que está en el propio objeto, como
  la de cualquier material del Storage de Weë— y **no se guarda en ningún sitio**; la app nunca convierte una
  referencia de almacén en una URL.
- **Hacerlos** (`creator/renderizador.ts`, `crearEjecutorDePoster`): la cuarta implementación del puerto `JobExecutor`.
  Lee el paquete recalculando su identidad (uno tocado, o con el vídeo de otra cuenta, no se hace) y comprueba el vídeo
  —de la cuenta, listo, del Storage de Weë—. Si ya tiene su póster, termina; si su objeto está sin anotar y lleva su
  marca, lo comprueba y lo **anota** sin sacarlo otra vez; si no, baja el vídeo por su referencia, lo sondea, saca
  **un** fotograma con `spawn` sin shell, comprueba que es un JPEG del tamaño pedido, lo guarda **solo si no existe** y
  anota la variante.
- **El póster del montaje**, en el momento: el render (Fase 8) lo saca al terminar, del archivo que ya está en disco,
  sin bajarlo otra vez. Es el último paso y no cambia su desenlace: si no sale, el render está hecho igual y el póster
  se pide después como el de cualquier otro vídeo (su objeto, si llegó a guardarse, se adopta).
- **El trabajador** es el del render (`renderWorker`): la pasada atiende las dos tareas —y sigue descartando todo lo
  demás antes de evaluar—, pone los pósters **delante** en la cola y empieza cada trabajo solo si le cabe **su** intento
  entero; un montaje que ya no cabe sigue en la cola del almacén para la siguiente pasada. Reconciliar un póster es como
  reconciliar un render, con su propia verdad: la variante anotada (`poster_lost` si pasados dos minutos no está).
- **El latido, arreglado de paso**: el render solo renovaba la concesión mientras FFmpeg montaba, y bajar muchos planos
  también se la comía. Ahora cubre todo el intento —bajar, sondear, montar, guardar—, en el render y en el póster, y si
  el trabajo deja de ser suyo se para lo que haya en marcha (`lease_lost`).
- **En la app**, sin rediseñar nada y sin un texto nuevo: `tomaService.postersDeLaProduccion` pide los pósters por
  `renders` y se queda con los que están y traen dirección; `useVideosDeLaProduccion` pone a cada vídeo el suyo
  (`VideoDelPlano.poster`), y la tarjeta del plano pinta la **imagen** en vez de cargar el vídeo. Sin póster, o si no se
  puede preguntar, la tarjeta enseña el vídeo como antes.

Vallas reancladas por nombre con esta autorización, las dos de la Fase 8 (`filmmaker-render`): X2 (la concesión se
pierde a mitad de montaje; ahora el latido cubre todo el intento, y X2b nueva prueba perderla mientras se bajan los
planos) y G5 (la pasada descarta lo que no es un render ni un póster). Nada se despliega en esta fase.

Pruebas: `functions/test/filmmaker-poster.test.mjs` (en la cadena, con FFmpeg de verdad); en la app, `f1d-cliente`
(el servicio de los pósters) y `filmmaker-ui` (la tarjeta con su imagen).

### Fase 12 · Restaurar una versión (D12 de F6)

Decisión del usuario (2026-09-28): ante «¿qué capacidad hago ahora?», **sin preferencia**, así que va la recomendada,
con la ampliación del contrato de F1-B que se le explicó antes de hacerla. Restaurar es **volver a una revisión
anterior sin perder ninguna**.

- **Qué hace** (`productions/index.ts`, `restaurarRevision`): lee el registro (`leerRegistro`), **reconstruye** la
  revisión pedida con `reconstruirRevision` —la foto de la revisión 0 y los lotes, huella a huella— y la guarda como una
  revisión **NUEVA** encima de la de ahora, en una transacción y con **CAS** (`expectedRevision`), igual que un lote. Las
  revisiones de en medio siguen en el registro; se puede volver a cualquiera, también a una restauración.
- **El contrato que se amplía**, y solo eso: el registro gana el tipo `restore`, **sin campos nuevos**. Su `source` —el
  mismo que ya llevaba `duplicate`— dice a qué revisión se volvió, y `result.hash`, qué quedó. No guarda foto ni
  operaciones, así que una restauración no pesa más que un lote. `reconstruirRevision` la sigue: una entrada `restore`
  vale lo que valía la revisión a la que volvió, renumerada; una que apunte a sí misma, a una posterior, a otra
  producción o a ninguna es un historial roto (`history_broken`, `restore_source_invalid`).
- **Lo que vuelve pasa por la misma política que un lote**: un vínculo a un Element o un material que no está en la
  revisión de ahora se comprueba otra vez —un Element archivado o un material retirado se rechazan con su ruta—, y lo
  reconstruido se valida con la `integridad()` de hoy (lo que el modelo de ahora no acepta no se escribe:
  `production_invalid`, `restored_revision_invalid`).
- **Como un lote en todo lo demás**: el mismo `operationId` a la misma revisión es un reintento (`alreadyApplied`); a
  otra, `operation_id_reused`; volver a lo que ya hay no escribe nada (`changed: false`); archivada no se restaura; lo
  ajeno contesta como lo que no existe; y la respuesta dice lo pendiente de rehacer (`pendientesEntre` de F1-A) y si
  cambió la línea de tiempo. **Ni un código nuevo**: todo lo que puede salir mal ya tenía nombre y frase.
- **La puerta** (`productions`) gana la octava operación, `restore`: del cliente llegan la revisión que ve y a cuál
  vuelve, nada más. Sin dinero, sin IA, sin trabajos; F1-A, las reglas, los índices y la app, sin tocar. Enseñarlo en la
  app —la lista de versiones ya la puede leer su dueña (`productionRevisions`)— es del pase de UX.

Valla reanclada por nombre con esta autorización: `productions-runtime` Z6 (las operaciones de la puerta, ahora ocho).
Nada se despliega en esta fase.

Pruebas: `functions/test/filmmaker-restaurar.test.mjs` (en la cadena).

### Fase 13 · El prompt avanzado, usado al generar (D9 de F6)

Decisión del usuario (2026-09-28): **«AUTORIZADO D9 — ADVANCED PROMPT»**, con sus reglas: opcional, solo por un modo
avanzado oculto; NUNCA reemplaza el prompt de Weë —el resultado es «prompt de Weë actual + bloque fijo»—; en una
posición fija y determinista; las tomas sin prompt avanzado, exactamente como antes; Weë Brain sigue siendo la puerta
de entrada; ni proveedores, ni llamadas de IA, ni Credits, ni pagos, ni trabajos, ni workers, ni infraestructura, ni
F1-A, ni el Credit Engine, ni el Job Engine. El prompt avanzado de un plano (`shot.advanced.prompt`, guardado desde
F1-B) **se usa al generar**.

- **Dónde entra** (`creator/plano.ts`): el texto de Weë se compone con `componerTextoDeWee`, que es la plantilla
  `fm-plano-1` **sin una coma cambiada** —el mismo cuerpo de función—, y `componerPromptDePlano` le AÑADE detrás, en
  la **última línea**, el bloque `Additional direction: …` (`bloqueDelPromptAvanzado`): una sola línea, una sola vez.
  El texto de Weë de la toma normal es, carácter a carácter, el principio del texto con prompt avanzado.
- **Entero o nada**: el bloque tiene que caber en lo que queda de los 3000 caracteres detrás del texto de Weë de ESE
  plano (`sitioParaElPromptAvanzado`). Si no cabe, se rechaza con `advanced_prompt_too_long` (`chars`: lo que mide;
  `maxChars`: lo que cabe), con su frase en los once idiomas (`filmmaker.takeReasonAdvancedTooLong`); nunca se
  recorta. Es la ÚLTIMA regla: las de siempre se aplican antes y en el mismo orden. Vacío, en blanco, que no sea texto
  o que al limpiarlo se quede en nada, es como no tener.
- **Limpio**: sin enlaces (como el resto del texto), sin saltos de línea (se juntan, para que el bloque sea la última
  línea) y **sin órdenes de proveedor**: ModelArk admite parámetros escritos en el prompt (`--rs 1080p`, `--dur 10`,
  `--seed`…), y el precio se calculó con los del cuerpo de la petición; se quitan los guiones que abren una orden y las
  palabras se quedan. La suite comprueba que el cuerpo que armaría el adaptador pide lo mismo —modelo, resolución,
  duración y proporción— con o sin el bloque.
- **La plantilla, versionada**: la toma con prompt avanzado se compone con `fm-plano-2` (`PLANTILLA_DE_PLANO_CON_INDICACIONES`)
  y la reserva de la toma lo dice (`meta.filmmaker.plantilla`); la que no lo lleva sigue con `fm-plano-1` **byte a
  byte** —la suite lo compara con la versión anterior del traductor, compilada desde git—, también en producciones
  antiguas y en cada una de sus revisiones, restauradas incluidas. Mismo precio, mismos límites, una toma = una reserva
  y un trabajo, como siempre.
- **Lo que NO hace**: enseñarlo —el modo avanzado oculto es de la app y queda para el pase de UX— ni editarlo: F1-A
  sigue rechazando cambiarlo con `update_shot` (`not_editable_yet`), y tocar F1-A queda fuera de esta autorización; hoy
  se pone al crear la producción. F1-A, el Credit Engine, el Job Engine, los precios y el adaptador de Seedance, sin tocar.
- **Hallazgo, sin tocar**: el mismo hueco de las órdenes de proveedor existe desde F1-D en el resto del texto de la
  persona (descripción, acciones, fichas), que ya está desplegado. Quitarlas ahí cambia el texto —y la huella— de
  todos los planos que las lleven, así que es una decisión aparte.

Vallas reancladas por nombre con esta autorización: `f1d-generacion` H (el texto avanzado ya viaja; las referencias,
no) y O (el prompt avanzado ya no bloquea), `f1d-cliente` M1 (12 motivos del plano) y M5 (69 claves de la toma) e
`i18n-preferencia-usuario` 57–58 (`CLAVES_PT` 3103 → 3104). Nada se despliega en esta fase.

Pruebas: `functions/test/filmmaker-prompt-avanzado.test.mjs` (en la cadena).

## Próximas fases

| Fase | Cómo usa este dominio |
|---|---|
| F1-B | **Hecha**: guarda la producción (D2), aplica operaciones en el servidor con CAS y registro (D12); conectada (35 Functions) y sin desplegar |
| F1-C | **Hecha**: la producción en la app —«Varias escenas» dentro de Weë Studio—, con el storyboard, el panel Director, el estado optimista con CAS y los `messageKey` (`filmmaker.*`) en once idiomas; sin generar ni cobrar |
| F1-D | **Hecha** (local, sin desplegar): una toma de un plano a partir de su requisito (D4), asíncrona por el Core (D5), cotizada y enlazada a su `ShotNode` con verificación en el servidor |
| F2 | Weë Brain convierte lo que se dice en operaciones y enseña las recomendaciones. **Hecha en el servidor** (Filmmaker Engine, Fase 9; local, sin desplegar): la propuesta y su comprobación; enseñarla en la app, en el pase de UX |
| F3 | Personajes y continuidad: fichas, `ElementBinding` y apariencia. **Hecha la parte de vincular** (Filmmaker Engine, Fase 10; local, sin desplegar): vínculos verificados; usar sus imágenes al generar, pendiente de validar |
| F4 | **Hecha** (Filmmaker Engine, Fase 6; local, sin desplegar): generación de varios planos por la misma puerta, con los requisitos del servidor y el resumen por capacidad para cotizar |
| F5 | Línea de tiempo, audio y montaje sobre los requisitos de ensamblado. **Hecha** (Filmmaker Engine, Fases 7 y 8; local, sin desplegar): el manifiesto del montaje, sus argumentos de FFmpeg y el render como tarea del Job Engine, con su material y su registro; y el póster de cada vídeo y del montaje (Fase 11); exportar o publicar el montaje, aparte |
| F6 | Director avanzado: prompt avanzado (D9), versiones (D12). **Hechos «restaurar»** (Filmmaker Engine, Fase 12) **y usar el prompt avanzado al generar** (Fase 13), locales y sin desplegar; enseñarlo y editarlo, pendientes (pase de UX y lenguaje de F1-A) |

## Pruebas

`functions/test/filmmaker-espejo.test.mjs`: el espejo del cliente es F1-A —generado, igual tipo a tipo y en ejecución— y la
app entra por una sola puerta.
`functions/test/filmmaker-ui.test.mjs`: la pantalla dibujada con el traductor, el estado y el dominio de verdad —vacíos, cargada,
selección, gestos, recomendaciones, guardado, error, conflicto y archivada—. `functions/test/filmmaker-i18n.test.mjs`: el
módulo en los once diccionarios y una frase por código. `functions/test/filmmaker-navegacion.test.mjs`: la ruta, las cuatro
puertas, CreatorFlow intacto y la entrada de «Varias escenas». `functions/test/filmmaker-servicio.emulator.mjs`, fuera de la
cadena: el servicio y el controlador de la app contra la callable del emulador, con Auth
(`firebase emulators:exec --only auth,functions,firestore --project demo-wee-filmmaker "node functions/test/filmmaker-servicio.emulator.mjs"`).
`functions/test/filmmaker-servicio.test.mjs`: las siete operaciones del servicio, lo que nunca se manda, cada fallo y la
frontera (nadie más habla con `productions`). `functions/test/filmmaker-reductor.test.mjs`: cada gesto en local igual que
en F1-A, los rechazos, el lote, la reversión, el conflicto y el controlador contra un servidor en memoria con el contrato
de la puerta y el F1-A compilado.
`functions/test/filmmaker-modelo.test.mjs` (con `npm run build` antes): modelo, formatos y presets, validación,
operaciones, lo pendiente, recomendaciones, requisitos contra los validadores del Core, fronteras y determinismo.
`functions/test/productions-runtime.test.mjs`: la persistencia con una base de mentira que se comporta como Firestore en
lo que importa (transacciones con lecturas antes que escrituras, `create` que falla si existe, reintentos y fallos
provocados al confirmar), de `create` a la puerta, las reglas, el índice y este documento.
`functions/test/productions.emulator.mjs`, fuera de la cadena: las reglas y las transacciones contra el emulador
(`firebase emulators:exec --only firestore --project demo-wee-filmmaker "node functions/test/productions.emulator.mjs"`,
con Java 21). `functions/test/productions-callable.emulator.mjs`, también fuera: la callable servida por el runtime de
Functions —el mismo `lib/index.js` que se desplegaría— con sus guardas
(`firebase emulators:exec --only functions,firestore --project demo-wee-filmmaker "node functions/test/productions-callable.emulator.mjs"`).

`functions/test/f1d-generacion.test.mjs`: la toma de punta a punta —la puerta, el conductor, el Job Engine, la
liquidación, el materializador, productions, F1-A, `shots` y el Credit Engine de verdad sobre un Firestore en
memoria—, cada rechazo, el precio, el cupo, el plazo, el enlace verificado, la adopción y las guardas de toda la
carpeta `functions/src`. `functions/test/f1d-cliente.test.mjs`: el controlador, los servicios con Firebase doblado, lo
que se ve con el español de verdad y una frase por motivo en los once idiomas. `functions/test/f1d.emulator.mjs`, fuera
de la cadena: la toma contra Firestore y Storage emulados y un ModelArk falso local —el cuerpo real del adaptador,
el cupo con transacciones de verdad, el enlace por la callable, la adopción y `expired`—
(`firebase emulators:exec --only firestore,storage --project demo-wee-filmmaker "node functions/test/f1d.emulator.mjs"`).

Las baterías de sabotajes de F1-A y F1-B se ejecutan como las de S2, con el mismo corredor externo; llevar las
baterías al repositorio es una decisión aparte, todavía abierta.
