import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useT } from '../../../contexts/IdiomaContext';
import { Chip } from './ProductionPiezas';
import type { EstadosDeLaProduccion } from '../../../utils/presentacionDeProduccion';
import { SPACING } from '../../../constants/design';

/**
 * EN QUÉ ESTADO ESTÁ LA PRODUCCIÓN, EN UNA LÍNEA. Archivada, borrador o lista
 * para generar, y si algo depende de un plano incompleto. Son los estados que de
 * verdad existen: no hay «generando» ni porcentajes, porque F1-C no genera.
 */
const ProductionStatus: React.FC<{ estados: EstadosDeLaProduccion }> = ({ estados }) => {
  const t = useT();
  return (
    <View style={styles.fila}>
      {estados.archivada && <Chip texto={t('filmmaker.statusArchived')} icono="archive-outline" tono="neutro" />}
      {!estados.archivada && estados.lista && <Chip texto={t('filmmaker.statusReady')} icono="checkmark-circle-outline" tono="ok" />}
      {!estados.archivada && estados.borrador && <Chip texto={t('filmmaker.statusDraft')} icono="create-outline" tono="acento" />}
      {estados.conDependenciasPendientes && <Chip texto={t('filmmaker.statusDependencies')} icono="git-branch-outline" tono="aviso" />}
    </View>
  );
};

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
});

export default ProductionStatus;
