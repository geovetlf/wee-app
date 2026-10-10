# Auditoría local-first (línea B1)

Fecha: 2026-10-08 · Rama `wee/local-first` · base `9469e3a` (`wee/almacenamiento-activos`).

Método: lectura del código, de `package.json`, `app.json` y `eas.json`, de los typings y del código nativo de `expo-file-system` instalado, y búsquedas por símbolo en el repo. No se ejecutó la app ni se midió rendimiento: lo que no se midió figura como tal.

Principio aprobado por el dueño (no se cambia): los proyectos se guardan en el dispositivo por defecto; el almacenamiento permanente en WEE Cloud es opcional y se paga con Credits; no hay planes ni suscripciones; el almacenamiento local no implica sincronización.

## 1. Plataformas (verificado)

- **Web:** `react-native-web ^0.21.0`; `app.json` → `web.bundler: metro`. Script `web:demo` (`scripts/web-demo.mjs`): puerto 8082 por defecto, proyecto `demo-wee`, emuladores en 127.0.0.1.
- **Nativa:** Expo `~54.0.37` (SDK 54), React Native `0.81.5`. `app.json` → `platforms: ios, android, web`. `eas.json` define los perfiles `development`, `preview` y `production`. El build Android local está documentado en la memoria del proyecto. iOS no se ha verificado en este entorno.
- **Divergencias por plataforma:** `Platform.OS` (p. ej. `services/assetDownload.ts:59`) y pares de archivos. Único par hoy: `config/appCheck.ts` (base, nativo) + `config/appCheck.web.ts`. Es el patrón que sigue `services/almacenLocal/`.

## 2. Cómo se guardan hoy los proyectos y borradores

| Qué | Dónde | Líneas | Persistencia |
|---|---|---|---|
| Proyectos de WEË AI (`creatorProjects`) | Firestore, `services/projectsService.ts` | `:50-94` | nube, con sesión |
| Creaciones dentro de un proyecto | `creatorJobs.projectId` (escalar en el trabajo) | `projectsService.ts:79-94` | nube |
| Lista, creación y renombrado | `screens/ProjectsScreen.tsx` (`load` `:33-46`, `create` `:54-71`) y `screens/ProjectScreen.tsx` (`load` `:47-63`, `saveName` `:71-76`) | nube | sin usuario la lista queda vacía (`ProjectsScreen.tsx:34-38`) |
| Borrado de un proyecto | `ProjectScreen.tsx:78-96`: `window.confirm` en web, `Alert.alert` en nativo (`:85`, `:87`) | nube | |
| Selector «Guardar en proyecto» | `components/creator/ProjectPicker.tsx:31-62` | nube | |
| Materiales de la cuenta («Mis creaciones») | Firestore `assets`, solo lectura en cliente (`services/assetsService.ts:72`, `:87-109`); borrado por callable `deleteAsset` (`:158-159`) | nube | |
| Documentos de Weë Writer | con sesión: Firestore `users/{uid}/writerDocuments`; sin sesión: AsyncStorage `wee.writer.documents.v1` (`services/documentsService.ts:21`, `:27-40`) | mixto | ver §6, punto 4 |
| Filmmaker (producciones, planos, elementos) | servidor, callable `productions` (`services/filmmakerService.ts:250`); el cliente no lee Firestore (`:2-5`) | nube | |
| Weë Design | trabajos del especialista vía `creatorService.getMyJobsDe` (`screens/DesignReferenciaScreen.tsx:131`) | nube | |
| Preferencias: idioma, ubicación, flag de administración | AsyncStorage: `i18n/preferencia.ts:32`, `:42`; `services/locationService.ts:80`, `:92`; `screens/SettingsScreen.tsx:57` | dispositivo | |
| Sesión de Auth | AsyncStorage en nativo (`config/firebase.ts:83-85`); localStorage en web (`contexts/AuthContext.tsx:102`) | dispositivo | |
| Descargas de creaciones | `cacheDirectory/wee_downloads/` (`services/assetDownload.ts:64`) | caché transitoria | |

Búsqueda: en `services/`, `screens/`, `components/`, `utils/`, `hooks/`, `contexts/`, `navigation/` e `i18n/` no hay IndexedDB, OPFS, `navigator.storage` ni `expo-file-system` fuera de `assetDownload.ts`. Filmmaker y Weë Design no tienen persistencia local. No existe una carpeta `filmmaker/` en la raíz: el cliente está en `services/filmmaker/` y `services/filmmakerService.ts`, con pantallas en `screens/ProductionScreen.tsx` y `screens/StudioScreen.tsx`. La carpeta `design/` de la raíz es el canvas de diseño, no código de ejecución.

