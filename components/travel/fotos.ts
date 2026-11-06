import type { FotoDeTravel } from '../../constants/travelDemo';

/*
 * LAS FOTOS QUE WEËTRAVEL YA TIENE. No se genera ninguna nueva (cuesta dinero y necesita la autorización del dueño):
 * donde falta una foto propia, la tarjeta lleva el tratamiento sin foto —degradado lila con su icono de línea— y el
 * hueco queda apuntado como «pendiente de foto definitiva» (docs/TRAVEL-WORKPLACE.md).
 */
export const FOTOS: Record<FotoDeTravel, number> = {
  peru: require('../../assets/images/sectores/travel-peru.jpg'),
  grecia: require('../../assets/images/sectores/travel-grecia.jpg'),
  japon: require('../../assets/images/sectores/travel-japon.jpg'),
  francia: require('../../assets/images/sectores/travel-francia.jpg'),
  mascota: require('../../assets/images/sectores/travel-mascota.jpg'),
};

export const fotoDe = (id: FotoDeTravel | null | undefined): number | null => (id ? FOTOS[id] : null);
