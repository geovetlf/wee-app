import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform, Alert, Linking } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useTheme, enTemaClaro } from '../contexts/ThemeContext';
import { useIdioma } from '../contexts/IdiomaContext';
import { useResponsive } from '../hooks/useResponsive';
import { useBrainChat } from '../hooks/useBrainChat';
import { SpecialistAction } from '../constants/specialists';
import { useEspecialista } from '../hooks/useEspecialista';
import { experienceLabel, getExperienceById, WeeExperience } from '../constants/weeExperiences';
import { BrainMessage } from '../services/brainService';
import CreatorShell from '../components/creator/CreatorShell';
import CabeceraDeWeeBrain from '../components/brain/CabeceraDeWeeBrain';
import SistemaDeWeeBrain, { EstadoDelCerebro, CEREBRO_DE_WEE } from '../components/brain/SistemaDeWeeBrain';
import CajaDePrompt from '../components/creator/CajaDePrompt';
import AjustesContextuales from '../components/creator/AjustesContextuales';
import { GrupoDeAjustes } from '../constants/ajustesContextuales';
import { Chip } from '../components/creator/ui';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { useWallet } from '../hooks/useWallet';
import { scale } from '../utils/scale';

const isWeb = Platform.OS === 'web';

/*
 * El saludo vive en el diccionario, no aquí: una constante de módulo se evalúa
 * una sola vez, al cargar el archivo, y se quedaría con el idioma de ese
 * instante. Se resuelve al pintar, con `t('weeai.brainGreeting')`.
 */

/**
 * EL DORADO DE LO QUE ESCRIBE LA PERSONA (decisión del usuario, 2026-09-16).
 *
 * Antes la burbuja era el amarillo de Weë al 20 % —un crema muy pálido— y se
 * confundía con el fondo. Ahora es dorado de verdad: cálido, luminoso y suave.
 * Ni naranja ni chillón.
 *
 * El número sale de medir la referencia que dio el usuario: allí la burbuja es
 * un degradado de `#FEEC91` a `#FBC131`, y este es su tono medio. Se pinta
 * plano y no en degradado a propósito: es un color, no una pieza nueva.
 *
 * Vive aquí y no en el tema porque es de esta conversación y de ninguna otra:
 * el amarillo de la marca —`theme.colors.accent`— no se toca, y las burbujas de
 * Weë Brain se quedan como están.
 */
const DORADO_DE_QUIEN_ESCRIBE = '#FBD45A';

/**
 * LO ÚNICO QUE SE AJUSTA EN WEË BRAIN: SI BUSCA EN INTERNET O NO.
 *
 * Guarda CLAVES y no frases (CLAUDE.md §8): esto se evalúa una vez, al cargar
 * el archivo, y con frases se quedaría con el idioma del arranque. Quien lo
 * pinta —`AjustesContextuales`— resuelve.
 *
 * Los identificadores `si` y `no` no se traducen: son lo que se compara.
 */
const AJUSTES_DE_BRAIN: GrupoDeAjustes[] = [
  {
    id: 'web',
    clave: 'brain.searchGroup',
    contextos: ['general'],
    opciones: [
      { id: 'no', clave: 'common.no' },
      { id: 'si', clave: 'common.yes' },
    ],
  },
];

interface Bubble {
  key: string;
  role: 'wee' | 'user';
  text: string;
  imageUrl?: string;
  sources?: { url: string; title?: string }[];
  suggestedExperience?: string;
  credits?: number;
  demo?: boolean;
  /** Ya formateada con el idioma activo. Vacía mientras el mensaje va en camino. */
  hora?: string;
  /** Solo en lo que escribe la persona: si Weë Brain ya respondió a eso. */
  contestado?: boolean;
}

