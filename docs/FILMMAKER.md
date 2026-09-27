# Weë Filmmaker — la producción: su dominio (F1-A) y su persistencia (F1-B)

> Estado: **F1-A y F1-B construidas; la callable `productions`, conectada y sin desplegar**. F1-A es un dominio
> puro: no guarda, no genera, no cobra y no tiene interfaz; vive en `functions/src/filmmaker/`. F1-B lo guarda:
> `functions/src/productions/`, con reglas e índice **preparados y sin desplegar**, y la callable `productions`, que
> `functions/src/index.ts` **exporta** y el mapa del runtime declara (35 Functions, ADR-FM-010). Pruebas:
> `functions/test/filmmaker-modelo.test.mjs` y `functions/test/productions-runtime.test.mjs`, dentro de la cadena de
> `npm test`, y `functions/test/productions.emulator.mjs` y `functions/test/productions-callable.emulator.mjs`, fuera
> de ella.

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
Solo viaja al requisito de su plano. Cómo se guarda lo decide ADR-FM-008 (F1-B); cómo se enseña y cómo se usa al
generar sigue pendiente (D9).

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

De las catorce decisiones de la auditoría, F1-B resolvió D2 y D12 (mínima) y D9 en parte, con autorización. Las
demás siguen **pendientes**:

| # | Decisión | Estado |
|---|---|---|
| D1 | Nombre visible y en código | pendiente (el módulo se llama `filmmaker`, sin «Engine») |
| D2 | Dónde vive la producción (reutilizar `scenes`/`shots` o un agregado propio) | **decidida** en F1-B (ADR-FM-005): `productions` + `productionScenes`; el Core será la unidad de generación en F1-D |
| D3 | Entrada en Weë Studio | pendiente |
| D4 | Ejecución por plano | pendiente |
| D5 | Vídeo asíncrono | pendiente |
| D6 | Weë Brain para intención y cambios | pendiente: el idioma de las operaciones ya existe |
| D7 | Montaje y render | pendiente |
| D8 | Duración y publicación (Weëls ≤ 15 s) | pendiente |
| D9 | Prompt avanzado: guardarlo, enseñarlo y usarlo | **en parte**: guardarlo, decidido (ADR-FM-008); enseñarlo y usarlo al generar, pendiente |
| D10 | Identidad de personajes | pendiente: sin biometría ni embeddings |
| D11 | Precios, límites y cancelación | pendiente: no hay precios en F1-A |
| D12 | Versiones y «restaurar» | **decidida** en su parte mínima (ADR-FM-006 y 007): revisión con CAS y registro; «restaurar», pendiente (F6) |
| D13 | Reproductor | pendiente |
| D14 | Vocabulario de cámara v2 (extreme wide, full, MCU, over-the-shoulder, insert, zoom, rack focus, leading lines) | pendiente: se usa el vocabulario actual del Core |

## Lo que el lenguaje aún no tiene

Añadir, editar o quitar personajes, lugares, objetos y referencias; cambiar la dirección creativa de la producción
(salvo estilo, cámara, movimiento y luz); cambiar una transición; mover un plano a otra escena. No los pide F1-A y
entrarán cuando una fase los necesite (F1-C, F2). Con F1-B, eso significa que las fichas y las referencias de una
producción guardada se fijan al crearla (`create` con una producción entera) y no cambian después hasta que el
lenguaje las tenga.

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
| `production_archived`, `element_binding_not_supported`, `history_too_long` | `failed-precondition` |
| `production_id_taken`, `operation_id_reused` | `already-exists` |
| `production_corrupted`, `history_broken` | `data-loss` |
| el resto (`production_invalid`, `operations_invalid`, `reference_rejected`, tamaños, ids…) | `invalid-argument` |

### Revisión, CAS y registro

Ver ADR-FM-006 y ADR-FM-007. En corto: una revisión por lote; `expectedRevision` se compara en la transacción que
escribe; un lote sin cambios no escribe ni deja entrada; el mismo `operationId` con el mismo lote es un reintento
(`alreadyApplied`) y con otro, `operation_id_reused`; la revisión 0 es la foto y las siguientes, los lotes;
`leerRegistro` + `reconstruirRevision` rehacen cualquier revisión comprobando su huella. Restaurar no existe (F6).

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

- **Un Element de verdad**: cualquier `ElementBinding` —en un personaje, un lugar, un objeto o una referencia— es
  `element_binding_not_supported`. Comprobarlo es F3; `shots` no se toca para ello.
- **Un material que no sea tuyo**: cada `assetId` nuevo se comprueba con `leerMaterial` y `puedeReferenciar` del
  Core: `not_found` (no existe o es de otra cuenta, la misma respuesta), `not_usable` o `kind_mismatch`. Solo se
  guarda el id: ni URL, ni bytes, ni la ficha.
- **Un id de escena que Firestore reserva** (`__…__`): `id_not_storable`.

### Reglas e índice

Las tres colecciones las lee solo su dueña y el cliente no escribe en ninguna; van al final de `firestore.rules`,
detrás de C3. Un índice, el de la lista: `productions` (`ownerAccountId` ↑, `status` ↑, `updatedAt` ↓). Las escenas
y el registro se leen por ruta y no necesitan ninguno. La guarda de `moderation` que fija el total de índices sube
de 35 a 36, como subió con cada fase que añadió uno. Nada de esto está desplegado.

## Próximas fases

| Fase | Cómo usa este dominio |
|---|---|
| F1-B | **Hecha**: guarda la producción (D2), aplica operaciones en el servidor con CAS y registro (D12); conectada (35 Functions) y sin desplegar |
| F1-C | Pinta el storyboard con las tarjetas, habla con `productions` y traduce los `messageKey` (`filmmaker.*`) a frases en todos los idiomas |
| F1-D | Genera un plano a partir de su requisito (D4) |
| F2 | Weë Brain convierte lo que se dice en operaciones y enseña las recomendaciones |
| F3 | Personajes y continuidad: fichas, `ElementBinding` y apariencia |
| F4 | Generación de varios planos, con los requisitos y el resumen por capacidad para cotizar |
| F5 | Línea de tiempo, audio y montaje sobre los requisitos de ensamblado |
| F6 | Director avanzado: prompt avanzado (D9), versiones (D12) |

## Pruebas

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

Las baterías de sabotajes de F1-A y F1-B se ejecutan como las de S2, con el mismo corredor externo; llevar las
baterías al repositorio es una decisión aparte, todavía abierta.
