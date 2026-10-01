/*
 * EL HINDI DE WEË.
 *
 * `hi` entra por la misma puerta que los demás —una carpeta, una línea en el
 * registro, una fila en el catálogo—, sin una sola línea de lógica para él. Lo
 * que esta prueba vigila es lo que SOLO puede salir mal en hindi:
 *
 * 1 · QUE ESTÉ ENTERO. Un traductor SIN respaldo frente a otro con él: si una
 *     clave faltara, el segundo la sacaría en inglés y el primero no.
 *
 * 2 · EL CERO ES `one`. `Intl.PluralRules('hi')` pone el 0 y el 1 en `one`: una
 *     forma `_one` que escriba «1» o «एक» a mano diría «1 टिप्पणी» con cero.
 *
 * 3 · EL DEVANAGARI, BIEN ESCRITO. La nukta es letra + U+093C (las letras
 *     precompuestas no sobreviven a NFC); फ़ y ज़ en los préstamos, ड़ y ढ़
 *     siempre; chandrabindu donde la norma la pide; cifras latinas; ni ZWJ ni
 *     matras mal codificadas; la frase acaba en «.», nunca en «।».
 *
 * 4 · «आप» Y SIN GÉNERO. Weë no sabe el género de nadie: nada de «तुम», nada
 *     de imperativos en -ओ y nada de barras «सकता/सकती».
 *
 * 5 · LAS MARCAS, EN LATINO. «Weë पर», «Credits बैलेंस»: nunca transliteradas
 *     ni pegadas a una letra devanagari.
 *
 * 6 · QUE `hi-IN` FUNCIONE DE PUNTA A PUNTA: del aparato al idioma, a los
 *     formatos (agrupación india, rupias) y al `<html lang="hi">`.
 *
 * Los caracteres invisibles o que NFC deshace se escriben aquí por su número
 * (`cp`), nunca pegados: así ninguna herramienta que normalice el archivo los
 * puede cambiar sin que se note.
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

/* ── El cargador diminuto de `i18n.test.mjs`: transpila y ejecuta, sin empaquetador. ── */
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

const idiomas = (await cargar('i18n/idiomas.ts')).ns;
const resolver = (await cargar('i18n/resolver.ts')).ns;
const traducir = (await cargar('i18n/traducir.ts')).ns;
const formato = (await cargar('i18n/formato.ts')).ns;
const caja = (await cargar('i18n/caja.ts')).ns;
const registro = (await cargar('i18n/diccionarios.ts')).ns;
const es = (await cargar('i18n/textos/es/index.ts')).ns.es;
const en = (await cargar('i18n/textos/en/index.ts')).ns.en;
const hi = (await cargar('i18n/textos/hi/index.ts')).ns.hi;

const aplanar = (o, pre = '') => Object.entries(o).flatMap(([k, v]) =>
  typeof v === 'object' ? aplanar(v, pre + k + '.') : [[pre + k, v]]);
const HI = aplanar(hi);
const ES = Object.fromEntries(aplanar(es));
const EN = Object.fromEntries(aplanar(en));

/* Un carácter por su número: para lo invisible o lo que NFC deshace. */
const cp = (...n) => String.fromCodePoint(...n);
const clase = (...rangos) => new RegExp('[' + rangos.map((r) => (Array.isArray(r) ? cp(r[0]) + '-' + cp(r[1]) : cp(r))).join('') + ']', 'u');

const MARCAS = /Weë (?:AI|Studio|Design|Photo|Writer|Music|Beauty|Chef|Home|Business|Travel|Brain|Credits|Inspira)|WeeTalk|Weëls?|Wäll|ËContact|ẄContact|Credits|Weë/gu;
const sinLoAjeno = (v) => String(v)
  .replace(/\{\{[\w.]+\}\}/g, ' ')
  .replace(/\\[nrt]/g, ' ')
  .replace(MARCAS, ' ');
/* Fronteras de palabra que saben de devanagari: una matra o una nukta (`\p{M}`) siguen siendo palabra. */
const palabra = (cuerpo, banderas = 'u') => new RegExp(`(?<![\\p{L}\\p{M}\\p{N}])(?:${cuerpo})(?![\\p{L}\\p{M}\\p{N}])`, banderas);
const DEVANAGARI = /[ऀ-ॿ]/;
const muestra = (lista, n = 5) => lista.slice(0, n).map(([k, v]) => `${k}: «${String(v).slice(0, 36)}»`).join(' | ');

