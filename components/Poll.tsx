/*
 * LA ENCUESTA (Bloque C).
 *
 * El único sitio de Weë donde se dibuja una encuesta. Antes había dos copias
 * —una en `PostCard` y otra en `PostDetailScreen`— de unas ciento ochenta líneas
 * cada una, que ya habían empezado a separarse.
 *
 * Qué hace y qué no:
 *
 *  · Lee `poll.counts` y `poll.totalVotes`, que solo escribe el servidor.
 *  · Para saber qué votaste lee TU documento, `posts/{id}/pollVotes/{uid}`, con
 *    el uid de la cuenta. Nunca `votedBy`, que ya no existe en el modelo nuevo y
 *    además era público.
 *  · Para votar llama a `votePoll` y se queda con el resultado que confirma el
 *    servidor. No lleva su propia contabilidad.
 *  · Las encuestas de antes se leen y no se tocan: no se migran, no se convierten
 *    y no se puede votar en ellas —tampoco el servidor lo permitiría—.
 *
 * Todo lo que es aritmética —porcentajes, tiempo restante, si es antigua— vive
 * en `utils/pollView.ts`, donde las pruebas pueden ejecutarlo.
 */
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useIdioma, useT } from '../contexts/IdiomaContext';
import { mensajeDelServidor } from '../i18n/servidor';
import { useAuth } from '../contexts/AuthContext';
import { PostPoll, postsService } from '../services/firestoreService';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { notify } from '../utils/notify';
import {
  FilaEncuesta as Fila,
  estaCerrada,
  esHistorica,
  resultadosDe,
  textoVotos,
  tiempoRestante,
} from '../utils/pollView';

/*
 * Quien prefiere menos movimiento no ve crecer las barras: el resultado aparece
 * ya puesto. En web lo dice el sistema por `prefers-reduced-motion`; en el
 * teléfono, el ajuste de accesibilidad.
 */
const usePrefiereQuietud = (): boolean => {
  const [quieto, setQuieto] = useState(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.matchMedia) return false;
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined' || !window.matchMedia) return;
      let media: MediaQueryList;
      try {
        media = window.matchMedia('(prefers-reduced-motion: reduce)');
      } catch {
        return;
      }
      const alCambiar = () => setQuieto(media.matches);
      media.addEventListener?.('change', alCambiar);
      return () => media.removeEventListener?.('change', alCambiar);
    }
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

// ─── Una opción ──────────────────────────────────────────────────────────────

interface OpcionProps {
  fila: Fila;
  elegida: boolean;
  /** Los resultados solo se ven después de votar, o si la encuesta ya no admite votos. */
  conResultados: boolean;
  pulsable: boolean;
  quieto: boolean;
  onPress: () => void;
}

