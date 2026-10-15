#!/usr/bin/env node
/*
 * LA HUELLA DE LOS INVARIANTES — `ops/guardian/huellas.mjs`.
 *
 *   node ops/guardian/huellas.mjs --verificar [--raiz <dir>]          0 conforme · 1 una comprobación cayó · 3 fallo (nunca verde)
 *   node ops/guardian/huellas.mjs --registrar [--autoriza "motivo"]   reescribe ops/guardian/huellas.json (solo una persona)
 *
 * Cada suite que vigila un invariante crítico (ops/guardian/invariantes.json) deja aquí la huella de SUS comprobaciones: cuántas
 * llamadas a `check(` hace y el hash del título de cada una (sin el número, que cambia al insertar). `--verificar` exige que
 * NINGUNA de las comprobaciones guardadas haya desaparecido o haya cambiado de título y que la suite no haga menos llamadas
 * que antes: la huella solo CRECE. Es lo que impide que una «corrección» pase borrando la prueba que la detectaba.
 *
 * Qué NO detecta (y se dice): reescribir el cuerpo de una comprobación manteniendo su título y su número de llamadas —una
 * aserción debilitada por dentro—. Para eso están las revisiones humanas de los PR que tocan estos archivos (están entre las
 * protecciones propias del Guardian) y los sabotajes de cada suite. `--registrar` que quita comprobaciones exige `--autoriza`
 * con el motivo y lo deja escrito en `bajas`: es una decisión de una persona, la autocorrección nunca lo ejecuta (la ruta
 * `ops/guardian/**` está entre las protegidas de ops/guardian/autocorreccion.mjs).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';
import { archivoDeSuite, leerMapa } from './dominios.mjs';

export const CONTRATO_HUELLAS = 'wee-guardian-huellas@1';
export const CONTRATO_INVARIANTES = 'wee-guardian-invariantes@1';
export const RUTA_HUELLAS = 'ops/guardian/huellas.json';
export const RUTA_INVARIANTES = 'ops/guardian/invariantes.json';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** El título de una comprobación, normalizado: sin el número del principio («34)», «12b)»), espacios colapsados. */
export const normalizarTitulo = (t) => String(t).replace(/^\s*\d+[a-z]?\)\s*/i, '').replace(/\s+/g, ' ').trim();
export const huellaDeTitulo = (t) => crypto.createHash('sha1').update(normalizarTitulo(t)).digest('hex').slice(0, 10);

/** Pura: el título literal de una llamada `check(...)` (cadena, plantilla sin sustituciones o plantilla con `${}` normalizado); null si no es literal. */
const tituloDe = (arg) => {
  if (!arg) return null;
  if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) return arg.text;
  if (ts.isTemplateExpression(arg)) return arg.head.text + arg.templateSpans.map((s) => `${'$'}{}${s.literal.text}`).join('');
  return null;
};

/**
 * Pura: de un texto de suite, { llamadas, titulos: [hash ordenado y único] }. Se LEE EL CÓDIGO (el árbol de TypeScript), no el texto:
 * una llamada comentada, o un `check(` dentro de una cadena, NO cuenta; así que comentar una comprobación para que «pase» se nota.
 * Los títulos que no son literales solo cuentan en `llamadas`.
 */
export const huellaDeSuite = (texto) => {
  const sf = ts.createSourceFile('suite.mjs', String(texto || ''), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const titulos = new Set();
  let llamadas = 0;
  const visitar = (n) => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'check') {
      llamadas++;
      const t = tituloDe(n.arguments[0]);
      if (t !== null) titulos.add(huellaDeTitulo(t));
    }
    ts.forEachChild(n, visitar);
  };
  visitar(sf);
  return { llamadas, titulos: [...titulos].sort() };
};

const leerJSON = (raiz, rel) => {
  let texto;
  try { texto = fs.readFileSync(path.join(raiz, rel), 'utf8'); } catch (e) { throw new Error(`falta ${rel} (${e.code || e.message})`); }
  try { return JSON.parse(texto.replace(/^﻿/, '')); } catch (e) { throw new Error(`${rel} no es JSON válido (${e.message})`); }
};