console.log('\n── A · `hi-IN` de punta a punta, sin lógica para el hindi ──');
{
  const cat = idiomas.idiomaDelCatalogo('hi');
  check('1) el catálogo lo ofrece: listo, «हिन्दी», de izquierda a derecha y sin variantes',
    cat?.listo === true && cat.nombreNativo === 'हिन्दी' && cat.direccion === 'ltr' && !cat.variantes
    && idiomas.filasDeIdioma().filter((f) => f.idioma === 'hi').length === 1,
    JSON.stringify(cat));
  check('1b) «हिन्दी» es el nombre que da CLDR para el selector', new Intl.DisplayNames(['hi'], { type: 'language' }).of('hi') === cat?.nombreNativo);
  check('2) y su locale principal, `hi-IN`, está entre los contemplados', idiomas.LOCALES_CONTEMPLADOS.includes('hi-IN'));
  check('3) el registro lo sirve con su propio diccionario, no por un alias',
    registro.DICCIONARIOS.hi === hi && registro.idiomasConDiccionario().includes('hi'));

  const disponibles = registro.idiomasConDiccionario();
  const elegir = (elegido, aparato) => resolver.elegirIdioma(elegido, aparato, disponibles);
  const delAparato = elegir(null, ['hi-IN']);
  check('4) un aparato en `hi-IN` recibe hindi, con sus formatos',
    delAparato.idioma === 'hi' && delAparato.locale === 'hi-IN' && delAparato.origen === 'aparato', JSON.stringify(delAparato));
  check('5) también si solo dice `hi`, si el hindi va primero en su lista, o en hindi latino (`hi-Latn`, § 1 de la guía)',
    elegir(null, ['hi']).idioma === 'hi' && elegir(null, ['hi-IN', 'en-US']).idioma === 'hi' && elegir(null, ['hi-Latn']).idioma === 'hi');
  check('6) la cadena de respaldo: `hi-IN` → `hi` → inglés',
    resolver.cadenaDeRespaldo('hi-IN').join('>') === 'hi-IN>hi>en', resolver.cadenaDeRespaldo('hi-IN').join('>'));
  check('7) lo elegido a mano gana al aparato, en las dos direcciones',
    elegir('es', ['hi-IN']).idioma === 'es' && elegir('hi', ['es-PE', 'en-US']).idioma === 'hi'
    && elegir('hi', ['es-PE']).origen === 'elegido');
  check('8) la lengua del texto es `hi`: la página se anuncia como `<html lang="hi">`',
    resolver.etiquetaDelTexto('hi', 'hi-IN') === 'hi' && resolver.etiquetaDelTexto('en', 'hi-IN') === 'en');

  /* Los formatos los escribe `Intl`: se comprueba la FORMA. */
  const dia = Date.UTC(2026, 8, 30, 12);
  const fecha = formato.formatearFecha(dia, 'hi-IN');
  const numero = formato.formatearNumero(1234567.89, 'hi-IN');
  const rupias = formato.formatearMoneda(1500, 'hi-IN', 'INR');
  const porcentaje = formato.formatearPorcentaje(0.6, 'hi-IN');
  const hace = formato.formatearTiempoRelativo(dia - 3 * 24 * 3600 * 1000, 'hi-IN', dia);
  const lista = formato.formatearLista(['A', 'B', 'C'], 'hi-IN');
  check('9) la fecha hindi: «30 सितंबर 2026»', /30 सितंबर 2026/.test(fecha), fecha);
  check('10) los números con la agrupación india (lakh) y cifras latinas: «12,34,567.89»', numero === '12,34,567.89', numero);
  check('11) la rupia delante, sin espacio: «₹1,500.00»', rupias === '₹1,500.00', rupias);
  check('12) el porcentaje pegado a la cifra: «60%»', porcentaje === '60%', porcentaje);
  check('13) «hace 3 días» lo escribe Intl, en hindi', /3 दिन पहले/.test(hace), hace);
  check('14) las listas se unen con «और» (la coma de CLDR incluida)', /^A, B,? और C$/.test(lista), lista);
  check('15) la distancia en el sistema métrico', formato.sistemaDeMedida('hi-IN') === 'metrico', formato.formatearDistancia(5000, 'hi-IN'));
  check('16) la fecha de nacimiento se pide día · mes · año', formato.ordenDeLaFecha('hi-IN').join() === 'day,month,year',
    formato.ordenDeLaFecha('hi-IN').join());
  check('16b) Intl usa cifras latinas para `hi-IN` (ninguna ०–९)', !/[०-९]/.test(numero + fecha + rupias + hace), `${numero} · ${fecha}`);
}

console.log('\n── B · Entero: sin respaldo, sin huecos, sin nada sin traducir ──');
{
  const solo = traducir.crearTraductor('hi-IN', { hi }, { modoDesarrollo: false });
  const conRespaldo = traducir.crearTraductor('hi-IN', { hi, es, en }, { modoDesarrollo: false });
  const valores = { contador: 2, nombre: 'आरव', titulo: 'T', lista: 'L', cantidad: 3, saldo: 10 };
  const distintas = Object.keys(ES).filter((k) => !/_(one|other)$/.test(k) || k.endsWith('_other'))
    .map((k) => k.replace(/_other$/, ''))
    .filter((k) => solo(k, valores) !== conRespaldo(k, valores));
  check('17) sin español ni inglés detrás, el hindi dice exactamente lo mismo',
    distintas.length === 0, distintas.slice(0, 5).join(' ') || `${Object.keys(ES).length} claves`);
  const vacias = HI.filter(([, v]) => typeof v !== 'string' || v.trim() === '');
  check('18) ninguna cadena vacía', vacias.length === 0, vacias.slice(0, 5).map(([k]) => k).join(' ') || 'ninguna');
  const ESPANOL = palabra('los|las|con|una|que|por|más|desde|cuando|puedes|aquí|está|están|tus|mis|nuestro|usted|para|del|el|la', 'iu');
  const conEspanol = HI.filter(([, v]) => ESPANOL.test(sinLoAjeno(v)));
  check('19) ninguna palabra española colada en una frase hindi', conEspanol.length === 0, muestra(conEspanol) || 'limpio');
  const escritoEnDevanagari = HI.filter(([, v]) => DEVANAGARI.test(v)).length;
  check('20) el diccionario está escrito en devanagari', escritoEnDevanagari > HI.length * 0.85, `${escritoEnDevanagari} de ${HI.length} cadenas`);

  /* Lo que se escribe igual en hindi que en español o en inglés, con su porqué. */
  const IGUALES = new Map([
    ['filmmaker.presetShorts', '«YouTube Shorts» es el nombre del producto de la plataforma, en latino como las marcas; los Shorts ya son vídeos'],
    ['business.formatTikTok', 'el nombre de la red'],
    ['business.shareProfile', '«Business Profile» es nombre de producto (decisión del usuario, 2026-09-16)'],
    ['business.businessPlan', 'nombre de función de Weë Business (decisión del usuario, 2026-09-16)'],
    ['business.businessCoach', 'nombre de función de Weë Business (decisión del usuario, 2026-09-16)'],
    ['business.pricing', 'nombre de función de Weë Business (decisión del usuario, 2026-09-16)'],
    ['business.brandKit', 'nombre de función de Weë Business (decisión del usuario, 2026-09-16)'],
    ['business.customerInsights', 'nombre de función de Weë Business (decisión del usuario, 2026-09-16)'],
    ['business.businessIdeas', 'nombre de función de Weë Business (decisión del usuario, 2026-09-16)'],
    ['catalogo.chefEj4Title', '«Lomo saltado» es el nombre de un plato: no se traduce'],
    ['help.footer', 'la marca, «World Encode Entity» y la versión'],
    ['settings.engineAdmin', '«Weë AI Engine» es el nombre del producto (el WEË AI ENGINE)'],
  ]);
  const copiadas = HI.filter(([k, v]) => !IGUALES.has(k) && /\p{L}{3,}/u.test(sinLoAjeno(v)) && (ES[k] === v || EN[k] === v));
  check('21) ninguna cadena copiada tal cual del español o del inglés, salvo las que se escriben igual con su porqué',
    copiadas.length === 0, muestra(copiadas, 6) || `${IGUALES.size} iguales a propósito`);
}

