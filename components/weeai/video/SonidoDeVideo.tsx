import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useT } from '../../../contexts/IdiomaContext';
import { useDireccion } from '../../../hooks/useDireccion';
import { useEstiloWeeAi } from '../../../hooks/useEstiloWeeAi';
import { ESPACIO_WEEAI as SP, RADIO_WEEAI, textoWeeAi } from '../../../constants/estiloWeeAi';

/**
 * «SONIDO» DE UN VIDEO: lo GENERA LA IA. No hay canciones comerciales, ni artistas, ni buscador de pistas, ni «subir mi canción».
 *
 * «Automático» es lo que ocurre hoy y es real: el motor de video (Seedance) genera el audio por defecto (`generate_audio` = true en
 * su adaptador). Las tres opciones de una palabra —«Música», «Efectos», «Voz»— son la interfaz del futuro y NO se conectan todavía:
 * el flujo actual no puede enviar esa elección ni hay API de efectos o de música; la voz de ElevenLabs (`voice.tts`) existe en el
 * engine pero no se encadena a un video. Por eso salen desactivadas y dicen «Próximamente». Nada se simula.
 */
const SonidoDeVideo: React.FC = () => {
  const c = useEstiloWeeAi();
  const t = useT();
  const dir = useDireccion();
  const opciones = [t('filmmaker.audioMusic'), t('filmmaker.audioSfx'), t('filmmaker.audioVoice')];
  return (
    <View style={styles.caja}>
      <Text numberOfLines={1} style={[textoWeeAi('enfasis', '600'), dir.texto, { color: c.tinta }]} accessibilityRole="header">{t('weeai.soundTitle')}</Text>
      <View style={[styles.fila, dir.contenedor]}>
        <View accessibilityRole="switch" accessibilityState={{ checked: true }} accessibilityLabel={t('weeai.modelAuto')} style={[styles.chip, { backgroundColor: c.seleccion }]}>
          <Text numberOfLines={1} style={[textoWeeAi('nota', '600'), { color: c.sobreSeleccion }]}>{t('weeai.modelAuto')}</Text>
        </View>
        {opciones.map((o) => (
          <View key={o} accessibilityRole="button" accessibilityState={{ disabled: true }} accessibilityLabel={`${o}`} style={[styles.chip, { backgroundColor: c.superficie, opacity: 0.5 }]}>
            <Text numberOfLines={1} style={[textoWeeAi('nota', '500'), { color: c.tinta }]}>{o}</Text>
          </View>
        ))}
      </View>
      <Text style={[textoWeeAi('nota'), dir.texto, { color: c.tintaSecundaria }]}>{`${t('weeai.soundHelp')} · ${t('weeai.modelSoon')}`}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  caja: { gap: SP.sm },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm },
  chip: { minHeight: 44, borderRadius: RADIO_WEEAI.pastilla, paddingHorizontal: SP.md, alignItems: 'center', justifyContent: 'center' },
});

export default SonidoDeVideo;
