import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import IconoDireccional from '../components/IconoDireccional';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme, enTemaClaro } from '../contexts/ThemeContext';
import { useIdioma, useT } from '../contexts/IdiomaContext';
import { useEnEspacioProfesional } from '../contexts/EspacioProfesionalContext';
import { useDireccion } from '../hooks/useDireccion';
import { formatearFecha } from '../i18n/formato';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  TarjetaDeAviso, SelectorDeOrden, VacioDeBiblioteca, BotonPrincipal,
} from '../components/biblioteca/PiezasDeBiblioteca';
import { CabeceraDeBiblioteca } from '../components/biblioteca/CabeceraDeBiblioteca';
import { PALETA_BIBLIOTECA as P, SOMBRA_SUAVE } from '../components/biblioteca/paleta';
import { confirmAction, notify } from '../utils/notify';
import { useAuth } from '../contexts/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { projectsService, WeeProject, PROJECT_EMOJIS } from '../services/projectsService';
import CreatorShell from '../components/creator/CreatorShell';
import { SectionTitle } from '../components/creator/ui';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';
import { RellenoDeMarca } from '../components/GradienteDeMarca';

/**
 * Mis proyectos (docs/CREATOR-BUILD.md §17): "Mi restaurante", "Mi canción",
 * "Mi logo"… cada uno agrupa creaciones de distintos especialistas.
 *
 * ── Dos caras de la misma pantalla ─────────────────────────────────────────
 *
 * En Weë Creator (`useEnEspacioProfesional()`) se queda como estaba. En la App
 * es la biblioteca rediseñada (2026-11-05): cabecera «✦ Weë AI», resumen con
 * el total y la última actualización, búsqueda, orden y tarjetas con portada.
 * Las acciones de cada tarjeta son SOLO las que el servicio sabe hacer hoy:
 * abrir, cambiar el nombre y eliminar. Ni duplicar, ni archivar, ni estado:
 * `projectsService` no los tiene y no se fingen.
 */

/** Un `Timestamp` de Firestore (o un número) a milisegundos; null si no hay fecha. */
const enMilisegundos = (v: any): number | null => {
  if (!v) return null;
  if (typeof v === 'number') return v;
  if (typeof v.toMillis === 'function') return v.toMillis();
  if (typeof v.seconds === 'number') return v.seconds * 1000;
  return null;
};

/** Lo que la tarjeta sabe de un proyecto además de su ficha: cuántas creaciones tiene y su portada. */
interface ResumenDeProyecto { creaciones: number; portada: string | null }

