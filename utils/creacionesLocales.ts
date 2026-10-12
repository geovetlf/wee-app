/*
 * CREACIONES SOLO LOCALES (R9 · D-4, decisión del dueño 2026-10-12).
 *
 * Una persona puede finalizar y conservar un resultado que solo está en su dispositivo. La creación local es la misma
 * decisión que una de Weë Cloud («esto lo conservo»), guardada EN EL DISPOSITIVO y referenciando recursos del catálogo
 * local (`utils/catalogoLocal.ts`, línea C) por `projectId` + `recursoId` + `sha256`. No sube bytes, no copia archivos
 * y no necesita conexión: la nube no es obligatoria. Lo que sí la necesita (sincronizar, publicar) lo dice
 * `requiereConexion` y la interfaz lo informa sin tocar el resultado local.
 *
 * ALMACÉN: `creaciones-locales.json` en el mismo `AlmacenLocal` que el catálogo (escritura atómica del puerto).
 * PROTECCIÓN: si el archivo existe y no se puede leer o es de un esquema más nuevo, NO se sobrescribe — se lanza
 * `ilegible` / `solo_lectura` y lo que había se conserva intacto (nunca se pierde un resultado local).
 * IDEMPOTENCIA: el id sale del conjunto de referencias; repetir el `requestId` devuelve la misma; reutilizarlo con
 * otro conjunto es `conflicto` (misma regla que en el servidor, `decidirFinalizar`).
 */
import type { AlmacenLocal } from '../services/almacenLocal/tipos';
import { utf8Codificar, utf8Decodificar } from './bytes';
import {
  EstadoDeCreacion, EstadoDeSincronizacion, FORMA_DE_REQUEST_ID, ReferenciaLocal,
  conjuntoDeReferenciasLocales, decidirFinalizar, idDeCreacionLocal, claveDeReferenciaLocal,
} from './cicloDeTrabajo';

export const CLAVE_DE_CREACIONES_LOCALES = 'creaciones-locales.json';
export const ESQUEMA_DE_CREACIONES_LOCALES = 1;
const MAXIMO_DE_NOMBRE = 60;

export interface CreacionLocal {
  creationId: string;
  referencias: ReferenciaLocal[];
  nombre: string;
  tipo: string;
  herramienta: string | null;
  proyectoOrigenId: string | null;
  requestId: string;
  status: EstadoDeCreacion;
  ubicacion: 'local';
  sincronizacion: EstadoDeSincronizacion;
  finalizadaEn: number;
  updatedAt: number;
  deletedAt?: number | null;
  ownerAccountId?: string;
}

export type CodigoDeCreacionLocal = 'invalido' | 'no_encontrado' | 'conflicto' | 'ilegible' | 'solo_lectura';

export class ErrorDeCreacionLocal extends Error {
  readonly code: CodigoDeCreacionLocal;
  constructor(code: CodigoDeCreacionLocal, detalle?: string) {
    super(detalle ? `${code}: ${detalle}` : code);
    this.name = 'ErrorDeCreacionLocal';
    this.code = code;
  }
}

export interface EntradaFinalizarLocal {
  referencias: ReferenciaLocal[];
  tipo: string;
  herramienta?: string | null;
  proyectoOrigenId?: string | null;
  nombre?: string;
  requestId: string;
}

export interface OpcionesDeCreacionesLocales {
  ahora?: () => number;
  cuentaId?: string;
  /**
   * ¿Existe ese recurso en el dispositivo, con esa huella? Se construye con el catálogo local
   * (`recursoLocalPresente(catalogo)`). Sin él no se comprueba: lo exige quien llame desde la app.
   */
  presente?: (r: ReferenciaLocal) => boolean;
}

/** El comprobador habitual, desde el catálogo local de la línea C (solo su forma; no se toca el catálogo). */
export const recursoLocalPresente = (catalogo: { proyecto(projectId: string): { recursos: { recursoId: string; sha256: string; estado: string }[] } | null }) =>
  (r: ReferenciaLocal): boolean =>
    !!catalogo.proyecto(r.projectId)?.recursos.some((x) => x.recursoId === r.recursoId && x.sha256 === r.sha256 && x.estado === 'local');

interface Archivo { esquema: number; creaciones: CreacionLocal[] }

const leerArchivo = async (almacen: AlmacenLocal): Promise<Archivo> => {
  if (!(await almacen.existe(CLAVE_DE_CREACIONES_LOCALES))) return { esquema: ESQUEMA_DE_CREACIONES_LOCALES, creaciones: [] };
  let datos: unknown;
  try {
    datos = JSON.parse(utf8Decodificar(await almacen.leer(CLAVE_DE_CREACIONES_LOCALES)));
  } catch {
    throw new ErrorDeCreacionLocal('ilegible');
  }
  const a = datos as Partial<Archivo> | null;
  if (!a || typeof a.esquema !== 'number' || !Array.isArray(a.creaciones)) throw new ErrorDeCreacionLocal('ilegible');
  if (a.esquema > ESQUEMA_DE_CREACIONES_LOCALES) throw new ErrorDeCreacionLocal('solo_lectura');
  return { esquema: a.esquema, creaciones: a.creaciones as CreacionLocal[] };
};

