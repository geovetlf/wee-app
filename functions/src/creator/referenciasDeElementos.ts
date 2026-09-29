import { Firestore } from 'firebase-admin/firestore';
import { leerElemento } from '../elements';
import { leerMaterial } from '../content';
import type { Element, FichaDeMaterial } from '../core/element';
import { requisitosDelServidor } from './requisitoDelServidor';

/**
 * WEË FILMMAKER · FASE 18 — LAS IMÁGENES DE LOS ELEMENTS COMO REFERENCIAS DE UNA TOMA: PREPARADAS, Y CERRADAS.
 *
 * Encargo del usuario (2026-09-28, «CERRAR EL FILMMAKER ENGINE»): referencias de Elements, como canary y sin gastar
 * dinero real. La Fase 10 dejó los vínculos verificados —un personaje, un lugar o un objeto de la producción apunta a
 * un Element de la cuenta— y dijo que usar sus imágenes al generar era una capacidad sin validar que llegaría con su
 * canary. Esto es todo lo que ese canary necesita, sin hacerlo:
 *
 *   · QUÉ se usaría: los vínculos del plano, sacados del requisito que calcula el SERVIDOR desde la producción
 *     guardada (nunca del que manda la app), en su orden —el sujeto, los personajes, el lugar y los objetos— y sin
 *     repetir un Element;
 *   · CON QUÉ imágenes: las de cada Element, leído por su runtime (de la cuenta, activo y en la versión del vínculo),
 *     solo sus materiales de IMAGEN listos y de la cuenta, primero la principal, hasta un tope;
 *   · SI se usarían: la decisión, pura. Hace falta la puerta de la cuenta ABIERTA (`aiSettings/referencias`, cerrada
 *     por defecto) Y que el modelo de la toma esté en `MODELOS_VALIDADOS_CON_REFERENCIAS`, que está VACÍA: ningún
 *     modelo se ha comprobado todavía con un vídeo de referencias real ni se conoce lo que cobra así.
 *
 * Y nada más: aquí no se genera, no se cobra, no se llama a ningún proveedor ni se pide otra capacidad al Core. La
 * puerta del vídeo solo lo CUENTA al cotizar —cuántos Elements tiene el plano, cuántas imágenes se usarían y por qué
 * no se usan—, sin que cambie nada de la toma.
 *
 * Lo que falta para usarlas de verdad, dicho: la puerta del vídeo declara UNA capacidad para el Core
 * (`video.generate`), y un vídeo con imágenes de referencia es otra (`video.reference`). Ampliar lo que esa puerta
 * manda al Core pide una autorización explícita (CLAUDE.md, regla 10), y validarlo pide un canary con gasto real.
 */

/** La puerta de la cuenta. Cerrada por defecto, con la forma de las demás: el sí y a quién (una lista vacía no abre). */
export const PUERTA_DE_REFERENCIAS = 'aiSettings/referencias';

/**
 * LOS MODELOS CON LOS QUE UNA TOMA PODRÍA LLEVAR IMÁGENES DE REFERENCIA: los comprobados con un canary real —que el
 * vídeo sale y cuánto cobra el proveedor así—. VACÍA: ninguno todavía. Está en el código a propósito: la configuración
 * puede cerrar la puerta, pero nunca ampliar esta lista.
 */
export const MODELOS_VALIDADOS_CON_REFERENCIAS: readonly string[] = Object.freeze([]);

/** Cuántas imágenes llevaría una toma como mucho, y de cuántos Elements. Números de producto, no de un proveedor. */
export const MAX_IMAGENES_POR_TOMA = 4;
export const MAX_ELEMENTOS_POR_TOMA = 8;

export type FichaDelVinculo = 'character' | 'location' | 'object';

/** Un vínculo del plano: a qué Element, en qué versión, y desde qué ficha. */
export interface VinculoDeLaToma {
  readonly elementId: string;
  readonly version: number;
  readonly ficha: FichaDelVinculo;
  readonly fichaId: string;
}

export type MotivoDescartado = 'not_found' | 'archived' | 'version_mismatch' | 'no_images';

export interface ImagenDeReferencia {
  readonly elementId: string;
  readonly assetId: string;
  readonly role: 'primary' | 'reference';
}

export interface ReferenciasResueltas {
  readonly imagenes: readonly ImagenDeReferencia[];
  readonly descartados: readonly { readonly elementId: string; readonly motivo: MotivoDescartado }[];
}

