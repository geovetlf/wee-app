// GENERADO por scripts/espejo-filmmaker.mjs desde functions/src/core/gateway.ts: no se edita a mano, se regenera.
import type { ContinuityRequirements } from './continuity';
import type { CreativeParameters } from './creative';
export interface ExecutionHints {
    quality?: 'standard' | 'high' | 'max';
    durationSec?: number;
    creative?: CreativeParameters;
    continuity?: ContinuityRequirements;
}
