# Producción actual → main propuesto

Weë Agent Harness, FASE 3 (2026-10-01). Orden del dueño: «Antes de fusionar,
genera una comparación clara PRODUCCIÓN ACTUAL → MAIN PROPUESTO y verifica que
no se pierda ninguna capacidad existente.»

- **Main propuesto:** la rama local `integracion/produccion`, sin fusionar en
  `main` y sin subir.
- **Producción actual:** `ops/produccion.json`, verificado en la auditoría H0.
- **Lo regenera** `node ops/integracion/capacidades.mjs`.
- **Lo fija en cada commit** `functions/test/capacidades-conservadas.test.mjs`,
  que además es una puerta del nivel 3 de la CI.

## 1. Ninguna capacidad viva se pierde

| Capacidad | Vivo (commit) | En producción | En el main propuesto | Se pierde | Sustituido por algo vivo | Nuevo |
|---|---|---|---|---|---|---|
| Funciones | 34 vivas (ops/produccion.json) | 34 | 35 | ninguna | — | 1 (elements) |
| Pantallas de wee.zone | bfc622d | 46 | 47 | ninguna | — | 1 (Production) |
| Textos (es) de wee.zone | bfc622d | 2301 | 2964 | ninguna | 7 (wall.reportOffensive → moderation.reasonHate, wall.reportOther → moderation.reasonOther, wall.reportPost → moderation.report, wall.reportSent → moderation.successTitle, wall.reportSpam → moderation.reasonSpam, wall.reportThanks → moderation.successBody, wall.reportWhy → moderation.chooseReason) | 670 |
| Idiomas de wee.zone | bfc622d | 11 | 15 | ninguna | — | 4 (hi, ja, sv, tr) |
| Pantallas de wee-app.web.app | afbc2df | 46 | 47 | ninguna | — | 1 (Production) |
| Textos (es) de wee-app.web.app | afbc2df | 2318 | 2964 | ninguna | — | 646 |
| Idiomas de wee-app.web.app | afbc2df | 11 | 15 | ninguna | — | 4 (hi, ja, sv, tr) |
| Rutas de las reglas de Firestore | c3515b3 | 55 | 66 | ninguna | — | 11 |
| Índices compuestos | c3515b3 | 29 | 36 | ninguna | — | 7 |
| Rutas de las reglas de Storage | ced0585 | 10 | 10 | ninguna | — | 0 |

- Los siete textos de `wee.zone` que ya no están no se pierden: los sustituyó
  «Denunciar» de verdad (`c3515b3`, `ReportSheet` + `reportContent`), vivo en
  `wee-app.web.app` y en las funciones desde el 2026-09-20.
- `elements` es la única función nueva: está en el código y no en producción.
  Queda fuera de todos los grupos de despliegue hasta que el dueño decida
  (`ops/despliegue/grupos.json`).

## 2. Qué cambia en cada función si se redespliega desde el main propuesto

«Su código» es el cierre de imports de su módulo de entrada. El cambio se mide
entre su commit vivo y el main propuesto. Las dos push se definen en
`index.ts`, así que su cierre cuenta todo el índice, aunque lo que ejecutan
son `social/avisos.ts` y `social/econtact.ts`.

