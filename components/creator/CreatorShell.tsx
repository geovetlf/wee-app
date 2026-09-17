import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, StyleProp, LayoutChangeEvent, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { useAuth } from '../../contexts/AuthContext';
import { useUserProfile } from '../../contexts/UserProfileContext';
import { useResponsive } from '../../hooks/useResponsive';
import AvatarDisplay from '../avatars/AvatarDisplay';
import CreditsPill from '../CreditsPill';
import { ConMarcoDeSeccion } from './MarcoDeSeccion';
import CreatorSidebar from './CreatorSidebar';
import EspacioDeEscritura from '../EspacioDeEscritura';
import { ALTO_BARRA } from '../BarraInferior';
import { PaginaDeCajas, CajaAnclada, AIRE_DE_LA_CAJA } from './CajaQueCrece';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';
import { useScrollDeBarra } from '../../hooks/useScrollDeBarra';

interface CreatorShellProps {
  /** Qué elemento de la barra lateral se marca como activo ('creator', 'brain', 'photo'…). */
  activeId?: string;
  /** Texto pequeño sobre el título en móvil ("🤖 Weë AI"). */
  overline?: string;
  title: string;
  /**
   * Identidad de la sección al lado del título: un distintivo dibujado en vez de
   * un emoji suelto. En escritorio es además lo único que dice dónde estás,
   * porque las secciones cuyo muro manda ya no traen cabecera dentro (fase 2E-69).
   */
  mark?: React.ReactNode;
  /** Miga de pan del escritorio ("Weë AI"). */
  breadcrumb?: string;
  onBack?: () => void;
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  /**
   * En el teléfono, sin la franja de arriba (flecha de volver y nombre): la
   * sección se presenta sola con su cabecera —logo, nombre y lema—, que es lo
   * único que debe haber arriba (decisión del usuario, 2026-09-15). Se vuelve
   * con el gesto de atrás y con la barra de abajo, como en Weë Studio y Weë
   * Design, que nunca tuvieron esta franja. En escritorio se queda: allí es la
   * miga de pan de la barra lateral.
   */
  sinFranjaSuperior?: boolean;
  /**
   * LO QUE VA ANCLADO ABAJO, FUERA DE LA PÁGINA QUE SE DESPLAZA.
   *
   * Para una caja de escribir que tiene que sentirse fija: se queda pegada al
   * borde de abajo y, cuando sale el teclado, se queda pegada al teclado. Lo que
   * cambia de tamaño es la página de encima, que es la que se desplaza; el
   * contenido —en Weë Brain, el cerebro y sus seis satélites— no se mueve porque
   * el teclado haya aparecido, y no hay ningún `scrollTo` de por medio.
   *
   * Es el mismo reparto que la hoja de comentarios: lo que crece y encoge es la
   * lista, y lo de escribir no se mueve de su sitio.
   *
   * En escritorio no hay teclado que tape nada, así que va donde iría siempre:
   * al final del contenido.
   */
  pie?: React.ReactNode;
  /**
   * QUE LA PÁGINA SIGA A LA CONVERSACIÓN.
   *
   * Un testigo: cada vez que CAMBIA, la página baja hasta el final. Se le pasa
   * algo que cambie cuando llega un mensaje —cuántos hay, si está pensando— y
   * nada más; el marco no sabe qué es ni lo mira por dentro.
   *
   * Hace falta porque la caja va anclada abajo: lo que llega nuevo aparece
   * DETRÁS de ella si la página se queda donde estaba, y la conversación deja de
   * leerse como una conversación (decisión del usuario, 2026-09-16).
   *
   * No es lo mismo que perseguir al teclado. Aquí se baja porque ha llegado algo
   * nuevo que leer, una vez por mensaje; abrir el teclado no mueve nada.
   */
  seguirAlFinal?: unknown;
}

