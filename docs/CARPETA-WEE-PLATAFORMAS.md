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

- **Expo, `expo-file-system`:** https://docs.expo.dev/versions/latest/sdk/filesystem/. **Versión instalada: 19.0.24** (`package.json`: `~19.0.21`). Revisado contra el paquete instalado (2026-10-10): su plugin (`plugin/build/withFileSystem.js`) **no tiene opciones de iOS**. `enableFileSharing` y `supportsOpeningDocumentsInPlace` no aparecen en ningún fichero del paquete, y el plugin solo añade `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` e `INTERNET`. La cita de la documentación en línea no corresponde a esta versión. Weë no lista ese plugin en `plugins`: declara `UIFileSharingEnabled` y `LSSupportsOpeningDocumentsInPlace` directamente en `ios.infoPlist` de `app.json`, que es la forma que pedía el encargo.
- **Apple, `UIFileSharingEnabled`:** https://developer.apple.com/documentation/bundleresources/information_property_list/uifilesharingenabled
- **Apple, `LSSupportsOpeningDocumentsInPlace`:** https://developer.apple.com/documentation/bundleresources/information_property_list/lssupportsopeningdocumentsinplace

Las dos páginas de Apple devolvieron solo su título al consultarlas, así que **el texto oficial de Apple no se ha citado literalmente**. Los nombres exactos de las claves y su tipo booleano coinciden entre Expo y el conocimiento de Apple, pero el texto oficial queda PENDIENTE DE VERIFICAR con un navegador. Esta es la única parte del documento que no está comprobada contra la fuente primaria.

## API de almacenamiento y permisos por plataforma

### Web y navegador de escritorio

- **Carpeta elegida por el usuario:** File System Access (`window.showDirectoryPicker()`), solo en navegadores basados en Chromium. El `FileSystemDirectoryHandle` se guarda en IndexedDB.
- **Permiso:** no es automático al volver a abrir la página. Hay que pedirlo de nuevo con un gesto del usuario. La pantalla lo explica y ofrece «Volver a permitir el acceso».
- **Sin soporte:** OPFS (`navigator.storage.getDirectory()`). Es un espacio PRIVADO del origen, real y persistente para el navegador, pero NO es una carpeta visible en el sistema de archivos. La pantalla lo dice con el texto `permisoPrivado`.
- **Índice y copias:** van a AsyncStorage, que en la web es el `localStorage` del origen (cuota de unos 5 MB). Nunca aparecen en la carpeta elegida.
- **Espacio libre:** la carpeta del ordenador no lo expone, así que la sección dice «no se puede medir» (`null`, nunca 0). `navigator.storage.estimate()` solo se usa en OPFS, donde mide la cuota del origen, que sí es el espacio disponible para Weë.
- **Límite:** solo la carpeta que el usuario selecciona. No se crea nada en una ubicación arbitraria.

### Android (nativo)

- **API:** `StorageAccessFramework` de `expo-file-system/legacy`. `requestDirectoryPermissionsAsync` abre el selector del sistema. `makeDirectoryAsync` crea `WEE` dentro de la carpeta elegida; `readDirectoryAsync` lista el contenido. El nombre de cada hijo se deduce de su URI (`nombreDeUriSAF`, `services/almacenLocal/puertosDeUbicacion.ts`), porque la API no da el nombre visible.
- **Permiso:** el usuario elige la carpeta en el selector del sistema, y el permiso se guarda con `takePersistableUriPermission` (verificado en `expo-file-system/android/.../legacy/FileSystemLegacyModule.kt`, rama `OnActivityResult`). El flujo SAF no pide permisos generales. `app.json` no declara ningún permiso de Android.
- **Manifiesto generado (no versionado; lo produce el build):** sí trae permisos de almacenamiento general que la carpeta WEE no necesita. `READ_EXTERNAL_STORAGE` y `WRITE_EXTERNAL_STORAGE` llegan de los manifiestos de `expo-file-system`, `expo-media-library` y `expo-image-picker`; `expo-image-picker` añade además `CAMERA`, y el plugin de `expo-media-library` añade `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO` y `READ_MEDIA_AUDIO`. Son de la galería, no de WEE. `MANAGE_EXTERNAL_STORAGE` no aparece en ningún manifiesto instalado. Retirar los genéricos exige una decisión de producto (ver «Pendiente»).
- **Revocación:** al reabrir, `comprobarReferencia` intenta leer la carpeta. Si el sistema ya no la deja leer, la sección pasa a «permiso perdido». En Android el permiso perdido no se concede en sitio: «Volver a permitir» lleva a elegir la carpeta otra vez (`volverAPermitirSeccion`). Antes ese botón devolvía el mismo estado y la sección quedaba bloqueada.
- **Proveedores de documentos:** Android da ids de documento. Si el proveedor no usa ids con forma de ruta (`volumen:ruta`), el nombre no se puede leer, y `crearWee` lo detecta: borra la carpeta recién creada y falla con `no_disponible`, en vez de crear carpetas nuevas en cada escritura. No se ha probado en un dispositivo qué proveedores dan nombres legibles.
- **Límites:** no hay acceso a rutas restringidas del sistema ni a `Android/data`. Solo la carpeta elegida.
- **Desinstalación:** la carpeta elegida (por ejemplo `Documentos/WEE`) está fuera del almacenamiento de la app, así que sus archivos pueden seguir ahí. Pero el índice y las copias están en AsyncStorage y se borran con la app. Resultado: tras reinstalar, Weë **no lista** esos archivos y **no los borra** (ver la regresión de `utils/catalogoLocal.ts` en `docs/LOCAL-FIRST-AUDITORIA.md`). Volver a importarlos no está implementado (DEFERIDO). PENDIENTE DE DISPOSITIVO.

