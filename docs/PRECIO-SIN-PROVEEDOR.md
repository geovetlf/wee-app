# Precio sin proveedor — tres alternativas, decisión pendiente

Weë Agent Harness, FASE 1 (2026-09-30). **La decisión es del dueño y está
PENDIENTE.** Este documento solo describe consecuencias; no cambia nada.

## De dónde sale el 0

**Dónde.** Una petición de Weë AI se cotiza en `estimatePlan`
(`functions/src/creator/credits.ts`). Cada paso del plan se cotiza así:

| Paso | Cómo se cotiza hoy | Sin ningún proveedor disponible |
|---|---|---|
| Vídeo (`video.*`) | Tarifa oficial de Seedance para el modelo que toca (`priceVideo`) | **Tarifa oficial**: no depende de la disponibilidad |
| Imagen (`image.*`) | El modelo más barato que sirve, entre los que tienen clave (`priceImage`) | **Tarifa oficial** del modelo de producción («la escalera ideal», `chooseImageModel` sin filtro) |
| Texto, voz, búsqueda y el resto, con `pricingMode: 'real'` | Los Credits del primer candidato del router | **0** (`decision.candidates[0]?.estimatedCredits ?? 0`) |
| Cualquiera, con `pricingMode: 'simulated'` | Catálogo de precios de prueba | Precio de prueba: nunca 0 |
| Un mensaje a Weë Brain (`brainQuote`) | Su propio precio por tokens (`priceBrainMessage`) | No le afecta |

**Cuándo pasa.** El router se queda sin candidatos, en modo real, cuando hay
proveedores configurados pero todos quedan fuera
(`functions/src/engine/router.ts`). Pasa si:
- los ha desactivado la administración;
- están en pausa por fallos recientes;
- han llegado a su límite diario de llamadas o de gasto;
- se ha agotado el presupuesto diario global;
- está encendido el interruptor `iaDetenida`;
- ningún modelo cubre la calidad pedida.

La demo (`mock`) solo entra cuando no hay **ningún** proveedor real
configurado. Por eso este caso no se ve en desarrollo.

**Qué es hoy una decisión fijada.** `functions/test/estimate-plan.test.mjs`
lo fija así: «sin candidatos el paso de texto cuesta 0, no un valor
inventado».
- La FASE 1 preparó un cambio y lo **revirtió** por eso.
- Cambiarlo es una decisión de producto, no un arreglo.

## A. Precio 0 (lo que hay hoy)

**Técnicas**
- No hay que cambiar nada.
- `holdCredits` no reserva nada si el importe es ≤ 0, y `settleCredits` no
  cobra nada si no hubo reserva.
- Un trabajo cotizado a 0 corre **sin reserva**:
  - **si al ejecutar ya hay proveedor**, el resultado se entrega y **no se
    cobra**. Pasa si:
    - terminó la pausa por fallos;
    - se reabrió el cupo del día;
    - alguien apagó el interruptor;
    - se reactivó un proveedor;
  - **si sigue sin haberlo**, el motor lanza `NOT_AVAILABLE` y no se cobra.

**Económicas**
- Cada trabajo que cae en esa ventana es una **generación regalada**: Weë paga
  al proveedor y la persona no paga.
- Por unidad es poco: son pasos de texto, voz o búsqueda; imagen y vídeo nunca
  cotizan 0.
- No está acotado: la ventana más probable es la pausa por fallos, que se abre
  y se cierra sola.
- Los topes de gasto de la FASE 8 no lo empeoran: cuando cortan, la ejecución
  también falla.

**UX**
- La tarjeta del plan enseña **«Sin costo»** (`weeai.noCost`). Es falso en los
  dos desenlaces:
  - o era gratis por accidente;
  - o falla con «no disponible» justo después de haber prometido que no
    costaba nada.
- El precio deja de ser fiable: un 0 también es un precio inventado.

## B. Tarifa oficial (lo que ya hacen imagen y vídeo)

