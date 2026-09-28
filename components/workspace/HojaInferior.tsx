import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { useResponsive } from '../../hooks/useResponsive';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

const isWeb = Platform.OS === 'web';

/**
 * UNA HOJA QUE SUBE DESDE ABAJO — y, en escritorio, un panel centrado.
 *
 * La usan las herramientas del editor (Dividir, Velocidad, Audio…), la
 * exportación y el menú de Weë Studio en el teléfono. Es la misma pieza para
 * todas: el asa, el título, la X y lo que cada una pone dentro. En el teléfono
 * se toca con el pulgar y se cierra tocando fuera; en escritorio no tiene
 * sentido que algo suba desde el borde de una pantalla de 27 pulgadas, así que
 * se centra.
 *
 * No sabe nada de lo que lleva: ni navega, ni guarda, ni cobra.
 */
const HojaInferior: React.FC<{
  visible: boolean;
  titulo: string;
  /** Una línea bajo el título, para decir de qué va la hoja. */
  subtitulo?: string;
  onCerrar: () => void;
  children: React.ReactNode;
  /** Lo que va fijo abajo: el botón principal de la hoja. */
  pie?: React.ReactNode;
}> = ({ visible, titulo, subtitulo, onCerrar, children, pie }) => {
  const { theme } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { isDesktop } = useResponsive();

  return (
    <Modal visible={visible} transparent animationType={isWeb ? 'none' : 'slide'} onRequestClose={onCerrar}>
      <View style={[styles.fondo, isDesktop && styles.fondoCentrado]}>
        <TouchableOpacity
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.backdrop }]}
          activeOpacity={1}
          onPress={onCerrar}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        />
        <View
          style={[
            styles.hoja,
            isDesktop ? styles.hojaCentrada : { paddingBottom: Math.max(insets.bottom, SPACING.lg) },
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
          accessibilityViewIsModal
        >
          {!isDesktop && <View style={[styles.asa, { backgroundColor: theme.colors.border }]} />}
          <View style={styles.cabecera}>
            <View style={styles.titulos}>
              <Text style={[styles.titulo, { color: theme.colors.text }]} accessibilityRole="header">{titulo}</Text>
              {!!subtitulo && <Text style={[styles.subtitulo, { color: theme.colors.textSecondary }]}>{subtitulo}</Text>}
            </View>
            <TouchableOpacity
              onPress={onCerrar}
              style={[styles.cerrar, { backgroundColor: theme.colors.card }]}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
            >
              <Ionicons name="close" size={scale(18)} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.cuerpo} contentContainerStyle={styles.cuerpoDentro} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {!!pie && <View style={styles.pie}>{pie}</View>}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fondo: { flex: 1, justifyContent: 'flex-end' },
  fondoCentrado: { justifyContent: 'center', alignItems: 'center', padding: SPACING.xxl },
  hoja: {
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: SPACING.sm,
    maxHeight: '88%',
  },
  hojaCentrada: {
    width: '100%',
    maxWidth: scale(560),
    borderRadius: BORDER_RADIUS.xl,
    paddingBottom: SPACING.lg,
    maxHeight: '86%',
  },
  asa: { alignSelf: 'center', width: scale(40), height: 4, borderRadius: 2, marginBottom: SPACING.sm },
  cabecera: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md, paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm },
  titulos: { flex: 1, gap: 2 },
  titulo: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold as any },
  subtitulo: { fontSize: FONT_SIZE.sm, lineHeight: FONT_SIZE.sm * 1.45 },
  cerrar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  cuerpo: { flexGrow: 0 },
  cuerpoDentro: { padding: SPACING.lg, gap: SPACING.lg },
  pie: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm },
});

export default HojaInferior;
