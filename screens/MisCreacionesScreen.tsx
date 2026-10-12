import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme, enTemaClaro } from '../contexts/ThemeContext';
import { useT } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { listarCreacionesFinales, reabrirParaEditar, CreacionFinal } from '../services/cicloDeTrabajo';
import { projectsService } from '../services/projectsService';
import CreatorShell from '../components/creator/CreatorShell';
import { SectionTitle, Chip } from '../components/creator/ui';
import { RejillaDeCreacionesFinales, CreacionVisible } from '../components/creator/RejillaDeCreaciones';
import { esNoDisponible } from '../components/creator/conservar';
import { notify } from '../utils/notify';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

/**
 * MIS CREACIONES — los resultados terminados que la persona DECIDIÓ conservar (R9).
 *
 * ── Qué es, y qué ya no es ─────────────────────────────────────────────────
 *
 * Hasta R9 esta pantalla listaba cada material que salía de una generación
 * (la colección `assets`): todo lo hecho, quisiera la persona guardarlo o no,
 * y lo mismo que se veía desde cada proyecto. Ahora enseña SOLO lo que se
 * guardó con «Guardar en Mis creaciones» (contrato `services/cicloDeTrabajo.ts`
 * · `listarCreacionesFinales`). El trabajo a medias está en «Mis proyectos».
 * Los materiales anteriores no se marcan como creaciones por inferencia.
 *
 * ── De la cuenta, y de nadie más ───────────────────────────────────────────
 *
 * Se lee por `user.uid`, no por el perfil activo: el Perfil Real y el Perfil
 * Weë ven lo mismo. Y se ve en claro con las dos caras, como todo Weë AI.
 *
 * ── Estados que no se confunden ────────────────────────────────────────────
 *
 * Cargando, fallo (con reintentar), vacío y «todavía no disponible» (el
 * contrato aún no lo ofrece) son cuatro pantallas distintas. Ninguna inventa
 * una creación. Cada página trae el cursor de la siguiente.
 *
 * ── Qué enseña cada tarjeta ────────────────────────────────────────────────
 *
 * Vista previa (solo si existe), tipo, herramienta, proyecto de origen (su
 * nombre, si el proyecto sigue ahí), cuándo se guardó y DÓNDE está el archivo
 * —en este dispositivo, en Weë Cloud o en el almacenamiento anterior—, que es
 * un dato y no un estado. Y una sola acción, que hace lo que dice: «Volver a
 * editar», que abre su proyecto.
 */

type Estado =
  | { fase: 'cargando' }
  | { fase: 'error' }
  | { fase: 'pendiente' }
  | { fase: 'lista'; items: CreacionVisible[]; siguiente: unknown; cargandoMas: boolean };

type Filtro = 'all' | 'image' | 'video' | 'audio' | 'document' | 'model3d' | 'world';

const FILTROS: { id: Filtro; clave: string }[] = [
  { id: 'all', clave: 'creaciones.filterAll' },
  { id: 'image', clave: 'creaciones.filterImages' },
  { id: 'video', clave: 'creaciones.filterVideos' },
  { id: 'audio', clave: 'creaciones.filterAudio' },
  { id: 'document', clave: 'creaciones.filterDocuments' },
  { id: 'model3d', clave: 'creaciones.filterModel3d' },
  { id: 'world', clave: 'creaciones.filterWorlds' },
];

/** Lo que pinta la tarjeta: la creación del contrato, con el nombre de su proyecto ya resuelto (lo escribió la persona). */
export const visibleDeCreacion = (c: CreacionFinal, nombres: Map<string, string>): CreacionVisible => ({
  id: c.id,
  nombre: c.nombre,
  tipo: c.tipo,
  herramienta: c.herramienta,
  finalizadaEn: c.finalizadaEn,
  ubicacion: c.ubicacion,
  proyectoOrigen: c.proyectoOrigenId ? nombres.get(c.proyectoOrigenId) ?? null : null,
  /* El contrato todavía no trae miniatura: sin ella se ve el icono del tipo, no una imagen inventada. */
  miniatura: null,
});

