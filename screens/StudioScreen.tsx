import React, { useCallback, useMemo, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { View, Text, StyleSheet, Platform, BackHandler } from 'react-native';
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
import StudioEntradas from '../components/studio/StudioEntradas';
import StudioPanel, { EleccionDeStudio } from '../components/studio/StudioPanel';
import AvisoDeCreacion, { EstadoDeCreacion } from '../components/creator/AvisoDeCreacion';
import FilaDeCreaciones from '../components/creator/FilaDeCreaciones';
import { ControlesElegidos } from '../components/studio/StudioControles';
import { AreaDeStudio } from '../constants/studioTools';
import { EntradaDeStudio, entradaPorId } from '../constants/studioExperiences';
import { Adjunto, ContextoDeExperiencia } from '../constants/weeWorkspaces';
import { CREACIONES_DEL_STUDIO } from '../constants/studioMocks';
import { contextoDeCreacion, duracionEnElTexto } from '../utils/contextoDeCreacion';
import { destinoDeIntencion } from '../utils/destinoDeIntencion';
import FichaDeContexto from '../components/creator/FichaDeContexto';
import { claveDelValor, creativoEnPalabras, filtrarCreativo } from '../constants/camaraCinematica';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

/**
 * Cómo se lee un control puesto: `movement.type: 'push_in'` → "Acercarse".
 *
 * Si la biblioteca no lo nombra no se enseña la ruta cruda: se calla. Nadie
 * tiene por qué leer `push_in` en una pantalla de Weë.
 */
const nombreDelControl = (ruta: string, valor: string, t: (c: string) => string): string => {
  const clave = claveDelValor(ruta, valor);
  return clave ? t(clave) : '';
};

/** Cuánto tarda la creación de mentira. Lo justo para ver el estado, no para esperar. */
const LO_QUE_TARDA_LA_DEMO = 1600;

/** El hueco que deja la barra global de abajo. */
const SITIO_DE_LA_BARRA = scale(96);

/**
 * WEË STUDIO — EL SITIO DONDE SE CREA.
 *
 * ── Qué es esta pantalla ─────────────────────────────────────────────────────
 *
 * Una puerta a la creación, no una caja de herramientas. Se entra, se dice qué
 * se quiere, y Weë lleva a donde se hace. Por eso el orden es este y no otro:
 * el nombre para saber dónde estás, la caja —que es el centro—, cuatro
 * entradas grandes, y debajo y en pequeño el resto. Al final, lo que ya has
 * hecho.
 *
 * ── Las tres capas, y ninguna más ────────────────────────────────────────────
 *
 *   1  ESTA pantalla: dónde estoy. Una caja y cuatro sitios por donde empezar.
 *   2  `StudioPanel`: qué quiero conseguir. Un retrato, un timelapse.
 *   3  `StudioControles`: con qué detalle. Cámara, luz, movimiento.
 *
 * La tercera no se ve hasta contestar la segunda, y en eso está todo: los
 * controles de cámara son más de cincuenta y enseñados antes de tiempo no son
 * potencia, son un panel técnico. La potencia aparece DESPUÉS de la intención.
 *
 * ── Los paneles no son pantallas ─────────────────────────────────────────────
 *
 * Tocar una entrada no navega: cambia lo que enseña ESTA pantalla. Así volver
 * es instantáneo y no se acumula una pila de rutas por pasear. La dirección del
 * Studio es una sola y siempre lleva al mismo sitio.
 *
 * ── Y el Studio no genera ────────────────────────────────────────────────────
 *
 * Es un hub: descubre, encamina y entrega el contexto. Quien crea es la
 * experiencia común, `CreatorFlow`, con sus preguntas, su plan, su precio y su
 * resultado. Aquí no hay un segundo camino de generación, ni Brain propio, ni
 * Planner propio, ni trabajo propio, ni Credits propios: todo eso existe una
 * vez y está detrás de la experiencia a la que esta pantalla lleva.
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
  const [panel, setPanel] = useState<EntradaDeStudio | null>(null);
  /*
   * La experiencia que se eligió dentro de una puerta, y sus controles. No es
   * lo mismo que el área: el área dice de qué medio hablamos —y con eso se
   * decide qué ajustes preguntar—, y esto dice QUÉ se quiere conseguir, que es
   * lo que viaja como contexto a la experiencia común.
   */
  const [experiencia, setExperiencia] = useState<
    { id: string; clave: string; experienceId?: string; respuestas?: readonly { questionId: string; optionId: string }[] } | null
  >(null);
  /*
   * POR QUÉ ENTRADA SE PASÓ, SI SE PASÓ POR ALGUNA.
   *
   * `null` mientras nadie haya abierto ninguna, y eso NO es "Imágenes": es no
   * haber entrado por ninguna puerta. La diferencia importa —la encontró el
   * recorrido de Documentos—: con "Imágenes" por defecto, escribir algo que no
   * encaja con nada acababa en Weë Photo, que es inventarle a alguien una
   * sección por la que no pasó.
   */
  const [entrada, setEntrada] = useState<EntradaDeStudio | null>(null);
  const [controles, setControles] = useState<ControlesElegidos>({});
  const [ajustesAbiertos, setAjustesAbiertos] = useState(false);
  const [ajustes, setAjustes] = useState<Record<string, string>>({});
  /*
   * LOS MATERIALES, YA CON LA FORMA CON LA QUE VIAJAN.
   *
   * Antes eran nombres inventados —"referencia-1.png"— porque no había selector
   * de archivos. Ahora son `Adjunto`, que es el tipo del contrato: la misma
   * cosa que se ve en pantalla es la que llega a la experiencia, sin traducción
   * por el medio. Dos formas del mismo dato se separan; una sola, no.
   */
  const [adjuntos, setAdjuntos] = useState<Adjunto[]>([]);
  const [estado, setEstado] = useState<EstadoDeCreacion>('quieto');
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  /*
   * Dos por fila en el teléfono, tres en cuanto hay sitio. No más: con cuatro o
   * cinco las tarjetas se quedan sin ancho para su descripción y el Studio
   * empieza a parecer un panel de control, que es justo lo que no es.
   */
  const porFila = isMobile ? 2 : isTablet ? 3 : 4;

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

  /**
   * CREAR EN EL STUDIO ES IRSE A CREAR, NO CREAR AQUÍ.
   *
   * Weë Studio es un hub: descubre, encamina y entrega el contexto. Quien crea
   * de verdad es la experiencia común —`CreatorFlow`—, que es donde están las
   * preguntas, el plan, los Credits y el resultado. Construir aquí un segundo
   * camino de generación sería tener dos, y el día que discreparan alguien
   * tendría que decidir cuál gana.
   *
   * ── Quién decide a dónde ────────────────────────────────────────────────
   *
   * `destinoDeIntencion`, el de B3.10, que no es un router nuevo: elige entre
   * lo que declaró la puerta por la que se entró y las palabras de lo escrito.
   * Y se le pide que no salga del Studio, porque desde esta portada no se ven
   * los otros lugares de trabajo y llevar a alguien a uno que no ha visto es
   * dejarlo en una sección que no pidió.
   *
   * ── Y si no hay destino, se dice ────────────────────────────────────────
   *
   * No se inventa uno. Mientras no haya a dónde ir, el aviso sigue diciendo la
   * verdad: que esto todavía es una demostración.
   */
  const alCrear = useCallback(() => {
    const texto = prompt.trim();
    if (!texto) return;

    const destino = destinoDeIntencion(texto, {
      /*
       * La puerta declara su experiencia SOLO si se pasó por una. Sin puerta no
       * hay nada que declarar, y entonces deciden las palabras; y si las
       * palabras tampoco encajan, no hay destino y se dice, en vez de llevar a
       * alguien a una sección que no pidió.
       */
      declaradaPorLaPuerta: experiencia?.experienceId ?? (entrada ? entradaPorId(entrada)?.experienceId : undefined),
      dentroDe: 'studio',
    });

    if (destino) {
      /*
       * ── LO QUE VIAJA, Y POR QUÉ VIAJA DOS VECES ──────────────────────────
       *
       * La ESTRUCTURA va entera y aparte: `creative` con las rutas del lenguaje
       * creativo de Weë, `adjuntos` con su clase, `experienceId` y el `goal`
       * tal como se escribió. Eso es el contrato, y es lo que tiene que
       * sobrevivir.
       *
       * Y ADEMÁS lo elegido se dice con palabras dentro del goal. No es lo
       * mismo ni sustituye a lo otro: es que hoy el camino de producción
       * entiende una frase y todavía no sabe leer `lighting.type`, así que sin
       * esa frase lo que la persona eligió no llegaría a ninguna parte. Cuando
       * el plan sepa transportar la estructura, esta frase sobra.
       *
       * El texto de la persona NO se toca: se le añade delante de qué va y
       * detrás con qué, y lo suyo queda entero en medio.
       */
      const creative = filtrarCreativo(controles);
      const conPalabras = creativoEnPalabras(creative, t);
      const nombre = experiencia ? t(experiencia.clave) : '';

      const contexto: ContextoDeExperiencia = {
        experienceId: destino.experienceId,
        workspace: 'studio',
        goal: [nombre ? `${nombre}:` : '', texto, conPalabras ? `· ${conPalabras}` : '']
          .filter(Boolean)
          .join(' '),
        ...(Object.keys(creative).length ? { creative } : {}),
        /*
         * LO QUE ELEGIR LA EXPERIENCIA YA CONTESTÓ.
         *
         * Por el canal que existe desde siempre para esto —`presets`, el mismo
         * de las acciones de los especialistas—, así que la conversación empieza
         * donde tiene que empezar en vez de preguntar lo que la persona acaba de
         * decir al tocar "Retrato".
         *
         * Y es lo que hace que el plan sea de VERDAD el de crear una imagen:
         * sin esto la plantilla deducía la acción de las palabras del objetivo,
         * no encontraba ninguna que significara «desde cero», y acababa pidiendo
         * una foto para editar.
         */
        ...(experiencia?.respuestas?.length ? { presets: [...experiencia.respuestas] } : {}),
        ...(adjuntos.length ? { adjuntos } : {}),
        /*
         * La primera foto entra además por donde ya entraban las fotos
         * (`imageUri` → `creatorUploads` → Storage de Weë). No se duplica el
         * almacén: es el mismo camino de siempre, y `adjuntos` solo añade de
         * QUÉ CLASE es cada material, que es lo que ese camino no sabe.
         */
        ...(adjuntos[0] ? { imageUri: adjuntos[0].uri } : {}),
      };

      /*
       * Nada se cobra por llegar: `CreatorFlow` pregunta y planifica con
       * `creditsCharged: 0`, y el dinero no se mueve hasta que la persona ve el
       * plan con su precio y pulsa Crear.
       */
      navigation.navigate('CreatorFlow', contexto);
      return;
    }

    setEstado('creando');
    temporizador.current = setTimeout(() => setEstado('listo'), LO_QUE_TARDA_LA_DEMO);
  }, [prompt, experiencia, entrada, controles, adjuntos, navigation, t]);

  /**
   * LO ELEGIDO DENTRO DE UNA PUERTA VUELVE AL COMPOSITOR.
   *
   * No abre otra pantalla ni pide más datos: deja la intención puesta donde se
   * escribe, que es un solo sitio. Los controles de cámara se guardan tal cual
   * —rutas del lenguaje creativo de Weë— para viajar con la creación.
   */
  const alElegir = useCallback((eleccion: EleccionDeStudio) => {
    const puerta = entradaPorId(eleccion.entrada);
    if (puerta && eleccion.entrada !== 'more') { setArea(puerta.area); setEntrada(eleccion.entrada); }
    setControles(eleccion.controles);
    setExperiencia(
      eleccion.experiencia
        ? {
            id: eleccion.experiencia.id,
            clave: eleccion.experiencia.clave,
            experienceId: puerta?.experienceId,
            /* Lo que elegirla ya contesta: viaja con el trabajo para no repreguntarlo. */
            respuestas: eleccion.experiencia.respuestas,
          }
        : null
    );
    setPanel(null);
    /*
     * LO ELEGIDO YA NO SE ESCRIBE DENTRO DE LA CAJA.
     *
     * Antes se ponía "Retrato: " delante de lo que la persona fuera a escribir.
     * Era cómodo de ver y caro de mantener: mezclaba en un solo texto la
     * experiencia —que es un dato— con lo que alguien quería decir, y luego no
     * había forma de volver a separarlos. La experiencia ya se ve como ficha y
     * viaja como dato; la caja se queda para las palabras de la persona.
     *
     * Una herramienta del catálogo de siempre sí deja su nombre escrito: no es
     * una experiencia, no tiene dónde viajar, y perderla sería peor.
     */
    const clave = eleccion.herramienta?.clave;
    if (clave) setPrompt((antes) => (antes.trim() ? antes : `${t(clave)}: `));
  }, [t]);

  /**
   * UNA REFERENCIA DE VERDAD, POR EL CAMINO DE SIEMPRE.
   *
   * El mismo selector que usan Weë Brain y Weë Chef. Lo que se guarda es un
   * `Adjunto` con su CLASE —una referencia inspira, no se reproduce—, y quien
   * sube el archivo sigue siendo `creatorUploads` cuando llegue el momento:
   * aquí no hay almacén, ni se crea uno.
   */
  const alAnadirReferencia = useCallback(async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) return;
    const elegido = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    const foto = elegido.canceled ? null : elegido.assets?.[0];
    if (!foto?.uri) return;
    setAdjuntos((antes) => [
      ...antes,
      { clase: 'referencia', uri: foto.uri, nombre: foto.fileName ?? undefined },
    ]);
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
            entrada={panel}
            porFila={isMobile ? 2 : 3}
            onVolver={() => setPanel(null)}
            onElegir={alElegir}
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

            {/*
              LA CAJA, MÁS CERCA DE LA PRESENTACIÓN (decisión del usuario,
              2026-09-16, solo en Weë Studio).

              Entre el último renglón de la cabecera y la caja había 44 puntos:
              20 del aire de abajo de la cabecera y 24 del `gap` de esta página.
              Demasiado para lo primero que se hace al entrar. Se recortan aquí
              —y solo aquí— con un margen negativo, que es lo que deja el hueco
              en unos 18 sin tocar ni la cabecera ni la caja, que las comparten
              todas las demás secciones.

              La caja es la misma y crece igual: esto mueve dónde empieza, no
              cuánto mide.
            */}
            <View style={styles.cajaArriba}>
              <StudioPromptComposer
                valor={prompt}
                onCambiar={setPrompt}
                onAjustes={() => setAjustesAbiertos(true)}
                onReferencia={alAnadirReferencia}
                onVoz={alAnadirReferencia}
                onCrear={alCrear}
                ocupado={estado === 'creando'}
              />
            </View>

            {/*
              LO QUE WEË YA SABE, A LA VISTA Y QUITABLE.

              La experiencia elegida, sus controles de cámara y las referencias
              añadidas. No está aquí de adorno: está para que nadie tenga que
              acordarse de lo que eligió hace tres pantallas, y para que no se
              lo vuelvan a preguntar. Tocar una ficha la suelta.
            */}
            {(!!experiencia || Object.keys(controles).length > 0 || adjuntos.length > 0) && (
              <View style={styles.contexto}>
                {!!experiencia && (
                  <FichaDeContexto
                    icono="sparkles-outline"
                    texto={t(experiencia.clave)}
                    onQuitar={() => { setExperiencia(null); setControles({}); }}
                    etiquetaQuitar={t('studio.removeContext')}
                  />
                )}
                {Object.entries(controles).map(([ruta, valor]) => (
                  <FichaDeContexto
                    key={ruta}
                    icono="videocam-outline"
                    texto={nombreDelControl(ruta, valor, t)}
                    onQuitar={() => setControles((antes) => { const { [ruta]: _f, ...resto } = antes; return resto; })}
                    etiquetaQuitar={t('studio.removeContext')}
                  />
                ))}
                {adjuntos.map((a, i) => (
                  <FichaDeContexto
                    key={`${a.uri}-${i}`}
                    icono="image-outline"
                    texto={a.nombre ?? t('studio.reference')}
                    onQuitar={() => setAdjuntos((antes) => antes.filter((_, j) => j !== i))}
                    etiquetaQuitar={t('studio.removeContext')}
                  />
                ))}
              </View>
            )}

            <StudioEntradas porFila={porFila} onAbrir={(entrada) => setPanel(entrada)} />

            <FilaDeCreaciones
              creaciones={CREACIONES_DEL_STUDIO}
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
      <AvisoDeCreacion
        estado={estado}
        bottom={SITIO_DE_LA_BARRA + alturaTeclado}
        onCerrar={() => setEstado('quieto')}
      />

      <AjustesContextuales
        visible={ajustesAbiertos}
        contexto={contexto}
        elegido={ajustes}
        sugerido={sugerido}
        referencias={adjuntos.length}
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
  /* Sube la caja 26 de los 44 que la separaban de la cabecera. Deja unos 18. */
  cajaArriba: { marginTop: -scale(26) },
  /* Lo que Weë ya sabe, justo debajo de donde se escribe. */
  contexto: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    marginTop: -SPACING.md,
  },
});

/*
 * Weë Studio es de la CUENTA, como el resto del taller: se ve claro lleves
 * puesto el Perfil Real o el Perfil Weë.
 */
export default enTemaClaro(StudioScreen);
