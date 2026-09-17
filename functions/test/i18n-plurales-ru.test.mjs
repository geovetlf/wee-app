/*
 * LOS PLURALES DEL RUSO, EJECUTADOS DE VERDAD.
 *
 * El ruso no es «singular y plural». Son CUATRO formas, y la que toca no la
 * decide el último dígito a ojo:
 *
 *     one    1, 21, 31, 101, 121…        1 голос
 *     few    2, 3, 4, 22, 23, 24…        2 голоса
 *     many   0, 5–20, 25–30, 111…        5 голосов
 *     other  solo fracciones (1,5)
 *
 * Las dos trampas están en el 0 y en el 11: los dos caen en `many`, no donde
 * los pondría quien mire solo la última cifra. Y el 111 también, aunque acabe
 * en 1, porque manda la decena.
 *
 * ── Por qué esta prueba EJECUTA en vez de leer ──────────────────────────────
 *
 * Porque mirar el diccionario solo demuestra que las claves están escritas, no
 * que se ELIJAN. Entre la clave y la pantalla hay un `Intl.PluralRules`, una
 * cadena de respaldo y un `clave_other` que podría estar comiéndose todo sin
 * que se note. Así que aquí se monta el traductor real con el diccionario real
 * y se le pregunta por los doce números que importan.
 *
 * Si alguien borrase mañana las `_few` del ruso, el idioma seguiría compilando
 * y seguiría pasando la paridad —`_other` taparía el hueco— y diría «2 голосов»
 * a todo el mundo. Esto es lo único que lo vería.
 */
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
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

