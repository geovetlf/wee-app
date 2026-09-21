import { createHash } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import {
  Asset,
  AssetKind,
  DetalleDeSubida,
  MediaObject,
  MotivoDeSubida,
  PIEZA_ORIGINAL,
  PoliticaDeSubida,
  PuertoDeAlmacenamiento,
  RegistroDeProveedoresDeMedios,
  StorageRef,
  UploadIntent,
  claveDelObjeto,
  decidirSubida,
  identidadDeIntento,
  referenciaDelObjeto,
  tamanoAprobado,
  tipoDeContenidoAceptable,
  topeDeSubida,
  vigenciaDeSubidaAprobada,
} from '../core';
import { AssetDoc, crearMaterialParaSubida, leerMaterial, marcarMaterialSubido } from '../content';
import { cuentaDelPrincipalEnWee } from '../identity/cuentas';
import { AlmacenDeObjetosDeMedios, almacenDeObjetosDeMedios } from './almacen';
import { adaptadoresDeMedios, proveedorConfigurado, registroDeMediosDeWee } from './catalogo';
import { huellaDeMedios } from './huella';

/**
 * WEE MEDIA UPLOAD — LOS BYTES NO PASAN POR AQUÍ.
 *
 * ── Los dos planos ──────────────────────────────────────────────────────────
 *
 *     CLIENTE  →  WEE (plano de control)   decide quién, dónde, cuánto y cuándo
 *     CLIENTE  →  PROVEEDOR (plano de datos)   los bytes, directos
 *
 * Weë nunca toca los bytes. Una Function haciendo de intermediaria de archivos
 * de dos gigas sería la pieza más cara y más frágil del sistema y no aportaría
 * nada, porque lo que hay que controlar —quién escribe, dónde y cuánto— se
 * decide antes de que salga el primer byte.
 *
 * ── La cadena ───────────────────────────────────────────────────────────────
 *
 *     principal        quién ha iniciado sesión
 *        ↓             `cuentaDelPrincipalEnWee` — la puerta que ya existe
 *     cuenta de Weë
 *        ↓             `crearMaterialParaSubida` — la Fase 11 manda
 *     material en `uploading`
 *        ↓             clave DERIVADA, aislada por cuenta
 *     destino
 *        ↓             el registro dice quién puede recibir subidas
 *     adaptador
 *        ↓
 *     permiso temporal de escritura
 *
 * Quien pide manda su intención: qué tipo de cosa, de qué tamaño y con qué
 * clave de operación. **No manda dónde.** Contenedor, clave, proveedor y cuenta
 * los deriva el servidor, y si llegaran en la petición no se leerían.
 *
 * ── Lo que esto NO hace ─────────────────────────────────────────────────────
 *
 * No genera miniaturas, ni pósters, ni variantes, ni transcodifica nada: eso es
 * MC-4. No encola trabajos —firmar y comprobar son operaciones cortas—, no
 * cobra Credits, no toca Cloudinary y no conoce a ningún proveedor por su
 * nombre.
 */

/* ── 1 · Lo que hace falta ─────────────────────────────────────────────────── */

export interface DepsDeSubida {
  db: Firestore;
  /** La única puerta de Weë para «de qué cuenta puede actuar este principal». */
  cuentaDelPrincipal: (principalId: string, cuentaSolicitada?: string) => Promise<{ accountId: string } | null>;
  /** Crear la ficha del material ANTES de que existan sus bytes. De la Fase 11. */
  crearMaterial: typeof crearMaterialParaSubida;
  /** Leer el material. De la Fase 11. */
  leerMaterial: (assetId: string) => Promise<AssetDoc | Asset | null | undefined>;
  /** Pasar el material a `ready` cuando los bytes ya están. De la Fase 11. */
  marcarSubido: typeof marcarMaterialSubido;
  objetos?: AlmacenDeObjetosDeMedios;
  registro?: RegistroDeProveedoresDeMedios;
  adaptadores?: Readonly<Record<string, PuertoDeAlmacenamiento>>;
  proveedor?: string;
  politica?: PoliticaDeSubida;
  ahora?: () => number;
}

