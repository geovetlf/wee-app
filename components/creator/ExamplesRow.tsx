import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useResponsive } from '../../hooks/useResponsive';
import { SpecialistExample } from '../../constants/specialists';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';
import MockMedia from './MockMedia';
import { SectionTitle } from './ui';

interface ExamplesRowProps {
  title: string;
  examples: SpecialistExample[];
  onPressItem?: (example: SpecialistExample) => void;
  action?: string;
  onAction?: () => void;
}

/** Fila horizontal de ejemplos (imágenes simuladas hasta que haya proveedores reales). */
const ExamplesRow: React.FC<ExamplesRowProps> = ({ title, examples, onPressItem, action, onAction }) => {
  const { theme } = useTheme();
  const { isDesktop } = useResponsive();
  const cardWidth = isDesktop ? scale(172) : scale(148);

  return (
    <View style={styles.container}>
      <SectionTitle title={title} action={action} onAction={onAction} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {examples.map((example) => (
          <TouchableOpacity
            key={example.title}
            onPress={onPressItem ? () => onPressItem(example) : undefined}
            disabled={!onPressItem}
            activeOpacity={0.8}
            style={[styles.card, { width: cardWidth, backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
          >
            <MockMedia
              emoji={example.emoji}
              tone={example.tone}
              kind={example.kind}
              meta={example.meta}
              aspectRatio={example.kind === 'beforeAfter' ? 1.2 : 1}
              style={styles.media}
            />
            <View style={styles.caption}>
              <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>{example.title}</Text>
              {!!example.subtitle && (
                <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>{example.subtitle}</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: SPACING.md,
  },
  row: {
    gap: SPACING.md,
    paddingRight: SPACING.lg,
  },
  card: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  media: {
    borderRadius: 0,
  },
  caption: {
    padding: SPACING.sm,
    gap: scale(1),
  },
  title: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
  },
  subtitle: {
    fontSize: scale(11),
  },
});

export default ExamplesRow;
