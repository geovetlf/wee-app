# WEE ACCOUNT IDENTITY — el contrato

Cómo se identifica una cuenta de Weë, cómo se numera y cómo se relacionan con ella las personas que la usan y las caras con las que actúa. Es el contrato definitivo: se cierra antes de repartir el primer número, porque un número repartido ya no se puede cambiar.

Vive en `functions/src/core/account-identity.ts`, puro y sin base de datos, y se compone sobre Firestore en `functions/src/identity/cuentas.ts`.

## 1. Seis identificadores que nunca son el mismo

| Identificador | Qué responde | Forma | Quién lo ve |
|---|---|---|---|
| **Auth Principal** | quién está autenticado | uid de Firebase Auth | servidor y reglas |
| **Account ID** | de quién es todo | opaco; hoy, el uid que fundó la cuenta | servidor y reglas |
| **Account Number** | cómo se nombra una cuenta por fuera | nueve dígitos, texto | su dueño, y quien vaya a operar con ella |
| **Wallet Number** | dónde está el saldo | el mismo número de la cuenta | su dueño |
| **Entity ID** | qué cara o Página actuó | `ent_` y 26 caracteres sorteados | servidor; público solo si hace falta |
| **Profile document ID** | dónde está guardado un perfil | id automático de Firestore | nadie: no es identidad |

Las cinco reglas que se derivan:

- El Account ID **no se interpreta**. No contiene el número, no dice de quién es, no se descompone.
- El Account Number **no autoriza**. Saberlo sirve para dirigir una operación, nunca para entrar.
- El Entity ID **no lleva dentro el número de la cuenta**, para que dos caras de la misma persona no sean enlazables a simple vista.
- El Profile document ID **no identifica**. La identidad de un perfil es su campo `uid`.
- Un uid de Firebase Auth **nunca se convierte en Account Number**, ni al revés.

## 2. Por qué el Account ID es el uid que fundó la cuenta

Porque ya lo es en los datos. El saldo, el material, los trabajos, los proyectos y el token de push cuelgan de ese valor, y las reglas autorizan comparándolo con la sesión sin una lectura más. Un identificador nuevo obligaría a reescribir la propiedad de todo lo que existe y a pagar una lectura por regla.

Lo que cambia es el trato: es un valor opaco. Nadie deduce de él un número, y **nadie asume que la persona autenticada es la dueña**: eso lo dice la membresía. El atajo `request.auth.uid == accountId` vale hoy porque toda cuenta tiene un solo principal, el que la fundó.

## 3. Account Number

- **Ancho:** 9 dígitos. Fijo para siempre.
- **Forma:** `^[0-9]{9}$`, nunca `000000000`.
- **Tipo:** texto. Un número con ceros delante metido en un `number` vuelve siendo el de otra cuenta.
- **Rango sorteable:** `000100000` a `999999999`. Los cien mil primeros quedan reservados para cuentas de Weë, soporte y pruebas.
- **Normalización:** se admiten espacios, guiones y puntos al escribirlo; nada más. Un número corto **no se rellena** con ceros: ocho dígitos no son un número al que le falta uno.
- **Presentación:** en grupos de tres, `008 432 175`. Eso es pantalla, no almacenamiento.
- **Generación:** sorteo uniforme sin sesgo a partir de cuatro bytes al azar del sistema, con rechazo del resto que no reparte parejo. Lo hace solo el servidor.
- **Unicidad:** un documento por número, creado en la misma transacción que la cuenta. Si el número ya estaba, la transacción no llega a escribir.
- **Inmutable:** una cuenta no cambia de número, y un número no se reutiliza jamás.
- **Búsqueda:** `accountNumbers/{numero}` lleva a su cuenta en una sola lectura.

## 4. Entity ID

- **Forma:** `ent_` más 26 caracteres del alfabeto base 32 de Crockford en minúsculas, sin `i`, `l`, `o` ni `u`.
- **Origen:** 130 bits sorteados. Con cien millones de entidades, la probabilidad de que dos coincidan es del orden de una entre 10^20.
- **Opaco:** no lleva dentro el número de la cuenta, ni la cuenta, ni el tipo, ni la secuencia.
- **El prefijo dice la CLASE de identificador,** no la entidad: sirve para que un id de cuenta, un número o el uid de un perfil no se cuelen donde se espera una entidad.

## 5. Entity Type y Entity Sequence

Tres tipos y solo tres: `REAL_PROFILE`, `WEE_PROFILE`, `PAGE`. No hay, ni habrá, un cuarto para los negocios: un negocio es una Página.

| Secuencia | Tipo | Cuándo |
|---|---|---|
| 1 | REAL_PROFILE | nace con la cuenta |
| 2 | WEE_PROFILE | reservada desde el primer día; se ocupa cuando la persona crea su cara Weë |
| 3 en adelante | PAGE | cada Página toma la siguiente y nunca se recicla |

