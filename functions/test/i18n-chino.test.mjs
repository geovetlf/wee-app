/*
 * EL CHINO DE WEË: UN IDIOMA, DOS ESCRITURAS QUE NO SE MEZCLAN.
 *
 * `zh` es un solo idioma lógico con dos variantes —simplificado en
 * `textos/zh/` y tradicional en `textos/zh-TW/`—, y esta prueba existe porque
 * las tres cosas que pueden salir mal aquí no se ven leyendo un diff:
 *
 * 1 · QUE SE CUELE UN CARÁCTER DE LA OTRA ESCRITURA. Un 個 perdido en medio del
 *     simplificado no rompe nada, no falla ningún tipo, y a un lector chino le
 *     salta a la cara.
 *
 * 2 · QUE EL TRADICIONAL SEA UNA CONVERSIÓN AUTOMÁTICA. Pasar 视频 por una tabla
 *     de caracteres da 視頻, que se entiende en Taiwán pero NADIE dice: allí es
 *     影片. Una conversión mecánica produce texto correcto y ajeno a la vez, y
 *     es exactamente lo que el encargo prohíbe. Se comprueba término a término.
 *
 * 3 · QUE UN TELÉFONO TAIWANÉS RECIBA SIMPLIFICADO. Los aparatos no dicen
 *     `zh-TW`: dicen `zh-Hant-TW`. Si ese locale no tiene diccionario, la cadena
 *     de respaldo lo manda a `zh`, o sea a la escritura equivocada entera.
 *
 * Y una cuarta que comparte con el coreano: el chino NO TIENE PLURAL.
 * `Intl.PluralRules('zh')` declara una sola categoría, así que `_one` no se lee
 * nunca y tiene que decir lo mismo que su `_other`.
 */
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(raiz, p), 'utf8');
const TEXTOS = path.resolve(raiz, 'i18n/textos');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const RE = new RegExp("^  ([A-Za-z][A-Za-z0-9_]*):\\s*'((?:[^'\\\\]|\\\\.)*)',$", 'gm');
const claves = (idioma, modulo) => {
  const p = path.join(TEXTOS, idioma, modulo);
  if (!fs.existsSync(p)) return null;
  const o = {};
  for (const m of fs.readFileSync(p, 'utf8').matchAll(RE)) o[m[1]] = m[2];
  return o;
};
const modulos = fs.readdirSync(path.join(TEXTOS, 'es')).filter((f) => f.endsWith('.ts') && f !== 'index.ts');
const todo = (idioma) => {
  const out = [];
  for (const m of modulos) {
    const o = claves(idioma, m);
    if (!o) continue;
    for (const [k, v] of Object.entries(o)) out.push([`${m.replace('.ts', '')}.${k}`, v]);
  }
  return out;
};
const ZH = todo('zh');
const TW = todo('zh-TW');

console.log('\n── A · Las dos variantes están completas ──');
{
  const base = todo('es');
  check('1) el simplificado tiene todas las claves del español', ZH.length === base.length,
    `${ZH.length} / ${base.length}`);
  /*
   * El tradicional TIENE que estar completo. El motor lo dejaría caer a `zh`
   * clave por clave sin avisar, y una pantalla con dos frases en simplificado
   * en medio del tradicional es justo lo que no puede pasar.
   */
  check('2) el tradicional también, sin apoyarse en el simplificado', TW.length === base.length,
    `${TW.length} / ${base.length}`);
  const faltan = new Set(ZH.map(([k]) => k));
  const sinTW = [...faltan].filter((k) => !TW.some(([t]) => t === k));
  check('3) y son exactamente las mismas claves', sinTW.length === 0, sinTW.slice(0, 5).join(' ') || 'iguales');
}

