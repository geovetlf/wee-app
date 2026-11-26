import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, TextInput, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useT, useIdioma } from '../../../contexts/IdiomaContext';
import { useDireccion } from '../../../hooks/useDireccion';
import { PORTADA_WEEAI as P, textoPortada } from '../../../constants/estiloWeeAi';
import { etiquetaAccesible } from '../../../utils/ideaDeFilmmaker';
import { Tanda, TOPES_TANDAS } from '../../../utils/tandasDeFilmmaker';
import { VOCES_PREDETERMINADAS } from '../../../constants/filmmakerSonido';
import { VOZ_AUTO, herenciaDe, vozPorId } from '../../../utils/sonidoDeFilmmaker';
import { SelectorDeVoz } from '../sonido/SelectorDeVoz';
import CajaDePrompt from '../../creator/CajaDePrompt';
import { BotonBlanco, BotonContorno, estilosComunes as E, useTiempo } from './comunes';

interface Props {
  tanda: Tanda | null;
  posicion: number;
  total: number;
  puedePartir: boolean;
  puedeUnir: boolean;
  onClose: () => void;
  onGuardar: (id: string, c: { titulo: string; objetivo: number }) => void;
  onVoz: (id: string, voz: string | null) => void;
  onMover: (id: string, delta: -1 | 1) => void;
  onPartir: (id: string) => void;
  onUnir: (id: string) => void;
  onQuitar: (id: string) => void;
  /** «Pídele un cambio a Weë» sobre ESTE capítulo: `enviar` recibe lo escrito, `contenido` es la respuesta de Weë (la pone la pantalla) y `version` sube al aplicarse un cambio. */
  pedirCambio?: { enviar: (texto: string) => void; contenido: React.ReactNode; version: number };
}

/** Los pasos del objetivo: 30 s arriba o abajo (un capítulo de 3:00 son seis pasos). */
const PASO = 30;

/**
 * LAS OPCIONES DE UNA TANDA (hoja inferior desde «⋯»): nombre, duración objetivo, mover, partir por la mitad, unir con la siguiente y quitar. Cada acción
 * que no se puede hacer sale apagada con su motivo. Quitar pide un segundo toque (no hay deshacer). Nombre y objetivo se guardan al pulsar «Listo».
 */
