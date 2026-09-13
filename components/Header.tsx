import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, StatusBar, Text, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useScroll } from '../contexts/ScrollContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { notificationService } from '../services/notificationService';
import { SPACING, ICON_SIZE, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

const isWeb = Platform.OS === 'web';

// Emoji fallbacks for web icons
const WEB_ICONS: Record<string, string> = {
  'arrow-back': '←',
  'menu-outline': '☰',
  'notifications': '🔔',
  'notifications-outline': '🔔',
  'eye': '👁️',
  'eye-off': '🙈',
  'storefront': '🏪',
};

/** La firma de marca del Home. Va debajo del logo y no se traduce. */
const LEMA_DE_MARCA = 'Imagina · Crea · Conecta';

interface HeaderProps {
  onNotificationsPress?: () => void;
  onMenuPress?: () => void;
  onBackPress?: () => void;
  transparent?: boolean;
  /**
   * La marca en el centro: el logo centrado en la pantalla y el lema debajo.
   *
   * Solo lo pide el Home, que es la portada. En WeeTalk y en Notificaciones el
   * encabezado sigue exactamente igual —logo a la izquierda, junto al ☰—, así
   * que este cambio no se cuela en pantallas que no lo pidieron.
   *
   * Centrado DE VERDAD: el logo no vive en la fila de los controles, sino en su
   * propia fila a todo lo ancho. Así el ☰ y el selector Real/Weë no pueden
   * correrlo, que es lo que pasaría si compartieran línea.
   */
  conMarca?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onNotificationsPress, onMenuPress, onBackPress, transparent, conMarca }) => {
  const { theme, setThemeMode } = useTheme();
  const { user } = useAuth();
  const { hasWeeProfile, hasBizProfile, activeProfileType, switchIdentity, switchToBiz } = useUserProfile();

  const handleSwitchIdentity = () => {
    if (activeProfileType === 'biz') {
      // Biz -> Real
      switchToBiz();
      setThemeMode('light');
    } else {
      // Real <-> Perfil Weë
      switchIdentity();
      const nextType = activeProfileType === 'real' ? 'hidi' : 'real';
      setThemeMode(nextType === 'hidi' ? 'dark' : 'light');
    }
  };

  /*
   * ─── El selector de identidad, ahora con las dos opciones a la vista ──────
   *
   * Antes era un botón que decía dónde estabas y había que adivinar que se
   * tocaba para ir al otro sitio. Ahora se ven las dos y se toca la que quieres:
   * la pregunta "¿y cómo vuelvo?" desaparece sola.
   *
   * LO QUE HACE NO CAMBIÓ NI UNA LÍNEA. Tocar el lado apagado llama al mismo
   * `handleSwitchIdentity` de siempre —el mismo `switchIdentity`, el mismo
   * `setThemeMode`—, y tocar el lado encendido no hace nada, porque ya estás
   * ahí. Solo hay dos estados, así que alternar desde el apagado siempre cae en
   * el que se ha tocado.
   *
   * El modo Biz se queda como estaba, con su pastilla morada: no existe un paso
   * de Biz a Perfil Weë y esta fase no es para inventarlo.
   */
  /*
   * Un toque, un cambio.
   *
   * Dos toques seguidos en el mismo lado durante la transición pedirían el mismo
   * destino dos veces y el segundo desharía el primero. Se recuerda lo pedido y
   * se ignora si se repite; en cuanto la identidad llega, se olvida.
   *
   * Se guarda el DESTINO, no un temporizador: así tocar "Weë" y arrepentirse
   * volviendo a "Real" al instante sigue funcionando —son destinos distintos—,
   * que es justo lo que un bloqueo por tiempo se habría comido.
   */
  const identidadPedida = useRef<'real' | 'hidi' | null>(null);

  useEffect(() => {
    if (identidadPedida.current === activeProfileType) identidadPedida.current = null;
  }, [activeProfileType]);

  const elegirIdentidad = (destino: 'real' | 'hidi') => {
    if (activeProfileType === destino) return;
    if (identidadPedida.current === destino) return;
    identidadPedida.current = destino;
    handleSwitchIdentity();
  };
  const { triggerScrollToTop } = useScroll();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [unreadCount, setUnreadCount] = useState(0);

  // Suscripción en tiempo real al conteo de notificaciones no leídas
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const unsubscribe = notificationService.subscribeToUnreadCount(
      user.uid,
      (count) => {
        setUnreadCount(count);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleLogoPress = () => {
    triggerScrollToTop();
    // Navigate to Home tab → Landing screen (root)
    try {
      // Try to go to the tab first
      const tabNav = navigation.getParent();
      if (tabNav) {
        (tabNav as any).navigate('Home', { screen: 'Landing' });
      } else {
        navigation.navigate('Home' as never);
      }
    } catch {
      navigation.navigate('Home' as never);
    }
  };

  const handleLoginPress = () => {
    // Navigate to login screen
    const parent = navigation.getParent()?.getParent();
    if (parent) {
      parent.navigate('Login');
    }
  };

  const textColor = transparent ? 'white' : theme.colors.text;

  return (
    <>
      <StatusBar
        backgroundColor={transparent ? 'transparent' : theme.colors.background}
        barStyle={transparent ? 'light-content' : (theme.dark ? 'light-content' : 'dark-content')}
        translucent={transparent}
      />
      <View style={[styles.container, {
        backgroundColor: transparent ? 'transparent' : theme.colors.background,
        paddingTop: insets.top,
        borderBottomColor: transparent ? 'transparent' : theme.colors.border,
        borderBottomWidth: transparent ? 0 : scale(0.5),
      }]}>
        <View style={[styles.content, conMarca && styles.contentConMarca]} pointerEvents="box-none">
          <View style={styles.leftSection}>
            {/* Back or hamburger menu */}
            {onBackPress ? (
              <TouchableOpacity onPress={onBackPress} activeOpacity={0.7} style={styles.menuButton} accessibilityRole="button" accessibilityLabel="Volver">
                {isWeb ? (
                  <Text style={{ fontSize: 20, color: textColor }}>←</Text>
                ) : (
                  <Ionicons name="arrow-back" size={scale(23)} color={textColor} />
                )}
              </TouchableOpacity>
            ) : onMenuPress ? (
              <TouchableOpacity onPress={onMenuPress} activeOpacity={0.7} style={styles.menuButton} accessibilityRole="button" accessibilityLabel="Abrir menú">
                {isWeb ? (
                  <Text style={{ fontSize: 20, color: textColor }}>☰</Text>
                ) : (
                  <Ionicons name="menu-outline" size={scale(23)} color={textColor} />
                )}
              </TouchableOpacity>
            ) : null}

            {/* Logo, cuando comparte línea con los controles (todo menos el Home) */}
            {!conMarca && (
              <TouchableOpacity onPress={handleLogoPress} activeOpacity={0.7} style={styles.logoContainer}>
                <Image
                  source={(transparent || activeProfileType === 'hidi') ? require('../assets/images/weelogo-dark.png') : require('../assets/images/weelogo.png')}
                  style={styles.weeLogo}
                  contentFit="contain"
                  priority="high"
                  cachePolicy="memory-disk"
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            {/*
              Los Credits ya no viven aquí: se mudaron al menú ☰, debajo de los
              dos perfiles, que es donde está el resto de lo que es "tu cuenta".
              El saldo sale del mismo sitio de siempre (useWallet) y se toca en
              el mismo sitio de siempre (CreditStore); lo único que cambió es
              dónde se ve. El encabezado queda con ☰, la marca, el perfil y la
              campana.
            */}
            {/* Cambiar de identidad: visible si tiene Perfil Weë o está en modo Biz */}
            {user && (hasWeeProfile || activeProfileType === 'biz') && (
              activeProfileType === 'biz' ? (
                /* Modo Biz: la pastilla de siempre, sin tocar. */
                <TouchableOpacity
                  style={[styles.switchButton, {
                    backgroundColor: transparent ? 'rgba(255,255,255,0.15)' : '#7C3AED' + '20',
                    borderColor: transparent ? 'rgba(255,255,255,0.3)' : '#7C3AED',
                  }]}
                  onPress={handleSwitchIdentity}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Perfil Biz activo. Tocar para volver al Perfil Real"
                >
                  {isWeb ? (
                    <Text style={{ fontSize: 14 }}>🏪</Text>
                  ) : (
                    <Ionicons name="storefront" size={ICON_SIZE.md} color={transparent ? 'white' : '#7C3AED'} />
                  )}
                  <Text style={[styles.switchButtonText, { color: transparent ? 'white' : '#7C3AED' }]}>Biz</Text>
                </TouchableOpacity>
              ) : (
                <View
                  style={[styles.selector, {
                    backgroundColor: transparent ? 'rgba(255,255,255,0.15)' : theme.colors.surface,
                    borderColor: transparent ? 'rgba(255,255,255,0.3)' : theme.colors.border,
                  }]}
                >
                  {([
                    { id: 'real' as const, etiqueta: 'Real', nombre: 'Perfil Real' },
                    { id: 'hidi' as const, etiqueta: 'Weë', nombre: 'Perfil Weë' },
                  ]).map((opcion) => {
                    const puesta = activeProfileType === opcion.id;
                    return (
                      <TouchableOpacity
                        key={opcion.id}
                        style={[styles.selectorSegmento, puesta && { backgroundColor: theme.colors.accent }]}
                        onPress={() => elegirIdentidad(opcion.id)}
                        activeOpacity={puesta ? 1 : 0.7}
                        /* La pastilla es baja a propósito; el dedo la alcanza por fuera. */
                        hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
                        accessibilityRole="button"
                        accessibilityState={{ selected: puesta }}
                        aria-selected={puesta}
                        accessibilityLabel={puesta ? `${opcion.nombre}, activo` : `Cambiar al ${opcion.nombre}`}
                      >
                        <Text
                          style={[styles.selectorTexto, {
                            color: puesta ? '#1F2937' : (transparent ? 'rgba(255,255,255,0.75)' : theme.colors.textSecondary),
                            /* 600 el puesto, 500 el otro: es un control, no un título. */
                            fontWeight: puesta ? FONT_WEIGHT.semibold : FONT_WEIGHT.medium,
                          }]}
                          numberOfLines={1}
                        >
                          {opcion.etiqueta}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )
            )}

            {user ? (
              // Usuario autenticado: mostrar notificaciones
              <TouchableOpacity
                style={styles.actionButton}
                onPress={onNotificationsPress}
                activeOpacity={0.7}
              >
                <View>
                  {isWeb ? (
                    <Text style={{ fontSize: 22, color: transparent ? 'white' : (unreadCount > 0 ? theme.colors.accent : theme.colors.text) }}>
                      🔔
                    </Text>
                  ) : (
                    <Ionicons
                      name={unreadCount > 0 ? "notifications" : "notifications-outline"}
                      size={ICON_SIZE.lg}
                      color={transparent ? 'white' : (unreadCount > 0 ? theme.colors.accent : theme.colors.text)}
                    />
                  )}
                  {unreadCount > 0 && (
                    <View style={[styles.badge, { backgroundColor: theme.colors.accent }]}>
                      <Text style={styles.badgeText}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ) : (
              // Usuario no autenticado: mostrar botón de iniciar sesión
              <TouchableOpacity
                style={[styles.loginButton, { backgroundColor: theme.colors.accent }]}
                onPress={handleLoginPress}
                activeOpacity={0.7}
              >
                <Text style={styles.loginButtonText}>Iniciar sesión</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/*
          LA MARCA, EN EL CENTRO DE LA PANTALLA.

          A todo lo ancho y centrada. Es la única forma de que el centro del logo
          coincida de verdad con el centro de la pantalla: si compartiera línea
          con el ☰ y el selector, quedaría centrado en el hueco que le dejan, y
          ese hueco se mueve cada vez que el selector cambia de ancho o aparece
          la campana con aviso.

          Y es lo que MIDE la banda del encabezado: los controles se colocan
          encima —`contentConMarca`, pegados a los bordes y centrados en esa
          misma banda—, así que el ☰ y el selector quedan a la altura del bloque
          de la marca en vez de en una fila aparte por encima. Nada de esto
          depende del ancho de la pantalla: no hay medidas fijas ni huecos
          reservados, solo dos capas del mismo alto.

          `box-none` es lo que deja pasar el dedo: la fila ocupa todo el ancho
          pero solo el logo y su firma reciben el toque; a los lados, el ☰ y el
          selector siguen respondiendo como si nada estuviera encima.

          El logo hace lo de siempre al tocarlo —subir al principio del Home—:
          es el mismo `handleLogoPress`, no una copia.
        */}
        {conMarca && (
          <View style={styles.marca} pointerEvents="box-none">
            <TouchableOpacity onPress={handleLogoPress} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Weë, ir al principio">
              <Image
                source={(transparent || activeProfileType === 'hidi') ? require('../assets/images/weelogo-dark.png') : require('../assets/images/weelogo.png')}
                style={styles.weeLogo}
                contentFit="contain"
                priority="high"
                cachePolicy="memory-disk"
              />
            </TouchableOpacity>
            <Text
              style={[styles.lema, { color: transparent ? 'rgba(255,255,255,0.65)' : theme.colors.textSecondary }]}
              numberOfLines={1}
              adjustsFontSizeToFit={!isWeb}
            >
              {LEMA_DE_MARCA}
            </Text>
          </View>
        )}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: scale(0.5),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  /*
   * En el Home esta fila solo lleva controles, y se pone SOBRE la marca en vez
   * de en una fila aparte por encima: se estira sobre la banda que mide el
   * bloque de la marca —`top/left/right/bottom: 0`, dentro del hueco de la
   * barra de estado,
   * que es padding del contenedor— y centra lo suyo en esa misma banda. Así el
   * ☰ queda a la izquierda, el selector a la derecha y los dos a la altura de
   * la marca, sin que ninguno de los tres empuje a los otros: el logo sigue
   * centrado respecto a la pantalla y no respecto al hueco que le dejen.
   *
   * `zIndex` porque la marca se dibuja después: sin él quedaría por encima de
   * los controles.
   */
  contentConMarca: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 0,
    zIndex: 1,
  },
  /*
   * El logo y su firma. `gap` pequeño a propósito: el lema tiene que leerse como
   * parte del logo, no como una frase que va debajo.
   *
   * Su alto es el del encabezado entero, así que el aire de arriba y el de abajo
   * son el mismo: es lo que deja la banda centrada respecto a los controles.
   */
  marca: {
    alignItems: 'center',
    gap: scale(3),
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  lema: {
    fontSize: scale(11),
    fontWeight: FONT_WEIGHT.regular,
    letterSpacing: scale(0.3),
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(0),
  },
  menuButton: {
    padding: SPACING.xs,
    marginRight: scale(2),
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  logo: {
    height: scale(32),
    width: scale(32),
  },
  weeLogo: {
    height: scale(36),
    width: scale(101),
  },
  logoText: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: -1,
  },
  /*
   * La separación entre el selector de identidad y la campana. Ocho, no
   * dieciséis: en 375 puntos esos ocho son los que le faltaban a la píldora
   * Real/Weë para no acercarse al lema. Siguen siendo dos controles distintos y
   * cada uno conserva su tamaño y su área de toque.
   */
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  actionButton: {
    padding: SPACING.xs,
  },
  badge: {
    position: 'absolute',
    top: -scale(4),
    right: -scale(6),
    minWidth: scale(18),
    height: scale(18),
    borderRadius: scale(9),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(4),
  },
  badgeText: {
    color: 'white',
    fontSize: scale(10),
    fontWeight: FONT_WEIGHT.bold,
  },
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
  },
  /*
   * ─── La pastilla de dos mitades ───────────────────────────────────────────
   *
   * Una sola cápsula que contiene las dos: el fondo claro es el carril y el
   * amarillo se mueve dentro. Los dos puntos delicados son el `padding: 2` —sin
   * él el segmento encendido pisa el borde y se ve sucio— y el radio interior,
   * que tiene que ser algo menor que el exterior para que las curvas encajen.
   */
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(2),
    borderRadius: BORDER_RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  selectorSegmento: {
    minWidth: scale(44),
    paddingHorizontal: SPACING.sm,
    paddingVertical: scale(5),
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorTexto: {
    fontSize: FONT_SIZE.xs,
  },
  switchButtonText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },
  loginButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  loginButtonText: {
    color: '#1F2937',
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
  },
});

export default Header;
