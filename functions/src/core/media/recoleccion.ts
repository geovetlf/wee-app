import { JobState, esTrabajoTerminal } from '../job';
import { MediaObject } from './objeto';

/**
 * MC-5 · WEE MEDIA CLOUD — CUÁNDO UNOS BYTES DEJAN DE HACER FALTA.
 *
 * ── El problema, medido ─────────────────────────────────────────────────────
 *
 * `retirarMaterial` (F11) borra el objeto físico solo cuando vive en el almacén
 * de Weë. Para cualquier otro proveedor marca `pendingPhysicalDeletion` y se va.
 * Es lo correcto —antes que borrar el objeto equivocado, no borrar— pero
 * significa que **hoy nada borra un objeto de un proveedor externo**: cada
 * material retirado deja sus bytes ahí para siempre, y cada subida que no llegó
 * a confirmarse deja un objeto que ningún material reclama.
 *
 * A diez millones de cuentas eso no es un detalle: es almacenamiento que crece
 * y no baja nunca.
 *
 * ── Lo que este archivo decide, y lo que NO hace ────────────────────────────
 *
 * Decide. No borra, no lee, no consulta y no conoce ningún proveedor. Recibe lo
 * que otro ya averiguó —la ficha del objeto, qué referencias lógicas se
 * encontraron apuntándole, en qué estado están los trabajos que podrían
 * necesitarlo— y contesta qué hacer con él. Como el resto del Core: una función
 * pura sobre hechos ya reunidos.
 *
 * ── La regla que manda sobre todas las demás ────────────────────────────────
 *
 * **Ante la duda, se protege.** Un objeto que no se borra hoy se puede borrar
 * mañana; unos bytes borrados de más no vuelven. Por eso toda entrada ambigua
 * —una lista de referencias que no se pudo leer, un trabajo en estado
 * desconocido, una edad que no se puede calcular— sale de aquí como
 * `proteger`, nunca como `borrar`.
 *
 * ── Y la que evita el desastre clásico ──────────────────────────────────────
 *
 * Que una referencia haya desaparecido NO autoriza a borrar. El mismo objeto
 * puede estar referenciado por otra versión, por otra variante o por un
 * material que se creó mientras el barrido miraba. Quien ejecute esto tiene que
 * volver a preguntar **justo antes** de borrar, y volver a pasar por aquí. Esta
 * función es barata y determinista precisamente para que eso sea posible.
 */

/* ── Lo que hay que saber de un objeto para decidir ─────────────────────────── */

/**
 * UNA REFERENCIA LÓGICA QUE APUNTA A ESTOS BYTES.
 *
 * No es un contrato nuevo de material: es el resultado de haber buscado. Lleva
 * de dónde viene para poder explicarlo en un informe, y nada más — la decisión
 * solo necesita saber CUÁNTAS hay y si siguen vivas.
 */
export type ClaseDeReferencia = 'material' | 'variante' | 'version';

export interface ReferenciaLogica {
  clase: ClaseDeReferencia;
  /** El material de la Fase 11 que la sostiene. */
  assetId: string;
  /**
   * Si el material que la sostiene sigue vivo. Un material `deleted` ya no
   * reclama sus bytes: su ficha se queda, sus objetos no.
   */
  viva: boolean;
}

/**
 * LO QUE SE LE PASA A LA DECISIÓN. Todo ya leído; aquí no se consulta nada.
 *
 * `operaciones` son los estados de los trabajos que podrían producir o
 * necesitar estos bytes. Son los estados REALES del Job Engine —no un segundo
 * vocabulario— y se preguntan con `esTrabajoTerminal`, que ya existe.
 */
export interface EntradaDeRecoleccion {
  objeto: MediaObject;
  referencias: readonly ReferenciaLogica[];
  operaciones: readonly JobState[];
  /**
   * `false` cuando no se pudo reunir la lista de referencias con certeza. Una
   * lectura incompleta no es una ausencia de referencias: es no saber, y no
   * saber protege.
   */
  referenciasCompletas: boolean;
}

/* ── La política, en un solo sitio ──────────────────────────────────────────── */

