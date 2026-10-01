# Legado de HideTok — qué queda del nombre antiguo y qué se hace con ello

Weë nació como **HideTok**, una red social anónima (primer commit `6c48784`, 2025-08-21;
«Complete HideTok social media app», `590f5ad`, 2025-10-16). El cambio de nombre a Weë
llegó con `db070a9` (2026-04-14): esquema `wee`, paquete y bundle `zone.wee.app`. El
vocabulario de producto ya es de Weë (Perfil Weë, Weëls); lo que queda se clasifica aquí,
una aparición cada vez, **sin reemplazos globales a ciegas**.

Inventario y limpieza del 2026-10-01, sobre `i18n/da-dk` (`d306a58` + cambios sin commit).

## 1. Las cuatro clases

| Clase | Qué es | Qué se hace |
|---|---|---|
| **A** | Referencia ACTIVA que debía decir Weë (o apuntar a algo que ya no existe) | Se corrige |
| **B** | Identificador técnico con datos o servicios detrás | **No se rompe.** Se documenta y se prepara su migración (§5) |
| **C** | Referencia histórica con valor (comentarios que explican un identificador, guías de la época) | Se conserva, marcada como legado |
| **D** | Residuo accidental | Se elimina |

## 2. Cómo se midió

`git grep -i -o -E 'hide-?tok'` (todas las formas: `HideTok`, `hidetok`, `com.hidetok.app`,
`hidetok://`, `hidetok-…`), `git grep -o 'hidi_'` y `git grep -i -o -P 'hidi(?!_)'`, sin
`functions/lib` (compilado) ni `node_modules`. **Antes** = `HEAD` (`d306a58`). **Después** =
el árbol con estos cambios, sin contar este documento, `DECISIONES-DELIBERADAS.md` ni los 28
enlaces que apuntan a este archivo (su nombre contiene «HIDETOK»).

## 3. Antes y después

### `hidetok` (todas las formas)

| | Antes | Después |
|---|---|---|
| Apariciones | **71** en 24 archivos (66 líneas) | **86** en 19 archivos |
| A · activas | 17 | **0** |
| D · residuo | 1 | **0** |
| B · técnicas pendientes | 2 | 2 |
| C · históricas | 45 | 78 |
| Guardas de pruebas (buscan el vocabulario viejo para que no vuelva) | 6 | 6 |

El total **sube** a propósito: cada guía de la raíz lleva ahora un aviso de legado que nombra
a HideTok, y CLAUDE.md y el README dicen qué identificadores viejos siguen y por qué. Lo que
importa es la fila A: **ninguna referencia activa queda en pie**.

### `hidi_` y `'hidi'`

| | Antes | Después |
|---|---|---|
| `hidi_` | 228 en 42 archivos | 228 en los mismos 42 (estos cambios no tocan ninguno) |
| `hidi` sin guion bajo (`'hidi'`, `Hidi`) | 184 en 34 archivos | igual |

Mientras se hacía este trabajo, otros cambios en paralelo añadieron 7 `hidi_` en pruebas
nuevas (`avisos-en-la-web`, `credits-perfil-duplicado`, `fronteras-rules`, `security`): son
del mismo tipo (B fijado por pruebas). De los 184 `hidi`, 5 son nombres de ciudades en
`data/citiesWorld.ts` (Ben Mehidi, Errachidia…): falsos positivos.

## 4. Archivo por archivo (`hidetok`)

