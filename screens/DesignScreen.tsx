import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import AvisoDeCreacion, { EstadoDeCreacion } from '../components/creator/AvisoDeCreacion';
import FilaDeCreaciones from '../components/creator/FilaDeCreaciones';
import FichaDeContexto from '../components/creator/FichaDeContexto';
import EspacioDeEscritura, { useAlturaDelTeclado } from '../components/EspacioDeEscritura';
import { ALTO_BARRA } from '../components/BarraInferior';
import DesignExplore from '../components/design/DesignExplore';
import DesignPanel from '../components/design/DesignPanel';
import { siempreSePregunta } from '../constants/ajustesContextuales';
import { AJUSTES_DE_DESIGN, CREACIONES_DE_DESIGN, CategoriaDeDesign, PuntoDePartida } from '../constants/designTools';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

/** Cuánto tarda la creación de mentira. Lo justo para ver el estado. */
const LO_QUE_TARDA_LA_DEMO = 1600;

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
 * ── Lo que todavía no hay ────────────────────────────────────────────────────
 *
 * No hay IA. Crear enseña "Creando..." y luego "Creación lista", nada más. El
 * punto por donde entrará Weë Brain es `alCrear`.
 */
const DesignScreen: React.FC = () => {
  const { theme } = useTheme();
  const t = useT();
  const navigation = useNavigation<any>();
  const { isMobile, isDesktop } = useResponsive();
  const alturaTeclado = useAlturaDelTeclado();

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
  const [estado, setEstado] = useState<EstadoDeCreacion>('quieto');
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Un temporizador pendiente no puede sobrevivir a la pantalla. */
  useEffect(() => () => { if (temporizador.current) clearTimeout(temporizador.current); }, []);

  /*
   * Tres por fila cuando hay sitio, dos en el teléfono. Con tarjetas compactas
   * tres cabrían a 430, pero a 360 la pista se partiría en cuatro líneas: dos
   * por fila se lee igual de bien en todos los teléfonos.
   */
  const porFila = isMobile ? 2 : 3;
  const anchoMaximo = isMobile ? undefined : scale(720);

  const alCrear = useCallback(() => {
    if (!prompt.trim()) return;
    setEstado('creando');
    /*
     * AQUÍ ENTRA WEË BRAIN EL DÍA QUE SE CONECTE.
     *
     * Lo que hoy es un temporizador será mandar `prompt`, `ajustes` y
     * `referencias` a Brain, que decide el plan, y de ahí al WEE AI Gateway y al
     * modelo. La pantalla ya tiene esos datos reunidos y un estado que enseñar
     * mientras tanto.
     */
    temporizador.current = setTimeout(() => setEstado('listo'), LO_QUE_TARDA_LA_DEMO);
  }, [prompt]);

  const alElegirPunto = useCallback((punto: PuntoDePartida) => {
    /* La idea queda empezada, para terminarla con palabras propias. */
    setCamino([]);
    setPrompt((antes) => (antes.trim() ? antes : `${t(punto.clave)} `));
  }, [t]);

  const alAnadirReferencia = useCallback(() => {
    /* Sin selector de archivos todavía: una de muestra, para ver la forma. */
    setReferencias((antes) => [...antes, `referencia-${antes.length + 1}.png`]);
  }, []);

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
                onVoz={alAnadirReferencia}
                onCrear={alCrear}
                ocupado={estado === 'creando'}
              />
            </View>

{/* La misma ficha que en Weë Studio: lo que ya se sabe, a la vista. */}
            {referencias.length > 0 && (
              <View style={styles.referencias}>
                {referencias.map((r, i) => (
                  <FichaDeContexto key={`${r}-${i}`} icono="image-outline" texto={r} />
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
            */}
            <FilaDeCreaciones
              creaciones={CREACIONES_DE_DESIGN}
              ancho={scale(140)}
              alto={scale(120)}
              onVerTodas={() => navigation.navigate('Projects')}
            />
          </View>
        </PaginaDeCajas>
      </EspacioDeEscritura>

      {/* Como en el Studio: el aviso sube con el teclado y nunca se queda detrás. */}
      <AvisoDeCreacion
        estado={estado}
        bottom={SITIO_DE_LA_BARRA + alturaTeclado}
        onCerrar={() => setEstado('quieto')}
      />

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
