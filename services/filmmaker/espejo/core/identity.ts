// GENERADO por scripts/espejo-filmmaker.mjs desde functions/src/core/identity.ts: no se edita a mano, se regenera.
import { IDENTITY_CONTRACT_VERSION } from './contracts';
export type EntityType = 'REAL_PROFILE' | 'WEE_PROFILE' | 'PAGE';
export const TIPOS_DE_ENTIDAD: readonly EntityType[] = Object.freeze([
    'REAL_PROFILE', 'WEE_PROFILE', 'PAGE',
] as const);
export const esTipoDeEntidad = (v: unknown): v is EntityType => typeof v === 'string' && (TIPOS_DE_ENTIDAD as readonly string[]).includes(v);
export interface EntityRef {
    entityId: string;
    entityType: EntityType;
    entitySequence: number;
}
export const SECUENCIA_DE_PERFIL_REAL = 1;
export const SECUENCIA_DE_PERFIL_WEE = 2;
export const PRIMERA_SECUENCIA_DE_PAGE = 3;
export const tipoPorSecuencia = (entitySequence: number): EntityType | undefined => {
    if (!Number.isSafeInteger(entitySequence) || entitySequence < 1)
        return undefined;
    if (entitySequence === SECUENCIA_DE_PERFIL_REAL)
        return 'REAL_PROFILE';
    if (entitySequence === SECUENCIA_DE_PERFIL_WEE)
        return 'WEE_PROFILE';
    return 'PAGE';
};
export type EntityHandle = string;
export const FORMA_DE_HANDLE = /^[a-z0-9](?:[a-z0-9._]{1,28}[a-z0-9])$/;
export const esHandle = (v: unknown): v is EntityHandle => typeof v === 'string' && FORMA_DE_HANDLE.test(v) && !v.includes('..') && !v.includes('__');
export type EntityStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETED';
export interface EntityIdentity extends EntityRef {
    contract: typeof IDENTITY_CONTRACT_VERSION;
    ownerAccountId: string;
    handle?: EntityHandle;
    status: EntityStatus;
    createdAt: number;
    updatedAt: number;
}
export interface OwnerRef {
    ownerAccountId: string;
}
export interface EntityAttribution {
    createdByEntityId?: string;
    createdByEntityType?: EntityType;
    publishedByEntityId?: string;
    publishedByEntityType?: EntityType;
}
export interface OwnedByAccount extends OwnerRef, EntityAttribution {
}
export const entidadEsDeLaCuenta = (entidad: EntityIdentity | undefined, accountId: string | undefined): boolean => !!entidad && typeof accountId === 'string' && accountId.length > 0
    && entidad.ownerAccountId === accountId;
export const atribuirA = <T extends OwnedByAccount>(cosa: T, publicadoPor: {
    entityId: string;
    entityType: EntityType;
}): T => ({
    ...cosa,
    ownerAccountId: cosa.ownerAccountId,
    publishedByEntityId: publicadoPor.entityId,
    publishedByEntityType: publicadoPor.entityType,
});
export const entidadValida = (e: EntityIdentity | undefined): boolean => {
    if (!e || typeof e !== 'object')
        return false;
    if (typeof e.ownerAccountId !== 'string' || !e.ownerAccountId)
        return false;
    if (typeof e.entityId !== 'string' || !e.entityId)
        return false;
    if (!esTipoDeEntidad(e.entityType))
        return false;
    if (!Number.isSafeInteger(e.entitySequence) || e.entitySequence < 1)
        return false;
    if (e.handle !== undefined && !esHandle(e.handle))
        return false;
    return tipoPorSecuencia(e.entitySequence) === e.entityType;
};
export const FORMA_DE_ID_DE_CUENTA = /^(?=[A-Za-z0-9]*[A-Za-z])[A-Za-z0-9]{1,128}$/;
export const esIdDeCuenta = (v: unknown): v is string => typeof v === 'string' && FORMA_DE_ID_DE_CUENTA.test(v);
