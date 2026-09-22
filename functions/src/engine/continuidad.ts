import { ContinuityAspect, ContinuityRequirements, ContinuityStrength } from '../core';

/**
 * WEË — DE UN REQUISITO ABSTRACTO A LO QUE UNA IMPLEMENTACIÓN SABE HACER.
 *
 * ── La frontera, dicha en dos líneas ────────────────────────────────────────
 *
 *   EL CORE dice:     «hay que conservar el rostro».
 *   EL ADAPTADOR dice: «yo tengo ESTE mecanismo, y llega hasta aquí».
 *
 * Este archivo está del lado del adaptador, y por eso vive en `engine/` y no en
 * `core/`. Lo que NO hace es saber de ningún proveedor: cada adaptador declara
 * SU mecanismo y esto solo compara el requisito con lo declarado. Un nombre de
 * proveedor aquí convertiría la frontera en un cajón.
 *
 * ── Lo que la auditoría de C7 encontró, y que cambia lo que se puede prometer ─
 *
 * Ningún adaptador de Weë tiene hoy un control que preserve un aspecto
 * CONCRETO. Ninguno tiene «conserva el rostro». Lo que tienen —los que tienen
 * algo— es CONDICIONAMIENTO POR REFERENCIA: se les pasan imágenes o clips y el
 * modelo se parece a ellos. Es un mecanismo real y sirve, pero no es una
 * garantía y no distingue un rostro de una fachada: conserva lo que la
 * referencia enseñe, y hasta donde el modelo quiera.
 *
 * Así que lo máximo que se puede declarar con honradez hoy es PARCIAL, y eso
 * es exactamente lo que se declara. Decir `supported` sobre `identity.face`
 * porque se envió una foto sería la mentira más cara del sistema: una capa de
 * arriba lo leería como «esto está cubierto» y nadie volvería a mirarlo.
 *
 * ── Y una frase NO es un mecanismo ──────────────────────────────────────────
 *
 * Hay adaptadores cuya única «preservación de identidad» es una frase metida en
 * el prompt —«keep the identity and features of the person»—. Eso NO cuenta
 * como soporte y aquí se clasifica como `unsupported`. Pedirle a un modelo por
 * escrito que no cambie una cara no es un mecanismo: es una esperanza.
 *
 * ── Lo que este archivo NO hace ─────────────────────────────────────────────
 *
 * No enruta. No elige proveedor ni modelo. No reintenta. No cobra. No crea
 * trabajos. No valida el resultado. No lee nada. No degrada un requisito en
 * silencio. Recibe el requisito, lo que el adaptador declara y el material que
 * de verdad hay delante, y contesta qué se puede llevar y qué no.
 */

/* ── Qué sabe hacer una implementación ────────────────────────────────────── */

/**
 * EL MECANISMO REAL DE UNA IMPLEMENTACIÓN. Lo declara ella, no se deduce.
 *
 * `referenciasDeImagen` y `referenciasDeVideo` son cuántas caben de verdad en
 * la petición: cero significa que no hay por dónde meterlas. `porPrompt` existe
 * para poder decir que un adaptador solo sabe PEDIRLO por escrito, y que eso no
 * cuenta — está para que quede escrito, no para sumar.
 */
export interface MecanismoDeContinuidad {
  /** Cuántas imágenes de referencia admite la petición. 0 = ninguna. */
  referenciasDeImagen: number;
  /** Cuántos clips de referencia admite. 0 = ninguno. */
  referenciasDeVideo?: number;
  /**
   * Aspectos para los que el proveedor tiene un control DEDICADO —no una
   * referencia genérica ni una frase—. Hoy, en Weë, ninguno tiene ninguno.
   */
  controlesDedicados?: readonly ContinuityAspect[];
  /** Si su única forma de pedir preservación es texto en el prompt. No suma. */
  soloPorPrompt?: boolean;
  /** Si sabe traducir la fuerza a algún mando suyo. Hoy, ninguno. */
  admiteFuerza?: boolean;
}

/* ── Qué se puede decir de cada aspecto ───────────────────────────────────── */

