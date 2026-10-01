#!/usr/bin/env node
/*
 * ¿ESTÁ ACTIVA LA OBSERVABILIDAD QUE PROPONE alertas.mjs? — Weë Agent Harness.
 *
 *   node ops/observabilidad/verificar.mjs
 *
 * Lo corre el DUEÑO después de crear las alertas (y cuando quiera volver a mirar).
 * SOLO LEE: cada orden es un `list` (lo fija functions/test/observabilidad-verificar.test.mjs).
 *
 * Comprueba que cada métrica basada en logs existe CON SU FILTRO (si alguien lo
 * cambia en la consola, la alerta deja de ver lo que dice), que las dos
 * comprobaciones externas miran el host y la respuesta esperados, que cada
 * política existe, está activa y avisa a algún canal, que el canal de correo
 * está verificado, y que el panel existe. Una alerta sin canal no avisa a nadie.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { COMPROBACIONES, METRICAS, PANEL, POLITICAS, PROYECTO } from './alertas.mjs';

export const LECTURAS = Object.freeze({
  metricas: ['logging', 'metrics', 'list', `--project=${PROYECTO}`, '--format=json'],
  comprobaciones: ['monitoring', 'uptime', 'list-configs', `--project=${PROYECTO}`, '--format=json'],
  politicas: ['beta', 'monitoring', 'policies', 'list', `--project=${PROYECTO}`, '--format=json'],
  canales: ['beta', 'monitoring', 'channels', 'list', `--project=${PROYECTO}`, '--format=json'],
  paneles: ['monitoring', 'dashboards', 'list', `--project=${PROYECTO}`, '--format=json'],
});

const plano = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const ultimo = (nombre) => String(nombre || '').split('/').pop();

/** Pura: lo que falta o no coincide (vacía = conforme). `null` en una lectura = no se pudo leer. */
export const comparar = ({ metricas, comprobaciones, politicas, canales, paneles }) => {
  const d = [];
  if (!Array.isArray(metricas)) d.push('no se pudieron leer las métricas basadas en logs');
  else for (const m of METRICAS) {
    const viva = metricas.find((x) => ultimo(x.name) === m.nombre);
    if (!viva) d.push(`falta la métrica ${m.nombre}`);
    else if (plano(viva.filter) !== plano(m.filtro)) d.push(`la métrica ${m.nombre} tiene otro filtro: ya no cuenta lo que dice alertas.mjs`);
  }

  if (!Array.isArray(comprobaciones)) d.push('no se pudieron leer las comprobaciones externas');
  else for (const c of COMPROBACIONES) {
    const viva = comprobaciones.find((x) => x.monitoredResource?.labels?.host === c.host);
    if (!viva) { d.push(`falta la comprobación externa de ${c.host}`); continue; }
    const ruta = viva.httpCheck?.path || '/';
    const codigos = (viva.httpCheck?.acceptedResponseStatusCodes || []).map((x) => x.statusValue).filter(Boolean);
    if (ruta !== c.ruta) d.push(`la comprobación de ${c.host} mira ${ruta}, no ${c.ruta}`);
    if (!codigos.includes(c.codigo)) d.push(`la comprobación de ${c.host} no espera ${c.codigo}`);
  }

  const verificados = Array.isArray(canales) ? canales.filter((x) => x.type === 'email' && x.enabled !== false && x.verificationStatus !== 'UNVERIFIED') : [];
  if (!Array.isArray(canales)) d.push('no se pudieron leer los canales de aviso');
  else if (!verificados.length) d.push('no hay ningún canal de correo activo y verificado: las alertas no avisarían a nadie');

  if (!Array.isArray(politicas)) d.push('no se pudieron leer las políticas de alerta');
  else for (const p of Object.values(POLITICAS)) {
    const viva = politicas.find((x) => x.displayName === p.displayName);
    if (!viva) { d.push(`falta la alerta «${p.displayName}»`); continue; }
    if (viva.enabled === false) d.push(`la alerta «${p.displayName}» está desactivada`);
    if (!(viva.notificationChannels || []).length) d.push(`la alerta «${p.displayName}» no avisa a ningún canal`);
    else if (Array.isArray(canales) && !(viva.notificationChannels || []).some((n) => verificados.some((c) => c.name === n))) {
      d.push(`la alerta «${p.displayName}» solo avisa a canales sin verificar o apagados`);
    }
  }

  if (!Array.isArray(paneles)) d.push('no se pudieron leer los paneles');
  else if (!paneles.some((x) => x.displayName === PANEL.displayName)) d.push(`falta el panel «${PANEL.displayName}»`);
  return d;
};

const leerDeGoogle = (args) => {
  const r = spawnSync('gcloud', args, { encoding: 'utf8', shell: process.platform === 'win32', maxBuffer: 32 * 1024 * 1024 });
  if (r.status !== 0) return null;
  try { return JSON.parse(r.stdout || '[]'); } catch { return null; }
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  console.log('# Weë · ¿está activa la observabilidad de ops/observabilidad/alertas.mjs? (solo lectura)\n');
  const d = comparar(Object.fromEntries(Object.entries(LECTURAS).map(([k, args]) => [k, leerDeGoogle(args)])));
  if (!d.length) { console.log('✔ Conforme: métricas, comprobaciones, alertas con canal y panel.'); process.exit(0); }
  for (const x of d) console.log(`✘ ${x}`);
  process.exit(1);
}
