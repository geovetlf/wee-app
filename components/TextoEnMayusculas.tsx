import React from 'react';
import { Text, TextProps } from 'react-native';
import { useIdioma } from '../contexts/IdiomaContext';

/*
 * UN RÓTULO EN MAYÚSCULAS, CON LAS REGLAS DEL IDIOMA.
 *
 * `textTransform: 'uppercase'` no vale para todos los idiomas: en iOS pasa el
 * texto a mayúsculas sin locale, y en turco la mayúscula de «i» es «İ» —«STİL»,
 * no «STIL»—. Aquí la pone `toLocaleUpperCase` con el locale de la interfaz, en
 * la web y en el teléfono por igual. El diseño no cambia: es el mismo rótulo.
 */
const TextoEnMayusculas: React.FC<Omit<TextProps, 'children'> & { children: string }> = ({ children, ...props }) => {
  const { locale } = useIdioma();
  return <Text {...props}>{children.toLocaleUpperCase(locale)}</Text>;
};

export default TextoEnMayusculas;
