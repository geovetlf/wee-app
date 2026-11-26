// GENERADO por scripts/espejo-filmmaker.mjs desde functions/src/core/model-capability.ts: no se edita a mano, se regenera.
export const MODEL_CAPABILITIES_VERSION = 1 as const;
export type Soporte = 'si' | 'no' | 'no_implementado' | 'no_verificado';
export type EstadoDeModelo = 'NOT_CONFIGURED' | 'CONFIGURED' | 'VALIDATED' | 'ENABLED';
export type ResolucionDeModelo = '480p' | '720p' | '1080p' | '4k';
export type TipoDeReferencia = 'image' | 'video' | 'audio';
export type RolDeReferencia = 'style' | 'character' | 'location' | 'object' | 'motion' | 'audio' | 'general';
export type ModoDeToma = 'nuevo' | 'extender' | 'editar';
export type DireccionDeExtension = 'forward' | 'backward';
export type NivelDeFuente = 'OFI' | 'MKT' | '3P' | 'NV';
export const ROLES_DE_REFERENCIA: readonly RolDeReferencia[] = Object.freeze(['style', 'character', 'location', 'object', 'motion', 'audio', 'general']);
export const MATERIAL_DEL_ROL: Readonly<Partial<Record<RolDeReferencia, TipoDeReferencia>>> = Object.freeze({ audio: 'audio', motion: 'video' });
export interface FuenteDeCapacidad {
    readonly campo: string;
    readonly documento: string;
    readonly nivel: NivelDeFuente;
    readonly fecha: string;
}
export interface CapacidadesDeModelo {
    readonly version: typeof MODEL_CAPABILITIES_VERSION;
    readonly modeloId: string;
    readonly proveedor: string;
    readonly familia: string;
    readonly nombreVisible: string;
    readonly estado: EstadoDeModelo;
    readonly duracion: {
        readonly minSec: number;
        readonly maxSec: number;
        readonly automatica: boolean;
    };
    readonly resoluciones: readonly ResolucionDeModelo[];
    readonly proporciones: readonly string[];
    readonly referencias: {
        readonly imagenes: number;
        readonly videos: number;
        readonly audios: number;
        readonly total: number;
        readonly segundosDeVideo: number;
        readonly segundosDeAudio: number;
        readonly audioSinImagenNiVideo: Soporte;
        readonly roles: readonly RolDeReferencia[];
    };
    readonly fotogramas: {
        readonly primero: Soporte;
        readonly ultimo: Soporte;
        readonly conReferencias: Soporte;
    };
    readonly extender: {
        readonly soporte: Soporte;
        readonly direcciones: readonly DireccionDeExtension[];
        readonly segundosMax: number;
    };
    readonly editar: {
        readonly soporte: Soporte;
    };
    readonly origen: {
        readonly formatos: readonly string[];
        readonly maxSecDeVideo: number;
        readonly ventanaDeConfianzaDias: number | null;
    };
    readonly audioNativo: Soporte;
    readonly lipSync: Soporte;
    readonly borrador: Soporte;
    readonly semilla: Soporte;
    readonly variantes: {
        readonly max: number;
    };
    readonly asincronia: {
        readonly sondeo: boolean;
        readonly webhook: boolean;
    };
    readonly personasReales: 'rechaza' | 'activo_autorizado' | 'permite' | 'no_verificado';
    readonly precio: {
        readonly unidad: 'token' | 'segundo' | 'clip';
        readonly fuente: string;
        readonly verificado: boolean;
    };
    readonly fuentes?: readonly FuenteDeCapacidad[];
}
export interface ReferenciaDePlano {
    readonly id: string;
    readonly tipo: TipoDeReferencia;
    readonly rol: RolDeReferencia;
    readonly duracionSec?: number;
    readonly formato?: string;
    readonly rostroReal?: 'no' | 'si' | 'desconocido';
    readonly activoAutorizado?: boolean;
}
export interface OrigenDePlano {
    readonly toma: number;
    readonly propio: boolean;
    readonly lista: boolean;
    readonly duracionSec?: number;
    readonly formato?: string;
    readonly generadoEnMs?: number;
    readonly yaExtendida?: boolean;
}
export interface PlanoDeVideo {
    readonly version: typeof MODEL_CAPABILITIES_VERSION;
    readonly modo: ModoDeToma;
    readonly duracionSec: number;
    readonly proporcion?: string;
    readonly resolucion?: ResolucionDeModelo;
    readonly conAudio?: boolean;
    readonly borrador?: boolean;
    readonly semilla?: number;
    readonly lipSync?: boolean;
    readonly referencias: readonly ReferenciaDePlano[];
    readonly primerFotograma?: {
        readonly id: string;
    };
    readonly ultimoFotograma?: {
        readonly id: string;
    };
    readonly origen?: OrigenDePlano;
    readonly direccion?: DireccionDeExtension;
    readonly segundosExtra?: number;
    readonly ahoraMs?: number;
}
export const CODIGOS_DE_PLANO = Object.freeze([
    'model_not_enabled', 'capability_not_implemented', 'capability_unverified',
    'duration_invalid', 'duration_auto_not_supported', 'duration_above_max', 'duration_rounded_up',
    'aspect_not_supported', 'resolution_not_supported',
    'references_not_supported', 'references_over_limit', 'references_total_over', 'references_video_seconds_over',
    'reference_duplicated', 'reference_role_not_supported', 'reference_role_mismatch', 'audio_alone_not_supported',
    'first_frame_not_supported', 'last_frame_not_supported', 'last_frame_without_first', 'frames_with_references_not_supported',
    'extend_not_supported', 'edit_not_supported', 'extend_direction_not_supported', 'extend_seconds_invalid',
    'origin_required', 'origin_not_owned', 'origin_not_ready', 'origin_format_not_supported', 'origin_too_long',
    'origin_outside_trust_window', 'origin_already_extended',
    'real_person_not_authorized', 'real_person_unknown',
    'native_audio_not_supported', 'lip_sync_not_supported', 'draft_not_supported', 'seed_not_supported',
    'price_unverified',
] as const);
export type CodigoDePlano = typeof CODIGOS_DE_PLANO[number];
export interface ProblemaDePlano {
    readonly codigo: CodigoDePlano;
    readonly gravedad: 'error' | 'aviso';
    readonly ruta: string;
    readonly parametros: Readonly<Record<string, string | number | boolean>>;
    readonly claveI18n: string;
    readonly reintentable: false;
}
export interface ResultadoDePlano {
    readonly ok: boolean;
    readonly errores: readonly ProblemaDePlano[];
    readonly avisos: readonly ProblemaDePlano[];
}
export const claveDeProblemaDePlano = (codigo: string): string => `filmmaker.model.${codigo}`;
const DIA_MS = 86400000;
const GRAVEDAD_DE_AVISO: ReadonlySet<CodigoDePlano> = new Set<CodigoDePlano>([
    'duration_rounded_up', 'origin_outside_trust_window', 'origin_already_extended', 'real_person_unknown', 'price_unverified',
]);
const contar = (rs: readonly ReferenciaDePlano[], tipo: TipoDeReferencia): number => rs.filter((r) => r.tipo === tipo).length;
export const etiquetasDeReferencias = (rs: readonly Pick<ReferenciaDePlano, 'id' | 'tipo'>[], ocupados: Partial<Record<TipoDeReferencia, number>> = {}): Readonly<Record<string, string>> => {
    const n: Record<TipoDeReferencia, number> = { image: ocupados.image ?? 0, video: ocupados.video ?? 0, audio: ocupados.audio ?? 0 };
    const nombre: Record<TipoDeReferencia, string> = { image: 'imagen', video: 'video', audio: 'audio' };
    const salida: Record<string, string> = {};
    for (const r of rs) {
        n[r.tipo] += 1;
        salida[r.id] = `@${nombre[r.tipo]}${n[r.tipo]}`;
    }
    return Object.freeze(salida);
};
export const canonicoDePlano = (p: PlanoDeVideo, modeloId: string): string => {
    const orden = (v: unknown): unknown => {
        if (Array.isArray(v))
            return v.map(orden);
        if (v && typeof v === 'object') {
            const o = v as Record<string, unknown>;
            return Object.fromEntries(Object.keys(o).sort().filter((k) => o[k] !== undefined).map((k) => [k, orden(o[k])]));
        }
        return v;
    };
    const { ahoraMs: _reloj, ...sinReloj } = p;
    void _reloj;
    const origen = p.origen ? { toma: p.origen.toma } : undefined;
    return JSON.stringify(orden({ ...sinReloj, origen, modeloId }));
};
export const validarPlano = (plano: PlanoDeVideo, caps: CapacidadesDeModelo): ResultadoDePlano => {
    const problemas: ProblemaDePlano[] = [];
    const dice = (codigo: CodigoDePlano, ruta: string, parametros: ProblemaDePlano['parametros'] = {}): void => {
        problemas.push({
            codigo, gravedad: GRAVEDAD_DE_AVISO.has(codigo) ? 'aviso' : 'error', ruta, parametros,
            claveI18n: claveDeProblemaDePlano(codigo), reintentable: false,
        });
    };
    const cierra = (s: Soporte, noSoportado: CodigoDePlano, ruta: string, capacidad: string): boolean => {
        if (s === 'si')
            return false;
        if (s === 'no')
            dice(noSoportado, ruta, { model: caps.modeloId });
        else
            dice(s === 'no_implementado' ? 'capability_not_implemented' : 'capability_unverified', ruta, { capability: capacidad, model: caps.modeloId });
        return true;
    };
    if (caps.estado !== 'ENABLED')
        dice('model_not_enabled', 'modelo', { state: caps.estado, model: caps.modeloId });
    const refs = plano.referencias;
    const extiende = plano.modo === 'extender';
    const edita = plano.modo === 'editar';
    const conOrigen = extiende || edita;
    if (extiende) {
        if (!cierra(caps.extender.soporte, 'extend_not_supported', 'modo', 'extend')) {
            if (plano.direccion && !caps.extender.direcciones.includes(plano.direccion)) {
                dice('extend_direction_not_supported', 'direccion', { direction: plano.direccion });
            }
            const s = plano.segundosExtra;
            if (typeof s !== 'number' || !Number.isFinite(s) || s <= 0 || s > caps.extender.segundosMax) {
                dice('extend_seconds_invalid', 'segundosExtra', { max: caps.extender.segundosMax });
            }
        }
    }
    if (edita)
        cierra(caps.editar.soporte, 'edit_not_supported', 'modo', 'edit');
    if (conOrigen) {
        const o = plano.origen;
        if (!o)
            dice('origin_required', 'origen');
        else {
            if (!o.propio)
                dice('origin_not_owned', 'origen', { take: o.toma });
            if (!o.lista)
                dice('origin_not_ready', 'origen', { take: o.toma });
            if (o.formato && !caps.origen.formatos.includes(o.formato.toLowerCase())) {
                dice('origin_format_not_supported', 'origen.formato', { format: o.formato, accepted: caps.origen.formatos.join(',') });
            }
            if (typeof o.duracionSec === 'number' && o.duracionSec > caps.origen.maxSecDeVideo) {
                dice('origin_too_long', 'origen.duracionSec', { durationSec: o.duracionSec, maxSec: caps.origen.maxSecDeVideo });
            }
            const v = caps.origen.ventanaDeConfianzaDias;
            if (v !== null && typeof o.generadoEnMs === 'number' && typeof plano.ahoraMs === 'number' && plano.ahoraMs - o.generadoEnMs > v * DIA_MS) {
                dice('origin_outside_trust_window', 'origen', { days: v });
            }
            if (o.yaExtendida)
                dice('origin_already_extended', 'origen', { take: o.toma });
        }
    }
    const d = plano.duracionSec;
    const { minSec, maxSec, automatica } = caps.duracion;
    if (edita) {
        if (d !== -1)
            dice('duration_invalid', 'duracionSec', { expected: -1 });
    }
    else if (extiende) {
    }
    else if (d === -1) {
        if (!automatica)
            dice('duration_auto_not_supported', 'duracionSec', { model: caps.modeloId });
    }
    else if (typeof d !== 'number' || !Number.isFinite(d) || d <= 0) {
        dice('duration_invalid', 'duracionSec');
    }
    else if (d > maxSec) {
        dice('duration_above_max', 'duracionSec', { requestedSec: d, maxSec });
    }
    else if (d < minSec) {
        dice('duration_rounded_up', 'duracionSec', { requestedSec: d, usedSec: minSec });
    }
    if (!conOrigen && plano.proporcion !== undefined && !caps.proporciones.includes(plano.proporcion)) {
        dice('aspect_not_supported', 'proporcion', { aspectRatio: plano.proporcion, accepted: caps.proporciones.join(',') });
    }
    if (plano.resolucion !== undefined && !caps.resoluciones.includes(plano.resolucion)) {
        dice('resolution_not_supported', 'resolucion', { resolution: plano.resolucion, accepted: caps.resoluciones.join(',') });
    }
    const por: Record<TipoDeReferencia, number> = { image: contar(refs, 'image'), video: contar(refs, 'video'), audio: contar(refs, 'audio') };
    const videosConOrigen = por.video + (conOrigen ? 1 : 0);
    const tope: Record<TipoDeReferencia, number> = { image: caps.referencias.imagenes, video: caps.referencias.videos, audio: caps.referencias.audios };
    const hay = refs.length + (conOrigen ? 1 : 0) > 0;
    if (hay && caps.referencias.total === 0) {
        dice('references_not_supported', 'referencias', { model: caps.modeloId });
    }
    else {
        (['image', 'video', 'audio'] as const).forEach((t) => {
            const n = t === 'video' ? videosConOrigen : por[t];
            if (n > tope[t])
                dice('references_over_limit', 'referencias', { kind: t, count: n, max: tope[t] });
        });
        const total = refs.length + (conOrigen ? 1 : 0) + (plano.primerFotograma ? 1 : 0) + (plano.ultimoFotograma ? 1 : 0);
        if (total > caps.referencias.total && caps.referencias.total > 0)
            dice('references_total_over', 'referencias', { count: total, max: caps.referencias.total });
    }
    const segVideo = refs.filter((r) => r.tipo === 'video').reduce((s, r) => s + (r.duracionSec ?? 0), 0) + (conOrigen ? plano.origen?.duracionSec ?? 0 : 0);
    if (segVideo > caps.referencias.segundosDeVideo)
        dice('references_video_seconds_over', 'referencias', { seconds: segVideo, max: caps.referencias.segundosDeVideo });
    if (por.audio > 0 && por.image + videosConOrigen === 0 && !plano.primerFotograma && caps.referencias.audioSinImagenNiVideo !== 'si') {
        dice('audio_alone_not_supported', 'referencias', { model: caps.modeloId });
    }
    const vistos = new Set<string>();
    refs.forEach((r, i) => {
        if (vistos.has(r.id))
            dice('reference_duplicated', `referencias.${i}`, { id: r.id });
        else
            vistos.add(r.id);
        if (!caps.referencias.roles.includes(r.rol))
            dice('reference_role_not_supported', `referencias.${i}`, { role: r.rol });
        const exigido = MATERIAL_DEL_ROL[r.rol];
        if (exigido !== undefined && exigido !== r.tipo)
            dice('reference_role_mismatch', `referencias.${i}`, { role: r.rol, expected: exigido, kind: r.tipo });
        if (r.rostroReal === 'si' && r.activoAutorizado !== true && caps.personasReales !== 'permite') {
            dice('real_person_not_authorized', `referencias.${i}`, { id: r.id, policy: caps.personasReales });
        }
        else if (r.rostroReal === 'desconocido' && caps.personasReales !== 'permite') {
            dice('real_person_unknown', `referencias.${i}`, { id: r.id });
        }
    });
    if (plano.primerFotograma)
        cierra(caps.fotogramas.primero, 'first_frame_not_supported', 'primerFotograma', 'first_frame');
    if (plano.ultimoFotograma) {
        if (!plano.primerFotograma)
            dice('last_frame_without_first', 'ultimoFotograma');
        cierra(caps.fotogramas.ultimo, 'last_frame_not_supported', 'ultimoFotograma', 'last_frame');
    }
    if ((plano.primerFotograma || plano.ultimoFotograma) && refs.length > 0) {
        cierra(caps.fotogramas.conReferencias, 'frames_with_references_not_supported', 'referencias', 'frames_with_references');
    }
    if ((plano.primerFotograma || plano.ultimoFotograma) && conOrigen)
        dice('frames_with_references_not_supported', 'modo', { mode: plano.modo });
    if (plano.conAudio === true)
        cierra(caps.audioNativo, 'native_audio_not_supported', 'conAudio', 'native_audio');
    if (plano.lipSync === true)
        cierra(caps.lipSync, 'lip_sync_not_supported', 'lipSync', 'lip_sync');
    if (plano.borrador === true)
        cierra(caps.borrador, 'draft_not_supported', 'borrador', 'draft');
    if (plano.semilla !== undefined)
        cierra(caps.semilla, 'seed_not_supported', 'semilla', 'seed');
    if (!caps.precio.verificado)
        dice('price_unverified', 'modelo', { model: caps.modeloId });
    const errores = problemas.filter((p) => p.gravedad === 'error');
    return { ok: errores.length === 0, errores, avisos: problemas.filter((p) => p.gravedad === 'aviso') };
};
