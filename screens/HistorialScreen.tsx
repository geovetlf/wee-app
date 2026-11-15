import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import IconoDireccional from '../components/IconoDireccional';
import { IconoWee } from '../components/icons/IconoWee';
import { RellenoDeMarca } from '../components/GradienteDeMarca';
import { useTheme } from '../contexts/ThemeContext';
import { useIdioma } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useDireccion } from '../hooks/useDireccion';
import { creatorService, CreatorJob, claveDelEstado } from '../services/creatorService';
import { textoDeObjetivo } from '../i18n/servidor';
import { getExperienceById, experienceLabel } from '../constants/weeExperiences';
import { nombreVisibleDeExperiencia } from '../constants/myWeesDestinos';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

/**
 * Cuántos trabajos se piden. Es la MISMA consulta que hace la portada de WeëAI
 * para «Mis creaciones» (`creatorService.getMyJobs`: los trabajos de la cuenta,
 * del más reciente al más antiguo), con un tope mayor. El servicio no pagina,
 * así que el historial enseña los últimos y lo dice.
 */
const TOPE_DEL_HISTORIAL = 50;

/** La fecha de un trabajo, venga como venga del servidor (Timestamp de Firestore, milisegundos o nada). */
const fechaDe = (valor: unknown): number | null => {
  const v = valor as { toMillis?: () => number; seconds?: number } | number | null | undefined;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (v && typeof v === 'object') {
    if (typeof v.toMillis === 'function') return v.toMillis();
    if (typeof v.seconds === 'number') return v.seconds * 1000;
  }
  return null;
};

/**
 * HISTORIAL — la cronología de los trabajos de WeëAI.
 *
 * Solo lo que la app ya lee: los trabajos del flujo guiado de la cuenta
 * (`creatorJobs`), con el estado REAL que tiene cada uno en el servidor. Tocar
 * uno lo abre donde se creó (`CreatorFlow` con su `jobId`), que es donde está
 * su resultado si lo tiene —el mismo camino que usa la portada de WeëAI—.
 *
 * Lo que NO hay aquí, a propósito: movimientos de Credits (eso es la billetera),
 * resultados o estados inventados, ni nada que no sea de la cuenta. El historial
 * es de la cuenta, igual desde el Perfil Real que desde el Perfil Weë, porque
 * los trabajos son de la cuenta.
 */
