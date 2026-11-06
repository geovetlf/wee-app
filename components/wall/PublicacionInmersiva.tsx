import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, Platform, ScrollView, Share, ActivityIndicator, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useIdioma } from '../../contexts/IdiomaContext';
import { useAuth } from '../../contexts/AuthContext';
import { useComentariosDeLaPublicacion } from '../../contexts/ComentariosContext';
import { useUserById } from '../../hooks/useUserById';
import { useVote } from '../../hooks/useVote';
import { useBookmarks } from '../../hooks/useBookmarks';
import { useCommunityById } from '../../hooks/useCommunityById';
import { Post, postsService } from '../../services/firestoreService';
import { referenciaPublicaDe } from '../../utils/identidadPublica';
import { compartirFueraDeWee } from '../../utils/compartirFuera';
import { formatNumber, getRelativeTime } from '../../utils/formatoCorto';
import { nombreDeComunidad } from '../../utils/comunidadesDeWee';
import { seccionDe } from '../../utils/sectionFeed';
import { notify } from '../../utils/notify';
import AvatarDisplay from '../avatars/AvatarDisplay';
import MedioNoDisponible from '../media/MedioNoDisponible';
import ReportSheet from '../ReportSheet';
import HowIMadeIt from '../HowIMadeIt';
import Poll from '../Poll';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';
import { useDireccion } from '../../hooks/useDireccion';

/*
 * UNA PUBLICACIÓN DEL WÄLL INMERSIVO, A PANTALLA COMPLETA.
 *
 * La misma publicación que pinta `PostCard` en el muro del Home, contada de otra manera: el medio llena la pantalla,
 * el autor y el texto van abajo sobre un velo, y las acciones en una columna a la derecha, como en los Weëls. La lógica
 * social es la de siempre y no se duplica: votar es `useVote` (vota la CUENTA), guardar es `useBookmarks`, comentar abre
 * la hoja única de `ComentariosContext`, denunciar es `ReportSheet`, y el perfil se abre por la referencia pública del
 * autor (`referenciaPublicaDe`), nunca por el uid crudo. Un repost enseña la publicación original y quién la compartió.
 *
 * Solo se reproduce el vídeo de la publicación ACTIVA (la que se ve), y en silencio hasta que la persona lo pide:
 * los navegadores no dejan sonar un vídeo sin un gesto, y tener varios reproductores a la vez agota los decodificadores
 * de un teléfono Android.
 */

const isWeb = Platform.OS === 'web';
const DORADO = '#F5B731';

interface Props {
  post: Post;
  activa: boolean;
  alto: number;
  ancho: number;
  /** Lo que se reserva abajo para la barra de la app, para que el texto no quede debajo. */
  margenInferior: number;
}

const BotonDelRail: React.FC<{ icono: string; etiqueta: string; cuenta?: string; activo?: boolean; colorActivo?: string; onPress: () => void }> = ({ icono, etiqueta, cuenta, activo, colorActivo = DORADO, onPress }) => (
  <TouchableOpacity style={[s.railBoton, isWeb && ({ cursor: 'pointer' } as any)]} onPress={onPress} accessibilityRole="button" accessibilityLabel={etiqueta} accessibilityState={activo !== undefined ? { selected: activo } : undefined} hitSlop={6}>
    <View style={s.railIcono}>
      <Ionicons name={icono as any} size={scale(26)} color={activo ? colorActivo : '#FFFFFF'} />
    </View>
    {cuenta !== undefined && <Text style={s.railCuenta}>{cuenta}</Text>}
  </TouchableOpacity>
);

