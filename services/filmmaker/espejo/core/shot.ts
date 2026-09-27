// GENERADO por scripts/espejo-filmmaker.mjs desde functions/src/core/shot.ts: no se edita a mano, se regenera.
import { SHOT_CONTRACT_VERSION } from './contracts';
import { ContinuityAnchor, ContinuityRequirements, ContinuityVerdict, anclajeValido, continuidadValida, veredictoValido, } from './continuity';
import { CreativeParameters, creativosValidos } from './creative';
import { OwnedByAccount } from './identity';
export type ElementBinding = ContinuityAnchor;
export type ShotState = 'draft' | 'ready' | 'generated' | 'validated' | 'stale' | 'archived';
export const ESTADOS_DE_PLANO: readonly ShotState[] = Object.freeze([
    'draft', 'ready', 'generated', 'validated', 'stale', 'archived',
] as const);
export const esEstadoDePlano = (v: unknown): v is ShotState => typeof v === 'string' && (ESTADOS_DE_PLANO as readonly string[]).includes(v);
export const TRANSICIONES_DE_PLANO: Readonly<Record<ShotState, readonly ShotState[]>> = Object.freeze({
    draft: Object.freeze(['ready', 'archived'] as ShotState[]),
    ready: Object.freeze(['draft', 'generated', 'archived'] as ShotState[]),
    generated: Object.freeze(['validated', 'stale', 'ready', 'archived'] as ShotState[]),
    validated: Object.freeze(['stale', 'ready', 'archived'] as ShotState[]),
    stale: Object.freeze(['ready', 'archived'] as ShotState[]),
    archived: Object.freeze([] as ShotState[]),
});
export const puedePasarDePlano = (de: ShotState, a: ShotState): boolean => (TRANSICIONES_DE_PLANO[de] ?? []).includes(a);
export interface SceneNode extends OwnedByAccount {
    contract: typeof SHOT_CONTRACT_VERSION;
    sceneId: string;
    projectId: string;
    version: number;
    order: number;
    name?: string;
    location?: ElementBinding;
    elements?: readonly ElementBinding[];
    creative?: CreativeParameters;
    narrative?: string;
    createdAt: number;
    updatedAt: number;
}
export interface ShotNode extends OwnedByAccount {
    contract: typeof SHOT_CONTRACT_VERSION;
    shotId: string;
    projectId: string;
    version: number;
    order: number;
    state: ShotState;
    sceneId?: string;
    previousShotId?: string;
    dependsOnShotIds?: readonly string[];
    elements?: readonly ElementBinding[];
    creative?: CreativeParameters;
    continuity?: ContinuityRequirements;
    narrative?: string;
    producedAssetId?: string;
    verdict?: ContinuityVerdict;
    createdAt: number;
    updatedAt: number;
    archivedAt?: number;
}
export const FORMA_DE_ID_DE_PLANO = /^[A-Za-z0-9_-]{4,128}$/;
export const MAX_ELEMENTOS_POR_NODO = 16;
export const MAX_DEPENDENCIAS_DE_PLANO = 8;
export const MAX_NARRATIVA = 280;
export const MAX_NOMBRE_DE_ESCENA = 120;
export const MAX_ORDEN = 99999;
export const MAX_VERSION_DE_NODO = 9999;
export type MotivoDeNodoInvalido = 'invalid_shape' | 'unknown_field' | 'dangerous_key' | 'forbidden_key' | 'invalid_id' | 'invalid_owner' | 'invalid_version' | 'invalid_order' | 'invalid_state' | 'invalid_text' | 'invalid_binding' | 'duplicate_binding' | 'invalid_continuity' | 'invalid_verdict' | 'invalid_creative' | 'self_reference' | 'too_many' | 'invalid_time';
export interface ProblemaDeNodo {
    field: string;
    reason: MotivoDeNodoInvalido;
}
const mal = (field: string, reason: MotivoDeNodoInvalido): ProblemaDeNodo => ({ field, reason });
const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const esNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const esTxt = (v: unknown): v is string => typeof v === 'string';
const propia = (o: Record<string, unknown>, c: string): boolean => Object.prototype.hasOwnProperty.call(o, c);
const PELIGROSAS = ['__proto__', 'constructor', 'prototype'];
const PROHIBIDAS = [
    'storageref', 'bucket', 'objectkey', 'url', 'signedurl', 'downloadurl', 'endpoint',
    'providerid', 'modelid', 'adapterid', 'provider', 'model', 'adapter',
    'apikey', 'secret', 'credential', 'credentials', 'token', 'authorization',
    'bytes', 'content', 'data', 'buffer', 'blob', 'embedding', 'embeddings', 'vector',
    'prompt', 'negativeprompt', 'seed',
];
const normalizar = (c: string): string => c.toLowerCase().replace(/[-_]/g, '');
export const claveProhibidaDeNodo = (clave: string): boolean => PROHIBIDAS.includes(clave.toLowerCase()) || PROHIBIDAS.includes(normalizar(clave));
const ATRIBUCION: readonly string[] = [
    'ownerAccountId', 'createdByEntityId', 'createdByEntityType',
    'publishedByEntityId', 'publishedByEntityType',
];
const CAMPOS_DE_ESCENA: readonly string[] = [
    'contract', 'sceneId', 'projectId', 'version', 'order', 'name',
    'location', 'elements', 'creative', 'narrative', 'createdAt', 'updatedAt', ...ATRIBUCION,
];
const CAMPOS_DE_PLANO: readonly string[] = [
    'contract', 'shotId', 'projectId', 'version', 'order', 'state', 'sceneId',
    'previousShotId', 'dependsOnShotIds', 'elements', 'creative', 'continuity',
    'narrative', 'producedAssetId', 'verdict', 'createdAt', 'updatedAt', 'archivedAt', ...ATRIBUCION,
];
const revisarComun = (d: Record<string, unknown>, campos: readonly string[], obligatorios: readonly string[], p: ProblemaDeNodo[]): void => {
    for (const [clave, valor] of Object.entries(d)) {
        if (PELIGROSAS.includes(clave)) {
            p.push(mal(clave, 'dangerous_key'));
            continue;
        }
        if (claveProhibidaDeNodo(clave)) {
            p.push(mal(clave, 'forbidden_key'));
            continue;
        }
        if (!campos.includes(clave)) {
            p.push(mal(clave, 'unknown_field'));
            continue;
        }
        if (typeof valor === 'function')
            p.push(mal(clave, 'invalid_shape'));
    }
    for (const campo of obligatorios)
        if (!propia(d, campo))
            p.push(mal(campo, 'invalid_shape'));
    if (d.contract !== SHOT_CONTRACT_VERSION)
        p.push(mal('contract', 'invalid_shape'));
    if (!esTxt(d.projectId) || !FORMA_DE_ID_DE_PLANO.test(d.projectId))
        p.push(mal('projectId', 'invalid_id'));
    if (!esTxt(d.ownerAccountId) || d.ownerAccountId.length === 0)
        p.push(mal('ownerAccountId', 'invalid_owner'));
    if (!esNum(d.version) || !Number.isInteger(d.version) || d.version < 1 || d.version > MAX_VERSION_DE_NODO) {
        p.push(mal('version', 'invalid_version'));
    }
    if (!esNum(d.order) || !Number.isInteger(d.order) || d.order < 0 || d.order > MAX_ORDEN) {
        p.push(mal('order', 'invalid_order'));
    }
    if (!esNum(d.createdAt) || d.createdAt < 0)
        p.push(mal('createdAt', 'invalid_time'));
    if (!esNum(d.updatedAt) || d.updatedAt < 0)
        p.push(mal('updatedAt', 'invalid_time'));
    if (d.narrative !== undefined
        && (!esTxt(d.narrative) || d.narrative.length === 0 || d.narrative.length > MAX_NARRATIVA)) {
        p.push(mal('narrative', 'invalid_text'));
    }
    if (d.creative !== undefined && !creativosValidos(d.creative))
        p.push(mal('creative', 'invalid_creative'));
    if (d.elements !== undefined) {
        if (!Array.isArray(d.elements))
            p.push(mal('elements', 'invalid_shape'));
        else {
            if (d.elements.length > MAX_ELEMENTOS_POR_NODO)
                p.push(mal('elements', 'too_many'));
            const vistos = new Set<string>();
            for (let i = 0; i < d.elements.length; i++) {
                const b: unknown = d.elements[i];
                const campo = `elements[${i}]`;
                if (!anclajeValido(b)) {
                    p.push(mal(campo, 'invalid_binding'));
                    continue;
                }
                if (vistos.has(b.elementId)) {
                    p.push(mal(campo, 'duplicate_binding'));
                    continue;
                }
                vistos.add(b.elementId);
            }
        }
    }
};
export const validarEscena = (crudo: unknown): readonly ProblemaDeNodo[] => {
    if (!esObjeto(crudo))
        return [mal('scene', 'invalid_shape')];
    const d = crudo;
    const p: ProblemaDeNodo[] = [];
    revisarComun(d, CAMPOS_DE_ESCENA, ['contract', 'sceneId', 'projectId', 'version', 'order', 'ownerAccountId', 'createdAt', 'updatedAt'], p);
    if (!esTxt(d.sceneId) || !FORMA_DE_ID_DE_PLANO.test(d.sceneId))
        p.push(mal('sceneId', 'invalid_id'));
    if (d.name !== undefined
        && (!esTxt(d.name) || d.name.length === 0 || d.name.length > MAX_NOMBRE_DE_ESCENA)) {
        p.push(mal('name', 'invalid_text'));
    }
    if (d.location !== undefined && !anclajeValido(d.location))
        p.push(mal('location', 'invalid_binding'));
    return Object.freeze(p);
};
export const escenaValida = (crudo: unknown): crudo is SceneNode => validarEscena(crudo).length === 0;
export const validarPlano = (crudo: unknown): readonly ProblemaDeNodo[] => {
    if (!esObjeto(crudo))
        return [mal('shot', 'invalid_shape')];
    const d = crudo;
    const p: ProblemaDeNodo[] = [];
    revisarComun(d, CAMPOS_DE_PLANO, ['contract', 'shotId', 'projectId', 'version', 'order', 'state', 'ownerAccountId', 'createdAt', 'updatedAt'], p);
    const id = esTxt(d.shotId) && FORMA_DE_ID_DE_PLANO.test(d.shotId) ? d.shotId : undefined;
    if (id === undefined)
        p.push(mal('shotId', 'invalid_id'));
    if (!esEstadoDePlano(d.state))
        p.push(mal('state', 'invalid_state'));
    if (d.sceneId !== undefined && (!esTxt(d.sceneId) || !FORMA_DE_ID_DE_PLANO.test(d.sceneId))) {
        p.push(mal('sceneId', 'invalid_id'));
    }
    if (d.previousShotId !== undefined) {
        if (!esTxt(d.previousShotId) || !FORMA_DE_ID_DE_PLANO.test(d.previousShotId)) {
            p.push(mal('previousShotId', 'invalid_id'));
        }
        else if (d.previousShotId === id) {
            p.push(mal('previousShotId', 'self_reference'));
        }
    }
    if (d.dependsOnShotIds !== undefined) {
        if (!Array.isArray(d.dependsOnShotIds))
            p.push(mal('dependsOnShotIds', 'invalid_shape'));
        else {
            if (d.dependsOnShotIds.length > MAX_DEPENDENCIAS_DE_PLANO)
                p.push(mal('dependsOnShotIds', 'too_many'));
            const vistos = new Set<string>();
            for (let i = 0; i < d.dependsOnShotIds.length; i++) {
                const dep: unknown = d.dependsOnShotIds[i];
                const campo = `dependsOnShotIds[${i}]`;
                if (!esTxt(dep) || !FORMA_DE_ID_DE_PLANO.test(dep)) {
                    p.push(mal(campo, 'invalid_id'));
                    continue;
                }
                if (dep === id) {
                    p.push(mal(campo, 'self_reference'));
                    continue;
                }
                if (vistos.has(dep)) {
                    p.push(mal(campo, 'duplicate_binding'));
                    continue;
                }
                vistos.add(dep);
            }
        }
    }
    if (d.continuity !== undefined && !continuidadValida(d.continuity))
        p.push(mal('continuity', 'invalid_continuity'));
    if (d.verdict !== undefined && !veredictoValido(d.verdict))
        p.push(mal('verdict', 'invalid_verdict'));
    if (d.producedAssetId !== undefined
        && (!esTxt(d.producedAssetId) || !FORMA_DE_ID_DE_PLANO.test(d.producedAssetId))) {
        p.push(mal('producedAssetId', 'invalid_id'));
    }
    if (d.archivedAt !== undefined && (!esNum(d.archivedAt) || d.archivedAt < 0)) {
        p.push(mal('archivedAt', 'invalid_time'));
    }
    return Object.freeze(p);
};
export const planoValido = (crudo: unknown): crudo is ShotNode => validarPlano(crudo).length === 0;
export const nodoEsDeLaCuenta = (nodo: {
    ownerAccountId?: string;
} | undefined, accountId: string | undefined): boolean => !!nodo && typeof accountId === 'string' && accountId.length > 0 && nodo.ownerAccountId === accountId;
export const referenciasDelPlano = (plano: ShotNode): readonly ElementBinding[] => {
    const porId = new Map<string, ElementBinding>();
    for (const b of plano.elements ?? [])
        if (!porId.has(b.elementId))
            porId.set(b.elementId, b);
    for (const a of plano.continuity?.anchors ?? [])
        if (!porId.has(a.elementId))
            porId.set(a.elementId, a);
    return Object.freeze([...porId.values()]);
};
