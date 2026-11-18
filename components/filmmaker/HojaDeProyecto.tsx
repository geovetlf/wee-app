import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { PORTADA_WEEAI as P, textoPortada } from '../../constants/estiloWeeAi';
import { useCerrarConEscape } from '../../hooks/useCerrarConEscape';
import { IdeaDelTaller } from '../../utils/ideaDeFilmmaker';
import { ContenidoDeEspecificaciones } from './PanelDeEspecificaciones';

/**
 * LA HOJA «PROYECTO» (hoja única, a un toque desde la barra de etapas y desde el resumen de la Idea): las especificaciones de toda la obra en un solo sitio —modelo,
 * formato, resolución, duración y sonido—. El estilo no se cambia aquí: se elige en su capa y se cambia desde la píldora. El antiguo «Avanzado» vive ahora en
 * `PanelDeEspecificaciones`: Weë propone lo técnico (Auto) y la persona fija lo que quiera, solo con lo que el modelo elegido admite. Cambia la idea; no crea nada.
 */
export const HojaDeProyecto: React.FC<{ visible: boolean; onClose: () => void; idea: IdeaDelTaller; onIdea: (i: IdeaDelTaller) => void }> = ({ visible, onClose, idea, onIdea }) => {
  const t = useT();
  const dir = useDireccion();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  useCerrarConEscape(visible, onClose);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.velo} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')} />
      <View style={[styles.hoja, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]} accessibilityViewIsModal>
        <View style={styles.asa} />
        <ScrollView style={{ maxHeight: Math.max(240, height * 0.62) }} contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <ContenidoDeEspecificaciones idea={idea} onIdea={onIdea} />
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
