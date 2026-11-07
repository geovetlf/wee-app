# WeeTalk · Bloqueo de contactos

Rama `weetalk/bloqueo-contactos`, sobre la candidata W0 `7aa01156`, que queda congelada. **Nada de esto está integrado ni desplegado, y la propuesta de reglas no está aplicada.** La rama se publica como PR en borrador «DRAFT — NO MERGE» con autorización del dueño del 2026-11-07.

## 1 · Decisiones definitivas del dueño (2026-11-07, dos rondas)

1. WeeTalk no inspecciona ni modera conversaciones privadas.
2. El bloqueo es una herramienta de **privacidad**, no de moderación. No genera casos ni sanciones.
3. Se aplica a nivel de **cuenta**, en los **dos sentidos**, y cubre las **ocho combinaciones** de identidades Real y Weë.
4. Si A bloquea a B, B no puede contactar con **ninguna** de las identidades de A, y cambiar de identidad no lo evade.
5. Impide mensajes, conversaciones nuevas, llamadas directas (si existen) y solicitudes de ËContact.
6. Al bloquear se **cancelan** las solicitudes pendientes y se **eliminan** las conexiones de ËContact ya aceptadas entre las dos cuentas.
7. Desbloquear **no restaura** conexiones ni solicitudes: para reconectar hace falta una solicitud nueva y aceptarla.
8. No se revelan identidades alternativas ni se generan respuestas que permitan inferirlas.
9. **Alcance:** el bloqueo NO incluye «me gusta», comentarios, publicaciones ni otras interacciones sociales de la App. No se amplía.

La primera ronda confirmó la cuenta, las ocho combinaciones, los dos sentidos y ËContact. La segunda añadió eliminar las conexiones aceptadas, que antes no se tocaban, y acotó el alcance. Sustituyen a la primera versión de este documento, que protegía solo la cara desde la que se bloqueaba y dejaba ËContact fuera.

## 2 · Auditoría (solo lectura, sobre `7aa01156`)

Hoy no existe ningún bloqueo en WeeTalk. Ni en `services/messagesService.ts`, ni en `functions/src/social/weetalk.ts`, ni en los push, ni en las pantallas, ni en las reglas.

| Pieza | Qué hace hoy | Consecuencia |
|---|---|---|
| `services/messagesService.ts` | Crea conversaciones y mensajes con `addDoc`. Cambia tema, fondo, modo efímero, presencia y leído con `updateDoc`. | **Mensajes y conversaciones los escribe el CLIENTE**. Solo `firestore.rules` los autoriza. |
| `firestore.rules` (`conversations`, `messages`, `notifications`) | Ninguna regla mira bloqueos. Los avisos (`like`, `comment`, `econtact_request`, `econtact_accepted`) los crea el cliente para cualquier destinatario, con su forma acotada. | Impedir que se guarden exige **cambiar las reglas**. Por eso queda como propuesta (§ 6). |
| ËContact (`functions/src/social/econtact.ts`) | Pedir y aceptar son del servidor (`requestEContact`, `acceptEContact`), en una transacción. El cliente solo borra: cancelar, rechazar o eliminar. | El bloqueo de ËContact se cumple **en el servidor**, sin tocar reglas (§ 4.5). |
| Push de mensajes (`sendMessagePushNotification`) | Avisa a cada participante que no escribió. | Se cumple en el servidor (§ 5). |
| Push de avisos (`sendPushNotification`) | Envía un push real por cada aviso creado. | Se cumple en el servidor para los avisos de ËContact (§ 4.6). |
| Llamadas | No existen: no hay WebRTC, Agora ni nada parecido. | Nada que bloquear hoy. El día que existan, usan la misma regla. |
| Identidad | La cuenta de una cara se LEE con `cuentaDeIdentidad` (`linkedAccountId`). Las caras de una cuenta salen solo de `identidadesHeredadasDeLaCuenta`. | Nunca se quita el prefijo `hidi_`. |

## 3 · Base

`7aa01156b23a407ab71fc9e23e40e854285507c9`, la cabeza de `candidato/desplegable` (W0, validada en CI).

No se usa `main` porque le faltan la barrera del invitado (`identity/sesion.ts`) y 170 commits más. La integración real solo puede hacerse cuando W0 esté integrada y con autorización.

## 4 · Diseño

### 4.1 · El modelo

