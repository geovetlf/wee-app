# Weë Design — contradicciones entre fuentes oficiales de los candidatos

**Qué es.** Lo que las fuentes oficiales de los candidatos dicen de dos maneras, y qué hace Weë Design con ello. Regla: **no se
inventa una resolución**. Si la contradicción cambia la arquitectura, queda **REVIEW_REQUIRED** hasta que alguien la verifique;
si no la cambia, se **diseña para el peor caso** y se deja escrita. Las fuentes son los informes de la Línea C (`tripo-ux.md`,
`meshy-ux.md`) y de la Línea B (`seed3d.md` §3, `sloyd.md` §11, `global/r3`, `r4`, `r5`), todos del 2026-10-07; los nombres de
proveedor aparecen aquí porque esto es documentación, nunca en la app. La elegibilidad comercial es de la Línea B y no se decide
aquí.

## 1. Meshy

| SOURCE A | SOURCE B | CONFLICT | IMPACT | DECISION |
|---|---|---|---|---|
| Ayuda (H3): elegir «Meshy 7» en texto a 3D | Guía (D4), ayuda (H5) y la interfaz: no existe en texto a 3D | Qué motor sirve texto a 3D | Ninguno en Weë: la persona no elige motor | Ninguna acción; el Router decide |
| Guía (D4): 20 créditos en total | Ayuda (H3, H6): 20 por el modelo + 10 por la textura | Coste de texto a 3D | Coste para Weë, no precio para la persona | Medir `providerCost` real (DEC-10); ningún precio escrito |
| Ayuda (H6): 25 con 7/7.1 | Interfaz: 20 con 7.1, Estándar, sin textura | Coste de imagen a 3D | Igual | Igual |
| Guía (D5): Smart Topology 20 créditos, ~3 min | Ayuda (H6): 10 créditos | Coste y tiempo | Igual; ningún tiempo se promete | Igual |
| Ayuda (H3): planes a un precio | Ayuda (H44): otro precio | Precio de sus planes | Ninguno (Enterprise es lo único que sirve: MAPA 2) | Ninguna |
| Ayuda (H44): reintentos gratis por plan | Ayuda (H28, H45, H3): otras cifras | Reintentos gratis | Si Weë diera reintentos gratis, su coste | DEC-18: sin reintentos gratis hasta medir |
| Guía (D14): más de 500 clips | Ayuda (H44, H18): más de 600; 631 | Tamaño de la biblioteca de animación | Ninguno: la lista se lee del candidato | Ninguna |
| Interfaz y ayuda (H11): multivista de 4 imágenes | Guías (D5, D20): de 2 a 8 | Cuántas vistas acepta | **Arquitectura**: cuántas vistas pide C09 | **REVIEW_REQUIRED**: C09 pide «de 2 a 4» (lo que todos aceptan) hasta verificar |
| Blog e ayuda (B1, H12): 1–4 imágenes por envío | Ayuda (H13) e interfaz: 1–8 | Imágenes por petición | Igual que la fila anterior para la imagen | Diseñar para 4 |
| Guía (D3): el ayudante de prompts se retiró | Ayuda (H13, H41): sigue | Ayudante de prompts | Ninguno: en Weë lo hace Weë Brain | Ninguna |
| Interfaz y ayuda (H34): subida de 100 MB | Extracto de la FAQ: 50 MB | Tamaño máximo de un modelo subido | Límite de C35 | El límite lo fija Weë (Content Core), no el candidato |
| Ayuda (H6): texto a movimiento, 3 créditos | El botón del diálogo: 10 | Coste | Coste para Weë | Medir |
| Blog y guía (B1, D1): seis módulos con escena y vídeo | Ayuda (H1) e interfaz: sin ellos | Si escena y vídeo existen | C41 y C10 por ese candidato | Escena y vídeo de ese candidato: solo web (NOT_ALLOWED por API, MAPA 2) |
| Interfaz: seis laminadores | Blogs (B1, B6): otros | Qué laminadores | Ninguno: C53 es de Weë | DEC-21 |

