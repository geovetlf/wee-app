# Privacidad de Face Swap (H-2)

Línea P · rama `wee/trk-p-privacidad` · base `8fcc5c0`. Estado: **PREPARADO-NO-DESPLEGADO**. Nada de esto está en producción.

## 1. El defecto (verificado)

- `screens/AiAvatarScreen.tsx` («subir foto») subía la selfie y asignaba su URL a `photoURL`, `photoURLThumbnail` y `aiAvatarPortraitUrl`. El original pasaba a ser la foto pública del perfil.
- `services/avatarGenerationService.ts` pedía `getDownloadURL` sobre la selfie. Esa URL lleva un **testigo de descarga**, y quien la tiene lee el archivo sin pasar por las reglas de Storage.
- Reproducido con el SDK de cliente real contra el emulador (dos personas distintas):
  - la dueña sube su selfie a `users/<uid>/face-swap/` y la lee;
  - otra persona NO la lee (`storage/unauthorized`) ni consigue su dirección;
  - pero `getDownloadURL` de la dueña devuelve una dirección con testigo, y esa dirección la abre cualquiera sin sesión (E6 de la suite de emulador).
- Evidencia: `scratchpad/exp/exp-token2-out.txt` (experimento) y `functions/test/privacidad-face-swap.emulator.mjs`.

## 2. Qué garantiza ahora

1. **El original nunca recibe testigo desde la app.** El cliente no pide `getDownloadURL` sobre `face-swap` (`uploadImageForSwap` devuelve la RUTA). El servidor lee el original con el Admin SDK y no crea testigos para él.
2. **El original nunca se asigna al perfil.** La decisión (`utils/fotoDePerfil.ts`) rechaza cualquier ruta `users/<uid>/face-swap/`, con o sin forma de dirección, con testigo, codificada o doblemente codificada.
3. **El perfil solo recibe un RESULTADO generado** (`ai-avatar` o `avatar-replacement` de la propia cuenta), que la persona elige, o una **foto pública explícita** de Cloudinary.
4. **El servidor no devuelve ni guarda el original.** La respuesta de `avatarReplacement` es solo `{ imageUrl }` del resultado. El original se lee por `gs://` sin testigo.
5. **Los perfiles ya contaminados se limpian.** La retirada (§4) quita la selfie de los campos de foto de los perfiles propio y Weë al cargarlos.

## 3. Decisiones

| decisión | motivo |
|---|---|
| El callable recibe `selfiePath` (la ruta). | Es lo que pide el encargo: nada de direcciones con testigo en la entrada. |
| Una `selfieUrl` antigua se acepta **solo si es de la propia cuenta y de `face-swap`**, y se convierte a ruta. El testigo se descarta. | Compatibilidad con clientes en uso. Una dirección ajena, de otro cubo o fuera de `face-swap` se rechaza con el mensaje de siempre (`assertInputImageUrl`), antes de cobrar. |
| La selfie se valida con la misma puerta que el resto de Weë AI (`direccionDeLaCuenta`) más el prefijo `face-swap/`. | Una sola regla de cuenta y de cubo, no una copia. |
| La decisión de foto de perfil es **pura** (`utils/fotoDePerfil.ts`) y se prueba tal cual. | Que se pueda probar sin Firebase ni React, y que el cliente y las pruebas usen el mismo código. |
| La retirada usa `usersService.update` (la escritura que ya usa el contexto) y vacía los campos con `''`. | No hay una función que quite la foto; `updateProfile`/`usersService.update` ya escriben el perfil. Vacío = «sin foto» para `AvatarDisplay`. |
| La retirada va en efectos aparte, no dentro de `loadUserProfiles`. | Esa función se prueba en aislamiento (`efectos-vigentes`); un identificador nuevo dentro la rompía. |
| `storage.rules` **no cambia**. | Las reglas de A2 ya dan lo que hay que dar: el propietario lee su original, nadie más lo lee, no se sobrescribe ni se borra, y el emulador lo confirma (E0–E4). Un testigo no se puede bloquear con reglas sin bloquear también la lectura del propietario, que el encargo pide. |

## 4. La retirada

`utils/fotoDePerfil.ts → retiradaDeOriginal(perfil)`: si `photoURL`, `photoURLThumbnail` o `aiAvatarPortraitUrl` guarda un original, devuelve el parche: esos campos a `''`, y, si la foto que se veía era el original, `avatarType: 'predefined'` con el `avatarId` que tuviera (o `male`). Sin original devuelve `null`.

Se aplica en `contexts/UserProfileContext.tsx` con dos efectos (perfil propio y Perfil Weë), con la misma escritura que la auto-corrección de `photoURLThumbnail` que ya existía.

**Lo que falta:** una acción manual de «quitar foto» para la persona. Hoy no existe, y añadirla exige texto de interfaz. Clave propuesta: `aiAvatar.removeProfilePhoto` (ES y EN). No se añade aquí, porque `i18n/` queda fuera de esta línea.

## 5. Diff

