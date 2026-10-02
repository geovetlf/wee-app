import { Firestore, getFirestore } from 'firebase-admin/firestore';
import {
  Element,
  ElementAssetRef,
  ElementRelation,
  ElementType,
  ELEMENT_CONTRACT_VERSION,
  MundoDeContexto,
  ProblemaDeElemento,
  VisualContextRequest,
  archivar,
  elementoValido,
  puedeReferenciar,
  validarElemento,
  MAX_ELEMENTOS_EN_RESULTADO,
  MAX_REFERENCIAS,
  MotivoDeNoReferenciar,
  FichaDeMaterial,
} from '../core';
import { leerMaterial } from '../content';

/**
 * WEË ELEMENTS — EL RUNTIME. Donde los contratos de S3 se vuelven reales.
 *
 * ── Qué es esto y qué NO es ─────────────────────────────────────────────────
 *
 * S3 dejó dos contratos puros —qué es un Element, cómo se resuelve un
 * contexto— y dijo en su informe, con todas las letras, lo que faltaba: «el
 * día que se persista habrá que escribir el adaptador de Firestore, sus reglas
 * y su índice. La tubería a la base de datos, no existe.»
 *
 * Esto es esa tubería. Nada más.
 *
 * Aquí NO hay decisiones. No se decide cuál es «la hamburguesa» —eso lo decide
 * `resolverContexto`, que sigue siendo puro—, no se interpreta lenguaje, no se
 * llama a ningún modelo y no se elige ningún proveedor. Lo único que se hace
 * aquí es LEER lo justo y ESCRIBIR lo validado.
 *
 *   runtime  →  Core            LEE del mundo y le pasa el mundo al resolutor.
 *   Core     ↛  Firestore       El Core no sabe que esto existe, y no va a saberlo.
 *
 * ── La regla que gobierna cada consulta ─────────────────────────────────────
 *
 * TODA consulta empieza por `ownerAccountId`. No hay una sola lectura de este
 * archivo que pueda devolver algo de otra cuenta, y no porque se filtre
 * después: porque la consulta no lo trae. Un filtro posterior es una promesa;
 * un `where` es una garantía.
 *
 * Y toda consulta lleva `limit`. Weë está diseñado para diez millones de
 * personas, y «traer los elementos de la cuenta» sin tope es una consulta que
 * un día trae cincuenta mil.
 *
 * ── Y el Admin SDK no es una excusa ─────────────────────────────────────────
 *
 * Las reglas de Firestore protegen al CLIENTE. Este código corre con el Admin
 * SDK y se las salta, así que «las reglas ya lo cubren» aquí no significa
 * nada: la propiedad se comprueba en el dominio, una por una, y las reglas son
 * la segunda cerradura, no la única.
 */

export const COLECCION_DE_ELEMENTOS = 'elements';

/**
 * LAS FILAS DE UN PROYECTO. El contrato `ProjectItem` de F11.
 *
 * OJO, Y ESTÁ EN EL INFORME: hoy NADIE escribe en esta colección. El contrato
 * existe desde F11 y su runtime nunca se construyó. Esto la LEE —acotada y por
 * cuenta— para que la señal «está en el proyecto que tienes abierto» funcione
 * el día que alguien escriba ahí, y para poder probarla de verdad ahora.
 */
export const COLECCION_DE_ITEMS_DE_PROYECTO = 'projectItems';

/**
 * LO QUE ESTE ARCHIVO NECESITA DEL MUNDO. Dos puertas y las dos con valor por
 * defecto: la base y quién sabe leer una ficha de material.
 *
 * El lector de materiales entra por aquí —y no se llama a `leerMaterial`
 * directamente— porque esta capa tiene que poder probarse sin Firestore. No es
 * una abstracción de más: es la única forma de que la comprobación de
 * propiedad de un material se pruebe con una tabla de casos en vez de con una
 * base de datos.
 */
export interface LectorDeMateriales {
  (assetId: string): Promise<FichaDeMaterial | null>;
}

export interface DepsDeElementos {
  db?: Firestore;
  material?: LectorDeMateriales;
}

const laBase = (deps: DepsDeElementos = {}): Firestore => deps.db ?? getFirestore();
const elementos = (deps: DepsDeElementos = {}) => laBase(deps).collection(COLECCION_DE_ELEMENTOS);

