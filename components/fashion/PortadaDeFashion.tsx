import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useT } from '../../contexts/IdiomaContext';
import { FASHION_MODOS, FashionModo, FashionModoId } from '../../constants/fashionModes';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

/*
 * La portada de Weë Fashion en la demo (referencia del dueño, en blanco y negro): una portada con modelo, «¿qué quieres
 * crear hoy?» con fotos, las herramientas —que son los seis modos de siempre— e inspiración de la comunidad. Todo abre
 * un modo real del composer; las fotos las sirve el modo demo (docs/WEE-DEMO.md).
 */
const NEGRO = '#0A0A0A';

/* Fotos a color que la demo ya tiene (decisión del dueño, 2026-11-02: Fashion va a color y sin gastar más). */
const CREAR: readonly { id: string; clave: string; modo: FashionModoId; icono: string; medio: string }[] = [
  { id: 'clothes', clave: 'fashion.galClothes', modo: 'designGarments', icono: 'shirt-outline', medio: 'post-03' },
  { id: 'look', clave: 'fashion.galLook', modo: 'completeLook', icono: 'body-outline', medio: 'avatar-02' },
  { id: 'makeup', clave: 'fashion.galMakeup', modo: 'beautyHair', icono: 'brush-outline', medio: 'avatar-11' },
  { id: 'shoes', clave: 'fashion.galShoes', modo: 'tryOn', icono: 'footsteps-outline', medio: 'design-d5' },
  { id: 'hair', clave: 'fashion.galHair', modo: 'beautyHair', icono: 'cut-outline', medio: 'avatar-05' },
  /* Foto de Unsplash (licencia gratuita), photo-1771441580033. */
  { id: 'nails', clave: 'fashion.galNails', modo: 'beautyHair', icono: 'hand-left-outline', medio: 'stock-nails' },
];

/* Publicaciones de moda de la comunidad (scripts/demo/datos.mjs). */
const INSPIRACION = ['post-13', 'post-03', 'post-23', 'avatar-11'];

const PortadaDeFashion: React.FC<{ onAbrir: (modo: FashionModo) => void }> = ({ onAbrir }) => {
  const t = useT();
  const base = process.env.EXPO_PUBLIC_DEMO_MEDIOS;
  const modo = (id: FashionModoId) => FASHION_MODOS.find((m) => m.id === id) ?? FASHION_MODOS[0];

  return (
    <View style={s.pila}>
      <View style={s.portada}>
        <Image source={{ uri: `${base}/l-post-13.webp` }} style={s.modelo} contentFit="cover" />
        <LinearGradient colors={['#FFFFFF', 'rgba(255,255,255,0.92)', 'rgba(255,255,255,0)']} locations={[0, 0.45, 0.8]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        <View style={s.portadaTextos}>
          <Text style={s.etiquetas}>{t('fashion.heroTags')}</Text>
          <Text style={s.intro}>{t('fashion.intro')}</Text>
          <View style={s.botones}>
            <TouchableOpacity accessibilityRole="button" onPress={() => onAbrir(modo('completeLook'))} style={[s.boton, s.botonNegro]} activeOpacity={0.85}>
              <Ionicons name="add" size={scale(18)} color="#FFFFFF" />
              <Text style={[s.botonTexto, { color: '#FFFFFF' }]}>{t('fashion.ctaLook')}</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" onPress={() => onAbrir(modo('tryOn'))} style={[s.boton, s.botonBlanco]} activeOpacity={0.85}>
              <Ionicons name="shirt-outline" size={scale(16)} color={NEGRO} />
              <Text style={[s.botonTexto, { color: NEGRO }]}>{t('fashion.ctaTryOn')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Text accessibilityRole="header" style={s.titulo}>{t('nav.weeAiQuestion')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.fila}>
        {CREAR.map((c) => (
          <TouchableOpacity key={c.id} accessibilityRole="button" accessibilityLabel={t(c.clave)} onPress={() => onAbrir(modo(c.modo))} style={s.crear} activeOpacity={0.88}>
            <Image source={{ uri: `${base}/l-${c.medio}.webp` }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={s.velo} />
            <View style={s.crearIcono}><Ionicons name={c.icono as any} size={scale(15)} color={NEGRO} /></View>
            <Text style={s.crearTexto} numberOfLines={2}>{t(c.clave)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text accessibilityRole="header" style={s.titulo}>{t('fashion.toolsTitle')}</Text>
      <View style={s.herramientas}>
        {FASHION_MODOS.map((m) => (
          <TouchableOpacity key={m.id} accessibilityRole="button" accessibilityLabel={t(m.claveTitulo)} onPress={() => onAbrir(m)} style={s.herramienta} activeOpacity={0.85}>
            <Ionicons name={m.icono as any} size={scale(24)} color={NEGRO} />
            <Text style={s.herramientaTexto} numberOfLines={2}>{t(m.claveTitulo)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text accessibilityRole="header" style={s.titulo}>{t('fashion.inspirationTitle')}</Text>
      <View style={s.inspiracion}>
        {INSPIRACION.map((medio) => (
          <View key={medio} style={s.foto}>
            <Image source={{ uri: `${base}/l-${medio}.webp` }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
            <View style={s.corazon}><Ionicons name="heart-outline" size={scale(16)} color="#FFFFFF" /></View>
          </View>
        ))}
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  pila: { gap: SPACING.md, paddingBottom: SPACING.xxxl },
  portada: { height: scale(250), borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', backgroundColor: '#FFFFFF', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(10,10,10,0.14)' },
  modelo: { position: 'absolute', top: 0, bottom: 0, right: 0, width: '62%' },
  portadaTextos: { flex: 1, justifyContent: 'center', padding: SPACING.lg, gap: SPACING.sm, maxWidth: '68%' },
  etiquetas: { color: NEGRO, fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, letterSpacing: 0.4 },
  intro: { color: 'rgba(10,10,10,0.72)', fontSize: FONT_SIZE.sm, lineHeight: scale(19) },
  botones: { gap: SPACING.xs, marginTop: SPACING.xs, alignItems: 'flex-start' },
  boton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: SPACING.md, minHeight: scale(40), borderRadius: BORDER_RADIUS.full },
  botonNegro: { backgroundColor: NEGRO },
  botonBlanco: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: NEGRO },
  botonTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },
  titulo: { color: NEGRO, fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, marginTop: SPACING.sm },
  fila: { gap: SPACING.sm, paddingRight: SPACING.md },
  crear: { width: scale(118), height: scale(150), borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', backgroundColor: NEGRO, justifyContent: 'flex-end', padding: SPACING.sm },
  velo: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' },
  crearIcono: { width: scale(28), height: scale(28), borderRadius: scale(14), backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.xs },
  crearTexto: { color: '#FFFFFF', fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold },
  herramientas: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: SPACING.sm },
  herramienta: { width: '31.5%', minHeight: scale(96), borderRadius: BORDER_RADIUS.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(10,10,10,0.2)', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs, padding: SPACING.sm },
  herramientaTexto: { color: NEGRO, fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, textAlign: 'center' },
  inspiracion: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: SPACING.sm },
  foto: { width: '48.5%', aspectRatio: 4 / 5, borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', backgroundColor: NEGRO },
  corazon: { position: 'absolute', top: SPACING.sm, right: SPACING.sm, width: scale(30), height: scale(30), borderRadius: scale(15), backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
});

export default PortadaDeFashion;
