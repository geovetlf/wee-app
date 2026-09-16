import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import {
  AreaDeStudio, PUERTAS_DE_STUDIO, HERRAMIENTAS_POR_AREA, GRUPOS_DE_HERRAMIENTAS, HerramientaDeStudio,
} from '../../constants/studioTools';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

const isWeb = Platform.OS === 'web';

interface Props {
  area: AreaDeStudio;
  onVolver: () => void;
  /** Elegir una herramienta vuelve al compositor con esa intención puesta. */
  onElegir: (herramienta: HerramientaDeStudio) => void;
  /** Cuántas caben por fila. */
  porFila: number;
}

/**
 * LO QUE HAY DETRÁS DE UNA PUERTA.
 *
 * Las cinco primeras áreas enseñan sus herramientas en una lista; "Más
 * herramientas" las enseña por familias —imagen, video, audio, texto,
 * archivos—, que es la única forma de que cuarenta cosas no se lean como un
 * muro de botones. La diferencia no es de diseño: es que en un área sabes de
 * qué estás hablando y en "Más" estás buscando.
 *
 * ── Qué pasa al elegir una ───────────────────────────────────────────────────
 *
 * No abre otra pantalla ni pide más datos: vuelve al Studio con esa intención
 * puesta, y ahí es donde se escribe. El sitio donde se dice qué quieres es uno
 * solo —el compositor—, y una herramienta es la forma de llegar a él sabiendo
 * ya de qué va la cosa. Los ajustes cambian con ella, porque el área cambia.
 *
 * Nada de esto genera todavía: Weë Brain y el motor se conectan después. Lo que
 * existe hoy es el camino entero, para poder recorrerlo y ver si se entiende.
 */
const StudioPanel: React.FC<Props> = ({ area, onVolver, onElegir, porFila }) => {
  const { theme } = useTheme();
  const t = useT();

  const puerta = PUERTAS_DE_STUDIO.find((p) => p.id === area);
  const titulo = puerta?.marca ?? (puerta ? t(puerta.clave as string) : '');
  const esMas = area === 'more';

  const herramienta = (h: HerramientaDeStudio) => (
    <TouchableOpacity
      key={h.id + h.clave}
      style={[
        styles.hueco,
        { width: `${100 / porFila}%` as any },
      ]}
      onPress={() => onElegir(h)}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={t(h.clave)}
    >
      <View style={[
        styles.herramienta,
        { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
        isWeb && ({ cursor: 'pointer' } as any),
      ]}>
        <Ionicons name={h.icono as any} size={scale(22)} color={theme.colors.text} />
        <Text style={[styles.herramientaTexto, { color: theme.colors.text }]} numberOfLines={2}>{t(h.clave)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.panel}>
      {/* Cabecera: volver y el nombre del área. Sin nada más. */}
      <View style={styles.cabecera}>
        <TouchableOpacity
          onPress={onVolver}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          style={isWeb ? ({ cursor: 'pointer' } as any) : undefined}
        >
          <Ionicons name="chevron-back" size={scale(24)} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.titulo, { color: theme.colors.text }]}>{titulo}</Text>
      </View>

      {/*
        Los videos avisan de su límite aquí y no al final: es lo que cambia lo
        que vas a pedir, así que se dice antes de elegir, no después.
      */}
      {area === 'videos' && (
        <View style={[styles.nota, { backgroundColor: theme.colors.surface }]}>
          <Ionicons name="time-outline" size={scale(15)} color={theme.colors.textSecondary} />
          <Text style={[styles.notaTexto, { color: theme.colors.textSecondary }]}>{t('studio.vidLimit')}</Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.dentro}>
        {esMas ? (
          GRUPOS_DE_HERRAMIENTAS.map((grupo) => (
            <View key={grupo.id} style={styles.grupo}>
              <Text style={[styles.grupoTitulo, { color: theme.colors.textSecondary }]}>{t(grupo.clave)}</Text>
              <View style={styles.rejilla}>{grupo.herramientas.map(herramienta)}</View>
            </View>
          ))
        ) : (
          <View style={styles.rejilla}>
            {(HERRAMIENTAS_POR_AREA[area as Exclude<AreaDeStudio, 'more'>] ?? []).map(herramienta)}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  panel: { flex: 1 },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  titulo: { fontSize: scale(26), fontWeight: FONT_WEIGHT.bold, letterSpacing: scale(-0.4) },
  nota: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  notaTexto: { fontSize: FONT_SIZE.xs },
  dentro: { paddingHorizontal: SPACING.lg - SPACING.xs, paddingBottom: SPACING.xxxl, gap: SPACING.xl },
  grupo: { gap: SPACING.sm },
  grupoTitulo: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    textTransform: 'uppercase',
    letterSpacing: scale(0.5),
    paddingHorizontal: SPACING.xs + SPACING.sm,
  },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap' },
  hueco: { padding: SPACING.xs },
  herramienta: {
    borderRadius: scale(16),
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    minHeight: scale(96),
  },
  herramientaTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, lineHeight: scale(18) },
});

export default StudioPanel;
