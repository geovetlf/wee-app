# Legado de HideTok — qué queda del nombre antiguo y qué se hace con ello

El repositorio empezó como **HideTok** (primer commit `6c48784`, 2025-08-21; «Complete HideTok social media
app», `590f5ad`, 2025-10-16). El cambio de nombre a Weë llegó con `db070a9` (2026-04-14): esquema `wee`, paquete
y bundle `zone.wee.app`. El vocabulario de producto ya es de Weë (Perfil Weë, Weëls); lo que queda se clasifica
aquí, una aparición cada vez, **sin reemplazos globales a ciegas**.

Inventario del 2026-10-01 sobre `i18n/da-dk` (`d306a58` + cambios sin commit), en dos pasadas: la **limpieza**
(lo activo corregido, avisos de legado) y el **cierre** (guías, `public/app.html`, binarios y `.env` de dev
retirados; § 7).

## 1. Las cuatro clases

| Clase | Qué es | Qué se hace |
|---|---|---|
| **A** | Referencia ACTIVA que debía decir Weë (o apuntar a algo que ya no existe) | Se corrige |
| **B** | Identificador técnico atado a un recurso externo o a datos guardados | **No se rompe.** Se documenta su migración (§ 5) |
| **C** | Referencia histórica que explica un identificador o un hecho | Se conserva |
| **D** | Residuo sin uso | Se elimina; queda en la historia de git (§ 7) |

## 2. Cómo se midió

Sobre los archivos de `git ls-files -co --exclude-standard` (versionados y nuevos no ignorados), sin
`functions/lib` (compilado): `hide-?tok` sin distinguir mayúsculas (cubre `HideTok`, `HIDETOK`, `hidetok://`,
`com.hidetok…`, `hidetok-…`), `\bHids\b` y `hidi_`. **Antes** = `HEAD` (`d306a58`, con `git grep`). **Después** = el
árbol al cerrar, **sin contar este documento** ni el nombre `LEGADO-HIDETOK` de los enlaces que apuntan aquí.

`android/` e `ios/` **no están versionados** (`.gitignore`, `android/` e `ios/`): los genera `expo prebuild`. El
`android/` generado en un portátil lleva `exp+hidetok-simple` en su `AndroidManifest.xml`, derivado del `slug`
(B, § 5.1); desaparece al regenerarlo después de esa migración.

## 3. Antes y después

### `hidetok` (todas las formas)

| | Antes (`d306a58`) | Después |
|---|---|---|
| Apariciones | **71** en 24 archivos | **33** en 16 archivos |
| A · activas | 17 | **0** |
| D · residuo | 39: 1 en `App.tsx` y 38 en las 7 guías de la raíz (§ 7) | **0** |
| B · técnicas | 2 (`slug`, preset de Cloudinary) | 2 (las mismas) |
| C · históricas | 7 (comentarios que explican `hidi_`, una frase de `CLAUDE.md`) | 25 |
| Guardas de pruebas (buscan el vocabulario viejo para que no vuelva) | 6 | 6 |

C sube de 7 a 25 a propósito: `CLAUDE.md`, el README y `DECISIONES-PENDIENTES.md` dicen ahora qué identificadores
viejos siguen, por qué y qué espera al dueño; el comentario de `cloudinaryService.ts` explica su B; la cabecera de
`landing.html` dice qué se quitó; y la baseline del revisor y su rúbrica nombran los hallazgos ya corregidos. Lo que
importa es la fila A.

### `Hids` y `hidi_`

| | Antes | Después | Clase |
|---|---|---|---|
| `Hids` | 2 (`public/landing.html`, la guarda de `econtact.test.mjs`) | 2 (el comentario de `landing.html` que dice que se quitó, la guarda) | C + guarda |
| `hidi_` | 228 en 42 archivos | 236 en 48 archivos | **B** (§ 5.3) |

