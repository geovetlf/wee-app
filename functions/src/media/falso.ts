import { createHash } from 'node:crypto';
import {
  CAPACIDADES_DE_MC1,
  DesenlaceDeBorrado,
  DesenlaceDeGuardado,
  DesenlaceDeLectura,
  DescriptorDeProveedorDeMedios,
  ObjetoGuardado,
  PeticionDeGuardado,
  PuertoDeAlmacenamiento,
  StorageRef,
  esStorageRef,
  falloDeAlmacen,
} from '../core';

/**
 * UN ALMACÉN DE MENTIRA, PARA PODER PROBAR EL DE VERDAD.
 *
 * Cumple el mismo puerto y las mismas reglas que el adaptador real —incluida la
 * de guardar solo si la clave está libre—, pero los bytes viven en un `Map` que
 * muere con el test.
 *
 * ── Lo que NO es ────────────────────────────────────────────────────────────
 *
 * No es un segundo sistema de almacenamiento. No se compone en producción, no
 * se exporta desde ninguna Function, y no aparece en el registro vivo. Si un
 * día alguien lo enchufara a algo real, guardaría en memoria y lo perdería todo
 * al reiniciar — por eso su identificador es `fake` y no se disfraza de nada.
 *
 * Determinista, sin red, sin temporizadores y aislado por instancia: dos tests
 * que creen el suyo no se ven.
 */

export const FAKE_PROVIDER_ID = 'fake';

export const DESCRIPTOR_FALSO: DescriptorDeProveedorDeMedios = Object.freeze({
  id: FAKE_PROVIDER_ID,
  name: 'Almacén de mentira (solo pruebas)',
  estado: 'UNVERIFIED',
  capacidades: CAPACIDADES_DE_MC1,
  limites: Object.freeze({ maxLargoDeClave: 1024 }),
});

interface Guardado {
  cuerpo: Buffer;
  contentType: string;
  metadatos: Record<string, string>;
  etag: string;
  actualizadoEn: number;
}

export interface AlmacenFalso extends PuertoDeAlmacenamiento {
  /** Para poder mirar por dentro en una prueba, sin pasar por el puerto. */
  readonly contenido: ReadonlyMap<string, Guardado>;
  /** Cuántas veces se llamó a cada operación: sirve para probar que algo NO se repitió. */
  readonly llamadas: { guardar: number; mirar: number; borrar: number };
  /** Hacer que la siguiente operación falle, para probar el camino malo. */
  fallarUnaVez(motivo: 'proveedor_no_disponible' | 'sin_permiso'): void;
}

const claveDe = (ref: StorageRef): string => `${ref.provider}|${ref.bucket ?? ''}|${ref.objectKey}`;

export const crearAlmacenFalso = (opciones: { ahora?: () => number } = {}): AlmacenFalso => {
  const contenido = new Map<string, Guardado>();
  const llamadas = { guardar: 0, mirar: 0, borrar: 0 };
  const ahora = opciones.ahora ?? (() => Date.now());
  let falloPendiente: 'proveedor_no_disponible' | 'sin_permiso' | undefined;

  const tomarFallo = () => { const f = falloPendiente; falloPendiente = undefined; return f; };
  const comoObjeto = (ref: StorageRef, g: Guardado): ObjetoGuardado => ({
    ref, bytes: g.cuerpo.length, contentType: g.contentType, etiquetaDelProveedor: g.etag, actualizadoEn: g.actualizadoEn,
  });

  return {
    providerId: FAKE_PROVIDER_ID,
    capacidades: CAPACIDADES_DE_MC1,
    contenido,
    llamadas,
    fallarUnaVez(motivo) { falloPendiente = motivo; },

    async guardar(peticion: PeticionDeGuardado): Promise<DesenlaceDeGuardado> {
      llamadas.guardar++;
      const f = tomarFallo();
      if (f) return { ok: false, error: falloDeAlmacen(FAKE_PROVIDER_ID, f) };
      if (!esStorageRef(peticion.destino) || peticion.destino.provider !== FAKE_PROVIDER_ID) {
        return { ok: false, error: falloDeAlmacen(FAKE_PROVIDER_ID, 'peticion_invalida', { field: 'destino' }) };
      }
      if (!Buffer.isBuffer(peticion.cuerpo) || !peticion.cuerpo.length) {
        return { ok: false, error: falloDeAlmacen(FAKE_PROVIDER_ID, 'peticion_invalida', { field: 'cuerpo' }) };
      }
      const k = claveDe(peticion.destino);
      const previo = contenido.get(k);
      /* La MISMA regla que el adaptador real: solo si está libre. */
      if (previo && peticion.siNoExiste) return { ok: true, yaExistia: true, objeto: comoObjeto(peticion.destino, previo) };

      const g: Guardado = {
        cuerpo: Buffer.from(peticion.cuerpo),
        contentType: peticion.contentType || 'application/octet-stream',
        metadatos: { ...(peticion.metadatos ?? {}) },
        /* Un `ETag` creíble: el resumen del cuerpo, como hacen S3 y R2 con una subida simple. */
        etag: createHash('md5').update(peticion.cuerpo).digest('hex'),
        actualizadoEn: ahora(),
      };
      contenido.set(k, g);
      return { ok: true, yaExistia: false, objeto: comoObjeto(peticion.destino, g) };
    },

    async mirar(ref: StorageRef): Promise<DesenlaceDeLectura> {
      llamadas.mirar++;
      const f = tomarFallo();
      if (f) return { ok: false, motivo: 'fallo', error: falloDeAlmacen(FAKE_PROVIDER_ID, f) };
      if (!esStorageRef(ref) || ref.provider !== FAKE_PROVIDER_ID) {
        return { ok: false, motivo: 'fallo', error: falloDeAlmacen(FAKE_PROVIDER_ID, 'peticion_invalida', { field: 'ref' }) };
      }
      const g = contenido.get(claveDe(ref));
      return g ? { ok: true, objeto: comoObjeto(ref, g) } : { ok: false, motivo: 'no_existe' };
    },

    async borrar(ref: StorageRef): Promise<DesenlaceDeBorrado> {
      llamadas.borrar++;
      const f = tomarFallo();
      if (f) return { ok: false, error: falloDeAlmacen(FAKE_PROVIDER_ID, f) };
      if (!esStorageRef(ref) || ref.provider !== FAKE_PROVIDER_ID) {
        return { ok: false, error: falloDeAlmacen(FAKE_PROVIDER_ID, 'peticion_invalida', { field: 'ref' }) };
      }
      const k = claveDe(ref);
      const habia = contenido.has(k);
      contenido.delete(k);
      return { ok: true, yaNoEstaba: !habia };
    },
  };
};
