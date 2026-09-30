import React, { useRef, useEffect, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { IconoWee } from './icons/IconoWee';
import { MarcaDeCredits } from './CreditsPill';
import { MarcaDeWeeAi } from './icons/MarcaDeWeeAi';
import { NombreDeIcono } from './icons/trazosDeWee';
import { useT } from '../contexts/IdiomaContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useIdioma } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import AvatarDisplay from './avatars/AvatarDisplay';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';
import { weeBizService, Business } from '../services/weeBizService';
import { useWallet } from '../hooks/useWallet';
import { WEE_EXPERIENCES } from '../constants/weeExperiences';
import { MENU_ITEM, MenuItemId } from '../constants/weeMenu';
import { useIdentidadActiva } from '../hooks/useEContact';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.8, 320);

interface DrawerMenuProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * El único menú ☰ de Weë.
 *
 *   PERFIL        Perfil Real · Perfil Weë · 💳 Credits
 *   EXPLORA       Comunidades · Weëls
 *   WeeTalk
 *   Weë Creator   🎨 Weë Design · 🎬 Weë Studio · … · 🧠 Weë Brain · 📁 Mis proyectos
 *   🔖 Guardados · ⚙️ Configuración · ❓ Ayuda
 *
 * Notificaciones no está: vive en la barra inferior, que se ve siempre.
 *
 * Credits va con los perfiles porque es información de tu cuenta, no un destino.
 *
 * Lo social no lleva nombre propio: el Home ya es la experiencia social.
 */
