import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  AppState,
  AccessibilityInfo,
  LayoutChangeEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { useIsFocused } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { getExperienceById, WeeExperience } from '../../constants/weeExperiences';
import { SPACING, FONT_WEIGHT } from '../../constants/design';
import { scale } from '../../utils/scale';

/**
 * EN QUÉ ESTÁ EL CEREBRO.
 *
 * Son estados VISUALES, no de negocio: no deciden nada, solo cambian el ritmo
 * de la respiración y de la energía. Están preparados para engancharse al
 * estado real de Weë Brain el día que el orquestador exista (CLAUDE.md §10);
 * hoy la pantalla pasa lo que ya sabe —si está esperando respuesta— y nada más.
 */
export type EstadoDelCerebro = 'quieto' | 'pensando' | 'respondiendo' | 'tropiezo';

interface Props {
  estado?: EstadoDelCerebro;
  /** Tocar un satélite lleva a esa sección. La navegación es la de siempre. */
  onSatelite: (experiencia: WeeExperience) => void;
}

/* ══ LA GEOMETRÍA ═══════════════════════════════════════════════════════════
 *
 * Seis satélites en hexágono alrededor del cerebro: uno arriba, uno abajo y
 * dos a cada lado. Las medidas salen de la referencia y se guardan como
 * PROPORCIONES, no como píxeles: así el sistema entero encoge en un teléfono
 * de 360 y crece en una tableta sin deformarse ni cortar a nadie.
 */

/** El disco blanco de un satélite. */
const DISCO = scale(52);
/** Lo que ocupa un satélite con su nombre debajo: manda el nombre, no el disco. */
const CELDA = scale(84);
const ALTO_DE_CELDA = DISCO + scale(24);
/*
 * Alto partido por ancho del hexágono. En la referencia son 220 sobre 302, o
 * sea 0,73; aquí es un punto más alto para que al cerebro —que ahora es una
 * lámina y ocupa más— le quede sitio a los lados de las conexiones de arriba y
 * de abajo, que son las más cortas.
 */
const PROPORCION = 0.78;
/** Más ancho que esto el sistema se desparrama y deja de leerse de un vistazo. */
const ANCHO_MAXIMO = scale(430);
/** Donde empieza la línea: el borde del resplandor, no el centro del cerebro. */
const RADIO_INTERIOR = scale(52);
/** La chispa que viaja. Pequeña a propósito: es una señal, no una bola de luz. */
const PUNTO = scale(5);
/** Lo que mide la lámina del cerebro. El dibujo trae su propio aire alrededor. */
const CEREBRO = scale(132);
const COS30 = Math.cos(Math.PI / 6);

/**
 * EL CEREBRO DE WEË, EL DE VERDAD.
 *
 * Es la imagen que eligió el usuario (2026-09-16), con su resplandor dorado y
 * su aro ya pintados dentro: por eso aquí no se le dibuja ninguno encima.
 *
 * Llegó en JPG y sobre blanco, pero un blanco de 243 a 254 con el grano de la
 * compresión, que sobre la página —blanco limpio— dibujaba un cuadro alrededor
 * del cerebro. Se guardó en WebP pasando ese blanco a TRANSPARENCIA: el mismo
 * dibujo, sin fondo, y de 434 KB a 93. Ahora se posa sobre lo que haya debajo
 * sin traerse una caja consigo.
 *
 * Es un archivo local, dentro de la app: ni se descarga, ni se genera, ni se le
 * pide nada a un servidor.
 */
export const CEREBRO_DE_WEE = require('../../assets/images/brain/cerebro-de-wee.webp');

/**
 * LOS SEIS, CON SU SITIO Y SU RITMO.
 *
 * El identificador es el de `constants/weeExperiences.ts` —de ahí salen el
 * nombre, el emoji y la ruta—, así que aquí solo se dice DÓNDE va cada uno y
 * CUÁNDO sale su chispa.
 *
 * Los dos tiempos son distintos en cada fila y a propósito: si todos midieran
 * lo mismo, las seis chispas acabarían saliendo a la vez y el cerebro
 * parpadearía como un adorno de navidad. Los seis ciclos —espera más viaje— no
 * son múltiplos entre sí, así que nunca se alinean por mucho rato que pase, y
 * el sistema parece despierto en vez de programado.
 *
 * La espera va como `delay` DENTRO del propio `timing`, no como un
 * `Animated.delay` delante: ese es siempre del hilo de JavaScript —lo fija React
 * Native, no se puede pedir otra cosa— y meterlo en la cadena obligaba a toda
 * la secuencia a pasar por él. Así el ciclo entero se queda en el hilo nativo.
 */
