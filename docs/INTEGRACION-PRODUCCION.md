# Producción → main — el plan de integración (preparado y ensayado, NO ejecutado)

Weë Agent Harness, FASE 4 (2026-09-30).

**Estado: PREPARADO. No se ha creado ninguna rama, no se ha hecho ningún merge
real y no se ha subido nada.** Ejecutarlo es la autorización 2 del dueño (§9).

- Todo lo que sigue se midió con `git merge-tree`, que simula sin tocar ramas.
- Se ensayó en un worktree temporal desligado de cualquier rama, con el merge
  sin commit.

## 1. La foto de hoy

```
origin/main (GitHub) ── bfc622d ── lo que publica Vercel en wee.zone
                           │
                           │  +168 commits, NUNCA subidos (S1/S2, identidad, moderación,
                           │  Weë Studio B3.10–B3.15, F12, …)
                           ▼
main (local) ─────────── dad0ca2
                           ├── +7 ── i18n/hi-in d731b6d (ja, tr, sv, hi)
                           │           └── +35 ── harness/fase-1 (este trabajo)
                           └── +43 ── hotfix/r22-generatevideo 7f11d51   ← CORRE EN PRODUCCIÓN
                                         │ (96b3f7a es su penúltimo commit)
                                         └─ 96b3f7a ── +59 ── filmmaker/core e00d144 (NO desplegado)
```

Ninguna de estas ramas está en GitHub: solo `origin/main`.

**Las 34 funciones** (`ops/produccion.json`) por dónde está su código:

| Dónde está su código | Funciones |
|---|---|
| En `origin/main` (GitHub) | 23 |
| En `main` local, pero no en GitHub | 7: `nacimientoDeCuenta`, `moderationAdmin`, `reportContent`, `brainChat`, `mediaCanary`, `creatorRun`, `creatorChat` |
| Solo en `hotfix/r22-generatevideo`: **ni en `main`** | 4: `generateVideo` (7f11d51) · `productions`, `shots`, `barridoDeLiquidacion` (96b3f7a) |

Además, ni las reglas e índices vivos (c3515b3) ni los dos Hosting están en
GitHub.

**Las webs** sirven tres estados distintos:

| Web | Commit | Qué lleva |
|---|---|---|
| `wee.zone` (Vercel) | `bfc622d` | Ni identidad consolidada, ni Denunciar, ni Weë Studio B3, ni Filmmaker |
| `wee-app.web.app` | `afbc2df` aprox. | Identidad y Denunciar; ni Weë Studio B3 (2026-09-23) ni Filmmaker |
| `get-wee.web.app` | `0123cdc` | La landing y `/post/**` |

## 2. Qué código de producción entra en main, y qué no

| Lo que corre en producción | Commit vivo | Dónde está | Cómo entra |
|---|---|---|---|
| `generateVideo` (R22) | `7f11d51` | `hotfix/r22-generatevideo` | Merge de la rama |
| `productions`, `shots`, `barridoDeLiquidacion` | `96b3f7a` | `hotfix/r22-generatevideo` **y** `filmmaker/core` | El mismo merge: `96b3f7a` es antecesor de `7f11d51` |
| Las otras 30 | En `main` local | Ya están | — |

- **Una sola rama basta.** `hotfix/r22-generatevideo` = `main` + 43 commits
  lineales, y contiene todo lo vivo que `main` no tiene.
- **No hace falta cherry-pick.** Sería peor: duplicaría los commits con otros
  SHA y los tags `prod/*` dejarían de estar en la historia de `main`.
- **`filmmaker/core` NO entra.** Sus 59 commits posteriores a `96b3f7a` no
  están desplegados (R18, R23–R26, canaries, proveedor 3D esperan
  autorización). Entrarán en su propio PR cuando el dueño lo decida.

### Los 43 commits, por bloques

