#!/usr/bin/env node
/*
 * LOS PASOS DEL WORKFLOW DE PRODUCCIÓN (FASE 6) — `.github/workflows/despliegue.yml`.
 *
 *   node ops/despliegue/cli.mjs verificar   --commit <sha> --objetivo <qué>   (sin credenciales de Google)
 *   node ops/despliegue/cli.mjs revisiones  --funciones a,b                   (lee Cloud Run)
 *   node ops/despliegue/cli.mjs humo        --funciones a,b                   (una petición sin sesión por función)
 *   node ops/despliegue/cli.mjs marcha-atras --desde antes.json [--ejecutar]  (sin --ejecutar solo dice qué haría)
 *   node ops/despliegue/cli.mjs tag         --objetivo <qué>                  (el nombre del tag del despliegue)
 *
 * La lógica está en plan.mjs (pura y probada); aquí solo se traen datos. Los
 * pasos que leen Cloud Run usan GCP_TOKEN (lo deja google-github-actions/auth).
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { juzgarHumo, leerObjetivo, motivosContraElCommit, planDeMarchaAtras, servicioDe, tagDeDespliegue, tipoDeFuncion } from './plan.mjs';
import { crearNube } from './nube.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PROYECTO = 'get-wee';
const REGION = 'us-central1';

const args = process.argv.slice(3);
const valor = (op) => { const i = args.indexOf(op); return i >= 0 ? args[i + 1] : undefined; };
const lista = (op) => String(valor(op) || '').split(',').map((s) => s.trim()).filter(Boolean);
const salida = (clave, v) => { if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${clave}=${v}\n`); };
const fallar = (motivos) => { for (const m of motivos) console.log(`✘ ${m}`); process.exit(1); };
const nube = () => {
  if (!process.env.GCP_TOKEN) fallar(['falta GCP_TOKEN (el paso de autenticación de Google no se ejecutó)']);
  return crearNube({ proyecto: PROYECTO, region: REGION, token: process.env.GCP_TOKEN });
};

const verificar = async () => {
  const sha = String(valor('--commit') || '');
  const objetivo = leerObjetivo(valor('--objetivo'));
  if (objetivo.errores.length) fallar(objetivo.errores);
  let enMain = false;
  try { execFileSync('git', ['merge-base', '--is-ancestor', sha, 'origin/main'], { cwd: RAIZ, stdio: 'ignore' }); enMain = true; } catch { enMain = false; }
  const repo = process.env.GITHUB_REPOSITORY;
  const r = await fetch(`https://api.github.com/repos/${repo}/commits/${sha}/check-runs?per_page=100`, {
    headers: { Authorization: `Bearer ${process.env.GH_TOKEN}`, Accept: 'application/vnd.github+json' },
  });
  const checkRuns = r.ok ? ((await r.json()).check_runs || []) : [];
  const motivos = motivosContraElCommit({ sha, enMain, checkRuns });
  if (objetivo.funciones.length) {
    /* La regla de no pisar producción (ops/permitido.mjs): sale 1 si pisaría, 2 si no se puede saber. */
    try {
      execFileSync(process.execPath, [path.join(RAIZ, 'ops/permitido.mjs'), '--commit', sha, '--funciones', objetivo.funciones.join(',')], { cwd: RAIZ, stdio: 'inherit' });
    } catch { motivos.push('ops/permitido.mjs: desplegar este commit pisaría código que funciona en producción'); }
  }
  if (motivos.length) fallar(motivos);
  salida('solo', objetivo.solo);
  salida('funciones', objetivo.funciones.join(','));
  salida('wee_app', objetivo.otros.includes('hosting:wee-app') ? 'true' : 'false');
  console.log(`✔ ${sha.slice(0, 7)} está en main, la CI pasó y no pisa producción: ${objetivo.solo}`);
};

const revisiones = async () => {
  const n = nube();
  const mapa = {};
  for (const f of lista('--funciones')) mapa[servicioDe(f)] = (await n.servicio(servicioDe(f))).revision;
  console.log(JSON.stringify(mapa));
};

const humo = async () => {
  const n = nube();
  const require = createRequire(import.meta.url);
  const compilado = require(path.join(RAIZ, 'functions/lib/index.js'));
  const fallos = [];
  for (const f of lista('--funciones')) {
    const tipo = tipoDeFuncion(compilado[f] && compilado[f].__endpoint);
    const s = await n.servicio(servicioDe(f));
    let status;
    if (s.lista && s.uri && (tipo === 'callable' || tipo === 'http')) {
      try {
        const r = await fetch(s.uri, tipo === 'callable'
          ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"data":{}}', signal: AbortSignal.timeout(60_000) }
          : { method: 'GET', signal: AbortSignal.timeout(60_000) });
        status = r.status;
      } catch { status = undefined; }
    }
    const juicio = juzgarHumo({ tipo, lista: s.lista, status });
    console.log(`${juicio.ok ? '✔' : '✘'} ${f} (${tipo}, ${s.revision}): ${juicio.motivo}`);
    if (!juicio.ok) fallos.push(f);
  }
  if (fallos.length) fallar([`humo fallido en: ${fallos.join(', ')}`]);
};

const marchaAtras = async () => {
  const antes = JSON.parse(fs.readFileSync(String(valor('--desde')), 'utf8'));
  const n = nube();
  const despues = {};
  for (const s of Object.keys(antes)) despues[s] = (await n.servicio(s)).revision;
  const plan = planDeMarchaAtras(antes, despues);
  if (!plan.length) { console.log('· nada que devolver: ninguna revisión cambió'); return; }
  for (const { servicio, revision } of plan) {
    if (args.includes('--ejecutar')) { await n.traficoA(servicio, revision); console.log(`↩ ${servicio}: tráfico devuelto a ${revision}`); }
    else console.log(`(simulado) ${servicio}: devolvería el tráfico a ${revision}`);
  }
};

const tag = () => console.log(tagDeDespliegue(valor('--objetivo'), new Date().toISOString()));

const PASOS = { verificar, revisiones, humo, 'marcha-atras': marchaAtras, tag };
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const paso = PASOS[process.argv[2]];
  if (!paso) fallar([`paso desconocido: ${process.argv[2]} (${Object.keys(PASOS).join(', ')})`]);
  Promise.resolve(paso()).catch((e) => fallar([e.message]));
}
