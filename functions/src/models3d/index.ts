import type { Firestore } from 'firebase-admin/firestore';
import { Asset, UploadIntent } from '../core';
import { DepsDeSubida, TrazaDeSubida, confirmarSubida, identidadDeMaterialDeSubida, solicitarSubida } from '../media';

/**
 * 3D DENTRO DE FILMMAKER · IMPORTAR UN MODELO 3D: LA LÓGICA DE LA PUERTA.
 *
 * ── Qué es esto, y qué no ───────────────────────────────────────────────────
 *
 * Una persona trae un modelo suyo (un GLB) y ese archivo pasa a ser material de
 * su CUENTA: el mismo que ve en Mis creaciones y el mismo al que puede apuntar un
 * Element. No hay aquí un almacén, ni un segundo camino de subida, ni otra ficha:
 *
 *     la cuenta            `cuentaDelPrincipal` — la de siempre, desde la sesión
 *     el material          `crearMaterialParaSubida` (Fase 11), nace `uploading`
 *     los bytes            `solicitarSubida` (MC-3): van del cliente al almacén
 *     «ya están»           `confirmarSubida` (MC-3): se MIRA el objeto
 *     listo                `marcarMaterialSubido` (Fase 11), dentro de lo anterior
 *
 * Lo único que esta capa decide es lo que es SUYO: que solo entra un GLB, que la
 * puerta está abierta para esa cuenta y qué se cuenta del modelo.
 *
 * ── Lo que admite, escrito en el código ─────────────────────────────────────
 *
 * El tipo de material y el tipo de contenido NO los elige quien llama. Son estos
 * dos, y la configuración puede CERRAR la puerta, nunca ampliarla: el día que
 * entre otro formato (glTF de varios archivos, OBJ con sus texturas) se escribe
 * aquí, con su prueba, no se abre desde Firestore.
 *
 * ── Nace cerrada ────────────────────────────────────────────────────────────
 *
 * `aiSettings/modelos3d`, que solo lee el servidor: sin documento, sin
 * `habilitado` o sin a quién, cerrada. Y además la puerta NO está exportada en
 * `functions/src/index.ts`: Media Cloud sigue sin estar activo para nadie
 * (`media-core`, `media-upload-core`), y encenderlo es una decisión del dueño.
 */

/** La puerta, cerrada por defecto y por cuentas concretas (la misma forma que `aiSettings/render`). */
export const PUERTA_DE_MODELOS_3D = 'aiSettings/modelos3d';

/** Lo único que entra por aquí. Un GLB es un solo archivo, con sus texturas dentro: no hay piezas que se pierdan. */
export const LO_QUE_ADMITE_LA_IMPORTACION = Object.freeze({
  kind: 'model3d' as Asset['kind'],
  contentType: 'model/gltf-binary',
});

export interface PuertaDeModelos3d {
  readonly habilitado: boolean;
  readonly todas: boolean;
  readonly cuentas: readonly string[];
}

export const PUERTA_DE_MODELOS_3D_CERRADA: PuertaDeModelos3d = Object.freeze({ habilitado: false, todas: false, cuentas: Object.freeze([]) });

/**
 * CERRADA SI NO DICE OTRA COSA.
 *
 *   { habilitado: true, cuentas: [...] }   solo esas cuentas
 *   { habilitado: true, todas: true }      todas —y hay que escribirlo—
 *
 * Una lista vacía NO abre para todos, y un documento que no se puede leer deja la
 * puerta cerrada: una puerta que no se sabe si está abierta, está cerrada.
 */
export const leerPuertaDeModelos3d = async (db: Firestore): Promise<PuertaDeModelos3d> => {
  try {
    const snap = await db.doc(PUERTA_DE_MODELOS_3D).get();
    const d = (snap.exists ? snap.data() : undefined) as Record<string, unknown> | undefined;
    if (!d || d.habilitado !== true) return PUERTA_DE_MODELOS_3D_CERRADA;
    const cuentas = Array.isArray(d.cuentas)
      ? d.cuentas.filter((c): c is string => typeof c === 'string' && c.length > 0 && c.length <= 128).slice(0, 500)
      : [];
    return Object.freeze({ habilitado: true, todas: d.todas === true, cuentas: Object.freeze(cuentas) });
  } catch {
    return PUERTA_DE_MODELOS_3D_CERRADA;
  }
};

export const puertaDeModelos3dAbiertaPara = (p: PuertaDeModelos3d, accountId: string): boolean =>
  p.habilitado && (p.todas || p.cuentas.includes(accountId));

