/**
 * ALTER EGOS — LAS DOS PUERTAS (F4 del plan de alter egos, 2026-11-23).
 *
 *   crearAlterEgo({ clave, displayName, bio?, avatar? })  → { uid, entityId }
 *   retirarAlterEgo({ perfilId, confirmacion })           → { ok, retirada }
 *
 * Una cuenta tiene su Perfil Real y hasta N Perfiles Weë (D1: 5, configurable en
 * `identitySettings/limites`, nunca por encima del techo del Core). Lo que decide
 * vive en el Core (`core/account-identity.ts`: `crearAlterEgo`, `retirarAlterEgo`)
 * y su composición sobre Firestore en `identity/cuentas.ts`; aquí solo se
 * comprueba quién llama, se traduce el resultado y, al retirar, se ejecuta el
 * borrado de esa cara (`cuenta/borrado.ts` → `planDeBorradoDeUnAlterEgo`).
 *
 * ── Crear ───────────────────────────────────────────────────────────────────
 *   1. cuenta Weë válida (`exigirCuentaWeeValida`: autenticada, 18+ y país);
 *   2. una cuenta desactivada (sus 30 días para volver) no crea nada;
 *   3. la cuenta nace si no había nacido (`asegurarCuentaEnWee`, idempotente; D8);
 *   4. el Core lo crea en UNA transacción, idempotente por `clave`.
 *   Es GRATIS (D3): no toca Credits ni llama a ninguna IA. Devuelve `{ uid,
 *   entityId }` y NUNCA la cuenta, su número ni su secuencia.
 *
 * ── Retirar ─────────────────────────────────────────────────────────────────
 *   INMEDIATO (D10): sin los 30 días de la cuenta, y sin vuelta. Por eso pide lo
 *   mismo que eliminar la cuenta: la confirmación constante y un inicio de sesión
 *   reciente. Después, en este orden:
 *   1. se apaga el pase de autonomía del personaje (deja de cobrar en el acto);
 *   2. el Core lo retira: entidad `RETIRED`, fuera de `identidadesWee`, hueco libre,
 *      secuencia que no se reutiliza;
 *   3. si es la cara heredada, se le quita el vínculo guardado (en su perfil y en
 *      el Perfil Real), para que el resolutor deje de aceptarla aunque el borrado
 *      se cortara a medias;
 *   4. el plan de borrado de ESA cara: publicaciones, comentarios, votos, ficha,
 *      material, pase, avisos, ẄContacts, follows, comunidades, WeeTalk (vacía sus
 *      mensajes; la conversación es también del otro), Storage y su perfil.
 *   Las demás caras, la cuenta, Weë AI y los Credits no se tocan; la contabilidad
 *   se queda como está, desvinculada. Repetir la llamada retoma lo que faltara:
 *   cada paso es idempotente y una cara ya retirada se reconoce por su entidad.
 *
 * Lo que decide va en `crearMotorDeAlterEgos`, con puertos, para ejecutarlo de
 * verdad en las pruebas sin Firestore. La composición, abajo.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { AlterEgoCreado, AlterEgoRechazado, AlterEgoRetirado, EntidadDeCuenta, MotivoDeAlterEgo } from '../core/account-identity';
import { EngineError } from '../engine/errors';
import { esIdentidadValida } from '../social/econtact';
import { planDeBorradoDeUnAlterEgo, Paso, VENTANA_DE_INICIO_RECIENTE_S } from '../cuenta/borrado';
import { dependenciasDeFirestore } from '../cuenta/almacenFirestore';
import { ESTADO_DESACTIVADA } from '../cuenta/desactivar';
import { apagarAutonomia, depsDeFirestore as depsDelPase } from '../personajes/servidor';
import { cuentaDeIdentidadLeida, DatosDeAlterEgoNuevo, perfilHeredadoLeido } from './compatibilidad';
import { asegurarCaraWeeEnWee, asegurarCuentaEnWee, crearAlterEgoEnWee, entidadDelPerfil, retirarAlterEgoEnWee } from './cuentas';
import { exigirCuentaWeeValida } from './sesion';

/** La confirmación de retirar: una constante, no una palabra del idioma de la app (como `CONFIRMACION_DE_BORRADO`). */
export const CONFIRMACION_DE_RETIRADA = 'RETIRAR_ALTER_EGO';

export type MotivoDePuerta =
  | MotivoDeAlterEgo
  | 'sinSesion'
  | 'sinConfirmacion'
  | 'reautenticar'
  | 'datosInvalidos'
  | 'cuentaDesactivada';

