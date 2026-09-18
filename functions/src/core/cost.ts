/**
 * WEE CORE — COSTE, CREDITS Y PRESUPUESTO.
 *
 * ── Lo que este archivo NO es ───────────────────────────────────────────────
 *
 * No es un sistema de Credits nuevo. Ya hay uno, está bien hecho y no se toca:
 * `credits/creditEngine.ts` cobra, liquida y reembolsa con transacciones
 * atómicas e idempotencia por `requestId`, y `credits/aiPricing.ts` convierte
 * coste real de proveedor en Credits con margen y suelo de coste.
 *
 * Esto es el VOCABULARIO que le faltaba: los nombres del brief —estimate,
 * quote, reserve, actualize, refund, budget— atados a lo que ya existe, para
 * que las fases siguientes no inventen un segundo sistema por no encontrar cómo
 * se llamaba el primero.
 *
 * ── La regla que no puede perderse ──────────────────────────────────────────
 *
 *     COSTE REAL DEL PROVEEDOR → MARGEN → CREDITS
 *
 * Nunca un precio inventado por modelo. Y nunca por debajo del coste: el suelo
 * ya está implementado en tres capas y aquí queda declarado como invariante.
 */

import { CapabilityId } from './capability';

/**
 * EN QUÉ SE MIDE LO QUE SE CONSUME.
 *
 * Multimodal desde el primer día, y esto no es previsión: es que ya es así. Hoy
 * mismo Weë paga por tokens a Gemini, por megapíxel a BFL, por segundo de video
 * a Seedance y por millar de caracteres a ElevenLabs. Un contrato que asumiera
 * tokens estaría roto desde el minuto uno.
 */
export type CostUnit =
  | 'token_in'
  | 'token_out'
  | 'second'
  | 'minute'
  | 'image'
  | 'megapixel'
  | 'kchar'
  | 'call'
  | 'page';

/** Cuánto de una unidad consumió —o consumirá— una operación. */
export interface CostLine {
  unit: CostUnit;
  quantity: number;
  /** USD por unidad, según la tarifa publicada del proveedor. */
  usdPerUnit: number;
}

/** El total en dinero de proveedor, desglosado. */
export interface ProviderCost {
  lines: readonly CostLine[];
  usd: number;
  /** El proveedor y modelo con los que se calculó. Para auditar, no para decidir. */
  provider?: string;
  model?: string;
}

/**
 * LO QUE VA A COSTAR, antes de hacerlo.
 *
 * `confidence` no es adorno. Un texto se estima bien porque los tokens se
 * cuentan; un video largo se estima con supuestos. Quien recibe esto necesita
 * saber si puede prometerle el número a la persona o solo usarlo para ordenar
 * candidatos.
 */
export interface CostEstimate {
  capability: CapabilityId;
  /** Servicio del catálogo de Credits que paga esto: 'ai_image', 'ai_brain'… */
  service: string;
  provider: ProviderCost;
  /** Lo que se le cobraría a la persona. Entero: los Credits no se parten. */
  credits: number;
  confidence: 'exact' | 'estimated' | 'assumed';
}

/**
 * LO QUE COSTÓ, cuando ya se sabe.
 *
 * Separado de la estimación a propósito: compararlos es lo único que permite
 * saber si el catálogo de precios sigue siendo cierto. Fundirlos en un campo
 * que «se actualiza» pierde exactamente esa información.
 */
export interface ActualCost {
  provider: ProviderCost;
  /** Credits DEFINITIVAMENTE capturados. Ausente = todavía no se liquidó; nunca «cero». */
  creditsCharged?: number;
  latencyMs: number;
}

/**
 * UNA COTIZACIÓN ENSEÑADA A LA PERSONA.
 *
 * Hoy las dos cotizaciones que existen devuelven formas distintas y no se
 * guardan: se enseña un número y, cuando llega el cobro, nada garantiza que sea
 * el mismo. Ya hay un caso real de esa deriva —la cotización de Weë Brain
 * ignora la foto adjunta y cobra más de lo que enseñó—.
 *
 * Por eso una cotización tiene `id` y `expiresAt`: para poder atarla al cobro y
 * para que no valga eternamente. El motor de la Fase 9 decidirá si se persiste;
 * el contrato ya lo permite.
 */