Ningún cambio de esta limpieza tocó un `hidi_`. Los que suben son de pruebas nuevas de otros trabajos en paralelo
(`avisos-en-la-web`, `credits-perfil-duplicado`, `fronteras-*`, `security`…), que fijan el mismo identificador. Por
zonas, después: 173 en pruebas (27 archivos), 29 en reglas (`firestore.rules`, `storage.rules`), 19 en la app y el
servidor (8 archivos), 11 en documentación (8, una de ellas el mapa de fronteras), 3 en scripts de migración (2) y 1
en `ops/revision/baseline.json`. Las cifras de `hidi_` se movieron mientras se medían: otros trabajos en paralelo
añaden pruebas y tocan el cliente.

## 4. Lo que queda, archivo por archivo (`hidetok`, después)

| Archivo | Clase | Qué es |
|---|---|---|
| `app.json` (`slug`) | **B** | § 5.1 |
| `services/cloudinaryService.ts` (`UPLOAD_PRESET` + su comentario) | **B** + C | § 5.2 |
| `CLAUDE.md`, `README.md`, `docs/DECISIONES-PENDIENTES.md` | C | Dicen qué identificadores viejos siguen, por qué y qué espera al dueño, y enlazan aquí |
| `utils/econtactModel.ts`, `services/firestoreService.ts`, `contexts/UserProfileContext.tsx`, `functions/src/identity/compatibilidad.ts`, `firestore.rules`, `docs/IDENTITY.md` | C | Comentarios que explican de dónde sale `hidi_` |
| `docs/DECISIONES-DELIBERADAS.md` | C | La decisión de conservar `hidi_` |
| `public/landing.html` | C | Comentario de cabecera: qué textos de HideTok se quitaron el 2026-10-01 |
| `ops/revision/baseline.json`, `ops/revision/rubricas/comun.md` | C | Títulos de hallazgos ya corregidos y la regla del revisor sobre los identificadores |
| `functions/test/econtact.test.mjs` | guarda | Caza «Hidi»/«HideTok» como vocabulario en las pantallas de identidad (286–288, 360) |

Lo corregido en la primera pasada (A y D, 18 apariciones): el prefijo `'hidetok://'` del linking de `App.tsx`; los
`name` de `package.json`/`package-lock.json` (`wee-app`) y de `functions/` (`wee-functions`); `com.hidetok.app` →
`zone.wee.app` en `public/.well-known/` (§ 6); los tres botones de `public/landing.html` a una ficha de Google Play
que no existe; y cuatro frases de `CLAUDE.md` que daban por vigentes `hidetok://` y `com.hidetok.app`.

## 5. Lo técnico (B): qué recurso externo, quién y cómo

### 5.1 El `slug` de Expo: `hidetok-simple`

- **Recurso externo:** el proyecto de EAS del desarrollador anterior. `app.json` → `owner: giacomogonzales20` y
  `extra.eas.projectId: 920ff7aa-…`; el mismo `projectId` es el respaldo de los tokens de push
  (`services/pushNotificationService.ts`, `PROYECTO_DE_EAS`); el cliente de desarrollo registra `exp+hidetok-simple`
  (se deriva del `slug`); `eas.json` → `submit.production.ios` lleva el Apple ID y el `ascAppId` de esa persona.
- **Por qué no se toca hoy:** EAS rechaza un `slug` distinto del de su `projectId`; cambiar solo el `slug` rompe la
  vinculación, el esquema del cliente de desarrollo y, con el proyecto, los tokens de push.
- **Quién:** el dueño, con su cuenta de Expo (y la de Apple para `submit`).
- **Pasos:** 1) `npx eas login` con la cuenta del dueño y `npx eas init` → proyecto nuevo (p. ej. `slug: wee`).
  2) En **un solo cambio**: `slug`, `owner`, `extra.eas.projectId`, el respaldo de `pushNotificationService.ts` y
  `eas.json` → `submit.production.ios` (Apple ID y `ascAppId` del dueño). 3) Recompilar los clientes de desarrollo
  (el esquema pasa a `exp+wee`; regenerar `android/` con `expo prebuild`). 4) Los tokens de push se vuelven a
  registrar al abrir la app: comprobar una notificación de punta a punta antes de darlo por hecho. Va con el primer
  AAB (README § «EAS y actualizaciones OTA»).

### 5.2 El preset de Cloudinary: `'hidetok-simple'`

