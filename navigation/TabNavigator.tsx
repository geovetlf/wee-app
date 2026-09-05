import React, { useState, useEffect } from 'react';
import { TouchableOpacity, View, StyleSheet, Platform, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useScroll } from '../contexts/ScrollContext';
import { useResponsive } from '../hooks/useResponsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

const isWeb = Platform.OS === 'web';

// Emoji icons for web
const TAB_EMOJIS: Record<string, string> = {
  'Home': '🏠',
  'Search': '🔍',
  'Create': '➕',
  'Inbox': '💬',
  'Profile': '👤',
};

import HomeStackNavigator from './HomeStackNavigator';
import InboxStackNavigator from './InboxStackNavigator';
import ProfileStackNavigator from './ProfileStackNavigator';
import SearchScreen from '../screens/SearchScreen';
import { MainStackParamList } from './MainStackNavigator';
import AvatarDisplay from '../components/avatars/AvatarDisplay';
import { useAuth } from '../contexts/AuthContext';
import { messagesService } from '../services/messagesService';
import CustomTabBar from '../components/CustomTabBar';
import CreateSheet, { CreateKind } from '../components/CreateSheet';

// La pestaña "Create" no tiene pantalla propia: si alguien llega aquí por URL
// directa (web), lo devolvemos al inicio. Crear sigue siendo un modal fullscreen.
const CreateTabPlaceholder = () => {
  const navigation = useNavigation<any>();
  useEffect(() => {
    navigation.navigate('Home');
  }, [navigation]);
  return null;
};

const Tab = createBottomTabNavigator();

type TabNavigatorNavigationProp = StackNavigationProp<MainStackParamList>;

/**
 * Botón "+": abre la hoja Crear (Publicación, Weël, Imagen, Video, Texto, Pregunta)
 * y, si el usuario necesita una herramienta de IA, lo lleva a WEE Creator.
 */
// Se descartan href/onPress del tab bar: en web el href convertiría el botón en un
// enlace real a /create (recarga la página) en vez de abrir la hoja Crear.
const CreateTabButton = ({ href: _href, onPress: _onPress, ...props }: any) => {
  const navigation = useNavigation<TabNavigatorNavigationProp>();
  const { user } = useAuth();
  const [sheetVisible, setSheetVisible] = useState(false);

  const rootNavigate = (screen: string, params?: object) => {
    try {
      const parentNav = navigation.getParent();
      if (parentNav) {
        (parentNav as any).navigate(screen, params);
      } else {
        (navigation as any).navigate(screen, params);
      }
    } catch (error) {
      console.error(`Error navigating to ${screen}:`, error);
    }
  };

  const handleSelect = (kind: CreateKind) => {
    setSheetVisible(false);
    setTimeout(() => rootNavigate('Create', { kind }), isWeb ? 0 : 150);
  };

  const handleOpenCreator = () => {
    setSheetVisible(false);
    setTimeout(() => rootNavigate('WeeCreator'), isWeb ? 0 : 150);
  };

  return (
    <>
      <TouchableOpacity
        {...props}
        onPress={() => {
          if (!user) {
            rootNavigate('Register');
            return;
          }
          setSheetVisible(true);
        }}
      />
      <CreateSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onSelect={handleSelect}
        onOpenCreator={handleOpenCreator}
      />
    </>
  );
};

