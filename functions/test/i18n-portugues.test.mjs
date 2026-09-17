/*
 * LAS DOS NORMAS DEL PORTUGUÉS, Y QUE NO SE CONFUNDAN.
 *
 * `pt` es un solo idioma con dos variantes: la brasileña —que es la base, en
 * `textos/pt`— y la europea, en `textos/pt-PT`. Esta prueba existe porque las
 * tres cosas que pueden salir mal aquí no se ven leyendo un diff:
 *
 * 1 · QUE EL EUROPEO SEA UNA LISTA DE PALABRAS CAMBIADAS. Sustituir «usuário»
 *     por «utilizador» es lo fácil y lo que menos importa. Lo que de verdad
 *     separa a Portugal de Brasil es la GRAMÁTICA: allí se dice «está a
 *     carregar» donde aquí «está carregando», y se tutea con «tu» donde el
 *     brasileño usa «você». Un texto con el léxico cambiado y la gramática
 *     brasileña se entiende en Lisboa y suena ajeno igual.
 *
 * 2 · QUE UN TELÉFONO DE ANGOLA RECIBA BRASILEÑO. Los aparatos no dicen solo
 *     `pt-PT`: dicen `pt-AO`, `pt-MZ`, `pt-CV`. Esas variedades siguen la norma
 *     europea, y sin diccionario propio caen en `pt`, que es el de Brasil.
 *
 * 3 · QUE ALGUIEN TOQUE EL BRASILEÑO SIN QUERER. `pt` está aprobado y cerrado.
 *     Aquí se comprueba que sigue siendo brasileño.
 *
 * Y una diferencia de plural que conviene tener escrita: el CERO cae en `one`
 * para `pt-BR` y en `other` para `pt-PT`. Brasil dice «0 produto» y Portugal
 * «0 produtos», y las dos están bien. Las claves usan {{contador}} en las dos
 * formas, así que cada norma sale correcta sin nada especial.
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
const modulos = fs.readdirSync(path.join(TEXTOS, 'es')).filter((f) => f.endsWith('.ts') && f !== 'index.ts');
const todo = (idioma) => {
  const out = [];
  for (const m of modulos) {
    const p = path.join(TEXTOS, idioma, m);
    if (!fs.existsSync(p)) continue;
    for (const x of fs.readFileSync(p, 'utf8').matchAll(RE)) out.push([`${m.replace('.ts', '')}.${x[1]}`, x[2]]);
  }
  return out;
};
const BR = todo('pt');
const PT = todo('pt-PT');
const ES = todo('es');

console.log('\n── A · Las dos normas están completas ──');
{
  check('1) el brasileño sigue entero', BR.length === ES.length, `${BR.length} / ${ES.length}`);
  /*
   * El europeo TIENE que estar completo. El motor lo dejaría caer a `pt` clave
   * por clave sin avisar, y una pantalla portuguesa con dos frases brasileñas
   * en medio es justo lo que no puede pasar.
   */
  check('2) el europeo también, sin apoyarse en el brasileño', PT.length === ES.length, `${PT.length} / ${ES.length}`);
  const suyas = new Set(PT.map(([k]) => k));
  const faltan = BR.map(([k]) => k).filter((k) => !suyas.has(k));
  const base = new Set(BR.map(([k]) => k));
  const sobran = [...suyas].filter((k) => !base.has(k));
  check('3) mismas claves que el brasileño, ni una menos ni una más',
    faltan.length === 0 && sobran.length === 0,
    faltan.length || sobran.length ? `faltan ${faltan.length} · sobran ${sobran.length}` : `${PT.length} claves`);
  const vacias = PT.filter(([, v]) => v.trim() === '');
  check('4) ninguna clave vacía', vacias.length === 0, vacias.slice(0, 4).map(([k]) => k).join(' ') || 'ninguna');
}

