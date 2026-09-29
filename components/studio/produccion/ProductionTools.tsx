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
import { CLAVE_DEL_CLIMA, CLAVE_DEL_MOMENTO, PASO_DE_DURACION_SEC } from '../../../constants/filmmaker';
import { CLIMAS, LIMITES, MOMENTOS_DEL_DIA, valorCreativo } from '../../../services/filmmaker/dominio';
import type { AudioCue, CreativeParameterPath, DialogueLine, FilmmakerOperation, LightingType, MotionSpeed, TimeOfDay, Weather } from '../../../services/filmmaker/dominio';
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
const TIPOS_DE_LINEA: readonly { kind: DialogueLine['kind']; clave: string }[] = [
  { kind: 'dialogue', clave: 'filmmaker.audioDialogue' },
  { kind: 'voiceover', clave: 'filmmaker.wsLineVoiceover' },
  { kind: 'narration', clave: 'filmmaker.audioNarrator' },
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
}> = ({ opciones, elegida, editable, onElegir, sinQuitar }) => {
  const { theme } = useTheme();
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
            accessibilityLabel={o.texto}
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
 * cualquier otro gesto. Lo que F1-A todavía no sabe hacer —las transiciones— se
 * enseña y se dice que llegará: nada de botones que no hacen nada.
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
  const { t } = useIdioma();
  const { produccion, seleccion, editable, onGesto, onSeleccionar, toma, recomendaciones, rechazadas, onRechazar } = espacio;
  const elegido = elegidoDe(produccion, seleccion);
  const plano = elegido?.plano;
  const [tipoDeSonido, setTipoDeSonido] = useState<AudioCue['kind']>('ambience');
  const [tipoDeLinea, setTipoDeLinea] = useState<DialogueLine['kind']>('dialogue');
  /* Tras añadir, el campo vuelve a empezar vacío: se monta de nuevo. */
  const [vuelta, setVuelta] = useState(0);

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
      const suyos = produccion.audio.cues;
      return (
        <View style={styles.bloque}>
          {suyos.length === 0 && nota(t('filmmaker.wsNoCues'))}
          {suyos.map((c) => (
            <View key={c.id} style={[styles.elemento, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
              <Ionicons name={c.kind === 'music' ? 'musical-notes-outline' : c.kind === 'sfx' ? 'flash-outline' : 'leaf-outline'} size={scale(15)} color={theme.colors.accent} />
              <Text style={[styles.elementoTexto, { color: theme.colors.text }]} numberOfLines={2}>{c.description}</Text>
              {editable && (
                <BotonPequeno icono="trash-outline" etiqueta={t('filmmaker.wsRemoveCue', { sonido: c.description })} onPress={() => onGesto([{ op: 'modify_audio', change: { action: 'remove', cueId: c.id } }])} />
              )}
            </View>
          ))}
          {editable && (
            <Seccion titulo={t('filmmaker.wsAddCue')}>
              <Opciones opciones={TIPOS_DE_SONIDO.map((s) => ({ valor: s.kind, texto: t(s.clave) }))} elegida={tipoDeSonido} editable onElegir={(v) => { if (v) setTipoDeSonido(v as AudioCue['kind']); }} sinQuitar />
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
                    id: ids.sonido(), kind: tipoDeSonido, description: texto.trim(),
                    target: plano ? { scope: 'shot', shotId: plano.id } : { scope: 'production' },
                  } } }]);
                  setVuelta((v) => v + 1);
                }}
              />
              {nota(plano ? t('filmmaker.wsCueForShot', { numero: elegido?.numeroDePlano ?? 1 }) : t('filmmaker.wsCueForProduction'))}
            </Seccion>
          )}
          {nota(t('filmmaker.audioUnavailable'))}
        </View>
      );
    }

    case 'texto': {
      if (!plano) return sinPlano;
      const lineas = plano.dialogue ?? [];
      return (
        <View style={styles.bloque}>
          {lineas.length === 0 && nota(t('filmmaker.wsNoLines'))}
          {lineas.map((l) => (
            <View key={l.id} style={[styles.elemento, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
              <Ionicons name={l.kind === 'dialogue' ? 'chatbubble-outline' : 'mic-outline'} size={scale(15)} color={theme.colors.accent} />
              <Text style={[styles.elementoTexto, { color: theme.colors.text }]} numberOfLines={3}>{l.text}</Text>
              {editable && <BotonPequeno icono="trash-outline" etiqueta={t('filmmaker.wsRemoveLine')} onPress={() => onGesto([{ op: 'remove_dialogue', lineId: l.id }])} />}
            </View>
          ))}
          {editable && (
            <Seccion titulo={t('filmmaker.wsAddLine')}>
              <Opciones opciones={TIPOS_DE_LINEA.map((k) => ({ valor: k.kind, texto: t(k.clave) }))} elegida={tipoDeLinea} editable onElegir={(v) => { if (v) setTipoDeLinea(v as DialogueLine['kind']); }} sinQuitar />
              <CampoQueCrece
                key={`linea-${vuelta}`}
                etiqueta={t('filmmaker.wsLineText')}
                valor=""
                placeholder={t('filmmaker.wsLinePlaceholder')}
                maximo={LIMITES.linea}
                etiquetaGuardar={t('filmmaker.wsAddLine')}
                onGuardar={(texto) => {
                  if (!texto.trim()) return;
                  onGesto([{ op: 'add_dialogue', target: { shotId: plano.id }, line: { id: ids.linea(), kind: tipoDeLinea, text: texto.trim() } }]);
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

    case 'transiciones':
      return nota(t('filmmaker.wsTransitionsSoon'));

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
  bloque: { gap: SPACING.md },
  nota: { fontSize: FONT_SIZE.xs, lineHeight: FONT_SIZE.xs * 1.5 },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  opcion: { minHeight: 34, paddingHorizontal: SPACING.md, borderWidth: 1, borderRadius: BORDER_RADIUS.full, justifyContent: 'center' },
  opcionTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium as any },
  elemento: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, borderWidth: 1, borderRadius: BORDER_RADIUS.md, padding: SPACING.sm },
  elementoTexto: { flex: 1, fontSize: FONT_SIZE.sm },
});

export default ProductionTools;
