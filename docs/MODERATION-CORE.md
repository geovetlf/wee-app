# MODERATION CORE — casos, acciones, sanciones, apelaciones y auditoría

> Rama `moderation/core` (sobre `d9abcf0c`, cabeza de `candidato/desplegable`). **Nada integrado, nada desplegado.**
> Contrato `2.0` del Moderation Core, encima de la fundación `1.0` de Denunciar (`docs/MODERATION.md`), que no cambia de forma.
> Lo vigilan `functions/test/moderation-core.test.mjs` (en `npm test`) y `functions/test/moderation-core.emulator.mjs` (emuladores).

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

**Sin IA, sin Credits, sin eventos.** Ningún proveedor, ningún modelo, ninguna llamada de red, ningún movimiento de
Credits, ningún transporte de eventos. Lo vigila la suite (D · Estructura).

## 2. Modelo de datos

Todas las colecciones son **solo del servidor**: no tienen regla en `firestore.rules`, y en Firestore lo que no se permite
está prohibido. El emulador lo prueba contra las reglas del árbol (F1–F3): ni quien denunció, ni el denunciado, ni nadie,
ni con el claim de administración, lee, lista, escribe o borra nada.

### `reports/{reportId}` (fundación, ampliado)

Sin cambios de forma (contrato `1.0`). El intake añade `caseId` y `priority` (la gravedad de su motivo) y la entrada
`REPORT_ATTACHED_TO_CASE` en su historial (`reports/{id}/history`, que solo se añade). Su `status` se queda en el de entrada:
**la revisión es del caso**.

### `moderationCases/{caseId}` — un caso por contenido

`caseId = cas_` + 32 hex de `sha256('2.0' | 'case' | <targetType>:<targetId>)`. Dos reportes simultáneos del mismo
contenido caen en el MISMO documento y lo decide una transacción (emulador A1: 25 a la vez → un caso, contadores exactos).

| Campo | Qué es |
|---|---|
| `target` | `{ type, id, kind, modality?, path? }`. `kind` lo LEE el servidor: `POST`, `WEEL` (publicación con `isWeel`), `COMMENT`, `REAL_PROFILE`, `WEE_PROFILE`, `PAGE`, `COMMUNITY`. `path` solo si el contenido es custodiable |
| `subject` | De quién es: `accountId` (la persona, a la que van las sanciones), `entityId`/`entityType` (la cara con la que publicó), `profileUid` (la firma guardada, dato heredado). Lo que no se sabe, no se inventa |
| `status` | `PENDING`, `PRIORITY_REVIEW`, `UNDER_REVIEW`, `ACTION_REQUIRED`, `ACTION_TAKEN`, `REJECTED`, `RESTORED`, `CLOSED` (§ 4) |
| `cola` | `ESTADO|prioridad invertida|antigüedad`: ordena la cola con el índice automático de un campo (§ 8) |
| `priority` | `{ gravity, score }`: la gravedad máxima de sus señales y `peso×1000 + denunciantes distintos` |
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
`caseTo`, estado de custodia, de sanción o de apelación) y si es apelable.

### `moderationVault/{vaultId}` — el contenido mientras no está en su sitio

Uno por contenido (`vlt_` + hash de la clave). Ocultar y retirar MUEVEN el documento entero aquí (`data`, con sus tipos de
Firestore) y lo quitan de su colección en la misma transacción; restaurar lo devuelve idéntico y suelta la copia. Las
subcolecciones del original no se tocan (emulador C1–C4: marcas de tiempo, puntos geográficos, mapas y subcolecciones
vuelven idénticos).

### `moderationSanctions/{sanctionId}` — de la cuenta, nunca de una cara

`WARNING` (no restringe), `SUSPENSION` (1 h – 1 año, `endsAt`) o `BLOCK` (indefinido). Estados `ACTIVE`, `LIFTED`,
`EXPIRED`. Una por acción (`msn_` + hash de la acción). `vencimiento = ACTIVE|<fin>` mientras una suspensión está en vigor.

### `moderationStanding/{accountId}` — reincidencia, abuso de reportes y restricción

