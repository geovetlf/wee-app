import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  PanResponder,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  FlatList,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useT } from '../contexts/IdiomaContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { Comment, Post } from '../services/firestoreService';
import { useComentarios } from '../hooks/useComentarios';
import { LineaDelHilo, ordenarEnHilos } from '../utils/hilosDeComentarios';
import AvatarDisplay from './avatars/AvatarDisplay';
import CommentCard from './CommentCard';
import EspacioDeEscritura from './EspacioDeEscritura';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, ICON_SIZE } from '../constants/design';
import { scale } from '../utils/scale';

const isWeb = Platform.OS === 'web';

interface HojaDeComentariosProps {
  visible: boolean;
  /** La publicación cuya conversación se abre. `null` mientras no hay ninguna. */
  post: Post | null;
  onClose: () => void;
  /** Abrir el perfil de quien escribió un comentario. Opcional: si no se pasa, no se ofrece. */
  onAbrirPerfil?: (userId: string) => void;
  /**
   * Abierta encima de un Weël (R9): el fondo casi no se atenúa, la hoja es algo transparente y no pasa del 70 % del
   * alto, para que el vídeo siga a la vista detrás y se entienda que no se ha salido de él.
   */
  sobreVideo?: boolean;
  /** Cuántos comentarios tiene la conversación abierta, cada vez que cambia (el contador del icono que la abrió). */
  onContar?: (postId: string, total: number) => void;
}

/** Lo que hay que arrastrar la hoja hacia abajo (o la velocidad) para que se cierre. */
export const ARRASTRE_PARA_CERRAR = 80;
const VELOCIDAD_PARA_CERRAR = 0.8;

/**
 * EL GESTO DE CERRAR, COMO REGLA PURA (R9, teléfono con d1cfda57: deslizar desde el asa o la cabecera no cerraba).
 *
 * Con solo `onMoveShouldSetPanResponder` el gesto casi nunca llegaba a esta zona: el asa mide 4 puntos, el resto de
 * la cabecera son vistas «solo de maquetación» que Android aplana (y entonces el toque cae en la hoja, que no es
 * hija de la zona) y nadie más reclamaba el toque al empezar. Ahora la zona:
 *  · reclama el toque AL EMPEZAR (`onStartShouldSetPanResponder`): la ✕ es más honda y lo reclama antes, así que
 *    sigue funcionando;
 *  · gana un arrastre vertical aunque lo empiece otra vista dentro de ella (`…Capture`);
 *  · no lo suelta a medias (`onPanResponderTerminationRequest` → false);
 *  · y es una vista de verdad (`collapsable={false}`) con el aire de arriba de la hoja dentro.
 * La lista no está dentro de la zona: su desplazamiento no cambia.
 */
export const configDelGestoDeCerrar = (
  mover: (dy: number) => void,
  cerrar: () => void,
  volver: () => void,
) => ({
  onStartShouldSetPanResponder: () => true,
  onMoveShouldSetPanResponder: (_e: unknown, g: { dx: number; dy: number }) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
  onMoveShouldSetPanResponderCapture: (_e: unknown, g: { dx: number; dy: number }) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
  onPanResponderTerminationRequest: () => false,
  onPanResponderMove: (_e: unknown, g: { dy: number }) => mover(Math.max(0, g.dy)),
  onPanResponderRelease: (_e: unknown, g: { dy: number; vy: number }) => {
    if (g.dy > ARRASTRE_PARA_CERRAR || g.vy > VELOCIDAD_PARA_CERRAR) cerrar();
    else volver();
  },
  onPanResponderTerminate: () => volver(),
});

/** Si la hoja puede ya contar los comentarios de esta publicación: abierta y con la primera respuesta de SU suscripción. */
export const debeContar = (visible: boolean, postId: string | undefined, respondidaDe: string | null): boolean =>
  visible && !!postId && respondidaDe === postId;