const MisCreacionesScreen: React.FC = () => {
  const { theme } = useTheme();
  const t = useT();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const { isDesktop, isTablet } = useResponsive();

  const [filtro, setFiltro] = useState<Filtro>('all');
  const [estado, setEstado] = useState<Estado>({ fase: 'cargando' });
  const [abriendo, setAbriendo] = useState<string | null>(null);
  /* Una petición que llega tarde no pisa a la que la persona pidió después. */
  const peticion = useRef(0);
  const abriendoAhora = useRef<string | null>(null);

  /* Los nombres de los proyectos de la cuenta, para decir de cuál viene cada creación. Si no se pueden leer, no se dice. */
  const nombresDeProyectos = async (uid: string): Promise<Map<string, string>> => {
    try {
      return new Map((await projectsService.list(uid)).map((p) => [p.id, p.name] as [string, string]));
    } catch {
      return new Map();
    }
  };

  const cargar = useCallback(async () => {
    if (!user) {
      setEstado({ fase: 'lista', items: [], siguiente: undefined, cargandoMas: false });
      return;
    }
    const mia = ++peticion.current;
    setEstado({ fase: 'cargando' });
    try {
      const [pagina, nombres] = await Promise.all([listarCreacionesFinales(user.uid), nombresDeProyectos(user.uid)]);
      if (mia !== peticion.current) return;
      setEstado({ fase: 'lista', items: pagina.creaciones.map((c) => visibleDeCreacion(c, nombres)), siguiente: pagina.siguiente, cargandoMas: false });
    } catch (error) {
      if (mia !== peticion.current) return;
      if (esNoDisponible(error)) {
        setEstado({ fase: 'pendiente' });
        return;
      }
      console.warn('Mis creaciones: no se pudo cargar', error);
      setEstado({ fase: 'error' });
    }
  }, [user]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const cargarMas = async () => {
    if (!user || estado.fase !== 'lista' || !estado.siguiente || estado.cargandoMas) return;
    const anterior = estado;
    setEstado({ ...anterior, cargandoMas: true });
    try {
      const [pagina, nombres] = await Promise.all([listarCreacionesFinales(user.uid, anterior.siguiente), nombresDeProyectos(user.uid)]);
      setEstado({ fase: 'lista', items: [...anterior.items, ...pagina.creaciones.map((c) => visibleDeCreacion(c, nombres))], siguiente: pagina.siguiente, cargandoMas: false });
    } catch (error) {
      console.warn('Mis creaciones: no se pudo cargar más', error);
      setEstado({ ...anterior, cargandoMas: false });
      notify(t('creaciones.loadFailed'));
    }
  };

  /* «Volver a editar»: el contrato abre el proyecto de origen (o uno vinculado) y la persona sigue ahí. */
  const volverAEditar = async (creacion: CreacionVisible) => {
    if (abriendoAhora.current) return;
    abriendoAhora.current = creacion.id;
    setAbriendo(creacion.id);
    try {
      const { proyectoId } = await reabrirParaEditar(creacion.id);
      navigation.navigate('Project', { id: proyectoId });
    } catch (error) {
      if (esNoDisponible(error)) notify(t('creaciones.editAgainPending'));
      else {
        console.warn('Mis creaciones: no se pudo reabrir', error);
        notify(t('creaciones.editAgainFailed'));
      }
    } finally {
      abriendoAhora.current = null;
      setAbriendo(null);
    }
  };

  const columnas: 2 | 3 | 4 = isDesktop ? 4 : isTablet ? 3 : 2;
  /* El filtro por tipo mira lo ya cargado; «Cargar más» sigue trayendo las páginas que faltan. */
  const visibles = estado.fase === 'lista' ? estado.items.filter((c) => filtro === 'all' || c.tipo === filtro) : [];

  return (
    <CreatorShell activeId="creations" overline="🤖 Weë AI" title={`🖼️ ${t('creaciones.title')}`} breadcrumb="Weë AI">
      <View style={[styles.intro, { backgroundColor: theme.colors.accent + '1A', borderColor: theme.colors.accent }]}>
        <Text style={[styles.introText, { color: theme.colors.text }]}>{t('creaciones.introKept')}</Text>
      </View>

      <View style={styles.section}>
        <SectionTitle title={estado.fase === 'lista' ? t('creaciones.count', { contador: estado.items.length }) : t('creaciones.title')} />

        {estado.fase === 'lista' && estado.items.length > 0 && (
          <View style={styles.filtros} accessibilityRole="tablist" accessibilityLabel={t('creaciones.filterLabel')}>
            {FILTROS.map((f) => (
              <Chip key={f.id} label={t(f.clave)} active={filtro === f.id} onPress={() => setFiltro(f.id)} />
            ))}
          </View>
        )}

        {estado.fase === 'cargando' ? (
          <View style={styles.centro}>
            <ActivityIndicator color={theme.colors.accent} />
            <Text style={[styles.centroText, { color: theme.colors.textSecondary }]}>{t('creaciones.loading')}</Text>
          </View>
        ) : estado.fase === 'error' ? (
          <View style={[styles.box, { backgroundColor: theme.colors.card, borderColor: theme.colors.error }]}>
            <Text style={[styles.boxTitle, { color: theme.colors.text }]}>{t('creaciones.loadFailed')}</Text>
            <TouchableOpacity onPress={cargar} style={[styles.button, { backgroundColor: theme.colors.accent }]} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={t('creaciones.retry')}>
              <Text style={styles.buttonText}>{t('creaciones.retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : estado.fase === 'pendiente' ? (
          <View style={[styles.box, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.boxText, { color: theme.colors.text }]}>{t('creaciones.listPending')}</Text>
            <TouchableOpacity onPress={cargar} style={[styles.button, { backgroundColor: theme.colors.accent }]} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={t('creaciones.retry')}>
              <Text style={styles.buttonText}>{t('creaciones.retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : estado.items.length === 0 ? (
          <View style={[styles.box, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={styles.emptyEmoji}>🖼️</Text>
            <Text style={[styles.boxTitle, { color: theme.colors.text }]}>{t('creaciones.emptyTitle')}</Text>
            <Text style={[styles.boxText, { color: theme.colors.textSecondary }]}>{t('creaciones.emptyKeepText', { accion: t('creaciones.keep') })}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('WeeCreator')} style={[styles.button, { backgroundColor: theme.colors.accent }]} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={t('creaciones.emptyAction')}>
              <Text style={styles.buttonText}>{t('creaciones.emptyAction')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {visibles.length === 0 ? (
              <View style={[styles.box, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Text style={[styles.boxTitle, { color: theme.colors.text }]}>{t('creaciones.emptyFiltered')}</Text>
              </View>
            ) : (
              <RejillaDeCreacionesFinales items={visibles} columnas={columnas} onEditAgain={volverAEditar} abriendo={abriendo} />
            )}
            {!!estado.siguiente && (
              <TouchableOpacity
                onPress={cargarMas}
                disabled={estado.cargandoMas}
                style={[styles.more, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={t('creaciones.loadMore')}
              >
                {estado.cargandoMas ? (
                  <ActivityIndicator color={theme.colors.accent} />
                ) : (
                  <Text style={[styles.moreText, { color: theme.colors.text }]}>{t('creaciones.loadMore')}</Text>
                )}
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </CreatorShell>
  );
};

const styles = StyleSheet.create({
  intro: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  introText: {
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(20),
  },
  section: {
    gap: SPACING.md,
  },
  filtros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  centro: {
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xl,
  },
  centroText: {
    fontSize: FONT_SIZE.sm,
  },
  box: {
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
  },
  emptyEmoji: {
    fontSize: scale(40),
  },
  boxTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: 'center',
  },
  boxText: {
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
    lineHeight: scale(20),
  },
  button: {
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.lg,
    minHeight: scale(44),
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#1F2937',
    fontWeight: FONT_WEIGHT.semibold,
    fontSize: FONT_SIZE.sm,
  },
  more: {
    minHeight: scale(44),
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  moreText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
});

/* Weë AI es de la cuenta, no de un perfil: el taller se ve claro con las dos caras. */
export default enTemaClaro(MisCreacionesScreen);
