import React from 'react';
import { Text, TextProps } from 'react-native';
import { useIdioma } from '../contexts/IdiomaContext';
import { sinEspaciadoSiSeUne } from '../i18n/caja';

/*
 * UN RÓTULO EN MAYÚSCULAS, CON LAS REGLAS DEL IDIOMA.
 *
 * `textTransform: 'uppercase'` no vale para todos los idiomas: en iOS pasa el
 * texto a mayúsculas sin locale, y en turco la mayúscula de «i» es «İ» —«STİL»,
 * no «STIL»—. Aquí la pone `toLocaleUpperCase` con el locale de la interfaz, en
 * la web y en el teléfono por igual. El diseño no cambia: es el mismo rótulo.
 *
 * Y sin espaciado entre letras cuando el texto es de una escritura cuyas letras
 * se unen (devanagari, árabe): ahí el espaciado parte la palabra.
 */
const TextoEnMayusculas: React.FC<Omit<TextProps, 'children'> & { children: string }> = ({ children, ...props }) => {
  const { locale } = useIdioma();
  return <Text {...props} style={[props.style, sinEspaciadoSiSeUne(children)]}>{children.toLocaleUpperCase(locale)}</Text>;
};

export default TextoEnMayusculas;
