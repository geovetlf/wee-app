#!/usr/bin/env node
/*
 * APLICAR LAS ALERTAS — Frente H. Por defecto SIMULA: lee lo que hay (solo `list`), calcula el diff contra lo
 * versionado en ops/observabilidad/ y enseña qué crearía o cambiaría, sin ejecutarlo.
 *
 *   node ops/observabilidad/aplicar.mjs                                  # simula: lee Google Cloud (solo list) y muestra el diff
 *   node ops/observabilidad/aplicar.mjs --sin-leer                       # simula contra un proyecto vacío (sin red)
 *   node ops/observabilidad/aplicar.mjs --vivo <instantanea.json>        # simula contra una lectura guardada (sin red)
 *   node ops/observabilidad/aplicar.mjs --aplicar --confirmo-proyecto get-wee --canal projects/get-wee/notificationChannels/<ID>
 *
 * Aplicar exige las TRES cosas: `--aplicar`, el nombre del proyecto escrito otra vez y el canal de aviso (una alerta
 * sin canal no avisa a nadie). Solo crea o actualiza; nunca borra nada que haya en el proyecto y no esté aquí.
 * Decisión del dueño (2026-10-14): NO se aplica a producción desde Claude; este es el comando que lo hace él.
 *
 * Lo que versiona: alertas.mjs (H0, siete políticas) + lanzamiento.mjs (lanzamiento), las métricas, las dos
 * comprobaciones externas y el panel. Lo fija functions/test/observabilidad-lanzamiento.test.mjs.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { LECTURAS } from './verificar.mjs';
import { COMPROBACIONES, PANEL, PROYECTO, metricasDeseadas, politicasDeseadas } from './lanzamiento.mjs';

const plano = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const ultimo = (n) => String(n || '').split('/').pop();
const json = (x) => JSON.stringify(x ?? null);

/** Lo que importa de una política para decidir si hay que actualizarla (lo que Google añade —name, creationRecord…— no cuenta). */
const esencia = (p) => ({
  combiner: p.combiner,
  documentation: plano(p.documentation && p.documentation.content),
  conditions: (p.conditions || []).map((c) => {
    const t = c.conditionThreshold;
    const l = c.conditionMatchedLog;
    return {
      displayName: c.displayName,
      ...(t ? { filter: plano(t.filter), comparison: t.comparison, thresholdValue: Number(t.thresholdValue || 0), duration: t.duration, aggregations: t.aggregations } : {}),
      ...(l ? { log: plano(l.filter) } : {}),
    };
  }),
  alertStrategy: p.alertStrategy,
});

/** Diferencias legibles entre dos objetos planos (solo las claves de primer nivel de la esencia). */
const diferencias = (deseada, viva) => Object.keys(deseada).filter((k) => json(deseada[k]) !== json(viva[k]));

/**
 * PURA: el plan. `vivo` = { metricas, politicas, comprobaciones, paneles } tal y como los dan los `list` de gcloud
 * (arrays; `null` = no se pudo leer). Devuelve acciones { recurso, nombre, accion: crear|actualizar|igual|desconocido, cambios }.
 */
