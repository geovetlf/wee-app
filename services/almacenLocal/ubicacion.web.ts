/*
 * UBICACIÓN WEE, WEB. Solo conecta APIs del navegador con las fábricas puras de
 * `puertosDeUbicacion.ts`:
 *
 *   · Chromium con showDirectoryPicker: una carpeta del ordenador. El manejador se
 *     guarda en IndexedDB; al volver, el permiso se pide de nuevo con un gesto.
 *   · Sin File System Access: OPFS, un espacio PRIVADO del navegador. El sistema no
 *     lo muestra como carpeta. Nunca se presenta como carpeta física.
 *   · Sin ninguno de los dos: `null`, y la pantalla lo dice.
 */
import type { PuertoDeUbicacion, TiendaDeUbicacion } from '../../utils/ubicacionWee';
import { crearRegistroIdb, type FabricaIdb, type RegistroDeClaves } from './registroIdb';
import type { ManejadorDeDirectorioWeb } from './puertoDirectorioWeb';
import { crearTiendaDeUbicacionEnRegistro, crearUbicacionCarpetaWeb, crearUbicacionOpfs } from './puertosDeUbicacion';
import { ErrorAlmacenLocal } from './tipos';

type VentanaConCarpetas = {
  showDirectoryPicker?: (opciones?: { mode?: 'read' | 'readwrite' }) => Promise<ManejadorDeDirectorioWeb>;
};

const ventana = globalThis as unknown as VentanaConCarpetas;
const registro: RegistroDeClaves | null = typeof indexedDB !== 'undefined' ? crearRegistroIdb(indexedDB as unknown as FabricaIdb) : null;

type AlmacenamientoConOpfs = { getDirectory?: () => Promise<ManejadorDeDirectorioWeb> };
const almacenamiento = (): AlmacenamientoConOpfs | null =>
  typeof navigator !== 'undefined' && navigator.storage ? (navigator.storage as unknown as AlmacenamientoConOpfs) : null;
const hayOpfs = (): boolean => typeof almacenamiento()?.getDirectory === 'function';

/*
 * `navigator.storage.estimate()` mide la cuota del ORIGEN (lo que el navegador guarda para Weë),
 * no el disco del usuario. Solo sirve para OPFS, que sí vive en ese origen.
 */
const espacioDelOrigen = async (): Promise<number | null> => {
  try {
    const estimacion = await navigator.storage.estimate();
    return typeof estimacion.quota === 'number' && typeof estimacion.usage === 'number' ? Math.max(0, estimacion.quota - estimacion.usage) : null;
  } catch {
    return null;
  }
};

/* La carpeta del ordenador no da su espacio libre (File System Access no lo expone): desconocido, nunca 0 ni la cuota del origen. */
const espacioDesconocidoDelDisco = async (): Promise<number | null> => null;

const ubicacionCarpeta: PuertoDeUbicacion | null =
  registro && typeof ventana.showDirectoryPicker === 'function'
    ? crearUbicacionCarpetaWeb({
        registro,
        elegirManejador: () => {
          const selector = ventana.showDirectoryPicker;
          if (!selector) throw new ErrorAlmacenLocal('no_disponible', 'sin File System Access');
          return selector({ mode: 'readwrite' });
        },
        espacioLibre: espacioDesconocidoDelDisco,
      })
    : null;

const ubicacionPrivada: PuertoDeUbicacion | null = hayOpfs()
  ? crearUbicacionOpfs({
      async raiz() {
        const getDirectory = almacenamiento()?.getDirectory;
        return getDirectory ? getDirectory() : null;
      },
      espacioLibre: espacioDelOrigen,
    })
  : null;

/** La ubicación de este navegador, o null si no tiene ni carpeta del ordenador ni OPFS. */
export const puertoDeUbicacionDelDispositivo: PuertoDeUbicacion | null = ubicacionCarpeta ?? ubicacionPrivada;

/**
 * El registro de la ubicación y el manejador de la carpeta viven en IndexedDB. Mismo nombre
 * que en `ubicacion.ts`; aquí puede ser null (navegador sin IndexedDB).
 */
export const tiendaDeUbicacion: TiendaDeUbicacion | null = registro ? crearTiendaDeUbicacionEnRegistro(registro) : null;