const SATELITES: { id: string; angulo: number; espera: number; viaje: number }[] = [
  { id: 'studio', angulo: -90, espera: 600, viaje: 2600 },
  { id: 'music', angulo: -30, espera: 900, viaje: 2900 },
  { id: 'design', angulo: 90, espera: 1250, viaje: 2740 },
  { id: 'business', angulo: 30, espera: 1550, viaje: 3080 },
  { id: 'chef', angulo: 150, espera: 1850, viaje: 2820 },
  { id: 'travel', angulo: 210, espera: 2150, viaje: 3200 },
];

/**
 * EL PULSO DE CADA ESTADO.
 *
 * `factor` multiplica los tiempos de arriba: por debajo de 1 la energía viaja
 * más seguido. `respiro` es medio ciclo de la respiración. `apagado` es hasta
 * dónde se aclara el cerebro en el valle de cada respiración —1 es encendido
 * del todo—. Nada más: ni colores nuevos ni formas nuevas.
 */
const RITMO: Record<EstadoDelCerebro, { factor: number; respiro: number; apagado: number; energia: boolean }> = {
  quieto: { factor: 1, respiro: 2600, apagado: 0.9, energia: true },
  pensando: { factor: 0.62, respiro: 1500, apagado: 0.82, energia: true },
  respondiendo: { factor: 0.48, respiro: 1200, apagado: 0.86, energia: true },
  /*
   * Un tropiezo no se pinta de rojo: el rojo en una pantalla de crear asusta
   * más de lo que informa. El cerebro deja de mandar energía, se apaga a media
   * luz y respira muy despacio. Quien mira entiende que algo se paró.
   */
  tropiezo: { factor: 1, respiro: 3400, apagado: 0.55, energia: false },
};

/**
 * WEË BRAIN, VIVO.
 *
 * ── Qué cuenta este dibujo ───────────────────────────────────────────────────
 *
 * Una sola cosa: que todos los Weë salen del mismo cerebro. Por eso las seis
 * secciones están AlREDEDOR y no en una lista, y por eso hay una línea de cada
 * una al centro. No es un menú decorado: es el mapa de cómo funciona Weë.
 *
 * ── Cómo está hecho, y por qué así ───────────────────────────────────────────
 *
 * Sin GIF, sin video, sin Lottie, sin canvas, sin motor de partículas y sin
 * pedirle nada al servidor. Son siete valores animados —uno por satélite y uno
 * para la respiración— y todo lo demás sale de ellos por interpolación: dónde
 * está la chispa, cuánto brilla su línea y cuándo se enciende el satélite que
 * la recibe. Al no haber ni un `setInterval` ni un oyente de JavaScript, en
 * Android y en iOS la animación entera corre en el hilo nativo y el de
 * JavaScript se queda libre (`useNativeDriver`).
 *
 * Solo se animan `transform` y `opacity`, que son las dos que no obligan a
 * recalcular la página. No hay sombras animadas ni desenfoques: el resplandor
 * son dos círculos de color con poca opacidad, que cuesta lo mismo que pintar
 * un fondo.
 *
 * ── Cuándo NO se mueve ───────────────────────────────────────────────────────
 *
 * Si la persona pidió menos movimiento en su teléfono, no se mueve nada: queda
 * el dibujo quieto, entero y legible. Tampoco se mueve con la aplicación en
 * segundo plano o la pestaña oculta, ni cuando se navega a otra pantalla: al
 * volver, arranca de nuevo. Una animación que sigue corriendo donde nadie la
 * ve es batería regalada.
 */
