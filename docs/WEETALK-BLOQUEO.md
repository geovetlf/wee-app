# WeeTalk · Bloqueo de contactos

Rama `weetalk/bloqueo-contactos` (worktree `wt-weetalk-bloqueo`), sobre la candidata W0 `7aa01156` congelada.
Nada de esto está integrado, desplegado ni publicado. Fecha: 2026-11-07.

## 1 · Decisiones del dueño (vinculantes)

1. WeeTalk es mensajería **privada**: las conversaciones no se inspeccionan ni se moderan, y no hay denuncias de
   mensajes privados.
2. Bloquear es una **decisión personal de privacidad**. No genera reportes, casos ni sanciones del Moderation Core, y
   ese módulo y sus contratos no se tocan. (El `BLOCK` de la moderación es otra cosa: el desenlace de una revisión.)
3. El bloqueo es de **cuenta** y cubre la identidad Real y la Weë: si la cuenta A bloquea a la B, quedan bloqueadas las
   dos caras de B. Cambiar de cara no lo evade. **No se le revela a B la otra cara de A.**
4. Al bloquear: no hay mensajes nuevos de B a A, ni conversaciones directas nuevas, ni llamadas directas (si existen).
5. Hay una lista de bloqueados que solo ve quien bloquea, y se puede desbloquear. Desbloquear no restaura
   conversaciones borradas ni genera mensajes retroactivos.

## 2 · Auditoría (solo lectura, sobre `7aa01156`)

Se confirma lo que concluyó el agente anterior: **hoy no existe ningún bloqueo** en WeeTalk. Ni en
`services/messagesService.ts`, ni en `functions/src/social/weetalk.ts`, ni en el push de mensajes, ni en
`InboxScreen`/`ConversationScreen`, ni en las reglas de `conversations` y `messages`.

| Pieza | Qué hace hoy | Consecuencia para el bloqueo |
|---|---|---|
| `services/messagesService.ts` | `getOrCreateConversation` crea la conversación con `addDoc`; `sendMessage` crea el mensaje con `addDoc` y actualiza `lastMessage` con `updateDoc`; tema, fondo, modo efímero, presencia y leído, todo con `updateDoc`. | **Los mensajes y las conversaciones los escribe el CLIENTE directamente.** No hay callable ni disparador por medio. |
| `firestore.rules` (`conversations`, `messages`) | Crear conversación: dos identidades, una mía. Crear mensaje: remitente mío y participante. Actualizar: campos acotados. Ninguna mira bloqueos. Idéntico en `main` (`5efbc0a7`) y en W0. | Impedir el mensaje exige **cambiar las reglas** → prohibido sin autorización → queda como **propuesta** (§ 6). |
| `functions/src/social/weetalk.ts` | Solo `burnViewOnce` (quemar una foto única al abrirla). | No es un canal de escritura de B a A: abre y destruye algo que ya existe. No se condiciona (§ 5). |
| Push de mensajes (`sendMessagePushNotification`, `functions/src/index.ts`) | Disparador `onDocumentCreated` sobre `conversations/{c}/messages/{m}`; avisa a cada participante que no escribió. | **Único camino de servidor** de WeeTalk. Aquí sí se cumple hoy (§ 5). |
| Avisos (`sendPushNotification`, `notifications`) | Las reglas solo dejan crear `like`, `comment`, `econtact_request`, `econtact_accepted`; el tipo `message` no lo puede crear un cliente. | El push de mensajes no tiene otra puerta. |
| Llamadas | No existen (ni WebRTC, ni Agora, ni similares en el código ni en `package.json`). | Nada que bloquear; si llegan, usan la misma regla (§ 4). |
| Identidad | Caras: `uid` (Real) y `hidi_<uid>` (Weë, identificador heredado). La cuenta de una cara se LEE con `cuentaDeIdentidad` (`linkedAccountId`); las caras de una cuenta las compone solo `identidadesHeredadasDeLaCuenta` (`identity/compatibilidad.ts`). `identity/sesion.ts` tiene la barrera del invitado (`esCuentaAutenticada`) y la de cuenta Weë válida (`exigirCuentaWeeValida`, para las puertas que generan o cobran). | El bloqueo resuelve cuentas con el resolutor canónico y nunca quita prefijos. |

Otros hallazgos de la auditoría, fuera de alcance: «Eliminar conversación» hoy no borra nada (`updateDoc({})`, ya
anotado en `docs/F11-MIGRACION.md`); las reglas no dejan borrar mensajes ni conversaciones.

## 3 · Base elegida