console.log('\n── C · Número: el CERO es `one` ──');
{
  const r = new Intl.PluralRules('hi');
  check('22) `Intl` declara `one` y `other` para el hindi, y el 0 es `one` como el 1',
    r.resolvedOptions().pluralCategories.join(',') === 'one,other' && r.select(0) === 'one' && r.select(1) === 'one' && r.select(2) === 'other',
    r.resolvedOptions().pluralCategories.join(','));
  const plano = Object.fromEntries(HI);
  const inventadas = Object.keys(plano).filter((k) => /_(zero|two|few|many)$/.test(k));
  check('23) y no hay formas de plural inventadas', inventadas.length === 0, inventadas.join(' ') || 'ninguna');
  const solo = traducir.crearTraductor('hi-IN', { hi }, { modoDesarrollo: false });
  const pares = Object.keys(plano).filter((k) => k.endsWith('_one') && k.replace(/_one$/, '_other') in plano).map((k) => k.replace(/_one$/, ''));
  const con = (n) => ({ contador: n, cantidad: n, titulo: 'T', lista: 'L', nombre: 'N' });
  const malElegidas = pares.filter((k) =>
    solo(k, con(0)) !== solo(`${k}_one`, con(0)) || solo(k, con(1)) !== solo(`${k}_one`, con(1)) || solo(k, con(3)) !== solo(`${k}_other`, con(3)));
  check('24) con 0 y con 1 sale la forma `_one`, con 3 la `_other`', malElegidas.length === 0 && pares.length > 20,
    malElegidas.slice(0, 3).join(' ') || `${pares.length} pares`);
  /* Por eso ningún `_one` escribe la cifra a mano: con cero diría «1 टिप्पणी» o «एक टिप्पणी». */
  const unoAMano = Object.entries(plano).filter(([k, v]) => k.endsWith('_one') && (
    (/\{\{contador\}\}/.test(plano[k.replace(/_one$/, '_other')] || '') && !/\{\{contador\}\}/.test(v))
    || /(?<![\d{])1(?![\d}])|(?<![\p{L}\p{M}])एक(?![\p{L}\p{M}])/u.test(v.replace(/\{\{\w+\}\}/g, ''))));
  check('25) ninguna forma `_one` escribe «1» o «एक» a mano: lleva `{{contador}}` (vale para el 0)', unoAMano.length === 0,
    muestra(unoAMano) || 'todas con la cifra');
  const conCifra = pares.filter((k) => /\{\{contador\}\}/.test(plano[`${k}_other`]));
  const conCero = conCifra.map((k) => [k, solo(k, con(0))]).filter(([, v]) => !/(?<!\d)0(?!\d)/.test(v) || /(?<!\d)1(?!\d)/.test(v));
  check('25b) control: con 0, cada contador dice «0» y ninguno dice «1»', conCifra.length > 10 && conCero.length === 0,
    muestra(conCero, 3) || `${conCifra.length} contadores`);
}

