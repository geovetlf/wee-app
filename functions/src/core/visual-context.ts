import { BrainAttachment, BrainIntent } from './brain';
import { AssetKind, TIPOS_DE_MATERIAL } from './content';
import { VISUAL_CONTEXT_CONTRACT_VERSION } from './contracts';
import {
  Element,
  ElementAssetRef,
  ElementType,
  FORMA_DE_ID_DE_ELEMENTO,
  esTipoDeElemento,
} from './element';

/**
 * WEE VISUAL CONTEXT — QUÉ DE LO TUYO SIRVE PARA ESTO.
 *
 * ── La pregunta que contesta, y la que NO ───────────────────────────────────
 *
 * Alguien dice: «usa la hamburguesa que creamos ayer y haz un anuncio.»
 *
 * BRAIN entiende esa frase. Sabe que quiere un anuncio, que hace falta un
 * producto, y que «ayer» acota el tiempo. Eso es interpretar, y es de Brain.
 *
 * ESTO decide CUÁL. Entre las cosas que tiene la cuenta, cuál es «la
 * hamburguesa», y qué materiales suyos hacen falta ahora. Eso es RESOLVER
 * REFERENCIAS, y es lo único que hace este archivo.
 *
 * ── Lo que NO es, y conviene leerlo entero ──────────────────────────────────
 *
 * No es un segundo Brain: no interpreta lenguaje, no conversa, no escribe. No
 * llama a ningún modelo —ni a DeepSeek, ni a Gemini, ni a ninguno— porque
 * Brain ya interpretó y pagar dos veces por entender lo mismo es tirar dinero
 * y latencia a TODAS las peticiones. No elige proveedor ni modelo: eso es del
 * Router. No planifica: eso es del Planner. No entrega bytes, no firma URLs y
 * no sabe qué es un bucket: eso es de Media Cloud.
 *
 * Y NO HAY BÚSQUEDA SEMÁNTICA. Ni vectores, ni embeddings, ni una base de datos
 * de parecidos. Todavía no hace falta: con lo que Brain ya entiende —el tipo de
 * cosa, el proyecto abierto, una referencia explícita, una franja de tiempo—
 * se resuelve de forma DETERMINISTA, y lo determinista se puede probar con una
 * tabla. La costura para cuando haga falta está al final del archivo, y es un
 * comentario, no una dependencia.
 *
 * ── Y cuando no se sabe, se dice ────────────────────────────────────────────
 *
 * Alguien con tres hamburguesas que dice «usa mi hamburguesa» no recibe una
 * elegida a dedo. Recibe `ambiguous` y los nombres, para que Brain pregunte
 * cuál. Elegir por orden alfabético o por la más reciente sería el sistema
 * decidiendo por alguien, y eso es exactamente lo que Weë no hace.
 */

/* ── Lo que hace falta ────────────────────────────────────────────────────── */

/**
 * UNA NECESIDAD DE CONTEXTO. Un contrato, no dos.
 *
 * S1 dejó dos costuras —`contextRequirements` y `elementRequirements`— y la
 * primera pregunta de S3 fue si de verdad son dos conceptos. No lo son: «hace
 * falta un Element de producto» y «hacen falta imágenes de referencia» son la
 * misma frase con distinto complemento. Dos listas serían dos sistemas para
 * una idea, y a los seis meses nadie sabría en cuál mirar.
 *
 * Así que es uno, y lo que cambia es `kind`.
 */
export type ContextNeedKind =
  /* Hace falta una COSA de la cuenta: un producto, un personaje, un sitio. */
  | 'element'
  /* Hace falta MATERIAL de una clase: imágenes, un vídeo, un documento. */
  | 'asset';

export interface ContextNeed {
  kind: ContextNeedKind;
  /** Solo con `kind: 'element'`. Qué clase de cosa. */
  elementType?: ElementType;
  /** Solo con `kind: 'asset'`. Qué clase de material. */
  assetKind?: AssetKind;
  /** Sin esto no se puede hacer el trabajo. Por defecto, no. */
  required?: boolean;
  /**
   * Para qué, dentro de lo que se va a hacer. Una palabra corta y propia de
   * Weë —`subject`, `background`, `logo`— que quien pide y quien resuelve
   * comparten. Nunca una instrucción para un proveedor.
   */
  role?: string;
}

