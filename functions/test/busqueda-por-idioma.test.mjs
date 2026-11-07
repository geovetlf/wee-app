/*
 * LA BÚSQUEDA DE WEË AI HABLA EL IDIOMA DE QUIEN BUSCA.
 *
 *   node test/busqueda-por-idioma.test.mjs
 *
 * Las `keywords` de cada experiencia son españolas y `matchExperiences` las aplicaba a TODOS los idiomas: en filipino
 * «salamat» (gracias) abría Weë Home por «sala», «eroplano» Weë Business por «plan», «facebook» Weë Writer por
 * «ebook» y «post» Weë Chef por «postre». Ahora cada idioma busca con SUS palabras: el español con las `keywords`, un
 * idioma con lista propia (`PALABRAS_POR_IDIOMA`) con esa, y uno sin lista con la inglesa (el idioma de reserva de los
 * textos). El nombre de la experiencia, que es marca, cuenta en todos.
 *
 * Y en español una `keyword` encaja por PALABRAS, nunca a media palabra (G): «facebook» abría Weë Writer por «ebook»
 * también con la interfaz en español, porque bastaba con que apareciera en cualquier sitio de lo escrito. Y con menos
 * de cuatro letras no hay trozos (H): «una» abría Weë Beauty por «unas», «con» Weë Brain por «consejo». Que otra
 * palabra EMPIECE por la keyword tampoco basta (I): «postre» no es «post»; cuentan la palabra entera, sus formas
 * (plural, pronombre, «tú») y el final de lo que se está escribiendo. Y la lista filipina cumple sus reglas (J).
 *
 * Se ejecuta el código de verdad (`constants/weeExperiences.ts` transpilado), en todos los idiomas del registro.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const here = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(raiz, p), 'utf8');
let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

/* El cargador de siempre: transpila y ejecuta los módulos de verdad, con sus imports relativos. */
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
  const r = { url: comoModulo(js), ns: await import(comoModulo(js)) };
  cargados.set(ruta, r);
  return r;
};
const exp = (await cargar('constants/weeExperiences.ts')).ns;
const { IDIOMAS } = (await cargar('i18n/idiomas.ts')).ns;
const ids = (q, idioma) => exp.matchExperiences(q, idioma).map((e) => e.id);

/*
 * Los idiomas que la app ofrece, con su código: lo que la pantalla pasa es el idioma ACTIVO de la interfaz
 * (`useIdioma().idioma`), ya resuelto por el sistema de i18n, no el locale de los formatos.
 */
const LOCALES = IDIOMAS.filter((i) => i.listo).map((i) => i.codigo);
const NO_ESPANOL = LOCALES.filter((l) => l !== 'es');
check('0) se prueban todos los idiomas que ofrece la app', LOCALES.length >= 15 && LOCALES.includes('fil') && LOCALES.includes('es'), LOCALES.join(' '));

/*
 * A · NINGÚN IDIOMA QUE NO SEA EL ESPAÑOL RECIBE PALABRAS ESPAÑOLAS. Cada una es una `keyword` española que no es
 * palabra de ese idioma ni nombre de experiencia; en español sí encuentra la suya.
 */
const SOLO_ESPANOLAS = [['receta', 'chef'], ['itinerario', 'travel'], ['muebles', 'home'], ['negocio', 'business'], ['canción', 'music'], ['peinado', 'beauty']];
for (const [palabra, id] of SOLO_ESPANOLAS) {
  check(`A) «${palabra}» encuentra ${id} en español`, ids(palabra, 'es').includes(id));
  const conEspanol = NO_ESPANOL.filter((l) => ids(palabra, l).includes(id));
  check(`A) y en ningún otro idioma la encuentra por la palabra española «${palabra}»`, conEspanol.length === 0, conEspanol.join(' '));
}
/* En filipino el negocio se escribe «negosyo»: lo encuentra por SU palabra. */
check('A) en filipino «negosyo» encuentra Weë Business por la lista filipina', ids('negosyo', 'fil').includes('business'));

