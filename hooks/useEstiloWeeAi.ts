import { PALETA_WEEAI, PaletaWeeAi } from '../constants/estiloWeeAi';

/**
 * La paleta monocroma de WeëAI. SIEMPRE OSCURA y la misma con el Perfil Real y con el Perfil Weë (decisión del dueño,
 * 2026-11-15): WeëAI, su wallet y Mis proyectos son de la CUENTA, no del perfil. Por eso no lee el tema ni el perfil activo.
 */
export const useEstiloWeeAi = (): PaletaWeeAi => PALETA_WEEAI;
