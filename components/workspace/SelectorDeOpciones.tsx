import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, OPACITY } from '../../constants/design';
import { scale } from '../../utils/scale';

const isWeb = Platform.OS === 'web';

export interface OpcionElegible<T extends string = string> {
  readonly id: T;
  readonly etiqueta: string;
  /** Una segunda línea pequeña: «Rápido», «Reels · TikTok». */
  readonly detalle?: string;
  readonly icono?: string;
  /** Si se puede elegir HOY. Lo que no, se ve —apagado— y dice por qué. */
  readonly disponible: boolean;
  /** Por qué no se puede, en palabras de la persona. Nunca un código ni un proveedor. */
  readonly porque?: string;
}

/**
 * ELEGIR UNA COSA ENTRE VARIAS, DICIENDO LA VERDAD SOBRE CADA UNA.
 *
 * Calidad, duración, formato, resolución, estilo: todas se eligen igual. Lo que
 * no está disponible no se esconde ni se cambia por otra cosa a escondidas —eso
 * sería un respaldo silencioso—: se ve apagado, con el borde a trazos, no se deja
 * tocar y dice por qué debajo, una sola vez por motivo.
 *
 * Dos formas: `pildoras` (5 s · 8 s · 10 s) y `tarjetas` (720p Rápido · 1080p…).
 */
function SelectorDeOpciones<T extends string>({
  opciones, elegida, onElegir, forma = 'pildoras', etiqueta, columnas,
}: {
  opciones: readonly OpcionElegible<T>[];
  elegida: T | null;
  onElegir: (id: T) => void;
  forma?: 'pildoras' | 'tarjetas';
  /** Cómo se llama el grupo, para quien no lo ve («Duración»). */
  etiqueta: string;
  /** En tarjetas, cuántas por fila. Sin él, las que quepan. */
  columnas?: number;
}) {
  const { theme } = useTheme();
  /* Cada motivo una vez: tres opciones apagadas por lo mismo no son tres avisos. */
  const motivos = Array.from(new Set(opciones.filter((o) => !o.disponible && o.porque).map((o) => o.porque as string)));

  return (
    <View style={styles.bloque} accessibilityRole="radiogroup" accessibilityLabel={etiqueta}>
      <View style={[styles.fila, forma === 'tarjetas' && styles.filaTarjetas]}>
        {opciones.map((o) => {
          const esta = o.id === elegida && o.disponible;
          const ancho = forma === 'tarjetas' && columnas ? { flexBasis: `${100 / columnas - 3}%` as const, flexGrow: 1 } : null;
          return (
            <TouchableOpacity
              key={o.id}
              onPress={() => o.disponible && onElegir(o.id)}
              disabled={!o.disponible}
              activeOpacity={0.8}
              accessibilityRole="radio"
              accessibilityLabel={o.detalle ? `${o.etiqueta}, ${o.detalle}` : o.etiqueta}
              accessibilityHint={o.disponible ? undefined : o.porque}
              accessibilityState={{ selected: esta, checked: esta, disabled: !o.disponible }}
              style={[
                forma === 'tarjetas' ? styles.tarjeta : styles.pildora,
                ancho,
                {
                  backgroundColor: esta ? theme.colors.glow : theme.colors.card,
                  borderColor: esta ? theme.colors.accent : theme.colors.border,
                },
                !o.disponible && styles.apagada,
                isWeb && ({ cursor: o.disponible ? 'pointer' : 'not-allowed' } as object),
              ]}
            >
              {!!o.icono && (
                <Ionicons name={o.icono as any} size={scale(forma === 'tarjetas' ? 20 : 15)} color={esta ? theme.colors.accent : theme.colors.textSecondary} />
              )}
              <Text style={[styles.etiqueta, { color: esta ? theme.colors.accent : theme.colors.text }]} numberOfLines={1}>{o.etiqueta}</Text>
              {!!o.detalle && forma === 'tarjetas' && (
                <Text style={[styles.detalle, { color: theme.colors.textSecondary }]} numberOfLines={2}>{o.detalle}</Text>
              )}
              {!o.disponible && forma === 'tarjetas' && (
                <Ionicons name="lock-closed-outline" size={scale(12)} color={theme.colors.textSecondary} style={styles.candado} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      {motivos.map((m) => (
        <View key={m} style={styles.motivo}>
          <Ionicons name="information-circle-outline" size={scale(14)} color={theme.colors.textSecondary} />
          <Text style={[styles.motivoTexto, { color: theme.colors.textSecondary }]}>{m}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bloque: { gap: SPACING.sm },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  filaTarjetas: { gap: SPACING.sm },
  pildora: {
    minHeight: 40, minWidth: scale(52), paddingHorizontal: SPACING.md, borderRadius: BORDER_RADIUS.md, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs,
  },
  tarjeta: {
    minWidth: scale(84), minHeight: scale(64), padding: SPACING.md, borderRadius: BORDER_RADIUS.md, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  apagada: { borderStyle: 'dashed', opacity: OPACITY.disabled },
  etiqueta: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold as any },
  detalle: { fontSize: scale(11), textAlign: 'center' },
  candado: { position: 'absolute', top: 6, right: 6 },
  motivo: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.xs },
  motivoTexto: { flex: 1, fontSize: FONT_SIZE.xs, lineHeight: FONT_SIZE.xs * 1.45 },
});

export default SelectorDeOpciones;
