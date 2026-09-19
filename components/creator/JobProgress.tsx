import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { CreatorJob } from '../../services/creatorService';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

interface JobProgressProps {
  experienceName: string;
  job: CreatorJob;
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
const JobProgress: React.FC<JobProgressProps> = ({ experienceName, job }) => {
  const { theme } = useTheme();
  const t = useT();
  const doneCount = job.steps.filter((s) => s.status === 'done').length;

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <Text style={[styles.who, { color: theme.colors.accentDark }]}>{t('creaciones.progressWorking', { nombre: experienceName })}</Text>
      <Text style={[styles.title, { color: theme.colors.text }]}>{job.progressText || t('creaciones.progressStarting')}</Text>
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
              {step.purpose}
            </Text>
          </View>
        ))}
      </View>

      <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>{t('creaciones.progressFindLater')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  who: {
    fontSize: scale(11),
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
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
  hint: {
    fontSize: FONT_SIZE.xs,
    marginTop: SPACING.sm,
    lineHeight: scale(17),
  },
});

export default JobProgress;
