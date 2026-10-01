# Seguridad de Weë — secretos, identidades y la guardia de Claude

Documento operativo del **Weë Agent Harness** (auditoría H0 del 2026-09-30 y su
FASE 1). Nada de esto se ve en la app: quien usa Weë no ve proveedores, claves,
identidades ni el Harness.

## 1. Tres barreras, en este orden

1. **La credencial.** Lo que una identidad no puede hacer no se hace por error.
   Claude no trabaja con credenciales de Owner. Su identidad propia está
   pendiente (§7).
2. **El servidor.** Las cerraduras que importan viven en las Functions:
   - `spendCredits` solo admite administración (`assertAdmin`);
   - los Credits solo los mueve el Credit Engine (`docs/CREDITS.md`);
   - App Check está pendiente (§7).
3. **La guardia de Claude.** `.claude/settings.json` + `.claude/hooks/guardia.mjs`
   (§6): una segunda barrera, determinista y barata, en el portátil.

## 2. Dónde viven los secretos

**Producción: Cloud Secret Manager de `get-wee`.**
- Se declaran en `functions/src/secrets.ts`: 9 de IA en `PROVIDER_SECRET_NAMES`
  y 2 de R2 en `MEDIA_SECRETS`.
- Cada función monta los suyos en su opción `secrets`, y **la versión queda
  FIJADA al desplegar**. Una versión nueva no llega a ninguna función hasta que
  se actualiza la función (§4).

Quién monta qué a 2026-09-30 (H0). Son servicios de Cloud Run en `us-central1`:

| Secreto | Servicios que lo montan |
|---|---|
| GEMINI, ANTHROPIC, OPENAI, DEEPSEEK, BFL, ELEVENLABS, MINIMAX | `avatarreplacement`, `brainchat`, `brainquote`, `creatorchat`, `creatorquote`, `creatorrun`, `engineadmin`, `generateavatarwithgemini`, `generatevideo` |
| ARK_API_KEY | los 9 anteriores + `barridodeliquidacion` |
| SEEDANCE_CALLBACK_TOKEN | los 9 anteriores + `seedancecallback` |
| R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY | `mediacanary` |

Para ver la versión que monta un servicio (solo lectura, no muestra valores):

```
gcloud run services describe brainchat --region us-central1 --project get-wee --format="yaml(spec.template.spec.containers[0].env)"
```

**El portátil no guarda ninguna clave por defecto.**
- El 2026-09-30, las claves de `functions/.env.local` se movieron, sin leerlas,
  a `C:/Users/Geovet/wee-claves-retiradas/`, fuera del repo. La carpeta se borra
  cuando termine la rotación (§4).
- `npm run functions:emulator` se niega a arrancar si vuelve a haber claves de
  proveedor en `.env.local` o valores en `.secret.local`.
- Corre con el proyecto `demo-wee` y con `.secret.local` vacío, así que todo va
  en modo demo y nada llega a producción (`scripts/emulators.mjs`).

**Lo que se sube al desplegar.** `firebase.json` → `functions.ignore` deja fuera
`.env.local`, `.secret.local`, `*.local`, las pruebas y los logs. Hasta el
2026-09-30 no existía, y `functions/.env.local` viajaba dentro del zip de 30 de
las 34 funciones. Esos zips y sus imágenes siguen en Cloud Storage y en Artifact
Registry hasta el próximo despliegue de cada función. **Por eso las cuatro
claves que estaban en el portátil hay que ROTARLAS: borrarlas del portátil no
basta.**

## 3. Lo que ya está cerrado

| Qué | Dónde | H0 |
|---|---|---|
| `spendCredits` deja de ser público: invocador `allUsers` retirado en producción y `assertAdmin` en el código | `functions/src/credits/index.ts`, `functions/test/credits-cliente-cerrado.test.mjs` | escenario #24 |
| Ninguna clave local viaja en un despliegue; `functions/lib` y `.claude/settings.local.json` fuera del índice | `firebase.json`, `.gitignore`, `functions/test/entrega-configuracion.test.mjs` | — |
| Emuladores aislados de producción (Auth, Firestore, Functions y Storage, proyecto `demo-wee`, solo 127.0.0.1) | `scripts/emulators.mjs`, `scripts/web-demo.mjs`, `functions/test/emulador-aislado.test.mjs` | escenario #25 |
| La configuración heredada de Claude, que preaprobaba `firebase deploy`, `functions:delete`, `git push` y `vercel`, se sustituye por la guardia | `.claude/`, `functions/test/guardia-claude.test.mjs` | — |

