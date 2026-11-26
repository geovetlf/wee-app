import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useIdioma } from '../../contexts/IdiomaContext';
import { textoDelServidor } from '../../i18n/servidor';
import { CreatorJob } from '../../services/creatorService';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';
import TextoEnMayusculas from '../TextoEnMayusculas';
import { useEstiloWeeAi } from '../../hooks/useEstiloWeeAi';
import { RADIO_WEEAI, textoWeeAi } from '../../constants/estiloWeeAi';

interface JobProgressProps {
  experienceName: string;
  job: CreatorJob;
  /** «Seguir navegando»: sale de la pantalla; el trabajo sigue en el servidor y aparece en Historial y Mis creaciones. */
  onKeepBrowsing?: () => void;
}

/**
 * Progreso en lenguaje humano: "Escribiendo el guion… ✔ Creando imágenes…"
 *
 * ── Lo que enseña es lo que se sabe ────────────────────────────────────────
 *
 * Los pasos y su estado los escribe el servidor en el documento del trabajo,
 * y esto los pinta tal cual: hechos, en marcha, pendientes. No hay barra ni
 * porcentaje porque no hay ninguna fuente real que los diga, y un número
 * inventado es peor que ninguno.
 *
 * Todo lo que se lee pasa por `t()`. Antes las cuatro frases estaban escritas
 * en español a mano, y quien usaba Weë en inglés leía «está trabajando» en la
 * pantalla donde aterriza todo lo que se crea.
 */
const JobProgress: React.FC<JobProgressProps> = ({ experienceName, job, onKeepBrowsing }) => {
  const { theme } = useTheme();
  const c = useEstiloWeeAi();
  const { t, locale } = useIdioma();
  /* El progreso y los pasos los escribe el servidor en español: se pintan en el idioma de quien mira. */
  const leer = (texto: string): string => textoDelServidor(texto, { t, locale, experiencia: job.experienceId });
  const doneCount = job.steps.filter((s) => s.status === 'done').length;

  return (
    <View style={[styles.card, { backgroundColor: c.superficie }]}>
      <TextoEnMayusculas style={[styles.who, { color: theme.colors.accentDark }]}>{t('creaciones.progressWorking', { nombre: experienceName })}</TextoEnMayusculas>
      <Text style={[styles.title, { color: theme.colors.text }]}>{job.progressText ? leer(job.progressText) : t('creaciones.progressStarting')}</Text>
      <Text style={[styles.counter, { color: theme.colors.textSecondary }]}>
        {t('creaciones.progressSteps', { hechos: doneCount, total: job.steps.length })}
      </Text>

      <View style={styles.steps}>
        {job.steps.map((step) => (
          <View key={step.id} style={styles.stepRow}>
            <View style={styles.stepIcon}>
              {step.status === 'done' ? (
                <Ionicons name="checkmark-circle" size={scale(20)} color={theme.colors.accentDark} />
              ) : step.status === 'running' ? (
                <ActivityIndicator size="small" color={theme.colors.accent} />
              ) : step.status === 'failed' ? (
                <Ionicons name="close-circle" size={scale(20)} color={theme.colors.error} />
              ) : (
                <Ionicons name="ellipse-outline" size={scale(20)} color={theme.colors.border} />
              )}
            </View>
            <Text
              style={[
                styles.stepText,
                { color: step.status === 'pending' ? theme.colors.textSecondary : theme.colors.text },
              ]}
            >
              {leer(step.purpose)}
            </Text>
          </View>
        ))}
      </View>

      <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>{t('creaciones.progressFindLater')}</Text>
      {onKeepBrowsing ? (
        <TouchableOpacity onPress={onKeepBrowsing} accessibilityRole="button" activeOpacity={0.7} style={[styles.seguir, { backgroundColor: c.seleccion }]}>
          <Text style={[styles.seguirTexto, textoWeeAi('cuerpo', '600'), { color: c.sobreSeleccion }]}>{t('weeai.keepBrowsing')}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: SPACING.lg,
    borderRadius: RADIO_WEEAI.tarjeta,
    gap: SPACING.sm,
  },
  who: {
    fontSize: scale(11),
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 0.4,
  },
  title: {
    fontSize: scale(18),
    fontWeight: FONT_WEIGHT.bold,
  },
  counter: {
    fontSize: FONT_SIZE.xs,
  },
  steps: {
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  stepIcon: {
    width: scale(22),
    alignItems: 'center',
  },
  stepText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
  },
  seguir: { minHeight: 44, borderRadius: RADIO_WEEAI.pastilla, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.lg, marginTop: SPACING.sm },
  seguirTexto: {},
  hint: {
    fontSize: FONT_SIZE.xs,
    marginTop: SPACING.sm,
    lineHeight: scale(17),
  },
});

export default JobProgress;
