import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import IconoDireccional from '../IconoDireccional';
import { IconoWee } from '../icons/IconoWee';
import { RellenoDeDegradado } from '../GradienteDeMarca';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { ARTE_WEEAI } from '../../constants/marca';
import { NOMBRE_CORTO_DE_BRAIN } from '../../constants/myWeesDestinos';
import { uriDelHalo, uriDeLasOndas } from './arteDeWeeAi';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

/**
 * LA TARJETA DE WEËAI — una pieza con luz, no un rectángulo de color.
 *
 * Dos variantes de la misma familia (quien ve una reconoce la otra):
 *
 *  · `portada` (el Home): superficie casi blanca con un lavado lila y un ARCO de color —dorado, rosa, violeta— que cruza
 *    por detrás del chip; «WeëAI» grande y pesado con su chispa dorada; el lema; el chip de Weë Brain, blanco y posado
 *    sobre el arco; y la PUERTA «¿Qué quieres crear hoy?», una píldora blanca con borde en degradado y un botón que es
 *    el punto más saturado de la pantalla.
 *  · `menu` (el ☰ y la barra lateral): tarjeta blanca con borde en degradado, un racimo de chispas violetas, el nombre y
 *    el lema, un botón blanco con su flecha, y las ONDAS de color en la esquina: el eco del arco.
 *
 * LA PUERTA NO ES UNA CAJA DE ESCRIBIR
 * ------------------------------------
 * Decisión del dueño (2026-11-15): en el Home, «¿Qué quieres crear hoy?» es una puerta de entrada. Al pulsarla —ella, su
 * botón o sus iconos de imagen y de vídeo— se abre Weë Brain, y es allí, en su caja de siempre, donde se escribe y se
 * adjunta. Aquí no hay campo de texto ni se lleva nada a Weë Brain. Por eso es UN botón con la forma de la caja: la
 * conversación sigue teniendo una sola caja, la de Weë Brain. Los iconos de dentro son parte del dibujo de ese botón.
 *
 * DE DÓNDE SALE CADA COSA
 * -----------------------
 * Colores, degradados, radios y sombras: `ARTE_WEEAI` (constants/marca.ts), muestreados de las referencias del dueño.
 * El arco y las ondas: vectores de `arteDeWeeAi.ts`, pintados con `expo-image`. Los textos: i18n. «WeëAI» y «Brain» son
 * marca.
 *
 * MOVIMIENTO, CON CONTENCIÓN
 * --------------------------
 * La tarjeta entra una vez (sube unos puntos y aparece), el arco respira muy despacio y los botones responden al dedo.
 * Con «reducir movimiento» activo no se mueve nada: la tarjeta está, sin más. Nada depende de la animación para verse.
 */
interface Props {
  variante: 'portada' | 'menu';
  /** Abre el centro creativo de WeëAI (`WeeCreator`). */
  onOpenWeeAi: () => void;
  /** Abre Weë Brain. Solo en la portada: es lo que hacen la puerta y el chip. */
  onOpenBrain?: () => void;
}

const isWeb = Platform.OS === 'web';

/** Quien prefiere menos movimiento lo dice en el sistema; en la web, por `prefers-reduced-motion`. */
const usePrefiereQuietud = (): boolean => {
  const [quieto, setQuieto] = useState(() => {
    if (!isWeb || typeof window === 'undefined' || !window.matchMedia) return false;
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (isWeb) return;
    let vivo = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => vivo && setQuieto(!!v))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);
  return quieto;
};