/**
 * LAS TRES PUERTAS DE WEË, ATADAS. No hay cuartas.
 *
 * La cuenta la resuelve la única función que contesta esa pregunta; el material
 * lo crean, leen y cierran las operaciones de la Fase 11. MC-3 no escribe una
 * segunda forma de hacer ninguna de las tres.
 */
export const depsDeSubidaDeWee = (db: Firestore): DepsDeSubida => ({
  db,
  cuentaDelPrincipal: (principalId, cuentaSolicitada) => cuentaDelPrincipalEnWee(db, principalId, cuentaSolicitada),
  crearMaterial: crearMaterialParaSubida,
  leerMaterial: (assetId) => leerMaterial(assetId),
  marcarSubido: marcarMaterialSubido,
});

export interface PeticionDeSubida {
  /** Quién pide. Del contexto autenticado, nunca del cuerpo de la petición. */
  principalId: string;
  cuentaSolicitada?: string;
  /**
   * LA CLAVE DE IDEMPOTENCIA DE QUIEN LLAMA, y lo único de lo que sale la
   * identidad del material. Repetirla pide el MISMO material y el MISMO
   * destino; cambiarla pide otro. Es lo que impide que un reintento de red
   * deje dos materiales a medias.
   */
  operationId: string;
  kind: AssetKind;
  contentType: string;
  /** Lo que dice que va a pesar. Se aprueba contra la política; el real se mide al confirmar. */
  bytes: number;
  name?: string;
  vigenciaSegundos?: number;
}

/**
 * LO QUE SE PUEDE REGISTRAR. Todo lo necesario para entender, nada para entrar.
 *
 * De la URL de subida solo viaja su huella: una URL de subida firmada es una
 * credencial de ESCRITURA, y es todavía menos aceptable en un log que una de
 * lectura.
 */
export interface TrazaDeSubida {
  operationId?: string;
  accountId?: string;
  assetId?: string;
  objectRef?: string;
  providerId?: string;
  resultado: 'concedida' | 'confirmada' | 'pendiente' | MotivoDeSubida;
  detalle: DetalleDeSubida | 'principal_invalido' | 'sin_cuenta' | 'sin_adaptador' | 'sin_destino' | 'firma_fallida' | 'material_no_creado' | 'bytes_no_estan' | 'bytes_de_mas' | 'ok';
  ms: number;
  /** `sub_<16 hex>` de la URL. Sirve para cruzar un problema sin escribirla. */
  huellaDeUrl?: string;
  /**
   * EL STATUS QUE DIO EL PROVEEDOR, cuando lo hubo.
   *
   * Es un NÚMERO y nada más. Al confirmar, `mirar()` ya traía el status dentro
   * de su fallo y esta capa lo tiraba, así que un 403 —«tus credenciales no
   * valen»— y un 400 —«tu petición está mal»— llegaban arriba indistinguibles,
   * que son justo los dos diagnósticos opuestos que hay que separar.
   *
   * Solo el número. Ni cabeceras, ni cuerpo, ni URL, ni nada más de `details`.
   */
  statusDelProveedor?: number;
}

/**
 * DEL FALLO DEL ALMACÉN SOLO SE RESCATA UN NÚMERO.
 *
 * `details` es un saco abierto (`Record<string, unknown>`), así que no se copia:
 * se busca UNA clave y se exige que sea un entero en el rango de los status
 * HTTP. Lo que no lo sea, no sale. Por aquí no puede colarse una cabecera, una
 * URL ni un rastro de credencial — ni hoy, ni el día que a algún adaptador se
 * le ocurra meter algo más en ese objeto.
 */
const statusDelProveedor = (e: { details?: Record<string, unknown> } | undefined): number | undefined => {
  const s = e?.details?.status;
  return typeof s === 'number' && Number.isInteger(s) && s >= 100 && s <= 599 ? s : undefined;
};

