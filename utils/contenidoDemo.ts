/*
 * EL CONTENIDO DE DEMOSTRACIÓN, RECONOCIDO EN UN SOLO SITIO.
 *
 * El modo demo (`scripts/sembrar-demo.mjs`, docs/WEE-DEMO.md) siembra perfiles ficticios, publicaciones y Weëls en los
 * EMULADORES locales. Todo lo que siembra lleva `isDemo: true`.
 *
 * Esto es puro —sin Firebase, sin React— para poder probarlo, y sirve para que el perfil DIGA que es de demostración
 * (la etiqueta del perfil). Lo que impide que llegue a producción es el sembrador, que se
 * niega a escribir fuera de los emuladores.
 */

export interface PosibleContenidoDemo {
  isDemo?: unknown;
}

/**
 * ¿Es un documento (publicación o perfil) sembrado por el modo demo?
 *
 * Decide SOLO `isDemo`. El `demo: true` de `creatorJobs` es otra cosa —un trabajo REAL hecho en modo simulado, sin
 * claves de proveedor— y por eso aquí no se mira.
 */
export const esContenidoDemo = (doc: PosibleContenidoDemo | null | undefined): boolean =>
  !!doc && typeof doc === 'object' && doc.isDemo === true;

/**
 * ¿Entra sola la demo? Solo en un proyecto `demo-*`, contra el EMULADOR de Auth y con el UID de la cuenta de prueba que le
 * pasa `scripts/demo/entorno.mjs`. Ninguna contraseña llega al cliente: una variable EXPO_PUBLIC no es un secreto —viaja
 * dentro del paquete y la lee cualquiera— (decisión del dueño, 2026-11-07, B2-G).
 */
export const debeEntrarSolaLaDemo = (projectId: string | null | undefined, uid: string | undefined, hostDelEmuladorDeAuth: string | undefined): boolean =>
  esProyectoDemo(projectId) && esUidDeDemo(uid) && typeof hostDelEmuladorDeAuth === 'string' && hostDelEmuladorDeAuth.trim().length > 0;

/** Un UID de Firebase (letras, números, guion y guion bajo): un identificador, nunca una credencial. */
export const esUidDeDemo = (uid: string | undefined): uid is string => typeof uid === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(uid);

/**
 * El token de PRUEBA del emulador de Auth para entrar como `uid`: JSON estricto, `{"uid":"…"}`. El emulador lo acepta como
 * «custom token» falso para pruebas (firebase-tools, `lib/emulator/auth/operations.js`, `signInWithCustomToken`: «Auth
 * Emulator only accepts strict JSON or JWTs as fake custom tokens»). No es un JWT ni lleva firma, así que el Auth de
 * producción lo rechaza: no es una credencial y no sirve fuera del emulador. Sustituye a la contraseña de la cuenta de prueba,
 * que antes viajaba en el paquete de la app.
 */
export const tokenDeLaDemoParaElEmulador = (uid: string): string => JSON.stringify({ uid });

/** ¿Es un proyecto de los emuladores? Firebase trata los `demo-*` como solo-emulador. */
export const esProyectoDemo = (projectId: string | null | undefined): boolean =>
  typeof projectId === 'string' && projectId.startsWith('demo-');

