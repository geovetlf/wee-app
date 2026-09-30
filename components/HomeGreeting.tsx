import React from 'react';
import { useNavigation } from '@react-navigation/native';
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
 * TU CARA LLEVA A TU PERFIL, y solo tu cara. El nombre de al lado se lee, no
 * se pulsa, y el hueco entre medias tampoco hace nada: la fila entera pulsable
 * habría convertido un saludo en un botón gigante sin que nada lo anunciara.
 *
 * Es UNA ruta para las dos identidades, no dos. `Profile` enseña la que esté
 * puesta, que es justo la que este avatar está dibujando: con el Perfil Real
 * abre el Real y con el Perfil Weë abre el Weë, y aquí no se decide nada. Es lo
 * mismo que hace el cajón cuando ya estás en ese perfil.
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
  const navegacion = useNavigation<any>();

  /*
   * DÓNDE LLEVA EL CÍRCULO.
   *
   * El avatar dice quién eres, así que tocarlo lleva a donde eso se resuelve:
   * con sesión, a tu perfil; sin ella, a la entrada. Es lo mismo que hace la
   * tarjeta de cuenta del cajón —`user ? Profile : Login`— y por la misma
   * razón; no hay dos criterios para la misma pregunta.
   *
   * Tu perfil es una PESTAÑA, no una pantalla del Home, así que hay que subir
   * un escalón —HomeStack → barra de pestañas— antes de pedirla. Es el mismo
   * salto que ya hace "Buscar" desde aquí; sin él la ruta no se encuentra. La
   * entrada, en cambio, vive en la pila principal y se pide tal cual, igual que
   * la pide el cajón.
   */
  const alTocarElAvatar = () => {
    if (!user) return navegacion.navigate('Login');
    const pestanas = navegacion.getParent();
    if (pestanas) pestanas.navigate('Profile');
    else navegacion.navigate('Profile');
  };

  return (
    <View style={[styles.fila, { backgroundColor: theme.colors.background }]}>
      <TouchableOpacity
        style={styles.avatarToque}
        onPress={alTocarElAvatar}
        activeOpacity={0.7}
        accessibilityRole="button"
        /* Lo que va a pasar, dicho antes de tocar. Las dos claves ya existían. */
        accessibilityLabel={t(user ? 'nav.myProfile' : 'menu.signIn')}
      >
        <AvatarDisplay
          avatarType={userProfile?.avatarType}
          avatarId={userProfile?.avatarId}
          photoURL={userProfile?.photoURLThumbnail || userProfile?.photoURL}
          size={scale(40)}
        />
      </TouchableOpacity>
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
        accessibilityHint={t('home.searchHint')}
      >
        <Ionicons name="search" size={scale(21)} color={theme.colors.text} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  /*
   * El aire de la fila. Más que antes a propósito: el saludo bajó de cuerpo y,
   * si la fila seguía tan ceñida, el avatar y la lupa quedaban pegados al
   * encabezado y al compositor. El espacio es lo que hace que un título más
   * pequeño se siga leyendo como el principal.
   */
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  /*
   * Un solo tamaño, y es el del nombre. `flex: 1` para que empuje a la lupa
   * hasta el borde; `minWidth: 0` para que un nombre largo se recorte en vez de
   * ensanchar la fila.
   */
  saludo: {
    flex: 1,
    minWidth: 0,
    /* Diecisiete, no dieciocho: sigue mandando en la fila y deja de competir
       con el logo del encabezado, que está a dos dedos por encima. */
    fontSize: scale(17),
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: scale(-0.3),
  },
  /*
   * El envoltorio del avatar no pinta nada: se ciñe al círculo de 40 y solo
   * existe para escuchar. El redondeo es para que el destello del toque y el
   * recuadro de foco del teclado sigan la forma del avatar en vez de dibujar un
   * cuadrado alrededor; el tamaño, la posición y el hueco de la fila no se
   * mueven porque la caja es exactamente la que ya ocupaba el círculo.
   */
  avatarToque: {
    borderRadius: BORDER_RADIUS.full,
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
