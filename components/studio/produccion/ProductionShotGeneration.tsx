import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useIdioma } from '../../../contexts/IdiomaContext';
import { BotonPequeno, Seccion } from './ProductionPiezas';
import HojaInferior from '../../workspace/HojaInferior';
import ReproductorDeVideo from '../../workspace/ReproductorDeVideo';
import { CALIDADES_DE_TOMA, calidadDisponible } from '../../../utils/controladorDeToma';
import type { VideoDelPlano } from '../../../utils/controladorDeToma';
import type { TomaDelPlano } from '../../../hooks/useTomaDePlano';
import type { HistorialDeTomas } from '../../../hooks/useTomasDelPlano';
import ProductionTomas from './ProductionTomas';
import {
  CLAVE_DE_CALIDAD, claveDelFalloDeToma, fraseDeLaCancelacion, fraseDelRechazoDeToma, frasesDeLaEconomia, frasesDeLasCalidades, resolucionVisible,
} from '../../../utils/mensajesDeFilmmaker';
import { confirmAction } from '../../../utils/notify';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, OPACITY } from '../../../constants/design';
import { scale } from '../../../utils/scale';

const isWeb = Platform.OS === 'web';

/**
 * «VER VÍDEO» (Fase 16 del motor, D13): el vídeo del plano se ve DENTRO de Weë,
 * en su reproductor —con su póster si lo tiene y su formato—, en una hoja que se
 * cierra y deja todo como estaba. Antes abría la dirección del material fuera de
 * la app. La hoja solo existe mientras está abierta.
 */
export const VerVideoDelPlano: React.FC<{ url: string; poster?: string | null; formato?: string; titulo: string }> = ({ url, poster, formato, titulo }) => {
  const { t } = useIdioma();
  const [abierta, setAbierta] = useState(false);
  return (
    <>
      <BotonPequeno icono="play-circle-outline" etiqueta={t('filmmaker.takeOpen')} onPress={() => setAbierta(true)} conTexto />
      {abierta && (
        <HojaInferior visible titulo={titulo} onCerrar={() => setAbierta(false)}>
          <ReproductorDeVideo url={url} poster={poster} formato={formato} nombre={titulo} altoMaximo={scale(420)} />
        </HojaInferior>
      )}
    </>
  );
};

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
 * Esto es la toma de UNA unidad. La producción entera se genera en su propia
 * sección del Director (Fase 29 del motor, `ProductionLote`, el lote de la Fase 6).
 */