```
weetalkBloqueos/{cuentaQueBloquea}~{cuentaBloqueada}        la verdad
  cuentaQueBloquea, cuentaBloqueada
  entradas: [{ caraQueBloquea, caraBloqueada, desde }]      ≤ 4: lo que enseña la lista de quien bloquea
  creadoEn, actualizadoEn
weetalkBloqueosPorPar/{de}~{para}                           derivado: «`de` no puede contactar con `para`»
weetalkBloqueosCupo/{cuenta}                                tope: 1000 cuentas bloqueadas por cuenta
```

Las tres colecciones son **solo del servidor**. `firestore.rules` no las nombra, así que la denegación por defecto las cierra. El nombre del índice y su clave viven en `functions/src/social/bloqueosIndice.ts`, que comparten quien lo escribe y quien lo lee.

### 4.2 · La regla común: ¿puede X contactar con Y?

`puedeEscribir` es una función pura, por cuentas, en `functions/src/social/weetalkBloqueos.ts`. Mientras A tenga una relación con al menos una entrada hacia B, o B hacia A:

| | cualquier cara de A | cualquier cara de B |
|---|---|---|
| **cualquier cara de B** contacta con… | **NO** (decisiones 4 y 5) | (misma cuenta: sí) |
| **cualquier cara de A** contacta con… | (misma cuenta: sí) | **NO**, hasta desbloquear |

Da igual desde qué cara se bloqueó y qué cara se vio. Las dos caras de una misma cuenta nunca se bloquean entre sí.

**Por qué en los dos sentidos.** Supón que A pudiera escribir desde su otra cara a la otra cara de B. Entonces la respuesta de B fallaría, y B sabría que esa cara es de quien la bloqueó (decisión 9). Además, «desbloquear vuelve a las reglas normales» (decisión 8) implica que, mientras dura el bloqueo, nadie habla.

### 4.3 · El índice

`paresBloqueados` escribe la misma regla como conjunto de pares `de~para`. Es lo único que unas reglas de Firestore pueden consultar: un `exists()` de una ruta. Una relación con entradas cierra los **ocho** pares entre sus dos cuentas: 2 caras × 2 caras × 2 sentidos.

La suite comprueba la equivalencia en 2048 casos: `puedeEscribir(x → y).puede ⇔ x~y ∉ índice`. El índice incluye la cara Weë de una cuenta aunque todavía no exista. Cada bloqueo o desbloqueo reescribe entero el índice de esas dos cuentas a partir de sus dos relaciones.

### 4.4 · Identidad

- La cuenta de quien llama es `request.auth.uid`. La cara con la que actúa se comprueba en `users`.
- La cuenta de la otra persona se LEE de `users` por el campo `uid`, con `cuentaDeIdentidad`. Si los documentos no coinciden, no hay cuenta.
- Las caras de una cuenta salen solo de `identidadesHeredadasDeLaCuenta`.

### 4.5 · ËContact

- **Al bloquear se CANCELAN las solicitudes pendientes y se ELIMINAN las conexiones aceptadas** entre las dos cuentas, en cualquier sentido y entre cualesquiera de sus caras.
  - Se revisan los cuatro documentos posibles por su id (`idDeContacto`), dentro de la misma transacción del bloqueo. Se borran los que están `pending` o `accepted` y tienen una cara de cada cuenta (`ESTADOS_QUE_BORRA_EL_BLOQUEO`).
  - Borrar es lo que ya hacen «cancelar», «rechazar» y «eliminar» en ËContact.
  - **Desbloquear no restaura nada**, porque no queda nada que restaurar. Para reconectar hace falta una solicitud nueva y aceptarla. La suite lo recorre de punta a punta.
  - Consecuencia: Boost usa las conexiones aceptadas para su público de «contactos» (`functions/src/boost`). Al eliminarlas, la otra cuenta deja de estar en ese público. No es una ampliación del bloqueo a lo social: es lo que implica que la conexión ya no exista.
  - `econtactsCount` no lo mantiene nadie hoy (las reglas lo prohíben al cliente) y no hay disparadores sobre `econtacts`: no hay contadores que desincronizar.
- **Pedir y aceptar se niegan** mientras dure el bloqueo.
  - `requestEContact` y `acceptEContact` leen el índice dentro de su propia transacción. No abren otra.
  - Dan el motivo genérico `relacion-invalida` («Esta solicitud no es válida.»), que no habla de bloqueos.
  - La comprobación va la última: lo que ya se rechazaba (`misma-persona`, `ya-existe`…) se sigue rechazando igual.
