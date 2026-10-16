# Gran Motor · Agente F-2 — seguridad transversal (2026-10-16)

Base `33cd25a2`, rama `gran-motor/f-guardian`. **Auditoría de solo lectura**: no se corrigió código fuente, reglas ni controles; no se añadió ninguna suite. Etiquetas: **PROBADO** (ejecutado hoy, con salida) · **INFERIDO** (lectura de código/reglas, sin ejecución dirigida) · **NO EJECUTADO**. Criticidad: ALTA / MEDIA / BAJA / INFO.

## 0. Qué se ejecutó (todo con `functions/lib` recién compilada: `npm run build`, salida 0, 10 s)

Una suite cada vez, serie, sin entorno real (sin claves, sin Firebase real). Registro en el directorio temporal de la sesión; tablas completas abajo.

| Lote | Suites | Salida ≠ 0 | Duración total |
|---|---|---|---|
| Seguridad / identidad / secretos / rutas / navegación | 25 | **0** | ≈ 46 s (mayor: `core-identity-events` 19,8 s) |
| i18n (todas las `i18n-*`, `catalogo-`, `composer-`, `experiencias-`, `filmmaker-`, `proyectos-`) | 48 | **0** | 125,9 s |

Lote 1 (todas salida 0): `cabeceras-seguridad`, `cuenta-identidad`, `identidad-social`, `identidad-de-cuenta`, `identidad-sin-biz`, `privacidad-identidad`, `seguridad-11x4a`, `rotacion-secretos`, `escaneo-secretos`, `sanitize-huecos` (15/15 huecos conocidos vigentes), `moderation`, `credits-cliente-cerrado`, `credits-saldo-privado`, `credits-perfil-duplicado`, `urls-del-storage`, `core-identity-events`, `rutas-mapa` (defectos conocidos M1a, M2, M1b, M1c, M3 vigentes), `rutas-creatorrun` (K2, K1, K3), `rutas-resiliencia`, `rutas-respaldo-real` (R1), `navegacion-raiz`, `navegacion-enlaces`, `navegacion-parametros`, `filmmaker-navegacion`, `proteccion-github`.

**NO EJECUTADO:** las suites de emulador (`fronteras-rules`, `fronteras-storage`, `posts-rules`, `econtact-rules`, `brain-usage-rules`, `cuenta-identidad.emulator`; requieren Java 21 + emuladores y candado) — las reglas se auditaron por lectura. Tampoco se ejecutó nada contra producción, ni Cloud Functions desplegadas, ni sesión autenticada.

## 1. Resumen por área

| Área | Estado | Notas |
|---|---|---|
| Autenticación y sesiones | PROBADO (código + suites) / INFERIDO (comportamiento desplegado) | Los 34 puntos de entrada `onCall/onRequest` listados por script: 23 exigen sesión del usuario (`request.auth`, `uidOf` o `laCuentaDe`), 8 exigen además administración (`assertAdmin`: spend/grant/refundCredits, creditsAdmin, engineAdmin, mediaCanary, moderationAdmin, evalRun), 3 son públicos por diseño (webhooks `seedanceCallback` y `avisoDeProveedor`, página `publicPostPage`; su autenticación es firma/secreto, INFERIDA no auditada a fondo). **App Check apagado** (F-02) |
| Identidad activa y permisos | PROBADO (`identidad-*`, `privacidad-identidad`, `cuenta-identidad`, `core-identity-events`) | Cuenta ≠ identidad respetado en `econtact`; vínculo Perfil Weë↔Real legible públicamente (F-01, decisión D3 del dueño) |
| Autorización backend | PROBADO (`credits-cliente-cerrado`, `moderation`) / INFERIDO (resto) | `spendCredits/grantCredits/refundCredits/creditsAdmin/engineAdmin/mediaCanary/moderationAdmin/evalRun` admin; el resto, dueño del recurso |
| Reglas Firestore/Storage | INFERIDO (lectura de 1398 + 109 líneas); emuladores NO EJECUTADOS | Reglas endurecidas y comentadas; observaciones F-05..F-07 |
| Secretos | PROBADO (`escaneo-secretos`, `rotacion-secretos`, `seguridad-11x4a`) | `sanitize.ts` con 15 huecos PROBADOS (F-03) |
| Validación de entradas | INFERIDO | `assertInputImageUrl` (anti-SSRF) en avatar; `comoTexto` acotado en ËContact; límites de reglas de avisos |
| Errores seguros | PROBADO parcial / INFERIDO | `toHttpsError` no filtra mensajes internos; `console.error(…, error)` crudo en 40+ sitios (F-04) |
| Consistencia frontend↔backend | PROBADO (`rutas-*`, `navegacion-*`) | Defectos conocidos M1a/M1b/M1c/M2/M3/K1/K2/K3/R1 vigentes (F-08) |
| i18n (16 diccionarios) | PROBADO (48 suites en verde) | Revisión nativa humana: 0 % (F-09) |
| Accesibilidad y navegación | PROBADO parcial (3 suites i18n-a11y + navegación) | Sin herramienta automática de a11y de pantalla (F-10) |