console.log('\n── B · El chino no distingue número ──');
{
  const r = new Intl.PluralRules('zh');
  check('4) `Intl` declara una sola categoría', r.resolvedOptions().pluralCategories.join(',') === 'other',
    r.resolvedOptions().pluralCategories.join(','));
  for (const [lang, datos] of [['zh', ZH], ['zh-TW', TW]]) {
    const mapa = Object.fromEntries(datos);
    const distintas = Object.keys(mapa).filter((k) => k.endsWith('_one'))
      .filter((k) => mapa[k.replace(/_one$/, '_other')] !== undefined
        && mapa[k] !== mapa[k.replace(/_one$/, '_other')]);
    check(`5) ${lang}: \`_one\` y \`_other\` dicen lo mismo`, distintas.length === 0,
      distintas.slice(0, 3).join(' ') || 'todas iguales');
    const inventadas = Object.keys(mapa).filter((k) => /_(few|many|zero|two)$/.test(k));
    check(`6) ${lang}: sin \`_few\` ni \`_many\` inventados`, inventadas.length === 0,
      inventadas.join(' ') || 'ninguno');
  }
}

/*
 * Pares de caracteres que de verdad se escriben distinto. NO es una lista de
 * todo el chino: los miles de caracteres que comparten las dos escrituras —我,
 * 你, 的, 现, 建…— no están aquí a propósito, porque prohibirlos sería una prueba
 * ingenua que solo produce ruido.
 */
const PARES = [
  ['们', '們'], ['个', '個'], ['这', '這'], ['会', '會'], ['时', '時'], ['国', '國'],
  ['电', '電'], ['见', '見'], ['说', '說'], ['车', '車'], ['门', '門'], ['长', '長'],
  ['马', '馬'], ['鸟', '鳥'], ['龙', '龍'], ['东', '東'], ['页', '頁'], ['风', '風'],
  ['飞', '飛'], ['义', '義'], ['汉', '漢'], ['语', '語'], ['书', '書'], ['学', '學'],
  ['实', '實'], ['发', '發'], ['对', '對'], ['开', '開'], ['关', '關'], ['问', '問'],
  ['间', '間'], ['无', '無'], ['边', '邊'], ['过', '過'], ['还', '還'], ['进', '進'],
  ['远', '遠'], ['连', '連'], ['运', '運'], ['达', '達'], ['选', '選'], ['图', '圖'],
  ['员', '員'], ['号', '號'], ['点', '點'], ['线', '線'], ['级', '級'], ['组', '組'],
  ['结', '結'], ['给', '給'], ['经', '經'], ['统', '統'], ['继', '繼'], ['续', '續'],
  ['网', '網'], ['设', '設'], ['备', '備'], ['数', '數'], ['据', '據'], ['处', '處'],
  ['应', '應'], ['该', '該'], ['单', '單'], ['双', '雙'], ['传', '傳'], ['输', '輸'],
  ['载', '載'], ['编', '編'], ['辑', '輯'], ['译', '譯'], ['试', '試'], ['认', '認'],
  ['证', '證'], ['权', '權'], ['录', '錄'], ['创', '創'], ['删', '刪'], ['类', '類'],
  ['别', '別'], ['标', '標'], ['题', '題'], ['显', '顯'], ['隐', '隱'], ['帮', '幫'],
  ['视', '視'], ['频', '頻'], ['声', '聲'], ['价', '價'], ['费', '費'], ['额', '額'],
  ['账', '帳'], ['码', '碼'], ['邮', '郵'], ['册', '冊'], ['户', '戶'], ['资', '資'],
  ['联', '聯'], ['动', '動'], ['态', '態'], ['评', '評'], ['论', '論'], ['赞', '讚'],
  ['举', '舉'], ['报', '報'], ['丝', '絲'], ['区', '區'], ['项', '項'], ['确', '確'],
  ['导', '導'], ['词', '詞'], ['详', '詳'], ['纪', '紀'], ['质', '質'], ['转', '轉'],
];
const SIMPL = new Set(PARES.map(([s]) => s));
const TRAD = new Set(PARES.map(([, t]) => t));

