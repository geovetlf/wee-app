import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { CreatorJob } from '../../services/creatorService';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

interface JobProgressProps {
  experienceName: string;
  job: CreatorJob;
}

/** Progreso en lenguaje humano: "Escribiendo el guion… ✔ Creando imágenes…" */
const JobProgress: React.FC<JobProgressProps> = ({ experienceName, job }) => {
  const { theme } = useTheme();
  const doneCount = job.steps.filter((s) => s.status === 'done').length;

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <Text style={[styles.who, { color: theme.colors.accentDark }]}>{experienceName} está trabajando</Text>
      <Text style={[styles.title, { color: theme.colors.text }]}>{job.progressText || 'Empezando…'}</Text>
      <Text style={[styles.counter, { color: theme.colors.textSecondary }]}>
        {doneCount} de {job.steps.length} pasos listos
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
                <Ionicons name="close-circle" size={scale(20)} color="#B4443C" />
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

      <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
        Puedes salir de esta pantalla; lo encontrarás en "Mis creaciones" cuando esté listo.
      </Text>
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
