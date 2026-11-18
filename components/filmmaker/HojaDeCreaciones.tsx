import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../../contexts/IdiomaContext';
import { useAuth } from '../../contexts/AuthContext';
import { useDireccion } from '../../hooks/useDireccion';
import { useCerrarConEscape } from '../../hooks/useCerrarConEscape';
import { PORTADA_WEEAI as P, textoPortada } from '../../constants/estiloWeeAi';
import { assetsService, AssetDoc } from '../../services/assetsService';
import { ROLES, RolDeReferencia } from '../../utils/referenciasDeFilmmaker';

const CLAVE_DEL_ROL: Record<RolDeReferencia, string> = { reference: 'filmmaker.refRoleReference', character: 'filmmaker.refRoleCharacter', world: 'filmmaker.refRoleWorld' };

/**
 * «DESDE MIS PROYECTOS»: las imágenes que la persona ya creó en Weë (Mis creaciones, la misma colección de la cuenta —`assetsService`—, solo las de tipo imagen).
 * Se elige una, se dice si es referencia, personaje o mundo (tres opciones fijas, sin scroll) y vuelve a la caja como miniatura. Nada que no exista como creación.
 */
export const HojaDeCreaciones: React.FC<{ visible: boolean; onClose: () => void; onElegir: (rol: RolDeReferencia, url: string) => void }> = ({ visible, onClose, onElegir }) => {
  const t = useT();
  const dir = useDireccion();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [rol, setRol] = useState<RolDeReferencia>('reference');
  const [estado, setEstado] = useState<'cargando' | 'lista' | 'error'>('cargando');
  const [items, setItems] = useState<AssetDoc[]>([]);
  useCerrarConEscape(visible, onClose);

  const cargar = useCallback(async () => {
    if (!user) { setEstado('lista'); setItems([]); return; }
    setEstado('cargando');
    try {
      const pagina = await assetsService.listar(user.uid, { kind: 'image' });
      setItems(pagina.items.filter((a) => !!assetsService.urlDeEntrega(a)));
      setEstado('lista');
    } catch { setEstado('error'); }
  }, [user]);
  useEffect(() => { if (visible) { setRol('reference'); void cargar(); } }, [visible, cargar]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.velo} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')} />
      <View style={[styles.hoja, { paddingBottom: Math.max(insets.bottom, 12) + 8, maxHeight: '86%' }]} accessibilityViewIsModal>
        <View style={styles.asa} />
        <Text style={[textoPortada(18, '600'), dir.texto, { color: P.tinta }]} accessibilityRole="header">{t('filmmaker.refFromProjects')}</Text>
        <Text style={[textoPortada(13, '500'), dir.texto, { color: P.tintaSecundaria, marginTop: 8 }]}>{t('filmmaker.refPickerAs')}</Text>
        <View style={[styles.roles, dir.contenedor]}>
          {ROLES.map((r) => (
            <TouchableOpacity key={r} onPress={() => setRol(r)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t(CLAVE_DEL_ROL[r])} accessibilityState={{ selected: rol === r }} style={[styles.rol, rol === r && styles.rolSel]}>
              <Text style={[textoPortada(14, rol === r ? '600' : '500'), { color: P.tinta }]} numberOfLines={1}>{t(CLAVE_DEL_ROL[r])}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {estado === 'cargando' ? <View style={styles.centro}><ActivityIndicator size="small" color={P.tintaSecundaria} /></View> : null}
        {estado === 'error' ? (
          <View style={styles.centro}>
            <Text style={[textoPortada(14), dir.texto, { color: P.tintaSecundaria, textAlign: 'center' }]}>{t('filmmaker.refPickerError')}</Text>
            <TouchableOpacity onPress={() => { void cargar(); }} accessibilityRole="button" accessibilityLabel={t('filmmaker.hubRetry')} style={styles.reintentar}><Text style={[textoPortada(14, '600'), { color: P.tinta }]}>{t('filmmaker.hubRetry')}</Text></TouchableOpacity>
          </View>
        ) : null}
        {estado === 'lista' && items.length === 0 ? <View style={styles.centro}><Text style={[textoPortada(14), dir.texto, { color: P.tintaSecundaria, textAlign: 'center' }]}>{t('filmmaker.refPickerEmpty')}</Text></View> : null}
        {estado === 'lista' && items.length > 0 ? (
          <ScrollView style={{ marginTop: 12 }} contentContainerStyle={[styles.rejilla, dir.contenedor]} keyboardShouldPersistTaps="handled">
            {items.map((a) => (
              <TouchableOpacity key={a.assetId} onPress={() => { onElegir(rol, assetsService.urlDeEntrega(a) as string); onClose(); }} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={t(CLAVE_DEL_ROL[rol])} style={styles.celda}>
                <Image source={{ uri: assetsService.urlDeEntrega(a) as string }} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  velo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  hoja: { backgroundColor: P.superficie, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderColor: P.bordeLuz, borderWidth: 1, borderBottomWidth: 0, paddingHorizontal: 16, paddingTop: 8 },
  asa: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: P.bordeLuz, marginBottom: 10 },
  roles: { flexDirection: 'row', gap: 8, marginTop: 6 },
  rol: { flex: 1, minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: P.bordeCapsula, backgroundColor: P.fondo, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  rolSel: { borderColor: '#FFFFFF', borderWidth: 2, backgroundColor: P.superficieAlta },
  centro: { minHeight: 120, alignItems: 'center', justifyContent: 'center', gap: 12 },
  reintentar: { minHeight: 44, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1, borderColor: P.bordeCapsula, alignItems: 'center', justifyContent: 'center' },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  celda: { width: '31.5%', aspectRatio: 1, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: P.bordeLuz, backgroundColor: P.fondo },
});
