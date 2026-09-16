import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, enTemaClaro } from '../contexts/ThemeContext';
import { useT } from '../contexts/IdiomaContext';
import { useResponsive } from '../hooks/useResponsive';
import { PaginaDeCajas } from '../components/creator/CajaQueCrece';
import StudioHeader from '../components/studio/StudioHeader';
import StudioPromptComposer from '../components/studio/StudioPromptComposer';
import AjustesContextuales from '../components/creator/AjustesContextuales';
import EspacioDeEscritura, { useAlturaDelTeclado } from '../components/EspacioDeEscritura';
import { ALTO_BARRA } from '../components/BarraInferior';
import StudioToolGrid from '../components/studio/StudioToolGrid';
import StudioCreations from '../components/studio/StudioCreations';
import StudioPanel from '../components/studio/StudioPanel';
import { AreaDeStudio, HerramientaDeStudio } from '../constants/studioTools';
import { contextoDeCreacion, duracionEnElTexto } from '../utils/contextoDeCreacion';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

const isWeb = Platform.OS === 'web';

/** Cuánto tarda la creación de mentira. Lo justo para ver el estado, no para esperar. */
const LO_QUE_TARDA_LA_DEMO = 1600;

/** El hueco que deja la barra global de abajo. */
const SITIO_DE_LA_BARRA = scale(96);

type EstadoDeCreacion = 'quieto' | 'creando' | 'listo';

/**
 * WEË STUDIO — EL SITIO DONDE SE CREA.
 *
 * ── Qué es esta pantalla ─────────────────────────────────────────────────────
 *
 * Un sitio, no un catálogo. Se entra, se dice qué quieres y se crea. Por eso el
 * orden es este y no otro: el nombre para saber dónde estás, el compositor —que
 * es el centro— y después las seis puertas para quien prefiera entrar por el
 * material en vez de por la idea. Al final, lo que ya has hecho.
 *
 * Reemplaza el Studio anterior, que era la pantalla genérica de especialista
 * con su cuadrícula, sus chips y su IdeaBox. Aquella servía para las once
 * experiencias y por eso no podía ser de ninguna; esta es solo de Studio.
 *
 * ── Los paneles no son pantallas ─────────────────────────────────────────────
 *
 * Tocar una puerta no navega: cambia lo que enseña ESTA pantalla. Así volver es
 * instantáneo y no se acumula una pila de rutas por pasear entre herramientas.
 * La dirección `/studio` es una sola y siempre lleva al mismo sitio.
 *
 * ── Lo que todavía no hay ────────────────────────────────────────────────────
 *
 * No hay IA. Ni Weë Brain, ni motor, ni proveedores. Pulsar Crear enseña
 * "Creando..." y luego "Creación lista", y nada más: esta fase es la
 * experiencia, para poder recorrerla y decidir si se entiende antes de gastar
 * un Credit. Cuando se conecte, el sitio donde entra es `alCrear`, y nada más
 * de esta pantalla tiene que cambiar.
 */
