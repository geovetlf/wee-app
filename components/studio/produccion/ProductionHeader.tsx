import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useT } from '../../../contexts/IdiomaContext';
import { BotonPequeno } from './ProductionPiezas';
import ProductionStatus from './ProductionStatus';
import ProductionSaveState from './ProductionSaveState';
import type { EstadosDeLaProduccion } from '../../../utils/presentacionDeProduccion';
import type { EstadoDeGuardado } from '../../../utils/produccionOptimista';
import type { FalloDeProducciones } from '../../../services/filmmakerService';
import { SPACING, FONT_SIZE, FONT_WEIGHT } from '../../../constants/design';

/**
 * LA CABECERA DE UNA PRODUCCIÓN: su título —el que se le dio al crearla, que es
 * contenido y no se traduce—, en qué estado está, si lo tuyo está guardado, y lo
 * que se puede hacer con ella entera: duplicarla, archivarla o desarchivarla, y
 * volver a tus producciones. El título no se edita aquí: F1-A todavía no tiene
 * una operación para él.
 */
const ProductionHeader: React.FC<{
  titulo: string;
  estados: EstadosDeLaProduccion;
  guardado: EstadoDeGuardado;
  fallo: FalloDeProducciones | null;
  hayCambios: boolean;
  onGuardarAhora: () => void;
  onReintentar: () => void;
  onDuplicar: () => void;
  onArchivar: () => void;
  onDesarchivar: () => void;
  onLista: () => void;
}> = ({ titulo, estados, guardado, fallo, hayCambios, onGuardarAhora, onReintentar, onDuplicar, onArchivar, onDesarchivar, onLista }) => {
  const { theme } = useTheme();
  const t = useT();
  return (
    <View style={styles.cabecera}>
      <Text style={[styles.titulo, { color: theme.colors.text }]} accessibilityRole="header" numberOfLines={3}>{titulo}</Text>
      <ProductionStatus estados={estados} />
      <ProductionSaveState guardado={guardado} fallo={fallo} onGuardarAhora={onGuardarAhora} onReintentar={onReintentar} />
      <View style={styles.acciones} accessibilityLabel={t('filmmaker.actionsMenu')}>
        <BotonPequeno icono="list-outline" etiqueta={t('filmmaker.backToList')} onPress={onLista} conTexto />
        <BotonPequeno icono="copy-outline" etiqueta={t('filmmaker.duplicate')} onPress={onDuplicar} disabled={hayCambios} conTexto />
        {estados.archivada
          ? <BotonPequeno icono="arrow-undo-outline" etiqueta={t('filmmaker.unarchive')} onPress={onDesarchivar} conTexto />
          : <BotonPequeno icono="archive-outline" etiqueta={t('filmmaker.archive')} onPress={onArchivar} disabled={hayCambios} conTexto />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cabecera: { gap: SPACING.sm },
  titulo: { fontSize: FONT_SIZE.xxl, fontWeight: FONT_WEIGHT.bold as any, lineHeight: FONT_SIZE.xxl * 1.2 },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.xs },
});

export default ProductionHeader;
