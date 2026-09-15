/*
 * IDIOMA, LOCALE Y UBICACIÓN — las tres cosas que no son la misma.
 *
 * Casi todo lo de i18n en Weë son funciones puras, así que aquí no se lee
 * código: se EJECUTA. Se transpilan los módulos, se les cambian sus
 * importaciones por las de al lado y se les pregunta con una tabla de casos.
 *
 * Lo que de verdad vigila este archivo, por orden de importancia:
 *
 *  1. QUE LA UBICACIÓN NO TOQUE EL IDIOMA. Es la regla que más fácil se rompe
 *     sin querer —basta con que alguien "mejore" la detección con el país— y la
 *     que peor se siente cuando se rompe: viajar a Japón y encontrarte la app
 *     en japonés.
 *  2. Que lo elegido a mano gane siempre.
 *  3. Que ninguna pantalla pueda quedarse en blanco por una traducción que
 *     falta, ni enseñar una clave con puntos a nadie.
 *  4. Que no haya ni una llamada a un traductor de pago escondida.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(raiz, p), 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const ts = require('typescript');
const comoModulo = (js) => 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');

/*
 * Un cargador diminuto: transpila un .ts y sustituye cada importación relativa
 * por la dirección data: del módulo ya cargado. Así se ejecuta el árbol entero
 * sin empaquetador y sin tocar el proyecto.
 */
