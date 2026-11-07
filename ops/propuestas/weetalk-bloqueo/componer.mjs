/*
 * WEETALK · BLOQUEO DE CONTACTOS — LA PROPUESTA DE REGLAS, COMPUESTA SIN APLICARLA (docs/WEETALK-BLOQUEO.md § 6).
 *
 * `firestore.rules` NO se toca: cambiarlo exige la autorización del dueño. Lo que hay aquí es lo necesario para que,
 * el día que se autorice, el cambio sea exacto y esté probado:
 *
 *   conversaciones.rules   el bloque `match /conversations/{conversationId}` ENTERO tal como quedaría (texto exacto)
 *   avisos.rules           el bloque `match /notifications/{notificationId}` ENTERO tal como quedaría: el de W0 con
 *                          una función y una condición más (los avisos de ËContact entre cuentas con un bloqueo)
 *   componer.mjs           esto: sustituye esos dos bloques dentro de unas reglas dadas y devuelve el resultado, sin
 *                          escribir
 *   reglas.prueba.mjs      las pruebas de esas reglas en el emulador (preparadas, no aplicadas, fuera de la CI)
 *   correr-reglas.mjs      cómo lanzarlas en un emulador aislado (demo-wee-bloqueo, puertos propios)
 *
 * La propuesta se escribió sobre los bloques de la candidata W0 (7aa01156). Si cualquiera de los dos cambia en
 * `firestore.rules`, `componerPropuesta` se NIEGA a componer: la propuesta hay que revisarla contra el bloque nuevo
 * antes de aplicarla. Nada de aquí escribe en disco.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));

export const RUTA_DE_LA_PROPUESTA = path.join(aqui, 'conversaciones.rules');
export const RUTA_DE_LA_PROPUESTA_DE_AVISOS = path.join(aqui, 'avisos.rules');

/** Donde empieza el bloque de conversaciones (una sola vez en las reglas). */
export const ANCLA_INICIO = '    match /conversations/{conversationId} {';
/** Lo que viene justo después del bloque: la línea en blanco y el rótulo de la moderación. No se toca. */
export const ANCLA_FIN = '\n\n    // === MODERACIÓN (Fase 12-A/B';

/** Donde empieza el bloque de avisos, y lo que viene justo detrás (la línea en blanco y el rótulo siguiente). */
export const ANCLA_INICIO_AVISOS = '    match /notifications/{notificationId} {';
export const ANCLA_FIN_AVISOS = '\n\n    // === INTERÉS EN AI APPS';

/** Las huellas de los bloques de W0 sobre los que se escribió la propuesta (SHA-256, finales de línea LF). */
export const HUELLA_DEL_BLOQUE_DE_W0 = '5d7f5c9a18c3962d6c83e15d63968751b7803476f608ff8fdb6193d785c69ddc';
export const HUELLA_DEL_BLOQUE_DE_AVISOS_DE_W0 = '51f8003e53d5b90022254d4b81f206480c20d4a88e63e1bca235dbbf6db50f66';

/** La colección del índice que leen las reglas propuestas, y su separador: los mismos que usa el servidor. */
export const COLECCION_DEL_INDICE = 'weetalkBloqueosPorPar';
export const SEPARADOR_DEL_INDICE = '~';

export const huellaDe = (texto) => createHash('sha256').update(String(texto).replace(/\r\n/g, '\n')).digest('hex');

/** Un bloque de unas reglas entre dos anclas: dónde empieza, dónde acaba y su texto (LF). Lanza si no está UNA vez. */
const bloqueEntre = (reglas, ancla, fin, nombre) => {
  const s = String(reglas).replace(/\r\n/g, '\n');
  const inicio = s.indexOf(ancla);
  if (inicio < 0 || s.indexOf(ancla, inicio + 1) >= 0) throw new Error(`las reglas no traen UNA vez \`${ancla.trim()}\``);
  const final = s.indexOf(fin, inicio);
  if (final < 0 || s.indexOf(fin, final + 1) >= 0) throw new Error(`las reglas no traen UNA vez el rótulo que va detrás de ${nombre}`);
  return { inicio, fin: final, bloque: s.slice(inicio, final), texto: s };
};

/** El bloque de conversaciones de unas reglas. */
export const bloqueDeConversaciones = (reglas) => bloqueEntre(reglas, ANCLA_INICIO, ANCLA_FIN, 'las conversaciones');

/** El bloque de avisos de unas reglas. */
export const bloqueDeAvisos = (reglas) => bloqueEntre(reglas, ANCLA_INICIO_AVISOS, ANCLA_FIN_AVISOS, 'los avisos');

const sustituir = (reglasLF, leer, propuesta, ancla, huellaEsperada, nombre) => {
  const { inicio, fin, bloque } = leer(reglasLF);
  const huella = huellaDe(bloque);
  if (huella !== huellaEsperada) {
    throw new Error(`el bloque de ${nombre} ya no es el de W0 (huella ${huella.slice(0, 12)}…): revisa la propuesta antes de aplicarla`);
  }
  const nuevo = String(propuesta).replace(/\r\n/g, '\n').replace(/\n+$/, '');
  if (!nuevo.startsWith(ancla)) throw new Error(`la propuesta de ${nombre} no empieza por el mismo \`${ancla.trim()}\``);
  return reglasLF.slice(0, inicio) + nuevo + reglasLF.slice(fin);
};

/**
 * Las reglas dadas con los bloques de conversaciones y de avisos sustituidos por la propuesta. Todo lo demás queda
 * idéntico, byte a byte, con los finales de línea que traía. Se niega si alguno de los dos bloques no es el de W0.
 */
export const componerPropuesta = (
  reglas,
  propuesta = fs.readFileSync(RUTA_DE_LA_PROPUESTA, 'utf8'),
  propuestaDeAvisos = fs.readFileSync(RUTA_DE_LA_PROPUESTA_DE_AVISOS, 'utf8'),
) => {
  const eol = String(reglas).includes('\r\n') ? '\r\n' : '\n';
  const lf = String(reglas).replace(/\r\n/g, '\n');
  const conConversaciones = sustituir(lf, bloqueDeConversaciones, propuesta, ANCLA_INICIO, HUELLA_DEL_BLOQUE_DE_W0, 'conversaciones');
  /* El bloque de avisos se busca otra vez sobre el resultado: sus anclas no se mueven, solo su posición. */
  const compuesto = sustituir(conConversaciones, bloqueDeAvisos, propuestaDeAvisos, ANCLA_INICIO_AVISOS, HUELLA_DEL_BLOQUE_DE_AVISOS_DE_W0, 'avisos');
  return eol === '\n' ? compuesto : compuesto.split('\n').join(eol);
};