Las dos se **guardan explícitas**. El tipo no se deduce de la secuencia, ni del identificador, ni del último dígito; la secuencia no se deduce del tipo. Lo guardado manda, y una entidad cuyo tipo y secuencia se contradicen se rechaza.

Una secuencia usada no vuelve a usarse: «la Página 4 de la cuenta 008 432 175» tiene que querer decir lo mismo dentro de cinco años, también en un registro de soporte. Retirar una Página cambia su estado, no su número.

## 6. Lo que se guarda

### `accounts/{accountId}` — la cuenta

| Campo | Obligatorio | Inmutable | Quién escribe | Público |
|---|---|---|---|---|
| `accountId` | sí | sí | servidor | no |
| `accountNumber` | sí | sí | servidor | solo su dueño |
| `status` | sí | no | servidor | no |
| `foundingPrincipalId` | sí | sí | servidor | no |
| `realProfileEntityId` | sí | sí | servidor | no |
| `weeProfileEntityId` | no | sí una vez puesto | servidor | no |
| `nextPageSequence` | sí | no, solo sube | servidor | no |
| `createdAt` / `updatedAt` | sí | `createdAt` sí | servidor | no |

Lectura: solo su dueño. Escritura: nadie desde el cliente.

### `accountNumbers/{numero}` — el índice del número

`{ accountId, createdAt }`. Su existencia es lo que impide repartir un número dos veces. Ni se lee ni se escribe desde el cliente: quien necesite resolver un número pasa por el servidor.

### `entities/{entityId}` — cada cara y cada Página

| Campo | Obligatorio | Inmutable | Público |
|---|---|---|---|
| `entityId` | sí | sí | sí, es opaco |
| `ownerAccountId` | sí | sí | **no** |
| `entityType` | sí | sí | sí |
| `entitySequence` | sí | sí | no |
| `profileRef` | no | no | no |
| `status` | sí | no | sí |
| `createdAt` / `updatedAt` | sí | `createdAt` sí | no |

`profileRef` nombra el perfil por su campo `uid`, nunca por el id del documento: `{ coleccion: 'users', uid }`. Para el Perfil Real ese uid es el de la cuenta; para la cara Weë, el identificador heredado, **leído de los datos y nunca compuesto**.

Lo único que puede viajar a un documento que lea cualquiera es `entityId`, `entityType` y `status`.

### `accounts/{accountId}/members/{principalId}` — principal → cuenta

`{ accountId, principalId, role, status, entityScope?, createdAt, updatedAt, grantedByPrincipalId? }`.

Papeles: `OWNER`, `ADMIN`, `EDITOR`, `FINANCE`. Estados: `ACTIVE`, `INVITED`, `REVOKED`. Hoy solo se crea el `OWNER` de quien funda; el resto es la costura para el día que una empresa tenga dueño, administrador y contable sin que ninguno necesite otra cuenta.

### `accounts/{accountId}/operations/{clave}` — lo ya hecho

`{ entityId, createdAt }`. Hace idempotente la creación de Páginas: la misma petición repetida devuelve la misma Página.

## 7. Principal → cuenta: una sola puerta

`resolverCuentaDelPrincipal(principal, cuentaSolicitada?)`:

- Sin cuenta pedida, la que fundó: es dueño.
- Con otra cuenta, hace falta una membresía **activa**, y el papel es el que diga esa membresía.
- Cualquier otra respuesta es `null`.

No hay una segunda forma de responder a esta pregunta en Weë, y esa es la razón de que la función exista.

## 8. Cómo nace una cuenta

Una transacción, cuatro escrituras, o ninguna:

1. Leer `accounts/{accountId}`. Si ya está, se devuelve y no se sortea nada.
2. Sortear un número y comprobar que su índice está libre. Hasta ocho intentos dentro de la misma transacción.
3. Escribir, en el mismo commit: la cuenta, el índice del número, la membresía del dueño y la entidad del Perfil Real.

De ahí salen las garantías: nunca un número repartido sin cuenta, nunca una cuenta sin número, y nunca dos cuentas para el mismo principal. La cara Weë y las Páginas se añaden después, cada una con su propia transacción sobre la cuenta ya nacida.

**La billetera no se crea:** se deriva. Una cuenta, una economía, un número. El Financial Core toma `accountNumber` de aquí y no guarda otro.

## 9. Qué pasa cuando algo falla