export type DesenlaceDeSubida =
  | { ok: true; intento: UploadIntent; traza: TrazaDeSubida }
  | { ok: false; motivo: MotivoDeSubida; traza: TrazaDeSubida };

/**
 * LA IDENTIDAD DEL MATERIAL, DERIVADA DE LA CLAVE DE OPERACIÓN.
 *
 * Lleva la cuenta dentro, así que dos personas con la misma clave de operación
 * piden materiales distintos y nadie puede apuntar al de otra eligiendo su
 * clave. Determinista: el mismo par da siempre el mismo material, que es lo que
 * convierte un reintento en un no-op.
 */
export const identidadDeMaterialDeSubida = (accountId: string, operationId: string): string | undefined => {
  if (typeof accountId !== 'string' || !accountId) return undefined;
  if (typeof operationId !== 'string' || operationId.length < 8 || operationId.length > 128) return undefined;
  return `asset_${createHash('sha256').update(`subida|${accountId}|${operationId}`, 'utf8').digest('hex').slice(0, 32)}`;
};

/* ── 2 · Pedir permiso para subir ──────────────────────────────────────────── */

/**
 * SOLICITAR UNA SUBIDA DIRECTA.
 *
 * Lecturas acotadas y una firma local: el material por su identificador
 * derivado, la ficha del objeto por una identidad derivada de dónde van a estar
 * los bytes, y el proveedor por su nombre en el registro. Ni una consulta.
 *
 * ── Por qué repetir esto no duplica nada ────────────────────────────────────
 *
 *   la identidad  se DERIVA de (cuenta, clave de operación) → el mismo material
 *   la clave      se DERIVA de (cuenta, material, pieza)    → el mismo destino
 *   el material   se crea SOLO SI NO EXISTE                 → uno, no dos
 *   los bytes     se escriben con «solo si está libre»      → una vez, no dos
 *
 * Esa última la hace cumplir el PROVEEDOR: `if-none-match: *` va dentro de la
 * firma, así que ni siquiera un cliente que guarde la URL puede pisar lo que
 * ya subió.
 */
