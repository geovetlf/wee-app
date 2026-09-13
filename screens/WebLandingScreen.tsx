/**
 * WebLandingScreen — Home de Weë en web (escritorio y móvil web).
 *
 * Estructura: Header → saludo y buscar → publicar → Weëls → Ẅall · Ẅells con
 * las pastillas de sección. Solo lo esencial: nada de catálogos, categorías ni
 * herramientas en el Home.
 *
 * Donde estaba el bloque de Comunidades va ahora la puerta de publicar, la misma
 * que usan los muros de sección. A Comunidades se llega por Buscar, en la barra
 * inferior, así que no se pierde ningún acceso.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { postsService, Post } from '../services/firestoreService';
import PostCard from '../components/PostCard';
import Header from '../components/Header';
import DrawerMenu from '../components/DrawerMenu';
import WeelsRow from '../components/WeelsRow';
import HomeGreeting from '../components/HomeGreeting';
import ComposerEntry, { ComposerKind } from '../components/creator/ComposerEntry';
import { HOME_SECTION_FILTERS, HomeSectionId, filterBySection } from '../utils/feedFilters';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';
import { useScrollDeBarra } from '../hooks/useScrollDeBarra';

const WebLandingScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const { onScroll: reportarScroll } = useScrollDeBarra();
  const route = useRoute<any>();

  const [posts, setPosts] = useState<Post[]>([]);
  const [weels, setWeels] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [feedFilter, setFeedFilter] = useState<HomeSectionId>('all');
  /*
   * La portada web no paginaba: enseñaba la primera tanda y ahí se acababa. Con
   * el filtro de destinos eso puede dejar fuera publicaciones perfectamente
   * válidas que solo estaban un poco más abajo en la colección, así que ahora
   * lleva cursor y un "Cargar más" (fase 2E-75).
   */
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hayMas, setHayMas] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

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

  // Weëls (videos cortos) para la fila del Home
  useEffect(() => {
    postsService
      .getVideoPostsPaginated(10)
      .then((result) => setWeels(result?.documents || []))
      .catch((error) => console.error('Error loading Weëls:', error));
  }, []);

  const filteredPosts = useMemo(() => filterBySection(posts, feedFilter), [posts, feedFilter]);

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

  const handleCompose = (kind: ComposerKind) => {
    if (!user) return navigation.navigate('Register');
    irAlCompositor({ kind });
  };

  // ── Weëls ──
  const handleCreateWeel = () => {
    if (!user) return navigation.navigate('Login');
    irAlCompositor({ kind: 'weel' });
  };
  const handleOpenWeels = () => {
    if (weels.length === 0) return handleCreateWeel();
    navigation.navigate('Reels', { initialPost: weels[0], initialVideoPosts: weels });
  };
  useEffect(() => {
    if (!route.params?.openWeels) return;
    navigation.setParams({ openWeels: undefined });
    handleOpenWeels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.openWeels]);

  // ── Feed ──
  const handlePostPress = (post: Post) => navigation.navigate('PostDetail', { post });
  const handleComment = (postId: string) => navigation.navigate('PostDetail', { postId });
  const handlePrivateMessage = (userId: string, userData?: any) => {
    if (!user) return navigation.navigate('Register');
    navigation.navigate('Inbox', { screen: 'Conversation', params: { otherUserId: userId, otherUserData: userData } });
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: theme.colors.background, overflow: 'hidden' }}>
      {/* Header fijo: ☰ · Weë · Real/WEE · campana. Los Credits viven en el ☰. */}
      <div style={{ flexShrink: 0, zIndex: 100 }}>
        <Header onNotificationsPress={() => navigation.navigate('Notifications')} onMenuPress={() => setDrawerVisible(true)} conMarca />
      </div>

      {/* Al bajar, la barra de navegación se aparta; al subir, vuelve. */}
      <div onScroll={reportarScroll} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' }}>
        {/* Quién eres y dónde buscar. Poco alto: el muro empieza enseguida. */}
        <HomeGreeting onSearch={() => navigation.navigate('Search')} />

        {/*
          La puerta de publicar, la misma de los muros de sección. No publica aquí:
          abre el compositor global, donde están Cámara, Foto o vídeo, ËContact,
          Ubicación y Encuesta. Sin sección de origen, así que el compositor
          preselecciona el muro general.
        */}
        <div style={{ padding: '4px 16px' }}>
          <ComposerEntry placeholder="¿Qué quieres compartir?" onCompose={handleCompose} variante="home" directo />
        </div>

        {/* Weëls */}
        <WeelsRow compacta posts={weels} onOpenWeels={handleOpenWeels} onCreateWeel={handleCreateWeel} />

        {/* Creado por la comunidad */}
        <div style={{ padding: '8px 16px 100px' }}>
          {/*
            Las dos experiencias del Home: el muro y los videos cortos.
            Ẅall es lo que se está viendo; Ẅells abre el visor de Weëls que ya
            existía —el mismo `handleOpenWeels` de la fila de arriba—, así que
            aquí no hay un segundo feed, solo otra puerta al de siempre.
          */}
          <View style={[styles.experiencias, { borderBottomColor: theme.colors.border }]}>
            {/*
              `aria-selected` y `aria-pressed` van escritos a mano a propósito.
              React Native Web no traduce `accessibilityState` a ningún atributo
              del navegador —se comprobó en el DOM: el botón sale sin estado—,
              así que con un lector de pantalla no había forma de saber qué
              pestaña ni qué filtro estaban puestos. En el móvil manda
              `accessibilityState`, que ahí sí funciona; aquí, el atributo.
            */}
            <View style={styles.experiencia} accessibilityRole="tab" accessibilityState={{ selected: true }} aria-selected>
              <View style={[styles.experienciaIndicador, { borderBottomColor: theme.colors.accent }]}>
                <Text style={[styles.experienciaTexto, { color: theme.colors.text, fontWeight: FONT_WEIGHT.semibold }]}>Ẅall</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.experiencia}
              onPress={handleOpenWeels}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: false }}
              aria-selected={false}
              accessibilityLabel="Ẅells, los videos cortos"
            >
              <View style={styles.experienciaIndicador}>
                <Text style={[styles.experienciaTexto, { color: theme.colors.textSecondary, fontWeight: FONT_WEIGHT.medium }]}>Ẅells</Text>
              </View>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} style={styles.filtersScroll}>
            {HOME_SECTION_FILTERS.map((f) => {
              const active = feedFilter === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  onPress={() => setFeedFilter(f.id)}
                  style={[styles.chip, {
                    backgroundColor: active ? theme.colors.accent : theme.colors.surface,
                    borderColor: active ? theme.colors.accent : theme.colors.border,
                  }]}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 2, right: 2 }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  aria-pressed={active}
                  accessibilityLabel={`Filtrar: ${f.label}`}
                >
                  {/*
                    El texto de la pastilla apagada toma el color del tema, no un
                    gris fijo. Con el Perfil Weë el fondo de la pastilla es casi
                    negro, y el gris oscuro de antes desaparecía encima: cuatro de
                    las cinco secciones quedaban ilegibles en modo oscuro.
                  */}
                  <Text style={[styles.chipText, {
                    color: active ? '#1F2937' : theme.colors.text,
                    fontWeight: active ? FONT_WEIGHT.semibold : FONT_WEIGHT.medium,
                  }]}>{f.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/*
            Mientras el paginador diga que queda muro detrás no se enseña el
            cartel de vacío: con destinos, una tanda puede no dejar nada y aun así
            haber publicaciones un poco más abajo. Decir "todavía no hay
            publicaciones" ahí sería mentir.
          */}
          {filteredPosts.length === 0 && posts.length === 0 && hayMas ? null : filteredPosts.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Text style={styles.emptyEmoji}>✨</Text>
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>{posts.length === 0 ? 'Todavía no hay publicaciones' : 'Nada por aquí con este filtro'}</Text>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                {posts.length === 0 ? 'Sé la primera persona en compartir algo creado con IA.' : 'Prueba con otro filtro o comparte algo tú.'}
              </Text>
              <TouchableOpacity onPress={() => (user ? irAlCompositor() : navigation.navigate('Register'))} style={[styles.emptyButton, { backgroundColor: theme.colors.accent }]} activeOpacity={0.85} accessibilityLabel="Crear una publicación">
                <Text style={styles.emptyButtonText}>Crear</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredPosts.map((post) => (
              <div key={post.id} style={{ marginBottom: 16 }}>
                {/* El Wall es un muro: sin tarjeta alrededor de cada publicación. */}
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
              accessibilityLabel="Cargar más publicaciones"
            >
              {loadingMore ? (
                <ActivityIndicator size="small" color={theme.colors.accent} />
              ) : (
                <Text style={[styles.cargarMasTexto, { color: theme.colors.text }]}>Cargar más</Text>
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
  loadingContainer: {
    flex: 1,
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
  /*
   * Ẅall y Ẅells. La misma idea que en el móvil: dos palabras y una raya del
   * ancho de la palabra debajo de la que está puesta. Ni tarjetas ni botones:
   * presentan el contenido, no compiten con él.
   */
  experiencias: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  experiencia: {
    flex: 1,
    alignItems: 'center',
    paddingTop: SPACING.sm,
  },
  experienciaIndicador: {
    paddingHorizontal: SPACING.xs,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  experienciaTexto: {
    fontSize: FONT_SIZE.base,
  },
  filtersScroll: {
    marginBottom: SPACING.md,
  },
  filters: {
    gap: SPACING.sm,
    paddingRight: SPACING.lg,
  },
  chip: {
    height: scale(34),
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: FONT_SIZE.xs,
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
