import { Asset, materialEsDeLaCuenta } from '../content/asset';
import { MediaObject, objetoEsDeLaCuenta } from './objeto';
import { RegistroDeProveedoresDeMedios } from './registro';

/**
 * WEE MEDIA — LA ENTREGA: PERMISO AHORA, NO PROPIEDAD.
 *
 * ── Qué decide esto, y qué no ───────────────────────────────────────────────
 *
 * Decide si una cuenta puede recibir AHORA una llave temporal para los bytes de
 * un material suyo, y por cuánto tiempo. No firma nada, no habla con ningún
 * proveedor y no sabe qué es una URL: eso es del adaptador.
 *
 *     Asset (F11)   →  QUÉ es y de quién es        ← Source of Truth
 *     MediaObject   →  DÓNDE están sus bytes
 *     esto          →  ¿puede esta cuenta, y hasta cuándo?
 *     el adaptador  →  la llave, que caduca
 *
 * ── Lo que una URL firmada NO es ────────────────────────────────────────────
 *
 * No es el identificador del material, ni el del objeto, ni una referencia de
 * almacén, ni prueba de propiedad. Es una credencial temporal, y cuando caduca
 * **el material sigue existiendo**. Por eso no se guarda en ningún sitio: si se
 * guardara, al día siguiente sería una mentira con forma de dato.
 *
 * Todo lo de este archivo es PURO: sin red, sin Firestore, sin reloj propio y
 * sin ningún proveedor concreto dentro.
 */

/* ── 1 · Cuánto dura una llave ─────────────────────────────────────────────── */

/**
 * LA POLÍTICA DE VIGENCIA. Del servidor, no de quien pide.
 *
 * El proveedor admite hasta siete días, y ese número está aquí escrito para
 * dejar constancia de que el tope de Weë es MUCHO más corto a propósito: una
 * llave de entrega existe para ver o descargar algo ahora, no para repartirla.
 * Cuanto más dura, más se parece a una publicación que nadie decidió hacer.
 *
 * Y se RECHAZA lo que no cabe, en vez de recortarlo en silencio: quien pide una
 * semana tiene que enterarse de que no la tiene, no creerse que sí.
 */
export interface PoliticaDeEntrega {
  minSegundos: number;
  porDefectoSegundos: number;
  maxSegundos: number;
  /** Lo que el PROVEEDOR permite como máximo absoluto. Documentado, no supuesto. */
  topeDelProveedorSegundos: number;
}

export const POLITICA_DE_ENTREGA: PoliticaDeEntrega = Object.freeze({
  minSegundos: 60,
  porDefectoSegundos: 300,
  maxSegundos: 3_600,
  /* Cloudflare R2, documentación oficial: de 1 segundo a 7 días. */
  topeDelProveedorSegundos: 604_800,
});

/**
 * LA VIGENCIA APROBADA. `undefined` si lo pedido no cabe en la política.
 *
 * Sin pedir nada, la de por defecto. Nunca por encima del máximo de Weë, y
 * nunca —por construcción— por encima de lo que el proveedor acepta.
 */
export const vigenciaAprobada = (
  pedida: unknown,
  politica: PoliticaDeEntrega = POLITICA_DE_ENTREGA,
): number | undefined => {
  if (pedida === undefined || pedida === null) return politica.porDefectoSegundos;
  if (typeof pedida !== 'number' || !Number.isInteger(pedida)) return undefined;
  if (pedida < politica.minSegundos || pedida > politica.maxSegundos) return undefined;
  return pedida > politica.topeDelProveedorSegundos ? undefined : pedida;
};

/* ── 2 · Por qué no ────────────────────────────────────────────────────────── */

/**
 * LO QUE SE LE DICE A QUIEN PIDE. Dos respuestas, y solo dos.
 *
 * `no_disponible` es deliberadamente la MISMA para «no existe», «no es tuyo» y
 * «está borrado»: contestar cada caso por separado convierte el endpoint en un
 * buscador de materiales ajenos —se prueban identificadores y se distingue el
 * «no existe» del «no es tuyo»—. La diferencia sí se registra por dentro, que
 * es donde hace falta para arreglar cosas.
 *
 * `vigencia_invalida` sí se puede decir, porque no habla del material: habla de
 * la petición, y quien la hizo ya sabe qué pidió.
 */
export type MotivoDeEntrega = 'no_disponible' | 'vigencia_invalida';

/** El detalle que se queda DENTRO: para el registro del servidor, nunca para la respuesta. */
export type DetalleDeEntrega =
  | 'vigencia'
  | 'sin_material'
  | 'no_es_tuyo'
  | 'material_sin_objeto'
  | 'material_no_entregable'
  | 'sin_ficha'
  | 'ficha_borrada'
  | 'ficha_de_otro_material'
  | 'ficha_de_otra_cuenta'
  | 'proveedor_no_coincide'
  | 'proveedor_desconocido'
  | 'sin_capacidad';

export type DecisionDeEntrega =
  | { permitida: true; vigenciaSegundos: number; objeto: MediaObject; providerId: string }
  | { permitida: false; motivo: MotivoDeEntrega; detalle: DetalleDeEntrega };

/**
 * LOS ESTADOS DE MATERIAL DE LOS QUE SE PUEDE ENTREGAR ALGO.
 *
 * `ready` y `processing`, y no es una licencia: según el contrato de la Fase 11,
 * `processing` significa que el objeto original YA está y lo que se está
 * haciendo son sus derivados. `uploading` todavía no tiene objeto completo,
 * `failed` nunca lo tuvo y `deleted` ya no lo tiene.
 */
