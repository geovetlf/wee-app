import { mockProvider as legacyMock } from '../../gateway/providers/mock';
import { CapabilityId } from '../../creator/types';
import { ModelSpec, ProviderAdapter, ProviderResult, ProviderRunRequest } from '../types';

/**
 * Proveedor de prueba (modo demo). Atiende cualquier capacidad sin llamar a
 * ninguna API: es el último eslabón de todas las cadenas mientras no haya
 * proveedores reales configurados. Reutiliza la implementación de la fase 0.
 */
const ALL: CapabilityId[] = [
  'text.generate', 'text.structure', 'text.search', 'image.generate', 'image.edit', 'image.background_remove', 'image.upscale',
  'image.object_remove', 'image.identity_edit', 'image.space_restyle', 'image.reference', 'vision.describe',
  'video.generate', 'video.image_to_video', 'video.compose', 'video.montage', 'video.vertical', 'voice.tts',
  'music.generate', 'audio.sfx', 'doc.render', 'script.write', 'scene.split', 'subtitle.generate',
];

const MODEL: ModelSpec = {
  id: 'demo',
  provider: 'mock',
  capabilities: ALL,
  quality: 1,
  speed: 5,
  cost: { unit: 'call', usd: 0 },
  verified: true,
  note: 'Resultados de muestra sin coste; nunca en producción con proveedores reales activos.',
};

export const mockAdapter: ProviderAdapter = {
  id: 'mock',
  name: 'Modo demo (sin IA real)',
  modalities: ['text', 'vision', 'image', 'video', 'voice', 'music', 'doc'],
  models: [MODEL],
  isConfigured: () => true,
  supports: () => true,
  async run(request: ProviderRunRequest): Promise<ProviderResult> {
    const { ctx } = request;
    const result = await legacyMock.run(request.capability as any, request.input, {
      userId: ctx.userId,
      jobId: ctx.jobId || '',
      experienceId: ctx.experienceId || 'brain',
      goal: ctx.goal || String(request.input.prompt ?? ''),
    });
    return { ...result, model: MODEL.id };
  },
};
