import React from 'react';
import {
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
import { useUserProfile } from '../contexts/UserProfileContext';
import { Comment, Post } from '../services/firestoreService';
import { useComentarios } from '../hooks/useComentarios';
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
}

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
const HojaDeComentarios: React.FC<HojaDeComentariosProps> = ({ visible, post, onClose, onAbrirPerfil }) => {
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
  } = useComentarios(visible ? post : null);

  const pintarComentario = ({ item }: { item: Comment }) => (
    <CommentCard comment={item} onProfilePress={onAbrirPerfil} />
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
        <TouchableOpacity style={styles.atenuado} activeOpacity={1} onPress={onClose} accessibilityLabel="Cerrar comentarios" />

        <View style={[styles.hoja, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.asa, { backgroundColor: theme.colors.border }]} />

          {/* Cabecera: qué es esto, cuántos hay y por dónde se sale. */}
          <View style={styles.cabecera}>
            <View style={styles.titulos}>
              <View style={styles.tituloFila}>
                <Text style={[styles.titulo, { color: theme.colors.text }]}>Comentarios</Text>
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
              accessibilityLabel="Cerrar comentarios"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={ICON_SIZE.md} color={theme.colors.text} />
            </TouchableOpacity>
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
              data={comentarios}
              keyExtractor={(item) => item.id!}
              renderItem={pintarComentario}
              style={styles.lista}
              contentContainerStyle={comentarios.length === 0 ? styles.listaVacia : styles.listaLlena}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.vacio}>
                  <Ionicons name="chatbubble-outline" size={scale(52)} color={theme.colors.textSecondary} />
                  <Text style={[styles.vacioTitulo, { color: theme.colors.text }]}>Sé el primero en comentar</Text>
                  <Text style={[styles.vacioTexto, { color: theme.colors.textSecondary }]}>
                    Toda gran conversación empieza con una idea.
                  </Text>
                  <View style={[styles.vacioAcento, { backgroundColor: theme.colors.accent }]} />
                </View>
              }
            />
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
                accessibilityLabel="Quitar la imagen"
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
                style={[styles.entrada, { color: theme.colors.text }]}
                placeholder="Escribe un comentario…"
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
                accessibilityLabel="Adjuntar una imagen"
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
              accessibilityLabel="Enviar comentario"
              accessibilityState={{ disabled: !puedeEnviar }}
            >
              {enviando ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={ICON_SIZE.sm} color={puedeEnviar ? '#FFFFFF' : theme.colors.textSecondary} />
              )}
            </TouchableOpacity>
          </View>
        </View>
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
    paddingTop: SPACING.sm,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
    overflow: 'hidden',
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