export const solicitarSubida = async (
  deps: DepsDeSubida,
  peticion: PeticionDeSubida,
): Promise<DesenlaceDeSubida> => {
  const ahora = deps.ahora ?? (() => Date.now());
  const empezo = ahora();
  const fin = (t: Omit<TrazaDeSubida, 'ms' | 'operationId'>): TrazaDeSubida =>
    ({ operationId: peticion.operationId, ...t, ms: ahora() - empezo });
  const no = (motivo: MotivoDeSubida, t: Omit<TrazaDeSubida, 'ms' | 'operationId' | 'resultado'>): DesenlaceDeSubida =>
    ({ ok: false, motivo, traza: fin({ ...t, resultado: motivo }) });

  /* 1 · Quién pide. */
  if (typeof peticion.principalId !== 'string' || !peticion.principalId) {
    return no('no_disponible', { detalle: 'principal_invalido' });
  }
  const cuenta = await deps.cuentaDelPrincipal(peticion.principalId, peticion.cuentaSolicitada);
  if (!cuenta) return no('no_disponible', { detalle: 'sin_cuenta' });
  const accountId = cuenta.accountId;

  /* 2 · Con qué se guarda, y cuánto cabe de verdad. */
  const registro = deps.registro ?? registroDeMediosDeWee();
  const adaptadores = deps.adaptadores ?? adaptadoresDeMedios();
  const providerId = deps.proveedor ?? proveedorConfigurado();
  const puerto = adaptadores[providerId];
  const descriptor = registro.buscar(providerId);
  const tope = topeDeSubida(deps.politica, descriptor?.limites?.maxBytesDeUnaSubida);

  /*
   * 3 · Lo que se puede rechazar SIN tocar nada. Se hace antes de escribir para
   * que una petición mal formada no deje un material a medias en la base de
   * datos. Son las mismas funciones puras que vuelve a aplicar la decisión.
   */
  if (vigenciaDeSubidaAprobada(peticion.vigenciaSegundos, deps.politica) === undefined) {
    return no('peticion_invalida', { accountId, detalle: 'vigencia' });
  }
  if (!tipoDeContenidoAceptable(peticion.contentType)) return no('peticion_invalida', { accountId, detalle: 'tipo' });
  if (tamanoAprobado(peticion.bytes, tope) === undefined) return no('peticion_invalida', { accountId, detalle: 'tamano' });

  /* 4 · Dónde. TODO derivado en el servidor: ni contenedor ni clave llegan de fuera. */
  const assetId = identidadDeMaterialDeSubida(accountId, peticion.operationId);
  if (!assetId) return no('peticion_invalida', { accountId, detalle: 'tamano' });
  const objectKey = claveDelObjeto(accountId, assetId, PIEZA_ORIGINAL);
  const bucket = puerto?.contenedor;
  if (!puerto || !objectKey) return no('no_disponible', { accountId, assetId, providerId, detalle: puerto ? 'sin_destino' : 'sin_adaptador' });
  const destino: StorageRef = { provider: providerId, ...(bucket ? { bucket } : {}), objectKey };
  const objectRef = referenciaDelObjeto(huellaDeMedios, destino);
  if (!objectRef) return no('no_disponible', { accountId, assetId, providerId, detalle: 'sin_destino' });

  /* 5 · ¿Ya hay bytes ahí? Lectura por identificador; si la hay, no se concede nada. */
  const objetos = deps.objetos ?? almacenDeObjetosDeMedios(deps.db);
  const yaHabia: MediaObject | undefined = await objetos.leer(objectRef, accountId);

  /*
   * 6 · El material. Se crea SOLO SI NO EXISTE, así que la misma clave de
   * operación repetida se encuentra el suyo con su fecha intacta.
   */
  const creado = await deps.crearMaterial({
    ownerAccountId: accountId,
    assetId,
    kind: peticion.kind,
    storageRef: destino,
    mimeType: peticion.contentType,
    name: peticion.name,
    provenance: { createdAt: ahora() },
  });
  if (creado.status === 'invalido' || creado.status === 'no_es_tuyo') {
    return no('no_disponible', { accountId, assetId, objectRef, providerId, detalle: creado.status === 'no_es_tuyo' ? 'no_es_tuyo' : 'material_no_creado' });
  }

  /* 7 · La decisión, pura, sobre lo ya leído. */
  const decision = decidirSubida({
    accountId,
    material: creado.material,
    objeto: yaHabia,
    registro,
    providerId,
    contentType: peticion.contentType,
    bytes: peticion.bytes,
    vigenciaSegundos: peticion.vigenciaSegundos,
    politica: deps.politica,
    topeDelProveedor: descriptor?.limites?.maxBytesDeUnaSubida,
  });
  if (!decision.permitida) {
    return no(decision.motivo, { accountId, assetId, objectRef, providerId, detalle: decision.detalle });
  }

  /* 8 · El permiso. Lo pone el adaptador; aquí no se sabe de qué proveedor es. */
  if (!puerto.urlDeSubida) {
    return no('no_disponible', { accountId, assetId, objectRef, providerId, detalle: 'sin_adaptador' });
  }
  const permiso = await puerto.urlDeSubida({
    destino,
    contentType: decision.contentType,
    vigenciaSegundos: decision.vigenciaSegundos,
    maxBytes: decision.maxBytes,
    /* Que el destino sea de UNA sola escritura lo hace cumplir el proveedor. */
    siNoExiste: true,
  });
  if (!permiso.ok) {
    return no('no_disponible', { accountId, assetId, objectRef, providerId, detalle: 'firma_fallida' });
  }

  const intentId = identidadDeIntento(huellaDeMedios, objectRef);
  if (!intentId) return no('no_disponible', { accountId, assetId, objectRef, providerId, detalle: 'sin_destino' });

  return {
    ok: true,
    intento: {
      intentId,
      assetId,
      url: permiso.url,
      metodo: permiso.metodo,
      cabeceras: permiso.cabeceras,
      maxBytes: decision.maxBytes,
      expiraEn: permiso.expiraEn,
      vigenciaSegundos: decision.vigenciaSegundos,
    },
    traza: fin({
      accountId, assetId, objectRef, providerId, resultado: 'concedida', detalle: 'ok',
      huellaDeUrl: identidadDeIntento(huellaDeMedios, permiso.url),
    }),
  };
};

