import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView, Platform } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RellenoDeDegradado } from '../../GradienteDeMarca';
import { FilaDePildoras } from './PiezasDeElementos';
import { useT } from '../../../contexts/IdiomaContext';
import { useDireccion } from '../../../hooks/useDireccion';
import { useEstiloWeeAi } from '../../../hooks/useEstiloWeeAi';
import { ARTE_WEEAI } from '../../../constants/marca';
import { ESPACIO_WEEAI as SP, RADIO_WEEAI, textoWeeAi } from '../../../constants/estiloWeeAi';
import type { ElementoPropio, TipoDePropio } from '../../../services/elementosStore';
import { scale } from '../../../utils/scale';

interface Props {
  visible: boolean;
  tipo: TipoDePropio;
  onClose: () => void;
  onGuardar: (datos: { nombre: string; uris: string[]; clase?: ElementoPropio['clase'] }) => void;
}

const MAXIMO_DE_FOTOS = 5;
const isWeb = Platform.OS === 'web';

/**
 * «NUEVO»: un personaje, un escenario o una prenda propios, de 1 a 5 fotos con nombre. Es solo interfaz: las fotos se quedan como rutas
 * LOCALES (no se suben ni se validan aquí) y lo guardado vive solo en este dispositivo. El permiso de galería se pide con el selector de
 * siempre, al tocar «Subir», no al abrir la pantalla. La confirmación de permiso y el aviso de menores son una PROPUESTA de texto: solo
 * prometen lo que la interfaz hace (guardar en este dispositivo), no nada del servidor.
 */
