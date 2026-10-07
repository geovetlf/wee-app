# Weë Design — flujos (qué pasa al pulsar cada comando)

**Qué es.** Para cada comando: **COMANDO → ACCIÓN → SUPERFICIE → PARÁMETROS → VALIDACIÓN → TRABAJO → PROGRESO → RESULTADO →
SIGUIENTES ACCIONES**, sin botones muertos. Lo conectado dice a qué pieza real va; lo apagado dice por qué y de qué depende.
Las filas `C..` son las del mapa maestro ([generado](WEE-DESIGN-CAPABILITY-MAP.md); el razonamiento, en la
[matriz](WEE-DESIGN-CAPABILITY-MATRIX.md)). Los diecinueve pasos de cada capacidad, celda a celda, están en la
[matriz de cobertura](WEE-DESIGN-COVERAGE-MATRIX.md) §2. Comprobado sobre `main` = `5efbc0a` (2026-10-07).

## 1. Los estados de un trabajo

Quince, y ni uno más: los once del dueño, los genéricos de un trabajo 3D (**CANCEL_REQUESTED**, **RECONCILING**) y dos que ya
existían en Weë y sirven (**VALIDATING**, **WAITING_FOR_CREDITS**). Viven en `utils/designReferencia.ts`
(`ESTADOS_DE_TRABAJO`, `TRANSICIONES_DE_TRABAJO`), cada uno con su clave de texto en los dieciséis idiomas, y
`functions/test/design-referencia.mjs` (grupo I9) los fija.

| Estado | Qué significa para la persona | Qué se ve | Qué se puede hacer |
|---|---|---|---|
| **IDLE** | Nada empezado | La caja vacía; el lienzo invita | Escribir, adjuntar, elegir |
| **READY** | Hay lo necesario para mandarlo | Botón amarillo encendido | Crear |
| **VALIDATING** | Weë comprueba lo que hay y pregunta lo que falta | Las preguntas guiadas (con «🤷 No sé») | Contestar, cambiar algo |
| **QUOTING** | Weë calcula el precio | «Calculando el precio…» | Esperar |
| **WAITING_FOR_CONFIRMATION** | El precio está a la vista y falta el sí | El plan con su precio en Credits (del Credit Engine) | Confirmar, cambiar el nivel, volver |
| **WAITING_FOR_CREDITS** | Faltan Credits para ese precio | Cuántos faltan y «Conseguir Credits» | Conseguir Credits, cambiar el nivel, volver |
| **QUEUED** | Aceptado, esperando turno | «En cola» (y cuántos delante, si el contrato lo trae) | Salir de la pantalla; pedir que **no empiece**, si la capacidad lo admite |
| **PROCESSING** | Se está haciendo | Pasos, o avance real si el contrato lo trae (ningún candidato 3D lo garantiza) | Salir; pedir parar **solo** si la capacidad sabe parar |
| **CANCEL_REQUESTED** | Se pidió parar o que no empiece | «Pedido parar…» | Esperar: si el resultado llega antes, gana el resultado y se guarda |
| **RECONCILING** | No se sabe cómo terminó (se perdió la respuesta, caducó el aviso) | «Comprobando cómo terminó» | Esperar: Weë pregunta por ESA petición; nunca adivina ni cobra dos veces |
| **COMPLETED** | Hecho | El resultado en el lienzo y en «Mis creaciones» | Lo que sigue (barra de acciones), otra versión, entregar, guardar en proyecto |
| **FAILED** | No salió | El motivo, en palabras; el dinero devuelto | Reintentar, cambiar algo |
| **CANCELLED** | Parado antes de terminar | Lo que pasó con el dinero (la regla de la parada) | Volver a empezar |
| **RETRYING** | Se vuelve a pedir lo mismo | «Reintentando» | Esperar |
| **NOT_AVAILABLE** | Esto no se puede hacer ahora | El motivo público (`noDisponible`) o «pendiente de autorización» / «en revisión» / «nadie puede hacerlo todavía» | Volver; nunca se cobra |

**Transiciones** (`TRANSICIONES_DE_TRABAJO`):

