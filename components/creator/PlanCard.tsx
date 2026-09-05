import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Plan } from '../../services/creatorService';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

interface PlanCardProps {
  experienceName: string;
  plan: Plan;
  creditsEstimated: number;
  demo: boolean;
  busy: boolean;
  onCreate: () => void;
  onChange: () => void;
}

/**
 * "Voy a … (≈ X Credits)" · [Crear] · [Cambiar algo]
 * Lo único que la persona necesita saber antes de que Weë trabaje.
 */
const PlanCard: React.FC<PlanCardProps> = ({ experienceName, plan, creditsEstimated, demo, busy, onCreate, onChange }) => {
  const { theme } = useTheme();
  const costLabel = demo || creditsEstimated === 0 ? 'Gratis en modo demo' : `≈ ${creditsEstimated.toLocaleString('es')} Credits`;

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.accent + '1A', borderColor: theme.colors.accent }]}>
      <Text style={[styles.who, { color: theme.colors.accentDark }]}>{experienceName}</Text>
      <Text style={[styles.explain, { color: theme.colors.text }]}>{plan.explainToUser}</Text>

      <View style={styles.steps}>
        {plan.steps.map((step, index) => (
          <View key={step.id} style={styles.stepRow}>
            <View style={[styles.stepDot, { backgroundColor: theme.colors.accent }]}>
              <Text style={styles.stepNumber}>{index + 1}</Text>
            </View>
            <Text style={[styles.stepText, { color: theme.colors.text }]}>{step.purpose}</Text>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={[styles.cost, { color: theme.colors.textSecondary }]}>💳 {costLabel}</Text>
        <View style={styles.actions}>
          <TouchableOpacity onPress={onChange} disabled={busy} activeOpacity={0.7} style={styles.linkButton}>
            <Text style={[styles.linkText, { color: theme.colors.accentDark }]}>Cambiar algo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onCreate}
            disabled={busy}
            activeOpacity={0.85}
            style={[styles.createButton, { backgroundColor: theme.colors.accent }]}
            accessibilityLabel="Crear"
          >
            {busy ? <ActivityIndicator color="#1F2937" /> : <Text style={styles.createText}>Crear</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.md,
  },
  who: {
    fontSize: scale(11),
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  explain: {
    fontSize: FONT_SIZE.md,
    lineHeight: scale(23),
    fontWeight: FONT_WEIGHT.medium,
  },
  steps: {
    gap: SPACING.sm,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  stepDot: {
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    color: '#1F2937',
    fontSize: scale(11),
    fontWeight: FONT_WEIGHT.bold,
  },
  stepText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
  },
  footer: {
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  cost: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: SPACING.md,
  },
  linkButton: {
    minHeight: scale(44),
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
  },
  linkText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
  createButton: {
    minWidth: scale(120),
    height: scale(44),
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createText: {
    color: '#1F2937',
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
  },
});

export default PlanCard;
