import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useT } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { useCaminosDeCreacion } from '../hooks/useCaminosDeCreacion';
import PaginaDeCreator from '../components/workspace/PaginaDeCreator';
import CajaDeCrear from '../components/crear/CajaDeCrear';
import ProyectosRecientes from '../components/proyectos/ProyectosRecientes';
import PortadaDeIdea from '../components/inspira/PortadaDeIdea';
import RejillaDeCreaciones from '../components/creator/RejillaDeCreaciones';
import { nombreDeEntrada } from '../components/workspace/BarraLateralDeCreator';
import { HERRAMIENTAS_DE_CREATOR, EntradaDeCreator } from '../constants/creatorWorkspace';
import { RECETAS } from '../constants/inspiracion';
import { assetsService, AssetDoc } from '../services/assetsService';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

const isWeb = Platform.OS === 'web';

/**
 * EL INICIO DE WEË CREATOR.
 *
 * Lo primero es crear: la caja «¿Qué quieres crear hoy?». Debajo, Filmmaker en
 * grande —es el taller profesional por excelencia— y el resto de herramientas;
 * lo último en lo que trabajaste para seguir sin buscarlo; unas ideas para
 * empezar; y tus creaciones recientes. Nada de muros, Weëls ni comunidad: eso
 * está en Weë, a un toque, arriba a la izquierda.
 */
