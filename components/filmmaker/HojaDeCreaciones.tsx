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

/**
 * «DESDE MIS PROYECTOS»: las imágenes que la persona ya creó en Weë (Mis creaciones, la misma colección de la cuenta —`assetsService`—, solo las de tipo imagen).
 * Se toca una y vuelve a la caja como miniatura; su papel (referencia, personaje o mundo) se elige allí, no aquí. Nada que no exista como creación.
 */
export const HojaDeCreaciones: React.FC<{ visible: boolean; onClose: () => void; onElegir: (url: string) => void }> = ({ visible, onClose, onElegir }) => {
  const t = useT();
  const dir = useDireccion();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
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
  useEffect(() => { if (visible) { void cargar(); } }, [visible, cargar]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.velo} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')} />
      <View style={[styles.hoja, { paddingBottom: Math.max(insets.bottom, 12) + 8, maxHeight: '86%' }]} accessibilityViewIsModal>
        <View style={styles.asa} />
        <Text style={[textoPortada(18, '600'), dir.texto, { color: P.tinta }]} accessibilityRole="header">{t('filmmaker.refFromProjects')}</Text>
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
              <TouchableOpacity key={a.assetId} onPress={() => { onElegir(assetsService.urlDeEntrega(a) as string); onClose(); }} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={t('filmmaker.refFromProjects')} style={styles.celda}>
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
  centro: { minHeight: 120, alignItems: 'center', justifyContent: 'center', gap: 12 },
  reintentar: { minHeight: 44, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1, borderColor: P.bordeCapsula, alignItems: 'center', justifyContent: 'center' },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  celda: { width: '31.5%', aspectRatio: 1, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: P.bordeLuz, backgroundColor: P.fondo },
});
