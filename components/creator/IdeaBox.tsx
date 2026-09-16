import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useT } from '../../contexts/IdiomaContext';
import { SpecialistConfig } from '../../constants/specialists';
import { SPACING } from '../../constants/design';
import { Chip } from './ui';
import CajaDePrompt, { InvitacionDeLaCaja } from './CajaDePrompt';

interface IdeaBoxProps {
  config: SpecialistConfig['idea'];
  onSubmit: (text: string) => void;
}

/*
 * Un ejemplo puede llevar un emoji delante —"🇯🇵 Japón en octubre"— porque ayuda
 * a reconocerlo de un vistazo. Pero lo que se envía es el objetivo del trabajo:
 * viaja al servidor, entra en el prompt y da título al trabajo. Así que el emoji
 * se queda en la pantalla y lo que sale es la frase.
 *
 * Solo quita lo que es un emoji de verdad: una palabra normal al principio, como
 * "Quiero" o "Recetas", no se toca.
 */
const EMOJI_AL_PRINCIPIO = /^[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]+[\u{FE0F}\u{200D}\u{1F000}-\u{1FAFF}]*\s+/u;
export const objetivoDe = (chip: string): string => chip.replace(EMOJI_AL_PRINCIPIO, '').trim() || chip;

/**
 * DONDE EMPIEZA UNA CREACIÓN EN CADA ESPECIALISTA.
 *
 * La persona lo cuenta con sus palabras y Weë empieza. Debajo, unos ejemplos
 * para quien prefiera empezar por uno ya escrito.
 *
 * La caja es `CajaDePrompt`, la misma de Weë Studio y Weë Design (decisión del
 * usuario, 2026-09-15: una sola caja para todo Weë AI). Antes era una píldora
 * estrecha de una línea con el botón al lado, dentro de una tarjeta con borde
 * amarillo y un emoji. De aquel saludo se queda la invitación —"Cuéntame, ¿qué
 * te gustaría cocinar hoy?"—, una línea encima de la caja: el nombre de la
 * sección ya lo dice su cabecera.
 */
const IdeaBox: React.FC<IdeaBoxProps> = ({ config, onSubmit }) => {
  const t = useT();
  const [text, setText] = useState('');

  const enviar = () => {
    const value = text.trim();
    if (!value) return;
    setText('');
    onSubmit(value);
  };

  return (
    <View style={styles.bloque}>
      <InvitacionDeLaCaja texto={config.subtitle} />

      <CajaDePrompt
        valor={text}
        onCambiar={setText}
        onEnviar={enviar}
        /* Con etiqueta propia —"Crear mi primera campaña"— es la que se lee en voz alta. */
        etiquetaEnviar={config.button ?? t('weeai.sendIdea')}
        placeholder={config.placeholder}
        /* Esta caja empieza algo: Intro lo empieza, como cuando era de una línea. */
        enviarConIntro
      />

      {config.chips.length > 0 && (
        <View style={styles.ejemplos}>
          {config.chips.map((chip) => (
            <Chip key={chip} label={chip} onPress={() => onSubmit(objetivoDe(chip))} />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  bloque: {
    gap: SPACING.md,
  },
  ejemplos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
});

export default IdeaBox;