type OrdenDeProyectos = 'updated' | 'name';
const ProjectsScreen: React.FC = () => {
  const { theme } = useTheme();
  const t = useT();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const { isDesktop, isTablet } = useResponsive();
  const { locale } = useIdioma();
  const pro = useEnEspacioProfesional();
  const dir = useDireccion();
  const [resumen, setResumen] = useState<Record<string, ResumenDeProyecto>>({});
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState<OrdenDeProyectos>('updated');
  const [ordenAbierto, setOrdenAbierto] = useState(false);
  const [menuDe, setMenuDe] = useState<string | null>(null);
  const [renombrando, setRenombrando] = useState<string | null>(null);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const peticion = useRef(0);

  const [projects, setProjects] = useState<WeeProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(PROJECT_EMOJIS[0]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }
    const mia = ++peticion.current;
    try {
      const lista = await projectsService.list(user.uid);
      if (mia !== peticion.current) return;
      setProjects(lista);
      /*
       * La App enseña en cada tarjeta cuántas creaciones tiene el proyecto y su
       * portada (la imagen más reciente). Sale del mismo `jobsForProject` que
       * usa el detalle; si una falla, esa tarjeta se queda sin el dato, no la
       * lista entera. Weë Creator no lo pide: su pantalla no lo enseña.
       */
      if (!pro) {
        void Promise.allSettled(lista.map(async (p) => {
          const jobs = await projectsService.jobsForProject(user.uid, p.id);
          const conImagen = jobs.flatMap((j) => j.results || []).find((r) => r.kind === 'image' && !!r.url);
          return [p.id, { creaciones: jobs.length, portada: conImagen?.url ?? null }] as const;
        })).then((hechos) => {
          if (mia !== peticion.current) return;
          const nuevo: Record<string, ResumenDeProyecto> = {};
          hechos.forEach((h) => { if (h.status === 'fulfilled') nuevo[h.value[0]] = h.value[1]; });
          setResumen(nuevo);
        });
      }
    } catch (error) {
      console.warn('No se pudieron cargar los proyectos:', error);
    } finally {
      if (mia === peticion.current) setLoading(false);
    }
  }, [user, pro]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
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

  /* ── Acciones de una tarjeta (App): cambiar el nombre y eliminar ───────── */
  const empezarARenombrar = (project: WeeProject) => {
    setMenuDe(null);
    setNombreNuevo(project.name);
    setRenombrando(project.id);
  };

  const guardarNombre = async (project: WeeProject) => {
    const limpio = nombreNuevo.trim();
    if (!limpio) return;
    /*
     * Se enseña ya, sin esperar a que el servidor conteste (en el teléfono esa
     * respuesta puede tardar): si falla, vuelve el nombre de antes y se dice.
     */
    const antes = project;
    setProjects((lista) => lista.map((p) => (p.id === project.id ? { ...p, name: limpio.slice(0, 60), updatedAt: Date.now() } : p)));
    setRenombrando(null);
    try {
      await projectsService.rename(project.id, limpio);
    } catch (error) {
      console.warn('No se pudo cambiar el nombre del proyecto:', error);
      setProjects((lista) => lista.map((p) => (p.id === antes.id ? antes : p)));
      notify(t('common.somethingWentWrong'));
    }
  };

  /* El nombre lo escribió la persona: entra por interpolación y no pasa por el traductor. */
  const eliminarProyecto = async (project: WeeProject) => {
    setMenuDe(null);
    const ok = await confirmAction(t('projects.deleteProject'), t('projects.deleteConfirm', { nombre: project.name }), t('common.delete'), true, t);
    if (!ok) return;
    try {
      await projectsService.remove(project.id);
      setProjects((lista) => lista.filter((p) => p.id !== project.id));
    } catch (error) {
      console.warn('No se pudo eliminar el proyecto:', error);
      notify(t('common.somethingWentWrong'));
    }
  };

  /* Lo que se ve: filtrado por lo buscado (sin distinguir mayúsculas, con las reglas del idioma) y ordenado. */
  const visibles = useMemo(() => {
    const q = busqueda.trim().toLocaleLowerCase(locale);
    const filtrados = q ? projects.filter((p) => p.name.toLocaleLowerCase(locale).includes(q)) : projects;
    return orden === 'name'
      ? [...filtrados].sort((a, b) => a.name.localeCompare(b.name, locale, { sensitivity: 'base' }))
      : [...filtrados].sort((a, b) => (enMilisegundos(b.updatedAt) ?? 0) - (enMilisegundos(a.updatedAt) ?? 0));
  }, [projects, busqueda, orden, locale]);

  const ultimaActualizacion = useMemo(() => {
    let max: number | null = null;
    for (const p of projects) { const ms = enMilisegundos(p.updatedAt); if (ms && (!max || ms > max)) max = ms; }
    return max;
  }, [projects]);
  const fecha = (ms: number | null) => (ms ? formatearFecha(ms, locale, { day: 'numeric', month: 'short', year: 'numeric' }) : '');

  /*
   * ── WEË CREATOR: la pantalla de siempre ──────────────────────────────────
   * Dentro de Weë Creator «Mis proyectos» no cambia. El rediseño es de la App.
   */
  if (pro) {
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
                <RellenoDeMarca radio={BORDER_RADIUS.full} />
                <Text style={styles.createText}>{saving ? '…' : t('weeai.create')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {loading ? (
          <ActivityIndicator color={theme.colors.accent} />
        ) : projects.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={styles.emptyEmoji}>📁</Text>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>{t('projects.emptyTitle')}</Text>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>{t('projects.emptyText')}</Text>
            <TouchableOpacity onPress={() => setCreating(true)} style={[styles.createButton, { backgroundColor: theme.colors.accent, marginTop: SPACING.sm }]} activeOpacity={0.85}>
              <RellenoDeMarca radio={BORDER_RADIUS.full} />
              <Text style={styles.createText}>{t('projects.emptyAction')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.grid, { marginHorizontal: -SPACING.xs }]}>
            {projects.map((project) => (
              <View key={project.id} style={{ width: isDesktop ? '33.33%' : '50%', padding: SPACING.xs }}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Project', { id: project.id })}
                  activeOpacity={0.8}
                  style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                  accessibilityLabel={project.name}
                >
                  <View style={[styles.cardEmoji, { backgroundColor: theme.colors.accent + '33' }]}>
                    <Text style={styles.cardEmojiText}>{project.emoji}</Text>
                  </View>
                  <Text style={[styles.cardName, { color: theme.colors.text }]} numberOfLines={2}>{project.name}</Text>
                  <View style={styles.cardFooter}>
                    <Text style={[styles.cardMeta, { color: theme.colors.textSecondary }]}>{t('projects.open')}</Text>
                    <IconoDireccional name="arrow-forward" size={scale(14)} color={theme.colors.textSecondary} />
                  </View>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    </CreatorShell>
  );
  }

  /* ── LA APP: la biblioteca rediseñada ──────────────────────────────────── */
  const columnas = isDesktop ? 3 : isTablet ? 2 : 1;
  const ORDENES = [
    { id: 'updated' as const, texto: t('projects.sortUpdated') },
    { id: 'name' as const, texto: t('projects.sortName') },
  ];

  const formulario = creating && (
    <View style={styles.appNuevo}>
      <View style={styles.appNuevoCabeza}>
        <Text style={[styles.appNuevoTitulo, dir.texto]}>{t('weeai.newProject')}</Text>
        <TouchableOpacity onPress={() => setCreating(false)} style={styles.appIcono} accessibilityRole="button" accessibilityLabel={t('common.close')}>
          <Ionicons name="close" size={20} color={P.textoSuave} />
        </TouchableOpacity>
      </View>
      <View style={styles.emojis}>
        {PROJECT_EMOJIS.map((item) => (
          <TouchableOpacity
            key={item}
            onPress={() => setEmoji(item)}
            style={[styles.appEmoji, emoji === item && styles.appEmojiActivo]}
            accessibilityRole="button"
            accessibilityState={{ selected: emoji === item }}
            accessibilityLabel={t('projects.emojiLabel', { emoji: item })}
          >
            <Text style={styles.emojiText}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.newRow}>
        <TextInput
          style={[styles.appCampo, dir.texto]}
          value={name}
          onChangeText={setName}
          placeholder={t('projects.namePlaceholder')}
          placeholderTextColor={P.textoSuave}
          onSubmitEditing={create}
          autoFocus
          maxLength={60}
          accessibilityLabel={t('weeai.projectName')}
        />
        <BotonPrincipal texto={saving ? '…' : t('weeai.create')} icono="add" compacto onPress={create} disabled={!name.trim() || saving} />
      </View>
    </View>
  );

  return (
    <CreatorShell activeId="projects" title={t('weeai.myProjects')} breadcrumb="Weë AI" sinFranjaSuperior>
      <View style={[styles.app, dir.contenedor]}>
        <CabeceraDeBiblioteca titulo={t('weeai.myProjects')} />

        <TarjetaDeAviso icono="folder-open-outline" titulo={t('projects.introTitle')} texto={t('projects.introText', { accion: t('weeai.saveToProject') })} />

        {loading ? (
          <ActivityIndicator color={P.morado} style={{ paddingVertical: 32 }} />
        ) : projects.length === 0 ? (
          <>
            {formulario}
            {!creating && (
              <VacioDeBiblioteca
                icono="folder-open"
                titulo={t('projects.emptySpaceTitle')}
                texto={t('projects.emptyText')}
                accion={t('projects.emptyAction')}
                onAccion={() => setCreating(true)}
              />
            )}
          </>
        ) : (
          <View style={styles.appSeccion}>
            {/* El resumen: cuántos hay y cuándo cambió el último. */}
            <View style={styles.appResumen}>
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text style={[styles.appContador, dir.texto]} numberOfLines={1} accessibilityRole="header">
                  {t('projects.count', { contador: projects.length })}
                </Text>
                {!!ultimaActualizacion && (
                  <Text style={[styles.appResumenMeta, dir.texto]} numberOfLines={1}>{t('projects.updatedOn', { fecha: fecha(ultimaActualizacion) })}</Text>
                )}
              </View>
              {!creating && <BotonPrincipal texto={t('weeai.newProject')} icono="add" compacto onPress={() => setCreating(true)} />}
            </View>

            {formulario}

            <View style={styles.appHerramientas}>
              <View style={styles.appBuscador}>
                <Ionicons name="search-outline" size={18} color={P.textoSuave} />
                <TextInput
                  style={[styles.appBuscadorCampo, dir.texto]}
                  value={busqueda}
                  onChangeText={setBusqueda}
                  placeholder={t('projects.searchPlaceholder')}
                  placeholderTextColor={P.textoSuave}
                  accessibilityLabel={t('projects.searchPlaceholder')}
                  returnKeyType="search"
                />
                {!!busqueda && (
                  <TouchableOpacity onPress={() => setBusqueda('')} accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={18} color={P.textoSuave} />
                  </TouchableOpacity>
                )}
              </View>
              <SelectorDeOrden
                opciones={ORDENES}
                valor={orden}
                onChange={setOrden}
                abierto={ordenAbierto}
                onAbrir={setOrdenAbierto}
              />
            </View>

            {visibles.length === 0 ? (
              <VacioDeBiblioteca icono="search" titulo={t('projects.noMatches')} />
            ) : (
              <View style={styles.appRejilla}>
                {visibles.map((project) => {
                  const datos = resumen[project.id];
                  const editando = renombrando === project.id;
                  const conMenu = menuDe === project.id;
                  return (
                    <View key={project.id} style={{ width: `${(100 / columnas).toFixed(2)}%` as never, padding: 8, zIndex: conMenu ? 30 : 1 }}>
                      <View style={styles.appTarjeta}>
                        <TouchableOpacity
                          onPress={() => navigation.navigate('Project', { id: project.id })}
                          activeOpacity={0.88}
                          style={styles.appPortada}
                          accessibilityRole="button"
                          accessibilityLabel={project.name}
                        >
                          {datos?.portada ? (
                            <Image source={{ uri: datos.portada }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" recyclingKey={project.id} transition={150} />
                          ) : (
                            <LinearGradient colors={[P.lavandaSuave, P.lavanda]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                          )}
                          <View style={[styles.appEmojiPortada, dir.alInicio(14)]}>
                            <Text style={styles.appEmojiPortadaTexto}>{project.emoji}</Text>
                          </View>
                        </TouchableOpacity>
                        <View style={styles.appCuerpo}>
                          {editando ? (
                            <View style={styles.newRow}>
                              <TextInput
                                style={[styles.appCampo, dir.texto]}
                                value={nombreNuevo}
                                onChangeText={setNombreNuevo}
                                onSubmitEditing={() => guardarNombre(project)}
                                autoFocus
                                maxLength={60}
                                accessibilityLabel={t('weeai.projectName')}
                              />
                              <TouchableOpacity onPress={() => guardarNombre(project)} style={[styles.appIcono, styles.appIconoLleno]} accessibilityRole="button" accessibilityLabel={t('projects.saveName')}>
                                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => setRenombrando(null)} style={styles.appIcono} accessibilityRole="button" accessibilityLabel={t('common.close')}>
                                <Ionicons name="close" size={20} color={P.textoSuave} />
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <View style={styles.appTituloFila}>
                              {/* El nombre es de la persona: se pinta tal cual. */}
                              <Text style={[styles.appNombre, dir.texto]} numberOfLines={2}>{project.name}</Text>
                              <View>
                                <TouchableOpacity
                                  onPress={() => setMenuDe(conMenu ? null : project.id)}
                                  style={styles.appIcono}
                                  accessibilityRole="button"
                                  accessibilityLabel={t('projects.moreActions')}
                                  accessibilityState={{ expanded: conMenu }}
                                >
                                  <Ionicons name="ellipsis-horizontal" size={20} color={P.texto} />
                                </TouchableOpacity>
                                {conMenu && (
                                  <View style={[styles.appMenu, dir.alFinal(0)]} accessibilityRole="menu">
                                    <TouchableOpacity onPress={() => { setMenuDe(null); navigation.navigate('Project', { id: project.id }); }} style={styles.appMenuOpcion} accessibilityRole="menuitem">
                                      <Ionicons name="folder-open-outline" size={18} color={P.texto} />
                                      <Text style={[styles.appMenuTexto, dir.texto]}>{t('projects.open')}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => empezarARenombrar(project)} style={styles.appMenuOpcion} accessibilityRole="menuitem">
                                      <Ionicons name="pencil-outline" size={18} color={P.texto} />
                                      <Text style={[styles.appMenuTexto, dir.texto]}>{t('projects.rename')}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => eliminarProyecto(project)} style={styles.appMenuOpcion} accessibilityRole="menuitem">
                                      <Ionicons name="trash-outline" size={18} color={P.error} />
                                      <Text style={[styles.appMenuTexto, { color: P.error }, dir.texto]}>{t('projects.deleteProject')}</Text>
                                    </TouchableOpacity>
                                  </View>
                                )}
                              </View>
                            </View>
                          )}
                          <Text style={[styles.appMeta, dir.texto]} numberOfLines={1}>
                            {datos ? t('projects.creations', { contador: datos.creaciones }) : ' '}
                          </Text>
                          <View style={styles.appPieTarjeta}>
                            <View style={styles.appFecha}>
                              <Ionicons name="time-outline" size={14} color={P.textoSuave} />
                              <Text style={[styles.appMeta, dir.texto]} numberOfLines={1}>{t('projects.updatedOn', { fecha: fecha(enMilisegundos(project.updatedAt)) })}</Text>
                            </View>
                            <TouchableOpacity onPress={() => navigation.navigate('Project', { id: project.id })} style={styles.appAbrir} accessibilityRole="button" accessibilityLabel={t('projects.open')}>
                              <Text style={styles.appAbrirTexto}>{t('projects.open')}</Text>
                              <IconoDireccional name="arrow-forward" size={16} color={P.morado} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </View>
    </CreatorShell>
  );
};

const styles = StyleSheet.create({
  app: { gap: 22, width: '100%', maxWidth: 1080, alignSelf: 'center' },
  appSeccion: { gap: 16 },
  appResumen: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  appContador: { color: P.texto, fontSize: 24, fontWeight: FONT_WEIGHT.bold, letterSpacing: -0.4 },
  appResumenMeta: { color: P.textoSuave, fontSize: 13 },
  appHerramientas: { flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 20 },
  appBuscador: {
    flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 14,
    borderRadius: 999, borderWidth: 1, borderColor: P.borde, backgroundColor: '#FFFFFF',
  },
  appBuscadorCampo: { flex: 1, minWidth: 0, height: 42, fontSize: 15, color: P.texto, outlineStyle: 'none' } as any,
  appNuevo: { gap: 14, padding: 18, borderRadius: 20, borderWidth: 1, borderColor: P.bordeLavanda, backgroundColor: P.lavandaSuave },
  appNuevoCabeza: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  appNuevoTitulo: { color: P.texto, fontSize: 16, fontWeight: FONT_WEIGHT.bold },
  appEmoji: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: P.borde, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  appEmojiActivo: { borderColor: P.morado, borderWidth: 2, backgroundColor: P.lavanda },
  appCampo: {
    flex: 1, minWidth: 0, height: 42, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: P.borde,
    backgroundColor: '#FFFFFF', fontSize: 15, color: P.texto,
  },
  appIcono: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  appIconoLleno: { backgroundColor: P.morado },
  appRejilla: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8 },
  appTarjeta: { borderRadius: 22, borderWidth: 1, borderColor: P.borde, backgroundColor: '#FFFFFF' },
  appPortada: { height: 132, borderTopLeftRadius: 21, borderTopRightRadius: 21, overflow: 'hidden', backgroundColor: P.lavandaSuave },
  appEmojiPortada: {
    position: 'absolute', bottom: 12, width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
  },
  appEmojiPortadaTexto: { fontSize: 24 },
  appCuerpo: { padding: 16, paddingTop: 14, gap: 6 },
  appTituloFila: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, zIndex: 30 },
  appNombre: { flex: 1, minWidth: 0, color: P.texto, fontSize: 17, lineHeight: 23, fontWeight: FONT_WEIGHT.bold, paddingTop: 7 },
  appMenu: {
    position: 'absolute', top: 40, minWidth: 210, padding: 6, borderRadius: 16, borderWidth: 1, borderColor: P.borde,
    backgroundColor: '#FFFFFF', ...SOMBRA_SUAVE,
  },
  appMenuOpcion: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 42, paddingHorizontal: 12, borderRadius: 10 },
  appMenuTexto: { color: P.texto, fontSize: 14, fontWeight: FONT_WEIGHT.semibold, flexShrink: 1 },
  appMeta: { color: P.textoSuave, fontSize: 13, flexShrink: 1 },
  appPieTarjeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 4 },
  appFecha: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 5 },
  appAbrir: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 36, paddingHorizontal: 12, borderRadius: 999, backgroundColor: P.lavandaSuave },
  appAbrirTexto: { color: P.morado, fontSize: 14, fontWeight: FONT_WEIGHT.bold },
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
    height: scale(42),
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
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  cardMeta: {
    fontSize: FONT_SIZE.xs,
  },
});

/*
 * Weë AI es de la cuenta, no de un perfil: el taller se ve claro con el Perfil
 * Real y con el Perfil Weë. Lo de fuera —el cajón incluido— no se toca.
 */
export default enTemaClaro(ProjectsScreen);
