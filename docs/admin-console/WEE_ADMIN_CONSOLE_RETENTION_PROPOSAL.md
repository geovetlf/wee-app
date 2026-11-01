# Weë Admin Console — propuesta de retención y copia de `adminAudit`

> **Solo es una propuesta.** No se ha cambiado `functions/src/core/backup.ts`, ni se ha ejecutado ninguna eliminación, ni hay ninguna política activa. Las cifras son la propuesta técnica; los plazos con efecto legal los tiene que confirmar quien asesore a Weë en protección de datos.

## 1. Situación hoy

| Punto | Hecho | Consecuencia |
|---|---|---|
| Clasificación | `adminAudit` no está en `CLASIFICACION_DE_DATOS` (`core/backup.ts`) | Para el contrato de copias es una colección sin clasificar: nadie ha decidido cuánto duele perderla |
| Copia | La copia diaria de Firestore cubre la base entera y se conserva 30 días; su primera ejecución y `databases:restore` siguen sin verificar (`docs/BACKUP.md`) | Un registro borrado hoy deja de existir en cualquier copia a los 30 días |
| Quién puede tocarla | Las reglas la cierran a todos los **clientes**, también al owner. El Admin SDK y la consola de Google se saltan las reglas | Quien tenga un rol de IAM con escritura en Firestore puede editarla o borrarla sin dejar rastro en ella misma |
| Retención | No hay ninguna; crece sin límite | Coste y datos personales acumulados sin decisión |
| Volumen | Una entrada por lectura de personas y por rechazo, dos por escritura. Sin datos reales: no está desplegada | El coste se mide al desplegar, no antes |

## 2. Qué se conserva, cuánto y por qué

| Entradas | Cómo se reconocen | Plazo propuesto | Por qué |
|---|---|---|---|
| Dinero | `grantCredits`, `refundCredits`, `spendCredits`, `creditsAdmin.setCost` | Igual que el libro de Credits; mínimo 5 años, a confirmar | Explican un movimiento del libro, que no caduca; sin esto un saldo no se puede justificar |
| Privilegios | `admin.asignarRol`, `admin.retirarRol` | 5 años, a confirmar | Quién tuvo poder y cuándo: es lo primero que se pregunta en un incidente |
| Configuración y moderación | `engineAdmin.set*`, `seedDefaults`, `resetHealth`, `moderationAdmin.review`, `evalRun`, `mediaCanary.*` | 2 años | Explican cambios de comportamiento y decisiones sobre personas |
| Lecturas de personas | `resultado: ok` en `accountsAdmin.buscar`, `creditsAdmin.balance`, `userHistory`, `moderationAdmin.history`, `opsAdmin.*` | 13 meses | Detectar accesos indebidos, cubriendo un ciclo anual; es el tipo con más datos personales y menos valor pasado ese plazo |
| Rechazos | `resultado: denegado` | 13 meses | Señal de intentos; poco valor después |
| Intentos sin cierre | `resultado: intento` sin `ok` ni `error` con su `correlationId` | **Nunca caducan solos**: primero se concilian, y después siguen el plazo de su tipo | Son justo lo que falta por explicar |

Regla al caducar: se borra la entrada entera, no se anonimiza a medias. Un agregado por mes y acción puede sobrevivir, sin identificadores.

## 3. Campos que necesitan protección

| Campo | Riesgo | Tratamiento propuesto |
|---|---|---|
| `recurso.id` | uid o número de cuenta de una persona: es quién fue mirada | Se conserva, porque es el motivo del registro. Nunca se copia a registros de texto ni a analítica; se borra al caducar |
| `actorUid` | Identifica a una persona del personal | Igual |
| `motivo` | Texto libre de quien actúa: podría llevar datos de terceros | Ya saneado y recortado a 200 caracteres. Instrucción al personal: no escribir datos de personas. Las revisiones de moderación NO lo copian |
| `metadatos` | Solo valores simples, sin claves que parezcan credenciales | Ya aplicado (`metadatosSeguros`). `requestId` se conserva: es la llave de conciliación |
| Nunca presentes | Prompts, tokens, secretos, contenido, correos, configuración entera, permisos de subida | Fijado por `admin-seguridad` B4 y B13 y `admin-lecturas` C6 |

## 4. Copia y restauración

