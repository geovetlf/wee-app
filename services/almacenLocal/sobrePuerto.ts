/*
 * ALMACÉN LOCAL SOBRE UN PUERTO DE ARCHIVOS (línea B1, carpeta WEE).
 *
 * Implementa el contrato `AlmacenLocal` encima de `PuertoDeArchivos`. Es el mismo
 * para iOS, Android (SAF), la web (File System Access u OPFS) y las pruebas: lo que
 * cambia es el puerto, nunca la lógica de guardado.
 *
 * PROTOCOLO DE ESCRITURA (`escribir`). Ningún paso borra el original antes de
 * confirmar el nuevo:
 *   1. Comprueba el espacio libre; si no cabe, `sin_espacio` ANTES de tocar nada.
 *   2. Escribe el contenido en `<clave>.tmp` y lo LEE de vuelta para verificarlo.
 *   3. Si ya existía `<clave>`, lo aparta a `<clave>.anterior` (no lo borra).
 *   4. Mueve `<clave>.tmp` a `<clave>`: el nuevo ocupa su sitio.
 *   5. Solo entonces borra `<clave>.anterior`.
 *
 * RECUPERACIÓN (`limpiarTemporales`, que el catálogo llama al abrir y tras un
 * fallo). Si quedó un `.anterior` sin su archivo, se RESTAURA. Si el archivo ya
 * existe, el `.anterior` sobra y se borra. Los `.tmp` nunca son datos: se borran.
 * Así un corte en cualquier paso deja el original o el nuevo completo, nunca nada.
 *
 * REINTENTOS: escribir la misma clave sobrescribe; nunca crea duplicados.
 */
import { ErrorAlmacenLocal, SUFIJO_TEMPORAL, validarClave, type AlmacenLocal, type EntradaDelAlmacen, type EstadoDelAlmacen, type PersistenciaDelAlmacen, type PlataformaDelAlmacen } from './tipos';
import type { EntradaDelPuerto, PuertoDeArchivos } from './puertoDeArchivos';
import { iguales } from '../../utils/bytes';

export const SUFIJO_ANTERIOR = '.anterior';

const clavePermitida = (clave: string): string => {
  validarClave(clave);
  if (clave.endsWith(SUFIJO_ANTERIOR)) throw new ErrorAlmacenLocal('desconocido', `clave reservada: ${clave}`);
  return clave;
};

export interface OpcionesDelAlmacenSobrePuerto {
  plataforma: PlataformaDelAlmacen;
  persistencia: PersistenciaDelAlmacen;
}

export const crearAlmacenSobrePuerto = (puerto: PuertoDeArchivos, opciones: OpcionesDelAlmacenSobrePuerto): AlmacenLocal => {
  /** Todos los archivos bajo la raíz, también los temporales y los apartados. */
  const todos = async (): Promise<Array<{ clave: string; tamano: number }>> => {
    const salida: Array<{ clave: string; tamano: number }> = [];
    const recorrer = async (carpeta: string): Promise<void> => {
      const entradas: EntradaDelPuerto[] = await puerto.listar(carpeta);
      for (const entrada of entradas) {
        const ruta = carpeta ? `${carpeta}/${entrada.nombre}` : entrada.nombre;
        if (entrada.tipo === 'carpeta') await recorrer(ruta);
        else salida.push({ clave: ruta, tamano: entrada.tamano ?? 0 });
      }
    };
    await recorrer('');
    return salida;
  };

  const existeComoArchivo = async (clave: string): Promise<boolean> => (await puerto.tipoDe(clave)) === 'archivo';

  return {
    plataforma: opciones.plataforma,

    async escribir(clave, datos) {
      clavePermitida(clave);
      const libre = await puerto.espacioLibre();
      if (libre !== null && libre < datos.byteLength) throw new ErrorAlmacenLocal('sin_espacio', clave);

      const temporal = `${clave}${SUFIJO_TEMPORAL}`;
      const anterior = `${clave}${SUFIJO_ANTERIOR}`;

      await puerto.escribir(temporal, datos);
      const releido = await puerto.leer(temporal);
      if (!iguales(releido, datos)) {
        await puerto.borrar(temporal);
        throw new ErrorAlmacenLocal('corrupto', clave);
      }

      const existia = await existeComoArchivo(clave);
      if (existia) {
        // Un `.anterior` que sobra de un corte previo es obsoleto: `clave` es la versión válida.
        await puerto.borrar(anterior);
        await puerto.mover(clave, anterior);
      }
      await puerto.mover(temporal, clave);
      if (existia) await puerto.borrar(anterior);
    },

    async leer(clave) {
      clavePermitida(clave);
      return puerto.leer(clave);
    },

    async existe(clave) {
      clavePermitida(clave);
      return existeComoArchivo(clave);
    },

    async borrar(clave) {
      clavePermitida(clave);
      await puerto.borrar(clave);
    },

    async listar(prefijo) {
      const entradas: EntradaDelAlmacen[] = [];
      for (const { clave, tamano } of await todos()) {
        if (clave.endsWith(SUFIJO_TEMPORAL) || clave.endsWith(SUFIJO_ANTERIOR) || !clave.startsWith(prefijo)) continue;
        entradas.push({ clave, tamano });
      }
      return entradas.sort((a, b) => (a.clave < b.clave ? -1 : a.clave > b.clave ? 1 : 0));
    },

    async limpiarTemporales() {
      let retirados = 0;
      const archivos = await todos();
      for (const { clave } of archivos) {
        if (!clave.endsWith(SUFIJO_ANTERIOR)) continue;
        const original = clave.slice(0, -SUFIJO_ANTERIOR.length);
        if (await existeComoArchivo(original)) await puerto.borrar(clave);
        else await puerto.mover(clave, original);
        retirados++;
      }
      for (const { clave } of await todos()) {
        if (!clave.endsWith(SUFIJO_TEMPORAL)) continue;
        await puerto.borrar(clave);
        retirados++;
      }
      return retirados;
    },

    async estado(): Promise<EstadoDelAlmacen> {
      let uso = 0;
      for (const { clave, tamano } of await todos()) {
        if (!clave.endsWith(SUFIJO_TEMPORAL) && !clave.endsWith(SUFIJO_ANTERIOR)) uso += tamano;
      }
      return { plataforma: opciones.plataforma, espacioLibre: await puerto.espacioLibre(), uso, persistencia: opciones.persistencia };
    },
  };
};