export interface CreditQuote {
  id: string;
  estimate: CostEstimate;
  /** Los Credits que se le enseñan. Puede ser 0 aunque el coste no lo sea. */
  credits: number;
  expiresAt?: number;
  /**
   * Por qué el número enseñado no es el del catálogo, cuando no lo es.
   *
   * Existe por Weë Brain: se cobra por bloques de doce respuestas, así que once
   * de cada doce se cotizan en 0 Credits y eso NO es un error de cálculo. Sin
   * este campo, la primera auditoría que compare cotización con catálogo
   * "arreglaría" la política de Brain sin saber que la está rompiendo.
   */
  policyNote?: string;
}

/** Los estados por los que pasa el dinero. Los mismos que ya escribe el Credit Engine. */
export type ReservationStatus = 'AUTHORIZED' | 'COMPLETED' | 'REFUNDED' | 'FAILED';

/**
 * LO RETENIDO PARA UNA OPERACIÓN.
 *
 * Hoy «reservar» descuenta el saldo de verdad: `spendCredits` deja la
 * transacción en AUTHORIZED y el saldo ya bajó. Se documenta tal cual en vez de
 * describir una retención sin débito que no existe — un contrato que promete lo
 * que el sistema no hace es peor que no tenerlo.
 */
export interface CreditReservation {
  /** Mismo `requestId` que usa el Credit Engine: idempotencia de extremo a extremo. */
  requestId: string;
  transactionId: string;
  authorized: number;
  status: ReservationStatus;
}

/**
 * EL LÍMITE QUE PONE LA PERSONA.
 *
 * No existe hoy en ninguna forma, y es lo que permite que el brief pida cosas
 * como «máxima calidad dentro de 30 Credits» o «rápido aunque cueste más».
 *
 * `maxCredits` y `maxUsd` no son el mismo límite: el primero es lo que la
 * persona entiende, el segundo lo que Weë gasta. Normalmente basta el primero.
 *
 * `prefer` es lo que convierte el presupuesto en una INSTRUCCIÓN y no solo en un
 * tope: sin él, «rápido aunque cueste más» no se puede expresar.
 */
export interface Budget {
  maxCredits?: number;
  maxUsd?: number;
  prefer?: 'quality' | 'speed' | 'cost';
  /** Si se pasa del tope: cortar, o entregar lo mejor que quepa. */
  onExceed?: 'fail' | 'degrade';
}

/** ¿Cabe esta estimación en el presupuesto? */
export const cabeEnPresupuesto = (estimate: CostEstimate, budget?: Budget): boolean => {
  if (!budget) return true;
  if (typeof budget.maxCredits === 'number' && estimate.credits > budget.maxCredits) return false;
  if (typeof budget.maxUsd === 'number' && estimate.provider.usd > budget.maxUsd) return false;
  return true;
};

/**
 * Lo que queda de un presupuesto después de lo ya gastado.
 *
 * Un workflow gasta en varios pasos y el tope es del trabajo entero, no de cada
 * paso. Sin esta resta, tres pasos de 20 Credits pasan uno a uno un tope de 30 y
 * el trabajo acaba costando 60.
 */
export const presupuestoRestante = (budget: Budget | undefined, gastado: number): Budget | undefined => {
  if (!budget || typeof budget.maxCredits !== 'number') return budget;
  return { ...budget, maxCredits: Math.max(0, budget.maxCredits - Math.max(0, gastado)) };
};

/** Suma de varias estimaciones: el presupuesto de un plan completo. */
export const sumarEstimaciones = (estimates: readonly CostEstimate[]): { credits: number; usd: number } => ({
  credits: estimates.reduce((t, e) => t + (Number.isFinite(e.credits) ? e.credits : 0), 0),
  usd: estimates.reduce((t, e) => t + (Number.isFinite(e.provider.usd) ? e.provider.usd : 0), 0),
});