const PublicacionInmersiva: React.FC<Props> = ({ post, activa, alto, ancho, margenInferior }) => {
  const { t, locale, idioma } = useIdioma();
  const dir = useDireccion();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { abrirComentarios } = useComentariosDeLaPublicacion();

  /* ── El repost enseña la original ─────────────────────────────────────── */
  const esRepost = post.isRepost === true && !!post.originalPostId;
  const [original, setOriginal] = useState<Post | null>(null);
  useEffect(() => {
    let vivo = true;
    if (esRepost) postsService.getById(post.originalPostId!).then((p) => { if (vivo) setOriginal(p); }).catch(() => {});
    return () => { vivo = false; };
  }, [esRepost, post.originalPostId]);
  const visible: Post = esRepost && original ? original : post;

  const { userProfile: autor } = useUserById(visible.userId);
  const { userProfile: quienCompartio } = useUserById(esRepost ? post.userId : '');
  const { community } = useCommunityById(visible.communityId);
  const seccion = useMemo(() => seccionDe(visible), [visible]);

  const { stats, voteAgree, voteDisagree } = useVote({
    postId: visible.id!,
    userId: user?.uid,
    initialStats: { agreementCount: visible.agreementCount || 0, disagreementCount: visible.disagreementCount || 0 },
  });
  const { isSaved, toggle: alternarGuardado } = useBookmarks();
  const guardada = isSaved(visible.id!);

  const [expandida, setExpandida] = useState(false);
  const [denunciando, setDenunciando] = useState(false);
  const [silencio, setSilencio] = useState(true);
  const [medioRoto, setMedioRoto] = useState(false);
  const [cargandoVideo, setCargandoVideo] = useState(true);
  const [imagenActual, setImagenActual] = useState(0);
  const [intento, setIntento] = useState(0);

  const pedirSesion = () => navigation.navigate('Login');
  const conSesion = (accion: () => void) => () => (user ? accion() : pedirSesion());

  const abrirPerfil = (perfil: any, uid: string) => {
    const referencia = referenciaPublicaDe(perfil) ?? uid;
    if (referencia) navigation.navigate('UserProfile', { userId: referencia });
  };

  const compartir = async () => {
    if (visible.videoUrl) {
      const ok = await compartirFueraDeWee(visible.id!, t('common.share'), idioma);
      if (!ok) notify(t('wall.shareFailed'));
      return;
    }
    try {
      await Share.share({ message: `${visible.content}\n\n- ${t('wall.publishedOnWee')}` });
    } catch {
      notify(t('common.error'), t('wall.shareFailed'));
    }
  };

  const imagenes = visible.imageUrls ?? [];
  const nombreDelAutor = autor?.displayName || t('common.user');
  const fecha = (visible as any).createdAt?.toDate ? getRelativeTime((visible as any).createdAt.toDate(), locale) : '';
  const etiquetaDeComunidad = community ? nombreDeComunidad(community, t, locale) : null;

  /* ── El medio ─────────────────────────────────────────────────────────── */
  const medio = (() => {
    if (medioRoto) {
      return <MedioNoDisponible style={StyleSheet.absoluteFill} alReintentar={() => { setMedioRoto(false); setIntento((n) => n + 1); }} />;
    }
    if (visible.videoUrl) {
      return (
        <>
          <Video
            key={intento}
            source={{ uri: visible.videoUrl }}
            style={StyleSheet.absoluteFill}
            videoStyle={isWeb ? ({ width: '100%', height: '100%', objectFit: 'contain' } as any) : undefined}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay={activa}
            isLooping
            isMuted={silencio}
            onLoad={() => setCargandoVideo(false)}
            onError={() => setMedioRoto(true)}
          />
          {cargandoVideo && <ActivityIndicator style={s.centro} color="#FFFFFF" />}
        </>
      );
    }
    if (imagenes.length > 0) {
      const alDeslizar = (e: NativeSyntheticEvent<NativeScrollEvent>) => setImagenActual(Math.round(e.nativeEvent.contentOffset.x / Math.max(1, ancho)));
      return (
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={alDeslizar} onScroll={isWeb ? alDeslizar : undefined} scrollEventThrottle={64} style={StyleSheet.absoluteFill}>
          {imagenes.map((url, i) => (
            <View key={`${url}-${i}`} style={{ width: ancho, height: alto }} accessible accessibilityLabel={imagenes.length > 1 ? t('wall.imageOf', { numero: i + 1, total: imagenes.length }) : undefined}>
              {/* Detrás, la misma imagen difuminada: una foto vertical u horizontal nunca deja franjas negras vacías. */}
              <Image source={{ uri: visible.imageUrlsThumbnails?.[i] || url }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={30} transition={0} accessible={false} />
              <View style={[StyleSheet.absoluteFill, s.oscurecer]} />
              <Image
                source={{ uri: url }}
                placeholder={visible.imageUrlsThumbnails?.[i] ? { uri: visible.imageUrlsThumbnails[i] } : undefined}
                style={StyleSheet.absoluteFill}
                contentFit="contain"
                transition={150}
                cachePolicy="memory-disk"
                priority={activa ? 'high' : 'low'}
                onError={() => setMedioRoto(true)}
                accessible={false}
              />
            </View>
          ))}
        </ScrollView>
      );
    }
    /* Una publicación de texto (o una pregunta, o una encuesta): el texto ES el medio. */
    return <LinearGradient colors={['#1A1530', '#2E2050', '#3B2660']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />;
  })();

  const soloTexto = !visible.videoUrl && imagenes.length === 0 && !medioRoto;

  return (
    <View style={[s.pagina, { height: alto, width: ancho }]}>
      {medio}

      {soloTexto && (
        <ScrollView style={[StyleSheet.absoluteFill]} contentContainerStyle={[s.textoGrandeCaja, { paddingBottom: margenInferior + scale(150) }]}>
          <Text style={s.textoGrande}>{visible.content}</Text>
          {!!visible.poll && (
            <View style={s.encuesta}>
              <Poll postId={visible.id!} poll={visible.poll} onRequireAuth={pedirSesion} />
            </View>
          )}
        </ScrollView>
      )}

      {/* El velo de abajo: lo justo para leer el texto blanco sobre cualquier foto. */}
      <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.75)']} style={[s.veloAbajo, { height: alto * 0.45 }]} pointerEvents="none" />

      {imagenes.length > 1 && (
        <View style={[s.puntos, { bottom: margenInferior + scale(12) }]} pointerEvents="none">
          {imagenes.map((_, i) => <View key={i} style={[s.punto, i === imagenActual && s.puntoActivo]} />)}
        </View>
      )}

      {/* ── Autor, comunidad y texto ─────────────────────────────────────── */}
      <View style={[s.pie, dir.alInicio(0), dir.alFinal(scale(72)), { paddingBottom: margenInferior + scale(26) }]}>
        {esRepost && (
          <TouchableOpacity onPress={() => abrirPerfil(quienCompartio, post.userId)} style={s.repost} accessibilityRole="button">
            <Ionicons name="repeat" size={scale(14)} color="rgba(255,255,255,0.85)" />
            <Text style={s.repostTexto}>{t('wall.repostedBy', { nombre: quienCompartio?.displayName || t('common.user') })}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={s.autor} onPress={() => abrirPerfil(autor, visible.userId)} accessibilityRole="button" accessibilityLabel={nombreDelAutor}>
          {autor ? (
            <AvatarDisplay
              size={scale(40)}
              avatarType={autor.avatarType || 'predefined'}
              avatarId={autor.avatarId || 'male'}
              photoURL={typeof autor.photoURL === 'string' ? autor.photoURL : undefined}
              photoURLThumbnail={typeof autor.photoURLThumbnail === 'string' ? autor.photoURLThumbnail : undefined}
              backgroundColor={DORADO}
              showBorder
              borderColor="#FFFFFF"
            />
          ) : (
            <View style={s.avatarVacio} />
          )}
          <View style={s.autorTextos}>
            <Text style={s.autorNombre} numberOfLines={1}>{nombreDelAutor}</Text>
            <Text style={s.autorMeta} numberOfLines={1}>{[fecha, seccion?.nombre ?? null].filter(Boolean).join(' · ')}</Text>
          </View>
        </TouchableOpacity>

        {!!etiquetaDeComunidad && (
          <TouchableOpacity style={s.comunidad} onPress={() => navigation.navigate('Community', { communityId: community!.id })} accessibilityRole="button">
            <Ionicons name="people-outline" size={scale(13)} color="#111111" />
            <Text style={s.comunidadTexto} numberOfLines={1}>{etiquetaDeComunidad}</Text>
          </TouchableOpacity>
        )}

        {!soloTexto && !!visible.content && (
          <Pressable onPress={() => setExpandida((v) => !v)} accessibilityRole="button" accessibilityLabel={expandida ? t('wall.seeLess') : t('wall.seeMore')}>
            <Text style={s.texto} numberOfLines={expandida ? undefined : 3}>{visible.content}</Text>
          </Pressable>
        )}

        {expandida && (
          <View style={s.comoLoHice}>
            <HowIMadeIt post={visible} />
          </View>
        )}

        {expandida && (
          <TouchableOpacity onPress={() => navigation.navigate('PostDetail', { postId: visible.id, post: visible })} style={s.abrir} accessibilityRole="button">
            <Text style={s.abrirTexto}>{t('wall.openPost')}</Text>
            <Ionicons name="arrow-forward" size={scale(14)} color="#FFFFFF" style={dir.espejo} />
          </TouchableOpacity>
        )}

        {!soloTexto && !!visible.poll && expandida && (
          <View style={s.encuesta}>
            <Poll postId={visible.id!} poll={visible.poll} onRequireAuth={pedirSesion} />
          </View>
        )}
      </View>

      {/* ── La columna de acciones ───────────────────────────────────────── */}
      <View style={[s.rail, dir.alFinal(scale(8)), { bottom: margenInferior + scale(30) }]}>
        <BotonDelRail icono="thumbs-up" etiqueta={t('wall.agreePost')} cuenta={formatNumber(stats.agreementCount, locale)} onPress={conSesion(() => { void voteAgree(); })} />
        <BotonDelRail icono="thumbs-down" etiqueta={t('wall.disagreePost')} cuenta={formatNumber(stats.disagreementCount, locale)} onPress={conSesion(() => { void voteDisagree(); })} />
        <BotonDelRail icono="chatbubble-ellipses" etiqueta={t('wall.comment')} cuenta={formatNumber(visible.comments || 0, locale)} onPress={conSesion(() => abrirComentarios(visible))} />
        <BotonDelRail icono={guardada ? 'bookmark' : 'bookmark-outline'} etiqueta={guardada ? t('wall.unsave') : t('wall.save')} activo={guardada} onPress={conSesion(() => { void alternarGuardado(visible.id!); })} />
        <BotonDelRail icono="paper-plane" etiqueta={t('wall.sharePost')} onPress={() => { void compartir(); }} />
        {!!visible.videoUrl && !medioRoto && (
          <BotonDelRail icono={silencio ? 'volume-mute' : 'volume-high'} etiqueta={silencio ? t('wall.unmute') : t('wall.mute')} onPress={() => setSilencio((v) => !v)} />
        )}
        <BotonDelRail icono="ellipsis-horizontal" etiqueta={t('wall.moreOptions')} onPress={() => setDenunciando(true)} />
      </View>

      {denunciando && (
        <ReportSheet visible={denunciando} onClose={() => setDenunciando(false)} objetivo={{ type: 'POST', id: visible.id! }} surface="wall_immersive" />
      )}
    </View>
  );
};

const sombraDeTexto = { textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 };

const s = StyleSheet.create({
  pagina: { backgroundColor: '#000000', overflow: 'hidden' },
  centro: { position: 'absolute', top: '50%', left: 0, right: 0 },
  oscurecer: { backgroundColor: 'rgba(0,0,0,0.35)' },
  veloAbajo: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  textoGrandeCaja: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: scale(28), paddingTop: scale(90), gap: SPACING.lg },
  textoGrande: { color: '#FFFFFF', fontSize: scale(24), lineHeight: scale(33), fontWeight: FONT_WEIGHT.bold },
  encuesta: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: BORDER_RADIUS.lg, padding: SPACING.md },
  pie: { position: 'absolute', bottom: 0, paddingHorizontal: SPACING.lg, gap: scale(10) },
  repost: { flexDirection: 'row', alignItems: 'center', gap: scale(6) },
  repostTexto: { color: 'rgba(255,255,255,0.85)', fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, ...sombraDeTexto },
  autor: { flexDirection: 'row', alignItems: 'center', gap: scale(10), alignSelf: 'flex-start', maxWidth: '100%' },
  avatarVacio: { width: scale(40), height: scale(40), borderRadius: scale(20), backgroundColor: 'rgba(255,255,255,0.25)' },
  autorTextos: { flexShrink: 1, minWidth: 0 },
  autorNombre: { color: '#FFFFFF', fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, ...sombraDeTexto },
  autorMeta: { color: 'rgba(255,255,255,0.8)', fontSize: FONT_SIZE.xs, ...sombraDeTexto },
  comunidad: { flexDirection: 'row', alignItems: 'center', gap: scale(4), alignSelf: 'flex-start', backgroundColor: DORADO, borderRadius: BORDER_RADIUS.full, paddingHorizontal: scale(10), paddingVertical: scale(4), maxWidth: '100%' },
  comunidadTexto: { color: '#111111', fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold, flexShrink: 1 },
  texto: { color: '#FFFFFF', fontSize: FONT_SIZE.sm, lineHeight: scale(20), ...sombraDeTexto },
  comoLoHice: { backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', maxHeight: scale(260) },
  abrir: { flexDirection: 'row', alignItems: 'center', gap: scale(4), alignSelf: 'flex-start', minHeight: 36 },
  abrirTexto: { color: '#FFFFFF', fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, textDecorationLine: 'underline' },
  rail: { position: 'absolute', alignItems: 'center', gap: scale(14) },
  railBoton: { alignItems: 'center', minWidth: 48, minHeight: 44 },
  railIcono: { width: scale(44), height: scale(44), borderRadius: scale(22), alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' },
  railCuenta: { color: '#FFFFFF', fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, marginTop: scale(2), ...sombraDeTexto },
  puntos: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: scale(5) },
  punto: { width: scale(6), height: scale(6), borderRadius: scale(3), backgroundColor: 'rgba(255,255,255,0.45)' },
  puntoActivo: { backgroundColor: '#FFFFFF', width: scale(16) },
});

export default React.memo(PublicacionInmersiva);
