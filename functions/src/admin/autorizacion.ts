import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { sanitizeForLog } from '../engine/sanitize';
import { isAdmin } from '../shared/admin';
import { crearAuditoria, nuevaCorrelacion, type EntradaDeAuditoria } from './auditoria';
import { assertOperacionAntigua, assertPermiso, rolDe, type Permiso, type SesionDeAuth } from './permisos';

/**
 * LA PUERTA DE TODA OPERACIÓN DE ADMINISTRACIÓN.
 *
 * ── REVOCACIÓN: LA FUENTE ES AUTH, NO EL TOKEN ───────────────────────────────
 *
 * Un ID token vive hasta una hora y `onCall` lo verifica sin mirar si se revocó: retirar un rol o revocar los tokens de
 * refresco NO invalida un token ya emitido. Así que cada llamada de administración relee la cuenta en Firebase Auth:
 * sus claims de AHORA, si está deshabilitada y desde cuándo valen sus sesiones (`tokensValidAfterTime`). Sin caché.
 *
 *   · Retirar `weeRole` o `admin` → surte efecto en la SIGUIENTE llamada, también con un token antiguo.
 *   · Deshabilitar la cuenta o revocar sus sesiones → igual.
 *   · **Si Auth no responde, no se entra** (`unavailable`). Nunca se cae a lo que dice el token.
 *
 * Coste: una lectura de Auth por llamada de administración, y solo después de que el token ya diga que es
 * administración, para que nadie pueda provocarlas sin serlo. Límite: `WEE_ADMIN_UIDS` es una variable de entorno y
 * cambia con un despliegue; para cortar antes, se deshabilita la cuenta. Las reglas de Firestore solo ven el token.
 */
export const dependencias: { auth: () => Pick<Auth, 'getUser'>; db: () => Firestore } = {
  auth: () => getAuth(),
  db: () => getFirestore(),
};

/** Los claims de AHORA, o el rechazo que toque. El resto del token (uid, fechas) se conserva. */
export const sesionVigente = async (auth: SesionDeAuth): Promise<SesionDeAuth> => {
  let usuario;
  try {
    usuario = await dependencias.auth().getUser(auth.uid);
  } catch (e) {
    if ((e as { code?: unknown })?.code === 'auth/user-not-found') throw new HttpsError('permission-denied', 'No tienes permiso para esto');
    console.error('ADMIN: no se pudo comprobar la cuenta en Auth', sanitizeForLog(e instanceof Error ? e.message : String(e)));
    throw new HttpsError('unavailable', 'No se pudo comprobar el permiso');
  }
  if (usuario.disabled) throw new HttpsError('permission-denied', 'No tienes permiso para esto');
  const validoDesde = usuario.tokensValidAfterTime ? Date.parse(usuario.tokensValidAfterTime) : NaN;
  const emitido = Number(auth.token?.auth_time) * 1000;
  /* Un token sin fecha de autenticación cuando la cuenta tiene un corte no se da por bueno. */
  if (Number.isFinite(validoDesde) && !(emitido >= validoDesde)) throw new HttpsError('unauthenticated', 'La sesión ya no es válida');
  const { admin: _a, weeRole: _r, ...resto } = auth.token ?? {};
  return { uid: auth.uid, token: { ...resto, ...(usuario.customClaims ?? {}) } };
};

export interface DepsDeOperacion {
  auditoria: ReturnType<typeof crearAuditoria>;
  /** Lo que tarda en dar la sesión vigente. Solo se sustituye en pruebas puras. */
  vigente?: (auth: SesionDeAuth) => Promise<SesionDeAuth>;
}

export const depsPorDefecto = (): DepsDeOperacion => ({ auditoria: crearAuditoria({ db: dependencias.db() }) });

/** El código de un `HttpsError` o el de un `CreditError`, que llega aquí antes de que lo traduzca la callable. */
const codigoDe = (e: unknown): string => {
  if (e instanceof HttpsError) return e.code;
  const codigo = (e as { code?: unknown } | null)?.code;
  return typeof codigo === 'string' && /^[A-Za-z_-]{1,64}$/.test(codigo) ? codigo : 'internal';
};

/**
 * Lo que dijo la operación, para el cierre. `ok` significa que terminó sin lanzar, y hay operaciones que terminan así sin
 * haber hecho lo pedido: un duplicado no mueve nada, y una corrida de evaluación puede acabar `BUDGET_EXCEEDED`.
 */