/**
 * LOS LÍMITES. Aquí y en ningún otro archivo.
 *
 * Deliberadamente conservadores, y cada uno con su porqué:
 *
 *   edadMinimaMs      SIETE DÍAS antes de considerar huérfano a nada. Un
 *                     permiso de subida dura quince minutos y un trabajo con
 *                     todos sus reintentos, mucho menos que un día. Una semana
 *                     está tan lejos de cualquier operación en vuelo que la
 *                     carrera «se creó mientras mirábamos» deja de existir.
 *   esperaEntreIntentosMs  Una hora entre intentos físicos fallidos. Un fallo
 *                     del proveedor casi siempre es pasajero, y reintentar en
 *                     bucle es la forma de convertir una avería suya en una
 *                     factura nuestra.
 *   maxIntentos       CINCO, y después se deja en paz y se informa. Lo que
 *                     falla cinco veces separadas por una hora no es pasajero:
 *                     necesita que lo mire una persona, no un sexto intento.
 *   maxPorEjecucion   CIEN objetos por barrido. No hay recorrido ilimitado.
 */
export interface PoliticaDeRecoleccion {
  edadMinimaMs: number;
  esperaEntreIntentosMs: number;
  maxIntentos: number;
  maxPorEjecucion: number;
}

export const POLITICA_DE_RECOLECCION: PoliticaDeRecoleccion = Object.freeze({
  edadMinimaMs: 7 * 24 * 60 * 60 * 1000,
  esperaEntreIntentosMs: 60 * 60 * 1000,
  maxIntentos: 5,
  maxPorEjecucion: 100,
});

/* ── El veredicto ───────────────────────────────────────────────────────────── */

/**
 * POR QUÉ SE PROTEGE. Un enum, no una frase: esto viaja a un informe y a una
 * traza, y quien lo lea tiene que poder agruparlo.
 */
export type MotivoDeProteccion =
  /* Alguien lo sigue reclamando. */
  | 'referenciado'
  /* Todavía no se pudo saber si alguien lo reclama. */
  | 'referencias_inciertas'
  /* Existe pero es demasiado joven: podría estar a mitad de nacer. */
  | 'demasiado_reciente'
  /* Un trabajo vivo podría producirlo o necesitarlo. */
  | 'operacion_en_curso'
  /* Falló al borrarse y todavía no toca reintentar. */
  | 'esperando_reintento'
  /* Falló demasiadas veces. Se deja quieto y se informa. */
  | 'intentos_agotados'
  /* La ficha no es utilizable. Nunca se actúa sobre lo que no se entiende. */
  | 'ficha_invalida';

export type VeredictoDeRecoleccion =
  /* No se toca. */
  | { accion: 'proteger'; motivo: MotivoDeProteccion }
  /* Se le pide al proveedor que lo borre — DESPUÉS de volver a comprobar. */
  | { accion: 'borrar' }
  /* La ficha dice `borrado` pero sigue sin cerrarse: se cierra y ya. */
  | { accion: 'finalizar' };

/* ── La decisión ────────────────────────────────────────────────────────────── */

/** ¿Hay algún trabajo que todavía podría producir o necesitar estos bytes? */
export const hayOperacionEnCurso = (operaciones: readonly JobState[]): boolean =>
  (operaciones ?? []).some((e) => !esTrabajoTerminal(e));

/** ¿Queda alguna referencia lógica VIVA apuntándole? */
export const sigueReferenciado = (referencias: readonly ReferenciaLogica[]): boolean =>
  (referencias ?? []).some((r) => r.viva === true);

/**
 * CUÁNTOS INTENTOS FÍSICOS LLEVA. Se lee de la ficha; si no hay número, cero.
 * Nunca se confía en que sea un entero: una ficha vieja o tocada a mano no
 * puede hacer que la aritmética decida un borrado.
 */
export const intentosDe = (o: MediaObject): number => {
  const n = (o as { intentosDeBorrado?: unknown }).intentosDeBorrado;
  return typeof n === 'number' && Number.isInteger(n) && n >= 0 ? n : 0;
};

const ultimoIntentoDe = (o: MediaObject): number | undefined => {
  const n = (o as { ultimoIntentoDeBorradoEn?: unknown }).ultimoIntentoDeBorradoEn;
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
};

/**
 * QUÉ HACER CON ESTOS BYTES.
 *
 * El orden de las comprobaciones es la mitad del diseño, y va de lo más barato
 * y más protector a lo más comprometido. Lo que protege se comprueba ANTES que
 * lo que autoriza a borrar, para que ninguna ruta llegue a `borrar` saltándose
 * una protección.
 */
