import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { CLAVE_DE_ESTADO_MUSIC, EstadoDeCapa } from '../../utils/musicModel';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

/**
 * WEË MUSIC — PIEZAS PEQUEÑAS COMPARTIDAS POR TODAS LAS CAPAS.
 * Sin librerías de interfaz nuevas: ficha de estado, aviso de ejemplo, botón, deslizador táctil y forma de onda.
 * Todos los textos llegan ya traducidos o salen de claves `music.*`.
 */

const TONO_DE_ESTADO: Record<EstadoDeCapa, 'ok' | 'aviso' | 'error' | 'neutro'> = {
  vacio: 'neutro', borrador: 'neutro', preparado: 'ok', pendienteIntegracion: 'aviso', noCompatible: 'aviso', enProgreso: 'ok',
  completado: 'ok', error: 'error', cancelado: 'neutro', sinPermisos: 'error', archivoIncompatible: 'error',
  proveedorNoConfigurado: 'aviso', costeDesconocido: 'aviso', resultadoNoDisponible: 'aviso',
};

/** La ficha que nombra el estado real de una capa. Es siempre texto, nunca solo color. */
export const ChipDeEstado: React.FC<{ estado: EstadoDeCapa }> = ({ estado }) => {
  const { theme } = useTheme();
  const t = useT();
  const tono = TONO_DE_ESTADO[estado];
  const color = tono === 'ok' ? theme.colors.success : tono === 'error' ? theme.colors.error : tono === 'aviso' ? theme.colors.warning : theme.colors.textSecondary;
  return (
    <View style={[s.chipEstado, { borderColor: color + '88', backgroundColor: color + '18' }]} accessible accessibilityLabel={t(`music.${CLAVE_DE_ESTADO_MUSIC[estado]}`)}>
      <Text style={[s.chipEstadoTexto, { color: theme.colors.text }]}>{t(`music.${CLAVE_DE_ESTADO_MUSIC[estado]}`)}</Text>
    </View>
  );
};

/** La franja que marca algo como EJEMPLO DE DISEÑO: nunca contenido de la persona. */
export const AvisoDeEjemplo: React.FC = () => {
  const { theme } = useTheme();
  const t = useT();
  return (
    <View style={[s.aviso, { borderColor: theme.colors.warning + '88', backgroundColor: theme.colors.warning + '14' }]} accessibilityRole="alert">
      <Ionicons name="flask-outline" size={scale(16)} color={theme.colors.warning} />
      <Text style={[s.avisoTexto, { color: theme.colors.text }]}>{t('music.exampleNotice')}</Text>
    </View>
  );
};

export const Nota: React.FC<{ children: React.ReactNode; fuerte?: boolean }> = ({ children, fuerte }) => {
  const { theme } = useTheme();
  return <Text style={[s.nota, { color: fuerte ? theme.colors.text : theme.colors.textSecondary }]}>{children}</Text>;
};

export const TituloDeBloque: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme } = useTheme();
  return <Text accessibilityRole="header" style={[s.titulo, { color: theme.colors.text }]}>{children}</Text>;
};

export const Tarjeta: React.FC<{ children: React.ReactNode; destacada?: boolean }> = ({ children, destacada }) => {
  const { theme } = useTheme();
  return (
    <View style={[s.tarjeta, { backgroundColor: theme.colors.card, borderColor: destacada ? theme.colors.accent : theme.colors.border }]}>{children}</View>
  );
};

interface BotonProps {
  texto: string;
  onPress?: () => void;
  icono?: string;
  principal?: boolean;
  desactivado?: boolean;
  /** Por qué está desactivado, dicho a quien no lo ve. */
  motivo?: string;
}

/** Botón táctil amplio (mínimo 48). Desactivado se ve y se anuncia como desactivado, con su motivo. */
export const Boton: React.FC<BotonProps> = ({ texto, onPress, icono, principal, desactivado, motivo }) => {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={motivo ? `${texto}. ${motivo}` : texto}
      accessibilityState={{ disabled: !!desactivado }}
      disabled={desactivado}
      onPress={onPress}
      activeOpacity={0.85}
      style={[s.boton, principal ? { backgroundColor: theme.colors.accent, borderColor: 'transparent' } : { backgroundColor: theme.colors.card, borderColor: theme.colors.border }, desactivado && { opacity: 0.5 }]}
    >
      {icono ? <Ionicons name={icono as any} size={scale(18)} color={principal ? '#1F2937' : theme.colors.accentDark} /> : null}
      <Text style={[s.botonTexto, { color: principal ? '#1F2937' : theme.colors.text }]}>{texto}</Text>
    </TouchableOpacity>
  );
};

export const Chip: React.FC<{ texto: string; activo?: boolean; onPress?: () => void; desactivado?: boolean }> = ({ texto, activo, onPress, desactivado }) => {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ selected: !!activo, disabled: !!desactivado }}
      disabled={desactivado}
      onPress={onPress}
      style={[s.chip, { borderColor: activo ? theme.colors.accent : theme.colors.border, backgroundColor: activo ? theme.colors.accent + '26' : theme.colors.card }, desactivado && { opacity: 0.5 }]}
    >
      <Text style={[s.chipTexto, { color: theme.colors.text }]}>{texto}</Text>
    </TouchableOpacity>
  );
};

