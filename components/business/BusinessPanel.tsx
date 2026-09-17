import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { AccionDeBusiness } from '../../constants/businessModules';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

const isWeb = Platform.OS === 'web';

/**
 * LA CABECERA DE UN MÓDULO.
 *
 * Volver y el nombre, y nada más. Un módulo no es otra pantalla: es un nivel más
 * dentro de Weë Business, así que volver es instantáneo y no se acumula una pila
 * de rutas por pasear entre módulos. Es la misma decisión —y el mismo dibujo—
 * que en los paneles de Weë Studio y Weë Chef.
 */
export const CabeceraDelModulo: React.FC<{ nombre: string; pista: string; onVolver: () => void }> = ({
  nombre, pista, onVolver,
}) => {
  const { theme } = useTheme();
  const t = useT();
  return (
    <View style={styles.cabecera}>
      <View style={styles.cabeceraFila}>
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
        {/* El nombre del módulo es de producto: no pasa por el traductor. */}
        <Text style={[styles.titulo, { color: theme.colors.text }]} numberOfLines={1}>{nombre}</Text>
      </View>
      <Text style={[styles.pista, { color: theme.colors.textSecondary }]}>{pista}</Text>
    </View>
  );
};

/** Un bloque con su rótulo: "Brand Kit", "Gastos", "Oportunidades"… */
export const Bloque: React.FC<{ titulo: string; pista?: string; derecha?: React.ReactNode; children: React.ReactNode }> = ({
  titulo, pista, derecha, children,
}) => {
  const { theme } = useTheme();
  return (
    <View style={styles.bloque}>
      <View style={styles.bloqueCabecera}>
        <View style={styles.bloqueTextos}>
          <Text style={[styles.bloqueTitulo, { color: theme.colors.text }]}>{titulo}</Text>
          {!!pista && <Text style={[styles.bloquePista, { color: theme.colors.textSecondary }]}>{pista}</Text>}
        </View>
        {derecha}
      </View>
      {children}
    </View>
  );
};

/**
 * LO QUE TODAVÍA NO HAY.
 *
 * Un estado vacío dice qué falta y cómo empezar, no "sin datos". Mientras Weë
 * Business no tenga dónde guardar productos, gastos o el negocio, esto es lo que
 * se ve la primera vez, y es verdad.
 */
export const Vacio: React.FC<{ texto: string; pista?: string }> = ({ texto, pista }) => {
  const { theme } = useTheme();
  return (
    <View style={[styles.vacio, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.vacioTexto, { color: theme.colors.text }]}>{texto}</Text>
      {!!pista && <Text style={[styles.vacioPista, { color: theme.colors.textSecondary }]}>{pista}</Text>}
    </View>
  );
};

/**
 * LAS ACCIONES DE UN MÓDULO, EN FILAS.
 *
 * Filas y no tarjetas: dentro de un módulo ya se sabe de qué va la cosa, y una
 * lista se lee más rápido que una cuadrícula. El chevrón dice que LLEVA a algún
 * sitio. Cada una abre la conversación de siempre con su objetivo.
 */
export const ListaDeAcciones: React.FC<{
  acciones: AccionDeBusiness[];
  onElegir: (accion: AccionDeBusiness) => void;
}> = ({ acciones, onElegir }) => {
  const { theme } = useTheme();
  const t = useT();
  return (
    <View style={[styles.lista, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      {acciones.map((accion, i) => (
        <TouchableOpacity
          key={accion.id}
          onPress={() => onElegir(accion)}
          activeOpacity={0.75}
          style={[styles.fila, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border }]}
          accessibilityRole="button"
          accessibilityLabel={t(accion.claveTitulo)}
        >
          <Ionicons name={accion.icono as any} size={scale(20)} color={theme.colors.text} />
          <View style={styles.filaTextos}>
            <Text style={[styles.filaTitulo, { color: theme.colors.text }]} numberOfLines={1}>{t(accion.claveTitulo)}</Text>
            {!!accion.claveHint && (
              <Text style={[styles.filaPista, { color: theme.colors.textSecondary }]} numberOfLines={2}>{t(accion.claveHint)}</Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={scale(16)} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      ))}
    </View>
  );
};

/** Una píldora de las que se eligen: un formato, una pieza del Brand Kit, una familia de gasto. */
export const Pastilla: React.FC<{
  etiqueta: string;
  icono?: string;
  puesta?: boolean;
  onPress: () => void;
}> = ({ etiqueta, icono, puesta, onPress }) => {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.pastilla,
        {
          backgroundColor: puesta ? theme.colors.glow : theme.colors.card,
          borderColor: puesta ? theme.colors.accent : theme.colors.border,
        },
        isWeb && ({ cursor: 'pointer' } as any),
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: !!puesta }}
      accessibilityLabel={etiqueta}
    >
      {!!icono && <Ionicons name={icono as any} size={scale(15)} color={puesta ? theme.colors.accentDark : theme.colors.text} />}
      <Text
        style={[styles.pastillaTexto, { color: puesta ? theme.colors.accentDark : theme.colors.text }, puesta && styles.pastillaPuesta]}
        numberOfLines={1}
      >
        {etiqueta}
      </Text>
    </TouchableOpacity>
  );
};

/** El botón amarillo de un módulo: la acción principal, una sola por pantalla. */
export const BotonPrincipal: React.FC<{ etiqueta: string; icono?: string; onPress: () => void }> = ({
  etiqueta, icono, onPress,
}) => {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.principal, { backgroundColor: theme.colors.accent }, isWeb && ({ cursor: 'pointer' } as any)]}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
    >
      {!!icono && <Ionicons name={icono as any} size={scale(18)} color="#1F2937" />}
      <Text style={styles.principalTexto}>{etiqueta}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cabecera: { gap: SPACING.xs, paddingBottom: SPACING.xs },
  cabeceraFila: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  titulo: { fontSize: scale(26), fontWeight: FONT_WEIGHT.bold, letterSpacing: scale(-0.4), flexShrink: 1 },
  pista: { fontSize: FONT_SIZE.base, lineHeight: scale(21), paddingLeft: scale(32) },
  bloque: { gap: SPACING.md },
  bloqueCabecera: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: SPACING.sm },
  bloqueTextos: { flex: 1, gap: scale(2) },
  bloqueTitulo: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold },
  bloquePista: { fontSize: FONT_SIZE.xs, lineHeight: scale(17) },
  vacio: {
    padding: SPACING.lg,
    borderRadius: scale(20),
    borderWidth: StyleSheet.hairlineWidth,
    gap: SPACING.xs,
  },
  vacioTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },
  vacioPista: { fontSize: FONT_SIZE.xs, lineHeight: scale(17) },
  lista: {
    borderRadius: scale(20),
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    minHeight: 56,
  },
  filaTextos: { flex: 1, gap: scale(1) },
  filaTitulo: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.medium },
  filaPista: { fontSize: FONT_SIZE.xs, lineHeight: scale(16) },
  pastilla: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    minHeight: 40,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pastillaTexto: { fontSize: FONT_SIZE.sm },
  pastillaPuesta: { fontWeight: FONT_WEIGHT.semibold },
  principal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    minHeight: 50,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.full,
  },
  principalTexto: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold, color: '#1F2937' },
});
