# MODERATION CORE — casos, acciones, sanciones, apelaciones y auditoría

> Rama `moderation/core` (creada sobre `d9abcf0c`). **Nada integrado, nada desplegado.** PR en borrador #41 «NO MERGE».
> Contrato `2.0` del Moderation Core, encima de la fundación `1.0` de Denunciar (`docs/MODERATION.md`), que no cambia de forma.
> Lo vigilan `functions/test/moderation-core.test.mjs` (en `npm test`) y `functions/test/moderation-core.emulator.mjs` (emuladores).
> Las decisiones del dueño del **2026-11-07** están en § 2; la integración futura, en [`MODERATION-CORE-INTEGRACION.md`](MODERATION-CORE-INTEGRACION.md).

La fundación hizo que denunciar existiera de verdad: un reporte creado por el servidor, con estado e historial. Lo que
faltaba era todo lo que viene después —agrupar lo que se dice de un mismo contenido, priorizarlo, revisarlo, actuar,
deshacer, apelar y dejar constancia— sin que la futura Consola Administrativa tenga que rediseñar nada para conectarse.
Eso es el Moderation Core. **No construye la interfaz administrativa**: le da contratos.

## 1. Arquitectura

```
REPORTE (reportContent) ──► INTAKE (moderationIntake) ──► CASO (uno por contenido)
                                                              │
                         Consola (moderationConsole, solo lectura)
                                                              │
        una callable por acción ──► PUERTA ──► TRANSACCIÓN ──► caso + historial + efecto + acción + aviso + AUDITORÍA
                                                              │
                         persona afectada: getMyModeration · submitModerationAppeal ──► APELACIÓN
                                                              │
                         moderationSweep: vencimientos · reportes sin caso · desenlaces
```

| Pieza del encargo | Dónde vive | Qué es |
|---|---|---|
| **Moderation Service** | `functions/src/moderation/nucleo.ts` (`crearNucleoDeModeracion`) | La composición: cada operación es UNA transacción que lee, pregunta al contrato y escribe todo o nada |
| **Reports** | `reports` + `core/moderation.ts` (fundación) | La señal de una cuenta. Ahora lleva `caseId` y `priority` y su historial apunta `REPORT_ATTACHED_TO_CASE` |
| **Cases** | `core/moderation-case.ts` · `moderationCases` | Uno por contenido, id determinista; estados, prioridad, cola, señales y denunciantes |
| **Moderation Actions** | `core/moderation-action.ts` · `moderationActions` | Una función por acción; cada acción guardada una vez y para siempre (es su idempotencia) |
| **Appeals** | `core/moderation-appeal.ts` · `moderationAppeals` | La persona afectada pide revisión; guarda la decisión original y no sobrescribe nada |
| **Moderation Audit Log** | `moderationAudit` | Quién hizo o intentó qué; se crea y no se toca; lo hecho, en la misma transacción |
| **Notifications** | `moderationNotices` | Avisos ESCRITOS y SIN ENVIAR (`delivery: 'PENDING_INTEGRATION'`): el punto de enganche |
| **Policies and Rules** | `core/moderation-*.ts` + `moderationPolicies/{id}` | Prioridad, ocultación preventiva (apagada), retirada, apelaciones y abuso; sin documento, las de por defecto |

**Reutiliza, no duplica.** La autorización es `isAdmin` (`shared/admin.ts`) + la barrera del invitado
(`identity/sesion.ts`) + la relectura de Auth; la identidad sale de `entities` (`entidadDelPerfil`) o, en lo histórico, del
perfil guardado con la frontera de compatibilidad (`caraDelPerfilGuardado` → `cuentaDeIdentidad`, que LEE
`linkedAccountId`); los errores son los de Denunciar (`RechazoDeModeracion` → `aHttpsError`: un código, nunca una frase);
la huella es la de la fundación (`huellaDelSistema`). No hay un segundo sistema de reportes: `reportContent` sigue siendo la
única puerta para denunciar.

**Sin IA, sin proveedores, sin Credits, sin pagos, sin eventos.** Ningún modelo, ninguna llamada de red, ningún movimiento
de Credits, ningún transporte de eventos (suite pura L163, L164, L167).

## 2. Decisiones aprobadas por el dueño (2026-11-07)

Comprobadas contra el código. «Pura» = `moderation-core.test.mjs`; «emulador» = `moderation-core.emulator.mjs`;
«fundación» = `moderation.test.mjs`.

**5.1** — *Un reporte no oculta nada; crea o actualiza el ÚNICO caso de su contenido, sin duplicados aunque lleguen a la
vez; la cara Real y la Weë de una cuenta cuentan como una persona; los denunciantes distintos pueden subir la prioridad,
pero nunca prueban por sí solos una infracción.*

| Se cumple en | Evidencia |
|---|---|
| `moderation/index.ts: crearModeracion().reportar` escribe solo el reporte, su historial y el límite: no lee ni toca el contenido más que para saber de quién es | Pura B59 (publicación intacta), M1; emulador A5; fundación B53 |
| `core/moderation-case.ts: idDeCaso` (id determinista por contenido) + `nucleo.ts: adjuntarReporte` (una transacción sobre ESE documento) | Emulador A1: 25 denuncias simultáneas → UN caso, 25 señales, 25 denunciantes exactos; pura B61 |
| `decidirIntake`: el denunciante distinto se cuenta por la marca `reporters/{accountId}` —la CUENTA, no la cara— | Pura A34, B61 (Ana con sus dos caras = una persona); emulador A4; fundación B59 (el mismo reporte desde la otra cara es la misma señal) |
| `decidirIntake` solo puede abrir, subir a prioritaria o reabrir; nunca escribe `decision` ni `effects` | Pura A33, A35, A39; ningún reporte crea acciones, custodias ni sanciones (M1) |

**5.3** — *La ocultación preventiva sigue preparada, DESACTIVADA, sin umbrales y sin activación automática hasta que el dueño
apruebe umbrales, condiciones, excepciones y pruebas.*

