# Revisión de fase — seguridad: las direcciones del Storage que llegan de fuera (SSRF)

Rama `seguridad/urls-del-storage`, contra `origin/main` (`b3e2703`). Fecha: 2026-10-06. Proceso:
[docs/REVISION.md](../../../docs/REVISION.md). Misión propia: no toca 3D World (`creator/mundo.ts`, `core/mundo3d.ts`,
`providers/fal.ts`), ni despliega, ni toca producción.

## El fallo (preexistente, en las Functions desplegadas)

Una foto, un documento o un audio llegan a Weë AI por su dirección. La puerta (`assertInputImageUrl` /
`assertAttachmentUrl`) solo exigía que `parseStorageUrl` la entendiera y que la RUTA empezara por `users/<uid>/`, y
devolvía la dirección **tal cual**. `parseStorageUrl` acepta cualquier host con la forma `/v0/b/<cubo>/o/<ruta>`, y el
cubo lo escribe quien escribe la dirección. El lector (`readImage`) probaba el Admin SDK con ESE cubo y, si fallaba
—un cubo que no existe, un objeto que no existe—, la pedía por HTTP con la dirección original; el avatar la pedía por
HTTP siempre.

La ruta de `brainChat`, en `origin/main`:

| Paso | Dónde |
|---|---|
| El campo del cliente: `data.imageUrl` / `documentUrl` / `audioUrl` | `functions/src/creator/brain.ts:321-323` (`brainQuote`, solo cotiza: `:274-276`) |
| La puerta: parsea y mira solo la ruta; devuelve la cadena original | `functions/src/creator/inputs.ts:37-44` (`:40` parse, `:42` ruta, `:43` `return url`); `:52-60` (`:56`, `:58`, `:59`) |
| El lector de la forma: cualquier host con `/v0/b/…/o/…` | `functions/src/engine/http.ts:195-203` (`:198`) |
| Al motor (y a la conversación) | `brain.ts:356` `brainInput(…)` → `:219-232` (`:225-227`); `:428` se guarda; `:491-511` `engine.generate` (`:500`, DeepSeek sin búsqueda) |
| El adaptador | sin búsqueda: `engine/providers/deepseek.ts:146` → `:101-107` → `:104` `readImage`; con búsqueda: `gemini.ts:289-290` → `:178-181` (`:179` `readImage`, `:180` el tipo del contenido que llegue) |
| El sumidero | `engine/http.ts:217-241`: `:225` parse, `:228` `getStorage().bucket(own.bucket)` (cubo del atacante), `:235` «se intenta por HTTP», `:238` `fetchBytes(url)` → `:66-88` → `:70` `fetch(url)` (sigue redirecciones y normaliza `..`) |

**Lo mismo, en las demás puertas que reciben una dirección de la persona:**

