# C-2 · La foto de vista única (`burnViewOnce`) y la excepción a MC-5

Estado: **excepción controlada, acotada por comprobaciones de uso, probada con dobles y con el emulador de Firestore.**
No desplegado. Ninguna prueba toca producción.

## Qué se decide

La foto de vista única se borra al abrirla, como exige el producto. Esa excepción a MC-5 se acepta **solo** si nadie más
usa el objeto. Si alguien lo usa, la ficha se quema igual, el objeto se conserva y queda anotado como pendiente. Un error
al comprobar protege: lo desconocido cuenta como uso.

## Hallazgo del cierre: el rango por prefijo estaba vacío

La comprobación de «otro mensaje con el mismo objeto y otro token» pedía `imageUrl >= base` y `imageUrl < base`. Esa cota
superior es igual a la inferior, así que el rango no contiene nada y nunca encuentra un token distinto. Las pruebas de
dobles pasaban igual, porque sustituyen la consulta por un booleano. Lo detectó la suite de emulador
(`functions/test/weetalk-foto-unica.emulator.mjs`, comprobación 3). La cota correcta es `base` + U+F8FF.

Corregido en `functions/src/social/weetalk.ts` (`usadoPorOtrosEn`). La comprobación 43 de la prueba de dobles fija la
presencia de U+F8FF, y el mutante del fallo original la hace caer (ver la tabla de sabotajes).

## Los siete requisitos, uno a uno

1. **Cómo se genera la clave.** `services/storageService.ts`, `uploadViewOncePhoto`, compone
   `users/<uid>/weetalk/<conversación>/<Date.now()>-<azar6>.<ext>`, con el `uid` de quien sube. Prueba:
   `almacen-reglas-sobrescritura.emulator.mjs`, comprobación I2.
2. **Unicidad e inmutabilidad.** `storage.rules` (bloque `users/{userId}/weetalk/…`) deja crear el objeto con
   `resource == null` y niega `update` y `delete` a los clientes. Una clave no se sobrescribe ni se borra desde la app.
   Prueba: `almacen-reglas-sobrescritura.emulator.mjs` (reglas).
3. **Que el solicitante está autorizado.** `burnViewOnce` pasa la sesión (`request.auth.uid`) a `quemar`, que exige, en
   este orden: que la conversación exista (`no_existe`), que el solicitante participe (`no_participas`), que el mensaje
   sea de vista única y de imagen (`no_es_unica`), y que el remitente no sea la misma cuenta (`es_tuya`). El remitente
   tiene que figurar en `participants`, y su cuenta se resuelve leyendo `users` con `cuentaDeIdentidad`. Pruebas de
   dobles: comprobaciones 2, 3, 5 y 6, y 40 (un remitente que no figura no autoriza nada).
4. **Que no hay referencias activas de otros consumidores.** `usadoPorOtrosEn` mira, antes de borrar:
   - el índice: un registro en `mediaObjects` con esa `objectKey`;
   - las fichas vivas con esa clave, de cualquier cuenta (`assets`, hasta 25; a partir de ahí protege);
   - los mensajes de la misma conversación que apunten al mismo objeto, con la misma dirección exacta o con otro token
     sobre la misma clave (rango por prefijo con U+F8FF sobre la dirección que fija `downloadUrlFor`, en `engine/http.ts`;
     su `?alt=media` impide confundir `foto.jpg` con `foto.jpg2`). WeeTalk no escribe la forma `/v0/b/`: la regla de la
     cadena de pruebas (urls-del-storage E8) lo prohíbe, y el constructor canónico la cumple.
   Pruebas de dobles: G1 (un uso protege; la consulta recibe clave, dirección, conversación y mensaje) y G2 (sin usos se
   borra). Pruebas de emulador: comprobaciones 1 a 9 de `weetalk-foto-unica.emulator.mjs`.
5. **Que el borrado no toca un objeto compartido.** Lo mismo que el punto 4, en la misma condición: `enSuSitio && !usado`
   (comprobación 42 de los dobles).
6. **Idempotencia y errores.** Una segunda apertura devuelve `ya_quemada` sin consultar ni borrar (comprobaciones 13 y 39,
   y G3). Un error al borrar deja la ficha quemada, el objeto pendiente y el mensaje anotado (comprobación 12). Un error al
   comprobar el uso protege (emulador, comprobación 10).
