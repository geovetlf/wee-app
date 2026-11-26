import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useIdioma } from '../../contexts/IdiomaContext';
import CajaDePrompt from '../creator/CajaDePrompt';
import { Boton, Chip, ChipDeEstado, Deslizador, Nota, Tarjeta, TituloDeBloque } from './piezas';
import { CancionDeMusic, PistaDeCancion, TIPOS_DE_INSTRUMENTO, modoDeMezcla } from '../../utils/musicModel';
import { capacidadUsable } from '../../constants/musicCapabilities';
import { SPACING, FONT_SIZE } from '../../constants/design';
import { scale } from '../../utils/scale';

interface Props {
  cancion: CancionDeMusic;
  onPistas: (p: PistaDeCancion[]) => void;
}

/**
 * EDITOR DE INSTRUMENTOS Y MEZCLA.
 *
 * Dos mundos, y la pantalla nunca los confunde:
 *  · PISTAS REALES (hay `urlStem` por pista): volumen, silenciar, solo y restablecer sobre la mezcla de reproducción
 *    (ganancia por pista en el dispositivo; no regenera nada).
 *  · SOLO ESTÉREO (hoy lo único posible): los instrumentos son una DESCRIPCIÓN de la canción, no canales. Se listan sin
 *    controles de volumen y se explica por qué; para mezclar por pista hay que pedir la separación en pistas.
 * Separado de todo ello, las INSTRUCCIONES en lenguaje natural (añadir/quitar un instrumento) son otra operación —de IA— y
 * quedan solo preparadas: `music.editSection` no está conectada. «Aplicar» está cerrado y nada se simula.
 */
const EditorDeInstrumentos: React.FC<Props> = ({ cancion, onPistas }) => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const [texto, setTexto] = useState('');
  const [preparadas, setPreparadas] = useState<string[]>([]);
  const modo = modoDeMezcla(cancion);
  const usable = capacidadUsable('instrumentEdit');
  const cambiar = (id: string, parche: Partial<PistaDeCancion>) => onPistas(cancion.pistas.map((p) => (p.id === id ? { ...p, ...parche } : p)));

  return (
    <View style={s.raiz}>
      <TituloDeBloque>{t('music.instrumentsTitle')}</TituloDeBloque>

      {modo === 'pistasReales' ? (
        <Tarjeta>
          {cancion.esEjemplo && <Nota>{t('music.mixExampleNote')}</Nota>}
          {cancion.pistas.filter((p) => !!p.urlStem).map((p) => (
            <View key={p.id} style={s.pista}>
              <Text style={[s.nombre, { color: theme.colors.text }]}>{t(`music.instr_${p.tipo}`)}</Text>
              <Deslizador
                valor={p.volumen}
                onCambiar={(v) => cambiar(p.id, { volumen: v })}
                etiqueta={t('music.trackVolume', { instrumento: t(`music.instr_${p.tipo}`) })}
                textoValor={formato.porcentaje(p.volumen)}
                desactivado={p.silenciada}
              />
              <Chip texto={t('music.mute')} activo={p.silenciada} onPress={() => cambiar(p.id, { silenciada: !p.silenciada })} />
              <Chip texto={t('music.solo')} activo={p.solo} onPress={() => cambiar(p.id, { solo: !p.solo })} />
            </View>
          ))}
          <Boton texto={t('music.resetMix')} icono="refresh-outline" onPress={() => onPistas(cancion.pistas.map((p) => ({ ...p, volumen: 0.8, silenciada: false, solo: false })))} />
        </Tarjeta>
      ) : (
        <Tarjeta>
          <Nota fuerte>{t('music.stereoOnlyTitle')}</Nota>
          <Nota>{t('music.stereoOnlyBody')}</Nota>
          {cancion.pistas.length > 0 && (
            <View style={s.chips}>
              {cancion.pistas.map((p) => <Chip key={p.id} texto={t(`music.instr_${p.tipo}`)} desactivado />)}
            </View>
          )}
          <Boton texto={t('music.requestStems')} icono="git-branch-outline" desactivado motivo={t('music.statePending')} />
        </Tarjeta>
      )}

      <Tarjeta>
        <View style={s.chips}>
          <TituloDeBloque>{t('music.aiInstructionsTitle')}</TituloDeBloque>
          <ChipDeEstado estado={usable ? 'preparado' : 'pendienteIntegracion'} />
        </View>
        <Nota>{t('music.aiInstructionsNote')}</Nota>
        <View style={s.chips}>
          {TIPOS_DE_INSTRUMENTO.filter((x) => x !== 'other').map((x) => (
            <Chip key={x} texto={t('music.addInstrument', { instrumento: t(`music.instr_${x}`) })} onPress={() => setPreparadas((a) => [...a, t('music.addInstrument', { instrumento: t(`music.instr_${x}`) })])} />
          ))}
        </View>
        <CajaDePrompt valor={texto} onCambiar={setTexto} onEnviar={() => { if (texto.trim()) { setPreparadas((a) => [...a, texto.trim()]); setTexto(''); } }} etiquetaEnviar={t('music.sectionPrepare')} placeholder={t('music.instrumentInstructionHint')} />
        {preparadas.length > 0 && (
          <View accessibilityLiveRegion="polite" style={{ gap: 2 }}>
            {preparadas.map((p, i) => <Text key={i} style={[s.tiempo, { color: theme.colors.textSecondary }]}>{p}</Text>)}
            <Nota>{t('music.preparedNote')}</Nota>
          </View>
        )}
        <Boton texto={t('music.applyChanges')} icono="checkmark-outline" principal desactivado motivo={t('music.statePending')} />
      </Tarjeta>
    </View>
  );
};

const s = StyleSheet.create({
  raiz: { gap: SPACING.md },
  pista: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flexWrap: 'wrap', minHeight: scale(48) },
  nombre: { fontSize: FONT_SIZE.base, fontWeight: '600', minWidth: scale(90) },
  tiempo: { fontSize: FONT_SIZE.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, alignItems: 'center' },
});

export default EditorDeInstrumentos;
