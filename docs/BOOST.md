# Boost — promocionar publicaciones propias dentro de Weë

> Estado (2026-11-04): **construido y probado en local y en emulador; cerrado por defecto y sin desplegar.**
> Falta una pieza que no es de Boost: el servicio `social_boost` en el catálogo del Credit Engine (§7). Hasta que
> exista, Boost no reserva nada y lo dice en pantalla.

Boost es social: vive solo en la versión **App** (Inicio, Wäll, menú ⋯ de una publicación). **Weë Creator** no lo
monta ni lo enlaza (`functions/test/boost-interfaz.test.mjs` §18).

---

## 1. Auditoría (antes de construir)

| Pieza | Qué había | Conclusión |
|---|---|---|
| App | `screens/BoostScreen.tsx`: interfaz completa sin backend (objetivo, público, duración, presupuesto, resumen, botón «muy pronto»). Ruta `Boost {tipo, id}` y enlace `boost/:tipo/:id`. Entrada desde el ⋯ de una publicación propia (`PostCard`) y desde una Página (`WeePageScreen`). | Se reutilizó la gramática visual; la pantalla se rehízo para hablar con un servidor de verdad. |
| Demo YC (`wt-demo-yc`) | Solo un botón «Impulsar» en la Página que abre un aviso «Llega pronto». Ninguna cifra, ninguna campaña. | Nada que migrar salvo el tono: no prometer. |
| Arquitectura social | Publicaciones en `posts` (`userId` = identidad: `uid` o `hidi_<uid>`), dos caras por cuenta, `cuentaDeIdentidad` como resolutor canónico, ËContact (`econtacts`, `status: accepted`) en lugar de seguidores, comunidades (`joinedCommunities`), país DECLARADO en el perfil (`users.country`, elegido en el onboarding). WeëPages (`functions/src/social/pages.ts`) son entidades de la cuenta, sin distribución. | Propietario = la cuenta de la identidad autora. Públicos posibles con datos reales: todo Weë, ËContact, comunidad, país declarado. |
| Feed / ranking | `getMuroGeneralPaginado` = consulta cronológica del cliente sobre `posts`, filtrada por secciones. **No había ningún mecanismo** para mostrar una publicación concreta a otras personas. | Hacía falta construir la distribución (§4) para que «activa» signifique algo. |
| Credit Engine | `spendCredits` (reserva AUTHORIZED con `requestId` idempotente y huella opcional), `completeCredits({ finalAmount })` (liquida y devuelve la diferencia como ajuste), `refundCredits` (devuelve todo, sin doble reembolso), `readBalance` (lee sin escribir). Todo en transacciones; `creditTransactions` + `creditStats`. El motor está cercado byte a byte (`_bloques-autorizados.mjs`). | Primitivas suficientes para reservar → liquidar → devolver. Falta el **servicio** en el catálogo (§7). |
| Financial Core | `core/financial` conoce un propósito de pago `BOOST` (pago con dinero). | No se usa: Boost se paga con Credits ya comprados. |
| Reglas | Sin colecciones de Boost. | Bloque nuevo al final de `firestore.rules`. |
| Pruebas | `boost-interfaz.test.mjs` vigilaba «sin backend». | Reescrita para la interfaz real; nuevas `boost-motor` (cadena) y dos de emulador. |

---

## 2. Qué hace

1. **Elegir la publicación**: solo las de la cuenta, de sus dos caras (Perfil Real y Perfil Weë), públicas, originales
   (no reposts). Una billetera para las dos caras.
2. **Objetivo**: `reach` (que la vean más) o `interaction` (que la abran más). Hoy decide qué métrica se destaca; la
   entrega es la misma y la pantalla lo dice.
3. **Público**: `everyone` (cualquier cuenta que abra el Inicio, menos la propia), `contacts` (ËContact aceptados de la
   identidad que publicó), `community` (miembros de la comunidad de la publicación; solo si tiene).