| Puerta (desplegada, `ops/produccion.json`) | Camino | Veredicto en `origin/main` |
|---|---|---|
| `brainChat` (`2da2881`) | arriba | **SSRF** (DeepSeek; Gemini con búsqueda, también documento y audio) |
| `brainQuote` (`ced0585`) | `brain.ts:274-276` | solo valida y cotiza: sin salida |
| `creatorChat` (`05ab31b`) | `creator/index.ts:283, 330` → el trabajo; `:249` `imageDimensions` → `engine/imageMeta.ts:104` | sin HTTP, pero el Admin SDK leía el cubo que dijera la dirección (cualquiera legible: uno público de otro) |
| `creatorRun` (`5d87f1f`) | `inputs.ts:106-108` → gemini `:179`, flux `:155`, seedream `:164`, seedance `:176`, deepseek `:104` | **SSRF** |
| `generateVideo` (`7f11d51`) | `creator/video.ts:281-283, 366-367` → `seedance.ts:176`; referencias de vídeo y audio POR URL a BytePlus (`seedance.ts:249-250`) | **SSRF** (fotos) y URL de la persona al proveedor (vídeos, audios) |
| `avatarReplacement` (`bfc622d`) | `generateAvatar.ts:292-293` → `:308-309` → `vertexAI.ts:362-382` (`:372` `fetch(url)`, sin plazo ni tope) | **SSRF directo** (ni siquiera prueba el Admin SDK); el resultado se guarda y se devuelve |
| `generateWorld` (no desplegada) | `creator/mundo.ts:121-143` | ya exigía el cubo propio y reescribía a `gs://` (PR #20) |
| `burnViewOnce` | `social/weetalk.ts:119-122, 191-206` | no descarga: borra solo con host, cubo y clave exactos |
| `publicPostPage`, `reportContent`, `moderationAdmin`, `votePoll`, ËContact, `deleteAsset`, `elements`, `shots`, `productions`, Credits, `nacimientoDeCuenta`, avisos push | — | no reciben direcciones que el servidor descargue |
| `engineAdmin`, `evalRun`, `mediaCanary` | — | solo administración; sin direcciones de la persona |
| `barridoDeLiquidacion`, `materializador` | `fetchBytes(recurso)` | descargan lo que devuelve un PROVEEDOR (respuesta de su API), no la persona |
| `seedanceCallback` | — | guarda el estado, no descarga; `avisoDeProveedor` no está exportada |

**Quién necesita de verdad el HTTP de `readImage`:** solo la entrega firmada de Media Cloud (R2,
`https://<cuenta>.r2.cloudflarestorage.com/…`, que `engine/referencias.ts` mete en `referenceImages`; Media Cloud
no está activo). Los resultados de los proveedores van por `persistRemoteFile`/`fetchBytes`, no por `readImage`.

## Impacto, sin inflarlo

- **Quién:** cualquier cuenta con sesión (App Check está apagado). Las respuestas de Weë Brain sin búsqueda no cobran
  hasta la duodécima; el cupo diario de texto sí cuenta.
- **Qué puede pedir el servidor:** un GET (sin cabeceras propias, sin cuerpo, siguiendo redirecciones) a cualquier
  host y puerto alcanzable desde Cloud Functions, con ruta y consulta a elección (los `..` de la ruta los normaliza
  `fetch`). Requisito: que el Admin SDK falle antes (un cubo u objeto inexistente), trivial; en el avatar, ni eso.
- **Qué NO:** el servidor de metadatos exige `Metadata-Flavor: Google`, que no se manda (403, sin token). No hay
  conector de VPC en el código: nada de la red privada. Un error del host (no 2xx) no vuelve a quien llama: solo queda
  en el registro, saneado.
- **Qué vuelve:** con un 2xx, el cuerpo (entero en memoria antes del tope de 20 MB, hasta 60 s) viaja EN LÍNEA al
  modelo con el tipo que declare la respuesta, y la respuesta del modelo vuelve a la persona: con Gemini (búsqueda
  activada, documento o audio) un texto, HTML o PDF se puede leer y repetir; con DeepSeek, una imagen; en el avatar,
  la imagen editada se guarda y se devuelve.
- **Coste:** las llamadas al proveedor las paga Weë.
- **Precondición:** que el proveedor del adaptador esté configurado (cada adaptador mira su clave antes de leer
  nada; sin clave, modo demo y no se lee). Los registros del repositorio muestran DeepSeek y Gemini en uso en
  producción; no se ha comprobado en producción (prohibido en esta misión).
- **Comprobado de punta a punta contra `origin/main`** (emulador de Storage + Admin SDK de verdad + un «atacante»
  HTTP en esta máquina): por la puerta, saltándose la puerta, con un cubo ajeno y por el avatar, el atacante recibió
  las peticiones y su contenido se devolvió como si fuera la foto.

## El arreglo: UNA regla, en `engine/http.ts`

- `esDireccionDelStorageDeWee` — los hosts del Storage de Weë (la regla que vivía en WeeTalk, ahora en un sitio para
  todos): `gs://`, `https://firebasestorage.googleapis.com/`, `https://storage.googleapis.com/`; `localhost` y
  `127.0.0.1` SOLO con `FIREBASE_STORAGE_EMULATOR_HOST`.
- `nombreDelCuboDeWee` y `objetoDelStorageDeWee` — el cubo de Weë y el objeto al que apunta una dirección, para
  leerlo; otro cubo o una ruta ilegible = `fuera_del_cubo`.
- `direccionDeLaCuenta` — host + cubo + ruta limpia (sin `.`/`..`, segmentos vacíos, control, `\` ni `%` tras
  decodificar) + carpeta de la cuenta, y devuelve la dirección **reescrita** desde esas piezas (`downloadUrlFor` con el
  testigo si parece un testigo, o `gs://` codificado). Para una foto buena es byte a byte la de `getDownloadURL`.
- `assertInputImageUrl` / `assertAttachmentUrl` la usan y devuelven la reescrita, con sus frases de siempre (ni un
  texto nuevo: i18n intacto).
- `readImage`: lo que tiene forma de Storage, SOLO del cubo de Weë y SOLO con el Admin SDK, sin segundo intento por la
  red; lo demás, solo por HTTPS y sin seguir redirecciones (`redirect: 'manual'`: una redirección llega como su 3xx y
  es un fallo). Todo lo que el lector rechaza o no consigue leer —cubo ajeno, HTTP, objeto que no existe, permiso que
  falta, firma caducada, redirección, tope de tamaño— es una entrada inservible: 400, coste cero, nunca «credencial del
  proveedor»; solo lo pasajero (red, 429, 5xx) se puede reintentar.
- `imageDimensions`, del mismo cubo. `vertexAI.urlToBase64` = `readImage`. WeeTalk importa la regla de hosts.

## Puertas

| Puerta | Resultado |
|---|---|
| G0 Higiene | `baseline --solo higiene` pasa; `escaneo-secretos`: ningún secreto (las claves de prueba son `de-prueba-no-es-una-clave`) |
| G1 Build | `tsc` de la app 0 errores; `functions` compila |
| G2 Pruebas | Cadena completa: ver «Resultados» abajo; emulador `urls-del-storage.emulator.mjs` 11/11 (contra `origin/main` fallan 6 de 11) |
| G3 Detectores + baseline | Pasa: 0 NUEVO, 0 REAPARECIDO (251 preexistentes, 150 corregidos, 1 falso positivo) |
| G4 Selector | 11 cambiados, 26 importadores; presupuesto 700 000: todo dentro (435 409). El selector solo daba `functions/package.json` al revisor de seguridad (zona «entrega»): por ser una fase de seguridad se le amplió el alcance a todos los archivos de código cambiados |
| G5 Revisores IA | Seguridad (4), arquitectura (8) y código (6) — abajo, con lo que se hizo con cada uno; y una segunda pasada de código sobre la suite de emulador y los arreglos |
| G6 Verificación | Ningún candidato bloqueante |
| G7 Dueño | Pendiente: las preguntas del final |

## Resultados

- `functions/test/urls-del-storage.test.mjs` (nueva, en la cadena): 58 comprobaciones; contra el compilado de
  `origin/main` fallaban 31 de las 50 primeras (el lector, el adaptador de DeepSeek y el avatar pedían a
  `https://evil.example/…`).
- `functions/test/urls-del-storage.emulator.mjs` (nueva, la corre `_emuladores.mjs`): 11/11; contra `origin/main`
  fallan 6 de 11, con el atacante recibiendo las peticiones.
- Cercas re-ancladas por nombre y tamaño, con su porqué (ninguna aflojada): `video-asincrono` H2 (`http.ts` 26/1 →
  191/24, `imageMeta.ts` nuevo 8/5), `puente-pre-f1d` E4 (lo mismo) y F1 (`DE_LAS_URLS_DEL_STORAGE`: imageMeta,
  weetalk, vertexAI); `f1d-generacion` AE se ESTRECHA (una carga dinámica menos en `vertexAI.ts`). `creator.test.mjs`
  fija el cubo de sus pruebas (`STORAGE_BUCKET`) y el emulador para la dirección del emulador.

## Hallazgos y desenlace

### Seguridad

| Hallazgo | Sev. | Desenlace |
|---|---|---|
| 3D World conserva su propia regla (`resolverImagen`: otro origen del cubo, sin ruta limpia, `gs://` sin recodificar) y `fal.enLinea` solo mira la ruta; dos comentarios quedan desfasados | baja (preexistente) | **Deuda / pregunta al dueño**: fuera de esta misión (no mezclar 3D World). Hoy es seguro porque el lector ya no sale a la red. El comentario de `readImage` ya nombra esa puerta |
| La rama HTTPS de `readImage` seguía redirecciones | baja | **Arreglado**: no se siguen (`redirect: 'manual'`, C7, C9c) |
| Los vídeos y audios de referencia salen a BytePlus con el testigo permanente | baja (preexistente) | **Documentado** en AI-ENGINE.md; URL firmada de vida corta: **pregunta al dueño** |
| Sin el respaldo HTTP, cada foto depende de que la cuenta de ejecución LEA el cubo y de que el cubo de la app sea el del servidor | baja (incierto) | **Comprobación antes de desplegar** (abajo); falla cerrado y reembolsa |

### Arquitectura

| Hallazgo | Sev. | Desenlace |
|---|---|---|
| «Dos lectores de direcciones» (`parseStorageUrl` y `rutaEnElStorageDeWee`): baja en efecto, no en estructura | baja (preexistente) | **Deuda**, con propuesta: un lector PURO en core; E8 impide un tercero |
| `resolverImagen` (3D World) con su propia regla | baja (preexistente) | **Deuda** (ver seguridad) |
| `fal.enLinea` dice usar «la misma regla» y ya no | baja (preexistente) | **Deuda** (fal está cercado por tamaño y es de 3D World) |
| El lector del Content Core acepta cualquier cubo y lanza con un `%` roto (WeeTalk lo hereda) | baja (preexistente) | **Deuda** (`content/index.ts` está cercado; no es regresión) |
| `rutaLimpia` y `esStorageRef` son dos higienes de clave | baja | **Deuda**, va con el lector puro |
| El avatar adopta el lector a medias (rama `data:` muerta, el mismo módulo estático y dinámico) | baja | **Arreglado**: un import estático, `urlToBase64` = `readImage`; AE más estricta |
| AI-ENGINE.md: «las URLs privadas nunca salen» y la tabla de módulos | baja | **Arreglado** |
| El comentario de F1 atribuía a `creator/inputs.ts` una cerca de tamaño que no tiene | baja | **Arreglado** |

### Código

| Hallazgo | Sev. | Desenlace |
|---|---|---|
| Sin el respaldo HTTP, dos supuestos de producción pasan a requisitos (IAM de lectura y el cubo de la app) | media (incierto) | **Comprobación antes de desplegar** (abajo) |
| Un fallo al leer el Storage se apuntaba al proveedor (coste «desconocido», cortacircuitos, `provider_auth_failed`) | baja | **Arreglado**: entrada inservible, 400, coste cero, no es credencial del proveedor (C9b); un fallo pasajero sigue reintentándose (y cuenta en la salud del proveedor, como antes: RUNTIME.md §23.3) |
| 3D World con su propia regla | baja (preexistente) | **Deuda** (ver seguridad) |
| En local, con el `.env` de get-wee y los emuladores, la puerta rechaza todas las fotos (el cubo del emulador es `demo-wee.appspot.com`) | baja | **Arreglado en la documentación**: `.env.example` y AI-ENGINE.md remiten a `npm run web:demo` |
| `vertexAI.ts` con el mismo módulo estático y dinámico | baja | **Arreglado** |
| `'ajena'` con dos significados | baja | **Arreglado**: el lector dice `fuera_del_cubo` |
| (segunda pasada) La rama HTTPS y los topes de tamaño no pasaban por el 400: una firma caducada sería `provider_auth_failed`, y una redirección o un fallo de red, un desenlace «desconocido» (con el Core asíncrono, sin reembolso) | baja | **Arreglado**: todo por la entrada inservible; la redirección con `redirect: 'manual'` (su 3xx, no reintentable) y la red, reintentable (C9c); `fetchJson` respeta también la opción |
| (segunda pasada) Un fallo PASAJERO del Storage sigue contando en el cortacircuitos del proveedor del intento | baja | **Deuda / pregunta**: arreglarlo es tocar el Router (cercado), fuera de esta misión; igual que antes con el respaldo HTTP (RUNTIME.md §23.3) |
| (segunda pasada) El comentario de `creator/mundo.ts:124-126` describe el lector de antes | baja | **No tocado** (3D World fuera de la misión): va con la tarea de la puerta 3D |
| (segunda pasada) La suite de emulador | — | Sin hallazgos (el control B6 hace que las comprobaciones de «ningún golpe» no estén vacías) |

## Lo que espera al dueño (G7)

1. **Antes de desplegar**, en get-wee y en solo lectura: que la cuenta de ejecución de las Functions tenga
   `storage.objects.get` sobre `gs://get-wee.firebasestorage.app`; que `STORAGE_BUCKET` no esté en su entorno (o sea
   ese cubo); y que la variable de GitHub `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` sea `get-wee.firebasestorage.app`.
   Después, humo con una cuenta de prueba: Weë Brain con una foto propia y un reemplazo de avatar.
2. **Desplegar JUNTAS** todas las funciones que llevan la puerta o el lector (Guardian: 18 vivas en su cierre;
   imprescindibles `brainChat`, `brainQuote`, `creatorChat`, `creatorQuote`, `creatorRun`, `generateVideo`,
   `avatarReplacement` y `burnViewOnce`): cada servicio lleva su copia de `lib`, y mientras una siga en la revisión
   vieja el hueco sigue abierto en ella.
3. ¿Una tarea propia para llevar la regla común a 3D World (`resolverImagen`), a `fal.enLinea` y al lector del
   Content Core, y bajar la parte pura a core? Toca las cercas de core (H3/F3) y el espejo de DD-05.
4. ¿Los vídeos y audios de referencia siguen saliendo con el testigo permanente, o con una URL firmada de vida corta?
5. ¿La rama HTTPS de `readImage` se limita ya a los hosts de entrega configurados, o se deja así hasta encender Media
   Cloud?
6. ¿La propiedad se comprueba solo en las puertas, o el lector debe recibir también la cuenta?
7. Un fallo PASAJERO del Storage sigue contando en la salud del proveedor del intento: ¿marcador propio para lo
   anterior al POST (RUNTIME.md §23.3)?
8. Las cercas re-ancladas (video-asincrono H2, puente-pre-f1d E4/F1) y la estrechada (f1d-generacion AE): por nombre y
   tamaño, con su porqué, como pedía la misión.
