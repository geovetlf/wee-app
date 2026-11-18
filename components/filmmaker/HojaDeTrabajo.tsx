import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconoWee } from '../icons/IconoWee';
import type { NombreDeIcono } from '../icons/trazosDeWee';
import IconoDireccional from '../IconoDireccional';
import ProductionList from '../studio/produccion/ProductionList';
import { useT } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { PORTADA_WEEAI as P, textoPortada } from '../../constants/estiloWeeAi';
import { scale } from '../../utils/scale';

/**
 * LA HOJA DEL TRABAJO GUARDADO de Filmmaker (carpeta de la cabecera): dos destinos y nada más.
 * «Mis producciones» abre la lista de siempre (`ProductionList`, sin datos de muestra) dentro de la misma hoja, y «Mis creaciones» va a la pantalla
 * que ya existe. Sustituye a las pestañas «Crear / Producciones»: «Crear» era esta misma pantalla, y el acceso a lo guardado no necesita un botón fijo.
 */
const FILAS: { id: 'producciones' | 'creaciones'; icono: NombreDeIcono; clave: string }[] = [
  { id: 'producciones', icono: 'claqueta', clave: 'filmmaker.myProductions' },
  { id: 'creaciones', icono: 'carpeta', clave: 'weeai.myCreations' },
];

export const HojaDeTrabajo: React.FC<{
  visible: boolean;
  onClose: () => void;
  onAbrirProduccion: (productionId: string) => void;
  onAbrirCreaciones: () => void;
}> = ({ visible, onClose, onAbrirProduccion, onAbrirCreaciones }) => {
  const t = useT();
  const dir = useDireccion();
  const insets = useSafeAreaInsets();
  const [vista, setVista] = useState<'menu' | 'lista'>('menu');
  useEffect(() => { if (!visible) setVista('menu'); }, [visible]);

  const elegir = (id: 'producciones' | 'creaciones') => {
    if (id === 'producciones') { setVista('lista'); return; }
    onClose();
    onAbrirCreaciones();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.velo} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')} />
      <View style={[styles.hoja, { paddingBottom: Math.max(insets.bottom, 12) + 8, maxHeight: '78%', ...(vista === 'lista' ? { minHeight: '55%' } : null) }]} accessibilityViewIsModal>
        <View style={styles.asa} />
        {vista === 'menu' ? (
          <View style={styles.filas}>
            {FILAS.map((f) => (
              <TouchableOpacity key={f.id} onPress={() => elegir(f.id)} accessibilityRole="button" style={[styles.fila, dir.contenedor]} activeOpacity={0.8}>
                <View style={styles.icono}><IconoWee name={f.icono} size={scale(22)} color={P.tinta} /></View>
                <Text style={[textoPortada(17, '600'), dir.texto, { color: P.tinta, flex: 1 }]} numberOfLines={1}>{t(f.clave)}</Text>
                <IconoDireccional name="chevron-forward" size={scale(18)} color={P.tintaSecundaria} />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <>
            <View style={[styles.titulo, dir.contenedor]}>
              <TouchableOpacity onPress={() => setVista('menu')} style={styles.atras} accessibilityRole="button" accessibilityLabel={t('common.back')}>
                <IconoDireccional name="arrow-back" size={scale(22)} color={P.tinta} />
              </TouchableOpacity>
              <Text style={[textoPortada(18, '600'), dir.texto, { color: P.tinta, flex: 1 }]} numberOfLines={1} accessibilityRole="header">{t('filmmaker.myProductions')}</Text>
            </View>
            <ScrollView contentContainerStyle={{ paddingVertical: 8 }} keyboardShouldPersistTaps="handled">
              <ProductionList onAbrir={(id) => { onClose(); onAbrirProduccion(id); }} onIrAlStudio={onClose} />
            </ScrollView>
          </>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  velo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  hoja: { backgroundColor: P.superficie, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderColor: P.bordeLuz, borderWidth: 1, borderBottomWidth: 0, paddingHorizontal: 16, paddingTop: 8 },
  asa: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: P.bordeLuz, marginBottom: 10 },
  filas: { gap: 8, paddingBottom: 4 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 60, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, borderColor: P.bordeCapsula, backgroundColor: P.fondo },
  icono: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: P.superficie },
  titulo: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
  atras: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