export const HojaDeTanda: React.FC<Props> = ({ tanda, posicion, total, puedePartir, puedeUnir, onClose, onGuardar, onVoz, onMover, onPartir, onUnir, onQuitar, pedirCambio }) => {
  const t = useT();
  const { formato } = useIdioma();
  const dir = useDireccion();
  const insets = useSafeAreaInsets();
  const tiempo = useTiempo();
  const [titulo, setTitulo] = useState('');
  const [objetivo, setObjetivo] = useState(180);
  const [seguro, setSeguro] = useState(false);
  const [selector, setSelector] = useState(false);
  const [pide, setPide] = useState(false);
  const [cambio, setCambio] = useState('');
  useEffect(() => { if (tanda) { setTitulo(tanda.titulo); setObjetivo(tanda.objetivo); setSeguro(false); } }, [tanda?.id, pedirCambio?.version]);
  useEffect(() => { setPide(false); setCambio(''); }, [tanda?.id]);
  if (!tanda) return null;
  const accion = (f: () => void) => () => { f(); onClose(); };
  const campo = [E.campo, textoPortada(16, '400'), dir.texto, { color: P.tinta }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)];
  const nombrePorDefecto = t('filmmakerTandas.chapterN', { n: formato.numero(posicion) });
  const nombreDeVoz = !tanda.voz || tanda.voz === VOZ_AUTO ? t('filmmakerSonido.voiceAuto') : vozPorId(VOCES_PREDETERMINADAS, tanda.voz)?.nombre ?? t('filmmakerSonido.voiceAuto');

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={E.velo} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')} />
      <View style={styles.ancla} pointerEvents="box-none">
        <View style={[E.hoja, styles.hoja, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]} accessibilityViewIsModal>
          <View style={E.asa} />
          <ScrollView contentContainerStyle={{ gap: 10 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={[textoPortada(18, '600'), dir.texto, { color: P.tinta }]} accessibilityRole="header">{t('filmmakerTandas.options')}</Text>
            <Text style={[textoPortada(13, '500'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmakerTandas.chapterName')}</Text>
            <TextInput value={titulo} onChangeText={setTitulo} maxLength={TOPES_TANDAS.titulo} placeholder={nombrePorDefecto} placeholderTextColor={P.tintaSecundaria} selectionColor={P.luz} accessibilityLabel={t('filmmakerTandas.chapterName')} style={campo} />

            <Text style={[textoPortada(13, '500'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmakerTandas.targetLabel')}</Text>
            <View style={[styles.paso, dir.contenedor]}>
              <TouchableOpacity onPress={() => setObjetivo((o) => Math.max(10, o - PASO))} disabled={objetivo <= 10} accessibilityRole="button" accessibilityLabel={t('filmmakerTandas.targetLess')} accessibilityState={{ disabled: objetivo <= 10 }} style={[styles.boton, objetivo <= 10 && { opacity: 0.4 }]}><Ionicons name="remove" size={20} color={P.tinta} /></TouchableOpacity>
              <Text style={[textoPortada(18, '600'), { color: P.tinta, minWidth: 72, textAlign: 'center' }]} accessibilityLiveRegion="polite">{'≈'}{tiempo.solo(objetivo)}</Text>
              <TouchableOpacity onPress={() => setObjetivo((o) => Math.min(3600, o + PASO))} accessibilityRole="button" accessibilityLabel={t('filmmakerTandas.targetMore')} style={styles.boton}><Ionicons name="add" size={20} color={P.tinta} /></TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => setSelector(true)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={etiquetaAccesible(t('filmmakerSonido.layerVoice'), nombreDeVoz, t('filmmakerTandas.voiceChange'))} style={[styles.voz, dir.contenedor]}>
              <Ionicons name="mic-outline" size={18} color={P.tinta} />
              <View style={{ flex: 1 }}>
                <Text style={[textoPortada(14, '600'), dir.texto, { color: P.tinta }]} numberOfLines={1}>{t('filmmakerTandas.chapterVoice')}</Text>
                <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]} numberOfLines={2}>{nombreDeVoz}</Text>
              </View>
              <Text style={[textoPortada(13, '600'), { color: P.tinta }]}>{t('filmmakerTandas.voiceChange')}</Text>
            </TouchableOpacity>

            {/* «Pídele un cambio a Weë»: una fila plegada, la misma de la ficha del cuadro; abre la caja común de Weë Brain. */}
            {pedirCambio ? (
              <>
                <TouchableOpacity onPress={() => setPide((p) => !p)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t('filmmakerDirector.askChange')} accessibilityState={{ expanded: pide }} style={[styles.voz, dir.contenedor]}>
                  <Ionicons name="sparkles-outline" size={18} color={P.tinta} />
                  <Text style={[textoPortada(14, '600'), dir.texto, { color: P.tinta, flex: 1 }]}>{t('filmmakerDirector.askChange')}</Text>
                  <Ionicons name={pide ? 'chevron-up' : 'chevron-down'} size={18} color={P.tintaSecundaria} />
                </TouchableOpacity>
                {pide ? (
                  <View style={{ gap: 8 }}>
                    {pedirCambio.contenido}
                    <CajaDePrompt portada enviarDiscreto valor={cambio} onCambiar={setCambio} onEnviar={() => { const dicho = cambio.trim(); if (dicho) { pedirCambio.enviar(dicho); setCambio(''); } }} etiquetaEnviar={t('studio.sendLabel')} placeholder={t('filmmakerDirector.askChangePlaceholder')} />
                    <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmakerDirector.askChangeExample')}</Text>
                  </View>
                ) : null}
              </>
            ) : null}

            <View style={[E.fila, dir.contenedor, { marginTop: 4 }]}>
              <BotonContorno texto={t('filmmakerTandas.moveUp')} icono="arrow-up" apagado={posicion <= 1} onPress={accion(() => onMover(tanda.id, -1))} />
              <BotonContorno texto={t('filmmakerTandas.moveDown')} icono="arrow-down" apagado={posicion >= total} onPress={accion(() => onMover(tanda.id, 1))} />
              <BotonContorno texto={t('filmmakerTandas.splitHalf')} icono="git-branch-outline" apagado={!puedePartir} onPress={accion(() => onPartir(tanda.id))} />
              <BotonContorno texto={t('filmmakerTandas.mergeNext')} icono="git-merge-outline" apagado={!puedeUnir} onPress={accion(() => onUnir(tanda.id))} />
              <BotonContorno texto={seguro ? t('filmmakerTandas.removeSure') : t('filmmakerTandas.removeChapter')} icono="trash-outline" peligro onPress={() => { if (seguro) { onQuitar(tanda.id); onClose(); } else setSeguro(true); }} />
            </View>
            {!puedePartir || !puedeUnir ? <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]}>{!puedePartir ? t('filmmakerTandas.splitWhy') : t('filmmakerTandas.mergeWhy')}</Text> : null}
          </ScrollView>
          <BotonBlanco texto={t('filmmakerTandas.frameDone')} onPress={() => { onGuardar(tanda.id, { titulo, objetivo }); onClose(); }} testID="hoja-tanda-listo" />
        </View>
      </View>
      <SelectorDeVoz visible={selector} onClose={() => setSelector(false)} contexto="scene" valor={tanda.voz ?? null} herencia={herenciaDe('scene', { personaje: null })} nombre={tanda.titulo || nombrePorDefecto} onCambiar={(v) => { onVoz(tanda.id, v); setSelector(false); }} />
    </Modal>
  );
};

const styles = StyleSheet.create({
  ancla: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  hoja: { width: '100%', maxWidth: 560, maxHeight: '92%' },
  paso: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  voz: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: P.bordeCapsula, backgroundColor: P.superficie },
  boton: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: P.bordeCapsula, backgroundColor: P.superficie, alignItems: 'center', justifyContent: 'center' },
});