- **Una conexión ya aceptada se elimina** (decisión 6). Antes no se tocaba.

### 4.6 · Avisos de ËContact

- **Push:** `sendPushNotification` no envía el push de `econtact_request` ni de `econtact_accepted` entre dos cuentas con un bloqueo. Usa la misma regla y falla cerrada, y la comprobación va antes de gastar el cupo.
- **El documento del aviso** lo crea el cliente. Que no se guarde exige la propuesta de reglas (§ 6). Hasta entonces, un cliente modificado podría dejar un aviso en la lista de la otra persona, aunque no sonaría.
- **«Me gusta», comentarios y publicaciones no cambian.** El dueño los dejó expresamente fuera del bloqueo (decisión 9).

## 5 · Dónde se cumple el bloqueo

| Camino | Quién escribe | Hoy, en esta rama | Con la propuesta de reglas |
|---|---|---|---|
| Push de un mensaje | servidor | **SE CUMPLE**, falla cerrada | igual |
| Push de un aviso de ËContact | servidor | **SE CUMPLE**, falla cerrada | igual |
| Pedir y aceptar ËContact | servidor | **SE CUMPLE**, error genérico | igual |
| Solicitudes pendientes al bloquear | servidor | **SE CANCELAN** | igual |
| Conexiones aceptadas al bloquear | servidor | **SE ELIMINAN** | igual |
| «Me gusta», comentarios y publicaciones | cliente/servidor | fuera del alcance | fuera del alcance |
| Mensaje nuevo | cliente | NO: se guarda, aunque no suena | **SE CUMPLE** |
| Conversación nueva | cliente | NO | **SE CUMPLE** |
| Cambios visibles en una conversación entre las dos cuentas | cliente | NO | **SE CUMPLE**: solo presencia propia, leído y vaciado efímero |
| Documento de un aviso de ËContact | cliente | NO: se guarda, aunque no suena | **SE CUMPLE** |
| Leer el historial | cliente | sin cambio | sin cambio (bloquear no borra nada) |
| Llamadas directas | — | no existen | — |
| `burnViewOnce` | servidor | no se condiciona | igual: no es escritura de B hacia A |

## 6 · La propuesta de reglas (revisada, NO aplicada)

Texto exacto en `ops/propuestas/weetalk-bloqueo/`:

- **`conversaciones.rules`:** el bloque `match /conversations/{conversationId}` entero.
  - Añade `bloqueado(de, para)`, que hace `exists(weetalkBloqueosPorPar/{de}~{para})`.
  - Lo exige en tres sitios: al crear la conversación, al actualizarla (`cambioPermitidoConBloqueo`) y al crear un mensaje. No cambia quién lee.
  - La lógica sirve igual con el bloqueo de cuenta, porque el índice ya trae los ocho pares. En la revisión del 2026-11-07 solo cambiaron sus comentarios.
- **`avisos.rules` (nuevo):** el bloque `match /notifications/{notificationId}` de W0 con una función y una condición más (`avisoDeEContactBloqueado`).
  - Los avisos `econtact_request` y `econtact_accepted` no se crean entre cuentas con un bloqueo.
  - Para `like` y `comment` no se lee nada más: el `&&` corta antes del `exists()`.
  - La suite comprueba que, quitando eso, el bloque es el de W0 byte a byte.
- **`componer.mjs`:** sustituye los dos bloques sin tocar `firestore.rules`.
  - Se niega si cualquiera de los dos ya no es el de W0. Huellas: conversaciones `5d7f5c9a…` y avisos `51f8003e…`.
  - Fuera de esos dos bloques, el resultado es idéntico byte a byte.
- **Coste:** una lectura `exists()` más por escritura en conversaciones, mensajes y avisos de ËContact.
- **Revisión de la propuesta (2026-11-07):**
  - marcar como leído sigue funcionando en una conversación congelada, porque la app solo toca `lastMessage.read`, y la presencia solo `activeInChat`;
  - no hay forma de abrir una conversación con otra cara de la cuenta bloqueada, porque el índice ya las trae todas;
  - las conversaciones son siempre de dos;
  - los avisos eran la vía que faltaba.