| Bloque | Commits | Qué es |
|---|---|---|
| F1-A · dominio Filmmaker | `f1a7da4` `dc5468a` `05d905a` `e210508` `b8fbc58` `6a068bc` `98fc796` | Modelo, validación, lenguaje de operaciones, recomendaciones y requisitos de una producción; docs y pruebas |
| F1-B · persistencia y callable | `5aacac1` `314abfb` `f6333ce` `8233ae3` `8d0b746` `4ffc26d` `81b88f0` `e308939` `c5f07e2` `3851ff5` | `productions` (callable, transacciones), reglas, emulador |
| F1-C · cliente | `d109aea` `ccda6c3` `2dd79ef` `74b5f21` `9e11731` `62c021f` `291f214` `55c5184` | Espejo del dominio, servicio y estado optimista, textos en 11 idiomas, `ProductionScreen`, la entrada desde «Varias escenas» (`9e11731`) |
| Credits · idempotencia | `61d2cdf` `5fd15f0` `8e91daa` | **Toca el Credit Engine** (ver abajo) |
| Vídeo asíncrono | `f09540a` `d189e99` `b023f24` | El vídeo por el conductor único |
| Puente pre-F1-D | `7983ed8` `da6a168` `e90b9bb` `276cf7b` `a0eb853` | Un solo espacio de materiales, liquidación con `NOT_REFUNDABLE`, POST perdido = desenlace desconocido |
| F1-D | `0065538` `12a7172` `88fa34d` `33dfe58` `5e04d7c` `96b3f7a` | La toma de un plano por la puerta del vídeo |
| R22 | `7f11d51` | `generateVideo`: precio −1 y vídeos de referencia al techo del modelo |

**Qué cambian, contra `main`:** 136 archivos, +29 732 / −145.

| Área | Archivos | Líneas |
|---|---|---|
| `functions/src` | 23 | +6 987 |
| Pruebas | 28 | +7 989 |
| Cliente (`screens`, `components`, `services`, `hooks`, `utils`, `navigation`, `constants`, `App.tsx`) | 55 | ≈ +9 880 |
| i18n (`filmmaker` en 11 idiomas) | 22 | +3 665 |
| `firestore.rules` | 1 | +31 |
| `firestore.indexes.json` | 1 | +1 índice |
| Docs | 3 | — |
| Scripts | 1 | — |

**Tres cosas que el dueño tiene que saber:**

1. **`61d2cdf` cambia la lógica del Credit Engine.**
   - Un `requestId` repetido solo es la misma operación si coinciden la cuenta
     y el servicio, y, con huella, también la huella y el importe.
   - Si no, `INVALID_REQUEST`/`idempotency_conflict`.
   - Hoy corre SOLO dentro de `generateVideo`. El resto de funciones tienen el
     motor anterior.
   - Tras la integración, cada función lo heredará en su próximo despliegue.
   - Se autorizó para el vídeo. Extenderlo es parte de lo que se autoriza aquí.
   - Las suites de los dos lados lo confirman compatible con los arreglos de la
     FASE 1:
     - `idempotencia-de-cobro`;
     - `creator-reclamo`;
     - `avatar-duplicados`.
2. **Las reglas e índices de los 43 commits no están vivos.**
   - Son `productions` y sus subcolecciones, de solo lectura de lo propio, más
     1 índice.
   - `main` ya lleva además 87 líneas de reglas y 6 índices sin desplegar
     ([DEPLOYMENT.md](DEPLOYMENT.md) §3).
   - Hay que desplegarlos antes de publicar ninguna interfaz de Filmmaker.
   - Es un despliegue aparte, con su diff revisado.
3. **La interfaz de Filmmaker no está viva en ninguna web.**
   - Integrar no la publica.
   - Publicar `main` (§6) sí.

## 3. Conflictos de texto: 3, todos mecánicos

`git merge-tree --write-tree harness/fase-1 hotfix/r22-generatevideo` (git 2.55):

| Archivo | Por qué choca | Resolución ensayada |
|---|---|---|
| `functions/package.json` | Los dos lados añaden suites a la cadena de `npm test` | Unión. Hoy son 212 pasos: los 199 de un lado más los 13 del otro (`idempotencia-de-cobro`, `video-asincrono`, `puente-pre-f1d`, `f1d-generacion`, `f1d-cliente`, `filmmaker-modelo`, `productions-runtime`, `filmmaker-espejo`, `filmmaker-servicio`, `filmmaker-reductor`, `filmmaker-ui`, `filmmaker-i18n`, `filmmaker-navegacion`). Se conserva `test:todas` |
| `functions/test/job-queue.test.mjs` | Cada lado admite su callable nueva en las listas de la regla #63 | Unión de `CALLABLES_DE_CREDITS` y `DE_LA_IDENTIDAD`, más `sinSeguir` |
| `functions/test/i18n-preferencia-usuario.test.mjs` | Un lado sube un recuento fijo de claves (2682 → 2732); el otro lo cambió por uno dinámico | El dinámico (`claves('pt') === claves('es')`), que cubre los dos |

