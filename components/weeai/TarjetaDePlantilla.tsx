import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useEstiloWeeAi } from '../../hooks/useEstiloWeeAi';
import { useIdioma } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { useUserById } from '../../hooks/useUserById';
import { GRADIENTE_NEUTRO, PlantillaWeeAi, tituloDePlantilla } from '../../constants/plantillasWeeAi';
import { ESPACIO_WEEAI as SPACING, RADIO_WEEAI, SOMBRA_WEEAI, NUMEROS_TABULARES, textoWeeAi } from '../../constants/estiloWeeAi';
import { scale } from '../../utils/scale';


/** Una plantilla en el muro: el resultado manda (miniatura grande), luego un título corto y la prueba social. */
export const TarjetaDePlantilla: React.FC<{ plantilla: PlantillaWeeAi; ancho: number; onPress: () => void }> = ({ plantilla, ancho, onPress }) => {
  const c = useEstiloWeeAi();
  const { t, formato } = useIdioma();
  const dir = useDireccion();
  const { userProfile: autor } = useUserById(plantilla.autorId);
  /* La altura sale del aspecto real: la tarjeta no salta al cargar la imagen. */
  const alto = Math.round(ancho / plantilla.aspecto);
  const titulo = tituloDePlantilla(plantilla, t);
  const nombre = plantilla.autorNombre || autor?.displayName || '';
  const compacto = (n: number) => formato.numero(n, { notation: 'compact', maximumFractionDigits: 1 });
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={titulo}
      style={[styles.tarjeta, SOMBRA_WEEAI, { backgroundColor: c.superficie }]}
    >
      <View style={{ width: '100%', height: alto, backgroundColor: c.superficieAlta }}>
        {plantilla.imagen ? (
          <Image source={{ uri: plantilla.imagen }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} accessible={false} />
        ) : (
          <LinearGradient colors={plantilla.gradiente ?? GRADIENTE_NEUTRO} style={StyleSheet.absoluteFill} />
        )}
        {/* Sin reproducción automática: el video enseña su miniatura y el icono; se reproduce al abrirlo. */}
        {plantilla.video ? (
          <View style={[styles.play, dir.alFinal(SPACING.sm)]}>
            <Ionicons name="play" size={scale(14)} color="#FFFFFF" />
          </View>
        ) : null}
        {plantilla.ejemplo ? (
          <View style={[styles.ejemplo, dir.alInicio(SPACING.sm)]}>
            <Text style={[styles.ejemploTexto, textoWeeAi('nota', '600')]}>{t('weeai.example')}</Text>
          </View>
        ) : null}
        {plantilla.recreaciones > 0 ? (
          <View style={[styles.recreaciones, dir.contenedor, dir.alInicio(SPACING.sm)]}>
            <Ionicons name="refresh" size={scale(13)} color="#FAFAFA" />
            <Text style={[styles.recreacionesTexto, textoWeeAi('nota', '600'), NUMEROS_TABULARES]} numberOfLines={1}>{compacto(plantilla.recreaciones)}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.titulo, textoWeeAi('cuerpo', '600'), dir.texto, { color: c.tinta }]} numberOfLines={3}>{titulo}</Text>
      {nombre ? <Text style={[styles.meta, textoWeeAi('nota'), dir.texto, { color: c.tintaSecundaria }]} numberOfLines={1}>{nombre}</Text> : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  tarjeta: { borderRadius: RADIO_WEEAI.tarjeta, overflow: 'hidden', marginBottom: SPACING.sm },
  play: { position: 'absolute', top: SPACING.sm, width: scale(28), height: scale(28), borderRadius: scale(14), backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  ejemplo: { position: 'absolute', top: SPACING.sm, backgroundColor: 'rgba(10,10,10,0.72)', borderRadius: RADIO_WEEAI.pastilla, paddingHorizontal: SPACING.sm, paddingVertical: 2 },
  ejemploTexto: { color: '#FAFAFA' },
  recreaciones: { position: 'absolute', bottom: SPACING.sm, flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, backgroundColor: 'rgba(10,10,10,0.72)', borderRadius: RADIO_WEEAI.pastilla, paddingHorizontal: SPACING.sm, paddingVertical: 2, maxWidth: '70%' },
  recreacionesTexto: { color: '#FAFAFA' },
  titulo: { paddingHorizontal: SPACING.md - 4, paddingTop: SPACING.sm },
  meta: { paddingHorizontal: SPACING.md - 4, paddingBottom: SPACING.md - 4, paddingTop: 2 },
});
