import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ImageViewer from './ImageViewer';
import { useTheme } from '../contexts/ThemeContext';
import { useIdioma } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserById } from '../hooks/useUserById';
import { referenciaPublicaDe } from '../utils/identidadPublica';
import { Comment } from '../services/firestoreService';
import { voteService, VoteType } from '../services/voteService';
import { getRelativeTime } from '../utils/formatoCorto';
import AvatarDisplay from './avatars/AvatarDisplay';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, ICON_SIZE } from '../constants/design';
import { scale } from '../utils/scale';

interface CommentCardProps {
  comment: Comment;
  onProfilePress?: (userId: string) => void;
}

/**
 * UN COMENTARIO, SIN CAJA.
 *
 * Respira directamente sobre el fondo: ni tarjeta, ni borde, ni sombra, ni la
 * línea que antes separaba uno de otro. En una conversación las rayas no
 * ayudan a leer —el avatar y el aire ya dicen dónde empieza cada quien— y
 * convertían la hoja en una lista de fichas.
 *
 * Y se valora con el pulgar, no con un corazón: un comentario se comparte o no
 * se comparte, que no es lo mismo que gustar. Detrás está el voto que Weë ya
 * tenía —`voteService.voteOnComment`, la colección `commentVotes` y los
 * contadores del propio comentario—, así que aquí no hay sistema nuevo: solo
 * la cara que le faltaba.
 */