/* Como Metro: si no hay <ruta>.ts, se prueba <ruta>/index.ts. */
const rutaDe = (base) => fs.existsSync(path.resolve(raiz, base + '.ts')) ? base + '.ts' : base + '/index.ts';
const cargados = new Map();
const cargar = async (ruta, sustituciones = {}) => {
  if (cargados.has(ruta)) return cargados.get(ruta);
  let js = ts.transpileModule(leer(ruta), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const carpeta = path.posix.dirname(ruta.split(path.sep).join('/'));
  for (const [, rel] of js.matchAll(/from ['"](\.[^'"]*)['"]/g)) {
    const url = sustituciones[rel]
      ?? (await cargar(rutaDe(path.posix.normalize(path.posix.join(carpeta, rel))), sustituciones)).url;
    js = js.split(`from '${rel}'`).join(`from '${url}'`).split(`from "${rel}"`).join(`from "${url}"`);
  }
  const url = comoModulo(js);
  const resultado = { url, ns: await import(url) };
  cargados.set(ruta, resultado);
  return resultado;
};

const idiomas = (await cargar('i18n/idiomas.ts')).ns;
const resolver = (await cargar('i18n/resolver.ts')).ns;
const traducir = (await cargar('i18n/traducir.ts')).ns;
const formato = (await cargar('i18n/formato.ts')).ns;
const es = (await cargar('i18n/textos/es/index.ts')).ns.es;
const en = (await cargar('i18n/textos/en/index.ts')).ns.en;
const aparato = (await cargar('i18n/aparato.ts')).ns;

/** Lo que hay hoy: español e inglés. */
const HAY = ['es', 'en'];

console.log('\n── A · Normalizar lo que diga el aparato ──');
{
  const casos = [
    ['es_PE', 'es-PE'], ['ES-pe', 'es-PE'], ['es-PE', 'es-PE'],
    ['en', 'en'], ['zh-Hant-TW', 'zh-Hant-TW'], ['pt_br', 'pt-BR'],
  ];
  const mal = casos.filter(([entra, sale]) => resolver.normalizarLocale(entra) !== sale);
  check('1) los aparatos no se ponen de acuerdo y aquí sí', mal.length === 0,
    mal.map(([e, s]) => `${e}≠${s}`).join(' '));
  /* Basura de verdad que llega de sistemas reales. */
  check('2) y lo que no es un locale se descarta',
    ['', 'C', 'POSIX', '   ', '123'].every((b) => resolver.normalizarLocale(b) === ''));
  check('3) el idioma y la región salen por separado',
    resolver.partesDelLocale('es-PE').idioma === 'es'
    && resolver.partesDelLocale('es-PE').region === 'PE'
    && resolver.partesDelLocale('en').region === null);
}

console.log('\n── B · La cadena de respaldo ──');
{
  const casos = [
    ['fr-CA', ['fr-CA', 'fr', 'en']],
    ['es-PE', ['es-PE', 'es', 'en']],
    ['en-GB', ['en-GB', 'en']],
    ['ja-JP', ['ja-JP', 'ja', 'en']],
  ];
  const mal = casos.filter(([e, s]) => resolver.cadenaDeRespaldo(e).join('>') !== s.join('>'));
  check('4) del locale al idioma y del idioma a inglés', mal.length === 0,
    mal.map(([e]) => e + '=' + resolver.cadenaDeRespaldo(e).join('>')).join(' '));
  check('5) inglés no se repite a sí mismo',
    resolver.cadenaDeRespaldo('en').join('>') === 'en');
}

console.log('\n── C · Los siete casos acordados ──');
{
  const elegir = (elegido, delAparato) => resolver.elegirIdioma(elegido, delAparato, HAY);

  /* 1 y 2: el aparato manda mientras no haya elección. */
  check('6) caso 1 · es-PE → Español', elegir(null, ['es-PE']).idioma === 'es');
  check('7) caso 2 · en-US → English', elegir(null, ['en-US']).idioma === 'en');
  /* 3: italiano todavía no existe, así que inglés. */
  check('8) caso 3 · it-IT sin italiano → English', elegir(null, ['it-IT']).idioma === 'en');
  /*
   * 4: fr-CA con francés disponible → francés. Hoy no lo hay, así que se
   * comprueba con la lista de disponibles ampliada: es la prueba de que la
   * arquitectura admite el idioma nuevo SIN tocar una línea de código.
   */
  const conFrances = resolver.elegirIdioma(null, ['fr-CA'], ['es', 'en', 'fr']);
  check('9) caso 4 · fr-CA con francés → Français, y sin tocar código',
    conFrances.idioma === 'fr' && conFrances.locale === 'fr-CA');

  /*
   * 5 · LA REGLA QUE MÁS IMPORTA. Eligió inglés a mano; después el aparato
   * cambia a japonés —se mudó, cambió de teléfono, viajó—. Sigue en inglés.
   */
  const trasViajar = elegir('en', ['ja-JP', 'ja']);
  check('10) caso 5 · eligió English y el aparato pasa a ja-JP → sigue English',
    trasViajar.idioma === 'en' && trasViajar.origen === 'elegido');

  /* 6 · lo guardado se respeta al volver a abrir. */
  check('11) caso 6 · eligió Español y al reabrir sigue Español',
    elegir('es', ['en-US']).idioma === 'es');

  /* Y de dónde vino cada uno queda anotado, que es lo que permite explicarlo. */
  check('12) se sabe si el idioma lo eligió la persona o el aparato',
    elegir(null, ['es-PE']).origen === 'aparato'
    && elegir('es', ['en-US']).origen === 'elegido'
    && elegir(null, ['ja-JP']).origen === 'reserva');
}

console.log('\n── D · La ubicación no elige el idioma ──');
{
  /*
   * ESTO NO SE PRUEBA CON UN CASO, SE PRUEBA CON EL CÓDIGO. Un caso solo
   * demuestra que hoy no pasa; leer las dependencias demuestra que no PUEDE
   * pasar, porque la capa de idioma no tiene por dónde enterarse de dónde está
   * nadie.
   */
  const fuentes = ['i18n/idiomas.ts', 'i18n/resolver.ts', 'i18n/traducir.ts',
    'i18n/aparato.ts', 'i18n/preferencia.ts', 'contexts/IdiomaContext.tsx']
    .map((f) => leer(f)).join('\n');
  check('13) ningún módulo de idioma sabe nada de ubicación',
    !/locationService|LocationContext|expo-location|latitude|longitude|geohash|GeoPoint|timeZone|país|countryCode/i
      .test(fuentes.replace(/\/\*[\s\S]*?\*\//g, '')));

  /* Y al revés: quien lleva la ubicación no sabe de idioma. */
  check('14) y la ubicación no sabe nada de idioma',
    !/IdiomaContext|i18n\//.test(leer('services/locationService.ts')));

  /* El caso, además, por si alguien añade la dependencia sin usarla. */
  const enTokio = resolver.elegirIdioma('es-PE', ['ja-JP'], HAY);
  check('15) con el teléfono en japonés y su elección en español, español',
    enTokio.idioma === 'es' && enTokio.locale === 'es-PE');
}

console.log('\n── E · Traducir, y no romperse nunca ──');
{
  const dicc = { es, en };
  const tEs = traducir.crearTraductor('es-PE', dicc);
  const tEn = traducir.crearTraductor('en-US', dicc);

  check('16) la misma clave, dos idiomas',
    tEs('settings.title') === 'Configuración' && tEn('settings.title') === 'Settings');
  check('17) con valores dentro',
    tEs('home.greeting', { nombre: 'Ana' }) === 'Hola, Ana'
    && tEn('home.greeting', { nombre: 'Ana' }) === 'Hi, Ana');

  /*
   * EL RESPALDO POR CLAVE. Un francés a medias: tiene el título y le falta todo
   * lo demás. Lo que tiene sale en francés; lo que le falta, en inglés. La
   * pantalla no se queda coja y no aparece ni una clave.
   */
  const frACedias = { fr: { settings: { title: 'Paramètres' } } };
  const tFr = traducir.crearTraductor('fr-FR', { ...dicc, ...frACedias });
  check('18) lo que hay en francés sale en francés', tFr('settings.title') === 'Paramètres');
  check('19) y lo que falta cae a inglés, no a una clave',
    tFr('settings.language') === 'Language' && !tFr('settings.language').includes('.'));

  /* Una clave que no existe en ningún sitio: en producción, nunca con puntos. */
  const tProd = traducir.crearTraductor('es', dicc, { modoDesarrollo: false });
  const deEmergencia = tProd('settings.noExiste');
  check('20) una clave inexistente no se le enseña a nadie',
    !deEmergencia.includes('.') && !deEmergencia.includes('settings')
    && deEmergencia.length > 0 && deEmergencia[0] === deEmergencia[0].toUpperCase()
    && !tProd('a.b.c').includes('.'), deEmergencia);
  /* En desarrollo sí, para que salte a la vista. */
  let avisada = null;
  const tDev = traducir.crearTraductor('es', dicc, {
    modoDesarrollo: false, alFaltarUnaClave: (c) => { avisada = c; },
  });
  tDev('settings.noExiste');
  check('21) pero el programa se entera de que falta', avisada === 'settings.noExiste');

  /*
   * PLURALES POR `Intl.PluralRules`, que es lo que hace que el ruso y el árabe
   * puedan añadirse sin tocar el traductor. El ruso tiene tres formas; con un
   * `if (n === 1)` escrito a mano, dos de ellas saldrían mal.
   */
  const conPlural = {
    en: { w: { n_one: '{{contador}} weel', n_other: '{{contador}} weels' } },
    ru: { w: { n_one: '{{contador}} вил', n_few: '{{contador}} вила', n_many: '{{contador}} вил' } },
  };
  const tPlEn = traducir.crearTraductor('en', conPlural);
  const tPlRu = traducir.crearTraductor('ru', conPlural);
  check('22) singular y plural en inglés',
    tPlEn('w.n', { contador: 1 }) === '1 weel' && tPlEn('w.n', { contador: 5 }) === '5 weels');
  check('23) y las TRES formas del ruso, sin una línea de código para el ruso',
    tPlRu('w.n', { contador: 1 }) === '1 вил'
    && tPlRu('w.n', { contador: 3 }) === '3 вила'
    && tPlRu('w.n', { contador: 11 }) === '11 вил');

  /* CONTROL: los dos diccionarios tienen exactamente las mismas claves. */
  const aplanar = (o, pre = '') => Object.entries(o).flatMap(([k, v]) =>
    typeof v === 'object' ? aplanar(v, pre + k + '.') : [pre + k]);
  const cEs = aplanar(es).sort().join('|'), cEn = aplanar(en).sort().join('|');
  check('24) control: español e inglés no se han desincronizado', cEs === cEn,
    cEs === cEn ? aplanar(es).length + ' claves' : 'difieren');
}

console.log('\n── F · Los formatos son del locale, no del idioma ──');
{
  /*
   * La misma app en español escribe distinto en Lima y en Madrid, y eso lo
   * decide el LOCALE. Se comprueba que salgan DISTINTOS, no un texto exacto:
   * los datos de CLDR cambian entre versiones del motor y una prueba pegada a
   * una cadena literal se rompería sola dentro de un año.
   */
  const enPeru = formato.formatearNumero(1234567.89, 'es-PE');
  const enAlemania = formato.formatearNumero(1234567.89, 'de-DE');
  const enEeuu = formato.formatearNumero(1234567.89, 'en-US');
  /*
   * Perú y Estados Unidos escriben el número IGUAL —coma para los miles, punto
   * para los decimales— y Alemania al revés. Que dos locales coincidan no es un
   * fallo: es exactamente por qué esto lo resuelve Intl y no una tabla nuestra.
   */
  check('25) el mismo número cambia con el locale, no con el idioma',
    enPeru !== enAlemania && enPeru === enEeuu
    && /1.234.567/.test(enAlemania.replace(/\u00a0/g, '')),
    `PE ${enPeru} · DE ${enAlemania} · US ${enEeuu}`);

  const soles = formato.formatearMoneda(1500, 'es-PE', 'PEN');
  const euros = formato.formatearMoneda(1500, 'de-DE', 'EUR');
  check('26) la moneda la pone el negocio, el locale solo la escribe',
    /1[.,\s]?500/.test(soles) && /1[.,\s]?500/.test(euros) && soles !== euros, `${soles} · ${euros}`);

  const fEs = formato.formatearFecha(Date.UTC(2026, 8, 14), 'es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const fEn = formato.formatearFecha(Date.UTC(2026, 8, 14), 'en-US', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  check('27) la fecha también', fEs !== fEn && /2026/.test(fEs) && /2026/.test(fEn), `${fEs} · ${fEn}`);

  const ahora = Date.UTC(2026, 8, 14, 12, 0, 0);
  const hace3d = formato.formatearTiempoRelativo(ahora - 3 * 86400000, 'es', ahora);
  check('28) "hace 3 días" sin escribirlo a mano', /3/.test(hace3d), hace3d);

  /* Kilómetros o millas, según el sitio. Sin un `if (pais === 'US')` a la vista. */
  check('29) sistema métrico donde toca e imperial donde toca',
    formato.sistemaDeMedida('es-PE') === 'metrico'
    && formato.sistemaDeMedida('de-DE') === 'metrico'
    && formato.sistemaDeMedida('en-US') === 'imperial');
  const km = formato.formatearDistancia(5000, 'es-PE');
  const mi = formato.formatearDistancia(5000, 'en-US');
  check('30) y la distancia se escribe en su unidad', km !== mi && /5/.test(km), `${km} · ${mi}`);

  check('31) las listas se unen como en cada idioma',
    formato.formatearLista(['a', 'b', 'c'], 'es') !== formato.formatearLista(['a', 'b', 'c'], 'en'),
    `${formato.formatearLista(['a', 'b', 'c'], 'es')} · ${formato.formatearLista(['a', 'b', 'c'], 'en')}`);

  /* Los diecisiete locales contemplados se formatean todos sin reventar. */
  const rotos = idiomas.LOCALES_CONTEMPLADOS.filter((l) => {
    try { return !formato.formatearNumero(1234.5, l) || !formato.formatearFecha(0, l); }
    catch { return true; }
  });
  check('32) los 17 locales contemplados formatean sin caerse', rotos.length === 0, rotos.join(' '));
}

console.log('\n── G · El aparato, la persistencia y el catálogo ──');
{
  /* La detección lee el navegador cuando lo hay, e Intl cuando no. */
  const antes = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', {
    value: { languages: ['es-PE', 'es', 'en'], language: 'es-PE' },
    configurable: true, writable: true,
  });
  const conNavegador = aparato.localesDelAparato();
  if (antes) Object.defineProperty(globalThis, 'navigator', antes);
  else delete globalThis.navigator;
  check('33) en web se lee la lista ordenada del navegador',
    conNavegador[0] === 'es-PE' && conNavegador.includes('en'), conNavegador.join(','));
  check('34) y sin navegador queda lo que diga Intl, nunca vacío del todo',
    aparato.localesDelAparato().length >= 1);
  check('35) sin repetidos', new Set(conNavegador).size === conNavegador.length);

  /* La preferencia usa el sistema que ya había, no uno nuevo. */
  const pref = leer('i18n/preferencia.ts');
  check('36) se guarda con el AsyncStorage de siempre y con el prefijo de Weë',
    /@react-native-async-storage\/async-storage/.test(pref) && /'wee\.idioma\.preferencia'/.test(pref));
  check('37) y no se guarda nada que se pueda calcular',
    (pref.match(/setItem\(/g) || []).length === 1);

  /* El catálogo: once idiomas, dos listos, cada uno en su lengua. */
  check('38) once idiomas contemplados y dos con diccionario',
    idiomas.IDIOMAS.length === 11 && idiomas.idiomasDisponibles().length === 2);
  check('39) cada idioma se llama como se llama en su idioma',
    idiomas.idiomaDelCatalogo('de').nombreNativo === 'Deutsch'
    && idiomas.idiomaDelCatalogo('ja').nombreNativo === '日本語'
    && idiomas.idiomaDelCatalogo('ru').nombreNativo === 'Русский');
  check('40) y el árabe ya está marcado como de derecha a izquierda',
    idiomas.direccionDe('ar') === 'rtl' && idiomas.direccionDe('es') === 'ltr');
  check('41) los idiomas con diccionario son justo los marcados como listos',
    idiomas.idiomasDisponibles().map((i) => i.codigo).sort().join(',') === 'en,es');
}

console.log('\n── H · Nada de esto cuesta dinero ──');
{
  /*
   * Enseñar Weë en otro idioma no puede costar una llamada a nadie. Ni una
   * petición, ni una clave de API, ni un céntimo por persona. Las traducciones
   * viajan dentro de la app.
   */
  const capa = ['i18n/idiomas.ts', 'i18n/resolver.ts', 'i18n/traducir.ts', 'i18n/formato.ts',
    'i18n/aparato.ts', 'i18n/preferencia.ts', 'i18n/diccionarios.ts',
    'i18n/textos/es/index.ts', 'i18n/textos/en/index.ts', 'contexts/IdiomaContext.tsx',
    'screens/IdiomaScreen.tsx'].map(leer).join('\n');
  check('42) ni una llamada de red en toda la capa de idioma',
    !/fetch\(|axios|XMLHttpRequest|https?:\/\//.test(capa));
  check('43) ni un traductor de pago',
    !/translate|deepl|openai|anthropic|claude|gemini/i.test(capa));
  check('44) los diccionarios viajan dentro, no se piden',
    /import \{ es \} from '\.\/textos\/es'/.test(leer('i18n/diccionarios.ts')));

  /* Y ninguna pantalla lee un diccionario por su cuenta. */
  const pantallas = ['screens/SettingsScreen.tsx', 'screens/IdiomaScreen.tsx', 'components/BarraInferior.tsx']
    .map(leer).join('\n');
  check('45) las pantallas piden t(), no diccionarios',
    !/textos\/es|textos\/en|DICCIONARIOS/.test(pantallas)
    && /useT\(\)|useIdioma\(\)/.test(pantallas));
}

console.log('\n── I · Enchufado en Weë ──');
{
  const app = leer('App.tsx');
  check('46) el proveedor envuelve la app entera',
    /<IdiomaProvider>/.test(app) && /<\/IdiomaProvider>/.test(app)
    && app.indexOf('<IdiomaProvider>') < app.indexOf('<ThemeProvider>'));

  const ajustes = leer('screens/SettingsScreen.tsx');
  check('47) Configuración tiene su fila de Idioma',
    /t\('settings\.language'\)/.test(ajustes) && /navigate\('Idioma'\)/.test(ajustes));
  check('48) y su cabecera ya está traducida',
    /\{t\('settings\.title'\)\}/.test(ajustes) && !/>\s*Configuración\s*</.test(ajustes));

  const pantalla = leer('screens/IdiomaScreen.tsx');
  check('49) la pantalla de Idioma marca el puesto y no usa banderas',
    /name="checkmark"/.test(pantalla) && !/flag|🇪🇸|🇺🇸|emoji/i.test(pantalla));
  check('50) y escribe cada idioma en su propia lengua',
    /nombreNativo/.test(pantalla) && !/nombreEnEspanol|traducirNombre/.test(pantalla));

  const barra = leer('components/BarraInferior.tsx');
  check('51) la barra inferior ya traduce sus cinco destinos',
    /\{t\(destino\.clave\)\}/.test(barra) && /clave: 'nav\.home'/.test(barra));

  /* CONTROL: no se ha duplicado ninguna pantalla por idioma. */
  const duplicadas = fs.readdirSync(path.resolve(raiz, 'screens'))
    .filter((f) => /(ES|EN|Spanish|English)\.tsx$/.test(f));
  check('52) control: ni una pantalla duplicada por idioma', duplicadas.length === 0, duplicadas.join(' '));

  /*
   * CONTROL: la marca no se traduce.
   *
   * Se miran los VALORES, no los nombres de clave: una clave puede llamarse
   * `myWallet` sin que eso signifique que alguien tradujo "Wäll". Y con
   * fronteras de palabra, para que "wallet" no cuente como "Wall".
   */
  const aplanarValores = (o) => Object.values(o).flatMap((v) => typeof v === 'object' ? aplanarValores(v) : [v]);
  /*
   * "Muro general" no es una traducción de Wäll: es como se llama, desde
   * siempre, el sitio donde se lee todo —`MURO_GENERAL` en `sectionFeed`—, y su
   * nombre en inglés es "General wall". Se saca del rastreo por su nombre
   * completo, no aflojando la vara: "Muro" y "Wall" a secas siguen prohibidos.
   */
  const valores = [...aplanarValores(es), ...aplanarValores(en)].join(' | ')
    .split('Muro general').join('·').split('General wall').join('·');
  check('53) control: los nombres de Weë no están traducidos',
    !/\b(Muro|Wall|Carretes|Reels|Charla|Chat de Wee|Créditos|Creditos)\b/.test(valores));
}

console.log('\n── J · Fase 2 · los módulos migrados ──');
{
  /*
   * Lo que se vigila aquí no es "que haya claves": es que las PANTALLAS ya no
   * lleven texto escrito a mano. Una clave que nadie usa no traduce nada.
   */
  const migrado = (archivo, muestras) => {
    const t = leer(archivo).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "");
    return { usaT: /useT\(\)|useIdioma\(\)/.test(t), sinTexto: muestras.every((m) => !t.includes(m)) };
  };

  const burger = migrado("components/DrawerMenu.tsx",
    ["'PERFIL'", "'EXPLORA'", ">Cerrar sesión<", ">Nuevo<", ">Términos<", "'Invitado'"]);
  check('54) Burger · sin textos escritos a mano', burger.usaT && burger.sinTexto);
  /* Y sus doce opciones y once experiencias, por clave. */
  const menu = leer("constants/weeMenu.ts");
  check('55) Burger · las doce opciones tienen clave',
    (menu.match(/clave: 'menu\./g) || []).length === 12);
  const exps = leer("constants/weeExperiences.ts");
  check('56) y las once experiencias describen por clave',
    (exps.match(/claveDescripcion: 'creator\./g) || []).length === 11);
  /* CONTROL: los NOMBRES de las experiencias siguen sin traducir. */
  check('57) control: Weë Design sigue llamándose Weë Design',
    /name: 'Weë Design'/.test(exps) && /name: 'Weë Studio'/.test(exps)
    && (exps.match(/^    name: 'Weë /gm) || []).length === 11
    && !/^    name: 'creator\./m.test(exps));
  /* Y el nombre del ÁREA sí es descriptivo: "Hogar & Diseño" se lee y se traduce. */
  check('57) pero el nombre del área sí se traduce',
    /claveNombre: 'creator\.areaHomeName'/.test(exps)
    && /areaHomeName: 'Hogar & Diseño'/.test(leer("i18n/textos/es/creator.ts"))
    && /areaHomeName: 'Home & Design'/.test(leer("i18n/textos/en/creator.ts")));

  const home = migrado("components/HomeGreeting.tsx", ["`Hola, ${", "'Hola'", "\"Buscar en Weë\""]);
  check('58) Home · el saludo entra por interpolación', home.usaT && home.sinTexto
    && /t\('home\.greeting', \{ nombre \}\)/.test(leer("components/HomeGreeting.tsx")));

  const muro = migrado("components/PostCard.tsx",
    ["'Republicar'", "'Eliminar post'", "'Reportar publicación'", "'Spam'",
     "Gracias por tu reporte", "reposteó", "'Usuario Anónimo'"]);
  check('59) Wäll · menús, diálogos y avisos migrados', muro.usaT && muro.sinTexto);

  const weels = migrado("screens/ReelsScreen.tsx", [">Weëls<", "\"Compartir Weël\"", "'Usuario'"]);
  check('60) Weëls · visor y controles migrados', weels.usaT && weels.sinTexto);

  const fila = migrado("components/WeelsRow.tsx",
    [">Ver todos →<", "'Crear Weël'", "Descubre videos creados"]);
  check('61) Weëls · la fila del Home migrada', fila.usaT && fila.sinTexto);

  const ajustes = migrado("screens/SettingsScreen.tsx", [">\n          Configuración\n"]);
  check('62) Settings · cabecera, secciones y la fila de Idioma', ajustes.usaT
    && /t\('settings\.language'\)/.test(leer("screens/SettingsScreen.tsx")));
}

console.log('\n── K · Fase 2 · lo que NO se traduce ──');
{
  /*
   * La línea que separa interfaz de contenido. Si esto se cruza, Weë empieza a
   * reescribir lo que la gente publica, que es exactamente lo que no debe pasar.
   */
  const todos = JSON.stringify([es, en]);
  check('63) ninguna marca de Weë está traducida',
    !/"Muro"|"Wall"|"Carretes"|"Reels"|"Créditos"|"Chat de Wee"|"Contacto E"/.test(todos));
  /* Y el contenido del usuario no pasa por t() en ningún sitio migrado. */
  const migrados = ["components/PostCard.tsx", "screens/ReelsScreen.tsx",
    "components/DrawerMenu.tsx", "components/HomeGreeting.tsx"].map(leer).join("\n");
  check('64) ni el contenido ni los nombres de personas pasan por t()',
    /* La frontera importa: sin ella, esto casaba la `t(` final de `onComment(`. */
    !/\bt\((post|displayName|content|comment|nombreDelAutor)\b/.test(migrados)
    && !/t\(`/.test(migrados));

  /* Los Credits ya no se escriben siempre a la española. */
  const saldos = ["components/CreditsPill.tsx", "components/DrawerMenu.tsx",
    "components/Sidebar.tsx", "components/creator/CreatorSidebar.tsx"].map(leer).join("\n");
  check('65) el saldo se escribe con el locale activo, no con \'es\' fijo',
    !/toLocaleString\('es'\)/.test(saldos) && (saldos.match(/formato\.numero\(/g) || []).length === 4);

  /* La regla queda escrita donde la lee cualquier trabajo futuro. */
  check('66) la regla de i18n está en CLAUDE.md',
    /8\. \*\*i18n — OBLIGATORIO PARA TODA INTERFAZ NUEVA/.test(leer("CLAUDE.md")));
}

console.log('\n── L · Bloque 2 · Credits, ËContact, WeeTalk, Notificaciones, Guardados ──');
{
  const limpio = (archivo) => leer(archivo).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');

  /* Credits: los textos por clave y el saldo por el locale, no por 'es' fijo. */
  const tienda = limpio('screens/CreditStoreScreen.tsx');
  const cartera = limpio('screens/WalletScreen.tsx');
  check('67) Credits · tienda y cartera migradas',
    /t\('credits\./.test(tienda) && /t\('credits\./.test(cartera)
    && !/>Tu saldo</.test(tienda) && !/>Mi billetera</.test(cartera));
  check('68) Credits · el saldo se escribe con el locale activo',
    !/toLocaleString\('es'\)/.test(tienda + cartera)
    && (tienda + cartera).match(/formato\.numero\(/g).length >= 6);
  /* CONTROL: ni precios ni cálculos pasaron por i18n. */
  check('69) control: la lógica económica no se tocó',
    !/t\(.{0,20}(precio|price|cost|amount|balance)\)/i.test(tienda + cartera)
    && /creditsService|useWallet|account\?\.balance/.test(tienda + cartera));

  /* ËContact: los nombres de las listas son MARCA y entran como valor. */
  const agenda = limpio('screens/EContactScreen.tsx');
  check('70) ËContact · toda su interfaz por clave',
    /t\('econtact\./.test(agenda)
    && !/Solicitudes recibidas|Solicitudes enviadas|Todavía no tienes|Este perfil no tiene agenda/.test(agenda));
  check('71) ËContact · ËContact y ẄContact entran como valor, no traducidos',
    /t\('econtact\.yours', \{ lista: nombrePlural \}\)/.test(agenda)
    && !/'ËContact'|'ẄContact'/.test(leer('i18n/textos/en/econtact.ts')));
  /*
   * LOS TRES CUERPOS DE LOS VACÍOS.
   *
   * ËContact tiene tres pantallas vacías distintas —no has entrado, tu perfil
   * activo no tiene agenda, todavía no tienes a nadie— y cada una explica la
   * suya. Los TÍTULOS entraron por clave en su día; los CUERPOS se quedaron
   * escritos en español dentro de un objeto literal, como `texto: '...'`, que
   * es la forma que el extractor no sabía mirar. Se leen tanto como el título.
   */
  const VACIOS = ['yoursWhenYouSignInSubtitle', 'noneYetSubtitle', 'noAgendaSubtitle'];
  const faltan = VACIOS.filter((k) => typeof es.econtact[k] !== 'string' || typeof en.econtact[k] !== 'string');
  check('72b) ËContact · los tres cuerpos existen en español y en inglés', faltan.length === 0, faltan.join(' | '));
  /* Y el inglés es inglés, no el español copiado para que compile. */
  check('72c) ËContact · y el inglés no es el español pegado',
    VACIOS.every((k) => en.econtact[k] !== es.econtact[k] && !/[áéíóúÁÉÍÓÚñÑ¿¡]/.test(en.econtact[k])),
    VACIOS.filter((k) => en.econtact[k] === es.econtact[k]).join(' | '));
  /*
   * En la pantalla no queda ni una de las tres frases. Se mira el fuente CRUDO
   * a propósito: quitar comentarios antes podría tragarse justo el trozo que
   * hay que vigilar y darnos un verde que no es.
   */
  const agendaCruda = leer('screens/EContactScreen.tsx');
  check('72d) ËContact · las tres frases ya no están escritas en la pantalla',
    !/guarda tus conexiones de Weë|es donde están tus conexiones|Aquí estará tu gente en Weë/.test(agendaCruda));
  check('72e) ËContact · y las pide por clave, en el sitio donde se leen',
    VACIOS.every((k) => new RegExp("texto: t\\('econtact\\." + k + "'").test(agenda)),
    VACIOS.filter((k) => !new RegExp("texto: t\\('econtact\\." + k + "'").test(agenda)).join(' | '));
  /*
   * Y cambian de verdad: se le pregunta al traductor de Weë, con el diccionario
   * de Weë, en los dos idiomas. Sin huecos a medio rellenar.
   */
  {
    const tAgendaEs = traducir.crearTraductor('es', { es, en });
    const tAgendaEn = traducir.crearTraductor('en', { es, en });
    const con = { lista: 'ËContact' };
    const quietas = VACIOS.filter((k) => tAgendaEs('econtact.' + k, con) === tAgendaEn('econtact.' + k, con));
    check('72f) ËContact · los tres cambian al cambiar de idioma', quietas.length === 0, quietas.join(' | '));
    check('72g) ËContact · y ninguno sale con un hueco sin rellenar',
      VACIOS.every((k) => !tAgendaEs('econtact.' + k, con).includes('{{') && !tAgendaEn('econtact.' + k, con).includes('{{')));
    /*
     * El nombre de la agenda entra por HUECO en los dos que lo nombran: es
     * marca, no se traduce, y el día que cambie cambia en un solo sitio.
     */
    const CON_LISTA = ['yoursWhenYouSignInSubtitle', 'noAgendaSubtitle'];
    check('72h) ËContact · el nombre de la agenda entra por hueco, no escrito en la frase',
      CON_LISTA.every((k) => es.econtact[k].includes('{{lista}}') && en.econtact[k].includes('{{lista}}'))
      && !VACIOS.some((k) => (es.econtact[k] + en.econtact[k]).includes('ËContact')));
    check('72i) ËContact · y sale relleno: ' + tAgendaEn('econtact.noAgendaSubtitle', con),
      tAgendaEs('econtact.noAgendaSubtitle', con).startsWith('ËContact es donde')
      && tAgendaEn('econtact.noAgendaSubtitle', con).startsWith('ËContact is where'));
  }
  /*
   * Y se arman AL PINTAR. `t` sale de `useT()`, así que cambiar de idioma vuelve
   * a pintar y el objeto se hace otra vez con las frases nuevas. Guardarlo en un
   * `useMemo` o en un `useState` dejaría el texto en el idioma de la primera vez
   * hasta recargar la página, que es justo lo que no puede pasar.
   */
  const trozoVacio = agenda.slice(agenda.indexOf('const renderVacio'), agenda.indexOf('const renderVacio') + 900);
  check('72j) ËContact · el objeto se arma al pintar, no se guarda',
    /const renderVacio = \(\) => \{\s*const contenido =/.test(agenda)
    && !/useMemo|useState|useRef/.test(trozoVacio));

  /* El contador ya no elige entre dos formas con un ===1. */
  check('72) ËContact · el contador usa plurales de verdad',
    /t\('econtact\.count', \{ contador: total/.test(agenda)
    && /count_one:/.test(leer('i18n/textos/es/econtact.ts'))
    && /count_other:/.test(leer('i18n/textos/es/econtact.ts')));

  /* WeeTalk: la interfaz sí, los mensajes NUNCA. */
  const bandeja = limpio('screens/InboxScreen.tsx');
  const charla = limpio('screens/ConversationScreen.tsx');
  check('73) WeeTalk · bandeja y conversación migradas',
    /t\('weetalk\./.test(bandeja) && /t\('weetalk\./.test(charla)
    && !/>Sin conversaciones</.test(bandeja) && !/placeholder="Mensaje\.\.\."/.test(charla));
  check('74) WeeTalk · los mensajes de la gente no pasan por t()',
    !/\bt\((message|msg|item\.text|contenido|texto)\b/.test(charla));

  /* Notificaciones: la frase entera con interpolación, no dos trozos pegados. */
  const avisos = limpio('screens/NotificationsScreen.tsx');
  check('75) Notificaciones · la frase entera lleva {{nombre}} dentro',
    /claveDeLaNotificacion/.test(avisos)
    && /like: '\{\{nombre\}\} le gustó tu publicación'/.test(leer('i18n/textos/es/notifications.ts'))
    && /like: '\{\{nombre\}\} liked your post'/.test(leer('i18n/textos/en/notifications.ts')));
  check('76) y el nombre sigue en negrita, sin perder el diseño',
    /<Text style=\{styles\.username\}>\{nombre\}<\/Text>/.test(avisos)
    && /antesDelNombre/.test(avisos) && /despuesDelNombre/.test(avisos));
  /* El "hace 3d" escrito a mano se fue: lo dice Intl. */
  check('77) Notificaciones · el tiempo relativo lo escribe Intl',
    !/hace \$\{/.test(avisos) && !/toLocaleDateString\('es/.test(avisos)
    && /formato\.tiempoRelativo\(date\)/.test(avisos));

  /* Guardados. */
  const guardados = limpio('screens/SavedPostsScreen.tsx');
  check('78) Guardados · migrado',
    /t\('saved\./.test(guardados) && !/>Aún no guardaste nada</.test(guardados));

  /* CONTROL de todo el bloque: los cinco módulos y sus claves existen y casan. */
  const usadas = [tienda, cartera, agenda, bandeja, charla, avisos, guardados].join('\n')
    .match(/t\('([a-z]+)\.([a-zA-Z]+)'/g) || [];
  /*
   * TODOS los módulos, no una lista escrita a mano: con una lista, una clave de
   * un módulo que no estuviera apuntado salía como huérfana sin serlo —pasó con
   * `nav.notifications` en la fase 6—. Se lee la carpeta y se acabó.
   */
  const dicc = {};
  for (const archivo of fs.readdirSync(new URL('../../i18n/textos/es/', import.meta.url))) {
    if (!archivo.endsWith('.ts') || archivo === 'index.ts') continue;
    dicc[archivo.slice(0, -3)] = leer(`i18n/textos/es/${archivo}`);
  }
  const huerfanas = usadas.map((u) => u.slice(3, -1)).filter((clave) => {
    const [seccion, k] = clave.split('.');
    return !dicc[seccion] || !new RegExp(`^  ${k}(_one|_other)?: '`, 'm').test(dicc[seccion]);
  });
  check('79) ninguna clave usada se quedó sin traducción',
    huerfanas.length === 0, [...new Set(huerfanas)].join(' '));
}

console.log('\n── M · Bloque 3A · Weë AI, Studio, Writer, Design ──');
{
  const limpio = (a) => leer(a).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
  const ARMAZON = ['screens/WeeCreatorScreen.tsx', 'screens/SpecialistScreen.tsx',
    'screens/CreatorFlowScreen.tsx', 'screens/BrainChatScreen.tsx',
    'components/creator/CreatorShell.tsx', 'components/creator/CreatorSidebar.tsx',
    'components/creator/UploadBox.tsx', 'components/creator/GuidedQuestion.tsx',
    'components/creator/PlanCard.tsx', 'components/creator/ProjectPicker.tsx',
    'components/creator/ResultCard.tsx', 'components/creator/MockMedia.tsx',
    'components/creator/IdeaBox.tsx'];
  const armazon = ARMAZON.map(limpio).join('\n');

  check('80) Weë AI · las trece piezas del armazón usan t()',
    ARMAZON.every((a) => /useT\(\)|useIdioma\(\)/.test(limpio(a))));

  /* Los textos que estaban escritos a mano ya no están en ninguna de ellas. */
  const sueltos = ['>Empezar<', '>Disponible hoy<', '>Mis creaciones<', '>Un momento…<',
    '>Elegir de mis fotos<', '>Tomar una foto<', '>Calidad<', '>Nuevo proyecto<',
    '>Antes<', '>Después<', '>Foto adjunta<', '>Vista previa · demo<',
    "'Weë Brain está pensando…'", "'Subiendo tu foto…'", "'Sin costo'"]
    .filter((x) => armazon.includes(x));
  check('81) y ninguno conserva su texto en español', sueltos.length === 0, sueltos.join(' '));

  /* Writer: la tabla de ayudas guarda CLAVES, porque vive fuera del componente. */
  const writer = limpio('screens/WriterEditorScreen.tsx');
  check('82) Writer · la tabla de ayudas guarda claves, no textos',
    /clave: 'writer\.improve'/.test(writer) && /claveObjetivo: 'writer\.improveGoal'/.test(writer)
    && /label=\{t\(helper\.clave\)\}/.test(writer)
    && !/label: 'Mejorar'|goal: 'Mejorar este texto'/.test(writer));

  /*
   * Y el contador de palabras dejó de elegir entre dos formas con un ternario:
   * eso solo vale para los idiomas que tienen dos. El ruso tiene tres.
   */
  check('83) Writer · el contador de palabras usa plurales de verdad',
    /t\('writer\.words', \{ contador: words \}\)/.test(writer)
    && !/words === 1 \? 'palabra'/.test(writer)
    && /words_one:/.test(leer('i18n/textos/es/writer.ts'))
    && /words_other:/.test(leer('i18n/textos/es/writer.ts')));

  /* CONTENIDO DEL USUARIO: el texto que escribe la persona no pasa por t(). */
  check('84) el texto del documento y el extracto siguen intactos',
    /\$\{t\(helper\.claveObjetivo\)\}: "\$\{excerpt\}"/.test(writer)
    && !/\bt\((text|texto|excerpt|content|doc|prompt)\b/.test(writer + armazon));

  /* Y los nombres técnicos tampoco: ni modelos, ni proveedores, ni ids. */
  check('85) ni los nombres de modelos o proveedores',
    !/t\('(gemini|seedance|elevenlabs|openai|claude|gpt)/i.test(armazon + writer));

  /* MARCAS: Weë Brain, Weë AI y Credits siguen escritos igual. */
  const dicc = ['weeai', 'writer'].map((m) => leer(`i18n/textos/en/${m}.ts`)).join('\n');
  check('86) las marcas no se tradujeron',
    /Weë Brain is thinking/.test(dicc) && /Credits/.test(dicc)
    && !/\b(Brain of Wee|Wee Brain|Credits translated|Créditos)\b/.test(dicc));

  /* Integridad: toda clave usada existe en ES y en EN, y ninguna está vacía. */
  const encontradas = (armazon + writer).match(/t\('(weeai|writer|common)\.[a-zA-Z]+'/g) || [];
  const usadas = [...new Set(encontradas.map((u) => u.slice(3, -1)))];
  const falla = [];
  for (const clave of usadas) {
    const [sec, k] = clave.split('.');
    for (const idioma of ['es', 'en']) {
      const fuente = leer(`i18n/textos/${idioma}/${sec}.ts`);
      /* El patrón se arma por trozos: un `$` dentro de un replace muerde. */
      const patron = '^  ' + k + "(_one|_other)?: '(.*)'," + "$";
      const m = fuente.match(new RegExp(patron, "m"));
      if (!m) falla.push(idioma + ":" + clave);
      else if (!m[2].trim()) falla.push('vacía ' + idioma + ':' + clave);
    }
  }
  check('87) las ' + usadas.length + ' claves usadas existen en ES y EN, y ninguna vacía',
    falla.length === 0, falla.slice(0, 6).join(' '));

  /* CONTROL: no se tocó el motor de IA ni los Credits desde estas pantallas. */
  check('88) control: ni el Gateway, ni los modelos, ni los Credits',
    !/aiRouter|engine\/router|providers\/|spendCredits|creditCosts/.test(armazon + writer));
}

console.log('\n' + (failures ? `✘ ${failures} fallo(s)` : '✔ todo bien'));
process.exit(failures ? 1 : 0);
