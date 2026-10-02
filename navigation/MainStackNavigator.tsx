import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { ActivityIndicator, Animated, View, StyleSheet, Platform } from 'react-native';
import { useResponsive } from '../hooks/useResponsive';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NavegacionGlobal, { useBarraInferior, apartada } from './NavegacionGlobal';
import { ALTO_BARRA } from '../components/BarraInferior';
import MainTabsScreen from '../screens/MainTabsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import HelpScreen from '../screens/HelpScreen';
import IdiomaScreen from '../screens/IdiomaScreen';
import EngineAdminScreen from '../screens/EngineAdminScreen';
import SearchScreen from '../screens/SearchScreen';
import CreateScreen from '../screens/CreateScreen';
import PostDetailScreen from '../screens/PostDetailScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import CommunityScreen from '../screens/CommunityScreen';
import CommunitiesManagementScreen from '../screens/CommunitiesManagementScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import WeeProfileCreationScreen from '../screens/WeeProfileCreationScreen';
import AiAvatarScreen from '../screens/AiAvatarScreen';
import ReelsScreen from '../screens/ReelsScreen';
import CreditStoreScreen from '../screens/CreditStoreScreen';
import WalletScreen from '../screens/WalletScreen';
import WeeCreatorScreen from '../screens/WeeCreatorScreen';
import SavedPostsScreen from '../screens/SavedPostsScreen';
import EContactScreen from '../screens/EContactScreen';
import CreatorFlowScreen from '../screens/CreatorFlowScreen';
import SpecialistScreen from '../screens/SpecialistScreen';
import StudioScreen from '../screens/StudioScreen';
import ProductionScreen from '../screens/ProductionScreen';
import DesignScreen from '../screens/DesignScreen';
import WriterEditorScreen from '../screens/WriterEditorScreen';
import ProjectsScreen from '../screens/ProjectsScreen';
import MisCreacionesScreen from '../screens/MisCreacionesScreen';
import ProjectScreen from '../screens/ProjectScreen';
import WeeBizScreen from '../screens/WeeBizScreen';
import WeeBizCategoryScreen from '../screens/WeeBizCategoryScreen';
import WeeBizProfileScreen from '../screens/WeeBizProfileScreen';
import WeeBizRegisterScreen from '../screens/WeeBizRegisterScreen';
import WeeBizProductsScreen from '../screens/WeeBizProductsScreen';
import AuthStackNavigator from './AuthStackNavigator';
import Sidebar from '../components/Sidebar';
import RightSidebar from '../components/RightSidebar';
import { Post } from '../services/firestoreService';
import { scale } from '../utils/scale';
import AgregarUbicacionScreen from '../screens/AgregarUbicacionScreen';
import type { PostPlace } from '../data/places';
import type { UbicacionPublica } from '../utils/locationPrivacy';
import type { ContextoDeExperiencia } from '../constants/weeWorkspaces';