| Se cumple en | Evidencia |
|---|---|
| `core/moderation-action.ts: POLITICA_DE_OCULTACION_PREVENTIVA` (`habilitada: false`, `minimoDeDenunciantes: null`, `gravedades: null`); `leerPoliticaDeOcultacion` deja apagada una política a medias (`incompleta`) | Pura A14, A15, I134, I135 |
| `ocultacionPreventivaAplica` exige los dos umbrales y NUNCA aplica a un caso con señal de riesgo; ninguna callable escribe `moderationPolicies` | Pura M3; emulador F3 (ningún cliente puede escribir una política) |

**5.4** — *Priorización por gravedad y señales de riesgo, sin umbrales numéricos inventados ni reglas automáticas no aprobadas.*

| Se cumple en | Evidencia |
|---|---|
| `GRAVEDAD_POR_MOTIVO` (propuesta, configurable en `moderationPolicies/priority`); `POLITICA_DE_PRIORIDAD.umbralDeDenunciantes = null` | Pura A12, A13 |
| `puntuacionDePrioridad` y `claveDeCola` solo ORDENAN (la gravedad manda, los denunciantes desempatan); ningún número decide una acción | Pura A10, A11; Consola J142 |
| La única regla automática es la aprobada: gravedad CRÍTICA (o señal de riesgo) → revisión humana prioritaria. El sistema solo puede subir a prioritaria y reabrir (`transicionDeCasoPermitida`) | Pura A7, A8, A36, B63, M1 |

**5.5** — *Lo ocultado o retirado se conserva ÍNTEGRO para auditoría, revisión, restauración, apelación e investigación; sin
purga automática hasta que haya una política de retención aprobada; no se inventan plazos.*

| Se cumple en | Evidencia |
|---|---|
| `nucleo.ts: sobreElContenido` mueve el documento EXACTO a `moderationVault` (con sus tipos de Firestore); `decidirCustodia`: retirar conserva la copia | Pura E89, E97; emulador C1–C2 |
| Restaurar lo devuelve idéntico y no pisa nada | Pura E98, E100; emulador C3–C4 |
| `POLITICA_DE_RETIRADA.purgaTrasDias = null` y `leerPoliticaDeRetirada` lo fuerza a `null`: no existe código que purgue | Pura A16 |
| La Consola revisa lo oculto desde la custodia | Pura J150 |

**5.6** — *La apelación conserva la decisión y el motivo originales, el administrador y la fecha, la evidencia y el contexto,
la decisión de la apelación y quién la revisó, y el historial completo. Nunca sobrescribe. Cuando sea posible, revisa otra
persona; se registra la marca de «mismo revisor», visible en la Consola y en la auditoría, sin bloquearlo.*

| Lo que conserva | Dónde | Evidencia |
|---|---|---|
| Decisión original (operación, fecha, administrador, sanción o custodia, clase de contenido) | `core/moderation-appeal.ts: nuevaApelacion` → `original` | Pura A43, H121 |
| Motivo original (justificación) | En la acción original, inmutable (`moderationActions/{actionId}.justification`), a la que la apelación apunta por `actionId` | Pura H128 (la acción original queda IGUAL) |
| Evidencia y contexto | La copia en la custodia (`vaultId`), las señales y el historial del caso (`caseId`) | Pura E89, J150 |
| Decisión de la apelación y quién la revisó | `review { uid, at, sameReviewer }` y `resolution { outcome, at, uid, justification, reversalActionId }` | Pura A44, A45, H127–H129 |
| Historial completo | `moderationAppeals/{id}/history` (solo `create`) + entradas `APPEAL_FILED`/`APPEAL_DECIDED` en el caso | Pura H124, H128, L165; emulador E2 |
| **Marca de «mismo revisor»** (añadida el 2026-11-07) | En la apelación (`review.sameReviewer`), en la acción (`result.sameReviewer`) y en la auditoría (`sameReviewer`), de `TAKE_APPEAL` y `DECIDE_APPEAL`. No se impide: `revisionIndependiente` sigue `false` hasta que haya matriz aprobada | Pura M5, M6 (visible en las vistas `appeals` y `audit`), M7 (control) |

**5.7** — *Nunca se sanciona a nadie solo porque sus reportes se rechacen o porque denuncie mucho; el volumen no prueba
abuso; una sanción por abuso exige evidencia de conducta deliberada y una decisión documentada.*

| Se cumple en | Evidencia |
|---|---|
| `senalesDeAbuso` solo devuelve señales (`flagged` es `null` sin los números del dueño) y la lee SOLO la Consola (vista `reporter`) | Pura A17, M8, M9 |
| La única forma de crear una sanción es `nucleo.ts: sobreLaCuenta`, una operación de una persona con permiso, caso y justificación | Pura M9 (una sola llamada a `nuevaSancion`) |
| Quien solo señaló un riesgo no acumula «rechazos» | Pura M4 |
| El límite de ritmo de `reportContent` frena intentos; no es una sanción ni deja rastro en la persona | Fundación B62–B66 |

**Comprobado: nada sanciona automáticamente.** No había nada que quitar.

**Autolesiones (punto 2)** — recuperado como opción propia del catálogo único: § 4.
**WeeTalk (punto 3)** — fuera del Moderation Core, como decisión definitiva: § 12.
**Sanciones (punto 4)** — se registran y ninguna parte de la App las aplica: § 13.
**Consola (punto 5)** — lectura separada de las acciones y roles PROPUESTOS: §§ 6, 10.
**Avisos (punto 6)** — se registran y no se envían: § 14.

## 3. Modelo de datos

Todas las colecciones son **solo del servidor**: no tienen regla en `firestore.rules`, y en Firestore lo que no se permite
está prohibido. El emulador lo prueba contra las reglas del árbol (F1–F3): ni quien denunció, ni el denunciado, ni nadie,
ni con el claim de administración, lee, lista, escribe o borra nada.

### `reports/{reportId}` (fundación, ampliado)

Sin cambios de forma (contrato `1.0`). El intake añade `caseId` y `priority` (la gravedad de su motivo) y la entrada
`REPORT_ATTACHED_TO_CASE` en su historial (`reports/{id}/history`, que solo se añade). Su `status` se queda en el de entrada:
**la revisión es del caso**.

### `moderationCases/{caseId}` — un caso por contenido