/** Por defecto, el Content Core de F11. Ni una segunda lectura, ni una segunda verdad. */
const materialPorDefecto: LectorDeMateriales = async (assetId) => {
  const ficha = await leerMaterial(assetId);
  return ficha ? { assetId: ficha.assetId, ownerAccountId: ficha.ownerAccountId, kind: ficha.kind, status: ficha.status } : null;
};

/* Firestore no admite `undefined`. Mismo apaño que `content/index.ts`, y por lo mismo. */
const limpiar = <T extends object>(o: T): T =>
  Object.fromEntries(Object.entries(o as Record<string, unknown>).filter(([, v]) => v !== undefined)) as T;

/**
 * EL DOCUMENTO ES EL CONTRATO. No hay `ElementDoc`, ni DTO, ni mapper.
 *
 * Una segunda representación con los mismos campos es una segunda verdad que
 * alguien tendrá que mantener sincronizada, y el día que se desincronicen el
 * error será silencioso. Lo que se guarda es un `Element`, y lo que se lee se
 * valida contra el MISMO validador del Core antes de devolverlo.
 */
export type ElementoGuardado = Element;

/* ── Crear ────────────────────────────────────────────────────────────────── */

export interface NuevoElemento {
  /**
   * LA CUENTA, ya resuelta desde la sesión por `cuentaDelPrincipalEnWee`.
   * Nunca lo que mande el cliente: quien llame a esto ya tuvo que demostrar de
   * qué cuenta puede actuar.
   */
  accountId: string;
  /**
   * El id, ESTABLE y elegido por quien crea. Es lo que hace que crear dos veces
   * no cree dos cosas: no hace falta un motor de idempotencia porque el id ya
   * ES la clave, igual que un material tiene el suyo.
   */
  elementId: string;
  type: ElementType;
  name: string;
  description?: string;
  refs: readonly ElementAssetRef[];
  related?: readonly ElementRelation[];
  /** Desde qué cara se creó. Atribución, jamás propiedad. */
  createdByEntityId?: string;
  at: number;
}

export type ResultadoDeCreacion =
  | { status: 'creado'; element: Element }
  /* Ya estaba, con ese id y en esta cuenta. Se devuelve el que hay: crear es idempotente. */
  | { status: 'ya_existe'; element: Element }
  | { status: 'invalido'; problemas: readonly ProblemaDeElemento[] }
  /* Uno de los materiales no se puede enlazar. No se dice de quién es: ver `puedeReferenciar`. */
  | { status: 'material_rechazado'; assetId: string; motivo: MotivoDeNoReferenciar };

/**
 * ¿SON TUYOS Y SE PUEDEN USAR TODOS ESTOS MATERIALES?
 *
 * Una lectura por material, y son como mucho 32 —el tope del contrato—. No hay
 * un lote genérico porque no hay un patrón de lotes en Weë que reutilizar, y
 * medir antes de abstraer es lo que evita una capa que nadie pidió.
 *
 * La comprobación la hace el CORE (`puedeReferenciar`): aquí solo se trae la
 * ficha. Así la regla de «no está» y «no es tuyo» contestan igual vive en un
 * sitio y no se puede reimplementar mal en el segundo.
 */
const revisarMateriales = async (
  accountId: string,
  refs: readonly ElementAssetRef[],
  deps: DepsDeElementos,
): Promise<{ ok: true } | { ok: false; assetId: string; motivo: MotivoDeNoReferenciar }> => {
  const leer = deps.material ?? materialPorDefecto;
  for (const ref of refs) {
    const ficha = await leer(ref.assetId);
    const veredicto = puedeReferenciar(ref, ficha ?? undefined, accountId);
    if (!veredicto.ok) return { ok: false, assetId: ref.assetId, motivo: veredicto.reason };
  }
  return { ok: true };
};

/**
 * CREAR UNA COSA. Ocho pasos y ninguno se salta.
 *
 * El último detalle importa: se escribe con `create`, no con `set`. Si ya hay
 * algo con ese id, `create` falla, se lee lo que hay y se devuelve — en vez de
 * pisar en silencio una cosa que alguien ya tenía. Es la misma regla que usa
 * el almacén de trabajos y la que hace que un reintento no destruya nada.
 */
