import type { FilmmakerIssue, FilmmakerOperation, FilmmakerProduction } from '../services/filmmaker/dominio';
import type { FalloDeProducciones } from '../services/filmmakerService';
import type { Traductor } from '../i18n/traducir';

/**
 * WEË FILMMAKER · DE LOS CÓDIGOS DEL DOMINIO A LO QUE SE LEE (F1-C).
 *
 * F1-A y F1-B no dicen frases: dicen un código y su `messageKey`, con tres
 * tramos (`filmmaker.validation.shape_invalid`, `filmmaker.persistence.revision_conflict`).
 * Los diccionarios de Weë son planos —un módulo y una clave—, así que cada
 * `messageKey` se lee aquí como una clave plana del módulo `filmmaker`:
 *
 *   filmmaker.validation.shape_invalid          → filmmaker.valShapeInvalid
 *   filmmaker.operation.operation_target_missing → filmmaker.opOperationTargetMissing
 *   filmmaker.recommendation.duration_off_target → filmmaker.recDurationOffTarget
 *   filmmaker.requirement.capability_not_in_catalog → filmmaker.reqCapabilityNotInCatalog
 *   filmmaker.persistence.revision_conflict     → filmmaker.perRevisionConflict
 *
 * Una regla, no una tabla: así ningún código se queda sin su frase por olvido, y
 * `functions/test/filmmaker-i18n.test.mjs` comprueba que cada código de F1-A y de
 * F1-B tiene la suya en los once diccionarios. En camelCase a propósito: un
 * `…_many` al final se leería como un plural inventado.
 *
 * Aquí no hay frases: quien pinta pasa `t`.
 */

const AREAS: Readonly<Record<string, string>> = Object.freeze({
  validation: 'val', operation: 'op', recommendation: 'rec', requirement: 'req', persistence: 'per',
});

const enPascal = (codigo: string): string => codigo.split('_').map((t) => (t ? t[0].toUpperCase() + t.slice(1) : '')).join('');

/** La clave plana del diccionario para un `messageKey` del dominio, o `null` si no es de Filmmaker. */
export const claveDelMensaje = (messageKey: string): string | null => {
  const m = /^filmmaker\.(validation|operation|recommendation|requirement|persistence)\.([a-z][a-z_]*)$/.exec(messageKey);
  return m ? `filmmaker.${AREAS[m[1]]}${enPascal(m[2])}` : null;
};



/**
 * DÓNDE ESTÁ LO QUE SE DICE, en números de persona: «Escena 2 · Plano 1». Sale de
 * la ruta con ids que da el dominio (`scenes.sc01.shots.sh03.durationSec`).
 */
export const lugarDelProblema = (path: string, prod: FilmmakerProduction | null | undefined): { readonly escena?: number; readonly plano?: number } => {
  if (!prod) return {};
  const m = /^scenes\.([^.]+)(?:\.shots\.([^.]+))?/.exec(path);
  if (!m) return {};
  const i = prod.scenes.findIndex((s) => s.id === m[1]);
  if (i < 0) return {};
  const j = m[2] ? prod.scenes[i].shots.findIndex((p) => p.id === m[2]) : -1;
  return { escena: i + 1, ...(j >= 0 ? { plano: j + 1 } : {}) };
};

/** Solo lo que se puede interpolar: números y textos. Las listas se quedan fuera. */
const interpolables = (p: FilmmakerIssue['parameters']): Record<string, string | number> =>
  Object.fromEntries(Object.entries(p).filter((e): e is [string, string | number] => typeof e[1] === 'number' || typeof e[1] === 'string'));

/**
 * LA FRASE DE UN PROBLEMA, entera y en el idioma de quien mira: su mensaje, con
 * sus números, el nombre del personaje si lo nombra, y dónde está.
 */
export const fraseDelProblema = (issue: FilmmakerIssue, prod: FilmmakerProduction | null | undefined, t: Traductor): string => {
  const clave = claveDelMensaje(issue.messageKey) ?? 'filmmaker.perUnknown';
  const personaje = typeof issue.parameters.characterId === 'string'
    ? prod?.characters.find((c) => c.id === issue.parameters.characterId)?.name
    : undefined;
  const frase = t(clave, { ...interpolables(issue.parameters), ...(personaje ? { nombre: personaje } : {}) });
  const lugar = lugarDelProblema(issue.path, prod);
  if (lugar.escena === undefined) return frase;
  const donde = lugar.plano === undefined
    ? t('filmmaker.whereScene', { escena: lugar.escena })
    : t('filmmaker.whereShot', { escena: lugar.escena, plano: lugar.plano });
  return t('filmmaker.problemAt', { donde, frase });
};

/** La frase de un fallo del servidor o de la red: la de su código. */
export const fraseDelFallo = (fallo: FalloDeProducciones, t: Traductor): string =>
  t(claveDelMensaje(fallo.messageKey) ?? 'filmmaker.perUnknown');

/**
 * QUÉ HACE UNA PROPUESTA, dicho corto: lo que la persona acepta al tocar
 * «Aceptar». Sale de su primera operación —las propuestas de F1-A son de un tipo
 * cada una—, con sus números.
 */
export const fraseDeLaPropuesta = (ops: readonly FilmmakerOperation[], t: Traductor): string => {
  const [op] = ops;
  if (!op) return t('filmmaker.propApply');
  switch (op.op) {
    case 'change_target_duration':
      return op.targetSec === null ? t('filmmaker.propApply') : t('filmmaker.propTargetDuration', { segundos: op.targetSec });
    case 'merge_scenes':
      return t('filmmaker.propMergeScenes');
    case 'extend_duration':
      return t('filmmaker.propExtend', { segundos: op.bySec });
    case 'add_shot':
      return t('filmmaker.propAddShot');
    case 'modify_audio':
      return t('filmmaker.propAdjustAudio');
    case 'set_character_state':
      return t('filmmaker.propKeepWardrobe');
    case 'change_export':
      return t('filmmaker.propAdjustExport');
    case 'change_weather':
    case 'change_time_of_day':
    case 'change_location':
      return t('filmmaker.propMatchSetting');
    default:
      return t('filmmaker.propApply');
  }
};
