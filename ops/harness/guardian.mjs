#!/usr/bin/env node
/*
 * EL BUILD GUARDIAN DEL WEË HARNESS (F5) — `ops/harness/guardian.mjs`.
 *
 *   node ops/harness/guardian.mjs antes --archivos a,b [--json] [--max-por-nivel N] [--raiz <dir>]
 *   node ops/harness/guardian.mjs cambio --base <ref> [--json] [--max-por-nivel N] [--raiz <dir>]
 *
 * Una CAPA COMÚN QUE COORDINA, no otro guardián: no trae reglas propias ni copia tablas. Junta lo que ya protege
 * a Weë —el Quality Reviewer (zonas rojas, detectores, frontera, baseline, selector), la guardia de Claude
 * (settings.json + guardia.mjs), el mapa de producción (produccion.json, permitido.mjs, grupos.json, firebase.json),
 * las cercas de cierre que viven en las suites, el mapa de fronteras, las decisiones deliberadas y las extensiones
 * de F3— y lo dice ANTES de tocar (`antes`) o sobre un diff (`cambio`), con la fuente exacta de cada aviso (archivo y
 * línea, regla o ruta JSON). Es transversal: vale igual para el motor (Brain, Router, Gateway, adaptadores, Job,
 * Credits, Policy…), para Weë Studio y para cada experiencia, porque lee los mapas comunes, no una lista por sección.
 *
 * Niveles: CRITICAL (zona roja, ruta protegida, código vivo en producción, cercas, lo que haría caer G3 o un registro
 * de puertas), IMPORTANT (paquetes de contexto, suites de cada frontera, decisiones, aristas y carpetas nuevas,
 * dependencias, hallazgos nuevos que no bloquean) y CONTEXT (importadores directos, plan de revisión, contexto de F3,
 * los documentos de siempre). Un hallazgo por hecho, con todas sus rutas y fuentes, y un tope por nivel: lo que no
 * cabe se LISTA en `omitidos`, nunca se calla. Lo que no sale de una fuente no se dice: una ruta que no conoce nadie
 * no produce nada.
 *
 * INFORMA; NO BLOQUEA. No es una puerta nueva: sale 0 con cualquier informe (también con CRITICAL) y 2 si la entrada
 * no vale. Las puertas siguen siendo G3 (ops/revision/baseline.mjs) y la CI. No escribe nada, no despliega, no hace
 * push ni merge, y de git solo lee. JSON canónico (contrato `wee-guardian@1`, sin hora de reloj) y texto que sale del
 * JSON. Funciona sin Claude Code (Node y git; sin git, `antes` sigue con lo que hay en disco). Es de ingeniería: nada
 * de functions/src lo importa. Las fuentes escritas (mapa, decisiones, cercas, settings) se leen con las funciones
 * puras de `guardian-fuentes.mjs`. Lo fija functions/test/harness-guardian.test.mjs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';
import {
  RAIZ_POR_DEFECTO, git, archivosSeguidos, existeCommit, cambiosDesde, archivosEnBase, contenidosEnBase,
  esCodigo, esTest, esDeclaracion, coincide, leerArgumentos, lista, excluido,
} from '../revision/comun.mjs';
import { ZONAS_ROJAS } from '../revision/reglas.mjs';
import { parsear, importsDe, resolver, esRelativo, nombresUsadosComoValor, esDeValor } from '../revision/grafo.mjs';
import { exportsDe } from '../revision/frontera.mjs';
import { importadoresDirectos, planificar, RUTA_PAQUETES } from '../revision/selector.mjs';
import { analizar } from '../revision/detectores.mjs';
import { clasificar, validarBaseline, baselineVacia, cambiadosDesdeCorte } from '../revision/clasificacion.mjs';
import { RUTA_BASELINE } from '../revision/baseline.mjs';
import { decidir, DESPLEGABLE_DE } from '../permitido.mjs';
import { analizarTexto } from '../../.claude/hooks/guardia.mjs';
import { cargarRegistro, construirRegistro, conCapacidad, CARPETA as EXTENSIONES } from './extensiones.mjs';
import { suitesDeLaCadena } from '../../functions/test/_cadena.mjs';
import { trabajos, CI } from '../../scripts/ci-local.mjs';
import {
  recortar, unicos, filasDelMapa, decisionesDelTexto, cercasDeSuite, permisosDeSettings, resolverToken, casa,
} from './guardian-fuentes.mjs';

export { filasDelMapa, decisionesDelTexto, cercasDeSuite, permisosDeSettings, resolverToken, casa } from './guardian-fuentes.mjs';

export const CONTRATO = 'wee-guardian@1';
export const NIVELES = Object.freeze(['CRITICAL', 'IMPORTANT', 'CONTEXT']);
export const TOPES = Object.freeze({ CRITICAL: 40, IMPORTANT: 25, CONTEXT: 15 });
export const NOTA = 'Informa; no bloquea: las puertas siguen siendo G3 (ops/revision/baseline.mjs) y la CI.';
const HARNESS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
/** Prioridad dentro de cada nivel: lo que más importa sobrevive al tope. */
const ORDEN = ['g3', 'registro', 'ruta-protegida', 'produccion', 'guardia', 'cerca', 'zona-roja', 'exports', 'nuevo', 'arista',
  'carpeta', 'dependencias', 'frontera', 'decision', 'zona', 'plan', 'importadores', 'contexto-f3', 'siempre'];
const MAPA = 'docs/MAPA-DE-FRONTERAS.md';
const DECISIONES = 'docs/DECISIONES-DELIBERADAS.md';
const PRODUCCION = 'ops/produccion.json';
const INDICE = 'functions/src/index.ts';

export class ErrorDeEntrada extends Error {}

/* ── Utilidades ─────────────────────────────────────────────────────────── */

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
const memo = (f) => { let hecho = false; let v; return () => { if (!hecho) { v = f(); hecho = true; } return v; }; };
const leerHarness = (rel) => { try { return fs.readFileSync(path.join(HARNESS, rel), 'utf8'); } catch { return null; } };
/** La primera línea (1…n) de `texto` que contiene `cita`, desde la línea `desde`; null si no está. */
const lineaCon = (texto, cita, desde = 1) => {
  if (!texto) return null;
  const ls = texto.split(/\r?\n/);
  for (let i = Math.max(0, desde - 1); i < ls.length; i++) if (ls[i].includes(cita)) return i + 1;
  return null;
};
/** Una fuente con línea solo si la cita está de verdad en esa línea. */
const fuenteEnTexto = (archivo, texto, cita, extra = {}) => { const linea = lineaCon(texto, cita); return linea ? { archivo, linea, ...extra, cita } : null; };
const fuenteRegla = (regla) => ({ archivo: 'ops/revision/reglas.mjs', ...(fuenteEnTexto('ops/revision/reglas.mjs', leerHarness('ops/revision/reglas.mjs'), `id: '${regla}'`) || {}), regla });

/** Una ruta del repositorio, con barras normales; null si está vacía, es absoluta o sale del repositorio. */
export const normalizarRuta = (r) => {
  const s = String(r || '').trim().replace(/\\/g, '/').replace(/^\.\//, '');
  if (!s || s.startsWith('/') || /^[A-Za-z]:/.test(s)) return null;
  const n = path.posix.normalize(s).replace(/\/+$/, '');
  return !n || n === '.' || n.split('/').includes('..') ? null : n;
};

const resolverTodos = (ctx, tokens) => {
  const vistos = new Map();
  for (const t of tokens) { const x = resolverToken(t, ctx); if (x && !vistos.has(x.patron)) vistos.set(x.patron, x); }
  return [...vistos.values()];
};

/* ── El contexto de una pasada (perezoso: solo se calcula lo que se usa) ── */

const FUERA_DEL_DISCO = ['.git', 'node_modules', 'functions/lib', 'dist', 'web-build', '.expo', '.claude/worktrees', 'ops/harness/.cache', 'ops/revision/.cache'];
/** Sin git: los archivos del disco (sin dependencias, compilados ni cachés). */
const caminarDisco = (raiz) => {
  const res = [];
  const visitar = (rel) => {
    let entradas;
    try { entradas = fs.readdirSync(path.join(raiz, rel), { withFileTypes: true }); } catch { return; }
    for (const e of entradas) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (FUERA_DEL_DISCO.includes(r) || e.name === 'node_modules' || e.isSymbolicLink()) continue;
      if (e.isDirectory()) visitar(r);
      else if (e.isFile()) res.push(r);
    }
  };
  visitar('');
  return res.sort();
};

