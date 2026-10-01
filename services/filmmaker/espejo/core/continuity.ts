// GENERADO por scripts/espejo-filmmaker.mjs desde functions/src/core/continuity.ts: no se edita a mano, se regenera.
import { CONTINUITY_CONTRACT_VERSION } from './contracts';
export type ContinuityAspect = 'identity.face' | 'identity.body' | 'identity.hair' | 'identity.features' | 'identity.appearance' | 'appearance.hairstyle' | 'appearance.hairColor' | 'appearance.skin' | 'appearance.eyes' | 'appearance.facialHair' | 'appearance.makeup' | 'outfit.clothing' | 'outfit.footwear' | 'outfit.accessories' | 'outfit.complete' | 'object.identity' | 'object.geometry' | 'object.proportions' | 'object.color' | 'object.material' | 'object.texture' | 'object.markings' | 'object.presence' | 'object.position' | 'object.state' | 'product.identity' | 'product.geometry' | 'product.packaging' | 'product.label' | 'product.branding' | 'architecture.identity' | 'architecture.geometry' | 'architecture.facade' | 'architecture.openings' | 'architecture.structure' | 'architecture.proportions' | 'architecture.spatialLayout' | 'architecture.materials' | 'architecture.elements' | 'interior.layout' | 'interior.furniture' | 'interior.fixtures' | 'interior.materials' | 'interior.finishes' | 'interior.decoration' | 'exterior.site' | 'exterior.landscape' | 'exterior.terrain' | 'exterior.vegetation' | 'exterior.surroundings' | 'environment.location' | 'environment.scene' | 'environment.background' | 'environment.spatialContext' | 'style.visual' | 'style.artistic' | 'style.rendering' | 'style.composition' | 'camera.framing' | 'camera.perspective' | 'camera.position' | 'camera.focal' | 'camera.shotType' | 'lighting.type' | 'lighting.direction' | 'lighting.intensity' | 'lighting.timeOfDay' | 'pose.body' | 'pose.position' | 'action.activity' | 'action.movement' | 'spatial.relationships' | 'spatial.alignment' | 'spatial.containment' | 'spatial.relativePosition' | 'temporal.previousShot' | 'temporal.sceneState' | 'temporal.subjectState' | 'temporal.environmentState' | 'temporal.objectState' | 'temporal.motion' | 'narrative.state' | 'narrative.logic';
export const ASPECTOS_DE_CONTINUIDAD: readonly ContinuityAspect[] = Object.freeze([
    'identity.face', 'identity.body', 'identity.hair', 'identity.features', 'identity.appearance',
    'appearance.hairstyle', 'appearance.hairColor', 'appearance.skin', 'appearance.eyes',
    'appearance.facialHair', 'appearance.makeup',
    'outfit.clothing', 'outfit.footwear', 'outfit.accessories', 'outfit.complete',
    'object.identity', 'object.geometry', 'object.proportions', 'object.color',
    'object.material', 'object.texture', 'object.markings',
    'object.presence', 'object.position', 'object.state',
    'product.identity', 'product.geometry', 'product.packaging', 'product.label', 'product.branding',
    'architecture.identity', 'architecture.geometry', 'architecture.facade', 'architecture.openings',
    'architecture.structure', 'architecture.proportions', 'architecture.spatialLayout',
    'architecture.materials', 'architecture.elements',
    'interior.layout', 'interior.furniture', 'interior.fixtures', 'interior.materials',
    'interior.finishes', 'interior.decoration',
    'exterior.site', 'exterior.landscape', 'exterior.terrain', 'exterior.vegetation', 'exterior.surroundings',
    'environment.location', 'environment.scene', 'environment.background', 'environment.spatialContext',
    'style.visual', 'style.artistic', 'style.rendering', 'style.composition',
    'camera.framing', 'camera.perspective', 'camera.position', 'camera.focal', 'camera.shotType',
    'lighting.type', 'lighting.direction', 'lighting.intensity', 'lighting.timeOfDay',
    'pose.body', 'pose.position', 'action.activity', 'action.movement',
    'spatial.relationships', 'spatial.alignment', 'spatial.containment', 'spatial.relativePosition',
    'temporal.previousShot', 'temporal.sceneState', 'temporal.subjectState',
    'temporal.environmentState', 'temporal.objectState', 'temporal.motion',
    'narrative.state', 'narrative.logic',
] as const);
export const FAMILIAS_DE_CONTINUIDAD: readonly string[] = Object.freeze([...new Set(ASPECTOS_DE_CONTINUIDAD.map((a) => a.slice(0, a.indexOf('.'))))]);
export const esAspectoDeContinuidad = (v: unknown): v is ContinuityAspect => typeof v === 'string' && (ASPECTOS_DE_CONTINUIDAD as readonly string[]).includes(v);
export type ContinuityStrength = 'relaxed' | 'standard' | 'strict';
export const FUERZAS_DE_CONTINUIDAD: readonly ContinuityStrength[] = Object.freeze([
    'relaxed', 'standard', 'strict',
] as const);
export interface ContinuityAnchor {
    elementId: string;
    version: number;
}
export interface ContinuityRequirements {
    preserve: readonly ContinuityAspect[];
    mayChange?: readonly ContinuityAspect[];
    anchors?: readonly ContinuityAnchor[];
    strength?: ContinuityStrength;
    spatial?: readonly SpatialConstraint[];
}
export type SpatialRelationKind = 'next_to' | 'behind' | 'in_front_of' | 'inside' | 'above' | 'below' | 'aligned_with' | 'attached_to';
export const RELACIONES_ESPACIALES: readonly SpatialRelationKind[] = Object.freeze([
    'next_to', 'behind', 'in_front_of', 'inside', 'above', 'below', 'aligned_with', 'attached_to',
] as const);
export interface SpatialConstraint {
    subject: string;
    relation: SpatialRelationKind;
    object: string;
}
export const MAX_ASPECTOS_POR_LISTA = ASPECTOS_DE_CONTINUIDAD.length;
export const MAX_ANCLAJES = 16;
export const MAX_VERSION_DE_ANCLAJE = 9999;
export const FORMA_DE_ID_DE_ANCLAJE = /^[A-Za-z0-9_-]{4,128}$/;
export type MotivoDeContinuidadInvalida = 'invalid_shape' | 'unknown_field' | 'dangerous_key' | 'forbidden_key' | 'invalid_aspect' | 'duplicate_aspect' | 'conflicting_aspect' | 'empty_preserve' | 'invalid_strength' | 'invalid_anchor' | 'duplicate_anchor' | 'invalid_relation' | 'self_relation' | 'too_many';
export interface ProblemaDeContinuidad {
    field: string;
    reason: MotivoDeContinuidadInvalida;
}
const mal = (field: string, reason: MotivoDeContinuidadInvalida): ProblemaDeContinuidad => ({ field, reason });
const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const esNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const esTxt = (v: unknown): v is string => typeof v === 'string';
const PELIGROSAS = ['__proto__', 'constructor', 'prototype'];
const PROHIBIDAS = [
    'storageref', 'bucket', 'objectkey', 'url', 'signedurl', 'downloadurl', 'endpoint',
    'providerid', 'modelid', 'adapterid', 'provider', 'model', 'adapter',
    'apikey', 'secret', 'credential', 'credentials', 'token', 'authorization',
    'bytes', 'content', 'data', 'buffer', 'blob', 'embedding', 'embeddings', 'vector',
    'prompt', 'negativeprompt', 'seed',
];
const normalizar = (c: string): string => c.toLowerCase().replace(/[-_]/g, '');
export const claveProhibidaDeContinuidad = (clave: string): boolean => PROHIBIDAS.includes(clave.toLowerCase()) || PROHIBIDAS.includes(normalizar(clave));
const CAMPOS_DE_REQUISITOS: readonly string[] = ['preserve', 'mayChange', 'anchors', 'strength', 'spatial'];
const CAMPOS_DE_RELACION: readonly string[] = ['subject', 'relation', 'object'];
export const MAX_RELACIONES_ESPACIALES = 16;
const CAMPOS_DE_ANCLAJE: readonly string[] = ['elementId', 'version'];
export const anclajeValido = (v: unknown): v is ContinuityAnchor => {
    if (!esObjeto(v))
        return false;
    if (Object.keys(v).some((k) => !CAMPOS_DE_ANCLAJE.includes(k)))
        return false;
    if (!esTxt(v.elementId) || !FORMA_DE_ID_DE_ANCLAJE.test(v.elementId))
        return false;
    return esNum(v.version) && Number.isInteger(v.version)
        && v.version >= 1 && v.version <= MAX_VERSION_DE_ANCLAJE;
};
const propia = (o: Record<string, unknown>, c: string): boolean => Object.prototype.hasOwnProperty.call(o, c);
const revisarLista = (valor: unknown, campo: string, p: ProblemaDeContinuidad[]): readonly string[] => {
    if (!Array.isArray(valor)) {
        p.push(mal(campo, 'invalid_shape'));
        return [];
    }
    if (valor.length > MAX_ASPECTOS_POR_LISTA)
        p.push(mal(campo, 'too_many'));
    const vistos = new Set<string>();
    for (let i = 0; i < valor.length; i++) {
        const a = valor[i];
        if (!esAspectoDeContinuidad(a)) {
            p.push(mal(`${campo}[${i}]`, 'invalid_aspect'));
            continue;
        }
        if (vistos.has(a)) {
            p.push(mal(`${campo}[${i}]`, 'duplicate_aspect'));
            continue;
        }
        vistos.add(a);
    }
    return [...vistos];
};
export const validarContinuidad = (crudo: unknown): readonly ProblemaDeContinuidad[] => {
    if (!esObjeto(crudo))
        return [mal('continuity', 'invalid_shape')];
    const d = crudo;
    const p: ProblemaDeContinuidad[] = [];
    for (const [clave, valor] of Object.entries(d)) {
        if (PELIGROSAS.includes(clave)) {
            p.push(mal(clave, 'dangerous_key'));
            continue;
        }
        if (claveProhibidaDeContinuidad(clave)) {
            p.push(mal(clave, 'forbidden_key'));
            continue;
        }
        if (!CAMPOS_DE_REQUISITOS.includes(clave)) {
            p.push(mal(clave, 'unknown_field'));
            continue;
        }
        if (typeof valor === 'function')
            p.push(mal(clave, 'invalid_shape'));
    }
    if (!propia(d, 'preserve'))
        p.push(mal('preserve', 'invalid_shape'));
    const preservar = propia(d, 'preserve') ? revisarLista(d.preserve, 'preserve', p) : [];
    if (Array.isArray(d.preserve) && d.preserve.length === 0)
        p.push(mal('preserve', 'empty_preserve'));
    const liberar = d.mayChange === undefined ? [] : revisarLista(d.mayChange, 'mayChange', p);
    const enLasDos = preservar.filter((a) => liberar.includes(a));
    for (const a of enLasDos)
        p.push(mal(a, 'conflicting_aspect'));
    if (d.strength !== undefined
        && !(esTxt(d.strength) && (FUERZAS_DE_CONTINUIDAD as readonly string[]).includes(d.strength))) {
        p.push(mal('strength', 'invalid_strength'));
    }
    if (d.anchors !== undefined) {
        if (!Array.isArray(d.anchors))
            p.push(mal('anchors', 'invalid_shape'));
        else {
            if (d.anchors.length > MAX_ANCLAJES)
                p.push(mal('anchors', 'too_many'));
            const vistos = new Set<string>();
            for (let i = 0; i < d.anchors.length; i++) {
                const a: unknown = d.anchors[i];
                const campo = `anchors[${i}]`;
                if (!anclajeValido(a)) {
                    p.push(mal(campo, 'invalid_anchor'));
                    continue;
                }
                if (vistos.has(a.elementId)) {
                    p.push(mal(campo, 'duplicate_anchor'));
                    continue;
                }
                vistos.add(a.elementId);
            }
        }
    }
    if (d.spatial !== undefined) {
        if (!Array.isArray(d.spatial))
            p.push(mal('spatial', 'invalid_shape'));
        else {
            if (d.spatial.length > MAX_RELACIONES_ESPACIALES)
                p.push(mal('spatial', 'too_many'));
            for (let i = 0; i < d.spatial.length; i++) {
                const r: unknown = d.spatial[i];
                const campo = `spatial[${i}]`;
                if (!esObjeto(r) || Object.keys(r).some((k) => !CAMPOS_DE_RELACION.includes(k))) {
                    p.push(mal(campo, 'invalid_relation'));
                    continue;
                }
                const sujetoOk = esTxt(r.subject) && FORMA_DE_ID_DE_ANCLAJE.test(r.subject);
                const objetoOk = esTxt(r.object) && FORMA_DE_ID_DE_ANCLAJE.test(r.object);
                const verboOk = esTxt(r.relation) && (RELACIONES_ESPACIALES as readonly string[]).includes(r.relation);
                if (!sujetoOk || !objetoOk || !verboOk) {
                    p.push(mal(campo, 'invalid_relation'));
                    continue;
                }
                if (r.subject === r.object)
                    p.push(mal(campo, 'self_relation'));
            }
        }
    }
    return Object.freeze(p);
};
export const continuidadValida = (crudo: unknown): crudo is ContinuityRequirements => validarContinuidad(crudo).length === 0;
export type ExigenciaDeContinuidad = 'preserve' | 'may_change' | 'unspecified';
export const exigenciaDe = (requisitos: ContinuityRequirements | undefined, aspecto: ContinuityAspect): ExigenciaDeContinuidad => {
    if (!requisitos)
        return 'unspecified';
    if (requisitos.preserve.includes(aspecto))
        return 'preserve';
    if (requisitos.mayChange?.includes(aspecto))
        return 'may_change';
    return 'unspecified';
};
export interface ContinuitySupport {
    preserves: readonly ContinuityAspect[];
}
export type MotivoDeRechazoPrevio = 'unsupported_aspect';
export interface RechazoPrevio {
    status: 'pre_execution_rejected';
    reason: MotivoDeRechazoPrevio;
    missing: readonly ContinuityAspect[];
}
export type RevisionPrevia = {
    ok: true;
} | RechazoPrevio;
export const aspectosSinCubrir = (requisitos: ContinuityRequirements | undefined, soporte: ContinuitySupport | undefined): readonly ContinuityAspect[] => {
    const exigidos = requisitos?.preserve ?? [];
    if (exigidos.length === 0)
        return Object.freeze([]);
    const sabe = new Set(soporte?.preserves ?? []);
    return Object.freeze(exigidos.filter((a) => !sabe.has(a)));
};
export const puedeCumplir = (requisitos: ContinuityRequirements | undefined, soporte: ContinuitySupport | undefined): boolean => aspectosSinCubrir(requisitos, soporte).length === 0;
export const revisarAntesDeEjecutar = (requisitos: ContinuityRequirements | undefined, soporte: ContinuitySupport | undefined): RevisionPrevia => {
    const faltan = aspectosSinCubrir(requisitos, soporte);
    if (faltan.length === 0)
        return { ok: true };
    return Object.freeze({ status: 'pre_execution_rejected', reason: 'unsupported_aspect', missing: faltan });
};
export type ContinuityStatus = 'pass' | 'warn' | 'fail' | 'unknown';
export const ESTADOS_DE_CONTINUIDAD: readonly ContinuityStatus[] = Object.freeze([
    'pass', 'warn', 'fail', 'unknown',
] as const);
export type ContinuityConfidence = 'low' | 'medium' | 'high';
export const CONFIANZAS_DE_CONTINUIDAD: readonly ContinuityConfidence[] = Object.freeze([
    'low', 'medium', 'high',
] as const);
export type MotivoDeVeredicto = 'not_required' | 'not_checked' | 'validator_unavailable' | 'reference_unavailable' | 'matches_reference' | 'differs_from_reference' | 'change_allowed' | 'inconclusive';
export interface VeredictoDeAspecto {
    aspect: ContinuityAspect;
    status: ContinuityStatus;
    confidence?: ContinuityConfidence;
    reason?: MotivoDeVeredicto;
}
export interface ContinuityVerdict {
    contract: typeof CONTINUITY_CONTRACT_VERSION;
    status: ContinuityStatus;
    aspects: readonly VeredictoDeAspecto[];
    validatedAt: number;
}
export const resumirVeredicto = (requisitos: ContinuityRequirements | undefined, aspectos: readonly VeredictoDeAspecto[]): ContinuityStatus => {
    const exigidos = requisitos?.preserve ?? [];
    if (exigidos.length === 0)
        return 'unknown';
    const porAspecto = new Map<ContinuityAspect, ContinuityStatus>();
    for (const a of aspectos)
        if (!porAspecto.has(a.aspect))
            porAspecto.set(a.aspect, a.status);
    let hayAviso = false;
    let hayDesconocido = false;
    for (const aspecto of exigidos) {
        const estado = porAspecto.get(aspecto);
        if (estado === 'fail')
            return 'fail';
        if (estado === undefined || estado === 'unknown') {
            hayDesconocido = true;
            continue;
        }
        if (estado === 'warn')
            hayAviso = true;
    }
    if (hayDesconocido)
        return 'unknown';
    return hayAviso ? 'warn' : 'pass';
};
export const rompeLaContinuidad = (requisitos: ContinuityRequirements | undefined, veredicto: VeredictoDeAspecto): boolean => exigenciaDe(requisitos, veredicto.aspect) === 'preserve' && veredicto.status === 'fail';
const CAMPOS_DE_VEREDICTO: readonly string[] = ['contract', 'status', 'aspects', 'validatedAt'];
const CAMPOS_DE_ASPECTO: readonly string[] = ['aspect', 'status', 'confidence', 'reason'];
const MOTIVOS: readonly MotivoDeVeredicto[] = Object.freeze([
    'not_required', 'not_checked', 'validator_unavailable', 'reference_unavailable',
    'matches_reference', 'differs_from_reference', 'change_allowed', 'inconclusive',
] as const);
export const validarVeredicto = (crudo: unknown): readonly ProblemaDeContinuidad[] => {
    if (!esObjeto(crudo))
        return [mal('verdict', 'invalid_shape')];
    const d = crudo;
    const p: ProblemaDeContinuidad[] = [];
    for (const clave of Object.keys(d)) {
        if (PELIGROSAS.includes(clave)) {
            p.push(mal(clave, 'dangerous_key'));
            continue;
        }
        if (claveProhibidaDeContinuidad(clave)) {
            p.push(mal(clave, 'forbidden_key'));
            continue;
        }
        if (!CAMPOS_DE_VEREDICTO.includes(clave))
            p.push(mal(clave, 'unknown_field'));
    }
    for (const campo of CAMPOS_DE_VEREDICTO)
        if (!propia(d, campo))
            p.push(mal(campo, 'invalid_shape'));
    if (d.contract !== CONTINUITY_CONTRACT_VERSION)
        p.push(mal('contract', 'invalid_shape'));
    if (!esTxt(d.status) || !(ESTADOS_DE_CONTINUIDAD as readonly string[]).includes(d.status)) {
        p.push(mal('status', 'invalid_shape'));
    }
    if (!esNum(d.validatedAt) || d.validatedAt < 0)
        p.push(mal('validatedAt', 'invalid_shape'));
    if (!Array.isArray(d.aspects))
        p.push(mal('aspects', 'invalid_shape'));
    else {
        if (d.aspects.length > MAX_ASPECTOS_POR_LISTA)
            p.push(mal('aspects', 'too_many'));
        const vistos = new Set<string>();
        for (let i = 0; i < d.aspects.length; i++) {
            const a: unknown = d.aspects[i];
            const campo = `aspects[${i}]`;
            if (!esObjeto(a)) {
                p.push(mal(campo, 'invalid_shape'));
                continue;
            }
            if (Object.keys(a).some((k) => !CAMPOS_DE_ASPECTO.includes(k))) {
                p.push(mal(campo, 'unknown_field'));
                continue;
            }
            if (!esAspectoDeContinuidad(a.aspect)) {
                p.push(mal(campo, 'invalid_aspect'));
                continue;
            }
            if (vistos.has(a.aspect)) {
                p.push(mal(campo, 'duplicate_aspect'));
                continue;
            }
            vistos.add(a.aspect);
            if (!esTxt(a.status) || !(ESTADOS_DE_CONTINUIDAD as readonly string[]).includes(a.status))
                p.push(mal(campo, 'invalid_shape'));
            if (a.confidence !== undefined
                && !(esTxt(a.confidence) && (CONFIANZAS_DE_CONTINUIDAD as readonly string[]).includes(a.confidence))) {
                p.push(mal(campo, 'invalid_shape'));
            }
            if (a.reason !== undefined && !(esTxt(a.reason) && (MOTIVOS as readonly string[]).includes(a.reason))) {
                p.push(mal(campo, 'invalid_shape'));
            }
        }
    }
    return Object.freeze(p);
};
export const veredictoValido = (crudo: unknown): crudo is ContinuityVerdict => validarVeredicto(crudo).length === 0;
