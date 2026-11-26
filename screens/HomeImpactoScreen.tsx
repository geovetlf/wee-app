/*
 * HOME CON MÁS IMPACTO — PRUEBA APARTE (encargo del dueño, 2026-11-24: «rediseña el Home aparte, sin tocar el
 * actual, solo para ver cómo queda»).
 *
 * Esta pantalla NO es el Home. El Home sigue siendo `LandingScreen` / `WebLandingScreen`, intacto. Esta se abre solo
 * por su dirección (`/home/nuevo` en la web; `hidetok://home/nuevo` en el teléfono) para mirar la propuesta de
 * `wee-trabajo/_home-impacto-2026-11-24/PROPUESTA.md`:
 *   1 · «Ahora en Weë» — caras en lugar de los atajos (con menos de 4 autores, vuelven los atajos);
 *   4 · bienvenida para quien llega sin cuenta, y el Ẅall vacío sin hablar de IA;
 *   2 · el Telón — la WeëPage publicada más reciente con portada, en cartel (sin ninguna, no se pinta);
 *   3 · ritmo — una fila de Weëls tras la publicación 8 y tras la 22.
 * Mismos datos que el Home (mismo muro, mismos Weëls); ninguna consulta nueva salvo las WeëPages publicadas.
 * Si el dueño la aprueba, lo que valga pasa al Home de verdad y esta pantalla se borra.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Platform, StatusBar, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DocumentSnapshot } from 'firebase/firestore';
import { useTheme } from '../contexts/ThemeContext';
import { useIdioma } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useComentariosDeLaPublicacion } from '../contexts/ComentariosContext';
import { useScrollDeBarra } from '../hooks/useScrollDeBarra';
import { postsService, Post } from '../services/firestoreService';
import PostCard from '../components/PostCard';
import PromotedSlot from '../components/boost/PromotedSlot';
import Header from '../components/Header';
import DrawerMenu from '../components/DrawerMenu';
import WeelsRow from '../components/WeelsRow';
import PestanasDeInicio, { AtajoDeInicio } from '../components/inicio/PestanasDeInicio';
import FranjaAhoraEnWee, { autoresDeLaFranja, MINIMO_DE_CARAS } from '../components/inicio/FranjaAhoraEnWee';
import TelonDeObra from '../components/inicio/TelonDeObra';
import BienvenidaDeInvitado from '../components/inicio/BienvenidaDeInvitado';
import { sembrarMuro } from '../utils/semillaDelMuro';

const isWeb = Platform.OS === 'web';
/** Tras qué publicaciones va una fila de Weëls (posición 8 y 22, contando desde 1). */
const FILAS_DE_WEELS = new Set([8, 22]);

type Elemento = { tipo: 'post'; post: Post } | { tipo: 'weels'; clave: string };

