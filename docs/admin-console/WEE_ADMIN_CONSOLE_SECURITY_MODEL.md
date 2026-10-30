# Weë Admin Console — modelo de seguridad

## 1. Activos y amenazas

| Activo | Amenaza | Control hoy | Estado |
|---|---|---|---|
| Datos de administración (saldos, denuncias, configuración del motor) | Alguien sin permiso los lee | `assertAdmin` en cada callable; la consola se desmonta ante `permission-denied` | VERIFIED EXISTING + IMPLEMENTED AND TESTED |
| Credits | Una acción de la consola mueve dinero | La consola no tiene ninguna escritura (lista cerrada, toda de lectura; pruebas de frontera 4–5) | IMPLEMENTED AND TESTED |
| Credits | Una compra simulada o un `packageId` antiguo crea saldo | Recargas cerradas: `validatePurchase`/`restorePurchase` → `unimplemented` sin tocar la cuenta (`sin-paquetes` D1–D5) | IMPLEMENTED AND TESTED |
| Secretos de proveedores | Llegan al navegador | La consola no importa nada del servidor; su `apiKey` es un marcador del emulador; `escaneo-secretos` y frontera 6 | IMPLEMENTED AND TESTED |
| Producción | La consola en desarrollo apunta a `get-wee` | `config/entorno.ts` solo acepta `demo-*` y hosts de esta máquina | IMPLEMENTED AND TESTED |
| Privilegios | Alguien se da admin a sí mismo | Solo el claim o `WEE_ADMIN_UIDS`; ningún callable lo concede; `admin-local.mjs` solo en emulador | VERIFIED EXISTING |
| Escalada por la IA | La Copilot se salta permisos | No existe aún; diseño en §4 | DESIGNED, NOT IMPLEMENTED |
| Trazabilidad | Nadie sabe quién miró o cambió algo | `adminAudit`: solo lo crea el servidor; reglas cerradas también al owner (403 probado); sin constancia no hay datos. Las escrituras antiguas (`setProvider`, `setCost`, `grantCredits`…) aún NO lo usan | PARTIALLY IMPLEMENTED |
| Datos personales | Un administrador ve más de lo necesario | Lista blanca de campos: nunca objetivo, prompt, resultados, URLs, título, correo, nombre; cuentas enmascaradas sin `accounts.read`; costes solo con `finance.read` (extremo a extremo: sin fugas) | IMPLEMENTED AND TESTED |
| Privilegios | Un rol se concede solo | Claim `weeRole` solo por Admin SDK; ninguna callable lo escribe (`admin-lecturas` A8); inútil sin `isAdmin`; `asignar-owner.mjs` se niega si la cuenta no es ya administración | IMPLEMENTED AND TESTED |
| Emulador | El emulador de Functions no verifica la firma del token: alguien EN ESTA MÁQUINA puede forjar un admin | Solo contra datos `demo-*` vacíos y en 127.0.0.1; ADC del portátil detectadas, pero los servicios no emulados fallan con `demo-*` | Riesgo aceptado y documentado |
| Dependencias | `@grpc/grpc-js` 1.9.16 (vía `@firebase/firestore`) con dos avisos de servidor gRPC | La consola no importa Firestore y el bundle no lo contiene; ni Firebase 13.1.0 lo corrige (fija `~1.9.0`) | Riesgo documentado, sin override |

## 2. Reglas de autorización

1. Cada callable sensible comprueba el permiso en el SERVIDOR, en su primera línea. Nunca basta con ocultar un botón.
2. Sin promoción automática, sin autoservicio de privilegios, sin superusuario que se salte comprobaciones.
3. Revocación: el rol viaja en el token. Quitarlo tarda hasta que caduque (≈1 h) salvo que se revoquen los tokens de refresco. **Riesgo aceptado para lecturas; a revisar antes de abrir escrituras.**
4. Contra IDOR: las lecturas de una cuenta exigen un identificador válido (`assertUserId`, uid sin `/`), con techo de resultados; las de la persona usuaria siguen limitadas a su propia cuenta en `firestore.rules`.
5. Los fallos de autorización se registran sin tokens ni mensajes del cliente; en `adminAudit` solo si la sesión ya es administración.

## 3. Auditoría

Modelo en la [arquitectura maestra §4](WEE_ADMIN_CONSOLE_MASTER_ARCHITECTURE.md). Reglas: la escribe solo el servidor; `firestore.rules` la deniega a todo cliente; no hay acción que la edite o la borre. Lecturas: sin constancia no se devuelven los datos. En dinero, privilegios y operaciones destructivas (futuras): sin registro no hay acción (misma transacción). Limitación: el emulador y un administrador con credenciales del proyecto pueden alterar la colección fuera de Weë; no es inmutabilidad criptográfica. Nunca guarda contraseñas, tokens, secretos ni datos personales innecesarios (se aplica `sanitizeForLog`, `engine/sanitize.ts`).

## 4. Admin AI Copilot

- Usa el token de quien pregunta y las mismas callables; no tiene credenciales propias.
- Permisos separados: leer · preparar · ejecutar. Ejecutar exige confirmación humana explícita, motivo y auditoría.
- Todo contenido de logs, denuncias, publicaciones, respuestas de proveedores es **dato no fiable**: nunca se interpreta como instrucción.
- Datos mínimos al modelo; nada de saldos de personas concretas ni datos personales salvo que la pregunta los exija y la persona administradora tenga permiso.
- Su llamada al modelo pasa por el WEË AI ENGINE (adaptador oficial), nunca por un intermediario.

## 5. Entornos

| Entorno | Proyecto | Consola |
|---|---|---|
| Emulador | `demo-wee` (`scripts/emulators.mjs`: secretos vacíos, se niega con credenciales reales) | permitido |
| Desarrollo | `wee-dev-geovet` | no permitido (`proyecto-no-demo`) |
| Producción | `get-wee` | no permitido; requiere roles + auditoría + hosting propio + decisión del dueño |