/* B · Los falsos amigos que dieron con el fallo, en filipino. */
const FALSOS = [['salamat', 'home'], ['eroplano', 'business'], ['facebook', 'writer'], ['post', 'chef']];
for (const [palabra, id] of FALSOS) {
  check(`B) en filipino «${palabra}» ya no abre ${id}`, !ids(palabra, 'fil').includes(id), ids(palabra, 'fil').join(' '));
}

/* «facebook» contiene «ebook»: las listas inglesa y filipina dicen «ebooks», que sigue encontrando a quien escribe «ebook». */
check('B) en inglés tampoco «facebook» abre Weë Writer, y «ebook» sí lo encuentra', !ids('facebook', 'en').includes('writer')
  && ids('ebook', 'en').includes('writer') && ids('ebook', 'fil').includes('writer'));

/* C · Cada idioma encuentra por sus palabras; uno sin lista propia, por las inglesas (el idioma de reserva). */
check('C) filipino: «resipe ng adobo» → Weë Chef; «biyahe sa Cebu» → Weë Travel', ids('resipe ng adobo', 'fil').includes('chef') && ids('biyahe sa Cebu', 'fil').includes('travel'));
check('C) danés: «opskrift» → Weë Chef', ids('opskrift', 'da').includes('chef'));
check('C) inglés: «recipe» → Weë Chef', ids('recipe', 'en').includes('chef'));
const sinLista = NO_ESPANOL.filter((l) => !['da', 'en', 'fil'].includes(l));
const sinInglesas = sinLista.filter((l) => !ids('recipe', l).includes('chef') || !ids('travel itinerary', l).includes('travel'));
check('C) los idiomas sin lista propia buscan con la inglesa, como los textos', sinLista.length > 0 && sinInglesas.length === 0, sinInglesas.join(' ') || sinLista.join(' '));
/* La búsqueda no deduce el idioma de un locale: recibe el código que ya resolvió el sistema de i18n (tipado). */
const BUSQUEDA = leer('constants/weeExperiences.ts');
check('C) y no deduce el idioma a mano: recibe el `CodigoDeIdioma` ya resuelto',
  /export const matchExperiences = \(query: string, idioma\?: CodigoDeIdioma\)/.test(BUSQUEDA)
    && /import type \{ CodigoDeIdioma \} from '\.\.\/i18n\/idiomas';/.test(BUSQUEDA) && !/\/\^\(?(?:es|da|en|fil)\b/.test(BUSQUEDA));

/* D · El nombre de la experiencia es marca: cuenta en todos los idiomas. */
const sinNombre = LOCALES.filter((l) => !ids('Weë Chef', l).includes('chef') || !ids('weë travel', l).includes('travel'));
check('D) «Weë Chef» y «Weë Travel» se encuentran por su nombre en todos los idiomas', sinNombre.length === 0, sinNombre.join(' '));

/* E · El español no cambia; y sin idioma (ninguna pantalla llama así) tampoco. */
check('E) en español, «vacaciones» y «receta» siguen encontrando Weë Travel y Weë Chef', ids('vacaciones', 'es').includes('travel') && ids('receta', 'es')[0] === 'chef');
check('E) sin idioma, la búsqueda de siempre', ids('receta')[0] === 'chef');

/*
 * G · EN ESPAÑOL, UNA `keyword` ENCAJA POR PALABRAS, NUNCA A MEDIA PALABRA. Antes bastaba con que apareciera en
 * cualquier sitio de lo escrito (`q.includes`): «facebook» abría Weë Writer por «ebook».
 */
check('G) en español «facebook» no abre Weë Writer (ni con idioma ni sin él)', !ids('facebook', 'es').includes('writer') && !ids('facebook').includes('writer')
  && !ids('mi página de facebook', 'es').includes('writer'));
check('G) «ebook» sigue encontrando Weë Writer, y «ebooks» y «un ebook de cocina» también',
  ids('ebook', 'es').includes('writer') && ids('ebooks', 'es').includes('writer') && ids('un ebook de cocina', 'es').includes('writer'));
/* Los demás falsos amigos de la misma familia: la `keyword` estaba DENTRO de otra palabra. */
const DENTRO = [['revisar', 'travel', 'visa'], ['comparte', 'design', 'arte'], ['receta de ensalada', 'home', 'sala'], ['una escena', 'chef', 'cena'],
  ['un descuento', 'writer', 'cuento'], ['paredes', 'design', 'redes'], ['catálogo', 'design', 'logo'], ['aeroplano', 'business', 'plan']];
const siguenDentro = DENTRO.filter(([q, id]) => ids(q, 'es').includes(id)).map(([q, id, k]) => `${q}→${id} (${k})`);
check('G) ni «revisar» (visa), «ensalada» (sala), «escena» (cena), «descuento» (cuento), «catálogo» (logo)…', siguenDentro.length === 0, siguenDentro.join(' · '));
/* Lo que sí es de esa palabra se sigue encontrando: palabra entera, frase entera, plural, la palabra a medio teclear. */
const BUSQUEDAS = [['receta de ensalada', 'chef'], ['recetas veganas', 'chef'], ['rece', 'chef'], ['itin', 'travel'], ['viaje a Cusco', 'travel'],
  ['mi cv', 'business'], ['no sé qué hacer', 'brain'], ['color de cabello rubio', 'beauty'], ['una historia visual', 'studio'], ['videoclip', 'studio'],
  ['logo para mi tienda', 'design'], ['subtítulos para mi video', 'studio'], ['un poema', 'writer'], ['visa para Japón', 'travel']];
const perdidas = BUSQUEDAS.filter(([q, id]) => !ids(q, 'es').includes(id)).map(([q, id]) => `${q}→${id}`);
check('G) y lo que es de verdad de esa palabra se sigue encontrando (entera, en frase, en plural, a medio teclear)', perdidas.length === 0, perdidas.join(' · '));
/* Las compuestas que se encontraban de verdad por dentro son ahora `keywords` suyas: nadie pierde esas búsquedas. */
const COMPUESTAS = [['un autorretrato', 'photo'], ['un microcuento', 'writer'], ['un minicuento', 'writer'], ['reescribir', 'writer'],
  ['la contraportada', 'design'], ['hazme un cartel', 'design']];
const compuestasPerdidas = COMPUESTAS.filter(([q, id]) => !ids(q, 'es').includes(id)).map(([q, id]) => `${q}→${id}`);
check('G) «autorretrato», «microcuento», «minicuento», «reescribir», «contraportada» y «cartel» se siguen encontrando',
  compuestasPerdidas.length === 0, compuestasPerdidas.join(' · '));

/*
 * H · CON MENOS DE CUATRO LETRAS NO HAY TROZOS. La regla de «quien teclea» dejaba que una palabra de tres letras
 * fuera el principio de una `keyword`: «una» abría Weë Beauty por «unas», «con» Weë Brain por «consejo», «por» Weë
 * Design por «portada»… Ahora hacen falta cuatro letras (la misma regla de los demás idiomas), y al revés igual: una
 * `keyword` de menos de cuatro letras solo encaja entera.
 */
const TRES = [['una', 'beauty'], ['con', 'brain'], ['por', 'design'], ['son', 'music'], ['ver', 'beauty'], ['sus', 'chef']];
const tresAbren = TRES.filter(([w, id]) => ids(w, 'es').includes(id)).map(([w, id]) => `${w}→${id}`);
check('H) «una», «con», «por», «son», «ver» y «sus» ya no abren Weë Beauty, Brain, Design, Music ni Chef', tresAbren.length === 0, tresAbren.join(' · '));
check('H) y en una frase tampoco: «una receta» solo es Weë Chef; «receta con pollo», también; «un video por favor», Weë Studio',
  ids('una receta', 'es').join() === 'chef' && ids('receta con pollo', 'es').join() === 'chef' && ids('un video por favor', 'es').join() === 'studio');
check('H) «Weë» en una frase no abre Weë Studio por «weël»: «un logo para mi tienda en Weë» es Weë Design (y Business, por «tienda»)',
  !ids('un logo para mi tienda en Weë', 'es').includes('studio') && ids('un logo para mi tienda en Weë', 'es').includes('design'));
/* Lo que sigue encontrándose: cuatro letras tecleadas, palabras enteras de tres letras, plurales, «ebook»/«ebooks». */
const SIGUEN = [['rece', 'chef'], ['itin', 'travel'], ['viaj', 'travel'], ['dise', 'design'], ['vide', 'studio'], ['voz', 'music'], ['mi cv', 'business'],
  ['mis cvs', 'business'], ['uña', 'beauty'], ['una uña rota', 'beauty'], ['uñas', 'beauty'], ['mi bio de instagram', 'writer'], ['ebook', 'writer'],
  ['ebooks', 'writer'], ['recetas veganas', 'chef'], ['subtítulos para mi video', 'studio']];
const yaNo = SIGUEN.filter(([q, id]) => !ids(q, 'es').includes(id)).map(([q, id]) => `${q}→${id}`);
check('H) y lo legítimo sigue: «rece», «itin», «voz», «mi cv», «mis cvs», «uña», «mi bio de instagram», «ebook», «ebooks», plurales…', yaNo.length === 0, yaNo.join(' · '));
check('H) una `keyword` corta no coge otras palabras por el principio: «biología» no abre Weë Writer por «bio»', !ids('biología', 'es').includes('writer'));
/* Los demás idiomas ya seguían esta regla y no cambian: la búsqueda española es la única que se tocó. */
check('H) la regla está en el encaje español (cuatro letras para formas y para lo que se escribe) y los demás idiomas siguen igual',
  /const encaja = \(k: string\) => fraseEntera\(k\)\.test\(q\) \|\| words\.some\(\(w\) => esFormaDe\(w, k\)\) \|\| seEstaEscribiendo\(escrito, k\);/.test(BUSQUEDA)
  && /w\.length >= 4 &&\s*k\.length >= 4 &&/.test(BUSQUEDA) && /\.length >= 4\) return true;/.test(BUSQUEDA)
  && /\(w\.length >= 4 && k\.startsWith\(w\)\)/.test(BUSQUEDA.slice(BUSQUEDA.indexOf('const encajaEnSuIdioma'))));