Con esas tres resoluciones, las Functions compilan con 0 errores.
`functions/src` queda **exactamente** igual que producción (`7f11d51`) más los
cambios del Harness (comprobado con `comm`: ninguna otra diferencia).

## 4. Diferencias semánticas: lo que no sale como conflicto

Ensayo completo de la cadena sobre el merge: §5 da el resultado. Las causas, por
grupos:

| Grupo | Dónde falla | Causa | Resolución propuesta |
|---|---|---|---|
| **a. Traducciones** | `tsc` de la app (4 errores); `i18n`, `i18n-japones`, `i18n-turco`, `i18n-sueco`, `i18n-hindi` | El módulo `filmmaker` (305 claves) existe en 11 idiomas, pero no en ja, tr, sv ni hi, que llegaron después. `FormaDelDiccionario` obliga a que todos tengan todos los módulos | Traducir 4 × 305 = **1 220 textos** con el proceso profesional de siempre: investigación, guía, traductores, dos revisiones, suite y capturas. **Es el camino crítico** |
| **b. Mayúsculas turcas** | `i18n-turco` 36 y 36c | 4 archivos de Filmmaker usan `toUpperCase()`/`toLowerCase()` sin locale, y 4 componentes ponen rótulos en mayúsculas con `textTransform` | Los 4 primeros tocan identificadores (códigos de error, etiquetas BCP-47, claves prohibidas): a la lista cerrada, con su porqué. Los 4 componentes (`CampoQueCrece`, `ProductionPiezas`, `ProductionSceneCard`, `ProductionTimelinePreview`), a `TextoEnMayusculas`: igual en es/en, correcto en tr. Sus pruebas de interfaz (`filmmaker-ui`, `f1d-cliente`) reciben un doble de ese componente que deja el texto igual, como hacía el estilo |
| **c. Cercas de F1-D** | `video-asincrono` A13, H2 · `puente-pre-f1d` E4, F1, F2, F4 · `f1d-generacion` AI, 98 | Son cercas de cierre de fase: fijan por nombre y tamaño exacto qué archivos movió F1-D desde un commit. Los arreglos de la FASE 1 tocan legítimamente varios de esos archivos (lista abajo) | Re-anclar **por nombre y tamaño**, como ya hizo `88fa34d` («re-anchor the authorized pins, nominally… No fence removed or weakened»): cada archivo del Harness entra con su `numstat` exacto y el commit que lo explica. `credits/index.ts`, solo con el delta de `b878068`. `creditEngine.ts`, el Financial Core, `core/router.ts` y `creditCosts` siguen **sin tocar** |
| **d. Guardas de emulador** | `emulador-aislado` 21 | Tres suites de Filmmaker contienen el literal `get-wee` en su propia guarda (`PROY === 'get-wee'`) | `if (!PROY.startsWith('demo-'))`. Es más estricta: hoy `productions.emulator.mjs` solo rechaza `get-wee` y aceptaría `wee-dev-geovet` |
| **e. Emulador de Functions** | `ci-workflow` 18 | `filmmaker-servicio` y `productions-callable` necesitan el emulador de Functions. El corredor del Harness lo niega porque cargaría las claves locales (`.env.local`, `.secret.local`) | **Hecho en el Harness (`27811f1`).** El corredor admite Functions solo si `motivosParaNoArrancar` no ve claves ni valores locales (el criterio de `npm run functions:emulator`), y deja `.secret.local` vacío. En CI nunca hay secretos locales, así que esas dos suites corren en el nivel 3 |
| — | `core-orchestrator` 121 | Tiempo bajo carga | Pasa sola. No es de la integración |

**Archivos que tocan los arreglos de la FASE 1 y que vigilan las cercas de F1-D**
(medido con `git diff --numstat` y `git log`):

| Archivo | Commits | H0 |
|---|---|---|
| `credits/index.ts` | `b878068` | #24 |
| `creator/index.ts`, `creator/credits.ts`, `creator/types.ts` | `0926584`, `6d33fd2`, `0799ed6` | #9, #15a |
| `generateAvatar.ts` | `a5f6f99`, `0ad8500`, `0799ed6` | #11, #19 |
| `engine/router.ts`, `types.ts`, `registry.ts`, `admin.ts`, `gateway.ts` | `0ad8500`, `5e87b80` | #19 y FASE 8 |
| `engine/limits.ts` | `5e87b80` | FASE 8 |
| `engine/config.ts` | `8193184` | #20 |
| `engine/http.ts` | `16ca1ae` | #3 |
| `engine/webhooks.ts`, `engine/providers/seedance.ts` | `8a9f098` | #21 |
| `gateway/index.ts`, `gateway/types.ts` | `28b7052` | #16 |
| `opciones.ts`, `index.ts` | `ed4abe4` | §27 |
| `secrets.ts` | `6bae5b0` | Solo comentarios |

