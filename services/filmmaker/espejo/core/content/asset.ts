// GENERADO por scripts/espejo-filmmaker.mjs desde functions/src/core/content/asset.ts: no se edita a mano, se regenera.
import { CapabilityId } from '../capability';
import { CONTENT_CORE_CONTRACT_VERSION } from '../contracts';
import { ActualCost } from '../cost';
import { OwnedByAccount } from '../identity';
export type AssetKind = 'text' | 'image' | 'video' | 'audio' | 'document' | 'model3d';
export const TIPOS_DE_MATERIAL: readonly AssetKind[] = Object.freeze([
    'text', 'image', 'video', 'audio', 'document', 'model3d',
] as const);
export const esTipoDeMaterial = (v: unknown): v is AssetKind => typeof v === 'string' && (TIPOS_DE_MATERIAL as readonly string[]).includes(v);
export interface StorageRef {
    provider: string;
    bucket?: string;
    objectKey: string;
    version?: string;
}
export const FORMA_DE_PROVEEDOR_DE_ALMACEN = /^[a-z][a-z0-9_-]{1,31}$/;
export const esStorageRef = (v: unknown): v is StorageRef => {
    if (!v || typeof v !== 'object')
        return false;
    const r = v as Record<string, unknown>;
    if (typeof r.provider !== 'string' || !FORMA_DE_PROVEEDOR_DE_ALMACEN.test(r.provider))
        return false;
    if (typeof r.objectKey !== 'string' || !r.objectKey || r.objectKey.length > 1024)
        return false;
    if (r.objectKey.includes('..') || r.objectKey.startsWith('/'))
        return false;
    if (r.bucket !== undefined && (typeof r.bucket !== 'string' || !r.bucket))
        return false;
    if (r.version !== undefined && (typeof r.version !== 'string' || !r.version))
        return false;
    return true;
};
export const mismaReferencia = (a: StorageRef, b: StorageRef): boolean => a.provider === b.provider && (a.bucket ?? '') === (b.bucket ?? '')
    && a.objectKey === b.objectKey && (a.version ?? '') === (b.version ?? '');
