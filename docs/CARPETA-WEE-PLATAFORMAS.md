# Carpeta física «WEE»: auditoría de plataformas

Estado: auditoría VERIFICADA contra el repositorio (rama de integración, 2026-10-08). Lo que solo puede comprobarse en un dispositivo real está marcado como PENDIENTE DE DISPOSITIVO. No es una promesa de comportamiento.

## Plataformas reales de Weë

| Plataforma | Evidencia | Estado |
|---|---|---|
| Web (navegador) | `app.json` → `platforms` incluye `web`; `react-native-web` ^0.21.0 | Existe |
| PWA | No hay `manifest` ni service worker propios en `public/` (solo `landing.html`, `privacy-policy.html`, `support.html`, `terms.html`). El manifiesto que sale de `app.json` › `web` no se ha verificado en un despliegue | DESCONOCIDO |
| Android nativo | `app.json` → `platforms` incluye `android`; Expo SDK 54; `expo-file-system` ~19.0.24 | Existe (build local; no hay dispositivo conectado para probarlo: `adb devices` sin dispositivos) |
| iOS nativo | `app.json` → `platforms` incluye `ios`; `Info.plist` sin `UIFileSharingEnabled` ni `LSSupportsOpeningDocumentsInPlace` | Existe |
| Escritorio | No hay Electron ni Tauri en `package.json`. El escritorio es el navegador | No existe como app nativa |

## API de almacenamiento y permisos por plataforma

### Web y navegador de escritorio

- **Carpeta elegida por el usuario:** File System Access (`window.showDirectoryPicker()`), solo en navegadores basados en Chromium. El usuario elige la carpeta en el selector del navegador. Se guarda el `FileSystemDirectoryHandle` en IndexedDB.
- **Permiso:** no es automático al volver a abrir la página. Hay que pedirlo de nuevo con un gesto del usuario (`queryPermission` y `requestPermission`).
- **Sin soporte:** OPFS (`navigator.storage.getDirectory()`), almacenamiento privado del origen. Es real y persistente para el navegador, pero NO es una carpeta visible en el sistema de archivos. Hay que presentarlo así.
- **Sobrevive al cierre:** la carpeta sí; el permiso no, hasta que el usuario lo vuelva a conceder.
- **Actualizaciones y reinstalación:** el handle y OPFS se borran si el usuario limpia los datos del sitio. PENDIENTE DE VERIFICAR por navegador.
- **Límite:** solo la carpeta que el usuario selecciona. No se crea nada en una ubicación arbitraria.

### Android (nativo)

- **API:** `StorageAccessFramework` de `expo-file-system/legacy`. `requestDirectoryPermissionsAsync(initialFileUrl?)` abre el selector del sistema (anotado como Android 11+ en `build/legacy/FileSystem.d.ts`). `makeDirectoryAsync(parentUri, dirName)` crea la subcarpeta; `readDirectoryAsync` lista el contenido.
- **Permiso:** el usuario elige la carpeta en el selector del sistema. No se piden permisos de almacenamiento general (`READ_EXTERNAL_STORAGE`, `MANAGE_EXTERNAL_STORAGE`). `app.json` no declara permisos de Android, así que esto se mantiene.
- **Límites:** no hay acceso a rutas restringidas del sistema ni a `Android/data`. Solo la carpeta elegida.
- **Sobrevive al cierre, al reinicio, a las actualizaciones y a la desinstalación:** PENDIENTE DE DISPOSITIVO. No se puede afirmar sin probarlo en un dispositivo real.

### iOS (nativo)

- **Carpeta de la app:** el directorio de documentos de la app (sandbox). No requiere permiso y se crea sin acción del usuario.
- **Visibilidad:** la app Archivos solo la muestra si se activan `UIFileSharingEnabled` y `LSSupportsOpeningDocumentsInPlace`. No están configuradas. Activarlas es una decisión de producto, no técnica.
- **Carpeta externa:** no existe selector de carpetas en esta configuración. `expo-document-picker` no está instalada; añadirla es una dependencia nueva que requiere autorización.
- **Sobrevive al cierre:** sí. **Desinstalación:** elimina la carpeta y su contenido. Es irreversible sin una exportación previa. PENDIENTE DE DISPOSITIVO para el resto de casos.

## Qué se puede automatizar y qué requiere una acción del usuario

| Caso | Automático | Acción del usuario |
|---|---|---|
| iOS: crear `WEE/` en el sandbox | Sí, sin permiso | Ninguna |
| Android: crear `WEE/` dentro de la carpeta elegida | No | Elegir la carpeta en el selector |
| Web Chromium: crear `WEE/` dentro de la carpeta elegida | No | Elegir la carpeta; volver a conceder el permiso tras reabrir |
| Web sin File System Access: OPFS | Sí | Ninguna, pero NO es carpeta visible |

## Estructura propuesta bajo `WEE/`

- `WEE/Proyectos/<projectId>/`: archivos de cada proyecto local.
- `WEE/Recursos/`, `WEE/Exportaciones/` y `WEE/Miniaturas/`: solo cuando hagan falta. No se crean las cuatro por defecto.
- Las cachés y los temporales van fuera de `WEE/`, en el directorio de caché, con su propia política.
- No se guardan credenciales, secretos ni tokens dentro de `WEE/`.

## Qué no hace esta auditoría

- No implementa la carpeta. Eso es trabajo de la línea de almacenamiento local (B1).
- No cambia `app.json`, `Info.plist` ni permisos de Android.
- No añade dependencias.
- No prueba nada en un dispositivo real: no hay dispositivo conectado.
