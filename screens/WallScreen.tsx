import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform, useWindowDimensions, ViewToken } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useIdioma } from '../contexts/IdiomaContext';
import { Post, postsService } from '../services/firestoreService';
import { recogerSemilla } from '../utils/semillaDelMuro';
import PublicacionInmersiva from '../components/wall/PublicacionInmersiva';
import { ALTO_BARRA } from '../components/BarraInferior';
import { useResponsive } from '../hooks/useResponsive';
import { useAjusteVerticalWeb } from '../hooks/useAjusteVerticalWeb';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';
import { useDireccion } from '../hooks/useDireccion';
import { MARCA } from '../constants/marca';
import { RellenoDeMarca } from '../components/GradienteDeMarca';

/**
 * EL WÄLL INMERSIVO — EL MURO DE WEË, UNA PUBLICACIÓN A LA VEZ.
 *
 * Se entra tocando una publicación del muro del Home: el Wäll se abre en esa misma publicación, con lo que el Home ya
 * tenía cargado (utils/semillaDelMuro.ts), y desde ahí se sube y se baja con el dedo, la rueda o las flechas del
 * teclado. Los datos son los del muro general de siempre (`postsService.getMuroGeneralPaginado`, el único sitio que
 * sabe pedirlo); aquí no hay otra consulta ni otro orden.
 *
 * En el teléfono ocupa la pantalla entera. En tableta y escritorio, el Wäll es una columna centrada con la proporción
 * de un teléfono sobre fondo negro: una publicación pensada en vertical no se estira a 1440 de ancho.
 */
const ANCHO_MAXIMO = 520;
const PAGINA = 10;

