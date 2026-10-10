/*
 * ALMACÉN DE METADATOS (línea I, «Mis proyectos»). Guarda el índice del catálogo, las
 * copias de cada proyecto y las carátulas en AsyncStorage, que la app ya usa. Nunca en
 * la carpeta WEE: esa carpeta es la que el usuario ve (en iOS, en Archivos) y no debe
 * contener nada interno.
 *
 * Implementa el mismo contrato `AlmacenLocal` que la carpeta. AsyncStorage guarda texto,
 * así que los bytes van en base64. Cada escritura es atómica por clave: no hace falta el
 * protocolo `.tmp` / `.anterior` de `sobrePuerto.ts`.
 *
 * Qué NO hay aquí: espacio libre (AsyncStorage no lo informa, así que es `null`, desconocido)
 * y persistencia garantizada (se borra al desinstalar la app o al borrar sus datos).
 */
import { base64Codificar, base64Decodificar } from '../../utils/bytes';
import { ErrorAlmacenLocal, esTemporal, validarClave, type AlmacenLocal, type EntradaDelAlmacen, type EstadoDelAlmacen, type PlataformaDelAlmacen } from './tipos';

/** Lo que AsyncStorage necesita, y nada más. Las pruebas le pasan un doble en memoria. */
export interface KvAsincrono {
  getItem(clave: string): Promise<string | null>;
  setItem(clave: string, valor: string): Promise<void>;
  removeItem(clave: string): Promise<void>;
  getAllKeys(): Promise<readonly string[]>;
}

export interface OpcionesDelAlmacenDeMetadatos {
  plataforma: PlataformaDelAlmacen;
  /** Prefijo de las claves dentro de AsyncStorage, para no pisar nada de la app. */
  espacio?: string;
}

const ESPACIO_POR_DEFECTO = 'wee.almacen.catalogo.v1/';

export const crearAlmacenDeMetadatos = (kv: KvAsincrono, opciones: OpcionesDelAlmacenDeMetadatos): AlmacenLocal => {
  const espacio = opciones.espacio ?? ESPACIO_POR_DEFECTO;
  const claveReal = (clave: string): string => `${espacio}${validarClave(clave)}`;

  const listar = async (prefijo: string): Promise<EntradaDelAlmacen[]> => {
    const entradas: EntradaDelAlmacen[] = [];
    for (const completa of await kv.getAllKeys()) {
      if (!completa.startsWith(espacio)) continue;
      const clave = completa.slice(espacio.length);
      if (!clave.startsWith(prefijo) || esTemporal(clave)) continue;
      const crudo = await kv.getItem(completa);
      if (crudo !== null) entradas.push({ clave, tamano: base64Decodificar(crudo).byteLength });
    }
    return entradas.sort((a, b) => (a.clave < b.clave ? -1 : a.clave > b.clave ? 1 : 0));
  };

  return {
    plataforma: opciones.plataforma,
    async escribir(clave, datos) {
      await kv.setItem(claveReal(clave), base64Codificar(datos));
    },
    async leer(clave) {
      const crudo = await kv.getItem(claveReal(clave));
      if (crudo === null) throw new ErrorAlmacenLocal('no_encontrado', clave);
      return base64Decodificar(crudo);
    },
    async existe(clave) {
      return (await kv.getItem(claveReal(clave))) !== null;
    },
    async borrar(clave) {
      await kv.removeItem(claveReal(clave));
    },
    listar,
    async limpiarTemporales() {
      // Sin escrituras a medias: AsyncStorage no deja temporales.
      return 0;
    },
    async estado(): Promise<EstadoDelAlmacen> {
      const uso = (await listar('')).reduce((total, entrada) => total + entrada.tamano, 0);
      return { plataforma: opciones.plataforma, espacioLibre: null, uso, persistencia: 'no_garantizada' };
    },
  };
};
