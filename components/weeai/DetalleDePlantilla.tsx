import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Share, Platform } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import IconoDireccional from '../IconoDireccional';
import { RellenoDeDegradado } from '../GradienteDeMarca';
import PersonalizarVideo, { EstadoDePersonalizar } from './video/PersonalizarVideo';
import { useIdioma } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { useUserById } from '../../hooks/useUserById';
import { GRADIENTE_NEUTRO, PlantillaWeeAi, explicacionDePlantilla, tituloDePlantilla } from '../../constants/plantillasWeeAi';
import { ARTE_WEEAI } from '../../constants/marca';
import { compartirFueraDeWee } from '../../utils/compartirFuera';
import { ESPACIO_WEEAI as SPACING, RADIO_WEEAI, FONT_SIZE_WEEAI as FONT_SIZE, FONT_WEIGHT_WEEAI as FONT_WEIGHT, NUMEROS_TABULARES } from '../../constants/estiloWeeAi';
import { scale } from '../../utils/scale';


interface Props {
  plantilla: PlantillaWeeAi | null;
  onClose: () => void;
  /** «Recrear»: abre la maqueta «Tu versión». */
  onRecrear: (p: PlantillaWeeAi) => void;
  /** Abre la publicación de origen (reproducir, comentar, votar): su pantalla de siempre. */
  onAbrirPublicacion: (postId: string) => void;
  /** «Más como esta»: otras plantillas de la misma categoría (las que ya están cargadas; sin algoritmo ni ubicación). */
  similares?: PlantillaWeeAi[];
  onElegirSimilar?: (p: PlantillaWeeAi) => void;
  /** «Personalizar» con la cara o el cuerpo (solo videos con personas). */
  personalizar?: EstadoDePersonalizar;
}

/**
 * LA PLANTILLA A PANTALLA COMPLETA: el resultado de fondo, autor y descripción, los contadores a un lado y, abajo,
 * «Detalles» y «Recrear». Nada se reproduce solo. «Detalles» dice qué hace en lenguaje normal; el prompt completo
 * solo se ve si se abre (regla de Weë).
 */
