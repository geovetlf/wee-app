import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useT, useIdioma } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { PORTADA_WEEAI as P, textoPortada } from '../../constants/estiloWeeAi';
import { FORMATOS, RESOLUCIONES_ELEGIBLES } from '../../constants/filmmakerIdea';
import { useCerrarConEscape } from '../../hooks/useCerrarConEscape';
import { IdeaDelTaller, duracionDe, duracionesDelTipo, etiquetaAccesible, poner } from '../../utils/ideaDeFilmmaker';

/**
 * LA HOJA «PROYECTO» (hoja única, a un toque desde la barra de etapas): los ajustes de toda la obra en un solo sitio —duración y, en un anuncio, formato—.
 * El estilo ya no se cambia aquí: se elige en su capa y se cambia desde la píldora. Weë propone lo técnico; el nivel AVANZADO es opcional, va plegado a un toque y
 * ofrece lo que el contrato admite al crear (formato y resolución); modelo y consistencia salen CERRADOS con su motivo. Cambia la idea, no crea nada nuevo.
 */
export const HojaDeProyecto: React.FC<{ visible: boolean; onClose: () => void; idea: IdeaDelTaller; onIdea: (i: IdeaDelTaller) => void }> = ({ visible, onClose, idea, onIdea }) => {
  const t = useT();
  const { formato } = useIdioma();
  const dir = useDireccion();
  const insets = useSafeAreaInsets();
  const [avanzado, setAvanzado] = useState(false);
  useCerrarConEscape(visible, onClose);
  const actual = duracionDe(idea);
  const duraciones = duracionesDelTipo(idea.tipo);
  const chip = (clave: string, etiqueta: string, sel: boolean, onPress: () => void) => (
    <TouchableOpacity key={clave} onPress={onPress} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={etiqueta} accessibilityState={{ selected: sel }} style={[styles.chip, sel && styles.chipSel]}>
      <Text style={[textoPortada(14, sel ? '600' : '500'), { color: P.tinta }]}>{etiqueta}</Text>
    </TouchableOpacity>
  );
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.velo} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')} />
      <View style={[styles.hoja, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]} accessibilityViewIsModal>
        <View style={styles.asa} />
        <Text style={[textoPortada(18, '600'), dir.texto, { color: P.tinta }]} accessibilityRole="header">{t('filmmaker.projTitle')}</Text>
        <Text style={[textoPortada(13, '500'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmaker.projDuration')}</Text>
        <View style={[styles.fila, dir.contenedor]}>
          {duraciones.map((s) => chip(`d${s}`, t('filmmaker.hubSeconds', { n: formato.numero(s) }), s === actual, () => onIdea(poner(idea, 'duration', String(s)))))}
        </View>
        <TouchableOpacity onPress={() => setAvanzado((v) => !v)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t('filmmaker.projAdvanced')} accessibilityState={{ expanded: avanzado }} style={[styles.avanzado, dir.contenedor]}>
          <Text style={[textoPortada(14, '600'), dir.texto, { color: P.tintaSecundaria, flex: 1 }]}>{t('filmmaker.projAdvanced')}</Text>
          <Ionicons name={avanzado ? 'chevron-up' : 'chevron-down'} size={16} color={P.tintaSecundaria} />
        </TouchableOpacity>
        {avanzado ? (
          <View style={styles.bloque}>
            <Text style={[textoPortada(13, '500'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmaker.projFormat')}</Text>
            <View style={[styles.fila, dir.contenedor]}>
              {chip('fauto', t('filmmaker.hubAuto'), !idea.valores.format, () => onIdea(poner(idea, 'format', '')))}
              {FORMATOS.map((f) => chip(`f${f}`, `⁦${f}⁩`, idea.valores.format === f, () => onIdea(poner(idea, 'format', f))))}
            </View>
            <Text style={[textoPortada(13, '500'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmaker.projResolution')}</Text>
            <View style={[styles.fila, dir.contenedor]}>
              {chip('rauto', t('filmmaker.hubAuto'), !idea.valores.resolution, () => onIdea(poner(idea, 'resolution', '')))}
              {RESOLUCIONES_ELEGIBLES.map((r) => chip(`r${r}`, r, idea.valores.resolution === r, () => onIdea(poner(idea, 'resolution', r))))}
            </View>
            <Text style={[textoPortada(13, '400'), dir.texto, { color: P.tintaSecundaria }]} accessibilityLiveRegion="polite">{t('filmmaker.projAdvancedClosed')}</Text>
          </View>
        ) : null}
        <TouchableOpacity onPress={onClose} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={t('filmmaker.ideaFieldDone')} style={styles.listo}>
          <Text style={[textoPortada(15, '600'), { color: P.sobreAccion }]}>{t('filmmaker.ideaFieldDone')}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  velo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  hoja: { backgroundColor: P.superficie, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderColor: P.bordeLuz, borderWidth: 1, borderBottomWidth: 0, paddingHorizontal: 16, paddingTop: 8, gap: 10 },
  asa: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: P.bordeLuz, marginBottom: 6 },
  fila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  chip: { minHeight: 44, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1, borderColor: P.bordeCapsula, backgroundColor: P.fondo, alignItems: 'center', justifyContent: 'center' },
  chipSel: { borderColor: '#FFFFFF', borderWidth: 2, backgroundColor: P.superficieAlta },
  bloque: { gap: 10 },
  avanzado: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  listo: { minHeight: 48, borderRadius: 24, backgroundColor: P.accion, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
});
