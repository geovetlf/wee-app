/*
 * LAS ALERTAS NO SE QUEDAN CIEGAS — `ops/observabilidad/alertas.mjs` (FASE 14).
 *
 * ── Qué vigila ─────────────────────────────────────────────────────────────
 *
 * Las alertas de Weë se apoyan en mensajes que el código escribe en el log
 * («no se pudo reembolsar», «ningún proveedor disponible»…). Si alguien cambia
 * uno de esos textos, la alerta deja de saltar SIN avisar. Esta suite comprueba
 * que cada mensaje sigue en el archivo que lo escribe, que cada filtro solo
 * busca mensajes vigilados, que las políticas dicen qué hacer y no inundan el
 * correo, y que el script solo imprime (Cloud Monitoring es del dueño).
 */
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const ALERTAS = 'ops/observabilidad/alertas.mjs';
const { MENSAJES, METRICAS, POLITICAS, SALUD } = await import(pathToFileURL(path.resolve(RAIZ, ALERTAS)).href);

/* ── A. Cada mensaje sigue donde se escribe ─────────────────────────────── */
const perdidos = Object.entries(MENSAJES).flatMap(([m, archivos]) => archivos.filter((a) => !leer(a).includes(m)).map((a) => `«${m}» en ${a}`));
check('1) cada mensaje de log en el que se apoya una alerta sigue en el código que lo escribe', perdidos.length === 0, perdidos.join(' · '));

/* ── B. Los filtros solo buscan mensajes vigilados ──────────────────────── */
const filtros = [...METRICAS.map((m) => m.filtro), ...Object.values(POLITICAS).flatMap((p) => p.conditions.map((c) => (c.conditionMatchedLog || {}).filter || ''))];
const buscados = [...new Set(filtros.flatMap((f) => [...f.matchAll(/textPayload:"([^"]+)"/g)].map((m) => m[1])))];
const sueltos = buscados.filter((t) => !(t in MENSAJES));
check('2) ningún filtro busca un texto que no esté en la lista vigilada', buscados.length >= 5 && sueltos.length === 0, sueltos.join(', '));
const usadas = Object.values(POLITICAS).flatMap((p) => p.conditions.map((c) => ((c.conditionThreshold || {}).filter || '').match(/logging\.googleapis\.com\/user\/(\w+)/))).filter(Boolean).map((m) => m[1]);
check('3) las políticas usan solo métricas que se crean aquí', usadas.length >= 2 && usadas.every((u) => METRICAS.some((m) => m.nombre === u)), usadas.join(', '));

/* ── C. Las políticas se pueden actuar y no inundan ─────────────────────── */
const sinDoc = Object.entries(POLITICAS).filter(([, p]) => !(p.documentation && p.documentation.content.length > 60)).map(([n]) => n);
check('4) cada alerta dice qué mirar', sinDoc.length === 0, sinDoc.join(', '));
const deLog = Object.entries(POLITICAS).filter(([, p]) => p.conditions.some((c) => c.conditionMatchedLog));
check('5) las alertas por mensaje de log tienen límite de avisos (no inundan el correo)',
  deLog.length >= 1 && deLog.every(([, p]) => p.alertStrategy && p.alertStrategy.notificationRateLimit));
check('6) son pocas: siete políticas y cuatro métricas (las cinco de H0, más el tope diario y el uso anómalo que pidió el dueño)',
  Object.keys(POLITICAS).length === 7 && METRICAS.length === 4);
check('7) el dinero sin cerrar salta con severidad de error, en el primer caso',
  /severity>=ERROR/.test(POLITICAS['dinero-sin-cerrar'].conditions[0].conditionMatchedLog.filter));

/* ── D. La comprobación de salud mide lo que dice ───────────────────────── */
const reescritura = (JSON.parse(leer('firebase.json')).hosting || []).find((h) => h.site === 'get-wee').rewrites.find((r) => r.source === '/post/**');
check('8) la ruta de salud llega a publicPostPage por Hosting', SALUD.ruta.startsWith('/post/') && reescritura && reescritura.function.functionId === 'publicPostPage');
check('9) …que contesta 404 a un post que no existe (404 = las Functions responden)', SALUD.codigo === 404 && /\.status\(404\)/.test(leer('functions/src/public/postPage.ts')));

/* ── E. El script solo imprime, y sin datos personales ──────────────────── */
const fuente = leer(ALERTAS);
check('10) no ejecuta nada en Google Cloud', !/child_process|execSync|spawn|execFile/.test(fuente));
check('11) no lleva ningún correo: el canal se crea con <TU_CORREO>', !/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}/.test(fuente) && /<TU_CORREO>/.test(fuente));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'alertas-'));
const r = spawnSync(process.execPath, [path.resolve(RAIZ, ALERTAS), '--json', tmp], { encoding: 'utf8' });
const archivos = fs.readdirSync(tmp).filter((f) => f.endsWith('.json'));
let validos = 0;
for (const f of archivos) { try { const p = JSON.parse(fs.readFileSync(path.join(tmp, f), 'utf8')); if (p.displayName && p.conditions) validos++; } catch { /* inválido */ } }
check('12) --json escribe las siete políticas (y el panel) como JSON válido, con nombres ASCII', r.status === 0 && archivos.length === 8 && validos === 7 && archivos.includes('panel.json') && archivos.every((f) => /^[a-z0-9-]+\.json$/.test(f)), archivos.join(', '));
fs.rmSync(tmp, { recursive: true, force: true });
check('13) docs/OBSERVABILITY.md explica las alertas y cómo se activan', /alertas\.mjs/.test(leer('docs/OBSERVABILITY.md')));

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
