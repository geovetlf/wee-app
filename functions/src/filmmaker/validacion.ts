import { TIPOS_DE_MATERIAL } from '../core/content/asset';
import { FUERZAS_DE_CONTINUIDAD, RELACIONES_ESPACIALES, anclajeValido, validarContinuidad } from '../core/continuity';
import { PROPORCIONES, validarCreativos } from '../core/creative';
import { normalizarEtiqueta } from '../core/language';
import { claveProhibidaDeNodo } from '../core/shot';
import {
  CALIDADES, CLIMAS, ENFOQUES, ESTILOS_DE_SUBTITULO, LIMITES, MODOS_DE_SUBTITULO, MOMENTOS_DEL_DIA,
  PAPELES_DE_REFERENCIA, PISTAS, POSICIONES_DE_SUBTITULO, PRESETS, PREVISUALIZACIONES, PRIORIDADES,
  PROPOSITOS_DE_EXPORTACION, PROPOSITOS_NARRATIVOS, RASGOS, RELACIONES_ENTRE_PERSONAJES, RESOLUCIONES, RITMOS,
  TIPOS_DE_LINEA, TIPOS_DE_OBJETO, TIPOS_DE_PRODUCCION, TIPOS_DE_RESTRICCION, TIPOS_DE_SONIDO, AMBIENTES,
  FILMMAKER_MODEL_VERSION, aMs, aSec, canonico, compararTexto, esId,
} from './modelo';

/**
 * WEË FILMMAKER — LA VALIDACIÓN DE UNA PRODUCCIÓN.
 *
 * ── Qué devuelve ────────────────────────────────────────────────────────────
 *
 * Códigos, no frases. Cada problema dice QUÉ pasa (`code`), CUÁNTO importa
 * (`severity`), DÓNDE (`path`, con los ids de la producción) y CON QUÉ datos
 * (`parameters`). La frase que verá la persona la pone la interfaz con su
 * `messageKey` y el idioma de quien mira: aquí no hay ni una palabra de
 * interfaz, en ningún idioma.
 *
 * ── Dos etapas, porque un borrador no es un error ───────────────────────────
 *
 *   draft   la producción se está escribiendo: que a un plano le falte la
 *           duración es un aviso.
 *   ready   se va a pedir: lo que falte para producirla es un error.
 *
 * La forma —un campo desconocido, un id repetido, una referencia colgando, un
 * ciclo— es un error en las dos: una producción rota no es un borrador.
 *
 * ── Lo que reutiliza del Core, sin tocarlo ──────────────────────────────────
 *
 * `claveProhibidaDeNodo` (la lista de lo que un nodo no puede llevar: proveedor,
 * modelo, semilla, prompt, URL…), `validarCreativos`, `validarContinuidad`,
 * `anclajeValido`, `normalizarEtiqueta` y los vocabularios de proporciones,
 * relaciones espaciales, fuerzas de continuidad y tipos de material. La regla de
 * las claves prohibidas es la del Core, tal cual; la única excepción es la
 * clave `prompt` DENTRO de `advanced`, que es donde vive el prompt avanzado.
 */

/* ── El contrato de un problema ───────────────────────────────────────────── */

export type Severity = 'error' | 'warning' | 'info';
export type ParamValue = string | number | boolean | readonly string[];
export type Params = Readonly<Record<string, ParamValue>>;

/** La forma común de todo lo que Filmmaker tiene que decir: validación, operaciones y recomendaciones. */
export interface FilmmakerIssue<C extends string = string> {
  readonly code: C;
  readonly severity: Severity;
  /** Dónde, con los ids: `scenes.sc01.shots.sh03.durationSec`. */
  readonly path: string;
  readonly parameters: Params;
  /** La clave de i18n con la que la interfaz lo dirá. Aquí no hay frases. */
  readonly messageKey: string;
}

export type ValidationCode =
  | 'shape_invalid'
  | 'field_unknown'
  | 'field_forbidden'
  | 'value_invalid'
  | 'id_invalid'
  | 'id_duplicated'
  | 'order_mismatch'
  | 'reference_dangling'
  | 'reference_duplicated'
  | 'reference_source_missing'
  | 'relation_missing'
  | 'dependency_cycle'
  | 'dependency_invalid'
  | 'format_invalid'
  | 'duration_invalid'
  | 'limit_exceeded'
  | 'constraints_incompatible'
  | 'production_empty'
  | 'scene_duration_missing'
  | 'shot_duration_missing'
  | 'scene_duration_mismatch'
  | 'duration_total_mismatch';

export type ValidationProblem = FilmmakerIssue<ValidationCode>;

export type ValidationStage = 'draft' | 'ready';

export interface ValidationResult {
  /** Sin ningún problema de gravedad `error`. */
  readonly valid: boolean;
  readonly stage: ValidationStage;
  readonly problems: readonly ValidationProblem[];
}

export const claveDeMensaje = (area: 'validation' | 'operation' | 'recommendation' | 'requirement', code: string): string =>
  `filmmaker.${area}.${code}`;

/**
 * LOS PROBLEMAS DE FORMA: los que hacen que la producción esté ROTA, no a medias.
 * Una operación nunca parte de una producción así ni la deja así.
 */
export const CODIGOS_DE_INTEGRIDAD: ReadonlySet<ValidationCode> = new Set<ValidationCode>([
  'shape_invalid', 'field_unknown', 'field_forbidden', 'value_invalid', 'id_invalid', 'id_duplicated',
  'order_mismatch', 'reference_dangling', 'reference_duplicated', 'reference_source_missing',
  'dependency_cycle', 'dependency_invalid', 'format_invalid', 'duration_invalid', 'limit_exceeded',
]);

/* ── Herramientas ─────────────────────────────────────────────────────────── */

type Tipo = 'scene' | 'shot' | 'line' | 'character' | 'location' | 'object' | 'reference' | 'cue' | 'export' | 'marker';

interface Ctx {
  readonly etapa: ValidationStage;
  readonly p: ValidationProblem[];
  readonly ids: Map<string, { readonly tipo: Tipo; readonly ruta: string }>;
  /** Id de referencia → su tipo de material y su papel, para cruzarlos. */
  readonly referencias: Map<string, { readonly kind: unknown; readonly role: unknown }>;
  aspecto: unknown;
}

type Obj = Record<string, unknown>;
const esObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const esNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const lista = (v: unknown): readonly unknown[] => (Array.isArray(v) ? v : []);
const unir = (ruta: string, clave: string | number): string => (ruta ? `${ruta}.${clave}` : String(clave));
/** El tramo de ruta de un elemento de una lista: su id, o su posición si no tiene uno válido. */
const tramo = (item: unknown, i: number): string => (esObj(item) && esId(item.id) ? item.id : `#${i}`);
const recorte = (v: string): string => (v.length > 64 ? v.slice(0, 64) : v);

const mal = (c: Ctx, code: ValidationCode, severity: Severity, path: string, parameters: Params = {}): void => {
  c.p.push({ code, severity, path, parameters, messageKey: claveDeMensaje('validation', code) });
};

/** Lo que depende de la etapa: un aviso en un borrador, un error cuando se va a pedir. */
const segunEtapa = (c: Ctx): Severity => (c.etapa === 'ready' ? 'error' : 'warning');

const PELIGROSAS = ['__proto__', 'constructor', 'prototype'];

/**
 * LAS CLAVES DE UN NODO: cerradas. Lo peligroso y lo prohibido por el Core se
 * dice como `field_forbidden`; lo que simplemente no existe, como
 * `field_unknown`. `admitida` es la única clave prohibida que un nodo concreto
 * sí puede llevar: `prompt`, y solo dentro de `advanced`.
 */
const claves = (c: Ctx, o: Obj, permitidas: readonly string[], ruta: string, admitida?: string): void => {
  for (const k of Object.keys(o)) {
    if (PELIGROSAS.includes(k)) { mal(c, 'field_forbidden', 'error', unir(ruta, k), { field: k, reason: 'dangerous_key' }); continue; }
    if (k !== admitida && claveProhibidaDeNodo(k)) { mal(c, 'field_forbidden', 'error', unir(ruta, k), { field: k }); continue; }
    if (!permitidas.includes(k)) mal(c, 'field_unknown', 'error', unir(ruta, k), { field: k });
  }
};

const objeto = (c: Ctx, v: unknown, ruta: string, obligatorio = false): v is Obj => {
  if (v === undefined) { if (obligatorio) mal(c, 'shape_invalid', 'error', ruta, { expected: 'object' }); return false; }
  if (!esObj(v)) { mal(c, 'shape_invalid', 'error', ruta, { expected: 'object' }); return false; }
  return true;
};

