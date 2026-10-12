import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Platform } from 'react-native';
/* `expo-image`, como la rejilla de creaciones: caché en disco, decodificación fuera del hilo de JS y reciclado por pieza. */
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

const isWeb = Platform.OS === 'web';

/**
 * UNA PIEZA DE LA GALERÍA, DIGA LO QUE DIGA SU ETIQUETA.
 *
 * Weë Studio etiqueta por tipo —imagen, video, voz, documento— y Weë Design por
 * clase de diseño —interior, arquitectura, mobiliario—, porque en cada sitio se
 * busca por una cosa distinta. Pero eso es lo ÚNICO distinto: debajo son la
 * misma lámina con la misma etiqueta encima y el mismo título debajo.
 *
 * Así que la etiqueta entra ya resuelta a una clave, y esta pieza no sabe de
 * qué catálogo viene ni tiene por qué saberlo.
 */
export interface CreacionEnLaFila {
  id: string;
  /** La clave de i18n de la etiqueta. Lo que se lee, se traduce. */
  claveTipo: string;
  /** El icono de la lámina, de la familia de Ionicons. */
  icono: string;
  /** Lo que escribió quien la creó. Contenido, no interfaz: no se traduce. */
  titulo: string;
  /**
   * Una creación de MUESTRA —las que ve todo el mundo mientras no tiene ninguna suya— no la escribió nadie: es
   * interfaz, y su título viaja como clave. Si la lleva, manda sobre `titulo`.
   */
  claveTitulo?: string;
  /** El color de la lámina mientras no haya un medio real que enseñar. */
  tono: string;
  /** Solo lo que dura algo: un video. Ya formateado. */
  duracion?: string;
  /**
   * La miniatura, cuando el dato la trae: la dirección de una imagen. Llena la lámina (recortada) y el icono no se pinta.
   * Sin ella, la lámina lisa de siempre. Las muestras no la llevan: no hay nada generado de verdad que enseñar.
   */
  uri?: string;
}

interface Props {
  creaciones: readonly CreacionEnLaFila[];
  onVerTodas: () => void;
  /**
   * El botón de las opciones de una pieza. Sin él no se pinta: una galería que
   * todavía no puede hacer nada con una pieza no enseña un botón que no hace
   * nada.
   */
  onOpciones?: (id: string) => void;
  /** Lo que mide una pieza. Cada sitio tiene su proporción y se respeta. */
  ancho?: number;
  alto?: number;
  /**
   * La clave del título de la fila. Sin ella, «Mis creaciones». Una fila de muestras se rotula como lo que es
   * (`design.examplesTitle`): «Mis creaciones» solo se dice de lo que es de la persona.
   */
  claveDelTitulo?: string;
  /**
   * Qué hay EN LUGAR de las láminas mientras no hay nada que enseñar: `cargando` (lo que ya trae `creaciones.loading`) o `error`
   * (`creaciones.loadFailed`, con su «Reintentar» si hay `onReintentar`). Sin él, las láminas, como siempre. El título y «Ver todas»
   * se quedan: son de la fila, no de lo que traiga.
   */
  estado?: 'cargando' | 'error';
  /** El reintento tras un error. Sin él, el error se dice pero no ofrece nada que pulsar. */
  onReintentar?: () => void;
  /**
   * Abrir una pieza. Sin él las piezas son solo para mirar, como siempre: una galería de muestras no enseña botones que no llevan a
   * ninguna parte. Con él, cada pieza es un botón con su nombre (`creaciones.openCreation`).
   */
  onAbrir?: (id: string) => void;
}

/**
 * MIS CREACIONES, EN FILA.
 *
 * Al final de la portada, después de las puertas: primero se crea, luego se
 * mira lo hecho. Va en fila que se desliza y no en rejilla porque aquí no se
 * busca nada concreto —para eso está "Ver todas", que lleva a la rejilla de
 * verdad, `RejillaDeCreaciones`, la que enseña el material de la cuenta—, aquí
 * se echa un vistazo.
 *
 * ── Por qué una y no dos ────────────────────────────────────────────────────
 *
 * Había dos, `StudioCreations` y `DesignCreations`, y eran la misma fila escrita
 * dos veces: la misma cabecera con "Ver todas →", el mismo `ScrollView`
 * horizontal, la misma lámina redondeada con su etiqueta blanca abajo a la
 * izquierda y el mismo título de una línea. Lo único que de verdad se separaba
 * eran cuatro números y un botón. Cuatro números y un botón no justifican dos
 * componentes: justifican cuatro props.
 *
 * ── Y las láminas siguen lisas, hasta que hay algo que enseñar ──────────────
 *
 * Un color plano con el icono de su clase, porque todavía no hay nada generado
 * de verdad. Tienen la forma exacta que tendrán con contenido dentro, que es lo
 * que hace falta para juzgar si la galería funciona, sin fingir que una foto de
 * archivo es algo que alguien creó. Cuando una pieza trae su miniatura (`uri`), la
 * lámina la enseña; cuando no, sigue lisa.
 *
 * ── Lo que se añadió en R8, y por qué no cambia nada de lo de antes ─────────
 *
 * Weë Design enseña por fin lo que la persona creó, y para eso la fila aprendió cuatro cosas: la miniatura de una pieza (`uri`), un
 * título propio (`claveDelTitulo`), pulsar una pieza (`onAbrir`) y decir que está cargando o que falló (`estado`). Todas son
 * opcionales y sin ellas la pieza dibuja exactamente lo de antes: es lo que ve Weë Studio, y lo comparan, estilo por estilo,
 * `functions/test/design-mis-creaciones.test.mjs` y su dorado.
 */