`caseId = cas_` + 32 hex de `sha256('2.0' | 'case' | <targetType>:<targetId>)`. Dos reportes simultáneos del mismo
contenido caen en el MISMO documento y lo decide una transacción.

| Campo | Qué es |
|---|---|
| `target` | `{ type, id, kind, modality?, path? }`. `kind` lo LEE el servidor: `POST`, `WEEL` (publicación con `isWeel`), `COMMENT`, `REAL_PROFILE`, `WEE_PROFILE`, `PAGE`, `COMMUNITY`. `path` solo si el contenido es custodiable |
| `subject` | De quién es: `accountId` (la persona, a la que van las sanciones), `entityId`/`entityType` (la cara con la que publicó), `profileUid` (la firma guardada, dato heredado). Lo que no se sabe, no se inventa |
| `status` | `PENDING`, `PRIORITY_REVIEW`, `UNDER_REVIEW`, `ACTION_REQUIRED`, `ACTION_TAKEN`, `REJECTED`, `RESTORED`, `CLOSED` (§ 5) |
| `cola` | `ESTADO|prioridad invertida|antigüedad`: ordena la cola con el índice automático de un campo |
| `priority` | `{ gravity, score }`: la gravedad máxima de sus señales (incluida la URGENCIA de una señal de riesgo) y `peso×1000 + denunciantes distintos` |
| `counters` | `reports`, `reporters` (cuentas distintas: una persona con dos caras cuenta una vez), `byReason`, `sinceDecision` |
| `recidivism.priorActions` | Acciones previas contra la cuenta al abrirse. Reincidencia, no culpa |
| `effects` | Lo que el caso tiene hecho AHORA: `content` (`HIDDEN`/`REMOVED`/`null`), `sanctionIds`, `preventive` |
| `assignee`, `proposedAction`, `decision`, `decidedAt`, `openedBy`, `reporterOutcomes`, `historyCount`, fechas | — |

Subcolecciones: `signals/{reportId}` (procedencia de cada reporte: cuenta y cara de quien denunció, motivo, gravedad,
superficie, si trae detalle —el texto del detalle se queda en el reporte—), `reporters/{accountId}` (lo que cada cuenta dijo
del caso y cómo acabó su señal), `history/{0001…}` (solo se añade).

### `moderationActions/{actionId}` — lo que se hizo

`actionId = mac_` + hash de `ADMIN|uid|operación|requestId`: **el identificador es la idempotencia**. Se crea y no se toca;
deshacer es OTRA acción con `reverses`. Lleva operación, familia, caso, cuenta afectada, actor (`ADMIN` con su uid, o
`SYSTEM` con su versión de política), permiso, justificación, `requestId`, fecha del servidor, resultado (`caseFrom`/
`caseTo`, estado de custodia, de sanción o de apelación y, en las apelaciones, `sameReviewer`) y si es apelable.

### `moderationVault/{vaultId}` — el contenido mientras no está en su sitio

Uno por contenido (`vlt_` + hash de la clave). Ocultar y retirar MUEVEN el documento entero aquí (`data`, con sus tipos de
Firestore) y lo quitan de su colección en la misma transacción; restaurar lo devuelve idéntico y suelta la copia. Las
subcolecciones del original no se tocan.

### `moderationSanctions/{sanctionId}` — de la cuenta, nunca de una cara

`WARNING` (no restringe), `SUSPENSION` (1 h – 1 año, `endsAt`) o `BLOCK` (indefinido). Estados `ACTIVE`, `LIFTED`,
`EXPIRED`. Una por acción (`msn_` + hash de la acción). `vencimiento = ACTIVE|<fin>` mientras una suspensión está en vigor.
**Se registran; ninguna parte de la App las aplica todavía** (§ 13).

### `moderationStanding/{accountId}` — reincidencia, abuso de reportes y restricción

Contadores de los dos lados (`subject`: casos abiertos, acciones por tipo; `reporter`: reportes, confirmados, rechazados) y
la restricción calculada (`NONE`/`SUSPENDED`/`BLOCKED`, hasta cuándo). Es DERIVADO: se reconstruye de acciones, sanciones y
marcas. Nada la consulta hoy fuera del propio Core.

### `moderationAppeals/{appealId}` + `history` — apelaciones

Una por acción (`apl_` + hash de la acción). § 2, punto 5.6.

### `moderationNotices/{noticeId}` — avisos sin enviar

§ 14.

### `moderationAudit/{auto}` — la auditoría inmutable

`{ at, actor: { kind: ADMIN|SYSTEM|USER, id, rol? }, operation, permission?, result: OK|DENIED|REJECTED|ERROR|DUPLICATE|READ,
code?, caseId?, actionId?, appealId?, sanctionId?, targetKey?, requestId?, correlationId, justification?, sameReviewer? }`,
saneada campo a campo (`entradaDeAuditoria`). Lo hecho se escribe EN la transacción que lo hace (pura E92; emulador B4); lo
denegado y lo rechazado, aparte (pura C72, G118; emulador D6); las lecturas de datos de personas, ANTES de devolver nada (sin
constancia, no se devuelve: pura J156).

### `moderationPolicies/{priority|preventiveHiding|removal|appeals|abuse}`

Sin documento, valen las de por defecto (§ 8). Ninguna callable las escribe: cambiarlas es una decisión del dueño.

## 4. Reportes y catálogo de motivos

**Un solo catálogo** (`core/moderation.ts: MOTIVOS_DE_REPORTE`), el mismo en el servidor, en la hoja de denunciar
(`services/moderationService.ts`, con la CLAVE de cada texto) y en los 42 diccionarios. Once opciones, en este orden: la
lista del dueño —acoso e intimidación, desnudez y contenido sexual, violencia, odio y discriminación, estafas y fraude,
spam, suplantación, contenido ilegal, propiedad intelectual—, **autolesiones o suicidio** como opción propia, y «otro» al
final. Pura A1–A4; fundación 1, 126, 137.

**Autolesiones es una SEÑAL DE RIESGO, no una infracción** (`MOTIVOS_DE_RIESGO`, decisión del dueño del 2026-11-07):

