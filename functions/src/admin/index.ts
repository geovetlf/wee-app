import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { assertUserId } from '../credits/creditValidation';
import { normalizarNumeroDeCuenta } from '../core/account-identity';
import { crearAuditoria } from './auditoria';
import { dependencias, lecturaAuditada, lecturaSinAuditar, sesionAdministrativa, type DepsDeOperacion } from './autorizacion';
import { capacidades, crearLecturas, leerLimite, type Visibilidad } from './lecturas';
import { soloFichas } from './operaciones';
import { permisosDe, rolDe, tienePermiso, type Permiso, type SesionDeAuth } from './permisos';

/**
 * LAS LECTURAS DE ADMINISTRACIÓN: `opsAdmin` y `accountsAdmin`. SOLO LEEN: no ejecutan trabajos, no tocan cuentas, ni
 * Credits, ni configuración. Lo único que escriben es su propia constancia en `adminAudit`.
 *
 * Orden en cada llamada, sin excepciones (`autorizacion.ts`):
 *   1. ¿hay sesión, sigue siendo administración AHORA y tiene el permiso? Un intento denegado de alguien que SÍ es
 *      administración queda en la auditoría; el de cualquier otra sesión solo va al registro, para que nadie pueda
 *      llenar la colección a golpes.
 *   2. Se valida la entrada y se lee.
 *   3. Se registra en `adminAudit`. **Si no queda constancia, no se devuelven los datos** (`unavailable`).
 *
 * `quienSoy` y `capacidades` no devuelven datos de nadie y no se auditan. `quienSoy` responde a cualquier administración,
 * también sin rol, para que la consola sepa qué enseñar; a una sesión que no es administración le dice `permission-denied`.
 */
const OPTS = { region: 'us-central1' as const, timeoutSeconds: 30 };

type Sesion = SesionDeAuth | undefined;

export interface DepsDeAdministracion extends DepsDeOperacion {
  lecturas: ReturnType<typeof crearLecturas>;
}

const deps = (): DepsDeAdministracion => ({
  auditoria: crearAuditoria({ db: dependencias.db() }),
  lecturas: crearLecturas({ db: dependencias.db(), auth: dependencias.auth }),
});

const visibilidad = (auth: SesionDeAuth): Visibilidad => ({ cuentas: tienePermiso(auth, 'accounts.read'), costes: tienePermiso(auth, 'finance.read') });

/** Solo los filtros: ni identificadores largos ni texto libre. */
const filtros = (data: Record<string, unknown>, claves: string[]): Record<string, unknown> =>
  soloFichas(Object.fromEntries(claves.filter((k) => data[k] !== undefined).map((k) => [k, data[k]])));

/** Nunca `String(x)` sobre lo que llega sin autenticar: `{ toString: 1 }` lanzaría antes de comprobar la sesión. */
const accionDe = (data: Record<string, unknown>): string => (typeof data.action === 'string' ? data.action : '');

/** Un identificador de cuenta solo llega a la auditoría si lo es: quién miró a quién, y nada que no sea eso. */
const uidValido = (v: unknown): string | undefined => {
  try { return assertUserId(v); } catch { return undefined; }
};

