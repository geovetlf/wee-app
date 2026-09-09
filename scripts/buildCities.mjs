/**
 * Construye el catálogo mundial de lugares de Weë a partir de GeoNames.
 *
 * NO se ejecuta nunca desde la aplicación. Es una herramienta de escritorio: se
 * lanza a mano, descarga los datos, los filtra y escribe un archivo que a partir
 * de ese momento vive en el repositorio como cualquier otro código. La aplicación
 * nunca habla con GeoNames: ni al arrancar, ni al buscar, ni nunca.
 *
 *   node scripts/buildCities.mjs --dry-run   ← cuenta y mide, no escribe nada
 *   node scripts/buildCities.mjs --write     ← escribe data/citiesWorld.ts
 *
 * ─── Fuente y licencia ──────────────────────────────────────────────────────
 *
 *   GeoNames · https://www.geonames.org
 *   Creative Commons Attribution 4.0 · https://creativecommons.org/licenses/by/4.0/
 *
 * Permite uso comercial, modificación y redistribución a cambio de atribuir. La
 * atribución de Weë vive en data/GEONAMES-LICENSE.md y se enseña en Ayuda.
 *
 * ─── Lo que este script NO hace ─────────────────────────────────────────────
 *
 *   · no toca data/countries.ts: los países de Weë los decide una persona;
 *   · no toca los lugares escritos a mano ni sus identificadores;
 *   · no guarda coordenadas, aunque GeoNames las trae: se leen y se tiran;
 *   · no traduce nada con IA, ni aquí ni en la aplicación.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const IMPORTACION_AUTORIZADA = true; // Autorizada en la fase 2E-63C.3.

const FUENTE = 'https://download.geonames.org/export/dump/cities1000.zip';
const FUENTE_ALIAS = 'https://download.geonames.org/export/dump/alternateNamesV2.zip';
const LICENCIA = 'CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/';

/**
 * El filtro.
 *
 * Por población sola no vale: Casma es capital de provincia y GeoNames no le
 * apunta ninguna población, así que cualquier corte por habitantes la deja fuera
 * —y Casma es justo el ejemplo que motivó todo esto—. Entra cualquier sede
 * administrativa, tenga los habitantes que tenga, más todo lo que pase de quince
 * mil.
 */
const SEDES = ['PPLC', 'PPLA', 'PPLA2', 'PPLA3'];
const POBLACION_MINIMA = 15000;
const entra = (l) => SEDES.includes(l.fcode) || l.pop >= POBLACION_MINIMA;

/** Principal o secundaria: decide qué se enseña antes al buscar. */
const nivelDe = (l) => (l.fcode === 'PPLC' || l.fcode === 'PPLA' || l.pop >= 200000 ? 'M' : 's');

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const trabajo = path.join(os.tmpdir(), 'wee-cities');

// ─── Descarga y descompresión ───────────────────────────────────────────────

/**
 * No hay un descompresor que esté en todas partes: el tar de Windows no entiende
 * rutas con letra de unidad y el de Git Bash a veces no reconoce los zip. Se
 * prueban los tres caminos razonables antes de rendirse.
 */
const descomprimir = (zip) => {
  const intentos = [
    () => execFileSync('tar', ['-xf', path.basename(zip)], { cwd: trabajo, stdio: 'pipe' }),
    () =>
      execFileSync('powershell', ['-NoProfile', '-Command', `Expand-Archive -LiteralPath '${zip}' -DestinationPath '${trabajo}' -Force`], {
        stdio: 'pipe',
      }),
    () => execFileSync('unzip', ['-o', '-q', zip, '-d', trabajo], { stdio: 'pipe' }),
  ];
  for (const intento of intentos) {
    try {
      intento();
      return;
    } catch {
      /* se prueba el siguiente */
    }
  }
  throw new Error('No se pudo descomprimir ' + zip + '. Extráelo a mano en ' + trabajo);
};