console.log('\n── D · Los huecos, intactos ──');
{
  const huecos = (v) => [...new Set([...String(v).matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]))].sort().join(',');
  const mal = HI.filter(([k, v]) => {
    const e = ES[k];
    const otra = k.endsWith('_one') ? ES[k.replace(/_one$/, '_other')] : undefined;
    return e !== undefined && huecos(e) !== huecos(v) && (otra === undefined || huecos(otra) !== huecos(v));
  });
  check('26) los mismos huecos que el español, con los mismos nombres', mal.length === 0,
    mal.slice(0, 4).map(([k, v]) => `${k}: es[${huecos(ES[k])}] hi[${huecos(v)}]`).join(' | ') || 'idénticos');
  const rotos = HI.filter(([, v]) => /\{\{(?![\w.]+\}\})|(?<!\{\{[\w.]+)\}\}|\{[\w.]+\}(?!\})/.test(v.replace(/\{\{[\w.]+\}\}/g, '')));
  check('27) ninguna llave suelta ni un hueco a medio escribir', rotos.length === 0, rotos.slice(0, 4).map(([k]) => k).join(' ') || 'limpio');
  const bordes = HI.filter(([k, v]) => typeof ES[k] === 'string' && (/^\s/.test(ES[k]) !== /^\s/.test(v) || /\s$/.test(ES[k]) !== /\s$/.test(v)));
  check('28) los espacios del borde, donde los tiene el español (esas piezas se pegan en pantalla)', bordes.length === 0,
    muestra(bordes, 4) || 'iguales');
  /*
   * Las posposiciones hindi son palabras: nunca pegadas a un hueco («{{nombre}}ने»).
   * La única excepción es la del español: un hueco que el español TAMBIÉN pega a
   * la palabra, por el mismo lado, porque lo que lo rellena ya trae su espacio
   * («versión{{precio}}», con `precio` = « · ≈ 5 Credits»).
   */
  const pegadosDe = (v, letra) => [...String(v).matchAll(new RegExp(`(${letra})?\\{\\{(\\w+)\\}\\}(${letra})?`, 'gu'))]
    .flatMap((m) => [m[1] ? `${m[2]}<` : null, m[3] ? `${m[2]}>` : null]).filter(Boolean);
  const pegados = HI.filter(([k, v]) => {
    const enEspanol = new Set(pegadosDe(ES[k] ?? ES[k.replace(/_one$/, '_other')] ?? '', '\\p{L}'));
    return pegadosDe(v, '[\\u0900-\\u097F]').some((p) => !enEspanol.has(p));
  });
  check('29) nada pegado a un {{hueco}}: la posposición va separada', pegados.length === 0, muestra(pegados) || 'ninguna');
  const porcentajeSeparado = HI.filter(([, v]) => /\{\{\w+\}\} %|\d %/.test(v));
  check('30) el porcentaje va pegado a la cifra: «40%»', porcentajeSeparado.length === 0, muestra(porcentajeSeparado, 4) || 'bien');
}