const Opcion: React.FC<OpcionProps> = ({ fila, elegida, conResultados, pulsable, quieto, onPress }) => {
  const { theme } = useTheme();
  const t = useT();
  const ancho = useRef(new Animated.Value(conResultados && quieto ? fila.porcentaje : 0)).current;

  useEffect(() => {
    const destino = conResultados ? fila.porcentaje : 0;
    if (quieto) {
      ancho.setValue(destino);
      return;
    }
    Animated.timing(ancho, { toValue: destino, duration: 300, useNativeDriver: false }).start();
  }, [conResultados, fila.porcentaje, quieto, ancho]);

  const relleno = ancho.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'], extrapolate: 'clamp' });

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!pulsable}
      activeOpacity={0.75}
      style={[
        styles.opcion,
        {
          backgroundColor: theme.colors.background,
          borderColor: elegida ? theme.colors.accent : theme.colors.border,
          borderWidth: elegida ? 2 : 1,
        },
      ]}
      accessibilityRole="radio"
      accessibilityState={{ checked: elegida, disabled: !pulsable }}
      /*
       * En web, react-native-web no emite `aria-checked` cuando vale false, y un
       * `role="radio"` sin ese atributo no le dice a un lector de pantalla cuál
       * está marcada: se leen todas igual. Se pone explícito. Comprobado en el
       * DOM real, no supuesto.
       */
      {...(Platform.OS === 'web' ? { 'aria-checked': elegida } : null)}
      accessibilityLabel={conResultados ? `${fila.text}, ${fila.porcentaje}%, ${textoVotos(fila.votos, t)}` : fila.text}
    >
      {/* La barra va DETRÁS del texto, así la fila mide lo mismo antes y después. */}
      <Animated.View
        style={[
          styles.barra,
          {
            width: relleno,
            backgroundColor: elegida ? theme.colors.accent + '3D' : theme.colors.accent + '14',
          },
        ]}
      />
      <View style={styles.contenido}>
        <Text
          style={[
            styles.texto,
            { color: theme.colors.text, fontWeight: elegida ? FONT_WEIGHT.semibold : FONT_WEIGHT.regular },
          ]}
          numberOfLines={2}
        >
          {fila.text}
        </Text>
        {conResultados && (
          <View style={styles.cifras}>
            <Text style={[styles.votos, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {textoVotos(fila.votos, t)}
            </Text>
            <Text
              style={[styles.porcentaje, { color: elegida ? theme.colors.accentDark : theme.colors.text }]}
              numberOfLines={1}
            >
              {fila.porcentaje}%
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

// ─── La encuesta ─────────────────────────────────────────────────────────────

interface PollProps {
  /** El post donde vive la encuesta. En un repost, el ORIGINAL: ahí están los votos. */
  postId?: string;
  poll: PostPoll;
  /** Qué hacer cuando toca una persona sin sesión. Sin esto, la encuesta se ve pero no se vota. */
  onRequireAuth?: () => void;
}

const Poll: React.FC<PollProps> = ({ postId, poll, onRequireAuth }) => {
  const { theme } = useTheme();
  const { t, locale } = useIdioma();
  const { user } = useAuth();
  const quieto = usePrefiereQuietud();

  const historica = esHistorica(poll);
  const cerrada = estaCerrada(poll, Date.now());

  /*
   * Los contadores empiezan en lo que trae el post y se reemplazan por lo que
   * devuelve el servidor en cuanto se vota. Nunca se calculan aquí.
   */
  const [conteos, setConteos] = useState<Record<string, number>>(() => poll.counts || {});
  const [total, setTotal] = useState<number>(() => poll.totalVotes || 0);
  const [miVoto, setMiVoto] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Si cambia la publicación —otro post en el muro, un repost— se vuelve a empezar.
  useEffect(() => {
    setConteos(poll.counts || {});
    setTotal(poll.totalVotes || 0);
  }, [poll]);

  /*
   * Qué votó ESTA persona. Un solo documento, el suyo. No se lee la lista de
   * votantes: no se puede y no hace falta.
   */
  useEffect(() => {
    let vivo = true;
    if (!postId || !user || historica) {
      setMiVoto(null);
      return;
    }
    postsService
      .getMyPollVote(postId)
      .then((optionId) => {
        if (vivo) setMiVoto(optionId);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [postId, user?.uid, historica]);

  const permiteCambio = poll.allowChange !== false;
  const votada = miVoto !== null;
  const conResultados = votada || cerrada || historica;
  const pulsable = !!postId && !historica && !cerrada && !enviando && (!votada || permiteCambio);

  const resultados = resultadosDe({ ...poll, counts: conteos, totalVotes: total } as PostPoll);

  const votar = async (optionId: string) => {
    // Invitada: se ve la encuesta, y tocarla lleva al registro de siempre.
    if (!user) {
      onRequireAuth?.();
      return;
    }
    if (!pulsable || optionId === miVoto) return;

    const antes = { miVoto, conteos, total };

    /*
     * Se pinta el voto antes de que llegue la respuesta, para que el dedo no
     * espere. Es solo pintura: la escritura de verdad la hace `votePoll`, y si
     * falla se vuelve a lo de antes sin reintentar nada.
     */
    const optimista = { ...conteos };
    if (antes.miVoto) optimista[antes.miVoto] = Math.max(0, (optimista[antes.miVoto] || 0) - 1);
    optimista[optionId] = (optimista[optionId] || 0) + 1;
    setConteos(optimista);
    setTotal(antes.miVoto ? antes.total : antes.total + 1); // cambiar de voto no suma
    setMiVoto(optionId);
    setEnviando(true);

    try {
      const confirmado = await postsService.voteInPollById(postId!, optionId);
      // Manda el servidor: es quien tiene la cuenta buena.
      setConteos(confirmado.counts || {});
      setTotal(confirmado.totalVotes || 0);
      setMiVoto(confirmado.optionId);
    } catch (error) {
      setConteos(antes.conteos);
      setTotal(antes.total);
      setMiVoto(antes.miVoto);
      notify(t('wall.pollVoteFailed'), mensajeDelServidor(error, { t, locale }));
    } finally {
      setEnviando(false);
    }
  };

  const pie = [
    votada ? t('wall.pollVoted') : null,
    textoVotos(total, t),
    cerrada ? t('wall.pollClosed') : tiempoRestante(poll, Date.now(), t),
  ].filter(Boolean) as string[];

  return (
    <View
      style={[
        styles.tarjeta,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          opacity: cerrada ? 0.7 : 1,
        },
      ]}
      accessibilityRole="radiogroup"
    >
      {/*
        La pregunta, dentro de la tarjeta. El texto libre de la publicación sigue
        siendo suyo y se pinta aparte, encima.
      */}
      {!!poll.question && (
        <Text style={[styles.pregunta, { color: theme.colors.text }]}>{poll.question}</Text>
      )}

      {resultados.filas.map((fila) => (
        <Opcion
          key={fila.id}
          fila={fila}
          elegida={miVoto === fila.id}
          conResultados={conResultados}
          pulsable={pulsable}
          quieto={quieto}
          onPress={() => votar(fila.id)}
        />
      ))}

      <Text style={[styles.pie, { color: theme.colors.textSecondary }]}>{pie.join(' · ')}</Text>

      {/*
        Una encuesta de antes que todavía no ha cerrado enseñaría resultados sin
        forma de votar y sin explicación. Se dice.
      */}
      {historica && !cerrada && (
        <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>
          {t('wall.pollLegacy')}
        </Text>
      )}
    </View>
  );
};

/*
 * Sin `scale()` en nada que se toque: en web `scale()` multiplica por 0,9 y
 * dejaría las filas en 43 px. El objetivo táctil se escribe tal cual.
 */
const styles = StyleSheet.create({
  tarjeta: {
    marginTop: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  pregunta: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    marginBottom: SPACING.xs,
  },
  opcion: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: BORDER_RADIUS.md,
    minHeight: 48,
    justifyContent: 'center',
  },
  barra: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  contenido: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  texto: {
    fontSize: FONT_SIZE.base,
    flex: 1,
  },
  cifras: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.sm,
  },
  votos: {
    fontSize: FONT_SIZE.sm,
  },
  porcentaje: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    minWidth: 36,
    textAlign: 'right',
  },
  pie: {
    fontSize: FONT_SIZE.sm,
  },
  nota: {
    fontSize: FONT_SIZE.sm,
    fontStyle: 'italic',
  },
});

export default Poll;
