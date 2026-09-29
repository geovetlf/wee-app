import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useIdioma } from '../../../contexts/IdiomaContext';
import CampoQueCrece from '../../creator/CampoQueCrece';
import ProductionShotGeneration from './ProductionShotGeneration';
import ProductionRecommendations from './ProductionRecommendations';
import { BotonPequeno, Seccion } from './ProductionPiezas';
import { claveDelValor, FAMILIAS_DE_CAMARA } from '../../../constants/camaraCinematica';
import { AJUSTES_DE_SONIDO_CERRADOS, CLAVE_DE_TRANSICION, CLAVE_DEL_CLIMA, CLAVE_DEL_MOMENTO, DURACIONES_DE_SONIDO, NIVELES_DE_SONIDO, PASO_DE_DURACION_SEC, TIPOS_DE_LINEA } from '../../../constants/filmmaker';
import { CLIMAS, LIMITES, MOMENTOS_DEL_DIA, valorCreativo } from '../../../services/filmmaker/dominio';
import type { AudioCue, AudioTarget, CreativeParameterPath, DialogueLine, FilmmakerOperation, LightingType, MotionSpeed, TimeOfDay, TransitionType, Weather } from '../../../services/filmmaker/dominio';
import { EspacioDeFilmmaker, elegidoDe } from './espacio';
import type { Montaje } from '../../../utils/montajeDeProduccion';
import { confirmAction } from '../../../utils/notify';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, OPACITY } from '../../../constants/design';
import { scale } from '../../../utils/scale';

const isWeb = Platform.OS === 'web';

/** Las herramientas del montaje. El mismo juego en la línea de tiempo del escritorio y en las hojas del teléfono. */
export type IdDeHerramienta = 'cortar' | 'velocidad' | 'audio' | 'texto' | 'efectos' | 'color' | 'transiciones' | 'subtitulos' | 'ia';

export const HERRAMIENTAS: readonly { id: IdDeHerramienta; clave: string; icono: string }[] = [
  { id: 'cortar', clave: 'filmmaker.wsToolSplit', icono: 'cut-outline' },
  { id: 'velocidad', clave: 'filmmaker.wsToolSpeed', icono: 'speedometer-outline' },
  { id: 'audio', clave: 'filmmaker.audio', icono: 'musical-notes-outline' },
  { id: 'texto', clave: 'filmmaker.wsToolText', icono: 'text-outline' },
  { id: 'efectos', clave: 'filmmaker.wsToolEffects', icono: 'sparkles-outline' },
  { id: 'color', clave: 'filmmaker.wsToolColor', icono: 'color-filter-outline' },
  { id: 'transiciones', clave: 'filmmaker.wsToolTransitions', icono: 'git-compare-outline' },
  { id: 'subtitulos', clave: 'filmmaker.wsToolSubtitles', icono: 'chatbox-ellipses-outline' },
  { id: 'ia', clave: 'filmmaker.wsToolAi', icono: 'bulb-outline' },
];

const VELOCIDADES: readonly MotionSpeed[] = ['slow', 'normal', 'fast'];
const TIPOS_DE_SONIDO: readonly { kind: AudioCue['kind']; clave: string }[] = [
  { kind: 'ambience', clave: 'filmmaker.audioAmbience' },
  { kind: 'music', clave: 'filmmaker.audioMusic' },
  { kind: 'sfx', clave: 'filmmaker.audioSfx' },
];
const MODOS_DE_SUBTITULO: readonly { modo: 'none' | 'burned' | 'sidecar'; clave: string }[] = [
  { modo: 'none', clave: 'filmmaker.wsSubtitlesNone' },
  { modo: 'burned', clave: 'filmmaker.wsSubtitlesBurned' },
  { modo: 'sidecar', clave: 'filmmaker.wsSubtitlesSidecar' },
];

