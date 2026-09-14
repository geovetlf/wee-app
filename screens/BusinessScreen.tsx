import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useIdioma } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { SpecialistAction } from '../constants/specialists';
import { useEspecialista } from '../hooks/useEspecialista';
import {
  BUSINESS_NETWORKS,
  BUSINESS_MESSAGES,
  BUSINESS_STATS,
  BUSINESS_SHORTCUTS,
  getBusinessCalendar,
  BusinessNetwork,
  CustomerMessage,
} from '../constants/businessMock';
import CreatorShell from '../components/creator/CreatorShell';
import SpecialistHero from '../components/creator/SpecialistHero';
import ActionGrid from '../components/creator/ActionGrid';
import IdeaBox from '../components/creator/IdeaBox';
import { SectionTitle, Chip, ClosingBanner } from '../components/creator/ui';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

const NETWORK_ICON: Record<string, string> = {
  instagram: 'logo-instagram',
  facebook: 'logo-facebook',
  tiktok: 'logo-tiktok',
  youtube: 'logo-youtube',
  whatsapp: 'logo-whatsapp',
};

/**
 * Weë Business (docs/CREATOR-BUILD.md §9): marketing, ventas y estrategia en un
 * solo lugar. "Mis redes", calendario, mensajes y resultados son simulados
 * hasta que las redes habiliten sus APIs oficiales; los flujos ya funcionan.
 */
