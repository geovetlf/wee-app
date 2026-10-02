/**
 * LA HUELLA DE LOS CATÁLOGOS: qué claves tiene cada idioma y qué dicen, en una línea por idioma y sección.
 *
 *   node scripts/i18n-huella.mjs            → reescribe i18n/huella.json
 *   node scripts/i18n-huella.mjs --comprobar → solo compara y dice qué cambió (lo mismo que la prueba)
 *
 * `functions/test/i18n-huella.test.mjs` falla si un diccionario cambia y esta huella no. No es burocracia: obliga a
 * que cada cambio de textos —una clave nueva, una traducción corregida, una frase del servidor que cambió— pase por
 * una persona que lo mira, ejecuta las pruebas de idioma y actualiza la huella a propósito. Y el estado de revisión
 * (`node scripts/i18n-revision.mjs estado <idioma>`) marca como pendiente cada texto que cambió desde su revisión.
 */
import fs from 'node:fs';
import path from 'node:path';
import { RAIZ, cargarDiccionarios, calcularHuella } from './i18n-lib.mjs';

const DESTINO = path.join(RAIZ, 'i18n/huella.json');
const { DICCIONARIOS, SECCIONES_DEL_SERVIDOR } = await cargarDiccionarios();
const hoy = calcularHuella(DICCIONARIOS, SECCIONES_DEL_SERVIDOR);

if (process.argv.includes('--comprobar')) {
  const guardada = fs.existsSync(DESTINO) ? JSON.parse(fs.readFileSync(DESTINO, 'utf8')).catalogos : {};
  const cambios = [...new Set([...Object.keys(hoy), ...Object.keys(guardada)])].filter((k) => JSON.stringify(hoy[k]) !== JSON.stringify(guardada[k]));
  console.log(cambios.length ? `cambiaron: ${cambios.join(', ')}` : 'la huella está al día');
  process.exit(cambios.length ? 1 : 0);
}

const salida = {
  _leeme: 'GENERADO por scripts/i18n-huella.mjs. Si una prueba dice que no coincide, revisa el cambio de textos, ejecuta las pruebas de idioma y vuelve a generarlo.',
  catalogos: hoy,
};
fs.writeFileSync(DESTINO, JSON.stringify(salida, null, 2) + '\n');
console.log(`i18n/huella.json: ${Object.keys(hoy).length} catálogos`);