- **Pruebas:** `reglas.prueba.mjs`, 44 comprobaciones. Cubren mensajes, conversaciones nuevas, conversación congelada, lecturas, colecciones cerradas, avisos de ËContact, desbloqueo y un sabotaje con las reglas de hoy.
  - Están fuera de la CI a propósito, porque contra las reglas de hoy fallarían.
  - Se lanzan con `node ops/propuestas/weetalk-bloqueo/correr-reglas.mjs`, en un emulador aislado (`demo-wee-bloqueo` y puertos propios).
  - **Ejecutadas el 2026-11-07: 44/44.** Se usó la misma configuración del corredor (solo Firestore, `demo-wee-bloqueo`, 127.0.0.1:38080, Java 21, entorno sin credenciales). La única diferencia: el heap de Java se limitó a 384 MB en lugar de exigir 1,5 GB libres, porque había 0,85 GB.
- **Regresión de otras funciones:** en la misma sesión del emulador, tres suites existentes que ejercen conversaciones, mensajes, avisos y comunidades, cada una con las reglas de hoy y con las compuestas. Mismo resultado con las dos:
  - `integridad-11x4a`: 119/119;
  - `fronteras-rules`: 77/77;
  - `comunidades-identidad`: 76/76.
- **Análisis mecánico de permisos:** sin comentarios y con espacios normalizados.
  - De las 12 sentencias `allow` de los dos bloques, 9 son idénticas y 3 más estrictas, «la de hoy && …» (crear y actualizar conversación, crear mensaje), más la de crear un aviso. **Ninguna se afloja.**
  - Ninguna función existente cambia.
  - Las únicas lecturas nuevas de documentos son `exists()` sobre `weetalkBloqueosPorPar`.
  - Fuera de los dos bloques, `firestore.rules` queda idéntico byte a byte.

Orden seguro: callables y push → interfaz → reglas. En cualquier orden no rompe nada: sin documentos en el índice, las reglas propuestas permiten lo mismo que hoy.

## 7 · Contratos

| Callable | Entrada | Salida | Errores (`details.motivo`) |
|---|---|---|---|
| `blockWeeTalkContact` | `{ asIdentity, targetIdentity }` | `{ identidad, bloqueado: true, yaEstaba }` | `identidad-invalida`, `identidad-desconocida`, `identidad-ajena`, `misma-persona`, `demasiados` |
| `unblockWeeTalkContact` | `{ targetIdentity }` | `{ identidad, bloqueado: false, estaba }` | `identidad-invalida` |
| `listWeeTalkBlocks` | `{}` | `{ bloqueados: [{ identidad, desdeIdentidades, desde }] }` | — |
| `requestEContact` / `acceptEContact` (existentes) | sin cambio | sin cambio | además, `relacion-invalida` si hay un bloqueo entre las cuentas |

Las tres callables nuevas tienen dos barreras: sin sesión dan `unauthenticated`, y con la sesión de invitado dan `ACCOUNT_REQUIRED`. Son idempotentes. La respuesta de bloquear **no dice cuántas solicitudes anuló**, porque lo delataría. Siguen en `no_se_despliegan`.

## 8 · Privacidad y consecuencias de seguridad

- **Nada revela una identidad alternativa de forma explícita.**
  - Ninguna respuesta lleva la cuenta de nadie, y la lista solo enseña la cara que se bloqueó.
  - Si A bloquea dos caras que resultan ser de la misma persona, salen como dos filas, y la segunda responde «no estaba».
  - B no tiene lista, ni aviso, ni callable que le diga que está bloqueada.
  - Los errores son los genéricos de siempre: `weetalk.sendFailed` y la `relacion-invalida` de ËContact.
- **Inferencia residual: las decisiones 3 y 4 la hacen inevitable, en tensión con la 8.** Quien PRUEBE a escribir o a pedir ËContact a perfiles sueltos verá que con uno no puede. Así podría deducir que ese perfil es de la cuenta con la que hay un bloqueo, y vale en los dos sentidos.
  - Las respuestas no lo dicen: son el mismo error genérico que por cualquier otra causa, sin códigos propios ni recuentos. Lo que delata es el fallo en sí.
  - Eliminarlo del todo exige que el intento bloqueado parezca un éxito. Eso solo es posible con mensajería mediada por el servidor (hoy el cliente escribe directo en Firestore) y solicitudes «fantasma» visibles solo para quien las envía, con cambios de reglas y de cliente. Es una decisión de arquitectura, no hecha.
  - Mitigaciones: el error genérico, que el índice no es legible y que no hay avisos.
  - Mejora posible, no hecha: limitar los intentos fallidos de abrir conversaciones o pedir ËContact.