/**
 * HASTA DÓNDE PUEDE CRECER UNA CAJA ANCLADA: LO MISMO QUE EN WEË STUDIO.
 *
 * La regla de Weë AI es una sola (CLAUDE.md §9): la caja crece con lo escrito
 * hasta llenar lo que se ve, ahí se para y el texto se desplaza por dentro, con
 * sus botones siempre a la vista. Estar anclada no la cambia — solo cambia
 * QUIÉN le dice cuánto se ve, porque una caja anclada no puede preguntárselo a
 * la página: no vive dentro de ella.
 *
 * Hubo un tiempo —unas horas, el 2026-09-16— en que esta caja se quedaba con
 * poco menos de la mitad, para que al escribir no tapara el cerebro. El usuario
 * lo pidió al revés: que se extienda sin tope, como la de Weë Studio. Así que
 * escribir mucho tapa el cerebro mientras se escribe, y eso está decidido: la
 * página de debajo sigue ahí y vuelve en cuanto la caja se vacía.
 *
 * El aire es el mismo que deja una caja dentro de la página, y por eso se lee de
 * allí en vez de copiarlo. El mínimo es para el caso extremo —una pantalla muy
 * baja con el teclado abierto—: por debajo de eso la caja dejaría de ser usable.
 */
const ALTO_MINIMO_DE_LA_CAJA = scale(150);

/**
 * Marco de las pantallas de Weë Creator.
 * Escritorio: barra lateral con los especialistas + barra superior (buscar,
 * notificaciones, perfil) + contenido ancho. Móvil: cabecera compacta + contenido.
 */
