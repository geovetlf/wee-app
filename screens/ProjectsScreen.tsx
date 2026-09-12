import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { projectsService, WeeProject, PROJECT_EMOJIS } from '../services/projectsService';
import CreatorShell from '../components/creator/CreatorShell';
import { SectionTitle } from '../components/creator/ui';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

/**
 * Mis proyectos (docs/CREATOR-BUILD.md §17): "Mi restaurante", "Mi canción",
 * "Mi logo"… cada uno agrupa creaciones de distintos especialistas.
 */
const ProjectsScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const { isDesktop } = useResponsive();

  const [projects, setProjects] = useState<WeeProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(PROJECT_EMOJIS[0]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }
    try {
      setProjects(await projectsService.list(user.uid));
    } catch (error) {
      console.warn('No se pudieron cargar los proyectos:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const create = async () => {
    if (!user) {
      navigation.navigate('Login');
      return;
    }
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const project = await projectsService.create(user.uid, name, emoji);
      setName('');
      setCreating(false);
      navigation.navigate('Project', { id: project.id });
    } catch (error) {
      console.warn('No se pudo crear el proyecto:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <CreatorShell activeId="projects" overline="🤖 WEË AI" title="📁 Mis proyectos" breadcrumb="WEË AI">
      <View style={[styles.intro, { backgroundColor: theme.colors.accent + '1A', borderColor: theme.colors.accent }]}>
        <Text style={[styles.introTitle, { color: theme.colors.text }]}>Tus creaciones, ordenadas por proyecto</Text>
        <Text style={[styles.introText, { color: theme.colors.textSecondary }]}>
          Un proyecto puede tener logo, fotos, anuncios, videos, música y documentos. Guarda cada resultado en el suyo desde "Guardar en proyecto".
        </Text>
      </View>

      <View style={styles.section}>
        <SectionTitle title="Proyectos" action={creating ? 'Cancelar' : 'Nuevo proyecto'} onAction={() => setCreating((v) => !v)} />

        {creating && (
          <View style={[styles.newBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.accent }]}>
            <View style={styles.emojis}>
              {PROJECT_EMOJIS.map((item) => (
                <TouchableOpacity
                  key={item}
                  onPress={() => setEmoji(item)}
                  style={[styles.emojiButton, { borderColor: emoji === item ? theme.colors.accent : theme.colors.border }]}
                  accessibilityLabel={`Emoji ${item}`}
                >
                  <Text style={styles.emojiText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.newRow}>
              <TextInput
                style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
                value={name}
                onChangeText={setName}
                placeholder="Ejemplo: Mi restaurante"
                placeholderTextColor={theme.colors.textSecondary}
                onSubmitEditing={create}
                autoFocus
                accessibilityLabel="Nombre del proyecto"
              />
              <TouchableOpacity onPress={create} disabled={!name.trim() || saving} style={[styles.createButton, { backgroundColor: theme.colors.accent }]} activeOpacity={0.85} accessibilityLabel="Crear proyecto">
                <Text style={styles.createText}>{saving ? '…' : 'Crear'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {loading ? (
          <ActivityIndicator color={theme.colors.accent} />
        ) : projects.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={styles.emptyEmoji}>📁</Text>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Todavía no tienes proyectos</Text>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>Crea el primero o guarda una creación en un proyecto desde su resultado.</Text>
            <TouchableOpacity onPress={() => setCreating(true)} style={[styles.createButton, { backgroundColor: theme.colors.accent, marginTop: SPACING.sm }]} activeOpacity={0.85}>
              <Text style={styles.createText}>Crear mi primer proyecto</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.grid, { marginHorizontal: -SPACING.xs }]}>
            {projects.map((project) => (
              <View key={project.id} style={{ width: isDesktop ? '33.33%' : '50%', padding: SPACING.xs }}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Project', { id: project.id })}
                  activeOpacity={0.8}
                  style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                  accessibilityLabel={project.name}
                >
                  <View style={[styles.cardEmoji, { backgroundColor: theme.colors.accent + '33' }]}>
                    <Text style={styles.cardEmojiText}>{project.emoji}</Text>
                  </View>
                  <Text style={[styles.cardName, { color: theme.colors.text }]} numberOfLines={2}>{project.name}</Text>
                  <View style={styles.cardFooter}>
                    <Text style={[styles.cardMeta, { color: theme.colors.textSecondary }]}>Abrir</Text>
                    <Ionicons name="arrow-forward" size={scale(14)} color={theme.colors.textSecondary} />
                  </View>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    </CreatorShell>
  );
};

const styles = StyleSheet.create({
  intro: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    gap: scale(4),
  },
  introTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
  },
  introText: {
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(20),
  },
  section: {
    gap: SPACING.md,
  },
  newBox: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  emojis: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(6),
  },
  emojiButton: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: scale(18),
  },
  newRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  input: {
    flex: 1,
    height: scale(42),
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    fontSize: FONT_SIZE.sm,
  },
  createButton: {
    height: scale(42),
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createText: {
    color: '#1F2937',
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
  empty: {
    alignItems: 'center',
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    gap: scale(6),
  },
  emptyEmoji: {
    fontSize: scale(40),
  },
  emptyTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
  },
  emptyText: {
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
    lineHeight: scale(20),
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  card: {
    minHeight: scale(140),
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  cardEmoji: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardEmojiText: {
    fontSize: scale(22),
  },
  cardName: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  cardMeta: {
    fontSize: FONT_SIZE.xs,
  },
});

export default ProjectsScreen;
