# El primer despliegue controlado: `spendCredits`

Weë Agent Harness, FASE 8. **Preparado, no ejecutado:** necesita la
autorización del dueño, el workflow activo (CI en GitHub, WIF y el entorno
`get-wee`) y la integración en `main`.

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
4. **Humo:** una petición sin sesión. Esperado: **401** (`unauthenticated`).
   `firebase deploy` le devuelve el invocador público, pero el código no abre
   nada.
5. **Observación, 10 minutos:** los 5xx de `spendcredits` contra los 10 minutos
   anteriores. Si suben más de 5, o no se pueden medir, la marcha atrás se
   intenta y queda **bloqueada** (punto 5): el run sale en rojo y avisa.
6. **Registro y tag** `prod/functions/spendCredits/<cuándo>`: revisión, digest de
   la imagen, quién lo lanzó y con qué workflow.

## Después

- **Comportamiento:** con una sesión normal, `permission-denied`; sin sesión,
  `unauthenticated`. El humo ya lo comprueba sin sesión.
- **Logs:** ningún 5xx; ninguna escritura en `creditTransactions` con
  `source: client`.
- **Gasto:** ninguno (no llama a IA). En Billing → Reports, nada nuevo atribuible.
- **Revisión y hash:** la del registro coincide con la que sirve.
- **Opcional (IAM, el dueño):** volver a retirar el invocador público. El código
  ya cierra, así que es una capa más, no la cerradura.
- **Actualizar `ops/produccion.json` en un PR:** revisión nueva, commit y tag.
  La revisión `00005` sigue como prohibida en la historia.
- **No se pasa al grupo siguiente** (`ops/despliegue/grupos.json`, `g1-cambio-minimo`)
  hasta validar todo lo anterior. Ante cualquier anomalía, se detiene.
