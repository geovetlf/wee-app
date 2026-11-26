import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useT } from '../contexts/IdiomaContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { IconoWee } from './icons/IconoWee';
import { MENU_ITEM } from '../constants/weeMenu';
import { useTabBar } from '../contexts/TabBarContext';
import { FONT_WEIGHT } from '../constants/design';
import { scale } from '../utils/scale';
import { RellenoDeMarca } from './GradienteDeMarca';

/**
 * LA NAVEGACIÓN DE WEË. UNA SOLA, PARA TODA LA APLICACIÓN.
 *
 * Cinco destinos y ni uno más: Inicio, WeëAI, Crear, Mensajes y Mi Weë
 * (rediseño del 2026-11-15). Todos llevan a rutas que ya existían; lo que hay es
 * UNA instancia para toda la experiencia —el Home, las experiencias de Weë, los
 * perfiles, las búsquedas— en vez de una barra que solo vivía dentro de las
 * pestañas y desaparecía en cuanto entrabas en WeëTravel o en una publicación.
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

/* `WeeAI` ya no tiene botón (2026-11-24) pero sigue siendo un destino: enciende el tema de WeëAI en sus pantallas. */
export type DestinoId = 'Home' | 'Weels' | 'WeeAI' | 'Create' | 'Inbox' | 'Profile';

interface Destino {
  id: DestinoId;
  /** La clave de i18n: la etiqueta que se pinta sale de aquí. El catálogo guarda claves, no frases. */
  clave: string;
  icono: keyof typeof Ionicons.glyphMap;
  iconoPuesto: keyof typeof Ionicons.glyphMap;
}

/**
 * El orden es el de la barra y no cambia.
 *
 * Rediseño del 2026-11-15 (decisión del dueño): Inicio · WeëAI · Crear ·
 * Mensajes · Mi Weë. Buscar y Notificaciones subieron a la cabecera del Home
 * (la lupa y la campana) y sus pantallas y rutas siguen donde estaban. WeëAI
 * abre el centro creativo que ya existía; «Mensajes» es WeeTalk —la pestaña
 * `Inbox` de siempre, con otro rótulo— y «Mi Weë» es la pestaña `Profile`.
 *
 * WeëAI es marca y se escribe igual en todos los idiomas; aun así sale de su
 * clave, como todo lo que se pinta.
 */
export const DESTINOS: Destino[] = [
  { id: 'Home', clave: 'nav.home', icono: 'home-outline', iconoPuesto: 'home' },
  /*
   * WEËLS OCUPA EL HUECO DE WEËAI (propuesta de Home 0+, aplicada el 2026-11-24): Weë es una red de creadores
   * y sus alter egos, y WeëAI es una herramienta que vive en el +, en el ☰ y en «Recrear este estilo».
   * Weëls es el formato que más retiene y gana pestaña.
   */
  { id: 'Weels', clave: 'menu.weels', icono: 'play-circle-outline', iconoPuesto: 'play-circle' },
  { id: 'Create', clave: 'nav.create', icono: 'add', iconoPuesto: 'add' },
  { id: 'Inbox', clave: 'nav.messages', icono: 'chatbubble-ellipses-outline', iconoPuesto: 'chatbubble-ellipses' },
  { id: 'Profile', clave: 'nav.myWee', icono: 'person-outline', iconoPuesto: 'person' },
];

/** El lado del círculo dorado de Crear. Sobresale un poco de la barra, sin cambiarle el alto. */
const LADO_DE_CREAR = scale(46);

/** Lo que ocupa la barra por encima de la zona segura. Lo necesita quien reserve sitio. */
export const ALTO_BARRA = scale(52);

interface BarraInferiorProps {
  /** Cuál de los cinco está puesto. `null` si ninguno —una pantalla suelta—. */
  puesto: DestinoId | null;
  onSelect: (destino: DestinoId) => void;
  /** Mensajes sin leer (WeeTalk). 0 o menos, no se dibuja nada. */
  sinLeer?: number;
  /** Pulsación larga en la pestaña de la cara: abre la hoja «Cambiar de cara» con todos los alter egos. */
  onMantener?: (destino: DestinoId) => void;
}

