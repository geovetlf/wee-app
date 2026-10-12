# Weë · almacenamiento local, Weë Cloud y coste de infraestructura

Ronda R9 · línea C (persistencia y coste) · rama `r9/pc-persistencia` · base `42663be5` · 2026-10-12.
Complemento: la arquitectura de almacenamiento (Media Layer, Storage Port, proveedores y comparativa de precios) está en
[`WEE-ALMACENAMIENTO-ARQUITECTURA.md`](WEE-ALMACENAMIENTO-ARQUITECTURA.md).

**Definición que gobierna todo:** la UBICACIÓN de un archivo (`local` / `wee_cloud` / `remoto_legado`) es independiente
del ESTADO del trabajo (`en_proceso` / `final`). Guardar en el dispositivo es lo normal y no cuesta Credits. Weë Cloud es
opcional, se cobra en Credits por el Credit Engine que ya existe, el coste se muestra ANTES de confirmar, y **solo se
activa si hay una tarifa fiable**. Hoy no la hay, así que Weë Cloud está apagado.

Leyenda: **IMPLEMENTADO** (hay código) · **PROBADO** (hay prueba que pasa, con dobles) · **PARCIAL** · **PENDIENTE** ·
**NO VERIFICADO EN DISPOSITIVO** (nunca se ha ejecutado en un teléfono).

---

## 1. Guardado local (local-first)

### 1.1 Qué existe

| Pieza | Archivo | Estado |
|---|---|---|
| Contrato `AlmacenLocal` (escribir atómico, errores tipados, espacio `null` si no se sabe, claves seguras) | `services/almacenLocal/tipos.ts:51-81` | IMPLEMENTADO · PROBADO |
| Almacén sobre un puerto de archivos (protocolo `.tmp` → relectura → `.anterior` → mover → borrar) | `services/almacenLocal/sobrePuerto.ts:61-84` | IMPLEMENTADO · PROBADO (`local-first-sobre-puerto`) |
| Puerto iOS (rutas en la sandbox, `documentDirectory`) | `services/almacenLocal/puertoDeRuta.ts`, `ubicacion.ts` | IMPLEMENTADO · PROBADO con disco de Node · NO VERIFICADO EN DISPOSITIVO |
| Puerto Android (Storage Access Framework, la persona elige carpeta y Weë crea `WEE`) | `services/almacenLocal/puertoSAF.ts`, `puertosDeUbicacion.ts:79-105`, `ubicacion.ts` | IMPLEMENTADO · PROBADO con un doble que modela SAF · **NO VERIFICADO EN DISPOSITIVO** (`ubicacion.ts:13-14`, `puertoSAF.ts:17-20`) |
| Puerto web (File System Access u OPFS) + registro en IndexedDB | `puertoDirectorioWeb.ts`, `registroIdb.ts`, `ubicacion.web.ts` | IMPLEMENTADO · PROBADO con dobles |
| Metadatos (índice, copias, carátulas) en AsyncStorage, fuera de la carpeta visible | `almacenDeMetadatos.ts`, `almacenEnrutado.ts` | IMPLEMENTADO · PROBADO (`local-first-metadatos`) |
| Catálogo (proyectos locales, huella SHA-256, ausente/corrupto, cuarentena del índice) | `utils/catalogoLocal.ts` | IMPLEMENTADO · PROBADO (`local-first-catalogo`) |
| Exportar `wee-proyecto@1` (hoja de compartir en caché temporal, borrada al terminar) | `utils/bundleLocal.ts`, `entrega.ts:13-26` | IMPLEMENTADO · PROBADO el formato · la hoja de compartir NO VERIFICADA EN DISPOSITIVO |
| Sección «Este dispositivo» en Mis proyectos | `utils/seccionDelDispositivo.ts` | IMPLEMENTADO · PROBADO (`local-first-seccion`) |

### 1.2 Android, en concreto

- **API:** `expo-file-system` 19 legacy, `StorageAccessFramework` (`ubicacion.ts:86-126`). No pide
  `READ/WRITE_EXTERNAL_STORAGE`: el permiso es el de la carpeta que la persona elige (`requestDirectoryPermissionsAsync`).
- **Permiso denegado al elegir:** `elegirCarpeta` devuelve `null` → estado `permiso_denegado` (`utils/ubicacionWee.ts:58`). PROBADO con doble.
- **Permiso perdido después** (el sistema lo revoca, la carpeta se borra): `puedeLeer` falso → `requiere_gesto` → «permiso perdido» (`puertosDeUbicacion.ts:97-99`). PROBADO con doble.
- **Espacio:** SAF no da bytes libres → `null` (`puertoSAF.ts:310-312`); por eso el fallo de espacio solo llega como error del sistema al escribir. **Antes de R9 ese error llegaba crudo** (ver 1.3).
- **Archivo ausente** (borrado desde el gestor de archivos): el catálogo lo marca `ausente` y nunca lo da por guardado (`catalogoLocal.ts` `comprobar`). PROBADO.
- **Nunca probado en un teléfono:** el selector SAF real, la persistencia del permiso entre reinicios, los nombres que devuelve cada proveedor de documentos (`nombreDeUriSAF`), los mensajes de error reales, el rendimiento de base64 + SHA-256 en JS con archivos grandes, el coste de IPC de SAF (ver §3.3) y el borrado de datos al desinstalar.

