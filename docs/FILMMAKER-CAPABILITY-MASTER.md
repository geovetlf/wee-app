# Filmmaker Engine × Weë Studio: matriz maestra de capacidades

> Fase 32 del motor, 2026-09-29. Trabajo local en `filmmaker/core`. No se hizo push, merge ni deploy, no se gastó dinero, no se ejecutó ningún canary y no se abrió ninguna puerta. No se tocó ningún contrato cerrado. En esta fase no cambia el código de la app ni el de `functions/src`: solo este documento y su suite (`functions/test/filmmaker-capability-master.test.mjs`).

**La regla de esta ronda.** Si una capacidad existe en el engine o en un adaptador, la persona tiene que tener un camino
real para usarla en Weë Studio. Si todavía no puede usarse, aparece en su sitio natural del workplace, cerrada, con el
porqué: falta un canary, falta un contrato o falta un proveedor. No hay botones decorativos ni capacidades escondidas.

**Para qué sirve este documento.** Es la fuente única de las fases 32 a 40: cada capacidad, dónde vive en Weë Studio,
qué la detiene, si gasta dinero, qué prueba y qué sabotaje la cubren. Cada fase actualiza sus filas y la tabla se
regenera entera. Sustituye como referencia viva a la matriz de 96 filas de la Fase 31 (`CAPABILITY-WORKPLACE-CLOSURE.md`),
que se conserva como el cierre de aquella fase.

## 1. Cómo se lee

**El camino completo.** Una capacidad está entera solo si recorre: persona → workplace → control → estado en la UX →
servicio → F1-A → engine → adaptador → proveedor → resultado → material → proyecto → historial o versión → UI. La
columna STATUS dice dónde se corta ese camino.

| STATUS | Qué significa |
|---|---|
| A · usable | El camino está entero: se puede usar hoy (con su puerta, si gasta) |
| B · UX | El motor la hace y le falta su sitio, o le falta una parte del sitio |
| C · no effect | Hay dato y control, pero nadie lo lee: se deja sin control a propósito |
| D · adapter | Un adaptador del engine la sabe hacer y Filmmaker no la pide |
| E · canary | Construida entera; falta probarla de verdad, con gasto |
| F · contract | Hace falta cambiar un contrato cerrado (F1-A/B/C/D, render, voz, Credit Engine) |
| G · nonexistent | Ni el proveedor de Weë ni el motor la tienen |
| H · intentionally excluded | Va contra una regla o una decisión de Weë, o está fuera del mapa aprobado |

| Columna | Qué dice |
|---|---|
| ENGINE, ADAPTER, SERVER | Qué hay en cada capa (✔, ✘ o el porqué) |
| F1-A | Si la capacidad es un dato u operación de F1-A |
| UX | Si la persona tiene su control |
| WORKPLACE | El sitio natural dentro de Weë Studio |
| CANARY | `no`, `hecho`, `pendiente` (se usa tras su puerta y falta validar algo) o `sí` (no se usa hasta hacerlo) |
| CONTRACT | `no`, o `sí` con el contrato exacto |
| PROVIDER, COST | Quién la haría y si gasta dinero real |
| TEST, SABOTAGE | La suite y la batería de sabotajes que la cubren |
| MOBILE | Si su control está comprobado a 360 y 390 px |

Las filas C01–C76 y X01–X20 vienen de la Fase 31; N01–N31 salen del repaso interno de esta fase y del contraste con la
documentación oficial de Seedance; I01–I20, de la investigación externa (sección 3).

## 2. El análisis de huecos, área por área (Fase 32)

Tres pasadas: la matriz de 96 de la Fase 31, una segunda lectura operación a operación y campo a campo contra lo que de
verdad consume cada capa (la plantilla del texto de la toma `componerTextoDeWee`, el requisito de F1-A, el adaptador de
Seedance, el montaje y la publicación), y la investigación externa (sección 3). El camino que se exige a cada capacidad
es el entero: persona → workplace → control → estado en la UX → servicio → F1-A → engine → adaptador → proveedor →
resultado → material → proyecto → historial → UI.

### 2.1 El adaptador de Seedance frente a Filmmaker

El adaptador (`functions/src/engine/providers/seedance.ts`) ya sabe más de lo que Filmmaker le pide:

| Lo que el adaptador sabe | Cómo | Lo que Filmmaker hace hoy | Qué lo desbloquea |
|---|---|---|---|
| Texto a vídeo | `video.generate` | La toma de un plano (A) | — |
| Primer y último fotograma | `video.image_to_video`, `first_frame` / `last_frame`, `ratio: adaptive` | F1-A calcula la capacidad; F1-D la rechaza (`capability_not_supported`); la UX tiene los huecos del plano | Contrato 1 + canary |
| Referencias de imagen, vídeo y audio | `video.reference`, `reference_image` / `reference_video` / `reference_audio`; la API da cupos separados (2.0: 9 imágenes, 3 vídeos y 3 audios, 15 s en total; 2.5: 30, 10 y 10, 30 s) | F1-D rechaza (`references_not_supported`); la UX guarda y asigna papeles | Contrato 1 + canary (R20, los cupos, cerrado en la Fase 33) |
| Editar y extender (solo 2.5) | `omni_reference_task_type: edit / extend` dentro de `video.reference` | No hay operación ni requisito | Contrato 2 + canary (R19, `adaptive` y el tipo de tarea, cerrado en la Fase 33) |
| Sonido nativo | `generate_audio` (por defecto `true` si no se dice) | `audio.withSound` del plano o de la escena llega al requisito y al precio (A) | Canary de una toma con sonido |
| Semilla | `seed` (cableada) | No se manda | Nada que prometer: la API la documenta solo para Seedance 1.x (R21) |
| Cámara fija | `camera_fixed` (cableada) | El movimiento «Quieta» va en el texto de la toma (A) | Nada: en 2.x la cámara fija se escribe en el texto (R21) |
| Proporción 3:4 | `RATIOS` incluye `3:4` | F1-A no la tiene (sí 4:5, que el proveedor no genera) | Contrato F1-A (añadir 3:4) y decisión sobre 4:5 |
| Plazo de la tarea y aviso | `execution_expires_after`, webhook `seedanceCallback` | Usado por la toma (A) | — |
| Hasta 30 s por toma (Seedance 2.5) | `maxDurationSec: 30` | F1-D limita a 15 s (`duration_too_long`) | Canary de «Máxima» + cambio de `LIMITES_DE_PLANO` |
| 4K (Seedance 2.0) | `resolutions` | Calidad «Alta»/«Máxima» cerradas (`model_unavailable`) | Canary |
| Último fotograma de la toma | la API (`return_last_frame`, todos los modelos); el adaptador no lo pide ni lo lee | — | Adaptador + contrato 1 + canary (N22) |
| Borrador a 480p y final a 1080p | la API (`draft`, solo 2.5); el adaptador no | — | Adaptador + F1-D + canary (N23) |
| Diálogo con labios sincronizados | la API, desde el texto (entre comillas) con el sonido nativo; timbre por `reference_audio` | F1-D rechaza el diálogo a cámara (`dialogue_not_supported`) | Contrato 6 + canary |
| Precio | fórmula oficial por tokens (`seedanceCostUsd`) | El precio antes de confirmar (A) | R18 y R22, cerrados en la Fase 33: la tabla oficial de píxeles y el techo de `-1` y de la entrada |

### 2.2 Filmmaker (F1-A / F1-B / F1-C / F1-D)

- 54 de las 56 operaciones tienen control; `change_generation` y `change_edit_plan` no, porque hoy no cambian nada de lo
  que se genera o se monta (Fase 31).
- Todo lo que llega a la toma tiene control (Fase 31). Quedan campos que se guardan y nadie lee: edad aparente, rasgos
  en lista, relaciones y bloqueos de un personaje, prioridades del brief, emoción e idioma de una línea, continuidad
  fina (anclajes, disposición, «puede cambiar»), referencias de un sonido y su duración.
- Riesgos de la auditoría técnica que siguen abiertos: **R2** (órdenes de proveedor en el texto normal), **R3**
  (trabajos de toma huérfanos), **R4** (inanición de la reconciliación), **R5** (firma de la toma demasiado ancha:
  contrato F1-D), **R8** (techo de 1 000 revisiones: contrato F1-B), **R9** (Wäll 600 s frente a Weëls: decisión de
  producto) y **R15** (la toma dice «se están devolviendo» con el dinero en reconciliación). R1, R6, R7, R10, R12, R13,
  R14, R16 y R17 se cerraron en la Fase 22; R11, en la 26.
- Riesgos nuevos, de contrastar el adaptador con la documentación oficial (sección 3.1): **R18** (la tabla de
  píxeles del precio solo acertaba en 16:9 y 9:16: 1:1 un 44 % por debajo, 4:3 y 3:4 un 25 % por debajo, 21:9 un 31 %
  por encima), **R19** (editar y extender en 2.5 exigen `adaptive`, que el engine no mandaba, y el tipo de tarea iba
  a modelos que no lo tienen), **R20** (cupos de referencias de vídeo y audio mezclados) y **R21** (semilla y cámara
  fija cableadas para parámetros que la API solo documenta en 1.x: no hacen daño, no se prometen).
- Y uno más, encontrado al arreglarlos (Fase 33): **R22**. La puerta `generateVideo` de siempre —desplegada— cotizaba
  con lo que declaraba el cliente: una duración `-1` («que la decida el modelo», hasta 15 s o 30 s) se cotizaba como
  5 s, y los segundos de un vídeo de referencia (que puede ser uno ya generado de la propia cuenta) los decía quien
  llamaba. La app nunca manda ninguna de las dos cosas, pero una llamada hecha a mano podía pagar menos de lo que
  factura el proveedor. Cerrado en `filmmaker/core`: se cotiza el máximo del modelo. **En producción sigue abierto
  hasta que se despliegue.**
- **Fase 33**: R2, R15, R18, R19, R20 y R22, cerrados sin gastar y sin tocar contratos cerrados; R3 y R4, preparados
  (abajo).

**Estado de los riesgos.** La suite `filmmaker-capability-master` comprueba cada «abierto» y cada «cerrado» contra el
código: si el código cambia y la tabla no, falla.

| Riesgo | Estado | Qué |
|---|---|---|
| R2 | cerrado (Fase 33) | Las órdenes del proveedor (`--dur`, `--rs`…) solo se quitaban del prompt avanzado; ahora el adaptador se las quita a cualquier texto que llegue a Seedance |
| R3 | decisión | Trabajos de toma huérfanos: el barrido que los recogería vive en el runtime cerrado (Fase 12-D). Preparado abajo |
| R4 | decisión | Inanición de la reconciliación (12 preguntas por pasada, siempre desde el principio): runtime cerrado y barrido desplegado. Preparado abajo |
| R5 | contrato | La firma de la toma es demasiado ancha (F1-D) |
| R8 | contrato | Techo de 1 000 revisiones por producción (F1-B) |
| R9 | decisión | Wäll hasta 600 s frente a Weëls de 15 s: decisión de producto |
| R15 | cerrado (Fase 33) | La toma decía «se están devolviendo» con el dinero en reconciliación; ahora dice que se está comprobando, con la misma decisión que su estado y su liquidación |
| R18 | cerrado (Fase 33) | La tabla de píxeles del precio solo acertaba en 16:9 y 9:16 (1:1 un 44 % por debajo, 4:3 y 3:4 un 25 %, 21:9 un 31 % por encima); ahora es la oficial |
| R19 | cerrado (Fase 33) | Editar y extender en Seedance 2.5 exigen `adaptive` y el engine no la mandaba; el tipo de tarea iba a modelos que no lo tienen |
| R20 | cerrado (Fase 33) | Vídeo y audio de referencia compartían un cupo; en 2.0 se dejaba pasar solo audio |
| R21 | se queda | Semilla y cámara fija cableadas para parámetros que la API solo documenta en 1.x: no hacen daño y no se prometen |
| R22 | cerrado (Fase 33) | El precio de un vídeo lo abarataba quien llamaba: `-1` se cotizaba como 5 s y los segundos de vídeo de entrada los declaraba el cliente. Ahora, el máximo del modelo (encontrado en la Fase 33; en producción hasta que se despliegue) |

#### R3 · Los trabajos de toma que se quedan sin nadie

- **Hoy.** Si el proceso que tiene una toma muere ANTES de mandarla al proveedor (la concesión caduca y el intento
  sigue con `dispatched: false`), el trabajo se queda sin terminar y la liquidación lo deja «recuperable»: nadie lo
  mueve, la toma dice «en cola» y sus Credits siguen apartados. `recuperacionDeTomas` (Fase 4) solo mira reservas SIN
  trabajo. Lo que lo movería —`barrerRecuperables` (`functions/src/job/worker.ts`)— existe y no lo programa nadie.
- **El cambio mínimo.** Que la pasada programada (`functions/src/settlement/programado.ts`, desplegada) llame a
  `barrerRecuperables` antes de liquidar, con su página y su cursor. El Job Engine (`engine.evaluar`) decide con su
  política si el trabajo se reintenta o se da por fallido, y la liquidación de siempre devuelve lo que no salió.
- **Por qué no se hace solo.** Toca el runtime cerrado de la Fase 12-D y la tarea programada de producción. Y hay
  que decidir antes qué es un trabajo recuperado: re-encolarlo solo sirve si alguien consume la cola, y hoy la toma
  la ejecuta la propia llamada; darlo por fallido devuelve el dinero y la persona pide otra toma.
