import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
/* `expo-image`, como el resto del muro: caché en disco, decodificación fuera del hilo de JS y reciclado por tarjeta. */
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useIdioma } from '../../contexts/IdiomaContext';
import { textoDelServidor } from '../../i18n/servidor';
import { AssetDoc, assetsService } from '../../services/assetsService';
import { CLAVE_DE_ESTADO, CLAVE_DE_TIPO, vistaDeAsset } from '../../services/vistaDeAsset';
import { getExperienceById, experienceLabel } from '../../constants/weeExperiences';
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
  /* Un mundo 3D se ve como lo que es, con su icono: su archivo no es una imagen y no se pinta como una. */
  world: 'planet-outline',
  text: 'text-outline',
};

interface TarjetaProps {
  asset: AssetDoc;
  ancho: string;
  onOpen: (asset: AssetDoc) => void;
  onDelete?: (asset: AssetDoc) => void;
  /** «Conservar como creación» (R9, D-1): solo en «Sin decidir». Sin ella, no se ofrece. */
  onKeep?: (asset: AssetDoc) => void;
  /** Mientras se conserva, el botón queda ocupado. */
  conservando?: boolean;
}

const TarjetaDeCreacion: React.FC<TarjetaProps> = ({ asset, ancho, onOpen, onDelete, onKeep, conservando }) => {
  const { theme } = useTheme();
  const { t, locale } = useIdioma();
  /* El nombre de una creación es el paso del plan que la hizo, escrito por el servidor: en el idioma de quien mira. */
  const nombreDe = (nombre: string | undefined): string | undefined => (nombre ? textoDelServidor(nombre, { t, locale }) : nombre);
  /*
   * TODO LO QUE SE ENSEÑA SALE DE LA PROYECCIÓN, no del documento.
   *
   * Antes esta tarjeta leía `asset.status` y fabricaba su clave de traducción
   * pegando trozos: `creaciones.status${Capitalize(status)}`. Eso ataba la
   * interfaz a los nombres internos del Core —renombrar uno dejaba la pantalla
   * buscando una clave inexistente, sin que nada fallara al compilar— y la
   * misma línea estaba copiada en `MisCreacionesScreen`.
   */
  const vista = vistaDeAsset(asset);
  const miniatura = assetsService.miniatura(asset);
  const url = miniatura?.url ?? null;
  const conImagen = !!url && (vista.tipo === 'image' || vista.tipo === 'video');
  const claveDeTipo = CLAVE_DE_TIPO[vista.tipo];
  const claveDeEstado = vista.estado === 'disponible' ? null : CLAVE_DE_ESTADO[vista.estado];
  const fallo = vista.estado === 'no_se_pudo';

  return (
    <View style={{ width: ancho as never, padding: SPACING.xs }}>
      <TouchableOpacity
        onPress={() => onOpen(asset)}
        onLongPress={onDelete ? () => onDelete(asset) : undefined}
        activeOpacity={0.85}
        style={[styles.card, { backgroundColor: theme.colors.card, borderColor: fallo ? theme.colors.error : theme.colors.border }]}
        accessibilityRole="button"
        accessibilityLabel={t('creaciones.openCreation', { nombre: nombreDe(asset.name) || t(claveDeTipo) })}
        /* El estado también se dice, no solo se pinta: una creación fallida o en proceso no puede sonar igual que una lista. */
        accessibilityHint={claveDeEstado ? t(claveDeEstado) : undefined}
      >
        <View style={[styles.media, { backgroundColor: theme.colors.surface }]}>
          {conImagen ? (
            <Image
              source={{ uri: url as string }}
              style={styles.image}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={asset.assetId}
              transition={150}
              accessibilityIgnoresInvertColors
            />
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
          {!!claveDeEstado && (
            <View style={[styles.statusBadge, { backgroundColor: fallo ? theme.colors.error : theme.colors.accent }]}>
              <Text style={[styles.statusText, { color: fallo ? '#FFFFFF' : '#1F2937' }]}>{t(claveDeEstado)}</Text>
            </View>
          )}
        </View>
        <View style={styles.footer}>
          <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={2}>
            {nombreDe(asset.name) || t(claveDeTipo)}
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
        {!!onKeep && (
          <TouchableOpacity
            onPress={() => onKeep(asset)}
            disabled={conservando}
            activeOpacity={0.85}
            style={[styles.editar, styles.conservar, { borderColor: theme.colors.accent, backgroundColor: theme.colors.accent + '1A' }]}
            accessibilityRole="button"
            accessibilityLabel={t('creaciones.keepAsCreationOf', { nombre: nombreDe(asset.name) || t(claveDeTipo) })}
          >
            <Ionicons name="bookmark-outline" size={scale(14)} color={theme.colors.text} />
            <Text style={[styles.editarTexto, { color: theme.colors.text }]} numberOfLines={1}>
              {conservando ? t('creaciones.keeping') : t('creaciones.keepAsCreation')}
            </Text>
          </TouchableOpacity>
        )}
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
  onKeep?: (asset: AssetDoc) => void;
  /** El material que se está conservando, si alguno. */
  conservando?: string | null;
}

export const RejillaDeCreaciones: React.FC<RejillaProps> = ({ items, columnas, onOpen, onDelete, onKeep, conservando }) => {
  const ancho = `${(100 / columnas).toFixed(2)}%`;
  return (
    <View style={[styles.grid, { marginHorizontal: -SPACING.xs }]}>
      {items.map((asset) => (
        <TarjetaDeCreacion key={asset.assetId} asset={asset} ancho={ancho} onOpen={onOpen} onDelete={onDelete} onKeep={onKeep} conservando={conservando === asset.assetId} />
      ))}
    </View>
  );
};

/* ═══ LAS CREACIONES FINALES (R9) ═══════════════════════════════════════════
 *
 * «Mis creaciones» enseña lo que la persona DECIDIÓ conservar, no cada archivo
 * que salió de una generación. Una creación final es una referencia a uno o
 * varios materiales de la cuenta, con su nombre, tipo, herramienta, proyecto de
 * origen y UBICACIÓN —dónde está el archivo, que no es su estado—.
 *
 * La forma es la del contrato (`services/cicloDeTrabajo.ts` · `CreacionFinal`)
 * más lo que la pantalla ya resolvió: el nombre del proyecto de origen (si lo
 * sabe) y la miniatura (solo si existe de verdad). Lo que falta no se pinta.
 */

export type UbicacionVisible = 'local' | 'wee_cloud' | 'remoto_legado';

export interface CreacionVisible {
  id: string;
  nombre: string;
  tipo: string;
  herramienta: string | null;
  finalizadaEn: number;
  ubicacion: UbicacionVisible;
  /** El nombre del proyecto de origen, ya resuelto. Lo escribió la persona: no se traduce. */
  proyectoOrigen?: string | null;
  miniatura?: string | null;
}

export const CLAVE_DE_UBICACION: Record<UbicacionVisible, string> = {
  local: 'creaciones.locationLocal',
  wee_cloud: 'creaciones.locationCloud',
  remoto_legado: 'creaciones.locationLegacy',
};

const ICONO_DE_UBICACION: Record<UbicacionVisible, keyof typeof Ionicons.glyphMap> = {
  local: 'phone-portrait-outline',
  wee_cloud: 'cloud-outline',
  remoto_legado: 'link-outline',
};

const esTipoConocido = (tipo: string): tipo is AssetDoc['kind'] => tipo in CLAVE_DE_TIPO;

interface TarjetaFinalProps {
  creacion: CreacionVisible;
  ancho: string;
  /** «Volver a editar». Si falta, no se ofrece: ningún botón que no haga lo que dice. */
  onEditAgain?: (creacion: CreacionVisible) => void;
  /** Mientras se abre para editar, el botón queda ocupado. */
  ocupada?: boolean;
}

const TarjetaDeCreacionFinal: React.FC<TarjetaFinalProps> = ({ creacion, ancho, onEditAgain, ocupada }) => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const tipo = esTipoConocido(creacion.tipo) ? creacion.tipo : null;
  const claveDeTipo = tipo ? CLAVE_DE_TIPO[tipo] : null;
  const conImagen = !!creacion.miniatura && (tipo === 'image' || tipo === 'video');
  const experiencia = creacion.herramienta ? getExperienceById(creacion.herramienta) : undefined;
  const lugar = t(CLAVE_DE_UBICACION[creacion.ubicacion]);

  return (
    <View style={{ width: ancho as never, padding: SPACING.xs }}>
      <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={[styles.media, { backgroundColor: theme.colors.surface }]}>
          {conImagen ? (
            <Image
              source={{ uri: creacion.miniatura as string }}
              style={styles.image}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={creacion.id}
              transition={150}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View style={styles.placeholder}>
              <Ionicons name={tipo ? ICONO_POR_TIPO[tipo] : 'sparkles-outline'} size={scale(34)} color={theme.colors.textSecondary} />
            </View>
          )}
          {!!claveDeTipo && (
            <View style={[styles.kindBadge, { backgroundColor: 'rgba(31, 41, 55, 0.72)' }]}>
              <Text style={styles.kindText}>{t(claveDeTipo)}</Text>
            </View>
          )}
          {/* Dónde está el archivo: un dato, no un estado. Se dice también en voz alta. */}
          <View
            style={[styles.statusBadge, styles.lugar, { backgroundColor: theme.colors.card }]}
            accessibilityLabel={t('creaciones.locationLabel', { lugar })}
          >
            <Ionicons name={ICONO_DE_UBICACION[creacion.ubicacion]} size={scale(12)} color={theme.colors.text} />
            <Text style={[styles.statusText, { color: theme.colors.text }]} numberOfLines={1}>{lugar}</Text>
          </View>
        </View>
        <View style={styles.cuerpo}>
          <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={2}>{creacion.nombre}</Text>
          {!!experiencia && (
            <Text style={[styles.meta, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {t('creaciones.createdWith', { nombre: experienceLabel(experiencia, t) })}
            </Text>
          )}
          {!!creacion.proyectoOrigen && (
            <Text style={[styles.meta, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {t('creaciones.fromProject', { proyecto: creacion.proyectoOrigen })}
            </Text>
          )}
          <Text style={[styles.meta, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {t('creaciones.savedAgo', { cuando: formato.tiempoRelativo(creacion.finalizadaEn) })}
          </Text>
          {!!onEditAgain && (
            <TouchableOpacity
              onPress={() => onEditAgain(creacion)}
              disabled={ocupada}
              activeOpacity={0.85}
              style={[styles.editar, { borderColor: theme.colors.accent, backgroundColor: theme.colors.accent + '1A' }]}
              accessibilityRole="button"
              accessibilityLabel={t('creaciones.editAgainOf', { nombre: creacion.nombre })}
            >
              {ocupada ? (
                <ActivityIndicator color={theme.colors.accentDark} />
              ) : (
                <>
                  <Ionicons name="create-outline" size={scale(14)} color={theme.colors.text} />
                  <Text style={[styles.editarTexto, { color: theme.colors.text }]} numberOfLines={1}>{t('creaciones.editAgain')}</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

interface RejillaFinalProps {
  items: CreacionVisible[];
  columnas: 2 | 3 | 4;
  onEditAgain?: (creacion: CreacionVisible) => void;
  /** La creación que se está abriendo para editar, si alguna. */
  abriendo?: string | null;
}

export const RejillaDeCreacionesFinales: React.FC<RejillaFinalProps> = ({ items, columnas, onEditAgain, abriendo }) => {
  const ancho = `${(100 / columnas).toFixed(2)}%`;
  return (
    <View style={[styles.grid, { marginHorizontal: -SPACING.xs }]}>
      {items.map((creacion) => (
        <TarjetaDeCreacionFinal key={creacion.id} creacion={creacion} ancho={ancho} onEditAgain={onEditAgain} ocupada={abriendo === creacion.id} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  cuerpo: {
    gap: scale(4),
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  meta: {
    fontSize: scale(11),
  },
  lugar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    maxWidth: '70%',
  },
  editar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(4),
    minHeight: scale(34),
    marginTop: scale(4),
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
  },
  conservar: {
    marginHorizontal: SPACING.sm,
    marginBottom: SPACING.sm,
    marginTop: 0,
  },
  editarTexto: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },
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
