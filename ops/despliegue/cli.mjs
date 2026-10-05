#!/usr/bin/env node
/*
 * LOS PASOS DEL WORKFLOW DE PRODUCCIÓN (FASE 6) — `.github/workflows/despliegue.yml`.
 *
 *   node ops/despliegue/cli.mjs verificar    --commit <sha> --objetivo <qué>      (sin credenciales de Google)
 *   node ops/despliegue/cli.mjs revisiones   --funciones a,b                      (la revisión que SIRVE cada una, para volver a ella)
 *   node ops/despliegue/cli.mjs humo         --funciones a,b                      (una petición sin sesión por función)
 *   node ops/despliegue/cli.mjs humo         --funciones a,b --sin-credenciales   (lo mismo por la URL pública: para el dueño tras un despliegue a mano)
 *   node ops/despliegue/cli.mjs observar     --funciones a,b --inicio <iso>       (5xx de después contra los de antes; falla si suben)
 *   node ops/despliegue/cli.mjs hashes       --sitio wee-app|get-wee [--salida x] (sha256 de lo publicado contra la carpeta; sin credenciales)
 *   node ops/despliegue/cli.mjs registro     --commit <sha> --objetivo <qué> --run <url> [--funciones a,b] [--hashes x,y]
 *   node ops/despliegue/cli.mjs marcha-atras --desde antes.json [--ejecutar]      (sin --ejecutar solo dice qué haría)
 *   node ops/despliegue/cli.mjs marcha-atras --al-mapa --funciones a,b            (imprime cómo volver a ops/produccion.json; no ejecuta nada)
 *   node ops/despliegue/cli.mjs tag          --objetivo <qué>                     (el nombre del tag del despliegue)
 *
 * La lógica está en plan.mjs (pura y probada); aquí solo se traen datos. Los
 * pasos que leen Google Cloud usan GCP_TOKEN (lo deja google-github-actions/auth).
 * `hashes`, `humo --sin-credenciales` y `marcha-atras --al-mapa` no necesitan
 * credenciales: el dueño puede usarlos tras un despliegue a mano.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  OBSERVACION, archivosAComparar, comandosDeVueltaAlMapa, compararHashes, digestDeImagen, juzgarHumo, juzgarHumoSinCredenciales,
  juzgarObservacion, leerObjetivo, mensajeDelRegistro, motivosContraElCommit, planDeMarchaAtras, revisionesSinArreglo, servicioDe,
  tagDeDespliegue, tipoDeFuncion, urlDeFuncion,
} from './plan.mjs';
import { crearNube } from './nube.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PROYECTO = 'get-wee';
const REGION = 'us-central1';
/** Cloud Monitoring tarda en tener las métricas: se espera esto de más antes de contar. */
const RETRASO_DE_METRICAS_MS = 3 * 60_000;

