import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
/* `expo-image`, como el resto de la App: caché en disco y reciclado por tarjeta. */
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useIdioma } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { textoDelServidor } from '../../i18n/servidor';
import { formatearFecha } from '../../i18n/formato';
import { AssetDoc, assetsService } from '../../services/assetsService';
import { CLAVE_DE_ESTADO, CLAVE_DE_TIPO, vistaDeAsset } from '../../services/vistaDeAsset';
import { PALETA_BIBLIOTECA as P } from './paleta';
import { FONT_WEIGHT } from '../../constants/design';

/**
 * LA GALERÍA DE «MIS CREACIONES» (versión App).
 *
 * Es la hermana de `components/creator/RejillaDeCreaciones.tsx`, que sigue
 * siendo la de Weë Creator (su Inicio y su «Mis creaciones»). Esta es de la
 * App y de nadie más: mismo dato, misma proyección (`vistaDeAsset`), mismas
 * reglas —ningún identificador, ningún proveedor, ningún porcentaje inventado—,
 * con el diseño nuevo de la biblioteca.
 *
 * Cada tarjeta enseña lo que el material ES:
 *   · imagen o vídeo: su imagen (el vídeo, con su botón de reproducir);
 *   · audio, documento, 3D y mundo 3D: una loseta lavanda con su icono — un
 *     archivo 3D nunca se pinta como una foto;
 *   · el tipo, el estado SOLO cuando no es «listo», el nombre y la fecha;
 *   · sus acciones: descargar (si hay archivo que descargar) y eliminar.
 */

const ICONO_POR_TIPO: Record<AssetDoc['kind'], keyof typeof Ionicons.glyphMap> = {
  image: 'image-outline',
  video: 'videocam-outline',
  audio: 'musical-notes-outline',
  document: 'document-text-outline',
  model3d: 'cube-outline',
  /* Un mundo 3D se ve como lo que es, con su icono: su archivo no es una imagen y no se pinta como una. */
  world: 'planet-outline',
  text: 'text-outline',
};

/** «application/pdf» → «PDF». Es el formato del archivo, no una frase: no se traduce. */
const formatoDeArchivo = (mime?: string): string | null => {
  const sub = mime?.split('/')[1]?.split(/[;+.-]/).pop();
  return sub && sub.length <= 5 ? sub.toLocaleUpperCase('en-US') : null;
};

interface TarjetaProps {
  asset: AssetDoc;
  ancho: string;
  onOpen: (asset: AssetDoc) => void;
  onDelete?: (asset: AssetDoc) => void;
  onDownload?: (asset: AssetDoc) => void;
}

