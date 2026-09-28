import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useIdioma, useT } from '../../contexts/IdiomaContext';
import { useAuth } from '../../contexts/AuthContext';
import { useResponsive } from '../../hooks/useResponsive';
import { useProducciones, duplicarProduccion, archivarProduccion } from '../../hooks/useProducciones';
import { useProyectosDeWeeAi } from '../../hooks/useProyectosDeWeeAi';
import { useCaminosDeCreacion } from '../../hooks/useCaminosDeCreacion';
import { projectsService, WeeProject } from '../../services/projectsService';
import { assetsService, AssetDoc } from '../../services/assetsService';
import type { ResumenDeProduccion } from '../../services/filmmakerService';
import HojaInferior from '../workspace/HojaInferior';
import CampoQueCrece from '../creator/CampoQueCrece';
import RejillaDeCreaciones from '../creator/RejillaDeCreaciones';
import { fraseDelFallo } from '../../utils/mensajesDeFilmmaker';
import { notify, confirmAction } from '../../utils/notify';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

const isWeb = Platform.OS === 'web';

type Filtro = 'todo' | 'producciones' | 'weeai';

/** Los milisegundos de una fecha que puede venir como Timestamp de Firestore o como número. */
const enMs = (fecha: unknown): number | null => {
  if (typeof fecha === 'number') return fecha;
  const f = fecha as { toMillis?: () => number } | null;
  return f?.toMillis ? f.toMillis() : null;
};

/** Una acción de la hoja de opciones. */
const Opcion: React.FC<{ icono: string; texto: string; onPress: () => void; peligro?: boolean }> = ({ icono, texto, onPress, peligro }) => {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.opcion, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
      accessibilityRole="button"
      accessibilityLabel={texto}
    >
      <Ionicons name={icono as any} size={scale(18)} color={peligro ? theme.colors.error : theme.colors.text} />
      <Text style={[styles.opcionTexto, { color: peligro ? theme.colors.error : theme.colors.text }]}>{texto}</Text>
    </TouchableOpacity>
  );
};

/**
 * PROYECTOS: DONDE SE TRABAJA.
 *
 * Tres cosas distintas y cada una en su sitio (decisión del usuario,
 * 2026-09-27): un PROYECTO es un espacio de trabajo —una producción de
 * Filmmaker, o un proyecto de Weë AI donde se guardan creaciones—; una CREACIÓN
 * es un resultado; un ASSET es lo que un proyecto usa. Aquí se ven los
 * proyectos y, al final, un vistazo a las creaciones con su puerta a la
 * biblioteca completa.
 *
 * Cada fila hace solo lo que de verdad se puede hacer con ella: una producción
 * se abre, se duplica y se archiva (no se renombra ni se borra: el servidor no
 * tiene esas operaciones y no se inventan); un proyecto de Weë AI se abre, se
 * renombra y se elimina.
 */