```
IDLE ⇄ READY ─→ VALIDATING ─→ QUOTING ─→ WAITING_FOR_CONFIRMATION ─→ QUEUED ─→ PROCESSING ─→ COMPLETED
          │         │   │          │         ↑ │  │         ↑                │    │           │
          │         │   │          │ (otro nivel) │  └→ WAITING_FOR_CREDITS ──┘    ├─→ CANCEL_REQUESTED ─→ CANCELLED | COMPLETED | FAILED | RECONCILING
          │         │   │          │              │                                ├─→ RECONCILING ─→ COMPLETED | FAILED | CANCELLED
          │         │   │          └──────────────┴─→ NOT_AVAILABLE / FAILED        └─→ FAILED ─→ RETRYING ─→ QUEUED | QUOTING | FAILED
          │         │   └─→ QUEUED   (solo lo que NO cuesta: subir un modelo, capturar el visor)
          │         └─→ NOT_AVAILABLE / FAILED
          └─→ COMPLETED   (lo que no tiene trabajo: filtrar, abrir un proyecto, descargar)
COMPLETED, CANCELLED, FAILED, NOT_AVAILABLE → IDLE (empezar otra)
```

Tres reglas que la prueba hace caer si se rompen:

1. **El precio va antes del trabajo.** A la cola solo se llega confirmando el precio (WAITING_FOR_CONFIRMATION), reintentando
   (RETRYING) o —solo lo que no cuesta— tras comprobar (VALIDATING). Toda capacidad que pasa por el motor pasa por QUOTING y
   WAITING_FOR_CONFIRMATION, también en la simulación; el precio lo da el Credit Engine al cotizar (`creatorQuote`), nunca la
   pantalla.
2. **Pedir parar no es haber parado.** De PROCESSING no se va a CANCELLED: se va a CANCEL_REQUESTED, y de ahí a lo que de verdad
   pase.
3. **Lo que no se sabe se reconcilia** (RECONCILING), no se adivina.

**Desde lo que ya existe** (pura, sin inventar estados; las dos tablas son totales: un estado nuevo en la fuente no compila):

| Fuente | → Estado |
|---|---|
| `creatorJobs.status`: `asking` · `planned` · `running` · `done` · `failed` · `cancelled` | VALIDATING · WAITING_FOR_CONFIRMATION · PROCESSING · COMPLETED · FAILED · CANCELLED |
| Contrato 3D asíncrono (hoy, el del mundo, `EstadoDeMundo3D`): `en_cola` · `generando` · `cancelando` · `completado` · `fallido` · `cancelado` | QUEUED · PROCESSING · CANCEL_REQUESTED · COMPLETED · FAILED · CANCELLED |
| Sin candidato elegible (`NOT_AVAILABLE` del Router) | NOT_AVAILABLE |
| Desenlace desconocido (el barrido de liquidación del runtime) | RECONCILING |

IDLE, READY, QUOTING, WAITING_FOR_CREDITS y RETRYING son del cliente: nadie los guarda.

**La simulación** (`estadosSimulados`): el detalle de cada capacidad recorre los estados por los que pasaría, uno por toque de la
persona —sin temporizadores que finjan trabajo—, con «Simulación: no se genera nada, no se cobra nada y no se llama a nadie»
en cada paso. El precio se dice «pendiente» si la capacidad no tiene cotización de verdad.

## 2. Los flujos conectados (funcionan hoy con la puerta abierta)