| fichero | cambio |
|---|---|
| `functions/src/generateAvatar.ts` | `avatarReplacement`: puerta de la selfie (`resolverOrigenDeSelfie`), reemplazo testable (`reemplazoDeAvatar`), sin registrar URLs. Import de `direccionDeLaCuenta` y `nombreDelCuboDeWee`. |
| `utils/fotoDePerfil.ts` | **nuevo**. Decisión pura y retirada. |
| `services/avatarGenerationService.ts` | `uploadImageForSwap` devuelve la ruta; `performAvatarReplacement` manda `selfiePath`; `cuboDeWee`; sin `getDownloadURL`. |
| `screens/AiAvatarScreen.tsx` | «subir foto» sin escrituras de perfil y con vista previa local; guardas de la decisión en «usar como avatar», «usar el intercambio como foto» y el botón de la vista de resultado; el botón «usar sin intercambio» se oculta con una vista previa de original. |
| `screens/CreateScreen.tsx` | La selfie va por ruta (nombre de variable). |
| `contexts/UserProfileContext.tsx` | Import y dos efectos de retirada. `loadUserProfiles` sin cambios. |
| `functions/test/privacidad-face-swap.test.mjs` | **nuevo**. 53 comprobaciones. |
| `functions/test/privacidad-face-swap.emulator.mjs` | **nuevo**. Reglas reales con el SDK de cliente. |
| `storage.rules` | **sin cambios** (diff vacío). |

Cifras del diff: ver `git diff --stat 8fcc5c0..HEAD`.

## 6. Plan de reversión

- **Código:** `git revert <commit>` del commit de código (`1625c88`) restaura el cliente y el servidor anteriores. El servidor antiguo acepta `selfieUrl` y el cliente antiguo espera una URL: el orden de vuelta es el mismo que el de despliegue (§8).
- **Reglas:** no hay cambio que revertir.
- **Retirada:** es una escritura de datos. Si se revierte el código, deja de correr, pero los perfiles ya limpiados no recuperan la selfie (sus testigos viejos no se restauran). Eso es lo deseado; no hay que «deshacer» la privacidad.
- **Remedio de originales antiguos (§7.1, no ejecutado):** copiar el original a un nombre nuevo sin testigo, comprobar el contenido y borrar el viejo. Es irreversible para el objeto viejo: para poder volver atrás, hay que guardar una copia de los bytes en un lugar restringido antes del borrado. No se hace aquí.

## 7. Riesgos residuales (no resueltos en esta línea)

1. **Originales antiguos con testigo.** Antes de este cambio, la app creó testigos para selfies reales, y esos testigos siguen valiendo mientras el objeto exista. Remedio: para cada `users/*/face-swap/*` antiguo, el servidor **copia** el original a un nombre nuevo **sin testigo**, comprueba que el contenido es el mismo y **borra** el viejo. La dirección vieja deja de abrir (403), y también las copias de esa dirección que hay en otros documentos (`conversations.participantsData.photoURL`, `notifications.senderAvatar`, `businesses/*/reviews.userAvatar`), que mostrarán la imagen rota. **Verificado en emulador (E7a–E7c).** **No se ha usado la rotación del testigo por metadatos**: en el emulador, la dirección vieja sigue abriendo tras cambiar el testigo, y no se puede comprobar en Firebase real desde aquí. **No se ejecuta sobre datos reales**: requiere autorización (§8).
2. **Creator y Brain usan testigos.** `users/<uid>/creator-inputs` y `brain-attachments` se leen por testigo para los proveedores. Es la misma clase de riesgo, pero fuera del alcance de este encargo (un cambio rompería Creator). **DEFERIDO**: recomendado aplicar el mismo patrón por ruta en una línea propia.
3. **Resultados con testigo.** `avatar-replacement` y `ai-avatar` son resultados generados que la app muestra con su testigo. Un resultado que la persona no elige también queda accesible por su dirección. **DEFERIDO**: política de retención de resultados no elegidos (decisión de producto).
4. **El propietario puede pedir un testigo para su original.** Es una capacidad del SDK; la app no la usa (grep §9). La regla de lectura del propietario se mantiene porque el encargo la pide.

## 8. Autorización separada para desplegar

**No se despliega nada.** Para desplegar hace falta una autorización explícita del dueño, por separado, con este orden:

1. **Funciones** (`avatarReplacement`, grupo de despliegue de `generateAvatar.ts`): primero, porque el servidor nuevo acepta el cliente antiguo (`selfieUrl`). Se despliega desde `main` con el workflow de `docs/DEPLOYMENT.md`. Es código vivo en producción (guardián: CRITICAL).
2. **Cliente** (app): después, con la versión que manda `selfiePath`.
3. **Remedio de originales antiguos** (§7.1): solo con autorización expresa, tras una lista de los objetos `users/*/face-swap/*` y con la copia de seguridad de §6 si se quiere poder volver atrás.
4. **Reglas de Storage**: no cambian en esta línea. Pero las vivas (`ced0585`) difieren de las del repositorio: `users/{uid}/avatar-replacement` tiene `allow read: if true` en producción. Desplegar las reglas del repositorio (incluida la corrección de A2) es la decisión D-D, aparte.

## 9. Verificación (comandos)

```
# Sin testigo para el original en el cliente (antes / después)
grep -rn "getDownloadURL" services screens components hooks utils contexts functions/src --include=*.ts --include=*.tsx | grep -v /lib/

# Pruebas unitarias (puerta, reemplazo, decisión, retirada, lectura estática)
node functions/test/privacidad-face-swap.test.mjs

# Pruebas de emulador (reglas reales, dos personas, puertos libres antes)
JAVA21_HOME=C:/Users/Geovet/AppData/Local/wee-tools/jdk-21.0.12.1+1 node functions/test/_emuladores.mjs --solo privacidad-face-swap
```

Antes: `scratchpad/exp/grep-antes.txt` (10 usos de `getDownloadURL`, 28 líneas). Después: `scratchpad/exp/grep-despues.txt` (8 usos, sin ninguno sobre `face-swap`).
