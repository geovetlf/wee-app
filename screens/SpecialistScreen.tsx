import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useT } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { SpecialistAction, SpecialistExample } from '../constants/specialists';
import { useEspecialista } from '../hooks/useEspecialista';
import { creatorService, CreatorJob, claveDelEstado } from '../services/creatorService';
import CreatorShell from '../components/creator/CreatorShell';
import BrainChatScreen from './BrainChatScreen';
import BusinessScreen from './BusinessScreen';
import SpecialistHero from '../components/creator/SpecialistHero';
import ActionGrid from '../components/creator/ActionGrid';
import IdeaBox from '../components/creator/IdeaBox';
import TravelLauncher from '../components/creator/TravelLauncher';
import TravelMark from '../components/creator/TravelMark';
import UploadBox from '../components/creator/UploadBox';
import ExamplesRow from '../components/creator/ExamplesRow';
import WriterDocuments from '../components/creator/WriterDocuments';
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
  const t = useT();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const id: string = route.params?.id || 'brain';
  const spec = useEspecialista(id);
  const isBrain = id === 'brain';

  const [myJobs, setMyJobs] = useState<CreatorJob[]>([]);
  /*
   * Las herramientas empiezan plegadas en las secciones con muro (fase 2E-41).
   * Cerradas caben en una franja, y lo primero que se ve al entrar deja de ser un
   * catálogo de botones para pasar a ser lo que está publicando la gente. Se abren
   * de un toque y se vuelven a cerrar igual; al entrar siempre están cerradas.
   */
  const [herramientasAbiertas, setHerramientasAbiertas] = useState(false);
  useFocusEffect(
    useCallback(() => {
      // Al llegar a la sección, las herramientas siempre están cerradas: lo
      // primero que se ve es la comunidad. Se cierra durante la transición, así
      // que nadie ve moverse la página bajo el dedo.
      setHerramientasAbiertas(false);
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

  /*
   * `opens` deja que una acción abra la conversación de otra experiencia. Lo usa
   * Weë Studio para sus tres áreas: "Fotos" abre Weë Photo, "Beauty" abre Weë
   * Beauty. Sin `opens` —las otras siete secciones— se abre la propia, exactamente
   * como antes.
   */
  const startFlow = (goal?: string, preset?: SpecialistAction['preset'], imageUri?: string, opens?: SpecialistAction['opens']) => {
    if (!user) {
      navigation.navigate('Login');
      return;
    }
    navigation.navigate('CreatorFlow', { experienceId: opens || spec.id, goal, preset, imageUri });
  };

  /*
   * Casi todas las tarjetas abren una conversación. La de Weë Writer abre su
   * PANTALLA —la misma a la que llevaba el menú— porque allí está lo que solo
   * existe allí: "Mis documentos". Es la ruta de siempre, sin nada nuevo
   * detrás.
   */
  const handleAction = (action: SpecialistAction) => {
    if (action.opensSection && action.opens) {
      navigation.navigate('Specialist', { id: action.opens });
      return;
    }
    startFlow(action.goal, action.preset, undefined, action.opens);
  };
  const handleExample = (example: SpecialistExample) => startFlow(example.subtitle ? `${example.title} · ${example.subtitle}` : example.title);

  /*
   * Las secciones con muro (hoy solo Weë Chef) se leen de arriba abajo como una
   * comunidad con herramientas dentro: cabecera baja → herramientas plegadas →
   * el muro. Todo lo demás —tus creaciones, los ejemplos— es complementario y va
   * después, para no competir con lo que publica la gente.
   */

  /*
   * Secciones que entran por una sola tarjeta (hoy Weë Travel, fase 2E-69). El
   * nombre, la frase y las funciones caben juntos en una pieza compacta, así que
   * no hay cabecera dentro ni franja aparte: debajo empieza el muro y punto. Se
   * apoya en `ideaFirst`, que es justo lo que distingue a esas secciones —se
   * entra hablando—, y no en el identificador, para que no haya un `if` con un
   * nombre propio dentro de una pantalla que sirve a todas.
   */
  const lanzador = !!spec.ideaFirst;

  return (
    <CreatorShell
      activeId={spec.id}
      overline={lanzador ? undefined : '🤖 Weë AI'}
      title={lanzador ? spec.experience.name : `${spec.experience.emoji} ${spec.experience.name}`}
      mark={lanzador ? <TravelMark size={30} plain /> : undefined}
      breadcrumb="Weë AI"
    >
      {!lanzador && <SpecialistHero spec={spec} />}

      {/*
        Weë Travel entra por la frase, no por la cuadrícula (fase 2E-64C): un
        viaje se cuenta hablando y esa frase ya trae casi todo lo que hace falta.
        Desde 2E-69 la frase y las cuatro funciones viven en la misma tarjeta, así
        que entre la cabecera y el muro solo hay una pieza.
      */}
      {lanzador ? (
        <TravelLauncher
          idea={spec.idea}
          actions={spec.actions}
          hint={spec.gridHint}
          open={herramientasAbiertas}
          onToggle={() => setHerramientasAbiertas((abierto) => !abierto)}
          onSubmit={(text) => startFlow(text)}
          onAction={handleAction}
        />
      ) : (
        <View style={styles.section}>
          <SectionTitle
            title={spec.gridTitle}
            hint={spec.gridHint}
            action={spec.id === 'design' ? t('weeai.describeYourIdea') : undefined}
            onAction={spec.id === 'design' ? () => startFlow() : undefined}
          />
          <ActionGrid actions={spec.actions} layout={spec.actionLayout} onPress={handleAction} />
        </View>
      )}

      {/*
        Las secciones con caja de subida propia la conservan. Chef ya no tiene:
        sus dos rutas con foto son dos de sus siete funciones y cada una dice qué
        foto espera, así que el bloque aparte solo repetía (fase 2E-40).
      */}
      {spec.upload && <UploadBox config={spec.upload} onPick={(uri) => startFlow(undefined, undefined, uri)} />}

      {spec.id === 'writer' && <WriterDocuments />}

      {/*
        La caja de idea y los ejemplos son la entrada de la sección. Las que
        entran por la frase —Weë Travel— ya la llevan dentro de su tarjeta, así
        que ahí sobraría: sería la segunda caja de escribir seguida.
      */}
      {!lanzador && <IdeaBox config={spec.idea} onSubmit={(text) => startFlow(text)} greeting={spec.id === 'chef'} />}

      {!lanzador && !!spec.examples?.length && (
        <ExamplesRow title={spec.examplesTitle ?? ''} examples={spec.examples} onPressItem={handleExample} action={t('weeai.seeMore')} onAction={() => startFlow()} />
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
          <SectionTitle title={t('weeai.myCreations')} action={t('weeai.seeAllCreations')} onAction={() => navigation.navigate('WeeCreator')} />
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
                  {t(claveDelEstado[job.status]) ?? job.status}{job.demo ? ` · ${t('weeai.demo')}` : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={scale(18)} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={[styles.footer, { color: theme.colors.textSecondary }]}>{t('weeai.tellWee')}</Text>
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