Contadores de los dos lados (`subject`: casos abiertos, acciones por tipo; `reporter`: reportes, confirmados, rechazados) y
la restricción calculada (`NONE`/`SUSPENDED`/`BLOCKED`, hasta cuándo). Es DERIVADO: se reconstruye de acciones, sanciones y
marcas. Las puertas leerán la restricción con `restriccionDeCuenta` (§ 9); **hoy ninguna puerta la aplica**.

### `moderationAppeals/{appealId}` + `history` — apelaciones

Una por acción (`apl_` + hash de la acción). Decisión original copiada, cuenta afectada, motivo (texto de la persona),
estado (`SUBMITTED → UNDER_REVIEW → UPHELD | DENIED`), revisión (quién, cuándo, si fue quien decidió lo apelado),
resolución (desenlace, justificación, acción que deshizo). El historial solo se añade.

### `moderationNotices/{noticeId}` — avisos sin enviar

`{ recipientAccountId, kind, actionId?, appealId?, sanctionId?, params, delivery: 'PENDING_INTEGRATION' }`. `kind` es un
código (`CONTENT_HIDDEN`, `CONTENT_REMOVED`, `CONTENT_RESTORED`, `ACCOUNT_WARNED`, `ACCOUNT_SUSPENDED`, `ACCOUNT_BLOCKED`,
`SANCTION_LIFTED`, `APPEAL_RECEIVED`, `APPEAL_UPHELD`, `APPEAL_DENIED`). Nunca una frase, nunca quién denunció ni quién
revisó. **Nada escribe en `notifications`**, que dispara un push de verdad (`sendPushNotification`).

### `moderationAudit/{auto}` — la auditoría inmutable

`{ at, actor: { kind: ADMIN|SYSTEM|USER, id, rol? }, operation, permission?, result: OK|DENIED|REJECTED|ERROR|DUPLICATE|READ,
code?, caseId?, actionId?, appealId?, sanctionId?, targetKey?, requestId?, correlationId, justification? }`, saneada campo a
campo (`entradaDeAuditoria`). Lo hecho se escribe EN la transacción que lo hace; lo denegado y lo rechazado, aparte; las
lecturas de datos de personas, ANTES de devolver nada (sin constancia, no se devuelve).

### `moderationPolicies/{priority|preventiveHiding|removal|appeals|abuse}`

Sin documento, valen las de por defecto (§ 6). Ninguna callable las escribe: cambiarlas es una decisión del dueño.

## 3. Reportes y catálogo de motivos

**Un solo catálogo** (`core/moderation.ts`): los diez que se ofrecen son la lista del dueño, en su orden —acoso e
intimidación, desnudez y contenido sexual, violencia, odio y discriminación, estafas y fraude, spam, suplantación,
contenido ilegal, propiedad intelectual, otro—, cada uno con su gravedad por defecto. La hoja de denunciar
(`services/moderationService.ts`) pinta exactamente esa lista con la CLAVE de cada texto; una prueba exige que coincidan.
`SELF_HARM` ya no se ofrece pero **se sigue admitiendo** (reportes guardados y apps publicadas) y se prioriza como crítico.

**Qué se puede denunciar** (tabla de producción, `RESOLUTORES_DEL_NUCLEO`): publicaciones y Weëls (`POST`), comentarios
(`COMMENT`), perfiles Real y Weë y Páginas (`ENTITY`; una Página de `pages` también es `ENTITY`), y comunidades
(`COMMUNITY`). Siguen cerrados `PUBLICATION`, `ASSET`, `CONTENT` y `MESSAGE`. La tabla de la fundación (`RESOLUTORES`) no
cambia.

**Mensajes de WeeTalk: no abiertos, a propósito.** Moderarlos es que alguien de moderación lea una conversación privada
entre dos identidades, y exige ampliar la petición con la conversación. Queda para una decisión del dueño (§ 10).

**Un reporte NO oculta ni elimina nada** (pura B59, emulador A5). Los repetidos suben la prioridad sin decidir nada. Nunca
se revela al denunciado quién denunció: ni la vista de la persona afectada, ni los avisos, ni la apelación lo llevan.

