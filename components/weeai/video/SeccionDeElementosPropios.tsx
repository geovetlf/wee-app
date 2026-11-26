import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import NuevoElemento from './NuevoElemento';
import { useT } from '../../../contexts/IdiomaContext';
import { useDireccion } from '../../../hooks/useDireccion';
import { useEstiloWeeAi } from '../../../hooks/useEstiloWeeAi';
import { useElementos } from '../../../hooks/useElementos';
import { ESPACIO_WEEAI as SP, RADIO_WEEAI, textoWeeAi } from '../../../constants/estiloWeeAi';
import { confirmAction } from '../../../utils/notify';
import type { TipoDePropio } from '../../../services/elementosStore';
import { scale } from '../../../utils/scale';

/**
 * «MIS ESCENARIOS» y «MIS PERSONAJES» en Mis creaciones (el espacio de la CUENTA, igual desde las dos caras). Es la MISMA fuente local
 * que la hoja de elementos (`useElementos`): lo que se crea aquí aparece en «Míos» de la hoja. Local, sin sincronizar.
 *
 * «Crear escenario» ofrece dos caminos: «Subir» una foto (el selector de siempre, sin tocar subida ni validación) y «Describir» (un texto
 * corto que abre el flujo de creación de Imagen de siempre con el texto ya escrito y su coste visible; sin lógica nueva de cobro). El flujo
 * actual no tiene «guardar como escenario» al volver: el resultado se guarda donde siempre (Mis creaciones) y hoy no pasa solo a «Míos».
 */
