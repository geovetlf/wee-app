/**
 * WEE FINANCIAL CORE — la puerta.
 *
 * ── Qué hay aquí dentro ─────────────────────────────────────────────────────
 *
 *   money.ts     el dinero, en enteros y con su moneda
 *   ledger.ts    los cinco libros, y qué invariantes cumple un asiento
 *   account.ts   la cuenta —UNA por persona— y el motor puro de Credits
 *   payment.ts   el pago: estados, avisos de pasarela, devoluciones, contracargos
 *   commerce.ts  checkout, router de pagos, conciliación y las costuras futuras
 *
 * Como todo el Core: sin Firebase, sin red, sin reloj, sin dados, y sin el
 * nombre de ninguna pasarela. El cableado con las pasarelas de verdad vive en
 * `functions/src/financial/`, porque ahí sí hace falta nombrarlas.
 *
 * ── La frase que resume la fase ─────────────────────────────────────────────
 *
 * Una persona, una cuenta, un saldo. Se compra desde cualquier producto y se
 * gasta en cualquier producto. `appId` y `workspaceId` atribuyen; no poseen.
 */

export * from './money';
export * from './ledger';
export * from './account';
export * from './payment';
export * from './commerce';
