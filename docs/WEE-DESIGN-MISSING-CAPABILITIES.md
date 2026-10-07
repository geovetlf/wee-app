# Weë Design — lo que falta

Lo que Weë Design **no tiene** hoy y necesita para competir funcionalmente, sacado de la [matriz](WEE-DESIGN-CAPABILITY-MATRIX.md)
(MAPA 1). Cada hueco dice por qué importa, dónde vivirá, qué reutiliza del Core, qué requiere y de quién depende. Comprobado sobre
`main` = `5efbc0a` (2026-10-07). **Nada de esto se construye en el backend en esta misión**: la referencia funcional lo enseña
apagado, con su motivo, en su sitio.

**Dependencias por línea:**
- **Línea A** (Algorithm Engine): el Planner y la selección por capacidad son suyos; Weë Design no toca `core/algorithm/**`.
- **Línea B** (multi-proveedor 3D): el contrato canónico 3D, el Provider Registry, los huecos del Router y el **MAPA 2**.
  Todo hueco marcado `B` es **DEPENDENCY / FUTURE INTEGRATION: alinear con el contrato canónico 3D de la Línea B**.
- **Dueño**: las decisiones D1–D9 de [DESIGN.md](DESIGN.md) y las DEC de [decisiones](WEE-DESIGN-UIUX-DECISIONS.md).

## 1. Huecos de superficie (la persona no tiene dónde hacerlo)

| # | Hueco | Por qué importa | Dónde vivirá | Reutiliza | Requiere | Depende de |
|---|---|---|---|---|---|---|
| M01 | Un **espacio de trabajo** (lienzo + paneles) | Hoy Weë Design es una portada: nada se ve, se elige, se cambia ni se entrega en el mismo sitio | Ruta `DesignReferencia` (puerta cerrada) → algún día `Design` | `CajaDePrompt`, `AjustesContextuales`, `TarjetaTresD`, servicios de trabajos, materiales y proyectos | Solo frontend | Dueño: sustituir la pantalla actual (DEC-01) |
| M02 | **Visor 3D** | Sin él, un modelo 3D es un archivo que hay que descargar | Lienzo | El visor preparado en `filmmaker/core` | Fusionarlo; una librería aprobada | Dueño (DEC-09); misión de Filmmaker |
| M03 | **Trabajos dentro del workspace** (estado, avance, reabrir) | Hoy hay que ir a «Mis creaciones» o a Weë AI para ver qué está pasando | Franja inferior | `creatorService.getMyJobs`, `claveDelEstado` | Nada nuevo | — |
| M04 | **Materiales y proyecto dentro del workspace** | La biblioteca y el proyecto viven en otras pantallas | Panel izquierdo; barra de comandos | `assetsService.listar`, `projectsService.list` | Nada nuevo | — |
| M05 | **Inspector** del material elegido (clase, estado, origen, derechos, versiones, usos) | Lo que el Core sabe del material no se ve en ningún sitio | Panel derecho | `vistaDeAsset`, `frasesDeDerechos`; `linaje.ts` (cuando llegue al cliente) | Espejo generado de `linaje.ts` (P9) para versiones y usos | Content Core (P1, P2, P5, P9) |
| M06 | **Intención en la caja** (crear / transformar / editar) | La caja no distingue qué se quiere hacer; todo acaba en el mismo texto | Composer | `destinoDeIntencion`, `ContextoDeExperiencia` | Nada nuevo para lo que ya existe | D1, D2, D7 |

## 2. Huecos de conexión (existe en el servidor, no llega a la pantalla)

| # | Hueco | Estado hoy | Qué hace falta | Depende de |
|---|---|---|---|---|
| M07 | La caja de Design → `CreatorFlow` | Temporizador (`DesignScreen.tsx:100-112`) | El contexto común (F2 de DESIGN.md) | D1, D2, D7 |
| M08 | Lo elegido en los ajustes y los adjuntos con su clase | Se enseñan y no viajan (H-5) | Que el plan sepa leerlos; mientras tanto, palabras en el `goal` (como Studio) | Servidor (`creatorChat`) |
| M09 | Referencia de estilo | La foto se ignora (`inputs.ts:14-23`) | `image.reference` en el plan | D6 |
| M10 | Formatos (9:16, 16:9…) | Todo 1:1 | `aspectRatio` en el paso de imagen | D5 |
| M11 | Texto en la imagen para afiches | Solo logos | `kind` según intención + variante en el catálogo | D4 |
| M12 | Editar la propuesta elegida con linaje | Trabajo nuevo desde cero | Paso de edición + `nuevaVersion` | D3; P2 |
| M13 | Quitar fondo y más resolución sobre un diseño | Viven en Weë Photo / ninguna plantilla | Pasos en la plantilla `design` | Servidor |
| M14 | Derechos y «Mis creaciones» en la tarjeta 3D de un resultado | `JobResult` no los lleva (H-7) | Campos en el resultado | Servidor |