- **Cancelar solicitudes al bloquear.** La otra persona puede ver desaparecer una solicitud pendiente, igual que cuando alguien la rechaza o la cancela. Si lo relaciona en el tiempo con otras señales, es una pista débil.
- **Eliminar conexiones aceptadas al bloquear (decisión 6): la pista más fuerte.** Una conexión que desaparece se ve igual que un «eliminar» corriente.
  - Pero si B estaba conectada a dos caras de A, las dos desaparecen a la vez, y B puede deducir que son la misma persona.
  - Lo mismo al revés: A ve desaparecer su conexión con la otra cara de B.
  - Choca con la decisión 8. No hay forma de cumplir la 6 sin ese efecto. Se aplica tal como decidió el dueño, y queda escrito para su revisión.
  - Mitigaciones posibles, no hechas porque cambian la decisión:
    - borrar solo las conexiones de las caras que se ven en el bloqueo;
    - escalonar el borrado en el tiempo (débil).
- **Desbloquear una de dos filas de la misma persona** no abre a esa persona: la relación de cuenta sigue mientras le quede una entrada. Quien bloqueó ya había identificado las dos caras.
- **Hasta aplicar las reglas,** un cliente modificado puede guardar mensajes y avisos de ËContact, aunque no suenen. Está documentado como pendiente (§ 10).
- **Sin inspección.** La lógica del bloqueo no lee mensajes, ni `lastMessage`, ni avisos. ËContact solo lee el documento del índice.
- **Sin moderación.** No escribe reportes, ni casos, ni sanciones, ni avisos, y no toca el Moderation Core.
- **Riesgo residual ajeno (F-06, D3):** el identificador heredado de una cara Weë contiene el `uid` de su cuenta. El bloqueo no añade ninguna vía nueva y seguirá funcionando con identificadores opacos.

## 9 · Cambios de la revisión del 2026-11-07

| Archivo | Cambio |
|---|---|
| `functions/src/social/weetalkBloqueos.ts` | Regla de cuenta en los dos sentidos; índice de ocho pares; anulación de solicitudes pendientes de ËContact al bloquear; `esAvisoDeEContact`; comentarios con las decisiones definitivas. |
| `functions/src/social/bloqueosIndice.ts` (nuevo) | Nombre y clave del índice, compartidos con ËContact sin importación circular. |
| `functions/src/social/econtact.ts` | `decidirSolicitud` y `decidirAceptacion` aceptan `bloqueo`; las dos transacciones leen el índice. Sin transacciones nuevas. |
| `functions/src/index.ts` | `sendPushNotification` no envía los avisos de ËContact entre cuentas con un bloqueo. |
| `ops/propuestas/weetalk-bloqueo/*` | Escenario de ocho pares; comentarios de `conversaciones.rules`; `avisos.rules` nuevo; `componer.mjs` con dos bloques; `reglas.prueba.mjs` con 44 comprobaciones. |
| `functions/test/weetalk-bloqueo.test.mjs` | Especificación nueva, sección J de ËContact, cableado del push de avisos y sabotajes de la regla anterior y de la de un solo sentido. |
| **Segunda ronda:** `functions/src/social/weetalkBloqueos.ts` | El bloqueo borra también las conexiones aceptadas (`ESTADOS_QUE_BORRA_EL_BLOQUEO = ['pending', 'accepted']`, `esRelacionDeEContactEntre`). Comentarios con la segunda ronda y el alcance. |
| **Segunda ronda:** `functions/test/weetalk-bloqueo.test.mjs` | Se elimina la conexión aceptada entre las cuentas, no se toca la de una tercera persona, desbloquear no restaura nada, aceptar sin una solicitud nueva da `sin-relacion` y reconectar exige solicitud y aceptación. El código no toca colecciones sociales. |

## 10 · Pendientes que necesitan autorización o decisión

1. **Aplicar la propuesta de reglas** en `firestore.rules`. Toca bloques que W0 fija, así que necesita autorización.
   - Las 44 pruebas, la regresión de tres suites y el análisis de permisos ya están hechos (§ 6).
   - No se aplica ni se despliega sin autorización expresa.
