# Política de Storage contra la sobrescritura

Línea A2 · rama `wee/activos-politicas` · base `9469e3a`. Commits: `f830682` (reglas, prueba y nombre con azar), `ce9bd85` (retirada de los borrados del cliente sin llamadores).

**Estado:** IMPLEMENTADO y PROBADO en el emulador de Storage. **PREPARADO-NO-DESPLEGADO.** Las reglas de producción no cambian hasta que el dueño apruebe el despliegue (decisión D-D, §7).

## 1. Qué garantiza

1. **Ningún cliente sobrescribe un objeto que ya existe** en las rutas que escribe la app. La subida solo crea (`allow create` con `resource == null`). En Storage, sobrescribir se evalúa como creación sobre un objeto existente, así que la regla lo deniega.
2. **Ningún cliente cambia ni borra** un objeto de esas rutas (`allow update, delete: if false`), ni cambia sus metadatos (PATCH).
3. **Las lecturas no cambian** (§2).
4. **El servidor no está afectado.** Usa Admin SDK, que no pasa por estas reglas, y puede sobrescribir y borrar. Lo que se borra, se borra en el servidor (`deleteAsset`, `burnViewOnce`).
5. **Denegación explícita** para cualquier ruta no listada (catch-all).

Lo que NO garantiza:
- No impide que una copia de la URL de un objeto siga apuntando a él. Eso es el hallazgo H-3 del inventario (`docs/ACTIVOS-INVENTARIO-REFERENCIAS.md`).
- No decide qué objetos se borran. Esa decisión es D-G.
- No cierra el legado `images/*` a la creación (§2 y §7).

## 2. Por ruta

Antes de esta línea, las rutas de la app tenían `allow write` para el dueño, que incluía sobrescribir. El borrado solo se denegaba porque `request.resource` es nulo en un borrado (error de evaluación, no una regla pensada para eso).

| ruta | lectura | escritura del cliente: antes → ahora | decisión y motivo |
|---|---|---|---|
| `users/{uid}/creator-inputs` | dueño | antes: crear y sobrescribir (el borrado se denegaba por un error de evaluación) → ahora: solo crear | Entrada de Weë Creator. Las subidas usan nombres nuevos (`creatorUploads.ts:58`). |
| `users/{uid}/brain-attachments` | dueño | igual (antes: crear y sobrescribir) | Adjuntos de Weë Brain. Mismo patrón de nombre nuevo. |
| `users/{uid}/weetalk/{conversationId}` | dueño y participantes (Firestore) | igual (antes: crear y sobrescribir) | La foto única se crea una vez y la borra el servidor (`burnViewOnce`). La regla de participantes no cambia. |
| `users/{uid}/face-swap` | dueño | igual (antes: crear y sobrescribir); nombre ahora con azar (`avatarGenerationService.ts:165`) | La selfie. Consumida también por el perfil (H-2 del inventario). Decisión pendiente. |
| `users/{uid}/ai-generations` | dueño | sin cambios: el cliente ya no escribe | Lo escribe el servidor. |
| `users/{uid}/avatar-replacement` | dueño | sin cambios: el cliente ya no escribe | Lo escribe el servidor. Lectura solo del dueño (corrección de la auditoría, ver §7). |
| `users/{uid}/ai-avatar` | público | sin cambios: el cliente no escribe | Retrato público del perfil, por diseño. |
| `images/posts/{uid}`, `images/profile/{uid}` (legado) | público | crear → solo nombres nuevos; sobrescribir y borrar cerrados | La lectura pública se mantiene: las publicaciones antiguas enlazan estas URLs. Ninguna subida de la app escribe aquí (búsqueda sin resultados). Se conserva la creación por compatibilidad con builds antiguos. Cerrarla es una decisión posterior (§7). |
| cualquier otra ruta | — | denegado | Catch-all explícito. Un `allow` que no concede nada no cambia el resultado de las demás reglas. |

## 3. Flujos de subida del cliente comprobados

Los únicos ficheros de la app que escriben en Storage son tres. Cualquier otra subida va a Cloudinary.

| fichero | ruta de subida | nombre |
|---|---|---|
| `services/creatorUploads.ts:58` | `users/{uid}/{creator-inputs \| brain-attachments}/…` | `{Date.now()}-{azar}.{ext}` |
| `services/storageService.ts:124` | `users/{userId}/weetalk/{conversationId}/…` (foto única) | `{Date.now()}-{azar}.{ext}` |
| `services/avatarGenerationService.ts:165` | `users/{userId}/face-swap/…` | `source_{Date.now()}-{azar}.jpg` (antes sin azar) |

La suite de emulador comprueba estos tres puntos por lectura de sus fuentes (I1–I4), y que son los únicos que escriben (I4).

## 4. Escrituras y borrados del servidor (Admin SDK)

No dependen de estas reglas.

- `functions/src/content/materializador.ts:168, 229`: resultados de IA en `ai-generations`, con token.
- `functions/src/engine/http.ts:195`: persistencia de resultados del motor.
- `functions/src/vertexAI.ts:348-350`: `avatar-replacement`, con token.
- `functions/src/generateAvatar.ts:234-235`: `ai-avatar`.
- `functions/src/content/index.ts:667`: borrado al retirar un material (`deleteAsset`).
- `functions/src/social/weetalk.ts:260`: borrado de la foto única (`burnViewOnce`).

La prueba G de la suite confirma que el servidor sobrescribe y borra un objeto de la app (G1 y G2).

## 5. Verificación

Comando exacto, desde la raíz del worktree:

```
JAVA21_HOME=C:/Users/Geovet/AppData/Local/wee-tools/jdk-21.0.12.1+1 node functions/test/_emuladores.mjs --solo almacen-reglas-sobrescritura
```