- **Recurso externo:** un preset de subida **sin firmar que existe** en la cuenta de Cloudinary `dnrj1guvs`
  (`services/cloudinaryService.ts`). Todas las subidas de la app lo nombran; las versiones nativas ya instaladas lo
  llevan compilado.
- **Por qué no se toca hoy:** cambiar la cadena antes de crear el preset nuevo rompe todas las subidas.
- **Quién:** el dueño en la consola de Cloudinary; después, un cambio de código y una publicación.
- **Pasos:** 1) Cloudinary → *Settings* → *Upload* → *Upload presets*: crear `wee-unsigned` (*Unsigned*) copiando
  la configuración de `hidetok-simple` (carpeta, formatos, límites); buena ocasión para acotarlo más, porque un
  preset sin firmar no es una frontera (lo avisa el propio comentario). 2) Cambiar `UPLOAD_PRESET`. 3) Publicar web y
  nativas. 4) Retirar `hidetok-simple` solo cuando ninguna versión en uso lo pida.

### 5.3 El prefijo `hidi_` y `profileType: 'hidi'`

- **Qué arrastra.** Es el identificador **guardado** del Perfil Weë: documentos `users/hidi_<uid>`, autores de
  publicaciones, seguimientos, participantes de conversaciones, votos (`hidi_abc_p1`), rutas de Storage
  (`messages/hidi_…`, `docs/F11-MIGRACION.md`) y las reglas (`firestore.rules`, `storage.rules`).
- **Por qué no se toca.** Es una migración de datos en muchas colecciones, más reglas, más versiones antiguas de la
  app, a cambio de nada que una persona vea. La decisión escrita es conservarlo como dato (`CLAUDE.md` § Mapa de
  nombres; `docs/IDENTITY.md` § 13). No está planificada.
- **Si algún día se hace**, por la capa de identidad y en un solo punto: `identidadWeeDe` y `cuentaDeIdentidad`
  (`utils/econtactModel.ts`) en el cliente, `functions/src/identity/compatibilidad.ts` en el servidor. Lo que el
  inventario halló compuesto a mano: `contexts/UserProfileContext.tsx` armaba `` `hidi_${user.uid}` `` en cuatro claves
  de caché (en este árbol ya usa `identidadWeeDe`, por otro trabajo de la misma misión), y
  `functions/src/social/econtact.ts` declara su propio `PREFIJO_PERFIL_WEE` (el servidor no puede importar `utils/`).

### 5.4 El proyecto de Firebase `hidetok-9a642`

Solo aparecía en las guías retiradas (§ 7). Si todavía existe, con qué datos y si se puede cerrar, lo sabe el dueño
(consola de Firebase, con su cuenta); Weë no lo usa (`get-wee` es el único proyecto real).

## 6. Los `/.well-known/`: corregidos, con dos huecos que pone el dueño

`app.json` declara App Links (`autoVerify`) para `wee.zone` y `www.wee.zone` (`/post`) y `associatedDomains` en
iOS. Los dos archivos se sirven desde `www.wee.zone` (Vercel; `expo export -p web` copia `public/` a `dist/`),
`get-wee.web.app` y `wee-app.web.app`. **Comprobado el 2026-10-01: en producción siguen diciendo `com.hidetok.app`**
hasta que se publique la web y se despliegue el hosting.

| Falta | Dónde se saca | Quién |
|---|---|---|
| La huella **SHA-256 del certificado de firma** de `zone.wee.app` (sustituye a `PENDIENTE_DEL_DUENO_SHA256_DEL_CERTIFICADO_DE_FIRMA_DE_GOOGLE_PLAY`) | Play Console → Integridad de la app → firma de apps (la clave de Google si usa Play App Signing). **No** la SHA-1 de depuración registrada en Firebase | Dueño, cuando exista la ficha (hoy no: 404) |
| El **Team ID** de Apple (sustituye a `PENDIENTE_DEL_DUENO_APPLE_TEAM_ID`) | Apple Developer → Membership | Dueño, cuando haya cuenta y app de iOS |

Hasta entonces la verificación falla de forma limpia, igual que fallaba con `com.hidetok.app`. Aparte: Vercel sirve
el archivo de Apple como `application/octet-stream`; Apple pide `application/json` (una cabecera en `vercel.json`).

