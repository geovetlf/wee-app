# Privacidad de identidades (Perfil Real ↔ Perfil Weë): decisión STRICT

**Decisión del dueño (2026-11-07, definitiva):** nunca revelar automáticamente que dos perfiles son de la misma cuenta.
- **Alcance:** ËContact y ẄContact, búsquedas, solicitudes, conversaciones, respuestas del backend, APIs y callables, registros, consultas públicas, errores, notificaciones y relaciones entre perfiles.
- **Sin excepciones.**

Este documento dice **qué vías revelaban o revelan el vínculo**, cuáles se cierran en la rama `weetalk/privacidad-estricta`, cuáles están preparadas a falta de pasos de producción, y cuáles **solo se cierran con una migración que espera autorización**.

## 1. Vías por las que se reconstruía o se reconstruye el vínculo

| # | Vía | Estado | Dónde |
|---|---|---|---|
| 1 | Las callables `requestEContact` y `acceptEContact` devolvían `accountUid` de las dos partes: quien pide recibía la **cuenta** de la otra persona | **CERRADA en esta rama** | `relacionPublica` (econtact.ts); el cliente ya no la espera |
| 2 | El cliente escribía `recipientAccountId` (la cuenta de quien recibe) en el aviso de ËContact | **CERRADA en esta rama** | `econtactService` y `notificationService`; el campo queda solo como lectura heredada |
| 3 | Los registros de `burnViewOnce` imprimían la ruta `users/<cuenta>/weetalk/…` junto al mensaje | **CERRADA en esta rama** | weetalk.ts |
| 4 | El registro del cupo de avisos imprimía la cuenta del remitente | **CERRADA en esta rama** | index.ts (`gastarCupoDeAvisos`) |
| 5 | `users` se lee **sin sesión** y lleva `linkedAccountId`, `email`, saldo, país… | **PREPARADA, no publicada** | La fase 2 (`ops/despliegue/reglas/users-cierre.fase2.rules`) deja `users` solo a su dueño. La bloquea a propósito `ops/permitido.mjs` → `cierreDeUsers` hasta el espejo desplegado, el relleno verificado y el cliente nuevo publicado. El cliente ya lee lo ajeno de `publicProfiles` |
| 6 | El identificador de la cara Weë es `hidi_` + la cuenta, en `users.uid`, `publicProfiles.uid`, publicaciones, votos, conversaciones (`participants`), mensajes (`senderId`), avisos y ËContact | **ABIERTA: requiere migración** | `identidadWeeDe` (utils/econtactModel.ts); las reglas lo usan (`misIdentidadesHeredadas`) |
| 7 | La existencia de `publicProfiles/<id de la cara Weë>` es comprobable por cualquiera (`allow get: if true`): dice si una cuenta tiene cara Weë | **ABIERTA: requiere migración** | consecuencia de 6 |
| 8 | Las fotos «ver una vez» viven en `users/<cuenta>/weetalk/…`, y esa ruta va dentro de su URL, que ve quien recibe | **ABIERTA: requiere cambiar la ruta** | storageService.ts y storage.rules |
| 9 | Las carpetas de Cloudinary `messages/<cara>` y `audio/<cara>` | **ABIERTA**: llevan la cara, que hoy es reversible por 6 | cloudinaryService.ts |
| 10 | Los datos del push llevan `senderId` (la cara) | Aceptable cuando 6 esté cerrada | index.ts |

**Pruebas:**
- `functions/test/privacidad-identidades.test.mjs` (en la cadena): las vías 1-4 y la proyección pública sin datos de la cuenta, con controles.
- `functions/test/privacidad-identidades.emulator.mjs`: la vía 5 con la fase 2 compuesta, sin aplicarla:
  - anónimo y otra cuenta no leen `users`;
  - no se correlaciona por `linkedAccountId`;
  - la enumeración está acotada;
  - las funciones sociales siguen.
- Las dos suites imprimen como **riesgo vigente** las vías 6 y 8.

