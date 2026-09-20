# BACKUP & RECOVERY — qué se puede recuperar de Weë, y qué no

> F12-C · Contrato `1.0`. Medido contra producción el 2026-09-20.
> Contrato: `functions/src/core/backup.ts` · Herramienta: `scripts/copias.mjs`
> Lo vigila `functions/test/backup.test.mjs` (en `npm test`).

**Una copia que nunca se ha restaurado no es una estrategia de recuperación. Es un
archivo.** Este documento no cuenta lo que Weë podría respaldar: cuenta lo que se
exportó, se restauró y se verificó, y dice con la misma claridad lo que todavía
no se puede recuperar.

---

## 1. Lo que había antes de esta fase

Comprobado contra las APIs, no contra la documentación:

| | |
|---|---|
| Copias programadas | **0** |
| Copias existentes | **0** |
| Exportaciones en toda la historia del proyecto | **0** (las únicas operaciones de la base eran construcciones de índice) |
| PITR (recuperación a un punto en el tiempo) | **DESACTIVADO** |
| Protección contra borrado de la base | **DESACTIVADA** |
| Cubo de copias | no existía |

Es decir: **Weë no tenía ninguna copia de seguridad de ninguna clase**. Un borrado
accidental de la base de producción era definitivo.

## 2. Arquitectura

```
PRODUCCIÓN                    COPIA                         RESTAURACIÓN AISLADA
get-wee/(default)  ──export──▶ gs://wee-backups-…/firestore ──import──▶ wee-dev-geovet/recovery-test
     │                              (30 días, versionado)                        │
     └──────────── huella ──────────────── comparar ────────────────── huella ───┘
```

- **Mecanismo**: exportación e importación gestionadas de Firestore
  (`:exportDocuments` / `:importDocuments`). Son las capacidades nativas; no se
  introdujo ninguna pieza de infraestructura nueva.
- **La verdad es la base de datos.** La copia es una copia, y no se lee jamás
  como si fuera la fuente.
- **El contrato es puro.** `core/backup.ts` no sabe de cubos, ni de proyectos, ni
  de regiones: clasifica, calcula huellas, compara y verifica relaciones. La
  herramienta es la que habla con Google, y es reemplazable.

### Destino de la copia

| | |
|---|---|
| Cubo | `wee-backups-546769059837` |
| Región | `US` multirregión — la misma que `nam5`, donde está la base |
| Clase | STANDARD |
| Versionado | **sí** (un objeto sobrescrito o borrado se puede recuperar) |
| Acceso público | **bloqueado** (`publicAccessPrevention: enforced`) |
| Acceso uniforme | sí — sin listas de control por objeto |
| Cifrado | claves gestionadas por Google. **Decisión:** no se usó CMEK a propósito: una clave propia añade un modo de fallo —perder la clave es perder la copia— que a esta escala no compensa |
| Retención | **30 días**, por regla de ciclo de vida; las versiones no vigentes, 7 días |
| Separación | cubo dedicado, distinto del de la aplicación |

### Permisos

| Quién | Qué | Dónde |
|---|---|---|
| `geovetlf@gmail.com` | `roles/owner` | proyecto |
| Agente de Firestore de `get-wee` | escribe la exportación | heredado del proyecto |
| Agente de Firestore de `wee-dev-geovet` | `roles/storage.objectViewer` + `roles/storage.legacyBucketReader` | **solo este cubo**, solo lectura |

El proyecto de restauración puede **leer** la copia y nada más. No puede escribir
en ella ni tocar nada de producción.

## 3. Clasificación de los datos

Las 58 colecciones que Weë conoce están clasificadas en `core/backup.ts`,
incluidas las que hoy tienen cero documentos. **Una colección sin clasificar es un
fallo**, no un «seguramente es derivado»: así nadie puede añadir una colección y
dejarla fuera de la copia sin enterarse.

- **CRITICAL** — identidad (`accounts`, `accountNumbers`, `members`, `entities`,
  `users`), dinero (`creditTransactions`, `creditStats`, `aiGenerations`, los
  libros de pagos y devoluciones), propiedad y contenido (`posts`, `assets`,
  `creatorProjects`) y moderación (`reports` y su historial).
- **IMPORTANT** — lo que la gente hizo: comentarios, votos, comunidades,
  conversaciones de WeeTalk, trabajos de Weë AI, avisos, configuración del motor.