console.log('\n── C · Ninguna escritura se cuela en la otra ──');
{
  const enSimplificado = [];
  for (const [k, v] of ZH) for (const ch of v) if (TRAD.has(ch)) { enSimplificado.push(`${k}: «${ch}» en «${v.slice(0, 30)}»`); break; }
  check('7) el simplificado no lleva caracteres tradicionales', enSimplificado.length === 0,
    enSimplificado.slice(0, 5).join(' | ') || `${ZH.length} claves limpias`);

  const enTradicional = [];
  for (const [k, v] of TW) for (const ch of v) if (SIMPL.has(ch)) { enTradicional.push(`${k}: «${ch}» en «${v.slice(0, 30)}»`); break; }
  check('8) el tradicional no lleva caracteres simplificados', enTradicional.length === 0,
    enTradicional.slice(0, 5).join(' | ') || `${TW.length} claves limpias`);

  /* CONTROL: que la prueba sepa reconocer lo que busca. */
  check('9) control: reconoce un 個 dentro de simplificado y un 个 dentro de tradicional',
    TRAD.has('個') && SIMPL.has('个') && !TRAD.has('我') && !SIMPL.has('我'),
    'y no marca los caracteres que comparten las dos');
}

/*
 * LO QUE UNA TABLA DE CARACTERES NO SABE.
 *
 * [término en China, lo que daría una conversión mecánica, lo que se dice en
 * Taiwán]. Si el tradicional trae la columna del medio, es que alguien pasó el
 * simplificado por un conversor y lo dio por hecho.
 */
const REGIONAL = [
  ['软件', '軟件', '軟體'], ['视频', '視頻', '影片'], ['项目', '項目', '專案'],
  ['用户', '用戶', '使用者'], ['登录', '登錄', '登入'], ['设置', '設置', '設定'],
  ['网络', '網絡', '網路'], ['信息', '信息', '訊息'], ['屏幕', '屏幕', '螢幕'],
  ['数据', '數據', '資料'], ['默认', '默認', '預設'], ['质量', '質量', '品質'],
  ['搜索', '搜索', '搜尋'], ['点赞', '點贊', '按讚'], ['社区', '社區', '社群'],
];

console.log('\n── D · El tradicional no es una conversión del simplificado ──');
{
  const textoZH = ZH.map(([, v]) => v).join('\n');
  const textoTW = TW.map(([, v]) => v).join('\n');
  const convertidos = [], ausentes = [];
  let comprobados = 0;
  for (const [cn, ingenuo, tw] of REGIONAL) {
    if (!textoZH.includes(cn)) continue;   /* si el simplificado no lo usa, no aplica */
    comprobados++;
    if (textoTW.includes(ingenuo) && ingenuo !== tw) convertidos.push(`«${ingenuo}» (debería ser «${tw}»)`);
    if (!textoTW.includes(tw)) ausentes.push(`falta «${tw}» (${cn})`);
  }
  check('10) no aparece ningún término salido de convertir caracteres', convertidos.length === 0,
    convertidos.slice(0, 5).join(' | ') || `${comprobados} términos comprobados`);
  check('11) y sí aparece el término que se usa en Taiwán', ausentes.length === 0,
    ausentes.slice(0, 5).join(' | ') || `${comprobados} términos comprobados`);
}

