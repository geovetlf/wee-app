/*
 * EL JAPONÉS DE WEË.
 *
 * `ja` entra por la misma puerta que los demás —una carpeta, una línea en el
 * registro, una fila en el catálogo—, sin una sola línea de lógica para él. Lo
 * que esta prueba vigila es lo que SOLO puede salir mal en japonés, y que no se
 * ve leyendo un archivo de dos mil líneas:
 *
 * 1 · QUE ESTÉ ENTERO. El respaldo por clave tapa cualquier hueco con inglés y
 *     la pantalla parece correcta. Aquí se monta un traductor SIN respaldo y se
 *     le piden todas las claves.
 *
 * 2 · QUE NO HAYA PLURAL. `Intl.PluralRules('ja')` declara una sola categoría,
 *     `other`: `_one` no se lee nunca y tiene que decir lo mismo que `_other`.
 *
 * 3 · QUE SEA JAPONÉS ESCRITO COMO JAPONÉS. Puntuación de ancho completo
 *     (「」、。), alfanuméricos de ancho medio, ningún katakana de ancho medio,
 *     ningún carácter chino o coreano colado —un 设置 en vez de 設定 no rompe
 *     nada y a un lector japonés le salta a la cara—, y las convenciones de
 *     `docs/I18N-JAPONES.md`.
 *
 * 4 · QUE LAS MARCAS SIGAN EN LATINO. En japonés todo nombre extranjero se
 *     escribe en katakana, así que la tentación es constante: ウィー por Weë,
 *     クレジット por Credits. Lo general lo vigila `i18n-nombres-propios`;
 *     aquí se mira el dinero, que es lo que cuesta caro decir mal.
 *
 * 5 · QUE `ja-JP` FUNCIONE DE PUNTA A PUNTA: del aparato al idioma, a los
 *     formatos y al `<html lang="ja">`, sin que la ubicación toque nada.
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
const registro = (await cargar('i18n/diccionarios.ts')).ns;
const es = (await cargar('i18n/textos/es/index.ts')).ns.es;
const en = (await cargar('i18n/textos/en/index.ts')).ns.en;
const ja = (await cargar('i18n/textos/ja/index.ts')).ns.ja;

/* Todas las cadenas, aplanadas: 'modulo.clave' → texto. */
const aplanar = (o, pre = '') => Object.entries(o).flatMap(([k, v]) =>
  typeof v === 'object' ? aplanar(v, pre + k + '.') : [[pre + k, v]]);
const JA = aplanar(ja);
const ES = Object.fromEntries(aplanar(es));
const EN = Object.fromEntries(aplanar(en));

/*
 * Lo que un texto lleva que NO es japonés a propósito, y que hay que apartar
 * antes de mirar si lo que queda es japonés: los huecos (`{{nombre}}` es un
 * nombre de variable), los escapes (`\n` son dos caracteres, y la `n` es una
 * letra latina), y las marcas de Weë, que van en latino por regla.
 */
const MARCAS = /Weë (?:AI|Studio|Design|Photo|Writer|Music|Beauty|Chef|Home|Business|Travel|Brain|Credits|Inspira)|WeeTalk|Weëls|Wäll|ËContact|ẄContact|Credits|Weë/gu;
const sinLoAjeno = (v) => String(v)
  .replace(/\{\{[\w.]+\}\}/g, ' ')
  .replace(/\\[nrt]/g, ' ')
  .replace(MARCAS, ' ');
/*
 * Un carácter japonés. El punto medio latino (U+00B7) se excluye a mano: con
 * el ICU de Node 24 su Script_Extensions incluye Han, y en Weë es el separador
 * « · » de las líneas de datos, no japonés. Sin esto, « · » contaría como texto
 * japonés y la regla de espacios lo acusaría.
 */
const JP_CLASE = '\\p{scx=Hiragana}\\p{scx=Katakana}\\p{scx=Han}';
const UN_JAPONES = `(?:(?!\\u00B7)[${JP_CLASE}])`;
const JAPONES = new RegExp(UN_JAPONES, 'u');