**Ojo con el invocador público.** `firebase deploy` (firebase-tools 15.29) vuelve
a poner el invocador público en cada callable que despliega. La cerradura que
dura es la del código (`assertAdmin`); el IAM es una capa extra que el próximo
despliegue deshace.

## 4. Rotar una clave de proveedor de IA (ARK, GEMINI, BFL, DEEPSEEK)

**Lo hace el dueño**, desde su terminal y sus consolas. Claude no puede: la
guardia le deniega `functions:secrets:set` y leer valores.

Nunca pegues una clave en el chat, en un archivo del repo, en un issue ni en la
línea de comandos.

### En qué orden, y los comandos exactos

`node ops/secretos/rotacion.mjs` imprime el orden y su porqué.
`node ops/secretos/rotacion.mjs comandos <grupo> <versión nueva>` imprime, para
ese grupo, los comandos fase a fase con el nombre de cada servicio.

- El script **solo imprime**: no ejecuta nada ni lee ningún valor.
- Saca quién monta cada secreto del código compilado.
- `functions/test/rotacion-secretos.test.mjs` comprueba que eso coincide con lo
  que H0 vio vivo (§2).

| # | Grupo | Por qué en este lugar | Canario |
|---|---|---|---|
| 1 | **R2** (Cloudflare, §5) | El nombre del token está en el registro de auditoría y de él se calcula el secret de R2. Solo lo monta `mediacanary`, que nadie usa: valida el procedimiento sin tocar a ninguna persona | `mediacanary` |
| 2 | **GEMINI** | La más usada (texto, búsqueda, visión, imagen, avatar). Su gasto va a la cuenta de facturación. Verificarla cuesta un mensaje | `brainchat` |
| 3 | **ARK** | La más cara por llamada (vídeo). También la monta el barrido, que solo consulta | `generatevideo` |
| 4 | **BFL** | Imágenes con gasto | `creatorrun` |
| 5 | **DEEPSEEK** | La menos usada. Es la que gestiona Firebase: aquí está la trampa de `secrets:set` | `brainchat` |

- **Una a una.** Si algo falla, se sabe qué fue. Las cuatro de IA las montan
  los mismos 9 servicios: cada rotación crea 9 revisiones nuevas, todas con la
  misma imagen.
- **No se rotan** ELEVENLABS, ANTHROPIC, OPENAI, MINIMAX ni
  SEEDANCE_CALLBACK_TOKEN: no estaban en el portátil (H0) y solo viven en
  Secret Manager.
- **Después de cada rotación, `ops/produccion.json`.** Las revisiones de antes
  montan la versión vieja: tras revocarla, volver a ellas deja la función sin
  proveedor, y tras deshabilitarla, sin arrancar. El mapa se actualiza en un PR
  con las revisiones nuevas, para que `marcha-atras --al-mapa` vuelva a una
  posterior.
- **Por qué `gcloud run services update`.** Google documenta que una función
  gen2 se puede editar con la API de Cloud Run. Además:
  - no reconstruye el código: la imagen que sirve es la misma, solo cambia la
    versión del secreto;
  - no exige desplegar desde `main`, que hoy no tiene el código vivo de cuatro
    de esas funciones ([INTEGRACION-PRODUCCION.md](INTEGRACION-PRODUCCION.md)).
    Redesplegarlas para rotar borraría lo que funciona.

> **La trampa de `firebase functions:secrets:set`.** Con un secreto que gestiona
> Firebase (hoy, DEEPSEEK), al terminar pregunta *«Do you want to re-deploy the
> functions and destroy the stale version…?»* y la respuesta por defecto es
> **Sí**. Si se acepta, actualiza las funciones y **DESTRUYE la versión anterior
> en el acto**, sin margen para volver atrás. Por eso aquí se usa otro camino:
> conserva la versión vieja hasta haber verificado.

Para cada clave `K`:

1. **Crea la clave nueva** en la consola del proveedor, con el mínimo alcance que
   permita. La de Gemini, restringida a la Generative Language API.