**Técnicas**
- Sin candidatos, el paso se cotiza con el precio del modelo que el router
  elegiría en condiciones normales: el primero de la cadena por defecto, con la
  tarifa oficial de `credits/aiPricing.ts` y el suelo de coste.
- Hace falta una función pura de «precio de referencia» por capacidad, como
  `chooseImageModel(need)` sin filtro de disponibilidad, más su prueba.
- **Hay que cambiar** la comprobación fijada de `estimate-plan`.
- La reserva pasa a existir:
  - si al ejecutar hay proveedor, se cobra lo de siempre;
  - si no, el motor falla y `settleCredits` **devuelve la reserva sola**, como
    hoy con imagen y vídeo.
- Sin cambios en el cliente ni en i18n.

**Económicas**
- Desaparece la generación regalada: todo lo que corre se cobra a tarifa
  oficial, nunca por debajo del coste.
- Si el proveedor que acaba sirviendo cuesta más que la referencia, la
  diferencia la absorbe Weë: se cobra como mucho lo reservado. Si cuesta menos,
  se cobra lo usado y se devuelve el resto.

**UX**
- La tarjeta enseña un precio real (≈ N Credits), coherente con imagen y vídeo.
- Si de verdad no hay servicio, la persona lo sabe **después** de pulsar
  Crear:
  - ve el error;
  - ve una reserva y su devolución en el historial de Credits;
  - no pierde nada, pero ve un movimiento de ida y vuelta.

## C. «No disponible» (ni se cotiza ni se deja crear)

**Técnicas**
- El presupuesto deja de devolver un número para ese paso y devuelve «no
  disponible», por ejemplo `credits: null` o `unavailable: true`. Eso cambia
  el contrato de `creatorQuote` y del cliente.
- `PlanCard` necesita un estado nuevo: «Crear» desactivado y un aviso.
- `creatorRun` debe negarse a ejecutar un plan cotizado así, o dejar el error
  de hoy.
- Solo en modo real: en demo todo debe seguir funcionando con precios de
  prueba (CLAUDE.md).
- Si se aplica también a imagen y vídeo por coherencia, cambia lo que hoy ya es
  la tarifa oficial.
- Hay que cambiar `estimate-plan`, las pruebas del cliente y las de i18n.

**Económicas**
- Ni generación regalada ni reservas inútiles.
- Puede perderse la petición: la persona se va en vez de reintentar.
- Coste para Weë: cero.

**UX**
- Es lo más honesto: se sabe **antes** de intentarlo.
- Pero es una **interfaz nueva** dentro de Weë AI, cuyas pantallas son la
  referencia visual definitiva (CLAUDE.md §5). Necesita:
  - aprobación de diseño;
  - textos nuevos con `t()` en los 15 idiomas, con el proceso profesional para
    ja/tr/sv/hi.
- El aviso nunca puede nombrar proveedores.
- Es una foto del momento: el servicio puede volver segundos después, y hay
  que volver a cotizar.

## En una tabla

| | A · 0 (hoy) | B · Tarifa oficial | C · No disponible |
|---|---|---|---|
| Cambia código | No | Servidor (`credits.ts`) | Servidor + cliente + i18n |
| Cambia pruebas fijadas | No | `estimate-plan` | `estimate-plan`, cliente, i18n |
| Generación regalada | **Sí**, en la ventana | No | No |
| Reserva y devolución visibles en un fallo | No | **Sí** | No |
| Lo que ve la persona | «Sin costo», a veces falso | Un precio real | «No disponible» antes de intentarlo |
| Coherencia con imagen y vídeo | No | **Sí** | Solo si también cambian ellos |
| Interfaz nueva | No | No | **Sí** |

## Mientras no se decida

Sigue A, tal como lo fija `estimate-plan`.

La alerta «IA no disponible» de la FASE 14 ([OBSERVABILITY.md](OBSERVABILITY.md))
avisa cuando las peticiones se quedan sin proveedor: es justo la ventana en la
que A puede regalar o prometer en falso.
