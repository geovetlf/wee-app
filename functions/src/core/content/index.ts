/**
 * WEE CONTENT CORE — la puerta.
 *
 * ── Qué hay aquí dentro ─────────────────────────────────────────────────────
 *
 *   asset.ts         el material: un archivo con id, dueño, referencia al
 *                    almacén, derivados, procedencia y ciclo de vida
 *   content.ts       el contenido: lo que se puede publicar; texto + materiales
 *                    por referencia; borrador o listo
 *   publication.ts   la publicación: el acto de poner un contenido en un sitio,
 *                    desde una cara, con una visibilidad
 *
 * Como todo el Core: sin Firebase, sin red, sin reloj, sin dados, y sin el
 * nombre de ningún almacén. El cableado con los almacenes de verdad vive en
 * `functions/src/content/`, porque ahí sí hace falta nombrarlos.
 *
 * ── La frase que resume el módulo ───────────────────────────────────────────
 *
 * Los bytes se guardan UNA vez. Un material puede estar en dos proyectos, en
 * dos contenidos y en tres publicaciones, y sigue siendo un archivo, de una
 * cuenta. Cambiar de cara, de proyecto o de sitio nunca lo copia ni lo mueve.
 *
 * ── Y la que la separa de todo lo demás ─────────────────────────────────────
 *
 *   MATERIAL ≠ CONTENIDO ≠ PUBLICACIÓN
 *   GENERACIÓN ≠ MATERIAL       (una operación no es su resultado)
 *   PROYECTO ≠ MATERIAL         (organiza; no posee)
 *   PUBLICAR ≠ HACER PÚBLICO    (la visibilidad es un valor, no un booleano)
 */

export * from './asset';
export * from './content';
export * from './publication';