const BusinessScreen: React.FC = () => {
  const { theme } = useTheme();
  const { t, locale } = useIdioma();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const { isDesktop } = useResponsive();
  const spec = useEspecialista('business');

  const [networks, setNetworks] = useState<BusinessNetwork[]>(BUSINESS_NETWORKS.map((n) => ({ ...n })));
  const [adding, setAdding] = useState(false);
  const [messages, setMessages] = useState<CustomerMessage[]>(BUSINESS_MESSAGES);
  /* El calendario se rehace al cambiar de idioma: los días llevan su nombre. */
  const calendar = useMemo(() => getBusinessCalendar(locale), [locale]);

  if (!spec) return null;

  const startFlow = (goal?: string, preset?: SpecialistAction['preset']) => {
    if (!user) {
      navigation.navigate('Login');
      return;
    }
    navigation.navigate('CreatorFlow', { experienceId: 'business', goal, preset });
  };

  const toggleNetwork = (id: string) =>
    setNetworks((prev) => prev.map((n) => (n.id === id ? { ...n, connected: !n.connected } : n)));

  const connectNetwork = (id: string) => {
    setNetworks((prev) => prev.map((n) => (n.id === id ? { ...n, connected: true } : n)));
    setAdding(false);
  };

  const replyTo = (message: CustomerMessage) => {
    setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, replied: true } : m)));
    startFlow(t('business.replyGoal', { nombre: message.name, red: message.network, mensaje: message.text }), { questionId: 'what', optionId: 'reply' });
  };

  const connected = networks.filter((n) => n.connected);
  const available = networks.filter((n) => !n.connected);

  return (
    <CreatorShell activeId="business" overline="🤖 Weë AI" title="💼 Weë Business" breadcrumb="Weë AI">
      <SpecialistHero spec={spec} />

      {/* Atajos de la barra de la referencia */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shortcuts}>
        {BUSINESS_SHORTCUTS.map((item) => (
          <Chip key={item.id} label={t(item.clave)} icon={item.icon} onPress={() => startFlow(t(item.claveObjetivo), { questionId: 'what', optionId: item.optionId })} />
        ))}
      </ScrollView>

      <View style={[styles.columns, isDesktop && styles.columnsDesktop]}>
        {/* Mis redes sociales */}
        <View style={[styles.card, styles.grow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <SectionTitle title={t('business.mySocialAccounts')} action={t('business.manageAccounts')} onAction={() => setAdding((v) => !v)} />
          <View style={styles.networks}>
            {connected.map((n) => (
              <TouchableOpacity
                key={n.id}
                onPress={() => toggleNetwork(n.id)}
                activeOpacity={0.8}
                style={[styles.network, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                accessibilityLabel={t('business.networkConnected', { red: n.name })}
              >
                <Ionicons name={n.icon as any} size={scale(22)} color={n.color} />
                <Text style={[styles.networkName, { color: theme.colors.text }]}>{n.name}</Text>
                <View style={styles.networkStatus}>
                  <View style={styles.dot} />
                  <Text style={styles.networkConnected}>{t('business.connected')}</Text>
                </View>
                <Text style={[styles.networkHandle, { color: theme.colors.textSecondary }]} numberOfLines={1}>{n.handle}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => setAdding((v) => !v)}
              activeOpacity={0.8}
              style={[styles.network, styles.networkAdd, { borderColor: theme.colors.accent }]}
              accessibilityLabel={t('business.connectAnother')}
            >
              <Ionicons name="add-circle-outline" size={scale(24)} color={theme.colors.accentDark} />
              <Text style={[styles.networkName, { color: theme.colors.text }]}>{t('business.connectAnother')}</Text>
            </TouchableOpacity>
          </View>
          {adding && (
            <View style={styles.addRow}>
              {available.length === 0 ? (
                <Text style={[styles.note, { color: theme.colors.textSecondary }]}>{t('business.allConnected')}</Text>
              ) : (
                available.map((n) => <Chip key={n.id} label={n.name} icon={n.icon} onPress={() => connectNetwork(n.id)} />)
              )}
            </View>
          )}
          <Text style={[styles.note, { color: theme.colors.textSecondary }]}>
            {t('business.simulatedConnection')}
          </Text>
        </View>

        {/* Weë está listo */}
        <View style={styles.side}>
          <IdeaBox config={spec.idea} onSubmit={(text) => startFlow(text)} />
        </View>
      </View>

      <View style={styles.section}>
        <SectionTitle title={spec.gridTitle} />
        <ActionGrid actions={spec.actions} layout={spec.actionLayout} onPress={(action) => startFlow(action.goal, action.preset)} />
      </View>

      <View style={[styles.columns, isDesktop && styles.columnsDesktop]}>
        {/* Calendario */}
        <View style={[styles.card, styles.grow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <SectionTitle title={t('business.postCalendar')} action={t('business.seeFullCalendar')} onAction={() => startFlow(t('business.calendarGoal'), { questionId: 'what', optionId: 'schedule' })} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.calendar}>
            {calendar.map((day) => (
              <TouchableOpacity
                key={day.key}
                onPress={() => startFlow(t('business.scheduleGoal', { dia: day.weekday, fecha: day.label, publicacion: day.post.title }), { questionId: 'what', optionId: 'schedule' })}
                activeOpacity={0.8}
                style={styles.day}
                accessibilityLabel={t('business.dayLabel', { dia: day.weekday, fecha: day.label })}
              >
                <Text style={[styles.dayName, { color: theme.colors.text }]}>{day.weekday}</Text>
                <Text style={[styles.dayDate, { color: theme.colors.textSecondary }]}>{day.label}</Text>
                <View style={[styles.dayPost, { backgroundColor: day.post.highlight ? theme.colors.accent : theme.colors.surface, borderColor: theme.colors.border }]}>
                  <Text style={styles.dayEmoji}>{day.post.emoji}</Text>
                  <Text style={[styles.dayTitle, { color: theme.colors.text }]} numberOfLines={2}>{day.post.title}</Text>
                </View>
                <View style={styles.dayMeta}>
                  <Ionicons name={NETWORK_ICON[day.post.network] as any} size={scale(12)} color={theme.colors.textSecondary} />
                  <Text style={[styles.dayTime, { color: theme.colors.textSecondary }]}>{day.post.time}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Mensajes */}
        <View style={[styles.card, styles.side, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <SectionTitle title={t('business.customerMessages')} action={t('business.seeAllMessages')} onAction={() => startFlow(t('business.messagesGoal'), { questionId: 'what', optionId: 'reply' })} />
          {messages.map((m) => (
            <View key={m.id} style={[styles.message, { borderTopColor: theme.colors.border }]}>
              <Ionicons name={NETWORK_ICON[m.network] as any} size={scale(16)} color={theme.colors.textSecondary} />
              <View style={[styles.messageAvatar, { backgroundColor: theme.colors.accent + '33' }]}>
                <Text style={styles.messageEmoji}>{m.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.messageHead}>
                  <Text style={[styles.messageName, { color: theme.colors.text }]} numberOfLines={1}>{m.name}</Text>
                  <Text style={[styles.messageTime, { color: theme.colors.textSecondary }]}>{m.claveHora ? t(m.claveHora) : m.time}</Text>
                </View>
                <Text style={[styles.messageText, { color: theme.colors.textSecondary }]} numberOfLines={2}>{m.text}</Text>
              </View>
              <TouchableOpacity
                onPress={() => replyTo(m)}
                activeOpacity={0.8}
                style={[styles.replyPill, m.replied ? { backgroundColor: '#E8F5EE' } : { backgroundColor: theme.colors.accent }]}
                accessibilityLabel={t(m.replied ? 'business.repliedTo' : 'business.replyTo', { nombre: m.name })}
              >
                <Text style={[styles.replyText, { color: m.replied ? '#2F7D4F' : '#1F2937' }]}>{t(m.replied ? 'business.replied' : 'business.reply')}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>

      {/* Resultados */}
      <View style={styles.section}>
        <SectionTitle title={t('business.resultsThisWeek')} />
        <View style={styles.stats}>
          {BUSINESS_STATS.map((stat) => (
            <View key={stat.id} style={[styles.stat, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{t(stat.clave)}</Text>
              <Text style={styles.statDelta}>{stat.delta}</Text>
            </View>
          ))}
        </View>
        <ClosingBanner
          emoji="🚀"
          title={t('business.onTrack')}
          subtitle={t('business.onTrackNote')}
          button={t('business.seeDetailedAnalysis')}
          onPress={() => startFlow(t('business.analysisGoal'), { questionId: 'what', optionId: 'analyze' })}
        />
      </View>

      <Text style={[styles.footer, { color: theme.colors.textSecondary }]}>{t('weeai.tellWee')}</Text>
    </CreatorShell>
  );
};

const styles = StyleSheet.create({
  shortcuts: {
    gap: SPACING.sm,
    paddingRight: SPACING.lg,
  },
  columns: {
    gap: SPACING.lg,
  },
  columnsDesktop: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  grow: {
    flex: 1,
    minWidth: 0,
  },
  side: {
    width: '100%',
    maxWidth: scale(380),
    gap: SPACING.md,
  },
  card: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.md,
  },
  section: {
    gap: SPACING.md,
  },
  networks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  network: {
    width: scale(150),
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    gap: scale(4),
  },
  networkAdd: {
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  networkName: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
  networkStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2FB784',
  },
  networkConnected: {
    color: '#2F7D4F',
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },
  networkHandle: {
    fontSize: FONT_SIZE.xs,
  },
  addRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  note: {
    fontSize: FONT_SIZE.xs,
    lineHeight: scale(16),
  },
  calendar: {
    gap: SPACING.sm,
    paddingRight: SPACING.md,
  },
  day: {
    width: scale(96),
    gap: scale(4),
  },
  dayName: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
  },
  dayDate: {
    fontSize: scale(10),
  },
  dayPost: {
    aspectRatio: 1,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    padding: SPACING.sm,
    justifyContent: 'space-between',
  },
  dayEmoji: {
    fontSize: scale(22),
  },
  dayTitle: {
    fontSize: scale(11),
    fontWeight: FONT_WEIGHT.semibold,
  },
  dayMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  dayTime: {
    fontSize: scale(10),
  },
  message: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  messageAvatar: {
    width: scale(34),
    height: scale(34),
    borderRadius: scale(17),
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageEmoji: {
    fontSize: scale(16),
  },
  messageHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  messageName: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    flex: 1,
  },
  messageTime: {
    fontSize: scale(10),
  },
  messageText: {
    fontSize: FONT_SIZE.xs,
  },
  replyPill: {
    paddingHorizontal: SPACING.sm,
    minHeight: scale(28),
    borderRadius: BORDER_RADIUS.full,
    justifyContent: 'center',
  },
  replyText: {
    fontSize: scale(11),
    fontWeight: FONT_WEIGHT.bold,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  stat: {
    flexGrow: 1,
    minWidth: scale(140),
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    gap: scale(2),
  },
  statValue: {
    fontSize: scale(22),
    fontWeight: FONT_WEIGHT.bold,
  },
  statLabel: {
    fontSize: FONT_SIZE.xs,
  },
  statDelta: {
    color: '#2F7D4F',
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
  },
  footer: {
    fontSize: FONT_SIZE.xs,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
});

export default BusinessScreen;
