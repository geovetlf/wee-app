import { useMemo } from 'react';
import { WeeExperience } from '../constants/weeExperiences';
import { getSpecialist, SpecialistConfig, traducirEspecialista } from '../constants/specialists';
import { useT } from '../contexts/IdiomaContext';

/** Lo que devuelve `getSpecialist`: la configuración más su experiencia. */
export type EspecialistaTraducido = SpecialistConfig & { experience: WeeExperience };

/**
 * El especialista, en el idioma de quien lo está mirando.
 *
 * `constants/specialists.ts` guarda claves; esto es lo que las convierte en
 * palabras. Se hace aquí y no en la pantalla porque el catálogo es grande
 * —quinientas y pico cadenas— y no tiene sentido recorrerlo entero en cada
 * pintado: `useMemo` lo rehace solo cuando cambia el especialista o el idioma,
 * que son las dos únicas cosas que pueden cambiar el resultado.
 *
 * Devuelve `null` igual que `getSpecialist` cuando el identificador no existe,
 * para que quien lo use no tenga que distinguir dos casos.
 */
export function useEspecialista(id: string | undefined): EspecialistaTraducido | null {
  const t = useT();
  return useMemo(() => {
    const spec = getSpecialist(id || '');
    return spec ? traducirEspecialista(spec, t) : null;
  }, [id, t]);
}
