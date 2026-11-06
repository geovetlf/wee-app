/**
 * LAS PIEZAS DE BOOST — compartidas por la pantalla de impulsar, la de mis promociones y la del detalle.
 *
 * Gramática visual de Weë: fondo blanco, tarjetas suaves, dorado #F5B731 para lo elegido, gris oscuro para el texto.
 * Todo lo que se lee sale de `t()`; lo que escribió la persona (su publicación) se pinta tal cual.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ViewStyle, StyleProp } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useIdioma } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';
import type { BoostCampaign, BoostStatus } from '../../services/boostService';

export const DORADO = '#F5B731';
export const DORADO_OSCURO = '#8A6408';
const pulsable = Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null;

/** El motivo del servidor → su clave de texto. Lo que no se reconoce, error interno. */
const CLAVES_DE_ERROR: Record<string, string> = {
  cerrado: 'boost.err_cerrado',
  'servicio-pendiente': 'boost.err_servicio',
  peticion: 'boost.err_peticion',
  objetivo: 'boost.err_opcion',
  segmento: 'boost.err_opcion',
  pais: 'boost.err_opcion',
  duracion: 'boost.err_opcion',
  presupuesto: 'boost.err_presupuesto',
  publicacion: 'boost.err_publicacion',
  ajena: 'boost.err_ajena',
  'no-promocionable': 'boost.err_noPromocionable',
  'sin-comunidad': 'boost.err_sinComunidad',
  'ya-promocionada': 'boost.err_yaPromocionada',
  saldo: 'boost.err_saldo',
  conflicto: 'boost.err_conflicto',
  'operacion-cerrada': 'boost.err_cerrada',
  'no-existe': 'boost.err_noExiste',
  'no-activa': 'boost.err_noExiste',
  red: 'boost.err_red',
};
export const claveDeError = (motivo: string): string => CLAVES_DE_ERROR[motivo] ?? 'boost.err_interno';

export const claveDeEstado = (s: BoostStatus): string =>
  s === 'active' ? 'boost.statusActive' : s === 'settling' ? 'boost.statusSettling' : 'boost.statusEnded';

export const claveDeMotivo = (m: BoostCampaign['endedReason']): string | null =>
  m === 'completed' ? 'boost.reasonCompleted' : m === 'cancelled' ? 'boost.reasonCancelled' : m === 'post_unavailable' ? 'boost.reasonPostUnavailable' : null;

export const Tarjeta: React.FC<{ titulo?: string; children: React.ReactNode; style?: StyleProp<ViewStyle>; rol?: 'radiogroup' | 'summary' }> = ({ titulo, children, style, rol }) => {
  const { theme } = useTheme();
  const dir = useDireccion();
  return (
    <View style={[s.tarjeta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }, style]} accessibilityRole={rol as any}>
      {titulo ? <Text style={[s.titulo, dir.texto, { color: theme.colors.text }]} accessibilityRole="header">{titulo}</Text> : null}
      {children}
    </View>
  );
};

/** Una opción elegible (radio): tarjeta con borde dorado cuando está elegida. */
export const Opcion: React.FC<{ activa: boolean; onPress: () => void; etiqueta: string; pista?: string; icono?: string; deshabilitada?: boolean }> = ({ activa, onPress, etiqueta, pista, icono, deshabilitada }) => {
  const { theme } = useTheme();
  const dir = useDireccion();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={deshabilitada}
      style={[s.opcion, { borderColor: activa ? DORADO : theme.colors.border, backgroundColor: activa ? 'rgba(245,183,49,0.12)' : theme.colors.surface, opacity: deshabilitada ? 0.5 : 1 }, pulsable]}
      accessibilityRole="radio"
      accessibilityState={{ checked: activa, disabled: !!deshabilitada }}
      accessibilityLabel={pista ? `${etiqueta}. ${pista}` : etiqueta}
    >
      {icono ? <Ionicons name={icono as any} size={scale(22)} color={activa ? DORADO_OSCURO : theme.colors.textSecondary} /> : null}
      <View style={s.flex}>
        <Text style={[s.opcionTexto, dir.texto, { color: theme.colors.text }]}>{etiqueta}</Text>
        {pista ? <Text style={[s.pista, dir.texto, { color: theme.colors.textSecondary }]}>{pista}</Text> : null}
      </View>
      <Ionicons name={activa ? 'radio-button-on' : 'radio-button-off'} size={scale(20)} color={activa ? DORADO_OSCURO : theme.colors.textSecondary} />
    </TouchableOpacity>
  );
};

