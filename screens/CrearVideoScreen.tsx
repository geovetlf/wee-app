import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useT } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { useCaminosDeCreacion, ParamsDeCrearVideo } from '../hooks/useCaminosDeCreacion';
import CajaDePrompt from '../components/creator/CajaDePrompt';
import { PaginaDeCajas } from '../components/creator/CajaQueCrece';
import EspacioDeEscritura from '../components/EspacioDeEscritura';
import FichaDeContexto from '../components/creator/FichaDeContexto';
import StudioControles, { ControlesElegidos } from '../components/studio/StudioControles';
import HojaInferior from '../components/workspace/HojaInferior';
import SelectorDeOpciones, { OpcionElegible } from '../components/workspace/SelectorDeOpciones';
import ReproductorDeVideo from '../components/workspace/ReproductorDeVideo';
import { assetsService, AssetDoc } from '../services/assetsService';
import { claveDelValor, creativoEnPalabras, filtrarCreativo } from '../constants/camaraCinematica';
import type { Adjunto, ContextoDeExperiencia } from '../constants/weeWorkspaces';
import type { EstiloDeVideo, FormatoDeVideo, TipoDeVideo } from '../constants/inspiracion';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

const isWeb = Platform.OS === 'web';

/** Las familias de cámara que «Mejorar prompt» ofrece: encuadre, cámara, movimiento y luz. */
const FAMILIAS_PARA_MEJORAR: readonly string[] = ['shot', 'camera', 'movement', 'lighting'];

/** Los cuatro estilos: su nombre, su icono y las palabras que añade a la idea. */
const ESTILOS: readonly { id: EstiloDeVideo; clave: string; palabras: string; icono: string; tono: readonly [string, string] }[] = [
  { id: 'cinematico', clave: 'crear.styleCinematic', palabras: 'crear.styleCinematicWords', icono: 'film-outline', tono: ['#1B2A4A', '#3B2A5C'] },
  { id: 'realista', clave: 'crear.styleRealistic', palabras: 'crear.styleRealisticWords', icono: 'camera-outline', tono: ['#1E3A34', '#2A5A4A'] },
  { id: 'anime', clave: 'crear.styleAnime', palabras: 'crear.styleAnimeWords', icono: 'color-palette-outline', tono: ['#4A1B3A', '#7A2A4E'] },
  { id: '3d', clave: 'crear.style3d', palabras: 'crear.style3dWords', icono: 'cube-outline', tono: ['#3A2A12', '#6A4A1A'] },
];

type Calidad = 'standard' | 'high' | 'max' | '4k';
type Duracion = '5' | '8' | '10' | '15';

/** La pregunta `where` de la plantilla de vídeo del servidor: el formato, por su respuesta. */
const DONDE: Readonly<Record<FormatoDeVideo, string>> = { '16:9': 'horizontal', '9:16': 'vertical', '1:1': 'square' };

/**
 * CREAR VIDEO — interfaz simple, pero con todo a mano.
 *
 * La idea, grande; «Mejorar prompt» con la cámara, la luz y el movimiento de la
 * biblioteca de Weë Studio; una foto si se quiere animar; el estilo, la
 * duración, el formato y la calidad; y un botón para generar. Vive en la pestaña
 * Crear de Weë y, con el marco profesional, en Weë Creator.
 *
 * ── Lo que NO hace esta pantalla ────────────────────────────────────────────
 *
 * No genera ni cobra. Genera la experiencia común (`CreatorFlow`), la misma de
 * Weë Studio: allí se ve el plan con su precio en Credits ANTES de confirmar, y
 * el dinero sigue su camino de siempre —cotizar, reservar, cobrar si sale,
 * devolver si no—. Aquí no hay un segundo camino ni un segundo motor.
 *
 * ── Y dice la verdad sobre lo que hay ───────────────────────────────────────
 *
 * Un vídeo de un solo clip dura hoy 10 s (5 s si anima una foto): lo decide la
 * plantilla del servidor, y las otras duraciones se ven apagadas con su porqué,
 * con Filmmaker como camino para duraciones libres. Lo mismo la calidad: solo
 * «Estándar» tiene hoy un modelo validado; «Alta», «Máxima» y 4K se ven, no se
 * pueden elegir y dicen por qué. Nada cambia por otra cosa a escondidas.
 */
