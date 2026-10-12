# Router · M-01 — plan de aplicación (para ejecutar SOLO si el dueño lo autoriza)

> **Estado (R9, 2026-10-12, agente PRV): PREPARADO · PENDIENTE DE DECISIÓN DEL DUEÑO.** Este documento no aplica nada: `functions/src`, `functions/test` y `functions/package.json` están idénticos a la base `9365153a`. Es la receta exacta para el día en que haya una autorización escrita; sin ella, no se ejecuta ningún paso. Sustituye a §6.2 del dossier (`docs/ROUTER-PARCHE-PARA-AUTORIZAR.md`) en lo que cambió desde `c3f7f9a7` (la cadena) y no repite su explicación del defecto: para decidir, `docs/ROUTER-M01-DECISION-BREVE.md`.
>
> Marcas: **[E]** ejecutado por mí en R9 sobre `9365153a` (logs en `C:\Users\Geovet\wee-trabajo\ronda-r9\PRV\logs\`) · **[D]** heredado de R7-Design / R8, no repetido · «inferido» = razonado sin ejecutar.

Hay **dos decisiones independientes** y este plan las separa:

- **Parte 1 — M-01 sola (opción A del dossier):** un defecto de **dinero** (un resultado pagado se descarta o se paga dos veces cuando falla la contabilidad). `engine/router.ts` +31 −4 y el reanclaje de E4/H2.
- **Parte 2 — PR1–PR3 (rendimiento, tarea I de R7):** optimizaciones de **latencia** sin defecto de dinero detrás; dos de ellas tocan contabilidad (PR1) y Credits (PR3). Se autoriza o no aparte, antes o después de M-01.

---

## 0. Verificación de partida en esta base [E]

| Comprobación | Resultado en `9365153a` | Log |
|---|---|---|
| `node functions/test/router-contabilidad.repro.mjs` | **31 ✔ · 55 ✘, exit 1** (13 s con la máquina cargada; R8 midió 0,8 s) — el defecto sigue | `repro-base-9365153a.log` |
| `git apply --check` de los 7 diffs de `docs/propuestas/` (`router-contabilidad`, `reanclaje-borrador-D`, `-D+I`, `-I`, `rendimiento-PR1`, `-PR2`, `-PR3`) | **7/7 OK** | (salida de consola, reproducible) |
| Diferencias de `functions/src` entre `c3f7f9a7` (base del dossier R8) y `9365153a` | solo `creator/prompts.ts` (+21 −1); ningún archivo del motor ni de las cercas | `git diff --stat c3f7f9a7 9365153a -- functions/src` |
| Huellas de partida (`git hash-object`) | `router.ts` `ce734adb…` · `ledger.ts` `3118895e…` · `verification.ts` `07aebd34…` · `creator/credits.ts` `a9675ecc…` · `puente-pre-f1d` `fa221d29…` · `video-asincrono` `a62d544b…` · `f1d-generacion` `1614513e…` = las del dossier §8 | — |
| Cifras de las cercas hoy | `git diff --numstat b023f24`: router `126 25`, ledger `188 29`, verification `8 0`; `git diff --numstat 8e91daa`: router `126 25`, credits `45 4` | — |
| Ensayo en un **índice temporal** (`GIT_INDEX_FILE` desechable + `git apply --cached`; el árbol de trabajo no se toca) | A: M-01 + D → router `157 29` frente a las dos bases; blobs `b639ec19…`, `7fd6559e…`, `e6684c24…` (= dossier). B: M-01 + PR1–PR3 + D+I → ledger `209 31`, verification `36 2`, credits `60 4`; blobs = dossier. C: PR1–PR3 + I aplica. Apilar D+I sobre D **falla** (S10). Secuencia «A y después PR»: deshacer D, aplicar PR1–PR3 y D+I → mismos blobs que B | `indice-temporal.log`, `indice-temporal-secuencia.log` |
| Pasos de la cadena (`functions/package.json`, script `test`) | **320**; `node test/router.test.mjs` es el paso **108** | — |

**No ejecutado en R9:** compilación, suites de cercas con el parche, cadena, harness-guardian (todo eso es la parte pesada de los pasos de abajo y está medido en R8 sobre `c3f7f9a7` [D]; entre aquella base y esta solo cambió `creator/prompts.ts`, que ninguna de las pruebas del Router lee —inferido—).

---

## Parte 1 — Aplicar SOLO M-01 (opción A)

### 1.1 Precondiciones (todas, antes del primer comando)

1. **Autorización escrita del dueño** para M-01·D1 (a): aplicar `router-contabilidad.diff` **y** reanclar E4 (`puente-pre-f1d` 36) y H2 (`video-asincrono` 57). Anotar fecha y referencia: van en el comentario del reanclaje.
2. Una rama **de integración** autorizada (no `main`, no un worktree ajeno), limpia: `git status --short` vacío.
3. `git hash-object functions/src/engine/router.ts` = `ce734adbede710b01ba490f6e755d15ff5671fda`. Si no coincide, **parar**: el motor cambió y hay que regenerar el diff y las cifras (dossier §5.3).
4. `node functions/test/router-contabilidad.repro.mjs` → 55 ✘ / 31 ✔, exit 1 (el rojo de partida, guardado en un log).
5. Candado de lo pesado disponible (`pesado.mjs status`).

### 1.2 Pasos exactos (✋ = pesado, con candado)

| # | Comando (desde la raíz) | Esperado | Si no |
|---|---|---|---|
| 1 | `git apply docs/propuestas/router-contabilidad.diff` | `git hash-object functions/src/engine/router.ts` = `b639ec1917188ca0cec5474b67ee38b4a05cb86e`; `git diff --stat -- functions/src` = `1 file changed, 31 insertions(+), 4 deletions(-)` | `git checkout -- functions/src/engine/router.ts` y parar |
| 2 | **Commit 1 (el parche)**, solo `functions/src/engine/router.ts`, mensaje con la referencia de la autorización y la línea de coautoría | 1 archivo en el commit | — |
| 3 | `git apply docs/propuestas/reanclaje-borrador-D.diff` y, en `functions/test/puente-pre-f1d.test.mjs`, sustituir «autorización del dueño pendiente» por la fecha y la referencia de la autorización (el comentario del reanclaje de E4) | solo cambian `puente-pre-f1d.test.mjs` y `video-asincrono.test.mjs`; la cadena de E4 dice `157\t29\tfunctions/src/engine/router.ts` y el mapa de H2 `'157\t29'` | `git checkout --` de los dos archivos |
| 4 | `git mv functions/test/router-contabilidad.repro.mjs functions/test/router-contabilidad.test.mjs`; actualizar su cabecera (hoy dice «NO está en la cadena… está en ROJO»); en `functions/package.json`, añadir ` && node test/router-contabilidad.test.mjs` **justo detrás** de `node test/router.test.mjs` (paso 108) | la cadena pasa de **320 a 321** pasos (el dossier decía 315 → 316: cifra de `c3f7f9a7`, ya desfasada) | deshacer el `git mv` y `git checkout -- functions/package.json` |
| 5 ✋ | `cd functions && npm run build` | exit 0; de `lib/` solo cambia `engine/router.js` (R8: 91 s [D]) | no seguir: marcha atrás §1.5 |
| 6 | `node functions/test/router-contabilidad.test.mjs` | **86 ✔ · 0 ✘**, exit 0 | marcha atrás |
| 7 | Una a una: `router`, `router-parity`, `router-politica`, `router-frontera-real`, `ledger`, `idempotencia-de-cobro`, `credits`, `evals-router`, `brain-bloque`, `contabilidad-frontera`, `core-router` (`node functions/test/<x>.test.mjs`) | 0 ✘ en todas (cifras de referencia en el dossier §6.2 fila 6–7) | marcha atrás |
| 8 | `runtime-map`, `job-queue`, `media-core`, `media-delivery-core`, `media-upload-core`, `media-proceso-core` | 0 ✘ (`runtime-map` 185 ✔). Si `runtime-map` dice «compilado desfasado», es la fecha de `lib`, no el parche: recompilar (paso 5) | — |
| 9 | **Cercas:** `puente-pre-f1d`, `video-asincrono`, `f1d-generacion` | **42 ✔ · 64 ✔ · 100 ✔, sin una ✘** | marcha atrás |
| 10 | Sabotaje temporal: añadir una línea en blanco a `functions/src/engine/router.ts`, repetir `puente-pre-f1d` y `video-asincrono`, y `git checkout -- functions/src/engine/router.ts` **tras recomprobar la huella `b639ec19…`** | E4 y H2 en rojo (`158 29`): la cerca sigue mordiendo | — |
| 11 | `node functions/test/ci-workflow.test.mjs` · `node scripts/escaneo-secretos.mjs` | 41 ✔ · ningún secreto | — |
| 12 | `node functions/test/harness-guardian.test.mjs` (lento: 41–316 s) | 29 ✔ | — |
| 13 | **Commit 2 (el reanclaje + el registro)**: `puente-pre-f1d.test.mjs`, `video-asincrono.test.mjs`, `router-contabilidad.test.mjs` (renombrado), `functions/package.json` | 4 archivos; ninguno de `functions/src` | — |
| 14 ✋ | `node functions/test/_cadena.mjs` (la lanza el coordinador) | **321 / 321** | marcha atrás |
| 15 | Zona roja del Harness (`ops/revision/reglas.mjs:118`): revisión obligatoria antes de fusionar | aprobada | no fusionar |

### 1.3 Qué NO debe moverse (criterio de regresión)

- Ningún archivo de `functions/src` salvo `engine/router.ts`; ninguna cifra de `ledger.ts`, `verification.ts`, `creator/credits.ts`.
- Ninguna comprobación de F1, F2 (que mide `core/router.ts`, **otro** archivo), F3, F4, H1, H3, `runtime-map`, `job-queue`, `media-*`.
- Ninguna línea de importes, precios, márgenes, reglas de Credits, contratos (`EngineResult`, `Ledger`, `CloseRecord`, `types.ts`), proveedores ni cadenas. La cadena de `video.generate` sigue `['seedance']` y `fal` solo en `world.generate`.

### 1.4 Criterio de éxito

Todo esto a la vez: (1) la repro, ya como suite de la cadena, en **86/0**; (2) las tres cercas en verde **con las cifras leídas del árbol real**, no copiadas (`git diff --numstat b023f24 -- functions/src/engine` y `git diff --numstat 8e91daa -- functions/src/engine functions/src/creator/index.ts functions/src/creator/credits.ts functions/src/generateAvatar.ts`: solo cambia la entrada de `router.ts`); (3) las huellas `router.ts` `b639ec19…`, `puente-pre-f1d` = `7fd6559e…` **más** el cambio del texto «pendiente» (la huella final será otra y se anota en el commit), `video-asincrono` `e6684c24…`; (4) la cerca vuelve a rojo con una línea de más (paso 10); (5) cadena 321/321; (6) revisión del Harness aprobada. **Desplegar no forma parte de este plan** (otra autorización, `--project prod` y confirmación explícita).

### 1.5 Marcha atrás

- **Sin commitear:** `git checkout -- functions/src/engine/router.ts functions/test/puente-pre-f1d.test.mjs functions/test/video-asincrono.test.mjs functions/package.json`, `git mv functions/test/router-contabilidad.test.mjs functions/test/router-contabilidad.repro.mjs` (y deshacer la cabecera) y recompilar ✋. `git status` limpio y `router.ts` = `ce734adb…`.
- **Commiteado:** `git revert <commit 2>` y después `git revert <commit 1>`; recompilar ✋; repetir los pasos 6 (la repro vuelve a 55 ✘: esperado), 9 y 11. Revertir solo el commit 2 deja E4 y H2 en rojo: es la señal correcta (la cerca vuelve a vigilar). R8 lo demostró en una copia: tras los dos reverts, mismo árbol que la base [D].
- **Si se llegara a desplegar:** la marcha atrás de Functions es mover el tráfico a la revisión anterior de Cloud Run (`docs/DEPLOYMENT.md:166-170`), no un nuevo despliegue.

### 1.6 Lo que M-01 deja abierto (no se decide aquí)

M-01·D2 (cómo se repara la fila `aiGenerations` que queda sin cerrar; la opción (d), avisar en la alerta «Weë · dinero sin cerrar», es la única que no toca `functions/src` ni cercas), M-01·D3 (`ledger.progress` dentro de `adapter.run`), M-01·D4 (`EngineResult` con «contabilidad pendiente», contrato compartido) y RS7 (`generateVideo`/`creatorRun`, vallados por H1/F4). Detalle: dossier §7.

---

## Parte 2 — PR1–PR3 como decisión independiente

### 2.1 Qué se autoriza (y qué tocan)

| Parche | Archivo | Δ | Marca | Cercas que mueve |
|---|---|---|---|---|
| PR1 | `engine/ledger.ts` | +21 −2 (`188/29 → 209/31`) | **CONTABILIDAD**: `close` no relee la fila y suma al uso del día con datos en memoria (≤ 500 filas por instancia) | E4 · H2 |
| PR2 | `engine/verification.ts` | +28 −2 (`8/0 → 36/2`) | contador operativo `aiProviderVerification` (hasta 5 min de retraso; lo pendiente se pierde si muere la instancia) | E4 · H2 |
| PR3 | `creator/credits.ts` | +15 (`45/4 → 60/4`) | **CRÉDITOS**: cuándo se llama a `creditEngine.ensureAccount` (migración de billetera y bienvenida), memoria de 10 min por instancia | F4 · H2 · `f1d-generacion` #98 |

Ganancia: latencia (−1…−3 rondas por petición) [D]; ningún defecto de dinero. Recomendación previa (R8, opinión): **no** autorizarlos con M-01; y si se elige M-01·D2 (a) (`close` atómico), decidirlo **antes** de PR1, porque los dos editan `firestoreLedger.close`.

### 2.2 Precondiciones

Autorización escrita **que nombre los tres parches** (o el subconjunto: ver 2.5), con conciencia de las marcas CONTABILIDAD y CRÉDITOS; huellas de partida `ledger.ts` `3118895e…`, `verification.ts` `07aebd34…`, `credits.ts` `a9675ecc…` (si no coinciden, parar); rama limpia; candado.

### 2.3 Pasos — dos variantes, según si M-01 ya está aplicada

**Variante 2-I: PR1–PR3 sin M-01** (M-01 no autorizada o aún no aplicada).

1. `git apply docs/propuestas/rendimiento-PR1.diff docs/propuestas/rendimiento-PR2.diff docs/propuestas/rendimiento-PR3.diff` → huellas `ledger.ts` `0a96641e…`, `verification.ts` `a9e8feac…`, `credits.ts` `c1f041f5…`. **Commit 1** (solo esos tres archivos).
2. `git apply docs/propuestas/reanclaje-borrador-I.diff` y sustituir los tres «autorización pendiente» por la referencia real. Toca `puente-pre-f1d`, `video-asincrono` y `f1d-generacion`. **Commit 2.**
3. ✋ build; suites: `ledger`, `contabilidad-frontera`, `idempotencia-de-cobro`, `credits`, `router`, `brain-bloque`, `f1d-generacion`, `core-provider-verification`, `coste-de-los-fallos`, `interruptor-ia`, `presupuesto-diario`, `plazos-y-liquidacion` (leen `recordRealSuccess` o el uso del día), `credits-cliente-cerrado`, `credits-perfil-duplicado` (`ensureAccount`) y las cercas `puente-pre-f1d` 42 · `video-asincrono` 64 · `f1d-generacion` 100; `ci-workflow` 41; escaneo de secretos; harness-guardian; ✋ cadena **320/320** (PR1–PR3 no añaden suites).
4. Si M-01 se autoriza **después**: deshacer el commit 2 (`git revert`), aplicar M-01, aplicar `reanclaje-borrador-D+I.diff` (o regenerar con `ronda-r7\I-rendimiento\propuestas\reanclaje-borrador.mjs`) y seguir la Parte 1 desde el paso 4.

**Variante 2-II: PR1–PR3 después de M-01** (Parte 1 ya commiteada con el reanclaje D).

1. `git revert <commit 2 de la Parte 1>` **solo si** se quiere usar el reanclaje combinado tal cual; como su texto «pendiente» ya se editó, `git apply -R` del borrador no casa: usar `git revert`. Ensayado en índice temporal con el borrador sin editar: deshacer D y aplicar PR1–PR3 + D+I da los mismos blobs que aplicarlo todo de una vez (`13cdbc91…`, `c9c0579b…`, `e9c62cda…`) [E `indice-temporal-secuencia.log`]. **Ojo:** al revertir el commit 2 también sale el registro de la repro en la cadena; vuelve a añadirse en el commit del reanclaje combinado.
2. Aplicar los tres PR (como 2-I, paso 1) y `reanclaje-borrador-D+I.diff`; sustituir los cuatro «autorización pendiente»; volver a registrar `router-contabilidad.test.mjs` si el revert lo quitó.
3. Mismas pruebas que 2-I paso 3, más la repro (86/0); cadena **321/321**.

### 2.4 Criterio de éxito

Cercas 42 · 64 · 100 con las cifras leídas del árbol (cambian solo las entradas de los archivos autorizados; las otras 27/30, idénticas); huellas de producción = las de 2.3; `ledger` y `contabilidad-frontera` sin una ✘ (PR1 toca la suma diaria de la que dependen los topes `maxUsdPerDay`); `credits` e `idempotencia-de-cobro` sin una ✘ (PR3); cadena completa; revisión del Harness (zona roja).

### 2.5 Subconjuntos y trampas medidas

- Cada PR mueve exactamente sus cercas (R7-Design S7–S9 [D]): PR1 o PR2 solos → E4 y H2; PR3 solo → F4, H2 y #98. Un subconjunto **no** tiene reanclaje preparado: hay que regenerarlo con `reanclaje-borrador.mjs` (exige una sola coincidencia por sustitución).
- `reanclaje-borrador-D+I` con un subconjunto de los parches deja cercas en rojo (S11, S12 [D]): no se puede aprobar PR1–PR3 «sin querer».
- Los reanclajes D y D+I **no se apilan** (apilar falla en `git apply --check` [E]).
- Interacción leída, no ejecutada: con PR1, un `close` caído (el caso que M-01 tolera) deja la entrada en memoria hasta que la expulsa el tope de 500; inofensivo [D].

### 2.6 Marcha atrás

`git revert` del commit del reanclaje y luego del de los parches; build ✋; cercas y suites del paso 3. Si M-01 estaba aplicada y se usó D+I, tras revertir hay que volver a reanclar solo M-01 con `reanclaje-borrador-D.diff` (o las cercas quedan en rojo por la cifra de `router.ts`).

---

## 3. Lo que este plan no hace ni presupone

No aplica nada, no reancla nada, no compila, no despliega, no toca producción ni datos; no decide M-01·D1–D4 ni el alcance. Las cifras «321» y «320» son las de `9365153a`; si la rama de integración añade suites antes de aplicar, se recalculan contando los pasos del script `test`.
