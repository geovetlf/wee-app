import { Asset, FORMA_DE_MIME, MAXIMO_DE_BYTES_DE_MATERIAL, materialEsDeLaCuenta } from '../content/asset';
import { Huella } from '../moderation';
import { MediaObject } from './objeto';
import { MetodoDeSubida } from './puerto';
import { RegistroDeProveedoresDeMedios } from './registro';

/**
 * WEE MEDIA — LA SUBIDA DIRECTA: PERMISO PARA ESCRIBIR EN UN SITIO CONCRETO.
 *
 * ── Qué decide esto ─────────────────────────────────────────────────────────
 *
 * Si una cuenta puede escribir AHORA los bytes de un material suyo, de qué
 * tamaño como mucho, de qué tipo y hasta cuándo. No firma nada, no habla con
 * ningún proveedor y no sabe qué es una URL.
 *
 *     Asset (F11)   →  QUÉ es y de quién es        ← Source of Truth
 *     esto          →  ¿puede escribir, y con qué límites?
 *     el adaptador  →  el permiso, que caduca
 *     MediaObject   →  DÓNDE quedaron los bytes    ← se anota al confirmar
 *
 * ── Por qué los bytes no pasan por Weë ──────────────────────────────────────
 *
 * Weë manda el plano de control; los bytes van del cliente al proveedor por su
 * cuenta. Una Function que hiciera de intermediaria de archivos de dos gigas
 * sería la pieza más cara y más frágil del sistema, y no aportaría nada: lo que
 * hay que controlar es QUIÉN escribe, DÓNDE y CUÁNTO, y eso se decide antes de
 * que salga un solo byte.
 *
 * Todo lo de este archivo es PURO: sin red, sin Firestore, sin reloj propio y
 * sin ningún proveedor concreto dentro.
 */

/* ── 1 · La política ───────────────────────────────────────────────────────── */

/**
 * CUÁNTO DURA UN PERMISO DE ESCRITURA, Y CUÁNTO CABE.
 *
 * Más largo que el de una entrega, y por una razón concreta: leer algo es
 * inmediato y escribir dos gigas por una conexión mala no lo es. Pero sigue
 * siendo corto, porque un permiso de subida es una capacidad de ESCRITURA, y
 * esas se dan por el tiempo justo.
 *
 * El tamaño NO inventa ninguna constante: sale del tope de material de la Fase
 * 11 y del que publique el proveedor, y manda el más pequeño de los dos.
 */
export interface PoliticaDeSubida {
  minSegundos: number;
  porDefectoSegundos: number;
  maxSegundos: number;
  /** El tope de Weë para un material. El del proveedor se cruza aparte. */
  maxBytes: number;
}

export const POLITICA_DE_SUBIDA: PoliticaDeSubida = Object.freeze({
  minSegundos: 60,
  porDefectoSegundos: 900,
  maxSegundos: 3_600,
  maxBytes: MAXIMO_DE_BYTES_DE_MATERIAL,
});

/** La vigencia aprobada, o `undefined` si lo pedido no cabe. Se rechaza, no se recorta. */
export const vigenciaDeSubidaAprobada = (
  pedida: unknown,
  politica: PoliticaDeSubida = POLITICA_DE_SUBIDA,
): number | undefined => {
  if (pedida === undefined || pedida === null) return politica.porDefectoSegundos;
  if (typeof pedida !== 'number' || !Number.isInteger(pedida)) return undefined;
  return pedida >= politica.minSegundos && pedida <= politica.maxSegundos ? pedida : undefined;
};

/**
 * EL TAMAÑO MÁXIMO QUE SE CONCEDE. El menor de los dos topes que ya existen.
 *
 * Ni un límite nuevo ni dos límites que se contradigan: si el proveedor admite
 * cinco gigas de una vez y Weë admite dos por material, se conceden dos.
 */
export const topeDeSubida = (
  politica: PoliticaDeSubida = POLITICA_DE_SUBIDA,
  topeDelProveedor?: number,
): number =>
  Number.isSafeInteger(topeDelProveedor) && (topeDelProveedor as number) > 0
    ? Math.min(politica.maxBytes, topeDelProveedor as number)
    : politica.maxBytes;