/* ── 3 · Confirmar que los bytes llegaron ──────────────────────────────────── */

export interface PeticionDeConfirmacion {
  principalId: string;
  cuentaSolicitada?: string;
  assetId: string;
  operationId?: string;
}

export type DesenlaceDeConfirmacion =
  | { ok: true; assetId: string; bytes: number; objectRef: string; traza: TrazaDeSubida }
  /* El objeto todavía no está. No es un fallo: es que no ha terminado. */
  | { ok: false; motivo: 'pendiente'; traza: TrazaDeSubida }
  | { ok: false; motivo: MotivoDeSubida; traza: TrazaDeSubida };

/**
 * CONFIRMAR UNA SUBIDA — MIRANDO EL OBJETO, NO CREYENDO AL CLIENTE.
 *
 * «Ya he terminado» no es una prueba de nada: quien sube podría no haber
 * escrito un byte, haber escrito la mitad o haber escrito cinco gigas. Así que
 * esto no se lo cree y va a mirar (`mirar`, que es un HEAD: metadata, no bytes).
 * Una sola llamada, y solo si todo lo demás cuadra.
 *
 * Del objeto se lee lo que el PROVEEDOR dice que hay —tamaño y tipo reales—, y
 * eso es lo que se anota; lo que el cliente declaró al pedir permiso era una
 * intención, no un hecho.
 *
 * Confirmar dos veces deja exactamente una ficha y un material listo: el
 * registro de la ficha es el `create` idempotente de MC-1 y la transición del
 * material ya distingue «lo puse yo» de «ya estaba».
 */
