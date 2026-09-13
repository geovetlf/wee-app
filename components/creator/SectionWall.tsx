import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useBookmarks } from '../../hooks/useBookmarks';
import PostCard from '../PostCard';
import ComposerEntry, { ComposerKind } from './ComposerEntry';
import { Post, postsService } from '../../services/firestoreService';
import { filterPosts } from '../../utils/feedFilters';
import { postsDeLaSeccion, paginaDelMuroGeneral, paginaDeLaSeccion, sobreconsulta } from '../../utils/sectionFeed';
import { SectionWallConfig, WallTabKind } from '../../constants/specialists';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

/**
 * Muro social de una sección de Weë Creator.
 *
 * Weë tiene comunidad y tiene herramientas de IA, pero hasta ahora vivían en
 * pantallas distintas: el muro solo existía en el Home y ninguna sección mostraba
 * a una sola persona. Este componente pone la comunidad dentro de la sección.
 *
 * No añade ninguna función social nueva: reutiliza las publicaciones que ya
 * existen (`postsService`), la tarjeta que ya existe (`PostCard`), los filtros que
 * ya existen (`utils/feedFilters`), los guardados que ya existen (`useBookmarks`)
 * y la pantalla de crear que ya existe. Publicar sigue siendo un viaje a `Create`.
 *
 * Es genérico a propósito: la sección solo aporta sus palabras, sus pestañas y su
 * texto. Weë Chef es el primero (fase 2E-37) y el resto puede adoptarlo igual.
 */

/**
 * Cuántas publicaciones VISIBLES se juntan por tanda.
 *
 * Antes esto era `FETCH = 40`: cuarenta documentos, filtrar, y lo que saliera.
 * Con destinos eso deja secciones vacías teniendo publicaciones, porque de una
 * racha de cuarenta puede que ninguna sea de Weë Chef. Ahora el número es de
 * publicaciones que se quieren ENSEÑAR, y el paginador pide de más y vuelve a
 * pedir hasta juntarlas o agotar la colección (fase 2E-75).
 */
const VISIBLES = 15;

/**
 * Ancho de la columna del muro en escritorio, sin escalar.
 *
 * El muro es lo que manda en una sección, así que la columna se dimensiona por él
 * y no al revés: cabe una fotografía grande sin que el texto de una publicación
 * larga se estire hasta hacerse incómodo de leer. El marco (`CreatorShell`) añade
 * su propio margen a cada lado, y eso es lo que se descuenta para saber cuánto
 * mide de verdad una tarjeta.
 */
export const WALL_CONTENT_WIDTH = 1000;
/** El `padding: SPACING.xl` del contenido de CreatorShell, sin escalar. */
const SHELL_PADDING = 20;
const CARD_WIDTH = WALL_CONTENT_WIDTH - SHELL_PADDING * 2;

interface SectionWallProps {
  /** Qué sección es: de aquí salen las palabras que definen su muro. */
  sectionId: string;
  config: SectionWallConfig;
  /**
   * Compositor de una sola fila (fase 2E-70). Desplegado ocupa 150 px entre el
   * selector y la primera publicación; plegado, 64. Lo pide Weë Travel, donde el
   * muro es el producto y esos 86 px son media foto. Sin la prop, el compositor
   * se queda exactamente como estaba: las demás secciones no se enteran.
   */
  compact?: boolean;
  /**
   * EL MURO GENERAL DE WEË, sin filtrar y sin pestañas (fase 2E-73).
   *
   * Weë tiene un solo muro. Una sección no es una red social aparte: es un
   * contexto que una publicación puede llevar encima —el WeeTag— sin dejar de
   * pertenecer al muro de todos. Filtrar por sección y ofrecer pestañas propias
   * ("Muro Travel", "Fotos del viaje"…) construía justo lo contrario: un feed
   * paralelo por experiencia.
   *
   * Con esta prop la sección enseña lo que publica todo el mundo, venga del
   * contexto que venga. Sin ella, el muro filtrado y sus pestañas siguen
   * exactamente igual para las demás secciones.
   */
  general?: boolean;
}