const traer = (url, nombreZip, nombreTxt) => {
  fs.mkdirSync(trabajo, { recursive: true });
  const zip = path.join(trabajo, nombreZip);
  const txt = path.join(trabajo, nombreTxt);
  if (fs.existsSync(txt)) return txt;
  console.log('Descargando', url);
  execFileSync('curl', ['-sL', '--max-time', '1800', '-o', zip, url], { stdio: 'inherit' });
  if (!fs.existsSync(zip) || fs.statSync(zip).size < 1000) throw new Error('La descarga falló: ' + url);
  descomprimir(zip);
  if (!fs.existsSync(txt)) throw new Error('El archivo esperado no apareció: ' + txt);
  return txt;
};

// ─── Los catálogos que Weë ya tiene ─────────────────────────────────────────

/** Igual que en la aplicación: sin acentos y en minúsculas. */
const normalizar = (v) =>
  v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/**
 * Los países que Weë reconoce. GeoNames trae territorios que countries.ts no
 * lista —Hong Kong, Macao, Palestina, Kosovo—; esta herramienta NO los inventa:
 * los aparta y los cuenta, para que la decisión de qué es un país la tome una
 * persona.
 */
const paisesDeWee = () =>
  new Set([...fs.readFileSync(path.join(raiz, 'data', 'countries.ts'), 'utf8').matchAll(/\{ code: '([A-Z]{2})'/g)].map((m) => m[1]));

/**
 * Lo escrito a mano. NUNCA se toca: una publicación que diga `PE-LIM` tiene que
 * seguir diciendo Lima dentro de diez años. Lo importado que coincida con uno de
 * estos por país y nombre se descarta, y se queda el de siempre.
 */
const escritoAMano = () => {
  const texto = fs.readFileSync(path.join(raiz, 'data', 'cities.ts'), 'utf8');
  const claves = new Set();
  const ids = new Set();
  for (const m of texto.matchAll(/\{ id: '([^']+)', countryCode: '([^']+)', name: '([^']+)'/g)) {
    ids.add(m[1]);
    claves.add(m[2] + '/' + normalizar(m[3]));
  }
  return { claves, ids };
};

/**
 * El identificador de un lugar importado.
 *
 * Tres letras no bastan: solo en Perú hay 1.646 lugares y las colisiones serían
 * constantes. Los importados llevan el número de GeoNames, que es estable, único
 * y ajeno al idioma. Conviven con los escritos a mano porque el país va delante
 * en los dos casos.
 */
const idImportado = (l) => `${l.cc}-g${l.geonameId}`;

// ─── Los alias en español ───────────────────────────────────────────────────

/**
 * De todo el archivo de nombres alternativos —más de un giga— solo interesa una
 * cosa: el nombre en español de los lugares seleccionados, y solo cuando se
 * escribe distinto del canónico. "Múnich" sí; "Lima" no, porque ya es Lima.
 *
 * Se lee línea a línea, sin cargar el archivo en memoria. Lo que sale de aquí son
 * unos pocos cientos de kilobytes.
 */
const aliasEnEspanol = async (txt, necesarios) => {
  const alias = new Map();
  const lector = readline.createInterface({ input: fs.createReadStream(txt, { encoding: 'utf8' }), crlfDelay: Infinity });
  let leidas = 0;
  for await (const linea of lector) {
    leidas++;
    // 0 id, 1 geonameid, 2 idioma, 3 nombre, 4 preferido, 5 corto, 6 coloquial, 7 histórico
    const c = linea.split('\t');
    if (c[2] !== 'es' || c[7] === '1' || c[6] === '1') continue; // ni histórico ni coloquial
    const id = c[1];
    if (!necesarios.has(id)) continue;
    const nombre = c[3];
    if (!nombre) continue;
    const previo = alias.get(id);
    // El preferido gana; si no hay preferido, el primero que aparezca.
    if (!previo || (c[4] === '1' && !previo.preferido)) alias.set(id, { nombre, preferido: c[4] === '1' });
  }
  return { alias, leidas };
};

// ─── El artefacto ───────────────────────────────────────────────────────────

/**
 * El catálogo se guarda como UNA CADENA, no como decenas de miles de objetos.
 *
 * La diferencia importa: una cadena de dos megas es una cadena de dos megas, y
 * ochenta mil objetos son decenas de megas de memoria y un buen rato de trabajo
 * al arrancar. La aplicación recorre la cadena al buscar y solo construye objetos
 * para los pocos resultados que va a enseñar.
 *
 * Una línea por lugar:  país|identificador|nombre|nivel|alias en español
 *
 *   PE|g3698680|Casma|s|
 *   DE|g2867714|Munich|M|Múnich
 */
const comoLinea = (l) => `${l.cc}|g${l.geonameId}|${l.name}|${l.tier}|${l.alias || ''}`;

// ─── El proceso ─────────────────────────────────────────────────────────────

const main = async () => {
  const escribir = process.argv.includes('--write');
  if (escribir && !IMPORTACION_AUTORIZADA) {
    console.error('\nLa importación no está autorizada.\n');
    process.exit(1);
  }

  const txtCiudades = traer(FUENTE, 'cities1000.zip', 'cities1000.txt');
  const validos = paisesDeWee();
  const { claves, ids } = escritoAMano();

  // 1) Filtrar.
  const seleccion = [];
  const sinPais = new Map();
  const descartes = { fuera: 0, sinPais: 0, yaEstaban: 0 };
  let fuente = 0;

  for (const linea of fs.readFileSync(txtCiudades, 'utf8').split('\n')) {
    if (!linea) continue;
    fuente++;
    const c = linea.split('\t');
    const l = { geonameId: c[0], name: c[1], cc: c[8], fcode: c[7], pop: Number(c[14]) || 0 };
    if (!entra(l)) {
      descartes.fuera++;
      continue;
    }
    if (!validos.has(l.cc)) {
      descartes.sinPais++;
      sinPais.set(l.cc, (sinPais.get(l.cc) || 0) + 1);
      continue;
    }
    if (claves.has(l.cc + '/' + normalizar(l.name))) {
      descartes.yaEstaban++;
      continue;
    }
    // El nombre no puede llevar la barra que separa los campos.
    if (l.name.includes('|')) l.name = l.name.replace(/\|/g, ' ');
    seleccion.push({ ...l, tier: nivelDe(l) });
  }

  // 2) Los alias en español, solo de lo seleccionado.
  let conAlias = 0;
  let leidasAlias = 0;
  try {
    const txtAlias = traer(FUENTE_ALIAS, 'alternateNamesV2.zip', 'alternateNamesV2.txt');
    const necesarios = new Set(seleccion.map((l) => l.geonameId));
    const { alias, leidas } = await aliasEnEspanol(txtAlias, necesarios);
    leidasAlias = leidas;
    for (const l of seleccion) {
      const a = alias.get(l.geonameId);
      // Solo se guarda si de verdad se escribe distinto: "Lima" no necesita alias.
      if (a && normalizar(a.nombre) !== normalizar(l.name)) {
        l.alias = a.nombre.replace(/\|/g, ' ');
        conAlias++;
      }
    }
  } catch (error) {
    console.warn('\nSin alias en español:', error.message);
    console.warn('El catálogo se construye igual, con los nombres canónicos.\n');
  }

  // 3) Medir.
  const cuerpo = seleccion.map(comoLinea).join('\n');
  const crudo = Buffer.byteLength(cuerpo, 'utf8');
  const comprimido = zlib.gzipSync(Buffer.from(cuerpo, 'utf8')).length;
  const porPais = {};
  for (const l of seleccion) porPais[l.cc] = (porPais[l.cc] || 0) + 1;
  const sinNada = [...validos].filter((c) => !porPais[c]);

  console.log('\n══ CATÁLOGO MUNDIAL ══');
  console.log('fuente             ', FUENTE);
  console.log('licencia           ', LICENCIA);
  console.log('registros fuente   ', fuente.toLocaleString('es'));
  console.log('seleccionados      ', seleccion.length.toLocaleString('es'));
  console.log('  principales      ', seleccion.filter((l) => l.tier === 'M').length.toLocaleString('es'));
  console.log('  secundarias      ', seleccion.filter((l) => l.tier === 's').length.toLocaleString('es'));
  console.log('  con alias español', conAlias.toLocaleString('es'), leidasAlias ? '(de ' + leidasAlias.toLocaleString('es') + ' nombres alternativos leídos)' : '');
  console.log('países cubiertos   ', Object.keys(porPais).length, 'de', validos.size);
  console.log('países sin nada    ', sinNada.length, sinNada.length ? '→ ' + sinNada.join(' ') : '');
  console.log('descartados        ', 'fuera del filtro:', descartes.fuera.toLocaleString('es'), '| sin país en Weë:', descartes.sinPais, '| ya escritos a mano:', descartes.yaEstaban);
  console.log('artefacto          ', (crudo / 1048576).toFixed(2), 'MB en crudo |', (comprimido / 1048576).toFixed(2), 'MB comprimido');
  if (sinPais.size) {
    console.log('\nterritorios que countries.ts no lista, apartados sin tocar nada:');
    console.log(' ', [...sinPais.entries()].sort((a, b) => b[1] - a[1]).map(([c, n]) => c + ':' + n).join(' '));
  }

  // 4) Validar antes de escribir.
  const problemas = [];
  const vistos = new Set();
  for (const l of seleccion) {
    const id = idImportado(l);
    if (vistos.has(id)) problemas.push('id repetido: ' + id);
    if (ids.has(id)) problemas.push('id choca con uno escrito a mano: ' + id);
    vistos.add(id);
    if (!validos.has(l.cc)) problemas.push('país inválido: ' + l.cc);
    if (!l.name) problemas.push('sin nombre: ' + id);
  }
  console.log('\nintegridad         ', problemas.length ? '✘ ' + problemas.slice(0, 5).join(' · ') : '✔ sin problemas');
  if (problemas.length) process.exit(1);

  if (!escribir) {
    console.log('\n(en seco: no se ha escrito nada)\n');
    return;
  }

  const salida = path.join(raiz, 'data', 'citiesWorld.ts');
  const fecha = fs.statSync(txtCiudades).mtime.toISOString().slice(0, 10);
  const cabecera = `/**
 * Catálogo mundial de lugares de Weë. GENERADO — no editar a mano.
 *
 *   node scripts/buildCities.mjs --write
 *
 * Fuente:    ${FUENTE}
 * Licencia:  GeoNames, ${LICENCIA}
 * Dataset:   ${fecha}
 * Lugares:   ${seleccion.length} en ${Object.keys(porPais).length} países
 *
 * Es UNA CADENA a propósito, no ${seleccion.length} objetos. Una cadena de dos
 * megas es una cadena de dos megas; ${seleccion.length} objetos son decenas de
 * megas de memoria y un buen rato de trabajo al arrancar. Se recorre al buscar y
 * solo se construyen objetos para los pocos resultados que se van a enseñar.
 *
 * Una línea por lugar:  país|identificador|nombre|nivel|alias en español
 *
 * Y este archivo NO se carga al abrir Weë: lo pide \`data/places.ts\` la primera
 * vez que alguien abre el selector de lugar, y no antes.
 */

export const WORLD_PLACES = \``;

  const seguro = cuerpo.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
  fs.writeFileSync(salida, cabecera + seguro + '`;\n');
  console.log('\nescrito', salida);
  console.log('en disco', (fs.statSync(salida).size / 1048576).toFixed(2), 'MB\n');
};

main();