export type MainStackParamList = {
  Main: undefined;
  Settings: undefined;
  Idioma: undefined;
  Help: { section?: 'faq' | 'legal' } | undefined;
  EngineAdmin: undefined;
  CommunitiesManagement: undefined;
  Search: { query?: string } | undefined;
  /**
   * `prefill.media` es lo que trae quien llega desde un resultado de Weë: la
   * imagen ya creada, con su dirección en el Storage de Weë. Es una lista y no
   * un campo suelto para que valga igual para una foto, un antes y un después o
   * un video, sin volver a tocar este tipo.
   */
  /*
   * `lugarElegido`, `ubicacionElegida` y `selloUbicacion` son la VUELTA de
   * "Agregar ubicación": llegan con `merge`, así que el compositor no se vuelve a
   * montar y lo que hubiera escrito sigue escrito. `null` significa "quítalo", y
   * el sello distingue dos elecciones seguidas del mismo sitio.
   */
  Create: { communitySlug?: string; sourceSection?: string; kind?: string; prefill?: { content?: string; aiTools?: string[]; aiProcess?: string; media?: { type: 'image' | 'video'; uri: string; aspectRatio?: number; assetId?: string }[] }; lugarElegido?: PostPlace | null; ubicacionElegida?: UbicacionPublica | null; selloUbicacion?: string } | undefined;
  /** El lugar y la zona que ya trae el compositor, para poder enseñarlos y quitarlos. */
  AgregarUbicacion: { place?: PostPlace; ubicacion?: UbicacionPublica } | undefined;
  WeeCreator: { category?: string } | undefined;
  SavedPosts: undefined;
  /** ËContact: las conexiones de Weë entre personas. */
  EContact: undefined;
  /**
   * LO QUE LEE EL FLUJO GUIADO, Y NADA MÁS: `ContextoDeExperiencia` (constants/weeWorkspaces.ts), la forma que ya
   * mandan las portadas —Studio, Writer, Chef…— y que `CreatorFlowScreen` lee sin `as`. Aquí había una copia a mano
   * que se había quedado atrás (sin `editorDocId`, `creative`, `adjuntos` ni `workspace`), y la pantalla la tapaba
   * con un `as`.
   *
   * `presets` lleva VARIAS respuestas ya dadas, no una. Lo usa el puente de
   * "No sé qué hacer": cuando Weë ya miró la foto y la persona elige un camino,
   * el espacio y el estilo que ya dijo viajan con ella y no se le vuelven a
   * preguntar (fase 2E-60). `preset` sigue igual para quien solo lleva una.
   *
   * `experienceId` es opcional, como en el contexto: la dirección /weeai/<id> puede traer uno que no vale —el `parse`
   * de App.tsx lo descarta— y entonces el flujo abre la primera experiencia.
   */
  CreatorFlow: ContextoDeExperiencia;
  Specialist: { id: string };
  /* Weë Studio tiene ruta propia: es un sitio, no una ficha de especialista. */
  Studio: undefined;
  /**
   * «Varias escenas» (Weë Filmmaker, F1-C): una producción abierta con `productionId`; sin él, tus producciones y,
   * si se llega desde la caja de Weë Studio, la producción a punto de nacer con lo escrito (`intencion`) y los
   * controles de cámara elegidos (`creativo`, por ruta del lenguaje creativo).
   */
  Production: { productionId?: string; intencion?: string; creativo?: Record<string, string> } | undefined;
  /* Weë Design, igual que Studio: un sitio con pantalla propia. */
  Design: undefined;
  WriterEditor: { docId?: string; text?: string; title?: string; replaceText?: string } | undefined;
  Projects: undefined;
  Project: { id: string };
  /* Mis creaciones: la biblioteca de material de la cuenta (Fase 11). */
  MisCreaciones: undefined;
  /*
   * La dirección es /post/<postId>: el id va siempre. La publicación entera, si ya se tiene, viaja en memoria para no
   * volver a leerla, pero no sale a la URL (navigation/enlaces.ts); al recargar se lee por su id.
   */
  PostDetail: {
    postId?: string;
    post?: Post;
  };
  UserProfile: {
    userId: string;
  };
  Community: {
    communityId: string;
  };
  WeeProfileCreation: undefined;
  AiAvatar: undefined;
  CreditStore: undefined;
  Wallet: undefined;
  WeeBiz: undefined;
  WeeBizCategory: { categoryId: string; categoryLabel: string };
  WeeBizProfile: { businessId: string };
  WeeBizRegister: { business?: any } | undefined;
  WeeBizProducts: { businessId: string; isOwner: boolean };
  Reels: {
    initialPost: Post;
    initialVideoPosts: Post[];
    communitySlug?: string | null;
    initialPositionMillis?: number;
  };
  Auth: {
    screen?: 'Login' | 'Register';
  } | undefined;
  Login: undefined;
  Register: undefined;
};

const Stack = createStackNavigator<MainStackParamList>();

// Wrapper components para desktop layout
const DesktopLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme } = useTheme();
  return (
    <View style={[styles.desktopContainer, { backgroundColor: theme.colors.background }]}>
      <View style={styles.leftSidebar}>
        <Sidebar />
      </View>
      <View style={[styles.mainContent, {
        borderLeftColor: theme.colors.border,
        borderRightColor: theme.colors.border,
      }]}>
        {children}
      </View>
      <View style={styles.rightSidebar}>
        <RightSidebar />
      </View>
    </View>
  );
};

const MainScreen = () => {
  const { isDesktop } = useResponsive();
  return isDesktop ? (
    <DesktopLayout><MainTabsScreen /></DesktopLayout>
  ) : (
    <MainTabsScreen />
  );
};

