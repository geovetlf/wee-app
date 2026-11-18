import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useT } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { PORTADA_WEEAI as P, textoPortada } from '../../constants/estiloWeeAi';
import { ReferenciaDeIdea, RolDeReferencia, ROLES } from '../../utils/referenciasDeFilmmaker';
import { etiquetaAccesible } from '../../utils/ideaDeFilmmaker';

const CLAVE_DEL_ROL: Record<RolDeReferencia, string> = { reference: 'filmmaker.refRoleReference', character: 'filmmaker.refRoleCharacter', world: 'filmmaker.refRoleWorld' };

/**
 * LAS MINIATURAS SOBRE LA CAJA: lo que la persona adjuntó, con su rol, su estado (subiendo / error que se reintenta tocando) y una «×» para quitarlo.
 * El ROL se elige DESPUÉS de adjuntar: la imagen entra con uno por defecto y su chip, de un toque, abre Personaje · Mundo · Referencia (una sola pregunta abierta a la vez).
 * Solo se pinta si hay algo; en una fila que ENVUELVE (nunca scroll horizontal).
 */
export const ReferenciasAdjuntas: React.FC<{ referencias: readonly ReferenciaDeIdea[]; onQuitar: (id: string) => void; onReintentar: (id: string) => void; onCambiarRol: (id: string, rol: RolDeReferencia) => void }> = ({ referencias, onQuitar, onReintentar, onCambiarRol }) => {
  const t = useT();
  const dir = useDireccion();
  const [abierta, setAbierta] = useState<string | null>(null);
  if (referencias.length === 0) return null;
  const enAbierta = referencias.find((x) => x.id === abierta);
  return (
    <View>
    <View style={[styles.fila, dir.contenedor]}>
      {referencias.map((r) => {
        const rol = t(CLAVE_DEL_ROL[r.rol]);
        const error = r.estado === 'error';
        return (
          <View key={r.id} style={styles.celda}>
            <TouchableOpacity onPress={error ? () => onReintentar(r.id) : undefined} disabled={!error} activeOpacity={0.8} accessibilityRole={error ? 'button' : 'image'} accessibilityLabel={etiquetaAccesible(rol, r.estado === 'subiendo' ? t('filmmaker.refUploading') : error ? t('filmmaker.refError') : '')} style={[styles.miniatura, error && styles.miniaturaError]}>
              <Image source={{ uri: r.uri }} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />
              {r.estado === 'subiendo' ? <View style={styles.velo}><ActivityIndicator size="small" color={P.tinta} /></View> : null}
              {error ? <View style={styles.velo}><Ionicons name="refresh" size={18} color={P.tinta} /></View> : null}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setAbierta(abierta === r.id ? null : r.id)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t('filmmaker.refRoleChange', { nombre: rol })} accessibilityState={{ expanded: abierta === r.id }} style={[styles.chip, abierta === r.id && styles.chipAbierto]}>
              <Text style={[textoPortada(11, '600'), { color: P.tinta }]} numberOfLines={1}>{rol}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onQuitar(r.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel={t('filmmaker.refRemove', { nombre: rol })} style={styles.quitar}>
              <Ionicons name="close" size={12} color={P.sobreAccion} />
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
    {enAbierta ? (
      <View style={[styles.roles, dir.contenedor]}>
        {ROLES.map((x) => (
          <TouchableOpacity key={x} onPress={() => { onCambiarRol(enAbierta.id, x); setAbierta(null); }} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t(CLAVE_DEL_ROL[x])} accessibilityState={{ selected: enAbierta.rol === x }} style={[styles.rol, enAbierta.rol === x && styles.rolSel]}>
            <Text style={[textoPortada(14, enAbierta.rol === x ? '600' : '500'), { color: P.tinta }]} numberOfLines={1}>{t(CLAVE_DEL_ROL[x])}</Text>
          </TouchableOpacity>
        ))}
      </View>
    ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 8 },
  celda: { width: 64, alignItems: 'center', gap: 2 },
  chip: { minHeight: 44, minWidth: 44, alignSelf: 'stretch', marginTop: -8, marginBottom: -12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  chipAbierto: { opacity: 1 },
  roles: { flexDirection: 'row', gap: 8, paddingBottom: 10 },
  rol: { flex: 1, minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: P.bordeCapsula, backgroundColor: P.fondo, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  rolSel: { borderColor: '#FFFFFF', borderWidth: 2, backgroundColor: P.superficieAlta },
  miniatura: { width: 56, height: 56, borderRadius: 14, marginBottom: 2, overflow: 'hidden', borderWidth: 1, borderColor: P.bordeLuz, backgroundColor: P.superficie },
  miniaturaError: { borderColor: P.tinta },
  velo: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  quitar: { position: 'absolute', top: -6, end: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: P.accion, alignItems: 'center', justifyContent: 'center' },
});
