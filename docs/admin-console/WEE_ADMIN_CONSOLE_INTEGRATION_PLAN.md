# Weë Admin Console — plan de integración y criterios de producción

> **Esto documenta. No integra nada.** Escrito el 2026-10-31 sobre tres puntos: login sin commit (base `04492adf`), seguridad `959c28f7`, rediseño `3c067036`. El ensayo se hizo en una carpeta desechable, sin tocar ninguna rama, y lo que dice sobre el comportamiento **es de emuladores o del SDK, no de Firebase real**.

## 1. Etapas

Cada etapa se autoriza por separado. Ninguna incluye despliegue.

| # | Etapa | Qué se hace | Criterio para pasar |
|---|---|---|---|
| 0 | Proteger el login | Commit de los 14 archivos de login en su propia rama, más el arnés | `npm run test:login` 66/66; `git status` limpio; copia verificada |
| 1 | Seguridad primero | `959c28f7` sobre la base. Sin conflictos: es el primer hijo | Cadena 282/282; emuladores 26/26; `_sabotajes-admin` 37/37 |
| 2 | Rediseño encima | Merge de `3c067036`. 13 archivos en conflicto: se parte de la versión del rediseño, hecha sobre una copia de seguridad, y se revisa la lista de §2 | Consola en verde; `admin-seguridad` 110/110; `_sabotajes-admin` 37/37 |
| 3 | Login encima | Merge del login. 6 conflictos en 4 archivos; §3 dice cómo se resuelve cada uno | `npm run test:login` 66/66 con el arnés adaptado; consola 134/134 |
| 4 | Pruebas sobre el resultado | Sabotajes del login contra el resultado, capturas a los 5 anchos | Todos detectados; inspección visual |
| 5 | Proyecto real de pruebas | `admin-console/e2e/proyecto-real.mjs --ejecutar` en un proyecto propio de pruebas | §5 |
| 6 | Producción | Solo con §6 completo y autorización expresa | §6 |

**Por qué este orden:** la seguridad es la única que cambia el servidor, y las otras dos solo dependen de él. Si un conflicto enfrenta seguridad y presentación, gana seguridad.

## 2. Comprobar después de resolver seguridad + rediseño

Tomar la versión del rediseño es correcto solo si conserva esto (verificado en el ensayo; hay que repetirlo):

- `Consola.tsx`: entra por `opsAdmin.quienSoy`, nunca por `engineAdmin.status`. `vigilado` sustituye la consola ante `denegado` y `sin-sesion`. `puedeVer` filtra el menú. Las vistas reciben `puedeLeer`.
- `api/acciones.ts` y `api/cliente.ts`: idénticos en las dos ramas.
- `estilos.css`: conserva lo que lee `admin-seguridad` G6.
- `_sabotajes-admin` encuentra sus textos y detecta 37/37.

## 3. Resolver el login encima

| Archivo | Conflictos | Resolución |
|---|---|---|
| `vistas/Login.tsx` | 2 | **Manda el login**: `enviando` (cerrojo por ref, no el `if (enCurso)` por estado del rediseño), validación, `noValidate`, mostrar/ocultar. Del rediseño: clases `campo` y `grande`, `Icono` en el error |
| `vistas/Consola.tsx` | 2 | `ComprobacionDePermiso` recibe `hijos` (seguridad) **y** `sesion` (login), y conserva el botón de salir |
| `estilos.css` | 1 | Se queda el CSS del rediseño y se añaden solo `.campo-login`, `.campo-clave`, `.error-campo` |
| `admin-console-frontera.test.mjs` | 1 | `indexOf('<ComprobacionDePermiso ')`, que vale para las dos firmas |

**Tres arreglos que el merge no avisa**, y sin los que el resultado falla:

1. **`estilos.css`: `min-height: 44px`, no `2.75rem`.** El rediseño fija `html { font-size: 15px }`: con `2.75rem` (41 px), los 4 controles del formulario quedaron por debajo de 44 px en todos los anchos.
2. **`App.test.tsx`:** «si la comprobación falla» tiene que hacer fallar `opsAdmin.quienSoy`, no `engineAdmin.status`.
3. **Frontera 12c:** la palabra `authorization` aparece en `CLAVE_SENSIBLE` (un filtro protector) y en un texto de `en.ts`. El patrón pasa a ser `['"]?[Aa]uthorization['"]?\s*:|Bearer `, que sigue detectando una cabecera enviada a mano (sabotaje comprobado).

