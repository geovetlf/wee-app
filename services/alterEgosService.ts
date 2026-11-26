import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../config/firebase';
import { usersService, UserProfile } from './firestoreService';
import { identidadWeeDe } from '../utils/econtactModel';

/**
 * LOS ALTER EGOS DE UNA CUENTA (plan de alter egos, F6, 2026-11-23).
 *
 * Una cuenta tiene su Perfil Real y hasta cinco Perfiles Weë (D1). La app NO los
 * crea ni los borra escribiendo `users`: lo hace el servidor con dos callables
 * (`functions/src/identity/alterEgos.ts`):
 *
 *   crearAlterEgo({ clave, displayName, bio?, avatar? })  → { uid, entityId }
 *   retirarAlterEgo({ perfilId, confirmacion })           → { ok, retirada }
 *
 * Crear es gratis (D3). Retirar es INMEDIATO y sin vuelta (D10), y pide un inicio
 * de sesión de los últimos 10 minutos (D10b): si no lo hay, el servidor responde
 * `reautenticar` y la app pide salir y volver a entrar, como al eliminar la cuenta.
 *
 * Listar SÍ se hace aquí, leyendo: las entidades `WEE_PROFILE` activas de la
 * cuenta (las reglas solo dejan leer las propias) y, de respaldo, la cara
 * heredada `hidi_<cuenta>`, que una cuenta antigua puede tener sin entidad. Luego
 * se leen sus perfiles públicos de `users`.
 */

/** Tiene que coincidir con `CONFIRMACION_DE_RETIRADA` de `functions/src/identity/alterEgos.ts`. Es una constante, no una palabra del idioma. */
export const CONFIRMACION_DE_RETIRADA = 'RETIRAR_ALTER_EGO';

/** D1: hasta cinco por cuenta. Solo para PINTAR los huecos que quedan: el límite de verdad lo aplica el servidor. */
/* Por el momento, uno por cuenta (decisión del dueño, 2026-11-26; sustituye a los cinco de D1). */
export const MAXIMO_DE_ALTER_EGOS = 1;

/** El avatar predefinido con el que nace un alter ego si la persona no elige otro. */
export const AVATAR_DE_ALTER_EGO = 'ghost';

/** Los motivos que devuelve el servidor (claves, no frases). */
export type MotivoDeAlterEgo =
  | 'reautenticar'
  | 'sinSesion'
  | 'sinConfirmacion'
  | 'datosInvalidos'
  | 'cuentaDesactivada'
  | 'limite-alcanzado'
  | 'alter-ego-ajeno'
  | 'reintentar';

const CONOCIDOS: MotivoDeAlterEgo[] = ['reautenticar', 'sinSesion', 'sinConfirmacion', 'datosInvalidos', 'cuentaDesactivada', 'limite-alcanzado', 'alter-ego-ajeno'];

export class ErrorDeAlterEgo extends Error {
  constructor(public readonly motivo: MotivoDeAlterEgo) { super(motivo); }
}

/* El motivo viaja en `details.motivo` (una clave); el texto del error nunca se enseña. */
const motivoDe = (error: any): MotivoDeAlterEgo => {
  const motivo = error?.details?.motivo;
  return CONOCIDOS.includes(motivo) ? motivo : 'reintentar';
};

/** La clave de un mensaje de error, para quien lo pinta con `t()`. */
export const claveDeErrorDeAlterEgo = (motivo: MotivoDeAlterEgo): string =>
  motivo === 'limite-alcanzado' ? 'alterEgo.errorLimit'
    : motivo === 'datosInvalidos' ? 'alterEgo.errorInvalid'
      : motivo === 'cuentaDesactivada' ? 'alterEgo.errorDeactivated'
        : 'alterEgo.errorGeneric';

