import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useIdioma } from '../../contexts/IdiomaContext';
import { Plan, PlanPricing, QualityChoice } from '../../services/creatorService';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

interface PlanCardProps {
  experienceName: string;
  plan: Plan;
  creditsEstimated: number;
  demo: boolean;
  /** Si el precio es simulado se dice claramente. */
  pricingMode?: 'simulated' | 'real';
  /** Desglose de lo que se va a usar y niveles entre los que elegir. */
  pricing?: PlanPricing | null;
  quality?: QualityChoice | null;
  quoting?: boolean;
  onQuality?: (quality: QualityChoice) => void;
  busy: boolean;
  onCreate: () => void;
  onChange: () => void;
}

/**
 * "Voy a … (≈ X Credits)" · [Crear] · [Cambiar algo]
 * Lo único que la persona necesita saber antes de que Weë trabaje.
 */
/** "3 imágenes · Alta calidad · 1K" — lo que se va a usar, en palabras de la persona. */
const stepDetail = (step: { label?: string; resolution?: string; count?: number; durationSec?: number }): string => {
  const parts: string[] = [];
  if (step.count && step.count > 1) parts.push(`${step.count} imágenes`);
  if (step.label) parts.push(step.label);
  if (step.resolution) parts.push(step.resolution.toUpperCase().replace('PX', ' px'));
  if (step.durationSec && step.durationSec > 0) parts.push(`${step.durationSec} s`);
  return parts.join(' · ');
};

const PlanCard: React.FC<PlanCardProps> = ({ experienceName, plan, creditsEstimated, demo, pricingMode, pricing, quality, quoting, onQuality, busy, onCreate, onChange }) => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const costLabel =
    creditsEstimated === 0
      ? t('weeai.noCost')
      : `≈ ${creditsEstimated.toLocaleString('es')} Credits${pricingMode === 'simulated' ? ' · precio de prueba' : ''}`;
  const costHint =
    creditsEstimated > 0 ? t('weeai.creditsNote') : demo ? t('weeai.demoMode') : '';

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
            <View style={styles.stepBody}>
              <Text style={[styles.stepText, { color: theme.colors.text }]}>{step.purpose}</Text>
              {(() => {
                const estimate = pricing?.steps.find((s) => s.stepId === step.id);
                if (!estimate) return null;
                const detail = stepDetail(estimate);
                return (
                  <Text style={[styles.stepMeta, { color: theme.colors.textSecondary }]}>
                    {detail ? `${detail} · ` : ''}
                    {estimate.credits} Credits
                    {estimate.volumeDiscount ? ` · −${estimate.volumeDiscount}% por cantidad` : ''}
                  </Text>
                );
              })()}
            </View>
          </View>
        ))}
      </View>

      {!!pricing?.options && pricing.options.length > 1 && (
        <View style={styles.quality}>
          <Text style={[styles.qualityTitle, { color: theme.colors.textSecondary }]}>{t('weeai.quality')}</Text>
          <View style={styles.qualityRow}>
            {pricing.options.map((option) => {
              const active = (quality || pricing.options?.[0]?.quality) === option.quality;
              return (
                <TouchableOpacity
                  key={option.quality}
                  onPress={() => onQuality?.(option.quality)}
                  disabled={busy || quoting}
                  activeOpacity={0.8}
                  accessibilityLabel={`${option.label}, ${option.credits} Credits`}
                  style={[
                    styles.qualityChip,
                    { borderColor: active ? theme.colors.accentDark : theme.colors.border },
                    active && { backgroundColor: theme.colors.accent },
                  ]}
                >
                  <Text style={[styles.qualityLabel, { color: active ? "#1F2937" : theme.colors.text }]}>{option.label}</Text>
                  <Text style={[styles.qualityCredits, { color: active ? "#1F2937" : theme.colors.textSecondary }]}>{option.credits} Credits</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={[styles.cost, { color: theme.colors.textSecondary }]}>💳 {costLabel}</Text>
        {!!costHint && <Text style={[styles.costHint, { color: theme.colors.textSecondary }]}>{costHint}</Text>}
        <View style={styles.actions}>
          <TouchableOpacity onPress={onChange} disabled={busy} activeOpacity={0.7} style={styles.linkButton}>
            <Text style={[styles.linkText, { color: theme.colors.accentDark }]}>{t('weeai.changeSomething')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onCreate}
            disabled={busy}
            activeOpacity={0.85}
            style={[styles.createButton, { backgroundColor: theme.colors.accent }]}
            accessibilityLabel={t('weeai.create')}
          >
            {busy ? <ActivityIndicator color="#1F2937" /> : <Text style={styles.createText}>{t('weeai.create')}</Text>}
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
  stepBody: {
    flex: 1,
    gap: 2,
  },
  stepMeta: {
    fontSize: scale(11),
  },
  quality: {
    gap: SPACING.xs,
  },
  qualityTitle: {
    fontSize: scale(11),
    fontWeight: FONT_WEIGHT.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  qualityRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    flexWrap: 'wrap',
  },
  qualityChip: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: 1,
  },
  qualityLabel: {
    fontSize: scale(12),
    fontWeight: FONT_WEIGHT.semibold,
  },
  qualityCredits: {
    fontSize: scale(10),
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
  costHint: {
    fontSize: FONT_SIZE.xs,
    marginTop: -scale(4),
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
