import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useIdioma } from '../../../contexts/IdiomaContext';
import { BotonPequeno, Chip } from './ProductionPiezas';
import type { EspacioDeFilmmaker } from './espacio';
import { confirmAction } from '../../../utils/notify';
import { SPACING, FONT_SIZE, FONT_WEIGHT } from '../../../constants/design';

/**
 * LAS VERSIONES DE LA PRODUCCIÓN (Fase 20 del motor; volver a una, Fase 12): las más recientes primero, con cuándo y,
 * si una es una vuelta, a cuál. Volver a una pide confirmación, se guarda como una versión NUEVA y ninguna se pierde;
 * con cambios sin guardar, archivada u ocupada, no se puede.
 *
 * Fase 23 del motor (el espacio de trabajo): una pieza propia, para que esté donde haga falta —el panel del proyecto
 * del escritorio y el «Proyecto» del teléfono y de la tableta—, y no solo donde cabía el panel.
 */
const ProductionVersiones: React.FC<{ espacio: EspacioDeFilmmaker }> = ({ espacio }) => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const { historial, revision, editable, hayCambios, onRestaurar } = espacio;
  if (!historial) return null;
  if (historial.carga === 'error') return <Text style={[styles.nota, { color: theme.colors.error }]}>{t('filmmaker.wsVersionsError')}</Text>;
  if (historial.carga === 'cargando') return <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('common.loading')}</Text>;
  const volver = async (numero: number) => {
    if (!onRestaurar) return;
    const si = await confirmAction(t('filmmaker.wsVersionConfirmTitle', { numero }), t('filmmaker.wsVersionConfirmText'), t('filmmaker.wsVersionRestore'), false, t);
    if (si) onRestaurar(numero);
  };
  return (
    <View style={styles.versiones}>
      {historial.versiones.map((v) => (
        <View key={v.revision} style={[styles.version, { borderColor: theme.colors.border }]}>
          <View style={styles.versionTextos}>
            <Text style={[styles.filaTexto, { color: theme.colors.text }]}>{t('filmmaker.wsVersionLine', { numero: v.revision, cuando: formato.tiempoRelativo(v.createdAt) })}</Text>
            {v.restoredFrom !== undefined && <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsVersionWasRestore', { numero: v.restoredFrom })}</Text>}
          </View>
          {v.revision === revision
            ? <Chip texto={t('filmmaker.wsVersionCurrent')} tono="acento" />
            : !!onRestaurar && (
              <BotonPequeno icono="arrow-undo-outline" etiqueta={t('filmmaker.wsVersionRestore')} onPress={() => { void volver(v.revision); }} disabled={!editable || hayCambios} conTexto />
            )}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  versiones: { gap: SPACING.xs },
  version: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: SPACING.xs },
  versionTextos: { flex: 1, gap: 2 },
  filaTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium as any },
  nota: { fontSize: FONT_SIZE.xs, lineHeight: FONT_SIZE.xs * 1.45 },
});

export default ProductionVersiones;