/**
 * LA HORA DE UN MENSAJE, VENGA COMO VENGA.
 *
 * Firestore devuelve su propio tipo de marca de tiempo, que sabe convertirse a
 * `Date`; un mensaje recién enviado todavía no tiene ninguna. Aquí se acepta lo
 * que haya y, si no hay nada, no se inventa: se devuelve vacío y debajo de la
 * burbuja no se escribe hora.
 */
const horaDelMensaje = (marca: any): Date | null => {
  if (!marca) return null;
  if (typeof marca.toDate === 'function') return marca.toDate();
  if (marca instanceof Date) return marca;
  if (typeof marca === 'number') return new Date(marca);
  return null;
};

/**
 * WEË BRAIN — EL SITIO DE TRABAJO DEL CEREBRO DE WEË.
 *
 * ── Dos pantallas en una ─────────────────────────────────────────────────────
 *
 * Al entrar, el TALLER: el cerebro en el centro, las seis secciones de Weë AI
 * a su alrededor recibiendo energía, los atajos y la caja donde se escribe. No
 * es un adorno: es el mapa de cómo funciona Weë, y dice de un vistazo lo que
 * costaría un párrafo —que Weë Studio, Weë Music, Weë Design, Weë Business, Weë
 * Chef y Weë Travel salen del mismo cerebro—.
 *
 * En cuanto se escribe algo, el taller deja sitio a la CONVERSACIÓN, que es lo
 * mismo de siempre: burbujas, fuentes cuando busca en internet, derivación al
 * especialista que corresponda, aviso si faltan Credits y reintento si algo
 * falla. Nada de eso cambia; lo único que cambia es por dónde se entra.
 *
 * ── Lo que NO cambia ─────────────────────────────────────────────────────────
 *
 * Ni el motor, ni el Credit Engine, ni los precios, ni las rutas. Por debajo
 * sigue usando el mismo que todos —WEË AI ENGINE + Credit Engine—; tocar un
 * satélite navega a esa sección igual que el menú ☰; y la caja sigue pidiendo
 * el precio al servidor antes de enviar, y sigue sin enviar a ciegas.
 */