| Comando | Acción | Superficie | Parámetros | Validación | Trabajo | Progreso | Resultado | Siguientes acciones |
|---|---|---|---|---|---|---|---|---|
| **Crear un concepto** (C01) | Escribir y pulsar el amarillo | Composer · Crear | Lo escrito; «¿qué?» (logo, afiche, producto, vehículo o máquina, lugar, personaje, 🤷 No sé); ajustes (estilo, materiales, luz, formato, calidad) como palabras; adjuntos con clase | Texto no vacío; sesión | `CreatorFlow` (`design`) → `creatorChat` → `creatorQuote` → `creatorRun`; `creatorJobs` | `JobProgress` por pasos | 3 propuestas + concepto (`ResultCard`); materiales en «Mis creaciones» | Elegir, cambiar con palabras (recrea, D3), otra versión, publicar, descargar, guardar en proyecto |
| **Transformar mi espacio** (C07) | Elegir «Transformar», escribir, adjuntar la foto (o en el flujo) | Composer · Transformar | Lo escrito; la foto (`imageUri`) | Texto no vacío; la foto la pide `CreatorFlow` si falta | `CreatorFlow` (`home`) | Por pasos | Antes/después, lista de cambios y compras | Continuar por otro camino del espacio, guardar, publicar |
| **Cambiar con palabras** (C11, parcial) | Elegir un trabajo, «Editar», escribir el cambio | Composer · Editar | El objetivo del trabajo + el cambio (`weeai.goalWithChange`) | Un trabajo elegido | `CreatorFlow` con la experiencia del trabajo (es lo que hacen hoy las ediciones rápidas de `ResultCard`) | Por pasos | Un resultado nuevo | Igual que C01. **Sin linaje** hasta P2/D3 |
| **Abrir su trabajo / otra versión** (C12) | Tocar «Abrir su trabajo» | Inspector / Lienzo | `experienceId` + `jobId` | Que se conozcan | `CreatorFlow` reabre ESE trabajo (como «Mis creaciones») | — | El resultado de siempre, con «Crear otra versión» | Las del resultado |
| **Elegir un material** | Tocar en la biblioteca | Biblioteca · Materiales | — | — | Lectura de `assets` | — | Lienzo (imagen o tarjeta 3D) + Inspector (propiedades y derechos) | Descargar, publicar, abrir su trabajo |
| **Descargar** (C30) | «Descargar» | Inspector · Entregar | La URL de entrega y lo que el material declara | Que haya URL | `assetDownload` | — | Guardado, compartido o abierto (según plataforma) | — |
| **Publicar** (C33) | «Publicar en Weë» | Inspector · Entregar | La imagen elegida (`prefill.media`) | Imagen con URL | Compositor `Create` | — | El compositor de siempre | «Cómo lo hice» se rellena en `CreatorFlow` |
| **Guardar en proyecto** (C34) | «Guardar en proyecto» con un trabajo elegido | Inspector · Entregar | Proyecto (existente o nuevo) | Un trabajo elegido | `ProjectPicker` → `assignJob` | — | El trabajo en el proyecto | Cambiar de proyecto |
| **Cambiar de proyecto** | Tocar el proyecto de la barra | Barra | Proyecto | Sesión | `ProjectPicker` | — | Pestaña «Proyecto» con sus trabajos | — |
| **Adjuntar una referencia** | «+» de la caja | Composer / Biblioteca · Referencias | Una foto de la galería | Permiso de fotos | Ninguno (se guarda como `Adjunto`) | — | Ficha quitable | Crear con ella |
| **Ajustes** | ⚙ de la caja | Hoja común `AjustesContextuales` | Estilo, materiales, luz, formato, calidad | — | Ninguno | — | Fichas | Viajan como palabras en el `goal` (H-5) |

## 3. Los flujos apagados (se ven, dicen por qué, no hacen nada más)

Pulsar uno abre su **detalle**: qué haría, por qué no se puede, qué hace falta (servidor, proveedor autorizado, decisión,
visor, linaje, escenas) y sus decisiones. Nunca mueve un Credit ni llama a nada.

### 3.1 Modelo 3D (C03, C08, C09) — el ejemplo del dueño, como será