const CommentCard: React.FC<CommentCardProps> = ({ comment, onProfilePress }) => {
  const { theme } = useTheme();
  const { t, locale } = useIdioma();
  const { user } = useAuth();
  const { userProfile: commentAuthor, loading: loadingAuthor } = useUserById(comment.userId);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);

  /*
   * El voto, con respuesta inmediata. Se pinta lo que la persona acaba de
   * tocar y se manda por detrás; si el envío falla se vuelve a lo que había,
   * que es mejor que un pulgar que tarda medio segundo en encenderse.
   */
  const [voto, setVoto] = useState<VoteType | null>(null);
  const [aFavor, setAFavor] = useState(comment.agreementCount || 0);
  const [enContra, setEnContra] = useState(comment.disagreementCount || 0);

  useEffect(() => {
    let vivo = true;
    if (!user || !comment.id) return;
    voteService.getUserCommentVote(comment.id, user.uid).then((suyo) => {
      if (vivo) setVoto(suyo);
    });
    return () => {
      vivo = false;
    };
  }, [comment.id, user]);

  /* Lo que llega de Firestore manda: si otro voto entra por la suscripción, se ve. */
  useEffect(() => {
    setAFavor(comment.agreementCount || 0);
    setEnContra(comment.disagreementCount || 0);
  }, [comment.agreementCount, comment.disagreementCount]);

  const votar = async (tipo: VoteType) => {
    if (!user || !comment.id || voto === tipo) return;
    const antes = { voto, aFavor, enContra };
    setVoto(tipo);
    setAFavor((n) => n + (tipo === 'agree' ? 1 : antes.voto === 'agree' ? -1 : 0));
    setEnContra((n) => n + (tipo === 'disagree' ? 1 : antes.voto === 'disagree' ? -1 : 0));
    try {
      await voteService.voteOnComment(comment.id, user.uid, tipo);
    } catch {
      setVoto(antes.voto);
      setAFavor(antes.aFavor);
      setEnContra(antes.enContra);
    }
  };

  const fechaDelComentario = () => {
    const cuando: any = comment.createdAt;
    if (!cuando) return new Date();
    if (typeof cuando.toDate === 'function') return cuando.toDate();
    if (cuando instanceof Date) return cuando;
    if (typeof cuando === 'object' && 'seconds' in cuando) return new Date(cuando.seconds * 1000);
    return new Date();
  };

  const pulgar = (tipo: VoteType, cuenta: number, etiqueta: string) => {
    const puesto = voto === tipo;
    return (
      <TouchableOpacity
        style={styles.pulgar}
        onPress={() => votar(tipo)}
        activeOpacity={0.6}
        disabled={!user}
        accessibilityRole="button"
        accessibilityLabel={etiqueta}
        accessibilityState={{ selected: puesto }}
        hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
      >
        <Ionicons
          name={tipo === 'agree' ? (puesto ? 'thumbs-up' : 'thumbs-up-outline') : puesto ? 'thumbs-down' : 'thumbs-down-outline'}
          size={ICON_SIZE.xs}
          color={puesto ? theme.colors.accentDark : theme.colors.textSecondary}
        />
        {cuenta > 0 && (
          <Text style={[styles.cuenta, { color: puesto ? theme.colors.accentDark : theme.colors.textSecondary }]}>
            {cuenta}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.fila}>
      <TouchableOpacity onPress={() => onProfilePress?.(referenciaPublicaDe(commentAuthor) ?? comment.userId)} activeOpacity={0.7} disabled={loadingAuthor}>
        {loadingAuthor ? (
          <View style={[styles.avatarVacio, { backgroundColor: theme.colors.surface }]} />
        ) : (
          <AvatarDisplay
            size={scale(34)}
            avatarType={commentAuthor?.avatarType || 'predefined'}
            avatarId={commentAuthor?.avatarId || 'male'}
            photoURL={typeof commentAuthor?.photoURL === 'string' ? commentAuthor.photoURL : undefined}
            photoURLThumbnail={typeof commentAuthor?.photoURLThumbnail === 'string' ? commentAuthor.photoURLThumbnail : undefined}
            backgroundColor={theme.colors.accent}
            showBorder={false}
          />
        )}
      </TouchableOpacity>

      <View style={styles.cuerpo}>
        <View style={styles.cabecera}>
          <TouchableOpacity onPress={() => onProfilePress?.(referenciaPublicaDe(commentAuthor) ?? comment.userId)} activeOpacity={0.7}>
            <Text style={[styles.nombre, { color: theme.colors.text }]} numberOfLines={1}>
              {loadingAuthor ? '…' : commentAuthor?.displayName || t('common.user')}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.cuando, { color: theme.colors.textSecondary }]}>
            {getRelativeTime(fechaDelComentario(), locale)}
          </Text>
        </View>

        {!!comment.content && (
          <Text style={[styles.texto, { color: theme.colors.text }]}>{comment.content}</Text>
        )}

        {!!comment.imageUrl && (
          <TouchableOpacity onPress={() => setImageViewerVisible(true)} activeOpacity={0.9} style={styles.adjunto}>
            <Image source={{ uri: comment.imageUrl }} style={[styles.imagen, { backgroundColor: theme.colors.surface }]} resizeMode="cover" />
          </TouchableOpacity>
        )}

        <View style={styles.acciones}>
          {pulgar('agree', aFavor, t('wall.agreeWithComment'))}
          {pulgar('disagree', enContra, t('wall.disagreeWithComment'))}
        </View>
      </View>

      {!!comment.imageUrl && (
        <ImageViewer visible={imageViewerVisible} imageUrls={[comment.imageUrl]} onClose={() => setImageViewerVisible(false)} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  /* Sin fondo, sin borde y sin línea abajo: el aire es lo que separa. */
  fila: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
  },
  avatarVacio: {
    width: scale(34),
    height: scale(34),
    borderRadius: scale(17),
  },
  cuerpo: {
    flex: 1,
    gap: scale(3),
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.sm,
  },
  nombre: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    letterSpacing: scale(-0.1),
    flexShrink: 1,
  },
  cuando: {
    fontSize: FONT_SIZE.xs,
  },
  texto: {
    fontSize: FONT_SIZE.base,
    lineHeight: scale(21),
    letterSpacing: scale(-0.1),
  },
  adjunto: {
    marginTop: scale(6),
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  imagen: {
    width: '100%',
    height: scale(160),
  },
  acciones: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
    marginTop: scale(4),
  },
  pulgar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
  },
  cuenta: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
  },
});

export default CommentCard;
