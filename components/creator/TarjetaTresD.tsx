import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useIdioma } from '../../contexts/IdiomaContext';
import { descargarCreacion } from '../../services/assetDownload';
import { CLAVE_DE_TIPO } from '../../services/vistaDeAsset';
import type { DerechosVisibles } from '../../services/escena3d';
import { frasesDeDerechos } from '../../utils/derechosDelMaterial';
import { formatearLista, nombreDeLaRegion } from '../../i18n/formato';
import { notify } from '../../utils/notify';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

/**
 * UN MUNDO 3D (O UN MODELO 3D) COMO LO QUE ES: no una foto.
 *
 * Antes, un resultado `world` caía en la rama de las imágenes y se pintaba con su dirección como si fuera una foto
 * —y se podía publicar como imagen—. Un archivo 3D no se ve en una etiqueta de imagen, y Weë todavía no tiene un visor
 * 3D: esta tarjeta lo dice y no lo disimula. Enseña de qué clase es, cómo se llama, lo que su licencia deja hacer
 * (`frasesDeDerechos`, sin nombrar la licencia) y lo que sí se puede hacer hoy: descargarlo para abrirlo en una app 3D
 * y verlo en «Mis creaciones». Ni un visor de mentira, ni una imagen que no es el mundo.
 */
interface Props {
  tipo: 'world' | 'model3d';
  /** Lo que escribió la persona o el paso que lo hizo. Contenido: no se traduce aquí. */
  nombre?: string;
  /** Los del material, o los visibles que cuenta la puerta: solo se lee lo visible. */
  derechos?: DerechosVisibles;
  /** La dirección de entrega del archivo, si ya la hay. Sin ella no se ofrece descargar. */
  url?: string | null;
  /** El tipo que el material declara: de él sale la extensión al descargarlo, nunca de una suposición. */
  mimeType?: string;
  onVerCreaciones?: () => void;
}

const ICONO: Record<Props['tipo'], keyof typeof Ionicons.glyphMap> = {
  world: 'planet-outline',
  model3d: 'cube-outline',
};

export const TarjetaTresD: React.FC<Props> = ({ tipo, nombre, derechos, url, mimeType, onVerCreaciones }) => {
  const { theme } = useTheme();
  const { t, locale } = useIdioma();
  const [descargando, setDescargando] = useState(false);
  const frases = frasesDeDerechos(derechos);

  const descargar = async () => {
    if (!url || descargando) return;
    setDescargando(true);
    const resultado = await descargarCreacion(url, tipo, mimeType);
    setDescargando(false);
    if (resultado === 'guardado') notify(t('creaciones.downloaded'));
    else if (resultado === 'sin_permiso') notify(t('creaciones.downloadPermission'));
    else if (resultado === 'error') notify(t('creaciones.downloadFailed'));
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={[styles.media, { backgroundColor: theme.colors.surface }]} accessibilityRole="image" accessibilityLabel={t(CLAVE_DE_TIPO[tipo])}>
        <Ionicons name={ICONO[tipo]} size={scale(44)} color={theme.colors.textSecondary} />
        <View style={styles.kindBadge}>
          <Text style={styles.kindText}>{t(CLAVE_DE_TIPO[tipo])}</Text>
        </View>
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={2}>{nombre || t(CLAVE_DE_TIPO[tipo])}</Text>
        <Text style={[styles.note, { color: theme.colors.textSecondary }]}>{t('creaciones.noViewer3d')}</Text>
        {frases.length > 0 && (
          <View style={styles.rights}>
            <Text style={[styles.rightsTitle, { color: theme.colors.text }]}>{t('creaciones.rightsTitle')}</Text>
            {frases.map((f) => (
              <Text key={f.clave} style={[styles.note, { color: theme.colors.textSecondary }]}>
                {f.lugares
                  ? t(f.clave, { lugares: formatearLista(f.lugares.map((c) => nombreDeLaRegion(c, locale)), locale) })
                  : t(f.clave)}
              </Text>
            ))}
          </View>
        )}
        <View style={styles.actions}>
          {!!url && (
            <TouchableOpacity
              onPress={descargar}
              disabled={descargando}
              style={[styles.button, { backgroundColor: theme.colors.accent }]}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t('creaciones.download')}
            >
              {descargando
                ? <ActivityIndicator color="#1F2937" />
                : <Text style={styles.buttonText}>{t('creaciones.download')}</Text>}
            </TouchableOpacity>
          )}
          {!!onVerCreaciones && (
            <TouchableOpacity
              onPress={onVerCreaciones}
              style={[styles.button, styles.secondary, { borderColor: theme.colors.border }]}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t('weeai.myCreations')}
            >
              <Text style={[styles.secondaryText, { color: theme.colors.text }]}>{t('weeai.myCreations')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  media: {
    aspectRatio: 16 / 9,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kindBadge: {
    position: 'absolute',
    right: SPACING.sm,
    top: SPACING.sm,
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(31, 41, 55, 0.72)',
  },
  kindText: {
    color: '#FFFFFF',
    fontSize: scale(11),
    fontWeight: FONT_WEIGHT.semibold,
  },
  body: {
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  title: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
  },
  note: {
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(20),
  },
  rights: {
    marginTop: SPACING.xs,
    gap: scale(2),
  },
  rightsTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  button: {
    paddingHorizontal: SPACING.lg,
    height: scale(40),
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#1F2937',
    fontWeight: FONT_WEIGHT.semibold,
    fontSize: FONT_SIZE.sm,
  },
  secondary: {
    borderWidth: 1,
  },
  secondaryText: {
    fontWeight: FONT_WEIGHT.semibold,
    fontSize: FONT_SIZE.sm,
  },
});

export default TarjetaTresD;