## 3. Huecos de capacidad (no existe en ningún sitio de Weë)

| # | Capacidad (id del Core o propuesta) | Por qué | Requiere | Proveedor | Depende de |
|---|---|---|---|---|---|
| M15 | Modelo 3D desde texto, imagen o vistas (`3d.generate`) | Es el corazón de un estudio 3D | Capacidad enrutable, puerta asíncrona (patrón de `generateWorld`), materializador `model3d`, servicio de Credits | Candidatos (MAPA 2) | **B** |
| M16 | Texturas y materiales (`3d.texture`) | Sin materiales, un diseño no se presenta | Igual | Candidatos | **B** |
| M17 | Aligerar la malla (`3d.retopology`) | Juego, web y AR lo exigen | Igual; como paso de un destino | Candidatos | **B** |
| M18 | Cambiar el modelo con palabras (`3d.edit`) | Iterar sin empezar de cero | Igual + linaje | Candidatos | **B** |
| M19 | Esqueleto y animación (`3d.rig`; propuesta `3d.animate` + variante `motion`) | Personajes y mascotas | Igual + comprobación previa | Candidatos | **B** |
| M20 | Separar en partes (propuesta `3d.segment`) | Materiales por pieza, imprimir por piezas | Igual | Candidatos | **B** |
| M21 | Tamaño real (propuesta: variante `resize` de `3d.edit`) | Muebles, productos, impresión | Igual | Candidatos | **B** |
| M22 | Exportar por destino (`3d.convert` + `3d.export`) | La persona sabe para qué, no qué formato | Tabla destino → formato y pasos | Candidatos | **B**; dueño (los destinos) |
| M23 | Preparar para imprimir (plan) | Uso frecuente de un objeto diseñado | Plan de Weë Brain | Candidatos | **B**; Línea A (planes) |
| M24 | Vistas coherentes (propuesta `image.multiview`) | Fichas de producto; entrada de M15 | Capacidad o variante | Candidatos / cadena de imagen | **B** |
| M25 | Render desde el modelo o la escena (`render.*`) | Presentación fotorrealista del diseño | Motor de render (ninguno identificado) | Ninguno | Dueño; **B** |
| M26 | Traer un modelo propio (subida `model3d`) | Trabajar sobre lo que ya se tiene | Content Core (P3) | Ninguno | Content Core |
| M27 | Escenas guardadas (`Escena3D` perfil `design`) y luces con parámetros (P7) | Componer y presentar | Persistencia + contrato aditivo | Ninguno | Dueño (dónde se guardan); Content Core |
| M28 | Versiones visibles y «dónde se usa» | Volver atrás sin perder nada | P1, P2, P5, P9 | Ninguno | Content Core |
| M35 | Varias fotos a 3D de una vez (C37) | Catálogos de producto | Plan con un paso por foto y precio del lote | Candidatos | **B**; Línea A |
| M36 | Retocar una zona del modelo (C38; variante `region` de `3d.texture`) | Cambiar una parte sin rehacerlo todo | Capacidad + visor para elegir la zona | Candidatos | **B**; DEC-09 |
| M37 | Precio (y tiempo) en el botón, antes de la conversación (matriz §3.13) | Las dos referencias lo enseñan antes de generar | Cotizar sin trabajo; tiempo estimado por capacidad | — | **B**; Credit Engine; DEC-10 |
| M38 | Recetas reutilizables (matriz §3.14) | Repetir un buen proceso | Planes guardados (Planner) | — | Línea A; DEC-19 |

## 4. Huecos del ciclo de trabajo