export interface CreacionesLocales {
  listar(): Promise<CreacionLocal[]>;
  finalizar(entrada: EntradaFinalizarLocal): Promise<{ creacionId: string; yaExistia: boolean }>;
  eliminar(creationId: string): Promise<{ creacionId: string; yaEstaba: boolean }>;
}

export const abrirCreacionesLocales = (almacen: AlmacenLocal, opciones: OpcionesDeCreacionesLocales = {}): CreacionesLocales => {
  const ahora = opciones.ahora ?? Date.now;
  /* Una operación a la vez sobre el archivo: dos finalizar simultáneos no se pisan. */
  let cola: Promise<unknown> = Promise.resolve();
  const enFila = <T,>(fn: () => Promise<T>): Promise<T> => {
    const p = cola.then(fn, fn);
    cola = p.catch(() => undefined);
    return p;
  };
  const escribir = (a: Archivo) => almacen.escribir(CLAVE_DE_CREACIONES_LOCALES, utf8Codificar(JSON.stringify(a)));

  return {
    listar: () => enFila(async () => (await leerArchivo(almacen)).creaciones.filter((c) => c.status === 'final')),

    finalizar: (e) => enFila(async () => {
      const claves = conjuntoDeReferenciasLocales(e?.referencias);
      if (!claves) throw new ErrorDeCreacionLocal('invalido');
      if (typeof e.requestId !== 'string' || !FORMA_DE_REQUEST_ID.test(e.requestId)) throw new ErrorDeCreacionLocal('invalido');
      if (typeof e.tipo !== 'string' || !e.tipo) throw new ErrorDeCreacionLocal('invalido');
      if (opciones.presente && !e.referencias.every((r) => opciones.presente!(r))) throw new ErrorDeCreacionLocal('no_encontrado');
      const archivo = await leerArchivo(almacen);
      const creationId = idDeCreacionLocal(claves);
      const claveDe = (c: CreacionLocal) => c.referencias.map((r) => claveDeReferenciaLocal(r) ?? '').sort();
      const minima = (c: CreacionLocal | undefined) => (c ? { creationId: c.creationId, assetIds: claveDe(c), status: c.status, requestId: c.requestId } : null);
      const decision = decidirFinalizar({
        assetIds: claves,
        porConjunto: minima(archivo.creaciones.find((c) => c.creationId === creationId)),
        porPeticion: minima(archivo.creaciones.find((c) => c.requestId === e.requestId)),
      });
      if (decision.accion === 'conflicto') throw new ErrorDeCreacionLocal('conflicto');
      if (decision.accion === 'devolver') return { creacionId: decision.creationId, yaExistia: true };
      const at = ahora();
      if (decision.accion === 'revivir') {
        archivo.creaciones = archivo.creaciones.map((c) => (c.creationId === decision.creationId ? { ...c, status: 'final', finalizadaEn: at, updatedAt: at, deletedAt: null } : c));
      } else {
        const ordenadas = [...e.referencias].sort((x, y) => (claveDeReferenciaLocal(x)! < claveDeReferenciaLocal(y)! ? -1 : 1))
          .filter((r, i, l) => i === 0 || claveDeReferenciaLocal(r) !== claveDeReferenciaLocal(l[i - 1]))
          .map((r) => ({ projectId: r.projectId, recursoId: r.recursoId, sha256: r.sha256 }));
        archivo.creaciones.push({
          creationId,
          referencias: ordenadas,
          nombre: typeof e.nombre === 'string' ? e.nombre.trim().slice(0, MAXIMO_DE_NOMBRE) : '',
          tipo: e.tipo,
          herramienta: typeof e.herramienta === 'string' ? e.herramienta : null,
          proyectoOrigenId: typeof e.proyectoOrigenId === 'string' ? e.proyectoOrigenId : null,
          requestId: e.requestId,
          status: 'final',
          ubicacion: 'local',
          sincronizacion: 'solo_local',
          finalizadaEn: at,
          updatedAt: at,
          ...(opciones.cuentaId ? { ownerAccountId: opciones.cuentaId } : {}),
        });
      }
      await escribir(archivo);
      return { creacionId: decision.accion === 'revivir' ? decision.creationId : creationId, yaExistia: false };
    }),

    eliminar: (creationId) => enFila(async () => {
      const archivo = await leerArchivo(almacen);
      const c = archivo.creaciones.find((x) => x.creationId === creationId);
      if (!c) throw new ErrorDeCreacionLocal('no_encontrado');
      if (c.status === 'eliminada') return { creacionId: creationId, yaEstaba: true };
      const at = ahora();
      /* Solo la decisión: el recurso del catálogo local no se toca. */
      archivo.creaciones = archivo.creaciones.map((x) => (x.creationId === creationId ? { ...x, status: 'eliminada', deletedAt: at, updatedAt: at } : x));
      await escribir(archivo);
      return { creacionId: creationId, yaEstaba: false };
    }),
  };
};
