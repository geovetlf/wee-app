import { StyleSheet, TextStyle } from 'react-native';

/**
 * LA TIPOGRAFÍA DE WEË, EN UN SOLO SITIO.
 *
 * Weë escribe en Inter. Una sola familia en toda la aplicación, con cuatro
 * pesos, y este archivo es el único que sabe cómo se llaman.
 *
 * ─── Por qué hace falta un mapa y no basta con `fontWeight` ──────────────────
 *
 * En la web, el navegador elige la variante correcta de una familia a partir del
 * `font-weight`. En React Native NO: cada peso es una fuente distinta, con su
 * propio nombre, y pedir "Inter" en negrita sin decir cuál es la negrita
 * produce, según la plataforma, o la redonda tal cual o una negrita falsa
 * calculada por el sistema —más gorda, peor espaciada y distinta en cada
 * teléfono—.
 *
 * Por eso el peso no se aplica solo: se traduce a la cara que le corresponde.
 * `familiaDelPeso` es esa traducción, y la hace el envoltorio de `Text` que se
 * instala en `App.tsx`, así que ningún estilo de la aplicación tiene que
 * escribir `fontFamily` a mano ni enterarse de cómo se llaman las variantes.
 *
 * ─── La escala de pesos de Weë ───────────────────────────────────────────────
 *
 *  700  títulos y énfasis fuerte. Poco y bien.
 *  600  nombres, navegación activa, datos importantes.
 *  500  botones, controles y acciones.
 *  400  lectura normal, descripciones y texto secundario.
 *
 * No es una escala decorativa: si demasiadas cosas piden 600 o 700 a la vez, la
 * pantalla deja de tener jerarquía y se vuelve pesada, que es exactamente lo que
 * esta escala evita.
 */

/** Las cuatro caras de Inter, con el nombre con el que quedan registradas. */
export const INTER = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

/**
 * Qué cara de Inter le toca a cada peso.
 *
 * Se aceptan más pesos de los cuatro de la escala porque React Native admite
 * `'normal'`, `'bold'` y los novecientos numéricos, y en una aplicación grande
 * siempre queda alguno suelto: se redondea al más cercano de los que existen en
 * vez de dejarlo sin familia, que es lo que devolvería la fuente del sistema.
 */
export const familiaDelPeso = (peso?: TextStyle['fontWeight']): string => {
  switch (peso) {
    case '100':
    case '200':
    case '300':
    case '400':
    case 'normal':
    case undefined:
      return INTER.regular;
    case '500':
      return INTER.medium;
    case '600':
      return INTER.semibold;
    case '700':
    case '800':
    case '900':
    case 'bold':
      return INTER.bold;
    default:
      return INTER.regular;
  }
};

/**
 * El estilo que hay que añadir a un texto para que use Inter.
 *
 * Devuelve `null` cuando el estilo YA trae una `fontFamily` propia: hay dos
 * sitios en la aplicación que piden monoespaciada a conciencia —el prompt de
 * "Cómo lo hice" y la pantalla de error— y esos no se tocan. Una tipografía
 * única no significa pisar las excepciones que existen por un motivo.
 */
export const estiloInter = (estilo: unknown): { fontFamily: string } | null => {
  const plano = StyleSheet.flatten(estilo as TextStyle) || ({} as TextStyle);
  if (plano.fontFamily) return null;
  return { fontFamily: familiaDelPeso(plano.fontWeight) };
};