## 2. Tripo

| SOURCE A | SOURCE B | CONFLICT | IMPACT | DECISION |
|---|---|---|---|---|
| Tabla de créditos (F18) | La interfaz | Coste de cada operación | Coste para Weë | Medir `providerCost` (DEC-10) |
| Interfaz: lote de hasta 10 | Blog (F40): hasta 30 | Tamaño del lote | C37 | Diseñar para 10 hasta verificar |
| Formatos (F17): USD | Formatos (F13): USDZ | Qué formato da | Ninguno: la conversión es de Weë (DEC-20) | Ninguna |
| Ayuda (F30): completar partes «sin créditos» | Tabla (F18): +5 por parte | Coste de completar partes | Coste | Medir |
| Plantilla (F16): «Parts: Medium» | Interfaz: Simple / Balanced / Detailed | Niveles de segmentación | Ninguno: Weë dice «más o menos detalle» | Ninguna |

## 3. Seed3D 2.0 (de `seed3d.md` §3, Línea B)

| Fuente | Afirmación A | Afirmación B | Conflicto | Impacto | Estado | Verificación necesaria |
|---|---|---|---|---|---|---|
| C1 · Referencia de la API (S12) frente a ficha, lista y tutorial (S12, S16, S17) | `content` admite solo texto | Imagen → 3D con 1 imagen | ¿Hay texto → 3D? | C03: no cuenta como candidato | ABIERTA | Confirmación escrita o prueba controlada autorizada (no hecha) |
| C2 · S13–S14 frente a S16 | El registro de la tarea dura 7 días | 24 h | Retención | RECONCILING: ventana para recuperar | ABIERTA | Diseñar para 24 h |
| C3 · S13–S14 frente a S15 | Cinco estados | Más `expired` | Máquina de estados | Correspondencia de estados | ABIERTA | Un estado desconocido = RECONCILING |
| C4 · S16 frente a S12 | `medium` = 100 000 caras | `medium` = 500 000 | Densidad | Ajuste «detalle» | ABIERTA | Medir en un resultado autorizado |
| C5 · S16 frente a S13 | «Success» | `succeeded` | Literal | Bajo | ABIERTA | Usar la referencia |
| C6 · S1–S4 frente a S5–S6 | Seis modelos comparados | Cinco | Marketing | Bajo | ABIERTA | — |
| C7 · S1–S7 frente a S12, S16, S17 | Partes, articulación, escenas «para aplicaciones reales» | La API solo hace imagen → 3D | ¿Producto o investigación? | **Alto**: C18, C76, C77, C78, C41 | ABIERTA | Hoja de ruta por escrito; **nada se da por disponible** (PROVIDER_REQUIRED / REVIEW_REQUIRED) |
| C8 · S19 frente a S26 §3.1 | «Utilizable comercialmente» | Permiso escrito previo; solo China continental | Uso comercial | **Alto** (Línea B) ⚖ | ABIERTA | Revisión legal |
| C9 · S30, S27 frente a S26 | Productos de cliente y usuarios finales | Todo uso comercial necesita permiso | Alcance | **Alto** ⚖ | ABIERTA | Revisión legal |
| C10 · S29 frente a S26, S27 | Usuarios fuera de China | Licencia solo en China | Territorio | Medio ⚖ | ABIERTA | Revisión legal |
| C11 · S3 frente a S1, S6 | Enlace `seed3d_2.0` (404) | `seed3d_2_0` | Enlace roto | Bajo | ABIERTA | — |
| C12 · S1 frente a S32–S34 | «Pruébalo» en una plataforma internacional | Esa plataforma no lo ofrece | Disponibilidad | Medio | ABIERTA | Preguntar a la plataforma |
| C13 · S16 frente a S13 | El SDK lee `VideoURL` | La API devuelve `content.file_url` | Soporte del SDK | Bajo-medio | ABIERTA | Revisar el SDK si se integra |
| C14 · S13 | Tiempos como enteros | El ejemplo los da como texto | Tipo | Bajo | ABIERTA | Leer sin suponer el tipo |