/* SABOTAJE: con la regla de la ronda anterior (tres letras bastan), «una» volvería a abrir Weë Beauty. */
const reglaDeTresLetras = (q0) => {
  const q = q0.trim().toLowerCase();
  const words = q.split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3);
  return exp.ALL_EXPERIENCES.filter((e) => e.keywords.some((k) => words.some((w) => k.startsWith(w) || w.startsWith(k)))).map((e) => e.id);
};
check('H) SABOTAJE: con tres letras bastando, «con» abría Weë Brain y «por» Weë Design', reglaDeTresLetras('con').includes('brain') && reglaDeTresLetras('por').includes('design'));

/*
 * I · UNA PALABRA QUE SOLO EMPIEZA POR LA `keyword` NO ES ELLA. Quedaban los falsos amigos de cuatro letras o más:
 * «postre» abría Weë Design por «post», «salado» Weë Home por «sala», «trenza» Weë Travel por «tren», «a menudo» Weë
 * Chef por «menu», «pelota» Weë Beauty por «pelo», «casarse» Weë Home por «casa», y «la mejor receta» Weë Photo por
 * «mejorar». Ahora una `keyword` encaja entera, en una forma suya (plural, infinitivo con pronombre, presente o
 * imperativo de «tú») o al final de lo que se está escribiendo; y una `keyword` no es nunca una palabra funcional.
 */
