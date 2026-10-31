import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useIdioma } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useResponsive } from '../hooks/useResponsive';
import { PaginaDeCajas } from '../components/creator/CajaQueCrece';
import CajaDePrompt from '../components/creator/CajaDePrompt';
import { creatorService, CreatorJob, claveDelEstado } from '../services/creatorService';
import { textoDeObjetivo } from '../i18n/servidor';
import { matchExperiences, WEE_EXPERIENCES } from '../constants/weeExperiences';
import { HERRAMIENTAS_PROFESIONALES, TRABAJO_DE_LA_CUENTA } from '../constants/espacioProfesional';
import { SPACING } from '../constants/design';

const RECIENTES = 5;

interface Celda {
  id: string;
  nombre: string;
  descripcion: string;
  icono: string;
  alPulsar: () => void;
}

/**
 * EL INICIO DE WEË VERSIÓN CREATOR: DONDE SE EMPIEZA A TRABAJAR.
 *
 * Tres cosas y nada más: la caja donde se pide (la misma de toda Weë AI, porque
 * detrás está el mismo Weë Brain), las herramientas y lo último que se hizo. Las
 * nueve celdas forman una sola pieza dividida por líneas finas: es una mesa de
 * trabajo, no un catálogo de tarjetas.
 */
const ProInicioScreen: React.FC = () => {
  const { theme } = useTheme();
  const { t, locale } = useIdioma();
  const { user } = useAuth();
  const { realProfile } = useUserProfile();
  const { isDesktop, isTablet } = useResponsive();
  const navigation = useNavigation<any>();
  const [pedido, setPedido] = useState('');
  const [trabajos, setTrabajos] = useState<CreatorJob[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!user) {
        setTrabajos([]);
        return;
      }
      let cancelado = false;
      creatorService
        .getMyJobs(user.uid, RECIENTES)
        .then((lista) => {
          if (!cancelado) setTrabajos(lista);
        })
        .catch((error) => console.warn('No se pudo leer lo reciente:', error));
      return () => {
        cancelado = true;
      };
    }, [user])
  );

  const empezar = () => {
    const objetivo = pedido.trim();
    if (!objetivo) return;
    if (!user) {
      navigation.navigate('Login');
      return;
    }
    /* La persona dice qué quiere; Weë elige dónde. Si no se reconoce, lo atiende Weë Brain. */
    const experiencia = matchExperiences(objetivo, locale)[0]?.id ?? 'brain';
    navigation.navigate('CreatorFlow', { experienceId: experiencia, goal: objetivo });
  };

  const descripcionDe = (id: string): string => {
    const exp = WEE_EXPERIENCES.find((e) => e.id === id);
    return exp ? t(exp.claveDescripcion) : '';
  };

  const celdas: Celda[] = [
    ...HERRAMIENTAS_PROFESIONALES.map((h) => ({
      id: h.id,
      nombre: h.nombre,
      descripcion: descripcionDe(h.id),
      icono: h.icono,
      alPulsar: () => navigation.navigate('Specialist', { id: h.id }),
    })),
    ...TRABAJO_DE_LA_CUENTA.map((e) => ({
      id: e.id,
      nombre: t(e.clave),
      descripcion: t(e.id === 'projects' ? 'profesional.projectsHint' : 'profesional.creationsHint'),
      icono: e.icono,
      alPulsar: () => (user ? navigation.navigate(e.ruta) : navigation.navigate('Login')),
    })),
  ];

  const anchoDeCelda = isDesktop ? '33.3333%' : isTablet ? '50%' : '100%';
  const nombre = realProfile?.displayName?.trim();

  return (
    <PaginaDeCajas
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[styles.pagina, isDesktop && styles.paginaAncha]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.columna}>
        <View style={styles.saludo}>
          <Text accessibilityRole="header" style={[styles.titulo, !isDesktop && styles.tituloMovil, { color: theme.colors.text }]}>
            {user && nombre ? t('profesional.greeting', { nombre }) : t('profesional.greetingGuest')}
          </Text>
          <Text style={[styles.subtitulo, { color: theme.colors.textSecondary }]}>{t('profesional.subtitle')}</Text>
        </View>

        <CajaDePrompt
          valor={pedido}
          onCambiar={setPedido}
          onEnviar={empezar}
          etiquetaEnviar={t('profesional.send')}
          placeholder={t('profesional.promptPlaceholder')}
          enviarConIntro
        />

        <View style={styles.bloque}>
          <Text style={[styles.rotulo, { color: theme.colors.textSecondary }]}>{t('profesional.tools')}</Text>
          <View style={[styles.mesa, { borderColor: theme.colors.border }]}>
            <View style={styles.mesaDentro}>
              {celdas.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={c.alPulsar}
                  accessibilityRole="button"
                  accessibilityLabel={c.nombre}
                  style={(estado: any) => [
                    styles.celda,
                    { width: anchoDeCelda, borderColor: theme.colors.border },
                    (estado.hovered || estado.pressed) && { backgroundColor: theme.colors.surface },
                  ] as any}
                >
                  <View style={[styles.icono, { backgroundColor: theme.colors.glow }]}>
                    <Ionicons name={c.icono as any} size={18} color={theme.colors.accentDark} />
                  </View>
                  <View style={styles.celdaTextos}>
                    <Text style={[styles.celdaNombre, { color: theme.colors.text }]} numberOfLines={1}>{c.nombre}</Text>
                    <Text style={[styles.celdaDescripcion, { color: theme.colors.textSecondary }]}>{c.descripcion}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.bloque}>
          <Text style={[styles.rotulo, { color: theme.colors.textSecondary }]}>{t('profesional.recentTitle')}</Text>
          {trabajos.length > 0 ? (
            <View style={[styles.lista, { borderColor: theme.colors.border }]}>
              {trabajos.map((job, i) => (
                <TouchableOpacity
                  key={job.id}
                  onPress={() => navigation.navigate('CreatorFlow', { experienceId: job.experienceId, jobId: job.id })}
                  activeOpacity={0.7}
                  style={[styles.fila, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border }]}
                  accessibilityRole="button"
                >
                  <Text style={[styles.filaObjetivo, { color: theme.colors.text }]} numberOfLines={1}>
                    {textoDeObjetivo(t, job.experienceId, job.goal)}
                  </Text>
                  <Text style={[styles.filaEstado, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                    {t(claveDelEstado[job.status])}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={[styles.vacio, { borderColor: theme.colors.border }]}>
              <Text style={[styles.vacioTexto, { color: theme.colors.textSecondary }]}>
                {t(user ? 'profesional.recentEmpty' : 'profesional.recentGuest')}
              </Text>
            </View>
          )}
        </View>
      </View>
    </PaginaDeCajas>
  );
};

const styles = StyleSheet.create({
  pagina: { flexGrow: 1, paddingHorizontal: SPACING.lg, paddingTop: 28, paddingBottom: 48, alignItems: 'center' },
  paginaAncha: { paddingHorizontal: 40, paddingTop: 48 },
  columna: { width: '100%', maxWidth: 1040, gap: 28 },
  saludo: { gap: 6 },
  titulo: { fontSize: 32, lineHeight: 40, fontWeight: '600', letterSpacing: -0.6 },
  tituloMovil: { fontSize: 25, lineHeight: 32, letterSpacing: -0.4 },
  subtitulo: { fontSize: 15, lineHeight: 22 },
  bloque: { gap: 12 },
  rotulo: { fontSize: 12, fontWeight: '600', letterSpacing: 0.2 },
  mesa: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, overflow: 'hidden' },
  /* El sobrante esconde las líneas del borde: dentro solo quedan las divisiones. */
  mesaDentro: { flexDirection: 'row', flexWrap: 'wrap', marginRight: -1, marginBottom: -1 },
  celda: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 18, minHeight: 88,
    borderRightWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  icono: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  celdaTextos: { flex: 1, minWidth: 0, gap: 3 },
  celdaNombre: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  celdaDescripcion: { fontSize: 13, lineHeight: 18 },
  lista: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, overflow: 'hidden' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingHorizontal: 16 },
  filaObjetivo: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: '500' },
  filaEstado: { fontSize: 13, flexShrink: 0, maxWidth: '40%' },
  vacio: { borderWidth: StyleSheet.hairlineWidth, borderStyle: 'dashed', borderRadius: 14, padding: 20 },
  vacioTexto: { fontSize: 14, lineHeight: 20 },
});

export default ProInicioScreen;
