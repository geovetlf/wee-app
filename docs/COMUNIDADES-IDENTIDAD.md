# Comunidades por identidad (Perfil Real / Perfil Weë)

Estado: **implementado solo en la demo local** (`wt-ui-migracion`, emulador `demo-wee-migracion`), 2026-11-05. Producción no se ha tocado: este documento diseña cómo llevarlo (§ 9). Decisiones del dueño 1–3 aprobadas el 2026-11-05.

## 1. Qué fallaba y por qué

| Fallo | Causa raíz |
|---|---|
| Unirse desde el Perfil Weë escribía la membresía en el Perfil Real | `CommunitiesManagementScreen` llamaba a `communityService.joinCommunity(user.uid, …)`: el uid de la **cuenta**, que es el del Perfil Real. |
| Crear una comunidad dejaba 3 miembros | `createCommunity` nacía con `memberCount: 1`, después llamaba a `joinCommunity` (+1) y la pantalla volvía a llamar a `joinCommunity` (+1). |
| Las creadas desde el Perfil Weë no salían en «Mis comunidades» | Se guardaba `createdBy: user.uid` (la cuenta) y la pantalla comparaba con el uid del perfil activo (`hidi_…`). |
| Una cara heredaba los permisos administrativos de la otra | Las reglas autorizaban por `request.auth.uid in moderators` / `createdBy == request.auth.uid`: la **cuenta**, compartida por las dos caras. |
| Caminos directos sin validar | Cualquier sesión movía `memberCount` (±1), escribía `members/{uid o hidi_uid}` y su `joinedCommunities`; `createdBy`/`moderators` (uids de cuenta) quedaban en el documento público. |

## 2. Modelo de datos

| Dónde | Qué | Quién lee | Quién escribe |
|---|---|---|---|
| `communities/{id}` | Lo público: nombre, slug, descripción, icono, normas, `memberCount`, `postCount`, `status`, `isOfficial`, `governance: 'identity'`, `creatorProfile` y `ownerProfile` = `{ ref, type }` | cualquiera | servidor (cliente: solo `postCount` ±1) |
| `communities/{id}/private/ownership` | `creatorIdentity`, `creatorAccountId`, `ownerIdentity`, `ownerAccountId`, `history[]`, `claimedFromLegacy?` | nadie (servidor) | servidor |
| `communities/{id}/members/{uid del perfil}` | `userId`, `identityType`, `accountId`, `role`, `joinedAt`, `postCount`, `reputation` | nadie (servidor) | servidor |
| `communitySlugs/{slug}` | reserva del slug | nadie | servidor |
| `communityOperations/{sha256(cuenta, petición)}` | idempotencia de `createCommunity` | nadie | servidor |
| `users/{perfil}.joinedCommunities` | lista de ESE perfil (Real o Weë) | cualquiera (perfil público) | servidor (el cliente solo al crear el perfil) |

- `ref` es la **entidad pública** del perfil (`entityId`, `ent_…`, ver `docs/IDENTITY.md` §4 y `utils/identidadPublica.ts`). Si el perfil aún no tiene entidad, `ref` es `null`: **nunca** se cae al `uid`, que es la cuenta (Perfil Real) o la lleva dentro (Perfil Weë). `type` es `real` o `wee`.
- El id de `members` es el `uid` del perfil, igual que antes: así las membresías heredadas se siguen reconociendo sin migrar nada. Como ese id delata la cuenta, la subcolección deja de ser legible por clientes.
- Papeles: `owner` (uno), `admin`, `moderator`, `member`, **por identidad**. Una cuenta puede tener sus dos caras en la misma comunidad: son dos documentos, dos membresías, dos papeles independientes, y el contador cuenta perfiles (el dueño una vez).

## 3. `createdBy` y los lectores antiguos

- **Datos existentes:** `createdBy` (cuenta) y `moderators` (cuentas) se quedan como están, con su significado de siempre. Nada los reescribe; tampoco `claimLegacyCommunity`.
- **Comunidades nuevas:** no se escribe `createdBy` ni uids en `moderators` (`moderators: []`), porque el documento es público y serían la cuenta. Lo dicen `creatorProfile`/`ownerProfile` (públicos) y `private/ownership` (cuentas).
- **Lectores antiguos:**
  - `utils/comunidadesDeWee.ts` trataba «sin `createdBy`» como muestra de Weë. Ahora mira también `creatorProfile`/`governance`.
  - Una app vieja que lea una comunidad nueva:
    - la verá sin autor;
    - no la listará como «suya» (sí como unida, por su `joinedCommunities`);
    - solo la traduciría como muestra si copiara exactamente el slug y la descripción sembrados de una destacada.
  - Ninguna app vieja se rompe al leer: todos los campos que usaba siguen existiendo.

## 4. Servidor (`functions/src/social/comunidades.ts`)

Mismo patrón que `social/econtact.ts`:

