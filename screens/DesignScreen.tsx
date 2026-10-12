import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, enTemaClaro } from '../contexts/ThemeContext';
import { useT } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { useCreacionesDeDesign } from '../hooks/useCreacionesDeDesign';
import { PaginaDeCajas } from '../components/creator/CajaQueCrece';
import StudioHeader from '../components/studio/StudioHeader';
import StudioPromptComposer from '../components/studio/StudioPromptComposer';
import AjustesContextuales from '../components/creator/AjustesContextuales';
import FilaDeCreaciones from '../components/creator/FilaDeCreaciones';
import FichaDeContexto from '../components/creator/FichaDeContexto';
import EspacioDeEscritura from '../components/EspacioDeEscritura';
import { ALTO_BARRA } from '../components/BarraInferior';
import DesignExplore from '../components/design/DesignExplore';
import DesignPanel from '../components/design/DesignPanel';
import { siempreSePregunta } from '../constants/ajustesContextuales';
import { AJUSTES_DE_DESIGN, CREACIONES_DE_DESIGN, CategoriaDeDesign, PuntoDePartida } from '../constants/designTools';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/design';
import { contextoDeDesign, palabrasDeLosAjustes } from '../utils/contextoDeDesign';
import { notify } from '../utils/notify';
import { scale } from '../utils/scale';

/** El hueco que deja la barra global de abajo. */
const SITIO_DE_LA_BARRA = scale(96);

/**
 * Sus ajustes se preguntan siempre: en Weë Design siempre se está diseñando
 * algo que se ve, así que no hay contexto del que dependan. Se pone la forma
 * del panel común una sola vez, fuera del componente: es una tabla, no cambia.
 */
const AJUSTES = siempreSePregunta(AJUSTES_DE_DESIGN);

/**
 * WEË DESIGN — DISEÑAR CASI CUALQUIER COSA.
 *
 * ── Qué es esta pantalla ─────────────────────────────────────────────────────
 *
 * El sitio de Weë para diseñar y visualizar lo físico: una sala, una casa, un
 * yate de quince metros, un avión privado, una silla. El orden es el mismo que
 * en Weë Studio —nombre, caja, puertas, lo ya hecho— porque es la misma
 * familia y quien viene de uno tiene que reconocer el otro sin pensar.
 *
 * ── Lo que comparte con Weë Studio, y lo que no ──────────────────────────────
 *
 * Comparte las piezas que son iguales DE VERDAD: la cabecera, la caja donde se
 * escribe y el panel de ajustes. Si esas cambian, cambian en los dos sitios a
 * la vez y no pueden separarse.
 *
 * Tiene suyo lo que es suyo: sus categorías —que son puertas de entrada, no
 * límites—, sus ajustes —estilo, materiales, luz— y su galería. Así Weë Design
 * puede crecer hacia donde necesite sin arrastrar la estructura del Studio.
 *
 * ── Crear es irse a crear ────────────────────────────────────────────────────
 *
 * Esta pantalla no genera nada: `alCrear` lleva lo escrito y los ajustes elegidos
 * —dichos en palabras— a `CreatorFlow`, que es donde están las preguntas, el plan
 * con su precio, la reserva, el progreso y el resultado. No hay Brain propio, ni
 * Planner propio, ni trabajo propio, ni Credits propios: todo eso existe una vez y
 * está detrás de esa experiencia (`puente-design.test.mjs`).
 *
 * ── Lo que todavía no viaja ──────────────────────────────────────────────────
 *
 * Ni la puerta por la que se pasó (llevar cada puerta a una intención de la
 * plantilla es una decisión del dueño: D1 y D7 de `docs/DESIGN.md` §4), ni las
 * referencias (son nombres de muestra: D6), ni formato y calidad como estructura
 * (el plan solo los lee como palabras). Qué presupone este puente y cómo se
 * cambia con otra respuesta: `docs/WEE-DESIGN-PUENTE.md`.
 *
 * ── Mis creaciones es de la persona, y las muestras son ejemplos ─────────────
 *
 * La fila de abajo enseña lo que ESTA persona ha creado aquí —en Weë Design y en
 * Hogar & Diseño, de su cuenta— con el camino que ya usa Weë Chef
 * (`useCreacionesDeDesign`). Mientras llega, dice que carga; si falla, lo dice y
 * deja reintentar. Las cuatro muestras solo se ven sin sesión o sin nada creado, y
 * rotuladas «Ejemplos»: «Mis creaciones» solo se dice de lo que es suyo. Crear no
 * depende de esa fila: funciona igual mientras carga o si falló.
 */
