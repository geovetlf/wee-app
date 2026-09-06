import { Plan, PlanStep } from '../../creator/types';

/**
 * AI DRAMA — blueprint (todavía sin interfaz).
 *
 * "Quiero una historia de 2 minutos sobre un detective que descubre que su
 * propio avatar es otra versión de él." → WEË AI ENGINE coordina:
 *
 *  1. Guion                     script.write
 *  2. División en escenas       scene.split
 *  3. Personajes                image.reference (una hoja de personaje por protagonista)
 *  4. Escenarios                image.reference
 *  5. Imágenes de referencia    image.generate por escena (coherentes con 3 y 4)
 *  6. Video de cada escena      video.image_to_video (o video.generate)
 *  7. Diálogos                  text.generate por escena
 *  8. Voces                     voice.tts por escena
 *  9. Música y efectos          music.generate + audio.sfx
 * 10. Montaje final             video.montage
 * 11. Subtítulos                subtitle.generate
 * 12. Formato vertical Weë      video.vertical
 * 13. Publicación en Weëls      acción de Weë (no es una capacidad de IA)
 *
 * El plan usa el mismo motor de pasos con dependencias que hoy ejecuta
 * creatorRun; cada capacidad la resuelve el router con el mejor proveedor.
 * Lo único que falta para activarlo es (a) el proveedor de montaje/subtítulos/
 * formato vertical (un "render" propio con ffmpeg) y (b) que scene.split
 * expanda dinámicamente el número de escenas. Mientras tanto, el blueprint
 * fija N escenas y sirve para probar en modo demo.
 */
export interface DramaOptions {
  scenes?: number;
  /** Duración total deseada en segundos (2 min = 120). */
  durationSec?: number;
  /** Publicar automáticamente en Weëls al terminar. */
  publish?: boolean;
}

export const DRAMA_STAGES = [
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
] as const;

export function buildDramaPlan(goal: string, options: DramaOptions = {}): Plan & { publishToWeels: boolean } {
  const scenes = Math.max(1, Math.min(12, options.scenes ?? 3));
  const durationSec = options.durationSec ?? 120;
  const perScene = Math.max(4, Math.min(10, Math.round(durationSec / scenes)));
  const steps: PlanStep[] = [
    { id: 'script', capability: 'script.write', purpose: 'Escribir el guion', input: { kind: 'script', brief: goal, durationSec, quality: 'high' } },
    { id: 'scenes', capability: 'scene.split', purpose: 'Dividir la historia en escenas', dependsOn: ['script'], input: { scenes } },
    { id: 'characters', capability: 'image.reference', purpose: 'Crear los personajes', dependsOn: ['script'], input: { kind: 'characters', quality: 'high' } },
    { id: 'sets', capability: 'image.reference', purpose: 'Crear los escenarios', dependsOn: ['script'], input: { kind: 'sets', quality: 'high' } },
  ];
  const sceneVideos: string[] = [];
  const sceneVoices: string[] = [];
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