const arreglo = (c: Ctx, v: unknown, ruta: string, max: number, obligatorio = false): v is readonly unknown[] => {
  if (v === undefined) { if (obligatorio) mal(c, 'shape_invalid', 'error', ruta, { expected: 'list' }); return false; }
  if (!Array.isArray(v)) { mal(c, 'shape_invalid', 'error', ruta, { expected: 'list' }); return false; }
  if (v.length > max) mal(c, 'limit_exceeded', 'error', ruta, { max });
  return true;
};

const texto = (c: Ctx, v: unknown, ruta: string, max: number, obligatorio = false): void => {
  if (v === undefined) { if (obligatorio) mal(c, 'value_invalid', 'error', ruta, { reason: 'required' }); return; }
  if (typeof v !== 'string') { mal(c, 'value_invalid', 'error', ruta, { reason: 'not_text' }); return; }
  if (v.trim().length === 0) { mal(c, 'value_invalid', 'error', ruta, { reason: 'empty' }); return; }
  if (v.length > max) mal(c, 'value_invalid', 'error', ruta, { reason: 'too_long', max });
};

const textos = (c: Ctx, v: unknown, ruta: string, maxItems: number, maxLargo: number): void => {
  if (!arreglo(c, v, ruta, maxItems)) return;
  v.forEach((x, i) => texto(c, x, unir(ruta, i), maxLargo, true));
};

const uno = (
  c: Ctx, v: unknown, vocabulario: readonly string[], ruta: string,
  code: ValidationCode = 'value_invalid', obligatorio = false,
): void => {
  if (v === undefined) { if (obligatorio) mal(c, code, 'error', ruta, { reason: 'required' }); return; }
  if (typeof v !== 'string' || !vocabulario.includes(v)) {
    mal(c, code, 'error', ruta, { reason: 'not_in_vocabulary', value: typeof v === 'string' ? recorte(v) : typeof v });
  }
};

const booleano = (c: Ctx, v: unknown, ruta: string, obligatorio = false): void => {
  if (v === undefined) { if (obligatorio) mal(c, 'value_invalid', 'error', ruta, { reason: 'required' }); return; }
  if (typeof v !== 'boolean') mal(c, 'value_invalid', 'error', ruta, { reason: 'not_boolean' });
};

const numero = (c: Ctx, v: unknown, ruta: string, min: number, max: number, entero = false, obligatorio = false): void => {
  if (v === undefined) { if (obligatorio) mal(c, 'value_invalid', 'error', ruta, { reason: 'required' }); return; }
  if (!esNum(v) || v < min || v > max || (entero && !Number.isInteger(v))) {
    mal(c, 'value_invalid', 'error', ruta, { reason: 'out_of_range', min, max });
  }
};

/** Una duración con sentido para el dominio. Lo que dure un plano como mucho lo decide quien lo genere. */
const duracionValida = (v: unknown, max: number): v is number =>
  esNum(v) && v >= LIMITES.duracionMinimaSec && v <= max;

const duracion = (c: Ctx, v: unknown, ruta: string, max: number): void => {
  if (v === undefined) return;
  if (!duracionValida(v, max)) mal(c, 'duration_invalid', 'error', ruta, { min: LIMITES.duracionMinimaSec, max });
};

/** Un idioma: una etiqueta BCP 47 ya normalizada, con la misma regla que el Core. */
const idioma = (c: Ctx, v: unknown, ruta: string): void => {
  if (v === undefined) return;
  const n = normalizarEtiqueta(v);
  if (n === null) { mal(c, 'value_invalid', 'error', ruta, { reason: 'not_a_language_tag' }); return; }
  if (n !== v) mal(c, 'value_invalid', 'error', ruta, { reason: 'not_normalized', expected: n });
};

const COLOR = /^#[0-9A-Fa-f]{6}$/;
const paleta = (c: Ctx, v: unknown, ruta: string): void => {
  if (!arreglo(c, v, ruta, LIMITES.paleta)) return;
  v.forEach((x, i) => { if (typeof x !== 'string' || !COLOR.test(x)) mal(c, 'value_invalid', 'error', unir(ruta, i), { reason: 'not_a_color' }); });
};

const vinculo = (c: Ctx, v: unknown, ruta: string): void => {
  if (v === undefined) return;
  if (!anclajeValido(v)) mal(c, 'value_invalid', 'error', ruta, { reason: 'invalid_binding' });
};

/** Una referencia a algo de la producción, del tipo que toca. */
const ref = (c: Ctx, id: unknown, ruta: string, tipos: readonly Tipo[]): id is string => {
  if (!esId(id)) { mal(c, 'id_invalid', 'error', ruta); return false; }
  const e = c.ids.get(id);
  if (!e || !tipos.includes(e.tipo)) { mal(c, 'reference_dangling', 'error', ruta, { id, expected: [...tipos] }); return false; }
  return true;
};

/** Una lista de referencias: sin repetidos y sin colgar. Devuelve las buenas. */
const refs = (
  c: Ctx, v: unknown, ruta: string, tipos: readonly Tipo[], max: number,
  codigoDeLimite: ValidationCode = 'limit_exceeded',
): readonly string[] => {
  if (v === undefined) return [];
  if (!Array.isArray(v)) { mal(c, 'shape_invalid', 'error', ruta, { expected: 'list' }); return []; }
  if (v.length > max) mal(c, codigoDeLimite, 'error', ruta, { max });
  const vistos = new Set<string>();
  const buenas: string[] = [];
  v.forEach((x, i) => {
    const r = unir(ruta, i);
    if (esId(x) && vistos.has(x)) { mal(c, 'reference_duplicated', 'error', r, { id: x }); return; }
    if (esId(x)) vistos.add(x);
    if (ref(c, x, r, tipos)) buenas.push(x);
  });
  return buenas;
};

/* ── Primera pasada: el espacio de nombres ───────────────────────────────── */

/*
 * Antes de mirar ninguna referencia hay que saber qué existe: una escena puede
 * nombrar a un personaje que se declara después. Esta pasada solo registra ids,
 * y es la que detecta los inválidos y los repetidos.
 */
const registrar = (c: Ctx, item: unknown, i: number, tipo: Tipo, rutaDeLista: string): void => {
  if (!esObj(item)) return;
  const ruta = unir(rutaDeLista, tramo(item, i));
  if (!esId(item.id)) { mal(c, 'id_invalid', 'error', unir(ruta, 'id'), { index: i }); return; }
  const ya = c.ids.get(item.id);
  if (ya) { mal(c, 'id_duplicated', 'error', unir(ruta, 'id'), { id: item.id, firstPath: ya.ruta, index: i }); return; }
  c.ids.set(item.id, { tipo, ruta });
};

const primeraPasada = (c: Ctx, o: Obj): void => {
  lista(o.scenes).forEach((s, i) => {
    registrar(c, s, i, 'scene', 'scenes');
    if (!esObj(s)) return;
    const rs = unir('scenes', tramo(s, i));
    lista(s.dialogue).forEach((l, j) => registrar(c, l, j, 'line', unir(rs, 'dialogue')));
    lista(s.shots).forEach((p, j) => {
      registrar(c, p, j, 'shot', unir(rs, 'shots'));
      if (!esObj(p)) return;
      const rp = unir(unir(rs, 'shots'), tramo(p, j));
      lista(p.dialogue).forEach((l, k) => registrar(c, l, k, 'line', unir(rp, 'dialogue')));
    });
  });
  lista(o.characters).forEach((x, i) => registrar(c, x, i, 'character', 'characters'));
  lista(o.locations).forEach((x, i) => registrar(c, x, i, 'location', 'locations'));
  lista(o.objects).forEach((x, i) => registrar(c, x, i, 'object', 'objects'));
  lista(o.references).forEach((x, i) => {
    registrar(c, x, i, 'reference', 'references');
    if (esObj(x) && esId(x.id) && !c.referencias.has(x.id)) c.referencias.set(x.id, { kind: x.kind, role: x.role });
  });
  if (esObj(o.audio)) lista(o.audio.cues).forEach((x, i) => registrar(c, x, i, 'cue', 'audio.cues'));
  if (esObj(o.exportPlan)) lista(o.exportPlan.targets).forEach((x, i) => registrar(c, x, i, 'export', 'exportPlan.targets'));
  if (esObj(o.editPlan)) lista(o.editPlan.markers).forEach((x, i) => registrar(c, x, i, 'marker', 'editPlan.markers'));
};

/* ── Segunda pasada: cada nodo ────────────────────────────────────────────── */

const ENTIDADES: readonly Tipo[] = ['character', 'location', 'object'];

/**
 * LA INTENCIÓN CREATIVA, con el validador del Core. Sus motivos se traducen a
 * los códigos de aquí y se conservan en `parameters.reason`.
 */
