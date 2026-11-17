import React, { useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import { useT } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { PORTADA_WEEAI as P, textoPortada, ESPACIO_WEEAI as SPACING } from '../../constants/estiloWeeAi';
import { uriDeLaEsfera } from './arteDePortada';
import { emDeTexto } from './medidaDeTexto';

/** El arte ambiental: la esfera con su luz fría, anclada arriba y estirada al ancho (lienzo de 400x300). Su arco queda bajo la cabecera. */
export const FondoDeEsfera: React.FC<{ ancho: number }> = ({ ancho }) => (
  <Image
    source={{ uri: uriDeLaEsfera({ luz: P.luz, luzSecundaria: P.luzSecundaria, halo: P.halo, superficie: P.esfera, fondo: P.fondo }) }}
    style={[styles.esfera, { height: Math.round(ancho * 0.75), top: -Math.round(ancho * 0.12) }]}
    contentFit="cover"
    contentPosition="top"
    transition={0}
    accessible={false}
    pointerEvents="none"
  />
);

/**
 * El titular de la portada: la etiqueta, «Crea sin límites» y su subtítulo, centrados. La portada es FIJA, así que el hero
 * ocupa lo que sobra entre la cabecera y la caja y se comprime con esa altura: con poco sitio pierde primero el subtítulo,
 * luego la etiqueta, y el titular baja de tamaño; nunca empuja a nadie fuera de la pantalla.
 */
export const HeroDePortada: React.FC<{ ancho: number }> = ({ ancho }) => {
  const t = useT();
  const dir = useDireccion();
  const [alto, setAlto] = useState(0);
  const medido = alto > 0;
  const conSub = !medido || alto >= 150;
  const conEtiqueta = !medido || alto >= 112;
  /* Titular: de 42 en pantallas holgadas a 30 en las de 320, y menos aún si el hero es bajo. */
  const porAncho = ancho < 340 ? 30 : ancho < 380 ? 34 : ancho < 420 ? 38 : 42;
  const titularPorAlto = medido ? Math.max(24, Math.min(porAncho, Math.floor(alto * (conSub ? 0.3 : 0.42)))) : porAncho;
  /* Y que el titular quepa en sus dos líneas en cualquier escritura (jemer, CJK…): cota por el largo del texto en el ancho útil. */
  const titular = Math.max(22, Math.min(titularPorAlto, Math.floor((2 * 0.92 * (ancho - 2 * SPACING.lg)) / emDeTexto(t('weeai.portadaTitulo'), 0.6))));
  return (
    <View style={styles.hero} onLayout={(e: LayoutChangeEvent) => { const h = Math.round(e.nativeEvent.layout.height); setAlto((antes) => (Math.abs(antes - h) > 1 ? h : antes)); }}>
      {conEtiqueta ? <Text style={[textoPortada(12, '500', { letterSpacing: 4 }), styles.etiqueta, dir.texto, { color: P.tintaSecundaria }]} numberOfLines={1}>{t('weeai.portadaEtiqueta')}</Text> : null}
      <Text style={[textoPortada(titular, '600', { letterSpacing: -0.5, lineHeight: Math.round(titular * 1.22) }), styles.titular, { color: P.tinta }]} numberOfLines={2} accessibilityRole="header">{t('weeai.portadaTitulo')}</Text>
      {conSub ? <Text style={[textoPortada(15, '400', { lineHeight: 22 }), styles.sub, { color: P.tintaSecundaria }]} numberOfLines={2}>{t('weeai.portadaSub')}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  esfera: { position: 'absolute', start: 0, end: 0 },
  hero: { flex: 1, minHeight: 0, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.lg },
  etiqueta: { textAlign: 'center', textTransform: 'uppercase' },
  titular: { textAlign: 'center', marginTop: SPACING.xs, ...({ textWrap: 'balance' } as object) },
  sub: { textAlign: 'center', marginTop: SPACING.sm, maxWidth: 380, ...({ textWrap: 'balance' } as object) },
});
