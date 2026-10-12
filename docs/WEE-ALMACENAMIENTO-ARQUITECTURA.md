# Weë · arquitectura de almacenamiento: qué existe, qué se decidió, qué cuesta

Ronda R9 · línea C (persistencia y coste) · rama `r9/pc-persistencia` · base `42663be5` · auditoría del 2026-10-12.
Solo lectura de la arquitectura: **no cambia producción, reglas remotas, proveedores activos ni tarifas.** Las
recomendaciones de producción del §5 son una PROPUESTA que necesita la autorización del dueño.
Complemento: [`WEE-ALMACENAMIENTO-Y-COSTE.md`](WEE-ALMACENAMIENTO-Y-COSTE.md) (guardado local, Weë Cloud, coste de Firestore).

Leyenda: **CONECTADO** (lo usa una Function exportada o el cliente en un flujo real) · **DESPLEGADO** · **SOLO PROBADO**
(código y pruebas, nadie lo llama) · **DECLARADO** (interfaz o documento, sin implementación).

---

## 1. Qué existe DE VERDAD en el código

### 1.1 Media/Asset Layer y Media Cloud (servidor)

| Pieza | Evidencia | Estado |
|---|---|---|
| **Storage Port** `PuertoDeAlmacenamiento`: `guardar` (con `siNoExiste`), `mirar`, `borrar` (con generación); opcionales `urlFirmada` (`:348`), `urlDeSubida` (`:359`), `listar` (`:368`); `traer` y `copiar` solo declarados (`:373-375`) | `functions/src/core/media/puerto.ts:312-376`; capacidades `:35-77`; errores `falloDeAlmacen` `:404` | IMPLEMENTADO como contrato · SOLO PROBADO |
| **Registro de proveedores de medios** (READY / UNVERIFIED / DISABLED; guarda nombres de variables de credenciales, nunca las credenciales) | `functions/src/core/media/registro.ts:108`; elección `proveedorParaGuardar` `:150-156` = el único proveedor configurado si puede `object.put` (sin router a propósito, `:140-149`) | SOLO PROBADO |
| **Catálogo vivo**: un solo proveedor, R2; adaptador por id; `MEDIA_PROVIDER` o `r2` por defecto | `functions/src/media/catalogo.ts:17-29` | SOLO PROBADO |
| **Adaptador R2** (SigV4 escrito a mano en `media/firma.ts`; put/head/delete + signedUrl, upload, get, list) | `functions/src/media/r2.ts:204`; descriptor READY desde 2026-09-21 tras un canary real autorizado (`:95-110`) | READY · usado SOLO por `mediaCanary` |
| **Proveedor falso** (pruebas) | `functions/src/media/falso.ts:72` | pruebas |
| **Puerto sobre el Storage de Weë (Firebase)**: solo head, delete, conditionalDelete; `guardar` devuelve `no_configurado` | `functions/src/content/indice-almacen.ts:185-193` | IMPLEMENTADO · detrás de la puerta CERRADA `aiSettings/almacenActivos` (`docs/ACTIVOS-INDICE.md:5`) |
| **Guardar material por el puerto** (`guardarMaterial`: proveedor → adaptador → objeto + ficha `mediaObjects`, idempotente) | `functions/src/media/index.ts:81-92` | SOLO PROBADO |
| Subida directa, entrega (`solicitarEntrega` + política de vigencia), proceso, recolección, reconciliación, migración | `functions/src/media/{subida,entrega,proceso,recoleccion,reconciliacion,migracion}.ts`; vigencia `core/media/entrega.ts:65` | SOLO PROBADO (`media-*`) |
| Medición de uso y **estimador de coste sin tarifas** | `functions/src/media/uso.ts`, `functions/src/media/optimizador/coste.ts:3-24` | SOLO PROBADO; sin tarifa → `sin_tarifa` |
| **Exportado desde `functions/src/index.ts`** | solo `mediaCanary` (`functions/src/index.ts:184`), administración (`media/canary.ts:9`) | DESPLEGADO (canary) |
| `functions/src/runtime/almacen.ts` | Es el **JobStore** de trabajos y ejecuciones en Firestore (`:20-30`), no un almacén de bytes | — |

**Conclusión:** la arquitectura propia (puerto + registro + adaptador R2 + entrega con URLs firmadas + medición) está
construida y probada, pero **ningún flujo de usuario pasa por ella**. Lo confirman `docs/MAPA-DE-FRONTERAS.md:24`
(«solo `mediaCanary` está exportada») y `docs/INTEGRACION-FLUJO-E2E.md:317-330` («Media Cloud AISLADO»).