- **Pruebas que llevaría.** Un trabajo con la concesión caducada y sin salir: tras la pasada, fallido (o re-encolado,
  según lo decidido) y su reserva devuelta una sola vez. Uno que salió (`dispatched`): no se toca, es de la
  reconciliación. Dos pasadas a la vez: una sola transición. **Sabotajes:** quitar la llamada, liquidar antes de
  barrer, barrer lo que ya salió.

#### R4 · La reconciliación que siempre empieza por el mismo sitio

- **Hoy.** `reconciliarTrabajos` (`functions/src/runtime/reconciliador.ts`) recorre `recuperables` por orden de
  identificador, desde el principio en cada pasada, y se para a las doce preguntas (`MAX_PREGUNTAS`). Si hay más de
  doce trabajos que necesitan pregunta y los primeros no se resuelven —el proveedor no contesta o siguen en marcha—,
  los de detrás no se preguntan nunca.
- **El cambio mínimo.** Que cada pasada empiece donde se quedó la anterior: `reconciliarTrabajos` acepta un cursor
  de partida, la tarea programada guarda el `cursor` del informe cuando `agotadas` es verdad (un documento pequeño
  de estado del barrido) y, al llegar al final, se vuelve a empezar.
- **Por qué no se hace solo.** Runtime cerrado y barrido desplegado.
- **Pruebas que llevaría.** Treinta trabajos que el proveedor nunca contesta: en tres pasadas se ha preguntado por
  todos. El cursor vuelve al principio al llegar al final. Un cursor de un trabajo que ya no existe no rompe nada.
  **Sabotajes:** no guardar el cursor, no volver a empezar.

### 2.3 Weë Studio

- «Varias escenas» abre la producción con la idea; las fotos de la caja no pasan (subirlas a Mis creaciones es la
  prueba real de la subida, `mediaCanary`) y se dice (Fase 31).
- «Crear vídeo» (un clip) es honesto con duraciones y calidades; Mis creaciones es la de la cuenta.

### 2.4 Weë AI Director

- Hay «Proponer escenas» y «Revisar la producción»; cada propuesta enseña el cambio en frases, el porqué, que aplicar
  es gratis y cuántos planos habría que rehacer.
- Falta: **qué planos** afecta (N03: la propuesta ya trae `pending` del servidor y solo se cuenta), un **resumen
  estructurado** de lo que quedaría (N04: escenas, planos, duración, lo que cada plano pediría para generarse,
  referencias; se puede calcular en la app con el mismo F1-A del espejo), **«Proponer planos»** (N06), **«Explicar»**
  (N07), **mejorar la descripción del plano elegido** (N08) y **revisar la continuidad** (N09) como puertas rápidas,
  **generar solo una escena** (N01), y el **coste estimado** de lo que habría que generar antes de aplicar (N05: hoy
  solo existe después, en «Generar la producción»).

### 2.5 El workplace

- Proyecto: las siete secciones están.
- Historia: Storyboard y Guion están; **Escenas** (N10: la lista de escenas con su propósito, lugar, hora, clima,
  reparto, duración y planos) y **Continuidad** (N11: cómo evoluciona cada personaje, objeto y lugar de un plano a
  otro) no existen como vistas, aunque los datos sí.
- Plano: todo lo que llega a la toma tiene su sitio (Fase 31); «Generar» vive en el Director y en la herramienta «IA»
  de la línea de tiempo, y no se alcanza desde «Propiedades del plano» (N13). Volver a una toma anterior es el
  contrato 3 (N31).
- Línea de tiempo: nueve pistas en escritorio; en el teléfono seis, y **falta la de diálogo** (N12).
- Exportar: montaje, descargar, Weël, Wäll, subtítulos (preferencia), color y entregas (cerrados con su porqué); la
  app ya carga **los montajes anteriores** y solo enseña el de hoy (N02).

### 2.6 Referencias

- Se añaden desde Mis creaciones o lo guardado, se describen, se les da papel, se sustituyen y se quitan.
- Falta en cada ficha (N14): **vista previa** (miniatura del material), **origen** (Mis creaciones o lo guardado),
  **estado** del material (listo, retirado). El papel «storyboard» no existe en F1-A (N15, contrato). La serie 2.x de
  Seedance rechaza referencias con caras reales salvo personas autorizadas (N27).

### 2.7 Audio

- Sonido propio del plano y de la escena (A, canary pendiente), sonidos descritos (música, efectos, ambiente) con su
  sitio y su nivel, diálogo, narrador y «cómo suena» cada personaje.
- F1-A no tiene fundido, inicio dentro del tramo ni «activo» (N17): contrato. La duración de un sonido existe en F1-A y
  no tiene control (N16); nada suena todavía (no hay mezcla ni generación de música/efectos).

### 2.8 Continuidad

- Estado de cada personaje por escena y plano (vestuario y «cómo está», en palabras), reglas de continuidad por nivel,
  sujeto del plano, apariencia. Falta **verla de un plano a otro** (N11); el estado estructurado (postura, emoción,
  posición, estado de lugares y objetos) es el contrato 5.

### 2.9 Montaje, exportación y publicación

- Montaje por huella (el de hoy frente al desfasado), descargar, publicar como Weël (≤15 s) o en el Wäll (600 s: R9,
  decisión pendiente), pósters automáticos. Sin subtítulos en el render, sin etalonaje, sin entregas múltiples, sin
  elegir el fotograma del póster (N24), sin escalado (N25) y sin máster para etalonar (N26).

### 2.10 El workplace pedido, sitio a sitio

La estructura que pide el encargo, contra lo que Weë Studio tiene hoy dentro de una producción (el layout aprobado se
mantiene: Montaje con el visor y la línea de tiempo, Historia, Director y Proyecto; el plano elegido se edita en
«Propiedades del plano», que en el teléfono se abre como hoja).

| Sitio | Qué hay hoy | Filas | Qué falta y en qué fase |
|---|---|---|---|
| Proyecto › Brief | Objetivo, público, tipo, duración pedida, nombre, reglas de la pieza | C01, X01, X06 | Género y época (contrato), prioridades (X16) |
| Proyecto › Dirección | Tono, ritmo, estilo, ánimo, paleta y etalonaje en palabras | C04–C08 | — |
| Proyecto › Reparto | Fichas con apariencia rasgo a rasgo, sustituir, «cómo suena» | C22, X05, X08 | Referencias de la ficha (contrato 1), voz (contrato 4), hoja del personaje (I02) |
| Proyecto › Lugares | Fichas con apariencia | C26 | Estado del lugar (contrato 5) |
| Proyecto › Objetos | Fichas con apariencia | C29 | Estado y posición (contrato 5) |
| Proyecto › Referencias | Desde Mis creaciones o lo guardado, con descripción, papel, sustituir y quitar | C31, X07, X20 | Vista previa, origen y estado (N14, Fase 36); papel «storyboard» (N15) |
| Proyecto › Versiones | Lista con «Volver a esta versión» | C65 | — |
| Historia › Storyboard | Tarjetas por plano | C36 | El boceto (C37, regla 10) |
| Historia › Guion | Líneas de diálogo, voz en off y narración | C38 | Emoción e idioma de una línea (X15) |
| Historia › Escenas | — | N10 | La vista de escenas (Fase 35) |
| Historia › Continuidad | Reglas por nivel en el plano | C40 | La evolución plano a plano (N11, Fase 35) |
| Plano › Qué pasa, Sujeto | Acciones y sujeto | X04, X02 | — |
| Plano › Personaje, Lugar, Objetos, Estado | Reparto del plano, lugar de la escena, objetos, vestuario y «cómo está» | C22–C29 | Estado estructurado (contrato 5) |
| Plano › Cámara, Lente, Movimiento, Composición, Luz | Opciones de cada una | C10–C20 | Apertura, movimientos combinados, luz avanzada (lenguaje creativo v3) |
| Plano › Estilo, Ánimo | Por plano y por escena, con el heredado dicho | X09, C07 | — |
| Plano › Audio, Diálogo | Sonido propio del plano; el diálogo vive en el Guion | C53, C38 | Diálogo a cámara (contrato 6) |
| Plano › Referencias | Huecos por papel (primer y último fotograma, movimiento, sonido) cerrados con su porqué | C50, X18 | Contrato 1 + canary; continuar desde el último fotograma (N22) |
| Plano › Continuidad | Aspectos y fuerza | C40 | Continuidad fina (X17) |
| Plano › Prompt avanzado | Se ve, oculto por defecto | C43 | Editarlo (F1-A, ADR-FM-008) |
| Plano › Generar | Desde la herramienta «IA» de la línea de tiempo y desde el Director | C45, N13 | Un acceso en «Propiedades del plano» (Fase 37) |
| Weë AI Director › Analizar | «Revisar la producción» | C41, C42 | Revisar la continuidad (N09) y las tomas con visión (I18) |
| Weë AI Director › Proponer cambios, Proponer escenas | Propuestas de Weë Brain | C39, C42 | Qué planos afecta (N03) y su resumen (N04), Fase 34 |
| Weë AI Director › Proponer planos, Explicar | — | N06, N07 | Fase 34 |
| Weë AI Director › Precio, Aplicar, Descartar | Precio de la respuesta; aplicar gratis y reversible; descartar | C68, C42 | El coste de lo que habría que generar antes de aplicar (N05, contrato) |
| Línea de tiempo | Vídeo, audio, música y ambiente descritos, transiciones, niveles; diálogo en escritorio | C55, C57, C58 | Diálogo en el teléfono (N12), duración del sonido (N16), fundidos (N17), pistas (X11), Fase 37 |
| Visor | El vídeo del plano elegido y su resolución | C67 | Reproducir el montaje entero (C56) |
| Exportar / Publicar | Montaje, descargar, Weël, Wäll, subtítulos (preferencia), color y entregas cerrados con su porqué | C54, C61–C64 | Versiones finales (N02, Fase 38); subtítulos, color y entregas en el render |

## 3. La investigación externa, clasificada

Se investigaron las capacidades, nunca la interfaz ni la marca: la documentación oficial de Seedance en BytePlus
ModelArk (leída el 2026-09-29), Higgsfield (Cinema Studio 4.0, notas de versión hasta el 2026-09-23), OiiOii y los
demás motores de vídeo con IA. Cada hallazgo lleva una clase de la investigación, el WORKPLACE donde viviría en
Weë Studio y el CONTROL que lo manejaría. Las clases:

| Clase | Qué significa |
|---|---|
| A · motor y UX | Weë ya lo tiene, con su sitio en el workplace |
| B · motor sin UX | El motor lo hace; falta el sitio |
| C · adaptador sin usar | El adaptador de Seedance lo sabe; Filmmaker no lo pide |
| D · solo canary | Construido; falta probarlo de verdad, con gasto, y eso necesita autorización |
| E · contrato | Hace falta cambiar un contrato cerrado (F1-A/B/C/D, render, voz) |
| F · no existe | Ni el proveedor de Weë ni el motor lo tienen |
| G · no debemos | Va contra una regla o una decisión de Weë, o fuera del mapa aprobado |

### 3.1 Seedance en BytePlus ModelArk frente al adaptador y a Filmmaker

Fuentes: la API de creación, consulta y cancelación de tareas, las guías de Seedance 2.5 y 2.0, la lista de modelos y
los precios de docs.byteplus.com (ModelArk). Modelos oficiales: 2.5 `dreamina-seedance-2-5-260628`, 2.0
`dreamina-seedance-2-0-260128`, 2.0 fast `dreamina-seedance-2-0-fast-260128`, 2.0 mini
`dreamina-seedance-2-0-mini-260615` —los cuatro que registra el adaptador—. La toma de un plano usa hoy solo 2.0 fast
(`MODELOS_VALIDADOS_PARA_TOMAS`) y siempre `video.generate`.

