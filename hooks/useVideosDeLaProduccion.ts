import { useEffect, useState } from 'react';
import { tomaService } from '../services/tomaService';
import type { VideoDelPlano } from '../utils/controladorDeToma';

/**
 * WEË FILMMAKER · EL VÍDEO DE CADA PLANO DEL STORYBOARD (F1-D, tras el canary real).
 *
 * La tarjeta del plano decía «Sin vista previa» aunque su vídeo estaba listo:
 * el resultado vive en el plano del Core y la tarjeta pinta la producción de
 * F1-A, y lo que une una cosa con la otra solo lo calcula el servidor. Esto le
 * pregunta qué plano tiene puesto qué material (`shots`, `shot.videos`) y lee la
 * dirección de cada uno con la regla de siempre de Mis creaciones.
 *
 * Se vuelve a preguntar cuando cambia la producción o cuando `refresco` cambia
 * —el vídeo que acaba de ponerse en el plano elegido—. Sin relojes. Si no se
 * puede preguntar, no hay vídeos: la tarjeta sigue diciendo que no tiene vista previa.
 */
export const useVideosDeLaProduccion = (productionId: string | null, refresco: string | null): ReadonlyMap<string, VideoDelPlano> => {
  const [videos, setVideos] = useState<ReadonlyMap<string, VideoDelPlano>>(() => new Map());
  useEffect(() => {
    let vigente = true;
    if (!productionId) {
      setVideos(new Map());
      return () => { vigente = false; };
    }
    void (async () => {
      const lista = await tomaService.videosDeLaProduccion(productionId);
      const conDireccion = await Promise.all(lista.map(async (v) => [v.unitId, { assetId: v.producedAssetId, url: await tomaService.urlDelMaterial(v.producedAssetId) }] as const));
      if (vigente) setVideos(new Map(conDireccion));
    })();
    return () => { vigente = false; };
  }, [productionId, refresco]);
  return videos;
};