## 3. Dónde viven hoy los archivos y qué se pierde si el dispositivo desaparece

- **Materiales de creaciones de WEË AI:** el proveedor de origen entrega los bytes y el servidor los copia al Storage de Weë con su ficha (`functions/src/content/materializador.ts:149`, `:224`, `:240`). La ficha guarda un `storageRef` con proveedor `wee`. Las URLs anteriores siguen en Cloudinary (`functions/src/content/index.ts:58-72`).
- **Subidas de la persona:** Cloudinary por defecto (`services/storageService.ts:2-10`; `services/cloudinaryService.ts:156-295`). La foto de vista única de WeeTalk va al Storage de Weë (`storageService.ts:2-4`). Las fotos para WEË AI van al Storage (`services/creatorUploads.ts:59-67`).
- **Si el dispositivo desaparece:** la cuenta, los proyectos de la nube, las creaciones y los materiales siguen en la nube. Los documentos de Weë Writer sin sesión se pierden. Las preferencias se restablecen. Hoy no existe ninguna copia local de los materiales, así que el catálogo local empieza vacío y no reemplaza nada.

## 4. Almacenamiento local reutilizable (API verificada en la versión instalada)

- **`@react-native-async-storage/async-storage` 2.2.0:** clave-valor de texto. Sirve a preferencias; no sirve para binarios ni catálogos grandes.
- **`expo-file-system` 19.0.24** (`package.json`: `~19.0.21`). La app usa la API legacy (`services/assetDownload.ts:2`, `expo-file-system/legacy`); se sigue con ella por consistencia. Funciones presentes en `node_modules/expo-file-system/build/legacy/FileSystem.d.ts`: `documentDirectory`, `cacheDirectory`, `getInfoAsync`, `readAsStringAsync`, `writeAsStringAsync`, `deleteAsync`, `moveAsync`, `copyAsync`, `makeDirectoryAsync`, `readDirectoryAsync`, `getFreeDiskStorageAsync`, `getTotalDiskCapacityAsync`. La raíz del paquete marca `moveAsync` y `copyAsync` con avisos de legado (`build/legacyWarnings.d.ts`).
- **Semántica de `moveAsync` (código nativo instalado):**
  - Android: `File.renameTo` (`android/src/main/java/expo/modules/filesystem/legacy/FileSystemLegacyModule.kt:266-279`). Sustituye el destino dentro del mismo volumen.
  - iOS: borra el destino y después llama a `FileManager.moveItem` (`ios/Legacy/FileSystemLegacyModule.swift:92-105`). **No es atómico:** si se corta entre los dos pasos, el destino no existe. Consecuencia: el índice se recupera desde las copias de cada proyecto (§7).
- **Espacio libre:** en nativo, `getFreeDiskStorageAsync`. En web, `navigator.storage.estimate()`, que la app todavía no usa.
- **Compartir y galería:** `expo-sharing` 14.0.8 (`components/PostCard.tsx:29`, `services/assetDownload.ts:4`) y `expo-media-library` 18.2.1 (`services/assetDownload.ts:3`).
- **Instalados sin uso en este bloque:** `expo-image-picker` 17.0.11 y `expo-image-manipulator` 14.0.8 (miniaturas). Su uso para la carátula no se ha verificado.
- **No instalados:** `expo-crypto` (SHA-256 nativo) y `expo-document-picker` (selector de archivos). Añadirlos exige autorización del dueño; este bloque no los añade.

## 5. Contratos del Core de proyectos y materiales (`functions/src/core/`)

- **`project.ts`:** `Project` (`projectId`, `name`, `emoji?`, `coverAssetId?`, `itemCount?`, `createdAt`, `updatedAt`, `deletedAt?`, extiende `OwnerRef`; `:47`) y `ProjectItem` (`kind: 'asset' | 'content'`, `itemId`; `:69`). Decisión del Core: **el proyecto organiza, no posee**. El material no lleva `projectId` y la relación es una fila propia. `creatorJobs.projectId` se mantiene como costura heredada.
- **`content/asset.ts`:** `Asset` (`assetId`, `ownerAccountId`, `storageRef`, estados `uploading → processing → ready → deleted` y `failed`, `provenance`). Retirar un material es marcarlo y devolver las referencias a borrar (`retirar()`).
- **Formato de proyecto exportable:** no existe ninguno. Se crea `wee-proyecto@1`, siguiendo la convención `nombre@N` que ya usa el repo (`wee-guardian@1`, `wee-cierre@1`, `motor-de-decision@3`). El vocabulario es el del Core (`projectId`, `name`, `emoji`, `coverAssetId`, `kind`, `itemId`) para no crear un segundo modelo de proyectos.

