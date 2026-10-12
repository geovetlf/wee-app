import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme, enTemaClaro } from '../contexts/ThemeContext';
import { useIdioma, useT } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { projectsService, WeeProject, PROJECT_EMOJIS } from '../services/projectsService';
import { getExperienceById, experienceLabel } from '../constants/weeExperiences';
import CreatorShell from '../components/creator/CreatorShell';
import { SectionTitle } from '../components/creator/ui';
import SeccionDelDispositivo from '../components/creator/SeccionDelDispositivo';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

/**
 * MIS PROYECTOS = trabajo EN PROCESO que se puede continuar (R9).
 *
 * No es la biblioteca de resultados —eso es «Mis creaciones», con lo que la
 * persona DECIDIÓ conservar—: aquí está lo que todavía se está haciendo, y la
 * acción principal de cada tarjeta es «Continuar».
 *
 * ── Tres estados que no se confunden ───────────────────────────────────────
 *
 * Cargando, fallo y vacío son tres pantallas distintas. Antes un fallo de red
 * se tragaba y la persona leía «Todavía no tienes proyectos»: un error
 * disfrazado de vacío. Ahora el fallo dice que falló y ofrece reintentar.
 *
 * ── Qué enseña cada tarjeta, y solo si es verdad ───────────────────────────
 *
 * Nombre (lo escribió la persona: no pasa por el traductor), herramienta de la
 * que viene (solo si se sabe), miniatura (solo si la hay: sin miniatura se ve
 * el emoji del proyecto, que no es «sin proyecto»), última modificación (por
 * `formato`, con el locale activo), el estado «En proceso» y «Continuar».
 */

/** Lo que pinta una tarjeta. Lo que no se sabe va a `null` y no se pinta. */
export interface ProyectoVisible {
  id: string;
  name: string;
  emoji: string;
  herramienta: string | null;
  actualizadoEn: number | null;
  miniatura: string | null;
}

type Estado =
  | { fase: 'cargando' }
  | { fase: 'error' }
  | { fase: 'lista'; projects: ProyectoVisible[] };

/* Un `Timestamp` de Firestore, un número o nada: la fecha se lee si existe, nunca se inventa. */
const milisegundos = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (v && typeof (v as { toMillis?: unknown }).toMillis === 'function') return (v as { toMillis: () => number }).toMillis();
  return null;
};

export const visibleDeProyectoGuardado = (p: WeeProject): ProyectoVisible => ({
  id: p.id,
  name: p.name,
  emoji: p.emoji,
  herramienta: null,
  actualizadoEn: milisegundos(p.updatedAt),
  miniatura: null,
});

