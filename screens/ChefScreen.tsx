import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme, enTemaClaro } from '../contexts/ThemeContext';
import { useIdioma } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { useEspecialista } from '../hooks/useEspecialista';
import { creatorService, CreatorJob } from '../services/creatorService';
import { PaginaDeCajas } from '../components/creator/CajaQueCrece';
import CabeceraDeSeccion from '../components/creator/CabeceraDeSeccion';
import CajaDePrompt from '../components/creator/CajaDePrompt';
import AjustesContextuales from '../components/creator/AjustesContextuales';
import EspacioDeEscritura from '../components/EspacioDeEscritura';
import { ALTO_BARRA } from '../components/BarraInferior';
import ChefAcciones from '../components/chef/ChefAcciones';
import ChefPanel from '../components/chef/ChefPanel';
import ChefProyectos from '../components/chef/ChefProyectos';
import {
  AJUSTES_DE_COCINA, CLAVE_DEL_PANEL, EntradaDeChef, PanelDeChef, TarjetaDeChef,
} from '../constants/chefTools';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { notify } from '../utils/notify';
import { scale } from '../utils/scale';

const isWeb = Platform.OS === 'web';

/** El hueco que deja la barra global de abajo. */
const SITIO_DE_LA_BARRA = scale(96);

/**
 * WEË CHEF — EL SITIO DONDE SE COCINA.
 *
 * ── Qué es esta pantalla ─────────────────────────────────────────────────────
 *
 * Un sitio de trabajo, no una app de recetas: se entra, se dice qué te apetece
 * y se cocina. Por eso el orden es el mismo de Weë Studio y no otro —cabecera,
 * caja, funciones, lo ya hecho—: es la misma familia, y quien viene de Studio
 * tiene que reconocer esto sin pensar.
 *
 * Reemplaza la ficha de especialista que había aquí (cuadrícula con círculos
 * amarillos, caja estrecha, ejemplos y muro). Aquella servía para las once
 * experiencias y por eso no podía ser de ninguna; esta es solo de Chef.
 *
 * ── Los paneles no son pantallas ─────────────────────────────────────────────
 *
 * Las tres funciones nuevas —información nutricional, sustituir ingredientes y
 * lista de compras— abren un panel DENTRO de esta pantalla. Así volver es
 * instantáneo, no se acumula una pila de rutas y lo escrito se queda donde
 * estaba. El gesto de atrás de Android vuelve a la caja antes de salir.
 *
 * ── Qué cuesta, y cuándo se dice ─────────────────────────────────────────────
 *
 * Aquí no se cobra nada: escribir, abrir los ajustes, elegir una píldora o
 * entrar en un panel no llama a nadie. Todo lo que crea pasa por el camino de
 * siempre —`CreatorFlow`—, que enseña el plan y su coste en Credits ANTES de
 * crear. Ni un precio nuevo ni un precio escrito a mano: los pone el Credit
 * Engine, como en el resto de Weë.
 */