2. **Desplegar** las tres callables y las versiones de `requestEContact`, `acceptEContact`, `sendPushNotification` y `sendMessagePushNotification` con el bloqueo, después de integrar W0.
3. **Interfaz:** «Bloquear», «Bloqueados» en Configuración y el aviso a quien bloqueó. No está hecha. Exige claves en los 42 diccionarios y la puerta visual.
4. **Decidido en la segunda ronda:**
   - «Me gusta», comentarios y publicaciones quedan fuera (decisión 9).
   - Las conexiones aceptadas se eliminan (decisión 6).

   **Sigue sin decidir, y no se ha hecho:** limitar los intentos fallidos para reducir la inferencia de § 8.
5. **Cercas de gobierno de W0** que esta rama no puede pasar sin tu autorización. Ya fallaban con el commit original del agente:
   - **`music` H2:** después de `eb588b15` no admite cambios de servidor fuera de `functions/src/music`.
   - **`puente-pre-f1d` 37:** fija la lista exacta de archivos de código tocados.

   Admitir una funcionalidad de servidor nueva sobre W0 exige ampliar esas listas, o acotar las cercas a su línea. Es una decisión de gobierno, no se toca para conseguir un verde.

   La investigación de cómo acotar `music` H2 sin perder detección, y el cambio exacto que necesitaría `puente-pre-f1d` 37, están en el informe del 2026-11-07. Esperan autorización.

## 11 · Pruebas (cifras reales, 2026-11-07)

- **`weetalk-bloqueo`:** 115/115 tras la segunda ronda (111/111 en la primera). Cubre:
  - la regla contra la especificación, y su equivalencia con el índice en 2048 casos;
  - el motor real sobre una Firestore en memoria;
  - privacidad, no inspección y cableado;
  - la propuesta, con sus dos bloques;
  - sabotajes y ËContact con el motor real de `econtact`.
- **Sabotajes sobre el compilado y el fuente:** los cinco se detectan.
  - pedir ËContact con un bloqueo;
  - no borrar nada de ËContact;
  - borrar solo las pendientes, no las conexiones aceptadas;
  - una regla de un solo sentido;
  - el push de avisos sin mirar el bloqueo.
- **Suites existentes, una a una:**
  - en verde: `econtact` 507, `composer-ubicacion-econtact` 114, `avisos-cupo` 11, `seguridad-11x4a` 63, `runtime-map` 163, `productions-runtime` 154, `despliegue-workflow` 76, `capacidades-conservadas` 17, `i18n-marcas-de-mensaje` 21, `logs-sin-secretos` 18, `max-instancias` 8, `app-check` 9, `i18n-servidor-fuentes` 23, `ci-workflow` 41, `weetalk-view-once` 59, `cuenta-identidad` 95, `correlacion-logs` 24, `rotacion-secretos` 22, `identidad-social` 41, `privacidad-identidad` 38, `security` 70, `moderation` 158, `tsconfig-alcance` 14, `produccion-mapa` 21, `cierre-servidor` 57, `comunidades-identidad` 35, `perfil-publico` 39, `users-fases` 44, `integracion-preparada` 13, `guardian-autocorreccion` 69, `guardian-dominios` 84, `guardian-aserciones` 58, `identidad-sin-biz` 42, `escaneo-secretos` 31, `video-asincrono` 64 y `gran-motor-e-assets` 74;
  - **en rojo:** `music` (H2) y `puente-pre-f1d` (37), por las cercas de § 10.5. En W0 limpio pasan.
- **Tipos:**
  - `guardian-lib-real` (13/13) compila las 297 fuentes de `functions` con el `tsc` real, sin errores;
  - además, una comprobación acotada de los módulos tocados y de un extracto del push: 958 archivos, 0 errores;
  - en la app, el único archivo de la rama es `services/weetalkBloqueosService.ts`, del commit del agente y sin cambios en esta revisión. Comprobado con la configuración de la app, acotado a él: 392 archivos, 0 errores. El `tsc` completo de la app lo ejecuta el Nivel 1 de la CI.
- **Emulador aislado:** las 44 pruebas de la propuesta (44/44) y la regresión de tres suites con las reglas de hoy y las compuestas (§ 6).
- **Cadena completa:** la ejecuta la CI de la PR. En la primera ronda dio 384/386, y las dos rojas son las cercas de § 10.5.