/** Pura: los problemas del catálogo de invariantes. */
export const validarInvariantes = ({ catalogo, dominios, existe }) => {
  const problemas = [];
  const p = (id, mensaje) => problemas.push({ id, mensaje });
  if (!catalogo || catalogo.contrato !== CONTRATO_INVARIANTES || !Array.isArray(catalogo.invariantes) || !catalogo.invariantes.length) {
    p('invariantes:contrato', `el catálogo no es del contrato ${CONTRATO_INVARIANTES} o está vacío`);
    return problemas;
  }
  const idsDominio = new Set((dominios?.dominios || []).map((d) => d.id));
  const vistos = new Set();
  for (const i of catalogo.invariantes) {
    if (!i || typeof i.id !== 'string' || !/^I-\d{2}$/.test(i.id)) { p('invariante:id', `id inválido: ${JSON.stringify(i?.id)}`); continue; }
    if (vistos.has(i.id)) p(`invariante:${i.id}:duplicado`, `${i.id} está dos veces`);
    vistos.add(i.id);
    if (typeof i.titulo !== 'string' || !i.titulo.trim() || typeof i.descripcion !== 'string' || !i.descripcion.trim()) p(`invariante:${i.id}:texto`, `${i.id} sin título o sin descripción`);
    if (!idsDominio.has(i.dominio)) p(`invariante:${i.id}:dominio`, `${i.id}: el dominio «${i.dominio}» no existe en el mapa`);
    if (!Array.isArray(i.suites) || !i.suites.length) { p(`invariante:${i.id}:suites`, `${i.id} no cita ninguna suite: nada lo vigila`); continue; }
    for (const s of i.suites) if (typeof s !== 'string' || !existe(archivoDeSuite(s))) p(`invariante:${i.id}:suite-inexistente:${s}`, `${i.id} cita «${s}» y ${archivoDeSuite(s)} no existe`);
  }
  return problemas;
};

/** Las suites con huella: las de todos los invariantes, sin repetir y ordenadas. */
export const suitesDeInvariantes = (catalogo) => [...new Set((catalogo.invariantes || []).flatMap((i) => i.suites || []))].sort();

/** Pura: lo que cayó entre la huella guardada y la actual de una suite. [] = conforme (puede haber MÁS comprobaciones). */
export const diferencias = (guardada, actual) => {
  const out = [];
  if (!actual) return [{ tipo: 'suite-ausente', detalle: 'la suite ya no existe' }];
  const perdidos = (guardada.titulos || []).filter((h) => !actual.titulos.includes(h));
  if (perdidos.length) out.push({ tipo: 'comprobaciones-perdidas', detalle: `${perdidos.length} comprobación(es) con título guardado ya no están (borradas o con otro título): ${perdidos.slice(0, 5).join(', ')}${perdidos.length > 5 ? '…' : ''}` });
  if (actual.llamadas < (guardada.llamadas || 0)) out.push({ tipo: 'menos-llamadas', detalle: `la suite hace ${actual.llamadas} llamadas a check() y tenía ${guardada.llamadas}` });
  return out;
};

/** Verifica la huella de todas las suites de invariantes. Devuelve { ok, problemas }. NUNCA lanza por una huella rota: la cuenta como problema. */
export const verificarHuellas = ({ raiz = REPO } = {}) => {
  const problemas = [];
  let catalogo; let guardadas; let mapa;
  try { catalogo = leerJSON(raiz, RUTA_INVARIANTES); } catch (e) { return { ok: false, problemas: [{ id: 'invariantes:ilegible', mensaje: e.message }] }; }
  try { guardadas = leerJSON(raiz, RUTA_HUELLAS); } catch (e) { return { ok: false, problemas: [{ id: 'huellas:ilegible', mensaje: `${e.message}: sin la huella no se puede garantizar que ninguna comprobación haya desaparecido` }] }; }
  try { mapa = leerMapa(raiz); } catch (e) { return { ok: false, problemas: [{ id: 'mapa:ilegible', mensaje: e.message }] }; }
  const existe = (rel) => { try { return fs.statSync(path.join(raiz, rel)).isFile(); } catch { return false; } };
  problemas.push(...validarInvariantes({ catalogo, dominios: mapa, existe }));
  if (!guardadas || guardadas.contrato !== CONTRATO_HUELLAS || typeof guardadas.suites !== 'object' || !guardadas.suites) {
    problemas.push({ id: 'huellas:contrato', mensaje: `${RUTA_HUELLAS} no es del contrato ${CONTRATO_HUELLAS}` });
    return { ok: false, problemas };
  }
  for (const s of suitesDeInvariantes(catalogo)) {
    const g = guardadas.suites[s];
    if (!g) { problemas.push({ id: `huella:${s}:sin-huella`, mensaje: `«${s}» vigila un invariante y no tiene huella guardada: ejecuta --registrar (una persona)` }); continue; }
    let texto = null;
    try { texto = fs.readFileSync(path.join(raiz, archivoDeSuite(s)), 'utf8'); } catch { /* ausente */ }
    for (const d of diferencias(g, texto === null ? null : huellaDeSuite(texto))) problemas.push({ id: `huella:${s}:${d.tipo}`, mensaje: `«${s}»: ${d.detalle}` });
  }
  for (const s of Object.keys(guardadas.suites)) {
    if (!suitesDeInvariantes(catalogo).includes(s)) problemas.push({ id: `huella:${s}:sobrante`, mensaje: `«${s}» tiene huella pero ya no vigila ningún invariante: quitarla es una baja (--registrar --autoriza)` });
  }
  return { ok: problemas.length === 0, problemas };
};