### 1.2 Quién guarda bytes HOY y cómo (los caminos reales)

| Qué | Dónde | Evidencia | URL de acceso |
|---|---|---|---|
| Publicaciones (imagen, vídeo, audio, blobs) | **Cloudinary**, preset sin firmar `hidetok-simple`, cloud `dnrj1guvs` | `services/cloudinaryService.ts:4,11-12,148-295`; `services/storageService.ts:2-8` («All uploads go through Cloudinary») | pública de Cloudinary, con transformaciones por URL (`cloudinaryService.ts:80-116`) |
| Foto de vista única de WeeTalk | Firebase Storage (excepción porque Cloudinary no se puede borrar desde Weë) | `storageService.ts:110-126`; borrado `functions/src/social/weetalk.ts:315-319` | `getDownloadURL` (token permanente) |
| Fotos para Weë AI (`creator-inputs`) | Firebase Storage `users/{uid}/creator-inputs` | `services/creatorUploads.ts:59-67`; reglas `storage.rules:88` | `getDownloadURL` |
| Avatar del Perfil Weë | Firebase Storage | `services/avatarGenerationService.ts:2,165`; `functions/src/vertexAI.ts:347-354` | token permanente |
| Resultados de IA (imagen, vídeo, audio) | Firebase Storage `users/{uid}/ai-generations/…` | `functions/src/engine/http.ts:168-196` (`saveGeneratedFile`); `functions/src/content/materializador.ts:40-41,164-169` | `firebaseStorageDownloadTokens` (token permanente, no caduca) |
| Fichas de material (`assets`) | Firestore + `storageRef` con proveedor `wee`; las antiguas apuntan a Cloudinary | `functions/src/content/index.ts:58-72,181` | `delivery.url` guardada |
| Proyectos locales | Dispositivo (carpeta WEE / OPFS) + metadatos en AsyncStorage | `services/almacenLocal/**`, `utils/catalogoLocal.ts` | ninguna (no hay copia remota) |

`getSignedUrl` no se usa en ningún sitio de `functions/src`. Las URLs vivas son **tokens permanentes de Firebase** o
**públicas de Cloudinary**; las URLs firmadas con caducidad solo existen en el adaptador R2 sin conectar.

### 1.3 Credit Engine

No hay ninguna integración entre almacenamiento y Credits: ningún servicio de almacenamiento en `CREDIT_COSTS`
(`functions/src/credits/creditCosts.ts:20-72`), y el estimador de medios no convierte a Credits por diseño
(`coste.ts:19-23`). El flujo previsto está en `WEE-ALMACENAMIENTO-Y-COSTE.md` §2.3.

---

## 2. Decisiones anteriores documentadas

| Decisión | Fuente | ¿Implementada? |
|---|---|---|
| Local por defecto; Weë Cloud opcional y pagado con Credits; sin planes ni suscripciones; local ≠ sincronización | `docs/LOCAL-FIRST-AUDITORIA.md:7` (2026-10-08) | Lo local SÍ. Weë Cloud NO (`:79` «DEFERIDOS»; solo el campo `respaldo: 'ninguno'`) |
| Publicar desde un archivo local: DEFERIDO, con «quién paga ese almacenamiento» abierto | `docs/LOCAL-FIRST-AUDITORIA.md:80` | No |
| Alcance de MC-1: registro de proveedores, puerto, adaptador R2, `mediaObjects`, claves por cuenta, proveedor falso, integración mínima con F11; «F11 sigue siendo la fuente de verdad del material»; «no se construye un segundo sistema de nada» | `docs/RUNTIME.md:2065-2076` | Construido y probado; **no conectado** (`docs/DECISIONES-DELIBERADAS.md:52`, commit `53d56ea`: «Nada conectado») |
| R2 es READY y solo lo usa Media Cloud; ningún cliente usa R2 | `functions/src/media/r2.ts:95-110`; `docs/SECURITY.md:186-198` | Sí (solo canary) |
| Las publicaciones siguen en Cloudinary; cambiarlo es decisión del dueño | `docs/MEDIOS-OPTIMIZADOR.md:23` | Es el estado actual |
| Cloudinary «No recomendado» como derivador propio porque «los medios se quieren mover a Weë Storage» | `docs/MEDIOS-OPTIMIZADOR.md:283` | Intención, no decisión ejecutada |
| Migración de publicaciones de Cloudinary a Weë Storage: DEFERIDO | `docs/MEDIOS-OPTIMIZADOR.md:397` | No |
| No se ha migrado ni tocado Cloudinary; Weë no tiene el secreto de administración de Cloudinary | `docs/F11-MIGRACION.md:38,87` | — |
| Subidas firmadas a Cloudinary: trabajo futuro | `docs/F11-MIGRACION.md:160` | No |
| `content/index.ts` es el único sitio con los nombres `wee` y `cloudinary`; si un almacén no puede borrar, se anota `pendingPhysicalDeletion` | `docs/CORE.md:1094,1114` | Sí |
| Reglas de Storage contra sobrescritura | `docs/ACTIVOS-POLITICA-STORAGE.md:5` («IMPLEMENTADO y PROBADO… PREPARADO-NO-DESPLEGADO») | Local sí; producción espera la decisión D-D |
| «Resultados en Storage/Cloudinary con URLs firmadas» | `docs/CREATOR-ARQUITECTURA.md:197` | **No**: se usan tokens permanentes |
| El preset `hidetok-simple` no se renombra sin migración | `CLAUDE.md:55`, `docs/DECISIONES-PENDIENTES.md:43` | Sí |