| # | Hueco | Estado hoy | Qué hace falta | Depende de |
|---|---|---|---|---|
| M29 | **Cancelar** | No existe en `CreatorFlow`; solo el mundo | Un contrato de cancelación por capacidad que diga qué pasa con el dinero (un candidato no cancela; otro solo en cola) | **B**; servidor |
| M30 | **Reintentar** el MISMO trabajo | Trabajo nuevo; ⚠ H-3 | Reintento de servidor con el mismo `requestId` cuando el desenlace es incierto (patrón del mundo) | Servidor |
| M31 | **Avance real** y posición en la cola | Por pasos | Campo de avance en el estado del trabajo 3D | **B** |
| M32 | **Precio de 3D** | No hay servicio | Medir `providerCost` y fijar el precio por el Credit Engine (nunca inventarlo) | Dueño; Credit Engine |
| M33 | **Cupo diario de 3D** | Hay uno para mundos (`'3d'`: 5) | Decidir el de modelos | Dueño |
| M34 | **«No sé» en todas las preguntas** | Seis preguntas de `design` sin él (H-2) | Añadirlo en la plantilla | Servidor |

## 5. Lo que trajeron el cierre de cobertura, Sloyd, Seed3D 2.0 y r3–r5

| # | Hueco | Por qué importa | Qué requiere | Proveedor | Depende de |
|---|---|---|---|---|---|
| M39 | **Material como entrada** por su id en `CreatorFlow` / `creatorRun` | Encadenar sin descargar ni volver a subir (§11 de la arquitectura) | Resolver el id en el servidor como ya hace la puerta del mundo | Ninguno | Servidor |
| M40 | **Escribir el linaje** al materializar (`sourceAssetIds`, `previousVersionId`) | Versiones, «de dónde viene», derechos heredados | Usar `nuevaVersion` / `materialDerivado` (existen, sin llamadores) | Ninguno | Servidor; P1, P2 |
| M41 | **Conversor de formatos de Weë** (escala, ejes, origen, LOD, texturas) | Entregar a cualquier programa sin depender del candidato | Un proceso de Media Core (variante `convertir_formato`) | Ninguno | DEC-20 |
| M42 | Variantes de imagen `multiview` y `object3d` | Vistas e «imagen lista para 3D» con la cadena de imagen de Weë | Plantilla y variante en el motor | Ninguno (cadena de Weë) | DEC-22 |
| M43 | Pieza CAD desde palabras o desde un plano (C94, C95), de malla a CAD (C96) | Diseño de producto que se fabrica | Capacidad CAD (salida sólida, STEP) | Candidatos C / solo web / autoalojable | **B**; dueño |
| M44 | Medir el modelo (C97) | Tamaño, volumen, superficie antes de imprimir o fabricar | Cálculo de Weë sobre la malla (visor o servidor) | Ninguno | DEC-09 |
| M45 | Movimiento desde un vídeo y retoque de movimiento (C98, C99) | Personajes con movimiento propio | Variantes de `3d.animate`; revisión de biometría | Candidatos B/C | **B**; DEC-24 |
| M46 | Un estilo 3D propio (C106) | Memoria de marca (D8) | Entrenar y guardar un estilo por cuenta | Candidatos B / sin saber | **B**; D8 |
| M47 | Plantillas paramétricas y ajuste con controles (C88, C86) | Objetos que se ajustan con deslizadores | Un motor paramétrico | Candidato B | **B** |
| M48 | Fondo de 360°, textura que se repite, base para imprimir, hoja de sprites, pintar sobre el modelo (C87, C92, C91, C89, C90) | Escena, materiales, impresión y juego | Variantes y visor | Varios | **B**; DEC-09 |
| M49 | Profundidad de una imagen (C105, interna) | Dar volumen y alimentar el 3D | Variante de `image.analyze` | Candidato C / autoalojable | **B** |

Fuera de Weë Design, con su motivo y en el mapa: avatar de una persona real (C100), labios con la voz (C101), cambiar un mundo
(C102), mundo en vídeo (C103), cámara de un vídeo real (C104), bibliotecas de modelos ajenas (C107).

## 6. Lo que NO falta (y no se construye)

Un router, un gateway, un motor de trabajos, un sistema de Credits, una capa de materiales, un motor 3D, un registro de
proveedores o un asistente propios de Weë Design. Todo eso **existe una vez** y Weë Design lo usa
([auditoría](WEE-DESIGN-UIUX-AUDIT.md) §5).
