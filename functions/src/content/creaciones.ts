import { Firestore, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { createHash } from 'crypto';
import type { AssetDoc } from './index';
import { crearMaterialDeTexto, leerMaterial, leerTextoDelMaterial, retirarMaterial } from './index';
import {
  CreacionGuardadaMinima,
  EstadoDeCreacion,
  FORMA_DE_ASSET_ID,
  FORMA_DE_REQUEST_ID,
  claveDeConjunto,
  conjuntoDeAssets,
  decidirFinalizar,
  decidirReabrir,
  estadoDeProyecto,
  ubicacionDe,
} from './creaciones-modelo';

/**
 * MIS CREACIONES — LA DECISIÓN «ESTO LO CONSERVO», EN EL SERVIDOR (R9 · línea A).
 *
 * ── Qué es una creación ─────────────────────────────────────────────────────
 *
 * Un documento de `creations` que REFERENCIA assets canónicos (`assets`) por
 * id, con la cuenta, el proyecto del que salió y cuándo se decidió. No es un
 * archivo, no es un asset, no es un proyecto y no es una publicación:
 *
 *   · finalizar no copia bytes ni crea assets: apunta a los que ya hay;
 *   · finalizar no toca el proyecto: la persona puede seguir trabajando en él;
 *   · eliminar una creación deshace la decisión y NO retira ningún asset (pueden
 *     estar en otra creación, en un proyecto o en una publicación); retirar un
 *     asset sigue siendo `deleteAsset`, explícito;
 *   · reabrir abre el proyecto de origen o crea uno vinculado con id derivado.
 *
 * ── Por qué una colección y no un campo del asset ───────────────────────────
 *
 * Una creación puede reunir varios assets (tres propuestas de un logo que la
 * persona conserva juntas) y un asset puede estar en varias creaciones. Un
 * campo dentro del asset es la relación rígida que `core/project.ts` ya
 * descartó para proyectos. `Content` (core/content/content.ts) es «lo que se
 * puede publicar», con tipos sociales y moderación; `ProjectItem` organiza un
 * proyecto; `Element` es una cosa con nombre para reutilizar. Ninguno es «el
 * resultado que decidí conservar» (docs/WEE-PROYECTOS-CREACIONES.md § 3).
 *
 * ── Idempotencia ────────────────────────────────────────────────────────────
 *
 * El id sale del conjunto de assets (hash de cuenta + ids ordenados): finalizar
 * dos veces lo mismo es la misma creación. El `requestId` se guarda y se
 * consulta con dos igualdades (sin índice compuesto): repetir la petición
 * devuelve la misma; reutilizarlo para OTRO conjunto es un conflicto, no una
 * segunda creación.
 *
 * ── Aislamiento ─────────────────────────────────────────────────────────────
 *
 * La cuenta es la de la sesión, nunca la del cliente. Un asset, proyecto o
 * creación de otra cuenta contesta igual que uno que no existe. Las reglas
 * cierran `creations` a escritura del cliente y solo dejan leer lo propio.
 * Nada de aquí escribe en `posts`: una creación nunca aparece en el Wäll ni en
 * Weëls.
 *
 * ── Estado de despliegue ────────────────────────────────────────────────────
 *
 * D-2 (decisión del dueño, 2026-10-12): el callable `cicloDeTrabajo` se exporta desde `functions/src/index.ts` y
 * figura en el mapa de `runtime-map`, pero NO está desplegado (`ops/despliegue/grupos.json` → `no_se_despliegan`).
 * Se valida en emuladores locales (`demo-*`); desplegarlo en get-wee exige autorización expresa del dueño.
 */

export const COLECCION_DE_CREACIONES = 'creations';
export const CONTRATO_DE_CREACIONES = 1 as const;
const MAXIMO_DE_NOMBRE = 60;

export interface CreacionDoc {
  contract: typeof CONTRATO_DE_CREACIONES;
  creationId: string;
  ownerAccountId: string;
  assetIds: string[];
  /** '' = sin nombre: la interfaz pinta su texto traducido. */
  nombre: string;
  tipo: string;
  herramienta: string | null;
  ubicacion: 'local' | 'wee_cloud' | 'remoto_legado';
  proyectoOrigenId: string | null;
  /** El proyecto con el que nació, si «reabrir» tuvo que crear uno vinculado. */
  proyectoOrigenInicialId?: string | null;
  requestId: string;
  status: EstadoDeCreacion;
  finalizadaEn: number;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number | null;
}

/** Error con código estable. El callable lo traduce a HttpsError con una frase ya catalogada y `details.code`. */
export class ErrorDeCiclo extends Error {
  constructor(public readonly code: 'invalido' | 'no_encontrado' | 'conflicto' | 'referenciado', mensaje?: string, public readonly detalle?: unknown) {
    super(mensaje ?? code);
    this.name = 'ErrorDeCiclo';
  }
}

export interface DepsDeCreaciones {
  db?: Firestore;
  material?: (assetId: string) => Promise<AssetDoc | null>;
  ahora?: () => number;
  /** D-3: crear la ficha de texto (por defecto, la del Content Core). */
  crearTexto?: typeof crearMaterialDeTexto;
  /** D-3: leer el texto de una ficha propia (por defecto, la del Content Core). */
  leerTexto?: typeof leerTextoDelMaterial;
  /** D-5: retirar el material (por defecto, `retirarMaterial`, el mismo camino que `deleteAsset`). */
  retirar?: typeof retirarMaterial;
}

const laBase = (d: DepsDeCreaciones) => d.db ?? getFirestore();
const elMaterial = (d: DepsDeCreaciones) => d.material ?? leerMaterial;
const elReloj = (d: DepsDeCreaciones) => d.ahora ?? Date.now;

export const idDeCreacion = (cuenta: string, assetIds: readonly string[]): string =>
  `creation_${createHash('sha256').update(claveDeConjunto(cuenta, assetIds)).digest('hex').slice(0, 32)}`;

const cuentaValida = (c: unknown): c is string => typeof c === 'string' && c.length > 0 && !/[\/\s]/.test(c);

/** El proyecto, si es de la cuenta. Uno ajeno es como uno que no existe. */
const leerProyecto = async (db: Firestore, cuenta: string, id: string | null | undefined) => {
  if (!id || !FORMA_DE_ASSET_ID.test(id)) return null;
  const snap = await db.collection('creatorProjects').doc(id).get();
  if (!snap.exists) return null;
  const p = snap.data() as Record<string, unknown>;
  return p.userId === cuenta ? p : null;
};

/* ── Finalizar ─────────────────────────────────────────────────────────────── */

export interface EntradaFinalizarServidor {
  assetIds: unknown;
  proyectoOrigenId?: unknown;
  nombre?: unknown;
  requestId: unknown;
}

export const finalizarCreacionDeCuenta = async (
  cuenta: string,
  entrada: EntradaFinalizarServidor,
  deps: DepsDeCreaciones = {},
): Promise<{ creacionId: string; yaExistia: boolean }> => {
  if (!cuentaValida(cuenta)) throw new ErrorDeCiclo('invalido');
  const ids = conjuntoDeAssets(entrada.assetIds);
  if (!ids) throw new ErrorDeCiclo('invalido');
  if (typeof entrada.requestId !== 'string' || !FORMA_DE_REQUEST_ID.test(entrada.requestId)) throw new ErrorDeCiclo('invalido');
  const requestId = entrada.requestId;
  const db = laBase(deps);

  /* Cada asset: existe, es de la cuenta y está listo. Si no, «no encontrado» — sin decir cuál ni por qué. */
  const materiales: AssetDoc[] = [];
  for (const id of ids) {
    const m = await elMaterial(deps)(id);
    if (!m || m.ownerAccountId !== cuenta || m.status !== 'ready') throw new ErrorDeCiclo('no_encontrado');
    materiales.push(m);
  }

  /* El proyecto de origen: el que dice la persona (si es suyo y vive), o el del trabajo del que salió el primer asset. */
  let proyectoOrigenId: string | null = null;
  if (entrada.proyectoOrigenId !== undefined && entrada.proyectoOrigenId !== null) {
    if (typeof entrada.proyectoOrigenId !== 'string') throw new ErrorDeCiclo('invalido');
    const p = await leerProyecto(db, cuenta, entrada.proyectoOrigenId);
    if (!p || estadoDeProyecto(p) === 'eliminado') throw new ErrorDeCiclo('no_encontrado');
    proyectoOrigenId = entrada.proyectoOrigenId;
  } else {
    const jobId = materiales[0].provenance?.jobId;
    if (typeof jobId === 'string' && FORMA_DE_ASSET_ID.test(jobId)) {
      const job = await db.collection('creatorJobs').doc(jobId).get();
      const j = job.exists ? (job.data() as Record<string, unknown>) : null;
      if (j && j.userId === cuenta && typeof j.projectId === 'string' && (await leerProyecto(db, cuenta, j.projectId))) proyectoOrigenId = j.projectId;
    }
  }

  const primero = materiales[0];
  const nombre = typeof entrada.nombre === 'string' && entrada.nombre.trim()
    ? entrada.nombre.trim().slice(0, MAXIMO_DE_NOMBRE)
    : (typeof primero.name === 'string' ? primero.name.slice(0, MAXIMO_DE_NOMBRE) : '');
  const herramienta = typeof primero.metadata?.experienceId === 'string' ? (primero.metadata.experienceId as string) : null;
  const creationId = idDeCreacion(cuenta, ids);
  const coleccion = db.collection(COLECCION_DE_CREACIONES);
  const ref = coleccion.doc(creationId);

  return db.runTransaction(async (tx) => {
    const porConjuntoSnap = await tx.get(ref);
    const porPeticionSnap = await tx.get(coleccion.where('ownerAccountId', '==', cuenta).where('requestId', '==', requestId).limit(1));
    const minima = (d: Record<string, unknown> | undefined): CreacionGuardadaMinima | null =>
      d ? { creationId: String(d.creationId), assetIds: (d.assetIds as string[]) ?? [], status: d.status as EstadoDeCreacion, requestId: d.requestId as string } : null;
    const porConjunto = porConjuntoSnap.exists ? minima(porConjuntoSnap.data()) : null;
    /* Un documento con ese id y otro dueño no puede existir (el id lleva la cuenta), pero se comprueba igual. */
    if (porConjuntoSnap.exists && (porConjuntoSnap.data() as CreacionDoc).ownerAccountId !== cuenta) throw new ErrorDeCiclo('no_encontrado');
    const porPeticion = porPeticionSnap.docs.length ? minima(porPeticionSnap.docs[0].data()) : null;

    const decision = decidirFinalizar({ assetIds: ids, porConjunto, porPeticion });
    if (decision.accion === 'conflicto') throw new ErrorDeCiclo('conflicto');
    if (decision.accion === 'devolver') return { creacionId: decision.creationId, yaExistia: true };

    const at = elReloj(deps)();
    if (decision.accion === 'revivir') {
      tx.set(ref, { status: 'final', finalizadaEn: at, updatedAt: at, deletedAt: null }, { merge: true });
      return { creacionId: decision.creationId, yaExistia: false };
    }
    const doc: CreacionDoc = {
      contract: CONTRATO_DE_CREACIONES,
      creationId,
      ownerAccountId: cuenta,
      assetIds: ids,
      nombre,
      tipo: String(primero.kind),
      herramienta,
      /* Una ficha de `assets` está en el servidor: sin `storageRef` (un texto) sigue siendo Weë Cloud, no local. */
      ubicacion: primero.storageRef ? ubicacionDe(primero.storageRef) : 'wee_cloud',
      proyectoOrigenId,
      requestId,
      status: 'final',
      finalizadaEn: at,
      createdAt: at,
      updatedAt: at,
    };
    tx.set(ref, doc);
    return { creacionId: creationId, yaExistia: false };
  });
};

/* ── Leer una creación propia ──────────────────────────────────────────────── */

const leerCreacionPropia = async (db: Firestore, cuenta: string, creationId: unknown): Promise<CreacionDoc> => {
  if (typeof creationId !== 'string' || !FORMA_DE_ASSET_ID.test(creationId)) throw new ErrorDeCiclo('invalido');
  const snap = await db.collection(COLECCION_DE_CREACIONES).doc(creationId).get();
  const c = snap.exists ? (snap.data() as CreacionDoc) : null;
  if (!c || c.ownerAccountId !== cuenta) throw new ErrorDeCiclo('no_encontrado');
  return c;
};

/* ── Reabrir ───────────────────────────────────────────────────────────────── */

export const reabrirCreacionDeCuenta = async (
  cuenta: string,
  creationId: unknown,
  deps: DepsDeCreaciones = {},
): Promise<{ proyectoId: string; nuevo: boolean }> => {
  if (!cuentaValida(cuenta)) throw new ErrorDeCiclo('invalido');
  const db = laBase(deps);
  const c = await leerCreacionPropia(db, cuenta, creationId);
  if (c.status !== 'final') throw new ErrorDeCiclo('no_encontrado');

  /* Los trabajos de los que salieron sus assets (procedencia inmutable): se leen antes de la transacción. */
  const jobIds = new Set<string>();
  for (const id of c.assetIds) {
    const m = await elMaterial(deps)(id);
    const j = m && m.ownerAccountId === cuenta ? m.provenance?.jobId : undefined;
    if (typeof j === 'string' && FORMA_DE_ASSET_ID.test(j)) jobIds.add(j);
  }

  const proyectos = db.collection('creatorProjects');
  return db.runTransaction(async (tx) => {
    const leer = async (id: string | null) => {
      if (!id || !FORMA_DE_ASSET_ID.test(id)) return null;
      const s = await tx.get(proyectos.doc(id));
      const p = s.exists ? (s.data() as Record<string, unknown>) : null;
      return p && p.userId === cuenta ? p : null;
    };
    const origen = await leer(c.proyectoOrigenId);
    const vinculadoId = `reab_${c.creationId}`;
    const vinculado = await leer(vinculadoId);
    const jobs = [];
    for (const j of jobIds) {
      const s = await tx.get(db.collection('creatorJobs').doc(j));
      jobs.push({ id: j, d: s.exists ? (s.data() as Record<string, unknown>) : null });
    }

    const decision = decidirReabrir({
      creationId: c.creationId,
      proyectoOrigenId: c.proyectoOrigenId,
      estadoDelOrigen: estadoDeProyecto(origen),
      estadoDelVinculado: estadoDeProyecto(vinculado),
    });
    const ahora = Timestamp.now();
    const at = elReloj(deps)();

    if (decision.accion === 'abrir') {
      if (decision.desarchivar) tx.update(proyectos.doc(decision.proyectoId), { archivedAt: null, updatedAt: ahora });
      if (decision.proyectoId !== c.proyectoOrigenId) {
        tx.set(db.collection(COLECCION_DE_CREACIONES).doc(c.creationId), { proyectoOrigenId: decision.proyectoId, updatedAt: at }, { merge: true });
      }
      return { proyectoId: decision.proyectoId, nuevo: false };
    }

    /* El origen ya no existe: un proyecto vinculado, con id derivado (reabrir dos veces da el mismo). */
    tx.set(proyectos.doc(decision.proyectoId), {
      userId: cuenta,
      name: c.nombre || '',
      emoji: '📁',
      reabiertoDeCreacionId: c.creationId,
      createdAt: ahora,
      updatedAt: ahora,
    });
    tx.set(db.collection(COLECCION_DE_CREACIONES).doc(c.creationId), {
      proyectoOrigenId: decision.proyectoId,
      proyectoOrigenInicialId: c.proyectoOrigenInicialId ?? c.proyectoOrigenId ?? null,
      updatedAt: at,
    }, { merge: true });
    /* Los trabajos de la creación que se quedaron sin proyecto (o apuntaban al que ya no está) pasan al vinculado. */
    for (const { id, d } of jobs) {
      if (!d || d.userId !== cuenta) continue;
      if (d.projectId === undefined || d.projectId === null || d.projectId === c.proyectoOrigenId) {
        tx.update(db.collection('creatorJobs').doc(id), { projectId: decision.proyectoId, updatedAt: ahora });
      }
    }
    return { proyectoId: decision.proyectoId, nuevo: true };
  });
};

/* ── Eliminar una creación (deshacer la decisión) ──────────────────────────── */

export const eliminarCreacionDeCuenta = async (
  cuenta: string,
  creationId: unknown,
  deps: DepsDeCreaciones = {},
): Promise<{ creacionId: string; yaEstaba: boolean }> => {
  if (!cuentaValida(cuenta)) throw new ErrorDeCiclo('invalido');
  const db = laBase(deps);
  const c = await leerCreacionPropia(db, cuenta, creationId);
  if (c.status === 'eliminada') return { creacionId: c.creationId, yaEstaba: true };
  const at = elReloj(deps)();
  /* Solo el documento de la decisión. Ningún asset, ningún proyecto, ningún objeto de almacén. */
  await db.collection(COLECCION_DE_CREACIONES).doc(c.creationId).set({ status: 'eliminada', deletedAt: at, updatedAt: at }, { merge: true });
  return { creacionId: c.creationId, yaEstaba: false };
};

/* ── D-3 · Guardar un texto final (decisión del dueño, 2026-10-12) ───────────── */

export const MAXIMO_DE_TEXTO_FINAL = 100_000;
const FORMA_DE_HERRAMIENTA = /^[a-z][a-z0-9_-]{1,39}$/;

/** La identidad del asset de texto sale de la petición: la misma petición es el mismo asset (idempotente). */
export const idDeTextoFinal = (cuenta: string, requestId: string): string =>
  `asset_${createHash('sha256').update(`texto\n${cuenta}\n${requestId}`).digest('hex').slice(0, 32)}`;

/**
 * GUARDAR UN RESULTADO FINAL DE TEXTO (receta de Chef, Writer, Business, Travel) como asset de texto del Content Core
 * y su creación, SOLO porque la persona eligió conservarlo — nunca cada respuesta provisional (esto no se llama desde
 * ningún camino de generación). Idempotente por `requestId`: repetir la misma petición devuelve el mismo asset y la
 * misma creación; reutilizarla con OTRO texto es `conflicto`.
 */
export const guardarTextoFinalDeCuenta = async (
  cuenta: string,
  entrada: { texto: unknown; herramienta: unknown; proyectoOrigenId?: unknown; requestId: unknown; nombre?: unknown },
  deps: DepsDeCreaciones = {},
): Promise<{ creacionId: string; assetId: string; yaExistia: boolean }> => {
  if (!cuentaValida(cuenta)) throw new ErrorDeCiclo('invalido');
  if (typeof entrada.texto !== 'string' || !entrada.texto.trim() || entrada.texto.length > MAXIMO_DE_TEXTO_FINAL) throw new ErrorDeCiclo('invalido');
  if (typeof entrada.herramienta !== 'string' || !FORMA_DE_HERRAMIENTA.test(entrada.herramienta)) throw new ErrorDeCiclo('invalido');
  if (typeof entrada.requestId !== 'string' || !FORMA_DE_REQUEST_ID.test(entrada.requestId)) throw new ErrorDeCiclo('invalido');
  const db = laBase(deps);
  if (entrada.proyectoOrigenId !== undefined && entrada.proyectoOrigenId !== null) {
    if (typeof entrada.proyectoOrigenId !== 'string') throw new ErrorDeCiclo('invalido');
    const p = await leerProyecto(db, cuenta, entrada.proyectoOrigenId);
    if (!p || estadoDeProyecto(p) === 'eliminado') throw new ErrorDeCiclo('no_encontrado');
  }
  const nombre = typeof entrada.nombre === 'string' ? entrada.nombre.trim().slice(0, MAXIMO_DE_NOMBRE) : '';
  const assetId = idDeTextoFinal(cuenta, entrada.requestId);
  const ficha = await (deps.crearTexto ?? crearMaterialDeTexto)({
    assetId,
    ownerAccountId: cuenta,
    contenido: entrada.texto,
    name: nombre || undefined,
    metadata: { experienceId: entrada.herramienta, origen: 'texto_final' },
    provenance: { createdAt: elReloj(deps)(), requestId: entrada.requestId },
  });
  if (!ficha) throw new ErrorDeCiclo('invalido');
  /* La misma petición con otro texto no es la misma petición. */
  const guardado = await (deps.leerTexto ?? leerTextoDelMaterial)(cuenta, assetId);
  if (guardado !== entrada.texto) throw new ErrorDeCiclo('conflicto');
  const r = await finalizarCreacionDeCuenta(cuenta, {
    assetIds: [assetId], proyectoOrigenId: entrada.proyectoOrigenId ?? null, nombre: nombre || undefined, requestId: entrada.requestId,
  }, deps);
  return { creacionId: r.creacionId, assetId, yaExistia: r.yaExistia };
};

/* ── D-5 · Borrar un asset con su impacto (decisión del dueño, 2026-10-12) ──── */

export interface ImpactoDeBorrado {
  assetId: string;
  /** Retirar un asset es irreversible (la ficha queda retirada; los bytes, pendientes de borrado físico). */
  irreversible: true;
  /** Siempre: sin `confirmar` no se borra nada. */
  requiereConfirmacion: true;
  /** Creaciones finales que lo contienen: pierden ESE asset; si era el único, la creación queda eliminada. */
  creaciones: { creacionId: string; nombre: string; quedaVacia: boolean; assetsQueQuedan: number }[];
  /** Lo que no se puede arreglar desde aquí y por eso BLOQUEA el borrado: se conserva lo referenciado. */
  bloqueos: { tipo: 'elemento' | 'plano'; id: string }[];
}

export const impactoDeBorrarAsset = async (cuenta: string, assetId: unknown, deps: DepsDeCreaciones = {}): Promise<ImpactoDeBorrado> => {
  if (!cuentaValida(cuenta)) throw new ErrorDeCiclo('invalido');
  if (typeof assetId !== 'string' || !FORMA_DE_ASSET_ID.test(assetId)) throw new ErrorDeCiclo('invalido');
  const m = await elMaterial(deps)(assetId);
  if (!m || m.ownerAccountId !== cuenta || m.status === 'deleted') throw new ErrorDeCiclo('no_encontrado');
  const db = laBase(deps);
  /* Consultas de una o dos igualdades (sin índice compuesto), acotadas a la cuenta. */
  const creaciones = (await db.collection(COLECCION_DE_CREACIONES).where('ownerAccountId', '==', cuenta).where('status', '==', 'final').get()).docs
    .map((d) => d.data() as CreacionDoc)
    .filter((c) => Array.isArray(c.assetIds) && c.assetIds.includes(assetId))
    .map((c) => ({ creacionId: c.creationId, nombre: c.nombre ?? '', quedaVacia: c.assetIds.length === 1, assetsQueQuedan: c.assetIds.length - 1 }));
  const elementos = (await db.collection('elements').where('ownerAccountId', '==', cuenta).get()).docs
    .filter((d) => ((d.data() as { refs?: { assetId?: string }[] }).refs ?? []).some((r) => r && r.assetId === assetId))
    .map((d) => ({ tipo: 'elemento' as const, id: d.id }));
  const planos = (await db.collection('shots').where('ownerAccountId', '==', cuenta).where('producedAssetId', '==', assetId).get()).docs
    .map((d) => ({ tipo: 'plano' as const, id: d.id }));
  return { assetId, irreversible: true, requiereConfirmacion: true, creaciones, bloqueos: [...elementos, ...planos] };
};

/**
 * BORRAR UN ASSET SIN ROMPER NADA. Nunca borra en cascada una creación entera: cada creación que lo contiene pierde
 * ESE asset (y, si era el único, queda eliminada — una creación vacía no existe). Lo que lo referencia y no se puede
 * arreglar aquí (un Element, un plano) BLOQUEA el borrado. Sin `confirmar: true` solo devuelve el impacto.
 *
 * El id de una creación sale de su conjunto de assets; al cambiar el conjunto, la creación pasa al id del conjunto
 * nuevo (si ya existía viva, se reutiliza) y la anterior queda eliminada con `sustituidaPor`. Así se conserva la
 * idempotencia de «finalizar» sin duplicados. El orden es a propósito: primero las creaciones, luego `retirarMaterial`
 * — si la retirada fallara, el asset sigue vivo y vuelve a «sin decidir»; nunca queda una creación apuntando a un
 * asset retirado.
 */
export const borrarAssetDeCuenta = async (
  cuenta: string,
  assetId: unknown,
  confirmar: unknown,
  deps: DepsDeCreaciones = {},
): Promise<
  | { hecho: false; necesitaConfirmacion: true; impacto: ImpactoDeBorrado }
  | { hecho: true; impacto: ImpactoDeBorrado; sustituciones: Record<string, string | null>; pendingPhysicalDeletion: boolean }
> => {
  const impacto = await impactoDeBorrarAsset(cuenta, assetId, deps);
  if (impacto.bloqueos.length > 0) throw new ErrorDeCiclo('referenciado', undefined, impacto);
  if (confirmar !== true) return { hecho: false, necesitaConfirmacion: true, impacto };
  const id = impacto.assetId;
  const db = laBase(deps);
  const coleccion = db.collection(COLECCION_DE_CREACIONES);
  const at = elReloj(deps)();
  const sustituciones: Record<string, string | null> = {};
  for (const afectada of impacto.creaciones) {
    await db.runTransaction(async (tx) => {
      const ref = coleccion.doc(afectada.creacionId);
      const snap = await tx.get(ref);
      const c = snap.exists ? (snap.data() as CreacionDoc) : null;
      if (!c || c.ownerAccountId !== cuenta || c.status !== 'final' || !c.assetIds.includes(id)) {
        sustituciones[afectada.creacionId] = c?.creationId ?? null;
        return;
      }
      const quedan = c.assetIds.filter((x) => x !== id);
      if (quedan.length === 0) {
        tx.set(ref, { status: 'eliminada', deletedAt: at, updatedAt: at, assetsRetirados: [id] }, { merge: true });
        sustituciones[afectada.creacionId] = null;
        return;
      }
      const nuevoId = idDeCreacion(cuenta, quedan);
      const nuevoRef = coleccion.doc(nuevoId);
      const ya = await tx.get(nuevoRef);
      if (!ya.exists || (ya.data() as CreacionDoc).status !== 'final') {
        tx.set(nuevoRef, { ...c, creationId: nuevoId, assetIds: quedan, status: 'final', updatedAt: at, deletedAt: null, sustituyeA: c.creationId });
      }
      tx.set(ref, { status: 'eliminada', deletedAt: at, updatedAt: at, sustituidaPor: nuevoId, assetsRetirados: [id] }, { merge: true });
      sustituciones[afectada.creacionId] = nuevoId;
    });
  }
  const r = await (deps.retirar ?? retirarMaterial)(cuenta, id);
  if (r.status === 'no_existe' || r.status === 'no_es_tuyo') throw new ErrorDeCiclo('no_encontrado');
  const pendientes = r.status === 'retirado' ? r.pendientes : (r.pendientes ?? 0);
  return { hecho: true, impacto, sustituciones, pendingPhysicalDeletion: pendientes > 0 };
};

/* ── El callable ───────────────────────────────────────────────────────────── */

const comoHttps = (e: unknown): never => {
  if (e instanceof ErrorDeCiclo) {
    if (e.code === 'no_encontrado') throw new HttpsError('not-found', 'No encontramos esa creación.', { code: e.code });
    throw new HttpsError(e.code === 'conflicto' || e.code === 'referenciado' ? 'failed-precondition' : 'invalid-argument',
      'Falta algo en tu pedido. Revísalo e inténtalo de nuevo.', { code: e.code, ...(e.detalle !== undefined ? { impacto: e.detalle } : {}) });
  }
  throw e;
};

/**
 * `cicloDeTrabajo` — `{ accion: 'finalizar' | 'reabrir' | 'eliminar' | 'guardarTexto' | 'impactoDeBorrado' | 'borrarAsset', … }`. Lo
 * único que trae el cliente es QUÉ; QUIÉN lo pone la sesión. Exportado (D-2) y
 * sin desplegar (ver la cabecera).
 */
export const cicloDeTrabajo = onCall({ region: 'us-central1', timeoutSeconds: 60 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión');
  const cuenta = request.auth.uid;
  const data = (request.data || {}) as Record<string, unknown>;
  try {
    if (data.accion === 'finalizar') {
      return await finalizarCreacionDeCuenta(cuenta, {
        assetIds: data.assetIds, proyectoOrigenId: data.proyectoOrigenId, nombre: data.nombre, requestId: data.requestId,
      });
    }
    if (data.accion === 'reabrir') return await reabrirCreacionDeCuenta(cuenta, data.creacionId);
    if (data.accion === 'eliminar') return await eliminarCreacionDeCuenta(cuenta, data.creacionId);
    if (data.accion === 'guardarTexto') {
      return await guardarTextoFinalDeCuenta(cuenta, {
        texto: data.texto, herramienta: data.herramienta, proyectoOrigenId: data.proyectoOrigenId, requestId: data.requestId, nombre: data.nombre,
      });
    }
    if (data.accion === 'impactoDeBorrado') return await impactoDeBorrarAsset(cuenta, data.assetId);
    if (data.accion === 'borrarAsset') return await borrarAssetDeCuenta(cuenta, data.assetId, data.confirmar);
    throw new ErrorDeCiclo('invalido');
  } catch (e) {
    return comoHttps(e);
  }
});
