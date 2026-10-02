import {
  DialogueLine, FilmmakerProduction, ProductionScene, RESOLUCIONES, aMs, aSec, buscarEscena, buscarPlano, canonico, compararTexto,
  derivarId, duracionDeEscenaMs, duracionDeLineaMs, duracionTotalMs, estadoEfectivo, idsDeLaProduccion, repartoDelPlano,
} from './modelo';
import { FilmmakerOperation, aplicarOperacion, aplicarOperaciones } from './operaciones';
import { FilmmakerIssue, Params, claveDeMensaje, integridad } from './validacion';

/**
 * WEË FILMMAKER — LO QUE WEË SUGIERE, SIN IMPONER NADA.
 *
 * ── Qué es una recomendación ────────────────────────────────────────────────
 *
 * «Tu vídeo tiene demasiadas escenas para 15 segundos.» «El diálogo de este
 * plano probablemente no cabe.» «Luna aparece con otra ropa en el plano
 * siguiente.» Cosas que se pueden DECIR sin inteligencia artificial, con reglas
 * que cualquiera puede leer, y que vienen con su propuesta de cambio.
 *
 * ── La regla que no se rompe ────────────────────────────────────────────────
 *
 * Una recomendación NUNCA toca la producción. Su propuesta está escrita en el
 * lenguaje de `operaciones.ts` y solo se aplica si alguien —la persona, o una
 * capa inteligente en una fase posterior— la acepta. Cada propuesta se prueba
 * contra la producción antes de ofrecerla: lo que no se podría aplicar no se
 * ofrece. Y puede haber varias alternativas: alargar el objetivo o juntar
 * escenas; quien decide es quien mira.
 *
 * Los umbrales son criterio editorial de Weë, no límites de ningún proveedor, y
 * están aquí a la vista.
 */

export type RecommendationCode =
  | 'too_many_scenes_for_duration'
  | 'dialogue_exceeds_duration'
  | 'audio_longer_than_video'
  | 'character_continuity_inconsistent'
  | 'scene_without_shots'
  | 'shot_too_short_for_actions'
  | 'requirements_incompatible'
  | 'setting_changes_in_continuation'
  | 'duration_off_target';

export interface Recommendation extends FilmmakerIssue<RecommendationCode> {
  /** Alternativas: cada una es una lista de operaciones que se aplica entera o no se aplica. */
  readonly proposals: readonly (readonly FilmmakerOperation[])[];
}

export const HEURISTICAS = Object.freeze({
  /** Menos que esto por escena no deja ver ninguna. */
  segundosMinimosPorEscena: 2,
  /** Lo que tarda en verse una acción. */
  segundosPorAccion: 1.5,
  /** Cuánto puede desviarse la duración de un objetivo que solo orienta. */
  desvioDelObjetivo: 0.2,
});

const redondearArriba = (ms: number): number => Math.ceil(ms / 100) / 10;
const redondear = (ms: number): number => Math.round(ms / 100) / 10;

const ORDEN_DE_RESOLUCION: readonly string[] = RESOLUCIONES;

/**
 * LO QUE WEË PUEDE SUGERIR SOBRE ESTA PRODUCCIÓN. Si la producción está rota no
 * se sugiere nada: primero hay que arreglarla, y eso lo dice la validación.
 */
