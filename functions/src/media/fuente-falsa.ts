import {
  DesenlaceDeDescripcion,
  DesenlaceDeLecturaHistorica,
  FuenteHistorica,
  HechosDelObjeto,
  StorageRef,
  errorDelCore,
} from '../core';

/**
 * MC-6 · UNA FUENTE HISTÓRICA DE MENTIRA. Para probar el traslado entero sin
 * red, sin credenciales y sin un solo byte real.
 *
 * Es la hermana de `falso.ts`, que hace lo mismo con el almacén de destino, y
 * existe por la misma razón: un adaptador de verdad no se puede poner a fallar
 * a voluntad, y las rutas que importan de una migración son justamente las que
 * fallan —la fuente que no está, la que no deja entrar, la que se cae a mitad—.
 *
 * Sabe declarar una suma de comprobación, cosa que la fuente real NO hace. Así
 * los dos caminos de la verificación —con suma y sin ella— se prueban de
 * verdad, en vez de probarse solo el que el proveedor de hoy permite.
 */

export const FUENTE_FALSA_ID = 'fuentefalsa';

export type GuionDeFuente = 'ok' | 'no_existe' | 'sin_acceso' | 'fallo';

export interface RecursoFalso {
  cuerpo: Buffer;
  contentType?: string;
  suma?: { algoritmo: string; valor: string };
  /** Lo que la descripción dice que pesa, si se quiere que MIENTA respecto al cuerpo. */
  bytesDeclarados?: number;
}

export interface FuenteFalsa extends FuenteHistorica {
  /** Poner un recurso. La clave es `provider|bucket|objectKey`. */
  poner(ref: StorageRef, recurso: RecursoFalso): void;
  /** Cuántas veces se le pidió cada cosa. Para probar que no se transfiere de más. */
  readonly llamadas: { describir: number; leer: number };
  /** Forzar el desenlace de la próxima operación. */
  guion(g: GuionDeFuente): void;
}

const clave = (ref: StorageRef): string => `${ref.provider}|${ref.bucket ?? ''}|${ref.objectKey}`;

export interface OpcionesDeFuenteFalsa {
  sourceId?: string;
  estado?: FuenteHistorica['estado'];
}

export const crearFuenteFalsa = (opciones: OpcionesDeFuenteFalsa = {}): FuenteFalsa => {
  const sourceId = opciones.sourceId ?? FUENTE_FALSA_ID;
  const recursos = new Map<string, RecursoFalso>();
  const llamadas = { describir: 0, leer: 0 };
  let guion: GuionDeFuente = 'ok';

  const error = () => errorDelCore('PROVIDER_ERROR', `legacy:${sourceId}`, { details: { reason: 'de_mentira' } });

  const hechosDe = (r: RecursoFalso): HechosDelObjeto => ({
    bytes: r.bytesDeclarados ?? r.cuerpo.length,
    ...(r.contentType ? { contentType: r.contentType } : {}),
    ...(r.suma ? { suma: r.suma } : {}),
  });

  return {
    sourceId,
    estado: opciones.estado ?? 'UNVERIFIED',
    llamadas,
    guion(g: GuionDeFuente) { guion = g; },
    poner(ref: StorageRef, recurso: RecursoFalso) { recursos.set(clave(ref), recurso); },

    async describir(origen: StorageRef): Promise<DesenlaceDeDescripcion> {
      llamadas.describir++;
      if (guion === 'sin_acceso') return { ok: false, motivo: 'sin_acceso' };
      if (guion === 'fallo') return { ok: false, motivo: 'fallo', error: error() };
      const r = recursos.get(clave(origen));
      if (guion === 'no_existe' || !r) return { ok: false, motivo: 'no_existe' };
      return { ok: true, hechos: hechosDe(r) };
    },

    async leer(origen: StorageRef): Promise<DesenlaceDeLecturaHistorica> {
      llamadas.leer++;
      if (guion === 'sin_acceso') return { ok: false, motivo: 'sin_acceso' };
      if (guion === 'fallo') return { ok: false, motivo: 'fallo', error: error() };
      const r = recursos.get(clave(origen));
      if (guion === 'no_existe' || !r) return { ok: false, motivo: 'no_existe' };
      return { ok: true, cuerpo: r.cuerpo, hechos: { ...hechosDe(r), bytes: r.cuerpo.length } };
    },
  };
};