| Hallazgo | Clase | WORKPLACE | CONTROL | Qué falta | Fila |
|---|---|---|---|---|---|
| Texto a vídeo | A | Plano › Generar | «Generar este plano» | — | C45 |
| Órdenes dentro del texto (`--rs --dur --seed --cf`) | G | — | — | Ninguna llega: desde la Fase 33 el adaptador las quita de TODO texto (R2) | C43 |
| Primer y último fotograma | C | Plano › Referencias | Huecos «Primer fotograma» y «Último fotograma» (cerrados) | Contrato 1 + canary. En 2.5 el formato es obligatoriamente `adaptive`; no se combinan con referencias | C50 |
| Referencias de imagen (2.5: 30; 2.0: 9) | C | Plano › Referencias | Papel «Referencia» de cada material | Contrato 1 + canary | X18, N14 |
| Referencias de vídeo y de audio (2.5: 10 + 10, hasta 30 s en total; 2.0: 3 + 3, 15 s) | C | Plano › Referencias | Papeles «Movimiento» y «Sonido» | Contrato 1 + canary. Cupos separados desde la Fase 33 (R20); el total lo cotiza el techo del modelo (R22) | X18 |
| Editar un vídeo (`edit`, solo 2.5) | C | Plano › Toma | «Editar esta toma» (cerrado) | Contrato 2 + canary. Desde la Fase 33 el engine pide `adaptive` y el tipo de tarea solo va a 2.5 (R19) | C52 |
| Extender hacia delante o hacia atrás (`extend`, solo 2.5) | C | Plano › Toma | «Extender esta toma» (cerrado) | Contrato 2 + canary (R19 cerrado en la Fase 33) | C51 |
| Sonido nativo (voces, efectos, música, en mono) | A | Plano › Audio | «Con sonido» | Canary de una toma con sonido | C53 |
| Diálogo con labios sincronizados desde el texto (entre comillas) y timbre por referencia de audio | E | Story › Guion y Proyecto › Reparto › Voz | «Que lo diga a cámara» (cerrado) | Contrato 6: F1-D rechaza hoy el diálogo a cámara (`dialogue_not_supported`) + canary | C60 |
| Último fotograma de la toma (`return_last_frame`, todos los modelos) | E | Plano › Referencias | «Empezar donde acabó el plano anterior» (cerrado) | El adaptador no lo pide ni lo lee; contrato 1 (primer fotograma) + canary. Es también el póster exacto y el único fotograma «de confianza» de un vídeo con cara | N22 |
| Borrador a 480p y final a 1080p (`draft`, solo 2.5) | E | Plano › Generar | «Probar en borrador» (cerrado) | Adaptador + F1-D (dos pasos, los dos se cobran) + canary; 2.5 no está validado para tomas | N23 |
| Máster `mov` 4:4:4 con audio PCM (solo 2.5) | E | Exportar / Publicar › Entregas | «Máster para etalonar» (cerrado) | Adaptador + render | N26 |
| Tomas de hasta 30 s (2.5) | E | Plano › Generar | Duraciones hasta 30 s (cerradas) | `LIMITES_DE_PLANO` + canary «Máxima» | N21 |
| 4K (2.0) | D | Visor › Resolución | Calidad «Máxima» (cerrada) | Canary (15 peticiones/min, 1 a la vez) | C67, C49 |
| Proporción 3:4 | C | Proyecto › Formato | Formato 3:4 | Contrato F1-A (`PROPORCIONES`); el 4:5 no lo genera ningún modelo | N20, C66 |
| Semilla y cámara fija (`seed`, `camera_fixed`) | G | Plano › Movimiento | «Quieta» (ya en el texto) | Documentados solo para Seedance 1.x; en 2.x la cámara fija se escribe en el texto, que es lo que Filmmaker ya hace | N18, N19 |
| Varios planos en una sola generación (2.5 con marcas de tiempo; 2.0 con «Shot 1/2/3») | E | Historia › Escenas | «Generar la escena de una vez» (no se propone) | Contrato: cambiaría la unidad de generación (hoy plano = toma, con su versión y su precio) | N28 |
| Personajes reales autorizados (`asset://`) y material propio «de confianza» 30 días | E | Proyecto › Reparto | «Persona real autorizada» (cerrado) | Contrato 1 + el proceso de autorización de BytePlus + decisión de privacidad. Sin esto, 2.x rechaza referencias con caras reales | N27 |
| Prioridad en la cola (`priority`) | G | — | — (interno) | No es un control de la persona; sí una mejora interna (tomas interactivas por delante del lote) | N29 |
| Identificador de seguridad (`safety_identifier`) | G | — | — (interno) | Decisión de privacidad: mandar un identificador por persona al proveedor | N30 |
| Precio por tokens (fórmula oficial) | A | Plano › Generar | El precio antes de confirmar | La tabla oficial de píxeles desde la Fase 33 (R18) | X19 |

**Dónde el código contradecía a la documentación** (cuatro riesgos nuevos, sección 2.2; R18, R19 y R20 cerrados en la Fase 33, y R21 se queda):

- **R18 · precio.** `PIXELS` suponía que «720p» es el lado corto; la tabla oficial da casi los mismos píxeles a todas
  las proporciones. A 720p, 1:1 es 960×960 (Weë estimaba 720×720: un 44 % por debajo), 4:3 es 1112×834 (un 25 % por
  debajo), 21:9 es 1470×630 (un 31 % por encima), y a 480p la serie 2.0 entrega 864×496. Con el suelo «nunca por
  debajo del coste», un vídeo 1:1 podía venderse por debajo de lo que cuesta. **Cerrado en la Fase 33.**
- **R19 · editar y extender.** Con `edit` o `extend` explícitos, 2.5 exige `ratio: adaptive`; `engine/video.ts` no la
  admitía (`ASPECTS`) y caía a 16:9, y la API rechazaba la tarea al crearla. Además `omni_reference_task_type` solo
  existe en 2.5 y el adaptador lo mandaba a cualquier modelo. **Cerrado en la Fase 33.**
- **R20 · cupos de referencias.** Vídeo y audio tienen cupos separados (3 + 3 en 2.0, 10 + 10 en 2.5) y un total de
  15 s o 30 s; en 2.0 no se admite solo audio. El adaptador los mezclaba en un cupo y dejaba pasar el audio solo.
  **Cerrado en la Fase 33** (los totales los cubre el techo de R22).
- **R21 · semilla y cámara fija.** El adaptador las cablea, pero la API solo las documenta para 1.x y nadie las
  pone. No hacen daño; no se prometen.

### 3.2 Higgsfield

| Hallazgo | Clase | WORKPLACE | CONTROL | Qué falta | Fila |
|---|---|---|---|---|---|
| Director de IA que desglosa un guion en planos con la cámara puesta | B | Weë AI Director | «Proponer escenas» (A) y «Proponer planos» | La puerta rápida «Proponer planos» | C39, N06 |
| Muchos modelos a elegir, plano a plano | G | — | — | «El usuario elige el resultado. Weë elige la IA»; vídeo solo Seedance (2026-09-07) | I08 |
| Clips de 30 s con sonido | E | Plano › Generar | Duraciones hasta 30 s | Contrato + canary | N21 |
| Hasta 50 referencias por generación | C | Plano › Referencias | Papeles de cada material | Contrato 1 + canary (Seedance: 30 + 10 + 10) | X18 |
| Primer y último fotograma | C | Plano › Referencias | Huecos del plano | Contrato 1 + canary | C50 |
| Borrador barato antes del final | E | Plano › Generar | «Probar en borrador» | Adaptador + contrato + canary | N23 |
| Dibujar flechas o notas sobre una imagen para dirigir el movimiento | F | Plano › Movimiento | — | Seedance no tiene entrada de dibujo | I06 |
| Rehacer un vídeo conservando el movimiento (cambiar reparto, lugar o aspecto) | C | Plano › Toma | «Editar esta toma» | Contrato 2 + canary (Seedance 2.5 `edit`) | C52 |
| Plantillas de efectos virales | G | — | — | Fuera del mapa de Filmmaker | I07 |
| Del enlace de un producto a un anuncio | F | — | — | No es de Filmmaker; sería una puerta de Weë Business | I09 |
| Cobertura: varios ángulos de la misma acción | B | Weë AI Director › Proponer planos | «Cobertura de este plano» | El motor ya duplica planos y cambia la cámara; falta la puerta | I01 |
| Varios planos en una generación | E | Historia › Escenas | «Generar la escena de una vez» (no se propone) | Cambiaría la unidad de generación | N28 |
| Género, época y ritmo como preajustes | E | Proyecto › Brief y Dirección | Opciones | Género y época: campo nuevo (C02, C03); el ritmo ya existe (C05) | C02, C03, C05 |
| Emoción de cada personaje en el plano | A | Plano › Estado | «Cómo está» | Estructurada: contrato 5 | C24 |
| Entrenar una cara con 20–80 fotos | G | — | — | Biometría de personas reales; ningún proveedor del engine; necesitaría una decisión expresa | I10 |
| Biblioteca de personajes, lugares y objetos reutilizables | A | Proyecto › Reparto, Lugares, Objetos | Fichas y lo guardado | — | C32 |
| Casting paramétrico con hoja de personaje generada | C | Proyecto › Reparto | «Crear la hoja del personaje» (cerrado) | El engine genera imágenes (Gemini, FLUX, Seedream), pero la puerta de Filmmaker no: autorizar `image.generate` en ella (regla 10), su precio y canary | I02 |
| Mismo aspecto en todo el proyecto | A | Proyecto › Dirección | Estilo, ánimo, paleta heredados | — | C06, C08 |
| Extender un clip | C | Plano › Toma | «Extender esta toma» | Contrato 2 + canary | C51 |
| Cámara virtual: cuerpo, óptica, focal | A | Plano › Cámara y Lente | Opciones | La apertura es contrato (C15) | C10, C13, C14 |
| Más de 30 movimientos y combinaciones | A | Plano › Movimiento | Opciones | Combinados: contrato (C17) | C16, C17 |
| Cámara lenta y rampas de velocidad | E | Plano › Qué pasa | «Velocidad de la acción» (cerrado) | Lenguaje creativo v3; hoy se escribe en «Qué pasa» | I03 |
| Luz por preajustes y reiluminar después | A | Plano › Luz | Opciones | Luz avanzada y reiluminar: contrato / no existe | C20, C21 |
| Escena 3D editable | G | — | — | Fuera del mapa aprobado | I11 |
| Sonido nativo (voz, efectos, ambiente, música) | A | Plano › Audio | «Con sonido» | Canary | C53 |
| Voz: leer un texto, cambiar, clonar, traducir y doblar | E | Proyecto › Reparto › Voz | «Voz del personaje» | Leer: contrato 4 (C59). Clonar: G (consentimiento). Traducir y doblar: F | C59, I12 |
| Labios sincronizados | E | Story › Guion | «Que lo diga a cámara» | Contrato 6 | C60 |
| Escalar a 2K/4K e interpolar a 60 fps | F | Exportar / Publicar › Entregas | — | Ningún proveedor del engine lo hace | N25 |
| Editar una región marcada | F | Plano › Toma | — | Seedance edita por texto, sin máscara | C52 |
| Etalonaje y reencuadre en post | F | Exportar / Publicar › Color y Entregas | — | Render propio: C09, C63, C66 | C09, C63 |
| Plugins de editores, CLI, MCP | G | — | — | Fuera del mapa aprobado | I13 |
| Agente que planifica, enseña el coste antes y rehace solo lo cambiado | A | Weë AI Director › Generar producción | Precio → confirmar → generar | El coste de una propuesta antes de aplicarla es contrato (N05) | X19, N05 |
| El director escribe pero nunca genera solo | A | Weë AI Director | Aplicar / Descartar | — | C42 |
| Agentes con roles y memoria | G | — | — | En Weë hay un solo Weë Brain (regla 10) | I14 |
| Edición en vivo de varias personas | G | — | — | Modelo de cuenta y Páginas | C69 |

### 3.3 OiiOii

| Hallazgo | Clase | WORKPLACE | CONTROL | Qué falta | Fila |
|---|---|---|---|---|---|
| Equipo de siete agentes (guionista, diseño de personajes, storyboard, música…) | G | — | — | Un solo Weë Brain con muchas puertas | I14 |
| Piloto automático de una pulsación | G | — | — | Nada se genera sin ver el precio y confirmar | I14 |
| Preguntas iniciales (duración, formato, idioma del diálogo, estilo) | A | Proyecto › Brief | Campos y opciones | El idioma de una línea es contrato (X15) | C01, X15 |
| Guion → storyboard en viñetas, arreglar una sola y animar | C | Historia › Storyboard | «Boceto» de cada plano (cerrado) | El requisito existe y el engine genera imágenes, pero la puerta no lo ejecuta: autorizar `image.generate` en ella (regla 10), su precio y canary | C37 |
| Hojas de tres vistas del personaje y del lugar | C | Proyecto › Reparto y Lugares | «Crear la hoja» (cerrado) | Igual que el casting paramétrico | I02 |
| Mismo rostro de un corte a otro | E | Proyecto › Reparto | Referencias del personaje | Contrato 1 + `asset://` para caras reales | N27, X18 |
| Biblioteca de personajes, lugares y objetos | A | Proyecto | Fichas | — | C32 |
| Unos 200 estilos | A | Proyecto › Dirección | Estilo | Menos preajustes, mismo sitio | C06 |
| Planos en paralelo (10–40 tareas) | A | Weë AI Director › Generar producción | «Generar la producción» | Canary del lote | C46 |
| Videoclip a partir de una canción | G | — | — | Weë Music no se conecta todavía | C58 |
| Música según el ánimo | G | — | — | Sin música de Suno ni de otra API sin licencia | C58 |
| Recortar planos sin rehacer el sonido | E | Línea de tiempo | «Recortar» (cerrado) | Que el render lea el plan de montaje (X11) | I04 |
| Montaje automático y línea de tiempo ligera | A | Exportar / Publicar › Montaje y Línea de tiempo | «Montar la película» | Canary del render en la nube | C54 |
| Cómic o guion subido → vídeo | B | Historia › Guion | «Convertir mi guion en escenas» | La puerta; Weë Brain ya propone escenas desde un texto | I05 |
| Mercancía con los personajes | G | — | — | Fuera del mapa | I13 |
| Espacios de equipo | G | — | — | Modelo de cuenta | C69 |

### 3.4 Otros motores

Veo 3.1 y Flow, Gemini Omni, Runway (Gen-4.5, Aleph 2.0, Agent), Kling 3.0 y O1, Luma Ray3.2, Pika, MiniMax H3,
Vidu Q3, Wan 3.0, LTX-2, Marey, ElevenLabs, Sync, Topaz, Adobe Firefly y Premiere, y Filmustage. Sora ya no cuenta:
OpenAI cerró la app el 2026-04-26 y la API el 2026-09-24. Solo se listan las capacidades que no estaban arriba o que
cambian algo; las demás ya tienen su fila.

