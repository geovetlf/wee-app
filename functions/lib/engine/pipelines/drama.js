"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DRAMA_STAGES = void 0;
exports.buildDramaPlan = buildDramaPlan;
exports.DRAMA_STAGES = [
    'Guion',
    'Escenas',
    'Personajes',
    'Escenarios',
    'Imágenes de referencia',
    'Video por escena',
    'Diálogos',
    'Voces',
    'Música y efectos',
    'Montaje',
    'Subtítulos',
    'Formato vertical',
    'Publicación en Weëls',
];
function buildDramaPlan(goal, options = {}) {
    var _a, _b;
    const scenes = Math.max(1, Math.min(12, (_a = options.scenes) !== null && _a !== void 0 ? _a : 3));
    const durationSec = (_b = options.durationSec) !== null && _b !== void 0 ? _b : 120;
    const perScene = Math.max(4, Math.min(10, Math.round(durationSec / scenes)));
    const steps = [
        { id: 'script', capability: 'script.write', purpose: 'Escribir el guion', input: { kind: 'script', brief: goal, durationSec, quality: 'high' } },
        { id: 'scenes', capability: 'scene.split', purpose: 'Dividir la historia en escenas', dependsOn: ['script'], input: { scenes } },
        { id: 'characters', capability: 'image.reference', purpose: 'Crear los personajes', dependsOn: ['script'], input: { kind: 'characters', quality: 'high' } },
        { id: 'sets', capability: 'image.reference', purpose: 'Crear los escenarios', dependsOn: ['script'], input: { kind: 'sets', quality: 'high' } },
    ];
    const sceneVideos = [];
    const sceneVoices = [];
    for (let i = 1; i <= scenes; i++) {
        steps.push({ id: `scene${i}-ref`, capability: 'image.generate', purpose: `Imagen de referencia de la escena ${i}`, dependsOn: ['scenes', 'characters', 'sets'], input: { scene: i, aspectRatio: '9:16', quality: 'high' } });
        steps.push({ id: `scene${i}-video`, capability: 'video.image_to_video', purpose: `Video de la escena ${i}`, dependsOn: [`scene${i}-ref`], input: { scene: i, durationSec: perScene, aspectRatio: '9:16' } });
        steps.push({ id: `scene${i}-dialogue`, capability: 'text.generate', purpose: `Diálogos de la escena ${i}`, dependsOn: ['scenes'], input: { kind: 'dialogue', scene: i } });
        steps.push({ id: `scene${i}-voice`, capability: 'voice.tts', purpose: `Voces de la escena ${i}`, dependsOn: [`scene${i}-dialogue`], input: { scene: i } });
        sceneVideos.push(`scene${i}-video`);
        sceneVoices.push(`scene${i}-voice`);
    }
    steps.push({ id: 'music', capability: 'music.generate', purpose: 'Componer la música', dependsOn: ['scenes'], input: { durationSec, instrumental: true } });
    steps.push({ id: 'sfx', capability: 'audio.sfx', purpose: 'Efectos de sonido', dependsOn: ['scenes'], input: {} });
    steps.push({ id: 'montage', capability: 'video.montage', purpose: 'Montar la historia', dependsOn: [...sceneVideos, ...sceneVoices, 'music', 'sfx'], input: { durationSec } });
    steps.push({ id: 'subtitles', capability: 'subtitle.generate', purpose: 'Crear los subtítulos', dependsOn: ['montage'], input: { language: 'es' } });
    steps.push({ id: 'vertical', capability: 'video.vertical', purpose: 'Ajustar al formato vertical de Weë', dependsOn: ['montage', 'subtitles'], input: { aspectRatio: '9:16', watermark: 'Weë' } });
    return {
        experience: 'studio',
        goal,
        steps,
        explainToUser: `Voy a escribir el guion, dividirlo en ${scenes} escenas, crear personajes y escenarios, generar el video y las voces de cada escena, ponerle música, montarlo, subtitularlo y dejarlo en formato vertical para Weëls.`,
        publishToWeels: options.publish !== false,
    };
}
//# sourceMappingURL=drama.js.map