// GENERADO por scripts/espejo-filmmaker.mjs desde functions/src/core/cost.ts: no se edita a mano, se regenera.
import { CapabilityId } from './capability';
export type CostUnit = 'token_in' | 'token_out' | 'second' | 'minute' | 'image' | 'megapixel' | 'kchar' | 'call' | 'page';
export interface CostLine {
    unit: CostUnit;
    quantity: number;
    usdPerUnit: number;
}
export interface ProviderCost {
    lines: readonly CostLine[];
    usd: number;
    provider?: string;
    model?: string;
}
export interface CostEstimate {
    capability: CapabilityId;
    service: string;
    provider: ProviderCost;
    credits: number;
    confidence: 'exact' | 'estimated' | 'assumed';
}
export interface ActualCost {
    provider: ProviderCost;
    creditsCharged?: number;
    latencyMs: number;
}
export interface CreditQuote {
    id: string;
    estimate: CostEstimate;
    credits: number;
    expiresAt?: number;
    policyNote?: string;
}
export type ReservationStatus = 'AUTHORIZED' | 'COMPLETED' | 'REFUNDED' | 'FAILED';
export interface CreditReservation {
    requestId: string;
    transactionId: string;
    authorized: number;
    status: ReservationStatus;
}
export interface Budget {
    maxCredits?: number;
    maxUsd?: number;
    prefer?: 'quality' | 'speed' | 'cost';
    onExceed?: 'fail' | 'degrade';
}
export const cabeEnPresupuesto = (estimate: CostEstimate, budget?: Budget): boolean => {
    if (!budget)
        return true;
    if (typeof budget.maxCredits === 'number' && estimate.credits > budget.maxCredits)
        return false;
    if (typeof budget.maxUsd === 'number' && estimate.provider.usd > budget.maxUsd)
        return false;
    return true;
};
export const presupuestoRestante = (budget: Budget | undefined, gastado: number): Budget | undefined => {
    if (!budget || typeof budget.maxCredits !== 'number')
        return budget;
    return { ...budget, maxCredits: Math.max(0, budget.maxCredits - Math.max(0, gastado)) };
};
export const sumarEstimaciones = (estimates: readonly CostEstimate[]): {
    credits: number;
    usd: number;
} => ({
    credits: estimates.reduce((t, e) => t + (Number.isFinite(e.credits) ? e.credits : 0), 0),
    usd: estimates.reduce((t, e) => t + (Number.isFinite(e.provider.usd) ? e.provider.usd : 0), 0),
});
