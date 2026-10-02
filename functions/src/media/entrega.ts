import type { Firestore } from 'firebase-admin/firestore';
import {
  Asset,
  DetalleDeEntrega,
  Entrega,
  MotivoDeEntrega,
  PoliticaDeEntrega,
  PuertoDeAlmacenamiento,
  RegistroDeProveedoresDeMedios,
  decidirEntrega,
  esStorageRef,
  huellaDeEntrega,
  referenciaDelObjeto,
} from '../core';
import { leerMaterial } from '../content';
import { cuentaDelPrincipalEnWee } from '../identity/cuentas';
import { AlmacenDeObjetosDeMedios, almacenDeObjetosDeMedios } from './almacen';
import { huellaDeMedios } from './huella';
import { adaptadoresDeMedios, registroDeMediosDeWee } from './catalogo';

/**
 * WEE MEDIA DELIVERY — CÓMO SE ENTREGA ALGO SIN DECIR DÓNDE ESTÁ.
 *
 * ── La cadena, y por qué es en ese orden ────────────────────────────────────
 *
 *     principal        quién ha iniciado sesión
 *        ↓             la puerta que YA existe (`cuentaDelPrincipalEnWee`)
 *     cuenta de Weë
 *        ↓             la Fase 11 sigue siendo Source of Truth
 *     material
 *        ↓             su identidad DERIVADA, no una consulta
 *     ficha del objeto
 *        ↓             el registro dice quién puede firmar
 *     adaptador
 *        ↓
 *     llave temporal
 *
 * Quien pide manda UN dato: el identificador del material. No manda contenedor,
 * ni clave, ni proveedor, ni cuenta — y si los mandara, no se leerían: la cuenta
 * sale de la sesión y todo lo demás sale de lo que hay guardado. Esa es la
 * diferencia entre autorizar y creerse lo que llega.
 *
 * ── Lo que esto NO hace ─────────────────────────────────────────────────────
 *
 * No sabe qué es R2. No guarda la llave en ninguna parte. No la escribe en
 * ningún registro. No toca el campo `delivery` de la Fase 11, que es otra cosa:
 * aquella es una URL PERMANENTE de los proveedores heredados, y esta es una
 * llave que caduca. Y no cobra nada: firmar no es una operación de Credits.
 */

/* ── 1 · Lo que hace falta para responder ──────────────────────────────────── */

export interface DepsDeEntrega {
  db: Firestore;
  /**
   * De qué cuenta puede actuar un principal. Es **la puerta que ya existe** en
   * `identity/cuentas.ts`; entra por aquí para poder probar esto sin Firestore y
   * para no escribir una segunda forma de contestar esa pregunta.
   */
  cuentaDelPrincipal: (principalId: string, cuentaSolicitada?: string) => Promise<{ accountId: string } | null>;
  /** El material, leído de donde la Fase 11 lo guarda. */
  leerMaterial: (assetId: string) => Promise<Asset | null | undefined>;
  objetos?: AlmacenDeObjetosDeMedios;
  registro?: RegistroDeProveedoresDeMedios;
  adaptadores?: Readonly<Record<string, PuertoDeAlmacenamiento>>;
  politica?: PoliticaDeEntrega;
  ahora?: () => number;
}

/**
 * LAS DOS PUERTAS DE WEË, ATADAS. No hay terceras.
 *
 * La cuenta la resuelve `cuentaDelPrincipalEnWee` —la única función de todo Weë
 * que contesta «de qué cuenta puede actuar alguien»— y el material lo lee
 * `leerMaterial`, que es por donde ya pasan borrar y anotar una variante. MC-2
 * no escribe una segunda forma de hacer ninguna de las dos cosas: las usa.
 */
export const depsDeEntregaDeWee = (db: Firestore): DepsDeEntrega => ({
  db,
  cuentaDelPrincipal: (principalId, cuentaSolicitada) => cuentaDelPrincipalEnWee(db, principalId, cuentaSolicitada),
  leerMaterial: (assetId) => leerMaterial(assetId),
});

export interface PeticionDeEntrega {
  /** Quién pide. Del contexto autenticado, nunca del cuerpo de la petición. */
  principalId: string;
  /** Desde qué cuenta actúa, si no es la suya. La membresía la comprueba la puerta. */
  cuentaSolicitada?: string;
  /** LO ÚNICO que el cliente elige. */
  assetId: string;
  vigenciaSegundos?: number;
  /** Para poder seguir esta operación en los registros. */
  operationId?: string;
}

/**
 * LO QUE SE PUEDE REGISTRAR DE UNA ENTREGA.
 *
 * Todo lo que hace falta para entender qué pasó, y **nada que sirva para
 * entrar**: de la llave solo viaja su huella. Una URL firmada en un log es una
 * credencial en un log, y sigue funcionando hasta que caduca.
 */
export interface TrazaDeEntrega {
  operationId?: string;
  accountId?: string;
  assetId?: string;
  objectRef?: string;
  providerId?: string;
  resultado: 'entregada' | MotivoDeEntrega;
  /** El porqué exacto. Se queda dentro: hacia fuera la respuesta es uniforme. */
  detalle: DetalleDeEntrega | 'principal_invalido' | 'sin_cuenta' | 'sin_adaptador' | 'firma_fallida' | 'ok';
  ms: number;
  /** `ent_<16 hex>`. Sirve para cruzar un problema con su llave sin escribirla. */
  huellaDeUrl?: string;
}