export const crearContexto = ({ raiz = RAIZ_POR_DEFECTO, registro = null, entorno = process.env } = {}) => {
  const r = path.resolve(raiz);
  const avisos = [];
  const conGit = git(r, ['rev-parse', '--is-inside-work-tree'], { permitirFallo: true }) !== null;
  if (!conGit) avisos.push('git no está disponible (o esto no es un repositorio): se lee el disco y permitido.mjs no puede comprobar la ascendencia');
  const seguidos = new Set(conGit ? archivosSeguidos(r) : caminarDisco(r));
  const todos = [...seguidos];
  const leer = (rel) => { try { return fs.readFileSync(path.join(r, rel), 'utf8'); } catch { return null; } };
  const ctx = {
    raiz: r, avisos, conGit, seguidos, leer, entorno,
    aviso: (m) => { if (!avisos.includes(m)) avisos.push(m); },
    existeArchivo: (rel) => seguidos.has(rel) || (() => { try { return fs.statSync(path.join(r, rel)).isFile(); } catch { return false; } })(),
    hayBajo: (dir) => todos.some((x) => x.startsWith(dir)),
    hayGlob: (g) => todos.some((x) => coincide(x, [g])),
  };
  ctx.json = (rel) => { const t = leer(rel); if (t === null) return null; try { return JSON.parse(t); } catch { ctx.aviso(`${rel} no es JSON válido: no se usa`); return null; } };
  ctx.head = memo(() => (conGit ? String(git(r, ['rev-parse', 'HEAD'], { permitirFallo: true }) || '').trim() || null : null));
  ctx.registro = memo(() => registro || cargarRegistro({ raiz: r, entorno }));
  ctx.paquetes = memo(() => ctx.json(RUTA_PAQUETES));
  ctx.mapa = memo(() => filasDelMapa(leer(MAPA)).map((f) => ({ ...f, resueltos: resolverTodos(ctx, f.donde) })));
  ctx.decisiones = memo(() => decisionesDelTexto(leer(DECISIONES)).map((d) => ({ ...d, resueltos: resolverTodos(ctx, d.tokens) })));
  ctx.cercas = memo(() => todos.filter((x) => /^functions\/test\/[^/]+\.mjs$/.test(x)).flatMap((x) => {
    const t = leer(x);
    return t && /diff --(numstat|name-only)/.test(t) ? cercasDeSuite(x, t) : [];
  }));
  ctx.funciones = memo(() => funcionesYCierres(ctx));
  ctx.desplegables = memo(() => desplegablesDe(ctx.json('firebase.json')));
  /* permitido.mjs → `contiene(vivo, candidato)`: git merge-base --is-ancestor; null si no se puede saber. */
  ctx.contiene = (vivo, candidato) => {
    if (!conGit || !/^[0-9a-f]{7,40}$/i.test(String(vivo || ''))) return null;
    if (git(r, ['cat-file', '-e', `${vivo}^{commit}`], { permitirFallo: true }) === null) return null;
    const x = spawnSync('git', ['-C', r, 'merge-base', '--is-ancestor', vivo, candidato], { windowsHide: true });
    return x.status === 0 ? true : x.status === 1 ? false : null;
  };
  return ctx;
};

/**
 * Cada función que exporta functions/src/index.ts → su CIERRE DE IMPORTS (su «código», como lo mide
 * docs/COMPARACION-PRODUCCION-MAIN.md §2): el módulo de entrada y todo lo que carga por valor (o con `import()`).
 * Las que se definen en index.ts cuentan el índice entero, como allí.
 */
const funcionesYCierres = (ctx) => {
  const texto = ctx.leer(INDICE);
  if (texto === null) return null;
  const aristas = new Map();
  for (const ruta of [...ctx.seguidos].filter((x) => x.startsWith('functions/src/') && esCodigo(x) && !esTest(x) && !esDeclaracion(x))) {
    const t = ruta === INDICE ? texto : ctx.leer(ruta);
    if (t === null) continue;
    const sf = parsear(ruta, t);
    const usados = nombresUsadosComoValor(sf);
    const destinos = new Set();
    for (const imp of importsDe(sf)) {
      if (!esRelativo(imp.especificador) || !(imp.tipo === 'dinamico' || esDeValor(imp, usados))) continue;
      for (const d of resolver(imp.relativoA || ruta, imp.especificador, ctx.seguidos, null).rutas) destinos.add(d);
    }
    aristas.set(ruta, destinos);
  }
  const cierres = new Map();
  const cierreDe = (entrada) => {
    if (!cierres.has(entrada)) {
      const visto = new Set([entrada]);
      const cola = [entrada];
      for (let i = 0; i < cola.length; i++) for (const w of aristas.get(cola[i]) || []) if (!visto.has(w)) { visto.add(w); cola.push(w); }
      cierres.set(entrada, visto);
    }
    return cierres.get(entrada);
  };
  const entradas = new Map();
  const poner = (n, d) => { if (!entradas.has(n)) entradas.set(n, new Set()); entradas.get(n).add(d); };
  for (const st of parsear(INDICE, texto).statements) {
    if (ts.isExportDeclaration(st)) {
      if (st.isTypeOnly) continue;
      const spec = st.moduleSpecifier && ts.isStringLiteral(st.moduleSpecifier) ? st.moduleSpecifier.text : null;
      const destinos = spec === null ? [INDICE] : esRelativo(spec) ? resolver(INDICE, spec, ctx.seguidos, null).rutas : [];
      if (!st.exportClause) {
        for (const d of destinos) { const t = ctx.leer(d); if (t !== null) for (const n of exportsDe(parsear(d, t))) if (!n.startsWith('* from')) poner(n, d); }
      } else if (ts.isNamedExports(st.exportClause)) for (const e of st.exportClause.elements) if (!e.isTypeOnly) for (const d of destinos) poner(e.name.text, d);
    } else if (st.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
      if (ts.isVariableStatement(st)) { for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name)) poner(d.name.text, INDICE); }
      else if ((ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st)) && st.name) poner(st.name.text, INDICE);
    }
  }
  const res = new Map();
  for (const [n, ds] of entradas) { const c = new Set(); for (const d of ds) for (const x of cierreDe(d)) c.add(x); res.set(n, c); }
  return res;
};

/** Lo que firebase.json publica que no es una función, con el nombre que entiende permitido.mjs (DESPLEGABLE_DE). */
const desplegablesDe = (fb) => {
  if (!fb) return [];
  const res = [];
  const poner = (objetivo, tipo, valor, json) => {
    if (typeof valor === 'string' && valor && DESPLEGABLE_DE[objetivo]) res.push({ objetivo, tipo, valor, json, patron: tipo === 'carpeta' ? `${valor.replace(/\/+$/, '')}/` : valor });
  };
  poner('firestore:rules', 'archivo', fb.firestore?.rules, 'firestore.rules');
  poner('firestore:indexes', 'archivo', fb.firestore?.indexes, 'firestore.indexes');
  poner('storage', 'archivo', fb.storage?.rules, 'storage.rules');
  const hosting = Array.isArray(fb.hosting) ? fb.hosting : fb.hosting ? [fb.hosting] : [];
  hosting.forEach((h, i) => poner(`hosting:${h.site}`, 'carpeta', h.public, Array.isArray(fb.hosting) ? `hosting[${i}].public` : 'hosting.public'));
  return res;
};

/* ── La colección: un hallazgo por hecho ────────────────────────────────── */

const ordenarFuente = (f) => Object.fromEntries(['archivo', 'linea', 'json', 'ref', 'regla', 'valor', 'cita']
  .filter((k) => f[k] !== undefined && f[k] !== null).map((k) => [k, f[k]]));