/** Pura: la huella nueva que saldría de registrar. `bajas` = lo que se perdería respecto a la guardada. */
export const construirHuellas = ({ catalogo, textos, previa = null, autorizacion = null }) => {
  const suites = {};
  const bajas = [];
  for (const s of suitesDeInvariantes(catalogo)) {
    const actual = huellaDeSuite(textos[s]);
    suites[s] = actual;
    const g = previa?.suites?.[s];
    if (g) for (const d of diferencias(g, actual)) bajas.push(`${s}: ${d.detalle}`);
  }
  if (previa?.suites) for (const s of Object.keys(previa.suites)) if (!suites[s]) bajas.push(`${s}: sale del catálogo de invariantes`);
  if (bajas.length && !autorizacion) {
    throw new Error(`registrar quitaría comprobaciones y no hay --autoriza "motivo": ${bajas.join(' | ')}`);
  }
  const historial = [...(previa?.bajas || []), ...(bajas.length ? [{ motivo: autorizacion, quitado: bajas }] : [])];
  return { contrato: CONTRATO_HUELLAS, nota: 'Huella de las comprobaciones de las suites de invariantes (ver ops/guardian/huellas.mjs). Solo crece; una baja exige --autoriza y queda en `bajas`.', suites, bajas: historial };
};

const principal = () => {
  const args = process.argv.slice(2);
  const i = args.indexOf('--raiz');
  const raiz = path.resolve(i >= 0 && args[i + 1] ? args[i + 1] : REPO);
  try {
    if (args.includes('--registrar')) {
      const catalogo = leerJSON(raiz, RUTA_INVARIANTES);
      let previa = null;
      try { previa = leerJSON(raiz, RUTA_HUELLAS); } catch { /* primera vez */ }
      const textos = {};
      for (const s of suitesDeInvariantes(catalogo)) textos[s] = fs.readFileSync(path.join(raiz, archivoDeSuite(s)), 'utf8');
      const a = args.indexOf('--autoriza');
      const nueva = construirHuellas({ catalogo, textos, previa, autorizacion: a >= 0 ? args[a + 1] || null : null });
      fs.writeFileSync(path.join(raiz, RUTA_HUELLAS), `${JSON.stringify(nueva, null, 2)}\n`);
      console.log(`✔ ${RUTA_HUELLAS}: ${Object.keys(nueva.suites).length} suites, ${Object.values(nueva.suites).reduce((n, s) => n + s.titulos.length, 0)} títulos`);
      return;
    }
    const r = verificarHuellas({ raiz });
    if (r.ok) { console.log('✔ Huellas de los invariantes: ninguna comprobación ha caído.'); return; }
    console.log('✘ Huellas de los invariantes:');
    for (const p of r.problemas) console.log(`  · ${p.id}: ${p.mensaje}`);
    process.exitCode = 1;
  } catch (e) {
    console.error(`✘ Huellas: FALLO — ${e.message}`);
    process.exitCode = 3;
  }
};
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) principal();