console.log('\n── E · Devanagari escrito como devanagari ──');
{
  const precompuestas = clase([0x958, 0x95f]);
  const noNfc = HI.filter(([, v]) => v !== v.normalize('NFC') || precompuestas.test(v));
  check('31) todo en NFC: la nukta es letra + U+093C, nunca una letra precompuesta', noNfc.length === 0, noNfc.slice(0, 4).map(([k]) => k).join(' ') || 'todo');
  const cifrasDevanagari = HI.filter(([, v]) => clase([0x966, 0x96f]).test(v));
  check('32) cifras latinas, nunca ०–९', cifrasDevanagari.length === 0, muestra(cifrasDevanagari, 4) || 'latinas');
  const conDanda = HI.filter(([k, v]) => clase(0x964, 0x965).test(v) || (/\|/.test(v) && !/\|/.test(ES[k] || '')));
  check('33) la frase acaba en «.»: ni «।» ni «॥» ni una barra en su lugar (guía § 7)', conDanda.length === 0, muestra(conDanda, 4) || 'punto');
  /* El ZWJ solo vale DENTRO de un emoji compuesto («👨‍🍳» son tres caracteres): el emoji se copia tal cual del español. */
  const PICTO = '\\p{Extended_Pictographic}(?:\\p{Emoji_Modifier}|' + cp(0xfe0f) + ')?';
  const EMOJI_COMPUESTO = new RegExp(`${PICTO}(?:${cp(0x200d)}${PICTO})*`, 'gu');
  const invisibles = HI.filter(([, v]) => clase(0x200c, 0x200d).test(v.replace(EMOJI_COMPUESTO, '')));
  check('34) ni ZWJ ni ZWNJ en el texto (dentro de un emoji compuesto sí: es el emoji)', invisibles.length === 0,
    invisibles.slice(0, 4).map(([k]) => k).join(' ') || 'ninguno');
  const EMOJIS = new RegExp(`${PICTO}(?:${cp(0x200d)}${PICTO})*|\\p{Regional_Indicator}`, 'gu');
  const emojisDe = (s) => (String(s).match(EMOJIS) || []).join(' ');
  const emojisCambiados = HI.filter(([k, v]) => typeof ES[k] === 'string' && emojisDe(ES[k]) !== emojisDe(v));
  check('34b) los mismos emojis que el español, byte a byte', emojisCambiados.length === 0,
    emojisCambiados.slice(0, 4).map(([k, v]) => `${k}: es «${emojisDe(ES[k])}» hi «${emojisDe(v)}»`).join(' | ') || 'iguales');
  const matraRota = new RegExp(cp(0x93e) + '[' + cp(0x947) + cp(0x948) + ']', 'u');
  const malCodificadas = HI.filter(([, v]) => matraRota.test(v));
  check('35) ो y ौ bien codificadas, no ा + े / ा + ै', malCodificadas.length === 0, malCodificadas.slice(0, 4).map(([k]) => k).join(' ') || 'bien');

  const NUKTA = cp(0x93c);
  const SIN_NUKTA = palabra('फाइल\\p{M}*\\p{L}*|फोटो|प्रोफाइल|डिजाइन|जरूर\\p{M}*\\p{L}*|ज्यादा|फीचर|फिल्टर|फॉलो|फॉलोअर|ड्राफ्ट|फॉर्म|फॉन्ट|फोन|फीड|जूम|रिफ्रेश|ऑफलाइन|बिजनेस|मुफ्त|आवाज|मंजिल|दस्तावेज|इंतजार|हजार|अंग्रेजी|रिफंड|ब्राउजर|यूजर|यूजरनेम');
  const sinNukta = HI.filter(([, v]) => SIN_NUKTA.test(v));
  check('36) फ़ और ज़ con su nukta en los préstamos (फ़ोटो, ज़रूरी, मुफ़्त)', sinNukta.length === 0,
    sinNukta.slice(0, 5).map(([k, v]) => `${k}: «${v.match(SIN_NUKTA)[0]}»`).join(' | ') || 'con nukta');
  const nuktaDeMas = HI.filter(([, v]) => new RegExp('[कखग]' + NUKTA + '|य' + NUKTA + '|[' + cp(0x929) + cp(0x931) + cp(0x934) + ']|फ' + NUKTA + 'िर', 'u').test(v));
  check('37) y ninguna nukta donde no va: ni en क ख ग, ni य़ ऩ ऱ ऴ, ni «फ़िर»', nuktaDeMas.length === 0, nuktaDeMas.slice(0, 4).map(([k]) => k).join(' ') || 'bien');
  const SIN_DDA = palabra('पढें|पढना|जोडें|जोडना|बढाएं|बढाएँ|छोडें|छोडना|पडेगा|पडेगी|बडा|बडी|बडे|थोडा|थोडी|थोडे|घडी|जुडें|जुडे|जुडी|गडबडी|पडा|पडी|पडे');
  const sinDda = HI.filter(([, v]) => SIN_DDA.test(v));
  check('38) ड़ y ढ़ con su punto: son letras del hindi (पढ़ें, जोड़ें, बड़ा)', sinDda.length === 0,
    sinDda.slice(0, 5).map(([k, v]) => `${k}: «${v.match(SIN_DDA)[0]}»`).join(' | ') || 'bien');
  check('38b) control: las dos reglas reconocen el error y dejan pasar lo bien escrito',
    ['फोटो बदलें', 'यह जरूरी है'].every((m) => SIN_NUKTA.test(m)) && ['फ़ोटो बदलें'.normalize('NFC'), 'फिर से कोशिश करें', 'जानकारी'].every((b) => !SIN_NUKTA.test(b))
    && SIN_DDA.test('जोडें') && !SIN_DDA.test('जोड़ें'.normalize('NFC')));

  /* Chandrabindu (norma del CHD): vocal nasal sin matra por arriba; anusvara si la matra ocupa la parte de arriba. */
  const FIN = '(?![\\p{L}\\p{M}\\p{N}])';
  const ANUSVARA_POR_CHANDRA = new RegExp(`${cp(0x93e, 0x902)}${FIN}|${cp(0x90f, 0x902)}${FIN}|${cp(0x942, 0x902)}${FIN}`, 'u');
  const LISTA = palabra('पांच|जांच|कहां|यहां|वहां|जहां|हां');
  /* Las matras que ocupan la parte de arriba: ि ी ॅ े ै ॉ ो ौ. Tras ु ू (abajo) la chandrabindu sí va: «पहुँचें». */
  const CHANDRA_BAJO_MATRA_ALTA = new RegExp(clase(0x93f, 0x940, 0x945, 0x947, 0x948, 0x949, 0x94b, 0x94c).source + cp(0x901), 'u');
  const chandraMal = HI.filter(([, v]) => ANUSVARA_POR_CHANDRA.test(v) || LISTA.test(v) || CHANDRA_BAJO_MATRA_ALTA.test(v));
  check('39) chandrabindu donde la norma lo pide (हाँ, जाएँ, सूचनाएँ, टिप्पणियाँ) y anusvara bajo una matra de arriba (में, करें)',
    chandraMal.length === 0, muestra(chandraMal) || 'según la norma');
  check('39b) control: la regla reconoce «हां», «जाएं» y «सूचनाएं», y deja pasar «हाँ», «में», «करें», «संपर्क»',
    ['हां', 'जाएं', 'सूचनाएं', 'टिप्पणियां'].every((m) => ANUSVARA_POR_CHANDRA.test(m) || LISTA.test(m))
    && ['हाँ', 'में', 'करें', 'नहीं', 'हैं', 'संपर्क', 'हिंदी', 'बनाएँ', 'पहुँचें'].every((b) => !ANUSVARA_POR_CHANDRA.test(b) && !LISTA.test(b) && !CHANDRA_BAJO_MATRA_ALTA.test(b))
    && CHANDRA_BAJO_MATRA_ALTA.test('म' + cp(0x947, 0x901)));

  /* «आप», siempre: ni «तुम» ni «तू», ni el imperativo en -ओ. («दो» y «लो» no entran: también son «dos» y «toma».) */
  const TUTEO = palabra('तुम|तुम्हारा|तुम्हारी|तुम्हारे|तुम्हें|तू|तेरा|तेरी|तेरे|तुझे|करो|जाओ|देखो|बनाओ|चुनो|लिखो|भेजो|आओ|रखो|बताओ|सुनो|पढ़ो|खोलो|छोड़ो|जोड़ो');
  const tuteo = HI.filter(([, v]) => TUTEO.test(v.normalize('NFC')));
  check('40) se trata de «आप»: ningún «तुम», «तू» ni imperativo en -ओ', tuteo.length === 0,
    tuteo.slice(0, 4).map(([k, v]) => `${k}: «${v.match(TUTEO)?.[0]}»`).join(' | ') || 'आप');
  const barras = HI.filter(([, v]) => /(?:सकता|गया|रहा|हुआ|करता|चुका|वाला)\/(?:सकती|गई|रही|हुई|करती|चुकी|वाली)/.test(v));
  check('41) sin barras de género («सकता/सकती»): las frases se escriben sin género', barras.length === 0, muestra(barras, 4) || 'ninguna');
  const tresPuntos = HI.filter(([, v]) => /\.\.\./.test(v));
  check('42) los puntos suspensivos son «…», un carácter', tresPuntos.length === 0, tresPuntos.slice(0, 4).map(([k]) => k).join(' ') || 'bien');
  const espacioAntes = HI.filter(([, v]) => / [.,?!:]/.test(v.replace(/\{\{\w+\}\}/g, 'X')));
  check('42b) ningún espacio antes de «.» «,» «?» «!» «:»', espacioAntes.length === 0, muestra(espacioAntes, 4) || 'bien');
}