/** ¿Cabe lo que dice que va a subir? Entero, positivo y dentro del tope. */
export const tamanoAprobado = (bytes: unknown, tope: number): number | undefined =>
  typeof bytes === 'number' && Number.isSafeInteger(bytes) && bytes > 0 && bytes <= tope ? bytes : undefined;

/**
 * ¿TIENE FORMA DE TIPO DE CONTENIDO?
 *
 * **Esto no dice que los bytes sean lo que dice el tipo, y no lo pretende.**
 * `image/png` aquí significa «lo que se ha declarado», no «esto es un PNG»:
 * mirar dentro de los bytes es de una capa de seguridad posterior, y fingirlo
 * ahora sería peor que no hacerlo. Lo que sí consigue declararlo es que el
 * proveedor lo EXIJA —va dentro de la firma—, así que quien suba otra cosa con
 * otro tipo se lleva un rechazo del propio proveedor.
 */
export const tipoDeContenidoAceptable = (contentType: unknown): contentType is string =>
  typeof contentType === 'string' && contentType.length <= 128 && FORMA_DE_MIME.test(contentType);

/* ── 2 · Por qué no ────────────────────────────────────────────────────────── */

/**
 * LO QUE SE LE DICE A QUIEN PIDE. La misma regla que en la entrega.
 *
 * `no_disponible` es la MISMA respuesta para «no existe», «no es tuyo» y «no
 * hay proveedor», para que pedir subidas no sirva para averiguar qué materiales
 * tiene otra persona. `peticion_invalida` sí se puede decir: habla del tamaño,
 * del tipo o de la vigencia que mandó quien llama, no de un recurso ajeno.
 */
export type MotivoDeSubida = 'no_disponible' | 'peticion_invalida';

export type DetalleDeSubida =
  | 'vigencia'
  | 'tamano'
  | 'tipo'
  | 'sin_material'
  | 'no_es_tuyo'
  | 'material_no_admite_bytes'
  | 'ficha_ya_existe'
  | 'sin_proveedor'
  | 'sin_capacidad';

export type DecisionDeSubida =
  | { permitida: true; vigenciaSegundos: number; maxBytes: number; contentType: string; providerId: string }
  | { permitida: false; motivo: MotivoDeSubida; detalle: DetalleDeSubida };

/**
 * LOS ESTADOS DE MATERIAL QUE ADMITEN BYTES NUEVOS.
 *
 * Solo `uploading`. Un material `ready` ya tiene los suyos y no se sobrescribe
 * desde aquí —reemplazar es otra operación y otra fase—; `processing`,
 * `failed` y `deleted` tampoco. Es lo mismo que dice el contrato de la Fase 11
 * al permitir `uploading → ready` y nada que vuelva atrás.
 */
export const ESTADOS_QUE_ADMITEN_SUBIDA: readonly Asset['status'][] = Object.freeze(['uploading'] as const);

/* ── 3 · La decisión ───────────────────────────────────────────────────────── */

export interface PeticionDeDecisionDeSubida {
  /** La cuenta YA resuelta en el servidor. Nunca lo que mande un cliente. */
  accountId: string;
  /** El material ya leído. Un `assetId` de fuera no prueba nada. */
  material: Asset | undefined;
  /** La ficha del objeto, si ya existiera. Que exista significa que los bytes ya están. */
  objeto: MediaObject | undefined;
  registro: RegistroDeProveedoresDeMedios;
  providerId: string | undefined;
  contentType: unknown;
  bytes: unknown;
  vigenciaSegundos?: number;
  politica?: PoliticaDeSubida;
  /** Lo que el proveedor publique como máximo de una subida simple. */
  topeDelProveedor?: number;
}

/**
 * ¿PUEDE ESTA CUENTA ESCRIBIR LOS BYTES DE ESTE MATERIAL?
 *
 * Estructural, sobre datos ya leídos. El orden lo dicta la seguridad: primero
 * lo que se puede contestar sin hablar del material —vigencia, tamaño, tipo—, y
 * a partir de ahí todo lo que falla contesta lo mismo.
 */