2. **Añade una versión nueva en Secret Manager.**
   - En la consola de Google Cloud: Secret Manager → `K` → *Nueva versión*. Pega
     el valor ahí y anota el número de versión, `N`.
   - La consola no añade un salto de línea al final. Si lo haces por terminal,
     evita el salto final: el avatar (`vertexAI.ts`) y R2 no recortan el valor.
3. **Actualiza los servicios que montan `K` (§2), sin tocar el código.**
   - Cada función gen2 es un servicio de Cloud Run. Cambiar su versión de secreto
     crea una revisión nueva con la MISMA imagen:

     ```
     gcloud run services update brainchat --region us-central1 --project get-wee --update-secrets K=K:N
     ```

   - Empieza por un solo servicio, comprueba (paso 4) y sigue con el resto.
   - Un `firebase deploy` posterior fijará la versión más reciente habilitada,
     que ya será `N`, así que el cambio no se pierde.
4. **Verifica** antes de seguir:
   - `describe` (§2) muestra `K:N` en la revisión que sirve;
   - una acción real y barata desde la app con ese proveedor: un mensaje a Weë
     Brain si es de texto, o una imagen;
   - 24 h sin errores de autenticación del proveedor en los logs.

   El vídeo (ARK) cuesta más. Usa el más corto o espera tráfico normal.
5. **Revoca la clave VIEJA en el proveedor.** Es el paso que de verdad cierra la
   fuga, porque la clave vieja está en zips antiguos. Hazlo solo después del
   paso 4.
6. **Deshabilita la versión vieja** sin destruirla:

   ```
   gcloud secrets versions disable <vieja> --secret K --project get-wee
   ```
7. **Destrúyela** tras una semana sin incidencias. Es irreversible:

   ```
   gcloud secrets versions destroy <vieja> --secret K --project get-wee
   ```

**Marcha atrás** en cualquier momento antes del paso 5:

```
gcloud run services update-traffic SERVICIO --region us-central1 --project get-wee --to-revisions REVISION_ANTERIOR=100
```

Al terminar las cuatro rotaciones, borra `C:/Users/Geovet/wee-claves-retiradas/`.

## 5. Cloudflare y R2

**Lo que se sabe (H0, informe 2 §4):**
- En Secret Manager hay un secreto con 0 versiones cuyo **nombre** tiene la forma
  de un API token de Cloudflare (`cfat_…`). Se creó el 2026-09-20 a las 23:29
  UTC desde la consola: un token pegado en el campo «nombre».
- El nombre queda en el registro de auditoría de Google Cloud, que guarda 400
  días y no se puede borrar. **Borrar el secreto no basta: hay que revocar el
  token.**
- R2 solo lo usa Media Cloud. Las credenciales S3 vigentes son
  `R2_ACCESS_KEY_ID@3` y `R2_SECRET_ACCESS_KEY@2`, y solo las monta
  `mediacanary`.
- Ningún cliente usa R2.
- Cloudflare define el Secret Access Key de R2 como el **SHA-256 del valor del
  token** (`functions/src/media/r2.ts`). Si el token expuesto es el que respalda
  esas credenciales, cualquiera que haya visto el nombre puede calcular el
  secret.

**Pasos (el dueño, en este orden):**
1. **Confirma la dependencia.** En el panel de Cloudflare (API Tokens y R2 →
   *Manage API tokens*), localiza el token creado el 2026-09-20 hacia las 23:2x
   UTC. Comprueba si su ID coincide con el Access Key ID en uso, comparándolo en
   las consolas y sin pegarlo en ningún chat.
2. **Crea un token de R2 nuevo** con *Object Read & Write* solo sobre el bucket
   de Weë y sin permisos de cuenta.
3. **Añade las versiones nuevas** en la consola (R2_ACCESS_KEY_ID v4 y
   R2_SECRET_ACCESS_KEY v3) y actualiza el servicio:

   ```
   gcloud run services update mediacanary --region us-central1 --project get-wee --update-secrets R2_ACCESS_KEY_ID=R2_ACCESS_KEY_ID:4,R2_SECRET_ACCESS_KEY=R2_SECRET_ACCESS_KEY:3
   ```
4. **Verifica con el canario de medios** (`scripts/canary-medios.mjs subir …
   --ejecutar`). Escribe un objeto de prueba en R2; mira el uso en la cabecera
   del script.