const AMIGOS_FALSOS = [['un postre de chocolate', 'design'], ['algo salado', 'home'], ['una trenza', 'travel'], ['a menudo', 'chef'],
  ['una pelota', 'beauty'], ['casarse', 'home'], ['la mejor receta', 'photo'], ['unas fotos de mi boda', 'beauty'],
  ['no se ve bien la foto', 'brain'], ['una plantilla', 'business'], ['un marcador', 'design'], ['el historial', 'writer'], ['un paisaje', 'travel']];
const siguenAbriendo = AMIGOS_FALSOS.filter(([q, id]) => ids(q, 'es').includes(id)).map(([q, id]) => `${q}→${id}`);
check('I) ni «postre», «salado», «trenza», «a menudo», «pelota», «casarse», «la mejor receta», «unas fotos», «no se ve»… abren otra experiencia',
  siguenAbriendo.length === 0, siguenAbriendo.join(' · '));
/* Lo que es de verdad de la palabra sigue encontrándose: formas, frases, lo que se escribe y las compuestas. */
const FORMAS = [['recetas veganas', 'chef'], ['hoteles en Cusco', 'travel'], ['ciudades de Europa', 'travel'], ['países baratos', 'travel'],
  ['explica la fotosíntesis', 'brain'], ['organiza mi semana', 'brain'], ['vende mis productos', 'business'], ['quita el fondo', 'photo'],
  ['mejora esta foto', 'photo'], ['traducirlo al inglés', 'brain'], ['ayudarme con algo', 'brain'], ['un mueble moderno', 'home'],
  ['subtitulo', 'studio'], ['cortometrajes', 'studio'], ['youtubers', 'studio'], ['videoclip', 'studio'], ['logotipo', 'design'],
  ['fotomontaje', 'photo'], ['blogger', 'writer'], ['viajero', 'travel'], ['jardinería', 'home'], ['interiorismo', 'home'],
  ['preguntar algo', 'brain'], ['no sé qué hacer', 'brain'], ['uñas', 'beauty'], ['color de cab', 'beauty'], ['rece', 'chef']];
