import React, { useState, useEffect } from 'react';
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
import CreditsPill from './CreditsPill';
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

interface HeaderProps {
  onNotificationsPress?: () => void;
  onMenuPress?: () => void;
  onBackPress?: () => void;
  transparent?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onNotificationsPress, onMenuPress, onBackPress, transparent }) => {
  const { theme, setThemeMode } = useTheme();
  const { user } = useAuth();
  const { hasHidiProfile, hasBizProfile, activeProfileType, switchIdentity, switchToBiz } = useUserProfile();

  const handleSwitchIdentity = () => {
    if (activeProfileType === 'biz') {
      // Biz -> Real
      switchToBiz();
      setThemeMode('light');
    } else {
      // Real <-> Hidi
      switchIdentity();
      const nextType = activeProfileType === 'real' ? 'hidi' : 'real';
      setThemeMode(nextType === 'hidi' ? 'dark' : 'light');
    }
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
        <View style={styles.content}>
          <View style={styles.leftSection}>
            {/* Back or hamburger menu */}
            {onBackPress ? (
              <TouchableOpacity onPress={onBackPress} activeOpacity={0.7} style={styles.menuButton}>
                {isWeb ? (
                  <Text style={{ fontSize: 20, color: textColor }}>←</Text>
                ) : (
                  <Ionicons name="arrow-back" size={scale(23)} color={textColor} />
                )}
              </TouchableOpacity>
            ) : onMenuPress ? (
              <TouchableOpacity onPress={onMenuPress} activeOpacity={0.7} style={styles.menuButton}>
                {isWeb ? (
                  <Text style={{ fontSize: 20, color: textColor }}>☰</Text>
                ) : (
                  <Ionicons name="menu-outline" size={scale(23)} color={textColor} />
                )}
              </TouchableOpacity>
            ) : null}

            {/* Logo */}
            <TouchableOpacity onPress={handleLogoPress} activeOpacity={0.7} style={styles.logoContainer}>
            <Image
              source={(transparent || activeProfileType === 'hidi') ? require('../assets/images/weelogo-dark.png') : require('../assets/images/weelogo.png')}
              style={styles.weeLogo}
              contentFit="contain"
              priority="high"
              cachePolicy="memory-disk"
            />
          </TouchableOpacity>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            {/* Credits siempre visibles (solo con sesión) */}
            <CreditsPill compact light={transparent} />

            {/* Switch Identity Button - visible si tiene perfil HIDI o está en modo BIZ */}
            {user && (hasHidiProfile || activeProfileType === 'biz') && (
              <TouchableOpacity
                style={[styles.switchButton, {
                  backgroundColor: transparent
                    ? 'rgba(255,255,255,0.15)'
                    : activeProfileType === 'biz'
                      ? '#7C3AED' + '20'
                      : (activeProfileType === 'hidi' ? theme.colors.accent + '20' : theme.colors.surface),
                  borderColor: transparent
                    ? 'rgba(255,255,255,0.3)'
                    : activeProfileType === 'biz'
                      ? '#7C3AED'
                      : (activeProfileType === 'hidi' ? theme.colors.accent : theme.colors.border),
                }]}
                onPress={handleSwitchIdentity}
                activeOpacity={0.7}
              >
                {isWeb ? (
                  <Text style={{ fontSize: 14 }}>
                    {activeProfileType === 'biz' ? '🏪' : activeProfileType === 'hidi' ? '🙈' : '👁️'}
                  </Text>
                ) : (
                  <Ionicons
                    name={activeProfileType === 'biz' ? 'storefront' : (activeProfileType === 'hidi' ? 'eye-off' : 'eye')}
                    size={ICON_SIZE.md}
                    color={transparent ? 'white' : (activeProfileType === 'biz' ? '#7C3AED' : activeProfileType === 'hidi' ? theme.colors.accent : textColor)}
                  />
                )}
                <Text style={[styles.switchButtonText, {
                  color: transparent ? 'white' : (activeProfileType === 'biz' ? '#7C3AED' : activeProfileType === 'hidi' ? theme.colors.accent : textColor),
                }]}>
                  {activeProfileType === 'biz' ? 'Biz' : activeProfileType === 'hidi' ? 'Weë' : 'Real'}
                </Text>
              </TouchableOpacity>
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
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
    color: 'white',
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
});

export default Header;