const NuevoElemento: React.FC<Props> = ({ visible, tipo, onClose, onGuardar }) => {
  const c = useEstiloWeeAi();
  const t = useT();
  const dir = useDireccion();
  const arte = ARTE_WEEAI.claro;
  const [nombre, setNombre] = useState('');
  const [uris, setUris] = useState<string[]>([]);
  const [clase, setClase] = useState<'persona' | 'mascota' | 'objeto'>('persona');
  const [permiso, setPermiso] = useState(false);

  const reiniciar = () => {
    setNombre('');
    setUris([]);
    setClase('persona');
    setPermiso(false);
  };
  const cerrar = () => {
    reiniciar();
    onClose();
  };
  const subir = async () => {
    try {
      if (!isWeb) {
        const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!p.granted) return;
      }
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, allowsMultipleSelection: true, selectionLimit: MAXIMO_DE_FOTOS - uris.length });
      if (!r.canceled) setUris((u) => [...u, ...r.assets.map((a) => a.uri)].slice(0, MAXIMO_DE_FOTOS));
    } catch (e) {
      console.warn('No se pudieron elegir las fotos:', e);
    }
  };
  const puede = nombre.trim().length > 0 && uris.length >= 1 && permiso;
  const guardar = () => {
    if (!puede) return;
    onGuardar({ nombre, uris, clase: tipo === 'personaje' ? clase : undefined });
    reiniciar();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={cerrar}>
      <SafeAreaView style={[styles.pantalla, { backgroundColor: c.fondo }]} edges={['top', 'bottom']}>
        <View style={[styles.cabecera, dir.contenedor]}>
          <TouchableOpacity onPress={cerrar} accessibilityRole="button" accessibilityLabel={t('common.close')} style={styles.cerrar}>
            <Ionicons name="close" size={scale(24)} color={c.tinta} />
          </TouchableOpacity>
          <Text numberOfLines={1} style={[textoWeeAi('enfasis', '600'), styles.titulo, dir.texto, { color: c.tinta }]} accessibilityRole="header">{t('common.new')}</Text>
        </View>
        <ScrollView contentContainerStyle={styles.cuerpo} keyboardShouldPersistTaps="handled">
          <TextInput
            value={nombre}
            onChangeText={setNombre}
            placeholder={t('communities.name')}
            placeholderTextColor={c.tintaTerciaria}
            maxLength={30}
            style={[styles.campo, textoWeeAi('cuerpo'), dir.texto, { backgroundColor: c.superficie, color: c.tinta }]}
            accessibilityLabel={t('communities.name')}
          />
          {tipo === 'personaje' ? (
            <FilaDePildoras opciones={[{ id: 'persona', texto: t('weeai.tPerson') }, { id: 'mascota', texto: t('weeai.tPet') }, { id: 'objeto', texto: t('filmmaker.focusObject') }]} puesta={clase} onElegir={(id) => setClase(id as typeof clase)} />
          ) : null}
          <Text style={[textoWeeAi('nota'), dir.texto, { color: c.tintaSecundaria }]}>{t('weeai.newPhotos')}</Text>
          <View style={[styles.fotos, dir.contenedor]}>
            {uris.map((u) => (
              <View key={u} style={[styles.foto, { backgroundColor: c.superficieAlta }]}>
                <Image source={{ uri: u }} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />
                <TouchableOpacity onPress={() => setUris((x) => x.filter((y) => y !== u))} accessibilityRole="button" accessibilityLabel={t('common.delete')} style={[styles.quitar, { backgroundColor: c.seleccion }]} hitSlop={8}>
                  <Ionicons name="close" size={scale(12)} color={c.sobreSeleccion} />
                </TouchableOpacity>
              </View>
            ))}
            {uris.length < MAXIMO_DE_FOTOS ? (
              <TouchableOpacity onPress={subir} accessibilityRole="button" accessibilityLabel={t('weeai.bUpload')} style={[styles.foto, styles.subir, { backgroundColor: c.superficie }]}>
                <Ionicons name="add" size={scale(26)} color={c.tinta} />
                <Text numberOfLines={1} style={[textoWeeAi('nota', '600'), { color: c.tinta }]}>{t('weeai.bUpload')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          {/* Aviso y confirmación (propuesta de texto: solo promete lo que la interfaz hace). */}
          <Text style={[textoWeeAi('nota'), dir.texto, { color: c.tintaSecundaria }]}>{t('weeai.minorsWarning')}</Text>
          <TouchableOpacity onPress={() => setPermiso((p) => !p)} accessibilityRole="checkbox" accessibilityState={{ checked: permiso }} style={[styles.confirmar, dir.contenedor]}>
            <View style={[styles.casilla, { backgroundColor: permiso ? c.seleccion : c.superficie }]}>{permiso ? <Ionicons name="checkmark" size={scale(14)} color={c.sobreSeleccion} /> : null}</View>
            <Text style={[textoWeeAi('nota'), styles.confirmarTexto, dir.texto, { color: c.tinta }]}>{t('weeai.privacyConfirm')}</Text>
          </TouchableOpacity>
          <Text style={[textoWeeAi('nota'), dir.texto, { color: c.tintaTerciaria }]}>{t('weeai.localOnly')}</Text>
        </ScrollView>
        <View style={styles.pie}>
          <TouchableOpacity onPress={guardar} disabled={!puede} accessibilityRole="button" accessibilityState={{ disabled: !puede }} style={[styles.guardar, { opacity: puede ? 1 : 0.4 }]}>
            <RellenoDeDegradado colores={arte.accion} radio={RADIO_WEEAI.pastilla} espejo={dir.esRTL} />
            <Text numberOfLines={1} style={[textoWeeAi('enfasis', '600'), { color: '#0A0A0A' }]}>{t('common.save')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: SP.sm, paddingHorizontal: SP.sm, minHeight: 56 },
  cerrar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titulo: { flex: 1 },
  cuerpo: { padding: SP.md, gap: SP.md },
  campo: { minHeight: 52, borderRadius: RADIO_WEEAI.control, paddingHorizontal: SP.md },
  fotos: { flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm },
  foto: { width: scale(88), height: scale(88), borderRadius: RADIO_WEEAI.control, overflow: 'hidden' },
  subir: { alignItems: 'center', justifyContent: 'center', gap: 4 },
  quitar: { position: 'absolute', top: 4, end: 4, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  confirmar: { flexDirection: 'row', alignItems: 'center', gap: SP.sm, minHeight: 44 },
  casilla: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  confirmarTexto: { flex: 1 },
  pie: { padding: SP.md },
  guardar: { minHeight: 52, borderRadius: RADIO_WEEAI.pastilla, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});

export default NuevoElemento;
