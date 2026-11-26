# Weë Identity Transformation Engine (WITE) · Transform Your Identity en Weëls

Estado al 2026-11-26. Rama local `ui/rediseno-home-burger` (worktree `wt-rediseno-home-burger`), **sin commit ni despliegue**.

## 1. Qué es

Una persona se graba, sube el vídeo a Weëls, elige uno de **sus** personajes (un Perfil Weë de su cuenta) y Weë intenta
sustituir su apariencia completa —rostro, cuerpo, cabello, aspecto y, si lo pide, la ropa— conservando la escena, a las
demás personas y el audio original. El resultado se revisa y **solo se publica si la persona lo decide**, desde el
compositor de Weëls de siempre.

## 2. Arquitectura

```
App (TransformarIdentidadScreen)
  │ 1. sube el original → Storage  users/{cuenta}/identity-sources/   (reglas: solo mp4/mov ≤ 200 MB, de la cuenta)
  │ 2. generateVideo({ transformarIdentidad: { accion, … } })
  ▼
generateVideo  (la ÚNICA puerta del vídeo; ya tiene la clave de ModelArk)
  └─ atenderTransformacion  (functions/src/wite)
        · puerta aiSettings/identityTransform  (cerrada por defecto, lista de cuentas)
        · Character Identity Resolver → Perfil Weë de la cuenta + retrato en su Storage
        · consentimiento (dos afirmaciones) y permisos visual / voz, por separado
        · trabajo identityTransformJobs/{wite_<requestId>}  (QUEUED → ANALYZING → TRANSFORMING → QUALITY_CHECK → COMPLETED)
        · original → ficha en Content Core (assetId determinista)
        · porVideo(…) = vuelve a entrar en generateVideo con la misma sesión
              → interruptor del vídeo → ruta → tarifa oficial → cupo → reserva de Credits
              → Weë Video Engine → adaptador Seedance → ModelArk (omni_reference_task_type "edit")
              → resultado en Storage + ficha en Content Core → completeCredits / refundCredits
        · linaje: resultado.provenance.sourceAssetIds = [original], jobId, metadata.sintetico
  ▼
App: sigue el trabajo en vivo (onSnapshot), enseña antes/después, «Usar este video» → decidir('aceptado')
     → compositor de Weëls con el resultado puesto (videoAssetId) → la persona publica
```

Lo que **no** se creó: ninguna Function nueva, ningún secreto montado de más, ningún router ni cola paralelos, ninguna
biblioteca de personajes, ningún sistema de Credits ni Media Core paralelo, nada en el Core Runtime (regla 10). La app no
habla con ningún proveedor.

## 3. Archivos

Creados:
- `functions/src/wite/modelo.ts`: estados, transiciones, puerta, validación, las 16 etapas con su estado real y la calidad automática.
- `functions/src/wite/personajes.ts`: Character Identity Resolver, con los permisos visual y de voz por separado.
- `functions/src/wite/index.ts`: el orquestador (acciones `personajes`, `cotizar`, `ejecutar`, `cancelar`, `decidir`).
- `functions/test/wite.test.mjs`: 68 comprobaciones, añadidas a `npm test`.
- `services/witeService.ts`, `screens/TransformarIdentidadScreen.tsx`, `constants/transformarIdentidad.ts`.
- `docs/WITE.md` (este archivo).

