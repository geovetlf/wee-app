import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import CreatorShell from '../components/creator/CreatorShell';
import UploadBox from '../components/creator/UploadBox';
import GuidedQuestion, { QaHistoryItem } from '../components/creator/GuidedQuestion';
import PlanCard from '../components/creator/PlanCard';
import JobProgress from '../components/creator/JobProgress';
import ResultCard from '../components/creator/ResultCard';
import ProjectPicker from '../components/creator/ProjectPicker';
import { projectsService } from '../services/projectsService';
import { creatorService, CreatorJob, PlanPricing, QualityChoice, Question, humanizeCreatorError, isClientTimeout } from '../services/creatorService';
import { creditsShortfall, CreditsShortfall } from '../services/creditsService';
import { uploadCreatorImage } from '../services/creatorUploads';
import { documentsService } from '../services/documentsService';
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
    /** Documento del editor que pidió la ayuda (Weë Writer). */
    editorDocId?: string;
  };

  const experience = getExperienceById(params.experienceId || '') || WEE_EXPERIENCES[0];
  // Photo, Home y Beauty trabajan sobre una foto de la persona
  const needsPhoto =
    ['photo', 'home', 'beauty'].includes(experience.id) ||
    (experience.id === 'studio' && (params.preset?.optionId === 'animate' || /foto|imagen/i.test(params.goal || ''))) ||
    (experience.id === 'chef' && (params.preset?.optionId === 'cook' || /ingredientes|nevera|refri|foto/i.test(params.goal || '')));
  const [imageUri, setImageUri] = useState<string | undefined>(params.imageUri);
  const [jobId, setJobId] = useState<string | null>(params.jobId || null);
  const [job, setJob] = useState<CreatorJob | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Saldo insuficiente al crear: se muestra el aviso con saldo, costo y tienda (docs/CREDITS.md). */
  const [shortfall, setShortfall] = useState<CreditsShortfall | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [projectName, setProjectName] = useState<string | undefined>(undefined);
  /** La foto sube al Storage de Weë y al servidor solo va la URL. */
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  // Presupuesto: qué se va a usar y cuánto cuesta cada nivel (lo calcula el servidor)
  const [pricing, setPricing] = useState<PlanPricing | null>(null);
  const [quality, setQuality] = useState<QualityChoice | null>(null);
  const [quoting, setQuoting] = useState(false);
  const uploadedUrl = useRef<string | undefined>(undefined);
  const savedDocFor = useRef<string | null>(null);

  // Nombre del proyecto donde está guardada la creación
  useEffect(() => {
    if (!job?.projectId) {
      setProjectName(undefined);
      return;
    }
    let cancelled = false;
    projectsService.get(job.projectId).then((project) => {
      if (!cancelled) setProjectName(project?.name);
    });
    return () => {
      cancelled = true;
    };
  }, [job?.projectId]);

  const handleSaveToProject = async (projectId: string, name: string) => {
    if (!job) return;
    setPickerVisible(false);
    try {
      await projectsService.assignJob(job.id, projectId);
      setProjectName(name);
    } catch (e) {
      setError('No pude guardar en el proyecto. Inténtalo de nuevo.');
    }
  };

  const uploadPhoto = useCallback(
    async (uri: string): Promise<string | undefined> => {
      if (!user) return undefined;
      if (uploadedUrl.current && uploadedUrl.current.startsWith('http') && uri === imageUri) return uploadedUrl.current;
      setUploadingPhoto(true);
      try {
        const url = await uploadCreatorImage(user.uid, uri);
        uploadedUrl.current = url;
        return url;
      } finally {
        setUploadingPhoto(false);
      }
    },
    [user, imageUri]
  );

  const start = useCallback(
    async (goal?: string) => {
      setBusy(true);
      setError(null);
      setShortfall(null);
      setJob(null);
      setQuestion(null);
      try {
        const imageUrl = imageUri ? await uploadPhoto(imageUri) : undefined;
        const response = await creatorService.start(experience.id, goal, params.preset ? [params.preset] : undefined, imageUrl);
        setJobId(response.jobId);
        setQuestion(response.question);
        setPricing(response.pricing ?? null);
        setQuality(null);
      } catch (e) {
        setError(humanizeCreatorError(e));
      } finally {
        setBusy(false);
      }
    },
    [experience.id, imageUri, uploadPhoto]
  );

  // Foto elegida después de empezar: se sube y se adjunta al trabajo en curso
  const handlePickPhoto = useCallback(
    async (uri: string) => {
      setImageUri(uri);
      uploadedUrl.current = undefined;
      if (!jobId) return;
      setError(null);
      try {
        const url = await uploadCreatorImage(user ? user.uid : '', uri);
        uploadedUrl.current = url;
        await creatorService.attachImage(jobId, url);
      } catch (e) {
        setError(humanizeCreatorError(e));
      }
    },
    [jobId, user]
  );

  // Weë Writer: lo que genera queda en "Mis documentos"
  useEffect(() => {
    if (!job || job.status !== 'done' || experience.id !== 'writer' || savedDocFor.current === job.id) return;
    const text = job.results.filter((r) => r.content && r.kind !== 'audio' && !r.url).map((r) => r.content).join('\n\n').trim();
    if (!text) return;
    savedDocFor.current = job.id;
    documentsService.save({ id: `job_${job.id}`, title: job.goal, text, jobId: job.id }).catch((e) => console.warn('No se pudo guardar en Mis documentos:', e));
  }, [job, experience.id]);

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
      setPricing(response.pricing ?? null);
    } catch (e) {
      setError(humanizeCreatorError(e));
    } finally {
      setBusy(false);
    }
  };

  // Cambiar de nivel antes de crear: el servidor recalcula y la persona ve el precio al momento
  const handleQuality = useCallback(
    async (next: QualityChoice) => {
      if (!jobId) return;
      setQuoting(true);
      setError(null);
      try {
        const response = await creatorService.quote(jobId, next);
        setQuality(response.quality ?? next);
        setPricing(response.pricing ?? null);
        setJob((current) => (current ? { ...current, creditsEstimated: response.creditsEstimated } : current));
      } catch (e) {
        setError(humanizeCreatorError(e));
      } finally {
        setQuoting(false);
      }
    },
    [jobId]
  );

  const handleCreate = async () => {
    if (!jobId) return;
    if (needsPhoto && !imageUri) {
      setError('Sube una foto para que Weë pueda trabajar con ella.');
      return;
    }
    setBusy(true);
    setError(null);
    setShortfall(null);
    try {
      // Si la foto todavía no está adjunta al trabajo (p. ej. se eligió tarde), se adjunta ahora
      if (imageUri && !uploadedUrl.current) {
        const url = await uploadPhoto(imageUri);
        if (url) await creatorService.attachImage(jobId, url);
      }
      await creatorService.run(jobId);
    } catch (e) {
      // La app se cansó de esperar, pero el trabajo sigue en el servidor y llega por Firestore
      if (isClientTimeout(e)) return;
      const short = creditsShortfall(e);
      setShortfall(short);
      if (!short) setError(humanizeCreatorError(e));
    } finally {
      setBusy(false);
    }
  };

  const handleOpenInEditor = () => {
    if (!job) return;
    const content = job.results.filter((r) => r.content && r.kind !== 'audio').map((r) => r.content).join('\n\n');
    if (params.editorDocId) {
      navigation.navigate('WriterEditor', { docId: params.editorDocId, replaceText: content });
    } else {
      navigation.navigate('WriterEditor', { text: content, title: job.goal.slice(0, 60) });
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
        {needsPhoto && !imageUri && status !== 'done' && status !== 'running' && (
          <UploadBox
            config={{ title: 'Sube tu foto para trabajarla', subtitle: 'Desde tu galería o con la cámara', hint: 'JPG, PNG o WEBP (máx. 10 MB)' }}
            onPick={handlePickPhoto}
          />
        )}
        {!!imageUri && (
          <View style={[styles.attachment, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Image source={{ uri: imageUri }} style={styles.attachmentImage} contentFit="cover" />
            <Text style={[styles.attachmentText, { color: theme.colors.textSecondary }]}>{uploadingPhoto ? 'Subiendo tu foto…' : 'Tu foto está lista. Cuéntame qué hacemos con ella.'}</Text>
            {status !== 'done' && status !== 'running' && (
              <TouchableOpacity onPress={() => setImageUri(undefined)} accessibilityLabel="Cambiar foto" style={styles.attachmentAction}>
                <Text style={[styles.attachmentText, { color: theme.colors.accentDark, fontWeight: '700' }]}>Cambiar</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        {shortfall && (
          <View style={[styles.errorBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.errorText, { color: theme.colors.text, fontWeight: FONT_WEIGHT.bold }]}>No tienes suficientes Credits</Text>
            <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>Credits disponibles: {shortfall.available.toLocaleString('es')}</Text>
            <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>Costo: {shortfall.required.toLocaleString('es')}</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('CreditStore')}
              style={[styles.retryButton, { backgroundColor: theme.colors.accent }]}
              activeOpacity={0.85}
              accessibilityLabel="Obtener Credits"
            >
              <Text style={styles.retryText}>Obtener Credits</Text>
            </TouchableOpacity>
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
            beforeImageUri={needsPhoto ? imageUri : undefined}
            onOpenInEditor={experience.id === 'writer' ? handleOpenInEditor : undefined}
            onSaveToProject={() => setPickerVisible(true)}
            projectName={projectName}
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
              hideThinking
              onAnswer={() => undefined}
            />
            <PlanCard
              experienceName={experience.name}
              plan={job.plan}
              creditsEstimated={pricing ? pricing.total : job.creditsEstimated}
              demo={job.demo}
              pricingMode={job.pricingMode}
              pricing={pricing}
              quality={quality}
              quoting={quoting}
              onQuality={handleQuality}
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
        <ProjectPicker
          visible={pickerVisible}
          goal={job?.goal || params.goal || ''}
          onClose={() => setPickerVisible(false)}
          onPick={(project) => handleSaveToProject(project.id, project.name)}
        />
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
  attachmentAction: {
    minHeight: scale(36),
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
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
