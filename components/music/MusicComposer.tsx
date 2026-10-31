import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../contexts/ThemeContext';
import { useIdioma } from '../../contexts/IdiomaContext';
import { useResponsive } from '../../hooks/useResponsive';
import { nombreDelIdioma } from '../../i18n/formato';
import { useBrainChat } from '../../hooks/useBrainChat';
import CajaDePrompt from '../creator/CajaDePrompt';
import MelodiaDeReferencia, { ReferenciaElegida } from './MelodiaDeReferencia';
import { Boton, Chip, ChipDeEstado, Nota, Selector, Tarjeta, TituloDeBloque } from './piezas';
import {
  AVANZADAS_DE_MUSIC, GRUPOS_DE_MUSIC, IDIOMAS_DE_CANCION, MAX_DESCRIPCION, MAX_LETRA, MODOS_DE_MUSIC, ModoDeMusic, PESTANAS_DE_MUSIC, PUNTOS_DE_AUDIO,
  PestanaDeMusic, PuntoDePartidaId, SECCIONES_DE_ESTRUCTURA, SELECCION_VACIA_MUSIC, SeleccionDeMusic, TRANSFORMACIONES_DE_MUSIC,
  alternarOpcionMusic, crearIntencionMusic, hayEleccionMusic, pestanaDelPunto, puntoDePartida, queFaltaMusic,
} from '../../constants/musicComposer';
import { MUSIC_GENERACION_VALIDADA, capacidadDeMusic, capacidadUsable } from '../../constants/musicCapabilities';
import { EstadoDeCapa } from '../../utils/musicModel';
import { CLAVE_DE_BORRADOR_MUSIC, armarBriefMusic, leerBorrador, serializarBorrador } from '../../utils/musicBrief';
import { SPACING, FONT_SIZE, FONT_WEIGHT } from '../../constants/design';
import { scale } from '../../utils/scale';

interface Props {
  puntoInicial?: PuntoDePartidaId;
  onVerEjemplo: () => void;
  inicial?: { texto?: string };
}

const EJEMPLOS = ['example1', 'example2', 'example3'] as const;
const IDIOMA = 'language';

/**
 * EL COMPOSER DE WEË MUSIC. EL MISMO EN LA WEB Y EN LA APP.
 *
 * Una sola lámina: el modo arriba (Simple · Personalizado · Avanzado), las pestañas de por dónde se empieza, la caja, las
 * ideas rápidas, los controles y los dos botones. Lo que no está se ve apagado con su motivo: ningún botón muerto. En el
 * teléfono las pestañas son una rejilla y los controles, filas.
 *
 * Una experiencia sobre los sistemas compartidos, NO un motor: no habla con ninguna API musical.
 *  · «No sé, ayúdame a elegir» es REAL: manda lo elegido y la descripción original (intacta, entre comillas) a Weë Brain
 *    por `useBrainChat` (mismo servicio, mismo cobro por bloques, mismos errores y mismo aviso de demostración).
 *  · GENERAR CANCIÓN está cerrado mientras `MUSIC_GENERACION_VALIDADA` sea false: el botón lo dice con todas las letras
 *    («pendiente de integración») y la configuración queda preparada como intención estructurada. Nunca se enseña
 *    una canción, una animación de progreso ni un reproductor simulados como si hubiera resultado.
 *  · El audio de referencia (grabado o subido) vive solo en esta pantalla; el borrador guarda texto y elecciones, nunca audio.
 *  · El coste no se calcula: no hay precios medidos. Se dice «coste por confirmar» y no se inventa ninguna cifra.
 */
