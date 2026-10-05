# El primer despliegue controlado: `spendCredits`

Weë Agent Harness, FASE 8. **Ejecutado el 2026-10-05** con el workflow
gobernado: desplegado, pero sin cerrar (ver «Ejecución», al final).

## Por qué es el primero

- Lleva el arreglo de seguridad pendiente: `assertAdmin` en el código
  (`b878068`, H0 #24). Hoy `spendCredits` está cerrada solo por IAM: el
  invocador público se retiró a mano el 2026-09-30.
- Ninguna persona la usa (ver «Antes», punto 3).
- No llama a ninguna IA: desplegarla no genera gasto de proveedores.
- Recorre el camino entero con el menor riesgo posible: verificar, aprobar,
  WIF, desplegar, humo, observar, registrar y tag.

## Antes (todo en solo lectura)

| # | Qué | Cómo | Estado |
|---|---|---|---|
| 1 | La función está protegida en el código | `credits-cliente-cerrado`: `assertAdmin` antes de tocar el Credit Engine; una sesión normal recibe `permission-denied` | ✔ en local (suite en la cadena) |
| 2 | IAM hoy | `gcloud run services get-iam-policy spendcredits --region us-central1 --project get-wee`: no debe aparecer `allUsers` | Lo mira el dueño (credenciales suyas) |
| 3 | Ningún cliente legítimo depende del acceso público | El cliente tiene un envoltorio `creditsService.spend` que **nadie llama**. Comprobado en las dos webs vivas (`bfc622d`, `afbc2df`), en `main` y en la integración; lo vigila `credits-cliente-cerrado` (4). H0: 0 transacciones de cliente en producción | ✔ |
| 4 | Logs | `gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="spendcredits"' --freshness=30d --limit=50 --project get-wee --format="table(timestamp,httpRequest.status)"`: solo 401/403 desde que se cerró | Lo mira el dueño |
| 5 | Marcha atrás | A la revisión sin arreglo (`spendcredits-00005-puz`) **no se vuelve**: está prohibida por diseño (`revisionesSinArreglo`). Si la nueva fallara, se queda la nueva, que está cerrada en el código, y se corrige hacia delante. Nadie depende de ella | ✔ (despliegue-workflow 31–34) |
| 6 | El commit lleva el arreglo y el código vivo | `node ops/permitido.mjs --commit <merge> --funciones spendCredits` → 0 | Tras la integración |

## Durante (el workflow, con la aprobación del dueño)

```
Actions → «Despliegue a producción» → commit = <SHA de main> · objetivo = functions:spendCredits
```

1. **Verificar:** SHA de `main`, los cuatro checks de CI en verde, `permitido.mjs`.
2. **Aprobación** en el entorno `get-wee`.
3. **WIF**, revisiones de antes, `firebase deploy --only functions:spendCredits`.
   La guarda de `firebase.json` deja pasar solo este workflow.
4. **Humo:** una petición sin sesión. Esperado: **403**, de Cloud Run. Actualizar
   una callable **no toca su invocador**: en firebase-tools 15.29.0 (el que fija el
   workflow), `updateV2Function` no tiene rama para las callables, así que `allUsers`
   sigue retirado y la petición no llega al código. Si el punto 2 de «Antes» hubiera
   encontrado `allUsers`, se vería **401** (`unauthenticated`) del código. Cualquier
   respuesta 2xx–4xx pasa el humo. (Lo contrario vale al CREAR: una callable nueva se
   hace pública siempre.)
5. **Observación, 10 minutos:** los 5xx de `spendcredits` contra los 10 minutos
   anteriores. Si suben más de 5, o no se pueden medir, la marcha atrás se
   intenta y queda **bloqueada** (punto 5): el run sale en rojo y avisa.
6. **Registro y tag** `prod/functions/spendCredits/<cuándo>`: revisión, digest de
   la imagen, quién lo lanzó y con qué workflow.

## Después

- **Comportamiento:** sin `allUsers`, Cloud Run responde **403** a cualquier
  llamada que no traiga una identidad de Google con permiso de invocar, con o sin
  sesión de Firebase. Las dos cerraduras siguen puestas: IAM delante y `assertAdmin`
  en el código. El humo ya lo comprueba sin sesión.
- **Logs:** ningún 5xx; ninguna escritura en `creditTransactions` con
  `source: client`.
- **Gasto:** ninguno (no llama a IA). En Billing → Reports, nada nuevo atribuible.
- **Revisión y hash:** la del registro coincide con la que sirve.
- **Invocador (el dueño, solo lectura):** comprobar que sigue sin `allUsers`
  (`gcloud run services get-iam-policy spendcredits --region us-central1 --project get-wee`).
  No hace falta retirarlo: actualizar no lo reabre.
- **Registro posterior, en UN PR:**
  - `ops/produccion.json` → `spendCredits`: la revisión nueva, `commit` = el SHA
    desplegado, el `tag` del workflow y su fecha (`desde`); `fuente` (zip#generación,
    md5) y `build` de la revisión nueva, que el dueño lee de Cloud Functions / Cloud
    Build. Se **quita `requiere`**: la revisión nueva ya lleva `b878068`, y si se
    dejara, la marcha atrás trataría la revisión nueva como «sin arreglo». El
    `aviso` pasa a historia: `00005` / `bfc622d` no tienen `assertAdmin`.
  - En el mismo PR, las pruebas que fijan el estado de antes: `produccion-mapa`
    (comprobación 5) y `despliegue-workflow` (31–33) pasan a probar la regla con un
    mapa de juguete, sin depender de que `spendCredits` tenga un arreglo pendiente.
  - La revisión `00005` sigue prohibida en la historia: ya no está en el mapa, así
    que ni la marcha atrás ni la vuelta al mapa pueden llegar a ella.
- **No se pasa al grupo siguiente** (`ops/despliegue/grupos.json`, `g1-cambio-minimo`)
  hasta validar todo lo anterior. Ante cualquier anomalía, se detiene.

## Ejecución (2026-10-05)

- **Run 37258963670:** se paró en la comprobación previa de firebase-tools, que
  exige «actuar como» la cuenta de App Engine (`checkIam.js` la comprueba
  siempre, aunque las gen2 corran con la de ejecución). Producción no cambió. El
  dueño concedió `roles/iam.serviceAccountUser` solo sobre esa cuenta, que no
  tiene roles en el proyecto. Queda anotado en `ops/iam/wif.mjs` y lo comprueba
  `wif-verificar`.
- **Run 37259825016:** WIF ✔, la guarda ✔, y `firebase deploy` actualizó **solo**
  `spendCredits` → `spendcredits-00006-duh` (código de `acf1f56`, con
  `assertAdmin`). El humo se cayó **antes de hacer ninguna petición**: al cargar
  el compilado, firebase-admin 12 leyó la credencial `external_account` de WIF y
  no la entiende. La marcha atrás se negó a volver a `00005`, como manda el
  diseño. No hubo observación, registro ni tag.
- **Comprobado después, en solo lectura y con las credenciales del dueño:**
  - `00006-duh` sirve el 100 % del tráfico.
  - La política IAM no tiene bindings: sin `allUsers`.
  - Desde el despliegue solo hay logs de arranque, ni peticiones ni 5xx.
- **Arreglo:** `cargarCompilado` (`ops/despliegue/cli.mjs`) carga el compilado
  sin `GOOGLE_APPLICATION_CREDENTIALS`, como en Cloud Run. Lo prueban
  `despliegue-workflow` 35b–35c con una credencial falsa y sin red. El registro
  de `00006-duh` está en `ops/produccion.json`, sin `requiere` y con `sinTag`.
- **Para cerrar:** el próximo despliegue gobernado de `spendCredits` recorre
  humo, observación, registro y tag.