export const decidirRecoleccion = (
  entrada: EntradaDeRecoleccion,
  politica: PoliticaDeRecoleccion,
  at: number,
): VeredictoDeRecoleccion => {
  const o = entrada?.objeto;

  /* 0 · Lo que no se entiende, no se toca. */
  if (!o || typeof o !== 'object') return { accion: 'proteger', motivo: 'ficha_invalida' };
  if (typeof o.objectRef !== 'string' || !o.objectRef) return { accion: 'proteger', motivo: 'ficha_invalida' };
  if (typeof o.accountId !== 'string' || !o.accountId) return { accion: 'proteger', motivo: 'ficha_invalida' };
  if (!Number.isFinite(at) || !Number.isFinite(o.createdAt)) return { accion: 'proteger', motivo: 'ficha_invalida' };

  /* 1 · Ya está borrado del proveedor: solo falta cerrar la ficha. */
  if (o.estado === 'borrado') {
    return Number.isFinite(o.deletedAt) ? { accion: 'proteger', motivo: 'referenciado' } : { accion: 'finalizar' };
  }
  if (o.estado !== 'guardado') return { accion: 'proteger', motivo: 'ficha_invalida' };

  /* 2 · No saber es motivo de protección, no de borrado. */
  if (entrada.referenciasCompletas !== true) return { accion: 'proteger', motivo: 'referencias_inciertas' };

  /* 3 · Alguien lo reclama. */
  if (sigueReferenciado(entrada.referencias)) return { accion: 'proteger', motivo: 'referenciado' };

  /* 4 · Un trabajo vivo podría producirlo o necesitarlo. */
  if (hayOperacionEnCurso(entrada.operaciones)) return { accion: 'proteger', motivo: 'operacion_en_curso' };

  /*
   * 5 · Demasiado joven. Esta es la que mata la carrera de creación: entre que
   * alguien pide un permiso de subida y la ficha del material queda escrita
   * pasan milisegundos, pero entre eso y una semana no pasa nada.
   */
  if (at - o.createdAt < politica.edadMinimaMs) return { accion: 'proteger', motivo: 'demasiado_reciente' };

  /* 6 · Lo que falló demasiado se deja quieto: un bucle infinito no arregla nada. */
  const intentos = intentosDe(o);
  if (intentos >= politica.maxIntentos) return { accion: 'proteger', motivo: 'intentos_agotados' };

  /* 7 · Falló hace poco: se espera. */
  const ultimo = ultimoIntentoDe(o);
  if (ultimo !== undefined && at - ultimo < politica.esperaEntreIntentosMs) {
    return { accion: 'proteger', motivo: 'esperando_reintento' };
  }

  return { accion: 'borrar' };
};

/**
 * ¿ES ESTE OBJETO DE ESTA CUENTA, Y SU CLAVE VIVE DONDE DEBE?
 *
 * Se comprueba aparte y SIEMPRE antes de borrar nada, porque es la única
 * protección que no depende de referencias ni de relojes: que unos bytes de una
 * cuenta no puedan borrarse por una decisión tomada sobre otra. `claveEsDeLaCuenta`
 * y `objetoEsDeLaCuenta` ya existen en `objeto.ts` y son las que mandan; esto
 * solo las nombra juntas para que nadie las use por separado.
 */
export const REGLA_DE_AISLAMIENTO = 'objetoEsDeLaCuenta && claveEsDeLaCuenta';

/* ── Lo que el barrido informa ──────────────────────────────────────────────── */

/**
 * EL INFORME DE UNA EJECUCIÓN. Números y enums; ni una credencial, ni una URL,
 * ni una clave de objeto. Lo que identifica una ejecución es su `runId`, y lo
 * que identifica un problema concreto es el `objectRef`, que es una huella
 * derivada y no dice dónde están los bytes.
 */
export interface InformeDeRecoleccion {
  runId: string;
  providerId?: string;
  accountId?: string;
  inspeccionados: number;
  candidatos: number;
  protegidos: number;
  borrados: number;
  yaNoEstaban: number;
  finalizados: number;
  reintentables: number;
  atascados: number;
  errores: number;
  /**
   * Los bytes SE FUERON, pero la ficha no quedó cerrada POR NOSOTROS: otro
   * escritor la cambió entre que se leyó y se intentó cerrar. No es un error y
   * no se reintenta aquí — el próximo barrido converge solo, porque el
   * proveedor ya dirá `yaNoEstaba`. Está para que eso se VEA en el informe en
   * vez de repetirse en silencio en cada pasada.
   */
  fichasNoCerradas: number;
  porMotivo: Readonly<Record<string, number>>;
  /** Desde dónde seguir. Un cursor estable, jamás un desplazamiento. */
  cursor?: string;
  ms: number;
}

export const informeVacio = (runId: string): InformeDeRecoleccion => ({
  runId,
  inspeccionados: 0,
  candidatos: 0,
  protegidos: 0,
  borrados: 0,
  yaNoEstaban: 0,
  finalizados: 0,
  reintentables: 0,
  atascados: 0,
  errores: 0,
  fichasNoCerradas: 0,
  porMotivo: Object.freeze({}),
  ms: 0,
});
