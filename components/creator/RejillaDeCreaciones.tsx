import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { AssetDoc, assetsService } from '../../services/assetsService';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

/**
 * LA REJILLA DE CREACIONES. El primer componente de Weë que enseña un
 * material como lo que es: una imagen, no un emoji con una frase.
 *
 * ── Qué enseña cada tarjeta, y de dónde ─────────────────────────────────────
 *
 *   · la imagen o el póster, por la URL de entrega del material (o la de su
 *     miniatura, cuando el servidor haya hecho una);
 *   · para lo que no tiene imagen —audio, documento, 3D— un icono grande y
 *     el tipo escrito;
 *   · el estado, SOLO cuando no es «listo»: procesando, subiendo, no salió
 *     bien. Un estado que se ve siempre deja de decir nada;
 *   · el nombre, que es el propósito del paso que lo produjo.
 *
 * ── Lo que NO enseña ───────────────────────────────────────────────────────
 *
 * Ningún identificador, ninguna referencia al almacén, ningún proveedor. Eso
 * es infraestructura y la persona no tiene por qué verlo.
 *
 * ── Y lo que no inventa ─────────────────────────────────────────────────────
 *
 * Ningún porcentaje. Si un material se está procesando, la tarjeta dice
 * «procesando», y punto: no hay una fuente real de progreso y no se simula.
 */

const ICONO_POR_TIPO: Record<AssetDoc['kind'], keyof typeof Ionicons.glyphMap> = {
  image: 'image-outline',
  video: 'videocam-outline',
  audio: 'musical-notes-outline',
  document: 'document-text-outline',
  model3d: 'cube-outline',
  text: 'text-outline',
};

interface TarjetaProps {
  asset: AssetDoc;
  ancho: string;
  onOpen: (asset: AssetDoc) => void;
  onDelete?: (asset: AssetDoc) => void;
}

const TarjetaDeCreacion: React.FC<TarjetaProps> = ({ asset, ancho, onOpen, onDelete }) => {
  const { theme } = useTheme();
  const t = useT();
  const url = assetsService.urlDeMiniatura(asset);
  const conImagen = !!url && (asset.kind === 'image' || asset.kind === 'video');
  const claveDeTipo = `creaciones.kind${asset.kind.charAt(0).toUpperCase()}${asset.kind.slice(1)}` as const;
  const claveDeEstado = asset.status === 'ready' ? null : (`creaciones.status${asset.status.charAt(0).toUpperCase()}${asset.status.slice(1)}` as const);
  const fallo = asset.status === 'failed';

  return (
    <View style={{ width: ancho as never, padding: SPACING.xs }}>
      <TouchableOpacity
        onPress={() => onOpen(asset)}
        onLongPress={onDelete ? () => onDelete(asset) : undefined}
        activeOpacity={0.85}
        style={[styles.card, { backgroundColor: theme.colors.card, borderColor: fallo ? theme.colors.error : theme.colors.border }]}
        accessibilityRole="button"
        accessibilityLabel={t('creaciones.openCreation', { nombre: asset.name || t(claveDeTipo) })}
      >
        <View style={[styles.media, { backgroundColor: theme.colors.surface }]}>
          {conImagen ? (
            <Image source={{ uri: url as string }} style={styles.image} resizeMode="cover" accessibilityIgnoresInvertColors />
          ) : (
            <View style={styles.placeholder}>
              <Ionicons name={ICONO_POR_TIPO[asset.kind]} size={scale(34)} color={theme.colors.textSecondary} />
            </View>
          )}
          {asset.kind === 'video' && (
            <View style={styles.play}>
              <Ionicons name="play" size={scale(16)} color="#FFFFFF" />
            </View>
          )}
          <View style={[styles.kindBadge, { backgroundColor: 'rgba(31, 41, 55, 0.72)' }]}>
            <Text style={styles.kindText}>{t(claveDeTipo)}</Text>
          </View>
          {claveDeEstado && (
            <View style={[styles.statusBadge, { backgroundColor: fallo ? theme.colors.error : theme.colors.accent }]}>
              <Text style={[styles.statusText, { color: fallo ? '#FFFFFF' : '#1F2937' }]}>{t(claveDeEstado)}</Text>
            </View>
          )}
        </View>
        <View style={styles.footer}>
          <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={2}>
            {asset.name || t(claveDeTipo)}
          </Text>
          {onDelete && (
            <TouchableOpacity
              onPress={() => onDelete(asset)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={t('creaciones.delete')}
            >
              <Ionicons name="trash-outline" size={scale(16)} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
};

interface RejillaProps {
  items: AssetDoc[];
  /** Cuántas por fila. En teléfono dos; en escritorio, tres o cuatro. */
  columnas: 2 | 3 | 4;
  onOpen: (asset: AssetDoc) => void;
  onDelete?: (asset: AssetDoc) => void;
}

export const RejillaDeCreaciones: React.FC<RejillaProps> = ({ items, columnas, onOpen, onDelete }) => {
  const ancho = `${(100 / columnas).toFixed(2)}%`;
  return (
    <View style={[styles.grid, { marginHorizontal: -SPACING.xs }]}>
      {items.map((asset) => (
        <TarjetaDeCreacion key={asset.assetId} asset={asset} ancho={ancho} onOpen={onOpen} onDelete={onDelete} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  card: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  media: {
    aspectRatio: 1,
    width: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  play: {
    position: 'absolute',
    left: SPACING.sm,
    bottom: SPACING.sm,
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: 'rgba(31, 41, 55, 0.72)',
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
  },
  kindText: {
    color: '#FFFFFF',
    fontSize: scale(11),
    fontWeight: FONT_WEIGHT.semibold,
  },
  statusBadge: {
    position: 'absolute',
    left: SPACING.sm,
    top: SPACING.sm,
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
    borderRadius: BORDER_RADIUS.full,
  },
  statusText: {
    fontSize: scale(11),
    fontWeight: FONT_WEIGHT.semibold,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  name: {
    flex: 1,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
    lineHeight: scale(16),
  },
});

export default RejillaDeCreaciones;
