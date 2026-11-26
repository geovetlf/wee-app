import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useT } from '../../contexts/IdiomaContext';
import { PORTADA_WEEAI as P, textoPortada } from '../../constants/estiloWeeAi';
import { TipoDeTaller } from '../../constants/filmmakerIdea';

const CLAVE_DE_SALUDO = { short: 'filmmaker.ideaGreetShort', film: 'filmmaker.ideaGreetFilm', ad: 'filmmaker.ideaGreetAd' } as const;

/** Lo único que el mundo de la Idea dice a la vez: el saludo, la pregunta breve o «creando…». El fallo NO vive aquí: sale en línea bajo la caja. */
export type EstadoDelTaller = 'saludo' | 'pregunta' | 'creando';

interface Props {
  tipo: TipoDeTaller;
  estado: EstadoDelTaller;
  /** Pantalla corta o teclado abierto: la letra baja un punto y el aire se recorta. */
  compacto: boolean;
  /** El estudio de comando: el resumen de especificaciones, bajo la frase. Lo pone la pantalla; aquí solo se coloca. */
  especificaciones?: React.ReactNode;
}

/**
 * EL MUNDO DE LA IDEA (etapa 1 de Filmmaker): encima de la caja común, UNA frase de Weë y nada más. Sin selectores, sin tarjetas de preguntas, sin barra
 * de etapas: la persona cuenta su idea en la caja (con el «+» para pegar o adjuntar) y Weë sigue solo. NO hay IA aquí (D5 pendiente): lo que se ve
 * sale de lo que la persona escribe. Ningún botón: reintentar es volver a enviar desde la caja, que conserva la idea.
 */
export const TallerDeIdea: React.FC<Props> = ({ tipo, estado, compacto, especificaciones }) => {
  const t = useT();
  const clave = estado === 'creando' ? 'filmmaker.hubCreating' : estado === 'pregunta' ? 'filmmaker.askDoneNeedIdea' : CLAVE_DE_SALUDO[tipo];
  return (
    <View style={styles.mundo}>
      <View style={styles.centro} accessibilityLiveRegion="polite">
        {estado === 'creando' ? <ActivityIndicator size="small" color={P.tintaSecundaria} /> : null}
        <Text style={[textoPortada(compacto ? 20 : 26, '600'), styles.frase, { color: P.tinta }]} accessibilityRole="header">{t(clave)}</Text>
      </View>
      {estado === 'creando' ? null : especificaciones}
    </View>
  );
};

const styles = StyleSheet.create({
  mundo: { flex: 1, justifyContent: 'center', gap: 28 },
  centro: { alignItems: 'center', gap: 14, paddingHorizontal: 24 },
  frase: { textAlign: 'center' },
});