4. **País** (opcional, con `everyone` y `community`): se compara con el país que cada persona **eligió en su perfil**.
   Nunca IP ni GPS, y nunca cambia el idioma de nadie.
5. **Duración y presupuesto** en Credits, dentro de los límites configurables (§6).
6. **Estimación**, rotulada como tal: cuántas cuentas cumplen HOY el público (conteo real en Firestore). Si no se
   puede contar, «No hay estimación disponible». No es alcance y no se promete nada.
7. **Resumen y confirmación** con la regla del dinero explicada. Solo al confirmar se reserva.
8. **Estado**: `active` (se ofrece en el Inicio de otras cuentas), `settling` (cerrándose), `ended` (con motivo:
   `completed`, `cancelled`, `post_unavailable`).
9. **Historial** (`BoostCampaigns`) y **detalle** (`BoostCampaign`) con reservado, consumido y devuelto.
10. **Métricas reales**: impresiones, personas alcanzadas, aperturas y días con entrega. Sin eventos: «Todavía no hay
    datos».
11. **Terminar** en cualquier momento con devolución justa de lo no consumido.

---

## 3. Arquitectura

| Capa | Archivo |
|---|---|
| Modelo puro (validación, configuración, consumo, huella) | `functions/src/boost/modelo.ts` |
| Motor (crear, terminar, listar, servir, clic, barrer) | `functions/src/boost/motor.ts` |
| Puertas | `functions/src/boost/index.ts` → callable **`boost`** (`action`: `options` · `estimate` · `myPosts` · `create` · `end` · `list` · `get` · `serve` · `click`) y programada **`boostSweep`** (cada 15 min) |
| Exportación | `functions/src/index.ts` (una línea) |
| Cliente | `services/boostService.ts` (solo la callable), `screens/BoostScreen.tsx`, `screens/BoostCampaignsScreen.tsx`, `screens/BoostCampaignScreen.tsx`, `components/boost/{PiezasDeBoost,MarcoDeBoost,PromotedSlot}.tsx` |
| Distribución en el Inicio | `components/boost/PromotedSlot.tsx`, montado en `WebLandingScreen` (web) y `LandingScreen` (nativo) |
| Rutas | `Boost {tipo, id}` (`id: 'elegir'` abre el selector) · `BoostCampaigns` → `boost/promociones` · `BoostCampaign {campaignId}` → `boost/promocion/:campaignId` |
| Textos | `i18n/textos/<16 idiomas>/boost.ts` (claves semánticas, plurales `_one/_other`, ruso con `_few/_many`) |

**Colecciones** (todas escritas solo por el servidor):

| Colección | Contenido | Reglas |
|---|---|---|
| `boostCampaigns/{bst_<requestId>}` | dueño (`ownerAccountId`), identidad autora, publicación, objetivo, público, presupuesto, duración, servicio, `requestId`, huella, estado, ventana (`startsAt`/`endsAt` en ms), vista previa, `metrics {impressions, reach, clicks, byDay}`, `settlement {consumed, refunded, deliveredDays, reason, frozenAt, settledAt}` | lee solo su cuenta; nadie escribe |
| `boostCampaigns/{id}/impressions/{viewer}_{día}` | una impresión por cuenta, campaña y día | cerrada |
| `boostCampaigns/{id}/reach/{viewer}` | primera vez que esa cuenta la vio (alcance único) | cerrada |
| `boostCampaigns/{id}/clicks/{viewer}` | apertura única | cerrada |
| `boostPostLocks/{postId}` | una sola campaña viva por publicación | cerrada |
| `boostSettings/config` | configuración (§6) | cerrada |

Quién vio qué no lo lee ningún cliente, ni el dueño: él recibe los totales.

---

## 4. Distribución real (por qué «activa» es verdad)

`PromotedSlot` pide al servidor (`serve`) UNA publicación promocionada al montar el Inicio. El servidor:

1. lee hasta `serveScan` campañas `active` no vencidas de **otras** cuentas, ordenadas por menos impresiones (rotación
   justa);