const StudioScreen: React.FC = () => {
  const { theme } = useTheme();
  const t = useT();
  const navigation = useNavigation<any>();
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const alturaTeclado = useAlturaDelTeclado();

  const [prompt, setPrompt] = useState('');
  /*
   * Al entrar no se sabe qué se quiere crear, y eso NO es "imágenes": es no
   * saberlo. Se llena cuando la persona entra por una puerta —Imágenes, Videos,
   * Voz…—, y hasta entonces los ajustes preguntan solo lo que vale para todo.
   */
  const [area, setArea] = useState<AreaDeStudio | null>(null);
  const [panel, setPanel] = useState<AreaDeStudio | null>(null);
  const [ajustesAbiertos, setAjustesAbiertos] = useState(false);
  const [ajustes, setAjustes] = useState<Record<string, string>>({});
  const [referencias, setReferencias] = useState<string[]>([]);
  const [estado, setEstado] = useState<EstadoDeCreacion>('quieto');
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  /*
   * Dos por fila en el teléfono, tres en cuanto hay sitio. No más: con cuatro o
   * cinco las tarjetas se quedan sin ancho para su descripción y el Studio
   * empieza a parecer un panel de control, que es justo lo que no es.
   */
  const porFila = isMobile ? 2 : isTablet ? 3 : 3;

  /* El ancho del contenido se limita en escritorio: una columna legible, centrada. */
  const anchoMaximo = useMemo(() => (isMobile ? undefined : scale(720)), [isMobile]);

  /*
   * QUÉ SE ESTÁ CREANDO, Y QUÉ SE PREGUNTA POR ELLO.
   *
   * Sale de la puerta por la que se entró y, si no hay puerta, de lo escrito.
   * Todo aquí, sin llamar a nadie: abrir los ajustes o tocar una píldora no
   * cuesta un Credit. Cuando Weë Brain decida de verdad, entrará por aquí.
   */
  const contexto = useMemo(() => contextoDeCreacion(area, prompt), [area, prompt]);

  /*
   * "Un video de 10 segundos" deja la duración puesta en 10 s. Es una sugerencia
   * y no una decisión: en cuanto alguien toca esa fila, manda lo que elija.
   */
  const sugerido = useMemo(() => {
    if (contexto !== 'video') return undefined;
    const duracion = duracionEnElTexto(prompt);
    return duracion ? { duration: duracion } : undefined;
  }, [contexto, prompt]);

  const alCrear = useCallback(() => {
    if (!prompt.trim()) return;
    setEstado('creando');
    /*
     * AQUÍ ENTRA WEË BRAIN EL DÍA QUE SE CONECTE.
     *
     * Lo que hoy es un temporizador será: mandar `prompt`, `area`, `ajustes` y
     * `referencias` a Brain, que decide el plan y el especialista, y de ahí al
     * motor. La pantalla ya tiene los cuatro datos reunidos y un estado que
     * enseñar mientras tanto, así que no hay que tocar nada más de aquí.
     */
    temporizador.current = setTimeout(() => setEstado('listo'), LO_QUE_TARDA_LA_DEMO);
  }, [prompt]);

  const alElegirHerramienta = useCallback((herramienta: HerramientaDeStudio) => {
    /*
     * Elegir una herramienta no abre otra pantalla: vuelve al compositor con esa
     * intención puesta. El sitio donde se dice qué quieres es uno solo.
     */
    if (panel && panel !== 'more') setArea(panel);
    setPanel(null);
    setPrompt((antes) => (antes.trim() ? antes : `${t(herramienta.clave)}: `));
  }, [panel, t]);

  const alAnadirReferencia = useCallback(() => {
    /* Sin selector de archivos todavía: se añade una de muestra para ver la forma. */
    setReferencias((antes) => [...antes, `referencia-${antes.length + 1}.png`]);
  }, []);

  /*
   * ATRÁS CIERRA EL PANEL, NO LA SECCIÓN.
   *
   * Una puerta abierta es un nivel más dentro del Studio, no otra pantalla: si
   * el gesto de atrás se lo llevara la navegación, saldrías al Home y perderías
   * lo escrito. Mientras hay panel, el gesto vuelve al compositor —con el texto,
   * las referencias y los ajustes intactos— y solo desde allí sale de la sección.
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
          <StudioPanel
            area={panel}
            porFila={porFila}
            onVolver={() => setPanel(null)}
            onElegir={alElegirHerramienta}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.pantalla, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/*
        La caja crece con lo escrito hasta llenar lo que se ve, y su fila de
        botones no puede salirse de la vista: es la regla de toda caja de Weë
        AI, y la página que la hace posible es `PaginaDeCajas`. Va dentro de
        `EspacioDeEscritura` para que, con el teclado abierto, "lo que se ve"
        ya lo descuente.
      */}
      <EspacioDeEscritura style={styles.scroll} descuento={isDesktop ? 0 : ALTO_BARRA}>
        <PaginaDeCajas
          style={styles.scroll}
          contentContainerStyle={styles.dentro}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.centrado, anchoMaximo ? { maxWidth: anchoMaximo } : null]}>
            <StudioHeader />

            <StudioPromptComposer
              valor={prompt}
              onCambiar={setPrompt}
              onAjustes={() => setAjustesAbiertos(true)}
              onReferencia={alAnadirReferencia}
              onVoz={alAnadirReferencia}
              onCrear={alCrear}
              ocupado={estado === 'creando'}
            />

            {/* Las referencias añadidas se ven bajo el compositor, no escondidas. */}
            {referencias.length > 0 && (
              <View style={styles.referencias}>
                {referencias.map((r, i) => (
                  <View key={`${r}-${i}`} style={[styles.ficha, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <Ionicons name="image-outline" size={scale(14)} color={theme.colors.text} />
                    <Text style={[styles.fichaTexto, { color: theme.colors.text }]} numberOfLines={1}>{r}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.rejilla}>
              <StudioToolGrid porFila={porFila} onAbrir={(a) => setPanel(a)} />
            </View>

            <StudioCreations
              onVerTodas={() => navigation.navigate('Projects')}
              onOpciones={() => {}}
            />
          </View>
        </PaginaDeCajas>
      </EspacioDeEscritura>

      {/*
        EL ESTADO DE LA CREACIÓN, ENCIMA DE TODO.
        Va flotando y no dentro de la lista porque no es una sección del Studio:
        es lo que está pasando ahora mismo con lo que acabas de pedir.
      */}
      {/*
        El aviso sube con el teclado. Si se queda detrás, pulsar Crear parece no
        haber hecho nada: lo primero que hay que ver es que la petición entró.
        Al enviar, además, el teclado se retira solo (`CajaDePrompt`), así que
        esto solo cubre el momento en que todavía se está yendo.
      */}
      {estado !== 'quieto' && (
        <View
          style={[
            styles.aviso,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.border, bottom: SITIO_DE_LA_BARRA + alturaTeclado },
          ]}
        >
          {estado === 'creando' ? (
            <>
              <Ionicons name="sparkles" size={scale(18)} color={theme.colors.accentDark} />
              <Text style={[styles.avisoTexto, { color: theme.colors.text }]}>{t('studio.creating')}</Text>
            </>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={scale(18)} color={theme.colors.success} />
              <View style={styles.avisoCuerpo}>
                <Text style={[styles.avisoTexto, { color: theme.colors.text }]}>{t('studio.ready')}</Text>
                <Text style={[styles.avisoPista, { color: theme.colors.textSecondary }]}>{t('studio.readyHint')}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setEstado('quieto')}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                style={isWeb ? ({ cursor: 'pointer' } as any) : undefined}
              >
                <Text style={[styles.avisoCerrar, { color: theme.colors.accentDark }]}>{t('studio.dismiss')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      <AjustesContextuales
        visible={ajustesAbiertos}
        contexto={contexto}
        elegido={ajustes}
        sugerido={sugerido}
        referencias={referencias.length}
        onElegir={(ajuste, opcion) => setAjustes((antes) => ({ ...antes, [ajuste]: opcion }))}
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
  rejilla: { marginTop: -SPACING.sm },
  referencias: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    marginTop: -SPACING.md,
  },
  ficha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + scale(2),
    borderRadius: BORDER_RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: scale(170),
  },
  fichaTexto: { fontSize: FONT_SIZE.xs, flexShrink: 1 },
  aviso: {
    position: 'absolute',
    left: SPACING.lg,
    right: SPACING.lg,
    bottom: SITIO_DE_LA_BARRA,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: scale(18),
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: scale(16),
    shadowOffset: { width: 0, height: scale(4) },
    elevation: 4,
  },
  avisoCuerpo: { flex: 1, gap: scale(1) },
  avisoTexto: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold },
  avisoPista: { fontSize: FONT_SIZE.xs, lineHeight: scale(16) },
  avisoCerrar: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },
});

/*
 * Weë Studio es de la CUENTA, como el resto del taller: se ve claro lleves
 * puesto el Perfil Real o el Perfil Weë.
 */
export default enTemaClaro(StudioScreen);
