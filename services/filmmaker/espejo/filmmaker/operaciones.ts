// GENERADO por scripts/espejo-filmmaker.mjs desde functions/src/filmmaker/operaciones.ts: no se edita a mano, se regenera.
import type { AspectRatio, CameraType, CompositionType, CreativeParameterPath, CreativeParameters, LensType, LightingType, MotionSmoothness, MotionSpeed, MovementType, PerspectiveType, ShotType, } from '../core/creative';
import { RUTAS_CREATIVAS, validarCreativos, valorCreativo, versionCreativaActual } from '../core/creative';
import { claveProhibidaDeNodo } from '../core/shot';
import { AudioCue, CharacterState, ContinuityRule, DialogueLine, ExportTarget, FilmmakerProduction, FormatPresetId, LIMITES, PRESETS, ProductionScene, ProductionShot, ResolutionTarget, ShotSubject, TimeOfDay, Unidad, VisualDirection, VoiceReference, Weather, aMs, aSec, buscarEscena, buscarPlano, canonico, configuracionDePreset, continuidadEfectiva, creativoEfectivo, derivarId, duracionDeEscenaMs, duracionDeUnidadMs, duracionTotalMs, esId, estadoEfectivo, idiomaDeLinea, idsDeLaProduccion, repartoDelPlano, unidades, vozDeLinea, } from './modelo';
import { FilmmakerIssue, Params, ValidationCode, claveDeMensaje, integridad } from './validacion';
export type SceneOrShotTarget = {
    readonly sceneId: string;
} | {
    readonly shotId: string;
};
export type CreativeTarget = {
    readonly scope: 'production';
} | {
    readonly scope: 'scene';
    readonly sceneId: string;
} | {
    readonly scope: 'shot';
    readonly shotId: string;
};
export type NewShot = Omit<ProductionShot, 'order'>;
export type NewScene = Omit<ProductionScene, 'order' | 'shots'> & {
    readonly shots?: readonly NewShot[];
};
export type DialogueChanges = {
    readonly text?: string;
    readonly kind?: DialogueLine['kind'];
    readonly characterId?: string | null;
    readonly language?: string | null;
    readonly emotion?: string | null;
    readonly estimatedSec?: number | null;
};
export type AudioChange = {
    readonly action: 'upsert';
    readonly cue: AudioCue;
} | {
    readonly action: 'remove';
    readonly cueId: string;
} | {
    readonly action: 'set_narrator';
    readonly narrator: VoiceReference | null;
};
export type ExportChange = {
    readonly action: 'upsert';
    readonly target: ExportTarget;
} | {
    readonly action: 'remove';
    readonly targetId: string;
};
export type FilmmakerOperation = {
    readonly op: 'add_scene';
    readonly scene: NewScene;
    readonly atOrder?: number;
} | {
    readonly op: 'remove_scene';
    readonly sceneId: string;
    readonly cascade?: boolean;
} | {
    readonly op: 'reorder_scene';
    readonly sceneId: string;
    readonly toOrder: number;
} | {
    readonly op: 'duplicate_scene';
    readonly sceneId: string;
    readonly newSceneId?: string;
} | {
    readonly op: 'split_scene';
    readonly sceneId: string;
    readonly atShotOrder: number;
    readonly newSceneId?: string;
} | {
    readonly op: 'merge_scenes';
    readonly sceneId: string;
    readonly withSceneId: string;
} | {
    readonly op: 'add_shot';
    readonly sceneId: string;
    readonly shot: NewShot;
    readonly atOrder?: number;
} | {
    readonly op: 'remove_shot';
    readonly shotId: string;
    readonly cascade?: boolean;
} | {
    readonly op: 'reorder_shot';
    readonly shotId: string;
    readonly toOrder: number;
} | {
    readonly op: 'duplicate_shot';
    readonly shotId: string;
    readonly newShotId?: string;
} | {
    readonly op: 'split_shot';
    readonly shotId: string;
    readonly atSec: number;
    readonly newShotId?: string;
} | {
    readonly op: 'merge_shots';
    readonly shotId: string;
    readonly withShotId: string;
} | {
    readonly op: 'extend_duration';
    readonly target: SceneOrShotTarget;
    readonly bySec: number;
} | {
    readonly op: 'shorten_duration';
    readonly target: SceneOrShotTarget;
    readonly bySec: number;
} | {
    readonly op: 'change_target_duration';
    readonly targetSec: number | null;
    readonly strict?: boolean;
} | {
    readonly op: 'change_camera';
    readonly target: CreativeTarget;
    readonly cameraType?: CameraType | null;
    readonly perspective?: PerspectiveType | null;
    readonly shotType?: ShotType | null;
    readonly lens?: LensType | null;
    readonly focalLengthMm?: number | null;
    readonly composition?: CompositionType | null;
} | {
    readonly op: 'change_movement';
    readonly target: CreativeTarget;
    readonly movement?: MovementType | null;
    readonly speed?: MotionSpeed | null;
    readonly smoothness?: MotionSmoothness | null;
} | {
    readonly op: 'change_lighting';
    readonly target: CreativeTarget;
    readonly lighting: LightingType | null;
} | {
    readonly op: 'change_style';
    readonly target: CreativeTarget;
    readonly style: string | null;
} | {
    readonly op: 'change_weather';
    readonly sceneId: string;
    readonly weather: Weather | null;
} | {
    readonly op: 'change_time_of_day';
    readonly sceneId: string;
    readonly timeOfDay: TimeOfDay | null;
} | {
    readonly op: 'change_location';
    readonly sceneId: string;
    readonly locationId: string | null;
} | {
    readonly op: 'change_subject';
    readonly target: SceneOrShotTarget;
    readonly subject: ShotSubject | null;
} | {
    readonly op: 'edit_text';
    readonly target: SceneOrShotTarget;
    readonly title?: string | null;
    readonly description?: string | null;
} | {
    readonly op: 'replace_character';
    readonly fromCharacterId: string;
    readonly toCharacterId: string;
    readonly scope?: SceneOrShotTarget;
} | {
    readonly op: 'set_character_state';
    readonly target: SceneOrShotTarget;
    readonly characterId: string;
    readonly wardrobe?: string | null;
    readonly appearanceNotes?: string | null;
} | {
    readonly op: 'replace_reference';
    readonly fromReferenceId: string;
    readonly toReferenceId: string;
} | {
    readonly op: 'add_dialogue';
    readonly target: SceneOrShotTarget;
    readonly line: DialogueLine;
    readonly atIndex?: number;
} | {
    readonly op: 'change_dialogue';
    readonly lineId: string;
    readonly changes: DialogueChanges;
} | {
    readonly op: 'remove_dialogue';
    readonly lineId: string;
} | {
    readonly op: 'modify_audio';
    readonly change: AudioChange;
} | {
    readonly op: 'change_format';
    readonly aspectRatio?: AspectRatio;
    readonly resolution?: ResolutionTarget | null;
    readonly preset?: FormatPresetId;
} | {
    readonly op: 'change_export';
    readonly change: ExportChange;
};
export type OperationName = FilmmakerOperation['op'];
const CAMPOS: Readonly<Record<OperationName, {
    readonly req: readonly string[];
    readonly opt: readonly string[];
}>> = {
    add_scene: { req: ['scene'], opt: ['atOrder'] },
    remove_scene: { req: ['sceneId'], opt: ['cascade'] },
    reorder_scene: { req: ['sceneId', 'toOrder'], opt: [] },
    duplicate_scene: { req: ['sceneId'], opt: ['newSceneId'] },
    split_scene: { req: ['sceneId', 'atShotOrder'], opt: ['newSceneId'] },
    merge_scenes: { req: ['sceneId', 'withSceneId'], opt: [] },
    add_shot: { req: ['sceneId', 'shot'], opt: ['atOrder'] },
    remove_shot: { req: ['shotId'], opt: ['cascade'] },
    reorder_shot: { req: ['shotId', 'toOrder'], opt: [] },
    duplicate_shot: { req: ['shotId'], opt: ['newShotId'] },
    split_shot: { req: ['shotId', 'atSec'], opt: ['newShotId'] },
    merge_shots: { req: ['shotId', 'withShotId'], opt: [] },
    extend_duration: { req: ['target', 'bySec'], opt: [] },
    shorten_duration: { req: ['target', 'bySec'], opt: [] },
    change_target_duration: { req: ['targetSec'], opt: ['strict'] },
    change_camera: { req: ['target'], opt: ['cameraType', 'perspective', 'shotType', 'lens', 'focalLengthMm', 'composition'] },
    change_movement: { req: ['target'], opt: ['movement', 'speed', 'smoothness'] },
    change_lighting: { req: ['target', 'lighting'], opt: [] },
    change_style: { req: ['target', 'style'], opt: [] },
    change_weather: { req: ['sceneId', 'weather'], opt: [] },
    change_time_of_day: { req: ['sceneId', 'timeOfDay'], opt: [] },
    change_location: { req: ['sceneId', 'locationId'], opt: [] },
    change_subject: { req: ['target', 'subject'], opt: [] },
    edit_text: { req: ['target'], opt: ['title', 'description'] },
    replace_character: { req: ['fromCharacterId', 'toCharacterId'], opt: ['scope'] },
    set_character_state: { req: ['target', 'characterId'], opt: ['wardrobe', 'appearanceNotes'] },
    replace_reference: { req: ['fromReferenceId', 'toReferenceId'], opt: [] },
    add_dialogue: { req: ['target', 'line'], opt: ['atIndex'] },
    change_dialogue: { req: ['lineId', 'changes'], opt: [] },
    remove_dialogue: { req: ['lineId'], opt: [] },
    modify_audio: { req: ['change'], opt: [] },
    change_format: { req: [], opt: ['aspectRatio', 'resolution', 'preset'] },
    change_export: { req: ['change'], opt: [] },
};
export const OPERACIONES: readonly OperationName[] = Object.freeze(Object.keys(CAMPOS) as OperationName[]);
export type OperationCode = 'operation_invalid' | 'operation_target_missing' | 'operation_not_applicable' | 'operation_blocked' | 'operation_would_break_integrity' | 'production_invalid';
export type OperationProblem = FilmmakerIssue<OperationCode | ValidationCode>;
export interface PendingRegeneration {
    readonly scenes: readonly string[];
    readonly shots: readonly string[];
    readonly audio: readonly string[];
    readonly removed: readonly string[];
}
export type OperationResult = {
    readonly ok: true;
    readonly production: FilmmakerProduction;
    readonly pending: PendingRegeneration;
    readonly timelineChanged: boolean;
    readonly applied: number;
} | {
    readonly ok: false;
    readonly problems: readonly OperationProblem[];
};
type Prod = FilmmakerProduction;
type Paso = {
    readonly ok: true;
    readonly production: Prod;
} | {
    readonly ok: false;
    readonly problems: readonly OperationProblem[];
};
const problema = (code: OperationCode, path: string, parameters: Params = {}): OperationProblem => ({
    code, severity: 'error', path, parameters, messageKey: claveDeMensaje('operation', code),
});
const falla = (code: OperationCode, path: string, parameters: Params = {}): Paso => ({ ok: false, problems: [problema(code, path, parameters)] });
const bien = (production: Prod): Paso => ({ ok: true, production });
const esObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const esNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const entero = (v: unknown, min: number, max: number): v is number => esNum(v) && Number.isInteger(v) && v >= min && v <= max;
const sin = <T extends object>(o: T, ...ks: readonly string[]): T => {
    const c = { ...o } as Record<string, unknown>;
    for (const k of ks)
        delete c[k];
    return c as T;
};
const fijar = <T extends object>(o: T, k: string, v: unknown): T => (v === null || v === undefined ? sin(o, k) : ({ ...o, [k]: v } as T));
const listaO = <T>(xs: readonly T[] | undefined): readonly T[] | undefined => (xs && xs.length ? xs : undefined);
const sinRepetidos = <T>(xs: readonly T[]): T[] => xs.filter((x, i) => xs.indexOf(x) === i);
const conEscenas = (prod: Prod, escenas: readonly ProductionScene[]): Prod => ({
    ...prod,
    scenes: escenas.map((s, i) => {
        const shots = s.shots.map((p, j) => (p.order === j ? p : { ...p, order: j }));
        return s.order === i && shots.every((p, j) => p === s.shots[j]) ? s : { ...s, order: i, shots };
    }),
});
const cambiarEscena = (prod: Prod, sceneId: string, fn: (s: ProductionScene) => ProductionScene): Prod => conEscenas(prod, prod.scenes.map((s) => (s.id === sceneId ? fn(s) : s)));
const cambiarPlano = (prod: Prod, shotId: string, fn: (p: ProductionShot) => ProductionShot): Prod => conEscenas(prod, prod.scenes.map((s) => (s.shots.some((p) => p.id === shotId)
    ? { ...s, shots: s.shots.map((p) => (p.id === shotId ? fn(p) : p)) }
    : s)));