const TarjetaWeeAi: React.FC<Props> = ({ variante, onOpenWeeAi, onOpenBrain }) => {
  const { theme } = useTheme();
  const t = useT();
  const dir = useDireccion();
  const arte = theme.dark ? ARTE_WEEAI.oscuro : ARTE_WEEAI.claro;
  const quieto = usePrefiereQuietud();

  /* La entrada y el brillo. Valores fijos cuando se prefiere quietud: la tarjeta nace ya puesta. */
  const entrada = useRef(new Animated.Value(quieto ? 1 : 0)).current;
  const brillo = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (quieto) {
      entrada.setValue(1);
      brillo.setValue(1);
      return;
    }
    Animated.timing(entrada, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: !isWeb }).start();
    const respirar = Animated.loop(
      Animated.sequence([
        Animated.timing(brillo, { toValue: 0.78, duration: 4200, easing: Easing.inOut(Easing.sin), useNativeDriver: !isWeb }),
        Animated.timing(brillo, { toValue: 1, duration: 4200, easing: Easing.inOut(Easing.sin), useNativeDriver: !isWeb }),
      ]),
    );
    respirar.start();
    return () => respirar.stop();
  }, [quieto, entrada, brillo]);

  const sombraDeTarjeta = {
    shadowColor: arte.sombra,
    shadowOpacity: ARTE_WEEAI.sombraDeTarjeta.opacidad,
    shadowRadius: ARTE_WEEAI.sombraDeTarjeta.radio,
    shadowOffset: { width: 0, height: ARTE_WEEAI.sombraDeTarjeta.desplazamiento },
    elevation: ARTE_WEEAI.sombraDeTarjeta.elevacion,
  };
  const sombraDeBoton = {
    shadowColor: arte.accion[3],
    shadowOpacity: ARTE_WEEAI.sombraDeBoton.opacidad,
    shadowRadius: ARTE_WEEAI.sombraDeBoton.radio,
    shadowOffset: { width: 0, height: ARTE_WEEAI.sombraDeBoton.desplazamiento },
    elevation: ARTE_WEEAI.sombraDeBoton.elevacion,
  };
  /* El foco del teclado se ve: un aro del acento de interacción alrededor de lo que lo tiene. */
  const aroDeFoco = { borderColor: theme.colors.interaction, borderWidth: 2 };
  const estiloDeEntrada = {
    /* Nunca invisible: si la animación no llega a correr (pestaña en segundo plano), la tarjeta se lee igual. */
    opacity: entrada.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
    transform: [{ translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [scale(10), 0] }) }],
  };

  const titulo = (grande: boolean) => (
    <View style={styles.titulo}>
      {/* WeëAI es marca: se escribe igual en todos los idiomas. Grande, pesado y apretado, con su chispa a la altura de la x. */}
      <Text style={[grande ? styles.nombre : styles.nombreDeMenu, { color: arte.titulo }]} numberOfLines={1}>{t('nav.weeAi')}</Text>
      <Ionicons name="sparkles" size={scale(grande ? 20 : 15)} color={arte.chispa} style={grande ? styles.chispaDelNombre : undefined} />
    </View>
  );

  if (variante === 'menu') {
    return (
      <Animated.View style={[styles.sombra, sombraDeTarjeta, estiloDeEntrada, dir.contenedor]}>
        <Pressable
          onPress={onOpenWeeAi}
          accessibilityRole="button"
          accessibilityLabel={t('nav.openWeeAi')}
          style={({ pressed }) => [styles.marcoDeMenu, pressed && styles.pulsada]}
        >
          {({ focused }: { pressed: boolean; focused?: boolean }) => (
            <>
              {/* El borde en degradado: dorado en la esquina de abajo del inicio, violeta arriba y al final. */}
              <RellenoDeDegradado colores={arte.bordeDegradado} radio={ARTE_WEEAI.radioDeTarjeta} diagonal espejo={dir.esRTL} />
              <View style={[styles.interiorDeMenu, { backgroundColor: arte.superficie }, focused && aroDeFoco]}>
                {/* El lavado: blanco al inicio, lila hacia el final, como la tarjeta del Home. */}
                <RellenoDeDegradado colores={[arte.superficie, arte.lavadoArriba]} espejo={dir.esRTL} />
                {/* Las ondas, por detrás del botón, en la esquina inferior del final. En RTL se reflejan con la tarjeta. */}
                <Animated.View style={[styles.ondas, dir.alFinal(0), dir.espejo, { opacity: brillo }]} pointerEvents="none">
                  <Image source={{ uri: uriDeLasOndas(arte) }} style={StyleSheet.absoluteFill} contentFit="fill" transition={0} accessible={false} />
                </Animated.View>
                {/* El racimo de chispas: una grande y dos pequeñas, en violeta. */}
                <Ionicons name="sparkles-outline" size={scale(30)} color={theme.colors.interaction} style={dir.espejo} />
                <View style={styles.textos}>
                  {titulo(false)}
                  <Text style={[styles.lemaDeMenu, dir.texto, { color: arte.lema }]} numberOfLines={3}>{t('menu.weeAiTagline')}</Text>
                </View>
                <View style={[styles.botonDeMenu, { backgroundColor: arte.chip, borderColor: theme.colors.interactionBorder }, sombraDeBoton, { shadowColor: arte.sombra, shadowOpacity: 0.18 }]}>
                  <IconoDireccional name="arrow-forward" size={scale(17)} color={theme.colors.interaction} />
                </View>
              </View>
            </>
          )}
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.sombra, styles.portada, sombraDeTarjeta, estiloDeEntrada, dir.contenedor]}>
      <View style={[styles.superficie, { backgroundColor: arte.superficie, borderColor: theme.colors.interactionBorder }]}>
        {/* El lavado y el arco: la firma de la tarjeta. Un vector que se estira con ella; en RTL se refleja. */}
        <Animated.View style={[StyleSheet.absoluteFill, dir.espejo, { opacity: brillo }]} pointerEvents="none">
          <Image source={{ uri: uriDelHalo(arte) }} style={StyleSheet.absoluteFill} contentFit="fill" transition={0} accessible={false} />
        </Animated.View>

        <View style={styles.cabecera}>
          <Pressable
            style={({ pressed }) => [styles.textos, pressed && styles.pulsada]}
            onPress={onOpenWeeAi}
            accessibilityRole="button"
            accessibilityLabel={t('nav.openWeeAi')}
          >
            {titulo(true)}
            <Text style={[styles.lema, dir.texto, { color: arte.lema }]} numberOfLines={2}>{t('home.weeAiTagline')}</Text>
          </Pressable>
          {/* El chip de Weë Brain: una píldora blanca con su sombra, posada sobre el arco. Abre lo mismo que la puerta. */}
          <Pressable
            onPress={onOpenBrain}
            accessibilityRole="button"
            accessibilityLabel={t('home.openBrain')}
            style={({ pressed, focused }: { pressed: boolean; focused?: boolean }) => [
              styles.chip,
              { backgroundColor: arte.chip, borderColor: 'transparent' },
              sombraDeBoton,
              { shadowColor: arte.sombra, shadowOpacity: 0.16 },
              pressed && styles.hundido,
              focused && aroDeFoco,
            ]}
          >
            <IconoWee name="cerebro" size={scale(19)} color={theme.colors.interaction} />
            <Text style={[styles.chipTexto, { color: arte.titulo }]} numberOfLines={1}>{NOMBRE_CORTO_DE_BRAIN}</Text>
          </Pressable>
        </View>

        {/*
          LA PUERTA. Un solo botón con la forma de la caja: borde en degradado dorado → violeta, chispa, la pregunta, los
          iconos de imagen y de vídeo y el botón de enviar. Todo él abre Weë Brain; nada de lo que se ve dentro es un
          control aparte, y por eso no lleva nombre propio para el lector de pantalla.
        */}
        <Pressable
          onPress={onOpenBrain}
          accessibilityRole="button"
          accessibilityLabel={`${t('nav.weeAiQuestion')} ${t('home.openBrain')}`}
          style={({ pressed }) => [styles.puerta, sombraDeBoton, { shadowColor: arte.accion[3], shadowOpacity: 0.14 }, pressed && styles.pulsada]}
        >
          {({ pressed, focused }: { pressed: boolean; focused?: boolean }) => (
            <>
              <RellenoDeDegradado colores={arte.bordeDegradado} radio={BORDER_RADIUS.full} espejo={dir.esRTL} />
              <View style={[styles.puertaInterior, { backgroundColor: arte.superficie }, focused && aroDeFoco]}>
                <Ionicons name="sparkles" size={scale(18)} color={arte.chispa} />
                <Text style={[styles.pregunta, dir.texto, { color: arte.lema }]} numberOfLines={2}>{t('nav.weeAiQuestion')}</Text>
                <Ionicons name="image-outline" size={scale(20)} color={arte.titulo} style={styles.iconoDeLaPuerta} />
                <Ionicons name="videocam-outline" size={scale(21)} color={arte.titulo} style={styles.iconoDeLaPuerta} />
                <View style={[styles.enviar, sombraDeBoton, pressed && styles.hundido]}>
                  <RellenoDeDegradado colores={arte.accion} radio={scale(19)} diagonal espejo={dir.esRTL} />
                  <IconoDireccional name="arrow-forward" size={scale(19)} color={arte.sobreAccion} />
                </View>
              </View>
            </>
          )}
        </Pressable>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  /* La sombra va en un envoltorio sin recorte: si fuera en la superficie, que recorta el arco, se recortaría con él. */
  sombra: {
    borderRadius: ARTE_WEEAI.radioDeTarjeta,
  },
  /* En pantallas anchas la tarjeta no se estira como una banda: tiene un ancho máximo y se centra. */
  portada: {
    width: '100%',
    maxWidth: scale(680),
    alignSelf: 'center',
  },
  superficie: {
    borderRadius: ARTE_WEEAI.radioDeTarjeta,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
    gap: SPACING.md,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  textos: {
    flex: 1,
    minWidth: 0,
    gap: scale(3),
  },
  titulo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
  },
  /* Grande, pesado y apretado. Es marca en alfabeto latino: el espaciado negativo no rompe ninguna escritura. */
  nombre: {
    fontSize: scale(29),
    lineHeight: scale(34),
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: scale(-0.9),
    flexShrink: 1,
  },
  chispaDelNombre: {
    marginTop: -scale(6),
  },
  nombreDeMenu: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: scale(-0.4),
    flexShrink: 1,
  },
  lema: {
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(19),
  },
  lemaDeMenu: {
    fontSize: FONT_SIZE.xs,
    lineHeight: scale(17),
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    minHeight: 44,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 2,
    flexShrink: 0,
  },
  chipTexto: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  /* La puerta: el borde es el degradado de fuera; lo de dentro, la píldora blanca. */
  puerta: {
    borderRadius: BORDER_RADIUS.full,
    padding: scale(1.5),
  },
  puertaInterior: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    minHeight: scale(50),
    paddingStart: SPACING.md,
    paddingEnd: scale(6),
    borderRadius: BORDER_RADIUS.full,
  },
  pregunta: {
    flex: 1,
    minWidth: 0,
    fontSize: FONT_SIZE.base,
  },
  iconoDeLaPuerta: {
    opacity: 0.78,
  },
  enviar: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(19),
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* La tarjeta del menú: el degradado de fuera es el borde; dentro, la superficie con sus ondas. */
  marcoDeMenu: {
    borderRadius: ARTE_WEEAI.radioDeTarjeta,
    padding: 1.25,
  },
  interiorDeMenu: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    minHeight: scale(76),
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: ARTE_WEEAI.radioDeTarjeta - 1.5,
    overflow: 'hidden',
  },
  ondas: {
    position: 'absolute',
    bottom: 0,
    width: '50%',
    height: '78%',
  },
  botonDeMenu: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(19),
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulsada: { opacity: 0.92 },
  hundido: { transform: [{ scale: 0.94 }] },
});

export default TarjetaWeeAi;