const creativo = (c: Ctx, v: unknown, ruta: string): void => {
  if (v === undefined) return;
  for (const pr of validarCreativos(v)) {
    const sub = pr.path === 'creative' ? '' : pr.path.startsWith('creative.') ? pr.path.slice('creative.'.length) : pr.path;
    const ultimo = sub.split('.').pop() ?? '';
    const code: ValidationCode = pr.reason === 'invalid_shape' ? 'shape_invalid'
      : pr.reason === 'dangerous_key' ? 'field_forbidden'
        : pr.reason === 'unknown_field' ? (claveProhibidaDeNodo(ultimo) ? 'field_forbidden' : 'field_unknown')
          : pr.reason === 'incoherent' ? 'constraints_incompatible'
            : 'value_invalid';
    mal(c, code, 'error', sub ? unir(ruta, sub) : ruta, { reason: pr.reason });
  }
  /* El encuadre de un plano es el formato de la producción: dos proporciones a la vez no se pueden rodar. */
  const encuadre = esObj(v) && esObj(v.framing) ? v.framing.aspectRatio : undefined;
  if (encuadre !== undefined && c.aspecto !== undefined && encuadre !== c.aspecto) {
    mal(c, 'constraints_incompatible', 'error', unir(ruta, 'framing.aspectRatio'), { reason: 'framing_differs_from_format' });
  }
};

const REGLA = ['preserve', 'mayChange', 'strength', 'anchors', 'spatial'];
const RELACION_ESPACIAL = ['subject', 'relation', 'object'];

/** La continuidad: las listas y la fuerza las revisa el Core; los anclajes, aquí, con los ids de la producción. */
const regla = (c: Ctx, v: unknown, ruta: string): void => {
  if (!objeto(c, v, ruta)) return;
  claves(c, v, REGLA, ruta);
  const nucleo: Obj = {};
  for (const k of ['preserve', 'mayChange', 'strength']) if (v[k] !== undefined) nucleo[k] = v[k];
  for (const pr of validarContinuidad(nucleo)) {
    const code: ValidationCode = pr.reason === 'invalid_shape' ? 'shape_invalid'
      : pr.reason === 'forbidden_key' || pr.reason === 'dangerous_key' ? 'field_forbidden'
        : pr.reason === 'too_many' ? 'limit_exceeded'
          : pr.reason === 'conflicting_aspect' ? 'constraints_incompatible'
            : 'value_invalid';
    mal(c, code, 'error', unir(ruta, pr.field), { reason: pr.reason });
  }
  refs(c, v.anchors, unir(ruta, 'anchors'), ENTIDADES, LIMITES.anclajes);
  if (!arreglo(c, v.spatial, unir(ruta, 'spatial'), LIMITES.relacionesEspaciales)) return;
  v.spatial.forEach((r, i) => {
    const rr = unir(unir(ruta, 'spatial'), i);
    if (!objeto(c, r, rr, true)) return;
    claves(c, r, RELACION_ESPACIAL, rr);
    ref(c, r.subject, unir(rr, 'subject'), ENTIDADES);
    ref(c, r.object, unir(rr, 'object'), ENTIDADES);
    uno(c, r.relation, RELACIONES_ESPACIALES, unir(rr, 'relation'), 'value_invalid', true);
    if (r.subject !== undefined && r.subject === r.object) mal(c, 'value_invalid', 'error', rr, { reason: 'self_relation' });
  });
};

const VISUAL = ['creative', 'style', 'mood'];
const visual = (c: Ctx, v: unknown, ruta: string): void => {
  if (!objeto(c, v, ruta)) return;
  claves(c, v, VISUAL, ruta);
  creativo(c, v.creative, unir(ruta, 'creative'));
  texto(c, v.style, unir(ruta, 'style'), LIMITES.frase);
  texto(c, v.mood, unir(ruta, 'mood'), LIMITES.frase);
};

const DIRECCION_DE_AUDIO = ['notes', 'withSound'];
const direccionDeAudio = (c: Ctx, v: unknown, ruta: string): void => {
  if (!objeto(c, v, ruta)) return;
  claves(c, v, DIRECCION_DE_AUDIO, ruta);
  texto(c, v.notes, unir(ruta, 'notes'), LIMITES.frase);
  booleano(c, v.withSound, unir(ruta, 'withSound'));
};

const LINEA = ['id', 'kind', 'characterId', 'text', 'language', 'emotion', 'estimatedSec'];
const lineas = (c: Ctx, v: unknown, ruta: string): readonly { readonly l: Obj; readonly ruta: string }[] => {
  if (!arreglo(c, v, ruta, LIMITES.lineasPorBloque)) return [];
  const buenas: { l: Obj; ruta: string }[] = [];
  v.forEach((l, i) => {
    const r = unir(ruta, tramo(l, i));
    if (!objeto(c, l, r, true)) return;
    buenas.push({ l, ruta: r });
    claves(c, l, LINEA, r);
    uno(c, l.kind, TIPOS_DE_LINEA, unir(r, 'kind'), 'value_invalid', true);
    texto(c, l.text, unir(r, 'text'), LIMITES.linea, true);
    if (l.kind === 'narration') {
      if (l.characterId !== undefined) mal(c, 'constraints_incompatible', 'error', unir(r, 'characterId'), { reason: 'narration_has_no_speaker' });
    } else if (l.kind === 'dialogue' || l.kind === 'voiceover') {
      if (l.characterId === undefined) mal(c, 'value_invalid', 'error', unir(r, 'characterId'), { reason: 'required' });
      else ref(c, l.characterId, unir(r, 'characterId'), ['character']);
    }
    idioma(c, l.language, unir(r, 'language'));
    texto(c, l.emotion, unir(r, 'emotion'), LIMITES.frase);
    duracion(c, l.estimatedSec, unir(r, 'estimatedSec'), LIMITES.planoMaxSec);
  });
  return buenas;
};

const ESTADO = ['characterId', 'wardrobe', 'appearanceNotes'];
const estados = (c: Ctx, v: unknown, ruta: string): readonly Obj[] => {
  if (!arreglo(c, v, ruta, LIMITES.personajes)) return [];
  const vistos = new Set<string>();
  const buenos: Obj[] = [];
  v.forEach((e, i) => {
    const r = unir(ruta, i);
    if (!objeto(c, e, r, true)) return;
    claves(c, e, ESTADO, r);
    if (!ref(c, e.characterId, unir(r, 'characterId'), ['character'])) return;
    if (vistos.has(e.characterId)) { mal(c, 'reference_duplicated', 'error', unir(r, 'characterId'), { id: e.characterId }); return; }
    vistos.add(e.characterId);
    texto(c, e.wardrobe, unir(r, 'wardrobe'), LIMITES.frase);
    texto(c, e.appearanceNotes, unir(r, 'appearanceNotes'), LIMITES.frase);
    if (e.wardrobe === undefined && e.appearanceNotes === undefined) mal(c, 'value_invalid', 'error', r, { reason: 'empty_state' });
    buenos.push(e);
  });
  return buenos;
};

const SUJETO = ['characterId', 'objectId', 'focus', 'description'];
const sujeto = (c: Ctx, v: unknown, ruta: string): void => {
  if (!objeto(c, v, ruta)) return;
  claves(c, v, SUJETO, ruta);
  if (v.characterId !== undefined) ref(c, v.characterId, unir(ruta, 'characterId'), ['character']);
  if (v.objectId !== undefined) ref(c, v.objectId, unir(ruta, 'objectId'), ['object']);
  if (v.characterId !== undefined && v.objectId !== undefined) {
    mal(c, 'constraints_incompatible', 'error', ruta, { reason: 'two_subjects' });
  }
  uno(c, v.focus, ENFOQUES, unir(ruta, 'focus'));
  texto(c, v.description, unir(ruta, 'description'), LIMITES.texto);
};

/** Las referencias de un plano: sin colgar, y como mucho un primer y un último fotograma. */
const referenciasDePlano = (c: Ctx, v: unknown, ruta: string): void => {
  const buenas = refs(c, v, ruta, ['reference'], LIMITES.referenciasPorCosa);
  for (const papel of ['first_frame', 'last_frame']) {
    const n = buenas.filter((id) => c.referencias.get(id)?.role === papel).length;
    if (n > 1) mal(c, 'constraints_incompatible', 'error', ruta, { reason: 'more_than_one_frame', role: papel });
  }
};

/** Quién puede aparecer en un sitio: si no se declara, no se restringe. */
const pertenece = (id: unknown, visibles: ReadonlySet<string> | undefined): boolean =>
  visibles === undefined || (typeof id === 'string' && visibles.has(id));

