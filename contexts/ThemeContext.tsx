import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Appearance, ColorSchemeName, Animated, Easing, StyleSheet, Platform, StatusBar } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';

export type ThemeMode = 'system' | 'light' | 'dark' | 'biz';

export interface Theme {
  dark: boolean;
  colors: {
    primary: string;
    background: string;
    surface: string;
    card: string;
    text: string;
    textSecondary: string;
    border: string;
    accent: string;
    accentLight: string;
    accentDark: string;
    like: string;
    error: string;
    glow: string;
    backdrop: string;
    success: string;
    warning: string;
  };
}

const lightTheme: Theme = {
  dark: false,
  colors: {
    primary: '#F5B731',
    background: '#FFFFFF',
    surface: '#F8F9FA',
    card: '#FFFFFF',
    text: '#1F2937',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    accent: '#F5B731',
    accentLight: '#FFC94D',
    accentDark: '#E5A020',
    like: '#EF4444',
    error: '#EF4444',
    glow: 'rgba(245, 183, 49, 0.15)',
    backdrop: 'rgba(0, 0, 0, 0.4)',
    success: '#22C55E',
    warning: '#F59E0B',
  },
};

const darkTheme: Theme = {
  dark: true,
  colors: {
    primary: '#F5B731',
    background: '#0A0A0A',
    surface: '#1C1C1E',
    card: '#111111',
    text: '#FFFFFF',
    textSecondary: '#98989D',
    border: '#38383A',
    accent: '#F5B731',
    accentLight: '#FFC94D',
    accentDark: '#E5A020',
    like: '#FF6B6B',
    error: '#FF6B6B',
    glow: 'rgba(245, 183, 49, 0.25)',
    backdrop: 'rgba(0, 0, 0, 0.7)',
    success: '#22C55E',
    warning: '#F59E0B',
  },
};

const bizTheme: Theme = {
  dark: false,
  colors: {
    primary: '#7C3AED',
    background: '#FFFFFF',
    surface: '#F5F3FF',
    card: '#FFFFFF',
    text: '#1F2937',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    accent: '#7C3AED',
    accentLight: '#A78BFA',
    accentDark: '#5B21B6',
    like: '#EF4444',
    error: '#EF4444',
    glow: 'rgba(124, 58, 237, 0.15)',
    backdrop: 'rgba(0, 0, 0, 0.4)',
    success: '#22C55E',
    warning: '#F59E0B',
  },
};

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

/*
 * ─── El cambio de tema, sin apagar la pantalla ────────────────────────────────
 *
 * Antes esto se hacía tapando la aplicación entera con una lámina OPACA —blanca
 * al ir a oscuro, `#0A0A0A` al volver a claro— puesta de golpe a opacidad 1 y
 * desvanecida durante 800 ms. De ahí venía el apagón: cambiar del Perfil Weë al
 * Real ponía literalmente una pantalla negra encima de todo durante casi un
 * segundo, y el nuevo estado "aparecía" al levantarse la lámina. No era una
 * transición; era un telón.
 *
 * Ahora no se tapa nada. La interfaz baja un punto su presencia —del 100 % al
 * 90 %—, se pinta con los colores nuevos y vuelve al 100 % en un cuarto de
 * segundo. La aplicación está visible en todo momento y en ningún fotograma hay
 * una superficie negra ni blanca por encima.
 *
 * El 90 % es a propósito poco: bajar más disimularía mejor el salto de color,
 * pero justo eso —esconder el contenido— es lo que se está corrigiendo.
 */
const DURACION_CAMBIO_DE_TEMA = 240;
const PRESENCIA_MINIMA = 0.9;

/*
 * El hilo nativo solo en iOS y Android, que es donde existe.
 *
 * En el navegador no hay módulo nativo de animación: React Native Web lo avisa
 * por consola en cada cambio de tema y cae a JavaScript de todos modos. Pedir el
 * hilo de JavaScript desde el principio hace exactamente lo mismo sin el aviso.
 */
const HILO_NATIVO = Platform.OS !== 'web';

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');
  const [systemColorScheme, setSystemColorScheme] = useState<ColorSchemeName>(Appearance.getColorScheme());

  /** Cuánto se ve la aplicación. Nunca baja de `PRESENCIA_MINIMA`, nunca llega a 0. */
  const presencia = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme);
    });
    return () => subscription.remove();
  }, []);

  const getEffectiveTheme = (): Theme => {
    if (themeMode === 'biz') return bizTheme;
    if (themeMode === 'system') {
      return systemColorScheme === 'dark' ? darkTheme : lightTheme;
    }
    return themeMode === 'dark' ? darkTheme : lightTheme;
  };

  const theme = getEffectiveTheme();

  // Sincronizar navigation bar y status bar con el tema (Android only)
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setBackgroundColorAsync(theme.colors.background);
      NavigationBar.setButtonStyleAsync(theme.dark ? 'light' : 'dark');
      StatusBar.setBackgroundColor(theme.colors.background);
      StatusBar.setBarStyle(theme.dark ? 'light-content' : 'dark-content');
    }
  }, [theme]);

  /*
   * Ya está pintado el tema nuevo: se vuelve a la presencia completa.
   *
   * Va en un efecto, y no dentro de `setThemeMode`, porque el orden importa: el
   * hundimiento tiene que estar aplicado ANTES de que React pinte los colores
   * nuevos, y la recuperación DESPUÉS. Así el primer fotograma del tema nuevo ya
   * se ve —al 90 %— y sube desde ahí, que es lo que se lee como "aparece
   * progresivamente" en vez de "salta".
   */
  useEffect(() => {
    Animated.timing(presencia, {
      toValue: 1,
      duration: DURACION_CAMBIO_DE_TEMA,
      easing: Easing.out(Easing.quad),
      useNativeDriver: HILO_NATIVO,
    }).start();
  }, [themeMode, presencia]);

  const setThemeMode = (mode: ThemeMode) => {
    /*
     * Solo se hunde si de verdad hay cambio. Pedir el tema que ya tienes no
     * debe parpadear, y un toque repetido tampoco: `timing` sobre el mismo
     * valor interrumpe al anterior, así que dos cambios seguidos encadenan sin
     * acumularse.
     */
    if (mode !== themeMode) presencia.setValue(PRESENCIA_MINIMA);
    setThemeModeState(mode);
  };

  /*
   * Un solo envoltorio para móvil y web. La bifurcación anterior existía porque
   * el telón opaco quedaba fatal en el navegador; sin telón no hace falta, y el
   * cambio de identidad se siente igual en los tres sitios.
   */
  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeMode }}>
      <Animated.View style={[styles.wrapper, { opacity: presencia }]}>{children}</Animated.View>
    </ThemeContext.Provider>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
});

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
