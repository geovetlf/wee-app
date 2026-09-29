/**
 * WEË FILMMAKER · QUÉ PROPONE WEË BRAIN, DICHO PARA UNA PERSONA (Fase 22 del motor, arreglo R1 de la auditoría).
 *
 * Una propuesta son operaciones de F1-A, y quien decide si aplicarla no tiene que leer JSON. Cada operación se
 * cuenta con UNA frase —qué hace—, DÓNDE —«Escena 2 · Plano 1», «Toda la producción»—, lo que TRAE —el título de la
 * escena nueva, el nombre del personaje, el clima elegido— y POR QUÉ, con las palabras de Weë Brain.
 *
 * Sin reglas nuevas y sin tocar nada: el «dónde» se busca primero en la producción tal como quedaría con la propuesta
 * aplicada EN MEMORIA —así lo nuevo ya tiene su número— y, para lo que la propuesta quita, en la de ahora. Las
 * palabras del vocabulario (clima, cámara, estilo) salen de sus claves; lo que escribió alguien —títulos, nombres,
 * líneas, descripciones— se enseña tal cual, porque es contenido.
 *
 * Sin React: el traductor y el formato entran por parámetro, así se prueba en Node.
 */
import { aplicarOperaciones, buscarEscena, buscarPlano } from '../services/filmmaker/dominio';
import type { FilmmakerOperation, FilmmakerProduction } from '../services/filmmaker/dominio';
import { claveDelValor } from '../constants/camaraCinematica';
import {
  CLAVE_DE_OPERACION, CLAVE_DE_SONIDO_QUITADO, CLAVE_DE_TRANSICION, CLAVE_DEL_CLIMA, CLAVE_DEL_MOMENTO, CLAVE_DEL_NARRADOR,
  CLAVE_SIN_DURACION_OBJETIVO, OPERACION_DE_LA_RUTA, nombreDelEstilo,
} from '../constants/filmmaker';

type Traducir = (clave: string, valores?: Record<string, string | number>) => string;

/** Lo que hace falta del formato del idioma activo: números y listas (`i18n/formato.ts`). */
export interface FormatoParaDescribir {
  readonly numero: (n: number) => string;
  readonly lista: (xs: readonly string[]) => string;
}

export interface CambioPropuesto {
  /** Un icono de Ionicons que dice de qué va: escena, plano, cámara, sonido, reparto… */
  readonly icono: string;
  /** Qué hace, en el idioma de ahora. */
  readonly accion: string;
  /** Dónde, si es de una escena, de un plano o de toda la producción. */
  readonly donde?: string;
  /** Lo que trae: un nombre, un texto o el valor elegido, ya en palabras. */
  readonly detalle?: string;
  /** Por qué, dicho por Weë Brain: es su texto y va tal cual. */
  readonly razon?: string;
}

const ICONO: Readonly<Partial<Record<FilmmakerOperation['op'], string>>> = Object.freeze({
  add_scene: 'albums-outline', remove_scene: 'albums-outline', reorder_scene: 'swap-vertical-outline', duplicate_scene: 'copy-outline',
  split_scene: 'git-branch-outline', merge_scenes: 'git-merge-outline',
  add_shot: 'videocam-outline', remove_shot: 'videocam-outline', reorder_shot: 'swap-horizontal-outline', duplicate_shot: 'copy-outline',
  split_shot: 'cut-outline', merge_shots: 'git-merge-outline', move_shot: 'return-down-forward-outline', update_shot: 'videocam-outline',
  extend_duration: 'time-outline', shorten_duration: 'time-outline', change_target_duration: 'time-outline',
  change_camera: 'camera-outline', change_movement: 'move-outline', change_lighting: 'sunny-outline', change_style: 'color-palette-outline',
  change_weather: 'rainy-outline', change_time_of_day: 'partly-sunny-outline', change_location: 'location-outline', change_subject: 'scan-outline',
  edit_text: 'create-outline', replace_character: 'people-outline', set_character_state: 'shirt-outline', replace_reference: 'images-outline',
  add_dialogue: 'chatbubble-outline', change_dialogue: 'chatbubble-outline', remove_dialogue: 'chatbubble-outline', modify_audio: 'musical-notes-outline',
  change_format: 'crop-outline', change_export: 'share-outline',
  add_character: 'person-add-outline', update_character: 'person-outline', remove_character: 'person-remove-outline',
  add_location: 'location-outline', update_location: 'location-outline', remove_location: 'location-outline',
  add_object: 'cube-outline', update_object: 'cube-outline', remove_object: 'cube-outline',
  add_reference: 'images-outline', update_reference: 'images-outline', remove_reference: 'images-outline',
  rename_production: 'text-outline', change_intent: 'bulb-outline', change_direction: 'color-wand-outline', change_mood: 'happy-outline',
  change_transition: 'git-compare-outline', change_continuity: 'link-outline', change_generation: 'settings-outline',
  update_scene: 'albums-outline', change_edit_plan: 'film-outline',
});