- pide revisión HUMANA prioritaria (su gravedad CRÍTICA es urgencia de revisión): pura M1;
- **nunca sanciona** a quien publicó ni **oculta nada**: un reporte no actúa (M1) y la ocultación preventiva nunca aplica a
  un caso con una señal de riesgo, aunque algún día se active y aunque se sumen otros motivos (`ocultacionPreventivaAplica`,
  `gravedadDeInfraccion`, `tieneSenalDeRiesgo`: M2, M3);
- no se confunde la petición de ayuda o el sufrimiento con una infracción: no cuenta como gravedad de infracción, y quien
  solo avisó de un riesgo no acumula «rechazos» si no había infracción (`propagarDesenlace`: M4);
- **no se inventa ningún procedimiento de intervención** que Weë no tiene. Qué ofrecer a la persona en riesgo (recursos,
  contacto) es una **decisión pendiente del dueño** (§ 16).

Las traducciones de «autolesiones o suicidio» son las que ya existían en `d9abcf0c`, recuperadas byte a byte (no se
tradujeron de nuevo); sus entradas del registro de revisión vuelven a estar vivas y la retirada de
`ops/integracion/capacidades.mjs` desapareció. Los reportes antiguos con `SELF_HARM` siguen valiendo.

**Qué se puede denunciar** (tabla de producción, `RESOLUTORES_DEL_NUCLEO`): publicaciones y Weëls (`POST`), comentarios
(`COMMENT`), perfiles Real y Weë y Páginas (`ENTITY`; una Página de `pages` también es `ENTITY`), y comunidades
(`COMMUNITY`). Siguen cerrados `PUBLICATION`, `ASSET`, `CONTENT` y `MESSAGE` (pura B53). La tabla de la fundación
(`RESOLUTORES`) no cambia. Los mensajes de WeeTalk están FUERA: § 12.

Nunca se revela al denunciado quién denunció: ni la vista de la persona afectada, ni los avisos, ni la apelación lo llevan
(pura A50, H122, H132, E93).

## 5. Casos: estados y transiciones

```
PENDING ──────────→ PRIORITY_REVIEW        (solo el sistema, con la política)
   └────→ UNDER_REVIEW ←──┘                (alguien lo coge)
             │   └─ soltar → PENDING / PRIORITY_REVIEW (la cola la decide la política)
             ├─→ ACTION_REQUIRED ──→ ACTION_TAKEN / REJECTED / vuelve a revisión
             ├─→ ACTION_TAKEN ──→ (otra acción) / RESTORED / CLOSED
             └─→ REJECTED ──→ CLOSED
REJECTED · RESTORED · CLOSED ──→ PENDING / PRIORITY_REVIEW   (reabrir: sistema o persona)
CLOSED ──→ RESTORED                                          (corrección o apelación)
```

`TRANSICIONES_DE_CASO` y `transicionDeCasoPermitida(desde, hacia, quién)`: el sistema solo sube a prioritaria y reabre;
una persona no sube la prioridad a mano; una apelación solo deja el caso `RESTORED`. Nada salta de la cola a un final.
Actuar sobre el mundo exige el caso en `UNDER_REVIEW`, `ACTION_REQUIRED` o `ACTION_TAKEN`.

## 6. Contratos de funciones

Todas en `functions/src/moderation/puertas.ts`, exportadas en `functions/src/index.ts`, **ninguna desplegada**
(`ops/despliegue/grupos.json` → `no_se_despliegan`, pura L172). Errores: HTTPS con `details.reason` = código (`aHttpsError`).

### Escritura — una callable por acción, ninguna genérica (pura L168)

Petición común: `requestId` (`[A-Za-z0-9_-]{8,64}`, obligatorio: repetirlo no repite nada) y `justification` (3–1000,
obligatoria). Cualquier campo que no sea de la operación tumba la petición (`unknown_field`). Cada acción conserva
responsable, permiso, motivo, caso, idempotencia y auditoría (pura E91, E92, E95). Respuesta:
`{ actionId, operation, duplicate, caseId?, caseStatus?, vaultState?, sanctionId?, sanctionStatus?, appealId?, appealStatus? }`.

| Callable | Operación | Permiso | Campos propios | Efecto |
|---|---|---|---|---|
| `moderationOpenCase` | `OPEN_CASE` | `moderation.review` | `targetType`+`targetId` (+`gravity`) **o** `fromReportId` | Abre (o reabre) un caso; da caso a un reporte anterior al Core |
| `moderationTakeCase` | `TAKE_CASE` | `moderation.review` | `caseId` | → `UNDER_REVIEW`, con asignación |
| `moderationReleaseCase` | `RELEASE_CASE` | `moderation.review` | `caseId` | → su cola (la decide la política) |
| `moderationRequireAction` | `REQUIRE_ACTION` | `moderation.review` | `caseId`, `proposedAction` | → `ACTION_REQUIRED`, sin ejecutar nada |
| `moderationRejectCase` | `REJECT_CASE` | `moderation.review` | `caseId` | → `REJECTED` (sin infracción); anota el desenlace a los denunciantes |
| `moderationResolveCase` | `RESOLVE_CASE` | `moderation.case.resolve` | `caseId` | → `CLOSED` |
| `moderationHideContent` | `HIDE_CONTENT` | `moderation.content.hide` | `caseId` | Ocultar temporalmente (a la custodia) → `ACTION_TAKEN` |
| `moderationRestoreContent` | `RESTORE_CONTENT` | `moderation.content.restore` | `caseId` | Devolver idéntico, sin pisar el sitio → `RESTORED` si no queda nada |
| `moderationRemoveContent` | `REMOVE_CONTENT` | `moderation.content.remove` | `caseId` | Retirar según política: custodia definitiva, sin borrar |
| `moderationWarnAccount` | `WARN_ACCOUNT` | `moderation.account.warn` | `caseId` | Advertencia de la cuenta |
| `moderationSuspendAccount` | `SUSPEND_ACCOUNT` | `moderation.account.suspend` | `caseId`, `durationHours` (1–8760) | Suspensión temporal (registrada) |
| `moderationBlockAccount` | `BLOCK_ACCOUNT` | `moderation.account.block` | `caseId` | Bloqueo indefinido (registrado) |
| `moderationLiftSanction` | `LIFT_SANCTION` | `moderation.sanction.lift` | `caseId`, `sanctionId` | Levantar (de su caso); recalcula la restricción |
| `moderationTakeAppeal` | `TAKE_APPEAL` | `moderation.appeal.review` | `appealId` | → `UNDER_REVIEW` (con la marca de «mismo revisor» si toca) |
| `moderationDecideAppeal` | `DECIDE_APPEAL` | `moderation.appeal.review` | `appealId`, `outcome` (`UPHELD`/`DENIED`) | Si `UPHELD`, deshace lo apelado en la misma transacción |

