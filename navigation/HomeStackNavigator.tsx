import React from 'react';
import { Platform } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';

import LandingScreen from '../screens/LandingScreen';
import WebLandingScreen from '../screens/WebLandingScreen';
import HomeScreen from '../screens/HomeScreen';
/* PRUEBA aparte del Home con más impacto (2026-11-24): solo se abre por su dirección; el Home de verdad no cambia. */
import HomeImpactoScreen from '../screens/HomeImpactoScreen';
import HomeUniversosScreen from '../screens/HomeUniversosScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import CommunitiesManagementScreen from '../screens/CommunitiesManagementScreen';

// Use simplified screen for web
const LandingComponent = Platform.OS === 'web' ? WebLandingScreen : LandingScreen;

export type HomeStackParamList = {
  Landing: { openWeels?: boolean; weelsCommunitySlug?: string; initialPostId?: string } | undefined;
  Feed: { communityId?: string | null; communitySlug?: string | null } | undefined;
  HomeFeed: undefined;
  HomeImpacto: undefined;
  HomeUniversos: undefined;
  Notifications: undefined;
  ExploreCommunities: { query?: string; create?: boolean } | undefined;
};

const Stack = createStackNavigator<HomeStackParamList>();

const HomeStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyleInterpolator: ({ current, next, layouts }) => ({
          cardStyle: {
            opacity: current.progress,
            transform: [
              {
                translateX: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [layouts.screen.width * 0.15, 0],
                }),
              },
              {
                scale: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.97, 1],
                }),
              },
            ],
          },
          overlayStyle: {
            opacity: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.3],
            }),
          },
        }),
        transitionSpec: {
          open: { animation: 'timing', config: { duration: 280 } },
          close: { animation: 'timing', config: { duration: 220 } },
        },
        detachPreviousScreen: false,
        cardOverlayEnabled: true,
      }}
    >
      <Stack.Screen
        name="Landing"
        component={LandingComponent}
      />
      <Stack.Screen
        name="HomeImpacto"
        component={HomeImpactoScreen}
      />
      <Stack.Screen
        name="HomeUniversos"
        component={HomeUniversosScreen}
      />
      <Stack.Screen
        name="Feed"
        component={HomeScreen}
      />
      <Stack.Screen
        name="HomeFeed"
        component={HomeScreen}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
      />
      <Stack.Screen
        name="ExploreCommunities"
        component={CommunitiesManagementScreen}
      />
    </Stack.Navigator>
  );
};

export default HomeStackNavigator;