console.log('\n── B · Es portugués europeo, no brasileño con palabras cambiadas ──');
{
  const texto = PT.map(([, v]) => v).join('\n');

  /*
   * EL GERUNDIO. Es la prueba de fuego. En Portugal «estar + gerundio» se dice
   * «estar a + infinitivo», y un texto convertido palabra a palabra lo conserva
   * tal cual. Se busca el patrón brasileño; el europeo no lo tiene.
   */
  const GERUNDIO = /\b(est(á|ás|ou|amos|ão)|continua|continue|segue)\s+\p{L}+ndo\b/giu;
  const brasileños = [...new Set((texto.match(GERUNDIO) || []))];
  check('5) ningún gerundio a la brasileña («está carregando»)', brasileños.length === 0,
    brasileños.slice(0, 5).join(' | ') || 'ninguno');

  /* El trato. En Portugal, «você» suena distante; la app tutea con «tu». */
  const voce = PT.filter(([, v]) => /(?<![\p{L}])[Vv]ocê(?![\p{L}])/u.test(v));
  check('6) no se trata de «você», que es el trato brasileño', voce.length === 0,
    voce.slice(0, 4).map(([k]) => k).join(' ') || 'ninguno');

  /*
   * Y el léxico, que es lo fácil pero también tiene que estar. Pares
   * [brasileño, europeo]: si el brasileño usa el primero, el europeo no puede.
   */
  const PARES = [
    ['usuário', 'utilizador'], ['celular', 'telemóvel'], ['tela', 'ecrã'],
    ['arquivo', 'ficheiro'], ['senha', 'palavra-passe'], ['configurações', 'definições'],
    ['compartilhar', 'partilhar'], ['curtir', 'gostar'], ['excluir', 'eliminar'],
    ['salvar', 'guardar'], ['cadastr', 'registar'], ['registro', 'registo'],
    ['contato', 'contacto'], ['time', 'equipa'], ['xícara', 'chávena'],
  ];
  const textoBR = BR.map(([, v]) => v).join('\n');
  const P = (s) => new RegExp(`(?<![\\p{L}])${s}`, 'iu');
  const colados = [], ausentes = [];
  let mirados = 0;
  for (const [br, pt] of PARES) {
    if (!P(br).test(textoBR)) continue;   /* si el brasileño no lo usa, no aplica */
    mirados++;
    if (P(br).test(texto)) colados.push(`«${br}» (debería ser «${pt}»)`);
    if (!P(pt).test(texto)) ausentes.push(`falta «${pt}» (${br})`);
  }
  check('7) no queda ni una palabra brasileña de la lista', colados.length === 0,
    colados.slice(0, 5).join(' | ') || `${mirados} pares comprobados`);
  check('8) y sí aparece la palabra que se usa en Portugal', ausentes.length === 0,
    ausentes.slice(0, 5).join(' | ') || `${mirados} pares comprobados`);
}

console.log('\n── C · El brasileño no se ha tocado ──');
{
  const textoBR = BR.map(([, v]) => v).join('\n');
  /* Si alguien «europeizó» el brasileño por error, esto lo caza. */
  const europeos = ['utilizador', 'telemóvel', 'palavra-passe', 'definições', 'ficheiro']
    .filter((w) => new RegExp(`(?<![\\p{L}])${w}`, 'iu').test(textoBR));
  check('9) el brasileño sigue siendo brasileño', europeos.length === 0,
    europeos.join(' ') || 'sin contaminar');
  check('10) y sigue tuteando con «você»', /(?<![\p{L}])você(?![\p{L}])/iu.test(textoBR));
}

console.log('\n── D · Marcas e interpolaciones ──');
{
  const MARCAS = ['Weë', 'Wäll', 'Weëls', 'WeeTalk', 'ËContact', 'ẄContact', 'Credits',
    'Weë AI', 'Weë Studio', 'Weë Brain', 'Weë Business', 'Weë Chef', 'Weë Travel'];
  const es = Object.fromEntries(ES);
  const perdidas = [];
  for (const [k, v] of PT) {
    if (es[k] === undefined) continue;
    for (const m of MARCAS) if (es[k].includes(m) && !v.includes(m)) perdidas.push(`${k} → falta «${m}»`);
  }
  check('11) ninguna marca de Weë perdida', perdidas.length === 0,
    perdidas.slice(0, 5).join(' | ') || `${MARCAS.length} marcas`);
  const moneda = PT.filter(([, v]) => /(?<![\p{L}])[Cc]réditos?(?![\p{L}])/u.test(v));
  check('12) «Credits» no se ha traducido', moneda.length === 0,
    moneda.slice(0, 4).map(([k]) => k).join(' ') || 'intacta');

  const huecos = (v) => [...new Set([...String(v).matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]))].sort().join(',');
  /*
   * Clave contra clave, `_one` incluido. Y aquí va una advertencia, porque yo
   * mismo caí en la trampa: la prueba del CHINO compara `_one` contra el
   * `_other` español, y eso allí es correcto —el chino no tiene plural, así que
   * su `_one` no se lee nunca y refleja al `_other`—. En portugués es falso: el
   * `_one` SÍ se usa, con 1, y el español lo escribe distinto a propósito
   * («la forma de empezar» frente a «las {{contador}} formas»). Copiar la regla
   * china aquí acusaba al portugués de perder un hueco que no debía tener.
   */
  const mal = [];
  for (const [k, v] of PT) {
    if (es[k] === undefined) continue;
    const suyos = huecos(v).split(',').filter(Boolean);
    const nuestros = huecos(es[k]).split(',').filter(Boolean);
    /*
     * PERDER un hueco es un error: el dato no se pinta. AÑADIR `{{contador}}` a
     * una clave de plural NO lo es, y de hecho es lo correcto: el español
     * escribe «1 {{lista}}» con un uno a pelo, y ninguna traducción lo copia
     * —en portugués funcionaría, pero el brasileño LO NECESITA porque allí el
     * cero también cae en `_one`, y tener las dos normas iguales vale más que
     * ahorrar un hueco—. Es la misma excepción que ya hace el auditor de
     * paridad, y la única que se admite.
     */
    const perdidos = nuestros.filter((h) => !suyos.includes(h));
    const anadidos = suyos.filter((h) => !nuestros.includes(h));
    const legitimo = anadidos.length === 1 && anadidos[0] === 'contador' && /_(one|other)$/.test(k);
    if (perdidos.length || (anadidos.length && !legitimo)) {
      mal.push(`${k}: es[${nuestros.join(',')}] vs [${suyos.join(',')}]`);
    }
  }
  check('13) las mismas interpolaciones que el español', mal.length === 0,
    mal.slice(0, 5).join(' | ') || 'idénticas');

  const inventadas = PT.filter(([k]) => /_(few|many|zero|two)$/.test(k));
  check('14) sin formas de plural inventadas', inventadas.length === 0,
    inventadas.map(([k]) => k).join(' ') || 'ninguna');
}

