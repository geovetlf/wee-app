/*
 * ESPAÑOL — LOS TEXTOS QUE ESCRIBE EL SERVIDOR.
 *
 * Todo lo de las otras carpetas lo escribe la app. Esto no: lo escribe el servidor —las preguntas de Weë AI, su
 * plan, el progreso, los errores, los conceptos del historial de Credits, los push, la página pública— y llega a la
 * pantalla en español, muchas veces GUARDADO en la base de datos. Aquí está, palabra por palabra, para que la app lo
 * reconozca y lo pinte en el idioma de quien mira (`i18n/servidor.ts`), y para que el servidor pueda escribir los
 * push y la página pública en el idioma de quien los lee (`scripts/i18n-textos-del-servidor.mjs`).
 *
 * ES UNA SECCIÓN OPCIONAL. Un idioma que la declara la declara entera (`FormaDelServidor`; lo comprueba
 * `functions/test/i18n.test.mjs`, prueba 24). Uno que todavía no la ha traducido no la declara, y la cadena de
 * respaldo de siempre —fr-FR → fr → en— hace el resto: ve el inglés, no el español del servidor. Hoy la declaran el
 * español, el inglés y el danés.
 */
import { preguntas } from './preguntas';
import { opciones } from './opciones';
import { objetivos } from './objetivos';
import { plan } from './plan';
import { progreso } from './progreso';
import { motor } from './motor';
import { movimientos } from './movimientos';
import { social } from './social';
import { avisos } from './avisos';
import { publica } from './publica';
import { resultado } from './resultado';

export const servidor = {
  preguntas,
  opciones,
  objetivos,
  plan,
  progreso,
  motor,
  movimientos,
  social,
  avisos,
  publica,
  resultado,
};

/** La forma de los textos del servidor. Quien la declara, la declara entera. */
export type FormaDelServidor = {
  [Seccion in keyof typeof servidor]: { [Clave in keyof (typeof servidor)[Seccion]]: string };
};
