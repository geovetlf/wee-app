/*
 * HOME «UNIVERSOS» — SEGUNDA PRUEBA APARTE (encargo del dueño, 2026-11-24: «pásame el otro modelo que sugiere el
 * diseñador»; eligió «Universos», el Boceto 2 de `wee-trabajo/_home-propuestas-2026-11-23/PROPUESTAS.md`).
 *
 * Esta pantalla NO es el Home: el Home sigue intacto. Se abre solo por su dirección (`/home/universos`).
 * Descubrimiento primero:
 *   · pastillas de comunidades (las tuyas si te uniste a alguna; si no, las más grandes);
 *   · «Universos para descubrir»: las WeëPages publicadas con portada, en tarjetas (título en EB Garamond);
 *   · un mosaico de dos columnas con lo que se publica (solo lo que trae imagen o vídeo; los Weëls llevan ▶).
 * Mismos datos que el Home (muro, Weëls, páginas publicadas, comunidades); nada de servidor nuevo.
 * Si el dueño la aprueba, lo que valga pasa al Home (o a Explorar) y esta pantalla se borra.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Platform, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { DocumentSnapshot } from 'firebase/firestore';
import { useTheme } from '../contexts/ThemeContext';
import { useIdioma } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useScrollDeBarra } from '../hooks/useScrollDeBarra';
import { useFuenteDeObra } from '../hooks/useFuenteDeObra';
import { useUserById } from '../hooks/useUserById';
import { postsService, Post } from '../services/firestoreService';
import { pagesService, WeePage } from '../services/pagesService';
import { communityService, Community } from '../services/communityService';
import { tipoDePagina } from '../constants/pageTypes';
import { nombreDeComunidad } from '../utils/comunidadesDeWee';
import { formatNumber } from '../utils/formatoCorto';
import { sembrarMuro } from '../utils/semillaDelMuro';
import Header from '../components/Header';
import DrawerMenu from '../components/DrawerMenu';
import AvatarDisplay from '../components/avatars/AvatarDisplay';
import BienvenidaDeInvitado from '../components/inicio/BienvenidaDeInvitado';

const isWeb = Platform.OS === 'web';
const portadaDe = (p: Post): string | undefined => p.imageUrlsThumbnails?.[0] || p.imageUrls?.[0] || p.imageUrl;

/** Una pieza del mosaico: la imagen manda el alto (su proporción), y debajo, el autor. */
const Pieza: React.FC<{ post: Post; onPress: (p: Post) => void }> = ({ post, onPress }) => {
  const { theme } = useTheme();
  const { userProfile: autor } = useUserById(post.userId);
  const esVideo = !!post.videoUrl;
  const uri = portadaDe(post);
  const proporcion = esVideo ? 9 / 14 : Math.min(1.25, Math.max(0.62, post.imageAspectRatios?.[0] || 0.8));
  const cuadrado = autor?.profileType === 'hidi';
  return (
    <Pressable onPress={() => onPress(post)} accessibilityRole="button" style={(e: any) => [s.pieza, e.pressed && { opacity: 0.85 }, isWeb && ({ cursor: 'pointer' } as object)] as any}>
      <View style={[s.piezaMedio, { aspectRatio: proporcion, backgroundColor: theme.colors.surface }]}>
        {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" /> : null}
        {esVideo ? (
          <View style={s.play}><Ionicons name="play" size={14} color="#FFFFFF" /></View>
        ) : null}
      </View>
      <View style={s.piezaPie}>
        <AvatarDisplay size={20} cuadrado={cuadrado} avatarType={autor?.avatarType || 'predefined'} avatarId={autor?.avatarId || 'male'} photoURL={typeof autor?.photoURLThumbnail === 'string' ? autor.photoURLThumbnail : (typeof autor?.photoURL === 'string' ? autor.photoURL : undefined)} backgroundColor={theme.colors.surface} />
        <Text style={[s.piezaAutor, { color: theme.colors.textSecondary }]} numberOfLines={1}>{autor?.displayName || autor?.username || ''}</Text>
      </View>
    </Pressable>
  );
};

const HomeUniversosScreen: React.FC = () => {
  const { t, locale } = useIdioma();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { onScroll: reportarScroll } = useScrollDeBarra();
  const obra = useFuenteDeObra();
  const navigation = useNavigation<any>();

  const [posts, setPosts] = useState<Post[]>([]);
  const [weels, setWeels] = useState<Post[]>([]);
  const [paginas, setPaginas] = useState<WeePage[]>([]);
  const [comunidades, setComunidades] = useState<Community[]>([]);
  const [cursor, setCursor] = useState<DocumentSnapshot | null>(null);
  const [hayMas, setHayMas] = useState(true);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [menu, setMenu] = useState(false);
  const [altoCabecera, setAltoCabecera] = useState(0);

  const raiz = () => navigation.getParent()?.getParent() ?? navigation;

  useEffect(() => {
    postsService.getMuroGeneralPaginado(30).then((p) => { setPosts(p.visibles); setCursor((p.lastDoc as any) || null); setHayMas(p.hayMas); })
      .catch((e) => console.error('Universos: muro', e)).finally(() => setCargando(false));
    postsService.getVideoPostsPaginated(15).then((r) => setWeels(r.documents)).catch(() => undefined);
    pagesService.publicadas(20).then((l) => setPaginas(l.filter((p) => !!p.coverURL).sort((a, b) => (b.publishedAtMs ?? 0) - (a.publishedAtMs ?? 0)))).catch(() => undefined);
  }, []);

  /* Las tuyas si te uniste a alguna; si no, las más grandes. */
  useEffect(() => {
    let vivo = true;
    (async () => {
      const mias = user?.uid ? await communityService.getJoinedCommunities(user.uid).catch(() => []) : [];
      const lista = mias.length ? mias : await communityService.getCommunities().catch(() => []);
      if (vivo) setComunidades(lista.slice(0, 12));
    })();
    return () => { vivo = false; };
  }, [user?.uid]);

  const cargarMas = useCallback(async () => {
    if (cargandoMas || !hayMas || !cursor) return;
    setCargandoMas(true);
    try {
      const p = await postsService.getMuroGeneralPaginado(30, cursor);
      if (p.visibles.length) setPosts((prev) => [...prev, ...p.visibles]);
      setCursor((p.lastDoc as any) || null);
      setHayMas(p.hayMas);
    } finally {
      setCargandoMas(false);
    }
  }, [cargandoMas, hayMas, cursor]);

  /* El mosaico: solo lo que trae imagen o vídeo, repartido en dos columnas por alto acumulado. */
  const columnas = useMemo(() => {
    const conMedio = posts.filter((p) => !!portadaDe(p) || !!p.videoUrl);
    const izq: Post[] = [], der: Post[] = [];
    let altoIzq = 0, altoDer = 0;
    conMedio.forEach((p) => {
      const alto = p.videoUrl ? 14 / 9 : 1 / Math.min(1.25, Math.max(0.62, p.imageAspectRatios?.[0] || 0.8));
      if (altoIzq <= altoDer) { izq.push(p); altoIzq += alto; } else { der.push(p); altoDer += alto; }
    });
    return [izq, der];
  }, [posts]);

  const abrir = useCallback((post: Post) => {
    if (post.videoUrl) {
      return raiz().navigate('Reels', weels.length ? { initialPost: post, initialVideoPosts: weels } : { initialPost: post, initialVideoPosts: [post] });
    }
    const indice = Math.max(0, posts.findIndex((p) => p.id === post.id));
    sembrarMuro({ posts, indice, cursor, hayMas });
    raiz().navigate('Wall');
  }, [posts, weels, cursor, hayMas]);

  const irABuscar = () => (navigation.getParent() ?? navigation).navigate('Search');

  const alDesplazar = (e: any) => {
    reportarScroll?.(e);
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 600) void cargarMas();
  };

  const contenido = (
    <>
      {!user ? <BienvenidaDeInvitado onCrearCuenta={() => raiz().navigate('Register')} onExplorar={irABuscar} /> : null}

      {paginas.length > 0 ? (
        <View style={s.bloque}>
          <Text style={[s.titulo, { color: theme.colors.text }]}>{t('home.universesTitle')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.carrusel}>
            {paginas.map((p) => (
              <Pressable key={p.id} onPress={() => raiz().navigate('WeePage', { pageId: p.id })} accessibilityRole="button" accessibilityLabel={p.name} style={(e: any) => [s.universo, e.pressed && { opacity: 0.9 }, isWeb && ({ cursor: 'pointer' } as object)] as any}>
                <Image source={{ uri: p.coverURL }} style={StyleSheet.absoluteFill} contentFit="cover" />
                <LinearGradient colors={['rgba(5,5,5,0)', 'rgba(5,5,5,0.25)', 'rgba(5,5,5,0.9)']} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
                <View style={s.universoPie}>
                  <Text style={s.universoTipo} numberOfLines={1}>{t(tipoDePagina(p.type).claveTitulo)}</Text>
                  <Text style={[s.universoNombre, obra(19, '500')]} numberOfLines={2}>{p.name}</Text>
                  <Text style={s.universoDato}>{t('pages.followers', { contador: p.followersCount || 0, cantidad: formatNumber(p.followersCount || 0, locale) })}</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={s.bloque}>
        <Text style={[s.titulo, { color: theme.colors.text }]}>{t('home.mosaicTitle')}</Text>
        {cargando ? (
          <View style={s.rueda}><ActivityIndicator size="large" color={theme.colors.accent} /></View>
        ) : columnas[0].length === 0 ? (
          <View style={s.vacio}>
            <Text style={[s.vacioTitulo, { color: theme.colors.text }]}>{t('home.wallEmptyTitleWork')}</Text>
            <Text style={[s.vacioTexto, { color: theme.colors.textSecondary }]}>{t('home.wallEmptyHintFaces')}</Text>
          </View>
        ) : (
          <View style={s.mosaico}>
            {columnas.map((col, i) => (
              <View key={i} style={s.columna}>
                {col.map((p) => <Pieza key={p.id} post={p} onPress={abrir} />)}
              </View>
            ))}
          </View>
        )}
        {cargandoMas ? <View style={s.mas}><ActivityIndicator color={theme.colors.accent} /></View> : null}
      </View>
    </>
  );

  return (
    <View style={[s.pantalla, { backgroundColor: theme.colors.background }, isWeb && ({ height: '100vh', maxHeight: '100vh' } as any)]}>
      <View style={s.cabecera} onLayout={(e) => setAltoCabecera(e.nativeEvent.layout.height)}>
        <Header onMenuPress={() => setMenu(true)} portada onSearchPress={irABuscar} onNotificationsPress={() => navigation.navigate('Notifications')} onProfilePress={() => navigation.navigate('Profile')} />
        {comunidades.length > 0 ? (
          <View style={[s.franja, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pastillas}>
              {comunidades.map((c) => (
                <Pressable key={c.id} onPress={() => raiz().navigate('Community', { communityId: c.id })} accessibilityRole="button" style={(e: any) => [s.pastilla, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }, e.pressed && { opacity: 0.7 }, isWeb && ({ cursor: 'pointer' } as object)] as any}>
                  <Ionicons name={(c.icon as any) || 'people-outline'} size={14} color={theme.colors.textSecondary} />
                  <Text style={[s.pastillaTexto, { color: theme.colors.text }]} numberOfLines={1}>{nombreDeComunidad(c, t, locale)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </View>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: altoCabecera, paddingBottom: 110 }} onScroll={alDesplazar} scrollEventThrottle={32} showsVerticalScrollIndicator={false}>
        {contenido}
      </ScrollView>
      <DrawerMenu visible={menu} onClose={() => setMenu(false)} />
    </View>
  );
};

const s = StyleSheet.create({
  pantalla: { flex: 1 },
  cabecera: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20 },
  franja: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  pastillas: { paddingHorizontal: 16, gap: 8 },
  pastilla: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 14, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, maxWidth: 220 },
  pastillaTexto: { fontSize: 13, fontWeight: '600' },
  bloque: { paddingTop: 18 },
  titulo: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2, paddingHorizontal: 16, marginBottom: 10 },
  carrusel: { paddingHorizontal: 16, gap: 12 },
  universo: { width: 168, height: 236, borderRadius: 16, overflow: 'hidden', backgroundColor: '#0A0A0A', justifyContent: 'flex-end' },
  universoPie: { padding: 12, gap: 3 },
  universoTipo: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase' },
  universoNombre: { color: '#FFFFFF' },
  universoDato: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  mosaico: { flexDirection: 'row', paddingHorizontal: 12, gap: 8 },
  columna: { flex: 1, gap: 12 },
  pieza: { gap: 6 },
  piezaMedio: { width: '100%', borderRadius: 14, overflow: 'hidden' },
  play: { position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  piezaPie: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 2 },
  piezaAutor: { fontSize: 12, flexShrink: 1 },
  rueda: { minHeight: 220, justifyContent: 'center', alignItems: 'center' },
  vacio: { paddingVertical: 48, paddingHorizontal: 32, alignItems: 'center', gap: 6 },
  vacioTitulo: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  vacioTexto: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  mas: { paddingVertical: 24, alignItems: 'center' },
});

export default HomeUniversosScreen;