export type MotivoSinReferencias = 'no_bindings' | 'no_images' | 'gate_closed' | 'model_not_validated';

export type DecisionDeReferencias =
  | { readonly usar: false; readonly motivo: MotivoSinReferencias }
  | { readonly usar: true; readonly imagenes: readonly ImagenDeReferencia[] };

const esObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const esId = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9_-]{4,128}$/.test(v);

/**
 * LOS VÍNCULOS DE UN PLANO, de su requisito de F1-A tal cual. Pura. En su orden —el sujeto primero, después los
 * personajes, el lugar y los objetos, cada grupo en el orden del requisito— y sin repetir un Element. Lo que no tiene
 * la forma de un vínculo no cuenta.
 */
export const vinculosDelRequisito = (crudo: unknown): VinculoDeLaToma[] => {
  if (!esObj(crudo) || !esObj(crudo.input)) return [];
  const i = crudo.input;
  const entidades = (v: unknown, ficha: FichaDelVinculo): VinculoDeLaToma[] => (Array.isArray(v) ? v : [])
    .filter(esObj)
    .map((e) => {
      const d = esObj(e.definition) ? e.definition : {};
      const b = esObj(d.element) ? d.element : undefined;
      return b && esId(b.elementId) && Number.isInteger(b.version) && (b.version as number) >= 1 && esId(e.id)
        ? { elementId: b.elementId, version: b.version as number, ficha, fichaId: e.id as string }
        : null;
    })
    .filter((x): x is VinculoDeLaToma => !!x);
  const personajes = entidades(i.characters, 'character');
  const objetos = entidades(i.objects, 'object');
  /* El sujeto del plano —un personaje o un objeto— va el primero: es de quien más importa que se parezca. */
  const s = esObj(i.subject) ? i.subject : {};
  const delSujeto = [...personajes, ...objetos].filter((v) => v.fichaId === s.characterId || v.fichaId === s.objectId);
  const todos = [
    ...delSujeto,
    ...personajes,
    ...entidades(i.location ? [i.location] : [], 'location'),
    ...objetos,
  ];
  const vistos = new Set<string>();
  return todos.filter((v) => (vistos.has(v.elementId) ? false : (vistos.add(v.elementId), true))).slice(0, MAX_ELEMENTOS_POR_TOMA);
};

export interface DepsDeReferencias {
  readonly leerElemento?: (accountId: string, elementId: string) => Promise<Element | null>;
  readonly leerMaterial?: (assetId: string) => Promise<FichaDeMaterial | null>;
}

/**
 * LAS IMÁGENES DE LOS ELEMENTS VINCULADOS, resueltas. Cada Element por su runtime —de la cuenta o nada—; uno archivado
 * o en otra versión que la del vínculo, fuera (dicho, no adivinado); de cada uno, solo materiales de IMAGEN, listos y
 * de la cuenta, la principal primero; hasta `MAX_IMAGENES_POR_TOMA` en total, repartidas en el orden de los vínculos.
 */
export const resolverReferencias = async (
  accountId: string,
  vinculos: readonly VinculoDeLaToma[],
  deps: DepsDeReferencias = {},
): Promise<ReferenciasResueltas> => {
  const elemento = deps.leerElemento ?? ((cuenta: string, id: string) => leerElemento(cuenta, id));
  const material = deps.leerMaterial ?? (async (id: string) => {
    const ficha = await leerMaterial(id);
    return ficha ? { assetId: ficha.assetId, ownerAccountId: ficha.ownerAccountId, kind: ficha.kind, status: ficha.status } : null;
  });
  const imagenes: ImagenDeReferencia[] = [];
  const descartados: { elementId: string; motivo: MotivoDescartado }[] = [];
  for (const v of vinculos) {
    const e = await elemento(accountId, v.elementId);
    if (!e) { descartados.push({ elementId: v.elementId, motivo: 'not_found' }); continue; }
    if (e.status !== 'active') { descartados.push({ elementId: v.elementId, motivo: 'archived' }); continue; }
    if (e.version !== v.version) { descartados.push({ elementId: v.elementId, motivo: 'version_mismatch' }); continue; }
    const candidatas = [...e.refs]
      .filter((r) => r.kind === 'image' && (r.role === 'primary' || r.role === 'reference'))
      .sort((a, b) => (a.role === b.role ? 0 : a.role === 'primary' ? -1 : 1));
    let alguna = false;
    for (const r of candidatas) {
      if (imagenes.length >= MAX_IMAGENES_POR_TOMA) break;
      if (imagenes.some((x) => x.assetId === r.assetId)) continue;
      const f = await material(r.assetId);
      if (!f || f.ownerAccountId !== accountId || f.kind !== 'image' || f.status !== 'ready') continue;
      imagenes.push({ elementId: e.elementId, assetId: r.assetId, role: r.role as 'primary' | 'reference' });
      alguna = true;
    }
    if (!alguna && imagenes.length < MAX_IMAGENES_POR_TOMA) descartados.push({ elementId: v.elementId, motivo: 'no_images' });
  }
  return { imagenes, descartados };
};