const alDia = (s: ProductionScene): ProductionScene => {
    if (s.durationSec === undefined || !s.shots.length || s.shots.some((p) => p.durationSec === undefined))
        return s;
    const suma = s.shots.reduce((t, p) => t + aMs(p.durationSec as number), 0);
    return aMs(s.durationSec) === suma ? s : { ...s, durationSec: aSec(suma) };
};
const nuevoId = (pedido: unknown, base: string, ocupados: Set<string>, campo: string): {
    readonly ok: true;
    readonly id: string;
} | {
    readonly ok: false;
    readonly paso: Paso;
} => {
    if (pedido !== undefined) {
        if (!esId(pedido))
            return { ok: false, paso: falla('operation_invalid', campo, { reason: 'id_invalid' }) };
        if (ocupados.has(pedido))
            return { ok: false, paso: falla('operation_invalid', campo, { reason: 'id_taken', id: pedido }) };
        ocupados.add(pedido);
        return { ok: true, id: pedido };
    }
    const id = derivarId(base, ocupados);
    ocupados.add(id);
    return { ok: true, id };
};
const copiarLineas = (ls: readonly DialogueLine[] | undefined, ocupados: Set<string>): readonly DialogueLine[] | undefined => ls?.map((l) => { const id = derivarId(l.id, ocupados); ocupados.add(id); return { ...l, id }; });
const loQueSePerderia = (prod: Prod, quitados: ReadonlySet<string>): string[] => {
    const rutas: string[] = [];
    for (const c of prod.audio.cues) {
        const t = c.target;
        if ((t.scope === 'shot' && quitados.has(t.shotId)) || (t.scope === 'scenes' && t.sceneIds.every((id) => quitados.has(id)))) {
            rutas.push(`audio.cues.${c.id}`);
        }
    }
    for (const m of prod.editPlan.markers ?? [])
        if (quitados.has(m.atShotId))
            rutas.push(`editPlan.markers.${m.id}`);
    return rutas;
};
const soltar = (prod: Prod, quitados: ReadonlySet<string>): Prod => {
    const fuera = (ids: readonly string[] | undefined): readonly string[] | undefined => listaO(ids?.filter((id) => !quitados.has(id)));
    const escenas = prod.scenes.map((s) => {
        const shots = s.shots.map((p) => (p.dependsOn?.some((d) => quitados.has(d)) ? fijar(p, 'dependsOn', fuera(p.dependsOn)) : p));
        const conPlanos = shots.every((p, j) => p === s.shots[j]) ? s : { ...s, shots };
        return s.dependsOn?.some((d) => quitados.has(d)) ? fijar(conPlanos, 'dependsOn', fuera(s.dependsOn)) : conPlanos;
    });
    const cues = prod.audio.cues
        .filter((c) => !(c.target.scope === 'shot' && quitados.has(c.target.shotId)))
        .map((c) => (c.target.scope === 'scenes' && c.target.sceneIds.some((id) => quitados.has(id))
        ? { ...c, target: { scope: 'scenes' as const, sceneIds: c.target.sceneIds.filter((id) => !quitados.has(id)) } }
        : c))
        .filter((c) => !(c.target.scope === 'scenes' && c.target.sceneIds.length === 0));
    const markers = listaO((prod.editPlan.markers ?? []).filter((m) => !quitados.has(m.atShotId)));
    return {
        ...conEscenas(prod, escenas),
        audio: { ...prod.audio, cues },
        editPlan: fijar(prod.editPlan, 'markers', markers),
    };
};
const reapuntar = (prod: Prod, de: string, a: string): Prod => {
    const cambia = (ids: readonly string[] | undefined, propio: string): readonly string[] | undefined => ids && ids.includes(de) ? listaO(sinRepetidos(ids.map((x) => (x === de ? a : x))).filter((x) => x !== propio)) : ids;
    const escenas = prod.scenes.map((s) => {
        const shots = s.shots.map((p) => (p.dependsOn?.includes(de) ? fijar(p, 'dependsOn', cambia(p.dependsOn, p.id)) : p));
        const conPlanos = shots.every((p, j) => p === s.shots[j]) ? s : { ...s, shots };
        return s.dependsOn?.includes(de) ? fijar(conPlanos, 'dependsOn', cambia(s.dependsOn, s.id)) : conPlanos;
    });
    const cues = prod.audio.cues.map((c) => {
        const t = c.target;
        if (t.scope === 'shot' && t.shotId === de)
            return { ...c, target: { scope: 'shot' as const, shotId: a } };
        if (t.scope === 'scenes' && t.sceneIds.includes(de)) {
            return { ...c, target: { scope: 'scenes' as const, sceneIds: sinRepetidos(t.sceneIds.map((x) => (x === de ? a : x))) } };
        }
        return c;
    });
    const markers = prod.editPlan.markers?.map((m) => (m.atShotId === de ? { ...m, atShotId: a } : m));
    return {
        ...conEscenas(prod, escenas),
        audio: { ...prod.audio, cues },
        editPlan: fijar(prod.editPlan, 'markers', markers),
    };
};
type Cambio = readonly [
    CreativeParameterPath,
    string | number | null
];
const conRutas = (cp: CreativeParameters | undefined, cambios: readonly Cambio[]): CreativeParameters | undefined => {
    const valores = new Map<CreativeParameterPath, string | number>();
    for (const r of RUTAS_CREATIVAS) {
        const v = valorCreativo(cp, r);
        if (v !== undefined)
            valores.set(r, v);
    }
    for (const [r, v] of cambios) {
        if (v === null)
            valores.delete(r);
        else
            valores.set(r, v);
    }
    if (!valores.size)
        return undefined;
    const grupos: Record<string, Record<string, string | number>> = {};
    for (const [r, v] of valores) {
        const [g, f] = r.split('.');
        grupos[g] = { ...(grupos[g] ?? {}), [f]: v };
    }
    return { version: Math.max(cp?.version ?? 0, versionCreativaActual()), ...grupos } as unknown as CreativeParameters;
};
const conVisual = (v: VisualDirection | undefined, cambios: {
    creative?: CreativeParameters | null;
    style?: string | null;
}): VisualDirection | undefined => {
    let salida: VisualDirection = v ?? {};
    if (cambios.creative !== undefined)
        salida = fijar(salida, 'creative', cambios.creative);
    if (cambios.style !== undefined)
        salida = fijar(salida, 'style', cambios.style);
    return Object.keys(salida).length ? salida : undefined;
};
const quitarDeVisual = (v: VisualDirection | undefined, rutas: readonly CreativeParameterPath[]): VisualDirection | undefined => v?.creative && rutas.some((r) => valorCreativo(v.creative, r) !== undefined)
    ? conVisual(v, { creative: conRutas(v.creative, rutas.map((r) => [r, null] as Cambio)) ?? null })
    : v;