- Firestore inyectado (`createComunidadesEngine`).
- La identidad se comprueba contra `users` con `cuentaDeIdentidad` / `decidirIdentidad`: la cara existe, su `profileType` y su vínculo cuadran, y es de `request.auth.uid`.
- Cada escritura va en una transacción.
- Errores como código (`HttpsError(code, motivo, { motivo })`). Sin Credits ni IA.

| Callable | Qué hace | Quién |
|---|---|---|
| `createCommunity({ asIdentity, requestId, name, description?, icon?, rules? })` | Crea la comunidad en una transacción: 1 miembro (la cara, `owner`), la propiedad privada, la reserva del slug, la operación y la lista del perfil. Repetir `requestId` devuelve la misma; con la otra cara de la cuenta → `operacion-de-otra-identidad`. Slugs oficiales → `nombre-reservado`. | la cara activa |
| `joinCommunity({ asIdentity, communityId })` | Une esa cara. Si ya era miembro (también heredado), no suma. | la cara activa |
| `leaveCommunity({ asIdentity, communityId })` | Saca esa cara (la otra se queda). El dueño → `dueno-debe-transferir`. Si no era miembro, no resta. | la cara activa |
| `setCommunityRole({ asIdentity, communityId, targetIdentity, role })` | El dueño puede poner admin, moderator o member a cualquiera menos al dueño. Un admin solo pone moderator o member a quien está por debajo de admin. `owner` → `usa-transferencia`. | papel de la cara que actúa |
| `removeCommunityMember(...)` | Saca a otra identidad. Hace falta ser al menos moderator y estar por encima de ella. Al dueño no lo saca nadie. | ídem |
| `transferCommunityOwnership(...)` | Solo el dueño, y a un miembro. Puede ser la otra cara de su cuenta, pero como acto explícito. El dueño anterior pasa a admin. Cambia `ownerProfile` y lo privado, y anota el historial. Exige que `members` y `private/ownership` coincidan. | dueño |
| `updateCommunity(...)` | Cambia nombre, descripción, icono y normas. El slug no cambia. | owner / admin |
| `claimLegacyCommunity({ asIdentity, communityId })` | Para una heredada. Solo la cuenta de su `createdBy`, y eligiendo con qué cara. `createdBy` no se toca. | cuenta de `createdBy` |
| `listMyCommunities({ asIdentity })` | Membresías y papeles de **esa** cara, nunca de la otra. | la cara activa |

Oficiales: cualquiera se une, nadie las administra por identidad (`comunidad-oficial`). Heredadas sin reclamar: unirse y salir sí; administrar → `comunidad-heredada`. Un miembro heredado (sin `role`) es `member`: **nunca** se deduce de `createdBy` que una cara concreta sea la dueña, porque la app vieja escribía la cuenta aunque se creara desde el Perfil Weë.

## 5. Reglas (`firestore.rules`)

- `communities`:
  - `create` solo con el claim `admin` (las oficiales);
  - `update` solo `postCount`/`updatedAt`, de uno en uno: es de las publicaciones, que esta fase no cambia;
  - `delete` nunca.
- `members/**`, `private/**` y cualquier otra subcolección: cerradas a clientes.
- `communitySlugs`, `communityOperations`: cerradas.
- `users`: `!touchesCommunityFields()`. El cliente ya no cambia `joinedCommunities` tras crear el perfil.
- La autorización depende siempre del papel de la identidad concreta, que solo conoce el servidor. Real no hereda nada de Weë ni al revés.

## 6. Publicaciones, comentarios y avisos

**Sin cambios de estructura.** Se reutiliza el sistema de autoría existente, y la prueba lo verifica contra el emulador (`comunidades-identidad.emulator.mjs` § F):

- se publica, comenta y avisa con la cara Real o la Weë de la sesión, nunca con una ajena;
- `userId` no se reescribe, así que la identidad histórica se conserva;
- un aviso para una cara ajena no se lee.

Las reglas de esas colecciones siguen componiendo la forma heredada en línea (`docs/IDENTITY.md` §13).

## 7. App

- `services/comunidadesService.ts` (nuevo): envoltorio de las callables, `motivoDelError` y `nuevaPeticion`.
- `hooks/useCommunities.ts`: une y saca con el `userId` que recibe, que en `CommunityScreen`/`SearchScreen` es `userProfile?.uid`, la cara activa.
- `screens/CommunitiesManagementScreen.tsx`:
  - actúa con `userProfile?.uid`;
  - crea una sola vez, con un `requestId` por intento;
  - «Mis comunidades» = donde la cara activa es `owner` según `listMyCommunities`, o las heredadas cuyo `createdBy` coincide con esa cara, como antes.
- `services/communityService.ts` no se toca (lo protege `music.test` H2). Sus `joinCommunity`/`leaveCommunity`/`createCommunity` quedan sin llamadas y las reglas ya los rechazan.