**`7aa01156b23a407ab71fc9e23e40e854285507c9`** (cabeza de `candidato/desplegable`, W0), como referencia congelada.

Por qué no `main` (`5efbc0a7`): W0 trae 171 commits encima, entre ellos `functions/src/identity/sesion.ts` (la barrera
del invitado que usan estas callables), `perfilPublico.ts`, 330 líneas de `firestore.rules` y cambios en
`ConversationScreen.tsx`. Sobre `main` faltaría la barrera y la integración chocaría después. El bloque de reglas de
conversaciones es idéntico en las dos, así que la propuesta sirve igual. **La integración real solo puede hacerse
cuando W0 esté validada.**

## 4 · Diseño

### 4.1 · El modelo

Una relación por pareja de cuentas y dirección, con ENTRADAS por caras:

```
weetalkBloqueos/{cuentaQueBloquea}~{cuentaBloqueada}        la verdad
  cuentaQueBloquea, cuentaBloqueada
  entradas: [{ caraQueBloquea, caraBloqueada, desde }]      ≤ 4 (2 caras × 2 caras)
  creadoEn, actualizadoEn
weetalkBloqueosPorPar/{de}~{para}                           derivado: «`de` no puede escribir a `para`»
  de, para
weetalkBloqueosCupo/{cuenta}                                tope: 1000 cuentas bloqueadas por cuenta
  relaciones, actualizadoEn
```

Las tres colecciones son **solo del servidor**: `firestore.rules` no las nombra y no hay comodín en la raíz, así que la
denegación por defecto las cierra a todos los clientes. No hace falta tocar las reglas para eso.

### 4.2 · La regla común: ¿puede X escribir a Y?

`puedeEscribir` (pura, por cuentas, `functions/src/social/weetalkBloqueos.ts`). Si A bloquea desde su cara `a`
viendo la cara `b` de B:

| | a (protegida) | otra cara de A |
|---|---|---|
| **cualquier cara de B** escribe a… | **NO** (cambiar de cara no lo evade) | sí (si no, B descubriría esa cara) |

| | b (bloqueada) | otra cara de B |
|---|---|---|
| **cualquier cara de A** escribe a… | **NO** (hasta desbloquear) | sí (si no, A descubriría esa cara) |

Las dos caras de una misma cuenta nunca se bloquean entre sí. Si A quiere proteger también su otra cara, bloquea desde
ella y queda como otra entrada. **Por qué no se protegen todas las caras de A**: si B no pudiera escribir a la otra cara
de A, le bastaría probar a escribir a perfiles Weë para encontrar el que falla — un oráculo que revela justo lo que la
decisión 3 prohíbe. (Es una opción si el dueño la prefiere: está en una sola función. § 9.)

### 4.3 · El índice

`paresBloqueados` escribe la MISMA regla como conjunto de pares `de~para`, que es lo único que unas reglas de Firestore
pueden consultar (`exists()` de una ruta; no pueden buscar en `users`). Para dos caras de cuentas distintas,
`puedeEscribir(x → y).puede ⇔ x~y ∉ índice`: la suite lo comprueba en las 256 combinaciones posibles de entradas en los
dos sentidos (2048 casos). El índice incluye la cara Weë de una cuenta aunque aún no exista. Cada bloqueo o desbloqueo
reescribe ENTERO el índice de esas dos cuentas desde sus dos relaciones (se cura solo; un bloqueo y su contrario
comparten pares sin pisarse).

### 4.4 · Identidad

- La cuenta de quien llama es `request.auth.uid`; la cara con la que actúa (`asIdentity`) se comprueba en `users`.
- La cuenta de la otra persona se LEE de `users` por el campo `uid` con `cuentaDeIdentidad` (hasta cinco documentos;
  si no cuentan la misma historia, no hay cuenta).
- Las caras de una cuenta salen solo de `identidadesHeredadasDeLaCuenta`, a partir de una cuenta autenticada o leída:
  nunca se quita el prefijo `hidi_`. Cuando los perfiles se renumeren, cambia esa frontera y el índice se recompone
  (sería una migración del índice).

## 5 · Dónde se cumple el bloqueo y dónde no

