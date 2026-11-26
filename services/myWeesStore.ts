import AsyncStorage from '@react-native-async-storage/async-storage';
import { AccesoDeMyWees, PerfilDeMyWees, claveDeMyWees, escribirMyWees, leerMyWees } from '../utils/myWees';

/*
 * MYWEËS, EN EL DISPOSITIVO.
 *
 * La organización de MyWeës se guarda en `AsyncStorage`, en este aparato y nada
 * más: no hay colección, ni función, ni regla, ni sincronización. Si se borran
 * los datos de la app o se reinstala, se pierde, y la pantalla lo avisa.
 *
 * Una clave por cuenta y por perfil (`claveDeMyWees`). Este archivo solo lee y
 * escribe esa clave; qué es válido lo decide `utils/myWees.ts`, que es quien no
 * se fía de lo guardado.
 *
 * Leer nunca lanza: si el almacenamiento falla o lo guardado no se entiende,
 * devuelve la lista vacía. Escribir sí avisa de su fallo —devolviendo `false`—
 * para que la pantalla pueda decir que no se guardó en vez de callarlo.
 */
export const myWeesStore = {
  leer: async (cuenta: string | null | undefined, perfil: PerfilDeMyWees): Promise<AccesoDeMyWees[]> => {
    const clave = claveDeMyWees(cuenta, perfil);
    if (!clave) return [];
    try {
      return leerMyWees(await AsyncStorage.getItem(clave));
    } catch (error) {
      console.warn('MyWeës: no se pudo leer la organización guardada:', error);
      return [];
    }
  },

  guardar: async (cuenta: string | null | undefined, perfil: PerfilDeMyWees, accesos: readonly AccesoDeMyWees[]): Promise<boolean> => {
    const clave = claveDeMyWees(cuenta, perfil);
    if (!clave) return false;
    try {
      /* Vacío se guarda como lista vacía, no se borra la clave: así «restaurado» y «nunca usado» se leen igual y sin casos aparte. */
      await AsyncStorage.setItem(clave, escribirMyWees(accesos));
      return true;
    } catch (error) {
      console.warn('MyWeës: no se pudo guardar la organización:', error);
      return false;
    }
  },
};