**Sobre «se decidió no depender de Cloudinary»:** en el repositorio **no hay ninguna decisión escrita** con ese
contenido. Lo más cercano es la intención de `docs/MEDIOS-OPTIMIZADOR.md:283` y el aplazamiento de `:397`, más la
regla general de no atarse a un proveedor (`CLAUDE.md`, WEË AI ENGINE; `docs/RUNTIME.md:2076`). Si el dueño lo
decidió, conviene escribirlo como decisión con fecha. **No existe ningún documento MC-0** separado aunque
`docs/RUNTIME.md:2068` lo cite. No se encontró ninguna decisión sobre CDN, Bunny, Backblaze B2 ni S3.

---

## 3. Qué contradice la arquitectura y qué le falta al motor propio

**Contradicciones con la arquitectura escrita:**

1. Las **publicaciones suben directamente a Cloudinary desde el cliente** con un preset sin firmar
   (`cloudinaryService.ts:148,213,246`): no pasan por el puerto, ni por `mediaObjects`, ni por la propiedad de la cuenta;
   y Weë no puede borrarlas (`storageService.ts:2-4`, `docs/CORE.md:1114`).
2. El cliente y varias Functions **llaman a Firebase Storage directamente** (`creatorUploads.ts`, `avatarGenerationService.ts`,
   `engine/http.ts:168-196`, `vertexAI.ts:347-354`, `content/materializador.ts`, `content/versiones.ts`) en vez de usar el puerto.
3. **URLs permanentes** (tokens de Firebase, públicas de Cloudinary) donde la arquitectura pide entrega firmada con vigencia
   (`core/media/entrega.ts:65`, `docs/CREATOR-ARQUITECTURA.md:197`).
4. **Sin miniaturas entregables**: la rejilla de Mis creaciones baja originales (`services/assetsService.ts:115-152`).

**Qué le falta al motor propio para ser el backend real** (interfaz existente → pieza ausente):

| Interfaz que ya existe | Qué falta |
|---|---|
| `PuertoDeAlmacenamiento.guardar` | Un adaptador de **Firebase/GCS** que implemente `guardar` (hoy `no_configurado`, `indice-almacen.ts:191-193`), o conectar R2 |
| `urlDeSubida` / `urlFirmada` | Implementarlas para el proveedor elegido (R2 ya las tiene; Firebase necesitaría `getSignedUrl`) |
| `solicitarEntrega` (`media/entrega.ts:184-206`) | Exportarla como callable y que el cliente pida URLs en vez de guardarlas |
| `guardarMaterial` (`media/index.ts:81`) | Que el materializador y `saveGeneratedFile` llamen al puerto en vez de al bucket |
| Variantes en el Content Core | Entrega propia de cada variante (miniaturas) |
| Registro con un proveedor | Un segundo descriptor si se quiere más de uno; hoy no hace falta |
| — | Una Function de subida de publicaciones por el puerto que sustituya al preset sin firmar de Cloudinary |
| — | Migración de las URLs antiguas (preparada y **no ejecutada**, `docs/F11-MIGRACION.md`) |

---

## 4. Comparativa de coste (precios oficiales consultados el 2026-10-12)

Precios de lista en USD, clase estándar, sin impuestos. Fuentes al final. «no verificado» = no confirmado en la página oficial.

