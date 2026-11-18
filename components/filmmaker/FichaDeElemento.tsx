import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, TextInput, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useT } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { PORTADA_WEEAI as P, textoPortada } from '../../constants/estiloWeeAi';
import { CLAVE_DE_GRUPO } from '../../constants/filmmakerUniverso';
import { VOCES_PREDETERMINADAS } from '../../constants/filmmakerSonido';
import { SelectorDeVoz } from './sonido/SelectorDeVoz';
import { ContextoDeVoz, VOZ_AUTO, vozPorId } from '../../utils/sonidoDeFilmmaker';
import { ElementoDeUniverso, GRUPOS, GrupoDePersonaje, TOPES_UNIVERSO, VozDePersonaje } from '../../utils/universoDeFilmmaker';
import { etiquetaAccesible } from '../../utils/ideaDeFilmmaker';

/** Lo que de una ficha todavía no se puede hacer, con su motivo: estilo visual (imágenes sin autorizar) y variantes (D1); la voz y los sonidos viven en «Personalizar voz y sonidos». */
const CONTEXTO_FICHA: ContextoDeVoz = 'character';
const CERRADAS = [
  { id: 'style', clave: 'filmmaker.sheetStyle', claveMotivo: 'filmmaker.sheetStyleClosed' },
  { id: 'variants', clave: 'filmmaker.sheetVariants', claveMotivo: 'filmmaker.sheetVariantsClosed' },
] as const;

/**
 * LA FICHA DE UN ELEMENTO DEL UNIVERSO (hoja inferior): nombre, línea y, en un personaje, su grupo —lo editable hoy—; y estilo visual, voz y variantes
 * como filas CERRADAS con su motivo. «Quitar» pide un segundo toque (no hay deshacer). Los cambios se guardan al pulsar «Listo».
 */