2. descarta las que esa cuenta ya vio hoy (frecuencia: 1 por cuenta, campaña y día);
3. comprueba el público con datos guardados (país declarado, `joinedCommunities` del Perfil Real, ËContact aceptado
   entre la identidad autora y cualquiera de las del que mira);
4. comprueba que la publicación sigue siendo promocionable;
5. en una transacción registra la impresión (y el alcance si es la primera vez) y devuelve la publicación.

Se pinta con la misma `PostCard` del muro, con el rótulo «Promocionado». Abrirla registra una apertura, que el
servidor solo acepta si de verdad se le sirvió a esa cuenta. Si no hay nada que servir, no se pinta nada.

Límite honesto: la impresión se registra al **servir** el espacio del Inicio (no hay medición de visibilidad en
pantalla). Está documentado como «entregas en el Inicio».

---

## 5. Dinero: reservar → liquidar → devolver (solo por el Credit Engine)

```
confirmar ──► boost.create ──► spendCredits({ userId: cuenta, service: 'social_boost', requestId: 'bst_<rid>',
                                            amount: presupuesto validado, fingerprint, source: 'boost' })   AUTHORIZED
                              └─► transacción: crea boostCampaigns/bst_<rid> (active) + boostPostLocks/{post}
                                  └─ si falla ──► refundCredits({ requestId: 'bst_<rid>' })                  REFUNDED

terminar / vencer / publicación borrada
  ├─ transacción: active → settling, CONGELA consumed = floor(presupuesto × díasConEntrega / duración)
  ├─ consumed > 0 ──► completeCredits({ requestId, finalAmount: consumed })   COMPLETED + ajuste de la diferencia
  │  consumed = 0 ──► refundCredits({ requestId })                            REFUNDED (todo vuelve)
  └─ transacción: settling → ended, libera el bloqueo
```

- **No se cobra nada antes de confirmar**: `options`, `estimate` y `myPosts` no reservan (probado).
- **El importe lo fija el servidor**: el presupuesto validado. `total`, `price`, `amount` del cliente no existen.
- **Idempotencia**: `requestId` del cliente (uno por petición, reutilizado en los reintentos) → id de campaña y de
  reserva idénticos; huella SHA-256 de (cuenta, publicación, objetivo, público, país, presupuesto, duración). El mismo
  `requestId` con otros datos → `conflicto` (el Credit Engine lo rechaza como `idempotency_conflict`). Doble clic
  simultáneo → una reserva (probado en memoria y en el emulador).
- **Se paga lo entregado**: un día cuenta si hubo al menos una impresión real ese día. Sin ninguna entrega se devuelve
  todo. Redondeo hacia abajo: nunca se cobra de más.
- **Fallos**: si el Credit Engine falla al liquidar, la campaña queda en `settling` con el número congelado y
  `boostSweep` lo reintenta; `completeCredits`/`refundCredits` son idempotentes. Si el proceso muere entre reservar y
  crear la campaña, `boostSweep` devuelve la reserva huérfana (`source: 'boost'`, `AUTHORIZED`, sin campaña, > 15 min).
- **Boost no escribe saldos**: ni `creditsBalance`, ni `creditTransactions`, ni `creditStats`. Lee el saldo con
  `readBalance` (no escribe).

**Decisión justificada sobre lo no entregado**: se reserva TODO el presupuesto al confirmar (para que la persona no
gaste dos veces el mismo saldo y la campaña no pueda quedarse sin fondos a mitad), pero solo se CONSUME lo de los días
con entrega real; lo demás vuelve. Así no se cobra distribución que no ocurrió.

---

## 6. Configuración (`boostSettings/config`) — decisiones del dueño

| Campo | Por defecto | Nota |
|---|---|---|
| `enabled` | **false** | Boost no contrata nada hasta que el dueño lo abra (servir también se apaga). |
| `durations` | `[1, 3, 7]` | de la propuesta ya escrita en `docs/ECONOMIA-CREDITS.md` §6 |
| `minBudget` / `maxBudget` / `budgetStep` | 500 / 10 000 / 500 | idem; **placeholder**, no es una lista de precios |
| `serveScan` | 30 | cuántas campañas se miran por hueco |

