import React, { useEffect } from 'react';
import { NavigationContainer, DarkTheme, getPathFromState as rutaDesdeEstado } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Alert, Platform, View } from 'react-native';
import * as Linking from 'expo-linking';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { aplicarInter } from './utils/aplicarInter';
import { INTER } from './constants/typography';

/*
 * Inter queda puesta en `Text` y `TextInput` ANTES del primer render.
 *
 * Se hace aquí arriba, al evaluar el módulo, y no dentro del componente: si se
 * instalara en un efecto, el primer fotograma saldría con la fuente del sistema
 * y cambiaría después —justo el parpadeo que hay que evitar—.
 */
aplicarInter();

// Fix for web scrolling - enable touch scrolling on mobile browsers
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    html, body, #root {
      height: 100%;
      margin: 0;
      padding: 0;
      overflow: hidden;
    }
    #root > div {
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    /* Enable touch scrolling for all scrollable elements */
    [data-testid="scroll-view"],
    [class*="ScrollView"],
    div[style*="overflow"] {
      -webkit-overflow-scrolling: touch !important;
      touch-action: pan-y !important;
      overscroll-behavior: contain;
    }
  `;
  document.head.appendChild(style);
}

import { ThemeProvider } from './contexts/ThemeContext';
import { IdiomaProvider } from './contexts/IdiomaContext';
import SincronizarIdioma from './components/SincronizarIdioma';
import { AuthProvider } from './contexts/AuthContext';
import { UserProfileProvider } from './contexts/UserProfileContext';
import { ScrollProvider } from './contexts/ScrollContext';
import { PushNotificationProvider } from './contexts/PushNotificationContext';
import { LocationProvider } from './contexts/LocationContext';
import { TabBarProvider } from './contexts/TabBarContext';
import { ComentariosProvider } from './contexts/ComentariosContext';
import MainStackNavigator from './navigation/MainStackNavigator';
import { refNavegacion } from './navigation/refNavegacion';
import {
  TIPOS_DE_PUBLICACION, esCreativo, esId, esLugar, esRespuesta, esRespuestas, escribirJson, leerJson, nuncaEnLaUrl, sinObjetosSueltos,
} from './navigation/enlaces';
import ErrorBoundary from './components/ErrorBoundary';
import { crearTraductor } from './i18n/traducir';
import { DICCIONARIOS } from './i18n/diccionarios';
import { localeDeEmergencia } from './i18n/emergencia';
import { FILMMAKER_EN_LA_APP } from './constants/studioExperiences';
import { MUNDO_3D_EN_LA_APP } from './constants/studioExperiences';
// SplashScreen de React removido - el splash nativo de Android es suficiente

/*
 * React Navigation escribe con SU propia fuente.
 *
 * Las etiquetas de la barra inferior y los títulos que pinta la navegación
 * llevan un `fontFamily` explícito puesto por la librería —la pila del sistema—,
 * y el envoltorio de `Text` respeta a quien ya trae familia propia. Resultado: el
 * Home en Inter y "Inicio · Buscar · Crear · WeeTalk · Perfil" en Segoe UI. Se
 * comprobó en el DOM antes de corregirlo.
 *
 * Se arregla donde toca: diciéndole a la navegación cuáles son las fuentes de
 * Weë. Los cuatro nombres son los suyos; el reparto es la escala de Weë —lo que
 * la librería llama "bold" son encabezados, y en Weë los encabezados son 600—.
 */
const FUENTES_WEE = {
  regular: { fontFamily: INTER.regular, fontWeight: '400' as const },
  medium: { fontFamily: INTER.medium, fontWeight: '500' as const },
  bold: { fontFamily: INTER.semibold, fontWeight: '600' as const },
  heavy: { fontFamily: INTER.bold, fontWeight: '700' as const },
};

// Tema oscuro personalizado para React Navigation
const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0A0A0A',
    card: '#0A0A0A',
    primary: '#F5B731',
  },
  fonts: FUENTES_WEE,
};

// Prefijo para deep links nativos
const prefix = Linking.createURL('/');

// Filtrar URLs del dev client para que no interfieran con la navegación
const shouldHandleUrl = (url: string) => {
  if (url.includes('expo-development-client')) return false;
  return true;
};

/*
 * EL TÍTULO DE LA PESTAÑA, EN LA WEB.
 *
 * React Navigation escribe `document.title` en cada cambio de pantalla y su
 * formateador de serie es `options.title ?? route.name`. En las rutas anidadas
 * del Home no hay ni lo uno ni lo otro —llega sin ruta—, y el DOM convierte ese
 * hueco en la palabra "undefined", que es lo que se leía en la pestaña.
 *
 * Aquí se le añade el último escalón que le faltaba: el nombre de Weë. Lo de
 * arriba no se toca, así que una pantalla que sí traiga su propio título lo
 * sigue enseñando igual que antes.
 *
 * Y ese nombre se dice en la lengua de la interfaz. El formateador lo llama
 * NavigationContainer por fuera del árbol de React, así que no puede pedir
 * useT(): lee la lengua que IdiomaContext deja dicha —la misma que usa la
 * pantalla de error— y traduce con el traductor de siempre.
 */
const tituloDeWee = (): string => crearTraductor(localeDeEmergencia(), DICCIONARIOS)('nav.documentTitle');

/*
 * El nombre de la RUTA no se enseña nunca: es un identificador interno en inglés («Settings», «CreatorFlow»,
 * «WeeBizRegister») y una persona danesa lo leía en la pestaña. Sin título propio, la pestaña dice «Weë» en su idioma.
 */
const documentTitle = {
  formatter: (options?: { title?: string }): string => options?.title ?? tituloDeWee(),
};

// Configuración de linking para deep links y universal links
const linking: any = {
  prefixes: [
    prefix,
    'https://wee.zone',
    'https://www.wee.zone',
    'http://localhost:8082',
  ],
  // Interceptar la URL inicial para filtrar URLs del dev client
  async getInitialURL() {
    const url = await Linking.getInitialURL();
    /* Las URLs pueden llevar ids y parámetros de la persona: al registro solo en desarrollo, nunca en producción. */
    if (__DEV__) console.log('🔗 getInitialURL:', url);
    if (url && !shouldHandleUrl(url)) {
      if (__DEV__) console.log('🔗 URL filtrada (dev client), retornando null');
      return null;
    }
    return url;
  },
  // Interceptar URLs entrantes para filtrar URLs del dev client
  subscribe(listener: (url: string) => void) {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (__DEV__) console.log('🔗 URL entrante:', url);
      if (shouldHandleUrl(url)) {
        listener(url);
      } else if (__DEV__) {
        console.log('🔗 URL filtrada (dev client)');
      }
    });
    return () => subscription.remove();
  },
  /*
   * LA RED DE SEGURIDAD DE LA BARRA DE DIRECCIONES (navigation/enlaces.ts). Un parámetro que es un objeto y cuya
   * pantalla no dice cómo escribirlo se quedaba en la URL como «[object Object]»; ahora no sale de la memoria (atrás y
   * adelante lo siguen teniendo) y en desarrollo se avisa de cuál, para que esa pantalla declare su forma.
   */
  getPathFromState(estado: Parameters<typeof rutaDesdeEstado>[0], opciones?: Parameters<typeof rutaDesdeEstado>[1]) {
    const { estado: limpio, quitados } = sinObjetosSueltos(estado, opciones?.screens);
    if (__DEV__ && quitados.length) console.warn('🔗 Parámetros que no van a la URL (sin forma declarada):', quitados.join(', '));
    return rutaDesdeEstado(limpio, opciones);
  },
  config: {
    /*
     * La pila principal SIEMPRE debajo de lo que se abre por enlace: quien abre /wallet o /post/… en frío puede
     * volver atrás (al Inicio) en vez de quedarse sin salida.
     */
    initialRouteName: 'Main',
    screens: {
      Main: {
        path: '',
        screens: {
          Home: {
            path: 'home',
            screens: {
              Landing: '',
              Feed: 'feed/:communitySlug?',
              HomeFeed: 'all',
            },
          },
          Create: 'create',
          Inbox: {
            path: 'inbox',
            screens: {
              /* La ruta se llama InboxList (navigation/InboxStackNavigator.tsx): con «InboxMain», recargar WeeTalk llevaba al Inicio. */
              InboxList: 'messages',
            },
          },
          Profile: {
            path: 'profile',
            screens: {
              ProfileMain: 'me',
            },
          },
        },
      },
      Search: 'search',
      Settings: 'settings',
      Studio: 'studio',
      /* Con la puerta de Filmmaker cerrada (constants/studioExperiences.ts), la producción no tiene enlace. */
      ...(FILMMAKER_EN_LA_APP ? { Production: {
        path: 'studio/produccion/:productionId?',
        parse: {
          productionId: (productionId: string) => productionId,
          /* Los controles elegidos en «Varias escenas» viajan como JSON; si al recargar no se pueden leer, no viajan. */
          creativo: (creativo: string) => {
            try {
              const valor = JSON.parse(creativo);
              return valor && typeof valor === 'object' && !Array.isArray(valor) ? valor : undefined;
            } catch {
              return undefined;
            }
          },
        },
        stringify: {
          creativo: (creativo: unknown) => JSON.stringify(creativo ?? {}),
        },
      } } : {}),
      /* Con la puerta de «Crear mundo 3D» cerrada, tampoco tiene enlace. Ni la foto (es local) ni las palabras de la persona viajan en la dirección. */
      ...(MUNDO_3D_EN_LA_APP ? { Mundo3D: { path: 'studio/mundo-3d', stringify: { imageUri: nuncaEnLaUrl, descripcion: nuncaEnLaUrl } } } : {}),
      Design: 'design',
      PostDetail: {
        path: 'post/:postId',
        parse: {
          postId: (postId: string) => postId,
        },
        /* La publicación entera no viaja: es de otra persona, caduca, y al recargar se lee por su id. */
        stringify: { post: nuncaEnLaUrl },
      },
      UserProfile: {
        path: 'user/:userId',
        parse: {
          userId: (userId: string) => userId,
        },
      },
      Community: {
        path: 'community/:communityId',
        parse: {
          communityId: (communityId: string) => communityId,
        },
      },
      /*
       * CREDITS Y LA BILLETERA. Sin estas dos líneas la app escribía /CreditStore y /Wallet en la barra de direcciones
       * (React Navigation usa el nombre de la ruta cuando no hay configuración) pero no sabía leerlas: abrir el
       * enlace, o recargar, llevaba al Inicio. Las direcciones nuevas son en minúscula, como las demás; los alias
       * mantienen vivas las que ya se escribieron y quizá se guardaron.
       */
      CreditStore: { path: 'credits', alias: ['CreditStore'] },
      Wallet: { path: 'wallet', alias: ['Wallet'] },
      /*
       * WEË AI, EL FLUJO GUIADO. La experiencia va en la ruta; el trabajo (`jobId`), en cuanto existe —al recargar se
       * reabre ESE trabajo en vez de empezar otro—; las respuestas ya elegidas y las elecciones creativas, como JSON
       * validado. El objetivo escrito, la foto (`blob:` o con su token de descarga) y los adjuntos no salen nunca.
       */
      CreatorFlow: {
        path: 'weeai/:experienceId',
        parse: {
          experienceId: (v: string) => (esId(v) ? v : undefined),
          jobId: (v: string) => (esId(v) ? v : undefined),
          workspace: (v: string) => (esId(v) ? v : undefined),
          editorDocId: (v: string) => (esId(v) ? v : undefined),
          preset: (v: string) => leerJson(v, esRespuesta),
          presets: (v: string) => leerJson(v, esRespuestas),
          creative: (v: string) => leerJson(v, esCreativo),
        },
        stringify: {
          preset: escribirJson,
          presets: escribirJson,
          creative: escribirJson,
          goal: nuncaEnLaUrl,
          imageUri: nuncaEnLaUrl,
          adjuntos: nuncaEnLaUrl,
        },
      },
      /*
       * EL COMPOSITOR (la pantalla de la pila principal; la pestaña «create» es el marcador del botón +). El tipo, la
       * comunidad y el lugar elegido —que es público: es lo que se lee en la publicación— viajan; el borrador
       * (`prefill`, con lo escrito y los archivos) y la zona de la ubicación no salen nunca.
       */
      Create: {
        path: 'publicar',
        parse: {
          kind: (v: string) => ((TIPOS_DE_PUBLICACION as readonly string[]).includes(v) ? v : undefined),
          communitySlug: (v: string) => (esId(v) ? v : undefined),
          sourceSection: (v: string) => (esId(v) ? v : undefined),
          lugarElegido: (v: string) => leerJson(v, esLugar),
        },
        stringify: {
          lugarElegido: escribirJson,
          prefill: nuncaEnLaUrl,
          ubicacionElegida: nuncaEnLaUrl,
        },
      },
      AgregarUbicacion: {
        path: 'publicar/lugar',
        parse: { place: (v: string) => leerJson(v, esLugar) },
        stringify: { place: escribirJson, ubicacion: nuncaEnLaUrl },
      },
    },
  },
};

// Global error handler
const originalConsoleError = console.error;
console.error = (...args) => {
  originalConsoleError(...args);
  if (__DEV__ && Platform.OS !== 'web') {
    // Solo mostrar alerts en mobile, en web usamos console
    Alert.alert('Error detectado', JSON.stringify(args));
  }
};

// Catch unhandled promise rejections
const handleUnhandledRejection = (event: any) => {
  console.error('🚨 Unhandled Promise Rejection:', event.reason);
  if (__DEV__ && Platform.OS !== 'web') {
    Alert.alert('Promise Rejection', event.reason?.toString() || 'Unknown error');
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', handleUnhandledRejection);
}

export default function App() {
  /*
   * Las cuatro caras de Inter. Hasta que estén, no se pinta nada.
   *
   * El hueco que se enseña mientras tanto es un fondo liso del color de la
   * aplicación, sin texto ni indicador: en un móvil son unas décimas y un
   * cartel que aparece y desaparece se nota más que la espera. Lo importante es
   * que ningún texto llegue a verse con la fuente equivocada.
   *
   * Si la carga falla —`error`— se sigue adelante igual. Quedarse en el hueco
   * para siempre por una fuente sería cambiar un problema tipográfico por una
   * aplicación que no arranca; se verá con la fuente del sistema y punto.
   */
  const [fuentesListas, errorDeFuentes] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  /*
   * LA ESPERA DE LAS FUENTES SE PINTA DEL COLOR DEL SPLASH.
   *
   * Estaba en blanco, y el splash es `#0A0A0A`: al arrancar salía oscuro, luego
   * un fogonazo blanco y después la app. Con el color del tema de navegación
   * —el mismo del splash, de una sola fuente— el relevo no se ve.
   *
   * Es solo la superficie de espera: en cuanto las fuentes están, o si fallan,
   * se sigue exactamente igual que antes y manda el tema de cada pantalla. No
   * hay ninguna forma de quedarse aquí, porque `errorDeFuentes` también sale.
   */
  if (!fuentesListas && !errorDeFuentes) {
    return <View style={{ flex: 1, backgroundColor: CustomDarkTheme.colors.background }} />;
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        {/*
          El idioma envuelve a todo lo demás: ni el tema ni la sesión dependen
          de él, pero cualquiera de los dos puede necesitar un texto traducido.
        */}
        <IdiomaProvider>
        {/* StatusBar se controla dinámicamente desde ThemeContext */}
        <ThemeProvider>
          <AuthProvider>
            <UserProfileProvider>
              {/*
                No pinta nada: cose el idioma de la cuenta con el del aparato.
                Va aquí dentro porque necesita el perfil, y el perfil cuelga
                por debajo del idioma a propósito.
              */}
              <SincronizarIdioma />
              <ScrollProvider>
                <TabBarProvider>
                  {/*
                    La referencia deja que la barra de navegación —que se monta
                    al lado de la pila, no dentro— sepa dónde estás y pueda
                    navegar. Es la puerta oficial de React Navigation para eso.
                  */}
                  <NavigationContainer ref={refNavegacion} linking={linking} documentTitle={documentTitle} theme={CustomDarkTheme}>
                    <PushNotificationProvider>
                      {/*
                        La ubicación va por dentro de la navegación, como las
                        notificaciones: al arrancar no pide nada: lee la
                        preferencia guardada —apagada mientras nadie la
                        encienda— y se queda quieta.
                      */}
                      <LocationProvider>
                        {/*
                          La conversación de una publicación se abre encima de
                          cualquier muro, así que la hoja se monta una sola vez
                          aquí y no dentro de cada pantalla.
                        */}
                        <ComentariosProvider>
                          <MainStackNavigator />
                        </ComentariosProvider>
                      </LocationProvider>
                    </PushNotificationProvider>
                  </NavigationContainer>
                </TabBarProvider>
              </ScrollProvider>
            </UserProfileProvider>
          </AuthProvider>
        </ThemeProvider>
        </IdiomaProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