7. **La excepción no elude H5/H2.** El índice y las fichas vivas se miran antes del borrado (emulador, comprobaciones 6
   y 7). Sin esa comprobación, el remitente podría registrar su propia foto única como material (`crearMaterialDesdeUrl`
   acepta cualquier ruta de su cuenta) y la quema del destinatario borraría un objeto que una ficha viva usa.

## Pruebas

- `functions/test/weetalk-view-once.test.mjs`: 66 comprobaciones de dobles, incluidas la 43 (rango con U+F8FF) y G1 a G3.
- `functions/test/weetalk-foto-unica.emulator.mjs`: 10 comprobaciones contra Firestore del emulador. Se ejecuta con
  `node functions/test/_emuladores.mjs --solo weetalk-foto-unica`. Resultado en este cierre: pasa (el corredor sale con 0; la
  suite sale con 1 si cae cualquier comprobación).
- `functions/test/weetalk-grabacion.test.mjs`: sin cambios; sigue en verde.

## Sabotajes

Mutantes de `usadoPorOtrosEn` sobre el JS compilado, cada uno con una sustitución exacta, medidos con la suite de
emulador. El resultado de cada uno está en `scratchpad/cierre/` (`C2-sabotajes-emulador.json`).

| Mutante (sobre `functions/lib/social/weetalk.js`) | Qué rompe | Comprobaciones que caen |
|---|---|---|
| E0 · línea base | nada | ninguna (sale con 0) |
| E1 · cota del rango sin U+F8FF | el fallo original | 3 |
| E2 · sin `?alt=media` en `downloadUrlFor` (`engine/http.js`) | `foto.jpg` coincide con `foto.jpg2` | 4 |
| E3 · las fichas borradas cuentan | una ficha muerta protege | 8 |
| E4 · un error no protege | el fallo de la base de datos borra | 10 |
| E5 · el propio mensaje cuenta | la foto se protege a sí misma | 1, 4, 5, 8 |
| E6 · el índice (`mediaObjects`) se ignora | un objeto registrado se borra | 6 |
| E7 · sin el límite de 25 fichas | con muchas fichas no se protege | 9 |

Además, en la prueba de dobles, el mutante del fallo original (`${base}` sin U+F8FF en el fuente) hace caer la comprobación
43. El fuente se restaura byte a byte en todos los casos. Los dos barridos se hacen con `scratchpad/cierre/c2-sabotaje-estatico.mjs`
y `scratchpad/cierre/c2-sabotaje-emulador.mjs`.

## Lo que queda abierto (residuales)

- **R1 · Objetos retenidos sin clave (decisión del propietario).** Cuando la comprobación de uso protege, el mensaje queda
  con `pendingPhysicalDeletion: true`, pero la quema retira `imageUrl` y `fileUrl`. La clave del objeto no queda en ningún
  sitio, así que un barrido futuro no puede encontrarlo desde el mensaje. Hoy el objeto queda en el bucket, sin URL, con
  la ruta impredecible (marca de tiempo y azar). Es privado para los participantes, pero es contenido que la persona
  esperaba que desapareciera. Propuesta: guardar la clave en una colección solo de servidor (las reglas de Firestore
  niegan a los clientes lo que ninguna regla `allow` abre, y una colección nueva no tiene ninguna) y un barrido que vuelva a
  comprobar usos y borre cuando no quede ninguno. Eso introduce una
  colección nueva y su política de retención, así que lo decide el propietario.
- **R2 · Referencias desde otra conversación.** `usadoPorOtrosEn` solo mira la conversación del mensaje. Una referencia
  desde otra conversación exigiría una consulta de grupo de colección, con su índice, que no se despliega en esta fase.
  Efecto posible: una imagen rota en un mensaje de otra conversación, tras la quema. No borra nada de otra cuenta y no
  expone contenido nuevo. Fijado en la comprobación 5 del emulador como límite conocido.
- **R3 · Carrera.** La comprobación de uso y el borrado no son una transacción. Un material creado sobre la misma clave
  entre los dos pasos quedaría sin bytes. Requiere que el propio remitente cree un material desde su foto en esa ventana,
  así que el daño recae sobre su propio material.
- **R4 · Índices y emulador.** Las consultas son de un solo campo, que Firestore indexa solo. El emulador no aplica
  índices, así que esta suite no lo demuestra; la comprobación queda por la documentación de Firestore.
- **R5 · Cloudinary.** No aplica: el quemador solo borra objetos de Weë (`bucketDeWee`).
