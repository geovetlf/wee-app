import { useCallback, useEffect, useState } from 'react';
import { Keyboard } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Comment, Post, commentsService, postsService } from '../services/firestoreService';
import { notificationService } from '../services/notificationService';
import { uploadCommentImage } from '../services/storageService';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { notify } from '../utils/notify';
import { useT } from '../contexts/IdiomaContext';

/**
 * LA CONVERSACIÓN DE UNA PUBLICACIÓN, EN UN SOLO SITIO.
 *
 * Escuchar los comentarios, escribir uno, adjuntarle una imagen y enviarlo era
 * código que vivía dentro de `PostDetailScreen`. Cuando la conversación pasó a
 * abrirse también desde el muro —en una hoja que sube desde abajo— había dos
 * caminos posibles: copiarlo, o sacarlo de allí. Está sacado, y por eso los dos
 * sitios publican EXACTAMENTE igual: mismo servicio, mismo contador, misma
 * notificación. Si mañana cambia la forma de comentar, cambia aquí y ya.
 *
 * Lo que NO vive aquí es cómo se ve: la hoja y la pantalla pintan lo suyo.
 *
 * El orden lo pone `commentsService.subscribeToPost`, que es el de siempre —del
 * más antiguo al más nuevo— y no se toca: cambiarlo movería de sitio todas las
 * conversaciones que ya existen.
 */
export const useComentarios = (post: Post | null) => {
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  const t = useT();

  const [comentarios, setComentarios] = useState<Comment[]>([]);
  const [cargando, setCargando] = useState(true);
  const [texto, setTexto] = useState('');
  const [adjunto, setAdjunto] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  /*
   * De qué publicación ha llegado YA la primera respuesta de la suscripción. `cargando` no basta para saberlo: al abrir
   * una publicación, el primer dibujado aún trae el `cargando: false` y la lista vacía de «sin publicación», y quien
   * contara entonces leería 0 (R9: el contador del Weël parpadeaba a 0 al abrir la hoja).
   */
  const [respondidaDe, setRespondidaDe] = useState<string | null>(null);
  /*
   * A QUIÉN SE RESPONDE (R9). Si está puesto, lo que se envíe lleva `parentCommentId` con el id del comentario RAÍZ
   * (`utils/hilosDeComentarios.ts`: un solo nivel). El nombre es solo para enseñarlo en la caja.
   */
  const [respondiendoA, setRespondiendoA] = useState<{ id: string; nombre: string } | null>(null);
  const responderA = useCallback((comentario: Comment, nombre: string) => {
    /* Responder a una respuesta cuelga del mismo comentario raíz: un solo nivel. */
    const raiz = comentario.parentCommentId || comentario.id;
    if (raiz) setRespondiendoA({ id: raiz, nombre });
  }, []);
  const cancelarRespuesta = useCallback(() => setRespondiendoA(null), []);

  const postId = post?.id;

  /* Al vuelo: el que comenta ve su comentario aparecer, y también los de los demás. */
  useEffect(() => {
    if (!postId) {
      setComentarios([]);
      setCargando(false);
      /* Cerrada: al volver a abrir (aunque sea la misma publicación) hay que esperar otra vez su primera respuesta. */
      setRespondidaDe(null);
      setRespondiendoA(null);
      return;
    }
    setCargando(true);
    const cancelar = commentsService.subscribeToPost(postId, (llegados) => {
      setComentarios(llegados);
      setCargando(false);
      setRespondidaDe(postId);
    });
    return () => cancelar();
  }, [postId]);

  /*
   * Adjuntar una imagen. Weë ya sabía hacerlo —el compositor de la pantalla de
   * la publicación lo hacía— y usa lo mismo: el selector del sistema y, al
   * enviar, la subida que ya existía para comentarios.
   */
  const elegirAdjunto = useCallback(async () => {
    try {
      const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permiso.granted) {
        notify(t('composer.permissionsNeeded'), t('composer.galleryForImages'));
        return;
      }
      const elegido = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!elegido.canceled && elegido.assets[0]) setAdjunto(elegido.assets[0].uri);
    } catch (error) {
      console.error('Error picking image:', error);
      notify(t('common.error'), t('avatar.pickFailed'));
    }
  }, [t]);

  const quitarAdjunto = useCallback(() => setAdjunto(null), []);

  const puedeEnviar = (!!texto.trim() || !!adjunto) && !enviando && !!user && !!postId;

  /*
   * Enviar. El texto y el adjunto se limpian ANTES de que salga nada, para que
   * el compositor responda al instante; si algo falla se devuelven tal cual
   * estaban, que es lo que evita perder lo escrito.
   */
  const enviar = useCallback(async () => {
    const contenido = texto.trim();
    const imagen = adjunto;
    const respondida = respondiendoA;
    if ((!contenido && !imagen) || !user || !postId || enviando) return;

    setTexto('');
    setAdjunto(null);
    setRespondiendoA(null);
    setEnviando(true);

    try {
      let imageUrl: string | undefined;
      if (imagen) {
        try {
          const respuesta = await fetch(imagen);
          const blob = await respuesta.blob();
          imageUrl = await uploadCommentImage(blob, user.uid);
        } catch (errorDeSubida) {
          console.error('Error uploading comment image:', errorDeSubida);
          notify(t('common.error'), t('wall.commentImageFailed'));
          setTexto(contenido);
          setAdjunto(imagen);
          setRespondiendoA(respondida);
          setEnviando(false);
          return;
        }
      }

      const uidActivo = userProfile?.uid || user.uid;
      const nuevo: Omit<Comment, 'id'> = {
        postId,
        userId: uidActivo,
        content: contenido,
        likes: 0,
        createdAt: new Date() as any,
        updatedAt: new Date() as any,
        /* Solo si existe: Firestore no acepta `undefined`. */
        ...(imageUrl && { imageUrl }),
        /* Una respuesta es un comentario más, con el campo que el modelo ya tenía. */
        ...(respondida && { parentCommentId: respondida.id }),
      };

      const comentarioId = await commentsService.create(nuevo);
      await postsService.update(postId, { comments: (post?.comments || 0) + 1 });

      if (userProfile && post && post.userId !== uidActivo) {
        try {
          await notificationService.createCommentNotification(
            post.userId,
            uidActivo,
            userProfile.displayName || 'Usuario',
            { type: userProfile.avatarType, id: userProfile.avatarId, url: userProfile.photoURL },
            postId,
            post.content,
            comentarioId,
            contenido,
          );
        } catch (errorDeAviso) {
          console.error('⚠️ Error creando notificación de comentario:', errorDeAviso);
        }
      }

      Keyboard.dismiss();
    } catch (error) {
      console.error('❌ Error enviando comentario:', error);
      setTexto(contenido);
      if (imagen) setAdjunto(imagen);
      setRespondiendoA(respondida);
      notify(t('common.error'), t('wall.commentSendFailed'));
    } finally {
      setEnviando(false);
    }
  }, [texto, adjunto, respondiendoA, user, postId, enviando, userProfile, post, t]);

  return {
    comentarios,
    cargando,
    respondidaDe,
    respondiendoA,
    responderA,
    cancelarRespuesta,
    texto,
    setTexto,
    adjunto,
    elegirAdjunto,
    quitarAdjunto,
    enviando,
    puedeEnviar,
    enviar,
  };
};