| Fallo | Qué queda | Cómo se recupera |
|---|---|---|
| Auth creado y cuenta no | nada | el siguiente intento la crea; es idempotente |
| Transacción abortada por contención | nada | el SDK reintenta; después, quien llamó |
| Respuesta perdida tras el commit | la cuenta, entera | reintentar devuelve la misma cuenta y el mismo número |
| Petición repetida | nada nuevo | el identificador de la cuenta es el del principal |
| Sorteo en un número tomado | nada | se sortea otro dentro del mismo intento |
| Los ocho sorteos tomados | nada | se avisa y se repite la operación |
| Proceso caído a mitad | nada | una transacción no deja mitades |
| Página repetida | nada nuevo | la clave de idempotencia devuelve la misma |

## 10. Privacidad

| Dónde | Account Number | Entity ID | ownerAccountId | uid |
|---|---|---|---|---|
| Perfil público, publicaciones | nunca | admisible, es opaco | **nunca** | heredado, ya expuesto |
| Material y publicaciones guardadas | nunca | sí | sí, en el documento privado | sí |
| URLs y avisos | nunca | evitar | nunca | evitar |
| Registros y analítica | nunca junto a un nombre | sí | sí | evitar |
| Pantalla de su dueño | sí | no hace falta | no | no |

## 11. Lo que esto sustituyó

Retirado en la Fase 11.x-5A, sin datos detrás: en producción no existen `accounts`, `entities` ni `contadores`, y nunca llegó a escribirse ninguno.

| Lo retirado | Por qué contradecía el contrato |
|---|---|
| `identificadorDeEntidad(accountNumber, secuencia)` | formaba el identificador de una entidad pegando el número de la cuenta y su secuencia: enseñaba el número, enlazaba las dos caras de una persona y dependía del ancho |
| `numeroDeCuentaDesde(posicion, ancho = 7)` | siete dígitos no llegan a diez millones de cuentas, y el número salía de una posición correlativa |
| `contadores/cuentas` | un contador global: punto caliente para todas las altas y, además, decía cuántas cuentas hay y en qué orden llegaron |
| `nacerCuenta`, `entidadDeCuenta`, `cuentaValida`, `AccountIdentity` | ataban la entidad al número de la cuenta |
| `asegurarIdentidadDeCuenta`, `asegurarEntidadWee` y su puerto | el protocolo entero del contador |
| `functions/src/identity/index.ts` | la composición que lo guardaba |
| `AccountNumber` de 4 a 20 dígitos y `esNumeroDeCuenta` | dos anchos distintos para el mismo número |

El Financial Core no cambió: toma el número de `NumeroDeCuenta` y sigue sin generarlo, sin validarlo y sin guardar el suyo aparte.

## 12. Cómo nace una cuenta hoy, de verdad

`functions/src/identity/nacimiento.ts`, disparado al **crear** un documento de `users`:

| Lo que se crea | Lo que pasa |
|---|---|
| Perfil Real | nace la cuenta: número, membresía de su dueño y entidad de secuencia 1, en una transacción |
| Perfil Weë de una cuenta ya nacida | se le añade la entidad de secuencia 2 |
| Perfil Weë de una cuenta que **no** ha nacido | nada, y se anota: numerar una cuenta que ya existe es la migración |
| cualquier otra cosa | nada |

Dos cerraduras lo mantienen fuera de la migración: un disparador de creación no despierta con lo ya escrito, y una cara Weë nunca hace nacer una cuenta. Ningún valor llega del cliente: lo único que entra es el documento recién escrito.

### 12.1 Las cuentas que no han nacido, y la migración que falta

Documentado en el cierre post-auditoría 2026-10-01 (`trust/denuncia-sin-cuenta-nacida`). **Nada de esto se ha ejecutado, y la política no cambia:** denunciar exige una cuenta nacida y `ACTIVE` (`docs/MODERATION.md` § 7).

**Qué cuentas están afectadas.** Las de toda persona cuyo Perfil Real se creó **antes** de que `nacimientoDeCuenta` entrara en producción —revisión `nacimientodecuenta-00002-yaz`, desde 2026-09-20T00:54Z (`ops/produccion.json`)—: el disparador es de creación y no despierta con lo ya escrito. Se identifican así, solo leyendo:

1. Un documento de `users` cuya cara, según `caraDelPerfilGuardado` (`identity/compatibilidad.ts`), es `REAL_PROFILE` —`profileType` `real` o ausente, `uid` válido y la cuenta (`cuentaDeIdentidad`) igual a ese `uid`—.
2. Y `accounts/{uid}` **no existe** (`cuentaDeWee` devuelve `null`) o no está `ACTIVE`.

Sus caras Weë (`hidi_<uid>`, `profileType: 'hidi'`) tampoco tienen entidad: `nacerLoQueTocaDeUnPerfilNuevo` las deja en «la cuenta no ha nacido: eso es la migración». Quedan fuera, y hay que informarlas aparte: los documentos cuya cara no se puede leer (sin `uid` válido, `profileType` desconocido, vínculo contradictorio) y las cuentas con **varios** documentos de `users` que se contradicen (`docs/F11-MIGRACION.md` § 3.1 y § 6: en producción hay `uid` con 2 y 3 documentos, algunos sin `linkedAccountId`).