## 5. El ensayo

Se hizo en un worktree temporal desligado de cualquier rama, con
`git merge --no-commit --no-ff hotfix/r22-generatevideo` sobre `harness/fase-1`.
Nunca hubo commit: el resultado no existe en ninguna rama.

| Paso | Resultado |
|---|---|
| Solo las 3 resoluciones de §3 | Functions: 0 errores. Cadena: **202/212** suites (16 916 comprobaciones ✔). Fallan las 10 de §4 |
| Más §4 b–e | Cadena: **207/212** (16 930 comprobaciones ✔). **Solo fallan las 5 de traducciones** (§4 a). `tsc` de la app: solo los 4 errores de `filmmaker` en ja/tr/sv/hi |
| Sabotajes de las cercas re-ancladas | **5/5** siguen mordiendo: una línea más en `creditEngine.ts`, en `credits/index.ts`, en el router o en `creatorRun`, o un archivo nuevo en el motor, y fallan |
| Suites de emulador del árbol integrado | **19/19**: las 14 del Harness más las 5 de producción (`f1d`, `filmmaker-servicio`, `productions-callable`, `productions`, `video-asincrono`). Dos corren sobre el emulador de Functions, admitido porque no hay secretos locales |

**El parche de §4 b–e** está preparado y no se ha aplicado a ninguna rama:
13 archivos, +84 / −27.
- Los 4 rótulos pasan a `TextoEnMayusculas` (en su prueba de interfaz, con un
  doble que deja el texto igual).
- Los 4 identificadores entran en la lista turca, con su porqué.
- Las 3 guardas de emulador quedan más estrictas.
- Las cercas de F1-D se re-anclan con sus tamaños.

La regla del corredor (§4 e) ya está en `harness/fase-1` (`27811f1`).

## 6. Lo que cambia para las personas

**Integrar no cambia nada que vean las personas.** Lo que cambia la experiencia
es **publicar `main`**.

Con el despliegue automático de Vercel activo, cualquier push a `main` es
publicar: el primero, sea cual sea, lleva `wee.zone` de `bfc622d` al `main`
integrado. Eso añade:
- la identidad consolidada y la cara pública opaca;
- Denunciar (`ReportSheet`);
- Weë Studio B3.10–B3.15: la interfaz nueva de Weë Studio, con imagen, vídeo y
  voz reales;
- cuatro idiomas nuevos: ja, tr, sv, hi;
- la pantalla de producción de Filmmaker, a la que lleva «Varias escenas»
  (`9e11731`).

Es un cambio de UX grande. La FASE 20 manda detenerse y pedir autorización
específica para algo así. Por eso el freno de Vercel
(`ops/vercel/vercel.sin-despliegue-automatico.json`) es la primera decisión.

## 7. Estrategias

| | Qué es | Consecuencias |
|---|---|---|
| **A** | Merge completo; Filmmaker visible al publicar | Lo más simple. Publica la interfaz de Filmmaker con sus reglas e índices aún sin desplegar: «Varias escenas» abriría una pantalla que falla al leer |
| **B** | Merge completo + una puerta en el cliente que deja «Varias escenas» como está hoy en producción, hasta que el dueño decida lanzar Filmmaker | El código vivo entra entero (`7f11d51` y `96b3f7a`, exactos) y la experiencia no cambia por Filmmaker. Cuesta un cambio pequeño de cliente con su prueba. La puerta se quita en un commit cuando se lance |
| **C** | Merge solo del servidor (sin el cliente de los 43) | Un *evil merge*: deja `main` con commits cuyo contenido no está. Rompe la trazabilidad de los tags `prod/*` y las suites de F1-C. No se recomienda |
| **D** | Cherry-pick de los commits de servidor | Duplica 43 commits con otros SHA y los tags `prod/*` dejan de estar en `main`. `permitido.mjs` seguiría bloqueando. No se recomienda |

**Recomendación técnica: B**, porque conserva a la vez el código exacto de
producción y la experiencia actual. La decisión de producto (si Filmmaker se ve
o no) es del dueño, y B la deja abierta sin bloquear la integración.

