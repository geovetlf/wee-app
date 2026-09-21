import { AssetKind, TIPOS_DE_MATERIAL } from './content';
import { ELEMENT_CONTRACT_VERSION } from './contracts';
import { OwnedByAccount } from './identity';

/**
 * WEE ELEMENTS — LAS COSAS DE UNA CUENTA, CON NOMBRE.
 *
 * ── El problema, dicho con una frase de alguien ─────────────────────────────
 *
 * «Usa la hamburguesa que creamos ayer y haz un anuncio.»
 *
 * Hoy Weë no puede contestar a eso. Tiene los BYTES —tres fotos de esa
 * hamburguesa, cada una un material con su id— pero no tiene **la
 * hamburguesa**. No hay nada en el sistema que diga «estas tres fotos y ese
 * vídeo son la misma cosa, y esa cosa se llama Burger Classic». Sin eso, la
 * única forma de responder sería mandarle a Brain los cinco mil materiales de
 * la cuenta y que adivine, que no es una arquitectura: es una factura.
 *
 * Un Element es eso que falta. Una ENTIDAD CREATIVA con nombre, de la cuenta,
 * que APUNTA a materiales que ya existen.
 *
 * ── Tres cosas distintas, y no son sinónimos ────────────────────────────────
 *
 *   ASSET    el recurso digital.      Unos bytes con id, dueño y ciclo de vida.
 *   ELEMENT  QUÉ ES.                  «Burger Classic», y qué materiales la
 *                                     muestran.
 *   CONTEXT  QUÉ HACE FALTA AHORA.    Cuál de las cosas de la cuenta sirve
 *                                     para esta petición. (`visual-context.ts`)
 *
 * Y la cuarta, que llegó en S2:
 *
 *   CREATIVE PARAMETERS   CÓMO REPRESENTARLO.  Aéreo, alejándose, luz dorada.
 *
 * «Qué es» y «cómo lo quiero» son preguntas distintas y viven en archivos
 * distintos a propósito. Un Element no sabe de cámaras y unos parámetros
 * creativos no saben de hamburguesas.
 *
 * ── LO QUE UN ELEMENT NO HACE, Y ES LA MITAD DEL DISEÑO ─────────────────────
 *
 * No guarda bytes. No guarda una `storageRef`. No guarda una URL. No copia la
 * ficha del material. No tiene variantes —Media Cloud ya tiene material fuente
 * y variantes, y una segunda idea de «variante» sería una segunda verdad—. No
 * borra materiales: archivar una hamburguesa no puede tirar unas fotos que
 * pueden estar en otro sitio.
 *
 * Un Element tiene NOMBRE y REFERENCIAS. Nada más. Todo lo demás —dónde viven
 * los bytes, quién puede verlos, cómo se entregan, cuándo se borran— sigue
 * siendo de Media Cloud y del Content Core, que ya lo hacen.
 *
 * ── De quién es ────────────────────────────────────────────────────────────
 *
 * DE LA CUENTA. Como el material y como el proyecto, y por el mismo tipo:
 * `OwnedByAccount`. No es del proveedor, ni del modelo, ni del trabajo, ni de
 * un Skill, ni de un proyecto. Un Skill puede NECESITAR un Element; no lo tiene.
 */

/* ── Qué clase de cosa es ─────────────────────────────────────────────────── */

/**
 * LOS TIPOS. Seis, y la lista corta es una decisión, no un recorte.
 *
 * Se evaluaron nueve —personaje, producto, marca, ubicación, restaurante,
 * edificio, vehículo, objeto, escena— y cuatro se juntaron con otros porque la
 * diferencia no cambiaba NADA de lo que este archivo hace:
 *
 *   restaurante → `place`   un restaurante es un sitio con una marca, y las
 *   edificio    → `place`   dos cosas ya se pueden decir: un `place` y un
 *   ubicación   → `place`   `brand` relacionados.
 *   vehículo    → `object`  un coche es un objeto, salvo que se venda, y
 *                           entonces es un `product`.
 *
 * Una taxonomía que nadie mantiene es peor que una corta: cada tipo de más es
 * una pregunta más que alguien tiene que acertar al crear una cosa, y un sitio
 * más donde un Skill puede pedir lo que no existe. El día que un caso real
 * necesite distinguir un restaurante de un edificio, se añade el valor y sube
 * la versión del contrato: añadir a esta unión no rompe a nadie.
 */