## 6. Hallazgos que condicionan el diseño

1. **`Alert.alert` no muestra nada en web** (`utils/notify.ts:16`). `ProjectScreen.tsx:85-87` ya separa `window.confirm` de `Alert.alert`. La sección local usa `confirmAction` de `utils/notify.ts`.
2. **`i18n/huella.json` fija las huellas de los catálogos.** Cualquier clave nueva las cambia (`functions/test/i18n-huella.test.mjs`). La regeneración se hace con `scripts/i18n-huella.mjs` después de verificar los textos. B1 no la regeneró; la línea I (§9) sí, en un commit aparte, y ahí están los 19 catálogos que cambiaron.
3. **`Diccionarios` admite idiomas incompletos** (`i18n/traducir.ts:42`). Una clave nueva obliga solo a `es` y `en` (`i18n/textos/en/index.ts`, tipo `FormaDelDiccionario`).
4. **Weë Writer sin sesión guarda en el dispositivo y migra a la nube** la primera vez que hay sesión (`services/documentsService.ts:45-56`). Va contra el principio de nube opcional. Está fuera del alcance de B1: se documenta y no se cambia.
5. **Hash SHA-256 sin dependencia:** se implementa en TypeScript puro. Su rendimiento con archivos grandes en el teléfono **no se ha medido**.
6. **Sin selector de documentos:** importar archivos del teléfono no tiene fuente en la interfaz de B1 (§8).

## 7. Decisiones de integración

- **Capa aditiva.** No se tocan `creatorProjects`, `creatorJobs`, `assets`, Weë Writer, Filmmaker ni los flujos de creación. Los proyectos de la nube siguen igual.
- **Estructura.** `services/almacenLocal/` contiene la interfaz, los errores tipados, un adaptador de memoria (solo pruebas), el adaptador nativo y el adaptador web, con el patrón de `config/appCheck.ts` + `.web.ts`. `utils/catalogoLocal.ts` es lógica pura sobre esa interfaz.
- **Escritura atómica.** Android: `moveAsync` sustituye por renombrado. iOS: no hay sustitución atómica; si falta el índice o está cortado, se reconstruye desde las copias `proyectos/<id>/proyecto.json`. Web: una transacción de IndexedDB por escritura.
- **Índice corrupto.** Se copia a `cuarentena/` (nunca se borra) y se reconstruye desde las copias. **No se puede reconstruir:** el último cambio de metadatos si se cortó entre el índice y su copia; la carátula (es regenerable, no se toma como verdad); y la lista de archivos pendientes de borrar.
- **Sin menú nuevo.** La sección «Este dispositivo» va dentro de `ProjectsScreen`, como indica `CLAUDE.md`.
- **Exportación `wee-proyecto@1`.** No incluye `ownerAccountId`, ids de dispositivo ni carátula.

## 8. Fuera de B1 (DEFERIDO o BLOQUEADO)

- **Sincronización bidireccional:** DEFERIDA. Hay que resolver los conflictos antes.
- **Respaldo en WEE Cloud y restauración:** DEFERIDOS a la línea M o a decisión del dueño. Solo se deja la forma del campo (`respaldo: 'ninguno'`).
- **Publicar desde un archivo local:** DEFERIDO. Las publicaciones usan Cloudinary y el Storage de Weë (`services/storageService.ts`). Haría falta subir el archivo al publicar, guardar la URL resultante y decidir quién paga ese almacenamiento.
- **Importar desde archivos del teléfono en la interfaz:** BLOQUEADO por autorización. Requiere `expo-document-picker`, no instalado. En web sería posible con un selector de archivos del navegador; no se hace en B1.
- **Añadir archivos a un proyecto local desde la galería:** pendiente de decisión del dueño. `expo-image-picker` ya está instalado, pero no forma parte de las acciones de la tarjeta que pide el brief.
- **Cobros y Credits:** ninguno. Los Credits no se tocan.

