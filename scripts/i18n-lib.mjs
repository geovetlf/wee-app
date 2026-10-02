/**
 * PIEZAS COMUNES DE LAS HERRAMIENTAS DE IDIOMA (huella de los catálogos y revisión humana).
 *
 * Funciones puras —nada lee ni escribe el disco salvo `cargarDiccionarios`—, para que las pruebas las ejecuten sin
 * tocar el proyecto: `functions/test/i18n-huella.test.mjs` y `functions/test/i18n-revision.test.mjs`.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(RAIZ, 'functions/package.json'));

/* ── Cargar los diccionarios de verdad (el registro de la app), sin empaquetador ─────────────────────────── */

export const cargarDiccionarios = async () => {
  const ts = require('typescript');
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
  const { DICCIONARIOS } = (await cargar('i18n/diccionarios.ts')).ns;
  const servidorEs = (await cargar('i18n/textos/es/servidor/index.ts')).ns.servidor;
  return { DICCIONARIOS, SECCIONES_DEL_SERVIDOR: new Set(Object.keys(servidorEs)) };
};

export const aplanar = (o, pre = '') =>
  Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' && v ? aplanar(v, pre + k + '.') : [[pre + k, String(v)]]));

/** Cada diccionario una vez, con el código con que lo registra el catálogo (los alias apuntan al mismo objeto). */
export const diccionariosUnicos = (DICCIONARIOS) => {
  const unicos = [];
  for (const [codigo, d] of Object.entries(DICCIONARIOS)) if (!unicos.some(([, otro]) => otro === d)) unicos.push([codigo, d]);
  return unicos;
};

const sha = (texto) => crypto.createHash('sha256').update(texto, 'utf8').digest('hex').slice(0, 16);
export const huellaDelValor = (valor) => sha(String(valor).normalize('NFC'));

/* ── La huella: qué claves tiene cada idioma y qué dicen ─────────────────────────────────────────────────── */

export const calcularHuella = (DICCIONARIOS, SECCIONES_DEL_SERVIDOR) => {
  const salida = {};
  for (const [codigo, d] of diccionariosUnicos(DICCIONARIOS)) {
    const pares = aplanar(d).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    for (const seccion of ['app', 'servidor']) {
      const suyos = pares.filter(([k]) => SECCIONES_DEL_SERVIDOR.has(k.split('.')[0]) === (seccion === 'servidor'));
      if (!suyos.length) continue;
      salida[`${codigo}/${seccion}`] = {
        claves: suyos.length,
        huellaDeClaves: sha(suyos.map(([k]) => k).join('\n')),
        huellaDeTextos: sha(suyos.map(([k, v]) => `${k}=${v}`).join('\n')),
      };
    }
  }
  return salida;
};

/* ── La revisión: CSV, validación y escritura de una corrección ──────────────────────────────────────────── */

export const COLUMNAS = ['clave', 'seccion', 'archivo', 'contexto', 'es', 'en', 'actual', 'estado', 'revisada', 'correccion', 'nota'];

const comillas = (v) => {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const aCsv = (filas) => '﻿' + [COLUMNAS.join(','), ...filas.map((f) => COLUMNAS.map((c) => comillas(f[c])).join(','))].join('\r\n') + '\r\n';

/** CSV estándar (RFC 4180): comillas dobles, saltos de línea dentro de comillas, BOM opcional. */
export const leerCsv = (texto) => {
  const s = texto.replace(/^﻿/, '');
  const filas = [];
  let fila = [];
  let campo = '';
  let dentro = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (dentro) {
      if (c === '"' && s[i + 1] === '"') { campo += '"'; i++; } else if (c === '"') dentro = false; else campo += c;
    } else if (c === '"') dentro = true;
    else if (c === ',') { fila.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      fila.push(campo); campo = '';
      if (fila.length > 1 || fila[0] !== '') filas.push(fila);
      fila = [];
    } else campo += c;
  }
  if (campo !== '' || fila.length) { fila.push(campo); filas.push(fila); }
  const [cabecera, ...resto] = filas;
  return resto.map((f) => Object.fromEntries(cabecera.map((c, i) => [c, f[i] ?? ''])));
};

