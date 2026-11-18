import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useT, useIdioma } from '../../../contexts/IdiomaContext';
import { useDireccion } from '../../../hooks/useDireccion';
import { PORTADA_WEEAI as P, textoPortada } from '../../../constants/estiloWeeAi';
import {
  CLAVE_DE_CAPA, CLAVE_DE_IDIOMA_DE_VOZ, CLAVE_DE_ORIGEN, CLAVE_DE_SUBTITULO, CLAVE_DE_TONO_DE_VOZ, EFECTOS_DE_SONIDO_ABIERTOS, MUESTRA_DE_VOZ_ABIERTA,
  MUSICA_DE_ESCENA_ABIERTA, PRECIO_DE_VOZ_EN_CREDITS, SUBIR_VOZ_ABIERTO, VOCES_PREDETERMINADAS,
} from '../../../constants/filmmakerSonido';
import {
  ContextoDeVoz, FiltroDeVoces, IDIOMAS_DE_VOZ, IdiomaDeVoz, OrigenDeVoz, SIN_FILTRO, TONOS_DE_VOZ, TonoDeVoz, VOZ_AUTO, VozDelCatalogo, filtrarVoces, vozPorId,
} from '../../../utils/sonidoDeFilmmaker';
import { etiquetaAccesible } from '../../../utils/ideaDeFilmmaker';

export interface PropsSelectorDeVoz {
  visible: boolean;
  onClose: () => void;
  /** Dónde se elige: el personaje (voz por defecto), la escena o el cuadro (heredan). */
  contexto: ContextoDeVoz;
  /**
   * La voz PROPIA de este nivel: un id del catálogo, `'auto'` (Weë elige) o `null` (hereda, solo en escena y cuadro).
   * En un personaje, `null` se lee como `'auto'`.
   */
  valor: string | null;
  /** Lo que se hereda hoy (escena y cuadro): la voz resuelta de los niveles de arriba y quién la fija. Ver `herenciaDe`. */
  herencia?: { id: string; origen: OrigenDeVoz } | null;
  /** Nombre del personaje, escena o cuadro: solo para rotular la hoja. */
  nombre?: string;
  /** Se llama al elegir: id del catálogo, `'auto'` o `null` (volver a heredar). */
  onCambiar: (voz: string | null) => void;
  /** Catálogo; por defecto, el de ejemplo. Cuando el servidor entregue el real, se pasa aquí con `ejemplo: false`. */
  voces?: readonly VozDelCatalogo[];
}

/**
 * «PERSONALIZAR VOZ Y SONIDOS» COMO HOJA (Filmmaker, 2026-11-17): UN solo selector reutilizable que enganchan la ficha del personaje (Universo) y la del
 * cuadro (Storyboard). Arriba lo que Weë decide por ti («Weë lo hace por mí» o «Usar la voz de…»); debajo las voces predeterminadas con dos filtros
 * (idioma, tono); luego «Subir archivo con un tono de voz», música y efectos como capas separadas —las tres CERRADAS con su motivo— y el precio, que
 * dice «por confirmar» mientras no esté medido. No genera audio ni clona voces: elegir una voz solo guarda su identificador.
 */
