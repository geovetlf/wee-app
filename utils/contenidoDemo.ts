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

/** ¿Entra sola la demo? Solo en un proyecto `demo-*` y con la cuenta del emulador que le pasa `scripts/demo/entorno.mjs`. */
export const debeEntrarSolaLaDemo = (projectId: string | null | undefined, correo: string | undefined, clave: string | undefined): boolean =>
  esProyectoDemo(projectId) && !!correo && !!clave;

/** ¿Es un proyecto de los emuladores? Firebase trata los `demo-*` como solo-emulador. */
export const esProyectoDemo = (projectId: string | null | undefined): boolean =>
  typeof projectId === 'string' && projectId.startsWith('demo-');

