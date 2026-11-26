import { Platform, StyleSheet, TextStyle } from 'react-native';
import { INTER } from '../../constants/typography';
import { scale } from '../../utils/scale';

/*
 * EL ESTILO DE LA FICHA DEL PERSONAJE, EN UN SOLO SITIO.
 *
 * La ficha y su autonomía viven sobre carbón, como el workspace de Filmmaker
 * (Weë Studio): la interfaz se retira y manda lo que la persona escribe. Es un
 * monocromo estricto —negro, carbón, grises y blanco— sin el dorado de Weë:
 * aquí lo elegido y lo que se toca es BLANCO sobre negro, que es lo que hace que
 * la ficha se lea como una pieza exclusiva y no como un formulario.
 *
 * Contraste comprobado sobre `fondo` (#0A0A0B), WCAG 2.1:
 *   texto         #F5F5F7  ≈ 18,2 : 1
 *   secundario    #A1A1AA  ≈  7,7 : 1
 *   tenue         #8A8A93  ≈  5,8 : 1   (nunca por debajo de 4,5 : 1)
 *   sobre la tarjeta (#141416) el tenue queda en ≈ 5,4 : 1; sobre un botón
 *   blanco, el texto `sobreBlanco` da ≈ 19,5 : 1.
 *
 * Solo tokens: ningún componente de `components/personaje/` escribe un color,
 * un tamaño de letra o un radio a mano.
 */

export const COLOR = {
  fondo: '#0A0A0B',
  carbon: '#111113',
  tarjeta: '#141416',
  superficie: '#1A1A1D',
  superficieAlta: '#222226',
  linea: 'rgba(255,255,255,0.08)',
  lineaMedia: 'rgba(255,255,255,0.14)',
  lineaFuerte: 'rgba(255,255,255,0.32)',
  texto: '#F5F5F7',
  textoSecundario: '#A1A1AA',
  textoTenue: '#8A8A93',
  blanco: '#FFFFFF',
  negro: '#000000',
  /** Lo que se escribe sobre un botón o una opción blanca. */
  sobreBlanco: '#0A0A0B',
  velo: 'rgba(255,255,255,0.04)',
} as const;

export const ESPACIO = {
  xxs: scale(2),
  xs: scale(4),
  sm: scale(8),
  md: scale(12),
  lg: scale(16),
  xl: scale(24),
  xxl: scale(32),
  xxxl: scale(48),
} as const;

export const RADIO = {
  sm: scale(8),
  md: scale(12),
  lg: scale(18),
  xl: scale(24),
  pastilla: 999,
} as const;

/** Objetivo táctil mínimo (WCAG 2.5.5 / guías de iOS y Android). */
export const TACTIL = scale(48) < 44 ? 44 : scale(48);

export const ANCHO_MAXIMO = 760;

/** Grosor de línea: fino, nunca más de un píxel. */
export const LINEA = StyleSheet.hairlineWidth > 0.5 ? StyleSheet.hairlineWidth : 1;

const familia = (peso: '400' | '500' | '600' | '700'): string =>
  peso === '700' ? INTER.bold : peso === '600' ? INTER.semibold : peso === '500' ? INTER.medium : INTER.regular;

/*
 * La escala tipográfica. El envoltorio de `Text` de App.tsx ya traduce el peso a
 * la cara de Inter; `fontFamily` se escribe igual porque `TextInput` no pasa por
 * ese envoltorio.
 */
const tipo = (tamano: number, alto: number, peso: '400' | '500' | '600' | '700', espaciado = 0): TextStyle => ({
  fontSize: scale(tamano),
  lineHeight: scale(alto),
  fontWeight: peso,
  fontFamily: familia(peso),
  letterSpacing: scale(espaciado),
});

export const TIPO = {
  /** El nombre del personaje en su tarjeta. */
  display: tipo(30, 36, '700', -0.6),
  titulo: tipo(22, 28, '600', -0.3),
  seccion: tipo(17, 24, '600', -0.2),
  cuerpo: tipo(15, 22, '400'),
  cuerpoFuerte: tipo(15, 22, '500'),
  pequeno: tipo(13, 19, '400'),
  pequenoFuerte: tipo(13, 19, '500'),
  /*
   * Etiquetas pequeñas: números de sección, estados, «obligatorio». SIN
   * mayúsculas ni separación de letras: van sobre texto traducido, y eso rompe
   * las ligaduras del árabe, no existe en la mitad de los idiomas de Weë y
   * convertiría la marca («Perfil Weë») en «PERFIL WEË» (regla 4 de
   * `hooks/useDireccion.ts`). El peso y el tono tenue bastan para distinguirlas.
   */
  rotulo: tipo(12, 16, '600'),
  cifra: tipo(26, 32, '600', -0.4),
  boton: tipo(15, 20, '600', 0.1),
} as const;

/**
 * El campo de texto, igual en todas partes. En la web se quita el contorno del
 * navegador porque el foco se dibuja con `CAMPO_ENFOCADO`.
 */
export const CAMPO: TextStyle = {
  ...TIPO.cuerpo,
  color: COLOR.texto,
  backgroundColor: COLOR.carbon,
  borderWidth: 1,
  borderColor: COLOR.lineaMedia,
  borderRadius: RADIO.md,
  paddingHorizontal: ESPACIO.lg,
  paddingVertical: ESPACIO.md,
  minHeight: TACTIL,
  ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null),
};

/*
 * El campo enfocado: borde de 2 px en blanco (≈ 19,8 : 1 sobre carbón, muy por
 * encima del 3 : 1 que pide WCAG 1.4.11 / 2.4.7). El relleno baja 1 px para
 * que el texto no se mueva al ganar el foco.
 */
export const CAMPO_ENFOCADO: TextStyle = {
  borderWidth: 2,
  borderColor: COLOR.blanco,
  backgroundColor: COLOR.tarjeta,
  paddingHorizontal: ESPACIO.lg - 1,
  paddingVertical: ESPACIO.md - 1,
};
