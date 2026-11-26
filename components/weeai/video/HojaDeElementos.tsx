import React, { useEffect, useMemo, useState } from 'react';
import EspacioDeEscritura from '../../EspacioDeEscritura';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Platform, useWindowDimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RellenoDeDegradado } from '../../GradienteDeMarca';
import { CeldaDeAccion, CeldaDeElemento, FilaDePildoras } from './PiezasDeElementos';
import NuevoElemento from './NuevoElemento';
import { useT } from '../../../contexts/IdiomaContext';
import { useDireccion } from '../../../hooks/useDireccion';
import { useEstiloWeeAi } from '../../../hooks/useEstiloWeeAi';
import { useElementos } from '../../../hooks/useElementos';
import { ARTE_WEEAI } from '../../../constants/marca';
import {
  ElementoElegido, ESCENARIOS_DE_WEE, EntradaDeCatalogo, FILTROS_DE_ESCENARIO, LIMITES_DE_ELEMENTOS, OCASIONES_DE_ROPA, PERSONAJES_DE_WEE, ROPA_DE_WEE, TipoDeElemento, VOCES_DE_WEE,
} from '../../../constants/catalogoElementos';
import { ESPACIO_WEEAI as SP, RADIO_WEEAI, NUMEROS_TABULARES, textoWeeAi } from '../../../constants/estiloWeeAi';
import { scale } from '../../../utils/scale';

interface Props {
  visible: boolean;
  /** Lo que ya estaba elegido: la hoja arranca con ello y devuelve la selección completa con «Listo». */
  elegidos: ElementoElegido[];
  onClose: () => void;
  onListo: (elegidos: ElementoElegido[]) => void;
  /** Para rellenar una ranura de plantilla: abre en Personajes · Míos y admite un solo elemento. */
  paraRanura?: boolean;
}

type Pestana = 'galeria' | 'personajes' | 'escenarios' | 'ropa' | 'voces';
const isWeb = Platform.OS === 'web';
const TIPO_DE_PESTANA: Record<Exclude<Pestana, 'galeria' | 'voces'>, Exclude<TipoDeElemento, 'galeria' | 'voz'>> = { personajes: 'personaje', escenarios: 'escenario', ropa: 'ropa' };

/**
 * LA HOJA DE ELEMENTOS: Galería · Personajes · Escenarios · Ropa · Voces. Selección múltiple con círculos y una barra de límites con
 * «Listo» (el único botón principal de la hoja). Los límites son PROVISIONALES (`LIMITES_DE_ELEMENTOS`). Solo interfaz: lo propio vive en
 * el almacén local (sin sincronizar), el catálogo de Weë es de muestra (todo «Ejemplo») y las voces reales no existen todavía: «Nueva» y el
 * ▶ dicen «Próximamente» y no simulan nada. El permiso de galería se pide solo al abrir esa pestaña.
 */
