/**
 * LOS MODELOS QUE ENSEÑA EL SELECTOR (decisión del dueño, 2026-11-15; antes el usuario nunca los veía).
 *
 * SOLO INTERFAZ. La elección es un estado local de la pantalla: no viaja al servidor ni cambia nada, y el router del
 * engine (`functions/src/engine`) sigue decidiendo. Por eso el selector lo dice («Por ahora es solo una preferencia»).
 *
 * HONESTIDAD: solo son seleccionables (`integrado: true`) los modelos que el engine ya tiene registrados —leídos de
 * `functions/src/engine/providers/seedance.ts` (`SEEDANCE_MODEL_IDS`: la familia Seedance 2.5 / 2.0 / 2.0 Fast / 2.0 Mini de
 * ByteDance por ModelArk, la única de video) y de `providers/gemini.ts` (Nano Banana 2 = `IMAGE_MODEL`, Nano Banana Pro =
 * `IMAGE_MODEL_PRO`)—. Los demás van deshabilitados y con «Próximamente»: hoy solo FLUX, que está en el registro pero
 * desactivado por defecto y sin ningún modelo elegible (cada uno espera su revisión legal). Ninguna marca competidora.
 *
 * Los nombres son identificadores de producto de terceros: NO se traducen. No hay precios por modelo: el catálogo actual no
 * da uno por modelo, y no se inventa.
 */
export type TipoDeModelo = 'video' | 'imagen';

export interface ModeloWeeAi {
  id: string;
  nombre: string;
  tipo: TipoDeModelo;
  /** Integrado en el engine hoy. Si no, se enseña deshabilitado con «Próximamente». */
  integrado: boolean;
}

/** «Automático» = Weë Brain elige. Es el valor por defecto y el recomendado. */
export const MODELO_AUTOMATICO = 'auto';

export const MODELOS_WEEAI: ModeloWeeAi[] = [
  { id: 'seedance-2-5', nombre: 'Seedance 2.5', tipo: 'video', integrado: true },
  { id: 'seedance-2-0', nombre: 'Seedance 2.0', tipo: 'video', integrado: true },
  { id: 'seedance-2-0-fast', nombre: 'Seedance 2.0 Fast', tipo: 'video', integrado: true },
  { id: 'seedance-2-0-mini', nombre: 'Seedance 2.0 Mini', tipo: 'video', integrado: true },
  { id: 'nano-banana-2', nombre: 'Nano Banana 2', tipo: 'imagen', integrado: true },
  { id: 'nano-banana-pro', nombre: 'Nano Banana Pro', tipo: 'imagen', integrado: true },
  { id: 'flux', nombre: 'FLUX', tipo: 'imagen', integrado: false },
];