const formasPerdidas = FORMAS.filter(([q, id]) => !ids(q, 'es').includes(id)).map(([q, id]) => `${q}→${id}`);
check('I) y lo legítimo sigue: plurales, «explica»/«vende»/«quita», «traducirlo», frases a medio escribir, «videoclip», «logotipo», «viajero»…',
  formasPerdidas.length === 0, formasPerdidas.join(' · '));
/* Lo que se escribe es solo el FINAL: «mejor» a medio escribir puede ser «mejorar»; «mejor » terminado, ya no. */
check('I) escritura progresiva: «mejor» (sin terminar) es el principio de «mejorar»; «mejor » (terminado) y «la mejor receta», no',
  ids('mejor', 'es').includes('photo') && !ids('mejor ', 'es').includes('photo') && !ids('la mejor receta', 'es').includes('photo'));
/* Una `keyword` no es nunca una palabra funcional del español (artículos, preposiciones, pronombres, conjunciones…). */
const FUNCIONALES = new Set(['el', 'la', 'lo', 'los', 'las', 'un', 'una', 'uno', 'unos', 'unas', 'a', 'al', 'ante', 'con', 'contra', 'de', 'del',
  'desde', 'en', 'entre', 'hacia', 'hasta', 'para', 'por', 'sin', 'sobre', 'tras', 'y', 'e', 'o', 'u', 'ni', 'que', 'si', 'pero', 'no', 'se',
  'me', 'te', 'nos', 'le', 'les', 'mi', 'mis', 'tu', 'tus', 'su', 'sus', 'yo', 'él', 'ella', 'esto', 'eso', 'este', 'esta', 'ese', 'esa', 'muy', 'más', 'mas', 'ya']);
const funcionales = exp.ALL_EXPERIENCES.flatMap((e) => e.keywords.filter((k) => k.split(/\s+/).every((p) => FUNCIONALES.has(p))).map((k) => `${e.id}:${k}`));
check('I) ninguna `keyword` es solo palabras funcionales (la variante sin tilde de «uñas» era el artículo «unas»; la de «no sé», el «no se» de «no se ve»)',
  funcionales.length === 0, funcionales.join(' '));
/* SABOTAJE: con la regla de la ronda anterior (cualquier palabra que empiece por la `keyword`), «postre» abría Weë Design. */
const reglaDelPrincipio = (q0) => {
  const q = q0.trim().toLowerCase();
  const words = q.split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3);
  return exp.ALL_EXPERIENCES.filter((e) => e.keywords.some((k) => words.some((w) => k.length >= 4 && w.startsWith(k)))).map((e) => e.id);
};
check('I) SABOTAJE: con «empieza por la keyword» bastando, «postre» abría Weë Design y «casarse» Weë Home',
  reglaDelPrincipio('postre').includes('design') && reglaDelPrincipio('casarse').includes('home'));

