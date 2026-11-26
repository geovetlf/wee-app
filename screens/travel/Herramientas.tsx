import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import MarcoDeTravel from '../../components/travel/MarcoDeTravel';
import { AvisoDemo, Boton, Chip, EstadoError, FilaDeChips, Fila, Tarjeta, TituloDeSeccion } from '../../components/travel/Piezas';
import { SelectorIdioma } from '../../components/travel/Selectores';
import CajaDePrompt from '../../components/creator/CajaDePrompt';
import { TRAVEL } from '../../components/travel/tema';
import { useIdioma } from '../../contexts/IdiomaContext';
import { nombreDelIdioma } from '../../i18n/formato';
import { useTextosDeTravel } from '../../hooks/useTextosDeTravel';
import { IDIOMAS_DEL_TRADUCTOR, RESULTADOS_DE_VISION } from '../../constants/travelDemo';
import { useTravelNav } from './rutas';

/*
 * 5 · ASISTENTE DE VIAJE — voz, reconocimiento visual y traductor. Las tres son DEMO visuales: no se graba audio, no
 * se analiza ninguna foto y no se traduce nada aquí. Lo real se le pide a Weë Brain, por la conversación de siempre.
 */

type Icono = React.ComponentProps<typeof Ionicons>['name'];
type EstadoDeVoz = 'escuchando' | 'procesando' | 'hablando' | 'pausa';
const VOZ: Record<EstadoDeVoz, { icono: Icono; titulo: string; texto: string; escala: number }> = {
  escuchando: { icono: 'mic', titulo: 'travel.voiceListening', texto: 'travel.voiceListeningText', escala: 1.12 },
  procesando: { icono: 'sync', titulo: 'travel.voiceProcessing', texto: 'travel.voiceProcessingText', escala: 1 },
  hablando: { icono: 'volume-high', titulo: 'travel.voiceSpeaking', texto: 'travel.voiceSpeakingText', escala: 1.06 },
  pausa: { icono: 'pause', titulo: 'travel.voicePaused', texto: 'travel.voicePausedText', escala: 0.94 },
};

export const VozScreen: React.FC = () => {
  const x = useTextosDeTravel();
  const { preguntarABrain } = useTravelNav();
  const [estado, setEstado] = useState<EstadoDeVoz>('escuchando');
  const v = VOZ[estado];
  return (
    <MarcoDeTravel titulo={x.t('travel.voice')} subtitulo={x.t('travel.voiceSub')} icono="mic-outline" demo sinBrain>
      <AvisoDemo texto={x.t('travel.demoVoiceNote')} />
      <View style={h.vozCentro}>
        <View style={[h.halo, { transform: [{ scale: v.escala }] }]}>
          <View style={h.circulo}><Ionicons name={v.icono} size={44} color="#FFFFFF" /></View>
        </View>
        <Text style={h.vozTitulo} accessibilityLiveRegion="polite">{x.t(v.titulo)}</Text>
        <Text style={h.texto}>{x.t(v.texto)}</Text>
      </View>
      <FilaDeChips>
        {(Object.keys(VOZ) as EstadoDeVoz[]).map((k) => <Chip key={k} texto={x.t(VOZ[k].titulo)} icono={VOZ[k].icono} activo={estado === k} onPress={() => setEstado(k)} />)}
      </FilaDeChips>
      <Boton texto={x.t('travel.writeToBrainInstead')} icono="sparkles" variante="dorado" onPress={() => preguntarABrain()} />
    </MarcoDeTravel>
  );
};

export const VisionScreen: React.FC<{ id?: string }> = ({ id }) => {
  const x = useTextosDeTravel();
  const { preguntarABrain } = useTravelNav();
  const [foto, setFoto] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const elegir = async (camara: boolean) => {
    setError(false);
    try {
      if (camara) {
        const permiso = await ImagePicker.requestCameraPermissionsAsync();
        if (!permiso.granted) { setError(true); return; }
      }
      const r = camara
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (!r.canceled && r.assets?.[0]?.uri) setFoto(r.assets[0].uri);
    } catch {
      setError(true);
    }
  };
  return (
    <MarcoDeTravel titulo={x.t('travel.visual')} subtitulo={x.t('travel.visualSub')} icono="scan-outline" demo sinBrain>
      <AvisoDemo texto={x.t('travel.demoVisionNote')} />
      <View style={h.acciones}>
        <Boton texto={x.t('travel.takePhoto')} icono="camera-outline" onPress={() => elegir(true)} estilo={h.flex} variante={id === 'camara' ? 'morado' : 'suave'} />
        <Boton texto={x.t('travel.attachImage')} icono="image-outline" variante={id === 'camara' ? 'suave' : 'morado'} onPress={() => elegir(false)} estilo={h.flex} />
      </View>
      {error && <EstadoError texto={x.t('travel.photoError')} onReintentar={() => elegir(false)} />}
      {!!foto && (
        <>
          <Image source={{ uri: foto }} style={h.foto} contentFit="cover" accessibilityLabel={x.t('travel.yourPhoto')} />
          <TituloDeSeccion titulo={x.t('travel.visionResults')} subtitulo={x.t('travel.visionResultsSub')} />
          {RESULTADOS_DE_VISION.map((r) => <Fila key={r.id} icono={r.icono} titulo={x.t(r.titulo)} subtitulo={x.t(r.texto)} />)}
          <Boton texto={x.t('travel.askBrainPhoto')} icono="sparkles" variante="dorado" onPress={() => preguntarABrain(x.t('travel.brainCtxPhoto'), foto)} />
        </>
      )}
    </MarcoDeTravel>
  );
};

