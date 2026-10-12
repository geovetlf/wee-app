#!/usr/bin/env node
/**
 * 16 · ¿QUÉ PRUEBAS EXISTENTES TOCAN LOS PARCHES? — el coste de implementación, medido.
 *
 * Ejecuta un conjunto de suites de `functions/test` (las que leen o ejecutan los módulos que tocan los parches) dentro de
 * una COPIA del árbol y cuenta qué comprobaciones fallan. Se usa con dos copias: la de control (sin parches) y la parcheada
 * (los cinco diffs aplicados a `functions/src` y recompilada). Las suites que fallen en las DOS son ruido de la copia
 * (p. ej. las que llaman a `git` y la copia no tiene `.git`); las que fallen SOLO en la parcheada son el coste real: pruebas
 * que fijan el texto o la forma exacta de lo que el parche cambia, o dobles que no conocen una llamada nueva.
 *
 *     node scripts/bench-r7/16-pruebas-de-los-parches.mjs --arbol <carpeta> --salida <json>
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const arbol = path.resolve(arg('arbol', '.'));
const salida = arg('salida', null);

/* Las suites que nombran los módulos tocados (ledger, verification, creator/credits, brainUsage, brain) o los ejercitan. */
const SUITES = [
  'ledger', 'router', 'credits', 'idempotencia-de-cobro', 'creator-reclamo', 'reservas-abandonadas', 'estimate-plan', 'pricing-mode',
  'plazos-y-liquidacion', 'coste-de-los-fallos', 'presupuesto-diario', 'interruptor-ia', 'liquidacion-pendiente', 'providers', 'security',
  'brain-bloque', 'brain-canary', 'brain-contexto', 'brain-deepseek', 'brain-pasos', 'puerta-canario', 'contabilidad-frontera', 'cierre-servidor',
  'credits-cliente-cerrado', 'credits-perfil-duplicado', 'avatar-duplicados', 'seguridad-11x4a', 'runtime-conductor', 'runtime-premigracion',
  'runtime-liquidacion', 'runtime-map', 'runtime-asincrono', 'core-brain', 'core-financial', 'mundo3d-costes', 'mundo3d-gobernanza', 'f1d-generacion',
  'video-asincrono', 'puente-pre-f1d', 'creator', 'techo-de-propuestas', 'sombra-experiencia', 'wee-ai', 'urls-del-storage', 'plazo-sincrono',
  'elegibilidad-jurisdiccion', 'no-disponible', 'i18n-servidor-fuentes', 'paso-proveedor-permitido',
];

const filas = [];
for (const s of SUITES) {
  const fichero = path.join(arbol, 'functions', 'test', `${s}.test.mjs`);
  if (!fs.existsSync(fichero)) { filas.push({ suite: s, estado: 'no existe' }); continue; }
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [fichero], { cwd: arbol, encoding: 'utf8', timeout: 180_000, maxBuffer: 32 * 1024 * 1024 });
  const texto = `${r.stdout || ''}${r.stderr || ''}`;
  const fallos = texto.split('\n').filter((l) => /^✘|^\s*✘/.test(l)).map((l) => l.trim().slice(0, 220));
  filas.push({ suite: s, codigo: r.status, segundos: Number(((Date.now() - t0) / 1000).toFixed(1)), fallos: fallos.length, primeros: fallos.slice(0, 4), cola: texto.trim().split('\n').slice(-1)[0]?.slice(0, 160) });
}
const resumen = { arbol, suites: filas.length, conFallos: filas.filter((f) => f.codigo !== 0 && f.estado !== 'no existe').length, filas };
if (salida) fs.writeFileSync(path.resolve(salida), JSON.stringify(resumen, null, 2), 'utf8');
console.log(JSON.stringify({ arbol, suites: resumen.suites, conFallos: resumen.conFallos }));
