import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, TextInput, ScrollView, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useT, useIdioma } from '../../../contexts/IdiomaContext';
import { useDireccion } from '../../../hooks/useDireccion';
import { PORTADA_WEEAI as P, textoPortada } from '../../../constants/estiloWeeAi';
import { claveDelValor, SeleccionCreativa } from '../../../constants/camaraCinematica';
import { ACCIONES_D1, AccionD1, D1_ABIERTO, EFECTOS_CERRADOS, FAMILIAS_DEL_CUADRO, INTENSIDADES, PLANOS_DEL_CUADRO } from '../../../constants/filmmakerCamara';
import { EFECTOS_DE_SONIDO_ABIERTOS, MUSICA_DE_ESCENA_ABIERTA, VOCES_PREDETERMINADAS } from '../../../constants/filmmakerSonido';
import { VOZ_AUTO, herenciaDe, resolverVoz, vozPorId } from '../../../utils/sonidoDeFilmmaker';
import { SelectorDeVoz } from '../sonido/SelectorDeVoz';
import { CuadroDeStoryboard, NARRADOR, SIN_HABLANTE, TOPES_TANDAS, TOPE_DE_CUADRO, conCreativo } from '../../../utils/tandasDeFilmmaker';
import { etiquetaAccesible } from '../../../utils/ideaDeFilmmaker';
import { BotonBlanco, BotonContorno, FilaCerrada, estilosComunes as E, useTiempo } from '../tandas/comunes';

/** Un personaje del universo, tal como lo necesita un cuadro: su id, su nombre y su voz por defecto (id del catálogo o 'auto'), que el cuadro hereda. */
export interface PersonajeDeCuadro { id: string; nombre: string; voz?: string | null }

export interface Props {
  cuadro: CuadroDeStoryboard | null;
  numero: number;
  inicio: number;
  fin: number;
  esPrimero: boolean;
  esUltimo: boolean;
  /** Se puede abrir un capítulo nuevo desde este cuadro (no es el primero y hay cupo de tandas). */
  puedePartir: boolean;
  personajes: readonly PersonajeDeCuadro[];
  /** Voz propia de la tanda del cuadro (la «escena» de la herencia). */
  vozDeTanda?: string | null;
  onClose: () => void;
  onGuardar: (id: string, c: { texto: string; hablante: string; voz: string | null; duracion: number; creativo: SeleccionCreativa }) => void;
  onMover: (id: string, delta: -1 | 1) => void;
  onDuplicar: (id: string) => void;
  onQuitar: (id: string) => void;
  onPartirAqui: (id: string) => void;
  /** Receptor de D1 (referencias, primer/último fotograma, extender, editar). Solo se usa si `D1_ABIERTO`. */
  onAccionD1?: (accion: AccionD1, cuadroId: string) => void;
}

/**
 * LA FICHA DEL CUADRO (hoja inferior; se abre al tocar un cuadro): texto, quién habla y la voz que hereda, encuadre, la BIBLIOTECA VISUAL de cámara
 * (movimiento · toma · ángulo · óptica · luz, con icono), intensidad y duración. Lo que el contrato no tiene —cámara lenta como efecto, zoom de impacto,
 * plano inclinado— y lo que espera a D1 salen CERRADOS con su motivo. Los cambios se guardan al pulsar «Listo».
 */
