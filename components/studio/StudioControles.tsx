import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { FAMILIAS_DE_CAMARA, ComandoDeCamara } from '../../constants/camaraCinematica';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

const isWeb = Platform.OS === 'web';

/** Lo elegido, por ruta del lenguaje creativo: `movement.type` → `push_in`. */
export type ControlesElegidos = Record<string, string>;

interface Props {
  /** Qué familias se enseñan. Las de la experiencia elegida, y solo esas. */
  familias: readonly string[];
  elegido: ControlesElegidos;
  onElegir: (ruta: string, valor: string) => void;
  /** Los alias escribibles, en pequeño bajo cada nombre. Por defecto sí. */
  conAlias?: boolean;
}

/**
 * CÁMARA Y CINEMÁTICA — LOS CONTROLES, CUANDO YA SIGNIFICAN ALGO.
 *
 * Esta es la tercera capa del Studio, y la última. No se llega a ella desde la
 * portada: se llega después de decir qué se quiere hacer, y solo aparecen los
 * controles que esa cosa usa. Un retrato abre tres filas; un vídeo
 * cinematográfico abre ocho; un cartel no abre ninguna.
 *
 * ── Por qué no están todos siempre ──────────────────────────────────────────
 *
 * Porque juntos son más de cincuenta opciones. Puestas de golpe no son potencia:
 * son un panel técnico, y un panel técnico obliga a aprender la herramienta
 * antes de poder usarla. Weë Studio hace lo contrario —la herramienta aprende a
 * ayudar—, así que cada control espera a que haya una razón para verlo.
 *
 * ── Los alias se ven, y para eso están ──────────────────────────────────────
 *
 * Debajo de cada nombre va su forma escrita: `/pushin`, `/goldenhour`. Quien
 * prefiera tocar, toca; quien prefiera escribir, ya sabe cómo se escribe. Son
 * dos caminos al mismo sitio, y el sitio es un valor del lenguaje creativo de
 * Weë: nada de esto ejecuta nada por su cuenta.
 *
 * ── Cada fila se desliza ────────────────────────────────────────────────────
 *
 * Como en los ajustes: envueltas, diez opciones ocupan cuatro renglones en un
 * teléfono de 360 y la pantalla vuelve a parecer un formulario. Deslizando,
 * cada opción conserva su tamaño y la que asoma cortada dice que hay más. El
 * desplazamiento es de la fila, así que la pantalla no se mueve de lado.
 */
const StudioControles: React.FC<Props> = ({ familias, elegido, onElegir, conAlias = true }) => {
  const { theme } = useTheme();
  const t = useT();

  const abiertas = FAMILIAS_DE_CAMARA.filter((f) => familias.includes(f.id));
  if (abiertas.length === 0) return null;

  const pildora = (comando: ComandoDeCamara) => {
    const puesta = elegido[comando.ruta] === comando.valor;
    return (
      <TouchableOpacity
        key={comando.alias}
        style={[
          styles.pildora,
          {
            backgroundColor: puesta ? theme.colors.accent : theme.colors.surface,
            borderColor: puesta ? theme.colors.accentDark : theme.colors.border,
          },
          isWeb && ({ cursor: 'pointer' } as any),
        ]}
        onPress={() => onElegir(comando.ruta, comando.valor)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={t(comando.clave)}
        accessibilityState={{ selected: puesta }}
      >
        <Ionicons
          name={comando.icono as any}
          size={scale(15)}
          color={puesta ? '#1F2937' : theme.colors.textSecondary}
        />
        <View>
          <Text style={[styles.nombre, { color: puesta ? '#1F2937' : theme.colors.text }]}>{t(comando.clave)}</Text>
          {/* El alias es un identificador: se escribe igual en todos los idiomas. */}
          {conAlias && (
            <Text style={[styles.alias, { color: puesta ? 'rgba(31,41,55,0.6)' : theme.colors.textSecondary }]}>
              {comando.alias}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.bloque}>
      {abiertas.map((familia) => (
        <View key={familia.id} style={styles.familia}>
          <Text style={[styles.titulo, { color: theme.colors.textSecondary }]}>{t(familia.clave)}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.fila}
            keyboardShouldPersistTaps="handled"
          >
            {familia.comandos.map(pildora)}
          </ScrollView>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  bloque: { gap: SPACING.lg },
  familia: { gap: SPACING.sm },
  titulo: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    textTransform: 'uppercase',
    letterSpacing: scale(0.6),
    paddingHorizontal: SPACING.xl,
  },
  fila: { paddingHorizontal: SPACING.xl, gap: SPACING.sm },
  pildora: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    /* 44: lo que mide un dedo. Sin `scale()`, que un dedo no encoge. */
    minHeight: 44,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  nombre: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
  alias: { fontSize: scale(10), marginTop: scale(1) },
});

export default StudioControles;
