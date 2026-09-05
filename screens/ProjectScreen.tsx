import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { projectsService, WeeProject } from '../services/projectsService';
import { CreatorJob, JOB_STATUS_LABEL } from '../services/creatorService';
import { getExperienceById } from '../constants/weeExperiences';
import CreatorShell from '../components/creator/CreatorShell';
import { SectionTitle, ClosingBanner } from '../components/creator/ui';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

const isWeb = Platform.OS === 'web';

const KIND_ICON: Record<string, string> = {
  design: 'color-palette-outline',
  studio: 'videocam-outline',
  photo: 'camera-outline',
  writer: 'create-outline',
  music: 'musical-notes-outline',
  beauty: 'heart-outline',
  chef: 'restaurant-outline',
  home: 'home-outline',
  business: 'briefcase-outline',
  brain: 'bulb-outline',
};

/** Un proyecto: sus creaciones, de todos los especialistas, en un solo lugar. */
const ProjectScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const id: string = route.params?.id;

  const [project, setProject] = useState<WeeProject | null>(null);
  const [jobs, setJobs] = useState<CreatorJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState('');

  const load = useCallback(async () => {
    if (!user || !id) return;
    try {
      const found = await projectsService.get(id);
      setProject(found);
      setName(found?.name || '');
    } catch (error) {
      console.warn('No se pudo cargar el proyecto:', error);
    }
    try {
      setJobs(await projectsService.jobsForProject(user.uid, id));
    } catch (error) {
      // Si el índice todavía se está creando, el proyecto se muestra sin creaciones
      console.warn('No se pudieron cargar las creaciones del proyecto:', error);
    }
    setLoading(false);
  }, [user, id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const saveName = async () => {
    if (!project || !name.trim()) return;
    await projectsService.rename(project.id, name);
    setProject({ ...project, name: name.trim() });
    setRenaming(false);
  };

  const remove = async () => {
    if (!project) return;
    const ok = isWeb ? window.confirm(`¿Eliminar el proyecto "${project.name}"? Tus creaciones no se borran.`) : true;
    if (!isWeb) {
      Alert.alert('Eliminar proyecto', `¿Eliminar "${project.name}"? Tus creaciones no se borran.`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: async () => { await projectsService.remove(project.id); navigation.goBack(); } },
      ]);
      return;
    }
    if (!ok) return;
    await projectsService.remove(project.id);
    navigation.goBack();
  };

  const title = project ? `${project.emoji} ${project.name}` : '📁 Proyecto';

  return (
    <CreatorShell activeId="projects" overline="Mis proyectos" title={title} breadcrumb="Mis proyectos">
      {loading ? (
        <ActivityIndicator color={theme.colors.accent} />
      ) : !project ? (
        <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>No encontramos este proyecto.</Text>
      ) : (
        <>
          <View style={[styles.head, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={[styles.headEmoji, { backgroundColor: theme.colors.accent + '33' }]}>
              <Text style={styles.headEmojiText}>{project.emoji}</Text>
            </View>
            <View style={{ flex: 1, gap: scale(4) }}>
              {renaming ? (
                <View style={styles.renameRow}>
                  <TextInput
                    style={[styles.renameInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
                    value={name}
                    onChangeText={setName}
                    onSubmitEditing={saveName}
                    autoFocus
                    accessibilityLabel="Nombre del proyecto"
                  />
                  <TouchableOpacity onPress={saveName} style={[styles.smallButton, { backgroundColor: theme.colors.accent }]} accessibilityLabel="Guardar nombre">
                    <Text style={styles.smallButtonText}>Guardar</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={[styles.headName, { color: theme.colors.text }]}>{project.name}</Text>
              )}
              <Text style={[styles.headMeta, { color: theme.colors.textSecondary }]}>
                {jobs.length === 1 ? '1 creación' : `${jobs.length} creaciones`}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setRenaming((v) => !v)} style={styles.iconButton} accessibilityLabel="Cambiar nombre">
              <Ionicons name="pencil-outline" size={scale(18)} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={remove} style={styles.iconButton} accessibilityLabel="Eliminar proyecto">
              <Ionicons name="trash-outline" size={scale(18)} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <SectionTitle title="Creaciones" action="Añadir" onAction={() => navigation.navigate('WeeCreator')} />
            {jobs.length === 0 ? (
              <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>
                Todavía no hay creaciones aquí. Crea algo con cualquier especialista y guárdalo en este proyecto.
              </Text>
            ) : (
              jobs.map((job) => {
                const exp = getExperienceById(job.experienceId);
                return (
                  <TouchableOpacity
                    key={job.id}
                    onPress={() => navigation.navigate('CreatorFlow', { experienceId: job.experienceId, jobId: job.id })}
                    activeOpacity={0.8}
                    style={[styles.jobRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                  >
                    <View style={[styles.jobIcon, { backgroundColor: theme.colors.accent + '26' }]}>
                      <Ionicons name={(KIND_ICON[job.experienceId] || 'sparkles-outline') as any} size={scale(18)} color={theme.colors.accentDark} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.jobGoal, { color: theme.colors.text }]} numberOfLines={1}>{job.goal}</Text>
                      <Text style={[styles.jobMeta, { color: theme.colors.textSecondary }]}>
                        {exp?.name ?? 'Weë'} · {JOB_STATUS_LABEL[job.status] ?? job.status}{job.demo ? ' · demo' : ''}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={scale(18)} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          <ClosingBanner
            emoji="✨"
            title="¿Qué le falta a este proyecto?"
            subtitle="Un logo, fotos, un anuncio, un video, música o un documento: cualquier especialista de Weë puede sumar aquí."
            button="Crear algo nuevo"
            onPress={() => navigation.navigate('WeeCreator')}
          />
        </>
      )}
    </CreatorShell>
  );
};

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
  },
  headEmoji: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(26),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headEmojiText: {
    fontSize: scale(26),
  },
  headName: {
    fontSize: scale(20),
    fontWeight: FONT_WEIGHT.bold,
  },
  headMeta: {
    fontSize: FONT_SIZE.xs,
  },
  renameRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
  },
  renameInput: {
    flex: 1,
    height: scale(38),
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    fontSize: FONT_SIZE.sm,
  },
  smallButton: {
    height: scale(38),
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallButtonText: {
    color: '#1F2937',
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
  },
  iconButton: {
    width: scale(36),
    height: scale(36),
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    gap: SPACING.sm,
  },
  empty: {
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(20),
  },
  jobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  jobIcon: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    alignItems: 'center',
    justifyContent: 'center',
  },
  jobGoal: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  jobMeta: {
    fontSize: FONT_SIZE.xs,
    marginTop: scale(2),
  },
});

export default ProjectScreen;
