import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useT, useIdioma } from '../../../contexts/IdiomaContext';
import { useDireccion } from '../../../hooks/useDireccion';
import { PORTADA_WEEAI as P, textoPortada } from '../../../constants/estiloWeeAi';
import { CLAVE_DE_ESTADO } from '../../../constants/filmmakerTandas';
import { EstadoDeTanda, partirTiempo } from '../../../utils/tandasDeFilmmaker';
import { etiquetaAccesible } from '../../../utils/ideaDeFilmmaker';

/** Aislantes de dirección: «0:00–0:06» se lee de izquierda a derecha también en árabe, hebreo o persa, con los dígitos del idioma. */
const LRI = String.fromCharCode(0x2066);
const PDI = String.fromCharCode(0x2069);

/** «m:ss» con los dígitos del idioma activo (dos cifras en los segundos). */
export const useTiempo = () => {
  const { formato } = useIdioma();
  const uno = useCallback((seg: number): string => {
    const { m, s } = partirTiempo(seg);
    return `${formato.numero(m)}:${s < 10 ? formato.numero(0) : ''}${formato.numero(s)}`;
  }, [formato]);
  const rango = useCallback((inicio: number, fin: number): string => `${LRI}${uno(inicio)}–${uno(fin)}${PDI}`, [uno]);
  const solo = useCallback((seg: number): string => `${LRI}${uno(seg)}${PDI}`, [uno]);
  return { uno, rango, solo };
};

const ICONO_DE_ESTADO: Record<EstadoDeTanda, keyof typeof Ionicons.glyphMap> = {
  none: 'ellipse-outline', review: 'eye-outline', approved: 'checkmark-circle-outline', producing: 'sync-outline', done: 'checkmark-done-outline', error: 'alert-circle-outline',
};

/** La pastilla de estado de una tanda. Siempre con texto además del icono (el estado nunca se dice solo con la forma). */
export const PastillaDeEstado: React.FC<{ estado: EstadoDeTanda }> = ({ estado }) => {
  const t = useT();
  const dir = useDireccion();
  const fuerte = estado === 'approved' || estado === 'done';
  return (
    <View style={[styles.pastilla, fuerte && styles.pastillaFuerte, estado === 'error' && styles.pastillaError, dir.contenedor]} accessible accessibilityLabel={t(CLAVE_DE_ESTADO[estado])}>
      <Ionicons name={ICONO_DE_ESTADO[estado]} size={12} color={P.tinta} />
      <Text style={[textoPortada(12, '600'), { color: P.tinta }]} numberOfLines={1}>{t(CLAVE_DE_ESTADO[estado])}</Text>
    </View>
  );
};

/** Una fila CERRADA: punteada, con su motivo siempre visible y anunciable. Al tocarla, el motivo sube al aviso de la pantalla. */
export const FilaCerrada: React.FC<{ titulo: string; motivo: string; icono: keyof typeof Ionicons.glyphMap; onAviso: (motivo: string) => void; compacta?: boolean }> = ({ titulo, motivo, icono, onAviso, compacta }) => {
  const dir = useDireccion();
  return (
    <TouchableOpacity onPress={() => onAviso(motivo)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={etiquetaAccesible(titulo, motivo)} accessibilityState={{ disabled: true }} style={[styles.cerrada, compacta && { minHeight: 44 }, dir.contenedor]}>
      <Ionicons name={icono} size={16} color={P.tintaDeshabilitada} />
      <View style={{ flex: 1 }}>
        <Text style={[textoPortada(14, '600'), dir.texto, { color: P.tintaSecundaria }]} numberOfLines={2}>{titulo}</Text>
        {compacta ? null : <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]} numberOfLines={4}>{motivo}</Text>}
      </View>
      <Ionicons name="lock-closed-outline" size={14} color={P.tintaDeshabilitada} />
    </TouchableOpacity>
  );
};

/** EL botón blanco de una pantalla. Apagado = contorno, y quien lo pinta pone el motivo debajo. */
export const BotonBlanco: React.FC<{ texto: string; onPress: () => void; apagado?: boolean; motivo?: string | null; testID?: string }> = ({ texto, onPress, apagado, motivo, testID }) => (
  <TouchableOpacity testID={testID} onPress={onPress} disabled={apagado} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={etiquetaAccesible(texto, apagado ? motivo : null)} accessibilityState={{ disabled: !!apagado }} style={[styles.principal, apagado && styles.principalApagado]}>
    <Text style={[textoPortada(16, '600'), { color: apagado ? P.tintaDeshabilitada : P.sobreAccion }]} numberOfLines={1}>{texto}</Text>
  </TouchableOpacity>
);

/** Botón secundario de contorno, 44 dp mínimo. */
export const BotonContorno: React.FC<{ texto: string; onPress: () => void; icono?: keyof typeof Ionicons.glyphMap; peligro?: boolean; testID?: string; apagado?: boolean }> = ({ texto, onPress, icono, peligro, testID, apagado }) => {
  const dir = useDireccion();
  return (
    <TouchableOpacity testID={testID} onPress={onPress} disabled={apagado} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={texto} accessibilityState={{ disabled: !!apagado }} style={[styles.contorno, peligro && { borderColor: P.bordeLuz }, apagado && { opacity: 0.5 }, dir.contenedor]}>
      {icono ? <Ionicons name={icono} size={16} color={P.tinta} /> : null}
      <Text style={[textoPortada(14, '600'), { color: P.tinta, flexShrink: 1 }]} numberOfLines={1}>{texto}</Text>
    </TouchableOpacity>
  );
};

export const estilosComunes = StyleSheet.create({
  hoja: { backgroundColor: P.modulo, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: P.bordeLuz, paddingHorizontal: 16, paddingTop: 8, gap: 10 },
  velo: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  asa: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: P.bordeCapsula, marginBottom: 4 },
  campo: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: P.bordeCapsula, backgroundColor: P.superficie, paddingHorizontal: 14, paddingVertical: 10 },
  chip: { minHeight: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1, borderColor: P.bordeCapsula, backgroundColor: P.superficie, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  chipSel: { borderColor: '#FFFFFF', borderWidth: 2, backgroundColor: P.superficieAlta },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});

const styles = StyleSheet.create({
  pastilla: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 26, paddingHorizontal: 10, borderRadius: 13, borderWidth: 1, borderColor: P.bordeCapsula, backgroundColor: P.superficie, alignSelf: 'flex-start' },
  pastillaFuerte: { borderColor: P.bordeLuz },
  pastillaError: { borderStyle: 'dashed', borderColor: P.bordeLuz },
  cerrada: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: P.bordeCapsula },
  principal: { minHeight: 52, borderRadius: 26, backgroundColor: P.accion, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  principalApagado: { backgroundColor: 'transparent', borderWidth: 1, borderColor: P.bordeCapsula },
  contorno: { minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: P.bordeCapsula, backgroundColor: 'transparent', paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
});
