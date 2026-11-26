/**
 * AUTHENTICATED ACCOUNT REQUIRED — la barrera del invitado (Guest AI Gate, 2026-10-07).
 *
 * Decisión de producto (del dueño, ya tomada): una sesión de Firebase Anonymous —el «Entrar como invitado»— es
 * SOLO exploración. No genera nada con Weë AI (texto, imagen, vídeo, voz, música, 3D, mundo, avatar, Weë Brain),
 * no recibe Credits (ni la bienvenida ni ningún otro) y no compra. Para crear hay que iniciar sesión o crear una
 * cuenta con una credencial de verdad (Google, email…).
 *
 * ── Qué se mira, y qué NO ─────────────────────────────────────────────────────────────────────────────────
 *
 * Solo el token que Firebase firmó: `request.auth.token.firebase.sign_in_provider`. Firebase Auth lo pone en
 * cada ID token (es el claim `firebase.sign_in_provider` del JWT; para una sesión anónima vale `'anonymous'`;
 * para las demás `'google.com'`, `'password'`, `'apple.com'`, `'phone'`, `'custom'`…). NUNCA lo que mande el
 * cliente (`isGuest`, `profileType`, `isVerified`, `data.*`): eso lo escribe quien llama.
 *
 * FAIL-CLOSED: si no hay sesión, si no hay token, o si el proveedor no es un texto reconocible, la respuesta es
 * NO. Un camino que no sabe quién llama no gasta.
 *
 * ── El orden de las puertas (cómo se compone) ─────────────────────────────────────────────────────────────
 *
 *   1. sesión                         (`request.auth`, la de siempre: UNAUTHORIZED)
 *   2. CUENTA AUTENTICADA (esta)      `exigirCuentaAutenticada(request.auth)` — solo el token
 *   3. CUENTA ENROLADA                `exigirCuentaWeeValida` (abajo) = 2 + registro terminado (fecha 18+ y país)
 *   4. RUTA ELEGIBLE                  el Router con la jurisdicción de la cuenta (`creator/rutaPrevia.ts`)
 *   5. cupo y Credits                 (`limiter.reserve`, `ensureAccount`, reserva, cobro)
 *
 * Ninguna puerta calcula la edad por su cuenta: la edad se decide en el registro (app + reglas de Firestore) y la
 * condición 3 solo VALIDA el valor guardado con la misma regla pura (`identity/edad.ts`), en un único sitio. Las cotizaciones
 * (`creatorQuote`, `brainQuote`) solo piden la 2: no cobran, no crean un trabajo ejecutable y no llaman a ningún proveedor.
 */
import { EngineError } from '../engine/errors';
import { getFirestore } from 'firebase-admin/firestore';
import { jurisdiccionesDeclaradas } from '../engine/jurisdiccion';
import { veredictoDeEdad } from './edad';

/** El código controlado que la app reconoce (y traduce con `weeai.errAccountRequired`). */
export const CUENTA_REQUERIDA = 'ACCOUNT_REQUIRED' as const;

/** El proveedor de la sesión anónima de Firebase, tal cual lo escribe Firebase Auth en el token. */
export const PROVEEDOR_ANONIMO = 'anonymous';

type AuthDelToken = { uid?: unknown; token?: unknown } | null | undefined;

/** El proveedor con el que se firmó el token, o `null` si no se puede saber. */
export const proveedorDeLaSesion = (auth: AuthDelToken): string | null => {
  if (!auth || typeof auth !== 'object') return null;
  const token = (auth as { token?: unknown }).token;
  if (!token || typeof token !== 'object') return null;
  const firebase = (token as { firebase?: unknown }).firebase;
  if (!firebase || typeof firebase !== 'object') return null;
  const proveedor = (firebase as { sign_in_provider?: unknown }).sign_in_provider;
  return typeof proveedor === 'string' && proveedor.trim().length > 0 ? proveedor.trim() : null;
};

/**
 * ¿Es una cuenta autenticada con una credencial de verdad? `false` para la sesión anónima Y para todo lo que no
 * se pueda determinar (fail-closed).
 */
export const esCuentaAutenticada = (auth: AuthDelToken): boolean => {
  if (!auth || typeof (auth as { uid?: unknown }).uid !== 'string' || !(auth as { uid: string }).uid) return false;
  const proveedor = proveedorDeLaSesion(auth);
  return proveedor !== null && proveedor !== PROVEEDOR_ANONIMO;
};

/** ¿Es una sesión de invitado (o una que no se puede distinguir de una)? */
export const esInvitado = (auth: AuthDelToken): boolean => !esCuentaAutenticada(auth);

/**
 * La barrera. Lanza el error controlado `ACCOUNT_REQUIRED` (HTTPS `unauthenticated`, para que una app vieja que
 * no conozca el código siga diciendo «Inicia sesión para crear con Weë») si quien llama no es una cuenta
 * autenticada. Se llama ANTES de reservar o gastar Credits, crear un trabajo, llamar a un proveedor, guardar una
 * generación o crear un asset.
 */