- **DERIVED** — y cada uno dice **desde qué** se reconstruye: `aiUsage` y
  `creatorUsage` desde `aiGenerations`, `brainUsage` desde los mensajes de Brain,
  `pushTokens` desde el propio aparato al arrancar. Si no se sabe decir desde qué,
  no es derivado.

## 4. Los bytes no están donde están los datos

**Una URL no es una copia.** Guardar `https://…/foto.jpg` respalda la dirección de
la foto, no la foto.

| Dónde | Qué hay | Recuperable |
|---|---|---|
| `get-wee.firebasestorage.app` | **0 objetos** — el Storage de la app está vacío | RECOVERABLE (no hay nada que recuperar) |
| `res.cloudinary.com` | **18 referencias**: 12 en publicaciones, 4 en perfiles, 2 en mensajes. Aquí están los archivos reales de la gente | **PARTIALLY RECOVERABLE** |
| `api.dicebear.com` | 13 avatares generados | RECOVERABLE — deterministas desde la semilla que va en la URL |
| `lh3.googleusercontent.com` | 16 fotos de cuentas de Google | **NOT CURRENTLY RECOVERABLE** — no son de Weë |
| `images.unsplash.com` | 4 imágenes de datos de ejemplo | NOT CURRENTLY RECOVERABLE |

**El hueco de Cloudinary, dicho sin adornos.** Weë sube con un *preset sin firmar*
y no tiene credencial de administración de Cloudinary en ninguna parte del
código. Consecuencias: no podemos enumerar qué hay allí, no podemos copiarlo
entero, y no podemos volver a subirlo conservando el identificador. Los bytes se
pueden descargar uno a uno por su URL pública mientras Cloudinary los sirva. Si
Cloudinary perdiera el contenido, la copia de Firestore restauraría enlaces rotos
— **y lo haría con toda la apariencia de haber funcionado**.

## 5. Auth: el hueco más importante

**La exportación de Firestore NO incluye Firebase Auth.** Producción tiene 10
usuarios (6 con correo, 3 con contraseña, 3 con Google).

Una cuenta Weë se identifica por el uid de Auth de quien la fundó
(`accounts/{uid}`, `foundingPrincipalId`). Si se perdiera Auth y se restaurara
solo Firestore, **las cuentas existirían y nadie podría entrar en ellas**: los
datos estarían completos y serían inaccesibles.

No se implementó una copia de Auth en esta fase, y es una decisión deliberada:
hacerlo obliga a escribir en algún sitio los hashes de contraseña, y eso es una
decisión de seguridad que no me corresponde tomar solo. Está en § 12 como el
siguiente paso.

## 6. Prueba de restauración — hecha, no descrita

Entorno aislado: **una base con nombre** (`recovery-test`) en **otro proyecto**
(`wee-dev-geovet`). Dos capas de separación, y una tercera que importa: todos los
disparadores de Firestore de Weë escuchan sobre `(default)`, así que una base con
nombre es un sitio al que **ningún disparador puede llegar**.

| Paso | Medido |
|---|---|
| Huella de producción | 229 documentos, 28 colecciones · `3221c0d0a045ada7…` |
| Exportación | **63 s**, 229 documentos, 133,6 KB en 4 objetos |
| Creación de la base aislada | ~15 s |
| Importación | **13 s**, 229 documentos |
| Huella de la copia restaurada | 229 documentos, 28 colecciones · **`3221c0d0a045ada7…`** |

**La huella global de la copia restaurada es idéntica a la de producción.**

Verificación completa: **18 de 18**.

- Integridad: mismas colecciones, mismos documentos, y **cada documento es el
  mismo por su huella**.
- Identidad: 8 cuentas, 8 números, 12 entidades, 8 membresías, 16 perfiles. Los
  **mismos** números de cuenta —ninguno se regeneró—, los mismos identificadores
  de entidad, con su tipo y su secuencia guardados. Restaurar **no** ejecuta la
  lógica de nacimiento de cuentas: importa documentos.
- Dinero: 13 movimientos, circulante **1191**, suma de saldos **951**, y saldo por
  saldo, no solo la suma.
- Relaciones: las mismas que el original, rotas incluidas (§ 8).
- Efectos laterales: **ni un documento** apareció que la copia no trajera, y nada
  en `users`, `notifications` ni los mensajes, que son las tres colecciones con
  disparador en producción.

### Pruebas de corrupción

En la copia aislada, cuatro daños a la vez: un documento borrado, una relación
rota, un documento duplicado y un saldo alterado.