1. **Clasificarla como CRITICAL** en `core/backup.ts`, junto a `reports/{id}/history`: es auditoría y no se reconstruye. Toca un contrato vigilado: es una decisión aparte.
2. **Los 30 días no bastan** para los plazos de §2. Propuesta: exportación diaria solo de `adminAudit` a un cubo **de otro proyecto**, con retención bloqueada (Bucket Lock) al plazo más largo. Así, ni quien administra `get-wee` puede alterar lo ya exportado.
3. **Restaurar nunca es sobrescribir**: una base restaurada a ayer perdería las entradas de hoy, justo las de un incidente. Se restaura a una base aparte, se compara y se **añaden** solo las que falten, con su identificador de documento.
4. **Verificación**: cada restauración cuenta las entradas por día contra la exportación. Hasta probarlo de punta a punta, esto no se puede dar por bueno (como dice `docs/BACKUP.md` de la copia diaria).
5. La caducidad, si se usa TTL de Firestore, se aplica por un campo `caducaEn` escrito al crear. TTL borra sin dejar rastro: el recuento de lo borrado debe quedar fuera. **No hay TTL ni `caducaEn` hoy.**

## 5. Riesgos si una cuenta con permisos externos modifica o borra datos

| Quién | Qué puede hacer hoy | Se detectaría | Propuesta |
|---|---|---|---|
| IAM con escritura en Firestore (`datastore.user`, `owner`, `editor`) | Editar o borrar entradas; también el libro de Credits | Solo si están activos los registros de acceso a datos de Cloud Audit Logs (a comprobar; no verificable desde aquí) | Reducir quién tiene estos roles; activar esos registros y exportarlos al proyecto aparte |
| Cuenta de servicio de las Functions | Lo mismo por Admin SDK: es la que escribe la auditoría | Igual | No darle acceso al cubo de exportación, salvo para añadir |
| IAM sobre Auth | Poner `admin` o `weeRole` a cualquiera sin pasar por `ops/admin` | La auditoría no lo ve: el cambio no pasa por Weë | Comparar periódicamente los claims del personal con `adminAudit`; alertas sobre `SetAccountInfo` en Cloud Audit Logs |
| Quien cambia `WEE_ADMIN_UIDS` | Convertir un uid en administración con un despliegue | Por el historial de despliegues | Vaciarla cuando exista el `owner`; `WEE_ADMIN_SIN_ROL=cerrado` |
| Quien administra el cubo de copias | Borrar la copia | Solo por sus registros | Otro proyecto y otra persona; Bucket Lock |

Una defensa adicional, no propuesta ahora por su coste: encadenar cada entrada con el hash de la anterior para que un borrado se note. Exige un único escritor o una transacción por entrada, y haría más lenta cada llamada.

## 6. Recomendación, revisada

**Dos registros distintos, y no se sustituyen.**

| | `adminAudit` (de Weë) | Cloud Audit Logs (de Google) |
|---|---|---|
| Qué ve | Lo que pasa **por la puerta**: actor autenticado, operación, recurso, desenlace | Lo que pasa **por la infraestructura**: Admin SDK, consola de Google, IAM, despliegues, cambios de claims |
| Qué no ve | Un script con credenciales, un cambio de claim a mano, un borrado del propio registro | A quién miró una persona dentro de una operación de Weë, ni por qué |
| Quién puede alterarlo | Quien tenga IAM de escritura en Firestore | Mucho más difícil: es de Google, con retención propia |
| Actor de `ops/admin/` | Un texto que declara quien ejecuta | La identidad real |

**Recomendación, en orden:**

1. **Acceso:** mantener las reglas cerradas y leer solo por `opsAdmin.auditoria` (`audit.read`, hoy solo `owner`). Antes que ninguna otra cosa, revisar quién tiene IAM de escritura en `get-wee`.
2. **Protección:** activar los registros de acceso a datos y de escritura de Auth y Firestore en Cloud Audit Logs. Es lo único que detecta un cambio hecho por fuera, y lo que da valor a `movimiento-sin-constancia`.
3. **Copia:** clasificar `adminAudit` como CRITICAL en `core/backup.ts` y exportarla a un cubo de otro proyecto con retención bloqueada. La copia diaria de 30 días no cubre estos plazos.
4. **Restauración:** probarla en un proyecto `demo` o aparte **antes** de confiar en ella, añadiendo sin sobrescribir (§4). La de la copia diaria sigue sin verificar.
5. **Retención:** no borrar nada todavía. Sin volumen real ni asesoría, borrar es irreversible y esperar no cuesta. Decidir los plazos de §2 cuando haya tres meses de medidas.

**No se ha aplicado ninguna de estas.** Ningún cambio en `core/backup.ts` ni ninguna política de eliminación hasta tener esas pruebas de restauración.

## 7. Decisiones que quedan para la persona dueña

1. Plazos de §2, con asesoría de protección de datos.
2. Clasificar `adminAudit` en `core/backup.ts`.
3. Proyecto aparte y cubo con retención bloqueada, que tiene coste.
4. Revisión de quién tiene IAM de escritura en `get-wee`, y activación de los registros de acceso a datos.
