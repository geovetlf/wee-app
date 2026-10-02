// GENERADO por scripts/espejo-filmmaker.mjs desde functions/src/core/contracts.ts: no se edita a mano, se regenera.
export const CORE_CONTRACT_VERSION = '1.2' as const;
export const PROVIDER_CONTRACT_VERSION = '1.0' as const;
export const CAPABILITY_CONTRACT_VERSION = '1.0' as const;
export const WORKPLACE_CONTRACT_VERSION = '1.0' as const;
export const WORKFLOW_CONTRACT_VERSION = '1.1' as const;
export const GATEWAY_CONTRACT_VERSION = '1.0' as const;
export const BRAIN_CONTRACT_VERSION = '1.0' as const;
export const SKILL_CONTRACT_VERSION = '1.0' as const;
export const CREATIVE_PARAMETERS_VERSION = 1;
export const ELEMENT_CONTRACT_VERSION = '1.0' as const;
export const VISUAL_CONTEXT_CONTRACT_VERSION = '1.0' as const;
export const CONTINUITY_CONTRACT_VERSION = '1.0' as const;
export const SHOT_CONTRACT_VERSION = '1.0' as const;
export const PLANNER_CONTRACT_VERSION = '1.0' as const;
export const MAX_PROPUESTAS_POR_PASO = 4;
export const ALGORITHM_CONTRACT_VERSION = '1.12' as const;
export const ORCHESTRATOR_CONTRACT_VERSION = '1.0' as const;
export const ROUTER_CONTRACT_VERSION = '1.0' as const;
export const JOB_ENGINE_CONTRACT_VERSION = '1.0' as const;
export const FINANCIAL_CORE_CONTRACT_VERSION = '1.0' as const;
export const IDENTITY_CONTRACT_VERSION = '1.0' as const;
export const EVENTS_CONTRACT_VERSION = '1.0' as const;
export const CONTENT_CORE_CONTRACT_VERSION = '1.0' as const;
export type ContractVersion = `${number}.${number}`;
export const contratoCompatible = (declarada: string, esperada: string): boolean => {
    const partes = (v: string) => {
        const [mayor, menor] = String(v || '').split('.');
        const a = Number(mayor);
        const b = Number(menor);
        return Number.isFinite(a) && Number.isFinite(b) ? { mayor: a, menor: b } : null;
    };
    const d = partes(declarada);
    const e = partes(esperada);
    if (!d || !e)
        return false;
    return d.mayor === e.mayor && d.menor >= e.menor;
};
