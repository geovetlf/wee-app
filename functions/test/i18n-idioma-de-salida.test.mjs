/**
 * EL IDIOMA DE LO QUE ESCRIBE LA IA, Y EL DE CADA DICCIONARIO.
 *
 *   node test/i18n-idioma-de-salida.test.mjs
 *
 * Un modelo generativo no se puede obligar a escribir en un idioma. Lo que sí se puede —y esto lo vigila— es:
 *   A · pedírselo con claridad y de la misma forma siempre: el idioma con su nombre propio, el inglés y el código, en
 *       el sistema y otra vez al FINAL del encargo (lo último que lee el modelo es lo que más pesa);
 *   B · darse cuenta cuando no obedece, sin tirar respuestas legítimas: el detector solo dice «otro idioma» con pruebas
 *       de sobra, y el resultado lo apunta (`JobResult.idiomaDeSalida`) en vez de rechazarlo;
 *   C · y usar el mismo detector para que ningún diccionario, en ninguno de los idiomas de Weë, lleve frases en otro
 *       idioma por accidente.
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

let failures = 0;
const check = (name, cond, extra = '') => {
  if (!cond) failures++;
  console.log(`${cond ? '✔' : '✘'} ${name}${extra ? ` — ${extra}` : ''}`);
};

const D = lib('shared/idiomaDelTexto.js');
const { idiomaDeSalida } = lib('creator/idiomaDeSalida.js');
const P = lib('creator/prompts.js');

const DANES_RECETA = `🍝 Pasta carbonara til to\n\nIngredienser:\n• 200 g spaghetti\n• 2 æg og 50 g Pecorino Romano\n\nSådan gør du:\n1. Kog pastaen i saltet vand, til den er al dente.\n2. Pisk æggene sammen med osten, og hold det klar.\n3. Når pastaen er færdig, vender du den med æggemassen, så den bliver cremet og ikke koger.\n4. Server med det samme og lidt ekstra peber over.\nTip: Det er vigtigt, at panden ikke er for varm, når du blander det hele.\n\nIMAGEN: a plate of spaghetti carbonara, top view, natural light`;
const DANES_TECNICO = `Her er dit opslag til Instagram og TikTok: Vi har lanceret en ny AI-funktion i Weë Studio, som gør det nemt at lave en video på 15 sekunder. Brug prompten, vælg en stil, og del resultatet med dit fællesskab. Det tager kun et par minutter, og du kan altid lave en ny version, hvis du vil ændre noget. #AI #WeëStudio`;
const DANES_CON_CITA = `Jeg har skrevet en kort tekst til din restaurant. Retten hedder "Lomo saltado", og den kommer fra Peru. Den består af oksekød, løg og tomat, som steges hurtigt på en meget varm pande, og den serveres med ris og pommes frites. Det er en af de mest populære retter i landet, og den er nem at lave derhjemme.`;
const ESPANOL = `Ingredientes (2 personas): 2 tazas del ingrediente principal, 1 cebolla y 2 dientes de ajo. Sofríe la cebolla y el ajo durante tres minutos, agrega el ingrediente principal y cocina a fuego medio hasta que esté dorado. Ajusta la sal y la pimienta, y termina con las hierbas por encima cuando esté listo para servir.`;
const INGLES = `Here is your post for Instagram: We just launched a new feature in Weë Studio that makes it easy to create a short video. Pick a style, write what you want, and share the result with your community. It only takes a few minutes, and you can always make a new version if you want to change something.`;
const SUECO = `Här är ditt inlägg för Instagram: Vi har lanserat en ny funktion i Weë Studio som gör det enkelt att skapa en video. Välj en stil, skriv vad du vill och dela resultatet med din community. Det tar bara några minuter, och du kan alltid göra en ny version om du vill ändra något.`;
const RUSO = 'Вот ваш пост для Instagram: мы запустили новую функцию в Weë Studio, которая позволяет легко создать короткое видео.';

console.log('\n── A · La instrucción: clara, la misma, y repetida al final ──');
{
  const sistema = P.instruccionDeSalida('da-DK');
  check('1) el sistema dice el idioma de tres maneras: su nombre, el inglés y el código',
    /dansk/.test(sistema) && /Danish/.test(sistema) && /código da-DK/.test(sistema), sistema.slice(0, 90));
  check('2) y que manda aunque las instrucciones y el objetivo estén en español', /aunque estas instrucciones y el objetivo estén en español/.test(sistema));
  const encargo = P.buildTextPrompt('chef', 'recipe', '', 'Algo rico para comer hoy', 'Escribir la receta', [], 'da-DK').prompt;
  const ultimo = encargo.split('\n\n').pop();
  check('3) lo último que lee el modelo es el idioma, con la misma forma que en el sistema',
    /^IDIOMA DE LA RESPUESTA: dansk/.test(ultimo) && /Danish/.test(ultimo) && /da-DK/.test(ultimo), ultimo.slice(0, 80));
  check('4) y las marcas que la app lee se piden tal cual, también ahí', /«IMAGEN:»/.test(ultimo) && /«PRESUPUESTO:»/.test(ultimo));
  check('5) en español, o sin idioma, no se añade nada (no hay nada contra lo que empujar)',
    P.recordatorioDeIdioma('es-PE') === '' && P.recordatorioDeIdioma(undefined) === ''
    && !/IDIOMA DE LA RESPUESTA/.test(P.buildTextPrompt('chef', 'recipe', '', 'x', 'y', [], 'es').prompt)
    && P.instruccionDeSalida('es-ES') === 'Escribe en español neutro.');
  check('6) cualquier idioma de Weë tiene nombre para el modelo (nada de «undefined»)',
    ['de', 'fr', 'it', 'pt-BR', 'pt-PT', 'ru', 'ko', 'zh-CN', 'zh-TW', 'ja', 'tr', 'sv', 'hi', 'en-US'].every((l) => !/undefined/.test(P.recordatorioDeIdioma(l)) && P.recordatorioDeIdioma(l).length > 40));
  check('7) Weë Brain sigue con su propia instrucción en cada mensaje, la que ya está en producción',
    /Responde SIEMPRE en dansk/.test(P.instruccionDeIdioma('da-DK')) && /instruccionDeIdioma\(locale\)/.test(leer('functions/src/creator/brain.ts')));
}

console.log('\n── B · Darse cuenta, sin tirar respuestas legítimas ──');
{
  const v = (t, l) => D.veredictoDeIdioma(t, l).veredicto;
  check('8) un danés con nombres propios, marcas y términos técnicos es danés', v(DANES_TECNICO, 'da-DK') === 'coincide');
  check('9) una receta danesa con un plato italiano y su línea interna en inglés es danesa', v(DANES_RECETA, 'da-DK') === 'coincide');
  check('10) un texto danés que cita un plato peruano es danés', v(DANES_CON_CITA, 'da') === 'coincide');
  check('11) español, inglés, sueco y ruso, pedidos en danés, se ven distintos',
    v(ESPANOL, 'da-DK') === 'distinto' && v(INGLES, 'da-DK') === 'distinto' && v(SUECO, 'da-DK') === 'distinto' && v(RUSO, 'da-DK') === 'distinto');
  check('12) y cada uno en su idioma coincide', v(ESPANOL, 'es') === 'coincide' && v(INGLES, 'en-US') === 'coincide' && v(SUECO, 'sv') === 'coincide' && v(RUSO, 'ru') === 'coincide');
  check('13) lo corto, una lista sin frases o un idioma que no sabe medir: «no lo sé», nunca «distinto»',
    v('Hej! Klar til at lave mad?', 'da') === 'incierto' && v('• Mel\n• Sukker\n• Smør\n• Æg\n• Mælk', 'da') === 'incierto' && v(INGLES, 'ar') === 'incierto' && v(INGLES, undefined) === 'incierto');
  const apuntado = idiomaDeSalida({ kind: 'text', content: ESPANOL }, 'da-DK', 'recipe');
  check('14) si sale en otro idioma, el resultado lo lleva apuntado (no se rechaza)', apuntado.idiomaDeSalida?.esperado === 'da-DK' && apuntado.idiomaDeSalida?.detectado === 'es');
  check('15) si sale bien, o no se sabe, no se apunta nada',
    !idiomaDeSalida({ kind: 'text', content: DANES_TECNICO }, 'da-DK', 'copy').idiomaDeSalida && !idiomaDeSalida({ kind: 'text', content: 'Hej!' }, 'da-DK', 'copy').idiomaDeSalida);
  check('16) traducir, corregir o pulir un texto va en el idioma del contenido: no se mira',
    ['translate', 'fix', 'polish'].every((k) => !idiomaDeSalida({ kind: 'text', content: INGLES }, 'da-DK', k).idiomaDeSalida));
  check('17) ni una imagen, ni un vídeo', !idiomaDeSalida({ kind: 'image', content: ESPANOL }, 'da-DK', 'photo').idiomaDeSalida);
  check('18) sin idioma —un cliente antiguo— se esperaba español', !!idiomaDeSalida({ kind: 'text', content: INGLES }, undefined, 'copy').idiomaDeSalida && !idiomaDeSalida({ kind: 'text', content: ESPANOL }, undefined, 'copy').idiomaDeSalida);
  const creator = leer('functions/src/creator/index.ts');
  check('19) creatorRun lo apunta en cada resultado, sin cambiar nada más del paso',
    /\.\.\.idiomaDeSalida\(run\.output, job\.locale, input\.kind\),/.test(creator) && /idiomaDeSalida\?: \{ esperado: string; detectado: string \};/.test(leer('functions/src/creator/types.ts')));
}

console.log('\n── C · Ningún diccionario, en ningún idioma, con frases en otro idioma ──');
{
  const ts = require('typescript');
  const comoModulo = (js) => 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');
  const rutaDe = (base) => (fs.existsSync(path.resolve(raiz, base + '.ts')) ? base + '.ts' : base + '/index.ts');
  const cargados = new Map();
  const cargar = async (ruta) => {
    if (cargados.has(ruta)) return cargados.get(ruta);
    let js = ts.transpileModule(leer(ruta), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
    const carpeta = path.posix.dirname(ruta);
    for (const [, rel] of js.matchAll(/from ['"](\.[^'"]*)['"]/g)) {
      const url = (await cargar(rutaDe(path.posix.normalize(path.posix.join(carpeta, rel))))).url;
      js = js.split(`from '${rel}'`).join(`from '${url}'`).split(`from "${rel}"`).join(`from "${url}"`);
    }
    const r = { url: comoModulo(js), ns: await import(comoModulo(js)) };
    cargados.set(ruta, r);
    return r;
  };
  const { DICCIONARIOS } = (await cargar('i18n/diccionarios.ts')).ns;
  const aplanar = (o, pre = '') => Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' && v ? aplanar(v, pre + k + '.') : [[pre + k, v]]));
  /* Umbrales para frases de interfaz: más cortas que una respuesta, y por eso más exigentes en el margen. */
  const FRASES = { minPalabras: 8, minFuncionales: 3, margen: 3 };
  const vistos = new Set();
  const enOtro = [];
  let medibles = 0;
  let idiomas = 0;
  for (const [codigo, d] of Object.entries(DICCIONARIOS)) {
    if (vistos.has(d)) continue;
    vistos.add(d);
    idiomas++;
    for (const [k, v] of aplanar(d)) {
      const r = D.veredictoDeIdioma(String(v).replace(/\{\{[\w.]+\}\}/g, ' '), codigo, FRASES);
      if (r.veredicto !== 'incierto') medibles++;
      if (r.veredicto === 'distinto') enOtro.push(`${codigo}:${k} → ${r.detectado}`);
    }
  }
  check(`20) en los ${idiomas} diccionarios, ninguna frase medible está en otro idioma`, enOtro.length === 0, enOtro.slice(0, 6).join(' · ') || `${medibles} frases medidas`);
  const colada = D.veredictoDeIdioma('Sube el video y elige el estilo que más te guste para tu publicación.', 'da-DK', FRASES).veredicto;
  check('21) control: una frase española colada en el danés se caza', colada === 'distinto');
}

check('esta suite está en la cadena de `npm test`', /i18n-idioma-de-salida\.test\.mjs/.test(leer('functions/package.json')));
console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