const TarjetaDeCreacion: React.FC<TarjetaProps> = ({ asset, ancho, onOpen, onDelete, onDownload }) => {
  const { t, locale } = useIdioma();
  const dir = useDireccion();
  /* El nombre de una creación es el paso del plan que la hizo, escrito por el servidor: en el idioma de quien mira. */
  const nombreDe = (nombre: string | undefined): string | undefined => (nombre ? textoDelServidor(nombre, { t, locale }) : nombre);
  const vista = vistaDeAsset(asset);
  const miniatura = assetsService.miniatura(asset);
  const url = miniatura?.url ?? null;
  const conImagen = !!url && (vista.tipo === 'image' || vista.tipo === 'video');
  const claveDeTipo = CLAVE_DE_TIPO[vista.tipo];
  const claveDeEstado = vista.estado === 'disponible' ? null : CLAVE_DE_ESTADO[vista.estado];
  const fallo = vista.estado === 'no_se_pudo';
  const descargable = !!onDownload && vista.estado === 'disponible' && !!assetsService.urlDeEntrega(asset) && asset.kind !== 'text';
  const nombre = nombreDe(asset.name) || t(claveDeTipo);
  const formato = asset.kind === 'document' ? formatoDeArchivo(asset.mimeType) : null;
  const fecha = asset.createdAt ? formatearFecha(asset.createdAt, locale, { day: 'numeric', month: 'short', year: 'numeric' }) : null;

  return (
    <View style={{ width: ancho as never, padding: 6 }}>
      <View style={[styles.tarjeta, fallo && { borderColor: P.error }]}>
        <TouchableOpacity
          onPress={() => onOpen(asset)}
          onLongPress={onDelete ? () => onDelete(asset) : undefined}
          activeOpacity={0.88}
          style={styles.media}
          accessibilityRole="button"
          accessibilityLabel={t('creaciones.openCreation', { nombre })}
          /* El estado también se dice, no solo se pinta. */
          accessibilityHint={claveDeEstado ? t(claveDeEstado) : undefined}
        >
          {conImagen ? (
            <Image
              source={{ uri: url as string }}
              style={styles.imagen}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={asset.assetId}
              transition={150}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View style={styles.loseta}>
              <View style={styles.losetaIcono}>
                <Ionicons name={ICONO_POR_TIPO[asset.kind]} size={30} color={P.morado} />
              </View>
              {!!formato && <Text style={styles.formato}>{formato}</Text>}
            </View>
          )}
          {(asset.kind === 'video' || asset.kind === 'audio') && vista.estado === 'disponible' && (
            <View style={styles.reproducir} pointerEvents="none">
              <Ionicons name="play" size={18} color={conImagen ? '#FFFFFF' : P.morado} style={{ marginStart: 2 }} />
            </View>
          )}
          <View style={[styles.tipo, dir.alInicio(10)]}>
            <Ionicons name={ICONO_POR_TIPO[asset.kind]} size={12} color={P.texto} />
            <Text style={styles.tipoTexto} numberOfLines={1}>{t(claveDeTipo)}</Text>
          </View>
          {!!claveDeEstado && (
            <View style={[styles.estado, dir.alFinal(10), { backgroundColor: fallo ? P.error : P.morado }]}>
              <Text style={styles.estadoTexto} numberOfLines={1}>{t(claveDeEstado)}</Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.pie}>
          <Text style={[styles.nombre, dir.texto]} numberOfLines={2}>{nombre}</Text>
          <View style={styles.filaMeta}>
            <Text style={[styles.meta, dir.texto]} numberOfLines={1}>{fecha ?? ''}</Text>
            {descargable && (
              <TouchableOpacity
                onPress={() => onDownload?.(asset)}
                style={styles.accion}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={t('creaciones.download')}
              >
                <Ionicons name="download-outline" size={18} color={P.textoSuave} />
              </TouchableOpacity>
            )}
            {!!onDelete && (
              <TouchableOpacity
                onPress={() => onDelete(asset)}
                style={styles.accion}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={t('creaciones.delete')}
              >
                <Ionicons name="trash-outline" size={18} color={P.textoSuave} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

interface GaleriaProps {
  items: AssetDoc[];
  /** Cuántas por fila: dos en el teléfono, tres en tableta, cuatro en escritorio. */
  columnas: 2 | 3 | 4;
  onOpen: (asset: AssetDoc) => void;
  onDelete?: (asset: AssetDoc) => void;
  onDownload?: (asset: AssetDoc) => void;
}

export const GaleriaDeCreaciones: React.FC<GaleriaProps> = ({ items, columnas, onOpen, onDelete, onDownload }) => {
  const ancho = `${(100 / columnas).toFixed(2)}%`;
  return (
    <View style={styles.rejilla}>
      {items.map((asset) => (
        <TarjetaDeCreacion key={asset.assetId} asset={asset} ancho={ancho} onOpen={onOpen} onDelete={onDelete} onDownload={onDownload} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  rejilla: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  tarjeta: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: P.borde,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  media: {
    aspectRatio: 1,
    width: '100%',
    backgroundColor: P.lavandaSuave,
  },
  imagen: {
    width: '100%',
    height: '100%',
  },
  loseta: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  losetaIcono: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: P.lavanda,
  },
  formato: {
    color: P.morado,
    fontSize: 12,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 0.6,
  },
  reproducir: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(31, 41, 55, 0.45)',
  },
  tipo: {
    position: 'absolute',
    top: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '70%',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
  },
  tipoTexto: {
    color: P.texto,
    fontSize: 11,
    fontWeight: FONT_WEIGHT.semibold,
    flexShrink: 1,
  },
  estado: {
    position: 'absolute',
    bottom: 10,
    maxWidth: '80%',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  estadoTexto: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: FONT_WEIGHT.semibold,
  },
  pie: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 2,
  },
  nombre: {
    color: P.texto,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: FONT_WEIGHT.semibold,
  },
  filaMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 32,
  },
  meta: {
    flex: 1,
    color: P.textoSuave,
    fontSize: 12,
  },
  accion: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default GaleriaDeCreaciones;