export const MAX_NECESIDADES = 8;
export const MAX_REFERENCIAS = 16;
export const MAX_ELEMENTOS_EN_RESULTADO = 8;
export const MAX_MATERIALES_EN_RESULTADO = 24;
const MAX_ROL = 40;
const FORMA_DE_ROL = /^[a-z][a-z0-9_]{1,39}$/;

/* ── Lo que la persona señaló ─────────────────────────────────────────────── */

/**
 * UNA REFERENCIA EXPLÍCITA. Lo que alguien señaló, y que hay que COMPROBAR.
 *
 * Un id que llega de fuera no prueba nada. Es una petición de mirar algo, y se
 * mira contra el dueño antes de contestar. Es la misma regla que el resto del
 * Core: la autoridad es el registro, no lo que diga quien llama.
 */
export interface ContextReference {
  kind: 'element' | 'asset';
  id: string;
}

/**
 * CUÁNDO. Normalizado, y por Brain.
 *
 * «Ayer» es una palabra, y convertirla en una franja necesita saber en qué
 * huso vive quien la dijo. Eso es interpretar, y lo hace Brain, que ya tiene la
 * conversación delante. Aquí llegan dos números y nada más: este archivo no lee
 * el reloj, no mira la IP, no adivina un huso y no sabe qué día es hoy.
 */
export interface ContextWindow {
  createdAfter?: number;
  createdBefore?: number;
}

/* ── La petición ──────────────────────────────────────────────────────────── */

export interface VisualContextRequest {
  /**
   * DE QUIÉN. La autoridad, y viene de la sesión: nunca de lo que mande el
   * cliente. Todo lo que se devuelva será de esta cuenta o no se devolverá.
   */
  accountId: string;
  intent?: BrainIntent;
  /** El proyecto abierto, si hay uno. Es una SEÑAL de relevancia, no un filtro duro. */
  projectId?: string;
  /** Lo que se señaló. Manda sobre todo lo demás, después de comprobarlo. */
  references?: readonly ContextReference[];
  /** Lo que hace falta. Viene de un Skill, o de quien pida. */
  needs?: readonly ContextNeed[];
  /** La franja de tiempo que Brain dedujo de «ayer», «la semana pasada». */
  window?: ContextWindow;
  limits?: { maxElements?: number; maxAssets?: number };
}

/* ── Lo que se contesta ───────────────────────────────────────────────────── */

export type ContextStatus =
  /* Hay contexto y sirve. */
  | 'resolved'
  /* Hay varios y ninguno gana. No se elige: se dice cuáles. */
  | 'ambiguous'
  /* No hay nada que encaje. También es lo que se contesta a lo que no es tuyo. */
  | 'not_found'
  /* Se pide algo que este contrato no sabe representar. */
  | 'unsupported'
  /* La petición no tiene forma de petición. */
  | 'invalid';

/**
 * UNA COSA RESUELTA, con sus materiales. REFERENCIAS, nunca contenido.
 *
 * Aquí no hay bytes, ni URLs, ni URLs firmadas, ni `storageRef`, ni nada que
 * se parezca a una dirección. Entregar es de Media Cloud, y quien quiera ver
 * esos materiales se los pide a quien sabe entregarlos.
 */
export interface ResolvedElement {
  elementId: string;
  type: ElementType;
  name: string;
  /** Por qué salió este y no otro. Una señal, no una puntuación. */
  because: ContextSignal;
  assets: readonly ElementAssetRef[];
}

/**
 * POR QUÉ ESTE.
 *
 * En ORDEN de fuerza, y el orden es el criterio entero: no hay pesos, no hay
 * suma y no hay «puntuación del mejor material». Una señal más fuerte gana a
 * una más débil, y dos candidatos con la misma señal más fuerte NO se
 * desempatan: se dicen los dos.
 */
export type ContextSignal =
  /* Lo señaló la persona, y es suyo. No hay nada más fuerte. */
  | 'explicit'
  /* Está en el proyecto que tiene abierto. */
  | 'project'
  /* Es de la franja de tiempo que Brain dedujo, y es el único. */
  | 'window'
  /* Es la única cosa de esa clase que tiene. */
  | 'only_candidate';

export const SEÑALES: readonly ContextSignal[] = Object.freeze([
  'explicit', 'project', 'window', 'only_candidate',
] as const);