## 8. El camino

```
PRODUCCIÓN ACTUAL (tags prod/*, ops/produccion.json)
   ↓  1. rama local integracion/produccion = harness/fase-1 + merge --no-ff hotfix/r22-generatevideo
   ↓     (las 3 resoluciones de §3, en el commit del merge)
   ↓  2. commits de seguimiento: §4 b–e, la puerta de §7 B, y las traducciones de §4 a
   ↓  3. verificación local completa: cadena entera, 14 + 2 suites de emulador, tsc 0, web demo
CÓDIGO REPRODUCIBLE  ← tag integracion/<fecha> sobre el resultado
   ↓  4. push de la rama (NO de main) → GitHub
   ↓     Vercel creará una previsualización de la rama, como con cualquier rama
PR → main
   ↓  5. CI de tres niveles en el PR (repo público: minutos sin coste)
   ↓  6. ANTES de fusionar: decidir el freno de Vercel (§6)
   ↓     · con el freno en el PR, fusionar no publica la web;
   ↓     · sin él, fusionar publica wee.zone
main (GitHub)
   ↓  7. node ops/permitido.mjs --commit <merge> --funciones <las 34> --otros <los 5>  → 0
   ↓  8. WIF y entorno get-wee (node ops/iam/wif.mjs imprime los comandos)
APROBACIÓN del dueño en el entorno get-wee
   ↓  9. primer despliegue controlado: functions:spendCredits
DEPLOY con humo, observación, registro y tag
```

**Por qué el primer despliegue es `spendCredits`:**
- lleva el arreglo de seguridad pendiente (`assertAdmin`, H0 #24);
- ningún cliente lo usa;
- su humo esperado es 401/403;
- su marcha atrás a la revisión sin arreglo está bloqueada por diseño;
- recorre el camino entero (verificar, aprobar, WIF, desplegar, humo,
  observar, registrar, tag) con el menor riesgo posible.

## 9. Lo que el dueño autoriza (y lo que no hace falta)

| # | Autorización | Qué incluye |
|---|---|---|
| 2 | **Integración producción → main** | Crear la rama, el merge con §3, los arreglos de §4 b–e, re-anclar las cercas de F1-D (que incluye extender `61d2cdf` a todas las funciones en su próximo despliegue), la estrategia de §7 y el encargo de las traducciones de §4 a. Después, el push de la rama y el PR |
| — | Freno de Vercel | Activarlo antes de fusionar, o aceptar que fusionar publica wee.zone (§6) |
| 3 | CI/CD | Que corran los workflows en GitHub |
| 4 | WIF | Los comandos de `ops/iam/wif.mjs` y el entorno `get-wee` |
| 5 | Primer despliegue | `functions:spendCredits` desde el commit fusionado |

**No hace falta autorización para:**
- repetir este ensayo;
- preparar las traducciones en una rama propia sin fusionar;
- preparar los arreglos de §4 b–e como parche.

## 10. Los comandos exactos (cuando esté autorizado)

Los dos parches están en `ops/integracion/`.
`functions/test/integracion-preparada.test.mjs` fija qué tocan:
- `conflictos.patch`: solo la cadena de `npm test` y la prueba #63 de
  job-queue;
- `semantica.patch`: sus 13 archivos, nada de `functions/src`.

Así se ensayó, y así se ejecuta:

```
git switch -c integracion/produccion harness/fase-1
git merge --no-ff hotfix/r22-generatevideo           # 3 conflictos, los de §3
git checkout --ours functions/package.json functions/test/job-queue.test.mjs functions/test/i18n-preferencia-usuario.test.mjs
git apply ops/integracion/conflictos.patch
git add functions/package.json functions/test/job-queue.test.mjs functions/test/i18n-preferencia-usuario.test.mjs
git commit                                           # el merge, con su mensaje
git apply ops/integracion/semantica.patch && git commit -am "…§4 b–d…"
```

- **Si `functions/package.json` ha cambiado desde que se generó el parche**, la
  prueba 3b falla. En ese caso se regenera:
  - `node ops/integracion/unir-cadena.mjs <ours> <theirs> functions/package.json`
    sobre el merge;
  - `git diff HEAD --` de los dos archivos.
- **Después del merge:**
  - las traducciones (§4 a), en su propio commit;
  - la puerta de Filmmaker (§7 B), en el suyo;
  - la verificación completa.
- **Antes de cualquier push**, el freno de Vercel (§6).
