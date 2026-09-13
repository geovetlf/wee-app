import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useTabBar } from '../contexts/TabBarContext';
import { FONT_WEIGHT } from '../constants/design';
import { scale } from '../utils/scale';

/**
 * LA NAVEGACIÓN DE WEË. UNA SOLA, PARA TODA LA APLICACIÓN.
 *
 * Cinco destinos y ni uno más: Inicio, Buscar, Crear, WeeTalk y Notificaciones.
 * Los mismos de siempre, con las mismas rutas; lo que cambia es que ahora existe
 * UNA instancia para toda la experiencia —el Home, las experiencias de Weë, los
 * perfiles, las búsquedas— en vez de una barra que solo vivía dentro de las
 * pestañas y desaparecía en cuanto entrabas en Weë Travel o en una publicación.
 *
 * Este componente NO navega. Recibe cuál está puesto y avisa de lo que se toca;
 * quien decide a dónde se va es quien lo monta, que es quien conoce el árbol de
 * navegación. Así la barra se puede probar, mover y mirar sin arrastrar media
 * aplicación detrás.
 *
 * ─── Sobre los iconos ────────────────────────────────────────────────────────
 *
 * Ionicons, que ya estaba en el proyecto: ni una librería nueva. Todos de la
 * misma familia y con el mismo criterio —contorno cuando el destino está en
 * reposo, relleno cuando es el puesto—, que es lo que hace que cinco dibujos
 * distintos se lean como un conjunto.
 *
 * Y los mismos en móvil y en web. Antes el navegador enseñaba emojis (🏠 🔍 ➕
 * 💬 👤) y el teléfono iconos de línea: dos aplicaciones distintas según por
 * dónde entraras. Ahora es la misma.
 *
 * ─── Sobre el tamaño ─────────────────────────────────────────────────────────
 *
 * El icono se encoge; el sitio donde se toca, no. Cada destino ocupa su quinto
 * de pantalla entero y nunca baja de 44 puntos de alto, así que el dedo tiene lo
 * mismo que antes aunque el dibujo mida dos puntos menos.
 */

export type DestinoId = 'Home' | 'Search' | 'Create' | 'Inbox' | 'Notifications';

interface Destino {
  id: DestinoId;
  etiqueta: string;
  icono: keyof typeof Ionicons.glyphMap;
  iconoPuesto: keyof typeof Ionicons.glyphMap;
}

/**
 * El orden es el de la barra y no cambia.
 *
 * El quinto dejó de ser Perfil y pasó a ser Notificaciones (fase 2E-77): la
 * campana estaba arriba, en el encabezado, y bajó aquí. El Perfil no se ha ido
 * a ninguna parte —su pantalla, su pila y sus rutas están intactas— y se sigue
 * abriendo desde donde vive tu cuenta: el menú ☰ y la barra lateral, que ya
 * ofrecían los dos perfiles.
 */
export const DESTINOS: Destino[] = [
  { id: 'Home', etiqueta: 'Inicio', icono: 'home-outline', iconoPuesto: 'home' },
  { id: 'Search', etiqueta: 'Buscar', icono: 'search-outline', iconoPuesto: 'search' },
  { id: 'Create', etiqueta: 'Crear', icono: 'add-circle-outline', iconoPuesto: 'add-circle' },
  { id: 'Inbox', etiqueta: 'WeeTalk', icono: 'chatbubble-outline', iconoPuesto: 'chatbubble' },
  { id: 'Notifications', etiqueta: 'Notificaciones', icono: 'notifications-outline', iconoPuesto: 'notifications' },
];

/** Lo que ocupa la barra por encima de la zona segura. Lo necesita quien reserve sitio. */
export const ALTO_BARRA = scale(52);

interface BarraInferiorProps {
  /** Cuál de los cinco está puesto. `null` si ninguno —una pantalla suelta—. */
  puesto: DestinoId | null;
  onSelect: (destino: DestinoId) => void;
  /** Mensajes sin leer de WeeTalk. 0 o menos, no se dibuja nada. */
  sinLeer?: number;
}