const HomeImpactoScreen: React.FC = () => {
  const { t } = useIdioma();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { userProfile, realProfile, alterEgos, activeProfileType } = useUserProfile();
  const { abrirComentarios } = useComentariosDeLaPublicacion();
  const { onScroll: reportarScroll } = useScrollDeBarra();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [posts, setPosts] = useState<Post[]>([]);
  const [weels, setWeels] = useState<Post[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [cursor, setCursor] = useState<DocumentSnapshot | null>(null);
  const [hayMas, setHayMas] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [menu, setMenu] = useState(false);
  const [altoCabecera, setAltoCabecera] = useState(0);
  const [visibles, setVisibles] = useState<Set<string>>(new Set());

  const raiz = () => navigation.getParent()?.getParent() ?? navigation;

  const cargar = useCallback(async () => {
    try {
      const pagina = await postsService.getMuroGeneralPaginado(20);
      setPosts(pagina.visibles);
      setCursor((pagina.lastDoc as any) || null);
      setHayMas(pagina.hayMas);
    } catch (e) {
      console.error('HomeImpacto: muro', e);
    } finally {
      setCargando(false);
    }
  }, []);

  const cargarWeels = useCallback(async () => {
    try {
      const r = await postsService.getVideoPostsPaginated(15);
      setWeels(r.documents);
    } catch (e) {
      console.error('HomeImpacto: Weëls', e);
    }
  }, []);

  useEffect(() => { void cargar(); void cargarWeels(); }, [cargar, cargarWeels]);

  const cargarMas = useCallback(async () => {
    if (cargandoMas || !hayMas || !cursor) return;
    setCargandoMas(true);
    try {
      const pagina = await postsService.getMuroGeneralPaginado(20, cursor);
      if (pagina.visibles.length) setPosts((prev) => [...prev, ...pagina.visibles]);
      setCursor((pagina.lastDoc as any) || null);
      setHayMas(pagina.hayMas);
    } finally {
      setCargandoMas(false);
    }
  }, [cargandoMas, hayMas, cursor]);

  const refrescar = useCallback(async () => {
    setRefrescando(true);
    await Promise.all([cargar(), cargarWeels()]);
    setRefrescando(false);
  }, [cargar, cargarWeels]);

  /* Todas las caras de la cuenta que mira: ninguna sale en «Ahora en Weë». */
  const propias = useMemo(() => {
    const s = new Set<string>();
    if (user?.uid) s.add(user.uid);
    if (realProfile?.uid) s.add(realProfile.uid);
    alterEgos.forEach((a) => a?.uid && s.add(a.uid));
    return s;
  }, [user?.uid, realProfile?.uid, alterEgos]);

  const conFranja = autoresDeLaFranja(posts, propias).length >= MINIMO_DE_CARAS;

  /* Lo que se pinta: las publicaciones, con una fila de Weëls tras la 8 y la 22 (si hay Weëls). */
  const elementos = useMemo<Elemento[]>(() => {
    const salida: Elemento[] = [];
    posts.forEach((post, i) => {
      salida.push({ tipo: 'post', post });
      if (weels.length > 0 && FILAS_DE_WEELS.has(i + 1)) salida.push({ tipo: 'weels', clave: `weels-${i + 1}` });
    });
    return salida;
  }, [posts, weels.length]);

  const postsRef = useRef(posts);
  postsRef.current = posts;

  const abrirPost = useCallback((post: Post) => {
    const indice = Math.max(0, postsRef.current.findIndex((p) => p.id === post.id));
    sembrarMuro({ posts: postsRef.current, indice, cursor, hayMas });
    raiz().navigate('Wall');
  }, [cursor, hayMas]);

  const abrirWeels = useCallback((desde?: Post) => {
    raiz().navigate('Reels', weels.length ? { initialPost: desde || weels[0], initialVideoPosts: weels } : undefined);
  }, [weels]);

  const comentar = useCallback((postId: string) => {
    const p = postsRef.current.find((x) => x.id === postId);
    if (p) abrirComentarios(p);
  }, [abrirComentarios]);

  const mensaje = useCallback((userId: string, userData?: any) => {
    if (!user) return raiz().navigate('Register');
    navigation.navigate('Inbox', { screen: 'Conversation', params: { otherUserId: userId, otherUserData: userData } });
  }, [user]);

  const irABuscar = () => (navigation.getParent() ?? navigation).navigate('Search');

  const atajo = (a: AtajoDeInicio) => {
    if (a === 'weels') return abrirWeels();
    if (a === 'explore') return irABuscar();
    if (a === 'communities') return navigation.navigate('ExploreCommunities');
  };

  const yo = user && userProfile ? {
    foto: typeof userProfile.photoURL === 'string' ? userProfile.photoURL : undefined,
    avatarType: userProfile.avatarType,
    avatarId: userProfile.avatarId,
    cuadrado: activeProfileType === 'hidi',
  } : null;

  const cabeceraDeLista = (
    <>
      {!user ? <BienvenidaDeInvitado onCrearCuenta={() => raiz().navigate('Register')} onExplorar={irABuscar} /> : null}
      <TelonDeObra onAbrir={(pageId) => raiz().navigate('WeePage', { pageId })} />
      <PromotedSlot pintar={(p, abrir) => <PostCard post={p} onPress={abrir} onComment={comentar} onPrivateMessage={mensaje} isVisible variante="muro" />} />
    </>
  );

  const vacio = cargando ? (
    <View style={s.rueda}><ActivityIndicator size="large" color={theme.colors.accent} /></View>
  ) : (
    <View style={s.vacio}>
      <Text style={[s.vacioTitulo, { color: theme.colors.text }]}>{t('home.wallEmptyTitleWork')}</Text>
      <Text style={[s.vacioTexto, { color: theme.colors.textSecondary }]}>{t('home.wallEmptyHintFaces')}</Text>
    </View>
  );

  const pintar = ({ item }: { item: Elemento }) => item.tipo === 'weels' ? (
    <View style={s.filaWeels}>
      <WeelsRow posts={weels} compacta onOpenWeels={() => abrirWeels()} onCreateWeel={() => raiz().navigate('Create', { kind: 'weel' })} />
    </View>
  ) : (
    <PostCard
      post={item.post}
      onComment={comentar}
      onPrivateMessage={mensaje}
      onPress={abrirPost}
      onVideoPress={abrirWeels}
      isVisible={visibles.has(item.post.id || '')}
      variante="muro"
    />
  );

  const alCambiarVisibles = useRef(({ viewableItems }: any) => {
    setVisibles(new Set(viewableItems.map((v: any) => v.item?.post?.id).filter(Boolean)));
  }).current;

  return (
    /* En la web la tarjeta de la pila no le da alto a esta pantalla (la portada sí lo tiene): sin un alto, el muro no se desplaza. */
    <View style={[s.pantalla, { backgroundColor: theme.colors.background }, isWeb && ({ height: '100vh', maxHeight: '100vh' } as any)]}>
      <View style={s.cabecera} onLayout={(e) => setAltoCabecera(e.nativeEvent.layout.height)}>
        <Header
          onMenuPress={() => setMenu(true)}
          portada
          onSearchPress={irABuscar}
          onNotificationsPress={() => navigation.navigate('Notifications')}
          onProfilePress={() => navigation.navigate('Profile')}
        />
        {conFranja ? (
          <FranjaAhoraEnWee posts={posts} propias={propias} yo={yo} onPost={abrirPost} onCrear={() => raiz().navigate('Create', { kind: 'post' })} />
        ) : (
          <PestanasDeInicio puesto="wall" onSelect={atajo} />
        )}
      </View>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

      <View style={{ flex: 1, overflow: 'hidden' }}>
        {isWeb ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'scroll', overflowX: 'hidden', paddingTop: altoCabecera, paddingBottom: 100 }}>
            {cabeceraDeLista}
            {elementos.length === 0 ? vacio : elementos.map((item) => (
              <View key={item.tipo === 'post' ? item.post.id : item.clave}>{pintar({ item })}</View>
            ))}
            {cargandoMas ? <View style={s.mas}><ActivityIndicator color={theme.colors.accent} /></View> : null}
          </div>
        ) : (
          <FlatList
            data={elementos}
            renderItem={pintar}
            keyExtractor={(item) => (item.tipo === 'post' ? item.post.id || '' : item.clave)}
            ListHeaderComponent={cabeceraDeLista}
            ListEmptyComponent={vacio}
            ListFooterComponent={cargandoMas ? <View style={s.mas}><ActivityIndicator color={theme.colors.accent} /></View> : null}
            contentContainerStyle={{ paddingTop: altoCabecera, paddingBottom: insets.bottom + 80 }}
            refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={theme.colors.accent} progressViewOffset={altoCabecera} />}
            onEndReached={cargarMas}
            onEndReachedThreshold={0.5}
            onScroll={reportarScroll}
            scrollEventThrottle={16}
            viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
            onViewableItemsChanged={alCambiarVisibles}
            initialNumToRender={6}
            windowSize={7}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <DrawerMenu visible={menu} onClose={() => setMenu(false)} />
    </View>
  );
};

const s = StyleSheet.create({
  pantalla: { flex: 1 },
  cabecera: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20 },
  rueda: { minHeight: 220, justifyContent: 'center', alignItems: 'center' },
  vacio: { paddingVertical: 48, paddingHorizontal: 32, alignItems: 'center', gap: 6 },
  vacioTitulo: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  vacioTexto: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  filaWeels: { paddingVertical: 8 },
  mas: { paddingVertical: 24, alignItems: 'center' },
});

export default HomeImpactoScreen;