/* ── Lo que se cuenta del modelo ───────────────────────────────────────────── */

/** Cuántas piezas tiene: lo que la app leyó de la cabecera del GLB. Descriptivo, nunca una decisión. */
export interface MetadatosDelModelo {
  readonly mallas?: number;
  readonly materiales?: number;
  readonly animaciones?: number;
  readonly nodos?: number;
}

const MAX_PIEZAS = 100_000;

/**
 * LO QUE EL CLIENTE CUENTA DEL MODELO, ACOTADO.
 *
 * Es información para enseñarlo («3 mallas, 1 animación»), no para decidir nada:
 * ni el dueño, ni el tamaño, ni el tipo salen de aquí. Aun así se copia campo a
 * campo lo que tiene forma —enteros pequeños— y lo demás no existe. Se guarda en
 * `metadata` del material con el formato, que ese sí lo pone la puerta.
 */
export const metadatosDelModelo = (crudo: unknown): Readonly<Record<string, string | number>> => {
  const salida: Record<string, string | number> = { formato: 'glb', gltf: '2.0' };
  if (typeof crudo !== 'object' || crudo === null) return Object.freeze(salida);
  const d = crudo as Record<string, unknown>;
  for (const campo of ['mallas', 'materiales', 'animaciones', 'nodos'] as const) {
    const v = d[campo];
    if (typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 && v <= MAX_PIEZAS) salida[campo] = v;
  }
  return Object.freeze(salida);
};

/* ── La petición y la respuesta ────────────────────────────────────────────── */

export type OperacionDeModelos3d = 'estado' | 'pedir_subida' | 'confirmar_subida';
export const OPERACIONES_DE_MODELOS_3D: readonly OperacionDeModelos3d[] = Object.freeze(['estado', 'pedir_subida', 'confirmar_subida'] as const);

/** La clave de la operación: la pone el cliente UNA vez por importación y de ella sale el material. */
export const FORMA_DE_CLAVE_DE_IMPORTACION = /^[A-Za-z0-9_-]{8,128}$/;

/**
 * LO QUE SE LE CONTESTA A LA APP.
 *
 * `no_disponible` es la misma respuesta para «no existe», «no es tuyo» y «no hay
 * almacén»: pedir importaciones no sirve para averiguar nada ajeno. Lo que SÍ se
 * dice es lo que depende de quien llama —un tamaño que no cabe, una clave mal
 * formada— y que la puerta está cerrada, que no es un secreto de nadie.
 */
export type RespuestaDeModelos3d =
  | { readonly ok: true; readonly op: 'estado'; readonly importar: boolean }
  | { readonly ok: true; readonly op: 'pedir_subida'; readonly subida: UploadIntent }
  | { readonly ok: true; readonly op: 'confirmar_subida'; readonly assetId: string; readonly bytes: number }
  | { readonly ok: false; readonly motivo: 'cerrada' | 'no_disponible' | 'pendiente' }
  | { readonly ok: false; readonly motivo: 'peticion_invalida'; readonly detalle: 'operacion' | 'clave' | 'tamano' | 'nombre' | 'vigencia' | 'tipo' };

export interface DepsDeModelos3d extends DepsDeSubida {
  /** ¿Está abierta para esta cuenta? Por defecto, `aiSettings/modelos3d`. */
  readonly puertaAbierta: (accountId: string) => Promise<boolean>;
  /** Una línea por operación, sin URL ni credencial. Por defecto, la consola de la Function. */
  readonly registrar?: (linea: Readonly<Record<string, unknown>>) => void;
}

const texto = (v: unknown, max: number): string | undefined => {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t.length > 0 && t.length <= max ? t : undefined;
};

/** Lo que se registra de la subida: el resultado y su porqué, nunca la URL (una URL de subida es una credencial). */
const lineaDe = (op: OperacionDeModelos3d, t: TrazaDeSubida): Readonly<Record<string, unknown>> => ({
  puerta: 'models3d', op, resultado: t.resultado, detalle: t.detalle, ms: t.ms,
  ...(t.statusDelProveedor !== undefined ? { statusDelProveedor: t.statusDelProveedor } : {}),
});

/**
 * ATENDER UNA PETICIÓN DE LA PUERTA.
 *
 * El orden lo dicta la seguridad: primero QUIÉN (la sesión), después si la puerta
 * está abierta para esa cuenta —antes de escribir nada—, y solo entonces la
 * operación, con el tipo y el formato puestos aquí.
 */