## 2. Por qué 6, 7 y 8 no se cierran con una regla

`firestore.rules` ya lo dejó escrito como riesgo residual aceptado (F-06, D3): de un post del Perfil Weë se llega al Perfil Real «en dos lecturas, con o sin `linkedAccountId`».
- Mientras el identificador de la cara Weë **sea** la cuenta con un prefijo, cualquier dato público que lo nombre revela el vínculo.
- El cierre real son **identificadores opacos**, con el vínculo solo en el servidor.

## 3. Diseño de la migración a identificadores opacos (para aprobación, NO ejecutada)

1. **Identificador nuevo.** Cada cara Weë recibe un `entityId` opaco y aleatorio, no derivable de la cuenta. El campo ya existe en la lista blanca de `publicProfiles`.
   - El vínculo cara → cuenta vive **solo en el servidor**, en una colección privada (por ejemplo `entities/{entityId}.ownerAccountId`) que ningún cliente lee.
   - *(Opcional, a decidir: hacer lo mismo con la cara Real, si el uid de Firebase tampoco debe ser público.)*
2. **Autorización sin prefijo.** Las reglas dejan de calcular `'hidi_' + request.auth.uid`. Saben qué caras son de quien llama por:
   - un **custom claim** con la lista de sus caras, que pone el servidor al crear la cara y refresca el cliente; o
   - un documento privado por cuenta, leído con `get()` en las reglas, con coste de una lectura por petición.

   Recomendado: el claim.
3. **Datos a reescribir** (identidad `hidi_<cuenta>` → `entityId`):
   - `users` (id y `uid`) y `publicProfiles`;
   - publicaciones y comentarios (autor);
   - votos, likes y seguidores;
   - comunidades (miembros y dueño);
   - conversaciones (`participants`, claves de `participantsData`, `lastMessage.senderId`, `activeInChat`) y mensajes (`senderId`);
   - avisos (`senderId`, `recipientId`);
   - `econtacts` (`users`, `requestedBy`, `requestedTo` y **el id del documento**, que es la pareja ordenada);
   - el índice del bloqueo (`weetalkBloqueos*`);
   - las rutas de Storage de lo que se escribe a partir de ahora.
4. **Cómo se migra sin cortar el servicio:**
   - **(a) doble escritura:** el cliente nuevo escribe ya con `entityId`, y el servidor acepta las dos formas;
   - **(b) relleno por lotes, idempotente y con verificación de recuentos:** el modelo es `scripts/rellenar-perfiles-publicos.mjs` y su verificación;
   - **(c) lectura compatible** mientras dure;
   - **(d) corte:** las reglas solo aceptan `entityId`;
   - **(e) limpieza de los `hidi_`** de los datos públicos.
   - Fotos «ver una vez»: ruta nueva `weetalk/<conversación>/<aleatorio>`, con storage.rules por participación. Las ya quemadas no cambian.
5. **Vuelta atrás:** hasta (d), basta volver al cliente anterior, porque los datos antiguos siguen. Después de (d), se vuelve con el mapa privado `entityId ↔ hidi_`, que se conserva hasta cerrar la migración.
6. **Pruebas:**
   - las de esta rama pasan a exigir que ningún dato legible por otra persona contenga un identificador derivable de su cuenta;
   - emulador con el relleno sobre un conjunto sintético;
   - recuentos antes y después;
   - CI completa.
7. **Tamaño:** XL. Toca reglas, cliente, funciones y datos de producción.
   - Requiere tu autorización explícita y una ventana de migración.
   - **No se ejecuta ninguna migración real sin esa autorización.**

## 4. Lo que falta para que WeeTalk cumpla STRICT

1. Autorizar y ejecutar la migración del § 3: vías 6, 7, 8 y 9.
2. Los pasos de producción de la fase 2 de `users` (vía 5): desplegar el espejo, rellenar y verificar, publicar el cliente nuevo y publicar las reglas. Cada uno necesita su autorización.
3. Mientras tanto, las vías 1-4 quedan cerradas en esta rama.
