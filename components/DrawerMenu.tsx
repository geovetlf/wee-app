import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  Alert,
  Linking,
  Platform,
  ScrollView,
} from 'react-native';

const isWeb = Platform.OS === 'web';

/**
 * EL VERDE DEL PERFIL WEË.
 *
 * Con el Perfil Weë puesto, la app se viste de oscuro y el menú entero se
 * enciende: TODOS sus dibujos pasan a este verde para que se vea de un vistazo
 * con cuál de tus dos caras estás participando, que es justo lo que el Perfil
 * Weë tiene que dejar claro en todo momento. No es el adorno de una opción, es
 * el estado de la sesión, y por eso lo llevan todas y no una.
 *
 * No sale del tema porque no lo hay: la paleta de Weë es el amarillo, el gris y
 * los grises del fondo, y `success` —#22C55E— es el verde de "ha ido bien", que
 * significa otra cosa y no brilla sobre #0A0A0A. Este es el único sitio donde
 * se usa, y por eso vive aquí con su nombre en vez de suelto entre el JSX.
 */
const VERDE_DEL_PERFIL_WEE = '#39FF14';
/* Decisión del dueño (2026-11-05): los iconos del Perfil Weë vuelven al verde eléctrico; deja sin efecto el morado del 2026-11-02. */
const ICONOS_DEL_PERFIL_WEE = VERDE_DEL_PERFIL_WEE;
/* Decisión del dueño (2026-11-05): en el Perfil Real los iconos del menú ☰ van en morado eléctrico. Solo el dibujo: textos, títulos y la píldora de Credits no cambian. */
/* Gama de la referencia del dueño (2026-11-15): iconos de línea en gris oscuro de la identidad (#1F2937). Sustituye al morado eléctrico del 2026-11-05 en el Perfil Real; el verde del Perfil Weë no cambia. */
const ICONOS_DEL_PERFIL_REAL = '#1F2937';
import { Ionicons } from '@expo/vector-icons';
import IconoDireccional from './IconoDireccional';
import { IconoWee } from './icons/IconoWee';
import { MarcaDeCredits } from './CreditsPill';
import { NombreDeIcono } from './icons/trazosDeWee';
import { useT } from '../contexts/IdiomaContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useIdioma } from '../contexts/IdiomaContext';
import { useDireccion } from '../hooks/useDireccion';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import AvatarDisplay from './avatars/AvatarDisplay';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';
import { useWallet } from '../hooks/useWallet';
import { Image } from 'expo-image';
import { MENU_ITEM, MenuItemId, WEE_MENU } from '../constants/weeMenu';
import SelectorDeIdentidad, { Identidad } from './inicio/SelectorDeIdentidad';
import TarjetaWeeAi from './inicio/TarjetaWeeAi';
import { RellenoDeMarca, RellenoDeDegradado } from './GradienteDeMarca';
import { ARTE_WEEAI } from '../constants/marca';
import { useMyWees } from '../hooks/useMyWees';
import { useIdentidadActiva } from '../hooks/useEContact';
import { destinoDeAcceso } from '../utils/myWees';
import { pintarAcceso } from '../constants/myWeesDestinos';
import { usePrefiereQuietud } from './inicio/TarjetaWeeAi';
import { ALTO_BARRA } from './BarraInferior';
import { abrirPortadaDeWeeAi } from '../navigation/refNavegacion';
import { useResponsive } from '../hooks/useResponsive';
import { confirmAction } from '../utils/notify';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.8, 320);

interface DrawerMenuProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * El único menú ☰ de Weë (rediseño del 2026-11-15).
 *
 *   logo Weë · ✕
 *   quién soy  ›
 *   [ Real | Weë ]                       ← el selector de identidad
 *   ┌ WeëAI · lema                    → ┐ ← abre el centro creativo
 *   Inicio / Ẅall · Weëls · Explorar · Comunidades · Proyectos · Weë Pages
 *   ┌ MyWeës · descripción · [Personalizar] ┐
 *   Guardados · Historial · Credits · Configuración
 *   Ayuda y soporte
 *   Términos · Privacidad
 *   Cerrar sesión
 *
 * El orden de las filas sale de `WEE_MENU` (constants/weeMenu.ts): el cajón y
 * la barra lateral pintan la misma lista.
 *
 * Lo que ya no es una fila sigue existiendo: Mensajes (WeeTalk) y Mi Weë están
 * en la barra inferior; la agenda —ËContact con el Perfil Real, ẄContact con el
 * Perfil Weë— se abre desde Mi Weë; las experiencias, en el centro creativo de
 * WeëAI; y Mis creaciones, desde WeëAI, desde Proyectos y desde MyWeës.
 * Notificaciones es la campana de la cabecera del Home.
 */
