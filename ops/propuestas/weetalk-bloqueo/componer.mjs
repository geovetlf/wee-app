/*
 * WEETALK · BLOQUEO DE CONTACTOS — LA PROPUESTA DE REGLAS, COMPUESTA SIN APLICARLA (docs/WEETALK-BLOQUEO.md § 6).
 *
 * `firestore.rules` NO se toca: cambiarlo exige la autorización del dueño. Lo que hay aquí es lo necesario para que,
 * el día que se autorice, el cambio sea exacto y esté probado:
 *
 *   conversaciones.rules   el bloque `match /conversations/{conversationId}` ENTERO tal como quedaría (texto exacto)
 *   componer.mjs           esto: sustituye ese bloque dentro de unas reglas dadas y devuelve el resultado, sin escribir
 *   reglas.prueba.mjs      las pruebas de esas reglas en el emulador (preparadas, no aplicadas, fuera de la CI)
 *   correr-reglas.mjs      cómo lanzarlas en un emulador aislado (demo-wee-bloqueo, puertos propios)
 *
 * La propuesta se escribió sobre el bloque de la candidata W0 (7aa01156). Si ese bloque cambia en `firestore.rules`,
 * `componerPropuesta` se NIEGA a componer: la propuesta hay que revisarla contra el bloque nuevo antes de aplicarla.
 * Nada de aquí escribe en disco.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));

export const RUTA_DE_LA_PROPUESTA = path.join(aqui, 'conversaciones.rules');

/** Donde empieza el bloque que se sustituye (una sola vez en las reglas). */
export const ANCLA_INICIO = '    match /conversations/{conversationId} {';
/** Lo que viene justo después del bloque: la línea en blanco y el rótulo de la moderación. No se toca. */
export const ANCLA_FIN = '\n\n    // === MODERACIÓN (Fase 12-A/B';

/** La huella del bloque de W0 sobre el que se escribió la propuesta (SHA-256, finales de línea LF). */
export const HUELLA_DEL_BLOQUE_DE_W0 = '5d7f5c9a18c3962d6c83e15d63968751b7803476f608ff8fdb6193d785c69ddc';

/** La colección del índice que leen las reglas propuestas, y su separador: los mismos que usa el servidor. */
export const COLECCION_DEL_INDICE = 'weetalkBloqueosPorPar';
export const SEPARADOR_DEL_INDICE = '~';

export const huellaDe = (texto) => createHash('sha256').update(String(texto).replace(/\r\n/g, '\n')).digest('hex');

/** El bloque de conversaciones de unas reglas: dónde empieza, dónde acaba y su texto (LF). Lanza si no está UNA vez. */
export const bloqueDeConversaciones = (reglas) => {
  const s = String(reglas).replace(/\r\n/g, '\n');
  const inicio = s.indexOf(ANCLA_INICIO);
  if (inicio < 0 || s.indexOf(ANCLA_INICIO, inicio + 1) >= 0) throw new Error('las reglas no traen UNA vez `match /conversations/{conversationId}`');
  const fin = s.indexOf(ANCLA_FIN, inicio);
  if (fin < 0 || s.indexOf(ANCLA_FIN, fin + 1) >= 0) throw new Error('las reglas no traen UNA vez el rótulo de la moderación detrás de las conversaciones');
  return { inicio, fin, bloque: s.slice(inicio, fin), texto: s };
};

/**
 * Las reglas dadas con el bloque de conversaciones sustituido por la propuesta. Todo lo demás queda idéntico, byte a
 * byte, con los finales de línea que traía. Se niega si el bloque actual no es el de W0.
 */
export const componerPropuesta = (reglas, propuesta = fs.readFileSync(RUTA_DE_LA_PROPUESTA, 'utf8')) => {
  const eol = String(reglas).includes('\r\n') ? '\r\n' : '\n';
  const { inicio, fin, bloque, texto } = bloqueDeConversaciones(reglas);
  const huella = huellaDe(bloque);
  if (huella !== HUELLA_DEL_BLOQUE_DE_W0) {
    throw new Error(`el bloque de conversaciones ya no es el de W0 (huella ${huella.slice(0, 12)}…): revisa la propuesta antes de aplicarla`);
  }
  const nuevo = String(propuesta).replace(/\r\n/g, '\n').replace(/\n+$/, '');
  if (!nuevo.startsWith(ANCLA_INICIO)) throw new Error('la propuesta no empieza por el mismo `match /conversations/{conversationId}`');
  const compuesto = texto.slice(0, inicio) + nuevo + texto.slice(fin);
  return eol === '\n' ? compuesto : compuesto.split('\n').join(eol);
};
