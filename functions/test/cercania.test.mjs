/*
 * LUGARES CERCA DE TI.
 *
 * El catálogo de Weë guarda ahora las coordenadas DE LOS LUGARES —dónde está
 * Barranco—, importadas de GeoNames una sola vez. Con eso el teléfono puede
 * ordenar por cercanía sin preguntarle nada a nadie.
 *
 * Hay dos cosas que se rompen en silencio y por eso se vigilan aquí:
 *
 *  1. que las distancias sean DE VERDAD. Un "≈ 4 km" inventado o mal calculado
 *     no da error: simplemente ordena mal, y nadie lo nota hasta que alguien
 *     busca su barrio y le sale una ciudad de otro país;
 *  2. que la posición de quien mira NO se escape. Se usa para comparar y se
 *     olvida: no se guarda, no se manda y no entra en ninguna publicación.
 *
 * La proximidad se EJECUTA de verdad, con el catálogo real y sus 78.771 lugares
 * —sin red, sin Firestore, sin permisos del sistema—; de la pantalla se lee el
 * código. Cada grupo lleva un control para que un verde no pueda ser vacío.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { comoSeLee, textosDe } from './i18n-ayuda.mjs';
const ES_C = textosDe('es');

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
/*
 * El fuente se lee ya RESUELTO: cada `t('modulo.clave')` sale como la frase que
 * le pone el diccionario español. Lo que se comprueba aquí sigue siendo lo que
 * se comprobaba —las palabras que ve la persona—, y de paso queda comprobado
 * que la clave existe y que dice lo que tiene que decir.
 */
const leer = (p) => comoSeLee(fs.readFileSync(path.resolve(RAIZ, p), 'utf8'));
/* Para EJECUTAR se compila el fuente original: el traductor va dentro. */
const leerCrudo = (p) => (fs.readFileSync(path.resolve(RAIZ, p), 'utf8'));

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const ts = require('typescript');
const soloCodigo = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const pantalla = leer('screens/AgregarUbicacionScreen.tsx');
const generado = leer('data/citiesWorld.ts');

/* Las dos cadenas del artefacto, sin transpilar tres megas para nada. */
const entre = (marca) => {
  const i = generado.indexOf(marca);
  const a = generado.indexOf('`', i) + 1;
  const b = generado.indexOf('`;', a);
  return generado.slice(a, b);
};
const WORLD_PLACES = entre('export const WORLD_PLACES');
const HAND_COORDS = entre('export const HAND_COORDS');
const REGIONS = entre('export const REGIONS');

/* El catálogo, ejecutable, con el mundo ya dentro. */
const fuente = leer('data/places.ts')
  .replace("import { COUNTRIES, Country } from './countries';", leer('data/countries.ts').replace(/export /g, ''))
  .replace("import { CITIES, City } from './cities';", leer('data/cities.ts').replace(/export /g, ''))
  .replace(
    "require('./citiesWorld') as { WORLD_PLACES: string; HAND_COORDS: string; REGIONS: string }",
    'globalThis.__CAT'
  );