const SeccionDeElementosPropios: React.FC<{ tipo: Exclude<TipoDePropio, 'ropa'> }> = ({ tipo }) => {
  const c = useEstiloWeeAi();
  const t = useT();
  const dir = useDireccion();
  const navigation = useNavigation<any>();
  const { propios, favoritos, crear, renombrar, borrar, alternarFavorito } = useElementos();
  const [nuevo, setNuevo] = useState(false);
  const [describiendo, setDescribiendo] = useState(false);
  const [descripcion, setDescripcion] = useState('');
  const [editando, setEditando] = useState<string | null>(null);
  const [borrador, setBorrador] = useState('');
  const lista = propios.filter((p) => p.tipo === tipo);
  const titulo = tipo === 'escenario' ? t('weeai.tabScenes') : t('filmmaker.characters');

  const describir = () => {
    const goal = descripcion.trim();
    if (!goal) return;
    setDescripcion('');
    setDescribiendo(false);
    navigation.navigate('CreatorFlow', { experienceId: 'design', goal });
  };
  const quitar = async (id: string) => {
    if (await confirmAction(t('common.delete'), '', t('common.delete'), true, t)) borrar(id);
  };

  return (
    <View style={styles.seccion}>
      <Text numberOfLines={1} style={[textoWeeAi('titulo', '600'), dir.texto, { color: c.tinta }]} accessibilityRole="header">{titulo}</Text>
      <View style={[styles.acciones, dir.contenedor]}>
        <TouchableOpacity onPress={() => setNuevo(true)} accessibilityRole="button" style={[styles.accion, dir.contenedor, { backgroundColor: c.superficie }]}>
          <Ionicons name={tipo === 'escenario' ? 'cloud-upload-outline' : 'add'} size={scale(20)} color={c.tinta} />
          <Text numberOfLines={1} style={[textoWeeAi('cuerpo', '600'), { color: c.tinta }]}>{tipo === 'escenario' ? t('weeai.bUpload') : t('common.new')}</Text>
        </TouchableOpacity>
        {tipo === 'escenario' ? (
          <TouchableOpacity onPress={() => setDescribiendo((d) => !d)} accessibilityRole="button" accessibilityState={{ expanded: describiendo }} style={[styles.accion, dir.contenedor, { backgroundColor: c.superficie }]}>
            <Ionicons name="create-outline" size={scale(20)} color={c.tinta} />
            <Text numberOfLines={1} style={[textoWeeAi('cuerpo', '600'), { color: c.tinta }]}>{t('weeai.describe')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {describiendo ? (
        <View style={[styles.describir, dir.contenedor, { backgroundColor: c.superficie }]}>
          <TextInput value={descripcion} onChangeText={setDescripcion} placeholder={t('weeai.sceneDescribePh')} placeholderTextColor={c.tintaTerciaria} maxLength={120} onSubmitEditing={describir} style={[styles.campo, textoWeeAi('cuerpo'), dir.texto, { color: c.tinta }]} accessibilityLabel={t('weeai.sceneDescribePh')} />
          <TouchableOpacity onPress={describir} accessibilityRole="button" accessibilityLabel={t('weeai.generate')} style={[styles.ir, { backgroundColor: c.seleccion }]}>
            <Ionicons name="arrow-forward" size={scale(18)} color={c.sobreSeleccion} style={dir.espejo} />
          </TouchableOpacity>
        </View>
      ) : null}

      {lista.length === 0 ? (
        <Text style={[textoWeeAi('cuerpo'), dir.texto, { color: c.tintaSecundaria }]}>{t('weeai.emptyMine')}</Text>
      ) : (
        <View style={styles.lista}>
          {lista.map((p) => (
            <View key={p.id} style={[styles.fila, dir.contenedor, { backgroundColor: c.superficie }]}>
              <View style={[styles.miniatura, { backgroundColor: c.superficieAlta }]}>{p.uris[0] ? <Image source={{ uri: p.uris[0] }} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} /> : null}</View>
              {editando === p.id ? (
                <TextInput
                  value={borrador}
                  onChangeText={setBorrador}
                  autoFocus
                  maxLength={30}
                  onBlur={() => { renombrar(p.id, borrador); setEditando(null); }}
                  onSubmitEditing={() => { renombrar(p.id, borrador); setEditando(null); }}
                  style={[styles.nombre, textoWeeAi('cuerpo', '600'), dir.texto, { color: c.tinta }]}
                  accessibilityLabel={t('projects.rename')}
                />
              ) : (
                <TouchableOpacity onPress={() => { setEditando(p.id); setBorrador(p.nombre); }} accessibilityRole="button" accessibilityLabel={t('projects.rename')} style={styles.nombre}>
                  <Text numberOfLines={1} style={[textoWeeAi('cuerpo', '600'), dir.texto, { color: c.tinta }]}>{p.nombre}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => alternarFavorito(p.id)} accessibilityRole="button" accessibilityLabel={t('weeai.favorite')} accessibilityState={{ selected: favoritos.includes(p.id) }} style={styles.icono}>
                <Ionicons name={favoritos.includes(p.id) ? 'star' : 'star-outline'} size={scale(20)} color={c.tinta} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => quitar(p.id)} accessibilityRole="button" accessibilityLabel={t('common.delete')} style={styles.icono}>
                <Ionicons name="trash-outline" size={scale(20)} color={c.tintaSecundaria} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
      <Text style={[textoWeeAi('nota'), dir.texto, { color: c.tintaTerciaria }]}>{t('weeai.localOnly')}</Text>

      <NuevoElemento visible={nuevo} tipo={tipo} onClose={() => setNuevo(false)} onGuardar={(d) => { crear(tipo, d); setNuevo(false); }} />
    </View>
  );
};

const styles = StyleSheet.create({
  seccion: { gap: SP.md },
  acciones: { flexDirection: 'row', gap: SP.sm },
  accion: { flex: 1, minHeight: 52, borderRadius: RADIO_WEEAI.tarjeta, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SP.sm, paddingHorizontal: SP.md },
  describir: { flexDirection: 'row', alignItems: 'center', gap: SP.sm, borderRadius: RADIO_WEEAI.tarjeta, paddingStart: SP.md, paddingEnd: SP.sm, minHeight: 52 },
  campo: { flex: 1, minWidth: 0, minHeight: 44 },
  ir: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  lista: { gap: SP.sm },
  fila: { flexDirection: 'row', alignItems: 'center', gap: SP.md, borderRadius: RADIO_WEEAI.tarjeta, padding: SP.sm, minHeight: 64 },
  miniatura: { width: 48, height: 48, borderRadius: RADIO_WEEAI.control, overflow: 'hidden' },
  nombre: { flex: 1, minWidth: 0, minHeight: 44, justifyContent: 'center' },
  icono: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});

export default SeccionDeElementosPropios;