export const ESTADOS_ENTREGABLES: readonly Asset['status'][] = Object.freeze(['ready', 'processing'] as const);

/* ── 3 · La decisión ───────────────────────────────────────────────────────── */

export interface PeticionDeDecisionDeEntrega {
  /** La cuenta YA resuelta en el servidor. Nunca lo que mande un cliente. */
  accountId: string;
  /** El material ya leído de donde vive. Un `assetId` de fuera no prueba nada. */
  material: Asset | undefined;
  /** La ficha del objeto físico, ya leída. */
  objeto: MediaObject | undefined;
  registro: RegistroDeProveedoresDeMedios;
  vigenciaSegundos?: number;
  politica?: PoliticaDeEntrega;
}

/**
 * ¿PUEDE ESTA CUENTA RECIBIR UNA LLAVE PARA ESTE MATERIAL, Y CUÁNTO DURA?
 *
 * Comprobación estructural sobre datos YA LEÍDOS, igual que hace la Fase 11 con
 * el material: aquí no se consulta nada. Quien llama tuvo que traer el material
 * y la ficha de donde se guardan, y es ahí donde de verdad se comprueba quién
 * está autenticado.
 *
 * El orden importa. La vigencia se mira primero porque es lo único que se puede
 * contestar sin hablar del material; a partir de ahí, todo lo que falla contesta
 * lo mismo hacia fuera.
 */
export const decidirEntrega = (p: PeticionDeDecisionDeEntrega): DecisionDeEntrega => {
  const politica = p.politica ?? POLITICA_DE_ENTREGA;
  const vigencia = vigenciaAprobada(p.vigenciaSegundos, politica);
  if (vigencia === undefined) return { permitida: false, motivo: 'vigencia_invalida', detalle: 'vigencia' };

  const no = (detalle: DetalleDeEntrega): DecisionDeEntrega => ({ permitida: false, motivo: 'no_disponible', detalle });

  if (typeof p.accountId !== 'string' || !p.accountId) return no('no_es_tuyo');

  /* El material: que exista, que sea suyo y que tenga bytes que entregar. */
  if (!p.material) return no('sin_material');
  if (!materialEsDeLaCuenta(p.material, p.accountId)) return no('no_es_tuyo');
  if (!ESTADOS_ENTREGABLES.includes(p.material.status)) return no('material_no_entregable');
  if (!p.material.storageRef) return no('material_sin_objeto');

  /* La ficha del objeto: que exista, que no esté retirada, y que sea de ESTE material y de ESTA cuenta. */
  if (!p.objeto) return no('sin_ficha');
  if (p.objeto.estado !== 'guardado') return no('ficha_borrada');
  if (p.objeto.assetId !== p.material.assetId) return no('ficha_de_otro_material');
  if (!objetoEsDeLaCuenta(p.objeto, p.accountId)) return no('ficha_de_otra_cuenta');

  /*
   * Y que las dos mitades cuenten la misma historia: la ficha tiene que estar en
   * el mismo proveedor que dice el material. Si no coinciden, algo se movió por
   * debajo y no se firma nada.
   */
  if (p.objeto.providerId !== p.material.storageRef.provider) return no('proveedor_no_coincide');

  /*
   * El proveedor: declarado, encendido y capaz de esto. `puede` ya excluye a los
   * apagados, y se le pregunta por la capacidad EXACTA —firmar una entrega— y no
   * por «¿estás vivo?»: un proveedor puede saber guardar y no saber firmar.
   */
  if (!p.registro.puede(p.objeto.providerId, 'object.signedUrl')) {
    return no(p.registro.buscar(p.objeto.providerId) ? 'sin_capacidad' : 'proveedor_desconocido');
  }

  return { permitida: true, vigenciaSegundos: vigencia, objeto: p.objeto, providerId: p.objeto.providerId };
};

/* ── 4 · Lo que sale hacia fuera ───────────────────────────────────────────── */

/**
 * LA RESPUESTA DE ENTREGA. Lo justo, y nada que sea identidad.
 *
 * Lleva el material —que SÍ es identidad de Weë— y una llave que caduca. No
 * lleva el contenedor, ni la clave del objeto, ni el identificador del
 * proveedor, ni la referencia física: quien pide no tiene por qué saber dónde
 * están sus bytes, y ese desconocimiento es justo lo que permite mudarlos.
 */
export interface Entrega {
  assetId: string;
  /** La llave. Temporal por definición, y por eso no se guarda en ninguna parte. */
  url: string;
  /** Cuándo deja de valer, en milisegundos. Después de esto, el material sigue estando. */
  expiraEn: number;
  vigenciaSegundos: number;
}

/**
 * UNA HUELLA DE LA URL PARA PODER HABLAR DE ELLA SIN ESCRIBIRLA.
 *
 * Para el registro del servidor: con esto se puede decir «la llave que dio el
 * problema es esta» sin dejar en un log una credencial que todavía sirve. La
 * huella entra por el mismo puerto que el resto de Weë; el Core no calcula
 * ninguna.
 */
export const huellaDeEntrega = (huella: (texto: string) => string, url: string): string => {
  const hex = typeof url === 'string' ? huella(url) : '';
  return /^[0-9a-f]{16,}$/.test(hex) ? `ent_${hex.slice(0, 16)}` : 'ent_desconocida';
};