const Generacion: React.FC<{
  toma: TomaDelPlano;
  tipo: 'plano' | 'escena';
  /** El vídeo de la unidad tal como lo tiene el storyboard: de ahí sale su póster, si es el mismo material. */
  video?: VideoDelPlano | null;
  /** El formato de la producción, para verlo en su proporción. */
  formato?: string;
}> = ({ toma, tipo, video, formato: proporcion }) => {
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
            /* El póster solo si es el del MISMO material: uno de una toma anterior no se enseña como si fuera este. */
            <VerVideoDelPlano
              url={enElPlano.url}
              poster={video && video.assetId === enElPlano.assetId ? video.poster : null}
              formato={proporcion}
              titulo={titulo}
            />
          )}
        </View>
      )}
      {!!enElPlano && (
        /*
         * Fase 27 del motor: editar o extender este vídeo. El modelo de vídeo de Weë sabe hacerlo, pero en Filmmaker no
         * hay todavía ni operación, ni requisito, ni precio, ni prueba real: se enseña cerrado y se dice por qué, sin
         * un precio inventado.
         */
        <View style={styles.acciones}>
          <View style={styles.opciones}>
            <BotonPequeno icono="cut-outline" etiqueta={t('filmmaker.wsEditVideo')} onPress={() => undefined} disabled conTexto />
            <BotonPequeno icono="play-forward-outline" etiqueta={t('filmmaker.wsExtendVideo')} onPress={() => undefined} disabled conTexto />
          </View>
          {nota(t('filmmaker.wsEditExtendClosed'))}
        </View>
      )}
      {ultima?.estado === 'fallida' && (ultima.cancelada
        /* La detuvo la persona (Fase 15): no es un fallo, y se dice así. */
        ? nota(t('filmmaker.takeStopped'))
        : nota(t(claveDelFalloDeToma(ultima.categoria, ultima.pendiente === true), { numero: ultima.toma }), 'error'))}
      {ultima?.estado === 'fallida' && !ultima.cancelada && ultima.categoria === 'MODEL_UNAVAILABLE' && hayAlgunaCalidad && nota(t('filmmaker.takeFailTryOtherQuality'))}
      {ultima?.estado === 'sin_enlazar' && nota(t(
        ultima.motivo === 'production_changed' ? 'filmmaker.takeStale' : ultima.motivo === 'take_superseded' ? 'filmmaker.takeReasonSuperseded' : 'filmmaker.takeNotLinked',
        { numero: ultima.toma },
      ))}
      {cuentas}
    </>
  );

  if (fase.fase === 'consultando') return <Seccion titulo={titulo}>{nota(t('filmmaker.takeChecking'))}</Seccion>;
  if (fase.fase === 'en_proceso' || fase.fase === 'terminando' || fase.fase === 'cerrando' || fase.fase === 'comprobando') {
    const texto = fase.fase === 'en_proceso' ? t('filmmaker.takeWorking') : fase.fase === 'terminando' ? t('filmmaker.takeLinking') : fase.fase === 'comprobando' ? t('filmmaker.takeReconciling') : t('filmmaker.takeClosing');
    const { cancelacion } = toma;
    /*
     * «DETENER LA TOMA» (Fase 15 del motor): solo mientras está en proceso, con una
     * confirmación que dice la regla del dinero ANTES de pedirlo, y una vez a la vez.
     */
    const puedeDetener = fase.fase === 'en_proceso' && cancelacion?.estado !== 'pidiendo' && cancelacion?.estado !== 'hecha';
    const detener = async () => {
      if (await confirmAction(t('filmmaker.takeStopConfirmTitle'), t('filmmaker.takeStopConfirmText'), t('filmmaker.takeStop'), true, t)) toma.cancelar();
    };
    return (
      <Seccion titulo={titulo}>
        {loQueHay}
        <View style={[styles.fila, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
          <Ionicons name={fase.fase === 'cerrando' ? 'return-down-back-outline' : fase.fase === 'comprobando' ? 'search-outline' : 'hourglass-outline'} size={scale(16)} color={theme.colors.accentDark} />
          <Text style={[styles.texto, styles.estira, { color: theme.colors.text }]}>{texto}</Text>
        </View>
        {fase.fase === 'en_proceso' && !!cancelacion && nota(fraseDeLaCancelacion(cancelacion, t), cancelacion.estado === 'rechazada' ? 'error' : 'normal')}
        {puedeDetener && (
          <View style={styles.acciones}>
            <BotonPequeno icono="stop-circle-outline" etiqueta={t('filmmaker.takeStop')} onPress={() => { void detener(); }} conTexto />
          </View>
        )}
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
          {/*
            Fase 22 del motor (arreglo R16 de la auditoría): el servidor genera por SEGUNDOS ENTEROS y con un mínimo
            (\`max(mínimo, ceil(pedida))\`). Si subió hasta el mínimo, se dice que es el mínimo; si solo se redondeó, se
            dice que se redondea —antes todo se llamaba «el más corto que se puede generar», y un 5,5 → 6 no lo es—.
          */}
          {fase.efectiva.durationSec !== fase.efectiva.requestedDurationSec && nota(Math.ceil(fase.efectiva.requestedDurationSec) < fase.efectiva.durationSec
            ? t('filmmaker.takeDurationAdjusted', {
              segundos: formato.numero(fase.efectiva.requestedDurationSec),
              minimo: formato.numero(fase.efectiva.durationSec),
            })
            : t('filmmaker.takeDurationRounded', {
              segundos: formato.numero(fase.efectiva.requestedDurationSec),
              redondeado: formato.numero(fase.efectiva.durationSec),
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

/**
 * La toma de la unidad y, debajo, las que ya se hicieron (Fase 24 del motor): lo que se genera ahora y lo que ya se
 * generó, juntos, en los tres sitios donde se genera —el Director, sus pestañas y «Herramientas IA»—.
 */
const ProductionShotGeneration: React.FC<React.ComponentProps<typeof Generacion> & { historial?: HistorialDeTomas | null }> = ({ historial, ...props }) => (
  <>
    <Generacion {...props} />
    <ProductionTomas historial={historial} tipo={props.tipo} formato={props.formato} />
  </>
);

export default ProductionShotGeneration;
