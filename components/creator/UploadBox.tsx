import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { SpecialistConfig } from '../../constants/specialists';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

interface UploadBoxProps {
  config: NonNullable<SpecialistConfig['upload']>;
  onPick: (uri: string) => void;
}

const isWeb = Platform.OS === 'web';

/** "Sube tu foto aquí": galería o cámara; devuelve la foto elegida. */
const UploadBox: React.FC<UploadBoxProps> = ({ config, onPick }) => {
  const { theme } = useTheme();
  const t = useT();
  const [busy, setBusy] = useState(false);

  const pick = async (source: 'library' | 'camera') => {
    if (busy) return;
    setBusy(true);
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) return;
        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 });
        if (!result.canceled && result.assets[0]?.uri) onPick(result.assets[0].uri);
        return;
      }
      if (!isWeb) {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, allowsMultipleSelection: false });
      if (!result.canceled && result.assets[0]?.uri) onPick(result.assets[0].uri);
    } catch (error) {
      console.warn('No se pudo elegir la foto:', error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.row}>
      <TouchableOpacity
        onPress={() => pick('library')}
        activeOpacity={0.85}
        disabled={busy}
        style={[styles.dropzone, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
        accessibilityLabel={config.title}
      >
        <View style={[styles.iconCircle, { backgroundColor: theme.colors.accent + '26' }]}>
          {busy ? <ActivityIndicator color={theme.colors.accent} /> : <Ionicons name="cloud-upload-outline" size={scale(26)} color={theme.colors.accentDark} />}
        </View>
        <View style={styles.texts}>
          <Text style={[styles.title, { color: theme.colors.text }]}>{config.title}</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>{config.subtitle}</Text>
          <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>{config.hint}</Text>
        </View>
        {!!config.button && (
          <View style={[styles.button, { backgroundColor: theme.colors.accent }]}>
            <Text style={styles.buttonText}>{config.button}</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={[styles.side, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Text style={[styles.sideTitle, { color: theme.colors.textSecondary }]}>{t('weeai.orAlso')}</Text>
        {!isWeb && (
          <TouchableOpacity onPress={() => pick('camera')} activeOpacity={0.8} style={[styles.sideButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Ionicons name="camera-outline" size={scale(18)} color={theme.colors.text} />
            <Text style={[styles.sideButtonText, { color: theme.colors.text }]}>{t('weeai.takeAPhoto')}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => pick('library')} activeOpacity={0.8} style={[styles.sideButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Ionicons name="images-outline" size={scale(18)} color={theme.colors.text} />
          <Text style={[styles.sideButtonText, { color: theme.colors.text }]}>{t('weeai.pickFromPhotos')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  dropzone: {
    flex: 1,
    minWidth: scale(260),
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  iconCircle: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    gap: scale(2),
  },
  title: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
  },
  subtitle: {
    fontSize: FONT_SIZE.sm,
  },
  hint: {
    fontSize: FONT_SIZE.xs,
    marginTop: scale(2),
  },
  button: {
    height: scale(40),
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#1F2937',
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
  side: {
    width: scale(200),
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  sideTitle: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },
  sideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    minHeight: scale(40),
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  sideButtonText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
  },
});

export default UploadBox;
