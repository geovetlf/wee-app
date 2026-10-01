// GENERADO por scripts/espejo-filmmaker.mjs desde functions/src/filmmaker/modelo.ts: no se edita a mano, se regenera.
import type { AspectRatio, CreativeParameters } from '../core/creative';
import { completarCreativos, versionCreativaActual } from '../core/creative';
import type { ContinuityAspect, ContinuityRequirements, SpatialRelationKind } from '../core/continuity';
import { ASPECTOS_DE_CONTINUIDAD, MAX_ANCLAJES, MAX_RELACIONES_ESPACIALES } from '../core/continuity';
import type { ElementBinding } from '../core/shot';
import { FORMA_DE_ID_DE_PLANO, MAX_DEPENDENCIAS_DE_PLANO, MAX_ELEMENTOS_POR_NODO, MAX_NARRATIVA, MAX_NOMBRE_DE_ESCENA, } from '../core/shot';
import type { AssetKind } from '../core/content/asset';
import type { ExecutionHints } from '../core/gateway';
export const FILMMAKER_MODEL_VERSION = 1 as const;
export const FORMA_DE_ID: RegExp = FORMA_DE_ID_DE_PLANO;
export const esId = (v: unknown): v is string => typeof v === 'string' && FORMA_DE_ID.test(v);
export const TIPOS_DE_PRODUCCION = Object.freeze([
    'video', 'short_film', 'ad', 'trailer', 'music_video', 'story', 'product', 'presentation', 'cinematic', 'social',
] as const);
export type ProductionType = typeof TIPOS_DE_PRODUCCION[number];
export const PRIORIDADES = Object.freeze(['quality', 'speed', 'cost', 'continuity'] as const);
export type IntentPriority = typeof PRIORIDADES[number];
export const RITMOS = Object.freeze(['slow', 'moderate', 'fast'] as const);
export type Pacing = typeof RITMOS[number];
export const MOMENTOS_DEL_DIA = Object.freeze(['dawn', 'morning', 'midday', 'afternoon', 'dusk', 'night'] as const);
export type TimeOfDay = typeof MOMENTOS_DEL_DIA[number];
export const CLIMAS = Object.freeze(['clear', 'cloudy', 'overcast', 'rain', 'storm', 'snow', 'fog', 'wind'] as const);
export type Weather = typeof CLIMAS[number];
export const PROPOSITOS_NARRATIVOS = Object.freeze([
    'hook', 'setup', 'development', 'turning_point', 'climax', 'resolution', 'reveal', 'transition', 'call_to_action',
] as const);
export type NarrativePurpose = typeof PROPOSITOS_NARRATIVOS[number];
export const ENFOQUES = Object.freeze([
    'face', 'eyes', 'hands', 'upper_body', 'full_body', 'group', 'object', 'detail', 'environment',
] as const);
export type SubjectFocus = typeof ENFOQUES[number];
export const TIPOS_DE_LINEA = Object.freeze(['dialogue', 'voiceover', 'narration'] as const);
export type DialogueKind = typeof TIPOS_DE_LINEA[number];
export const TIPOS_DE_SONIDO = Object.freeze(['music', 'sfx', 'ambience'] as const);
export type AudioCueKind = typeof TIPOS_DE_SONIDO[number];
export const PAPELES_DE_REFERENCIA = Object.freeze([
    'style', 'character', 'location', 'object', 'first_frame', 'last_frame', 'motion', 'audio', 'general',
] as const);
export type ReferenceRole = typeof PAPELES_DE_REFERENCIA[number];
export const TIPOS_DE_OBJETO = Object.freeze(['prop', 'product', 'vehicle', 'brand', 'other'] as const);
export type ObjectKind = typeof TIPOS_DE_OBJETO[number];
export const AMBIENTES = Object.freeze(['interior', 'exterior'] as const);
export type LocationSetting = typeof AMBIENTES[number];
export const RESOLUCIONES = Object.freeze(['480p', '720p', '1080p', '4k'] as const);
export type ResolutionTarget = typeof RESOLUCIONES[number];
export const MODOS_DE_SUBTITULO = Object.freeze(['none', 'burned', 'sidecar'] as const);
export type SubtitleMode = typeof MODOS_DE_SUBTITULO[number];
export const POSICIONES_DE_SUBTITULO = Object.freeze(['bottom', 'top', 'center'] as const);
export type SubtitlePosition = typeof POSICIONES_DE_SUBTITULO[number];
export const ESTILOS_DE_SUBTITULO = Object.freeze(['standard', 'bold', 'boxed'] as const);
export type SubtitleStyle = typeof ESTILOS_DE_SUBTITULO[number];
export const PISTAS = Object.freeze(['video', 'dialogue', 'narration', 'music', 'sfx', 'ambience', 'subtitles'] as const);
export type EditTrackKind = typeof PISTAS[number];
export const PROPOSITOS_DE_EXPORTACION = Object.freeze(['final', 'preview'] as const);
export type ExportPurpose = typeof PROPOSITOS_DE_EXPORTACION[number];
export const PREVISUALIZACIONES = Object.freeze(['none', 'frames'] as const);
export type PreviewPolicy = typeof PREVISUALIZACIONES[number];
export type ProductionQuality = NonNullable<ExecutionHints['quality']>;
export const CALIDADES: readonly ProductionQuality[] = Object.freeze(['standard', 'high', 'max'] as ProductionQuality[]);
export const RELACIONES_ENTRE_PERSONAJES = Object.freeze([
    'family', 'partner', 'friend', 'rival', 'colleague', 'mentor', 'other',
] as const);
export type RelationshipKind = typeof RELACIONES_ENTRE_PERSONAJES[number];
export const RASGOS = Object.freeze([
    'face', 'hair', 'body', 'wardrobe', 'accessories', 'makeup', 'materials', 'colors', 'lighting', 'visualStyle', 'environment',
] as const);
export type AppearanceTraitKey = typeof RASGOS[number];
export const TIPOS_DE_RESTRICCION = Object.freeze([
    'max_duration', 'min_duration', 'aspect_ratio', 'no_dialogue', 'no_music', 'no_narration', 'include_character', 'note',
] as const);
export type IntentConstraintKind = typeof TIPOS_DE_RESTRICCION[number];
export const PRESETS = Object.freeze([
    'tiktok', 'instagram_reels', 'youtube_shorts', 'youtube', 'ads', 'stories',
] as const);
export type FormatPresetId = typeof PRESETS[number];
export const LIMITES = Object.freeze({
    duracionMinimaSec: 0.5,
    planoMaxSec: 600,
    escenaMaxSec: 3600,
    produccionMaxSec: 10800,
    escenas: 200,
    planosPorEscena: 100,
    planos: 1000,
    personajes: 64,
    lugares: 64,
    objetos: 128,
    referencias: 256,
    referenciasPorCosa: 32,
    lineasPorBloque: 100,
    sonidos: 256,
    exportaciones: 8,
    marcas: 64,
    accionesPorBloque: 16,
    etiquetas: 32,
    restricciones: 32,
    paleta: 16,
    relaciones: 16,
    nombre: MAX_NOMBRE_DE_ESCENA,
    frase: MAX_NARRATIVA,
    texto: 2000,
    linea: 1000,
    textoLibre: 4000,
    elementosPorBloque: MAX_ELEMENTOS_POR_NODO,
    dependencias: MAX_DEPENDENCIAS_DE_PLANO,
    anclajes: MAX_ANCLAJES,
    relacionesEspaciales: MAX_RELACIONES_ESPACIALES,
    edadMaxima: 150,
    toleranciaMs: 50,
});
export interface ProductionIntent {
    readonly objective?: string;
    readonly productionType?: ProductionType;
    readonly audience?: string;
    readonly requestedDurationSec?: number;
    readonly aspectRatio?: AspectRatio;
    readonly preset?: FormatPresetId;
    readonly tone?: string;
    readonly style?: string;
    readonly theme?: string;
    readonly narrative?: string;
    readonly constraints?: readonly IntentConstraint[];
    readonly referenceIds?: readonly string[];
    readonly priorities?: readonly IntentPriority[];
    readonly freeText?: string;
}
export type IntentConstraint = {
    readonly kind: 'max_duration';
    readonly seconds: number;
} | {
    readonly kind: 'min_duration';
    readonly seconds: number;
} | {
    readonly kind: 'aspect_ratio';
    readonly aspectRatio: AspectRatio;
} | {
    readonly kind: 'no_dialogue';
} | {
    readonly kind: 'no_music';
} | {
    readonly kind: 'no_narration';
} | {
    readonly kind: 'include_character';
    readonly characterId: string;
} | {
    readonly kind: 'note';
    readonly text: string;
};
export interface CreativeDirection {
    readonly visualStyle?: string;
    readonly mood?: string;
    readonly tone?: string;
    readonly pacing?: Pacing;
    readonly color?: ColorDirection;
    readonly cinematography?: CreativeParameters;
    readonly referenceIds?: readonly string[];
}
export interface ColorDirection {
    readonly palette?: readonly string[];
    readonly grading?: string;
}
export interface ProductionFormat {
    readonly aspectRatio: AspectRatio;
    readonly resolution?: ResolutionTarget;
    readonly preset?: FormatPresetId;
}
export interface ProductionDuration {
    readonly targetSec?: number;
    readonly strict?: boolean;
}
export interface FormatPreset {
    readonly id: FormatPresetId;
    readonly aspectRatio: AspectRatio;
    readonly resolution: ResolutionTarget;
    readonly recommendedDurationSec: number;
}
export const PRESETS_DE_FORMATO: Readonly<Record<FormatPresetId, FormatPreset>> = Object.freeze({
    tiktok: Object.freeze({ id: 'tiktok', aspectRatio: '9:16', resolution: '1080p', recommendedDurationSec: 15 }),
    instagram_reels: Object.freeze({ id: 'instagram_reels', aspectRatio: '9:16', resolution: '1080p', recommendedDurationSec: 15 }),
    youtube_shorts: Object.freeze({ id: 'youtube_shorts', aspectRatio: '9:16', resolution: '1080p', recommendedDurationSec: 15 }),
    youtube: Object.freeze({ id: 'youtube', aspectRatio: '16:9', resolution: '1080p', recommendedDurationSec: 60 }),
    ads: Object.freeze({ id: 'ads', aspectRatio: '4:5', resolution: '1080p', recommendedDurationSec: 15 }),
    stories: Object.freeze({ id: 'stories', aspectRatio: '9:16', resolution: '1080p', recommendedDurationSec: 15 }),
} as Record<FormatPresetId, FormatPreset>);
export const configuracionDePreset = (id: FormatPresetId): {
    readonly format: ProductionFormat;
    readonly duration: ProductionDuration;
} => {
    const p = PRESETS_DE_FORMATO[id];
    return {
        format: { aspectRatio: p.aspectRatio, resolution: p.resolution, preset: p.id },
        duration: { targetSec: p.recommendedDurationSec },
    };
};
export interface VisualDirection {
    readonly creative?: CreativeParameters;
    readonly style?: string;
    readonly mood?: string;
}
export interface AudioDirection {
    readonly notes?: string;
    readonly withSound?: boolean;
}
export type ContinuityRule = Omit<ContinuityRequirements, 'anchors' | 'spatial'> & {
    readonly anchors?: readonly string[];
    readonly spatial?: readonly EntitySpatialConstraint[];
};
export interface EntitySpatialConstraint {
    readonly subject: string;
    readonly relation: SpatialRelationKind;
    readonly object: string;
}
export interface ProductionScene {
    readonly id: string;
    readonly order: number;
    readonly title?: string;
    readonly description?: string;
    readonly narrativePurpose?: NarrativePurpose;
    readonly durationSec?: number;
    readonly timeOfDay?: TimeOfDay;
    readonly weather?: Weather;
    readonly locationId?: string;
    readonly characterIds?: readonly string[];
    readonly objectIds?: readonly string[];
    readonly characterStates?: readonly CharacterState[];
    readonly actions?: readonly string[];
    readonly dialogue?: readonly DialogueLine[];
    readonly visual?: VisualDirection;
    readonly audio?: AudioDirection;
    readonly continuity?: ContinuityRule;
    readonly dependsOn?: readonly string[];
    readonly shots: readonly ProductionShot[];
}
export interface ProductionShot {
    readonly id: string;
    readonly order: number;
    readonly durationSec?: number;
    readonly description?: string;
    readonly visual?: VisualDirection;
    readonly subject?: ShotSubject;
    readonly characterIds?: readonly string[];
    readonly objectIds?: readonly string[];
    readonly characterStates?: readonly CharacterState[];
    readonly actions?: readonly string[];
    readonly dialogue?: readonly DialogueLine[];
    readonly audio?: AudioDirection;
    readonly referenceIds?: readonly string[];
    readonly continuity?: ContinuityRule;
    readonly dependsOn?: readonly string[];
    readonly generation?: ShotGeneration;
    readonly advanced?: AdvancedDirection;
}
export interface ShotSubject {
    readonly characterId?: string;
    readonly objectId?: string;
    readonly focus?: SubjectFocus;
    readonly description?: string;
}
export interface CharacterState {
    readonly characterId: string;
    readonly wardrobe?: string;
    readonly appearanceNotes?: string;
}
export interface ShotGeneration {
    readonly quality?: ProductionQuality;
}
export interface AdvancedDirection {
    readonly prompt: string;
}
export interface DialogueLine {
    readonly id: string;
    readonly kind: DialogueKind;
    readonly characterId?: string;
    readonly text: string;
    readonly language?: string;
    readonly emotion?: string;
    readonly estimatedSec?: number;
}
export interface ProductionCharacter {
    readonly id: string;
    readonly name: string;
    readonly identityDescription?: string;
    readonly apparentAge?: ApparentAge;
    readonly physicalCharacteristics?: readonly string[];
    readonly appearance?: AppearanceProfile;
    readonly referenceIds?: readonly string[];
    readonly voice?: VoiceReference;
    readonly relationships?: readonly CharacterRelationship[];
    readonly continuity?: CharacterContinuity;
    readonly element?: ElementBinding;
}
export interface ApparentAge {
    readonly minYears?: number;
    readonly maxYears?: number;
}
export interface VoiceReference {
    readonly description?: string;
    readonly referenceId?: string;
    readonly language?: string;
}
export interface CharacterRelationship {
    readonly characterId: string;
    readonly kind: RelationshipKind;
    readonly description?: string;
}
export interface CharacterContinuity {
    readonly locked?: readonly AppearanceTraitKey[];
    readonly strength?: ContinuityRequirements['strength'];
}
export interface AppearanceTrait {
    readonly description?: string;
    readonly referenceIds?: readonly string[];
}
export interface AppearanceColors extends AppearanceTrait {
    readonly palette?: readonly string[];
}
export interface AppearanceProfile {
    readonly face?: AppearanceTrait;
    readonly hair?: AppearanceTrait;
    readonly body?: AppearanceTrait;
    readonly wardrobe?: AppearanceTrait;
    readonly accessories?: AppearanceTrait;
    readonly makeup?: AppearanceTrait;
    readonly materials?: AppearanceTrait;
    readonly colors?: AppearanceColors;
    readonly lighting?: AppearanceTrait;
    readonly visualStyle?: AppearanceTrait;
    readonly environment?: AppearanceTrait;
}
export interface ProductionLocation {
    readonly id: string;
    readonly name: string;
    readonly description?: string;
    readonly setting?: LocationSetting;
    readonly appearance?: AppearanceProfile;
    readonly referenceIds?: readonly string[];
    readonly element?: ElementBinding;
}
export interface ProductionObject {
    readonly id: string;
    readonly name: string;
    readonly kind?: ObjectKind;
    readonly description?: string;
    readonly appearance?: AppearanceProfile;
    readonly referenceIds?: readonly string[];
    readonly element?: ElementBinding;
}
export interface ProductionReference {
    readonly id: string;
    readonly kind: AssetKind;
    readonly role?: ReferenceRole;
    readonly assetId?: string;
    readonly element?: ElementBinding;
    readonly description?: string;
}
export interface AudioPlan {
    readonly narrator?: VoiceReference;
    readonly cues: readonly AudioCue[];
}
export interface AudioCue {
    readonly id: string;
    readonly kind: AudioCueKind;
    readonly description: string;
    readonly target: AudioTarget;
    readonly durationSec?: number;
    readonly volume?: number;
    readonly referenceIds?: readonly string[];
}
export type AudioTarget = {
    readonly scope: 'production';
} | {
    readonly scope: 'scenes';
    readonly sceneIds: readonly string[];
} | {
    readonly scope: 'shot';
    readonly shotId: string;
};
export interface GenerationPreferences {
    readonly quality?: ProductionQuality;
    readonly preview?: PreviewPolicy;
}
export interface EditPlan {
    readonly tracks?: readonly EditTrack[];
    readonly subtitles?: SubtitlePlan;
    readonly markers?: readonly EditMarker[];
}
export interface EditTrack {
    readonly kind: EditTrackKind;
    readonly muted?: boolean;
    readonly volume?: number;
}
export interface SubtitlePlan {
    readonly enabled: boolean;
    readonly language?: string;
    readonly position?: SubtitlePosition;
    readonly style?: SubtitleStyle;
}
export interface EditMarker {
    readonly id: string;
    readonly atShotId: string;
    readonly label?: string;
}
export interface ExportPlan {
    readonly targets: readonly ExportTarget[];
}
export interface ExportTarget {
    readonly id: string;
    readonly purpose?: ExportPurpose;
    readonly aspectRatio?: AspectRatio;
    readonly resolution?: ResolutionTarget;
    readonly maxDurationSec?: number;
    readonly subtitleMode?: SubtitleMode;
    readonly context?: FormatPresetId;
}
export interface ProductionMetadata {
    readonly revision: number;
    readonly locale?: string;
    readonly tags?: readonly string[];
}
export interface FilmmakerProduction {
    readonly version: typeof FILMMAKER_MODEL_VERSION;
    readonly id?: string;
    readonly title: string;
    readonly intent: ProductionIntent;
    readonly creativeDirection: CreativeDirection;
    readonly format: ProductionFormat;
    readonly duration: ProductionDuration;
    readonly scenes: readonly ProductionScene[];
    readonly characters: readonly ProductionCharacter[];
    readonly locations: readonly ProductionLocation[];
    readonly objects: readonly ProductionObject[];
    readonly references: readonly ProductionReference[];
    readonly audio: AudioPlan;
    readonly continuity?: ContinuityRule;
    readonly generation: GenerationPreferences;
    readonly editPlan: EditPlan;
    readonly exportPlan: ExportPlan;
    readonly metadata: ProductionMetadata;
}
export const produccionVacia = (p: {
    readonly title: string;
    readonly aspectRatio: AspectRatio;
    readonly id?: string;
    readonly resolution?: ResolutionTarget;
}): FilmmakerProduction => ({
    version: FILMMAKER_MODEL_VERSION,
    ...(p.id !== undefined ? { id: p.id } : {}),
    title: p.title,
    intent: {},
    creativeDirection: {},
    format: { aspectRatio: p.aspectRatio, ...(p.resolution !== undefined ? { resolution: p.resolution } : {}) },
    duration: {},
    scenes: [],
    characters: [],
    locations: [],
    objects: [],
    references: [],
    audio: { cues: [] },
    generation: {},
    editPlan: {},
    exportPlan: { targets: [] },
    metadata: { revision: 0 },
});
export interface UbicacionDePlano {
    readonly scene: ProductionScene;
    readonly shot: ProductionShot;
    readonly sceneIndex: number;
    readonly shotIndex: number;
}
export const buscarEscena = (prod: FilmmakerProduction, sceneId: string): {
    readonly scene: ProductionScene;
    readonly index: number;
} | undefined => {
    const index = prod.scenes.findIndex((s) => s.id === sceneId);
    return index < 0 ? undefined : { scene: prod.scenes[index], index };
};
export const buscarPlano = (prod: FilmmakerProduction, shotId: string): UbicacionDePlano | undefined => {
    for (let i = 0; i < prod.scenes.length; i++) {
        const j = prod.scenes[i].shots.findIndex((s) => s.id === shotId);
        if (j >= 0)
            return { scene: prod.scenes[i], shot: prod.scenes[i].shots[j], sceneIndex: i, shotIndex: j };
    }
    return undefined;
};
export const escenaPorNumero = (prod: FilmmakerProduction, numero: number): ProductionScene | undefined => Number.isInteger(numero) && numero >= 1 ? prod.scenes[numero - 1] : undefined;
export const planoPorNumero = (prod: FilmmakerProduction, numeroDeEscena: number, numeroDePlano: number): ProductionShot | undefined => {
    const escena = escenaPorNumero(prod, numeroDeEscena);
    return escena && Number.isInteger(numeroDePlano) && numeroDePlano >= 1 ? escena.shots[numeroDePlano - 1] : undefined;
};
export interface Unidad {
    readonly unitId: string;
    readonly scene: ProductionScene;
    readonly shot?: ProductionShot;
    readonly sceneIndex: number;
    readonly shotIndex?: number;
}
export const unidades = (prod: FilmmakerProduction): readonly Unidad[] => {
    const salida: Unidad[] = [];
    prod.scenes.forEach((scene, sceneIndex) => {
        if (!scene.shots.length) {
            salida.push({ unitId: scene.id, scene, sceneIndex });
            return;
        }
        scene.shots.forEach((shot, shotIndex) => salida.push({ unitId: shot.id, scene, shot, sceneIndex, shotIndex }));
    });
    return salida;
};
export const idsDeLaProduccion = (prod: FilmmakerProduction): Set<string> => {
    const ids = new Set<string>();
    for (const s of prod.scenes) {
        ids.add(s.id);
        for (const l of s.dialogue ?? [])
            ids.add(l.id);
        for (const p of s.shots) {
            ids.add(p.id);
            for (const l of p.dialogue ?? [])
                ids.add(l.id);
        }
    }
    for (const c of prod.characters)
        ids.add(c.id);
    for (const l of prod.locations)
        ids.add(l.id);
    for (const o of prod.objects)
        ids.add(o.id);
    for (const r of prod.references)
        ids.add(r.id);
    for (const c of prod.audio.cues)
        ids.add(c.id);
    for (const t of prod.exportPlan.targets)
        ids.add(t.id);
    for (const m of prod.editPlan.markers ?? [])
        ids.add(m.id);
    return ids;
};
export const derivarId = (base: string, ocupados: ReadonlySet<string>): string => {
    for (let n = 2;; n++) {
        const sufijo = `-${n}`;
        const candidato = `${base.slice(0, 128 - sufijo.length)}${sufijo}`;
        if (!ocupados.has(candidato))
            return candidato;
    }
};
export const aMs = (sec: number): number => Math.round(sec * 1000);
export const aSec = (ms: number): number => ms / 1000;
export const duracionDeEscenaMs = (scene: ProductionScene): number | undefined => {
    if (scene.shots.length && scene.shots.every((s) => s.durationSec !== undefined)) {
        return scene.shots.reduce((t, s) => t + aMs(s.durationSec as number), 0);
    }
    return scene.durationSec !== undefined ? aMs(scene.durationSec) : undefined;
};
export const duracionTotalMs = (prod: FilmmakerProduction): number | undefined => {
    let total = 0;
    for (const s of prod.scenes) {
        const d = duracionDeEscenaMs(s);
        if (d === undefined)
            return undefined;
        total += d;
    }
    return total;
};
export const duracionDeUnidadMs = (u: Unidad): number | undefined => u.shot ? (u.shot.durationSec !== undefined ? aMs(u.shot.durationSec) : undefined) : duracionDeEscenaMs(u.scene);
export const creativoEfectivo = (prod: FilmmakerProduction, scene: ProductionScene, shot?: ProductionShot): CreativeParameters => {
    const encuadre: CreativeParameters = { version: versionCreativaActual(), framing: { aspectRatio: prod.format.aspectRatio } };
    const heredado = completarCreativos(completarCreativos(shot?.visual?.creative, scene.visual?.creative), prod.creativeDirection.cinematography);
    const efectivo = completarCreativos(heredado, encuadre) as CreativeParameters;
    return efectivo.movement?.type === 'static' && efectivo.movement.speed !== undefined
        ? { ...efectivo, movement: { type: 'static' } }
        : efectivo;
};
export const continuidadEfectiva = (prod: FilmmakerProduction, scene: ProductionScene, shot?: ProductionShot): ContinuityRule | undefined => {
    const niveles = [shot?.continuity, scene.continuity, prod.continuity]
        .filter((c): c is ContinuityRule => c !== undefined);
    if (!niveles.length)
        return undefined;
    const decision = new Map<ContinuityAspect, 'preserve' | 'mayChange'>();
    for (const nivel of niveles) {
        for (const a of nivel.preserve)
            if (!decision.has(a))
                decision.set(a, 'preserve');
        for (const a of nivel.mayChange ?? [])
            if (!decision.has(a))
                decision.set(a, 'mayChange');
    }
    const preserve = ASPECTOS_DE_CONTINUIDAD.filter((a) => decision.get(a) === 'preserve');
    if (!preserve.length)
        return undefined;
    const mayChange = ASPECTOS_DE_CONTINUIDAD.filter((a) => decision.get(a) === 'mayChange');
    const anchors: string[] = [];
    const spatial: EntitySpatialConstraint[] = [];
    const vistas = new Set<string>();
    for (const nivel of niveles) {
        for (const a of nivel.anchors ?? [])
            if (!anchors.includes(a))
                anchors.push(a);
        for (const r of nivel.spatial ?? []) {
            const clave = `${r.subject}|${r.relation}|${r.object}`;
            if (!vistas.has(clave)) {
                vistas.add(clave);
                spatial.push(r);
            }
        }
    }
    const strength = niveles.map((n) => n.strength).find((s) => s !== undefined);
    return {
        preserve,
        ...(mayChange.length ? { mayChange } : {}),
        ...(strength !== undefined ? { strength } : {}),
        ...(anchors.length ? { anchors } : {}),
        ...(spatial.length ? { spatial } : {}),
    };
};
export const estadoEfectivo = (scene: ProductionScene, shot: ProductionShot | undefined, characterId: string): CharacterState | undefined => {
    const deEscena = (scene.characterStates ?? []).find((s) => s.characterId === characterId);
    const dePlano = (shot?.characterStates ?? []).find((s) => s.characterId === characterId);
    if (!deEscena && !dePlano)
        return undefined;
    const wardrobe = dePlano?.wardrobe ?? deEscena?.wardrobe;
    const appearanceNotes = dePlano?.appearanceNotes ?? deEscena?.appearanceNotes;
    return {
        characterId,
        ...(wardrobe !== undefined ? { wardrobe } : {}),
        ...(appearanceNotes !== undefined ? { appearanceNotes } : {}),
    };
};
export const repartoDelPlano = (scene: ProductionScene, shot?: ProductionShot): readonly string[] => shot?.characterIds ?? scene.characterIds ?? [];
export const vozDeLinea = (prod: FilmmakerProduction, line: DialogueLine): VoiceReference | undefined => line.kind === 'narration'
    ? prod.audio.narrator
    : prod.characters.find((c) => c.id === line.characterId)?.voice;
