# Despliegue de Weë — cómo cambia producción

Documento operativo del **Weë Agent Harness** (FASE 3, 4 y 6). Producción es
`get-wee`, el único proyecto real ([`README.md`](../README.md) § Entornos).

## 1. Reglas

1. **Producción cambia por UN solo camino:** commit en `main` → CI → tag →
   aprobación del dueño → despliegue (§6).
   - Mientras ese workflow no exista, solo despliega el dueño, a mano, con el
     procedimiento de §4.
   - Claude no despliega nunca: la guardia lo deniega ([`SECURITY.md`](SECURITY.md) §6).
2. **No se pisa lo que funciona.** No se despliega un commit que no CONTIENE el
   código que hoy corre en cada función, ni uno que no lleva un arreglo de
   seguridad pendiente. Lo decide `ops/permitido.mjs` (§3).
3. **Nada sale de una carpeta con cambios sin commitear.**
   - Dos despliegues de septiembre (zips Z10 y Z11 de la auditoría H0) salieron
     de árboles sucios, y su código no se puede reconstruir.
   - Se despliega desde un worktree limpio en el commit exacto, y ese commit
     queda etiquetado.

## 2. Qué corre hoy

**`ops/produccion.json` es el mapa:**
- Para cada una de las 34 funciones guarda la revisión viva, el commit exacto,
  su tag, el zip#generación, el md5 y el build.
- Recoge también las reglas, los índices, los dos hostings y Vercel.
- Se verificó en la auditoría H0 (2026-09-30), comparando cada zip desplegado
  con el árbol del commit.
- Cada estado tiene un **tag anotado inmutable** `prod/…` con la evidencia en el
  mensaje (`git tag -l -n30 'prod/*'`).

| Tag | Commit | Qué | ¿En `main`? |
|---|---|---|---|
| `prod/functions/2026-09-19T1729Z-5fn` | `ced0585` | acceptEContact, burnViewOnce, deleteAsset, requestEContact, votePoll | sí |
| `prod/functions/2026-09-19T1732Z-5fn` | `ced0585` | brainQuote, creatorQuote, engineAdmin, publicPostPage, seedanceCallback | sí |
| `prod/functions/getCreditCost/2026-09-19T1734Z` | `ced0585` | getCreditCost | sí |
| `prod/functions/2026-09-19T2109Z-8fn` | `bfc622d` | creditsAdmin, getCreditHistory, getCreditsBalance, grantCredits, refundCredits, sendMessagePushNotification, sendPushNotification, spendCredits | sí |
| `prod/functions/2026-09-19T2111Z-4fn` | `bfc622d` | avatarReplacement, generateAvatarWithGemini, restorePurchase, validatePurchase | sí |
| `prod/functions/nacimientoDeCuenta/2026-09-20T0054Z` | `0123cdc` | nacimientoDeCuenta | sí |
| `prod/functions/2026-09-20T0330Z-moderation-2fn` | `c3515b3` | moderationAdmin, reportContent | sí |
| `prod/functions/brainChat/2026-09-20T0947Z` | `2da2881` | brainChat (subido antes de crearse el commit; contenido idéntico) | sí |
| `prod/functions/mediaCanary/2026-09-21T1248Z` | `4bb099e` | mediaCanary | sí |
| `prod/functions/creatorRun/2026-09-23T1144Z` | `5d87f1f` | creatorRun | sí |
| `prod/functions/creatorChat/2026-09-24T2153Z` | `05ab31b` | creatorChat | sí |
| `prod/functions/2026-09-28T0056Z-filmmaker-3fn` | `96b3f7a` | barridoDeLiquidacion, productions, shots | **no** (`filmmaker/core`) |
| `prod/functions/generateVideo/2026-09-29T2224Z` | `7f11d51` | generateVideo | **no** (`hotfix/r22-generatevideo`) |
| `prod/firestore/2026-09-20T0325Z` | `c3515b3` | reglas (ruleset `26c4d361…`) e índices (29); exacto | sí |
| `prod/storage-rules/2026-09-19T1726Z` | `ced0585` | reglas de Storage; contenido exacto, commit por la hora | sí |
| `prod/hosting/get-wee/2026-09-20T0057Z` | `0123cdc` | Hosting `get-wee`; contenido exacto, commit por la hora | sí |
| `prod/hosting/wee-app/2026-09-20T0423Z-aprox` | `afbc2df` | Hosting `wee-app` (versión `1c33b61b`); **aproximado**, es un build que no se puede reconstruir | sí |
| `prod/vercel/2026-09-19T2102Z` | `bfc622d` | wee.zone en Vercel (SHA declarado por Vercel) | sí |