**El total siguió siendo 229 documentos** —uno menos y uno más— así que *contar
habría dicho «todo bien»*. La huella por documento localizó las cuatro:

```
✔ 2) mismos documentos: 229 — original 229 vs restaurado 229
✘ 3) y cada documento es EL MISMO, por su huella
      creditTransactions[faltan 1] · entities[cambian 1] · posts[sobran 1] · users[cambian 1]
```

Y con ellas: el libro bajó de 13 a 12, la suma de saldos subió de 951 a 952, y
apareció una segunda arista rota. **Detecta y no arregla nada en silencio**; la
herramienta termina con código de error.

### La limitación que encontró la prueba

Volver a importar la misma copia sobre la base ya corrompida **reparó todo lo que
la copia contenía** —el documento borrado volvió, el saldo volvió a 951, la
relación rota se arregló— **pero no borró el duplicado**: quedaron 230 documentos.

> **Una importación sobrescribe lo que trae y no borra lo que sobra.** Una
> recuperación real tiene que ir siempre a una base **vacía**. Restaurar sobre una
> base viva deja dentro todo lo creado después de la copia — que en un incidente
> del tipo «deshaz la última hora» es justo lo que hay que quitar.

## 7. RPO y RTO

Medidos, no prometidos.

| | |
|---|---|
| **RPO actual** | **NO ACOTADO.** No hay copia programada: el punto de recuperación es la última copia manual. Hoy sólo existe la del 2026-09-20. Con la copia diaria propuesta en § 12 sería ≤ 24 h; con PITR activado, ≤ 7 días de recuperación continua |
| **RTO de los datos de Firestore** | **~1,5 min** medido a esta escala (13 s de importación + ~15 s de crear la base + margen). Con verificación completa, ~3,5 min |
| **RTO del servicio completo** | **NO MEDIDO TODAVÍA**, y hoy no se puede: falta la recuperación de Auth (§ 5) y apuntar la aplicación a la base restaurada. Sin Auth, el servicio no vuelve aunque los datos estén |

El verificador tarda ~110 s porque lee la base entera desde el cliente. A esta
escala da igual; a 10M documentos no sirve, y la salida es verificar contra los
propios archivos de la exportación o por muestreo estratificado. Está en § 12.

## 8. Salud de producción: un huérfano, conocido

La verificación encontró **una arista rota en producción**, no causada por la
copia:

```
creditTransactions/grant_welcome_HFAigQQEw6gImqUn26wut3JTja13 · userId → users
```

Es un `grant` de 240 Credits del 2026-09-19 cuyo usuario de Auth, cuenta y perfil
se borraron al limpiar la cuenta de prueba de la Fase 11.x-6. El libro de Credits
es de **solo añadir** por diseño, así que el apunte se quedó. Es la residual
conocida y **no se corrige**: compensarla o borrarla sería exactamente lo que el
Financial Core prohíbe.

La copia lo preservó tal cual, y eso es lo correcto: **una copia conserva la
realidad, no la mejora.** Por eso el verificador separa dos cosas que suelen
confundirse — «¿la copia es fiel?» (decide) y «¿producción está sana?» (informa).

## 9. Qué se hace con los trabajos y los eventos al restaurar

**Restaurar no es volver a ejecutar.** Un trabajo restaurado no puede salir otra
vez hacia un proveedor, un aviso restaurado no puede volver a sonar y un
movimiento de Credits restaurado no puede volver a cobrarse.

`seguridadDeRestauracion(job)` clasifica cada trabajo:

| Estado | Qué se puede hacer |
|---|---|
| `completed`, `failed`, `cancelled`, `timed_out`, `done` | **SAFE_TO_RESTORE** — se restaura y no se toca |
| `queued`, `planned`, `asking` | **SAFE_TO_RESTORE** — nunca salió; se puede volver a encolar |
| `running`, `waiting`, `cancel_requested` | **NEEDS_RECONCILIATION** — hay que preguntar al proveedor, no relanzar |
| cualquiera con `salioSinRespuesta` | **NOT_REPLAYABLE** — salió y no se sabe cómo acabó. Repetirlo puede pagar dos veces |
| un estado desconocido | NEEDS_RECONCILIATION — nunca se da por seguro |

Los eventos históricos (`events`, `outbox`) se conservan como **historial**. No se
reenvían. Weë no emite eventos todavía, y una restauración no es el sitio para
empezar.