export const decidirSubida = (p: PeticionDeDecisionDeSubida): DecisionDeSubida => {
  const politica = p.politica ?? POLITICA_DE_SUBIDA;

  const vigencia = vigenciaDeSubidaAprobada(p.vigenciaSegundos, politica);
  if (vigencia === undefined) return { permitida: false, motivo: 'peticion_invalida', detalle: 'vigencia' };
  if (!tipoDeContenidoAceptable(p.contentType)) return { permitida: false, motivo: 'peticion_invalida', detalle: 'tipo' };
  const tope = topeDeSubida(politica, p.topeDelProveedor);
  const tamano = tamanoAprobado(p.bytes, tope);
  if (tamano === undefined) return { permitida: false, motivo: 'peticion_invalida', detalle: 'tamano' };

  const no = (detalle: DetalleDeSubida): DecisionDeSubida => ({ permitida: false, motivo: 'no_disponible', detalle });

  if (typeof p.accountId !== 'string' || !p.accountId) return no('no_es_tuyo');
  if (!p.material) return no('sin_material');
  if (!materialEsDeLaCuenta(p.material, p.accountId)) return no('no_es_tuyo');
  if (!ESTADOS_QUE_ADMITEN_SUBIDA.includes(p.material.status)) return no('material_no_admite_bytes');

  /*
   * Si ya hay ficha de objeto, los bytes YA están: se registró al confirmar una
   * subida anterior. No se concede permiso para pisarlos. Quien repita la misma
   * intención recibirá esto, y no un segundo objeto.
   */
  if (p.objeto && p.objeto.estado === 'guardado') return no('ficha_ya_existe');

  if (typeof p.providerId !== 'string' || !p.providerId) return no('sin_proveedor');
  /*
   * La capacidad se pregunta EXACTA. Guardar desde el servidor y conceder un
   * permiso de escritura a un tercero no son la misma operación, y un proveedor
   * puede saber hacer la primera y no la segunda.
   */
  if (!p.registro.puede(p.providerId, 'object.upload')) {
    return no(p.registro.buscar(p.providerId) ? 'sin_capacidad' : 'sin_proveedor');
  }

  return { permitida: true, vigenciaSegundos: vigencia, maxBytes: tamano, contentType: p.contentType, providerId: p.providerId };
};

/* ── 4 · La intención, y su identidad ──────────────────────────────────────── */

/**
 * LO QUE SE LE DA AL CLIENTE PARA QUE SUBA. Y nada más que eso.
 *
 * Lleva a dónde mandar los bytes, cómo, qué cabeceras son obligatorias y hasta
 * cuándo vale. **No lleva** credenciales, ni clave de acceso, ni secreto, ni el
 * nombre del contenedor, ni la clave del objeto, ni el identificador del
 * proveedor: nada de eso es asunto de quien sube, y no saberlo es justo lo que
 * permite mudar los bytes mañana sin que nadie se entere.
 */
export interface UploadIntent {
  /** La identidad de la intención. Derivada, estable y de Weë. */
  intentId: string;
  /** El material de la Fase 11 que va a quedar completo. SÍ es identidad de Weë. */
  assetId: string;
  url: string;
  /** Lo que dijo el proveedor que hay que usar. Weë no lo impone. */
  metodo: MetodoDeSubida;
  /** Lo que hay que mandar tal cual: va dentro de la firma, y cambiarlo la invalida. */
  cabeceras: Readonly<Record<string, string>>;
  maxBytes: number;
  expiraEn: number;
  vigenciaSegundos: number;
}

export const FORMA_DE_INTENTO = /^sub_[0-9a-f]{16}$/;

/**
 * LA IDENTIDAD DE LA INTENCIÓN, DERIVADA DE SU DESTINO.
 *
 * No es una identidad nueva: es una PROYECCIÓN de la del objeto, que ya se
 * deriva de dónde van a estar los bytes. Eso importa porque impide que aparezca
 * una segunda estrategia de identidad incompatible con la de MC-1 — repetir la
 * misma intención da el mismo destino, y por tanto el mismo `intentId`.
 *
 * La fuente canónica sigue siendo, y solo es, la identidad del objeto.
 */
export const identidadDeIntento = (huella: Huella, objectRef: string): string | undefined => {
  if (typeof objectRef !== 'string' || !objectRef) return undefined;
  const hex = huella(`intent|${objectRef}`);
  if (typeof hex !== 'string' || !/^[0-9a-f]{16,}$/.test(hex)) return undefined;
  return `sub_${hex.slice(0, 16)}`;
};