/* El mismo cargador diminuto que usa `i18n.test.mjs`: transpila y encadena. */
const ts = require('typescript');
const comoModulo = (js) => 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');
const rutaDe = (base) => (fs.existsSync(path.resolve(raiz, base + '.ts')) ? base + '.ts' : base + '/index.ts');
const cargados = new Map();
const cargar = async (ruta) => {
  if (cargados.has(ruta)) return cargados.get(ruta);
  let js = ts.transpileModule(leer(ruta), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const carpeta = path.posix.dirname(ruta.split(path.sep).join('/'));
  for (const [, rel] of js.matchAll(/from ['"](\.[^'"]*)['"]/g)) {
    const url = (await cargar(rutaDe(path.posix.normalize(path.posix.join(carpeta, rel))))).url;
    js = js.split(`from '${rel}'`).join(`from '${url}'`).split(`from "${rel}"`).join(`from "${url}"`);
  }
  const url = comoModulo(js);
  const resultado = { url, ns: await import(url) };
  cargados.set(ruta, resultado);
  return resultado;
};

const traducir = (await cargar('i18n/traducir.ts')).ns;
const ru = (await cargar('i18n/textos/ru/index.ts')).ns.ru;
const es = (await cargar('i18n/textos/es/index.ts')).ns.es;
const en = (await cargar('i18n/textos/en/index.ts')).ns.en;

/* El traductor REAL, con el diccionario REAL. Nada simulado. */
const t = traducir.crearTraductor('ru-RU', { ru, es, en });

/* Los doce números que pidió el encargo, más una fracción. */
const NUMEROS = [0, 1, 2, 3, 4, 5, 11, 21, 22, 25, 101, 111];

console.log('\n── A · Qué categoría toca en ruso ──');
{
  const r = new Intl.PluralRules('ru-RU');
  const esperado = {
    0: 'many', 1: 'one', 2: 'few', 3: 'few', 4: 'few', 5: 'many',
    11: 'many', 21: 'one', 22: 'few', 25: 'many', 101: 'one', 111: 'many',
  };
  const mal = NUMEROS.filter((n) => r.select(n) !== esperado[n]);
  check('1) las cuatro categorías caen donde deben', mal.length === 0,
    NUMEROS.map((n) => `${n}→${r.select(n)}`).join(' '));
  check('2) y el 0 y el 11 son `many`, que es la trampa',
    r.select(0) === 'many' && r.select(11) === 'many');
}

/*
 * LAS CLAVES CON CANTIDAD QUE DE VERDAD DECLINAN.
 *
 * No están las 18: `composer.removeMentions` no lleva número, y
 * `composer.pollMaxPhotos` y `econtact.count` cuentan cosas que en ruso no se
 * declinan («фото» es indeclinable y `{{lista}}` es una marca). Esas se
 * comprueban aparte, en la sección C.
 */
const DECLINAN = [
  'business.productsCount', 'communities.members', 'composer.pollDays',
  'composer.seconds', 'composer.minutes', 'engine.recentFailures',
  'projects.creations', 'settings.communitiesJoined', 'studio.settingsReferences',
  'wall.pollVotes', 'wall.pollDaysLeft', 'wall.pollHoursLeft',
  'weeai.openTravel', 'weeai.closeTravel', 'writer.words',
];

const enDiccionario = (dicc, clave) => {
  let nodo = dicc;
  for (const tramo of clave.split('.')) nodo = nodo?.[tramo];
  return typeof nodo === 'string' ? nodo : undefined;
};

console.log('\n── B · Las cuatro formas existen y se eligen ──');
{
  const sinFew = DECLINAN.filter((c) => !enDiccionario(ru, `${c}_few`));
  const sinMany = DECLINAN.filter((c) => !enDiccionario(ru, `${c}_many`));
  check('3) todas declaran `_few`', sinFew.length === 0, sinFew.join(' ') || `${DECLINAN.length} claves`);
  check('4) todas declaran `_many`', sinMany.length === 0, sinMany.join(' ') || `${DECLINAN.length} claves`);

  /*
   * LO IMPORTANTE: que la forma que sale con 2 NO sea la que sale con 5, ni la
   * que sale con 1. Si `_few` desapareciera, las tres saldrían iguales y esto
   * es exactamente lo que lo cazaría.
   */
  const noDistinguen = [];
  for (const clave of DECLINAN) {
    const uno = t(clave, { contador: 1, titulo: 'T', lista: 'L' });
    const pocos = t(clave, { contador: 2, titulo: 'T', lista: 'L' });
    const muchos = t(clave, { contador: 5, titulo: 'T', lista: 'L' });
    if (uno === pocos || pocos === muchos || uno === muchos) {
      noDistinguen.push(`${clave} → 1:«${uno}» 2:«${pocos}» 5:«${muchos}»`);
    }
  }
  check('5) 1, 2 y 5 dan TRES textos distintos en todas', noDistinguen.length === 0,
    noDistinguen.length ? noDistinguen.slice(0, 3).join(' | ') : `${DECLINAN.length} claves`);

  /* Y que cada número reciba la forma de su categoría, no la de al lado. */
  const r = new Intl.PluralRules('ru-RU');
  const descolocadas = [];
  for (const clave of DECLINAN) {
    for (const n of NUMEROS) {
      const salida = t(clave, { contador: n, titulo: 'T', lista: 'L' });
      const plantilla = enDiccionario(ru, `${clave}_${r.select(n)}`) ?? enDiccionario(ru, `${clave}_other`);
      /*
       * Se compara el ESQUELETO: el hueco y la cifra valen los dos '#', y lo
       * demás tiene que coincidir letra a letra.
       *
       * El separador de miles ruso es un espacio DURO (U+00A0), no el normal.
       * Meter el espacio normal en esta clase fue un error caro: se tragaba
       * también el que separa la cifra del sustantivo, y la prueba fallaba
       * contra traducciones que estaban bien.
       */
      const esqueleto = (s) => s.replace(/\{\{contador\}\}/g, '#').replace(/\d[\d  ]*/g, '#');
      if (esqueleto(salida) !== esqueleto(plantilla.replace(/\{\{titulo\}\}/g, 'T').replace(/\{\{lista\}\}/g, 'L'))) {
        descolocadas.push(`${clave}(${n})→«${salida}»`);
      }
    }
  }
  check('6) cada uno de los doce números recibe la forma de su categoría',
    descolocadas.length === 0,
    descolocadas.length ? descolocadas.slice(0, 4).join(' | ') : `${DECLINAN.length} claves × ${NUMEROS.length} números`);
}

console.log('\n── C · Las que NO declinan, a propósito ──');
{
  /* «фото» es indeclinable en ruso: 1 фото, 2 фото, 5 фото. Una sola forma. */
  const fotos = NUMEROS.map((n) => t('composer.pollMaxPhotos', { contador: n }));
  check('7) `pollMaxPhotos` dice «фото» con todos los números',
    new Set(fotos.map((s) => s.replace(/\d[\d   ]*/g, '#'))).size === 1, fotos[2]);

  /* El sustantivo sale de {{lista}}, que es la MARCA y no se declina. */
  const agenda = NUMEROS.map((n) => t('econtact.count', { contador: n, lista: 'ËContacts' }));
  check('8) `econtact.count` usa la marca tal cual y nunca escribe un «1» a pelo',
    agenda.every((s) => s.includes('ËContacts')) && agenda[0].startsWith('0'), agenda[0] + ' · ' + agenda[1]);

  /* Sin número: `_other` cubre todo lo que no sea 1, y eso es correcto. */
  check('9) `removeMentions` no depende del número y sigue teniendo dos formas',
    t('composer.removeMentions', { contador: 1 }) !== t('composer.removeMentions', { contador: 5 }),
    t('composer.removeMentions', { contador: 1 }) + ' / ' + t('composer.removeMentions', { contador: 5 }));
}

console.log('\n── D · El ruso no se apoya en el respaldo ──');
{
  /*
   * Un diccionario incompleto no se nota: la cadena de respaldo tapa el hueco
   * con inglés y la pantalla parece correcta. Así que se monta un traductor SIN
   * respaldo y se comprueba que el ruso se vale solo.
   */
  const soloRu = traducir.crearTraductor('ru-RU', { ru });
  const conRespaldo = traducir.crearTraductor('ru-RU', { ru, es, en });
  const MUESTRA = [
    'nav.home', 'menu.settings', 'credits.title', 'auth.password', 'wall.pollVotes',
    'settings.privacyPolicy', 'brain.placeholder', 'weeai.title', 'help.title', 'common.cancel',
  ];
  const distintas = MUESTRA.filter((c) => soloRu(c, { contador: 2 }) !== conRespaldo(c, { contador: 2 }));
  check('10) quitando español e inglés, el ruso dice exactamente lo mismo',
    distintas.length === 0, distintas.join(' ') || `${MUESTRA.length} claves`);

  /* Y que lo que sale sea cirílico de verdad, no inglés colado. */
  const cirilico = MUESTRA.filter((c) => /[Ѐ-ӿ]/.test(soloRu(c, { contador: 2 })));
  check('11) y lo que sale está en cirílico', cirilico.length >= 8,
    `${cirilico.length} de ${MUESTRA.length} (las marcas como Credits van en latino a propósito)`);
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