Lo que Weë Design hace con ellas: [requisitos de Seed3D](architecture/wee-design/seed3d-implementation-requirements.md) §1 y §18.

## 4. Sloyd (de `sloyd.md` §11, Línea B) — las que tocan capacidades

| SOURCE A | SOURCE B | CONFLICT | IMPACT | DECISION |
|---|---|---|---|---|
| FAQ de la API: 12 formatos | Referencia: solo GLB | Formatos por API | C31 | La conversión es de Weë (DEC-20) |
| FAQ: estilo coherente pasando un id | Referencia: texto e imagen a 3D sin `genStyleId` | Estilo en 3D por API | Ajuste «estilo» | Si no se puede cumplir, no se ofrece con ese candidato |
| FAQ: multi-imagen con los mismos controles | Referencia: solo caras y PBR | Controles de la multivista | C09 | Weë pide lo que todos cumplen |
| Tarifa: multivista con cuadriláteros | Referencia: no se pueden pedir | Coste sin capacidad | Coste | Medir |
| FAQ: la edición de imagen responde en el acto | Referencia: todo devuelve un `jobId` | Síncrono o asíncrono | Ninguno: la imagen es de Weë | Ninguna |
| Tarifa y nodo oficial: boceto → imagen | Referencia: no figura | Capacidad sin documentar | C40 | No integrar sin documentación (la imagen es de Weë) |
| Documentación: multivista y vídeo → animación solo Pro | Precios y novedades: en Plus | Documentación desfasada | Bajo | Ninguna |
| Términos y privacidad, entidades y licencias (seis filas) | — | Contrato, publicación pública, impresión comercial | Línea B ⚖ | No es de la Línea C |

## 5. Investigaciones globales (r3, r4, r5) — las que tocan capacidades

| SOURCE A | SOURCE B | CONFLICT | IMPACT | DECISION |
|---|---|---|---|---|
| r3: movimiento con palabras sin API comercial | r5: un agregador lo sirve por API | Disponibilidad de C23 por ese modelo | Candidato de C23 | Elegibilidad de la Línea B (UNKNOWN) |
| `seed3d.md`: solo en una plataforma china | r5: un agregador lista «Seed3D 2.0»; otro lo anuncia sin API | Si existe fuera | Candidato de C08 | No cuenta hasta que la Línea B lo verifique |
| r4: formato de un modelo abierto sin saber | Agregadores: GLB | Formato de salida | Ninguno: la conversión es de Weë | Ninguna |
| Etiqueta «uso comercial» en un agregador | Dependencias con licencia no comercial | Licencia heredada | Línea B ⚖ | No es de la Línea C |
| Agregadores sin límite territorial | Licencia del modelo que excluye UE, Reino Unido y Corea | Territorio | `jurisdiccion` de la capacidad | La elegibilidad por cuenta la decide el servidor |
| Web: exporta varios formatos | API: solo mallas de colisión | Formatos de un servicio de mundos | C78 | REVIEW_REQUIRED |
| Ruta REST de texto a CAD desaparecida | Solo WebSocket | ¿Se llega por API? | **C94** | **REVIEW_REQUIRED** para ese candidato |
| Cancelación de pedidos de impresión: no hay | Sí hay (otra sección) | Cancelar un pedido físico | C71 (fuera de Weë Design) | Ninguna |
| Web anuncia texturas | API sin modelo de texturas | Capacidad anunciada | C16 | No cuenta |
| Web: texto → movimiento | API: «próximamente» | Igual | C23 | No cuenta |
| Materiales: rugosidad y metal | GLB con albedo y normales | Qué mapas trae | Inspector · Material | Se leen del archivo, no se suponen |
| Familias de modelos con licencias mezcladas | — | Qué versión es comercial | Línea B ⚖ | No es de la Línea C |