/** Una píldora elegible (duración, presupuesto). */
export const Pildora: React.FC<{ activa: boolean; onPress: () => void; texto: string }> = ({ activa, onPress, texto }) => {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[s.pildora, { backgroundColor: activa ? DORADO : theme.colors.surface, borderColor: activa ? DORADO : theme.colors.border }, pulsable]}
      accessibilityRole="radio"
      accessibilityState={{ checked: activa }}
    >
      <Text style={[s.pildoraTexto, { color: activa ? '#1F2937' : theme.colors.text }]}>{texto}</Text>
    </TouchableOpacity>
  );
};

/** Un aviso (informativo o de error). Va como alerta para los lectores de pantalla. */
export const Aviso: React.FC<{ titulo?: string; texto: string; tono?: 'info' | 'error'; children?: React.ReactNode }> = ({ titulo, texto, tono = 'info', children }) => {
  const { theme } = useTheme();
  const dir = useDireccion();
  const color = tono === 'error' ? '#DC2626' : DORADO;
  return (
    <View style={[s.aviso, { borderColor: color, backgroundColor: tono === 'error' ? 'rgba(220,38,38,0.08)' : 'rgba(245,183,49,0.10)' }]} accessibilityRole="alert">
      <Ionicons name={tono === 'error' ? 'alert-circle' : 'information-circle'} size={scale(20)} color={color} />
      <View style={s.flex}>
        {titulo ? <Text style={[s.avisoTitulo, dir.texto, { color: theme.colors.text }]}>{titulo}</Text> : null}
        <Text style={[s.avisoTexto, dir.texto, { color: theme.colors.text }]}>{texto}</Text>
        {children}
      </View>
    </View>
  );
};

/** Una fila clave → valor del resumen. */
export const Fila: React.FC<{ clave: string; valor: string; fuerte?: boolean }> = ({ clave, valor, fuerte }) => {
  const { theme } = useTheme();
  const dir = useDireccion();
  return (
    <View style={s.fila}>
      <Text style={[s.filaClave, dir.texto, { color: theme.colors.textSecondary }]}>{clave}</Text>
      <Text style={[s.filaValor, dir.texto, { color: theme.colors.text, fontWeight: fuerte ? FONT_WEIGHT.bold : FONT_WEIGHT.semibold }]}>{valor}</Text>
    </View>
  );
};

/** La publicación que se impulsa, en pequeño. El texto es de la persona: tal cual. */
export const VistaDePublicacion: React.FC<{ texto: string; imagen: string | null; video: boolean; etiqueta?: string }> = ({ texto, imagen, video, etiqueta }) => {
  const { theme } = useTheme();
  const { t } = useIdioma();
  const dir = useDireccion();
  return (
    <View style={s.vista}>
      {imagen ? (
        <Image source={{ uri: imagen }} style={s.miniatura} contentFit="cover" accessibilityIgnoresInvertColors />
      ) : (
        <View style={[s.miniatura, s.miniaturaVacia]}>
          <Ionicons name={video ? 'videocam-outline' : 'document-text-outline'} size={scale(22)} color="#1F2937" />
        </View>
      )}
      <View style={s.flex}>
        {etiqueta ? <Text style={[s.etiqueta, dir.texto, { color: theme.colors.textSecondary }]}>{etiqueta}{video ? ` · ${t('boost.mediaVideo')}` : ''}</Text> : null}
        <Text style={[s.vistaTexto, dir.texto, { color: theme.colors.text }]} numberOfLines={3}>{texto || ' '}</Text>
      </View>
    </View>
  );
};

