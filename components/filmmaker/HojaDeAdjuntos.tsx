import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, TextInput, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { IconoWee } from '../icons/IconoWee';
import IconoDireccional from '../IconoDireccional';
import { useT, useIdioma } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { PORTADA_WEEAI as P, textoPortada } from '../../constants/estiloWeeAi';
import { ADJUNTOS, TOPES } from '../../constants/filmmakerIdea';
import { scale } from '../../utils/scale';

/**
 * LA HOJA DEL «+» DE FILMMAKER (2026-11-17): qué se puede añadir a lo que se escribe. «Pegar texto» está abierto —pega o escribe un guion o unas
 * notas largas (hasta 12 000 caracteres) y lo lleva a la caja—; Documento, Imagen de referencia y Audio salen CERRADOS con su motivo visible y
 * anunciable (no hay capacidad detrás: no se simula ninguna). Una sola hoja, la misma desde las dos capas.
 */
export const HojaDeAdjuntos: React.FC<{ visible: boolean; onClose: () => void; onUsarTexto: (texto: string) => void }> = ({ visible, onClose, onUsarTexto }) => {
  const t = useT();
  const { formato } = useIdioma();
  const dir = useDireccion();
  const insets = useSafeAreaInsets();
  const [vista, setVista] = useState<'menu' | 'pegar'>('menu');
  const [texto, setTexto] = useState('');
  useEffect(() => { if (!visible) { setVista('menu'); setTexto(''); } }, [visible]);
  const hay = texto.trim().length > 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.velo} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')} />
      <View style={[styles.hoja, { paddingBottom: Math.max(insets.bottom, 12) + 8, maxHeight: '86%' }]} accessibilityViewIsModal>
        <View style={styles.asa} />
        {vista === 'menu' ? (
          <ScrollView contentContainerStyle={styles.filas} keyboardShouldPersistTaps="handled">
            <Text style={[textoPortada(18, '600'), dir.texto, { color: P.tinta, paddingBottom: 4 }]} accessibilityRole="header">{t('filmmaker.attachTitle')}</Text>
            {ADJUNTOS.map((a) => (
              <TouchableOpacity
                key={a.id}
                onPress={a.cerrado ? undefined : () => setVista('pegar')}
                disabled={a.cerrado}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={a.cerrado ? `${t(a.clave)}. ${t(a.claveMotivo)}` : `${t(a.clave)}. ${t(a.claveSub)}`}
                accessibilityState={{ disabled: a.cerrado }}
                style={[styles.fila, dir.contenedor, a.cerrado && styles.filaCerrada]}
              >
                <View style={styles.icono}><IconoWee name={a.icono} size={scale(22)} color={a.cerrado ? P.tintaDeshabilitada : P.tinta} /></View>
                <View style={styles.textos}>
                  <Text style={[textoPortada(16, '600'), dir.texto, { color: a.cerrado ? P.tintaSecundaria : P.tinta }]} numberOfLines={1}>{t(a.clave)}</Text>
                  <Text style={[textoPortada(13, '400'), dir.texto, { color: P.tintaSecundaria }]} numberOfLines={3}>{a.cerrado ? t(a.claveMotivo) : t(a.claveSub)}</Text>
                </View>
                {a.cerrado ? <Ionicons name="lock-closed-outline" size={16} color={P.tintaDeshabilitada} /> : <IconoDireccional name="chevron-forward" size={scale(18)} color={P.tintaSecundaria} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.pegar}>
            <View style={[styles.titulo, dir.contenedor]}>
              <TouchableOpacity onPress={() => setVista('menu')} style={styles.atras} accessibilityRole="button" accessibilityLabel={t('common.back')}>
                <IconoDireccional name="arrow-back" size={scale(22)} color={P.tinta} />
              </TouchableOpacity>
              <Text style={[textoPortada(18, '600'), dir.texto, { color: P.tinta, flex: 1 }]} numberOfLines={1} accessibilityRole="header">{t('filmmaker.attachPaste')}</Text>
            </View>
            <Text style={[textoPortada(13, '400'), dir.texto, { color: P.tintaSecundaria, marginBottom: 8 }]}>{t('filmmaker.attachPasteHint')}</Text>
            <TextInput
              value={texto}
              onChangeText={setTexto}
              multiline
              maxLength={TOPES.guion}
              autoFocus
              placeholder={t('filmmaker.attachPastePlaceholder')}
              placeholderTextColor={P.tintaSecundaria}
              selectionColor={P.luz}
              accessibilityLabel={t('filmmaker.attachPaste')}
              textAlignVertical="top"
              style={[styles.campo, textoPortada(scale(16), '400'), dir.texto, { color: P.tinta }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
            />
            <View style={[styles.pie, dir.contenedor]}>
              <Text style={[textoPortada(13, '400'), { color: P.tintaSecundaria, flex: 1 }]} accessibilityLiveRegion="polite">
                {t('filmmaker.attachPasteCount', { n: formato.numero(Array.from(texto).length), max: formato.numero(TOPES.guion) })}
              </Text>
              <TouchableOpacity
                onPress={() => { onUsarTexto(texto.trim()); onClose(); }}
                disabled={!hay}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={t('filmmaker.attachPasteUse')}
                accessibilityState={{ disabled: !hay }}
                style={[styles.usar, !hay && styles.usarApagado]}
              >
                <Text style={[textoPortada(15, '600'), { color: hay ? P.sobreAccion : P.tintaDeshabilitada }]}>{t('filmmaker.attachPasteUse')}</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  fila: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 64, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, borderWidth: 1, borderColor: P.bordeLuz, backgroundColor: P.fondo },
  filaCerrada: { borderStyle: 'dashed', borderColor: P.bordeCapsula },
  icono: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: P.superficie },
  textos: { flex: 1, gap: 2 },
  titulo: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
  atras: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pegar: { flexShrink: 1 },
  campo: { minHeight: 160, maxHeight: 320, borderRadius: 16, borderWidth: 1, borderColor: P.bordeCapsula, backgroundColor: P.fondo, padding: 12 },
  pie: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  usar: { minHeight: 48, paddingHorizontal: 22, borderRadius: 24, backgroundColor: P.accion, alignItems: 'center', justifyContent: 'center' },
  usarApagado: { backgroundColor: 'transparent', borderWidth: 1, borderColor: P.bordeCapsula },
});
