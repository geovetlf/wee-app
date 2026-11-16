import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import IconoDireccional from '../IconoDireccional';
import { RellenoDeDegradado } from '../GradienteDeMarca';
import { SelectorDeModelo } from './SelectorDeModelo';
import SonidoDeVideo from './video/SonidoDeVideo';
import PersonalizarVideo, { EstadoDePersonalizar } from './video/PersonalizarVideo';
import { MODELO_AUTOMATICO } from '../../constants/modelosWeeAi';
import { useEstiloWeeAi } from '../../hooks/useEstiloWeeAi';
import { useIdioma } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { PlantillaWeeAi } from '../../constants/plantillasWeeAi';
import { ARTE_WEEAI } from '../../constants/marca';
import { ESPACIO_WEEAI as SPACING, RADIO_WEEAI, FONT_SIZE_WEEAI as FONT_SIZE, FONT_WEIGHT_WEEAI as FONT_WEIGHT, NUMEROS_TABULARES } from '../../constants/estiloWeeAi';
import { scale } from '../../utils/scale';

interface Props {
  plantilla: PlantillaWeeAi | null;
  onClose: () => void;
  /** «Generar»: abre el flujo de creación de siempre con el prompt de la plantilla y la duración elegida. */
  onGenerar: (p: PlantillaWeeAi, duracion?: number) => void;
  personalizar?: EstadoDePersonalizar;
}

const RADIO_DE_ESCENA = RADIO_WEEAI.tarjeta;

/**
 * «TU VERSIÓN»: una MAQUETA de cómo quedará, antes de generar. Es solo interfaz y se pinta con los datos de la propia
 * plantilla: no llama a ninguna IA, no cobra y no es el resultado (por eso dice «Así quedará», no «tu video»). Lo único
 * que se elige aquí es lo simple —la foto, que el flujo de creación pide y sube como siempre, y la duración—; solo
 * «Generar» abre ese flujo. Ghost (su motor) no está integrado: esto es la pantalla, no el motor.
 */