**Y el arnés `login-e2e.mjs`:** entrar por `/opsAdmin`, no por `/engineAdmin` (la retención, la petición inspeccionada y la lista de llamadas). El correo, el rol y «salir» pasan a un menú plegado a este ancho, así que se leen con `textContent`. Administración sin rol ya no tiene exactamente 4 enlaces. Esto cambia cómo se localiza cada elemento, no lo que se exige.

## 4. Hallazgos de seguridad

Estado de lo investigado. **«Ensayo» significa que está corregido en el código ensayado, no desplegado.**

| # | Hallazgo | Evidencia | Estado |
|---|---|---|---|
| 1 | **Rebajar o quitar un rol no surte efecto con un token vigente** en la base y el login: 200 tras bajar a `support` y tras quitar `admin` | `proyecto-real --autoprueba` sobre la base | **Confirmado en la base**, corregido por `959c28f7`: 403 |
| 2 | Una baja no corta hasta que caduca el token (≈1 h) en la base | Código: `onCall` llama a `verifyIdToken` sin `checkRevoked` | **Confirmado por lectura del código**, corregido por `959c28f7`. Sin probar en real |
| 3 | Los rechazos a administración no quedaban en la auditoría en la base (0 denegados) | Autoprueba sobre la base | Confirmado, corregido por `959c28f7` |
| 4 | Puente de administración sin rol abierto por defecto. Quitar solo `weeRole` a un `admin:true` **amplía** su acceso | `permisos.ts`: `esLegado` | Decisión pendiente: `WEE_ADMIN_SIN_ROL=cerrado` tras asignar owner |
| 5 | Las reglas de Firestore solo ven el token: `admin:true` sigue escribiendo comunidades oficiales y negocios hasta ≈1 h tras retirarlo, y sin rol también con el puente cerrado | `firestore.rules`; transición §3 paso 7 | Abierto, alcance limitado a 4 usos de `esAdministracion()` |
| 6 | Sin CSP en la consola: el `index.html` no la lleva y no hay hosting propio | `index.html`; `firebase.json` no incluye la consola | Abierto. Atenúa: ni `innerHTML` ni `eval` en el código, y la sesión no sobrevive a la pestaña |
| 7 | XSS: el token de refresco está en `sessionStorage`, legible por cualquier script de la página, y sirve desde otro origen porque App Check está apagado | Código; `APP_CHECK_OBLIGATORIO = false` | Abierto. Riesgo real si hay XSS o una dependencia comprometida |
| 8 | Sin segundo factor en cuentas que pueden mover Credits | No configurado en código | Abierto. **Recomendado antes de producción**: exige Identity Platform y es decisión del dueño |
| 9 | Una variable de depuración en producción anula la verificación: `FIREBASE_DEBUG_MODE` + `skipTokenVerification`, o `FIREBASE_AUTH_EMULATOR_HOST` | Código de los SDK. No se usan en el repositorio | No se ha mirado el entorno real. Comprobarlo en la etapa 6 |
| 10 | Sin límite de llamadas propio en las operaciones de administración | Búsqueda en `functions/src/admin` | Bajo: el filtro previo rechaza sin leer Auth a quien no es administración |
| 11 | Enumeración e intentos: la consola da el mismo mensaje, pero lo que hace Auth depende del proyecto | Protección por defecto solo en proyectos desde 2023-09-15; **`get-wee` sin comprobar** | Sin verificar: R9 y R10 |
| 12 | `npm audit`: 4 altas, todas de `@grpc/grpc-js` vía Firestore | La consola no importa Firestore | Bajo. El arreglo que propone es bajar a `firebase@9`: no aplicar |

## 5. Pruebas en un proyecto real de pruebas

`admin-console/e2e/proyecto-real.mjs`. Sin argumentos solo enseña el plan. Se niega con `get-wee`, con `wee-dev-geovet`, con `demo-*`, con un nombre que no diga que es de pruebas, con una credencial de otro proyecto o con variables de emulador o de depuración.

