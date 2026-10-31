import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useIdioma } from '../../contexts/IdiomaContext';
import { Boton, ChipDeEstado, Deslizador, Nota, Tarjeta, TituloDeBloque } from './piezas';
import { CancionDeMusic } from '../../utils/musicModel';
import { capacidadUsable } from '../../constants/musicCapabilities';
import { SPACING, FONT_SIZE } from '../../constants/design';
import { scale } from '../../utils/scale';

const BANDAS = ['low', 'mid', 'high'] as const;
const EFECTOS = ['reverb', 'delay', 'compressor', 'limiter'] as const;
/** Rango del control de ganancia, en dB (ajuste de la interfaz, no un procesado). */
const RANGO_DB = 12;

interface Props { cancion: CancionDeMusic }

/**
 * ECUALIZADOR Y EFECTOS — COMPONENTES + CONTRATO + ESTADO DE DISPONIBILIDAD.
 *
 * Los deslizadores solo ajustan el VALOR que se entregaría a la operación `music.process` (ganancia por banda en dB,
 * efectos activados). No hay cadena de procesado de audio detrás —la capacidad es `pendiente`— y por eso:
 *  · no suena nada distinto cuando se mueven,
 *  · «Aplicar» está cerrado,
 *  · «Comparar original / modificada» está cerrado porque no existe audio procesado,
 *  · y con una canción de ejemplo o sin audio todo el bloque se declara no disponible.
 * Es deliberado: no se simula sonido.
 */
const EcualizadorYEfectos: React.FC<Props> = ({ cancion }) => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const [bandas, setBandas] = useState<Record<string, number>>({ low: 0.5, mid: 0.5, high: 0.5 });
  const [efectos, setEfectos] = useState<Record<string, boolean>>({});
  const usable = capacidadUsable('audioProcessing') && !!cancion.audioUrl;
  const db = (v: number) => Math.round((v - 0.5) * 2 * RANGO_DB);

  return (
    <View style={s.raiz}>
      <View style={s.fila}>
        <TituloDeBloque>{t('music.eqTitle')}</TituloDeBloque>
        <ChipDeEstado estado={cancion.audioUrl ? 'pendienteIntegracion' : 'resultadoNoDisponible'} />
      </View>
      <Nota>{t('music.eqNote')}</Nota>
      <Tarjeta>
        {BANDAS.map((b) => (
          <View key={b} style={s.fila}>
            <Text style={[s.nombre, { color: theme.colors.text }]}>{t(`music.eqBand_${b}`)}</Text>
            <Deslizador
              valor={bandas[b]}
              onCambiar={(v) => setBandas((x) => ({ ...x, [b]: v }))}
              etiqueta={t(`music.eqBand_${b}`)}
              textoValor={t('music.eqDb', { valor: formato.numero(db(bandas[b]), { signDisplay: 'exceptZero' }) })}
            />
            <Text style={[s.valor, { color: theme.colors.textSecondary }]}>{t('music.eqDb', { valor: formato.numero(db(bandas[b]), { signDisplay: 'exceptZero' }) })}</Text>
          </View>
        ))}
        <Boton texto={t('music.eqReset')} icono="refresh-outline" onPress={() => setBandas({ low: 0.5, mid: 0.5, high: 0.5 })} />
      </Tarjeta>

      <TituloDeBloque>{t('music.fxTitle')}</TituloDeBloque>
      <Tarjeta>
        {EFECTOS.map((e) => (
          <View key={e} style={s.fila}>
            <Text style={[s.nombre, { color: theme.colors.text, flex: 1 }]}>{t(`music.fx_${e}`)}</Text>
            <Switch value={!!efectos[e]} onValueChange={(v) => setEfectos((x) => ({ ...x, [e]: v }))} accessibilityLabel={t(`music.fx_${e}`)} trackColor={{ true: theme.colors.accent, false: theme.colors.border }} />
          </View>
        ))}
      </Tarjeta>

      <View style={s.fila}>
        <Boton texto={t('music.applyProcessing')} icono="checkmark-outline" principal desactivado={!usable} motivo={t('music.statePending')} />
        <Boton texto={t('music.compareAB')} icono="swap-horizontal-outline" desactivado motivo={t('music.noProcessedAudio')} />
      </View>
      <Nota>{t('music.processingNote')}</Nota>
    </View>
  );
};

const s = StyleSheet.create({
  raiz: { gap: SPACING.md },
  fila: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flexWrap: 'wrap' },
  nombre: { fontSize: FONT_SIZE.base, fontWeight: '600', minWidth: scale(80) },
  valor: { fontSize: FONT_SIZE.xs, minWidth: scale(48), textAlign: 'right' },
});

export default EcualizadorYEfectos;
