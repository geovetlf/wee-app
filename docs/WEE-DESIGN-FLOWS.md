# Weë Design — flujos (qué pasa al pulsar cada comando)

**Qué es.** Para cada comando: **COMANDO → ACCIÓN → SUPERFICIE → PARÁMETROS → VALIDACIÓN → TRABAJO → PROGRESO → RESULTADO →
SIGUIENTES ACCIONES**, sin botones muertos. Lo conectado dice a qué pieza real va; lo apagado dice por qué y de qué depende.
Las filas `C..` son las del [MAPA 1](WEE-DESIGN-CAPABILITY-MATRIX.md). Comprobado sobre `main` = `5efbc0a` (2026-10-07).

## 1. Los estados de un trabajo

Los once del dueño y dos más que sirven (los dos ya existen en el contrato del mundo 3D). Viven en
`utils/designReferencia.ts` (`ESTADOS_DE_TRABAJO`, `TRANSICIONES_DE_TRABAJO`), con su clave de texto cada uno.

| Estado | Qué significa para la persona | Qué se ve | Qué se puede hacer |
|---|---|---|---|
| **IDLE** | Nada empezado | La caja vacía; el lienzo invita | Escribir, adjuntar, elegir |
| **READY** | Hay lo necesario para mandarlo | Botón amarillo encendido | Crear |
| **VALIDATING** | Weë comprueba lo que hay y pregunta lo que falta | Las preguntas guiadas (con «🤷 No sé») | Contestar, cambiar algo |
| **QUOTING** | Weë calcula el precio | «Calculando el precio…» | Esperar |
| **WAITING_FOR_CREDITS** | El precio está a la vista y falta el sí (o faltan Credits) | El plan con su precio; si no alcanza, cuántos faltan y «Conseguir Credits» | Confirmar, cambiar el nivel, conseguir Credits, volver |
| **QUEUED** | Aceptado, esperando turno | «En cola» (y cuántos delante, si el contrato lo trae) | Salir de la pantalla; cancelar si la capacidad lo admite |
| **PROCESSING** | Se está haciendo | Pasos (o avance real si el contrato lo trae) | Salir; cancelar si se puede |
| **CANCELLING** | Se pidió parar y se espera respuesta | «Parando…» | Esperar (si el resultado llega antes, gana el resultado y se cobra) |
| **COMPLETED** | Hecho | El resultado en el lienzo y en «Mis creaciones» | Editar, otra versión, entregar, guardar en proyecto |
| **FAILED** | No salió | El motivo, en palabras; el dinero devuelto | Reintentar, cambiar algo |
| **CANCELLED** | Parado | Lo que pasó con el dinero | Volver a empezar |
| **RETRYING** | Se vuelve a pedir lo mismo | «Reintentando…» | Esperar |
| **NOT_AVAILABLE** | Esto no se puede hacer ahora | El motivo público (`noDisponible`: ahora no, en tu región, falta tu país, con estas opciones, no disponible) o «pendiente de autorización» | Volver; nunca se cobra |

**Transiciones** (`TRANSICIONES_DE_TRABAJO`; una prueba las fija):

```
IDLE ⇄ READY → VALIDATING → QUOTING → WAITING_FOR_CREDITS → QUEUED → PROCESSING → COMPLETED
                    │           │              │  ↑ (otro nivel)    │         │
                    │           │              └→ QUOTING           ├→ CANCELLING → CANCELLED | COMPLETED | FAILED
                    │           │                                   └→ FAILED → RETRYING → QUEUED | QUOTING | FAILED
                    └───────────┴→ NOT_AVAILABLE / FAILED
COMPLETED, CANCELLED, FAILED, NOT_AVAILABLE → IDLE (empezar otra)
```

**Desde lo que ya existe** (pura, sin inventar estados):

| Fuente | → Estado |
|---|---|
| `creatorJobs.status`: `asking` · `planned` · `running` · `done` · `failed` · `cancelled` | VALIDATING · WAITING_FOR_CREDITS · PROCESSING · COMPLETED · FAILED · CANCELLED |
| Contrato 3D asíncrono (hoy, el del mundo, `EstadoDeMundo3D`): `en_cola` · `generando` · `cancelando` · `completado` · `fallido` · `cancelado` | QUEUED · PROCESSING · CANCELLING · COMPLETED · FAILED · CANCELLED |
| Sin candidato elegible (`NOT_AVAILABLE` del Router) | NOT_AVAILABLE |

QUOTING, READY, IDLE y RETRYING son del cliente: nadie los guarda.

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

## 4. Error, reintento y cancelación

| Situación | Hoy en `CreatorFlow` | En un trabajo 3D (cuando exista) | Regla |
|---|---|---|---|
| Error con motivo conocido | `humanizeCreatorError`; FAILED | El motivo público del contrato | Nunca la frase del error del proveedor |
| No disponible | `noDisponible` (5 motivos) | Igual + «pendiente de autorización» | Ni proveedor, ni modelo, ni jurisdicción en el texto |
| Faltan Credits | Se sabe al crear; «Conseguir Credits» | Antes de reservar (la puerta del mundo ya lo hace) | WAITING_FOR_CREDITS, nunca FAILED |
| Reintentar | Abre un trabajo nuevo y pierde las respuestas; ⚠ H-3 | Con el MISMO `requestId` si el desenlace es incierto (un request = una generación = un cobro) | RETRYING |
| Cancelar | No existe | Solo honesto antes de llegar al proveedor; después depende de la capacidad (un candidato no cancela; otro solo en cola) y el dinero sigue la regla de la parada | CANCELLING → CANCELLED / COMPLETED |
| Desenlace desconocido | — | Se pregunta por ESA petición; se reconcilia, no se adivina | Nunca se cobra dos veces |

## 5. Por tamaño

Los flujos no cambian con el tamaño; cambia **dónde** se ven (ver [arquitectura](WEE-DESIGN-WORKSPACE-ARCHITECTURE.md) §3):
VALIDATING, QUOTING y WAITING_FOR_CREDITS ocurren siempre en `CreatorFlow`, que es pantalla propia en todos; el resultado vuelve
al lienzo por los trabajos y los materiales. En el teléfono, la caja solo está en la superficie «Lienzo», y elegir algo en la
biblioteca lleva al lienzo.
