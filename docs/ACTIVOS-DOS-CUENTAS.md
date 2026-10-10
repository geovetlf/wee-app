# Dos cuentas y una misma clave de Storage (A-2)

Estado: **invariante aplicado en código, probado con dobles, con dos huecos corregidos.** La concurrencia real con emulador
se prueba en `activos-concurrencia-*` (ver el apartado de límites). No desplegado.

## La pregunta

¿Puede una clave física del Storage de Weë estar referenciada por dos cuentas? No se presupone que no.

## Respuesta

**Para el Storage de Weë: no, por construcción, y por código en cada punto de creación.**

Una clave de Weë solo es de una cuenta si vive bajo `users/<cuenta>/` (`esDeLaCuenta`, prefijo entero). Cada punto que crea
una ficha, una versión, una variante o una fila lo comprueba:

| Punto | Comprobación | Prueba |
|---|---|---|
| `crearMaterialDesdeUrl` | `esDeLaCuenta(ref, owner)` o no se crea | activos-dos-cuentas I1 |
| `crearMaterialParaSubida` | `esDeLaCuenta` (Weë) y `claveEsDeLaCuenta` (`accounts/`) | I2 |
| `crearVersionDeMaterial` | `direccionDeLaCuenta` → `archivo_ajeno` | I3 |
| `anotarVariantesDelResultado` | `esDeLaCuenta(storageRef, cuenta)` | I4, I5 |
| Materializador del servidor | escribe bajo `users/<dueña>/` y comprueba la dueña | (`content.test.mjs`) |
| Subidas del cliente | nombres únicos bajo `users/<uid>/`, con reglas de Storage | `almacen-reglas-sobrescritura` |

## Lo que no garantizan los puntos de creación (y el resto de la defensa)

Un estado contradictorio (una ficha viva de A sobre una clave de B) no se puede crear por las rutas normales, pero sí
puede existir por una escritura directa, un camino futuro o un fallo. Para ese caso la defensa tiene que ser de borrado:

- **Retirada con índice** (`retirarConIndice`): cuenta TODAS las fichas vivas con la misma clave, de cualquier cuenta.
  Pruebas: II1 (retirar en B no borra lo que A usa), M16.
- **Revisión de marcas tras un borrado** (`revisarMarcasDeOtrasFichas`): solo toca las fichas de su dueña. Pruebas: III1, M17.
- **Borrado MC-5** (`reclamarParaBorrar`): cuenta filas vivas de todas las cuentas Y fichas vivas por clave de todas las
  cuentas, dentro de la transacción. **Corregido en A-2**: antes solo contaba filas. Pruebas: II2, M20.
- **Reconciliación** (`reconciliarIndiceDeCuenta`): el uso ajeno (una fila viva de otra cuenta, o una ficha viva sobre la
  clave) es uso. **Corregido en A-2**: antes un objeto con uso ajeno se clasificaba como huérfano. Pruebas: II3, M21.
- **Recuento ajeno desconocido** (más de 25 fichas sobre la clave): desconocido nunca es ausencia. Pruebas: II4, M22.

## Límites conocidos (no corregidos aquí)

1. **Claves de Cloudinary fuera de `accounts/`** (por ejemplo `posts/<uid>/…`): `crearMaterialDesdeUrl` y
   `crearMaterialParaSubida` no comprueban su dueña. Una cuenta puede crear un material que apunte a un objeto de Cloudinary
   de otra. **No afecta al borrado:** Weë solo borra objetos de Weë, y estos no entran en el índice. Es una decisión del
   propietario si se prohíbe.
2. **Variantes heredadas sin fila**: `fichasConLaClave` consulta solo `storageRef`. Una variante ajena sin fila que apunte a
   la clave no se ve. Es imposible por construcción (`anotarVariantesDelResultado` exige la carpeta de la cuenta), pero
   solo en estado contradictorio.
3. **Más de 25 fichas sobre una misma clave**: la cuenta queda como «desconocida» y el objeto no se clasifica ni se borra
   por esa vía. Es la política deliberada del límite.
4. **Concurrencia real**: las pruebas de dos cuentas de este documento son de dobles con transacciones optimistas. Las
   intercalaciones con emulador están en `activos-concurrencia-*`.

## Cómo se verifica

- `functions/test/activos-dos-cuentas.test.mjs`: 11 comprobaciones de I, II, III y IV.
- `functions/test/activos-mutacion.test.mjs`: M16, M17, M20, M21 y M22 matan sus regresiones; M16 y M17 se reapuntaron
  porque sus objetivos anteriores quedaron equivalentes tras C-1.
- `functions/test/video-asincrono.test.mjs`: H3 reancla la cifra de `core/media/reconciliacion.ts` (249/1 → 255/1). Solo
  añade condiciones, la protección sube.