const desenlaceDe = (r: unknown): Record<string, unknown> => {
  if (typeof r !== 'object' || r === null) return {};
  const x = r as Record<string, unknown>;
  const simple = (v: unknown) => (['string', 'number', 'boolean'].includes(typeof v) ? v : undefined);
  const salida: Record<string, unknown> = {
    resultadoTransaccion: simple(x.transactionId), resultadoDuplicado: simple(x.duplicate), resultadoImporte: simple(x.amount),
    resultadoEstado: simple(x.status), resultadoParada: simple(x.motivoDeParada), resultadoReanudado: simple(x.reanudado), resultadoEvalRun: simple(x.evalRunId),
    resultadoDesenlaces: Array.isArray(x.desenlaces) ? x.desenlaces.join(' ') : undefined,
  };
  return Object.fromEntries(Object.entries(salida).filter(([, v]) => v !== undefined));
};
const texto = (e: unknown): string => sanitizeForLog(e instanceof Error ? e.message : String(e));

/** Sin sesión, o sin que el token diga siquiera que es administración: se rechaza sin leer nada ni escribir nada. */
const filtroPrevio = (auth: SesionDeAuth | undefined): SesionDeAuth => {
  if (!auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión');
  if (!isAdmin(auth)) {
    console.warn('ADMIN: denegado, no es administración', sanitizeForLog(auth.uid));
    throw new HttpsError('permission-denied', 'No tienes permiso para esto');
  }
  return auth;
};

/** La sesión vigente o el rechazo. Un rechazo a alguien que era administración queda en la auditoría. */
const autorizar = async (d: DepsDeOperacion, auth: SesionDeAuth | undefined, p: Pick<PeticionDeOperacion, 'permiso' | 'antigua'>, contexto: Pick<EntradaDeAuditoria, 'accion' | 'recurso' | 'metadatos' | 'correlationId'>): Promise<SesionDeAuth> => {
  const previa = filtroPrevio(auth);
  const vigente = d.vigente ?? sesionVigente;
  let sesion: SesionDeAuth | undefined;
  try {
    sesion = await vigente(previa);
    if (p.antigua) assertOperacionAntigua(sesion, p.permiso);
    else assertPermiso(sesion, p.permiso);
    return sesion;
  } catch (e) {
    console.warn('ADMIN: denegado', sanitizeForLog(contexto.accion), sanitizeForLog(previa.uid), codigoDe(e));
    /* Si Auth está caído no es una denegación: no hay nada que atribuir. Y el aviso de auditoría nunca cambia la respuesta. */
    if (codigoDe(e) !== 'unavailable') {
      try {
        await d.auditoria.registrar({ ...contexto, actorUid: previa.uid, actorRol: sesion ? rolDe(sesion) : null, resultado: 'denegado', codigoDeError: codigoDe(e) });
      } catch (ea) {
        console.error('ADMIN: no se pudo registrar el rechazo', contexto.correlationId, texto(ea));
      }
    }
    throw e;
  }
};

/** ¿Sigue siendo administración AHORA? Sin ningún permiso concreto: para que la consola sepa qué enseñar. */
export const sesionAdministrativa = async (auth: SesionDeAuth | undefined, d: Pick<DepsDeOperacion, 'vigente'> = {}): Promise<SesionDeAuth> => {
  const sesion = await (d.vigente ?? sesionVigente)(filtroPrevio(auth));
  if (!isAdmin(sesion)) throw new HttpsError('permission-denied', 'No tienes permiso para esto');
  return sesion;
};

/** Solo comprueba: para lo que no dice nada de ninguna persona. Sin auditar. Devuelve la sesión vigente para quien la necesite. */
export const lecturaSinAuditar = async <T>(p: PeticionDeOperacion, auth: SesionDeAuth | undefined, leer: (sesion: SesionDeAuth) => Promise<T> | T, d: DepsDeOperacion = depsPorDefecto()): Promise<T> => {
  const sesion = await autorizar(d, auth, p, { accion: p.accion, recurso: p.recurso, metadatos: p.metadatos ?? {}, correlationId: nuevaCorrelacion() });
  return leer(sesion);
};

export interface PeticionDeOperacion {
  accion: string;
  permiso: Permiso;
  recurso: { tipo: string; id?: string };
  metadatos?: Record<string, unknown>;
  motivo?: string;
  /** De las que ya existían antes de los roles: administración sin rol sigue pudiendo (`permisos.ts`). */
  antigua?: boolean;
  /** La entrada no se puede auditar tal como se ejecutaría: se autoriza, consta y se rechaza sin ejecutar (`operaciones.ts`). */
  entradaInvalida?: boolean;
}

/**
 * UNA LECTURA QUE DEJA CONSTANCIA. Los datos solo salen si ha quedado escrito quién los pidió: si no se puede registrar,
 * `unavailable` y nada más.
 */
export const lecturaAuditada = async <T extends object>(p: PeticionDeOperacion, auth: SesionDeAuth | undefined, leer: (sesion: SesionDeAuth) => Promise<T>, d: DepsDeOperacion = depsPorDefecto()): Promise<T & { correlationId: string; generadoEn: number }> => {
  const correlationId = nuevaCorrelacion();
  const contexto = { accion: p.accion, recurso: p.recurso, metadatos: p.metadatos ?? {}, correlationId };
  const sesion = await autorizar(d, auth, p, contexto);
  const actor = { actorUid: sesion.uid, actorRol: rolDe(sesion) };
  let datos: T;
  try {
    datos = await leer(sesion);
  } catch (e) {
    console.error('ADMIN: la lectura falló', sanitizeForLog(p.accion), correlationId, texto(e));
    try {
      await d.auditoria.registrar({ ...contexto, ...actor, resultado: 'error', codigoDeError: codigoDe(e) });
    } catch (ea) {
      console.error('ADMIN: la auditoría falló', correlationId, texto(ea));
    }
    if (e instanceof HttpsError) throw e;
    throw new HttpsError('internal', 'No se pudo leer', { correlationId });
  }
  try {
    await d.auditoria.registrar({ ...contexto, ...actor, resultado: 'ok' });
  } catch (e) {
    console.error('ADMIN: la auditoría falló; no se devuelven los datos', correlationId, texto(e));
    throw new HttpsError('unavailable', 'No se pudo dejar constancia de la consulta', { correlationId });
  }
  return { ...datos, correlationId, generadoEn: Date.now() };
};

/**
 * UNA ESCRITURA QUE YA EXISTÍA, CON CONSTANCIA EN DOS TIEMPOS. No crea ninguna operación nueva ni toca su semántica:
 * la transacción, la idempotencia y el reembolso siguen siendo del motor que la hace.
 *
 *   1. `intento`, ANTES de actuar. **Si no se puede escribir, no se actúa**: no hay operación sin rastro.
 *   2. La operación, tal cual.
 *   3. `ok` o `error`, con la misma correlación, DESPUÉS de saber cómo fue. Nunca se registra éxito por adelantado.
 *
 * Si el paso 3 falla, la operación YA está hecha y no se finge lo contrario: se devuelve su resultado y queda un
 * `intento` sin cierre, que es exactamente lo que hay que conciliar contra el libro del motor (por `requestId` en
 * Credits). La alternativa —meter la auditoría en la transacción de Credits— exigiría tocar `creditEngine`, y la
 * otra —escribir solo después— permitiría movimientos de dinero sin rastro.
 */
export const escrituraAuditada = async <T>(p: PeticionDeOperacion, auth: SesionDeAuth | undefined, ejecutar: (sesion: SesionDeAuth) => Promise<T>, d: DepsDeOperacion = depsPorDefecto()): Promise<T> => {
  const correlationId = nuevaCorrelacion();
  const contexto = { accion: p.accion, recurso: p.recurso, metadatos: p.metadatos ?? {}, correlationId, ...(p.motivo ? { motivo: p.motivo } : {}) };
  const sesion = await autorizar(d, auth, p, contexto);
  const actor = { actorUid: sesion.uid, actorRol: rolDe(sesion) };
  try {
    await d.auditoria.registrar({ ...contexto, ...actor, resultado: 'intento' });
  } catch (e) {
    console.error('ADMIN: sin constancia no se actúa', sanitizeForLog(p.accion), correlationId, texto(e));
    throw new HttpsError('unavailable', 'No se pudo dejar constancia de la operación: no se ha hecho', { correlationId });
  }
  let resultado: T;
  try {
    resultado = await ejecutar(sesion);
  } catch (e) {
    const codigo = codigoDe(e);
    try {
      await d.auditoria.registrar({ ...contexto, ...actor, resultado: 'error', codigoDeError: codigo });
    } catch (ea) {
      console.error('ADMIN: no se pudo registrar el fallo; queda un intento sin cierre', correlationId, texto(ea));
    }
    throw e;
  }
  try {
    await d.auditoria.registrar({ ...contexto, metadatos: { ...contexto.metadatos, ...desenlaceDe(resultado) }, ...actor, resultado: 'ok' });
  } catch (e) {
    console.error('ADMIN: la operación se hizo y no se pudo registrar su cierre; hay que conciliar', correlationId, texto(e));
  }
  return resultado;
};

export type ModoDeOperacion = 'agregada' | 'lectura' | 'escritura';
export type ClaseDeOperacion = PeticionDeOperacion & { modo: ModoDeOperacion };

/** La entrada de las callables antiguas: cada una dice qué es (`operaciones.ts`) y aquí se aplica lo que le toca. */
export const operacionAdmin = async <T extends object>(clase: ClaseDeOperacion, auth: SesionDeAuth | undefined, ejecutar: (sesion: SesionDeAuth) => Promise<T>, d: DepsDeOperacion = depsPorDefecto()): Promise<T> => {
  const antigua = { ...clase, antigua: true };
  const hacer = clase.entradaInvalida ? async (): Promise<T> => { throw new HttpsError('invalid-argument', 'Entrada no válida'); } : ejecutar;
  if (clase.modo === 'escritura') return escrituraAuditada(antigua, auth, hacer, d);
  if (clase.modo === 'lectura') return lecturaAuditada(antigua, auth, hacer, d);
  return lecturaSinAuditar(antigua, auth, hacer, d);
};
