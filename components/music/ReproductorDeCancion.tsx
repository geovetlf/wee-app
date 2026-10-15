import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useIdioma } from '../../contexts/IdiomaContext';
import CampoQueCrece from '../creator/CampoQueCrece';
import { Boton, ChipDeEstado, Nota, Onda, PICOS_DE_EJEMPLO, Tarjeta, AvisoDeEjemplo } from './piezas';
import { useReproductorMusic } from '../../hooks/useMusicAudio';
import { CancionDeMusic, tiempoMmSs } from '../../utils/musicModel';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

interface Props {
  cancion: CancionDeMusic;
  onTitulo: (titulo: string) => void;
  onFavorita: () => void;
  /** Para que la línea de tiempo siga a la reproducción. */
  onPosicion?: (sec: number) => void;
}

/**
 * TARJETA DE LA CANCIÓN + REPRODUCTOR.
 *
 * Reproduce SOLO audio real (`audioUrl`). Sin audio —que es el caso de la canción de ejemplo, y de cualquier resultado
 * que todavía no exista— el reproductor está desactivado y lo dice («resultado no disponible»): no hay barra de
 * progreso animada ni forma de onda inventada para una canción real. La portada es un dibujo neutro de Weë, no una
 * imagen generada. El título se edita con el campo común que crece (`CampoQueCrece`).
 */
const ReproductorDeCancion: React.FC<Props> = ({ cancion, onTitulo, onFavorita, onPosicion }) => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const play = useReproductorMusic(cancion.audioUrl);
  const dur = cancion.duracionSec ?? play.duracionSec;
  const hayAudio = !!cancion.audioUrl;
  React.useEffect(() => { onPosicion?.(play.posicionSec); }, [play.posicionSec, onPosicion]);

  const picos = cancion.picos ?? (cancion.esEjemplo ? PICOS_DE_EJEMPLO : undefined);

  return (
    <Tarjeta destacada>
      {cancion.esEjemplo && <AvisoDeEjemplo />}
      <View style={s.fila}>
        <View style={[s.portada, { backgroundColor: theme.colors.accent + '26', borderColor: theme.colors.accent + '66' }]} accessibilityElementsHidden>
          <Ionicons name="musical-notes" size={scale(34)} color={theme.colors.accentDark} />
        </View>
        <View style={{ flex: 1, gap: SPACING.xs }}>
          <CampoQueCrece
            etiqueta={t('music.songTitleLabel')}
            valor={cancion.titulo || (cancion.esEjemplo ? t('music.exampleTitle') : '')}
            placeholder={t('music.songTitlePlaceholder')}
            maximo={80}
            etiquetaGuardar={t('music.saveTitle')}
            onGuardar={onTitulo}
          />
          <View style={s.meta}>
            {cancion.genero ? <Text style={[s.metaTexto, { color: theme.colors.textSecondary }]}>{t(`music.genre_${cancion.genero}`)}</Text> : null}
            {dur ? <Text style={[s.metaTexto, { color: theme.colors.textSecondary }]}>{tiempoMmSs(dur, formato.numero)}</Text> : null}
            {cancion.voz ? <Text style={[s.metaTexto, { color: theme.colors.textSecondary }]}>{t(`music.voice_${cancion.voz}`)}</Text> : null}
          </View>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ selected: !!cancion.favorita }}
          accessibilityLabel={t(cancion.favorita ? 'music.unfavorite' : 'music.favorite')}
          onPress={onFavorita}
          hitSlop={10}
          style={s.fav}
        >
          <Ionicons name={cancion.favorita ? 'heart' : 'heart-outline'} size={scale(24)} color={cancion.favorita ? theme.colors.like : theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <Onda picos={picos} ejemplo={cancion.esEjemplo} progreso={dur ? Math.min(1, play.posicionSec / dur) : 0} vacioTexto={t('music.noWaveform')} />

      <View style={s.fila} accessibilityLiveRegion="polite">
        <Boton texto={t(play.sonando ? 'music.pause' : 'music.play')} icono={play.sonando ? 'pause-outline' : 'play-outline'} onPress={play.alternar} desactivado={!hayAudio} principal={hayAudio} />
        <Text style={[s.tiempo, { color: theme.colors.text }]}>{tiempoMmSs(play.posicionSec, formato.numero)} / {tiempoMmSs(dur ?? 0, formato.numero)}</Text>
        {!hayAudio && <ChipDeEstado estado="resultadoNoDisponible" />}
      </View>
      {play.fallo && <Nota fuerte>{t('music.playError')}</Nota>}
      {!hayAudio && <Nota>{t('music.noAudioNote')}</Nota>}
    </Tarjeta>
  );
};

const s = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, flexWrap: 'wrap' },
  portada: { width: scale(84), height: scale(84), borderRadius: BORDER_RADIUS.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  meta: { flexDirection: 'row', gap: SPACING.md, flexWrap: 'wrap' },
  metaTexto: { fontSize: FONT_SIZE.xs },
  fav: { minWidth: scale(44), minHeight: scale(44), alignItems: 'center', justifyContent: 'center' },
  tiempo: { fontSize: FONT_SIZE.sm },
});

export default ReproductorDeCancion;
