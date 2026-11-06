import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import IconoDireccional from '../components/IconoDireccional';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useTheme, enTemaClaro } from '../contexts/ThemeContext';
import { useIdioma, useT } from '../contexts/IdiomaContext';
import { useEnEspacioProfesional } from '../contexts/EspacioProfesionalContext';
import { useResponsive } from '../hooks/useResponsive';
import { useDireccion } from '../hooks/useDireccion';
import { formatearFecha } from '../i18n/formato';
import { Image } from 'expo-image';
import {
  TarjetaDeAviso, VacioDeBiblioteca, BotonPrincipal,
} from '../components/biblioteca/PiezasDeBiblioteca';
import { CabeceraDeBiblioteca } from '../components/biblioteca/CabeceraDeBiblioteca';
import { PALETA_BIBLIOTECA as P } from '../components/biblioteca/paleta';
import { textoDeObjetivo } from '../i18n/servidor';
import { useAuth } from '../contexts/AuthContext';
import { projectsService, WeeProject } from '../services/projectsService';
import { CreatorJob, claveDelEstado } from '../services/creatorService';
import { getExperienceById } from '../constants/weeExperiences';
import CreatorShell from '../components/creator/CreatorShell';
import { SectionTitle, ClosingBanner } from '../components/creator/ui';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';
import { RellenoDeMarca } from '../components/GradienteDeMarca';

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
  business: 'shirt-outline',
  brain: 'bulb-outline',
};

/** Un `Timestamp` de Firestore (o un número) a milisegundos; null si no hay fecha. */
const enMilisegundos = (v: any): number | null => {
  if (!v) return null;
  if (typeof v === 'number') return v;
  if (typeof v.toMillis === 'function') return v.toMillis();
  if (typeof v.seconds === 'number') return v.seconds * 1000;
  return null;
};

/**
 * Un proyecto: sus creaciones, de todos los especialistas, en un solo lugar.
 *
 * En Weë Creator se queda como estaba; en la App es la biblioteca rediseñada
 * (2026-11-05), con el mismo lenguaje que «Mis creaciones» y «Mis proyectos».
 * Lo que se puede hacer es lo que ya se podía: cambiar el nombre, eliminar el
 * proyecto, abrir cada creación en su trabajo y crear algo nuevo.
 */
