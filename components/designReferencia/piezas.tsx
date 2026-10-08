import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ScrollView, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import type { CapacidadDeDesign } from '../../constants/designReferencia';
import { CLAVE_DEL_NIVEL, EstadoDeLaCapacidad } from '../../utils/designReferencia';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

const isWeb = Platform.OS === 'web';

/** El nombre de un icono de la app. Los registros guardan el nombre como texto (es un identificador). */
export type NombreDeIcono = React.ComponentProps<typeof Ionicons>['name'];
export const nombreDeIcono = (n: string): NombreDeIcono => n as NombreDeIcono;

/** La mano sobre lo que se pulsa, en web. */
export const CURSOR: ViewStyle | null = isWeb ? { cursor: 'pointer' } : null;

/**
 * LAS PIEZAS DE LA REFERENCIA FUNCIONAL DE WEË DESIGN.
 *
 * Estética neutra y provisional, con los tokens del tema de siempre: esto dice
 * QUÉ hay y DÓNDE, no cómo será Weë Design (eso es la misión de identidad, que no
 * ha empezado). El amarillo se reserva para lo que crea, como en el resto de Weë.
 */

/** Un botón de capacidad: se pulse lo que se pulse, algo pasa —se usa, o se explica por qué no—. */
export const BotonDeCapacidad: React.FC<{
  cap: CapacidadDeDesign;
  estado: EstadoDeLaCapacidad;
  onPress: (cap: CapacidadDeDesign) => void;
  /** Solo icono y nombre corto, para barras. */
  compacto?: boolean;
}> = ({ cap, estado, onPress, compacto }) => {
  const { theme } = useTheme();
  const t = useT();
  const apagado = !estado.disponible;
  const nombre = t(cap.clave);
  return (
    <TouchableOpacity
      onPress={() => onPress(cap)}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={nombre}
      accessibilityHint={estado.motivo ? t(estado.motivo) : undefined}
      accessibilityState={{ disabled: apagado }}
      style={[
        compacto ? estilos.chip : estilos.fila,
        { borderColor: theme.colors.border, backgroundColor: apagado ? theme.colors.surface : theme.colors.card },
        CURSOR,
      ]}
    >
      <Ionicons name={nombreDeIcono(cap.icono)} size={scale(compacto ? 16 : 18)} color={apagado ? theme.colors.textSecondary : theme.colors.text} />
      <Text
        style={[compacto ? estilos.chipTexto : estilos.filaTexto, { color: apagado ? theme.colors.textSecondary : theme.colors.text }]}
        numberOfLines={compacto ? 1 : 2}
      >
        {nombre}
      </Text>
      {!compacto && <Insignia clave={CLAVE_DEL_NIVEL[estado.nivel]} tono={estado.disponible ? 'activo' : 'apagado'} />}
    </TouchableOpacity>
  );
};

/** Una etiqueta pequeña de estado. */
export const Insignia: React.FC<{ clave: string; tono?: 'activo' | 'apagado' | 'aviso'; valores?: Record<string, string | number> }> = ({ clave, tono = 'apagado', valores }) => {
  const { theme } = useTheme();
  const t = useT();
  const fondo = tono === 'activo' ? theme.colors.glow : tono === 'aviso' ? theme.colors.surface : theme.colors.surface;
  const borde = tono === 'activo' ? theme.colors.accent : tono === 'aviso' ? theme.colors.warning : theme.colors.border;
  return (
    <View style={[estilos.insignia, { backgroundColor: fondo, borderColor: borde }]}>
      <Text style={[estilos.insigniaTexto, { color: theme.colors.text }]} numberOfLines={1}>{t(clave, valores)}</Text>
    </View>
  );
};

/** Pestañas o segmentos: uno elegido, todos con nombre. */
export const Pestanas = <T extends string>({ opciones, elegida, onElegir, etiqueta, envolver = false }: {
  opciones: readonly { id: T; clave: string }[];
  elegida: T | null;
  onElegir: (id: T) => void;
  etiqueta: string;
  /**
   * En una columna estrecha (la lateral de la tableta): las pestañas bajan a otra línea en vez de cortarse al
   * borde. Por defecto, la fila se desplaza en horizontal, como en el escritorio.
   */
  envolver?: boolean;
}) => {
  const { theme } = useTheme();
  const t = useT();
  const botones = opciones.map((o) => {
    const activa = o.id === elegida;
    return (
      <TouchableOpacity
        key={o.id}
        onPress={() => onElegir(o.id)}
        activeOpacity={0.75}
        accessibilityRole="tab"
        accessibilityState={{ selected: activa }}
        accessibilityLabel={t(o.clave)}
        style={[
          estilos.pestana,
          { borderColor: activa ? theme.colors.text : theme.colors.border, backgroundColor: activa ? theme.colors.text : theme.colors.card },
          CURSOR,
        ]}
      >
        <Text style={[estilos.pestanaTexto, { color: activa ? theme.colors.background : theme.colors.text }]} numberOfLines={1}>{t(o.clave)}</Text>
      </TouchableOpacity>
    );
  });
  if (envolver) {
    return (
      <View accessibilityLabel={etiqueta} accessibilityRole="tablist" style={[estilos.pestanas, estilos.envueltas]}>{botones}</View>
    );
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={estilos.filaDePestanas} contentContainerStyle={estilos.pestanas} accessibilityLabel={etiqueta} accessibilityRole="tablist">
      {botones}
    </ScrollView>
  );
};

