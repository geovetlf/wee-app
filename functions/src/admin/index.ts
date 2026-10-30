import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { isAdmin } from '../shared/admin';
import { sanitizeForLog } from '../engine/sanitize';
import { crearAuditoria, nuevaCorrelacion } from './auditoria';
import { capacidades, crearLecturas, leerLimite, type Visibilidad } from './lecturas';
import { assertPermiso, permisosDe, rolDe, tienePermiso, type Permiso, type SesionDeAuth } from './permisos';

/**
 * LAS LECTURAS DE ADMINISTRACIÓN: `opsAdmin` y `accountsAdmin`. SOLO LEEN: no ejecutan trabajos, no tocan cuentas, ni
 * Credits, ni configuración. Lo único que escriben es su propia constancia en `adminAudit`.
 *
 * Orden en cada llamada, sin excepciones:
 *   1. ¿hay sesión y permiso? (`assertPermiso`). Un intento denegado de alguien que SÍ es administración queda en la
 *      auditoría; el de cualquier otra sesión solo va al registro, para que nadie pueda llenar la colección a golpes.
 *   2. Se valida la entrada y se lee.
 *   3. Se registra en `adminAudit`. **Si no queda constancia, no se devuelven los datos** (`unavailable`).
 *
 * `quienSoy` y `capacidades` no devuelven datos de nadie y no se auditan. `quienSoy` responde a cualquier administración,
 * también sin rol, para que la consola sepa qué enseñar; a una sesión que no es administración le dice `permission-denied`.
 */
const OPTS = { region: 'us-central1' as const, timeoutSeconds: 30 };

type Sesion = SesionDeAuth | undefined;

export interface DepsDeAdministracion {
  auditoria: ReturnType<typeof crearAuditoria>;
  lecturas: ReturnType<typeof crearLecturas>;
}

const deps = (): DepsDeAdministracion => ({
  auditoria: crearAuditoria({ db: getFirestore() }),
  lecturas: crearLecturas({ db: getFirestore(), auth: () => getAuth() }),
});

const visibilidad = (auth: Sesion): Visibilidad => ({ cuentas: tienePermiso(auth, 'accounts.read'), costes: tienePermiso(auth, 'finance.read') });

const codigoDe = (e: unknown): string => (e instanceof HttpsError ? e.code : 'internal');

/**
 * Una lectura auditada. Lanza lo que corresponda; los errores internos no se le enseñan al cliente (el detalle va al
 * registro, saneado). Devuelve los datos con su correlación y la hora en que se generaron.
 */
export const lecturaAuditada = async <T extends object>(
  d: DepsDeAdministracion,
  auth: Sesion,
  accion: string,
  permiso: Permiso,
  recurso: { tipo: string; id?: string },
  metadatos: Record<string, unknown>,
  leer: () => Promise<T>,
): Promise<T & { correlationId: string; generadoEn: number }> => {
  const correlationId = nuevaCorrelacion();
  const actor = { actorUid: auth?.uid ?? 'sin-sesion', actorRol: rolDe(auth) };
  try {
    assertPermiso(auth, permiso);
  } catch (e) {
    console.warn('ADMIN: denegado', sanitizeForLog(accion), sanitizeForLog(actor.actorUid), codigoDe(e));
    /* Solo si es administración: cualquier otra cuenta podría llenar la colección llamando sin parar. */
    if (auth && isAdmin(auth)) {
      await d.auditoria.registrar({ ...actor, accion, recurso, metadatos, resultado: 'denegado', correlationId, codigoDeError: codigoDe(e) });
    }
    throw e;
  }
  let datos: T;
  try {
    datos = await leer();
  } catch (e) {
    const codigo = codigoDe(e);
    console.error('ADMIN: la lectura falló', sanitizeForLog(accion), correlationId, sanitizeForLog(e instanceof Error ? e.message : String(e)));
    try {
      await d.auditoria.registrar({ ...actor, accion, recurso, metadatos, resultado: 'error', correlationId, codigoDeError: codigo });
    } catch (ea) {
      console.error('ADMIN: la auditoría falló', correlationId, sanitizeForLog(ea instanceof Error ? ea.message : String(ea)));
    }
    if (e instanceof HttpsError) throw e;
    throw new HttpsError('internal', 'No se pudo leer', { correlationId });
  }
  try {
    await d.auditoria.registrar({ ...actor, accion, recurso, metadatos, resultado: 'ok', correlationId });
  } catch (e) {
    console.error('ADMIN: la auditoría falló; no se devuelven los datos', correlationId, sanitizeForLog(e instanceof Error ? e.message : String(e)));
    throw new HttpsError('unavailable', 'No se pudo dejar constancia de la consulta', { correlationId });
  }
  return { ...datos, correlationId, generadoEn: Date.now() };
};