console.log('\n── A · `ja-JP` de punta a punta, sin lógica para el japonés ──');
{
  const cat = idiomas.idiomaDelCatalogo('ja');
  check('1) el catálogo lo ofrece: listo, «日本語», de izquierda a derecha y sin variantes',
    cat?.listo === true && cat.nombreNativo === '日本語' && cat.direccion === 'ltr' && !cat.variantes
    && idiomas.filasDeIdioma().filter((f) => f.idioma === 'ja').length === 1,
    JSON.stringify(cat));
  check('2) y su locale principal, `ja-JP`, está entre los contemplados',
    idiomas.LOCALES_CONTEMPLADOS.includes('ja-JP'));
  check('3) el registro lo sirve con su propio diccionario, no por un alias',
    registro.DICCIONARIOS.ja === ja && registro.idiomasConDiccionario().includes('ja'));

  const disponibles = registro.idiomasConDiccionario();
  const elegir = (elegido, aparato) => resolver.elegirIdioma(elegido, aparato, disponibles);
  const delAparato = elegir(null, ['ja-JP']);
  check('4) un aparato en `ja-JP` recibe japonés, con sus formatos',
    delAparato.idioma === 'ja' && delAparato.locale === 'ja-JP' && delAparato.origen === 'aparato',
    JSON.stringify(delAparato));
  check('5) también si solo dice `ja`, o si el japonés va primero en su lista',
    elegir(null, ['ja']).idioma === 'ja' && elegir(null, ['ja-JP', 'en-US']).idioma === 'ja');
  check('6) la cadena de respaldo: `ja-JP` → `ja` → inglés',
    resolver.cadenaDeRespaldo('ja-JP').join('>') === 'ja-JP>ja>en', resolver.cadenaDeRespaldo('ja-JP').join('>'));
  /*
   * Lo elegido a mano manda en las dos direcciones, y el sitio no pinta nada:
   * quien tiene Weë en español y aterriza en Tokio —el aparato pasa a
   * `ja-JP`— sigue en español; quien eligió japonés en Lima sigue en japonés.
   */
  check('7) lo elegido a mano gana al aparato, en las dos direcciones',
    elegir('es', ['ja-JP']).idioma === 'es' && elegir('ja', ['es-PE', 'en-US']).idioma === 'ja'
    && elegir('ja', ['es-PE']).origen === 'elegido');
  check('8) la lengua del texto es `ja`: la página se anuncia como `<html lang="ja">`',
    resolver.etiquetaDelTexto('ja', 'ja-JP') === 'ja' && resolver.etiquetaDelTexto('ja', 'ja') === 'ja'
    && resolver.etiquetaDelTexto('en', 'ja-JP') === 'en');

  /*
   * Los formatos los escribe `Intl` con el locale, no una tabla nuestra. Se
   * comprueba la FORMA —el año con 年, la coma de miles, el yen sin decimales—
   * y no la cadena exacta, que cambia con las versiones de CLDR.
   */
  const dia = Date.UTC(2026, 8, 30, 12);
  const fecha = formato.formatearFecha(dia, 'ja-JP');
  const numero = formato.formatearNumero(1234567.89, 'ja-JP');
  const yenes = formato.formatearMoneda(1500, 'ja-JP', 'JPY');
  const hace = formato.formatearTiempoRelativo(dia - 3 * 24 * 3600 * 1000, 'ja-JP', dia);
  const lista = formato.formatearLista(['A', 'B', 'C'], 'ja-JP');
  check('9) la fecha japonesa: año, mes y día con sus caracteres',
    /2026年/.test(fecha) && /9月/.test(fecha) && /30日/.test(fecha), fecha);
  check('10) los números con coma de miles y punto decimal', /1,234,567\.89/.test(numero), numero);
  check('11) el yen, sin decimales', /1,500/.test(yenes) && !/1,500\.\d/.test(yenes) && /[¥￥]/.test(yenes), yenes);
  check('12) «hace 3 días» lo escribe Intl, en japonés', /3/.test(hace) && /前/.test(hace), hace);
  check('13) las listas se unen con la coma japonesa', /A、B、C/.test(lista), lista);
  check('14) y la distancia en el sistema métrico',
    formato.sistemaDeMedida('ja-JP') === 'metrico' && /km/.test(formato.formatearDistancia(5000, 'ja-JP')),
    formato.formatearDistancia(5000, 'ja-JP'));
  /* Y el alta pide la fecha de nacimiento en el orden en que se escribe: 年・月・日. */
  check('14b) el día, el mes y el año se piden en el orden del locale',
    formato.ordenDeLaFecha('ja-JP').join() === 'year,month,day'
    && formato.ordenDeLaFecha('es-PE').join() === 'day,month,year'
    && formato.ordenDeLaFecha('en-US').join() === 'month,day,year'
    && /ordenDeFecha\.map\(/.test(leer('screens/OnboardingScreen.tsx')),
    formato.ordenDeLaFecha('ja-JP').join());
}

console.log('\n── B · Entero: sin respaldo, sin huecos, sin nada sin traducir ──');
{
  /*
   * Un traductor SOLO con el japonés, frente a otro con el respaldo completo.
   * Si una sola clave faltara, el segundo la sacaría en inglés y el primero no:
   * así se ve lo que el respaldo esconde. Se piden TODAS, no una muestra.
   */
  const solo = traducir.crearTraductor('ja-JP', { ja }, { modoDesarrollo: false });
  const conRespaldo = traducir.crearTraductor('ja-JP', { ja, es, en }, { modoDesarrollo: false });
  const valores = { contador: 2, nombre: 'Aiko', titulo: 'T', lista: 'L', cantidad: 3, saldo: 10 };
  const distintas = Object.keys(ES).filter((k) => !/_(one|other)$/.test(k) || k.endsWith('_other'))
    .map((k) => k.replace(/_other$/, ''))
    .filter((k) => solo(k, valores) !== conRespaldo(k, valores));
  check('15) sin español ni inglés detrás, el japonés dice exactamente lo mismo',
    distintas.length === 0, distintas.slice(0, 5).join(' ') || `${Object.keys(ES).length} claves`);

  const vacias = JA.filter(([, v]) => typeof v !== 'string' || v.trim() === '');
  check('16) ninguna cadena vacía', vacias.length === 0, vacias.slice(0, 5).map(([k]) => k).join(' ') || 'ninguna');

  /*
   * Todo lo que tiene letras, después de apartar huecos y marcas, tiene que
   * tener japonés. Lo que no, es una cadena que se quedó en español o en
   * inglés —o una que de verdad no tiene nada que traducir, y entonces va en
   * `SIN_TEXTO` con su porqué—.
   */
  const SIN_TEXTO = new Set([
    /*
     * El botón único de un aviso informativo. En las apps japonesas —iOS,
     * Android, las guías de estilo— ese botón es «OK», en latino; no hay nada
     * que traducir (glosario, § 10.6).
     */
    'common.accept',
  ]);
  const sinJapones = JA.filter(([k, v]) => !SIN_TEXTO.has(k) && /\p{L}/u.test(sinLoAjeno(v)) && !JAPONES.test(sinLoAjeno(v)));
  check('17) todo lo que tiene letras está escrito en japonés',
    sinJapones.length === 0,
    sinJapones.length ? `${sinJapones.length} · ${sinJapones.slice(0, 5).map(([k, v]) => `${k}: «${v.slice(0, 30)}»`).join(' | ')}` : 'todo');

  /*
   * Y ninguna palabra española suelta dentro de una frase japonesa: es lo que
   * queda cuando se traduce a medias. Se buscan palabras enteras, con fronteras
   * Unicode (`\b` es ASCII y en una frase japonesa no ve nada).
   */
  const ESPANOL = /(?<![\p{L}])(?:el|la|los|las|del|para|con|una|que|por|más|sin|desde|cuando|puedes|aquí|tus?|mis?|está|están)(?![\p{L}])/iu;
  const conEspanol = JA.filter(([, v]) => ESPANOL.test(sinLoAjeno(v)));
  check('18) ninguna palabra española colada en una frase japonesa', conEspanol.length === 0,
    conEspanol.slice(0, 5).map(([k, v]) => `${k}: «${v.slice(0, 34)}»`).join(' | ') || 'limpio');

  const igualesAlEspanol = JA.filter(([k, v]) => !SIN_TEXTO.has(k) && ES[k] === v && /\p{L}/u.test(sinLoAjeno(v)));
  const igualesAlIngles = JA.filter(([k, v]) => !SIN_TEXTO.has(k) && EN[k] === v && /\p{L}/u.test(sinLoAjeno(v)));
  check('19) ninguna cadena copiada tal cual del español o del inglés',
    igualesAlEspanol.length === 0 && igualesAlIngles.length === 0,
    [...igualesAlEspanol, ...igualesAlIngles].slice(0, 5).map(([k, v]) => `${k}: «${v.slice(0, 30)}»`).join(' | ') || 'ninguna');
}

console.log('\n── C · El japonés no distingue número ──');
{
  const r = new Intl.PluralRules('ja');
  check('20) `Intl` declara una sola categoría para el japonés',
    r.resolvedOptions().pluralCategories.join(',') === 'other', r.resolvedOptions().pluralCategories.join(','));
  const plano = Object.fromEntries(JA);
  const pares = Object.keys(plano).filter((k) => k.endsWith('_one') && k.replace(/_one$/, '_other') in plano);
  const distintas = pares.filter((k) => plano[k] !== plano[k.replace(/_one$/, '_other')]);
  check('21) `_one` y `_other` dicen lo mismo en todas las claves con cantidad', distintas.length === 0,
    distintas.slice(0, 4).map((k) => `${k}: «${plano[k]}» ≠ «${plano[k.replace(/_one$/, '_other')]}»`).join(' | ') || `${pares.length} pares`);
  const inventadas = Object.keys(plano).filter((k) => /_(zero|two|few|many)$/.test(k));
  check('22) y no hay formas de plural inventadas', inventadas.length === 0, inventadas.join(' ') || 'ninguna');

  const solo = traducir.crearTraductor('ja', { ja }, { modoDesarrollo: false });
  const cambian = pares.map((k) => k.replace(/_one$/, '')).filter((k) => {
    const uno = solo(k, { contador: 1, titulo: 'T', lista: 'L', nombre: 'N' });
    const siete = solo(k, { contador: 7, titulo: 'T', lista: 'L', nombre: 'N' });
    return uno.replace(/\d+/g, '#') !== siete.replace(/\d+/g, '#');
  });
  check('23) con 1 o con 7 sale la misma frase: solo cambia la cifra', cambian.length === 0,
    cambian.slice(0, 3).join(' ') || 'todas iguales');
}

console.log('\n── D · Los huecos, intactos ──');
{
  /*
   * Los mismos `{{huecos}}` que el español y con los mismos nombres: el código
   * que llama a `t()` pasa esos nombres y no otros. Con una clave `_one` se
   * compara con el `_other` del español, porque el español a veces solo pone
   * la cifra en el plural y el japonés, que no tiene singular, la pone siempre.
   */
  const huecos = (v) => [...new Set([...String(v).matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]))].sort().join(',');
  const mal = JA.filter(([k, v]) => {
    const referencia = k.endsWith('_one') && ES[k.replace(/_one$/, '_other')] !== undefined ? ES[k.replace(/_one$/, '_other')] : ES[k];
    return referencia !== undefined && huecos(referencia) !== huecos(v);
  });
  check('24) los mismos huecos que el español, con los mismos nombres', mal.length === 0,
    mal.slice(0, 4).map(([k, v]) => `${k}: es[${huecos(ES[k])}] ja[${huecos(v)}]`).join(' | ') || 'idénticos');
  const rotos = JA.filter(([, v]) => /\{\{(?![\w.]+\}\})|(?<!\{\{[\w.]+)\}\}|\{[\w.]+\}(?!\})/.test(v.replace(/\{\{[\w.]+\}\}/g, '')));
  check('25) ninguna llave suelta ni un hueco a medio escribir', rotos.length === 0,
    rotos.slice(0, 4).map(([k]) => k).join(' ') || 'limpio');
  /*
   * Los espacios del borde se CONCATENAN en pantalla —«Al continuar aceptas » +
   * enlace—. En japonés dos piezas japonesas van PEGADAS, sin espacio (§ 4 de
   * la guía), así que el borde del español no se copia: lo que no puede pasar
   * es que una pieza que acaba —o empieza— en letra o cifra latina se pegue a
   * la siguiente, que es donde sí saldrían dos palabras juntas.
   */
  const bordes = JA.filter(([k, v]) => {
    const e = ES[k];
    if (typeof e !== 'string') return false;
    return (/^\s/.test(e) && /^[A-Za-z0-9]/.test(v)) || (/\s$/.test(e) && /[A-Za-z0-9]$/.test(v));
  });
  check('26) ninguna pieza que se pega a otra deja una palabra latina sin su espacio', bordes.length === 0,
    bordes.slice(0, 4).map(([k, v]) => `${k}: «${v}»`).join(' | ') || 'bien');
}

