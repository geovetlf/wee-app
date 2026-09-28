import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useIdioma } from '../../contexts/IdiomaContext';
import { useAuth } from '../../contexts/AuthContext';
import { useProducciones } from '../../hooks/useProducciones';
import { useProyectosDeWeeAi } from '../../hooks/useProyectosDeWeeAi';
import { useCaminosDeCreacion } from '../../hooks/useCaminosDeCreacion';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

const isWeb = Platform.OS === 'web';

interface Reciente {
  readonly clave: string;
  readonly nombre: string;
  readonly detalle: string;
  readonly icono: string;
  readonly emoji?: string;
  readonly cuando: number;
  readonly abrir: () => void;
}

const enMs = (fecha: unknown): number => {
  if (typeof fecha === 'number') return fecha;
  const f = fecha as { toMillis?: () => number } | null;
  return f?.toMillis ? f.toMillis() : 0;
};

/**
 * LO ÚLTIMO EN LO QUE TRABAJASTE: producciones de Filmmaker y proyectos de Weë
 * AI, juntos y por fecha, los más recientes primero. Para seguir donde lo
 * dejaste sin ir a buscarlo. Sin sesión no hay nada tuyo, y no se pinta.
 */
const ProyectosRecientes: React.FC<{ cuantos?: number; onVerTodos: () => void }> = ({ cuantos = 3, onVerTodos }) => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const { aCreator } = useCaminosDeCreacion();
  const producciones = useProducciones('active', !!user);
  const weeai = useProyectosDeWeeAi();

  const recientes = useMemo<readonly Reciente[]>(() => {
    const todos: Reciente[] = [
      ...producciones.producciones.map((p) => ({
        clave: `p-${p.productionId}`, nombre: p.title, icono: 'film-outline', cuando: p.updatedAt,
        detalle: formato.lista([t('workspace.kindProduction'), p.aspectRatio]),
        abrir: () => aCreator('Production', { productionId: p.productionId }),
      })),
      ...weeai.proyectos.map((p) => ({
        clave: `w-${p.id}`, nombre: p.name, icono: 'folder-open-outline', emoji: p.emoji, cuando: enMs(p.updatedAt),
        detalle: t('workspace.kindWeeAiProject'),
        abrir: () => navigation.navigate('Project', { id: p.id }),
      })),
    ];
    return todos.sort((a, b) => b.cuando - a.cuando).slice(0, cuantos);
  }, [producciones.producciones, weeai.proyectos, formato, t, aCreator, navigation, cuantos]);

  if (!user || recientes.length === 0) return null;

  return (
    <View style={styles.bloque}>
      <View style={styles.cabecera}>
        <Text style={[styles.titulo, { color: theme.colors.text }]} accessibilityRole="header">{t('workspace.recentProjects')}</Text>
        <TouchableOpacity onPress={onVerTodos} accessibilityRole="button" accessibilityLabel={t('workspace.seeAllProjects')}>
          <Text style={[styles.enlace, { color: theme.colors.accent }]}>{t('workspace.seeAllProjects')}</Text>
        </TouchableOpacity>
      </View>
      {recientes.map((r) => (
        <TouchableOpacity
          key={r.clave}
          onPress={r.abrir}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t('workspace.openItem', { nombre: r.nombre })}
          style={[styles.fila, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }, isWeb && ({ cursor: 'pointer' } as object)]}
        >
          <View style={[styles.icono, { backgroundColor: theme.colors.surface }]}>
            {r.emoji ? <Text style={styles.emoji}>{r.emoji}</Text> : <Ionicons name={r.icono as any} size={scale(20)} color={theme.colors.accent} />}
          </View>
          <View style={styles.textos}>
            <Text style={[styles.nombre, { color: theme.colors.text }]} numberOfLines={1}>{r.nombre}</Text>
            <Text style={[styles.detalle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {r.cuando ? formato.lista([r.detalle, formato.tiempoRelativo(r.cuando)]) : r.detalle}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={scale(18)} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  bloque: { gap: SPACING.sm },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titulo: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold as any },
  enlace: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold as any },
  fila: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.sm, borderRadius: BORDER_RADIUS.md, borderWidth: 1 },
  icono: { width: 48, height: 48, borderRadius: BORDER_RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: scale(22) },
  textos: { flex: 1, minWidth: 0, gap: 2 },
  nombre: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold as any },
  detalle: { fontSize: FONT_SIZE.xs },
});

export default ProyectosRecientes;
