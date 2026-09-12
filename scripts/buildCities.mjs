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
 *   · no traduce nada con IA, ni aquí ni en la aplicación.
 *
 * ─── Las coordenadas ────────────────────────────────────────────────────────
 *
 * Desde la fase de "lugares cerca de ti" sí se guardan, y conviene ser preciso
 * sobre QUÉ son: son las coordenadas DE LOS LUGARES —dónde está Barranco—, no
 * las de ninguna persona. Un dato público de un sitio público, el mismo que está
 * en cualquier atlas.
 *
 * Sirven para una sola cosa: que el teléfono pueda ordenar por cercanía sin
 * preguntarle a nadie. La posición de quien usa Weë sigue sin salir del aparato
 * y sigue publicándose como zona, nunca como punto.
 *
 * Se guardan con TRES DECIMALES, que son unos 110 m. Suficiente para decir "a 4
 * km" y para ordenar bien, y casi medio mega menos que los cinco decimales que
 * trae GeoNames —una precisión de un metro que aquí no sirve para nada—.
 *
 * ─── La relevancia ──────────────────────────────────────────────────────────
 *
 * Cuando dos lugares encajan igual con lo escrito y ninguno está cerca de quien
 * busca, tiene que decidir cuál es más importante. Y "importante" no puede ser
 * un decreto nuestro: sale de la POBLACIÓN que publica GeoNames.
 *
 * Con un matiz que es justo el caso de Barranco. GeoNames marca ciertos lugares
 * como `PPLX` —"sección de una ciudad"—: Barranco, Miraflores o Surco son trozos
 * de Lima, no pueblos. Su población propia (37.525) dice poco; lo que dice algo
 * es la de la ciudad de la que forman parte (7.7 millones). Así que una sección
 * HEREDA de su metrópoli —la capital o sede regional de medio millón o más que
 * tenga a menos de 20 km— un orden de magnitud menos que ella: es parte de la
 * ciudad, no la ciudad. La pertenencia la afirma GeoNames con su código; aquí
 * solo se le hace caso. Vale igual para Villa Lugano en Buenos Aires, Vallecas
 * en Madrid o Polanco en Ciudad de México.
 *
 * Se guarda como UN DÍGITO, el logaritmo de esa población: 6 son millones, 4
 * decenas de miles. Para ordenar basta, y cuesta un byte por lugar.
 */

/** Del número de habitantes a un dígito: 46.290 → 4; 7.737.002 → 6. */
const grado = (pop) => (pop > 0 ? Math.min(9, Math.floor(Math.log10(pop))) : 0);

/** Qué cuenta como metrópoli de la que una sección puede heredar. */
const esMetropoli = (l) => (l.fcode === 'PPLC' || l.fcode === 'PPLA') && l.pop >= 500000;
const RADIO_METROPOLI_KM = 20;

const R_TIERRA = 6371;
const aRad = (g) => (g * Math.PI) / 180;
const kmEntre = (a, b, c, d) => {
  const h = Math.sin(aRad(c - a) / 2) ** 2 + Math.cos(aRad(a)) * Math.cos(aRad(c)) * Math.sin(aRad(d - b) / 2) ** 2;
  return 2 * R_TIERRA * Math.asin(Math.min(1, Math.sqrt(h)));
};

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
const FUENTE_REGIONES = 'https://download.geonames.org/export/dump/admin1CodesASCII.txt';
const LICENCIA = 'CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/';

/**
 * Los adornos administrativos que GeoNames le pone al nombre de una región.
 *
 * "Departamento de Lima" es Lima; "Lima region" es Lima. Quien elige un lugar
 * quiere leer "Barranco · Lima, Perú", no "Barranco · Departamento de Lima,
 * Perú". Se quitan estos y NADA más: lo que queda sigue siendo el nombre que
 * publica GeoNames, no uno inventado.
 */
const ADORNOS_DELANTE = /^(Departamento|Provincia|Región|Region|Estado|Ciudad Autónoma|Comunidad Autónoma|Municipio|Distrito|Prefectura) de (la |las |los |el )?/i;
const ADORNOS_DETRAS = /\s+(region|province|department|state|prefecture|district|county|governorate|oblast|municipality|territory|F\.D\.)$/i;
const nombreDeRegion = (texto) => {
  const limpio = String(texto || '')
    .replace(ADORNOS_DELANTE, '')
    .replace(ADORNOS_DETRAS, '')
    .trim();
  /* Si al quitar el adorno no queda nada, el adorno ERA el nombre: se respeta. */
  return limpio || String(texto || '').trim();
};

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