| Hallazgo | Quién | Clase | WORKPLACE | CONTROL | Qué falta | Fila |
|---|---|---|---|---|---|---|
| Varios fotogramas clave con su instante dentro de un plano | Luma (hasta 16), Vidu (9), Marey; Seedance 2.5 por el texto | E | Plano › Referencias | «Fotogramas clave» (cerrado) | Contrato 1 + papel «storyboard» (N15) + canary | I15 |
| Rehacer solo un tramo de una toma (imagen, sonido o los dos) | LTX-2, Seedance 2.5 | E | Plano › Toma | «Rehacer este tramo» (cerrado) | Contrato 2 + canary | I16 |
| Otro ángulo de una toma ya hecha | Aleph, Kling O1 | E | Plano › Toma | «Editar esta toma» | Contrato 2 (Seedance 2.5 `edit`) | C52 |
| Transferir una actuación grabada a un personaje | Runway Act-Two, Kling, Marey | E | Plano › Referencias | Papel «Movimiento» con una persona | Contrato 1 + persona autorizada (N27) | I17 |
| Transferir el movimiento de un vídeo de referencia | Kling, Marey, MiniMax, Vidu, Wan | C | Plano › Referencias | Papel «Movimiento» | Contrato 1 + canary (Seedance `reference_video`) | X18 |
| Misma voz de un personaje en todas las tomas | Kling 3.0, Seedance | E | Proyecto › Reparto › Voz | «Cómo suena» + referencia de voz | Contrato 1 (`reference_audio`) o contrato 4 | X18, C59 |
| Pistas de sonido separadas (música, ambiente, voz) | Seedance 2.0 según ByteDance | F | Línea de tiempo › Audio | — | La API de ModelArk entrega un sonido en mono, sin pistas | C53 |
| Imagen de partida de cada plano hecha con un modelo de imagen | Flow, Runway, Luma, Vidu | C | Historia › Storyboard → Plano › Referencias | «Boceto» que pasa a «Primer fotograma» | C37 (regla 10) + contrato 1 | C37, C50 |
| Revisar las tomas generadas: continuidad y marca, con visión | Luma | C | Weë AI Director › Analizar | «Revisar las tomas» (cerrado) | El engine ve imágenes (Gemini), la puerta de Filmmaker no: regla 10 + precio | I18 |
| Mejorar el texto de la persona antes de generar | Veo, MiniMax, Vidu, Runway | A | — (por dentro) | — (automático) | Weë Brain arma el texto de la toma (`componerTextoDeWee`); la persona nunca escribe un prompt técnico | C45 |
| Elegir modelo, recurrir a otro y explicar la elección | Runway, Luma, MiniMax | G | — | — | La persona nunca ve modelos; vídeo solo Seedance | I08 |
| Enseñar el coste ANTES de generar | ninguno de los revisados (se pide públicamente a Runway) | A | Plano › Generar y Weë AI Director › Generar producción | Precio → confirmar | — (Weë ya lo hace: cotización, confirmación y «el precio cambió») | X19 |
| Tope de gasto de una producción | Runway (topes de precio) | F | Weë AI Director › Precio | «Tope de Credits de la producción» (cerrado) | Una política del Credit Engine por producción | I19 |
| Precio reducido fuera de hora | Vidu | G | — | — | ModelArk no ofrece `flex` en la serie 2.x | — |
| Procedencia firmada (C2PA, SynthID) | Veo, Omni, Runway | F | Exportar / Publicar | — | El Weël ya lleva la marca de Weë; la firma de procedencia no existe | I20 |
| Bucle perfecto, texto legible dentro del vídeo, extracción de fondo, HDR/EXR, logística de rodaje, pitch deck | varios | G | — | — | Fuera de lo que Filmmaker necesita hoy | — |

**Lo que dice la comparación.** Los modelos «omni» (Seedance 2.x, Kling O1/3.0, MiniMax H3, Omni, Wan 3.0) ya juntan
referencias de imagen, vídeo y audio con editar y extender en un solo modelo. Weë tiene ese modelo detrás (Seedance) y
el adaptador lo sabe; lo que falta son los contratos 1 y 2 y sus canaries. Lo que ningún motor revisado ofrece —enseñar
el coste antes de generar— Weë ya lo hace, y la revisión automática de continuidad entre tomas solo la promete Luma.

### 3.5 Los conceptos de producto, frente a Weë

| Concepto | Qué tiene Weë | Dónde | Qué falta |
|---|---|---|---|
| Director | Weë AI Director: reglas, propuestas de Weë Brain, precio, aplicar y descartar | Weë AI Director | Qué planos afecta cada propuesta, su resumen, «Proponer planos», «Explicar» (Fase 34) |
| Storyboard | Viñetas por plano, sin imagen generada | Historia › Storyboard | El boceto (canary) |
| Control del plano | Cámara, lente, movimiento, composición, luz, estilo, ánimo, sujeto, acciones, estado | Plano | Apertura, luz avanzada, movimientos combinados (lenguaje creativo v3) |
| Personajes y referencias | Fichas con apariencia, vestuario, estado, referencias con papel | Proyecto › Reparto y Referencias | Que las referencias lleguen a la toma (contrato 1); caras reales (`asset://`) |
| Cámara | Tipo, perspectiva, encuadre, óptica, focal, movimiento, velocidad | Plano › Cámara, Lente, Movimiento | Lo de arriba |
| Varios planos | Lote de la producción entera | Weë AI Director › Generar producción | Generar una sola escena (Fase 34); varios planos en una toma (contrato, no se propone) |
| Continuidad de escena | Estado por escena y plano, reglas por nivel | Plano › Estado y Continuidad | Verla plano a plano (Fase 35); estado estructurado (contrato 5) |
| Editar | — | Plano › Toma | Contrato 2 + canary (R19 ya cerrado) |
| Extender | — | Plano › Toma | Contrato 2 + canary (R19 ya cerrado) |
| Primer y último fotograma | Los huecos del plano | Plano › Referencias | Contrato 1 + canary; continuar desde el último fotograma (N22) |
| Sonido nativo | «Con sonido» por plano y escena | Plano › Audio | Canary |
| Labios sincronizados | Guion con diálogo | Story › Guion | Contrato 6; Seedance lo hace desde el texto |
| Historia generada | Weë Brain propone escenas | Weë AI Director | Guion pegado → escenas (I05) |
| Planos automáticos | Weë Brain propone planos dentro de una propuesta | Weë AI Director | La puerta rápida y la cobertura (I01) |

## 4. La matriz

<!-- MATRIZ:INICIO -->
| Estado | Filas |
|---|---|
| A — usable | 71 |
| B — UX | 4 |
| C — no effect | 2 |
| D — adapter | 8 |
| E — canary | 3 |
| F — contract | 26 |
| G — nonexistent | 23 |
| H — intentionally excluded | 10 |
| Total | 147 |

