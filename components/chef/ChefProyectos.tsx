import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { CreatorJob, claveDelEstado } from '../../services/creatorService';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

const isWeb = Platform.OS === 'web';

interface Props {
  /** Lo que la persona ha cocinado de verdad. Vacío es vacío: aquí no se inventa nada. */
  proyectos: CreatorJob[];
  onAbrir: (job: CreatorJob) => void;
  onVerTodos: () => void;
}

/**
 * MIS PROYECTOS.
 *
 * Al final de Weë Chef, después de las funciones: primero se cocina, luego se
 * mira lo hecho. Va en fila que se desliza y no en rejilla porque aquí no se
 * busca nada concreto —para eso está "Ver todos"—, se echa un vistazo.
 *
 * ── Sin fotos y sin inventar ─────────────────────────────────────────────────
 *
 * Cada pieza es una lámina lisa con el icono de su tipo, no una fotografía de
 * comida: las fotos que vaya a haber serán las de la persona, y hasta que las
 * haya no se pone una de mentira. Y si todavía no ha cocinado nada, lo que se
 * lee es eso mismo, no una galería de ejemplos que parecerían suyos.
 */
const ChefProyectos: React.FC<Props> = ({ proyectos, onAbrir, onVerTodos }) => {
  const { theme } = useTheme();
  const t = useT();

  return (
    <View style={styles.bloque}>
      <View style={styles.cabecera}>
        <Text style={[styles.seccion, { color: theme.colors.text }]}>{t('chef.projectsTitle')}</Text>
        <TouchableOpacity
          onPress={onVerTodos}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={t('chef.seeAll')}
          style={isWeb ? ({ cursor: 'pointer' } as any) : undefined}
        >
          <Text style={[styles.verTodos, { color: theme.colors.textSecondary }]}>{t('chef.seeAll')} →</Text>
        </TouchableOpacity>
      </View>

      {proyectos.length === 0 ? (
        <View style={[styles.vacio, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.vacioTexto, { color: theme.colors.text }]}>{t('chef.projectsEmpty')}</Text>
          <Text style={[styles.vacioPista, { color: theme.colors.textSecondary }]}>{t('chef.projectsEmptyHint')}</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fila}>
          {proyectos.map((job) => (
            <TouchableOpacity
              key={job.id}
              style={[styles.pieza, isWeb && ({ cursor: 'pointer' } as any)]}
              onPress={() => onAbrir(job)}
              activeOpacity={0.8}
              accessibilityRole="button"
              /* El objetivo lo escribió la persona: es contenido, no interfaz, y no pasa por el traductor. */
              accessibilityLabel={job.goal}
            >
              <View style={[styles.lamina, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Ionicons name="restaurant-outline" size={scale(28)} color={theme.colors.textSecondary} />
              </View>
              <Text style={[styles.titulo, { color: theme.colors.text }]} numberOfLines={2}>{job.goal}</Text>
              <Text style={[styles.estado, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {t(claveDelEstado[job.status])}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  bloque: { gap: SPACING.md },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
  },
  seccion: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold },
  verTodos: { fontSize: FONT_SIZE.sm },
  fila: { paddingHorizontal: SPACING.xl, gap: SPACING.md },
  pieza: { width: scale(132), gap: SPACING.xs },
  lamina: {
    width: '100%',
    height: scale(110),
    borderRadius: scale(16),
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  titulo: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, lineHeight: scale(18) },
  estado: { fontSize: FONT_SIZE.xs },
  vacio: {
    marginHorizontal: SPACING.xl,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: SPACING.xs,
  },
  vacioTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },
  vacioPista: { fontSize: FONT_SIZE.xs, lineHeight: scale(16) },
});

export default ChefProyectos;