export const atenderOps = async (d: DepsDeAdministracion, auth: Sesion, data: Record<string, unknown>): Promise<unknown> => {
  const action = accionDe(data);
  const peticion = (permiso: Permiso, tipo: string, claves: string[], id?: string) =>
    ({ accion: `opsAdmin.${action}`, permiso, recurso: { tipo, ...(id ? { id } : {}) }, metadatos: filtros(data, claves) });
  const leer = <T extends object>(permiso: Permiso, tipo: string, claves: string[], fn: (ver: Visibilidad) => Promise<T>, id?: string) =>
    lecturaAuditada(peticion(permiso, tipo, claves, id), auth, (sesion) => fn(visibilidad(sesion)), d);

  switch (action) {
    case 'quienSoy': {
      const sesion = await sesionAdministrativa(auth, d);
      return { rol: rolDe(sesion), permisos: permisosDe(sesion), entorno: process.env.GCLOUD_PROJECT ?? 'desconocido' };
    }
    case 'capacidades':
      return lecturaSinAuditar(peticion('ops.read', 'capacidades', []), auth, () => capacidades(), d);
    case 'trabajos':
      return leer('ops.read', 'jobs', ['estado', 'limit'], (ver) => d.lecturas.trabajos(data, ver));
    case 'atascados':
      return leer('ops.read', 'jobs', ['minutos', 'limit'], (ver) => d.lecturas.atascados(data, ver));
    case 'cola':
      return leer('ops.read', 'jobQueue', ['limit'], (ver) => d.lecturas.cola(data, ver));
    case 'creaciones':
      /* Si se busca por cuenta, esa cuenta es justo lo que hay que poder auditar. */
      return leer('ops.read', 'creatorJobs', ['experiencia', 'estado', 'limit'], (ver) => d.lecturas.creaciones(data, ver), uidValido(data.uid));
    case 'creacionesAtascadas':
      return leer('ops.read', 'creatorJobs', ['minutos', 'limit'], (ver) => d.lecturas.creacionesAtascadas(data, ver));
    case 'producciones':
      return leer('ops.read', 'productions', ['limit'], (ver) => d.lecturas.producciones(data, ver));
    case 'generaciones':
      return leer('ai.read', 'aiGenerations', ['experiencia', 'proveedor', 'limit'], (ver) => d.lecturas.generaciones(data, ver));
    case 'usoIa':
      return leer('ai.read', 'aiUsage', ['dia'], (ver) => d.lecturas.usoIa(data, ver));
    case 'reservas':
      return leer('finance.read', 'creditTransactions', ['minutos', 'limit'], (ver) => d.lecturas.reservas(data, ver));
    case 'auditoria':
      return leer('audit.read', 'adminAudit', ['limit'], async () => {
        const limit = leerLimite(data.limit);
        const items = await d.auditoria.leer({ limit });
        return { items, fuente: 'adminAudit', truncado: items.length === limit };
      });
    default:
      return lecturaSinAuditar({ accion: 'opsAdmin.desconocida', permiso: 'ops.read', recurso: { tipo: 'opsAdmin' } }, auth, () => {
        throw new HttpsError('invalid-argument', 'Acción desconocida');
      }, d);
  }
};

export const atenderCuentas = async (d: DepsDeAdministracion, auth: Sesion, data: Record<string, unknown>): Promise<unknown> => {
  const action = accionDe(data);
  if (action !== 'buscar') {
    return lecturaSinAuditar({ accion: 'accountsAdmin.desconocida', permiso: 'accounts.read', recurso: { tipo: 'cuenta' } }, auth, () => {
      throw new HttpsError('invalid-argument', 'Acción desconocida');
    }, d);
  }
  /* El identificador consultado es justo lo que hay que poder auditar: quién miró a quién. Lo que no lo es, no se copia. */
  const objetivo = uidValido(data.uid) ?? normalizarNumeroDeCuenta(data.numeroDeCuenta) ?? undefined;
  return lecturaAuditada({ accion: 'accountsAdmin.buscar', permiso: 'accounts.read', recurso: { tipo: 'cuenta', ...(objetivo ? { id: objetivo } : {}) } }, auth, () => d.lecturas.buscarCuenta(data), d);
};

const entrada = (r: CallableRequest): Record<string, unknown> => (r.data && typeof r.data === 'object' ? r.data as Record<string, unknown> : {});

export const opsAdmin = onCall(OPTS, async (request) => atenderOps(deps(), request.auth as Sesion, entrada(request)));
export const accountsAdmin = onCall(OPTS, async (request) => atenderCuentas(deps(), request.auth as Sesion, entrada(request)));