| Camino | Quién escribe | Hoy | Con la propuesta de reglas |
|---|---|---|---|
| Aviso push de un mensaje (`sendMessagePushNotification`) | servidor (disparador) | **SE CUMPLE**: no suena si la regla dice que no; falla cerrada (sin cuentas o sin poder leer, no suena). No recibe el mensaje. | igual |
| Mensaje nuevo (`conversations/{c}/messages`) | cliente | **NO**: el mensaje se guarda y B puede escribirlo; A lo vería en la conversación. | **SE CUMPLE**: `create` denegado. |
| Conversación directa nueva | cliente | **NO** | **SE CUMPLE** |
| Cambios visibles en una conversación (tema, fondo, modo efímero, `lastMessage` nuevo) | cliente | **NO** | **SE CUMPLE**: solo presencia propia, leído y vaciado efímero. |
| Leer el historial | cliente | sin cambio | sin cambio (bloquear no borra nada) |
| Llamadas directas | — | no existen | — |
| `burnViewOnce` (abrir una foto única) | servidor | no se condiciona: no es escritura de B hacia A, y bloquearlo dejaría viva una foto que debe desaparecer | igual |
| ËContact (solicitudes) y avisos sociales (`like`, `comment`) | servidor / cliente | fuera del alcance decidido (decisión pendiente, § 9) | — |

Hasta que se autoricen las reglas, el servidor solo garantiza que **no suene el push**. Un mensaje de B a A se guarda
y A lo vería al abrir la conversación.

Cambio de comportamiento del push, a sabiendas: si la cara que escribió no tiene una cuenta que se pueda LEER (un perfil
sin `linkedAccountId` coherente), el mensaje ya no suena — no se puede comprobar el bloqueo. Es la misma política que
ya sigue `sendPushNotification` con el cupo («remitente sin cuenta → no suena»). Cuesta dos lecturas más por
destinatario (las dos relaciones entre las cuentas). Se descartó «borrarlo» con un disparador: deja una ventana en la que se ve,
no puede deshacer el `lastMessage` sin leer contenido, y sería actuar sobre mensajes privados (decisión 1).

## 6 · La propuesta de reglas (NO aplicada)

- Texto exacto: `ops/propuestas/weetalk-bloqueo/conversaciones.rules` — el bloque `match /conversations/{conversationId}`
  entero tal como quedaría. Añade `bloqueado(de, para)` (= `exists(weetalkBloqueosPorPar/{de}~{para})`), y la condición
  en `create` de la conversación, en su `update` (`cambioPermitidoConBloqueo`) y en `create` del mensaje. No cambia
  quién lee.
- Composición sin tocar `firestore.rules`: `ops/propuestas/weetalk-bloqueo/componer.mjs` (`componerPropuesta`). Se niega
  si el bloque actual ya no es el de W0 (huella `5d7f5c9a…`): habría que revisar la propuesta.
- Coste: una lectura `exists()` más por escritura en conversaciones y mensajes (dentro del límite de 10).
- Orden seguro: callables y push → interfaz → reglas. En cualquier orden no rompe nada: sin documentos en el índice, las
  reglas propuestas permiten lo mismo que hoy. Los bloqueos hechos antes de las reglas ya tienen su índice escrito.
- Pruebas preparadas: `ops/propuestas/weetalk-bloqueo/reglas.prueba.mjs` (35 comprobaciones: mensajes, conversaciones
  nuevas, conversación congelada, lecturas, colecciones cerradas, desbloqueo y sabotaje con las reglas de hoy). Fuera de
  la CI a propósito (no es `*.emulator.mjs`): contra las reglas de hoy fallaría. Se lanzan con
  `node ops/propuestas/weetalk-bloqueo/correr-reglas.mjs`: proyecto `demo-wee-bloqueo`, Firestore 38080 (websocket
  39150), Auth 39099, Functions 35001, Storage 39199, hub 34400, logging 34500, sin interfaz; se niega con menos de
  1,5 GB libres. **No se han ejecutado**: la máquina tenía entre 0,75 y 1,24 GB libres.

## 7 · Contratos

| Callable | Entrada | Salida | Errores (`details.motivo`) |
|---|---|---|---|
| `blockWeeTalkContact` | `{ asIdentity, targetIdentity }` | `{ identidad, bloqueado: true, yaEstaba }` | `identidad-invalida`, `identidad-desconocida`, `identidad-ajena`, `misma-persona`, `demasiados` |
| `unblockWeeTalkContact` | `{ targetIdentity }` | `{ identidad, bloqueado: false, estaba }` | `identidad-invalida` |
| `listWeeTalkBlocks` | `{}` | `{ bloqueados: [{ identidad, desdeIdentidades, desde }] }` | — |