### Lectura — `moderationConsole` (solo lectura, separada de las acciones: pura L169, J147)

`{ view, ...parámetros }`; un parámetro de más se rechaza. `reveal: true` pide además `moderation.identity.read`.

| `view` | Permiso | Parámetros | Devuelve | Auditada |
|---|---|---|---|---|
| `inbox` | `moderation.read` | `limit`, `before`, `reveal` | Bandeja de reportes, del más reciente | sí |
| `cases` | `moderation.read` | `status`, `limit`, `after`, `reveal` | Una cola: prioridad, luego antigüedad; `next` como cursor | sí |
| `case` | `moderation.read` | `caseId`, `reveal` | Caso, señales (con detalle), historial, acciones, apelaciones, sanciones | sí |
| `content` | `moderation.read` | `caseId` | El contenido denunciado (de su sitio o de la custodia), solo campos de lectura | sí |
| `history` | `moderation.read` | `caseId`, `after` | Historial paginado | sí |
| `actions` | `moderation.read` | `limit`, `before`, `reveal` | Historial de acciones de toda moderación | sí |
| `sanctions` | `moderation.read` | `caseId` o `status`, `limit`, `reveal` | Sanciones | sí |
| `appeals` | `moderation.read` | `status`, `limit`, `reveal` | Apelaciones por estado (con `review.sameReviewer`) | sí |
| `subject` | `moderation.read` | `caseId`, `reveal` | Reincidencia y restricción de la persona; sus caras, solo con `reveal` | sí |
| `reporter` | `moderation.identity.read` | `caseId`, `reportId` | Quién denunció una señal, y sus señales de abuso | sí |
| `stats` | `moderation.read` | — | Casos por estado, apelaciones por estado, sanciones activas, reportes 24 h / 7 d | no (agregados) |
| `policies` | `moderation.read` | — | Las políticas vigentes | no |
| `audit` | `moderation.audit.read` | `limit`, `before` | La auditoría de moderación (con `sameReviewer`) | sí |

Por defecto la Consola **no ve quién denunció** (seudónimo estable `per_…`) **ni la cuenta del denunciado** (que es el
vínculo entre su Perfil Real y su Perfil Weë): ve la cara con la que se publicó y actúa sobre la persona sin necesitar ese
vínculo (pura A48, A49, J143). Revelar exige un permiso específico y queda auditado (J144–J146). Lo que se lee del contenido
son campos de lectura (`CAMPOS_VISIBLES_PARA_REVISAR`), nunca datos privados de la cuenta (J150).

### Persona afectada

| Callable | Petición | Devuelve |
|---|---|---|
| `submitModerationAppeal` | `{ actionId, reason, requestId? }` | `{ received, duplicate, appealId, actionId, status, createdAt, outcome?, resolvedAt? }` |
| `getMyModeration` | — | `{ restriction, sanctions, actions, appeals, notices, generatedAt }` — nunca quién denunció, quién revisó ni la justificación |

Quien no es la cuenta afectada recibe `action_not_found`, igual que si la acción no existiera.

### Lo que corre solo

| Función | Disparo | Qué hace |
|---|---|---|
| `moderationIntake` | Al crearse `reports/{id}` | Adjunta el reporte a su caso. Idempotente. `reportContent` no cambia de coste ni de forma |
| `moderationSweep` | Cada 15 min | Cierra suspensiones vencidas, da caso a reportes sin él y termina desenlaces a medias. Idempotente y acotado |

## 7. Reglas de autorización

1. **Sesión** de una cuenta autenticada de verdad (`esCuentaAutenticada`): un invitado no administra.
2. **Administración** de siempre (`isAdmin`: claim `admin` o `WEE_ADMIN_UIDS`). Quien no lo es se rechaza **sin escribir
   nada**, ni en la auditoría.
3. **Sesión vigente**: se relee Firebase Auth en cada llamada (`sesionVigenteEnAuth`): cuenta deshabilitada, sesiones
   revocadas o claim retirado no entran aunque el token diga otra cosa; si Auth no contesta, no se entra (emulador D1–D6).
4. **Permiso específico** de la operación (pura C72, C73). Una denegación a quien SÍ era administración queda en la auditoría.
5. **Conflicto de interés**: nadie modera un caso sobre su propio contenido (con cualquiera de sus caras) ni uno que
   denunció; nadie revisa una apelación propia (pura G115–G118).
6. **El permiso es de la cuenta administrativa** (el principal autenticado), nunca de una cara: el Perfil Real y el Perfil
   Weë no tienen permisos, así que no hay herencia posible (pura C77).
7. **Nada del cliente decide**: ni la cuenta, ni el estado, ni la prioridad, ni el actor (pura A18).

## 8. Políticas: configurables, apagadas o sin números inventados

| Política | Por defecto | Qué decide |
|---|---|---|
| Prioridad (`priority`) | Gravedad por motivo del catálogo; solo `CRITICAL` (incluida la señal de riesgo) pide revisión prioritaria; **sin umbral de denunciantes** | El orden de la cola y cuándo un caso sube a prioritaria |
| Ocultación preventiva (`preventiveHiding`) | **DESACTIVADA**, `minimoDeDenunciantes: null`, `gravedades: null` | Ocultar antes de revisar. A medias se queda apagada (`incompleta`). Nunca con una señal de riesgo. Si el dueño la activa, oculta a la custodia —reversible y apelable— y sube el caso a prioritaria; no decide nada |
| Retirada (`removal`) | Reversible; `purgaTrasDias: null` | Retirar no borra: no existe código que purgue |
| Apelaciones (`appeals`) | `revisionIndependiente: false` | Quien decidió PUEDE revisar la apelación y queda marcado (`sameReviewer`). Encender el bloqueo es una decisión del dueño ligada a la matriz de permisos |
| Abuso de reportes (`abuse`) | `minimoDeReportes: null`, `ratioDeRechazo: null` | Se MIDE siempre; se SEÑALA solo con los dos números; ninguna consecuencia automática |

