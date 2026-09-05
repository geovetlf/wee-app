import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useWallet } from '../hooks/useWallet';
import { creatorInterestService } from '../services/creatorInterestService';
import CreditsPill from '../components/CreditsPill';
import { WEE_EXPERIENCES, WeeExperience, matchExperiences, getExperienceById } from '../constants/weeExperiences';
import { creatorService, CreatorJob, JOB_STATUS_LABEL } from '../services/creatorService';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

const isWeb = Platform.OS === 'web';

/**
 * WEE Creator — "El usuario elige el resultado. WEE elige la IA." (docs/CREATOR.md)
 * Responde a "¿Qué quieres crear?": la persona describe lo que quiere lograr y
 * WEE le muestra el especialista (una de las 10 experiencias) que se encarga.
 * Nunca se muestran proveedores, modelos ni prompts técnicos.
 *
 * Estado actual: las experiencias están en camino (registran interés); la única
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

  const matches = useMemo(() => matchExperiences(query), [query]);
  const selected = WEE_EXPERIENCES.find((c) => c.id === selectedId) || null;

  // "Avísame cuando esté": categorías en las que la persona ya se anotó
  const [interestedIds, setInterestedIds] = useState<string[]>([]);
  const [savingInterestId, setSavingInterestId] = useState<string | null>(null);
  const selectedInterested = !!selected && interestedIds.includes(selected.id);

  useEffect(() => {
    if (!user) {
      setInterestedIds([]);
      return;
    }
    let cancelled = false;
    creatorInterestService
      .getMyCategoryIds(user.uid)
      .then((ids) => {
        if (!cancelled) setInterestedIds(ids);
      })
      .catch((error) => console.warn('No se pudo leer el interés en AI Apps:', error));
    return () => {
      cancelled = true;
    };
  }, [user]);

  const notify = (title: string, message: string) => {
    if (isWeb) {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleCategoryPress = (cat: WeeExperience) => {
    setSelectedId(cat.id === selectedId ? null : cat.id);
  };

  // Registra (o quita) el interés en una categoría: así sabemos qué AI Apps
  // pide la comunidad y a quién avisar cuando estén listas.
  const handleNotifyMe = async (cat: WeeExperience) => {
    if (!user) {
      navigation.navigate('Login');
      return;
    }
    if (savingInterestId) return;
    const alreadyInterested = interestedIds.includes(cat.id);
    setSavingInterestId(cat.id);
    setInterestedIds((ids) => (alreadyInterested ? ids.filter((id) => id !== cat.id) : [...ids, cat.id]));
    try {
      if (alreadyInterested) await creatorInterestService.remove(user.uid, cat.id);
      else await creatorInterestService.register(user.uid, cat.id, cat.name);
    } catch (error) {
      console.warn('No se pudo guardar el interés en AI Apps:', error);
      setInterestedIds((ids) => (alreadyInterested ? [...ids, cat.id] : ids.filter((id) => id !== cat.id)));
      notify('No se pudo guardar', 'Inténtalo de nuevo en un momento.');
    } finally {
      setSavingInterestId(null);
    }
  };

  // Conversación guiada con el especialista (fase 0: modo demo)
  const handleStart = (exp: WeeExperience) => {
    if (!user) {
      navigation.navigate('Login');
      return;
    }
    navigation.navigate('CreatorFlow', { experienceId: exp.id, goal: query.trim() || undefined });
  };

  // Mis creaciones: últimos trabajos de la persona
  const [myJobs, setMyJobs] = useState<CreatorJob[]>([]);
  useFocusEffect(
    useCallback(() => {
      if (!user) {
        setMyJobs([]);
        return;
      }
      let cancelled = false;
      creatorService
        .getMyJobs(user.uid, 6)
        .then((jobs) => {
          if (!cancelled) setMyJobs(jobs);
        })
        .catch((error) => console.warn('No se pudieron cargar tus creaciones:', error));
      return () => {
        cancelled = true;
      };
    }, [user])
  );

  const handleAvatarTool = () => {
    if (!user) {
      navigation.navigate('Login');
      return;
    }
    navigation.navigate(hasHidiProfile ? 'AiAvatar' : 'HidiCreation');
  };

  const renderCategory = (cat: WeeExperience) => {
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
            placeholder="Quiero un video bonito para promocionar mi restaurante…"
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
        <Text style={[styles.motto, { color: theme.colors.textSecondary }]}>
          Tú eliges el resultado. WEE elige la IA.
        </Text>

        {query.trim().length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {matches.length > 0 ? 'Para eso está' : 'Aún no sabemos quién se encarga de eso'}
            </Text>
            {matches.length > 0 ? (
              <View style={styles.grid}>{matches.map(renderCategory)}</View>
            ) : (
              <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
                Prueba con palabras como logo, video, foto, texto, canción, look, receta, casa o negocio. O pregúntale a WEE Brain.
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
                Cuéntale a {selected.name} qué quieres lograr: te hace dos o tres preguntas sencillas y se encarga del resto. Después publicas directo en tu comunidad.
              </Text>
              <View style={styles.exampleRow}>
                {selected.examples.map((example) => (
                  <View key={example} style={[styles.exampleChip, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                    <Text style={[styles.exampleText, { color: theme.colors.text }]}>“{example}”</Text>
                  </View>
                ))}
              </View>
              <View style={styles.detailActions}>
                <TouchableOpacity
                  style={[styles.detailButton, { backgroundColor: theme.colors.accent }]}
                  onPress={() => handleStart(selected)}
                  activeOpacity={0.8}
                  accessibilityLabel={`Empezar con ${selected.name}`}
                >
                  <Text style={styles.detailButtonText}>Empezar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleNotifyMe(selected)}
                  disabled={savingInterestId === selected.id}
                  activeOpacity={0.7}
                  style={styles.detailLink}
                  accessibilityLabel={selectedInterested ? 'Ya no avisarme' : 'Avísame cuando esté'}
                >
                  <Text style={[styles.detailLinkText, { color: theme.colors.accentDark }]}>
                    {selectedInterested ? '✓ Te avisaremos cuando esté de verdad' : 'Avísame cuando esté de verdad'}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.detailNote, { color: theme.colors.textSecondary }]}>
                Hoy en modo demo: ves cómo funciona sin gastar Credits.
              </Text>
            </View>
          </View>
        )}

        {/* Mis creaciones */}
        {myJobs.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Mis creaciones</Text>
            {myJobs.map((job) => {
              const exp = getExperienceById(job.experienceId);
              return (
                <TouchableOpacity
                  key={job.id}
                  style={[styles.jobRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                  onPress={() => navigation.navigate('CreatorFlow', { experienceId: job.experienceId, jobId: job.id })}
                  activeOpacity={0.8}
                >
                  <Text style={styles.jobEmoji}>{exp?.emoji ?? '✨'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.jobGoal, { color: theme.colors.text }]} numberOfLines={1}>{job.goal}</Text>
                    <Text style={[styles.jobMeta, { color: theme.colors.textSecondary }]}>
                      {exp?.name ?? 'WEE'} · {JOB_STATUS_LABEL[job.status] ?? job.status}{job.demo ? ' · demo' : ''}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={scale(18)} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              );
            })}
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
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Los 10 especialistas de WEE</Text>
          <View style={styles.grid}>{WEE_EXPERIENCES.map(renderCategory)}</View>
        </View>

        {/* Credits */}
        <View style={[styles.creditsCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={styles.creditsEmoji}>💳</Text>
          <View style={styles.creditsBody}>
            <Text style={[styles.creditsTitle, { color: theme.colors.text }]}>
              {balance === null ? 'Tus Credits' : `Tienes ${balance.toLocaleString('es')} Credits`}
            </Text>
            <Text style={[styles.creditsText, { color: theme.colors.textSecondary }]}>
              Los especialistas de WEE usan Credits. Recarga cuando quieras.
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
  motto: {
    fontSize: FONT_SIZE.xs,
    textAlign: 'center',
    marginTop: -SPACING.md,
  },
  exampleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  exampleChip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: scale(4),
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
  },
  exampleText: {
    fontSize: FONT_SIZE.xs,
  },
  detailActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  detailLink: {
    minHeight: scale(40),
    justifyContent: 'center',
  },
  detailLinkText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
  },
  jobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginTop: SPACING.sm,
  },
  jobEmoji: {
    fontSize: scale(22),
  },
  jobGoal: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  jobMeta: {
    fontSize: FONT_SIZE.xs,
    marginTop: scale(2),
  },
  detailNote: {
    fontSize: FONT_SIZE.xs,
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
