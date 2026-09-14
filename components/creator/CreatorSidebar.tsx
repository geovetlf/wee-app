import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useIdioma } from '../../contexts/IdiomaContext';
import { useAuth } from '../../contexts/AuthContext';
import { useUserProfile } from '../../contexts/UserProfileContext';
import { useWallet } from '../../hooks/useWallet';
import { WEE_EXPERIENCES } from '../../constants/weeExperiences';
import { SPECIALIST_ORDER } from '../../constants/specialists';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';
import { Handwritten } from './ui';

interface CreatorSidebarProps {
  activeId?: string;
}

const ICONS: Record<string, string> = {
  brain: 'bulb-outline',
  design: 'color-palette-outline',
  photo: 'camera-outline',
  music: 'musical-notes-outline',
  studio: 'videocam-outline',
  business: 'briefcase-outline',
  chef: 'restaurant-outline',
  home: 'home-outline',
  beauty: 'heart-outline',
  writer: 'create-outline',
};

/**
 * Barra lateral de escritorio de Weë Creator (referencias en design/references/):
 * Home, Weë Creator, los 10 especialistas y la caja de Credits.
 */
const CreatorSidebar: React.FC<CreatorSidebarProps> = ({ activeId }) => {
  const { t, formato } = useIdioma();
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  const { balance } = useWallet(userProfile?.uid || user?.uid);

  const goHome = () => navigation.navigate('Main', { screen: 'Home' });
  const goCreator = () => navigation.navigate('WeeCreator');
  const goSpecialist = (id: string) => navigation.navigate('Specialist', { id });
  const goCredits = () => navigation.navigate(user ? 'CreditStore' : 'Login');

  const renderItem = (key: string, icon: string, label: string, onPress: () => void, nested = false) => {
    const active = activeId === key;
    return (
      <TouchableOpacity
        key={key}
        onPress={onPress}
        activeOpacity={0.7}
        style={[styles.item, nested && styles.itemNested, active && { backgroundColor: theme.colors.accent + '33' }]}
        accessibilityLabel={label}
      >
        <Ionicons name={icon as any} size={scale(nested ? 17 : 20)} color={active ? theme.colors.accentDark : theme.colors.text} />
        <Text style={[styles.itemLabel, nested && styles.itemLabelNested, { color: theme.colors.text }, active && { fontWeight: FONT_WEIGHT.bold }]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, borderRightColor: theme.colors.border }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={goHome} activeOpacity={0.7} style={styles.logoRow} accessibilityLabel={t('weeai.goHome')}>
          <Image source={require('../../assets/images/weelogo.png')} style={styles.logo} contentFit="contain" />
        </TouchableOpacity>

        <View style={styles.nav}>
          {renderItem('home', 'home-outline', 'Home', goHome)}
          {renderItem('creator', 'grid-outline', 'WEË AI', goCreator)}
          {SPECIALIST_ORDER.map((id) => {
            const exp = WEE_EXPERIENCES.find((e) => e.id === id);
            if (!exp) return null;
            return renderItem(id, ICONS[id] || 'sparkles-outline', exp.name, () => goSpecialist(id), true);
          })}
          {renderItem('projects', 'folder-open-outline', t('weeai.myProjects'), () => navigation.navigate(user ? 'Projects' : 'Login'), true)}
        </View>

        {/* Credits */}
        <TouchableOpacity onPress={goCredits} activeOpacity={0.85} style={[styles.credits, { backgroundColor: theme.colors.accent + '33', borderColor: theme.colors.accent }]}>
          <View style={styles.creditsRow}>
            <Text style={styles.creditsEmoji}>💳</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.creditsNumber, { color: theme.colors.text }]}>{balance === null ? '…' : formato.numero(balance)}</Text>
              <Text style={[styles.creditsLabel, { color: theme.colors.text }]}>Credits</Text>
            </View>
            <Ionicons name="arrow-forward" size={scale(16)} color={theme.colors.text} />
          </View>
          <View style={[styles.creditsButton, { backgroundColor: theme.colors.accent }]}>
            <Text style={styles.creditsButtonText}>{t('weeai.buyCredits')}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.tagline}>
          <Handwritten text={t('weeai.sidebarTagline')} align="left" />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: scale(232),
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  scroll: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxxl,
    gap: SPACING.lg,
  },
  logoRow: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  logo: {
    width: scale(110),
    height: scale(40),
  },
  nav: {
    gap: scale(2),
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    minHeight: scale(40),
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  itemLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
  },
  itemNested: {
    marginLeft: SPACING.lg,
    minHeight: scale(36),
  },
  itemLabelNested: {
    fontSize: FONT_SIZE.xs,
  },
  credits: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  creditsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  creditsEmoji: {
    fontSize: scale(24),
  },
  creditsNumber: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    lineHeight: scale(22),
  },
  creditsLabel: {
    fontSize: FONT_SIZE.xs,
  },
  creditsButton: {
    height: scale(34),
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  creditsButtonText: {
    color: '#1F2937',
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
  },
  tagline: {
    paddingHorizontal: SPACING.sm,
    marginTop: SPACING.md,
  },
});

export default CreatorSidebar;