## 8. Pruebas

| Suite | Qué | Resultado |
|---|---|---|
| `functions/test/comunidades-identidad.test.mjs` (en `npm test`) | La tabla de permisos completa (300 combinaciones de papel, más expulsión y transferencia), lo heredado, la referencia pública, el cableado de la app y las reglas | 34/34 |
| `functions/test/comunidades-identidad.emulator.mjs` | Contra el emulador, proyecto propio `demo-wee-comunidades`: creación, idempotencia y concurrencia, contadores, membresías por cara, papeles, transferencia, heredadas, reglas cerradas, autoría existente y aislamiento entre caras | 76/76; con las reglas viejas, 7 ✘ (sabotaje) |
| `integridad-11x4a`, `fronteras-rules`, `comunidades-siembra` (.emulator y .test) | Re-ancladas: el cliente ya no crea, administra ni cuenta | verdes |

```
cd functions
GCLOUD_PROJECT=demo-wee-comunidades FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node test/comunidades-identidad.emulator.mjs
```

## 9. Producción: despliegue compatible (diseño, NO ejecutado)

Orden: **Functions → reglas de transición → app → reglas finales.** Nada destructivo y ningún backfill obligatorio.

1. **Functions** (aditivo):
   - Se despliegan las nueve callables. Ningún cliente las usa todavía.
   - Índices: ninguno nuevo. La consulta por `slug` es de un solo campo, y `listMyCommunities` usa `getAll`, no un collection group.
2. **Reglas de transición** (ventana de compatibilidad). Desplegarlas con las Functions o justo después. Las apps viejas siguen funcionando, pero sin saltarse controles:
   - Crear desde el cliente con la forma de antes (`comunidadDeUsuario`) sigue permitido. Nace heredada, de la cuenta, como hoy, y no es `governance: 'identity'`.
   - Las comunidades `governance == 'identity'` quedan cerradas a escritura directa desde el primer día: ni contadores, ni miembros, ni papeles.
   - Unirse o salir con la app vieja en una comunidad (de cualquier tipo):
     - Se permite solo la forma heredada. El documento `members/{id}` lleva `id == auth.uid || id == 'hidi_' + auth.uid`, sin `role` ni `accountId`.
     - `memberCount` sube 1 solo si `!exists(miembro) && existsAfter(miembro)`, y baja 1 solo si `exists && !existsAfter`, en el mismo lote.
     - Así ya no se infla el contador. Un miembro heredado nunca obtiene papel: el servidor lo trata como `member`.
   - `members` deja de leerse públicamente. La app vieja no lo lee: `isMember` del servicio no tenía llamadas.
   - `users.joinedCommunities` sigue siendo escribible por el cliente durante la ventana, porque la app vieja lo usa.
3. **App nueva:**
   - usa las callables con la cara activa;
   - si se quiere acelerar, se fija la versión mínima;
   - se mide en los registros de las Functions qué fracción de uniones llega ya por ellas.
4. **Reglas finales** (las de la demo), cuando la versión mínima lo garantice:
   - fuera la creación directa, la unión heredada y `joinedCommunities` desde el cliente;
   - los clientes viejos que queden pueden leer, pero no escribir comunidades.
5. **Marcha atrás:** volver a las reglas de transición. Las Functions son aditivas y los datos nuevos son compatibles con lectores viejos (§ 3).

Datos heredados:

- No se migran.
- `createdBy` se conserva.
- Las comunidades heredadas solo tienen dueño por identidad si su cuenta las reclama (`claimLegacyCommunity`).
- Las membresías que la app vieja escribió en el Perfil Real por error siguen ahí: no se mueven a la cara Weë, porque eso sería inventar a qué cara pertenecían.

## 10. Pendiente y límites (decisiones del dueño)

- **Falta la UI de administración** (papeles, expulsar, transferir, reclamar). El backend está listo y probado. Cada texto nuevo exige sus claves en los 42 idiomas, así que no se añadió. Hoy, si el dueño intenta salir, ve `communities.leaveFailed`; un mensaje específico («transfiere antes») necesita una clave nueva.
- `postCount` sigue escribible por el cliente, de uno en uno. Es de las publicaciones y quedó fuera de alcance. No hay llamadas a `incrementPostCount` en la app.
- Las comunidades heredadas siguen enseñando `createdBy`/`moderators` (uids de cuenta) en lo público. Limpiarlo reescribiría historia: necesita autorización expresa.
- Perfiles sin entidad: `ref: null` hasta que nazcan (`docs/IDENTITY.md` §12.1).
- Una misma sesión es dueña de sus dos caras. El aislamiento entre caras está en la autorización: cada acción decide con el papel de la cara con la que se actúa, y `listMyCommunities` solo devuelve esa cara. Los documentos con papeles y cuentas no los lee ningún cliente.