export const idiomaDeLinea = (prod: FilmmakerProduction, line: DialogueLine): string | undefined => line.language ?? prod.metadata.locale;
export const RITMO_DE_HABLA = Object.freeze({ palabrasPorSegundo: 3, caracteresCjkPorSegundo: 6 });
const rango = (desde: number, hasta: number): string => `${String.fromCharCode(desde)}-${String.fromCharCode(hasta)}`;
const CJK = new RegExp(`[${rango(0x3040, 0x30ff)}${rango(0x3400, 0x4dbf)}${rango(0x4e00, 0x9fff)}${rango(0xac00, 0xd7af)}${rango(0xf900, 0xfaff)}]`, 'g');
const PUNTUACION = new RegExp(`[.,;:!?¡¿"'«»“”‘’()[\\]{}…–—\\-_/\\\\*&%$#@+=<>|~^\`${rango(0x3000, 0x303f)}${rango(0xff00, 0xffef)}]`, 'g');
export const estimarHablaSec = (texto: string): number => {
    const cjk = (texto.match(CJK) ?? []).length;
    const palabras = texto.replace(CJK, ' ').split(/\s+/).filter((w) => w.replace(PUNTUACION, '').length > 0).length;
    return palabras / RITMO_DE_HABLA.palabrasPorSegundo + cjk / RITMO_DE_HABLA.caracteresCjkPorSegundo;
};
export const duracionDeLineaMs = (l: DialogueLine): number => aMs(l.estimatedSec !== undefined ? l.estimatedSec : estimarHablaSec(l.text));
export const canonico = (v: unknown): string => {
    if (v === undefined)
        return 'null';
    if (v === null || typeof v !== 'object')
        return JSON.stringify(v);
    if (Array.isArray(v))
        return `[${v.map((x) => (x === undefined ? 'null' : canonico(x))).join(',')}]`;
    const o = v as Record<string, unknown>;
    const claves = Object.keys(o).filter((k) => o[k] !== undefined).sort();
    return `{${claves.map((k) => `${JSON.stringify(k)}:${canonico(o[k])}`).join(',')}}`;
};
export const compararTexto = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
