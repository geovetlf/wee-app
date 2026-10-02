#!/usr/bin/env node
/*
 * LA UNIÓN DE LAS DOS CADENAS DE `npm test` (docs/INTEGRACION-PRODUCCION.md §3 y §10).
 *
 * Parte de la cadena de «ours» (el Harness) y mete cada suite que solo tiene
 * «theirs» (producción) justo después de la que la precede en «theirs». Nada se
 * pierde ni se duplica, y el resto del package.json es el de «ours». Sirve para
 * regenerar `conflictos.patch` si `functions/package.json` cambia antes de integrar.
 *
 *   node ops/integracion/unir-cadena.mjs <package.json de ours> <package.json de theirs> <salida>
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/** Pura: las dos listas de pasos → la unión, en orden. */
export const unirPasos = (pasosOurs, pasosTheirs) => {
  const resultado = [...pasosOurs];
  let anterior = null;
  for (const paso of pasosTheirs) {
    if (!resultado.includes(paso)) resultado.splice(anterior === null ? 0 : resultado.indexOf(anterior) + 1, 0, paso);
    anterior = paso;
  }
  return resultado;
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [ours, theirs, salida] = process.argv.slice(2);
  if (!ours || !theirs || !salida) { console.error('uso: node ops/integracion/unir-cadena.mjs <ours> <theirs> <salida>'); process.exit(2); }
  const o = JSON.parse(fs.readFileSync(ours, 'utf8'));
  const t = JSON.parse(fs.readFileSync(theirs, 'utf8'));
  const pasosO = o.scripts.test.split(' && ');
  const union = unirPasos(pasosO, t.scripts.test.split(' && '));
  o.scripts.test = union.join(' && ');
  fs.writeFileSync(salida, `${JSON.stringify(o, null, 2)}\n`);
  console.log(`cadena: ${pasosO.length} (ours) + ${union.length - pasosO.length} (theirs) = ${union.length}`);
}
