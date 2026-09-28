import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useIdioma } from '../../../contexts/IdiomaContext';
import { BotonPequeno, Seccion } from './ProductionPiezas';
import { CALIDADES_DE_TOMA, calidadDisponible } from '../../../utils/controladorDeToma';
import type { TomaDelPlano } from '../../../hooks/useTomaDePlano';
import {
  CLAVE_DE_CALIDAD, claveDelFalloDeToma, fraseDelRechazoDeToma, frasesDeLaEconomia, frasesDeLasCalidades, resolucionVisible,
} from '../../../utils/mensajesDeFilmmaker';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, OPACITY } from '../../../constants/design';
import { scale } from '../../../utils/scale';

const isWeb = Platform.OS === 'web';

/**
 * EL VÍDEO DE LA UNIDAD ELEGIDA (F1-D): un plano, o una escena sin planos.
 *
 * Solo pinta lo que dice la toma (`hooks/useTomaDePlano.ts`): la calidad —que
 * se elige, nunca viene puesta—, el precio y lo que de verdad se va a generar,
 * «Generar», «en proceso» mientras se hace y el vídeo cuando está en su plano.
 * Aquí no se llama a nada, no se calcula ningún precio ni ningún id y no hay
 * relojes: si algo no se puede, se dice por qué con las palabras del motivo.
 *
 * Tras el canary real: una calidad que el servidor no puede generar se ve, pero
 * apagada y con su porqué; un fallo del proveedor se dice por su categoría, sin
 * nada de dentro; y los Credits de la toma —reservados, cobrados, devueltos— se
 * enseñan siempre que haya una.
 *
 * El «Generar» de la producción entera, en Acciones, sigue sin estar: esto es
 * una toma de UNA unidad; juntar varias en un vídeo no se hace todavía.
 */