### iOS (nativo)

- **Carpeta de la app:** `WEE` dentro del directorio de documentos de la app (`expo-file-system` `documentDirectory`). No requiere permiso y se crea sin acción del usuario. No hay selector de carpetas: `expo-document-picker` no está instalada.
- **Visibilidad:** `app.json` → `ios.infoPlist` declara `UIFileSharingEnabled: true` y `LSSupportsOpeningDocumentsInPlace: true`. Con ellas, la app Archivos debería mostrar la carpeta de documentos de Weë, y dentro `WEE` (comportamiento esperado de iOS, PENDIENTE DE DISPOSITIVO: no hay un iPhone conectado). Que `UIFileSharingEnabled` la exponga también por el uso compartido de archivos de iTunes (Finder, al conectar el iPhone a un ordenador) es una afirmación no verificada en esta versión: PENDIENTE DE DISPOSITIVO.
- **Índice y copias:** van a AsyncStorage (el almacén de preferencias de la app, fuera de los documentos). Así nada interno aparece en Archivos.
- **Desinstalación:** elimina el sandbox y su contenido. Es irreversible sin una exportación previa. PENDIENTE DE DISPOSITIVO.

#### Efecto de compartir los documentos en iOS

Lo que debería ver la persona en la app Archivos, en «En mi iPhone › Weë» (PENDIENTE DE DISPOSITIVO): la carpeta `WEE` con una subcarpeta por proyecto (`proyectos/<id>/recursos/`). Puede abrir los archivos, editarlos y borrarlos desde Archivos. Weë no lo impide, y eso es lo que significa `LSSupportsOpeningDocumentsInPlace`: la app trabaja sobre el archivo en su sitio.

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

## Pendiente (revisión del 2026-10-10)

**Solo se verifica en un dispositivo** (hoy no hay ninguno conectado; las pruebas usan dobles):
- Android: que el permiso SAF sobreviva a un reinicio; qué pasa al revocarlo desde los ajustes del sistema; qué proveedores de documentos dan nombres legibles (`nombreDeUriSAF`); y si la app destino puede leer el `.weeproy` después de que `shareAsync` resuelva, porque el temporal de la caché se borra en ese momento.
- iOS: que la app Archivos muestre `WEE` y solo eso; que ninguna librería escriba en `documentDirectory`; y que un corte deje como mucho un `.tmp`/`.anterior` visible hasta la siguiente apertura.
- Web (Chromium real): renovar el permiso con el gesto; y el comportamiento si la persona borra la carpeta elegida desde el sistema.

**Decisiones de producto abiertas** (no se cambian en esta línea):
- Quitar `READ_EXTERNAL_STORAGE`/`WRITE_EXTERNAL_STORAGE` del manifiesto generado. Lo traen las librerías de medios; quitarlos puede afectar a guardar en la galería en versiones antiguas de Android (hay que verificarlo en un dispositivo).
- Mostrar el espacio libre de la carpeta web como «no se puede medir» (lo que hace ahora) o buscar otra fuente.
- Nombres de SAF fiables en cualquier proveedor: exige un módulo nativo que lea el nombre visible (`DocumentFile`) o `expo-document-picker`, que no está instalado y requiere autorización.
- Limpieza del temporal de exportación en Android: hoy se borra al resolver la hoja de compartir; la alternativa es borrarlo en la siguiente exportación o al arrancar.