const SectionWall: React.FC<SectionWallProps> = ({ sectionId, config, compact, general }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { isSaved } = useBookmarks();
  const navigation = useNavigation<any>();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<WallTabKind>(config.tabs?.[0]?.id ?? 'all');
  /*
   * Cursor y "queda más". El muro de una sección NO puede quedarse en la primera
   * tanda: de cuarenta documentos seguidos puede que solo tres sean de Weë Chef,
   * y la sección se vería vacía teniendo publicaciones un poco más abajo. Con el
   * cursor se sigue leyendo hasta juntar suficientes o agotar la colección.
   */
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hayMas, setHayMas] = useState(true);
  const [cargando, setCargando] = useState(false);

  /*
   * De dónde salen las publicaciones de este muro.
   *
   * Las dos leen la MISMA colección `posts` con `getPublicPostsPaginated`: no hay
   * `chefPosts` ni consulta por `sectionId`, y una sección nunca es una colección
   * aparte. Lo único que cambia es qué publicaciones pasan.
   *
   * Y son dos preguntas distintas de verdad, no una más estricta que la otra: una
   * publicación con destino solo `chef` va al muro de Chef y NO al muro general,
   * así que el muro de una sección tiene que leer la colección entera y no el
   * muro general ya filtrado (fase 2E-75).
   */
  const pedirTanda = useCallback(
    (desde?: any) => {
      const pagina = (hasta: unknown) => postsService.getPublicPostsPaginated(sobreconsulta(VISIBLES), hasta as any);
      return general
        ? paginaDelMuroGeneral(pagina, VISIBLES, desde)
        : paginaDeLaSeccion(pagina, sectionId, VISIBLES, desde);
    },
    [general, sectionId]
  );

  // Se recarga al volver a la pantalla: quien acaba de publicar ve su publicación.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      pedirTanda()
        .then((pagina) => {
          if (cancelled) return;
          setPosts(pagina.visibles);
          setLastDoc(pagina.lastDoc || null);
          setHayMas(pagina.hayMas);
        })
        .catch((error) => console.warn('No se pudo cargar el muro:', error))
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [pedirTanda])
  );

  /*
   * Una tanda más. El cursor se guarda haya visibles o no: si solo se guardara
   * cuando algo pasa el filtro, volver a pedir repetiría la misma página. Y quien
   * dice si queda muro es `hayMas`, que mira los documentos leídos.
   */
  const cargarMas = useCallback(async () => {
    if (cargando || !hayMas || !lastDoc) return;
    setCargando(true);
    try {
      const pagina = await pedirTanda(lastDoc);
      if (pagina.visibles.length > 0) setPosts((previas) => [...previas, ...pagina.visibles]);
      setLastDoc(pagina.lastDoc || null);
      setHayMas(pagina.hayMas);
    } catch (error) {
      console.warn('No se pudo cargar más muro:', error);
    } finally {
      setCargando(false);
    }
  }, [cargando, hayMas, lastDoc, pedirTanda]);

  /*
   * Si la tanda no dejó ninguna publicación de esta sección pero queda colección
   * detrás, se sigue pidiendo solo. Sin esto la sección enseñaría "todavía no hay
   * nada" con publicaciones suyas un poco más abajo, y el botón de cargar más ni
   * siquiera está a la vista porque vive dentro de la lista.
   */
  useEffect(() => {
    if (!loading && !cargando && hayMas && lastDoc && posts.length === 0) cargarMas();
  }, [loading, cargando, hayMas, lastDoc, posts.length, cargarMas]);

  /*
   * Lo que pertenece a esta sección, antes de aplicar ninguna pestaña.
   *
   * `postsDeLaSeccion` respeta lo que cada publicación diga de sí misma: si eligió
   * destinos, mandan sus destinos y las palabras no pintan nada; si no los eligió
   * —las de antes de esta fase—, las palabras clave de siempre (fase 2E-75).
   *
   * Se vuelve a filtrar aquí a propósito, aunque la tanda ya venga filtrada: este
   * componente es el dueño de lo que enseña, y la regla no puede depender de por
   * qué puerta llegaron las publicaciones. Es idempotente y cuesta un recorrido.
   */
  const mine = useMemo(() => postsDeLaSeccion(posts, sectionId), [posts, sectionId]);

  const visible = useMemo(() => {
    // El muro general no filtra ni por sección ni por pestaña: es el de todos.
    if (general) return posts;
    switch (tab) {
      case 'images':
        return filterPosts(mine, 'images');
      case 'tutorials':
        return filterPosts(mine, 'tutorials');
      case 'mine':
        return user ? mine.filter((post) => post.userId === user.uid) : [];
      case 'saved':
        return mine.filter((post) => isSaved(post.id));
      default:
        return mine;
    }
  }, [general, posts, mine, tab, user, isSaved]);

  const compose = (kind: ComposerKind) => {
    if (!user) {
      navigation.navigate('Login');
      return;
    }
    /*
     * Quien publica desde el muro de una sección está publicando desde esa
     * sección, y ahora la publicación lo dice en vez de dejar que se adivine
     * después por las palabras que use (fase 2E-63C.1).
     */
    navigation.navigate('Create', { kind, sourceSection: sectionId });
  };

  const openPost = (post: Post) => navigation.navigate('PostDetail', { post });
  const openComments = (postId: string) => navigation.navigate('PostDetail', { postId });
  const openMessage = (userId: string, userData?: any) => {
    if (!user) {
      navigation.navigate('Login');
      return;
    }
    navigation.navigate('Inbox', { screen: 'Conversation', params: { otherUserId: userId, otherUserData: userData } });
  };


  return (
    <View style={styles.container}>
      {/* La puerta de publicar, la misma de todo Weë. Abre el compositor global. */}
      <ComposerEntry placeholder={config.placeholder} onCompose={compose} compact={compact} seccion={sectionId} />

      {/*
        Pestañas del muro. El muro general no las tiene: "Muro Travel", "Fotos
        del viaje", "Consejos" y "Mis viajes" convertían una sección en una red
        social paralela, que es justo lo que Weë no es (fase 2E-73).
      */}
      {!general && (
      <View style={[styles.tabBar, { borderBottomColor: theme.colors.border }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {(config.tabs ?? []).map((item) => {
          const active = tab === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => setTab(item.id)}
              activeOpacity={0.7}
              style={[styles.tab, active && { borderBottomColor: theme.colors.accent }]}
              accessibilityLabel={item.label}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: active ? theme.colors.text : theme.colors.textSecondary, fontWeight: active ? FONT_WEIGHT.bold : FONT_WEIGHT.medium },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      </View>
      )}

      {/*
        Mientras el paginador diga que queda colección detrás, la sección sigue
        cargando en vez de dar por vacía: con destinos, una tanda puede no dejar
        ni una publicación de esta sección y haberlas más abajo.
      */}
      {loading || (visible.length === 0 && hayMas && cargando) ? (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={theme.colors.accent} />
        </View>
      ) : visible.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={styles.emptyEmoji}>{config.empty.emoji}</Text>
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
            {mine.length === 0 ? config.empty.title : 'Nada por aquí todavía'}
          </Text>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            {mine.length === 0 ? config.empty.text : 'Prueba con otra pestaña o comparte algo tú.'}
          </Text>
          <TouchableOpacity
            onPress={() => compose('post')}
            activeOpacity={0.85}
            style={[styles.emptyButton, { backgroundColor: theme.colors.accent }]}
            accessibilityLabel={config.empty.button}
          >
            <Text style={styles.emptyButtonText}>{config.empty.button}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          {/*
            Sin `slice`: antes se pintaban 20 de las 40 pedidas y las demás se
            tiraban. Ahora lo que llega es lo que se enseña, y para ver más se
            pide más.
          */}
          {visible.map((post) => (
            <View key={post.id} style={styles.postSlot}>
              {/* El muro de una sección es un muro: mismo trato que el Wall del Home. */}
              <PostCard post={post} onPress={() => openPost(post)} onComment={openComments} onPrivateMessage={openMessage} isVisible maxWidth={CARD_WIDTH} variante="muro" />
            </View>
          ))}

          {/* Seguir leyendo. Desaparece cuando la colección se acaba de verdad. */}
          {hayMas && (
            <TouchableOpacity
              onPress={cargarMas}
              disabled={cargando}
              activeOpacity={0.8}
              style={[styles.cargarMas, { borderColor: theme.colors.border, backgroundColor: theme.colors.card, opacity: cargando ? 0.6 : 1 }]}
              accessibilityRole="button"
              accessibilityLabel="Cargar más publicaciones"
            >
              {cargando ? (
                <ActivityIndicator size="small" color={theme.colors.accent} />
              ) : (
                <Text style={[styles.cargarMasTexto, { color: theme.colors.text }]}>Cargar más</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: SPACING.md,
  },
  tabBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabs: {
    flexDirection: 'row',
    gap: SPACING.xl,
    paddingRight: SPACING.lg,
  },
  tab: {
    paddingBottom: SPACING.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: FONT_SIZE.sm,
  },
  /* Seguir leyendo el muro. 44 sin escalar: se toca sin apuntar. */
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
    fontWeight: FONT_WEIGHT.semibold,
  },
  loading: {
    paddingVertical: SPACING.xxxl,
    alignItems: 'center',
  },
  postSlot: {
    marginBottom: SPACING.lg,
  },
  empty: {
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.xxl,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
  },
  emptyEmoji: {
    fontSize: scale(34),
  },
  emptyTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(20),
    textAlign: 'center',
    maxWidth: scale(420),
  },
  emptyButton: {
    minHeight: scale(44),
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.full,
    marginTop: SPACING.xs,
  },
  emptyButtonText: {
    color: '#1F2937',
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
});

export default SectionWall;