const PLANO = [
  'id', 'order', 'durationSec', 'description', 'visual', 'subject', 'characterIds', 'objectIds', 'characterStates',
  'actions', 'dialogue', 'audio', 'referenceIds', 'continuity', 'dependsOn', 'generation', 'advanced',
];

const plano = (c: Ctx, p: unknown, j: number, rutaDeEscena: string, reparto: ReadonlySet<string> | undefined): void => {
  const r = unir(unir(rutaDeEscena, 'shots'), tramo(p, j));
  if (!objeto(c, p, r, true)) return;
  claves(c, p, PLANO, r);
  if (p.order !== j) mal(c, 'order_mismatch', 'error', unir(r, 'order'), { expected: j });
  duracion(c, p.durationSec, unir(r, 'durationSec'), LIMITES.planoMaxSec);
  texto(c, p.description, unir(r, 'description'), LIMITES.texto);
  visual(c, p.visual, unir(r, 'visual'));
  sujeto(c, p.subject, unir(r, 'subject'));
  const personajes = refs(c, p.characterIds, unir(r, 'characterIds'), ['character'], LIMITES.elementosPorBloque);
  const objetos = refs(c, p.objectIds, unir(r, 'objectIds'), ['object'], LIMITES.elementosPorBloque);
  if (personajes.length + objetos.length > LIMITES.elementosPorBloque) {
    mal(c, 'limit_exceeded', 'error', r, { reason: 'too_many_elements', max: LIMITES.elementosPorBloque });
  }
  const estadosDelPlano = estados(c, p.characterStates, unir(r, 'characterStates'));
  textos(c, p.actions, unir(r, 'actions'), LIMITES.accionesPorBloque, LIMITES.frase);
  const lineasDelPlano = lineas(c, p.dialogue, unir(r, 'dialogue'));
  direccionDeAudio(c, p.audio, unir(r, 'audio'));
  referenciasDePlano(c, p.referenceIds, unir(r, 'referenceIds'));
  regla(c, p.continuity, unir(r, 'continuity'));
  refs(c, p.dependsOn, unir(r, 'dependsOn'), ['shot'], LIMITES.dependencias, 'dependency_invalid');
  if (objeto(c, p.generation, unir(r, 'generation'))) {
    claves(c, p.generation, ['quality'], unir(r, 'generation'));
    uno(c, p.generation.quality, CALIDADES, unir(r, 'generation.quality'));
  }
  if (objeto(c, p.advanced, unir(r, 'advanced'))) {
    claves(c, p.advanced, ['prompt'], unir(r, 'advanced'), 'prompt');
    texto(c, p.advanced.prompt, unir(r, 'advanced.prompt'), LIMITES.textoLibre, true);
  }

  /*
   * ── Quién está, de verdad, en el plano ───────────────────────────────────
   * Si la escena declara su reparto, el plano no puede sacar a nadie más. Y lo
   * que el plano mira, quien habla a cámara y de quién se dice cómo va, tienen
   * que estar en él. Son avisos: la producción no está rota, está incoherente.
   */
  if (reparto) {
    for (const id of personajes) if (!reparto.has(id)) mal(c, 'relation_missing', 'warning', unir(r, 'characterIds'), { reason: 'not_in_scene_cast', characterId: id });
  }
  const visibles: ReadonlySet<string> | undefined = p.characterIds !== undefined ? new Set(personajes) : reparto;
  const objetosVisibles: ReadonlySet<string> | undefined = p.objectIds !== undefined ? new Set(objetos) : undefined;
  if (esObj(p.subject)) {
    if (p.subject.characterId !== undefined && !pertenece(p.subject.characterId, visibles)) {
      mal(c, 'relation_missing', 'warning', unir(r, 'subject.characterId'), { reason: 'subject_not_in_shot', characterId: String(p.subject.characterId) });
    }
    if (p.subject.objectId !== undefined && !pertenece(p.subject.objectId, objetosVisibles)) {
      mal(c, 'relation_missing', 'warning', unir(r, 'subject.objectId'), { reason: 'subject_not_in_shot', objectId: String(p.subject.objectId) });
    }
  }
  for (const { l, ruta: rl } of lineasDelPlano) {
    if (l.kind === 'dialogue' && l.characterId !== undefined && !pertenece(l.characterId, visibles)) {
      mal(c, 'relation_missing', 'warning', unir(rl, 'characterId'), { reason: 'speaker_not_in_shot', characterId: String(l.characterId) });
    }
  }
  for (const e of estadosDelPlano) {
    if (!pertenece(e.characterId, visibles)) {
      mal(c, 'relation_missing', 'warning', unir(r, 'characterStates'), { reason: 'state_for_absent_character', characterId: String(e.characterId) });
    }
  }
};

const ESCENA = [
  'id', 'order', 'title', 'description', 'narrativePurpose', 'durationSec', 'timeOfDay', 'weather', 'locationId',
  'characterIds', 'objectIds', 'characterStates', 'actions', 'dialogue', 'visual', 'audio', 'continuity', 'dependsOn', 'shots',
];

const escena = (c: Ctx, s: unknown, i: number): void => {
  const r = unir('scenes', tramo(s, i));
  if (!objeto(c, s, r, true)) return;
  claves(c, s, ESCENA, r);
  if (s.order !== i) mal(c, 'order_mismatch', 'error', unir(r, 'order'), { expected: i });
  texto(c, s.title, unir(r, 'title'), LIMITES.nombre);
  texto(c, s.description, unir(r, 'description'), LIMITES.texto);
  uno(c, s.narrativePurpose, PROPOSITOS_NARRATIVOS, unir(r, 'narrativePurpose'));
  duracion(c, s.durationSec, unir(r, 'durationSec'), LIMITES.escenaMaxSec);
  uno(c, s.timeOfDay, MOMENTOS_DEL_DIA, unir(r, 'timeOfDay'));
  uno(c, s.weather, CLIMAS, unir(r, 'weather'));
  if (s.locationId !== undefined) ref(c, s.locationId, unir(r, 'locationId'), ['location']);
  const reparto = refs(c, s.characterIds, unir(r, 'characterIds'), ['character'], LIMITES.elementosPorBloque);
  const objetos = refs(c, s.objectIds, unir(r, 'objectIds'), ['object'], LIMITES.elementosPorBloque);
  if (reparto.length + objetos.length > LIMITES.elementosPorBloque) {
    mal(c, 'limit_exceeded', 'error', r, { reason: 'too_many_elements', max: LIMITES.elementosPorBloque });
  }
  const estadosDeLaEscena = estados(c, s.characterStates, unir(r, 'characterStates'));
  textos(c, s.actions, unir(r, 'actions'), LIMITES.accionesPorBloque, LIMITES.frase);
  const lineasDeLaEscena = lineas(c, s.dialogue, unir(r, 'dialogue'));
  visual(c, s.visual, unir(r, 'visual'));
  direccionDeAudio(c, s.audio, unir(r, 'audio'));
  regla(c, s.continuity, unir(r, 'continuity'));
  refs(c, s.dependsOn, unir(r, 'dependsOn'), ['scene'], LIMITES.dependencias, 'dependency_invalid');

  const conReparto = s.characterIds !== undefined ? new Set(reparto) : undefined;
  if (arreglo(c, s.shots, unir(r, 'shots'), LIMITES.planosPorEscena, true)) {
    s.shots.forEach((p, j) => plano(c, p, j, r, conReparto));
  }

  /*
   * Quién anda por la escena: su reparto, más quien salga en alguno de sus
   * planos. Si nadie ha declarado a nadie, no hay nada con qué cotejar.
   */
  const declarada = s.characterIds !== undefined || lista(s.shots).some((p) => esObj(p) && p.characterIds !== undefined);
  if (!declarada) return;
  const enLaEscena = new Set<string>(reparto);
  for (const p of lista(s.shots)) if (esObj(p)) for (const id of lista(p.characterIds)) if (typeof id === 'string') enLaEscena.add(id);
  for (const { l, ruta: rl } of lineasDeLaEscena) {
    if (l.kind === 'dialogue' && l.characterId !== undefined && !enLaEscena.has(String(l.characterId))) {
      mal(c, 'relation_missing', 'warning', unir(rl, 'characterId'), { reason: 'speaker_not_in_scene', characterId: String(l.characterId) });
    }
  }
  for (const e of estadosDeLaEscena) {
    if (!enLaEscena.has(String(e.characterId))) {
      mal(c, 'relation_missing', 'warning', unir(r, 'characterStates'), { reason: 'state_for_absent_character', characterId: String(e.characterId) });
    }
  }
};

