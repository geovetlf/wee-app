import type { Post } from '../services/firestoreService';

/*
 * LO QUE EL HOME LE PASA AL WÄLL INMERSIVO AL TOCAR UNA PUBLICACIÓN.
 *
 * El muro del Home ya tiene cargadas sus publicaciones y su cursor. Abrir el Wäll a pantalla completa no debería
 * volver a pedirlas ni perder el sitio: se dejan aquí, en memoria, y el Wäll las recoge una vez. No viajan en los
 * parámetros de la ruta porque una lista de publicaciones no cabe en una URL de la web ni debe quedarse en el estado de
 * la navegación. Si alguien abre el Wäll directamente (o recarga la página), no hay semilla y el Wäll pide su primera
 * página como siempre.
 */

export interface SemillaDelMuro {
  posts: Post[];
  indice: number;
  cursor: unknown;
  hayMas: boolean;
}

let semilla: SemillaDelMuro | null = null;

export const sembrarMuro = (s: SemillaDelMuro): void => {
  semilla = s;
};

/** Devuelve la semilla y la olvida: solo sirve para la apertura que la pidió. */
export const recogerSemilla = (): SemillaDelMuro | null => {
  const s = semilla;
  semilla = null;
  return s;
};
