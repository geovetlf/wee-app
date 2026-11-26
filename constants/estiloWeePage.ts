/**
 * EL ESTILO DE LAS WEË PAGES: la pared negra de museo (boceto aprobado por el dueño, 2026-11-23).
 *
 * Una Weë Page es SIEMPRE negra, con el Perfil Real y con el Perfil Weë, como WeëAI: la obra manda y la interfaz se
 * aparta. Las superficies se separan por TONO, no por bordes; lo elegido se dice INVIRTIENDO (tinta de fondo, negro de
 * texto). Un solo acento, el degradado de `MARCA`, y solo en la acción principal («Seguir», «Publicar»). Cada página
 * tiene además su «color de obra» (`COLORES_DE_OBRA` en constants/pageTypes.ts): filete del índice y separador.
 *
 * Dos voces tipográficas: la OBRA en EB Garamond (`hooks/useFuenteDeObra.ts`) y la INTERFAZ en Manrope, la de WeëAI.
 * Nada de colores sueltos en las pantallas: se leen de aquí.
 */
import type { TextStyle } from 'react-native';
import { FAMILIA_WEEAI } from './estiloWeeAi';

export const PALETA_WEEPAGE = {
  /** La pared. */
  n0: '#050505',
  /** Bandas elevadas, tarjetas grandes. */
  n1: '#0B0B0C',
  /** Superficie: controles, tarjetas, filas. */
  n2: '#121214',
  /** Superficie alta: pulsado. */
  n3: '#1A1A1D',
  /** Filete visible: casillas, interruptores apagados. */
  n4: '#26262A',
  /** Separadores finos: tinta al 8 %. */
  linea: 'rgba(243,241,236,0.08)',
  /** Blanco papel, nunca #FFF puro. */
  tinta: '#F3F1EC',
  t2: '#A9A59D',
  t3: '#8C887F',
  /** El párrafo de obra, un punto más cálido que la tinta secundaria. */
  obraTexto: '#E2DED6',
  /** La etiqueta del tipo sobre la portada: un papel tostado que se lee sobre cualquier imagen velada. */
  etiquetaSobrePortada: '#CDB79A',
  /** Texto secundario sobre lo elegido (fondo de tinta). */
  sobreTintaSuave: '#4A4740',
  /** Un aviso de error sobre la pared (enlace que no vale): coral, legible sobre negro. */
  error: '#E8897B',
  /** Texto sobre el degradado de marca. */
  sobreMarca: '#1F2937',
  /** El velo que funde la portada con la pared. */
  velo: 'rgba(5,5,5,0)',
} as const;

export const RADIO_WEEPAGE = { control: 12, tarjeta: 16, hoja: 28, pastilla: 999 } as const;

/** La interfaz habla en Manrope (400/500/600). Sin la familia cargada, el peso equivalente de la fuente del sistema. */
export const interfazWeePage = (tamano: number, peso: '400' | '500' | '600' = '400'): TextStyle => {
  const base: TextStyle = { fontSize: tamano, lineHeight: Math.round(tamano * 1.45) };
  return FAMILIA_WEEAI ? { ...base, fontFamily: FAMILIA_WEEAI[peso] } : { ...base, fontWeight: peso };
};

/** La etiqueta en versalitas del boceto («LIBRO · NOVELA»). En escrituras sin mayúsculas no cambia nada. */
export const ETIQUETA_WEEPAGE: TextStyle = { ...interfazWeePage(11, '500'), letterSpacing: 1.6, textTransform: 'uppercase', color: PALETA_WEEPAGE.t3 };