**Crea cuentas con claims de administración** en ese proyecto y las borra al terminar, por eso su ejecución es decisión de la persona dueña. Requisitos: proyecto propio creado para esto, cuenta de servicio y clave web de ese proyecto, Identity Toolkit activo. Lo que queda en el proyecto: entradas de `adminAudit`.

| Prueba | Pregunta que responde |
|---|---|
| R1 | ¿Se acepta un token real? |
| R2 | ¿Se rechazan los forjados en el entorno real? |
| R3 | ¿Una cuenta normal recibe 403? |
| R4, R5 | ¿Cambiar o quitar un rol surte efecto con el token antiguo? |
| R6, R7 | ¿Una baja o una revocación cortan en la siguiente llamada? ¿Y el refresco? |
| R8 | ¿Los rechazos constan? |
| R9 | ¿Hay protección contra enumeración? |
| R10 | ¿En cuántos intentos corta Firebase? |
| R11 | ¿Un token real caducado da 401? (`--esperar-caducidad`, más de 1 h) |
| R12 | ¿Qué responde CORS desde otro origen? (solo con `--url`) |

Ejecutar **dos veces**: sin `--url` (la callable en local, contra Auth y Firestore reales) y con `--url` (desplegada en el proyecto de pruebas). Solo la segunda prueba el entorno real de una Function.

`admin-console/e2e/firma-sdk.mjs` no necesita proyecto: comprueba el SDK contra las claves públicas reales de Google.

## 6. Criterios de aceptación para producción

**Todos** obligatorios. Hoy no se cumple ninguno de los que dependen de un entorno real.

**Código**
- [ ] Etapas 0 a 4 terminadas y revisadas, en una rama que no sea `main`
- [ ] Cadena, emuladores, `_sabotajes-admin` y `test:login` en verde sobre el resultado
- [ ] CI ejecuta la batería o hay constancia de su ejecución sobre el commit exacto

**Firebase real, en un proyecto de pruebas**
- [ ] R1 a R10 en verde **contra la Function desplegada**
- [ ] R11 ejecutada al menos una vez
- [ ] R6 y R7 cortan en la siguiente llamada; R4 y R5 también

**Frontend**
- [ ] Hosting propio, separado del sitio público, con acceso restringido (decidir cuál)
- [ ] CSP estricta probada con la batería: `default-src 'none'`, `script-src 'self'`, `style-src 'self'`, `connect-src` solo a Auth y a las Functions, `frame-ancestors 'none'`, `base-uri 'none'`, `form-action 'self'`, más HSTS y `X-Content-Type-Options`
- [ ] `resolverEntorno` admite el proyecto real por una decisión revisada, no por una variable suelta
- [ ] App Check activo para las callables de administración, o renuncia escrita
- [ ] Revisión en Safari, Firefox, móvil real, lector de pantalla y gestor de contraseñas

**Cuentas y permisos, en `get-wee`**
- [ ] Segundo factor en toda cuenta con rol, o renuncia escrita
- [ ] Protección contra enumeración activa, comprobada en la configuración del proyecto
- [ ] Inventario de `ops/admin/inventario.mjs` revisado; al menos un owner, mejor dos
- [ ] Puente cerrado (`WEE_ADMIN_SIN_ROL=cerrado`), lista vaciada y reglas cerradas (transición, pasos 6 y 7)
- [ ] La cuenta de servicio puede leer Auth: si no, toda la administración da `unavailable`
- [ ] Entorno de las Functions sin `FIREBASE_DEBUG_*` ni `*_EMULATOR_*`
- [ ] Índice `creatorJobs(status, updatedAt)` desplegado
- [ ] Reglas de producción al día ([desfase conocido](../../firestore.rules))

**Operación**
- [ ] Procedimiento de baja de una persona ensayado de punta a punta, con su tiempo medido
- [ ] Alerta sobre `adminAudit` para denegados e `intento` sin cierre
- [ ] Decisión sobre las lecturas que el Panorama deja en la auditoría
- [ ] Plan de marcha atrás escrito
