import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useT } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useCaminosDeCreacion } from '../hooks/useCaminosDeCreacion';
import PestanaDeLaApp from '../components/PestanaDeLaApp';
import CajaDeCrear from '../components/crear/CajaDeCrear';
import ProyectosRecientes from '../components/proyectos/ProyectosRecientes';
import { OPTIONS as MANERAS_DE_COMPARTIR } from '../components/CreateSheet';
import { getExperienceById } from '../constants/weeExperiences';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

const isWeb = Platform.OS === 'web';

/**
 * Las capacidades de la pestaña Crear. Video y Filmmaker primero; después, los
 * especialistas de Weë AI por su marca. «Más» abre Weë AI entero, con sus once
 * experiencias: aquí solo van las que más se usan, sin tarjetas enormes.
 */
const CAPACIDADES: readonly { id: string; clave?: string; experienceId?: string; icono: string; pro?: boolean }[] = [
  { id: 'video', clave: 'crear.capVideo', icono: 'videocam-outline' },
  { id: 'filmmaker', clave: 'crear.capFilmmaker', icono: 'film-outline', pro: true },
  { id: 'photo', experienceId: 'photo', icono: 'image-outline' },
  { id: 'music', experienceId: 'music', icono: 'musical-notes-outline' },
  { id: 'design', experienceId: 'design', icono: 'color-palette-outline' },
  { id: 'writer', experienceId: 'writer', icono: 'document-text-outline' },
  { id: 'business', experienceId: 'business', icono: 'briefcase-outline' },
  { id: 'more', clave: 'crear.capMore', icono: 'grid-outline' },
];

/**
 * CREAR — LA PRIMERA PESTAÑA DE WEË.
 *
 * Todo lo que se puede crear, en un solo sitio y sin catálogo: la caja «¿Qué
 * quieres crear hoy?» —la misma de Weë AI, que habla con Weë Brain—, las
 * capacidades, lo que se comparte en Weë (una publicación, un Weël, una
 * pregunta), la puerta a Weë Creator para el trabajo profesional y lo último en
 * lo que trabajaste.
 *
 * Esta pantalla no crea: encamina. Una idea escrita va a la experiencia que le
 * toca por el mismo `destinoDeIntencion` de Weë Studio —no hay un router nuevo—;
 * un vídeo va a Crear video; una publicación, al compositor de siempre. El
 * precio, el plan y los Credits se ven donde se crea, antes de confirmar.
 */