| Proveedor | Almacenamiento | Salida a internet (primer tramo) | Escrituras | Lecturas | Capa gratuita | Mínimos / notas |
|---|---|---|---|---|---|---|
| **Google Cloud Storage** Standard (us-central1, us-east1, us-west1, europe-west1) | 0,020 $/GiB-mes (us-east4 0,023; multirregión US 0,026) | 0,12 $/GiB (0–10 TiB) | 0,005 $ / 1.000 (clase A) | 0,0004 $ / 1.000 (clase B) | 5 GB-mes, 5.000 A, 50.000 B, 100 GB de salida desde Norteamérica; solo us-east1/us-west1/us-central1 | Sin duración mínima en Standard |
| **Firebase Storage** (Blaze) | cubo `*.firebasestorage.app` = precio GCS; cubo heredado `*.appspot.com` 0,026 $/GB | GCS / 0,12 $/GB | GCS / 0,05 $ por 10.000 subidas | GCS / 0,004 $ por 10.000 descargas | `.firebasestorage.app`: 5 GB-mes, 100 GB/mes de descarga, 5.000 subidas y 50.000 descargas/mes; `.appspot.com`: 5 GB, 1 GB/día, 20.000 subidas/día, 50.000 descargas/día | Firebase Storage **es** GCS |
| **Cloudflare R2** Standard | 0,015 $/GB-mes, todas las regiones | **0 $** | 4,50 $ / millón | 0,36 $ / millón | 10 GB-mes, 1 M clase A, 10 M clase B al mes | Sin duración mínima en Standard (Infrequent Access: 30 días) |
| **Backblaze B2** | «desde 6,95 $/TB-mes» (≈ 0,00695 $/GB; por GB **no verificado**) | gratis hasta 3× el almacenamiento medio, luego 0,01 $/GB; gratis hacia socios CDN (Cloudflare, Fastly, bunny.net…) | gratis (clase A) | gratis (clases B y C) | 10 GB siempre | Mínimo mensual **no verificado** |
| **Bunny Storage + CDN** | HDD 1 región 0,01 $/GB (2 regiones 0,02; SSD 0,02 por región) | Storage→CDN gratis; CDN red estándar EU/NA 0,01 $/GB; red «Volume» 0,005 $/GB | sin cargo | sin cargo | prueba de 14 días, sin capa gratuita permanente | Mínimo 1 $/mes |
| **AWS S3** Standard (us-east-1) | 0,023 $/GB-mes (primeros 50 TB) | 0,09 $/GB (primeros 10 TB tras la capa gratuita) | 0,005 $ / 1.000 PUT | 0,0004 $ / 1.000 GET | 100 GB/mes de salida (global) | Duración mínima **no verificada** |
| **Cloudinary** (referencia) | por créditos: 1 crédito = 1 GB guardado, o 1 GB de entrega de imagen, o 2 GB de vídeo, o 1.000 transformaciones | (créditos) | — | — | Free: 25 créditos/mes | Plus 99 $/mes (225 créditos), Advanced 249 $/mes (600); precio por crédito extra **no publicado** |

### Ejemplo numérico (supuesto explícito)

**100 GB almacenados · 1.000 GB de salida · 1 millón de lecturas (GET) · 100.000 escrituras (PUT) al mes.**
GiB tratado como GB en GCS para simplificar.

| Proveedor | Sin capa gratuita | Con capa gratuita | Cálculo (sin capa gratuita) |
|---|---|---|---|
| GCS Standard us-east1 = Firebase `.firebasestorage.app` | **122,90 $** | 110,76 $ | 100×0,020 + 1.000×0,12 + 1.000×0,0004 + 100×0,005 |
| Firebase `.appspot.com` (heredado) | 123,50 $ | 118,87 $ | 100×0,026 + 1.000×0,12 + 10×0,05 + 100×0,004 |
| AWS S3 Standard us-east-1 | 93,20 $ | 84,20 $ | 100×0,023 + 1.000×0,09 + 0,40 + 0,50 |
| Bunny (HDD 1 región + CDN estándar EU/NA) | 11,00 $ | 11,00 $ | 100×0,01 + 1.000×0,01 |
| Bunny (red Volume) | 6,00 $ | 6,00 $ | 100×0,01 + 1.000×0,005 |
| Backblaze B2 | 7,70 $ | 7,63 $ | 100×0,00695 + (1.000−300)×0,01 |
| **Cloudflare R2** | **2,31 $** | **1,35 $** | 100×0,015 + 0 + 0,1 M×4,50 + 1 M×0,36 |
| Cloudinary | 1.100 créditos (imagen) → Enterprise, precio no publicado; si todo fuera vídeo, 600 créditos = Advanced 249 $/mes | — | 100 + 1.000 (imagen) o 100 + 1.000/2 (vídeo) |

