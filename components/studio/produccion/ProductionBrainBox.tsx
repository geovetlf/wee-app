import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useIdioma } from '../../../contexts/IdiomaContext';
import CajaDePrompt from '../../creator/CajaDePrompt';
import { BotonPequeno, Seccion } from './ProductionPiezas';
import type { EspacioDeFilmmaker } from './espacio';
import { notify } from '../../../utils/notify';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../../constants/design';

/**
 * «PÍDESELO A WEË BRAIN», dentro del editor (Filmmaker Engine, Fase 20; la propuesta es la de la Fase 9).
 *
 * La caja es la común de Weë AI (`CajaDePrompt`): no es otro asistente, es Weë
 * Brain con la producción abierta como contexto. Lo que contesta se enseña tal
 * cual —es su texto—, y si PROPONE cambios, se dice cuántos y la persona elige:
 *
 *   · «Aplicar los cambios» los aplica como un gesto más, por el controlador de
 *     siempre, SOLO si la producción sigue en la revisión en la que Weë Brain los
 *     comprobó y no hay nada sin guardar; si cambió, se dice y se pide otra vez;
 *   · «Descartar» los quita, sin tocar nada.
 *
 * Nada se aplica solo. Hablar con Weë Brain usa su bloque de respuestas de
 * siempre, y lo que queda se dice con la misma frase que en el resto de Weë Brain.
 */
const ProductionBrainBox: React.FC<{ espacio: EspacioDeFilmmaker }> = ({ espacio }) => {
  const { theme } = useTheme();
  const { t } = useIdioma();
  const [texto, setTexto] = useState('');
  const { brain, editable, hayCambios, revision, onGesto } = espacio;
  if (!brain) return null;
  const { propuesta } = brain;
  const vigente = !!propuesta && revision === propuesta.baseRevision && !hayCambios;
  const pensando = brain.fase === 'pensando';

  const enviar = () => {
    const m = texto.trim();
    if (!m || pensando) return;
    brain.enviar(m);
    setTexto('');
  };
  const aplicar = () => {
    if (!propuesta || !vigente || !editable) return;
    const r = onGesto(propuesta.operations);
    if (r.ok) {
      notify(t('filmmaker.wsBrainApplied'));
      brain.descartar();
    }
  };

  return (
    <Seccion titulo={t('filmmaker.wsBrainTitle')}>
      <CajaDePrompt
        valor={texto}
        onCambiar={setTexto}
        onEnviar={enviar}
        etiquetaEnviar={t('filmmaker.wsBrainSend')}
        placeholder={t('filmmaker.wsBrainPlaceholder')}
        ocupado={pensando}
        editable={editable}
      />
      {pensando && <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsBrainThinking')}</Text>}
      {brain.fase === 'error' && <Text style={[styles.nota, { color: theme.colors.error }]}>{t('filmmaker.wsBrainError')}</Text>}
      {!!brain.texto && brain.fase === 'contesto' && (
        <Text style={[styles.respuesta, { color: theme.colors.text, borderLeftColor: theme.colors.accent }]}>{brain.texto}</Text>
      )}
      {!!propuesta && (
        <View style={[styles.propuesta, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}>
          <Text style={[styles.titulo, { color: theme.colors.text }]}>{t('filmmaker.wsBrainProposalCount', { numero: propuesta.operations.length })}</Text>
          {!vigente && <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{hayCambios ? t('filmmaker.saveFirst') : t('filmmaker.wsBrainStale')}</Text>}
          <View style={styles.acciones}>
            <BotonPequeno icono="checkmark" etiqueta={t('filmmaker.wsBrainApply')} onPress={aplicar} disabled={!vigente || !editable} conTexto principal />
            <BotonPequeno icono="close" etiqueta={t('filmmaker.wsBrainDiscard')} onPress={brain.descartar} conTexto />
          </View>
        </View>
      )}
      {brain.fase === 'contesto' && brain.sinPropuesta && (
        <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsBrainNoProposal')}</Text>
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
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
});

export default ProductionBrainBox;