Modificados:
- `functions/src/creator/video.ts`: rama `data.transformarIdentidad`, como la del lote.
- `functions/src/creator/prompts.ts`: `promptDeSustitucionDeIdentidad`. Solo admite valores cerrados.
- `functions/src/engine/providers/seedance.ts`: **corrección** del modo edit. La documentación de ModelArk exige `ratio: adaptive`; antes se enviaba `16:9` y BytePlus habría rechazado la tarea.
- `functions/src/content/index.ts`: `anotarOrigenDelDerivado`. Solo enlaza material de la misma cuenta.
- `functions/src/cuenta/borrado.ts`: eliminar la cuenta borra también `identityTransformJobs`.
- `firestore.rules`: `identityTransformJobs` se lee solo desde la cuenta dueña y nunca se escribe desde la app.
- `storage.rules`: carpeta `identity-sources`.
- `navigation/MainStackNavigator.tsx` y `App.tsx`: ruta `TransformarIdentidad`, en la web `/weels/transformar`.
- `screens/CreateScreen.tsx`: entrada en el compositor de Weëls, oculta por el flag.
- `i18n/textos/*/weels.ts` (42 idiomas, 67 claves `wite*`, sin revisión nativa salvo es y en) e `i18n/huella.json`.
- `functions/package.json`: la suite nueva dentro de `npm test`.

## 4. BytePlus: lo verificado documentalmente

