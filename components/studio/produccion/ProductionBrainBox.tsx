import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useIdioma } from '../../../contexts/IdiomaContext';
import CajaDePrompt from '../../creator/CajaDePrompt';
import { BotonPequeno, Seccion } from './ProductionPiezas';
import type { EspacioDeFilmmaker } from './espacio';
import { describirPropuesta } from '../../../utils/describirOperacion';
import { fraseDelFallo, fraseDelProblema } from '../../../utils/mensajesDeFilmmaker';
import { notify } from '../../../utils/notify';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../../constants/design';
import { scale } from '../../../utils/scale';

/**
 * Los atajos: RELLENAN la caja con una petición, y nada más. Enviarla sigue siendo de la persona, con su precio a la
 * vista (Fase 22 del motor): Weë Brain nunca hace nada que cueste sin que se lo pidan.
 */
const ATAJOS: readonly { clave: string; texto: string; icono: string }[] = [
  { clave: 'filmmaker.wsBrainQuickScenes', texto: 'filmmaker.wsBrainQuickScenesText', icono: 'albums-outline' },
  { clave: 'filmmaker.wsBrainQuickReview', texto: 'filmmaker.wsBrainQuickReviewText', icono: 'search-outline' },
];

/**
 * «PÍDESELO A WEË BRAIN», dentro del editor (Filmmaker Engine, Fase 20; la propuesta es la de la Fase 9).
 *
 * La caja es la común de Weë AI (`CajaDePrompt`): no es otro asistente, es Weë
 * Brain con la producción abierta como contexto. Lo que contesta se enseña tal
 * cual —es su texto—, y si PROPONE cambios, la persona elige:
 *
 *   · «Aplicar los cambios» los aplica SOLO si la producción sigue en la revisión
 *     en la que Weë Brain los comprobó y no hay nada sin guardar; si cambió, se
 *     dice y se pide otra vez;
 *   · «Descartar» los quita, sin tocar nada.
 *
 * Nada se aplica solo. Hablar con Weë Brain usa su bloque de respuestas de
 * siempre, y lo que queda se dice con la misma frase que en el resto de Weë Brain.
 *
 * Fase 22 del motor (arreglo R1 de la auditoría): el PRECIO del mensaje antes de enviarlo, con las mismas palabras
 * que el resto de Weë Brain, y sin él no se envía; cada cambio propuesto dicho en una frase —qué, dónde, lo que trae
 * y POR QUÉ, con las palabras de Weë Brain—; lo que cuesta aplicarlo (nada) y lo que dejaría por rehacer; y aplicarlo
 * ya no es un gesto: va por \`onAplicarPropuesta\`, sobre la revisión en que se comprobó y con su propio id.
 */