/*
 * J · LA LISTA FILIPINA (Y LA INGLESA) CUMPLE SUS PROPIAS REGLAS: nada que esté dentro de otra palabra de cada día ni
 * sea su principio. «katalogo» abría Weë Design por «logo», «siningil» (cobrado) por «sining», «baha» (inundación) Weë
 * Home por «bahay», «tanghali» (mediodía) Weë Chef por «tanghalian», «sang-ayon» por «sangkap», «depresyon» Weë
 * Business por «presyo», «tournament» Weë Travel por «tour», «kulambo» por «ulam», «bentahe» por «benta»,
 * «condolence» por «condo» y «restore» Weë Business por «store» (también en inglés).
 */
const FIL_FALSOS = [['gumawa ng katalogo ng mga produkto ko', 'design'], ['bakit ako siningil ng Credits', 'design'], ['paano maghanda kapag may baha', 'home'],
  ['meeting bukas ng tanghali', 'chef'], ['sang-ayon ka ba sa plano ko', 'chef'], ['paano harapin ang depresyon', 'business'],
  ['pubmat para sa basketball tournament', 'travel'], ['bumili ng kulambo', 'chef'], ['bentahe at disbentahe', 'business'],
  ['condolence message para sa kaibigan', 'home'], ['pa-restore ng lumang litrato', 'business']];
const filAbre = FIL_FALSOS.filter(([q, id]) => ids(q, 'fil').includes(id)).map(([q, id]) => `${q}→${id}`);
check('J) filipino: «katalogo», «siningil», «baha», «tanghali», «sang-ayon», «depresyon», «tournament», «kulambo», «bentahe», «condolence», «restore» ya no abren otra experiencia',
  filAbre.length === 0, filAbre.join(' · '));
check('J) inglés: «restore an old photo» ya no abre Weë Business por «store»', !ids('restore an old photo', 'en').includes('business'));
const FIL_SIGUEN = [['gawa ng logo', 'design'], ['likhang sining para sa bahay ko', 'design'], ['dekorasyon sa bahay', 'home'],
  ['resipe para sa tanghalian', 'chef'], ['mga sangkap ng adobo', 'chef'], ['ang presyo ng produkto ko', 'business'], ['city tour sa Cebu', 'travel'],
  ['ulam', 'chef'], ['benta', 'business'], ['condo', 'home'], ['online store', 'business']];
const filPierde = FIL_SIGUEN.filter(([q, id]) => !ids(q, 'fil').includes(id)).map(([q, id]) => `${q}→${id}`);
check('J) y lo legítimo sigue: «gawa ng logo», «dekorasyon sa bahay», «resipe para sa tanghalian», «mga sangkap», «ang presyo ng…», «city tour», «ulam», «benta», «condo», «store»…',
  filPierde.length === 0 && ids('online store', 'en').includes('business'), filPierde.join(' · '));

/*
 * G · NINGUNA BÚSQUEDA ESPAÑOLA EMPEORA: sobre todo el vocabulario español de la app (cada palabra de sus textos), la
 * búsqueda de ahora frente a la regla de antes (`q.includes` y trozos de tres letras, con las mismas `keywords`) solo
 * puede PERDER aciertos, y cada acierto perdido lo era por un trozo: una `keyword` metida a media palabra, un principio
 * de menos de cuatro letras, o una palabra que solo EMPIEZA por la `keyword` sin ser una forma de ella. Un acierto
 * ganado, o uno perdido que encajaba de verdad —palabra entera, una forma suya, o lo que se escribe (cuatro letras o
 * más)—, hace caer la comprobación.
 */