export type ElementType =
  /* Alguien que tiene que salir igual en el vídeo de hoy y en el de dentro de un mes. */
  | 'character'
  /* Algo que se vende o se enseña. */
  | 'product'
  /* La identidad de alguien: el logo, los colores, el nombre. */
  | 'brand'
  /* Un sitio: un restaurante, un edificio, una ciudad, una playa. */
  | 'place'
  /* Una cosa que no se vende: un coche, una guitarra, una silla. */
  | 'object'
  /* Un escenario ya compuesto, para volver a él. */
  | 'scene';

export const TIPOS_DE_ELEMENTO: readonly ElementType[] = Object.freeze([
  'character', 'product', 'brand', 'place', 'object', 'scene',
] as const);

export const esTipoDeElemento = (v: unknown): v is ElementType =>
  typeof v === 'string' && (TIPOS_DE_ELEMENTO as readonly string[]).includes(v);

/** Vivo, o guardado sin borrar nada. Archivar NUNCA toca un material. */
export type ElementStatus = 'active' | 'archived';

/* ── Cómo apunta a los materiales ─────────────────────────────────────────── */

/**
 * PARA QUÉ SIRVE ESE MATERIAL DENTRO DE ESTA COSA.
 *
 * Tres, y no hay `variant` a propósito: las variantes son de Media Cloud —un
 * material fuente y sus derivados— y declararlas también aquí sería tener dos
 * sitios donde mirar para saber cuántas hay. Si un Element quiere apuntar a una
 * variante, apunta al material que la tiene.
 */
export type ElementAssetRole =
  /* La que se enseña cuando hay que enseñar una sola. */
  | 'primary'
  /* Para que el modelo sepa cómo es: otro ángulo, otra luz, el mismo sujeto. */
  | 'reference'
  /* Hace falta alrededor: el empaquetado, una textura, un fondo. */
  | 'supporting';

export const ROLES_DE_MATERIAL: readonly ElementAssetRole[] = Object.freeze([
  'primary', 'reference', 'supporting',
] as const);

/**
 * UNA REFERENCIA A UN MATERIAL. Un id, un papel y una clase. Y nada más.
 *
 * `kind` se guarda aunque el material ya lo diga, y es la única duplicación de
 * todo el archivo. Está porque quien resuelve contexto necesita saber si hay
 * una imagen disponible SIN leer los cinco materiales de la cosa, y porque el
 * Planner razona sobre modalidades. Se valida contra la ficha cuando se enlaza;
 * la autoridad sigue siendo el material.
 */
export interface ElementAssetRef {
  assetId: string;
  role: ElementAssetRole;
  kind: AssetKind;
}

/* ── Cómo se relaciona con otras cosas ────────────────────────────────────── */

/**
 * UNA RELACIÓN, POR ID. No un grafo.
 *
 * Una hamburguesa es de un restaurante; un restaurante tiene una marca. Eso se
 * dice con un id y una palabra, y se acabó. Aquí no hay recorrido, ni
 * transitividad, ni consultas por camino: el día que hagan falta, harán falta
 * de verdad y se diseñarán entonces. Una base de datos de grafos para decir
 * «esta hamburguesa es de este restaurante» es construir el problema.
 */
export type ElementRelationKind = 'belongs_to' | 'features' | 'located_at';

export const RELACIONES_DE_ELEMENTO: readonly ElementRelationKind[] = Object.freeze([
  'belongs_to', 'features', 'located_at',
] as const);

export interface ElementRelation {
  kind: ElementRelationKind;
  /** El otro Element. De la MISMA cuenta; se comprueba al enlazar. */
  elementId: string;
}

/* ── La cosa ──────────────────────────────────────────────────────────────── */

/**
 * UN ELEMENT.
 *
 * ── Por qué no hay `attributes` ─────────────────────────────────────────────
 *
 * Porque sería `Record<string, unknown>` con otro nombre, y en seis meses
 * tendría dentro un `providerId`, una URL y la mitad de una segunda base de
 * datos. S2 tomó la misma decisión con los parámetros creativos y por el mismo
 * motivo. Lo que un Element necesita para que Weë resuelva «usa la hamburguesa
 * de ayer» es: cómo se llama, qué clase de cosa es, de quién es y qué
 * materiales la muestran. Eso es todo lo que hay aquí.
 *
 * Cuando haga falta describir a un personaje —el pelo, la ropa, la edad— eso
 * NO son atributos sueltos: son parámetros con su propio contrato cerrado,
 * como los creativos, y llegarán con su fase.
 */
