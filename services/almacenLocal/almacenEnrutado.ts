/*
 * ENRUTADOR POR CLAVE (línea I, «Mis proyectos»). Presenta al catálogo UN solo
 * `AlmacenLocal` y reparte cada clave entre dos almacenes que ya existen:
 *   · los ARCHIVOS del usuario (`proyectos/<id>/recursos/<recursoId>`) van a la carpeta WEE;
 *   · TODO lo demás (índice, copias de proyecto, carátulas, cuarentena) va a los metadatos.
 *
 * No es una segunda capa de almacenamiento: es el mismo contrato repartido. Así nada
 * interno llega a la carpeta que la persona ve en Archivos o en su sistema.
 */
import type { AlmacenLocal, EntradaDelAlmacen, EstadoDelAlmacen } from './tipos';

const ARCHIVO_DEL_USUARIO = /^proyectos\/[^/]+\/recursos\/[^/]+$/;

/** Verdadero solo para los archivos que el usuario debe poder ver en su carpeta WEE. */
export const esArchivoDelUsuario = (clave: string): boolean => ARCHIVO_DEL_USUARIO.test(clave);

export interface AlmacenesDelEnrutado {
  /** La carpeta WEE: solo archivos del usuario. */
  archivos: AlmacenLocal;
  /** Índice, copias y lo interno: nunca en la carpeta. */
  metadatos: AlmacenLocal;
}

export const crearAlmacenEnrutado = ({ archivos, metadatos }: AlmacenesDelEnrutado): AlmacenLocal => {
  const elegir = (clave: string): AlmacenLocal => (esArchivoDelUsuario(clave) ? archivos : metadatos);

  return {
    plataforma: archivos.plataforma,
    escribir: (clave, datos) => elegir(clave).escribir(clave, datos),
    leer: (clave) => elegir(clave).leer(clave),
    existe: (clave) => elegir(clave).existe(clave),
    borrar: (clave) => elegir(clave).borrar(clave),
    async listar(prefijo) {
      const [enArchivos, enMetadatos] = await Promise.all([archivos.listar(prefijo), metadatos.listar(prefijo)]);
      const todas: EntradaDelAlmacen[] = [...enArchivos, ...enMetadatos];
      return todas.sort((a, b) => (a.clave < b.clave ? -1 : a.clave > b.clave ? 1 : 0));
    },
    async limpiarTemporales() {
      return (await archivos.limpiarTemporales()) + (await metadatos.limpiarTemporales());
    },
    async estado(): Promise<EstadoDelAlmacen> {
      // El espacio y la persistencia son los de la carpeta: ahí van los archivos que ocupan sitio.
      const [enArchivos, enMetadatos] = await Promise.all([archivos.estado(), metadatos.estado()]);
      return {
        plataforma: enArchivos.plataforma,
        espacioLibre: enArchivos.espacioLibre,
        uso: enArchivos.uso + enMetadatos.uso,
        persistencia: enArchivos.persistencia,
      };
    },
  };
};