export const FichaDelCuadro: React.FC<Props> = ({ cuadro, numero, inicio, fin, esPrimero, esUltimo, puedePartir, personajes, onClose, onGuardar, onMover, onDuplicar, onQuitar, onPartirAqui, onAccionD1, vozDeTanda }) => {
  const t = useT();
  const { formato } = useIdioma();
  const dir = useDireccion();
  const insets = useSafeAreaInsets();
  const tiempo = useTiempo();
  const [texto, setTexto] = useState('');
  const [hablante, setHablante] = useState(SIN_HABLANTE);
  const [voz, setVoz] = useState<string | null>(null);
  const [selector, setSelector] = useState(false);
  const { width: anchoDeVentana } = useWindowDimensions();
  const [duracion, setDuracion] = useState(6);
  const [creativo, setCreativo] = useState<SeleccionCreativa>({});
  const [familia, setFamilia] = useState<string>(FAMILIAS_DEL_CUADRO[0]?.id ?? 'movement');
  const [seguro, setSeguro] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (!cuadro) return;
    setTexto(cuadro.texto); setHablante(cuadro.hablante); setVoz(cuadro.voz ?? null); setDuracion(cuadro.duracion); setCreativo(cuadro.creativo);
    setFamilia(FAMILIAS_DEL_CUADRO[0]?.id ?? 'movement'); setSeguro(false); setAviso(null);
  }, [cuadro?.id]);
  if (!cuadro) return null;

  const fam = FAMILIAS_DEL_CUADRO.find((f) => f.id === familia) ?? FAMILIAS_DEL_CUADRO[0];
  const movimiento = creativo['movement.type'];
  const conMovimiento = !!movimiento && movimiento !== 'static';
  const personaje = personajes.find((p) => p.id === hablante);
  const campo = [E.campo, textoPortada(16, '400'), dir.texto, { color: P.tinta }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)];

  const guardar = () => { onGuardar(cuadro.id, { texto, hablante, voz, duracion, creativo }); onClose(); };
  const accion = (f: () => void) => () => { f(); onClose(); };
  const cadena = { personaje: personaje?.voz ?? null, escena: vozDeTanda ?? null, cuadro: voz };
  const vozActual = resolverVoz(cadena);
  const nombreDeVoz = vozActual.id === VOZ_AUTO ? t('filmmakerSonido.voiceAuto') : vozPorId(VOCES_PREDETERMINADAS, vozActual.id)?.nombre ?? t('filmmakerSonido.voiceAuto');
  const lineaDeVoz = hablante === SIN_HABLANTE ? t('filmmakerTandas.voiceNone') : nombreDeVoz;
  const ancha = anchoDeVentana >= 900;
  const hablantes = [{ id: SIN_HABLANTE, nombre: t('filmmakerTandas.speakerNone') }, { id: NARRADOR, nombre: t('filmmakerTandas.speakerNarrator') }, ...personajes.map((p) => ({ id: p.id, nombre: p.nombre }))];

  const seccion = (clave: string) => <Text style={[textoPortada(15, '600'), dir.texto, { color: P.tinta, marginTop: 6 }]} accessibilityRole="header">{t(clave)}</Text>;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={E.velo} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')} />
      <View style={[styles.ancla, ancha && styles.anclaLado]} pointerEvents="box-none">
        <View style={[E.hoja, styles.hoja, ancha && styles.hojaLado, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]} accessibilityViewIsModal>
          <View style={E.asa} />
          <View style={[styles.cabeza, dir.contenedor]}>
            <View style={{ flex: 1 }}>
              <Text style={[textoPortada(18, '600'), dir.texto, { color: P.tinta }]} accessibilityRole="header" numberOfLines={1}>{t('filmmakerTandas.frameTitle', { n: formato.numero(numero) })}</Text>
              <Text style={[textoPortada(13, '500'), dir.texto, { color: P.tintaSecundaria }]}>{tiempo.rango(inicio, fin)}</Text>
            </View>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')} style={styles.cerrar}><Ionicons name="close" size={20} color={P.tinta} /></TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 8 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <TextInput value={texto} onChangeText={setTexto} maxLength={TOPES_TANDAS.texto} multiline placeholder={t('filmmakerTandas.frameTextPlaceholder')} placeholderTextColor={P.tintaSecundaria} selectionColor={P.luz} accessibilityLabel={t('filmmakerTandas.frameText')} style={[...campo, { minHeight: 76 }]} textAlignVertical="top" />

            {seccion('filmmakerTandas.frameSpeaker')}
            <View style={[E.fila, dir.contenedor]}>
              {hablantes.map((h) => (
                <TouchableOpacity key={h.id || 'none'} onPress={() => setHablante(h.id)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={h.nombre} accessibilityState={{ selected: hablante === h.id }} style={[E.chip, hablante === h.id && E.chipSel]}>
                  <Text style={[textoPortada(14, hablante === h.id ? '600' : '500'), { color: P.tinta }]} numberOfLines={1}>{h.nombre}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {hablante !== SIN_HABLANTE ? (
              <TouchableOpacity onPress={() => setSelector(true)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={etiquetaAccesible(t('filmmakerSonido.layerVoice'), lineaDeVoz, t('filmmakerTandas.voiceChange'))} style={[styles.voz, dir.contenedor]}>
                <Ionicons name="mic-outline" size={18} color={P.tinta} />
                <View style={{ flex: 1 }}>
                  <Text style={[textoPortada(14, '600'), dir.texto, { color: P.tinta }]} numberOfLines={1}>{t('filmmakerSonido.layerVoice')}</Text>
                  <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]} numberOfLines={2}>{lineaDeVoz}</Text>
                </View>
                <Text style={[textoPortada(13, '600'), { color: P.tinta }]}>{t('filmmakerTandas.voiceChange')}</Text>
              </TouchableOpacity>
            ) : <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmakerTandas.voiceNone')}</Text>}
            {!MUSICA_DE_ESCENA_ABIERTA ? <FilaCerrada compacta titulo={t('filmmakerSonido.layerMusic')} motivo={t('filmmakerSonido.musicClosed')} icono="musical-notes-outline" onAviso={setAviso} /> : null}
            {!EFECTOS_DE_SONIDO_ABIERTOS ? <FilaCerrada compacta titulo={t('filmmakerSonido.layerEffects')} motivo={t('filmmakerSonido.effectsClosed')} icono="volume-high-outline" onAviso={setAviso} /> : null}

            {seccion('studio.ctlShot')}
            <View style={[E.fila, dir.contenedor]}>
              {PLANOS_DEL_CUADRO.map((v) => {
                const clave = claveDelValor('shot.type', v);
                if (!clave) return null;
                const sel = creativo['shot.type'] === v;
                return (
                  <TouchableOpacity key={v} onPress={() => setCreativo((c) => conCreativo(c, 'shot.type', v))} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t(clave)} accessibilityState={{ selected: sel }} style={[E.chip, sel && E.chipSel]}>
                    <Text style={[textoPortada(14, sel ? '600' : '500'), { color: P.tinta }]} numberOfLines={1}>{t(clave)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {seccion('filmmakerTandas.frameCamera')}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.pestanas, dir.contenedor]} accessibilityRole="tablist">
              {FAMILIAS_DEL_CUADRO.map((f) => (
                <TouchableOpacity key={f.id} onPress={() => setFamilia(f.id)} activeOpacity={0.8} accessibilityRole="tab" accessibilityLabel={t(f.clave)} accessibilityState={{ selected: f.id === familia }} style={[E.chip, f.id === familia && E.chipSel]}>
                  <Text style={[textoPortada(14, f.id === familia ? '600' : '500'), { color: P.tinta }]} numberOfLines={1}>{t(f.clave)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={[styles.galeria, dir.contenedor]}>
              {fam?.comandos.map((c) => {
                const sel = creativo[c.ruta] === c.valor;
                return (
                  <TouchableOpacity key={c.alias} testID={`gal-${c.ruta}-${c.valor}`} onPress={() => setCreativo((x) => conCreativo(x, c.ruta, c.valor))} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t(c.clave)} accessibilityState={{ selected: sel }} style={[styles.tesela, sel && styles.teselaSel]}>
                    <Ionicons name={c.icono as any} size={22} color={P.tinta} />
                    <Text style={[textoPortada(12, sel ? '600' : '500'), { color: P.tinta, textAlign: 'center' }]} numberOfLines={2}>{t(c.clave)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {seccion('filmmakerTandas.frameIntensity')}
            <View style={[E.fila, dir.contenedor]} accessibilityState={{ disabled: !conMovimiento }}>
              {INTENSIDADES.map((i) => {
                const sel = conMovimiento && creativo['movement.speed'] === i.valor;
                return (
                  <TouchableOpacity key={i.valor} onPress={() => setCreativo((c) => conCreativo(c, 'movement.speed', i.valor))} disabled={!conMovimiento} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t(i.clave)} accessibilityState={{ selected: sel, disabled: !conMovimiento }} style={[E.chip, { flex: 1 }, sel && E.chipSel, !conMovimiento && { opacity: 0.5 }]}>
                    <Text style={[textoPortada(14, sel ? '600' : '500'), { color: P.tinta }]} numberOfLines={1}>{t(i.clave)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]}>{conMovimiento ? t('filmmakerTandas.intensityNote') : t('filmmakerTandas.intensityNeedsMove')}</Text>

            {seccion('filmmakerTandas.frameDuration')}
            <View style={[styles.paso, dir.contenedor]}>
              <TouchableOpacity onPress={() => setDuracion((d) => Math.max(1, d - 1))} disabled={duracion <= 1} accessibilityRole="button" accessibilityLabel={t('filmmakerTandas.durationLess')} accessibilityState={{ disabled: duracion <= 1 }} style={[styles.boton, duracion <= 1 && { opacity: 0.4 }]}><Ionicons name="remove" size={20} color={P.tinta} /></TouchableOpacity>
              <Text style={[textoPortada(18, '600'), { color: P.tinta, minWidth: 64, textAlign: 'center' }]} accessibilityLiveRegion="polite">{t('filmmaker.hubSeconds', { n: formato.numero(duracion) })}</Text>
              <TouchableOpacity onPress={() => setDuracion((d) => Math.min(TOPE_DE_CUADRO, d + 1))} disabled={duracion >= TOPE_DE_CUADRO} accessibilityRole="button" accessibilityLabel={t('filmmakerTandas.durationMore')} accessibilityState={{ disabled: duracion >= TOPE_DE_CUADRO }} style={[styles.boton, duracion >= TOPE_DE_CUADRO && { opacity: 0.4 }]}><Ionicons name="add" size={20} color={P.tinta} /></TouchableOpacity>
              <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria, flex: 1 }]}>{t('filmmakerTandas.durationMax', { n: formato.numero(TOPE_DE_CUADRO) })}</Text>
            </View>

            {seccion('filmmakerTandas.frameEffects')}
            <View style={[E.fila, dir.contenedor]}>
              {EFECTOS_CERRADOS.map((f) => (
                <TouchableOpacity key={f.id} onPress={() => setAviso(t(f.claveMotivo))} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={etiquetaAccesible(t(f.clave), t(f.claveMotivo))} accessibilityState={{ disabled: true }} style={[E.chip, styles.cerrado]}>
                  <Ionicons name={f.icono as any} size={14} color={P.tintaDeshabilitada} />
                  <Text style={[textoPortada(14, '500'), { color: P.tintaSecundaria }]} numberOfLines={1}>{t(f.clave)}</Text>
                  <Ionicons name="lock-closed-outline" size={12} color={P.tintaDeshabilitada} />
                </TouchableOpacity>
              ))}
            </View>

            {seccion('filmmakerTandas.frameD1')}
            <View style={[E.fila, dir.contenedor]}>
              {ACCIONES_D1.map((a) => D1_ABIERTO && onAccionD1 ? (
                <TouchableOpacity key={a.id} onPress={() => onAccionD1(a.id, cuadro.id)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t(a.clave)} style={E.chip}>
                  <Ionicons name={a.icono as any} size={14} color={P.tinta} />
                  <Text style={[textoPortada(14, '500'), { color: P.tinta }]} numberOfLines={1}>{t(a.clave)}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity key={a.id} onPress={() => setAviso(t('filmmakerTandas.d1Closed'))} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={etiquetaAccesible(t(a.clave), t('filmmakerTandas.d1Closed'))} accessibilityState={{ disabled: true }} style={[E.chip, styles.cerrado]}>
                  <Ionicons name={a.icono as any} size={14} color={P.tintaDeshabilitada} />
                  <Text style={[textoPortada(14, '500'), { color: P.tintaSecundaria }]} numberOfLines={1}>{t(a.clave)}</Text>
                  <Ionicons name="lock-closed-outline" size={12} color={P.tintaDeshabilitada} />
                </TouchableOpacity>
              ))}
            </View>

            {aviso ? <Text style={[textoPortada(13, '500'), dir.texto, styles.aviso, { color: P.tinta }]} accessibilityLiveRegion="polite">{aviso}</Text> : null}

            <View style={[E.fila, dir.contenedor, { marginTop: 4 }]}>
              <BotonContorno texto={t('filmmakerTandas.frameMoveBefore')} icono={dir.esRTL ? 'arrow-forward' : 'arrow-back'} apagado={esPrimero} onPress={accion(() => onMover(cuadro.id, -1))} />
              <BotonContorno texto={t('filmmakerTandas.frameMoveAfter')} icono={dir.esRTL ? 'arrow-back' : 'arrow-forward'} apagado={esUltimo} onPress={accion(() => onMover(cuadro.id, 1))} />
              <BotonContorno texto={t('filmmakerTandas.frameDuplicate')} icono="copy-outline" onPress={accion(() => onDuplicar(cuadro.id))} />
              {puedePartir ? <BotonContorno texto={t('filmmakerTandas.frameSplitHere')} icono="git-branch-outline" onPress={accion(() => onPartirAqui(cuadro.id))} /> : null}
              <BotonContorno texto={seguro ? t('filmmakerTandas.frameRemoveSure') : t('filmmakerTandas.frameRemove')} icono="trash-outline" peligro onPress={() => { if (seguro) { onQuitar(cuadro.id); onClose(); } else setSeguro(true); }} />
            </View>
          </ScrollView>

          <BotonBlanco texto={t('filmmakerTandas.frameDone')} onPress={guardar} testID="ficha-listo" />
        </View>
      </View>
      <SelectorDeVoz visible={selector} onClose={() => setSelector(false)} contexto="shot" valor={voz} herencia={herenciaDe('shot', { personaje: personaje?.voz ?? null, escena: vozDeTanda ?? null })} nombre={t('filmmakerTandas.frameTitle', { n: formato.numero(numero) })} onCambiar={(v) => { setVoz(v); setSelector(false); }} />
    </Modal>
  );
};

const styles = StyleSheet.create({
  ancla: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  hoja: { width: '100%', maxWidth: 640, maxHeight: '92%' },
  anclaLado: { alignItems: 'flex-end', justifyContent: 'flex-start' },
  hojaLado: { maxWidth: 460, maxHeight: '100%', height: '100%', borderTopLeftRadius: 24, borderBottomLeftRadius: 24, borderTopRightRadius: 0, borderBottomRightRadius: 0 },
  cabeza: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cerrar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  voz: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: P.bordeCapsula, backgroundColor: P.superficie },
  pestanas: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  galeria: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tesela: { width: 88, minHeight: 76, borderRadius: 16, borderWidth: 1, borderColor: P.bordeCapsula, backgroundColor: P.superficie, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 6, paddingVertical: 8 },
  teselaSel: { borderColor: '#FFFFFF', borderWidth: 2, backgroundColor: P.superficieAlta },
  paso: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  boton: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: P.bordeCapsula, backgroundColor: P.superficie, alignItems: 'center', justifyContent: 'center' },
  cerrado: { borderStyle: 'dashed', backgroundColor: 'transparent' },
  aviso: { padding: 10, borderRadius: 12, borderWidth: 1, borderColor: P.bordeLuz, backgroundColor: P.superficie },
});
