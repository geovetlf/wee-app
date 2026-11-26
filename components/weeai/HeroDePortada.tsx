import React, { useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useT } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { PORTADA_WEEAI as P, textoPortada, ESPACIO_WEEAI as SPACING } from '../../constants/estiloWeeAi';
import { uriDeLaEsfera } from './arteDePortada';
import { emDeTexto } from './medidaDeTexto';

/** Donde queda el borde de la esfera (su punto más alto) dentro del hero, y lo que se reserva debajo para que ningún trazo roce el texto. */
const BORDE_ARRIBA = 6;
const ZONA_DEL_ARCO = 46;

/**
 * Parte un texto en dos líneas EQUILIBRADAS si por su largo no cabe en una (cota en em): evita la palabra huérfana («…con / IA») también en
 * Android, donde `textWrap: balance` no existe. Sin espacios (CJK, jemer) no se toca: ahí el navegador y el sistema ya parten por sílaba o palabra.
 */
export const equilibrar = (texto: string, size: number, ancho: number, latino = 0.5): string => {
  if (!/\s/.test(texto) || emDeTexto(texto, latino) * size <= ancho * 0.95) return texto;
  let mejor = -1;
  let peor = Infinity;
  for (let i = 0; i < texto.length; i++) if (/\s/.test(texto[i])) { const mayor = Math.max(i, texto.length - i - 1); if (mayor < peor) { peor = mayor; mejor = i; } }
  return mejor < 0 ? texto : texto.slice(0, mejor) + '\n' + texto.slice(mejor + 1);
};

/**
 * El hero de la portada: el RECURSO AMBIENTAL (la esfera, anclada arriba y con su borde de luz lo más alto) y, debajo de su arco, el titular.
 * El arte va SIEMPRE por detrás del texto y se desvanece hacia abajo con un degradado nativo (no con uno del SVG: el decodificador de Android
 * no lo respeta y dejaba una banda con borde duro). El hero ocupa lo que sobra entre la cabecera y la caja: con mucho sitio, el texto se
 * centra bajo el arco; con poco, pierde primero el subtítulo, luego la etiqueta, y el titular baja de tamaño.
 */
