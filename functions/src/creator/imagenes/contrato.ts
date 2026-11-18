/**
 * IMÁGENES DE FILMMAKER (universo y storyboard) — CONTRATO DE DATOS.
 *
 * Sin dependencias: lo importan el servidor y las pruebas; el cliente tiene su espejo de tipos en
 * `services/filmmakerImagenesService.ts`. Ruta LEGACY (regla 10): no es una capacidad del Core Runtime.
 */
export const IMAGENES_VERSION = 1;

/** Qué se genera: la lámina del reparto, el retrato de un personaje/criatura/grupo, un lugar, un objeto, o el cuadro de un plano. */
export type ClaseDeElemento = 'lamina' | 'personaje' | 'lugar' | 'objeto' | 'cuadro';
export const CLASES: readonly ClaseDeElemento[] = ['lamina', 'personaje', 'lugar', 'objeto', 'cuadro'];

export type TipoDePersonaje = 'persona' | 'criatura' | 'grupo';
export const TIPOS_DE_PERSONAJE: readonly TipoDePersonaje[] = ['persona', 'criatura', 'grupo'];

/** Estado de cada elemento y cuadro. */
export type EstadoDeElemento = 'pendiente' | 'generando' | 'lista' | 'error' | 'cancelada';

/** De dónde sale la imagen de un elemento: la hizo Weë o la puso la persona (manda siempre). */
export type OrigenDeImagen = 'weë' | 'usuario';

/** Cómo llega la orden: el universo completo (lámina + retratos) o solo cuadros del storyboard. */
export type ModoDeLote = 'universo' | 'cuadros';
export const MODOS: readonly ModoDeLote[] = ['universo', 'cuadros'];

export type CalidadDeImagen = 'estandar' | 'alta';
export type FormatoDeImagen = '16:9' | '9:16' | '1:1';
export const FORMATOS_DE_IMAGEN: readonly FormatoDeImagen[] = ['16:9', '9:16', '1:1'];

/** Un elemento a generar (viene del dossier o del storyboard; todo lo que escribe la persona es DATO, nunca instrucción). */
export interface ElementoAGenerar {
  /** Id del personaje, lugar, objeto o cuadro (el del cliente; vuelve igual en el resultado). */
  id: string;
  clase: ClaseDeElemento;
  tipo?: TipoDePersonaje;
  nombre: string;
  descripcion: string;
  /** Imagen que subió la persona para ESTE elemento (ficha o cuadro): users/{uid}/creator-inputs. Manda sobre cualquier otra. */
  imagenUsuario?: string;
  /** Solo cuadros: cómo se ve el plano. */
  encuadre?: string;
  camara?: string;
  dialogo?: string;
  /** Solo cuadros: ids de los personajes que salen y del lugar (para ir a buscar sus retratos). */
  personajes?: string[];
  lugar?: string;
  /** Solo `universo`: ya tiene retrato (`retratos[id]`); no se vuelve a hacer, solo entra en la lámina. */
  conservar?: boolean;
  /** Con imagen de la persona: por defecto ESA imagen es el retrato tal cual; con `true` Weë la reinterpreta en el estilo elegido. */
  reinterpretar?: boolean;
}

/** Retratos del universo ya hechos (id → url). Son las REFERENCIAS de consistencia de los cuadros. */
export type RetratosDelUniverso = Record<string, string>;

export interface PeticionDeImagenes {
  modo: ModoDeLote;
  /** Estilo elegido por la persona (cómic, anime, gótico, plastilina…). Obligatorio: sin estilo no se genera. */
  estilo: string;
  tipo?: string;
  /** La UNA imagen de referencia del universo (flujo «Jay Reads»). Obligatoria en `universo`. */
  referencia?: string;
  /** Lo que la persona pidió del mundo/escena en sus palabras («un volcán atrás», «sin volcán»). Si falta, Weë lo interpreta. */
  mundo?: string;
  calidad?: CalidadDeImagen;
  formato?: FormatoDeImagen;
  /** `universo`: false = no hacer la lámina del reparto (por defecto se hace si hay dos o más personajes). */
  lamina?: boolean;
  /** Producción a la que pertenece (solo para enlazar los resultados en «Mis creaciones»). */
  proyectoId?: string;
  elementos: ElementoAGenerar[];
  /** Solo `cuadros`: los retratos y lugares del universo. */
  retratos?: RetratosDelUniverso;
}

/** Una pieza concreta que el lote produce. */
export interface TrabajoDeImagen {
  id: string;
  clase: ClaseDeElemento;
  /** Referencias fijas (ya conocidas al planear). */
  referencias: string[];
  /** Ids de elementos cuyo retrato, ya hecho, se añade como referencia al ejecutar (la lámina). Tope total: `referenciasPorImagen`. */
  retratosDe: string[];
  /** Si es la imagen de la persona o un retrato conservado, no se genera: se usa tal cual y no cuesta. */
  usaLaDeLaPersona: boolean;
  /** Solo con `usaLaDeLaPersona`: la imagen y de quién es. */
  urlYaHecha?: string;
  origenYaHecho?: OrigenDeImagen;
  /** Nombres de los personajes que salen (cuadros), para nombrarlos en el prompt. */
  nombres?: string[];
  /** Con ficha de la persona: la ficha es la primera referencia y manda. */
  conFicha?: boolean;
  /** Dónde va en el orden de ejecución: 0 retratos y cuadros, 1 la lámina (usa los retratos ya hechos). */
  fase: 0 | 1;
}

export interface ResultadoDeElemento {
  id: string;
  clase: ClaseDeElemento;
  estado: EstadoDeElemento;
  origen?: OrigenDeImagen;
  /** Solo en `lista`. */
  url?: string;
  /** Solo en `error`: motivo cerrado (el cliente lo traduce con `filmmakerImagenes.err.<motivo>`). */
  motivo?: MotivoDeImagen;
  credits: number;
}

/** Topes de entrada y de lote. Una sola tabla. */
export const LIMITES = Object.freeze({
  elementosPorLote: 24,
  referenciasPorImagen: 4,
  lienzoDeLaLamina: 3,
  nombre: 80,
  descripcion: 600,
  estilo: 80,
  tipo: 60,
  mundo: 500,
  encuadre: 160,
  camara: 160,
  dialogo: 240,
  idElemento: 80,
  personajesPorCuadro: 3,
  imagenesEnParalelo: 3,
  urlMaxima: 2000,
});

/** Motivos por los que una imagen no sale: la app los traduce con `filmmakerImagenes.err.<motivo>`. */
export type MotivoDeImagen =
  | 'bloqueada_por_seguridad'
  | 'sin_resultado'
  | 'proveedor_ocupado'
  | 'sin_tiempo'
  | 'referencia_no_valida';

export class ErrorDeImagenes extends Error {
  constructor(public readonly motivo: MotivoDeEntrada, mensaje: string) {
    super(mensaje);
    this.name = 'ErrorDeImagenes';
  }
}

/** Motivos por los que la PETICIÓN entera no vale (se rechaza antes de reservar nada). */
export type MotivoDeEntrada =
  | 'sin_estilo'
  | 'sin_referencia'
  | 'sin_elementos'
  | 'demasiados_elementos'
  | 'elemento_no_valido'
  | 'referencia_no_valida'
  | 'modo_desconocido'
  | 'sin_retratos';
