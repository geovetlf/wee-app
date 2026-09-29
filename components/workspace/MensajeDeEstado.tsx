import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

/**
 * Los estados de una creación, tal como los vive la persona. No son los del
 * servidor —`AUTHORIZED`, `PROCESSING`, `REFUNDED`— sino lo que significan:
 * se está preparando, está esperando turno, se está haciendo, está lista, no
 * salió, y el dinero se devolvió (o se está devolviendo), o todavía se está
 * comprobando cómo acabó —y el dinero sigue apartado hasta saberlo—.
 */
export type EstadoVisible = 'preparando' | 'en_cola' | 'generando' | 'completado' | 'fallido' | 'reembolsado' | 'devolviendo' | 'comprobando';

const ASPECTO: Record<EstadoVisible, { icono: string; clave: string; tono: 'trabajo' | 'ok' | 'error' | 'dinero' }> = {
  preparando: { icono: 'construct-outline', clave: 'workspace.statusPreparing', tono: 'trabajo' },
  en_cola: { icono: 'time-outline', clave: 'workspace.statusQueued', tono: 'trabajo' },
  generando: { icono: 'sparkles-outline', clave: 'workspace.statusGenerating', tono: 'trabajo' },
  completado: { icono: 'checkmark-circle-outline', clave: 'workspace.statusCompleted', tono: 'ok' },
  fallido: { icono: 'alert-circle-outline', clave: 'workspace.statusFailed', tono: 'error' },
  reembolsado: { icono: 'return-down-back-outline', clave: 'workspace.statusRefunded', tono: 'dinero' },
  devolviendo: { icono: 'hourglass-outline', clave: 'workspace.statusRefunding', tono: 'dinero' },
  comprobando: { icono: 'search-outline', clave: 'workspace.statusChecking', tono: 'dinero' },
};

/**
 * UNA LÍNEA QUE DICE EN QUÉ ESTÁ LO QUE SE PIDIÓ.
 *
 * «Tu vídeo se está generando.» «No pudimos generar este vídeo.» «Los 75 Credits
 * reservados fueron reembolsados.» Nunca un código, un proveedor ni un error
 * de dentro: si hace falta un número, lo pone quien la monta en `detalle`.
 */
const MensajeDeEstado: React.FC<{ estado: EstadoVisible; detalle?: string; compacto?: boolean }> = ({ estado, detalle, compacto }) => {
  const { theme } = useTheme();
  const t = useT();
  const a = ASPECTO[estado];
  const color = a.tono === 'ok' ? theme.colors.success : a.tono === 'error' ? theme.colors.error : theme.colors.accent;
  const trabajando = a.tono === 'trabajo' || estado === 'devolviendo' || estado === 'comprobando';

  return (
    <View
      style={[styles.caja, compacto && styles.compacta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
    >
      {trabajando ? <ActivityIndicator size="small" color={color} /> : <Ionicons name={a.icono as any} size={scale(18)} color={color} />}
      <View style={styles.textos}>
        <Text style={[styles.titulo, { color: theme.colors.text }]}>{t(a.clave)}</Text>
        {!!detalle && <Text style={[styles.detalle, { color: theme.colors.textSecondary }]}>{detalle}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  caja: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, borderWidth: 1, borderRadius: BORDER_RADIUS.md, padding: SPACING.md },
  compacta: { padding: SPACING.sm, gap: SPACING.sm },
  textos: { flex: 1, gap: 2 },
  titulo: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold as any },
  detalle: { fontSize: FONT_SIZE.xs, lineHeight: FONT_SIZE.xs * 1.45 },
});

export default MensajeDeEstado;
