import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { useCaminosDeCreacion } from '../../hooks/useCaminosDeCreacion';
import CajaDePrompt from '../creator/CajaDePrompt';
import HojaInferior from '../workspace/HojaInferior';
import { destinoDeIntencion } from '../../utils/destinoDeIntencion';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

/** Si no hay a dónde ir por lo escrito, estas son las puertas que se ofrecen. */
const SUGERENCIAS: readonly { id: string; clave: string; icono: string; experienceId?: string }[] = [
  { id: 'video', clave: 'crear.capVideo', icono: 'videocam-outline' },
  { id: 'photo', clave: 'crear.suggestImage', icono: 'image-outline', experienceId: 'photo' },
  { id: 'writer', clave: 'crear.suggestText', icono: 'document-text-outline', experienceId: 'writer' },
  { id: 'brain', clave: 'crear.suggestBrain', icono: 'bulb-outline' },
];

/**
 * «¿QUÉ QUIERES CREAR HOY?» — la caja de la pestaña Crear y del Inicio de Weë
 * Creator.
 *
 * Es la caja de Weë AI (`CajaDePrompt`), la misma de todas las secciones, y
 * habla con el mismo cerebro. Lo escrito va a la experiencia que le toca por
 * `destinoDeIntencion` —el de Weë Studio, no un router nuevo—: un vídeo, a Crear
 * video; lo demás, a la conversación guiada de su experiencia. Si nada encaja
 * no se inventa un destino: se ofrecen las puertas, con Weë Brain para quien no
 * sabe a cuál entrar.
 */
const CajaDeCrear: React.FC = () => {
  const { theme } = useTheme();
  const t = useT();
  const navigation = useNavigation<any>();
  const { conSesion, aCrearVideo } = useCaminosDeCreacion();
  const [idea, setIdea] = useState('');
  const [sinDestino, setSinDestino] = useState(false);

  const crear = useCallback(() => {
    const texto = idea.trim();
    if (!texto) return;
    const destino = destinoDeIntencion(texto);
    if (!destino) {
      setSinDestino(true);
      return;
    }
    if (destino.experienceId === 'studio') {
      aCrearVideo({ prompt: texto });
      return;
    }
    conSesion(() => navigation.navigate('CreatorFlow', destino.contexto));
  }, [aCrearVideo, conSesion, idea, navigation]);

  const sugerir = useCallback((s: (typeof SUGERENCIAS)[number]) => {
    setSinDestino(false);
    const texto = idea.trim();
    if (s.id === 'video') { aCrearVideo({ prompt: texto }); return; }
    if (s.id === 'brain') { navigation.navigate('Specialist', { id: 'brain' }); return; }
    conSesion(() => navigation.navigate('CreatorFlow', { experienceId: s.experienceId, goal: texto }));
  }, [aCrearVideo, conSesion, idea, navigation]);

  return (
    <View style={styles.bloque}>
      <Text style={[styles.pregunta, { color: theme.colors.text }]}>{t('nav.weeAiQuestion')}</Text>
      <CajaDePrompt
        valor={idea}
        onCambiar={setIdea}
        onEnviar={crear}
        etiquetaEnviar={t('crear.createCta')}
        placeholder={t('crear.ideaPlaceholder')}
        enviarConIntro
      />
      <HojaInferior visible={sinDestino} titulo={t('crear.noDestinationTitle')} subtitulo={t('crear.noDestinationText')} onCerrar={() => setSinDestino(false)}>
        <View style={styles.sugerencias}>
          {SUGERENCIAS.map((s) => (
            <TouchableOpacity
              key={s.id}
              onPress={() => sugerir(s)}
              style={[styles.sugerencia, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
              accessibilityRole="button"
              accessibilityLabel={t(s.clave)}
            >
              <Ionicons name={s.icono as any} size={scale(20)} color={theme.colors.accent} />
              <Text style={[styles.sugerenciaTexto, { color: theme.colors.text }]}>{t(s.clave)}</Text>
              <Ionicons name="chevron-forward" size={scale(16)} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      </HojaInferior>
    </View>
  );
};

const styles = StyleSheet.create({
  bloque: { gap: SPACING.md },
  pregunta: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold as any },
  sugerencias: { gap: SPACING.sm },
  sugerencia: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, minHeight: 50, paddingHorizontal: SPACING.lg, borderRadius: BORDER_RADIUS.md, borderWidth: 1 },
  sugerenciaTexto: { flex: 1, fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.medium as any },
});

export default CajaDeCrear;
