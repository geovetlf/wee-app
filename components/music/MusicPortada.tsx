import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import MisCreacionesMusic from './MisCreacionesMusic';
import MatrizDeCapacidades from './MatrizDeCapacidades';
import { Boton, ChipDeEstado, Nota, TituloDeBloque } from './piezas';
import { capacidadDeMusic, capacidadUsable, IdDeCapacidadMusic } from '../../constants/musicCapabilities';
import { SPACING, FONT_SIZE, FONT_WEIGHT } from '../../constants/design';
import { scale } from '../../utils/scale';

/** Las habilidades que se enseñan: cada una dice su estado real. */
const HABILIDADES: { id: IdDeCapacidadMusic; icono: string }[] = [
  { id: 'generate', icono: 'musical-notes-outline' },
  { id: 'referenceAudio', icono: 'mic-outline' },
  { id: 'lyrics', icono: 'document-text-outline' },
  { id: 'sectionEdit', icono: 'git-merge-outline' },
  { id: 'stems', icono: 'layers-outline' },
  { id: 'export', icono: 'download-outline' },
];

/**
 * LO QUE VA DEBAJO DEL COMPOSER: lo hecho y el estado verdadero de cada habilidad.
 *
 * Se entra escribiendo (el Composer es lo primero); esto es lo que queda debajo. Las canciones recientes son las de la
 * cuenta (Assets) y, si no hay, el estado vacío — nunca datos de muestra. La matriz de capacidades queda plegada.
 */
const MusicPortada: React.FC = () => {
  const { theme } = useTheme();
  const t = useT();
  const [matriz, setMatriz] = useState(false);

  return (
    <View style={s.raiz}>
      <MisCreacionesMusic limite={5} titulo={t('music.recentTitle')} />

      <TituloDeBloque>{t('music.skillsTitle')}</TituloDeBloque>
      <View style={[s.lista, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}>
        {HABILIDADES.map((h, i) => {
          const c = capacidadDeMusic(h.id);
          return (
            <View key={h.id} style={[s.fila, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border }]}>
              <Ionicons name={h.icono as any} size={scale(18)} color={theme.colors.textSecondary} />
              <Text style={[s.titulo, { color: theme.colors.text }]}>{t(`music.${c.claveTitulo}`)}</Text>
              <ChipDeEstado estado={capacidadUsable(h.id) ? 'preparado' : c.estado === 'pendiente' ? 'noCompatible' : 'pendienteIntegracion'} />
            </View>
          );
        })}
      </View>

      <View style={s.botones}>
        <Boton texto={t(matriz ? 'music.matrixHide' : 'music.matrixShow')} icono="list-outline" onPress={() => setMatriz((v) => !v)} compacto />
      </View>
      <Nota>{t('music.honestyNote')}</Nota>
      {matriz && <MatrizDeCapacidades />}
    </View>
  );
};

const s = StyleSheet.create({
  raiz: { gap: SPACING.md, paddingBottom: SPACING.xl },
  lista: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, overflow: 'hidden' },
  fila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.sm, padding: 12, minHeight: 46 },
  titulo: { flex: 1, minWidth: 120, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
  botones: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
});

export default MusicPortada;