const ChefScreen: React.FC = () => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const spec = useEspecialista('chef');

  const [prompt, setPrompt] = useState('');
  const [panel, setPanel] = useState<PanelDeChef | null>(null);
  const [ajustesAbiertos, setAjustesAbiertos] = useState(false);
  const [ajustes, setAjustes] = useState<Record<string, string>>({});
  const [foto, setFoto] = useState<string | null>(null);
  const [proyectos, setProyectos] = useState<CreatorJob[]>([]);

  /*
   * Dos por fila en el teléfono, tres en cuanto hay sitio. Con cuatro, el nombre
   * de una función larga —"Información nutricional"— se queda sin ancho.
   */
  const porFila = isMobile ? 2 : isTablet ? 3 : 3;
  const anchoMaximo = useMemo(() => (isMobile ? undefined : scale(720)), [isMobile]);

  /* Lo que ya ha cocinado esta persona. Si no hay sesión, no hay nada que pedir. */
  useFocusEffect(
    useCallback(() => {
      if (!user) {
        setProyectos([]);
        return;
      }
      let cancelado = false;
      creatorService
        .getMyJobs(user.uid, 20)
        .then((jobs) => {
          if (!cancelado) setProyectos(jobs.filter((job) => job.experienceId === 'chef').slice(0, 8));
        })
        .catch((error) => console.warn('No se pudieron cargar tus proyectos:', error));
      return () => { cancelado = true; };
    }, [user])
  );

  /*
   * LO ELEGIDO EN LOS AJUSTES, A LA VISTA.
   *
   * Solo lo que decide algo: "Las que sean" o "El que haga falta" no se enseñan
   * porque no cambian nada. Lo que quede viaja con la idea, escrito, para que
   * nadie tenga que fiarse de que se mandó.
   */
  const puestos = useMemo(
    () =>
      AJUSTES_DE_COCINA
        .map((grupo) => {
          const elegido = ajustes[grupo.id];
          if (!elegido || elegido === 'auto') return null;
          const clave = grupo.opciones.find((o) => o.id === elegido)?.clave;
          return clave ? { grupo: grupo.id, clave } : null;
        })
        .filter((x): x is { grupo: string; clave: string } => !!x),
    [ajustes]
  );

  /*
   * EL CAMINO DE SIEMPRE, SIN NADA NUEVO DETRÁS.
   *
   * Es el mismo `CreatorFlow` con el mismo `experienceId` y los mismos `preset`
   * que ya usaba Weë Chef: allí Weë Brain pregunta lo que falte, enseña el plan
   * y su coste en Credits, y solo entonces se crea.
   */
  const abrirFlujo = useCallback(
    (objetivo?: string, preset?: TarjetaDeChef['preset'], imagen?: string) => {
      if (!user) {
        navigation.navigate('Login');
        return;
      }
      navigation.navigate('CreatorFlow', {
        experienceId: 'chef',
        goal: objetivo,
        preset,
        imageUri: imagen ?? foto ?? undefined,
      });
    },
    [user, navigation, foto]
  );

  const alEnviar = useCallback(() => {
    const idea = prompt.trim();
    if (!idea) return;
    /* Lo elegido se pega a la idea por interpolación, nunca juntando cadenas. */
    const objetivo = puestos.length
      ? t('chef.goalWith', { idea, ajustes: formato.lista(puestos.map((p) => t(p.clave))) })
      : idea;
    abrirFlujo(objetivo);
  }, [prompt, puestos, t, formato, abrirFlujo]);

  const alElegirTarjeta = useCallback((tarjeta: TarjetaDeChef) => {
    if (tarjeta.panel) {
      setPanel(tarjeta.panel);
      return;
    }
    abrirFlujo(undefined, tarjeta.preset);
  }, [abrirFlujo]);

  /* Elegir dentro de un panel vuelve a la caja con la frase empezada. */
  const alElegirEntrada = useCallback((entrada: EntradaDeChef) => {
    const cual = panel;
    setPanel(null);
    if (!cual) return;
    setPrompt(t('chef.panelStart', { panel: t(CLAVE_DEL_PANEL[cual]), que: t(entrada.clave) }));
  }, [panel, t]);

  /*
   * LA FOTO: DE LA GALERÍA O DE LA CÁMARA.
   *
   * Es el mismo selector de siempre (`UploadBox`), y la foto viaja al flujo por
   * el mismo sitio. Si se cancela, no pasa nada: no hay foto y no se toca nada.
   *
   * Y una foto sola ya es una petición: el botón de crear se enciende con lo
   * escrito, así que una nevera fotografiada y la caja vacía dejarían la
   * pantalla sin salida —cuando el texto de la caja promete justo eso, "o usa
   * una foto"—. Al llegar la primera, la frase se empieza con la de siempre, y
   * quien quiera decir otra cosa la borra.
   */
  const pedirFoto = useCallback(async (de: 'galeria' | 'camara') => {
    try {
      let elegida: string | undefined;
      if (de === 'camara') {
        const permiso = await ImagePicker.requestCameraPermissionsAsync();
        if (!permiso.granted) return;
        const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 });
        elegida = r.canceled ? undefined : r.assets[0]?.uri;
      } else {
        if (!isWeb) {
          const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!permiso.granted) return;
        }
        const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, allowsMultipleSelection: false });
        elegida = r.canceled ? undefined : r.assets[0]?.uri;
      }
      if (!elegida) return;
      setFoto(elegida);
      setPrompt((antes) => (antes.trim() ? antes : t('catalogo.chefAcIngredientsGoal')));
    } catch (error) {
      console.warn('No se pudo elegir la foto:', error);
    }
  }, [t]);

  /*
   * ATRÁS CIERRA EL PANEL, NO LA SECCIÓN.
   *
   * Un panel abierto es un nivel más dentro de Weë Chef, no otra pantalla: si el
   * gesto de atrás se lo llevara la navegación, saldrías al Home y perderías lo
   * escrito. Mientras hay panel, el gesto vuelve a la caja.
   */
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android' || !panel) return;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        setPanel(null);
        return true;
      });
      return () => sub.remove();
    }, [panel])
  );

  /* ── Un panel abierto se come la pantalla entera ───────────────────────── */
  if (panel) {
    return (
      <SafeAreaView style={[styles.pantalla, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <View style={[styles.centrado, anchoMaximo ? { maxWidth: anchoMaximo } : null]}>
          <ChefPanel
            panel={panel}
            porFila={porFila}
            onVolver={() => setPanel(null)}
            onElegir={alElegirEntrada}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.pantalla, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/*
        La caja crece con lo escrito hasta llenar lo que se ve, y su fila de
        botones no puede salirse de la vista: es la regla de toda caja de Weë AI
        (CLAUDE.md §9), y la página que la hace posible es `PaginaDeCajas`.
      */}
      <EspacioDeEscritura style={styles.scroll} descuento={isDesktop ? 0 : ALTO_BARRA}>
        <PaginaDeCajas
          style={styles.scroll}
          contentContainerStyle={styles.dentro}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.centrado, anchoMaximo ? { maxWidth: anchoMaximo } : null]}>
            <CabeceraDeSeccion nombre="Chef" lema={spec?.headline ?? ''} descripcion={t('chef.description')} />

            {/*
              LA CAJA, SIN NADA ALREDEDOR (decisión del usuario, 2026-09-15).
              Ni la invitación de encima, ni la frase de dentro, ni las píldoras
              de debajo: la cabecera ya dice dónde estás y para qué sirve esto, y
              lo demás eran tres formas de repetirlo justo donde hay que ponerse
              a escribir. La caja se queda limpia; lo que la explica sigue en su
              etiqueta, para quien la escucha en vez de verla.
            */}
            <View style={styles.compositor}>
              <CajaDePrompt
                valor={prompt}
                onCambiar={setPrompt}
                onEnviar={alEnviar}
                etiquetaEnviar={t('chef.sendLabel')}
                placeholder=""
                etiqueta={t('chef.placeholder')}
                acciones={[
                  { icono: 'add', etiqueta: t('chef.addLabel'), alPulsar: () => { void pedirFoto('galeria'); } },
                  { icono: 'camera-outline', etiqueta: t('chef.cameraLabel'), alPulsar: () => { void pedirFoto('camara'); } },
                  { icono: 'image-outline', etiqueta: t('chef.galleryLabel'), alPulsar: () => { void pedirFoto('galeria'); } },
                  /*
                   * El dictado todavía no existe en ninguna parte de Weë, así
                   * que el botón lo dice en vez de hacer otra cosa: un control
                   * que hace algo distinto de lo que dibuja es peor que uno que
                   * avisa. En cuanto haya dictado, aquí se enchufa.
                   */
                  { icono: 'mic-outline', etiqueta: t('chef.voiceLabel'), alPulsar: () => notify(t('common.comingSoon')) },
                  { icono: 'options-outline', etiqueta: t('chef.settingsLabel'), alPulsar: () => setAjustesAbiertos(true) },
                ]}
              />

              {/*
                Lo que viaja con la idea, debajo de la caja y no escondido: la
                foto elegida y los ajustes que deciden algo. Se quitan de un
                toque, que es lo que se busca cuando se ven y ya no se quieren.
              */}
              {(!!foto || puestos.length > 0) && (
                <View style={styles.fichas}>
                  {!!foto && (
                    <TouchableOpacity
                      style={[styles.ficha, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                      onPress={() => setFoto(null)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={t('chef.photoReady')}
                    >
                      <Ionicons name="image-outline" size={scale(14)} color={theme.colors.text} />
                      <Text style={[styles.fichaTexto, { color: theme.colors.text }]} numberOfLines={1}>
                        {t('chef.photoReady')}
                      </Text>
                      <Ionicons name="close" size={scale(14)} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                  {/*
                    Los ajustes puestos van marcados en amarillo, como en la
                    hoja donde se eligieron: así se leen como una decisión tuya
                    y no como un botón más. Y se quitan tocándolos, que es lo
                    que el dedo intenta cuando ya no los quiere.
                  */}
                  {puestos.map(({ grupo, clave }) => (
                    <TouchableOpacity
                      key={grupo}
                      style={[styles.ficha, { backgroundColor: theme.colors.glow, borderColor: theme.colors.accent }]}
                      onPress={() => setAjustes((antes) => ({ ...antes, [grupo]: 'auto' }))}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={t(clave)}
                    >
                      <Text
                        style={[styles.fichaTexto, styles.fichaPuesta, { color: theme.colors.accentDark }]}
                        numberOfLines={1}
                      >
                        {t(clave)}
                      </Text>
                      <Ionicons name="close" size={scale(14)} color={theme.colors.accentDark} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.funciones}>
              <Text style={[styles.seccion, { color: theme.colors.text }]}>{t('chef.gridTitle')}</Text>
              <ChefAcciones porFila={porFila} onElegir={alElegirTarjeta} />
            </View>

            <ChefProyectos
              proyectos={proyectos}
              onAbrir={(job) => navigation.navigate('CreatorFlow', { experienceId: job.experienceId, jobId: job.id })}
              onVerTodos={() => navigation.navigate('Projects')}
            />
          </View>
        </PaginaDeCajas>
      </EspacioDeEscritura>

      {/*
        Los ajustes de la receta: la misma hoja de Weë Studio con el catálogo de
        Chef. Se decide todo aquí, sin llamar a nadie y sin gastar un Credit.
      */}
      <AjustesContextuales
        visible={ajustesAbiertos}
        contexto="general"
        grupos={AJUSTES_DE_COCINA}
        pista={t('chef.settingsHint')}
        elegido={ajustes}
        onElegir={(grupo, opcion) => setAjustes((antes) => ({ ...antes, [grupo]: opcion }))}
        onCerrar={() => setAjustesAbiertos(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  scroll: { flex: 1 },
  dentro: { paddingBottom: SITIO_DE_LA_BARRA, gap: SPACING.xxl },
  /* En escritorio el contenido no se estira: se centra y se queda legible. */
  centrado: { width: '100%', alignSelf: 'center', gap: SPACING.xxl, flex: 1 },
  /*
   * LA CAJA, MÁS CERCA DE LA PRESENTACIÓN (decisión del usuario, 2026-09-16,
   * solo en Weë Chef; el mismo ajuste que ya llevan Weë Studio y Weë Design).
   *
   * Entre el último renglón de la cabecera y la caja había 44 puntos: 20 del
   * aire de abajo de la cabecera y 24 del `gap` de esta página. Se recortan aquí
   * —y solo aquí— con un margen negativo, que deja el hueco en unos 18 sin tocar
   * ni la cabecera ni la caja, que las comparten todas las demás secciones.
   *
   * Mueve dónde empieza la caja, no cuánto mide: crece igual que antes.
   */
  compositor: { paddingHorizontal: SPACING.lg, gap: SPACING.sm, marginTop: -scale(26) },
  fichas: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, paddingHorizontal: SPACING.xs },
  ficha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + scale(2),
    borderRadius: BORDER_RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: scale(200),
  },
  fichaTexto: { fontSize: FONT_SIZE.xs, flexShrink: 1 },
  fichaPuesta: { fontWeight: FONT_WEIGHT.semibold },
  funciones: { gap: SPACING.md },
  seccion: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, paddingHorizontal: SPACING.xl },
});

/*
 * Weë Chef es de la CUENTA, como el resto del taller: se ve claro lleves puesto
 * el Perfil Real o el Perfil Weë.
 */
export default enTemaClaro(ChefScreen);