const ProductionBrainBox: React.FC<{ espacio: EspacioDeFilmmaker }> = ({ espacio }) => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const [texto, setTexto] = useState('');
  const { brain, editable, hayCambios, revision, produccion, onAplicarPropuesta, ocupado } = espacio;
  const cotizar = brain?.cotizar;

  /* El precio de lo que hay escrito: el hook espera a que se pare de escribir y lo pregunta. */
  useEffect(() => {
    if (cotizar) cotizar(texto);
  }, [texto, cotizar, revision]);

  const propuesta = brain?.propuesta ?? null;
  const cambios = useMemo(
    () => (propuesta ? describirPropuesta(propuesta.operations, propuesta.reasons, produccion, t, formato) : []),
    [propuesta, produccion, t, formato],
  );
  if (!brain) return null;
  const vigente = !!propuesta && revision === propuesta.baseRevision && !hayCambios;
  const pensando = brain.fase === 'pensando';
  const aplicando = ocupado === 'aplicando';
  const cotizacion = brain.cotizacion;
  const sinPrecio = pensando || cotizacion.estado !== 'lista';
  const porRehacer = propuesta?.pending?.shots.length ?? 0;

  const enviar = () => {
    const m = texto.trim();
    if (!m || sinPrecio) return;
    brain.enviar(m);
    setTexto('');
  };
  const aplicar = async () => {
    if (!propuesta || !vigente || !editable || !brain.idDeLaPropuesta || !onAplicarPropuesta) return;
    const r = await onAplicarPropuesta(propuesta.operations, propuesta.baseRevision, brain.idDeLaPropuesta);
    if (r.ok) {
      notify(t('filmmaker.wsBrainApplied'));
      brain.descartar();
      return;
    }
    if (r.motivo === 'cambio') { notify(t('filmmaker.wsBrainStale')); return; }
    if (r.motivo === 'cambios_sin_guardar') { notify(t('filmmaker.saveFirst')); return; }
    if (r.motivo === 'rechazada' && r.problems?.length) { notify(t('filmmaker.wsBrainApplyError'), fraseDelProblema(r.problems[0], produccion, t)); return; }
    notify(t('filmmaker.wsBrainApplyError'), r.fallo ? fraseDelFallo(r.fallo, t) : undefined);
  };

  /* El precio, con las palabras de siempre: once de cada doce respuestas no cobran, y entonces se dice cuántas quedan. */
  const lineaDelPrecio = (() => {
    if (!texto.trim() || cotizacion.estado === 'nada') return null;
    if (cotizacion.estado === 'error') return <Text style={[styles.nota, { color: theme.colors.error }]}>{t('weeai.couldNotCalculateRetry')}</Text>;
    if (cotizacion.estado === 'calculando') return <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('weeai.calculatingCost')}</Text>;
    const { precio } = cotizacion;
    const cuanto = precio.credits > 0 || !brain.bloque
      ? t('filmmaker.wsBrainCost', { credits: formato.numero(precio.credits) })
      : t('brain.blockLeft', { restantes: brain.bloque.restantes, total: brain.bloque.total });
    return (
      <View style={styles.precio}>
        <Text style={[styles.nota, styles.fuerte, { color: theme.colors.text }]}>{t('weeai.quoteBrain')}</Text>
        <Text style={[styles.nota, styles.fuerte, { color: theme.colors.text }]}>{cuanto}</Text>
        {precio.usd > 0 && (
          <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('weeai.approxUsd', { usd: precio.usd < 0.01 ? '<0.01' : precio.usd.toFixed(2) })}</Text>
        )}
      </View>
    );
  })();

  return (
    <Seccion titulo={t('filmmaker.wsBrainTitle')}>
      {editable && (
        <View style={styles.atajos}>
          {ATAJOS.map((a) => (
            <BotonPequeno key={a.clave} icono={a.icono} etiqueta={t(a.clave)} onPress={() => setTexto(t(a.texto))} conTexto />
          ))}
        </View>
      )}
      <CajaDePrompt
        valor={texto}
        onCambiar={setTexto}
        onEnviar={enviar}
        etiquetaEnviar={cotizacion.estado === 'lista' && cotizacion.precio.credits > 0 ? t('weeai.sendForCredits', { credits: formato.numero(cotizacion.precio.credits) }) : t('filmmaker.wsBrainSend')}
        placeholder={t('filmmaker.wsBrainPlaceholder')}
        ocupado={sinPrecio}
        editable={editable}
      />
      {lineaDelPrecio}
      {pensando && <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsBrainThinking')}</Text>}
      {brain.fase === 'error' && (
        <Text style={[styles.nota, { color: theme.colors.error }]}>{brain.faltan ? t('weeai.errNotEnoughCredits') : t('filmmaker.wsBrainError')}</Text>
      )}
      {!!brain.texto && brain.fase === 'contesto' && (
        <Text style={[styles.respuesta, { color: theme.colors.text, borderLeftColor: theme.colors.accent }]}>{brain.texto}</Text>
      )}
      {!!propuesta && (
        <View style={[styles.propuesta, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}>
          <Text style={[styles.titulo, { color: theme.colors.text }]}>{t('filmmaker.wsBrainProposalCount', { numero: propuesta.operations.length })}</Text>
          {cambios.map((c, i) => (
            <View key={i} style={[styles.cambio, { borderColor: theme.colors.border }]}>
              <Ionicons name={c.icono as any} size={scale(15)} color={theme.colors.accent} />
              <View style={styles.cambioTextos}>
                <Text style={[styles.accion, { color: theme.colors.text }]}>{c.accion}</Text>
                {!!c.donde && <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{c.donde}</Text>}
                {!!c.detalle && <Text style={[styles.detalle, { color: theme.colors.text }]} numberOfLines={3}>{c.detalle}</Text>}
                {!!c.razon && <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsBrainReason', { razon: c.razon })}</Text>}
              </View>
            </View>
          ))}
          <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsBrainApplyFree')}</Text>
          {porRehacer > 0 && <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsBrainRedo', { contador: porRehacer })}</Text>}
          {!vigente && <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{hayCambios ? t('filmmaker.saveFirst') : t('filmmaker.wsBrainStale')}</Text>}
          {aplicando && <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.busyApplying')}</Text>}
          <View style={styles.acciones}>
            <BotonPequeno icono="checkmark" etiqueta={t('filmmaker.wsBrainApply')} onPress={() => { void aplicar(); }} disabled={!vigente || !editable || aplicando} conTexto principal />
            <BotonPequeno icono="close" etiqueta={t('filmmaker.wsBrainDiscard')} onPress={brain.descartar} disabled={aplicando} conTexto />
          </View>
        </View>
      )}
      {brain.fase === 'contesto' && brain.sinPropuesta && (
        <View>
          <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsBrainNoProposal')}</Text>
          <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsBrainNotCounted')}</Text>
        </View>
      )}
      {!!brain.bloque && (
        <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('brain.blockLeft', { restantes: brain.bloque.restantes, total: brain.bloque.total })}</Text>
      )}
    </Seccion>
  );
};

const styles = StyleSheet.create({
  nota: { fontSize: FONT_SIZE.xs, lineHeight: FONT_SIZE.xs * 1.5 },
  respuesta: { fontSize: FONT_SIZE.sm, lineHeight: FONT_SIZE.sm * 1.5, borderLeftWidth: 2, paddingLeft: SPACING.sm },
  propuesta: { borderWidth: 1, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, gap: SPACING.sm },
  titulo: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold as any },
  cambio: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: SPACING.sm },
  cambioTextos: { flex: 1, gap: 2 },
  accion: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold as any },
  detalle: { fontSize: FONT_SIZE.sm },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  atajos: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  precio: { flexDirection: 'row', flexWrap: 'wrap', columnGap: SPACING.sm, rowGap: 2 },
  fuerte: { fontWeight: FONT_WEIGHT.semibold as any },
});

export default ProductionBrainBox;