const CreatorShell: React.FC<CreatorShellProps> = ({ activeId, overline, title, mark, breadcrumb = 'Weë AI', onBack, children, contentStyle, sinFranjaSuperior, pie, seguirAlFinal }) => {
  const { theme } = useTheme();
  const t = useT();
  /* Solo hace falta con pie anclado: cuánto mide la zona donde se escribe. */
  const [altoDeEscritura, setAltoDeEscritura] = useState(0);
  /*
   * Este contenedor es el que se desplaza en TODAS las experiencias de Weë
   * —Travel, Studio, Design, Music, Chef…—, así que engancharlo aquí las cubre
   * todas de una vez en lugar de pantalla por pantalla.
   *
   * ── SALVO DONDE HAY UNA CAJA ANCLADA ABAJO ──────────────────────────────────
   *
   * La barra de Weë se aparta al desplazarse hacia abajo, y al apartarse SUELTA
   * el hueco que la pila le tenía reservado (`MainStackNavigator`, el relleno que
   * sigue a `apartada`). Donde el contenido termina donde termina, eso es lo que
   * se busca: se gana una franja para leer.
   *
   * Pero una caja anclada vive justo encima de ese hueco. Soltarlo la baja 52
   * puntos más la zona segura, recuperarlo la sube otra vez, y como la zona de
   * escritura cambia de alto, cambia también hasta dónde puede crecer la caja:
   * se movía y cambiaba de tamaño al desplazar la conversación (visto en el
   * teléfono, 2026-09-16). Y lo hacía sola, porque bajar hasta el mensaje nuevo
   * ES desplazarse hacia abajo: cada respuesta la empujaba.
   *
   * Así que donde hay pie anclado no se le cuenta nada a la barra: se queda
   * puesta, el hueco no se mueve y la caja tampoco. Las demás secciones —que no
   * anclan nada— siguen exactamente igual.
   */
  const scrollDeBarra = useScrollDeBarra();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  const { isDesktop } = useResponsive();

  /*
   * Una sola medida, y solo cuando de verdad cambia: el alto de la zona donde se
   * escribe. De ahí sale hasta dónde puede crecer la caja anclada. No hay nada
   * escuchando en bucle —es el `onLayout` de siempre, que llega cuando el
   * teclado cambia el tamaño de la zona y no antes—.
   */
  const medirEscritura = (e: LayoutChangeEvent) => {
    const medido = Math.round(e.nativeEvent.layout.height);
    setAltoDeEscritura((antes) => (Math.abs(antes - medido) > 1 ? medido : antes));
  };
  const topeDelPie = altoDeEscritura > 0
    ? Math.max(ALTO_MINIMO_DE_LA_CAJA, altoDeEscritura - 2 * AIRE_DE_LA_CAJA)
    : 0;

  /*
   * LA PÁGINA SIGUE A LA CONVERSACIÓN.
   *
   * Bajar una vez al llegar el mensaje no basta: una respuesta larga sigue
   * creciendo DESPUÉS de que el mensaje exista —se pinta, se mide, se ajusta—,
   * así que se bajaba a donde acababa la conversación un instante antes y el
   * final se quedaba medio tapado por la caja (visto en el teléfono,
   * 2026-09-16), y luego se movía otra vez.
   *
   * Así que al llegar algo nuevo se abre una VENTANA de medio segundo: mientras
   * dura, cada vez que la página crece se vuelve a bajar hasta el final. Cuando
   * se cierra, la página es tuya otra vez y nadie te la mueve mientras lees
   * hacia arriba.
   */
  const refPagina = useRef<ScrollView>(null);
  const siguiendoHasta = useRef(0);
  const alFinal = (suave: boolean) => refPagina.current?.scrollToEnd({ animated: suave });
  useEffect(() => {
    if (seguirAlFinal === undefined) return;
    siguiendoHasta.current = Date.now() + 600;
    const cuando = setTimeout(() => alFinal(true), 60);
    return () => clearTimeout(cuando);
  }, [seguirAlFinal]);
  /* Solo dentro de la ventana: fuera de ella, esto no hace nada. */
  const alCrecerLaPagina = () => {
    if (Date.now() < siguiendoHasta.current) alFinal(false);
  };

  const back = onBack || (() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main')));
  const goSearch = () => navigation.navigate('Search');
  const goNotifications = () => navigation.navigate('Main', { screen: 'Home', params: { screen: 'Notifications' } });
  const goProfile = () => navigation.navigate(user ? 'Main' : 'Login', user ? { screen: 'Profile' } : undefined);

  if (!isDesktop) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        {!sinFranjaSuperior && (
        <View style={[styles.mobileHeader, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={back} style={styles.backButton} activeOpacity={0.7} accessibilityLabel={t('common.back')}>
            <Ionicons name="arrow-back" size={scale(23)} color={theme.colors.text} />
          </TouchableOpacity>
          {mark}
          <View style={styles.headerTitles}>
            {!!overline && <Text style={[styles.overline, { color: theme.colors.accentDark }]}>{overline}</Text>}
            <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>{title}</Text>
          </View>
          {/*
            EL SALDO, ARRIBA A LA DERECHA.
            Vuelve aquí por decisión del usuario (2026-09-15): dentro de Weë AI
            todo cuesta Credits, así que saber cuántos quedan es parte de la
            cabecera y no un dato que haya que ir a buscar al menú. En 2E-69 se
            quitó porque entonces estas pantallas empezaban por el muro y el
            número le restaba aire; ahora empiezan por lo que se crea.
          */}
          <CreditsPill compact />
        </View>
        )}
        {/*
          Todo lo que se escribe en Weë Creator pasa por aquí: la caja de idea de
          cada especialista, las preguntas guiadas, el editor de Writer, el chat
          de Brain. El acomodo al teclado se resuelve una sola vez, en el sitio
          que comparten todas, y no experiencia por experiencia.

          Y por lo mismo la página es `PaginaDeCajas`: es la que deja que cada
          caja crezca con lo escrito sin perder sus botones de vista, en todas
          las secciones de Weë AI y en las que vengan.
        */}
        {/*
          El teclado tapa primero el sitio que la pila guarda para la barra
          inferior: descontarlo deja la página justo encima del teclado, sin la
          franja muerta que quedaba antes entre las dos.
        */}
        {/*
          EL DESCUENTO, IGUAL CON PIE Y SIN ÉL.
          Cada pantalla guarda abajo el sitio de la barra de Weë —la página en su
          relleno, el pie en el suyo—, y al salir el teclado ese hueco queda
          debajo de él y ya no protege nada: por eso se descuenta.
          Y hace que el pie caiga solo donde tiene que caer: la zona de escritura
          termina `ALTO_BARRA` por debajo del teclado, el pie se guarda otros
          `ALTO_BARRA + SPACING.sm`, y la caja acaba justo encima del teclado sin
          que nadie tenga que medirlo. Se intentó con `descuento={0}` y un relleno
          que cambiaba con el teclado, y dejaba 60 puntos de franja muerta entre
          la caja y el teclado —medido en el teléfono—.
        */}
        <EspacioDeEscritura style={styles.fill} descuento={ALTO_BARRA}>
          {pie ? (
            <View style={styles.fill} onLayout={medirEscritura}>
              <PaginaDeCajas
                ref={refPagina}
                style={styles.fill}
                contentContainerStyle={[styles.mobileContent, contentStyle]}
                keyboardShouldPersistTaps="handled"
                onContentSizeChange={seguirAlFinal === undefined ? undefined : alCrecerLaPagina}
              >
                <ConMarcoDeSeccion saldoALaVista={!sinFranjaSuperior} aireLateral={SPACING.lg}>{children}</ConMarcoDeSeccion>
              </PaginaDeCajas>
              {/*
                Y aquí abajo lo que no se mueve. Con teclado se apoya en él; sin
                teclado, sobre la barra de Weë.
              */}
              <CajaAnclada alto={topeDelPie}>
                <View style={styles.pie}>
                  <ConMarcoDeSeccion saldoALaVista aireLateral={0}>{pie}</ConMarcoDeSeccion>
                </View>
              </CajaAnclada>
            </View>
          ) : (
            <PaginaDeCajas contentContainerStyle={[styles.mobileContent, contentStyle]} keyboardShouldPersistTaps="handled" {...scrollDeBarra}>
              {/*
                Si la franja de arriba se ve, el saldo ya está ahí y la cabecera de
                la sección —si la hay— no lo repite. Sin franja, lo enseña ella.
              */}
              <ConMarcoDeSeccion saldoALaVista={!sinFranjaSuperior} aireLateral={SPACING.lg}>{children}</ConMarcoDeSeccion>
            </PaginaDeCajas>
          )}
        </EspacioDeEscritura>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.desktop, { backgroundColor: theme.colors.surface }]}>
      <CreatorSidebar activeId={activeId} />
      <View style={styles.main}>
        <View style={[styles.topBar, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={back} style={styles.breadcrumb} activeOpacity={0.7} accessibilityLabel={t('common.back')}>
            <Ionicons name="arrow-back" size={scale(20)} color={theme.colors.text} />
            <Text style={[styles.breadcrumbText, { color: theme.colors.text }]}>{breadcrumb}</Text>
          </TouchableOpacity>
          {/*
            En escritorio la miga de pan es el camino de vuelta, no el sitio donde
            estás. Quien trae distintivo lo dice aquí, porque su contenido empieza
            ya en el muro y dentro no queda nada que lo nombre.
          */}
          {!!mark && (
            <View style={styles.identity}>
              <View style={[styles.identityBar, { backgroundColor: theme.colors.border }]} />
              {mark}
              <Text style={[styles.identityText, { color: theme.colors.text }]} numberOfLines={1}>{title}</Text>
            </View>
          )}
          {/*
            En escritorio el saldo no va aquí: la barra lateral de Weë AI ya lo
            enseña, en grande y con su botón de recargar, y se ve en todas las
            pantallas del taller sin moverse. Ponerlo además en esta barra sería
            el mismo número dos veces en el mismo golpe de vista.
          */}
          <View style={styles.topActions}>
            <TouchableOpacity onPress={goSearch} activeOpacity={0.7} style={[styles.search, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} accessibilityLabel={t('weeai.searchLabel')}>
              <Ionicons name="search-outline" size={scale(16)} color={theme.colors.textSecondary} />
              <Text style={[styles.searchText, { color: theme.colors.textSecondary }]}>{t('weeai.searchInWee')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={goNotifications} activeOpacity={0.7} style={[styles.iconButton, { borderColor: theme.colors.border }]} accessibilityLabel={t('weeai.notifications')}>
              <Ionicons name="notifications-outline" size={scale(20)} color={theme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={goProfile} activeOpacity={0.7} accessibilityLabel={t('weeai.myProfile')}>
              {userProfile ? (
                <AvatarDisplay
                  size={scale(36)}
                  avatarType={userProfile.avatarType || 'predefined'}
                  avatarId={userProfile.avatarId || 'male'}
                  photoURL={userProfile.photoURL}
                  photoURLThumbnail={userProfile.photoURLThumbnail}
                  backgroundColor={theme.colors.accent}
                  showBorder={false}
                />
              ) : (
                <View style={[styles.iconButton, { borderColor: theme.colors.border }]}>
                  <Ionicons name="person-outline" size={scale(20)} color={theme.colors.text} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
        <PaginaDeCajas contentContainerStyle={[styles.desktopContent, contentStyle]} keyboardShouldPersistTaps="handled">
          {/* La barra lateral ya enseña el saldo: la cabecera de la sección no lo repite. */}
          <ConMarcoDeSeccion saldoALaVista aireLateral={SPACING.xl}>
            {children}
            {/* En escritorio no hay teclado que tape nada: el pie va donde iría siempre. */}
            {pie}
          </ConMarcoDeSeccion>
        </PaginaDeCajas>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fill: {
    flex: 1,
  },
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  /*
   * 44 de verdad, sin `scale()`: el factor de web lo dejaba en 39,6 y volver
   * atrás es de lo poco que hay en esta cabecera. Un objetivo táctil no encoge
   * porque la pantalla sea otra.
   */
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitles: {
    flex: 1,
    marginLeft: SPACING.xs,
  },
  overline: {
    fontSize: scale(10),
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },
  mobileContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl * 2,
    gap: SPACING.xl,
  },
  /*
   * El pie anclado. Su relleno de abajo cambia con el teclado y por eso va en
   * línea; lo de aquí es lo que no cambia. Sin borde ni sombra: lo que se ve es
   * la caja, no el sitio donde está puesta.
   */
  /*
   * EL PIE NO GUARDA SITIO PARA LA BARRA DE ABAJO. NO HACE FALTA.
   *
   * La barra inferior de Weë no flota encima de la pantalla: ocupa su sitio, y
   * lo que le queda a la sección termina justo donde empieza ella. Reservarle
   * otros `ALTO_BARRA` dejaba la caja flotando 60 puntos por encima, con una
   * franja blanca debajo (visto en el teléfono, 2026-09-16).
   *
   * Así que un solo aire, el mismo con teclado y sin él: sin teclado la caja se
   * apoya en la barra de Weë; con teclado, `EspacioDeEscritura` sube la zona de
   * escritura y la caja se apoya en el teclado. Nada que medir ni que alternar.
   */
  pie: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  desktop: {
    flex: 1,
    flexDirection: 'row',
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    height: scale(64),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    minHeight: scale(40),
  },
  breadcrumbText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
  },
  /*
   * `flex: 1` para que ocupe el hueco entre la miga de pan y las acciones: con
   * `space-between` y solo tres hijos, sin esto la identidad quedaría centrada
   * en la barra en vez de pegada a la vuelta, que es donde se lee como un sitio.
   */
  identity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginLeft: SPACING.lg,
    minWidth: 0,
  },
  identityBar: {
    width: 1,
    height: scale(22),
    marginRight: SPACING.xs,
  },
  identityText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    width: scale(240),
    height: scale(40),
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
  },
  searchText: {
    fontSize: FONT_SIZE.sm,
  },
  iconButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopContent: {
    padding: SPACING.xl,
    paddingBottom: SPACING.xxxl * 2,
    gap: SPACING.xl,
    width: '100%',
    maxWidth: scale(1180),
    alignSelf: 'center',
  },
});

export default CreatorShell;