const HUECOS = (v) => [...String(v).matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]).sort().join(',');
const MARCAS = /Weë (?:AI|Studio|Design|Photo|Writer|Music|Beauty|Chef|Home|Business|Travel|Brain|Credits|Filmmaker)|WeeTalk|Weëls?|Wäll|ËContact|ẄContact|Credits|Weë/g;
const marcasDe = (v) => [...String(v).matchAll(MARCAS)].map((m) => m[0]).sort().join('|');

/**
 * Lo que una corrección no puede cambiar: los {{huecos}} (sus nombres), las marcas de Weë, los saltos de línea y los
 * espacios del borde. Y no puede quedar vacía. Devuelve la lista de problemas (vacía si se puede aplicar).
 */
export const problemasDeLaCorreccion = ({ actual, correccion, es }) => {
  const p = [];
  if (!String(correccion).trim()) p.push('vacía');
  if (HUECOS(correccion) !== HUECOS(actual)) p.push(`huecos distintos: «${HUECOS(actual)}» → «${HUECOS(correccion)}»`);
  if (marcasDe(correccion) !== marcasDe(actual) && marcasDe(correccion) !== marcasDe(es)) p.push(`marcas distintas: «${marcasDe(actual)}» → «${marcasDe(correccion)}»`);
  if ((String(correccion).match(/\n/g) || []).length !== (String(actual).match(/\n/g) || []).length) p.push('saltos de línea distintos');
  if (/^\s|\s$/.test(correccion) !== /^\s|\s$/.test(actual)) p.push('espacios del borde distintos');
  return p;
};

/** El literal TypeScript de un texto, con comilla simple, como escriben los diccionarios. */
export const literal = (valor) => `'${String(valor).normalize('NFC').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;

/**
 * Cambia el valor de UNA clave en el fuente de un módulo de diccionario. Solo claves de una línea
 * (`  clave: '…',`); una clave que ocupa varias líneas se corrige a mano y aquí se rechaza.
 */
export const aplicarEnFuente = (fuente, nombre, valor) => {
  const lineas = fuente.split('\n');
  const i = lineas.findIndex((l) => l.startsWith(`  ${nombre}:`));
  if (i < 0) throw new Error(`no está la clave ${nombre}`);
  if (!/,\s*$/.test(lineas[i]) || !/^ {2}[\w]+: (['"`]).*\1,\s*$/.test(lineas[i])) throw new Error(`${nombre} ocupa más de una línea: corrígela a mano`);
  lineas[i] = `  ${nombre}: ${literal(valor)},`;
  return lineas.join('\n');
};

/** El archivo de un idioma donde vive una clave («composer.place» → i18n/textos/da/composer.ts). */
export const archivoDeLaClave = (idioma, clave, SECCIONES_DEL_SERVIDOR) => {
  const [modulo] = clave.split('.');
  if (!SECCIONES_DEL_SERVIDOR.has(modulo)) return `i18n/textos/${idioma}/${modulo}.ts`;
  const base = `i18n/textos/${idioma}/servidor`;
  if (modulo !== 'plan') return `${base}/${modulo}.ts`;
  /* El plan está repartido: plan.ts y plan/{visual,texto,casa,negocio}.ts. */
  const nombre = clave.split('.').slice(1).join('.');
  for (const f of ['plan.ts', 'plan/visual.ts', 'plan/texto.ts', 'plan/casa.ts', 'plan/negocio.ts']) {
    const ruta = `${base}/${f}`;
    if (fs.existsSync(path.join(RAIZ, ruta)) && new RegExp(`^ {2}${nombre}: `, 'm').test(fs.readFileSync(path.join(RAIZ, ruta), 'utf8'))) return ruta;
  }
  return `${base}/plan.ts`;
};

/** El estado de revisión de un idioma: quién revisó qué valor, y si el valor de hoy sigue siendo ese. */
export const estadoDeRevision = (pares, registro) => {
  const ultimo = new Map();
  for (const e of registro) if (e.revisada) ultimo.set(e.clave, e);
  let humanas = 0;
  let agente = 0;
  let cambiadas = 0;
  for (const [k, v] of pares) {
    const e = ultimo.get(k);
    if (!e) continue;
    if (e.huella !== huellaDelValor(v)) { cambiadas++; continue; }
    if (e.tipo === 'humana') humanas++; else agente++;
  }
  return { total: pares.length, humanas, agente, cambiadas, sinRevisar: pares.length - humanas - agente - cambiadas };
};