const claveDeFuente = (f) => JSON.stringify(ordenarFuente(f));

const coleccion = () => {
  const porId = new Map();
  return {
    poner(x) {
      const fuentes = (x.fuentes || []).filter(Boolean);
      const previo = porId.get(x.id);
      if (!previo) { porId.set(x.id, { ...x, rutas: [...(x.rutas || [])], fuentes: [] }); }
      const h = porId.get(x.id);
      if (previo) h.rutas.push(...(x.rutas || []));
      for (const f of fuentes) if (!h.fuentes.some((g) => claveDeFuente(g) === claveDeFuente(f))) h.fuentes.push(f);
      if (previo && NIVELES.indexOf(x.nivel) < NIVELES.indexOf(previo.nivel)) h.nivel = x.nivel;
    },
    obtener: (id) => porId.get(id) || null,
    lista: () => [...porId.values()],
  };
};

/* ── Lo que vale para cualquier ruta (antes y cambio) ───────────────────── */

const tituloZonaRoja = (glob) => `Zona roja «${glob}»: tocarla dispara siempre una revisión (frontera/cambio)`;
const zonasRojas = (ctx, rutas, h) => {
  const texto = leerHarness('ops/revision/reglas.mjs');
  const desde = lineaCon(texto, 'export const ZONAS_ROJAS') || 1;
  ZONAS_ROJAS.forEach((glob, i) => {
    const tocadas = rutas.filter((r) => coincide(r, [glob]));
    if (!tocadas.length) return;
    const linea = lineaCon(texto, `'${glob}'`, desde);
    h.poner({
      id: `zona-roja:${glob}`, nivel: 'CRITICAL', tipo: 'zona-roja', titulo: tituloZonaRoja(glob),
      detalle: 'Las zonas rojas son lo que mueve dinero, permisos, puertas, despliegue y la superficie pública.', rutas: tocadas,
      fuentes: [{ archivo: 'ops/revision/reglas.mjs', ...(linea ? { linea } : {}), ref: `ZONAS_ROJAS[${i}]`, valor: glob, ...(linea ? { cita: `'${glob}'` } : {}) }],
    });
  });
};

/* Las preguntas a la guardia van entre comillas DOBLES (su analizador cierra mal una palabra entre comillas simples)
   y solo con rutas que no se expanden dentro de ellas. */
