import { randomBytes } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { sanitizeForLog } from '../engine/sanitize';
import type { RolDePlataforma } from './permisos';

/**
 * EL REGISTRO DE AUDITORÍA DE ADMINISTRACIÓN: `adminAudit/{id}`.
 *
 * Quién hizo qué, sobre qué, cuándo, con qué resultado y con qué correlación. Las reglas lo cierran a todos los
 * clientes; lo escribe solo el servidor y SOLO lo CREA: este módulo no ofrece actualizar ni borrar, y `create` falla si
 * el documento ya existe. La consola no tiene forma de modificarlo.
 *
 * Lo usan todas las puertas de administración (`autorizacion.ts`). Es **solo añadir**: un mismo acto son varias entradas
 * con la misma `correlationId`. `intento` se escribe antes de una escritura, y `ok` o `error` cuando se sabe cómo
 * acabó. Un `intento` sin cierre es lo que hay que conciliar; nunca se registra éxito por adelantado.
 *
 * No guarda secretos: `metadatos` solo admite valores simples, descarta las claves que parecen credenciales y pasa
 * los textos por `sanitizeForLog`.
 */
export const COLECCION_DE_AUDITORIA = 'adminAudit';
export const VERSION_DE_AUDITORIA = 1;

export type ResultadoDeAuditoria = 'intento' | 'ok' | 'denegado' | 'error';

export interface EntradaDeAuditoria {
  actorUid: string;
  actorRol: RolDePlataforma | null;
  /** `callable.action`. */
  accion: string;
  recurso: { tipo: string; id?: string };
  resultado: ResultadoDeAuditoria;
  correlationId: string;
  codigoDeError?: string;
  /** Lo que dio quien actúa, si lo dio. Saneado y recortado; nunca un texto de otra persona. */
  motivo?: string;
  metadatos?: Record<string, unknown>;
}

export type RegistroDeAuditoria = EntradaDeAuditoria & { v: number; en: number; entorno: string };

const CLAVE_SENSIBLE = /pass|secret|token|credential|api[_-]?key|authorization|cookie|private/i;
const MAX_METADATOS = 20;
const MAX_TEXTO = 200;
const MAX_ACTOR = 128;

/** Solo valores simples, sin claves que parezcan credenciales y con los textos saneados. Lo demás no se guarda. */
export const metadatosSeguros = (entrada: Record<string, unknown> | undefined): Record<string, string | number | boolean> => {
  const salida: Record<string, string | number | boolean> = {};
  for (const [clave, valor] of Object.entries(entrada ?? {}).slice(0, MAX_METADATOS)) {
    if (CLAVE_SENSIBLE.test(clave)) continue;
    if (typeof valor === 'string') salida[clave] = sanitizeForLog(valor, MAX_TEXTO);
    else if (typeof valor === 'boolean' || (typeof valor === 'number' && Number.isFinite(valor))) salida[clave] = valor;
  }
  return salida;
};

export const nuevaCorrelacion = (): string => `adm_${randomBytes(12).toString('hex')}`;

export interface DepsDeAuditoria {
  db: Firestore;
  ahora?: () => number;
  /** El proyecto en el que corre (`GCLOUD_PROJECT`): cada entrada dice de qué entorno es. */
  entorno?: string;
}

export const crearAuditoria = ({ db, ahora = Date.now, entorno = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'desconocido' }: DepsDeAuditoria) => {
  const coleccion = () => db.collection(COLECCION_DE_AUDITORIA);
  return {
    /**
     * Crea la entrada; si no se puede, lanza. Quien llama decide: una lectura de administración NO devuelve datos si no
     * ha quedado constancia, y una escritura no se hace si no ha podido dejar su `intento`.
     */
    async registrar(e: EntradaDeAuditoria): Promise<RegistroDeAuditoria> {
      const registro: RegistroDeAuditoria = {
        v: VERSION_DE_AUDITORIA,
        en: ahora(),
        entorno,
        actorUid: String(e.actorUid).slice(0, MAX_ACTOR),
        actorRol: e.actorRol,
        accion: sanitizeForLog(e.accion, MAX_TEXTO),
        recurso: { tipo: sanitizeForLog(e.recurso.tipo, MAX_TEXTO), ...(e.recurso.id ? { id: sanitizeForLog(e.recurso.id, MAX_TEXTO) } : {}) },
        resultado: e.resultado,
        correlationId: sanitizeForLog(e.correlationId, MAX_TEXTO),
        ...(e.codigoDeError ? { codigoDeError: sanitizeForLog(e.codigoDeError, MAX_TEXTO) } : {}),
        ...(e.motivo ? { motivo: sanitizeForLog(e.motivo, MAX_TEXTO) } : {}),
        metadatos: metadatosSeguros(e.metadatos),
      };
      await coleccion().doc().create(registro);
      return registro;
    },
    /** Las últimas entradas, de más a menos reciente (índice automático de un campo). */
    async leer({ limit }: { limit: number }): Promise<RegistroDeAuditoria[]> {
      const snap = await coleccion().orderBy('en', 'desc').limit(limit).get();
      return snap.docs.map((d) => d.data() as RegistroDeAuditoria);
    },
  };
};