const BarraInferior: React.FC<BarraInferiorProps> = ({ puesto, onSelect, sinLeer = 0, onMantener }) => {
  const t = useT();
  const { activeProfileType, hasWeeProfile, weeProfile } = useUserProfile();
  /* A qué cara lleva el interruptor: la otra. */
  const haciaWee = activeProfileType !== 'hidi';
  /*
   * La última pestaña nombra la OTRA cara: con un alter ego puesto, «Real»; con el Perfil Real, el NOMBRE del último alter ego
   * usado (contenido de la persona, no se traduce) o «Weë» (marca) si todavía no tiene ninguno. Con varios alter egos
   * (2026-11-23) el toque sigue alternando con el último; la pulsación larga abre la hoja con todos.
   */
  const rotulo = (destino: Destino): string => (destino.id === 'Profile' ? (activeProfileType === 'hidi' ? t('pages.nature_real') : (weeProfile?.displayName || 'Weë')) : t(destino.clave));
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
    /* Lo activo, en el acento de interacción (violeta, 2026-11-15); el dorado se queda en Crear, que es la acción. */
    return activo ? theme.colors.interaction : theme.colors.textSecondary;
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
            onLongPress={destino.id === 'Profile' && hasWeeProfile && onMantener ? () => onMantener(destino.id) : undefined}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: activo }}
            aria-selected={activo}
            accessibilityLabel={destino.id === 'Profile' ? (haciaWee && !hasWeeProfile ? t('menu.createWeeProfile') : t('menu.switchToProfile', { perfil: haciaWee ? (weeProfile?.displayName || t(MENU_ITEM.weeProfile.clave)) : t(MENU_ITEM.realProfile.clave) })) : activo ? `${rotulo(destino)}, ${t('nav.current')}` : rotulo(destino)}
          >
            {destino.id === 'Create' ? (
              /*
                CREAR ES LA ACCIÓN, Y LO DICE EL DORADO. Un círculo con el
                degradado de marca, algo más grande que los demás dibujos y
                subido unos puntos: es el único relleno dorado de la barra. Lo
                que hace no cambia —abre la hoja Crear de siempre—.
              */
              <View style={[styles.crear, { backgroundColor: theme.colors.accent }]}>
                <RellenoDeMarca radio={LADO_DE_CREAR / 2} />
                <Ionicons name="add" size={scale(28)} color={theme.colors.onPrimary} />
              </View>
            ) : (
              <View style={styles.icono}>
                {/* Contorno en reposo y relleno cuando es el puesto: los cuatro, con el mismo criterio. */}
                {destino.id === 'Profile' ? (
                  /* El icono dice a qué cara se pasa: los mismos del selector del ☰. */
                  <IconoWee name={haciaWee ? 'perfilWee' : 'perfilReal'} size={scale(24)} color={color} />
                ) : (
                  <Ionicons name={activo ? destino.iconoPuesto : destino.icono} size={scale(24)} color={color} />
                )}

                {destino.id === 'Inbox' && sinLeer > 0 && (
                  <View style={[styles.aviso, { backgroundColor: theme.colors.accent }]}>
                    <Text style={styles.avisoTexto} numberOfLines={1}>
                      {sinLeer > 99 ? '99+' : sinLeer}
                    </Text>
                  </View>
                )}
              </View>
            )}
            {/* Crear no lleva rótulo debajo: el círculo ya lo dice, y su nombre lo oye el lector de pantalla. */}
            {destino.id !== 'Create' && (
              <Text style={[styles.etiqueta, { color }]} numberOfLines={1}>
                {rotulo(destino)}
              </Text>
            )}
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
  /* El círculo de Crear: sube unos puntos sobre la línea de la barra; el destino sigue midiendo lo mismo. */
  crear: {
    width: LADO_DE_CREAR,
    height: LADO_DE_CREAR,
    borderRadius: LADO_DE_CREAR / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginTop: -scale(10),
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
