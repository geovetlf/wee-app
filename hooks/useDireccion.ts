import { useMemo } from 'react';
import { useIdioma } from '../contexts/IdiomaContext';

/**
 * EN QUÉ SENTIDO SE LEE LA INTERFAZ — la costura de los componentes.
 *
 *     IDIOMA ≠ DIRECCIÓN ESCRITA A MANO
 *
 * La dirección es un DATO del idioma: vive en el catálogo (`i18n/idiomas.ts`,
 * campo `direccion`), la deriva `direccionDe(codigo)` y la entrega el contexto
 * de idioma. El árabe ya está declarado ahí como `rtl`, sin diccionario todavía.
 * Un componente no pregunta «¿es árabe?»: pregunta «¿en qué sentido se lee?», y
 * por eso añadir hebreo, persa o urdu no toca ningún componente.
 *
 * Esto NO activa nada global. No llama a `I18nManager.forceRTL` ni cambia el
 * `dir` de la página: hoy ningún idioma listo es RTL, así que devuelve `ltr`
 * siempre y nada cambia en pantalla. Lo que hace es que un componente escrito
 * con esta costura YA esté bien el día que el árabe llegue.
 *
 * ── Las cuatro reglas para un componente nuevo ──────────────────────────────
 *
 *  1. `contenedor` en su raíz: fija el sentido del layout de todo lo de dentro.
 *     Las filas (`flexDirection: 'row'`) se invierten solas; no hay que escribir
 *     `row-reverse` en ningún sitio.
 *  2. `texto` en los `Text` que lleven frases traducidas.
 *  3. Nada de `marginLeft`, `paddingRight`, `left:`, `right:` ni
 *     `textAlign: 'left'`: o es simétrico, o es `Start` / `End`.
 *  4. Nada de `letterSpacing` ni `textTransform: 'uppercase'` sobre texto
 *     traducido: separar letras rompe la escritura árabe, que va ligada, y las
 *     mayúsculas no existen en la mitad de los idiomas de Weë.
 *
 * Una sexta para lo que va en `position: 'absolute'`: `alInicio(v)` / `alFinal(v)`.
 * En React Native Web, `start`/`end` absolutos se resuelven con I18nManager —que
 * en la web es siempre LTR— y no con el sentido del contenedor, así que una pieza
 * con `end: 0` se quedaría a la derecha aunque la fila se invierta. Estas dos
 * devuelven el lado físico (`left`/`right`) que toca según la dirección.
 *
 * Y una quinta para cuando haga falta: un icono que SEÑALA (una flecha de
 * volver, un cheurón de «siguiente») se refleja. Para los Ionicons se usa
 * `components/IconoDireccional.tsx`, que aplica `espejo` solo a los nombres
 * direccionales; para una flecha escrita en un texto, `flecha.adelante` /
 * `flecha.siguiente`. Uno que no señala (una bandera, un corazón, un visto) no
 * se toca.
 */
export type Direccion = 'ltr' | 'rtl';

export interface EstilosDeDireccion {
  direccion: Direccion;
  esRTL: boolean;
  /** Para la raíz del componente. */
  contenedor: { direction: Direccion };
  /** Para los `Text` con frases traducidas. */
  texto: { writingDirection: Direccion };
  /** Para los iconos que señalan un sentido. Vacío en LTR. */
  espejo: { transform: { scaleX: number }[] };
  /** Pega una pieza absoluta al principio de la línea (derecha en RTL). */
  alInicio: (valor: Distancia) => LadoFisico;
  /** Pega una pieza absoluta al final de la línea (izquierda en RTL). */
  alFinal: (valor: Distancia) => LadoFisico;
  /**
   * Las flechas que van ESCRITAS dentro de un texto («Ver todos →», «Weë AI ›»).
   * Un glifo no se refleja con `transform` sin arrastrar las letras de al lado, y
   * ← → ‹ › no son caracteres que el navegador espeje solo, así que se elige el
   * glifo que señala hacia delante en el sentido de lectura.
   */
  flecha: { adelante: '→' | '←'; siguiente: '›' | '‹' };
}

export type Distancia = number | `${number}%`;
export type LadoFisico = { left?: Distancia; right?: Distancia };

/** Pura, para poder probarla sin React: de una dirección a los estilos que la aplican. */
export const estilosDeDireccion = (direccion: Direccion): EstilosDeDireccion => {
  const esRTL = direccion === 'rtl';
  return Object.freeze({
    direccion,
    esRTL,
    contenedor: Object.freeze({ direction: direccion }),
    texto: Object.freeze({ writingDirection: direccion }),
    espejo: Object.freeze({ transform: esRTL ? [{ scaleX: -1 }] : [] }),
    alInicio: (valor: Distancia): LadoFisico => (esRTL ? { right: valor } : { left: valor }),
    alFinal: (valor: Distancia): LadoFisico => (esRTL ? { left: valor } : { right: valor }),
    flecha: Object.freeze(esRTL ? { adelante: '←' as const, siguiente: '‹' as const } : { adelante: '→' as const, siguiente: '›' as const }),
  });
};

export const useDireccion = (): EstilosDeDireccion => {
  const { direccion } = useIdioma();
  return useMemo(() => estilosDeDireccion(direccion), [direccion]);
};
