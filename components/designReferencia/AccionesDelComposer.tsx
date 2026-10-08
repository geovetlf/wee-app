import React from 'react';
import { ScrollView, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { ACCIONES_DEL_COMPOSER } from '../../constants/designWorkspace';
import { CapacidadDeDesign, capacidadPorId } from '../../constants/designReferencia';
import type { EstadoDeLaCapacidad } from '../../utils/designReferencia';
import { CURSOR, nombreDeIcono } from './piezas';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

interface Props {
  estadoDe: (cap: CapacidadDeDesign) => EstadoDeLaCapacidad;
  onCapacidad: (cap: CapacidadDeDesign) => void;
}

/**
 * LA BARRA CONTEXTUAL DEL COMPOSER (Línea B): generar, modificar, variar,
 * transformar, visualizar, crear y editar 3D, materiales, texturas, composición y
 * exportar. Cada verbo dice QUÉ se quiere; la capacidad que lo sirve sale del
 * registro (`ACCIONES_DEL_COMPOSER`) y quién la ejecuta lo decide Weë. Pulsar
 * nunca es mudo: se usa si se puede y, si no, se abre su detalle con el motivo.
 */
const AccionesDelComposer: React.FC<Props> = ({ estadoDe, onCapacidad }) => {
  const { theme } = useTheme();
  const t = useT();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator style={estilos.contenedor} contentContainerStyle={estilos.fila} accessibilityLabel={t('designRef.wsContextBar')}>
      {ACCIONES_DEL_COMPOSER.map((a) => {
        const cap = capacidadPorId(a.capacidad);
        if (!cap) return null;
        const apagado = !estadoDe(cap).disponible;
        const color = apagado ? theme.colors.textSecondary : theme.colors.text;
        return (
          <TouchableOpacity
            key={a.id}
            onPress={() => onCapacidad(cap)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={t(a.clave)}
            accessibilityState={{ disabled: apagado }}
            style={[estilos.chip, { borderColor: theme.colors.border, backgroundColor: apagado ? theme.colors.surface : theme.colors.card }, CURSOR]}
          >
            <Ionicons name={nombreDeIcono(a.icono)} size={scale(15)} color={color} />
            <Text style={[estilos.texto, { color }]} numberOfLines={1}>{t(a.clave)}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const estilos = StyleSheet.create({
  /* No crece en alto; el indicador dice que hay más acciones y todas se alcanzan desplazando. */
  contenedor: { flexGrow: 0, flexShrink: 0 },
  fila: { gap: SPACING.xs, paddingVertical: 2, paddingBottom: SPACING.xs, alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: scale(4), paddingHorizontal: SPACING.sm, minHeight: 36, borderRadius: BORDER_RADIUS.full, borderWidth: StyleSheet.hairlineWidth },
  texto: { fontSize: FONT_SIZE.xs },
});

export default AccionesDelComposer;