const cambiarCreativo = (prod: Prod, target: unknown, cambios: readonly Cambio[]): Paso => {
    if (!cambios.length)
        return falla('operation_invalid', '', { reason: 'nothing_to_change' });
    const rutas = cambios.map(([r]) => r);
    const revisar = (cp: CreativeParameters | undefined, ruta: string): Paso | undefined => {
        const malos = cp ? validarCreativos(cp) : [];
        return malos.length
            ? falla('operation_invalid', ruta, { reason: 'invalid_creative', details: malos.map((m) => `${m.path}:${m.reason}`) })
            : undefined;
    };
    if (!esObj(target))
        return falla('operation_invalid', 'target', { reason: 'not_object' });
    if (target.scope === 'production') {
        const cp = conRutas(prod.creativeDirection.cinematography, cambios);
        const error = revisar(cp, 'creativeDirection.cinematography');
        if (error)
            return error;
        const escenas = prod.scenes.map((s) => fijar({ ...s, shots: s.shots.map((p) => fijar(p, 'visual', quitarDeVisual(p.visual, rutas))) }, 'visual', quitarDeVisual(s.visual, rutas)));
        return bien({ ...conEscenas(prod, escenas), creativeDirection: fijar(prod.creativeDirection, 'cinematography', cp) });
    }
    if (target.scope === 'scene') {
        const u = typeof target.sceneId === 'string' ? buscarEscena(prod, target.sceneId) : undefined;
        if (!u)
            return falla('operation_target_missing', 'target.sceneId', { id: String(target.sceneId) });
        const cp = conRutas(u.scene.visual?.creative, cambios);
        const error = revisar(cp, `scenes.${u.scene.id}.visual.creative`);
        if (error)
            return error;
        return bien(cambiarEscena(prod, u.scene.id, (s) => fijar({ ...s, shots: s.shots.map((p) => fijar(p, 'visual', quitarDeVisual(p.visual, rutas))) }, 'visual', conVisual(s.visual, { creative: cp ?? null }))));
    }
    if (target.scope === 'shot') {
        const u = typeof target.shotId === 'string' ? buscarPlano(prod, target.shotId) : undefined;
        if (!u)
            return falla('operation_target_missing', 'target.shotId', { id: String(target.shotId) });
        const cp = conRutas(u.shot.visual?.creative, cambios);
        const error = revisar(cp, `scenes.${u.scene.id}.shots.${u.shot.id}.visual.creative`);
        if (error)
            return error;
        return bien(cambiarPlano(prod, u.shot.id, (p) => fijar(p, 'visual', conVisual(p.visual, { creative: cp ?? null }))));
    }
    return falla('operation_invalid', 'target.scope', { reason: 'not_in_vocabulary' });
};
const cambiosDe = (op: Record<string, unknown>, mapa: readonly (readonly [
    string,
    CreativeParameterPath
])[]): Cambio[] => mapa.filter(([campo]) => op[campo] !== undefined).map(([campo, ruta]) => [ruta, op[campo] as string | number | null] as Cambio);
type Objetivo = {
    readonly tipo: 'scene';
    readonly scene: ProductionScene;
} | {
    readonly tipo: 'shot';
    readonly scene: ProductionScene;
    readonly shot: ProductionShot;
};
const resolver = (prod: Prod, target: unknown, campo = 'target'): Objetivo | Paso => {
    if (!esObj(target))
        return falla('operation_invalid', campo, { reason: 'not_object' });
    const claves = Object.keys(target);
    if (claves.length !== 1 || (claves[0] !== 'sceneId' && claves[0] !== 'shotId')) {
        return falla('operation_invalid', campo, { reason: 'scene_or_shot' });
    }
    if (target.sceneId !== undefined) {
        const u = typeof target.sceneId === 'string' ? buscarEscena(prod, target.sceneId) : undefined;
        return u ? { tipo: 'scene', scene: u.scene } : falla('operation_target_missing', `${campo}.sceneId`, { id: String(target.sceneId) });
    }
    const u = typeof target.shotId === 'string' ? buscarPlano(prod, target.shotId) : undefined;
    return u ? { tipo: 'shot', scene: u.scene, shot: u.shot } : falla('operation_target_missing', `${campo}.shotId`, { id: String(target.shotId) });
};
const esPaso = (x: Objetivo | Paso): x is Paso => 'ok' in x;
const ejecutar = (prod: Prod, op: FilmmakerOperation): Paso => {
    const o = op as unknown as Record<string, unknown>;
    switch (op.op) {
        case 'add_scene': {
            const at = op.atOrder ?? prod.scenes.length;
            if (!entero(at, 0, prod.scenes.length))
                return falla('operation_invalid', 'atOrder', { reason: 'out_of_range', max: prod.scenes.length });
            if (!esObj(op.scene))
                return falla('operation_invalid', 'scene', { reason: 'not_object' });
            if (esId(op.scene.id) && idsDeLaProduccion(prod).has(op.scene.id))
                return falla('operation_invalid', 'scene.id', { reason: 'id_taken', id: op.scene.id });
            const shots = Array.isArray(op.scene.shots) ? op.scene.shots.map((p, j) => ({ ...p, order: j })) : [];
            const nueva = { ...op.scene, order: at, shots } as ProductionScene;
            const escenas = [...prod.scenes];
            escenas.splice(at, 0, nueva);
            return bien(conEscenas(prod, escenas));
        }
        case 'remove_scene': {
            const u = buscarEscena(prod, op.sceneId);
            if (!u)
                return falla('operation_target_missing', 'sceneId', { id: String(op.sceneId) });
            const quitados = new Set<string>([u.scene.id, ...u.scene.shots.map((p) => p.id)]);
            const perdidas = loQueSePerderia(prod, quitados);
            if (perdidas.length && op.cascade !== true)
                return falla('operation_blocked', 'sceneId', { reason: 'would_remove_more', paths: perdidas });
            return bien(soltar(conEscenas(prod, prod.scenes.filter((s) => s.id !== u.scene.id)), quitados));
        }
        case 'reorder_scene': {
            const u = buscarEscena(prod, op.sceneId);
            if (!u)
                return falla('operation_target_missing', 'sceneId', { id: String(op.sceneId) });
            if (!entero(op.toOrder, 0, prod.scenes.length - 1))
                return falla('operation_invalid', 'toOrder', { reason: 'out_of_range', max: prod.scenes.length - 1 });
            const escenas = prod.scenes.filter((s) => s.id !== u.scene.id);
            escenas.splice(op.toOrder, 0, u.scene);
            return bien(conEscenas(prod, escenas));
        }
        case 'duplicate_scene': {
            const u = buscarEscena(prod, op.sceneId);
            if (!u)
                return falla('operation_target_missing', 'sceneId', { id: String(op.sceneId) });
            const ocupados = idsDeLaProduccion(prod);
            const id = nuevoId(op.newSceneId, u.scene.id, ocupados, 'newSceneId');
            if (!id.ok)
                return id.paso;
            const mapa = new Map<string, string>();
            for (const p of u.scene.shots) {
                const n = derivarId(p.id, ocupados);
                ocupados.add(n);
                mapa.set(p.id, n);
            }
            const copia: ProductionScene = fijar({
                ...u.scene,
                id: id.id,
                shots: u.scene.shots.map((p) => fijar(fijar({ ...p, id: mapa.get(p.id) as string }, 'dialogue', copiarLineas(p.dialogue, ocupados)), 'dependsOn', p.dependsOn?.map((d) => mapa.get(d) ?? d))),
            }, 'dialogue', copiarLineas(u.scene.dialogue, ocupados));
            const escenas = [...prod.scenes];
            escenas.splice(u.index + 1, 0, copia);
            return bien(conEscenas(prod, escenas));
        }
        case 'split_scene': {
            const u = buscarEscena(prod, op.sceneId);
            if (!u)
                return falla('operation_target_missing', 'sceneId', { id: String(op.sceneId) });
            if (!entero(op.atShotOrder, 1, u.scene.shots.length - 1)) {
                return falla('operation_not_applicable', 'atShotOrder', { reason: 'needs_shots_on_both_sides', shots: u.scene.shots.length });
            }
            const id = nuevoId(op.newSceneId, u.scene.id, idsDeLaProduccion(prod), 'newSceneId');
            if (!id.ok)
                return id.paso;
            const antes = u.scene.shots.slice(0, op.atShotOrder);
            const despues = u.scene.shots.slice(op.atShotOrder);
            const suma = (ps: readonly ProductionShot[]): number | undefined => ps.every((p) => p.durationSec !== undefined) ? aSec(ps.reduce((t, p) => t + aMs(p.durationSec as number), 0)) : undefined;
            const declara = u.scene.durationSec !== undefined;
            const a: ProductionScene = fijar({ ...u.scene, shots: antes }, 'durationSec', declara ? suma(antes) : undefined);
            const b: ProductionScene = fijar(sin({ ...u.scene, id: id.id, shots: despues }, 'dialogue'), 'durationSec', declara ? suma(despues) : undefined);
            const escenas = [...prod.scenes];
            escenas.splice(u.index, 1, a, b);
            const cues = prod.audio.cues.map((c) => (c.target.scope === 'scenes' && c.target.sceneIds.includes(u.scene.id)
                ? { ...c, target: { scope: 'scenes' as const, sceneIds: sinRepetidos(c.target.sceneIds.reduce<string[]>((xs, x) => (x === u.scene.id ? [...xs, x, id.id] : [...xs, x]), [])) } }
                : c));
            return bien({ ...conEscenas(prod, escenas), audio: { ...prod.audio, cues } });
        }
        case 'merge_scenes': {
            const u = buscarEscena(prod, op.sceneId);
            const w = buscarEscena(prod, op.withSceneId);
            if (!u)
                return falla('operation_target_missing', 'sceneId', { id: String(op.sceneId) });
            if (!w)
                return falla('operation_target_missing', 'withSceneId', { id: String(op.withSceneId) });
            if (w.index !== u.index + 1)
                return falla('operation_not_applicable', 'withSceneId', { reason: 'not_adjacent' });
            const a = u.scene;
            const b = w.scene;
            const union = (x: readonly string[] | undefined, y: readonly string[] | undefined): readonly string[] | undefined => x !== undefined && y !== undefined ? sinRepetidos([...x, ...y]) : undefined;
            const estadosDeA = a.characterStates ?? [];
            const estados = [...estadosDeA, ...(b.characterStates ?? []).filter((e) => !estadosDeA.some((x) => x.characterId === e.characterId))];
            let unida: ProductionScene = { ...a, shots: [...a.shots, ...b.shots] };
            unida = fijar(unida, 'characterIds', union(a.characterIds, b.characterIds));
            unida = fijar(unida, 'objectIds', union(a.objectIds, b.objectIds));
            unida = fijar(unida, 'characterStates', listaO(estados));
            unida = fijar(unida, 'actions', listaO(sinRepetidos([...(a.actions ?? []), ...(b.actions ?? [])])));
            unida = fijar(unida, 'dialogue', listaO([...(a.dialogue ?? []), ...(b.dialogue ?? [])]));
            unida = fijar(unida, 'dependsOn', listaO(sinRepetidos([...(a.dependsOn ?? []), ...(b.dependsOn ?? [])]).filter((x) => x !== a.id && x !== b.id)));
            unida = fijar(unida, 'durationSec', a.durationSec !== undefined && b.durationSec !== undefined
                ? aSec(aMs(a.durationSec) + aMs(b.durationSec)) : undefined);
            const escenas = prod.scenes.filter((s) => s.id !== b.id).map((s) => (s.id === a.id ? alDia(unida) : s));
            return bien(reapuntar(conEscenas(prod, escenas), b.id, a.id));
        }
        case 'add_shot': {
            const u = buscarEscena(prod, op.sceneId);
            if (!u)
                return falla('operation_target_missing', 'sceneId', { id: String(op.sceneId) });
            const at = op.atOrder ?? u.scene.shots.length;
            if (!entero(at, 0, u.scene.shots.length))
                return falla('operation_invalid', 'atOrder', { reason: 'out_of_range', max: u.scene.shots.length });
            if (!esObj(op.shot))
                return falla('operation_invalid', 'shot', { reason: 'not_object' });
            if (esId(op.shot.id) && idsDeLaProduccion(prod).has(op.shot.id))
                return falla('operation_invalid', 'shot.id', { reason: 'id_taken', id: op.shot.id });
            const shots = [...u.scene.shots];
            shots.splice(at, 0, { ...op.shot, order: at } as ProductionShot);
            return bien(cambiarEscena(prod, u.scene.id, (s) => alDia({ ...s, shots })));
        }
        case 'remove_shot': {
            const u = buscarPlano(prod, op.shotId);
            if (!u)
                return falla('operation_target_missing', 'shotId', { id: String(op.shotId) });
            const quitados = new Set<string>([u.shot.id]);
            const perdidas = loQueSePerderia(prod, quitados);
            if (perdidas.length && op.cascade !== true)
                return falla('operation_blocked', 'shotId', { reason: 'would_remove_more', paths: perdidas });
            const sinPlano = cambiarEscena(prod, u.scene.id, (s) => alDia({ ...s, shots: s.shots.filter((p) => p.id !== u.shot.id) }));
            return bien(soltar(sinPlano, quitados));
        }
        case 'reorder_shot': {
            const u = buscarPlano(prod, op.shotId);
            if (!u)
                return falla('operation_target_missing', 'shotId', { id: String(op.shotId) });
            if (!entero(op.toOrder, 0, u.scene.shots.length - 1))
                return falla('operation_invalid', 'toOrder', { reason: 'out_of_range', max: u.scene.shots.length - 1 });
            const shots = u.scene.shots.filter((p) => p.id !== u.shot.id);
            shots.splice(op.toOrder, 0, u.shot);
            return bien(cambiarEscena(prod, u.scene.id, (s) => ({ ...s, shots })));
        }
        case 'duplicate_shot': {
            const u = buscarPlano(prod, op.shotId);
            if (!u)
                return falla('operation_target_missing', 'shotId', { id: String(op.shotId) });
            const ocupados = idsDeLaProduccion(prod);
            const id = nuevoId(op.newShotId, u.shot.id, ocupados, 'newShotId');
            if (!id.ok)
                return id.paso;
            const copia = fijar({ ...u.shot, id: id.id }, 'dialogue', copiarLineas(u.shot.dialogue, ocupados));
            const shots = [...u.scene.shots];
            shots.splice(u.shotIndex + 1, 0, copia);
            return bien(cambiarEscena(prod, u.scene.id, (s) => alDia({ ...s, shots })));
        }
        case 'split_shot': {
            const u = buscarPlano(prod, op.shotId);
            if (!u)
                return falla('operation_target_missing', 'shotId', { id: String(op.shotId) });
            if (u.shot.durationSec === undefined)
                return falla('operation_not_applicable', 'shotId', { reason: 'needs_duration' });
            const total = aMs(u.shot.durationSec);
            const corte = esNum(op.atSec) ? aMs(op.atSec) : NaN;
            const minimo = aMs(LIMITES.duracionMinimaSec);
            if (!(corte >= minimo && total - corte >= minimo)) {
                return falla('operation_invalid', 'atSec', { reason: 'out_of_range', minSec: LIMITES.duracionMinimaSec, maxSec: aSec(total - minimo) });
            }
            const id = nuevoId(op.newShotId, u.shot.id, idsDeLaProduccion(prod), 'newShotId');
            if (!id.ok)
                return id.paso;
            const a = { ...u.shot, durationSec: aSec(corte) };
            const b = sin({ ...u.shot, id: id.id, durationSec: aSec(total - corte) }, 'dialogue');
            const shots = [...u.scene.shots];
            shots.splice(u.shotIndex, 1, a, b);
            return bien(cambiarEscena(prod, u.scene.id, (s) => alDia({ ...s, shots })));
        }
        case 'merge_shots': {
            const u = buscarPlano(prod, op.shotId);
            const w = buscarPlano(prod, op.withShotId);
            if (!u)
                return falla('operation_target_missing', 'shotId', { id: String(op.shotId) });
            if (!w)
                return falla('operation_target_missing', 'withShotId', { id: String(op.withShotId) });
            if (w.scene.id !== u.scene.id || w.shotIndex !== u.shotIndex + 1)
                return falla('operation_not_applicable', 'withShotId', { reason: 'not_adjacent' });
            const a = u.shot;
            const b = w.shot;
            const union = (x: readonly string[] | undefined, y: readonly string[] | undefined): readonly string[] | undefined => x === undefined && y === undefined ? undefined : sinRepetidos([...(x ?? []), ...(y ?? [])]);
            const estadosDeA = a.characterStates ?? [];
            const juntos = (x: string | undefined, y: string | undefined, sep: string): string | undefined => x !== undefined && y !== undefined ? `${x}${sep}${y}` : x ?? y;
            let unido: ProductionShot = { ...a };
            unido = fijar(unido, 'durationSec', a.durationSec !== undefined && b.durationSec !== undefined ? aSec(aMs(a.durationSec) + aMs(b.durationSec)) : undefined);
            unido = fijar(unido, 'description', juntos(a.description, b.description, ' '));
            unido = fijar(unido, 'subject', a.subject ?? b.subject);
            unido = fijar(unido, 'characterIds', union(a.characterIds, b.characterIds));
            unido = fijar(unido, 'objectIds', union(a.objectIds, b.objectIds));
            unido = fijar(unido, 'referenceIds', union(a.referenceIds, b.referenceIds));
            unido = fijar(unido, 'characterStates', listaO([...estadosDeA, ...(b.characterStates ?? []).filter((e) => !estadosDeA.some((x) => x.characterId === e.characterId))]));
            unido = fijar(unido, 'actions', listaO([...(a.actions ?? []), ...(b.actions ?? [])]));
            unido = fijar(unido, 'dialogue', listaO([...(a.dialogue ?? []), ...(b.dialogue ?? [])]));
            unido = fijar(unido, 'audio', a.audio ?? b.audio);
            unido = fijar(unido, 'continuity', a.continuity ?? b.continuity);
            unido = fijar(unido, 'generation', a.generation ?? b.generation);
            unido = fijar(unido, 'dependsOn', listaO(sinRepetidos([...(a.dependsOn ?? []), ...(b.dependsOn ?? [])]).filter((x) => x !== a.id && x !== b.id)));
            const creativo = a.visual?.creative && b.visual?.creative
                ? conRutas(a.visual.creative, RUTAS_CREATIVAS.filter((r) => valorCreativo(a.visual?.creative, r) === undefined && valorCreativo(b.visual?.creative, r) !== undefined)
                    .map((r) => [r, valorCreativo(b.visual?.creative, r) as string | number] as Cambio))
                : a.visual?.creative ?? b.visual?.creative;
            unido = fijar(unido, 'visual', conVisual(a.visual ?? b.visual, { creative: creativo ?? null, style: a.visual?.style ?? b.visual?.style ?? null }));
            const prompt = juntos(a.advanced?.prompt, b.advanced?.prompt, '\n\n');
            unido = fijar(unido, 'advanced', prompt !== undefined ? { prompt } : undefined);
            const juntada = cambiarEscena(prod, u.scene.id, (s) => alDia({
                ...s, shots: s.shots.filter((p) => p.id !== b.id).map((p) => (p.id === a.id ? unido : p)),
            }));
            return bien(reapuntar(juntada, b.id, a.id));
        }
        case 'extend_duration':
        case 'shorten_duration': {
            if (!esNum(op.bySec) || op.bySec <= 0)
                return falla('operation_invalid', 'bySec', { reason: 'must_be_positive' });
            const t = resolver(prod, op.target);
            if (esPaso(t))
                return t;
            const signo = op.op === 'extend_duration' ? 1 : -1;
            const nueva = (actual: number | undefined, max: number): number | Paso => {
                if (actual === undefined)
                    return falla('operation_not_applicable', 'target', { reason: 'needs_duration' });
                const ms = aMs(actual) + signo * aMs(op.bySec);
                if (ms < aMs(LIMITES.duracionMinimaSec) || ms > aMs(max)) {
                    return falla('operation_invalid', 'bySec', { reason: 'out_of_range', minSec: LIMITES.duracionMinimaSec, maxSec: max });
                }
                return aSec(ms);
            };
            const plano = t.tipo === 'shot' ? t.shot : t.scene.shots[t.scene.shots.length - 1];
            if (plano) {
                const d = nueva(plano.durationSec, LIMITES.planoMaxSec);
                if (typeof d !== 'number')
                    return d;
                return bien(cambiarEscena(prod, t.scene.id, (s) => alDia({ ...s, shots: s.shots.map((p) => (p.id === plano.id ? { ...p, durationSec: d } : p)) })));
            }
            const d = nueva(t.scene.durationSec, LIMITES.escenaMaxSec);
            if (typeof d !== 'number')
                return d;
            return bien(cambiarEscena(prod, t.scene.id, (s) => ({ ...s, durationSec: d })));
        }
        case 'change_target_duration': {
            if (op.targetSec !== null && !(esNum(op.targetSec) && op.targetSec >= LIMITES.duracionMinimaSec && op.targetSec <= LIMITES.produccionMaxSec)) {
                return falla('operation_invalid', 'targetSec', { reason: 'out_of_range', minSec: LIMITES.duracionMinimaSec, maxSec: LIMITES.produccionMaxSec });
            }
            if (op.strict !== undefined && typeof op.strict !== 'boolean')
                return falla('operation_invalid', 'strict', { reason: 'not_boolean' });
            let duration = fijar(prod.duration, 'targetSec', op.targetSec);
            if (op.strict !== undefined)
                duration = fijar(duration, 'strict', op.strict);
            return bien({ ...prod, duration });
        }
        case 'change_camera':
            return cambiarCreativo(prod, op.target, cambiosDe(o, [
                ['cameraType', 'camera.type'], ['perspective', 'camera.perspective'], ['shotType', 'shot.type'],
                ['lens', 'lens.type'], ['focalLengthMm', 'lens.focalLengthMm'], ['composition', 'composition.type'],
            ]));
        case 'change_movement':
            return cambiarCreativo(prod, op.target, cambiosDe(o, [
                ['movement', 'movement.type'], ['speed', 'movement.speed'], ['smoothness', 'motion.smoothness'],
            ]));
        case 'change_lighting':
            return cambiarCreativo(prod, op.target, cambiosDe(o, [['lighting', 'lighting.type']]));
        case 'change_style': {
            if (op.style !== null && typeof op.style !== 'string')
                return falla('operation_invalid', 'style', { reason: 'not_text' });
            const t = op.target as unknown;
            if (!esObj(t))
                return falla('operation_invalid', 'target', { reason: 'not_object' });
            const limpiar = (v: VisualDirection | undefined): VisualDirection | undefined => (v?.style !== undefined ? conVisual(v, { style: null }) : v);
            if (t.scope === 'production') {
                const escenas = prod.scenes.map((s) => fijar({ ...s, shots: s.shots.map((p) => fijar(p, 'visual', limpiar(p.visual))) }, 'visual', limpiar(s.visual)));
                return bien({ ...conEscenas(prod, escenas), creativeDirection: fijar(prod.creativeDirection, 'visualStyle', op.style) });
            }
            if (t.scope === 'scene') {
                const u = typeof t.sceneId === 'string' ? buscarEscena(prod, t.sceneId) : undefined;
                if (!u)
                    return falla('operation_target_missing', 'target.sceneId', { id: String(t.sceneId) });
                return bien(cambiarEscena(prod, u.scene.id, (s) => fijar({ ...s, shots: s.shots.map((p) => fijar(p, 'visual', limpiar(p.visual))) }, 'visual', conVisual(s.visual, { style: op.style }))));
            }
            if (t.scope === 'shot') {
                const u = typeof t.shotId === 'string' ? buscarPlano(prod, t.shotId) : undefined;
                if (!u)
                    return falla('operation_target_missing', 'target.shotId', { id: String(t.shotId) });
                return bien(cambiarPlano(prod, u.shot.id, (p) => fijar(p, 'visual', conVisual(p.visual, { style: op.style }))));
            }
            return falla('operation_invalid', 'target.scope', { reason: 'not_in_vocabulary' });
        }
        case 'change_weather':
        case 'change_time_of_day':
        case 'change_location': {
            const u = buscarEscena(prod, op.sceneId);
            if (!u)
                return falla('operation_target_missing', 'sceneId', { id: String(op.sceneId) });
            const [campo, valor] = op.op === 'change_weather' ? ['weather', op.weather]
                : op.op === 'change_time_of_day' ? ['timeOfDay', op.timeOfDay] : ['locationId', op.locationId];
            return bien(cambiarEscena(prod, u.scene.id, (s) => fijar(s, campo, valor)));
        }
        case 'change_subject': {
            const t = resolver(prod, op.target);
            if (esPaso(t))
                return t;
            if (op.subject !== null && !esObj(op.subject))
                return falla('operation_invalid', 'subject', { reason: 'not_object' });
            if (t.tipo === 'shot')
                return bien(cambiarPlano(prod, t.shot.id, (p) => fijar(p, 'subject', op.subject)));
            if (!t.scene.shots.length)
                return falla('operation_not_applicable', 'target', { reason: 'scene_has_no_shots' });
            return bien(cambiarEscena(prod, t.scene.id, (s) => ({ ...s, shots: s.shots.map((p) => fijar(p, 'subject', op.subject)) })));
        }
        case 'edit_text': {
            const t = resolver(prod, op.target);
            if (esPaso(t))
                return t;
            if (op.title === undefined && op.description === undefined)
                return falla('operation_invalid', '', { reason: 'nothing_to_change' });
            if (t.tipo === 'shot') {
                if (op.title !== undefined)
                    return falla('operation_invalid', 'title', { reason: 'shots_have_no_title' });
                return bien(cambiarPlano(prod, t.shot.id, (p) => fijar(p, 'description', op.description)));
            }
            return bien(cambiarEscena(prod, t.scene.id, (s) => {
                let x = s;
                if (op.title !== undefined)
                    x = fijar(x, 'title', op.title);
                if (op.description !== undefined)
                    x = fijar(x, 'description', op.description);
                return x;
            }));
        }
        case 'replace_character': {
            const de = op.fromCharacterId;
            const a = op.toCharacterId;
            if (!prod.characters.some((c) => c.id === de))
                return falla('operation_target_missing', 'fromCharacterId', { id: String(de) });
            if (!prod.characters.some((c) => c.id === a))
                return falla('operation_target_missing', 'toCharacterId', { id: String(a) });
            if (de === a)
                return falla('operation_invalid', 'toCharacterId', { reason: 'same_character' });
            let ambito: Objetivo | undefined;
            if (op.scope !== undefined) {
                const t = resolver(prod, op.scope, 'scope');
                if (esPaso(t))
                    return t;
                ambito = t;
            }
            const ids = (xs: readonly string[] | undefined): readonly string[] | undefined => xs && xs.includes(de) ? sinRepetidos(xs.map((x) => (x === de ? a : x))) : xs;
            const estados = (xs: readonly CharacterState[] | undefined): readonly CharacterState[] | undefined => {
                if (!xs || !xs.some((e) => e.characterId === de))
                    return xs;
                const yaEsta = xs.some((e) => e.characterId === a);
                return listaO(xs.filter((e) => !(yaEsta && e.characterId === de)).map((e) => (e.characterId === de ? { ...e, characterId: a } : e)));
            };
            const lineas = (ls: readonly DialogueLine[] | undefined): readonly DialogueLine[] | undefined => ls?.some((l) => l.characterId === de) ? ls.map((l) => (l.characterId === de ? { ...l, characterId: a } : l)) : ls;
            const regla = (r: ContinuityRule | undefined): ContinuityRule | undefined => {
                if (!r)
                    return r;
                const anchors = ids(r.anchors);
                const spatial = r.spatial?.map((x) => ({ ...x, subject: x.subject === de ? a : x.subject, object: x.object === de ? a : x.object }));
                return fijar(fijar(r, 'anchors', anchors), 'spatial', spatial);
            };
            const enPlano = (p: ProductionShot): ProductionShot => {
                let x = fijar(p, 'characterIds', ids(p.characterIds));
                x = fijar(x, 'characterStates', estados(p.characterStates));
                x = fijar(x, 'dialogue', lineas(p.dialogue));
                x = fijar(x, 'continuity', regla(p.continuity));
                if (x.subject?.characterId === de)
                    x = { ...x, subject: { ...x.subject, characterId: a } };
                return x;
            };
            const enEscena = (s: ProductionScene): ProductionScene => {
                let x = fijar(s, 'characterIds', ids(s.characterIds));
                x = fijar(x, 'characterStates', estados(s.characterStates));
                x = fijar(x, 'dialogue', lineas(s.dialogue));
                x = fijar(x, 'continuity', regla(s.continuity));
                return { ...x, shots: x.shots.map(enPlano) };
            };
            if (ambito?.tipo === 'shot')
                return bien(cambiarPlano(prod, ambito.shot.id, enPlano));
            if (ambito?.tipo === 'scene')
                return bien(cambiarEscena(prod, ambito.scene.id, enEscena));
            return bien({ ...conEscenas(prod, prod.scenes.map(enEscena)), ...(prod.continuity ? { continuity: regla(prod.continuity) } : {}) });
        }
        case 'set_character_state': {
            const t = resolver(prod, op.target);
            if (esPaso(t))
                return t;
            if (!prod.characters.some((c) => c.id === op.characterId))
                return falla('operation_target_missing', 'characterId', { id: String(op.characterId) });
            if (op.wardrobe === undefined && op.appearanceNotes === undefined)
                return falla('operation_invalid', '', { reason: 'nothing_to_change' });
            const poner = (xs: readonly CharacterState[] | undefined): readonly CharacterState[] | undefined => {
                const actual: CharacterState = (xs ?? []).find((e) => e.characterId === op.characterId) ?? { characterId: op.characterId };
                let nuevo = actual;
                if (op.wardrobe !== undefined)
                    nuevo = fijar(nuevo, 'wardrobe', op.wardrobe);
                if (op.appearanceNotes !== undefined)
                    nuevo = fijar(nuevo, 'appearanceNotes', op.appearanceNotes);
                const vacio = nuevo.wardrobe === undefined && nuevo.appearanceNotes === undefined;
                const resto = (xs ?? []).filter((e) => e.characterId !== op.characterId);
                const posicion = (xs ?? []).findIndex((e) => e.characterId === op.characterId);
                if (vacio)
                    return listaO(resto);
                const salida = [...resto];
                salida.splice(posicion < 0 ? salida.length : posicion, 0, nuevo);
                return salida;
            };
            if (t.tipo === 'shot')
                return bien(cambiarPlano(prod, t.shot.id, (p) => fijar(p, 'characterStates', poner(p.characterStates))));
            return bien(cambiarEscena(prod, t.scene.id, (s) => fijar(s, 'characterStates', poner(s.characterStates))));
        }
        case 'replace_reference': {
            const de = prod.references.find((r) => r.id === op.fromReferenceId);
            const a = prod.references.find((r) => r.id === op.toReferenceId);
            if (!de)
                return falla('operation_target_missing', 'fromReferenceId', { id: String(op.fromReferenceId) });
            if (!a)
                return falla('operation_target_missing', 'toReferenceId', { id: String(op.toReferenceId) });
            if (de.id === a.id)
                return falla('operation_invalid', 'toReferenceId', { reason: 'same_reference' });
            if (de.kind !== a.kind)
                return falla('operation_invalid', 'toReferenceId', { reason: 'kind_mismatch', from: de.kind, to: a.kind });
            const cambiar = (v: unknown): unknown => {
                if (Array.isArray(v))
                    return v.map(cambiar);
                if (!esObj(v))
                    return v;
                const salida: Record<string, unknown> = {};
                for (const [k, x] of Object.entries(v)) {
                    if (k === 'referenceIds' && Array.isArray(x))
                        salida[k] = sinRepetidos(x.map((id) => (id === de.id ? a.id : id)));
                    else if (k === 'referenceId' && x === de.id)
                        salida[k] = a.id;
                    else
                        salida[k] = cambiar(x);
                }
                return salida;
            };
            return bien(cambiar(prod) as Prod);
        }
        case 'add_dialogue': {
            const t = resolver(prod, op.target);
            if (esPaso(t))
                return t;
            if (!esObj(op.line))
                return falla('operation_invalid', 'line', { reason: 'not_object' });
            if (esId(op.line.id) && idsDeLaProduccion(prod).has(op.line.id))
                return falla('operation_invalid', 'line.id', { reason: 'id_taken', id: op.line.id });
            const meter = (ls: readonly DialogueLine[] | undefined): readonly DialogueLine[] | Paso => {
                const xs = [...(ls ?? [])];
                const at = op.atIndex ?? xs.length;
                if (!entero(at, 0, xs.length))
                    return falla('operation_invalid', 'atIndex', { reason: 'out_of_range', max: xs.length });
                xs.splice(at, 0, op.line);
                return xs;
            };
            const actuales = t.tipo === 'shot' ? t.shot.dialogue : t.scene.dialogue;
            const nuevas = meter(actuales);
            if (!Array.isArray(nuevas))
                return nuevas as Paso;
            return bien(t.tipo === 'shot'
                ? cambiarPlano(prod, t.shot.id, (p) => ({ ...p, dialogue: nuevas }))
                : cambiarEscena(prod, t.scene.id, (s) => ({ ...s, dialogue: nuevas })));
        }
        case 'change_dialogue':
        case 'remove_dialogue': {
            let encontrada = false;
            const cambio = op.op === 'change_dialogue' ? op.changes : undefined;
            if (op.op === 'change_dialogue' && (!esObj(cambio) || !Object.keys(cambio).length)) {
                return falla('operation_invalid', 'changes', { reason: 'nothing_to_change' });
            }
            if (cambio) {
                const permitidos = ['text', 'kind', 'characterId', 'language', 'emotion', 'estimatedSec'];
                const extra = Object.keys(cambio).find((k) => !permitidos.includes(k));
                if (extra !== undefined)
                    return falla('operation_invalid', `changes.${extra}`, { reason: claveProhibidaDeNodo(extra) ? 'forbidden_field' : 'unknown_field' });
            }
            const tocar = (ls: readonly DialogueLine[] | undefined): readonly DialogueLine[] | undefined => {
                if (!ls || !ls.some((l) => l.id === op.lineId))
                    return ls;
                encontrada = true;
                if (!cambio)
                    return listaO(ls.filter((l) => l.id !== op.lineId));
                return ls.map((l) => {
                    if (l.id !== op.lineId)
                        return l;
                    let x: DialogueLine = l;
                    for (const [k, v] of Object.entries(cambio))
                        x = fijar(x, k, v);
                    return x;
                });
            };
            const escenas = prod.scenes.map((s) => fijar({ ...s, shots: s.shots.map((p) => fijar(p, 'dialogue', tocar(p.dialogue))) }, 'dialogue', tocar(s.dialogue)));
            if (!encontrada)
                return falla('operation_target_missing', 'lineId', { id: String(op.lineId) });
            return bien(conEscenas(prod, escenas));
        }
        case 'modify_audio': {
            const c = op.change as unknown;
            if (!esObj(c))
                return falla('operation_invalid', 'change', { reason: 'not_object' });
            if (c.action === 'upsert') {
                if (!esObj(c.cue))
                    return falla('operation_invalid', 'change.cue', { reason: 'not_object' });
                const cue = c.cue as unknown as AudioCue;
                const existe = prod.audio.cues.some((x) => x.id === cue.id);
                if (!existe && idsDeLaProduccion(prod).has(cue.id))
                    return falla('operation_invalid', 'change.cue.id', { reason: 'id_taken', id: cue.id });
                const cues = existe ? prod.audio.cues.map((x) => (x.id === cue.id ? cue : x)) : [...prod.audio.cues, cue];
                return bien({ ...prod, audio: { ...prod.audio, cues } });
            }
            if (c.action === 'remove') {
                if (!prod.audio.cues.some((x) => x.id === c.cueId))
                    return falla('operation_target_missing', 'change.cueId', { id: String(c.cueId) });
                return bien({ ...prod, audio: { ...prod.audio, cues: prod.audio.cues.filter((x) => x.id !== c.cueId) } });
            }
            if (c.action === 'set_narrator') {
                if (c.narrator !== null && !esObj(c.narrator))
                    return falla('operation_invalid', 'change.narrator', { reason: 'not_object' });
                return bien({ ...prod, audio: fijar(prod.audio, 'narrator', c.narrator) });
            }
            return falla('operation_invalid', 'change.action', { reason: 'not_in_vocabulary' });
        }
        case 'change_format': {
            if (op.aspectRatio === undefined && op.resolution === undefined && op.preset === undefined) {
                return falla('operation_invalid', '', { reason: 'nothing_to_change' });
            }
            let format = prod.format;
            if (op.preset !== undefined) {
                const valido = typeof op.preset === 'string' && (PRESETS as readonly string[]).includes(op.preset);
                if (!valido)
                    return falla('operation_invalid', 'preset', { reason: 'not_in_vocabulary' });
                const conf = configuracionDePreset(op.preset);
                if (op.aspectRatio !== undefined && op.aspectRatio !== conf.format.aspectRatio)
                    return falla('operation_invalid', 'aspectRatio', { reason: 'preset_conflict' });
                if (op.resolution !== undefined && op.resolution !== conf.format.resolution)
                    return falla('operation_invalid', 'resolution', { reason: 'preset_conflict' });
                format = conf.format;
            }
            else {
                format = sin(format, 'preset');
                if (op.aspectRatio !== undefined)
                    format = { ...format, aspectRatio: op.aspectRatio };
                if (op.resolution !== undefined)
                    format = fijar(format, 'resolution', op.resolution);
            }
            const rutas: CreativeParameterPath[] = ['framing.aspectRatio'];
            const escenas = prod.scenes.map((s) => fijar({ ...s, shots: s.shots.map((p) => fijar(p, 'visual', quitarDeVisual(p.visual, rutas))) }, 'visual', quitarDeVisual(s.visual, rutas)));
            const cp = prod.creativeDirection.cinematography;
            const cinematography = cp && valorCreativo(cp, 'framing.aspectRatio') !== undefined ? conRutas(cp, [['framing.aspectRatio', null]]) : cp;
            return bien({ ...conEscenas(prod, escenas), format, creativeDirection: fijar(prod.creativeDirection, 'cinematography', cinematography) });
        }
        case 'change_export': {
            const c = op.change as unknown;
            if (!esObj(c))
                return falla('operation_invalid', 'change', { reason: 'not_object' });
            if (c.action === 'upsert') {
                if (!esObj(c.target))
                    return falla('operation_invalid', 'change.target', { reason: 'not_object' });
                const t = c.target as unknown as ExportTarget;
                const existe = prod.exportPlan.targets.some((x) => x.id === t.id);
                if (!existe && idsDeLaProduccion(prod).has(t.id))
                    return falla('operation_invalid', 'change.target.id', { reason: 'id_taken', id: t.id });
                const targets = existe ? prod.exportPlan.targets.map((x) => (x.id === t.id ? t : x)) : [...prod.exportPlan.targets, t];
                return bien({ ...prod, exportPlan: { ...prod.exportPlan, targets } });
            }
            if (c.action === 'remove') {
                if (!prod.exportPlan.targets.some((x) => x.id === c.targetId))
                    return falla('operation_target_missing', 'change.targetId', { id: String(c.targetId) });
                return bien({ ...prod, exportPlan: { ...prod.exportPlan, targets: prod.exportPlan.targets.filter((x) => x.id !== c.targetId) } });
            }
            return falla('operation_invalid', 'change.action', { reason: 'not_in_vocabulary' });
        }
        default:
            return falla('operation_invalid', 'op', { reason: 'unknown_operation' });
    }
};
const revisarForma = (op: unknown): OperationProblem | undefined => {
    if (!esObj(op))
        return problema('operation_invalid', '', { reason: 'not_object' });
    const nombre = op.op;
    if (typeof nombre !== 'string' || !Object.prototype.hasOwnProperty.call(CAMPOS, nombre)) {
        return problema('operation_invalid', 'op', { reason: 'unknown_operation' });
    }
    const { req, opt } = CAMPOS[nombre as OperationName];
    for (const k of Object.keys(op)) {
        if (k === 'op')
            continue;
        if (claveProhibidaDeNodo(k))
            return problema('operation_invalid', k, { reason: 'forbidden_field' });
        if (!req.includes(k) && !opt.includes(k))
            return problema('operation_invalid', k, { reason: 'unknown_field' });
    }
    for (const k of req)
        if (op[k] === undefined)
            return problema('operation_invalid', k, { reason: 'required' });
    return undefined;
};
interface Firmas {
    readonly unidades: Map<string, string>;
    readonly lineas: Map<string, string>;
    readonly sonidos: Map<string, string>;
    readonly linea: string;
}
const firmas = (prod: Prod): Firmas => {
    const personajes = new Map(prod.characters.map((c) => [c.id, c] as [
        string,
        unknown
    ]));
    const lugares = new Map(prod.locations.map((l) => [l.id, l] as [
        string,
        unknown
    ]));
    const cosas = new Map(prod.objects.map((o) => [o.id, o] as [
        string,
        unknown
    ]));
    const referencias = new Map(prod.references.map((r) => [r.id, r] as [
        string,
        unknown
    ]));
    const idsDeReferencias = (v: unknown, salida: Set<string>): void => {
        if (Array.isArray(v)) {
            v.forEach((x) => idsDeReferencias(x, salida));
            return;
        }
        if (!esObj(v))
            return;
        for (const [k, x] of Object.entries(v)) {
            if (k === 'referenceIds' && Array.isArray(x))
                x.forEach((id) => { if (typeof id === 'string')
                    salida.add(id); });
            else if (k === 'referenceId' && typeof x === 'string')
                salida.add(x);
            else
                idsDeReferencias(x, salida);
        }
    };
    const lista = unidades(prod);
    const mapa = new Map<string, string>();
    lista.forEach((u, i) => {
        const { scene, shot } = u;
        const reparto = repartoDelPlano(scene, shot);
        const objetos = shot?.objectIds ?? scene.objectIds ?? [];
        const defsDePersonajes = reparto.map((id) => {
            const def = personajes.get(id) as Record<string, unknown> | undefined;
            return { def: def ? sin(def, 'voice') : { missing: id }, estado: estadoEfectivo(scene, shot, id) };
        });
        const defsDeObjetos = objetos.map((id) => cosas.get(id) ?? { missing: id });
        const lugar = scene.locationId !== undefined ? lugares.get(scene.locationId) ?? { missing: scene.locationId } : undefined;
        const usadas = new Set<string>([...(shot?.referenceIds ?? []), ...(prod.creativeDirection.referenceIds ?? [])]);
        idsDeReferencias([defsDePersonajes, defsDeObjetos, lugar], usadas);
        const continuidad = continuidadEfectiva(prod, scene, shot);
        const aCamara = (shot ? shot.dialogue : scene.dialogue)?.filter((l) => l.kind === 'dialogue')
            .map((l) => ({ text: l.text, characterId: l.characterId, language: idiomaDeLinea(prod, l), emotion: l.emotion }));
        const anterior = continuidad?.preserve.includes('temporal.previousShot') && i > 0 && lista[i - 1].scene.id === scene.id
            ? lista[i - 1].unitId : undefined;
        mapa.set(u.unitId, canonico({
            formato: { aspectRatio: prod.format.aspectRatio, resolution: prod.format.resolution },
            direccion: {
                visualStyle: prod.creativeDirection.visualStyle, mood: prod.creativeDirection.mood,
                tone: prod.creativeDirection.tone, color: prod.creativeDirection.color, pacing: prod.creativeDirection.pacing,
            },
            calidad: shot?.generation?.quality ?? prod.generation.quality,
            creativo: creativoEfectivo(prod, scene, shot),
            escena: {
                description: scene.description, timeOfDay: scene.timeOfDay, weather: scene.weather, lugar,
                style: scene.visual?.style, mood: scene.visual?.mood, withSound: scene.audio?.withSound,
                acciones: shot ? undefined : scene.actions,
            },
            plano: shot ? {
                duracion: shot.durationSec, description: shot.description, subject: shot.subject, acciones: shot.actions,
                style: shot.visual?.style, mood: shot.visual?.mood, withSound: shot.audio?.withSound, avanzado: shot.advanced?.prompt,
                dependencias: shot.dependsOn,
            } : { duracion: duracionDeEscenaMs(scene) },
            personajes: defsDePersonajes,
            objetos: defsDeObjetos,
            referencias: [...usadas].sort().map((id) => referencias.get(id) ?? { missing: id }),
            aCamara,
            continuidad,
            anterior,
        }));
    });
    const lineas = new Map<string, string>();
    const firmaDeLinea = (l: DialogueLine): string => canonico({
        text: l.text, kind: l.kind, characterId: l.characterId, language: idiomaDeLinea(prod, l), emotion: l.emotion,
        estimatedSec: l.estimatedSec, voz: vozDeLinea(prod, l),
        referencia: vozDeLinea(prod, l)?.referenceId !== undefined ? referencias.get(vozDeLinea(prod, l)?.referenceId as string) : undefined,
    });
    for (const s of prod.scenes) {
        for (const l of s.dialogue ?? [])
            lineas.set(l.id, firmaDeLinea(l));
        for (const p of s.shots)
            for (const l of p.dialogue ?? [])
                lineas.set(l.id, firmaDeLinea(l));
    }
    const total = duracionTotalMs(prod);
    const sonidos = new Map<string, string>();
    for (const c of prod.audio.cues) {
        const t = c.target;
        const tramo = t.scope === 'production' ? total
            : t.scope === 'scenes' ? t.sceneIds.reduce<number | undefined>((acc, id) => {
                const s = buscarEscena(prod, id);
                const d = s ? duracionDeEscenaMs(s.scene) : undefined;
                return acc === undefined || d === undefined ? undefined : acc + d;
            }, 0)
                : (() => { const p = buscarPlano(prod, t.shotId); return p?.shot.durationSec !== undefined ? aMs(p.shot.durationSec) : undefined; })();
        sonidos.set(c.id, canonico({
            kind: c.kind, description: c.description, target: t,
            duracionMs: c.durationSec !== undefined ? aMs(c.durationSec) : tramo,
            referencias: (c.referenceIds ?? []).map((id) => referencias.get(id) ?? { missing: id }),
        }));
    }
    const lineaDeTiempo = canonico(lista.map((u: Unidad) => [
        u.unitId, u.scene.id, duracionDeUnidadMs(u) ?? null, valorCreativo(creativoEfectivo(prod, u.scene, u.shot), 'transition.type') ?? null,
    ]));
    return { unidades: mapa, lineas, sonidos, linea: lineaDeTiempo };
};
const pendientes = (antes: Prod, despues: Prod): {
    readonly pending: PendingRegeneration;
    readonly timelineChanged: boolean;
} => {
    const a = firmas(antes);
    const d = firmas(despues);
    const lista = unidades(despues);
    const pendientesDeUnidad = new Set<string>();
    for (const [id, f] of d.unidades)
        if (a.unidades.get(id) !== f)
            pendientesDeUnidad.add(id);
    const dependientes = new Map<string, string[]>();
    const dependientesDeEscena = new Map<string, string[]>();
    for (const s of despues.scenes) {
        for (const dep of s.dependsOn ?? [])
            dependientesDeEscena.set(dep, [...(dependientesDeEscena.get(dep) ?? []), s.id]);
        for (const p of s.shots)
            for (const dep of p.dependsOn ?? [])
                dependientes.set(dep, [...(dependientes.get(dep) ?? []), p.id]);
    }
    const unidadesDeEscena = (sceneId: string): string[] => lista.filter((u) => u.scene.id === sceneId).map((u) => u.unitId);
    const escenaDe = new Map(lista.map((u) => [u.unitId, u.scene.id] as [
        string,
        string
    ]));
    const cola = [...pendientesDeUnidad];
    const escenasVistas = new Set<string>();
    while (cola.length) {
        const id = cola.shift() as string;
        for (const x of dependientes.get(id) ?? [])
            if (!pendientesDeUnidad.has(x)) {
                pendientesDeUnidad.add(x);
                cola.push(x);
            }
        const escena = escenaDe.get(id);
        if (escena !== undefined && !escenasVistas.has(escena)) {
            escenasVistas.add(escena);
            for (const s of dependientesDeEscena.get(escena) ?? []) {
                for (const x of unidadesDeEscena(s))
                    if (!pendientesDeUnidad.has(x)) {
                        pendientesDeUnidad.add(x);
                        cola.push(x);
                    }
            }
        }
    }
    const shots = lista.filter((u) => u.shot && pendientesDeUnidad.has(u.unitId)).map((u) => u.unitId);
    const scenes = despues.scenes.filter((s) => unidadesDeEscena(s.id).some((x) => pendientesDeUnidad.has(x))).map((s) => s.id);
    const audio: string[] = [];
    for (const [id, f] of d.lineas)
        if (a.lineas.get(id) !== f)
            audio.push(id);
    for (const [id, f] of d.sonidos)
        if (a.sonidos.get(id) !== f)
            audio.push(id);
    const presentes = idsDeLaProduccion(despues);
    const removed: string[] = [];
    for (const s of antes.scenes) {
        for (const id of [s.id, ...(s.dialogue ?? []).map((l) => l.id)])
            if (!presentes.has(id))
                removed.push(id);
        for (const p of s.shots)
            for (const id of [p.id, ...(p.dialogue ?? []).map((l) => l.id)])
                if (!presentes.has(id))
                    removed.push(id);
    }
    for (const c of antes.audio.cues)
        if (!presentes.has(c.id))
            removed.push(c.id);
    return { pending: { scenes, shots, audio, removed }, timelineChanged: a.linea !== d.linea };
};
const sinRevision = (prod: Prod): string => canonico({ ...prod, metadata: { ...prod.metadata, revision: 0 } });
export const aplicarOperaciones = (prod: Prod, ops: readonly FilmmakerOperation[]): OperationResult => {
    const rota = integridad(prod);
    if (rota.length) {
        return { ok: false, problems: [problema('production_invalid', '', { codes: sinRepetidos(rota.map((x) => x.code)) }), ...rota] };
    }
    if (!Array.isArray(ops))
        return { ok: false, problems: [problema('operation_invalid', '', { reason: 'not_a_list' })] };
    let actual = prod;
    let aplicadas = 0;
    for (let i = 0; i < ops.length; i++) {
        const forma = revisarForma(ops[i]);
        if (forma)
            return { ok: false, problems: [{ ...forma, parameters: { ...forma.parameters, index: i } }] };
        const paso = ejecutar(actual, ops[i]);
        if (!paso.ok)
            return { ok: false, problems: paso.problems.map((x) => ({ ...x, parameters: { ...x.parameters, index: i } })) };
        const rotos = integridad(paso.production);
        if (rotos.length) {
            return {
                ok: false,
                problems: [
                    problema('operation_would_break_integrity', '', { index: i, codes: sinRepetidos(rotos.map((x) => x.code)) }),
                    ...rotos,
                ],
            };
        }
        if (sinRevision(paso.production) !== sinRevision(actual)) {
            aplicadas++;
            actual = { ...paso.production, metadata: { ...paso.production.metadata, revision: actual.metadata.revision + 1 } };
        }
    }
    const { pending, timelineChanged } = pendientes(prod, actual);
    return { ok: true, production: actual, pending, timelineChanged, applied: aplicadas };
};
export const aplicarOperacion = (prod: Prod, op: FilmmakerOperation): OperationResult => aplicarOperaciones(prod, [op]);
export const pendientesEntre = (antes: Prod, despues: Prod): {
    readonly pending: PendingRegeneration;
    readonly timelineChanged: boolean;
} => pendientes(antes, despues);
