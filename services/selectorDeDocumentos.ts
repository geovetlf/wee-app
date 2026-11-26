import { TIPOS_DE_DOCUMENTO } from '../constants/filmmakerDocumentos';
import type { ArchivoElegido } from './documentosService';

/**
 * EL SELECTOR DE ARCHIVOS, CON CARGA SEGURA.
 *
 * `expo-document-picker` es un módulo NATIVO: la build de desarrollo que ya está instalada en un teléfono no lo trae hasta
 * que se reconstruye el APK. Importarlo de forma estática rompería la pantalla (y en web, si el paquete aún no está
 * instalado, el empaquetado). Por eso se carga aquí, perezosamente y dentro de un try/catch (Metro lo trata como
 * dependencia opcional): si falta, o falta su parte nativa, `disponible()` es false y quien pinta la fila la deja CERRADA con
 * el motivo `filmmakerDocumentos.errUpdateApp` («Actualiza la app para subir documentos»). Nunca lanza hacia la pantalla.
 * En web funciona con un input de archivo, sin parte nativa.
 */
export type ResultadoDeSeleccion = { estado: 'elegido'; archivo: ArchivoElegido } | { estado: 'cancelado' } | { estado: 'no_disponible' };

/** Lo mínimo que usamos del módulo; una simulación en las pruebas solo necesita esto. */
export interface ModuloSelector {
  getDocumentAsync: (opciones: { type: string[]; copyToCacheDirectory: boolean; multiple: boolean }) => Promise<{ canceled: boolean; assets?: { uri: string; name: string; size?: number; mimeType?: string }[] | null }>;
}

export const CLAVE_ACTUALIZA_LA_APP = 'filmmakerDocumentos.errUpdateApp';

/** Carga el módulo real. Cualquier fallo (paquete ausente, parte nativa ausente) se convierte en `null`. */
export const cargarModuloReal = (): ModuloSelector | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const m = require('expo-document-picker');
    return m && typeof m.getDocumentAsync === 'function' ? (m as ModuloSelector) : null;
  } catch {
    return null;
  }
};

/** El selector sobre un cargador inyectable (así se prueba la ausencia). El módulo se pide una sola vez. */
export const crearSelector = (cargar: () => ModuloSelector | null) => {
  let modulo: ModuloSelector | null | undefined;
  const obtener = (): ModuloSelector | null => {
    if (modulo === undefined) {
      try {
        modulo = cargar();
      } catch {
        modulo = null;
      }
    }
    return modulo;
  };
  return {
    disponible: (): boolean => obtener() !== null,
    elegir: async (): Promise<ResultadoDeSeleccion> => {
      const m = obtener();
      if (!m) return { estado: 'no_disponible' };
      try {
        const r = await m.getDocumentAsync({ type: [...TIPOS_DE_DOCUMENTO], copyToCacheDirectory: true, multiple: false });
        const a = r.canceled ? undefined : r.assets?.[0];
        if (!a) return { estado: 'cancelado' };
        return { estado: 'elegido', archivo: { uri: a.uri, name: a.name, size: a.size, mimeType: a.mimeType } };
      } catch {
        /* Falló al abrir el selector (p. ej. parte nativa a medias): se trata como no disponible, no se rompe la pantalla. */
        modulo = null;
        return { estado: 'no_disponible' };
      }
    },
  };
};

const selector = crearSelector(cargarModuloReal);
export const selectorDisponible = selector.disponible;
export const elegirDocumento = selector.elegir;
