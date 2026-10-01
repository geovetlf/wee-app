import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useIdioma } from '../contexts/IdiomaContext';
import { textoDelServidorLegible } from '../i18n/servidor';
import { useAuth } from '../contexts/AuthContext';
import { creditsService, describeTransaction, CreditsBalance, CreditTransaction } from '../services/creditsService';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';

/**
 * Mi billetera: saldo, acumulados e historial de Credits (docs/CREDITS.md).
 * Todo se lee del Credit Engine; la app nunca escribe Credits.
 */
const WalletScreen = () => {
  const { theme } = useTheme();
  const { t, formato, locale } = useIdioma();
  /*
   * El concepto de un movimiento, en el idioma de quien mira. Lo que no se reconoce —un concepto nuevo del servidor,
   * uno que escribió una persona de administración— se enseña tal cual en español y, en cualquier otro idioma, se
   * dice por su tipo («Credits brugt», «Credits fået tilbage»…): nadie lee español por accidente. Esa decisión es la de
   * todos los textos del servidor y vive con ellos (`textoDelServidorLegible`, i18n/servidor.ts): la pantalla no
   * pregunta en qué idioma está.
   */
  const tituloDe = (view: { title: string | null; tituloClave: string }): string => {
    if (!view.title) return t(view.tituloClave);
    return textoDelServidorLegible(view.title, { t, locale }) ?? t(view.tituloClave);
  };
  const { user } = useAuth();
  const nav = useNavigation();
  const insets = useSafeAreaInsets();

  const [account, setAccount] = useState<CreditsBalance | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);

  // Los Credits son por cuenta (uid de Auth): el Perfil Weë comparte el saldo
  const accountUid = user?.uid;

  useEffect(() => {
    if (!accountUid) return;
    const unsub1 = creditsService.subscribeToBalance(accountUid, setAccount);
    const unsub2 = creditsService.subscribeToTransactions(accountUid, setTransactions);
    return () => { unsub1(); unsub2(); };
  }, [accountUid]);

  /*
   * La fecha sale del LOCALE ACTIVO, no de uno fijo. Antes decía 'es-ES' y el
   * historial de dinero se veía en español aunque la app estuviera en coreano o
   * en chino. `formato` ya viene atado al locale que haya puesto la persona, que
   * es lo que pide el §8: nunca un `toLocaleDateString('es')` a mano.
   */
  const fmtDate = (ts: any) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return formato.fecha(d, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const renderTransaction = ({ item }: { item: CreditTransaction }) => {
    const view = describeTransaction(item);
    const isSpend = !view.positive;
    const color = isSpend ? '#EF4444' : '#22C55E';
    return (
      <View style={[styles.txnItem, { borderColor: theme.colors.border }]}>
        <View style={[styles.txnIcon, { backgroundColor: isSpend ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)' }]}>
          <Ionicons
            name={isSpend ? 'arrow-up' : 'arrow-down'}
            size={18}
            color={color}
          />
        </View>
        <View style={styles.txnBody}>
          {/*
            El título es lo que mandó el servidor —contenido, se pinta crudo— o,
            si no mandó nada, la clave que dice el servicio, resuelta aquí.
          */}
          <Text style={[styles.txnDesc, { color: theme.colors.text }]}>
            {tituloDe(view)}
          </Text>
          <Text style={[styles.txnDate, { color: theme.colors.textSecondary }]}>
            {fmtDate(item.createdAt)}{view.detalleClave ? ` · ${t(view.detalleClave)}` : ''}
          </Text>
        </View>
        <View style={styles.txnRight}>
          <Text style={[styles.txnAmount, { color }]}>
            {view.positive ? '+' : ''}{formato.numero(view.amount)}
          </Text>
          <Text style={[styles.txnBalance, { color: theme.colors.textSecondary }]}>{t('credits.balanceAfter', { saldo: formato.numero(view.balanceAfter) })}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.md, borderColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => nav.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{t('credits.myWallet')}</Text>
        <View style={{ width: 26 }} />
      </View>

      {/* Balance */}
      <View style={[styles.balanceCard, { backgroundColor: theme.dark ? '#1C1C1E' : '#F8F9FA' }]}>
        <View style={styles.balanceTop}>
          <View>
            <Text style={[styles.balanceLabel, { color: theme.colors.textSecondary }]}>{t('credits.currentBalance')}</Text>
            <View style={styles.balanceRow}>
              <Ionicons name="diamond" size={24} color="#F5B731" />
              <Text style={[styles.balanceAmount, { color: theme.colors.text }]}>{formato.numero(account?.balance ?? 0)}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => (nav as any).navigate('CreditStore')}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addBtnText}>{t('credits.topUp')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: '#22C55E' }]}>{formato.numero(account?.lifetimeEarned ?? 0)}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{t('credits.earned')}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{formato.numero(account?.lifetimeSpent ?? 0)}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{t('credits.spent')}</Text>
          </View>
        </View>
      </View>

      {/* History */}
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('credits.history')}</Text>

      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={t => t.id}
        contentContainerStyle={transactions.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={44} color={theme.colors.textSecondary} style={{ opacity: 0.4 }} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>{t('credits.noMovements')}</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
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

  // Balance
  balanceCard: {
    margin: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
  },
  balanceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  balanceLabel: { fontSize: FONT_SIZE.sm, marginBottom: SPACING.xs },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  balanceAmount: { fontSize: 36, fontWeight: FONT_WEIGHT.bold },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5B731',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.full,
  },
  addBtnText: { color: '#fff', fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },

  statsRow: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold },
  statLabel: { fontSize: FONT_SIZE.xs, marginTop: 2 },
  statDivider: { width: 1, height: 30 },

  // Section
  sectionTitle: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm },

  // Transaction
  txnItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: SPACING.md,
  },
  txnIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  txnBody: { flex: 1 },
  txnDesc: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
  txnDate: { fontSize: FONT_SIZE.xs, marginTop: 2 },
  txnRight: { alignItems: 'flex-end' },
  txnAmount: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold },
  txnBalance: { fontSize: FONT_SIZE.xs, marginTop: 2 },

  // Empty
  emptyContainer: { flex: 1, justifyContent: 'center' },
  empty: { alignItems: 'center', gap: SPACING.sm },
  emptyText: { fontSize: FONT_SIZE.sm },
});

export default WalletScreen;