5. **Revoca el token viejo en Cloudflare.**
6. **Borra el secreto `cfat_…`** y el secreto en minúsculas `r2_ACCESS_KEY_ID`,
   que no se usa:

   ```
   gcloud secrets delete <nombre> --project get-wee
   ```

   Es irreversible.
7. **Deshabilita y después destruye** las versiones superadas:
   - R2_ACCESS_KEY_ID v1, v2 (ya deshabilitada) y v3;
   - R2_SECRET_ACCESS_KEY v1 y v2;
   - DEEPSEEK_API_KEY v1.

   Destrúyelas solo cuando la verificación del paso 4 lleve días en verde.
8. **Limpia lo local, si quieres.** Tras revocar, decide si purgar los logs
   locales de gcloud (caducan solos en unos 30 días) y las transcripciones que
   contienen el nombre.

## 6. La guardia de Claude

Claude Code carga `.claude/settings.json` (versionado). Las reglas se evalúan en
el orden **deny → ask → allow**: un deny gana siempre, y un ask gana a un allow
aunque el allow venga de un `settings.local.json` personal.

**deny — no se ejecuta nunca desde Claude:**
- desplegar con firebase, npm, Vercel o EAS;
- `functions:delete` y los `secrets:set/destroy`;
- `gcloud … delete|deploy|purge|rm` y `gsutil rm|rb`;
- leer valores de secretos y leer `.env.local`, `.secret.local`,
  `.env.get-wee`, ADC, el configstore de firebase-tools y las claves retiradas;
- `gh auth token`;
- aprobarse un despliegue pendiente;
- pushes forzados o que borran ramas.

**ask — necesita al dueño:**
- `git push`, merge de PR, lanzar workflows, secretos y variables del repo,
  releases;
- IAM y cualquier verbo de gcloud que cambie algo;
- `firebase use`/`init`, y emuladores sin proyecto `demo-*`;
- git local destructivo (`reset --hard`, `branch -D`, `worktree remove`…);
- scripts con `--ejecutar` o `--confirmo-autorizacion`;
- editar `.claude/**`, `.firebaserc`, `creditEngine.ts` o el Financial Core.

**allow — el ciclo local:** pruebas, `tsc`, build, git de lectura, add y commit,
emuladores `demo-*`, `npm run web:demo`, y crear o ver PR y runs.

**El hook** (`.claude/hooks/guardia.mjs`) es la segunda barrera.
- Las reglas de texto no ven las variantes. El hook parte el comando de verdad:
  comillas, heredocs, `&&`/`||`/`;`/`|`, `bash -c`, `cmd /c`,
  `powershell -Command`, `npx`, `node …/firebase.js`, rutas a `.cmd` y prefijos
  de variables.
- Así, un mensaje de commit que *menciona* `firebase deploy` pasa, y
  `firebase --project prod deploy` no.
- Vercel va al revés: solo pasan los subcomandos de lectura, porque cualquier
  otro argumento despliega.
- Si el hook falla por sí mismo, **falla abierto** y las reglas deny siguen
  activas.

**Para cambiarla:**
- edita `.claude/` (Claude pregunta antes de hacerlo);
- añade a `functions/test/guardia-claude.test.mjs` el comando que dispara cada
  firma nueva y uno parecido que NO debe dispararla;
- pasa la suite, que está en la cadena de `npm --prefix functions test`.

**`settings.local.json`** es personal e ignorado por git. Claude Code lo usa
para guardar aprobaciones de «permitir siempre». El heredado se retiró el
2026-09-30; si hace falta, se recupera con
`git show dad0ca2:.claude/settings.local.json`. No pongas ahí permisos de
desplegar ni de push: no pueden ganar a un deny ni a un ask, y la guardia decide
igual.

## 7. Pendiente (requiere al dueño)

- **Identidad propia de Claude**, sin Owner, sin facturación, sin IAM y sin
  secretos. La autonomía crece por automatización, no por privilegios.
- **IAM de secretos.** Quitar `roles/secretmanager.secretAccessor` a nivel de
  proyecto a la SA de cómputo, porque cada secreto en uso ya tiene su binding.
  Después, cuentas de servicio por grupo de funciones (IA, medios, básicas).
- **Rotaciones** de §4 y §5, y borrado de versiones viejas solo tras verificar.
- **App Check**, primero midiendo y después imponiéndolo de forma gradual, sin
  romper el login ni a los usuarios existentes.
