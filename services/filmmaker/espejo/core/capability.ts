// GENERADO por scripts/espejo-filmmaker.mjs desde functions/src/core/capability.ts: no se edita a mano, se regenera.
import { CAPABILITY_CONTRACT_VERSION } from './contracts';
export type CapabilityId = 'text.generate' | 'text.structure' | 'text.search' | 'image.generate' | 'image.edit' | 'image.background_remove' | 'image.upscale' | 'image.object_remove' | 'image.identity_edit' | 'image.space_restyle' | 'image.try_on' | 'vision.describe' | 'video.generate' | 'video.image_to_video' | 'video.reference' | 'video.compose' | 'voice.tts' | 'music.generate' | 'doc.render' | 'script.write' | 'scene.split' | 'subtitle.generate' | 'image.reference' | 'video.montage' | 'video.vertical' | 'audio.sfx' | 'audio.transcribe' | 'doc.read';
export type Modality = 'text' | 'vision' | 'image' | 'video' | 'voice' | 'music' | 'doc';
export type CapabilityStatus = 'SUPPORTED' | 'PENDING' | 'UNSUPPORTED' | 'DEPRECATED';
export interface CapabilityIO {
    accepts: readonly Modality[];
    produces: Modality;
    acceptsReferences?: boolean;
}
export interface CapabilityDefinition {
    id: CapabilityId;
    contract: typeof CAPABILITY_CONTRACT_VERSION;
    family: string;
    io: CapabilityIO;
    status: CapabilityStatus;
    note?: string;
}
export const familiaDe = (capability: CapabilityId): string => capability.split('.')[0];
const MODALIDAD_EXACTA: Partial<Record<CapabilityId, Modality>> = {
    'audio.transcribe': 'voice',
    'doc.read': 'vision',
};
const MODALIDAD_DE_FAMILIA: Record<string, Modality> = {
    text: 'text',
    vision: 'vision',
    image: 'image',
    video: 'video',
    voice: 'voice',
    music: 'music',
    doc: 'doc',
    script: 'text',
    scene: 'text',
    subtitle: 'text',
    audio: 'music',
};
export const modalidadDe = (capability: CapabilityId): Modality => MODALIDAD_EXACTA[capability] || MODALIDAD_DE_FAMILIA[familiaDe(capability)] || 'text';
export interface CapabilityRegistry {
    get(id: CapabilityId): CapabilityDefinition | undefined;
    all(): readonly CapabilityDefinition[];
    disponibles(): readonly CapabilityDefinition[];
    queAceptan(modalidad: Modality): readonly CapabilityDefinition[];
}
export const crearRegistroDeCapacidades = (definiciones: readonly CapabilityDefinition[]): CapabilityRegistry => {
    const porId = new Map<CapabilityId, CapabilityDefinition>();
    for (const d of definiciones)
        porId.set(d.id, d);
    const todas = [...porId.values()];
    return {
        get: (id) => porId.get(id),
        all: () => todas,
        disponibles: () => todas.filter((d) => d.status === 'SUPPORTED'),
        queAceptan: (modalidad) => todas.filter((d) => d.io.accepts.includes(modalidad)),
    };
};
