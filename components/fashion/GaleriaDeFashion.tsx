import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { FASHION_MODOS, FashionModo, FashionModoId } from '../../constants/fashionModes';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';

/*
 * Ropa, zapatos, pelo, cambio de look, uñas y maquillaje: lo que se ve antes de empezar. Cada foto abre el modo que le toca.
 * Las fotos las sirve el modo demo (EXPO_PUBLIC_DEMO_MEDIOS, docs/WEE-DEMO.md). Sin esa base o sin la foto queda su icono, en
 * blanco y negro, con una línea de luz que lo recorre.
 */
const LOOKS: readonly { id: string; clave: string; modo: FashionModoId; icono: string }[] = [
  { id: 'clothes', clave: 'fashion.galClothes', modo: 'tryOn', icono: 'shirt-outline' },
  { id: 'shoes', clave: 'fashion.galShoes', modo: 'tryOn', icono: 'footsteps-outline' },
  { id: 'hair', clave: 'fashion.galHair', modo: 'beautyHair', icono: 'cut-outline' },
  { id: 'look', clave: 'fashion.galLook', modo: 'completeLook', icono: 'body-outline' },
  { id: 'nails', clave: 'fashion.galNails', modo: 'beautyHair', icono: 'hand-left-outline' },
  { id: 'makeup', clave: 'fashion.galMakeup', modo: 'beautyHair', icono: 'brush-outline' },
];

const GaleriaDeFashion: React.FC<{ onAbrir: (modo: FashionModo) => void }> = ({ onAbrir }) => {
  const { theme } = useTheme();
  const t = useT();
  const base = process.env.EXPO_PUBLIC_DEMO_MEDIOS;
  const barrido = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const vuelta = Animated.loop(Animated.timing(barrido, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }));
    vuelta.start();
    return () => vuelta.stop();
  }, [barrido]);
  return (
    <View style={styles.pila}>
      <Text accessibilityRole="header" style={[styles.titulo, { color: theme.colors.text }]}>{t('fashion.galleryTitle')}</Text>
      <View style={styles.rejilla}>
        {LOOKS.map((look) => {
          const modo = FASHION_MODOS.find((m) => m.id === look.modo);
          if (!modo) return null;
          return (
            <TouchableOpacity
              key={look.id}
              style={[styles.tarjeta, { borderColor: theme.colors.border }]}
              onPress={() => onAbrir(modo)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t(look.clave)}
            >
              <View style={styles.centro}><Ionicons name={look.icono as any} size={52} color="#FFFFFF" /></View>
              {!!base && <Image source={{ uri: `${base}/l-fashion-${look.id}.webp` }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />}
              <Animated.View pointerEvents="none" style={[styles.barrido, { transform: [{ translateY: barrido.interpolate({ inputRange: [0, 1], outputRange: [-40, 240] }) }] }]}>
                <LinearGradient colors={['transparent', 'rgba(255,255,255,0.32)', 'transparent']} style={StyleSheet.absoluteFill} />
              </Animated.View>
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.78)']} style={styles.velo} />
              <View style={styles.pie}>
                <Text style={styles.nombre} numberOfLines={1}>{t(look.clave)}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  pila: { gap: SPACING.md },
  titulo: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, justifyContent: 'space-between' },
  tarjeta: { width: '48.5%', aspectRatio: 4 / 5, borderRadius: BORDER_RADIUS.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', justifyContent: 'flex-end', backgroundColor: '#0A0A0A' },
  centro: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  barrido: { position: 'absolute', left: 0, right: 0, top: 0, height: 40 },
  velo: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '40%' },
  pie: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.md },
  nombre: { color: '#FFFFFF', fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },
});

export default GaleriaDeFashion;