## 10. Seguridad

- La herramienta **no puede** restaurar sobre producción: `get-wee` está en una
  lista de destinos prohibidos, la base `(default)` de cualquier proyecto está
  vetada, y hace falta `--confirmo-aislado`. Son tres candados, y están probados.
- Ninguna orden escribe en producción. `huella` solo lee.
- El cubo no es público y el proyecto de restauración solo puede leerlo.
- El informe imprime **rutas y nombres de campo, nunca valores**: una arista rota
  se dice «`entities/ent_x.ownerAccountId` apunta a algo que no está», sin el
  valor. `CAMPOS_QUE_NO_SE_IMPRIMEN` cubre contraseñas, claves, tokens, correos y
  teléfonos.
- Las huellas son hashes: identifican un documento sin revelar su contenido.
- Lo que baja a la máquina local son **huellas**, no datos. Los únicos datos de
  producción que salieron del proyecto fueron los de la restauración aislada, y
  esa base **se borró al terminar** (§ 11).

## 11. Qué quedó y qué se borró

| | |
|---|---|
| Producción | **intacta**: 229 documentos, misma huella antes y después, ningún documento creado ni modificado |
| Copia en el cubo | 1, del 2026-09-20, 133,6 KB — se borra sola a los 30 días |
| Base de restauración | **borrada** al terminar la prueba. En `wee-dev-geovet` solo queda su `(default)` de siempre |
| Datos de producción fuera del proyecto | ninguno |

## 12. Lo que NO está hecho, y qué haría falta

Por orden de importancia:

1. **Copia de Auth.** Es el hueco que impide recuperar el servicio. Exportar los
   usuarios con sus hashes al mismo cubo, cifrado, y documentar el parámetro de
   hash del proyecto. Requiere una decisión de seguridad explícita.
2. **Copia programada.** Un horario diario con 30 días de retención lleva el RPO
   de «no acotado» a «≤ 24 h». Coste medido: **0,0001 $/mes** con 30 copias de
   este tamaño. Es una llamada a `backupSchedules.create`.
3. **PITR.** Da 7 días de recuperación continua y protege del borrado accidental
   entre copias. Es un cambio de configuración de la base.
4. **Protección de borrado de la base.** Hoy está **desactivada**: la base de
   producción se puede borrar. Activarla no cuesta nada.
5. **Bytes de Cloudinary.** Decidir entre credencial de administración para poder
   enumerarlos y copiarlos, o mover el material a un cubo propio.
6. **Verificación a escala.** Verificar contra los archivos de la exportación en
   vez de leyendo la base, o por muestreo.
7. **Ensayo periódico.** Una copia que no se restaura vuelve a ser un archivo. La
   prueba de § 6 debería repetirse cada cierto tiempo, no una vez.

## 13. Guía de operación

```bash
# Revisar o crear el cubo de copias
node scripts/copias.mjs cubo [--crear]

# Copia de producción (no toca ningún dato)
node scripts/copias.mjs exportar --etiqueta 2026-09-20

# Huella de producción, para poder comparar después (solo lectura)
node scripts/copias.mjs huella --salida huella-produccion.json

# Restaurar en una base AISLADA (nunca en producción; la crea si no existe)
node scripts/copias.mjs importar --proyecto wee-dev-geovet --db recovery-test --confirmo-aislado

# Huella de la copia restaurada y comparación
node scripts/copias.mjs huella --proyecto wee-dev-geovet --db recovery-test --salida huella-restaurada.json
node scripts/copias.mjs verificar --original huella-produccion.json --restaurada huella-restaurada.json

# Comprobar que la verificación DETECTA daños (solo sobre la base aislada)
node scripts/copias.mjs romper --proyecto wee-dev-geovet --db recovery-test --modo borrar-documento --confirmo-aislado

# Borrar la base de la prueba
node scripts/copias.mjs limpiar --proyecto wee-dev-geovet --db recovery-test --confirmo-aislado
```

**Reglas que no se saltan:**

1. Una recuperación real va **siempre a una base vacía** (§ 6).
2. Nunca se restaura sobre `(default)`, ni en producción ni fuera.
3. Si la verificación falla, **no se toca nada** hasta entender por qué. No se
   «arregla» un dato para que cuadre.
4. El Financial Core no se compensa, no se edita y no se corrige a mano. Nunca.
5. Una copia sin restaurar no cuenta como copia.
