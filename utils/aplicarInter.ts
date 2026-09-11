import React from 'react';
import { Text, TextInput } from 'react-native';
import { estiloInter } from '../constants/typography';

/**
 * PONER INTER EN TODA LA APLICACIÓN, DE UNA VEZ.
 *
 * `Text` y `TextInput` de React Native no heredan la fuente de un antepasado
 * como hace la web: cada texto la lleva o no la lleva. En una aplicación con
 * cientos de estilos, escribir `fontFamily` en cada uno es garantía de que
 * alguno se quede fuera y aparezca en la fuente del sistema sin que nadie lo
 * note.
 *
 * Así que se envuelve el `render` de los dos componentes UNA vez, al arrancar:
 * cada texto sale con la cara de Inter que le corresponde a su `fontWeight`, sin
 * que ningún estilo de la aplicación tenga que cambiar ni saber nada.
 *
 * Detalles que importan:
 *
 * · Se toca lo que ENTRA, no lo que sale. La primera versión de esto cambiaba el
 *   elemento ya pintado y no servía de nada: para entonces el estilo de React
 *   Native ya está convertido —en web, a clases CSS—, y añadirle uno nuevo llega
 *   tarde. Añadiéndolo a las props, el componente lo procesa como cualquier otro
 *   estilo suyo, igual en móvil que en navegador.
 *
 * · El estilo de Inter va DELANTE del que trae el texto. Así, si algún día un
 *   componente quiere otra fuente, la suya gana —y de hecho gana hoy: `estiloInter`
 *   devuelve `null` si ya hay `fontFamily`, y las dos pantallas que piden
 *   monoespaciada a propósito siguen en monoespaciada—.
 *
 * · Se marca el componente para no envolverlo dos veces. En desarrollo el módulo
 *   puede recargarse en caliente y encadenar envoltorios sería un `render` más
 *   por recarga.
 *
 * · Si una versión de React Native dejara de exponer `render`, no se rompe nada:
 *   se devuelve `false` y la aplicación sigue funcionando con la fuente del
 *   sistema. Prefiero una tipografía equivocada a una pantalla en blanco.
 */

type ConRender = {
  render?: (...args: unknown[]) => React.ReactElement;
  type?: ConRender;
  __weeInter?: boolean;
};

const envolver = (componente: unknown): boolean => {
  let objetivo = componente as ConRender;
  /* `forwardRef` expone `render`; si viene envuelto en `memo`, está un nivel dentro. */
  if (objetivo && typeof objetivo.render !== 'function' && objetivo.type) objetivo = objetivo.type;
  if (!objetivo || typeof objetivo.render !== 'function') return false;
  if (objetivo.__weeInter) return true;

  const original = objetivo.render;
  objetivo.render = function (...args: unknown[]) {
    const props = args[0] as { style?: unknown } | undefined;
    const inter = estiloInter(props?.style);
    if (inter) args[0] = { ...props, style: [inter, props?.style] };
    return original.apply(this, args);
  };
  objetivo.__weeInter = true;
  return true;
};

/** Instala Inter en `Text` y `TextInput`. Devuelve si los dos quedaron puestos. */
export const aplicarInter = (): boolean => {
  const texto = envolver(Text);
  const campo = envolver(TextInput);
  return texto && campo;
};