export const VistaPreviaDePlantilla: React.FC<Props> = ({ plantilla, onClose, onGenerar, personalizar }) => {
  const c = useEstiloWeeAi();
  const { t, formato } = useIdioma();
  const dir = useDireccion();
  const arte = ARTE_WEEAI.claro;
  const [duracion, setDuracion] = useState<number | undefined>(undefined);
  /* El modelo es solo una preferencia de interfaz: no se envía a ningún sitio (el router decide). */
  const [modelo, setModelo] = useState<string>(MODELO_AUTOMATICO);
  /* «Ajustes avanzados»: plegados por defecto. Solo lo que el flujo ya admite (duración) y el selector de modelo. */
  const [avanzado, setAvanzado] = useState(false);
  if (!plantilla) return null;
  const elegida = duracion ?? plantilla.duraciones[0];
  const esVideo = plantilla.categoria === 'video';
  const segundos = (n: number) => formato.numero(n, { style: 'unit', unit: 'second', unitDisplay: 'narrow' });
  const escenas = plantilla.escenas.length > 0 ? plantilla.escenas : [null];
  /* La escena «tuya» —la que lleva a la persona— es la del medio; con una sola, esa. */
  const laTuya = Math.floor((escenas.length - 1) / 2);

  const fila = (icono: React.ComponentProps<typeof Ionicons>['name'], etiqueta: string, valor: React.ReactNode, onPress?: () => void) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
      accessibilityRole={onPress ? 'button' : undefined}
      style={[styles.opcion, dir.contenedor, { backgroundColor: c.superficie }]}
    >
      <Ionicons name={icono} size={scale(20)} color={c.tinta} />
      <Text style={[styles.opcionEtiqueta, dir.texto, { color: c.tinta }]} numberOfLines={2}>{etiqueta}</Text>
      {valor}
    </TouchableOpacity>
  );

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} transparent={false}>
      <SafeAreaView style={[styles.pantalla, dir.contenedor, { backgroundColor: c.fondo }]} edges={['top', 'bottom']}>
        <View style={[styles.cabecera, dir.contenedor]}>
          <TouchableOpacity onPress={onClose} style={styles.volver} accessibilityRole="button" accessibilityLabel={t('common.back')}>
            <IconoDireccional name="chevron-back" size={scale(26)} color={c.tinta} />
          </TouchableOpacity>
          <Text style={[styles.titulo, dir.texto, { color: c.tinta }]} numberOfLines={1} accessibilityRole="header">{t('weeai.previewTitle')}</Text>
          {/* La maqueta no gasta nada, y eso sí es cierto: no llama a IA ni cobra. */}
          <View style={[styles.cero, { backgroundColor: c.superficie }]}>
            <Text style={[styles.ceroTexto, { color: c.tinta }]}>{`${formato.numero(0)} ${t('credits.title')}`}</Text>
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.cuerpo}>
          <Text style={[styles.intro, dir.texto, { color: c.tintaSecundaria }]}>{t('weeai.previewIntro')}</Text>
          {/* Las escenas: rótulos de la propia plantilla. Sin escenas, una sola con la miniatura. */}
          <View style={[styles.escenas, dir.contenedor]}>
            {escenas.map((rotulo, i) => {
              const mia = i === laTuya;
              return (
                <View key={i} style={[styles.escena, { backgroundColor: mia ? c.superficieAlta : c.superficie }]}>
                  {rotulo === null && plantilla.imagen ? (
                    <Image source={{ uri: plantilla.imagen }} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />
                  ) : null}
                  {/* Sobre la miniatura el rótulo lleva su propio fondo oscuro: se lee con cualquier imagen. */}
                  <Text style={[styles.escenaNumero, dir.texto, rotulo === null && plantilla.imagen ? styles.sobreImagen : { color: c.tintaSecundaria }]}>{t('weeai.scene', { numero: formato.numero(i + 1) })}</Text>
                  {rotulo ? <Text style={[styles.escenaRotulo, dir.texto, { color: c.tinta }]}>{rotulo}</Text> : null}
                </View>
              );
            })}
          </View>
          {personalizar ? <PersonalizarVideo plantilla={plantilla} estado={personalizar} /> : null}
          <View style={styles.opciones}>
            {fila('person-circle-outline', t('travel.yourPhoto'), <Text style={[styles.valorAccion, { color: c.tinta, textDecorationLine: 'underline' }]}>{t('weeai.choose')}</Text>, () => onGenerar(plantilla, elegida))}
            {plantilla.elementoClave ? fila('shirt-outline', t('weeai.keyItem'), <Text style={[styles.valor, dir.texto, { color: c.tintaSecundaria }]}>{plantilla.elementoClave}</Text>) : null}
            <TouchableOpacity
              onPress={() => setAvanzado((v) => !v)}
              accessibilityRole="button"
              accessibilityState={{ expanded: avanzado }}
              aria-expanded={avanzado}
              style={[styles.avanzado, dir.contenedor]}
            >
              <Text style={[styles.avanzadoTexto, dir.texto, { color: c.tinta }]}>{t(avanzado ? 'music.advancedHide' : 'music.advancedShow')}</Text>
              <Ionicons name={avanzado ? 'chevron-up' : 'chevron-down'} size={scale(18)} color={c.tintaSecundaria} />
            </TouchableOpacity>
            {avanzado && plantilla.duraciones.length > 0 ? fila('time-outline', t('filmmaker.duration'), (
              <View style={[styles.duraciones, dir.contenedor]}>
                {plantilla.duraciones.map((d) => {
                  const puesta = d === elegida;
                  return (
                    <TouchableOpacity
                      key={d}
                      onPress={() => setDuracion(d)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: puesta }}
                      style={[styles.duracion, { backgroundColor: puesta ? c.seleccion : c.superficieAlta }]}
                    >
                      <Text style={[styles.duracionTexto, { color: puesta ? c.sobreSeleccion : c.tinta, fontWeight: puesta ? FONT_WEIGHT.bold : FONT_WEIGHT.medium }]}>{segundos(d)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )) : null}
            {avanzado ? fila('sparkles-outline', t('weeai.modelTitle'), <SelectorDeModelo tipo={esVideo ? 'video' : 'imagen'} valor={modelo} onChange={setModelo} />) : null}
            {/* Sonido: lo genera la IA (Automático); Música, Efectos y Voz, «Próximamente». */}
            {esVideo ? <SonidoDeVideo /> : null}
          </View>
          {/* El coste: aún no hay cifra. El presupuesto real lo da el servidor al crear el trabajo; aquí solo se dice que hay un precio de prueba. */}
          <View style={[styles.coste, dir.contenedor]}>
            <Text style={[styles.costeEtiqueta, dir.texto, { color: c.tinta }]}>{t('filmmaker.cost')}</Text>
            <Text style={[styles.costeValor, dir.texto, { color: c.tintaSecundaria }]}>{t('weeai.testPrice')}</Text>
          </View>
          <Text style={[styles.nota, dir.texto, { color: c.tintaSecundaria }]}>{t('weeai.notChargedYet')}</Text>
          <TouchableOpacity onPress={() => onGenerar(plantilla, elegida)} style={styles.generar} accessibilityRole="button" activeOpacity={0.85}>
            <RellenoDeDegradado colores={arte.accion} radio={14} espejo={dir.esRTL} />
            <Text style={styles.generarTexto}>{t(esVideo ? 'weeai.generateVideo' : 'weeai.generate')}</Text>
          </TouchableOpacity>
          <Text style={[styles.nota, dir.texto, { color: c.tintaSecundaria }]}>{t('weeai.previewNote')}</Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.sm, minHeight: 56 },
  volver: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titulo: { flex: 1, fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold },
  cero: { borderRadius: 99, paddingHorizontal: SPACING.sm + 2, paddingVertical: 4 },
  ceroTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, ...NUMEROS_TABULARES },
  cuerpo: { padding: SPACING.lg, gap: SPACING.md },
  intro: { fontSize: FONT_SIZE.base, lineHeight: scale(21) },
  escenas: { flexDirection: 'row', gap: SPACING.sm },
  escena: { flex: 1, minWidth: 0, minHeight: scale(104), borderRadius: RADIO_DE_ESCENA, padding: SPACING.sm, justifyContent: 'space-between', overflow: 'hidden' },
  escenaNumero: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold },
  sobreImagen: { alignSelf: 'flex-start', color: '#FFFFFF', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  escenaRotulo: { fontSize: FONT_SIZE.sm, lineHeight: scale(18) },
  opciones: { gap: SPACING.sm },
  opcion: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, minHeight: 48, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIO_DE_ESCENA },
  opcionEtiqueta: { flex: 1, minWidth: 0, fontSize: FONT_SIZE.base },
  valor: { fontSize: FONT_SIZE.base, flexShrink: 1 },
  valorAccion: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold },
  avanzado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, paddingHorizontal: SPACING.xs },
  avanzadoTexto: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold, flex: 1 },
  duraciones: { flexDirection: 'row', gap: SPACING.xs },
  duracion: { minWidth: 44, minHeight: 36, borderRadius: 99, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.sm },
  duracionTexto: { fontSize: FONT_SIZE.sm },
  coste: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.md, paddingTop: SPACING.md },
  costeEtiqueta: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold },
  costeValor: { flex: 1, fontSize: FONT_SIZE.base },
  generar: { minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', paddingHorizontal: SPACING.lg },
  generarTexto: { color: '#1F2937', fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold },
  nota: { fontSize: FONT_SIZE.sm, lineHeight: scale(19) },
});
