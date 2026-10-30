import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useIdioma } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { creditsService, CreditsBalance, CreditTransaction } from '../services/creditsService';
import { FilaDeMovimiento } from '../components/billetera/FilaDeMovimiento';
import { CREDITS_POR_USD } from '../constants/credits';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';

/** Cuántos movimientos recientes se enseñan aquí; el historial entero está en Mi billetera. */
const MOVIMIENTOS_RECIENTES = 5;

/**
 * Credits (ruta `CreditStore`, la de todos los enlaces «Recargar» de la app): una pantalla INFORMATIVA.
 *
 * Weë no vende paquetes ni planes de Credits (decisión de producto, 2026-10-29): los Credits son la unidad de consumo
 * y la referencia es US$ 1 = 100 Credits. Las recargas están cerradas en el servidor hasta que exista el sistema de
 * pagos definitivo, así que aquí no hay nada que comprar: el saldo, la conversión de referencia, el aviso de que las
 * recargas aún no están disponibles y los últimos movimientos. La app nunca escribe Credits.
 */
const CreditStoreScreen = () => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const { user } = useAuth();
  const nav = useNavigation();
  const insets = useSafeAreaInsets();

  const [account, setAccount] = useState<CreditsBalance | null>(null);
  const [movimientos, setMovimientos] = useState<CreditTransaction[]>([]);

  // Los Credits son por cuenta (uid de Auth): el Perfil Weë comparte el saldo
  const accountUid = user?.uid;

  useEffect(() => {
    if (!accountUid) return;
    const dejarSaldo = creditsService.subscribeToBalance(accountUid, setAccount);
    const dejarMovimientos = creditsService.subscribeToTransactions(accountUid, setMovimientos, MOVIMIENTOS_RECIENTES);
    return () => { dejarSaldo(); dejarMovimientos(); };
  }, [accountUid]);

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

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACING.xl }]} showsVerticalScrollIndicator={false}>
        {/* Saldo */}
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

        {/* Conversión de referencia */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>{t('credits.referenceRate')}</Text>
          <Text style={[styles.rate, { color: theme.colors.text }]}>
            {t('credits.referenceRateValue', {
              usd: formato.moneda(1, 'USD', { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
              creditos: formato.numero(CREDITS_POR_USD),
            })}
          </Text>
          <Text style={[styles.cardNote, { color: theme.colors.textSecondary }]}>{t('credits.referenceRateNote')}</Text>
        </View>

        {/* Las recargas, todavía no */}
        <View style={[styles.notice, { borderColor: '#F5B731' }]}>
          <Ionicons name="information-circle-outline" size={20} color="#F5B731" />
          <Text style={[styles.noticeText, { color: theme.colors.text }]}>{t('credits.purchasesComingSoon')}</Text>
        </View>

        {/* Últimos movimientos */}
        <View style={styles.sectionRow}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('credits.recentMovements')}</Text>
          <TouchableOpacity
            onPress={() => (nav as any).navigate('Wallet')}
            hitSlop={8}
            accessibilityRole="link"
            accessibilityLabel={t('credits.seeHistoryLabel')}
          >
            <Text style={styles.link}>{t('credits.seeHistory')}</Text>
          </TouchableOpacity>
        </View>
        {movimientos.length === 0 ? (
          <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>{t('credits.noMovements')}</Text>
        ) : (
          <View style={[styles.list, { borderColor: theme.colors.border }]}>
            {movimientos.map((m) => <FilaDeMovimiento key={m.id} item={m} />)}
          </View>
        )}
      </ScrollView>
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
  content: { padding: SPACING.lg },

  // Saldo
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

  // Conversión
  card: { padding: SPACING.lg, borderRadius: BORDER_RADIUS.lg, marginBottom: SPACING.md },
  cardLabel: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.medium, marginBottom: SPACING.xs },
  rate: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold },
  cardNote: { fontSize: FONT_SIZE.xs, marginTop: SPACING.sm, lineHeight: 18 },

  // Aviso
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.xl,
  },
  noticeText: { flex: 1, fontSize: FONT_SIZE.sm, lineHeight: 20 },

  // Movimientos
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  sectionTitle: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold },
  link: { color: '#F5B731', fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },
  list: { marginHorizontal: -SPACING.lg, borderTopWidth: StyleSheet.hairlineWidth },
  empty: { fontSize: FONT_SIZE.sm, paddingVertical: SPACING.md },
});

export default CreditStoreScreen;