const SettingsWrapper = () => {
  const { isDesktop } = useResponsive();
  return isDesktop ? (
    <DesktopLayout><SettingsScreen /></DesktopLayout>
  ) : (
    <SettingsScreen />
  );
};

const SearchWrapper = () => {
  const { isDesktop } = useResponsive();
  return isDesktop ? (
    <DesktopLayout><SearchScreen /></DesktopLayout>
  ) : (
    <SearchScreen />
  );
};

const CreateWrapper = () => {
  const { isDesktop } = useResponsive();
  return isDesktop ? (
    <DesktopLayout><CreateScreen /></DesktopLayout>
  ) : (
    <CreateScreen />
  );
};

const MainStackNavigator: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const { userProfile, loading: profileLoading } = useUserProfile();
  const barra = useBarraInferior();
  const insets = useSafeAreaInsets();
  const [isInitialLoad, setIsInitialLoad] = React.useState(true);

  React.useEffect(() => {
    if (!authLoading && isInitialLoad) {
      setIsInitialLoad(false);
    }
  }, [authLoading, isInitialLoad]);

  if (authLoading || isInitialLoad) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: '#0A0A0A' }]}>
        <ActivityIndicator size="large" color="#F5B731" />
      </View>
    );
  }

  const hasValidDisplayName = userProfile?.displayName &&
    userProfile.displayName !== user?.email?.split('@')[0] &&
    userProfile.displayName !== 'Usuario Anónimo';

  const needsOnboarding = user && userProfile && !hasValidDisplayName;

  if (needsOnboarding) {
    return <OnboardingScreen />;
  }

  /*
   * ─── La navegación de Weë, montada UNA sola vez ───────────────────────────
   *
   * Aquí, al nivel de la pila principal, porque es el único sitio desde el que
   * se ven todas las pantallas. Dentro del navegador de pestañas solo se veían
   * las cinco pestañas, y por eso la barra desaparecía al entrar en Weë Travel,
   * en una publicación o en una comunidad —que son hermanas de `Main`, no hijas
   * suyas—.
   *
   * Va DESPUÉS de la pila y por encima: así queda quieta mientras el contenido
   * de cada pantalla se desplaza por detrás, sin que ninguna pantalla tenga que
   * enterarse de que existe.
   */
  return (
    <View style={styles.raiz}>
      {/*
        SITIO PARA LA BARRA, SOLO DONDE HACE FALTA.

        Las pantallas de las pestañas —Home, Buscar, WeeTalk, Perfil— ya dejaban
        hueco abajo desde siempre, porque la barra vivía dentro de ellas. Las
        demás —Weë Travel, una publicación, una comunidad, Mis proyectos— nunca
        tuvieron ninguna: si no se les reserva, la barra les tapa la última fila.

        Se reserva aquí, en un solo sitio, en vez de ir pantalla por pantalla
        añadiendo paddings que luego nadie sabe de dónde salen.
      */}
      <Animated.View
        style={{
          flex: 1,
          /*
            El hueco se suelta a la vez que la barra se va, con el mismo número
            que la mueve: mientras está escondida el contenido llega hasta abajo
            y no queda una franja vacía esperándola.
          */
          paddingBottom:
            barra.visible && !barra.enPestanas
              ? apartada.interpolate({
                  inputRange: [0, 1],
                  outputRange: [ALTO_BARRA + insets.bottom, 0],
                })
              : 0,
        }}
      >
      <Stack.Navigator
      screenOptions={{
        headerShown: false,
        /*
         * La tarjeta lleva SU PROPIO FONDO, el del tema.
         *
         * Antes solo llevaba `flex: 1` y heredaba el del contenedor de
         * navegación, que es oscuro fijo. Mientras el Perfil Real es una app
         * blanca, cualquier momento en que la tarjeta no cubra del todo —una
         * transición, el gesto de volver de iOS a medio camino— dejaba ver una
         * banda negra por debajo. Con fondo propio no hay nada que asome.
         */
        cardStyle: { flex: 1, backgroundColor: theme.colors.background },
        /*
         * ─── LA TRANSICIÓN, CADA UNA EN SU CASA ─────────────────────────────
         *
         * Weë usaba un fundido en todas partes, con su propio `transitionSpec`.
         * En Android y en el navegador se queda tal cual: es lo que está
         * probado y lo que se ve hoy.
         *
         * En iPhone no. Ahí el fundido sustituía el deslizamiento lateral de
         * siempre, y el gesto de volver —que está encendido— dejaba de seguir
         * al dedo: se arrastraba de canto y lo único que pasaba era que la
         * pantalla se desvanecía. Quitando el interpolador y su tiempo, React
         * Navigation pone el suyo, que en iOS es el nativo y el que la gente
         * espera. Las pantallas que piden `presentation: 'modal'` conservan su
         * comportamiento, que allí es la hoja de iOS.
         */
        ...(Platform.OS === 'ios'
          ? null
          : {
              cardStyleInterpolator: ({ current }: { current: { progress: any } }) => ({
                cardStyle: { opacity: current.progress },
              }),
              transitionSpec: {
                open: { animation: 'timing' as const, config: { duration: 350 } },
                close: { animation: 'timing' as const, config: { duration: 250 } },
              },
            }),
        detachPreviousScreen: false,
      }}
    >
      <Stack.Screen name="Main" component={MainScreen} />
      <Stack.Screen
        name="Settings"
        component={SettingsWrapper}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="Search"
        component={SearchWrapper}
        options={{ gestureEnabled: true }}
      />
      <Stack.Screen
        name="Create"
        component={CreateWrapper}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
      <Stack.Screen name="Community" component={CommunityScreen} />
      <Stack.Screen name="WeeProfileCreation" component={WeeProfileCreationScreen} />
      <Stack.Screen name="AiAvatar" component={AiAvatarScreen} />
      <Stack.Screen name="CreditStore" component={CreditStoreScreen} />
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="WeeCreator" component={WeeCreatorScreen} />
      <Stack.Screen name="AgregarUbicacion" component={AgregarUbicacionScreen} />
      <Stack.Screen name="SavedPosts" component={SavedPostsScreen} />
      <Stack.Screen name="EContact" component={EContactScreen} />
      <Stack.Screen name="CreatorFlow" component={CreatorFlowScreen} />
      <Stack.Screen name="Specialist" component={SpecialistScreen} />
      <Stack.Screen name="Studio" component={StudioScreen} />
      <Stack.Screen name="Production" component={ProductionScreen} />
      <Stack.Screen name="Design" component={DesignScreen} />
      <Stack.Screen name="WriterEditor" component={WriterEditorScreen} />
      <Stack.Screen name="Projects" component={ProjectsScreen} />
      <Stack.Screen name="MisCreaciones" component={MisCreacionesScreen} />
      <Stack.Screen name="Help" component={HelpScreen} />
      <Stack.Screen name="Idioma" component={IdiomaScreen} />
      <Stack.Screen name="EngineAdmin" component={EngineAdminScreen} />
      <Stack.Screen name="CommunitiesManagement" component={CommunitiesManagementScreen} />
      <Stack.Screen name="Project" component={ProjectScreen} />
      <Stack.Screen name="WeeBiz" component={WeeBizScreen} />
      <Stack.Screen name="WeeBizCategory" component={WeeBizCategoryScreen} />
      <Stack.Screen name="WeeBizProfile" component={WeeBizProfileScreen} />
      <Stack.Screen name="WeeBizRegister" component={WeeBizRegisterScreen} />
      <Stack.Screen name="WeeBizProducts" component={WeeBizProductsScreen} />
      <Stack.Screen
        name="Reels"
        component={ReelsScreen}
        options={{
          presentation: 'modal',
          cardStyle: { backgroundColor: '#000' },
        }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ presentation: 'modal' }}
      />
      </Stack.Navigator>
      </Animated.View>
      <NavegacionGlobal />
    </View>
  );
};

const styles = StyleSheet.create({
  raiz: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  desktopContainer: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'stretch',
  },
  leftSidebar: {
    width: scale(280),
    borderRightWidth: scale(0.5),
  },
  mainContent: {
    flex: 1,
    minWidth: 0,
    maxWidth: scale(700),
    borderLeftWidth: Platform.OS === 'web' ? scale(0.5) : 0,
    borderRightWidth: Platform.OS === 'web' ? scale(0.5) : 0,
  },
  rightSidebar: {
    width: scale(320),
    borderLeftWidth: scale(0.5),
  },
});

export default MainStackNavigator;