const HistorialScreen: React.FC = () => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const dir = useDireccion();
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const [trabajos, setTrabajos] = useState<CreatorJob[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [fallo, setFallo] = useState(false);

  const cargar = useCallback(
    async (silencioso = false) => {
      if (!user) {
        setTrabajos([]);
        setCargando(false);
        return;
      }
      if (!silencioso) setCargando(true);
      try {
        setTrabajos(await creatorService.getMyJobs(user.uid, TOPE_DEL_HISTORIAL));
        setFallo(false);
      } catch (error) {
        console.warn('No se pudo cargar el historial:', error);
        setFallo(true);
      } finally {
        setCargando(false);
        setRefrescando(false);
      }
    },
    [user],
  );

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  const abrir = (job: CreatorJob) => navigation.navigate('CreatorFlow', { experienceId: job.experienceId, jobId: job.id });

  const fila = ({ item: job }: { item: CreatorJob }) => {
    const exp = getExperienceById(job.experienceId);
    /* El nombre con el que la experiencia se presenta hoy; las seis y Weë Brain, con su grafía visible. */
    const experiencia = exp ? nombreVisibleDeExperiencia(exp.id, experienceLabel(exp, t)) : 'Weë';
    const cuando = fechaDe(job.createdAt);
    const estado = t(claveDelEstado[job.status]) ?? job.status;
    const objetivo = textoDeObjetivo(t, job.experienceId, job.goal);
    return (
      <TouchableOpacity
        style={[styles.fila, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
        onPress={() => abrir(job)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={formato.lista([objetivo, experiencia, estado])}
      >
        <View style={[styles.filaIcono, { backgroundColor: theme.colors.interactionSoft }]}>
          <IconoWee name={exp?.icono ?? 'reloj'} size={scale(20)} color={theme.colors.interaction} />
        </View>
        <View style={styles.filaTextos}>
          <Text style={[styles.filaObjetivo, dir.texto, { color: theme.colors.text }]} numberOfLines={2}>{objetivo}</Text>
          <Text style={[styles.filaDetalle, dir.texto, { color: theme.colors.textSecondary }]} numberOfLines={2}>
            {experiencia} · {estado}{job.demo ? ` · ${t('weeai.demo')}` : ''}
          </Text>
          {cuando !== null && (
            <Text style={[styles.filaFecha, dir.texto, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {formato.fecha(cuando, { day: 'numeric', month: 'short', year: 'numeric' })} · {formato.hora(cuando, { hour: 'numeric', minute: '2-digit' })}
            </Text>
          )}
        </View>
        <IconoDireccional name="chevron-forward" size={scale(18)} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    );
  };

  const vacio = () => {
    if (cargando) return null;
    /* Tres vacíos distintos, y cada uno dice el suyo: sin sesión, no se pudo leer, o todavía no hay nada. */
    if (!user) {
      return (
        <View style={styles.vacio}>
          <IconoWee name="reloj" size={scale(40)} color={theme.colors.interaction} />
          <Text style={[styles.vacioTitulo, dir.texto, { color: theme.colors.text }]}>{t('auth.signInToContinue')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={[styles.boton, { backgroundColor: theme.colors.accent }]} activeOpacity={0.85} accessibilityRole="button">
            <RellenoDeMarca radio={BORDER_RADIUS.full} />
            <Text style={[styles.botonTexto, { color: theme.colors.onPrimary }]}>{t('menu.signIn')}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (fallo) {
      return (
        <View style={styles.vacio} accessibilityRole="alert">
          <IconoWee name="reloj" size={scale(40)} color={theme.colors.textSecondary} />
          <Text style={[styles.vacioTitulo, dir.texto, { color: theme.colors.text }]}>{t('common.somethingWentWrong')}</Text>
          <TouchableOpacity onPress={() => cargar()} style={[styles.boton, { backgroundColor: theme.colors.text }]} activeOpacity={0.85} accessibilityRole="button">
            <Text style={[styles.botonTexto, { color: theme.colors.background }]}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.vacio}>
        <View style={[styles.vacioIcono, { backgroundColor: theme.colors.interactionSoft }]}>
          <IconoWee name="reloj" size={scale(36)} color={theme.colors.interaction} />
        </View>
        <Text style={[styles.vacioTexto, dir.texto, { color: theme.colors.textSecondary }]}>{t('weeai.historyEmptyHint')}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('WeeCreator')} style={[styles.boton, { backgroundColor: theme.colors.accent }]} activeOpacity={0.85} accessibilityRole="button">
          <RellenoDeMarca radio={BORDER_RADIUS.full} />
          <Text style={[styles.botonTexto, { color: theme.colors.onPrimary }]}>{t('nav.goToWeeAi')}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.contenedor, dir.contenedor, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.volver} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <IconoDireccional name="arrow-back" size={scale(23)} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.titulos}>
          <Text style={[styles.titulo, dir.texto, { color: theme.colors.text }]} numberOfLines={1} accessibilityRole="header">{t('menu.history')}</Text>
          {/* De qué es este historial: de WeëAI. Es marca. */}
          <Text style={[styles.subtitulo, { color: theme.colors.textSecondary }]} numberOfLines={1}>{t('nav.weeAi')}</Text>
        </View>
      </View>

      {cargando ? (
        <View style={styles.vacio} accessibilityRole="progressbar" accessibilityLabel={t('common.loading')}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      ) : (
        <FlatList
          data={trabajos}
          keyExtractor={(job) => job.id}
          renderItem={fila}
          ListEmptyComponent={vacio}
          /* El pie dice hasta dónde llega la lista cuando llega al tope: no se hace pasar por el historial entero. */
          ListFooterComponent={trabajos.length >= TOPE_DEL_HISTORIAL ? (
            <Text style={[styles.pie, dir.texto, { color: theme.colors.textSecondary }]}>{t('weeai.historyLimitNote', { cantidad: formato.numero(TOPE_DEL_HISTORIAL) })}</Text>
          ) : null}
          contentContainerStyle={[styles.lista, trabajos.length === 0 && styles.listaVacia]}
          refreshControl={
            <RefreshControl
              refreshing={refrescando}
              onRefresh={() => {
                setRefrescando(true);
                void cargar(true);
              }}
              tintColor={theme.colors.accent}
              colors={[theme.colors.accent]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  contenedor: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  volver: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  titulos: { flex: 1, minWidth: 0 },
  titulo: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold },
  subtitulo: { fontSize: FONT_SIZE.xs },
  lista: { padding: SPACING.lg, gap: SPACING.sm, paddingBottom: scale(120), width: '100%', maxWidth: scale(720), alignSelf: 'center' },
  listaVacia: { flexGrow: 1 },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    minHeight: scale(64),
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  filaIcono: { width: scale(40), height: scale(40), borderRadius: scale(12), alignItems: 'center', justifyContent: 'center' },
  filaTextos: { flex: 1, minWidth: 0, gap: scale(2) },
  filaObjetivo: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.medium },
  filaDetalle: { fontSize: FONT_SIZE.sm },
  filaFecha: { fontSize: FONT_SIZE.xs },
  vacio: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xxl, gap: SPACING.md },
  vacioIcono: { width: scale(76), height: scale(76), borderRadius: scale(38), alignItems: 'center', justifyContent: 'center' },
  vacioTitulo: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, textAlign: 'center' },
  vacioTexto: { fontSize: FONT_SIZE.base, lineHeight: scale(22), textAlign: 'center', maxWidth: scale(360) },
  boton: {
    minHeight: scale(44),
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginTop: SPACING.xs,
  },
  botonTexto: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold },
  pie: { fontSize: FONT_SIZE.xs, textAlign: 'center', marginTop: SPACING.md },
});

export default HistorialScreen;
