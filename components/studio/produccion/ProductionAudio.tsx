import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useT } from '../../../contexts/IdiomaContext';
import type { FilmmakerProduction } from '../../../services/filmmaker/dominio';
import { SPACING, FONT_SIZE, FONT_WEIGHT } from '../../../constants/design';
import { scale } from '../../../utils/scale';

/**
 * LO QUE VA A SONAR, COMO ESTRUCTURA: voz, diálogo, música, efectos y ambiente.
 *
 * Se enseña lo que la producción pide —cuántas líneas, cuántos sonidos, si hay
 * narrador— y, al lado, que hacerlo todavía no está disponible. Ni voz, ni
 * música, ni efectos se piden a nadie en esta fase: una producción sin pista de
 * música dice «nada todavía», no finge tenerla.
 */
const ProductionAudio: React.FC<{ produccion: FilmmakerProduction }> = ({ produccion }) => {
  const { theme } = useTheme();
  const t = useT();
  const lineas = produccion.scenes.reduce((n, s) => n + (s.dialogue?.length ?? 0) + s.shots.reduce((m, p) => m + (p.dialogue?.length ?? 0), 0), 0);
  const deTipo = (kind: string) => produccion.audio.cues.filter((c) => c.kind === kind).length;
  const filas: readonly { icono: string; clave: string; cuenta: number; texto?: string }[] = [
    { icono: 'mic-outline', clave: 'filmmaker.audioVoice', cuenta: produccion.audio.narrator ? 1 : 0, texto: produccion.audio.narrator ? t('filmmaker.audioNarrator') : undefined },
    { icono: 'chatbubbles-outline', clave: 'filmmaker.audioDialogue', cuenta: lineas, texto: lineas ? t('filmmaker.dialogueLines', { contador: lineas }) : undefined },
    { icono: 'musical-notes-outline', clave: 'filmmaker.audioMusic', cuenta: deTipo('music') },
    { icono: 'flash-outline', clave: 'filmmaker.audioSfx', cuenta: deTipo('sfx') },
    { icono: 'leaf-outline', clave: 'filmmaker.audioAmbience', cuenta: deTipo('ambience') },
  ];
  return (
    <View style={styles.lista}>
      {filas.map((f) => (
        <View key={f.clave} style={styles.fila}>
          <Ionicons name={f.icono as any} size={scale(16)} color={theme.colors.textSecondary} />
          <Text style={[styles.nombre, { color: theme.colors.text }]}>{t(f.clave)}</Text>
          <Text style={[styles.valor, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {f.cuenta ? (f.texto ?? t('filmmaker.soundCues', { contador: f.cuenta })) : t('filmmaker.audioNone')}
          </Text>
        </View>
      ))}
      <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.audioUnavailable')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  lista: { gap: SPACING.xs },
  fila: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  nombre: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium as any, minWidth: scale(76) },
  valor: { fontSize: FONT_SIZE.sm, flex: 1, textAlign: 'right' },
  nota: { fontSize: FONT_SIZE.xs, fontStyle: 'italic', marginTop: SPACING.xs },
});

export default ProductionAudio;
