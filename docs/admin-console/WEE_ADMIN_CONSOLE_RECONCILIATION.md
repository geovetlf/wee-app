# Weë Admin Console — conciliar `adminAudit` con el libro

> Procedimiento manual con una herramienta de solo lectura. **No hay conciliación automática**, ni se ha tocado `creditEngine`.

## 1. Qué significa cada entrada

| Entrada | Significa | No significa |
|---|---|---|
| `intento` | La puerta autorizó y va a ejecutar | Que ocurriera |
| `ok` | La llamada terminó sin lanzar | Que hiciera lo pedido: mira `resultadoDuplicado`, `resultadoEstado`, `resultadoImporte`, `resultadoDesenlaces` |
| `error` | La llamada lanzó | Que no pasara nada: un fallo de red tras confirmar la transacción también lanza |
| `denegado` | No tenía permiso | — |

## 2. Cómo se distinguen los fallos

| Lo que se ve | Fallo de… | Cómo se sabe |
|---|---|---|
| `intento` sin cierre, y **el libro lo tiene** | La auditoría, o el proceso murió tras actuar | `ocurrio-sin-cierre`. Si fue la auditoría, en el registro: «la operación se hizo y no se pudo registrar su cierre», con la misma correlación |
| `intento` sin cierre, y **el libro no lo tiene** | El proceso murió antes de actuar | `no-consta` |
| `error`, y el libro no lo tiene | La operación | Normal; `codigoDeError` dice por qué. No se informa |
| `error`, y **el libro lo tiene** | Lo que falló fue la respuesta | `error-con-movimiento`. Quien llamó puede creer que no pasó |
| Sin ninguna entrada, y el libro tiene `source: admin` | Se hizo por fuera de la puerta, o antes de existir | `movimiento-sin-constancia`. Es lo único que apunta a una acción externa |
| Sin `intento` ni acción | La auditoría falló antes | La operación respondió `unavailable`. Solo en el registro |

Las operaciones sin libro (motor, moderación, evaluaciones, canary) salen como `revisar-a-mano`: de ellas no se puede saber si ocurrieron mirando un documento.

## 3. Procedimiento

1. `node ops/admin/intentos-sin-cierre.mjs --proyecto <id> --confirmar-proyecto <id> [--horas 72] [--minutos 30]`. Solo lee.
   Ignora los `intento` más recientes que `--minutos`: pueden seguir en marcha. La callable más lenta dura 300 s; 30 minutos da margen de sobra.
2. Para cada hallazgo:

| Clase | Qué hacer | Por qué es seguro |
|---|---|---|
| `ocurrio-sin-cierre` | Nada en Credits; anotarlo | No hay que repetir |
| `no-consta` | Preguntar a quien la pidió si sigue haciendo falta. Si sí, repetir con el **MISMO `requestId`** | El motor no paga dos veces, aunque una ejecución anterior sí llegara a confirmar |
| `error-con-movimiento` | Avisar a quien la pidió: **sí** ocurrió. Si había que deshacerlo, `refundCredits` con su `requestId` | Devolver también es idempotente |
| `movimiento-sin-constancia` | Investigar en Cloud Audit Logs quién usó el Admin SDK | Es una posible acción por fuera de Weë |
| `revisar-a-mano` | Comparar el estado actual con lo pedido, en sus metadatos | Las de configuración son idempotentes por naturaleza; no las de evaluación, que gastan |

## 4. Por qué no es automática

- **Que no conste no prueba que deba hacerse.** Pudo cancelarse a propósito. Hacerlo solo crearía movimientos que nadie pidió a esa hora.
- **`refundCredits` con `force`, y `grantCredits`, mueven dinero.** Una reparación automática con un fallo multiplica el daño.
- **No se puede demostrar que la llamada original ya no está viva**, salvo por tiempo. Con un mismo `requestId` el dinero es seguro, pero una decisión tomada sobre un dato viejo no.

Por tanto: el informe puede automatizarse sin riesgo; **la reparación no**.

## 5. Trampa existente: `grantCredits` sin `requestId`

Si no llega `requestId`, la callable genera `admin_<fecha>` (comportamiento anterior, conservado). **Dos reintentos sin `requestId` pagan dos veces.** No se ha cambiado para no alterar el contrato sin autorización. Antes de exponer esta operación en la consola, `requestId` debería ser obligatorio.

## 6. Pruebas

- `admin-seguridad` F12–F14: clasificación pura y que las herramientas no tienen ninguna escritura.
- `admin-seguridad.emulator` G1–G9: cada clase contra el libro real, la herramienta no cambia ni saldo ni libro ni auditoría, repetir lo ocurrido no paga dos veces, y lo que no constaba paga una sola vez aunque se reintente.

## 7. Lo que falta para operar esto en real

- Una alerta en Cloud Logging sobre «no se pudo registrar su cierre» y «sin constancia no se actúa».
- Quién ejecuta el informe y cada cuánto.
- Indexar `creditTransactions.source`: hoy el informe usa el índice automático de un campo y lee todos los movimientos de administración de la historia, filtrando por fecha en memoria.
