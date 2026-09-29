import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useIdioma } from '../../../contexts/IdiomaContext';
import { Aviso, BotonPequeno } from './ProductionPiezas';
import type { LoteDeTomas } from '../../../hooks/useLoteDeTomas';
import { CALIDADES_DE_TOMA } from '../../../utils/controladorDeToma';
import type { RechazoDeToma, UnidadDelLote } from '../../../utils/controladorDeToma';
import { buscarEscena, buscarPlano } from '../../../services/filmmaker/dominio';
import type { FilmmakerProduction } from '../../../services/filmmaker/dominio';
import { CLAVE_DE_CALIDAD, fraseDelRechazoDeToma } from '../../../utils/mensajesDeFilmmaker';
import { confirmAction } from '../../../utils/notify';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, OPACITY } from '../../../constants/design';

const isWeb = Platform.OS === 'web';

/**
 * GENERAR LA PRODUCCIÓN ENTERA (Filmmaker Engine, Fase 29: el lote de la Fase 6, en Weë AI Director).
 *
 * Aquí había un «Generar» apagado y un coste «pendiente de cotización», y el motor ya sabía generar varias unidades
 * a la vez. Ahora se elige la calidad —la de todas—, se MIRA qué pasaría con cada unidad —se genera y por cuánto, ya
 * tiene su vídeo, tiene una toma en marcha, o no se puede y por qué, con la frase de la toma suelta— y el total
 * contra el saldo; y solo entonces se genera, preguntando antes con el total delante. Solo pinta lo que dice el lote
 * (`hooks/useLoteDeTomas.ts`): aquí no se suma, no se cobra y no se llama a nadie.
 */