console.log('\n── E · Japonés escrito como japonés ──');
{
  const medioAncho = JA.filter(([, v]) => /[｡-ﾟ]/.test(v));
  check('27) ningún katakana de ancho medio', medioAncho.length === 0,
    medioAncho.slice(0, 4).map(([k, v]) => `${k}: «${v.slice(0, 30)}»`).join(' | ') || 'ninguno');
  const anchoCompleto = JA.filter(([, v]) => /[０-９Ａ-Ｚａ-ｚ]/.test(v));
  check('28) letras y cifras latinas de ancho medio, nunca de ancho completo', anchoCompleto.length === 0,
    anchoCompleto.slice(0, 4).map(([k, v]) => `${k}: «${v.slice(0, 30)}»`).join(' | ') || 'ninguna');
  /*
   * NI CHINO NI COREANO. Los agentes y las personas que traducen ven el
   * diccionario chino al lado, y muchos caracteres se parecen: 设置 es chino
   * simplificado, 設定 es japonés. Aquí están los que el japonés NO usa —ni
   * los simplificados que tienen otra forma en japonés, ni los tradicionales
   * que el japonés moderno simplificó a su manera, ni las partículas chinas—.
   * Se dejaron fuera a propósito los que coinciden con el japonés: 写, 点,
   * 状, 為, 還, 片, 限, 助, 繁…
   */
  const SOLO_CHINO = /[们这设户视频创览资过时间发请让说语页线选项册删录编辑载读账击务员应电话网络图该转换态错误帮买卖关闭开启进显隐权历纪简优质标题您們這麼裡嗎呢吧將與點關發說體圖變會來讓從錄號實歡]/u;
  const chino = JA.filter(([, v]) => SOLO_CHINO.test(v));
  check('29) ningún carácter chino que el japonés no use', chino.length === 0,
    chino.slice(0, 4).map(([k, v]) => `${k}: «${v.slice(0, 30)}» (${v.match(SOLO_CHINO)[0]})`).join(' | ') || 'limpio');
  const coreano = JA.filter(([, v]) => /[가-힯ᄀ-ᇿ㄰-㆏]/u.test(v));
  check('30) ni una letra coreana', coreano.length === 0, coreano.slice(0, 4).map(([k]) => k).join(' ') || 'limpio');
  /*
   * La puntuación de la frase japonesa es la suya: 。 y 、, no el punto y la
   * coma latinos pegados a un kanji o a un kana; y 「」 para citar, no las
   * comillas españolas «» ni las inglesas “”. Los signos de ancho completo
   * ，y ．son de textos técnicos y académicos, no de una interfaz.
   */
  const PUNTO_LATINO = new RegExp(`${UN_JAPONES}[.,](?=\\s|$)`, 'u');
  const puntoLatino = JA.filter(([, v]) => PUNTO_LATINO.test(sinLoAjeno(v)));
  check('31) ninguna frase japonesa acaba en punto o coma latinos', puntoLatino.length === 0,
    puntoLatino.slice(0, 4).map(([k, v]) => `${k}: «${v.slice(0, 30)}»`).join(' | ') || 'limpio');
  const comillasAjenas = JA.filter(([, v]) => /[«»“”]|[，．]/.test(v));
  check('32) ni comillas españolas o inglesas, ni coma y punto de ancho completo', comillasAjenas.length === 0,
    comillasAjenas.slice(0, 4).map(([k, v]) => `${k}: «${v.slice(0, 30)}»`).join(' | ') || 'limpio');
  const dobles = JA.filter(([, v]) => /。。|、、|、。|。、|\s。|\s、/.test(v));
  check('33) sin signos repetidos ni espacios delante de 。 o 、', dobles.length === 0,
    dobles.slice(0, 4).map(([k, v]) => `${k}: «${v.slice(0, 30)}»`).join(' | ') || 'limpio');
  /*
   * SIN ESPACIOS ARTIFICIALES (§ 4 de la guía). Ni entre japonés y latino o
   * cifras —「Weë Studioで作成」「3件」—, ni entre dos palabras japonesas. Sí
   * dentro de lo latino («Weë Studio», «250 Credits») y alrededor del separador
   * « · », que es diseño de Weë en todos los idiomas.
   */
  const ESPACIO_MIXTO = new RegExp(`(?:${UN_JAPONES}|[、。！？」）]) +[A-Za-z0-9{]|[A-Za-z0-9}ëäËẄ] +(?:${UN_JAPONES}|[「（])`, 'u');
  const ESPACIO_JAPONES = new RegExp(`${UN_JAPONES} +${UN_JAPONES}`, 'u');
  const conEspacios = JA.filter(([, v]) => ESPACIO_MIXTO.test(v) || ESPACIO_JAPONES.test(v));
  check('33b) ningún espacio entre japonés y latino o cifras, ni entre palabras japonesas', conEspacios.length === 0,
    conEspacios.slice(0, 4).map(([k, v]) => `${k}: «${v.slice(0, 40)}»`).join(' | ') || 'limpio');
  check('33c) control: la regla reconoce los espacios artificiales y deja pasar lo que está bien',
    ['Weë Studio で作成', '3 件', '設定 を保存', '{{contador}} 件'].every((m) => ESPACIO_MIXTO.test(m) || ESPACIO_JAPONES.test(m))
    && ['Weë Studioで作成', '3件', '残り250 Credits', '12 Credits · テスト'].every((b) => !ESPACIO_MIXTO.test(b) && !ESPACIO_JAPONES.test(b)));
  /*
   * Registro de una buena app japonesa: sin fórmulas serviles ni rodeos
   * (§ 2 de la guía). させていただく, ございます (salvo la fórmula ありがとうございます), ～することができる y ～を行う
   * son las marcas típicas de una traducción que no se revisó.
   */
  const servil = JA.filter(([, v]) => /させていただ|(?<!ありがとう)ございま|することができ|を行い|を行う|してもよろしいでしょうか|お客様/.test(v));
  check('33d) sin fórmulas serviles ni rodeos de traducción', servil.length === 0,
    servil.slice(0, 4).map(([k, v]) => `${k}: «${v.slice(0, 36)}»`).join(' | ') || 'limpio');
}