const CreatorInicioScreen: React.FC = () => {
  const { theme } = useTheme();
  const t = useT();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const { isDesktop, isMobile } = useResponsive();
  const { conSesion, usarReceta } = useCaminosDeCreacion();
  const [creaciones, setCreaciones] = useState<AssetDoc[]>([]);

  useEffect(() => {
    if (!user) return;
    let vivo = true;
    assetsService.listar(user.uid, { orden: 'recent' })
      .then((p) => { if (vivo) setCreaciones(p.items.slice(0, isDesktop ? 8 : 4)); })
      .catch(() => undefined);
    return () => { vivo = false; };
  }, [user, isDesktop]);

  const abrir = (e: EntradaDeCreator) => {
    if (e.ruta === 'Production') { conSesion(() => navigation.navigate('Production')); return; }
    navigation.navigate(e.ruta, e.ruta === 'Specialist' ? { id: e.experienceId } : undefined);
  };

  const [filmmaker, ...resto] = HERRAMIENTAS_DE_CREATOR;
  const ideas = RECETAS.filter((r) => r.popular).slice(0, isMobile ? 2 : 4);
  const porFila = isDesktop ? 6 : isMobile ? 3 : 4;

  return (
    <PaginaDeCreator titulo={t('workspace.homeTitle')} subtitulo={t('workspace.homeSubtitle')}>
      <CajaDeCrear />

      <View style={[styles.herramientas, isDesktop && styles.herramientasAncho]}>
        <TouchableOpacity
          onPress={() => abrir(filmmaker)}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel={nombreDeEntrada(filmmaker, t)}
          style={[isDesktop ? styles.filmmakerAncho : null, isWeb && ({ cursor: 'pointer' } as object)]}
        >
          <LinearGradient colors={['#1B2A4A', '#0B0C10']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.filmmaker, { borderColor: theme.colors.accent }]}>
            <View style={[styles.brillo, { backgroundColor: theme.colors.accent }]} pointerEvents="none" />
            <Ionicons name="film" size={scale(30)} color={theme.colors.accent} />
            <Text style={styles.filmmakerTitulo}>{nombreDeEntrada(filmmaker, t)}</Text>
            <Text style={styles.filmmakerTexto}>{t('workspace.filmmakerPitch')}</Text>
            <View style={[styles.filmmakerBoton, { backgroundColor: theme.colors.accent }]}>
              <Text style={styles.filmmakerBotonTexto}>{t('workspace.openFilmmaker')}</Text>
              <Ionicons name="arrow-forward" size={scale(15)} color="#1F2937" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <View style={[styles.rejilla, isDesktop && styles.rejillaAncha]}>
          {resto.map((e) => (
            <TouchableOpacity
              key={e.id}
              onPress={() => abrir(e)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={nombreDeEntrada(e, t)}
              style={[styles.herramienta, { width: `${100 / porFila - 2}%` as const, backgroundColor: theme.colors.card, borderColor: theme.colors.border }, isWeb && ({ cursor: 'pointer' } as object)]}
            >
              <Ionicons name={e.icono as any} size={scale(22)} color={theme.colors.accent} />
              <Text style={[styles.herramientaNombre, { color: theme.colors.text }]} numberOfLines={1}>{nombreDeEntrada(e, t)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ProyectosRecientes cuantos={isDesktop ? 5 : 3} onVerTodos={() => navigation.navigate('CreatorProyectos')} />

      <View style={styles.bloque}>
        <View style={styles.cabecera}>
          <Text style={[styles.titulo, { color: theme.colors.text }]} accessibilityRole="header">{t('workspace.ideasTitle')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('CreatorInspira')} accessibilityRole="button" accessibilityLabel={t('workspace.seeAllIdeas')}>
            <Text style={[styles.enlace, { color: theme.colors.accent }]}>{t('workspace.seeAllIdeas')}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.ideas}>
          {ideas.map((r) => (
            <TouchableOpacity
              key={r.id}
              onPress={() => usarReceta(r)}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel={t('inspira.useIdea', { nombre: t(r.clave) })}
              style={[styles.idea, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }, isWeb && ({ cursor: 'pointer' } as object)]}
            >
              <PortadaDeIdea receta={r} alto={scale(110)} />
              <Text style={[styles.ideaTitulo, { color: theme.colors.text }]} numberOfLines={1}>{t(r.clave)}</Text>
              <Text style={[styles.ideaTexto, { color: theme.colors.textSecondary }]} numberOfLines={2}>{t(r.claveDescripcion)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {creaciones.length > 0 && (
        <View style={styles.bloque}>
          <View style={styles.cabecera}>
            <Text style={[styles.titulo, { color: theme.colors.text }]} accessibilityRole="header">{t('workspace.recentCreations')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('MisCreaciones')} accessibilityRole="button" accessibilityLabel={t('workspace.seeAllCreations')}>
              <Text style={[styles.enlace, { color: theme.colors.accent }]}>{t('workspace.seeAllCreations')}</Text>
            </TouchableOpacity>
          </View>
          <RejillaDeCreaciones items={creaciones} columnas={isDesktop ? 4 : 2} onOpen={() => navigation.navigate('MisCreaciones')} />
        </View>
      )}
    </PaginaDeCreator>
  );
};

const styles = StyleSheet.create({
  herramientas: { gap: SPACING.md },
  herramientasAncho: { flexDirection: 'row', alignItems: 'stretch' },
  filmmakerAncho: { width: scale(360) },
  filmmaker: { borderRadius: BORDER_RADIUS.xl, borderWidth: 1, padding: SPACING.xl, gap: SPACING.sm, overflow: 'hidden', minHeight: scale(200), justifyContent: 'flex-end', flex: 1 },
  brillo: { position: 'absolute', top: -50, right: -50, width: 160, height: 160, borderRadius: 80, opacity: 0.14 },
  filmmakerTitulo: { color: '#FFFFFF', fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold as any },
  filmmakerTexto: { color: 'rgba(255,255,255,0.72)', fontSize: FONT_SIZE.sm, lineHeight: FONT_SIZE.sm * 1.45 },
  filmmakerBoton: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, alignSelf: 'flex-start', minHeight: 40, paddingHorizontal: SPACING.lg, borderRadius: BORDER_RADIUS.full, marginTop: SPACING.xs },
  filmmakerBotonTexto: { color: '#1F2937', fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold as any },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  rejillaAncha: { flex: 1, alignContent: 'flex-start' },
  herramienta: { minHeight: scale(92), borderWidth: 1, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center', gap: SPACING.xs, padding: SPACING.sm },
  herramientaNombre: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.medium as any, textAlign: 'center' },
  bloque: { gap: SPACING.md },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titulo: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold as any },
  enlace: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold as any },
  ideas: { flexDirection: 'row', gap: SPACING.md, flexWrap: 'wrap' },
  idea: { flexBasis: scale(220), flexGrow: 1, borderWidth: 1, borderRadius: BORDER_RADIUS.lg, padding: SPACING.sm, gap: SPACING.xs },
  ideaTitulo: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold as any, marginTop: SPACING.xs },
  ideaTexto: { fontSize: FONT_SIZE.xs, lineHeight: FONT_SIZE.xs * 1.45 },
});

export default CreatorInicioScreen;
