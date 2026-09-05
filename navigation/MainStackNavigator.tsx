import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { ActivityIndicator, View, StyleSheet, Platform } from 'react-native';
import { useResponsive } from '../hooks/useResponsive';
import { useTheme } from '../contexts/ThemeContext';
import MainTabsScreen from '../screens/MainTabsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SearchScreen from '../screens/SearchScreen';
import CreateScreen from '../screens/CreateScreen';
import PostDetailScreen from '../screens/PostDetailScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import CommunityScreen from '../screens/CommunityScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HidiCreationScreen from '../screens/HidiCreationScreen';
import AiAvatarScreen from '../screens/AiAvatarScreen';
import ReelsScreen from '../screens/ReelsScreen';
import CreditStoreScreen from '../screens/CreditStoreScreen';
import WalletScreen from '../screens/WalletScreen';
import WeeCreatorScreen from '../screens/WeeCreatorScreen';
import SavedPostsScreen from '../screens/SavedPostsScreen';
import CreatorFlowScreen from '../screens/CreatorFlowScreen';
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

export type MainStackParamList = {
  Main: undefined;
  Settings: undefined;
  Search: undefined;
  Create: { communitySlug?: string; kind?: string; prefill?: { content?: string; aiTools?: string[]; aiProcess?: string } } | undefined;
  WeeCreator: { category?: string } | undefined;
  SavedPosts: undefined;
  CreatorFlow: { experienceId: string; goal?: string; jobId?: string };
  PostDetail: {
    post: Post;
  };
  UserProfile: {
    userId: string;
  };
  Community: {
    communityId: string;
  };
  HidiCreation: undefined;
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
  const { userProfile, loading: profileLoading } = useUserProfile();
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

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { flex: 1 },
        cardStyleInterpolator: ({ current }) => ({
          cardStyle: { opacity: current.progress },
        }),
        transitionSpec: {
          open: { animation: 'timing', config: { duration: 350, useNativeDriver: true } },
          close: { animation: 'timing', config: { duration: 250, useNativeDriver: true } },
        },
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
      <Stack.Screen name="HidiCreation" component={HidiCreationScreen} />
      <Stack.Screen name="AiAvatar" component={AiAvatarScreen} />
      <Stack.Screen name="CreditStore" component={CreditStoreScreen} />
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="WeeCreator" component={WeeCreatorScreen} />
      <Stack.Screen name="SavedPosts" component={SavedPostsScreen} />
      <Stack.Screen name="CreatorFlow" component={CreatorFlowScreen} />
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
  );
};

const styles = StyleSheet.create({
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
