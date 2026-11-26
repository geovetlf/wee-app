/**
 * LA LÓGICA PURA DE «PERSONALIZAR VOZ Y SONIDOS» (Filmmaker, 2026-11-17). Sin React, sin red y sin texto de interfaz: se prueba en Node.
 *
 * Una voz es un TONO con un nombre de catálogo, nunca un proveedor ni un modelo. Herencia: cada personaje tiene una voz por defecto
 * (`'auto'` = Weë elige), cada escena la hereda y cada cuadro hereda la de su escena; `null` en una escena o un cuadro significa «hereda».
 */

export type TonoDeVoz = 'warm' | 'deep' | 'clear' | 'soft' | 'narrator';
export const TONOS_DE_VOZ: readonly TonoDeVoz[] = ['warm', 'deep', 'clear', 'soft', 'narrator'];
export type IdiomaDeVoz = 'es' | 'en' | 'pt' | 'fr';
export const IDIOMAS_DE_VOZ: readonly IdiomaDeVoz[] = ['es', 'en', 'pt', 'fr'];

/** Dónde se está eligiendo la voz: el personaje (su voz por defecto), la escena o el cuadro (heredan y pueden cambiar). */
export type ContextoDeVoz = 'character' | 'scene' | 'shot';
/** De dónde viene la voz que se hereda. */
export type OrigenDeVoz = 'character' | 'scene' | 'auto';

/** Valor de «Weë elige la voz»: es el valor por defecto de un personaje y la primera opción de la lista. */
export const VOZ_AUTO = 'auto';

export interface VozDelCatalogo {
  readonly id: string;
  /** Nombre propio de la voz (dato de catálogo; no se traduce). */
  readonly nombre: string;
  readonly tono: TonoDeVoz;
  readonly idioma: IdiomaDeVoz;
  /** `true` mientras la voz no salga del catálogo real del servidor: se rotula «Ejemplo» en pantalla. */
  readonly ejemplo: boolean;
}

export interface FiltroDeVoces {
  readonly idioma: IdiomaDeVoz | null;
  readonly tono: TonoDeVoz | null;
}
export const SIN_FILTRO: FiltroDeVoces = { idioma: null, tono: null };

export const filtrarVoces = (voces: readonly VozDelCatalogo[], filtro: FiltroDeVoces): VozDelCatalogo[] =>
  voces.filter((v) => (!filtro.idioma || v.idioma === filtro.idioma) && (!filtro.tono || v.tono === filtro.tono));

export const vozPorId = (voces: readonly VozDelCatalogo[], id: string | null | undefined): VozDelCatalogo | null =>
  (id && id !== VOZ_AUTO ? voces.find((v) => v.id === id) : null) ?? null;

export interface CadenaDeVoz {
  /** Voz propia del personaje (su valor por defecto). */
  readonly personaje?: string | null;
  /** Voz propia de la escena (`null`/ausente = hereda). */
  readonly escena?: string | null;
  /** Voz propia del cuadro (`null`/ausente = hereda). */
  readonly cuadro?: string | null;
}
export interface VozResuelta {
  readonly id: string;
  /** Quién la fija: el cuadro, la escena, el personaje o nadie (Weë elige). */
  readonly origen: 'shot' | 'scene' | 'character' | 'auto';
}

/** La voz que suena de verdad: la más específica que alguien fijó; si nadie la fijó, `'auto'`. Un id vacío cuenta como «no fijada». */
export const resolverVoz = (c: CadenaDeVoz): VozResuelta => {
  if (c.cuadro) return { id: c.cuadro, origen: 'shot' };
  if (c.escena) return { id: c.escena, origen: 'scene' };
  if (c.personaje) return { id: c.personaje, origen: c.personaje === VOZ_AUTO ? 'auto' : 'character' };
  return { id: VOZ_AUTO, origen: 'auto' };
};

/** Lo que hereda un nivel: la resolución de los de arriba. El cuadro hereda de escena+personaje; la escena, del personaje; el personaje, de nadie. */
export const herenciaDe = (contexto: ContextoDeVoz, c: CadenaDeVoz): { id: string; origen: OrigenDeVoz } | null => {
  if (contexto === 'character') return null;
  const arriba = contexto === 'shot' ? resolverVoz({ personaje: c.personaje, escena: c.escena }) : resolverVoz({ personaje: c.personaje });
  return { id: arriba.id, origen: arriba.origen === 'shot' ? 'scene' : arriba.origen };
};

/** Las tres capas de sonido de un plano: voz, música y efectos son capas separadas. Hoy solo la voz está disponible. */
export type CapaDeSonido = 'voice' | 'music' | 'effects';
export const CAPAS_DE_SONIDO: readonly CapaDeSonido[] = ['voice', 'music', 'effects'];