export const SelectorDeVoz: React.FC<PropsSelectorDeVoz> = ({ visible, onClose, contexto, valor, herencia, nombre, onCambiar, voces = VOCES_PREDETERMINADAS }) => {
  const t = useT();
  const { formato } = useIdioma();
  const dir = useDireccion();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [filtro, setFiltro] = useState<FiltroDeVoces>(SIN_FILTRO);
  const [aviso, setAviso] = useState<string | null>(null);

  const visibles = useMemo(() => filtrarVoces(voces, filtro), [voces, filtro]);
  const hereda = contexto !== 'character';
  const propia = valor ?? (hereda ? null : VOZ_AUTO);
  const hayEjemplos = voces.some((v) => v.ejemplo);
  const nombreDe = (id: string): string => (id === VOZ_AUTO ? t('filmmakerSonido.voiceAuto') : vozPorId(voces, id)?.nombre ?? t('filmmakerSonido.voiceAuto'));
  const ancha = width >= 700;

  const elegir = (v: string | null) => { setAviso(null); onCambiar(v); };

  const chip = (clave: string, activo: boolean, onPress: () => void, key: string) => (
    <TouchableOpacity key={key} onPress={onPress} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t(clave)} accessibilityState={{ selected: activo }} style={[styles.chip, activo && styles.chipSel]}>
      <Text style={[textoPortada(14, activo ? '600' : '500'), { color: P.tinta }]} numberOfLines={1}>{t(clave)}</Text>
    </TouchableOpacity>
  );

  const filaEleccion = (id: string | null, titulo: string, nota: string | null, key: string) => {
    const sel = propia === id;
    return (
      <TouchableOpacity key={key} onPress={() => elegir(id)} activeOpacity={0.85} accessibilityRole="radio" accessibilityState={{ selected: sel }} accessibilityLabel={etiquetaAccesible(titulo, nota, sel ? t('filmmakerSonido.selected') : null)} style={[styles.voz, dir.contenedor, sel && styles.vozSel]}>
        <View style={{ flex: 1 }}>
          <Text style={[textoPortada(15, '600'), dir.texto, { color: P.tinta }]} numberOfLines={2}>{titulo}</Text>
          {nota ? <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]} numberOfLines={2}>{nota}</Text> : null}
        </View>
        {sel ? <Ionicons name="checkmark-circle" size={20} color={P.tinta} /> : null}
      </TouchableOpacity>
    );
  };

  const filaCerrada = (clave: string, claveMotivo: string, icono: keyof typeof Ionicons.glyphMap, key: string) => (
    <TouchableOpacity key={key} onPress={() => setAviso(claveMotivo)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={etiquetaAccesible(t(clave), t(claveMotivo))} accessibilityState={{ disabled: true }} style={[styles.cerrada, dir.contenedor]}>
      <Ionicons name={icono} size={18} color={P.tintaDeshabilitada} />
      <View style={{ flex: 1 }}>
        <Text style={[textoPortada(14, '600'), dir.texto, { color: P.tintaSecundaria }]} numberOfLines={2}>{t(clave)}</Text>
        <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]} numberOfLines={4}>{t(claveMotivo)}</Text>
      </View>
      <Ionicons name="lock-closed-outline" size={14} color={P.tintaDeshabilitada} />
    </TouchableOpacity>
  );

  const filtros = (claveTitulo: string, todos: boolean, onTodos: () => void, items: { clave: string; activo: boolean; onPress: () => void; id: string }[]) => (
    <View style={{ gap: 6 }}>
      <Text style={[textoPortada(12, '500'), dir.texto, { color: P.tintaSecundaria }]}>{t(claveTitulo)}</Text>
      <View style={[styles.fila, dir.contenedor]}>
        {chip('filmmakerSonido.filterAll', todos, onTodos, 'todos')}
        {items.map((i) => chip(i.clave, i.activo, i.onPress, i.id))}
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.velo} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')} />
      <View style={[styles.hoja, ancha && styles.hojaAncha, { paddingBottom: Math.max(insets.bottom, 12) + 8, maxHeight: '92%' }]} accessibilityViewIsModal>
        <View style={styles.asa} />
        <ScrollView contentContainerStyle={{ gap: 12 }} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 2 }}>
            <Text style={[textoPortada(18, '600'), dir.texto, { color: P.tinta }]} accessibilityRole="header">{t('filmmakerSonido.title')}</Text>
            {nombre ? <Text style={[textoPortada(13, '500'), dir.texto, { color: P.tintaSecundaria }]} numberOfLines={1}>{t('filmmakerSonido.forName', { nombre })}</Text> : null}
            <Text style={[textoPortada(13, '400'), dir.texto, { color: P.tintaSecundaria }]}>{t(CLAVE_DE_SUBTITULO[contexto])}</Text>
          </View>

          {/* CAPA 1 — VOZ */}
          <Text style={[textoPortada(15, '600'), dir.texto, { color: P.tinta }]} accessibilityRole="header">{t(CLAVE_DE_CAPA.voice)}</Text>
          {hereda && herencia ? filaEleccion(null, t('filmmakerSonido.voiceInherit', { origen: t(CLAVE_DE_ORIGEN[herencia.origen]) }), t('filmmakerSonido.voiceInheritNow', { voz: nombreDe(herencia.id) }), 'hereda') : null}
          {filaEleccion(VOZ_AUTO, t('filmmakerSonido.voiceAuto'), t('filmmakerSonido.voiceAutoNote'), 'auto')}

          {filtros('filmmakerSonido.filterLanguage', filtro.idioma === null, () => setFiltro({ ...filtro, idioma: null }),
            IDIOMAS_DE_VOZ.map((i: IdiomaDeVoz) => ({ id: i, clave: CLAVE_DE_IDIOMA_DE_VOZ[i], activo: filtro.idioma === i, onPress: () => setFiltro({ ...filtro, idioma: i }) })))}
          {filtros('filmmakerSonido.filterTone', filtro.tono === null, () => setFiltro({ ...filtro, tono: null }),
            TONOS_DE_VOZ.map((o: TonoDeVoz) => ({ id: o, clave: CLAVE_DE_TONO_DE_VOZ[o], activo: filtro.tono === o, onPress: () => setFiltro({ ...filtro, tono: o }) })))}

          <Text style={[textoPortada(12, '500'), dir.texto, { color: P.tintaSecundaria }]} accessibilityLiveRegion="polite">{t('filmmakerSonido.voiceCount', { contador: visibles.length })}</Text>
          {visibles.length === 0 ? (
            <View style={styles.vacio}>
              <Text style={[textoPortada(14, '500'), { color: P.tintaSecundaria, textAlign: 'center' }]}>{t('filmmakerSonido.noMatch')}</Text>
              <TouchableOpacity onPress={() => setFiltro(SIN_FILTRO)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t('filmmakerSonido.clearFilters')} style={styles.chip}>
                <Text style={[textoPortada(14, '600'), { color: P.tinta }]}>{t('filmmakerSonido.clearFilters')}</Text>
              </TouchableOpacity>
            </View>
          ) : visibles.map((v) => {
            const sel = propia === v.id;
            const detalle = [t(CLAVE_DE_TONO_DE_VOZ[v.tono]), t(CLAVE_DE_IDIOMA_DE_VOZ[v.idioma]), v.ejemplo ? t('filmmakerSonido.exampleTag') : null].filter(Boolean).join(' · ');
            return (
              <View key={v.id} style={[styles.voz, dir.contenedor, sel && styles.vozSel]}>
                <TouchableOpacity onPress={() => elegir(v.id)} activeOpacity={0.85} accessibilityRole="radio" accessibilityState={{ selected: sel }} accessibilityLabel={etiquetaAccesible(v.nombre, detalle, sel ? t('filmmakerSonido.selected') : null)} style={[styles.vozCuerpo, dir.contenedor]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[textoPortada(15, '600'), dir.texto, { color: P.tinta }]} numberOfLines={1}>{v.nombre}</Text>
                    <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]} numberOfLines={1}>{detalle}</Text>
                  </View>
                  {sel ? <Ionicons name="checkmark-circle" size={20} color={P.tinta} /> : null}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setAviso('filmmakerSonido.sampleClosed')} disabled={false} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={etiquetaAccesible(t('filmmakerSonido.sampleListen', { voz: v.nombre }), MUESTRA_DE_VOZ_ABIERTA ? null : t('filmmakerSonido.sampleClosed'))} accessibilityState={{ disabled: !MUESTRA_DE_VOZ_ABIERTA }} style={styles.escuchar}>
                  <Ionicons name={MUESTRA_DE_VOZ_ABIERTA ? 'play' : 'lock-closed-outline'} size={16} color={MUESTRA_DE_VOZ_ABIERTA ? P.tinta : P.tintaDeshabilitada} />
                </TouchableOpacity>
              </View>
            );
          })}
          {hayEjemplos ? <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmakerSonido.exampleNote')}</Text> : null}
          {aviso ? <Text style={[textoPortada(12, '500'), dir.texto, { color: P.tinta }]} accessibilityLiveRegion="polite">{t(aviso)}</Text> : null}

          {!SUBIR_VOZ_ABIERTO ? filaCerrada('filmmakerSonido.uploadTitle', 'filmmakerSonido.uploadClosed', 'cloud-upload-outline', 'subir') : null}

          {/* CAPAS 2 y 3 — MÚSICA y EFECTOS: separadas de la voz, en el mismo sitio */}
          {!MUSICA_DE_ESCENA_ABIERTA ? filaCerrada(CLAVE_DE_CAPA.music, 'filmmakerSonido.musicClosed', 'musical-notes-outline', 'musica') : null}
          {!EFECTOS_DE_SONIDO_ABIERTOS ? filaCerrada(CLAVE_DE_CAPA.effects, 'filmmakerSonido.effectsClosed', 'pulse-outline', 'efectos') : null}

          <View style={[styles.precio, dir.contenedor]}>
            <View style={{ flex: 1 }}>
              <Text style={[textoPortada(13, '600'), dir.texto, { color: P.tinta }]}>{t('filmmakerSonido.priceTitle')}</Text>
              <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmakerSonido.priceNote')}</Text>
            </View>
            <Text style={[textoPortada(14, '600'), { color: P.tintaSecundaria }]}>{PRECIO_DE_VOZ_EN_CREDITS === null ? t('filmmakerSonido.priceUnknown') : `${formato.numero(PRECIO_DE_VOZ_EN_CREDITS)} Credits`}</Text>
          </View>

          <TouchableOpacity onPress={onClose} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={t('filmmakerSonido.done')} style={styles.listo}>
            <Text style={[textoPortada(15, '600'), { color: P.sobreAccion }]}>{t('filmmakerSonido.done')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  velo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  hoja: { backgroundColor: P.superficie, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderColor: P.bordeLuz, borderWidth: 1, borderBottomWidth: 0, paddingHorizontal: 16, paddingTop: 8 },
  hojaAncha: { alignSelf: 'center', width: '100%', maxWidth: 560 },
  asa: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: P.bordeLuz, marginBottom: 10 },
  fila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  chip: { minHeight: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1, borderColor: P.bordeCapsula, backgroundColor: P.fondo, alignItems: 'center', justifyContent: 'center' },
  chipSel: { borderColor: '#FFFFFF', borderWidth: 2, backgroundColor: P.superficieAlta },
  voz: { flexDirection: 'row', alignItems: 'center', minHeight: 56, borderRadius: 14, borderWidth: 1, borderColor: P.bordeCapsula, backgroundColor: P.fondo },
  vozSel: { borderColor: '#FFFFFF', borderWidth: 2, backgroundColor: P.superficieAlta },
  vozCuerpo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingHorizontal: 12, paddingVertical: 8 },
  escuchar: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  cerrada: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: P.bordeCapsula },
  vacio: { alignItems: 'center', gap: 10, paddingVertical: 12 },
  precio: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderColor: P.borde },
  listo: { minHeight: 48, borderRadius: 24, backgroundColor: P.accion, alignItems: 'center', justifyContent: 'center' },
});