### 1.3 Endurecimiento hecho en R9 (línea C)

| Cambio | Archivo | Por qué | Prueba |
|---|---|---|---|
| **Errores nativos traducidos.** Permiso → `no_disponible`, sin espacio → `sin_espacio`, ausente → `no_encontrado`, el resto `desconocido`. Textos tomados del código nativo instalado (`FileSystemLegacyModule.kt` `ensurePermission`, `FileSystemExceptions.kt`) | nuevo `services/almacenLocal/erroresNativos.ts`; `ubicacion.ts` envuelve las operaciones de ruta y SAF con `conErroresTraducidos` | El contrato prometía «nunca una cadena cruda del sistema» y las operaciones nativas no lo cumplían: un permiso SAF revocado o un disco lleno salían como «error desconocido» en vez de «vuelve a elegir la carpeta» / «sin espacio» | `pc-persistencia-local` L1, L2, L11 |
| **Mover en SAF verifica la copia** antes de borrar el origen | `puertoSAF.ts` `mover` | El comentario decía «copiar, verificar y borrar» pero el código borraba sin verificar: una escritura truncada perdía el original | L3 (con mutación: sin el arreglo, el origen se pierde) |
| **Reintento idempotente de `añadirRecurso`**: el mismo archivo (nombre, tamaño, huella) ya guardado y COMPROBADO se devuelve sin escribir | `catalogoLocal.ts` `añadirRecurso` | Un doble toque o un reintento tras un corte duplicaba los bytes en el disco. Si la copia anterior falta o está dañada, se escribe otra (no se da por guardado) | L5, L6 |
| **Renombrar sin cambio real no escribe** (ni índice, ni copia, ni `updatedAt`) | `catalogoLocal.ts` `renombrar` | Escrituras inútiles | L7 |

### 1.4 Reglas verificadas

- Guardar local **no cobra Credits ni toca la nube**: ninguno de los 21 módulos local-first importa Firebase, callables, Cloudinary, `fetch` ni Credits (L10). Un proyecto local nace con `respaldo: 'ninguno'`, `sincronizacion: 'no_habilitada'` (W4).
- **Ruta local ≠ referencia remota:** las claves locales son `proyectos/<id>/recursos/<recursoId>`; ningún recurso guarda una URL ni la usa como identidad (L8). El material de la cuenta (`assets`) usa `storageRef`, y el enlace temporal de un proveedor nunca se guarda (`functions/src/content/materializador.ts:34-39`).
- **No se da por guardado sin comprobarlo:** relectura del temporal (`sobrePuerto.ts:107-112`), huella SHA-256 al leer, «disponible» exige verificación (`docs/LOCAL-FIRST-AUDITORIA.md` §9).
- **No sale de las carpetas de la app:** `validarClave` rechaza `..`, rutas absolutas y segmentos vacíos (L9).
- **No se promete recuperación desde otro dispositivo:** sin copia remota no existe; `estadoSoloEnLaNube` está reservado e inalcanzable (`functions/test/local-first-seccion-textos.test.mjs:39`).
- **Duplicar un proyecto copia sus bytes a propósito** (es una copia independiente, `catalogoLocal.ts` `duplicar`). No hay deduplicación entre proyectos: decidirlo exigiría recuento de referencias en local (PENDIENTE, no se hace sin decisión).

---

## 2. Weë Cloud

### 2.1 Estado real: NO EXISTE como operación

- No hay ningún código que suba un proyecto local a la nube por elección de la persona (W5). El campo `respaldo` solo admite `'ninguno'` (`catalogoLocal.ts:89`).
- **No hay tarifa de almacenamiento** en `functions/src/credits/creditCosts.ts` (`CREDIT_COSTS`, 22 servicios, todos de IA; W1), ni en `aiPricing.ts`, ni documentos `creditCosts/{servicio}` de almacenamiento.
- Existe un **estimador de coste de medios sin tarifas** (`functions/src/media/optimizador/coste.ts:3-24`, `estimarCosteDeMedios`): sin tarifa aprobada devuelve `sin_tarifa` y ningún importe (W2). Es la pieza que se reutilizaría para calcular el precio.
- Conclusión: **Weë Cloud queda SIN activación comercial (apagado, sin cobro).** No se inventa ningún precio.

