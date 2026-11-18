import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { IconoWee } from '../icons/IconoWee';
import { useT } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { PORTADA_WEEAI as P, textoPortada } from '../../constants/estiloWeeAi';
import { IMAGEN_DE_TIPO, ICONO_DE_TIPO, TEXTURA_DE_TIPO, TipoDeProyecto } from '../../constants/filmmakerCrear';
import { uriDeTextura, TexturaDeModulo } from '../weeai/arteDePortada';
import { emDeTexto } from '../weeai/medidaDeTexto';

/** Una imagen cuenta como la de verdad solo si es más ancha que el marcador de 1 px que viene en el repositorio. */
const ANCHO_MINIMO_DE_LA_REAL = 300;

/**
 * LA TARJETA DE TIPO DE PROYECTO («Elige el tipo de proyecto», referencia del dueño 2026-11-17): apaisada, esquinas de 24, borde blanco luminoso con
 * un halo (un anillo translúcido por fuera: en Android no hay sombra de color), imagen a sangre con un degradado oscuro del lado del texto, y
 * abajo a ese lado el icono, el nombre y la frase. La imagen sale de `assets/images/filmmaker/tipos/<tipo>.webp`; mientras ese archivo sea el
 * marcador (o falte), se ve un fondo propio —degradado oscuro con la textura vectorial del tipo—: añadir el archivo es lo único que hace falta.
 * Cerrada: imagen atenuada y «Próximamente» en la esquina, sin mover el texto. En RTL todo se espeja (el texto a la derecha).
 */
/** Lo mínimo que la tarjeta lee de lo que pinta: sirve igual para un tipo de proyecto que para un estilo (capa de estilos), que aporta su propia imagen, textura y tonos. */
export type ContenidoDeTarjeta = Pick<TipoDeProyecto, 'clave' | 'claveSub' | 'estado' | 'claveMotivo'> & { id: string };