export const recomendar = (prod: FilmmakerProduction): readonly Recommendation[] => {
  if (integridad(prod).length) return [];
  const salida: Recommendation[] = [];
  const decir = (
    code: RecommendationCode, severity: 'info' | 'warning', path: string, parameters: Params,
    alternativas: readonly (readonly FilmmakerOperation[])[],
  ): void => {
    /* Solo se ofrece lo que se podría aplicar tal cual. */
    const proposals = alternativas.filter((ops) => ops.length > 0 && aplicarOperaciones(prod, ops).ok);
    salida.push({ code, severity, path, parameters, messageKey: claveDeMensaje('recommendation', code), proposals });
  };
  const ruta = (escena: ProductionScene, shotId?: string): string =>
    shotId ? `scenes.${escena.id}.shots.${shotId}` : `scenes.${escena.id}`;

  /* ── Demasiadas escenas para tan poco tiempo ── */
  const objetivo = prod.duration.targetSec ?? prod.intent.requestedDurationSec;
  const n = prod.scenes.length;
  if (objetivo !== undefined && n >= 2 && objetivo / n < HEURISTICAS.segundosMinimosPorEscena) {
    const maxEscenas = Math.max(1, Math.floor(objetivo / HEURISTICAS.segundosMinimosPorEscena));
    const estirar: FilmmakerOperation[] = [{
      op: 'change_target_duration', targetSec: n * HEURISTICAS.segundosMinimosPorEscena,
      ...(prod.duration.strict !== undefined ? { strict: prod.duration.strict } : {}),
    }];
    decir('too_many_scenes_for_duration', 'warning', 'scenes',
      { scenes: n, targetSec: objetivo, maxScenes: maxEscenas, minSecPerScene: HEURISTICAS.segundosMinimosPorEscena },
      [estirar, juntarEscenas(prod, n - maxEscenas)]);
  }

  /* ── Diálogo que no cabe ── */
  for (const escena of prod.scenes) {
    for (const plano of escena.shots) {
      if (plano.durationSec === undefined || !plano.dialogue?.length) continue;
      const hablaMs = plano.dialogue.reduce((t, l) => t + duracionDeLineaMs(l), 0);
      const disponibleMs = aMs(plano.durationSec);
      if (hablaMs > disponibleMs) {
        decir('dialogue_exceeds_duration', 'warning', ruta(escena, plano.id),
          { estimatedSec: redondear(hablaMs), availableSec: aSec(disponibleMs), lines: plano.dialogue.length },
          [[{ op: 'extend_duration', target: { shotId: plano.id }, bySec: redondearArriba(hablaMs - disponibleMs) }]]);
      }
    }
    /* Las líneas que aún no tienen plano cuentan contra la escena entera. */
    if (escena.dialogue?.length) {
      const disponibleMs = duracionDeEscenaMs(escena);
      const todas: DialogueLine[] = [...escena.dialogue];
      for (const p of escena.shots) todas.push(...(p.dialogue ?? []));
      const hablaMs = todas.reduce((t, l) => t + duracionDeLineaMs(l), 0);
      if (disponibleMs !== undefined && hablaMs > disponibleMs) {
        decir('dialogue_exceeds_duration', 'warning', ruta(escena),
          { estimatedSec: redondear(hablaMs), availableSec: aSec(disponibleMs), lines: todas.length },
          [[{ op: 'extend_duration', target: { sceneId: escena.id }, bySec: redondearArriba(hablaMs - disponibleMs) }]]);
      }
    }
  }

  /* ── Sonido más largo que su tramo ── */
  const total = duracionTotalMs(prod);
  for (const cue of prod.audio.cues) {
    if (cue.durationSec === undefined) continue;
    const t = cue.target;
    const tramo = t.scope === 'production' ? total
      : t.scope === 'scenes' ? t.sceneIds.reduce<number | undefined>((acc, id) => {
        const s = buscarEscena(prod, id);
        const d = s ? duracionDeEscenaMs(s.scene) : undefined;
        return acc === undefined || d === undefined ? undefined : acc + d;
      }, 0)
        : (() => { const p = buscarPlano(prod, t.shotId); return p?.shot.durationSec !== undefined ? aMs(p.shot.durationSec) : undefined; })();
    if (tramo !== undefined && aMs(cue.durationSec) > tramo) {
      decir('audio_longer_than_video', 'warning', `audio.cues.${cue.id}`,
        { cueSec: cue.durationSec, availableSec: aSec(tramo), kind: cue.kind },
        [[{ op: 'modify_audio', change: { action: 'upsert', cue: { ...cue, durationSec: aSec(tramo) } } }]]);
    }
  }

  /* ── Continuidad de los personajes ── */
  for (const personaje of prod.characters) {
    /* Un vestuario fijado que alguien cambia en una escena o en un plano. */
    if (personaje.continuity?.locked?.includes('wardrobe')) {
      for (const escena of prod.scenes) {
        const enEscena = escena.characterStates?.find((e) => e.characterId === personaje.id && e.wardrobe !== undefined);
        if (enEscena) {
          decir('character_continuity_inconsistent', 'warning', `${ruta(escena)}.characterStates`,
            { reason: 'locked_wardrobe_changed', characterId: personaje.id },
            [[{ op: 'set_character_state', target: { sceneId: escena.id }, characterId: personaje.id, wardrobe: null }]]);
        }
        for (const plano of escena.shots) {
          const enPlano = plano.characterStates?.find((e) => e.characterId === personaje.id && e.wardrobe !== undefined);
          if (enPlano) {
            decir('character_continuity_inconsistent', 'warning', `${ruta(escena, plano.id)}.characterStates`,
              { reason: 'locked_wardrobe_changed', characterId: personaje.id },
              [[{ op: 'set_character_state', target: { shotId: plano.id }, characterId: personaje.id, wardrobe: null }]]);
          }
        }
      }
    }
    /* La ropa que cambia entre dos planos seguidos de la misma escena. */
    for (const escena of prod.scenes) {
      let anterior: { readonly wardrobe: string | undefined } | undefined;
      for (const plano of escena.shots) {
        const sale = repartoDelPlano(escena, plano).includes(personaje.id) || plano.subject?.characterId === personaje.id;
        if (!sale) continue;
        const ropa = estadoEfectivo(escena, plano, personaje.id)?.wardrobe;
        if (anterior && anterior.wardrobe !== ropa) {
          decir('character_continuity_inconsistent', 'warning', `${ruta(escena, plano.id)}.characterStates`,
            { reason: 'wardrobe_changes_within_scene', characterId: personaje.id, from: anterior.wardrobe ?? '', to: ropa ?? '' },
            [[{ op: 'set_character_state', target: { shotId: plano.id }, characterId: personaje.id, wardrobe: anterior.wardrobe ?? null }]]);
        }
        anterior = { wardrobe: ropa };
      }
    }
  }

  /* ── Escenas sin planos ── */
  const ocupados = idsDeLaProduccion(prod);
  for (const escena of prod.scenes) {
    if (escena.shots.length) continue;
    const base = `${escena.id}-shot`.slice(0, 128);
    const id = ocupados.has(base) ? derivarId(base, ocupados) : base;
    decir('scene_without_shots', 'info', ruta(escena), { sceneId: escena.id },
      [[{ op: 'add_shot', sceneId: escena.id, shot: { id, ...(escena.durationSec !== undefined ? { durationSec: escena.durationSec } : {}) } }]]);
  }

  /* ── Un plano demasiado corto para lo que pasa en él ── */
  for (const escena of prod.scenes) {
    for (const plano of escena.shots) {
      const acciones = plano.actions?.length ?? 0;
      if (plano.durationSec === undefined || acciones < 2) continue;
      const necesarioMs = aMs(acciones * HEURISTICAS.segundosPorAccion);
      const tieneMs = aMs(plano.durationSec);
      if (tieneMs < necesarioMs) {
        decir('shot_too_short_for_actions', 'warning', ruta(escena, plano.id),
          { actions: acciones, availableSec: aSec(tieneMs), neededSec: aSec(necesarioMs) },
          [[{ op: 'extend_duration', target: { shotId: plano.id }, bySec: redondearArriba(necesarioMs - tieneMs) }]]);
      }
    }
  }

  /* ── Entregas que piden algo que la producción no es ── */
  for (const t of prod.exportPlan.targets) {
    if (t.aspectRatio !== undefined && t.aspectRatio !== prod.format.aspectRatio) {
      const { aspectRatio: _formato, ...resto } = t;
      decir('requirements_incompatible', 'info', `exportPlan.targets.${t.id}.aspectRatio`,
        { reason: 'reframe_needed', from: prod.format.aspectRatio, to: _formato },
        [[{ op: 'change_export', change: { action: 'upsert', target: resto } }]]);
    }
    const propia = prod.format.resolution;
    if (t.resolution !== undefined && propia !== undefined
      && ORDEN_DE_RESOLUCION.indexOf(t.resolution) > ORDEN_DE_RESOLUCION.indexOf(propia)) {
      decir('requirements_incompatible', 'warning', `exportPlan.targets.${t.id}.resolution`,
        { reason: 'upscale_needed', from: propia, to: t.resolution },
        [[{ op: 'change_export', change: { action: 'upsert', target: { ...t, resolution: propia } } }]]);
    }
  }

  /* ── Una escena que continúa otra y cambia de sitio, de hora o de clima ── */
  for (const escena of prod.scenes) {
    for (const origen of escena.dependsOn ?? []) {
      const previa = buscarEscena(prod, origen)?.scene;
      if (!previa) continue;
      const campos: readonly [string, unknown, unknown, FilmmakerOperation][] = [
        ['weather', previa.weather, escena.weather, { op: 'change_weather', sceneId: escena.id, weather: previa.weather ?? null }],
        ['timeOfDay', previa.timeOfDay, escena.timeOfDay, { op: 'change_time_of_day', sceneId: escena.id, timeOfDay: previa.timeOfDay ?? null }],
        ['locationId', previa.locationId, escena.locationId, { op: 'change_location', sceneId: escena.id, locationId: previa.locationId ?? null }],
      ];
      for (const [campo, antes, ahora, op] of campos) {
        if (antes !== undefined && ahora !== undefined && antes !== ahora) {
          decir('setting_changes_in_continuation', 'info', `${ruta(escena)}.${campo}`,
            { reason: campo, continuesSceneId: previa.id, from: String(antes), to: String(ahora) }, [[op]]);
        }
      }
    }
  }

  /* ── Una duración que se aleja mucho de un objetivo que solo orienta ── */
  const meta = prod.duration.targetSec;
  if (meta !== undefined && prod.duration.strict !== true && total !== undefined
    && Math.abs(total - aMs(meta)) / aMs(meta) > HEURISTICAS.desvioDelObjetivo) {
    decir('duration_off_target', 'info', 'duration.targetSec', { targetSec: meta, totalSec: aSec(total) },
      [[{ op: 'change_target_duration', targetSec: aSec(total) }]]);
  }

  return salida.sort((a, b) =>
    compararTexto(a.path, b.path) || compararTexto(a.code, b.code) || compararTexto(canonico(a.parameters), canonico(b.parameters)));
};

