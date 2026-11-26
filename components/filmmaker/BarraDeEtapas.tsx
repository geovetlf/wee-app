import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useT } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { PORTADA_WEEAI as P, textoPortada } from '../../constants/estiloWeeAi';
import { useCerrarConEscape } from '../../hooks/useCerrarConEscape';
import { ETAPAS, EtapaId } from '../../constants/filmmakerUniverso';

/**
 * LAS ETAPAS, CUANDO SIRVEN (visión de producto 2026-11-18): solo después de la Idea y reducidas a UNA línea —«Universo · 2 de 3»—. Tocarla abre la
 * lista de las etapas que existen hoy para ir y volver; las que aún no existen no se pintan (ni atenuadas ni con candado). Al lado, los ajustes del
 * proyecto. En la Idea este indicador no se muestra.
 */
export const BarraDeEtapas: React.FC<{ activa: EtapaId; onIr: (id: EtapaId) => void; onProyecto?: () => void }> = ({ activa, onIr, onProyecto }) => {
  const t = useT();
  const dir = useDireccion();
  const insets = useSafeAreaInsets();
  const [lista, setLista] = useState(false);
  useCerrarConEscape(lista, () => setLista(false));
  const abiertas = ETAPAS.filter((e) => e.abierta);
  const posicion = Math.max(1, abiertas.findIndex((e) => e.id === activa) + 1);
  const actual = abiertas.find((e) => e.id === activa) ?? abiertas[0];
  return (
    <View style={[styles.fila, dir.contenedor]}>
      <TouchableOpacity onPress={() => setLista(true)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t('filmmaker.stageOf', { etapa: t(actual.clave), n: posicion, total: abiertas.length })} style={[styles.indicador, dir.contenedor]}>
        <Text style={[textoPortada(14, '600'), { color: P.tinta, flexShrink: 1 }]} numberOfLines={1}>{t('filmmaker.stageOf', { etapa: t(actual.clave), n: posicion, total: abiertas.length })}</Text>
        <Ionicons name="chevron-down" size={14} color={P.tintaSecundaria} />
      </TouchableOpacity>
      <View style={{ flex: 1 }} />
      {onProyecto ? (
        <TouchableOpacity onPress={onProyecto} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t('filmmaker.projOpen')} style={styles.proyecto}>
          <Ionicons name="options-outline" size={18} color={P.tintaSecundaria} />
        </TouchableOpacity>
      ) : null}
      <Modal visible={lista} transparent animationType="slide" onRequestClose={() => setLista(false)} statusBarTranslucent>
        <Pressable style={styles.velo} onPress={() => setLista(false)} accessibilityRole="button" accessibilityLabel={t('common.close')} />
        <View style={[styles.hoja, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]} accessibilityViewIsModal>
          <View style={styles.asa} />
          <Text style={[textoPortada(18, '600'), dir.texto, { color: P.tinta }]} accessibilityRole="header">{t('filmmaker.stagesLabel')}</Text>
          {abiertas.map((e) => {
            const sel = e.id === activa;
            return (
              <TouchableOpacity key={e.id} onPress={() => { setLista(false); onIr(e.id); }} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t(e.clave)} accessibilityState={{ selected: sel }} style={[styles.etapa, sel && styles.etapaSel, dir.contenedor]}>
                <Text style={[textoPortada(16, sel ? '600' : '500'), dir.texto, { color: sel ? P.tinta : P.tintaSecundaria }]}>{t(e.clave)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 4, minHeight: 48 },
  indicador: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingEnd: 8, flexShrink: 1 },
  proyecto: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: P.bordeCapsula, alignItems: 'center', justifyContent: 'center' },
  velo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  hoja: { backgroundColor: P.superficie, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderColor: P.bordeLuz, borderWidth: 1, borderBottomWidth: 0, paddingHorizontal: 16, paddingTop: 8, gap: 8 },
  asa: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: P.bordeLuz, marginBottom: 6 },
  etapa: { minHeight: 52, paddingHorizontal: 16, borderRadius: 26, borderWidth: 1, borderColor: P.bordeCapsula, backgroundColor: P.fondo, justifyContent: 'center' },
  etapaSel: { borderColor: '#FFFFFF', borderWidth: 2, backgroundColor: P.superficieAlta },
});
