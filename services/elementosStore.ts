import AsyncStorage from '@react-native-async-storage/async-storage';

/*
 * LOS ELEMENTOS PROPIOS, EN EL DISPOSITIVO (LOCAL, SIN SINCRONIZAR).
 *
 * Mis personajes, Mis escenarios, Mi ropa y los favoritos viven en `AsyncStorage`, en este aparato y nada más: no hay colección,
 * ni función, ni regla, ni sincronización, y las fotos no se suben a ningún sitio (son rutas locales). Si se borran los datos de la
 * app o se reinstala, se pierde, y la interfaz lo dice. Mismo patrón que `myWeesStore`: una clave por cuenta, versionada; leer nunca
 * lanza y escribir avisa de su fallo devolviendo `false`. Es solo para que la interfaz sea navegable; hacerlo real exige guardar en
 * `assets`/Content Core (ver «Pendiente de integración»).
 */
export type TipoDePropio = 'personaje' | 'escenario' | 'ropa';

export interface ElementoPropio {
  id: string;
  tipo: TipoDePropio;
  /** Texto de la persona: es contenido, no interfaz. */
  nombre: string;
  /** De 1 a 5 rutas locales de foto. */
  uris: string[];
  /** Solo personajes: persona, mascota u objeto. */
  clase?: 'persona' | 'mascota' | 'objeto';
  creado: number;
}

export interface EstadoDeElementos {
  v: 1;
  propios: ElementoPropio[];
  favoritos: string[];
}

export const ESTADO_VACIO: EstadoDeElementos = { v: 1, propios: [], favoritos: [] };

export const claveDeElementos = (cuenta: string | null | undefined): string | null => (cuenta ? `wee.elementos.v1.${cuenta}` : null);

/** No se fía de lo guardado: solo entra lo que tiene la forma esperada. */
export const leerElementos = (crudo: string | null): EstadoDeElementos => {
  if (!crudo) return ESTADO_VACIO;
  try {
    const j = JSON.parse(crudo);
    if (!j || j.v !== 1 || !Array.isArray(j.propios) || !Array.isArray(j.favoritos)) return ESTADO_VACIO;
    const propios = j.propios.filter(
      (p: any) => p && typeof p.id === 'string' && ['personaje', 'escenario', 'ropa'].includes(p.tipo) && typeof p.nombre === 'string' && Array.isArray(p.uris) && p.uris.every((u: unknown) => typeof u === 'string'),
    );
    return { v: 1, propios, favoritos: j.favoritos.filter((f: unknown) => typeof f === 'string') };
  } catch {
    return ESTADO_VACIO;
  }
};

export const elementosStore = {
  leer: async (cuenta: string | null | undefined): Promise<EstadoDeElementos> => {
    const clave = claveDeElementos(cuenta);
    if (!clave) return ESTADO_VACIO;
    try {
      return leerElementos(await AsyncStorage.getItem(clave));
    } catch (error) {
      console.warn('Elementos: no se pudieron leer:', error);
      return ESTADO_VACIO;
    }
  },
  guardar: async (cuenta: string | null | undefined, estado: EstadoDeElementos): Promise<boolean> => {
    const clave = claveDeElementos(cuenta);
    if (!clave) return false;
    try {
      await AsyncStorage.setItem(clave, JSON.stringify(estado));
      return true;
    } catch (error) {
      console.warn('Elementos: no se pudieron guardar:', error);
      return false;
    }
  },
};