const RASGO = ['description', 'referenceIds'];
const COLORES = ['description', 'referenceIds', 'palette'];
const apariencia = (c: Ctx, v: unknown, ruta: string): void => {
  if (!objeto(c, v, ruta)) return;
  claves(c, v, RASGOS, ruta);
  for (const rasgo of RASGOS) {
    const r = unir(ruta, rasgo);
    const t = v[rasgo];
    if (!objeto(c, t, r)) continue;
    claves(c, t, rasgo === 'colors' ? COLORES : RASGO, r);
    texto(c, t.description, unir(r, 'description'), LIMITES.texto);
    refs(c, t.referenceIds, unir(r, 'referenceIds'), ['reference'], LIMITES.referenciasPorCosa);
    if (rasgo === 'colors') paleta(c, t.palette, unir(r, 'palette'));
  }
};

const VOZ = ['description', 'referenceId', 'language'];
const voz = (c: Ctx, v: unknown, ruta: string): void => {
  if (!objeto(c, v, ruta)) return;
  claves(c, v, VOZ, ruta);
  texto(c, v.description, unir(ruta, 'description'), LIMITES.texto);
  if (v.referenceId !== undefined && ref(c, v.referenceId, unir(ruta, 'referenceId'), ['reference'])) {
    if (c.referencias.get(v.referenceId)?.kind !== 'audio') {
      mal(c, 'constraints_incompatible', 'error', unir(ruta, 'referenceId'), { reason: 'voice_reference_not_audio' });
    }
  }
  idioma(c, v.language, unir(ruta, 'language'));
};

const PERSONAJE = [
  'id', 'name', 'identityDescription', 'apparentAge', 'physicalCharacteristics', 'appearance', 'referenceIds',
  'voice', 'relationships', 'continuity', 'element',
];
const RELACION = ['characterId', 'kind', 'description'];

const personaje = (c: Ctx, x: unknown, i: number): void => {
  const r = unir('characters', tramo(x, i));
  if (!objeto(c, x, r, true)) return;
  claves(c, x, PERSONAJE, r);
  texto(c, x.name, unir(r, 'name'), LIMITES.nombre, true);
  texto(c, x.identityDescription, unir(r, 'identityDescription'), LIMITES.texto);
  if (objeto(c, x.apparentAge, unir(r, 'apparentAge'))) {
    const e = x.apparentAge;
    claves(c, e, ['minYears', 'maxYears'], unir(r, 'apparentAge'));
    numero(c, e.minYears, unir(r, 'apparentAge.minYears'), 0, LIMITES.edadMaxima);
    numero(c, e.maxYears, unir(r, 'apparentAge.maxYears'), 0, LIMITES.edadMaxima);
    if (esNum(e.minYears) && esNum(e.maxYears) && e.minYears > e.maxYears) {
      mal(c, 'constraints_incompatible', 'error', unir(r, 'apparentAge'), { reason: 'min_above_max' });
    }
  }
  textos(c, x.physicalCharacteristics, unir(r, 'physicalCharacteristics'), LIMITES.etiquetas, LIMITES.frase);
  apariencia(c, x.appearance, unir(r, 'appearance'));
  refs(c, x.referenceIds, unir(r, 'referenceIds'), ['reference'], LIMITES.referenciasPorCosa);
  voz(c, x.voice, unir(r, 'voice'));
  if (arreglo(c, x.relationships, unir(r, 'relationships'), LIMITES.relaciones)) {
    const vistas = new Set<string>();
    x.relationships.forEach((rel, k) => {
      const rr = unir(unir(r, 'relationships'), k);
      if (!objeto(c, rel, rr, true)) return;
      claves(c, rel, RELACION, rr);
      uno(c, rel.kind, RELACIONES_ENTRE_PERSONAJES, unir(rr, 'kind'), 'value_invalid', true);
      texto(c, rel.description, unir(rr, 'description'), LIMITES.frase);
      if (!ref(c, rel.characterId, unir(rr, 'characterId'), ['character'])) return;
      if (rel.characterId === x.id) { mal(c, 'value_invalid', 'error', unir(rr, 'characterId'), { reason: 'self_relation' }); return; }
      const clave = `${rel.characterId}|${String(rel.kind)}`;
      if (vistas.has(clave)) mal(c, 'reference_duplicated', 'error', rr, { id: rel.characterId });
      vistas.add(clave);
    });
  }
  if (objeto(c, x.continuity, unir(r, 'continuity'))) {
    claves(c, x.continuity, ['locked', 'strength'], unir(r, 'continuity'));
    const locked = x.continuity.locked;
    if (arreglo(c, locked, unir(r, 'continuity.locked'), RASGOS.length)) {
      const vistos = new Set<unknown>();
      locked.forEach((k, j) => {
        uno(c, k, RASGOS, unir(r, `continuity.locked.${j}`), 'value_invalid', true);
        if (vistos.has(k)) mal(c, 'reference_duplicated', 'error', unir(r, `continuity.locked.${j}`), { id: String(k) });
        vistos.add(k);
      });
    }
    uno(c, x.continuity.strength, FUERZAS_DE_CONTINUIDAD, unir(r, 'continuity.strength'));
  }
  vinculo(c, x.element, unir(r, 'element'));
};

const LUGAR = ['id', 'name', 'description', 'setting', 'appearance', 'referenceIds', 'element'];
const lugar = (c: Ctx, x: unknown, i: number): void => {
  const r = unir('locations', tramo(x, i));
  if (!objeto(c, x, r, true)) return;
  claves(c, x, LUGAR, r);
  texto(c, x.name, unir(r, 'name'), LIMITES.nombre, true);
  texto(c, x.description, unir(r, 'description'), LIMITES.texto);
  uno(c, x.setting, AMBIENTES, unir(r, 'setting'));
  apariencia(c, x.appearance, unir(r, 'appearance'));
  refs(c, x.referenceIds, unir(r, 'referenceIds'), ['reference'], LIMITES.referenciasPorCosa);
  vinculo(c, x.element, unir(r, 'element'));
};

const OBJETO = ['id', 'name', 'kind', 'description', 'appearance', 'referenceIds', 'element'];
const cosa = (c: Ctx, x: unknown, i: number): void => {
  const r = unir('objects', tramo(x, i));
  if (!objeto(c, x, r, true)) return;
  claves(c, x, OBJETO, r);
  texto(c, x.name, unir(r, 'name'), LIMITES.nombre, true);
  uno(c, x.kind, TIPOS_DE_OBJETO, unir(r, 'kind'));
  texto(c, x.description, unir(r, 'description'), LIMITES.texto);
  apariencia(c, x.appearance, unir(r, 'appearance'));
  refs(c, x.referenceIds, unir(r, 'referenceIds'), ['reference'], LIMITES.referenciasPorCosa);
  vinculo(c, x.element, unir(r, 'element'));
};

/** Qué papel exige qué material: un fotograma es una imagen, una voz es audio, un movimiento es vídeo. */
const MATERIAL_DEL_PAPEL: Readonly<Record<string, string>> = {
  first_frame: 'image', last_frame: 'image', audio: 'audio', motion: 'video',
};

const REFERENCIA = ['id', 'kind', 'role', 'assetId', 'element', 'description'];
const referencia = (c: Ctx, x: unknown, i: number, porMaterial: Map<string, string>): void => {
  const r = unir('references', tramo(x, i));
  if (!objeto(c, x, r, true)) return;
  claves(c, x, REFERENCIA, r);
  uno(c, x.kind, TIPOS_DE_MATERIAL, unir(r, 'kind'), 'value_invalid', true);
  uno(c, x.role, PAPELES_DE_REFERENCIA, unir(r, 'role'));
  if (x.assetId !== undefined && !esId(x.assetId)) mal(c, 'id_invalid', 'error', unir(r, 'assetId'));
  vinculo(c, x.element, unir(r, 'element'));
  texto(c, x.description, unir(r, 'description'), LIMITES.texto);
  if (x.assetId === undefined && x.element === undefined) mal(c, 'reference_source_missing', 'error', r);
  const exigido = typeof x.role === 'string' ? MATERIAL_DEL_PAPEL[x.role] : undefined;
  if (exigido !== undefined && x.kind !== exigido) {
    mal(c, 'constraints_incompatible', 'error', unir(r, 'kind'), { reason: 'kind_does_not_fit_role', expected: exigido });
  }
  /* El mismo material con el mismo papel dos veces no rompe nada, pero sobra. */
  if (esId(x.assetId)) {
    const clave = `${x.assetId}|${String(x.role ?? '')}`;
    const ya = porMaterial.get(clave);
    if (ya !== undefined) mal(c, 'reference_duplicated', 'warning', r, { reason: 'same_asset_and_role', firstPath: ya });
    else porMaterial.set(clave, r);
  }
};

