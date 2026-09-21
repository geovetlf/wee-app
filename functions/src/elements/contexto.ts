import type { Firestore } from 'firebase-admin/firestore';
import {
  BrainAttachment,
  BrainUnderstanding,
  VisualContextRequest,
  VisualContextResult,
  materialesDelContexto,
  resolverContexto,
  trazaDeContexto,
} from '../core';
import { DepsDeElementos, mundoDeContextoDeWee } from './index';

/**
 * WEË — LA PUERTA DEL CONTEXTO VISUAL A WEË BRAIN.
 *
 * ── Lo que hace, en una frase ───────────────────────────────────────────────
 *
 * Brain entiende que hace falta «un producto». Esto va a buscar cuál, y
 * devuelve los materiales de esa cosa como los adjuntos que Brain y el Planner
 * YA saben leer. Nada más.
 *
 * ── Lo que NO hace, y conviene leerlo entero ────────────────────────────────
 *
 * No decide cuál es «la hamburguesa»: eso lo decide `resolverContexto`, que es
 * puro y sigue siendo de S3. No busca: eso lo hace `mundoDeContextoDeWee`, que
 * es de S4. No interpreta lenguaje: eso ya lo hizo Brain. No llama a ningún
 * modelo, no elige proveedor, no crea trabajos y no toca un byte.
 *
 * Este archivo son TREINTA LÍNEAS de pegamento entre tres cosas que ya
 * existían y estaban probadas. Si algún día tiene lógica propia, algo se hizo
 * mal.
 *
 * ── Y está cerrada ──────────────────────────────────────────────────────────
 *
 * Toca el camino real de Weë Brain, que cobra Credits y responde a personas.
 * Así que hay un interruptor, está APAGADO por defecto, y apagado significa
 * que Brain se comporta EXACTAMENTE como ayer: no se consulta nada, no se
 * resuelve nada y no se añade un milisegundo.
 */

/* ── El interruptor ───────────────────────────────────────────────────────── */

export const COLECCION_DEL_CONTEXTO = 'aiSettings';
export const DOCUMENTO_DEL_CONTEXTO = 'visualContext';
export const VIGENCIA_DEL_CONTEXTO_MS = 60_000;

/**
 * QUÉ SE PUEDE ENCENDER, Y PARA QUIÉN.
 *
 * Es el mismo patrón que la puerta de F12-D —un documento en `aiSettings`, que
 * ya está cerrada a los clientes— y NO el mismo documento: son dos preguntas
 * distintas («¿va por el conductor?» y «¿se resuelve contexto?») y juntarlas
 * significaría que apagar una apaga la otra.
 *
 * En Firestore y no en una variable de entorno, por lo de siempre: volver atrás
 * no puede depender de un despliegue.
 */
export interface ConfiguracionDelContexto {
  habilitado: boolean;
  /** Si está, SOLO estas cuentas. Un canary se prueba con una cuenta, no con todas. */
  cuentas?: readonly string[];
}

export const CONTEXTO_CERRADO: ConfiguracionDelContexto = Object.freeze({ habilitado: false });

const FORMA_DE_CUENTA = /^[A-Za-z0-9_-]{1,128}$/;
const MAX_CUENTAS = 64;

/** Lo guardado, leído con desconfianza. Cualquier cosa rara deja el interruptor APAGADO. */
export const leerConfiguracionDelContexto = (crudo: unknown): ConfiguracionDelContexto => {
  if (typeof crudo !== 'object' || crudo === null || Array.isArray(crudo)) return CONTEXTO_CERRADO;
  const c = crudo as Record<string, unknown>;
  if (typeof c.habilitado !== 'boolean') return CONTEXTO_CERRADO;
  const cuentas = Array.isArray(c.cuentas)
    && c.cuentas.length <= MAX_CUENTAS
    && c.cuentas.every((x) => typeof x === 'string' && FORMA_DE_CUENTA.test(x))
    ? (c.cuentas as readonly string[])
    : undefined;
  return { habilitado: c.habilitado, ...(cuentas ? { cuentas } : {}) };
};

export type MotivoDelContexto = 'abierto' | 'deshabilitado' | 'cuenta_fuera_de_la_prueba' | 'sin_necesidades';

/**
 * ¿SE RESUELVE CONTEXTO PARA ESTA PETICIÓN?
 *
 * Función pura, como la puerta de F12-D. Y fíjate en el último motivo: aunque
 * el interruptor esté encendido, si el entendimiento no declara que hace falta
 * nada, NO se consulta nada. Ese es el caso normal —«escríbeme una
 * descripción»— y tiene que costar cero.
 */
export const decidirContexto = (
  config: ConfiguracionDelContexto,
  peticion: { accountId?: string; necesidades: number },
): { resolver: boolean; motivo: MotivoDelContexto } => {
  if (!config.habilitado) return { resolver: false, motivo: 'deshabilitado' };
  if (config.cuentas && !(peticion.accountId && config.cuentas.includes(peticion.accountId))) {
    return { resolver: false, motivo: 'cuenta_fuera_de_la_prueba' };
  }
  if (peticion.necesidades === 0) return { resolver: false, motivo: 'sin_necesidades' };
  return { resolver: true, motivo: 'abierto' };
};

