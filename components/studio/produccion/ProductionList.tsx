import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useIdioma } from '../../../contexts/IdiomaContext';
import { useProducciones } from '../../../hooks/useProducciones';
import ProductionEmptyState from './ProductionEmptyState';
import { BotonPequeno } from './ProductionPiezas';
import { CLAVE_DEL_PRESET } from '../../../constants/filmmaker';
import type { EstadoDeProduccion } from '../../../services/filmmakerService';
import { fraseDelFallo } from '../../../utils/mensajesDeFilmmaker';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../../constants/design';
import { scale } from '../../../utils/scale';

const isWeb = Platform.OS === 'web';

/**
 * TUS PRODUCCIONES, DE VERDAD. La lista la da `productions`: las activas o las
 * archivadas, las más recientes primero. No es la fila de muestra del Studio —
 * aquí no hay ni una producción de ejemplo—: si no tienes ninguna, se dice y se
 * enseña dónde empezar.
 */
const ProductionList: React.FC<{
  onAbrir: (productionId: string) => void;
  onIrAlStudio: () => void;
}> = ({ onAbrir, onIrAlStudio }) => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const [estado, setEstado] = useState<EstadoDeProduccion>('active');
  const { carga, producciones, fallo, hayMas, recargar, cargarMas } = useProducciones(estado);

  return (
    <View style={styles.bloque}>
      <View style={styles.pestanas} accessibilityRole="tablist">
        {(['active', 'archived'] as const).map((e) => {
          const puesta = e === estado;
          return (
            <TouchableOpacity
              key={e}
              onPress={() => setEstado(e)}
              accessibilityRole="tab"
              accessibilityState={{ selected: puesta }}
              accessibilityLabel={e === 'active' ? t('filmmaker.tabActive') : t('filmmaker.tabArchived')}
              style={[styles.pestana, { borderColor: puesta ? theme.colors.accent : theme.colors.border, backgroundColor: puesta ? theme.colors.accent : theme.colors.card }]}
            >
              <Text style={[styles.pestanaTexto, { color: puesta ? '#1F2937' : theme.colors.text }]}>
                {e === 'active' ? t('filmmaker.tabActive') : t('filmmaker.tabArchived')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {carga === 'cargando' && <ActivityIndicator color={theme.colors.accent} accessibilityLabel={t('common.loading')} />}
      {carga === 'error' && (
        <ProductionEmptyState
          icono="cloud-offline-outline"
          tono="error"
          titulo={t('filmmaker.listError')}
          texto={fallo ? fraseDelFallo(fallo, t) : undefined}
          accion={{ etiqueta: t('common.retry'), icono: 'refresh', onPress: () => { void recargar(); } }}
        />
      )}
      {carga === 'lista' && producciones.length === 0 && (
        estado === 'active'
          ? <ProductionEmptyState icono="film-outline" titulo={t('filmmaker.emptyListTitle')} texto={t('filmmaker.emptyListText')}
            accion={{ etiqueta: t('filmmaker.goToStudio'), icono: 'color-wand-outline', onPress: onIrAlStudio }} />
          : <ProductionEmptyState icono="archive-outline" titulo={t('filmmaker.emptyArchived')} />
      )}
      {carga === 'lista' && producciones.map((p) => (
        <TouchableOpacity
          key={p.productionId}
          onPress={() => onAbrir(p.productionId)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t('filmmaker.openProduction', { titulo: p.title })}
          style={[styles.fila, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }, isWeb && ({ cursor: 'pointer' } as any)]}
        >
          <View style={[styles.icono, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name={p.status === 'archived' ? 'archive-outline' : 'film-outline'} size={scale(20)} color={theme.colors.accentDark} />
          </View>
          <View style={styles.datos}>
            <Text style={[styles.titulo, { color: theme.colors.text }]} numberOfLines={1}>{p.title}</Text>
            <Text style={[styles.detalle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {[
                p.preset && CLAVE_DEL_PRESET[p.preset as keyof typeof CLAVE_DEL_PRESET] ? t(CLAVE_DEL_PRESET[p.preset as keyof typeof CLAVE_DEL_PRESET]) : t('filmmaker.ownFormat'),
                p.aspectRatio,
                t('filmmaker.updatedAgo', { cuando: formato.tiempoRelativo(p.updatedAt) }),
              ].join(' · ')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={scale(18)} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      ))}
      {carga === 'lista' && hayMas && <BotonPequeno icono="chevron-down" etiqueta={t('filmmaker.loadMore')} onPress={() => { void cargarMas(); }} conTexto />}
    </View>
  );
};

const styles = StyleSheet.create({
  bloque: { gap: SPACING.sm },
  pestanas: { flexDirection: 'row', gap: SPACING.sm },
  pestana: { minHeight: 36, paddingHorizontal: SPACING.lg, borderRadius: BORDER_RADIUS.full, borderWidth: 1, justifyContent: 'center' },
  pestanaTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold as any },
  fila: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, borderWidth: 1, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, minHeight: 56 },
  icono: { width: scale(40), height: scale(40), borderRadius: BORDER_RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  datos: { flex: 1, minWidth: 0, gap: 2 },
  titulo: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold as any },
  detalle: { fontSize: FONT_SIZE.xs },
});

export default ProductionList;