Equivalente directo (proyecto `demo-*`, emuladores de Storage y Firestore):

```
firebase emulators:exec --only storage,firestore --project demo-wee "node functions/test/almacen-reglas-sobrescritura.emulator.mjs"
```

Para probar otro fichero de reglas (las mutaciones): `WEE_STORAGE_RULES_FILE=<ruta>`. La suite lo carga en el emulador con `PUT /internal/setRules` y comprueba que el emulador lo acepta.

### 5.1 Resultados de la suite (el mismo número de comprobaciones en cada reglas: 101)

| reglas probadas | ✔ | ✘ | código |
|---|---|---|---|
| `storage.rules` de esta rama (`f830682`) | 101 | 0 | 0 |
| original de la base (`9469e3a`, sin la política) | 77 | 24 | 1 |
| mutación 1: sin `resource == null` en las creaciones | 83 | 18 | 1 |
| mutación 2: `update` permitido al dueño | 95 | 6 | 1 |
| mutación 3: `delete` permitido al dueño | 84 | 17 | 1 |

Las tres mutaciones son copias de `storage.rules` con un único cambio, generadas en `scratchpad/mutaciones` (fuera del repositorio). Los fallos de cada una están donde se espera: la mutación 1 falla en sobrescribir (B), la 2 en cambiar metadatos (D) y la 3 en borrar (C) y en lo que depende de ese borrado.

### 5.2 Otras pruebas

| prueba | resultado |
|---|---|
| `functions/test/fronteras-storage.emulator.mjs` (emulador) | ✔, exit 0 |
| `functions/test/urls-del-storage.emulator.mjs` (emulador) | ✔, exit 0; `_emuladores.mjs --solo storage` da 2/2 |
| `functions/test/security.test.mjs` | exit 0 · 69 ✔ |
| `functions/test/wee-ai.test.mjs` | exit 0 · 28 ✔ |
| `functions/test/weetalk-view-once.test.mjs` | exit 0 · 59 ✔ |
| `functions/test/produccion-mapa.test.mjs` | exit 0 · 21 ✔ (un ✘ aparece dentro del texto explicativo de la comprobación 15, que pasa) |
| `functions/test/location.test.mjs` | exit 0 · 501 ✔ |
| `functions/test/urls-del-storage.test.mjs` | exit 0 · 58 ✔ |
| `functions/test/creator.test.mjs` | exit 0 · 640 ✔ |
| `functions/test/puente-studio.test.mjs` | exit 0 · 63 ✔ |
| `npm --prefix functions run build` | exit 0 · 0 errores TypeScript |
| `node node_modules/typescript/bin/tsc --noEmit` (app) | exit 0 · 0 errores |
| `node ops/revision/detectores.mjs` (ficheros tocados) | 0 hallazgos en todas las familias |
| `node ops/revision/baseline.mjs` (ficheros tocados) | NUEVO 0 · CORREGIDO 4 · G3 pasa |
| cadena `node functions/test/_cadena.mjs` | 278 de 280 suites; las dos que fallan ya fallaban en la base (§6) |

## 6. Fallos heredados (no causados por esta línea)

- `functions/test/puente-pre-f1d.test.mjs`, comprobación 39 (F3): compara con el commit fijo `b023f24`. `git diff --numstat b023f24 -- functions/src/core` da el mismo resultado en la base `9469e3a` que en `HEAD`, así que la falla viene de la base. No se ha tocado.
- `functions/test/i18n-huella.test.mjs`, comprobación 2: `i18n/huella.json` registra 745 claves y los catálogos del worktree tienen 749. Ni los catálogos ni la huella cambian en esta rama. No se reancla la huella, porque las reglas lo prohíben.

## 7. Decisiones del dueño (no tomadas aquí)

- **D-D: desplegar `storage.rules`.** Producción sigue en `prod/storage-rules/2026-09-19T1726Z` (commit `ced0585`). Sus cláusulas de escritura para el dueño son las mismas que las de la base, así que hoy permite sobrescribir. Además, en producción `users/{uid}/avatar-replacement` tiene `allow read: if true`, mientras que el repositorio lo tiene solo para el dueño (corrección de la auditoría de seguridad que está en el repositorio y no está desplegada). El despliegue sigue el flujo de `docs/DEPLOYMENT.md` desde `main`, con autorización explícita. **No se despliega desde esta rama.**
- **H-2: la selfie de face-swap como foto de perfil** (`screens/AiAvatarScreen.tsx:270-282`). Es una decisión de producto y de privacidad, anterior a cualquier cambio de reglas.
- **Legado `images/posts` e `images/profile`:** ¿se cierra también la creación? Hoy ninguna subida de la app la usa.
- **Retención de adjuntos de Brain y de fotos únicas de WeeTalk** (D-G y D-H): sin esa decisión el índice no puede decidir qué se borra.

## 8. Qué no se toca

- Producción: no se ha desplegado ni leído nada de ella.
- Reglas de identidad, perfil y jurisdicción: no cambian. `firestore.rules` y `firebase.json` tampoco.
- El índice de Firestore es de la línea A1.
- Los helpers de borrado del cliente se retiran (`ce9bd85`). `storageService.getDownloadUrl` no tiene llamadores, pero no es un borrado y queda fuera de este cambio.

## 9. Guardián

- `antes --archivos storage.rules`: 2 CRITICAL (se publica en producción como `storage`, vivo `ced0585`, y es zona roja) y 1 IMPORTANT (zona de seguridad: revisión del revisor de seguridad). Informa; no bloquea. La revisión la hace el dueño.
- `cambio --base wee/almacenamiento-activos`: resultado en el informe final de la línea.