/** El título pequeño de un bloque. */
export const TituloDeBloque: React.FC<{ clave: string }> = ({ clave }) => {
  const { theme } = useTheme();
  const t = useT();
  return <Text style={[estilos.titulo, { color: theme.colors.textSecondary }]} accessibilityRole="header">{t(clave)}</Text>;
};

/** Un texto de ayuda, gris. */
export const Pista: React.FC<{ clave: string; valores?: Record<string, string | number> }> = ({ clave, valores }) => {
  const { theme } = useTheme();
  const t = useT();
  return <Text style={[estilos.pista, { color: theme.colors.textSecondary }]}>{t(clave, valores)}</Text>;
};

/** Un botón de texto: lleva a otro sitio de la referencia (nunca ejecuta una capacidad por sí solo). */
export const BotonDeAccion: React.FC<{
  clave: string;
  onPress: () => void;
  icono?: string;
  valores?: Record<string, string | number>;
  principal?: boolean;
}> = ({ clave, onPress, icono, valores, principal }) => {
  const { theme } = useTheme();
  const t = useT();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={t(clave, valores)}
      style={[
        estilos.chip,
        principal ? { backgroundColor: theme.colors.text, borderColor: theme.colors.text } : { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
        CURSOR,
      ]}
    >
      {icono ? <Ionicons name={nombreDeIcono(icono)} size={scale(16)} color={principal ? theme.colors.background : theme.colors.text} /> : null}
      <Text style={[estilos.chipTexto, { color: principal ? theme.colors.background : theme.colors.text }]} numberOfLines={1}>{t(clave, valores)}</Text>
    </TouchableOpacity>
  );
};

/**
 * LOS AJUSTES DE UN PASO, APAGADOS Y CON SU PORQUÉ. Se enseñan para que se vea qué
 * se podrá elegir —el paso «opciones» del recorrido— sin que nada se pueda tocar
 * mientras no haya quien lo cumpla. `etiquetas` son identificadores (formatos) y
 * se pintan tal cual.
 */
export const ListaDeAjustes: React.FC<{
  titulo: string;
  ajustes: readonly { id: string; clave: string; pista: string }[];
  motivo: string;
  etiquetas?: readonly string[];
}> = ({ titulo, ajustes, motivo, etiquetas }) => {
  const { theme } = useTheme();
  const t = useT();
  return (
    <View style={[estilos.ajustes, { borderColor: theme.colors.border }]} accessibilityState={{ disabled: true }}>
      <TituloDeBloque clave={titulo} />
      {ajustes.map((a) => (
        <View key={a.id} style={estilos.ajuste}>
          <Text style={[estilos.ajusteNombre, { color: theme.colors.textSecondary }]}>{t(a.clave)}</Text>
          <Text style={[estilos.pista, { color: theme.colors.textSecondary }]}>{t(a.pista)}</Text>
          {a.id === 'formato' && etiquetas?.length ? (
            <View style={estilos.etiquetas}>
              {etiquetas.map((e) => (
                <View key={e} style={[estilos.insignia, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <Text style={[estilos.insigniaTexto, { color: theme.colors.textSecondary }]}>{e}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ))}
      <Pista clave={motivo} />
    </View>
  );
};

/** Un panel: borde suave, fondo de tarjeta. */
export const Panel: React.FC<{ children: React.ReactNode; style?: StyleProp<ViewStyle> }> = ({ children, style }) => {
  const { theme } = useTheme();
  return <View style={[estilos.panel, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }, style]}>{children}</View>;
};

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    minHeight: 44,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  filaTexto: { flex: 1, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    minHeight: 40,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipTexto: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.medium, maxWidth: scale(180) },
  insignia: { paddingHorizontal: SPACING.sm, paddingVertical: scale(2), borderRadius: BORDER_RADIUS.full, borderWidth: StyleSheet.hairlineWidth },
  insigniaTexto: { fontSize: scale(11), fontWeight: FONT_WEIGHT.semibold },
  /* Una fila: sin esto, en una columna flexible el ScrollView horizontal crece en alto y estira cada pestaña en un óvalo. */
  filaDePestanas: { flexGrow: 0, flexShrink: 0 },
  pestanas: { gap: SPACING.xs, paddingVertical: SPACING.xs, alignItems: 'center' },
  envueltas: { flexDirection: 'row', flexWrap: 'wrap' },
  pestana: { height: 36, minHeight: 36, minWidth: 44, paddingHorizontal: SPACING.md, justifyContent: 'center', borderRadius: BORDER_RADIUS.full, borderWidth: StyleSheet.hairlineWidth },
  pestanaTexto: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold },
  titulo: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, marginTop: SPACING.sm },
  pista: { fontSize: FONT_SIZE.xs, lineHeight: scale(17) },
  panel: { borderRadius: BORDER_RADIUS.lg, borderWidth: StyleSheet.hairlineWidth, padding: SPACING.md, gap: SPACING.sm },
  ajustes: { gap: SPACING.xs, padding: SPACING.sm, borderRadius: BORDER_RADIUS.md, borderWidth: StyleSheet.hairlineWidth, borderStyle: 'dashed' },
  ajuste: { gap: scale(2) },
  ajusteNombre: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginTop: scale(2) },
});