**Lo que hay que saber antes de tocar nada:**
- **Cuatro funciones corren código que `main` no tiene:**
  - `generateVideo` (`7f11d51`);
  - `barridoDeLiquidacion`, `productions` y `shots` (`96b3f7a`).

  No se despliegan desde `main` hasta integrar esas ramas de forma segura (FASE 4).
- **`spendCredits`:**
  - el 2026-09-30 se le retiró a mano el invocador público (H0 #24), sin nueva
    revisión;
  - `firebase deploy` vuelve a abrirlo en cada callable, así que su próximo
    despliegue tiene que llevar el arreglo del código (`b878068`, `assertAdmin`);
  - su tag **no** se vuelve a desplegar.
- **La web.**
  - `wee.zone` la sirve Vercel desde GitHub.
  - Hasta ahora, **cada push a `main` la publicaba**, saltándose CI, tag y
    aprobación.
  - `vercel.json` lleva desde el Harness `git.deploymentEnabled.main: false`.
    Al llegar a GitHub, un push a `main` deja de publicar.
  - Las ramas siguen generando previsualizaciones, que usan la configuración de
    Firebase de producción.
  - La web se publica a propósito, desde el panel de Vercel o desde el workflow
    (§6).

## 3. Antes de desplegar cualquier cosa

```
node ops/permitido.mjs --commit <sha|ref> --funciones generateVideo,spendCredits
```

- Sale con **0** si ese commit contiene el código vivo de cada función y los
  arreglos que exige el mapa.
- Sale con **1** si pisaría producción, y dice qué rama integrar.
- Sale con **2** si no se puede saber, por ejemplo si falta historia. En ese
  caso no se despliega.

Solo lee git y el mapa. La prueba `functions/test/produccion-mapa.test.mjs`
fija el mapa y la regla.

## 4. Mientras no exista el workflow (solo el dueño)

1. **Worktree limpio en el commit exacto:**

   ```
   git worktree add ../wee-despliegue <commit>
   ```

   Después, `npm ci` en la raíz y en `functions/`.
   - Copia `functions/.env.get-wee` a ese worktree. No lleva secretos
     (`WEE_ADMIN_UIDS`, `R2_ACCOUNT_ID`, `R2_BUCKET`), pero git lo ignora y sin
     él las funciones pierden esas variables.
2. **Comprueba** `node ops/permitido.mjs --commit <commit> --funciones <lista>`
   → 0.
3. **Prueba:** `npm --prefix functions run build && npm --prefix functions run test:todas`.
4. **Despliega solo esas funciones:**

   ```
   firebase deploy --only functions:a,functions:b --project prod
   ```

   Sin claves locales: `functions.ignore` ya deja fuera `.env.local` y
   `.secret.local`.
5. **Si era un callable cerrado a mano, vuelve a cerrarlo.** El despliegue le
   devuelve el invocador público. Cuando el código ya lleva `assertAdmin`, eso
   no abre nada, pero conviene repetirlo.
6. **Etiqueta y anota:**

   ```
   git tag -a prod/functions/<fn>/<AAAA-MM-DDTHHMMZ> <commit>
   ```

   Pon en el mensaje la revisión y el build, y actualiza `ops/produccion.json`
   en un PR.

## 5. Marcha atrás

- **Functions.** La marcha atrás **no es un despliegue**: es mover el tráfico a
  la revisión anterior, que Cloud Run conserva. Es inmediato y no reconstruye
  nada:

  ```
  gcloud run services update-traffic <servicio> --region us-central1 --project get-wee --to-revisions <revisión>=100
  ```

  Excepción: `spendCredits` no vuelve a una revisión sin `assertAdmin` mientras
  su invocador sea público (§2).
- **Reglas de Firestore y Storage:** se vuelve al conjunto anterior desde la
  consola, en el historial de reglas. También se puede desplegar desde el tag
  `prod/firestore/…` o `prod/storage-rules/…`.
- **Hosting:** en la consola, historial de versiones → revertir.
- **Vercel:** en el panel, *Promote* de un despliegue anterior.

## 6. CI y el workflow de producción (FASE 5–6 del Harness)

**CI** (`.github/workflows/ci.yml`), en cada PR y en cada push a `main`. Tiene
tres niveles, y si falla el 1 los otros no arrancan:
1. TypeScript de la app y build de las Functions;
2. todas las suites (`npm --prefix functions run test:todas`), sin parar en la
   primera que falla;
3. las suites de emulador con proyectos `demo-*`.

Sin secretos, sin credenciales de Google y sin gasto (`scripts/ci-sin-secretos.mjs`).

**Producción** (`.github/workflows/despliegue.yml`) es **el único camino**, y se
lanza a mano desde Actions con un commit y un objetivo:
1. **Verificar**, sin credenciales de Google:
   - SHA completo, en `main`;
   - los tres niveles de la CI en verde en ESE commit;
   - y `ops/permitido.mjs`, que impide pisar lo que funciona.
2. **Aprobación del dueño** en el entorno de GitHub `get-wee`. No se llama
   `production`, porque choca con el `Production` de Vercel.
3. **Desplegar** con una identidad sin claves (Workload Identity Federation).
   - Antes, se anotan las revisiones vivas.
   - Después, humo sin gasto: una petición sin sesión por función. 401/403
     significa viva y cerrada; 5xx o no responder es fallo.
   - Si algo falla, el tráfico vuelve solo a las revisiones de antes.
4. **Registrar** un tag inmutable `prod/<qué>/<cuándo>` sobre el commit.

El objetivo se escribe separado por comas:
- `functions:nombre`, nunca `functions` a secas, que serían todas;
- `firestore:rules`, `firestore:indexes`, `storage`;
- `hosting:get-wee`, `hosting:wee-app`.

La lógica está en `ops/despliegue/plan.mjs` (pura). Los pasos están en
`ops/despliegue/cli.mjs`. Lo fija `functions/test/despliegue-workflow.test.mjs`.

**Está INACTIVO hasta que el dueño lo active** (IAM y GitHub son suyos):
1. Ejecutar, línea a línea, lo que imprime `node ops/iam/wif.mjs`:
   - el pool y el proveedor de WIF, que solo aceptan este workflow, de `main`,
     en el entorno `get-wee`;
   - la cuenta `despliegue-github@get-wee.iam.gserviceaccount.com`, con roles
     mínimos: sin Owner, sin leer secretos y sin IAM.
2. Crear en GitHub el entorno `get-wee`:
   - revisor obligatorio, el dueño;
   - solo la rama `main`;
   - sus variables: `WIF_PROVEEDOR`, `CUENTA_DE_DESPLIEGUE`, `WEE_ADMIN_UIDS`,
     `R2_ACCOUNT_ID`, `R2_BUCKET` y, para `hosting:wee-app`, las
     `EXPO_PUBLIC_FIREBASE_*`. Ningún secreto.
3. Antes del primer despliegue desde `main`, integrar en `main` el código que
   ya corre en producción (§2). Hasta entonces, `ops/permitido.mjs` lo impide.

Todo lo que toca IAM, GitHub o la visibilidad del repo espera la aprobación
explícita del dueño.