const texto = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {});

/**
 * DESCRIBIR UNA PROPUESTA ENTERA, en su orden. `razones` va en el mismo orden que las operaciones (lo devuelve el
 * servidor así); una que falta no se inventa.
 */
export const describirPropuesta = (
  operaciones: readonly FilmmakerOperation[],
  razones: readonly (string | null)[] | undefined,
  antes: FilmmakerProduction,
  t: Traducir,
  formato: FormatoParaDescribir,
): readonly CambioPropuesto[] => {
  const aplicada = aplicarOperaciones(antes, operaciones);
  const despues = aplicada.ok ? aplicada.production : antes;
  const producciones = [despues, antes];

  const escena = (id: unknown): string | undefined => {
    if (typeof id !== 'string') return undefined;
    for (const p of producciones) {
      const e = buscarEscena(p, id);
      if (e) return t('filmmaker.whereScene', { escena: e.index + 1 });
    }
    return undefined;
  };
  const plano = (id: unknown): string | undefined => {
    if (typeof id !== 'string') return undefined;
    for (const p of producciones) {
      const u = buscarPlano(p, id);
      if (u) return t('filmmaker.whereShot', { escena: u.sceneIndex + 1, plano: u.shotIndex + 1 });
    }
    return undefined;
  };
  const dondeDe = (objetivo: unknown): string | undefined => {
    const o = obj(objetivo);
    if (o.shotId !== undefined) return plano(o.shotId);
    if (o.sceneId !== undefined) return escena(o.sceneId);
    if (Array.isArray(o.sceneIds)) {
      const suyas = o.sceneIds.map(escena).filter((x): x is string => !!x);
      return suyas.length ? formato.lista(suyas) : undefined;
    }
    if (o.scope === 'production') return t('filmmaker.opWhereProduction');
    return undefined;
  };
  /* Un personaje, lugar, objeto, línea o sonido por su id: su nombre o su texto, de donde esté. */
  const nombreEn = (clase: 'characters' | 'locations' | 'objects', id: unknown): string | undefined => {
    for (const p of producciones) {
      const x = (p[clase] as readonly { id: string; name: string }[]).find((c) => c.id === id);
      if (x) return x.name;
    }
    return undefined;
  };
  const dondeDeLaLinea = (id: unknown): { donde?: string; texto?: string } => {
    for (const p of producciones) {
      for (const [i, s] of p.scenes.entries()) {
        const enEscena = (s.dialogue ?? []).find((l) => l.id === id);
        if (enEscena) return { donde: t('filmmaker.whereScene', { escena: i + 1 }), texto: enEscena.text };
        for (const [j, sh] of s.shots.entries()) {
          const enPlano = (sh.dialogue ?? []).find((l) => l.id === id);
          if (enPlano) return { donde: t('filmmaker.whereShot', { escena: i + 1, plano: j + 1 }), texto: enPlano.text };
        }
      }
    }
    return {};
  };
  const sonido = (id: unknown): string | undefined => {
    for (const p of producciones) {
      const c = p.audio.cues.find((x) => x.id === id);
      if (c) return c.description;
    }
    return undefined;
  };
  /* Los valores de cámara, movimiento y luz que trae la operación, por sus rutas y en palabras. */
  const valoresDeCamara = (op: FilmmakerOperation): string | undefined => {
    const o = op as unknown as Record<string, unknown>;
    const palabras = Object.entries(OPERACION_DE_LA_RUTA)
      .filter(([, d]) => d.op === op.op && typeof o[d.campo] === 'string')
      .map(([ruta, d]) => claveDelValor(ruta, o[d.campo] as string))
      .filter((c): c is string => !!c)
      .map((c) => t(c));
    if (op.op === 'change_camera' && typeof op.focalLengthMm === 'number') palabras.push(t('filmmaker.opFocal', { mm: formato.numero(op.focalLengthMm) }));
    return palabras.length ? formato.lista(palabras) : undefined;
  };

  const una = (op: FilmmakerOperation): Omit<CambioPropuesto, 'icono' | 'razon'> => {
    const accion = (clave: string, valores?: Record<string, string | number>) => t(clave, valores);
    const base = CLAVE_DE_OPERACION[op.op];
    switch (op.op) {
      case 'add_scene': return { accion: accion(base), donde: escena(op.scene.id), detalle: texto(op.scene.title) ?? texto(op.scene.description) };
      case 'remove_scene': case 'duplicate_scene': case 'split_scene': case 'update_scene':
        return { accion: accion(base), donde: escena(op.sceneId) };
      case 'reorder_scene': return { accion: accion(base), donde: escena(op.sceneId) };
      case 'merge_scenes': return { accion: accion(base), donde: formato.lista([escena(op.sceneId), escena(op.withSceneId)].filter((x): x is string => !!x)) };
      case 'add_shot': return { accion: accion(base), donde: plano(op.shot.id), detalle: texto(op.shot.description) };
      case 'remove_shot': case 'reorder_shot': case 'duplicate_shot': case 'split_shot': case 'update_shot':
        return { accion: accion(base), donde: plano(op.shotId) };
      case 'merge_shots': return { accion: accion(base), donde: formato.lista([plano(op.shotId), plano(op.withShotId)].filter((x): x is string => !!x)) };
      case 'move_shot': return { accion: accion(base), donde: plano(op.shotId), detalle: escena(op.toSceneId) };
      case 'extend_duration': case 'shorten_duration':
        return { accion: accion(base, { segundos: formato.numero(op.bySec) }), donde: dondeDe(op.target) };
      case 'change_target_duration':
        return op.targetSec === null
          ? { accion: accion(CLAVE_SIN_DURACION_OBJETIVO), donde: t('filmmaker.opWhereProduction') }
          : { accion: accion(base, { segundos: formato.numero(op.targetSec) }), donde: t('filmmaker.opWhereProduction') };
      case 'change_camera': case 'change_movement': case 'change_lighting':
        return { accion: accion(base), donde: dondeDe(op.target), detalle: valoresDeCamara(op) };
      case 'change_style': return { accion: accion(base), donde: dondeDe(op.target), detalle: op.style ? nombreDelEstilo(op.style, t) : undefined };
      case 'change_weather': return { accion: accion(base), donde: escena(op.sceneId), detalle: op.weather ? t(CLAVE_DEL_CLIMA[op.weather]) : undefined };
      case 'change_time_of_day': return { accion: accion(base), donde: escena(op.sceneId), detalle: op.timeOfDay ? t(CLAVE_DEL_MOMENTO[op.timeOfDay]) : undefined };
      case 'change_location': return { accion: accion(base), donde: escena(op.sceneId), detalle: op.locationId ? nombreEn('locations', op.locationId) : undefined };
      case 'change_subject': return { accion: accion(base), donde: dondeDe(op.target), detalle: texto(op.subject?.description) ?? (op.subject?.characterId ? nombreEn('characters', op.subject.characterId) : undefined) };
      case 'edit_text': return { accion: accion(base), donde: dondeDe(op.target), detalle: texto(op.title) ?? texto(op.description) };
      case 'replace_character': {
        const de = nombreEn('characters', op.fromCharacterId);
        const a = nombreEn('characters', op.toCharacterId);
        return { accion: accion(base), donde: op.scope ? dondeDe(op.scope) : undefined, detalle: de && a ? t('filmmaker.opFromTo', { de, a }) : undefined };
      }
      case 'set_character_state': return { accion: accion(base), donde: dondeDe(op.target), detalle: nombreEn('characters', op.characterId) };
      case 'replace_reference': return { accion: accion(base) };
      case 'add_dialogue': return { accion: accion(base), donde: dondeDe(op.target), detalle: texto(op.line.text) };
      case 'change_dialogue': { const l = dondeDeLaLinea(op.lineId); return { accion: accion(base), donde: l.donde, detalle: texto(op.changes.text) ?? l.texto }; }
      case 'remove_dialogue': { const l = dondeDeLaLinea(op.lineId); return { accion: accion(base), donde: l.donde, detalle: l.texto }; }
      case 'modify_audio': {
        const c = op.change;
        if (c.action === 'remove') return { accion: accion(CLAVE_DE_SONIDO_QUITADO), detalle: sonido(c.cueId) };
        if (c.action === 'set_narrator') return { accion: accion(CLAVE_DEL_NARRADOR), detalle: texto(c.narrator?.description) };
        return { accion: accion(base), donde: dondeDe(c.cue.target), detalle: texto(c.cue.description) };
      }
      case 'change_format': return { accion: accion(base), detalle: texto(op.aspectRatio) };
      case 'change_export': return { accion: accion(base) };
      case 'add_character': return { accion: accion(base), detalle: texto(op.character.name) };
      case 'update_character': case 'remove_character': return { accion: accion(base), detalle: nombreEn('characters', op.characterId) };
      case 'add_location': return { accion: accion(base), detalle: texto(op.location.name) };
      case 'update_location': case 'remove_location': return { accion: accion(base), detalle: nombreEn('locations', op.locationId) };
      case 'add_object': return { accion: accion(base), detalle: texto(op.object.name) };
      case 'update_object': case 'remove_object': return { accion: accion(base), detalle: nombreEn('objects', op.objectId) };
      case 'add_reference': return { accion: accion(base), detalle: texto(op.reference.description) };
      case 'update_reference': case 'remove_reference': return { accion: accion(base) };
      case 'rename_production': return { accion: accion(base), detalle: texto(op.title) };
      case 'change_intent': return { accion: accion(base), detalle: texto(op.changes.objective) ?? texto(op.changes.narrative) ?? texto(op.changes.theme) };
      case 'change_direction': return { accion: accion(base), donde: t('filmmaker.opWhereProduction'), detalle: texto(op.changes.mood) ?? texto(op.changes.tone) };
      case 'change_mood': return { accion: accion(base), donde: dondeDe(op.target), detalle: texto(op.mood) };
      case 'change_transition': return { accion: accion(base), donde: dondeDe(op.target), detalle: op.transition ? t(CLAVE_DE_TRANSICION[op.transition]) : undefined };
      case 'change_continuity': case 'change_generation': return { accion: accion(base), donde: dondeDe(op.target) };
      case 'change_edit_plan': return { accion: accion(base) };
      default: return { accion: accion(base) };
    }
  };

  return operaciones.map((op, i) => {
    /* Lo que llega ya lo comprobó F1-A; aun así, una operación incompleta se dice por su nombre y no rompe la lista. */
    let d: Omit<CambioPropuesto, 'icono' | 'razon'>;
    try {
      d = una(op);
    } catch {
      d = { accion: CLAVE_DE_OPERACION[op.op] ? t(CLAVE_DE_OPERACION[op.op]) : String(op.op) };
    }
    const razon = texto(razones?.[i] ?? undefined);
    return {
      icono: ICONO[op.op] ?? 'sparkles-outline',
      accion: d.accion,
      ...(d.donde ? { donde: d.donde } : {}),
      ...(d.detalle ? { detalle: d.detalle } : {}),
      ...(razon ? { razon } : {}),
    };
  });
};