/** Lo que no se pudo decidir, con lo justo para que Brain pregunte. */
export interface ContextAmbiguity {
  need: ContextNeed;
  /** Los que empataron. Nombre e id, para poder preguntar «¿cuál?». */
  candidates: readonly { elementId: string; type: ElementType; name: string }[];
}

export type MotivoDeContexto =
  | 'no_needs'
  | 'no_candidate'
  | 'too_many_candidates'
  | 'reference_not_found'
  | 'missing_required'
  | 'invalid_request'
  | 'unsupported_need';

export interface VisualContextResult {
  contract: typeof VISUAL_CONTEXT_CONTRACT_VERSION;
  status: ContextStatus;
  elements?: readonly ResolvedElement[];
  /** Lo que hacía falta y no se encontró. Solo lo obligatorio. */
  missing?: readonly ContextNeed[];
  ambiguous?: readonly ContextAmbiguity[];
  reason?: MotivoDeContexto;
}

/* ── Lo que el Core recibe para decidir ───────────────────────────────────── */

/**
 * EL MUNDO, YA LEÍDO.
 *
 * El Core no consulta nada: recibe lo que alguien ya trajo y decide. Es el
 * mismo patrón que MC-5, MC-6 y MC-9 —decisión pura aquí, lectura en la
 * composición— y es lo que permite probar esto con una tabla de casos en vez
 * de con una base de datos.
 *
 * Y es también lo que impide un recorrido completo: quien implemente esto
 * tiene que traer un conjunto ACOTADO, porque el tope se lo impone su consulta
 * y no este archivo. Traer los cinco mil materiales de una cuenta sería una
 * decisión de quien consulta, y una que este contrato no pide en ningún sitio.
 */
export interface MundoDeContexto {
  /** Las cosas de la cuenta que podrían valer. Ya acotadas por quien consultó. */
  elementos: readonly Element[];
  /** Las filas de proyecto que hagan falta para la señal «está en el proyecto abierto». */
  enProyecto?: readonly { projectId: string; elementId: string }[];
}

/* ── Validación de la petición ────────────────────────────────────────────── */

const esObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const esNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const esTxt = (v: unknown): v is string => typeof v === 'string';
const PELIGROSAS = ['__proto__', 'constructor', 'prototype'];

const CAMPOS_DE_PETICION = ['accountId', 'intent', 'projectId', 'references', 'needs', 'window', 'limits'];
const CAMPOS_DE_NECESIDAD = ['kind', 'elementType', 'assetKind', 'required', 'role'];

const invalido = (reason: MotivoDeContexto): VisualContextResult => ({
  contract: VISUAL_CONTEXT_CONTRACT_VERSION, status: 'invalid', reason,
});

/**
 * UNA NECESIDAD, REVISADA. Se exporta porque un Skill declara estas mismas.
 */
export const necesidadValida = (crudo: unknown): crudo is ContextNeed => {
  if (!esObjeto(crudo)) return false;
  for (const clave of Object.keys(crudo)) {
    if (PELIGROSAS.includes(clave) || !CAMPOS_DE_NECESIDAD.includes(clave)) return false;
  }
  if (crudo.kind !== 'element' && crudo.kind !== 'asset') return false;
  /* Cada clase pide LO SUYO, y nada de lo de la otra: una necesidad mixta no significa nada. */
  if (crudo.kind === 'element') {
    if (!esTipoDeElemento(crudo.elementType)) return false;
    if (crudo.assetKind !== undefined) return false;
  } else {
    if (!esTxt(crudo.assetKind) || !(TIPOS_DE_MATERIAL as readonly string[]).includes(crudo.assetKind)) return false;
    if (crudo.elementType !== undefined) return false;
  }
  if (crudo.required !== undefined && typeof crudo.required !== 'boolean') return false;
  if (crudo.role !== undefined && (!esTxt(crudo.role) || crudo.role.length > MAX_ROL || !FORMA_DE_ROL.test(crudo.role))) return false;
  return true;
};