export const DetalleDePlantilla: React.FC<Props> = ({ plantilla, onClose, onRecrear, onAbrirPublicacion, similares = [], onElegirSimilar, personalizar }) => {
  const { t, formato, locale } = useIdioma();
  const dir = useDireccion();
  const arte = ARTE_WEEAI.claro;
  const [abierto, setAbierto] = useState(false);
  const [verPrompt, setVerPrompt] = useState(false);
  const { userProfile: autor } = useUserById(plantilla?.autorId);
  if (!plantilla) return null;
  const nombre = plantilla.autorNombre || autor?.displayName || '';
  const compacto = (n: number) => formato.numero(n, { notation: 'compact', maximumFractionDigits: 1 });

  const compartir = async () => {
    if (!plantilla.postId) return;
    const ok = await compartirFueraDeWee(plantilla.postId, t('common.share'), locale).catch(() => false);
    if (!ok && Platform.OS !== 'web') await Share.share({ message: tituloDePlantilla(plantilla, t) }).catch(() => {});
  };
  const cerrar = () => {
    setAbierto(false);
    setVerPrompt(false);
    onClose();
  };
  const lateral = (icono: React.ComponentProps<typeof Ionicons>['name'], etiqueta: string, valor: string | null, onPress?: () => void) => (
    <TouchableOpacity onPress={onPress} disabled={!onPress} activeOpacity={0.7} style={styles.lateral} accessibilityRole="button" accessibilityLabel={etiqueta}>
      <Ionicons name={icono} size={scale(28)} color="#FFFFFF" />
      {valor ? <Text style={styles.lateralTexto}>{valor}</Text> : null}
    </TouchableOpacity>
  );

  return (
    <Modal visible animationType="slide" onRequestClose={cerrar} transparent={false}>
      <View style={[styles.pantalla, dir.contenedor]}>
        {plantilla.imagen ? (
          <Image source={{ uri: plantilla.imagen }} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />
        ) : (
          <LinearGradient colors={plantilla.gradiente ?? GRADIENTE_NEUTRO} style={StyleSheet.absoluteFill} />
        )}
        {/* Un velo abajo para que el texto se lea sobre cualquier imagen (contraste AA). */}
        <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.78)']} style={styles.velo} pointerEvents="none" />
        <SafeAreaView style={styles.interior} edges={['top', 'bottom']}>
          <TouchableOpacity onPress={cerrar} style={styles.volver} accessibilityRole="button" accessibilityLabel={t('common.back')}>
            <IconoDireccional name="chevron-back" size={scale(26)} color="#FFFFFF" />
          </TouchableOpacity>
          {plantilla.video ? (
            <TouchableOpacity
              onPress={plantilla.postId ? () => onAbrirPublicacion(plantilla.postId as string) : undefined}
              disabled={!plantilla.postId}
              style={styles.reproducir}
              accessibilityRole="button"
              accessibilityLabel={t('weeai.play')}
            >
              <Ionicons name="play" size={scale(30)} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}
          {plantilla.ejemplo ? (
            <View style={[styles.ejemplo, dir.alFinal(SPACING.lg)]}>
              <Text style={styles.ejemploTexto}>{t('weeai.example')}</Text>
            </View>
          ) : null}
          <View style={[styles.lados, dir.alFinal(SPACING.md)]}>
            {lateral('heart-outline', t('weeai.likesLabel'), compacto(plantilla.likes), plantilla.postId ? () => onAbrirPublicacion(plantilla.postId as string) : undefined)}
            {lateral('chatbubble-outline', t('wall.comments'), compacto(plantilla.comentarios), plantilla.postId ? () => onAbrirPublicacion(plantilla.postId as string) : undefined)}
            {plantilla.postId ? lateral('share-social-outline', t('common.share'), null, compartir) : null}
          </View>
          <View style={styles.pie}>
            <ScrollView style={styles.leyenda} contentContainerStyle={styles.leyendaInterior} showsVerticalScrollIndicator={false}>
              {nombre ? <Text style={[styles.autor, dir.texto]}>{nombre}</Text> : null}
              <Text style={[styles.texto, dir.texto]}>{tituloDePlantilla(plantilla, t)}</Text>
              {plantilla.recreaciones > 0 ? (
                <View style={[styles.etiqueta, dir.contenedor]}>
                  <Ionicons name="refresh" size={scale(14)} color="#FFFFFF" />
                  <Text style={styles.etiquetaTexto}>{t('weeai.recreations', { cantidad: formato.numero(plantilla.recreaciones) })}</Text>
                </View>
              ) : null}
            </ScrollView>
            <View style={[styles.barra, dir.contenedor]}>
              {abierto ? (
                <View style={styles.detalles}>
                  <Text style={[styles.detallesTexto, dir.texto]}>{explicacionDePlantilla(plantilla, t) || t('weeai.detailsHint')}</Text>
                  {verPrompt ? (
                    <Text style={[styles.prompt, dir.texto]} selectable>{plantilla.prompt}</Text>
                  ) : (
                    <TouchableOpacity onPress={() => setVerPrompt(true)} accessibilityRole="button" style={styles.verPrompt}>
                      <Text style={[styles.verPromptTexto, dir.texto]}>{t('weeai.showPrompt')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : null}
              {similares.length > 0 && onElegirSimilar ? (
                <View style={styles.similares}>
                  <Text style={[styles.similaresTitulo, dir.texto]} accessibilityRole="header">{t('weeai.moreLikeThis')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.similaresFila, dir.contenedor]}>
                    {similares.map((p) => (
                      <TouchableOpacity key={p.id} onPress={() => onElegirSimilar(p)} accessibilityRole="button" accessibilityLabel={tituloDePlantilla(p, t)} style={styles.similar}>
                        {p.imagen ? <Image source={{ uri: p.imagen }} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} /> : <LinearGradient colors={p.gradiente ?? GRADIENTE_NEUTRO} style={StyleSheet.absoluteFill} />}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              ) : null}
              {personalizar ? (
                <View style={styles.personalizar}>
                  <PersonalizarVideo plantilla={plantilla} estado={personalizar} />
                </View>
              ) : null}
              {/* El coste, antes de Recrear: aún sin cifra real (la da el servidor al crear el trabajo). */}
              <Text style={[styles.detallesSub, dir.texto]}>{`${t('filmmaker.cost')} · ${t('weeai.testPrice')}`}</Text>
              <View style={[styles.fila, dir.contenedor]}>
                <TouchableOpacity
                  onPress={() => setAbierto((v) => !v)}
                  style={styles.detallesBoton}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: abierto }}
                  aria-expanded={abierto}
                >
                  <Text style={[styles.detallesTitulo, dir.texto]} numberOfLines={1}>{t('weeai.details')}</Text>
                  <Text style={[styles.detallesSub, dir.texto]}>{t('weeai.detailsHint')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onRecrear(plantilla)} style={styles.recrear} accessibilityRole="button" activeOpacity={0.85}>
                  <RellenoDeDegradado colores={arte.accion} radio={999} espejo={dir.esRTL} />
                  <Ionicons name="color-wand-outline" size={scale(18)} color="#1F2937" />
                  <Text style={styles.recrearTexto} numberOfLines={1}>{t('weeai.recreate')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: '#0B1220' },
  interior: { flex: 1 },
  velo: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%' },
  volver: { width: 44, height: 44, margin: SPACING.sm, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  reproducir: { position: 'absolute', top: '38%', alignSelf: 'center', width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  ejemplo: { position: 'absolute', top: SPACING.md, backgroundColor: '#FFFFFF', borderRadius: 99, paddingHorizontal: SPACING.md, paddingVertical: 4 },
  ejemploTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: '#1F2937' },
  lados: { position: 'absolute', bottom: scale(190), alignItems: 'center', gap: SPACING.md },
  lateral: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  lateralTexto: { color: '#FFFFFF', fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, marginTop: 2, ...NUMEROS_TABULARES },
  pie: { marginTop: 'auto' },
  leyenda: { maxHeight: scale(150), marginEnd: scale(76) },
  leyendaInterior: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md, gap: 4 },
  autor: { color: '#FFFFFF', fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold },
  texto: { color: '#FFFFFF', fontSize: FONT_SIZE.base, lineHeight: scale(22) },
  etiqueta: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: RADIO_WEEAI.pastilla, paddingHorizontal: SPACING.sm + 4, paddingVertical: SPACING.xs, marginTop: SPACING.sm },
  etiquetaTexto: { color: '#FFFFFF', fontSize: FONT_SIZE.sm, ...NUMEROS_TABULARES },
  barra: { backgroundColor: '#161616', borderTopLeftRadius: RADIO_WEEAI.hoja, borderTopRightRadius: RADIO_WEEAI.hoja, paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.md, gap: SPACING.sm },
  detalles: { gap: SPACING.sm, paddingBottom: SPACING.xs },
  detallesTexto: { color: '#A3A3A3', fontSize: FONT_SIZE.base, lineHeight: scale(21) },
  verPrompt: { minHeight: 44, justifyContent: 'center' },
  verPromptTexto: { color: '#FAFAFA', fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, textDecorationLine: 'underline' },
  prompt: { color: '#FAFAFA', fontSize: FONT_SIZE.sm, lineHeight: scale(19), backgroundColor: '#212121', borderRadius: RADIO_WEEAI.control, padding: SPACING.sm + 4 },
  similares: { gap: SPACING.sm },
  personalizar: { gap: SPACING.sm },
  similaresTitulo: { color: '#FAFAFA', fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold },
  similaresFila: { flexDirection: 'row', gap: SPACING.sm },
  similar: { width: 64, height: 64, borderRadius: RADIO_WEEAI.control, overflow: 'hidden', backgroundColor: '#212121' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  detallesBoton: { flex: 1, minWidth: 0, minHeight: 44, justifyContent: 'center' },
  detallesTitulo: { color: '#FAFAFA', fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold },
  detallesSub: { color: '#A3A3A3', fontSize: FONT_SIZE.sm, lineHeight: scale(18) },
  recrear: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 48, paddingHorizontal: SPACING.lg, borderRadius: 99, overflow: 'hidden', flexShrink: 0 },
  recrearTexto: { color: '#1F2937', fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold },
});