| ID | CAPABILITY | ENGINE | ADAPTER | F1-A | SERVER | UX | WORKPLACE | STATUS | CANARY | CONTRACT | PROVIDER | COST | TEST | SABOTAGE | MOBILE | NOTES |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| C01 | Brief del proyecto | ✔ `intent` + `change_intent` | — | ✔ | ✔ productions | ✔ | Proyecto › Brief | A | no | no | — | no | filmmaker-espacio · capability-workplace-closure | sab-fase23 · sab-fase31 | ✔ 360/390 | Pendiente: Que el brief llegue al texto de la toma pide la plantilla `fm-plano-3` (cambia la huella) |
| C02 | Género | ✘ | — | ✔ | — | ✘ | Proyecto › Brief | G | no | sí: campo nuevo en `ProductionIntent` + espejo | — | no | filmmaker-espacio · capability-workplace-closure | sab-fase23 · sab-fase31 | — | Pendiente: Decidir si es un campo o un preset que escriba tono/estilo |
| C03 | Época | ✘ | — | ✔ | — | ✘ | Proyecto › Brief | G | no | sí: campo nuevo | — | no | filmmaker-espacio · capability-workplace-closure | sab-fase23 · sab-fase31 | — | Pendiente: Igual que C02 |
| C04 | Tono | ✔ `creativeDirection.tone` | — | ✔ | ✔ | ✔ | Proyecto › Dirección | A | no | no | — | no | filmmaker-espacio · capability-workplace-closure | sab-fase23 · sab-fase31 | ✔ 360/390 | — |
| C05 | Ritmo | ✔ `pacing` | — | ✔ | ✔ | ✔ | Proyecto › Dirección | A | no | no | — | no | filmmaker-espacio · capability-workplace-closure | sab-fase23 · sab-fase31 | ✔ 360/390 | — |
| C06 | Estilo global | ✔ `change_style` | — | ✔ | ✔ | ✔ | Proyecto › Dirección | A | no | no | — | no | filmmaker-espacio · capability-workplace-closure | sab-fase23 · sab-fase31 | ✔ 360/390 | Pregunta antes de pisar el estilo propio de escenas y planos |
| C07 | Ánimo por nivel | ✔ `change_mood` con ámbito | — | ✔ | ✔ | ✔ | Proyecto › Dirección y Plano | A | no | no | — | no | filmmaker-espacio · capability-workplace-closure | sab-fase23 · sab-fase31 | ✔ 360/390 | Conectado el ánimo de escena y de plano; pregunta antes de pisar lo de dentro |
| C08 | Paleta y etalonaje | ✔ `color.palette`, `grading` | — | ✔ | ✔ | ✔ | Proyecto › Dirección | A | no | no | — | no | filmmaker-espacio · capability-workplace-closure | sab-fase23 · sab-fase31 | ✔ 360/390 | Conectada la paleta (antes solo se miraba) |
| C09 | Etalonaje real en el render | ✘ (FFmpeg sin filtros de color) | — | — | ✘ | cerrado | Exportar / Publicar › Color | G | pendiente | no | — | no | filmmaker-exportar | sab-fase26 | ✔ 360/390 | Pendiente: Construir el filtro en el render y validarlo |
| C10 | Tipo de cámara | ✔ `change_camera` | — | ✔ | ✔ | ✔ | Plano › Cámara | A | no | no | — | no | filmmaker-camara-v2 · filmmaker-espacio | sab-fase17 · sab-fase23 | ✔ 360/390 | — |
| C11 | Perspectiva | ✔ | — | ✔ | ✔ | ✔ | Plano › Cámara | A | no | no | — | no | filmmaker-camara-v2 · filmmaker-espacio | sab-fase17 · sab-fase23 | ✔ 360/390 | — |
| C12 | Encuadre | ✔ | — | ✔ | ✔ | ✔ | Plano › Composición | A | no | no | — | no | filmmaker-camara-v2 · filmmaker-espacio | sab-fase17 · sab-fase23 | ✔ 360/390 | — |
| C13 | Óptica | ✔ | — | ✔ | ✔ | ✔ | Plano › Lente | A | no | no | — | no | filmmaker-camara-v2 · filmmaker-espacio | sab-fase17 · sab-fase23 | ✔ 360/390 | — |
| C14 | Focal | ✔ | — | ✔ | ✔ | ✔ | Plano › Lente | A | no | no | — | no | filmmaker-camara-v2 · filmmaker-espacio | sab-fase17 · sab-fase23 | ✔ 360/390 | — |
| C15 | Apertura / profundidad de campo | ✘ | — | — | — | ✘ | Plano › Lente | G | no | sí: parámetros creativos v3 (aditivos) + espejo | — | no | filmmaker-camara-v2 · filmmaker-espacio | sab-fase17 · sab-fase23 | — | Pendiente: Ampliar el lenguaje creativo del Core |
| C16 | Movimiento | ✔ `change_movement` | — | ✔ | ✔ | ✔ | Plano › Movimiento | A | no | no | — | no | filmmaker-camara-v2 · filmmaker-espacio | sab-fase17 · sab-fase23 | ✔ 360/390 | — |
| C17 | Movimientos combinados | ✘ | — | — | — | ✘ | Plano › Movimiento | G | no | sí: creativos v3 | — | no | filmmaker-camara-v2 · filmmaker-espacio | sab-fase17 · sab-fase23 | — | — |
| C18 | Velocidad y suavidad | ✔ | — | ✔ | ✔ | ✔ | Plano › Movimiento | A | no | no | — | no | filmmaker-camara-v2 · filmmaker-espacio | sab-fase17 · sab-fase23 | ✔ 360/390 | — |
| C19 | Composición | ✔ | — | ✔ | ✔ | ✔ | Plano › Composición | A | no | no | — | no | filmmaker-camara-v2 · filmmaker-espacio | sab-fase17 · sab-fase23 | ✔ 360/390 | — |
| C20 | Luz (tipo) | ✔ `change_lighting` | — | ✔ | ✔ | ✔ | Plano › Luz | A | no | no | — | no | filmmaker-camara-v2 · filmmaker-espacio | sab-fase17 · sab-fase23 | ✔ 360/390 | — |
| C21 | Luz avanzada | ✘ | — | — | — | ✘ | Plano › Luz | G | no | sí: creativos v3 | — | no | filmmaker-camara-v2 · filmmaker-espacio | sab-fase17 · sab-fase23 | — | — |
| C22 | Personajes | ✔ `add/update/remove/replace_character` | — | ✔ | ✔ | ✔ | Proyecto › Reparto | A | no | no | — | no | filmmaker-espacio · filmmaker-materiales · capability-workplace-closure | sab-fase23 · sab-fase27 · sab-fase31 | ✔ 360/390 | Conectados la apariencia y «Sustituir» |
| C23 | Vestuario y estado por escena o plano | ✔ `set_character_state` | — | ✔ | ✔ | ✔ | Plano › Estado | A | no | no | — | no | filmmaker-espacio · filmmaker-materiales · capability-workplace-closure | sab-fase23 · sab-fase27 · sab-fase31 | ✔ 360/390 | — |
| C24 | Emoción del personaje | ✔ `appearanceNotes` | — | ✔ | ✔ | ✔ | Plano › Estado | A | no | no (estructurada: contrato 5) | — | no | filmmaker-espacio · filmmaker-materiales · capability-workplace-closure | sab-fase23 · sab-fase27 · sab-fase31 | ✔ 360/390 | Pendiente: La emoción como valor estructurado es el contrato 5 (F1-A) |
| C25 | Posición / blocking | ✔ `subject.focus`, continuidad `preserve` | — | ✔ | ✔ | ✔ | Plano › Composición y Continuidad | A | no | no | — | no | filmmaker-espacio · filmmaker-materiales · capability-workplace-closure | sab-fase23 · sab-fase27 · sab-fase31 | ✔ 360/390 | Conectado el sujeto (X02) · Pendiente: La disposición espacial detallada (`spatial`) no llega a la toma: X17 |
| C26 | Lugares | ✔ | — | ✔ | ✔ | ✔ | Proyecto › Lugares | A | no | no | — | no | filmmaker-espacio · filmmaker-materiales · capability-workplace-closure | sab-fase23 · sab-fase27 · sab-fase31 | ✔ 360/390 | Conectada la apariencia |
| C27 | Lugar de cada escena | ✔ `change_location` | — | ✔ | ✔ | ✔ | Plano › Dónde | A | no | no | — | no | filmmaker-espacio · filmmaker-materiales · capability-workplace-closure | sab-fase23 · sab-fase27 · sab-fase31 | ✔ 360/390 | — |
| C28 | Estado de un lugar | ✘ | — | ✔ | — | ✘ | Plano › Estado | G | no | sí: contrato 5 (F1-A) | — | no | filmmaker-espacio · filmmaker-materiales · capability-workplace-closure | sab-fase23 · sab-fase27 · sab-fase31 | — | Pendiente: Alternativa hoy: la descripción de la escena |
| C29 | Objetos | ✔ | — | ✔ | ✔ | ✔ | Proyecto › Objetos y Plano › Objetos | A | no | no | — | no | filmmaker-espacio · filmmaker-materiales · capability-workplace-closure | sab-fase23 · sab-fase27 · sab-fase31 | ✔ 360/390 | Conectada la apariencia |
| C30 | Estado y posición de objetos | ✘ | — | ✔ | — | ✘ | Plano › Objetos | G | no | sí: contrato 5 | — | no | filmmaker-espacio · filmmaker-materiales · capability-workplace-closure | sab-fase23 · sab-fase27 · sab-fase31 | — | Pendiente: Alternativa hoy: la continuidad «Cómo están los objetos» |
| C31 | Referencias como datos | ✔ `add/update/remove/replace_reference` | — | ✔ | ✔ (comprueba dueño y estado) | ✔ | Proyecto › Referencias | A | no | no | — | no | filmmaker-espacio · filmmaker-materiales · capability-workplace-closure | sab-fase23 · sab-fase27 · sab-fase31 | ✔ 360/390 | Conectado «Sustituir»; el selector dice qué no sirve y por qué · Pendiente: Usarlas al generar: D (C50, X18) |
| C32 | Elements (lo guardado) | ✔ Core Elements | — | ✔ | ✔ (versión) | ✔ | Proyecto › Reparto, Lugares, Objetos, Referencias | A | no | no | — | no | filmmaker-espacio · filmmaker-materiales · capability-workplace-closure | sab-fase23 · sab-fase27 · sab-fase31 | ✔ 360/390 | — |
| C33 | Continuidad visual del personaje | ✔ texto: identidad, rasgos, estado y continuidad | — | ✔ | ✔ | ✔ | Proyecto › Reparto y Plano › Continuidad | A | no | no | — | no | filmmaker-espacio · filmmaker-materiales · capability-workplace-closure | sab-fase23 · sab-fase27 · sab-fase31 | ✔ 360/390 | La apariencia rasgo a rasgo ya llega a la toma · Pendiente: Por referencia de imagen: X18 (contrato 1 + canary) |
| C34 | Escenas y planos | ✔ | — | ✔ | ✔ | ✔ | Story › Storyboard y Plano | A | no | no | — | no | filmmaker-historia · filmmaker-arreglos · filmmaker-ui | sab-fase22 · sab-fase24 | ✔ 360/390 | Conectado mover un plano (X03) |
| C35 | Beats | ✘ | — | ✔ | — | ✘ | Story | G | no | sí: nivel nuevo en F1-A | — | no | filmmaker-historia · filmmaker-arreglos · filmmaker-ui | sab-fase22 · sab-fase24 | — | Pendiente: Alternativa hoy: las acciones de cada plano (X04) |
| C36 | Storyboard | ✔ | — | ✔ | ✔ | ✔ | Story › Storyboard | A | no | no | — | no | filmmaker-historia · filmmaker-arreglos · filmmaker-ui | sab-fase22 · sab-fase24 | ✔ 360/390 | — |
| C37 | Boceto del storyboard antes del vídeo | ✔ el requisito | ✔ imagen (Gemini, FLUX, Seedream) | ✔ | ✘ nadie lo ejecuta | ✘ | Story › Storyboard | D | sí | sí: una capacidad más por la puerta del Core (regla 10) y su precio | Gemini, FLUX, Seedream | sí | filmmaker-historia · filmmaker-arreglos · filmmaker-ui | sab-fase22 · sab-fase24 | — | Pendiente: Autorizar `image.generate` en la puerta, medir el coste y probarlo |
| C38 | Guion | ✔ | — | ✔ | ✔ | ✔ | Story › Guion | A | no | no | — | no | filmmaker-historia · filmmaker-arreglos · filmmaker-ui | sab-fase22 · sab-fase24 | ✔ 360/390 | — |
| C39 | De idea a escenas y planos | ✔ Weë Brain + F1-A | — | ✔ | ✔ brainChat | ✔ | Weë AI Director › Weë Brain | A | no | no | — | sí (Credits por respuesta) | filmmaker-historia · filmmaker-arreglos · filmmaker-ui | sab-fase22 · sab-fase24 | ✔ 360/390 | — |
| C40 | Reglas de continuidad | ✔ `change_continuity` | — | ✔ | ✔ | ✔ | Plano › Continuidad y Proyecto › Dirección | A | no | no | — | no | filmmaker-historia · filmmaker-arreglos · filmmaker-ui | sab-fase22 · sab-fase24 | ✔ 360/390 | Pendiente: Anclajes, disposición y «puede cambiar»: X17 |
| C41 | AI Director (reglas) | ✔ | — | ✔ | ✔ | ✔ | Weë AI Director › Propuestas | A | no | no | — | no | filmmaker-arreglos · filmmaker-brain · filmmaker-prompt-avanzado | sab-fase9 · sab-fase13 · sab-fase22 | ✔ 360/390 | — |
| C42 | Weë Brain propone cambios | ✔ | — | — | ✔ brainChat | ✔ | Weë AI Director › Weë Brain | A | no | no | Gemini (texto) | sí | filmmaker-arreglos · filmmaker-brain · filmmaker-prompt-avanzado | sab-fase9 · sab-fase13 · sab-fase22 | ✔ 360/390 | — |
| C43 | Prompt avanzado | ✔ | — | ✔ | ✔ | parcial (se ve, oculto por defecto) | Plano › Prompt avanzado | F | no | sí: F1-A (`update_shot` no admite `advanced`, ADR-FM-008) | — | no | filmmaker-arreglos · filmmaker-brain · filmmaker-prompt-avanzado | sab-fase9 · sab-fase13 · sab-fase22 | ✔ 360/390 | Pendiente: Permitir editarlo en F1-A · R2 cerrado en la Fase 33: el adaptador quita las órdenes del proveedor de cualquier texto |
| C44 | Ver el prompt interno | ✔ | — | — | ✔ | ✘ | — | H | no | sí: la regla de producto que lo oculta | — | no | filmmaker-arreglos · filmmaker-brain · filmmaker-prompt-avanzado | sab-fase9 · sab-fase13 · sab-fase22 | — | Pendiente: Solo si se decide un modo avanzado explícito |
| C45 | Toma de un plano | ✔ F1-D | ✔ Seedance | — | ✔ generateVideo | ✔ | Plano › Toma | A | hecho (2026-09-28) | no | BytePlus ModelArk | sí | f1d-generacion · f1d-cliente · filmmaker-produccion-entera · filmmaker-cancelar · filmmaker-sonido · filmmaker-materiales | sab-fase15 · sab-fase25 · sab-fase27 · sab-fase29 | ✔ 360/390 | R18 y R22 cerrados en la Fase 33: la tabla oficial de píxeles y el techo de `-1` y de la entrada; R15: «se está comprobando» |
| C46 | Varios planos a la vez (lote) | ✔ Fase 6 | ✔ Seedance | — | ✔ generateVideo (lote) | ✔ | Weë AI Director › Generar producción | A | pendiente (el lote) | no | BytePlus ModelArk | sí | f1d-generacion · f1d-cliente · filmmaker-produccion-entera · filmmaker-cancelar · filmmaker-sonido · filmmaker-materiales | sab-fase15 · sab-fase25 · sab-fase27 · sab-fase29 | ✔ 360/390 | Pendiente: Canary del lote |
| C47 | Estado y traza de la toma | ✔ `shot.takes`; `trazasDeLaUnidad` en el servidor | — | — | parcial | ✔ historial | Plano › Toma | A | no | no (la traza entera: sí, F1-D) | — | no | f1d-generacion · f1d-cliente · filmmaker-produccion-entera · filmmaker-cancelar · filmmaker-sonido · filmmaker-materiales | sab-fase15 · sab-fase25 · sab-fase27 · sab-fase29 | ✔ 360/390 | Pendiente: Exponer la traza entera pide cambiar F1-D (`shot.takes` devuelve la vista) |
| C48 | Detener | ✔ | ✔ (DELETE de ModelArk, cerrado) | — | ✔ | ✔ | Plano › Toma | A | pendiente (parar en el proveedor) | no | BytePlus ModelArk | sí | f1d-generacion · f1d-cliente · filmmaker-produccion-entera · filmmaker-cancelar · filmmaker-sonido · filmmaker-materiales | sab-fase15 · sab-fase25 · sab-fase27 · sab-fase29 | ✔ 360/390 | Pendiente: Canary de la cancelación en el proveedor |
| C49 | Calidades Alta y Máxima | ✔ | ✔ | — | ✔ (`model_unavailable`) | cerrado | Plano › Toma | E | sí | no | BytePlus ModelArk | sí | f1d-generacion · f1d-cliente · filmmaker-produccion-entera · filmmaker-cancelar · filmmaker-sonido · filmmaker-materiales | sab-fase15 · sab-fase25 · sab-fase27 · sab-fase29 | ✔ 360/390 | Pendiente: Activar los modelos, medir el coste y probarlos |
| C50 | Primer y último fotograma | ✔ el requisito (`video.image_to_video`) | ✔ Seedance (`first_frame`, `last_frame`) | — | ✘ F1-D rechaza (`references_not_supported`) | ✔ hueco en el plano, con su porqué | Plano › Referencias | D | sí | sí: contrato 1 (F1-D `evaluarPlano` y la puerta del vídeo) | BytePlus ModelArk | sí | f1d-generacion · f1d-cliente · filmmaker-produccion-entera · filmmaker-cancelar · filmmaker-sonido · filmmaker-materiales | sab-fase15 · sab-fase25 · sab-fase27 · sab-fase29 | ✔ 360/390 | Huecos por papel en el plano, con el porqué · Pendiente: Contrato 1, precio y canary |
| C51 | Extender una toma | ✘ en Filmmaker | ✔ Seedance (`omni_reference_task_type: extend`) | ✔ | ✘ | cerrado | Plano › Toma | D | sí | sí: contrato 2 (operación en F1-A, requisito en F1-D, precio, puerta) | BytePlus ModelArk | sí | f1d-generacion · f1d-cliente · filmmaker-produccion-entera · filmmaker-cancelar · filmmaker-sonido · filmmaker-materiales | sab-fase15 · sab-fase25 · sab-fase27 · sab-fase29 | ✔ 360/390 | Pendiente: Contrato 2, precio y canary · R19 cerrado en la Fase 33: `adaptive` y el tipo de tarea solo a Seedance 2.5 |
| C52 | Editar un vídeo | ✘ en Filmmaker | ✔ Seedance (`edit`) | — | ✘ | cerrado | Plano › Toma | D | sí | sí: contrato 2 | BytePlus ModelArk | sí | f1d-generacion · f1d-cliente · filmmaker-produccion-entera · filmmaker-cancelar · filmmaker-sonido · filmmaker-materiales | sab-fase15 · sab-fase25 · sab-fase27 · sab-fase29 | ✔ 360/390 | Pendiente: Contrato 2, precio y canary · R19 cerrado en la Fase 33: `adaptive`, duración -1 y el tipo de tarea solo a Seedance 2.5 |
| C53 | Audio nativo del plano | ✔ `audio.withSound` | ✔ Seedance (`generate_audio`) | ✔ | ✔ (requisito y precio) | ✔ | Plano › Audio | A | pendiente (toma con sonido) | no | BytePlus ModelArk | sí | f1d-generacion · f1d-cliente · filmmaker-produccion-entera · filmmaker-cancelar · filmmaker-sonido · filmmaker-materiales | sab-fase15 · sab-fase25 · sab-fase27 · sab-fase29 | ✔ 360/390 | Pendiente: Canary de una toma con sonido |
| C54 | Montaje final | ✔ manifiesto + FFmpeg | — | — | ✔ tras `aiSettings/render` | ✔ | Exportar / Publicar › Montaje | A | pendiente (render en la nube) | no | — (render propio) | no | filmmaker-render · filmmaker-exportar · filmmaker-publicar · filmmaker-sonido · filmmaker-voces | sab-fase8 · sab-fase14 · sab-fase19 · sab-fase25 · sab-fase26 | ✔ 360/390 | Pendiente: Desplegar y probar el render en la nube |
| C55 | Transiciones | ✔ `change_transition` | — | ✔ | ✔ | ✔ | Línea de tiempo › Transiciones | A | no | no | — | no | filmmaker-render · filmmaker-exportar · filmmaker-publicar · filmmaker-sonido · filmmaker-voces | sab-fase8 · sab-fase14 · sab-fase19 · sab-fase25 · sab-fase26 | ✔ 360/390 | — |
| C56 | Reproducir el montaje en la línea de tiempo | ✘ | — | — | — | ✘ | Visor | G | no | no | — | no | filmmaker-render · filmmaker-exportar · filmmaker-publicar · filmmaker-sonido · filmmaker-voces | sab-fase8 · sab-fase14 · sab-fase19 · sab-fase25 · sab-fase26 | — | Pendiente: Reproductor continuo (motor propio) |
| C57 | Efectos de sonido y ambiente | ✔ cues y requisito `audio.sfx` | ✘ (`music-pending`) | ✔ | ✘ | ✔ describir, con su porqué | Línea de tiempo › Audio | G | sí | sí: nueva capacidad por la puerta (regla 10) | — | sí | filmmaker-render · filmmaker-exportar · filmmaker-publicar · filmmaker-sonido · filmmaker-voces | sab-fase8 · sab-fase14 · sab-fase19 · sab-fase25 · sab-fase26 | ✔ 360/390 | Pendiente: Proveedor con licencia, mezcla en el render y canary |
| C58 | Música | ✔ requisito `music.generate` | ✘ (`music-pending`) | — | ✘ | ✔ describir | Línea de tiempo › Audio | G | sí | sí: regla 10 | — | sí | filmmaker-render · filmmaker-exportar · filmmaker-publicar · filmmaker-sonido · filmmaker-voces | sab-fase8 · sab-fase14 · sab-fase19 · sab-fase25 · sab-fase26 | ✔ 360/390 | Pendiente: Licencia y proveedor |
| C59 | Diálogo con voz (TTS) | ✔ preparado (Fase 19) | ✔ ElevenLabs (sin verificar) | ✔ | ✘ `aiSettings/voces` cerrada | cerrado | Proyecto › Reparto | F | sí | sí: contrato 4 | ElevenLabs | sí | filmmaker-render · filmmaker-exportar · filmmaker-publicar · filmmaker-sonido · filmmaker-voces | sab-fase8 · sab-fase14 · sab-fase19 · sab-fase25 · sab-fase26 | ✔ 360/390 | Pendiente: Contrato 4 y canary de ElevenLabs |
| C60 | Lip-sync / diálogo a cámara | ✘ (`dialogue_not_supported`) | ✘ | — | ✘ | ✔ el plano avisa | Story › Guion | F | sí | sí: contrato 6 | — | sí | filmmaker-render · filmmaker-exportar · filmmaker-publicar · filmmaker-sonido · filmmaker-voces | sab-fase8 · sab-fase14 · sab-fase19 · sab-fase25 · sab-fase26 | ✔ 360/390 | Pendiente: Contrato 6 y una capacidad validada · Seedance lo hace desde el texto: el diálogo entre comillas y el timbre por una referencia de audio; F1-D lo rechaza hoy (`dialogue_not_supported`) |
| C61 | Subtítulos | ✔ preferencia (`exportPlan`) y requisito | ✘ (sin proveedor de subtítulos) | — | ✘ el render no los pone | ✔ preferencia, con su porqué | Exportar / Publicar › Subtítulos | G | pendiente | no | — | no | filmmaker-render · filmmaker-exportar · filmmaker-publicar · filmmaker-sonido · filmmaker-voces | sab-fase8 · sab-fase14 · sab-fase19 · sab-fase25 · sab-fase26 | ✔ 360/390 | Pendiente: Construirlos en el render y validarlos |
| C62 | Descargar | ✔ | — | — | ✔ | ✔ | Exportar / Publicar › Descargar | A | no | no | — | no | filmmaker-render · filmmaker-exportar · filmmaker-publicar · filmmaker-sonido · filmmaker-voces | sab-fase8 · sab-fase14 · sab-fase19 · sab-fase25 · sab-fase26 | ✔ 360/390 | — |
| C63 | Entregas en varios formatos | ✔ `exportPlan` (datos) | — | — | ✘ solo el máster | cerrado | Exportar / Publicar › Entregas | G | pendiente | no | — | no | filmmaker-render · filmmaker-exportar · filmmaker-publicar · filmmaker-sonido · filmmaker-voces | sab-fase8 · sab-fase14 · sab-fase19 · sab-fase25 · sab-fase26 | ✔ 360/390 | Pendiente: Render de entregas |
| C64 | Publicar (Weël / Wäll) | ✔ | — | — | ✔ tras `aiSettings/render` | ✔ | Exportar / Publicar › Weël, Wäll | A | pendiente | no | — | no | filmmaker-render · filmmaker-exportar · filmmaker-publicar · filmmaker-sonido · filmmaker-voces | sab-fase8 · sab-fase14 · sab-fase19 · sab-fase25 · sab-fase26 | ✔ 360/390 | Pendiente: Decisión R9 (duración en el Wäll) |
| C65 | Versiones / restaurar | ✔ | — | — | ✔ | ✔ | Proyecto › Versiones | A | no | no | — | no | filmmaker-render · filmmaker-exportar · filmmaker-publicar · filmmaker-sonido · filmmaker-voces | sab-fase8 · sab-fase14 · sab-fase19 · sab-fase25 · sab-fase26 | ✔ 360/390 | — |
| C66 | Proporción 4:5 | ✔ F1-A la admite | ✘ la toma no (Seedance no la genera) | ✔ | ✘ (`aspect_ratio_not_supported`) | ✔ dicho al elegirla | Proyecto › Formato (visor y Director) | G | no | no | BytePlus ModelArk | no | filmmaker-render · filmmaker-exportar · filmmaker-publicar · filmmaker-sonido · filmmaker-voces | sab-fase8 · sab-fase14 · sab-fase19 · sab-fase25 · sab-fase26 | ✔ 360/390 | Aviso al elegir el formato, con los más parecidos · Pendiente: Decidir: dejar de ofrecerla o componerla en el render |
| C67 | 4K | ✔ | ✔ (Máxima) | — | ✔ (cerrada por calidad) | ✔ dicho | Visor › Resolución | E | sí | no | BytePlus ModelArk | sí | filmmaker-render · filmmaker-exportar · filmmaker-publicar · filmmaker-sonido · filmmaker-voces | sab-fase8 · sab-fase14 · sab-fase19 · sab-fase25 · sab-fase26 | ✔ 360/390 | Pendiente: Canary de Máxima |
| C68 | Precio de Weë Brain | ✔ | — | — | ✔ | ✔ | Weë AI Director › Precio | A | no | no | — | sí | filmmaker-render · filmmaker-exportar · filmmaker-publicar · filmmaker-sonido · filmmaker-voces | sab-fase8 · sab-fase14 · sab-fase19 · sab-fase25 · sab-fase26 | ✔ 360/390 | — |
| C69 | Colaboración | ✘ (un solo dueño) | — | — | ✘ | ✘ | — | G | no | sí: modelo de cuenta y Páginas | — | no | filmmaker-render · filmmaker-exportar · filmmaker-publicar · filmmaker-sonido · filmmaker-voces | sab-fase8 · sab-fase14 · sab-fase19 · sab-fase25 · sab-fase26 | — | — |
| C70 | Lienzo de nodos | ✘ | — | — | — | ✘ | — | H | no | no | — | no | weeai-sin-simulacros · studio-video · capability-workplace-closure | sab-fase28 · sab-fase31 | — | Pendiente: Fuera del mapa aprobado |
| C71 | Referencias de la caja del Studio en «Varias escenas» | ✔ en la producción (desde Mis creaciones) | — | — | ✘ subir un archivo a Mis creaciones vive tras `mediaCanary` | ✔ dicho antes de crear | Weë Studio › Crear | E | sí | no | — | no | weeai-sin-simulacros · studio-video · capability-workplace-closure | sab-fase28 · sab-fase31 | ✔ 360/390 | Aviso de que no pasan, y dónde añadirlas · Pendiente: Canary de la subida a Mis creaciones |
| C72 | Ajustes de la creación | ✔ | — | — | — | ✔ | Weë Studio › Crear | A | no | no | — | no | weeai-sin-simulacros · studio-video · capability-workplace-closure | sab-fase28 · sab-fase31 | ✔ 360/390 | — |
| C73 | Dictar | ✘ | ✘ | — | ✘ | ✔ «Muy pronto» | Weë Studio › Crear | G | no | no | — | no | weeai-sin-simulacros · studio-video · capability-workplace-closure | sab-fase28 · sab-fase31 | ✔ 360/390 | — |
| C74 | Mis creaciones en el inicio del Studio | ✔ | — | — | ✔ | ✔ | Weë Studio › Crear | A | no | no | — | no | weeai-sin-simulacros · studio-video · capability-workplace-closure | sab-fase28 · sab-fase31 | ✔ 360/390 | — |
| C75 | Crear sin destino | ✔ | — | — | — | ✔ | Weë Studio › Crear | A | no | no | — | no | weeai-sin-simulacros · studio-video · capability-workplace-closure | sab-fase28 · sab-fase31 | ✔ 360/390 | — |
| C76 | Crear vídeo: duración y calidad | ✔ | ✔ | — | ✔ | ✔ | Weë Studio › Crear vídeo | A | no | no | BytePlus ModelArk | sí | weeai-sin-simulacros · studio-video · capability-workplace-closure | sab-fase28 · sab-fase31 | ✔ 360/390 | — |
| X01 | Nombre de la producción | ✔ `rename_production` | — | ✔ | ✔ | ✔ | Proyecto › Brief | A | no | no | — | no | capability-workplace-closure | sab-fase31 | ✔ 360/390 | Conectado; la nota de Mis proyectos dice dónde se cambia |
| X02 | Sujeto del plano | ✔ `change_subject` | — | ✔ | ✔ | ✔ | Plano › Composición | A | no | no | — | no | capability-workplace-closure | sab-fase31 | ✔ 360/390 | Conectado |
| X03 | Mover un plano a otra escena | ✔ `move_shot` | — | ✔ | ✔ | ✔ | Plano | A | no | no | — | no | capability-workplace-closure | sab-fase31 | ✔ 360/390 | Conectado |
| X04 | Qué pasa en el plano | ✔ `actions` (`update_shot` / `update_scene`) | — | ✔ | ✔ | ✔ | Plano › Qué se ve | A | no | no | — | no | capability-workplace-closure | sab-fase31 | ✔ 360/390 | Conectado (en una escena, solo si no tiene planos: si no, nadie las lee) |
| X05 | Apariencia rasgo a rasgo | ✔ `appearance` | — | ✔ | ✔ | ✔ | Proyecto › Reparto, Lugares y Objetos | A | no | no | — | no | capability-workplace-closure | sab-fase31 | ✔ 360/390 | Conectado |
| X06 | Reglas de la pieza | ✔ `intent.constraints` | — | ✔ | ✔ | ✔ | Proyecto › Brief | A | no | no | — | no | capability-workplace-closure | sab-fase31 | ✔ 360/390 | Conectado; las que no tienen control (formato obligado, nota) se ven y se quitan |
| X07 | Sustituir una referencia | ✔ `replace_reference` | — | ✔ | ✔ | ✔ | Proyecto › Referencias | A | no | no | — | no | capability-workplace-closure | sab-fase31 | ✔ 360/390 | Conectado; si no hay otra de su clase, se dice |
| X08 | Sustituir un personaje | ✔ `replace_character` | — | ✔ | ✔ | ✔ | Proyecto › Reparto | A | no | no | — | no | capability-workplace-closure | sab-fase31 | ✔ 360/390 | Conectado, preguntando antes |
| X09 | Estilo por escena y por plano | ✔ `change_style` con ámbito | — | ✔ | ✔ | ✔ | Plano | A | no | no | — | no | capability-workplace-closure | sab-fase31 | ✔ 360/390 | Conectado; en una escena pregunta antes de pisar el de sus planos |
| X10 | Calidad preferida y boceto de la producción | ✔ se guarda | — | — | ✘ `evaluarPlano` ignora la calidad del requisito; el boceto nadie lo ejecuta | ✘ | Weë AI Director › Generar producción (calidad propuesta) | F | no | sí: que la toma y el lote tomen `generation.quality` como calidad propuesta (F1-D); el boceto es C37 | — | no | capability-workplace-closure | sab-fase31 | — | No se conecta: cambiarla marcaría planos por rehacer sin cambiar lo que se genera (un control decorativo) · Pendiente: Cambio en F1-D |
| X11 | Pistas del plan de montaje | ✔ se guarda | — | — | ✘ el montaje no lo lee | ✘ | Línea de tiempo › Pistas | F | no | sí: que el manifiesto del montaje aplique silencio y volumen por pista | — | no | capability-workplace-closure | sab-fase31 | — | No se conecta (sería decorativo) · Pendiente: Cambio del manifiesto |
| X12 | Marcas de la línea de tiempo | ✔ se guarda y la línea de tiempo la calcula | — | ✔ | — | ✘ | Línea de tiempo (marcas) | C | no | no | — | no | capability-workplace-closure | sab-fase31 | — | No se conecta: no está en el mapa aprobado de la línea de tiempo y nadie la usa (ni la toma ni el montaje) · Pendiente: Decidir si se quiere como nota del editor |
| X13 | Estilo de subtítulos del plan de montaje | ✔ se guarda | — | — | ✘ el render no pone subtítulos | ✘ | Exportar / Publicar › Subtítulos | C | no | no | — | no | capability-workplace-closure | sab-fase31 | — | No se conecta: la preferencia que sí se ofrece (C61) ya dice que no están en el montaje · Pendiente: Llega con C61 |
| X14 | Edad aparente, rasgos en lista, relaciones y bloqueos de un personaje | ✔ se guardan | — | — | ✘ la toma no los lee | ✘ | Proyecto › Reparto | F | no | sí: que la plantilla del texto de la toma los incluya (cambia la huella) | — | no | capability-workplace-closure | sab-fase31 | — | No se conectan; hoy se escriben en «Quién es» o en la apariencia, que sí llegan · Pendiente: Plantilla `fm-plano-3` |
| X15 | Emoción e idioma de una línea de guion | ✔ se guardan | ✔ ElevenLabs (sin verificar) | ✔ | ✘ solo los usarían la voz y el lip-sync | ✘ | Story › Guion | F | sí | sí: contratos 4 (voces) y 6 (lip-sync) | ElevenLabs | sí | capability-workplace-closure | sab-fase31 | — | No se conectan hasta que haya voz o lip-sync · Pendiente: Contratos 4 y 6 |
| X16 | Prioridades del brief | ✔ se guardan | — | — | ✘ ni el router ni las recomendaciones las leen | ✘ | Proyecto › Brief | F | no | sí: que el router o las recomendaciones las lean | — | no | capability-workplace-closure | sab-fase31 | — | No se conectan (serían decorativas) · Pendiente: Contrato del router |
| X17 | Continuidad fina | ✔ se guardan | — | — | ✘ a la toma solo llegan «conservar» y la fuerza | ✘ | Plano › Continuidad | F | no | sí: plantilla `fm-plano-3` | — | no | capability-workplace-closure | sab-fase31 | — | No se conectan · Pendiente: Plantilla `fm-plano-3` |
| X18 | Referencias de una ficha, de un rasgo o de una voz | ✔ | ✔ Seedance (`reference_image`, `reference_audio`) | — | ✘ F1-D rechaza el plano | ✘ | Proyecto › Reparto (junto a la apariencia) | D | sí | sí: contrato 1 | BytePlus ModelArk | sí | capability-workplace-closure | sab-fase31 | — | No se conectan: ponerlas dejaría sin generar todos los planos de esa ficha · Pendiente: Contrato 1 y canary; entonces, un botón en la apariencia · R20 cerrado en la Fase 33: vídeo y audio con cupos separados; sonido solo, rechazado en la serie 2.0 |
| X19 | Cotización y confirmación antes de gastar | ✔ | — | — | ✔ quote + precio que cambió | ✔ | Plano › Toma y Director › Generar producción | A | no | no | — | sí | capability-workplace-closure | sab-fase31 | ✔ 360/390 | R18 y R22 cerrados en la Fase 33: la cotización usa la tabla oficial y nunca se abarata con lo que declara quien llama |
| X20 | Qué no sirve como referencia | ✔ F1-A (clases de material) | — | ✔ | ✔ | ✔ | Proyecto › Referencias | A | no | no | — | no | capability-workplace-closure | sab-fase31 | ✔ 360/390 | Dicho en el selector |
| N01 | Generar solo una escena | ✔ lote de la Fase 6 (`units`) | ✔ Seedance | — | ✔ generateVideo `produccion.units` | ✔ | Weë AI Director › Generar producción (Toda la producción / Solo la escena N) | A | pendiente (el lote) | no | BytePlus ModelArk (Seedance) | sí (Credits por toma) | filmmaker-director | sab-fase34 | ✔ 360/390 | Fase 34: el mismo lote por la misma puerta (`units`), con su precio y su confirmación |
| N02 | Montajes anteriores (versiones finales) | ✔ render (Fase 8) | — | — | ✔ `montajesDeLaProduccion` | ✘ (la app los carga y solo enseña el de hoy) | Exportar / Publicar › Versiones finales | B | pendiente (render en la nube) | no | — (FFmpeg propio) | no | filmmaker-capability-master | sab-fase32 | — | Fecha, duración y descarga de cada montaje hecho (Fase 38) |
| N03 | Qué planos afecta una propuesta de Weë Brain | ✔ F1-A `pendientesEntre` | — | ✔ | ✔ brainChat | ✔ | Weë AI Director › Propuestas | A | no | no | Gemini (texto) | sí (la respuesta de Weë Brain) | filmmaker-director | sab-fase34 | ✔ 360/390 | Fase 34: cada propuesta dice qué planos habría que generar, por su nombre |
| N04 | Resumen estructurado de una propuesta (escenas, planos, duración, lo que pediría cada plano, referencias) | ✔ F1-A del espejo: `aplicarOperaciones`, `lineaDeTiempo`, `requisitosDeProduccion` | — | ✔ | — (se calcula en la app) | ✔ | Weë AI Director › Propuestas | A | no | no | — | no | filmmaker-director | sab-fase34 | ✔ 360/390 | Fase 34: «Así quedaría», calculado con el F1-A del espejo en memoria; el precio, después de aplicar |
| N05 | Coste estimado de una propuesta antes de aplicarla | ✘ (el precio se cotiza sobre una revisión guardada) | — | — | ✘ | ✘ | Weë AI Director › Precio | F | no | sí: que la cotización del lote acepte operaciones sin guardar (puerta de `generateVideo`, F1-D) | — | no | filmmaker-capability-master | sab-fase32 | — | Mientras tanto: aplicar es gratis y reversible (Versiones) y el precio real sale antes de generar |
| N06 | Proponer planos | ✔ Weë Brain + F1-A | — | ✔ | ✔ brainChat | ✔ | Weë AI Director › Proponer planos | A | no | no | Gemini (texto) | sí (la respuesta de Weë Brain) | filmmaker-director | sab-fase34 | ✔ 360/390 | Fase 34: puerta rápida que rellena la caja; de la escena elegida si la hay |
| N07 | Explicar (qué hace falta, por qué no se genera, cómo mejorar) | ✔ Weë Brain | — | — | ✔ brainChat | ✔ | Weë AI Director › Explicar | A | no | no | Gemini (texto) | sí (la respuesta de Weë Brain) | filmmaker-director | sab-fase34 | ✔ 360/390 | Fase 34: puerta rápida que rellena la caja |
| N08 | Mejorar la descripción de un plano | ✔ Weë Brain propone `edit_text` | — | ✔ | ✔ brainChat | ✔ | Weë AI Director (desde el plano elegido) | A | no | no | Gemini (texto) | sí (la respuesta de Weë Brain) | filmmaker-director | sab-fase34 | ✔ 360/390 | Fase 34: «Mejorar este plano», con el plano elegido |
| N09 | Revisar la continuidad | ✔ Weë Brain + recomendaciones de F1-A | — | ✔ | ✔ brainChat | ✔ | Weë AI Director › Analizar | A | no | no | Gemini (texto) | sí (la respuesta de Weë Brain) | filmmaker-director | sab-fase34 | ✔ 360/390 | Fase 34: «Revisar la continuidad», con dos unidades o más |
| N10 | Vista de escenas (propósito, lugar, hora, clima, reparto, duración, planos) | ✔ F1-A | — | ✔ | — | ✔ | Historia › Escenas (escritorio: Estructura, en su hoja; teléfono: Historia) | A | no | no | — | no | filmmaker-historia-vistas | sab-fase35 | ✔ 360/390 | Fase 35: solo lectura; se va a la escena |
| N11 | Continuidad plano a plano (cómo está cada personaje, qué objetos, qué lugar) | ✔ F1-A (estado efectivo y reparto de cada plano) | — | ✔ | — | ✔ | Historia › Continuidad (escritorio: Estructura, en su hoja; teléfono: Historia) | A | no | no | — | no | filmmaker-historia-vistas | sab-fase35 | ✔ 360/390 | Fase 35: estado efectivo de F1-A, entradas y salidas, qué cambia; el estado estructurado sigue siendo el contrato 5 |
| N12 | La pista de diálogo en el teléfono | ✔ línea de tiempo de F1-A | — | ✔ | — | parcial (solo en escritorio) | Línea de tiempo › Diálogo | B | no | no | — | no | filmmaker-capability-master | sab-fase32 | — | Fase 37 |
| N13 | «Generar» desde el panel del plano | ✔ F1-D | — | — | ✔ generateVideo | parcial (en el Director) | Plano › Generar | B | hecho (2026-09-28) | no | BytePlus ModelArk (Seedance) | sí (Credits por toma) | filmmaker-capability-master | sab-fase32 | — | Fase 37 |
| N14 | Vista previa, origen y estado de cada referencia | ✔ Content Core (`assets`) y Elements | — | — | ✔ lectura de la propia cuenta | ✔ | Proyecto › Referencias · Plano › Referencias | A | no | no | — | no | filmmaker-referencias-completas | sab-fase36 | ✔ 360/390 | Fase 36: miniatura (la de Mis creaciones: la entrega directa del original; con entrega firmada, su icono, como allí), origen y estado (listo, retirado, sin saberse), leídos una vez de la ficha del material |
| N15 | Papel «storyboard» de una referencia | ✘ (`ReferenceRole` no lo tiene) | — | — | — | cerrado, con su porqué | Proyecto › Referencias | F | no | sí: F1-A `ReferenceRole` + espejo + requisitos | — | no | filmmaker-referencias-completas | sab-fase36 | — | Se enseña el papel cerrado, con su porqué (Fase 36) · Fase 36: se ve cerrado en cada referencia de imagen (una viñeta es una imagen) |
| N16 | La duración de un sonido | ✔ F1-A `AudioCue.durationSec` | — | ✔ | — | ✘ | Línea de tiempo › Audio | B | no | no | — | no | filmmaker-capability-master | sab-fase32 | — | Fase 37. Se guarda como la descripción y el nivel; nada suena todavía (sin mezcla) |
| N17 | Fundido, inicio dentro del tramo y «activo» de un sonido | ✘ (`AudioCue` no los tiene) | — | — | — | ✘ | Línea de tiempo › Audio | F | no | sí: F1-A `AudioCue` (fadeInSec, fadeOutSec, offsetSec, enabled) + mezcla en el render | — | no | filmmaker-capability-master | sab-fase32 | — | Se enseñan cerrados, con su porqué (Fase 37) |
| N18 | Semilla: repetir una toma de forma reproducible | ✘ en Filmmaker | cableado (`seed`), pero la API solo lo documenta para Seedance 1.x | — | — | ✘ | — | G | no | no | BytePlus ModelArk (Seedance) | no | filmmaker-capability-master | sab-fase32 | — | En la serie 2.x la reproducibilidad existe solo entre un borrador de 2.5 y su final (N23). R21 |
| N19 | Cámara fija | ✔ el movimiento «Quieta» va en el texto de la toma | `camera_fixed` solo documentado para 1.x | ✔ | ✔ | ✔ | Plano › Movimiento | A | no | no | — | no | filmmaker-camara-v2 | sab-fase17 | ✔ 360/390 | En 2.x la cámara fija se escribe en el texto, que es lo que Filmmaker hace. R21 |
| N20 | Proporción 3:4 | ✘ (F1-A no la tiene) | ✔ `RATIOS` incluye 3:4 (todos los modelos) | — | — | ✘ | Proyecto › Formato | D | no | sí: F1-A `PROPORCIONES`, lenguaje creativo del Core y `LIMITES_DE_PLANO` | BytePlus ModelArk (Seedance) | no | filmmaker-capability-master | sab-fase32 | — | Con 3:4 un anuncio vertical se generaría; el 4:5 no lo genera ningún modelo (C66) |
| N21 | Tomas de hasta 30 s (Seedance 2.5) | ✘ (F1-D limita a 15 s) | ✔ `maxDurationSec: 30` en 2.5 | — | — | ✘ | Plano › Generar | F | sí («Máxima») | sí: F1-D `LIMITES_DE_PLANO.duracionMaximaSec` por calidad | BytePlus ModelArk (Seedance) | sí (Credits por toma) | filmmaker-capability-master | sab-fase32 | — | — |
| N22 | Continuar desde el último fotograma de la toma anterior | ✘ | ✘ (no pide `return_last_frame` ni lee `last_frame_url`) | — | — | ✘ | Plano › Referencias | F | sí | sí: contrato 1 (primer fotograma) + el adaptador lee y guarda el último fotograma antes de 24 h | BytePlus ModelArk (Seedance) | sí (Credits por toma) | filmmaker-capability-master | sab-fase32 | — | La API lo da en todos los modelos: sirve también de póster exacto y es el único fotograma «de confianza» de un vídeo con cara |
| N23 | Borrador barato antes de la toma final | ✘ | ✘ (`draft`, `draft_task`: solo Seedance 2.5) | — | — | ✘ | Plano › Generar | F | sí | sí: adaptador + F1-D (dos pasos, los dos se cobran; el final solo a 1080p) | BytePlus ModelArk (Seedance) | sí (Credits por toma) | filmmaker-capability-master | sab-fase32 | — | 2.5 no está validado todavía para tomas |
| N24 | Elegir el fotograma del póster | ✘ (el póster sale del segundo 1 o de la mitad) | — | — | ✘ | ✘ | Exportar / Publicar › Póster | F | pendiente (render en la nube) | sí: `poster.request` con el instante (Fase 11, render) | — | no | filmmaker-capability-master | sab-fase32 | — | — |
| N25 | Escalar un vídeo e interpolar fotogramas | ✘ | ✘ (ningún proveedor de vídeo del engine lo hace) | — | — | ✘ | Exportar / Publicar › Entregas | G | no | no | — | no | filmmaker-capability-master | sab-fase32 | — | — |
| N26 | Máster para etalonar (`mov` 4:4:4 con audio PCM) | ✘ | ✘ (`output_format`, solo Seedance 2.5) | — | — | ✘ | Exportar / Publicar › Entregas | F | sí | sí: adaptador + render | BytePlus ModelArk (Seedance) | no | filmmaker-capability-master | sab-fase32 | — | — |
| N27 | Persona real autorizada como referencia (`asset://`) | ✘ | ✘ (una referencia `asset://` fallaría al leer la imagen) | — | — | dicho en la referencia de personaje | Proyecto › Reparto | F | sí | sí: contrato 1 + el proceso de autorización de BytePlus + decisión de privacidad | BytePlus ModelArk (Seedance) | no | filmmaker-referencias-completas | sab-fase36 | — | Sin esto, la serie 2.x rechaza referencias con caras reales · Fase 36: se dice en la referencia de personaje |
| N28 | Varios planos en una sola generación | ✘ (plano = toma) | por texto (2.5: marcas de tiempo; 2.0: «Shot 1/2/3») | — | — | ✘ | Historia › Escenas | F | no | sí: cambiaría la unidad de generación de F1-D | BytePlus ModelArk (Seedance) | no | filmmaker-capability-master | sab-fase32 | — | No se propone: cada plano tiene su toma, su versión y su precio |
| N29 | Prioridad en la cola del proveedor | ✘ | ✘ (`priority` 0–9) | — | — | ✘ | — | H | no | no | BytePlus ModelArk (Seedance) | no | filmmaker-capability-master | sab-fase32 | — | Interno, no es un control de la persona: tomas interactivas por delante del lote |
| N31 | Volver a una toma anterior de un plano | ✘ (`enlazarToma` no pone una toma si hay otra más nueva lista: `take_superseded`) | — | — | ✘ | dicho («el plano usa siempre su última toma lista») | Plano › Toma (historial) | F | no | sí: contrato 3 (`enlazarToma`, F1-D) | — | no | filmmaker-historia | sab-fase24 | — | Control: «Usar esta toma» (cerrado). El historial ya se ve y cada toma se descarga |
| N30 | Identificador de seguridad por persona | ✘ | ✘ (`safety_identifier`) | — | — | ✘ | — | H | no | no | BytePlus ModelArk (Seedance) | no | filmmaker-capability-master | sab-fase32 | — | Interno; mandar un identificador por persona al proveedor es una decisión de privacidad |
| I01 | Cobertura: varios ángulos de la misma acción | ✔ F1-A (`duplicate_shot`, `change_camera`) + Weë Brain | — | ✔ | ✔ brainChat | ✔ | Weë AI Director › Proponer planos | A | no | no | Gemini (texto) | sí (la respuesta de Weë Brain) | filmmaker-director | sab-fase34 | ✔ 360/390 | Fase 34: «Cobertura de este plano», con el plano elegido |
| I02 | Hoja del personaje o del lugar (casting, tres vistas) | ✘ en Filmmaker | ✔ imagen (Gemini, FLUX, Seedream) | — | ✘ | ✘ | Proyecto › Reparto y Lugares | D | sí | sí: `image.generate` en la puerta (regla 10) y su precio | Gemini, BFL, BytePlus | sí | filmmaker-capability-master | sab-fase32 | — | Control: «Crear la hoja» (cerrado) |
| I03 | Cámara lenta y rampas de velocidad de la acción | ✘ (se escribe en «Qué pasa») | — | — | — | ✘ | Plano › Qué pasa | F | no | sí: lenguaje creativo v3 | — | no | filmmaker-capability-master | sab-fase32 | — | Control: «Velocidad de la acción» (cerrado) |
| I04 | Recortar un plano en el montaje sin rehacer el sonido | ✘ (el render no lee el plan de montaje) | — | — | — | ✘ | Línea de tiempo | F | no | sí: el render lee entradas y salidas del plan de montaje (X11) | — | no | filmmaker-capability-master | sab-fase32 | — | Control: «Recortar» (cerrado) |
| I05 | Convertir un guion escrito en escenas y planos | ✔ Weë Brain + F1-A | — | ✔ | ✔ brainChat | ✔ | Historia › Guion · Weë AI Director | A | no | no | Gemini (texto) | sí (la respuesta de Weë Brain) | filmmaker-director | sab-fase34 | ✔ 360/390 | Fase 34: «Tengo un guion»; en una producción vacía, destacada |
| I06 | Dibujar el movimiento sobre una imagen | — | — | — | — | ✘ | Plano › Movimiento | G | no | no | — | no | filmmaker-capability-master | sab-fase32 | — | Seedance no tiene entrada de dibujo |
| I07 | Plantillas de efectos virales | — | — | — | — | ✘ | — | H | no | no | — | no | filmmaker-capability-master | sab-fase32 | — | Fuera del mapa de Filmmaker |
| I08 | Elegir el modelo plano a plano | — | — | — | — | ✘ | — | H | no | no | — | no | filmmaker-capability-master | sab-fase32 | — | «El usuario elige el resultado. Weë elige la IA»; vídeo solo Seedance (decisión del 2026-09-07) |
| I09 | Del enlace de un producto a un anuncio | — | — | — | — | ✘ | — | G | no | no | — | no | filmmaker-capability-master | sab-fase32 | — | No es de Filmmaker; sería una puerta de Weë Business |
| I10 | Entrenar o clonar la identidad de una persona real (cara o voz) | — | — | — | — | ✘ | — | H | no | no | — | no | filmmaker-capability-master | sab-fase32 | — | Biometría de personas reales: necesitaría una decisión expresa, consentimiento y un proveedor |
| I11 | Escena 3D editable | — | — | — | — | ✘ | — | H | no | no | — | no | filmmaker-capability-master | sab-fase32 | — | Fuera del mapa aprobado |
| I12 | Traducir y doblar el diálogo | — | — | — | — | ✘ | Story › Guion | G | no | no | — | no | filmmaker-capability-master | sab-fase32 | — | Ningún proveedor del engine; después de C59 y C60 |
| I13 | Plugins de editores, CLI, MCP y mercancía | — | — | — | — | ✘ | — | H | no | no | — | no | filmmaker-capability-master | sab-fase32 | — | Fuera del mapa aprobado |
| I14 | Varios agentes con roles y piloto automático sin confirmar | — | — | — | — | ✘ | — | H | no | no | — | no | filmmaker-capability-master | sab-fase32 | — | Un solo Weë Brain (regla 10) y nada se genera sin ver el precio y confirmar |
| I15 | Varios fotogramas clave con su instante dentro de un plano | ✘ | por texto e imágenes de referencia (Seedance 2.5) | — | — | ✘ | Plano › Referencias | F | sí | sí: contrato 1 + papel «storyboard» (N15) | BytePlus ModelArk (Seedance) | sí | filmmaker-capability-master | sab-fase32 | — | Control: «Fotogramas clave» (cerrado) |
| I16 | Rehacer solo un tramo de una toma | ✘ | ✔ `edit` (solo 2.5) | — | — | ✘ | Plano › Toma | F | sí | sí: contrato 2 | BytePlus ModelArk (Seedance) | sí (Credits por toma) | filmmaker-capability-master | sab-fase32 | — | Control: «Rehacer este tramo» (cerrado). R19 antes |
| I17 | Transferir una actuación grabada a un personaje | ✘ | ✔ `reference_video` | — | — | ✘ | Plano › Referencias | F | sí | sí: contrato 1 + persona autorizada (N27) | BytePlus ModelArk (Seedance) | sí (Credits por toma) | filmmaker-capability-master | sab-fase32 | — | La serie 2.x rechaza caras reales sin autorización |
| I18 | Revisar las tomas generadas (continuidad y marca) con visión | ✘ en Filmmaker | ✔ visión (Gemini) | — | — | ✘ | Weë AI Director › Analizar | D | sí | sí: una capacidad más por la puerta (regla 10) y su precio | Gemini | sí | filmmaker-capability-master | sab-fase32 | — | Control: «Revisar las tomas» (cerrado) |
| I19 | Tope de gasto de una producción | ✘ | — | — | — | ✘ | Weë AI Director › Precio | F | no | sí: una política del Credit Engine por producción | — | no | filmmaker-capability-master | sab-fase32 | — | Control: «Tope de Credits de la producción» (cerrado). Hoy cada gasto se cotiza y se confirma |
| I20 | Procedencia firmada de lo generado (C2PA) | ✘ | — | — | — | ✘ | Exportar / Publicar | G | no | no | — | no | filmmaker-capability-master | sab-fase32 | — | El Weël ya lleva la marca de Weë |
<!-- MATRIZ:FIN -->