/**
 * JUNTAR ESCENAS HASTA QUE QUEPAN: cada vez, las dos seguidas que menos duran
 * juntas —y si no se sabe cuánto duran, las dos últimas—. Cada paso se prueba;
 * si uno no se pudiera aplicar, no hay propuesta.
 */
const juntarEscenas = (prod: FilmmakerProduction, cuantas: number): FilmmakerOperation[] => {
  const ops: FilmmakerOperation[] = [];
  let actual = prod;
  for (let k = 0; k < cuantas; k++) {
    let mejor = -1;
    let valor = Infinity;
    for (let i = 0; i + 1 < actual.scenes.length; i++) {
      const d = (duracionDeEscenaMs(actual.scenes[i]) ?? Infinity) + (duracionDeEscenaMs(actual.scenes[i + 1]) ?? Infinity);
      if (d < valor) { valor = d; mejor = i; }
    }
    if (mejor < 0) mejor = actual.scenes.length - 2;
    if (mejor < 0) return [];
    const op: FilmmakerOperation = { op: 'merge_scenes', sceneId: actual.scenes[mejor].id, withSceneId: actual.scenes[mejor + 1].id };
    const r = aplicarOperacion(actual, op);
    if (!r.ok) return [];
    ops.push(op);
    actual = r.production;
  }
  return ops;
};
