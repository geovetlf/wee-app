import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../contexts/ThemeContext';
import { useIdioma } from '../../contexts/IdiomaContext';
import { nombreDelIdioma } from '../../i18n/formato';
import { useBrainChat } from '../../hooks/useBrainChat';
import CajaDePrompt from '../creator/CajaDePrompt';
import MelodiaDeReferencia, { ReferenciaElegida } from './MelodiaDeReferencia';
import { Boton, Chip, ChipDeEstado, Nota, Tarjeta, TituloDeBloque } from './piezas';
import {
  AVANZADAS_DE_MUSIC, GRUPOS_DE_MUSIC, IDIOMAS_DE_CANCION, MAX_DESCRIPCION, MAX_LETRA, PUNTOS_DE_PARTIDA, PuntoDePartidaId,
  SELECCION_VACIA_MUSIC, SeleccionDeMusic, alternarOpcionMusic, crearIntencionMusic, hayEleccionMusic, puntoDePartida, queFaltaMusic,
} from '../../constants/musicComposer';
import { MUSIC_GENERACION_VALIDADA, capacidadDeMusic, capacidadUsable } from '../../constants/musicCapabilities';
import { EstadoDeCapa } from '../../utils/musicModel';
import { CLAVE_DE_BORRADOR_MUSIC, armarBriefMusic, leerBorrador, serializarBorrador } from '../../utils/musicBrief';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

interface Props {
  puntoInicial?: PuntoDePartidaId;
  onVolver: () => void;
  onVerEjemplo: () => void;
  inicial?: { texto?: string };
}

const EJEMPLOS = ['example1', 'example2', 'example3'] as const;