export const HeroDePortada: React.FC<{ ancho: number; etiqueta?: string; titulo?: string; sub?: string }> = ({ ancho, etiqueta, titulo, sub }) => {
  const t = useT();
  /* Los textos de la portada de WeëAI; Filmmaker (y quien venga) pasa los suyos y reutiliza el mismo recurso. */
  const tEtiqueta = etiqueta ?? t('weeai.portadaEtiqueta');
  const tTitulo = titulo ?? t('weeai.portadaTitulo');
  const tSub = sub ?? t('weeai.portadaSub');
  const dir = useDireccion();
  const [alto, setAlto] = useState(0);
  /* Dónde empieza de verdad el bloque de texto (etiqueta + titular + sub) dentro del hero: el arco NUNCA baja de ahí, en ningún idioma ni plataforma. */
  const [yDelTexto, setYDelTexto] = useState<number | null>(null);
  const medido = alto > 0;
  const util = alto - ZONA_DEL_ARCO;
  const conSub = !medido || util >= 150;
  const conEtiqueta = !medido || util >= 112;
  const porAncho = ancho < 340 ? 30 : ancho < 380 ? 34 : ancho < 420 ? 38 : 42;
  const titularPorAlto = medido ? Math.max(24, Math.min(porAncho, Math.floor(util * (conSub ? 0.3 : 0.42)))) : porAncho;
  const anchoDeTexto = ancho - 2 * SPACING.lg;
  const emTitulo = emDeTexto(tTitulo, 0.52);
  const dosLineas = Math.max(22, Math.min(titularPorAlto, Math.floor((2 * 0.92 * anchoDeTexto) / (emTitulo * 1.1))));
  /* Si con una letra algo menor (>= 78 %) cabe en UNA línea, mejor una que dos: sin palabra suelta ni salto raro. */
  const unaLinea = Math.floor((0.97 * anchoDeTexto) / emTitulo);
  const enUnaLinea = unaLinea >= Math.round(dosLineas * 0.78) && /\s/.test(tTitulo);
  const titular = enUnaLinea ? Math.min(dosLineas, unaLinea) : dosLineas;
  const alturaDelArte = Math.round(ancho * 0.75);
  /* La franja del arte: de arriba del hero al borde superior del texto medido (menos 6 dp). Sin medida todavía, el arte entero. */
  const franja = yDelTexto === null ? alto || alturaDelArte : Math.max(0, Math.min(alto || alturaDelArte, yDelTexto - 6));
  /* La escritura árabe y hebrea pide más altura de línea que la latina: se reserva para que ni el titular ni el arco se pisen. */
  const interlineado = /[\u0590-\u06FF]/.test(tTitulo) ? 1.42 : 1.22;
  const arriba = BORDE_ARRIBA - Math.round(ancho * 0.29);
  const textoSub = equilibrar(tSub, 15, Math.min(380, anchoDeTexto));
  const textoTitular = enUnaLinea ? tTitulo : equilibrar(tTitulo, titular, anchoDeTexto, 0.58);
  return (
    <View style={styles.hero} onLayout={(e: LayoutChangeEvent) => { const h = Math.round(e.nativeEvent.layout.height); setAlto((antes) => (Math.abs(antes - h) > 1 ? h : antes)); }}>
      {/* La franja clipada: el arte y su desvanecido viven DENTRO, así que por construcción nada pasa del borde de arriba del texto. */}
      <View pointerEvents="none" style={[styles.franja, { height: franja }]}>
        <Image
          source={{ uri: uriDeLaEsfera({ luz: P.luz, luzSecundaria: P.luzSecundaria, halo: P.halo, superficie: P.esfera, fondo: P.fondo }) }}
          style={[styles.arte, { height: alturaDelArte, top: arriba }]}
          contentFit="cover"
          contentPosition="top"
          transition={0}
          accessible={false}
          pointerEvents="none"
        />
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(5,6,8,0)', P.fondo]}
          style={[styles.velo, { top: Math.round(franja * 0.5), height: Math.max(0, franja - Math.round(franja * 0.5)) }]}
        />
      </View>
      <View style={styles.texto}>
        <View style={styles.bloque} onLayout={(e: LayoutChangeEvent) => { const y = Math.round(e.nativeEvent.layout.y); setYDelTexto((antes) => (antes === null || Math.abs(antes - y) > 1 ? y : antes)); }}>
        {conEtiqueta ? <Text style={[textoPortada(12, '500', { letterSpacing: 4 }), styles.etiqueta, dir.texto, { color: P.tintaSecundaria }]} numberOfLines={1}>{tEtiqueta}</Text> : null}
        <Text style={[textoPortada(titular, '600', { letterSpacing: -0.5, lineHeight: Math.round(titular * interlineado) }), styles.titular, { color: P.tinta }]} numberOfLines={2} accessibilityRole="header">{textoTitular}</Text>
        {conSub ? <Text style={[textoPortada(15, '400', { lineHeight: 22 }), styles.sub, { color: P.tintaSecundaria }]} numberOfLines={2}>{textoSub}</Text> : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  hero: { flex: 1, minHeight: 0, overflow: 'hidden' },
  arte: { position: 'absolute', start: 0, end: 0 },
  franja: { position: 'absolute', start: 0, end: 0, top: 0, overflow: 'hidden' },
  bloque: { alignItems: 'center', maxWidth: '100%' },
  velo: { position: 'absolute', start: 0, end: 0 },
  texto: { flex: 1, minHeight: 0, paddingTop: ZONA_DEL_ARCO, paddingHorizontal: SPACING.lg, alignItems: 'center', justifyContent: 'center' },
  etiqueta: { textAlign: 'center', textTransform: 'uppercase' },
  titular: { textAlign: 'center', marginTop: SPACING.xs },
  sub: { textAlign: 'center', marginTop: SPACING.sm, maxWidth: 380 },
});