export const exigirCuentaAutenticada = (auth: AuthDelToken): void => {
  if (!esCuentaAutenticada(auth)) {
    throw new EngineError(CUENTA_REQUERIDA, undefined, { code: CUENTA_REQUERIDA });
  }
};

/* ══ CUENTA WEË VÁLIDA (simplificación definitiva de edad + país, 2026-10-07) ══════════════════════════════
 *
 * Decisión del dueño: Weë es solo 18+ y la edad se valida ÚNICAMENTE en el enrolamiento (registro). Una cuenta Weë
 * válida se considera mayor de edad y con país; las callables NO vuelven a calcular la edad.
 *
 * Pero «cuenta Weë válida» tiene que ser un HECHO que el servidor pueda comprobar, o una cuenta autenticada que se
 * saltó el registro llamando directo a la callable generaría sin fecha ni país. Ese hecho ya existe y no se inventa:
 *
 *   1. la sesión es de una cuenta autenticada (la barrera del invitado, arriba: solo el token);
 *   2. su Perfil Real tiene `private/account.birthDate`. Las reglas de Firestore SOLO dejan crear ese documento con
 *      una fecha de 18+ (`fechaDeNacimientoAdulta`) y después no dejan cambiarla ni borrarla: su mera EXISTENCIA es
 *      la prueba del enrolamiento 18+. Corrección F (2026-10-07): además se VALIDA EL VALOR con la regla pura única
 *      (`identity/edad.ts`, `veredictoDeEdad`: 18+ en fecha civil UTC−12, la misma que las reglas), porque hay
 *      documentos anteriores a la regla (una fecha histórica de menor, mal formada o futura). Menor, inválida, futura
 *      o ausente → no es cuenta Weë válida. No es una segunda puerta ni un segundo cálculo: es esta misma condición.
 *      El `birthDate` heredado de `users/<id>` (anterior a `private/account`) NO cuenta como enrolamiento: aquí
 *      no se lee; una cuenta que solo lo tenga recibe `ACCOUNT_REQUIRED` igual que una sin fecha;
 *   3. su Perfil Real declara un país del catálogo (`users.country`, el mismo que lee el Router como jurisdicción:
 *      `engine/jurisdiccion.ts`). Las reglas lo dejan fijo una vez puesto.
 *
 * Falta cualquiera → el mismo `ACCOUNT_REQUIRED` del invitado: para crear hace falta una cuenta Weë completa. No hay
 * mensaje de edad ni de país en las puertas: eso se dice en el registro, y solo allí.
 *
 * `enrolamiento.leer` es un objeto a propósito: las suites que ejecutan una callable con una Firestore de mentira lo
 * sustituyen, igual que hacen con `limiter.reserve`.
 */

/** El mismo techo de perfiles por cuenta que usan el Credit Engine y la jurisdicción. */
const PERFILES_DE_LA_CUENTA = 10;

/** ¿El documento privado de este perfil guarda una fecha que HOY da 18+ con la regla única? Todo lo demás, no. */
const tieneFechaAdultaDelRegistro = (datos: Record<string, unknown> | undefined, ahora: number): boolean =>
  veredictoDeEdad(datos?.birthDate, ahora) === 'OK';

export const enrolamiento = {
  /** ¿La cuenta terminó el registro (fecha 18+ guardada bajo las reglas y país del catálogo)? Solo lectura. */
  leer: async (uid: string, ahora: number = Date.now()): Promise<boolean> => {
    if (typeof uid !== 'string' || !uid || uid.includes('/')) return false;
    const snap = await getFirestore().collection('users').where('uid', '==', uid).limit(PERFILES_DE_LA_CUENTA).get();
    if (snap.empty) return false;
    if (!jurisdiccionesDeclaradas(uid, snap.docs.map((d) => d.data()))?.length) return false;
    for (const perfil of snap.docs.slice().sort((a, b) => (a.id < b.id ? -1 : 1))) {
      const privado = await perfil.ref.collection('private').doc('account').get();
      if (privado.exists && tieneFechaAdultaDelRegistro(privado.data(), ahora)) return true;
    }
    return false;
  },
};

/**
 * LA ÚNICA CONDICIÓN de las puertas que generan o cobran: cuenta autenticada Y enrolada. Va antes del trabajo, del
 * cupo, de los Credits y del proveedor. Falla cerrada: si la lectura cae, la llamada falla sin haber movido nada.
 */
export const exigirCuentaWeeValida = async (auth: AuthDelToken): Promise<void> => {
  exigirCuentaAutenticada(auth);
  const uid = (auth as { uid: string }).uid;
  if (!(await enrolamiento.leer(uid))) {
    throw new EngineError(CUENTA_REQUERIDA, undefined, { code: CUENTA_REQUERIDA });
  }
};
