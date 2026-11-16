import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { IconoWee } from '../icons/IconoWee';
import { useTheme } from '../../contexts/ThemeContext';
import { scale } from '../../utils/scale';
import { formatNumber } from '../../utils/formatoCorto';
import { useIdioma } from '../../contexts/IdiomaContext';
import type { VoteStats } from '../../services/voteService';

/**
 * «FUEGO» Y «RISA»: los dos botones nuevos de la barra de reacciones (iconos SVG de trazo fino de la familia IconoWee). Una persona tiene UN
 * solo voto por publicación (el mismo documento que «de acuerdo»): tocar otra reacción la cambia y tocar la misma la quita. Inactivo = trazo
 * gris; activo = tinta del tema, sin degradado. Quien pinta (PostCard) hace el voto optimista y lo devuelve si el servidor lo rechaza.
 */
interface Props {
  stats: VoteStats;
  bloqueado?: boolean;
  onVotar: (tipo: 'fire' | 'laugh') => void;
}

const ReaccionesNuevas: React.FC<Props> = ({ stats, bloqueado, onVotar }) => {
  const { theme } = useTheme();
  const { t, locale } = useIdioma();
  const tipos = [
    { id: 'fire' as const, icono: 'fuego' as const, etiqueta: t('wall.reactionFire'), cuenta: stats.fireCount ?? 0 },
    { id: 'laugh' as const, icono: 'risa' as const, etiqueta: t('wall.reactionLaugh'), cuenta: stats.laughCount ?? 0 },
  ];
  return (
    <>
      {tipos.map((r) => {
        const activo = stats.userVote === r.id;
        const color = activo ? theme.colors.text : theme.colors.textSecondary;
        return (
          <TouchableOpacity
            key={r.id}
            disabled={bloqueado}
            onPress={() => onVotar(r.id)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={r.etiqueta}
            accessibilityState={{ selected: activo, disabled: !!bloqueado }}
            style={estilos.boton}
          >
            <IconoWee name={r.icono} size={scale(22)} color={color} />
            <Text style={[estilos.cuenta, { color }]}>{formatNumber(r.cuenta, locale)}</Text>
          </TouchableOpacity>
        );
      })}
    </>
  );
};

const estilos = StyleSheet.create({
  boton: { minWidth: 44, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  cuenta: { fontSize: 13, fontVariant: ['tabular-nums'] },
});

export default ReaccionesNuevas;