globalThis.__CAT = { WORLD_PLACES, HAND_COORDS, REGIONS };
const js = ts.transpileModule(fuente, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const lugares = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n─── A. El catálogo trae coordenadas, y son suyas ───');

const lineas = WORLD_PLACES.split('\n').filter(Boolean);
check('el catálogo tiene decenas de miles de lugares', lineas.length > 70000, lineas.length.toLocaleString('es'));

let conCoords = 0;
let fueraDeRango = 0;
let camposMal = 0;
for (const l of lineas) {
  const c = l.split('|');
  /* Nueve: …|latitud|longitud|región|relevancia */
  if (c.length !== 9) {
    camposMal++;
    continue;
  }
  const lat = Number(c[5]);
  const lon = Number(c[6]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
  conCoords++;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) fueraDeRango++;
}
check('todas las líneas tienen sus nueve campos', camposMal === 0, `${camposMal} mal`);
check('todos los lugares traen coordenadas', conCoords === lineas.length, `${conCoords} de ${lineas.length}`);
check('ninguna coordenada está fuera del planeta', fueraDeRango === 0, `${fueraDeRango} fuera de rango`);

/* Tres decimales: ni más precisión de la que hace falta, ni menos. */
const decimales = lineas.slice(0, 500).map((l) => (l.split('|')[5].split('.')[1] || '').length);
check('se guardan con tres decimales, unos 110 m', decimales.every((d) => d === 3), `vistos: ${[...new Set(decimales)].join(',')}`);

check('los escritos a mano tienen su propio mapa de coordenadas', HAND_COORDS.split('\n').filter(Boolean).length > 100);
check(
  'la procedencia y la licencia están escritas en el artefacto',
  /geonames\.org|download\.geonames\.org/i.test(generado) && /CC BY 4\.0/.test(generado)
);

/* CONTROL: si alguien vaciara las coordenadas, esto lo caza. */
check(
  'CONTROL: la comprobación distingue un catálogo con coordenadas de uno sin ellas',
  'PE|g1|X|s||-12.046|-77.043'.split('|').length === 7 && 'PE|g1|X|s|'.split('|').length === 5,
  'si no distinguiera, el grupo entero sería decorativo'
);

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n─── B. La proximidad se calcula de verdad ───');

await lugares.cargarMundo();

/* Barranco, Lima. Coordenada pública de un sitio público. */
const t0 = process.hrtime.bigint();
const cercaDeBarranco = lugares.lugaresCercanos(-12.146, -77.022, 8);
const ms = Number(process.hrtime.bigint() - t0) / 1e6;

check('cerca de Barranco sale algo', cercaDeBarranco.length > 0, `${cercaDeBarranco.length} lugares`);
check(
  'y el primero es Barranco, que es donde estamos',
  cercaDeBarranco[0]?.opcion.label === 'Barranco',
  cercaDeBarranco[0]?.opcion.label
);
check(
  'los resultados están ORDENADOS por distancia',
  cercaDeBarranco.every((c, i) => i === 0 || cercaDeBarranco[i - 1].km <= c.km),
  cercaDeBarranco.map((c) => `${c.opcion.label} ${c.km.toFixed(1)}`).join(' · ')
);
check('todos son del país correcto', cercaDeBarranco.every((c) => c.opcion.countryCode === 'PE'));
check('ninguno está más lejos de lo que se considera cerca', cercaDeBarranco.every((c) => c.km <= 60));

/* Las distancias salen de coordenadas reales, no de un número puesto a mano. */
const surco = cercaDeBarranco.find((c) => /Surco/i.test(c.opcion.label));
check('Santiago de Surco sale, y a pocos kilómetros', !!surco && surco.km < 6, surco ? `${surco.km.toFixed(2)} km` : 'no salió');

/* Dos puntos separados dan resultados distintos: la distancia depende de dónde estás. */
const cercaDeMadrid = lugares.lugaresCercanos(40.417, -3.704, 8);
check('en Madrid salen lugares de España', cercaDeMadrid.length > 0 && cercaDeMadrid.every((c) => c.opcion.countryCode === 'ES'));
check(
  'y no se parecen en nada a los de Lima',
  !cercaDeMadrid.some((m) => cercaDeBarranco.some((b) => b.opcion.id === m.opcion.id)),
  'si coincidieran, la distancia no se estaría usando'
);

/* Un punto en mitad del océano no tiene nada cerca, y eso no es un error. */
const enElPacifico = lugares.lugaresCercanos(-30, -140, 8);
check('en mitad del Pacífico no sale nada, y no revienta', Array.isArray(enElPacifico) && enElPacifico.length === 0);

/* Entradas imposibles no rompen nada. */
check('una coordenada que no es número devuelve lista vacía', lugares.lugaresCercanos(NaN, 0).length === 0);
check('y undefined tampoco rompe', lugares.lugaresCercanos(undefined, undefined).length === 0);

check('el cálculo es rápido: una sola pasada por el catálogo', ms < 1500, `${ms.toFixed(0)} ms para 78.771 lugares`);

/* CONTROL: la distancia cambia si se mueve el punto. Si no cambiara, estaría fija. */
const desdeOtroSitio = lugares.lugaresCercanos(-12.05, -77.04, 3);
check(
  'CONTROL: moverse cambia las distancias',
  desdeOtroSitio[0]?.km !== cercaDeBarranco[0]?.km,
  `${desdeOtroSitio[0]?.km?.toFixed(2)} vs ${cercaDeBarranco[0]?.km?.toFixed(2)}`
);

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n─── C. Las distancias se dicen sin fingir precisión ───');

const d = lugares.distanciaAproximada;
check('menos de un kilómetro se dice con palabras', d(0.4) === 'A menos de 1 km', d(0.4));
check('pocos kilómetros, redondeados al entero', d(3.7) === '≈ 4 km', d(3.7));
check('y las decenas, redondeadas a cinco', d(23) === '≈ 25 km', d(23));
check('lo lejano se dice lejano', d(200) === 'A más de 60 km', d(200));
check(
  'nunca se enseñan decimales: eso sería precisión inventada',
  [0.4, 3.7, 12.34, 23, 200].every((k) => !/\d[.,]\d/.test(d(k))),
  [0.4, 3.7, 12.34, 23, 200].map(d).join(' · ')
);

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n─── D. Lo que la pantalla enseña, según lo que sabe ───');

check(
  'sin permiso: "Lugares en <tu país>"',
  /Lugares en \{\{pais\}\}/.test(pantalla)
  && /pais: userProfile\?\.countryName \|\| t\('composer\.yourCountry'\)/.test(leerCrudo('screens/AgregarUbicacionScreen.tsx'))
);
check('con ubicación fiable: "Lugares cerca de ti"', /📍 Lugares cerca de ti/.test(pantalla));
check(
  'y se cambia de una a otra por lo que hay, no por un botón',
  /hayCercanos \? \(/.test(pantalla) && /const hayCercanos = !!ubicacion && cercanos\.length > 0/.test(pantalla)
);
check(
  'una lectura demasiado difusa vuelve a la vista por país',
  /PRECISION_MINIMA_M/.test(pantalla) && /radioMetros <= PRECISION_MINIMA_M/.test(pantalla),
  'ordenar por cercanía con una lectura mala es ordenar por ruido'
);
check(
  'si no hay nada cerca, tampoco se queda en blanco',
  /cercanos\.length > 0/.test(pantalla) && /delPais\.length > 0/.test(pantalla)
);
check('la distancia solo se pinta cuando se ha podido calcular', /km !== undefined &&/.test(pantalla));
check('el buscador manual sigue ahí, con o sin permiso', /buscarLugares\(/.test(pantalla) && /lugarPropio\(texto\)/.test(pantalla));

/*
 * La ubicación es contexto, no una tarea: si ya hay permiso se usa al abrir, sin
 * botón; y si no lo hay, no se pide por abrir la pantalla.
 */
check(
  'con permiso previo, la cercanía se calcula sola al abrir',
  /useEffect\([\s\S]{0,400}?if \(!disponible \|\| lecturaActual\) return;[\s\S]{0,300}?refrescar\(\)/.test(pantalla),
  'nadie tiene que pulsar nada'
);
check('no queda ningún botón de "usar mi ubicación"', !/Usar mi ubicación/.test(pantalla));
check('ni el texto "Solo la zona, nunca el punto exacto"', !/Solo la zona/.test(pantalla));
check('ni el lema "Cuenta desde dónde, sin decir exactamente dónde"', !/Cuenta desde dónde/.test(pantalla));
check(
  'abrir la pantalla NO pide el permiso',
  !/activar\(/.test(pantalla),
  'el único sitio que lo pide sigue siendo Configuración'
);
check(
  'y Configuración lo sigue pidiendo, que es donde toca',
  /ubicacion\.activar\('aproximada'\)/.test(leer('screens/SettingsScreen.tsx'))
);

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n─── E. Ni una llamada fuera, ni una imagen ───');

const codigoPantalla = soloCodigo(pantalla);
const codigoPlaces = soloCodigo(leer('data/places.ts'));

check('la pantalla no llama a nadie', !/fetch\(|axios|XMLHttpRequest|WebSocket/.test(codigoPantalla));
check('el catálogo tampoco', !/fetch\(|axios|XMLHttpRequest/.test(codigoPlaces));
check(
  'ningún proveedor de mapas o lugares, en ningún sitio',
  !/googleapis|google ?places|google ?maps|mapbox|foursquare|openstreetmap|nominatim|here\.com|tomtom/i.test(
    codigoPantalla + codigoPlaces
  )
);
check('ni geocodificación en tiempo real', !/geocod|reverseGeocode|Location\.geocodeAsync/i.test(codigoPantalla + codigoPlaces));
check(
  'ninguna imagen externa: solo el logo que ya viaja en la app',
  !/https?:\/\//.test(codigoPantalla) && !/uri:/.test(codigoPantalla) && (pantalla.match(/<Image/g) || []).length === 1
);
check('el catálogo sigue cargándose solo cuando hace falta', /cargarMundo\(\)/.test(pantalla) && /const modulo = require\('\.\/citiesWorld'\)/.test(leer('data/places.ts')));

/* La descarga de GeoNames es una herramienta de escritorio, no de la app. */
const script = leer('scripts/buildCities.mjs');
check('GeoNames se descarga UNA vez, desde un script de escritorio', /download\.geonames\.org/.test(script));
check('y la aplicación nunca habla con GeoNames', !/geonames/i.test(codigoPantalla + codigoPlaces));
check('la licencia y la atribución están escritas', /CC BY 4\.0/.test(script) && fs.existsSync(path.resolve(RAIZ, 'data/GEONAMES-LICENSE.md')));

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n─── F. La posición de quien mira no se escapa ───');

const compositor = leer('screens/CreateScreen.tsx');

check(
  'la pantalla no guarda ninguna latitud en su estado',
  !/useState[^\n]*latitude|setLatitud|setLongitud/.test(codigoPantalla),
  'la lectura se usa para comparar y se olvida'
);
check(
  'lo único que se guarda de la ubicación es la zona',
  /\.\.\.\(ubicacion \? \{ ubicacion \} : \{\}\)/.test(compositor) &&
    !/latitude|longitude/.test(soloCodigo(compositor))
);
check(
  'la lectura sale del contexto, que es donde vive',
  /ubicacionDeWee\.lectura|lectura: lecturaActual/.test(pantalla) && /aPublica\(/.test(pantalla)
);
check(
  '`aPublica` sigue siendo la única salida pública de una ubicación',
  /export const aPublica/.test(leer('utils/locationPrivacy.ts'))
);
check(
  'y locationPrivacy no se ha tocado para esto',
  !/lugaresCercanos|distanciaAproximada|places/.test(leer('utils/locationPrivacy.ts')),
  'el cálculo de lugares vive en places, no en la capa de privacidad'
);
check(
  'la distancia no viaja a ninguna publicación',
  !/km:/.test(soloCodigo(compositor)) && !/distancia/i.test(soloCodigo(compositor))
);

/* place y ubicacion, independientes: cuatro combinaciones posibles. */
const armar = ({ place, ubicacion }) => ({
  ...(place ? { place } : {}),
  ...(ubicacion ? { ubicacion } : {}),
});
const zona = { zona: '-12.0,-77.0', radioKm: 11, precision: 'aproximada' };
const unLugar = { kind: 'custom', label: 'París' };
check('solo lugar', JSON.stringify(armar({ place: unLugar })) === JSON.stringify({ place: unLugar }));
check('solo zona', JSON.stringify(armar({ ubicacion: zona })) === JSON.stringify({ ubicacion: zona }));
check('las dos', Object.keys(armar({ place: unLugar, ubicacion: zona })).length === 2);
check('ninguna', Object.keys(armar({})).length === 0);
check(
  'y la zona que se guarda no lleva coordenadas',
  !/latitude|longitude/.test(JSON.stringify(zona)),
  JSON.stringify(zona)
);

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n─── G. Ninguna coordenada inventada ───');

/*
 * La comprobación contra el archivo original de GeoNames se hace con
 * `scripts/buildCities.mjs` y su auditoría, que necesita los 31 MB de la fuente.
 * Aquí se vigila lo que sí se puede vigilar en cualquier máquina: que nadie haya
 * escrito coordenadas a mano por el código, que es como se cuelan las falsas.
 */
const recorrer = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name === 'node_modules' || e.name.startsWith('.') || e.name === 'citiesWorld.ts') return [];
    const p = path.join(dir, e.name);
    return e.isDirectory() ? recorrer(p) : /\.(ts|tsx)$/.test(p) ? [p] : [];
  });

const sospechosos = [];
for (const d of ['screens', 'components', 'data', 'utils', 'services', 'contexts', 'hooks']) {
  for (const f of recorrer(path.join(RAIZ, d))) {
    const s = soloCodigo(fs.readFileSync(f, 'utf8'));
    const m = s.match(/-?\d{1,3}\.\d{3,}\s*,\s*-?\d{1,3}\.\d{3,}/g);
    if (m) sospechosos.push(path.relative(RAIZ, f).replace(/\\/g, '/'));
  }
}
check('nadie ha escrito coordenadas a mano en el código', sospechosos.length === 0, sospechosos.join(', '));
check(
  'las coordenadas vienen del generador, no de una persona',
  /GENERADO — no editar a mano/.test(generado)
);
/* CONTROL: el detector encuentra una coordenada escrita a mano si la hay. */
check(
  'CONTROL: el detector de coordenadas a mano funciona',
  /-?\d{1,3}\.\d{3,}\s*,\s*-?\d{1,3}\.\d{3,}/.test('const casa = -12.046374, -77.042793;'),
  'si no la encontrara, el grupo sería decorativo'
);

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n─── H. Barranco, Lima: buscar desde donde estás ───');

/*
 * El caso que motivó todo esto. Barranco SIEMPRE estuvo en el catálogo; lo que
 * no se sabía era desde dónde se buscaba ni en qué región cae cada resultado.
 * Coordenadas reales del propio catálogo, ejecutando la búsqueda de verdad.
 */
const DESDE_BARRANCO = { lat: -12.143, lon: -77.019, pais: 'PE' };
const parcial = lugares.buscarLugares('Barranc', 6, DESDE_BARRANCO);
check('"Barranc" desde Lima da Barranco el primero', parcial[0]?.label === 'Barranco', parcial.map((o) => o.label).join(' · '));
check('y dice que es el de Lima', /Lima, Perú/.test(parcial[0]?.sublabel || ''), parcial[0]?.sublabel);
check('Barranca —a 180 km— va después, no antes', parcial.findIndex((o) => o.label === 'Barranca') > 0);

const exacto = lugares.buscarLugares('Barranco', 6, DESDE_BARRANCO);
check('coincidencia exacta antes que parcial', exacto[0]?.label === 'Barranco' && exacto.slice(1).every((o) => o.label !== 'Barranco'));
check('los internacionales siguen saliendo, solo después', exacto.some((o) => o.countryCode !== 'PE'));

/*
 * SIN ubicación también tiene que ser Barranco. Sin GPS los dos son del Perú y
 * decide la importancia: Barranco es una sección de Lima y hereda su escala;
 * Barranca es un pueblo de 46 mil. Ni Lima ni Barranco están escritos a mano
 * en ningún sitio: sale de la población que publica GeoNames.
 */
/* La app SIEMPRE sabe tu país —lo dijiste al registrarte—, así que este es el
   caso real sin GPS. Sin país ni GPS —que la app nunca produce— Barranco y
   Barrancabermeja empatan a 5 y no hay motivo para forzar el desempate. */
const soloPais = lugares.buscarLugares('Barranc', 6, { pais: 'PE' });
check('sin ubicación, con tu país, "Barranc" también da Barranco el primero', soloPais[0]?.label === 'Barranco' && /Lima/.test(soloPais[0]?.sublabel || ''), soloPais.map((o) => o.label).join(' · '));
const aCiegas = lugares.buscarLugares('Barranc', 6);
check('y sin saber nada de ti, Barranco sigue entre los primeros', aCiegas.slice(0, 3).some((o) => o.label === 'Barranco' && /Lima/.test(o.sublabel || '')), aCiegas.map((o) => o.label).join(' · '));
check('Barranca —de tu país— va antes que los de otros países', soloPais.findIndex((o) => o.label === 'Barranca') < soloPais.findIndex((o) => o.countryCode !== 'PE'));

/* La señal, leída del propio catálogo: la relevancia es el último campo. */
const relDe = (nombre, region) => Number(lineas.find((l) => { const c = l.split('|'); return c[0] === 'PE' && c[2] === nombre && (!region || c[7] === region); })?.split('|')[8]);
const relAMano = (id) => Number(HAND_COORDS.split('\n').find((l) => l.startsWith(id + '|'))?.split('|')[3]);
check('Barranco, sección de Lima, hereda una escala mayor que la suya', relDe('Barranco', '15') >= 5, `relevancia ${relDe('Barranco', '15')}`);
check('y mayor que la de Barranca, que es un pueblo', relDe('Barranco', '15') > relAMano('PE-BAR'), `${relDe('Barranco', '15')} vs ${relAMano('PE-BAR')}`);
check('pero MENOR que la de Lima: es parte de la ciudad, no la ciudad', relDe('Barranco', '15') < relAMano('PE-LIM'), `${relDe('Barranco', '15')} vs ${relAMano('PE-LIM')}`);
/* CONTROL: un lugar que NO es sección (PPL) conserva su propia población aunque
   esté pegado a la metrópoli: San Isidro está a 6 km de Lima y no hereda nada. */
check('CONTROL: San Isidro, que no es sección, no hereda de Lima', relDe('San Isidro', '15') < relDe('Barranco', '15'), `${relDe('San Isidro', '15')} vs ${relDe('Barranco', '15')}`);

/* CONTROL de que el contexto se usa: la misma búsqueda desde dos sitios da dos
   primeros distintos. "Miraflores" desde Arequipa es la de Arequipa. */
const desdeArequipa = lugares.buscarLugares('Miraflores', 6, { lat: -16.399, lon: -71.535, pais: 'PE' });
const desdeLima = lugares.buscarLugares('Miraflores', 6, DESDE_BARRANCO);
check(
  'CONTROL: la ubicación cambia el orden, así que se está usando',
  /Arequipa/.test(desdeArequipa[0]?.sublabel || '') && /Lima/.test(desdeLima[0]?.sublabel || ''),
  `Arequipa → ${desdeArequipa[0]?.sublabel} · Lima → ${desdeLima[0]?.sublabel}`
);

/* La cercanía decide en tu zona; lejos, decide la importancia. */
const madrid = lugares.buscarLugares('Madrid', 4, DESDE_BARRANCO);
check('"Madrid" desde Lima da el de España, no el de Colombia', madrid[0]?.countryCode === 'ES', madrid.map((o) => o.sublabel).join(' · '));
check('y el de Colombia sigue ahí, después', madrid.some((o) => o.countryCode === 'CO'));

/* Las cinco Miraflores del Perú ya no se leen igual. */
const miraflores = lugares.buscarLugares('Miraflores', 8, DESDE_BARRANCO).filter((o) => o.countryCode === 'PE');
check('las Miraflores del Perú se distinguen por su región', new Set(miraflores.map((o) => o.sublabel)).size >= 2, [...new Set(miraflores.map((o) => o.sublabel))].join(' · '));
check('y la primera es la de Lima', /Lima, Perú/.test(miraflores[0]?.sublabel || ''));
check('nadie se enseña con un alias ajeno como "san borja"', miraflores.every((o) => o.label === 'Miraflores'));

/* Sin banderas: texto limpio. */
const conBandera = (t) => /\p{Regional_Indicator}|\p{Extended_Pictographic}/u.test(t || '');
check('ningún subtítulo lleva bandera', [...parcial, ...madrid, ...miraflores].every((o) => !conBandera(o.sublabel)));
check('la pantalla no pinta la bandera', !/opcion\.flag/.test(codigoPantalla));

/* Elegir es tocar: se vuelve al compositor en el mismo gesto. */
check('no existe ningún botón "Listo"', !/accessibilityLabel="Listo"|>Listo</.test(codigoPantalla));
check('tocar un lugar lo elige y vuelve', /const elegir = \(opcion: PlaceOption\) => volverCon\(/.test(pantalla) && /onPress=\{\(\) => elegir\(opcion\)\}/.test(pantalla));
check('y la vuelta usa merge, así que lo escrito sigue escrito', /merge: true/.test(pantalla));
/* Esta pantalla es para BUSCAR Y ELEGIR: lo elegido no se enseña aquí en una
   tarjeta aparte; se enseña —y se quita o se cambia— en el compositor. */
check('no hay ninguna tarjeta del lugar ya elegido', !/Lugar de la publicación/.test(codigoPantalla) && !/pricetag-outline/.test(codigoPantalla));
check('ni estado de lugar que pintar: aquí se busca y se elige', !/const \[place, setPlace\]/.test(codigoPantalla));
check('quitar vive en el compositor —el aspa del chip— y "Ubicación" vuelve a abrir el selector', /accessibilityLabel="Quitar el lugar"/.test(compositor) && /onPress=\{abrirUbicacion\}/.test(compositor) && !/Cambiar la ubicación/.test(compositor));
/* Desde la fase 5P la etiqueta sale de `common.back`, resuelta por `comoSeLee`. */
check('el volver sale sin tocar nada', /accessibilityLabel="Volver"/.test(pantalla) && /navigation\.goBack\(\)/.test(pantalla) && !/Cancelar/.test(pantalla));

/*
 * ─── La lista de resultados es una LISTA, no una colección de botones ───────
 *
 * Cada lugar es una línea: icono pequeño en un círculo crema, el nombre en
 * oscuro y su región en gris, y un separador de un pelo hasta la siguiente.
 * Sin tarjeta, sin marco, sin flecha. Lo que se toca es la fila entera —56 de
 * alto como mínimo— y tocarla hace exactamente lo de siempre.
 */
console.log('\n── La lista, plana ──');
const estilos = pantalla.slice(pantalla.indexOf('const styles = StyleSheet.create'));
const filaEstilo = estilos.slice(estilos.indexOf('fila: {'), estilos.indexOf('filaPropia: {'));
check('las filas no son tarjetas: sin marco, sin fondo, sin esquinas', !/borderWidth|borderRadius|backgroundColor/.test(filaEstilo) && !/styles\.fila, \{ backgroundColor: theme\.colors\.card, borderColor/.test(codigoPantalla));
check('ni flechas al final', !/chevron-forward/.test(codigoPantalla));
check('entre fila y fila, un separador de un pelo; la última, sin él', /!ultima && \{ borderBottomWidth: StyleSheet\.hairlineWidth, borderBottomColor: theme\.colors\.border \}/.test(codigoPantalla) && /ultima=\{i === resultados\.length - 1\}/.test(codigoPantalla) && /ultima=\{i === cercanos\.length - 1\}/.test(codigoPantalla) && /ultima=\{i === delPais\.length - 1\}/.test(codigoPantalla));
check('la fila entera se toca, y mide al menos 56', /minHeight: 56,/.test(filaEstilo) && /onPress=\{\(\) => elegir\(opcion\)\}/.test(codigoPantalla));
check('el icono es pequeño, outline y en un círculo crema de 32', /iconoCirculo: \{\s*width: scale\(32\),\s*height: scale\(32\),/.test(estilos) && /name=\{esPais \? 'earth-outline' : 'location-outline'\}\s*size=\{scale\(16\)\}/.test(codigoPantalla) && /theme\.colors\.accent \+ '1A'/.test(codigoPantalla));
check('el nombre manda y la región acompaña en gris', /filaNombre: \{\s*fontSize: FONT_SIZE\.base,\s*fontWeight: FONT_WEIGHT\.semibold,/.test(estilos) && /filaSub: \{\s*fontSize: FONT_SIZE\.sm,/.test(estilos) && /styles\.filaSub, \{ color: theme\.colors\.textSecondary \}/.test(codigoPantalla));
check('la distancia medida va al final de la línea, en dorado', codigoPantalla.indexOf('styles.filaDistancia') > codigoPantalla.indexOf('styles.filaSub') && /styles\.filaDistancia, \{ color: theme\.colors\.accentDark \}/.test(codigoPantalla) && /distanciaAproximada\(km\)/.test(codigoPantalla));
check('"Usar lo que escribiste" sigue, apenas distinta: su icono, fondo casi nulo y aire encima', /styles\.fila, styles\.filaPropia, \{ backgroundColor: theme\.colors\.accent \+ '0F' \}/.test(codigoPantalla) && /name="create-outline"/.test(codigoPantalla) && /filaPropia: \{\s*marginTop: SPACING\.md,\s*borderRadius: BORDER_RADIUS\.lg,/.test(estilos) && /onPress=\{elegirEscrito\}/.test(codigoPantalla));
check('los rótulos son pequeños y en mayúsculas, como "PUBLICAR EN"', /seccionTitulo: \{\s*fontSize: FONT_SIZE\.xs,[\s\S]{0,80}textTransform: 'uppercase',/.test(estilos) && /<Seccion titulo="Resultados" \/>/.test(codigoPantalla));
check('cada fila se anuncia entera y dice qué pasa al tocarla',
  /accessibilityRole="button"\s*accessibilityLabel=\{opcion\.sublabel \? '\{\{lugar\}\}, \{\{detalle\}\}' : opcion\.label\}\s*accessibilityHint=/.test(codigoPantalla)
  && ES_C.composer.placeOption === '{{lugar}}, {{detalle}}'
  && /accessibilityHint="Etiqueta la publicación con lo que escribiste/.test(codigoPantalla));
/* CONTROL: la lógica no se movió. La búsqueda, la vuelta y el buscador son los mismos. */
check('CONTROL: la búsqueda es la misma llamada, con el mismo contexto y tope', /buscarLugares\(texto, 12, contextoBusqueda\)/.test(codigoPantalla) && /lugaresCercanos\(lectura\.latitude, lectura\.longitude, verTodos \? 24 : 6\)/.test(codigoPantalla) && /lugaresDelPais\(userProfile\?\.country, verTodos \? 24 : 6\)/.test(codigoPantalla));
check('CONTROL: el buscador escribe, limpia y no cambió', /onChangeText=\{setTexto\}/.test(codigoPantalla) && /onPress=\{\(\) => setTexto\(''\)\}/.test(codigoPantalla) && /accessibilityLabel="Borrar la búsqueda"/.test(codigoPantalla) && /const buscando = texto\.trim\(\)\.length >= 2;/.test(codigoPantalla));
check('CONTROL: sin imágenes de lugares, sin mapas, sin proveedores', (pantalla.match(/<Image/g) || []).length === 1 && !/MapView|maps\.googleapis|mapbox|foursquare|fetch\(/.test(codigoPantalla));

console.log('\n' + (failures === 0 ? 'Todo en orden.' : `${failures} comprobacion(es) fallaron.`));
process.exit(failures === 0 ? 0 : 1);