| Paso | Qué pasa | Pieza (existente o futura) |
|---|---|---|
| COMANDO | «Modelo 3D» (Crear) o «De esta imagen a 3D» (Transformar, sobre una propuesta elegida) | Registro; Composer |
| ACCIÓN | Escribir y/o adjuntar la imagen o las vistas (con su papel) | `Adjunto` (+ papel de vista: propuesta) |
| SUPERFICIE | Composer → `CreatorFlow` (pregunta lo que falta, con «No sé») | `CreatorFlow` |
| PARÁMETROS | Para qué es (juego, impresión, presentación… o «No sé»), detalle, con o sin textura — en palabras | Plantilla nueva (Línea A/B) |
| VALIDACIÓN | ¿La imagen sirve? ¿Hay candidato elegible para la cuenta y su jurisdicción? | Router + elegibilidad (MAPA 2) |
| COTIZACIÓN | Precio antes de crear; si «forma primero, textura después», dos precios | `creatorQuote` / puerta asíncrona |
| CREDITS | Reserva idempotente; cobro al terminar; reembolso exacto si falla | Credit Engine |
| TRABAJO | Asíncrono (patrón de `generateWorld`: cotizar, crear, estado, cancelar) | Contrato canónico 3D (**Línea B**) |
| PROGRESO | QUEUED → PROCESSING; avance real si el contrato lo trae | Franja de trabajos |
| RESULTADO | Material `model3d` de la cuenta (con derechos y vista previa como variante); en el lienzo con el visor | Content Core; visor (DEC-09) |
| SIGUIENTES | Materiales (C16), cambiar (C15), partes (C18), tamaño (C19), esqueleto/animar (C21–C23), exportar para… (C31), imprimir (C32) | Inspector |

**Hoy:** NOT_AVAILABLE con «pendiente de autorización» (elegibilidad REVIEW_REQUIRED) y «Weë todavía no sabe hacer esto»
(`3d.generate` DECLARED). **Depende de:** Línea B (contrato, registro, Router, MAPA 2), DEC-09 (visor), DEC-10 (precio y cupo).

### 3.2 El resto

| Comando | Superficie | Qué haría | Motivo hoy | Depende de |
|---|---|---|---|---|
| Vistas (C02) | Composer · Crear | Varias vistas coherentes del diseño | Capacidad propuesta | Línea B |
| Render (C04) | Composer · Crear | Render fotorrealista desde el modelo | Sin motor de render | Dueño; Línea B |
| Entorno (C05) | Biblioteca · Escena | Un mundo como entorno de la escena | Pendiente de autorización (ningún modelo de mundos elegible); D7 | Puerta del mundo; D7 |
| Inspiración (C06) | Composer · adjuntos | Que la imagen inspire el diseño | El servidor la ignora | D6 |
| Presentar en vídeo (C10) | Inspector · Entregar | Llevar la propuesta a Weë Studio | Cruzar de workspace es decisión | DEC-12 |
| Quitar fondo (C13), más resolución (C14) | Inspector · Cambiar | Sobre la propuesta | Falta el paso en la plantilla | Servidor |
| Cambiar el modelo (C15), materiales (C16), partes (C18), tamaño (C19) | Inspector · Cambiar | Sobre un modelo 3D | Sin capacidad enrutable; pendiente de autorización | Línea B |
| Esqueleto (C21), animar (C22), movimiento (C23) | Inspector · Animar | Sobre un personaje 3D | Igual; comprobación previa de aplicabilidad | Línea B |
| Escena (C24), cámaras (C25), luces (C26) | Biblioteca · Escena | Componer y guardar | Las escenas no se guardan; luces sin contrato | DEC-11; P7 |
| Visor (C27), modos de vista (C28) | Lienzo · barra | Girar, acercar, alambre, materiales | Sin visor en `main` | DEC-09 |
| Exportar para… (C31), aligerar (C17) | Inspector · Entregar | Juego, animación, impresión, web y AR, render, edición | Sin capacidad enrutable | Línea B; DEC-06 |
| Imprimir (C32) | Inspector · Entregar | Analizar, reparar, colores, piezas | Igual | Línea B |
| Traer un modelo (C35) | Biblioteca · Materiales | Subir un GLB/OBJ/FBX/STL propio | Sin subida de `model3d` | Content Core (P3) |
| Versiones (C36) | Franja · Versiones | Ver y volver a versiones | Nadie escribe el linaje | P1, P2, P9 |
| Varias fotos a 3D (C37) | Composer · Transformar | Un modelo por foto, con el precio del lote | Sin capacidad enrutable; pendiente de autorización | Línea B; Línea A |
| Retocar una zona (C38) | Inspector · Cambiar | Cambiar el color o el material de una parte | Sin capacidad enrutable ni visor; pendiente de autorización | Línea B; DEC-09 |

## 4. Error, reintento y cancelación

