/*
 * ADAPTADOR DE MEMORIA del almacén local. SOLO PARA PRUEBAS.
 *
 * Imita la escritura atómica del nativo y del navegador: escribe un temporal
 * y lo renombra. Por eso puede simular un corte en mitad (`antesDe`), y una
 * prueba comprueba que el índice sigue íntegro. El `respaldo` es un Map que se
 * puede compartir entre instancias: así una «reapertura» lee lo persistido.
 */
import { ErrorAlmacenLocal, esTemporal, SUFIJO_TEMPORAL, validarClave, type AlmacenLocal, type EntradaDelAlmacen, type EstadoDelAlmacen } from '../../services/almacenLocal/tipos';

export type PasoDeEscritura = 'escribir-temporal' | 'renombrar' | 'borrar' | 'leer';

export interface OpcionesDelAlmacenDeMemoria {
  /** Bytes que caben en total, temporales incluidos. Sin valor, el espacio es desconocido. */
  capacidad?: number;
  /** Se llama antes de cada paso. Si lanza, simula un corte o un fallo en ese punto. */
  antesDe?: (paso: PasoDeEscritura, clave: string) => void;
}

export interface AlmacenDeMemoria extends AlmacenLocal {
  readonly respaldo: Map<string, Uint8Array>;
}

export const crearAlmacenMemoria = (
  respaldo: Map<string, Uint8Array> = new Map(),
  opciones: OpcionesDelAlmacenDeMemoria = {},
): AlmacenDeMemoria => {
  const bytesTotales = (): number => {
    let total = 0;
    for (const datos of respaldo.values()) total += datos.byteLength;
    return total;
  };
  const paso = (nombre: PasoDeEscritura, clave: string): void => opciones.antesDe?.(nombre, clave);

  return {
    plataforma: 'memoria',
    respaldo,
    async escribir(clave, datos) {
      validarClave(clave);
      // Durante la escritura conviven el temporal y lo que hubiera: el espacio se mide con los dos.
      if (opciones.capacidad !== undefined && bytesTotales() + datos.byteLength > opciones.capacidad) {
        throw new ErrorAlmacenLocal('sin_espacio', clave);
      }
      const temporal = `${clave}${SUFIJO_TEMPORAL}`;
      paso('escribir-temporal', clave);
      respaldo.set(temporal, Uint8Array.from(datos));
      paso('renombrar', clave);
      respaldo.set(clave, respaldo.get(temporal) ?? new Uint8Array(0));
      respaldo.delete(temporal);
    },
    async leer(clave) {
      validarClave(clave);
      paso('leer', clave);
      const datos = respaldo.get(clave);
      if (!datos) throw new ErrorAlmacenLocal('no_encontrado', clave);
      return Uint8Array.from(datos);
    },
    async existe(clave) {
      validarClave(clave);
      return respaldo.has(clave);
    },
    async borrar(clave) {
      validarClave(clave);
      paso('borrar', clave);
      respaldo.delete(clave);
    },
    async listar(prefijo) {
      const entradas: EntradaDelAlmacen[] = [];
      for (const [clave, datos] of respaldo) {
        if (clave.startsWith(prefijo) && !esTemporal(clave)) entradas.push({ clave, tamano: datos.byteLength });
      }
      return entradas.sort((a, b) => (a.clave < b.clave ? -1 : a.clave > b.clave ? 1 : 0));
    },
    async limpiarTemporales() {
      let borrados = 0;
      for (const clave of [...respaldo.keys()]) {
        if (esTemporal(clave)) {
          respaldo.delete(clave);
          borrados++;
        }
      }
      return borrados;
    },
    async estado(): Promise<EstadoDelAlmacen> {
      let uso = 0;
      for (const [clave, datos] of respaldo) if (!esTemporal(clave)) uso += datos.byteLength;
      return {
        plataforma: 'memoria',
        espacioLibre: opciones.capacidad === undefined ? null : Math.max(0, opciones.capacidad - bytesTotales()),
        uso,
        persistencia: 'no_garantizada',
      };
    },
  };
};