| Función | Commit vivo | Grupo | Su código si se redespliega (cierre de imports) |
|---|---|---|---|
| `acceptEContact` | `ced0585` | g1-cambio-minimo | 2 archivos en su código; cambian: 1 archivos · 21 + |
| `burnViewOnce` | `ced0585` | g3-contenido-y-avisos | 68 archivos en su código; cambian: 45 archivos · 14200 + 124 − |
| `deleteAsset` | `ced0585` | g3-contenido-y-avisos | 65 archivos en su código; cambian: 43 archivos · 14064 + 120 − |
| `requestEContact` | `ced0585` | g1-cambio-minimo | 2 archivos en su código; cambian: 1 archivos · 21 + |
| `votePoll` | `ced0585` | g1-cambio-minimo | 2 archivos en su código; cambian: 1 archivos · 21 + |
| `brainQuote` | `ced0585` | g4-ia-sin-cobro | 152 archivos en su código; cambian: 105 archivos · 24417 + 219 − |
| `creatorQuote` | `ced0585` | g4-ia-sin-cobro | 193 archivos en su código; cambian: 145 archivos · 40006 + 230 − |
| `engineAdmin` | `ced0585` | g3-contenido-y-avisos | 107 archivos en su código; cambian: 67 archivos · 15414 + 173 − |
| `publicPostPage` | `ced0585` | g1-cambio-minimo | 3 archivos en su código; cambian: 1 archivos · 21 + |
| `seedanceCallback` | `ced0585` | g6-video-y-filmmaker | 144 archivos en su código; cambian: 101 archivos · 23624 + 189 − |
| `getCreditCost` | `ced0585` | g2-credits-lectura-y-admin | 76 archivos en su código; cambian: 47 archivos · 14154 + 118 − |
| `creditsAdmin` | `bfc622d` | g2-credits-lectura-y-admin | 76 archivos en su código; cambian: 47 archivos · 14098 + 288 − |
| `getCreditHistory` | `bfc622d` | g2-credits-lectura-y-admin | 76 archivos en su código; cambian: 47 archivos · 14098 + 288 − |
| `getCreditsBalance` | `bfc622d` | g2-credits-lectura-y-admin | 76 archivos en su código; cambian: 47 archivos · 14098 + 288 − |
| `grantCredits` | `bfc622d` | g2-credits-lectura-y-admin | 76 archivos en su código; cambian: 47 archivos · 14098 + 288 − |
| `refundCredits` | `bfc622d` | g2-credits-lectura-y-admin | 76 archivos en su código; cambian: 47 archivos · 14098 + 288 − |
| `sendMessagePushNotification` | `bfc622d` | g3-contenido-y-avisos | 230 archivos en su código; cambian: 171 archivos · 49564 + 452 − |
| `sendPushNotification` | `bfc622d` | g3-contenido-y-avisos | 230 archivos en su código; cambian: 171 archivos · 49564 + 452 − |
| `spendCredits` | `bfc622d` | g0-seguridad | 76 archivos en su código; cambian: 47 archivos · 14098 + 288 − |
| `avatarReplacement` | `bfc622d` | g5-ia-con-gasto | 103 archivos en su código; cambian: 66 archivos · 15705 + 365 − |
| `generateAvatarWithGemini` | `bfc622d` | g5-ia-con-gasto | 103 archivos en su código; cambian: 66 archivos · 15705 + 365 − |
| `restorePurchase` | `bfc622d` | g7-critico | 76 archivos en su código; cambian: 47 archivos · 14098 + 288 − |
| `validatePurchase` | `bfc622d` | g7-critico | 76 archivos en su código; cambian: 47 archivos · 14098 + 288 − |
| `nacimientoDeCuenta` | `0123cdc` | g7-critico | 8 archivos en su código; cambian: 2 archivos · 476 + |
| `moderationAdmin` | `c3515b3` | g1-cambio-minimo | 12 archivos en su código; cambian: 2 archivos · 476 + |
| `reportContent` | `c3515b3` | g1-cambio-minimo | 12 archivos en su código; cambian: 2 archivos · 476 + |
| `brainChat` | `2da2881` | g5-ia-con-gasto | 152 archivos en su código; cambian: 90 archivos · 18696 + 161 − |
| `mediaCanary` | `4bb099e` | g7-critico | 92 archivos en su código; cambian: 28 archivos · 7116 + 81 − |
| `creatorRun` | `5d87f1f` | g5-ia-con-gasto | 193 archivos en su código; cambian: 61 archivos · 15110 + 121 − |
| `creatorChat` | `05ab31b` | g4-ia-sin-cobro | 193 archivos en su código; cambian: 43 archivos · 2208 + 184 − |
| `barridoDeLiquidacion` | `96b3f7a` | g6-video-y-filmmaker | 144 archivos en su código; cambian: 12 archivos · 202 + 27 − |
| `productions` | `96b3f7a` | g6-video-y-filmmaker | 71 archivos en su código; cambian: 3 archivos · 54 + 6 − |
| `shots` | `96b3f7a` | g6-video-y-filmmaker | 76 archivos en su código; cambian: 5 archivos · 93 + 6 − |
| `generateVideo` | `7f11d51` | g6-video-y-filmmaker | 152 archivos en su código; cambian: 13 archivos · 235 + 28 − |