| Archivo | Antes | Clase | Acción |
|---|---|---|---|
| `App.tsx` | 1 | **D** | Quitado el prefijo `'hidetok://'` del linking. El esquema registrado es `wee` (`app.json`) desde `db070a9`; el manifiesto generado registra solo `wee` y `exp+hidetok-simple`, así que ningún enlace `hidetok://` podía abrir la app. Ninguna prueba lo fijaba |
| `package.json`, `package-lock.json` | 1 + 2 | **A** | `hidetok-simple` → `wee-app` (solo los campos `name`). Nada depende del nombre: ni scripts, ni CI (`.github/`), ni `firebase.json`, ni `ops/`, ni pruebas |
| `functions/package.json`, `functions/package-lock.json` | 2 + 2 | **A** | `hidetok-functions` → `wee-functions`; descripción «Cloud Functions de Weë». Mismo grep, nada depende. `ops/integracion/conflictos.patch` no lleva esas líneas en su contexto |
| `public/.well-known/assetlinks.json` | 1 | **A** | `com.hidetok.app` → `zone.wee.app`. La huella SHA-256 queda como marcador inequívoco (§6) |
| `public/.well-known/apple-app-site-association` | 2 | **A** | `TEAM_ID.com.hidetok.app` → `PENDIENTE_DEL_DUENO_APPLE_TEAM_ID.zone.wee.app` (§6). Fuera `/feed/*`, que no es ninguna ruta de la app (`App.tsx` → `linking`) |
| `public/landing.html` | 3 | **A** | Tres botones a la ficha de Google Play de `com.hidetok.app`, que **no existe** (404, comprobado el 2026-10-01; la de `zone.wee.app` tampoco). Ahora llevan a `https://wee.zone/`. De paso, el texto visible dejó el posicionamiento de HideTok (§7) |
| `CLAUDE.md` | 5 | 4 **A** + 1 C | Daba por vigentes el esquema `hidetok://` y `com.hidetok.app`. Ahora dice cuáles son los de Weë y cuáles de los viejos siguen (los B) |
| `app.json` (`slug`) | 1 | **B** | Sin cambio. §5.1 |
| `services/cloudinaryService.ts` (`UPLOAD_PRESET`) | 1 | **B** | Sin cambio en el valor; un comentario explica por qué. §5.2 |
| `DEPLOY_WEB.md`, `VERCEL_ENV_SETUP.md`, `GOOGLE_SETUP.md`, `GOOGLE_SIGNIN_SETUP.md`, `FIREBASE_STORAGE_SETUP.md`, `FIREBASE_STORAGE_RULES.md`, `LIKES_AND_FOLLOWS_GUIDE.md` | 38 | **C** | Aviso «LEGADO (HideTok) — no describe Weë actual» al principio de cada una, con lo vigente. Hablan del proyecto de Firebase `hidetok-9a642`, de Netlify, del proxy `auth.expo.io` y de despliegues a mano que el `predeploy` ya rechaza |
| `utils/econtactModel.ts`, `services/firestoreService.ts`, `contexts/UserProfileContext.tsx`, `functions/src/identity/compatibilidad.ts`, `firestore.rules`, `docs/IDENTITY.md` | 6 | **C** | Comentarios que explican de dónde sale `hidi_`. Se quedan |
| `functions/test/econtact.test.mjs` | 6 | guarda | Detectan «Hidi»/«HideTok» como vocabulario en las pantallas de identidad (286–288, 360). Se quedan |
| `netlify.toml` | — | **D** | Eliminado (§7) |

## 5. Lo técnico (B): qué hay que hacer, quién, y por qué hoy no

### 5.1 El `slug` de Expo: `hidetok-simple`

- **Qué arrastra.** Está atado al proyecto de EAS del desarrollador anterior: `app.json` →
  `owner: giacomogonzales20` y `extra.eas.projectId: 920ff7aa-…`; el mismo `projectId` es el
  respaldo de los tokens de push de Expo (`services/pushNotificationService.ts:47`); el cliente
  de desarrollo registra el esquema `exp+hidetok-simple` (se deriva del `slug`); y `eas.json` →
  `submit.production.ios` lleva el Apple ID de esa persona.
- **Por qué no se toca hoy.** EAS rechaza un `slug` que no coincide con el del `projectId`;
  cambiar solo el `slug` rompe la vinculación, el esquema del cliente de desarrollo y, con el
  proyecto, los tokens de push.
- **Migración (dueño).** 1) Cuenta de Expo propia y `eas init` → proyecto nuevo (p. ej.
  `slug: wee`). 2) En un solo cambio: `slug`, `owner`, `extra.eas.projectId`, el respaldo de
  `pushNotificationService.ts` y `eas.json` → `submit`. 3) Recompilar los clientes de
  desarrollo (el esquema pasa a `exp+wee`). 4) Los tokens de push se vuelven a registrar solos al
  abrir la app; comprobar una notificación de punta a punta antes de dar nada por hecho.
  Va con el primer AAB (README § «EAS y actualizaciones OTA»).

### 5.2 El preset de Cloudinary: `'hidetok-simple'`

- **Qué arrastra.** Es el nombre de un preset **sin firmar que existe** en la cuenta de
  Cloudinary `dnrj1guvs`. Todas las subidas de la app lo nombran.
- **Por qué no se toca hoy.** Cambiar la cadena antes de crear el preset nuevo rompe todas las
  subidas; y las versiones nativas ya instaladas siguen usando el viejo.
- **Migración (dueño en Cloudinary + código).** 1) Crear en Cloudinary un preset nuevo (p. ej.
  `wee-unsigned`) con la misma configuración (carpetas, formatos, límites) — es buena ocasión
  para acotarlo más, porque el comentario de `cloudinaryService.ts` ya avisa de que un preset
  sin firmar no es una frontera. 2) Cambiar `UPLOAD_PRESET`. 3) Publicar web y nativas.
  4) Retirar el viejo solo cuando ninguna versión en uso lo pida.

### 5.3 El prefijo `hidi_` y `profileType: 'hidi'`

- **Qué arrastra.** Es el identificador **guardado** del Perfil Weë: documentos
  `users/hidi_<uid>`, autores de publicaciones, seguimientos, participantes de conversaciones,
  votos (`hidi_abc_p1`), rutas de Storage (`messages/hidi_…`, `docs/F11-MIGRACION.md`) y 29
  apariciones en las reglas (`firestore.rules`, `storage.rules`). Por zonas: 166 en pruebas
  (25 archivos), 29 en reglas, 23 en la app y el servidor (9 archivos), 3 en scripts de
  migración y 7 en documentación.
- **Por qué no se toca.** Es una migración de datos en muchas colecciones, más reglas, más
  versiones antiguas de la app, a cambio de nada que una persona vea. La decisión escrita es
  conservarlo como dato (`CLAUDE.md` § Mapa de nombres; `docs/IDENTITY.md` § 13, «La frontera con la identidad heredada»).
  No está planificada.
