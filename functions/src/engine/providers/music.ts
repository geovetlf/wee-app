import { ProviderAdapter } from '../types';
import { ProviderError } from '../http';

/**
 * Música: hueco preparado, sin proveedor real todavía.
 *
 * Decisión de producto: Weë NO depende de Suno mientras no exista una API
 * oficial con licencia comercial adecuada. Cuando haya un proveedor con API
 * oficial y licencia clara, se añade aquí un adaptador (music.generate,
 * audio.sfx) y se activa en aiProviders/{id}; mientras tanto el router cae al
 * modo demo para música.
 */
export const musicPlaceholderAdapter: ProviderAdapter = {
  id: 'music-pending',
  name: 'Música (proveedor pendiente)',
  modalities: ['music'],
  models: [],
  isConfigured: () => false,
  supports: (capability) => capability === 'music.generate' || capability === 'audio.sfx',
  async run() {
    throw new ProviderError('Todavía no hay un proveedor de música con API oficial y licencia comercial', 'music-pending', undefined, false);
  },
};
