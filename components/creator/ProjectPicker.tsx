import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useIdioma } from '../../contexts/IdiomaContext';
import { useAuth } from '../../contexts/AuthContext';
import { projectsService, WeeProject, PROJECT_EMOJIS, suggestProjectName } from '../../services/projectsService';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';
import EspacioDeEscritura from '../EspacioDeEscritura';

interface ProjectPickerProps {
  visible: boolean;
  /** Objetivo de la creación: sirve para sugerir el nombre del proyecto nuevo. */
  goal: string;
  onClose: () => void;
  onPick: (project: WeeProject) => void;
}

/** "Guardar en proyecto": elige uno existente o crea uno nuevo con nombre sugerido. */
const ProjectPicker: React.FC<ProjectPickerProps> = ({ visible, goal, onClose, onPick }) => {
  const { theme } = useTheme();
  const { t, locale } = useIdioma();
  const { user } = useAuth();
  const [projects, setProjects] = useState<WeeProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(PROJECT_EMOJIS[0]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!visible || !user) return;
    setLoading(true);
    setName(suggestProjectName(goal, locale));
    projectsService
      .list(user.uid)
      .then(setProjects)
      .catch((error) => console.warn('No se pudieron cargar los proyectos:', error))
      .finally(() => setLoading(false));
  }, [visible, user, goal, locale]);

  const create = async () => {
    if (!user || !name.trim() || creating) return;
    setCreating(true);
    try {
      const project = await projectsService.create(user.uid, name, emoji);
      onPick(project);
    } catch (error) {
      console.warn('No se pudo crear el proyecto:', error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/*
        Una hoja dentro de un Modal se dibuja en su propia capa: no hereda el
        acomodo de la pantalla que hay debajo. El campo "Nombre del proyecto"
        vive al fondo de la hoja, justo donde sale el teclado.
      */}
      <EspacioDeEscritura style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('weeai.close')} />
        <View style={[styles.sheet, { backgroundColor: theme.colors.card }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>{t('weeai.saveToProject')}</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel={t('weeai.close')} style={styles.close}>
              <Ionicons name="close" size={scale(22)} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.list} contentContainerStyle={{ gap: SPACING.sm }} keyboardShouldPersistTaps="handled">
            {loading ? (
              <ActivityIndicator color={theme.colors.accent} />
            ) : (
              projects.map((project) => (
                <TouchableOpacity
                  key={project.id}
                  onPress={() => onPick(project)}
                  activeOpacity={0.8}
                  style={[styles.row, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                  accessibilityLabel={project.name}
                >
                  <Text style={styles.rowEmoji}>{project.emoji}</Text>
                  <Text style={[styles.rowName, { color: theme.colors.text }]} numberOfLines={1}>{project.name}</Text>
                  <Ionicons name="chevron-forward" size={scale(18)} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          <View style={[styles.newBox, { borderColor: theme.colors.accent, backgroundColor: theme.colors.accent + '14' }]}>
            <Text style={[styles.newTitle, { color: theme.colors.text }]}>{t('weeai.newProject')}</Text>
            <View style={styles.emojis}>
              {PROJECT_EMOJIS.map((item) => (
                <TouchableOpacity
                  key={item}
                  onPress={() => setEmoji(item)}
                  style={[styles.emojiButton, { borderColor: emoji === item ? theme.colors.accent : theme.colors.border, backgroundColor: theme.colors.card }]}
                  accessibilityLabel={t('weeai.emojiLabel', { emoji: item })}
                >
                  <Text style={styles.emojiText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.newRow}>
              <TextInput
                style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                value={name}
                onChangeText={setName}
                placeholder={t('weeai.projectName')}
                placeholderTextColor={theme.colors.textSecondary}
                onSubmitEditing={create}
                accessibilityLabel={t('weeai.projectName')}
              />
              <TouchableOpacity onPress={create} disabled={!name.trim() || creating} style={[styles.createButton, { backgroundColor: theme.colors.accent }]} activeOpacity={0.85} accessibilityLabel={t('weeai.createProject')}>
                <Text style={styles.createText}>{creating ? '…' : t('weeai.create')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </EspacioDeEscritura>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(31,41,55,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    gap: SPACING.md,
    maxHeight: '85%',
    width: '100%',
    maxWidth: scale(560),
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },
  close: {
    width: scale(36),
    height: scale(36),
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    maxHeight: scale(220),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  rowEmoji: {
    fontSize: scale(20),
  },
  rowName: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  newBox: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  newTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
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
});

export default ProjectPicker;
