import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import { motivoDeNoDisponible } from '../utils/noDisponible';

/**
 * Imágenes del universo y del storyboard (Weë Filmmaker): cotiza, genera por lotes, lee el estado por elemento y cancela. El
 * servidor decide todo lo demás (modelo, proveedor, prompts); aquí no hay nada de eso. Las fotos de la persona se suben antes
 * con `uploadCreatorImage` (services/creatorUploads.ts → users/{uid}/creator-inputs) y aquí solo viajan sus direcciones.
 *
 * Los tipos son el ESPEJO de `functions/src/creator/imagenes/contrato.ts` (el cliente no importa del servidor). Todo lo que
 * falla sale como `ErrorDeImagenesCliente` con una CLAVE de i18n (`filmmakerImagenes.err*`), nunca una frase.
 */
export type ClaseDeElemento = 'lamina' | 'personaje' | 'lugar' | 'objeto' | 'cuadro';
export type TipoDePersonaje = 'persona' | 'criatura' | 'grupo';
export type EstadoDeElemento = 'pendiente' | 'generando' | 'lista' | 'error' | 'cancelada';
export type OrigenDeImagen = 'weë' | 'usuario';
export type ModoDeLote = 'universo' | 'cuadros';
export type CalidadDeImagen = 'estandar' | 'alta';
export type FormatoDeImagen = '16:9' | '9:16' | '1:1';
export type MotivoDeImagen = 'bloqueada_por_seguridad' | 'sin_resultado' | 'proveedor_ocupado' | 'sin_tiempo' | 'referencia_no_valida';

export interface ElementoAGenerar {
  /** Id del personaje, lugar, objeto o cuadro: vuelve igual en el resultado. */
  id: string;
  clase: Exclude<ClaseDeElemento, 'lamina'>;
  tipo?: TipoDePersonaje;
  nombre: string;
  descripcion: string;
  /** Imagen que subió la persona para ESTE elemento (ficha o cuadro). Por defecto se usa tal cual, sin coste. */
  imagenUsuario?: string;
  encuadre?: string;
  camara?: string;
  dialogo?: string;
  /** Solo cuadros: ids de los personajes que salen y del lugar (de ahí salen las referencias de consistencia). */
  personajes?: string[];
  lugar?: string;
  /** Solo universo: ya tiene retrato en `retratos[id]`; no se rehace, solo entra en la lámina. */
  conservar?: boolean;
  /** Con imagen de la persona: Weë la reinterpreta en el estilo elegido en vez de usarla tal cual. */
  reinterpretar?: boolean;
}

export interface PeticionDeImagenes {
  modo: ModoDeLote;
  /** Obligatorio: el estilo que la persona eligió (cómic, anime, gótico, plastilina…). */
  estilo: string;
  tipo?: string;
  /** La UNA imagen de referencia del universo (o la ficha de al menos un personaje). */
  referencia?: string;
  /** Lo que la persona pidió del mundo en sus palabras («un volcán atrás», «sin volcán»). Si falta, Weë lo interpreta. */
  mundo?: string;
  calidad?: CalidadDeImagen;
  formato?: FormatoDeImagen;
  /** Universo: false = sin lámina del reparto. */
  lamina?: boolean;
  proyectoId?: string;
  elementos: ElementoAGenerar[];
  /** Retratos ya hechos (id → url): las referencias de consistencia de los cuadros. */
  retratos?: Record<string, string>;
}

export interface ResultadoDeElemento {
  id: string;
  clase: ClaseDeElemento;
  estado: EstadoDeElemento;
  origen?: OrigenDeImagen;
  url?: string;
  motivo?: MotivoDeImagen;
  credits: number;
}

export interface CotizacionDeImagenes { credits: number; imagenes: number; usanLasDeLaPersona: number; porElemento: Record<string, number> }
export interface ResultadoDelLote { items: ResultadoDeElemento[]; credits: number; cancelado: boolean }
export type EstadoDelLote = ResultadoDelLote & { terminado: boolean };

export const MAX_ELEMENTOS_POR_LOTE = 24;

export class ErrorDeImagenesCliente extends Error {
  constructor(public readonly clave: string, public readonly datos?: { credits?: number }) {
    super(clave);
    this.name = 'ErrorDeImagenesCliente';
  }
}

const CLAVE_POR_MOTIVO: Readonly<Record<string, string>> = Object.freeze({
  sin_estilo: 'filmmakerImagenes.errNoStyle',
  sin_referencia: 'filmmakerImagenes.errNoReference',
  sin_elementos: 'filmmakerImagenes.errNoItems',
  demasiados_elementos: 'filmmakerImagenes.errTooMany',
  elemento_no_valido: 'filmmakerImagenes.errInvalidItem',
  referencia_no_valida: 'filmmakerImagenes.errBadReference',
  sin_retratos: 'filmmakerImagenes.errNoPortraits',
  modo_desconocido: 'filmmakerImagenes.errUnknownMode',
  price_changed: 'filmmakerImagenes.errPriceChanged',
});