const args = process.argv.slice(3);
const valor = (op) => { const i = args.indexOf(op); return i >= 0 ? args[i + 1] : undefined; };
const lista = (op) => String(valor(op) || '').split(',').map((s) => s.trim()).filter(Boolean);
const salida = (clave, v) => { if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${clave}=${v}\n`); };
const fallar = (motivos) => { for (const m of motivos) console.log(`✘ ${m}`); process.exit(1); };
const nube = () => {
  if (!process.env.GCP_TOKEN) fallar(['falta GCP_TOKEN (el paso de autenticación de Google no se ejecutó)']);
  return crearNube({ proyecto: PROYECTO, region: REGION, token: process.env.GCP_TOKEN });
};
const mapaDeProduccion = () => JSON.parse(fs.readFileSync(path.join(RAIZ, 'ops/produccion.json'), 'utf8'));
const sha256 = (datos) => createHash('sha256').update(datos).digest('hex');
const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

/**
 * El compilado de las Functions, solo para leer el `__endpoint` de cada una. Se carga SIN
 * GOOGLE_APPLICATION_CREDENTIALS: al cargarse llama a `admin.initializeApp()`, y firebase-admin 12 lee
 * esa variable en ese momento y no entiende la credencial `external_account` que deja WIF en el runner
 * (el humo del run 37259825016 se cayó así, antes de hacer ninguna petición). Sin ella se carga como en
 * Cloud Run, que no la tiene; el humo no la usa: lee Cloud Run con GCP_TOKEN y llama sin sesión.
 */
export const cargarCompilado = () => {
  const require = createRequire(import.meta.url);
  const credencial = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  try { return require(path.join(RAIZ, 'functions/lib/index.js')); } finally {
    if (credencial !== undefined) process.env.GOOGLE_APPLICATION_CREDENTIALS = credencial;
  }
};

/** Una petición sin sesión y con cuerpo vacío: lo que hace el humo. Ninguna función llama a una IA sin una persona identificada. */
const pedirSinSesion = async (destino, tipo) => {
  try {
    const r = await fetch(destino, tipo === 'callable'
      ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"data":{}}', signal: AbortSignal.timeout(60_000) }
      : { method: 'GET', signal: AbortSignal.timeout(60_000) });
    return r.status;
  } catch { return undefined; }
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
  /* La regla de no pisar producción (ops/permitido.mjs), para funciones Y para reglas, índices, Storage y Hosting: sale 1 si pisaría, 2 si no se puede saber. */
  const regla = [
    ...(objetivo.funciones.length ? ['--funciones', objetivo.funciones.join(',')] : []),
    ...(objetivo.otros.length ? ['--otros', objetivo.otros.join(',')] : []),
  ];
  try {
    execFileSync(process.execPath, [path.join(RAIZ, 'ops/permitido.mjs'), '--commit', sha, ...regla], { cwd: RAIZ, stdio: 'inherit' });
  } catch { motivos.push('ops/permitido.mjs: desplegar este commit pisaría lo que funciona en producción'); }
  if (motivos.length) fallar(motivos);
  const sitios = objetivo.otros.filter((o) => o.startsWith('hosting:')).map((o) => o.slice('hosting:'.length));
  salida('solo', objetivo.solo);
  salida('funciones', objetivo.funciones.join(','));
  salida('wee_app', sitios.includes('wee-app') ? 'true' : 'false');
  salida('sitios', sitios.join(','));
  console.log(`✔ ${sha.slice(0, 7)} está en main, la CI pasó y no pisa producción: ${objetivo.solo}`);
};

const revisiones = async () => {
  const n = nube();
  const mapa = {};
  const repartidos = [];
  for (const f of lista('--funciones')) {
    const s = await n.servicio(servicioDe(f));
    if (s.reparto) repartidos.push(`${f}: el tráfico está repartido (${s.reparto.join(', ') || 'ninguna revisión lo sirve entero'}); no hay UNA revisión a la que volver. Déjalo en una antes de desplegar.`);
    mapa[servicioDe(f)] = s.revision;
  }
  if (repartidos.length) fallar(repartidos);
  salida('inicio', new Date().toISOString());
  console.log(JSON.stringify(mapa));
};

const humo = async () => {
  const compilado = cargarCompilado();
  const sinCredenciales = args.includes('--sin-credenciales');
  const n = sinCredenciales ? null : nube();
  const fallos = [];
  const sinComprobar = [];
  for (const f of lista('--funciones')) {
    const tipo = tipoDeFuncion(compilado[f] && compilado[f].__endpoint);
    const llamable = tipo === 'callable' || tipo === 'http';
    let juicio;
    let detalle = tipo;
    if (sinCredenciales) {
      juicio = juzgarHumoSinCredenciales({ tipo, status: llamable ? await pedirSinSesion(urlDeFuncion(f, { proyecto: PROYECTO, region: REGION }), tipo) : undefined });
      if (!juicio.verificado) sinComprobar.push(f);
    } else {
      const s = await n.servicio(servicioDe(f));
      detalle = `${tipo}, ${s.revision}`;
      juicio = juzgarHumo({ tipo, lista: s.lista, status: s.lista && s.uri && llamable ? await pedirSinSesion(s.uri, tipo) : undefined });
    }
    console.log(`${juicio.ok ? '✔' : '✘'} ${f} (${detalle}): ${juicio.motivo}`);
    if (!juicio.ok) fallos.push(f);
  }
  if (sinComprobar.length) console.log(`· sin credenciales no se comprueban: ${sinComprobar.join(', ')} (mira su revisión en la consola de Cloud Run)`);
  if (fallos.length) fallar([`humo fallido en: ${fallos.join(', ')}`]);
};

const observar = async () => {
  const n = nube();
  const servicios = lista('--funciones').map(servicioDe);
  const minutos = Number(valor('--minutos') ?? OBSERVACION.minutos);
  const umbral = Number(valor('--umbral') ?? OBSERVACION.umbral);
  const inicio = String(valor('--inicio') || '');
  if (!servicios.length) fallar(['falta --funciones']);
  if (Number.isNaN(Date.parse(inicio))) fallar(['falta --inicio: la hora (ISO) en que empezó el despliegue, para medir los 5xx de antes']);
  const ventana = minutos * 60_000;
  const desde = new Date().toISOString();
  console.log(`· observando ${servicios.join(', ')} durante ${minutos} min; se devuelve el tráfico si los 5xx suben más de ${umbral} sobre los de antes`);
  await esperar(ventana + RETRASO_DE_METRICAS_MS);
  let antes;
  let despues;
  try {
    antes = await n.cuenta5xx(servicios, new Date(Date.parse(inicio) - ventana).toISOString(), inicio);
    despues = await n.cuenta5xx(servicios, desde, new Date(Date.parse(desde) + ventana).toISOString());
  } catch (e) { console.log(`· ${e.message}`); }
  const juicio = juzgarObservacion({ antes, despues, umbral });
  console.log(`${juicio.ok ? '✔' : '✘'} ${juicio.motivo}`);
  if (!juicio.ok) fallar(['la observación posterior al despliegue falló: se devuelve el tráfico']);
};

/** Todos los archivos de una carpeta, con rutas relativas y barras normales. */
const listarArchivos = (carpeta, rel = '') => fs.readdirSync(path.join(carpeta, rel), { withFileTypes: true }).flatMap((e) => {
  const r = rel ? `${rel}/${e.name}` : e.name;
  return e.isDirectory() ? listarArchivos(carpeta, r) : e.isFile() ? [r] : [];
});

const hashes = async () => {
  const sitio = String(valor('--sitio') || '');
  const config = [].concat(JSON.parse(fs.readFileSync(path.join(RAIZ, 'firebase.json'), 'utf8')).hosting || []).find((h) => h.site === sitio);
  if (!config) fallar([`sitio desconocido: «${sitio}» (firebase.json no lo declara)`]);
  const carpeta = path.join(RAIZ, config.public);
  if (!fs.existsSync(carpeta)) fallar([`no existe ${config.public}/: ¿se construyó la web de este commit?`]);
  const rutas = archivosAComparar(listarArchivos(carpeta), config.ignore || []);
  const locales = Object.fromEntries(rutas.map((r) => [r, sha256(fs.readFileSync(path.join(carpeta, r)))]));
  const remotos = {};
  const cola = [...rutas];
  await Promise.all(Array.from({ length: 8 }, async () => {
    for (let r = cola.shift(); r !== undefined; r = cola.shift()) {
      try {
        const resp = await fetch(`https://${sitio}.web.app/${r.split('/').map(encodeURIComponent).join('/')}`, { headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(60_000) });
        remotos[r] = resp.ok ? sha256(Buffer.from(await resp.arrayBuffer())) : null;
      } catch { remotos[r] = null; }
    }
  }));
  const resultado = compararHashes(locales, remotos);
  if (valor('--salida')) fs.writeFileSync(String(valor('--salida')), JSON.stringify({ sitio, ...resultado }));
  for (const r of resultado.distintos) console.log(`✘ ${r}: lo publicado no es lo de este commit`);
  for (const r of resultado.ausentes) console.log(`✘ ${r}: no se pudo leer de ${sitio}.web.app`);
  if (!resultado.ok) fallar([`${sitio}: ${resultado.distintos.length} distintos y ${resultado.ausentes.length} sin leer, de ${resultado.comparados}`]);
  console.log(`✔ ${sitio}: los ${resultado.comparados} archivos publicados tienen el mismo sha256 que los de este commit`);
};

