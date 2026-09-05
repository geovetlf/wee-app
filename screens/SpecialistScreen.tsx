import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { getSpecialist, SpecialistAction, SpecialistExample } from '../constants/specialists';
import { creatorService, CreatorJob, JOB_STATUS_LABEL } from '../services/creatorService';
import CreatorShell from '../components/creator/CreatorShell';
import BrainChatScreen from './BrainChatScreen';
import BusinessScreen from './BusinessScreen';
import SpecialistHero from '../components/creator/SpecialistHero';
import ActionGrid from '../components/creator/ActionGrid';
import IdeaBox from '../components/creator/IdeaBox';
import UploadBox from '../components/creator/UploadBox';
import ExamplesRow from '../components/creator/ExamplesRow';
import { SectionTitle, ClosingBanner } from '../components/creator/ui';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

/**
 * Pantalla de un especialista de Weë Creator (docs/CREATOR-BUILD.md):
 * hero, "¿Qué quieres hacer hoy?", foto o idea, ejemplos y mis creaciones.
 * Cada acción o idea abre la conversación guiada con Weë Brain.
 */
const SpecialistScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const id: string = route.params?.id || 'brain';
  const spec = getSpecialist(id);
  const isBrain = id === 'brain';

  const [myJobs, setMyJobs] = useState<CreatorJob[]>([]);
  useFocusEffect(
    useCallback(() => {
      if (!user) {
        setMyJobs([]);
        return;
      }
      let cancelled = false;
      creatorService
        .getMyJobs(user.uid, 20)
        .then((jobs) => {
          if (!cancelled) setMyJobs(jobs.filter((job) => job.experienceId === id).slice(0, 4));
        })
        .catch((error) => console.warn('No se pudieron cargar tus creaciones:', error));
      return () => {
        cancelled = true;
      };
    }, [user, id])
  );

  if (!spec) {
    navigation.navigate('WeeCreator');
    return null;
  }
  if (isBrain) return <BrainChatScreen />;
  if (id === 'business') return <BusinessScreen />;

  const startFlow = (goal?: string, preset?: SpecialistAction['preset'], imageUri?: string) => {
    if (!user) {
      navigation.navigate('Login');
      return;
    }
    navigation.navigate('CreatorFlow', { experienceId: spec.id, goal, preset, imageUri });
  };

  const handleAction = (action: SpecialistAction) => startFlow(action.goal, action.preset);
  const handleExample = (example: SpecialistExample) => startFlow(example.subtitle ? `${example.title} · ${example.subtitle}` : example.title);

  return (
    <CreatorShell activeId={spec.id} overline="🤖 Weë Creator" title={`${spec.experience.emoji} ${spec.experience.name}`} breadcrumb="Weë Creator">
      <SpecialistHero spec={spec} />

      <View style={styles.section}>
        <SectionTitle
          title={spec.gridTitle}
          action={spec.id === 'design' ? 'Describe tu idea' : undefined}
          onAction={spec.id === 'design' ? () => startFlow() : undefined}
        />
        <ActionGrid actions={spec.actions} layout={spec.actionLayout} onPress={handleAction} />
      </View>

      {spec.upload && spec.id !== 'chef' && <UploadBox config={spec.upload} onPick={(uri) => startFlow(undefined, undefined, uri)} />}

      <IdeaBox config={spec.idea} onSubmit={(text) => startFlow(text)} greeting={spec.id === 'chef'} />

      <ExamplesRow title={spec.examplesTitle} examples={spec.examples} onPressItem={handleExample} action="Ver más" onAction={() => startFlow()} />

      {spec.upload && spec.id === 'chef' && (
        <ClosingBanner emoji="✨" title={spec.upload.title} subtitle={spec.upload.subtitle} button={spec.upload.button || 'Subir foto'} onPress={() => startFlow('Cocinar con los ingredientes que tengo en casa', { questionId: 'what', optionId: 'cook' })} />
      )}

      {spec.closing && (
        <ClosingBanner
          emoji={spec.id === 'music' ? '🎬' : '🏠'}
          title={spec.closing.title}
          subtitle={spec.closing.subtitle}
          button={spec.closing.button}
          dark={spec.id === 'music'}
          onPress={() => startFlow(spec.closing?.title)}
        />
      )}

      {myJobs.length > 0 && (
        <View style={styles.section}>
          <SectionTitle title="Mis creaciones" action="Ver todas" onAction={() => navigation.navigate('WeeCreator')} />
          {myJobs.map((job) => (
            <TouchableOpacity
              key={job.id}
              style={[styles.jobRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
              onPress={() => navigation.navigate('CreatorFlow', { experienceId: job.experienceId, jobId: job.id })}
              activeOpacity={0.8}
            >
              <Text style={styles.jobEmoji}>{spec.experience.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.jobGoal, { color: theme.colors.text }]} numberOfLines={1}>{job.goal}</Text>
                <Text style={[styles.jobMeta, { color: theme.colors.textSecondary }]}>
                  {JOB_STATUS_LABEL[job.status] ?? job.status}{job.demo ? ' · demo' : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={scale(18)} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={[styles.footer, { color: theme.colors.textSecondary }]}>Cuéntale a Weë lo que quieres. Weë se encarga de la IA.</Text>
    </CreatorShell>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: SPACING.md,
  },
  jobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
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
  footer: {
    fontSize: FONT_SIZE.xs,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
});

export default SpecialistScreen;