export const crearElemento = async (datos: NuevoElemento, deps: DepsDeElementos = {}): Promise<ResultadoDeCreacion> => {
  const element: Element = limpiar({
    contract: ELEMENT_CONTRACT_VERSION,
    elementId: datos.elementId,
    type: datos.type,
    version: 1,
    status: 'active' as const,
    name: datos.name,
    description: datos.description,
    ownerAccountId: datos.accountId,
    createdByEntityId: datos.createdByEntityId,
    refs: [...datos.refs],
    related: datos.related ? [...datos.related] : undefined,
    createdAt: datos.at,
    updatedAt: datos.at,
  });

  const problemas = validarElemento(element);
  if (problemas.length) return { status: 'invalido', problemas };

  const materiales = await revisarMateriales(datos.accountId, element.refs, deps);
  if (!materiales.ok) return { status: 'material_rechazado', assetId: materiales.assetId, motivo: materiales.motivo };

  const ref = elementos(deps).doc(element.elementId);
  try {
    await ref.create(element);
    return { status: 'creado', element };
  } catch {
    /* Ya estaba. Se devuelve EL QUE HAY, y solo si es de esta cuenta. */
    const ya = await leerElemento(datos.accountId, element.elementId, deps);
    return ya ? { status: 'ya_existe', element: ya } : { status: 'invalido', problemas: [{ field: 'elementId', reason: 'invalid_id' }] };
  }
};

/* ── Leer ─────────────────────────────────────────────────────────────────── */

/**
 * UNA COSA, SI ES TUYA.
 *
 * Y si no lo es, `null`. EXACTAMENTE lo mismo que si no existiera, y esa
 * igualdad es la protección entera: distinguir las dos respuestas convertiría
 * probar ids en una forma de averiguar qué tiene otra persona.
 */
export const leerElemento = async (
  accountId: string,
  elementId: string,
  deps: DepsDeElementos = {},
): Promise<Element | null> => {
  if (typeof elementId !== 'string' || typeof accountId !== 'string' || !accountId) return null;
  const snap = await elementos(deps).doc(elementId).get();
  if (!snap.exists) return null;
  const dato = snap.data();
  /* Se valida lo que sale de la base igual que lo que entra: una fila puede haberse escrito mal. */
  if (!elementoValido(dato) || dato.ownerAccountId !== accountId) return null;
  return dato;
};

/* ── Consultar, siempre acotado ───────────────────────────────────────────── */

export interface ConsultaDeElementos {
  accountId: string;
  type: ElementType;
  /** La franja que Brain ya normalizó. Aquí no se lee el reloj ni se adivina un huso. */
  createdAfter?: number;
  createdBefore?: number;
  limit?: number;
}

/**
 * LOS CANDIDATOS DE UNA CLASE. Por cuenta, por estado, por tipo y con tope.
 *
 * ── La consulta, y por qué es esta ──────────────────────────────────────────
 *
 *   where ownerAccountId ==      de quién. Primero, y no negociable.
 *   where status == 'active'     lo archivado no compite (S3 §20). Va en la
 *                                CONSULTA y no en un filtro después, porque
 *                                filtrar después gasta el tope en cosas que no
 *                                se van a devolver.
 *   where type ==                lo que hace falta.
 *   where createdAt >= / <=      la franja, cuando Brain trajo una.
 *   orderBy createdAt · limit    acotada siempre.
 *
 * `orderBy createdAt` NO es una preferencia por lo reciente: es lo que Firestore
 * exige para un rango, y quien elige entre los candidatos sigue siendo el
 * resolutor del Core, que no mira el orden. Con tres hamburguesas y sin señal,
 * la respuesta sigue siendo «ambiguo», no «la primera».
 */
export const candidatosDeLaCuenta = async (
  consulta: ConsultaDeElementos,
  deps: DepsDeElementos = {},
): Promise<readonly Element[]> => {
  if (typeof consulta.accountId !== 'string' || !consulta.accountId) return [];
  const tope = Math.max(1, Math.min(consulta.limit ?? MAX_ELEMENTOS_EN_RESULTADO, MAX_ELEMENTOS_EN_RESULTADO));
  let q = elementos(deps)
    .where('ownerAccountId', '==', consulta.accountId)
    .where('status', '==', 'active')
    .where('type', '==', consulta.type);
  if (consulta.createdAfter !== undefined) q = q.where('createdAt', '>=', consulta.createdAfter);
  if (consulta.createdBefore !== undefined) q = q.where('createdAt', '<=', consulta.createdBefore);
  const snap = await q.orderBy('createdAt').limit(tope).get();
  return snap.docs.map((d) => d.data()).filter(elementoValido);
};

/* ── Actualizar y archivar ────────────────────────────────────────────────── */

export type ResultadoDeEscritura =
  | { status: 'ok'; element: Element }
  | { status: 'no_encontrado' }
  | { status: 'invalido'; problemas: readonly ProblemaDeElemento[] }
  | { status: 'material_rechazado'; assetId: string; motivo: MotivoDeNoReferenciar };