## 2. Hallazgos

### F-01 · Perfil Weë enlazable con el Perfil Real desde datos públicos — ALTA (conocido, decisión D3 del dueño)
- **Dónde:** `firestore.rules:224` (`users/{userId}` → `allow read: if true`), `:34-36`/`:229-241` (`linkedAccountId`, `hidi_<uid>`); `functions/src/social/econtact.ts:51` (`PREFIJO_PERFIL_WEE = 'hidi_'`).
- **Evidencia:** `docs/F06-RUNBOOK.md:9` (D3: no se cierra; el uid público del Perfil Weë ES `hidi_<uid de la cuenta>`; de una publicación se llega al Perfil Real en dos lecturas). La suite `privacidad-identidad` (salida 0) vigila que las referencias públicas generadas sean entidades, no que la cara Weë sea inenlazable en los datos históricos.
- **Estado:** PROBADO el contrato nuevo; INFERIDO el riesgo residual (se lee de las reglas y de la decisión del dueño).
- **Recomendación:** mantener D3 como riesgo declarado; el cierre real son ids opacos con el vínculo solo en servidor (`entities.ownerAccountId`), migración XL de fase propia. No tocar `hidi_*` (legado de datos).

### F-02 · App Check apagado en todos los callables — MEDIA (conocido)
- **Dónde:** `functions/src/opciones.ts:29` (`APP_CHECK_OBLIGATORIO = false`, único interruptor); `docs/SECURITY.md` § App Check.
- **Evidencia (PROBADO por lectura + suite `app-check` en la cadena):** ningún callable lo fija por su cuenta. Sin App Check, un cliente alterado con una sesión válida puede llamar a los callables (acotados por sesión, cupo, Credits y `maxInstances: 20`).
- **Recomendación:** seguir el orden de SECURITY.md (primero medir, luego imponer); decisión del dueño.

### F-03 · `sanitizeForLog` deja pasar 15 formas de credencial — MEDIA (conocido, parche preparado)
- **Dónde:** `functions/src/engine/sanitize.ts:25-40` (PATTERNS), parche `docs/GRAN-MOTOR-A-sanitize.patch`.
- **Evidencia (PROBADO hoy):** `sanitize-huecos` salida 0, "huecos conocidos vigentes: 15/15": JSON anidado con comillas escapadas (`{\"api_key\":\"…\"}`), URL firmadas (`X-Goog-Signature`, `X-Amz-*`, `X-Tos-*`), `refresh_token`/`id_token`/`session_token`, bloques PEM. Los secretos configurados siguen censurados por valor exacto (`knownSecretValues`), así que el riesgo es el de un secreto no configurado/rotado y el de las URL portadoras.
- **Recomendación:** aplicar el parche (D-A7) junto con la ampliación de las guardas `puente-pre-f1d` F1 y `video-asincrono` H2 (decisión del dueño; Agente A ya lo demostró en verde). **No aplicado aquí.**