Todas: sin sesión → `unauthenticated`; sesión de invitado → `ACCOUNT_REQUIRED` (barrera del invitado: WeeTalk es «de
una persona»). La barrera de cuenta Weë válida (edad y país) es para las puertas que generan o cobran, y no se pone
delante de protegerse. Idempotentes: bloquear dos veces no duplica; desbloquear lo que no está no es error. Errores
controlados con el patrón de Comunidades y WeëPages (el mensaje es el código). Sin IA, sin Credits, sin secretos.

Cliente: `services/weetalkBloqueosService.ts` (`bloquear`, `desbloquear`, `listar`, `motivoDeBloqueo`,
`estaEnMiLista`). Sin textos de interfaz y sin leer `error.message`.

## 8 · Privacidad

- La lista es de quien bloquea y solo de él: `listar` no acepta otra cuenta. B no tiene lista, ni aviso, ni callable que
  le diga que está bloqueado.
- Ninguna respuesta lleva la cuenta de nadie. La lista enseña la cara que se bloqueó; si A bloquea dos caras que
  resultan ser de la misma persona, salen como dos filas (juntarlas lo delataría), y la respuesta al bloquear la segunda
  dice «no estaba».
- Con las reglas aplicadas, a B le fallará el envío con el error genérico de siempre (`weetalk.sendFailed`). Puede
  intuir algo, como en cualquier mensajería; no recibe ningún «estás bloqueado».
- Riesgo residual conocido y ajeno a este trabajo (F-06, D3 en `firestore.rules`): el identificador heredado de una cara
  Weë contiene el `uid` de su cuenta. El bloqueo no añade ninguna vía nueva y no depende de esa forma: el día de los
  identificadores opacos sigue funcionando.
- Sin inspección: la lógica del bloqueo no lee mensajes, ni `lastMessage`, ni la colección `messages`; el disparador del
  push le pasa solo quién y a quién.

## 9 · Pendientes que necesitan autorización o decisión

1. **Aplicar la propuesta de reglas** (`firestore.rules`) — prohibido sin autorización. Hasta entonces el bloqueo no
   impide que el mensaje se guarde.
2. **Desplegar** `blockWeeTalkContact`, `unblockWeeTalkContact`, `listWeeTalkBlocks` (en `no_se_despliegan`) y la versión
   del push de mensajes con el bloqueo (función viva del grupo g3) — tras validar W0.
3. **Interfaz** («Bloquear» en la conversación y el perfil, «Bloqueados» en Configuración, aviso a quien bloqueó en la
   conversación): NO se ha hecho. La regla 8 de i18n exige claves en los 42 diccionarios con traducción real y la huella
   `i18n/huella.json`, y la puerta visual pide inspección a 320/360/390/1024/1440 en LTR y RTL; con menos de 1,5 GB libres
   no se puede levantar Metro para verla. Queda pendiente entera.
4. **Decisión de producto**: ¿proteger también la otra cara de quien bloquea (más protección, pero B podría descubrir esa
   cara)? Hoy no, por la decisión 3.
5. **Decisión de producto**: ¿el bloqueo de WeeTalk debe cortar también las solicitudes de ËContact y los avisos
   sociales entre esas cuentas? No está decidido; no se ha hecho.
6. Ejecutar `reglas.prueba.mjs` en el emulador aislado, `tsc` completo de `functions` y de la app, y la cadena completa,
   cuando haya memoria (≥ 1,5 GB) — hecho solo lo que cabía (§ 10).

## 10 · Pruebas

- `functions/test/weetalk-bloqueo.test.mjs` (en la cadena, dominio `social-y-feed`): **86/86**. Regla contra
  especificación, equivalencia regla ⇔ índice (2048 casos), motor real sobre Firestore en memoria (bloquear, idempotencia,
  dos caras, evasión, push, desbloquear, lista, tope, errores, barrera del invitado), privacidad, no inspección,
  cableado, propuesta de reglas (compone, no aplicada) y sabotaje.
- Suites existentes tocadas o afectadas, ejecutadas una a una: `runtime-map` (ahora 54 Functions) y
  `productions-runtime` actualizadas; todas en verde (ver el informe).
- Comprobación de tipos acotada del módulo nuevo (`tsc --noEmit` sobre `weetalkBloqueos.ts`, 499 archivos, 290 MB) y de
  un extracto del disparador del push con sus tipos reales: 0 errores. El `tsc` completo de `functions` y de la app NO
  se ha ejecutado (memoria); las suites corrieron sobre un `functions/lib` transpilado sin comprobar tipos
  (`ts.transpileModule`), que no se versiona y que `npm run build` regenera.
- Pruebas de reglas en el emulador: preparadas (35), **no ejecutadas**.
