/*
 * UBICACIÓN WEE, NATIVA (iOS y Android). Solo conecta APIs reales con las fábricas
 * puras de `puertosDeUbicacion.ts` (la lógica y sus pruebas están allí).
 *
 * iOS. La carpeta WEE vive dentro de los documentos de la app y se ve en la app Archivos
 * porque app.json declara UIFileSharingEnabled y LSSupportsOpeningDocumentsInPlace
 * (decisión del dueño, línea I). Por eso dentro de los documentos solo puede haber
 * archivos del usuario: el índice y las copias van a AsyncStorage (`almacenDeMetadatos`).
 * No hay selector: no se pide ningún permiso.
 *
 * Android. Storage Access Framework: la persona elige una carpeta (p. ej. Documentos)
 * y Weë crea WEE dentro. No se pide READ/WRITE_EXTERNAL_STORAGE. El permiso SAF dura
 * mientras el sistema lo conserve; si se pierde, se vuelve a elegir. NO VERIFICADO
 * EN DISPOSITIVO: no hay un Android conectado.
 */
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { base64Codificar, base64Decodificar } from '../../utils/bytes';
import { ErrorAlmacenLocal } from './tipos';
import type { EntradaDelPuerto } from './puertoDeArchivos';
import type { OperacionesDeRuta } from './puertoDeRuta';
import type { HijoSAF, OperacionesSAF } from './puertoSAF';
import { crearUbicacionSAF, crearUbicacionSandbox, nombreDeUriSAF } from './puertosDeUbicacion';
import type { PuertoDeUbicacion, RegistroDeUbicacion, TiendaDeUbicacion } from '../../utils/ubicacionWee';

const CLAVE_DEL_REGISTRO = 'wee.almacen.ubicacion.v1';
const BASE64 = { encoding: FileSystem.EncodingType.Base64 };

const separadorFinal = (ruta: string): string => (ruta.endsWith('/') ? '' : '/');

const operacionesDeRuta: OperacionesDeRuta = {
  async tipoDe(ruta) {
    const info = await FileSystem.getInfoAsync(ruta);
    if (!info.exists) return null;
    return info.isDirectory ? 'carpeta' : 'archivo';
  },
  async leer(ruta) {
    const info = await FileSystem.getInfoAsync(ruta);
    if (!info.exists || info.isDirectory) throw new ErrorAlmacenLocal('no_encontrado', ruta);
    return base64Decodificar(await FileSystem.readAsStringAsync(ruta, BASE64));
  },
  async escribir(ruta, datos) {
    const carpeta = ruta.slice(0, ruta.lastIndexOf('/') + 1);
    if (!(await FileSystem.getInfoAsync(carpeta)).exists) await FileSystem.makeDirectoryAsync(carpeta, { intermediates: true });
    await FileSystem.writeAsStringAsync(ruta, base64Codificar(datos), BASE64);
  },
  async borrar(ruta) {
    await FileSystem.deleteAsync(ruta, { idempotent: true });
  },
  async mover(desde, hasta) {
    await FileSystem.moveAsync({ from: desde, to: hasta });
  },
  async crearCarpeta(ruta) {
    if (!(await FileSystem.getInfoAsync(ruta)).exists) await FileSystem.makeDirectoryAsync(ruta, { intermediates: true });
  },
  async listar(ruta) {
    const info = await FileSystem.getInfoAsync(ruta);
    if (!info.exists || !info.isDirectory) return [];
    const entradas: EntradaDelPuerto[] = [];
    for (const nombre of await FileSystem.readDirectoryAsync(ruta)) {
      const hijo = await FileSystem.getInfoAsync(`${ruta}${separadorFinal(ruta)}${nombre}`);
      if (!hijo.exists) continue;
      entradas.push(hijo.isDirectory ? { nombre, tipo: 'carpeta', tamano: 0 } : { nombre, tipo: 'archivo', tamano: hijo.size ?? 0 });
    }
    return entradas;
  },
  async espacioLibre() {
    try {
      return await FileSystem.getFreeDiskStorageAsync();
    } catch {
      return null;
    }
  },
};

const esCarpetaSAF = async (uri: string): Promise<boolean> => {
  try {
    await FileSystem.StorageAccessFramework.readDirectoryAsync(uri);
    return true;
  } catch {
    return false;
  }
};

const operacionesSAF: OperacionesSAF = {
  async hijos(uriCarpeta) {
    const hijos: HijoSAF[] = [];
    for (const uri of await FileSystem.StorageAccessFramework.readDirectoryAsync(uriCarpeta)) {
      hijos.push({ uri, nombre: nombreDeUriSAF(uri), esCarpeta: await esCarpetaSAF(uri), tamano: null });
    }
    return hijos;
  },
  crearCarpeta: (uriPadre, nombre) => FileSystem.StorageAccessFramework.makeDirectoryAsync(uriPadre, nombre),
  crearArchivo: (uriPadre, nombre) => FileSystem.StorageAccessFramework.createFileAsync(uriPadre, nombre, 'application/octet-stream'),
  async leer(uri) {
    return base64Decodificar(await FileSystem.readAsStringAsync(uri, BASE64));
  },
  async escribir(uri, datos) {
    await FileSystem.writeAsStringAsync(uri, base64Codificar(datos), BASE64);
  },
  async borrar(uri) {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  },
};

const ubicacionIOS = crearUbicacionSandbox({
  carpetaDelSistema: async () => FileSystem.documentDirectory,
  operaciones: operacionesDeRuta,
});

const ubicacionAndroid = crearUbicacionSAF({
  async elegirCarpeta() {
    const permiso = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    return permiso.granted ? permiso.directoryUri : null;
  },
  async puedeLeer(uri) {
    try {
      await FileSystem.StorageAccessFramework.readDirectoryAsync(uri);
      return true;
    } catch {
      return false;
    }
  },
  operaciones: operacionesSAF,
});

/** El registro de la ubicación es una preferencia del aparato (AsyncStorage). */
const tiendaNativa: TiendaDeUbicacion = {
  async leer() {
    const crudo = await AsyncStorage.getItem(CLAVE_DEL_REGISTRO);
    return crudo ? (JSON.parse(crudo) as RegistroDeUbicacion) : null;
  },
  async guardar(registro) {
    await AsyncStorage.setItem(CLAVE_DEL_REGISTRO, JSON.stringify(registro));
  },
  async borrar() {
    await AsyncStorage.removeItem(CLAVE_DEL_REGISTRO);
  },
};

/*
 * Mismos nombres y tipos que `ubicacion.web.ts`, para que quien importa no sepa en qué
 * plataforma está. En el nativo siempre hay ubicación; en la web puede no haberla.
 */

/** La ubicación de este aparato: iOS (sandbox) o Android (SAF). */
export const puertoDeUbicacionDelDispositivo: PuertoDeUbicacion | null = Platform.OS === 'android' ? ubicacionAndroid : ubicacionIOS;

/** El registro de la ubicación del aparato (AsyncStorage). */
export const tiendaDeUbicacion: TiendaDeUbicacion | null = tiendaNativa;