const DrawerMenu: React.FC<DrawerMenuProps> = ({ visible, onClose }) => {
  const t = useT();
  const { theme, setThemeMode } = useTheme();
  const { formato } = useIdioma();
  const { user, logout } = useAuth();
  const { userProfile, activeProfileType, hasWeeProfile, switchIdentity } = useUserProfile();
  /* Cómo se llama tu agenda ahora mismo: ËContact o ẄContact, según el perfil activo. */
  const { nombreLista } = useIdentidadActiva();
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

  const [myBusiness, setMyBusiness] = useState<Business | null>(null);
  const [creatorExpanded, setCreatorExpanded] = useState(true);

  const activeUid = userProfile?.uid || user?.uid;
  const { balance } = useWallet();

  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  /*
   * ¿Tiene negocio esta persona? Solo para poder ofrecerle su atajo.
   *
   * Aquí se CREABA además un documento de identidad `users/biz_<negocio>` en
   * cuanto alguien tenía un negocio, y se activaba como una tercera cara de la
   * cuenta. Eso se ha eliminado: un negocio no es una cara de una persona. El
   * negocio sigue existiendo —es de Weë Business, el producto— y el atajo lleva
   * a su pantalla, no a un cambio de identidad.
   */
  const realUid = user?.uid;
  useEffect(() => {
    if (!realUid) return;
    const loadBiz = async () => {
      try {
        setMyBusiness(await weeBizService.getBusinessByOwner(realUid));
      } catch (e) {
        console.error('Error loading business:', e);
      }
    };
    loadBiz();
  }, [realUid]);

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

  const handleLogout = () => {
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

  // ── Perfil ──
  const goRealProfile = () => {
    if (!user) return requireLogin();
    if (activeProfileType === 'real') return after(() => navigateTab('Profile'));
    switchIdentity();
    setThemeMode('light');
    closeDrawer();
  };

  const goWeeProfile = () => {
    if (!user) return requireLogin();
    if (!hasWeeProfile) return after(() => navigateRoot('WeeProfileCreation'));
    if (activeProfileType === 'hidi') return after(() => navigateTab('Profile'));
    switchIdentity();
    setThemeMode('dark');
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

  // ── Explora ──
  const goCommunities = () => after(() => navigation.navigate('ExploreCommunities'));
  // Weëls vive en el Home (pestaña "Weëls" del Landing): abrimos el Home y saltamos a esa pestaña.
  const goWeels = () => after(() => navigateTab('Home', { screen: 'Landing', params: { openWeels: true } }));
  const goWeeTalk = () => after(() => navigateTab('Inbox'));

  // ── Weë Creator ──
  const goCreator = (category?: string) => after(() => (category ? navigateRoot('Specialist', { id: category }) : navigateRoot('WeeCreator')));

  // ── Resto ──
  const goCredits = () => (user ? after(() => navigateRoot('CreditStore')) : requireLogin());
  const goEContact = () => (user ? after(() => navigateRoot('EContact')) : requireLogin());
  const goSaved = () => (user ? after(() => navigateRoot('SavedPosts')) : requireLogin());
  const goSettings = () => after(() => navigateRoot('Settings'));
  const goHelp = () => after(() => navigateRoot('Help'));

  if (!visible) return null;

  /* El nombre de la persona NO se traduce. Lo que se traduce es el respaldo. */
  const displayName = userProfile?.displayName || user?.displayName || t('common.guest');
  const isWee = activeProfileType === 'hidi';

  /*
   * EL COLOR DE LOS DIBUJOS DEL CAJÓN, DECIDIDO UNA VEZ.
   *
   * Lo leen los dos sitios que pintan un `IconoWee` —las filas corrientes y la
   * de Weë AI, que tiene forma propia por el desplegable—, así que no pueden
   * discrepar. Aquí NO entra nada más: los textos, el avatar, las etiquetas y
   * los chevrones siguen sacando su color del tema, como siempre.
   */
  const colorDeLosIconos = isWee ? VERDE_DEL_PERFIL_WEE : theme.colors.text;

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
      {opts.right}
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

  const renderSectionLabel = (label: string) => (
    <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
  );

  /*
   * La línea que separa un grupo del anterior. Los grupos con nombre se separan
   * con su rótulo; ËContact no tiene nombre de grupo y necesita la línea, o
   * quedaría pegado a los Credits como si fuera parte de tu cuenta.
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
          contentContainerStyle={[styles.drawerContent, { paddingTop: insets.top + SPACING.md, paddingBottom: insets.bottom + SPACING.xl }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Cabecera: quién soy */}
          <TouchableOpacity
            style={[styles.userHeader, { borderBottomColor: theme.colors.border }]}
            onPress={() => (user ? after(() => navigateTab('Profile')) : requireLogin())}
            activeOpacity={0.7}
          >
            {user ? (
              <AvatarDisplay
                size={scale(48)}
                avatarType={userProfile?.avatarType || 'predefined'}
                avatarId={userProfile?.avatarId || 'male'}
                photoURL={typeof userProfile?.photoURL === 'string' ? userProfile.photoURL : undefined}
                photoURLThumbnail={typeof userProfile?.photoURLThumbnail === 'string' ? userProfile.photoURLThumbnail : undefined}
                backgroundColor="#F5B731"
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
              <Text style={[styles.userMeta, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {!user ? t('menu.tapToSignIn') : isWee ? t('menu.activeWee') : t('menu.activeReal')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={scale(18)} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          {/*
            HOME, LA PRIMERA OPCIÓN.

            Va antes de "PERFIL" y sin rótulo de grupo: no pertenece a ninguno,
            es el sitio al que se vuelve. Se pinta aquí directamente, igual que
            la barra de escritorio hace con su "Inicio", porque es un destino de
            navegación y no una de las opciones del catálogo compartido.

            Estando ya en el Home, tocarla solo cierra el cajón: navegar a donde
            ya estás recarga la pantalla y pierde el sitio del muro.
          */}
          {renderRow('casa', t('menu.home'), goHome, { active: enHome })}

          {/* PERFIL */}
          {renderSectionLabel(t('menu.sectionProfile'))}
          {fila('realProfile', goRealProfile, { active: !!user && activeProfileType === 'real' })}
          {renderRow(MENU_ITEM.weeProfile.icono, hasWeeProfile || !user ? t('menu.weeProfile') : t('menu.createWeeProfile'), goWeeProfile, {
            active: isWee,
            right: !hasWeeProfile && user ? (
              <View style={[styles.tag, { backgroundColor: theme.colors.accent }]}>
                <Text style={styles.tagText}>{t('common.new')}</Text>
              </View>
            ) : undefined,
          })}
          {/*
            El negocio, como ATAJO a su pantalla — no como una identidad que se
            activa. Antes esta fila cambiaba la cara de la cuenta a «Perfil Biz»
            y ponía el tema morado; ahora lleva al negocio, que es de Weë
            Business. El día que existan las Páginas, esta fila será «Mis Pages».
          */}
          {myBusiness && renderRow('perfilBiz', myBusiness.name, () => {
            after(() => navigation.navigate('WeeBizProfile', { businessId: myBusiness.id }));
          })}
          {/*
            Credits, pegado a los perfiles y no a "Explora" (fase de UI).
            Es información de TU CUENTA —lo que tienes—, no un sitio al que ir,
            así que su sitio está aquí arriba y no en la lista de destinos.
            Misma fila, mismo saldo y mismo destino que antes: solo cambia el
            orden en el que se pinta.
          */}
          {fila('credits', goCredits, {
            right: user ? (
              <View style={[styles.creditsBadge, { backgroundColor: theme.colors.accent }]}>
                <Text style={styles.creditsBadgeText}>
                  {balance === null ? '…' : `${formato.numero(balance)} Credits`}
                </Text>
              </View>
            ) : undefined,
          })}

          {/*
            Tu agenda, entre líneas y sola.
            No es información de tu cuenta —eso son los Credits, justo encima— ni
            un destino donde explorar. Es tu gente, y por eso va en su propio
            hueco entre las dos cosas.

            Y se llama como la identidad activa: ËContact con el Perfil Real,
            ẄContact con el Perfil Weë. El nombre sale de `useIdentidadActiva`,
            la misma fuente que usa la pantalla; escribirlo aquí a mano haría que
            el menú y la agenda dijeran cosas distintas.
          */}
          {renderDivisor()}
          {fila('econtact', goEContact, { label: nombreLista })}

          {/* EXPLORA */}
          {renderDivisor()}
          {renderSectionLabel(t('menu.sectionExplore'))}
          {fila('communities', goCommunities)}
          {fila('weels', goWeels)}
          {fila('weetalk', goWeeTalk)}

          {/* Weë Creator */}
          <View style={styles.creatorBlock}>
            {/*
              Weë AI hace lo mismo que hacía —desplegar y plegar la lista—, pero
              desde los dos sitios donde la persona apunta: el nombre y el
              chevrón. Antes lo hacía la fila entera, y el chevrón funcionaba de
              rebote por estar dentro; ahora escucha él, que es lo que parece.
              El vacío de en medio ya no despliega, ni pliega, ni navega.
            */}
            <View style={styles.row}>
              {/*
                Weë AI lleva su marca, "ẄAI", y no un dibujo (decisión del
                usuario, 2026-09-16). El cerebro que llevaba antes es de Weë
                Brain, que tiene su propia fila justo debajo: el mismo dibujo en
                dos renglones seguidos decía dos cosas distintas.
              */}
              <MarcaDeWeeAi size={scale(13)} color={colorDeLosIconos} style={[styles.rowIcono, styles.marcaDeCredits, styles.marcaAncha]} />
              <View style={styles.rowHueco}>
                <TouchableOpacity
                  style={styles.rowToque}
                  onPress={() => setCreatorExpanded((v) => !v)}
                  activeOpacity={0.7}
                  hitSlop={MARGEN_DE_TOQUE}
                  accessibilityRole="button"
                  accessibilityLabel={MENU_ITEM.creator.label}
                >
                  <Text style={[styles.rowText, styles.rowTextActive, { color: theme.colors.text }]}>{MENU_ITEM.creator.label}</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={() => setCreatorExpanded((v) => !v)}
                activeOpacity={0.7}
                hitSlop={MARGEN_DE_TOQUE}
                accessibilityRole="button"
                accessibilityLabel={t(creatorExpanded ? 'menu.hideSpecialists' : 'menu.showSpecialists')}
              >
                <Ionicons name={creatorExpanded ? 'chevron-up' : 'chevron-down'} size={scale(18)} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {creatorExpanded && (
              <View style={styles.creatorList}>
                {/* El nombre es marca y va sin traducir; su descripción sí se traduce. */}
                {WEE_EXPERIENCES.map((exp) => renderRow(exp.icono, exp.name, () => goCreator(exp.id), { small: true }))}
                {fila('projects', () => (user ? after(() => navigateRoot('Projects')) : requireLogin()), { small: true })}
                {fila('creations', () => (user ? after(() => navigateRoot('MisCreaciones')) : requireLogin()), { small: true })}
              </View>
            )}
          </View>

          {fila('saved', goSaved)}
          {fila('settings', goSettings)}
          {fila('help', goHelp)}

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
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.md,
    marginBottom: SPACING.xs,
    borderBottomWidth: 1,
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
  sectionLabel: {
    fontSize: scale(11),
    fontWeight: FONT_WEIGHT.semibold,
    letterSpacing: 0.6,
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
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
    borderRadius: BORDER_RADIUS.sm,
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