Lectura: **en este volumen la salida de datos domina** (en GCS/Firebase y S3 es más del 90 % del total). Con estos datos, el
más barato para ESTE patrón es R2, seguido de Bunny Volume y B2 (B2 depende de que la salida no supere 3× lo guardado o
vaya por un CDN socio). El resultado cambia con otro patrón: si casi no hay salida (archivo frío), las diferencias se
reducen al precio por GB guardado (B2 ≈ 0,007, Bunny 0,01, R2 0,015, GCS 0,020, S3 0,023). Sin capa gratuita de GCS
fuera de tres regiones de EE. UU. No se ha modelado el coste de CDN delante de GCS (Cloud CDN, **no verificado**).

Fuentes (consultadas el 2026-10-12): cloud.google.com/storage/pricing · cloud.google.com/storage/pricing-examples ·
docs.cloud.google.com/free/docs/free-cloud-features · firebase.google.com/pricing · developers.cloudflare.com/r2/pricing/ ·
backblaze.com/cloud-storage/pricing · backblaze.com/cloud-storage/transaction-pricing · bunny.net/pricing/storage/ ·
bunny.net/pricing/cdn/ · aws.amazon.com/s3/pricing/ · listas de precios oficiales de AWS en CSV (AmazonS3 y
AWSDataTransfer, us-east-1) · cloudinary.com/pricing · cloudinary.com/documentation/developer_onboarding_faq_credits.
Las tablas de GCS y S3 se cargan con JavaScript; sus cifras se leyeron de los datos oficiales embebidos en la página y de
las listas CSV oficiales de AWS.

---

## 5. Recomendación

### 5a. Desarrollo y demo (se puede hacer ya, sin dependencia permanente)

- Servir los **medios demo locales** con el servidor HTTP de desarrollo **de solo lectura** que prepara la línea de la demo
  (`localhost`), sin subir nada a Cloudinary, Firebase ni R2 y sin credenciales.
- Las fichas demo deben guardar **referencias** (`storageRef` con un proveedor `demo`/`fake` y una clave), nunca la URL del
  servidor local como identidad; la URL se resuelve al pintar. Esto respeta la regla del Core («la clave de almacenamiento no
  es identidad») y permite cambiar el origen sin tocar datos.
- El proveedor falso del puerto (`functions/src/media/falso.ts`) ya existe para pruebas; en el emulador puede servir de
  backend del puerto sin red.
- Los proyectos locales no necesitan servidor: viven en el dispositivo.

### 5b. Producción — PROPUESTA (requiere autorización; no se aplica)

1. **Un solo backend de bytes detrás del puerto existente**, sin segundo sistema. Candidato con datos: **Cloudflare R2**,
   porque (a) ya tiene adaptador READY verificado contra el proveedor real (`media/r2.ts:95-110`), (b) salida a internet a 0 $,
   y (c) URLs firmadas y subida directa ya implementadas. Alternativa si se prefiere no añadir proveedor: Firebase/GCS
   implementando `guardar`/`urlFirmada` en `indice-almacen.ts`, aceptando que la salida cuesta 0,12 $/GiB.
2. **Orden propuesto** (cada paso con su autorización):
   - (i) Escribir la decisión «no depender de Cloudinary» con fecha (hoy no existe escrita).
   - (ii) Resolver el incidente abierto del token de Cloudflare (`docs/SECURITY.md:186-198`) antes de ampliar R2.
   - (iii) Conectar `solicitarEntrega` y las miniaturas entregables (mayor ahorro de salida inmediato).
   - (iv) Hacer que los resultados de IA nuevos se guarden por `guardarMaterial` (el materializador ya es idempotente).
   - (v) Subida de publicaciones nuevas por el puerto (sustituye el preset sin firmar de Cloudinary).
   - (vi) Migración de lo antiguo con el plan preparado (`docs/F11-MIGRACION.md`), sin borrar nada en Cloudinary.
3. **Weë Cloud** se monta sobre ese mismo backend y el Credit Engine, con la tarifa que defina el dueño
   (`WEE-ALMACENAMIENTO-Y-COSTE.md` §2.2). Hasta entonces sigue apagado.
4. Riesgos a valorar: un segundo proveedor añade otra factura y otra superficie de credenciales; la firma SigV4 es código
   propio (verificada una vez con el canary); el volumen real de salida de Weë **no se ha medido** (no hay datos en
   `aiGenerations` ni `creatorUsage` sobre bytes servidos), así que el ejemplo del §4 es ilustrativo.