export const planificar = (vivo) => {
  const acciones = [];
  const metricas = vivo.metricas;
  for (const m of metricasDeseadas()) {
    if (!Array.isArray(metricas)) { acciones.push({ recurso: 'metrica', nombre: m.name, accion: 'desconocido', cambios: ['no se pudo leer'] }); continue; }
    const v = metricas.find((x) => ultimo(x.name) === m.name);
    if (!v) { acciones.push({ recurso: 'metrica', nombre: m.name, accion: 'crear', cambios: [] }); continue; }
    const cambios = [];
    if (plano(v.filter) !== plano(m.filter)) cambios.push('filter');
    if (json(v.labelExtractors || {}) !== json(m.labelExtractors || {})) cambios.push('labelExtractors');
    acciones.push({ recurso: 'metrica', nombre: m.name, accion: cambios.length ? 'actualizar' : 'igual', cambios });
  }

  const politicas = vivo.politicas;
  for (const [clave, p] of Object.entries(politicasDeseadas())) {
    if (!Array.isArray(politicas)) { acciones.push({ recurso: 'politica', nombre: clave, accion: 'desconocido', cambios: ['no se pudo leer'] }); continue; }
    const v = politicas.find((x) => x.displayName === p.displayName);
    if (!v) { acciones.push({ recurso: 'politica', nombre: clave, accion: 'crear', cambios: [] }); continue; }
    const cambios = diferencias(esencia(p), esencia(v));
    acciones.push({ recurso: 'politica', nombre: clave, accion: cambios.length ? 'actualizar' : 'igual', cambios, viva: v.name, canales: v.notificationChannels || [] });
  }

  const comprobaciones = vivo.comprobaciones;
  for (const c of COMPROBACIONES) {
    if (!Array.isArray(comprobaciones)) { acciones.push({ recurso: 'comprobacion', nombre: c.id, accion: 'desconocido', cambios: ['no se pudo leer'] }); continue; }
    const v = comprobaciones.find((x) => x.monitoredResource && x.monitoredResource.labels && x.monitoredResource.labels.host === c.host);
    const cambios = !v ? [] : [
      ...((v.httpCheck && v.httpCheck.path) || '/') !== c.ruta ? ['path'] : [],
      ...!((v.httpCheck && v.httpCheck.acceptedResponseStatusCodes) || []).some((x) => x.statusValue === c.codigo) ? ['statusCodes'] : [],
    ];
    /* Una comprobación que mira otra cosa no se «actualiza» sola: se avisa y se corrige a mano (su id lo genera Google). */
    acciones.push({ recurso: 'comprobacion', nombre: c.id, accion: !v ? 'crear' : cambios.length ? 'revisar-a-mano' : 'igual', cambios });
  }

  const paneles = vivo.paneles;
  if (!Array.isArray(paneles)) acciones.push({ recurso: 'panel', nombre: PANEL.displayName, accion: 'desconocido', cambios: ['no se pudo leer'] });
  else {
    const v = paneles.find((x) => x.displayName === PANEL.displayName);
    const distinto = v && json(v.mosaicLayout && v.mosaicLayout.tiles && v.mosaicLayout.tiles.length) !== json(PANEL.mosaicLayout.tiles.length);
    acciones.push({ recurso: 'panel', nombre: PANEL.displayName, accion: !v ? 'crear' : distinto ? 'revisar-a-mano' : 'igual', cambios: distinto ? ['tiles'] : [] });
  }
  return acciones;
};

const P = `--project=${PROYECTO}`;
export const CANAL_VALIDO = new RegExp(`^projects/${PROYECTO}/notificationChannels/[0-9]+$`);

/**
 * PURA: las órdenes de gcloud que ejecutaría el plan, y los archivos que necesita (ruta relativa → contenido).
 * Una política que se actualiza conserva sus canales y añade el indicado (un `update` con archivo reemplaza la
 * política ENTERA: sin los canales en el archivo, dejaría de avisar).
 */
export const ordenesDelPlan = (acciones, { canal = '<CANAL>' } = {}) => {
  const archivos = {};
  const ordenes = [];
  const metricas = Object.fromEntries(metricasDeseadas().map((m) => [m.name, m]));
  const politicas = politicasDeseadas();
  for (const a of acciones) {
    if (a.recurso === 'metrica' && (a.accion === 'crear' || a.accion === 'actualizar')) {
      const f = `metrica-${a.nombre}.json`;
      archivos[f] = metricas[a.nombre];
      ordenes.push(['logging', 'metrics', a.accion === 'crear' ? 'create' : 'update', a.nombre, P, `--config-from-file=${f}`]);
    }
    if (a.recurso === 'politica' && a.accion === 'crear') {
      const f = `politica-${a.nombre}.json`;
      archivos[f] = { ...politicas[a.nombre], notificationChannels: [canal] };
      ordenes.push(['beta', 'monitoring', 'policies', 'create', P, `--policy-from-file=${f}`]);
    }
    if (a.recurso === 'politica' && a.accion === 'actualizar') {
      const f = `politica-${a.nombre}.json`;
      archivos[f] = { ...politicas[a.nombre], name: a.viva, notificationChannels: [...new Set([...(a.canales || []), canal])] };
      ordenes.push(['beta', 'monitoring', 'policies', 'update', a.viva, P, `--policy-from-file=${f}`]);
    }
    if (a.recurso === 'comprobacion' && a.accion === 'crear') {
      const c = COMPROBACIONES.find((x) => x.id === a.nombre);
      ordenes.push(['monitoring', 'uptime', 'create', c.id, P, '--resource-type=uptime-url', `--resource-labels=host=${c.host},project_id=${PROYECTO}`, `--path=${c.ruta}`, '--protocol=https', `--status-codes=${c.codigo}`, `--period=${c.periodoMin}`]);
    }
    if (a.recurso === 'panel' && a.accion === 'crear') {
      archivos['panel.json'] = PANEL;
      ordenes.push(['monitoring', 'dashboards', 'create', P, '--config-from-file=panel.json']);
    }
  }
  return { ordenes, archivos };
};