## 4. Casos: estados y transiciones

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

## 5. Contratos de funciones

Todas en `functions/src/moderation/puertas.ts`, exportadas en `functions/src/index.ts`, **ninguna desplegada**
(`ops/despliegue/grupos.json` → `no_se_despliegan`). Errores: HTTPS con `details.reason` = código (`aHttpsError`).

### Escritura — una callable por acción, ninguna genérica

Petición común: `requestId` (`[A-Za-z0-9_-]{8,64}`, obligatorio: repetirlo no repite nada) y `justification` (3–1000,
obligatoria). Cualquier campo que no sea de la operación tumba la petición (`unknown_field`). Respuesta:
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
| `moderationSuspendAccount` | `SUSPEND_ACCOUNT` | `moderation.account.suspend` | `caseId`, `durationHours` (1–8760) | Suspensión temporal |
| `moderationBlockAccount` | `BLOCK_ACCOUNT` | `moderation.account.block` | `caseId` | Bloqueo indefinido |
| `moderationLiftSanction` | `LIFT_SANCTION` | `moderation.sanction.lift` | `caseId`, `sanctionId` | Levantar (de su caso); recalcula la restricción |
| `moderationTakeAppeal` | `TAKE_APPEAL` | `moderation.appeal.review` | `appealId` | → `UNDER_REVIEW` |
| `moderationDecideAppeal` | `DECIDE_APPEAL` | `moderation.appeal.review` | `appealId`, `outcome` (`UPHELD`/`DENIED`) | Si `UPHELD`, deshace lo apelado en la misma transacción |

### Lectura — `moderationConsole` (solo lectura)

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
| `appeals` | `moderation.read` | `status`, `limit`, `reveal` | Apelaciones por estado | sí |
| `subject` | `moderation.read` | `caseId`, `reveal` | Reincidencia y restricción de la persona; sus caras, solo con `reveal` | sí |
| `reporter` | `moderation.identity.read` | `caseId`, `reportId` | Quién denunció una señal, y sus señales de abuso | sí |
| `stats` | `moderation.read` | — | Casos por estado, apelaciones por estado, sanciones activas, reportes 24 h / 7 d | no (agregados) |
| `policies` | `moderation.read` | — | Las políticas vigentes | no |
| `audit` | `moderation.audit.read` | `limit`, `before` | La auditoría de moderación | sí |

Por defecto la Consola **no ve quién denunció** (seudónimo estable `per_…`) **ni la cuenta del denunciado** (que es el
vínculo entre su Perfil Real y su Perfil Weë): ve la cara con la que se publicó y actúa sobre la persona sin necesitar ese
vínculo.

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

## 6. Políticas: configurables, apagadas o sin números inventados

| Política | Por defecto | Qué decide |
|---|---|---|
| Prioridad (`priority`) | Gravedad por motivo del catálogo; solo `CRITICAL` pide revisión prioritaria; **sin umbral de denunciantes** | El orden de la cola y cuándo un caso sube a prioritaria |
| Ocultación preventiva (`preventiveHiding`) | **DESACTIVADA**, `minimoDeDenunciantes: null`, `gravedades: null` | Ocultar antes de revisar. Habilitada a medias se queda apagada y lo dice (`incompleta`). Si se activa, oculta a la custodia —reversible y apelable— y sube el caso a prioritaria; no decide nada |
| Retirada (`removal`) | Reversible; `purgaTrasDias: null` | Retirar no borra: no existe código que purgue. Irreversible solo si se escribe `reversible: false` |
| Apelaciones (`appeals`) | `revisionIndependiente: false` | Si quien decidió puede revisar la apelación. Apagada se anota (`sameReviewer`); encendida, se impide |
| Abuso de reportes (`abuse`) | `minimoDeReportes: null`, `ratioDeRechazo: null` | Se MIDE siempre; se SEÑALA solo con los dos números; ninguna consecuencia automática |

Lo único automático hoy: ordenar la cola, subir lo CRÍTICO a prioritaria, reabrir un caso cuando llega algo nuevo y
cerrar suspensiones vencidas. **No hay sanciones ni ocultación automáticas.**