### F-04 · Registros de error sin pasar por el saneador — MEDIA
- **Dónde (ejemplos):** `functions/src/content/index.ts:262,607`; `generateAvatar.ts:225,242,332`; `creator/index.ts:144,538,840,851`; `creator/video.ts:727`; `creator/brain.ts:766-883`; `engine/config.ts:101`; `index.ts:238,306,359`.
- **Evidencia (INFERIDO por conteo):** 146 de las 174 llamadas `console.*` de `functions/src` no pasan por `sanitizeForLog`/`providerLog`; muchas imprimen el objeto `error` entero (mensaje + pila + posibles URL con parámetros de la petición). `generateAvatar.ts:225` registra la configuración de apariencia (`JSON.stringify(avatarConfig)`) y `:296-297` las primeras 80 letras de URL de Storage con uid.
- **Recomendación:** envolver `console.error(…, error)` con `sanitizeForLog(error)` (cambio mecánico; las guardas de frontera de tamaño exacto obligarán a ajustar cifras en varios archivos → decisión del dueño). Prioridad: rutas que llaman a proveedores (`generateAvatar.ts`, `creator/video.ts`, `engine/*`).

### F-05 · Proveedor de compra "test" abierto en cualquier proyecto distinto de `get-wee` — BAJA/MEDIA (conocido)
- **Dónde:** `functions/src/payments/providers/test.ts:11-16`; callable `validatePurchaseCallable` por defecto `provider='test'` (`credits/index.ts:146-153`).
- **Evidencia (INFERIDO por lectura):** `enabled()` es true con `CREDITS_TEST_PURCHASES==='true'`, en el emulador y en cualquier proyecto ≠ `get-wee`. Un cliente autenticado puede acreditarse paquetes sin pagar. Hoy cerrado en producción (revisión viva comprobada el 2026-10-01 según `ops/revision/baseline.json:2157`) y la memoria del proyecto indica que TODO corre en `get-wee`; `.env.example:56` documenta `false` en producción.
- **Recomendación:** fail-closed: `enabled()` debería exigir variable explícita `true` en vez de deducirla del nombre del proyecto; añadir prueba. Es decisión del dueño (toca payments/Credits).

### F-06 · Comentario obsoleto sobre el Perfil Biz en las reglas — INFO
- `firestore.rules:991` "(real, HIDI o BIZ)": el Perfil Biz se eliminó (2026-09-19, `identidad-sin-biz` salida 0). Solo comentario; no cambiar sin permiso (reglas desplegables).

### F-07 · Storage: `contentType.matches('image/.*')` admite `image/svg+xml` — BAJA
- **Dónde:** `storage.rules:9,19,28,69,80 y siguientes` (todas las rutas de subida). **INFERIDO:** un SVG subido por un usuario y servido desde el dominio de Storage puede ejecutar script al abrirse directamente; se sirve con token y por rutas no públicas salvo `images/posts` y `images/profile` (lectura pública, 5 MB / 2 MB).
- **Recomendación:** restringir a `image/(png|jpeg|webp|gif|heic)`; **NO EJECUTADO** (las suites de emulador `fronteras-storage` lo cubrirían).

### F-08 · Defectos conocidos de ruta y coste que la suite fija como vigentes — MEDIA
PROBADO hoy (salidas 0 con "conocido"): **M1a/M1b/M1c** `creatorRun` (`creator/index.ts:610-613`), `brainChat` (`creator/brain.ts:347,401`) y `generateVideo` (`creator/video.ts:479-483`) no miran el interruptor `iaDetenida` antes de cupo+reserva; **K2** con `iaDetenida` se consume cupo y se hace reserva+devolución; **M2** `creatorChat` llama a IA (`creator/planner.ts:175`) sin limitador por persona; **M3** el avatar usa el SDK de Gemini directo (`vertexAI.ts:47-48`) sin libro `aiGenerations`, sin cupo ni tope diario; **K1/K3** (`engine/router.ts:446-514`) un fallo al escribir `creatorUsage` hace pagar al respaldo y apunta `providerCost 0`; **R1** respaldos `doc.read→claude` e `image.try_on→gemini` sin adaptador. Son de coste/disponibilidad, no de confidencialidad. Recomendación: decisión del dueño (paquetes A/C); no se tocó.