export interface CambioDeElemento {
  name?: string;
  description?: string;
  refs?: readonly ElementAssetRef[];
  related?: readonly ElementRelation[];
  /** Sube cuando la cosa CAMBIA. Quien llama decide; aquí no se inventa. */
  version?: number;
}

/**
 * CAMBIAR UNA COSA.
 *
 * ── Lo que NO se puede cambiar, y no por descuido ───────────────────────────
 *
 * `ownerAccountId`, `elementId`, `contract`, `createdAt` y `status`. Los cuatro
 * primeros son la identidad; el quinto se cambia archivando, que es otra
 * operación con otro nombre. Y no es que se ignoren si llegan: es que no caben
 * en `CambioDeElemento`, así que no hay por dónde intentarlo.
 *
 * Transferir una cosa de una cuenta a otra NO existe hoy. Si algún día existe,
 * será una operación propia con su propio nombre, sus propias comprobaciones y
 * su propia conversación sobre qué pasa con los materiales.
 *
 * ── Y por qué una transacción ───────────────────────────────────────────────
 *
 * Porque se LEE para comprobar de quién es y se ESCRIBE después, y entre las
 * dos cosas cabe otra escritura. Sin transacción, dos cambios a la vez dejan
 * el último que llegue, y el primero desaparece sin que nadie se entere.
 */
export const actualizarElemento = async (
  accountId: string,
  elementId: string,
  cambio: CambioDeElemento,
  at: number,
  deps: DepsDeElementos = {},
): Promise<ResultadoDeEscritura> => {
  const base = laBase(deps);
  const ref = base.collection(COLECCION_DE_ELEMENTOS).doc(elementId);

  /* Los materiales se comprueban FUERA de la transacción: leer otra colección dentro la haría más larga sin ganar nada. */
  if (cambio.refs) {
    const previa = await leerElemento(accountId, elementId, deps);
    if (!previa) return { status: 'no_encontrado' };
    const materiales = await revisarMateriales(accountId, cambio.refs, deps);
    if (!materiales.ok) return { status: 'material_rechazado', assetId: materiales.assetId, motivo: materiales.motivo };
  }

  return base.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const actual = snap.exists ? snap.data() : undefined;
    if (!elementoValido(actual) || actual.ownerAccountId !== accountId) return { status: 'no_encontrado' as const };

    const siguiente: Element = limpiar({
      ...actual,
      name: cambio.name ?? actual.name,
      description: cambio.description ?? actual.description,
      refs: cambio.refs ? [...cambio.refs] : actual.refs,
      related: cambio.related ? [...cambio.related] : actual.related,
      version: cambio.version ?? actual.version,
      updatedAt: at,
    });
    const problemas = validarElemento(siguiente);
    if (problemas.length) return { status: 'invalido' as const, problemas };
    tx.set(ref, siguiente);
    return { status: 'ok' as const, element: siguiente };
  });
};

/**
 * ARCHIVAR. Y lo importante es lo que NO hace.
 *
 * No borra un material. No llama a MC-5. No encola un recolector. No toca un
 * solo byte. Las fotos de esa hamburguesa pueden estar en otro Element, en un
 * proyecto o en una publicación, y archivar una agrupación no puede decidir
 * nada sobre ellas.
 *
 * Quién borra bytes y cuándo sigue siendo de Media Cloud, exactamente igual
 * que antes de que esto existiera.
 */
export const archivarElemento = async (
  accountId: string,
  elementId: string,
  at: number,
  deps: DepsDeElementos = {},
): Promise<ResultadoDeEscritura> => {
  const base = laBase(deps);
  const ref = base.collection(COLECCION_DE_ELEMENTOS).doc(elementId);
  return base.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const actual = snap.exists ? snap.data() : undefined;
    if (!elementoValido(actual) || actual.ownerAccountId !== accountId) return { status: 'no_encontrado' as const };
    const guardado = archivar(actual, at);
    tx.set(ref, limpiar(guardado));
    return { status: 'ok' as const, element: guardado };
  });
};

/* ── El mundo, para el resolutor ──────────────────────────────────────────── */

