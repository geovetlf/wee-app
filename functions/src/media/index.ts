import type { Firestore } from 'firebase-admin/firestore';
import {
  MediaObject,
  PIEZA_ORIGINAL,
  PuertoDeAlmacenamiento,
  RegistroDeProveedoresDeMedios,
  StorageRef,
  WeeError,
  claveDelObjeto,
  crearRegistroDeMedios,
  falloDeAlmacen,
  proveedorParaGuardar,
  referenciaDelObjeto,
} from '../core';
import { env } from '../engine/http';
import { AlmacenDeObjetosDeMedios, almacenDeObjetosDeMedios } from './almacen';
import { huellaDeMedios } from './huella';
import { DESCRIPTOR_DE_R2, R2_PROVIDER_ID, crearAdaptadorDeR2 } from './r2';

/**
 * WEE MEDIA — LA COMPOSICIÓN.
 *
 * Aquí se juntan las piezas puras del Core con lo que SON en Weë: el registro
 * vivo con R2 dentro y el almacén de fichas sobre Firestore.
 *
 * Esto NOMBRA a los proveedores; no los configura. Cada adaptador resuelve su
 * propia configuración dentro de sí mismo, y por eso `guardarMaterial` no
 * menciona a ninguno: pregunta al puerto y compone.
 *
 * NADA DE PRODUCCIÓN PASA POR AQUÍ TODAVÍA. Ninguna Function importa este
 * archivo, no hay bucket creado y no se ha escrito un solo byte en R2. MC-1
 * construye la capa; encenderla es un paso aparte que pide autorización.
 */

/** El catálogo vivo. Hoy un proveedor; mañana, uno más en esta lista y nada más cambia. */
export const registroDeMediosDeWee = (): RegistroDeProveedoresDeMedios =>
  crearRegistroDeMedios([DESCRIPTOR_DE_R2]).registro;

/**
 * Los adaptadores de verdad, por su identidad. El de mentira no está aquí: es
 * de las pruebas. **Cada uno resuelve su propia configuración**: esto los
 * nombra, no los configura.
 */
export const adaptadoresDeMedios = (): Readonly<Record<string, PuertoDeAlmacenamiento>> => ({
  [R2_PROVIDER_ID]: crearAdaptadorDeR2(),
});

/** Cuál se usa hoy. Se puede cambiar sin tocar código con `MEDIA_PROVIDER`. */
export const proveedorConfigurado = (): string => env('MEDIA_PROVIDER') || R2_PROVIDER_ID;

/* ── Guardar el original de un material ────────────────────────────────────── */

export interface PeticionDeAlmacenamientoDeMaterial {
  /**
   * LA CUENTA, resuelta en el servidor. Del material guardado o de la sesión
   * autenticada — **nunca de lo que mande un cliente**.
   */
  accountId: string;
  /** El material de la Fase 11 al que pertenecen estos bytes. */
  assetId: string;
  cuerpo: Buffer;
  contentType: string;
  /** Qué pieza es. Hoy solo el original; los derivados llegan en fases posteriores. */
  pieza?: string;
}

export type DesenlaceDeAlmacenamientoDeMaterial =
  /* Están guardados y registrados. `yaEstaba` es cierto si otra llegada se adelantó. */
  | { ok: true; objeto: MediaObject; ref: StorageRef; yaEstaba: boolean }
  | { ok: false; error: WeeError };

export interface DepsDeMedios {
  db: Firestore;
  registro?: RegistroDeProveedoresDeMedios;
  adaptadores?: Readonly<Record<string, PuertoDeAlmacenamiento>>;
  objetos?: AlmacenDeObjetosDeMedios;
  proveedor?: string;
  ahora?: () => number;
}

/**
 * GUARDAR LOS BYTES DE UN MATERIAL, Y DEJAR CONSTANCIA DE DÓNDE ESTÁN.
 *
 * El orden importa y es el mismo que el de la materialización de F12-D: primero
 * los bytes, después la ficha. Si los bytes no se guardan, no hay ficha que
 * mienta; si la ficha falla, los bytes están y se vuelven a registrar sin
 * duplicar nada, porque la clave y la identidad son deterministas.
 *
 * ── Por qué esto es idempotente de verdad ───────────────────────────────────
 *
 *   la clave     se DERIVA de (cuenta, material, pieza) → siempre la misma
 *   los bytes    se escriben con «solo si está libre» → nadie pisa a nadie
 *   la identidad se DERIVA de dónde está → la misma ficha
 *   la ficha     se crea solo si no existe → una, no dos
 *
 * Repetir esta llamada con los mismos argumentos deja exactamente un objeto y
 * exactamente una ficha, la llame quien la llame y las veces que la llame.
 */