const ProjectScreen: React.FC = () => {
  const { theme } = useTheme();
  const t = useT();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const id: string = route.params?.id;
  const pro = useEnEspacioProfesional();
  const { locale } = useIdioma();
  const { isDesktop, isTablet } = useResponsive();
  const dir = useDireccion();

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
    /*
     * El nombre del proyecto lo escribió la persona: entra por interpolación y
     * NO pasa por el traductor. La web y el móvil dicen cosas distintas porque
     * `window.confirm` no tiene título y el aviso del móvil sí.
     */
    const ok = isWeb ? window.confirm(t('projects.deleteConfirmWeb', { nombre: project.name })) : true;
    if (!isWeb) {
      Alert.alert(t('projects.deleteProject'), t('projects.deleteConfirm', { nombre: project.name }), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: async () => { await projectsService.remove(project.id); navigation.goBack(); } },
      ]);
      return;
    }
    if (!ok) return;
    await projectsService.remove(project.id);
    navigation.goBack();
  };

  /* El título es el proyecto de la persona; solo el respaldo es de la interfaz. */
  const title = project ? `${project.emoji} ${project.name}` : `📁 ${t('projects.fallbackTitle')}`;

  /*
   * ── WEË CREATOR: la pantalla de siempre ──────────────────────────────────
   * Dentro de Weë Creator el detalle no cambia. El rediseño es de la App.
   */
  if (pro) {
  return (
    <CreatorShell activeId="projects" overline={t('weeai.myProjects')} title={title} breadcrumb={t('weeai.myProjects')}>
      {loading ? (
        <ActivityIndicator color={theme.colors.accent} />
      ) : !project ? (
        <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>{t('projects.notFound')}</Text>
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
                    accessibilityLabel={t('weeai.projectName')}
                  />
                  <TouchableOpacity onPress={saveName} style={[styles.smallButton, { backgroundColor: theme.colors.accent }]} accessibilityLabel={t('projects.saveName')}>
                    <RellenoDeMarca radio={BORDER_RADIUS.full} />
                    <Text style={styles.smallButtonText}>{t('common.save')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={[styles.headName, { color: theme.colors.text }]}>{project.name}</Text>
              )}
              {/* Cuántas hay: la forma la elige `Intl.PluralRules`, no un `if`. */}
              <Text style={[styles.headMeta, { color: theme.colors.textSecondary }]}>
                {t('projects.creations', { contador: jobs.length })}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setRenaming((v) => !v)} style={styles.iconButton} accessibilityLabel={t('projects.rename')}>
              <Ionicons name="pencil-outline" size={scale(18)} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={remove} style={styles.iconButton} accessibilityLabel={t('projects.deleteProject')}>
              <Ionicons name="trash-outline" size={scale(18)} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <SectionTitle title={t('projects.creationsTitle')} action={t('projects.add')} onAction={() => navigation.navigate('WeeCreator')} />
            {jobs.length === 0 ? (
              <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>
                {t('projects.noCreations')}
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
                      <Text style={[styles.jobGoal, { color: theme.colors.text }]} numberOfLines={1}>{textoDeObjetivo(t, job.experienceId, job.goal)}</Text>
                      <Text style={[styles.jobMeta, { color: theme.colors.textSecondary }]}>
                        {exp?.name ?? 'Weë'} · {t(claveDelEstado[job.status]) ?? job.status}{job.demo ? ` · ${t('weeai.demo')}` : ''}
                      </Text>
                    </View>
                    <IconoDireccional name="chevron-forward" size={scale(18)} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          <ClosingBanner
            emoji="✨"
            title={t('projects.whatIsMissing')}
            subtitle={t('projects.whatIsMissingNote')}
            button={t('projects.createSomethingNew')}
            onPress={() => navigation.navigate('WeeCreator')}
          />
        </>
      )}
    </CreatorShell>
  );
  }

  /* ── LA APP: el proyecto, con el lenguaje de la biblioteca ─────────────── */
  const columnas = isDesktop ? 4 : isTablet ? 3 : 2;
  const actualizado = enMilisegundos(project?.updatedAt);
  const crear = () => navigation.navigate('WeeCreator');

  return (
    <CreatorShell activeId="projects" title={project?.name || t('projects.fallbackTitle')} breadcrumb={t('weeai.myProjects')} sinFranjaSuperior>
      <View style={[styles.app, dir.contenedor]}>
        {/* El título es el proyecto de la persona; solo el respaldo es de la interfaz. */}
        <CabeceraDeBiblioteca titulo={project ? project.name : t('projects.fallbackTitle')} />

        {loading ? (
          <ActivityIndicator color={P.morado} style={{ paddingVertical: 32 }} />
        ) : !project ? (
          <VacioDeBiblioteca icono="folder-open" titulo={t('projects.notFound')} />
        ) : (
          <>
            <View style={styles.appFicha}>
              <View style={styles.appFichaFila}>
                <View style={styles.appFichaEmoji}>
                  <Text style={styles.appFichaEmojiTexto}>{project.emoji}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                  {renaming ? (
                    <View style={styles.renameRow}>
                      <TextInput
                        style={[styles.appCampo, dir.texto]}
                        value={name}
                        onChangeText={setName}
                        onSubmitEditing={saveName}
                        autoFocus
                        maxLength={60}
                        accessibilityLabel={t('weeai.projectName')}
                      />
                      <TouchableOpacity onPress={saveName} style={[styles.appIcono, { backgroundColor: P.morado }]} accessibilityRole="button" accessibilityLabel={t('projects.saveName')}>
                        <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text style={[styles.appFichaNombre, dir.texto]} numberOfLines={2}>{project.name}</Text>
                  )}
                  <Text style={[styles.appMeta, dir.texto]} numberOfLines={2}>
                    {t('projects.creations', { contador: jobs.length })}
                    {actualizado ? `  ·  ${t('projects.updatedOn', { fecha: formatearFecha(actualizado, locale, { day: 'numeric', month: 'short', year: 'numeric' }) })}` : ''}
                  </Text>
                </View>
              </View>
              <View style={styles.appAcciones}>
                <BotonPrincipal texto={t('projects.createSomethingNew')} icono="sparkles" compacto onPress={crear} />
                <TouchableOpacity
                  onPress={() => { setName(project.name); setRenaming((v) => !v); }}
                  style={[styles.appAccion, renaming && { borderColor: P.morado, backgroundColor: P.lavandaSuave }]}
                  accessibilityRole="button"
                  accessibilityLabel={t('projects.rename')}
                >
                  <Ionicons name="pencil-outline" size={16} color={renaming ? P.morado : P.texto} />
                  <Text style={[styles.appAccionTexto, renaming && { color: P.morado }]}>{t('projects.rename')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={remove} style={styles.appAccion} accessibilityRole="button" accessibilityLabel={t('projects.deleteProject')}>
                  <Ionicons name="trash-outline" size={16} color={P.error} />
                  <Text style={[styles.appAccionTexto, { color: P.error }]}>{t('projects.deleteProject')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {jobs.length === 0 ? (
              <VacioDeBiblioteca
                icono="sparkles"
                titulo={t('projects.whatIsMissing')}
                texto={t('projects.noCreations')}
                accion={t('projects.createSomethingNew')}
                onAccion={crear}
              />
            ) : (
              <View style={{ gap: 14 }}>
                <Text style={[styles.appSeccionTitulo, dir.texto]} accessibilityRole="header">{t('projects.creationsTitle')}</Text>
                <View style={styles.appRejilla}>
                  {jobs.map((job) => {
                    const exp = getExperienceById(job.experienceId);
                    const portada = (job.results || []).find((r) => r.kind === 'image' && !!r.url)?.url;
                    return (
                      <View key={job.id} style={{ width: `${(100 / columnas).toFixed(2)}%` as never, padding: 6 }}>
                        <TouchableOpacity
                          onPress={() => navigation.navigate('CreatorFlow', { experienceId: job.experienceId, jobId: job.id })}
                          activeOpacity={0.88}
                          style={styles.appTrabajo}
                          accessibilityRole="button"
                          accessibilityLabel={textoDeObjetivo(t, job.experienceId, job.goal)}
                        >
                          <View style={styles.appTrabajoMedia}>
                            {portada ? (
                              <Image source={{ uri: portada }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" recyclingKey={job.id} transition={150} />
                            ) : (
                              <View style={styles.appTrabajoIcono}>
                                <Ionicons name={(KIND_ICON[job.experienceId] || 'sparkles-outline') as any} size={28} color={P.morado} />
                              </View>
                            )}
                          </View>
                          <View style={styles.appTrabajoPie}>
                            <Text style={[styles.appTrabajoObjetivo, dir.texto]} numberOfLines={2}>{textoDeObjetivo(t, job.experienceId, job.goal)}</Text>
                            <Text style={[styles.appMeta, dir.texto]} numberOfLines={1}>
                              {exp?.name ?? 'Weë'} · {t(claveDelEstado[job.status]) ?? job.status}{job.demo ? ` · ${t('weeai.demo')}` : ''}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
                <TarjetaDeAviso titulo={t('projects.whatIsMissing')} texto={t('projects.whatIsMissingNote')} />
              </View>
            )}
          </>
        )}
      </View>
    </CreatorShell>
  );
};

const styles = StyleSheet.create({
  app: { gap: 22, width: '100%', maxWidth: 1080, alignSelf: 'center' },
  appFicha: { gap: 16, padding: 18, borderRadius: 22, borderWidth: 1, borderColor: P.borde, backgroundColor: '#FFFFFF' },
  appFichaFila: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  appFichaEmoji: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: P.lavanda },
  appFichaEmojiTexto: { fontSize: 30 },
  appFichaNombre: { color: P.texto, fontSize: 20, lineHeight: 26, fontWeight: FONT_WEIGHT.bold },
  appMeta: { color: P.textoSuave, fontSize: 13, lineHeight: 18 },
  appCampo: {
    flex: 1, minWidth: 0, height: 42, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: P.borde,
    backgroundColor: '#FFFFFF', fontSize: 15, color: P.texto,
  },
  appIcono: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  appAcciones: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  appAccion: {
    flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 14, borderRadius: 999,
    borderWidth: 1, borderColor: P.borde, backgroundColor: '#FFFFFF',
  },
  appAccionTexto: { color: P.texto, fontSize: 14, fontWeight: FONT_WEIGHT.semibold },
  appSeccionTitulo: { color: P.texto, fontSize: 20, fontWeight: FONT_WEIGHT.bold, letterSpacing: -0.3 },
  appRejilla: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  appTrabajo: { borderRadius: 20, borderWidth: 1, borderColor: P.borde, backgroundColor: '#FFFFFF', overflow: 'hidden' },
  appTrabajoMedia: { aspectRatio: 1.25, width: '100%', backgroundColor: P.lavandaSuave, alignItems: 'center', justifyContent: 'center' },
  appTrabajoIcono: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: P.lavanda },
  appTrabajoPie: { padding: 12, gap: 4 },
  appTrabajoObjetivo: { color: P.texto, fontSize: 14, lineHeight: 19, fontWeight: FONT_WEIGHT.semibold },
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

/*
 * Weë AI es de la cuenta, no de un perfil: el taller se ve claro con el Perfil
 * Real y con el Perfil Weë. Lo de fuera —el cajón incluido— no se toca.
 */
export default enTemaClaro(ProjectScreen);
