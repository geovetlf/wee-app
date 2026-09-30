/**
 * EL VISOR 3D DE WEË: lo que comparten la web y la app, sin pantalla.
 *
 * Uno solo, como el reproductor: para la ficha de un personaje, un lugar o un objeto en Filmmaker y para Mis creaciones.
 * Enseña el modelo que DE VERDAD existe —el que dice la dirección que llega— y, si no hay dirección, por qué: nunca un
 * modelo de ejemplo como si fuera suyo.
 */
export interface PropsDelVisor {
  /** La dirección del GLB, o `null` mientras no la hay. */
  readonly url: string | null;
  /** Cómo se llama el modelo, para quien no lo ve. */
  readonly nombre: string;
  /** Buscando todavía la dirección. */
  readonly buscando?: boolean;
  /** Por qué no se puede ver, ya dicho (la entrega sin activar, todavía llegando, retirado…). */
  readonly porque?: string | null;
  /** Alto del lienzo. */
  readonly alto?: number;
}

/**
 * QUÉ SE VE EN EL LIENZO, decidido sin pantalla:
 *
 *   · sin dirección: buscándola (la rueda) o por qué no la hay;
 *   · con dirección, mientras llega el visor o el modelo: la rueda, con cuánto va;
 *   · el modelo que no se pudo abrir: se dice, y se ofrece volver a intentarlo;
 *   · listo: el modelo, y los controles (encuadrar y girar solo).
 */
export type CapaDelVisor = 'buscando' | 'sin_modelo' | 'cargando' | 'error' | 'listo';

export const capaDelVisor = (e: {
  readonly url: string | null;
  readonly buscando?: boolean;
  readonly libreria: 'cargando' | 'lista' | 'fallo';
  readonly modelo: 'cargando' | 'listo' | 'error';
}): CapaDelVisor => {
  if (!e.url) return e.buscando ? 'buscando' : 'sin_modelo';
  if (e.libreria === 'fallo' || e.modelo === 'error') return 'error';
  if (e.libreria === 'cargando' || e.modelo === 'cargando') return 'cargando';
  return 'listo';
};

/** El alto de siempre: en el teléfono cabe entero con sus controles; en el escritorio no se come la hoja. */
export const ALTO_DEL_VISOR = 360;

/** Por qué no se ve un modelo, dicho igual en Filmmaker y en Mis creaciones. */
export const CLAVE_DEL_PORQUE_DEL_MODELO: Readonly<Record<'sin_entrega' | 'llegando' | 'retirado' | 'desconocido', string>> = Object.freeze({
  sin_entrega: 'creaciones.model3dNoDelivery',
  llegando: 'creaciones.model3dArriving',
  retirado: 'creaciones.model3dGone',
  desconocido: 'creaciones.model3dUnknown',
});