/** Una clave de idempotencia por intento: dos toques del mismo intento crean UNO. */
export const nuevaClaveDeAlterEgo = (): string =>
  `ae-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export interface DatosDeAlterEgo {
  clave: string;
  displayName: string;
  bio?: string;
  /** El id de un avatar predefinido de la app. Una foto propia se sube DESPUÉS a la carpeta del alter ego. */
  avatar?: string;
}

export const alterEgosService = {
  /**
   * Los ids de los alter egos de la cuenta, en el orden en que nacieron. La cara
   * heredada, si existe, va primero (es la más antigua). Si la lectura de las
   * entidades falla —reglas aún sin desplegar, sin red—, queda la heredada: la
   * app con un alter ego sigue siendo la de siempre.
   */
  async idsDeLaCuenta(cuenta: string): Promise<string[]> {
    let deEntidades: { uid: string; orden: number }[] = [];
    try {
      const snap = await getDocs(query(
        collection(db, 'entities'),
        where('ownerAccountId', '==', cuenta),
        where('entityType', '==', 'WEE_PROFILE'),
        where('status', '==', 'ACTIVE'),
      ));
      deEntidades = snap.docs
        .map((d) => {
          const e = d.data() as { profileRef?: { uid?: unknown }; entitySequence?: unknown };
          return { uid: typeof e.profileRef?.uid === 'string' ? e.profileRef.uid : '', orden: typeof e.entitySequence === 'number' ? e.entitySequence : Number.MAX_SAFE_INTEGER };
        })
        .filter((x) => !!x.uid && x.uid !== cuenta);
    } catch (error) {
      console.log('🎭 [alterEgos] No se pudieron leer las entidades (se usa la cara heredada):', (error as { code?: string })?.code ?? '');
    }
    const heredada = identidadWeeDe(cuenta);
    const ordenados = deEntidades.sort((a, b) => a.orden - b.orden).map((x) => x.uid);
    return [...new Set([heredada, ...ordenados])];
  },

  /**
   * Los perfiles de los alter egos de la cuenta. Se leen DIRECTAMENTE de `users/<id>`
   * (el id del documento es el uid de la cara), no del espejo `publicProfiles`: el
   * espejo lo escribe un disparador y puede faltar (perfiles anteriores a él, datos
   * importados), y entonces una cara propia desaparecía del selector al recargar.
   * Lo que no se pueda leer así se busca, de respaldo, por el espejo.
   * Los que no existen (la heredada que nunca se creó) se caen.
   */
  async listar(cuenta: string): Promise<UserProfile[]> {
    const ids = await alterEgosService.idsDeLaCuenta(cuenta);
    const porUid = new Map<string, UserProfile>();
    await Promise.all(ids.map(async (id) => {
      try {
        const snap = await getDoc(doc(db, 'users', id));
        const p = snap.exists() ? ({ id: snap.id, ...snap.data() } as UserProfile) : null;
        if (p && p.uid === id && p.profileType === 'hidi') porUid.set(id, p);
      } catch { /* se intenta por el espejo */ }
    }));
    const faltan = ids.filter((id) => !porUid.has(id));
    if (faltan.length) {
      const perfiles = await usersService.getManyByUids(faltan);
      for (const p of perfiles) {
        if (p.uid && !porUid.has(p.uid) && p.profileType === 'hidi') porUid.set(p.uid, p);
      }
    }
    return ids.map((id) => porUid.get(id)).filter((p): p is UserProfile => !!p);
  },

  /** Crea un alter ego por la callable. Devuelve su identidad. Nunca escribe `users` desde aquí. */
  async crear(datos: DatosDeAlterEgo): Promise<{ uid: string; entityId: string }> {
    try {
      const r = await httpsCallable<DatosDeAlterEgo, { uid: string; entityId: string }>(functions, 'crearAlterEgo', { timeout: 120_000 })(datos);
      return r.data;
    } catch (error) {
      throw new ErrorDeAlterEgo(motivoDe(error));
    }
  },

  /** Retira (borra) un alter ego, en el acto y sin vuelta. */
  async retirar(perfilId: string): Promise<void> {
    try {
      await httpsCallable<{ perfilId: string; confirmacion: string }, { ok: boolean; retirada: boolean }>(
        functions, 'retirarAlterEgo', { timeout: 540_000 },
      )({ perfilId, confirmacion: CONFIRMACION_DE_RETIRADA });
    } catch (error) {
      throw new ErrorDeAlterEgo(motivoDe(error));
    }
  },
};