## 9. Línea I («Mis proyectos» con la carpeta WEE)

Rama `wee/trk-i-mis-proyectos`, desde la integración `8fcc5c0`. Validación en dispositivo: PENDIENTE (no hay iPhone ni Android conectados).

**Decisiones.**

- **Índice, copias y carátulas fuera de la carpeta.** `services/almacenLocal/almacenDeMetadatos.ts` implementa el contrato `AlmacenLocal` sobre AsyncStorage. El índice (`indice.json`), las copias (`proyectos/<id>/proyecto.json`), las carátulas y la cuarentena van ahí. La razón: `UIFileSharingEnabled` expone toda la carpeta de documentos de la app en Archivos (iOS), así que dentro solo puede haber archivos del usuario.
- **Un solo contrato, repartido por clave.** `services/almacenLocal/almacenEnrutado.ts` presenta al catálogo un único `AlmacenLocal` que manda `proyectos/<id>/recursos/<recursoId>` a la carpeta WEE y todo lo demás a los metadatos. No es una segunda capa: es el mismo contrato repartido.
- **Carátula = emoji del proyecto.** La carátula de imagen del catálogo es regenerable y no se muestra todavía.
- **«Disponible» exige verificación.** Un proyecto sale «disponible» solo si todos sus archivos existen, tienen el tamaño y la huella registrados, y se pueden leer (`verificarRecurso`). Un proyecto sin archivos sale «sin archivos»: no es «disponible» ni «no encontrado». Esto se comprueba cada vez que se entra en la sección, así que el coste crece con los bytes guardados (no se ha medido).
- **Acciones de la tarjeta:** «Abrir» lee de verdad cada archivo y muestra su estado; «Duplicar» (copia con sus archivos); «Exportar» empaqueta en `wee-proyecto@1` y lo entrega como `.weeproy` (hoja de compartir en nativo, descarga en web, caché transitoria); «Eliminar» pide confirmación.
- **Permiso explicado antes de pedirlo.** La sección muestra el texto de la plataforma (`permisoAndroid`, `permisoIos`, `permisoWeb` o `permisoPrivado`) y un botón «Continuar». Si se deniega, la pantalla sigue usable y ofrece reintentar o elegir otra carpeta. Con la carpeta guardada perdida, ofrece elegir otra.
- **Unificación de exportaciones.** `services/almacenLocal/ubicacion.ts` y `ubicacion.web.ts` exportan el mismo nombre y tipo: `puertoDeUbicacionDelDispositivo` y `tiendaDeUbicacion`, ambos anulables.

**Regresión corregida (B1).** `utils/catalogoLocal.ts` consideraba fiable el índice cuando no existía y no había copias. Eso permitía que `borrarHuerfanos` borrara todo lo que hubiera bajo `proyectos/` en la carpeta. Con el almacén dividido, el caso es alcanzable: al desinstalar, AsyncStorage se borra pero la carpeta WEE de Android sobrevive. Ahora `fiable` solo es verdadero si el índice se leyó. Prueba: `functions/test/local-first-metadatos.test.mjs` (C5, C6) y `functions/test/local-first-seccion.test.mjs` (S26). Se verificó con una mutación: sin el arreglo, C5 y S26 fallan.

**Configuración de iOS.** `app.json` → `expo.ios.infoPlist`: `UIFileSharingEnabled: true` y `LSSupportsOpeningDocumentsInPlace: true`. Fuentes y límites en `docs/CARPETA-WEE-PLATAFORMAS.md`. Se invierte la comprobación Q10 de `functions/test/local-first-politicas.test.mjs`, que antes exigía que no estuvieran.

**Límites abiertos.**

- Desinstalar la app pierde el índice; los archivos de la carpeta siguen pero no se listan. Volver a importarlos está DEFERIDO: decidir si un manifiesto dentro de la carpeta es aceptable (hoy no lo es: sería una base de datos interna visible).
- `estadoSoloEnLaNube` está en los textos pero no es alcanzable mientras la nube esté desactivada (forma reservada; lo vigila `functions/test/local-first-seccion-textos.test.mjs`).
- El visor del contenido no existe en esta línea: «Abrir» verifica y lista.
- Los suites nuevos (`local-first-metadatos`, `local-first-seccion`, `local-first-seccion-textos`) no están en `functions/package.json`: lo registra el integrador.