/**
 * EL COMPOSER DE WEË MUSIC (v0).
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
const MusicComposer: React.FC<Props> = ({ puntoInicial = 'idea', onVolver, onVerEjemplo, inicial }) => {
  const { theme } = useTheme();
  const { t, formato, locale } = useIdioma();
  const navigation = useNavigation<any>();
  const chat = useBrainChat();

  const [punto, setPunto] = useState<PuntoDePartidaId>(puntoInicial);
  const [descripcion, setDescripcion] = useState(inicial?.texto ?? '');
  const [letra, setLetra] = useState('');
  const [sel, setSel] = useState<SeleccionDeMusic>(SELECCION_VACIA_MUSIC);
  const [referencia, setReferencia] = useState<ReferenciaElegida | null>(null);
  const [avanzadas, setAvanzadas] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [pidio, setPidio] = useState(false);
  const desde = useRef(0);

  /* «Continuar borrador» (y el arranque, si ya hay uno) lee el borrador local: solo texto y elecciones. */
  const cargarBorrador = useCallback(async () => {
    try {
      const b = leerBorrador(await AsyncStorage.getItem(CLAVE_DE_BORRADOR_MUSIC));
      if (!b) return false;
      setPunto(b.punto === 'draft' ? 'idea' : b.punto);
      setDescripcion(b.descripcion);
      setLetra(b.letra);
      setSel(b.sel);
      return true;
    } catch { return false; }
  }, []);

  useEffect(() => { if (puntoInicial === 'draft') cargarBorrador(); }, [puntoInicial, cargarBorrador]);

  const info = puntoDePartida(punto)!;
  const falta = queFaltaMusic(punto, descripcion, letra, !!referencia);
  const intencion = useMemo(
    () => crearIntencionMusic(punto, sel, descripcion, letra, referencia ? { origen: referencia.origen, duracionSec: referencia.duracionSec } : undefined),
    [punto, sel, descripcion, letra, referencia],
  );

  const pedirAyuda = useCallback(async () => {
    if (!chat.user) { navigation.navigate('Login'); return; }
    if (chat.busy) return;
    const brief = armarBriefMusic({ t, lista: (xs) => formato.lista(xs) }, punto, sel, descripcion, letra);
    desde.current = chat.messages.length;
    setPidio(true);
    await chat.send(brief);
  }, [chat, navigation, t, formato, punto, sel, descripcion, letra]);

  const guardar = useCallback(async () => {
    try {
      await AsyncStorage.setItem(CLAVE_DE_BORRADOR_MUSIC, serializarBorrador({ punto, descripcion, letra, sel }));
      setGuardado(true);
    } catch { setGuardado(false); }
  }, [punto, descripcion, letra, sel]);
  useEffect(() => { setGuardado(false); }, [punto, descripcion, letra, sel]);

  const respuestas = pidio ? chat.messages.slice(desde.current).filter((m) => m.role === 'wee') : [];
  const ultima = respuestas[respuestas.length - 1];

  const lineas = GRUPOS_DE_MUSIC.flatMap((g) => {
    const ids = sel.elegidas[g.id] ?? [];
    const textos = ids.map((id) => g.opciones.find((o) => o.id === id)).filter(Boolean).map((o) => t(`music.${o!.clave}`));
    return textos.length ? [t('music.reviewLine', { grupo: t(`music.${g.claveTitulo}`), valor: formato.lista(textos) })] : [];
  });
  if (sel.idioma) lineas.push(t('music.reviewLine', { grupo: t('music.groupLanguage'), valor: nombreDelIdioma(sel.idioma, locale) }));
  if (sel.idk) lineas.push(t('music.idk'));

  const estadoGenerar: EstadoDeCapa = !MUSIC_GENERACION_VALIDADA ? 'pendienteIntegracion' : falta.length ? 'borrador' : 'preparado';

  return (
    <View style={s.raiz}>
      <TouchableOpacity accessibilityRole="button" onPress={onVolver} style={s.volver} hitSlop={8}>
        <Ionicons name="chevron-back" size={scale(18)} color={theme.colors.accentDark} />
        <Text style={[s.volverTexto, { color: theme.colors.accentDark }]}>{t('music.backToMusic')}</Text>
      </TouchableOpacity>

      <TituloDeBloque>{t('music.composerTitle')}</TituloDeBloque>

      {/* 1. Punto de partida */}
      <Text style={[s.sub, { color: theme.colors.textSecondary }]}>{t('music.startTitle')}</Text>
      <View style={s.chips} accessibilityRole="radiogroup">
        {PUNTOS_DE_PARTIDA.map((p) => (
          <Chip key={p.id} texto={t(`music.${p.claveTitulo}`)} activo={p.id === punto} onPress={() => (p.id === 'draft' ? cargarBorrador() : setPunto(p.id))} />
        ))}
      </View>
      <Nota>{t(`music.${info.claveAyuda}`)}</Nota>

      {/* 2. Audio, si el punto de partida lo pide */}
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

      {/* 3. Descripción (la caja común de Weë AI: crece sola y no pierde sus botones) */}
      <TituloDeBloque>{t('music.describeTitle')}</TituloDeBloque>
      <CajaDePrompt
        valor={descripcion}
        onCambiar={(x) => setDescripcion(x.slice(0, MAX_DESCRIPCION))}
        onEnviar={pedirAyuda}
        etiquetaEnviar={t('music.helpMe')}
        placeholder={t('music.describeHint')}
        ocupado={chat.busy}
      />
      <Nota>{t('music.counter', { cuenta: formato.numero(descripcion.length), maximo: formato.numero(MAX_DESCRIPCION) })}</Nota>
      <View style={s.chips}>
        {EJEMPLOS.map((e) => <Chip key={e} texto={t(`music.${e}`)} onPress={() => setDescripcion(t(`music.${e}`).slice(0, MAX_DESCRIPCION))} />)}
      </View>

      {/* Letra propia */}
      {punto === 'lyrics' && (
        <View style={{ gap: SPACING.sm }}>
          <TituloDeBloque>{t('music.lyricsTitle')}</TituloDeBloque>
          <CajaDePrompt
            valor={letra}
            onCambiar={(x) => setLetra(x.slice(0, MAX_LETRA))}
            onEnviar={guardar}
            etiquetaEnviar={t('music.saveDraft')}
            placeholder={t('music.lyricsHint')}
          />
          <Nota>{t('music.counter', { cuenta: formato.numero(letra.length), maximo: formato.numero(MAX_LETRA) })}</Nota>
        </View>
      )}

      {/* 4. Parámetros contextuales: sugerencias, ninguna obligatoria */}
      <TituloDeBloque>{t('music.optionsTitle')}</TituloDeBloque>
      {GRUPOS_DE_MUSIC.map((g) => {
        if (g.id === 'voice' && punto === 'instrumental') return null;
        return (
          <View key={g.id} style={{ gap: SPACING.xs }}>
            <Text style={[s.sub, { color: theme.colors.textSecondary }]}>{t(`music.${g.claveTitulo}`)}</Text>
            <View style={s.chips}>
              {g.opciones.map((o) => (
                <Chip key={o.id} texto={t(`music.${o.clave}`)} activo={sel.elegidas[g.id]?.includes(o.id)} onPress={() => setSel((x) => alternarOpcionMusic(x, g, o.id))} />
              ))}
            </View>
          </View>
        );
      })}
      <View style={{ gap: SPACING.xs }}>
        <Text style={[s.sub, { color: theme.colors.textSecondary }]}>{t('music.groupLanguage')}</Text>
        <View style={s.chips}>
          {IDIOMAS_DE_CANCION.map((c) => (
            <Chip key={c} texto={nombreDelIdioma(c, locale)} activo={sel.idioma === c} onPress={() => setSel((x) => ({ ...x, idioma: x.idioma === c ? undefined : c }))} />
          ))}
        </View>
      </View>
      <Chip texto={t('music.idk')} activo={sel.idk} onPress={() => setSel((x) => ({ ...x, idk: !x.idk }))} />

      {/* Avanzadas progresivas */}
      <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: avanzadas }} onPress={() => setAvanzadas((v) => !v)} style={s.volver} hitSlop={8}>
        <Ionicons name={avanzadas ? 'chevron-up' : 'chevron-down'} size={scale(18)} color={theme.colors.accentDark} />
        <Text style={[s.volverTexto, { color: theme.colors.accentDark }]}>{t(avanzadas ? 'music.advancedHide' : 'music.advancedShow')}</Text>
      </TouchableOpacity>
      {avanzadas && (
        <Tarjeta>
          {AVANZADAS_DE_MUSIC.map((a) => (
            <View key={a.id} style={{ gap: 2 }}>
              <View style={s.fila}>
                <Text style={[s.linea, { color: theme.colors.text, flex: 1 }]}>{t(`music.${a.claveTitulo}`)}</Text>
                <ChipDeEstado estado={capacidadUsable(a.capacidad) ? 'preparado' : capacidadDeMusic(a.capacidad).estado === 'pendiente' ? 'noCompatible' : 'pendienteIntegracion'} />
              </View>
              <Nota>{t(`music.${a.claveAyuda}`)}</Nota>
            </View>
          ))}
        </Tarjeta>
      )}

      {/* 5. Resumen */}
      <Tarjeta>
        <TituloDeBloque>{t('music.reviewTitle')}</TituloDeBloque>
        {hayEleccionMusic(sel) || descripcion.trim() || letra.trim() || referencia ? (
          <>
            <Text style={[s.linea, { color: theme.colors.text }]}>{t(`music.${info.claveTitulo}`)}</Text>
            {lineas.map((l) => <Text key={l} style={[s.linea, { color: theme.colors.text }]}>{l}</Text>)}
            {referencia ? <Text style={[s.linea, { color: theme.colors.text }]}>{t(referencia.origen === 'grabada' ? 'music.reviewRefRecorded' : 'music.reviewRefUploaded')}</Text> : null}
            {descripcion.trim() ? <Text style={[s.linea, { color: theme.colors.text }]} numberOfLines={3}>{descripcion.trim()}</Text> : null}
          </>
        ) : (
          <Nota>{t('music.reviewEmpty')}</Nota>
        )}
        {falta.length > 0 && <Nota>{t('music.reviewMissing', { lista: formato.lista(falta.map((f) => t(`music.missing_${f}`))) })}</Nota>}
        <Nota>{t('music.costUnknown')}</Nota>
      </Tarjeta>

      {/* 6. Qué puede hacer Weë ahora, con su nombre */}
      <Tarjeta>
        <View style={s.fila}>
          <Ionicons name="checkmark-circle" size={scale(18)} color={theme.colors.success} />
          <Text style={[s.linea, { color: theme.colors.text, flex: 1 }]}>{t('music.statusGuidance')}</Text>
        </View>
        <View style={s.fila}>
          <Ionicons name={MUSIC_GENERACION_VALIDADA ? 'checkmark-circle' : 'time-outline'} size={scale(18)} color={MUSIC_GENERACION_VALIDADA ? theme.colors.success : theme.colors.warning} />
          <Text style={[s.linea, { color: theme.colors.text, flex: 1 }]}>{t('music.statusGenerate')}</Text>
        </View>
        {!MUSIC_GENERACION_VALIDADA && <Nota>{t('music.statusGenerateHelp')}</Nota>}
      </Tarjeta>

      <View style={s.botones}>
        <Boton texto={t('music.helpMeButton')} icono="sparkles-outline" onPress={pedirAyuda} desactivado={chat.busy} />
        <Boton
          texto={t('music.generate')}
          icono="musical-notes"
          principal
          desactivado={!MUSIC_GENERACION_VALIDADA || falta.length > 0}
          motivo={!MUSIC_GENERACION_VALIDADA ? t('music.generatePendingMotive') : undefined}
        />
      </View>
      <View style={s.fila}><ChipDeEstado estado={estadoGenerar} /><ChipDeEstado estado="costeDesconocido" /></View>

      <View style={s.botones}>
        <TouchableOpacity accessibilityRole="button" onPress={guardar} style={s.volver} hitSlop={8}>
          <Ionicons name="bookmark-outline" size={scale(16)} color={theme.colors.accentDark} />
          <Text style={[s.volverTexto, { color: theme.colors.accentDark }]}>{guardado ? t('music.draftSaved') : t('music.saveDraft')}</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" onPress={onVerEjemplo} style={s.volver} hitSlop={8}>
          <Ionicons name="eye-outline" size={scale(16)} color={theme.colors.accentDark} />
          <Text style={[s.volverTexto, { color: theme.colors.accentDark }]}>{t('music.viewExample')}</Text>
        </TouchableOpacity>
      </View>
      <Nota>{t('music.draftNote')}</Nota>

      {/* Resultado real de la orientación, o su estado real */}
      {chat.busy && (
        <View style={s.fila} accessibilityLiveRegion="polite">
          <ActivityIndicator color={theme.colors.accentDark} />
          <Text style={[s.linea, { color: theme.colors.textSecondary }]}>{t('music.helpBusy')}</Text>
        </View>
      )}
      {!chat.busy && pidio && chat.error ? <Text accessibilityLiveRegion="assertive" style={[s.linea, { color: theme.colors.error }]}>{chat.error}</Text> : null}
      {!chat.busy && ultima && (
        <Tarjeta>
          <View accessibilityLiveRegion="polite" style={{ gap: SPACING.xs }}>
            <TituloDeBloque>{t('music.adviceTitle')}</TituloDeBloque>
            <Text selectable style={[s.linea, { color: theme.colors.text }]}>{ultima.text}</Text>
            {ultima.demo ? <Nota>{t('music.statusDemo')}</Nota> : <Nota>{ultima.credits ? t('music.adviceCost', { credits: ultima.credits }) : t('music.adviceFree')}</Nota>}
          </View>
        </Tarjeta>
      )}
      {/* La intención estructurada queda lista para la generación cuando exista; hoy no sale de esta pantalla. */}
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ height: 0 }} testID={`music-intencion-${intencion.punto}`} />
    </View>
  );
};

const s = StyleSheet.create({
  raiz: { gap: SPACING.md, paddingBottom: SPACING.xxxl },
  volver: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start', minHeight: scale(40) },
  volverTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
  sub: { fontSize: FONT_SIZE.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  fila: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flexWrap: 'wrap' },
  linea: { fontSize: FONT_SIZE.base, lineHeight: scale(22) },
  botones: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, alignItems: 'center' },
});

export default MusicComposer;