/** La pastilla de estado de una campaña. */
export const EstadoDeCampana: React.FC<{ estado: BoostStatus }> = ({ estado }) => {
  const { t } = useIdioma();
  const fondo = estado === 'active' ? 'rgba(22,163,74,0.12)' : estado === 'settling' ? 'rgba(245,183,49,0.18)' : 'rgba(107,114,128,0.14)';
  const color = estado === 'active' ? '#15803D' : estado === 'settling' ? DORADO_OSCURO : '#4B5563';
  return (
    <View style={[s.estado, { backgroundColor: fondo }]}>
      <View style={[s.punto, { backgroundColor: color }]} />
      <Text style={[s.estadoTexto, { color }]}>{t(claveDeEstado(estado))}</Text>
    </View>
  );
};

/** El botón principal (dorado) y el secundario. */
export const Boton: React.FC<{ texto: string; onPress: () => void; deshabilitado?: boolean; secundario?: boolean; peligro?: boolean; icono?: string; cargando?: boolean }> = ({ texto, onPress, deshabilitado, secundario, peligro, icono, cargando }) => {
  const { theme } = useTheme();
  const fondo = secundario ? theme.colors.surface : peligro ? '#DC2626' : DORADO;
  const color = secundario ? theme.colors.text : peligro ? '#FFFFFF' : '#1F2937';
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={deshabilitado || cargando}
      style={[s.boton, { backgroundColor: fondo, borderColor: secundario ? theme.colors.border : fondo, opacity: deshabilitado ? 0.5 : 1 }, pulsable]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(deshabilitado || cargando), busy: !!cargando }}
      accessibilityLabel={texto}
    >
      {icono ? <Ionicons name={icono as any} size={scale(18)} color={color} /> : null}
      <Text style={[s.botonTexto, { color }]}>{texto}</Text>
    </TouchableOpacity>
  );
};

export const s = StyleSheet.create({
  tarjeta: { borderRadius: scale(20), borderWidth: StyleSheet.hairlineWidth, padding: SPACING.lg, gap: SPACING.md },
  titulo: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold },
  flex: { flex: 1, minWidth: 0, gap: scale(2) },
  opcion: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, borderWidth: 1.5, borderRadius: scale(16), padding: SPACING.md, minHeight: 48 },
  opcionTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },
  pista: { fontSize: FONT_SIZE.xs, lineHeight: scale(17) },
  pildora: { borderWidth: 1, borderRadius: BORDER_RADIUS.full, paddingHorizontal: SPACING.md, minHeight: 40, justifyContent: 'center' },
  pildoraTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },
  aviso: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start', borderWidth: 1, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md },
  avisoTitulo: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold },
  avisoTexto: { fontSize: FONT_SIZE.sm, lineHeight: scale(20) },
  fila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: SPACING.md, flexWrap: 'wrap' },
  filaClave: { fontSize: FONT_SIZE.sm, flexShrink: 1 },
  filaValor: { fontSize: FONT_SIZE.sm, flexShrink: 1 },
  vista: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  miniatura: { width: scale(56), height: scale(56), borderRadius: scale(12) },
  miniaturaVacia: { backgroundColor: 'rgba(245,183,49,0.25)', alignItems: 'center', justifyContent: 'center' },
  etiqueta: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold },
  vistaTexto: { fontSize: FONT_SIZE.sm, lineHeight: scale(19) },
  estado: { flexDirection: 'row', alignItems: 'center', gap: scale(6), alignSelf: 'flex-start', borderRadius: BORDER_RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: scale(4) },
  punto: { width: scale(8), height: scale(8), borderRadius: scale(4) },
  estadoTexto: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold },
  boton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, minHeight: 52, borderRadius: BORDER_RADIUS.full, borderWidth: 1, paddingHorizontal: SPACING.lg },
  botonTexto: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, textAlign: 'center', flexShrink: 1 },
});
