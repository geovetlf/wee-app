import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useT } from '../../../contexts/IdiomaContext';
import type { VideoDelPlano } from '../../../utils/controladorDeToma';
import { scale } from '../../../utils/scale';

/**
 * LA MINIATURA DEL VÍDEO DE UN PLANO (Fase 22 del motor, arreglo R10 de la auditoría).
 *
 * Con póster, su imagen fija. Sin él, un aviso quieto de que el plano YA tiene vídeo —nunca el vídeo—: la tira del
 * visor, la línea de tiempo, la rejilla del proyecto y la tarjeta del storyboard se pintan a la vez, y cada una
 * montaba el mismo vídeo otra vez para enseñar un fotograma. El único que lo carga es el visor, que es donde se ve.
 *
 * Ocupa el sitio de quien la pone (`absoluteFill`) y no pinta nada si el plano no tiene vídeo: eso lo dice quien la
 * pone, con sus palabras.
 */
const MiniaturaDeVideo: React.FC<{ video: VideoDelPlano | null | undefined; nombre: string; tamano?: number }> = ({ video, nombre, tamano = 18 }) => {
  const { theme } = useTheme();
  const t = useT();
  if (video?.poster) {
    return <Image source={{ uri: video.poster }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel={t('filmmaker.takePreviewOf', { nombre })} />;
  }
  if (!video?.url) return null;
  return (
    <View style={[StyleSheet.absoluteFill, styles.sinPoster]} accessible accessibilityLabel={t('filmmaker.videoReadyNoPoster', { nombre })}>
      <Ionicons name="play-circle" size={scale(tamano)} color={theme.colors.accent} />
    </View>
  );
};

const styles = StyleSheet.create({
  sinPoster: { alignItems: 'center', justifyContent: 'center' },
});

export default MiniaturaDeVideo;