/**
 * TRAER LO JUSTO PARA QUE EL CORE DECIDA.
 *
 * Esta función no decide NADA. Lee, acota y entrega. La decisión —cuál de las
 * tres hamburguesas, o si no se puede decidir— la toma `resolverContexto`, que
 * es puro y no sabe que Firestore existe.
 *
 * ── Lo que lee, y cuánto ────────────────────────────────────────────────────
 *
 *   1 · Lo SEÑALADO: una lectura por id, como mucho `MAX_REFERENCIAS`.
 *   2 · Por CLASE: una consulta acotada por cada necesidad de Element.
 *   3 · El PROYECTO abierto: sus filas, acotadas y por cuenta.
 *
 * No hay un camino que recorra la cuenta. No existe `getAll`, ni `scan`, ni
 * una consulta sin `limit`, y hay una prueba que lo vigila leyendo este archivo.
 */
export const mundoDeContextoDeWee = async (
  peticion: VisualContextRequest,
  deps: DepsDeElementos = {},
): Promise<MundoDeContexto> => {
  if (typeof peticion?.accountId !== 'string' || !peticion.accountId) return { elementos: [] };
  const encontrados = new Map<string, Element>();

  /* 1 · Lo que la persona señaló. Una lectura por id, y cada una comprueba de quién es. */
  for (const r of (peticion.references ?? []).slice(0, MAX_REFERENCIAS)) {
    if (r.kind !== 'element') continue;
    const e = await leerElemento(peticion.accountId, r.id, deps);
    if (e) encontrados.set(e.elementId, e);
  }

  /* 2 · Los candidatos de cada clase que hace falta. */
  for (const need of (peticion.needs ?? [])) {
    if (need.kind !== 'element' || !need.elementType) continue;
    const candidatos = await candidatosDeLaCuenta({
      accountId: peticion.accountId,
      type: need.elementType,
      createdAfter: peticion.window?.createdAfter,
      createdBefore: peticion.window?.createdBefore,
      limit: MAX_ELEMENTOS_EN_RESULTADO,
    }, deps);
    for (const e of candidatos) encontrados.set(e.elementId, e);
  }

  const lista = [...encontrados.values()];
  const enProyecto = peticion.projectId ? await filasDeProyecto(peticion.accountId, peticion.projectId, lista, deps) : undefined;
  return { elementos: lista, ...(enProyecto?.length ? { enProyecto } : {}) };
};

/**
 * QUÉ DE LO QUE YA TENGO EN LA MANO ESTÁ EN ESTE PROYECTO.
 *
 * ── Por qué se calcula así, y no al revés ───────────────────────────────────
 *
 * Lo natural sería «dame los elementos del proyecto», pero eso hoy no se puede
 * preguntar: `ProjectItem` sabe guardar un material o un contenido, y no un
 * Element. Cambiar eso es un cambio de un contrato cerrado y S4 no lo hace.
 *
 * Así que se hace con lo que hay, y resulta más honesto: un proyecto contiene
 * MATERIAL, y una cosa es relevante para ese proyecto cuando alguno de sus
 * materiales está dentro. Se cruzan dos conjuntos que ya están acotados —los
 * candidatos que se trajeron y las filas del proyecto— en memoria, sin una
 * consulta inversa y sin denormalizar nada en el documento.
 *
 * ── Y la fila tiene que decir de quién es ───────────────────────────────────
 *
 * La consulta exige `ownerAccountId`. Una fila que no lo declare no participa,
 * y eso es a propósito: sin ese filtro, pasar el id de un proyecto ajeno haría
 * que el servidor leyera sus filas. Que la intersección fuera a salir vacía de
 * todas formas no es una defensa — es una casualidad, y las casualidades no
 * protegen nada.
 */
const filasDeProyecto = async (
  accountId: string,
  projectId: string,
  candidatos: readonly Element[],
  deps: DepsDeElementos = {},
): Promise<readonly { projectId: string; elementId: string }[]> => {
  if (!candidatos.length) return [];
  const snap = await laBase(deps)
    .collection(COLECCION_DE_ITEMS_DE_PROYECTO)
    .where('ownerAccountId', '==', accountId)
    .where('projectId', '==', projectId)
    .where('kind', '==', 'asset')
    .limit(MAX_ITEMS_DE_PROYECTO)
    .get();
  const dentro = new Set(snap.docs.map((d) => String((d.data() as { itemId?: unknown }).itemId ?? '')));
  return candidatos
    .filter((e) => e.refs.some((r) => dentro.has(r.assetId)))
    .map((e) => ({ projectId, elementId: e.elementId }));
};

/** Cuántas filas de un proyecto se miran como mucho. Un proyecto grande no puede costar una lectura sin fin. */
export const MAX_ITEMS_DE_PROYECTO = 100;