console.log('\n── F · La búsqueda iguala lo que el teclado cambia ──');
{
  const conPre = cp(0x95e, 0x94b, 0x91f, 0x94b);
  const conNukta = cp(0x92b, 0x93c, 0x94b, 0x91f, 0x94b);
  const sinNukta = cp(0x92b, 0x94b, 0x91f, 0x94b);
  check('43) «फ़ोटो» se encuentra escrito sin nukta o con la letra precompuesta',
    caja.paraBuscar(conPre) === caja.paraBuscar(sinNukta) && caja.paraBuscar(conNukta) === caja.paraBuscar(sinNukta));
  check('44) «हाँ» y «हां» son la misma búsqueda, y un ZWJ no cuenta',
    caja.paraBuscar(cp(0x939, 0x93e, 0x901)) === caja.paraBuscar(cp(0x939, 0x93e, 0x902))
    && caja.paraBuscar(cp(0x92c, 0x94d, 0x200d, 0x927)) === caja.paraBuscar(cp(0x92c, 0x94d, 0x927)));
  check('45) y el latín no cambia: «Åre» sigue siendo «åre» y las íes turcas, una',
    caja.paraBuscar(cp(0xc5) + 're') === cp(0xe5) + 're' && caja.paraBuscar(cp(0x130) + 'stanbul') === 'istanbul');
  const fuente = leer('i18n/caja.ts');
  const inicio = fuente.indexOf('export const paraBuscar');
  const codigo = fuente.slice(inicio, fuente.indexOf('\n\n', inicio));
  check('45b) `paraBuscar` escribe sus caracteres especiales con escapes \\u (ASCII): nada que NFC pueda deshacer',
    codigo.length > 50 && [...codigo].every((c) => c.charCodeAt(0) < 128) && fuente === fuente.normalize('NFC'));
  /*
   * El espaciado entre letras parte la línea superior del devanagari: los rótulos
   * que lo llevan lo quitan para las escrituras cuyas letras se unen, y solo para ellas.
   */
  const devanagari = cp(0x92a, 0x94d, 0x930, 0x94b, 0x92b, 0x93c, 0x93e, 0x907, 0x932);
  check('45c) sin espaciado entre letras para el devanagari y el árabe; el latín, el cirílico y el japonés, igual',
    caja.sinEspaciadoSiSeUne(devanagari)?.letterSpacing === 0 && caja.sinEspaciadoSiSeUne(cp(0x645, 0x644, 0x641))?.letterSpacing === 0
    && ['PERFIL', 'ПРОФИЛЬ', 'プロフィール', '', null].every((t) => caja.sinEspaciadoSiSeUne(t) === undefined));
  const conEspaciado = ['components/TextoEnMayusculas.tsx', 'components/DrawerMenu.tsx', 'components/Sidebar.tsx',
    'components/HowIMadeIt.tsx', 'screens/CreateScreen.tsx'].filter((p) => !/sinEspaciadoSiSeUne\(/.test(leer(p)));
  check('45d) los rótulos con espaciado (mayúsculas, grupos del menú y de la barra, «Cómo lo hice», «Publicar en») lo quitan en devanagari',
    conEspaciado.length === 0, conEspaciado.join(' ') || 'los cinco');
}

console.log('\n── G · El dinero y las marcas ──');
{
  const CREDITO = /क्रेडिट(?! कार्ड)/u;
  const moneda = HI.filter(([, v]) => CREDITO.test(v));
  check('46) «Credits» nunca se translitera («क्रेडिट», «क्रेडिट्स»)', moneda.length === 0, muestra(moneda, 4) || 'limpio');
  const perdidos = HI.filter(([k, v]) => /Credits/.test(ES[k] || '') && !/Credits/.test(v));
  check('47) cada «Credits» del español sigue en su clave hindi', perdidos.length === 0, perdidos.slice(0, 4).map(([k]) => k).join(' ') || 'todos');

  const LISTA = ['Weë', 'Weë AI', 'Weë Studio', 'Weë Chef', 'Weë Design', 'Weë Travel', 'Weë Business', 'Weë Music', 'Weë Inspira',
    'Weëls', 'Wäll', 'Weë Credits', 'ËContact', 'ẄContact', 'Credits', 'WeeTalk', 'Weë Brain', 'Weë Photo', 'Weë Writer', 'Weë Beauty', 'Weë Home'];
  const escapar = (m) => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const perdidas = [];
  for (const [k, v] of HI) {
    const e = ES[k];
    if (typeof e !== 'string') continue;
    for (const m of LISTA) {
      const re = new RegExp(`(?<![\\p{L}])${escapar(m)}(?![\\p{L}])`, 'u');
      if (re.test(e) && !re.test(v)) perdidas.push(`${k}: «${m}»`);
    }
  }
  check('48) cada marca del español sigue, intacta y en latino, en su clave hindi', perdidas.length === 0, perdidas.slice(0, 6).join(' | ') || 'todas');
  const PEGADA = /(?:Weë|WeeTalk|Wäll|ËContact|ẄContact|Credits)[ऀ-ॿ]|[ऀ-ॿ](?:Weë|WeeTalk|Wäll|ËContact|ẄContact|Credits)/u;
  const pegadas = HI.filter(([, v]) => PEGADA.test(v));
  check('49) ninguna marca pegada a una letra devanagari: la posposición va separada («Weë पर»)', pegadas.length === 0, muestra(pegadas, 4) || 'limpio');
  const TRANSLITERADA = /(?<![\p{L}\p{M}])(?:वी|वीई|वीटॉक|वी टॉक|वील|वील्स|ईकॉन्टैक्ट|ईकॉन्टेक्ट)(?![\p{L}\p{M}])/u;
  const TRADUCIDA = /Weë (?:संगीत|म्यूज़िक|यात्रा|ट्रैवल|शेफ़|रसोइया|व्यापार|व्यवसाय|बिज़नेस|फ़ोटो|लेखक|राइटर|सौंदर्य|ब्यूटी|घर|होम|दिमाग|ब्रेन|स्टूडियो|डिज़ाइन)(?![\p{L}\p{M}])/u;
  const deformadas = HI.filter(([, v]) => TRANSLITERADA.test(v.normalize('NFC')) || TRADUCIDA.test(v.normalize('NFC')));
  check('50) ninguna marca transliterada («वीटॉक», «वील्स») ni experiencia traducida («Weë संगीत»)', deformadas.length === 0,
    muestra(deformadas, 4) || 'limpio');
}

console.log('\n── H · Queda escrito ──');
{
  const indice = leer('i18n/textos/hi/index.ts');
  check('51) el índice hindi dice qué no entra nunca y lo propio del hindi',
    /no entra nunca en estos archivos/i.test(indice) && /nukta/i.test(indice) && /one/.test(indice) && /आप/.test(indice));
  const guia = fs.existsSync(path.resolve(raiz, 'docs/I18N-HINDI.md')) ? leer('docs/I18N-HINDI.md') : '';
  check('52) la guía de estilo y el glosario existen y se leen', guia.length > 2000 && /Glosario/i.test(guia) && /Credits/.test(guia) && guia === guia.normalize('NFC'));
  const pantallaDeError = leer('components/ErrorBoundary.tsx');
  const filaHi = (pantallaDeError.match(/^ {2}hi: \{ titulo: '((?:[^'\\]|\\.)+)', mensaje: '((?:[^'\\]|\\.)+)', boton: '((?:[^'\\]|\\.)+)' \},$/m) || []).slice(1);
  check('53) la pantalla de error también habla hindi', filaHi.length === 3 && filaHi.every((f) => DEVANAGARI.test(f) && f === f.normalize('NFC')),
    filaHi.join(' · ') || 'sin fila');
}

console.log('\n── I · Del aparato a la pantalla: selector, persistencia, cuenta, web, accesibilidad ──');
{
  const disponibles = registro.idiomasConDiccionario();
  const fila = idiomas.filasDeIdioma().find((f) => f.idioma === 'hi');
  check('54) el selector ofrece «हिन्दी» como una fila propia', fila?.clave === 'hi' && fila.nombreNativo === 'हिन्दी', JSON.stringify(fila));
  const pantallas = ['screens/IdiomaScreen.tsx', 'screens/OnboardingScreen.tsx', 'screens/SettingsScreen.tsx'].map((p) => [p, leer(p)]);
  const conLista = pantallas.filter(([, s]) => !/filasDeIdioma\(\)|disponibles\.find/.test(s) || /'hi'|हिन्दी/.test(s)).map(([p]) => p);
  check('55) Idioma, la bienvenida y Configuración leen el catálogo, sin nada escrito para el hindi', conLista.length === 0, conLista.join(' ') || 'las tres');
  const guardados = ['hi', 'hi-IN'].map((g) => resolver.elegirIdioma(g, ['en-US'], disponibles));
  check('56) persistencia: lo guardado al elegir hindi vuelve como hindi elegido',
    guardados.every((r) => r.idioma === 'hi' && r.origen === 'elegido'), JSON.stringify(guardados));
  const lengua = require(path.resolve(here, '../lib/core/language.js'));
  check('57) la cuenta guarda `hi-IN` y el servidor lo acepta tal cual',
    lengua.normalizarEtiqueta('hi-IN') === 'hi-IN' && lengua.idiomaDe('hi-IN') === 'hi'
    && lengua.contextoDeIdioma({ appLanguage: 'hi-IN' }).appLanguage === 'hi-IN');
  const aparato = (await cargar('i18n/aparato.ts')).ns;
  const antes = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { value: { languages: ['hi-IN', 'hi', 'en-US'], language: 'hi-IN' }, configurable: true, writable: true });
  const delNavegador = aparato.localesDelAparato();
  if (antes) Object.defineProperty(globalThis, 'navigator', antes); else delete globalThis.navigator;
  const enLaWeb = resolver.elegirIdioma(null, delNavegador, disponibles);
  check('58) web: un navegador en hindi abre Weë en hindi, con `hi-IN` para los formatos',
    delNavegador[0] === 'hi-IN' && enLaWeb.idioma === 'hi' && enLaWeb.locale === 'hi-IN', `${delNavegador.join(',')} → ${JSON.stringify(enLaWeb)}`);

  /* Accesibilidad: las etiquetas del lector existen en hindi y sin «बटन» detrás (el rol ya lo dice). */
  const fuentes = [];
  const andar = (d) => {
    for (const e of fs.readdirSync(path.resolve(raiz, d), { withFileTypes: true })) {
      const rel = `${d}/${e.name}`;
      if (e.isDirectory()) andar(rel); else if (/\.tsx$/.test(e.name)) fuentes.push(leer(rel));
    }
  };
  ['components', 'screens', 'navigation'].forEach(andar);
  const clavesAccesibles = new Set(fuentes.flatMap((s) => [...s.matchAll(/accessibilityLabel=\{t\('([a-zA-Z]+\.[A-Za-z0-9_]+)'/g)].map((m) => m[1])));
  const plano = Object.fromEntries(HI);
  const valorDe = (k) => plano[k] ?? plano[`${k}_other`];
  const malasAccesibles = [...clavesAccesibles].filter((k) => valorDe(k) === undefined || /बटन$/.test(valorDe(k)));
  check('59) accesibilidad: todas las etiquetas del lector existen en hindi y sin «बटन»',
    clavesAccesibles.size > 20 && malasAccesibles.length === 0,
    malasAccesibles.slice(0, 5).map((k) => `${k}: «${valorDe(k)}»`).join(' | ') || `${clavesAccesibles.size} etiquetas`);
}

console.log('\n── J · Traducciones defectuosas ──');
{
  const cuenta = (s, re) => (String(s).match(re) || []).length;
  const marcado = HI.filter(([k, v]) => typeof ES[k] === 'string'
    && (cuenta(ES[k], /<\/?[a-zA-Z][^>]*>/g) !== cuenta(v, /<\/?[a-zA-Z][^>]*>/g) || cuenta(ES[k], /\*\*|__|\]\(/g) !== cuenta(v, /\*\*|__|\]\(/g)));
  check('60) ni HTML ni markdown roto', marcado.length === 0, marcado.slice(0, 4).map(([k]) => k).join(' ') || 'intacto');
  const saltos = HI.filter(([k, v]) => {
    const ref = k.endsWith('_one') && ES[k.replace(/_one$/, '_other')] !== undefined ? ES[k.replace(/_one$/, '_other')] : ES[k];
    return typeof ref === 'string' && cuenta(ref, /\n/g) !== cuenta(v, /\n/g);
  });
  check('61) los mismos saltos de línea que el español', saltos.length === 0, saltos.slice(0, 4).map(([k]) => k).join(' ') || 'iguales');

  /* La misma frase española se dice igual en toda la app, salvo cuando el contexto pide otra cosa. */
  const DISTINTAS_A_PROPOSITO = new Set([
    /* Weë Filmmaker, revisado por un segundo traductor (2026-10-01): la misma frase española, otro sentido. */
    /* «Historias» como formato de redes (स्टोरी, como business.formatStory), no los relatos de Writer (कहानियाँ). */
    'filmmaker.presetStories',
    /* «Subir»/«Bajar» reordenan la lista (ऊपर/नीचे ले जाएँ); en Studio son la grúa de la cámara (ऊपर उठना / नीचे आना). */
    'filmmaker.moveUp', 'filmmaker.moveDown',
    /* «Corto», «Medio», «Largo» del pelo: el adjetivo concuerda con «बाल» (plural), no con la duración de un vídeo («छोटा»). */
    'aiAvatar.hairShort', 'aiAvatar.hairMedium', 'aiAvatar.hairLong',
    /* «Listo»: el estado de una creación terminada es «तैयार»; el botón que cierra un paso, «हो गया» (guía § 11.5). */
    'creaciones.statusReady',
    /* «Servicios»: el gasto de luz, agua e internet («बिल»), no la categoría de negocios de servicios («सेवाएँ»). */
    'business.expenseServices',
    /* «Media»: la dificultad media de Chef («थोड़ा मुश्किल»), no la pestaña de fotos y vídeos del perfil («मीडिया»). */
    'chef.valMedium',
    /* «Natural» y «Suave» en Weë Studio: el movimiento («नैचुरल», «स्मूद») y la luz («सॉफ़्ट लाइट») no son la luz natural ni el ritmo suave. */
    'studio.smNatural', 'studio.ltSoft', 'studio.smSmooth',
    /* «Seguir»: la cámara que sigue a alguien («पीछे-पीछे चलना»), no seguir a un perfil («फ़ॉलो करें»). */
    'studio.mvFollow',
  ]);
  const porFrase = new Map();
  for (const [k, v] of HI) {
    const e = ES[k];
    if (typeof e !== 'string' || /_one$/.test(k) || DISTINTAS_A_PROPOSITO.has(k)) continue;
    if (!porFrase.has(e)) porFrase.set(e, new Map());
    const m = porFrase.get(e);
    m.set(v, [...(m.get(v) || []), k]);
  }
  const inconsistentes = [...porFrase].filter(([, m]) => m.size > 1);
  check('62) la misma frase española se dice igual en toda la app, salvo excepciones con su porqué', inconsistentes.length === 0,
    inconsistentes.slice(0, 4).map(([e, m]) => `«${e.slice(0, 20)}» → ${[...m].map(([v, ks]) => `«${v.slice(0, 16)}» (${ks[0]})`).join(' / ')}`).join(' | ') || 'coherente');
  /* Los rótulos que se ven en toda la app dicen lo del glosario (§ 11). */
  const ROTULOS = [['Guardar', 'सेव करें'], ['Cancelar', 'रद्द करें'], ['Compartir', 'शेयर करें'], ['Buscar', 'खोजें'], ['Cerrar', 'बंद करें'],
    ['Continuar', 'जारी रखें'], ['Reintentar', 'फिर से कोशिश करें']];
  const rotulosMal = HI.filter(([k, v]) => ROTULOS.some(([e, t]) => ES[k] === e && v !== t));
  check('63) los rótulos comunes dicen siempre lo del glosario', rotulosMal.length === 0,
    rotulosMal.slice(0, 5).map(([k, v]) => `${k}: «${ES[k]}» → «${v}»`).join(' | ') || `${ROTULOS.length} rótulos`);
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