const BarraInferior: React.FC<BarraInferiorProps> = ({ puesto, onSelect, sinLeer = 0 }) => {
  const { theme } = useTheme();
  const { scrollProgress, isTransparent } = useTabBar();
  const insets = useSafeAreaInsets();

  /*
   * SOBRE LOS ẄELLS, LA BARRA SE APARTA.
   *
   * Al pasar del muro a los videos cortos, el fondo se desvanece y los iconos se
   * vuelven blancos: encima de un vídeo a pantalla completa una barra sólida
   * parte la imagen. Es el comportamiento que ya existía —lo traía `CustomTabBar`
   * con dos capas— y se conserva tal cual; lo mueve de sitio esta fase, no lo
   * inventa. `scrollProgress` lo sigue publicando el Home, sin tocar.
   */
  const fondo = scrollProgress.interpolate({
    inputRange: [0, 0.5],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const colorTexto = (activo: boolean) => {
    if (isTransparent) return activo ? '#FFFFFF' : 'rgba(255,255,255,0.6)';
    return activo ? theme.colors.accent : theme.colors.textSecondary;
  };

  return (
    <View
      style={[styles.barra, { paddingBottom: insets.bottom }]}
      accessibilityRole={Platform.OS === 'web' ? ('navigation' as never) : undefined}
      accessibilityLabel="Navegación de Weë"
    >
      {/* El fondo, aparte, para poder desvanecerlo sin tocar los iconos. */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: theme.colors.card,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: theme.colors.border,
            opacity: fondo,
          },
        ]}
      />
      {DESTINOS.map((destino) => {
        const activo = destino.id === puesto;
        const color = colorTexto(activo);
        return (
          <TouchableOpacity
            key={destino.id}
            style={styles.destino}
            onPress={() => onSelect(destino.id)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: activo }}
            aria-selected={activo}
            accessibilityLabel={activo ? `${destino.etiqueta}, sección actual` : destino.etiqueta}
          >
            <View style={styles.icono}>
              {/*
                Los cinco, con el mismo dibujo: contorno en reposo y relleno
                cuando es el puesto. Aquí vivía el avatar del Perfil, que
                enseñaba tu cara en vez de un icono; se fue con él cuando el
                quinto destino pasó a ser Notificaciones.
              */}
              <Ionicons name={activo ? destino.iconoPuesto : destino.icono} size={scale(26)} color={color} />

              {destino.id === 'Inbox' && sinLeer > 0 && (
                <View style={[styles.aviso, { backgroundColor: theme.colors.accent }]}>
                  <Text style={styles.avisoTexto} numberOfLines={1}>
                    {sinLeer > 99 ? '99+' : sinLeer}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.etiqueta, { color }]} numberOfLines={1}>
              {destino.etiqueta}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  /*
   * Ligera y quieta. Una línea finísima arriba la separa del contenido —basta,
   * y pesa menos que una sombra— y el fondo es el de las tarjetas, así que en el
   * Perfil Weë se oscurece con todo lo demás sin ninguna regla aparte.
   */
  barra: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  /* Cada destino, su quinto de pantalla. El alto mínimo es el del dedo. */
  destino: {
    flex: 1,
    minHeight: 44,
    height: ALTO_BARRA,
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(2),
  },
  icono: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  etiqueta: {
    fontSize: scale(10),
    fontWeight: FONT_WEIGHT.medium,
  },
  aviso: {
    position: 'absolute',
    top: -scale(4),
    right: -scale(10),
    minWidth: scale(17),
    height: scale(17),
    borderRadius: scale(9),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(4),
  },
  avisoTexto: {
    color: '#1F2937',
    fontSize: scale(10),
    fontWeight: FONT_WEIGHT.semibold,
  },
});

export default BarraInferior;
