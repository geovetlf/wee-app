/**
 * EL MARCO DE LAS PANTALLAS DE BOOST: cabecera con volver, título y una acción opcional, y una columna centrada de
 * hasta 640 de ancho con 16 de margen en el teléfono. Sin scroll horizontal en ningún ancho.
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useIdioma } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { SPACING, FONT_SIZE, FONT_WEIGHT } from '../../constants/design';
import { scale } from '../../utils/scale';

interface Props {
  titulo: string;
  accion?: { texto: string; icono: string; onPress: () => void };
  children: React.ReactNode;
  pie?: React.ReactNode;
  /** Alto del teclado abierto (useAlturaDelTeclado): se suma abajo para que el campo no quede tapado. */
  espacioDelTeclado?: number;
}

const MarcoDeBoost: React.FC<Props> = ({ titulo, accion, children, pie, espacioDelTeclado = 0 }) => {
  const { theme } = useTheme();
  const { t } = useIdioma();
  const dir = useDireccion();
  const navigation = useNavigation<any>();
  const volver = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main'));
  return (
    <SafeAreaView style={[m.pantalla, dir.contenedor, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={[m.cabecera, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={volver} style={m.icono} accessibilityRole="button" accessibilityLabel={t('common.back')} hitSlop={10}>
          <Ionicons name="arrow-back" size={scale(24)} color={theme.colors.text} style={dir.espejo} />
        </TouchableOpacity>
        <Text style={[m.titulo, dir.texto, { color: theme.colors.text }]} accessibilityRole="header" numberOfLines={1}>{titulo}</Text>
        {accion ? (
          <TouchableOpacity onPress={accion.onPress} style={m.accion} accessibilityRole="button" accessibilityLabel={accion.texto} hitSlop={6}>
            <Ionicons name={accion.icono as any} size={scale(18)} color={theme.colors.text} />
            <Text style={[m.accionTexto, dir.texto, { color: theme.colors.text }]} numberOfLines={1}>{accion.texto}</Text>
          </TouchableOpacity>
        ) : (
          <View style={m.icono} />
        )}
      </View>
      <ScrollView contentContainerStyle={[m.contenido, espacioDelTeclado > 0 ? { paddingBottom: scale(140) + espacioDelTeclado } : null]} style={m.flex} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {pie ? <View style={[m.pie, { borderTopColor: theme.colors.border, backgroundColor: theme.colors.background }]}>{pie}</View> : null}
    </SafeAreaView>
  );
};

const m = StyleSheet.create({
  pantalla: { flex: 1 },
  flex: { flex: 1 },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  icono: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titulo: { flex: 1, minWidth: 0, fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold },
  accion: { flexDirection: 'row', alignItems: 'center', gap: scale(6), minHeight: 44, maxWidth: '50%', paddingHorizontal: SPACING.sm },
  accionTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, flexShrink: 1 },
  contenido: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: scale(140), gap: SPACING.lg, width: '100%', maxWidth: 640, alignSelf: 'center' },
  pie: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, alignItems: 'center' },
});

export default MarcoDeBoost;