export interface Element extends OwnedByAccount {
  contract: typeof ELEMENT_CONTRACT_VERSION;
  elementId: string;
  type: ElementType;
  /**
   * Un entero que sube cuando la cosa CAMBIA —otra receta, otro peinado— y no
   * cuando se le añade una foto. Misma disciplina que un Skill: sin semver,
   * sin rangos, porque nada depende de esto por rango.
   */
  version: number;
  status: ElementStatus;
  /** Cómo la llamó la persona. Es un nombre, no una clave de i18n: lo escribió alguien. */
  name: string;
  description?: string;
  /** Los materiales que la muestran. Referencias; jamás bytes. */
  refs: readonly ElementAssetRef[];
  related?: readonly ElementRelation[];
  createdAt: number;
  updatedAt: number;
  /** Cuándo se guardó. Archivar no borra ni un material. */
  archivedAt?: number;
}

/** La misma forma que un material y un proyecto. No se inventa una segunda identidad. */
export const FORMA_DE_ID_DE_ELEMENTO = /^[A-Za-z0-9_-]{4,128}$/;

/* ── Límites ──────────────────────────────────────────────────────────────── */

export const MAX_REFS_POR_ELEMENTO = 32;
export const MAX_RELACIONES_POR_ELEMENTO = 16;
export const MAX_NOMBRE = 120;
export const MAX_DESCRIPCION = 500;
export const MAX_VERSION_DE_ELEMENTO = 9999;

/* ── Validación ───────────────────────────────────────────────────────────── */

export type MotivoDeElementoInvalido =
  | 'invalid_shape'
  | 'unknown_field'
  | 'dangerous_key'
  | 'forbidden_key'
  | 'invalid_id'
  | 'invalid_type'
  | 'invalid_version'
  | 'invalid_status'
  | 'invalid_text'
  | 'invalid_ref'
  | 'duplicate_ref'
  | 'too_many'
  | 'invalid_owner'
  | 'invalid_time';

export interface ProblemaDeElemento {
  field: string;
  reason: MotivoDeElementoInvalido;
}

const mal = (field: string, reason: MotivoDeElementoInvalido): ProblemaDeElemento => ({ field, reason });

const esObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const esNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const esTxt = (v: unknown): v is string => typeof v === 'string';

const PELIGROSAS = ['__proto__', 'constructor', 'prototype'];

/**
 * LO QUE UN ELEMENT NO PUEDE LLEVAR NUNCA.
 *
 * Ni dónde están los bytes, ni cómo se llega a ellos, ni con qué se generaron.
 * Un `storageRef` aquí convertiría esto en un segundo registro de
 * almacenamiento; una URL lo convertiría en un sistema de entrega. Los dos ya
 * existen y los dos son de Media Cloud.
 */
const PROHIBIDAS = [
  'storageref', 'bucket', 'objectkey', 'url', 'signedurl', 'downloadurl', 'endpoint',
  'providerid', 'modelid', 'adapterid', 'provider', 'model', 'adapter',
  'apikey', 'secret', 'credential', 'credentials', 'token', 'authorization',
  'bytes', 'content', 'data', 'buffer', 'blob',
];

const normalizar = (c: string): string => c.toLowerCase().replace(/[-_]/g, '');
export const claveProhibidaDeElemento = (clave: string): boolean =>
  PROHIBIDAS.includes(clave.toLowerCase()) || PROHIBIDAS.includes(normalizar(clave));

const CAMPOS: readonly string[] = [
  'contract', 'elementId', 'type', 'version', 'status', 'name', 'description',
  'refs', 'related', 'createdAt', 'updatedAt', 'archivedAt',
  'ownerAccountId', 'createdByEntityId', 'createdByEntityType', 'publishedByEntityId', 'publishedByEntityType',
];

const propia = (o: Record<string, unknown>, c: string): boolean => Object.prototype.hasOwnProperty.call(o, c);

/**
 * UN ELEMENT, REVISADO ENTERO. Todos los problemas, no el primero.
 *
 * No comprueba que los materiales EXISTAN —eso no se puede saber sin leer, y el
 * Core no lee—: comprueba la FORMA. Que el material exista, sea de esta cuenta
 * y se pueda usar lo comprueba `puedeReferenciar()`, que recibe la ficha ya
 * leída. Las dos cosas hacen falta y son dos comprobaciones distintas.
 */