const registro = async () => {
  const n = nube();
  const funciones = [];
  for (const f of lista('--funciones')) {
    const s = await n.servicio(servicioDe(f));
    let digest = null;
    try { digest = s.revision ? await n.digestDe(s.revision) : null; } catch (e) { console.error(`· ${f}: ${e.message}`); }
    funciones.push({ funcion: f, revision: s.revision, digest: digestDeImagen(digest) ? digest : null });
  }
  const sitios = [];
  for (const archivo of lista('--hashes')) {
    const h = JSON.parse(fs.readFileSync(archivo, 'utf8'));
    let version = null;
    try { version = await n.versionDeHosting(h.sitio); } catch (e) { console.error(`· ${h.sitio}: ${e.message}`); }
    sitios.push({ sitio: h.sitio, version, comparados: h.comparados });
  }
  const texto = mensajeDelRegistro({
    commit: valor('--commit'), objetivo: valor('--objetivo'), run: valor('--run'),
    quien: process.env.GITHUB_ACTOR, workflow: process.env.GITHUB_WORKFLOW_REF, funciones, sitios,
  });
  console.log(texto);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Registro del despliegue\n\n\`\`\`\n${texto}\n\`\`\`\n`);
};

const marchaAtras = async () => {
  if (args.includes('--al-mapa')) {
    const { comandos, errores } = comandosDeVueltaAlMapa(mapaDeProduccion(), lista('--funciones'), { proyecto: PROYECTO, region: REGION });
    console.log('# Vuelta a lo que recoge ops/produccion.json. Esto NO ejecuta nada: revisa y ejecuta tú cada línea.');
    for (const c of comandos) console.log(c);
    if (errores.length) fallar(errores);
    return;
  }
  const antes = JSON.parse(fs.readFileSync(String(valor('--desde')), 'utf8'));
  const n = nube();
  const despues = {};
  for (const s of Object.keys(antes)) despues[s] = (await n.servicio(s)).revision;
  const plan = planDeMarchaAtras(antes, despues, revisionesSinArreglo(mapaDeProduccion()));
  if (!plan.length) { console.log('· nada que devolver: ninguna revisión cambió'); return; }
  for (const paso of plan) {
    if (paso.bloqueada) { console.log(`⚠ ${paso.servicio}: NO se devuelve a ${paso.revision}: ${paso.motivo}`); process.exitCode = 1; continue; }
    if (args.includes('--ejecutar')) { await n.traficoA(paso.servicio, paso.revision); console.log(`↩ ${paso.servicio}: tráfico devuelto a ${paso.revision}`); }
    else console.log(`(simulado) ${paso.servicio}: devolvería el tráfico a ${paso.revision}`);
  }
};

const tag = () => console.log(tagDeDespliegue(valor('--objetivo'), new Date().toISOString()));

const PASOS = { verificar, revisiones, humo, observar, hashes, registro, 'marcha-atras': marchaAtras, tag };
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const paso = PASOS[process.argv[2]];
  if (!paso) fallar([`paso desconocido: ${process.argv[2]} (${Object.keys(PASOS).join(', ')})`]);
  Promise.resolve(paso()).catch((e) => fallar([e.message]));
}