const DrawerMenu: React.FC<DrawerMenuProps> = ({ visible, onClose }) => {
  const t = useT();
  const { theme, setThemeMode } = useTheme();
  const { formato } = useIdioma();
  const dir = useDireccion();
  const { user, logout } = useAuth();
  const { userProfile, activeProfileType, hasWeeProfile, switchIdentity } = useUserProfile();
  const navigation = useNavigation<any>();
  /*
   * ¿Estamos ya en el Home? La misma lectura que hace la barra de escritorio:
   * la pestaña puesta dentro de `Main`, o la ruta suelta si estamos fuera de
   * las pestañas. Sirve para dos cosas: encender la opción y no volver a
   * navegar a donde ya estás.
   */
  const rutaActual = useNavigationState((estado) => {
    if (!estado) return undefined;
    const ruta = estado.routes[estado.index];
    if (ruta.state) {
      const pestanas = ruta.state as any;
      return pestanas.routes[pestanas.index]?.name;
    }
    return ruta.name;
  });
  /*
   * Dos nombres para el mismo sitio: `Home` es la pestaña y `Landing` la
   * pantalla que hay dentro. Cuál de los dos llega depende de desde dónde se
   * abra el cajón —desde el propio Home el navegador más cercano es su pila y
   * responde `Landing`—, así que valen los dos.
   */
  const enHome = rutaActual === 'Home' || rutaActual === 'Landing';
  const insets = useSafeAreaInsets();
  /*
   * LO ÚLTIMO DEL CAJÓN, POR ENCIMA DE LA BARRA DE ABAJO.
   *
   * El cajón se abre dentro de las pestañas —Home, WeeTalk, Perfil— y la barra
   * global de Weë se pinta ENCIMA de ellas (navigation/NavegacionGlobal.tsx).
   * Sin guardarle su alto, al bajar del todo el final del menú, «Cerrar sesión»
   * incluido, quedaba debajo de la barra y no se podía tocar. Es la misma regla
   * que decide si hay barra: en escritorio manda la barra lateral y no se
   * guarda nada. La zona segura ya va sumada aparte (`insets.bottom`).
   */
  const { isDesktop } = useResponsive();
  const huecoDeLaBarra = isDesktop ? 0 : ALTO_BARRA;

  const activeUid = userProfile?.uid || user?.uid;
  const { balance } = useWallet();

  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  /*
   * El directorio de negocios del proyecto antiguo y su atajo se retiraron definitivamente por decisión del dueño
   * (2026-11-03; definitivo el 2026-11-06). Un negocio, si alguna vez existe, será una Página (WeëPages).
   */

  useEffect(() => {
    if (isWeb) {
      translateX.setValue(visible ? 0 : -DRAWER_WIDTH);
      overlayOpacity.setValue(visible ? 1 : 0);
      return;
    }
    Animated.parallel([
      Animated.timing(translateX, { toValue: visible ? 0 : -DRAWER_WIDTH, duration: visible ? 250 : 200, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: visible ? 1 : 0, duration: visible ? 250 : 200, useNativeDriver: true }),
    ]).start();
  }, [visible]);

  const closeDrawer = () => {
    if (isWeb) {
      onClose();
      return;
    }
    Animated.parallel([
      Animated.timing(translateX, { toValue: -DRAWER_WIDTH, duration: 200, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  /** Cierra el menú y ejecuta la acción cuando terminó la animación. */
  const after = (fn: () => void) => {
    closeDrawer();
    setTimeout(fn, isWeb ? 0 : 220);
  };

  const navigateTab = (screen: string, params?: object) => {
    const tabNav = navigation.getParent();
    if (tabNav) tabNav.navigate(screen, params);
    else navigation.navigate(screen, params);
  };

  const navigateRoot = (screen: string, params?: object) => {
    // Rutas del stack principal (Create, Settings, CreditStore, WeeCreator, Reels…)
    navigation.navigate(screen, params);
  };

  /*
   * SALIR SE CONFIRMA, COMO EN EL RESTO DE WEË.
   *
   * La barra lateral, Configuración y los Ajustes de Creator preguntan antes
   * con este mismo diálogo y las mismas palabras (`confirmAction`, que también
   * funciona en la web); el ☰ salía sin preguntar. Si se cancela, nada cambia:
   * ni se sale ni se cierra el cajón.
   */
  const handleLogout = async () => {
    const ok = await confirmAction(t('menu.signOut'), t('menu.signOutConfirm'), t('menu.signOut'), true, t);
    if (!ok) return;
    after(async () => {
      try {
        await logout();
      } catch (error) {
        console.error('Error during logout:', error);
      }
    });
  };

  const requireLogin = () => {
    after(() => navigateRoot('Login'));
  };

  /*
   * ─── EL SELECTOR DE IDENTIDAD ────────────────────────────────────────────
   *
   * Es la misma lógica que tenían las filas «Perfil Real» y «Perfil Weë», y la
   * misma que la píldora de la cabecera: `switchIdentity()` cambia de cara y
   * `setThemeMode()` viste la app —clara con el Perfil Real, oscura con el
   * Perfil Weë—. El tema sale del DESTINO, que es lo único seguro en ese
   * momento. Aquí no se guarda ni se decide ninguna identidad: se pide el
   * cambio a quien es su dueño, `UserProfileContext`.
   *
   *  · sin sesión, pide entrar;
   *  · sin Perfil Weë todavía, el lado Weë lleva a crearlo;
   *  · tocar el lado que ya está puesto no hace nada: ya estás ahí.
   */
  const elegirIdentidad = (destino: Identidad) => {
    if (!user) return requireLogin();
    if (destino === 'hidi' && !hasWeeProfile) return after(() => navigateRoot('WeeProfileCreation'));
    if (activeProfileType === destino) return;
    /* Las dos ramas, escritas: el tema sale del DESTINO —oscuro con el Perfil Weë, claro con el Perfil Real—. */
    if (destino === 'hidi') {
      switchIdentity();
      setThemeMode('dark');
    } else {
      switchIdentity();
      setThemeMode('light');
    }
    closeDrawer();
  };

  /*
   * ─── Home ────────────────────────────────────────────────────────────────
   *
   * `Landing` es la pantalla de siempre, la misma que abre la barra inferior y
   * la misma que ya usaba "Weëls" desde este cajón: no hay ningún Home nuevo.
   *
   * Si ya estás en ella no se navega. Volver a `navigate` a la pantalla en la
   * que estás la remonta —pierdes la posición del muro— y no aporta nada; basta
   * con cerrar el cajón, que es lo que la persona espera al tocar donde ya está.
   */
  const goHome = () => (enHome ? closeDrawer() : after(() => navigateTab('Home', { screen: 'Landing' })));

  // ── A dónde ir ──
  /* Comunidades vive dentro de la pila del Home: se llega por su pestaña, como hace la barra lateral (Sidebar). Navegar a 'ExploreCommunities' a secas desde el cajón no lo resolvía nadie y daba error. */
  const goCommunities = () => after(() => navigateTab('Home', { screen: 'ExploreCommunities' }));
  // Weëls: abrimos el Home con `openWeels`, que abre el visor con los Weëls ya cargados.
  const goWeels = () => after(() => navigateTab('Home', { screen: 'Landing', params: { openWeels: true } }));
  /* Explorar es la búsqueda de siempre, la misma que abre la lupa de la cabecera. */
  const goExplore = () => after(() => navigateTab('Search'));

  // ── WeëAI ──
  const goWeeAi = () => after(() => { if (!abrirPortadaDeWeeAi()) navigateRoot('WeeCreator'); });

  // ── Lo tuyo: todo esto es de una cuenta y pide sesión, como antes ──
  const conCuenta = (pantalla: string, params?: object) => () => (user ? after(() => navigateRoot(pantalla, params)) : requireLogin());
  const goProjects = conCuenta('Projects');
  const goPages = conCuenta('WeePages');
  const goMyWees = conCuenta('MyWees');
  const goCustomizeMyWees = conCuenta('MyWees', { personalizar: true });

  /*
   * MyWeës SE DESPLIEGA aquí mismo (decisión del dueño, 2026-11-15): la flecha abre la lista de atajos elegidos, cada uno
   * va a su destino, y «Personalizar» sigue llevando a elegirlos. Plegado o desplegado se recuerda mientras el cajón vive
   * (sin guardarlo en ningún sitio). Los atajos salen de `useMyWees`, el mismo almacén que la pantalla MyWeës.
   */
  const myWees = useMyWees();
  const { nombreLista: nombreDeLaAgenda } = useIdentidadActiva();
  const [myWeesAbierto, setMyWeesAbierto] = React.useState(false);
  const quietud = usePrefiereQuietud();
  const giroDeLaFlecha = useRef(new Animated.Value(0)).current;
  const alternarMyWees = () => {
    const abrir = !myWeesAbierto;
    setMyWeesAbierto(abrir);
    if (abrir) myWees.recargar();
    if (quietud) giroDeLaFlecha.setValue(abrir ? 1 : 0);
    else Animated.timing(giroDeLaFlecha, { toValue: abrir ? 1 : 0, duration: 160, useNativeDriver: !isWeb }).start();
  };
  const abrirAtajo = (a: Parameters<typeof destinoDeAcceso>[0]) => {
    const destino = destinoDeAcceso(a);
    if (!destino) return;
    if (destino.pideCuenta && !user) return requireLogin();
    after(() => navigateRoot(destino.ruta, destino.params));
  };
  const goSaved = conCuenta('SavedPosts');
  const goHistory = conCuenta('Historial');
  const goCredits = conCuenta('CreditStore');
  const goSettings = () => after(() => navigateRoot('Settings'));
  const goHelp = () => after(() => navigateRoot('Help'));

  /* Qué hace cada fila del catálogo. El orden no vive aquí: lo da `WEE_MENU`. */
  const ACCION: Partial<Record<MenuItemId, () => void>> = {
    home: goHome,
    weels: goWeels,
    explore: goExplore,
    communities: goCommunities,
    projects: goProjects,
    pages: goPages,
    mywees: goMyWees,
    saved: goSaved,
    history: goHistory,
    credits: goCredits,
    settings: goSettings,
    help: goHelp,
  };

  if (!visible) return null;

  /* El nombre de la persona NO se traduce. Lo que se traduce es el respaldo. */
  const displayName = userProfile?.displayName || user?.displayName || t('common.guest');
  const isWee = activeProfileType === 'hidi';
  /* El @usuario, solo si la persona tiene uno. No se inventa a partir del nombre ni del correo. */
  const usuario = user && typeof userProfile?.username === 'string' && userProfile.username.trim() ? `@${userProfile.username.trim().replace(/^@/, '')}` : '';

  /*
   * EL COLOR DE LOS DIBUJOS DEL CAJÓN, DECIDIDO UNA VEZ.
   *
   * Lo leen los dos sitios que pintan un `IconoWee` —las filas corrientes y la
   * tarjeta de MyWeës—, así que no pueden discrepar. Aquí NO entra nada más: los textos, el avatar, las etiquetas y
   * los chevrones siguen sacando su color del tema, como siempre.
   */
  const colorDeLosIconos = isWee ? ICONOS_DEL_PERFIL_WEE : ICONOS_DEL_PERFIL_REAL;

  /*
   * EL ICONO SE DIBUJA, NO SE ESCRIBE.
   *
   * Antes aquí iba un emoji dentro de un `<Text>`, y eso trae tres problemas que
   * no se arreglan con estilos: lo dibuja el sistema operativo, así que cambia
   * de un teléfono a otro; no admite color, así que en el tema oscuro seguía
   * siendo de colores; y cada uno viene de una familia distinta, así que en
   * columna unos se ven grandes y otros pequeños. Los de ahora son de la misma
   * familia y toman el color del texto de la fila.
   *
   * El tamaño y el sitio son los de siempre: el hueco del emoji ya reservaba 24
   * puntos de ancho y el icono ocupa el mismo, así que la lista no se mueve ni
   * un punto.
   */
  /*
   * EL MARGEN DE GRACIA DEL TOQUE.
   *
   * El área que responde es la del nombre, y un nombre es una caja estrecha:
   * sin un poco de holgura alrededor, acertar con el pulgar en movimiento se
   * vuelve puntería. Esto la da SIN ocupar sitio —`hitSlop` no entra en el
   * cálculo del diseño—, así que la fila mide exactamente lo que medía.
   *
   * En la web `hitSlop` no lo aplica React Native Web, y por eso la holgura de
   * arriba y abajo se da además con relleno dentro del propio botón: cabe de
   * sobra en los 44 puntos de alto que la fila ya reservaba, así que tampoco
   * mueve nada. A lo ancho no se rellena: eso correría el texto.
   */
  const MARGEN_DE_TOQUE = { top: scale(10), bottom: scale(10), left: scale(8), right: scale(8) };

  const renderRow = (
    icono: NombreDeIcono,
    label: string,
    onPress: () => void,
    opts: { right?: React.ReactNode; active?: boolean; small?: boolean; danger?: boolean } = {},
  ) => (
    <View
      key={label}
      /*
       * Dónde estás se dice con el peso del texto y nada más. Antes la fila
       * activa se pintaba con un fondo del amarillo de Weë al 13%, y en una
       * lista de opciones eso no se leía como "estás aquí": se leía como un
       * resaltado suelto. El amarillo sigue donde sí informa —la etiqueta del
       * Perfil Weë, el saldo de Credits—, no de fondo de una fila.
       *
       * LA FILA NO RESPONDE AL TOQUE; RESPONDE EL NOMBRE.
       *
       * Era una sola pieza pulsable de borde a borde, así que rozar el vacío de
       * la derecha —donde no hay nada escrito— abría una sección. El nombre es
       * lo que la persona está leyendo y apuntando, y es lo único que abre.
       *
       * Son los mismos tres huecos de antes —icono, nombre, adorno— para que el
       * espaciado no se mueva: lo que cambia es quién de los tres escucha. El
       * `flex` que estiraba el texto hasta el borde pasa al hueco, que es lo
       * que empuja el adorno a la derecha sin que nada de eso sea pulsable.
       */
      style={opts.small ? styles.subRow : styles.row}
    >
      {/*
        Los Credits no llevan dibujo: llevan su marca, "ẄC" (decisión del
        usuario, 2026-09-15). Es la misma pieza que la píldora de Weë AI, y toma
        el color de los iconos de su fila, así que se lee en el menú claro del
        Perfil Real y en el oscuro del Perfil Weë. Ocupa el mismo hueco que un
        icono para que los nombres de las filas sigan alineados.
      */}
      {icono === 'credits' ? (
        <MarcaDeCredits
          size={opts.small ? scale(13) : scale(14)}
          color={opts.danger ? theme.colors.error : colorDeLosIconos}
          style={[styles.rowIcono, opts.small && styles.subRowIcono, styles.marcaDeCredits]}
        />
      ) : (
        <IconoWee
          name={icono}
          size={opts.small ? scale(18) : scale(20)}
          /* Solo el DIBUJO. El nombre de la fila sigue tomando el color de siempre. */
          color={opts.danger ? theme.colors.error : colorDeLosIconos}
          style={[styles.rowIcono, opts.small && styles.subRowIcono]}
        />
      )}
      <View style={styles.rowHueco}>
        <TouchableOpacity
          style={opts.small ? styles.subRowToque : styles.rowToque}
          onPress={onPress}
          activeOpacity={0.7}
          hitSlop={MARGEN_DE_TOQUE}
          accessibilityRole="button"
          accessibilityLabel={label}
        >
          <Text
            style={[
              opts.small ? styles.subRowText : styles.rowText,
              { color: opts.danger ? theme.colors.error : theme.colors.text },
              opts.active && styles.rowTextActive,
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </TouchableOpacity>
      </View>
      {opts.right ?? (
        /* El cheurón señala que la fila lleva a otro sitio, y abre lo mismo que el nombre. El vacío de en medio sigue sin escuchar. */
        <TouchableOpacity onPress={onPress} activeOpacity={0.7} hitSlop={MARGEN_DE_TOQUE} accessible={false} importantForAccessibility="no">
          <IconoDireccional name="chevron-forward" size={scale(16)} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );

  /**
   * Una fila del menu, con su nombre y su icono tomados de la fuente unica.
   *
   * Se escribe `fila('credits', ...)` en vez de repetir el emoji y la etiqueta:
   * asi el cajon y la barra de escritorio no pueden decir cosas distintas de la
   * misma opcion.
   */
  const fila = (
    id: MenuItemId,
    onPress: () => void,
    opts: { right?: React.ReactNode; active?: boolean; small?: boolean; danger?: boolean; label?: string } = {}
  ) => renderRow(MENU_ITEM[id].icono, opts.label ?? t(MENU_ITEM[id].clave), onPress, opts);

  /*
   * La línea que separa un grupo del anterior (`divisor` en `WEE_MENU`).
   */
  const renderDivisor = () => <View style={[styles.divisor, { backgroundColor: theme.colors.border }]} />;

  /*
   * El cajón, por encima de todo.
   *
   * Estaba en 50 y el encabezado de la web en 100, así que el encabezado lo
   * pintaba encima y se comía los primeros cien píxeles del menú. Ahí vivían la
   * cabecera de cuenta —tu nombre y qué perfil tienes activo— y, desde esta
   * fase, "Home": la primera opción no llegaba a verse. Un menú que se abre por
   * encima del contenido tiene que estar por encima también del encabezado.
   */
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 150 }]} pointerEvents="box-none">
      <TouchableWithoutFeedback onPress={closeDrawer}>
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.drawer,
          {
            width: DRAWER_WIDTH,
            backgroundColor: theme.colors.background,
            transform: [{ translateX }],
          },
        ]}
      >
        <ScrollView
          contentContainerStyle={[styles.drawerContent, { paddingTop: insets.top + SPACING.md, paddingBottom: insets.bottom + SPACING.xl + huecoDeLaBarra }]}
          showsVerticalScrollIndicator={false}
        >
          {/* La marca y el cierre. El ✕ cierra el cajón igual que tocar fuera. */}
          <View style={styles.marcaFila}>
            <View style={styles.marcaConEslogan}>
              <Image
                source={isWee ? require('../assets/images/weelogo-dark.png') : require('../assets/images/weelogo.png')}
                style={styles.logo}
                contentFit="contain"
                accessible={false}
              />
              {/* El eslogan, debajo del logo, en la lengua de la interfaz: la misma clave que la cabecera del Home. */}
              <Text style={[styles.eslogan, { color: theme.colors.textSecondary }]} numberOfLines={1}>{t('nav.brandSlogan')}</Text>
            </View>
            <TouchableOpacity onPress={closeDrawer} activeOpacity={0.7} style={styles.cerrar} accessibilityRole="button" accessibilityLabel={t('common.close')}>
              <Ionicons name="close" size={scale(22)} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Cabecera: quién soy. Abre Mi Weë (el perfil), donde está la agenda del perfil activo. */}
          <TouchableOpacity
            style={styles.userHeader}
            onPress={() => (user ? after(() => navigateTab('Profile')) : requireLogin())}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={user ? `${displayName}. ${t('nav.myProfile')}` : t('menu.tapToSignIn')}
          >
            {user ? (
              <AvatarDisplay
                size={scale(48)}
                avatarType={userProfile?.avatarType || 'predefined'}
                avatarId={userProfile?.avatarId || 'male'}
                photoURL={typeof userProfile?.photoURL === 'string' ? userProfile.photoURL : undefined}
                photoURLThumbnail={typeof userProfile?.photoURLThumbnail === 'string' ? userProfile.photoURLThumbnail : undefined}
                backgroundColor={theme.colors.accent}
              />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.surface }]}>
                <Ionicons name="person-circle-outline" size={scale(36)} color={theme.colors.textSecondary} />
              </View>
            )}
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: theme.colors.text }]} numberOfLines={1}>
                {displayName}
              </Text>
              {/*
                Debajo del nombre: el @usuario si la persona tiene uno; si no, qué
                perfil está activo. No hay insignia de verificación: hoy ese dato
                no llega aquí, y no se pinta una que no se puede respaldar.
              */}
              <Text style={[styles.userMeta, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {!user ? t('menu.tapToSignIn') : usuario ? usuario : isWee ? t('menu.activeWee') : t('menu.activeReal')}
              </Text>
            </View>
            <IconoDireccional name="chevron-forward" size={scale(18)} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          {/*
            EL SELECTOR DE IDENTIDAD. Sustituye a las filas «Perfil Real» y
            «Perfil Weë». Solo pinta y avisa: el cambio lo hace `elegirIdentidad`,
            con el `switchIdentity` y el `setThemeMode` de siempre. Sin sesión
            no se pinta: no hay identidad entre la que elegir.
          */}
          {user && (
            <View style={styles.selector}>
              <SelectorDeIdentidad activa={isWee ? 'hidi' : 'real'} tieneWee={hasWeeProfile} onElegir={elegirIdentidad} />
            </View>
          )}

          {/* WeëAI: la tarjeta que abre el centro creativo. Ya no despliega una lista: las experiencias están dentro. */}
          <View style={styles.tarjeta}>
            <TarjetaWeeAi variante="menu" onOpenWeeAi={goWeeAi} />
          </View>

          {/*
            LAS FILAS, EN EL ORDEN DEL CATÁLOGO. `WEE_MENU` dice qué hay y en
            qué orden; aquí solo se decide cómo se pinta cada grupo.
          */}
          {WEE_MENU.map((grupo, i) => (
            <View key={grupo.items.join('-')}>
              {grupo.divisor && renderDivisor()}
              {grupo.destacado ? (
                /*
                  MYWEËS, DESTACADA: tarjeta blanca (la superficie del tema) con su nombre, una descripción breve y
                  «Personalizar». La fila del nombre y la flecha DESPLIEGA aquí los atajos elegidos (acordeón).
                */
                <View style={[styles.myWees, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <TouchableOpacity
                    style={styles.myWeesFila}
                    onPress={alternarMyWees}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: myWeesAbierto }}
                    aria-expanded={myWeesAbierto}
                    accessibilityLabel={t(MENU_ITEM.mywees.clave)}
                  >
                    <IconoWee name={MENU_ITEM.mywees.icono} size={scale(20)} color={colorDeLosIconos} style={styles.rowIcono} />
                    <View style={styles.rowHueco}>
                      <Text style={[styles.rowText, styles.rowTextActive, { color: theme.colors.text }]} numberOfLines={1}>{t(MENU_ITEM.mywees.clave)}</Text>
                    </View>
                    {/* La flecha señala hacia delante y gira hacia abajo al desplegar (en RTL, la misma rotación desde su lado). */}
                    <Animated.View style={{ transform: [{ rotate: giroDeLaFlecha.interpolate({ inputRange: [0, 1], outputRange: ['0deg', dir.esRTL ? '-90deg' : '90deg'] }) }] }}>
                      <IconoDireccional name="chevron-forward" size={scale(16)} color={theme.colors.textSecondary} />
                    </Animated.View>
                  </TouchableOpacity>
                  {myWeesAbierto ? (
                    <View style={styles.atajos}>
                      {/* Sin atajos no se añade otra leyenda: la de debajo y «Personalizar» ya dicen qué hacer. */}
                      {myWees.accesos.length === 0 ? null : (
                        myWees.accesos.map((a) => {
                          const { nombre, icono } = pintarAcceso(a, t, nombreDeLaAgenda);
                          return (
                            <TouchableOpacity key={a.id} style={styles.atajo} onPress={() => abrirAtajo(a)} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={nombre}>
                              <IconoWee name={icono} size={scale(18)} color={colorDeLosIconos} />
                              <Text style={[styles.atajoTexto, dir.texto, { color: theme.colors.text }]} numberOfLines={1}>{nombre}</Text>
                            </TouchableOpacity>
                          );
                        })
                      )}
                    </View>
                  ) : null}
                  <Text style={[styles.myWeesTexto, { color: theme.colors.textSecondary }]}>{t('menu.myWeesHint')}</Text>
                  <TouchableOpacity
                    onPress={goCustomizeMyWees}
                    activeOpacity={0.7}
                    style={styles.personalizar}
                    accessibilityRole="button"
                    accessibilityLabel={t('menu.customize')}
                  >
                    {/* Relleno con el degradado de los botones (el + y la píldora de Credits); texto oscuro encima. */}
                    <RellenoDeDegradado colores={(theme.dark ? ARTE_WEEAI.oscuro : ARTE_WEEAI.claro).accion} radio={BORDER_RADIUS.full} espejo={dir.esRTL} />
                    <Ionicons name="options-outline" size={scale(15)} color={theme.colors.onInteraction} />
                    <Text style={[styles.personalizarTexto, { color: theme.colors.onInteraction }]} numberOfLines={1}>{t('menu.customize')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={i === 0 ? styles.primerGrupo : undefined}>
                  {grupo.items.map((id) =>
                    fila(id, ACCION[id] ?? closeDrawer, {
                      active: id === 'home' && enHome,
                      /* Credits: el saldo, a la derecha, con el degradado de marca. Se lee de `useWallet`; aquí no se toca ningún Credit. */
                      right: id === 'credits' && user ? (
                        <View style={[styles.creditsBadge, { backgroundColor: theme.colors.accent }]}>
                          <RellenoDeMarca radio={BORDER_RADIUS.full} />
                          <Text style={styles.creditsBadgeText}>
                            {balance === null ? '…' : `${formato.numero(balance)} Credits`}
                          </Text>
                        </View>
                      ) : undefined,
                    }),
                  )}
                </View>
              )}
            </View>
          ))}

          {/* Pie */}
          <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
            <TouchableOpacity onPress={() => after(() => navigateRoot('Help', { section: 'legal' }))} activeOpacity={0.7}>
              <Text style={[styles.footerLink, { color: theme.colors.textSecondary }]}>{t('menu.terms')}</Text>
            </TouchableOpacity>
            <Text style={[styles.footerDot, { color: theme.colors.textSecondary }]}>·</Text>
            <TouchableOpacity onPress={() => after(() => navigateRoot('Help', { section: 'legal' }))} activeOpacity={0.7}>
              <Text style={[styles.footerLink, { color: theme.colors.textSecondary }]}>{t('menu.privacy')}</Text>
            </TouchableOpacity>
          </View>

          {/*
            SALIR VA SOLO, Y EL ÚLTIMO.

            Estaba de tercer enlace en la línea legal, entre Términos y
            Privacidad y con su mismo cuerpo de letra: técnicamente era lo
            último del cajón, pero se leía como una nota al pie y había que
            buscarlo. No es una nota al pie: es lo que haces cuando quieres
            irte. Baja a su propia línea, debajo de lo legal, con sitio para el
            dedo y sin nada después.

            Sigue siendo el mismo `handleLogout` y solo escucha el texto, como
            el resto del cajón: el vacío de al lado no cierra la sesión de
            nadie.
          */}
          {user && (
            <View style={styles.salir}>
              <TouchableOpacity
                onPress={handleLogout}
                activeOpacity={0.7}
                hitSlop={MARGEN_DE_TOQUE}
                accessibilityRole="button"
                accessibilityLabel={t('menu.signOut')}
                style={styles.salirToque}
              >
                <Text style={[styles.salirTexto, { color: theme.colors.error }]}>{t('menu.signOut')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 20,
  },
  drawerContent: {
    paddingHorizontal: SPACING.md,
  },
  /* La marca arriba a un lado y el cierre al otro. */
  marcaFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  /* El logo y, debajo, el eslogan: se encogen antes que empujar el botón de cierre. */
  marcaConEslogan: {
    flexShrink: 1,
    minWidth: 0,
    alignItems: 'flex-start',
  },
  eslogan: {
    fontSize: scale(10),
    fontWeight: FONT_WEIGHT.regular,
  },
  logo: {
    height: scale(30),
    width: scale(86),
  },
  cerrar: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: -SPACING.sm,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  selector: {
    paddingHorizontal: SPACING.sm,
    marginBottom: SPACING.md,
  },
  tarjeta: {
    paddingHorizontal: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  primerGrupo: {
    marginBottom: SPACING.xs,
  },
  /* La tarjeta de MyWeës: el mismo velo y contorno que la de WeëAI, para que se lean como las dos piezas destacadas del menú. */
  myWees: {
    marginHorizontal: SPACING.xs,
    marginVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    paddingBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  myWeesFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    minHeight: scale(44),
    paddingHorizontal: SPACING.xs,
  },
  /* Los atajos desplegados: filas compactas, sangradas bajo el nombre. */
  atajos: {
    paddingStart: SPACING.xl,
    paddingEnd: SPACING.xs,
    paddingBottom: SPACING.xs,
  },
  atajo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    minHeight: 40,
  },
  atajoTexto: {
    flex: 1,
    minWidth: 0,
    fontSize: FONT_SIZE.sm,
  },
  /* Una sola leyenda corta, en el tamaño secundario (≈13). */
  myWeesTexto: {
    fontSize: FONT_SIZE.xs + 1,
    lineHeight: scale(17),
    paddingHorizontal: SPACING.xs,
  },
  personalizar: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    minHeight: scale(36),
    maxWidth: '100%',
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    marginHorizontal: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },
  personalizarTexto: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    flexShrink: 1,
  },
  avatarPlaceholder: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
    gap: scale(1),
  },
  userName: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
  },
  userMeta: {
    fontSize: FONT_SIZE.xs,
  },
  divisor: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: SPACING.sm,
    marginTop: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    minHeight: scale(44),
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  /*
   * El hueco del icono es el que tenía el emoji: 24 puntos de ancho. El dibujo
   * ocupa 20 y queda centrado, así que todas las etiquetas siguen empezando en
   * la misma vertical aunque las formas no se parezcan en nada —una casa es
   * ancha y un marcador estrecho, y sin este hueco fijo la columna bailaría—.
   */
  rowIcono: {
    width: scale(24),
    alignSelf: 'center',
  },
  /* La marca ocupa el hueco del icono y se centra en él: las filas no se mueven. */
  marcaDeCredits: { textAlign: 'center' },
  /*
   * Tres letras no caben en el hueco de dos. Se le dan ocho puntos más y se le
   * quitan del margen que viene después, así que la marca cabe entera y el
   * nombre de la fila sigue empezando donde empiezan todos los demás.
   */
  marcaAncha: { width: scale(32), marginRight: scale(-8) },
  /*
   * El hueco entre el nombre y el adorno de la derecha. Se lleva el `flex` que
   * antes tenía el texto: sigue empujando el adorno al borde, pero no escucha.
   */
  rowHueco: {
    flex: 1,
  },
  /*
   * El botón se ciñe al nombre —`flex-start` en vez de estirarse— y se deja
   * encoger, para que una etiqueta larga siga cortándose con puntos igual que
   * antes en lugar de desbordar la fila. El relleno de arriba y abajo es la
   * holgura del toque, y cabe dentro del alto que la fila ya tenía.
   */
  rowToque: {
    alignSelf: 'flex-start',
    flexShrink: 1,
    maxWidth: '100%',
    paddingVertical: scale(8),
  },
  subRowToque: {
    alignSelf: 'flex-start',
    flexShrink: 1,
    maxWidth: '100%',
    paddingVertical: scale(6),
  },
  rowText: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.regular,
  },
  rowTextActive: {
    fontWeight: FONT_WEIGHT.semibold,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    minHeight: scale(34),
    paddingHorizontal: SPACING.sm,
    paddingLeft: SPACING.lg,
  },
  subRowIcono: {
    width: scale(22),
  },
  subRowText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.regular,
  },
  creatorBlock: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
    borderRadius: BORDER_RADIUS.lg,
    paddingBottom: SPACING.xs,
  },
  creatorList: {
    paddingBottom: SPACING.xs,
  },
  tag: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: scale(2),
    borderRadius: BORDER_RADIUS.sm,
  },
  tagText: {
    color: '#1F2937',
    fontSize: scale(11),
    fontWeight: FONT_WEIGHT.medium,
  },
  creditsBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: scale(3),
    /* Píldora, como la del saldo en la barra de escritorio y la referencia del degradado. */
    borderRadius: BORDER_RADIUS.full,
  },
  creditsBadgeText: {
    color: '#1F2937',
    fontSize: scale(12),
    fontWeight: FONT_WEIGHT.semibold,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderTopWidth: 1,
  },
  footerLink: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
  },
  footerDot: {
    fontSize: FONT_SIZE.xs,
  },
  /*
   * La fila de salir. Un poco más de cuerpo que lo legal —es una acción, no una
   * nota— pero sin llegar al de las opciones con dibujo: no lleva icono, así que
   * igualarlo a ellas lo dejaría descolgado de la columna de nombres.
   */
  salir: {
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  salirToque: {
    alignSelf: 'flex-start',
    paddingVertical: SPACING.sm,
  },
  salirTexto: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
  },
});

export default DrawerMenu;
