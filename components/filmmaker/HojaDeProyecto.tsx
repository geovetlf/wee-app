import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { PORTADA_WEEAI as P, textoPortada } from '../../constants/estiloWeeAi';
import { useCerrarConEscape } from '../../hooks/useCerrarConEscape';
import { IdeaDelTaller } from '../../utils/ideaDeFilmmaker';
import { ContenidoDeEspecificaciones, FocoDeEspecificaciones } from './PanelDeEspecificaciones';

/**
 * LA HOJA «PROYECTO» (hoja única, a un toque desde la barra de etapas y desde el resumen de la Idea): las especificaciones de toda la obra en un solo sitio —modelo,
 * formato, resolución, duración y sonido—. El estilo no se cambia aquí: se elige en su capa y se cambia desde la píldora. El antiguo «Avanzado» vive ahora en
 * `PanelDeEspecificaciones`: Weë propone lo técnico (Auto) y la persona fija lo que quiera, solo con lo que el modelo elegido admite. Cambia la idea; no crea nada.
 */
export const HojaDeProyecto: React.FC<{ visible: boolean; onClose: () => void; idea: IdeaDelTaller; onIdea: (i: IdeaDelTaller) => void; foco?: FocoDeEspecificaciones | null }> = ({ visible, onClose, idea, onIdea, foco }) => {
  const t = useT();
  const dir = useDireccion();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  useCerrarConEscape(visible, onClose);
  const lista = useRef<ScrollView>(null);
  const posiciones = useRef<Record<string, number>>({});
  /* Abierta desde una celda de la tarjeta: la hoja baja hasta SU control en cuanto está medido (en la web el Modal monta tarde: se espera a su medida, no a un reloj). */
  const pendiente = useRef<string | null>(null);
  const bajar = (id: string) => { const y = posiciones.current[id]; if (y !== undefined && lista.current) { lista.current.scrollTo({ y: Math.max(0, y - 8), animated: false }); pendiente.current = null; } };
  useEffect(() => {
    pendiente.current = visible && foco ? foco : null;
    if (!pendiente.current) return;
    const espera = setTimeout(() => { if (pendiente.current) bajar(pendiente.current); }, 150);
    return () => clearTimeout(espera);
  }, [visible, foco]);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.velo} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')} />
      <View style={[styles.hoja, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]} accessibilityViewIsModal>
        <View style={styles.asa} />
        <ScrollView ref={lista} style={{ maxHeight: Math.max(240, height * 0.62) }} contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <ContenidoDeEspecificaciones idea={idea} onIdea={onIdea} onPosicion={(id, y) => { posiciones.current[id] = y; if (pendiente.current === id) bajar(id); }} />
        </ScrollView>
        <TouchableOpacity onPress={onClose} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={t('filmmaker.ideaFieldDone')} style={styles.listo}>
          <Text style={[textoPortada(15, '600'), { color: P.sobreAccion }]}>{t('filmmaker.ideaFieldDone')}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  velo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  hoja: { backgroundColor: P.superficie, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderColor: P.bordeLuz, borderWidth: 1, borderBottomWidth: 0, paddingHorizontal: 16, paddingTop: 8, gap: 10, width: '100%', maxWidth: 760, alignSelf: 'center' },
  asa: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: P.bordeLuz, marginBottom: 6 },
  contenido: { paddingBottom: 4 },
  listo: { minHeight: 48, borderRadius: 24, backgroundColor: P.accion, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
});
