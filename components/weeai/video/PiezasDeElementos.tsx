import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useEstiloWeeAi } from '../../../hooks/useEstiloWeeAi';
import { useDireccion } from '../../../hooks/useDireccion';
import { ESPACIO_WEEAI as SP, RADIO_WEEAI, textoWeeAi } from '../../../constants/estiloWeeAi';
import { scale } from '../../../utils/scale';

/*
 * LAS PIEZAS DE LA HOJA DE ELEMENTOS Y DE LA PANTALLA DE VIDEO. Regla del dueño: título, pestaña, píldora, botón y rótulo de tarjeta =
 * UNA palabra en UNA línea (`numberOfLines={1}` con elipsis); las filas de píldoras y pestañas se desplazan de lado, nunca se parten.
 * Monocromo y sin líneas: se separa con tono de superficie. Lo seleccionado se dice invirtiendo (tinta sobre fondo).
 */

export interface OpcionDePildora {
  id: string;
  texto: string;
}

/** Una fila de píldoras que se desplaza de lado: ancho por contenido, una línea, objetivo de 44 px. */
export const FilaDePildoras: React.FC<{ opciones: OpcionDePildora[]; puesta: string; onElegir: (id: string) => void; tamano?: 'pestana' | 'pildora' }> = ({ opciones, puesta, onElegir, tamano = 'pildora' }) => {
  const c = useEstiloWeeAi();
  const dir = useDireccion();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.fila, dir.contenedor]} style={styles.filaScroll}>
      {opciones.map((o) => {
        const on = o.id === puesta;
        return (
          <TouchableOpacity
            key={o.id}
            onPress={() => onElegir(o.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={[styles.pildora, { backgroundColor: on ? c.seleccion : c.superficie }]}
          >
            <Text numberOfLines={1} style={[textoWeeAi(tamano === 'pestana' ? 'cuerpo' : 'nota', on ? '600' : '500'), { color: on ? c.sobreSeleccion : c.tinta }]}>{o.texto}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

/** La celda de un elemento: relleno o foto, rótulo en la esquina (una línea), círculo de selección y favorito. */
export const CeldaDeElemento: React.FC<{
  ancho: number;
  alto?: number;
  rotulo: string;
  uri?: string;
  gradiente?: [string, string];
  elegido: boolean;
  onPress: () => void;
  favorito?: boolean;
  onFavorito?: () => void;
  etiquetaFavorito?: string;
}> = ({ ancho, alto, rotulo, uri, gradiente, elegido, onPress, favorito, onFavorito, etiquetaFavorito }) => {
  const c = useEstiloWeeAi();
  const dir = useDireccion();
  return (
    <TouchableOpacity onPress={onPress} accessibilityRole="button" accessibilityLabel={rotulo} accessibilityState={{ selected: elegido }} style={[styles.celda, { width: ancho, height: alto ?? Math.round(ancho * 1.25), backgroundColor: c.superficieAlta }]}>
      {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} /> : <LinearGradient colors={gradiente ?? ['#E4E4E7', '#71717A']} style={StyleSheet.absoluteFill} />}
      <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)']} style={styles.velo} pointerEvents="none" />
      <View style={[styles.circulo, dir.alInicio(SP.sm), { backgroundColor: elegido ? c.seleccion : 'rgba(255,255,255,0.85)' }]} pointerEvents="none">
        {elegido ? <Ionicons name="checkmark" size={scale(14)} color={c.sobreSeleccion} /> : null}
      </View>
      {onFavorito ? (
        <TouchableOpacity onPress={onFavorito} accessibilityRole="button" accessibilityLabel={etiquetaFavorito} accessibilityState={{ selected: !!favorito }} hitSlop={8} style={[styles.estrella, dir.alFinal(2)]}>
          <Ionicons name={favorito ? 'star' : 'star-outline'} size={scale(18)} color="#FFFFFF" />
        </TouchableOpacity>
      ) : null}
      <Text numberOfLines={1} style={[styles.rotulo, textoWeeAi('nota', '600'), dir.texto]}>{rotulo}</Text>
    </TouchableOpacity>
  );
};

/** La celda de acción («Nuevo», «Cámara», «Galería»): superficie, icono y una palabra. */
export const CeldaDeAccion: React.FC<{ ancho: number; alto?: number; icono: React.ComponentProps<typeof Ionicons>['name']; rotulo: string; onPress: () => void }> = ({ ancho, alto, icono, rotulo, onPress }) => {
  const c = useEstiloWeeAi();
  return (
    <TouchableOpacity onPress={onPress} accessibilityRole="button" style={[styles.celda, styles.accion, { width: ancho, height: alto ?? Math.round(ancho * 1.25), backgroundColor: c.superficie }]}>
      <Ionicons name={icono} size={scale(26)} color={c.tinta} />
      <Text numberOfLines={1} style={[textoWeeAi('nota', '600'), { color: c.tinta }]}>{rotulo}</Text>
    </TouchableOpacity>
  );
};

/** La miniatura redonda de la fila de personajes. */
export const Redonda: React.FC<{ tam?: number; uri?: string; gradiente?: [string, string]; rotulo: string; elegido?: boolean; onPress: () => void; icono?: React.ComponentProps<typeof Ionicons>['name'] }> = ({ tam = 64, uri, gradiente, rotulo, elegido, onPress, icono }) => {
  const c = useEstiloWeeAi();
  return (
    <TouchableOpacity onPress={onPress} accessibilityRole="button" accessibilityLabel={rotulo} accessibilityState={{ selected: !!elegido }} style={[styles.redonda, { width: tam + 8 }]}>
      {/* El elegido se dice con un aro de tinta hecho de fondo (sin borde). */}
      <View style={{ width: tam + 8, height: tam + 8, borderRadius: (tam + 8) / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: elegido ? c.seleccion : 'transparent' }}>
        <View style={[styles.redondaImg, { width: tam, height: tam, borderRadius: tam / 2, backgroundColor: icono ? c.superficie : c.superficieAlta }, elegido && { width: tam - 4, height: tam - 4, borderRadius: (tam - 4) / 2 }]}>
          {icono ? <Ionicons name={icono} size={scale(24)} color={c.tinta} /> : uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} /> : <LinearGradient colors={gradiente ?? ['#E4E4E7', '#71717A']} style={StyleSheet.absoluteFill} />}
        </View>
      </View>
      <Text numberOfLines={1} style={[textoWeeAi('nota', '500'), styles.redondaTexto, { color: c.tintaSecundaria }]}>{rotulo}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  filaScroll: { flexGrow: 0 },
  fila: { flexDirection: 'row', gap: SP.sm, paddingVertical: 2, paddingEnd: SP.md },
  pildora: { minHeight: 44, borderRadius: RADIO_WEEAI.pastilla, paddingHorizontal: SP.md, alignItems: 'center', justifyContent: 'center' },
  celda: { borderRadius: RADIO_WEEAI.tarjeta, overflow: 'hidden', justifyContent: 'flex-end' },
  accion: { alignItems: 'center', justifyContent: 'center', gap: SP.sm },
  velo: { position: 'absolute', start: 0, end: 0, bottom: 0, height: '45%' },
  circulo: { position: 'absolute', top: SP.sm, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  estrella: { position: 'absolute', top: 2, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  rotulo: { color: '#FFFFFF', paddingHorizontal: SP.sm + 2, paddingBottom: SP.sm },
  redonda: { alignItems: 'center', gap: 6, minHeight: 44 },
  redondaImg: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  redondaTexto: { maxWidth: 72, textAlign: 'center' },
});