Lo único automático hoy: ordenar la cola, subir lo CRÍTICO a revisión prioritaria, reabrir un caso cuando llega algo nuevo y
cerrar suspensiones vencidas. **No hay sanciones ni ocultación automáticas.**

## 9. Integración con la futura Consola

La Consola no lee Firestore: llama a funciones. Para conectarla **no hay que rediseñar el backend**:

1. Añadir los permisos de § 10 a `PERMISOS` de `functions/src/admin/permisos.ts` (las escrituras a
   `PERMISOS_DE_ESCRITURA`) y repartirlos en `MATRIZ` según la decisión del dueño.
2. Pasar a la puerta del núcleo los dos puertos de la Consola —`crearNucleoDeModeracion({ sesionVigente, permisosDe })`
   con `sesionVigente` y `permisosDe` de `admin/autorizacion.ts`/`permisos.ts`—, o envolver las callables con
   `escrituraAuditada`/`lecturaAuditada` y una entrada por operación en `operaciones.ts` (`CATALOGO`). Las dos auditorías
   conviven: `adminAudit` dice quién llamó a qué; `moderationAudit` es el registro de dominio, atómico con cada acción.
3. La Consola pinta con los contratos de § 6 y cada botón llama a SU callable con un `requestId` nuevo por intención.
4. Conflicto previsible al fusionar: la rama de la Consola también toca `moderationAdmin` en `moderation/index.ts`
   (envoltura de la callable); aquí solo se añade una guarda dentro de `revisar` y la tabla de resolutores.

## 10. Matriz de permisos y roles de la Consola

Los nombres siguen el vocabulario de la Consola (`moderation.read` y `moderation.review` ya existen allí).

| Permiso | Clase | Da |
|---|---|---|
| `moderation.read` | lectura | Colas, casos, contenido, historial, acciones, sanciones, apelaciones, persona, estadísticas, políticas |
| `moderation.identity.read` | lectura sensible | `reveal`: quién denunció y el vínculo entre las caras del denunciado (auditado) |
| `moderation.audit.read` | lectura | La auditoría de moderación |
| `moderation.review` | escritura | Abrir, coger, soltar, proponer acción, rechazar |
| `moderation.case.resolve` | escritura | Resolver (cerrar) |
| `moderation.content.hide` · `.restore` · `.remove` | escritura | Ocultar · restaurar · retirar |
| `moderation.account.warn` · `.suspend` · `.block` | escritura | Advertir · suspender · bloquear |
| `moderation.sanction.lift` | escritura | Levantar una sanción |
| `moderation.appeal.review` | escritura | Coger y resolver apelaciones |

**Roles PROPUESTOS, NO activos** (decisión del dueño; ninguna línea de código los aplica):

| Permiso | Administrador general | Moderador | Revisor de apelaciones | Auditor (solo lectura) |
|---|---|---|---|---|
| `moderation.read` | sí | sí | sí | sí |
| `moderation.identity.read` | sí | — | — | — |
| `moderation.audit.read` | sí | — | — | sí |
| `moderation.review` | sí | sí | — | — |
| `moderation.case.resolve` | sí | sí | — | — |
| `moderation.content.hide` | sí | sí | — | — |
| `moderation.content.restore` | sí | sí | — | — |
| `moderation.content.remove` | sí | — | — | — |
| `moderation.account.warn` | sí | sí | — | — |
| `moderation.account.suspend` | sí | — | — | — |
| `moderation.account.block` | sí | — | — | — |
| `moderation.sanction.lift` | sí | — | — | — |
| `moderation.appeal.review` | sí | — | sí | — |

El revisor de apelaciones deshace lo apelado al darle la razón dentro de `DECIDE_APPEAL`, así que no necesita los permisos de
restaurar ni de levantar. Separar «quien decide» de «quien revisa la apelación» es el criterio aprobado (5.6); mientras la
matriz no esté aprobada, se anota y no se impide.

**En esta rama**, sin la matriz de la Consola (`weeRole`, rama `admin/integracion-consola`, sin integrar): administración
**sin** rol recibe todos los permisos de moderación —el mismo «puente» que la Consola llama legado, que se cierra con
`WEE_ADMIN_SIN_ROL=cerrado`; un valor mal escrito cierra—; una sesión **con** `weeRole` no recibe ninguno (falla cerrado).

## 11. Procedimiento de integración posterior

Resumen; el detalle (base W0, commits, archivos compartidos, suites a repetir, riesgos y condiciones de aceptación) está en
[`MODERATION-CORE-INTEGRACION.md`](MODERATION-CORE-INTEGRACION.md).

**Orden:** Functions → Consola → App → reglas (si las hubiera). Cada paso con su autorización; nada de esto se ha hecho.

**Reglas (propuesta, NO aplicada).** Las colecciones nuevas ya están cerradas por la denegación por defecto. Para que se lea
a simple vista, se propone añadir bloques explícitos, sin cambiar ningún comportamiento:

```
match /moderationCases/{caseId} { allow read, write: if false; match /{sub=**} { allow read, write: if false; } }
match /moderationActions/{id} { allow read, write: if false; }
match /moderationAudit/{id} { allow read, write: if false; }
match /moderationVault/{id} { allow read, write: if false; }
match /moderationSanctions/{id} { allow read, write: if false; }
match /moderationStanding/{id} { allow read, write: if false; }
match /moderationAppeals/{id} { allow read, write: if false; match /history/{e} { allow read, write: if false; } }
match /moderationNotices/{id} { allow read, write: if false; }
match /moderationPolicies/{id} { allow read, write: if false; }
```

## 12. WeeTalk: FUERA del Moderation Core (decisión definitiva del dueño, 2026-11-07)

Las conversaciones privadas de WeeTalk **no forman parte del Moderation Core**. No es un defecto ni un pendiente:

