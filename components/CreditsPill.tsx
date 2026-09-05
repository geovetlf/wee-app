import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useWallet } from '../hooks/useWallet';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

interface CreditsPillProps {
  /** Versión compacta para el header (solo número). */
  compact?: boolean;
  /** Sobre fondos oscuros/transparentes (héroe, Weëls). */
  light?: boolean;
  onPress?: () => void;
}

/**
 * Saldo de Credits siempre visible: "💳 250 Credits".
 * Toca para ir a la tienda de Credits.
 */
const CreditsPill: React.FC<CreditsPillProps> = ({ compact = false, light = false, onPress }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  const navigation = useNavigation<any>();
  const activeUid = userProfile?.uid || user?.uid;
  const { balance } = useWallet(activeUid);

  if (!user) return null;

  const handlePress = () => {
    if (onPress) return onPress();
    navigation.navigate('CreditStore' as never);
  };

  const value = balance === null ? '…' : balance.toLocaleString('es');

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Tienes ${value} Credits`}
      style={[
        styles.pill,
        {
          backgroundColor: light ? 'rgba(255,255,255,0.15)' : theme.colors.card,
          borderColor: light ? 'rgba(255,255,255,0.3)' : theme.colors.border,
        },
      ]}
    >
      <Text style={styles.emoji}>💳</Text>
      <View style={styles.textRow}>
        <Text style={[styles.value, { color: light ? 'white' : theme.colors.text }]}>{value}</Text>
        {!compact && (
          <Text style={[styles.label, { color: light ? 'rgba(255,255,255,0.85)' : theme.colors.textSecondary }]}>Credits</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
    height: scale(32),
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
  },
  emoji: {
    fontSize: scale(13),
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: scale(3),
  },
  value: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
  label: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
  },
});

export default CreditsPill;
