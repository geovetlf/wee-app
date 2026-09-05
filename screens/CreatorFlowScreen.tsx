import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import CreditsPill from '../components/CreditsPill';
import GuidedQuestion, { QaHistoryItem } from '../components/creator/GuidedQuestion';
import PlanCard from '../components/creator/PlanCard';
import JobProgress from '../components/creator/JobProgress';
import ResultCard from '../components/creator/ResultCard';
import { creatorService, CreatorJob, Question, humanizeCreatorError } from '../services/creatorService';
import { WEE_EXPERIENCES, getExperienceById } from '../constants/weeExperiences';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

const isWeb = Platform.OS === 'web';

/**
 * Conversación guiada con un especialista de WEE (docs/CREATOR-ARQUITECTURA.md §3 y §7):
 * pregunta → plan → progreso → resultado. Todo lo técnico pasa en el servidor.
 */
const CreatorFlowScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params = (route.params || {}) as { experienceId?: string; goal?: string; jobId?: string };

  const experience = getExperienceById(params.experienceId || '') || WEE_EXPERIENCES[0];
  const [jobId, setJobId] = useState<string | null>(params.jobId || null);
  const [job, setJob] = useState<CreatorJob | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(
    async (goal?: string) => {
      setBusy(true);
      setError(null);
      setJob(null);
      setQuestion(null);
      try {
        const response = await creatorService.start(experience.id, goal);
        setJobId(response.jobId);
        setQuestion(response.question);
      } catch (e) {
        setError(humanizeCreatorError(e));
      } finally {
        setBusy(false);
      }
    },
    [experience.id]
  );

  // Sin sesión no hay trabajos; sin jobId, se empieza la conversación
  useEffect(() => {
    if (!user) {
      navigation.navigate('Login');
      return;
    }
    if (!jobId) start(params.goal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!jobId) return;
    return creatorService.subscribeToJob(jobId, setJob);
  }, [jobId]);

  // Cuando se abre un trabajo existente, la pregunta pendiente sale del propio trabajo
  useEffect(() => {
    if (!job || job.status !== 'asking' || question) return;
    const answered = new Set(job.answers.map((a) => a.questionId));
    const pending = job.questions.find((q) => !answered.has(q.id));
    if (pending) setQuestion(pending);
  }, [job, question]);

  const history: QaHistoryItem[] = useMemo(() => {
    if (!job) return [];
    return job.answers
      .map((answer) => {
        const q = job.questions.find((item) => item.id === answer.questionId);
        if (!q) return null;
        const option = q.options.find((o) => o.id === answer.optionId);
        return { question: q.text, answer: option ? option.label : answer.text || '' };
      })
      .filter((item): item is QaHistoryItem => !!item);
  }, [job]);

  const handleAnswer = async (optionId?: string, text?: string) => {
    if (!jobId || !question) return;
    setBusy(true);
    setError(null);
    try {
      const response = await creatorService.answer(jobId, { questionId: question.id, optionId, text });
      setQuestion(response.question);
    } catch (e) {
      setError(humanizeCreatorError(e));
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = async () => {
    if (!jobId) return;
    setBusy(true);
    setError(null);
    try {
      await creatorService.run(jobId);
    } catch (e) {
      setError(humanizeCreatorError(e));
    } finally {
      setBusy(false);
    }
  };

  const handleAnotherVersion = () => start(job?.goal || params.goal);
  const handleEdit = (instruction: string) => start(`${job?.goal || params.goal || experience.name} · Cambio: ${instruction}`);

  const handlePublish = () => {
    if (!job) return;
    const content = job.results
      .filter((r) => r.content && r.kind !== 'video')
      .map((r) => r.content)
      .join('\n\n')
      .slice(0, 480);
    navigation.navigate('Create', {
      kind: 'post',
      prefill: {
        content: content || job.goal,
        aiTools: [experience.name],
        aiProcess: `${job.plan?.explainToUser || `Creado con ${experience.name} en WEE Creator`}${job.demo ? ' (vista previa en modo demo)' : ''}`,
      },
    });
  };

  const status = job?.status;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7} accessibilityLabel="Volver">
          <Ionicons name="arrow-back" size={scale(23)} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={[styles.headerOverline, { color: theme.colors.accentDark }]}>🤖 WEE CREATOR</Text>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {experience.emoji} {experience.name}
          </Text>
        </View>
        <CreditsPill compact />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {error && (
          <View style={[styles.errorBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.errorText, { color: theme.colors.text }]}>{error}</Text>
            <TouchableOpacity
              onPress={() => (status === 'planned' ? handleCreate() : start(job?.goal || params.goal))}
              style={[styles.retryButton, { backgroundColor: theme.colors.accent }]}
              activeOpacity={0.85}
            >
              <Text style={styles.retryText}>Probar otra vez</Text>
            </TouchableOpacity>
          </View>
        )}

        {status === 'running' && job && <JobProgress experienceName={experience.name} job={job} />}

        {status === 'done' && job && (
          <ResultCard
            experienceName={experience.name}
            job={job}
            busy={busy}
            onAnotherVersion={handleAnotherVersion}
            onEdit={handleEdit}
            onPublish={handlePublish}
          />
        )}

        {status === 'failed' && job && !error && (
          <View style={[styles.errorBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.errorText, { color: theme.colors.text }]}>{job.progressText || 'No me salió bien. No te cobré.'}</Text>
            <TouchableOpacity
              onPress={() => start(job.goal)}
              style={[styles.retryButton, { backgroundColor: theme.colors.accent }]}
              activeOpacity={0.85}
            >
              <Text style={styles.retryText}>Probar otra vez</Text>
            </TouchableOpacity>
          </View>
        )}

        {status === 'planned' && job?.plan && (
          <>
            <GuidedQuestion
              experienceName={experience.name}
              goal={job.goal}
              history={history}
              question={null}
              busy={false}
              onAnswer={() => undefined}
            />
            <PlanCard
              experienceName={experience.name}
              plan={job.plan}
              creditsEstimated={job.creditsEstimated}
              demo={job.demo}
              busy={busy}
              onCreate={handleCreate}
              onChange={() => start(job.goal)}
            />
          </>
        )}

        {(!status || status === 'asking') && !error && (
          <GuidedQuestion
            experienceName={experience.name}
            goal={job?.goal || params.goal || experience.examples[0]}
            history={history}
            question={question}
            busy={busy}
            onAnswer={handleAnswer}
          />
        )}

        <Text style={[styles.footnote, { color: theme.colors.textSecondary }]}>
          Tú eliges el resultado. WEE elige la IA.{isWeb ? '' : ' '}
        </Text>
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
  },
  headerOverline: {
    fontSize: scale(10),
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl * 2,
    gap: SPACING.lg,
  },
  errorBox: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.md,
  },
  errorText: {
    fontSize: FONT_SIZE.md,
    lineHeight: scale(22),
  },
  retryButton: {
    alignSelf: 'flex-start',
    height: scale(44),
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    color: '#1F2937',
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
  footnote: {
    fontSize: FONT_SIZE.xs,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
});

export default CreatorFlowScreen;
