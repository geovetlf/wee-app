import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useT } from '../contexts/IdiomaContext';
import { useTabBar } from '../contexts/TabBarContext';
import { FONT_WEIGHT } from '../constants/design';
import { scale } from '../utils/scale';

/**
 * LA NAVEGACIÓN DE WEË. UNA SOLA, PARA TODA LA APLICACIÓN.
 *
 * Cuatro pestañas y ni una más: Crear, Inspira, Proyectos y Perfil (decisión
 * del usuario, 2026-09-27). Weë en el teléfono es social y creativo a la vez:
 * Inspira es la comunidad —sus muros, sus Weëls— y las ideas para crear; Crear,
 * todo lo que se puede hacer; Proyectos, donde se trabaja; Perfil, tus dos caras
 * y tu cuenta. Buscar, WeeTalk y Notificaciones no se han ido: están arriba, en
 * el mismo sitio en las cuatro pestañas (`AccesosDeLaApp`).
 *
 * Existe UNA instancia para toda la experiencia —el Home, las experiencias de
 * Weë, los perfiles, las búsquedas— en vez de una barra que solo vivía dentro de
 * las pestañas y desaparecía en cuanto entrabas en Weë Travel o en una
 * publicación. Y no entra en Weë Creator: el taller profesional tiene su propia
 * navegación, y las dos no se mezclan.
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

export type DestinoId = 'Crear' | 'Home' | 'Proyectos' | 'Profile';

interface Destino {
  id: DestinoId;
  /** El texto en español, que es además la clave de respaldo si faltara la traducción. */
  etiqueta: string;
  /** La clave de i18n. La etiqueta que se pinta sale de aquí, no de `etiqueta`. */
  clave: string;
  icono: keyof typeof Ionicons.glyphMap;
  iconoPuesto: keyof typeof Ionicons.glyphMap;
}

/**
 * El orden es el de la barra y no cambia: Crear, Inspira, Proyectos, Perfil.
 *
 * Inspira es la pestaña `Home` de siempre —la portada, la comunidad— y por eso
 * sigue siendo donde se entra. El Perfil vuelve a la barra: con cuatro pestañas
 * hay sitio para tu cuenta, que es donde se cambia de cara. Notificaciones y
 * WeeTalk, que estaban aquí, están ahora arriba, en cada pestaña.
 */
export const DESTINOS: Destino[] = [
  { id: 'Crear', etiqueta: 'Crear', clave: 'nav.create', icono: 'add-circle-outline', iconoPuesto: 'add-circle' },
  { id: 'Home', etiqueta: 'Inspira', clave: 'nav.inspire', icono: 'compass-outline', iconoPuesto: 'compass' },
  { id: 'Proyectos', etiqueta: 'Proyectos', clave: 'nav.projects', icono: 'folder-outline', iconoPuesto: 'folder' },
  { id: 'Profile', etiqueta: 'Perfil', clave: 'nav.profile', icono: 'person-circle-outline', iconoPuesto: 'person-circle' },
];

/** Lo que ocupa la barra por encima de la zona segura. Lo necesita quien reserve sitio. */
export const ALTO_BARRA = scale(52);

interface BarraInferiorProps {
  /** Cuál de los cuatro está puesto. `null` si ninguno —una pantalla suelta—. */
  puesto: DestinoId | null;
  onSelect: (destino: DestinoId) => void;
}

const BarraInferior: React.FC<BarraInferiorProps> = ({ puesto, onSelect }) => {
  const t = useT();
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
      accessibilityLabel={t('nav.weeNavigation')}
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
            accessibilityLabel={activo ? `${t(destino.clave)}, ${t('nav.current')}` : t(destino.clave)}
          >
            <View style={styles.icono}>
              {/*
                Los cuatro, con el mismo dibujo: contorno en reposo y relleno
                cuando es el puesto. Un icono y no tu cara: la barra es de
                lugares, no de personas.
              */}
              <Ionicons name={activo ? destino.iconoPuesto : destino.icono} size={scale(26)} color={color} />
            </View>
            <Text style={[styles.etiqueta, { color }]} numberOfLines={1}>
              {t(destino.clave)}
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
  /* Cada destino, su cuarto de pantalla. El alto mínimo es el del dedo. */
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
});

export default BarraInferior;