export const guardarMaterial = async (
  deps: DepsDeMedios,
  peticion: PeticionDeAlmacenamientoDeMaterial,
): Promise<DesenlaceDeAlmacenamientoDeMaterial> => {
  const ahora = deps.ahora ?? (() => Date.now());
  const registro = deps.registro ?? registroDeMediosDeWee();
  const adaptadores = deps.adaptadores ?? adaptadoresDeMedios();
  const objetos = deps.objetos ?? almacenDeObjetosDeMedios(deps.db);
  const pieza = peticion.pieza ?? PIEZA_ORIGINAL;

  /* 1 · Con qué se guarda. Quien llama no elige y no conoce al proveedor. */
  const elegido = proveedorParaGuardar(registro, deps.proveedor ?? proveedorConfigurado());
  if (!elegido) return { ok: false, error: falloDeAlmacen('media', 'no_configurado', { reason_detail: 'sin proveedor de almacenamiento' }) };
  const puerto = adaptadores[elegido.id];
  if (!puerto) return { ok: false, error: falloDeAlmacen(elegido.id, 'no_configurado', { reason_detail: 'sin adaptador' }) };

  /* 2 · Dónde. La clave la DERIVA Weë, aislada por cuenta, y nunca llega de fuera. */
  const objectKey = claveDelObjeto(peticion.accountId, peticion.assetId, pieza);
  if (!objectKey) return { ok: false, error: falloDeAlmacen(elegido.id, 'peticion_invalida', { field: 'objectKey' }) };

  /*
   * El contenedor lo dice EL PUERTO, no una variable de un proveedor concreto.
   * Aquí se leía `R2_BUCKET`, y eso ataba el camino genérico a R2: con otro
   * proveedor elegido, la ficha se quedaba con el contenedor de R2 dentro. Un
   * proveedor nuevo no tiene que tocar nada de esta función.
   */
  const bucket = puerto.contenedor;
  const ref: StorageRef = { provider: elegido.id, ...(bucket ? { bucket } : {}), objectKey };
  const objectRef = referenciaDelObjeto(huellaDeMedios, ref);
  if (!objectRef) return { ok: false, error: falloDeAlmacen(elegido.id, 'peticion_invalida', { field: 'destino' }) };

  /* 3 · Los bytes primero, y solo si la clave está libre. */
  const guardado = await puerto.guardar({
    destino: ref,
    cuerpo: peticion.cuerpo,
    contentType: peticion.contentType,
    siNoExiste: true,
    /* Escalares para poder mirar después. Ni secretos, ni contenido de nadie. */
    metadatos: { assetid: peticion.assetId, pieza },
  });
  if (!guardado.ok) return { ok: false, error: guardado.error };

  /* 4 · La ficha después. Si esto falla, los bytes siguen ahí y se reintenta sin duplicar. */
  const at = ahora();
  const ficha: MediaObject = {
    objectRef,
    providerId: elegido.id,
    accountId: peticion.accountId,
    assetId: peticion.assetId,
    pieza,
    ...(bucket ? { bucket } : {}),
    objectKey,
    ...(guardado.objeto.etiquetaDelProveedor ? { etiquetaDelProveedor: guardado.objeto.etiquetaDelProveedor } : {}),
    estado: 'guardado',
    bytes: guardado.objeto.bytes,
    contentType: guardado.objeto.contentType ?? peticion.contentType,
    createdAt: at,
    updatedAt: at,
  };
  const alta = await objetos.registrar(ficha);
  if (!alta.ok) return { ok: false, error: falloDeAlmacen(elegido.id, alta.motivo === 'de_otra_cuenta' ? 'sin_permiso' : 'respuesta_ilegible', { reason_detail: alta.motivo }) };

  return { ok: true, objeto: alta.objeto, ref, yaEstaba: guardado.yaExistia || alta.yaEstaba };
};

export { almacenDeObjetosDeMedios, COLECCION_DE_OBJETOS } from './almacen';
export type { AlmacenDeObjetosDeMedios, AltaDeObjeto } from './almacen';
export { crearAdaptadorDeR2, DESCRIPTOR_DE_R2, R2_ENV, R2_PROVIDER_ID, R2_REGION, anfitrionDeR2, configuracionDeR2, configuracionDeR2Valida } from './r2';
export { firmar, codificarParaFirma, marcasDeTiempo, rutaCanonicaDeObjeto } from './firma';
export { huellaDeMedios } from './huella';