### 2.2 Qué tarifa hay que definir (decisión del dueño)

Para fijar un precio honesto (`coste del proveedor + infraestructura + margen`, la misma regla que `creditCosts.ts:11-18`):

1. **Proveedor y región** del almacenamiento de Weë Cloud (ver la comparativa de `WEE-ALMACENAMIENTO-ARQUITECTURA.md` §4).
2. **Unidad de cobro** — propuesta: un pago **por subida** que cubra un periodo fijo de conservación (p. ej. N meses por GB), porque el principio aprobado es «sin planes ni suscripciones» (`docs/LOCAL-FIRST-AUDITORIA.md:7`). Un cobro mensual recurrente sería una suscripción encubierta.
3. Las cifras: USD por GB-mes de almacenamiento, USD por GB de salida (descargas/restauración), USD por operación (escritura/lectura), y el **margen** (hoy el del motor, 30 %, `creditCosts.ts:15`).
4. **Qué pasa al vencer** el periodo pagado (aviso, gracia, borrado) y si la restauración en otro dispositivo cobra la salida.
5. Un **servicio nuevo** en `CREDIT_COSTS` (p. ej. `cloud_storage_gb`) con su fuente oficial en el comentario, como los de IA. Al añadirlo, `pc-persistencia-cloud` W1 falla a propósito y obliga a escribir las pruebas del flujo.

### 2.3 Flujo cuando haya tarifa (no implementado)

```
cliente: «Guardar en Weë Cloud» (proyecto local)
  1. creatorQuote-like: callable de servidor calcula el coste EXACTO (bytes reales × tarifa, estimarCosteDeMedios)
  2. la interfaz muestra «Esto cuesta N Credits» y la persona confirma (nunca antes de ver el número)
  3. servidor: spendCredits({ service, requestId, fingerprint: huella del paquete, amount }) → reserva
     (spendCredits como callable de cliente EXIGE administración, functions/src/credits/index.ts:99; el cobro va en una
      Function de servidor, como generateVideo)
  4. servidor: urlDeSubida(...) del Storage Port (functions/src/core/media/puerto.ts:359; R2 lo implementa) → el cliente
     sube los bytes directamente; el servidor confirma con mirar() (tamaño y huella)
  5. confirmado → completeCredits({ requestId })     |  fallo / expirado → refundCredits({ requestId })
     ambos idempotentes por requestId (creditEngine.ts:411-560); un requestId reembolsado no se reutiliza (:426-427)
  6. el proyecto local pasa a respaldo: 'wee_cloud' con la StorageRef (no la URL) del objeto
```

Garantías que el flujo ya hereda: idempotencia por `requestId` + huella (`idempotencia-de-cobro`), reembolso si falla,
claves aisladas por cuenta y escritura `siNoExiste` del puerto. Lo que falta construir: la Function de cotización y
confirmación, el servicio de Credits con su tarifa, la vinculación del adaptador (§3 del doc de arquitectura) y la UI.

---

## 3. Coste de infraestructura medido (por lectura del código; sin tráfico real)

Unidades: lecturas/escrituras de documentos Firestore por acción. «≤ N» = hasta N documentos devueltos (una consulta
vacía factura 1 lectura). No se han medido precios de Firestore ni tráfico real.

### 3.1 Mis proyectos / Mis creaciones (nube)

| Pantalla / acción | Operación | Coste | Evidencia | Observación |
|---|---|---|---|---|
| Mis proyectos, cada vez que la pantalla gana el foco | `projectsService.list` | ≤ 50 lecturas | `ProjectsScreen.tsx:49-53`, `projectsService.ts:53-56` | Volver de un proyecto relee la lista entera |
| Un proyecto, cada foco | `get` + `jobsForProject` | 1 + ≤ 50 lecturas | `ProjectScreen.tsx:47-69` | Idem |
| Renombrar proyecto | `rename` | 1 escritura **aunque el nombre no cambie** | `ProjectScreen.tsx:71-76`, `projectsService.ts:70-72` | Propuesta a B/A: no llamar si `name.trim() === project.name` |
| «Guardar en proyecto» (abrir el selector) | `list` | ≤ 50 lecturas por apertura | `ProjectPicker.tsx:31-40` | Podría reutilizar la lista ya cargada |
| Asignar creación a proyecto | `assignJob` | 2 escrituras | `projectsService.ts:79-87` | Correcto (trabajo + `updatedAt` del proyecto) |
| **Mis creaciones, al entrar** | `assetsService.listar` | **2 × 25 = 50 lecturas** | `MisCreacionesScreen.tsx:87-88` | `useFocusEffect(cargar)` **y** `useEffect(cargar)` disparan los dos al montar; la segunda descarta la primera pero ambas se facturan |
| **Mis creaciones, cambiar filtro u orden** | `listar` | **2 × 25 = 50 lecturas** | idem | Cambia `cargar` → se re-ejecutan el `useEffect` y el `useFocusEffect` |
| Mis creaciones, cada foco / «cargar más» | `listar` | 25 lecturas | `assetsService.ts:88-109` (`CREACIONES_POR_PAGINA + 1`) | Correcto |
| **Rejilla de miniaturas** | descarga | **24 ORIGINALES por página** (megas en móvil) | `assetsService.ts:115-152` (`esElOriginal: true`) | Las variantes no tienen entrega propia; la salida (egress) es el coste dominante de almacenamiento (§4 del doc de arquitectura) |
| Weë Writer, «Guardar» | `documentsService.save` | 1 escritura por toque, **aunque no haya cambios** | `WriterEditorScreen.tsx:87-95`, `documentsService.ts:76-88` | No hay autosave en ninguna pantalla de proyectos/creaciones; el guardado es manual |