/** El fondo de la hoja sobre un vídeo: el color del tema con algo de transparencia (solo si es un #RRGGBB). */
export const fondoSobreVideo = (color: string): string => (/^#[0-9a-f]{6}$/i.test(color) ? color + 'E6' : color);

/**
 * LA CONVERSACIÓN DE UNA PUBLICACIÓN, EN UNA HOJA QUE SUBE DESDE ABAJO.
 *
 * Un sitio para leer y escribir, no una lista de fichas: los comentarios se
 * apoyan directamente sobre el fondo —sin tarjeta, sin borde, sin la raya que
 * los separaba— y lo que los ordena es el aire. Abajo, siempre a la vista, el
 * sitio donde se escribe.
 *
 * ─── EL TECLADO ─────────────────────────────────────────────────────────────
 *
 * Esta hoja tenía su propia cuenta del teclado —medirlo y subirse tantos puntos
 * como midiera— y se equivocaba. Weë ya había resuelto esto una vez y lo dejó
 * en `EspacioDeEscritura`, que es lo que se usa aquí.
 *
 * Merece recordar por qué no vale ninguna de las dos salidas evidentes. React
 * Native le pone `SOFT_INPUT_ADJUST_RESIZE` a la ventana del `Modal`, así que
 * en una aplicación normal se encogería sola; pero Weë se dibuja de borde a
 * borde (`edgeToEdgeEnabled`), y con eso ese modo queda inerte: la ventana no
 * se encoge y el teclado se dibuja encima. Y `KeyboardAvoidingView` tampoco
 * sirve en Android por lo mismo —calcula el solapamiento contra una ventana que
 * no se movió, le da cero y no aparta nada—, aunque en iOS sí acierte.
 *
 * `EspacioDeEscritura` aplica la regla de cada plataforma: en iOS el componente
 * de siempre, en Android el relleno puesto a mano con la altura que el sistema
 * sí reporta bien, y en web nada, porque el navegador ya se encarga. Y se apaga
 * solo cuando la hoja está cerrada.
 *
 * El resto lo hace la maquetación: la hoja se ancla abajo, su alto va en
 * PORCENTAJE —nunca en píxeles—, así que se recalcula contra el sitio que
 * queda; y la lista es lo único que crece y encoge. Por eso el compositor no se
 * mueve de su sitio y la conversación se desplaza por detrás de él, con teclado
 * o sin él.
 */
const HojaDeComentarios: React.FC<HojaDeComentariosProps> = ({ visible, post, onClose, onAbrirPerfil, sobreVideo = false, onContar }) => {
  const t = useT();
  const { theme } = useTheme();
  const { userProfile } = useUserProfile();
  const insets = useSafeAreaInsets();
  const {
    comentarios,
    cargando,
    texto,
    setTexto,
    adjunto,
    elegirAdjunto,
    quitarAdjunto,
    enviando,
    puedeEnviar,
    enviar,
    respondidaDe,
    respondiendoA,
    responderA,
    cancelarRespuesta,
  } = useComentarios(visible ? post : null);
  /* Cada comentario seguido de sus respuestas, con sangría (un solo nivel). */
  const lineas = useMemo(() => ordenarEnHilos(comentarios), [comentarios]);

  /*
   * El recuento de verdad (la misma suscripción que pinta la lista) vuelve a quien abrió la hoja, pero SOLO cuando esa
   * suscripción ya ha respondido para esta publicación (`debeContar`): antes, quien la abrió sigue con su número.
   */
  const postId = post?.id;
  useEffect(() => {
    if (debeContar(visible, postId, respondidaDe)) onContar?.(postId as string, comentarios.length);
  }, [visible, postId, respondidaDe, comentarios.length, onContar]);

  /*
   * ARRASTRAR HACIA ABAJO CIERRA. Solo desde el asa y la cabecera: la lista conserva su propio desplazamiento.
   * Si no se arrastra lo bastante, la hoja vuelve a su sitio.
   */
  const arrastre = useRef(new Animated.Value(0)).current;
  useEffect(() => { if (visible) arrastre.setValue(0); }, [visible, arrastre]);
  const gestoDeCerrar = useMemo(() => PanResponder.create(configDelGestoDeCerrar(
    (dy) => arrastre.setValue(dy),
    onClose,
    () => Animated.spring(arrastre, { toValue: 0, useNativeDriver: !isWeb }).start(),
  )), [arrastre, onClose]);
  /* Tocar «Responder» deja el cursor en la caja: se responde escribiendo, sin buscarla. */
  const campoRef = useRef<TextInput>(null);

  const pintarComentario = ({ item }: { item: LineaDelHilo<Comment> }) => (
    <CommentCard
      comment={item.comentario}
      onProfilePress={onAbrirPerfil}
      esRespuesta={item.esRespuesta}
      onResponder={(nombre) => { responderA(item.comentario, nombre); campoRef.current?.focus(); }}
    />
  );

  return (
    <Modal visible={visible} transparent animationType={isWeb ? 'none' : 'slide'} onRequestClose={onClose}>
      {/*
        El marco entero se aparta, no solo el compositor: así el alto máximo de
        la hoja se recalcula contra el sitio que queda y la lista encoge sola.
        Se apaga con la hoja cerrada para no escuchar el teclado de balde.
      */}
      <EspacioDeEscritura style={styles.marco} activo={visible}>
        {/* Tocar fuera cierra, y de paso deja ver la publicación de la que se habla. */}
        <TouchableOpacity style={[styles.atenuado, sobreVideo && styles.atenuadoSobreVideo]} activeOpacity={1} onPress={onClose} accessibilityLabel={t('wall.closeComments')} />

        <Animated.View
          style={[
            styles.hoja,
            sobreVideo && styles.hojaSobreVideo,
            { backgroundColor: sobreVideo ? fondoSobreVideo(theme.colors.background) : theme.colors.background, transform: [{ translateY: arrastre }] },
          ]}
        >
          <View {...gestoDeCerrar.panHandlers} collapsable={false} style={styles.zonaDeArrastre}>
          <View style={[styles.asa, { backgroundColor: theme.colors.border }]} />

          {/* Cabecera: qué es esto, cuántos hay y por dónde se sale. */}
          <View style={styles.cabecera}>
            <View style={styles.titulos}>
              <View style={styles.tituloFila}>
                <Text style={[styles.titulo, { color: theme.colors.text }]}>{t('wall.comments')}</Text>
                <View style={[styles.contador, { backgroundColor: theme.colors.surface }]}>
                  <Text style={[styles.contadorTexto, { color: theme.colors.textSecondary }]}>{comentarios.length}</Text>
                </View>
              </View>
              {!!post?.content?.trim() && (
                <Text style={[styles.contexto, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  {post.content.trim()}
                </Text>
              )}
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.cerrar, { backgroundColor: theme.colors.surface }]}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('wall.closeComments')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={ICON_SIZE.md} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          </View>

          {/*
            La conversación. Es lo único que crece y encoge —`flex: 1`—, así que
            con teclado o sin él el compositor se queda donde está y el último
            comentario se puede leer entero por encima de él.
          */}
          {cargando ? (
            <View style={styles.centrado}>
              <ActivityIndicator size="small" color={theme.colors.accent} />
            </View>
          ) : (
            <FlatList
              data={lineas}
              keyExtractor={(item) => item.comentario.id!}
              renderItem={pintarComentario}
              style={styles.lista}
              contentContainerStyle={comentarios.length === 0 ? styles.listaVacia : styles.listaLlena}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.vacio}>
                  <Ionicons name="chatbubble-outline" size={scale(52)} color={theme.colors.textSecondary} />
                  <Text style={[styles.vacioTitulo, { color: theme.colors.text }]}>{t('wall.beFirstToComment')}</Text>
                  <Text style={[styles.vacioTexto, { color: theme.colors.textSecondary }]}>
                    {t('wall.firstCommentHint')}
                  </Text>
                  <View style={[styles.vacioAcento, { backgroundColor: theme.colors.accent }]} />
                </View>
              }
            />
          )}

          {/* A quién se responde, con su aspa para volver a comentar la publicación. */}
          {!!respondiendoA && (
            <View style={styles.respondiendo}>
              <Text style={[styles.respondiendoTexto, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {t('wall.replyingTo', { nombre: respondiendoA.nombre })}
              </Text>
              <TouchableOpacity
                onPress={cancelarRespuesta}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={t('wall.cancelReply')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={ICON_SIZE.sm} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Lo que se va a enviar, antes de enviarlo, con su aspa para quitarlo. */}
          {!!adjunto && (
            <View style={styles.avance}>
              <Image source={{ uri: adjunto }} style={styles.avanceImagen} contentFit="cover" />
              <TouchableOpacity
                style={styles.avanceQuitar}
                onPress={quitarAdjunto}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={t('wall.removeImage')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={scale(13)} color="white" />
              </TouchableOpacity>
            </View>
          )}

          {/*
            El sitio donde se escribe: el avatar, un solo campo redondo con lo
            que se puede adjuntar dentro, y el envío. Nada cuadrado.
          */}
          <View
            style={[
              styles.compositor,
              { borderTopColor: theme.colors.border, paddingBottom: Math.max(insets.bottom, SPACING.md) },
            ]}
          >
            {!!userProfile && (
              <AvatarDisplay
                size={scale(38)}
                avatarType={userProfile.avatarType || 'predefined'}
                avatarId={userProfile.avatarId || 'male'}
                photoURL={typeof userProfile.photoURL === 'string' ? userProfile.photoURL : undefined}
                photoURLThumbnail={typeof userProfile.photoURLThumbnail === 'string' ? userProfile.photoURLThumbnail : undefined}
                backgroundColor={theme.colors.accent}
                showBorder={false}
              />
            )}
            <View style={[styles.campo, { backgroundColor: theme.colors.surface }]}>
              <TextInput
                ref={campoRef}
                style={[styles.entrada, { color: theme.colors.text }]}
                placeholder={t('wall.commentPlaceholder')}
                placeholderTextColor={theme.colors.textSecondary}
                value={texto}
                onChangeText={setTexto}
                multiline
                maxLength={500}
              />
              {/*
                Una sola puerta para adjuntar, y es la de imagen: es lo que Weë
                sabe subir hoy (`uploadCommentImage`, a Cloudinary). Un clip de
                archivo genérico al lado prometería algo que no existe.
              */}
              <TouchableOpacity
                onPress={elegirAdjunto}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={t('wall.attachImage')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="image-outline" size={ICON_SIZE.md} color={adjunto ? theme.colors.accentDark : theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.enviar, { backgroundColor: puedeEnviar || enviando ? theme.colors.accent : theme.colors.surface }]}
              onPress={enviar}
              disabled={!puedeEnviar}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t('wall.sendComment')}
              accessibilityState={{ disabled: !puedeEnviar }}
            >
              {enviando ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={ICON_SIZE.sm} color={puedeEnviar ? '#FFFFFF' : theme.colors.textSecondary} />
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </EspacioDeEscritura>
    </Modal>
  );
};

const styles = StyleSheet.create({
  marco: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  atenuado: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(31,41,55,0.45)',
  },
  /*
   * En porcentaje, nunca en píxeles: cuando el teclado aparta la hoja, el
   * máximo se recalcula contra el sitio que queda y no contra la pantalla.
   */
  hoja: {
    minHeight: '55%',
    maxHeight: '92%',
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
    overflow: 'hidden',
  },
  /* Sobre un Weël el vídeo tiene que seguir viéndose: apenas se atenúa. */
  atenuadoSobreVideo: {
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  /* Y la hoja se queda en un 55–70 % del alto: el vídeo asoma siempre por arriba. */
  hojaSobreVideo: {
    maxHeight: '70%',
  },
  /* El asa, la cabecera y el aire de arriba de la hoja: todo eso se puede arrastrar. */
  zonaDeArrastre: {
    paddingTop: SPACING.sm,
  },
  asa: {
    width: scale(38),
    height: scale(4),
    borderRadius: scale(2),
    alignSelf: 'center',
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  titulos: {
    flex: 1,
    gap: scale(3),
  },
  tituloFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  titulo: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: scale(-0.4),
  },
  contador: {
    minWidth: scale(26),
    height: scale(26),
    borderRadius: scale(13),
    paddingHorizontal: scale(7),
    alignItems: 'center',
    justifyContent: 'center',
  },
  contadorTexto: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },
  contexto: {
    fontSize: FONT_SIZE.sm,
  },
  cerrar: {
    width: scale(34),
    height: scale(34),
    borderRadius: scale(17),
    alignItems: 'center',
    justifyContent: 'center',
  },
  lista: {
    flex: 1,
  },
  listaLlena: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  listaVacia: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vacio: {
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.xxxl,
  },
  vacioTitulo: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    marginTop: SPACING.sm,
  },
  vacioTexto: {
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
    lineHeight: scale(20),
  },
  /* El punto de color de Weë, del tamaño justo para acentuar y no decorar. */
  vacioAcento: {
    width: scale(34),
    height: scale(4),
    borderRadius: scale(2),
    marginTop: SPACING.md,
  },
  respondiendo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.sm,
  },
  respondiendoTexto: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
  },
  avance: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.sm,
    alignSelf: 'flex-start',
  },
  avanceImagen: {
    width: scale(64),
    height: scale(64),
    borderRadius: BORDER_RADIUS.lg,
  },
  avanceQuitar: {
    position: 'absolute',
    top: -scale(5),
    right: SPACING.xl - scale(7),
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    backgroundColor: 'rgba(31,41,55,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compositor: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.md,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  campo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingLeft: SPACING.lg,
    paddingRight: SPACING.md,
    paddingVertical: scale(9),
    borderRadius: BORDER_RADIUS.full,
    minHeight: scale(46),
  },
  entrada: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    maxHeight: scale(110),
    padding: 0,
  },
  enviar: {
    width: scale(46),
    height: scale(46),
    borderRadius: scale(23),
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default HojaDeComentarios;