## 5. Las fases que siguen (sin gasto y sin tocar contratos cerrados)

Cada una: objetivo, código, pruebas, sabotajes, demo local (360, 375, 390 y 1280 px), documentación y un commit local.
Cada fase actualiza sus filas en esta matriz (el generador vive fuera del repo; la tabla se regenera entera).

| Fase | Objetivo | Qué entra |
|---|---|---|
| 33 | Riesgos que se pueden cerrar sin contrato | R2 (quitar las órdenes del proveedor de todo texto que llegue a Seedance, en el adaptador), R15 (la toma dice «comprobando» cuando el dinero está en reconciliación, no «se están devolviendo»), R18 (la tabla oficial de píxeles en el precio), R19 (`adaptive` al editar y extender, y el tipo de tarea solo a 2.5), R20 (cupos separados y totales de las referencias); R3 y R4 estudiados: lo que tocaría el runtime cerrado queda preparado. **Hecha**, con R22 (encontrado aquí) |
| 34 | Weë AI Director con propuestas estructuradas | Qué planos afecta cada propuesta (N03), el resumen de lo que quedaría calculado con el F1-A del espejo (N04), «Proponer planos» (N06), «Explicar» (N07), «Cobertura de este plano» (I01), «Convertir mi guion en escenas» (I05), «Generar esta escena» (N01), y el camino aplicar → precio → confirmar → generar; en una producción vacía, empezar por la propuesta de escenas. **Hecha** |
| 35 | Historia: Escenas y Continuidad | La vista de escenas (N10) y la de continuidad plano a plano, con lo heredado dicho (N11). **Hecha** |
| 36 | Referencias completas | Vista previa, origen y estado de cada material (N14); el papel «storyboard» cerrado con su porqué (N15); el aviso de que la serie 2.x rechaza caras reales sin autorización (N27). **Hecha** |
| 37 | Audio y línea de tiempo | La duración de cada sonido (N16); fundido, inicio y «activo» visibles y cerrados (N17); la pista de diálogo en el teléfono (N12); «Generar» en las propiedades del plano (N13) |
| 38 | Montaje, exportación y publicación | Los montajes anteriores con su fecha, duración y descarga (N02); Weël ≤15 s y Wäll separados y dichos (R9 sigue siendo decisión); cerrados con su porqué: póster elegido (N24), máster para etalonar (N26), escalado (N25) |
| 39 | Contratos y canaries preparados | Los seis contratos y los cambios menores (R5, R8, N05, N15, N17, N20, N21, N22, N23, I19) con su cambio mínimo exacto, campos, consumidores, pruebas y compatibilidad; cada canary con su objetivo, modelo, entrada, salida, coste estimado, riesgo y la puerta que abre; todo cerrado |
| 40 | Cierre de la ronda | La matriz al día, el repaso móvil completo y el informe ejecutivo |

