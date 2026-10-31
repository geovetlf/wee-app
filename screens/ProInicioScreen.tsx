import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useIdioma } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useComentariosDeLaPublicacion } from '../contexts/ComentariosContext';
import { getPopularHashtags, PopularHashtag, Post, postsService } from '../services/firestoreService';
import PostCard from '../components/PostCard';
import AvatarDisplay from '../components/avatars/AvatarDisplay';
import { HOME_SECTION_FILTERS, SeccionesElegidas, alternarSeccion, estaActiva, filterBySections } from '../utils/feedFilters';
import { HERRAMIENTAS_PROFESIONALES } from '../constants/espacioProfesional';
import { WEE_EXPERIENCES } from '../constants/weeExperiences';

const VISIBLES_POR_TANDA = 20;
const TENDENCIAS = 5;
/* Por debajo de este ancho de ventana, la columna derecha no cabe sin apretar el muro. */
const ANCHO_CON_COLUMNA = 1240;

const PUBLICAR: readonly { kind: string; clave: string; icono: string }[] = [
  { kind: 'image', clave: 'composer.kindImage', icono: 'image-outline' },
  { kind: 'video', clave: 'composer.kindVideo', icono: 'videocam-outline' },
  { kind: 'text', clave: 'composer.kindText', icono: 'document-text-outline' },
  { kind: 'question', clave: 'composer.kindQuestion', icono: 'help-circle-outline' },
];

/**
 * EL INICIO DE WEË VERSIÓN CREATOR: EL MURO, PARA QUIEN TRABAJA.
 *
 * Publicar arriba, el muro real en el centro y, a la derecha, las secciones de
 * Weë AI y lo que de verdad se está publicando. Sin Weëls. Nada de lo que se ve
 * es de muestra: lo que no tiene datos no se enseña.
 */