/** Solo los filtros: ni identificadores largos ni texto libre. */
const filtros = (data: Record<string, unknown>, claves: string[]): Record<string, unknown> =>
  Object.fromEntries(claves.filter((k) => data[k] !== undefined).map((k) => [k, data[k]]));

export const atenderOps = async (d: DepsDeAdministracion, auth: Sesion, data: Record<string, unknown>): Promise<unknown> => {
  const action = String(data.action ?? '');
  const ver = visibilidad(auth);
  const leer = <T extends object>(permiso: Permiso, tipo: string, claves: string[], fn: () => Promise<T>) =>
    lecturaAuditada(d, auth, `opsAdmin.${action}`, permiso, { tipo }, filtros(data, claves), fn);

  switch (action) {
    case 'quienSoy':
      if (!auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión');
      if (!isAdmin(auth)) throw new HttpsError('permission-denied', 'Solo administración');
      return { rol: rolDe(auth), permisos: permisosDe(auth), entorno: process.env.GCLOUD_PROJECT ?? 'desconocido' };
    case 'capacidades':
      assertPermiso(auth, 'ops.read');
      return capacidades();
    case 'trabajos':
      return leer('ops.read', 'jobs', ['estado', 'limit'], () => d.lecturas.trabajos(data, ver));
    case 'atascados':
      return leer('ops.read', 'jobs', ['minutos', 'limit'], () => d.lecturas.atascados(data, ver));
    case 'creaciones':
      return leer('ops.read', 'creatorJobs', ['experiencia', 'estado', 'limit'], () => d.lecturas.creaciones(data, ver));
    case 'producciones':
      return leer('ops.read', 'productions', ['limit'], () => d.lecturas.producciones(data, ver));
    case 'generaciones':
      return leer('ai.read', 'aiGenerations', ['experiencia', 'proveedor', 'limit'], () => d.lecturas.generaciones(data, ver));
    case 'usoIa':
      return leer('ai.read', 'aiUsage', ['dia'], () => d.lecturas.usoIa(data, ver));
    case 'reservas':
      return leer('finance.read', 'creditTransactions', ['minutos', 'limit'], () => d.lecturas.reservas(data, ver));
    case 'auditoria':
      return leer('audit.read', 'adminAudit', ['limit'], async () => {
        const limit = leerLimite(data.limit);
        const items = await d.auditoria.leer({ limit });
        return { items, fuente: 'adminAudit', truncado: items.length === limit };
      });
    default:
      assertPermiso(auth, 'ops.read');
      throw new HttpsError('invalid-argument', 'Acción desconocida');
  }
};

export const atenderCuentas = async (d: DepsDeAdministracion, auth: Sesion, data: Record<string, unknown>): Promise<unknown> => {
  const action = String(data.action ?? '');
  if (action !== 'buscar') {
    assertPermiso(auth, 'accounts.read');
    throw new HttpsError('invalid-argument', 'Acción desconocida');
  }
  /* El identificador consultado es justo lo que hay que poder auditar: quién miró a quién. */
  const objetivo = typeof data.uid === 'string' ? data.uid : typeof data.numeroDeCuenta === 'string' ? data.numeroDeCuenta : undefined;
  return lecturaAuditada(d, auth, 'accountsAdmin.buscar', 'accounts.read', { tipo: 'cuenta', ...(objetivo ? { id: objetivo } : {}) }, {}, () => d.lecturas.buscarCuenta(data));
};

const entrada = (r: CallableRequest): Record<string, unknown> => (r.data && typeof r.data === 'object' ? r.data as Record<string, unknown> : {});

export const opsAdmin = onCall(OPTS, async (request) => atenderOps(deps(), request.auth as Sesion, entrada(request)));
export const accountsAdmin = onCall(OPTS, async (request) => atenderCuentas(deps(), request.auth as Sesion, entrada(request)));
