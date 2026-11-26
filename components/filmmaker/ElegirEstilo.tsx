import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useT } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { PORTADA_WEEAI as P, textoPortada } from '../../constants/estiloWeeAi';
import { ESTILOS, IMAGEN_DE_ESTILO } from '../../constants/filmmakerEstilos';

/**
 * LA SEGUNDA CAPA DE FILMMAKER: «¿Qué estilo quieres?» (2026-11-18). Los catorce estilos se ven A LA VEZ, sin desplazamiento y sin «Más estilos»:
 * la rejilla se calcula con el alto que de verdad le queda a la zona (`onLayout`; mientras no se mide, el de la ventana menos lo fijo). Se prefieren
 * DOS columnas (tarjetas grandes) y, si así la altura de la tarjeta bajaría de `ALTO_COMODO`, TRES (más compactas). Cada tarjeta es la imagen del estilo
 * a sangre con un degradado oscuro abajo para que el nombre se lea siempre; seleccionada lleva el aro blanco y la marca ✓. El estilo lo ELIGE la persona
 * (sin «Weë elige por mí» ni estilo por defecto). Objetivo táctil mínimo 44. En RTL la fila se espeja (`dir.contenedor`).
 */
const ALTO_COMODO = 78;
const ALTO_MINIMO = 44;

/** Con pantalla alta (≥ 760 dp de ventana) se prefieren siempre DOS columnas: tarjetas más altas que llenan sin desplazar y sin partir los nombres. */
const VENTANA_ALTA = 760;
const ALTO_COMODO_EN_ALTA = 58;

export function medidasDeRejilla(alto: number, ancho: number, n: number, altoDeVentana = 0): { columnas: number; w: number; h: number; hueco: number } {
  const hueco = alto < 520 ? 8 : 10;
  const calcular = (columnas: number) => {
    const filas = Math.ceil(n / columnas);
    const w = Math.floor((ancho - hueco * (columnas - 1)) / columnas);
    const h = Math.floor((alto - hueco * (filas - 1)) / filas);
    return { columnas, w, h: Math.min(h, Math.round(w * 0.8)), hueco };
  };
  const dos = calcular(2);
  if (dos.h >= (altoDeVentana >= VENTANA_ALTA ? ALTO_COMODO_EN_ALTA : ALTO_COMODO)) return dos;
  const tres = calcular(3);
  const cuatro = calcular(4);
  return tres.h >= ALTO_MINIMO || cuatro.h < tres.h ? { ...tres, h: Math.max(tres.h, ALTO_MINIMO) } : { ...cuatro, h: Math.max(cuatro.h, ALTO_MINIMO) };
}

export const ElegirEstilo: React.FC<{ ancho: number; elegido: string | null; onElegir: (id: string) => void }> = ({ ancho, elegido, onElegir }) => {
  const t = useT();
  const dir = useDireccion();
  const ventana = useWindowDimensions();
  const [medido, setMedido] = useState(0);
  const lado = 16;
  const arriba = 52;
  const disponible = (medido > 0 ? medido : Math.max(ventana.height - 230, 300)) - arriba - 14;
  const anchoDeFila = Math.min(ancho, 760) - lado * 2;
  const m = medidasDeRejilla(disponible, anchoDeFila, ESTILOS.length, ventana.height);
  const compacta = m.columnas > 2 || m.h < 96;
  return (
    <View style={styles.zona} onLayout={(e: LayoutChangeEvent) => { const h = Math.round(e.nativeEvent.layout.height); setMedido((a) => (Math.abs(a - h) > 1 ? h : a)); }}>
      <View style={[styles.arriba, { paddingHorizontal: lado }]}>
        <Text style={[textoPortada(compacta ? 22 : 24, '600'), dir.texto, { color: P.tinta }]} accessibilityRole="header">{t('filmmaker.styleTitle')}</Text>
      </View>
      <View style={[styles.rejilla, { paddingHorizontal: lado, gap: m.hueco }, dir.contenedor]}>
        {ESTILOS.map((e) => {
          const sel = elegido === e.id;
          const nombre = t(e.clave);
          return (
            <TouchableOpacity
              key={e.id}
              testID={`filmmaker-tipo-${e.id}`}
              onPress={() => onElegir(e.id)}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel={nombre}
              accessibilityState={{ selected: sel }}
              style={[styles.tarjeta, { width: m.w, height: m.h, borderColor: sel ? '#FFFFFF' : 'rgba(245,246,248,0.22)', borderWidth: sel ? 2.5 : 1 }]}
            >
              <LinearGradient colors={[e.tonos[0], e.tonos[1]]} style={StyleSheet.absoluteFill} />
              <Image source={IMAGEN_DE_ESTILO[e.id]} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} accessible={false} pointerEvents="none" />
              <LinearGradient colors={['rgba(5,6,8,0)', 'rgba(5,6,8,0.78)']} locations={[0.25, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
              <Text style={[textoPortada(m.columnas > 2 ? 12.5 : 16, '600'), dir.texto, styles.nombre, { color: '#FFFFFF' }]} numberOfLines={2}>{nombre}</Text>
              {sel ? <View style={[styles.marca, rtlPos(dir.esRTL)]}><Ionicons name="checkmark" size={14} color={P.sobreAccion} /></View> : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const rtlPos = (rtl: boolean) => (rtl ? { start: 7 } : { end: 7 });

const styles = StyleSheet.create({
  zona: { flex: 1 },
  arriba: { paddingTop: 6, paddingBottom: 10, minHeight: 52, justifyContent: 'center' },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignContent: 'flex-start' },
  tarjeta: { borderRadius: 16, overflow: 'hidden', backgroundColor: '#0A0D13', justifyContent: 'flex-end' },
  nombre: { paddingHorizontal: 9, paddingBottom: 7, paddingTop: 4, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
  marca: { position: 'absolute', top: 7, width: 20, height: 20, borderRadius: 10, backgroundColor: P.accion, alignItems: 'center', justifyContent: 'center' },
});
