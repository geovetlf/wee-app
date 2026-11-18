import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useT, useIdioma } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { PORTADA_WEEAI as P, textoPortada } from '../../constants/estiloWeeAi';
import { FORMATOS_DE_ANUNCIO } from '../../constants/filmmakerIdea';
import { IdeaDelTaller, duracionDe, duracionesDelTipo, etiquetaAccesible, poner } from '../../utils/ideaDeFilmmaker';

/**
 * LA HOJA «PROYECTO» (hoja única, a un toque desde la barra de etapas): los ajustes de toda la obra en un solo sitio —duración y, en un anuncio, formato—.
 * Lo que aún no se puede cambiar (el estilo visual depende de generar imágenes) sale CERRADO con su motivo. Cambia la idea, no crea nada nuevo.
 */
export const HojaDeProyecto: React.FC<{ visible: boolean; onClose: () => void; idea: IdeaDelTaller; onIdea: (i: IdeaDelTaller) => void }> = ({ visible, onClose, idea, onIdea }) => {
  const t = useT();
  const { formato } = useIdioma();
  const dir = useDireccion();
  const insets = useSafeAreaInsets();
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
        {idea.tipo === 'ad' ? (
          <>
            <Text style={[textoPortada(13, '500'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmaker.projFormat')}</Text>
            <View style={[styles.fila, dir.contenedor]}>
              {FORMATOS_DE_ANUNCIO.map((f) => chip(`f${f}`, `⁦${f}⁩`, (idea.valores.format ?? '4:5') === f, () => onIdea(poner(idea, 'format', f))))}
            </View>
          </>
        ) : null}
        <View accessible accessibilityLabel={etiquetaAccesible(t('filmmaker.projStyle'), t('filmmaker.hubNotYet'), t('filmmaker.projStyleClosed'))} accessibilityState={{ disabled: true }} style={[styles.cerrada, dir.contenedor]}>
          <View style={{ flex: 1 }}>
            <Text style={[textoPortada(14, '600'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmaker.projStyle')}</Text>
            <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmaker.projStyleClosed')}</Text>
          </View>
          <Ionicons name="lock-closed-outline" size={14} color={P.tintaDeshabilitada} />
        </View>
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
  cerrada: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: P.bordeCapsula },
  listo: { minHeight: 48, borderRadius: 24, backgroundColor: P.accion, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
});