**Autosave:** no existe en Mis proyectos, Mis creaciones ni Writer (búsqueda de `debounce`/`autosave` sin resultados en
`services/ screens/ components/ hooks/ utils/`). No hace falta agrupar escrituras; sí evitar las que no cambian nada.

### 3.2 Bytes, duplicados, temporales y reintentos (servidor)

- **Resultados de IA:** se traen una vez al Storage de Weë con ruta derivada del `assetId` y escritura `ifGenerationMatch: 0`; un webhook repetido no vuelve a descargar ni duplica (`materializador.ts:17-28`, `:108-112`), y un objeto sin ficha se ADOPTA en vez de descargarse otra vez (`:51-98`). Correcto.
- **Duplicación legada:** las publicaciones viven en Cloudinary (`services/storageService.ts:2-8`); las URLs antiguas siguen allí (`docs/F11-MIGRACION.md`). No hay copia doble activa.
- **Temporales del cliente:** descargas (`assetDownload.ts:64-91`) y exportación (`entrega.ts:13-26`) se borran en `finally`; un corte deja restos en `cacheDirectory`, que el sistema puede purgar. `.tmp`/`.anterior` de la carpeta WEE se limpian al abrir (`sobrePuerto.ts` `limpiarTemporales`) y nunca tocan finales.
- **Miniaturas:** no existen como objeto entregable (ver tabla). Es la mejora de mayor impacto en salida de datos y pertenece a la capa de entrega (`functions/src/media/entrega.ts`), no a esta línea.

### 3.3 Coste del lado del dispositivo (no medido)

- **SAF:** resolver una ruta llama a `hijos()` por cada carpeta antecesora, y cada `hijos()` hace un `readDirectoryAsync` extra por hijo para saber si es carpeta (`ubicacion.ts:77-93`). Escribir un recurso (`.tmp`, relectura, `.anterior`, mover) son decenas de llamadas IPC que crecen con el número de archivos del proyecto. Propuesta: caché de URIs por ruta dentro de una operación — **no se implementa sin validarlo en un teléfono**.
- **base64 + SHA-256 en JS:** todo archivo pasa por base64 (`ubicacion.ts:41,46`) y la huella es TypeScript puro (`utils/sha256.ts`); entrar en la sección verifica todos los bytes (`docs/LOCAL-FIRST-AUDITORIA.md` §9). Coste proporcional a los bytes guardados; sin medir.

### 3.4 Mejoras

| Mejora | Dónde | Estado |
|---|---|---|
| Reintento de `añadirRecurso` sin bytes duplicados | `catalogoLocal.ts` | HECHO (L5/L6) |
| Renombrar local sin escritura si no cambia | `catalogoLocal.ts` | HECHO (L7) |
| Errores nativos tipados (permiso/espacio/ausente) | `erroresNativos.ts`, `ubicacion.ts` | HECHO (L1/L2/L11) |
| Mover SAF verificado | `puertoSAF.ts` | HECHO (L3) |
| Quitar la doble carga de Mis creaciones (−25 lecturas al entrar y por filtro) | `MisCreacionesScreen.tsx` (línea B) | PROPUESTO: dejar solo `useFocusEffect(cargar)`, que ya se re-ejecuta al cambiar `cargar` |
| No escribir al renombrar un proyecto de nube sin cambio | `ProjectScreen.tsx` (B) / `projectsService.ts` (A) | PROPUESTO |
| Reutilizar la lista de proyectos en `ProjectPicker` | `ProjectPicker.tsx` (B) | PROPUESTO |
| Writer: no guardar si el texto y el título no cambiaron | `WriterEditorScreen.tsx` (fuera de la misión) | PROPUESTO |
| Miniaturas entregables (variantes con entrega) | `functions/src/media/entrega.ts` + Content Core | PROPUESTO: decisión de arquitectura, mayor ahorro de salida |
| Caché de URIs en SAF | `puertoSAF.ts` | PENDIENTE de validación en dispositivo |