const PLURALES_ESPEC = ['s', 'es'];
const PRONOMBRES_ESPEC = ['lo', 'la', 'los', 'las', 'le', 'les', 'me', 'te', 'se', 'nos'];
const esFormaEspec = (w, k) => w.length >= 4 && k.length >= 4 && (PLURALES_ESPEC.some((p) => w === k + p || k === w + p)
  || (/[aeií]r$/.test(k) && PRONOMBRES_ESPEC.some((p) => w === k + p)) || (/[ae]r$/.test(k) && w === k.slice(0, -1)));
const reglaDeAntes = (q0) => {
  const q = q0.trim().toLowerCase();
  const words = q.split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3);
  const encaja = (k) => q.includes(k) || words.some((w) => k.startsWith(w) || w.startsWith(k));
  return exp.ALL_EXPERIENCES.filter((e) => e.name.toLowerCase().includes(q) || e.keywords.some(encaja));
};
const VOCABULARIO = new Set();
const CARPETA_ES = path.resolve(raiz, 'i18n/textos/es');
for (const f of fs.readdirSync(CARPETA_ES).filter((n) => n.endsWith('.ts'))) {
  for (const w of fs.readFileSync(path.join(CARPETA_ES, f), 'utf8').toLowerCase().split(/[^\p{L}\p{N}]+/u)) if (w.length >= 3) VOCABULARIO.add(w);
}
const empeoran = [];
let cambian = 0;
for (const w of VOCABULARIO) {
  const antes = reglaDeAntes(w);
  const ahora = ids(w, 'es');
  const ganadas = ahora.filter((id) => !antes.some((e) => e.id === id));
  const perdidasAqui = antes.filter((e) => !ahora.includes(e.id));
  if (perdidasAqui.length) cambian++;
  /* Encajaba de verdad: la palabra entera, una forma suya, o (una palabra sola es lo que se escribe) su principio de 4+. */
  const deVerdad = (k) => k === w || esFormaEspec(w, k) || (w.length >= 4 && k.startsWith(w));
  const malPerdidas = perdidasAqui.filter((e) => e.name.toLowerCase().includes(w) || e.keywords.some(deVerdad));
  if (ganadas.length || malPerdidas.length) empeoran.push(`${w}: +${ganadas.join(',')} -${malPerdidas.map((e) => e.id).join(',')}`);
}
check(`G) en las ${VOCABULARIO.size} palabras españolas de la app, solo se pierden aciertos por trozos (${cambian} búsquedas cambian)`,
  VOCABULARIO.size > 3000 && cambian > 0 && empeoran.length === 0, empeoran.slice(0, 5).join(' | '));
/* SABOTAJE: con la regla de antes, «facebook» volvería a abrir Weë Writer: la comprobación de arriba lo vería. */
check('G) SABOTAJE: la regla de antes sí abría Weë Writer con «facebook»', reglaDeAntes('facebook').some((e) => e.id === 'writer'));

/* F · Las pantallas pasan el idioma ACTIVO de la interfaz, no el locale de los formatos. */
const CREADOR = leer('screens/WeeCreatorScreen.tsx');
const ESTUDIO = leer('screens/StudioScreen.tsx');
check('F) Weë AI y Weë Studio buscan con el idioma activo de la interfaz (`useIdioma().idioma`)',
  /const \{ t, formato, idioma \} = useIdioma\(\);/.test(CREADOR) && /matchExperiences\(query, idioma\)/.test(CREADOR)
    && /const \{ t, locale, idioma \} = useIdioma\(\);/.test(ESTUDIO) && /destinoDeIntencion\(texto, \{[\s\S]*?\n      idioma,\n/.test(ESTUDIO)
    && /idioma\?: CodigoDeIdioma;/.test(leer('utils/destinoDeIntencion.ts')));
/* SABOTAJE: la pantalla de antes, que pasaba el locale, no pasaría. */
check('F) SABOTAJE: con `matchExperiences(query, locale)` la comprobación falla',
  !/matchExperiences\(query, idioma\)/.test(CREADOR.replace('matchExperiences(query, idioma)', 'matchExperiences(query, locale)')));

check('esta suite está en la cadena de `npm test`', /busqueda-por-idioma\.test\.mjs/.test(leer('functions/package.json')));
console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
