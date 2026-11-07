/*
 * EL FILIPINO DE WEË (fil-PH) — lo que se puede comprobar de `docs/I18N-FILIPINO.md`, sobre el diccionario entero.
 *
 *   node test/i18n-filipino.test.mjs
 *
 * Cada regla es la del § 15 de la guía, con su lista CERRADA de excepciones y su porqué al lado. Una excepción nueva
 * se añade aquí con su motivo; nunca se afloja la regla. Las comprobaciones «CONTROL» demuestran que cada regla
 * ve el fallo que dice ver (una cadena mal escrita a propósito tiene que caer).
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

/* ── El cargador de siempre: transpila y ejecuta, sin empaquetador. ── */
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

const idiomas = (await cargar('i18n/idiomas.ts')).ns;
const resolver = (await cargar('i18n/resolver.ts')).ns;
const traducir = (await cargar('i18n/traducir.ts')).ns;
const registro = (await cargar('i18n/diccionarios.ts')).ns;
const conServidor = async (codigo) => ({
  ...(await cargar(`i18n/textos/${codigo}/index.ts`)).ns[codigo],
  ...(await cargar(`i18n/textos/${codigo}/servidor/index.ts`)).ns.servidor,
});
const es = await conServidor('es');
const en = await conServidor('en');
const fil = await conServidor('fil');

const aplanar = (o, pre = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object'
  ? aplanar(v, pre + k + '.') : [[pre + k, String(v)]]));
const ES = new Map(aplanar(es));
const EN = new Map(aplanar(en));
const FIL = new Map(aplanar(fil));
/* `publica.codigo`/`publica.locale` son datos (la etiqueta de la página pública), no frases. */
const DATOS = new Set(['publica.codigo', 'publica.locale']);
const frases = [...FIL].filter(([k]) => !DATOS.has(k));

const MARCAS = ['WEË AI ENGINE', 'Weë AI Engine', 'Weë AI', 'Weë Brain', 'Weë Studio', 'Weë Design', 'Weë Photo', 'Weë Writer', 'Weë Music',
  'Weë Beauty', 'Weë Chef', 'Weë Home', 'Weë Business', 'Weë Travel', 'Weë Filmmaker', 'Weë Inspira', 'Weë Credits', 'Weë Biz',
  'Weëls', 'Weël', 'WeeTalk', 'ËContact', 'ẄContact', 'Wäll', 'Credits', 'World Encode Entity', 'Weë'];
const reMarca = new RegExp(MARCAS.map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
/* Lo que no es texto filipino dentro de una cadena: marcas, huecos, emojis, URLs. Se quita antes de mirar el idioma. */
const soloTexto = (s) => s.replace(reMarca, ' ').replace(/\{\{[^}]+\}\}/g, ' ').replace(/https?:\/\/\S+/g, ' ');
const huecos = (s) => [...s.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]).sort().join(',');