**Qué migración hace falta.** No existe: no hay script, ni callable, ni backfill (`functions/src/identity/cuentas.ts`, cabecera). Lo que sí existe son las piezas, idempotentes y probadas contra el emulador (`functions/test/cuenta-identidad.emulator.mjs`):

- `asegurarCuentaEnWee(db, uid, at, perfilUid)` — una transacción: si `accounts/{uid}` ya está, la devuelve sin sortear nada; si no, escribe la cuenta, su número (`accountNumbers`, con `create`: nunca dos cuentas con el mismo), la membresía del dueño y la entidad 1 (Perfil Real).
- `asegurarCaraWeeEnWee(db, uid, perfilUid, at)` — la entidad 2 de la cara Weë, en una transacción: si la cuenta ya tiene `weeProfileEntityId`, devuelve esa entidad y no crea otra.
- `nacerLoQueTocaDeUnPerfilNuevo(db, perfil, at)` — decide con `decisionDeNacimiento` y llama a las dos anteriores, y anota `entityId` en el perfil (`anotarLaEntidadEnElPerfil`, que no pisa una entidad distinta).

La migración sería un script nuevo con la forma de los que ya hay para datos de producción (`scripts/limpiar-cuenta-en-users.mjs`, `scripts/migrar-media.mjs`): recorrer `users` **por páginas**, agrupar por cuenta, y para cada cuenta sin nacer llamar primero a `nacerLoQueTocaDeUnPerfilNuevo` con su Perfil Real y después con su cara Weë, si existe.

**Cómo se ejecutaría.** Igual que esos scripts:

- Sin banderas, **dry-run**: no escribe; imprime cuántas cuentas nacerían, cuántas caras Weë recibirían su entidad y la lista de ambiguas y no legibles, con su motivo. Es lo que contesta «cuántas son».
- Escribir exige **las dos banderas** (`--ejecutar --confirmo-autorizacion`) y la autorización explícita del dueño, dada después de ver el dry-run; `--project get-wee` explícito.
- **Idempotente**: repetirlo, o cortarlo a la mitad y relanzarlo, no crea nada dos veces —la cuenta se busca por su id, el número se reserva con `create` dentro de la misma transacción y la cara Weë se reconoce por el `weeProfileEntityId` de la cuenta, leído en la misma transacción—.

**Riesgos.**

- **Perfiles duplicados**: una cuenta con varios documentos de `users`. La cuenta nace una sola vez (su id es el `uid`), pero `entityId` se anota en el de id más bajo; los ambiguos no se migran y se informan.
- **La fecha**: `at` es la de la migración, no la del alta original. Usar `createdAt` del perfil es una decisión del dueño.
- **Concurrencia con la app**: si la persona crea su cara Weë durante la migración, el disparador y el script llaman a las mismas operaciones idempotentes; no se duplica nada.
- **Efectos**: escribir `entityId` en `users` no dispara nada (el único disparador sobre `users` es de creación). No toca Credits, publicaciones ni conversaciones.
- **Irreversible a efectos prácticos**: un número de cuenta repartido no se devuelve; por eso el dry-run va primero y la escritura solo con autorización.

**¿Se puede automatizar?** Sí, como script de ejecución única con dry-run; no como disparador ni como tarea programada, porque escribe datos de producción y necesita autorización. Una vez ejecutada, no hace falta nada continuo: las cuentas nuevas ya nacen con `nacimientoDeCuenta`.

## 13. La frontera con la identidad heredada

El concepto se llama **Perfil Weë** y el tipo de entidad es `WEE_PROFILE`. El prefijo heredado de HideTok que llevan los `uid` guardados es **dato histórico**, y vive encapsulado en `functions/src/identity/compatibilidad.ts`, que es el único archivo del servidor nuevo que lo nombra.

- El Core —`core/identity.ts` y `core/account-identity.ts`— no lo menciona ni depende de él.
- Ninguna entidad nace con él: los identificadores son `ent_` y 26 caracteres sorteados. Solo viaja dentro de `profileRef.uid`, que es un puntero al documento del perfil.
- El tipo sale del campo guardado, en una tabla de traducción que está en un solo sitio; la cuenta se lee del vínculo, nunca quitando el prefijo.
- El día que los perfiles se renumeren, cambia `profileRef.uid` y se borra ese archivo. La cuenta, su número, sus entidades, sus secuencias y sus membresías no se enteran.

En `firestore.rules` la frontera es `identidadWeeHeredadaDe(uid)`. Las reglas de los datos históricos —publicaciones, votos, conversaciones, avisos— siguen componiendo la forma heredada en línea porque nombran documentos que ya están escritos; eso se unifica el día de la renumeración.