const WallScreen: React.FC = () => {
  const { t } = useIdioma();
  const dir = useDireccion();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { isDesktop } = useResponsive();
  const { width, height } = useWindowDimensions();
  const ancho = Math.min(width, ANCHO_MAXIMO);
  const alto = height;

  const semilla = useRef(recogerSemilla()).current;
  const [posts, setPosts] = useState<Post[]>(semilla?.posts ?? []);
  const [cursor, setCursor] = useState<unknown>(semilla?.cursor ?? null);
  const [hayMas, setHayMas] = useState(semilla ? semilla.hayMas : true);
  const [cargando, setCargando] = useState(!semilla);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState(false);
  const [activa, setActiva] = useState(semilla?.indice ?? 0);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(false);
    try {
      const pagina = await postsService.getMuroGeneralPaginado(PAGINA);
      setPosts(pagina.visibles);
      setCursor(pagina.lastDoc ?? null);
      setHayMas(pagina.hayMas);
      setActiva(0);
    } catch {
      setError(true);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (!semilla) void cargar();
  }, [semilla, cargar]);

  const cargarMas = useCallback(async () => {
    if (cargandoMas || !hayMas) return;
    setCargandoMas(true);
    try {
      /* Sin cursor (una semilla que no lo traía) se pide desde el principio: los repetidos se descartan abajo. */
      const pagina = await postsService.getMuroGeneralPaginado(PAGINA, (cursor ?? undefined) as any);
      if (pagina.visibles.length) {
        setPosts((antes) => {
          const vistos = new Set(antes.map((p) => p.id));
          return [...antes, ...pagina.visibles.filter((p) => !vistos.has(p.id))];
        });
      }
      setCursor(pagina.lastDoc ?? null);
      setHayMas(pagina.hayMas);
    } catch {
      /* Un fallo al pedir más no tira lo que ya se ve: el final de la lista ofrece reintentar. */
      setHayMas(true);
    } finally {
      setCargandoMas(false);
    }
  }, [cargandoMas, hayMas, cursor]);

  /* Una publicación a la vez también en la web: ajuste al soltar la rueda y flechas del teclado. */
  const { lista, alDesplazar } = useAjusteVerticalWeb<Post>(alto, posts.length, semilla?.indice ?? 0);

  const alCambiarVisibles = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const primera = viewableItems.find((v) => v.isViewable);
    if (primera?.index != null) setActiva(primera.index);
  }).current;

  const volver = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main'));
  /* La barra global de abajo se pinta encima en teléfono y tableta: el texto y las acciones quedan por encima de ella. */
  const margenInferior = (isDesktop ? 0 : ALTO_BARRA) + insets.bottom + SPACING.sm;

  const barra = (
    <View style={[s.barra, { paddingTop: insets.top + SPACING.sm }]} pointerEvents="box-none">
      <TouchableOpacity onPress={volver} style={s.barraBoton} accessibilityRole="button" accessibilityLabel={t('common.back')} hitSlop={10}>
        <Ionicons name="arrow-back" size={scale(24)} color="#FFFFFF" style={dir.espejo} />
      </TouchableOpacity>
      <Text style={s.titulo} accessibilityRole="header">Wäll</Text>
      <View style={s.barraBoton} />
    </View>
  );

  let contenido: React.ReactNode;
  if (cargando) {
    contenido = (
      <View style={s.estado}>
        <ActivityIndicator color={MARCA.primario} size="large" />
        <Text style={s.estadoTexto}>{t('wall.loadingPosts')}</Text>
      </View>
    );
  } else if (error) {
    contenido = (
      <View style={s.estado}>
        <Ionicons name="cloud-offline-outline" size={scale(40)} color="rgba(255,255,255,0.7)" />
        <Text style={s.estadoTexto}>{t('wall.immersiveError')}</Text>
        <TouchableOpacity style={s.reintentar} onPress={() => void cargar()} accessibilityRole="button">
          <RellenoDeMarca radio={BORDER_RADIUS.full} />
          <Text style={s.reintentarTexto}>{t('wall.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  } else if (posts.length === 0) {
    contenido = (
      <View style={s.estado}>
        <Ionicons name="images-outline" size={scale(40)} color="rgba(255,255,255,0.7)" />
        <Text style={s.estadoTexto}>{t('wall.immersiveEmpty')}</Text>
      </View>
    );
  } else {
    contenido = (
      <FlatList
        ref={lista}
        data={posts}
        keyExtractor={(p) => p.id!}
        renderItem={({ item, index }) => (
          <PublicacionInmersiva post={item} activa={index === activa} alto={alto} ancho={ancho} margenInferior={margenInferior} />
        )}
        pagingEnabled
        snapToInterval={alto}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        getItemLayout={(_, index) => ({ length: alto, offset: alto * index, index })}
        initialScrollIndex={Math.min(semilla?.indice ?? 0, Math.max(0, posts.length - 1))}
        onViewableItemsChanged={alCambiarVisibles}
        onScroll={alDesplazar}
        scrollEventThrottle={32}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        onEndReached={() => void cargarMas()}
        onEndReachedThreshold={2}
        windowSize={3}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        removeClippedSubviews={Platform.OS === 'android'}
        style={{ width: ancho }}
        ListFooterComponent={
          <View style={[s.final, { height: alto * 0.35 }]}>
            {cargandoMas ? (
              <ActivityIndicator color={MARCA.primario} />
            ) : hayMas ? (
              <TouchableOpacity style={s.reintentar} onPress={() => void cargarMas()} accessibilityRole="button">
                <RellenoDeMarca radio={BORDER_RADIUS.full} />
                <Text style={s.reintentarTexto}>{t('wall.loadingMorePosts')}</Text>
              </TouchableOpacity>
            ) : (
              <Text style={s.estadoTexto}>{t('wall.immersiveEnd')}</Text>
            )}
          </View>
        }
      />
    );
  }

  return (
    <View style={s.pantalla}>
      <View style={[s.columna, { width: ancho }]}>
        {contenido}
        {barra}
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: '#000000', alignItems: 'center' },
  columna: { flex: 1, backgroundColor: '#000000' },
  barra: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md },
  barraBoton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.25)' },
  titulo: { color: '#FFFFFF', fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  estado: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md, paddingHorizontal: SPACING.xl },
  estadoTexto: { color: 'rgba(255,255,255,0.85)', fontSize: FONT_SIZE.base, textAlign: 'center' },
  reintentar: { backgroundColor: MARCA.primario, borderRadius: BORDER_RADIUS.full, paddingHorizontal: SPACING.xl, minHeight: 44, justifyContent: 'center' },
  reintentarTexto: { color: '#111111', fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold },
  final: { alignItems: 'center', justifyContent: 'center' },
});

export default WallScreen;
