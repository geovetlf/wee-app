---
name: wee-financial-integrity
description: Úsala cuando un cambio en Weë toque Credits, cobros, pagos, reembolsos, saldo, billetera, idempotencia, liquidación de trabajos asíncronos o el aislamiento de datos entre cuentas. Lista de comprobaciones y las suites que ya las vigilan.
---

# Integridad financiera y aislamiento (Weë)

No es otra implementación: todo Credit pasa por el Credit Engine (`functions/src/credits`, `docs/CREDITS.md`) y
por el Financial Core (`functions/src/financial`, `functions/src/core/financial`). La app nunca suma ni resta
Credits. Los precios son placeholder configurables; no inventes precios (`docs/COSTES.md`).

## Invariantes (fuente: `ops/guardian/invariantes.json`; no las rebajes)
I-01 una operación sensible se ejecuta una vez · I-02 cuentas aisladas · I-03 nada se descuenta dos veces ·
I-04 cobro, generación, fallo y reembolso cuadran · I-06 autorización en servidor · I-07 el trabajo asíncrono
sobrevive y sus estados no mienten · I-08 nada ficticio se cobra como real.

## Comprobaciones al tocar el área
- Todo servicio que consuma IA: `spendCredits` → `completeCredits` / `refundCredits`, con `requestId` idempotente
  y transacción atómica; reembolso automático si falla; nunca reembolsar un trabajo vivo ni un desenlace desconocido.
- Un duplicado concurrente no regala resultado ni cobra dos veces.
- Cada lectura o escritura lleva la cuenta (`cuentaDeIdentidad`, `users.linkedAccountId`); nunca se deduce de un prefijo `hidi_`.
- `firestore.rules` y `storage.rules` siguen cerrando las colecciones de dinero a los clientes.
- Pagos: se validan en el servidor (`functions/src/payments`), fuera del motor de Credits.

## Suites que ya vigilan esto (corre las que apliquen)
`credits`, `credits-cliente-cerrado`, `credits-saldo-privado`, `credits-weeai`, `idempotencia-de-cobro`,
`core-financial`, `liquidacion-pendiente`, `plazos-y-liquidacion`, `runtime-liquidacion`, `emulador-aislado`,
`identidad-de-cuenta`, `cuenta-identidad`, como `node functions/test/<nombre>.test.mjs`
(dominio `creditos-y-cobro` en `ops/guardian/dominios.json`). Añade una prueba de regresión por cada fallo que
descubras. Editar `creditEngine.ts` o `core/financial/**` pide permiso del dueño (regla `ask` de `.claude/settings.json`).
