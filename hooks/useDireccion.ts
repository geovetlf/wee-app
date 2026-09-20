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
 * Y una quinta para cuando haga falta: un icono que SEÑALA (una flecha de
 * volver, un cheurón de «siguiente») se refleja con `espejo`. Uno que no señala
 * (una bandera, un corazón, un visto) no se toca.
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
}

/** Pura, para poder probarla sin React: de una dirección a los estilos que la aplican. */
export const estilosDeDireccion = (direccion: Direccion): EstilosDeDireccion => {
  const esRTL = direccion === 'rtl';
  return Object.freeze({
    direccion,
    esRTL,
    contenedor: Object.freeze({ direction: direccion }),
    texto: Object.freeze({ writingDirection: direccion }),
    espejo: Object.freeze({ transform: esRTL ? [{ scaleX: -1 }] : [] }),
  });
};

export const useDireccion = (): EstilosDeDireccion => {
  const { direccion } = useIdioma();
  return useMemo(() => estilosDeDireccion(direccion), [direccion]);
};