const SONIDO = ['id', 'kind', 'description', 'target', 'durationSec', 'volume', 'referenceIds'];
const sonido = (c: Ctx, x: unknown, i: number): void => {
  const r = unir('audio.cues', tramo(x, i));
  if (!objeto(c, x, r, true)) return;
  claves(c, x, SONIDO, r);
  uno(c, x.kind, TIPOS_DE_SONIDO, unir(r, 'kind'), 'value_invalid', true);
  texto(c, x.description, unir(r, 'description'), LIMITES.texto, true);
  duracion(c, x.durationSec, unir(r, 'durationSec'), LIMITES.produccionMaxSec);
  numero(c, x.volume, unir(r, 'volume'), 0, 1);
  refs(c, x.referenceIds, unir(r, 'referenceIds'), ['reference'], LIMITES.referenciasPorCosa);
  const rt = unir(r, 'target');
  if (!objeto(c, x.target, rt, true)) return;
  const t = x.target;
  uno(c, t.scope, ['production', 'scenes', 'shot'], unir(rt, 'scope'), 'value_invalid', true);
  if (t.scope === 'production') claves(c, t, ['scope'], rt);
  if (t.scope === 'scenes') {
    claves(c, t, ['scope', 'sceneIds'], rt);
    if (!Array.isArray(t.sceneIds) || t.sceneIds.length === 0) mal(c, 'value_invalid', 'error', unir(rt, 'sceneIds'), { reason: 'required' });
    else refs(c, t.sceneIds, unir(rt, 'sceneIds'), ['scene'], LIMITES.escenas);
  }
  if (t.scope === 'shot') {
    claves(c, t, ['scope', 'shotId'], rt);
    ref(c, t.shotId, unir(rt, 'shotId'), ['shot']);
  }
};

const INTENCION = [
  'objective', 'productionType', 'audience', 'requestedDurationSec', 'aspectRatio', 'preset', 'tone', 'style',
  'theme', 'narrative', 'constraints', 'referenceIds', 'priorities', 'freeText',
];
const CAMPOS_DE_RESTRICCION: Readonly<Record<string, readonly string[]>> = {
  max_duration: ['kind', 'seconds'],
  min_duration: ['kind', 'seconds'],
  aspect_ratio: ['kind', 'aspectRatio'],
  no_dialogue: ['kind'],
  no_music: ['kind'],
  no_narration: ['kind'],
  include_character: ['kind', 'characterId'],
  note: ['kind', 'text'],
};

const intencion = (c: Ctx, v: unknown): void => {
  if (!objeto(c, v, 'intent', true)) return;
  claves(c, v, INTENCION, 'intent');
  texto(c, v.objective, 'intent.objective', LIMITES.texto);
  uno(c, v.productionType, TIPOS_DE_PRODUCCION, 'intent.productionType');
  texto(c, v.audience, 'intent.audience', LIMITES.texto);
  duracion(c, v.requestedDurationSec, 'intent.requestedDurationSec', LIMITES.produccionMaxSec);
  uno(c, v.aspectRatio, PROPORCIONES, 'intent.aspectRatio', 'format_invalid');
  uno(c, v.preset, PRESETS, 'intent.preset');
  for (const k of ['tone', 'style', 'theme', 'narrative']) texto(c, v[k], `intent.${k}`, LIMITES.texto);
  texto(c, v.freeText, 'intent.freeText', LIMITES.textoLibre);
  refs(c, v.referenceIds, 'intent.referenceIds', ['reference'], LIMITES.referenciasPorCosa);
  if (arreglo(c, v.priorities, 'intent.priorities', PRIORIDADES.length)) {
    const vistas = new Set<unknown>();
    v.priorities.forEach((x, i) => {
      uno(c, x, PRIORIDADES, `intent.priorities.${i}`, 'value_invalid', true);
      if (vistas.has(x)) mal(c, 'reference_duplicated', 'error', `intent.priorities.${i}`, { id: String(x) });
      vistas.add(x);
    });
  }
  if (arreglo(c, v.constraints, 'intent.constraints', LIMITES.restricciones)) {
    v.constraints.forEach((x, i) => {
      const r = `intent.constraints.${i}`;
      if (!objeto(c, x, r, true)) return;
      uno(c, x.kind, TIPOS_DE_RESTRICCION, unir(r, 'kind'), 'value_invalid', true);
      const campos = typeof x.kind === 'string' ? CAMPOS_DE_RESTRICCION[x.kind] : undefined;
      if (!campos) return;
      claves(c, x, campos, r);
      if (x.kind === 'max_duration' || x.kind === 'min_duration') {
        if (x.seconds === undefined) mal(c, 'value_invalid', 'error', unir(r, 'seconds'), { reason: 'required' });
        duracion(c, x.seconds, unir(r, 'seconds'), LIMITES.produccionMaxSec);
      }
      if (x.kind === 'aspect_ratio') uno(c, x.aspectRatio, PROPORCIONES, unir(r, 'aspectRatio'), 'format_invalid', true);
      if (x.kind === 'include_character') ref(c, x.characterId, unir(r, 'characterId'), ['character']);
      if (x.kind === 'note') texto(c, x.text, unir(r, 'text'), LIMITES.texto, true);
    });
  }
};

const DIRECCION = ['visualStyle', 'mood', 'tone', 'pacing', 'color', 'cinematography', 'referenceIds'];
const direccion = (c: Ctx, v: unknown): void => {
  if (!objeto(c, v, 'creativeDirection', true)) return;
  claves(c, v, DIRECCION, 'creativeDirection');
  for (const k of ['visualStyle', 'mood', 'tone']) texto(c, v[k], `creativeDirection.${k}`, LIMITES.frase);
  uno(c, v.pacing, RITMOS, 'creativeDirection.pacing');
  if (objeto(c, v.color, 'creativeDirection.color')) {
    claves(c, v.color, ['palette', 'grading'], 'creativeDirection.color');
    paleta(c, v.color.palette, 'creativeDirection.color.palette');
    texto(c, v.color.grading, 'creativeDirection.color.grading', LIMITES.frase);
  }
  creativo(c, v.cinematography, 'creativeDirection.cinematography');
  refs(c, v.referenceIds, 'creativeDirection.referenceIds', ['reference'], LIMITES.referenciasPorCosa);
};

const formato = (c: Ctx, v: unknown): void => {
  if (!objeto(c, v, 'format', true)) return;
  claves(c, v, ['aspectRatio', 'resolution', 'preset'], 'format');
  uno(c, v.aspectRatio, PROPORCIONES, 'format.aspectRatio', 'format_invalid', true);
  uno(c, v.resolution, RESOLUCIONES, 'format.resolution', 'format_invalid');
  uno(c, v.preset, PRESETS, 'format.preset', 'format_invalid');
};

const duracionDeProduccion = (c: Ctx, v: unknown): void => {
  if (!objeto(c, v, 'duration', true)) return;
  claves(c, v, ['targetSec', 'strict'], 'duration');
  duracion(c, v.targetSec, 'duration.targetSec', LIMITES.produccionMaxSec);
  booleano(c, v.strict, 'duration.strict');
};

const plan = (c: Ctx, v: unknown): void => {
  if (!objeto(c, v, 'audio', true)) return;
  claves(c, v, ['narrator', 'cues'], 'audio');
  voz(c, v.narrator, 'audio.narrator');
  if (arreglo(c, v.cues, 'audio.cues', LIMITES.sonidos, true)) v.cues.forEach((x, i) => sonido(c, x, i));
};

const generacion = (c: Ctx, v: unknown): void => {
  if (!objeto(c, v, 'generation', true)) return;
  claves(c, v, ['quality', 'preview'], 'generation');
  uno(c, v.quality, CALIDADES, 'generation.quality');
  uno(c, v.preview, PREVISUALIZACIONES, 'generation.preview');
};

const montaje = (c: Ctx, v: unknown): void => {
  if (!objeto(c, v, 'editPlan', true)) return;
  claves(c, v, ['tracks', 'subtitles', 'markers'], 'editPlan');
  if (arreglo(c, v.tracks, 'editPlan.tracks', PISTAS.length)) {
    const vistas = new Set<unknown>();
    v.tracks.forEach((t, i) => {
      const r = `editPlan.tracks.${i}`;
      if (!objeto(c, t, r, true)) return;
      claves(c, t, ['kind', 'muted', 'volume'], r);
      uno(c, t.kind, PISTAS, unir(r, 'kind'), 'value_invalid', true);
      if (vistas.has(t.kind)) mal(c, 'value_invalid', 'error', unir(r, 'kind'), { reason: 'duplicate_track' });
      vistas.add(t.kind);
      booleano(c, t.muted, unir(r, 'muted'));
      numero(c, t.volume, unir(r, 'volume'), 0, 1);
    });
  }
  if (objeto(c, v.subtitles, 'editPlan.subtitles')) {
    const s = v.subtitles;
    claves(c, s, ['enabled', 'language', 'position', 'style'], 'editPlan.subtitles');
    booleano(c, s.enabled, 'editPlan.subtitles.enabled', true);
    idioma(c, s.language, 'editPlan.subtitles.language');
    uno(c, s.position, POSICIONES_DE_SUBTITULO, 'editPlan.subtitles.position');
    uno(c, s.style, ESTILOS_DE_SUBTITULO, 'editPlan.subtitles.style');
  }
  if (arreglo(c, v.markers, 'editPlan.markers', LIMITES.marcas)) {
    v.markers.forEach((m, i) => {
      const r = unir('editPlan.markers', tramo(m, i));
      if (!objeto(c, m, r, true)) return;
      claves(c, m, ['id', 'atShotId', 'label'], r);
      ref(c, m.atShotId, unir(r, 'atShotId'), ['shot']);
      texto(c, m.label, unir(r, 'label'), LIMITES.nombre);
    });
  }
};