/** Un rechazo de las puertas. Sin datos dentro: ni la cuenta, ni el número. */
export class RechazoDeAlterEgo extends Error {
  constructor(public readonly motivo: MotivoDePuerta) {
    super(motivo);
    this.name = 'RechazoDeAlterEgo';
  }
}

/* ── Lo que entra ────────────────────────────────────────────────────────── */

const claveValida = (v: unknown): v is string =>
  typeof v === 'string' && v.length > 0 && v.length <= 200 && !/[/\s]/.test(v) && v !== '.' && v !== '..';

/** `{ clave, displayName, bio?, avatar? }` → lo que construye el perfil. Contenido: no se traduce ni se interpreta. */
export const leerPeticionDeCrear = (datos: unknown): { clave: string; perfil: DatosDeAlterEgoNuevo } => {
  const d = (datos && typeof datos === 'object' ? datos : {}) as Record<string, unknown>;
  if (!claveValida(d.clave)) throw new RechazoDeAlterEgo('datosInvalidos');
  const nombre = typeof d.displayName === 'string' ? d.displayName.trim() : '';
  if (!nombre || nombre.length > 60) throw new RechazoDeAlterEgo('datosInvalidos');
  if (d.bio !== undefined && d.bio !== null && (typeof d.bio !== 'string' || d.bio.length > 300)) throw new RechazoDeAlterEgo('datosInvalidos');
  /* `avatar`: el id de un avatar predefinido de la app (texto), o `{ avatarId }`. Una foto propia se sube DESPUÉS a su carpeta. */
  const avatarId = typeof d.avatar === 'string' ? d.avatar
    : d.avatar && typeof d.avatar === 'object' ? (d.avatar as { avatarId?: unknown }).avatarId : undefined;
  if (avatarId !== undefined && avatarId !== null && (typeof avatarId !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(avatarId))) {
    throw new RechazoDeAlterEgo('datosInvalidos');
  }
  return {
    clave: d.clave,
    perfil: {
      displayName: nombre,
      ...(typeof d.bio === 'string' && d.bio.trim() ? { bio: d.bio } : {}),
      ...(typeof avatarId === 'string' ? { avatarId } : {}),
    },
  };
};

/** ¿Se puede retirar? La sesión, la confirmación constante y un inicio de sesión de los últimos 10 minutos. */
export const validarRetirada = (sesion: { uid?: unknown; authTime?: unknown } | null | undefined, datos: unknown, ahoraMs: number): string => {
  if (!sesion || typeof sesion.uid !== 'string' || !sesion.uid) throw new RechazoDeAlterEgo('sinSesion');
  const d = (datos && typeof datos === 'object' ? datos : {}) as Record<string, unknown>;
  if (d.confirmacion !== CONFIRMACION_DE_RETIRADA) throw new RechazoDeAlterEgo('sinConfirmacion');
  const authTime = Number(sesion.authTime);
  if (!Number.isFinite(authTime) || authTime <= 0) throw new RechazoDeAlterEgo('reautenticar');
  const edadS = ahoraMs / 1000 - authTime;
  if (edadS > VENTANA_DE_INICIO_RECIENTE_S || edadS < -300) throw new RechazoDeAlterEgo('reautenticar');
  if (typeof d.perfilId !== 'string' || !esIdentidadValida(d.perfilId) || d.perfilId === sesion.uid) throw new RechazoDeAlterEgo('alter-ego-ajeno');
  return d.perfilId;
};

/* ── El motor, con puertos ───────────────────────────────────────────────── */

