/**
 * VALIDADOR DE MÓDULOS TRADUCIDOS, sin tsc (para trabajar en paralelo sin cargar la máquina).
 *
 *   node scripts/i18n-validar-modulo.mjs <idioma> [modulo ...]      (sin módulos: todos los que existan)
 *
 * Compara cada `i18n/textos/<idioma>/<ruta>.ts` con su gemelo de `i18n/textos/es/` y dice, por módulo:
 *   · claves que faltan, sobran o cambian de ORDEN (el orden del español se conserva);
 *   · valores vacíos o que no son texto;
 *   · huecos `{{…}}` distintos de los del español (los de su plural también valen);
 *   · formas de plural que su idioma no tiene (Intl.PluralRules) o que le faltan;
 *   · marcas de Weë perdidas o deformadas; texto fuera de NFC; caracteres de control;
 *   · frases IDÉNTICAS al español o al inglés (para revisar: casi siempre son un hueco sin traducir);
 *   · en groenlandés (kl): palabras danesas frecuentes y æ/ø/å, que la ortografía moderna de Kalaallisut no usa.
 * Sale con código 1 si hay errores (lo idéntico y lo danés se listan como AVISO, que hay que justificar o corregir).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const ts = require('typescript');
const [idioma, ...pedidos] = process.argv.slice(2);
if (!idioma) { console.error('uso: node scripts/i18n-validar-modulo.mjs <idioma> [modulo ...]'); process.exit(2); }

const comoModulo = (js) => 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');
const rutaDe = (base) => (fs.existsSync(path.join(RAIZ, base + '.ts')) ? base + '.ts' : base + '/index.ts');
const cache = new Map();
const cargar = async (ruta) => {
  if (cache.has(ruta)) return cache.get(ruta);
  let js = ts.transpileModule(fs.readFileSync(path.join(RAIZ, ruta), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
  const carpeta = path.posix.dirname(ruta);
  for (const [, rel] of js.matchAll(/from ['"](\.[^'"]*)['"]/g)) {
    const url = (await cargar(rutaDe(path.posix.normalize(path.posix.join(carpeta, rel))))).url;
    js = js.split(`from '${rel}'`).join(`from '${url}'`).split(`from "${rel}"`).join(`from "${url}"`);
  }
  const r = { url: comoModulo(js), ns: await import(comoModulo(js)) };
  cache.set(ruta, r);
  return r;
};

const aplanar = (o, pre = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? aplanar(v, pre + k + '.') : [[pre + k, v]]));
const huecos = (v) => [...String(v).matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]).sort();
const MARCAS = ['Weë AI', 'WEË AI', 'Weë Brain', 'Weë Studio', 'Weë Design', 'Weë Writer', 'Weë Music', 'Weë Chef', 'Weë Fashion', 'Weë Travel', 'Weë Photo', 'Weë Beauty', 'Weë Home', 'Weë Business', 'Weëls', 'Wäll', 'WeeTalk', 'ËContact', 'ẄContact', 'Credits', 'Filmmaker Engine', 'World Encode Entity'];
const cuenta = (t, m) => String(t).split(m).length - 1;
const cats = new Intl.PluralRules(idioma).resolvedOptions().pluralCategories;
const DANES = /(?<![\p{L}])(og|ikke|er|at|til|med|det|den|du|din|dit|dine|på|af|for|kan|vil|har|skal|som|eller|ved|fra|efter|meget|hvad|hvor|når|jeres|vores|venligst|tryk|indstillinger|gem|annuller|luk|send|slet)(?![\p{L}])/iu;

/* Los archivos de módulo del español (todo el árbol, servidor/ incluido), salvo los índices. */
const listar = (dir) => fs.readdirSync(path.join(RAIZ, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? listar(`${dir}/${e.name}`) : e.name.endsWith('.ts') && e.name !== 'index.ts' ? [`${dir}/${e.name}`] : []));
const todos = listar('i18n/textos/es').map((r) => r.replace('i18n/textos/es/', '').replace(/\.ts$/, ''))
  /* servidor/anteriores.ts es memoria del catálogo español (ANTERIORES), no una sección que se traduzca. */
  .filter((m) => m !== 'servidor/anteriores');
const objetivo = pedidos.length ? todos.filter((m) => pedidos.includes(m) || pedidos.includes(m.split('/').pop())) : todos.filter((m) => fs.existsSync(path.join(RAIZ, `i18n/textos/${idioma}/${m}.ts`)));

