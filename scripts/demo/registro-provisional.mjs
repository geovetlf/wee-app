/*
 * ENSAYO TÉCNICO: un registro con medios PROVISIONALES para probar reproducción, navegación y reinicio antes de tener
 * los medios finales. Copia los vídeos e imágenes dibujados en local que se le indiquen y los marca `origen:
 * 'provisional'`. NUNCA se graba la presentación con esto: `functions/test/demo-aislamiento.test.mjs` exige que
 * «Cómo lo hice» lo diga y no se atribuya herramientas.
 *
 *   node scripts/demo/registro-provisional.mjs <carpeta con weel-NN.webm e img-NN.png> <carpeta de salida>
 */
import fs from 'node:fs';
import path from 'node:path';
import { planDeMedios } from './medios.mjs';

const [origen, destino] = process.argv.slice(2);
if (!origen || !destino) { console.error('✘ Indica la carpeta de origen y la de salida.'); process.exit(2); }
fs.mkdirSync(destino, { recursive: true });
const de = (re) => fs.readdirSync(origen).filter((f) => re.test(f)).sort();
const videos = de(/^weel-\d+\.webm$/);
const imagenes = de(/^img-\d+\.png$/);
if (!videos.length || !imagenes.length) { console.error('✘ No hay medios en la carpeta de origen.'); process.exit(2); }

const registro = {};
let v = 0;
let i = 0;
for (const m of planDeMedios()) {
  const fuente = m.tipo === 'video' ? videos[v++ % videos.length] : imagenes[i++ % imagenes.length];
  if (!fs.existsSync(path.join(destino, fuente))) fs.copyFileSync(path.join(origen, fuente), path.join(destino, fuente));
  registro[m.id] = { archivo: fuente, origen: 'provisional', ...(m.tipo === 'video' ? {} : { ancho: 720, alto: 1280 }) };
}
fs.writeFileSync(path.join(destino, 'registro.json'), JSON.stringify(registro, null, 2));
console.log(`Registro provisional: ${Object.keys(registro).length} ranuras en ${destino}`);