const FilaDeCreaciones: React.FC<Props> = ({
  creaciones, onVerTodas, onOpciones, ancho = scale(132), alto = scale(150),
  claveDelTitulo, estado, onReintentar, onAbrir,
}) => {
  const { theme } = useTheme();
  const t = useT();

  const pieza = (c: CreacionEnLaFila) => {
    /* El título es de quien lo creó: contenido, no interfaz. */
    const titulo = c.claveTitulo ? t(c.claveTitulo) : c.titulo;
    const dentro = (
      <>
        <View style={[styles.lamina, { height: alto, backgroundColor: c.tono }]}>
          {c.uri ? (
            <Image
              source={{ uri: c.uri }}
              style={styles.miniatura}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={c.id}
              transition={150}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <Ionicons name={c.icono as any} size={scale(30)} color="rgba(31, 41, 55, 0.35)" />
          )}

          {/* Los videos dicen cuánto duran. Lo demás no tiene duración que decir. */}
          {!!c.duracion && (
            <View style={styles.duracion}>
              <Text style={styles.duracionTexto}>{c.duracion}</Text>
            </View>
          )}

          <View style={styles.sobreLamina}>
            <View style={styles.etiqueta}>
              <Text style={styles.etiquetaTexto}>{t(c.claveTipo)}</Text>
            </View>
            {!!onOpciones && (
              <TouchableOpacity
                style={styles.opciones}
                onPress={() => onOpciones(c.id)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={t('studio.creationOptions')}
              >
                <Ionicons name="ellipsis-horizontal" size={scale(15)} color="#1F2937" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        <Text style={[styles.titulo, { color: theme.colors.textSecondary }]} numberOfLines={1}>{titulo}</Text>
      </>
    );

    return onAbrir ? (
      <TouchableOpacity
        key={c.id}
        style={[styles.pieza, { width: ancho }, isWeb && ({ cursor: 'pointer' } as any)]}
        onPress={() => onAbrir(c.id)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={t('creaciones.openCreation', { nombre: titulo })}
      >
        {dentro}
      </TouchableOpacity>
    ) : (
      <View key={c.id} style={[styles.pieza, { width: ancho }]}>
        {dentro}
      </View>
    );
  };

  return (
    <View style={styles.bloque}>
      <View style={styles.cabecera}>
        <Text style={[styles.seccion, { color: theme.colors.text }]}>{claveDelTitulo ? t(claveDelTitulo) : t('studio.creationsTitle')}</Text>
        <TouchableOpacity
          onPress={onVerTodas}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          style={isWeb ? ({ cursor: 'pointer' } as any) : undefined}
        >
          <Text style={[styles.verTodas, { color: theme.colors.textSecondary }]}>{t('studio.seeAll')} →</Text>
        </TouchableOpacity>
      </View>

      {estado === 'cargando' ? (
        /* Los textos y la rueda son los de siempre de «Mis creaciones» (`MisCreacionesScreen`): ningún patrón nuevo. */
        <View style={[styles.estado, { height: alto }]} accessibilityLiveRegion="polite">
          <ActivityIndicator color={theme.colors.accent} />
          <Text style={[styles.estadoTexto, { color: theme.colors.textSecondary }]}>{t('creaciones.loading')}</Text>
        </View>
      ) : estado === 'error' ? (
        <View
          style={[styles.estado, styles.fallo, { minHeight: alto, backgroundColor: theme.colors.card, borderColor: theme.colors.error }]}
          accessibilityLiveRegion="polite"
        >
          <Text style={[styles.estadoTitulo, { color: theme.colors.text }]}>{t('creaciones.loadFailed')}</Text>
          {!!onReintentar && (
            <TouchableOpacity
              onPress={onReintentar}
              style={[styles.reintentar, { backgroundColor: theme.colors.accent }]}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t('creaciones.retry')}
            >
              <Text style={styles.reintentarTexto}>{t('creaciones.retry')}</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fila}>
          {creaciones.map(pieza)}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  bloque: { gap: SPACING.md },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
  },
  seccion: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold },
  verTodas: { fontSize: FONT_SIZE.sm },
  fila: { paddingHorizontal: SPACING.xl, gap: SPACING.md },
  pieza: { gap: SPACING.sm },
  lamina: {
    width: '100%',
    borderRadius: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  /* La miniatura llena la lámina; la etiqueta y la duración, que se pintan después, quedan encima. */
  miniatura: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  sobreLamina: {
    position: 'absolute',
    left: SPACING.sm,
    right: SPACING.sm,
    bottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  etiqueta: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: scale(3),
    borderRadius: BORDER_RADIUS.full,
  },
  etiquetaTexto: { fontSize: scale(11), fontWeight: FONT_WEIGHT.medium, color: '#1F2937' },
  opciones: {
    width: scale(24),
    height: scale(24),
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  duracion: {
    position: 'absolute',
    right: SPACING.sm,
    top: SPACING.sm,
    backgroundColor: 'rgba(31, 41, 55, 0.75)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: scale(2),
    borderRadius: BORDER_RADIUS.sm,
  },
  duracionTexto: { fontSize: scale(11), color: '#FFFFFF', fontWeight: FONT_WEIGHT.medium },
  titulo: { fontSize: FONT_SIZE.xs, paddingHorizontal: scale(2) },
  /* Cargando o con un fallo: ocupa el sitio de las láminas, alineado con el título (el mismo margen de los lados). */
  estado: {
    marginHorizontal: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  estadoTexto: { fontSize: FONT_SIZE.sm },
  fallo: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
  },
  estadoTitulo: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, textAlign: 'center' },
  reintentar: {
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.lg,
    height: scale(44),
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reintentarTexto: { color: '#1F2937', fontWeight: FONT_WEIGHT.semibold, fontSize: FONT_SIZE.sm },
});

export default FilaDeCreaciones;
