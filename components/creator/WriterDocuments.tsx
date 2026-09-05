import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { documentsService, WeeDocument, describeUpdated } from '../../services/documentsService';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';
import { SectionTitle } from './ui';

/** "Mis documentos" de Weë Writer + botón para abrir el editor. */
const WriterDocuments: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const [docs, setDocs] = useState<WeeDocument[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      documentsService.list().then((list) => {
        if (!cancelled) setDocs(list.slice(0, 5));
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <SectionTitle title="Mis documentos" action="Nuevo documento" onAction={() => navigation.navigate('WriterEditor', {})} />
      {docs.length === 0 ? (
        <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>
          Todavía no tienes documentos. Escribe uno nuevo o pídele a Weë que empiece por ti.
        </Text>
      ) : (
        docs.map((doc) => (
          <TouchableOpacity
            key={doc.id}
            onPress={() => navigation.navigate('WriterEditor', { docId: doc.id })}
            activeOpacity={0.8}
            style={[styles.row, { borderTopColor: theme.colors.border }]}
            accessibilityLabel={doc.title}
          >
            <View style={[styles.icon, { backgroundColor: theme.colors.accent + '33' }]}>
              <Ionicons name="document-text-outline" size={scale(18)} color={theme.colors.accentDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>{doc.title}</Text>
              <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>{describeUpdated(doc.updatedAt)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={scale(18)} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        ))
      )}
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
  empty: {
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(20),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  icon: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  meta: {
    fontSize: FONT_SIZE.xs,
  },
});

export default WriterDocuments;