const CrearVideoScreen: React.FC = () => {
  const { theme } = useTheme();
  const t = useT();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params: ParamsDeCrearVideo = route.params ?? {};
  const { enCreator, conSesion, aCreator } = useCaminosDeCreacion();
  const { isDesktop, isMobile } = useResponsive();

  const [prompt, setPrompt] = useState(params.prompt ?? '');
  const [estilo, setEstilo] = useState<EstiloDeVideo | null>(params.estilo ?? null);
  const [formato, setFormato] = useState<FormatoDeVideo>(params.formato ?? '9:16');
  const [tipo, setTipo] = useState<TipoDeVideo | null>(params.tipo ?? null);
  const [calidad, setCalidad] = useState<Calidad>('standard');
  const [foto, setFoto] = useState<Adjunto | null>(null);
  const [controles, setControles] = useState<ControlesElegidos>({});
  const [mejorar, setMejorar] = useState(false);
  const [calidades, setCalidades] = useState(false);
  const [avanzado, setAvanzado] = useState(false);
  const [recientes, setRecientes] = useState<AssetDoc[]>([]);

  /* Una receta que llega con la pantalla ya abierta pone su idea y sus ajustes. */
  useEffect(() => {
    if (params.prompt) setPrompt(params.prompt);
    if (params.estilo) setEstilo(params.estilo);
    if (params.formato) setFormato(params.formato);
    if (params.tipo) setTipo(params.tipo);
  }, [params.prompt, params.estilo, params.formato, params.tipo]);

  /* Tus últimos vídeos: lo que ya has hecho, a la vista y de verdad. */
  useEffect(() => {
    if (!user) return;
    let vivo = true;
    assetsService.listar(user.uid, { kind: 'video', orden: 'recent' })
      .then((p) => { if (vivo) setRecientes(p.items.slice(0, 4)); })
      .catch(() => undefined);
    return () => { vivo = false; };
  }, [user]);

  const duracion: Duracion = foto ? '5' : '10';

  const opcionesDeDuracion: readonly OpcionElegible<Duracion>[] = useMemo(() => [
    { id: '5', etiqueta: t('crear.seconds', { segundos: 5 }), disponible: !!foto, porque: t('crear.durationFiveWhy') },
    { id: '8', etiqueta: t('crear.seconds', { segundos: 8 }), disponible: false, porque: t('crear.durationFixedWhy') },
    { id: '10', etiqueta: t('crear.seconds', { segundos: 10 }), disponible: !foto, porque: t('crear.durationPhotoWhy') },
    { id: '15', etiqueta: t('crear.seconds', { segundos: 15 }), disponible: false, porque: t('crear.durationFixedWhy') },
  ], [foto, t]);

  const opcionesDeFormato: readonly OpcionElegible<FormatoDeVideo | '4:5'>[] = useMemo(() => [
    { id: '9:16', etiqueta: '9:16', detalle: t('crear.formatVertical'), icono: 'phone-portrait-outline', disponible: !foto },
    { id: '16:9', etiqueta: '16:9', detalle: t('crear.formatHorizontal'), icono: 'tv-outline', disponible: !foto },
    { id: '1:1', etiqueta: '1:1', detalle: t('crear.formatSquare'), icono: 'square-outline', disponible: !foto },
    { id: '4:5', etiqueta: '4:5', detalle: t('crear.formatSocial'), icono: 'albums-outline', disponible: false, porque: t('crear.format45Why') },
  ], [foto, t]);

  const opcionesDeCalidad: readonly OpcionElegible<Calidad>[] = useMemo(() => [
    { id: 'standard', etiqueta: t('crear.qualityStandard'), detalle: t('crear.qualityStandardDetail'), disponible: true },
    { id: 'high', etiqueta: t('crear.qualityHigh'), detalle: t('crear.qualityNotYet'), disponible: false, porque: t('crear.qualityUnavailableWhy') },
    { id: 'max', etiqueta: t('crear.qualityMax'), detalle: t('crear.qualityNotYet'), disponible: false, porque: t('crear.qualityUnavailableWhy') },
    { id: '4k', etiqueta: t('crear.quality4k'), detalle: t('crear.qualityNotYet'), disponible: false, porque: t('crear.quality4kWhy') },
  ], [t]);

  const opcionesDeTipo: readonly OpcionElegible<TipoDeVideo>[] = useMemo(() => [
    { id: 'social', etiqueta: t('crear.typeSocial'), icono: 'phone-portrait-outline', disponible: !foto },
    { id: 'promo', etiqueta: t('crear.typePromo'), icono: 'megaphone-outline', disponible: !foto },
    { id: 'story', etiqueta: t('crear.typeStory'), icono: 'book-outline', disponible: !foto },
  ], [foto, t]);

  /** Una foto para animar, por el selector de siempre. La sube `CreatorFlow`, al Storage de Weë. */
  const elegirFoto = useCallback(async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) return;
    const elegido = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    const imagen = elegido.canceled ? null : elegido.assets?.[0];
    if (imagen?.uri) setFoto({ clase: 'referencia', uri: imagen.uri, nombre: imagen.fileName ?? undefined });
  }, []);

  /**
   * GENERAR ES IR A DONDE SE GENERA, con todo lo elegido puesto.
   *
   * El texto de la persona va entero; delante, nada; detrás, el estilo y los
   * controles en palabras —hoy la plantilla entiende frases—; y aparte, como
   * datos, las respuestas que ya están dadas (`where`, `type`) para que Weë no las
   * vuelva a preguntar, y los controles de cámara como `creative`.
   */
  const generar = useCallback(() => {
    const texto = prompt.trim();
    if (!texto) return;
    conSesion(() => {
      const creative = filtrarCreativo(controles);
      const extras = [
        estilo ? t(ESTILOS.find((e) => e.id === estilo)?.palabras ?? '') : '',
        creativoEnPalabras(creative, t),
      ].filter(Boolean).join(', ');
      const presets = foto
        ? [{ questionId: 'type', optionId: 'animate' }]
        : [
          { questionId: 'where', optionId: DONDE[formato] },
          ...(tipo ? [{ questionId: 'type', optionId: tipo }] : []),
        ];
      const contexto: ContextoDeExperiencia = {
        experienceId: 'studio',
        workspace: 'studio',
        goal: extras ? `${texto} · ${extras}` : texto,
        presets,
        ...(Object.keys(creative).length ? { creative } : {}),
        ...(foto ? { adjuntos: [foto], imageUri: foto.uri } : {}),
      };
      navigation.navigate('CreatorFlow', contexto);
    });
  }, [conSesion, controles, estilo, foto, formato, navigation, prompt, t, tipo]);

  const profesional = useCallback(() => {
    conSesion(() => aCreator('Production', prompt.trim() ? { intencion: prompt.trim() } : undefined));
  }, [aCreator, conSesion, prompt]);

  const nombreCalidad = opcionesDeCalidad.find((o) => o.id === calidad)?.etiqueta ?? '';

  /* ── Las piezas ─────────────────────────────────────────────────────────── */

  const pildoraDeCalidad = (
    <TouchableOpacity
      onPress={() => setCalidades(true)}
      style={[styles.pildoraCalidad, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
      accessibilityRole="button"
      accessibilityLabel={t('crear.qualityPill', { calidad: nombreCalidad })}
    >
      <Ionicons name="diamond-outline" size={scale(14)} color={theme.colors.accent} />
      <Text style={[styles.pildoraCalidadTexto, { color: theme.colors.text }]}>{nombreCalidad}</Text>
      <Ionicons name="chevron-down" size={scale(14)} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );

  const fichas = (Object.keys(controles).length > 0 || !!foto) && (
    <View style={styles.fichas}>
      {!!foto && (
        <FichaDeContexto icono="image-outline" texto={foto.nombre ?? t('crear.photoToAnimate')} onQuitar={() => setFoto(null)} etiquetaQuitar={t('crear.removeChip')} />
      )}
      {Object.entries(controles).map(([ruta, valor]) => {
        const clave = claveDelValor(ruta, valor);
        return clave ? (
          <FichaDeContexto
            key={ruta}
            icono="videocam-outline"
            texto={t(clave)}
            onQuitar={() => setControles((antes) => { const { [ruta]: _fuera, ...resto } = antes; return resto; })}
            etiquetaQuitar={t('crear.removeChip')}
          />
        ) : null;
      })}
    </View>
  );

  const formulario = (
    <View style={styles.formulario}>
      <CajaDePrompt
        valor={prompt}
        onCambiar={setPrompt}
        onEnviar={generar}
        etiquetaEnviar={t('crear.generateVideo')}
        placeholder={t('crear.videoPlaceholder')}
        acciones={[
          { icono: 'sparkles-outline', etiqueta: t('crear.improvePrompt'), alPulsar: () => setMejorar(true) },
          { icono: 'image-outline', etiqueta: t('crear.addPhoto'), alPulsar: () => { void elegirFoto(); } },
        ]}
      />
      <View style={styles.atajos}>
        <TouchableOpacity onPress={() => setMejorar(true)} style={[styles.atajo, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} accessibilityRole="button" accessibilityLabel={t('crear.improvePrompt')}>
          <Ionicons name="sparkles" size={scale(15)} color={theme.colors.accent} />
          <Text style={[styles.atajoTexto, { color: theme.colors.text }]}>{t('crear.improvePrompt')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { void elegirFoto(); }} style={[styles.atajo, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} accessibilityRole="button" accessibilityLabel={t('crear.addPhoto')}>
          <Ionicons name="add" size={scale(16)} color={theme.colors.text} />
          <Text style={[styles.atajoTexto, { color: theme.colors.text }]}>{t('crear.addPhoto')}</Text>
        </TouchableOpacity>
      </View>
      {fichas}

      <View style={styles.bloque}>
        <Text style={[styles.etiqueta, { color: theme.colors.text }]}>{t('crear.style')}</Text>
        <View style={styles.estilos}>
          {ESTILOS.map((e) => {
            const esta = estilo === e.id;
            return (
              <TouchableOpacity
                key={e.id}
                onPress={() => setEstilo(esta ? null : e.id)}
                activeOpacity={0.85}
                accessibilityRole="radio"
                accessibilityState={{ selected: esta, checked: esta }}
                accessibilityLabel={t(e.clave)}
                style={[styles.estilo, { borderColor: esta ? theme.colors.accent : 'transparent' }, isWeb && ({ cursor: 'pointer' } as object)]}
              >
                <LinearGradient colors={[e.tono[0], e.tono[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.estiloPortada}>
                  <Ionicons name={e.icono as any} size={scale(26)} color="rgba(255,255,255,0.85)" />
                  {esta && (
                    <View style={[styles.estiloMarca, { backgroundColor: theme.colors.accent }]}>
                      <Ionicons name="checkmark" size={scale(12)} color="#1F2937" />
                    </View>
                  )}
                </LinearGradient>
                <Text style={[styles.estiloNombre, { color: esta ? theme.colors.accent : theme.colors.text }]} numberOfLines={1}>{t(e.clave)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.bloque}>
        <Text style={[styles.etiqueta, { color: theme.colors.text }]}>{t('crear.duration')}</Text>
        <SelectorDeOpciones etiqueta={t('crear.duration')} opciones={opcionesDeDuracion} elegida={duracion} onElegir={() => undefined} />
      </View>

      <View style={styles.bloque}>
        <Text style={[styles.etiqueta, { color: theme.colors.text }]}>{t('crear.format')}</Text>
        {foto
          ? <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('crear.formatFromPhoto')}</Text>
          : (
            <SelectorDeOpciones
              etiqueta={t('crear.format')}
              forma="tarjetas"
              columnas={isMobile ? 4 : 4}
              opciones={opcionesDeFormato}
              elegida={formato}
              onElegir={(id) => { if (id !== '4:5') setFormato(id); }}
            />
          )}
      </View>

      <TouchableOpacity
        onPress={() => setAvanzado((a) => !a)}
        style={[styles.avanzado, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
        accessibilityRole="button"
        accessibilityState={{ expanded: avanzado }}
        accessibilityLabel={t('crear.advanced')}
      >
        <Ionicons name="options-outline" size={scale(16)} color={theme.colors.textSecondary} />
        <Text style={[styles.avanzadoTexto, { color: theme.colors.text }]}>{t('crear.advanced')}</Text>
        <Ionicons name={avanzado ? 'chevron-up' : 'chevron-down'} size={scale(16)} color={theme.colors.textSecondary} />
      </TouchableOpacity>
      {avanzado && (
        <View style={styles.bloque}>
          <Text style={[styles.etiqueta, { color: theme.colors.text }]}>{t('crear.typeTitle')}</Text>
          <SelectorDeOpciones etiqueta={t('crear.typeTitle')} opciones={opcionesDeTipo} elegida={tipo} onElegir={(id) => setTipo(tipo === id ? null : id)} />
          <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('crear.typeNote')}</Text>
          <Text style={[styles.etiqueta, { color: theme.colors.text }]}>{t('crear.quality')}</Text>
          <SelectorDeOpciones etiqueta={t('crear.quality')} forma="tarjetas" opciones={opcionesDeCalidad} elegida={calidad} onElegir={setCalidad} />
        </View>
      )}

      <TouchableOpacity
        onPress={generar}
        disabled={!prompt.trim()}
        activeOpacity={0.85}
        style={[styles.generar, prompt.trim() ? { backgroundColor: theme.colors.accent } : { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border }]}
        accessibilityRole="button"
        accessibilityState={{ disabled: !prompt.trim() }}
        accessibilityLabel={t('crear.generateVideo')}
      >
        <Ionicons name="sparkles" size={scale(18)} color={prompt.trim() ? '#1F2937' : theme.colors.textSecondary} />
        <Text style={[styles.generarTexto, { color: prompt.trim() ? '#1F2937' : theme.colors.textSecondary }]}>{t('crear.generateVideo')}</Text>
      </TouchableOpacity>
      <Text style={[styles.nota, styles.centrada, { color: theme.colors.textSecondary }]}>{t('crear.priceNote')}</Text>
    </View>
  );

  const lateral = (
    <View style={styles.lateral}>
      <TouchableOpacity
        onPress={profesional}
        activeOpacity={0.88}
        style={[styles.pro, { backgroundColor: theme.colors.card, borderColor: theme.colors.accent }]}
        accessibilityRole="button"
        accessibilityLabel={enCreator ? t('crear.proInCreator') : t('crear.proTitle')}
      >
        <View style={[styles.proIcono, { backgroundColor: theme.colors.glow }]}>
          <Ionicons name="film" size={scale(22)} color={theme.colors.accent} />
        </View>
        <View style={styles.proTextos}>
          <Text style={[styles.proTitulo, { color: theme.colors.text }]}>{enCreator ? t('crear.proInCreator') : t('crear.proTitle')}</Text>
          <Text style={[styles.proTexto, { color: theme.colors.textSecondary }]}>{t('crear.proText')}</Text>
        </View>
        <Ionicons name="arrow-forward" size={scale(18)} color={theme.colors.accent} />
      </TouchableOpacity>

      <View style={styles.bloque}>
        <Text style={[styles.etiqueta, { color: theme.colors.text }]}>{t('crear.recentVideos')}</Text>
        {recientes.length === 0 ? (
          <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('crear.noVideosYet')}</Text>
        ) : isDesktop ? (
          <ReproductorDeVideo url={assetsService.urlDeEntrega(recientes[0])} formato="16:9" nombre={recientes[0].name ?? t('crear.recentVideos')} altoMaximo={scale(320)} />
        ) : null}
        {recientes.length > 0 && (
          <TouchableOpacity onPress={() => navigation.navigate('MisCreaciones')} accessibilityRole="button" accessibilityLabel={t('crear.seeCreations')}>
            <Text style={[styles.enlace, { color: theme.colors.accent }]}>{t('crear.seeCreations')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const cabecera = (
    <View style={[styles.cabecera, !enCreator && { borderBottomColor: theme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      {!enCreator && (
        <TouchableOpacity
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main', { screen: 'Crear' }))}
          style={styles.volver}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="arrow-back" size={scale(22)} color={theme.colors.text} />
        </TouchableOpacity>
      )}
      <Text style={[styles.titulo, { color: theme.colors.text }]} accessibilityRole="header">{t('crear.videoTitle')}</Text>
      {pildoraDeCalidad}
    </View>
  );

  return (
    <SafeAreaView style={[styles.raiz, { backgroundColor: theme.colors.background }]} edges={enCreator ? [] : ['top']}>
      {cabecera}
      <EspacioDeEscritura style={styles.raiz} descuento={0}>
        <PaginaDeCajas contentContainerStyle={[styles.pagina, isDesktop && styles.paginaAncha]} keyboardShouldPersistTaps="handled">
          {isDesktop ? (
            <View style={styles.columnas}>
              <View style={styles.principal}>{formulario}</View>
              {lateral}
            </View>
          ) : (
            <>
              {formulario}
              {lateral}
            </>
          )}
        </PaginaDeCajas>
      </EspacioDeEscritura>

      <HojaInferior visible={mejorar} titulo={t('crear.improveTitle')} subtitulo={t('crear.improveText')} onCerrar={() => setMejorar(false)}>
        <StudioControles
          familias={FAMILIAS_PARA_MEJORAR}
          elegido={controles}
          onElegir={(ruta, valor) => setControles((antes) => (antes[ruta] === valor ? (({ [ruta]: _f, ...r }) => r)(antes) : { ...antes, [ruta]: valor }))}
          conAlias={false}
        />
      </HojaInferior>

      <HojaInferior visible={calidades} titulo={t('crear.quality')} subtitulo={t('crear.qualityText')} onCerrar={() => setCalidades(false)}>
        <SelectorDeOpciones etiqueta={t('crear.quality')} forma="tarjetas" opciones={opcionesDeCalidad} elegida={calidad} onElegir={(c) => { setCalidad(c); setCalidades(false); }} />
      </HojaInferior>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  raiz: { flex: 1 },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.lg, minHeight: scale(56) },
  volver: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -SPACING.sm },
  titulo: { flex: 1, fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold as any },
  pildoraCalidad: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, minHeight: 36, paddingHorizontal: SPACING.md, borderRadius: BORDER_RADIUS.full, borderWidth: 1 },
  pildoraCalidadTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold as any },
  pagina: { padding: SPACING.lg, paddingBottom: scale(140), gap: SPACING.xl },
  paginaAncha: { padding: SPACING.xxl, width: '100%', maxWidth: scale(1180), alignSelf: 'center' },
  columnas: { flexDirection: 'row', gap: SPACING.xxl, alignItems: 'flex-start' },
  principal: { flex: 1, minWidth: 0 },
  formulario: { gap: SPACING.xl },
  atajos: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: -SPACING.sm },
  atajo: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, minHeight: 38, paddingHorizontal: SPACING.md, borderRadius: BORDER_RADIUS.md, borderWidth: 1 },
  atajoTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium as any },
  fichas: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: -SPACING.sm },
  bloque: { gap: SPACING.sm },
  etiqueta: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold as any },
  estilos: { flexDirection: 'row', gap: SPACING.sm },
  estilo: { flex: 1, borderWidth: 2, borderRadius: BORDER_RADIUS.md, padding: 3, gap: SPACING.xs, alignItems: 'center' },
  estiloPortada: { width: '100%', aspectRatio: 1, borderRadius: BORDER_RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  estiloMarca: { position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  estiloNombre: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold as any, paddingBottom: 2 },
  avanzado: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, minHeight: 48, paddingHorizontal: SPACING.lg, borderRadius: BORDER_RADIUS.md, borderWidth: 1 },
  avanzadoTexto: { flex: 1, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium as any },
  generar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, minHeight: 54, borderRadius: BORDER_RADIUS.md },
  generarTexto: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold as any },
  nota: { fontSize: FONT_SIZE.xs, lineHeight: FONT_SIZE.xs * 1.5 },
  centrada: { textAlign: 'center', marginTop: -SPACING.md },
  lateral: { gap: SPACING.xl, width: '100%', maxWidth: scale(400) },
  pro: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, borderWidth: 1, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg },
  proIcono: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  proTextos: { flex: 1, gap: 2 },
  proTitulo: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold as any },
  proTexto: { fontSize: FONT_SIZE.xs, lineHeight: FONT_SIZE.xs * 1.45 },
  enlace: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold as any },
});

export default CrearVideoScreen;
