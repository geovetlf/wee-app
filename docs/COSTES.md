# Controles de coste de Weë — qué hay, qué está vivo y qué falta

Weë Agent Harness, FASE 10 (2026-10-01).

- **La regla del dueño:** «Minimiza al máximo los costes operativos, excepto
  los créditos/gasto propio de las IAs que forman parte del producto. NO
  cambies precios ni decisiones de producto sin preguntarme.»
- **Este documento no cambia ningún valor.** Dice dónde está cada control, si
  ya protege producción y qué hace falta para que lo haga.
- **Cambiar un valor en producción** (una escritura en `aiSettings`/`aiProviders`)
  es una autorización del dueño.

## El estado de cada control

| Control | Dónde | ¿Protege producción hoy? | Para que proteja |
|---|---|---|---|
| **Techo de instancias** (`maxInstances`) | `functions/src/opciones.ts`: 20 por función (`publicPostPage`, 10) | Solo en las funciones ya desplegadas con él; seis no lo tenían (H0 §27) | Los despliegues por grupos (`ops/despliegue/grupos.json`) |
| **Cupo por persona y día** | `aiSettings/global.limits.perUserPerDay`; por defecto texto 400 · visión 200 · imagen 80 · vídeo 12 · voz 60 · documento 100 | **Sí**, con los valores por defecto. Lo de H0 #20 (que un ajuste se fusione y no borre los demás) llega con el despliegue | Grupos g4–g6 |
| **Cupo por proveedor** (`maxCallsPerDay`) | `aiProviders/{id}.limits`; Seedance 500 por defecto | **Sí** | — |
| **Tope de gasto diario por proveedor** (`maxUsdPerDay`) | `aiProviders/{id}.limits.maxUsdPerDay` | No: el código no está desplegado y no tiene valor | Desplegar g4–g6 y que el dueño fije una cifra |
| **Tope de gasto diario de todo Weë** (`maxUsdPerDay`) | `aiSettings/global.maxUsdPerDay` | No: igual | Igual. Al llegar, la IA se para sin cobrar y salta su alerta |
| **Tope por petición** (`maxCredits`) | `prefs.maxCredits` del router; `budget.maxCredits` del Core | Sí, donde una puerta lo pasa (el router salta lo que lo supera) | — |
| **Interruptor de la IA** (`iaDetenida`) | `aiSettings/global.iaDetenida` | No: el código no está desplegado | Desplegar g4–g6. Apagado por defecto |
| **Presupuesto de tiempo de un trabajo** | El plazo del trabajo llega al router (H0 #16); `timeoutsMs` por modalidad | Parcial: los `timeoutsMs` sí; el plazo, con el despliegue | g5–g6 |
| **Reintentos solo seguros** | El router prueba el siguiente proveedor de la cadena tras un error y registra cada intento. El vídeo no tiene respaldo (solo Seedance). Un POST de vídeo sin respuesta es un **desenlace desconocido**: no se reintenta ni se reembolsa, se reconcilia (`e90b9bb`). El sondeo tolera 3 fallos pasajeros (H0 #3) | Vídeo: sí (producción corre `7f11d51`). El sondeo tolerante, con el despliegue | g6 |
| **Reconciliación de trabajos desconocidos** | `barridoDeLiquidacion`, cada 5 min | **Sí** (desplegado desde `96b3f7a`) | — |
| **Deduplicación e idempotencia** | `requestId` en el Credit Engine (`61d2cdf`: misma cuenta y servicio, y con huella, mismo importe); el reclamo atómico de `creatorRun` (H0 #9); el avatar (H0 #11); `messageId` en Weë Brain | En parte: el Credit Engine ya es idempotente y `61d2cdf` vive en `generateVideo`; H0 #9 y #11, con el despliegue | g5–g6 |
| **Máximo por despliegue** | 6 funciones (`MAX_FUNCIONES_POR_DESPLIEGUE`) | Sí, en el workflow | — |
| **El coste de lo que falla después de llegar al proveedor** (H0 #22) | El router anota `providerCostStatus: 'desconocido'` y el coste estimado en la fila; el libro lo suma aparte como `aiUsage/{día}.usdEnRiesgo`; los topes cuentan medido + en riesgo (`costeTrasUnFallo`, `functions/test/coste-de-los-fallos.test.mjs`). El coste medido no cambia | No: con el despliegue de g4–g6 | Lo mismo que los topes |
| **Una pasada del barrido a la vez** (H0 #18) | `barridoDeLiquidacion`: `maxInstances: 1`, `concurrency: 1` | No: con el despliegue de g6 | — |

## Las tarifas: ninguna está verificada (2026-10-01)

Todos los modelos reales del registro (`engine/providers/*.ts`) llevan
`verified: false`: su tarifa sale de la documentación pública del proveedor y no
se ha confrontado con una factura. Exigir tarifas verificadas en modo de precios
real apagaría hoy toda la IA, así que **no se impone**: es parte de la decisión
pendiente sobre precios ([PRECIO-SIN-PROVEEDOR.md](PRECIO-SIN-PROVEEDOR.md),
[DECISIONES-PENDIENTES.md](DECISIONES-PENDIENTES.md)). Producción cotiza en modo
simulado (H0), así que hoy no se cobra con esas tarifas.

El instrumento para medir ya existe: `aiUsage/{día}` acumula llamadas, dólares
(medidos y, desde H0 #22, en riesgo) y Credits por capacidad y por proveedor, y
lo enseña el panel de administración (Configuración → Weë AI Engine). Comparar
eso con la factura del proveedor de la misma semana es lo que convierte una
tarifa en `verified: true`.

## Cómo poner cifra a los topes, sin inventarla

Los topes son una decisión de negocio, por eso vienen apagados. Propuesta de
**método**, no de cifra:

1. Tras el despliegue de g4–g6, medir una semana el gasto real del proveedor:
   `aiGenerations.providerCost` y `creatorUsage/{día}`.
2. Fijar el tope global en **2–3 veces el día más alto** de esa semana. Corta un
   abuso o un bucle sin cortar un buen día.
3. Por proveedor, lo mismo con su parte, y Seedance con margen propio: es el
   más caro por llamada.
4. Revisarlo cuando salte la alerta «Tope de gasto diario alcanzado».

Mientras no haya cifra, protegen los cupos por persona y por proveedor (vivos),
el interruptor (tras el despliegue) y las alertas (al activarlas).

## Coste operativo del Harness

| Pieza | Coste |
|---|---|
| CI (GitHub Actions) | 0: repositorio público, minutos sin límite |
| Workflow de despliegue | 0 en GitHub. Cada despliegue usa Cloud Build y Artifact Registry como cualquier `firebase deploy` |
| Observación posterior | 0: lecturas de Cloud Monitoring dentro de la capa gratuita; unos 13 minutos más de runner |
| Alertas | 4 métricas basadas en logs, 7 condiciones, 2 comprobaciones de salud (get-wee.web.app y www.wee.zone, unas 100 000 ejecuciones al mes, por debajo del millón gratuito) y 1 panel (gratis). Las de Cloud Run son gratuitas; el precio por condición se confirma en la consola antes de activarlas |
| Auditoría del canje de WIF (opcional) | Unas líneas por despliegue, dentro de la cuota gratuita de Cloud Logging |
| Escaneo de secretos | 0: script propio, sin servicios |

**Nada de esto llama a una IA ni consume Credits.**