export const validarElemento = (crudo: unknown): readonly ProblemaDeElemento[] => {
  if (!esObjeto(crudo)) return [mal('element', 'invalid_shape')];
  const d = crudo;
  const p: ProblemaDeElemento[] = [];

  for (const [clave, valor] of Object.entries(d)) {
    if (PELIGROSAS.includes(clave)) { p.push(mal(clave, 'dangerous_key')); continue; }
    if (claveProhibidaDeElemento(clave)) { p.push(mal(clave, 'forbidden_key')); continue; }
    if (!CAMPOS.includes(clave)) { p.push(mal(clave, 'unknown_field')); continue; }
    /* Un dato es un dato. Una función dentro de uno es siempre un error. */
    if (typeof valor === 'function') p.push(mal(clave, 'invalid_shape'));
  }

  /* Lo obligatorio tiene que ser SUYO: heredarlo del prototipo no cuenta. */
  for (const campo of ['contract', 'elementId', 'type', 'version', 'status', 'name', 'refs', 'ownerAccountId', 'createdAt', 'updatedAt']) {
    if (!propia(d, campo)) p.push(mal(campo, 'invalid_shape'));
  }

  if (d.contract !== ELEMENT_CONTRACT_VERSION) p.push(mal('contract', 'invalid_shape'));
  if (!esTxt(d.elementId) || !FORMA_DE_ID_DE_ELEMENTO.test(d.elementId)) p.push(mal('elementId', 'invalid_id'));
  if (!esTipoDeElemento(d.type)) p.push(mal('type', 'invalid_type'));
  if (!esNum(d.version) || !Number.isInteger(d.version) || d.version < 1 || d.version > MAX_VERSION_DE_ELEMENTO) {
    p.push(mal('version', 'invalid_version'));
  }
  if (d.status !== 'active' && d.status !== 'archived') p.push(mal('status', 'invalid_status'));
  if (!esTxt(d.name) || d.name.trim().length === 0 || d.name.length > MAX_NOMBRE) p.push(mal('name', 'invalid_text'));
  if (d.description !== undefined && (!esTxt(d.description) || d.description.length > MAX_DESCRIPCION)) {
    p.push(mal('description', 'invalid_text'));
  }

  /*
   * EL DUEÑO ES UNA CUENTA, y esto es lo único que hay que acertar de todo el
   * archivo. No se comprueba aquí QUIÉN está autenticado —el Core no lo sabe—:
   * se comprueba que el campo exista y tenga forma de cuenta, y quien escriba
   * lo pone desde la sesión, nunca desde lo que mande el cliente.
   */
  if (!esTxt(d.ownerAccountId) || d.ownerAccountId.length === 0 || d.ownerAccountId.length > 128) {
    p.push(mal('ownerAccountId', 'invalid_owner'));
  }

  for (const campo of ['createdAt', 'updatedAt'] as const) {
    if (!esNum(d[campo]) || d[campo] as number < 0) p.push(mal(campo, 'invalid_time'));
  }
  if (d.archivedAt !== undefined && (!esNum(d.archivedAt) || d.archivedAt < 0)) p.push(mal('archivedAt', 'invalid_time'));
  if (d.status === 'archived' && d.archivedAt === undefined) p.push(mal('archivedAt', 'invalid_time'));

  /* ── Las referencias ──────────────────────────────────────────────────── */
  if (!Array.isArray(d.refs)) {
    p.push(mal('refs', 'invalid_ref'));
  } else if (d.refs.length > MAX_REFS_POR_ELEMENTO) {
    p.push(mal('refs', 'too_many'));
  } else {
    const vistos = new Set<string>();
    for (const r of d.refs) {
      if (!esObjeto(r)) { p.push(mal('refs', 'invalid_ref')); continue; }
      for (const clave of Object.keys(r)) {
        if (PELIGROSAS.includes(clave)) { p.push(mal(`refs.${clave}`, 'dangerous_key')); continue; }
        if (claveProhibidaDeElemento(clave)) { p.push(mal(`refs.${clave}`, 'forbidden_key')); continue; }
        if (!['assetId', 'role', 'kind'].includes(clave)) p.push(mal(`refs.${clave}`, 'unknown_field'));
      }
      if (!esTxt(r.assetId) || !FORMA_DE_ID_DE_ELEMENTO.test(r.assetId)) { p.push(mal('refs.assetId', 'invalid_ref')); continue; }
      if (!esTxt(r.role) || !(ROLES_DE_MATERIAL as readonly string[]).includes(r.role)) p.push(mal('refs.role', 'invalid_ref'));
      if (!esTxt(r.kind) || !(TIPOS_DE_MATERIAL as readonly string[]).includes(r.kind)) p.push(mal('refs.kind', 'invalid_ref'));
      /*
       * El MISMO material dos veces no es más información: es la misma ficha
       * contada dos veces, y quien cuente cuántas imágenes hay se equivocará.
       */
      if (vistos.has(r.assetId)) p.push(mal('refs.assetId', 'duplicate_ref'));
      vistos.add(r.assetId);
    }
    /* Como mucho UNA principal: «la que se enseña cuando hay que enseñar una sola». */
    if (d.refs.filter((r) => esObjeto(r) && r.role === 'primary').length > 1) p.push(mal('refs.role', 'duplicate_ref'));
  }

  /* ── Las relaciones ───────────────────────────────────────────────────── */
  if (d.related !== undefined) {
    if (!Array.isArray(d.related) || d.related.length > MAX_RELACIONES_POR_ELEMENTO) {
      p.push(mal('related', 'too_many'));
    } else {
      const vistas = new Set<string>();
      for (const r of d.related) {
        if (!esObjeto(r)) { p.push(mal('related', 'invalid_ref')); continue; }
        for (const clave of Object.keys(r)) {
          if (!['kind', 'elementId'].includes(clave)) p.push(mal(`related.${clave}`, 'unknown_field'));
        }
        if (!esTxt(r.kind) || !(RELACIONES_DE_ELEMENTO as readonly string[]).includes(r.kind)) p.push(mal('related.kind', 'invalid_ref'));
        if (!esTxt(r.elementId) || !FORMA_DE_ID_DE_ELEMENTO.test(r.elementId)) { p.push(mal('related.elementId', 'invalid_ref')); continue; }
        /* Y no se relaciona consigo misma: eso no dice nada y es un ciclo de longitud uno. */
        if (r.elementId === d.elementId) p.push(mal('related.elementId', 'invalid_ref'));
        const clave = `${r.kind}:${r.elementId}`;
        if (vistas.has(clave)) p.push(mal('related', 'duplicate_ref'));
        vistas.add(clave);
      }
    }
  }

  return p;
};

