import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, TextInput, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconoWee } from '../icons/IconoWee';
import IconoDireccional from '../IconoDireccional';
import { useT, useIdioma } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { PORTADA_WEEAI as P, textoPortada } from '../../constants/estiloWeeAi';
import { ADJUNTOS, TOPES } from '../../constants/filmmakerIdea';
import { scale } from '../../utils/scale';
import type { NombreDeIcono } from '../icons/trazosDeWee';
import { useCerrarConEscape } from '../../hooks/useCerrarConEscape';
import { LECTURA_DE_DOCUMENTOS_ABIERTA } from '../../constants/filmmakerDocumentos';
import { selectorDisponible } from '../../services/selectorDeDocumentos';
import { useDocumentoDeReferencia } from '../../hooks/useDocumentoDeReferencia';

/**
 * UN DESTINO DE LA REJILLA: icono grande y una palabra (≥ 44 dp de alto y de ancho). `apagado` lo deja casi invisible (lo cerrado), sin texto extra: su motivo
 * sale en la única línea de ayuda cuando la persona lo toca.
 */
const Destino: React.FC<{ icono: NombreDeIcono; etiqueta: string; onPress: () => void; apagado?: boolean; ocupado?: boolean; ancho: 'mitad' | 'tercio' }> = ({ icono, etiqueta, onPress, apagado, ocupado, ancho }) => (
  <TouchableOpacity onPress={onPress} disabled={ocupado} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={etiqueta} accessibilityState={{ disabled: !!apagado || !!ocupado }} style={[styles.destino, ancho === 'mitad' ? styles.mitad : styles.tercio, apagado && styles.apagado]}>
    <IconoWee name={icono} size={scale(26)} color={apagado ? P.tintaDeshabilitada : P.tinta} />
    <Text style={[textoPortada(13, '500'), { color: apagado ? P.tintaDeshabilitada : P.tinta }]} numberOfLines={2}>{etiqueta}</Text>
  </TouchableOpacity>
);

export const HojaDeAdjuntos: React.FC<{ visible: boolean; onClose: () => void; onUsarTexto: (texto: string) => void; onImagen: () => void; onDesdeCreaciones: () => void }> = ({ visible, onClose, onUsarTexto, onImagen, onDesdeCreaciones }) => {
  const t = useT();
  const { formato } = useIdioma();
  const dir = useDireccion();
  const insets = useSafeAreaInsets();
  const [vista, setVista] = useState<'menu' | 'pegar'>('menu');
  const [texto, setTexto] = useState('');
  const doc = useDocumentoDeReferencia();
  useEffect(() => { if (!visible) { setVista('menu'); setTexto(''); } }, [visible]);
  useCerrarConEscape(visible, onClose);
  const hay = texto.trim().length > 0;
  const viva = LECTURA_DE_DOCUMENTOS_ABIERTA && selectorDisponible();
  const estadoDoc = doc.estado;
  const ocupado = estadoDoc === 'subiendo' || estadoDoc === 'leyendo';
  /* La línea de ayuda es UNA: el estado del documento si hay uno en curso, el motivo si se tocó «Documento» cerrado, y si no, la regla de siempre. */
  const linea = viva && estadoDoc === 'subiendo' ? t('filmmakerDocumentos.uploading')
    : viva && estadoDoc === 'cotizado' ? t('filmmakerDocumentos.price', { credits: doc.cotizacion?.credits ?? 0 })
    : viva && estadoDoc === 'leyendo' ? t('filmmakerDocumentos.reading')
    : viva && estadoDoc === 'listo' ? t('filmmakerDocumentos.done')
    : viva && estadoDoc === 'error' && doc.errorClave ? t(doc.errorClave)
    : t('filmmaker.attachHint');
  const alDocumento = () => {
    if (estadoDoc === 'cotizado') { void doc.confirmar(); return; }
    if (estadoDoc !== 'listo') void doc.seleccionar();
  };
  /* Cada destino hace lo suyo: «Imagen» abre la galería (la hoja se cierra mientras se elige), «Texto» cambia de vista y «Mis proyectos» abre su selector. */
  const alPulsar = (id: string) => {
    if (id === 'paste') { setVista('pegar'); return; }
    onClose();
    if (id === 'projects') onDesdeCreaciones(); else onImagen();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.velo} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')} />
      <View style={[styles.hoja, { paddingBottom: Math.max(insets.bottom, 12) + 8, maxHeight: '86%' }]} accessibilityViewIsModal>
        <View style={styles.asa} />
        {vista === 'menu' ? (
          <View>
            <Text style={[textoPortada(16, '600'), dir.texto, { color: P.tinta, paddingBottom: 10 }]} accessibilityRole="header">{t('filmmaker.attachTitle')}</Text>
            <View style={[styles.rejilla, dir.contenedor]}>
              {ADJUNTOS.map((a) => <Destino key={a.id} ancho={viva ? 'mitad' : 'tercio'} icono={a.icono} etiqueta={t(a.clave)} onPress={() => alPulsar(a.id)} />)}
              {viva ? <Destino ancho="mitad" icono="documento" etiqueta={t('filmmaker.attachDocument')} onPress={alDocumento} ocupado={ocupado} /> : null}
            </View>
            <Text style={[textoPortada(13, '400'), dir.texto, { color: P.tintaSecundaria, paddingTop: 12 }]} accessibilityLiveRegion="polite">{linea}</Text>
            {!viva ? <Text style={[textoPortada(13, '400'), dir.texto, { color: P.tintaDeshabilitada, paddingTop: 4 }]}>{!LECTURA_DE_DOCUMENTOS_ABIERTA ? t('filmmakerDocumentos.errClosed') : t('filmmakerDocumentos.errUpdateApp')}</Text> : null}
          </View>
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
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  destino: { minHeight: 64, minWidth: 44, borderRadius: 18, borderWidth: 1, borderColor: P.bordeLuz, backgroundColor: P.fondo, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, paddingVertical: 8 },
  mitad: { flexBasis: '48%', flexGrow: 1, flexDirection: 'row', gap: 12 },
  tercio: { flex: 1, flexDirection: 'column', gap: 6, minHeight: 80 },
  apagado: { opacity: 0.45, borderStyle: 'dashed' },
  titulo: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
  atras: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pegar: { flexShrink: 1 },
  campo: { minHeight: 160, maxHeight: 320, borderRadius: 16, borderWidth: 1, borderColor: P.bordeCapsula, backgroundColor: P.fondo, padding: 12 },
  pie: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  usar: { minHeight: 48, paddingHorizontal: 22, borderRadius: 24, backgroundColor: P.accion, alignItems: 'center', justifyContent: 'center' },
  usarApagado: { backgroundColor: 'transparent', borderWidth: 1, borderColor: P.bordeCapsula },
});