const SistemaDeWeeBrain: React.FC<Props> = ({ estado = 'quieto', onSatelite }) => {
  const { theme } = useTheme();
  const t = useT();
  const enfocada = useIsFocused();

  const [ancho, setAncho] = useState(0);
  const [alFrente, setAlFrente] = useState(true);
  const [menosMovimiento, setMenosMovimiento] = useState(false);

  /*
   * Un valor por satélite, de 0 a 1: es el viaje de su chispa. De él cuelgan,
   * por interpolación, las tres cosas que pasan en ese viaje —la chispa se
   * mueve, su línea se enciende y al final el satélite recibe el pulso—, así
   * que las tres van solas y en el mismo hilo, sin un solo oyente.
   */
  const viajes = useRef(SATELITES.map(() => new Animated.Value(0))).current;
  const respiro = useRef(new Animated.Value(0)).current;
  const enMarcha = useRef<Animated.CompositeAnimation[]>([]);

  /* La aplicación en segundo plano —o la pestaña oculta— no anima nada. */
  useEffect(() => {
    const suscripcion = AppState.addEventListener('change', (siguiente) => setAlFrente(siguiente === 'active'));
    return () => suscripcion.remove();
  }, []);

  /* Y quien pidió menos movimiento no ve ninguno, ni al entrar ni al cambiarlo. */
  useEffect(() => {
    let vivo = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((quiereMenos) => {
        if (vivo) setMenosMovimiento(!!quiereMenos);
      })
      .catch(() => undefined);
    const suscripcion = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (quiereMenos: boolean) =>
      setMenosMovimiento(!!quiereMenos)
    );
    return () => {
      vivo = false;
      suscripcion?.remove?.();
    };
  }, []);

  const animar = enfocada && alFrente && !menosMovimiento && ancho > 0;

  useEffect(() => {
    const parar = () => {
      enMarcha.current.forEach((animacion) => animacion.stop());
      enMarcha.current = [];
    };

    if (!animar) {
      parar();
      /* Quieto no es a medias: el cerebro a su tamaño y ninguna chispa en el aire. */
      respiro.setValue(0);
      viajes.forEach((valor) => valor.setValue(0));
      return parar;
    }

    const ritmo = RITMO[estado];

    const latido = Animated.loop(
      Animated.sequence([
        Animated.timing(respiro, {
          toValue: 1,
          duration: ritmo.respiro,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(respiro, {
          toValue: 0,
          duration: ritmo.respiro,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    latido.start();
    enMarcha.current.push(latido);

    if (ritmo.energia) {
      SATELITES.forEach((satelite, i) => {
        const valor = viajes[i];
        valor.setValue(0);
        const corriente = Animated.loop(
          Animated.timing(valor, {
            toValue: 1,
            delay: satelite.espera * ritmo.factor,
            duration: satelite.viaje * ritmo.factor,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          })
        );
        corriente.start();
        enMarcha.current.push(corriente);
      });
    }

    return parar;
  }, [animar, estado, respiro, viajes]);

  const ritmo = RITMO[estado];

  /*
   * Todo el dibujo sale de un número: el ancho que le deja la página. El
   * hexágono se calcula una vez por ancho y no se vuelve a tocar.
   */
  const plano = useMemo(() => {
    const util = Math.min(ancho, ANCHO_MAXIMO);
    /*
     * Los satélites de los lados son los que más se separan del centro: están a
     * 30 grados, así que su distancia horizontal es `rx · cos 30`, no `rx`. De
     * ahí sale el radio que hace que el más ancho quepa justo.
     */
    const rx = Math.max(scale(92), (util - CELDA) / (2 * COS30));
    const ry = rx * PROPORCION;
    const cx = ancho / 2;
    const cy = ry + ALTO_DE_CELDA / 2;
    const puntos = SATELITES.map((satelite) => {
      const radianes = (satelite.angulo * Math.PI) / 180;
      const dx = rx * Math.cos(radianes);
      const dy = ry * Math.sin(radianes);
      const distancia = Math.hypot(dx, dy);
      /* La línea no nace en el centro ni muere en el centro: va de borde a borde. */
      const largo = Math.max(scale(10), distancia - RADIO_INTERIOR - DISCO / 2);
      const desde = RADIO_INTERIOR + largo / 2;
      return {
        ...satelite,
        x: cx + dx,
        y: cy + dy,
        largo,
        /* El centro de la línea, que es sobre lo que gira. */
        mx: cx + (dx / distancia) * desde,
        my: cy + (dy / distancia) * desde,
        giro: (Math.atan2(dy, dx) * 180) / Math.PI,
      };
    });
    return { cx, cy, rx, ry, alto: ry * 2 + ALTO_DE_CELDA, puntos };
  }, [ancho]);

  const medir = (evento: LayoutChangeEvent) => {
    const medido = Math.round(evento.nativeEvent.layout.width);
    if (medido > 0 && medido !== ancho) setAncho(medido);
  };

  /*
   * TOCAR UN SATÉLITE.
   *
   * Antes de navegar, la energía corre hasta él: se le empuja el viaje al
   * final, que es justo lo que enciende su línea y su pulso. No hace falta una
   * animación aparte para el toque —es la misma que ya está contada—, y los
   * 220 milisegundos que tarda son los que dejan verla.
   */
  const tocar = (i: number, experiencia: WeeExperience) => {
    const valor = viajes[i];
    valor.stopAnimation();
    valor.setValue(0.78);
    Animated.timing(valor, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => onSatelite(experiencia));
  };

  /* El cerebro respira: 1 a 1,015. Si se nota el salto, es demasiado. */
  const escalaDelCerebro = respiro.interpolate({ inputRange: [0, 1], outputRange: [1, 1.015] });
  /* Y brilla con el mismo aliento: se aclara en el valle y se enciende arriba. */
  const brilloDelCerebro = respiro.interpolate({ inputRange: [0, 1], outputRange: [ritmo.apagado, 1] });

  const colorVivo = estado === 'tropiezo' ? theme.colors.textSecondary : theme.colors.accent;
  const colorDelAro = theme.colors.accent + '4D';

  return (
    <View
      style={[styles.lienzo, ancho > 0 ? { height: plano.alto } : null]}
      onLayout={medir}
      accessibilityLabel={t('brain.systemLabel')}
    >
      {ancho > 0 && (
        <>
          {/*
            EL ARO QUE UNE A LOS SEIS.
            Un círculo aplastado: se dibuja redondo y se le baja el alto con
            `scaleY`, porque un borde redondeado sobre un rectángulo da una
            pastilla, no una elipse. Los discos de los satélites lo tapan donde
            se posan, y lo que queda a la vista son los arcos entre ellos.
          */}
          <View
            pointerEvents="none"
            style={[
              styles.aro,
              {
                left: plano.cx - plano.rx,
                top: plano.cy - plano.rx,
                width: plano.rx * 2,
                height: plano.rx * 2,
                borderRadius: plano.rx,
                borderColor: colorDelAro,
                transform: [{ scaleY: plano.ry / plano.rx }],
              },
            ]}
          />

          {/* Las seis conexiones, cada una con su chispa dentro. */}
          {plano.puntos.map((punto, i) => {
            const viaje = viajes[i];
            return (
              <View
                key={punto.id}
                pointerEvents="none"
                style={[
                  styles.conexion,
                  {
                    left: punto.mx - punto.largo / 2,
                    top: punto.my - PUNTO / 2,
                    width: punto.largo,
                    transform: [{ rotate: `${punto.giro}deg` }],
                  },
                ]}
              >
                {/*
                  El trazo y la chispa son hermanos, no padre e hijo: si la
                  línea se encendiera por opacidad con la chispa dentro, la
                  chispa se apagaría con ella.
                */}
                <Animated.View
                  style={[
                    styles.trazo,
                    {
                      backgroundColor: colorVivo,
                      opacity: viaje.interpolate({
                        inputRange: [0, 0.78, 0.93, 1],
                        outputRange: [0.3, 0.3, 0.85, 0.3],
                      }),
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.chispa,
                    {
                      backgroundColor: colorVivo,
                      opacity: viaje.interpolate({
                        inputRange: [0, 0.08, 0.84, 1],
                        outputRange: [0, 1, 1, 0],
                      }),
                      transform: [
                        {
                          translateX: viaje.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, Math.max(0, punto.largo - PUNTO)],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              </View>
            );
          })}

          {/*
            EL CEREBRO. Encima de todo, porque es de donde sale todo.

            No lleva resplandor dibujado detrás: lo trae puesto la propia
            imagen. Uno de código quedaría medio tapado por la lámina y medio
            asomando por fuera, con un canto recto alrededor —que es justo lo
            que no se quiere ver—.

            Así que lo que respira es la lámina: crece un pelo y se aclara un
            pelo. Sobre el blanco de la página, bajarle la opacidad es
            exactamente apagarle el brillo, y cuesta lo que cuesta una
            opacidad: nada.
          */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.cerebro,
              {
                left: plano.cx - CEREBRO / 2,
                top: plano.cy - CEREBRO / 2,
                opacity: brilloDelCerebro,
                transform: [{ scale: escalaDelCerebro }],
              },
            ]}
          >
            <Image source={CEREBRO_DE_WEE} style={styles.cerebroDibujo} contentFit="contain" transition={0} accessible={false} />
          </Animated.View>

          {/* Los seis satélites, con su nombre de marca y su emoji de siempre. */}
          {plano.puntos.map((punto, i) => {
            const experiencia = getExperienceById(punto.id);
            if (!experiencia) return null;
            const viaje = viajes[i];
            return (
              <TouchableOpacity
                key={`sat-${punto.id}`}
                style={[
                  styles.satelite,
                  { left: punto.x - CELDA / 2, top: punto.y - ALTO_DE_CELDA / 2, width: CELDA },
                ]}
                activeOpacity={0.85}
                onPress={() => tocar(i, experiencia)}
                accessibilityRole="button"
                accessibilityLabel={t('brain.goTo', { seccion: experiencia.name })}
              >
                <View style={styles.hueco}>
                  {/* El pulso de llegada: nace del mismo viaje, al final del recorrido. */}
                  <Animated.View
                    style={[
                      styles.pulso,
                      {
                        backgroundColor: colorVivo,
                        opacity: viaje.interpolate({
                          inputRange: [0, 0.84, 0.94, 1],
                          outputRange: [0, 0, 0.45, 0],
                        }),
                        transform: [
                          {
                            scale: viaje.interpolate({
                              inputRange: [0, 0.84, 1],
                              outputRange: [0.82, 0.82, 1.3],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.disco,
                      { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                    ]}
                  >
                    <Text style={styles.emoji}>{experiencia.emoji}</Text>
                  </View>
                </View>
                <Text style={[styles.nombre, { color: theme.colors.text }]} numberOfLines={1}>
                  {experiencia.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  /* El alto lo pone el hexágono en cuanto se sabe el ancho. */
  lienzo: {
    width: '100%',
  },
  aro: {
    position: 'absolute',
    borderWidth: StyleSheet.hairlineWidth,
  },
  /*
   * La conexión mide lo alto de la chispa, no lo alto del trazo: así la chispa
   * cabe dentro y ningún sistema la recorta al girar la caja.
   */
  conexion: {
    position: 'absolute',
    height: PUNTO,
    justifyContent: 'center',
  },
  trazo: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  chispa: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: PUNTO,
    height: PUNTO,
    borderRadius: PUNTO / 2,
  },
  cerebro: {
    position: 'absolute',
    width: CEREBRO,
    height: CEREBRO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cerebroDibujo: {
    width: CEREBRO,
    height: CEREBRO,
  },
  satelite: {
    position: 'absolute',
    alignItems: 'center',
  },
  hueco: {
    width: DISCO,
    height: DISCO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulso: {
    position: 'absolute',
    width: DISCO,
    height: DISCO,
    borderRadius: DISCO / 2,
  },
  /* Blanco, con un borde casi invisible y una sombra corta: una ficha, no una tarjeta. */
  disco: {
    width: DISCO,
    height: DISCO,
    borderRadius: DISCO / 2,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: scale(8),
    shadowOffset: { width: 0, height: scale(3) },
    elevation: 2,
  },
  emoji: {
    fontSize: scale(24),
    lineHeight: scale(30),
  },
  nombre: {
    marginTop: SPACING.xs,
    fontSize: scale(10.5),
    fontWeight: FONT_WEIGHT.bold,
    textAlign: 'center',
  },
});

export default SistemaDeWeeBrain;
