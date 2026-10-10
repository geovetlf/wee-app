# Carpeta física «WEE»: plataformas, permisos y límites

Estado (2026-10-10, línea I «Mis proyectos», rama `wee/trk-i-mis-proyectos`): la sección «En este dispositivo» está implementada sobre la capa local (B1). **La validación en dispositivo está PENDIENTE**: no hay un iPhone ni un Android conectados, así que nada de lo que sigue está verificado en hardware. Lo verificado se limita a pruebas con dobles y a la lectura de las fuentes oficiales citadas.

## Plataformas reales de Weë

| Plataforma | Evidencia | Estado |
|---|---|---|
| Web (navegador) | `app.json` → `platforms` incluye `web`; `react-native-web` ^0.21.0 | Existe |
| PWA | No hay `manifest` ni service worker propios en `public/`. El manifiesto que sale de `app.json` › `web` no se ha verificado en un despliegue | DESCONOCIDO |
| Android nativo | `app.json` → `platforms` incluye `android`; Expo SDK 54; `expo-file-system` ~19.0.24 | Existe. PENDIENTE DE DISPOSITIVO (no hay `adb devices`) |
| iOS nativo | `app.json` → `platforms` incluye `ios`; `ios.infoPlist` declara `UIFileSharingEnabled` y `LSSupportsOpeningDocumentsInPlace` en `true` (línea I) | Existe. PENDIENTE DE DISPOSITIVO (no hay iPhone) |
| Escritorio | No hay Electron ni Tauri en `package.json`. El escritorio es el navegador | No existe como app nativa |

## Fuentes oficiales consultadas

- **Expo, `expo-file-system`:** https://docs.expo.dev/versions/latest/sdk/filesystem/ — la sección de configuración documenta las opciones del plugin `enableFileSharing` (por defecto `false`) y `supportsOpeningDocumentsInPlace` (por defecto `false`), y dice que activan `UIFileSharingEnabled` y `LSSupportsOpeningDocumentsInPlace` en `Info.plist`. Weë **no usa el plugin**: declara las dos claves directamente en `ios.infoPlist` de `app.json`, que es la forma que pedía el encargo. No hay conflicto porque el plugin no está en `plugins`.
- **Apple, `UIFileSharingEnabled`:** https://developer.apple.com/documentation/bundleresources/information_property_list/uifilesharingenabled
- **Apple, `LSSupportsOpeningDocumentsInPlace`:** https://developer.apple.com/documentation/bundleresources/information_property_list/lssupportsopeningdocumentsinplace

Las dos páginas de Apple devolvieron solo su título al consultarlas, así que **el texto oficial de Apple no se ha citado literalmente**. Los nombres exactos de las claves y su tipo booleano coinciden entre Expo y el conocimiento de Apple, pero el texto oficial queda PENDIENTE DE VERIFICAR con un navegador. Esta es la única parte del documento que no está comprobada contra la fuente primaria.

## API de almacenamiento y permisos por plataforma

### Web y navegador de escritorio

- **Carpeta elegida por el usuario:** File System Access (`window.showDirectoryPicker()`), solo en navegadores basados en Chromium. El `FileSystemDirectoryHandle` se guarda en IndexedDB.
- **Permiso:** no es automático al volver a abrir la página. Hay que pedirlo de nuevo con un gesto del usuario. La pantalla lo explica y ofrece «Volver a permitir el acceso».
- **Sin soporte:** OPFS (`navigator.storage.getDirectory()`). Es un espacio PRIVADO del origen, real y persistente para el navegador, pero NO es una carpeta visible en el sistema de archivos. La pantalla lo dice con el texto `permisoPrivado`.
- **Índice y copias:** van a AsyncStorage, que en la web es el `localStorage` del origen (cuota de unos 5 MB). Nunca aparecen en la carpeta elegida.
- **Límite:** solo la carpeta que el usuario selecciona. No se crea nada en una ubicación arbitraria.

### Android (nativo)

- **API:** `StorageAccessFramework` de `expo-file-system/legacy`. `requestDirectoryPermissionsAsync` abre el selector del sistema. `makeDirectoryAsync` crea `WEE` dentro de la carpeta elegida; `readDirectoryAsync` lista el contenido.
- **Permiso:** el usuario elige la carpeta en el selector del sistema. No se piden `READ_EXTERNAL_STORAGE` ni `MANAGE_EXTERNAL_STORAGE`. `app.json` no declara permisos de Android.
- **Índice y copias:** van a AsyncStorage, no a la carpeta.
- **Límites:** no hay acceso a rutas restringidas del sistema ni a `Android/data`. Solo la carpeta elegida.
- **Desinstalación:** la carpeta elegida (por ejemplo `Documentos/WEE`) está fuera del almacenamiento de la app, así que sus archivos pueden seguir ahí. Pero el índice y las copias están en AsyncStorage y se borran con la app. Resultado: tras reinstalar, Weë **no lista** esos archivos y **no los borra** (ver la regresión de `utils/catalogoLocal.ts` en `docs/LOCAL-FIRST-AUDITORIA.md`). Volver a importarlos no está implementado (DEFERIDO). PENDIENTE DE DISPOSITIVO.