const ProductionLote: React.FC<{ lote: LoteDeTomas; produccion: FilmmakerProduction; editable: boolean }> = ({ lote, produccion, editable }) => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const { fase, calidad } = lote;
  const pidiendo = fase.fase === 'presupuestando' || fase.fase === 'generando';
  const presupuesto = fase.fase === 'presupuesto' || fase.fase === 'generando' || fase.fase === 'hecho' ? fase.presupuesto : null;
  const nota = (texto: string, clave?: string) => <Text key={clave} style={[styles.nota, { color: theme.colors.textSecondary }]}>{texto}</Text>;

  const nombreDe = (id: string): string | null => {
    const p = buscarPlano(produccion, id);
    if (p) return t('filmmaker.whereShot', { escena: p.sceneIndex + 1, plano: p.shotIndex + 1 });
    const e = buscarEscena(produccion, id);
    return e ? t('filmmaker.whereScene', { escena: e.index + 1 }) : null;
  };
  const estadoDe = (u: UnidadDelLote): string => {
    switch (u.action) {
      case 'generate': return t('filmmaker.wsBatchUnitGenerate', { credits: formato.numero(u.credits ?? 0) });
      case 'done': return t('filmmaker.wsBatchUnitDone');
      case 'in_flight': return t('filmmaker.wsBatchUnitInFlight');
      default: return fraseDelRechazoDeToma({ motivo: u.reason ?? 'unknown', ...(u.detail ? { detalle: u.detail } : {}) }, t, formato);
    }
  };
  /* Lo que el lote entero no pudo: los suyos tienen frase propia; el resto, la de la toma suelta. */
  const fraseDelLote = (r: RechazoDeToma): string => {
    const d = r.detalle ?? {};
    switch (r.motivo) {
      case 'batch_too_large': return t('filmmaker.wsBatchTooLarge', { maximo: formato.numero(Number(d.max)) });
      case 'insufficient_credits': return t('filmmaker.wsBatchNotEnough', { necesarios: formato.numero(Number(d.required)), tienes: formato.numero(Number(d.available)) });
      default: return fraseDelRechazoDeToma(r, t, formato);
    }
  };
  const sinSaldo = !!presupuesto && presupuesto.balance !== null && !presupuesto.enough;

  const alGenerar = async () => {
    if (fase.fase !== 'presupuesto') return;
    const { units, credits } = fase.presupuesto.total;
    const si = await confirmAction(
      t('filmmaker.wsBatchConfirm', { contador: units, credits: formato.numero(credits) }),
      t('filmmaker.wsBatchConfirmDetail'),
      t('filmmaker.wsBatchGenerateShort'),
      false,
      t,
    );
    if (si) lote.generar();
  };

  const parada = fase.fase === 'hecho' && fase.resultado.stoppedAt
    ? fase.resultado.units.find((u) => u.unitId === fase.resultado.stoppedAt) ?? null
    : null;

  return (
    <View style={styles.bloque}>
      {nota(t('filmmaker.wsBatchIntro'))}
      <Text style={[styles.etiqueta, { color: theme.colors.textSecondary }]}>{t('filmmaker.takeQuality')}</Text>
      <View style={styles.opciones}>
        {CALIDADES_DE_TOMA.map((c) => {
          const esta = c === calidad;
          return (
            <TouchableOpacity
              key={c}
              onPress={() => lote.elegirCalidad(c)}
              disabled={pidiendo}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t(CLAVE_DE_CALIDAD[c])}
              accessibilityState={{ selected: esta, disabled: pidiendo }}
              style={[
                styles.opcion,
                { backgroundColor: esta ? theme.colors.accent : theme.colors.card, borderColor: esta ? theme.colors.accent : theme.colors.border },
                pidiendo && { opacity: OPACITY.disabled },
                isWeb && ({ cursor: pidiendo ? 'default' : 'pointer' } as any),
              ]}
            >
              <Text style={[styles.opcionTexto, { color: esta ? '#1F2937' : theme.colors.text }]} numberOfLines={1}>{t(CLAVE_DE_CALIDAD[c])}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {lote.recortado !== null && nota(t('filmmaker.wsBatchFirstOnes', { maximo: formato.numero(lote.recortado) }))}
      {!lote.disponible && <Aviso texto={t('filmmaker.wsBatchSaveFirst')} />}
      {fase.fase === 'presupuestando' && nota(t('filmmaker.takeQuoting'))}
      {fase.fase === 'rechazada' && <Aviso texto={fraseDelLote(fase.rechazo)} />}

      {!!presupuesto && (
        <View style={styles.lista}>
          {presupuesto.units.map((u) => {
            const nombre = nombreDe(u.unitId);
            if (!nombre) return null;
            return (
              <View key={u.unitId} style={[styles.fila, { borderColor: theme.colors.border }]}>
                <Text style={[styles.unidad, { color: theme.colors.text }]}>{nombre}</Text>
                <Text style={[styles.estado, { color: u.action === 'generate' ? theme.colors.text : theme.colors.textSecondary }]}>{estadoDe(u)}</Text>
              </View>
            );
          })}
        </View>
      )}
      {fase.fase === 'presupuesto' && !!fase.precioCambiado && <Aviso texto={t('filmmaker.takePriceChanged')} />}
      {!!presupuesto && fase.fase !== 'hecho' && (presupuesto.total.units > 0
        ? <Text style={[styles.total, { color: theme.colors.text }]}>{t('filmmaker.wsBatchTotal', { contador: presupuesto.total.units, credits: formato.numero(presupuesto.total.credits) })}</Text>
        : nota(t('filmmaker.wsBatchNothing')))}
      {!!presupuesto && fase.fase !== 'hecho' && presupuesto.total.units > 0 && presupuesto.balance !== null && (sinSaldo
        ? <Aviso texto={t('filmmaker.wsBatchNotEnough', { necesarios: formato.numero(presupuesto.total.credits), tienes: formato.numero(presupuesto.balance) })} />
        : nota(t('filmmaker.wsBatchBalance', { credits: formato.numero(presupuesto.balance) })))}
      {fase.fase === 'generando' && nota(t('filmmaker.wsBatchGenerating'))}
      {fase.fase === 'hecho' && (fase.resultado.status === 'NOTHING_TO_GENERATE'
        ? nota(t('filmmaker.wsBatchNothing'))
        : nota(t('filmmaker.wsBatchStarted', { contador: fase.resultado.started })))}
      {fase.fase === 'hecho' && !!fase.resultado.stoppedAt && (
        <Aviso texto={t('filmmaker.wsBatchStopped', {
          plano: nombreDe(fase.resultado.stoppedAt) ?? '',
          motivo: fraseDelRechazoDeToma({ motivo: parada?.reason ?? 'unknown' }, t, formato),
        })} />
      )}

      <View style={styles.acciones}>
        {(fase.fase === 'quieto' || fase.fase === 'rechazada' || fase.fase === 'hecho') && (
          <BotonPequeno
            icono="calculator-outline"
            etiqueta={fase.fase === 'quieto' ? t('filmmaker.wsBatchQuote') : t('filmmaker.wsBatchQuoteAgain')}
            onPress={lote.presupuestar}
            disabled={!lote.disponible}
            conTexto
          />
        )}
        {fase.fase === 'presupuesto' && (
          <>
            {/* Sin nada que generar no hay botón: se dice arriba, y un «Generar por 0 Credits» apagado no ayuda a nadie. */}
            {fase.presupuesto.total.units > 0 && (
              <BotonPequeno
                icono="play-outline"
                etiqueta={t('filmmaker.wsBatchGenerate', { credits: formato.numero(fase.presupuesto.total.credits) })}
                onPress={() => { void alGenerar(); }}
                disabled={!editable || !lote.disponible || sinSaldo}
                conTexto
                principal
              />
            )}
            <BotonPequeno icono="refresh" etiqueta={t('filmmaker.wsBatchQuoteAgain')} onPress={lote.presupuestar} disabled={!lote.disponible} conTexto />
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bloque: { gap: SPACING.sm },
  nota: { fontSize: FONT_SIZE.xs, lineHeight: FONT_SIZE.xs * 1.5 },
  etiqueta: { fontSize: FONT_SIZE.xs },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  opcion: { minHeight: 36, paddingHorizontal: SPACING.md, borderWidth: 1, borderRadius: BORDER_RADIUS.full, justifyContent: 'center' },
  opcionTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium as any },
  lista: { gap: SPACING.xs },
  fila: { borderWidth: 1, borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, gap: 2 },
  unidad: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium as any },
  estado: { fontSize: FONT_SIZE.xs, lineHeight: FONT_SIZE.xs * 1.5 },
  total: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold as any },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, alignItems: 'center' },
});

export default ProductionLote;