const citable = (r) => !/["$`\\]/.test(r);
const TITULO_PROTEGIDA = {
  deny: 'Ruta de secretos o credenciales: Claude no la lee ni la toca nunca (settings.json y la guardia)',
  ask: 'Ruta protegida: escribirla la aprueba el dueño (settings.json y la guardia)',
};
const rutasProtegidas = (ctx, rutas, h) => {
  const settings = ctx.json('.claude/settings.json');
  for (const p of permisosDeSettings(settings)) {
    const tocadas = rutas.filter((r) => coincide(r, [p.glob]));
    if (!tocadas.length) continue;
    const fuente = { archivo: '.claude/settings.json', json: `permissions.${p.lista}[${p.indice}]`, valor: p.valor };
    h.poner({ id: `ruta-protegida:${p.lista}`, nivel: 'CRITICAL', tipo: 'ruta-protegida', titulo: TITULO_PROTEGIDA[p.lista], rutas: tocadas, fuentes: [fuente] });
  }
  /* La guardia de siempre, preguntada como si se fuera a escribir la ruta: su decisión y su motivo, tal cual. */
  for (const r of rutas) {
    if (!citable(r)) continue;
    const g = analizarTexto('Bash', `touch "${r}"`);
    if (!g || (g.decision !== 'deny' && g.decision !== 'ask')) continue;
    const fuente = { archivo: '.claude/hooks/guardia.mjs', ref: 'analizarTexto', valor: `${g.decision}: ${g.motivo}` };
    h.poner({ id: `ruta-protegida:${g.decision}`, nivel: 'CRITICAL', tipo: 'ruta-protegida', titulo: TITULO_PROTEGIDA[g.decision], rutas: [r], fuentes: [fuente] });
  }
};

const produccion = (ctx, rutas, h) => {
  const tocaFunciones = rutas.some((r) => r.startsWith('functions/src/'));
  const otros = ctx.desplegables().map((d) => ({ ...d, rutas: rutas.filter((r) => (d.tipo === 'archivo' ? r === d.patron : r.startsWith(d.patron))) })).filter((d) => d.rutas.length);
  if (!tocaFunciones && !otros.length) return;
  const manifiesto = ctx.json(PRODUCCION);
  if (!manifiesto) { ctx.aviso(`sin ${PRODUCCION}: no se sabe qué está vivo en producción`); return; }
  const vivas = new Map((manifiesto.funciones || []).map((f, i) => [f.funcion, { ...f, indice: i }]));
  const grupos = ctx.json('ops/despliegue/grupos.json');
  const grupoDe = (n) => (grupos?.grupos || []).find((g) => (g.funciones || []).includes(n))?.id || null;
  const porFuncion = [];
  if (tocaFunciones) {
    const mapa = ctx.funciones();
    if (!mapa) ctx.aviso(`no hay ${INDICE}: no se pueden calcular los cierres de las funciones`);
    else for (const [n, cierre] of mapa) { const t = rutas.filter((r) => cierre.has(r)); if (t.length) porFuncion.push([n, t]); }
  }
  porFuncion.sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const tocadas = porFuncion.filter(([n]) => vivas.has(n));
  const sinDesplegar = porFuncion.filter(([n]) => !vivas.has(n));
  const candidato = ctx.head();
  const veredicto = decidir({ manifiesto, funciones: tocadas.map(([n]) => n), otros: otros.map((d) => d.objetivo), contiene: ctx.contiene, candidato: candidato || 'HEAD' });
  const regla = { archivo: PRODUCCION, json: 'regla', valor: manifiesto.regla };
  const camino = fuenteEnTexto('docs/HARNESS.md', ctx.leer('docs/HARNESS.md'), 'El único camino a producción');
  if (tocadas.length) {
    h.poner({
      id: 'produccion:codigo-vivo', nivel: 'CRITICAL', tipo: 'produccion',
      titulo: `Código que corre en producción: ${plural(tocadas.length, 'función viva lo lleva', 'funciones vivas lo llevan')} en su cierre de imports (${recortar(tocadas.map(([n]) => n).join(', '), 120)})`,
      detalle: `${manifiesto.regla || ''} Se despliega por grupos (ops/despliegue/grupos.json) y permitido.mjs no deja desplegar un commit que no contenga lo vivo.`.trim(),
      rutas: tocadas.flatMap(([, t]) => t),
      fuentes: [regla, camino, grupos ? { archivo: 'ops/despliegue/grupos.json', json: 'regla' } : null,
        fuenteEnTexto('docs/COMPARACION-PRODUCCION-MAIN.md', ctx.leer('docs/COMPARACION-PRODUCCION-MAIN.md'), '«Su código» es el cierre de imports'), { archivo: 'ops/permitido.mjs', ref: 'decidir' }],
      datos: {
        candidato,
        funciones: tocadas.map(([n, t]) => { const f = vivas.get(n); return { funcion: n, json: `funciones[${f.indice}]`, commit: f.commit || null, tag: f.tag || null, grupo: grupoDe(n), enMain: f.enMain ?? null, rutas: t }; }),
        ...(sinDesplegar.length ? { sinDesplegar: sinDesplegar.map(([n, t]) => ({ funcion: n, rutas: t })) } : {}),
        avisos: veredicto.avisos,
      },
    });
  } else if (sinDesplegar.length) {
    h.poner({
      id: 'produccion:sin-desplegar', nivel: 'CONTEXT', tipo: 'produccion', titulo: `Código de funciones exportadas que no están en producción: ${sinDesplegar.map(([n]) => n).join(', ')}`,
      rutas: sinDesplegar.flatMap(([, t]) => t), fuentes: [regla], datos: { sinDesplegar: sinDesplegar.map(([n, t]) => ({ funcion: n, rutas: t })) },
    });
  }
  for (const d of otros) {
    const vivo = (manifiesto.otros || []).map((o, i) => ({ ...o, i })).find((o) => o.desplegable === DESPLEGABLE_DE[d.objetivo]);
    h.poner({
      id: `produccion:desplegable:${d.objetivo}`, nivel: 'CRITICAL', tipo: 'produccion',
      titulo: `Se publica en producción como ${d.objetivo}${vivo ? ` (vivo: ${String(vivo.commit).slice(0, 7)}${vivo.tag ? `, ${vivo.tag}` : ''})` : ' (no está en el mapa de producción)'}`,
      detalle: manifiesto.regla || undefined, rutas: d.rutas,
      fuentes: [{ archivo: 'firebase.json', json: d.json, valor: d.valor }, vivo ? { archivo: PRODUCCION, json: `otros[${vivo.i}]`, valor: vivo.desplegable } : null, camino, { archivo: 'ops/permitido.mjs', ref: 'decidir' }],
    });
  }
  const rutasDe = (x) => tocadas.find(([n]) => n === x)?.[1] || otros.find((d) => d.objetivo === x)?.rutas || [];
  const nombres = [...tocadas.map(([n]) => n), ...otros.map((d) => d.objetivo)];
  const deQuien = (m) => nombres.find((x) => m.startsWith(`${x}:`)) || null;
  for (const b of veredicto.bloqueos) {
    const x = deQuien(b);
    h.poner({
      id: `produccion:permitido:${x || b}`, nivel: 'CRITICAL', tipo: 'produccion',
      titulo: `permitido.mjs no dejaría desplegar ${x || 'esto'} desde ${String(candidato || 'HEAD').slice(0, 7)}: su código vivo no está en este commit`,
      detalle: b, rutas: x ? rutasDe(x) : [],
      fuentes: [{ archivo: 'ops/permitido.mjs', ref: 'decidir' }, vivas.has(x) ? { archivo: PRODUCCION, json: `funciones[${vivas.get(x).indice}]`, valor: x } : regla],
    });
  }
  if (veredicto.desconocido.length) {
    h.poner({
      id: 'produccion:sin-decidir', nivel: 'IMPORTANT', tipo: 'produccion', titulo: `permitido.mjs no puede decidir ${plural(veredicto.desconocido.length, 'despliegue', 'despliegues')}: falta git o el commit vivo en este clon`,
      detalle: veredicto.desconocido.join(' '), rutas: veredicto.desconocido.flatMap((m) => rutasDe(deQuien(m))), fuentes: [{ archivo: 'ops/permitido.mjs', ref: 'decidir' }, regla],
    });
  }
};

const cercas = (ctx, rutas, h) => {
  const specs = ctx.cercas();
  const tocadas = specs.map((s) => ({ s, rutas: rutas.filter((r) => s.rutas.some((p) => r === p || r.startsWith(`${p}/`))) })).filter((x) => x.rutas.length);
  const doc = fuenteEnTexto('docs/INTEGRACION-PRODUCCION.md', ctx.leer('docs/INTEGRACION-PRODUCCION.md'), 'Cercas de F1-D');
  const delDueno = doc ? ' (re-anclar es una autorización del dueño: docs/INTEGRACION-PRODUCCION.md §4 c y §9)' : '';
  const fuenteDe = (s) => ({ archivo: s.suite, linea: s.linea, ...(s.etiqueta ? { ref: s.etiqueta } : {}), valor: s.orden, cita: s.cita });
  if (tocadas.length) {
    const grupos = new Map();
    for (const { s, rutas: t } of tocadas) {
      const k = `${s.tipo}|${unicos(s.rutas).join(' ')}`;
      if (!grupos.has(k)) grupos.set(k, { tipo: s.tipo, rutas: unicos(s.rutas), fijadas: [], tocadas: new Set() });
      grupos.get(k).fijadas.push({ suite: s.suite, linea: s.linea, etiqueta: s.etiqueta, ref: s.ref });
      t.forEach((x) => grupos.get(k).tocadas.add(x));
    }
    const suites = unicos(tocadas.map(({ s }) => path.posix.basename(s.suite)));
    h.poner({
      id: 'cercas', nivel: 'CRITICAL', tipo: 'cerca',
      titulo: `${plural(tocadas.length, 'cerca de cierre fija', 'cercas de cierre fijan')} por nombre y tamaño lo que vas a tocar (${suites.join(', ')})`,
      detalle: `Cada una compara git diff con un commit fijo: si este cambio las mueve, su suite falla hasta que se re-anclen por nombre y tamaño${delDueno}.`,
      rutas: tocadas.flatMap((x) => x.rutas), fuentes: [...tocadas.map(({ s }) => fuenteDe(s)), doc],
      datos: { cercas: [...grupos.values()].map((g) => ({ tipo: g.tipo, rutas: g.rutas, tocadas: unicos([...g.tocadas]), fijadas: g.fijadas })) },
    });
  }
  for (const r of rutas) {
    const propias = specs.filter((s) => s.suite === r);
    if (propias.length) {
      h.poner({
        id: `cerca-propia:${r}`, nivel: 'CRITICAL', tipo: 'cerca', titulo: `Este archivo ES una cerca (${propias.length}): cambiarlo es re-anclarla o debilitarla`,
        detalle: `Fija ${unicos(propias.flatMap((s) => s.rutas)).join(', ')} contra ${unicos(propias.map((s) => s.ref)).join(', ')}${delDueno}.`,
        rutas: [r], fuentes: [...propias.map(fuenteDe), doc],
      });
    }
  }
};

const zonas = (ctx, rutas, h) => {
  const p = ctx.paquetes();
  if (!p || !p.zonas) return;
  /* Zonas con la misma lectura y el mismo revisor (seguridad y entrega comparten paquete) salen en UN hallazgo. */
  const porLectura = new Map();
  for (const [zona, globs] of Object.entries(p.zonas)) {
    const tocadas = rutas.filter((r) => coincide(r, globs));
    if (!tocadas.length) continue;
    const paquetes = (p.paquetes || []).map((x, i) => ({ x, i })).filter(({ x }) => (x.zonas || []).includes(zona));
    const docs = paquetes.flatMap(({ x }) => x.documentos || []);
    const revisores = Object.entries(p.revisores || {}).filter(([, d]) => (d.zonas || []).includes(zona)).map(([n]) => n);
    const clave = JSON.stringify([paquetes.map(({ x }) => x.id), revisores]);
    if (!porLectura.has(clave)) porLectura.set(clave, { zonas: [], rutas: [], fuentes: [], paquetes, docs, revisores });
    const g = porLectura.get(clave);
    g.zonas.push(zona);
    g.rutas.push(...tocadas);
    g.fuentes.push(...globs.map((x, i) => ({ x, i })).filter(({ x }) => tocadas.some((r) => coincide(r, [x]))).map(({ x, i }) => ({ archivo: RUTA_PAQUETES, json: `zonas.${zona}[${i}]`, valor: x })));
  }
  for (const g of porLectura.values()) {
    const legibles = g.docs.map((d) => `${d.ruta}${d.secciones ? ` § ${d.secciones.join(' · ')}` : ''}${ctx.existeArchivo(d.ruta) ? '' : ' (no existe)'}`);
    const lee = legibles.length ? `: lee antes ${recortar(legibles.join('; '), 200)}` : '';
    const revisa = g.revisores.length ? `${legibles.length ? ' —' : ':'} la revisa ${g.revisores.join(', ')}` : '';
    h.poner({
      id: `zona:${g.zonas.join('+')}`, nivel: 'IMPORTANT', tipo: 'zona', titulo: `${g.zonas.length > 1 ? 'Zonas' : 'Zona'} ${g.zonas.map((z) => `«${z}»`).join(', ')}${lee}${revisa}`,
      rutas: g.rutas, fuentes: [...g.fuentes, ...g.paquetes.map(({ x, i }) => ({ archivo: RUTA_PAQUETES, json: `paquetes[${i}]`, valor: x.id }))],
      datos: { zonas: g.zonas, documentos: g.docs.map((d) => ({ ruta: d.ruta, ...(d.secciones ? { secciones: d.secciones } : {}), existe: ctx.existeArchivo(d.ruta) })), revisores: g.revisores },
    });
  }
};

/** El nombre de la suite citada en el mapa → su archivo: `core-router` → test/core-router.test.mjs; `x.emulator` → x.emulator.mjs. */
const archivoDeSuite = (n) => `functions/test/${n}${/\.emulator$/.test(n) ? '' : '.test'}.mjs`;

const fronteras = (ctx, rutas, h) => {
  for (const f of ctx.mapa()) {
    const suitesDeLaFila = f.suites.map(archivoDeSuite);
    const tocadas = rutas.filter((r) => f.resueltos.some((x) => casa(r, x)) || suitesDeLaFila.includes(r));
    if (!tocadas.length) continue;
    const existen = suitesDeLaFila.filter((s) => ctx.existeArchivo(s));
    const faltan = suitesDeLaFila.filter((s) => !ctx.existeArchivo(s));
    h.poner({
      id: `frontera:${f.nombre}`, nivel: 'IMPORTANT', tipo: 'frontera',
      titulo: `Frontera «${f.nombre}»: ${existen.length ? `suites que la vigilan — ${existen.map((s) => path.posix.basename(s).replace(/(\.test)?\.mjs$/, '')).join(', ')}` : 'el mapa no cita suites que existan'}`,
      detalle: recortar(`La definen: ${f.defineTexto || '—'}. Estado: ${f.estado || '—'}${faltan.length ? `. Citadas sin archivo: ${faltan.join(', ')}` : ''}`, 420),
      rutas: tocadas, fuentes: [{ archivo: MAPA, linea: f.linea, ref: f.nombre, cita: f.cita }],
      datos: { suites: existen, ...(faltan.length ? { sinArchivo: faltan } : {}), define: f.define },
    });
  }
};

const decisiones = (ctx, rutas, h) => {
  for (const d of ctx.decisiones()) {
    const tocadas = rutas.filter((r) => d.resueltos.some((x) => casa(r, x)));
    if (!tocadas.length) continue;
    const estado = d.estado ? d.estado.split('. ')[0] : 'sin estado';
    h.poner({
      id: `decision:${d.id}`, nivel: 'IMPORTANT', tipo: 'decision', titulo: `${d.id} · ${recortar(d.titulo, 90)} — ${recortar(estado, 60)}`,
      detalle: d.seriaDefecto ? recortar(`Sería defecto si: ${d.seriaDefecto}`, 420) : d.estado || undefined,
      rutas: tocadas, fuentes: [{ archivo: DECISIONES, linea: d.linea, ref: d.id, cita: d.cita }],
    });
  }
};

const importadores = (ctx, rutas, h) => {
  const codigo = rutas.filter((r) => esCodigo(r) && !excluido(r) && ctx.existeArchivo(r));
  if (!codigo.length) return;
  const imp = importadoresDirectos(ctx.raiz, ctx.seguidos, codigo);
  if (!imp.length) return;
  h.poner({
    id: 'importadores', nivel: 'CONTEXT', tipo: 'importadores', titulo: `${plural(imp.length, 'archivo importa', 'archivos importan')} directamente lo que vas a tocar (grafo inverso, profundidad 1)`,
    detalle: recortar(imp.map((i) => i.ruta).join(', '), 300), rutas: codigo.filter((c) => imp.some((i) => i.importa.includes(c))),
    fuentes: [{ archivo: 'ops/revision/selector.mjs', ref: 'importadoresDirectos' }], datos: { importadores: imp },
  });
};

const contextoF3 = (ctx, rutas, h) => {
  for (const e of conCapacidad(ctx.registro(), 'contexto')) {
    e.manifiesto.capacidades.contexto.forEach((a, i) => {
      const tocadas = rutas.filter((r) => a.archivos.some((x) => r === x || r.startsWith(`${x.replace(/\/+$/, '')}/`)));
      if (!tocadas.length) return;
      h.poner({
        id: `contexto-f3:${e.id}/${a.id}`, nivel: 'CONTEXT', tipo: 'contexto-f3', titulo: `Extensión ${e.id} (${a.id}): lee antes ${a.documentos.join(', ')}`,
        detalle: a.descripcion || undefined, rutas: tocadas, fuentes: [{ archivo: e.archivo, json: `capacidades.contexto[${i}]`, valor: a.id }],
      });
    });
  }
};

const siempre = (ctx, rutas, h, hayAlgo) => {
  const p = ctx.paquetes();
  if (!p || !Array.isArray(p.siempre) || !p.siempre.length) return;
  if (!hayAlgo && !rutas.some((r) => ctx.existeArchivo(r))) return;
  const titulo = `Documentos de siempre para revisar cualquier cambio: ${p.siempre.map((d) => d.ruta).join(', ')}`;
  h.poner({ id: 'siempre', nivel: 'CONTEXT', tipo: 'siempre', titulo, rutas: [], fuentes: [{ archivo: RUTA_PAQUETES, json: 'siempre' }] });
};

export const evaluarRutas = (ctx, rutas, { conImportadores = true, h = coleccion() } = {}) => {
  for (const paso of [zonasRojas, rutasProtegidas, produccion, cercas, zonas, fronteras, decisiones]) paso(ctx, rutas, h);
  if (conImportadores) importadores(ctx, rutas, h);
  contextoF3(ctx, rutas, h);
  siempre(ctx, rutas, h, h.lista().length > 0);
  return h;
};

/* ── El informe ─────────────────────────────────────────────────────────── */

const normalizarHallazgo = (x) => ({
  id: x.id, nivel: x.nivel, tipo: x.tipo, titulo: x.titulo, ...(x.detalle ? { detalle: x.detalle } : {}),
  rutas: unicos(x.rutas || []), fuentes: x.fuentes.map(ordenarFuente), ...(x.datos ? { datos: x.datos } : {}),
});
const comparar = (a, b) => NIVELES.indexOf(a.nivel) - NIVELES.indexOf(b.nivel) || ORDEN.indexOf(a.tipo) - ORDEN.indexOf(b.tipo) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

export const topesDe = (valor) => {
  if (valor === undefined || valor === null) return { ...TOPES };
  const n = Number(valor);
  if (!Number.isInteger(n) || n < 1) throw new ErrorDeEntrada(`--max-por-nivel tiene que ser un entero ≥ 1 (es ${JSON.stringify(valor)})`);
  return Object.fromEntries(NIVELES.map((k) => [k, n]));
};

const informe = ({ modo, entrada, estado, h, avisos, max = TOPES }) => {
  const todos = h.lista().filter((x) => x.fuentes.some(Boolean)).map(normalizarHallazgo).sort(comparar);
  const hallazgos = [];
  const omitidos = [];
  for (const nivel of NIVELES) {
    const del = todos.filter((x) => x.nivel === nivel);
    hallazgos.push(...del.slice(0, max[nivel] ?? TOPES[nivel]));
    omitidos.push(...del.slice(max[nivel] ?? TOPES[nivel]).map((x) => ({ id: x.id, nivel, titulo: x.titulo })));
  }
  return {
    contrato: CONTRATO, modo, entrada, estado,
    resumen: Object.fromEntries(NIVELES.map((n) => [n, todos.filter((x) => x.nivel === n).length])),
    hallazgos, omitidos, avisos: [...avisos], nota: NOTA,
  };
};

export const aJSON = (r) => `${JSON.stringify(r, null, 2)}\n`;

const ICONO = { CRITICAL: '✖', IMPORTANT: '▲', CONTEXT: '·' };
export const fuenteLegible = (f) => `${f.regla ? `regla ${f.regla} · ` : ''}${f.archivo}${f.linea ? `:${f.linea}` : ''}${f.json ? ` → ${f.json}` : ''}${f.ref && !f.regla ? ` (${f.ref})` : ''}`;

/** El texto sale SOLO del informe (el mismo desde el JSON releído). */
export const aTexto = (r) => {
  const l = [];
  const que = r.modo === 'antes' ? `antes de tocar ${plural(r.entrada.archivos.length, 'archivo', 'archivos')}` : `cambio desde ${r.entrada.base} (${plural(r.entrada.rutas.length, 'archivo', 'archivos')})`;
  l.push(`Build Guardian de Weë · ${que}: ${NIVELES.map((n) => `${r.resumen[n]} ${n}`).join(' · ')}`, r.nota);
  for (const nivel of NIVELES) {
    const del = r.hallazgos.filter((x) => x.nivel === nivel);
    if (!del.length) continue;
    l.push('', `${nivel} (${r.resumen[nivel]})`);
    for (const x of del) {
      l.push(`  ${ICONO[nivel]} ${x.titulo}`);
      if (x.detalle) l.push(`      ${recortar(x.detalle, 320)}`);
      if (x.rutas.length) l.push(`      rutas: ${x.rutas.slice(0, 6).join(', ')}${x.rutas.length > 6 ? ` … y ${x.rutas.length - 6} más` : ''}`);
      for (const f of x.fuentes.slice(0, 4)) l.push(`      fuente: ${fuenteLegible(f)}`);
      if (x.fuentes.length > 4) l.push(`      … y ${x.fuentes.length - 4} fuente(s) más en el JSON`);
    }
  }
  if (!r.hallazgos.length) l.push('', 'Nada que avisar: ninguna fuente del Harness dice nada de estas rutas.');
  if (r.omitidos.length) {
    l.push('', `Fuera del tope por nivel (${r.omitidos.length}; están en el JSON, en «omitidos»):`);
    for (const o of r.omitidos.slice(0, 12)) l.push(`  · ${o.nivel} ${o.id}`);
  }
  if (r.avisos.length) l.push('', 'Avisos:', ...r.avisos.map((a) => `  · ${a}`));
  return `${l.join('\n')}\n`;
};

/* ── Modo «antes»: lo que hay que saber antes de tocar unas rutas ──────── */

const expandir = (ctx, pedidas) => {
  const res = new Set();
  for (const p of pedidas) {
    const bajo = p.includes('*') ? [...ctx.seguidos].filter((s) => coincide(s, [p])) : ctx.existeArchivo(p) ? [] : [...ctx.seguidos].filter((s) => s.startsWith(`${p}/`));
    if (bajo.length) bajo.forEach((x) => res.add(x));
    else if (!p.includes('*')) res.add(p);
  }
  return [...res].sort();
};

export const antes = ({ raiz = RAIZ_POR_DEFECTO, archivos, max = TOPES, registro = null, entorno = process.env } = {}) => {
  const pedidasCrudas = Array.isArray(archivos) ? archivos : [];
  if (!pedidasCrudas.length) throw new ErrorDeEntrada('antes necesita al menos una ruta: --archivos a,b');
  const malas = pedidasCrudas.filter((a) => !normalizarRuta(a));
  if (malas.length) throw new ErrorDeEntrada(`ruta vacía o fuera del repositorio: ${malas.join(', ')}`);
  const ctx = crearContexto({ raiz, registro, entorno });
  const pedidas = unicos(pedidasCrudas.map(normalizarRuta));
  const rutas = expandir(ctx, pedidas);
  for (const p of pedidas) {
    if (!p.includes('*') && !ctx.existeArchivo(p) && !rutas.some((r) => r.startsWith(`${p}/`))) ctx.aviso(`${p}: ni git ni el disco lo conocen; se evalúa como un archivo nuevo`);
    if (p.includes('*') && !rutas.some((r) => coincide(r, [p]))) ctx.aviso(`${p}: ningún archivo casa con ese patrón`);
  }
  const h = evaluarRutas(ctx, rutas);
  return informe({
    modo: 'antes', entrada: { archivos: rutas, ...(pedidas.join('\n') !== rutas.join('\n') ? { pedidas } : {}) },
    estado: { git: ctx.conGit, candidato: ctx.head() }, h, avisos: ctx.avisos, max,
  });
};

/* ── Modo «cambio»: lo que arriesga ESTE diff ──────────────────────────── */

/**
 * Lo que diría la puerta G3 de este árbol (clasificacion.mjs, con la baseline vigente y su corte) y lo NUEVO que no
 * bloquea. Los detectores corren contra `--base`: las dos reglas que comparan con la base (cruzar las 1000 líneas,
 * reglas de Firebase peligrosas) se miden aquí contra ella, no contra el corte. La decisión exacta de la puerta la da
 * `node ops/revision/baseline.mjs`; esto la ANTICIPA, no la sustituye.
 */
const revisionDeterminista = (ctx, resultado, enElDiff, h) => {
  const ruta = path.join(ctx.raiz, RUTA_BASELINE);
  let baseline = null;
  if (fs.existsSync(ruta)) {
    const b = ctx.json(RUTA_BASELINE);
    const errores = b ? validarBaseline(b) : ['no es JSON'];
    if (errores.length) ctx.aviso(`${RUTA_BASELINE} no es válida (${errores[0]}): sin ella no se distingue lo nuevo de lo conocido`);
    else baseline = b;
  } else ctx.aviso(`sin ${RUTA_BASELINE}: no se distingue lo nuevo de lo conocido; solo se dice lo que la puerta G3 bloquearía`);
  const c = clasificar(resultado.hallazgos, baseline || baselineVacia(), {
    cambiados: baseline ? cambiadosDesdeCorte(ctx.raiz, baseline.corte) : null,
    reglasActivas: new Set(Object.keys(resultado.reglas || {})),
  });
  const porId = new Map(c.resultados.map((x) => [x.id, x]));
  const bloquean = new Set();
  for (const motivo of c.puerta.motivos) {
    const id = motivo.slice(motivo.lastIndexOf(': ') + 2);
    const x = porId.get(id);
    if (!x) continue;
    bloquean.add(id);
    h.poner({
      id: `g3:${id}`, nivel: 'CRITICAL', tipo: 'g3', titulo: `La puerta G3 no pasaría${enElDiff(x) ? '' : ' (por algo de fuera de este diff)'}: ${motivo}`,
      detalle: x.mensaje, rutas: [x.evidencia.ruta],
      fuentes: [fuenteRegla(x.regla), { archivo: x.evidencia.ruta, linea: x.evidencia.linea }, { archivo: 'ops/revision/clasificacion.mjs', ref: 'clasificar' }],
    });
  }
  const nuevos = c.resultados.filter((x) => x.estado === 'NUEVO' && !bloquean.has(x.id) && enElDiff(x));
  for (const regla of unicos(nuevos.map((x) => x.regla))) {
    const de = nuevos.filter((x) => x.regla === regla);
    h.poner({
      id: `nuevo:${regla}`, nivel: 'IMPORTANT', tipo: 'nuevo', titulo: `${plural(de.length, 'hallazgo NUEVO', 'hallazgos NUEVOS')} de ${regla} (${unicos(de.map((x) => x.severidad)).join('/')}) en este cambio`,
      detalle: recortar(de.map((x) => `${x.evidencia.ruta}:${x.evidencia.linea} ${x.mensaje}`).join(' · '), 400), rutas: de.map((x) => x.evidencia.ruta),
      fuentes: [fuenteRegla(regla), { archivo: 'ops/revision/clasificacion.mjs', ref: 'clasificar' }],
      datos: { hallazgos: de.map((x) => ({ id: x.id, severidad: x.severidad, ruta: x.evidencia.ruta, linea: x.evidencia.linea, mensaje: x.mensaje })) },
    });
  }
};

/** Los disparadores de frontera (frontera.mjs → compararConBase), cada uno con lo que ya dicen el mapa y las decisiones. */
const disparadores = (ctx, resultado, h) => {
  const frontera = fuenteRegla('frontera/cambio');
  const vivas = new Map(((ctx.json(PRODUCCION) || {}).funciones || []).map((f, i) => [f.funcion, i]));
  for (const d of resultado.disparadores || []) {
    if (d.tipo === 'zona-roja') {
      h.poner({ id: `zona-roja:${d.detalle}`, nivel: 'CRITICAL', tipo: 'zona-roja', titulo: tituloZonaRoja(d.detalle), rutas: d.rutas, fuentes: [frontera] });
    } else if (d.tipo === 'arista-nueva') {
      const destino = String(d.detalle).split(' → ')[1] || '';
      const citan = (x) => x.tipo !== 'archivo' && (x.patron === `${destino}/` || x.patron === `${destino}/**`);
      const dds = ctx.decisiones().filter((dd) => dd.resueltos.some(citan));
      const filas = ctx.mapa().filter((f) => f.resueltos.some(citan));
      const dicen = [filas.length ? `Entra en la frontera ${filas.map((f) => `«${f.nombre}» (${f.estado.split('. ')[0]})`).join(', ')}.` : '',
        ...dds.map((dd) => `${dd.id} (${(dd.estado || '').split('. ')[0]}): sería defecto si ${dd.seriaDefecto || '—'}`)].filter(Boolean);
      h.poner({
        id: `arista:${d.detalle}`, nivel: 'IMPORTANT', tipo: 'arista', titulo: `Arista nueva entre carpetas: ${d.detalle} (${plural(d.rutas.length, 'archivo', 'archivos')})`,
        detalle: recortar(dicen.join(' ') || 'Una revisión de arquitectura tiene que mirarla.', 480), rutas: d.rutas,
        fuentes: [frontera, ...filas.map((f) => ({ archivo: MAPA, linea: f.linea, ref: f.nombre, cita: f.cita })),
          ...dds.map((dd) => ({ archivo: DECISIONES, linea: dd.linea, ref: dd.id, cita: dd.cita }))],
      });
    } else if (d.tipo === 'carpeta-nueva') {
      const detalle = 'Una carpeta nueva en functions/src es una pieza nueva de la arquitectura: la mira la revisión de arquitectura.';
      h.poner({ id: `carpeta:${d.detalle}`, nivel: 'IMPORTANT', tipo: 'carpeta', titulo: `Carpeta nueva en el servidor: ${d.detalle}`, detalle, rutas: d.rutas, fuentes: [frontera] });
    } else if (d.tipo === 'exports-index') {
      const vivasFuera = (d.retirados || []).filter((x) => vivas.has(x));
      const pierde = vivasFuera.length > 0;
      h.poner({
        id: 'exports:index', nivel: pierde ? 'CRITICAL' : 'IMPORTANT', tipo: 'exports',
        titulo: pierde ? `functions/src/index.ts deja de exportar ${plural(vivasFuera.length, 'función viva', 'funciones vivas')}: ${vivasFuera.join(', ')}`
          : `Cambian los exports de functions/src/index.ts: ${d.detalle}`,
        detalle: pierde ? 'Una función viva que el código ya no exporta es una capacidad que se pierde (ops/integracion/capacidades.mjs, fila «Funciones»).'
          : 'Una función nueva no está en producción: se desplegaría por primera vez, solo por el workflow.',
        rutas: d.rutas,
        fuentes: [frontera, ...vivasFuera.map((x) => ({ archivo: PRODUCCION, json: `funciones[${vivas.get(x)}]`, valor: x })),
          pierde ? { archivo: 'ops/integracion/capacidades.mjs', ref: 'comparar' } : null],
      });
    } else if (d.tipo === 'dependencias') {
      const detalle = d.cambios ? recortar(d.cambios.join('; '), 400) : 'Cambia el archivo de bloqueo.';
      h.poner({ id: `dependencias:${d.detalle}`, nivel: 'IMPORTANT', tipo: 'dependencias', titulo: `Cambian dependencias: ${d.detalle}`, detalle, rutas: d.rutas, fuentes: [frontera] });
    }
  }
};

/** ¿Se pierde algún registro de puertas? Las extensiones de F3, la CI y la cadena de npm test, base contra hoy. */
const registros = (ctx, base, rutas, h) => {
  const cambia = (p) => rutas.some((r) => r === p || r.startsWith(`${p}/`));
  if (cambia(EXTENSIONES)) {
    const enBase = archivosEnBase(ctx.raiz, base).filter((r) => r.startsWith(`${EXTENSIONES}/`) && r.endsWith('.json') && !r.slice(EXTENSIONES.length + 1).includes('/'));
    const textos = contenidosEnBase(ctx.raiz, base, enBase);
    const regBase = construirRegistro(enBase.filter((a) => textos.has(a)).map((a) => ({ archivo: a, texto: textos.get(a) })));
    const regHoy = cargarRegistro({ raiz: ctx.raiz, entorno: {} });
    const fila = (reg, id) => reg.extensiones.find((e) => e.id === id) || null;
    for (const e of regBase.extensiones.filter((x) => x.estado === 'activa')) {
      const hoy = fila(regHoy, e.id);
      if (hoy && hoy.estado === 'activa') continue;
      const puertas = (e.manifiesto.capacidades.comprobacion || []).map((a) => `${e.id}/${a.id}`);
      h.poner({
        id: `registro:f3:${e.id}`, nivel: 'CRITICAL', tipo: 'registro',
        titulo: `La extensión ${e.id} estaba activa en la base y ahora ${hoy ? `está ${hoy.estado}` : 'no existe'}${puertas.length ? `: deja de registrar ${puertas.join(', ')}` : ''}`,
        detalle: hoy ? hoy.motivos.join(' · ') : undefined, rutas: [e.archivo],
        fuentes: [{ archivo: e.archivo, json: 'estado' }, { archivo: 'ops/harness/extensiones.mjs', ref: 'construirRegistro' }],
      });
    }
    for (const e of regHoy.extensiones) {
      if (['rechazada', 'en-conflicto'].includes(e.estado)) {
        h.poner({
          id: `registro:f3:${e.id || e.archivo}`, nivel: 'CRITICAL', tipo: 'registro', titulo: `Extensión ${e.estado}: ${e.archivo} (extensiones.mjs validar saldría 1)`,
          detalle: e.motivos.join(' · '), rutas: [e.archivo], fuentes: [{ archivo: 'ops/harness/extensiones.mjs', ref: 'validarManifiesto' }],
        });
      } else if (e.estado === 'activa' && !fila(regBase, e.id)) {
        const titulo = `Extensión nueva y activa: ${e.id} (permisos: ${e.manifiesto.permisos.join(', ')})`;
        h.poner({ id: `registro:f3:${e.id}`, nivel: 'IMPORTANT', tipo: 'registro', titulo, rutas: [e.archivo], fuentes: [{ archivo: e.archivo, json: 'permisos' }] });
      }
    }
  }
  if (cambia(CI)) {
    const ciBase = trabajos(contenidosEnBase(ctx.raiz, base, [CI]).get(CI) || '');
    const ciHoy = trabajos(ctx.leer(CI) || '');
    const fuentesDe = (t) => [{ archivo: CI, ref: t.id }, { archivo: 'scripts/ci-local.mjs', ref: 'trabajos' }];
    for (const t of ciBase) {
      const hoy = ciHoy.find((x) => x.id === t.id);
      if (!hoy) {
        h.poner({ id: `registro:ci:${t.id}`, nivel: 'CRITICAL', tipo: 'registro', titulo: `Desaparece el trabajo «${t.nombre}» de la CI`, rutas: [CI], fuentes: fuentesDe(t) });
        continue;
      }
      for (const p of t.pasos) {
        if (hoy.pasos.some((q) => q.run === p.run)) continue;
        const renombrado = p.nombre && hoy.pasos.some((q) => q.nombre === p.nombre);
        h.poner({
          id: `registro:ci:${t.id}:${p.nombre || p.run}`, nivel: renombrado ? 'IMPORTANT' : 'CRITICAL', tipo: 'registro',
          titulo: `${renombrado ? 'Cambia' : 'Desaparece'} un paso de «${t.nombre}» en la CI: ${recortar(p.nombre || p.run, 90)}`, detalle: recortar(`Antes: ${p.run}`, 300),
          rutas: [CI], fuentes: fuentesDe(t),
        });
      }
    }
  }
  const PKG = 'functions/package.json';
  if (cambia(PKG)) {
    const cadenaDe = (texto) => { try { return { suites: suitesDeLaCadena(JSON.parse(texto || '{}').scripts?.test) }; } catch (e) { return { error: e.message }; } };
    const cadenaBase = cadenaDe(contenidosEnBase(ctx.raiz, base, [PKG]).get(PKG));
    const cadenaHoy = cadenaDe(ctx.leer(PKG));
    const fuentes = [{ archivo: PKG, json: 'scripts.test' }, { archivo: 'functions/test/_cadena.mjs', ref: 'suitesDeLaCadena' }];
    if (cadenaHoy.error) h.poner({ id: 'registro:cadena', nivel: 'CRITICAL', tipo: 'registro', titulo: 'La cadena de npm test ya no se entiende', detalle: cadenaHoy.error, rutas: [PKG], fuentes });
    else if (cadenaBase.suites) {
      for (const s of cadenaBase.suites.filter((x) => !cadenaHoy.suites.includes(x))) {
        const sigue = ctx.existeArchivo(`functions/${s}`);
        h.poner({
          id: `registro:cadena:${s}`, nivel: sigue ? 'CRITICAL' : 'IMPORTANT', tipo: 'registro',
          titulo: sigue ? `${s} sale de la cadena de npm test y sigue existiendo: nadie la ejecutaría` : `${s} se retira (sale de la cadena y su archivo ya no está)`,
          rutas: [PKG, `functions/${s}`], fuentes: [...fuentes, fuenteRegla('tests/suite-huerfana')],
        });
      }
    }
  }
};

/** Los scripts que cambian, preguntados a la guardia como si se ejecutaran (`node <script>`): lo que lanzarían por dentro. */
const guardiaEnScripts = (ctx, cambios, h) => {
  for (const { estado, ruta } of cambios) {
    const abs = path.join(ctx.raiz, ruta).replace(/\\/g, '/');
    if (estado === 'D' || !/\.(mjs|cjs|js)$/.test(ruta) || excluido(ruta) || !citable(abs) || !ctx.existeArchivo(ruta)) continue;
    const g = analizarTexto('Bash', `node "${abs}"`);
    if (!g || (g.decision !== 'deny' && g.decision !== 'ask')) continue;
    h.poner({
      id: `guardia:${ruta}`, nivel: g.decision === 'deny' ? 'CRITICAL' : 'IMPORTANT', tipo: 'guardia',
      titulo: `La guardia ${g.decision === 'deny' ? 'negaría' : 'preguntaría al dueño antes de'} ejecutar ${ruta}`, detalle: g.motivo, rutas: [ruta],
      fuentes: [{ archivo: '.claude/hooks/guardia.mjs', ref: 'analizarTexto', valor: `${g.decision}: ${g.motivo}` }],
    });
  }
};

export const cambio = ({ raiz = RAIZ_POR_DEFECTO, base, max = TOPES, registro = null, entorno = process.env } = {}) => {
  if (!base || typeof base !== 'string') throw new ErrorDeEntrada('cambio necesita --base <ref>');
  const ctx = crearContexto({ raiz, registro, entorno });
  if (!ctx.conGit) throw new ErrorDeEntrada('el modo cambio necesita git (lee el diff)');
  if (!existeCommit(ctx.raiz, base)) throw new ErrorDeEntrada(`--base «${base}» no es un commit de este repositorio`);
  const cambios = cambiosDesde(ctx.raiz, base).filter((c) => !excluido(c.ruta));
  const rutas = unicos(cambios.map((c) => c.ruta));
  const sinSeguir = String(git(ctx.raiz, ['ls-files', '--others', '--exclude-standard', '-z'], { permitirFallo: true }) || '').split('\0').filter(Boolean);
  if (sinSeguir.length) ctx.aviso(`${plural(sinSeguir.length, 'archivo sin seguimiento no entra', 'archivos sin seguimiento no entran')} en el diff (git add -N para verlos)`);
  const h = evaluarRutas(ctx, rutas, { conImportadores: false });
  const enDiff = new Set(rutas);
  const enElDiff = (x) => [x.evidencia.ruta, ...(x.relacionados || [])].some((r) => enDiff.has(r));
  const resultado = analizar({ raiz: ctx.raiz, base });
  for (const a of resultado.avisos || []) ctx.aviso(`detectores: ${a}`);
  revisionDeterminista(ctx, resultado, enElDiff, h);
  disparadores(ctx, resultado, h);
  try {
    const plan = planificar({ raiz: ctx.raiz, base, detectores: resultado });
    const delSelector = { archivo: 'ops/revision/selector.mjs', ref: 'planificar' };
    if (plan.importadores.length) {
      h.poner({
        id: 'importadores', nivel: 'CONTEXT', tipo: 'importadores',
        titulo: `${plural(plan.importadores.length, 'archivo importa', 'archivos importan')} directamente lo que cambia (grafo inverso, profundidad 1)`,
        detalle: recortar(plan.importadores.map((i) => i.ruta).join(', '), 300), rutas: unicos(plan.importadores.flatMap((i) => i.importa)),
        fuentes: [delSelector], datos: { importadores: plan.importadores },
      });
    }
    if (plan.revisores.length) {
      h.poner({
        id: 'plan:revision', nivel: 'CONTEXT', tipo: 'plan',
        titulo: `Revisión de IA que pide este cambio: ${plan.revisores.map((r) => `${r.nombre} (${plural(r.archivos.length, 'archivo', 'archivos')})`).join(', ')}`,
        detalle: `Zonas: ${plan.zonasDisparadas.join(', ') || '—'}.`, rutas: unicos(plan.revisores.flatMap((r) => r.archivos)),
        fuentes: [delSelector, { archivo: RUTA_PAQUETES, json: 'revisores' }],
        datos: { zonas: plan.zonasDisparadas, revisores: plan.revisores.map((r) => ({ nombre: r.nombre, archivos: r.archivos, paquetes: r.paquetes })) },
      });
    }
    for (const a of plan.avisos) ctx.aviso(`selector: ${a}`);
  } catch (e) { ctx.aviso(`selector: ${e.message}`); }
  registros(ctx, base, rutas, h);
  guardiaEnScripts(ctx, cambios, h);
  const limpio = String(git(ctx.raiz, ['status', '--porcelain'], { permitirFallo: true }) ?? '').trim() === '';
  return informe({
    modo: 'cambio',
    entrada: { base, baseSha: String(git(ctx.raiz, ['rev-parse', `${base}^{commit}`])).trim(), head: ctx.head(), limpio, rutas },
    estado: { git: true, candidato: ctx.head() }, h, avisos: ctx.avisos, max,
  });
};

/* ── Línea de órdenes ───────────────────────────────────────────────────── */

const USO = 'uso: node ops/harness/guardian.mjs antes --archivos a,b | cambio --base <ref>  [--json] [--max-por-nivel N] [--raiz <dir>]';

export const principal = (argv) => {
  const [modo, ...resto] = argv;
  const args = leerArgumentos(resto, ['json']);
  if (args._.length) throw new ErrorDeEntrada(`argumento suelto: ${args._.join(' ')}\n${USO}`);
  const desconocidas = Object.keys(args).filter((k) => !['_', 'json', 'archivos', 'base', 'raiz', 'max-por-nivel'].includes(k));
  if (desconocidas.length) throw new ErrorDeEntrada(`opción desconocida: ${desconocidas.map((k) => `--${k}`).join(', ')}\n${USO}`);
  const raiz = path.resolve(args.raiz || RAIZ_POR_DEFECTO);
  const max = topesDe(args['max-por-nivel']);
  let r;
  if (modo === 'antes') {
    if (args.base !== undefined) throw new ErrorDeEntrada('antes no lleva --base (eso es el modo cambio)');
    r = antes({ raiz, archivos: lista(args.archivos) || [], max });
  } else if (modo === 'cambio') {
    if (args.archivos !== undefined) throw new ErrorDeEntrada('cambio no lleva --archivos: lee el diff desde --base');
    r = cambio({ raiz, base: args.base, max });
  } else throw new ErrorDeEntrada(USO);
  return args.json ? aJSON(r) : aTexto(r);
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    process.stdout.write(principal(process.argv.slice(2)));
    process.exitCode = 0;
  } catch (e) {
    console.error(`✘ ${e.message}`);
    process.exitCode = 2;
  }
}