const ENTREGA = ['id', 'purpose', 'aspectRatio', 'resolution', 'maxDurationSec', 'subtitleMode', 'context'];
const entregas = (c: Ctx, v: unknown, subtitulos: boolean): void => {
  if (!objeto(c, v, 'exportPlan', true)) return;
  claves(c, v, ['targets'], 'exportPlan');
  if (!arreglo(c, v.targets, 'exportPlan.targets', LIMITES.exportaciones, true)) return;
  v.targets.forEach((t, i) => {
    const r = unir('exportPlan.targets', tramo(t, i));
    if (!objeto(c, t, r, true)) return;
    claves(c, t, ENTREGA, r);
    uno(c, t.purpose, PROPOSITOS_DE_EXPORTACION, unir(r, 'purpose'));
    uno(c, t.aspectRatio, PROPORCIONES, unir(r, 'aspectRatio'), 'format_invalid');
    uno(c, t.resolution, RESOLUCIONES, unir(r, 'resolution'), 'format_invalid');
    duracion(c, t.maxDurationSec, unir(r, 'maxDurationSec'), LIMITES.produccionMaxSec);
    uno(c, t.subtitleMode, MODOS_DE_SUBTITULO, unir(r, 'subtitleMode'));
    uno(c, t.context, PRESETS, unir(r, 'context'));
    if ((t.subtitleMode === 'burned' || t.subtitleMode === 'sidecar') && !subtitulos) {
      mal(c, 'constraints_incompatible', 'warning', unir(r, 'subtitleMode'), { reason: 'subtitles_not_planned' });
    }
  });
};

const metadatos = (c: Ctx, v: unknown): void => {
  if (!objeto(c, v, 'metadata', true)) return;
  claves(c, v, ['revision', 'locale', 'tags'], 'metadata');
  numero(c, v.revision, 'metadata.revision', 0, Number.MAX_SAFE_INTEGER, true, true);
  idioma(c, v.locale, 'metadata.locale');
  textos(c, v.tags, 'metadata.tags', LIMITES.etiquetas, LIMITES.nombre);
};

/* ── Tercera pasada: lo que cruza toda la producción ─────────────────────── */

/**
 * LOS CICLOS. Un plano que depende de sí mismo, o dos que dependen el uno del
 * otro, no se pueden generar en ningún orden. Cada ciclo se dice una vez, con
 * sus ids ordenados, en la ruta del primero.
 */
const ciclos = (c: Ctx, nodos: readonly { id: string; ruta: string; deps: readonly string[] }[], kind: 'scene' | 'shot'): void => {
  const porId = new Map(nodos.map((n) => [n.id, n] as [string, typeof n]));
  const color = new Map<string, number>();
  const pila: string[] = [];
  const dichos = new Set<string>();
  const visitar = (id: string): void => {
    color.set(id, 1);
    pila.push(id);
    for (const d of (porId.get(id) as { deps: readonly string[] }).deps) {
      if (!porId.has(d)) continue;
      const k = color.get(d) ?? 0;
      if (k === 1) {
        const ciclo = pila.slice(pila.indexOf(d)).sort(compararTexto);
        const clave = ciclo.join(',');
        if (!dichos.has(clave)) {
          dichos.add(clave);
          mal(c, 'dependency_cycle', 'error', unir((porId.get(ciclo[0]) as { ruta: string }).ruta, 'dependsOn'), { kind, ids: ciclo });
        }
      } else if (k === 0) visitar(d);
    }
    pila.pop();
    color.set(id, 2);
  };
  for (const n of nodos) if ((color.get(n.id) ?? 0) === 0) visitar(n.id);
};

const idsValidos = (v: unknown): readonly string[] => lista(v).filter((x): x is string => esId(x));

const grafos = (c: Ctx, escenas: readonly Obj[]): void => {
  const deEscenas: { id: string; ruta: string; deps: readonly string[] }[] = [];
  const dePlanos: { id: string; ruta: string; deps: readonly string[] }[] = [];
  escenas.forEach((s, i) => {
    if (!esId(s.id)) return;
    const rs = unir('scenes', tramo(s, i));
    deEscenas.push({ id: s.id, ruta: rs, deps: idsValidos(s.dependsOn) });
    lista(s.shots).forEach((p, j) => {
      if (esObj(p) && esId(p.id)) dePlanos.push({ id: p.id, ruta: unir(unir(rs, 'shots'), tramo(p, j)), deps: idsValidos(p.dependsOn) });
    });
  });
  ciclos(c, deEscenas, 'scene');
  ciclos(c, dePlanos, 'shot');
};

/** Lo que dura cada cosa y si cuadra. Devuelve la duración total, si se sabe. */
const duraciones = (c: Ctx, o: Obj, escenas: readonly Obj[]): number | undefined => {
  let total = 0;
  let conocida = true;
  escenas.forEach((s, i) => {
    const rs = unir('scenes', tramo(s, i));
    const planos = lista(s.shots).filter(esObj);
    let suma = 0;
    let sumaConocida = planos.length > 0;
    lista(s.shots).forEach((p, j) => {
      if (!esObj(p)) return;
      const rp = unir(unir(rs, 'shots'), tramo(p, j));
      if (p.durationSec === undefined) { mal(c, 'shot_duration_missing', segunEtapa(c), unir(rp, 'durationSec')); sumaConocida = false; return; }
      if (!duracionValida(p.durationSec, LIMITES.planoMaxSec)) { sumaConocida = false; return; }
      suma += aMs(p.durationSec);
    });
    const propia = duracionValida(s.durationSec, LIMITES.escenaMaxSec) ? aMs(s.durationSec) : undefined;
    if (!planos.length && s.durationSec === undefined) mal(c, 'scene_duration_missing', segunEtapa(c), unir(rs, 'durationSec'));
    if (sumaConocida && suma > aMs(LIMITES.escenaMaxSec)) {
      mal(c, 'duration_invalid', 'error', rs, { reason: 'scene_too_long', max: LIMITES.escenaMaxSec });
    }
    if (sumaConocida && propia !== undefined && Math.abs(suma - propia) > LIMITES.toleranciaMs) {
      mal(c, 'scene_duration_mismatch', segunEtapa(c), unir(rs, 'durationSec'), { declaredSec: aSec(propia), shotsSec: aSec(suma) });
    }
    const efectiva = sumaConocida ? suma : propia;
    if (efectiva === undefined) conocida = false; else total += efectiva;
  });
  if (!escenas.length) { mal(c, 'production_empty', segunEtapa(c), 'scenes'); return undefined; }
  if (!conocida) return undefined;
  if (total > aMs(LIMITES.produccionMaxSec)) mal(c, 'duration_invalid', 'error', 'duration', { reason: 'production_too_long', max: LIMITES.produccionMaxSec });
  const d = esObj(o.duration) ? o.duration : {};
  if (d.strict === true && duracionValida(d.targetSec, LIMITES.produccionMaxSec)
    && Math.abs(total - aMs(d.targetSec)) > LIMITES.toleranciaMs) {
    mal(c, 'duration_total_mismatch', segunEtapa(c), 'duration.targetSec', { targetSec: d.targetSec, totalSec: aSec(total) });
  }
  return total;
};

