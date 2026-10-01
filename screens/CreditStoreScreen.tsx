import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useIdioma } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { creditsService, CREDIT_PACKAGES, CreditsBalance, CreditPackage } from '../services/creditsService';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';

/**
 * Tienda de Credits (docs/CREDITS.md §10). La app solo elige el paquete: el
 * servidor valida la compra y acredita los Credits. Mientras no haya pagos
 * conectados, la "recarga de prueba" la resuelve el proveedor `test` (solo dev).
 */
const CreditStoreScreen = () => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const { user } = useAuth();
  const nav = useNavigation();
  const insets = useSafeAreaInsets();

  const [account, setAccount] = useState<CreditsBalance | null>(null);
  const [packages, setPackages] = useState<CreditPackage[]>(CREDIT_PACKAGES);
  const [selectedPkg, setSelectedPkg] = useState<string>('plus');
  const [purchasing, setPurchasing] = useState(false);

  // Los Credits son por cuenta (uid de Auth): el Perfil Weë comparte el saldo
  const accountUid = user?.uid;

  useEffect(() => {
    if (!accountUid) return;
    return creditsService.subscribeToBalance(accountUid, setAccount);
  }, [accountUid]);

  // Los paquetes vigentes los decide el servidor; si no responde, se muestran los locales
  useEffect(() => {
    let cancelled = false;
    creditsService
      .getCosts()
      .then(({ packages: fromServer }) => {
        if (!cancelled && fromServer.length > 0) setPackages(fromServer);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const notify = (title: string, message: string) => {
    if (Platform.OS === 'web') window.alert(message);
    else Alert.alert(title, message);
  };

  const handlePurchase = async (pkg: CreditPackage) => {
    if (!accountUid || purchasing) return;
    setPurchasing(true);
    try {
      // Sin pagos conectados todavía: recarga de prueba validada por el servidor (solo dev)
      const result = await creditsService.purchase(pkg.id, 'test');
      notify(t('credits.testTopUpReady'), t('credits.testTopUpDone', { cantidad: formato.numero(result.credits) }));
    } catch (e) {
      const code = String((e as any)?.details?.code || (e as any)?.code || '');
      const message = code.includes('PURCHASE_INVALID') || code.includes('unimplemented') || code.includes('NOT_IMPLEMENTED')
        ? t('credits.purchasesComingSoon')
        : t('credits.topUpFailed');
      notify(t('credits.topUpFailedTitle'), message);
    }
    setPurchasing(false);
  };

  const selected = packages.find(p => p.id === selectedPkg) || packages[0];

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.md, borderColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => nav.goBack()} hitSlop={8}>
          <Ionicons name="close" size={26} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{t('credits.title')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Balance card */}
        <View style={[styles.balanceCard, { backgroundColor: theme.dark ? '#1C1C1E' : '#F8F9FA' }]}>
          <Text style={[styles.balanceLabel, { color: theme.colors.textSecondary }]}>{t('credits.yourBalance')}</Text>
          <View style={styles.balanceRow}>
            <Ionicons name="diamond" size={28} color="#F5B731" />
            <Text style={[styles.balanceAmount, { color: theme.colors.text }]}>
              {formato.numero(account?.balance ?? 0)}
            </Text>
          </View>
          <Text style={[styles.balanceSub, { color: theme.colors.textSecondary }]}>{t('credits.available')}</Text>
        </View>

        {/* Precios de prueba + historial */}
        <View style={styles.costsRow}>
          <View style={[styles.costChip, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="flask-outline" size={16} color={theme.colors.text} />
            <Text style={[styles.costText, { color: theme.colors.text }]}>{t('credits.testPrices')}</Text>
          </View>
          <TouchableOpacity
            style={[styles.costChip, { backgroundColor: theme.colors.surface }]}
            onPress={() => (nav as any).navigate('Wallet')}
            activeOpacity={0.8}
            accessibilityLabel={t('credits.seeHistoryLabel')}
          >
            <Ionicons name="time-outline" size={16} color={theme.colors.text} />
            <Text style={[styles.costText, { color: theme.colors.text }]}>{t('credits.seeHistory')}</Text>
          </TouchableOpacity>
        </View>

        {/* Packages */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('credits.testTopUp')}</Text>

        {packages.map((pkg) => {
          const isSelected = selected?.id === pkg.id;
          return (
            <TouchableOpacity
              key={pkg.id}
              style={[
                styles.packageCard,
                { backgroundColor: theme.colors.surface, borderColor: isSelected ? '#F5B731' : 'transparent' },
              ]}
              onPress={() => setSelectedPkg(pkg.id)}
              activeOpacity={0.8}
            >
              {!!pkg.badgeClave && (
                <View style={[styles.badge, { backgroundColor: pkg.popular ? '#F5B731' : '#22C55E' }]}>
                  <Text style={styles.badgeText}>{t(pkg.badgeClave)}</Text>
                </View>
              )}

              <View style={styles.packageLeft}>
                <Ionicons name="diamond" size={22} color="#F5B731" />
                <View>
                  <Text style={[styles.packageName, { color: theme.colors.text }]}>{pkg.name || (pkg.nombreClave ? t(pkg.nombreClave) : '')}</Text>
                  <Text style={[styles.packageCredits, { color: theme.colors.textSecondary }]}>
                    {pkg.credits} Credits
                  </Text>
                </View>
              </View>

              <View style={styles.packageRight}>
                <Text style={[styles.packagePrice, { color: theme.colors.text }]}>{t('credits.free')}</Text>
                <Text style={[styles.packagePer, { color: theme.colors.textSecondary }]}>
                  {t('credits.testTopUp')}
                </Text>
              </View>

              {isSelected && (
                <View style={styles.checkMark}>
                  <Ionicons name="checkmark-circle" size={24} color="#F5B731" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Terms */}
        <Text style={[styles.terms, { color: theme.colors.textSecondary }]}>
          {t('credits.terms')}
        </Text>
      </ScrollView>

      {/* Buy button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.md, backgroundColor: theme.colors.background }]}>
        <TouchableOpacity
          style={[styles.buyBtn, { opacity: purchasing ? 0.6 : 1 }]}
          onPress={() => {
            if (selected) handlePurchase(selected);
          }}
          disabled={purchasing || !selected}
          activeOpacity={0.8}
        >
          <Ionicons name="diamond" size={20} color="#fff" />
          <Text style={styles.buyBtnText}>
            {t('credits.topUpButton', { cantidad: selected?.credits ?? 0 })}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold },
  content: { padding: SPACING.lg, paddingBottom: 100 },

  // Balance
  balanceCard: {
    alignItems: 'center',
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.lg,
  },
  balanceLabel: { fontSize: FONT_SIZE.sm, marginBottom: SPACING.sm },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  balanceAmount: { fontSize: 40, fontWeight: FONT_WEIGHT.bold },
  balanceSub: { fontSize: FONT_SIZE.sm, marginTop: SPACING.xs },

  // Costs
  costsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.xl },
  costChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  costText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.medium },

  // Section
  sectionTitle: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, marginBottom: SPACING.md },

  // Package card
  packageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.sm,
    borderWidth: 2,
    overflow: 'hidden',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderBottomLeftRadius: BORDER_RADIUS.sm,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: FONT_WEIGHT.bold },
  packageLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  packageName: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold },
  packageCredits: { fontSize: FONT_SIZE.xs },
  packageRight: { alignItems: 'flex-end', marginRight: 28 },
  packagePrice: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold },
  packagePer: { fontSize: FONT_SIZE.xs },
  checkMark: { position: 'absolute', right: SPACING.md },

  // Terms
  terms: { fontSize: FONT_SIZE.xs, textAlign: 'center', marginTop: SPACING.xl, lineHeight: 18 },

  // Footer
  footer: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(0,0,0,0.1)' },
  buyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: '#F5B731',
    paddingVertical: 16,
    borderRadius: BORDER_RADIUS.full,
  },
  buyBtnText: { color: '#fff', fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold },
});

export default CreditStoreScreen;