interface DeslizadorProps {
  valor: number; // 0..1
  onCambiar: (v: number) => void;
  etiqueta: string;
  /** Texto del valor para lectores de pantalla (p. ej. «80 %»). */
  textoValor: string;
  desactivado?: boolean;
}

/**
 * Deslizador táctil sin librería: se toca la barra o se usan los pasos accesibles (aumentar / disminuir). Solo
 * cambia un VALOR; no procesa audio. Quien lo use decide qué significa ese valor y si hay algo real detrás.
 */
export const Deslizador: React.FC<DeslizadorProps> = ({ valor, onCambiar, etiqueta, textoValor, desactivado }) => {
  const { theme } = useTheme();
  const [ancho, setAncho] = useState(1);
  const fijar = (x: number) => onCambiar(Math.max(0, Math.min(1, x / ancho)));
  return (
    <Pressable
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={etiqueta}
      accessibilityValue={{ text: textoValor }}
      accessibilityState={{ disabled: !!desactivado }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onCambiar(Math.max(0, Math.min(1, valor + (e.nativeEvent.actionName === 'increment' ? 0.1 : -0.1))))}
      disabled={desactivado}
      onLayout={(e: LayoutChangeEvent) => setAncho(Math.max(1, e.nativeEvent.layout.width))}
      onPress={(e) => fijar(e.nativeEvent.locationX)}
      style={[s.deslizador, desactivado && { opacity: 0.5 }]}
      hitSlop={8}
    >
      <View style={[s.carril, { backgroundColor: theme.colors.border }]}>
        <View style={[s.relleno, { width: `${Math.round(valor * 100)}%`, backgroundColor: theme.colors.accent }]} />
      </View>
      <View style={[s.pomo, { left: `${Math.round(valor * 100)}%`, backgroundColor: theme.colors.card, borderColor: theme.colors.accentDark }]} />
    </Pressable>
  );
};

interface OndaProps {
  /** Niveles reales 0..1. Sin ellos no hay onda: se dice. */
  picos?: readonly number[];
  /** 0..1: hasta dónde se ha reproducido. */
  progreso?: number;
  alto?: number;
  /** Los niveles son datos de diseño (canción de ejemplo). */
  ejemplo?: boolean;
  vacioTexto: string;
}

export const Onda: React.FC<OndaProps> = ({ picos, progreso = 0, alto = 56, ejemplo, vacioTexto }) => {
  const { theme } = useTheme();
  if (!picos || picos.length === 0) {
    return (
      <View style={[s.ondaVacia, { height: scale(alto), borderColor: theme.colors.border }]} accessible accessibilityLabel={vacioTexto}>
        <Text style={[s.nota, { color: theme.colors.textSecondary }]}>{vacioTexto}</Text>
      </View>
    );
  }
  return (
    <View style={[s.onda, { height: scale(alto) }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {picos.map((p, i) => {
        const hecha = (i + 0.5) / picos.length <= progreso;
        return <View key={i} style={{ flex: 1, marginHorizontal: 1, height: Math.max(3, p * scale(alto)), borderRadius: 2, backgroundColor: hecha ? theme.colors.accent : ejemplo ? theme.colors.border : theme.colors.accent + '66' }} />;
      })}
    </View>
  );
};

/** Barras de diseño deterministas para ESTAR en una canción de ejemplo (no representan audio alguno). */
export const PICOS_DE_EJEMPLO: number[] = Array.from({ length: 64 }, (_, i) => 0.25 + 0.6 * Math.abs(Math.sin(i * 0.55) * Math.cos(i * 0.17)));

const s = StyleSheet.create({
  chipEstado: { borderWidth: 1, borderRadius: BORDER_RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 2, alignSelf: 'flex-start' },
  chipEstadoTexto: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.medium },
  aviso: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, borderWidth: 1, borderRadius: BORDER_RADIUS.md, padding: SPACING.sm },
  avisoTexto: { fontSize: FONT_SIZE.xs, flex: 1, lineHeight: scale(17) },
  nota: { fontSize: FONT_SIZE.xs, lineHeight: scale(17) },
  titulo: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold },
  tarjeta: { borderWidth: 1, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, gap: SPACING.sm },
  boton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, borderWidth: 1, borderRadius: BORDER_RADIUS.full, minHeight: scale(48), paddingHorizontal: SPACING.xl },
  botonTexto: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold },
  chip: { borderWidth: 1, borderRadius: BORDER_RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, minHeight: scale(40), justifyContent: 'center' },
  chipTexto: { fontSize: FONT_SIZE.sm },
  deslizador: { height: scale(32), justifyContent: 'center', flex: 1, minWidth: scale(80) },
  carril: { height: scale(6), borderRadius: 3, overflow: 'hidden' },
  relleno: { height: '100%' },
  pomo: { position: 'absolute', width: scale(18), height: scale(18), borderRadius: scale(9), borderWidth: 2, marginLeft: -scale(9), top: scale(7) },
  onda: { flexDirection: 'row', alignItems: 'center' },
  ondaVacia: { borderWidth: 1, borderStyle: 'dashed', borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center' },
});