const ProjectsScreen: React.FC = () => {
  const { theme } = useTheme();
  const t = useT();
  const { formato } = useIdioma();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const { isDesktop } = useResponsive();

  const [estado, setEstado] = useState<Estado>({ fase: 'cargando' });
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(PROJECT_EMOJIS[0]);
  const [saving, setSaving] = useState(false);
  /* Una respuesta que llega tarde no pisa a la que se pidió después. */
  const peticion = useRef(0);

  const cargar = useCallback(async () => {
    if (!user) {
      setEstado({ fase: 'lista', projects: [] });
      return;
    }
    const mia = ++peticion.current;
    setEstado({ fase: 'cargando' });
    try {
      const projects = (await projectsService.list(user.uid)).map(visibleDeProyectoGuardado);
      if (mia !== peticion.current) return;
      setEstado({ fase: 'lista', projects });
    } catch (error) {
      console.warn('Mis proyectos: no se pudieron cargar', error);
      if (mia === peticion.current) setEstado({ fase: 'error' });
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const create = async () => {
    if (!user) {
      navigation.navigate('Login');
      return;
    }
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const project = await projectsService.create(user.uid, name, emoji);
      setName('');
      setCreating(false);
      navigation.navigate('Project', { id: project.id });
    } catch (error) {
      console.warn('No se pudo crear el proyecto:', error);
    } finally {
      setSaving(false);
    }
  };

  /* Continuar = volver al proyecto, donde están sus trabajos y desde donde se sigue creando en él. */
  const continuar = (project: ProyectoVisible) => navigation.navigate('Project', { id: project.id });

  const tarjeta = (project: ProyectoVisible) => {
    const experiencia = project.herramienta ? getExperienceById(project.herramienta) : undefined;
    return (
      <View key={project.id} style={{ width: isDesktop ? '33.33%' : '50%', padding: SPACING.xs }}>
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          {project.miniatura ? (
            <Image source={{ uri: project.miniatura }} style={styles.thumb} contentFit="cover" cachePolicy="memory-disk" recyclingKey={project.id} accessibilityIgnoresInvertColors />
          ) : (
            /* Sin miniatura se ve el emoji del proyecto: el proyecto existe, lo que no hay es una imagen. */
            <View style={[styles.cardEmoji, { backgroundColor: theme.colors.accent + '33' }]} accessibilityLabel={t('projects.noThumbnail')}>
              <Text style={styles.cardEmojiText}>{project.emoji}</Text>
            </View>
          )}
          <Text style={[styles.cardName, { color: theme.colors.text }]} numberOfLines={2}>{project.name}</Text>
          {!!experiencia && (
            <Text style={[styles.cardMeta, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {experiencia.emoji} {experienceLabel(experiencia, t)}
            </Text>
          )}
          {project.actualizadoEn !== null && (
            <Text style={[styles.cardMeta, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {t('projects.updatedAgo', { cuando: formato.tiempoRelativo(project.actualizadoEn) })}
            </Text>
          )}
          <View style={[styles.stateChip, { backgroundColor: theme.colors.accent + '26' }]}>
            <Text style={[styles.stateText, { color: theme.colors.text }]}>{t('projects.stateInProgress')}</Text>
          </View>
          <TouchableOpacity
            onPress={() => continuar(project)}
            activeOpacity={0.85}
            style={[styles.continueButton, { backgroundColor: theme.colors.accent }]}
            accessibilityRole="button"
            accessibilityLabel={t('projects.continueProject', { nombre: project.name })}
          >
            <Text style={styles.createText} numberOfLines={1}>{t('projects.continue')}</Text>
            <Ionicons name="arrow-forward" size={scale(14)} color="#1F2937" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <CreatorShell activeId="projects" overline="🤖 Weë AI" title={`📁 ${t('weeai.myProjects')}`} breadcrumb="Weë AI">
      <View style={[styles.intro, { backgroundColor: theme.colors.accent + '1A', borderColor: theme.colors.accent }]}>
        <Text style={[styles.introTitle, { color: theme.colors.text }]}>{t('projects.introTitle')}</Text>
        {/*
          La entradilla cita el botón que hay que buscar en el resultado. Va por
          interpolación y no escrito otra vez: así los dos no pueden separarse
          nunca —si mañana ese botón cambia de nombre, esta frase cambia con él—.
        */}
        <Text style={[styles.introText, { color: theme.colors.textSecondary }]}>
          {t('projects.introText', { accion: t('weeai.saveToProject') })}
        </Text>
      </View>

      <View style={styles.section}>
        <SectionTitle title={t('projects.sectionTitle')} action={t(creating ? 'common.cancel' : 'weeai.newProject')} onAction={() => setCreating((v) => !v)} />

        {creating && (
          <View style={[styles.newBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.accent }]}>
            <View style={styles.emojis}>
              {PROJECT_EMOJIS.map((item) => (
                <TouchableOpacity
                  key={item}
                  onPress={() => setEmoji(item)}
                  style={[styles.emojiButton, { borderColor: emoji === item ? theme.colors.accent : theme.colors.border }]}
                  accessibilityLabel={t('projects.emojiLabel', { emoji: item })}
                >
                  <Text style={styles.emojiText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.newRow}>
              <TextInput
                style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
                value={name}
                onChangeText={setName}
                placeholder={t('projects.namePlaceholder')}
                placeholderTextColor={theme.colors.textSecondary}
                onSubmitEditing={create}
                autoFocus
                accessibilityLabel={t('weeai.projectName')}
              />
              <TouchableOpacity onPress={create} disabled={!name.trim() || saving} style={[styles.createButton, { backgroundColor: theme.colors.accent }]} activeOpacity={0.85} accessibilityLabel={t('weeai.createProject')}>
                <Text style={styles.createText}>{saving ? '…' : t('weeai.create')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {estado.fase === 'cargando' ? (
          <View style={styles.centro}>
            <ActivityIndicator color={theme.colors.accent} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>{t('projects.loading')}</Text>
          </View>
        ) : estado.fase === 'error' ? (
          <View style={[styles.empty, { backgroundColor: theme.colors.card, borderColor: theme.colors.error }]}>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>{t('projects.loadFailed')}</Text>
            <TouchableOpacity onPress={cargar} style={[styles.createButton, { backgroundColor: theme.colors.accent, marginTop: SPACING.sm }]} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={t('projects.retry')}>
              <Text style={styles.createText}>{t('projects.retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : estado.projects.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={styles.emptyEmoji}>📁</Text>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>{t('projects.emptyTitle')}</Text>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>{t('projects.emptyStart', { accion: t('weeai.saveToProject') })}</Text>
            <TouchableOpacity onPress={() => setCreating(true)} style={[styles.createButton, { backgroundColor: theme.colors.accent, marginTop: SPACING.sm }]} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={t('projects.emptyAction')}>
              <Text style={styles.createText}>{t('projects.emptyAction')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.grid, { marginHorizontal: -SPACING.xs }]}>
            {estado.projects.map((project) => tarjeta(project))}
          </View>
        )}
      </View>

      {/* Lo que vive en el aparato (la carpeta WEE). Va después de los proyectos de la cuenta y no los toca. */}
      <View style={styles.section}>
        <SeccionDelDispositivo />
      </View>
    </CreatorShell>
  );
};

const styles = StyleSheet.create({
  intro: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    gap: scale(4),
  },
  introTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
  },
  introText: {
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(20),
  },
  section: {
    gap: SPACING.md,
  },
  newBox: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  emojis: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(6),
  },
  emojiButton: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: scale(18),
  },
  newRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  input: {
    flex: 1,
    height: scale(42),
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    fontSize: FONT_SIZE.sm,
  },
  createButton: {
    minHeight: scale(42),
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createText: {
    color: '#1F2937',
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
  centro: {
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xl,
  },
  empty: {
    alignItems: 'center',
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    gap: scale(6),
  },
  emptyEmoji: {
    fontSize: scale(40),
  },
  emptyTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
    lineHeight: scale(20),
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  card: {
    minHeight: scale(140),
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  thumb: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: BORDER_RADIUS.md,
  },
  cardEmoji: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardEmojiText: {
    fontSize: scale(22),
  },
  cardName: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    flex: 1,
  },
  cardMeta: {
    fontSize: FONT_SIZE.xs,
  },
  stateChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
    borderRadius: BORDER_RADIUS.full,
  },
  stateText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(4),
    minHeight: scale(36),
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
  },
});

/*
 * Weë AI es de la cuenta, no de un perfil: el taller se ve claro con el Perfil
 * Real y con el Perfil Weë. Lo de fuera —el cajón incluido— no se toca.
 */
export default enTemaClaro(ProjectsScreen);
