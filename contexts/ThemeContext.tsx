import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Appearance, ColorSchemeName, Animated, StyleSheet, View, Platform, StatusBar } from 'react-native';
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

const isWeb = Platform.OS === 'web';

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');
  const [systemColorScheme, setSystemColorScheme] = useState<ColorSchemeName>(Appearance.getColorScheme());

  // Overlays for smooth theme transitions (mobile only)
  const lightOverlay = useRef(new Animated.Value(0)).current;
  const darkOverlay = useRef(new Animated.Value(0)).current;
  const needsFadeRef = useRef<'light' | 'dark' | null>(null);

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

  // Fade-out after theme render (mobile only)
  useEffect(() => {
    if (isWeb || !needsFadeRef.current) return;

    const overlay = needsFadeRef.current === 'light' ? lightOverlay : darkOverlay;
    needsFadeRef.current = null;

    Animated.timing(overlay, {
      toValue: 0,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [themeMode]);

  const setThemeMode = (mode: ThemeMode) => {
    // Web: instant theme change, no animation
    if (isWeb) {
      setThemeModeState(mode);
      return;
    }

    // Mobile: animated transition
    const currentDark = theme.dark;
    const targetDark = mode === 'dark';

    if (currentDark !== targetDark) {
      if (currentDark) {
        darkOverlay.setValue(1);
        needsFadeRef.current = 'dark';
      } else {
        lightOverlay.setValue(1);
        needsFadeRef.current = 'light';
      }
    }

    setThemeModeState(mode);
  };

  // Web: simple wrapper without overlays
  if (isWeb) {
    return (
      <ThemeContext.Provider value={{ theme, themeMode, setThemeMode }}>
        <View style={styles.wrapper}>{children}</View>
      </ThemeContext.Provider>
    );
  }

  // Mobile: wrapper with animated overlays
  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeMode }}>
      <View style={styles.wrapper}>
        {children}
        <Animated.View
          pointerEvents="none"
          style={[styles.overlay, styles.overlayWhite, { opacity: lightOverlay }]}
        />
        <Animated.View
          pointerEvents="none"
          style={[styles.overlay, styles.overlayBlack, { opacity: darkOverlay }]}
        />
      </View>
    </ThemeContext.Provider>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  overlayWhite: {
    backgroundColor: '#FFFFFF',
  },
  overlayBlack: {
    backgroundColor: '#0A0A0A',
  },
});

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
