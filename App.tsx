import React, { useEffect } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Alert, Platform } from 'react-native';
import * as Linking from 'expo-linking';

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
import { AuthProvider } from './contexts/AuthContext';
import { UserProfileProvider } from './contexts/UserProfileContext';
import { ScrollProvider } from './contexts/ScrollContext';
import { PushNotificationProvider } from './contexts/PushNotificationContext';
import { LocationProvider } from './contexts/LocationContext';
import { TabBarProvider } from './contexts/TabBarContext';
import MainStackNavigator from './navigation/MainStackNavigator';
import ErrorBoundary from './components/ErrorBoundary';
// SplashScreen de React removido - el splash nativo de Android es suficiente

// Tema oscuro personalizado para React Navigation
const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0A0A0A',
    card: '#0A0A0A',
    primary: '#F5B731',
  },
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
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        {/* StatusBar se controla dinámicamente desde ThemeContext */}
        <ThemeProvider>
          <AuthProvider>
            <UserProfileProvider>
              <ScrollProvider>
                <TabBarProvider>
                  <NavigationContainer linking={linking} theme={CustomDarkTheme}>
                    <PushNotificationProvider>
                      {/*
                        La ubicación va por dentro de la navegación, como las
                        notificaciones: al arrancar no pide nada: lee la
                        preferencia guardada —apagada mientras nadie la
                        encienda— y se queda quieta.
                      */}
                      <LocationProvider>
                        <MainStackNavigator />
                      </LocationProvider>
                    </PushNotificationProvider>
                  </NavigationContainer>
                </TabBarProvider>
              </ScrollProvider>
            </UserProfileProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