export const confirmarSubida = async (
  deps: DepsDeSubida,
  peticion: PeticionDeConfirmacion,
): Promise<DesenlaceDeConfirmacion> => {
  const ahora = deps.ahora ?? (() => Date.now());
  const empezo = ahora();
  const fin = (t: Omit<TrazaDeSubida, 'ms' | 'operationId'>): TrazaDeSubida =>
    ({ operationId: peticion.operationId, ...t, ms: ahora() - empezo });
  const no = (motivo: MotivoDeSubida, t: Omit<TrazaDeSubida, 'ms' | 'operationId' | 'resultado'>): DesenlaceDeConfirmacion =>
    ({ ok: false, motivo, traza: fin({ ...t, resultado: motivo }) });

  if (typeof peticion.principalId !== 'string' || !peticion.principalId) {
    return no('no_disponible', { detalle: 'principal_invalido' });
  }
  const cuenta = await deps.cuentaDelPrincipal(peticion.principalId, peticion.cuentaSolicitada);
  if (!cuenta) return no('no_disponible', { detalle: 'sin_cuenta' });
  const accountId = cuenta.accountId;

  const material = (await deps.leerMaterial(peticion.assetId)) ?? undefined;
  if (!material) return no('no_disponible', { accountId, detalle: 'sin_material' });
  if (material.ownerAccountId !== accountId) return no('no_disponible', { accountId, detalle: 'no_es_tuyo' });
  if (!material.storageRef) return no('no_disponible', { accountId, assetId: material.assetId, detalle: 'sin_destino' });

  const registro = deps.registro ?? registroDeMediosDeWee();
  const adaptadores = deps.adaptadores ?? adaptadoresDeMedios();
  const providerId = material.storageRef.provider;
  const objectRef = referenciaDelObjeto(huellaDeMedios, material.storageRef);
  const objetos = deps.objetos ?? almacenDeObjetosDeMedios(deps.db);

  /*
   * Ya estaba listo: confirmar dos veces no es un error. Se contesta con la
   * ficha que ya hay, sin volver a preguntarle al proveedor.
   */
  if (material.status === 'ready' && objectRef) {
    const ficha = await objetos.leer(objectRef, accountId);
    if (ficha) return { ok: true, assetId: material.assetId, bytes: ficha.bytes ?? 0, objectRef, traza: fin({ accountId, assetId: material.assetId, objectRef, providerId, resultado: 'confirmada', detalle: 'ok' }) };
  }
  if (material.status !== 'uploading') return no('no_disponible', { accountId, assetId: material.assetId, objectRef, providerId, detalle: 'material_no_admite_bytes' });
  if (!objectRef) return no('no_disponible', { accountId, assetId: material.assetId, providerId, detalle: 'sin_destino' });

  const puerto = adaptadores[providerId];
  if (!puerto) return no('no_disponible', { accountId, assetId: material.assetId, objectRef, providerId, detalle: 'sin_adaptador' });

  /* La única llamada al proveedor de toda la confirmación: metadata, no bytes. */
  const visto = await puerto.mirar(material.storageRef);
  if (!visto.ok) {
    /* 404 no es un fallo: es «todavía no están los bytes». No lleva status porque no hace falta. */
    if (visto.motivo === 'no_existe') {
      return { ok: false, motivo: 'pendiente', traza: fin({ accountId, assetId: material.assetId, objectRef, providerId, resultado: 'pendiente', detalle: 'bytes_no_estan' }) };
    }
    const status = statusDelProveedor(visto.error);
    return no('no_disponible', {
      accountId, assetId: material.assetId, objectRef, providerId, detalle: 'bytes_no_estan',
      ...(status !== undefined ? { statusDelProveedor: status } : {}),
    });
  }

  /*
   * Lo que de verdad pesa. El proveedor puede no haber impuesto el tope, así que
   * se comprueba aquí: un objeto que se pasó NO se da por bueno ni se marca
   * listo. Retirarlo es del ciclo de vida, que es otra fase.
   */
  const descriptor = registro.buscar(providerId);
  const tope = topeDeSubida(deps.politica, descriptor?.limites?.maxBytesDeUnaSubida);
  if (tamanoAprobado(visto.objeto.bytes, tope) === undefined) {
    return no('peticion_invalida', { accountId, assetId: material.assetId, objectRef, providerId, detalle: 'bytes_de_mas' });
  }

  /* La ficha del objeto: el `create` idempotente de MC-1, sin cambiar nada suyo. */
  const at = ahora();
  const ficha: MediaObject = {
    objectRef,
    providerId,
    accountId,
    assetId: material.assetId,
    pieza: PIEZA_ORIGINAL,
    ...(material.storageRef.bucket ? { bucket: material.storageRef.bucket } : {}),
    objectKey: material.storageRef.objectKey,
    ...(visto.objeto.etiquetaDelProveedor ? { etiquetaDelProveedor: visto.objeto.etiquetaDelProveedor } : {}),
    estado: 'guardado',
    bytes: visto.objeto.bytes,
    contentType: visto.objeto.contentType ?? material.mimeType,
    createdAt: at,
    updatedAt: at,
  };
  const alta = await objetos.registrar(ficha);
  if (!alta.ok) {
    return no('no_disponible', { accountId, assetId: material.assetId, objectRef, providerId, detalle: alta.motivo === 'de_otra_cuenta' ? 'no_es_tuyo' : 'material_no_creado' });
  }

  /* Y el material pasa a listo, por la puerta de la Fase 11. */
  const cerrado = await deps.marcarSubido(accountId, material.assetId, { bytes: alta.objeto.bytes, mimeType: alta.objeto.contentType });
  if (cerrado.status !== 'listo' && cerrado.status !== 'ya_estaba_listo') {
    return no('no_disponible', { accountId, assetId: material.assetId, objectRef, providerId, detalle: 'material_no_admite_bytes' });
  }

  return {
    ok: true,
    assetId: material.assetId,
    bytes: alta.objeto.bytes ?? 0,
    objectRef,
    traza: fin({ accountId, assetId: material.assetId, objectRef, providerId, resultado: 'confirmada', detalle: 'ok' }),
  };
};