/**
 * TRES RESPUESTAS, Y NINGUNA ES «SÍ» A MEDIAS.
 *
 *   supported    hay un control dedicado para ESE aspecto.
 *   partial      hay condicionamiento por referencia: ayuda, no garantiza.
 *   unsupported  no hay mecanismo. Una frase en el prompt cae aquí.
 */
export type SoporteDeAspecto = 'supported' | 'partial' | 'unsupported';

export type MotivoDeTraduccion =
  /* Hay control dedicado para este aspecto. */
  | 'dedicated_control'
  /* Hay referencia, y la referencia ayuda sin prometer. */
  | 'reference_conditioning'
  /* La implementación no tiene por dónde meter una referencia. */
  | 'no_mechanism'
  /* Lo único que sabe hacer es pedirlo por escrito. No cuenta. */
  | 'prompt_only'
  /* Hay mecanismo, pero no llegó material con el que usarlo. */
  | 'missing_material'
  /* Hay más referencias que huecos: algunas se quedan fuera. */
  | 'slots_exhausted';

export interface TraduccionDeAspecto {
  aspect: ContinuityAspect;
  support: SoporteDeAspecto;
  reason: MotivoDeTraduccion;
}

export type MotivoDeTraduccionImposible =
  | 'malformed_requirement'
  | 'no_mechanism'
  | 'missing_material';

/**
 * LO QUE SALE DE TRADUCIR. Por aspecto, y sin una sola puntuación.
 *
 * `noCubiertos` es la lista que de verdad importa: lo que se EXIGIÓ conservar y
 * esta implementación no sabe hacer. Quien decida si esto se ejecuta o no lo
 * hará con esa lista —y lo hará arriba, en la política de ruteo, no aquí—.
 */
export interface TraduccionDeContinuidad {
  aspects: readonly TraduccionDeAspecto[];
  /** Exigidos que esta implementación no puede sostener. Nunca se ocultan. */
  noCubiertos: readonly ContinuityAspect[];
  /** Cuántas referencias se pueden llevar de verdad. */
  referenciasUsadas: number;
  /** Cuántas se quedan fuera por falta de huecos. */
  referenciasDescartadas: number;
  /** La fuerza pedida, tal cual. Nunca se baja. */
  strength?: ContinuityStrength;
  /** Si la implementación no sabe traducir la fuerza, se dice. */
  fuerzaSinTraducir: boolean;
}

/* ── El material que de verdad hay delante ────────────────────────────────── */

/**
 * LO QUE LLEGÓ EN LA ENTRADA. No se busca: se recibe.
 *
 * Un adaptador no consulta la cuenta de nadie. Si hace falta material y no
 * está, se dice `missing_material` y se acabó — inventarlo, o ir a buscarlo,
 * convertiría al adaptador en un lector con permisos, que es justo lo que no
 * puede ser.
 */
export interface MaterialDisponible {
  imagenes: number;
  videos?: number;
}

const esObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * CUÁNTAS REFERENCIAS TRAE UNA ENTRADA. Contar, no buscar.
 *
 * Las claves son las que los adaptadores ya leen hoy. Esto no añade un
 * mecanismo: cuenta el que hay.
 */
export const materialDeLaEntrada = (input: unknown): MaterialDisponible => {
  if (!esObjeto(input)) return { imagenes: 0, videos: 0 };
  const lista = (v: unknown): number => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x).length : 0);
  const suelta = (v: unknown): number => (typeof v === 'string' && v ? 1 : 0);
  return {
    imagenes: suelta(input.imageUrl) + lista(input.referenceImages) + lista(input.referenceUrls),
    videos: lista(input.referenceVideos),
  };
};

/* ── La traducción ────────────────────────────────────────────────────────── */