let cache: { valor: ConfiguracionDelContexto; hasta: number } | undefined;

/** Lo guardado, con el minuto de caché de siempre. Si Firestore no contesta, queda CERRADO. */
export const configuracionDelContexto = async (db: Firestore, ahora = Date.now()): Promise<ConfiguracionDelContexto> => {
  if (cache && cache.hasta > ahora) return cache.valor;
  try {
    const snap = await db.collection(COLECCION_DEL_CONTEXTO).doc(DOCUMENTO_DEL_CONTEXTO).get();
    const valor = leerConfiguracionDelContexto(snap.exists ? snap.data() : undefined);
    cache = { valor, hasta: ahora + VIGENCIA_DEL_CONTEXTO_MS };
    return valor;
  } catch {
    return CONTEXTO_CERRADO;
  }
};

/** Para las pruebas y para un cierre de emergencia: olvida lo que tenía en la mano. */
export const olvidarElContexto = (): void => { cache = undefined; };

/* ── De un entendimiento a una petición de contexto ───────────────────────── */

/**
 * LO QUE BRAIN ENTENDIÓ, CONVERTIDO EN UNA PREGUNTA AL CONTEXTO.
 *
 * Y lo importante es lo que NO se copia. El objetivo, el texto de la persona,
 * la conversación y las suposiciones se quedan donde están: al contexto solo le
 * hace falta saber QUÉ CLASE de cosa busca y dentro de qué.
 *
 * La cuenta NO sale del entendimiento: entra por parámetro, desde la sesión.
 * Un entendimiento viene en el fondo de algo que alguien escribió, y de ahí no
 * se saca nunca de quién es nada.
 */
export const peticionDesdeElEntendimiento = (
  accountId: string,
  entendimiento: BrainUnderstanding,
): VisualContextRequest => ({
  accountId,
  ...(entendimiento.intent ? { intent: entendimiento.intent } : {}),
  ...(entendimiento.projectId ? { projectId: entendimiento.projectId } : {}),
  ...(entendimiento.context?.length ? { needs: entendimiento.context } : {}),
});

/* ── La costura ───────────────────────────────────────────────────────────── */

export interface ContextoResuelto {
  resultado: VisualContextResult;
  /** Los materiales, en la forma que Brain y el Planner YA leen. Nunca una copia. */
  adjuntos: readonly BrainAttachment[];
  motivo: MotivoDelContexto;
}

export interface DepsDelContextoDeBrain extends DepsDeElementos {
  /** Lo guardado, ya leído. Se pasa para poder probar el camino sin Firestore. */
  config?: ConfiguracionDelContexto;
  /** Una línea por resolución, cuando hubo algo que decir. */
  observar?: (linea: string) => void;
}

const NADA: ContextoResuelto = Object.freeze({
  resultado: Object.freeze({ contract: '1.0', status: 'not_found', reason: 'no_needs' }) as VisualContextResult,
  adjuntos: Object.freeze([]) as readonly BrainAttachment[],
  motivo: 'deshabilitado',
});

/**
 * ¿QUÉ DE LO TUYO HACE FALTA PARA ESTO, Y DÓNDE ESTÁ?
 *
 * Tres llamadas a cosas que ya existían, en este orden:
 *
 *   1 · `mundoDeContextoDeWee`   (S4) trae lo justo, acotado y por cuenta.
 *   2 · `resolverContexto`       (S3) decide, o dice que no puede decidir.
 *   3 · `materialesDelContexto`  (S3) lo convierte en adjuntos de Brain.
 *
 * Y si el interruptor está apagado, o esta cuenta no está en la prueba, o el
 * entendimiento no pedía nada: NO SE LLAMA A NINGUNA. Ni una lectura.
 */
export const contextoParaBrain = async (
  accountId: string,
  entendimiento: BrainUnderstanding,
  deps: DepsDelContextoDeBrain = {},
): Promise<ContextoResuelto> => {
  const config = deps.config ?? (deps.db ? await configuracionDelContexto(deps.db) : CONTEXTO_CERRADO);
  const decision = decidirContexto(config, { accountId, necesidades: entendimiento.context?.length ?? 0 });
  if (!decision.resolver) return { ...NADA, motivo: decision.motivo };

  const peticion = peticionDesdeElEntendimiento(accountId, entendimiento);
  const mundo = await mundoDeContextoDeWee(peticion, deps);
  const resultado = resolverContexto(mundo, peticion);
  /*
   * AMBIGUO TAMBIÉN DEVUELVE ADJUNTOS SI RESOLVIÓ ALGO. Con dos necesidades,
   * que una empate no puede tirar la otra: se entrega lo que sí se resolvió y
   * lo que empató viaja en el resultado para que alguien pueda preguntar.
   */
  const adjuntos = materialesDelContexto(resultado);

  if (deps.observar) {
    /* Cuatro datos y ninguno es contenido: ni el nombre de nada, ni ids de material. */
    const t = trazaDeContexto(resultado);
    deps.observar(`WEË CONTEXTO: ${t.status} elementos=${t.elements} materiales=${t.assets}${t.reason ? ` reason=${t.reason}` : ''}`);
  }
  return { resultado, adjuntos, motivo: decision.motivo };
};
