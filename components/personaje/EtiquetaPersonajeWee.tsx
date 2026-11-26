import React from 'react';
import { Text, TextStyle, StyleProp } from 'react-native';
import { useIdioma } from '../../contexts/IdiomaContext';
import { notify } from '../../utils/notify';

/*
 * LA ETIQUETA DE LO QUE ESCRIBE UN PERSONAJE CON AUTONOMÍA (decisión del dueño,
 * 2026-11-22): se ve «Personaje Weë», de la marca; al tocarla se explica que lo
 * escribió el personaje con IA de su creador. Transparencia sin ruido: quien lee
 * con lector de pantalla oye siempre la explicación completa.
 *
 * Va DENTRO de un <Text> (la línea de hora de publicaciones, comentarios y
 * mensajes), por eso es un <Text> anidado con `onPress` y no un botón aparte.
 */

interface Props {
  style?: StyleProp<TextStyle>;
  /** Lo que sigue a la etiqueta en la misma línea (p. ej. « · »). */
  separador?: string;
}

const EtiquetaPersonajeWee: React.FC<Props> = ({ style, separador = ' · ' }) => {
  const { t } = useIdioma();
  return (
    <Text
      style={style}
      onPress={() => notify(t('character.badgeInfoTitle'), t('character.badgeInfoBody'))}
      accessibilityRole="button"
      accessibilityLabel={t('character.badgeA11y')}
      suppressHighlighting
    >
      {'✦ '}{t('character.badgeWee')}{separador}
    </Text>
  );
};

export default EtiquetaPersonajeWee;