console.log('\n── E · Puntuación y espaciado ──');
{
  /*
   * Puntuación occidental al final de una frase china. Se excluyen las cadenas
   * que son identificadores, rutas o cifras, donde el punto y la coma son parte
   * del dato y no del idioma.
   */
  const OCCIDENTAL = /[一-鿿][,.;?!](\s|$)/u;
  const malPunto = [];
  for (const [lang, datos] of [['zh', ZH], ['zh-TW', TW]]) {
    const malos = datos.filter(([, v]) => OCCIDENTAL.test(v)).map(([k, v]) => `${lang} ${k}: «${v.slice(0, 34)}»`);
    malPunto.push(...malos);
  }
  check('12) ninguna frase china acaba en puntuación occidental', malPunto.length === 0,
    malPunto.slice(0, 5).join(' | ') || 'limpio');

  /*
   * Un espacio entre hanzi y latín. Importa porque las marcas van en alfabeto
   * latino dentro de frases chinas: «打开Weë Studio» se lee pegado.
   * No se exige antes de un signo ni dentro de una interpolación.
   */
  const PEGADO = /[一-鿿][A-Za-z0-9]|[A-Za-z0-9][一-鿿]/u;
  const pegados = [];
  for (const [lang, datos] of [['zh', ZH], ['zh-TW', TW]]) {
    for (const [k, v] of datos) {
      /*
       * Fuera los huecos y fuera los escapes. Lo segundo no es un detalle: en el
       * código fuente un salto de línea son los DOS caracteres `\` y `n`, y esa
       * `n` es una letra latina pegada al hanzi que viene detrás. Sin quitarla,
       * esta comprobación acusa de mal espaciado a cadenas perfectas —y no solo
       * en chino: el español y el coreano caerían igual—.
       */
      /*
       * Los huecos NO se borran: se sustituye por texto latino los que de verdad
       * traen texto latino o cifras. Borrarlos todos era un agujero
       * —`{{pais}}的地点` quedaba en `的地点` y pasaba limpio, cuando en ejecución
       * se renderiza «Argentina的地点»—, pero sustituirlos TODOS es el error
       * contrario: `{{que}}` trae «品牌 Logo», que ya empieza por hanzi y no
       * necesita espacio delante.
       *
       * Así que se mira QUÉ transporta cada hueco. Los de abajo traen nombres de
       * personas, países, marcas o cifras: latino o dígitos, siempre. El resto
       * se rellena con otra cadena del propio diccionario, o sea con hanzi, y se
       * quitan sin más.
       */
      const LATINOS = /\{\{(pais|nombre|lista|titulo|saldo|credits|costo|coste|contador|cantidad|usd|total|restantes|usados|porcentaje|numero|fecha|dia|anio|duracion|segundos|red|proveedor|especialista|comunidad|proyecto|lugar|destino|maximo|minimo|tope|velocidad)\}\}/g;
      const limpio = v.replace(LATINOS, 'Xx').replace(/\{\{[\w.]+\}\}/g, '').replace(/\\[nrt]/g, ' ');
      if (PEGADO.test(limpio)) pegados.push(`${lang} ${k}: «${v.slice(0, 34)}»`);
    }
  }
  check('13) hay un espacio entre hanzi y latín o cifras', pegados.length === 0,
    pegados.length ? `${pegados.length} casos · ${pegados.slice(0, 4).join(' | ')}` : 'limpio');
}

console.log('\n── F · Nada de español ni inglés residual ──');
{
  /* Palabras españolas frecuentes que delatarían una clave sin traducir. */
  const ESPANOL = /(?<![\p{L}])(el|la|los|las|de|para|con|tu|tus|una|que|por|más|sin|desde|cuando|puedes|aquí)(?![\p{L}])/iu;
  const residuo = [];
  for (const [lang, datos] of [['zh', ZH], ['zh-TW', TW]]) {
    for (const [k, v] of datos) {
      /*
       * Fuera los huecos ANTES de mirar. Varios se llaman con palabras
       * españolas —`{{que}}`, `{{lista}}`, `{{nombre}}`— y no se traducen nunca:
       * son nombres de variable. Sin quitarlos, esta comprobación acusa de
       * «español residual» a plantillas que están perfectas.
       */
      const limpio = v.replace(/\{\{[\w.]+\}\}/g, '');
      /* Solo cuenta si además NO hay ningún carácter chino: si lo hay, es una marca o un tecnicismo. */
      if (!/[一-鿿]/.test(limpio) && ESPANOL.test(limpio)) residuo.push(`${lang} ${k}: «${v.slice(0, 34)}»`);
    }
  }
  check('14) ninguna clave se quedó en español', residuo.length === 0,
    residuo.slice(0, 5).join(' | ') || 'limpio');

  const vacias = [...ZH, ...TW].filter(([, v]) => v.trim() === '');
  check('15) ninguna clave está vacía', vacias.length === 0, vacias.slice(0, 5).map(([k]) => k).join(' ') || 'ninguna');
}

