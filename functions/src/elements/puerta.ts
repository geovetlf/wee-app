import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import {
  ContextNeed,
  ElementAssetRef,
  ElementRelation,
  ElementType,
  esTipoDeElemento,
  necesidadValida,
  resolverContexto,
  trazaDeContexto,
} from '../core';
import { cuentaDelPrincipalEnWee } from '../identity/cuentas';
import {
  actualizarElemento,
  archivarElemento,
  crearElemento,
  leerElemento,
  mundoDeContextoDeWee,
} from './index';

/**
 * WEË ELEMENTS — LA PUERTA. Y solo eso.
 *
 * ── Qué hace este archivo, y por qué es tan corto ───────────────────────────
 *
 * Tres cosas: comprueba QUIÉN llama, resuelve DE QUÉ CUENTA puede actuar, y
 * delega en el runtime de S4. Ni una regla de negocio, ni una validación
 * repetida, ni una consulta propia.
 *
 * Todo lo que importa ya está hecho y probado en otro sitio: que un material
 * sea tuyo y se pueda usar lo comprueba `crearElemento`; que un Element sea
 * tuyo lo comprueban `leerElemento`, `actualizarElemento` y `archivarElemento`;
 * cuál de tus hamburguesas es «la hamburguesa» lo decide el resolutor puro de
 * S3. Repetir aquí cualquiera de esas comprobaciones sería tener dos sitios
 * donde equivocarse.
 *
 * ── LA CUENTA NO LA DICE EL CLIENTE ─────────────────────────────────────────
 *
 * Es lo único que esta capa aporta de verdad. `cuentaDelPrincipalEnWee` es «la
 * única puerta» para saber de qué cuenta puede actuar un principal, y sale de
 * la SESIÓN. Un `accountId` que llegue en los datos no se lee: no se rechaza,
 * no se compara, no se mira — sencillamente no existe en este archivo.
 *
 * ── Y de lo ajeno no se dice ni que exista ──────────────────────────────────
 *
 * `not-found` para lo que no está y para lo que es de otro, igual que hace
 * `deleteAsset` desde la Fase 11. Distinguirlos convertiría probar ids en una
 * forma de averiguar qué tiene otra persona.
 */

const REGION = 'us-central1';
const MAX_REFS = 32;
const MAX_RELACIONES = 16;

const texto = (v: unknown, max: number): string | undefined => {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t.length > 0 && t.length <= max ? t : undefined;
};

/**
 * LAS REFERENCIAS QUE LLEGAN DE FUERA, con la forma justa.
 *
 * No se comprueba aquí que el material exista ni que sea tuyo —eso lo hace el
 * runtime contra el Content Core—: aquí solo se comprueba que lo que llegó
 * TENGA FORMA de referencia, y que no traiga nada más. Una clave de más se
 * descarta porque no se copia, no porque se filtre.
 */
const referencias = (crudo: unknown): readonly ElementAssetRef[] | undefined => {
  if (!Array.isArray(crudo) || crudo.length > MAX_REFS) return undefined;
  const salida: ElementAssetRef[] = [];
  for (const r of crudo) {
    if (typeof r !== 'object' || r === null) return undefined;
    const { assetId, role, kind } = r as Record<string, unknown>;
    if (typeof assetId !== 'string' || typeof role !== 'string' || typeof kind !== 'string') return undefined;
    salida.push({ assetId, role, kind } as ElementAssetRef);
  }
  return salida;
};

const relaciones = (crudo: unknown): readonly ElementRelation[] | undefined => {
  if (crudo === undefined) return undefined;
  if (!Array.isArray(crudo) || crudo.length > MAX_RELACIONES) return [];
  return crudo
    .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
    .map((r) => ({ kind: r.kind, elementId: r.elementId } as ElementRelation));
};

const necesidades = (crudo: unknown): readonly ContextNeed[] | undefined => {
  if (!Array.isArray(crudo)) return undefined;
  return crudo.every(necesidadValida) ? (crudo as readonly ContextNeed[]) : undefined;
};

/**
 * LAS COSAS DE UNA CUENTA. Una puerta, cuatro operaciones y una consulta.
 *
 * Va en UNA callable y no en cinco porque son la misma pregunta —«qué tengo
 * guardado y cómo lo cambio»— y cinco puertas serían cinco sitios donde
 * repetir la resolución de cuenta. `op` elige, y lo que no está en la lista no
 * existe.
 */