/**
 * DEL REQUISITO A LO QUE ESTA IMPLEMENTACIÓN PUEDE INTENTAR. Pura.
 *
 * ── Las cinco reglas que hace cumplir ───────────────────────────────────────
 *
 * 1 · NADA SE DEGRADA EN SILENCIO. Un aspecto exigido que no se puede sostener
 *     sale en `noCubiertos`, con su nombre. No se quita de la lista, no se
 *     convierte en otra cosa y no se aproxima.
 *
 * 2 · UNA FRASE NO ES SOPORTE. `prompt_only` es `unsupported`, y se dice por
 *     qué.
 *
 * 3 · SIN MATERIAL NO HAY REFERENCIA. Tener huecos no basta: si no llegó
 *     ninguna imagen, el mecanismo no se puede usar y se dice.
 *
 * 4 · LO LIBERADO NO SE TRADUCE. `mayChange` es permiso, no orden: no se pide
 *     nada al proveedor por un aspecto que el usuario autorizó a cambiar.
 *
 * 5 · LA FUERZA NO SE BAJA. Si la implementación no sabe traducirla, se
 *     transporta tal cual y se marca `fuerzaSinTraducir`. `strict` nunca se
 *     convierte en `standard` por el camino.
 */
export const traducirContinuidad = (
  requisitos: ContinuityRequirements | undefined,
  mecanismo: MecanismoDeContinuidad,
  material: MaterialDisponible,
): TraduccionDeContinuidad | undefined => {
  if (!requisitos || !Array.isArray(requisitos.preserve) || requisitos.preserve.length === 0) return undefined;

  const dedicados = new Set(mecanismo.controlesDedicados ?? []);
  const huecos = Math.max(0, mecanismo.referenciasDeImagen) + Math.max(0, mecanismo.referenciasDeVideo ?? 0);
  const disponibles = Math.max(0, material.imagenes) + Math.max(0, material.videos ?? 0);
  const usadas = Math.min(huecos, disponibles);
  const hayReferencia = usadas > 0;

  const aspects: TraduccionDeAspecto[] = [];
  const noCubiertos: ContinuityAspect[] = [];

  for (const aspect of requisitos.preserve) {
    if (dedicados.has(aspect)) { aspects.push({ aspect, support: 'supported', reason: 'dedicated_control' }); continue; }
    if (huecos === 0) {
      /* Sin huecos, da igual lo que haya llegado: no hay por dónde meterlo. */
      aspects.push({ aspect, support: 'unsupported', reason: mecanismo.soloPorPrompt ? 'prompt_only' : 'no_mechanism' });
      noCubiertos.push(aspect);
      continue;
    }
    if (!hayReferencia) {
      aspects.push({ aspect, support: 'unsupported', reason: 'missing_material' });
      noCubiertos.push(aspect);
      continue;
    }
    /*
     * Hay mecanismo y hay material. Es PARCIAL y no más: una referencia no
     * promete que el rostro sea el mismo, promete parecerse a lo que enseña.
     */
    aspects.push({ aspect, support: 'partial', reason: 'reference_conditioning' });
  }

  return Object.freeze({
    aspects: Object.freeze(aspects),
    noCubiertos: Object.freeze(noCubiertos),
    referenciasUsadas: usadas,
    referenciasDescartadas: Math.max(0, disponibles - usadas),
    ...(requisitos.strength ? { strength: requisitos.strength } : {}),
    fuerzaSinTraducir: requisitos.strength !== undefined && mecanismo.admiteFuerza !== true,
  });
};

/**
 * ¿PUEDE ESTA IMPLEMENTACIÓN SOSTENER TODO LO EXIGIDO?
 *
 * Y ojo con lo que NO significa: que pueda intentarlo no significa que el
 * resultado conserve nada. Eso lo dirá un validador visual, que es otra fase y
 * otra pregunta. Aquí solo se responde si hay por dónde pedirlo.
 */
export const cubreLoExigido = (t: TraduccionDeContinuidad | undefined): boolean =>
  t === undefined || t.noCubiertos.length === 0;

/**
 * LO QUE UNA IMPLEMENTACIÓN DECLARA SABER CONSERVAR, en el vocabulario de C2.
 *
 * Es el puente hacia `ContinuitySupport` y hacia la comprobación previa que C2
 * dejó escrita. Solo entra lo que sale `supported` o `partial`: lo demás no se
 * sabe hacer, y decir que sí sería exactamente lo que esta fase existe para no
 * hacer.
 */
export const aspectosQueSostiene = (t: TraduccionDeContinuidad | undefined): readonly ContinuityAspect[] =>
  Object.freeze((t?.aspects ?? []).filter((a) => a.support !== 'unsupported').map((a) => a.aspect));