## 7. Reglas de autorización

1. **Sesión** de una cuenta autenticada de verdad (`esCuentaAutenticada`): un invitado no administra.
2. **Administración** de siempre (`isAdmin`: claim `admin` o `WEE_ADMIN_UIDS`). Quien no lo es se rechaza **sin escribir
   nada**, ni en la auditoría.
3. **Sesión vigente**: se relee Firebase Auth en cada llamada (`sesionVigenteEnAuth`): cuenta deshabilitada, sesiones
   revocadas o claim retirado no entran aunque el token diga otra cosa; si Auth no contesta, no se entra (emulador D1–D6).
4. **Permiso específico** de la operación. Una denegación a quien SÍ era administración queda en la auditoría (`DENIED`).
5. **Conflicto de interés**: nadie modera un caso sobre su propio contenido (con cualquiera de sus caras) ni uno que
   denunció; nadie revisa una apelación propia.
6. **El permiso es de la cuenta administrativa** (el principal autenticado), nunca de una cara: el Perfil Real y el Perfil
   Weë no tienen permisos, así que no hay herencia posible.
7. **Nada del cliente decide**: ni la cuenta, ni el estado, ni la prioridad, ni el actor. La prioridad la calcula el servidor
   y no se elige a mano ni al soltar ni al reabrir.

## 8. Matriz de permisos administrativos

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

**En esta rama** no existe la matriz de roles de la Consola (`weeRole`, rama `admin/integracion-consola`, sin integrar):

- Administración **sin** rol recibe todos los permisos de moderación —el mismo «puente» que la Consola llama legado, que se
  cierra con su mismo interruptor, `WEE_ADMIN_SIN_ROL=cerrado`; un valor mal escrito cierra—.
- Una sesión **con** `weeRole` no recibe ninguno: sus permisos los decide una matriz que aquí no está (falla cerrado).

**Propuesta para la matriz de la Consola** (decisión del dueño, no aplicada): `owner` → todos; `moderation` →
`moderation.read`, `moderation.review`, `moderation.case.resolve`, `moderation.content.hide`, `moderation.content.restore`,
`moderation.account.warn`, `moderation.appeal.review`; `support` → `moderation.read`. Retirar contenido, suspender, bloquear,
levantar, ver identidades y leer la auditoría, solo `owner` hasta que el dueño diga otra cosa.

## 9. Integración con la futura Consola

La Consola no lee Firestore: llama a funciones. Para conectarla **no hay que rediseñar el backend**:

1. Añadir los permisos de § 8 a `PERMISOS` de `functions/src/admin/permisos.ts` (las escrituras a
   `PERMISOS_DE_ESCRITURA`) y repartirlos en `MATRIZ` según la decisión del dueño.
2. Pasar a la puerta del núcleo los dos puertos de la Consola —`crearNucleoDeModeracion({ sesionVigente, permisosDe })`
   con `sesionVigente` y `permisosDe` de `admin/autorizacion.ts`/`permisos.ts`—, o envolver las callables con
   `escrituraAuditada`/`lecturaAuditada` y una entrada por operación en `operaciones.ts` (`CATALOGO`). Las dos auditorías
   conviven: `adminAudit` dice quién llamó a qué; `moderationAudit` es el registro de dominio, atómico con cada acción.
3. La Consola pinta con los contratos de § 5: colas por `view: 'cases'` con su cursor `next`, el caso con `view: 'case'`,
   y cada botón llama a SU callable con un `requestId` nuevo por intención (un doble clic con el mismo `requestId` es un
   duplicado inofensivo).
4. Conflicto previsible al fusionar: la rama de la Consola también toca `moderationAdmin` en `moderation/index.ts`
   (envoltura de la callable); aquí solo se añade una guarda dentro de `revisar` y la tabla de resolutores. Son trozos
   distintos del archivo.

## 10. Decisiones de política pendientes (del dueño)