- ni denuncias de mensajes (`MESSAGE` sigue cerrado: pura B53, M10);
- ni casos;
- ni inspección administrativa (ninguna vista de la Consola lee conversaciones: M10);
- ni moderación automática, IA o escaneo;
- ni acceso de moderadores (ningún módulo del Core nombra `conversations` ni `messages`: M10).

**La herramienta del usuario es el BLOQUEO DE CONTACTOS**, con este alcance (decisión del dueño):

- **de cuenta**: bloquear a B bloquea sus dos caras, aunque cambie de identidad activa; sin nuevos mensajes, ni
  conversaciones directas, ni llamadas si las hubiera. No se revela la cara alternativa de quien bloquea;
- con **lista de bloqueados y desbloqueo**; desbloquear no restaura conversaciones ni genera mensajes retroactivos;
- el bloqueo **no** genera reporte, caso, sanción ni investigación.

No hay documento propio de WeeTalk en `docs/`: esta sección es la referencia.

### Estado real del bloqueo hoy (investigación de solo lectura, 2026-11-07): NO EXISTE

| Dónde se buscó | Qué hay |
|---|---|
| `services/messagesService.ts` | `getOrCreateConversation` crea la conversación desde el cliente (`addDoc` en `conversations`, `participants: [yo, otra]`) y `sendMessage` añade a `conversations/{id}/messages`. Ninguno consulta un bloqueo |
| `firestore.rules`, `match /conversations/{conversationId}` y `/messages/{messageId}` | Crear: dos identidades, una mía. Mensaje: remitente mío y participante. Ninguna condición de bloqueo |
| `functions/src/social/weetalk.ts` | Solo `burnViewOnce` (la foto de una sola vez) |
| `functions/src/index.ts: sendMessagePushNotification` | Avisa de cada mensaje nuevo; no mira bloqueos |
| `screens/InboxScreen.tsx`, `screens/ConversationScreen.tsx`, ËContact (`functions/src/social/econtact.ts`: estados `pending`/`accepted`) | Ninguna acción, colección, campo ni texto de bloqueo. Las palabras «bloquear» del cliente (`EContactScreen`, `useEContact`) son cerrojos contra el doble toque |
| Llamadas | No hay llamadas en WeeTalk |

### Tarea independiente PROPUESTA (no implementada): bloqueo de contactos de WeeTalk a nivel de cuenta

1. **Decisión server-side y de cuenta.** Una callable `blockContact` / `unblockContact` / `listBlockedContacts` que recibe
   la identidad visible de B y resuelve su CUENTA en el servidor (`cuentaDeIdentidad`, leyendo `linkedAccountId`; nunca por
   prefijo). La lista que ve quien bloquea enseña la cara que bloqueó, nunca la otra cara de B.
2. **Aplicación con las reglas sin revelar nada.** El servidor escribe, por cada bloqueo de cuenta, las combinaciones de
   identidades (Real/Weë × Real/Weë) en una colección SOLO de servidor (las reglas la niegan a la lectura); las reglas de
   `conversations` y `messages` añaden `!exists(...)` sobre esas claves. `exists()` no expone datos, así que nadie aprende la
   cara alternativa de nadie. Es un cambio de reglas: exige autorización del dueño.
3. **Push.** `sendMessagePushNotification` no avisa a quien bloqueó.
4. **Desbloquear** borra las claves; no restaura conversaciones ni reenvía nada.
5. **Nada de moderación:** el bloqueo no crea reportes, casos, sanciones ni registros en el Moderation Core.
6. **Pruebas:** emulador con reglas (las cuatro combinaciones de caras, conversación nueva y existente, desbloqueo), y la
   comprobación de que la colección de bloqueos no se puede leer desde ningún cliente.
7. **A resolver antes de construir:** si el intento de B contra la OTRA cara de A falla de forma reconocible, B puede
   deducir que las dos caras son de la misma cuenta. La respuesta a quien está bloqueado no debe distinguirse de cualquier
   otro fallo (o la entrega debe ser silenciosa, lo que exige que el envío pase por el servidor). Es una decisión del dueño.

## 13. Sanciones: estado real y diseño futuro

**Estado real: se REGISTRAN y ninguna parte de la App las aplica.** Una suspensión o un bloqueo registrados NO impiden hoy
publicar, comentar, escribir ni nada: `restriccionDeCuenta` calcula la restricción y `getMyModeration` la enseña a la
persona, pero ninguna puerta la consulta: `moderationSanctions`, `moderationStanding` y `restriccionDeCuenta` solo aparecen en
`functions/src/moderation/`, en `core/moderation-action.ts` y en la clasificación de copias (`core/backup.ts`); ni el cliente
ni otra Function los leen. No debe presentarse una sanción registrada como efectiva.

**Diseño futuro (PROPUESTO, no implementado):**

1. **Un servicio central** `evaluarSancion(cuenta, operación, ahora) → { permitida, hasta?, sancionId? }` en el Moderation
   Core, que lee la restricción y las sanciones vigentes, y que CONSULTAN las operaciones afectadas. Las que pasan por el
   servidor (comunidades, Páginas, encuestas, ËContact, Weë AI…) lo llaman antes de actuar; las que el cliente escribe
   directamente (publicaciones, comentarios, «me gusta», mensajes) necesitarían reglas que lo lean o pasar por una callable:
   las dos cosas exigen autorización.
2. **Relación explícita** tipo → duración → alcance → operaciones restringidas (tabla PROPUESTA, sin aprobar). No todo se
   bloquea por cualquier sanción:

| Operación | Advertencia | Suspensión social (1 h – 1 año) | Bloqueo de cuenta (indefinido) |
|---|---|---|---|
| Publicar y Weëls | permitido | restringido | restringido |
| Comentar | permitido | restringido | restringido |
| Interacciones («me gusta», votos, reposts, seguir) | permitido | restringido | restringido |
| Mensajes de WeeTalk | permitido | solo si la sanción lo dice expresamente | restringido |
| Funciones sociales (ËContact, Páginas) | permitido | restringido | restringido |
| Crear o administrar comunidades | permitido | restringido | restringido |
| Operaciones de cuenta afectadas (crear caras, editar perfil público) | permitido | a decidir | a decidir |
| Denunciar | permitido | permitido (a decidir) | a decidir |
| Consultar su sanción y apelar | permitido | permitido | permitido |
| Iniciar sesión | permitido | permitido | **permitido — decisión pendiente** |

