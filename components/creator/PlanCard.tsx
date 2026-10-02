import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useIdioma } from '../../contexts/IdiomaContext';
import { textoDelServidor } from '../../i18n/servidor';
import { Plan, PlanPricing, QualityChoice } from '../../services/creatorService';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';
import TextoEnMayusculas from '../TextoEnMayusculas';

interface PlanCardProps {
  experienceName: string;
  /** La experiencia del plan: con ella se reconocen sus frases y se pintan en el idioma de quien mira. */
  experienceId?: string;
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
type Traducir = (clave: string, valores?: Record<string, string | number>) => string;

/**
 * "3 imágenes · Alta calidad · 1K" — lo que se va a usar, en palabras de la persona.
 * Vive fuera del componente, así que el traductor le llega por parámetro.
 */
/*
 * LA ETIQUETA DE UN PASO. En las imágenes es un nivel de calidad («Alta calidad»), escrito por el servidor en español:
 * se pinta en el idioma de quien mira. En los vídeos el servidor manda el identificador de la familia del modelo
 * («SEEDANCE_2_0_FAST»): Weë nunca enseña modelos ni proveedores, así que un identificador así no se pinta —la
 * calidad ya se elige abajo, por nivel—.
 */
const ES_UN_IDENTIFICADOR = /^[A-Z0-9_]+$/;
const etiquetaDelPaso = (etiqueta: string | undefined, leer: (texto: string) => string): string | null =>
  !etiqueta || ES_UN_IDENTIFICADOR.test(etiqueta) ? null : leer(etiqueta);

const stepDetail = (
  step: { label?: string; resolution?: string; count?: number; durationSec?: number },
  t: Traducir,
  leer: (texto: string) => string = (texto) => texto,
): string => {
  const parts: string[] = [];
  if (step.count && step.count > 1) parts.push(t('weeai.imageCount', { contador: step.count }));
  const etiqueta = etiquetaDelPaso(step.label, leer);
  if (etiqueta) parts.push(etiqueta);
  if (step.resolution) parts.push(step.resolution.toUpperCase().replace('PX', ' px'));
  if (step.durationSec && step.durationSec > 0) parts.push(t('weeai.durationSeconds', { segundos: step.durationSec }));
  return parts.join(' · ');
};

const PlanCard: React.FC<PlanCardProps> = ({ experienceName, experienceId, plan, creditsEstimated, demo, pricingMode, pricing, quality, quoting, onQuality, busy, onCreate, onChange }) => {
  const { theme } = useTheme();
  const { t, formato, locale } = useIdioma();
  /* Lo que escribe el servidor —la explicación, los pasos, los niveles de calidad—, en el idioma de quien mira. */
  const leer = (texto: string): string => textoDelServidor(texto, { t, locale, experiencia: experienceId });
  /* Los niveles de calidad van por su id, que no cambia aunque cambie la frase. */
  const NIVEL: Record<string, string> = { standard: 'plan.calidadEstandar', high: 'plan.calidadAlta', max: 'plan.calidadMaxima' };
  const nivel = (option: { quality: string; label: string }): string => (NIVEL[option.quality] ? t(NIVEL[option.quality]) : leer(option.label));
  const costLabel =
    creditsEstimated === 0
      ? t('weeai.noCost')
      : `≈ ${formato.numero(creditsEstimated)} Credits${pricingMode === 'simulated' ? t('weeai.testPriceSuffix') : ''}`;
  const costHint =
    creditsEstimated > 0 ? t('weeai.creditsNote') : demo ? t('weeai.demoMode') : '';

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.accent + '1A', borderColor: theme.colors.accent }]}>
      <TextoEnMayusculas style={[styles.who, { color: theme.colors.accentDark }]}>{experienceName}</TextoEnMayusculas>
      <Text style={[styles.explain, { color: theme.colors.text }]}>{leer(plan.explainToUser)}</Text>

      <View style={styles.steps}>
        {plan.steps.map((step, index) => (
          <View key={step.id} style={styles.stepRow}>
            <View style={[styles.stepDot, { backgroundColor: theme.colors.accent }]}>
              <Text style={styles.stepNumber}>{index + 1}</Text>
            </View>
            <View style={styles.stepBody}>
              <Text style={[styles.stepText, { color: theme.colors.text }]}>{leer(step.purpose)}</Text>
              {(() => {
                const estimate = pricing?.steps.find((s) => s.stepId === step.id);
                if (!estimate) return null;
                const detail = stepDetail(estimate, t, leer);
                return (
                  <Text style={[styles.stepMeta, { color: theme.colors.textSecondary }]}>
                    {detail ? `${detail} · ` : ''}
                    {estimate.credits} Credits
                    {estimate.volumeDiscount ? ` · ${t('weeai.volumeDiscount', { descuento: estimate.volumeDiscount })}` : ''}
                  </Text>
                );
              })()}
            </View>
          </View>
        ))}
      </View>

      {!!pricing?.options && pricing.options.length > 1 && (
        <View style={styles.quality}>
          <TextoEnMayusculas style={[styles.qualityTitle, { color: theme.colors.textSecondary }]}>{t('weeai.quality')}</TextoEnMayusculas>
          <View style={styles.qualityRow}>
            {pricing.options.map((option) => {
              const active = (quality || pricing.options?.[0]?.quality) === option.quality;
              return (
                <TouchableOpacity
                  key={option.quality}
                  onPress={() => onQuality?.(option.quality)}
                  disabled={busy || quoting}
                  activeOpacity={0.8}
                  accessibilityLabel={t('weeai.optionCredits', { nombre: nivel(option), credits: option.credits })}
                  style={[
                    styles.qualityChip,
                    { borderColor: active ? theme.colors.accentDark : theme.colors.border },
                    active && { backgroundColor: theme.colors.accent },
                  ]}
                >
                  <Text style={[styles.qualityLabel, { color: active ? "#1F2937" : theme.colors.text }]}>{nivel(option)}</Text>
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
            accessibilityLabel={t('weeai.createWork')}
          >
            {busy ? <ActivityIndicator color="#1F2937" /> : <Text style={styles.createText}>{t('weeai.createWork')}</Text>}
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