const HojaDeElementos: React.FC<Props> = ({ visible, elegidos, onClose, onListo, paraRanura }) => {
  const c = useEstiloWeeAi();
  const t = useT();
  const dir = useDireccion();
  const arte = ARTE_WEEAI.claro;
  const { width } = useWindowDimensions();
  const { propios, favoritos, crear, alternarFavorito } = useElementos();
  const [pestana, setPestana] = useState<Pestana>('personajes');
  const [filtro, setFiltro] = useState('wee');
  const [seleccion, setSeleccion] = useState<ElementoElegido[]>(elegidos);
  const [fotos, setFotos] = useState<ElementoElegido[]>([]);
  const [nuevo, setNuevo] = useState<TipoDeElemento | null>(null);
  const [permiso, setPermiso] = useState<'ok' | 'pidiendo' | 'no'>(isWeb ? 'ok' : 'pidiendo');
  const [avisoVoz, setAvisoVoz] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setSeleccion(elegidos);
      if (paraRanura) {
        setPestana('personajes');
        setFiltro('mios');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  /* El permiso de galería se pide solo al abrir la pestaña Galería (nunca antes). */
  useEffect(() => {
    if (!visible || pestana !== 'galeria' || isWeb || permiso === 'ok') return;
    /* Bandera de vigencia: una respuesta que llega con la hoja ya cerrada o la pestaña cambiada no escribe. */
    let vivo = true;
    ImagePicker.requestMediaLibraryPermissionsAsync().then((p) => { if (vivo) setPermiso(p.granted ? 'ok' : 'no'); }).catch(() => { if (vivo) setPermiso('no'); });
    return () => { vivo = false; };
  }, [visible, pestana, permiso]);

  const ancho = Math.min(width, 560);
  const celda = Math.floor((ancho - SP.md * 2 - SP.sm * 2) / 3);

  const esta = (id: string) => seleccion.some((s) => s.id === id);
  const cuantos = (tipo: TipoDeElemento) => seleccion.filter((s) => s.tipo === tipo).length;
  const alternar = (el: ElementoElegido) => {
    setSeleccion((actual) => {
      if (actual.some((s) => s.id === el.id)) return actual.filter((s) => s.id !== el.id);
      if (paraRanura) return [el];
      if (actual.length >= LIMITES_DE_ELEMENTOS.total || actual.filter((s) => s.tipo === el.tipo).length >= LIMITES_DE_ELEMENTOS[el.tipo]) return actual;
      return [...actual, el];
    });
  };

  const abrirGaleria = async (camara: boolean) => {
    try {
      if (camara) {
        const p = await ImagePicker.requestCameraPermissionsAsync();
        if (!p.granted) return;
        const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 });
        if (!r.canceled && r.assets[0]?.uri) agregarFotos([r.assets[0].uri]);
        return;
      }
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.9, allowsMultipleSelection: true, selectionLimit: LIMITES_DE_ELEMENTOS.galeria });
      if (!r.canceled) agregarFotos(r.assets.map((a) => a.uri));
    } catch (e) {
      console.warn('No se pudo abrir la galería:', e);
    }
  };
  const agregarFotos = (uris: string[]) => {
    const nuevas: ElementoElegido[] = uris.map((u, i) => ({ id: `galeria-${Date.now().toString(36)}-${i}`, tipo: 'galeria', clave: null, nombre: t('aiAvatar.gallery'), uri: u }));
    setFotos((f) => [...nuevas, ...f]);
    nuevas.forEach((n) => alternar(n));
  };

  const pestanas = [
    { id: 'galeria', texto: t('aiAvatar.gallery') },
    { id: 'personajes', texto: t('filmmaker.characters') },
    { id: 'escenarios', texto: t('weeai.tabScenes') },
    { id: 'ropa', texto: t('fashion.galClothes') },
    { id: 'voces', texto: t('weeai.tabVoices') },
  ];
  const pildorasBase = [
    { id: 'mios', texto: t('weeai.pMine') },
    { id: 'wee', texto: 'Weë' },
    { id: 'fav', texto: t('weeai.pFav') },
    { id: 'nuevo', texto: t('weeai.pNew') },
  ];
  const pildorasDe = (p: Pestana) =>
    p === 'escenarios' ? [...pildorasBase, ...FILTROS_DE_ESCENARIO.map((f) => ({ id: f.id, texto: t(f.clave) }))]
    : p === 'ropa' ? [...pildorasBase, ...OCASIONES_DE_ROPA.map((o) => ({ id: o.id, texto: t(o.clave) }))]
    : p === 'voces' ? [{ id: 'todo', texto: t('creaciones.filterAll') }, { id: 'mios', texto: t('weeai.pMine') }, { id: 'fav', texto: t('weeai.pFav') }, { id: 'f', texto: t('music.voice_female') }, { id: 'm', texto: t('music.voice_male') }]
    : pildorasBase;

  const cambiarPestana = (p: string) => {
    setPestana(p as Pestana);
    setFiltro(p === 'voces' ? 'todo' : 'wee');
    setAvisoVoz(null);
  };

  const catalogoDe = (p: Exclude<Pestana, 'galeria' | 'voces'>): EntradaDeCatalogo[] => (p === 'personajes' ? PERSONAJES_DE_WEE : p === 'escenarios' ? ESCENARIOS_DE_WEE : ROPA_DE_WEE);

  const elementosDeCuadricula = useMemo(() => {
    if (pestana === 'galeria' || pestana === 'voces') return [];
    const tipo = TIPO_DE_PESTANA[pestana];
    const base = catalogoDe(pestana);
    const mios = propios.filter((p) => p.tipo === tipo);
    const comoCatalogo = (e: EntradaDeCatalogo): ElementoElegido & { favorito: boolean } => ({ id: e.id, tipo, clave: e.clave || null, nombre: e.nombrePropio ?? '', gradiente: e.gradiente, favorito: favoritos.includes(e.id) });
    const comoMio = (p: (typeof mios)[number]): ElementoElegido & { favorito: boolean } => ({ id: p.id, tipo, clave: null, nombre: p.nombre, uri: p.uris[0], favorito: favoritos.includes(p.id) });
    if (filtro === 'mios') return mios.map(comoMio);
    if (filtro === 'fav') return [...mios.map(comoMio), ...base.map(comoCatalogo)].filter((e) => e.favorito);
    if (filtro === 'nuevo') return base.filter((e) => e.novedad).map(comoCatalogo);
    if (filtro === 'wee') return base.map(comoCatalogo);
    return base.filter((e) => e.categoria === filtro).map(comoCatalogo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pestana, filtro, propios, favoritos]);

  const nombreDe = (e: ElementoElegido) => (e.clave ? t(e.clave) : e.nombre);

  const voces = VOCES_DE_WEE.filter((v) => (filtro === 'f' ? v.genero === 'f' : filtro === 'm' ? v.genero === 'm' : filtro === 'fav' ? favoritos.includes(v.id) : filtro === 'mios' ? false : true));

  const listo = () => onListo(seleccion);
  const tipoNuevo = (pestana === 'personajes' ? 'personaje' : pestana === 'escenarios' ? 'escenario' : 'ropa') as 'personaje' | 'escenario' | 'ropa';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.pantalla, { backgroundColor: c.fondo }]} edges={['top', 'bottom']}>
        <View style={[styles.cabecera, dir.contenedor]}>
          <View style={styles.pestanas}>
            <FilaDePildoras opciones={pestanas} puesta={pestana} onElegir={cambiarPestana} tamano="pestana" />
          </View>
          <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')} style={styles.cerrar}>
            <Ionicons name="close" size={scale(24)} color={c.tinta} />
          </TouchableOpacity>
        </View>

        {pestana !== 'galeria' ? (
          <View style={styles.pildoras}>
            <FilaDePildoras opciones={pildorasDe(pestana)} puesta={filtro} onElegir={setFiltro} />
          </View>
        ) : null}

        <EspacioDeEscritura style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.cuerpo} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {pestana === 'galeria' ? (
            <View>
              <Text style={[textoWeeAi('nota'), dir.texto, { color: c.tintaSecundaria, marginBottom: SP.md }]}>{t('weeai.galleryHint')}</Text>
              <View style={[styles.cuadricula, dir.contenedor]}>
                {permiso === 'ok' ? <CeldaDeAccion ancho={celda} icono="images-outline" rotulo={t('aiAvatar.gallery')} onPress={() => abrirGaleria(false)} /> : null}
                <CeldaDeAccion ancho={celda} icono="camera-outline" rotulo={t('composer.camera')} onPress={() => abrirGaleria(true)} />
                {fotos.map((f) => (
                  <CeldaDeElemento key={f.id} ancho={celda} rotulo={f.nombre} uri={f.uri} elegido={esta(f.id)} onPress={() => alternar(f)} />
                ))}
              </View>
            </View>
          ) : null}

          {pestana !== 'galeria' && pestana !== 'voces' ? (
            <View>
              {filtro !== 'mios' && filtro !== 'fav' ? <Text style={[textoWeeAi('nota'), dir.texto, { color: c.tintaTerciaria, marginBottom: SP.sm }]}>{t('weeai.example')}</Text> : null}
              <View style={[styles.cuadricula, dir.contenedor]}>
                {filtro === 'mios' ? <CeldaDeAccion ancho={celda} icono="add" rotulo={t('common.new')} onPress={() => setNuevo(tipoNuevo)} /> : null}
                {elementosDeCuadricula.map((e) => (
                  <CeldaDeElemento
                    key={e.id}
                    ancho={celda}
                    rotulo={nombreDe(e)}
                    uri={e.uri}
                    gradiente={e.gradiente}
                    elegido={esta(e.id)}
                    onPress={() => alternar({ id: e.id, tipo: e.tipo, clave: e.clave, nombre: e.nombre, uri: e.uri, gradiente: e.gradiente })}
                    favorito={(e as any).favorito}
                    onFavorito={() => alternarFavorito(e.id)}
                    etiquetaFavorito={t('weeai.favorite')}
                  />
                ))}
              </View>
              {filtro === 'mios' && elementosDeCuadricula.length === 0 ? <Text style={[textoWeeAi('cuerpo'), styles.vacio, dir.texto, { color: c.tintaSecundaria }]}>{t('weeai.emptyMine')}</Text> : null}
              {filtro === 'mios' ? <Text style={[textoWeeAi('nota'), dir.texto, { color: c.tintaTerciaria, marginTop: SP.md }]}>{t('weeai.localOnly')}</Text> : null}
            </View>
          ) : null}

          {pestana === 'voces' ? (
            <View>
              <TouchableOpacity onPress={() => setAvisoVoz('nueva')} accessibilityRole="button" style={[styles.voz, dir.contenedor]}>
                <View style={[styles.vozIcono, { backgroundColor: c.superficie }]}><Ionicons name="add" size={scale(22)} color={c.tinta} /></View>
                <Text numberOfLines={1} style={[textoWeeAi('enfasis', '500'), styles.vozNombre, dir.texto, { color: c.tinta }]}>{t('weeai.bNewVoice')}</Text>
                {avisoVoz === 'nueva' ? <Text numberOfLines={1} style={[textoWeeAi('nota'), { color: c.tintaSecundaria }]}>{t('weeai.modelSoon')}</Text> : null}
              </TouchableOpacity>
              {voces.map((v) => {
                const el: ElementoElegido = { id: v.id, tipo: 'voz', clave: null, nombre: v.nombre, gradiente: v.gradiente };
                const on = esta(v.id);
                return (
                  <View key={v.id} style={[styles.voz, dir.contenedor]}>
                    <TouchableOpacity onPress={() => setAvisoVoz(v.id)} accessibilityRole="button" accessibilityLabel={t('weeai.listen')} style={styles.vozIconoToque}>
                      <LinearGradient colors={v.gradiente} style={styles.vozIcono}>
                        <Ionicons name="play" size={scale(16)} color="#FFFFFF" />
                      </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => alternar(el)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.vozFila, dir.contenedor]}>
                      <Text numberOfLines={1} style={[textoWeeAi('enfasis', '500'), styles.vozNombre, dir.texto, { color: c.tinta }]}>{v.nombre}</Text>
                      {avisoVoz === v.id ? <Text numberOfLines={1} style={[textoWeeAi('nota'), { color: c.tintaSecundaria }]}>{t('weeai.modelSoon')}</Text> : null}
                      <View style={[styles.radio, { backgroundColor: on ? c.seleccion : c.superficie }]}>{on ? <Ionicons name="checkmark" size={scale(14)} color={c.sobreSeleccion} /> : null}</View>
                    </TouchableOpacity>
                  </View>
                );
              })}
              <Text style={[textoWeeAi('nota'), dir.texto, { color: c.tintaTerciaria, marginTop: SP.md }]}>{t('weeai.example')}</Text>
            </View>
          ) : null}
        </ScrollView>
        </EspacioDeEscritura>

        {/* La barra de límites: el límite (provisional) y «Listo» con la cuenta; el único botón principal de la hoja. */}
        <View style={[styles.barra, dir.contenedor, { backgroundColor: c.superficie }]}>
          <Text numberOfLines={1} style={[textoWeeAi('nota'), styles.limite, dir.texto, NUMEROS_TABULARES, { color: c.tintaSecundaria }]}>{t('weeai.limitLabel', { cantidad: LIMITES_DE_ELEMENTOS.total })}</Text>
          <TouchableOpacity onPress={listo} accessibilityRole="button" accessibilityLabel={t('common.done')} style={[styles.listo, dir.contenedor]}>
            <RellenoDeDegradado colores={arte.accion} radio={RADIO_WEEAI.pastilla} espejo={dir.esRTL} />
            <Text numberOfLines={1} style={[textoWeeAi('enfasis', '600'), { color: '#0A0A0A' }]}>{t('common.done')}</Text>
            <View style={styles.contador}><Text style={[textoWeeAi('nota', '600'), NUMEROS_TABULARES, { color: '#FFFFFF' }]}>{seleccion.length}</Text></View>
          </TouchableOpacity>
        </View>

        <NuevoElemento
          visible={nuevo !== null}
          tipo={tipoNuevo}
          onClose={() => setNuevo(null)}
          onGuardar={(d) => {
            const creado = crear(tipoNuevo, d);
            setNuevo(null);
            setFiltro('mios');
            alternar({ id: creado.id, tipo: tipoNuevo, clave: null, nombre: creado.nombre, uri: creado.uris[0] });
          }}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  cabecera: { flexDirection: 'row', alignItems: 'center', paddingStart: SP.md, paddingEnd: SP.xs, minHeight: 56 },
  pestanas: { flex: 1, minWidth: 0 },
  cerrar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pildoras: { paddingHorizontal: SP.md, paddingBottom: SP.sm },
  cuerpo: { paddingHorizontal: SP.md, paddingBottom: SP.lg },
  cuadricula: { flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm },
  vacio: { marginTop: SP.md },
  voz: { flexDirection: 'row', alignItems: 'center', gap: SP.md, minHeight: 60 },
  vozFila: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: SP.sm, minHeight: 60 },
  vozIconoToque: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  vozIcono: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  vozNombre: { flex: 1, minWidth: 0 },
  radio: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  barra: { flexDirection: 'row', alignItems: 'center', gap: SP.md, marginHorizontal: SP.md, marginBottom: SP.sm, paddingVertical: SP.sm, paddingStart: SP.md, paddingEnd: SP.sm, borderRadius: RADIO_WEEAI.hoja },
  limite: { flex: 1, minWidth: 0 },
  listo: { flexDirection: 'row', alignItems: 'center', gap: SP.sm, minHeight: 48, paddingHorizontal: SP.lg, borderRadius: RADIO_WEEAI.pastilla, overflow: 'hidden' },
  contador: { minWidth: 24, height: 24, borderRadius: 12, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
});

export default HojaDeElementos;
