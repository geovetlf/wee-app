// GENERADO por scripts/espejo-filmmaker.mjs desde functions/src/core/creative.ts: no se edita a mano, se regenera.
import { CREATIVE_PARAMETERS_VERSION } from './contracts';
export type CameraType = 'aerial' | 'ground' | 'handheld' | 'pov' | 'macro' | 'overhead' | 'underwater';
export type PerspectiveType = 'eye_level' | 'low_angle' | 'high_angle' | 'aerial';
export type ShotType = 'establishing' | 'wide' | 'medium' | 'close_up' | 'extreme_close_up' | 'hero';
export type LensType = 'wide' | 'standard' | 'telephoto' | 'macro' | 'fisheye';
export type MovementType = 'static' | 'dolly_in' | 'dolly_out' | 'tracking' | 'orbit' | 'pan' | 'tilt' | 'crane_up' | 'crane_down' | 'push_in' | 'pull_out' | 'follow';
export type MotionSpeed = 'slow' | 'normal' | 'fast';
export type MotionSmoothness = 'smooth' | 'natural' | 'dynamic';
export type LightingType = 'natural' | 'golden_hour' | 'blue_hour' | 'studio' | 'dramatic' | 'soft' | 'high_contrast' | 'night';
export type CompositionType = 'centered' | 'rule_of_thirds' | 'symmetrical' | 'negative_space' | 'foreground_depth';
export type TransitionType = 'cut' | 'dissolve' | 'fade' | 'match_cut' | 'whip' | 'seamless';
export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5' | '4:3' | '21:9';
export interface CreativeParameters {
    version: number;
    camera?: {
        type?: CameraType;
        perspective?: PerspectiveType;
    };
    shot?: {
        type?: ShotType;
    };
    lens?: {
        type?: LensType;
        focalLengthMm?: number;
    };
    movement?: {
        type?: MovementType;
        speed?: MotionSpeed;
    };
    motion?: {
        smoothness?: MotionSmoothness;
    };
    lighting?: {
        type?: LightingType;
    };
    composition?: {
        type?: CompositionType;
    };
    transition?: {
        type?: TransitionType;
    };
    framing?: {
        aspectRatio?: AspectRatio;
    };
}
export const RUTAS_CREATIVAS = [
    'camera.type', 'camera.perspective',
    'shot.type',
    'lens.type', 'lens.focalLengthMm',
    'movement.type', 'movement.speed',
    'motion.smoothness',
    'lighting.type',
    'composition.type',
    'transition.type',
    'framing.aspectRatio',
] as const;
export type CreativeParameterPath = typeof RUTAS_CREATIVAS[number];
const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const esNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const PELIGROSAS = ['__proto__', 'constructor', 'prototype'];
const CAMARAS: readonly string[] = ['aerial', 'ground', 'handheld', 'pov', 'macro', 'overhead', 'underwater'];
const PERSPECTIVAS: readonly string[] = ['eye_level', 'low_angle', 'high_angle', 'aerial'];
const PLANOS: readonly string[] = ['establishing', 'wide', 'medium', 'close_up', 'extreme_close_up', 'hero'];
const OPTICAS: readonly string[] = ['wide', 'standard', 'telephoto', 'macro', 'fisheye'];
const MOVIMIENTOS: readonly string[] = ['static', 'dolly_in', 'dolly_out', 'tracking', 'orbit', 'pan', 'tilt', 'crane_up', 'crane_down', 'push_in', 'pull_out', 'follow'];
const VELOCIDADES: readonly string[] = ['slow', 'normal', 'fast'];
const SUAVIDADES: readonly string[] = ['smooth', 'natural', 'dynamic'];
const LUCES: readonly string[] = ['natural', 'golden_hour', 'blue_hour', 'studio', 'dramatic', 'soft', 'high_contrast', 'night'];
const COMPOSICIONES: readonly string[] = ['centered', 'rule_of_thirds', 'symmetrical', 'negative_space', 'foreground_depth'];
const TRANSICIONES: readonly string[] = ['cut', 'dissolve', 'fade', 'match_cut', 'whip', 'seamless'];
export const PROPORCIONES: readonly string[] = ['16:9', '9:16', '1:1', '4:5', '4:3', '21:9'];
export const FOCAL_MIN_MM = 4;
export const FOCAL_MAX_MM = 1200;
const GRUPOS: Readonly<Record<string, Readonly<Record<string, readonly string[] | 'mm'>>>> = {
    camera: { type: CAMARAS, perspective: PERSPECTIVAS },
    shot: { type: PLANOS },
    lens: { type: OPTICAS, focalLengthMm: 'mm' },
    movement: { type: MOVIMIENTOS, speed: VELOCIDADES },
    motion: { smoothness: SUAVIDADES },
    lighting: { type: LUCES },
    composition: { type: COMPOSICIONES },
    transition: { type: TRANSICIONES },
    framing: { aspectRatio: PROPORCIONES },
};
export type MotivoCreativoInvalido = 'invalid_shape' | 'unknown_field' | 'dangerous_key' | 'invalid_version' | 'invalid_value' | 'out_of_range' | 'incoherent';
export interface ProblemaCreativo {
    path: string;
    reason: MotivoCreativoInvalido;
}
const mal = (path: string, reason: MotivoCreativoInvalido): ProblemaCreativo => ({ path, reason });
export const validarCreativos = (crudo: unknown): readonly ProblemaCreativo[] => {
    if (!esObjeto(crudo))
        return [mal('creative', 'invalid_shape')];
    const p: ProblemaCreativo[] = [];
    if (!Object.prototype.hasOwnProperty.call(crudo, 'version'))
        p.push(mal('creative.version', 'invalid_version'));
    if (!esNum(crudo.version) || !Number.isInteger(crudo.version) || crudo.version < 1 || crudo.version > 99) {
        p.push(mal('creative.version', 'invalid_version'));
    }
    for (const [clave, valor] of Object.entries(crudo)) {
        if (PELIGROSAS.includes(clave)) {
            p.push(mal(`creative.${clave}`, 'dangerous_key'));
            continue;
        }
        if (clave === 'version')
            continue;
        const grupo = Object.prototype.hasOwnProperty.call(GRUPOS, clave) ? GRUPOS[clave] : undefined;
        if (!grupo) {
            p.push(mal(`creative.${clave}`, 'unknown_field'));
            continue;
        }
        if (!esObjeto(valor)) {
            p.push(mal(`creative.${clave}`, 'invalid_shape'));
            continue;
        }
        for (const [campo, dato] of Object.entries(valor)) {
            if (PELIGROSAS.includes(campo)) {
                p.push(mal(`${clave}.${campo}`, 'dangerous_key'));
                continue;
            }
            const admitido = Object.prototype.hasOwnProperty.call(grupo, campo) ? grupo[campo] : undefined;
            if (!admitido) {
                p.push(mal(`${clave}.${campo}`, 'unknown_field'));
                continue;
            }
            if (dato === undefined)
                continue;
            if (admitido === 'mm') {
                if (!esNum(dato)) {
                    p.push(mal(`${clave}.${campo}`, 'invalid_value'));
                    continue;
                }
                if (dato < FOCAL_MIN_MM || dato > FOCAL_MAX_MM)
                    p.push(mal(`${clave}.${campo}`, 'out_of_range'));
                continue;
            }
            if (typeof dato !== 'string' || !admitido.includes(dato))
                p.push(mal(`${clave}.${campo}`, 'invalid_value'));
        }
    }
    const mov = esObjeto(crudo.movement) ? crudo.movement : undefined;
    if (mov && mov.type === 'static' && mov.speed !== undefined)
        p.push(mal('movement.speed', 'incoherent'));
    return p;
};
export const creativosValidos = (crudo: unknown): crudo is CreativeParameters => validarCreativos(crudo).length === 0;
export const valorCreativo = (p: CreativeParameters | undefined, ruta: CreativeParameterPath): string | number | undefined => {
    if (!p)
        return undefined;
    const [grupo, campo] = ruta.split('.');
    const g = (p as unknown as Record<string, unknown>)[grupo];
    if (!esObjeto(g))
        return undefined;
    const v = g[campo];
    return typeof v === 'string' || esNum(v) ? v : undefined;
};
export const rutasDefinidas = (p: CreativeParameters | undefined): readonly CreativeParameterPath[] => RUTAS_CREATIVAS.filter((r) => valorCreativo(p, r) !== undefined);
export const conflictosCreativos = (a: CreativeParameters | undefined, b: CreativeParameters | undefined): readonly CreativeParameterPath[] => RUTAS_CREATIVAS.filter((r) => {
    const x = valorCreativo(a, r);
    const y = valorCreativo(b, r);
    return x !== undefined && y !== undefined && x !== y;
});
export const componerCreativos = (partes: readonly (CreativeParameters | undefined)[]): {
    parameters?: CreativeParameters;
    conflicts: readonly CreativeParameterPath[];
} => {
    const presentes = partes.filter((p): p is CreativeParameters => p !== undefined);
    if (!presentes.length)
        return { conflicts: [] };
    const conflictos = new Set<CreativeParameterPath>();
    const valores = new Map<CreativeParameterPath, string | number>();
    for (const parte of presentes) {
        for (const r of RUTAS_CREATIVAS) {
            const v = valorCreativo(parte, r);
            if (v === undefined)
                continue;
            const ya = valores.get(r);
            if (ya !== undefined && ya !== v) {
                conflictos.add(r);
                continue;
            }
            valores.set(r, v);
        }
    }
    for (const r of conflictos)
        valores.delete(r);
    const salida: Record<string, Record<string, string | number>> = {};
    for (const [r, v] of valores) {
        const [grupo, campo] = r.split('.');
        (salida[grupo] ??= {})[campo] = v;
    }
    const version = Math.max(...presentes.map((p) => p.version));
    return {
        ...(valores.size ? { parameters: { version, ...salida } as unknown as CreativeParameters } : {}),
        conflicts: [...conflictos],
    };
};
export const completarCreativos = (base: CreativeParameters | undefined, relleno: CreativeParameters | undefined): CreativeParameters | undefined => {
    if (!relleno)
        return base;
    if (!base)
        return relleno;
    const salida: Record<string, Record<string, string | number>> = {};
    for (const r of RUTAS_CREATIVAS) {
        const v = valorCreativo(base, r) ?? valorCreativo(relleno, r);
        if (v === undefined)
            continue;
        const [grupo, campo] = r.split('.');
        (salida[grupo] ??= {})[campo] = v;
    }
    return { version: Math.max(base.version, relleno.version), ...salida } as unknown as CreativeParameters;
};
export interface ExigenciaCreativa {
    cameraMotion?: boolean;
    aspectRatio?: AspectRatio;
    durationSec?: number;
}
export const exigenciasDe = (p: CreativeParameters | undefined, extra: {
    durationSec?: number;
} = {}): ExigenciaCreativa => {
    const movimiento = valorCreativo(p, 'movement.type');
    const proporcion = valorCreativo(p, 'framing.aspectRatio');
    return {
        ...(movimiento !== undefined ? { cameraMotion: movimiento !== 'static' } : {}),
        ...(proporcion !== undefined ? { aspectRatio: proporcion as AspectRatio } : {}),
        ...(extra.durationSec !== undefined ? { durationSec: extra.durationSec } : {}),
    };
};
export type VeredictoCreativo = 'ok' | 'unsupported' | 'unknown';
export interface ChequeoCreativo {
    requirement: keyof ExigenciaCreativa;
    verdict: VeredictoCreativo;
    detail?: string;
}
export interface CapacidadDeImplementacion {
    maxDurationSec?: number;
    minDurationSec?: number;
    aspectRatios?: readonly string[];
    cameraMotion?: boolean;
}
export const compatibilidadCreativa = (exigencia: ExigenciaCreativa, implementacion: CapacidadDeImplementacion): readonly ChequeoCreativo[] => {
    const salida: ChequeoCreativo[] = [];
    if (exigencia.cameraMotion !== undefined) {
        salida.push(implementacion.cameraMotion === undefined
            ? { requirement: 'cameraMotion', verdict: 'unknown', detail: 'el registro no declara control de cámara' }
            : implementacion.cameraMotion || !exigencia.cameraMotion
                ? { requirement: 'cameraMotion', verdict: 'ok' }
                : { requirement: 'cameraMotion', verdict: 'unsupported' });
    }
    if (exigencia.aspectRatio !== undefined) {
        salida.push(implementacion.aspectRatios === undefined
            ? { requirement: 'aspectRatio', verdict: 'unknown', detail: 'el registro no declara proporciones' }
            : implementacion.aspectRatios.includes(exigencia.aspectRatio)
                ? { requirement: 'aspectRatio', verdict: 'ok' }
                : { requirement: 'aspectRatio', verdict: 'unsupported' });
    }
    if (exigencia.durationSec !== undefined) {
        const max = implementacion.maxDurationSec;
        const min = implementacion.minDurationSec;
        salida.push(max === undefined && min === undefined
            ? { requirement: 'durationSec', verdict: 'unknown', detail: 'el registro no declara duración' }
            : (max !== undefined && exigencia.durationSec > max) || (min !== undefined && exigencia.durationSec < min)
                ? { requirement: 'durationSec', verdict: 'unsupported' }
                : { requirement: 'durationSec', verdict: 'ok' });
    }
    return salida;
};
export const versionCreativaActual = (): number => CREATIVE_PARAMETERS_VERSION;
