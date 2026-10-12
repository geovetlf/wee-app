/*
 * EL CONTENIDO DE DEMOSTRACIÓN, RECONOCIDO EN UN SOLO SITIO.
 *
 * El modo demo (`scripts/sembrar-demo.mjs`, docs/WEE-DEMO.md) siembra creadores, publicaciones y Weëls de mentira en
 * los EMULADORES locales para poder probar la parte social con una cuenta recién creada. Todo lo que siembra lleva
 * `demo: true` y `procedenciaDemo: 'wee-demo-r9'`, y su id empieza por `demo_`.
 *
 * Esto es puro —sin Firebase, sin React— para poder probarlo, y sirve a dos cosas:
 *  · que la app DIGA que algo es de demostración (la etiqueta «Demo» junto al nombre), y
 *  · defensa en profundidad: fuera de un proyecto `demo-*` los feeds descartan cualquier publicación marcada. En
 *    producción nunca debería existir ninguna; si existiera, no se enseña.
 */

/** La procedencia que escribe el sembrador. `--retirar` solo borra lo que la lleva. */
export const PROCEDENCIA_DEMO = 'wee-demo-r9';

export interface PosibleContenidoDemo {
  demo?: unknown;
  procedenciaDemo?: unknown;
}

/** ¿Es un documento (publicación o perfil) sembrado por el modo demo? */
export const esContenidoDemo = (doc: PosibleContenidoDemo | null | undefined): boolean =>
  !!doc && typeof doc === 'object' && (doc.demo === true || doc.procedenciaDemo === PROCEDENCIA_DEMO);

/** ¿Es un proyecto de los emuladores? Firebase trata los `demo-*` como solo-emulador. */
export const esProyectoDemo = (projectId: string | null | undefined): boolean =>
  typeof projectId === 'string' && projectId.startsWith('demo-');

/** Lo que se enseña de una lista: en un proyecto demo, todo; en cualquier otro, nada marcado como demo. */
export const filtrarContenidoDemo = <T extends PosibleContenidoDemo>(docs: T[], projectId: string | null | undefined): T[] =>
  esProyectoDemo(projectId) ? docs : (docs || []).filter((d) => !esContenidoDemo(d));
