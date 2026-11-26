import { MARCA } from '../../constants/marca';

/*
 * LA PALETA DE WEËTRAVEL (dirección aprobada por el dueño, 2026-11-06).
 *
 * El morado eléctrico es la identidad de Travel; el dorado queda solo para lo que es de Weë —el logo, la píldora de
 * Credits y la llamada «Planear con IA»—. Fondo blanco, tinta azul noche, bordes discretos y sombras muy suaves.
 */
export const TRAVEL = {
  morado: '#7200FF',
  moradoVivo: '#8500F5',
  lila: '#EEDFFF',
  lilaSuave: '#F7F0FF',
  tinta: '#14112B',
  texto: '#3F3A52',
  gris: '#6B6680',
  borde: '#ECE6F5',
  fondo: '#FFFFFF',
  dorado: MARCA.primarioClaro,
  doradoTinta: MARCA.sobrePrimario,
  exito: '#14874B',
  aviso: '#B45309',
  peligro: '#C42B3B',
  /* Los tonos de las tarjetas sin foto: el degradado lila con su icono de línea. */
  sinFoto: ['#EEDFFF', '#D9C2FF'] as [string, string],
} as const;

/** La sombra muy suave de las tarjetas de Travel (la misma en iOS, Android y web). */
export const SOMBRA_SUAVE = {
  shadowColor: '#3B1A80',
  shadowOpacity: 0.08,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
} as const;

/*
 * CADA MÓDULO, SU IDENTIDAD (petición del dueño, 2026-11-06): el sistema es común —blanco, tinta azul noche, bordes
 * discretos— y cada una de las seis experiencias lleva su propio tono para que se reconozca de un vistazo.
 */
export const TONO_DE_MODULO = {
  descubrir: { fuerte: '#7200FF', suave: '#F3EAFF', medio: '#E2CCFF' },
  planear: { fuerte: '#2F5BEA', suave: '#EAF0FF', medio: '#C9D7FF' },
  viajes: { fuerte: '#0E8F86', suave: '#E3F6F4', medio: '#BDE9E4' },
  explorar: { fuerte: '#1F8F4E', suave: '#E6F5EC', medio: '#C2E8D1' },
  asistente: { fuerte: '#B21FC9', suave: '#FAE8FD', medio: '#F0C8F7' },
  comunidad: { fuerte: '#D9480F', suave: '#FFEFE6', medio: '#FFD3BD' },
} as const;
