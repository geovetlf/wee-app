# Weë Admin Console — Unidad 1 (solo lectura)

Consola administrativa **privada** de Weë. No es una app para usuarios ni un App Builder: es el panel con el que administración mira cómo está la superapp. Vive en este repositorio como una **app web independiente** (React + TypeScript + Vite) con sus propias dependencias; no importa pantallas, componentes, servicios ni contextos de la app de usuario.

## Qué hace (y qué no)

| Vista | Fuente (callable existente → acción) |
|---|---|
| **Resumen** | `engineAdmin` → `status` |
| **Credits** | `engineAdmin` → `status` (solo su `creditsPerUsd`: la conversión) · `creditsAdmin` → `stats`, `balance`, `userHistory`, `failed`, `costs` |
| **Moderación** | `moderationAdmin` → `list`, `history` |

**Credits en Weë:** son la unidad de consumo; la referencia es **US$ 1 = 100 Credits** (decisión de producto). No hay planes, niveles, suscripciones ni paquetes. La vista Credits enseña la conversión que informa el motor (`creditsPerUsd`) y avisa si no es 100; de `creditsAdmin.costs` solo pinta el coste en Credits de cada servicio. El campo `packages` que ese callable aún devuelve (el catálogo heredado `CREDIT_PACKAGES` del Credit Engine) se ignora a propósito: retirarlo del servidor es una decisión aparte del motor central, no de esta consola.

Son **exactamente ocho acciones**, todas de lectura (`src/api/acciones.ts`). El cliente solo acepta una clave de esa lista y solo envía los parámetros declarados para ella. **No hay** conceder ni devolver Credits, cambiar proveedores o ajustes, resolver denuncias ni ninguna otra escritura. No accede a Firestore ni a Storage (solo importa `firebase/auth` y `firebase/functions`), no usa `firebase-admin` y no lleva ninguna clave.

La autorización real la hace el servidor: cada callable llama a `assertAdmin` (`functions/src/shared/admin.ts`: claim `admin` en el token o uid en `WEE_ADMIN_UIDS`). La consola no puede saltarse eso; al entrar, NO pinta el menú hasta que una lectura al servidor confirma el permiso («Comprobando permisos…»). Si el servidor responde «sin permiso», muestra *Acceso denegado*; si responde «sin sesión», pide volver a iniciar sesión. En los dos casos, sin menú ni datos.

Idiomas: español e inglés, con el **traductor puro de Weë** (`../i18n/traducir`, `resolver`, `formato`). Los textos propios de la consola están en `src/i18n/es.ts` y `en.ts` (claves `admin.*`); viven aquí y no en `i18n/textos/` para no mover la huella ni la cobertura de los 14 idiomas de la app de usuario. El inglés tiene que tener las mismas claves que el español (el tipo no compila si falta una).

## Esta unidad solo funciona con emuladores

`src/config/entorno.ts` rechaza cualquier proyecto que no empiece por `demo-` y cualquier host que no sea de esta máquina: la consola no arranca contra `get-wee`. Apuntarla a producción es una decisión posterior (roles, auditoría y hosting propio), no un cambio de variable.

## Requisitos

- Node **22.12 o superior** para la consola (el repositorio pide Node 24 para las Functions y los emuladores; la consola no depende de eso).
- Para **ver datos**: los emuladores de Firebase del proyecto `demo-wee` (Auth y Functions), que se levantan desde la **raíz del repositorio**:
  - `npm install` y `npm --prefix functions install` (una vez), Node 24 y **Java 21+** (lo exige el emulador de Storage que arranca `scripts/emulators.mjs`) y `firebase-tools` en el `PATH`.
  - `npm run functions:emulator` (compila las Functions y arranca Auth `9099`, Firestore `8080`, Functions `5001` y Storage `9199`, todos en `127.0.0.1`).
- Sin emuladores la consola se abre, pero el inicio de sesión y las consultas fallan con «no se pudo conectar».

Cómo comprobar que están disponibles (desde cualquier terminal):

```bash
curl -s http://127.0.0.1:9099/          # Auth: devuelve JSON con "authEmulator"
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:5001/   # Functions: cualquier código HTTP significa que responde
```

## Instalar y ejecutar

```bash
cd admin-console
npm install          # dependencias propias; no toca las de la raíz ni las de functions/
npm run dev          # http://127.0.0.1:5174
```

Variables opcionales (plantilla en `entorno.ejemplo`, que no se llama `.env.*` a propósito: la regla de CI `entrega-configuracion` solo admite dos `.env.example` en todo el repositorio; copia las líneas que necesites a un archivo `.env.local`, que git ignora): `VITE_FIREBASE_PROJECT_ID` (debe ser `demo-*`), `VITE_AUTH_EMULATOR_HOST/PORT`, `VITE_FUNCTIONS_EMULATOR_HOST/PORT` (hosts locales).

## Probar el acceso administrativo en local

El servidor solo deja pasar a quien tenga el claim `admin` (o esté en `WEE_ADMIN_UIDS`). En local, el procedimiento explícito es poner ese **mismo claim** a un usuario del **emulador** de Auth:

```bash
cd admin-console
node scripts/admin-local.mjs --email admin@demo-wee.local --password <elige-una-clave-local>
```

- Crea o reutiliza el usuario en el emulador y le pone `admin: true` con la API local del emulador. No usa credenciales, no corre fuera de un proyecto `demo-*` ni de un host local, y no existe contra producción.
- La contraseña no tiene valor por defecto ni se guarda.
- Después, entra en la consola con ese correo. Si ya tenías sesión con ese usuario, ciérrala y vuelve a entrar (el claim viaja en el token).
- Para ver **Acceso denegado**, entra con un usuario sin claim (créalo en el emulador sin ejecutar el script).

Las vistas estarán vacías o con ceros mientras los emuladores no tengan datos: la consola no inventa nada. Los datos de `creditsAdmin`, `moderationAdmin` y `engineAdmin` son los que haya en el emulador.

## Pruebas

```bash
cd admin-console
npm run typecheck    # tsc --noEmit
npm test             # vitest: lista permitida, cliente, normalizadores, i18n y las vistas con servicios simulados
npm run build        # typecheck + build de producción en dist/ (ignorado por git)
```

Desde la raíz, sin instalar nada: `node functions/test/admin-console-frontera.test.mjs` (también va en `npm test` de `functions/`). Comprueba las fronteras: no importa la app de usuario, no usa `firebase-admin` ni Firestore, la lista de acciones es exactamente la de la Unidad 1, no hay secretos, el texto visible usa el traductor y el script local se niega fuera de un emulador `demo-*`.

Las pruebas de las vistas usan un invocador simulado: **no** hablan con el servidor, así que no prueban el contrato real de los callables. Eso se comprueba arrancando los emuladores (arriba).

## Qué falta (a propósito)

Roles, auditoría de acciones, un callable de lectura propio con paginación, resumen de cuenta/perfiles, trabajos y generaciones, alertas, escritura de cualquier tipo, CI y hosting propios. Cada uno es una unidad posterior con su autorización.