console.log('\n── E · Cada aparato recibe su norma ──');
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

  /* Una clave que las dos normas escriben distinto sirve de sonda. */
  const sonda = 'settings.title';
  const enBR = Object.fromEntries(BR)[sonda];
  const enPT = Object.fromEntries(PT)[sonda];
  check('15) las dos normas NO dicen lo mismo en la sonda', enBR !== enPT,
    `${sonda}: «${enBR}» vs «${enPT}»`);

  const EUROPEOS = ['pt-PT', 'pt-AO', 'pt-MZ', 'pt-CV', 'pt-GW', 'pt-ST', 'pt-TL', 'pt-MO'];
  const BRASIL = ['pt', 'pt-BR'];
  const malEU = EUROPEOS.filter((l) => traducir.crearTraductor(l, dicc)(sonda) !== enPT);
  check('16) los ocho locales europeos reciben el portugués de Portugal', malEU.length === 0,
    malEU.join(' ') || EUROPEOS.join(' '));
  const malBR = BRASIL.filter((l) => traducir.crearTraductor(l, dicc)(sonda) !== enBR);
  check('17) y pt-BR sigue recibiendo el brasileño', malBR.length === 0,
    malBR.join(' ') || BRASIL.join(' '));

  /* El cero, que cae distinto en cada norma y en las dos está bien. */
  const tBR = traducir.crearTraductor('pt-BR', dicc);
  const tPT = traducir.crearTraductor('pt-PT', dicc);
  check('18) con cero, cada norma usa su forma', tBR('communities.members', { contador: 0 }) !== tPT('communities.members', { contador: 0 }),
    `pt-BR «${tBR('communities.members', { contador: 0 })}» · pt-PT «${tPT('communities.members', { contador: 0 })}»`);
}

console.log('\n── F · El catálogo y los diccionarios dicen lo mismo ──');
{
  const cat = leer('i18n/idiomas.ts');
  const dic = leer('i18n/diccionarios.ts');
  const bloque = (cat.match(/locale: 'pt-PT'[\s\S]*?cubre: \[([^\]]*)\]/) || [, ''])[1];
  const cubiertos = [...bloque.matchAll(/'(pt-[\w]+)'/g)].map((m) => m[1]);
  const sinDiccionario = cubiertos.filter((l) => !new RegExp(`'${l}':`).test(dic));
  check('19) cada locale europeo del catálogo tiene diccionario', sinDiccionario.length === 0,
    sinDiccionario.join(' ') || `${cubiertos.length} locales`);
  const registrados = [...dic.matchAll(/^ {2}'(pt-[\w]+)':/gm)].map((m) => m[1]);
  const huerfanos = registrados.filter((l) => !cubiertos.includes(l));
  check('20) y ningún alias registrado sin declarar', huerfanos.length === 0,
    huerfanos.join(' ') || `${registrados.length} alias`);
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
