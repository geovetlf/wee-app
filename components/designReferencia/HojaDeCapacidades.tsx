import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { CAPACIDADES_DE_DESIGN, CATEGORIAS, CLAVE_DE_LA_CATEGORIA, CapacidadDeDesign } from '../../constants/designReferencia';
import { EstadoDeLaCapacidad } from '../../utils/designReferencia';
import { BotonDeCapacidad, Pista } from './piezas';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

interface Props {
  visible: boolean;
  estadoDe: (cap: CapacidadDeDesign) => EstadoDeLaCapacidad;
  onElegir: (cap: CapacidadDeDesign) => void;
  onCerrar: () => void;
}

/**
 * TODO LO QUE WEË DESIGN SABE NOMBRAR (C56, descubrir capacidades).
 *
 * El mapa maestro entero, por categorías (A–L), con el estado de cada capacidad:
 * nada se esconde porque hoy no tenga quien la haga. Tocar una abre su detalle;
 * las que no son de Weë Design salen al final de su categoría, con su motivo.
 */
const HojaDeCapacidades: React.FC<Props> = ({ visible, estadoDe, onElegir, onCerrar }) => {
  const { theme } = useTheme();
  const t = useT();
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCerrar}>
      <View style={[estilos.fondo, { backgroundColor: theme.colors.backdrop }]}>
        <View style={[estilos.hoja, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]} accessibilityViewIsModal>
          <View style={estilos.cabecera}>
            <Ionicons name="compass-outline" size={scale(22)} color={theme.colors.text} />
            <Text style={[estilos.titulo, { color: theme.colors.text }]} accessibilityRole="header">{t('designRef.capCapabilityDiscovery')}</Text>
            <TouchableOpacity onPress={onCerrar} accessibilityRole="button" accessibilityLabel={t('common.close')} style={estilos.cerrar}>
              <Ionicons name="close" size={scale(22)} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={estilos.dentro}>
            <Pista clave="designRef.discoveryHint" />
            {CATEGORIAS.map((categoria) => {
              const caps = CAPACIDADES_DE_DESIGN.filter((x) => x.categoria === categoria);
              const ordenadas = [...caps.filter((x) => x.enDesign), ...caps.filter((x) => !x.enDesign)];
              return (
                <View key={categoria} style={estilos.categoria}>
                  <Text style={[estilos.categoriaNombre, { color: theme.colors.textSecondary }]} accessibilityRole="header">
                    {t('designRef.categoryLabel', { letra: categoria, nombre: t(CLAVE_DE_LA_CATEGORIA[categoria]) })}
                  </Text>
                  {ordenadas.map((cap) => (
                    <BotonDeCapacidad key={cap.id} cap={cap} estado={estadoDe(cap)} onPress={onElegir} />
                  ))}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const estilos = StyleSheet.create({
  fondo: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  hoja: {
    width: '100%',
    maxWidth: scale(720),
    maxHeight: '90%',
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.lg, paddingBottom: SPACING.sm },
  titulo: { flex: 1, fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold },
  cerrar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  dentro: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl, gap: SPACING.md },
  categoria: { gap: SPACING.xs },
  categoriaNombre: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold, marginTop: SPACING.sm },
});

export default HojaDeCapacidades;