### iOS (nativo)

- **Carpeta de la app:** `WEE` dentro del directorio de documentos de la app (`expo-file-system` `documentDirectory`). No requiere permiso y se crea sin acción del usuario. No hay selector de carpetas: `expo-document-picker` no está instalada.
- **Visibilidad:** `app.json` → `ios.infoPlist` declara `UIFileSharingEnabled: true` y `LSSupportsOpeningDocumentsInPlace: true`. Con ellas, la app Archivos muestra la carpeta de documentos de Weë, y dentro está `WEE`. Según la documentación de Expo, `UIFileSharingEnabled` la expone también por el uso compartido de archivos de iTunes (Finder, al conectar el iPhone a un ordenador).
- **Índice y copias:** van a AsyncStorage (el almacén de preferencias de la app, fuera de los documentos). Así nada interno aparece en Archivos.
- **Desinstalación:** elimina el sandbox y su contenido. Es irreversible sin una exportación previa. PENDIENTE DE DISPOSITIVO.

#### Efecto de compartir los documentos en iOS

Lo que ve la persona en la app Archivos, en «En mi iPhone › Weë»: la carpeta `WEE` con una subcarpeta por proyecto (`proyectos/<id>/recursos/`). Puede abrir los archivos, editarlos y borrarlos desde Archivos. Weë no lo impide, y eso es lo que significa `LSSupportsOpeningDocumentsInPlace`: la app trabaja sobre el archivo en su sitio.

Consecuencias que la app asume:
- Si la persona **edita** un archivo desde Archivos, Weë lo detecta al comprobarlo: cada archivo se verifica por tamaño y huella SHA-256 registrados al guardarlo. Un archivo cambiado sale como «archivo dañado»; el proyecto no aparece «disponible».
- Si la persona **borra** un archivo desde Archivos, el proyecto sale con «archivo ausente». Weë no lo repara ni lo recrea.
- Solo debe haber archivos del usuario dentro de los documentos: nada más se guarda ahí. El índice y las copias están en AsyncStorage, y la carpeta solo contiene `proyectos/<id>/recursos/<recursoId>`. Lo vigila `functions/test/local-first-metadatos.test.mjs` (R2, C2, C4) y `functions/test/local-first-seccion.test.mjs` (S24, S25).

#### Límites de iOS

- `UIFileSharingEnabled` expone **toda** la carpeta de documentos de la app, no solo `WEE`. Hoy el código de Weë no escribe nada más en `documentDirectory` (solo `ubicacion.ts`). Que ninguna librería escriba allí no se ha verificado en un iPhone real: PENDIENTE DE DISPOSITIVO.
- iOS no garantiza que la eliminación de una copia borre los bytes de inmediato; la app no puede controlarlo.
- No hay sincronización ni copia en la nube: la nube está desactivada por defecto (`AJUSTES_DE_ALMACENAMIENTO.nube`).
- No hay subcarpeta con acceso restringido: quien tenga acceso a la app en el dispositivo puede ver `WEE`.
- Tras desinstalar la app, el índice se pierde y los archivos de `WEE` no se listan de nuevo (ver la nota de desinstalación de Android: aplica igual).
- Los cambios hechos desde Archivos pueden tardar en aparecer en la app hasta que Weë vuelve a comprobar la carpeta (al entrar en «Mis proyectos»).

## Qué se puede automatizar y qué requiere una acción del usuario

| Caso | Automático | Acción del usuario |
|---|---|---|
| iOS: crear `WEE` en los documentos de la app | Sí, sin permiso | Ninguna |
| Android: crear `WEE` dentro de la carpeta elegida | No | Elegir la carpeta en el selector |
| Web Chromium: crear `WEE` dentro de la carpeta elegida | No | Elegir la carpeta; volver a conceder el permiso tras reabrir |
| Web sin File System Access: OPFS | Sí | Ninguna, pero NO es carpeta visible |

## Estructura bajo `WEE/`

- `WEE/proyectos/<projectId>/recursos/<recursoId>`: los archivos del usuario. Es lo único que se escribe dentro de la carpeta.
- El índice (`indice.json`), las copias de cada proyecto (`proyectos/<id>/proyecto.json`), las carátulas y la cuarentena van a AsyncStorage.
- La exportación (`.weeproy`) se escribe en la caché de la app (`wee_exportar/`) y se borra al terminar: nunca es un proyecto ni un archivo de `WEE`.
- Los temporales de escritura (`.tmp`, `.anterior`) y la prueba de la carpeta (`.wee-verificacion`) pasan por `WEE` un instante y se borran.

## Qué no hace esta línea

- No sincroniza ni hace copias en la nube. La nube queda desactivada y no se consume ningún Credit por operaciones locales.
- No importa de nuevo los proyectos de una carpeta tras reinstalar (DEFERIDO).
- No abre el contenido de los archivos dentro de Weë: «Abrir» verifica que cada archivo se puede leer y lo muestra con su estado; el visor de contenido es otra línea.
- No cambia permisos de Android, ni añade dependencias, ni toca `functions/src`.
- No prueba nada en un dispositivo real.
