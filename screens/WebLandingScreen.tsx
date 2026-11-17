/**
 * WebLandingScreen — Home de Weë en web (escritorio y móvil web).
 *
 * Estructura (rediseño del 2026-11-15): cabecera (☰ · logo · buscar ·
 * notificaciones · avatar) → atajos Ẅall · Weëls · Explorar · Comunidades →
 * tarjeta de WeëAI con la puerta a Weë Brain → pastillas del muro → Ẅall con
 * sus publicaciones. El muro es el centro; lo de arriba ocupa poco.
 *
 * Lo que salió de aquí sigue existiendo y se alcanza por otro sitio: publicar,
 * desde el + de la barra (los mismos seis tipos); los Weëls, desde su atajo y
 * desde el menú; buscar, desde la lupa y desde Explorar. Una publicación que es
 * un Weël sigue saliendo en el muro: el muro no filtra por tipo.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useT } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useComentariosDeLaPublicacion } from '../contexts/ComentariosContext';
import { postsService, Post } from '../services/firestoreService';
import PostCard from '../components/PostCard';
import Header from '../components/Header';
import DrawerMenu from '../components/DrawerMenu';
import PromotedSlot from '../components/boost/PromotedSlot';
import PestanasDeInicio, { AtajoDeInicio } from '../components/inicio/PestanasDeInicio';
import TarjetaWeeAi from '../components/inicio/TarjetaWeeAi';
import { abrirPortadaDeWeeAi } from '../navigation/refNavegacion';
import { HomeFeedId, filterBySections, seccionesDelFeed } from '../utils/feedFilters';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';
import { useScrollDeBarra } from '../hooks/useScrollDeBarra';
import { sembrarMuro } from '../utils/semillaDelMuro';
import { RellenoDeMarca } from '../components/GradienteDeMarca';

const WebLandingScreen: React.FC = () => {
  const t = useT();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { abrirComentarios } = useComentariosDeLaPublicacion();
  const navigation = useNavigation<any>();
  const { onScroll: reportarScroll } = useScrollDeBarra();
  const route = useRoute<any>();

  const [posts, setPosts] = useState<Post[]>([]);
  const [weels, setWeels] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerVisible, setDrawerVisible] = useState(false);
  /*
   * El filtro del Ẅall: «Para ti» (el muro entero, que es como se entra) o
   * «Creatividad» (lo que viene de las secciones creativas). Solo acota el muro:
   * no navega ni abre Weëls. La lógica vive en `feedFilters`, compartida con el
   * móvil.
   */
  const [feedFilter, setFeedFilter] = useState<HomeFeedId>('paraTi');
  /*
   * La portada web no paginaba: enseñaba la primera tanda y ahí se acababa. Con
   * el filtro de secciones eso puede dejar fuera publicaciones perfectamente
   * válidas que solo estaban un poco más abajo en la colección, así que ahora
   * lleva cursor y un "Cargar más" (fase 2E-75).
   */
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hayMas, setHayMas] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  /*
   * EL HOME ES UN SOLO MURO.
   *
   * Arriba, los atajos y la tarjeta de WeëAI; después las pastillas, y debajo
   * el Ẅall con sus publicaciones y sus WeeTags. No hay páginas, ni gesto de
   * lado: los atajos de arriba NAVEGAN a pantallas que ya existían, no cambian
   * de página dentro del Home.
   */
  const VISIBLES_POR_TANDA = 20;

  // Publicaciones
  useEffect(() => {
    const loadPosts = async () => {
      try {
        const pagina = await postsService.getMuroGeneralPaginado(VISIBLES_POR_TANDA);
        setPosts(pagina.visibles);
        setLastDoc(pagina.lastDoc || null);
        setHayMas(pagina.hayMas);
      } catch (error) {
        console.error('Error loading posts:', error);
      } finally {
        setLoading(false);
      }
    };
    loadPosts();
  }, []);

  /*
   * Una tanda más. El cursor se guarda pase lo que pase —aunque no deje ni una
   * publicación visible—, porque si no, volver a pulsar repetiría la misma
   * página para siempre. Y quien decide si el botón sigue ahí es `hayMas`, que
   * mira los documentos leídos y no los que pasaron el filtro.
   */
  const cargarMas = useCallback(async () => {
    if (loadingMore || !hayMas || !lastDoc) return;
    setLoadingMore(true);
    try {
      const pagina = await postsService.getMuroGeneralPaginado(VISIBLES_POR_TANDA, lastDoc);
      if (pagina.visibles.length > 0) setPosts((previas) => [...previas, ...pagina.visibles]);
      setLastDoc(pagina.lastDoc || null);
      setHayMas(pagina.hayMas);
    } catch (error) {
      console.error('Error loading more posts:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hayMas, lastDoc]);

  /*
   * Si la primera tanda no dejó nada pero queda colección detrás, se sigue solo:
   * un muro vacío con un botón de "cargar más" haría trabajar a la persona para
   * ver lo que ya debería estar ahí.
   */
  useEffect(() => {
    if (!loading && !loadingMore && hayMas && lastDoc && posts.length === 0) cargarMas();
  }, [loading, loadingMore, hayMas, lastDoc, posts.length, cargarMas]);

  /* Los Weëls con los que se abre el feed desde el atajo y desde el menú: la primera tanda, con la consulta de siempre. */
  useEffect(() => {
    postsService
      .getVideoPostsPaginated(10)
      .then((result) => setWeels(result?.documents || []))
      .catch((error) => console.error('Error loading Weëls:', error));
  }, []);

  /* El muro, acotado por la pastilla puesta. Con «Para ti», entero. */
  const filteredPosts = useMemo(() => filterBySections(posts, seccionesDelFeed(feedFilter)), [posts, feedFilter]);

  /*
   * ABRIR EL COMPOSITOR, SUBIENDO DOS NIVELES.
   *
   * Hay DOS rutas llamadas `Create`: la del MainStack, que es el compositor de
   * verdad, y la de la barra de pestañas, que no tiene pantalla —solo dibuja el
   * `+`— y devuelve null. Un `navigate('Create')` lanzado desde aquí busca en su
   * propio navegador, sube a la barra de pestañas, encuentra allí un `Create` y
   * se para: la persona acaba en una pantalla vacía.
   *
   * Así que hay que pedirlo al navegador de arriba del todo. Es el mismo patrón
   * que ya usa `LandingScreen` en nativo, que por eso funciona.
   */
  const irAlCompositor = (params?: object) => {
    const tabNavigation = navigation.getParent();
    const mainNavigation = tabNavigation?.getParent();
    if (mainNavigation) (mainNavigation as any).navigate('Create', params);
    else (navigation as any).navigate('Create', params);
  };

  // ── Weëls ──
  /* Ver Weëls abre siempre el feed; sin Weëls cargados, el feed pide los suyos y dice si no hay. Crear un Weël se hace desde el + de la barra. */
  const handleOpenWeels = () => {
    navigation.navigate('Reels', weels.length > 0 ? { initialPost: weels[0], initialVideoPosts: weels } : undefined);
  };
  useEffect(() => {
    if (!route.params?.openWeels) return;
    navigation.setParams({ openWeels: undefined });
    handleOpenWeels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.openWeels]);

  /*
   * LOS ATAJOS DE ARRIBA. «Ẅall» es esta pantalla: tocarlo estando aquí no
   * navega. Los otros tres abren lo de siempre: el feed de Weëls, la búsqueda
   * —que se llama Explorar— y el explorador de comunidades, que vive en la
   * pila del Home.
   */
  const handleAtajo = (atajo: AtajoDeInicio) => {
    if (atajo === 'weels') return handleOpenWeels();
    if (atajo === 'explore') return navigation.navigate('Search');
    if (atajo === 'communities') return navigation.navigate('ExploreCommunities');
  };

  /* Weë Brain no tiene ruta propia: se entra por `Specialist { id: 'brain' }`, como desde el centro creativo. Sin texto ni adjuntos. */

  // ── Feed ──
  /* Tocar una publicación abre el Ẅall inmersivo en ella, con lo que el muro ya tiene cargado (utils/semillaDelMuro.ts). */
  const handlePostPress = (post: Post) => {
    sembrarMuro({ posts: filteredPosts, indice: Math.max(0, filteredPosts.findIndex((p) => p.id === post.id)), cursor: lastDoc, hayMas });
    navigation.navigate('Wall');
  };
  /* Comentar abre la conversación en una hoja, no la pantalla de la publicación. */
  const handleComment = (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (post) abrirComentarios(post);
  };
  const handlePrivateMessage = (userId: string, userData?: any) => {
    if (!user) return navigation.navigate('Register');
    navigation.navigate('Inbox', { screen: 'Conversation', params: { otherUserId: userId, otherUserData: userData } });
  };

  /*
   * LA PORTADA NO ESPERA AL MURO. Antes, mientras llegaba la primera tanda, la
   * pantalla entera era una rueda: ni cabecera, ni atajos, ni tarjeta de WeëAI.
   * Ahora la cáscara se pinta al instante y la rueda gira solo donde va a
   * aparecer el muro, que es lo único que de verdad está viajando.
   */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: theme.colors.background, overflow: 'hidden' }}>
      {/* Cabecera fija: ☰ · logo · buscar · notificaciones · avatar. Los Credits y el selector Real/Weë viven en el ☰. */}
      <div style={{ flexShrink: 0, zIndex: 100 }}>
        <Header
          onMenuPress={() => setDrawerVisible(true)}
          portada
          onSearchPress={() => navigation.navigate('Search')}
          onNotificationsPress={() => navigation.navigate('Notifications')}
          onProfilePress={() => navigation.navigate('Profile')}
        />
        <PestanasDeInicio puesto="wall" onSelect={handleAtajo} />
      </div>

      {/* Al bajar, la barra de navegación se aparta; al subir, vuelve. */}
      <div onScroll={reportarScroll} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' }}>
        {/*
          WeëAI, a la vista y sin comerse el muro: el nombre, el lema, el chip de
          Weë Brain y la puerta «¿Qué quieres crear hoy?». La puerta ABRE Weë
          Brain; no es un campo, no lleva texto ni adjuntos (TarjetaWeeAi).
        */}
        <div style={{ padding: '12px 16px 4px' }}>
          <TarjetaWeeAi variante="portada" onOpenWeeAi={() => { if (!abrirPortadaDeWeeAi()) navigation.navigate('WeeCreator'); }} />
        </div>

        {/* Creado por la comunidad: el Ẅall, el centro del Home. */}
        <div style={{ padding: '4px 16px 100px' }}>
          {/* Boost: UNA publicación promocionada de otra cuenta, si el servidor tiene alguna para ti (docs/BOOST.md). */}
          <PromotedSlot pintar={(p, abrir) => <PostCard post={p} onPress={abrir} onComment={handleComment} onPrivateMessage={handlePrivateMessage} isVisible={true} variante="muro" />} />

          {/*
            Mientras el paginador diga que queda muro detrás no se enseña el
            cartel de vacío: con secciones, una tanda puede no dejar nada y aun
            así haber publicaciones un poco más abajo. Decir "todavía no hay
            publicaciones" ahí sería mentir.
          */}
          {loading ? (
            <View style={styles.loadingContainer} accessibilityRole="progressbar" accessibilityLabel={t('common.loading')}>
              <ActivityIndicator size="large" color={theme.colors.accent} />
            </View>
          ) : filteredPosts.length === 0 && posts.length === 0 && hayMas ? null : filteredPosts.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Text style={styles.emptyEmoji}>✨</Text>
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>{posts.length === 0 ? t('home.wallEmptyTitle') : t('home.wallFilteredTitle')}</Text>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                {posts.length === 0 ? t('home.wallEmptyHint') : t('home.wallFilteredHint')}
              </Text>
              <TouchableOpacity onPress={() => (user ? irAlCompositor() : navigation.navigate('Register'))} style={[styles.emptyButton, { backgroundColor: theme.colors.accent }]} activeOpacity={0.85} accessibilityLabel={t('composer.createPost')}>
                <RellenoDeMarca radio={BORDER_RADIUS.full} />
                <Text style={styles.emptyButtonText}>{t('nav.create')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredPosts.map((post) => (
              <div key={post.id} style={{ marginBottom: 16 }}>
                {/* El Ẅall es un muro: sin tarjeta alrededor de cada publicación, y cada una con su WeeTag. */}
                <PostCard post={post} onPress={() => handlePostPress(post)} onComment={handleComment} onPrivateMessage={handlePrivateMessage} isVisible={true} variante="muro" />
              </div>
            ))
          )}

          {/*
            Cargar más. Aparece solo mientras queda muro por leer y desaparece
            cuando se acaba de verdad: no hay scroll infinito en la web, así que
            sin este botón la portada se quedaba en la primera tanda.
          */}
          {hayMas && posts.length > 0 && (
            <TouchableOpacity
              onPress={cargarMas}
              disabled={loadingMore}
              style={[styles.cargarMas, { borderColor: theme.colors.border, backgroundColor: theme.colors.card, opacity: loadingMore ? 0.6 : 1 }]}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('common.loadMore')}
            >
              {loadingMore ? (
                <ActivityIndicator size="small" color={theme.colors.accent} />
              ) : (
                <Text style={[styles.cargarMasTexto, { color: theme.colors.text }]}>{t('common.loadMore')}</Text>
              )}
            </TouchableOpacity>
          )}
        </div>
      </div>

      <DrawerMenu visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
    </div>
  );
};

const styles = StyleSheet.create({
  /* La rueda del muro mientras llega la primera tanda: ocupa el sitio del muro, no la pantalla. */
  loadingContainer: {
    minHeight: scale(220),
    justifyContent: 'center',
    alignItems: 'center',
  },
  /* El botón de seguir leyendo: ancho entero, discreto, y con sitio para tocar. */
  cargarMas: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.full,
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  cargarMasTexto: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.medium,
  },
  sectionTitle: {
    fontSize: scale(18),
    fontWeight: FONT_WEIGHT.bold,
    marginBottom: SPACING.sm,
  },
  emptyState: {
    alignItems: 'center',
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    gap: scale(6),
  },
  emptyEmoji: {
    fontSize: scale(32),
  },
  emptyTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
  },
  emptyText: {
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
    lineHeight: scale(20),
  },
  emptyButton: {
    marginTop: SPACING.sm,
    height: scale(40),
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyButtonText: {
    color: '#1F2937',
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
  },
});

export default WebLandingScreen;
