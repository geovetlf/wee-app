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
import { WEE_EXPERIENCES, EXPERIENCE_AREA, experienceLabel, getExperienceById } from '../constants/weeExperiences';
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
    /** Varias respuestas ya dadas (puente de "No sé qué hacer", fase 2E-60). */
    presets?: { questionId: string; optionId: string }[];
    imageUri?: string;
    /** Documento del editor que pidió la ayuda (Weë Writer). */
    editorDocId?: string;
  };

  const experience = getExperienceById(params.experienceId || '') || WEE_EXPERIENCES[0];
  /*
   * Con quién cree la persona que está hablando (fase 2E-56).
   *
   * Quien entra por Weë Design → Hogar & Diseño no debe leer "Weë Home" en
   * ningún sitio: ni firmando las burbujas, ni en el progreso, ni en el
   * resultado, ni en lo que se publica. El identificador interno sigue siendo
   * `home`; lo que cambia es el nombre con el que la experiencia habla.
   */
  const nombre = experienceLabel(experience);
  // Photo, Home y Beauty trabajan sobre una foto de la persona
  const needsPhoto =
    ['photo', 'home', 'beauty'].includes(experience.id) ||
    (experience.id === 'studio' && (params.preset?.optionId === 'animate' || /foto|imagen/i.test(params.goal || ''))) ||
    // Chef pide foto en sus dos flujos con imagen de entrada: mirar los
    // ingredientes (cook) y retocar el plato (edit). Se comprueba por el
    // identificador de la respuesta, no solo por el texto del objetivo.
    (experience.id === 'chef' &&
      (params.preset?.optionId === 'cook' ||
        params.preset?.optionId === 'edit' ||
        /ingredientes|nevera|refri|foto/i.test(params.goal || '')));
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
        const response = await creatorService.start(experience.id, goal, params.presets ?? (params.preset ? [params.preset] : undefined), imageUrl);
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
    /*
     * Entrar no es empezar (fase 2E-63).
     *
     * Hasta aquí, montar la pantalla creaba el trabajo: asomarse a Hogar & Diseño
     * y arrepentirse dejaba un `creatorJob` vacío, sin foto y sin respuestas. En
     * una experiencia que trabaja SOBRE una foto, el trabajo empieza cuando hay
     * foto —o cuando la persona dice que prefiere contarlo con palabras—. Las
     * demás experiencias no cambian: allí la conversación es la entrada.
     *
     * Abrir un trabajo que ya existe (`jobId`) nunca crea nada, ni antes ni ahora.
     */
    if (jobId) return;
    if (trabajaSobreUnEspacio && !params.imageUri) return;
    start(params.goal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  /*
   * La foto arranca el trabajo. Si ya hay uno en marcha, se adjunta como siempre.
   */
  useEffect(() => {
    if (!user || jobId || !imageUri || !trabajaSobreUnEspacio) return;
    start(params.goal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUri, user]);

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
  const handleEdit = (instruction: string) => start(`${job?.goal || params.goal || nombre} · Cambio: ${instruction}`);

  /*
   * Compartir lo que se acaba de crear. Solo navega: no vuelve a planificar, no
   * vuelve a generar y no toca Credits. La imagen viaja como dirección —la que
   * la tarjeta dice que está elegida— y la pantalla de crear la descarga y la
   * sube por la misma tubería que cualquier foto de la galería.
   */
  /*
   * El puente de "No sé qué hacer" (fase 2E-60).
   *
   * Weë ya miró la foto y propuso caminos. Al elegir uno, la persona no vuelve
   * al principio: viaja con ella la MISMA foto ya subida —la URL de Storage, sin
   * subirla otra vez— y todas las respuestas que ya dio, así que no se le
   * pregunta nada que ya haya contestado. Se abre un trabajo nuevo porque el
   * servidor no replanifica uno terminado; lo único que se repite es mirar la
   * foto, que cuesta un paso de texto.
   */
  const handleContinue = (optionId: string) => {
    if (!job) return;
    const yaDichas = job.answers.filter((a) => a.questionId !== 'what' && a.optionId).map((a) => ({ questionId: a.questionId, optionId: a.optionId as string }));
    navigation.push('CreatorFlow', {
      experienceId: experience.id,
      goal: job.goal,
      presets: [{ questionId: 'what', optionId }, ...yaDichas],
      imageUri: uploadedUrl.current || imageUri,
    });
  };

  const handlePublish = (mediaUri?: string) => {
    if (!job) return;
    const content = job.results
      .filter((r) => r.content && r.kind !== 'video')
      .map((r) => r.content)
      .join('\n\n')
      .slice(0, 480);
    navigation.navigate('Create', {
      kind: mediaUri ? 'image' : 'post',
      /*
       * La sección de la que sale el resultado. Se resuelve por el área a la que
       * pertenece la experiencia —Hogar & Diseño publica como Weë Design, Fotos
       * como Weë Studio—, que es lo que la persona ve y lo que tiene sentido leer
       * en la publicación (fase 2E-63C.1).
       */
      sourceSection: EXPERIENCE_AREA[experience.id]?.section ?? experience.id,
      prefill: {
        content: content || job.goal,
        aiTools: [nombre],
        aiProcess: `${job.plan?.explainToUser || `Creado con ${nombre} en Weë Creator`}${job.demo ? ' (vista previa en modo demo)' : ''}`,
        ...(mediaUri ? { media: [{ type: 'image' as const, uri: mediaUri }] } : {}),
      },
    });
  };

  /*
   * Qué foto hay que subir. En Chef la misma pantalla sirve para dos cosas
   * opuestas —mirar lo que hay en la nevera o retocar el plato ya hecho— y un
   * texto genérico dejaba a la persona adivinando cuál de las dos le tocaba.
   */
  const subidaConfig = React.useMemo(() => {
    const hint = 'JPG, PNG o WEBP (máx. 10 MB)';
    const subtitle = 'Desde tu galería o con la cámara';
    if (experience.id === 'chef' && params.preset?.optionId === 'edit') {
      return { title: '📸 Sube una foto de tu plato terminado', subtitle, hint };
    }
    if (experience.id === 'chef') {
      return { title: '📸 Sube una foto de tu refrigerador o de los ingredientes que tienes', subtitle, hint };
    }
    // Hogar & Diseño trabaja sobre el espacio que ya tienes: conviene decirlo aquí,
    // y decir además para qué sirve la foto (fase 2E-59).
    if (experience.id === 'home') {
      return { title: '🏠 Sube una foto de tu espacio', subtitle: 'Una foto me ayudará a conservar la estructura real del lugar.', hint };
    }
    return { title: 'Sube tu foto para trabajarla', subtitle, hint };
  }, [experience.id, params.preset?.optionId]);

  const status = job?.status;

  /*
   * ¿Este trabajo transforma la foto de un espacio? (fase 2E-63)
   *
   * Se pregunta al plan, que es donde está la verdad: el paso usa
   * `image.space_restyle`. Mientras no hay plan —al entrar, antes de conversar—
   * esa señal todavía no existe, y la única disponible es la experiencia. Se
   * dice aquí una vez y de aquí cuelga todo lo específico de esta pantalla, para
   * no repartir la condición por media docena de sitios.
   */
  const trabajaSobreUnEspacio = job?.plan
    ? job.plan.steps.some((s) => s.capability === 'image.space_restyle')
    : experience.id === 'home';

  /** Quitar la foto: solo deja de usarse aquí. El archivo de la persona no se toca. */
  /** El espacio espera la foto: no hay trabajo en marcha y no debe parecer que lo hay. */
  const esperandoLaFoto = trabajaSobreUnEspacio && !imageUri && !jobId && !busy;

  const quitarFoto = () => {
    setImageUri(undefined);
    uploadedUrl.current = undefined;
  };

  /*
   * Dónde está la persona, dicho como ella lo entiende. Weë Photo y Weë Beauty
   * dejaron de ser secciones y son áreas de Weë Studio: la cabecera lo dice
   * ("Weë Studio · Fotos") y la barra lateral marca Studio. Por dentro no cambia
   * nada —el identificador sigue siendo `photo`, y con él viajan el historial, el
   * plan y el servidor—; cambia lo que se lee arriba.
   */
  const area = EXPERIENCE_AREA[experience.id];

  return (
      <CreatorShell activeId={area ? area.section : experience.id} overline="🤖 Weë Creator" title={`${experience.emoji} ${area ? area.label : experience.name}`} breadcrumb={area ? area.label : experience.name} contentStyle={styles.content}>
        {needsPhoto && !imageUri && status !== 'done' && status !== 'running' && (
          <UploadBox
            config={subidaConfig}
            onPick={handlePickPhoto}
          />
        )}
        {/*
          La salida para quien no tiene una foto a mano: la conversación empieza
          igual, y es ella la que crea el trabajo. Solo aparece mientras no hay
          ni foto ni trabajo, que es el único momento en que hace falta.
        */}
        {esperandoLaFoto && (
          <TouchableOpacity onPress={() => start(params.goal)} activeOpacity={0.8} accessibilityLabel="Prefiero describirlo con palabras" style={styles.sinFoto}>
            <Text style={[styles.attachmentText, { color: theme.colors.accentDark, fontWeight: '700' }]}>Prefiero describirlo con palabras</Text>
          </TouchableOpacity>
        )}
        {/*
          Tu espacio, en grande y mientras dure el trabajo (fase 2E-63).

          La foto era una tira con una miniatura: se subía y desaparecía de la
          vista. En una experiencia cuya primera promesa es "trabajo sobre TU
          espacio", eso convierte la foto en un adjunto. Aquí se ve entera, en su
          proporción, con su nombre y con las dos acciones que hacen falta:
          cambiarla y quitarla. El archivo no se toca ni se vuelve a subir.

          Solo para lo que transforma un espacio: un plato de Weë Chef o un
          retrato de Weë Beauty siguen con su tira de siempre.
        */}
        {!!imageUri && trabajaSobreUnEspacio && (
          <View style={[styles.space, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Image source={{ uri: imageUri }} style={styles.spaceImage} contentFit="contain" transition={200} />
            <View style={styles.spaceBar}>
              <Text style={[styles.spaceTitle, { color: theme.colors.text }]}>
                {uploadingPhoto ? '📸 Subiendo tu espacio…' : '📸 Tu espacio'}
              </Text>
              {status !== 'done' && status !== 'running' && (
                <View style={styles.spaceActions}>
                  <TouchableOpacity onPress={() => setImageUri(undefined)} accessibilityLabel="Cambiar foto" style={styles.attachmentAction}>
                    <Text style={[styles.attachmentText, { color: theme.colors.accentDark, fontWeight: '700' }]}>Cambiar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={quitarFoto} accessibilityLabel="Quitar foto" style={styles.attachmentAction}>
                    <Text style={[styles.attachmentText, { color: theme.colors.textSecondary, fontWeight: '700' }]}>Quitar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}
        {!!imageUri && !trabajaSobreUnEspacio && (
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

        {status === 'running' && job && <JobProgress experienceName={nombre} job={job} />}

        {status === 'done' && job && (
          <ResultCard
            experienceName={nombre}
            job={job}
            busy={busy}
            onAnotherVersion={handleAnotherVersion}
            onEdit={handleEdit}
            onPublish={handlePublish}
            /*
             * El "antes" sale del trabajo, no de la pantalla (fase 2E-61).
             *
             * `imageUri` es estado del componente: existe mientras dura la
             * sesión de trabajo y desaparece al volver desde "Mis creaciones",
             * donde la mesa se abre solo con un `jobId`. La foto ya estaba
             * guardada en el propio trabajo desde el principio —`inputImageUrl`,
             * la misma dirección de Storage que se usó para generar—, así que no
             * hace falta subirla otra vez, ni copiarla, ni inventar un campo: se
             * lee de donde siempre estuvo. Sigue siendo solo el "antes": lo que
             * se publica lo decide `publicable`, que jamás mira aquí.
             */
            beforeImageUri={needsPhoto ? imageUri || job.inputImageUrl : undefined}
            onOpenInEditor={experience.id === 'writer' ? handleOpenInEditor : undefined}
            onContinue={handleContinue}
            onSaveToProject={() => setPickerVisible(true)}
            projectName={projectName}
            regenerateCredits={pricing ? pricing.total : job.creditsEstimated}
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
              experienceName={nombre}
              goal={job.goal}
              history={history}
              question={null}
              busy={false}
              hideThinking
              onAnswer={() => undefined}
            />
            <PlanCard
              experienceName={nombre}
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
            experienceName={nombre}
            goal={job?.goal || params.goal || experience.examples[0]}
            history={history}
            question={question}
            busy={busy}
            onAnswer={handleAnswer}
            /*
             * Mientras el espacio espera la foto no hay nada pendiente: sin este
             * aviso la pantalla decía "está pensando…" para siempre, porque ya no
             * se crea un trabajo vacío al entrar (fase 2E-63).
             */
            hideThinking={esperandoLaFoto}
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
  /*
   * La foto del espacio: grande, en su proporción y con su nombre (fase 2E-63).
   * `contain` sobre un fondo oscuro para que nunca se recorte lo que se prometió
   * conservar, sea cual sea la proporción de la foto.
   */
  space: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  spaceImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#0F172A',
  },
  spaceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  spaceTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
  sinFoto: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  spaceActions: {
    flexDirection: 'row',
    gap: SPACING.md,
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
