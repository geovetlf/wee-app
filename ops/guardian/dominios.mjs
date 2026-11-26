/*
 * EL MAPA DE DOMINIOS DEL GUARDIAN — `ops/guardian/dominios.mjs` (lo lee ops/guardian/verificar.mjs).
 *
 * Funciones PURAS (sin disco ni red salvo `leerMapa`) que validan `ops/guardian/dominios.json`: qué suites de la cadena de
 * `functions/package.json` vigilan cada parte de Weë. No es otro motor ni otra lista de pruebas: nombra las que ya existen,
 * por DOMINIO (créditos, identidad, trabajos asíncronos, media…) y nunca por experiencia, porque la regla maestra del
 * Harness es una sola capacidad común por dominios. Lo fija functions/test/guardian-dominios.test.mjs.
 *
 * Falla CERRADO: una suite citada que no existe o no está en la cadena, una suite de la cadena que ningún dominio vigila,
 * un dominio activo sin suites o un dominio crítico que no está activo es un PROBLEMA —nunca un verde—.
 */
import fs from 'node:fs';
import path from 'node:path';

export const CONTRATO_DOMINIOS = 'wee-guardian-dominios@1';
export const RUTA_DOMINIOS = 'ops/guardian/dominios.json';
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SUITE = /^[a-z0-9][a-z0-9.-]*$/;
export const ESTADOS = Object.freeze(['activo', 'pendiente']);

export const archivoDeSuite = (nombre) => `functions/test/${nombre}.test.mjs`;

/** Lee y parsea el mapa; lanza si falta o no es JSON (sin mapa no hay veredicto). */
export const leerMapa = (raiz, rel = RUTA_DOMINIOS) => {
  const abs = path.join(raiz, rel);
  let texto;
  try { texto = fs.readFileSync(abs, 'utf8'); } catch (e) { throw new Error(`falta ${rel}: sin el mapa de dominios del Guardian no hay veredicto (${e.code || e.message})`); }
  try { return JSON.parse(texto.replace(/^﻿/, '')); } catch (e) { throw new Error(`${rel} no es JSON válido (${e.message})`); }
};

/**
 * Pura: los problemas del mapa. `cadena` = las suites de `scripts.test` (nombres sin `.test.mjs`); `existe(rel)` = ¿hay ese
 * archivo? Devuelve { problemas: [{ id, mensaje }], cobertura: { total, sinDominio, multiples } }.
 */
export const validarDominios = ({ mapa, cadena, existe }) => {
  const problemas = [];
  const p = (id, mensaje) => problemas.push({ id, mensaje });
  if (!mapa || typeof mapa !== 'object' || mapa.contrato !== CONTRATO_DOMINIOS) {
    p('mapa:contrato', `el mapa no es del contrato ${CONTRATO_DOMINIOS}`);
    return { problemas, cobertura: { total: cadena.length, sinDominio: [...cadena], multiples: [] } };
  }
  if (!Array.isArray(mapa.dominios) || !mapa.dominios.length) {
    p('mapa:dominios', 'el mapa no trae dominios');
    return { problemas, cobertura: { total: cadena.length, sinDominio: [...cadena], multiples: [] } };
  }
  const enCadena = new Set(cadena);
  const ids = new Set();
  const vigiladas = new Map();
  for (const d of mapa.dominios) {
    const quien = d && typeof d.id === 'string' ? d.id : '(sin id)';
    if (!d || typeof d !== 'object' || typeof d.id !== 'string' || !ID.test(d.id)) { p('dominio:id', `un dominio con id inválido: ${JSON.stringify(d?.id)}`); continue; }
    if (ids.has(d.id)) p(`dominio:${d.id}:duplicado`, `el dominio «${d.id}» está dos veces`);
    ids.add(d.id);
    if (typeof d.nombre !== 'string' || !d.nombre.trim()) p(`dominio:${d.id}:nombre`, `«${quien}» no tiene nombre`);
    if (typeof d.critico !== 'boolean') p(`dominio:${d.id}:critico`, `«${quien}»: \`critico\` debe ser true o false`);
    if (!ESTADOS.includes(d.estado)) { p(`dominio:${d.id}:estado`, `«${quien}»: estado «${d.estado}» no es ${ESTADOS.join(' o ')}`); continue; }
    if (!Array.isArray(d.suites) || d.suites.some((s) => typeof s !== 'string' || !SUITE.test(s))) { p(`dominio:${d.id}:suites`, `«${quien}»: \`suites\` debe ser una lista de nombres`); continue; }
    if (new Set(d.suites).size !== d.suites.length) p(`dominio:${d.id}:suites-repetidas`, `«${quien}» repite una suite`);
    if (d.estado === 'activo') {
      if (!d.suites.length) p(`dominio:${d.id}:sin-suites`, `«${quien}» está activo y no cita ninguna suite: nada lo vigila`);
      for (const s of d.suites) {
        if (!enCadena.has(s)) p(`dominio:${d.id}:fuera-de-la-cadena:${s}`, `«${quien}» cita «${s}», que no está en la cadena de \`npm test\``);
        if (!existe(archivoDeSuite(s))) p(`dominio:${d.id}:suite-inexistente:${s}`, `«${quien}» cita «${s}» y ${archivoDeSuite(s)} no existe`);
        if (!vigiladas.has(s)) vigiladas.set(s, []);
        vigiladas.get(s).push(d.id);
      }
    } else {
      if (d.suites.length) p(`dominio:${d.id}:pendiente-con-suites`, `«${quien}» está pendiente y cita suites: si ya existen, que pase a \`activo\``);
      if (typeof d.pendiente !== 'string' || !d.pendiente.trim()) p(`dominio:${d.id}:sin-motivo`, `«${quien}» está pendiente y no dice por qué`);
      if (d.critico === true) p(`dominio:${d.id}:critico-pendiente`, `«${quien}» es crítico y no está activo: no se puede verificar y los críticos fallan cerrado`);
    }
  }
  const sinDominio = cadena.filter((s) => !vigiladas.has(s));
  for (const s of sinDominio) p(`cobertura:sin-dominio:${s}`, `la suite «${s}» está en la cadena y ningún dominio la vigila: añádela a ${RUTA_DOMINIOS}`);
  const multiples = [...vigiladas].filter(([, v]) => v.length > 1).map(([s, v]) => ({ suite: s, dominios: v }));
  return { problemas, cobertura: { total: cadena.length, sinDominio, multiples } };
};

/** Pura: los dominios a verificar según `--dominios a,b` y `--criticos`. Un id desconocido LANZA (no se ignora en silencio). */
export const seleccionar = (mapa, { dominios = null, criticos = false } = {}) => {
  const todos = mapa.dominios;
  if (dominios) {
    const conocidos = new Set(todos.map((d) => d.id));
    const malos = dominios.filter((x) => !conocidos.has(x));
    if (malos.length) throw new Error(`dominio desconocido: ${malos.join(', ')} (hay: ${[...conocidos].join(', ')})`);
    return todos.filter((d) => dominios.includes(d.id));
  }
  return criticos ? todos.filter((d) => d.critico) : todos;
};
