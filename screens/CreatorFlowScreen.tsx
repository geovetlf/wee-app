import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import CreatorShell from '../components/creator/CreatorShell';
import GuidedQuestion, { QaHistoryItem } from '../components/creator/GuidedQuestion';
import PlanCard from '../components/creator/PlanCard';
import JobProgress from '../components/creator/JobProgress';
import ResultCard from '../components/creator/ResultCard';
import { creatorService, CreatorJob, Question, humanizeCreatorError } from '../services/creatorService';
import { WEE_EXPERIENCES, getExperienceById } from '../constants/weeExperiences';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

/**
 * Conversación guiada con un especialista de Weë (docs/CREATOR-ARQUITECTURA.md §3 y §7):
 * pregunta → plan → progreso → resultado. Todo lo técnico pasa en el servidor.
 */
const CreatorFlowScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params = (route.params || {}) as {
    experienceId?: string;
    goal?: string;
    jobId?: string;
    preset?: { questionId: string; optionId: string };
    imageUri?: string;
  };

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
        const response = await creatorService.start(experience.id, goal, params.preset ? [params.preset] : undefined);
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
        const label = option ? option.label : answer.text || '';
        return { question: q.text, answer: answer.inferred ? `${label} · lo entendí de lo que escribiste` : label };
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
        aiProcess: `${job.plan?.explainToUser || `Creado con ${experience.name} en Weë Creator`}${job.demo ? ' (vista previa en modo demo)' : ''}`,
      },
    });
  };

  const status = job?.status;

  return (
    <CreatorShell activeId={experience.id} overline="🤖 Weë Creator" title={`${experience.emoji} ${experience.name}`} breadcrumb={experience.name} contentStyle={styles.content}>
        {!!params.imageUri && (
          <View style={[styles.attachment, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Image source={{ uri: params.imageUri }} style={styles.attachmentImage} contentFit="cover" />
            <Text style={[styles.attachmentText, { color: theme.colors.textSecondary }]}>Tu foto está lista. Cuéntame qué hacemos con ella.</Text>
          </View>
        )}
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
          Tú eliges el resultado. Weë elige la IA.
        </Text>
    </CreatorShell>
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
    gap: SPACING.lg,
    maxWidth: scale(760),
  },
  attachment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
  },
  attachmentImage: {
    width: scale(64),
    height: scale(64),
    borderRadius: BORDER_RADIUS.md,
  },
  attachmentText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
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
