/**
 * LOS CARGADORES DE LOS DICCIONARIOS (lote L2, carga perezosa): qué carpeta de `i18n/textos/` sirve a cada clave del
 * registro y cómo se carga bajo demanda.
 *
 *   node scripts/i18n-cargadores.mjs              → reescribe i18n/cargadores.ts
 *   node scripts/i18n-cargadores.mjs --comprobar  → solo compara (lo mismo que la prueba)
 *
 * La lista de idiomas sigue teniendo UN solo sitio escrito a mano: `i18n/diccionarios.ts`. Este archivo no la copia,
 * la DEDUCE: carga el registro, carga cada carpeta y empareja cada clave con la carpeta cuyos módulos son los MISMOS
 * objetos (`{ ...ar, ...servidorAr }` conserva las referencias de `ar.common`). Así un alias (`pt-AO` → `pt-PT`, `de-LI`
 * → `de-CH`, `sr-ME` → `sr-Latn`) sale solo, y una línea nueva en el registro exige regenerar esto: lo vigila
 * `functions/test/i18n-l2-l3.test.mjs`.
 *
 * El español y el inglés NO tienen cargador: se precargan (`i18n/carga.ts`). Son la base y el respaldo final, y la
 * pantalla de error no puede depender de una carga que quizá fue lo que falló.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { RAIZ } from './i18n-lib.mjs';

const require = createRequire(import.meta.url);
const ts = require('typescript');
export const PRECARGADAS = ['es', 'en'];
const DESTINO = path.join(RAIZ, 'i18n/cargadores.ts');

const leer = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const comoModulo = (js) => 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');
const rutaDe = (base) => (fs.existsSync(path.join(RAIZ, base + '.ts')) ? base + '.ts' : base + '/index.ts');
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

/** Deduce {carpeta → {exportacion, conServidor}} y {clave → carpeta} desde el registro escrito a mano. */
export const deducir = async () => {
  const { DICCIONARIOS } = (await cargar('i18n/diccionarios.ts')).ns;
  const carpetas = fs.readdirSync(path.join(RAIZ, 'i18n/textos'), { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(RAIZ, 'i18n/textos', e.name, 'index.ts'))).map((e) => e.name).sort();
  const info = {};
  for (const c of carpetas) {
    const ns = (await cargar(`i18n/textos/${c}/index.ts`)).ns;
    const [exportacion, dic] = Object.entries(ns).find(([, v]) => v && typeof v === 'object' && v.common) || [];
    if (!exportacion) throw new Error(`i18n/textos/${c}: ninguna exportación con «common»`);
    const conServidor = fs.existsSync(path.join(RAIZ, `i18n/textos/${c}/servidor/index.ts`));
    const servidor = conServidor ? (await cargar(`i18n/textos/${c}/servidor/index.ts`)).ns.servidor : null;
    info[c] = { exportacion, dic, servidor };
  }
  const carpetaDe = {};
  for (const [clave, d] of Object.entries(DICCIONARIOS)) {
    const c = Object.keys(info).find((x) => info[x].dic.common === d.common);
    if (!c) throw new Error(`la clave «${clave}» del registro no sale de ninguna carpeta`);
    const srv = info[c].servidor;
    const usaServidor = !!srv && Object.keys(srv).every((s) => d[s] === srv[s]);
    if (srv && !usaServidor) throw new Error(`«${clave}» no lleva la sección del servidor de ${c}`);
    carpetaDe[clave] = c;
  }
  return { info, carpetaDe };
};

const generar = ({ info, carpetaDe }) => {
  const usadas = [...new Set(Object.values(carpetaDe))].filter((c) => !PRECARGADAS.includes(c)).sort();
  const q = (k) => (/^[a-z]+$/.test(k) ? k : `'${k}'`);
  const lineas = usadas.map((c) => {
    const { exportacion, servidor } = info[c];
    return servidor
      ? `  ${q(c)}: () => Promise.all([import('./textos/${c}'), import('./textos/${c}/servidor')]).then(([d, s]) => ({ ...d.${exportacion}, ...s.servidor })),`
      : `  ${q(c)}: () => import('./textos/${c}').then((d) => ({ ...d.${exportacion} })),`;
  });
  return `/*
 * GENERADO por \`node scripts/i18n-cargadores.mjs\` desde \`i18n/diccionarios.ts\`. NO SE EDITA A MANO.
 *
 * Lote L2 (carga perezosa): cada carpeta de \`i18n/textos/\` que no se precarga tiene aquí su cargador, con
 * \`import()\` literal para que el empaquetador pueda separarla, y cada clave del registro dice qué carpeta la sirve
 * (los alias comparten carpeta y, por tanto, el MISMO objeto una vez cargado). Quien carga y guarda es \`i18n/carga.ts\`.
 */
import type { Diccionario } from './traducir';

/** El español y el inglés se precargan: no tienen cargador. */
export const PRECARGADAS = ${JSON.stringify(PRECARGADAS).replace(/"/g, "'")} as const;

export const CARPETAS: Readonly<Record<string, () => Promise<Diccionario>>> = {
${lineas.join('\n')}
};

/** Clave del registro → carpeta que la sirve (variantes y alias incluidos). */
export const CARPETA_DE: Readonly<Record<string, string>> = {
${Object.entries(carpetaDe).map(([k, c]) => `  ${q(k)}: '${c}',`).join('\n')}
};
`;
};

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))) {
  const texto = generar(await deducir());
  if (process.argv.includes('--comprobar')) {
    const igual = fs.existsSync(DESTINO) && fs.readFileSync(DESTINO, 'utf8') === texto;
    console.log(igual ? 'los cargadores están al día' : 'i18n/cargadores.ts NO coincide con i18n/diccionarios.ts: regenéralo');
    process.exit(igual ? 0 : 1);
  }
  fs.writeFileSync(DESTINO, texto);
  console.log(`i18n/cargadores.ts: ${Object.keys(texto.match(/^ {2}\S+: \(\) =>/gm) || []).length} carpetas con cargador`);
}

export { generar };