const ProductionShotGeneration: React.FC<{ toma: TomaDelPlano; tipo: 'plano' | 'escena' }> = ({ toma, tipo }) => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const { fase, calidad, enElPlano, ultima, aviso, calidades, economia } = toma;
  if (fase.fase === 'sin_unidad' && fase.porque === 'nada') return null;

  const nota = (texto: string, tono: 'normal' | 'error' = 'normal', clave?: string) => (
    <Text key={clave} style={[styles.nota, { color: tono === 'error' ? theme.colors.error : theme.colors.textSecondary }]}>{texto}</Text>
  );
  const titulo = tipo === 'escena' ? t('filmmaker.takeSectionScene') : t('filmmaker.takeSectionShot');

  if (fase.fase === 'sin_unidad') return <Seccion titulo={titulo}>{nota(t('filmmaker.takePickShot'))}</Seccion>;
  if (fase.fase === 'no_disponible') {
    const clave = fase.porque === 'sin_guardar' ? 'filmmaker.takeNeedsSaving' : fase.porque === 'archivada' ? 'filmmaker.takeArchived' : 'filmmaker.takeNeedsReady';
    return <Seccion titulo={titulo}>{nota(t(clave))}</Seccion>;
  }

  const hayAlgunaCalidad = !calidades || CALIDADES_DE_TOMA.some((c) => calidadDisponible(calidades, c));

  /* Lo que movió de Credits la toma en curso o la última: siempre los tres números. */
  const cuentas = economia ? (
    <View style={styles.cuentas} accessibilityRole="text">
      {frasesDeLaEconomia(economia, t, formato).map((f, i) => (
        <Text key={i} style={[styles.cuenta, { color: theme.colors.textSecondary, borderColor: theme.colors.border }]}>{f}</Text>
      ))}
    </View>
  ) : null;

  /* Lo que ya hay: el vídeo que el plano tiene puesto, y cómo acabó la última toma si no llegó a él. */
  const loQueHay = (
    <>
      {!!enElPlano && (
        <View style={[styles.fila, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
          <Ionicons name="film-outline" size={scale(16)} color={theme.colors.success} />
          <Text style={[styles.texto, styles.estira, { color: theme.colors.text }]}>
            {ultima?.estado === 'lista' && ultima.assetId === enElPlano.assetId ? t('filmmaker.takeReady', { numero: ultima.toma }) : t('filmmaker.takeHasVideo')}
          </Text>
          {!!enElPlano.url && (
            <BotonPequeno icono="play-circle-outline" etiqueta={t('filmmaker.takeOpen')} onPress={() => { void Linking.openURL(enElPlano.url as string); }} conTexto />
          )}
        </View>
      )}
      {ultima?.estado === 'fallida' && nota(t(claveDelFalloDeToma(ultima.categoria, ultima.pendiente === true), { numero: ultima.toma }), 'error')}
      {ultima?.estado === 'fallida' && ultima.categoria === 'MODEL_UNAVAILABLE' && hayAlgunaCalidad && nota(t('filmmaker.takeFailTryOtherQuality'))}
      {ultima?.estado === 'sin_enlazar' && nota(t(
        ultima.motivo === 'production_changed' ? 'filmmaker.takeStale' : ultima.motivo === 'take_superseded' ? 'filmmaker.takeReasonSuperseded' : 'filmmaker.takeNotLinked',
        { numero: ultima.toma },
      ))}
      {cuentas}
    </>
  );

  if (fase.fase === 'consultando') return <Seccion titulo={titulo}>{nota(t('filmmaker.takeChecking'))}</Seccion>;
  if (fase.fase === 'en_proceso' || fase.fase === 'terminando' || fase.fase === 'cerrando') {
    const texto = fase.fase === 'en_proceso' ? t('filmmaker.takeWorking') : fase.fase === 'terminando' ? t('filmmaker.takeLinking') : t('filmmaker.takeClosing');
    return (
      <Seccion titulo={titulo}>
        {loQueHay}
        <View style={[styles.fila, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
          <Ionicons name={fase.fase === 'cerrando' ? 'return-down-back-outline' : 'hourglass-outline'} size={scale(16)} color={theme.colors.accentDark} />
          <Text style={[styles.texto, styles.estira, { color: theme.colors.text }]}>{texto}</Text>
        </View>
      </Seccion>
    );
  }
  if (fase.fase === 'error') {
    return (
      <Seccion titulo={titulo}>
        {loQueHay}
        {nota(fraseDelRechazoDeToma(fase.rechazo, t, formato), 'error')}
        <View style={styles.acciones}>
          <BotonPequeno icono="refresh" etiqueta={t('common.retry')} onPress={toma.reintentar} conTexto />
        </View>
      </Seccion>
    );
  }

  const pidiendo = fase.fase === 'pidiendo';
  const etiquetaGenerar = ultima || enElPlano
    ? t('filmmaker.takeGenerateAgain')
    : tipo === 'escena' ? t('filmmaker.takeGenerateScene') : t('filmmaker.takeGenerateShot');
  const sobreLasCalidades = frasesDeLasCalidades(calidades, t, formato);
  /* Un rechazo por el modelo de la calidad elegida: si queda otra calidad, se dice que se puede probar con ella. */
  const rechazoSinModelo = fase.fase === 'rechazada' && (fase.rechazo.motivo === 'model_unavailable' || fase.rechazo.motivo === 'MODEL_UNAVAILABLE');

  return (
    <Seccion titulo={titulo}>
      {loQueHay}
      <Text style={[styles.etiqueta, { color: theme.colors.textSecondary }]}>{t('filmmaker.takeQuality')}</Text>
      <View style={styles.opciones}>
        {CALIDADES_DE_TOMA.map((c) => {
          const esta = c === calidad;
          const disponible = calidadDisponible(calidades, c);
          const apagada = pidiendo || !disponible;
          return (
            <TouchableOpacity
              key={c}
              onPress={() => toma.elegirCalidad(c)}
              disabled={apagada}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t(CLAVE_DE_CALIDAD[c])}
              accessibilityHint={disponible ? undefined : t('filmmaker.takeQualityUnavailable')}
              accessibilityState={{ selected: esta, disabled: apagada }}
              style={[
                styles.opcion,
                { backgroundColor: esta && disponible ? theme.colors.accent : theme.colors.card, borderColor: esta && disponible ? theme.colors.accent : theme.colors.border },
                !disponible && styles.opcionApagada,
                apagada && { opacity: OPACITY.disabled },
                isWeb && ({ cursor: apagada ? 'default' : 'pointer' } as any),
              ]}
            >
              <Text style={[styles.opcionTexto, { color: esta && disponible ? '#1F2937' : theme.colors.text }, !disponible && styles.opcionTextoApagado]} numberOfLines={1}>
                {t(CLAVE_DE_CALIDAD[c])}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {sobreLasCalidades.map((f, i) => nota(f, 'normal', `cal-${i}`))}

      {fase.fase === 'elige_calidad' && hayAlgunaCalidad && nota(t('filmmaker.takeChooseQuality'))}
      {fase.fase === 'cotizando' && nota(t('filmmaker.takeQuoting'))}
      {fase.fase === 'rechazada' && nota(fraseDelRechazoDeToma(fase.rechazo, t, formato), 'error')}
      {rechazoSinModelo && hayAlgunaCalidad && nota(t('filmmaker.takeFailTryOtherQuality'))}
      {fase.fase === 'cotizada' && (
        <View style={styles.bloque}>
          {aviso === 'precio_cambiado' && nota(t('filmmaker.takePriceChanged'), 'error')}
          <View style={styles.coste}>
            <Text style={[styles.etiqueta, { color: theme.colors.textSecondary }]}>{t('filmmaker.cost')}</Text>
            <Text style={[styles.precio, { color: theme.colors.text }]}>{t('filmmaker.takePrice', { credits: formato.numero(fase.creditos) })}</Text>
          </View>
          {nota(t('filmmaker.takeWillGenerate', {
            segundos: formato.numero(fase.efectiva.durationSec),
            formato: fase.efectiva.aspectRatio,
            resolucion: resolucionVisible(fase.efectiva.resolution),
          }))}
          {nota(fase.efectiva.withSound ? t('filmmaker.takeWithSound') : t('filmmaker.takeWithoutSound'))}
          {fase.efectiva.durationSec !== fase.efectiva.requestedDurationSec && nota(t('filmmaker.takeDurationAdjusted', {
            segundos: formato.numero(fase.efectiva.requestedDurationSec),
            minimo: formato.numero(fase.efectiva.durationSec),
          }))}
        </View>
      )}
      {pidiendo && nota(t('filmmaker.takeSending'))}
      {(fase.fase === 'cotizada' || pidiendo) && (
        <View style={styles.acciones}>
          <BotonPequeno icono="play-outline" etiqueta={etiquetaGenerar} onPress={toma.generar} disabled={pidiendo} conTexto principal />
          {!!(ultima || enElPlano) && nota(t('filmmaker.takeAgainNote'))}
        </View>
      )}
    </Seccion>
  );
};

const styles = StyleSheet.create({
  bloque: { gap: SPACING.xs },
  fila: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, borderWidth: 1, borderRadius: BORDER_RADIUS.md, padding: SPACING.md },
  estira: { flex: 1 },
  texto: { fontSize: FONT_SIZE.sm, lineHeight: FONT_SIZE.sm * 1.5 },
  nota: { fontSize: FONT_SIZE.xs, lineHeight: FONT_SIZE.xs * 1.5 },
  etiqueta: { fontSize: FONT_SIZE.xs },
  precio: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold as any },
  coste: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  acciones: { gap: SPACING.xs, alignItems: 'flex-start' },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  opcion: { minHeight: 36, paddingHorizontal: SPACING.md, borderWidth: 1, borderRadius: BORDER_RADIUS.full, justifyContent: 'center' },
  opcionApagada: { borderStyle: 'dashed' },
  opcionTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium as any },
  opcionTextoApagado: { textDecorationLine: 'line-through' },
  cuentas: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  cuenta: { fontSize: FONT_SIZE.xs, borderWidth: 1, borderRadius: BORDER_RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 2 },
});

export default ProductionShotGeneration;