| Situación | Hoy en `CreatorFlow` | En un trabajo 3D (cuando exista) | Regla |
|---|---|---|---|
| Error con motivo conocido | `humanizeCreatorError`; FAILED | El motivo público del contrato | Nunca la frase del error del proveedor |
| No disponible | `noDisponible` (5 motivos) | Igual + «pendiente de autorización» | Ni proveedor, ni modelo, ni jurisdicción en el texto |
| Faltan Credits | Se sabe al crear; «Conseguir Credits» | Antes de reservar (la puerta del mundo ya lo hace) | WAITING_FOR_CREDITS, nunca FAILED |
| Reintentar | Abre un trabajo nuevo y pierde las respuestas; ⚠ H-3 | Con el MISMO `requestId` si el desenlace es incierto (un request = una generación = un cobro) | RETRYING |
| Cancelar | No existe | **Solo lo que se puede cumplir.** Lo documentado por los candidatos 3D: uno no cancela nunca; otro, solo en cola; la puerta del mundo pide parar y el Job Engine confirma. La referencia ofrece «que no empiece» **solo en cola** (`logica`), «pedir parar» solo donde la parada se confirma (`con_parada`), y en el resto dice que no se puede parar y que lo que salga se guarda | QUEUED → CANCEL_REQUESTED → CANCELLED; empezado: nada, o CANCEL_REQUESTED si sabe parar |
| Desenlace desconocido | — | Se pregunta por ESA petición; se reconcilia, no se adivina | Nunca se cobra dos veces |

## 5. Por tamaño

Los flujos no cambian con el tamaño; cambia **dónde** se ven (ver [arquitectura](WEE-DESIGN-WORKSPACE-ARCHITECTURE.md) §3):
VALIDATING, QUOTING, WAITING_FOR_CONFIRMATION y WAITING_FOR_CREDITS ocurren siempre en `CreatorFlow`, que es pantalla propia en todos; el resultado vuelve
al lienzo por los trabajos y los materiales. En el teléfono, la caja solo está en la superficie «Lienzo», y elegir algo en la
biblioteca lleva al lienzo.

## 6. De la imagen al objeto, sin salir de Weë Design (la cadena)

La cadena que pidió el dueño —**imagen → editar → vistas → 3D → materiales → entregar**— es un flujo de flujos: cada eslabón es
una capacidad de las de arriba, y lo que sale de uno **entra en el siguiente como material de Weë** (por su id, con su linaje),
nunca como un archivo descargado y vuelto a subir. El diseño completo, con lo que cada eslabón es hoy y lo que le falta, está en
la [arquitectura](WEE-DESIGN-WORKSPACE-ARCHITECTURE.md) §11 y en la [matriz de cobertura](WEE-DESIGN-COVERAGE-MATRIX.md) §5.

| Paso | Qué hace la persona | Qué pasa | Hoy |
|---|---|---|---|
| 1 · Imagen | Escribe en la caja (Crear) | Concepto y propuestas por `CreatorFlow` | **EXISTING** |
| 2 · Editar (opcional) | Elige la propuesta y «Retocar la imagen» / «Quitar el fondo» | Una versión nueva de esa imagen | **PARTIAL**: hoy se vuelve a crear con el cambio, sin linaje |
| 3 · Vistas (opcional) | «Vistas del objeto» sobre la imagen | Un material derivado con las vistas | **BACKEND_REQUIRED** |
| 4 · Modelo 3D | «Modelo 3D desde una imagen» | Un modelo derivado de la imagen (o de las vistas) | **PROVIDER_REQUIRED** |
| 5 · Materiales (opcional) | «Materiales y texturas» | Una versión nueva del modelo | **PROVIDER_REQUIRED** |
| 6 · Entregar | «Exportar para un programa» con sus ajustes | Una variante del modelo (otro formato), sin tocarlo | **BACKEND_REQUIRED** |

En la referencia se **recorre entera**: la tira «De la imagen al objeto» del lienzo abre cada eslabón en su detalle; «Recorrer en
simulación» y «Ver en el lienzo» dejan un resultado SIMULADO que entra en el siguiente por referencia, con su linaje a la vista
(lienzo e inspector), y los atajos «Siguiente» y «Saltar a» llevan al paso que toca. Nada se genera, nada se cobra.