const peticionValida = (crudo: unknown): crudo is VisualContextRequest => {
  if (!esObjeto(crudo)) return false;
  for (const clave of Object.keys(crudo)) {
    if (PELIGROSAS.includes(clave) || !CAMPOS_DE_PETICION.includes(clave)) return false;
  }
  if (!esTxt(crudo.accountId) || crudo.accountId.length === 0 || crudo.accountId.length > 128) return false;
  if (crudo.projectId !== undefined && (!esTxt(crudo.projectId) || !FORMA_DE_ID_DE_ELEMENTO.test(crudo.projectId))) return false;
  if (crudo.references !== undefined) {
    if (!Array.isArray(crudo.references) || crudo.references.length > MAX_REFERENCIAS) return false;
    for (const r of crudo.references) {
      if (!esObjeto(r)) return false;
      for (const clave of Object.keys(r)) if (!['kind', 'id'].includes(clave)) return false;
      if (r.kind !== 'element' && r.kind !== 'asset') return false;
      if (!esTxt(r.id) || !FORMA_DE_ID_DE_ELEMENTO.test(r.id)) return false;
    }
  }
  if (crudo.needs !== undefined) {
    if (!Array.isArray(crudo.needs) || crudo.needs.length > MAX_NECESIDADES) return false;
    if (!crudo.needs.every(necesidadValida)) return false;
  }
  if (crudo.window !== undefined) {
    if (!esObjeto(crudo.window)) return false;
    for (const clave of Object.keys(crudo.window)) if (!['createdAfter', 'createdBefore'].includes(clave)) return false;
    for (const clave of ['createdAfter', 'createdBefore'] as const) {
      const v = crudo.window[clave];
      if (v !== undefined && (!esNum(v) || v < 0)) return false;
    }
  }
  if (crudo.limits !== undefined) {
    if (!esObjeto(crudo.limits)) return false;
    for (const clave of Object.keys(crudo.limits)) if (!['maxElements', 'maxAssets'].includes(clave)) return false;
    for (const clave of ['maxElements', 'maxAssets'] as const) {
      const v = crudo.limits[clave];
      if (v !== undefined && (!esNum(v) || !Number.isInteger(v) || v < 1)) return false;
    }
  }
  return true;
};

/* ── Resolver ─────────────────────────────────────────────────────────────── */

const fuerza = (s: ContextSignal): number => SEÑALES.indexOf(s);

/**
 * ¿QUÉ DE LO TUYO SIRVE PARA ESTO?
 *
 * Determinista, acotado, sin red, sin modelo y sin reloj. El mismo mundo y la
 * misma petición dan siempre la misma respuesta, que es lo que permite probarlo
 * de verdad y lo que permitirá algún día reproducir por qué el sistema eligió
 * lo que eligió.
 *
 * ── El orden, que ES el criterio ────────────────────────────────────────────
 *
 *   1 · FILTRAR por cuenta. Lo que no es tuyo no existe para esta respuesta, y
 *       se contesta igual que lo que no existe: `not_found`. Sin esto, probar
 *       ids sería una forma de averiguar qué tiene otra persona.
 *   2 · Una referencia EXPLÍCITA y válida gana. Es lo que se señaló.
 *   3 · Si no, filtrar por el TIPO que hace falta.
 *   4 · Desempatar por señal: proyecto abierto, franja de tiempo.
 *   5 · Y si siguen empatados, NO se elige.
 */