/**
 * LA DECISIÓN, PURA. Sin vínculos o sin imágenes, nada que usar. Con ellas, hace falta la puerta de la cuenta abierta
 * Y un modelo validado; si falta cualquiera de las dos, se dice cuál, en este orden: primero la puerta.
 */
export const decidirReferencias = (e: {
  readonly vinculos: number;
  readonly imagenes: readonly ImagenDeReferencia[];
  readonly puertaAbierta: boolean;
  readonly modelo: string | null;
  readonly validados?: readonly string[];
}): DecisionDeReferencias => {
  if (e.vinculos === 0) return { usar: false, motivo: 'no_bindings' };
  if (!e.imagenes.length) return { usar: false, motivo: 'no_images' };
  if (!e.puertaAbierta) return { usar: false, motivo: 'gate_closed' };
  const validados = e.validados ?? MODELOS_VALIDADOS_CON_REFERENCIAS;
  if (!e.modelo || !validados.includes(e.modelo)) return { usar: false, motivo: 'model_not_validated' };
  return { usar: true, imagenes: e.imagenes };
};

/** ¿Está abierta la puerta de las referencias para esta cuenta? Sin documento, sin el sí o sin a quién: cerrada. */
export const leerPuertaDeReferencias = async (db: Firestore, accountId: string): Promise<boolean> => {
  const snap = await db.doc(PUERTA_DE_REFERENCIAS).get().catch(() => null);
  const d = snap && snap.exists ? snap.data() : undefined;
  if (!esObj(d) || d.referenciasDeElementos !== true) return false;
  if (d.todas === true) return true;
  return Array.isArray(d.cuentas) && d.cuentas.some((c) => c === accountId);
};

/** Lo que se cuenta al cotizar: cuántos Elements, cuántas imágenes se usarían, cuántas se usan (hoy, 0) y por qué. */
export interface ReferenciasDeLaToma {
  readonly bound: number;
  readonly images: number;
  readonly used: number;
  readonly reason?: MotivoSinReferencias;
}

/**
 * LAS REFERENCIAS DE UNA TOMA, contadas: desde el requisito del SERVIDOR de esa unidad en esa revisión, resueltas y
 * decididas. `null` si el plano no tiene ningún vínculo —la cotización no cambia ni en un campo— o si no se puede
 * calcular (lo dice ya la puerta del vídeo por su camino).
 */
export const referenciasDeLaToma = async (
  db: Firestore,
  accountId: string,
  u: { productionId: string; sceneId: string; unitId: string; revision: number },
  opciones: { modelo: string | null; validados?: readonly string[] } & DepsDeReferencias,
): Promise<ReferenciasDeLaToma | null> => {
  const todos = await requisitosDelServidor(db, accountId, { productionId: u.productionId, revision: u.revision });
  if (!todos.ok) return null;
  const crudo = todos.unidades.find((s) => s.unitId === u.unitId && s.sceneId === u.sceneId)?.crudo;
  const vinculos = vinculosDelRequisito(crudo);
  if (!vinculos.length) return null;
  const resueltas = await resolverReferencias(accountId, vinculos, opciones);
  const decision = decidirReferencias({
    vinculos: vinculos.length, imagenes: resueltas.imagenes, modelo: opciones.modelo,
    puertaAbierta: resueltas.imagenes.length ? await leerPuertaDeReferencias(db, accountId) : false,
    ...(opciones.validados ? { validados: opciones.validados } : {}),
  });
  return {
    bound: vinculos.length,
    images: resueltas.imagenes.length,
    used: decision.usar ? decision.imagenes.length : 0,
    ...(decision.usar ? {} : { reason: decision.motivo }),
  };
};