/** Las únicas órdenes que se ejecutan sin `--aplicar`: las de verificar.mjs (todas `list`). */
export const ORDENES_DE_LECTURA = Object.freeze(Object.values(LECTURAS));
const esLectura = (args) => ORDENES_DE_LECTURA.some((l) => json(l) === json(args));

const gcloud = (args, cwd) => {
  const r = spawnSync('gcloud', args, { encoding: 'utf8', cwd, shell: process.platform === 'win32', maxBuffer: 32 * 1024 * 1024 });
  return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
};

const valor = (argv, k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
const linea = (a) => `${a.accion.padEnd(15)} ${a.recurso.padEnd(12)} ${a.nombre}${a.cambios.length ? `  (${a.cambios.join(', ')})` : ''}`;

/**
 * El programa, con el ejecutor inyectable (las pruebas le pasan uno falso y comprueban que, sin `--aplicar`, solo
 * corre `list`). Devuelve el código de salida: 0 bien (o nada que hacer), 1 alguna orden falló, 2 uso incorrecto o
 * lectura imposible.
 */
export const principal = (argv, { ejecutar = gcloud, log = console.log, dirTemporal } = {}) => {
  const aplicar = argv.includes('--aplicar');
  let vivo;
  if (argv.includes('--sin-leer')) vivo = { metricas: [], politicas: [], comprobaciones: [], paneles: [] };
  else if (valor(argv, '--vivo')) vivo = JSON.parse(fs.readFileSync(valor(argv, '--vivo'), 'utf8'));
  else {
    vivo = {};
    for (const [k, args] of Object.entries(LECTURAS)) {
      if (k === 'canales') continue;
      const r = ejecutar(args);
      try { vivo[k] = r.status === 0 ? JSON.parse(r.stdout || '[]') : null; } catch { vivo[k] = null; }
    }
  }
  const plan = planificar(vivo);
  log(`# Weë · alertas como código — ${aplicar ? 'APLICAR' : 'SIMULACIÓN (no se cambia nada)'} sobre ${PROYECTO}\n`);
  for (const a of plan) log(linea(a));
  const pendientes = plan.filter((a) => a.accion === 'crear' || a.accion === 'actualizar');
  const desconocidas = plan.filter((a) => a.accion === 'desconocido');
  const canal = valor(argv, '--canal');
  const { ordenes, archivos } = ordenesDelPlan(pendientes, { canal: canal || '<CANAL>' });
  log(`\n${pendientes.length} por crear o actualizar · ${plan.filter((a) => a.accion === 'igual').length} iguales · ${plan.filter((a) => a.accion === 'revisar-a-mano').length} a revisar a mano · ${desconocidas.length} sin leer`);

  if (!aplicar) {
    if (ordenes.length) {
      log('\n# Lo que haría --aplicar (no se ejecuta):');
      for (const o of ordenes) log(`gcloud ${o.join(' ')}`);
    }
    return desconocidas.length ? 2 : 0;
  }

  if (valor(argv, '--confirmo-proyecto') !== PROYECTO) { log(`\n✘ Para aplicar, escribe el proyecto otra vez: --confirmo-proyecto ${PROYECTO}`); return 2; }
  if (!canal || !CANAL_VALIDO.test(canal)) { log(`\n✘ Para aplicar hace falta el canal de aviso: --canal projects/${PROYECTO}/notificationChannels/<ID> (gcloud beta monitoring channels list)`); return 2; }
  if (desconocidas.length) { log('\n✘ No se aplica sin haber podido leer lo que hay: el diff no sería fiable.'); return 2; }

  const dir = dirTemporal || fs.mkdtempSync(path.join(os.tmpdir(), 'wee-alertas-'));
  for (const [n, c] of Object.entries(archivos)) fs.writeFileSync(path.join(dir, n), JSON.stringify(c, null, 2) + '\n');
  let fallos = 0;
  for (const o of ordenes) {
    if (esLectura(o)) continue;
    const r = ejecutar(o, dir);
    log(`${r.status === 0 ? '✔' : '✘'} gcloud ${o.join(' ')}${r.status === 0 ? '' : ` — ${plano(r.stderr).slice(0, 300)}`}`);
    if (r.status !== 0) fallos++;
  }
  log(fallos ? `\n✘ ${fallos} orden(es) fallaron` : '\n✔ aplicado. Comprueba: node ops/observabilidad/verificar.mjs');
  return fallos ? 1 : 0;
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exit(principal(process.argv.slice(2)));
}