export const elementoValido = (crudo: unknown): crudo is Element => validarElemento(crudo).length === 0;

/* ── Enlazar un material ──────────────────────────────────────────────────── */

/** Por qué un material no se puede enlazar. Un literal, nunca una frase. */
export type MotivoDeNoReferenciar =
  /* No está, o no es de esta cuenta. Las dos cosas se contestan IGUAL a propósito. */
  | 'not_found'
  /* Está, es tuyo, y todavía no se puede usar: subiendo, procesando, fallado o borrado. */
  | 'not_usable'
  /* Está, es tuyo, se puede usar, y no es de la clase que la referencia declara. */
  | 'kind_mismatch';

/**
 * LO QUE HACE FALTA SABER DE UN MATERIAL PARA ENLAZARLO.
 *
 * Es el subconjunto de `Asset` que esto mira, escrito aquí para que este
 * archivo no dependa de la ficha entera. Quien llama trae la ficha leída del
 * Content Core; el Core no lee nada.
 */
export interface FichaDeMaterial {
  assetId: string;
  ownerAccountId: string;
  kind: AssetKind;
  status: string;
}

/**
 * ¿PUEDE ESTA COSA APUNTAR A ESTE MATERIAL?
 *
 * ── Por qué «no está» y «no es tuyo» contestan lo mismo ─────────────────────
 *
 * Porque la diferencia entre las dos respuestas ES la información. Si «no
 * existe» y «existe pero no es tuyo» se distinguen, cualquiera puede averiguar
 * qué materiales tiene otra cuenta probando ids: no hace falta leer ninguno
 * para aprender que están ahí. Así que las dos son `not_found`, y quien
 * pregunta se queda sin saber cuál de las dos era.
 */
export const puedeReferenciar = (
  ref: ElementAssetRef,
  ficha: FichaDeMaterial | undefined,
  accountId: string,
): { ok: true } | { ok: false; reason: MotivoDeNoReferenciar } => {
  if (!ficha || ficha.ownerAccountId !== accountId) return { ok: false, reason: 'not_found' };
  if (ficha.status !== 'ready') return { ok: false, reason: 'not_usable' };
  if (ficha.kind !== ref.kind) return { ok: false, reason: 'kind_mismatch' };
  return { ok: true };
};

/** Las clases de material que esta cosa tiene disponibles. Sin leer ninguna ficha. */
export const clasesDeMaterial = (elemento: Element): readonly AssetKind[] =>
  [...new Set(elemento.refs.map((r) => r.kind))];

/**
 * ARCHIVAR. Y fíjate en lo que NO devuelve.
 *
 * No devuelve materiales que borrar, ni una lista de limpieza, ni un aviso para
 * el recolector. Archivar una hamburguesa deja las fotos exactamente donde
 * estaban: pueden estar en otro Element, en un proyecto, en una publicación o
 * en el muro de alguien. Quién borra bytes y cuándo es de MC-5, y sigue siéndolo.
 */
export const archivar = (elemento: Element, at: number): Element => ({
  ...elemento,
  status: 'archived',
  archivedAt: at,
  updatedAt: at,
});