/** El motivo por el que UNA imagen no salió → su clave de i18n. */
export const claveDeMotivoDeImagen = (motivo: MotivoDeImagen | undefined): string => {
  switch (motivo) {
    case 'bloqueada_por_seguridad': return 'filmmakerImagenes.errBlocked';
    case 'sin_resultado': return 'filmmakerImagenes.errNoResult';
    case 'proveedor_ocupado': return 'filmmakerImagenes.errProviderBusy';
    case 'sin_tiempo': return 'filmmakerImagenes.errNoTime';
    case 'referencia_no_valida': return 'filmmakerImagenes.errBadReference';
    default: return 'filmmakerImagenes.errGeneric';
  }
};

const detallesDe = (error: unknown): { reason?: string; credits?: number } => {
  const e = (error ?? {}) as { details?: { reason?: unknown; credits?: unknown }; customData?: { details?: { reason?: unknown; credits?: unknown } } };
  const d = e.details || e.customData?.details || {};
  return { reason: typeof d.reason === 'string' ? d.reason : undefined, credits: typeof d.credits === 'number' ? d.credits : undefined };
};

/** Cualquier error del servidor → una clave de i18n. */
export const claveDeErrorDeImagenes = (error: unknown): string => {
  if (error instanceof ErrorDeImagenesCliente) return error.clave;
  const { reason } = detallesDe(error);
  if (reason && CLAVE_POR_MOTIVO[reason]) return CLAVE_POR_MOTIVO[reason];
  if (motivoDeNoDisponible(error)) return 'filmmakerImagenes.errClosed';
  const e = error as { code?: unknown; message?: unknown } | null;
  const texto = `${e?.code ?? ''} ${e?.message ?? ''}`;
  if (/INSUFFICIENT/i.test(texto)) return 'filmmakerImagenes.errCredits';
  if (/DUPLICATE|already-exists/i.test(texto)) return 'filmmakerImagenes.errBusy';
  return 'filmmakerImagenes.errGeneric';
};

interface Llamada {
  op: 'cotizar' | 'generar' | 'estado' | 'cancelar';
  peticion?: PeticionDeImagenes;
  requestId?: string;
  creditosCotizados?: number;
}

const llamar = async <T,>(datos: Llamada): Promise<T> => {
  if (!functions) throw new ErrorDeImagenesCliente('filmmakerImagenes.errGeneric');
  try {
    const r = await httpsCallable(functions, 'generarImagenesFilmmaker', { timeout: 540_000 })(datos);
    return r.data as T;
  } catch (error) {
    throw new ErrorDeImagenesCliente(claveDeErrorDeImagenes(error), { credits: detallesDe(error).credits });
  }
};

/** Cuánto cuesta el lote («≈ N Credits»). No reserva nada. */
export const cotizarImagenes = async (peticion: PeticionDeImagenes): Promise<CotizacionDeImagenes> => {
  const r = await llamar<{ status: 'QUOTED' } & CotizacionDeImagenes>({ op: 'cotizar', peticion });
  return { credits: r.credits, imagenes: r.imagenes, usanLasDeLaPersona: r.usanLasDeLaPersona, porElemento: r.porElemento };
};

/** Genera el lote. `requestId` es la operación: repetirla no cobra dos veces y devuelve el lote ya hecho. */
export const generarImagenes = async (v: { peticion: PeticionDeImagenes; requestId: string; creditosCotizados: number }): Promise<ResultadoDelLote> => {
  const r = await llamar<{ items: ResultadoDeElemento[]; credits: number; cancelado: boolean }>({ op: 'generar', ...v });
  return { items: r.items, credits: r.credits, cancelado: r.cancelado };
};

/** El estado vivo por elemento de un lote (mientras corre, o si la app perdió la respuesta). */
export const estadoDeImagenes = async (requestId: string): Promise<EstadoDelLote> => {
  const r = await llamar<{ status: 'DONE' | 'RUNNING'; items: ResultadoDeElemento[]; credits: number; cancelado: boolean }>({ op: 'estado', requestId });
  return { items: r.items ?? [], credits: r.credits ?? 0, cancelado: r.cancelado === true, terminado: r.status === 'DONE' };
};

/** No arranca más imágenes: lo entregado se cobra y el resto vuelve a la cuenta. */
export const cancelarImagenes = (requestId: string): Promise<unknown> => llamar({ op: 'cancelar', requestId });
