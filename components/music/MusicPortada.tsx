import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import MisCreacionesMusic from './MisCreacionesMusic';
import MatrizDeCapacidades from './MatrizDeCapacidades';
import { Boton, ChipDeEstado, Nota, Tarjeta, TituloDeBloque } from './piezas';
import { PUNTOS_DE_PARTIDA, PuntoDePartidaId } from '../../constants/musicComposer';
import { capacidadDeMusic, capacidadUsable, IdDeCapacidadMusic } from '../../constants/musicCapabilities';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

interface Props {
  onCrear: (punto: PuntoDePartidaId) => void;
  onVerEjemplo: () => void;
}

/** Las habilidades que se enseñan en la portada: cada una dice su estado real. */
const HABILIDADES: { id: IdDeCapacidadMusic; icono: string }[] = [
  { id: 'generate', icono: 'musical-notes-outline' },
  { id: 'referenceAudio', icono: 'mic-outline' },
  { id: 'lyrics', icono: 'document-text-outline' },
  { id: 'sectionEdit', icono: 'git-merge-outline' },
  { id: 'stems', icono: 'layers-outline' },
  { id: 'export', icono: 'download-outline' },
];

/**
 * LA PORTADA DE WEË MUSIC: identidad, una acción principal, accesos y el estado verdadero de cada habilidad.
 * Complejidad progresiva: arriba solo «Crear música»; la matriz de capacidades queda plegada. Las canciones recientes
 * son las de la cuenta (Assets) y, si no hay, el estado vacío — nunca datos de muestra.
 */
const MusicPortada: React.FC<Props> = ({ onCrear, onVerEjemplo }) => {
  const { theme } = useTheme();
  const t = useT();
  const navigation = useNavigation<any>();
  const [matriz, setMatriz] = useState(false);

  return (
    <View style={s.raiz}>
      <View style={[s.portada, { backgroundColor: theme.colors.accent + '1F', borderColor: theme.colors.accent + '55' }]}>
        <Ionicons name="musical-notes" size={scale(56)} color={theme.colors.accentDark} />
        <Text style={[s.intro, { color: theme.colors.textSecondary }]}>{t('music.heroLine')}</Text>
        <Boton texto={t('music.ctaCreate')} icono="sparkles-outline" principal onPress={() => onCrear('idea')} />
      </View>

      <TituloDeBloque>{t('music.chooseTitle')}</TituloDeBloque>
      <View style={s.rejilla}>
        {PUNTOS_DE_PARTIDA.filter((p) => p.id !== 'draft').map((p) => (
          <TouchableOpacity
            key={p.id}
            accessibilityRole="button"
            accessibilityLabel={`${t(`music.${p.claveTitulo}`)}. ${t(`music.${p.claveAyuda}`)}`}
            onPress={() => onCrear(p.id)}
            style={[s.acceso, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
          >
            <Ionicons name={p.icono as any} size={scale(22)} color={theme.colors.accentDark} />
            <Text style={[s.accesoTitulo, { color: theme.colors.text }]}>{t(`music.${p.claveTitulo}`)}</Text>
            <Text style={[s.accesoAyuda, { color: theme.colors.textSecondary }]}>{t(`music.${p.claveAyuda}`)}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate('MisCreaciones')} style={[s.acceso, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Ionicons name="albums-outline" size={scale(22)} color={theme.colors.accentDark} />
          <Text style={[s.accesoTitulo, { color: theme.colors.text }]}>{t('music.openLibrary')}</Text>
          <Text style={[s.accesoAyuda, { color: theme.colors.textSecondary }]}>{t('music.openLibraryHelp')}</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate('Projects')} style={[s.acceso, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Ionicons name="folder-open-outline" size={scale(22)} color={theme.colors.accentDark} />
          <Text style={[s.accesoTitulo, { color: theme.colors.text }]}>{t('music.openProjects')}</Text>
          <Text style={[s.accesoAyuda, { color: theme.colors.textSecondary }]}>{t('music.openProjectsHelp')}</Text>
        </TouchableOpacity>
      </View>

      <TituloDeBloque>{t('music.skillsTitle')}</TituloDeBloque>
      <View style={s.rejilla}>
        {HABILIDADES.map((h) => {
          const c = capacidadDeMusic(h.id);
          return (
            <Tarjeta key={h.id}>
              <Ionicons name={h.icono as any} size={scale(20)} color={theme.colors.accentDark} />
              <Text style={[s.accesoTitulo, { color: theme.colors.text }]}>{t(`music.${c.claveTitulo}`)}</Text>
              <ChipDeEstado estado={capacidadUsable(h.id) ? 'preparado' : c.estado === 'pendiente' ? 'noCompatible' : 'pendienteIntegracion'} />
            </Tarjeta>
          );
        })}
      </View>

      <MisCreacionesMusic limite={3} titulo={t('music.recentTitle')} />

      <View style={s.botones}>
        <Boton texto={t('music.viewExample')} icono="eye-outline" onPress={onVerEjemplo} />
        <Boton texto={t(matriz ? 'music.matrixHide' : 'music.matrixShow')} icono="list-outline" onPress={() => setMatriz((v) => !v)} />
      </View>
      <Nota>{t('music.honestyNote')}</Nota>
      {matriz && <MatrizDeCapacidades />}
    </View>
  );
};

const s = StyleSheet.create({
  raiz: { gap: SPACING.lg, paddingBottom: SPACING.xxxl },
  portada: { borderWidth: 1, borderRadius: BORDER_RADIUS.xl, padding: SPACING.xl, alignItems: 'center', gap: SPACING.md },
  intro: { fontSize: FONT_SIZE.sm, textAlign: 'center', lineHeight: scale(20) },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  acceso: { flexGrow: 1, flexBasis: scale(150), borderWidth: 1, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, gap: SPACING.xs, minHeight: scale(96) },
  accesoTitulo: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold },
  accesoAyuda: { fontSize: FONT_SIZE.xs, lineHeight: scale(16) },
  botones: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
});

export default MusicPortada;
