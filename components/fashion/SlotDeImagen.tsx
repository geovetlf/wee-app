import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

interface Props {
  claveTitulo: string;
  claveAyuda: string;
  obligatorio: boolean;
  uri?: string;
  onElegir: (uri: string) => void;
  onQuitar: () => void;
}

const esWeb = Platform.OS === 'web';

/**
 * UN HUECO PARA UNA IMAGEN DEL ENCARGO (tu foto, la prenda, una referencia).
 *
 * Elige de la galería con el mismo selector que ya usa Weë (`expo-image-picker`). NO sube nada y NO guarda nada: la
 * imagen vive solo en esta pantalla hasta que exista un flujo de imagen validado, que la subirá por
 * `services/creatorUploads.ts` (la única ruta que el servidor acepta). Así no se almacena ninguna foto personal de más.
 */
const SlotDeImagen: React.FC<Props> = ({ claveTitulo, claveAyuda, obligatorio, uri, onElegir, onQuitar }) => {
  const { theme } = useTheme();
  const t = useT();
  const [ocupado, setOcupado] = useState(false);

  const elegir = async () => {
    if (ocupado) return;
    setOcupado(true);
    try {
      if (!esWeb) {
        const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permiso.granted) return;
      }
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, allowsMultipleSelection: false });
      if (!r.canceled && r.assets[0]?.uri) onElegir(r.assets[0].uri);
    } catch (error) {
      console.warn('No se pudo elegir la imagen:', error);
    } finally {
      setOcupado(false);
    }
  };

  return (
    <View style={[styles.fila, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`${t(claveTitulo)}. ${t('fashion.addImage')}`}
        onPress={elegir}
        style={[styles.miniatura, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
      >
        {ocupado ? (
          <ActivityIndicator color={theme.colors.accentDark} />
        ) : uri ? (
          <Image source={{ uri }} style={styles.imagen} contentFit="cover" accessibilityIgnoresInvertColors />
        ) : (
          <Ionicons name="image-outline" size={scale(26)} color={theme.colors.textSecondary} />
        )}
      </TouchableOpacity>
      <View style={styles.textos}>
        <View style={styles.titulos}>
          <Text style={[styles.titulo, { color: theme.colors.text }]}>{t(claveTitulo)}</Text>
          {!obligatorio && <Text style={[styles.etiqueta, { color: theme.colors.textSecondary, borderColor: theme.colors.border }]}>{t('fashion.optionalTag')}</Text>}
        </View>
        <Text style={[styles.ayuda, { color: theme.colors.textSecondary }]}>{t(claveAyuda)}</Text>
        <View style={styles.acciones}>
          <TouchableOpacity accessibilityRole="button" onPress={elegir} hitSlop={8}>
            <Text style={[styles.accion, { color: theme.colors.accentDark }]}>{t('fashion.addImage')}</Text>
          </TouchableOpacity>
          {uri ? (
            <TouchableOpacity accessibilityRole="button" onPress={onQuitar} hitSlop={8}>
              <Text style={[styles.accion, { color: theme.colors.textSecondary }]}>{t('fashion.removeImage')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', gap: SPACING.md, padding: SPACING.md, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, alignItems: 'center' },
  miniatura: { width: scale(64), height: scale(80), borderRadius: BORDER_RADIUS.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  imagen: { width: '100%', height: '100%' },
  textos: { flex: 1 },
  titulos: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flexWrap: 'wrap' },
  titulo: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold },
  etiqueta: { fontSize: FONT_SIZE.xs, borderWidth: 1, borderRadius: BORDER_RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 1 },
  ayuda: { fontSize: FONT_SIZE.sm, marginTop: 2, lineHeight: scale(18) },
  acciones: { flexDirection: 'row', gap: SPACING.lg, marginTop: SPACING.sm },
  accion: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
});

export default SlotDeImagen;