export const resolverContexto = (
  mundo: MundoDeContexto,
  peticion: VisualContextRequest,
): VisualContextResult => {
  if (!peticionValida(peticion)) return invalido('invalid_request');
  if (!esObjeto(mundo) || !Array.isArray(mundo.elementos)) return invalido('invalid_request');

  const topeElementos = Math.min(peticion.limits?.maxElements ?? MAX_ELEMENTOS_EN_RESULTADO, MAX_ELEMENTOS_EN_RESULTADO);
  const topeMateriales = Math.min(peticion.limits?.maxAssets ?? MAX_MATERIALES_EN_RESULTADO, MAX_MATERIALES_EN_RESULTADO);

  /*
   * ── 1 · LO QUE NO ES TUYO NO EXISTE ─────────────────────────────────────
   *
   * Lo primero, antes de mirar nada más. Todo lo que venga después trabaja
   * sobre una lista que ya es solo de esta cuenta, así que no hay un camino
   * por el que algo ajeno pueda salir: no es una comprobación repetida en
   * cinco sitios, es una sola y está aquí.
   */
  const mios = mundo.elementos.filter(
    (e) => esObjeto(e) && e.ownerAccountId === peticion.accountId && e.status === 'active',
  );
  const porId = new Map(mios.map((e) => [e.elementId, e]));
  const enProyecto = new Set(
    (mundo.enProyecto ?? [])
      .filter((f) => peticion.projectId !== undefined && f.projectId === peticion.projectId)
      .map((f) => f.elementId),
  );

  const resueltos: ResolvedElement[] = [];
  const ambiguos: ContextAmbiguity[] = [];
  const faltan: ContextNeed[] = [];
  let materiales = 0;

  const anotar = (e: Element, because: ContextSignal): void => {
    if (resueltos.some((r) => r.elementId === e.elementId)) return;
    if (resueltos.length >= topeElementos) return;
    /* El tope de materiales acota el RESULTADO, no la cosa: se recorta la lista, no se miente sobre ella. */
    const sitio = Math.max(0, topeMateriales - materiales);
    const assets = e.refs.slice(0, sitio);
    materiales += assets.length;
    resueltos.push({ elementId: e.elementId, type: e.type, name: e.name, because, assets });
  };

  /* ── 2 · Lo señalado, comprobado ──────────────────────────────────────── */
  let referenciaRota = false;
  for (const r of peticion.references ?? []) {
    if (r.kind !== 'element') continue;
    const e = porId.get(r.id);
    /* No está, o no es tuyo, o está archivado: la MISMA respuesta para los tres. */
    if (!e) { referenciaRota = true; continue; }
    anotar(e, 'explicit');
  }
  if (referenciaRota && !resueltos.length) {
    return { contract: VISUAL_CONTEXT_CONTRACT_VERSION, status: 'not_found', reason: 'reference_not_found' };
  }

  /* ── 3 · Lo que hace falta ────────────────────────────────────────────── */
  const necesidades = peticion.needs ?? [];
  for (const need of necesidades) {
    if (need.kind !== 'element') continue;
    /* Si lo señalado ya cubre esta necesidad, no se busca otra cosa. */
    if (resueltos.some((r) => r.type === need.elementType)) continue;

    const candidatos = mios.filter((e) => e.type === need.elementType);
    if (!candidatos.length) { if (need.required) faltan.push(need); continue; }
    if (candidatos.length === 1) { anotar(candidatos[0], 'only_candidate'); continue; }

    /* ── 4 · Desempatar, por señales y en orden ─────────────────────────── */
    const conSeñal = candidatos.map((e) => {
      if (enProyecto.has(e.elementId)) return { e, señal: 'project' as ContextSignal };
      const w = peticion.window;
      const dentro = w !== undefined
        && (w.createdAfter === undefined || e.createdAt >= w.createdAfter)
        && (w.createdBefore === undefined || e.createdAt <= w.createdBefore);
      return dentro ? { e, señal: 'window' as ContextSignal } : { e, señal: undefined };
    });
    const conAlguna = conSeñal.filter((c): c is { e: Element; señal: ContextSignal } => c.señal !== undefined);
    if (!conAlguna.length) {
      /*
       * VARIOS Y NINGUNA SEÑAL. Aquí es donde un sistema peor elegiría el más
       * reciente y quedaría bien el 60 % de las veces. Éste dice cuáles hay.
       */
      ambiguos.push({ need, candidates: candidatos.slice(0, topeElementos).map((e) => ({ elementId: e.elementId, type: e.type, name: e.name })) });
      continue;
    }
    const mejor = Math.min(...conAlguna.map((c) => fuerza(c.señal)));
    const ganadores = conAlguna.filter((c) => fuerza(c.señal) === mejor);
    if (ganadores.length > 1) {
      ambiguos.push({ need, candidates: ganadores.slice(0, topeElementos).map((c) => ({ elementId: c.e.elementId, type: c.e.type, name: c.e.name })) });
      continue;
    }
    anotar(ganadores[0].e, ganadores[0].señal);
  }

  /*
   * ── 5 · Y lo que hace falta de MATERIAL ────────────────────────────────
   *
   * Una necesidad de material se cumple con lo que ya traen las cosas
   * resueltas: si hace falta una imagen y la hamburguesa tiene tres, está
   * cubierta. Este archivo NO va a buscar materiales sueltos por su cuenta —
   * eso sería recorrer la cuenta, que es justo lo que no se hace.
   */
  const clasesDisponibles = new Set<AssetKind>(resueltos.flatMap((r) => r.assets.map((a) => a.kind)));
  for (const need of necesidades) {
    if (need.kind !== 'asset') continue;
    if (!clasesDisponibles.has(need.assetKind as AssetKind) && need.required) faltan.push(need);
  }

  if (ambiguos.length) {
    return {
      contract: VISUAL_CONTEXT_CONTRACT_VERSION, status: 'ambiguous',
      ...(resueltos.length ? { elements: resueltos } : {}),
      ambiguous: ambiguos, reason: 'too_many_candidates',
    };
  }
  if (faltan.length) {
    return {
      contract: VISUAL_CONTEXT_CONTRACT_VERSION, status: 'not_found',
      ...(resueltos.length ? { elements: resueltos } : {}),
      missing: faltan, reason: 'missing_required',
    };
  }
  if (!resueltos.length) {
    return {
      contract: VISUAL_CONTEXT_CONTRACT_VERSION, status: 'not_found',
      reason: necesidades.length ? 'no_candidate' : 'no_needs',
    };
  }
  return { contract: VISUAL_CONTEXT_CONTRACT_VERSION, status: 'resolved', elements: resueltos };
};