export const elements = onCall({ region: REGION, timeoutSeconds: 30, memory: '256MiB' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión');
  const db = getFirestore();
  const at = Date.now();

  /* DE QUÉ CUENTA PUEDE ACTUAR. De la sesión, por la única puerta que hay. */
  const cuenta = await cuentaDelPrincipalEnWee(db, request.auth.uid);
  if (!cuenta) throw new HttpsError('permission-denied', 'No encontramos tu cuenta.');
  const accountId = cuenta.accountId;

  const data = (request.data || {}) as Record<string, unknown>;
  const op = String(data.op || '');
  const elementId = texto(data.elementId, 128);

  if (op === 'create') {
    const type = data.type;
    const name = texto(data.name, 120);
    const refs = referencias(data.refs ?? []);
    if (!elementId || !esTipoDeElemento(type) || !name || !refs) {
      throw new HttpsError('invalid-argument', 'Faltan datos para crear eso.');
    }
    const r = await crearElemento({
      accountId, elementId, type: type as ElementType, name,
      ...(texto(data.description, 500) ? { description: texto(data.description, 500) } : {}),
      refs, ...(relaciones(data.related) ? { related: relaciones(data.related) } : {}),
      at,
    }, { db });
    if (r.status === 'invalido') throw new HttpsError('invalid-argument', 'Eso no tiene una forma válida.');
    /*
     * Un material que no está, que no es tuyo o que no se puede usar: todos
     * `not-found`. Los tres motivos siguen existiendo dentro y se anotan; lo
     * que no se hace es CONTÁRSELOS a quien pregunta.
     */
    if (r.status === 'material_rechazado') throw new HttpsError('not-found', 'No encontramos alguno de esos materiales.');
    return { status: r.status, element: r.element };
  }

  if (op === 'get') {
    if (!elementId) throw new HttpsError('invalid-argument', 'Falta el identificador.');
    const e = await leerElemento(accountId, elementId, { db });
    if (!e) throw new HttpsError('not-found', 'No encontramos eso.');
    return { element: e };
  }

  if (op === 'update') {
    const refs = data.refs === undefined ? undefined : referencias(data.refs);
    if (!elementId || (data.refs !== undefined && !refs)) throw new HttpsError('invalid-argument', 'Faltan datos.');
    const r = await actualizarElemento(accountId, elementId, {
      ...(texto(data.name, 120) ? { name: texto(data.name, 120) } : {}),
      ...(texto(data.description, 500) !== undefined ? { description: texto(data.description, 500) } : {}),
      ...(refs ? { refs } : {}),
      ...(typeof data.version === 'number' ? { version: data.version } : {}),
    }, at, { db });
    if (r.status === 'no_encontrado') throw new HttpsError('not-found', 'No encontramos eso.');
    if (r.status === 'invalido') throw new HttpsError('invalid-argument', 'Eso no tiene una forma válida.');
    if (r.status === 'material_rechazado') throw new HttpsError('not-found', 'No encontramos alguno de esos materiales.');
    return { element: r.element };
  }

  if (op === 'archive') {
    if (!elementId) throw new HttpsError('invalid-argument', 'Falta el identificador.');
    const r = await archivarElemento(accountId, elementId, at, { db });
    if (r.status !== 'ok') throw new HttpsError('not-found', 'No encontramos eso.');
    return { element: r.element };
  }

  if (op === 'context') {
    const needs = necesidades(data.needs ?? []);
    if (!needs) throw new HttpsError('invalid-argument', 'Eso no describe nada que se pueda buscar.');
    const peticion = {
      accountId,
      ...(needs.length ? { needs } : {}),
      ...(texto(data.projectId, 128) ? { projectId: texto(data.projectId, 128) } : {}),
    };
    const resultado = resolverContexto(await mundoDeContextoDeWee(peticion, { db }), peticion);
    /*
     * Lo que sale son REFERENCIAS y nombres de cosas de ESTA cuenta: ni bytes,
     * ni direcciones, ni URLs firmadas. Entregar sigue siendo de Media Cloud.
     */
    return { status: resultado.status, ...(resultado.elements ? { elements: resultado.elements } : {}),
      ...(resultado.ambiguous ? { ambiguous: resultado.ambiguous } : {}),
      ...(resultado.missing ? { missing: resultado.missing } : {}),
      traza: trazaDeContexto(resultado) };
  }

  throw new HttpsError('invalid-argument', 'Esa operación no existe.');
});
