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
import { BotonBlanco, BotonContorno, estilosComunes as E, useTiempo } from '../tandas/comunes';
import CajaDePrompt from '../../creator/CajaDePrompt';

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
  /**
   * «Pídele un cambio a Weë»: la caja común de Weë Brain DENTRO de la ficha (el control vive junto al cuadro que modifica). `enviar` recibe lo escrito;
   * `contenido` es la respuesta de Weë (burbuja y propuesta, la pone la pantalla); `version` sube cuando se aplicó un cambio y la ficha se relee.
   */
  pedirCambio?: { enviar: (texto: string) => void; contenido: React.ReactNode; version: number };
}

/**
 * LA FICHA DEL CUADRO (hoja inferior; se abre al tocar un cuadro): texto, quién habla y la voz que hereda, encuadre, la BIBLIOTECA VISUAL de cámara
 * (movimiento · toma · ángulo · óptica · luz, con icono), intensidad y duración. Lo que el contrato no tiene —cámara lenta como efecto, zoom de impacto,
 * plano inclinado— y lo que espera a D1 salen CERRADOS con su motivo. Los cambios se guardan al pulsar «Listo».
 */
export const FichaDelCuadro: React.FC<Props> = ({ cuadro, numero, inicio, fin, esPrimero, esUltimo, puedePartir, personajes, onClose, onGuardar, onMover, onDuplicar, onQuitar, onPartirAqui, onAccionD1, vozDeTanda, pedirCambio }) => {
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
  const [panel, setPanel] = useState<'shot' | 'camera' | 'duration' | 'voice' | null>(null);
  const [mas, setMas] = useState(false);
  const [pide, setPide] = useState(false);
  const [cambio, setCambio] = useState('');

  useEffect(() => {
    if (!cuadro) return;
    setTexto(cuadro.texto); setHablante(cuadro.hablante); setVoz(cuadro.voz ?? null); setDuracion(cuadro.duracion); setCreativo(cuadro.creativo);
    setFamilia(FAMILIAS_DEL_CUADRO[0]?.id ?? 'movement'); setSeguro(false); setPanel(null); setMas(false); setPide(false); setCambio('');
  }, [cuadro?.id, pedirCambio?.version]);
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

  const planoActual = claveDelValor('shot.type', creativo['shot.type'] ?? '');
  const movimientoActual = conMovimiento ? claveDelValor('movement.type', movimiento as string) : null;
  const quienHabla = hablantes.find((h) => h.id === hablante)?.nombre ?? '';
  const resumen = (id: 'shot' | 'camera' | 'duration', clave: string, valor: string) => (
    <TouchableOpacity key={id} testID={`ficha-${id}`} onPress={() => setPanel((p) => (p === id ? null : id))} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={etiquetaAccesible(t(clave), valor)} accessibilityState={{ expanded: panel === id }} style={[styles.resumen, panel === id && styles.resumenSel]}>
      <Text style={[textoPortada(12, '500'), { color: P.tintaSecundaria }]} numberOfLines={1}>{t(clave)}</Text>
      <Text style={[textoPortada(14, '600'), { color: P.tinta, textAlign: 'center' }]} numberOfLines={2}>{valor}</Text>
    </TouchableOpacity>
  );
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
            <TextInput value={texto} onChangeText={setTexto} maxLength={TOPES_TANDAS.texto} multiline placeholder={t('filmmakerTandas.frameTextPlaceholder')} placeholderTextColor={P.tintaSecundaria} selectionColor={P.luz} accessibilityLabel={t('filmmakerTandas.frameText')} style={[...campo, { minHeight: 64 }]} textAlignVertical="top" />

            {/* Lo que más se toca, arriba y de un vistazo: encuadre, cámara y duración. Cada uno abre su panel aquí mismo, uno a la vez. */}
            <View style={[styles.resumenes, dir.contenedor]}>
              {resumen('shot', 'studio.ctlShot', planoActual ? t(planoActual) : t('filmmakerTandas.shotUndecided'))}
              {resumen('camera', 'filmmakerTandas.frameCamera', movimientoActual ? t(movimientoActual) : t('filmmakerTandas.cameraNone'))}
              {resumen('duration', 'filmmakerTandas.frameDuration', t('filmmaker.hubSeconds', { n: formato.numero(duracion) }))}
            </View>

            {panel === 'shot' ? (
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
            ) : null}

            {panel === 'camera' ? (
              <View style={{ gap: 10 }}>
                <View style={[E.fila, dir.contenedor]} accessibilityRole="tablist">
                  {FAMILIAS_DEL_CUADRO.map((f) => (
                    <TouchableOpacity key={f.id} onPress={() => setFamilia(f.id)} activeOpacity={0.8} accessibilityRole="tab" accessibilityLabel={t(f.clave)} accessibilityState={{ selected: f.id === familia }} style={[E.chip, f.id === familia && E.chipSel]}>
                      <Text style={[textoPortada(14, f.id === familia ? '600' : '500'), { color: P.tinta }]} numberOfLines={1}>{t(f.clave)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
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
                {conMovimiento ? (
                  <View style={{ gap: 6 }}>
                    {seccion('filmmakerTandas.frameIntensity')}
                    <View style={[E.fila, dir.contenedor]}>
                      {INTENSIDADES.map((i) => {
                        const sel = creativo['movement.speed'] === i.valor;
                        return (
                          <TouchableOpacity key={i.valor} onPress={() => setCreativo((c) => conCreativo(c, 'movement.speed', i.valor))} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t(i.clave)} accessibilityState={{ selected: sel }} style={[E.chip, { flex: 1 }, sel && E.chipSel]}>
                            <Text style={[textoPortada(14, sel ? '600' : '500'), { color: P.tinta }]} numberOfLines={1}>{t(i.clave)}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ) : null}
              </View>
            ) : null}

            {panel === 'duration' ? (
              <View style={[styles.paso, dir.contenedor]}>
                <TouchableOpacity onPress={() => setDuracion((d) => Math.max(1, d - 1))} disabled={duracion <= 1} accessibilityRole="button" accessibilityLabel={t('filmmakerTandas.durationLess')} accessibilityState={{ disabled: duracion <= 1 }} style={[styles.boton, duracion <= 1 && { opacity: 0.4 }]}><Ionicons name="remove" size={20} color={P.tinta} /></TouchableOpacity>
                <Text style={[textoPortada(18, '600'), { color: P.tinta, minWidth: 64, textAlign: 'center' }]} accessibilityLiveRegion="polite">{t('filmmaker.hubSeconds', { n: formato.numero(duracion) })}</Text>
                <TouchableOpacity onPress={() => setDuracion((d) => Math.min(TOPE_DE_CUADRO, d + 1))} disabled={duracion >= TOPE_DE_CUADRO} accessibilityRole="button" accessibilityLabel={t('filmmakerTandas.durationMore')} accessibilityState={{ disabled: duracion >= TOPE_DE_CUADRO }} style={[styles.boton, duracion >= TOPE_DE_CUADRO && { opacity: 0.4 }]}><Ionicons name="add" size={20} color={P.tinta} /></TouchableOpacity>
                <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria, flex: 1 }]}>{t('filmmakerTandas.durationMax', { n: formato.numero(TOPE_DE_CUADRO) })}</Text>
              </View>
            ) : null}

            {/* UNA sola fila de voz y sonido: quién habla, su voz (heredada) y, cuando existan, música y efectos. */}
            <TouchableOpacity onPress={() => setPanel((p) => (p === 'voice' ? null : 'voice'))} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={etiquetaAccesible(t('filmmakerTandas.frameVoiceSound'), hablante === SIN_HABLANTE ? lineaDeVoz : `${quienHabla}, ${lineaDeVoz}`)} accessibilityState={{ expanded: panel === 'voice' }} style={[styles.voz, panel === 'voice' && styles.vozAbierta, dir.contenedor]}>
              <Ionicons name="mic-outline" size={18} color={P.tinta} />
              <View style={{ flex: 1 }}>
                <Text style={[textoPortada(14, '600'), dir.texto, { color: P.tinta }]} numberOfLines={1}>{t('filmmakerTandas.frameVoiceSound')}</Text>
                <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]} numberOfLines={1}>{hablante === SIN_HABLANTE ? lineaDeVoz : `${quienHabla} · ${lineaDeVoz}`}</Text>
              </View>
              <Ionicons name={panel === 'voice' ? 'chevron-up' : 'chevron-down'} size={18} color={P.tintaSecundaria} />
            </TouchableOpacity>
            {panel === 'voice' ? (
              <View style={{ gap: 10 }}>
                {seccion('filmmakerTandas.frameSpeaker')}
                <View style={[E.fila, dir.contenedor]}>
                  {hablantes.map((h) => (
                    <TouchableOpacity key={h.id || 'none'} onPress={() => setHablante(h.id)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={h.nombre} accessibilityState={{ selected: hablante === h.id }} style={[E.chip, hablante === h.id && E.chipSel]}>
                      <Text style={[textoPortada(14, hablante === h.id ? '600' : '500'), { color: P.tinta }]} numberOfLines={1}>{h.nombre}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {hablante !== SIN_HABLANTE ? <BotonContorno texto={`${t('filmmakerSonido.layerVoice')}: ${nombreDeVoz} · ${t('filmmakerTandas.voiceChange')}`} icono="mic-outline" onPress={() => setSelector(true)} /> : null}
                {!MUSICA_DE_ESCENA_ABIERTA || !EFECTOS_DE_SONIDO_ABIERTOS ? <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmakerTandas.soundSoon')}</Text> : null}
              </View>
            ) : null}

            {/* «Pídele un cambio a Weë»: una fila discreta; abre la caja común de Weë Brain aquí mismo. */}
            {pedirCambio ? (
              <>
                <TouchableOpacity onPress={() => setPide((p) => !p)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t('filmmakerDirector.askChange')} accessibilityState={{ expanded: pide }} style={[styles.masFila, dir.contenedor]}>
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

            {/* Todo lo demás, plegado. */}
            <TouchableOpacity onPress={() => setMas((m) => !m)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t('filmmakerTandas.frameMore')} accessibilityState={{ expanded: mas }} style={[styles.masFila, dir.contenedor]}>
              <Text style={[textoPortada(14, '600'), dir.texto, { color: P.tinta, flex: 1 }]}>{t('filmmakerTandas.frameMore')}</Text>
              <Ionicons name={mas ? 'chevron-up' : 'chevron-down'} size={18} color={P.tintaSecundaria} />
            </TouchableOpacity>
            {mas ? (
              <View style={{ gap: 10 }}>
                {D1_ABIERTO && onAccionD1 ? (
                  <View style={[E.fila, dir.contenedor]}>
                    {ACCIONES_D1.map((a) => (
                      <TouchableOpacity key={a.id} onPress={() => onAccionD1(a.id, cuadro.id)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t(a.clave)} style={E.chip}>
                        <Ionicons name={a.icono as any} size={14} color={P.tinta} />
                        <Text style={[textoPortada(14, '500'), { color: P.tinta }]} numberOfLines={1}>{t(a.clave)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmakerTandas.moreSoon', { lista: formato.lista([...EFECTOS_CERRADOS, ...ACCIONES_D1].map((x) => t(x.clave))) })} {t('filmmakerProd.d1Reason')}</Text>}
                <View style={[E.fila, dir.contenedor]}>
                  <BotonContorno texto={t('filmmakerTandas.frameMoveBefore')} icono={dir.esRTL ? 'arrow-forward' : 'arrow-back'} apagado={esPrimero} onPress={accion(() => onMover(cuadro.id, -1))} />
                  <BotonContorno texto={t('filmmakerTandas.frameMoveAfter')} icono={dir.esRTL ? 'arrow-back' : 'arrow-forward'} apagado={esUltimo} onPress={accion(() => onMover(cuadro.id, 1))} />
                  <BotonContorno texto={t('filmmakerTandas.frameDuplicate')} icono="copy-outline" onPress={accion(() => onDuplicar(cuadro.id))} />
                  {puedePartir ? <BotonContorno texto={t('filmmakerTandas.frameSplitHere')} icono="git-branch-outline" onPress={accion(() => onPartirAqui(cuadro.id))} /> : null}
                  <BotonContorno texto={seguro ? t('filmmakerTandas.frameRemoveSure') : t('filmmakerTandas.frameRemove')} icono="trash-outline" peligro onPress={() => { if (seguro) { onQuitar(cuadro.id); onClose(); } else setSeguro(true); }} />
                </View>
              </View>
            ) : null}
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
  galeria: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tesela: { width: 88, minHeight: 76, borderRadius: 16, borderWidth: 1, borderColor: P.bordeCapsula, backgroundColor: P.superficie, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 6, paddingVertical: 8 },
  teselaSel: { borderColor: '#FFFFFF', borderWidth: 2, backgroundColor: P.superficieAlta },
  paso: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  boton: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: P.bordeCapsula, backgroundColor: P.superficie, alignItems: 'center', justifyContent: 'center' },
  resumenes: { flexDirection: 'row', gap: 8 },
  resumen: { flex: 1, minHeight: 64, borderRadius: 16, borderWidth: 1, borderColor: P.bordeCapsula, backgroundColor: P.superficie, alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 6, paddingVertical: 8 },
  resumenSel: { borderColor: '#FFFFFF', borderWidth: 2, backgroundColor: P.superficieAlta },
  vozAbierta: { borderColor: P.bordeLuz },
  masFila: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 4 },
});