/** Un archivo de texto suelto, sin zip: los códigos de región son 148 KB. */
const traerTexto = (url, nombre) => {
  fs.mkdirSync(trabajo, { recursive: true });
  const destino = path.join(trabajo, nombre);
  if (fs.existsSync(destino)) return destino;
  console.log('Descargando', url);
  execFileSync('curl', ['-sL', '--max-time', '300', '-o', destino, url], { stdio: 'inherit' });
  if (!fs.existsSync(destino) || fs.statSync(destino).size < 1000) throw new Error('La descarga falló: ' + url);
  return destino;
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
  /* De "PE/lima" a "PE-LIM": así, cuando GeoNames traiga esa misma Lima y se
     descarte por duplicada, se le pueden quedar sus coordenadas al identificador
     de siempre en vez de perderlas con ella. */
  const claves = new Map();
  const ids = new Set();
  for (const m of texto.matchAll(/\{ id: '([^']+)', countryCode: '([^']+)', name: '([^']+)'/g)) {
    ids.add(m[1]);
    claves.set(m[2] + '/' + normalizar(m[3]), m[1]);
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
 * ─── Y solo el PREFERIDO ────────────────────────────────────────────────────
 *
 * GeoNames marca con `isPreferredName` cuál es EL nombre en un idioma. Los demás
 * son cualquier cosa que alguien registró alguna vez, y hay de todo: al
 * Miraflores de Lima le cuelga un "san borja" —que es el distrito de al lado—,
 * sin marcar como preferido. Cogiendo "el primero que aparezca" cuando no hay
 * preferido, ese Miraflores se enseñaba como "san borja".
 *
 * Así que se exige la marca. Es un criterio de la fuente, no una corazonada
 * nuestra sobre qué alias se parece bastante al nombre. Lo que no la tenga se
 * queda fuera y el lugar se enseña con su nombre canónico, que nunca miente.
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
    if (c[4] !== '1') continue; // y SOLO el preferido: lo demás es ruido
    const id = c[1];
    if (!necesarios.has(id)) continue;
    const nombre = c[3];
    if (!nombre) continue;
    if (!alias.has(id)) alias.set(id, { nombre, preferido: true });
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
 * Una línea por lugar:  país|identificador|nombre|nivel|alias|latitud|longitud|región|relevancia
 *
 *   PE|g3946818|Barranco|s||-12.143|-77.019|15|6
 *   DE|g2867714|Munich|M|Múnich|48.137|11.576|02|6
 *
 * La relevancia es un dígito: el logaritmo de la población del lugar o, si es
 * una sección de ciudad, de la ciudad de la que forma parte.
 *
 * La región es el CÓDIGO de GeoNames —dos o tres caracteres—, no su nombre: los
 * nombres van una sola vez en su propia tabla. Guardar "Departamento de Lima"
 * ochenta mil veces costaría casi un mega para decir lo mismo.
 *
 * Y es lo que hace falta para distinguir: en Perú hay CINCO Miraflores, y sin la
 * región las cinco se leen igual.
 */
const tresDecimales = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(3) : '';
};
const comoLinea = (l) =>
  `${l.cc}|g${l.geonameId}|${l.name}|${l.tier}|${l.alias || ''}|${tresDecimales(l.lat)}|${tresDecimales(l.lon)}|${l.adm1 || ''}|${l.rel ?? grado(l.pop)}`;

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
  /* Las coordenadas de los 189 lugares escritos a mano, rescatadas de su gemelo
     de GeoNames antes de descartarlo. Sin esto, Lima —que es de las escritas a
     mano— no podría salir nunca en "cerca de ti". */
  const coordsAMano = new Map();
  /* Capitales y sedes regionales de medio millón o más: de ellas heredan las
     secciones de ciudad su población. */
  const metropolis = [];
  const descartes = { fuera: 0, sinPais: 0, yaEstaban: 0 };
  let fuente = 0;

  for (const linea of fs.readFileSync(txtCiudades, 'utf8').split('\n')) {
    if (!linea) continue;
    fuente++;
    const c = linea.split('\t');
    // c[4] y c[5] son la latitud y la longitud. Son del LUGAR, no de nadie.
    // c[10] es el código de la región: lo que distingue las cinco Miraflores.
    const l = { geonameId: c[0], name: c[1], cc: c[8], fcode: c[7], pop: Number(c[14]) || 0, lat: c[4], lon: c[5], adm1: c[10] };
    if (!entra(l)) {
      descartes.fuera++;
      continue;
    }
    if (!validos.has(l.cc)) {
      descartes.sinPais++;
      sinPais.set(l.cc, (sinPais.get(l.cc) || 0) + 1);
      continue;
    }
    /* Las metrópolis se apuntan ANTES de mirar si el lugar ya estaba escrito a
       mano: Lima lo está, se descarta como duplicada, y aun así Barranco tiene
       que poder heredar su población. */
    if (esMetropoli(l)) metropolis.push({ lat: Number(l.lat), lon: Number(l.lon), pop: l.pop });
    const yaEstaba = claves.get(l.cc + '/' + normalizar(l.name));
    if (yaEstaba) {
      descartes.yaEstaban++;
      /* El primero gana: GeoNames puede traer varios sitios con el mismo nombre
         en el mismo país, y el de más población va antes en la práctica. */
      if (!coordsAMano.has(yaEstaba)) coordsAMano.set(yaEstaba, { lat: l.lat, lon: l.lon, pop: l.pop });
      continue;
    }
    // El nombre no puede llevar la barra que separa los campos.
    if (l.name.includes('|')) l.name = l.name.replace(/\|/g, ' ');
    seleccion.push({ ...l, tier: nivelDe(l) });
  }

  /*
   * 1a) La relevancia. La propia población, salvo para las SECCIONES de ciudad,
   * que heredan la de la metrópoli que tengan a menos de 20 km —la mayor, si hay
   * varias—. Una caja de un cuarto de grado descarta casi todo antes de medir.
   */
  let seccionesPromovidas = 0;
  for (const l of seleccion) {
    let pop = l.pop;
    if (l.fcode === 'PPLX') {
      const la = Number(l.lat);
      const lo = Number(l.lon);
      let mejor = 0;
      for (const m of metropolis) {
        if (Math.abs(m.lat - la) > 0.25 || Math.abs(m.lon - lo) > 0.25) continue;
        if (kmEntre(la, lo, m.lat, m.lon) <= RADIO_METROPOLI_KM && m.pop > mejor) mejor = m.pop;
      }
      /* Hereda un orden de magnitud MENOS que la metrópoli: es parte de la
         ciudad, no la ciudad. Barranco (37 mil) sube así a la escala de los
         cientos de miles —la de Miraflores o Surco— y le gana a Barranca; pero
         ningún barrio de São Paulo le pasa por delante a París. */
      const heredado = mejor > 0 ? grado(mejor) - 1 : 0;
      if (heredado > grado(pop)) {
        l.rel = heredado;
        seccionesPromovidas++;
      }
    }
    if (l.rel === undefined) l.rel = grado(pop);
  }

  /*
   * 1b) Las regiones. Solo las que de verdad usa algún lugar seleccionado: de
   * las 3.865 que publica GeoNames sobran las de los países que Weë no lista.
   */
  const regiones = new Map(); // 'PE.15' -> { nombre, geonameId }
  try {
    const txtRegiones = traerTexto(FUENTE_REGIONES, 'admin1CodesASCII.txt');
    const usadas = new Set(seleccion.filter((l) => l.adm1).map((l) => `${l.cc}.${l.adm1}`));
    for (const linea of fs.readFileSync(txtRegiones, 'utf8').split('\n')) {
      if (!linea) continue;
      const [codigo, nombre, , geonameId] = linea.split('\t');
      if (!usadas.has(codigo)) continue;
      regiones.set(codigo, { nombre: nombreDeRegion(nombre), geonameId });
    }
  } catch (error) {
    console.warn('\nSin nombres de región:', error.message);
    console.warn('El catálogo se construye igual; los lugares dirán solo su país.\n');
  }

  // 2) Los alias en español, de los lugares Y de las regiones, en una pasada.
  let conAlias = 0;
  let regionesEnEspanol = 0;
  let leidasAlias = 0;
  try {
    const txtAlias = traer(FUENTE_ALIAS, 'alternateNamesV2.zip', 'alternateNamesV2.txt');
    const necesarios = new Set(seleccion.map((l) => l.geonameId));
    for (const r of regiones.values()) if (r.geonameId) necesarios.add(r.geonameId);
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
    /* "Lima region" es el nombre en inglés; en español GeoNames dice
       "Departamento de Lima", y quitándole el adorno queda "Lima". */
    for (const [codigo, r] of regiones) {
      const a = alias.get(r.geonameId);
      if (!a) continue;
      const limpio = nombreDeRegion(a.nombre);
      if (limpio && limpio !== r.nombre) {
        regiones.set(codigo, { ...r, nombre: limpio });
        regionesEnEspanol++;
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
  const cuerpoAMano = [...coordsAMano.entries()]
    .map(([id, c]) => `${id}|${tresDecimales(c.lat)}|${tresDecimales(c.lon)}|${grado(c.pop)}`)
    .join('\n');
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
 * Es UNA CADENA a propósito, no ${seleccion.length} objetos. Una cadena de tres
 * megas es una cadena de tres megas; ${seleccion.length} objetos son decenas de
 * megas de memoria y un buen rato de trabajo al arrancar. Se recorre al buscar y
 * solo se construyen objetos para los pocos resultados que se van a enseñar.
 *
 * Una línea por lugar:  país|identificador|nombre|nivel|alias|latitud|longitud|región|relevancia
 *
 * La región es un código —'15'— cuyo nombre va una sola vez en \`REGIONS\`. La
 * relevancia es un dígito: el logaritmo de la población, y una sección de ciudad
 * (\`PPLX\` en GeoNames) hereda de su metrópoli un orden de magnitud menos que
 * ella. Barranco pesa como un distrito de Lima, no como un pueblo de 37 mil.
 *
 * Las coordenadas son DEL LUGAR —dónde está Barranco—, no de ninguna persona: un
 * dato público de un sitio público. Sirven para que el teléfono ordene por
 * cercanía sin preguntarle a nadie. Tres decimales, unos 110 m, que es lo que
 * hace falta para decir "a 4 km" y ni un metro más.
 *
 * Y este archivo NO se carga al abrir Weë: lo pide \`data/places.ts\` la primera
 * vez que alguien abre el selector de lugar, y no antes.
 */

export const WORLD_PLACES = \``;

  const cuerpoRegiones = [...regiones.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([codigo, r]) => `${codigo}|${r.nombre.replace(/\|/g, ' ')}`)
    .join('\n');

  /*
   * Las coordenadas de los lugares escritos a mano, que no viajan en la cadena de
   * arriba porque sus líneas no existen ahí: se descartaron por duplicadas. Van
   * aparte, con su identificador de siempre.
   */
  const cabeceraAMano = `\`;

/**
 * Las coordenadas de los lugares escritos a mano de \`data/cities.ts\`, tomadas de
 * su gemelo en GeoNames antes de descartarlo por duplicado. ${coordsAMano.size} de 189.
 * Y su relevancia, que es el mismo dígito de población que llevan los demás:
 * estar en la lista escrita a mano no da prioridad por sí solo.
 *
 * Una línea por lugar:  identificador|latitud|longitud|relevancia
 */
export const HAND_COORDS = \``;

  const cabeceraRegiones = `\`;

/**
 * Los nombres de las regiones, una sola vez. ${regiones.size} en total.
 *
 * Una línea por región:  código|nombre
 *
 *   PE.15|Lima
 *   CO.13|Bolívar
 *
 * Es lo que convierte cinco "Miraflores · Perú" indistinguibles en "Miraflores ·
 * Lima, Perú", "Miraflores · Arequipa, Perú" y así. Los nombres son los de
 * GeoNames, en español cuando lo tiene, sin el adorno administrativo delante
 * ("Departamento de Lima" → "Lima").
 */
export const REGIONS = \``;

  const escapar = (t) => t.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
  fs.writeFileSync(
    salida,
    cabecera + escapar(cuerpo) + cabeceraAMano + escapar(cuerpoAMano) + cabeceraRegiones + escapar(cuerpoRegiones) + '`;\n'
  );
  console.log('\nescrito', salida);
  console.log('en disco', (fs.statSync(salida).size / 1048576).toFixed(2), 'MB');
  console.log('coordenadas de los escritos a mano', coordsAMano.size, 'de 189');
  console.log('regiones', regiones.size, '·', regionesEnEspanol, 'con nombre en español');
  console.log('metrópolis', metropolis.length, '· secciones que heredan su población', seccionesPromovidas, '\n');
};

main();
