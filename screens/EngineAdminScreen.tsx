import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useT } from '../contexts/IdiomaContext';
import { useResponsive } from '../hooks/useResponsive';
import { aiEngineService, EngineStatus, isPermissionDenied } from '../services/aiEngineService';
import { notify, confirmAction } from '../utils/notify';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

export const ENGINE_ADMIN_FLAG = 'wee.engine.admin';

const MODALITY_CLAVE: Record<string, string> = {
  text: 'engine.modalityText', vision: 'engine.modalityVision', image: 'engine.modalityImage',
  video: 'engine.modalityVideo', voice: 'engine.modalityVoice', music: 'engine.modalityMusic',
  doc: 'engine.modalityDoc',
};
const POLICY_CLAVE: Record<string, string> = {
  'quality-first': 'engine.policyQualityFirst', balanced: 'engine.policyBalanced', 'cost-first': 'engine.policyCostFirst',
};
const POLICIES = ['quality-first', 'balanced', 'cost-first'] as const;

/**
 * Panel de administración del WEË AI ENGINE: proveedores activos, claves,
 * salud, modelos, cadenas de fallback y ajustes. Solo administración.
 */
const EngineAdminScreen: React.FC = () => {
  const t = useT();
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { isDesktop } = useResponsive();
  const [status, setStatus] = useState<EngineStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await aiEngineService.status();
      setStatus(data);
      setDenied(false);
      try {
        await AsyncStorage.setItem(ENGINE_ADMIN_FLAG, '1');
      } catch {}
    } catch (e) {
      if (isPermissionDenied(e)) setDenied(true);
      else setError(t('engine.statusFailed'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (key: string, action: () => Promise<unknown>, done?: string) => {
    setBusy(key);
    try {
      await action();
      if (done) notify(done);
      await load();
    } catch (e) {
      notify(t('engine.changeFailed'), e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const toggleProvider = (id: string, enabled: boolean) => run(`provider:${id}`, () => aiEngineService.setProvider(id, { enabled }));

  const cyclePolicy = (capability: string, current: string) => {
    const next = POLICIES[(POLICIES.indexOf(current as any) + 1) % POLICIES.length];
    return run(`routing:${capability}`, () => aiEngineService.setRouting(capability, { policy: next }));
  };

  const seed = async () => {
    const ok = await confirmAction(t('settings.seedDefaults'), t('settings.seedDefaultsConfirm'), t('settings.seed'), false, t);
    if (!ok) return;
    await run('seed', () => aiEngineService.seedDefaults(false), t('engine.seedDone'));
  };

  const card = { backgroundColor: theme.colors.card, borderColor: theme.colors.border };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border, paddingTop: isDesktop ? SPACING.md : insets.top + SPACING.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7} accessibilityLabel={t('home.back')}>
          <Ionicons name="arrow-back" size={scale(24)} color={theme.colors.text} />
        </TouchableOpacity>
        {/* "Weë AI Engine" es el nombre del motor: marca, no se traduce. */}
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Weë AI Engine</Text>
        <TouchableOpacity onPress={load} style={styles.backButton} activeOpacity={0.7} accessibilityLabel={t('engine.refresh')}>
          <Ionicons name="refresh" size={scale(22)} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]} showsVerticalScrollIndicator={false}>
        {loading && !status ? (
          <ActivityIndicator color={theme.colors.accent} style={{ marginTop: SPACING.xl }} />
        ) : denied ? (
          <View style={[styles.card, card]}>
            <Text style={[styles.title, { color: theme.colors.text }]}>{t('engine.adminOnly')}</Text>
            <Text style={[styles.text, { color: theme.colors.textSecondary }]}>
              {t('engine.adminOnlyNote')}
            </Text>
          </View>
        ) : error ? (
          <View style={[styles.card, card]}>
            <Text style={[styles.text, { color: theme.colors.text }]}>{error}</Text>
          </View>
        ) : status ? (
          <>
            {/* Ajustes */}
            <View style={[styles.card, card]}>
              <Text style={[styles.title, { color: theme.colors.text }]}>{t('engine.settingsTitle')}</Text>
              {/*
                La línea entera viene del diccionario con sus huecos: las cifras
                y el nombre de la política entran dentro, y así cada idioma la
                ordena como le toque en vez de pegar seis trozos a mano.
              */}
              <Text style={[styles.text, { color: theme.colors.textSecondary }]}>
                {t('engine.settingsLine', {
                  precios: t(status.settings.pricingMode === 'simulated' ? 'engine.pricesTest' : 'engine.pricesReal'),
                  credits: status.settings.creditsPerUsd,
                  margen: Math.round(status.settings.margin * 100),
                  politica: POLICY_CLAVE[status.settings.defaultPolicy] ? t(POLICY_CLAVE[status.settings.defaultPolicy]) : status.settings.defaultPolicy,
                  demo: t(status.settings.allowMockFallback ? 'engine.yes' : 'engine.no'),
                })}
              </Text>
              {/* El nombre de las colecciones de Firestore se copia tal cual: es técnico. */}
              <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>
                {t('engine.configFrom', {
                  origen: status.source === 'firestore' ? 'Firestore (aiProviders · aiRouting · aiSettings)' : t('engine.sourceDefaults'),
                })}
              </Text>
              <View style={styles.actions}>
                <TouchableOpacity onPress={seed} disabled={busy !== null} style={[styles.button, { backgroundColor: theme.colors.accent }]} activeOpacity={0.85} accessibilityLabel={t('settings.seedDefaults')}>
                  <Text style={styles.buttonText}>{busy === 'seed' ? '…' : t('settings.seedDefaults')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => run('health', () => aiEngineService.resetHealth(), t('engine.healthReset'))} disabled={busy !== null} style={[styles.buttonGhost, { borderColor: theme.colors.border }]} activeOpacity={0.85} accessibilityLabel={t('engine.resetHealth')}>
                  <Text style={[styles.buttonGhostText, { color: theme.colors.text }]}>{t('engine.resetHealth')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Proveedores */}
            <Text style={[styles.section, { color: theme.colors.text }]}>{t('engine.providers')}</Text>
            {status.providers.map((p) => (
              <View key={p.id} style={[styles.card, card]}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.title, { color: theme.colors.text }]}>{p.name}</Text>
                    {/* El nombre del proveedor es de quien lo hizo y se copia tal cual. */}
                    <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>
                      {p.modalities.map((m) => (MODALITY_CLAVE[m] ? t(MODALITY_CLAVE[m]) : m)).join(' · ')} · {t('engine.priority', { numero: p.priority })}
                    </Text>
                  </View>
                  <Switch
                    value={p.enabled}
                    onValueChange={(value) => toggleProvider(p.id, value)}
                    disabled={busy !== null || p.id === 'mock'}
                    trackColor={{ false: theme.colors.border, true: theme.colors.accent + '66' }}
                    thumbColor={p.enabled ? theme.colors.accent : theme.colors.textSecondary}
                    accessibilityLabel={t(p.enabled ? 'engine.disable' : 'engine.enable', { proveedor: p.name })}
                  />
                </View>
                <View style={styles.badges}>
                  <Text style={[styles.badge, p.configured ? styles.badgeOk : styles.badgeOff]}>{t(p.configured ? 'engine.withKey' : 'engine.withoutKey')}</Text>
                  <Text style={[styles.badge, p.enabled ? styles.badgeOk : styles.badgeOff]}>{t(p.enabled ? 'engine.active' : 'engine.inactive')}</Text>
                  {p.health?.openUntil && p.health.openUntil > Date.now() ? <Text style={[styles.badge, styles.badgeWarn]}>{t('engine.pausedByFailures')}</Text> : null}
                  {/* Uno o varios: lo decide Intl.PluralRules, no un "(s)" pegado. */}
                  {p.health?.failures ? <Text style={[styles.badge, styles.badgeWarn]}>{t('engine.recentFailures', { contador: p.health.failures })}</Text> : null}
                </View>
                {p.note ? <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>{p.note}</Text> : null}
                {/* El id del modelo y su coste vienen del motor: se copian. */}
                {p.models.map((m) => (
                  <Text key={m.id} style={[styles.model, { color: theme.colors.textSecondary }]}>
                    {t('engine.modelLine', { id: m.id, calidad: m.quality, velocidad: m.speed, coste: m.cost })}
                    {m.maxDurationSec ? t('engine.upToSeconds', { segundos: m.maxDurationSec }) : ''}
                    {m.verified ? '' : t('engine.pendingVerification')}
                  </Text>
                ))}
              </View>
            ))}

            {/* Cadenas */}
            <Text style={[styles.section, { color: theme.colors.text }]}>{t('engine.chains')}</Text>
            {status.routing.map((r) => (
              <View key={r.capability} style={[styles.card, card]}>
                <View style={styles.row}>
                  <Text style={[styles.capability, { color: theme.colors.text }]}>{r.capability}</Text>
                  {/* `capability` es un identificador del motor: entra por hueco, sin traducir. */}
                  <TouchableOpacity onPress={() => cyclePolicy(r.capability, r.policy)} disabled={busy !== null} style={[styles.chip, { borderColor: theme.colors.accent, backgroundColor: theme.colors.accent + '1A' }]} activeOpacity={0.8} accessibilityLabel={t('engine.policyLabel', { capacidad: r.capability, politica: POLICY_CLAVE[r.policy] ? t(POLICY_CLAVE[r.policy]) : r.policy })}>
                    <Text style={[styles.chipText, { color: theme.colors.accentDark }]}>{POLICY_CLAVE[r.policy] ? t(POLICY_CLAVE[r.policy]) : r.policy}</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.text, { color: theme.colors.textSecondary }]}>
                  {r.chain.length ? r.chain.map((l) => l.provider + (l.model ? ` (${l.model})` : '')).join('  →  ') + '  →  demo' : t('engine.onlyDemo')}
                </Text>
              </View>
            ))}
            <Text style={[styles.meta, { color: theme.colors.textSecondary, textAlign: 'center' }]}>
              {t('engine.editNote', { capacidad: '{capacidad}' })}
            </Text>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 0.5,
  },
  backButton: { width: scale(40), height: scale(40), justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold },
  content: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xl * 2 },
  contentDesktop: { maxWidth: 820, width: '100%', alignSelf: 'center' },
  section: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, marginTop: SPACING.sm },
  card: { padding: SPACING.md, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, gap: scale(6) },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  title: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold },
  text: { fontSize: FONT_SIZE.sm, lineHeight: scale(20) },
  meta: { fontSize: FONT_SIZE.xs, lineHeight: scale(16) },
  model: { fontSize: FONT_SIZE.xs, lineHeight: scale(18) },
  capability: { flex: 1, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(6) },
  badge: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, paddingHorizontal: scale(8), paddingVertical: scale(2), borderRadius: BORDER_RADIUS.full, overflow: 'hidden' },
  badgeOk: { backgroundColor: '#DCFCE7', color: '#166534' },
  badgeOff: { backgroundColor: '#F3F4F6', color: '#6B7280' },
  badgeWarn: { backgroundColor: '#FEF3C7', color: '#92400E' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: scale(4) },
  button: { height: scale(38), paddingHorizontal: SPACING.md, borderRadius: BORDER_RADIUS.full, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#1F2937', fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold },
  buttonGhost: { height: scale(38), paddingHorizontal: SPACING.md, borderRadius: BORDER_RADIUS.full, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  buttonGhostText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold },
  chip: { paddingHorizontal: scale(10), paddingVertical: scale(4), borderRadius: BORDER_RADIUS.full, borderWidth: 1 },
  chipText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold },
});

export default EngineAdminScreen;
