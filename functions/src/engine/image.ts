import { CapabilityId } from '../creator/types';
import { ADAPTERS } from './registry';
import { ImageChoice, chooseImageModel, imageOptionsFor } from './imageModels';
import { RoutingPrefs } from './types';

/**
 * WEË IMAGE ENGINE (docs/AI-ENGINE.md §Imagen).
 *
 *   Weë → Weë AI Gateway → adaptador del proveedor → API oficial → modelo
 *
 * Las secciones piden una capacidad y dicen qué necesitan; aquí se elige el
 * modelo **más barato capaz de hacerlo** y se fija en las preferencias del
 * router. Cambiar de modelo o de proveedor es cambiar la escalera de
 * engine/imageModels.ts, no ninguna sección.
 */

/** Solo se ofrece lo que se puede servir: proveedor con clave configurada. */
export const providerReady = (provider: string): boolean => {
  const adapter = ADAPTERS[provider];
  return !!adapter && adapter.isConfigured();
};

export interface ImageRequest {
  capability: CapabilityId;
  input: Record<string, unknown>;
  /** Modelo concreto si la persona eligió una opción superior. */
  modelId?: string;
}

/** Elige el modelo y devuelve las preferencias con las que el router debe ejecutar. */
export function planImage(request: ImageRequest, requireReady = true): { choice: ImageChoice; prefs: RoutingPrefs; input: Record<string, unknown> } {
  const input = request.input || {};
  const references = Array.isArray(input.referenceImages) ? input.referenceImages.length : input.imageUrl ? 1 : 0;
  const need = {
    capability: request.capability,
    kind: typeof input.kind === 'string' ? input.kind : undefined,
    quality: typeof input.quality === 'string' ? input.quality : undefined,
    resolution: typeof input.resolution === 'string' ? input.resolution : undefined,
    references,
  };
  const available = requireReady ? providerReady : undefined;
  const choice = request.modelId
    ? chooseImageModel({ ...need, quality: undefined }, available)
    : chooseImageModel(need, available);

  const prefs: RoutingPrefs = {
    quality: choice.tier === 'max' ? 'max' : choice.tier === 'high' ? 'high' : 'standard',
    allowedProviders: [choice.model.provider],
    modelId: choice.model.modelId,
  };
  // La resolución elegida viaja con el input para que el adaptador la aplique.
  // Va marcada como decisión del motor: al recalcular el precio no debe leerse
  // como si la persona hubiera pedido más resolución y subir el nivel comercial.
  return { choice, prefs, input: { ...input, resolution: choice.size, resolutionFromEngine: true } };
}

/** Opciones que se le pueden mostrar a la persona antes de generar. */
export function imageChoicesFor(capability: CapabilityId, input: Record<string, unknown>, requireReady = true): ImageChoice[] {
  const references = Array.isArray(input.referenceImages) ? input.referenceImages.length : input.imageUrl ? 1 : 0;
  return imageOptionsFor(
    {
      capability,
      kind: typeof input.kind === 'string' ? input.kind : undefined,
      resolution: typeof input.resolution === 'string' ? input.resolution : undefined,
      references,
    },
    requireReady ? providerReady : undefined
  );
}