// ═════════════════════════════════════════════════════════════════════════════
console.log('── A · Catálogo, registro y formatos ──');
// ═════════════════════════════════════════════════════════════════════════════
{
  const entrada = idiomas.IDIOMAS.find((i) => i.codigo === 'fil');
  check('1) fil en IDIOMAS: «Filipino», de izquierda a derecha, listo y sin variantes',
    !!entrada && entrada.nombreNativo === 'Filipino' && entrada.direccion === 'ltr' && entrada.listo === true && !entrada.variantes);
  check('1) fil-PH en LOCALES_CONTEMPLADOS', idiomas.LOCALES_CONTEMPLADOS.includes('fil-PH'));
  check('1) el registro sirve el diccionario filipino (con su sección del servidor)', registro.DICCIONARIOS.fil && registro.DICCIONARIOS.fil.common && registro.DICCIONARIOS.fil.publica);
  check('1) el tagalo es el mismo idioma: tl y tl-PH llegan a fil', resolver.normalizarLocale('tl-PH') === 'fil-PH' && resolver.normalizarLocale('tl') === 'fil'
    && idiomas.ALIAS_DE_IDIOMA.tl === 'fil');
  const d = new Date(Date.UTC(2026, 9, 1, 14, 30));
  const fecha = new Intl.DateTimeFormat('fil-PH', { dateStyle: 'long', timeZone: 'UTC' }).format(d);
  const numero = new Intl.NumberFormat('fil-PH').format(1234567.89);
  const moneda = new Intl.NumberFormat('fil-PH', { style: 'currency', currency: 'PHP' }).format(1234.5);
  const hora = new Intl.DateTimeFormat('fil-PH', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(d);
  const lista = new Intl.ListFormat('fil-PH', { type: 'conjunction' }).format(['A', 'B', 'C']);
  const hace = new Intl.RelativeTimeFormat('fil-PH', { numeric: 'auto' });
  check('2) Intl con fil-PH: fecha, número, peso, hora, lista y tiempo relativo como los escribe Filipinas',
    fecha === 'Oktubre 1, 2026' && numero === '1,234,567.89' && moneda === '₱1,234.50' && /^2:30\sPM$/.test(hora)
    && lista === 'A, B, at C' && hace.format(-3, 'day') === '3 araw ang nakalipas' && hace.format(-1, 'day') === 'kahapon',
    [fecha, numero, moneda, hora, lista, hace.format(-3, 'day'), hace.format(-1, 'day')].join(' · '));
  const pr = new Intl.PluralRules('fil');
  check('3) Intl.PluralRules(\'fil\'): solo one y other; 4, 6, 9, 14, 104 y 1.4 son other; 0, 1, 2, 3, 5, 15 y 1.5, one',
    JSON.stringify(pr.resolvedOptions().pluralCategories.slice().sort()) === '["one","other"]'
    && [4, 6, 9, 14, 104, 1.4].every((n) => pr.select(n) === 'other') && [0, 1, 2, 3, 5, 15, 1.5].every((n) => pr.select(n) === 'one'));
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── B · Integridad ──');
// ═════════════════════════════════════════════════════════════════════════════
{
  const faltan = [...ES.keys()].filter((k) => !FIL.has(k) && !/^anteriores\./.test(k));
  const sobran = [...FIL.keys()].filter((k) => !ES.has(k));
  check('4) las mismas claves que el español (app y servidor)', faltan.length === 0 && sobran.length === 0,
    [faltan.slice(0, 5).join(' '), sobran.slice(0, 5).join(' ')].filter(Boolean).join(' | '));
  const vacias = frases.filter(([k, v]) => !v.trim() && ES.get(k)?.trim());
  check('4) ninguna vacía', vacias.length === 0, vacias.map(([k]) => k).slice(0, 5).join(' '));
  const sinNfc = frases.filter(([, v]) => v !== v.normalize('NFC'));
  check('4) todo en NFC', sinNfc.length === 0, sinNfc.map(([k]) => k).slice(0, 5).join(' '));
  /* Excepciones de huecos que dice la guía: `_one` pone {{contador}} donde el español escribe «1»; cualquier <clave>SinNombre sin {{nombre}}. */
  const malHueco = frases.filter(([k, v]) => {
    if (!ES.has(k)) return false;
    const e = huecos(ES.get(k)).split(',').filter(Boolean);
    const f = huecos(v).split(',').filter(Boolean);
    if (huecos(ES.get(k)) === huecos(v)) return false;
    if (/_one$/.test(k) && e.every((h) => f.includes(h)) && f.filter((h) => !e.includes(h)).every((h) => h === 'contador')) return false;
    if (/^\w+\.\w+SinNombre$/.test(k) && f.every((h) => e.includes(h)) && e.filter((h) => !f.includes(h)).every((h) => h === 'nombre')) return false;
    return true;
  });
  check('5) los mismos {{huecos}} que el español (salvo las dos excepciones de la guía)', malHueco.length === 0, malHueco.map(([k]) => k).slice(0, 6).join(' '));
  const roto = frases.filter(([, v]) => /\{(?!\{)|(?<!\})\}|\{\{\s*\}\}/.test(v.replace(/\{\{\s*[\w.]+\s*\}\}/g, '')));
  check('5) ningún hueco roto ({ suelta o {{ }} vacío)', roto.length === 0, roto.map(([k]) => k).slice(0, 5).join(' '));
  const emojis = (s) => (s.match(/\p{Extended_Pictographic}/gu) || []).sort().join('');
  const otrosEmojis = frases.filter(([k, v]) => ES.has(k) && emojis(ES.get(k)) !== emojis(v));
  check('5) los mismos emojis que el español', otrosEmojis.length === 0, otrosEmojis.map(([k]) => k).slice(0, 6).join(' '));
  const bordes = frases.filter(([k, v]) => ES.has(k) && (/^\s/.test(ES.get(k)) !== /^\s/.test(v) || /\s$/.test(ES.get(k)) !== /\s$/.test(v)));
  check('5) los mismos espacios de borde', bordes.length === 0, bordes.map(([k]) => k).slice(0, 5).join(' '));

  /*
   * 6 · NINGUNA CADENA IGUAL A LA ESPAÑOLA NI A LA INGLESA, salvo las palabras que la REVISIÓN NATIVA (2026-10-03) decidió
   * que en Filipinas se escriben así, cada una en su grupo con su motivo. Se comparan las palabras —sin huecos, emojis ni
   * cifras—: «{{contador}} shot» es «shot» y «🌿 Natural» es «natural». Añadir una aquí es una decisión de idioma, con
   * su motivo; nunca un atajo para que pase la prueba.
   */
  const PERMITIDAS = new Map(Object.entries({
    /* (a) Marcas de Weë o de terceros y nombres de módulo de Weë Business (decisión de producto del 2026-09-16). */
    marca: ['weë profile', 'weë avatar', 'business plan', 'business coach', 'pricing assistant', 'brand kit', 'customer insights',
      'business ideas', 'business profile', 'my business', 'products catalog', 'create', 'social', 'analyze', 'grow', 'promote', 'swot',
      'instagram', 'tiktok', 'youtube', 'youtube shorts', 'instagram video', 'stories', 'facebook', 'whatsapp', 'linkedin', 'pinterest',
      'spotify', 'google', 'apple', 'filipino', 'english', 'español'],
    /* (b) Términos del sector que en Filipinas se dicen en inglés (cine y foto, música, diseño, negocio, nutrición). */
    sector: ['shot', 'take', 'storyboard', 'timeline', 'aspect ratio', 'format', 'draft', 'preview', 'frame', 'clip', 'reference',
      'close up', 'extreme close up', 'wide shot', 'medium shot', 'establishing shot', 'hero shot', 'drone shot', 'macro shot', 'top down',
      'handheld', 'pov', 'pan', 'tilt', 'lens', 'wide angle', 'telephoto', 'fisheye', 'golden hour', 'blue hour', 'rule of thirds',
      'voice over', 'creative direction', 'narrator', 'accent', 'brainstorming', 'portrait', 'cinematic', 'music video', 'styling', 'brainstorm', 'resolution',
      'shot', 'reggaeton', 'ballad', 'electronic', 'rock', 'pop', 'chocolate lava cake', 'social media', 'marketing', 'packaging',
      'supplies', 'currency', 'nutrition facts', 'sodium', 'vegetarian', 'vegan', 'industrial', 'sci fi', 'cartoon', 'modern',
      'minimalist', 'nightlife', 'budget', 'audio file', 'trending', 'recipe', 'media', 'content', 'spam', 'piercing', 'text', 'video',
      'history', 'refund', 'preview demo', 'demo', 'preview', 'd', 'logo', 'poster', 'banner', 'flyer', 'podcast', 'jingle', 'beat',
      'selfie', 'outfit', 'makeup', 'script', 'prompt', 'prompts', 'tutorial', 'filter', 'feed', 'template', 'standard', 'basic', 'premium',
      'pro', 'avatar'],
    /* (c) Préstamos ya asentados en la interfaz filipina (Android, Facebook, YouTube) o palabras filipinas iguales. */
    asentado: ['home', 'ok', 'error', 'email', 'password', 'privacy', 'account', 'post', 'camera', 'poll', 'background', 'voice message',
      'bio', 'website', 'profile', 'user', 'explore', 'profile', 'explore', 'featured', 'rating', 'delivery', 'sample', 'audio',
      'neutral', 'natural', 'elegante', 'cute', 'moderno', 'metal', 'bigote', 'cap', 'tono', 'popular', 'online', 'offline', 'radio',
      'menu', 'chat', 'link', 'app', 'reels', 'feedback', 'grupo'],
  }));
  const PERMITIDA = new Set([...PERMITIDAS.values()].flat());
  /* Una cifra con su abreviatura («125.4K», «2.8M») es una cifra, no una palabra. */
  const palabrasDe = (v) => soloTexto(v).replace(/\d+(?:[.,]\d+)?\s?[KkMm](?![\p{L}])/gu, ' ').replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, ' ').replace(/[\s\p{P}\p{S}\d]+/gu, ' ').trim().toLowerCase();
  const iguales = frases.filter(([k, v]) => ((ES.get(k) === v) || (EN.get(k) === v)) && palabrasDe(v) && !PERMITIDA.has(palabrasDe(v)));
  check('6) ninguna cadena igual a la española o a la inglesa fuera de la lista decidida por la revisión nativa', iguales.length === 0,
    iguales.slice(0, 12).map(([k, v]) => `${k}=«${v}»`).join(' · '));
  check('6) CONTROL: una frase entera copiada del inglés cae; «🌿 Natural» y «{{contador}} shot» no',
    !PERMITIDA.has(palabrasDe('Save your changes')) && PERMITIDA.has(palabrasDe('🌿 Natural')) && PERMITIDA.has(palabrasDe('{{contador}} shot')));
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── C · Marcas de Weë ──');
// ═════════════════════════════════════════════════════════════════════════════
{
  /* «WEË AI» en versales (lo escribe así el servidor en español) es la misma marca que «Weë AI», la grafía aprobada. */
  const marcasDe = (s) => (s.replace(/WEË AI(?! ENGINE)/g, 'Weë AI').match(reMarca) || []).sort().join('|');
  const cambiadas = frases.filter(([k, v]) => ES.has(k) && marcasDe(ES.get(k)) !== marcasDe(v));
  check('7) cada marca del español sigue, intacta, en su clave', cambiadas.length === 0, cambiadas.slice(0, 6).map(([k]) => k).join(' '));
  const conAfijo = (v) => /\p{L}+-(Weë|Wäll|WeeTalk|ËContact|ẄContact|Credits|Weëls?)/u.test(v)
    || /(Weë|Wäll|WeeTalk|ËContact|ẄContact|Credits|Weëls?)(-?ng|’y|’t)(?!\p{L})/u.test(v);
  const afijos = frases.filter(([, v]) => conAfijo(v));
  check('8) ninguna marca con afijo ni enlace pegado («i-Weë», «Weëng», «mag-WeeTalk»)', afijos.length === 0, afijos.slice(0, 5).map(([k, v]) => `${k}=«${v}»`).join(' · '));
  check('8) CONTROL: «I-share sa i-WeeTalk» y «ang Weëng app» caen', conAfijo('I-share sa i-WeeTalk') && conAfijo('ang Weëng app') && !conAfijo('I-share sa WeeTalk'));
  const persona = (v) => /(^|[^\p{L}])(si|ni|kay|sina|nina|kina)\s+(Weë|WeeTalk|ËContact|Wäll|Credits)/iu.test(v) || /\bmga\s+(Weëls|Credits)\b/u.test(v);
  const personas = frases.filter(([, v]) => persona(v));
  check('9) ningún marcador de persona ante una marca, ni «mga Weëls» / «mga Credits»', personas.length === 0, personas.slice(0, 5).map(([k, v]) => `${k}=«${v}»`).join(' · '));
  check('9) CONTROL: «Ako si Weë Brain» cae; «Ako ang Weë Brain» no', persona('Ako si Weë Brain') && !persona('Ako ang Weë Brain'));
  const traducida = (v) => /Weë (Musika|Paglalakbay|Biyahe|Negosyo|Kusina|Disenyo|Larawan|Litrato|Manunulat|Kagandahan|Tahanan|Utak|Studyo)\b|\bKredito\b|\bKredits\b|\bCredit\b(?!s)|(?<![\p{L}])Wee(?![\p{L}T])/u.test(v);
  const traducidas = frases.filter(([, v]) => traducida(v));
  check('10) ninguna experiencia ni moneda traducida, ni «Wee» sin diéresis', traducidas.length === 0, traducidas.slice(0, 5).map(([k, v]) => `${k}=«${v}»`).join(' · '));
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── D · Idioma ──');
// ═════════════════════════════════════════════════════════════════════════════
{
  /* 11 · Nada de español. `para`, `pero`, `una`, `mas`, `o`, `todo` son también filipinas y no cuentan. */
  /* Un compuesto filipino con guion («De-kalidad», «de-kahon») no es la palabra española suelta: el guion la deja fuera. */
  const ESPANOL = /(^|[^\p{L}-])(el|los|las|del|que|con|por|está|tú|usted|también|puedes|quieres|tus|aquí|ahora|de|en|es|y|un|muy)(?![\p{L}-])/iu;
  const acentos = /[áéíóúÁÉÍÓÚ¿¡]/;
  const espanol = frases.filter(([, v]) => acentos.test(soloTexto(v)) || ESPANOL.test(soloTexto(v)));
  check('11) nada de español (acentos, ¿¡ ni palabras funcionales españolas)', espanol.length === 0, espanol.slice(0, 8).map(([k, v]) => `${k}=«${v}»`).join(' · '));
  check('11) CONTROL: «Guardar los cambios» cae; «Para sa iyo» y «De-kalidad na text» no', ESPANOL.test('Guardar los cambios') && !ESPANOL.test('Para sa iyo') && !ESPANOL.test('De-kalidad na text'));

  /*
   * 12 · Nada de inglés funcional suelto, salvo en marcas, nombres de módulo y términos fijos del glosario.
   * `in`, `out`, `up`, `on`, `off` no cuentan: forman «Mag-sign in», «Mag-top up», «I-on».
   */
  const FIJOS = /My Business|World Encode Entity|call to action|rule of thirds|Products & Catalog|Business Plan|Business Coach|Pricing Assistant|Brand Kit|Customer Insights|Business Ideas|Business Profile|Weë AI Engine|Customer|Before|After|Pay as you go|CC BY \d|GeoNames|black and white/gi; /* «black and white» (fotos): término fijo, decisión de la revisión nativa */
  const INGLES = /(^|[^\p{L}-])(the|and|of|your|you|with|for|to|is|are|this|that|please|not|from|will|can|has|have|our|my|it|be|an|by|as|if|we|all|more|now|here|yes|new)(?![\p{L}-])/iu;
  const ingles = frases.filter(([, v]) => INGLES.test(soloTexto(v).replace(FIJOS, ' ')));
  check('12) nada de inglés funcional suelto', ingles.length === 0, ingles.slice(0, 8).map(([k, v]) => `${k}=«${v}»`).join(' · '));
  check('12) CONTROL: «I-save ang your changes» cae; «Mag-sign in» no', INGLES.test('I-save ang your changes') && !INGLES.test('Mag-sign in'));
  const pluralIngles = (v) => /\bmga\s+(settings|notifications|videos|files|apps|posts|followers|users|links|photos|comments|messages)\b/i.test(v);
  const plurales = frases.filter(([, v]) => pluralIngles(v));
  check('13) ningún plural inglés tras «mga» («Mga settings»)', plurales.length === 0, plurales.slice(0, 5).map(([k, v]) => `${k}=«${v}»`).join(' · '));
  const po = (v) => /(^|[^\p{L}])(po|opo|ho|oho)(?![\p{L}])/iu.test(v) || /(^|[^\p{L}])(kayo|ninyo|inyo|inyong|niyo|nyo)(?![\p{L}])/iu.test(v);
  const conPo = frases.filter(([, v]) => po(soloTexto(v)));
  check('14) sin «po/opo» ni tratamiento de usted («kayo/ninyo»)', conPo.length === 0, conPo.slice(0, 5).map(([k, v]) => `${k}=«${v}»`).join(' · '));
  const OFICINA = /(^|[^\p{L}])(upang|ngunit|subalit|datapwat|sapagkat|alinsunod|maaari|maaaring|pwede)(?![\p{L}])/iu;
  const oficina = frases.filter(([, v]) => OFICINA.test(v));
  check('15) sin el registro de oficina («upang», «subalit», «maaari»…; «puwede» se escribe así)', oficina.length === 0, oficina.slice(0, 5).map(([k, v]) => `${k}=«${v}»`).join(' · '));
  const boton = (v) => v.length <= 30 && !/[.!?]$/.test(v.trim());
  const paki = frases.filter(([, v]) => boton(v) && /^Paki/i.test(v.trim()));
  check('15) ningún botón empieza por «Paki»', paki.length === 0, paki.map(([k]) => k).join(' '));
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── E · Gramática comprobable ──');
// ═════════════════════════════════════════════════════════════════════════════
{
  const RAICES = 'save|upload|download|delete|edit|post|share|like|follow|block|report|mute|mention|chat|attach|record|generate|sign|tap|click|swipe|paste|preview|clear|update|refresh|reset|load|crop|play|pause|verify|explore|email';
  const ENTERAS = new Set(['upload', 'download', 'reload', 'repost', 'unblock', 'unfollow', 'unlike', 'unmute', 'regenerate', 'design', 'display', 'replay', 'unpaste']);
  const sinGuion = (v) => [...v.matchAll(new RegExp(`(?<![\\p{L}-])(\\p{L}+?)(${RAICES})(?![\\p{L}])`, 'giu'))]
    .some((m) => !ENTERAS.has((m[1] + m[2]).toLowerCase()) && !/^(re|un|pre|de)$/i.test(m[1]) && /^(i|in|ini|mag|nag|na|ma|maka|naka|pag|ipa|ipag|nai|mai|ika|ka|pina|pinag|ni|ma|nagda|nagpa|mapa|napa|ipina|maipa|magpa|ina|nai|ki|naki|maki)/i.test(m[1]));
  const guion = frases.filter(([, v]) => sinGuion(soloTexto(v)));
  check('16) préstamo con guion tras el afijo filipino («I-save», «Na-upload»)', guion.length === 0, guion.slice(0, 6).map(([k, v]) => `${k}=«${v}»`).join(' · '));
  check('16) CONTROL: «isave» y «nagdownload» caen; «I-save», «upload», «Ipinapadala» no',
    sinGuion('isave') && sinGuion('nagdownload') && !sinGuion('I-save') && !sinGuion('upload') && !sinGuion('Ipinapadala ang report'));
  const mayus = frases.filter(([, v]) => /(^|[^\p{L}])I-[A-Z]/u.test(v) && v !== v.toUpperCase());
  check('17) préstamo con mayúscula solo en la I («I-save», nunca «I-Save»)', mayus.length === 0, mayus.slice(0, 5).map(([k, v]) => `${k}=«${v}»`).join(' · '));
  const minus = frases.filter(([, v]) => /^i-/u.test(v.trim()) && boton(v));
  check('17) ningún botón ni título empieza por «i-» minúscula', minus.length === 0, minus.map(([k]) => k).join(' '));

  /* 18 · din/rin, daw/raw, ding/ring según el sonido anterior. */
  const MUDA = new Set(['save', 'delete', 'profile', 'like', 'file', 'update', 'share', 'type', 'code', 'page', 'online', 'site', 'image', 'device', 'live', 'phone', 'note', 'theme', 'mode', 'scene', 'voice']);
  const dinRin = (v) => [...v.matchAll(/([\p{L}’']+|\}\})\s+(din|rin|daw|raw|ding|ring)(?![\p{L}])/giu)].some((m) => {
    const antes = m[1].toLowerCase();
    const palabra = m[2].toLowerCase();
    if (antes === '}}') return true; /* ninguno justo detrás de un hueco: no se sabe cómo acaba */
    const vocal = /[aeiouwy]$/.test(antes) && !MUDA.has(antes) && !/(ri|ra|raw|ray)$/.test(antes);
    return vocal ? palabra.startsWith('d') : palabra.startsWith('r');
  });
  const dr = frases.filter(([, v]) => dinRin(v));
  check('18) din/rin, daw/raw y ding/ring según el sonido anterior (y nunca tras un hueco)', dr.length === 0, dr.slice(0, 6).map(([k, v]) => `${k}=«${v}»`).join(' · '));
  check('18) CONTROL: «Puwede ka ding» y «Ngayon rin» caen; «Puwede ka ring», «Ngayon din», «I-save din» no',
    dinRin('Puwede ka ding') && dinRin('Ngayon rin') && !dinRin('Puwede ka ring') && !dinRin('Ngayon din') && !dinRin('I-save din'));
  const rito = frases.filter(([, v]) => /(^|[^\p{L}])(rito|riyan|roon)(?![\p{L}])/iu.test(v));
  check('19) «dito», «diyan», «doon» siempre', rito.length === 0, rito.slice(0, 5).map(([k]) => k).join(' '));
  const MODO = 'maayos|mabilis|mabagal|tama|malinaw|libre|sabay|ligtas|matagal|madali|husto|todo';
  const ngNang = (v) => /(^|[^\p{L}])(\p{L}+) ng \2(?![\p{L}])/iu.test(v)
    || new RegExp(`(^|[^\\p{L}])ng (${MODO})(?![\\p{L}])(?! na)`, 'iu').test(v)
    || /(^|[^\p{L}])nang (ang|ng|sa|mga)(?![\p{L}])/iu.test(v.replace(/nang sa gayon/gi, ''));
  const nn = frases.filter(([, v]) => ngNang(v));
  check('20) ng / nang según la KWF', nn.length === 0, nn.slice(0, 6).map(([k, v]) => `${k}=«${v}»`).join(' · '));
  check('20) CONTROL: «Pindutin ng matagal» y «tawa ng tawa» caen; «Pindutin nang matagal» no',
    ngNang('Pindutin ng matagal') && ngNang('tawa ng tawa') && !ngNang('Pindutin nang matagal'));
  const barra = frases.filter(([, v]) => /(^|[^\p{L}])(ni\/ng|ng\/ni|siya\/sila|sila\/siya)(?![\p{L}])|\((mga|na)\)/iu.test(v));
  check('21) sin alternativas con barra o paréntesis («ni/ng», «(mga)»)', barra.length === 0, barra.map(([k]) => k).join(' '));
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── F · Plural ──');
// ═════════════════════════════════════════════════════════════════════════════
{
  const pares = [...FIL.keys()].filter((k) => /_one$/.test(k)).map((k) => k.replace(/_one$/, ''));
  const incompletos = pares.filter((b) => !FIL.has(`${b}_other`));
  const otrasFormas = [...FIL.keys()].filter((k) => /_(zero|two|few|many)$/.test(k));
  check('22) solo _one y _other, los dos presentes', incompletos.length === 0 && otrasFormas.length === 0, [...incompletos, ...otrasFormas].join(' '));
  const unoAMano = pares.filter((b) => /(^|[^\d])1([^\d]|$)|\bisang?\b/i.test(soloTexto(FIL.get(`${b}_one`))) || /(^|[^\d])1([^\d]|$)|\bisang?\b/i.test(soloTexto(FIL.get(`${b}_other`))));
  check('22) ningún _one/_other escribe «1», «isa» ni «isang» a mano', unoAMano.length === 0, unoAMano.join(' '));
  const mgaCifra = frases.filter(([, v]) => /\{\{\w+\}\}\s+(na\s+)?mga(?![\p{L}])/u.test(v));
  check('22) ninguno lleva «mga» detrás de una cifra', mgaCifra.length === 0, mgaCifra.map(([k]) => k).join(' '));
  /* 23 · El enlace: si en _one {{contador}} va delante de una palabra que no es partícula ni símbolo, _other = _one + «na». */
  const PARTICULAS = /^(pa|na|lang|lamang|sa|ng|ang|o|at|ay|s|seg\.?|min\.?|MB|GB|km|m|%|x|×|\/|·|–|-|—|\)|,|\.|:|;|!|\?|…)$/;
  const malEnlace = pares.filter((b) => {
    const uno = FIL.get(`${b}_one`);
    const otro = FIL.get(`${b}_other`);
    const m = uno.match(/\{\{\s*contador\s*\}\}(\s+)(\S+)/);
    /* Sin palabra detrás, o con partícula, símbolo o abreviatura: la cifra no enlaza y las dos formas son iguales. */
    if (!m || PARTICULAS.test(m[2].replace(/[,.!?…:;)]$/, ''))) return uno !== otro;
    const esperado = uno.replace(/\{\{\s*contador\s*\}\}\s+/, (x) => `${x.trimEnd()} na `);
    return otro !== esperado;
  });
  check('23) el enlace «na» de _other: _one + «na» tras la cifra delante de un sustantivo; si no, iguales', malEnlace.length === 0,
    malEnlace.slice(0, 6).map((b) => `${b}: «${FIL.get(`${b}_one`)}» / «${FIL.get(`${b}_other`)}»`).join(' · '));
  const numeroSinPlural = frases.filter(([k, v]) => !/_(one|other)$/.test(k) && /\{\{\s*(contador|count|total|numero|n)\s*\}\} na \p{L}/u.test(v));
  check('24) fuera de los plurales, ninguna cifra con «na» escrito (la categoría no se sabe)', numeroSinPlural.length === 0, numeroSinPlural.map(([k]) => k).join(' '));
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── G · Puntuación y formato ──');
// ═════════════════════════════════════════════════════════════════════════════
{
  const punt = (v) => /\.\.\./.test(v) || /[«»„]/.test(v) || /(?<!\{)"(?!\})/.test(v) || /(\p{L})'(\p{L})/u.test(v) || /—/.test(v) || /\}\}\s+%/.test(v) || /[¿¡]/.test(v);
  const mal = frases.filter(([, v]) => punt(v));
  check('25) puntuación: «…», comillas “…”, apóstrofo ’, sin raya larga, % pegado, sin ¿¡', mal.length === 0, mal.slice(0, 6).map(([k, v]) => `${k}=«${v}»`).join(' · '));
  const contraccion = frases.filter(([, v]) => [...v.matchAll(/(\p{L}+)’(y|t)(?![\p{L}])/gu)].some((m) => !['iba’t', 'isa’t'].includes(`${m[1].toLowerCase()}’${m[2]}`)));
  check('26) contracciones con apóstrofo solo en «iba’t iba», «isa’t isa»', contraccion.length === 0, contraccion.slice(0, 5).map(([k, v]) => `${k}=«${v}»`).join(' · '));
  /* 27 · Mayúscula de frase en títulos y botones (sin puntuación de frase y cortos). */
  /* «Home» es el nombre de la pestaña en filipino (glosario § 11.1), como «Inicio» en español. */
  const PROPIOS = /^(Home|Google|Filipino|Filipinas|Pilipinas|Pinoy|Nanay|Tatay|Lola|Lolo|Tunay|Enero|Pebrero|Marso|Abril|Mayo|Hunyo|Hulyo|Agosto|Setyembre|Oktubre|Nobyembre|Disyembre|Lunes|Martes|Miyerkules|Huwebes|Biyernes|Sabado|Linggo|AI|PDF|CV|URL|OK|SWOT|EXPLORE|PROFILE|II|III|IV)$/;
  const mayusculas = frases.filter(([k, v]) => {
    if (v.length > 40 || /[.!?:]/.test(v) || v === v.toUpperCase()) return false;
    /* La primera PALABRA, no el primer trozo: un emoji o un símbolo delante («📍 Lokasyon») no es la primera palabra. */
    const palabras = soloTexto(v).split(/\s+/).filter((w) => /\p{L}/u.test(w)).slice(1);
    const enEspanol = new Set((ES.get(k) || '').split(/\s+/).concat((EN.get(k) || '').split(/\s+/)).map((w) => w.replace(/[^\p{L}]/gu, '')));
    /*
     * Un nombre de sección dentro de la frase va con mayúscula en español («Volver al Inicio», «Quitar de Guardados»):
     * el filipino puede ponerla en el suyo («Bumalik sa Home», «Alisin sa Mga naka-save»). Se permiten tantas mayúsculas
     * de más como el original tiene en medio de la frase; nunca más.
     */
    const enMedio = (t) => (t || '').split(/\s+/).filter((w) => /\p{L}/u.test(w)).slice(1).filter((w) => /^\p{Lu}/u.test(w.replace(/[^\p{L}]/gu, ''))).length;
    const permitidas = Math.max(enMedio(ES.get(k)), enMedio(EN.get(k)));
    const deMas = palabras.filter((w) => { const p = w.replace(/[^\p{L}-]/gu, ''); return /^\p{Lu}/u.test(p) && !PROPIOS.test(p) && !enEspanol.has(p) && !/^I-/.test(p); });
    return deMas.length > permitidas;
  });
  check('27) mayúscula de frase en títulos y botones («Mga setting», nunca «Mga Setting»)', mayusculas.length === 0, mayusculas.slice(0, 8).map(([k, v]) => `${k}=«${v}»`).join(' · '));
  const aMano = frases.filter(([k, v]) => /₱\{\{|PHP \{\{|(^|[^\p{L}])(AM|PM|n\.u\.|n\.h\.)(?![\p{L}])/u.test(v) && !/(AM|PM)/.test(ES.get(k) || ''));
  check('28) nada de formatos a mano (₱{{, PHP {{, AM/PM)', aMano.length === 0, aMano.map(([k]) => k).join(' '));
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── H · Coherencia del glosario ──');
// ═════════════════════════════════════════════════════════════════════════════
{
  const ESPERADO = {
    'common.cancel': 'Kanselahin', 'common.save': 'I-save', 'common.delete': 'I-delete', 'common.share': 'Ibahagi', 'common.retry': 'Subukan ulit',
  };
  const distintos = Object.entries(ESPERADO).filter(([k, v]) => FIL.has(k) && FIL.get(k) !== v);
  check('29) las claves comunes dicen lo que dice el glosario', distintos.length === 0, distintos.map(([k, v]) => `${k}=«${FIL.get(k)}» (glosario «${v}»)`).join(' · '));
  const descartadas = frases.filter(([, v]) => /(^|[^\p{L}])(I-cancel|Burahin|I-share|Subukang muli|Mag-log in|Mag-login|Mga abiso)(?![\p{L}])/u.test(v));
  check('29) y no aparecen sus alternativas descartadas («I-cancel», «Burahin», «I-share», «Mag-log in»…)', descartadas.length === 0, descartadas.slice(0, 6).map(([k, v]) => `${k}=«${v}»`).join(' · '));
  const noSe = frases.filter(([k, v]) => ES.has(k) && /🤷\s*No sé/.test(ES.get(k)) && !/🤷\s*Hindi ko alam/.test(v));
  check('30) cada «🤷 No sé» es «🤷 Hindi ko alam»', noSe.length === 0, noSe.map(([k]) => k).slice(0, 5).join(' '));
  const misCreaciones = [FIL.get('weeai.myCreations'), FIL.get('studio.creationsTitle'), FIL.get('creaciones.title')];
  check('29) «Mis creaciones» es «Mga likha ko» en las tres puertas', misCreaciones.every((v) => v === 'Mga likha ko'), misCreaciones.join(' | '));
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── I · Lo que la app hace con el filipino ──');
// ═════════════════════════════════════════════════════════════════════════════
{
  const t = traducir.crearTraductor('fil-PH', registro.DICCIONARIOS);
  check('31) el traductor de la app, con fil-PH, contesta en filipino y no cae en otro idioma', t('common.cancel') === FIL.get('common.cancel') && t('common.cancel') !== ES.get('common.cancel'));
  const tl = traducir.crearTraductor(resolver.normalizarLocale('tl-PH'), registro.DICCIONARIOS);
  check('31) un teléfono que dice tl-PH lee el mismo filipino', tl('common.cancel') === FIL.get('common.cancel'));
  const sinNombre = Object.keys(fil.notifications).filter((k) => /SinNombre$/.test(k));
  check('32) notifications.<clave>SinNombre: las diez frases sin nombre, sin {{nombre}} (si/ni no van delante de un sustantivo común)',
    sinNombre.length === 10 && sinNombre.every((k) => !/\{\{\s*nombre\s*\}\}/.test(fil.notifications[k])));
  const otros = Object.keys(registro.DICCIONARIOS).filter((c) => c !== 'fil' && registro.DICCIONARIOS[c].notifications);
  const cambianEnOtros = otros.filter((c) => {
    const n = registro.DICCIONARIOS[c].notifications;
    const claves = Object.keys(n).filter((k) => /SinNombre$/.test(k));
    return claves.length !== 10 || claves.some((k) => n[k] !== n[k.replace(/SinNombre$/, '')]);
  });
  check('32) en los demás idiomas, cada <clave>SinNombre es la MISMA frase de siempre: allí nada cambia', cambianEnOtros.length === 0, cambianEnOtros.join(' '));
  const pantalla = leer('screens/NotificationsScreen.tsx');
  check('32) la pantalla usa sinNombre solo cuando no hay nombre, y sin hueco no pinta ningún nombre',
    /remitente\?\.displayName \? clave : `\$\{clave\}SinNombre`/.test(pantalla) && /\{llevaNombre \? <Text style=\{styles\.username\}>\{nombre\}<\/Text> : null\}/.test(pantalla));
  const eb = leer('components/ErrorBoundary.tsx');
  check('33) la pantalla de error de arranque tiene su fila filipina', /\n  fil: \{ titulo: '[^']+', mensaje: '[^']*Weë[^']*', boton: '[^']+' \},/.test(eb));
  const tabla = leer('functions/src/shared/textosDelServidor.ts');
  check('34) el servidor tiene su tabla filipina (push y página pública), generada del diccionario', /(^|[\s{,])["']?fil["']?:\s*\{/.test(tabla) && (tabla.match(/["']?fil["']?:\s*\{/g) || []).length >= 2);
  const idiomaDelServidor = leer('functions/src/shared/idiomaDelServidor.ts');
  check('34) un Accept-Language tl-PH lee la tabla filipina', /base === 'tl' \? 'fil' : base/.test(idiomaDelServidor));
  check('35) la guía existe y la suite está en la cadena de npm test', fs.existsSync(path.resolve(raiz, 'docs/I18N-FILIPINO.md'))
    && /node test\/i18n-filipino\.test\.mjs/.test(leer('functions/package.json')));
  /* Una idea, una palabra (§ 0 y § 4.5): en Weë Design el estilo industrial y el moderno se dicen igual en todas partes. */
  const PLANO_FIL = new Map(aplanar(fil));
  check('36) Weë Design dice «Industriyal» y «Moderno» en sus opciones, sus valores y el plan de Weë Brain (nunca «Industrial»/«Modern» al lado)',
    PLANO_FIL.get('opciones.designLookIndustrial') === '🏭 Industriyal' && PLANO_FIL.get('design.valIndustrial') === 'Industriyal'
    && PLANO_FIL.get('opciones.homeStyleModern') === '🏙️ Moderno' && PLANO_FIL.get('design.valModern') === 'Moderno'
    && PLANO_FIL.get('plan.designMatizLookIndustrial') === 'industriyal ang itsura',
    `${PLANO_FIL.get('opciones.designLookIndustrial')} · ${PLANO_FIL.get('opciones.homeStyleModern')}`);
}

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
