import { CapabilityId } from '../creator/types';
import { modalityOf } from './types';

/**
 * Lo que ve la persona mientras Weë trabaja. Nunca el nombre de un proveedor
 * ni de un modelo: "Generando tu Weël…", "Creando tu imagen…".
 */
export function progressTextFor(capability: CapabilityId, purpose?: string): string {
  const modality = modalityOf(capability);
  switch (modality) {
    case 'video':
      return capability === 'video.vertical' ? 'Ajustando tu Weël al formato vertical…' : capability === 'video.montage' || capability === 'video.compose' ? 'Montando tu Weël…' : 'Generando tu Weël…';
    case 'image':
      return purpose ? `${purpose}…` : 'Creando tu imagen…';
    case 'voice':
      return 'Grabando la voz…';
    case 'music':
      return capability === 'audio.sfx' ? 'Añadiendo efectos de sonido…' : 'Componiendo la música…';
    case 'vision':
      return 'Mirando tu foto…';
    case 'doc':
      return 'Preparando tu documento…';
    default:
      if (capability === 'script.write') return 'Escribiendo el guion…';
      if (capability === 'scene.split') return 'Dividiendo la historia en escenas…';
      if (capability === 'subtitle.generate') return 'Creando los subtítulos…';
      return purpose ? `${purpose}…` : 'Escribiendo…';
  }
}

/** Mensaje amable cuando ningún proveedor pudo atender. */
export const friendlyFailure = (capability: CapabilityId): string => {
  const modality = modalityOf(capability);
  if (modality === 'video') return 'No pude generar el video esta vez. No te cobré: inténtalo de nuevo en un momento.';
  if (modality === 'image') return 'No pude crear la imagen esta vez. No te cobré: inténtalo de nuevo en un momento.';
  return 'No me salió bien esta vez. No te cobré: inténtalo de nuevo en un momento.';
};
