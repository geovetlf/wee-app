/**
 * AUDITORÍA DE LOCALIZACIÓN — QUE NADIE VEA UN IDIOMA QUE NO ES EL SUYO.
 *
 *   node test/i18n-auditoria.test.mjs            (DETALLE=1 para ver las listas enteras)
 *
 * Las suites de cada idioma vigilan su diccionario (`i18n-danes`, `i18n-sueco`…) y `i18n-servidor` vigila que se
 * reconozca todo lo que escribe el servidor. Esta mira lo que queda ENTRE medias, en todos los idiomas a la vez, y lo
 * que llega a una persona sin pasar por un diccionario de la app:
 *
 *   A · completos: ni una clave de menos ni una de más, en la app y en la sección del servidor de quien la declara;
 *   B · los huecos y los plurales: los mismos nombres que el español y las formas que pide `Intl.PluralRules`;
 *   C · ni un proveedor, ni un modelo: la persona habla con Weë;
 *   D · ni otro idioma colado: nada de «¿¡» fuera del español, nada sueco ni noruego en el danés;
 *   E · lo que escribe el servidor ÉL SOLO (el push y la página pública) sale del diccionario, en el idioma de quien lo lee;
 *   F · lo que el servidor guarda y la app reconoce se ve en danés, no en español;
 *   G · lo que la persona escribe en SU idioma también se entiende (búsqueda de Weë AI, medio, duración, lugares);
 *   H · lo que es de la persona —una comunidad, un lugar escrito a mano, su objetivo— no se traduce nunca;
 *   I · y el español y el inglés siguen diciendo lo mismo que antes donde no se tocaron.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(here, '../../');
const lib = (p) => require(path.join(raiz, 'functions/lib', p));
const leer = (p) => fs.readFileSync(path.resolve(raiz, p), 'utf8');
const DETALLE = !!process.env.DETALLE;

let failures = 0;
const check = (name, cond, extra = '') => {
  if (!cond) failures++;
  console.log(`${cond ? '✔' : '✘'} ${name}${extra ? ` — ${extra}` : ''}`);
};
const muestra = (lista, n = 6) => (DETALLE ? lista : lista.slice(0, n)).map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' · ')
  + (!DETALLE && lista.length > n ? ` … (+${lista.length - n})` : '');

/* ── El cargador de siempre: transpila y ejecuta los módulos de la app, con sus imports relativos. ── */
const ts = require('typescript');
const comoModulo = (js) => 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');
const rutaDe = (base) => (fs.existsSync(path.resolve(raiz, base + '.ts')) ? base + '.ts' : base + '/index.ts');
const cargados = new Map();
const cargar = async (ruta) => {
  if (cargados.has(ruta)) return cargados.get(ruta);
  let js = ts.transpileModule(leer(ruta), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
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
const { DICCIONARIOS } = (await cargar('i18n/diccionarios.ts')).ns;
const servidor = (await cargar('i18n/servidor.ts')).ns;
const SERVIDOR_ES = (await cargar('i18n/textos/es/servidor/index.ts')).ns.servidor;
const APP_ES = (await cargar('i18n/textos/es/index.ts')).ns.es;

const aplanar = (o, pre = '') => Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' && v ? aplanar(v, pre + k + '.') : [[pre + k, v]]));
const SECCIONES_DEL_SERVIDOR = new Set(Object.keys(SERVIDOR_ES));
const delServidor = (k) => SECCIONES_DEL_SERVIDOR.has(k.split('.')[0]);
/* Cada diccionario una vez, con el nombre con que lo registra el catálogo (los alias apuntan al mismo objeto). */
const UNICOS = [];
for (const [codigo, d] of Object.entries(DICCIONARIOS)) if (!UNICOS.some(([, otro]) => otro === d)) UNICOS.push([codigo, d]);
const PLANO = new Map(UNICOS.map(([c, d]) => [c, Object.fromEntries(aplanar(d))]));
const ES = PLANO.get('es');
const DA = PLANO.get('da');
const PLURAL = /_(zero|one|two|few|many|other)$/;
const HUECOS = (v) => [...String(v).matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]).sort().join(',');
const declaraServidor = (c) => Object.keys(PLANO.get(c)).some(delServidor);

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · Completos ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const basesEs = new Set(Object.keys(ES).map((k) => k.replace(PLURAL, '')));
  const malos = [];
  for (const [codigo, plano] of PLANO) {
    const suyas = new Set(Object.keys(plano).map((k) => k.replace(PLURAL, '')));
    const faltan = [...basesEs].filter((k) => !suyas.has(k) && !(delServidor(k) && !declaraServidor(codigo)));
    const sobran = [...suyas].filter((k) => !basesEs.has(k));
    if (faltan.length || sobran.length) malos.push(`${codigo}: faltan ${faltan.length} [${faltan.slice(0, 3)}] · sobran ${sobran.length} [${sobran.slice(0, 3)}]`);
  }
  check('1) cada idioma tiene todas las claves de la app, y ninguna que el español no tenga', malos.length === 0, muestra(malos) || `${UNICOS.length} diccionarios`);
  const conServidor = UNICOS.map(([c]) => c).filter(declaraServidor);
  check('2) la sección del servidor la declaran el español, el inglés y el danés — enteras', ['es', 'en', 'da'].every((c) => conServidor.includes(c)),
    conServidor.join(' '));
  const vacias = [];
  for (const [codigo, plano] of PLANO) for (const [k, v] of Object.entries(plano)) if (typeof v !== 'string' || !v.trim()) vacias.push(`${codigo}:${k}`);
  check('3) ninguna cadena vacía en ningún idioma', vacias.length === 0, muestra(vacias));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · Huecos y plurales ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /* Lo que se espera en cada clave: lo del español en ESA clave; una forma que el español no tiene (`_few`), lo de su `_other`. */
  const esperadosDe = (k) => {
    const v = ES[k] ?? (PLURAL.test(k) ? ES[k.replace(PLURAL, '_other')] : undefined);
    return v === undefined ? undefined : new Set(HUECOS(v).split(',').filter(Boolean));
  };
  const mal = [];
  for (const [codigo, plano] of PLANO) {
    for (const [k, v] of Object.entries(plano)) {
      const esperados = esperadosDe(k);
      if (!esperados) continue;
      const suyos = HUECOS(v).split(',').filter(Boolean);
      /* Un `_one` puede escribir «un» en vez de {{contador}}; lo demás, los mismos nombres y ninguno inventado. */
      /* {{contador}} llega SIEMPRE a una clave de plural: un `_one` que lo escribe («1 kontakt») no inventa nada. */
      const inventados = suyos.filter((h) => !esperados.has(h) && !(h === 'contador' && PLURAL.test(k)));
      const perdidos = [...esperados].filter((h) => !suyos.includes(h) && !(h === 'contador' && /_(one|zero|two)$/.test(k)));
      if (inventados.length || perdidos.length) mal.push(`${codigo}:${k} ${inventados.length ? `+${inventados}` : ''}${perdidos.length ? `-${perdidos}` : ''}`);
    }
  }
  check('4) los mismos huecos que el español, con sus nombres, en todos los idiomas (app y servidor)', mal.length === 0, muestra(mal));
  const rotos = [];
  for (const [codigo, plano] of PLANO) for (const [k, v] of Object.entries(plano)) if (/\{\{(?![\s\w.]+\}\})|(?<!\{)\{(?!\{)[\w.]+\}(?!\})/.test(v)) rotos.push(`${codigo}:${k}`);
  check('5) ninguna llave suelta ni hueco a medio escribir', rotos.length === 0, muestra(rotos));

  /* Las formas de plural: las que `Intl` dice que tiene cada idioma, ni una menos. */
  const basesPlurales = [...new Set(Object.keys(ES).filter((k) => /_other$/.test(k)).map((k) => k.replace(/_other$/, '')))];
  /*
   * La forma `_other` siempre (el traductor cae a ella), y `_one` en todo idioma cuyo `Intl` distingue el uno —el
   * chino, el japonés y el coreano no—. Las formas `few`/`many` del ruso las vigila su suite.
   */
  const sinForma = [];
  for (const [codigo, plano] of PLANO) {
    const tieneUno = new Intl.PluralRules(codigo).resolvedOptions().pluralCategories.includes('one');
    for (const base of basesPlurales) {
      if (delServidor(base) && !declaraServidor(codigo)) continue;
      if (typeof plano[`${base}_other`] !== 'string') sinForma.push(`${codigo}:${base}_other`);
      if (tieneUno && typeof ES[`${base}_one`] === 'string' && typeof plano[`${base}_one`] !== 'string') sinForma.push(`${codigo}:${base}_one`);
    }
  }
  check('6) cada plural tiene las formas que pide su idioma', sinForma.length === 0, muestra(sinForma) || `${basesPlurales.length} plurales`);
  const tDa = traducir.crearTraductor('da-DK', DICCIONARIOS, { modoDesarrollo: false });
  const plurales = basesPlurales.filter((b) => b.startsWith('movimientos.') || b.startsWith('plan.') || b.startsWith('progreso.'));
  const conTodo = (n) => new Proxy({}, { get: (_, p) => (p === 'contador' ? n : typeof p === 'string' ? 'X' : undefined), has: () => true });
  const malElegidos = plurales.filter((b) => {
    const uno = tDa(b, conTodo(1));
    const tres = tDa(b, conTodo(3));
    return uno === tres || /\{\{/.test(uno + tres);
  });
  check('7) en danés, los plurales del servidor eligen bien entre 1 y 3', malElegidos.length === 0, muestra(malElegidos) || `${plurales.length}`);
  const sinRellenar = [];
  for (const [codigo] of UNICOS) {
    const t = traducir.crearTraductor(codigo, DICCIONARIOS, { modoDesarrollo: false });
    const valores = new Proxy({}, { get: (_, p) => (typeof p === 'string' ? (/contador|numero|dias|noches|cantidad|segundos|max|saldo|total|minutos|horas/.test(p) ? 2 : 'X') : undefined), has: () => true });
    for (const k of Object.keys(ES)) {
      const base = k.replace(PLURAL, '');
      const texto = t(base, valores);
      if (/\{\{/.test(texto)) sinRellenar.push(`${codigo}:${base}`);
    }
  }
  check('8) con valores puestos, ninguna frase de ningún idioma deja un {{hueco}} sin rellenar', sinRellenar.length === 0, muestra([...new Set(sinRellenar)]));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · Ni proveedores ni modelos ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const PROVEEDORES = /\b(Gemini|Seedance|ElevenLabs|Eleven Labs|BytePlus|ModelArk|OpenAI|ChatGPT|GPT-\d|DeepSeek|Seedream|Nano Banana|Flux|Suno|Kling|Runway|Veo|Midjourney|Stable Diffusion|Anthropic|Claude)\b/;
  const conProveedor = [];
  for (const [codigo, plano] of PLANO) for (const [k, v] of Object.entries(plano)) if (PROVEEDORES.test(v)) conProveedor.push(`${codigo}:${k} «${v.match(PROVEEDORES)[0]}»`);
  check('9) ningún texto de ningún idioma nombra un proveedor o un modelo de IA', conProveedor.length === 0, muestra(conProveedor));
  const tecnico = Object.entries(ES).filter(([k, v]) => delServidor(k) && /\b(proveedor|modelo de IA|API)\b/i.test(v));
  check('10) lo que el servidor le dice a la persona no habla de proveedores, modelos ni APIs', tecnico.length === 0, muestra(tecnico.map(([k]) => k)));
  const codigoDelMotor = ['functions/src/engine/errors.ts', 'functions/src/engine/router.ts', 'functions/src/engine/humanize.ts']
    .map(leer).join('\n');
  const frasesConProveedor = [...codigoDelMotor.matchAll(/new EngineError\([^,]+,\s*'([^']*)'/g)].map((m) => m[1]).filter((f) => /proveedor/i.test(f));
  check('11) y los errores del motor tampoco, en su origen', frasesConProveedor.length === 0, muestra(frasesConProveedor));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── D · Ni otro idioma colado ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const signos = [];
  for (const [codigo, plano] of PLANO) {
    if (codigo === 'es') continue;
    for (const [k, v] of Object.entries(plano)) if (/[¿¡ñ]/.test(v.replace(/Weë|ËContact|ẄContact/g, ''))) signos.push(`${codigo}:${k}`);
  }
  check('12) ni «¿», ni «¡», ni «ñ» fuera del español', signos.length === 0, muestra(signos));
  /* «der», «del», «for» son danesas: aquí solo lo que el danés no escribe nunca. */
  const VECINOS = /(?<![\p{L}])(och|inte|är|för|jag|ikkje|nicht|und|nein|danke)(?![\p{L}])|[äöüß]/iu;
  const enDanes = Object.entries(DA).filter(([, v]) => VECINOS.test(v.replace(/Weë|Wäll|ẄContact|ËContact/g, '')));
  check('13) en el danés, ni sueco, ni noruego, ni alemán (ä ö ü ß)', enDanes.length === 0, muestra(enDanes.map(([k, v]) => `${k}: «${v.match(VECINOS)[0]}»`)));
  const ESPANOL = /(?<![\p{L}])(los|las|con|una|que|por|más|cuando|puedes|aquí|está|tus|mis|para|también|ahora|estás|tienes)(?![\p{L}])/iu;
  const servidorEnDanes = Object.entries(DA).filter(([k, v]) => delServidor(k) && ESPANOL.test(v.replace(/\{\{[\w.]+\}\}/g, '')));
  check('14) en la sección danesa del servidor, ni una palabra española', servidorEnDanes.length === 0, muestra(servidorEnDanes.map(([k]) => k)));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── E · Lo que el servidor escribe él solo ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const { AVISOS, PAGINA_PUBLICA } = lib('shared/textosDelServidor.js');
  const igualQueElDiccionario = (tabla, seccion) => {
    const declaran = UNICOS.filter(([c]) => declaraServidor(c));
    return Object.keys(tabla).length === declaran.length
      && declaran.every(([c, d]) => JSON.stringify(tabla[c]) === JSON.stringify(d[seccion]));
  };
  check('15) la tabla de los push es la de los diccionarios (`scripts/i18n-textos-del-servidor.mjs`)',
    igualQueElDiccionario(AVISOS, 'avisos'), Object.keys(AVISOS).join(' '));
  check('15) y la de la página pública también', igualQueElDiccionario(PAGINA_PUBLICA, 'publica'), Object.keys(PAGINA_PUBLICA).join(' '));
  const pagina = lib('public/postPageHtml.js');
  check('16) la copia española que lleva la página (sin imports) dice lo mismo que el diccionario',
    JSON.stringify(pagina.TEXTOS_ES) === JSON.stringify(SERVIDOR_ES.publica));

  const avisos = lib('social/avisos.js');
  const da = avisos.avisoPush('like', 'Mette', 'da-DK');
  const es = avisos.avisoPush('like', 'Mette', 'es');
  const sin = avisos.avisoPush('like', 'Mette', undefined);
  const fr = avisos.avisoPush('like', 'Mette', 'fr-FR');
  check('17) un push a una cuenta en danés se escribe en danés', da?.body === DA['avisos.likeCuerpo'].replace('{{nombre}}', 'Mette'), JSON.stringify(da));
  check('17) a una en español, en español; sin idioma guardado, también', es?.body === ES['avisos.likeCuerpo'].replace('{{nombre}}', 'Mette') && sin?.body === es?.body);
  check('17) y a un idioma que aún no tiene la sección, en inglés (nunca en español)', fr?.body === PLANO.get('en')['avisos.likeCuerpo'].replace('{{nombre}}', 'Mette'), JSON.stringify(fr));
  check('17) «alguien» y los adjuntos de un mensaje, también en su idioma',
    avisos.nombreDeRespaldo('da') === DA['avisos.alguien'] && avisos.cuerpoDelMensaje('📷 Imagen', 'da') !== '📷 Imagen');

  const post = { id: 'p1', text: 'Hej verden', authorName: 'Mette', createdAt: new Date('2026-10-01T10:00:00Z'), imageUrls: [], kind: 'text' };
  const tablaDa = PAGINA_PUBLICA.da;
  let html = '';
  try { html = pagina.paginaDeLaPublicacion(post, undefined, tablaDa); } catch (e) { html = String(e); }
  check('18) la página pública en danés se anuncia en danés: <html lang="da"> y og:locale da_DK',
    /<html lang="da"/.test(html) && /og:locale" content="da_DK"/.test(html), html.slice(0, 80));
  check('18) y la que no sabe el idioma sigue en español', /<html lang="es"/.test(pagina.paginaSinPublicacion('borrada')));
  const fuentePagina = leer('functions/src/public/postPage.ts');
  check('19) la página elige idioma por ?hl= o por el navegador, y lo dice a las cachés (Vary)',
    /consulta\?\.hl/.test(fuentePagina) && /idiomaDelNavegador\(request\.headers\['accept-language'\]\)/.test(fuentePagina) && /response\.set\('Vary', 'Accept-Language'\)/.test(fuentePagina));
  const compartir = leer('utils/compartirFuera.ts');
  check('19) y la app, al compartir, pone el idioma de quien comparte en el enlace', /hl=/.test(compartir));

  const { instruccionDeSalida } = lib('creator/prompts.js');
  check('20) lo que escribe la IA sale en el idioma de la app: danés para da-DK, español neutro para el español',
    /da-DK/.test(instruccionDeSalida('da-DK')) && /dansk/i.test(instruccionDeSalida('da-DK')) && instruccionDeSalida('es-PE') === 'Escribe en español neutro.' && instruccionDeSalida(undefined) === 'Escribe en español neutro.');
  check('20) y las marcas que la app lee siguen en español, dichas tal cual', /IMAGEN:.*PRESUPUESTO:/s.test(instruccionDeSalida('da-DK')));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── F · Lo que el servidor guardó, leído en danés ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const tDa = traducir.crearTraductor('da-DK', DICCIONARIOS, { modoDesarrollo: false });
  const { TEMPLATES } = lib('creator/templates.js');
  /* Palabras que el danés escribe igual que el español (marcas, géneros musicales, préstamos): no son «español colado». */
  const IGUALES = new Set(['🎵 Pop', '🎸 Rock', '✨ Elegant', '🎷 Jazz', '🎹 Lo-fi']);
  const sinTraducir = [];
  for (const [exp, plantilla] of Object.entries(TEMPLATES)) {
    for (const q of plantilla.questions) {
      if (servidor.textoDePregunta(tDa, exp, q) === q.text) sinTraducir.push(`${exp}.${q.id}`);
      for (const o of q.options) {
        const visto = servidor.textoDeOpcion(tDa, exp, q.id, o);
        if (visto === o.label && !IGUALES.has(o.label)) sinTraducir.push(`${exp}.${q.id}.${o.id}`);
      }
    }
    if (servidor.textoDeObjetivo(tDa, exp, plantilla.defaultGoal) === plantilla.defaultGoal) sinTraducir.push(`${exp}.objetivo`);
  }
  const preguntas = Object.values(TEMPLATES).reduce((n, p) => n + p.questions.length, 0);
  const opciones = Object.values(TEMPLATES).reduce((n, p) => n + p.questions.reduce((m, q) => m + q.options.length, 0), 0);
  check(`21) las ${preguntas} preguntas, las ${opciones} opciones y los objetivos del flujo guiado se ven en danés`, sinTraducir.length === 0, muestra(sinTraducir));
  const exactos = Object.entries(ES).filter(([k, v]) => delServidor(k) && !/\{\{/.test(v) && ['motor', 'progreso', 'movimientos', 'social'].includes(k.split('.')[0]));
  const quedanEnEspanol = exactos.filter(([k, v]) => servidor.textoDelServidor(v, { t: tDa, locale: 'da-DK' }) === v && v !== DA[k]);
  check(`22) los ${exactos.length} errores, progresos, conceptos de Credits y respuestas sociales fijos se leen en danés`, quedanEnEspanol.length === 0, muestra(quedanEnEspanol.map(([k]) => k)));
  const desconocido = 'Un texto que el servidor nunca escribió';
  check('23) lo que no se reconoce se enseña tal cual (nunca un hueco ni una clave)', servidor.textoDelServidor(desconocido, { t: tDa, locale: 'da-DK' }) === desconocido);
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── G · Lo que se escribe en su idioma también se entiende ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const EXP = (await cargar('constants/weeExperiences.ts')).ns;
  const ids = (q, i) => EXP.matchExperiences(q, i).map((e) => e.id);
  check('24) «opskrift på lasagne» lleva a Weë Chef; «rejse til Rom», a Weë Travel; «en kortfilm», a Weë Studio',
    ids('opskrift på lasagne', 'da-DK')[0] === 'chef' && ids('rejse til Rom', 'da-DK')[0] === 'travel' && ids('en kortfilm om min hund', 'da')[0] === 'studio');
  check('24) y las palabras cortas de cada día no despistan: «lav en hjemmeside», «en sang til min mor»',
    !ids('lav en hjemmeside', 'da').includes('chef') && !ids('lav en hjemmeside', 'da').includes('home') && ids('en sang til min mor', 'da').join() === 'music');
  check('24) «a recipe for dinner» en inglés lleva a Weë Chef', ids('a recipe for dinner', 'en-US')[0] === 'chef');
  const frasesEs = ['logo', 'video para mi tienda', 'receta', 'viaje a Cusco', 'decorar mi casa', 'ayuda', 'opskrift', 'recipe', 'rejse'];
  check('25) en español la búsqueda es la de siempre: con idioma o sin él, el mismo resultado',
    frasesEs.every((f) => ids(f).join() === ids(f, 'es').join() && ids(f).join() === ids(f, 'es-PE').join()));
  const CTX = (await cargar('utils/contextoDeCreacion.ts')).ns;
  check('26) «en video på 10 sekunder» es un vídeo de 10 s; «a 10-second video», también',
    CTX.contextoDeCreacion(null, 'en video på 10 sekunder', 'da-DK') === 'video' && CTX.duracionEnElTexto('en video på 10 sekunder', 'da-DK') === '10s'
    && CTX.duracionEnElTexto('a 10-second video', 'en') === '10s');
  check('26) y en español nada cambia: sin idioma, una frase danesa no se entiende como antes',
    CTX.contextoDeCreacion(null, 'et billede af min hund') === 'general' && CTX.duracionEnElTexto('10 sekunder') === null);

  const LUG = (await cargar('data/places.ts')).ns;
  const cph = LUG.buscarLugares('København', 6, { idioma: 'da-DK' })[0];
  check('27) «København» encuentra Copenhague, y «Tyskland», Alemania', cph?.id === 'DK-CPH' && LUG.buscarLugares('Tyskland', 6, { idioma: 'da' })[0]?.id === 'DE', cph?.id);
  const opcion = LUG.buscarLugares('Copenhague', 6)[0];
  const visible = LUG.opcionEnSuIdioma(opcion, 'da-DK');
  check('28) el selector la escribe en danés —«København», «Danmark»— y elige la del catálogo',
    visible.label === 'København' && /Danmark$/.test(visible.sublabel || '') && opcion.label === 'Copenhague', `${visible.label} · ${visible.sublabel}`);
  const guardado = LUG.lugarDelCatalogo(opcion);
  check('29) lo guardado no cambia (id y nombre del catálogo), y se lee en el idioma de quien mira',
    guardado.id === 'DK-CPH' && guardado.label === 'Copenhague'
    && LUG.etiquetaDeLugar({ place: guardado }, 'da-DK') === 'København, Danmark'
    && LUG.etiquetaDeLugar({ place: guardado }, 'es-ES') === 'Copenhague, Dinamarca'
    && LUG.etiquetaDeLugar({ place: guardado }, 'en-US') === 'Copenhagen, Denmark',
  [LUG.etiquetaDeLugar({ place: guardado }, 'da-DK'), LUG.etiquetaDeLugar({ place: guardado }, 'en-US')].join(' | '));
  const DIST = (await cargar('utils/distanciaParaLeer.ts')).ns;
  const tDa = traducir.crearTraductor('da-DK', DICCIONARIOS, { modoDesarrollo: false });
  const tEn = traducir.crearTraductor('en-US', DICCIONARIOS, { modoDesarrollo: false });
  check('30) las distancias en su unidad: kilómetros en danés, millas en inglés de EE. UU.',
    /km/.test(DIST.distanciaParaLeer(24, tDa, 'da-DK')) && /mi/.test(DIST.distanciaParaLeer(24, tEn, 'en-US')),
    `${DIST.distanciaParaLeer(24, tDa, 'da-DK')} | ${DIST.distanciaParaLeer(24, tEn, 'en-US')}`);

  const RES = (await cargar('utils/textoDeResultado.ts')).ns;
  const receta = 'Pasta med tomat\n\n1. Kog pastaen.\n\nIMAGEN: a plate of pasta, top view';
  check('31) un resultado no enseña sus líneas internas (IMAGEN:, PROBAR:, NARRACIÓN:)',
    !/IMAGEN/.test(RES.textoParaLeer(receta, tDa, 'da-DK')) && /Kog pastaen/.test(RES.textoParaLeer(receta, tDa, 'da-DK')));
  check('31) y «DÍA 1 ·», «Escena 2» y «PRESUPUESTO:» se leen en danés',
    /^Dag 1/.test(RES.tituloDelDia('DÍA 1 · 12. okt · Rom', tDa, 'da-DK'))
    && /Scene 2/.test(RES.textoParaLeer('Escena 2 (3–6 s): en hund løber', tDa, 'da-DK'))
    && /^Budget:/.test(RES.bloqueDelPresupuesto('PRESUPUESTO: ca. 9.000 kr.', tDa, 'da-DK')));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── H · Lo que es de la persona no se traduce ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const tDa = traducir.crearTraductor('da-DK', DICCIONARIOS, { modoDesarrollo: false });
  const COM = (await cargar('utils/comunidadesDeWee.ts')).ns;
  const { COMMUNITY_CATEGORIES } = (await cargar('constants/communityCategories.ts')).ns;
  const sembrada = COMMUNITY_CATEGORIES[0];
  check('32) una comunidad que sembró Weë se lee en danés',
    COM.nombreDeComunidad(sembrada, tDa, 'da-DK') !== sembrada.name && !/[¿¡ñ]/.test(COM.nombreDeComunidad(sembrada, tDa, 'da-DK')),
    COM.nombreDeComunidad(sembrada, tDa, 'da-DK'));
  check('32) y se encuentra en el buscador por el nombre que se lee («film» → «Film og animation»), además de por el guardado',
    /paraBuscar\(nombreDeComunidad\(c, t, locale\)\)\.includes\(buscado\)/.test(leer('screens/SearchScreen.tsx'))
    && /paraBuscar\(c\.name\)\.includes\(buscado\)/.test(leer('screens/SearchScreen.tsx')));
  check('32) pero si alguien le cambió el nombre, o la creó una persona, sale tal cual',
    COM.nombreDeComunidad({ ...sembrada, name: 'Cine de barrio' }, tDa, 'da-DK') === 'Cine de barrio'
    && COM.nombreDeComunidad({ slug: 'amantes-del-cafe', name: 'Amantes del café' }, tDa, 'da-DK') === 'Amantes del café');
  const LUG = (await cargar('data/places.ts')).ns;
  check('33) un lugar escrito a mano sale como lo escribió su autor', LUG.etiquetaDeLugar({ place: LUG.lugarPropio('La casa de mi abuela') }, 'da-DK') === 'La casa de mi abuela');
  check('34) el objetivo que escribió la persona no se traduce', servidor.textoDeObjetivo(tDa, 'chef', 'Lasaña de mi mamá') === 'Lasaña de mi mamá');
  check('35) los datos de muestra de Weë Business (mensajes de clientes) siguen siendo contenido, no interfaz',
    !/business\.mock/.test(leer('constants/businessMock.ts')) && !Object.keys(ES).some((k) => /^business\.mock/.test(k)));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── I · El español y el inglés, intactos donde no se tocaron ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const appEs = Object.fromEntries(aplanar(APP_ES));
  check('36) el diccionario español de la app es el que se registra (lo del servidor va aparte, sin pisarlo)',
    Object.entries(appEs).every(([k, v]) => ES[k] === v) && !Object.keys(appEs).some(delServidor));
  const tEs = traducir.crearTraductor('es-ES', DICCIONARIOS, { modoDesarrollo: false });
  const { TEMPLATES } = lib('creator/templates.js');
  const cambiadas = [];
  for (const [exp, p] of Object.entries(TEMPLATES)) for (const q of p.questions) {
    if (servidor.textoDePregunta(tEs, exp, q) !== q.text) cambiadas.push(`${exp}.${q.id}`);
    for (const o of q.options) if (servidor.textoDeOpcion(tEs, exp, q.id, o) !== o.label) cambiadas.push(`${exp}.${q.id}.${o.id}`);
  }
  check('37) en español, el flujo guiado dice exactamente lo que dice el servidor', cambiadas.length === 0, muestra(cambiadas));
}

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