const ProInicioScreen: React.FC = () => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const { user } = useAuth();
  const { realProfile } = useUserProfile();
  const { abrirComentarios } = useComentariosDeLaPublicacion();
  const { width } = useWindowDimensions();
  const navigation = useNavigation<any>();
  const [posts, setPosts] = useState<Post[]>([]);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [hayMas, setHayMas] = useState(false);
  const [ultimo, setUltimo] = useState<any>(null);
  const [secciones, setSecciones] = useState<SeccionesElegidas>([]);
  const [tendencias, setTendencias] = useState<PopularHashtag[]>([]);

  const conColumna = width >= ANCHO_CON_COLUMNA;

  useEffect(() => {
    let cancelado = false;
    postsService
      .getMuroGeneralPaginado(VISIBLES_POR_TANDA)
      .then((pagina: any) => {
        if (cancelado) return;
        setPosts(pagina.visibles);
        setUltimo(pagina.lastDoc || null);
        setHayMas(pagina.hayMas);
      })
      .catch((error: unknown) => {
        console.error('Error loading posts:', error);
        if (!cancelado) setFallo(true);
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    getPopularHashtags(TENDENCIAS)
      .then((lista) => {
        if (!cancelado) setTendencias(lista);
      })
      .catch((error) => console.warn('No se pudieron leer las tendencias:', error));
    return () => {
      cancelado = true;
    };
  }, []);

  const cargarMas = useCallback(async () => {
    if (cargandoMas || !hayMas || !ultimo) return;
    setCargandoMas(true);
    try {
      const pagina: any = await postsService.getMuroGeneralPaginado(VISIBLES_POR_TANDA, ultimo);
      setPosts((previas) => [...previas, ...pagina.visibles]);
      setUltimo(pagina.lastDoc || null);
      setHayMas(pagina.hayMas);
    } catch (error) {
      console.error('Error loading more posts:', error);
    } finally {
      setCargandoMas(false);
    }
  }, [cargandoMas, hayMas, ultimo]);

  /* Los Weëls son de la versión app. */
  const visibles = useMemo(() => filterBySections(posts.filter((p) => !p.isWeel), secciones), [posts, secciones]);

  const publicar = (kind?: string) => {
    if (!user) return navigation.navigate('Register');
    return navigation.navigate('Create', kind ? { kind } : undefined);
  };

  const mensajePrivado = (userId: string, userData?: any) => {
    if (!user) return navigation.navigate('Register');
    return navigation.navigate('Main', { screen: 'Inbox', params: { screen: 'Conversation', params: { otherUserId: userId, otherUserData: userData } } });
  };

  const comentar = (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (post) abrirComentarios(post);
  };

  const tarjeta = { backgroundColor: theme.colors.card, borderColor: theme.colors.border };

  return (
    <ScrollView style={{ backgroundColor: theme.colors.surface }} contentContainerStyle={styles.pagina}>
      <View style={[styles.mesa, conColumna && styles.mesaConColumna]}>
        <View style={styles.centro}>
          <View style={[styles.tarjeta, styles.publicar, tarjeta]}>
            <View style={styles.publicarFila}>
              <AvatarDisplay
                size={40}
                avatarType={realProfile?.avatarType || 'predefined'}
                avatarId={realProfile?.avatarId || 'male'}
                photoURL={realProfile?.photoURL}
                photoURLThumbnail={realProfile?.photoURLThumbnail}
                backgroundColor={theme.colors.accent}
                showBorder={false}
              />
              <Pressable
                onPress={() => publicar()}
                accessibilityRole="button"
                accessibilityLabel={t('home.composerPlaceholder')}
                style={(e: any) => [styles.publicarCampo, { backgroundColor: e.hovered ? theme.colors.border : theme.colors.surface }] as any}
              >
                <Text style={[styles.publicarTexto, { color: theme.colors.textSecondary }]} numberOfLines={1}>{t('home.composerPlaceholder')}</Text>
              </Pressable>
            </View>
            <View style={styles.publicarAcciones}>
              {PUBLICAR.map((p) => (
                <Pressable
                  key={p.kind}
                  onPress={() => publicar(p.kind)}
                  accessibilityRole="button"
                  style={(e: any) => [styles.accion, e.hovered && { backgroundColor: theme.colors.surface }] as any}
                >
                  <Ionicons name={p.icono as any} size={17} color={theme.colors.textSecondary} />
                  <Text style={[styles.accionTexto, { color: theme.colors.text }]}>{t(p.clave)}</Text>
                </Pressable>
              ))}
              <View style={styles.empuje} />
              <Pressable
                onPress={() => navigation.navigate('Specialist', { id: 'brain' })}
                accessibilityRole="button"
                style={[styles.crearConIa, { backgroundColor: theme.colors.accent }]}
              >
                <Ionicons name="sparkles-outline" size={15} color="#1F2937" />
                <Text style={styles.crearConIaTexto}>{t('profesional.createWithAi')}</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtros} style={styles.filtrosCaja}>
            {HOME_SECTION_FILTERS.map((f) => {
              const activo = estaActiva(secciones, f.id);
              const etiqueta = f.clave ? t(f.clave) : f.label;
              return (
                <Pressable
                  key={f.id}
                  onPress={() => setSecciones((elegidas) => alternarSeccion(elegidas, f.id))}
                  accessibilityRole="button"
                  accessibilityState={{ selected: activo }}
                  aria-pressed={activo}
                  accessibilityLabel={t('home.filterBy', { nombre: etiqueta })}
                  style={[styles.filtro, { backgroundColor: activo ? theme.colors.text : theme.colors.card, borderColor: activo ? theme.colors.text : theme.colors.border }]}
                >
                  <Text style={[styles.filtroTexto, { color: activo ? theme.colors.background : theme.colors.text }]}>{etiqueta}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {cargando ? (
            <View style={styles.espera} accessibilityRole="progressbar" accessibilityLabel={t('common.loading')}>
              <ActivityIndicator color={theme.colors.accent} />
            </View>
          ) : visibles.length === 0 ? (
            <View style={[styles.tarjeta, styles.vacio, tarjeta]}>
              <Text style={[styles.vacioTitulo, { color: theme.colors.text }]}>
                {t(fallo || posts.length === 0 ? 'home.wallEmptyTitle' : 'home.wallFilteredTitle')}
              </Text>
              <Text style={[styles.vacioTexto, { color: theme.colors.textSecondary }]}>
                {t(fallo || posts.length === 0 ? 'home.wallEmptyHint' : 'home.wallFilteredHint')}
              </Text>
            </View>
          ) : (
            visibles.map((post) => (
              <View key={post.id} style={[styles.tarjeta, styles.publicacion, tarjeta]}>
                <PostCard
                  post={post}
                  onPress={() => navigation.navigate('PostDetail', { postId: post.id, post })}
                  onComment={comentar}
                  onPrivateMessage={mensajePrivado}
                  isVisible
                  variante="muro"
                />
              </View>
            ))
          )}

          {hayMas && posts.length > 0 && (
            <Pressable onPress={cargarMas} accessibilityRole="button" style={[styles.mas, { borderColor: theme.colors.border, backgroundColor: theme.colors.card, opacity: cargandoMas ? 0.6 : 1 }]}>
              <Text style={[styles.masTexto, { color: theme.colors.text }]}>{t('common.loadMore')}</Text>
            </Pressable>
          )}
        </View>

        {conColumna && (
          <View style={styles.columna}>
            <View style={[styles.tarjeta, styles.panel, tarjeta]}>
              <Text style={[styles.panelTitulo, { color: theme.colors.text }]}>Weë AI</Text>
              {HERRAMIENTAS_PROFESIONALES.map((h) => {
                const exp = WEE_EXPERIENCES.find((e) => e.id === h.id);
                return (
                  <Pressable
                    key={h.id}
                    onPress={() => navigation.navigate('Specialist', { id: h.id })}
                    accessibilityRole="button"
                    accessibilityLabel={h.nombre}
                    style={(e: any) => [styles.seccion, e.hovered && { backgroundColor: theme.colors.surface }] as any}
                  >
                    <View style={[styles.seccionIcono, { backgroundColor: theme.colors.glow }]}>
                      <Ionicons name={h.icono as any} size={18} color={theme.colors.accentDark} />
                    </View>
                    <View style={styles.seccionTextos}>
                      <Text style={[styles.seccionNombre, { color: theme.colors.text }]} numberOfLines={1}>{h.nombre}</Text>
                      {!!exp && <Text style={[styles.seccionTexto, { color: theme.colors.textSecondary }]}>{t(exp.claveDescripcion)}</Text>}
                    </View>
                    <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
                  </Pressable>
                );
              })}
            </View>

            {tendencias.length > 0 && (
              <View style={[styles.tarjeta, styles.panel, tarjeta]}>
                <Text style={[styles.panelTitulo, { color: theme.colors.text }]}>{t('search.trending')}</Text>
                {tendencias.map((h, i) => (
                  <Pressable
                    key={h.tag}
                    onPress={() => navigation.navigate('Search', { query: h.tag })}
                    accessibilityRole="button"
                    style={(e: any) => [styles.seccion, e.hovered && { backgroundColor: theme.colors.surface }] as any}
                  >
                    <Text style={[styles.puesto, { color: theme.colors.textSecondary }]}>{formato.numero(i + 1)}</Text>
                    <View style={styles.seccionTextos}>
                      <Text style={[styles.seccionNombre, { color: theme.colors.text }]} numberOfLines={1}>#{h.tag}</Text>
                      <Text style={[styles.seccionTexto, { color: theme.colors.textSecondary }]}>
                        {t('common.postsCount', { contador: h.count, cantidad: formato.numero(h.count) })}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  pagina: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 16, paddingVertical: 20 },
  mesa: { width: '100%', maxWidth: 680 },
  mesaConColumna: { maxWidth: 1040, flexDirection: 'row', alignItems: 'flex-start', gap: 20 },
  centro: { flex: 1, minWidth: 0, width: '100%', gap: 14 },
  columna: { width: 320, gap: 14, flexShrink: 0 },
  tarjeta: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, overflow: 'hidden' },
  publicar: { padding: 14, gap: 12 },
  publicarFila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  publicarCampo: { flex: 1, minWidth: 0, height: 42, borderRadius: 21, justifyContent: 'center', paddingHorizontal: 16 },
  publicarTexto: { fontSize: 14 },
  publicarAcciones: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 },
  accion: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 10, borderRadius: 8 },
  accionTexto: { fontSize: 13, fontWeight: '500' },
  empuje: { flexGrow: 1 },
  crearConIa: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 14, borderRadius: 999 },
  crearConIaTexto: { color: '#1F2937', fontSize: 13, fontWeight: '600' },
  filtrosCaja: { flexGrow: 0 },
  filtros: { gap: 6 },
  filtro: { height: 32, paddingHorizontal: 13, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  filtroTexto: { fontSize: 13, fontWeight: '500' },
  espera: { paddingVertical: 48, alignItems: 'center' },
  vacio: { padding: 24, gap: 6 },
  vacioTitulo: { fontSize: 15, fontWeight: '600' },
  vacioTexto: { fontSize: 14, lineHeight: 20 },
  publicacion: { paddingVertical: 4 },
  mas: { alignItems: 'center', justifyContent: 'center', height: 42, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  masTexto: { fontSize: 14, fontWeight: '500' },
  panel: { paddingVertical: 12, paddingHorizontal: 8, gap: 2 },
  panelTitulo: { fontSize: 14, fontWeight: '700', paddingHorizontal: 8, paddingBottom: 6 },
  seccion: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 10 },
  seccionIcono: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  seccionTextos: { flex: 1, minWidth: 0, gap: 1 },
  seccionNombre: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  seccionTexto: { fontSize: 12, lineHeight: 16 },
  puesto: { width: 20, textAlign: 'center', fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
});

export default ProInicioScreen;