console.log('\n── F2 · El dinero, que es lo que cuesta caro decir mal ──');
{
  /*
   * Estas tres no las vigilaba nada, y son las que un revisor señaló como «lo
   * que cuesta dinero o confianza». Las otras dieciséis comprobaciones miran
   * estructura; éstas miran lo único que no se puede equivocar.
   */
  const dinero = [...ZH, ...TW].filter(([k]) => /^(credits|weeai|business|aiAvatar)\./.test(k));

  /* 1 · La moneda no se traduce. Ni en simplificado ni en tradicional. */
  const traducida = dinero.filter(([, v]) => /积分|點數|点数|積分|点券|點券|信用点|信用點/.test(v));
  check('16b) «Credits» nunca se traduce a una palabra china', traducida.length === 0,
    traducida.slice(0, 4).map(([k, v]) => `${k}: «${v.slice(0, 26)}»`).join(' | ') || `${dinero.length} claves de dinero`);

  /*
   * 2 · Ningún aviso PREVIO de coste puede usar el verbo del cargo hecho.
   * «已扣除» significa «ya se descontó». Si aparece en una estimación, la
   * persona cree que ya le cobraron.
   */
  const ESTIMA = /预计|預計|计算中|計算中|大概|預估|预估/;
  const CARGADO = /已扣除/;
  const confusas = dinero.filter(([, v]) => ESTIMA.test(v) && CARGADO.test(v));
  check('16c) ninguna estimación usa el verbo del cargo ya hecho', confusas.length === 0,
    confusas.slice(0, 4).map(([k, v]) => `${k}: «${v.slice(0, 30)}»`).join(' | ') || 'ninguna');

  /*
   * 3 · La recarga de prueba tiene que decir que no hay dinero real. Si alguien
   * borra esa frase, nadie se entera hasta que llegue una queja.
   */
  const avisos = [...ZH, ...TW].filter(([k]) => /^credits\.(testTopUpDone|terms)$/.test(k));
  const sinAviso = avisos.filter(([, v]) => !/不会产生|不會產生|不会向你收取|不會向你收取|不收取|真实付费|真實付費/.test(v));
  check('16d) la recarga de prueba dice que no se cobra dinero real',
    avisos.length === 4 && sinAviso.length === 0,
    sinAviso.map(([k]) => k).join(' ') || `${avisos.length} avisos, los cuatro lo dicen`);
}

console.log('\n── G · Interpolaciones intactas ──');
{
  const huecos = (v) => [...new Set([...String(v).matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]))].sort().join(',');
  const es = Object.fromEntries(todo('es'));
  const mal = [];
  for (const [lang, datos] of [['zh', ZH], ['zh-TW', TW]]) {
    for (const [k, v] of datos) {
      /*
       * Con una clave `_one` hay que comparar contra el `_other` DEL ESPAÑOL, no
       * contra su `_one`. En chino las dos formas dicen lo mismo —no hay plural—,
       * y el español a veces pone el número solo en el plural: «la forma» frente
       * a «las {{contador}} formas». Comparar `_one` con `_one` acusaría al chino
       * de añadir un hueco cuando lo único que hace es no tener singular.
       */
      const referencia = k.endsWith('_one') && es[k.replace(/_one$/, '_other')] !== undefined
        ? es[k.replace(/_one$/, '_other')]
        : es[k];
      if (referencia === undefined) continue;
      if (huecos(referencia) !== huecos(v)) mal.push(`${lang} ${k}: es[${huecos(referencia)}] vs [${huecos(v)}]`);
    }
  }
  check('16) los mismos huecos que el español, con los mismos nombres', mal.length === 0,
    mal.slice(0, 5).join(' | ') || 'idénticas');
}