export const atenderModelos3d = async (
  deps: DepsDeModelos3d,
  principalId: string,
  datos: unknown,
): Promise<RespuestaDeModelos3d> => {
  const d = (typeof datos === 'object' && datos !== null ? datos : {}) as Record<string, unknown>;
  const op = d.op as OperacionDeModelos3d;
  if (!OPERACIONES_DE_MODELOS_3D.includes(op)) return { ok: false, motivo: 'peticion_invalida', detalle: 'operacion' };

  if (typeof principalId !== 'string' || !principalId) return { ok: false, motivo: 'no_disponible' };
  const cuenta = await deps.cuentaDelPrincipal(principalId);
  if (!cuenta) return { ok: false, motivo: 'no_disponible' };
  const accountId = cuenta.accountId;
  /* La cuenta ya resuelta: la subida no la vuelve a pedir, y no puede salir otra. */
  const conLaCuenta: DepsDeSubida = { ...deps, cuentaDelPrincipal: async () => cuenta };

  const abierta = await deps.puertaAbierta(accountId);
  if (op === 'estado') return { ok: true, op, importar: abierta };
  if (!abierta) return { ok: false, motivo: 'cerrada' };

  const operationId = typeof d.operationId === 'string' ? d.operationId : '';
  if (!FORMA_DE_CLAVE_DE_IMPORTACION.test(operationId)) return { ok: false, motivo: 'peticion_invalida', detalle: 'clave' };
  const registrar = deps.registrar ?? ((l) => console.info('models3d', JSON.stringify(l)));

  if (op === 'pedir_subida') {
    if (d.nombre !== undefined && !texto(d.nombre, 120)) return { ok: false, motivo: 'peticion_invalida', detalle: 'nombre' };
    const metadata = metadatosDelModelo(d.metadatos);
    /*
     * El material nace con lo que se cuenta del modelo. No se toca MC-3 para eso: se
     * compone la misma función de la Fase 11 con un campo más, y MC-3 no se entera.
     */
    const conMetadatos: DepsDeSubida = {
      ...conLaCuenta,
      crearMaterial: (nuevo) => deps.crearMaterial({ ...nuevo, metadata }),
    };
    const r = await solicitarSubida(conMetadatos, {
      principalId,
      operationId,
      kind: LO_QUE_ADMITE_LA_IMPORTACION.kind,
      contentType: LO_QUE_ADMITE_LA_IMPORTACION.contentType,
      bytes: typeof d.bytes === 'number' ? d.bytes : Number.NaN,
      ...(texto(d.nombre, 120) ? { name: texto(d.nombre, 120) } : {}),
    });
    registrar(lineaDe(op, r.traza));
    if (r.ok) return { ok: true, op, subida: r.intento };
    if (r.motivo === 'peticion_invalida') {
      const detalle = r.traza.detalle === 'vigencia' || r.traza.detalle === 'tipo' ? r.traza.detalle : 'tamano';
      return { ok: false, motivo: 'peticion_invalida', detalle };
    }
    return { ok: false, motivo: 'no_disponible' };
  }

  /* confirmar_subida: el material NO lo nombra quien llama; se deriva de su clave, como al pedir. */
  const assetId = identidadDeMaterialDeSubida(accountId, operationId);
  if (!assetId) return { ok: false, motivo: 'peticion_invalida', detalle: 'clave' };
  const material = (await deps.leerMaterial(assetId)) ?? undefined;
  /*
   * Esta puerta solo cierra lo que ella abrió: un modelo GLB de esta cuenta. La misma
   * clave usada por otro camino (otro tipo de material) no se confirma desde aquí.
   */
  if (!material || material.ownerAccountId !== accountId
    || material.kind !== LO_QUE_ADMITE_LA_IMPORTACION.kind || material.mimeType !== LO_QUE_ADMITE_LA_IMPORTACION.contentType) {
    return { ok: false, motivo: 'no_disponible' };
  }
  const r = await confirmarSubida(conLaCuenta, { principalId, assetId, operationId });
  registrar(lineaDe(op, r.traza));
  if (r.ok) return { ok: true, op, assetId: r.assetId, bytes: r.bytes };
  if (r.motivo === 'pendiente') return { ok: false, motivo: 'pendiente' };
  if (r.motivo === 'peticion_invalida') return { ok: false, motivo: 'peticion_invalida', detalle: 'tamano' };
  return { ok: false, motivo: 'no_disponible' };
};
