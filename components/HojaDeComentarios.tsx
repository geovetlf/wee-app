import React, { useEffect, useState } from 'react';
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
  Keyboard,
  useWindowDimensions,
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
 * Tocar el contador de comentarios llevaba a otra PANTALLA —la de la
 * publicación— y desde ahí la conversación quedaba a un scroll de distancia,
 * detrás del contenido. Salías del muro para leer cuatro respuestas y volvías
 * perdiendo el sitio. Ahora la conversación se abre encima del muro y se cierra
 * dejándote donde estabas: la publicación sigue detrás, atenuada, para que se
 * vea de quién se está hablando.
 *
 * Es la misma hoja que ya usa Weë para "Crear": un `Modal` transparente que
 * entra deslizándose desde abajo, con el fondo atenuado y las esquinas de
 * arriba redondeadas. No hay un sistema nuevo de hojas.
 *
 * Y publica por donde se publicaba: `useComentarios` es el mismo camino que usa
 * la pantalla de la publicación —mismo servicio, mismo contador, misma
 * notificación—, así que ningún comentario existente cambia de sitio ni de
 * dueño.
 */
const HojaDeComentarios: React.FC<HojaDeComentariosProps> = ({ visible, post, onClose, onAbrirPerfil }) => {
  const { theme } = useTheme();
  const { userProfile } = useUserProfile();
  const insets = useSafeAreaInsets();
  const { height: altoDePantalla } = useWindowDimensions();
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

  /*
   * El teclado se aparta a mano, como en el resto de Weë: en Android un `Modal`
   * es su propia ventana y `adjustResize` no la encoge, así que el compositor
   * quedaría debajo del teclado. Se mide su alto y la hoja sube justo eso.
   */
  const [altoDelTeclado, setAltoDelTeclado] = useState(0);
  useEffect(() => {
    const alAbrirse = Keyboard.addListener('keyboardDidShow', (e) => setAltoDelTeclado(e.endCoordinates.height));
    const alCerrarse = Keyboard.addListener('keyboardDidHide', () => setAltoDelTeclado(0));
    return () => {
      alAbrirse.remove();
      alCerrarse.remove();
    };
  }, []);

  /* Al cerrarse, el teclado se va con ella. */
  useEffect(() => {
    if (!visible) Keyboard.dismiss();
  }, [visible]);

  /*
   * Alta para leer, pero nunca más de lo que queda libre: con el teclado fuera
   * ocupa el 85% de la pantalla, y con el teclado abierto se encoge para que la
   * cabecera no se salga por arriba.
   */
  const altoLibre = altoDePantalla - altoDelTeclado - insets.top - scale(16);
  const altoDeLaHoja = Math.max(scale(280), Math.min(altoDePantalla * 0.85, altoLibre));

  const hueco = altoDelTeclado > 0 ? SPACING.sm : Math.max(insets.bottom, SPACING.sm);

  const pintarComentario = ({ item }: { item: Comment }) => (
    <CommentCard comment={item} onProfilePress={onAbrirPerfil} />
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isWeb ? 'none' : 'slide'}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.fondo}>
        {/* Tocar fuera cierra, y de paso deja ver la publicación de la que se habla. */}
        <TouchableOpacity style={styles.atenuado} activeOpacity={1} onPress={onClose} accessibilityLabel="Cerrar comentarios" />

        <View
          style={[
            styles.hoja,
            {
              backgroundColor: theme.colors.background,
              height: altoDeLaHoja,
              marginBottom: altoDelTeclado,
            },
          ]}
        >
          <View style={[styles.asa, { backgroundColor: theme.colors.border }]} />

          {/* Cabecera: de qué conversación se trata, y por dónde se sale. */}
          <View style={[styles.cabecera, { borderBottomColor: theme.colors.border }]}>
            <View style={styles.cabeceraTitulos}>
              <Text style={[styles.titulo, { color: theme.colors.text }]}>
                Comentarios{comentarios.length > 0 ? ` · ${comentarios.length}` : ''}
              </Text>
              {!!post?.content?.trim() && (
                <Text style={[styles.subtitulo, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  {post.content.trim()}
                </Text>
              )}
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.cerrar}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Cerrar comentarios"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={ICON_SIZE.md} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/*
            La lista, con el orden de siempre: del comentario más antiguo al más
            nuevo. `FlatList` y no un `map`, que es lo que hace el resto de Weë
            con listas que pueden crecer: así una conversación larga no monta de
            golpe todas las tarjetas.
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
              contentContainerStyle={comentarios.length === 0 ? styles.listaVacia : styles.listaContenido}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.centrado}>
                  <Ionicons name="chatbubbles-outline" size={scale(40)} color={theme.colors.textSecondary} />
                  <Text style={[styles.vacio, { color: theme.colors.textSecondary }]}>Sé el primero en comentar</Text>
                </View>
              }
            />
          )}

          {/* Lo que se va a enviar, antes de enviarlo, y con su aspa para quitarlo. */}
          {!!adjunto && (
            <View style={[styles.avance, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
              <Image source={{ uri: adjunto }} style={styles.avanceImagen} contentFit="cover" />
              <TouchableOpacity
                style={styles.avanceQuitar}
                onPress={quitarAdjunto}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Quitar la imagen"
              >
                <Ionicons name="close" size={scale(14)} color="white" />
              </TouchableOpacity>
            </View>
          )}

          {/* El compositor, siempre abajo y siempre a la vista. */}
          <View
            style={[
              styles.compositor,
              { backgroundColor: theme.colors.background, borderTopColor: theme.colors.border, paddingBottom: hueco },
            ]}
          >
            {!!userProfile && (
              <AvatarDisplay
                size={scale(36)}
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
                placeholder="Escribe un comentario..."
                placeholderTextColor={theme.colors.textSecondary}
                value={texto}
                onChangeText={setTexto}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                onPress={elegirAdjunto}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Adjuntar una imagen"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="image-outline" size={ICON_SIZE.md} color={adjunto ? theme.colors.accent : theme.colors.text} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.enviar, { backgroundColor: puedeEnviar || enviando ? theme.colors.accent : theme.colors.surface }]}
              onPress={enviar}
              disabled={!puedeEnviar}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Enviar comentario"
            >
              {enviando ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={ICON_SIZE.sm} color={puedeEnviar ? '#FFFFFF' : theme.colors.textSecondary} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fondo: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  atenuado: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(31,41,55,0.45)',
  },
  hoja: {
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    paddingTop: SPACING.sm,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
    overflow: 'hidden',
  },
  asa: {
    width: scale(40),
    height: scale(4),
    borderRadius: scale(2),
    alignSelf: 'center',
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cabeceraTitulos: {
    flex: 1,
    gap: scale(1),
  },
  titulo: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },
  subtitulo: {
    fontSize: FONT_SIZE.xs,
  },
  cerrar: {
    padding: scale(2),
  },
  lista: {
    flex: 1,
  },
  listaContenido: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  listaVacia: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xl,
  },
  vacio: {
    fontSize: FONT_SIZE.sm,
  },
  avance: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  avanceImagen: {
    width: scale(56),
    height: scale(56),
    borderRadius: BORDER_RADIUS.md,
  },
  avanceQuitar: {
    position: 'absolute',
    top: SPACING.sm - scale(4),
    left: SPACING.lg + scale(40),
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compositor: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  campo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: scale(6),
    borderRadius: BORDER_RADIUS.full,
  },
  entrada: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    maxHeight: scale(96),
    padding: 0,
  },
  enviar: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(19),
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default HojaDeComentarios;
