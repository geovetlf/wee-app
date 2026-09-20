import { createHash } from 'node:crypto';
import {
  CAPACIDADES_DE_MC4,
  CapacidadDeProceso,
  DesenlaceDeProceso,
  DescriptorDeProveedorDeMedios,
  MotivoDeProcesador,
  PeticionDeProceso,
  PuertoDeProceso,
  canonizarTransformacion,
  falloDeProceso,
  transformacionValida,
} from '../core';

/**
 * UN PROCESADOR DE MENTIRA, PARA PROBAR EL DE VERDAD.
 *
 * Cumple el mismo puerto y las mismas reglas —rechaza lo que no sabe hacer,
 * respeta la transformación, produce un tamaño coherente— pero no abre un solo
 * byte de imagen: fabrica un resultado DETERMINISTA a partir de la
 * transformación canonizada.
 *
 * Eso es exactamente lo que hace falta para probar lo que MC-4 tiene que
 * garantizar —identidad, idempotencia, concurrencia, propiedad, verificación—
 * sin depender de una librería nativa, sin red y sin que dos ejecuciones
 * puedan diferir.
 *
 * No se compone en producción: no está en el catálogo de procesadores vivos.
 */

export const PROCESADOR_FALSO_ID = 'falso';

export const DESCRIPTOR_DEL_PROCESADOR_FALSO: DescriptorDeProveedorDeMedios<CapacidadDeProceso> = Object.freeze({
  id: PROCESADOR_FALSO_ID,
  name: 'Procesador de mentira (solo pruebas)',
  estado: 'UNVERIFIED',
  /* Las mismas que el real, más el póster: para poder probar el camino de vídeo sin tenerlo. */
  capacidades: Object.freeze([...CAPACIDADES_DE_MC4, 'video.poster', 'video.preview'] as CapacidadDeProceso[]),
});

export interface ProcesadorFalso extends PuertoDeProceso {
  /** Cuántas veces se le pidió algo. Sirve para probar que algo NO se repitió. */
  readonly llamadas: { procesar: number };
  /** Hacer que la siguiente falle, para probar el reintento del Job Engine. */
  fallarUnaVez(motivo: MotivoDeProcesador): void;
}

const TIPO: Readonly<Record<string, string>> = Object.freeze({
  jpeg: 'image/jpeg', webp: 'image/webp', png: 'image/png',
});

export const crearProcesadorFalso = (opciones: { capacidades?: readonly CapacidadDeProceso[] } = {}): ProcesadorFalso => {
  const llamadas = { procesar: 0 };
  const capacidades = opciones.capacidades ?? DESCRIPTOR_DEL_PROCESADOR_FALSO.capacidades;
  let falloPendiente: MotivoDeProcesador | undefined;

  return {
    processorId: PROCESADOR_FALSO_ID,
    capacidades,
    llamadas,
    fallarUnaVez(motivo) { falloPendiente = motivo; },

    async procesar(peticion: PeticionDeProceso): Promise<DesenlaceDeProceso> {
      llamadas.procesar++;
      const f = falloPendiente; falloPendiente = undefined;
      if (f) return { ok: false, error: falloDeProceso(PROCESADOR_FALSO_ID, f) };

      const t = peticion.transformacion;
      if (!transformacionValida(t)) {
        return { ok: false, error: falloDeProceso(PROCESADOR_FALSO_ID, 'peticion_invalida', { field: 'transformacion' }) };
      }
      if (!Buffer.isBuffer(peticion.cuerpo) || !peticion.cuerpo.length) {
        return { ok: false, error: falloDeProceso(PROCESADOR_FALSO_ID, 'peticion_invalida', { field: 'cuerpo' }) };
      }

      /*
       * Determinista: los mismos bytes y la misma transformación dan SIEMPRE el
       * mismo resultado. Es lo que permite comprobar que repetir converge.
       */
      const semilla = createHash('sha256')
        .update(`${canonizarTransformacion(t)}|${createHash('sha256').update(peticion.cuerpo).digest('hex')}`, 'utf8')
        .digest();
      const cuerpo = Buffer.concat([Buffer.from('falso:'), semilla]);

      return {
        ok: true,
        resultado: {
          cuerpo,
          contentType: TIPO[t.formato],
          bytes: cuerpo.length,
          ancho: t.ancho,
          alto: t.alto,
        },
      };
    },
  };
};
