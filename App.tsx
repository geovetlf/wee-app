import React, { useEffect } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
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
import { AuthProvider } from './contexts/AuthContext';
import { UserProfileProvider } from './contexts/UserProfileContext';
import { ScrollProvider } from './contexts/ScrollContext';
import { PushNotificationProvider } from './contexts/PushNotificationContext';
import { LocationProvider } from './contexts/LocationContext';
import { TabBarProvider } from './contexts/TabBarContext';
import { ComentariosProvider } from './contexts/ComentariosContext';
import MainStackNavigator from './navigation/MainStackNavigator';
import { refNavegacion } from './navigation/refNavegacion';
import ErrorBoundary from './components/ErrorBoundary';
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

// Configuración de linking para deep links y universal links
const linking: any = {
  prefixes: [
    prefix,
    'hidetok://',
    'https://wee.zone',
    'https://www.wee.zone',
    'http://localhost:8082',
  ],
  // Interceptar la URL inicial para filtrar URLs del dev client
  async getInitialURL() {
    const url = await Linking.getInitialURL();
    console.log('🔗 getInitialURL:', url);
    if (url && !shouldHandleUrl(url)) {
      console.log('🔗 URL filtrada (dev client), retornando null');
      return null;
    }
    return url;
  },
  // Interceptar URLs entrantes para filtrar URLs del dev client
  subscribe(listener: (url: string) => void) {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('🔗 URL entrante:', url);
      if (shouldHandleUrl(url)) {
        listener(url);
      } else {
        console.log('🔗 URL filtrada (dev client)');
      }
    });
    return () => subscription.remove();
  },
  config: {
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
              InboxMain: 'messages',
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
      PostDetail: {
        path: 'post/:postId',
        parse: {
          postId: (postId: string) => postId,
        },
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
              <ScrollProvider>
                <TabBarProvider>
                  {/*
                    La referencia deja que la barra de navegación —que se monta
                    al lado de la pila, no dentro— sepa dónde estás y pueda
                    navegar. Es la puerta oficial de React Navigation para eso.
                  */}
                  <NavigationContainer ref={refNavegacion} linking={linking} theme={CustomDarkTheme}>
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