/** Una fila de opciones de las que se elige una; tocar la elegida la quita. */
const Opciones: React.FC<{
  opciones: readonly { valor: string; texto: string }[];
  elegida?: string | null;
  editable: boolean;
  onElegir: (valor: string | null) => void;
  sinQuitar?: boolean;
  /** Fase 25 del motor: el grupo con el que se anuncia cada opción, cuando hay varias filas iguales. */
  grupo?: string;
}> = ({ opciones, elegida, editable, onElegir, sinQuitar, grupo }) => {
  const { theme } = useTheme();
  const { t } = useIdioma();
  return (
    <View style={styles.opciones}>
      {opciones.map((o) => {
        const esta = o.valor === elegida;
        return (
          <TouchableOpacity
            key={o.valor}
            onPress={() => onElegir(esta && !sinQuitar ? null : o.valor)}
            disabled={!editable}
            accessibilityRole="button"
            accessibilityLabel={grupo ? t('filmmaker.wsSettingIs', { ajuste: grupo, valor: o.texto }) : o.texto}
            accessibilityState={{ selected: esta, disabled: !editable }}
            style={[
              styles.opcion,
              { backgroundColor: esta ? theme.colors.accent : theme.colors.surface, borderColor: esta ? theme.colors.accent : theme.colors.border },
              !editable && { opacity: OPACITY.disabled },
              isWeb && ({ cursor: editable ? 'pointer' : 'default' } as object),
            ]}
          >
            <Text style={[styles.opcionTexto, { color: esta ? '#1F2937' : theme.colors.text }]} numberOfLines={1}>{o.texto}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

/**
 * UNA HERRAMIENTA DEL MONTAJE, CON LO QUE DE VERDAD HACE.
 *
 * Cada una es una o varias operaciones de F1-A sobre lo elegido —dividir en el
 * cabezal, alargar, la velocidad del movimiento de cámara, un sonido, una línea,
 * el clima de la escena, la luz, los subtítulos de la entrega— y se guarda como
 * cualquier otro gesto. Las transiciones también, desde la Fase 25 del motor: F1-A
 * ya las guardaba (`change_transition`) y el montaje final ya las usaba, y aquí
 * se decía que «llegarían». Nada de botones que no hacen nada.
 *
 * Nada de esto renderiza vídeo: es la dirección del montaje. El vídeo de cada
 * plano lo genera su toma.
 */
const ProductionTools: React.FC<{
  herramienta: IdDeHerramienta;
  espacio: EspacioDeFilmmaker;
  montaje: Montaje;
  /** Dónde está el cabezal, en segundos desde el principio. */
  cabezal: number;
  ids: { sonido: () => string; linea: () => string };
}> = ({ herramienta, espacio, montaje, cabezal, ids }) => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const { produccion, seleccion, editable, onGesto, onSeleccionar, toma, recomendaciones, rechazadas, onRechazar } = espacio;
  const elegido = elegidoDe(produccion, seleccion);
  const plano = elegido?.plano;
  const [tipoDeSonido, setTipoDeSonido] = useState<AudioCue['kind']>('ambience');
  const [tipoDeLinea, setTipoDeLinea] = useState<DialogueLine['kind']>('dialogue');
  /* Quién dice la línea nueva (Fase 22 del motor, arreglo R12): lo elige la persona, nunca se supone. */
  const [hablante, setHablante] = useState<string | null>(null);
  /* Tras añadir, el campo vuelve a empezar vacío: se monta de nuevo. */
  const [vuelta, setVuelta] = useState(0);
  /* Fase 25 del motor: dónde suena el sonido nuevo. Sin elegir, en el plano elegido o, sin plano, en toda la producción. */
  const [alcance, setAlcance] = useState<'plano' | 'escena' | 'produccion' | null>(null);

  const nota = (texto: string) => <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{texto}</Text>;
  const sinPlano = nota(t('filmmaker.wsPickShotFirst'));

  switch (herramienta) {
    case 'cortar': {
      if (!plano || !elegido) return sinPlano;
      const tramo = montaje.video.find((v) => v.shotId === plano.id);
      const duracion = plano.durationSec;
      const enElCabezal = tramo && duracion !== undefined ? Math.round((cabezal - tramo.inicio) * 10) / 10 : undefined;
      const cabeDentro = (s: number | undefined) => s !== undefined && duracion !== undefined && s >= LIMITES.duracionMinimaSec && duracion - s >= LIMITES.duracionMinimaSec;
      const mitad = duracion !== undefined ? Math.round((duracion / 2) * 10) / 10 : undefined;
      const quitar = async () => {
        const ok = await confirmAction(t('filmmaker.removeShotConfirm', { numero: elegido.numeroDePlano ?? 1 }), '', t('filmmaker.remove'), true, t);
        if (!ok) return;
        const r = onGesto([{ op: 'remove_shot', shotId: plano.id }]);
        if (!r.ok && r.problems.some((p) => p.code === 'operation_blocked')) {
          if (await confirmAction(t('filmmaker.removeShotConfirm', { numero: elegido.numeroDePlano ?? 1 }), t('filmmaker.removeAlsoLinked'), t('filmmaker.remove'), true, t)) {
            if (onGesto([{ op: 'remove_shot', shotId: plano.id, cascade: true }]).ok) onSeleccionar(null);
          }
          return;
        }
        if (r.ok) onSeleccionar(null);
      };
      return (
        <View style={styles.fila}>
          <BotonPequeno icono="cut-outline" etiqueta={t('filmmaker.wsSplitAtPlayhead')} conTexto principal disabled={!editable || !cabeDentro(enElCabezal)}
            onPress={() => { if (enElCabezal !== undefined) onGesto([{ op: 'split_shot', shotId: plano.id, atSec: enElCabezal, newShotId: espacio.ids.plano() }]); }} />
          <BotonPequeno icono="git-compare-outline" etiqueta={t('filmmaker.splitShot')} conTexto disabled={!editable || !cabeDentro(mitad)}
            onPress={() => { if (mitad !== undefined) onGesto([{ op: 'split_shot', shotId: plano.id, atSec: mitad, newShotId: espacio.ids.plano() }]); }} />
          <BotonPequeno icono="copy-outline" etiqueta={t('filmmaker.duplicate')} conTexto disabled={!editable}
            onPress={() => onGesto([{ op: 'duplicate_shot', shotId: plano.id, newShotId: espacio.ids.plano() }])} />
          <BotonPequeno icono="remove" etiqueta={t('filmmaker.shorterBy', { segundos: PASO_DE_DURACION_SEC })} disabled={!editable || duracion === undefined}
            onPress={() => onGesto([{ op: 'shorten_duration', target: { shotId: plano.id }, bySec: PASO_DE_DURACION_SEC }])} />
          <BotonPequeno icono="add" etiqueta={t('filmmaker.longerBy', { segundos: PASO_DE_DURACION_SEC })} disabled={!editable || duracion === undefined}
            onPress={() => onGesto([{ op: 'extend_duration', target: { shotId: plano.id }, bySec: PASO_DE_DURACION_SEC }])} />
          <BotonPequeno icono="trash-outline" etiqueta={t('filmmaker.removeShot')} disabled={!editable} onPress={() => { void quitar(); }} />
          {!cabeDentro(enElCabezal) && nota(t('filmmaker.wsSplitHint'))}
        </View>
      );
    }

    case 'velocidad': {
      if (!plano) return sinPlano;
      const actual = valorCreativo(plano.visual?.creative, 'movement.speed' as CreativeParameterPath);
      return (
        <View style={styles.bloque}>
          {nota(t('filmmaker.wsSpeedText'))}
          <Opciones
            opciones={VELOCIDADES.map((v) => ({ valor: v, texto: t(claveDelValor('movement.speed', v) ?? 'filmmaker.wsToolSpeed') }))}
            elegida={typeof actual === 'string' ? actual : null}
            editable={editable}
            onElegir={(v) => onGesto([{ op: 'change_movement', target: { scope: 'shot', shotId: plano.id }, speed: v as MotionSpeed | null }])}
          />
        </View>
      );
    }

    case 'audio': {
      /*
       * EL SONIDO, POR NIVELES (Fase 25 del motor). Del plano o de la escena elegida, su sonido PROPIO —el que el vídeo
       * trae generado con la imagen (`audio.withSound`)— y lo que tiene que sonar (`audio.notes`); y los sonidos descritos
       * del plan —ambiente, música, efectos—, cada uno donde suena (el plano, la escena o toda la producción) y con su
       * nivel en la mezcla (`volume`, de 0 a 1). Y la verdad: el sonido propio llega a la toma —se cotiza con él— y al
       * montaje; los descritos se guardan, pero todavía no se mezclan, porque generar música y efectos sigue cerrado.
       */
      const suyos = produccion.audio.cues;
      const escena = elegido?.escena;
      const audioAqui = plano ? plano.audio : escena?.audio;
      const deLaEscena = plano && plano.audio?.withSound === undefined ? escena?.audio?.withSound : undefined;
      const cambiarAudio = (cambios: { withSound?: boolean | null; notes?: string | null }) => {
        if (!escena) return;
        const nuevo: Record<string, unknown> = { ...(audioAqui ?? {}) };
        for (const [k, v] of Object.entries(cambios)) { if (v === null) delete nuevo[k]; else if (v !== undefined) nuevo[k] = v; }
        const audio = Object.keys(nuevo).length ? nuevo : null;
        onGesto([plano
          ? { op: 'update_shot', shotId: plano.id, changes: { audio } } as FilmmakerOperation
          : { op: 'update_scene', sceneId: escena.id, changes: { audio } } as FilmmakerOperation]);
      };
      const nivel = (c: AudioCue, v: number | null) => {
        const { volume: _antes, ...sinNivel } = c;
        void _antes;
        onGesto([{ op: 'modify_audio', change: { action: 'upsert', cue: v === null ? sinNivel : { ...c, volume: v } } }]);
      };
      /* Fase 37: cuánto dura (`durationSec`, de F1-A); sin elegir, lo que dure su tramo. */
      const duracionDelSonido = (c: AudioCue, v: number | null) => {
        const { durationSec: _antes, ...sinDuracion } = c;
        void _antes;
        onGesto([{ op: 'modify_audio', change: { action: 'upsert', cue: v === null ? sinDuracion : { ...c, durationSec: v } } }]);
      };
      const numeroDeEscena = (id: string) => produccion.scenes.findIndex((s) => s.id === id) + 1;
      const numeroDePlano = (id: string) => {
        for (const s of produccion.scenes) { const j = s.shots.findIndex((p) => p.id === id); if (j >= 0) return j + 1; }
        return 0;
      };
      const dondeSuena = (c: AudioCue) => (c.target.scope === 'shot'
        ? t('filmmaker.wsCueScopeShot', { numero: numeroDePlano(c.target.shotId) })
        : c.target.scope === 'scenes'
          ? (c.target.sceneIds.length === 1
            ? t('filmmaker.wsCueScopeScene', { numero: numeroDeEscena(c.target.sceneIds[0]) })
            : t('filmmaker.wsCueScopeScenes', { lista: formato.lista(c.target.sceneIds.map((id) => String(numeroDeEscena(id)))) }))
          : t('filmmaker.wsCueScopeProduction'));
      const alcanceElegido = alcance && (alcance !== 'plano' || plano) && (alcance !== 'escena' || escena) ? alcance : plano ? 'plano' : 'produccion';
      const objetivo: AudioTarget = alcanceElegido === 'plano' && plano ? { scope: 'shot', shotId: plano.id }
        : alcanceElegido === 'escena' && escena ? { scope: 'scenes', sceneIds: [escena.id] }
          : { scope: 'production' };
      const alcances = [
        ...(plano ? [{ valor: 'plano', texto: t('filmmaker.wsCueInShot') }] : []),
        ...(escena ? [{ valor: 'escena', texto: t('filmmaker.wsCueInScene') }] : []),
        { valor: 'produccion', texto: t('filmmaker.wsCueInProduction') },
      ];
      return (
        <View style={styles.bloque}>
          {!!escena && (
            <Seccion titulo={t(plano ? 'filmmaker.wsSoundOfShot' : 'filmmaker.wsSoundOfScene')}>
              <Opciones
                grupo={t('filmmaker.wsNativeSound')}
                opciones={[{ valor: 'si', texto: t('filmmaker.takeWithSound') }, { valor: 'no', texto: t('filmmaker.takeWithoutSound') }]}
                elegida={audioAqui?.withSound === true ? 'si' : audioAqui?.withSound === false ? 'no' : null}
                editable={editable}
                onElegir={(v) => cambiarAudio({ withSound: v === null ? null : v === 'si' })}
              />
              {deLaEscena !== undefined && nota(t('filmmaker.wsNativeSoundInherited', { valor: t(deLaEscena ? 'filmmaker.takeWithSound' : 'filmmaker.takeWithoutSound') }))}
              {nota(t('filmmaker.wsNativeSoundNote'))}
              <CampoQueCrece
                etiqueta={t('filmmaker.wsSoundNotes')}
                valor={audioAqui?.notes ?? ''}
                placeholder={t('filmmaker.wsSoundNotesHint')}
                maximo={LIMITES.frase}
                etiquetaGuardar={t('common.save')}
                editable={editable}
                onGuardar={(texto) => cambiarAudio({ notes: texto.trim() || null })}
              />
            </Seccion>
          )}
          {suyos.length === 0 && nota(t('filmmaker.wsNoCues'))}
          {suyos.map((c) => (
            <View key={c.id} style={[styles.elementoColumna, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
              <View style={styles.elementoFila}>
                <Ionicons name={c.kind === 'music' ? 'musical-notes-outline' : c.kind === 'sfx' ? 'flash-outline' : 'leaf-outline'} size={scale(15)} color={theme.colors.accent} />
                <View style={styles.lineaTextos}>
                  <Text style={[styles.elementoTexto, { color: theme.colors.text }]} numberOfLines={2}>{c.description}</Text>
                  <Text style={[styles.hablante, { color: theme.colors.textSecondary }]} numberOfLines={1}>{dondeSuena(c)}</Text>
                </View>
                {editable && (
                  <BotonPequeno icono="trash-outline" etiqueta={t('filmmaker.wsRemoveCue', { sonido: c.description })} onPress={() => onGesto([{ op: 'modify_audio', change: { action: 'remove', cueId: c.id } }])} />
                )}
              </View>
              <Opciones
                grupo={t('filmmaker.wsCueVolumeOf', { sonido: c.description })}
                opciones={NIVELES_DE_SONIDO.map((v) => ({ valor: String(v), texto: formato.numero(v, { style: 'percent' }) }))}
                elegida={c.volume !== undefined ? String(c.volume) : null}
                editable={editable}
                onElegir={(v) => nivel(c, v === null ? null : Number(v))}
              />
              <Opciones
                grupo={t('filmmaker.wsCueDurationOf', { sonido: c.description })}
                opciones={DURACIONES_DE_SONIDO.map((v) => ({ valor: String(v), texto: t('filmmaker.wsSecondsShort', { segundos: formato.numero(v) }) }))}
                elegida={c.durationSec !== undefined ? String(c.durationSec) : null}
                editable={editable}
                onElegir={(v) => duracionDelSonido(c, v === null ? null : Number(v))}
              />
              {c.durationSec === undefined && nota(t('filmmaker.wsCueDurationDefault'))}
              {/* Fase 37: lo que F1-A todavía no tiene, visible y cerrado, con su porqué. */}
              <View style={styles.cerrados}>
                {AJUSTES_DE_SONIDO_CERRADOS.map((clave) => (
                  <View key={clave} style={[styles.cerrado, { borderColor: theme.colors.border }]} accessibilityRole="text" accessibilityLabel={t('filmmaker.wsCueSettingSoon', { ajuste: t(clave) })}>
                    <Text style={[styles.cerradoTexto, { color: theme.colors.textSecondary }]}>{t(clave)}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
          {suyos.length > 0 && nota(t('filmmaker.wsCueMixSoon'))}
          {editable && (
            <Seccion titulo={t('filmmaker.wsAddCue')}>
              <Opciones opciones={TIPOS_DE_SONIDO.map((s) => ({ valor: s.kind, texto: t(s.clave) }))} elegida={tipoDeSonido} editable onElegir={(v) => { if (v) setTipoDeSonido(v as AudioCue['kind']); }} sinQuitar />
              <Opciones grupo={t('filmmaker.wsCueWhere')} opciones={alcances} elegida={alcanceElegido} editable onElegir={(v) => { if (v) setAlcance(v as 'plano' | 'escena' | 'produccion'); }} sinQuitar />
              <CampoQueCrece
                key={`sonido-${vuelta}`}
                etiqueta={t('filmmaker.wsCueDescription')}
                valor=""
                placeholder={t('filmmaker.wsCuePlaceholder')}
                maximo={LIMITES.linea}
                etiquetaGuardar={t('filmmaker.wsAddCue')}
                onGuardar={(texto) => {
                  if (!texto.trim()) return;
                  onGesto([{ op: 'modify_audio', change: { action: 'upsert', cue: {
                    id: ids.sonido(), kind: tipoDeSonido, description: texto.trim(), target: objetivo,
                  } } }]);
                  setVuelta((v) => v + 1);
                }}
              />
            </Seccion>
          )}
          {nota(t('filmmaker.wsCuesNotMixed'))}
        </View>
      );
    }

    case 'texto': {
      if (!plano || !elegido) return sinPlano;
      const lineas = plano.dialogue ?? [];
      /*
       * QUIÉN LO DICE (Fase 22 del motor, arreglo R12 de la auditoría). F1-A exige quién habla en un diálogo y en una
       * voz en off, y lo prohíbe en la narración. Antes la línea salía sin nadie y el guardado la rechazaba: ahora se
       * elige entre los personajes de la producción —primero los que salen en el plano— y, si no hay ninguno, se dice
       * y solo queda la narración. Nada se supone: sin elegir a alguien, no se puede añadir.
       */
      const enElPlano = new Set(plano.characterIds ?? elegido.escena.characterIds ?? []);
      const personajes = [...produccion.characters].sort((a, b) => Number(enElPlano.has(b.id)) - Number(enElPlano.has(a.id)));
      const pideHablante = tipoDeLinea !== 'narration';
      const quien = hablante && personajes.some((p) => p.id === hablante) ? hablante : null;
      const nombreDe = (id: string | undefined) => (id ? produccion.characters.find((p) => p.id === id)?.name : undefined);
      const puedeAnadir = !pideHablante || !!quien;
      return (
        <View style={styles.bloque}>
          {lineas.length === 0 && nota(t('filmmaker.wsNoLines'))}
          {lineas.map((l) => {
            const suNombre = l.kind === 'narration' ? t('filmmaker.audioNarrator') : nombreDe(l.characterId);
            return (
              <View key={l.id} style={[styles.elemento, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
                <Ionicons name={l.kind === 'dialogue' ? 'chatbubble-outline' : 'mic-outline'} size={scale(15)} color={theme.colors.accent} />
                <View style={styles.lineaTextos}>
                  {!!suNombre && <Text style={[styles.hablante, { color: theme.colors.textSecondary }]} numberOfLines={1}>{suNombre}</Text>}
                  <Text style={[styles.elementoTexto, { color: theme.colors.text }]} numberOfLines={3}>{l.text}</Text>
                </View>
                {editable && <BotonPequeno icono="trash-outline" etiqueta={t('filmmaker.wsRemoveLine')} onPress={() => onGesto([{ op: 'remove_dialogue', lineId: l.id }])} />}
              </View>
            );
          })}
          {editable && (
            <Seccion titulo={t('filmmaker.wsAddLine')}>
              <Opciones opciones={TIPOS_DE_LINEA.map((k) => ({ valor: k.kind, texto: t(k.clave) }))} elegida={tipoDeLinea} editable onElegir={(v) => { if (v) setTipoDeLinea(v as DialogueLine['kind']); }} sinQuitar />
              {pideHablante && (personajes.length === 0
                ? nota(t('filmmaker.wsNoSpeakers'))
                : (
                  <Seccion titulo={t('filmmaker.wsWhoSaysIt')}>
                    <Opciones
                      opciones={personajes.map((p) => ({ valor: p.id, texto: p.name }))}
                      elegida={quien}
                      editable
                      onElegir={(v) => setHablante(v)}
                    />
                    {!quien && nota(t('filmmaker.wsPickSpeaker'))}
                    {!!quien && tipoDeLinea === 'dialogue' && !enElPlano.has(quien) && nota(t('filmmaker.wsSpeakerNotInShot', { nombre: nombreDe(quien) ?? '' }))}
                  </Seccion>
                ))}
              <CampoQueCrece
                key={`linea-${vuelta}`}
                etiqueta={t('filmmaker.wsLineText')}
                valor=""
                placeholder={t('filmmaker.wsLinePlaceholder')}
                maximo={LIMITES.linea}
                etiquetaGuardar={t('filmmaker.wsAddLine')}
                editable={puedeAnadir}
                onGuardar={(texto) => {
                  if (!texto.trim() || !puedeAnadir) return;
                  onGesto([{ op: 'add_dialogue', target: { shotId: plano.id }, line: {
                    id: ids.linea(), kind: tipoDeLinea, text: texto.trim(), ...(pideHablante && quien ? { characterId: quien } : {}),
                  } }]);
                  setVuelta((v) => v + 1);
                }}
              />
            </Seccion>
          )}
        </View>
      );
    }

    case 'efectos': {
      if (!elegido) return sinPlano;
      const escena = elegido.escena;
      return (
        <View style={styles.bloque}>
          <Seccion titulo={t('filmmaker.weather')}>
            <Opciones
              opciones={CLIMAS.map((c) => ({ valor: c, texto: t(CLAVE_DEL_CLIMA[c]) }))}
              elegida={escena.weather}
              editable={editable}
              onElegir={(v) => onGesto([{ op: 'change_weather', sceneId: escena.id, weather: v as Weather | null }])}
            />
          </Seccion>
          <Seccion titulo={t('filmmaker.timeOfDay')}>
            <Opciones
              opciones={MOMENTOS_DEL_DIA.map((m) => ({ valor: m, texto: t(CLAVE_DEL_MOMENTO[m]) }))}
              elegida={escena.timeOfDay}
              editable={editable}
              onElegir={(v) => onGesto([{ op: 'change_time_of_day', sceneId: escena.id, timeOfDay: v as TimeOfDay | null }])}
            />
          </Seccion>
          {nota(t('filmmaker.wsEffectsText', { numero: elegido.numeroDeEscena }))}
        </View>
      );
    }

    case 'color': {
      if (!plano) return sinPlano;
      const luz = FAMILIAS_DE_CAMARA.find((f) => f.id === 'lighting');
      const actual = valorCreativo(plano.visual?.creative, 'lighting.type' as CreativeParameterPath);
      return (
        <View style={styles.bloque}>
          <Seccion titulo={t('filmmaker.wsLighting')}>
            <Opciones
              opciones={(luz?.comandos ?? []).map((c) => ({ valor: c.valor, texto: t(c.clave) }))}
              elegida={typeof actual === 'string' ? actual : null}
              editable={editable}
              onElegir={(v) => onGesto([{ op: 'change_lighting', target: { scope: 'shot', shotId: plano.id }, lighting: v as LightingType | null }])}
            />
          </Seccion>
          {nota(t('filmmaker.wsColorText'))}
        </View>
      );
    }

    case 'transiciones': {
      /*
       * LAS TRANSICIONES, DE VERDAD (Fase 25 del motor). Antes aquí se decía que «llegarían», y F1-A ya las guardaba
       * (`change_transition`, en la producción, la escena o el plano) y el montaje final ya las usaba. La de un plano
       * es cómo da paso al siguiente; sin la suya vale la de su escena o la de la producción, y se dice cuál. No rehace
       * ningún plano: cambia el montaje, que se vuelve a crear.
       */
      const opciones = (Object.keys(CLAVE_DE_TRANSICION) as TransitionType[]).map((v) => ({ valor: v, texto: t(CLAVE_DE_TRANSICION[v]) }));
      const segmento = plano ? espacio.linea?.segments.find((s) => s.shotId === plano.id) : undefined;
      const propia = plano ? valorCreativo(plano.visual?.creative, 'transition.type' as CreativeParameterPath) : undefined;
      const deTodas = valorCreativo(produccion.creativeDirection.cinematography, 'transition.type' as CreativeParameterPath);
      return (
        <View style={styles.bloque}>
          {plano && elegido
            ? (
              <Seccion titulo={t('filmmaker.wsTransitionOfShot', { numero: elegido.numeroDePlano ?? 1 })}>
                <Opciones
                  grupo={t('filmmaker.wsTransitionOfShot', { numero: elegido.numeroDePlano ?? 1 })}
                  opciones={opciones}
                  elegida={typeof propia === 'string' ? propia : null}
                  editable={editable}
                  onElegir={(v) => onGesto([{ op: 'change_transition', target: { scope: 'shot', shotId: plano.id }, transition: v as TransitionType | null }])}
                />
                {typeof propia !== 'string' && nota(t('filmmaker.wsTransitionInherited', { transicion: t(CLAVE_DE_TRANSICION[segmento?.transitionOut ?? 'cut']) }))}
                {/* Fase 27 del motor: la del último plano no se ve en ningún sitio, porque no da paso a nada; se dice. */}
                {!!espacio.linea && espacio.linea.segments[espacio.linea.segments.length - 1]?.shotId === plano.id && nota(t('filmmaker.wsTransitionLastShot'))}
              </Seccion>
            )
            : sinPlano}
          <Seccion titulo={t('filmmaker.wsTransitionForAll')}>
            <Opciones
              grupo={t('filmmaker.wsTransitionForAll')}
              opciones={opciones}
              elegida={typeof deTodas === 'string' ? deTodas : null}
              editable={editable}
              onElegir={(v) => onGesto([{ op: 'change_transition', target: { scope: 'production' }, transition: v as TransitionType | null }])}
            />
          </Seccion>
          {nota(t('filmmaker.wsTransitionNote'))}
        </View>
      );
    }

    case 'subtitulos': {
      const destino = produccion.exportPlan.targets[0];
      const modo = destino?.subtitleMode ?? 'none';
      return (
        <View style={styles.bloque}>
          <Opciones
            opciones={MODOS_DE_SUBTITULO.map((m) => ({ valor: m.modo, texto: t(m.clave) }))}
            elegida={modo}
            editable={editable}
            sinQuitar
            onElegir={(v) => {
              if (!v) return;
              onGesto([{ op: 'change_export', change: { action: 'upsert', target: { ...(destino ?? { id: 'final', purpose: 'final' }), subtitleMode: v as 'none' | 'burned' | 'sidecar' } } }]);
            }}
          />
          {nota(t('filmmaker.wsSubtitlesText'))}
        </View>
      );
    }

    case 'ia':
      return (
        <View style={styles.bloque}>
          {plano || elegido ? (
            <ProductionShotGeneration
              toma={toma}
              historial={espacio.historialDeTomas}
              tipo={plano ? 'plano' : 'escena'}
              video={elegido ? espacio.videos.get(elegido.unitId) ?? null : null}
              formato={produccion.format.aspectRatio}
            />
          ) : sinPlano}
          <Seccion titulo={t('filmmaker.wsSuggestions')}>
            <ProductionRecommendations recomendaciones={recomendaciones} produccion={produccion} rechazadas={rechazadas} editable={editable} onAceptar={onGesto} onRechazar={onRechazar} />
          </Seccion>
          {nota(t('filmmaker.wsSuggestionsNote'))}
        </View>
      );

    default:
      return null;
  }
};

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, alignItems: 'center' },
  cerrados: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  cerrado: { minHeight: 28, paddingHorizontal: SPACING.sm, borderWidth: 1, borderStyle: 'dashed', borderRadius: 999, justifyContent: 'center', opacity: 0.6 },
  cerradoTexto: { fontSize: FONT_SIZE.xs },
  bloque: { gap: SPACING.md },
  nota: { fontSize: FONT_SIZE.xs, lineHeight: FONT_SIZE.xs * 1.5 },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  opcion: { minHeight: 34, paddingHorizontal: SPACING.md, borderWidth: 1, borderRadius: BORDER_RADIUS.full, justifyContent: 'center' },
  opcionTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium as any },
  /* Fase 25 del motor: un sonido con su nivel debajo. */
  elementoColumna: { borderWidth: 1, borderRadius: BORDER_RADIUS.md, padding: SPACING.sm, gap: SPACING.xs },
  elementoFila: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  elemento: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, borderWidth: 1, borderRadius: BORDER_RADIUS.md, padding: SPACING.sm },
  elementoTexto: { flex: 1, fontSize: FONT_SIZE.sm },
  lineaTextos: { flex: 1, gap: 2 },
  hablante: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold as any },
});

export default ProductionTools;