export const FichaDeElemento: React.FC<{
  elemento: ElementoDeUniverso | null;
  onClose: () => void;
  onGuardar: (id: string, cambios: { nombre: string; linea: string; grupo: GrupoDePersonaje; voz: VozDePersonaje }) => void;
  onQuitar: (id: string) => void;
}> = ({ elemento, onClose, onGuardar, onQuitar }) => {
  const t = useT();
  const dir = useDireccion();
  const insets = useSafeAreaInsets();
  const [nombre, setNombre] = useState('');
  const [linea, setLinea] = useState('');
  const [grupo, setGrupo] = useState<GrupoDePersonaje>('main');
  const [voz, setVoz] = useState<VozDePersonaje>(VOZ_AUTO);
  const [vocesAbierto, setVocesAbierto] = useState(false);;
  const [seguro, setSeguro] = useState(false);
  useEffect(() => { if (elemento) { setNombre(elemento.nombre); setLinea(elemento.linea); setGrupo(elemento.grupo); setVoz(elemento.voz); setSeguro(false); setVocesAbierto(false); } }, [elemento]);
  if (!elemento) return null;
  const valido = nombre.trim().length > 0;
  const nombreDeVoz = voz === VOZ_AUTO ? t('filmmakerSonido.voiceAuto') : vozPorId(VOCES_PREDETERMINADAS, voz)?.nombre ?? t('filmmakerSonido.voiceAuto');
  const campo = [styles.campo, textoPortada(16, '400'), dir.texto, { color: P.tinta }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)];

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.velo} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')} />
      <View style={[styles.hoja, { paddingBottom: Math.max(insets.bottom, 12) + 8, maxHeight: '90%' }]} accessibilityViewIsModal>
        <View style={styles.asa} />
        <ScrollView contentContainerStyle={{ gap: 10 }} keyboardShouldPersistTaps="handled">
          <Text style={[textoPortada(18, '600'), dir.texto, { color: P.tinta }]} accessibilityRole="header">{t('filmmaker.sheetTitle')}</Text>
          <Text style={[textoPortada(13, '500'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmaker.sheetName')}</Text>
          <TextInput value={nombre} onChangeText={setNombre} maxLength={TOPES_UNIVERSO.nombre} accessibilityLabel={t('filmmaker.sheetName')} placeholderTextColor={P.tintaSecundaria} selectionColor={P.luz} style={campo} />
          <Text style={[textoPortada(13, '500'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmaker.sheetLine')}</Text>
          <TextInput value={linea} onChangeText={setLinea} maxLength={TOPES_UNIVERSO.linea} multiline accessibilityLabel={t('filmmaker.sheetLine')} placeholderTextColor={P.tintaSecundaria} selectionColor={P.luz} style={[...campo, { minHeight: 76 }]} textAlignVertical="top" />
          {elemento.tipo === 'character' ? (
            <>
              <Text style={[textoPortada(13, '500'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmaker.sheetGroup')}</Text>
              <View style={[styles.fila, dir.contenedor]}>
                {GRUPOS.map((g) => (
                  <TouchableOpacity key={g} onPress={() => setGrupo(g)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t(CLAVE_DE_GRUPO[g])} accessibilityState={{ selected: grupo === g }} style={[styles.chip, grupo === g && styles.chipSel]}>
                    <Text style={[textoPortada(14, grupo === g ? '600' : '500'), { color: P.tinta }]}>{t(CLAVE_DE_GRUPO[g])}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : null}
          {elemento.tipo === 'character' ? (
            <View style={styles.sonido}>
              <Text style={[textoPortada(13, '500'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmaker.sheetVoiceLabel')}</Text>
              <TouchableOpacity onPress={() => setVocesAbierto(true)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={etiquetaAccesible(t('filmmaker.sheetVoiceLabel'), nombreDeVoz)} style={[styles.selector, dir.contenedor]}>
                <Text style={[textoPortada(15, '600'), dir.texto, { color: P.tinta, flex: 1 }]} numberOfLines={1}>{nombreDeVoz}</Text>
                <Ionicons name={dir.esRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={P.tintaSecundaria} />
              </TouchableOpacity>
            </View>
          ) : null}
          {CERRADAS.map((c) => (
            <View key={c.id} accessible accessibilityLabel={etiquetaAccesible(t(c.clave), t('filmmaker.hubNotYet'), t(c.claveMotivo))} accessibilityState={{ disabled: true }} style={[styles.cerrada, dir.contenedor]}>
              <View style={{ flex: 1 }}>
                <Text style={[textoPortada(14, '600'), dir.texto, { color: P.tintaSecundaria }]}>{t(c.clave)}</Text>
                <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]}>{t(c.claveMotivo)}</Text>
              </View>
              <Ionicons name="lock-closed-outline" size={14} color={P.tintaDeshabilitada} />
            </View>
          ))}
          <View style={[styles.fila, dir.contenedor, { marginTop: 4 }]}>
            <TouchableOpacity onPress={seguro ? () => { onQuitar(elemento.id); onClose(); } : () => setSeguro(true)} accessibilityRole="button" accessibilityLabel={t(seguro ? 'filmmaker.sheetRemoveSure' : 'filmmaker.sheetRemove')} style={styles.quitar}>
              <Text style={[textoPortada(14, '600'), { color: P.tinta }]}>{t(seguro ? 'filmmaker.sheetRemoveSure' : 'filmmaker.sheetRemove')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { if (valido) { onGuardar(elemento.id, { nombre, linea, grupo, voz }); onClose(); } }} disabled={!valido} accessibilityRole="button" accessibilityLabel={t('filmmaker.ideaFieldDone')} accessibilityState={{ disabled: !valido }} style={[styles.listo, !valido && styles.listoApagado]}>
              <Text style={[textoPortada(15, '600'), { color: valido ? P.sobreAccion : P.tintaDeshabilitada }]}>{t('filmmaker.ideaFieldDone')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
      <SelectorDeVoz visible={vocesAbierto} onClose={() => setVocesAbierto(false)} contexto={CONTEXTO_FICHA} valor={voz} nombre={nombre} onCambiar={(v) => setVoz(v ?? VOZ_AUTO)} />
    </Modal>
  );
};

const styles = StyleSheet.create({
  velo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  hoja: { backgroundColor: P.superficie, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderColor: P.bordeLuz, borderWidth: 1, borderBottomWidth: 0, paddingHorizontal: 16, paddingTop: 8 },
  asa: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: P.bordeLuz, marginBottom: 10 },
  campo: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: P.bordeLuz, backgroundColor: P.fondo, paddingHorizontal: 12, paddingVertical: 10 },
  fila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  chip: { minHeight: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1, borderColor: P.bordeCapsula, backgroundColor: P.fondo, alignItems: 'center', justifyContent: 'center' },
  chipSel: { borderColor: '#FFFFFF', borderWidth: 2, backgroundColor: P.superficieAlta },
  cerrada: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: P.bordeCapsula },
  selector: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, borderRadius: 24, borderWidth: 1, borderColor: P.bordeLuz, backgroundColor: P.fondo },
  sonido: { gap: 8, paddingVertical: 4 },
  quitar: { minHeight: 48, paddingHorizontal: 16, borderRadius: 24, borderWidth: 1, borderColor: P.bordeLuz, alignItems: 'center', justifyContent: 'center' },
  listo: { flex: 1, minHeight: 48, borderRadius: 24, backgroundColor: P.accion, alignItems: 'center', justifyContent: 'center' },
  listoApagado: { backgroundColor: 'transparent', borderWidth: 1, borderColor: P.bordeCapsula },
});