1. **Autolesiones (`SELF_HARM`)**: no está en tu lista y ya no se ofrece, pero se admite y se prioriza como crítico.
   ¿Vuelve a ofrecerse? (Sería el motivo 11: dos comprobaciones de la fundación están congeladas por la huella del Guardian
   en diez motivos y 24 claves, y moverlas exige re-anclar con autorización.)
2. **Umbrales de la ocultación preventiva**: denunciantes distintos y gravedades. Sin los dos, sigue apagada.
3. **Umbral de denunciantes para revisión prioritaria** (hoy ninguno) y la **gravedad de cada motivo** (propuesta en
   `GRAVEDAD_POR_MOTIVO`).
4. **Retención de lo retirado**: plazo de purga (hoy no se borra nada) y si lo retirado debe poder restaurarse.
5. **Revisión independiente de apelaciones** y si una apelación tiene plazo.
6. **Abuso de reportes**: los dos números que señalan, y si señalar tiene alguna consecuencia (hoy ninguna).
7. **Mensajes de WeeTalk**: ¿se moderan? (privacidad: un moderador leería una conversación privada).
8. **Bloquear**: ¿debe impedir iniciar sesión (deshabilitar en Auth)? Hoy registra la restricción y no toca Auth.
9. **Aplicación de las sanciones**: qué puertas las aplican (publicar, comentar, comunidades, WeeTalk, Weë AI) y si un
   suspendido puede denunciar o apelar (hoy: puede ambas).
10. **Preservar evidencia**: ¿copiar el contenido al recibir el primer reporte? Hoy no se copia nada hasta que se actúa, y
    lo que su autor borra antes de revisarse se pierde.
11. **Avisos a quien denunció** cuando se cierra su caso (hoy no se le avisa).
12. **Matriz de roles** de § 8.

## 11. Procedimiento de integración posterior

**Orden:** Functions → Consola → App → reglas (si las hubiera). Cada paso con su autorización; nada de esto se ha hecho.

1. **Backend (Functions).** Desplegar juntas las veinte del Moderation Core y la nueva versión de `reportContent` y
   `moderationAdmin` (están en el grupo vivo `g1`: su código cambia en la tabla de resolutores, los códigos de error y la
   guarda de `revisar`). Sacarlas de `no_se_despliegan` a un grupo. El disparador `moderationIntake` no debe desplegarse
   sin las de revisión (dejaría casos que nadie puede tocar). Desplegado no actúa solo: todas las políticas están apagadas.
2. **Reportes anteriores al Core**: el barrido solo mira los 200 más recientes. Para los antiguos, `moderationOpenCase`
   con `fromReportId` (uno a uno, desde la Consola). Un relleno masivo sería una migración aparte, preparada y autorizada.
3. **Consola**: § 9.
4. **App.** (a) La hoja de denunciar ya usa el catálogo único (diez motivos). (b) Leer `getMyModeration` para enseñar a la
   persona afectada lo que se hizo y dejarle apelar (`submitModerationAppeal`): pantallas nuevas, con textos nuevos en los
   42 diccionarios. (c) Textos de los avisos: los `kind` de `moderationNotices` → claves de i18n (sección
   `servidor/avisos` para el push) y el enganche con `notifications` (que dispara el push) en el servidor, con su cupo.
   (d) Aplicar la restricción (`restriccionDeCuenta`) en las puertas que el dueño decida (§ 10.9).
5. **Reglas (propuesta, NO aplicada).** Las colecciones nuevas ya están cerradas por la denegación por defecto. Para que se
   lea a simple vista, se propone añadir bloques explícitos, sin cambiar ningún comportamiento:

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

   Aplicar las sanciones a lo que el cliente escribe directamente (publicaciones y comentarios se crean desde la app bajo
   reglas) exigiría que las reglas leyeran la restricción: es un cambio de reglas, con coste por escritura, y es del dueño.

## 12. Cómo se prueba

```bash
cd functions && npm run build && node test/moderation-core.test.mjs && node test/moderation.test.mjs
```

```bash
firebase emulators:exec --only firestore,auth --project demo-wee-moderacion \
  "node functions/test/moderation-core.emulator.mjs firestore.rules"
```