console.log('\n── F · El dinero, que es lo que cuesta caro decir mal ──');
{
  const dinero = JA.filter(([k]) => /^(credits|weeai|business|aiAvatar|creaciones|studio|design|chef)\./.test(k));
  /* 1 · La moneda no se traduce ni se translitera. Nunca. */
  const moneda = dinero.filter(([, v]) => /クレジット(?!カード)|ポイント|コイン|トークン/.test(v));
  check('34) «Credits» nunca se escribe クレジット, ポイント, コイン ni トークン', moneda.length === 0,
    moneda.slice(0, 4).map(([k, v]) => `${k}: «${v.slice(0, 26)}»`).join(' | ') || `${dinero.length} claves mirando dinero`);
  /* Y donde el español dice Credits, el japonés también. */
  const perdidos = JA.filter(([k, v]) => /Credits/.test(ES[k] || '') && !/Credits/.test(v));
  check('35) cada «Credits» del español sigue en su clave japonesa', perdidos.length === 0,
    perdidos.slice(0, 4).map(([k]) => k).join(' ') || 'todos');
}

console.log('\n── G · Queda escrito ──');
{
  const indice = leer('i18n/textos/ja/index.ts');
  check('36) el índice japonés dice qué no entra nunca, y que las marcas van en latino',
    /no entra nunca en estos archivos/i.test(indice) && /katakana/i.test(indice));
  const guia = fs.existsSync(path.resolve(raiz, 'docs/I18N-JAPONES.md')) ? leer('docs/I18N-JAPONES.md') : '';
  check('37) la guía de estilo y el glosario existen y se leen', guia.length > 2000 && /Glosario/i.test(guia) && /Credits/.test(guia));
  const pantallaDeError = leer('components/ErrorBoundary.tsx');
  const filaJa = (pantallaDeError.match(/^ {2}ja: \{ titulo: '([^']+)', mensaje: '([^']+)', boton: '([^']+)' \},$/m) || []).slice(1);
  check('38) la pantalla de error también habla japonés', filaJa.length === 3 && filaJa.every((f) => JAPONES.test(f)),
    filaJa.join(' · ') || 'sin fila');
}

console.log('\n── H · Del aparato a la pantalla: selector, persistencia, cuenta, bienvenida, ajustes ──');
{
  const disponibles = registro.idiomasConDiccionario();
  const fila = idiomas.filasDeIdioma().find((f) => f.idioma === 'ja');
  check('39) el selector ofrece «日本語» como una fila propia', fila?.clave === 'ja' && fila.nombreNativo === '日本語',
    JSON.stringify(fila));
  /*
   * Ninguna de las tres pantallas que enseñan idiomas tiene una lista propia ni
   * sabe que el japonés existe: lo leen del catálogo. Es lo que hace que el
   * idioma siguiente entre sin tocarlas.
   */
  const pantallas = ['screens/IdiomaScreen.tsx', 'screens/OnboardingScreen.tsx', 'screens/SettingsScreen.tsx'].map((p) => [p, leer(p)]);
  const conLista = pantallas.filter(([, s]) => !/filasDeIdioma\(\)|disponibles\.find/.test(s) || /'ja'|日本語/.test(s)).map(([p]) => p);
  check('40) Idioma, la bienvenida y Configuración leen el catálogo, sin nada escrito para el japonés', conLista.length === 0,
    conLista.join(' ') || 'las tres');
  /* Lo que se guarda al elegir —el código o el locale entero— vuelve a dar japonés al abrir, aunque el aparato diga otra cosa. */
  const guardados = ['ja', 'ja-JP'].map((g) => resolver.elegirIdioma(g, ['en-US'], disponibles));
  check('41) persistencia: lo guardado al elegir japonés vuelve como japonés elegido',
    guardados.every((r) => r.idioma === 'ja' && r.origen === 'elegido'), JSON.stringify(guardados));
  /*
   * LA CUENTA. `SincronizarIdioma` escribe en `users.language` el locale, y solo
   * cuando lo eligió la persona. El servidor transporta etiquetas BCP-47 sin
   * lista blanca, y las reglas de Firestore no validan el idioma: `ja-JP` pasa
   * de punta a punta sin que nada tenga que saber que existe.
   */
  const sincronizar = leer('components/SincronizarIdioma.tsx');
  const lengua = require(path.resolve(here, '../lib/core/language.js'));
  const contexto = lengua.contextoDeIdioma({ appLanguage: 'ja-JP' });
  check('42) sincronización con la cuenta: se guarda el locale elegido y el servidor lo acepta tal cual',
    /if \(origen !== 'elegido'\) return;/.test(sincronizar) && /\{ language: locale \}/.test(sincronizar)
    && lengua.normalizarEtiqueta('ja-JP') === 'ja-JP' && lengua.idiomaDe('ja-JP') === 'ja' && contexto.appLanguage === 'ja-JP'
    && !/language/i.test(leer('firestore.rules')), JSON.stringify(contexto));
  /* La bienvenida y Configuración escriben el idioma puesto con la misma expresión que su código. */
  const enBienvenida = idiomas.varianteDelLocale('ja-JP')?.nombreNativo ?? idiomas.filasDeIdioma().find((f) => f.clave === 'ja')?.nombreNativo;
  const enAjustes = idiomas.varianteDelLocale('ja-JP')?.nombreNativo ?? idiomas.idiomasDisponibles().find((i) => i.codigo === 'ja')?.nombreNativo;
  check('43) la bienvenida y Configuración dicen «日本語»', enBienvenida === '日本語' && enAjustes === '日本語'
    && /varianteDelLocale\(locale\)\?\.nombreNativo\s*\?\? filasDeIdioma\(\)\.find\(\(f\) => f\.clave === idioma\)\?\.nombreNativo/.test(leer('screens/OnboardingScreen.tsx'))
    && /varianteDelLocale\(locale\)\?\.nombreNativo\s*\?\? disponibles\.find\(\(i\) => i\.codigo === idioma\)\?\.nombreNativo/.test(leer('screens/SettingsScreen.tsx')),
    `${enBienvenida} · ${enAjustes}`);

  /* WEB: el navegador da una lista ordenada; la primera línea japonesa manda. */
  const aparato = (await cargar('i18n/aparato.ts')).ns;
  const antes = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { value: { languages: ['ja-JP', 'ja', 'en-US'], language: 'ja-JP' }, configurable: true, writable: true });
  const delNavegador = aparato.localesDelAparato();
  if (antes) Object.defineProperty(globalThis, 'navigator', antes); else delete globalThis.navigator;
  const enLaWeb = resolver.elegirIdioma(null, delNavegador, disponibles);
  check('44) web: un navegador en japonés abre Weë en japonés, con `ja-JP` para los formatos',
    delNavegador[0] === 'ja-JP' && enLaWeb.idioma === 'ja' && enLaWeb.locale === 'ja-JP', `${delNavegador.join(',')} → ${JSON.stringify(enLaWeb)}`);
  /* MÓVIL: sin navegador manda lo que diga `Intl` del teléfono; un teléfono en `ja-JP` resuelve igual. */
  const sinNavegador = aparato.localesDelAparato();
  check('45) móvil: sin navegador se lee Intl, y un teléfono en `ja-JP` recibe japonés',
    sinNavegador.length >= 1 && /resolvedOptions\(\)/.test(leer('i18n/aparato.ts'))
    && resolver.elegirIdioma(null, ['ja-JP'], disponibles).idioma === 'ja', sinNavegador.join(','));

  /*
   * ACCESIBILIDAD. Todas las claves que se usan como etiqueta para el lector de
   * pantalla (`accessibilityLabel={t('…')}`) están en japonés y no llevan
   * «ボタン» detrás: el rol ya lo anuncia y repetirlo es ruido.
   */
  const fuentes = [];
  const andar = (d) => {
    for (const e of fs.readdirSync(path.resolve(raiz, d), { withFileTypes: true })) {
      const rel = `${d}/${e.name}`;
      if (e.isDirectory()) andar(rel);
      else if (/\.tsx$/.test(e.name)) fuentes.push(leer(rel));
    }
  };
  ['components', 'screens', 'navigation'].forEach(andar);
  const clavesAccesibles = new Set(fuentes.flatMap((s) => [...s.matchAll(/accessibilityLabel=\{t\('([a-zA-Z]+\.[A-Za-z0-9_]+)'/g)].map((m) => m[1])));
  const plano = Object.fromEntries(JA);
  /* Una etiqueta hecha solo de huecos («{{grupo}}：{{opcion}}») no tiene nada que traducir: lo que se oye es lo que traen los huecos. */
  /* Una clave con cantidad se pide sin sufijo (`t('x', { contador })`): su texto está en `x_other`. */
  const valorDe = (k) => plano[k] ?? plano[`${k}_other`];
  const malasAccesibles = [...clavesAccesibles].filter((k) => valorDe(k) === undefined
    || (/\p{L}/u.test(sinLoAjeno(valorDe(k))) && !JAPONES.test(sinLoAjeno(valorDe(k)))) || /ボタン$/.test(valorDe(k)));
  check('46) accesibilidad: las etiquetas del lector de pantalla están en japonés y sin «ボタン»',
    clavesAccesibles.size > 20 && malasAccesibles.length === 0,
    malasAccesibles.slice(0, 5).map((k) => `${k}: «${valorDe(k)}»`).join(' | ') || `${clavesAccesibles.size} etiquetas`);
}

console.log('\n── I · Las marcas de Weë, exactamente como son ──');
{
  /*
   * La lista del encargo (FASE 9), carácter a carácter. Primero se comprueba la
   * LISTA: una ë escrita con la diéresis suelta, o una Ẅ confundida con una W,
   * dejaría pasar exactamente el error que se busca.
   */
  const LISTA = ['WEE', 'Weë', 'WeëAI', 'Weë AI', 'Weë Studio', 'Weë Chef', 'Weë Design', 'Weë Travel', 'Weë Business',
    'Weë Music', 'Weë Inspira', 'Weëls', 'Wäll', 'Weë Credits', 'ËContact', 'ẄContact', 'Credits', 'WeeTalk', 'Weë Brain',
    'Weë Photo', 'Weë Writer', 'Weë Beauty', 'Weë Home'];
  const bienEscrita = LISTA.every((m) => m === m.normalize('NFC'))
    && 'Weë'.codePointAt(2) === 0xEB && 'Wäll'.codePointAt(1) === 0xE4 && 'ËContact'.codePointAt(0) === 0xCB && 'ẄContact'.codePointAt(0) === 0x1E84;
  check('47) la lista de marcas está escrita con sus caracteres de verdad (NFC, ë U+00EB, ä U+00E4, Ë U+00CB, Ẅ U+1E84)', bienEscrita);
  /* Cada marca que el español dice en una clave, el japonés la dice igual, byte a byte. */
  const escapar = (m) => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const perdidas = [];
  for (const [k, v] of JA) {
    const e = ES[k];
    if (typeof e !== 'string') continue;
    for (const m of LISTA) {
      /*
       * Fronteras LATINAS, no `\p{L}`: en japonés la partícula va pegada a la
       * marca («Weëへ»), y el kana también es una letra. Lo que no puede haber
       * al lado es otra letra latina: «Weë» no es la marca dentro de «Weëls».
       */
      const re = new RegExp(`(?<![A-Za-z\\u00C0-\\u024F])${escapar(m)}(?![A-Za-z\\u00C0-\\u024F])`, 'u');
      if (re.test(e) && !re.test(v)) perdidas.push(`${k}: «${m}»`);
    }
  }
  check('48) cada marca del español sigue, intacta, en su clave japonesa', perdidas.length === 0,
    perdidas.slice(0, 6).join(' | ') || 'todas');
  /* Y ninguna aparece convertida en katakana o traducida (la lista completa de deformaciones vive en i18n-nombres-propios). */
  const KATAKANA_DE_MARCA = /クレジット(?!カード)|ウィー(?![クン])|ウイー|ウェー(?![ブル])|(?<!ファイア)ウォール(?!ペーパー)|Weë ?(?:スタジオ|ブレイン|デザイン|ミュージック|シェフ|ビジネス|トラベル|ライター|ビューティー|フォト|ホーム)/u;
  const deformadas = JA.filter(([, v]) => KATAKANA_DE_MARCA.test(v));
  check('49) ninguna marca en katakana ni traducida', deformadas.length === 0,
    deformadas.slice(0, 4).map(([k, v]) => `${k}: «${v.slice(0, 30)}»`).join(' | ') || 'limpio');
}

console.log('\n── J · Traducciones defectuosas ──');
{
  /* HTML y markdown: si el español lleva etiquetas o marcas, el japonés lleva las mismas. */
  const cuenta = (s, re) => (String(s).match(re) || []).length;
  const marcado = JA.filter(([k, v]) => typeof ES[k] === 'string'
    && (cuenta(ES[k], /<\/?[a-zA-Z][^>]*>/g) !== cuenta(v, /<\/?[a-zA-Z][^>]*>/g) || cuenta(ES[k], /\*\*|__|\]\(/g) !== cuenta(v, /\*\*|__|\]\(/g)));
  check('50) ni HTML ni markdown roto', marcado.length === 0, marcado.slice(0, 4).map(([k]) => k).join(' ') || 'intacto');
  /* Los saltos de línea los pone el código con `\n` dentro de la cadena: los mismos que en el español. */
  const saltos = JA.filter(([k, v]) => {
    const ref = k.endsWith('_one') && ES[k.replace(/_one$/, '_other')] !== undefined ? ES[k.replace(/_one$/, '_other')] : ES[k];
    return typeof ref === 'string' && cuenta(ref, /\n/g) !== cuenta(v, /\n/g);
  });
  check('51) los mismos saltos de línea que el español, y ninguno escapado dos veces', saltos.length === 0 && !JA.some(([, v]) => /\\n/.test(v)),
    saltos.slice(0, 4).map(([k]) => k).join(' ') || 'iguales');

  /*
   * TERMINOLOGÍA (§ 10 de la guía). Los verbos y rótulos que la persona ve en
   * toda la app dicen siempre lo mismo; y las grafías que la guía descartó no
   * aparecen en ninguna parte.
   */
  const ROTULOS = [['Guardar', '保存'], ['Cancelar', 'キャンセル'], ['Eliminar', '削除'], ['Compartir', '共有'], ['Editar', '編集'],
    ['Configuración', '設定'], ['Notificaciones', '通知'], ['Buscar', '検索'], ['Inicio', 'ホーム'], ['Cerrar', '閉じる']];
  const rotulosMal = JA.filter(([k, v]) => ROTULOS.some(([e, j]) => ES[k] === e && v !== j));
  check('52) los rótulos comunes dicen siempre lo mismo', rotulosMal.length === 0,
    rotulosMal.slice(0, 5).map(([k, v]) => `${k}: «${ES[k]}» → «${v}»`).join(' | ') || `${ROTULOS.length} rótulos`);
  const DESCARTADAS = /ユーザ(?!ー)|コミュニティー|カテゴリー|クリエーター|セッティング|デリート|インポート|エクスポート|ブラウザー|フォルダー/u;
  const descartadas = JA.filter(([, v]) => DESCARTADAS.test(v));
  check('53) ninguna grafía que la guía descartó', descartadas.length === 0,
    descartadas.slice(0, 5).map(([k, v]) => `${k}: «${v.match(DESCARTADAS)[0]}»`).join(' | ') || 'limpio');

  /*
   * DUPLICADOS SOSPECHOSOS: la misma frase del español traducida de dos
   * maneras. A veces el contexto lo pide —un botón y un título—, y entonces va
   * en `DISTINTAS_A_PROPOSITO` con su porqué; si no, es una inconsistencia.
   */
  const DISTINTAS_A_PROPOSITO = new Set([
    /* «Próximamente»: una función que llega (近日公開) no es un idioma que llega (近日対応). Glosario § 10.6. */
    'language.comingSoon',
    /* «Contacto»: los datos de contacto de un negocio (連絡先), no el canal de soporte de Ayuda (お問い合わせ). */
    'business.profileContact',
    /* «Publicaciones»: en Writer es un tipo de texto, lo que se escribe para las redes (SNS投稿), no las publicaciones de Weë. */
    'studio.wrPosts',
    /* «Destacados»: los negocios destacados del directorio (注目のビジネス), no las publicaciones destacadas del Home. */
    'weebiz.featured',
    /* «Corto / Medio / Largo»: el largo del pelo (ショート / ミディアム / ロング), no la duración de un vídeo (短め / 標準 / 長め). */
    'aiAvatar.hairShort', 'aiAvatar.hairMedium', 'aiAvatar.hairLong',
    /* «Mejorar»: mejorar un texto (改善), no la calidad de una imagen (画質を改善). */
    'writer.improve',
    /* «Media»: la pestaña de fotos y vídeos del perfil (メディア), no un nivel medio de Chef (ふつう). */
    'profile.tabMedia',
    /* «Suave»: la luz suave (やわらかい光) y el movimiento suave (なめらか) no son la misma suavidad que la calma (ゆったり). */
    'studio.ltSoft', 'studio.smSmooth',
    /* «Natural»: un movimiento natural (自然), no la luz natural (自然光). */
    'studio.smNatural',
    /* «Materiales»: el coste de los materiales de un precio (材料費), no de qué está hecho un objeto en Weë Design (素材). */
    'business.pricingMaterials',
    /* «Servicios»: la categoría de negocios profesionales del directorio (専門サービス), no el gasto de luz, agua e internet (光熱費・通信費). */
    'weebiz.catProfessionalServices',
    /* «Seguir»: seguir a un negocio (フォロー), no el movimiento de cámara que va detrás del sujeto (追いかける). */
    'weebiz.follow',
    /* «N días»: lo que dura un viaje se dice «10泊11日», sin 間; lo que dura una encuesta, 3日間. */
    'weeai.tripDays_other',
  ]);
  const porFrase = new Map();
  for (const [k, v] of JA) {
    const e = ES[k];
    if (typeof e !== 'string' || /_one$/.test(k) || DISTINTAS_A_PROPOSITO.has(k)) continue;
    if (!porFrase.has(e)) porFrase.set(e, new Map());
    const m = porFrase.get(e);
    m.set(v, [...(m.get(v) || []), k]);
  }
  const inconsistentes = [...porFrase].filter(([, m]) => m.size > 1);
  check('54) la misma frase española se dice igual en toda la app, salvo excepciones con su porqué', inconsistentes.length === 0,
    inconsistentes.slice(0, 4).map(([e, m]) => `«${e.slice(0, 20)}» → ${[...m].map(([v, ks]) => `«${v.slice(0, 14)}» (${ks[0]})`).join(' / ')}`).join(' | ') || 'coherente');
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