Fuentes: [Create a video generation task](https://ai.byteplus.com/ark/region:ap-southeast-1/docs/create-video-generation-task-api),
[Portrait assets guide](https://ai.byteplus.com/ark/region:ap-southeast-1/docs/seedance-portrait-asset-guide),
[Upload real-person portrait assets](https://ai.byteplus.com/ark/region:ap-southeast-1/docs/upload-real-person-portrait-assets),
[Model pricing](https://ai.byteplus.com/ark/region:ap-southeast-1/docs/model-pricing).

| Pregunta | Seedance 2.5 (`dreamina-seedance-2-5-260628`) | Seedance 2.0 / fast / mini |
|---|---|---|
| ¿Acepta vídeo original? | Sí, `reference_video` hasta 10 clips de 2–30 s cada uno (4–30 s para editar), 30 s en total, mp4/mov, ≤ 200 MB, 24–60 fps | Sí, hasta 3 clips de 2–15 s, 15 s en total |
| ¿Imagen de referencia del personaje? | Sí, hasta 30 `reference_image` | Sí, hasta 9 |
| ¿Editar un vídeo dado? | Sí, `omni_reference_task_type: "edit"`: «edita lo visual o el audio de un vídeo original»; exige `ratio: adaptive` y `duration: -1` | Documentado para la serie; en Weë figura como «no verificado» |
| ¿Sustituye el cuerpo entero por el de una imagen? | **No documentado.** Los ejemplos oficiales son cambios locales (colores, quitar personas, proporción) | Igual |
| ¿Conserva actuación, escenario y a los demás? | **No documentado** como garantía; «lo no mencionado no cambia» aparece en la guía de prompts | Igual |
| ¿Identidad estable entre fotogramas? | No documentado | No documentado |
| ¿Varias personas? | No documentado; un ejemplo pide quitar a todos menos al protagonista | Igual |
| ¿Audio? | `generate_audio` (genera sonido sincronizado); admite `reference_audio`. **No dice** si conserva el audio original al editar | Igual |
| ¿Lip sync / voz? | No se nombra ninguna función | No |
| ¿API oficial? | Sí, ModelArk, solo con API Key; tarea asíncrona; `callback_url` con 3 reintentos | Sí |
| ¿Habilitado en nuestra cuenta? | **No comprobado desde aquí**: las claves no se leen desde Claude y no hay autorización de gasto | Igual |
| **Rostros reales** | **Rechaza** imágenes y vídeos de referencia con caras reales, salvo que sean activos de persona real autorizados (`asset://<id>`) | Igual |

**El bloqueo principal.** Una grabación de una persona real contiene una cara real, y ModelArk la rechaza como
referencia. La única vía documentada es el **activo de persona real autorizado**:

1. La cuenta de Weë hace la verificación de empresa.
2. Crea un grupo de activos y genera un código QR.
3. La persona **escanea el código con su propia cuenta de BytePlus** y pasa la verificación de persona real.
4. Se suben sus materiales; se comprueba que la cara coincide.
5. Weë acepta el activo en la consola y el activo queda `Active`.

La documentación no ofrece ninguna API para hacer este trámite en nombre de los usuarios de una plataforma. Mientras eso
no cambie, la transformación de grabaciones reales queda **BLOCKED** en el proveedor. La única salida es tramitarlo con
BytePlus como empresa (ver el expediente de proveedores).

La imagen del personaje también puede activar la moderación de caras si es fotorrealista. Solo se confía en las salidas
del propio ModelArk de la misma cuenta durante 30 días, por ejemplo una cara hecha con Seedream 5.0. Los retratos de Weë
salen de Gemini.

**Costes.** Precio por millón de tokens con vídeo de entrada, 480p/720p:

| Modelo | USD por millón de tokens |
|---|---|
| Seedance 2.5 | 6,40 |
| Seedance 2.0 | 4,30 |
| 2.0 fast | 3,30 |
| 2.0 mini | 2,10 |

Los tokens se calculan como (s de entrada + s de salida) × ancho × alto × fps / 1024. Hay un mínimo de tokens cuando se
manda vídeo (el valor está en hojas externas) y solo se cobran las tareas que terminan bien.

Weë cotiza con su tarifa oficial ya existente (`aiPricing.ts`) y la regla R22: con vídeo de entrada se cobra el techo del
modelo, que en 2.5 son 30 s de entrada y 30 s de salida. Para un Weël de 8 s esto **sobreestima**, y hoy se liquida el
importe reservado, no el consumo real (`usage.completion_tokens`). Ajustarlo es una decisión del dueño (C-05 / DX-04).

**No se hizo ninguna llamada real a BytePlus.** No se leen claves, no hay autorización de gasto y existe la restricción
de caras reales. No hay costes observados.

## 5. Las 16 etapas: qué hace cada una hoy

Fuente única: `ETAPAS_DE_WITE` en `functions/src/wite/modelo.ts`.

| Etapa | Estado | Qué la hace o qué le falta |
|---|---|---|
| Media Ingestion | operativa | Original en Storage y su ficha en Content Core |
| Video Analysis | operativa | Tipo y tamaño reales del archivo; la duración la declara el cliente y se acota |
| Subject Detection | **bloqueada** | Sin modelo integrado: la persona elige la posición del protagonista |
| Subject Tracking | en proveedor | Dentro de la edición de Seedance, sin medida propia |
| Video Segmentation | **bloqueada** | Sin modelo integrado |
| Motion Extraction | en proveedor | Implícita en la edición |
| Character Identity Resolver | operativa | Perfil Weë de la cuenta y su retrato |
| Character Renderer | en proveedor | Seedance 2.5 edit con @imagen1 |
| Environmental Integration | en proveedor | Según la instrucción; sin verificar |
| Temporal Consistency | en proveedor | Sin medida propia |
| Audio Identity Engine | **bloqueada** | No hay voz por personaje; ElevenLabs en Weë solo hace TTS |
| Lip Sync | **bloqueada** | Ningún adaptador lo ofrece |
| Compositing | en proveedor | La edición devuelve el vídeo compuesto |
| Quality Engine | operativa (mínima) | Hay vídeo, hay ficha, no es muestra, la duración coincide; además revisión humana obligatoria |
| Rendering | en proveedor | ModelArk; Weë lo guarda en su Storage |
| Asset Registration | operativa | `sourceAssetIds = [original]`, `jobId`, `metadata.sintetico` |

Los estados TRACKING, AUDIO_PROCESSING, COMPOSITING y RENDERING existen en el contrato, pero **no se pintan**: no hay
ningún trabajo separado que corresponda a ellos. Así no se simula progreso.

## 6. Seguridad, consentimiento y procedencia

- **Personajes:** solo los Perfiles Weë de la propia cuenta, comprobados con `cuentaDeIdentidadLeida`. Weë no tiene modelo de cesión o licencia de personajes, así que los personajes de otros creadores **no se listan ni se aceptan**.
- **Permisos:** el visual exige un retrato en el Storage de la cuenta. La voz es `no_disponible` para todos y la petición con «voz del personaje» se rechaza con su motivo.
- **Consentimiento:** dos afirmaciones obligatorias, registradas en el trabajo con su fecha: «soy la persona transformada» y «los demás no deben cambiar». No sustituyen la verificación de persona real que exige BytePlus.
- **Original:** se conserva intacto. El resultado es otro material, enlazado al original.
- **Publicación:** nunca automática. Sigue este orden:
  1. La persona acepta el resultado (`decidir`).
  2. Se abre el compositor de Weëls con el vídeo puesto.
  3. La persona publica desde ahí.
- **Muestras del modo demo:** se ven, pero no se pueden aceptar.
- **Pendiente:** no hay etiqueta de contenido sintético en la publicación que el servidor obligue a poner. `aiTools` lo escribe el cliente y las reglas no lo protegen; el material sí queda marcado. Hace falta decidir una etiqueta visible obligatoria como la de «Personaje Weë».

## 7. Asíncrono, reintentos y dinero

- **Asíncrono para la persona:** el progreso llega por el trabajo y la app no espera una respuesta para pintarlo.
- **No asíncrono en el servidor:** la edición corre dentro de `generateVideo` (25 min), con el sondeo de siempre. El único camino de aceptación asíncrona de Weë es el Core Runtime, y llevar allí una tercera capacidad exige autorización explícita (regla 10).
- **Idempotencia:**
  - `requestId` → `wite_<requestId>` (trabajo).
  - `wite-<requestId>` (Credit Engine y proveedor).
  - `asset_wite_src_<…>` (original).
  - Repetir una petición nunca crea un segundo trabajo ni un segundo cobro.
- **Fallos:** la puerta del vídeo devuelve la reserva si falla el proveedor o el motor (`refundCredits`). Un trabajo sin desenlace pasado el plazo de la puerta se cierra como `abandoned` cuando se vuelve a pedir; el dinero lo resuelve la regla existente de reservas colgadas.
- **Cancelar:** solo antes de llegar al proveedor (QUEUED o ANALYZING). Después se dice que no se puede.
- **Límites:** el cupo diario de vídeo de siempre (`limits.video`).

## 8. Activación (nada está activado)

1. Desplegar las reglas de Firestore y de Storage y `generateVideo`. Producción solo con confirmación explícita del dueño.
2. Resolver con BytePlus el acceso a activos de persona real para usuarios de la plataforma. **Sin esto, la transformación de grabaciones reales no funciona.**
3. `aiSettings/global.videoHabilitado = true` (interruptor del vídeo existente).
4. `aiSettings/identityTransform = { abierto: true, cuentas: ['<uid de prueba>'] }`.
5. `TRANSFORMAR_IDENTIDAD_EN_WEELS = true`, para que se vea la entrada en el compositor.
6. Una tarea real canario con un vídeo propio autorizado, midiendo `providerCost` en `aiGenerations`.

### 8.1 Caras reales: el activo de persona real autorizado (preparado 2026-11-26)

El dueño autorizó usar su cara real (2026-11-26). Eso no desbloquea BytePlus: el filtro lo aplica ModelArk y solo lo
levanta su propio trámite. Pasos:

1. **En la cuenta de empresa de BytePlus.** Requiere verificación de empresa o de persona real. Ruta: Model Playground → *My assets* → *Real-human* → *Add real-human assets* → crear un grupo, fijar la validez de la autorización y aceptar las reglas → generar el QR.
2. **La persona (el dueño)** escanea el QR con **su** cuenta de BytePlus, acepta las reglas de datos faciales y pasa la verificación de persona real.
3. **Se sube a ese grupo el MISMO vídeo** que se subió a Weëls. BytePlus comprueba que la cara coincide. La cuenta de empresa acepta el activo y queda `Active`; se anota su `asset://<id>`.
4. **En Firestore**, `aiSettings/identityTransform`:
   ```
   { abierto: true, cuentas: ['<uid>'], modelo: 'SEEDANCE_2_0_MINI',
     activosDePersonaReal: { '<uid>': { '<nombre del archivo en users/<uid>/identity-sources/>': 'asset://<id>' } } }
   ```
5. **WITE manda ese `asset://` como @video1** en lugar de la URL de Weë.
   - La puerta del vídeo solo lo acepta si se lo pasa WITE por dentro, para esa cuenta y ese archivo. La app no puede.
   - El original de Weë se sigue conservando, y el audio se restaura desde él.
   - El activo usado queda registrado en `consentimiento.activoDePersonaReal` del trabajo.

**Límite:** cada vídeo nuevo exige subirlo otra vez al grupo de activos, a mano, en la consola. Sirve para el canario del
dueño, no para usuarios. Para ellos hace falta que BytePlus ofrezca una vía empresarial o una API. La imagen del personaje
puede activar también la moderación si es fotorrealista: si pasa, se genera con Seedream en la misma cuenta, cuyas salidas
son de confianza durante 30 días.

## 9. Estado final

| Funcionalidad | Estado |
|---|---|
| Interfaz en Weëls (subir, personaje, sujeto, ajustes, audio, precio, consentimiento, progreso, revisión, publicar a mano) | IMPLEMENTED BUT NOT VERIFIED (maqueta vista a 320, 390 y 1440 px sin sesión; flujo con datos no recorrido porque los emuladores siguen en la IP antigua) |
| Subida del original y conservación | IMPLEMENTED BUT NOT VERIFIED (reglas sin desplegar) |
| Character Identity Resolver (propios) y permisos visual/voz separados | IMPLEMENTED AND VERIFIED (pruebas) |
| Personajes compartidos o de otros creadores | NOT IMPLEMENTED (no existe modelo de cesión en Weë) |
| Selección del protagonista | PARTIALLY IMPLEMENTED (elección manual por posición; sin detección) |
| Trabajo, estados, idempotencia, cancelación, decisión | IMPLEMENTED AND VERIFIED (pruebas con Firestore de mentira) |
| Cotización y reserva/liquidación de Credits | IMPLEMENTED BUT NOT VERIFIED (reutiliza el Credit Engine y la tarifa oficial; se liquida lo reservado, no el consumo real) |
| Transformación real con Seedance edit | BLOCKED (rostros reales: hace falta el activo autorizado; sin llamada real ni gasto autorizado) |
| Corrección `ratio: adaptive` en Seedance edit | IMPLEMENTED AND VERIFIED (pruebas) |
| Audio original | IMPLEMENTED BUT NOT VERIFIED (la documentación no dice si la edición lo conserva) |
| Voz del personaje y lip sync | BLOCKED (sin perfiles de voz, sin conversión de voz, sin lip sync) |
| Detección, tracking y segmentación propios | BLOCKED (sin modelos integrados) |
| Calidad automática | PARTIALLY IMPLEMENTED (comprobaciones básicas y revisión humana) |
| Linaje y procedencia en Content Core | IMPLEMENTED BUT NOT VERIFIED |
| Etiqueta sintética obligatoria en la publicación | NOT IMPLEMENTED (decisión pendiente) |
| Notificación al terminar | NOT IMPLEMENTED (no existe aviso de trabajos en Weë) |
| Webhook asíncrono | NOT IMPLEMENTED (regla 10) |
| Vídeos de referencia de prueba (15 escenarios) | NOT IMPLEMENTED (necesitan tareas reales y personas que consientan) |

**No está listo para producción.** Las dependencias críticas son el acceso a activos de persona real en BytePlus, el gasto
autorizado para el canario, el despliegue de reglas y función, y la decisión sobre la etiqueta sintética.