export type DesenlaceDeEntrega =
  | { ok: true; entrega: Entrega; traza: TrazaDeEntrega }
  | { ok: false; motivo: MotivoDeEntrega; traza: TrazaDeEntrega };

/* ── 2 · La operación ──────────────────────────────────────────────────────── */

/**
 * PEDIR UNA LLAVE TEMPORAL PARA UN MATERIAL.
 *
 * Tres lecturas acotadas y una firma local, y ninguna de las tres es una
 * consulta: el material por su identificador, la ficha por una identidad que se
 * DERIVA de dónde están los bytes —eso es lo que compró la idempotencia de
 * MC-1—, y el proveedor por su nombre en el registro. Sin recorrer colecciones,
 * sin índices nuevos, sin N+1 y sin nada que crezca con el número de materiales
 * que tenga nadie.
 *
 * Firmar no toca la red: es determinista y local, así que esto es una operación
 * corta y no necesita cola, trabajo ni reintento.
 */
export const solicitarEntrega = async (
  deps: DepsDeEntrega,
  peticion: PeticionDeEntrega,
): Promise<DesenlaceDeEntrega> => {
  const ahora = deps.ahora ?? (() => Date.now());
  const empezo = ahora();
  const base = { operationId: peticion.operationId };
  const fin = (t: Omit<TrazaDeEntrega, 'ms' | 'operationId'>): TrazaDeEntrega => ({ ...base, ...t, ms: ahora() - empezo });
  const no = (motivo: MotivoDeEntrega, t: Omit<TrazaDeEntrega, 'ms' | 'operationId' | 'resultado'>): DesenlaceDeEntrega =>
    ({ ok: false, motivo, traza: fin({ ...t, resultado: motivo }) });

  /* 1 · Quién pide. */
  if (typeof peticion.principalId !== 'string' || !peticion.principalId) {
    return no('no_disponible', { detalle: 'principal_invalido' });
  }
  /* 2 · Desde qué cuenta puede actuar. Una sola puerta en todo Weë. */
  const cuenta = await deps.cuentaDelPrincipal(peticion.principalId, peticion.cuentaSolicitada);
  if (!cuenta) return no('no_disponible', { detalle: 'sin_cuenta' });
  const accountId = cuenta.accountId;

  /* 3 · El material. La Fase 11 manda. */
  const material = (await deps.leerMaterial(peticion.assetId)) ?? undefined;

  /*
   * 4 · La ficha del objeto, SIN consultar: su identidad se deriva de dónde
   * están los bytes. Si el material no tiene referencia de almacén, no hay nada
   * que derivar y la decisión lo dirá.
   */
  const objectRef = material?.storageRef && esStorageRef(material.storageRef)
    ? referenciaDelObjeto(huellaDeMedios, material.storageRef)
    : undefined;
  const objetos = deps.objetos ?? almacenDeObjetosDeMedios(deps.db);
  const objeto = objectRef ? await objetos.leer(objectRef, accountId) : undefined;

  /* 5 · La decisión: pura, sobre lo ya leído. */
  const registro = deps.registro ?? registroDeMediosDeWee();
  const decision = decidirEntrega({
    accountId, material, objeto, registro,
    vigenciaSegundos: peticion.vigenciaSegundos,
    politica: deps.politica,
  });
  if (!decision.permitida) {
    return no(decision.motivo, { accountId, assetId: peticion.assetId, objectRef, detalle: decision.detalle });
  }

  /* 6 · La llave. La pone el adaptador; aquí no se sabe de qué proveedor es. */
  const adaptadores = deps.adaptadores ?? adaptadoresDeMedios();
  const puerto = adaptadores[decision.providerId];
  if (!puerto?.urlFirmada) {
    return no('no_disponible', { accountId, assetId: peticion.assetId, objectRef, providerId: decision.providerId, detalle: 'sin_adaptador' });
  }
  const firmada = await puerto.urlFirmada(
    { provider: decision.objeto.providerId, ...(decision.objeto.bucket ? { bucket: decision.objeto.bucket } : {}), objectKey: decision.objeto.objectKey },
    decision.vigenciaSegundos,
  );
  if (!firmada.ok) {
    return no('no_disponible', { accountId, assetId: peticion.assetId, objectRef, providerId: decision.providerId, detalle: 'firma_fallida' });
  }

  /*
   * 7 · Y se devuelve sin guardarla. Aquí NO hay escritura: ni en el material,
   * ni en la ficha, ni en ningún sitio. La llave existe mientras dura esta
   * respuesta, y cuando caduque el material seguirá estando.
   */
  return {
    ok: true,
    entrega: {
      assetId: decision.objeto.assetId,
      url: firmada.url,
      expiraEn: firmada.expiraEn,
      vigenciaSegundos: decision.vigenciaSegundos,
    },
    traza: fin({
      accountId, assetId: decision.objeto.assetId, objectRef,
      providerId: decision.providerId, resultado: 'entregada', detalle: 'ok',
      huellaDeUrl: huellaDeEntrega(huellaDeMedios, firmada.url),
    }),
  };
};