**Lo que esta tabla dice:**
- **Cambio mínimo.** Encuestas, ËContact y la página pública solo ganan el
  techo de instancias. Denunciar y la moderación, 2 archivos.
- **Credit Engine.** Las callables de Credits cargan unos 47 archivos
  cambiados desde `bfc622d`, incluido `61d2cdf`. `spendCredits` es la
  primera en estrenarlo, y nadie la llama.
- **Vídeo y Filmmaker.** Ya corren la rama de producción: solo cambian los
  arreglos del Harness (13 archivos en `generateVideo`).
- **Grandes cambios.** `creatorQuote`, `brainQuote` y `seedanceCallback`
  (desde `ced0585`) traen el Core, el Algorithm Engine y el runtime de las
  fases F12 y S1/S2. Por eso van en los grupos de IA, con observación.

## 3. Qué cambia para las personas

**Integrar no cambia nada visible.** Lo visible llega al **publicar** la web,
que con el freno de Vercel es una acción deliberada.

### Cambios de cliente desde `main` (`dad0ca2`), sin contar los diccionarios

| Origen | Archivos | Qué |
|---|---|---|
| Los cuatro idiomas (`i18n/hi-in`, 7 commits) | 72 (+785 / −523) | ja, tr, sv, hi. Los rótulos en mayúsculas pasan a `TextoEnMayusculas` (mayúsculas con el idioma, «İ» en turco), sin espaciado entre letras en escrituras que se unen (hindi), y el título de la pestaña se traduce. En es/en se ve igual |
| Producción (los 43 commits) | 56 (+9 900) | Weë Filmmaker: pantalla de producción, storyboard, panel Director, servicio y estado. **Detrás de la puerta `FILMMAKER_EN_LA_APP = false`:** «Varias escenas» se ve como en `main` (bloqueada con su motivo, en su sitio) y la producción no tiene enlace |
| El Harness | 0 | Ninguna pantalla. Solo los 4 rótulos de Filmmaker con `TextoEnMayusculas`, inalcanzables con la puerta cerrada |

**Comprobado:** con la puerta cerrada, el catálogo del Studio es idéntico al de
`main`, entrada a entrada (`filmmaker-navegacion` C3–C3c).

### Si un día se publica la web (`wee.zone`, hoy `bfc622d`)

Además de lo anterior, llega todo lo que `main` ya tiene y la web no:
- la identidad consolidada y la cara pública opaca;
- «Denunciar» de verdad;
- Weë Studio B3.10–B3.15: la interfaz nueva, con imagen, vídeo y voz reales;
- los cuatro idiomas nuevos.

Publicarla es una decisión del dueño ([DECISIONES-PENDIENTES.md](DECISIONES-PENDIENTES.md)).

## 4. Reglas e índices

- **Firestore.** Lo vivo (`c3515b3`) tiene 55 rutas y 29 índices. El main
  propuesto, 66 rutas y 36 índices.
- **Nada vivo desaparece**, pero desplegarlos publica lo que `main` acumuló
  desde el 2026-09-20 (las de Filmmaker incluidas).
- **Es un despliegue aparte, con su diff revisado.**
  `ops/permitido.mjs --otros firestore:rules` lo enseña y no deja publicar
  una versión anterior a la viva.
