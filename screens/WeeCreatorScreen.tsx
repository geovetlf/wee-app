import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useWallet } from '../hooks/useWallet';
import CreditsPill from '../components/CreditsPill';
import { AI_APP_CATEGORIES, AiAppCategory, matchAiAppCategories } from '../constants/aiAppCategories';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

const isWeb = Platform.OS === 'web';

/**
 * WEE Creator — el espacio de herramientas de IA.
 * Responde a "¿Qué quieres crear?": el usuario describe lo que quiere y
 * WEE le muestra la categoría de AI Apps que corresponde.
 *
 * Estado actual: las integraciones con apps de IA están en camino; la única
 * herramienta activa hoy es el avatar IA del perfil WEE.
 */
const WeeCreatorScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { userProfile, hasHidiProfile } = useUserProfile();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const initialCategory: string | undefined = route.params?.category;

  const activeUid = userProfile?.uid || user?.uid;
  const { balance } = useWallet(activeUid);

  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(initialCategory || null);

  const matches = useMemo(() => matchAiAppCategories(query), [query]);
  const selected = AI_APP_CATEGORIES.find((c) => c.id === selectedId) || null;

  const notify = (title: string, message: string) => {
    if (isWeb) {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleCategoryPress = (cat: AiAppCategory) => {
    setSelectedId(cat.id === selectedId ? null : cat.id);
  };

  const handleNotifyMe = (cat: AiAppCategory) => {
    notify('Te avisamos', `Cuando ${cat.name} esté disponible en WEE Creator te lo contamos.`);
  };

  const handleAvatarTool = () => {
    if (!user) {
      navigation.navigate('Login');
      return;
    }
    navigation.navigate(hasHidiProfile ? 'AiAvatar' : 'HidiCreation');
  };

  const renderCategory = (cat: AiAppCategory) => {
    const isSelected = cat.id === selectedId;
    return (
      <TouchableOpacity
        key={cat.id}
        style={[
          styles.categoryCard,
          {
            backgroundColor: theme.colors.card,
            borderColor: isSelected ? theme.colors.accent : theme.colors.border,
          },
        ]}
        onPress={() => handleCategoryPress(cat)}
        activeOpacity={0.8}
      >
        <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
        <Text style={[styles.categoryName, { color: theme.colors.text }]} numberOfLines={2}>
          {cat.name}
        </Text>
        <Text style={[styles.categoryDescription, { color: theme.colors.textSecondary }]} numberOfLines={2}>
          {cat.description}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={scale(23)} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={[styles.headerOverline, { color: theme.colors.accentDark }]}>🤖 WEE CREATOR</Text>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>¿Qué quieres crear?</Text>
        </View>
        <CreditsPill compact />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Buscador por intención */}
        <View style={[styles.searchBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={styles.searchEmoji}>✨</Text>
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Un video corto de mi producto…"
            placeholderTextColor={theme.colors.textSecondary}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} activeOpacity={0.7} accessibilityLabel="Borrar">
              <Ionicons name="close-circle" size={scale(20)} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {query.trim().length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {matches.length > 0 ? 'Para eso te sirve' : 'No encontramos una categoría'}
            </Text>
            {matches.length > 0 ? (
              <View style={styles.grid}>{matches.map(renderCategory)}</View>
            ) : (
              <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
                Prueba con palabras como video, imagen, logo, guion, libro, música, código o marketing.
              </Text>
            )}
          </View>
        )}

        {/* Detalle de la categoría elegida */}
        {selected && (
          <View style={[styles.detailCard, { backgroundColor: theme.colors.accent + '1A', borderColor: theme.colors.accent }]}>
            <Text style={styles.detailEmoji}>{selected.emoji}</Text>
            <View style={styles.detailBody}>
              <Text style={[styles.detailTitle, { color: theme.colors.text }]}>{selected.name}</Text>
              <Text style={[styles.detailText, { color: theme.colors.text }]}>
                Estamos integrando apps de {selected.name.replace('AI ', '')} en WEE Creator. Muy pronto vas a poder crear aquí y publicar directo en tu comunidad.
              </Text>
              <TouchableOpacity
                style={[styles.detailButton, { backgroundColor: theme.colors.accent }]}
                onPress={() => handleNotifyMe(selected)}
                activeOpacity={0.8}
              >
                <Text style={styles.detailButtonText}>Avísame cuando esté</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Disponible hoy */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Disponible hoy</Text>
          <TouchableOpacity
            style={[styles.availableCard, { backgroundColor: theme.colors.text }]}
            onPress={handleAvatarTool}
            activeOpacity={0.85}
          >
            <Text style={styles.availableEmoji}>🎭</Text>
            <View style={styles.availableBody}>
              <Text style={styles.availableTitle}>Avatar IA para tu perfil WEE</Text>
              <Text style={styles.availableText}>
                {hasHidiProfile ? 'Genera o cambia el avatar de tu alter ego con IA.' : 'Crea tu alter ego digital y genera su avatar con IA.'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={scale(20)} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>

        {/* Todas las categorías */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>AI Apps por tipo</Text>
          <View style={styles.grid}>{AI_APP_CATEGORIES.map(renderCategory)}</View>
        </View>

        {/* Credits */}
        <View style={[styles.creditsCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={styles.creditsEmoji}>💳</Text>
          <View style={styles.creditsBody}>
            <Text style={[styles.creditsTitle, { color: theme.colors.text }]}>
              {balance === null ? 'Tus Credits' : `Tienes ${balance.toLocaleString('es')} Credits`}
            </Text>
            <Text style={[styles.creditsText, { color: theme.colors.textSecondary }]}>
              Las AI Apps usan Credits. Recarga cuando quieras.
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.creditsButton, { borderColor: theme.colors.border }]}
            onPress={() => navigation.navigate('CreditStore')}
            activeOpacity={0.7}
          >
            <Text style={[styles.creditsButtonText, { color: theme.colors.text }]}>Recargar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: scale(44),
    height: scale(44),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitles: {
    flex: 1,
    gap: scale(1),
  },
  headerOverline: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 0.6,
  },
  headerTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl * 2,
    gap: SPACING.xl,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    height: scale(52),
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
  },
  searchEmoji: {
    fontSize: scale(18),
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    paddingVertical: 0,
  },
  section: {
    gap: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },
  hint: {
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(19),
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  categoryCard: {
    width: '48%',
    flexGrow: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    gap: scale(4),
  },
  categoryEmoji: {
    fontSize: scale(24),
    lineHeight: scale(30),
  },
  categoryName: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
  },
  categoryDescription: {
    fontSize: FONT_SIZE.xs,
    lineHeight: scale(16),
  },
  detailCard: {
    flexDirection: 'row',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
  },
  detailEmoji: {
    fontSize: scale(28),
    lineHeight: scale(34),
  },
  detailBody: {
    flex: 1,
    gap: SPACING.sm,
  },
  detailTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
  },
  detailText: {
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(19),
  },
  detailButton: {
    alignSelf: 'flex-start',
    height: scale(40),
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.full,
    justifyContent: 'center',
  },
  detailButtonText: {
    color: '#1F2937',
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
  availableCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
  },
  availableEmoji: {
    fontSize: scale(28),
  },
  availableBody: {
    flex: 1,
    gap: scale(2),
  },
  availableTitle: {
    color: 'white',
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
  },
  availableText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(18),
  },
  creditsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
  },
  creditsEmoji: {
    fontSize: scale(24),
  },
  creditsBody: {
    flex: 1,
    gap: scale(2),
  },
  creditsTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
  },
  creditsText: {
    fontSize: FONT_SIZE.xs,
    lineHeight: scale(16),
  },
  creditsButton: {
    height: scale(36),
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    justifyContent: 'center',
  },
  creditsButtonText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
});

export default WeeCreatorScreen;
