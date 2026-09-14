import React from 'react';
import { useT } from '../contexts/IdiomaContext';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import AvatarDisplay from './avatars/AvatarDisplay';
import { SPACING, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

/**
 * QUIÉN ERES, ARRIBA DEL TODO.
 *
 * Lo primero del Home: tu cara, tu nombre y un sitio donde buscar. Nada más.
 * Ocupa poco a propósito — el muro empieza enseguida y es lo que importa.
 *
 * El nombre y el avatar salen del PERFIL ACTIVO, así que al cambiar a tu Perfil
 * Weë cambian contigo. No se inventa ninguna identidad: es el mismo contexto que
 * lee el resto de la app.
 *
 * LA LUPA NO ES UN BUSCADOR NUEVO. Cerrada es solo un botón; al tocarla abre la
 * pantalla de Buscar que ya existe, con sus personas, hashtags y publicaciones.
 * Aquí no se duplica ni una línea de esa búsqueda.
 *
 * ─── Por qué la lupa no es amarilla ──────────────────────────────────────────
 *
 * En Weë el amarillo significa crear y elegir: el botón de publicar, la pastilla
 * encendida, el subrayado de Ẅall. Buscar es descubrir, no crear, y pintarla de
 * amarillo la pondría a competir con el "+" del compositor, que está justo
 * debajo. Se lee como acción por su forma —un círculo limpio, con su borde y su
 * contraste—, no por el color.
 *
 * ─── Por qué no tiene fondo propio ───────────────────────────────────────────
 *
 * Comparte el fondo de la pantalla. Con un gris propio se veía una franja entre
 * el encabezado y el muro, y el Home empezaba pareciendo tres bloques pegados en
 * vez de una sola pantalla.
 */
interface HomeGreetingProps {
  onSearch: () => void;
}

const HomeGreeting: React.FC<HomeGreetingProps> = ({ onSearch }) => {
  const { theme } = useTheme();
  const t = useT();
  const { user } = useAuth();
  const { userProfile } = useUserProfile();

  const nombre = (userProfile?.displayName || '').trim().split(' ')[0];

  return (
    <View style={[styles.fila, { backgroundColor: theme.colors.background }]}>
      <AvatarDisplay
        avatarType={userProfile?.avatarType}
        avatarId={userProfile?.avatarId}
        photoURL={userProfile?.photoURLThumbnail || userProfile?.photoURL}
        size={scale(40)}
      />
      {/*
        Solo el nombre. El lema que iba debajo se fue con el rediseño del
        encabezado: ahora la firma de marca vive arriba, junto al logo, y
        repetir una segunda frase dos dedos más abajo cargaba el bloque sin
        decir nada nuevo. Tampoco queda hueco reservado — el nombre es el único
        hijo y la fila se ciñe a él.
      */}
      <Text style={[styles.saludo, { color: theme.colors.text }]} numberOfLines={1}>
        {user && nombre ? t('home.greeting', { nombre }) : t('home.greetingGuest')}
      </Text>
      <TouchableOpacity
        style={[styles.lupa, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        onPress={onSearch}
        activeOpacity={0.6}
        accessibilityRole="button"
        accessibilityLabel={t('home.search')}
        accessibilityHint="Abre la búsqueda de personas, hashtags y publicaciones"
      >
        <Ionicons name="search" size={scale(21)} color={theme.colors.text} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.xs,
  },
  /*
   * Un solo tamaño, y es el del nombre. `flex: 1` para que empuje a la lupa
   * hasta el borde; `minWidth: 0` para que un nombre largo se recorte en vez de
   * ensanchar la fila.
   */
  saludo: {
    flex: 1,
    minWidth: 0,
    fontSize: scale(18),
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: scale(-0.3),
  },
  /* Objetivo táctil cómodo, sin scale(): en web multiplicaría por 0,9. */
  lupa: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default HomeGreeting;
