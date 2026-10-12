import React, { useRef, useState } from 'react';
import { Text, TouchableOpacity, StyleSheet, View } from 'react-native';
import type { EntradaTextoFinal, ResultadoTextoFinal } from '../../services/textoFinalDeWeeAi';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';

interface Props {
  /** Lo que se guarda, ya resuelto por quien pinta: el texto final, de qué experiencia sale, su proyecto y su `requestId`. */
  entrada: EntradaTextoFinal;
  /** El contrato de la línea A (`guardarTextoFinal`), o `null` mientras no exista: entonces se dice, no se finge. */
  guardar: ((entrada: EntradaTextoFinal) => Promise<ResultadoTextoFinal>) | null;
  /**
   * El traductor y los colores llegan de quien la monta (`CreatorFlowScreen`, que ya los tiene): así esta pieza no añade
   * contextos que doblar en los entornos de prueba de la pantalla.
   */
  t: (clave: string) => string;
  colores: { text: string; border: string; card: string; error: string };
}

/**
 * «GUARDAR EN MIS CREACIONES» PARA UN TEXTO FINAL (R9 · E2, decisión D-3).
 *
 * Solo cuando la persona lo pide. Idempotente por dos lados: mientras guarda el botón está ocupado (un segundo toque no
 * sale), y el `requestId` es el del resultado, así que un reintento tras un fallo —o volver a abrir el trabajo— no crea
 * dos creaciones. Sin contrato todavía, el botón se ve apagado con su motivo.
 */
const GuardarTextoFinal: React.FC<Props> = ({ entrada, guardar, t, colores }) => {
  const [fase, setFase] = useState<'quieto' | 'guardando' | 'guardado' | 'error'>('quieto');
  const enCurso = useRef(false);

  const alGuardar = async () => {
    if (!guardar || enCurso.current || fase === 'guardado') return;
    enCurso.current = true;
    setFase('guardando');
    try {
      await guardar(entrada);
      setFase('guardado');
    } catch (error) {
      console.warn('No se pudo guardar el texto en Mis creaciones:', error);
      setFase('error');
    } finally {
      enCurso.current = false;
    }
  };

  const etiqueta = !guardar
    ? t('weeai.saveTextNotYet')
    : fase === 'guardando' ? t('weeai.savingText')
      : fase === 'guardado' ? t('weeai.textSaved')
        : t('weeai.saveTextToCreations');
  const apagado = !guardar || fase === 'guardando' || fase === 'guardado';

  return (
    <View style={styles.bloque}>
      <TouchableOpacity
        onPress={alGuardar}
        disabled={apagado}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={etiqueta}
        accessibilityState={{ disabled: apagado, busy: fase === 'guardando' }}
        style={[styles.boton, { borderColor: colores.border, backgroundColor: colores.card, opacity: apagado && fase !== 'guardado' ? 0.6 : 1 }]}
      >
        <Text style={[styles.texto, { color: colores.text }]}>{etiqueta}</Text>
      </TouchableOpacity>
      {fase === 'error' && <Text style={[styles.error, { color: colores.error }]}>{t('weeai.couldNotSave')}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  bloque: { gap: SPACING.xs },
  boton: { borderWidth: 1, borderRadius: BORDER_RADIUS.lg, paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg, alignItems: 'center' },
  texto: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold },
  error: { fontSize: FONT_SIZE.sm, textAlign: 'center' },
});

export default GuardarTextoFinal;