Una configuración incoherente cae a los valores por defecto **y cerrada**. No hay CPM ni precio por impresión: la
persona elige el presupuesto.

---

## 7. Dependencias con Credits (NO resueltas aquí, a propósito)

1. **Servicio `social_boost` en el catálogo** (`functions/src/credits/creditCosts.ts`: `CREDIT_COSTS` y
   `SERVICE_LABEL`). Sin él, `spendCredits` responde `INVALID_SERVICE`. Boost lo comprueba antes
   (`isCreditService('social_boost')`) y responde `servicio-pendiente` sin tocar nada. El importe lo pasa Boost
   (`amount`), así que el valor de catálogo es irrelevante para el precio (1 sería suficiente); importa para que el
   libro y `creditStats.byService` lo registren como Boost y no como otra cosa. No se usó un servicio existente
   porque eso falsearía la contabilidad.
2. Si el dueño quiere un margen o un modo de precio distinto para Boost, irá en `CREDIT_POLICY`, también del Credit
   Engine.
3. Nada más: reserva, liquidación parcial y devolución ya existen y se usan tal cual.

Los conceptos que Boost escribe en `creditTransactions.reason` («Boost de una publicación», «Boost no iniciado»,
«Boost sin entregas · se devolvió todo») están catalogados en `i18n/textos/{es,en,da}/servidor/movimientos.ts`
(`boostReserva`, `boostNoIniciado`, `boostSinEntregas`) para que el historial los pinte en el idioma de quien mira.
La etiqueta del servicio (`SERVICE_LABEL.social_boost` y su `servicio…` en `movimientos`) llegará con el punto 1.

Las pruebas que ejercitan el motor real (`boost-motor`, `boost-flujo.emulator`) registran el servicio **en su propio
proceso**, simulando exactamente esa incorporación, y lo dicen en su cabecera.

---

## 8. Qué falta para campañas reales

- El servicio `social_boost` (§7) y abrir `boostSettings/config.enabled`.
- Desplegar `boost`, `boostSweep`, las reglas nuevas y, si se quiere listar por fecha en servidor, ningún índice (hoy
  se ordena en memoria).
- **Moderación de lo promocionado**: hoy solo se exige que la publicación sea pública y original; no hay revisión
  previa ni se mira si tiene reportes abiertos (Moderation no actúa sobre publicaciones).
- **Optimización por objetivo**: no existe; el objetivo solo cambia la métrica destacada.
- **Medición de visibilidad en pantalla**: la impresión es «servida en el Inicio», no «vista X segundos».
- **Público por la cara Weë**: país y comunidades se leen del Perfil Real de quien mira.
- **Páginas (WeëPages)**: siguen sin poder impulsarse; la pantalla lo dice.
- **Entrada en el menú ☰**: no se añadió (el menú es una decisión de producto); se llega por el ⋯ de una publicación y
  por «Mis promociones» dentro de Boost.
- Revisión nativa de los 15 diccionarios traducidos.

## 9. Pruebas

- `functions/test/boost-motor.test.mjs` (cadena): modelo, puerta, autorización, reserva, idempotencia, privacidad,
  entrega, liquidación, barrido y cuadre, con el Credit Engine real en memoria.
- `functions/test/boost-interfaz.test.mjs` (cadena): cliente sin Credits ni escrituras, confirmación antes de reservar,
  cifras solo del servidor, i18n en los 16 diccionarios, rutas, distribución solo en la App, reglas.
- `functions/test/boost-reglas.emulator.mjs`: reglas contra el emulador (proyecto propio `demo-wee-boost-reglas`).
- `functions/test/boost-flujo.emulator.mjs`: flujo completo con transacciones reales (proyecto `demo-wee-boost-flujo`).