## 7. Retirado, y dónde sigue en la historia

Nada de esto lo usaba algo vivo (comprobado con `grep` en todo lo versionado: docs, README, CLAUDE.md, pruebas,
`firebase.json`, `vercel.json`, `app.json`, `design/` y las páginas de `public/`); las menciones que quedaban en
documentos se corrigieron en el mismo cambio. Para leer cualquiera: `git show <commit>:<ruta>`.
Los avisos de legado de la primera pasada nunca llegaron a un commit: lo que devuelve `git show` es el texto
original, de HideTok. **No lo sigas.**

| Pieza | Último commit con contenido | Qué era | Lo vigente |
|---|---|---|---|
| `DEPLOY_WEB.md` | `2ac9c2d` | Despliegue a Vercel/Netlify/Firebase del proyecto `hidetok-9a642`, con `firebase deploy` a mano | [`DEPLOYMENT.md`](DEPLOYMENT.md) |
| `VERCEL_ENV_SETUP.md` | `bbc622e` | Variables de Vercel del proyecto `hidetok-9a642` | `.env.example` y [`DEPLOYMENT.md`](DEPLOYMENT.md) |
| `GOOGLE_SETUP.md` | `590f5ad` | Inicio de sesión con el proxy `auth.expo.io` | README § «Iniciar sesión con Google» |
| `GOOGLE_SIGNIN_SETUP.md` | `3662551` | Google Sign-In con paquetes `com.hidetoksimple.app` | README § «Iniciar sesión con Google» (lo que seguía siendo cierto se movió allí, comprobado contra `contexts/AuthContext.tsx`) |
| `FIREBASE_STORAGE_SETUP.md` | `b12fa69` | Pegar reglas de Storage a mano en la consola | `storage.rules`, solo por el workflow |
| `FIREBASE_STORAGE_RULES.md` | `590f5ad` | Igual, y proponía `allow read, write: if true` | `storage.rules`, [`SECURITY.md`](SECURITY.md) |
| `LIKES_AND_FOLLOWS_GUIDE.md` | `6405f48` | Reglas e índices de likes y follows anteriores a los vigentes | `firestore.rules`, `firestore.indexes.json`; [`MAPA-DE-FRONTERAS.md`](MAPA-DE-FRONTERAS.md) § Social Graph |
| `netlify.toml` | `2ac9c2d` | Cabeceras de un host que no se usa (`wee.zone` es Vercel) | `vercel.json`, `firebase.json` |
| `public/app.html` | `db070a9` | Mini-cliente con Firebase JS 11 de gstatic que **escribía** en `posts` y `comments` de producción fuera de la capa de servicios (sin moderación ni i18n). Se servía en las tres webs sin que nada lo enlazara; deja de servirse con el próximo despliegue de las webs | La app (`wee.zone`) |
| `assets/wallpaper.mp4` (7 MB) | `590f5ad` | Video que llegó con la app de HideTok; nada lo cargaba | — |
| `assets/images/hero-alterego.png` | `2365206` | Imagen del «hero carousel with alter ego» de ese commit; el carrusel de hoy usa `assets/images/hero/` | — |
| `assets/images/Fondo transparente (1).png` | `db070a9` | Copia idéntica byte a byte de la anterior | — |
| `functions/.env.wee-dev-geovet` | `d4e6467` | Un uid de prueba como `WEE_ADMIN_UIDS`; Firebase solo lo carga para el proyecto `wee-dev-geovet`, que no se usa (los emuladores son `demo-wee`). Sale del **índice**: sigue en el disco, ignorado por `.env.*` | La variable `WEE_ADMIN_UIDS` del entorno `get-wee` de GitHub (`despliegue.yml`); `CLAUDE.md` § Mapa de nombres |

Lo que se queda: **`public/landing.html` está VIVA** (la raíz «/» de `get-wee.web.app`, `firebase.json`). Sus textos
se corrigieron en la primera pasada. Decisión del dueño: si «/» de `get-wee` debe redirigir a `https://wee.zone` (y
retirar la landing) o seguir como página de presentación con textos aprobados por él.