const MusicComposer: React.FC<Props> = ({ puntoInicial = 'idea', onVerEjemplo, inicial }) => {
  const { theme } = useTheme();
  const { t, formato, locale } = useIdioma();
  const { isMobile } = useResponsive();
  const navigation = useNavigation<any>();
  const chat = useBrainChat();

  const [punto, setPunto] = useState<PuntoDePartidaId>(puntoInicial);
  /* Imagen, Extender y Remix no son puntos de partida del contrato: son pestañas que dicen por qué aún no se pueden usar. */
  const [sinPunto, setSinPunto] = useState<PestanaDeMusic | null>(null);
  const [modo, setModo] = useState<ModoDeMusic>('custom');
  const [abierto, setAbierto] = useState<string | null>(null);
  const [descripcion, setDescripcion] = useState(inicial?.texto ?? '');
  const [letra, setLetra] = useState('');
  const [sel, setSel] = useState<SeleccionDeMusic>(SELECCION_VACIA_MUSIC);
  const [referencia, setReferencia] = useState<ReferenciaElegida | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [pidio, setPidio] = useState(false);
  /* «Dejar de esperar»: la respuesta tardía no se enseña. No hay cancelación en Weë Brain: el envío sigue su curso. */
  const [dejoDeEsperar, setDejoDeEsperar] = useState(false);
  /* Guarda SÍNCRONA contra el doble toque: el estado `busy` de React llega un render tarde. */
  const enVuelo = useRef(false);
  const desde = useRef(0);

  /* «Continuar borrador» (y el arranque, si ya hay uno) lee el borrador local: solo texto y elecciones. */
  const cargarBorrador = useCallback(async () => {
    try {
      const b = leerBorrador(await AsyncStorage.getItem(CLAVE_DE_BORRADOR_MUSIC));
      if (!b) return false;
      setPunto(b.punto === 'draft' ? 'idea' : b.punto);
      setSinPunto(null);
      setDescripcion(b.descripcion);
      setLetra(b.letra);
      setSel(b.sel);
      return true;
    } catch { return false; }
  }, []);

  useEffect(() => { if (puntoInicial === 'draft') cargarBorrador(); }, [puntoInicial, cargarBorrador]);

  const info = puntoDePartida(punto)!;
  const pestana: PestanaDeMusic = sinPunto ?? pestanaDelPunto(punto);
  const falta = queFaltaMusic(punto, descripcion, letra, !!referencia);
  const intencion = useMemo(
    () => crearIntencionMusic(punto, sel, descripcion, letra, referencia ? { origen: referencia.origen, duracionSec: referencia.duracionSec } : undefined),
    [punto, sel, descripcion, letra, referencia],
  );

  const elegirPestana = (id: PestanaDeMusic) => {
    if (id === 'image' || id === 'extend' || id === 'remix') { setSinPunto(id); return; }
    setSinPunto(null);
    if (id === pestanaDelPunto(punto)) return;
    setPunto(id === 'lyrics' ? 'lyrics' : id === 'audio' ? 'audio' : 'idea');
  };

  const pedirAyuda = useCallback(async () => {
    if (!chat.user) { navigation.navigate('Login'); return; }
    if (enVuelo.current || chat.busy) return;
    enVuelo.current = true;
    try {
      const brief = armarBriefMusic({ t, lista: (xs) => formato.lista(xs) }, punto, sel, descripcion, letra);
      desde.current = chat.messages.length;
      setPidio(true);
      setDejoDeEsperar(false);
      await chat.send(brief);
    } finally {
      enVuelo.current = false;
    }
  }, [chat, navigation, t, formato, punto, sel, descripcion, letra]);

  const guardar = useCallback(async () => {
    try {
      await AsyncStorage.setItem(CLAVE_DE_BORRADOR_MUSIC, serializarBorrador({ punto, descripcion, letra, sel }));
      setGuardado(true);
    } catch { setGuardado(false); }
  }, [punto, descripcion, letra, sel]);
  useEffect(() => { setGuardado(false); }, [punto, descripcion, letra, sel]);

  const respuestas = pidio && !dejoDeEsperar ? chat.messages.slice(desde.current).filter((m) => m.role === 'wee') : [];
  const ultima = respuestas[respuestas.length - 1];

  const valorDelGrupo = (id: string): string => {
    const g = GRUPOS_DE_MUSIC.find((x) => x.id === id);
    const textos = (sel.elegidas[id] ?? []).map((o) => g?.opciones.find((x) => x.id === o)).filter(Boolean).map((o) => t(`music.${o!.clave}`));
    return textos.length ? formato.lista(textos) : t('music.autoPick');
  };

  const lineas = GRUPOS_DE_MUSIC.flatMap((g) => {
    const ids = sel.elegidas[g.id] ?? [];
    const textos = ids.map((id) => g.opciones.find((o) => o.id === id)).filter(Boolean).map((o) => t(`music.${o!.clave}`));
    return textos.length ? [t('music.reviewLine', { grupo: t(`music.${g.claveTitulo}`), valor: formato.lista(textos) })] : [];
  });
  if (sel.idioma) lineas.push(t('music.reviewLine', { grupo: t('music.groupLanguage'), valor: nombreDelIdioma(sel.idioma, locale) }));
  if (sel.idk) lineas.push(t('music.idk'));

  const estadoGenerar: EstadoDeCapa = !MUSIC_GENERACION_VALIDADA ? 'pendienteIntegracion' : falta.length ? 'borrador' : 'preparado';
  const hayCaja = pestana === 'text' || pestana === 'lyrics' || pestana === 'audio';

  /* La caja común de Weë AI: crece sola y no pierde sus botones. */
  const cajaDeDescripcion = (
    <View style={s.bloque}>
      <CajaDePrompt
        valor={descripcion}
        onCambiar={(x) => setDescripcion(x.slice(0, MAX_DESCRIPCION))}
        onEnviar={pedirAyuda}
        etiquetaEnviar={t('music.askBrain')}
        textoEnviar={t('music.askBrain')}
        /* En el teléfono, el ejemplo largo no cabe en la caja vacía: va la frase corta, entera. */
        placeholder={t(isMobile ? 'music.startIdeaHelp' : 'music.describeHint')}
        ocupado={chat.busy}
      />
      <View style={s.pieDeCaja}>
        {pestana === 'text' ? (
          <Chip
            texto={t('music.startInstrumental')}
            activo={punto === 'instrumental'}
            onPress={() => setPunto(punto === 'instrumental' ? 'idea' : 'instrumental')}
          />
        ) : <View />}
        <Nota>{t('music.counter', { cuenta: formato.numero(descripcion.length), maximo: formato.numero(MAX_DESCRIPCION) })}</Nota>
      </View>
    </View>
  );

  /* Un control con sus opciones: se abre debajo de la fila y se cierra al tocarlo otra vez. */
  const grupos = GRUPOS_DE_MUSIC.filter((g) => !(g.id === 'voice' && punto === 'instrumental'));
  const opcionesAbiertas = () => {
    if (abierto === IDIOMA) {
      return IDIOMAS_DE_CANCION.map((c) => (
        <Chip key={c} texto={nombreDelIdioma(c, locale)} activo={sel.idioma === c} onPress={() => setSel((x) => ({ ...x, idioma: x.idioma === c ? undefined : c }))} />
      ));
    }
    const g = grupos.find((x) => x.id === abierto);
    return g?.opciones.map((o) => (
      <Chip key={o.id} texto={t(`music.${o.clave}`)} activo={sel.elegidas[g.id]?.includes(o.id)} onPress={() => setSel((x) => alternarOpcionMusic(x, g, o.id))} />
    ));
  };

  return (
    <View style={s.raiz}>
      <View style={[s.lamina, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        {/* El título y el modo. */}
        <View style={s.cabecera}>
          <TituloDeBloque>{t('music.composerTitle')}</TituloDeBloque>
          <View style={[s.modos, isMobile && s.modosMovil, { backgroundColor: theme.colors.surface }]} accessibilityRole="radiogroup" accessibilityLabel={t('music.modesLabel')}>
            {MODOS_DE_MUSIC.map((m) => {
              const activo = m.id === modo;
              return (
                <TouchableOpacity
                  accessibilityRole="radio"
                  accessibilityState={{ selected: activo }}
                  key={m.id}
                  onPress={() => setModo(m.id)}
                  style={[s.modo, isMobile && s.modoMovil, activo && { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                >
                  <Text style={[s.modoTexto, { color: activo ? theme.colors.text : theme.colors.textSecondary }, activo && s.activo]}>{t(`music.${m.claveTitulo}`)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Por dónde se empieza: en el teléfono, rejilla; con sitio, una fila subrayada. */}
        <View style={[isMobile ? s.pestanasRejilla : s.pestanasFila, !isMobile && { borderBottomColor: theme.colors.border }]} accessibilityRole="tablist">
          {PESTANAS_DE_MUSIC.map((p) => {
            const activa = p.id === pestana;
            return (
              <TouchableOpacity
                accessibilityRole="tab"
                accessibilityState={{ selected: activa }}
                key={p.id}
                onPress={() => elegirPestana(p.id)}
                style={isMobile
                  ? [s.azulejo, { borderColor: activa ? theme.colors.accent : theme.colors.border, backgroundColor: activa ? theme.colors.accent + '1F' : theme.colors.card }]
                  : [s.pestana, { borderBottomColor: activa ? theme.colors.accent : 'transparent' }]}
              >
                <Ionicons name={p.icono as any} size={isMobile ? 20 : 16} color={activa ? theme.colors.accentDark : theme.colors.textSecondary} />
                <Text style={[s.pestanaTexto, { color: activa ? theme.colors.text : theme.colors.textSecondary }, activa && s.activo]}>{t(p.claveEntera)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Lo que pide cada pestaña. */}
        {pestana === 'text' && cajaDeDescripcion}

        {pestana === 'lyrics' && (
          <>
            <View style={s.bloque}>
              <CajaDePrompt
                valor={letra}
                onCambiar={(x) => setLetra(x.slice(0, MAX_LETRA))}
                onEnviar={guardar}
                etiquetaEnviar={t('music.saveDraft')}
                textoEnviar={t('music.saveDraft')}
                placeholder={t('music.lyricsHint')}
              />
              <View style={s.pieDeCaja}>
                <View />
                <Nota>{t('music.counter', { cuenta: formato.numero(letra.length), maximo: formato.numero(MAX_LETRA) })}</Nota>
              </View>
            </View>
            {cajaDeDescripcion}
          </>
        )}

        {pestana === 'audio' && (
          <>
            <View style={s.chips} accessibilityRole="radiogroup">
              {PUNTOS_DE_AUDIO.map((id) => {
                const p = puntoDePartida(id)!;
                return <Chip key={id} texto={t(`music.${p.claveTitulo}`)} activo={id === punto} onPress={() => setPunto(id)} />;
              })}
            </View>
            <Nota>{t(`music.${info.claveAyuda}`)}</Nota>
            {info.pideAudio && (
              <MelodiaDeReferencia
                key={punto}
                modo={punto === 'hum' ? 'record' : 'upload'}
                confirmada={referencia}
                intencion={sel.intencion}
                onIntencion={(i) => setSel((x) => ({ ...x, intencion: i }))}
                onConfirmar={setReferencia}
              />
            )}
            {punto === 'hum' && <Nota>{t('music.humHonest')}</Nota>}
            {cajaDeDescripcion}
          </>
        )}

        {pestana === 'image' && (
          <View style={[s.aviso, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="image-outline" size={18} color={theme.colors.textSecondary} />
            <View style={s.avisoTextos}>
              <Text style={[s.linea, { color: theme.colors.text }]}>{t('music.tabImageHelp')}</Text>
              <ChipDeEstado estado="noCompatible" />
            </View>
          </View>
        )}

        {pestana === 'extend' && (
          <View style={[s.aviso, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="play-forward-outline" size={18} color={theme.colors.textSecondary} />
            <View style={s.avisoTextos}>
              <Text style={[s.linea, { color: theme.colors.text }]}>{t('music.tabExtendHelp')}</Text>
              <ChipDeEstado estado={capacidadUsable('extend') ? 'preparado' : 'pendienteIntegracion'} />
            </View>
          </View>
        )}

        {pestana === 'remix' && (
          <View style={s.bloque}>
            <View style={[s.aviso, { backgroundColor: theme.colors.surface }]}>
              <Ionicons name="shuffle-outline" size={18} color={theme.colors.textSecondary} />
              <Text style={[s.linea, s.avisoTextos, { color: theme.colors.text }]}>{t('music.tabRemixHelp')}</Text>
            </View>
            {TRANSFORMACIONES_DE_MUSIC.filter((x) => x.id !== 'extend').map((x) => (
              <View key={x.id} style={[s.transformacion, { borderTopColor: theme.colors.border }]}>
                <View style={s.avisoTextos}>
                  <Text style={[s.nombre, { color: theme.colors.text }]}>{t(`music.${x.claveTitulo}`)}</Text>
                  <Nota>{t(`music.${x.claveAyuda}`)}</Nota>
                </View>
                <ChipDeEstado estado={capacidadUsable(x.capacidad) ? 'preparado' : capacidadDeMusic(x.capacidad).estado === 'pendiente' ? 'noCompatible' : 'pendienteIntegracion'} />
              </View>
            ))}
          </View>
        )}

        {/* Ideas rápidas: una frase con la que empezar. */}
        {hayCaja && (
          <View style={s.bloque}>
            <Text style={[s.sub, { color: theme.colors.textSecondary }]}>{t('music.ideasTitle')}</Text>
            <View style={s.chips}>
              {EJEMPLOS.map((e) => <Chip key={e} texto={t(`music.${e}`)} onPress={() => setDescripcion(t(`music.${e}`).slice(0, MAX_DESCRIPCION))} />)}
            </View>
          </View>
        )}

        {/* Los controles: en Simple no hay; en Personalizado, los reales; en Avanzado, también los que aún no se pueden usar. */}
        {modo !== 'simple' && (
          <View style={s.bloque}>
            <TituloDeBloque>{t('music.optionsTitle')}</TituloDeBloque>
            <View style={isMobile ? [s.filas, { borderTopColor: theme.colors.border }] : s.rejilla}>
              {grupos.map((g) => (
                <Selector
                  key={g.id}
                  etiqueta={t(`music.${g.claveTitulo}`)}
                  valor={valorDelGrupo(g.id)}
                  abierto={abierto === g.id}
                  fila={isMobile}
                  onPress={() => setAbierto((a) => (a === g.id ? null : g.id))}
                />
              ))}
              <Selector
                etiqueta={t('music.groupLanguage')}
                valor={sel.idioma ? nombreDelIdioma(sel.idioma, locale) : t('music.autoPick')}
                abierto={abierto === IDIOMA}
                fila={isMobile}
                onPress={() => setAbierto((a) => (a === IDIOMA ? null : IDIOMA))}
              />
            </View>
            {!!abierto && <View style={[s.chips, s.abiertas]}>{opcionesAbiertas()}</View>}
            <View style={s.chips}>
              <Chip texto={t('music.idk')} activo={sel.idk} onPress={() => setSel((x) => ({ ...x, idk: !x.idk }))} />
            </View>
          </View>
        )}

        {modo === 'advanced' && (
          <View style={s.bloque}>
            <View style={isMobile ? [s.filas, { borderTopColor: theme.colors.border }] : s.rejilla}>
              {AVANZADAS_DE_MUSIC.map((a) => (
                <Selector
                  key={a.id}
                  etiqueta={t(a.claveEntera ?? `music.${a.claveTitulo}`)}
                  valor={t('music.statePending')}
                  motivo={t(`music.${a.claveAyuda}`)}
                  desactivado={!capacidadUsable(a.capacidad)}
                  fila={isMobile}
                />
              ))}
            </View>
            <View style={s.chips}>
              {SECCIONES_DE_ESTRUCTURA.map((id) => <Chip key={id} texto={t(`music.section_${id}`)} desactivado />)}
            </View>
          </View>
        )}

        {/* Las dos acciones: la que funciona hoy y la que aún no, con su motivo a la vista. */}
        <View style={s.acciones}>
          <Boton texto={t('music.helpMeButton')} icono="sparkles-outline" onPress={pedirAyuda} desactivado={chat.busy} compacto />
          <Boton
            texto={t('music.generate')}
            icono="musical-notes"
            principal
            compacto
            desactivado={!MUSIC_GENERACION_VALIDADA || falta.length > 0}
            motivo={!MUSIC_GENERACION_VALIDADA ? t('music.generatePendingMotive') : undefined}
          />
        </View>
        <View style={s.fila}><ChipDeEstado estado={estadoGenerar} /><ChipDeEstado estado="costeDesconocido" /></View>
        {!MUSIC_GENERACION_VALIDADA && <Nota>{t('music.statusGenerateHelp')}</Nota>}
        <Nota>{t('music.brainNotice')}</Nota>
      </View>

      {/* Resultado real de la orientación, o su estado real */}
      {chat.busy && (
        <View style={s.fila} accessibilityLiveRegion="polite">
          <ActivityIndicator color={theme.colors.accentDark} />
          <Text style={[s.linea, { color: theme.colors.textSecondary }]}>{t('music.helpBusy')}</Text>
          {!dejoDeEsperar && <Boton texto={t('music.stopWaiting')} icono="close-circle-outline" onPress={() => setDejoDeEsperar(true)} compacto />}
        </View>
      )}
      {dejoDeEsperar && <Nota fuerte>{t('music.stopWaitingNote')}</Nota>}
      {!chat.busy && pidio && !dejoDeEsperar && chat.error ? <Text accessibilityLiveRegion="assertive" style={[s.linea, { color: theme.colors.error }]}>{chat.error}</Text> : null}
      {!chat.busy && ultima && (
        <Tarjeta>
          <View accessibilityLiveRegion="polite" style={{ gap: SPACING.xs }}>
            <TituloDeBloque>{t('music.adviceTitle')}</TituloDeBloque>
            <Text selectable style={[s.linea, { color: theme.colors.text }]}>{ultima.text}</Text>
            {ultima.demo ? <Nota>{t('music.statusDemo')}</Nota> : <Nota>{ultima.credits ? t('music.adviceCost', { credits: ultima.credits }) : t('music.adviceFree')}</Nota>}
          </View>
        </Tarjeta>
      )}

      {/* El resumen solo cuando hay algo que resumir. */}
      {(hayEleccionMusic(sel) || !!descripcion.trim() || !!letra.trim() || !!referencia) && (
        <Tarjeta>
          <TituloDeBloque>{t('music.reviewTitle')}</TituloDeBloque>
          <Text style={[s.linea, { color: theme.colors.text }]}>{t(`music.${info.claveTitulo}`)}</Text>
          {lineas.map((l) => <Text key={l} style={[s.linea, { color: theme.colors.text }]}>{l}</Text>)}
          {referencia ? <Text style={[s.linea, { color: theme.colors.text }]}>{t(referencia.origen === 'grabada' ? 'music.reviewRefRecorded' : 'music.reviewRefUploaded')}</Text> : null}
          {descripcion.trim() ? <Text style={[s.linea, { color: theme.colors.text }]} numberOfLines={3}>{descripcion.trim()}</Text> : null}
          {falta.length > 0 && <Nota>{t('music.reviewMissing', { lista: formato.lista(falta.map((f) => t(`music.missing_${f}`))) })}</Nota>}
          <Nota>{t('music.costUnknown')}</Nota>
        </Tarjeta>
      )}

      {/* Lo que queda a mano: el borrador y el ejemplo de diseño, cada uno con su etiqueta. */}
      <View style={s.fila}>
        <TouchableOpacity accessibilityRole="button" onPress={guardar} style={s.enlace} hitSlop={8}>
          <Ionicons name="bookmark-outline" size={scale(16)} color={theme.colors.accentDark} />
          <Text style={[s.enlaceTexto, { color: theme.colors.accentDark }]}>{guardado ? t('music.draftSaved') : t('music.saveDraft')}</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" onPress={cargarBorrador} style={s.enlace} hitSlop={8}>
          <Ionicons name="reader-outline" size={scale(16)} color={theme.colors.accentDark} />
          <Text style={[s.enlaceTexto, { color: theme.colors.accentDark }]}>{t('music.startDraft')}</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" onPress={onVerEjemplo} style={s.enlace} hitSlop={8}>
          <Ionicons name="eye-outline" size={scale(16)} color={theme.colors.accentDark} />
          <Text style={[s.enlaceTexto, { color: theme.colors.accentDark }]}>{t('music.viewExample')}</Text>
        </TouchableOpacity>
      </View>
      <Nota>{t('music.draftNote')}</Nota>

      {/* La intención estructurada queda lista para la generación cuando exista; hoy no sale de esta pantalla. */}
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ height: 0 }} testID={`music-intencion-${intencion.punto}`} />
    </View>
  );
};

const s = StyleSheet.create({
  raiz: { gap: SPACING.md },
  lamina: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, padding: 16, gap: 14 },
  cabecera: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  modos: { flexDirection: 'row', flexWrap: 'wrap', borderRadius: 999, padding: 3 },
  modosMovil: { width: '100%', flexWrap: 'nowrap' },
  modoMovil: { flexGrow: 1, paddingHorizontal: 4 },
  modo: { minHeight: 34, paddingHorizontal: 12, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  modoTexto: { fontSize: 13 },
  activo: { fontWeight: '600' },
  pestanasFila: { flexDirection: 'row', flexWrap: 'wrap', borderBottomWidth: StyleSheet.hairlineWidth, columnGap: 4 },
  pestana: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 42, paddingHorizontal: 10, borderBottomWidth: 2, marginBottom: -StyleSheet.hairlineWidth },
  pestanaTexto: { fontSize: 13 },
  pestanasRejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  azulejo: { flexGrow: 1, flexBasis: '30%', minHeight: 64, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', gap: 4, padding: 6 },
  bloque: { gap: 8 },
  pieDeCaja: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  sub: { fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  abiertas: { paddingTop: 2 },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filas: { borderTopWidth: StyleSheet.hairlineWidth },
  aviso: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 12 },
  avisoTextos: { flex: 1, minWidth: 0, gap: 6 },
  transformacion: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
  nombre: { fontSize: 14, fontWeight: '600' },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flexWrap: 'wrap' },
  linea: { fontSize: FONT_SIZE.base, lineHeight: scale(22) },
  enlace: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 36 },
  enlaceTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
});

export default MusicComposer;