const DesignScreen: React.FC = () => {
  const { theme } = useTheme();
  const t = useT();
  const navigation = useNavigation<any>();
  /* El proyecto desde el que se llegó (`Specialist` lo trae en su ruta): lo que se cree desde aquí nace en él (P11). Sin proyecto no viaja la clave. */
  const projectId: string | undefined = useRoute<any>().params?.projectId;
  const { user } = useAuth();
  const { isMobile, isDesktop } = useResponsive();

  const [prompt, setPrompt] = useState('');
  /*
   * DÓNDE ESTÁS DENTRO DE DESIGN, EN ORDEN.
   *
   * No es un sitio, es un camino: se puede entrar en Vehículos desde la portada
   * o desde "Ver todas", y volver tiene que devolver a donde se vino, no siempre
   * al principio. Por eso se guarda la pila —lo último es lo que se ve— y volver
   * es quitar el último paso. Vacía, se está en la portada.
   */
  const [camino, setCamino] = useState<(CategoriaDeDesign | 'todas')[]>([]);
  const vista = camino.length > 0 ? camino[camino.length - 1] : null;
  const abrir = useCallback((paso: CategoriaDeDesign | 'todas') => setCamino((antes) => [...antes, paso]), []);
  const volver = useCallback(() => setCamino((antes) => antes.slice(0, -1)), []);
  const [ajustesAbiertos, setAjustesAbiertos] = useState(false);
  const [ajustes, setAjustes] = useState<Record<string, string>>({});
  const [referencias, setReferencias] = useState<string[]>([]);
  const numeroDeReferencia = useRef(0);

  /*
   * LO QUE ESTA PERSONA HA CREADO. Sin sesión, o con sesión y nada creado, la fila enseña las muestras como lo que son:
   * ejemplos. Mientras carga, o si falló, no enseña ninguna (ni las muestras ni un «no tienes nada»).
   */
  const mias = useCreacionesDeDesign();
  const deMuestra = mias.fase === 'sinSesion' || (mias.fase === 'lista' && mias.creaciones.length === 0);

  /*
   * Tres por fila cuando hay sitio, dos en el teléfono. Con tarjetas compactas
   * tres cabrían a 430, pero a 360 la pista se partiría en cuatro líneas: dos
   * por fila se lee igual de bien en todos los teléfonos.
   */
  const porFila = isMobile ? 2 : 3;
  const anchoMaximo = isMobile ? undefined : scale(720);

  /**
   * CREAR EN WEË DESIGN ES IRSE A CREAR, NO CREAR AQUÍ.
   *
   * Lo escrito y los ajustes elegidos, en palabras, viajan a `CreatorFlow`: allí se pregunta lo que falta, se enseña el plan con su
   * precio y solo después de que la persona lo confirme se reserva un Credit. Llegar no cuesta nada: esta pantalla no toca el
   * dinero ni llama a nadie para crear (lo único que lee es lo ya creado, para la fila «Mis creaciones» de abajo).
   *
   * El contexto lo arma `contextoDeDesign`, el mismo de la referencia funcional (un solo sitio), y NO lleva la puerta por la que se
   * pasó ni foto alguna: ver la cabecera de la pantalla.
   *
   * ── Los casos de borde ────────────────────────────────────────────────
   *
   * · Caja vacía: no hace nada. El botón ya está apagado (la caja lo apaga mientras no haya texto: `CajaDePrompt`), así que esto
   *   es solo la red de seguridad; no se inventa un objetivo para quien no escribió nada.
   * · Un punto de partida sin más texto: `alElegirPunto` ya dejó la idea empezada en la caja y esa es la que sale.
   * · Sin sesión: a entrar, como el resto de pantallas de Weë AI. Con la caja vacía ni eso.
   * · Doble toque: dos `navigate` iguales dejan UNA sola `CreatorFlow` (la pila reutiliza la pantalla que ya está arriba). Con
   *   `push` serían dos creaciones: por eso es `navigate`.
   * · Volver atrás: la pantalla queda debajo con su caja, sus ajustes y sus referencias; no se vacía nada al irse.
   */
  const alCrear = useCallback(() => {
    const contexto = contextoDeDesign({
      intencion: 'crear',
      texto: prompt,
      ajustesEnPalabras: palabrasDeLosAjustes(ajustes, t).join(', '),
    });
    if (!contexto) return;
    if (!user) { navigation.navigate('Login'); return; }
    navigation.navigate('CreatorFlow', { ...contexto, ...(projectId ? { projectId } : {}) });
  }, [prompt, ajustes, user, navigation, t, projectId]);

  const alElegirPunto = useCallback((punto: PuntoDePartida) => {
    /* La idea queda empezada, para terminarla con palabras propias. */
    setCamino([]);
    setPrompt((antes) => (antes.trim() ? antes : `${t(punto.clave)} `));
  }, [t]);

  const alAnadirReferencia = useCallback(() => {
    /*
     * Sin selector de archivos todavía: una de muestra, para ver la forma. El número
     * sale de un contador y no del largo de la lista: al quitar una y añadir otra,
     * dos fichas no pueden acabar llamándose igual.
     */
    numeroDeReferencia.current += 1;
    const nombre = `referencia-${numeroDeReferencia.current}.png`;
    setReferencias((antes) => [...antes, nombre]);
  }, []);

  /* Lo que se adjunta se puede soltar: como en Weë Studio, tocar la ficha la quita. */
  const alQuitarReferencia = useCallback((posicion: number) => {
    setReferencias((antes) => antes.filter((_, j) => j !== posicion));
  }, []);

  /*
   * Tocar una creación la REABRE donde estaba, con su resultado: el mismo trabajo, en su experiencia (Design u Hogar & Diseño).
   * Ni crea otro, ni manda un proyecto ni un texto: lo que ya hay se abre por su identificador, como en Weë Chef y en Mis
   * creaciones.
   */
  const alAbrirCreacion = useCallback((id: string) => {
    const trabajo = mias.trabajoDe(id);
    if (trabajo) navigation.navigate('CreatorFlow', { experienceId: trabajo.experienceId, jobId: trabajo.id });
  }, [mias, navigation]);

  /*
   * ATRÁS DESHACE UN PASO, NO LA SECCIÓN.
   *
   * Dentro de Design, el gesto de atrás deshace el último paso del camino —de
   * una categoría a "Ver todas", de ahí a la portada— y solo desde la portada
   * sale de la sección. Lo escrito, las referencias y los ajustes se quedan: se
   * está dentro de la misma creación todo el rato.
   */
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android' || camino.length === 0) return;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        volver();
        return true;
      });
      return () => sub.remove();
    }, [camino.length, volver])
  );

  /* ── Una categoría, o "Ver todas", ocupa la pantalla entera ─────────────── */
  if (vista) {
    return (
      <SafeAreaView style={[styles.pantalla, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <View style={[styles.centrado, anchoMaximo ? { maxWidth: anchoMaximo } : null]}>
          <DesignPanel
            vista={vista}
            onVolver={volver}
            onAbrirCategoria={abrir}
            onElegirPunto={alElegirPunto}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.pantalla, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Como en Weë Studio: la caja crece hasta llenar lo que se ve y sus botones no se salen de la vista. */}
      <EspacioDeEscritura style={styles.scroll} descuento={isDesktop ? 0 : ALTO_BARRA}>
        <PaginaDeCajas
          style={styles.scroll}
          contentContainerStyle={styles.dentro}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.centrado, anchoMaximo ? { maxWidth: anchoMaximo } : null]}>
            <StudioHeader nombre="Design" claveLema="design.slogan" claveDescripcion="design.description" />

            {/*
              LA CAJA, MÁS CERCA DE LA PRESENTACIÓN (decisión del usuario,
              2026-09-16, solo en Weë Design; el mismo ajuste que ya lleva Weë
              Studio).

              Entre el último renglón de la cabecera y la caja había 48 puntos:
              20 del aire de abajo de la cabecera y 28 del `gap` de esta página.
              Se recortan aquí —y solo aquí— con un margen negativo, que deja el
              hueco en unos 18 sin tocar ni la cabecera ni la caja, que las
              comparten todas las demás secciones.

              La caja es la misma y crece igual: esto mueve dónde empieza, no
              cuánto mide.
            */}
            <View style={styles.cajaArriba}>
              <StudioPromptComposer
                placeholder={t('design.placeholder')}
                valor={prompt}
                onCambiar={setPrompt}
                onAjustes={() => setAjustesAbiertos(true)}
                onReferencia={alAnadirReferencia}
                /*
                  «Dictar» no añade una referencia: no hay dictado conectado en Weë Design
                  (auditoría UIUX H-1, 2026-10-07) y un botón que no hace lo que dice no
                  puede hacer otra cosa en silencio. Dice la verdad con la frase de siempre,
                  como Weë Business, hasta que haya dictado de verdad.
                */
                onVoz={() => notify(t('common.comingSoon'))}
                onCrear={alCrear}
              />
            </View>

{/* La misma ficha que en Weë Studio: lo que ya se sabe, a la vista. */}
            {referencias.length > 0 && (
              <View style={styles.referencias}>
                {referencias.map((r, i) => (
                  <FichaDeContexto
                    key={`${r}-${i}`}
                    icono="image-outline"
                    texto={r}
                    onQuitar={() => alQuitarReferencia(i)}
                    etiquetaQuitar={t('studio.removeContext')}
                  />
                ))}
              </View>
            )}

            <DesignExplore porFila={porFila} onAbrir={abrir} onVerTodas={() => abrir('todas')} />

            {/*
              La misma fila que la de Weë Studio —es la misma fila— con lo que
              se hace aquí: un interior, una casa, un barco, una silla. La
              etiqueta dice qué CLASE de diseño es, que es por lo que se busca en
              esta galería, no si es imagen o video.

              Un poco más ancha y más baja que la del Studio, porque un diseño se
              reconoce por lo ancho y un video por lo alto.

              Enseña lo que esta persona ha creado (`useCreacionesDeDesign`). Las
              muestras solo salen sin sesión o sin nada creado, y dicen que son
              ejemplos. «Ver todas» sigue yendo a donde iba (F-01, decisión del
              dueño: `docs/WEE-DESIGN-CIERRE.md`).
            */}
            <FilaDeCreaciones
              creaciones={deMuestra ? CREACIONES_DE_DESIGN : mias.creaciones}
              claveDelTitulo={deMuestra ? 'design.examplesTitle' : undefined}
              estado={mias.fase === 'cargando' ? 'cargando' : mias.fase === 'error' ? 'error' : undefined}
              onReintentar={mias.recargar}
              onAbrir={deMuestra ? undefined : alAbrirCreacion}
              ancho={scale(140)}
              alto={scale(120)}
              onVerTodas={() => navigation.navigate('Projects')}
            />
          </View>
        </PaginaDeCajas>
      </EspacioDeEscritura>

      {/*
        El panel de ajustes es el común de Weë AI, con el catálogo de Weë Design
        dentro. Antes había una segunda copia del panel solo para poder pasarle
        otra lista, y para usarla Weë Design tenía que decir que estaba en el
        área "imágenes" del Studio, que no es verdad y no lleva a ninguna parte.

        La pista de debajo del título es la suya: aquí los ajustes NO cambian con
        lo que se escribe, así que decir que cambian sería mentir.
      */}
      <AjustesContextuales
        visible={ajustesAbiertos}
        contexto="imagen"
        grupos={AJUSTES}
        pista={t('design.settingsHint')}
        referencias={referencias.length}
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
  dentro: { paddingBottom: SITIO_DE_LA_BARRA },
  /*
   * Más aire entre bloques que en el Studio: aquí hay menos cosas, y el vacío
   * es lo que hace que se lea "esto es sencillo" en vez de "esto tiene de todo".
   */
  centrado: { width: '100%', alignSelf: 'center', gap: SPACING.xxl + SPACING.xs, flex: 1 },
  /* Sube la caja 30 de los 48 que la separaban de la cabecera. Deja unos 18. */
  cajaArriba: { marginTop: -scale(30) },
  referencias: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    marginTop: -SPACING.lg,
  },
});

/*
 * Weë Design es de la CUENTA, como el resto del taller: se ve claro lleves
 * puesto el Perfil Real o el Perfil Weë.
 */
export default enTemaClaro(DesignScreen);