const EN = {};
let errores = 0;
let avisos = 0;
for (const mod of objetivo) {
  const rutaXX = `i18n/textos/${idioma}/${mod}.ts`;
  if (!fs.existsSync(path.join(RAIZ, rutaXX))) { console.log(`✘ ${mod}: no existe ${rutaXX}`); errores++; continue; }
  const exporta = (ns) => Object.values(ns).find((v) => v && typeof v === 'object');
  const es = aplanar(exporta((await cargar(`i18n/textos/es/${mod}.ts`)).ns));
  let xx;
  try { xx = aplanar(exporta((await cargar(rutaXX)).ns)); } catch (e) { console.log(`✘ ${mod}: no se puede cargar (${e.message.slice(0, 120)})`); errores++; continue; }
  const en = fs.existsSync(path.join(RAIZ, `i18n/textos/en/${mod}.ts`)) ? Object.fromEntries(aplanar(exporta((await cargar(`i18n/textos/en/${mod}.ts`)).ns))) : {};
  Object.assign(EN, en);
  const ES = Object.fromEntries(es);
  const XX = Object.fromEntries(xx);
  const mal = [];
  const raiz = (k) => k.replace(/_(zero|one|two|few|many|other)$/, '');
  const esPlural = (k) => /_(zero|one|two|few|many|other)$/.test(k) && (`${raiz(k)}_other` in ES);
  for (const [k] of es) if (!(k in XX) && !(esPlural(k) && !cats.includes(k.match(/_(\w+)$/)[1]))) mal.push(`falta ${k}`);
  for (const [k] of xx) if (!(k in ES)) {
    const forma = (k.match(/_(zero|one|two|few|many)$/) || [])[1];
    if (!(forma && `${raiz(k)}_other` in ES && cats.includes(forma))) mal.push(`sobra ${k}`);
  }
  for (const [k, v] of xx) {
    if (typeof v !== 'string' || !v.trim()) { mal.push(`vacío ${k}`); continue; }
    if (v !== v.normalize('NFC')) mal.push(`no NFC ${k}`);
    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F‎‏]/.test(v)) mal.push(`control ${k}`);
    const ref = ES[k] ?? ES[`${raiz(k)}_other`];
    if (ref !== undefined) {
      const conPlural = ES[`${raiz(k)}_other`];
      const ok = JSON.stringify(huecos(v)) === JSON.stringify(huecos(ref)) || (conPlural && JSON.stringify(huecos(v)) === JSON.stringify(huecos(conPlural)))
        || (/_one$/.test(k) && JSON.stringify(huecos(v).filter((h) => h !== 'contador')) === JSON.stringify(huecos(ref).filter((h) => h !== 'contador')));
      if (!ok) mal.push(`huecos ${k}: ${huecos(v)} ≠ ${huecos(ref)}`);
      for (const m of MARCAS) if (cuenta(v, m) < cuenta(ref, m)) mal.push(`marca perdida ${k}: ${m}`);
    }
  }
  /* El orden: las claves comunes en el mismo orden que el español. */
  const comunes = es.map(([k]) => k).filter((k) => k in XX);
  const suyas = xx.map(([k]) => k).filter((k) => k in ES);
  if (comunes.join('|') !== suyas.join('|')) mal.push('orden distinto del español');
  /* Avisos: idénticos al español o al inglés (con letras de verdad), y danés en groenlandés. */
  const iguales = xx.filter(([k, v]) => typeof v === 'string' && (String(ES[k] || '').replace(/\{\{[^}]+\}\}/g, '').match(/\p{L}/gu) || []).length >= 3 && (v === ES[k] || v === en[k]));
  const danes = idioma === 'kl' ? xx.filter(([, v]) => typeof v === 'string' && (DANES.test(v.replace(/\{\{[^}]+\}\}/g, '')) || /[æøåÆØÅ]/.test(v))) : [];
  if (mal.length) { errores += mal.length; console.log(`✘ ${mod} (${xx.length} claves): ${mal.length} error(es)\n   ${mal.slice(0, 12).join('\n   ')}`); }
  else console.log(`✔ ${mod} (${xx.length} claves)`);
  if (iguales.length) { avisos += iguales.length; console.log(`   ⚠ ${iguales.length} igual(es) al español/inglés: ${iguales.slice(0, 15).map(([k, v]) => `${k}=«${String(v).slice(0, 30)}»`).join(' · ')}`); }
  if (danes.length) { avisos += danes.length; console.log(`   ⚠ ${danes.length} con palabras danesas o æøå: ${danes.slice(0, 12).map(([k, v]) => `${k}=«${String(v).slice(0, 40)}»`).join(' · ')}`); }
}
console.log(`\n${objetivo.length} módulo(s) · ${errores} error(es) · ${avisos} aviso(s) para revisar`);
process.exit(errores ? 1 : 0);