const ListaDeProyectos: React.FC = () => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const { isMobile, isDesktop } = useResponsive();
  const { aCreator } = useCaminosDeCreacion();
  const [filtro, setFiltro] = useState<Filtro>('todo');
  const [archivadas, setArchivadas] = useState(false);
  const producciones = useProducciones(archivadas ? 'archived' : 'active', !!user);
  const weeai = useProyectosDeWeeAi();
  const [creaciones, setCreaciones] = useState<AssetDoc[]>([]);
  const [opcionesDe, setOpcionesDe] = useState<{ produccion?: ResumenDeProduccion; proyecto?: WeeProject } | null>(null);
  const [renombrando, setRenombrando] = useState<WeeProject | null>(null);
  const [nueva, setNueva] = useState(false);

  useEffect(() => {
    if (!user) return;
    let vivo = true;
    assetsService.listar(user.uid, { orden: 'recent' })
      .then((p) => { if (vivo) setCreaciones(p.items.slice(0, isDesktop ? 8 : 6)); })
      .catch(() => undefined);
    return () => { vivo = false; };
  }, [user, isDesktop]);

  const abrirProduccion = useCallback((id: string) => aCreator('Production', { productionId: id }), [aCreator]);

  const duplicar = useCallback(async (p: ResumenDeProduccion) => {
    setOpcionesDe(null);
    const r = await duplicarProduccion(p.productionId, t('filmmaker.duplicateTitle', { titulo: p.title }));
    if (!r.ok) { notify(t('filmmaker.saveError'), fraseDelFallo(r.fallo, t)); return; }
    notify(t('filmmaker.duplicatedDone'));
    void producciones.recargar();
  }, [producciones, t]);

  const archivar = useCallback(async (p: ResumenDeProduccion) => {
    setOpcionesDe(null);
    const r = await archivarProduccion(p.productionId, p.status !== 'archived');
    if (!r.ok) { notify(t('filmmaker.saveError'), fraseDelFallo(r.fallo, t)); return; }
    producciones.quitar(p.productionId);
    notify(p.status === 'archived' ? t('filmmaker.unarchivedDone') : t('filmmaker.archivedDone'));
  }, [producciones, t]);

  const eliminarProyecto = useCallback(async (p: WeeProject) => {
    setOpcionesDe(null);
    const ok = await confirmAction(t('workspace.projectDeleteTitle', { nombre: p.name }), t('workspace.projectDeleteText'), t('common.delete'), true, t);
    if (!ok) return;
    try {
      await projectsService.remove(p.id);
      void weeai.recargar();
    } catch {
      notify(t('workspace.projectActionFailed'));
    }
  }, [t, weeai]);

  const renombrar = useCallback(async (p: WeeProject, nombre: string) => {
    const limpio = nombre.trim();
    setRenombrando(null);
    if (!limpio || limpio === p.name) return;
    try {
      await projectsService.rename(p.id, limpio);
      void weeai.recargar();
    } catch {
      notify(t('workspace.projectActionFailed'));
    }
  }, [t, weeai]);

  if (!user) {
    return (
      <View style={[styles.vacio, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <Ionicons name="folder-open-outline" size={scale(28)} color={theme.colors.accent} />
        <Text style={[styles.vacioTitulo, { color: theme.colors.text }]}>{t('workspace.projectsSignInTitle')}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={[styles.botonDorado, { backgroundColor: theme.colors.accent }]} accessibilityRole="button" accessibilityLabel={t('workspace.signInToContinue')}>
          <Text style={styles.botonDoradoTexto}>{t('workspace.signInToContinue')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const columnas = isDesktop ? 3 : isMobile ? 1 : 2;
  const verProducciones = filtro !== 'weeai';
  const verWeeai = filtro !== 'producciones';

  const filtros: readonly { id: Filtro; clave: string }[] = [
    { id: 'todo', clave: 'workspace.projectsFilterAll' },
    { id: 'producciones', clave: 'workspace.projectsFilterProductions' },
    { id: 'weeai', clave: 'workspace.projectsFilterWeeAi' },
  ];

  return (
    <View style={styles.raiz}>
      <View style={styles.barra}>
        <View style={styles.filtros} accessibilityRole="tablist">
          {filtros.map((f) => (
            <TouchableOpacity
              key={f.id}
              onPress={() => setFiltro(f.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: filtro === f.id }}
              accessibilityLabel={t(f.clave)}
              style={[styles.filtro, { backgroundColor: filtro === f.id ? theme.colors.accent : theme.colors.card, borderColor: filtro === f.id ? theme.colors.accent : theme.colors.border }]}
            >
              <Text style={[styles.filtroTexto, { color: filtro === f.id ? '#1F2937' : theme.colors.text }]}>{t(f.clave)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity onPress={() => setNueva(true)} style={[styles.botonDorado, { backgroundColor: theme.colors.accent }]} accessibilityRole="button" accessibilityLabel={t('workspace.newProduction')}>
          <Ionicons name="add" size={scale(18)} color="#1F2937" />
          <Text style={styles.botonDoradoTexto}>{t('workspace.newProduction')}</Text>
        </TouchableOpacity>
      </View>

      {verProducciones && (
        <View style={styles.seccion}>
          <View style={styles.seccionCabecera}>
            <Text style={[styles.seccionTitulo, { color: theme.colors.text }]} accessibilityRole="header">
              {archivadas ? t('workspace.productionsArchivedTitle') : t('workspace.productionsTitle')}
            </Text>
            <TouchableOpacity onPress={() => setArchivadas((a) => !a)} accessibilityRole="button" accessibilityLabel={archivadas ? t('workspace.showActive') : t('workspace.showArchived')}>
              <Text style={[styles.enlace, { color: theme.colors.accent }]}>{archivadas ? t('workspace.showActive') : t('workspace.showArchived')}</Text>
            </TouchableOpacity>
          </View>
          {producciones.carga === 'cargando' && <ActivityIndicator color={theme.colors.accent} accessibilityLabel={t('common.loading')} />}
          {producciones.carga === 'error' && (
            <Text style={[styles.nota, { color: theme.colors.error }]}>{producciones.fallo ? fraseDelFallo(producciones.fallo, t) : t('workspace.projectActionFailed')}</Text>
          )}
          {producciones.carga === 'lista' && producciones.producciones.length === 0 && (
            <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{archivadas ? t('workspace.noArchivedProductions') : t('workspace.noProductions')}</Text>
          )}
          <View style={[styles.rejilla, columnas > 1 && styles.rejillaAncha]}>
            {producciones.producciones.map((p) => (
              <View key={p.productionId} style={[styles.tarjeta, columnas > 1 && { flexBasis: `${100 / columnas - 2}%` as const }, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <TouchableOpacity
                  onPress={() => abrirProduccion(p.productionId)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={t('workspace.openItem', { nombre: p.title })}
                  style={[styles.tarjetaCuerpo, isWeb && ({ cursor: 'pointer' } as object)]}
                >
                  <LinearGradient colors={['#1B2A4A', '#141821']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.portada}>
                    <Ionicons name="film-outline" size={scale(26)} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.portadaFormato}>{p.aspectRatio}</Text>
                  </LinearGradient>
                  <View style={styles.textos}>
                    <Text style={[styles.nombre, { color: theme.colors.text }]} numberOfLines={1}>{p.title}</Text>
                    <Text style={[styles.meta, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                      {formato.lista([t('workspace.kindProduction'), p.aspectRatio, ...(p.resolution ? [p.resolution === '4k' ? '4K' : p.resolution] : [])])}
                    </Text>
                    <Text style={[styles.meta, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                      {t('workspace.updatedAgo', { cuando: formato.tiempoRelativo(p.updatedAt) })}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setOpcionesDe({ produccion: p })} style={styles.mas} accessibilityRole="button" accessibilityLabel={t('workspace.moreOptionsFor', { nombre: p.title })}>
                  <Ionicons name="ellipsis-horizontal" size={scale(18)} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
          {producciones.hayMas && (
            <TouchableOpacity onPress={() => { void producciones.cargarMas(); }} style={[styles.masCargar, { borderColor: theme.colors.border }]} accessibilityRole="button" accessibilityLabel={t('workspace.loadMore')}>
              <Text style={[styles.enlace, { color: theme.colors.text }]}>{t('workspace.loadMore')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {verWeeai && (
        <View style={styles.seccion}>
          <Text style={[styles.seccionTitulo, { color: theme.colors.text }]} accessibilityRole="header">{t('workspace.weeAiProjectsTitle')}</Text>
          {weeai.carga === 'cargando' && <ActivityIndicator color={theme.colors.accent} accessibilityLabel={t('common.loading')} />}
          {weeai.carga === 'lista' && weeai.proyectos.length === 0 && (
            <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('workspace.noWeeAiProjects')}</Text>
          )}
          <View style={[styles.rejilla, columnas > 1 && styles.rejillaAncha]}>
            {weeai.proyectos.map((p) => {
              const cuando = enMs(p.updatedAt);
              return (
                <View key={p.id} style={[styles.tarjeta, columnas > 1 && { flexBasis: `${100 / columnas - 2}%` as const }, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Project', { id: p.id })}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={t('workspace.openItem', { nombre: p.name })}
                    style={[styles.tarjetaCuerpo, isWeb && ({ cursor: 'pointer' } as object)]}
                  >
                    <View style={[styles.portada, { backgroundColor: theme.colors.surface }]}>
                      <Text style={styles.emoji}>{p.emoji}</Text>
                    </View>
                    <View style={styles.textos}>
                      <Text style={[styles.nombre, { color: theme.colors.text }]} numberOfLines={1}>{p.name}</Text>
                      <Text style={[styles.meta, { color: theme.colors.textSecondary }]} numberOfLines={1}>{t('workspace.kindWeeAiProject')}</Text>
                      {cuando !== null && (
                        <Text style={[styles.meta, { color: theme.colors.textSecondary }]} numberOfLines={1}>{t('workspace.updatedAgo', { cuando: formato.tiempoRelativo(cuando) })}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setOpcionesDe({ proyecto: p })} style={styles.mas} accessibilityRole="button" accessibilityLabel={t('workspace.moreOptionsFor', { nombre: p.name })}>
                    <Ionicons name="ellipsis-horizontal" size={scale(18)} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {filtro === 'todo' && (
        <View style={styles.seccion}>
          <View style={styles.seccionCabecera}>
            <Text style={[styles.seccionTitulo, { color: theme.colors.text }]} accessibilityRole="header">{t('creaciones.title')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('MisCreaciones')} accessibilityRole="button" accessibilityLabel={t('workspace.seeAllCreations')}>
              <Text style={[styles.enlace, { color: theme.colors.accent }]}>{t('workspace.seeAllCreations')}</Text>
            </TouchableOpacity>
          </View>
          {creaciones.length === 0
            ? <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('workspace.noCreationsYet')}</Text>
            : <RejillaDeCreaciones items={creaciones} columnas={isDesktop ? 4 : isMobile ? 2 : 3} onOpen={() => navigation.navigate('MisCreaciones')} />}
        </View>
      )}

      <HojaInferior
        visible={!!opcionesDe}
        titulo={opcionesDe?.produccion?.title ?? opcionesDe?.proyecto?.name ?? ''}
        onCerrar={() => setOpcionesDe(null)}
      >
        {!!opcionesDe?.produccion && (
          <View style={styles.opciones}>
            <Opcion icono="open-outline" texto={t('workspace.actionOpen')} onPress={() => { const id = opcionesDe.produccion?.productionId; setOpcionesDe(null); if (id) abrirProduccion(id); }} />
            <Opcion icono="copy-outline" texto={t('workspace.actionDuplicate')} onPress={() => { if (opcionesDe.produccion) void duplicar(opcionesDe.produccion); }} />
            <Opcion
              icono={opcionesDe.produccion.status === 'archived' ? 'arrow-undo-outline' : 'archive-outline'}
              texto={opcionesDe.produccion.status === 'archived' ? t('workspace.actionUnarchive') : t('workspace.actionArchive')}
              onPress={() => { if (opcionesDe.produccion) void archivar(opcionesDe.produccion); }}
            />
            <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('workspace.productionRenameNote')}</Text>
          </View>
        )}
        {!!opcionesDe?.proyecto && (
          <View style={styles.opciones}>
            <Opcion icono="open-outline" texto={t('workspace.actionOpen')} onPress={() => { const id = opcionesDe.proyecto?.id; setOpcionesDe(null); if (id) navigation.navigate('Project', { id }); }} />
            <Opcion icono="create-outline" texto={t('workspace.actionRename')} onPress={() => { const p = opcionesDe.proyecto ?? null; setOpcionesDe(null); setRenombrando(p); }} />
            <Opcion icono="trash-outline" texto={t('common.delete')} peligro onPress={() => { if (opcionesDe.proyecto) void eliminarProyecto(opcionesDe.proyecto); }} />
          </View>
        )}
      </HojaInferior>

      <HojaInferior visible={!!renombrando} titulo={t('workspace.actionRename')} onCerrar={() => setRenombrando(null)}>
        {!!renombrando && (
          <CampoQueCrece
            etiqueta={t('workspace.projectName')}
            valor={renombrando.name}
            maximo={60}
            etiquetaGuardar={t('common.save')}
            onGuardar={(texto) => { void renombrar(renombrando, texto); }}
          />
        )}
      </HojaInferior>

      <NuevaProduccion visible={nueva} onCerrar={() => setNueva(false)} onIdea={(idea) => { setNueva(false); aCreator('Production', { intencion: idea }); }} />
    </View>
  );
};

/**
 * UNA PRODUCCIÓN NUEVA EMPIEZA POR UNA IDEA: se escribe aquí y Filmmaker la
 * convierte en producción con su formato, igual que desde Weë Studio. Esto no
 * crea nada: lleva la idea a Filmmaker, que es quien crea.
 */
const NuevaProduccion: React.FC<{ visible: boolean; onCerrar: () => void; onIdea: (idea: string) => void }> = ({ visible, onCerrar, onIdea }) => {
  const t = useT();
  return (
    <HojaInferior visible={visible} titulo={t('workspace.newProduction')} subtitulo={t('workspace.newProductionText')} onCerrar={onCerrar}>
      <CampoQueCrece
        etiqueta={t('workspace.newProductionIdea')}
        valor=""
        placeholder={t('workspace.newProductionPlaceholder')}
        maximo={4000}
        etiquetaGuardar={t('workspace.newProductionContinue')}
        onGuardar={(texto) => { if (texto.trim()) onIdea(texto.trim()); }}
      />
    </HojaInferior>
  );
};

const styles = StyleSheet.create({
  raiz: { gap: SPACING.xxl },
  barra: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.md, flexWrap: 'wrap' },
  filtros: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
  filtro: { minHeight: 36, paddingHorizontal: SPACING.lg, borderRadius: BORDER_RADIUS.full, borderWidth: 1, justifyContent: 'center' },
  filtroTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold as any },
  botonDorado: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, minHeight: 40, paddingHorizontal: SPACING.lg, borderRadius: BORDER_RADIUS.md },
  botonDoradoTexto: { color: '#1F2937', fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold as any },
  seccion: { gap: SPACING.md },
  seccionCabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.md },
  seccionTitulo: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold as any },
  enlace: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold as any },
  nota: { fontSize: FONT_SIZE.sm, lineHeight: FONT_SIZE.sm * 1.45 },
  rejilla: { gap: SPACING.sm },
  rejillaAncha: { flexDirection: 'row', flexWrap: 'wrap' },
  tarjeta: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: BORDER_RADIUS.md, padding: SPACING.sm, gap: SPACING.xs, flexGrow: 1 },
  tarjetaCuerpo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.md, minWidth: 0 },
  portada: { width: scale(72), height: scale(56), borderRadius: BORDER_RADIUS.sm, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  portadaFormato: { position: 'absolute', bottom: 3, right: 5, color: '#FFFFFF', fontSize: scale(9), fontWeight: FONT_WEIGHT.bold as any },
  emoji: { fontSize: scale(24) },
  textos: { flex: 1, gap: 2, minWidth: 0 },
  nombre: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold as any },
  meta: { fontSize: FONT_SIZE.xs },
  mas: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  masCargar: { alignSelf: 'center', borderWidth: 1, borderRadius: BORDER_RADIUS.full, paddingHorizontal: SPACING.lg, minHeight: 40, justifyContent: 'center' },
  vacio: { alignItems: 'center', gap: SPACING.md, borderWidth: 1, borderRadius: BORDER_RADIUS.lg, padding: SPACING.xxl },
  vacioTitulo: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold as any, textAlign: 'center' },
  opciones: { gap: SPACING.sm },
  opcion: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, minHeight: 48, paddingHorizontal: SPACING.lg, borderRadius: BORDER_RADIUS.md, borderWidth: 1 },
  opcionTexto: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.medium as any },
});

export default ListaDeProyectos;
