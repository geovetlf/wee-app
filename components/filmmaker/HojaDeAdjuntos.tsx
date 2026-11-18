import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, TextInput, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconoWee } from '../icons/IconoWee';
import IconoDireccional from '../IconoDireccional';
import { useT, useIdioma } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { PORTADA_WEEAI as P, textoPortada } from '../../constants/estiloWeeAi';
import { ADJUNTOS, TOPES } from '../../constants/filmmakerIdea';
import { scale } from '../../utils/scale';
import { etiquetaAccesible } from '../../utils/ideaDeFilmmaker';
import { useCerrarConEscape } from '../../hooks/useCerrarConEscape';
import { LECTURA_DE_DOCUMENTOS_ABIERTA } from '../../constants/filmmakerDocumentos';
import { selectorDisponible } from '../../services/selectorDeDocumentos';
import { useDocumentoDeReferencia } from '../../hooks/useDocumentoDeReferencia';

/**
 * LA FILA «DOCUMENTO O LIBRO»: cerrada, con su motivo a la vista, mientras la lectura no esté abierta (`LECTURA_DE_DOCUMENTOS_ABIERTA`) o la build no traiga el
 * selector de archivos; abierta, elige el archivo y enseña el progreso con las claves de `filmmakerDocumentos`. No simula nada: cerrada no hace nada.
 */
const FilaDeDocumento: React.FC = () => {
  const t = useT();
  const dir = useDireccion();
  const doc = useDocumentoDeReferencia();
  const viva = LECTURA_DE_DOCUMENTOS_ABIERTA && selectorDisponible();
  const motivo = !LECTURA_DE_DOCUMENTOS_ABIERTA ? t('filmmakerDocumentos.errClosed') : !selectorDisponible() ? t('filmmakerDocumentos.errUpdateApp') : '';
  const estado = doc.estado;
  const sub = !viva ? motivo
    : estado === 'subiendo' ? t('filmmakerDocumentos.uploading')
    : estado === 'cotizado' ? t('filmmakerDocumentos.price', { credits: doc.cotizacion?.credits ?? 0 })
    : estado === 'leyendo' ? t('filmmakerDocumentos.reading')
    : estado === 'listo' ? t('filmmakerDocumentos.done')
    : estado === 'error' && doc.errorClave ? t(doc.errorClave)
    : t('filmmakerDocumentos.rowHint');
  const alPulsar = estado === 'cotizado' ? () => { void doc.confirmar(); } : () => { void doc.seleccionar(); };
  const accion = estado === 'cotizado' ? t('filmmakerDocumentos.confirm') : estado === 'error' ? t('filmmakerDocumentos.retry') : t('filmmakerDocumentos.pick');
  const ocupado = estado === 'subiendo' || estado === 'leyendo';
  return (
    <TouchableOpacity onPress={alPulsar} disabled={!viva || ocupado || estado === 'listo'} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={etiquetaAccesible(t('filmmakerDocumentos.rowTitle'), sub)} accessibilityState={{ disabled: !viva }} style={[styles.fila, dir.contenedor, !viva && styles.cerrada]}>
      <View style={styles.icono}><IconoWee name="texto" size={scale(22)} color={viva ? P.tinta : P.tintaSecundaria} /></View>
      <View style={styles.textos}>
        <Text style={[textoPortada(16, '600'), dir.texto, { color: viva ? P.tinta : P.tintaSecundaria }]} numberOfLines={1}>{t('filmmakerDocumentos.rowTitle')}</Text>
        <Text style={[textoPortada(13, '400'), dir.texto, { color: P.tintaSecundaria }]} numberOfLines={3} accessibilityLiveRegion="polite">{sub}</Text>
      </View>
      {viva && !ocupado && estado !== 'listo' ? <Text style={[textoPortada(13, '600'), { color: P.tinta }]}>{accion}</Text> : null}
    </TouchableOpacity>
  );
};

/**
 * LA HOJA DEL «+» DE FILMMAKER (2026-11-17): qué se puede añadir a lo que se escribe. «Pegar texto» —pega o escribe un guion o unas notas largas (hasta
 * 12 000 caracteres) y lo lleva a la caja— es la única fila viva; lo que aún no existe se dice en una línea al pie (no se simula nada). Escape la cierra en la web.
 */
export const HojaDeAdjuntos: React.FC<{ visible: boolean; onClose: () => void; onUsarTexto: (texto: string) => void }> = ({ visible, onClose, onUsarTexto }) => {
  const t = useT();
  const { formato } = useIdioma();
  const dir = useDireccion();
  const insets = useSafeAreaInsets();
  const [vista, setVista] = useState<'menu' | 'pegar'>('menu');
  const [texto, setTexto] = useState('');
  useEffect(() => { if (!visible) { setVista('menu'); setTexto(''); } }, [visible]);
  useCerrarConEscape(visible, onClose);
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
              <TouchableOpacity key={a.id} onPress={() => setVista('pegar')} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={etiquetaAccesible(t(a.clave), t(a.claveSub))} style={[styles.fila, dir.contenedor]}>
                <View style={styles.icono}><IconoWee name={a.icono} size={scale(22)} color={P.tinta} /></View>
                <View style={styles.textos}>
                  <Text style={[textoPortada(16, '600'), dir.texto, { color: P.tinta }]} numberOfLines={1}>{t(a.clave)}</Text>
                  <Text style={[textoPortada(13, '400'), dir.texto, { color: P.tintaSecundaria }]} numberOfLines={3}>{t(a.claveSub)}</Text>
                </View>
                <IconoDireccional name="chevron-forward" size={scale(18)} color={P.tintaSecundaria} />
              </TouchableOpacity>
            ))}
            <FilaDeDocumento />
            <Text style={[textoPortada(13, '400'), dir.texto, { color: P.tintaSecundaria, paddingTop: 4 }]}>{t('filmmaker.attachSoonMore')}</Text>
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
  cerrada: { opacity: 0.7, borderStyle: 'dashed' },
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
