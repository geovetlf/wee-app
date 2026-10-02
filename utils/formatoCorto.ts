import { formatearFecha, formatearNumero, formatearTiempoRelativo } from '../i18n/formato';

/*
 * LAS DOS FORMAS CORTAS DEL MURO: cuándo fue y cuánto lleva.
 *
 * Vivían en `data/mockData.ts`, el archivo de la maqueta con usuarios y
 * publicaciones inventados, y de ahí las importaban el muro, el detalle, los
 * Weëls, la bandeja y los perfiles: código de producción colgando de datos de
 * mentira. Se mudaron aquí tal cual —mismas firmas, mismo comportamiento— y la
 * maqueta, que ya no usaba nadie, se retiró.
 */

/**
 * CUÁNDO FUE, DICHO COMO LO DIRÍA EL IDIOMA DE QUIEN LO LEE.
 *
 * Antes eran cuatro `if` con sus frases en español y una fecha clavada a
 * `es-ES`: en inglés se leía "hace 2h" bajo el nombre de quien publicó. Las
 * reglas de cada idioma —cuándo se dice "ayer", cómo se abrevia una hora, dónde
 * va el número— las sabe `Intl` y vienen en el motor.
 *
 * LOS DOS TRAMOS SE CONSERVAN, que son una decisión de producto y no de idioma:
 * hasta una semana se dice cuánto hace; a partir de ahí, la fecha. Y el estilo
 * sigue siendo el corto —"hace 2 h", "2h ago"—, porque la hora de una
 * publicación vive en una línea estrecha al lado del nombre.
 *
 * El `locale` entra por parámetro: esto se importa fuera de React y no sabe
 * quién está mirando. Y `ahora` también, para que una prueba no dependa del reloj.
 */
export const getRelativeTime = (date: Date, locale: string, ahora: number = Date.now()): string => {
  const diffDias = Math.floor((ahora - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDias >= 7) return formatearFecha(date, locale, { month: 'short', day: 'numeric' });
  return formatearTiempoRelativo(date, locale, ahora, { style: 'narrow' });
};

/**
 * LOS CONTADORES ABREVIADOS (me gusta, comentarios, vistas, miembros…), como los escribe cada idioma.
 *
 * Antes salían «12.4k» en todos los idiomas: con la coma decimal del inglés y su «k». En danés o en alemán, donde
 * el punto separa los miles, «12.4k» se lee mal. Con el `locale`, `Intl` escribe la forma corta de cada idioma
 * («12,4 t», «12,4 mil», «12.4K», «1,2万») y la cifra pequeña con su separador. Sin `locale` —quien todavía no lo
 * pase— se comporta como siempre.
 */
export const formatNumber = (num: number | undefined | null, locale?: string): string => {
  if (locale) return formatearNumero(num == null || isNaN(num) ? 0 : num, locale, { notation: 'compact', maximumFractionDigits: 1 });
  if (num == null || isNaN(num)) return '0';
  if (num < 1000) return num.toString();
  if (num < 1000000) return `${(num / 1000).toFixed(1)}k`;
  return `${(num / 1000000).toFixed(1)}M`;
};
