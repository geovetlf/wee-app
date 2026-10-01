import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useT } from '../../../contexts/IdiomaContext';
import { BotonPequeno } from './ProductionPiezas';
import type { EstadoDeGuardado } from '../../../utils/produccionOptimista';
import type { FalloDeProducciones } from '../../../services/filmmakerService';
import { fraseDelFallo } from '../../../utils/mensajesDeFilmmaker';
import { SPACING, FONT_SIZE, FONT_WEIGHT } from '../../../constants/design';
import { scale } from '../../../utils/scale';

/**
 * SI LO TUYO ESTÁ GUARDADO. Cuatro estados, y los cuatro son verdad: guardado
 * (el servidor lo tiene), cambios sin guardar (esperando a que pares), guardando
 * (viajando ahora) y no se pudo guardar (con el porqué y cómo repetirlo). Sin
 * barras ni porcentajes: guardar no tiene progreso que enseñar.
 */
const ProductionSaveState: React.FC<{
  guardado: EstadoDeGuardado;
  fallo: FalloDeProducciones | null;
  onGuardarAhora: () => void;
  onReintentar: () => void;
}> = ({ guardado, fallo, onGuardarAhora, onReintentar }) => {
  const { theme } = useTheme();
  const t = useT();
  const icono = guardado === 'guardado' ? 'cloud-done-outline' : guardado === 'guardando' ? 'cloud-upload-outline' : guardado === 'error' ? 'cloud-offline-outline' : 'ellipse-outline';
  const color = guardado === 'error' ? theme.colors.error : guardado === 'guardado' ? theme.colors.success : theme.colors.textSecondary;
  const texto = guardado === 'guardado' ? t('filmmaker.saveSaved')
    : guardado === 'guardando' ? t('filmmaker.saveSaving')
      : guardado === 'error' ? t('filmmaker.saveError')
        : t('filmmaker.savePending');
  return (
    <View style={styles.fila} accessibilityLiveRegion="polite">
      <Ionicons name={icono as any} size={scale(16)} color={color} />
      <View style={styles.textos}>
        <Text style={[styles.estado, { color }]}>{texto}</Text>
        {guardado === 'error' && !!fallo && <Text style={[styles.porque, { color: theme.colors.textSecondary }]}>{fraseDelFallo(fallo, t)}</Text>}
      </View>
      {guardado === 'pendiente' && <BotonPequeno icono="save-outline" etiqueta={t('filmmaker.saveNow')} onPress={onGuardarAhora} conTexto />}
      {guardado === 'error' && <BotonPequeno icono="refresh" etiqueta={t('common.retry')} onPress={onReintentar} conTexto />}
    </View>
  );
};

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flexWrap: 'wrap' },
  textos: { flexShrink: 1 },
  estado: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold as any },
  porque: { fontSize: FONT_SIZE.xs },
});

export default ProductionSaveState;