3. **El bloqueo de cuenta es distinto de la suspensión social** y, hoy, **no restringe el inicio de sesión** (decisión
   pendiente; ni toca Firebase Auth).
4. **La persona puede consultar su sanción y apelar** (`getMyModeration`, `submitModerationAppeal`: ya existen).
5. **Las dos caras.** Una sanción de cuenta cubre el Perfil Real y el Perfil Weë: no hay sanciones por cara cuando la
   decisión es de cuenta, y cambiar de cara no la esquiva (se evalúa por cuenta). La privacidad de cada cara se mantiene:
   nadie más que la persona y moderación ve la sanción, y lo que se enseña a terceros no relaciona sus caras.

## 14. Avisos

**Se registran y no se envían** (`moderationNotices`, `delivery: 'PENDING_INTEGRATION'`; nada escribe en
`notifications`, que dispara un push de verdad). Ninguna prueba envía nada (pura E93, L166; emulador G3). Un aviso es un
CÓDIGO (`kind`) con sus datos, nunca una frase, y nunca dice quién denunció ni quién revisó.

| Punto de aviso | Hoy | Futuro (integración) |
|---|---|---|
| Recepción del reporte, cuando corresponda | `reportContent` contesta «recibido» a quien denuncia; no se escribe aviso | Decidir si hace falta además un aviso |
| Resolución del caso | No hay aviso a quien denunció | Aviso genérico a quien denunció (sin el desenlace sobre otra persona), si el dueño lo decide |
| Acción que afecta al usuario | `CONTENT_HIDDEN`, `CONTENT_REMOVED`, `CONTENT_RESTORED`, `ACCOUNT_WARNED`, `ACCOUNT_SUSPENDED`, `ACCOUNT_BLOCKED`, `SANCTION_LIFTED` | Textos en i18n y entrega por `notifications`/push |
| Resolución de la apelación | `APPEAL_RECEIVED`, `APPEAL_UPHELD`, `APPEAL_DENIED` | Igual |

## 15. Revisión de traducciones

La revisión de las traducciones de moderación en los 42 idiomas la hizo OTRO revisor (un agente, no un hablante nativo),
en paralelo, con su propio informe, fuera del repositorio:
`C:\Users\Geovet\wee-trabajo\_moderation-core-2026-11-07\REVISION-TRADUCCIONES-MODERACION.md`. Este documento no la
rehace y **no aplica ninguna de sus correcciones propuestas**: esperan revisión nativa y la decisión del dueño.

Resumen: **11 hallazgos de significado pendientes de revisión**, y ningún texto cambiado por ellos:

- cinco de confianza media o alta: «suplantación» traducida como *robo de identidad* en `de`, `de-CH`, `sv` e `it`, y `kl`
  sin «desnudez» en `reasonSexual` (ya declarado pendiente en `e02dbc9b`);
- seis de confianza baja o baja-media: `pt`, `hi` y `km` en suplantación, `mn` en contenido sexual, `hu` y `el` en odio.

Autolesiones: revisada en los 42 idiomas; ninguna traducción estigmatiza ni acusa. Quedan para revisión nativa `km`
(construcción verbal, confianza baja), `fi` (longitud) y `kl` (no se puede evaluar con fiabilidad). El informe observa
además que el MARCO de la hoja («Denunciar», que en algunos idiomas es «quejarse») puede leerse como una queja contra la
persona en riesgo: es una decisión de producto que va con la de la ayuda (§ 16, punto 1), no una corrección de traducción.

Las traducciones de «autolesiones o suicidio» son las que ya había en `d9abcf0c`, recuperadas sin traducir de nuevo, y las
22 marcas `obsoleta` que les había puesto `e02dbc9b` en `i18n/revision/<idioma>/registro.json` vuelven al estado de
`d9abcf0c`: no se inventa ninguna revisión nativa. Las traducciones nuevas de esta rama («propiedad intelectual» y
«desnudez» en `reasonSexual`) son de agente y el registro de revisión las cuenta como pendientes.

## 16. Decisiones de política pendientes (del dueño)

1. **Ayuda ante autolesiones**: qué recursos o contacto ofrece Weë (hoy, ninguno; no se inventa), y si ese motivo lleva su
   propia confirmación o un título de hoja más neutro (observación del informe de traducciones, § 15).
2. **Ocultación preventiva**: umbrales, condiciones, excepciones (incluido si una señal de riesgo puede usarse para frenarla)
   y pruebas. Sin eso, sigue apagada.
3. **Gravedad de cada motivo** (propuesta en `GRAVEDAD_POR_MOTIVO`) y si hace falta un umbral de denunciantes (hoy ninguno).
4. **Retención de lo retirado**: plazo de purga (hoy no se borra nada).
5. **Matriz de roles definitiva** (§ 10), incluido si la revisión independiente de apelaciones pasa a ser obligatoria y si
   una apelación tiene plazo.
6. **Abuso de reportes**: los dos números que señalan. Una sanción por abuso exige evidencia de conducta deliberada y una
   decisión documentada (5.7).
7. **Sanciones**: la tabla de § 13, si el bloqueo restringe el inicio de sesión y si un sancionado puede denunciar.
8. **Preservar evidencia** al recibir el primer reporte (hoy no se copia nada hasta que se actúa).
9. **Avisos**: textos, entrega y si se avisa a quien denunció (§ 14).
10. **Bloqueo de contactos de WeeTalk**: autorizar la tarea propuesta de § 12 (incluye un cambio de reglas y cómo se
    responde a quien está bloqueado sin delatar la otra cara de quien bloqueó).
11. **Traducciones**: los 11 hallazgos de significado del informe de § 15, con revisión nativa.

Decididas el 2026-11-07, ya no pendientes: autolesiones se ofrece (§ 4) y WeeTalk queda fuera (§ 12).

## 17. Cómo se prueba

```bash
cd functions && npm run build && node test/moderation-core.test.mjs && node test/moderation.test.mjs
```

```bash
firebase emulators:exec --only firestore,auth --project demo-wee-moderacion \
  "node functions/test/moderation-core.emulator.mjs firestore.rules"
```