const BrainChatScreen: React.FC = () => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const navigation = useNavigation<any>();
  const { isDesktop } = useResponsive();
  const spec = useEspecialista('brain');
  const chat = useBrainChat();

  const wallet = useWallet();
  const [draft, setDraft] = useState('');
  const [attachment, setAttachment] = useState<string | null>(null);
  const [webSearch, setWebSearch] = useState(false);
  const [ajustesAbiertos, setAjustesAbiertos] = useState(false);
  const [suggestionDismissed, setSuggestionDismissed] = useState<string | null>(null);
  const lastSent = useRef<{ text: string; imageUri: string | null; webSearch: boolean } | null>(null);

  // Weë no esconde el costo: se pide al servidor el precio del próximo mensaje
  // cada vez que cambia el texto, la foto adjunta o la búsqueda en internet.
  const { refreshQuote } = chat;
  useEffect(() => {
    const timer = setTimeout(() => {
      void refreshQuote(draft, { imageUri: attachment, webSearch });
    }, 350);
    return () => clearTimeout(timer);
  }, [draft, attachment, webSearch, refreshQuote]);

  const bubbles: Bubble[] = useMemo(
    () =>
      chat.messages.map((m: BrainMessage, i: number) => {
        const cuando = horaDelMensaje(m.createdAt);
        return {
          key: m.id,
          role: m.role === 'user' ? ('user' as const) : ('wee' as const),
          text: m.text,
          imageUrl: m.imageUrl,
          sources: m.sources,
          suggestedExperience: m.suggestedExperience,
          credits: m.credits,
          demo: m.demo,
          hora: cuando ? formato.hora(cuando) : undefined,
          /* Dos tics cuando ya hay una respuesta de Weë Brain después de esto. */
          contestado: chat.messages.slice(i + 1).some((otro: BrainMessage) => otro.role !== 'user'),
        };
      }),
    [chat.messages, formato]
  );

  // Derivación: la propone el servidor en su última respuesta
  const lastWee = [...bubbles].reverse().find((b) => b.role === 'wee');
  const suggestion: WeeExperience | null = useMemo(() => {
    if (!lastWee?.suggestedExperience || suggestionDismissed === lastWee.key) return null;
    const exp = getExperienceById(lastWee.suggestedExperience);
    return exp && exp.id !== 'brain' ? exp : null;
  }, [lastWee, suggestionDismissed]);

  const lastUserText = [...bubbles].reverse().find((b) => b.role === 'user')?.text || '';

  useEffect(() => {
    if (!chat.busy) setSuggestionDismissed((current) => current);
  }, [chat.busy]);

  /*
   * SIN CONVERSACIÓN TODAVÍA. NO ES OTRA PANTALLA: ES QUE NO HAY NADA QUE LEER.
   *
   * Lo único que decide es el texto de la caja —"¿En qué te ayudo?" o "sigue
   * contándome"— y si aparece el botón de conversación nueva. La pantalla es la
   * misma en los dos casos.
   */
  const enBlanco = bubbles.length === 0;

  const notify = (title: string, message: string) => {
    if (isWeb) window.alert(`${title}\n\n${message}`);
    else Alert.alert(title, message);
  };

  const requireLogin = () => {
    if (chat.user) return true;
    navigation.navigate('Login');
    return false;
  };

  const sendText = async (text: string) => {
    if (!requireLogin()) return;
    const payload = { text, imageUri: attachment, webSearch };
    lastSent.current = payload;
    setAttachment(null);
    await chat.send(text, { imageUri: payload.imageUri, webSearch: payload.webSearch });
  };

  const startWith = (goal: string, _preset?: SpecialistAction['preset']) => sendText(goal);

  // No se puede enviar sin saber lo que cuesta: si el precio no está calculado,
  // el botón espera. Si la estimación falló, tampoco se ejecuta a ciegas.
  const sinPrecio = chat.busy || chat.quoting || !chat.quote || !!chat.quoteError;
  const sendLabel = chat.quote
    ? t('weeai.sendForCredits', { credits: chat.quote.credits })
    : chat.quoteError ? t('weeai.couldNotCalculate') : t('weeai.calculatingCost');

  const submitDraft = () => {
    const text = draft.trim();
    if (!text || chat.busy) return;
    setDraft('');
    sendText(text);
  };

  const retry = () => {
    const last = lastSent.current;
    if (!last) return;
    setAttachment(last.imageUri);
    setWebSearch(last.webSearch);
    chat.send(last.text, { imageUri: last.imageUri, webSearch: last.webSearch });
  };

  const attach = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (!result.canceled && result.assets[0]?.uri) setAttachment(result.assets[0].uri);
    } catch (error) {
      console.warn('No se pudo adjuntar:', error);
    }
  };

  const goToSpecialist = (exp: WeeExperience) => {
    navigation.navigate('CreatorFlow', { experienceId: exp.id, goal: lastUserText || undefined });
  };

  /*
   * Tocar un satélite abre esa sección, por la misma puerta que el menú ☰ y la
   * barra lateral: `Specialist` con su identificador. No hay ruta nueva.
   */
  const irASatelite = (exp: WeeExperience) => navigation.navigate('Specialist', { id: exp.id });

  /*
   * UNA BURBUJA, Y LO QUE VA DEBAJO (decisión del usuario, 2026-09-16).
   *
   * Limpio: sin tarjeta que envuelva la conversación, sin bordes y sin líneas.
   * Lo que separa es el aire y el color, no una raya. Lo de Weë Brain se apoya
   * a la izquierda en gris muy claro con el cerebro al lado; lo tuyo va a la
   * derecha en dorado y sin avatar, porque ya se sabe quién lo escribió.
   *
   * Debajo, la hora —en el formato del idioma activo, nunca a mano— y, en lo
   * tuyo, si ya llegó: un tic al salir y dos cuando Weë Brain ha contestado.
   * No es adorno: es lo único que distingue "se está enviando" de "ya está".
   */
  const renderBubble = (bubble: Bubble) => {
    const mia = bubble.role === 'user';
    return (
      <View key={bubble.key} style={[styles.mensaje, mia ? styles.mensajeMio : styles.mensajeSuyo]}>
        <View style={[styles.bubbleRow, mia ? styles.bubbleRowUser : styles.bubbleRowWee]}>
          {!mia && (
            <View style={styles.avatar}>
              <Image source={CEREBRO_DE_WEE} style={styles.avatarDibujo} contentFit="contain" transition={0} accessible={false} />
            </View>
          )}
          <View style={[styles.bubble, mia ? styles.bubbleMia : { backgroundColor: theme.colors.surface }]}>
            {!!bubble.imageUrl && <Image source={{ uri: bubble.imageUrl }} style={styles.bubbleImage} contentFit="cover" />}
            <Text selectable style={[styles.bubbleText, { color: theme.colors.text }]}>{bubble.text}</Text>
            {!!bubble.sources?.length && (
              <View style={styles.sources}>
                {bubble.sources.map((source) => (
                  <TouchableOpacity key={source.url} onPress={() => Linking.openURL(source.url)} activeOpacity={0.7} style={[styles.source, { backgroundColor: theme.colors.card }]} accessibilityLabel={source.title || source.url}>
                    <Ionicons name="link-outline" size={scale(12)} color={theme.colors.accentDark} />
                    <Text style={[styles.sourceText, { color: theme.colors.textSecondary }]} numberOfLines={1}>{source.title || source.url}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {!mia && bubble.demo && <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>{t('weeai.previewDemo')}</Text>}
          </View>
        </View>

        {!!bubble.hora && (
          <View style={[styles.pieDelMensaje, mia ? styles.pieMio : styles.pieSuyo]}>
            <Text style={[styles.hora, { color: theme.colors.textSecondary }]}>{bubble.hora}</Text>
            {mia && (
              <Ionicons
                name={bubble.contestado ? 'checkmark-done' : 'checkmark'}
                size={scale(15)}
                color={bubble.contestado ? theme.colors.accentDark : theme.colors.textSecondary}
              />
            )}
          </View>
        )}
      </View>
    );
  };

  if (!spec) return null;

  /*
   * EN QUÉ ESTÁ EL CEREBRO, CONTADO CON LO QUE LA PANTALLA YA SABE.
   *
   * No se inventa ningún estado ni se toca la lógica de la IA: se lee lo que el
   * chat ya expone. El día que Weë Brain tenga su orquestador, aquí entrará su
   * estado real y el dibujo no cambia (CLAUDE.md §10).
   */
  const estadoDelCerebro: EstadoDelCerebro = chat.error ? 'tropiezo' : chat.busy ? 'pensando' : 'quieto';

  /* El aire que mete el marco, para que la fila de atajos llegue a los bordes. */
  const aireDelMarco = isDesktop ? SPACING.xl : SPACING.lg;

  /*
   * LA CAJA VA ANCLADA, NO AL FINAL DE LA PÁGINA (decisión del usuario, 2026-09-16).
   *
   * En Weë Studio la caja está arriba del todo, así que al salir el teclado casi
   * no hay nada que desplazar y se queda quieta. Aquí está abajo, detrás del
   * cerebro y de los seis satélites, y con la caja DENTRO de la página pasaba
   * esto: Android desplazaba la página para enseñar el cursor, el teclado
   * encogía lo que se ve, y la caja volvía a colocarse. Dos movimientos
   * seguidos, uno suave y otro seco: el salto.
   *
   * Anclada no hay ninguno. La caja está pegada abajo y, con teclado, pegada al
   * teclado; lo que se encoge es la página de encima. El cerebro y los satélites
   * no se mueven porque el teclado haya aparecido, y no hay un solo `scrollTo`
   * de por medio. Es el mismo reparto que la hoja de comentarios de Weë, que ya
   * estaba probado en teléfono.
   */
  const compositor = (
    <View style={styles.compositor}>
      {attachment && (
        <View style={styles.attachmentRow}>
          <Image source={{ uri: attachment }} style={styles.attachmentImage} contentFit="cover" />
          <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>{t('weeai.photoAttached')}</Text>
          <TouchableOpacity onPress={() => setAttachment(null)} accessibilityLabel={t('weeai.removePhoto')}>
            <Ionicons name="close-circle" size={scale(20)} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      <CajaDePrompt
        valor={draft}
        onCambiar={setDraft}
        onEnviar={submitDraft}
        etiquetaEnviar={sendLabel}
        placeholder={enBlanco ? t('brain.placeholder') : t('weeai.keepTelling')}
        ocupado={sinPrecio}
        editable={!chat.busy}
        enviarConIntro
        /* Sin contorno: en Weë Brain no queda ni una raya dibujando un cuadro. */
        sinMarco
        /*
          LA FILA DE BOTONES (decisión del usuario, 2026-09-16).
          Izquierda: imagen, adjuntar y ajustes —lo que PREPARA el mensaje—.
          Derecha, pegado al de enviar: el micrófono, que no prepara nada, es
          otra manera de decir lo mismo que se escribiría.
          El globo se fue de la fila: buscar en internet no es una herramienta,
          es cómo quieres que te contesten, y ahora vive en los ajustes.
        */
        acciones={[
          { icono: 'image-outline', etiqueta: t('brain.imageLabel'), alPulsar: attach },
          { icono: 'attach-outline', etiqueta: t('weeai.attach'), alPulsar: attach },
          { icono: 'options-outline', etiqueta: t('brain.settingsLabel'), alPulsar: () => setAjustesAbiertos(true) },
          ...(enBlanco ? [] : [{ icono: 'add-outline', etiqueta: t('weeai.newConversation'), alPulsar: chat.reset }]),
        ]}
        accionesDerecha={[
          { icono: 'mic-outline', etiqueta: t('weeai.speak'), alPulsar: () => notify(t('weeai.comingVerySoon'), t('weeai.speakComingSoon')) },
        ]}
      />

      {/*
        EL COSTO, SOLO CUANDO HAY ALGO QUE COSTAR.
        Con la caja vacía no se dibuja nada —ni la línea ni su sitio— porque no
        hay mensaje que cobrar todavía (decisión del usuario, 2026-09-16). En
        cuanto se escribe vuelve, que es cuando dice algo: qué operación, cuántos
        Credits, su equivalencia y el saldo. Eso no se toca: en Weë nada se
        ejecuta sin saber antes lo que cuesta.
      */}
      {(!!chat.quoteError || !!draft.trim()) && (
        <View style={styles.priceRow}>
          {chat.quoteError ? (
            <Text style={[styles.priceError, { color: theme.colors.error }]}>{chat.quoteError}</Text>
          ) : chat.quoting || !chat.quote ? (
            <Text style={[styles.priceHint, { color: theme.colors.textSecondary }]}>{t('weeai.calculatingCost')}</Text>
          ) : (
            <Text style={[styles.priceHint, { color: theme.colors.textSecondary }]}>
              <Text style={{ fontWeight: FONT_WEIGHT.bold, color: theme.colors.text }}>{t(webSearch ? 'weeai.quoteSearch' : 'weeai.quoteBrain')}</Text>
              {' · '}
              {/*
                EL BLOQUE DE DOCE, EN EL SITIO DONDE YA SE LEÍA EL PRECIO.
                Once de cada doce respuestas no cobran nada, y escribir "0 Credits"
                no explica por qué: en su lugar se dice cuántas quedan antes del
                próximo Credit, que es lo que la persona necesita saber. Cuando la
                siguiente SÍ cobra, vuelve a leerse el precio de siempre. Mismo
                renglón, misma letra, ningún elemento nuevo en la pantalla.
              */}
              {chat.quote.credits > 0 || !chat.bloque ? (
                <Text style={{ fontWeight: FONT_WEIGHT.bold, color: theme.colors.text }}>{chat.quote.credits} Credits</Text>
              ) : (
                <Text style={{ fontWeight: FONT_WEIGHT.bold, color: theme.colors.text }}>
                  {t('brain.blockLeft', { restantes: chat.bloque.restantes, total: chat.bloque.total })}
                </Text>
              )}
              {chat.quote.usd > 0 ? ' · ' + t('weeai.approxUsd', { usd: chat.quote.usd < 0.01 ? '<' + formato.numero(0.01, { minimumFractionDigits: 2 }) : formato.numero(chat.quote.usd, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }) : ''}
              {typeof wallet.balance === 'number' ? ' · ' + t('weeai.creditsLeft', { saldo: formato.numero(wallet.balance) }) : ''}
            </Text>
          )}
        </View>
      )}

      {/*
        Los ajustes de Weë Brain: la misma hoja que usan Weë Studio y Weë Chef,
        con un solo grupo. No hay pantalla nueva ni sistema nuevo.
      */}
      <AjustesContextuales
        visible={ajustesAbiertos}
        contexto="general"
        grupos={AJUSTES_DE_BRAIN}
        pista={t('brain.settingsHint')}
        elegido={{ web: webSearch ? 'si' : 'no' }}
        onElegir={(_grupo, opcion) => setWebSearch(opcion === 'si')}
        onCerrar={() => setAjustesAbiertos(false)}
      />
    </View>
  );

  return (
    <CreatorShell activeId="brain" overline="🤖 Weë AI" title="🧠 Weë Brain" breadcrumb="Weë AI" contentStyle={styles.content} sinFranjaSuperior pie={compositor} seguirAlFinal={`${bubbles.length}:${chat.busy}`}>
      <CabeceraDeWeeBrain />

      {/*
        UNA SOLA PÁGINA: EL CEREBRO ARRIBA Y LA CONVERSACIÓN DEBAJO
        (decisión del usuario, 2026-09-16).

        Antes eran dos vistas: al escribir, la conversación SUSTITUÍA al cerebro
        y a sus satélites. Ya no. Weë Brain es una página sola —el cerebro vivo,
        sus seis satélites y sus atajos— y lo que se habla va saliendo debajo,
        como en cualquier conversación: se desplaza para leer hacia abajo y se
        vuelve arriba para ver el cerebro.

        Se gana lo que costaba más explicar: entrar a Weë Brain es ver el
        cerebro, siempre, con o sin conversación guardada. `useBrainChat` sigue
        retomando el hilo de las últimas 24 horas —eso no se toca—; lo que ya no
        hace es decidir por dónde se entra.
      */}
      <SistemaDeWeeBrain estado={estadoDelCerebro} onSatelite={irASatelite} />

      {/*
        LOS ATAJOS, EN UNA FILA.
        Lo que Weë Brain sabe hacer, en pastillas y no en una cuadrícula de
        tarjetas: son atajos para empezar, no el menú de la sección. Salen
        de `constants/specialists.ts`, que es su fuente, y se desplazan de
        lado cuando no caben en vez de amontonarse en tres renglones.
      */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -aireDelMarco }}
        contentContainerStyle={[styles.atajos, { paddingHorizontal: aireDelMarco }]}
      >
        {spec.actions.map((action) => (
          <TouchableOpacity
            key={action.id}
            onPress={() => startWith(action.goal, action.preset)}
            activeOpacity={0.8}
            style={[
              styles.atajo,
              {
                backgroundColor: theme.colors.card,
                borderColor: action.idk ? theme.colors.accent : theme.colors.border,
                borderStyle: action.idk ? 'dashed' : 'solid',
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={action.title}
          >
            <Ionicons name={action.icon as any} size={scale(17)} color={theme.colors.accentDark} />
            <Text style={[styles.atajoTexto, { color: theme.colors.text }]} numberOfLines={1}>{action.title}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/*
        LA CONVERSACIÓN, SIN CAJA ALREDEDOR (decisión del usuario, 2026-09-16).
        Los mensajes se apoyan directamente en la página: ni tarjeta, ni borde,
        ni raya que los encierre. Lo que los ordena es el aire.

        Y también cuando algo falla ANTES del primer mensaje. Si el primer envío
        de una conversación se queda sin Credits o da error, no llega a guardarse
        nada: no hay mensajes, y mirando solo los mensajes el aviso —"no te
        alcanzan los Credits", con su botón de recargar— no se pintaba y Weë se
        quedaba callada. Lo que se cuenta aquí es si hay ALGO que leer.
      */}
      {(!enBlanco || !!chat.error || !!chat.shortfall) && (
        <View style={styles.chat}>
          {renderBubble({ key: 'greeting', role: 'wee', text: t('weeai.brainGreeting') })}
          {bubbles.map(renderBubble)}

          {suggestion && !chat.busy && (
            <View style={[styles.bubbleRow, styles.bubbleRowWee]}>
              <View style={styles.avatar}>
                <Image source={CEREBRO_DE_WEE} style={styles.avatarDibujo} contentFit="contain" transition={0} accessible={false} />
              </View>
              <View style={[styles.bubble, { backgroundColor: theme.colors.surface }]}>
                {/*
                  Weë deriva por identificador —el servidor sigue mandando `home`—
                  pero ofrece el nombre con el que esa experiencia se presenta hoy:
                  "Hogar & Diseño", no "Weë Home" (fase 2E-56).
                */}
                <Text style={[styles.bubbleText, { color: theme.colors.text }]}>
                  {t('weeai.brainBetterFit', { emoji: suggestion.emoji, especialista: experienceLabel(suggestion, t) })}
                </Text>
                <View style={styles.chipRow}>
                  <Chip label={t('weeai.goToSpecialist', { especialista: experienceLabel(suggestion, t) })} icon="arrow-forward-outline" active onPress={() => goToSpecialist(suggestion)} />
                  <Chip label={t('weeai.stayHere')} onPress={() => setSuggestionDismissed(lastWee?.key || null)} />
                </View>
              </View>
            </View>
          )}

          {chat.shortfall && (
            <View style={[styles.bubbleRow, styles.bubbleRowWee]}>
              <View style={styles.avatar}>
                <Image source={CEREBRO_DE_WEE} style={styles.avatarDibujo} contentFit="contain" transition={0} accessible={false} />
              </View>
              <View style={[styles.bubble, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.bubbleText, { color: theme.colors.text, fontWeight: FONT_WEIGHT.bold }]}>{t('weeai.notEnoughCredits')}</Text>
                <Text style={[styles.bubbleText, { color: theme.colors.textSecondary }]}>
                  {t('weeai.creditsAndCost', {
                    saldo: formato.numero(chat.shortfall.available),
                    costo: formato.numero(chat.shortfall.required),
                  })}
                </Text>
                <View style={styles.chipRow}>
                  <Chip label={t('weeai.getCredits')} icon="diamond-outline" active onPress={() => navigation.navigate('CreditStore')} />
                </View>
              </View>
            </View>
          )}

          {chat.error && (
            <View style={[styles.bubbleRow, styles.bubbleRowWee]}>
              <View style={styles.avatar}>
                <Image source={CEREBRO_DE_WEE} style={styles.avatarDibujo} contentFit="contain" transition={0} accessible={false} />
              </View>
              <View style={[styles.bubble, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.bubbleText, { color: theme.colors.text }]}>{chat.error}</Text>
                <View style={styles.chipRow}>
                  <Chip label={t('weeai.tryAgain')} active onPress={retry} />
                </View>
              </View>
            </View>
          )}

          {chat.busy && (
            <View style={styles.thinking}>
              <ActivityIndicator color={theme.colors.accent} />
              <Text style={[styles.thinkingText, { color: theme.colors.textSecondary }]}>
                {chat.uploading ? t('weeai.uploadingPhoto') : webSearch ? t('weeai.brainSearching') : t('weeai.brainThinking')}
              </Text>
            </View>
          )}
        </View>
      )}

    </CreatorShell>
  );
};

const styles = StyleSheet.create({
  /*
   * La caja ya no va al final de la página: va anclada abajo. Así que la página
   * no tiene que guardar sitio para la barra de Weë —eso lo hace el pie— y su
   * relleno de abajo vuelve a ser el aire de siempre.
   */
  content: {
    gap: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  /* Sin tarjeta, sin borde y sin raya: los mensajes se apoyan en la página. */
  chat: {
    gap: SPACING.lg,
  },
  /* Un mensaje es su burbuja MÁS lo que va debajo: la hora y, si es tuyo, los tics. */
  mensaje: {
    gap: scale(5),
  },
  mensajeSuyo: { alignItems: 'flex-start' },
  mensajeMio: { alignItems: 'flex-end' },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm,
    maxWidth: '100%',
  },
  bubbleRowWee: {
    justifyContent: 'flex-start',
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  /*
   * El cerebro, en pequeño, al lado de lo que dice Weë Brain. Es el mismo
   * dibujo del centro de la pantalla: quien habla es ese, no una inicial.
   */
  avatar: {
    width: scale(38),
    height: scale(38),
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarDibujo: {
    width: scale(38),
    height: scale(38),
  },
  bubble: {
    maxWidth: '84%',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + scale(2),
    borderRadius: scale(20),
    gap: SPACING.sm,
  },
  bubbleMia: {
    backgroundColor: DORADO_DE_QUIEN_ESCRIBE,
  },
  /* La hora, y el acuse en lo tuyo. Pequeño y gris: está, pero no habla. */
  pieDelMensaje: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  /* Alineados con la burbuja: la suya empieza después del cerebro. */
  pieSuyo: { marginLeft: scale(38) + SPACING.sm + SPACING.md },
  pieMio: { marginRight: SPACING.md },
  hora: {
    fontSize: scale(11.5),
  },
  bubbleText: {
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(21),
  },
  bubbleImage: {
    width: scale(160),
    height: scale(160),
    borderRadius: BORDER_RADIUS.md,
  },
  sources: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  /* Las fuentes, en pastillas rellenas. Sin borde, como todo lo demás. */
  source: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    maxWidth: '100%',
    paddingHorizontal: SPACING.sm,
    paddingVertical: scale(3),
    borderRadius: BORDER_RADIUS.full,
  },
  sourceText: {
    fontSize: scale(11),
    maxWidth: scale(220),
  },
  hint: {
    fontSize: FONT_SIZE.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  thinking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingLeft: scale(38),
  },
  thinkingText: {
    fontSize: FONT_SIZE.xs,
  },
  /* Una fila de pastillas que se desplaza de lado. Nunca dos renglones. */
  atajos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  atajo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    height: scale(42),
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  atajoTexto: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  compositor: {
    gap: SPACING.sm,
  },
  priceRow: {
    paddingHorizontal: SPACING.xs,
  },
  priceHint: {
    fontSize: scale(11.5),
  },
  priceError: {
    fontSize: scale(11.5),
    fontWeight: FONT_WEIGHT.semibold,
  },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  attachmentImage: {
    width: scale(44),
    height: scale(44),
    borderRadius: BORDER_RADIUS.sm,
  },
});

/*
 * Weë AI es de la cuenta, no de un perfil: el taller se ve claro con el Perfil
 * Real y con el Perfil Weë. Lo de fuera —el cajón incluido— no se toca.
 */
export default enTemaClaro(BrainChatScreen);