- **Si algún día se hace**, por la capa de identidad y en un solo punto: `identidadWeeDe` y
  `cuentaDeIdentidad` (`utils/econtactModel.ts`) en el cliente, `functions/src/identity/compatibilidad.ts`
  en el servidor. **Requisito previo, hallado en este inventario:** `contexts/UserProfileContext.tsx`
  compone `` `hidi_${user.uid}` `` a mano en cuatro sitios (claves de la caché, líneas 146, 196,
  225 y 253) en vez de usar `identidadWeeDe`, contra lo que dice `CLAUDE.md` («se compone en un
  solo sitio»). Y `functions/src/social/econtact.ts` declara su propio `PREFIJO_PERFIL_WEE`
  (el servidor no puede importar `utils/`). Ninguna de las dos se tocó aquí.

### 5.4 El proyecto de Firebase `hidetok-9a642`

Solo aparece en las guías de legado. Si todavía existe, con qué datos y si se puede cerrar, lo
sabe el dueño; Weë no lo usa (`get-wee` es el único proyecto real).

## 6. Los `/.well-known/`: corregidos, con dos huecos que pone el dueño

`app.json` declara App Links (`autoVerify`) para `wee.zone` y `www.wee.zone` (`/post`) y
`associatedDomains` en iOS. Los dos archivos se sirven desde **las tres** webs: `www.wee.zone`
(Vercel; `expo export -p web` copia `public/` a `dist/`, por eso `0d460c0` renombró la landing),
`get-wee.web.app` y `wee-app.web.app`. **Comprobado el 2026-10-01: en producción siguen diciendo
`com.hidetok.app`** hasta que se publique la web y se despliegue el hosting.

| Falta | Dónde se saca | Quién |
|---|---|---|
| La huella **SHA-256 del certificado de firma** de `zone.wee.app` (sustituye a `PENDIENTE_DEL_DUENO_SHA256_DEL_CERTIFICADO_DE_FIRMA_DE_GOOGLE_PLAY`) | Play Console → Integridad de la app → firma de apps (la clave de Google si usa Play App Signing). **No** la SHA-1 de depuración registrada en Firebase | Dueño, cuando exista la ficha (hoy no: 404) y su clave de subida |
| El **Team ID** de Apple (sustituye a `PENDIENTE_DEL_DUENO_APPLE_TEAM_ID`) | Apple Developer → Membership | Dueño, cuando haya cuenta y app de iOS |

Hasta entonces la verificación falla de forma limpia, igual que fallaba con `com.hidetok.app`:
no se pierde nada que funcionara. Aparte: Vercel sirve el archivo de Apple como
`application/octet-stream`; Apple pide `application/json` (una cabecera en `vercel.json`, fuera
de este trabajo).

## 7. Retirado, propuesto para retirar, y lo que se queda

| Pieza | Evidencia | Qué se hizo | Propuesta |
|---|---|---|---|
| `netlify.toml` | Ningún sitio usa Netlify: `wee.zone` responde `Server: Vercel` y sin `X-Frame-Options` (las cabeceras del archivo no se aplicaban en ninguna parte); solo lo citaba `DEPLOY_WEB.md` (2025) | **Eliminado** (D). Daba una falsa sensación de cabeceras de seguridad | — |
| `public/landing.html` | **VIVA**: es la raíz «/» de `get-wee.web.app` (`firebase.json` → rewrite a `/landing.html`) y los enlaces «/» de la página pública de una publicación servida desde ahí llevan a ella. También responde en `www.wee.zone/landing.html` | No se borra. Textos corregidos: fuera «Sé anónimo», «Hids (Reels)», «confesiones», «sin filtros», las tres identidades con Biz (eliminada el 2026-09-19) y los botones a Google Play; dentro los textos de la Ayuda de la app (`i18n/textos/es/help.ts`) y Weë AI. «Entrar» iba a `/app`, que en `get-wee.web.app` es un 404: ahora va a `https://wee.zone/` | Que el dueño decida si «/» de `get-wee` debe ser una redirección a `https://wee.zone` (y retirar la landing) o una página de presentación con textos aprobados por él |
| `public/app.html` | Mini-cliente de `db070a9` con Firebase JS 11 de gstatic que **escribe** en `posts` y `comments` de producción fuera de la capa de servicios (sin moderación, sin i18n). **Nada vivo lo enlaza** (la landing apuntaba a `/app`, no a `/app.html`), pero se sirve en las tres webs | No se borra (hay que coordinarlo). Lleva un comentario de legado al principio | **Retirarlo** (D): borrar el archivo, su entrada en `ADMITIDOS` de `scripts/escaneo-secretos.mjs` y sus menciones en `docs/I18N.md` §9 y el README; llega a producción con el siguiente despliegue de las webs |
| Las 7 guías de la raíz | Época HideTok (2025-10-16 y 2026-01-20); sin claves | C: aviso de legado al principio | Moverlas a un `docs/historico/` o borrarlas cuando el dueño quiera |