export interface PuertosDeAlterEgos {
  ahora(): number;
  /** La barrera de siempre: autenticada, 18+ y país. Lanza si no. */
  exigirCuentaValida(auth: unknown): Promise<void>;
  cuentaDesactivada(cuentaId: string): Promise<boolean>;
  /** Hace nacer la cuenta si no había nacido. Idempotente. */
  nacerCuenta(cuentaId: string, at: number): Promise<void>;
  crear(cuentaId: string, clave: string, at: number, datos: DatosDeAlterEgoNuevo): Promise<AlterEgoCreado>;
  /** De qué cuenta es una identidad, LEYENDO (`cuentaDeIdentidadLeida`). */
  cuentaDe(perfilId: string): Promise<string | null>;
  /** La entidad que encarna ese perfil, si la hay (`entidadDelPerfil`). */
  entidadDe(perfilId: string): Promise<EntidadDeCuenta | null>;
  /** Una cara viva sin entidad (la heredada de una cuenta antigua): se le da la suya antes de retirarla. */
  asegurarEntidad(cuentaId: string, perfilId: string, at: number): Promise<EntidadDeCuenta | null>;
  retirar(cuentaId: string, entityId: string, clave: string, at: number): Promise<AlterEgoRetirado>;
  /** Quita el vínculo guardado de una cara heredada (su perfil y el Perfil Real). Sin vínculo, no hace nada. */
  desvincular(cuentaId: string, perfilId: string): Promise<void>;
  apagarPase(cuentaId: string, perfilId: string): Promise<void>;
  comunidadesDe(perfilId: string): Promise<string[]>;
  ejecutar(paso: Paso): Promise<number>;
}

const esSuya = (e: EntidadDeCuenta | null, cuentaId: string, perfilId: string): e is EntidadDeCuenta =>
  !!e && e.ownerAccountId === cuentaId && e.entityType === 'WEE_PROFILE' && e.profileRef?.uid === perfilId;

export const crearMotorDeAlterEgos = (p: PuertosDeAlterEgos) => ({
  async crear(auth: { uid?: unknown } | null | undefined, datos: unknown): Promise<{ uid: string; entityId: string }> {
    await p.exigirCuentaValida(auth);
    const cuentaId = (auth as { uid: string }).uid;
    const { clave, perfil } = leerPeticionDeCrear(datos);
    if (await p.cuentaDesactivada(cuentaId)) throw new RechazoDeAlterEgo('cuentaDesactivada');
    const at = p.ahora();
    await p.nacerCuenta(cuentaId, at);
    const r = await p.crear(cuentaId, clave, at, perfil);
    /* Solo esto sale: la cara y su entidad. Nunca la cuenta. */
    return { uid: r.uid, entityId: r.entityId };
  },

  async retirar(sesion: { uid?: unknown; authTime?: unknown } | null | undefined, datos: unknown): Promise<{ ok: true; retirada: boolean }> {
    const perfilId = validarRetirada(sesion, datos, p.ahora());
    const cuentaId = (sesion as { uid: string }).uid;
    const at = p.ahora();

    let entidad: EntidadDeCuenta | null;
    if ((await p.cuentaDe(perfilId)) === cuentaId) {
      /* Viva y de esta cuenta: su entidad, o la que se le da ahora (heredada sin entidad). */
      entidad = await p.entidadDe(perfilId);
      if (!esSuya(entidad, cuentaId, perfilId)) {
        await p.nacerCuenta(cuentaId, at);
        entidad = await p.asegurarEntidad(cuentaId, perfilId, at);
      }
      if (!esSuya(entidad, cuentaId, perfilId)) throw new RechazoDeAlterEgo('alter-ego-ajeno');
      /* Primero que deje de cobrar. Si no hay pase, no hay nada que apagar. */
      await p.apagarPase(cuentaId, perfilId).catch(() => undefined);
    } else {
      /* Ya no resuelve: o es ajena, o una retirada que se cortó a medias. La entidad lo dice. */
      entidad = await p.entidadDe(perfilId);
      if (!esSuya(entidad, cuentaId, perfilId) || entidad.status !== 'RETIRED') throw new RechazoDeAlterEgo('alter-ego-ajeno');
    }

    const r = await p.retirar(cuentaId, entidad.entityId, `alter-ego-${entidad.entityId}`, at);
    await p.desvincular(cuentaId, perfilId);
    const comunidades = await p.comunidadesDe(perfilId);
    for (const paso of planDeBorradoDeUnAlterEgo(perfilId, comunidades)) await p.ejecutar(paso);
    return { ok: true, retirada: r.retirada };
  },
});

/* ── Composición sobre Firestore ─────────────────────────────────────────── */

const comunidadesDelPerfil = (datos: Record<string, unknown> | undefined): string[] =>
  Array.isArray(datos?.joinedCommunities)
    ? (datos!.joinedCommunities as unknown[]).filter((c): c is string => typeof c === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(c))
    : [];

