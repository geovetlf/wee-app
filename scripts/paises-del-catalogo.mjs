/*
 * LOS PAÍSES DEL REGISTRO, PARA EL SERVIDOR.
 *
 *   node scripts/paises-del-catalogo.mjs              → reescribe functions/src/shared/paisesDelCatalogo.ts
 *   node scripts/paises-del-catalogo.mjs --comprobar  → solo dice si está al día (sale con 1 si no)
 *
 * La jurisdicción de una cuenta es el país que declara su Perfil Real, y solo vale si es uno de los que ofrece el
 * registro (`data/countries.ts`): cualquier otro valor no es un país que Weë pueda determinar, y para un modelo con
 * reglas territoriales eso falla cerrado (`functions/src/engine/jurisdiccion.ts`). Las Functions se compilan y se
 * despliegan sin la carpeta `data/`, así que este script copia los CÓDIGOS a un archivo GENERADO: no se edita a mano, y
 * `functions/test/mundo3d-gobernanza.test.mjs` falla si deja de decir lo que dice el catálogo.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGEN = path.join(RAIZ, 'data/countries.ts');
const DESTINO = path.join(RAIZ, 'functions/src/shared/paisesDelCatalogo.ts');

/** Los códigos del catálogo, ordenados y sin repetir. Pura, para poder probarla. */
export const codigosDelCatalogo = (fuente) => [...new Set([...String(fuente).matchAll(/code: '([A-Z]{2})'/g)].map((m) => m[1]))].sort();

/** El archivo generado, entero. Pura. */
export const archivoGenerado = (codigos) => {
  const filas = [];
  for (let i = 0; i < codigos.length; i += 20) filas.push(`  ${codigos.slice(i, i + 20).map((c) => `'${c}'`).join(', ')},`);
  return `/*
 * GENERADO por \`scripts/paises-del-catalogo.mjs\` desde \`data/countries.ts\`: no se edita a mano.
 *
 * Los países que ofrece el registro de Weë (ISO 3166-1 alfa-2). Solo uno de estos puede ser la jurisdicción de una
 * cuenta (\`engine/jurisdiccion.ts\`).
 */
export const CODIGOS_DE_PAISES_DEL_CATALOGO: readonly string[] = Object.freeze([
${filas.join('\n')}
]);
`;
};

const esperado = archivoGenerado(codigosDelCatalogo(fs.readFileSync(ORIGEN, 'utf8')));
const actual = fs.existsSync(DESTINO) ? fs.readFileSync(DESTINO, 'utf8') : '';
const ejecutadoDirecto = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (ejecutadoDirecto) {
  if (process.argv.includes('--comprobar')) {
    console.log(actual === esperado ? 'los países del catálogo están al día' : 'functions/src/shared/paisesDelCatalogo.ts no coincide con data/countries.ts');
    process.exit(actual === esperado ? 0 : 1);
  }
  fs.writeFileSync(DESTINO, esperado);
  console.log(`${path.relative(RAIZ, DESTINO)}: ${codigosDelCatalogo(fs.readFileSync(ORIGEN, 'utf8')).length} países`);
}