console.log('\n── H · Las variantes del catálogo y los diccionarios dicen lo mismo ──');
{
  const cat = leer('i18n/idiomas.ts');
  const dic = leer('i18n/diccionarios.ts');
  /*
   * NO se exige que cada locale cubierto tenga su propia entrada: los `zh-Hans*`
   * no la necesitan, porque caen a `zh` por el respaldo normal de idioma y `zh`
   * YA es el simplificado. Exigirlo era una prueba de más, y las comprobaciones
   * 18 y 19 demuestran ejecutando lo que de verdad importa.
   *
   * Lo que sí hay que vigilar es lo contrario: un alias registrado en
   * `diccionarios.ts` que NADIE declara en el catálogo. Eso es un locale
   * huérfano —nadie sabe por qué está ahí— y el día que se retoque la lista de
   * variantes se quedará apuntando a un diccionario que ya no le corresponde.
   */
  /*
   * Anclado al chino A PROPÓSITO. La primera versión buscaba «el bloque
   * `variantes`» sin decir de quién, y funcionó mientras el chino fue el único
   * idioma con variantes. En cuanto el portugués tuvo las suyas —y `pt` va
   * antes que `zh` en el catálogo— esto empezó a leer la lista portuguesa y a
   * comparar manzanas con naranjas.
   */
  const delChino = (cat.match(/codigo: 'zh'[\s\S]*?variantes:\s*\[([\s\S]*?)\n {4}\],/) || [, ''])[1];
  const cubiertos = new Set([...delChino.matchAll(/'(zh[\w-]*)'/g)].map((m) => m[1]));
  const registrados = [...dic.matchAll(/^ {2}'(zh-[\w-]+)':/gm)].map((m) => m[1]);
  const huerfanos = registrados.filter((l) => !cubiertos.has(l));
  check('17) ningún alias registrado sin declarar en el catálogo', huerfanos.length === 0,
    huerfanos.join(' ') || `${registrados.length} alias, todos declarados`);
}

console.log('\n── I · Un teléfono de Taiwán recibe tradicional ──');
{
  const ts = require('typescript');
  const comoModulo = (js) => 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');
  const rutaDe = (b) => (fs.existsSync(path.resolve(raiz, b + '.ts')) ? b + '.ts' : b + '/index.ts');
  const cache = new Map();
  const cargar = async (ruta) => {
    if (cache.has(ruta)) return cache.get(ruta);
    let js = ts.transpileModule(leer(ruta), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
    const carpeta = path.posix.dirname(ruta.split(path.sep).join('/'));
    for (const [, rel] of js.matchAll(/from ['"](\.[^'"]*)['"]/g)) {
      const url = (await cargar(rutaDe(path.posix.normalize(path.posix.join(carpeta, rel))))).url;
      js = js.split(`from '${rel}'`).join(`from '${url}'`).split(`from "${rel}"`).join(`from "${url}"`);
    }
    const url = comoModulo(js);
    const r = { url, ns: await import(url) };
    cache.set(ruta, r);
    return r;
  };
  const traducir = (await cargar('i18n/traducir.ts')).ns;
  const dicc = (await cargar('i18n/diccionarios.ts')).ns.DICCIONARIOS;

  /* Una clave que en las dos escrituras se escribe distinto sirve de sonda. */
  const sonda = 'settings.title';
  const HANT = ['zh-TW', 'zh-Hant', 'zh-Hant-TW', 'zh-HK', 'zh-Hant-HK', 'zh-MO'];
  const HANS = ['zh', 'zh-CN', 'zh-Hans', 'zh-Hans-CN', 'zh-SG'];
  const enTradicional = Object.fromEntries(TW)[sonda];
  const enSimplificado = Object.fromEntries(ZH)[sonda];

  const malHant = HANT.filter((l) => traducir.crearTraductor(l, dicc)(sonda) !== enTradicional);
  check('18) los seis locales Hant reciben tradicional', malHant.length === 0,
    malHant.join(' ') || HANT.join(' '));
  const malHans = HANS.filter((l) => traducir.crearTraductor(l, dicc)(sonda) !== enSimplificado);
  check('19) y los locales Hans reciben simplificado', malHans.length === 0,
    malHans.join(' ') || HANS.join(' '));
  check('20) y las dos escrituras NO dicen lo mismo en la sonda',
    enTradicional !== enSimplificado, `${sonda}: «${enSimplificado}» vs «${enTradicional}»`);
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