/* ── De vuelta al camino de siempre ───────────────────────────────────────── */

/**
 * EL CONTEXTO, CONVERTIDO EN LO QUE EL PLANNER YA SABE LEER.
 *
 * Y ESTO ES LO MEJOR DE TODA LA FASE: el Planner no cambia. Ni una línea.
 *
 * `BrainUnderstanding.inputs.attachments` ya existía, ya viajaba y ya
 * significaba «material que viene con el mensaje». El Planner ya lo lee —
 * `modalidadesAportadas`— para saber qué modalidades tiene ya y cuáles hay que
 * fabricar. Así que resolver la hamburguesa y convertir sus fotos en adjuntos
 * hace que el plan CAMBIE DE FORMA solo: donde antes habría un paso para
 * generar una imagen, ahora no hace falta porque la imagen ya está.
 *
 * Una referencia, nunca una URL: `assetId` y la clase. Quien ejecute le pedirá
 * a Media Cloud lo que necesite, que es quien sabe entregarlo.
 */
export const materialesDelContexto = (resultado: VisualContextResult): readonly BrainAttachment[] => {
  if (resultado.status !== 'resolved' && resultado.status !== 'ambiguous') return [];
  return (resultado.elements ?? []).flatMap((e) => e.assets.map((a) => ({ kind: a.kind, assetId: a.assetId })));
};

/**
 * Las cosas resueltas, dichas para la traza. Cuatro datos y ninguno es privado.
 *
 * Ni el nombre que alguien le puso a su hamburguesa, ni la descripción, ni los
 * ids de material: eso es de quien lo escribió. Lo que se anota es QUÉ decidió
 * el sistema y CON QUÉ FUERZA, que es lo que hará falta el día que alguien
 * pregunte por qué salió lo que salió.
 */
export const trazaDeContexto = (
  resultado: VisualContextResult,
): { status: ContextStatus; elements: number; assets: number; signals: readonly ContextSignal[]; reason?: MotivoDeContexto } => ({
  status: resultado.status,
  elements: resultado.elements?.length ?? 0,
  assets: (resultado.elements ?? []).reduce((n, e) => n + e.assets.length, 0),
  signals: [...new Set((resultado.elements ?? []).map((e) => e.because))],
  ...(resultado.reason ? { reason: resultado.reason } : {}),
});

/*
 * ── LA COSTURA PARA CUANDO HAGA FALTA BUSCAR DE VERDAD ──────────────────────
 *
 * Con decenas de cosas por cuenta, `resolverContexto` sobra: filtra por tipo,
 * mira el proyecto y la franja, y contesta. Con miles —una marca grande, una
 * agencia— habrá peticiones que no se resuelvan por tipo y que hoy saldrían
 * `ambiguous` con veinte candidatos, que es una respuesta correcta pero inútil.
 *
 * Ese día hará falta ORDENAR por parecido, y ahí sí entran los vectores. La
 * costura es el `MundoDeContexto`: quien lo trae puede traerlo ya ordenado por
 * lo que sea —una búsqueda semántica, un índice, lo que exista entonces— y
 * este archivo no se entera, porque él solo filtra y desempata sobre lo que le
 * den.
 *
 * NO se construye hoy. Una base de datos de vectores para resolver «cuál de
 * mis tres hamburguesas» es construir el problema, no la solución.
 */
