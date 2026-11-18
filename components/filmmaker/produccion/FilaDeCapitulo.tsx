import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useT, useIdioma } from '../../../contexts/IdiomaContext';
import { useDireccion } from '../../../hooks/useDireccion';
import { PORTADA_WEEAI as P, textoPortada } from '../../../constants/estiloWeeAi';
import { Tanda, duracionDe } from '../../../utils/tandasDeFilmmaker';
import { etiquetaAccesible } from '../../../utils/ideaDeFilmmaker';
import { useTiempo } from '../tandas/comunes';

/**
 * UN CAPÍTULO EN UNA FILA (Producción y Juntar): miniatura con su número, «Capítulo n», sus cuadros y su duración, y su estado
 * («Pendiente» mientras no se ha producido; «Producido» cuando todos sus cuadros están listos). Solo lectura: la acción vive en la pantalla.
 */
export const FilaDeCapitulo: React.FC<{ tanda: Tanda; posicion: number; cuadros: number; estado?: 'pendiente' | 'listo' | 'producing' | 'error' }> = ({ tanda, posicion, cuadros, estado = 'pendiente' }) => {
  const t = useT();
  const { formato } = useIdioma();
  const dir = useDireccion();
  const tiempo = useTiempo();
  const titulo = tanda.titulo || t('filmmakerTandas.chapterN', { n: formato.numero(posicion) });
  const meta = `${t('filmmakerTandas.frames', { contador: cuadros })} · ${tiempo.solo(duracionDe(tanda))}`;
  const etiqueta = estado === 'listo' ? t('filmmakerTandas.stateDone') : estado === 'producing' ? t('filmmakerTandas.stateProducing') : estado === 'error' ? t('filmmakerTandas.stateError') : t('filmmakerProd.pending');
  return (
    <View style={[styles.fila, dir.contenedor]} accessible accessibilityLabel={etiquetaAccesible(titulo, meta, etiqueta)}>
      <View style={styles.miniatura}>
        <LinearGradient colors={['#0A0D13', '#1B2029']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <Ionicons name="film-outline" size={18} color={P.tintaDeshabilitada} />
        <View style={[styles.num, { start: 4 }]}><Text style={[textoPortada(11, '600'), { color: P.tinta }]}>{formato.numero(posicion)}</Text></View>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[textoPortada(15, '600'), dir.texto, { color: P.tinta }]} numberOfLines={1}>{titulo}</Text>
        <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]} numberOfLines={1}>{meta}</Text>
      </View>
      <Text style={[textoPortada(12, '600'), { color: P.tintaSecundaria }]} numberOfLines={1}>{etiqueta}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, padding: 8, borderRadius: 16, borderWidth: 1, borderColor: P.bordeCapsula, backgroundColor: P.superficie },
  miniatura: { width: 48, height: 48, borderRadius: 10, borderWidth: 1, borderColor: P.bordeLuz, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  num: { position: 'absolute', top: 3, minWidth: 18, height: 18, paddingHorizontal: 3, borderRadius: 5, borderWidth: 1, borderColor: P.tinta, backgroundColor: 'rgba(5,6,8,0.8)', alignItems: 'center', justifyContent: 'center' },
});