const TabNavigator: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  const { triggerScrollToTop } = useScroll();
  const { isDesktop, isTablet } = useResponsive();
  const insets = useSafeAreaInsets();
  const [unreadCount, setUnreadCount] = useState(0);

  // Suscribirse al conteo de mensajes no leídos (siempre con uid real, no biz)
  const realUid = user?.uid;
  useEffect(() => {
    if (!realUid) {
      setUnreadCount(0);
      return;
    }

    const unsubscribe = messagesService.subscribeToUnreadCount(realUid, (count) => {
      setUnreadCount(count);
    });

    return () => unsubscribe();
  }, [realUid]);

  return (
    <Tab.Navigator
      initialRouteName="Home"
      backBehavior="initialRoute"
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          // Web: use emojis
          if (isWeb) {
            // Profile: show avatar or emoji
            if (route.name === 'Profile' && user && userProfile) {
              return (
                <View style={{
                  borderWidth: focused ? 2 : 0,
                  borderColor: theme.colors.accent,
                  borderRadius: 14,
                  padding: focused ? 1 : 0,
                }}>
                  <AvatarDisplay
                    size={24}
                    avatarType={userProfile.avatarType || 'predefined'}
                    avatarId={userProfile.avatarId || 'male'}
                    photoURL={userProfile.photoURL}
                    photoURLThumbnail={userProfile.photoURLThumbnail}
                    backgroundColor={theme.colors.accent}
                    showBorder={false}
                  />
                </View>
              );
            }
            const emoji = TAB_EMOJIS[route.name] || '•';
            return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.6 }}>{emoji}</Text>;
          }

          // Mobile: use Ionicons
          // Para Profile, mostrar el avatar del usuario
          if (route.name === 'Profile') {
            if (!user || !userProfile) {
              return <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={28} color={color} />;
            }
            return (
              <View style={{
                borderWidth: focused ? 2 : 0,
                borderColor: theme.colors.accent,
                borderRadius: 14,
                padding: focused ? 1 : 0,
              }}>
                <AvatarDisplay
                  size={24}
                  avatarType={userProfile.avatarType || 'predefined'}
                  avatarId={userProfile.avatarId || 'male'}
                  photoURL={userProfile.photoURL}
                  photoURLThumbnail={userProfile.photoURLThumbnail}
                  backgroundColor={theme.colors.accent}
                  showBorder={false}
                />
              </View>
            );
          }

          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Search':
              iconName = focused ? 'search' : 'search-outline';
              break;
            case 'Create':
              iconName = focused ? 'add-circle' : 'add-circle-outline';
              break;
            case 'Inbox':
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              break;
            default:
              iconName = 'home-outline';
          }

          return <Ionicons name={iconName} size={28} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: (isDesktop || isTablet) ? {
          display: 'none',
        } : {
          position: 'absolute' as const,
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: -2,
        },
        tabBarItemStyle: {
          paddingTop: 6,
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{ tabBarLabel: 'Inicio' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            const state = navigation.getState();
            if (state.index === 0) {
              triggerScrollToTop();
            }
          },
        })}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{ tabBarLabel: 'Buscar' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            if (!user) {
              e.preventDefault();
              const parentNav = navigation.getParent();
              if (parentNav) (parentNav as any).navigate('Register');
            }
          },
        })}
      />
      <Tab.Screen
        name="Create"
        component={CreateTabPlaceholder}
        options={{
          tabBarLabel: 'Crear',
          tabBarButton: (props) => <CreateTabButton {...props} />
        }}
      />
      <Tab.Screen
        name="Inbox"
        component={InboxStackNavigator}
        options={({ route }) => {
          const focusedRoute = getFocusedRouteNameFromRoute(route) ?? 'InboxList';
          return {
            tabBarLabel: 'WeëTalk',
            tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
            tabBarBadgeStyle: {
              backgroundColor: theme.colors.accent,
              color: '#FFFFFF',
              fontSize: 11,
              fontWeight: '600',
              minWidth: 18,
              height: 18,
              borderRadius: 9,
            },
            ...(focusedRoute === 'Conversation' && {
              tabBarStyle: { display: 'none' as const },
            }),
          };
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            if (!user) {
              e.preventDefault();
              const parentNav = navigation.getParent();
              if (parentNav) {
                (parentNav as any).navigate('Register');
              }
            }
          },
        })}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{ tabBarLabel: 'Perfil' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            if (!user) {
              e.preventDefault();
              const parentNav = navigation.getParent();
              if (parentNav) {
                (parentNav as any).navigate('Register');
              }
            }
          },
        })}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;
