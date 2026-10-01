# Despliegue de Weë — cómo cambia producción

Documento operativo del **Weë Agent Harness** (FASE 3, 4 y 6). Producción es
`get-wee`, el único proyecto real ([`README.md`](../README.md) § Entornos).

## 1. Reglas

1. **Producción cambia por UN solo camino:** commit en `main` → CI → tag →
   aprobación del dueño → despliegue (§6).
   - No hay otro: ni a mano, ni desde un portátil, ni desde un worktree (§4).
   - Claude no despliega nunca: la guardia lo deniega ([`SECURITY.md`](SECURITY.md) §6).
2. **No se pisa lo que funciona.** No se despliega un commit que no CONTIENE el
   código que hoy corre en cada función, ni uno que no lleva un arreglo de
   seguridad pendiente. Lo decide `ops/permitido.mjs` (§3).
3. **Ningún atajo despliega.**
   - `npm run deploy:prod:functions`, `deploy:prod:firestore` y
     `npm --prefix functions run deploy` desplegaban todo desde cualquier
     carpeta. Ahora dicen por dónde se despliega y salen con error
     (`scripts/no-desplegar.mjs`).
   - `npm --prefix functions run shell` corre con `demo-wee`.
   - Lo fija `entrega-configuracion` (16–17).
4. **Nada sale de una carpeta con cambios sin commitear.**
   - Dos despliegues de septiembre (zips Z10 y Z11 de la auditoría H0) salieron
     de árboles sucios, sin commit.
     - Z11 (`brainChat`) resultó idéntico al commit que se creó nueve minutos
       después (`2da2881`).
     - Z10 ya no sirve a ninguna función.
     - Saberlo costó comparar zips a mano.
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
  - `wee.zone` la sirve Vercel desde GitHub, y **cada push a `main` la
    publica**, saltándose CI, tag y aprobación.
  - **El freno está ACTIVO en el código** (orden del dueño, 2026-10-01):
    `vercel.json` lleva `git.deploymentEnabled.main: false` y nada más
    cambia. Lo fija `entrega-configuracion` (14–15) y cumple el esquema
    oficial de Vercel (`openapi.vercel.sh/vercel.json`).
  - **Vercel lo lee del `vercel.json` del commit que llega a `main`.** Por eso
    se hace efectivo con el primer push que lo lleve, y ese mismo push ya no
    publica nada.
  - **Ese primer push está preparado:** la rama `harness/freno-vercel` es el
    `main` de GitHub (`bfc622d`) más un solo commit con ese cambio, para que
    con él no viaje nada más. Subirla es una autorización del dueño.
  - **Cómo se comprueba, tras el push:** en GitHub, el commit no tiene
    despliegue de Producción (`gh api repos/geovetlf/wee-app/deployments?sha=<sha>`
    devuelve una lista vacía, o solo previews). En el panel de Vercel, la
    producción sigue siendo la de `bfc622d`.
  - **Desde entonces la web se publica a propósito**, desde el panel de Vercel
    (*Deploy* / *Promote*).
  - **Mientras ese push no ocurra, el freno no protege nada en GitHub.** El
    único freno inmediato y sin push es el del panel: *Settings → Git →
    Ignored Build Step* («Don't build anything»).
  - Las demás ramas siguen generando previsualizaciones, que usan la
    configuración de Firebase de producción (una URL pública contra datos
    reales). Conviene comprobar en el panel que la *Deployment Protection* de
    las previews está activa.

## 3. Antes de desplegar cualquier cosa

```
node ops/permitido.mjs --commit <sha|ref> --funciones generateVideo,spendCredits
node ops/permitido.mjs --commit <sha|ref> --otros firestore:rules,hosting:wee-app
```

- Sale con **0** si ese commit contiene lo que está vivo en cada objetivo y los
  arreglos que exige el mapa.
- Sale con **1** si pisaría producción, y dice qué integrar.
- Sale con **2** si no se puede saber, por ejemplo si falta historia. En ese
  caso no se despliega.

**Vale igual para las reglas, los índices, Storage y los dos Hosting.** Hoy no
es teórico: el `main` de GitHub (`bfc622d`) no contiene las reglas de
moderación que están vivas (`c3515b3`). Desplegar reglas desde él las borraría
de producción, y la regla lo impide. Con Firestore, además, avisa de qué más se
publicaría. El `main` local ya lleva 87 líneas de reglas y 6 índices que no
están vivos; la integración (§2), 31 líneas y 1 índice más.

Solo lee git y el mapa. La prueba `functions/test/produccion-mapa.test.mjs`
fija el mapa y la regla.

## 4. No hay camino manual

Orden del dueño (2026-10-01): «Nunca permitir deploy directo desde el portátil.
Nunca permitir deploy desde cualquier worktree.» Hasta ese día existía aquí un
procedimiento a mano; ya no.

- **`firebase.json` lo impide.** El primer `predeploy` de cada objetivo
  (functions, firestore, storage y los dos hosting) es
  `scripts/solo-desde-el-workflow.mjs`. Solo deja pasar el workflow
  `despliegue.yml` de `main` de `geovetlf/wee-app` en GitHub Actions, hacia
  `get-wee`. Desde un portátil o un worktree, `firebase deploy` se para antes de
  subir nada. Lo fija `entrega-configuracion` (18–21) y cumple el esquema de
  firebase-tools 15.29.
- **Es una cerradura contra el accidente, no la de seguridad**: esas variables
  se pueden fingir. La de seguridad es IAM: la cuenta de despliegue solo la
  obtiene ese workflow, por WIF (§6).
- **Los atajos de npm ya no despliegan** (`scripts/no-desplegar.mjs`), y la
  guardia de Claude deniega `firebase deploy` en cualquier forma.
- **Un despliegue lleva como mucho 6 funciones** (`MAX_FUNCIONES_POR_DESPLIEGUE`),
  y `functions` a secas, que serían todas, se rechaza. Los grupos y su orden
  están en `ops/despliegue/grupos.json`.
- **La marcha atrás sigue a mano**, porque NO es un despliegue: es mover el
  tráfico a una revisión que ya existe (§5).
- **Para comprobar lo publicado sin credenciales** (también después del
  workflow):

  ```
  node ops/despliegue/cli.mjs humo --funciones a,b --sin-credenciales
  node ops/despliegue/cli.mjs hashes --sitio wee-app
  ```

  - El humo hace una petición sin sesión a la URL pública de cada función:
    401/403 es «viva y cerrada»; 5xx o no responder es fallo. Las programadas
    y las de eventos no se pueden llamar: el script lo dice, y se miran en la
    consola de Cloud Run.
  - `hashes` compara por sha256 cada archivo que publica el sitio con el de la
    carpeta local (`dist/` o `public/`). Un 200 no basta: la reescritura de la
    SPA devuelve `index.html` con 200 para un archivo que falta.

## 5. Marcha atrás

- **Functions.** La marcha atrás **no es un despliegue**: es mover el tráfico a
  la revisión anterior, que Cloud Run conserva. Es inmediato y no reconstruye
  nada:

  ```
  gcloud run services update-traffic <servicio> --region us-central1 --project get-wee --to-revisions <revisión>=100
  ```

  - **Volver al estado conocido** (el de `ops/produccion.json`), sin
    credenciales: `node ops/despliegue/cli.mjs marcha-atras --al-mapa --funciones a,b`
    imprime el comando exacto de cada función. No ejecuta nada.
  - **Excepción: `spendCredits`.** No vuelve a una revisión sin `assertAdmin`:
    `firebase deploy` le devuelve el invocador público y reabriría H0 #24.
    - `--al-mapa` se niega a darle comando.
    - La marcha atrás automática del workflow la deja **bloqueada**: el tráfico
      se queda en la revisión nueva, cerrada en el código.
    - Lo vigila `revisionesSinArreglo`: toda función del mapa con `requiere`
      pendiente.
  - **El workflow devuelve el tráfico a la revisión que SERVÍA**, que no
    siempre es la última lista. Tras una marcha atrás el tráfico queda fijado a
    una revisión vieja; si se anotara la última lista, una segunda marcha atrás
    volvería a la mala.
  - **Si el tráfico estaba repartido** entre varias revisiones, el workflow no
    despliega: no hay UNA revisión a la que volver.
- **Reglas de Firestore y Storage:** se vuelve al conjunto anterior desde la
  consola, en el historial de reglas. También se puede desplegar desde el tag
  `prod/firestore/…` o `prod/storage-rules/…`.
- **Hosting:** en la consola, historial de versiones → revertir.
- **Vercel:** en el panel, *Promote* de un despliegue anterior.

## 6. CI y el workflow de producción (FASE 5–6 del Harness)

**CI** (`.github/workflows/ci.yml`), en cada PR y en cada push a `main`. Tiene
tres niveles, en el orden que pidió el dueño; si uno falla, el siguiente no
arranca:
1. **TypeScript y build**: la app con 0 errores, las Functions y la web (lo
   mismo que construye Vercel);
2. **pruebas**: todas las suites (`npm --prefix functions run test:todas`), sin
   parar en la primera que falla, y las de emulador con proyectos `demo-*`;
3. **seguridad y políticas**: ningún secreto en el repositorio
   (`scripts/escaneo-secretos.mjs`, sin herramientas externas) y las suites de
   la guardia, la entrega, el mapa de producción, el despliegue, la rotación y
   los emuladores aislados.

Para que la CI se ejecute ANTES de entrar en `main`, el dueño activa en GitHub
la protección de `main` (PR obligatorio con los cuatro checks en verde).

Sin secretos, sin credenciales de Google y sin gasto (`scripts/ci-sin-secretos.mjs`).

**Producción** (`.github/workflows/despliegue.yml`) es **el único camino**, y se
lanza a mano desde Actions con un commit y un objetivo:
1. **Verificar**, sin credenciales de Google:
   - SHA completo, en `main`;
   - los tres niveles de la CI (sus cuatro checks) en verde en ESE commit;
   - y `ops/permitido.mjs`, que impide pisar lo que funciona.
2. **Aprobación del dueño** en el entorno de GitHub `get-wee`. No se llama
   `production`, porque choca con el `Production` de Vercel.
3. **Desplegar** con una identidad sin claves (Workload Identity Federation).
   - Antes, se anotan las revisiones que sirven (en el log del run, por si la
     marcha atrás automática no pudiera).
   - Después, **humo sin gasto**: una petición sin sesión por función. 401/403
     significa viva y cerrada; 5xx o no responder es fallo. La revisión nueva
     tiene que estar lista **y ser la que sirve**.
   - **La web, por sha256**: cada archivo que publica el sitio se compara con
     el del build de ese commit (`hashes`).
   - **Observación posterior, 10 minutos** (`OBSERVACION` en `plan.mjs`):
     - se cuentan los 5xx de las funciones desplegadas y se comparan con los de
       los 10 minutos anteriores al despliegue;
     - si suben más de 5, el despliegue falla;
     - si no se pueden medir, también.

     Un proveedor caído ya da 503 controlados sin que nadie despliegue nada:
     por eso cuenta la subida y no el total. La regla es código con cifras
     escritas, nunca una IA.
   - Si algo falla, el tráfico vuelve solo a las revisiones de antes, salvo las
     prohibidas (§5).
   - El token de acceso dura una hora: la observación y la marcha atrás piden
     uno nuevo.
4. **Registrar** un tag inmutable `prod/<qué>/<cuándo>` sobre el commit. Su
   mensaje es el **registro del despliegue**:
   - commit y run;
   - la revisión que quedó sirviendo y el **digest exacto de su imagen**
     (`status.imageDigest` de Cloud Run) para cada función;
   - la versión publicada y los archivos comparados para cada sitio.

   Es lo que la auditoría H0 tuvo que reconstruir a mano. Sale también en el
   resumen del run.

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
     mínimos: sin Owner, sin leer secretos y sin IAM. Para observar solo lee
     métricas (`roles/monitoring.viewer`).
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