### F-09 · i18n: revisión nativa humana pendiente — MEDIA (calidad, no seguridad)
- **Evidencia (PROBADO):** 48 suites i18n con salida 0; `node scripts/i18n-revision.mjs estado da` → 3 784 textos, **0 con revisión humana**, 784 de agente (20,7 %), 3 000 sin revisar. Hay 16 diccionarios (`en es de fr it pt pt-PT sv da tr ru hi ko zh zh-TW ja`); `ar` marcado `listo:false`. `pt` = pt-BR (regla de producto); existe además un diccionario `pt-PT`, no previsto en la nota de `CLAUDE.md` que dice que no forma parte de este trabajo (revisar que se ofrezca solo por decisión explícita; `i18n-variantes` salida 0). INFERIDO: la situación de los otros 13 idiomas es análoga (no medida aquí).
- **Recomendación:** revisión nativa humana por idioma con `scripts/i18n-revision.mjs`; el registro distingue `humana`/`agente`.

### F-10 · Accesibilidad sin verificación automática de pantalla — BAJA
- PROBADO: `i18n-accesibilidad-tiempo`, `i18n-engine-admin-accessibility`, `i18n-settings-engine-profile-a11y` y las de navegación/rutas en verde. NO EJECUTADO: auditoría con herramienta de a11y sobre la app en el navegador (contraste, orden de foco, lectores de pantalla); RTL (`ar` no listo; costura `hooks/useDireccion.ts`).

### F-11 · `creditsAdmin`/errores de Credits devuelven `error.details` al cliente — BAJA
- `credits/creditValidation.ts:47` copia `error.details` en `HttpsError`; los errores que no son de Credits sí salen genéricos (`:49-53`). INFERIDO: revisar que ningún `details` lleve datos internos.

## 3. Lo que está bien (PROBADO o leído)
- Callables de Credits sensibles: candado en código (`assertAdmin`) además del IAM (`credits-cliente-cerrado` salida 0); `shared/admin.ts:10-13` admin por claim o `WEE_ADMIN_UIDS`.
- ËContact: la identidad se resuelve contra `users` por `cuentaDeLaSesion` (`social/econtact.ts:297-305`), solo acepta quien recibió la solicitud (`:233-259`), transacción contra doble aceptación. No inventa identificadores; usa `cuentaDeIdentidad`.
- `avatarReplacement`: URLs entrantes restringidas a `users/{uid}/` de Storage (`generateAvatar.ts:285-295`), cierra SSRF.
- `deleteAsset`: dueño o 404 uniforme (`content/index.ts:617-626`).
- Reglas de notificaciones: remitente = quien escribe, forma cerrada, tipos acotados (`firestore.rules:1007-1055`); reglas de `users` impiden tocar campos de Credits, cuenta e identidad (`:259`).
- Storage sin catch-all, rutas privadas por uid, selfies y resultados solo del dueño.
- `escaneo-secretos` y `rotacion-secretos` en verde; claves vía Secret Manager; variables `EXPO_PUBLIC_*` solo públicas (Firebase config, App Check site key, client id de Google, interruptores de emulador y de muro de prueba apagado por defecto).

## 4. Orden recomendado para el dueño
1. Corregir la clase de redirecciones exteriores del Guardian (`GRAN-MOTOR-F-GUARDIAN.md` §3).
2. F-05 (fail-closed del proveedor "test").
3. F-03 + F-04 (saneado de logs; parche de A y ajuste de guardas).
4. F-02 (App Check, siguiendo SECURITY.md).
5. F-07 (tipos de imagen), F-08 (paquetes A/C), F-09 (revisión nativa), F-10 (a11y).
6. F-01 solo como fase propia (ids opacos).

## 5. NO EJECUTADO / límites
Emuladores de reglas, humo sobre producción, pruebas autenticadas, auditoría a11y real, revisión nativa humana, barrido de dependencias (`npm audit`). Sin cambios en código fuente, reglas ni controles; sin suites nuevas (no hubo defecto trivial demostrado que lo exigiera).