## 6. Lo que necesita una decisión (no se hace sin autorización)

| Qué | Por qué no se hace solo | Filas |
|---|---|---|
| Los seis contratos: fotogramas y referencias; editar y extender; restaurar una toma anterior; voz del personaje; estado estructurado; labios sincronizados | Cambian contratos cerrados (F1-A / F1-D / voz) | C50, X18, C51, C52, N31, C59, C60, C28, C30, N11 |
| R3 (trabajos de toma huérfanos) y R4 (inanición de la reconciliación) | Tocan el runtime cerrado de la Fase 12-D y el barrido desplegado | — |
| R5 (firma de la toma) y R8 (techo de 1 000 revisiones) | Contratos F1-D y F1-B | — |
| R9: cuánto dura un vídeo en el Wäll | Decisión de producto (hoy 600 s; los Weëls, 15 s) | C64 |
| Los canaries: Alta y Máxima, 4K, primer y último fotograma, referencias, editar, extender, voces, labios, sonido nativo, Weë Brain real en Filmmaker, render en la nube, subida a Mis creaciones | Gastan dinero real | C49, C67, C50, X18, C51, C52, C59, C60, C53, C54, C71 |
| Imagen dentro de Filmmaker (boceto, hoja del personaje) y visión sobre las tomas | Una capacidad más por la puerta del Core (regla 10) y su precio | C37, I02, I18 |
| Personas reales autorizadas (`asset://`) e identificador de seguridad por persona | Privacidad y un proceso con BytePlus | N27, N30 |
| El 4:5 | Dejar de ofrecerlo o componerlo en el render; la 3:4 sí se generaría (contrato F1-A) | C66, N20 |