export const TarjetaDeTipo: React.FC<{ tipo: ContenidoDeTarjeta; ancho: number | string; alto: number; elegido: boolean; onPress: () => void; orden?: number; imagen?: number; textura?: TexturaDeModulo; tonos?: readonly [string, string] }> = ({ tipo, ancho, alto, elegido, onPress, orden = 0, imagen, textura, tonos }) => {
  const t = useT();
  const dir = useDireccion();
  const [real, setReal] = useState(false);
  /* Entrada suave (escalonada) y pulsación corta: un resorte de 0,975 al apretar. */
  const entrada = useRef(new Animated.Value(0)).current;
  const pulso = useRef(new Animated.Value(1)).current;
  useEffect(() => { Animated.timing(entrada, { toValue: 1, duration: 340, delay: 80 + orden * 70, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }, [entrada, orden]);
  const apretar = (a: number) => Animated.spring(pulso, { toValue: a, speed: 40, bounciness: 6, useNativeDriver: true }).start();
  const abierta = tipo.estado !== 'cerrada';
  const nombre = t(tipo.clave);
  const sub = t(tipo.claveSub);
  const conSub = alto >= 62 && sub !== '';
  const rtl = dir.esRTL;
  /* La frase se lee ENTERA: con altura (>= 96) puede ir en dos líneas; si no, en una con la letra bajando de 12 a 10,5 como mucho. El nombre baja de 19 a 16 si no cabe holgado. */
  const anchoNumero = typeof ancho === 'number' ? ancho : 360;
  const disponible = anchoNumero - 36;
  const lineasSub = alto >= 76 ? 2 : 1;
  const tamSub = Math.max(10.5, Math.min(12, Math.floor((disponible * lineasSub * 0.9 / emDeTexto(sub, 0.52)) * 2) / 2));
  /* El icono solo si cabe sobre el nombre y la frase ENTERA: si la frase pide dos líneas, la tarjeta necesita 18 dp más. */
  const conIcono = !!ICONO_DE_TIPO[tipo.id as TipoDeProyecto['id']] && alto >= 84 + (emDeTexto(sub, 0.52) * 11 > disponible ? 20 : 0);
  const tamNombre = Math.max(16, Math.min(alto >= 84 ? 19 : 16, Math.floor(disponible * 0.92 / emDeTexto(nombre, 0.62))));
  const colores: [string, string, string] = ['rgba(5,6,8,0.82)', 'rgba(5,6,8,0.42)', 'rgba(5,6,8,0)'];
  return (
    <Animated.View style={{ width: ancho as number, opacity: entrada, transform: [{ translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }, { scale: pulso }] }}>
    <TouchableOpacity
      testID={`filmmaker-tipo-${tipo.id}`}
      onPress={onPress}
      onPressIn={() => apretar(0.975)}
      onPressOut={() => apretar(1)}
      activeOpacity={0.9}
      hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
      accessibilityRole="button"
      accessibilityLabel={abierta ? `${nombre}. ${sub}` : `${nombre}. ${t('filmmaker.hubNotYet')}. ${t(tipo.claveMotivo as string)}`}
      accessibilityState={{ selected: elegido, disabled: !abierta }}
      style={[styles.marco, { width: '100%', height: alto }]}
    >
      {/* El halo: un segundo anillo, más ancho y más tenue, por fuera del borde. */}
      <View pointerEvents="none" style={[styles.haloExterior, { borderColor: elegido ? 'rgba(245,246,248,0.22)' : 'rgba(245,246,248,0.07)', opacity: abierta ? 1 : 0.5 }]} />
      <View pointerEvents="none" style={[styles.halo, { borderColor: elegido ? 'rgba(245,246,248,0.55)' : 'rgba(245,246,248,0.24)', opacity: abierta ? 1 : 0.5 }]} />
      <View style={[styles.tarjeta, { borderColor: elegido ? 'rgba(255,255,255,1)' : abierta ? 'rgba(250,251,255,0.95)' : 'rgba(245,246,248,0.40)', borderWidth: elegido ? 2.5 : 2 }]}>
        {/* El fondo propio, siempre debajo: lo que se ve mientras no hay imagen. */}
        <LinearGradient colors={tonos ? [tonos[0], tonos[1]] : ['#0A0D13', '#171B22']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <Image source={{ uri: uriDeTextura(textura ?? TEXTURA_DE_TIPO[tipo.id as TipoDeProyecto['id']], P.iconoModulo) }} style={[StyleSheet.absoluteFill, { opacity: real ? 0 : 0.9 }]} contentFit="cover" transition={0} accessible={false} pointerEvents="none" />
        <Image
          source={imagen ?? IMAGEN_DE_TIPO[tipo.id as TipoDeProyecto['id']]}
          style={[StyleSheet.absoluteFill, { opacity: real ? (abierta ? 1 : 0.4) : 0 }, rtl && styles.espejo]}
          contentFit="cover"
          contentPosition="right"
          transition={250}
          onLoad={(e) => { if ((e?.source?.width ?? 0) >= ANCHO_MINIMO_DE_LA_REAL) setReal(true); }}
          accessible={false}
          pointerEvents="none"
        />
        {/* El degradado oscuro del lado del texto (≈55 %): el texto se lee aunque la imagen sea clara. */}
        <LinearGradient colors={colores} locations={[0, 0.55, 1]} start={{ x: rtl ? 1 : 0, y: 0 }} end={{ x: rtl ? 0 : 1, y: 0 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
        <View style={[styles.texto, { alignItems: rtl ? 'flex-end' : 'flex-start' }]}>
          {conIcono ? <IconoWee name={ICONO_DE_TIPO[tipo.id as TipoDeProyecto['id']]} size={22} color={abierta ? P.tinta : P.tintaSecundaria} /> : null}
          <Text style={[textoPortada(tamNombre, '600'), dir.texto, { color: abierta ? P.tinta : P.tintaSecundaria }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{nombre}</Text>
          {conSub ? <Text style={[textoPortada(tamSub, '400'), dir.texto, { color: abierta ? '#C9CED8' : P.tintaDeshabilitada }]} numberOfLines={lineasSub} adjustsFontSizeToFit minimumFontScale={0.85}>{sub}</Text> : null}
        </View>
        {elegido ? <View style={[styles.marca, rtl ? { start: 10 } : { end: 10 }]}><Ionicons name="checkmark" size={14} color={P.sobreAccion} /></View> : null}
      </View>
    </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  /* En RTL el texto va a la derecha: la imagen se ESPEJA para que su zona nítida quede a la izquierda (el degradado oscuro ya se invierte). */
  espejo: { transform: [{ scaleX: -1 }] },
  marco: { justifyContent: 'center' },
  halo: { position: 'absolute', top: -3, bottom: -3, start: -3, end: -3, borderRadius: 27, borderWidth: 3 },
  haloExterior: { position: 'absolute', top: -7, bottom: -7, start: -7, end: -7, borderRadius: 31, borderWidth: 5 },
  tarjeta: { flex: 1, borderRadius: 24, overflow: 'hidden', backgroundColor: '#0A0D13', justifyContent: 'flex-end' },
  texto: { paddingHorizontal: 14, paddingBottom: 12, paddingTop: 8, gap: 3 },
  marca: { position: 'absolute', top: 10, width: 20, height: 20, borderRadius: 10, backgroundColor: P.accion, alignItems: 'center', justifyContent: 'center' },
});