export type VariantKind = 'thumbnail' | 'poster' | 'preview' | 'transcoded';
export interface AssetVariant {
    kind: VariantKind;
    storageRef: StorageRef;
    mimeType?: string;
    bytes?: number;
    width?: number;
    height?: number;
    durationSec?: number;
}
export interface Provenance {
    generationId?: string;
    jobId?: string;
    runId?: string;
    stepId?: string;
    requestId?: string;
    operationId?: string;
    traceId?: string;
    capability?: CapabilityId;
    provider?: string;
    model?: string;
    cost?: ActualCost;
    sourceAssetIds?: readonly string[];
    createdAt: number;
}
export type AssetStatus = 'uploading' | 'processing' | 'ready' | 'failed' | 'deleted';
export const ESTADOS_DE_MATERIAL: readonly AssetStatus[] = Object.freeze([
    'uploading', 'processing', 'ready', 'failed', 'deleted',
] as const);
export const ESTADOS_FINALES_DE_MATERIAL: readonly AssetStatus[] = Object.freeze(['deleted'] as const);
export const TRANSICIONES_DE_MATERIAL: Readonly<Record<AssetStatus, readonly AssetStatus[]>> = Object.freeze({
    uploading: Object.freeze(['processing', 'ready', 'failed', 'deleted'] as AssetStatus[]),
    processing: Object.freeze(['ready', 'failed', 'deleted'] as AssetStatus[]),
    ready: Object.freeze(['processing', 'deleted'] as AssetStatus[]),
    failed: Object.freeze(['deleted'] as AssetStatus[]),
    deleted: Object.freeze([] as AssetStatus[]),
});
export const puedePasarA = (de: AssetStatus, a: AssetStatus): boolean => (TRANSICIONES_DE_MATERIAL[de] ?? []).includes(a);
export interface Asset extends OwnedByAccount {
    contract: typeof CONTENT_CORE_CONTRACT_VERSION;
    assetId: string;
    kind: AssetKind;
    status: AssetStatus;
    storageRef?: StorageRef;
    content?: string;
    mimeType?: string;
    bytes?: number;
    width?: number;
    height?: number;
    durationSec?: number;
    variants?: readonly AssetVariant[];
    provenance: Provenance;
    previousVersionId?: string;
    name?: string;
    tags?: readonly string[];
    metadata?: Readonly<Record<string, string | number | boolean>>;
    createdAt: number;
    updatedAt: number;
    deletedAt?: number;
    uploadExpiresAt?: number;
    failedReason?: string;
    failedAt?: number;
}
export const FORMA_DE_ID_DE_MATERIAL = /^[A-Za-z0-9_-]{4,128}$/;
export const FORMA_DE_MIME = /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i;
export const MAXIMO_DE_BYTES_DE_MATERIAL = 2 * 1024 * 1024 * 1024;
export const materialValido = (a: Asset | undefined): boolean => {
    if (!a || typeof a !== 'object')
        return false;
    if (a.contract !== CONTENT_CORE_CONTRACT_VERSION)
        return false;
    if (typeof a.assetId !== 'string' || !FORMA_DE_ID_DE_MATERIAL.test(a.assetId))
        return false;
    if (typeof a.ownerAccountId !== 'string' || !a.ownerAccountId)
        return false;
    if (!esTipoDeMaterial(a.kind))
        return false;
    if (!(ESTADOS_DE_MATERIAL as readonly string[]).includes(a.status))
        return false;
    if (a.storageRef !== undefined && !esStorageRef(a.storageRef))
        return false;
    if (a.kind !== 'text' && a.status === 'ready' && !a.storageRef)
        return false;
    if (a.status === 'deleted' && !Number.isFinite(a.deletedAt))
        return false;
    if (a.status !== 'deleted' && a.deletedAt !== undefined)
        return false;
    if (a.mimeType !== undefined && !FORMA_DE_MIME.test(a.mimeType))
        return false;
    if (a.bytes !== undefined && (!Number.isSafeInteger(a.bytes) || a.bytes < 0 || a.bytes > MAXIMO_DE_BYTES_DE_MATERIAL))
        return false;
    if (a.variants !== undefined && !a.variants.every((v) => esStorageRef(v.storageRef)))
        return false;
    if (!a.provenance || !Number.isFinite(a.provenance.createdAt))
        return false;
    if (a.previousVersionId !== undefined && a.previousVersionId === a.assetId)
        return false;
    return Number.isFinite(a.createdAt) && Number.isFinite(a.updatedAt);
};
export const materialEsDeLaCuenta = (a: Asset | undefined, accountId: string | undefined): boolean => !!a && typeof accountId === 'string' && accountId.length > 0 && a.ownerAccountId === accountId;
export const retirar = (a: Asset, at: number): {
    asset: Asset;
    borrar: readonly StorageRef[];
} | undefined => {
    if (a.status === 'deleted')
        return undefined;
    const borrar: StorageRef[] = [];
    if (a.storageRef)
        borrar.push(a.storageRef);
    for (const v of a.variants ?? [])
        borrar.push(v.storageRef);
    return {
        asset: { ...a, status: 'deleted', deletedAt: at, updatedAt: at },
        borrar,
    };
};
export const cadenaDeOrigen = (assetId: string, buscar: (id: string) => Asset | undefined, vistos: Set<string> = new Set()): readonly string[] => {
    if (vistos.has(assetId))
        return [];
    vistos.add(assetId);
    const origenes = buscar(assetId)?.provenance?.sourceAssetIds ?? [];
    return origenes.flatMap((id) => [id, ...cadenaDeOrigen(id, buscar, vistos)]);
};