const puertos = (): PuertosDeAlterEgos => {
  const db = getFirestore();
  return {
    ahora: () => Date.now(),
    exigirCuentaValida: (auth) => exigirCuentaWeeValida(auth as Parameters<typeof exigirCuentaWeeValida>[0]),
    cuentaDesactivada: async (cuentaId) => (await db.collection('users').doc(cuentaId).get()).get('cuentaEstado') === ESTADO_DESACTIVADA,
    nacerCuenta: async (cuentaId, at) => { await asegurarCuentaEnWee(db, cuentaId, at, cuentaId); },
    crear: (cuentaId, clave, at, datos) => crearAlterEgoEnWee(db, cuentaId, clave, at, datos),
    cuentaDe: (perfilId) => cuentaDeIdentidadLeida(db, perfilId),
    entidadDe: (perfilId) => entidadDelPerfil(db, perfilId),
    asegurarEntidad: async (cuentaId, perfilId, at) => {
      /* Solo la cara heredada puede no tener entidad: cualquier otra cosa no se inventa una. */
      if ((await perfilHeredadoLeido(db, cuentaId)) !== perfilId) return null;
      return (await asegurarCaraWeeEnWee(db, cuentaId, perfilId, at)).entidad;
    },
    retirar: (cuentaId, entityId, clave, at) => retirarAlterEgoEnWee(db, cuentaId, entityId, clave, at),
    desvincular: async (cuentaId, perfilId) => {
      const lote = db.batch();
      const perfil = await db.collection('users').doc(perfilId).get();
      if (perfil.exists && perfil.get('linkedAccountId') !== undefined) lote.update(perfil.ref, { linkedAccountId: FieldValue.delete() });
      const reales = await db.collection('users').where('uid', '==', cuentaId).limit(20).get();
      for (const d of reales.docs) if (d.get('linkedAccountId') === perfilId) lote.update(d.ref, { linkedAccountId: FieldValue.delete() });
      await lote.commit();
    },
    apagarPase: async (cuentaId, perfilId) => { await apagarAutonomia(depsDelPase(), cuentaId, perfilId); },
    comunidadesDe: async (perfilId) => comunidadesDelPerfil((await db.collection('users').doc(perfilId).get()).data()),
    ejecutar: (paso) => dependenciasDeFirestore().ejecutar(paso),
  };
};

/* ── Las callables ───────────────────────────────────────────────────────── */

const OPTS = { region: 'us-central1' as const, timeoutSeconds: 540, memory: '512MiB' as const };

const CODIGO: Record<MotivoDePuerta, 'unauthenticated' | 'invalid-argument' | 'failed-precondition' | 'not-found' | 'resource-exhausted' | 'already-exists'> = {
  sinSesion: 'unauthenticated',
  sinConfirmacion: 'invalid-argument',
  reautenticar: 'failed-precondition',
  datosInvalidos: 'invalid-argument',
  cuentaDesactivada: 'failed-precondition',
  'cuenta-no-nacida': 'failed-precondition',
  'cuenta-inactiva': 'failed-precondition',
  'limite-alcanzado': 'resource-exhausted',
  'clave-de-otra-operacion': 'already-exists',
  'perfil-invalido': 'invalid-argument',
  /* Ajeno, inexistente o que no es un Perfil Weë: la misma respuesta, para no confirmar que existe. */
  'alter-ego-ajeno': 'not-found',
};

const traducir = (error: unknown, puerta: string): never => {
  const motivo = error instanceof RechazoDeAlterEgo || error instanceof AlterEgoRechazado ? error.motivo : null;
  if (motivo) throw new HttpsError(CODIGO[motivo], motivo, { motivo });
  if (error instanceof EngineError) throw new HttpsError('unauthenticated', error.code, { code: error.code });
  if (error instanceof HttpsError) throw error;
  /* Sin ids ni mensajes del proveedor en el log: solo que falló. */
  console.error(`${puerta}: falló; se puede reintentar`, (error as { code?: unknown })?.code ?? '');
  throw new HttpsError('internal', 'reintentar', { motivo: 'reintentar' });
};

export const crearAlterEgo = onCall(OPTS, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'sinSesion', { motivo: 'sinSesion' });
  try {
    return await crearMotorDeAlterEgos(puertos()).crear(request.auth, request.data);
  } catch (error) {
    return traducir(error, 'crearAlterEgo');
  }
});

export const retirarAlterEgo = onCall(OPTS, async (request) => {
  const sesion = request.auth ? { uid: request.auth.uid, authTime: Number(request.auth.token?.auth_time) } : null;
  try {
    return await crearMotorDeAlterEgos(puertos()).retirar(sesion, request.data);
  } catch (error) {
    return traducir(error, 'retirarAlterEgo');
  }
});