/** Las restricciones de la intención contra lo que la producción es de verdad. */
const restricciones = (c: Ctx, o: Obj, escenas: readonly Obj[], totalMs: number | undefined): void => {
  const intent = esObj(o.intent) ? o.intent : {};
  const cs = lista(intent.constraints).filter(esObj);
  const sev = segunEtapa(c);
  const valores = (kind: string, campo: string): { v: unknown; i: number }[] =>
    cs.map((x, i) => ({ x, i })).filter(({ x }) => x.kind === kind).map(({ x, i }) => ({ v: x[campo], i }));

  for (const [kind, campo] of [['max_duration', 'seconds'], ['min_duration', 'seconds'], ['aspect_ratio', 'aspectRatio']]) {
    const vs = valores(kind, campo);
    if (new Set(vs.map((x) => canonico(x.v))).size > 1) {
      mal(c, 'constraints_incompatible', sev, `intent.constraints.${vs[1].i}`, { reason: 'repeated_constraint', kind });
    }
  }
  const maximos = valores('max_duration', 'seconds').filter((x) => duracionValida(x.v, LIMITES.produccionMaxSec));
  const minimos = valores('min_duration', 'seconds').filter((x) => duracionValida(x.v, LIMITES.produccionMaxSec));
  const max = maximos.length ? Math.min(...maximos.map((x) => x.v as number)) : undefined;
  const min = minimos.length ? Math.max(...minimos.map((x) => x.v as number)) : undefined;
  if (max !== undefined && min !== undefined && min > max) {
    mal(c, 'constraints_incompatible', sev, 'intent.constraints', { reason: 'min_above_max', minSec: min, maxSec: max });
  }
  const duracionPedida = esObj(o.duration) ? o.duration.targetSec : undefined;
  const cotejar = (valor: unknown, ruta: string, que: string): void => {
    if (!duracionValida(valor, LIMITES.produccionMaxSec)) return;
    if (max !== undefined && valor > max) mal(c, 'constraints_incompatible', sev, ruta, { reason: `${que}_above_max`, maxSec: max });
    if (min !== undefined && valor < min) mal(c, 'constraints_incompatible', sev, ruta, { reason: `${que}_below_min`, minSec: min });
  };
  cotejar(duracionPedida, 'duration.targetSec', 'target');
  cotejar(intent.requestedDurationSec, 'intent.requestedDurationSec', 'requested');
  if (totalMs !== undefined) cotejar(aSec(totalMs), 'scenes', 'total');

  const aspecto = valores('aspect_ratio', 'aspectRatio');
  for (const a of aspecto) {
    if (typeof a.v === 'string' && c.aspecto !== undefined && a.v !== c.aspecto) {
      mal(c, 'constraints_incompatible', sev, `intent.constraints.${a.i}`, { reason: 'format_differs' });
    }
  }

  /* Lo que la producción contiene, para cotejar las prohibiciones. */
  const todasLasLineas: Obj[] = [];
  const presentes = new Set<string>();
  for (const s of escenas) {
    for (const id of idsValidos(s.characterIds)) presentes.add(id);
    todasLasLineas.push(...lista(s.dialogue).filter(esObj));
    for (const p of lista(s.shots)) {
      if (!esObj(p)) continue;
      for (const id of idsValidos(p.characterIds)) presentes.add(id);
      if (esObj(p.subject) && esId(p.subject.characterId)) presentes.add(p.subject.characterId);
      todasLasLineas.push(...lista(p.dialogue).filter(esObj));
    }
  }
  for (const l of todasLasLineas) if (esId(l.characterId)) presentes.add(l.characterId);
  const sonidos = esObj(o.audio) ? lista(o.audio.cues).filter(esObj) : [];
  const narrador = esObj(o.audio) && o.audio.narrator !== undefined;

  cs.forEach((x, i) => {
    const r = `intent.constraints.${i}`;
    if (x.kind === 'no_dialogue') {
      const n = todasLasLineas.filter((l) => l.kind === 'dialogue' || l.kind === 'voiceover').length;
      if (n) mal(c, 'constraints_incompatible', sev, r, { reason: 'dialogue_present', lines: n });
    }
    if (x.kind === 'no_narration') {
      const n = todasLasLineas.filter((l) => l.kind === 'narration').length;
      if (n || narrador) mal(c, 'constraints_incompatible', sev, r, { reason: 'narration_present', lines: n });
    }
    if (x.kind === 'no_music') {
      const n = sonidos.filter((s) => s.kind === 'music').length;
      if (n) mal(c, 'constraints_incompatible', sev, r, { reason: 'music_present', cues: n });
    }
    if (x.kind === 'include_character' && esId(x.characterId) && c.ids.get(x.characterId)?.tipo === 'character'
      && !presentes.has(x.characterId)) {
      mal(c, 'relation_missing', sev, r, { reason: 'required_character_absent', characterId: x.characterId });
    }
  });
};

/* ── La API ───────────────────────────────────────────────────────────────── */

const RAIZ = [
  'version', 'id', 'title', 'intent', 'creativeDirection', 'format', 'duration', 'scenes', 'characters',
  'locations', 'objects', 'references', 'audio', 'continuity', 'generation', 'editPlan', 'exportPlan', 'metadata',
];

/**
 * UNA PRODUCCIÓN, REVISADA ENTERA. Todos los problemas, no el primero, en un
 * orden que no depende de cómo se recorrió: ruta, código y parámetros.
 */
export const validarProduccion = (
  crudo: unknown,
  opciones: { readonly stage?: ValidationStage } = {},
): ValidationResult => {
  const etapa: ValidationStage = opciones.stage ?? 'draft';
  const c: Ctx = { etapa, p: [], ids: new Map(), referencias: new Map(), aspecto: undefined };
  if (!esObj(crudo)) {
    mal(c, 'shape_invalid', 'error', '', { expected: 'object' });
    return { valid: false, stage: etapa, problems: c.p };
  }
  const o = crudo;
  c.aspecto = esObj(o.format) ? o.format.aspectRatio : undefined;
  claves(c, o, RAIZ, '');
  if (o.version !== FILMMAKER_MODEL_VERSION) mal(c, 'value_invalid', 'error', 'version', { reason: 'unsupported_version', expected: FILMMAKER_MODEL_VERSION });
  if (o.id !== undefined && !esId(o.id)) mal(c, 'id_invalid', 'error', 'id');
  texto(c, o.title, 'title', LIMITES.nombre, true);

  primeraPasada(c, o);

  intencion(c, o.intent);
  direccion(c, o.creativeDirection);
  formato(c, o.format);
  duracionDeProduccion(c, o.duration);
  if (arreglo(c, o.characters, 'characters', LIMITES.personajes, true)) o.characters.forEach((x, i) => personaje(c, x, i));
  if (arreglo(c, o.locations, 'locations', LIMITES.lugares, true)) o.locations.forEach((x, i) => lugar(c, x, i));
  if (arreglo(c, o.objects, 'objects', LIMITES.objetos, true)) o.objects.forEach((x, i) => cosa(c, x, i));
  if (arreglo(c, o.references, 'references', LIMITES.referencias, true)) {
    const porMaterial = new Map<string, string>();
    o.references.forEach((x, i) => referencia(c, x, i, porMaterial));
  }
  plan(c, o.audio);
  regla(c, o.continuity, 'continuity');
  generacion(c, o.generation);
  montaje(c, o.editPlan);
  const subtitulos = esObj(o.editPlan) && esObj(o.editPlan.subtitles) && o.editPlan.subtitles.enabled === true;
  entregas(c, o.exportPlan, subtitulos);
  metadatos(c, o.metadata);

  let escenas: readonly Obj[] = [];
  if (arreglo(c, o.scenes, 'scenes', LIMITES.escenas, true)) {
    o.scenes.forEach((s, i) => escena(c, s, i));
    escenas = o.scenes.filter(esObj);
    const planos = escenas.reduce((n, s) => n + lista(s.shots).length, 0);
    if (planos > LIMITES.planos) mal(c, 'limit_exceeded', 'error', 'scenes', { reason: 'too_many_shots', max: LIMITES.planos });
    grafos(c, escenas);
    const total = duraciones(c, o, escenas);
    restricciones(c, o, escenas, total);
  }

  const unicos = new Map<string, ValidationProblem>();
  for (const x of c.p) {
    const clave = `${x.path}\u0000${x.code}\u0000${x.severity}\u0000${canonico(x.parameters)}`;
    if (!unicos.has(clave)) unicos.set(clave, x);
  }
  const problems = [...unicos.values()].sort((a, b) =>
    compararTexto(a.path, b.path) || compararTexto(a.code, b.code) || compararTexto(canonico(a.parameters), canonico(b.parameters)));
  return { valid: !problems.some((x) => x.severity === 'error'), stage: etapa, problems };
};

/**
 * ¿ESTÁ ROTA? Solo los errores de forma: lo que ningún borrador puede tener. Es
 * lo que una operación comprueba antes de empezar y después de acabar.
 */
export const integridad = (crudo: unknown): readonly ValidationProblem[] =>
  validarProduccion(crudo, { stage: 'draft' }).problems.filter((x) => x.severity === 'error' && CODIGOS_DE_INTEGRIDAD.has(x.code));