export const TraductorScreen: React.FC = () => {
  const x = useTextosDeTravel();
  const { idioma } = useIdioma();
  const { ir, preguntarABrain } = useTravelNav();
  const [modo, setModo] = useState<'texto' | 'camara' | 'conversacion'>('texto');
  const [origen, setOrigen] = useState<string>(IDIOMAS_DEL_TRADUCTOR.includes(idioma) ? idioma : 'es');
  const [destino, setDestino] = useState('ja');
  const [texto, setTexto] = useState('');
  const nombre = (c: string) => nombreDelIdioma(c, x.locale);
  const pedir = () => { if (texto.trim()) preguntarABrain(x.t('travel.brainCtxTranslate', { desde: nombre(origen), hacia: nombre(destino), texto: texto.trim() })); };
  return (
    <MarcoDeTravel titulo={x.t('travel.translator')} subtitulo={x.t('travel.translatorSub')} icono="language-outline" sinBrain>
      <FilaDeChips>
        <Chip texto={x.t('travel.trText')} icono="text-outline" activo={modo === 'texto'} onPress={() => setModo('texto')} />
        <Chip texto={x.t('travel.trCamera')} icono="camera-outline" activo={modo === 'camara'} onPress={() => setModo('camara')} />
        <Chip texto={x.t('travel.trConversation')} icono="people-outline" activo={modo === 'conversacion'} onPress={() => setModo('conversacion')} />
      </FilaDeChips>
      <Tarjeta>
        <Text style={h.etiqueta}>{x.t('travel.fromLanguage')}</Text>
        <SelectorIdioma codigos={IDIOMAS_DEL_TRADUCTOR} valor={origen} onCambiar={setOrigen} />
        <TouchableOpacity onPress={() => { setOrigen(destino); setDestino(origen); }} style={h.cambiar} accessibilityRole="button" accessibilityLabel={x.t('travel.swapLanguages')}>
          <Ionicons name="swap-vertical" size={20} color={TRAVEL.morado} />
        </TouchableOpacity>
        <Text style={h.etiqueta}>{x.t('travel.toLanguage')}</Text>
        <SelectorIdioma codigos={IDIOMAS_DEL_TRADUCTOR} valor={destino} onCambiar={setDestino} />
      </Tarjeta>
      {modo === 'texto' && (
        <>
          <CajaDePrompt valor={texto} onCambiar={setTexto} onEnviar={pedir} etiquetaEnviar={x.t('travel.translateWithBrain')} placeholder={x.t('travel.translatePlaceholder', { idioma: nombre(origen) })} />
          <Text style={h.texto}>{x.t('travel.translatorBrainNote')}</Text>
          <Boton texto={x.t('travel.copyShare')} icono="share-outline" variante="linea" pequeno desactivado={!texto.trim()} onPress={() => Share.share({ message: texto.trim() }).catch(() => undefined)} />
        </>
      )}
      {modo === 'camara' && (
        <Tarjeta>
          <AvisoDemo texto={x.t('travel.demoTranslatorCamera')} />
          <Boton texto={x.t('travel.openCamera')} icono="camera-outline" onPress={() => ir('vision', 'camara')} />
        </Tarjeta>
      )}
      {modo === 'conversacion' && (
        <Tarjeta>
          <AvisoDemo texto={x.t('travel.demoConversation')} />
          <View style={h.conv}>
            <View style={[h.burbuja, { backgroundColor: TRAVEL.morado, alignSelf: 'flex-start' }]}>
              <Text style={h.idiomaBurbuja}>{nombre(origen)}</Text>
              <Text style={[h.burbujaTexto, { color: '#FFFFFF' }]}>{x.t('travel.convSample1')}</Text>
            </View>
            <View style={[h.burbuja, { backgroundColor: TRAVEL.lilaSuave, alignSelf: 'flex-end' }]}>
              <Text style={[h.idiomaBurbuja, { color: TRAVEL.morado }]}>{nombre(destino)}</Text>
              <Text style={h.burbujaTexto}>{x.t('travel.convSample2')}</Text>
            </View>
          </View>
          <Boton texto={x.t('travel.tapToSpeak')} icono="mic-outline" onPress={() => ir('voz')} />
        </Tarjeta>
      )}
    </MarcoDeTravel>
  );
};

const h = StyleSheet.create({
  flex: { flex: 1 },
  acciones: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  texto: { fontSize: 13, lineHeight: 19, color: TRAVEL.texto, textAlign: 'center' },
  vozCentro: { alignItems: 'center', gap: 12, paddingVertical: 20 },
  halo: { width: 170, height: 170, borderRadius: 85, backgroundColor: TRAVEL.lila, alignItems: 'center', justifyContent: 'center' },
  circulo: { width: 112, height: 112, borderRadius: 56, backgroundColor: TRAVEL.morado, alignItems: 'center', justifyContent: 'center' },
  vozTitulo: { fontSize: 20, fontWeight: '800', color: TRAVEL.tinta },
  foto: { width: '100%', height: 240, borderRadius: 20 },
  etiqueta: { fontSize: 13, fontWeight: '800', color: TRAVEL.tinta },
  cambiar: { alignSelf: 'center', width: 40, height: 40, borderRadius: 20, backgroundColor: TRAVEL.lilaSuave, alignItems: 'center', justifyContent: 'center' },
  conv: { gap: 10 },
  burbuja: { maxWidth: '86%', padding: 12, borderRadius: 18, gap: 4 },
  idiomaBurbuja: { fontSize: 11, fontWeight: '800', color: '#EDE3FF' },
  burbujaTexto: { fontSize: 14, lineHeight: 20, color: TRAVEL.tinta },
});
