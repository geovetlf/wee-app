#!/usr/bin/env node
/*
 * LOS TEXTOS QUE UNA PERSONA NATIVA TIENE QUE MIRAR PRIMERO.
 *
 * Saca del diccionario de cada idioma las frases cuyo error puede confundir a alguien o llevarle a una acción
 * equivocada: entrar en la cuenta, pagar, borrar, permisos, errores, navegación. Escribe un CSV por idioma en
 * `docs/i18n/revision-nativa/`, con las columnas de la revisión vacías. No marca nada como revisado.
 *
 *   node scripts/i18n-revision-critica.mjs
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ts = require(path.join(RAIZ, 'node_modules/typescript'));
const SALIDA = path.join(RAIZ, 'docs/i18n/revision-nativa');
fs.mkdirSync(SALIDA, { recursive: true });

const comoModulo = (js) => `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`;
const rutaDe = (p) => [`${p}.ts`, `${p}/index.ts`].find((x) => fs.existsSync(path.join(RAIZ, x)));
const cargados = new Map();
const cargar = async (ruta) => {
  if (cargados.has(ruta)) return cargados.get(ruta);
  let js = ts.transpileModule(fs.readFileSync(path.join(RAIZ, ruta), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
  for (const [, rel] of js.matchAll(/from ['"](\.[^'"]*)['"]/g)) {
    const url = (await cargar(rutaDe(path.posix.normalize(path.posix.join(path.posix.dirname(ruta), rel))))).url;
    js = js.split(`from '${rel}'`).join(`from '${url}'`).split(`from "${rel}"`).join(`from "${url}"`);
  }
  const r = { url: comoModulo(js), ns: await import(comoModulo(js)) };
  cargados.set(ruta, r);
  return r;
};
const aplanar = (o, pre = '', out = new Map()) => {
  for (const [k, v] of Object.entries(o)) {
    const c = pre ? `${pre}.${k}` : k;
    if (v && typeof v === 'object') aplanar(v, c, out); else if (typeof v === 'string') out.set(c, v);
  }
  return out;
};

/* En este orden: una clave cae en la primera categoría que encaje. */
const CATEGORIAS = [
  ['Autenticación y cuenta', /^auth\.|^onboarding\.|password|signIn|signOut|logout|deleteAccount/i],
  ['Pagos y Credits', /^credits\.|^movimientos\.|refund|purchase|payment|checkout|price|insufficient/i],
  ['Privacidad y permisos', /privacy|permission|terms|^location|consent|visibility|allowCamera|allowMic|legal/i],
  ['Acciones irreversibles', /delete|remove|destroy|discard|block|unfollow|burn|irrevers|confirmar|cancelSub/i],
  ['Errores y advertencias', /error|fail|warning|unavailable|notAvailable|noDisponible|invalid|^motor\.|^moderation\./i],
  ['Mensajes de Weë AI', /^weeai\.|^brain\.|^progreso\.|^resultado\./],
  ['Navegación y experiencias', /^menu\.|^nav\.|^creator\.[a-z]+$/],
  ['Ayuda y accesibilidad', /^help\.|accessib|a11y|Label$/],
];
const categoria = (k) => CATEGORIAS.find(([, re]) => re.test(k))?.[0];
const csv = (v) => `"${String(v ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;

const unir = async (c) => {
  const app = (await cargar(`i18n/textos/${c}/index.ts`)).ns;
  const dic = Object.entries(app).find(([k, v]) => v && typeof v === 'object' && k !== 'default')?.[1] ?? {};
  const rs = rutaDe(`i18n/textos/${c}/servidor`);
  const srv = rs ? (await cargar(rs)).ns.servidor : {};
  return aplanar({ ...dic, ...srv });
};
const es = await unir('es');
const en = await unir('en');
const idiomas = fs.readdirSync(path.join(RAIZ, 'i18n/textos')).filter((c) => !['es'].includes(c)).sort();
const claves = [...es.keys()].filter(categoria);
const porCat = {};
for (const k of claves) porCat[categoria(k)] = (porCat[categoria(k)] || 0) + 1;

const filas = [];
for (const c of idiomas) {
  const d = await unir(c);
  const lineas = [['categoria', 'clave', 'es', 'en', c, 'revisor', 'fecha', 'veredicto', 'correccion'].join(',')];
  for (const [cat] of CATEGORIAS) for (const k of claves) if (categoria(k) === cat) lineas.push([cat, k, es.get(k), en.get(k), d.get(k)].map(csv).join(',') + ',,,,');
  fs.writeFileSync(path.join(SALIDA, `${c}.csv`), '﻿' + lineas.join('\n') + '\n');
  filas.push([c, lineas.length - 1]);
}
console.log('claves críticas', claves.length, JSON.stringify(porCat));
console.log('idiomas', filas.length);