const CrearScreen: React.FC = () => {
  const { theme } = useTheme();
  const t = useT();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const { conSesion, aCreator, aCrearVideo } = useCaminosDeCreacion();

  const abrirCapacidad = useCallback((id: string) => {
    if (id === 'video') { aCrearVideo(); return; }
    if (id === 'filmmaker') { conSesion(() => aCreator('Production')); return; }
    if (id === 'more') { navigation.navigate('WeeCreator'); return; }
    navigation.navigate('Specialist', { id });
  }, [aCreator, aCrearVideo, conSesion, navigation]);

  const compartir = useCallback((kind: string) => {
    if (!user) { navigation.navigate('Register'); return; }
    navigation.navigate('Create', { kind });
  }, [navigation, user]);

  /*
   * Cuántas caben por fila sale del ancho de verdad de la rejilla, no del tipo de
   * pantalla: en escritorio la columna del centro es estrecha y ocho casillas
   * dejaban «Weë Ph…». Ocho en una fila solo cuando cada una tiene sitio para su
   * nombre; si no, dos filas de cuatro.
   */
  const [anchoRejilla, setAnchoRejilla] = useState(0);
  const porFila = anchoRejilla >= 8 * 96 ? 8 : 4;

  return (
    <PestanaDeLaApp titulo={t('nav.create')} subtitulo={t('crear.hubSubtitle')}>
      <TouchableOpacity onPress={() => aCrearVideo()} activeOpacity={0.9} accessibilityRole="button" accessibilityLabel={t('crear.heroCta')}>
        <LinearGradient colors={['#1F2937', '#0B0C10']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroe}>
          <View style={[styles.heroeBrillo, { backgroundColor: theme.colors.accent }]} pointerEvents="none" />
          <Ionicons name="film" size={scale(34)} color={theme.colors.accent} />
          <Text style={styles.heroeTitulo}>{t('crear.heroTitle')}</Text>
          <Text style={styles.heroeTexto}>{t('crear.heroText')}</Text>
          <View style={[styles.heroeBoton, { backgroundColor: theme.colors.accent }]}>
            <Text style={styles.heroeBotonTexto}>{t('crear.heroCta')}</Text>
            <Ionicons name="arrow-forward" size={scale(16)} color="#1F2937" />
          </View>
        </LinearGradient>
      </TouchableOpacity>

      <CajaDeCrear />

      <View style={styles.bloque}>
        <Text style={[styles.seccion, { color: theme.colors.text }]} accessibilityRole="header">{t('crear.capabilitiesTitle')}</Text>
        <View style={styles.rejilla} onLayout={(e) => setAnchoRejilla(Math.round(e.nativeEvent.layout.width))}>
          {CAPACIDADES.map((c) => {
            const nombre = c.clave ? t(c.clave) : getExperienceById(c.experienceId ?? '')?.name ?? c.id;
            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => abrirCapacidad(c.id)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={nombre}
                style={[
                  styles.capacidad,
                  { width: `${100 / porFila - 2.4}%` as const, backgroundColor: c.pro ? theme.colors.glow : theme.colors.card, borderColor: c.pro ? theme.colors.accent : theme.colors.border },
                  isWeb && ({ cursor: 'pointer' } as object),
                ]}
              >
                <Ionicons name={c.icono as any} size={scale(24)} color={c.pro ? theme.colors.accent : theme.colors.text} />
                <Text style={[styles.capacidadNombre, { color: theme.colors.text }]} numberOfLines={2}>{nombre}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.bloque}>
        <Text style={[styles.seccion, { color: theme.colors.text }]} accessibilityRole="header">{t('crear.shareTitle')}</Text>
        <View style={styles.compartir}>
          {MANERAS_DE_COMPARTIR.map((o) => (
            <TouchableOpacity
              key={o.kind}
              onPress={() => compartir(o.kind)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t(o.clave)}
              style={[styles.maneraDeCompartir, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
            >
              <Text style={styles.maneraEmoji}>{o.emoji}</Text>
              <Text style={[styles.maneraNombre, { color: theme.colors.text }]}>{t(o.clave)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        onPress={() => conSesion(() => aCreator('CreatorInicio'))}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel={t('crear.creatorCta')}
        style={[styles.creator, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
      >
        <View style={[styles.creatorIcono, { backgroundColor: '#0B0C10' }]}>
          <Ionicons name="aperture-outline" size={scale(24)} color={theme.colors.accent} />
        </View>
        <View style={styles.creatorTextos}>
          <Text style={[styles.creatorTitulo, { color: theme.colors.text }]}>{t('crear.creatorTitle')}</Text>
          <Text style={[styles.creatorTexto, { color: theme.colors.textSecondary }]}>{t('crear.creatorText')}</Text>
        </View>
        <View style={[styles.creatorBoton, { backgroundColor: theme.colors.accent }]}>
          <Text style={styles.creatorBotonTexto}>{t('crear.creatorCta')}</Text>
        </View>
      </TouchableOpacity>

      <ProyectosRecientes onVerTodos={() => navigation.navigate('Main', { screen: 'Proyectos' })} />

    </PestanaDeLaApp>
  );
};

const styles = StyleSheet.create({
  heroe: { borderRadius: BORDER_RADIUS.xl, padding: SPACING.xl, gap: SPACING.sm, overflow: 'hidden', minHeight: scale(190), justifyContent: 'flex-end' },
  heroeBrillo: { position: 'absolute', top: -60, right: -60, width: 180, height: 180, borderRadius: 90, opacity: 0.16 },
  heroeTitulo: { color: '#FFFFFF', fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold as any, lineHeight: FONT_SIZE.xl * 1.2, maxWidth: scale(300) },
  heroeTexto: { color: 'rgba(255,255,255,0.72)', fontSize: FONT_SIZE.sm, lineHeight: FONT_SIZE.sm * 1.45, maxWidth: scale(320) },
  heroeBoton: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, alignSelf: 'flex-start', minHeight: 42, paddingHorizontal: SPACING.lg, borderRadius: BORDER_RADIUS.full, marginTop: SPACING.xs },
  heroeBotonTexto: { color: '#1F2937', fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold as any },
  bloque: { gap: SPACING.md },
  seccion: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold as any },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  capacidad: { minHeight: scale(80), borderWidth: 1, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center', gap: SPACING.xs, padding: SPACING.xs },
  capacidadNombre: { fontSize: scale(11), fontWeight: FONT_WEIGHT.medium as any, textAlign: 'center' },
  compartir: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  maneraDeCompartir: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, minHeight: 40, paddingHorizontal: SPACING.md, borderRadius: BORDER_RADIUS.full, borderWidth: 1 },
  maneraEmoji: { fontSize: scale(15) },
  maneraNombre: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium as any },
  creator: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, borderWidth: 1, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, flexWrap: 'wrap' },
  creatorIcono: { width: 48, height: 48, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  creatorTextos: { flex: 1, minWidth: scale(180), gap: 2 },
  creatorTitulo: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold as any },
  creatorTexto: { fontSize: FONT_SIZE.xs, lineHeight: FONT_SIZE.xs * 1.45 },
  creatorBoton: { minHeight: 40, paddingHorizontal: SPACING.lg, borderRadius: BORDER_RADIUS.md, justifyContent: 'center' },
  creatorBotonTexto: { color: '#1F2937', fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold as any },
});

export default CrearScreen;
