#!/usr/bin/env node
/*
 * COMPROBACIONES PREVIAS AL LANZAMIENTO — Frente H (docs/LANZAMIENTO.md § Comprobaciones previas).
 *
 *   node scripts/prelanzamiento.mjs                 # modo LOCAL (por defecto): el repositorio y los valores por defecto del código
 *   node scripts/prelanzamiento.mjs --produccion    # SOLO LEE get-wee y GitHub (gcloud list/describe, REST GET, gh api GET)
 *   node scripts/prelanzamiento.mjs --json          # además, el resultado en JSON (para pegarlo en el registro)
 *
 * Diez puntos, cada uno PASA o FALLA (y SOLO-PRODUCCION cuando en local no hay forma honrada de saberlo). Sale con
 * 1 si alguno FALLA, 0 si no, 2 si no puede ni empezar (p. ej. sin `functions/lib`: npm run build --prefix functions).
 *
 * Lo que se exige está en ops/observabilidad/prelanzamiento-esperado.json: son DECISIONES, y se cambian allí.
 *
 * El modo producción NUNCA escribe: toda orden pasa por `soloLectura()`, que rechaza cualquier verbo de gcloud que
 * no sea list/describe/print-access-token, cualquier `gh` que no sea un GET y cualquier petición HTTP que no sea un
 * GET o una de las dos lecturas POST de Firestore (`:runQuery`, `:batchGet`). Lo fija
 * functions/test/prelanzamiento.test.mjs. El token de la sesión de gcloud se guarda en memoria y nunca se imprime.
 * Los secretos se miran SOLO por nombre (`--format=json(name)`), nunca su valor.
 */
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const leerTexto = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const leerJson = (p) => JSON.parse(leerTexto(p));
const importar = (p) => import(pathToFileURL(path.join(RAIZ, p)).href);

export const ESPERADO = leerJson('ops/observabilidad/prelanzamiento-esperado.json');
const PROYECTO = ESPERADO.proyecto;
const REGION = ESPERADO.region;

export const PASA = 'PASA';
export const FALLA = 'FALLA';
export const SOLO_PRODUCCION = 'SOLO-PRODUCCION';
const r = (estado, detalle) => ({ estado, detalle });

/* ═══ La cerradura: solo lectura ═══════════════════════════════════════════ */

const VERBOS_GCLOUD = new Set(['list', 'describe', 'list-configs', 'print-access-token']);
const PROHIBIDOS = /^(create|update|delete|set|add|remove|deploy|undelete|enable|disable|patch|replace|import|export|restore|update-traffic|set-iam-policy|add-iam-policy-binding|versions)$/;
const POST_DE_LECTURA = /:(runQuery|batchGet)$/;

/** ¿Es una lectura? Lanza si no. Pura: la usan los tres lectores y la prueba. */
export const soloLectura = (tipo, args, opciones = {}) => {
  if (tipo === 'gcloud') {
    const posicionales = args.filter((a) => !a.startsWith('-'));
    const verbo = posicionales.find((a) => VERBOS_GCLOUD.has(a));
    if (!verbo || posicionales.some((a) => PROHIBIDOS.test(a))) throw new Error(`orden de gcloud no permitida (solo lectura): ${posicionales.join(' ')}`);
    return true;
  }
  if (tipo === 'gh') {
    if (args[0] !== 'api' || args.some((a, i) => /^(-X|--method)$/.test(a) && String(args[i + 1]).toUpperCase() !== 'GET')
      || args.some((a) => /^(-f|-F|--field|--raw-field|--input)$/.test(a))) throw new Error(`orden de gh no permitida (solo GET): ${args.join(' ')}`);
    return true;
  }
  if (tipo === 'http') {
    const metodo = String(opciones.method || 'GET').toUpperCase();
    if (metodo === 'GET') return true;
    if (metodo === 'POST' && POST_DE_LECTURA.test(new URL(args).pathname)) return true;
    throw new Error(`petición no permitida (solo lectura): ${metodo} ${new URL(args).pathname}`);
  }
  throw new Error(`lector desconocido: ${tipo}`);
};

/** Los lectores reales. Inyectables: las pruebas pasan unos falsos con datos de producción simulados. */
export const lectoresReales = () => {
  let token;
  const gcloud = (args) => {
    soloLectura('gcloud', args);
    const x = spawnSync('gcloud', args, { encoding: 'utf8', shell: process.platform === 'win32', maxBuffer: 64 * 1024 * 1024 });
    if (x.status !== 0) return null;
    try { return JSON.parse(x.stdout || 'null'); } catch { return null; }
  };
  const gh = (args) => {
    soloLectura('gh', args);
    const x = spawnSync('gh', args, { encoding: 'utf8', shell: process.platform === 'win32', maxBuffer: 16 * 1024 * 1024 });
    if (x.status !== 0) return null;
    try { return JSON.parse(x.stdout || 'null'); } catch { return null; }
  };
  const http = async (url, opciones = {}) => {
    soloLectura('http', url, opciones);
    if (!token) {
      soloLectura('gcloud', ['auth', 'print-access-token']);
      const x = spawnSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8', shell: process.platform === 'win32' });
      token = (x.stdout || '').trim();
      if (x.status !== 0 || !token) throw new Error('sin sesión de gcloud');
    }
    const res = await fetch(url, { ...opciones, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(opciones.headers || {}) } });
    if (!res.ok) throw new Error(`${new URL(url).hostname} respondió ${res.status}`);
    return res.json();
  };
  return { gcloud, gh, http };
};

/* ═══ El compilado (valores por defecto y montajes) ════════════════════════ */

const require = createRequire(import.meta.url);
const lib = (p) => require(path.join(RAIZ, 'functions/lib', p));
export const cargarDefectos = () => {
  const reg = lib('engine/registry.js');
  return { settings: reg.DEFAULT_SETTINGS, providers: reg.DEFAULT_PROVIDERS, routing: reg.DEFAULT_ROUTING || {}, adapters: reg.ADAPTERS };
};

/** Nombres de secreto que monta cada función, leídos del compilado (`__endpoint.secretEnvironmentVariables`). Solo nombres. */
export const montajesDelCodigo = () => {
  const credencial = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  try {
    const compilado = lib('index.js');
    const por = {};
    for (const [f, x] of Object.entries(compilado)) for (const s of (x && x.__endpoint && x.__endpoint.secretEnvironmentVariables) || []) (por[s.key] ||= []).push(f);
    return por;
  } finally { if (credencial !== undefined) process.env.GOOGLE_APPLICATION_CREDENTIALS = credencial; }
};

/* ═══ Lógica pura de cada punto ═════════════════════════════════════════════ */

/**
 * ¿Está apagado el vídeo? Reproduce la decisión del router (engine/router.ts): con `iaDetenida` no hay nada; si no,
 * una capacidad está apagada cuando su cadena no deja ningún candidato real Y el modo demo no puede entrar (o porque
 * `allowMockFallback` está apagado o porque sigue habiendo un proveedor real habilitado para ella, que es lo que le
 * cierra la puerta al demo). Lo prueba contra el router de verdad functions/test/desactivacion-selectiva.test.mjs.
 */
export const capacidadApagada = ({ settings = {}, routing = {}, providers = {}, atiende }, cap) => {
  if (settings.iaDetenida) return true;
  const habilitado = (p) => !(providers[p] && providers[p].enabled === false);
  const cadena = routing[cap] && Array.isArray(routing[cap].chain) && routing[cap].chain.length ? routing[cap].chain.map((l) => l.provider) : null;
  const reales = Object.keys(atiende).filter((p) => p !== 'mock' && atiende[p](cap));
  /* Línea B (X2): sin `videoHabilitado === true` el router salta todo proveedor REAL de vídeo (engine/router.ts: «vídeo apagado por administración»). */
  const videoApagado = String(cap).startsWith('video.') && settings.videoHabilitado !== true;
  const candidatos = (cadena || reales).filter((p) => atiende[p] && atiende[p](cap) && habilitado(p) && !(videoApagado && p !== 'mock'));
  const realDisponible = reales.some(habilitado);
  const demo = settings.allowMockFallback !== false && !realDisponible;
  return candidatos.length === 0 && !demo;
};

/** La revisión que sirve el 100 % del tráfico en un servicio de `gcloud run services list` (formato Knative v1). */
export const revisionSirviendo = (svc) => {
  const t = ((svc && svc.status && svc.status.traffic) || []).filter((x) => Number(x.percent) > 0);
  return t.length === 1 && Number(t[0].percent) === 100 ? t[0].revisionName : t.length ? `reparto:${t.map((x) => `${x.revisionName}=${x.percent}`).join(',')}` : null;
};

/** Nombres de secreto (y variables de entorno no secretas, por nombre y valor) de un servicio. Nunca el valor de un secreto. */
export const entornoDe = (svc) => {
  const anotaciones = (svc && svc.spec && svc.spec.template && svc.spec.template.metadata && svc.spec.template.metadata.annotations) || {};
  const alias = Object.fromEntries(String(anotaciones['run.googleapis.com/secrets'] || '').split(',').map((par) => par.trim()).filter(Boolean)
    .map((par) => { const i = par.indexOf(':'); return i > 0 ? [par.slice(0, i), par.slice(par.lastIndexOf('/') + 1)] : null; }).filter(Boolean));
  const env = ((svc && svc.spec && svc.spec.template && svc.spec.template.spec && svc.spec.template.spec.containers) || []).flatMap((c) => c.env || []);
  return {
    /* `secretKeyRef.name` es un alias (`secret-<uuid>`) en los servicios de Functions: el nombre de Secret Manager va en la anotación `run.googleapis.com/secrets`. Un alias que no está en ella se queda como viene (y se denuncia). */
    secretos: env.filter((e) => e.valueFrom && e.valueFrom.secretKeyRef).map((e) => alias[e.valueFrom.secretKeyRef.name] || e.valueFrom.secretKeyRef.name),
    pricingMode: (env.find((e) => e.name === 'CREATOR_PRICING_MODE' && typeof e.value === 'string') || {}).value,
  };
};

export const huella = (texto) => crypto.createHash('sha256').update(String(texto).replace(/\r\n/g, '\n').trim()).digest('hex').slice(0, 16);

/* ═══ Los diez puntos ════════════════════════════════════════════════════════ */

export const PUNTOS = [
  { id: 'version', titulo: 'Versión desplegada = registro (ops/produccion.json)' },
  { id: 'precios', titulo: 'pricingMode y allowMockFallback' },
  { id: 'interruptores', titulo: 'Interruptores: iaDetenida y vídeo' },
  { id: 'costes', titulo: 'Tope de gasto diario (maxUsdPerDay)' },
  { id: 'reglas', titulo: 'Reglas desplegadas = reglas del repositorio' },
  { id: 'appcheck', titulo: 'App Check' },
  { id: 'copias', titulo: 'Copias de seguridad (PITR, protección, copia programada)' },
  { id: 'alertas', titulo: 'Alertas presentes (como código)' },
  { id: 'claves', titulo: 'Claves montadas (solo nombres)' },
  { id: 'ruleset', titulo: 'Ruleset de main y protección del repositorio' },
  { id: 'sondas', titulo: 'Sondas de datos (reservas, cobros sin asiento, trabajos parados, coste)' },
];

/** Lo que no depende de producción: el registro, el compilado y los archivos. */
const contextoLocal = () => {
  const registro = leerJson('ops/produccion.json');
  let defectos = null;
  try { defectos = cargarDefectos(); } catch { /* sin lib */ }
  return { registro, defectos };
};

const atiendeDe = (adapters) => Object.fromEntries(Object.entries(adapters || {}).map(([id, a]) => [id, (cap) => !!(a && a.supports && a.supports(cap))]));

export const comprobarLocal = async () => {
  const { registro, defectos } = contextoLocal();
  if (!defectos) return null;
  const out = {};
  const fuera = (registro.funciones || []).filter((f) => f.enMain === false).map((f) => f.funcion);
  out.version = fuera.length
    ? r(FALLA, `${fuera.length} función(es) vivas cuyo código no está en main según el registro: ${fuera.join(', ')}. Producción no corresponde a una base única (verificado ${String(registro.verificado).slice(0, 10)}).`)
    : r(PASA, `${registro.funciones.length} funciones en el registro, todas con su código en main`);

  const s = defectos.settings;
  const malP = [];
  if (s.pricingMode !== ESPERADO.precios.pricingMode) malP.push(`pricingMode=${s.pricingMode} (se espera ${ESPERADO.precios.pricingMode})`);
  if (s.allowMockFallback !== ESPERADO.precios.allowMockFallback) malP.push(`allowMockFallback=${s.allowMockFallback} (se espera ${ESPERADO.precios.allowMockFallback}: el demo se cobraría, B4-03)`);
  out.precios = malP.length ? r(FALLA, `valores por defecto del código (rigen mientras aiSettings/global no diga otra cosa): ${malP.join('; ')}`) : r(PASA, `pricingMode=${s.pricingMode}, allowMockFallback=${s.allowMockFallback}`);

  const atiende = atiendeDe(defectos.adapters);
  const vivas = ESPERADO.capacidadesDeVideo.filter((c) => !capacidadApagada({ settings: s, routing: defectos.routing, providers: defectos.providers, atiende }, c));
  const malI = [];
  if (!!s.iaDetenida !== ESPERADO.interruptores.iaDetenida) malI.push(`iaDetenida=${!!s.iaDetenida}`);
  if (ESPERADO.interruptores.video === 'apagado' && vivas.length) malI.push(`vídeo ENCENDIDO por defecto (${vivas.join(', ')}); se espera apagado: aiRouting/<capacidad>.chain (docs/LANZAMIENTO.md § Desactivación selectiva)`);
  if (ESPERADO.interruptores.video === 'encendido' && vivas.length < ESPERADO.capacidadesDeVideo.length) malI.push('vídeo apagado y se espera encendido');
  out.interruptores = malI.length ? r(FALLA, malI.join('; ')) : r(PASA, `iaDetenida=${!!s.iaDetenida}, vídeo ${vivas.length ? 'encendido' : 'apagado'}`);

  out.costes = typeof s.maxUsdPerDay === 'number' && s.maxUsdPerDay > 0
    ? r(PASA, `maxUsdPerDay=${s.maxUsdPerDay} por defecto`)
    : r(ESPERADO.costes.maxUsdPerDayObligatorio ? FALLA : PASA, 'sin maxUsdPerDay por defecto: hay que fijarlo en aiSettings/global antes de abrir (en producción hoy no existe ese documento)');

  const fb = leerJson('firebase.json');
  const reglas = [fb.firestore && fb.firestore.rules, fb.storage && fb.storage.rules].filter(Boolean);
  const faltan = reglas.filter((p) => !fs.existsSync(path.join(RAIZ, p)));
  out.reglas = faltan.length ? r(FALLA, `firebase.json apunta a reglas que no existen: ${faltan.join(', ')}`)
    : r(PASA, `${reglas.map((p) => `${p}#${huella(leerTexto(p))}`).join(', ')} (comparar con lo desplegado: --produccion)`);

  const opciones = leerTexto('functions/src/opciones.ts');
  const ac = /export const APP_CHECK_OBLIGATORIO = (true|false);/.exec(opciones);
  out.appcheck = !ac ? r(FALLA, 'no se encuentra APP_CHECK_OBLIGATORIO en functions/src/opciones.ts')
    : (ac[1] === 'true') === ESPERADO.appCheck.funcionesObligatorio ? r(PASA, `APP_CHECK_OBLIGATORIO=${ac[1]} (lo esperado; docs/SECURITY.md § App Check)`)
      : r(FALLA, `APP_CHECK_OBLIGATORIO=${ac[1]}, se espera ${ESPERADO.appCheck.funcionesObligatorio}`);

  out.copias = r(SOLO_PRODUCCION, 'PITR, protección de borrado y copia programada solo se leen en el proyecto (--produccion). E5-15: PITR estaba apagado.');

  const { archivosVersionados, CARPETA_VERSIONADA } = await importar('ops/observabilidad/lanzamiento.mjs');
  const desfasados = Object.entries(archivosVersionados()).filter(([n, c]) => {
    const p = path.join(RAIZ, CARPETA_VERSIONADA, n);
    return !fs.existsSync(p) || fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n') !== c;
  }).map(([n]) => n);
  out.alertas = desfasados.length ? r(FALLA, `políticas versionadas desfasadas: ${desfasados.join(', ')} (node ops/observabilidad/lanzamiento.mjs --escribir)`)
    : r(PASA, `${Object.keys(archivosVersionados()).length} archivos versionados al día en ${CARPETA_VERSIONADA}/ (si están APLICADAS: --produccion)`);

  let montajes = null;
  try { montajes = montajesDelCodigo(); } catch { /* compilado sin cargar */ }
  out.claves = !montajes ? r(FALLA, 'no se pudo cargar functions/lib/index.js para leer los montajes')
    : r(PASA, `${Object.keys(montajes).length} secretos montados por el código: ${Object.keys(montajes).sort().join(', ')} (que existan en Secret Manager: --produccion)`);

  const rs = leerJson('ops/github/ruleset-main.json');
  const tipos = (rs.rules || []).map((x) => x.type);
  const pr = (rs.rules || []).find((x) => x.type === 'pull_request');
  const okRs = rs.enforcement === 'active' && ['deletion', 'non_fast_forward', 'pull_request', 'required_status_checks'].every((t) => tipos.includes(t)) && !(rs.bypass_actors || []).length;
  out.ruleset = okRs ? r(PASA, `ops/github/ruleset-main.json: PR obligatorio, 4 checks de CI, sin excepciones; aprobaciones obligatorias: ${pr.parameters.required_approving_review_count} (lo vivo: --produccion)`)
    : r(FALLA, 'ops/github/ruleset-main.json no exige PR, checks y ausencia de excepciones');

  out.sondas = r(SOLO_PRODUCCION, 'las sondas leen Firestore de producción (--produccion); en local se prueban con datos de ejemplo (functions/test/observabilidad-lanzamiento.test.mjs)');
  return out;
};

/** Modo producción: lo mismo, leyendo. `l` = { gcloud, gh, http } (solo lectura). */
export const comprobarProduccion = async (l) => {
  const { registro, defectos } = contextoLocal();
  if (!defectos) return null;
  const out = {};
  const P = `--project=${PROYECTO}`;
  const FS = `https://firestore.googleapis.com/v1/projects/${PROYECTO}/databases/(default)/documents`;
  const { deFirestore } = await importar('ops/observabilidad/lanzamiento.mjs');
  const doc = async (ruta) => {
    const x = await l.http(`${FS}:batchGet`, { method: 'POST', body: JSON.stringify({ documents: [`projects/${PROYECTO}/databases/(default)/documents/${ruta}`] }) });
    const f = (x || []).find((y) => y.found);
    return f ? deFirestore(f.found) : null;
  };
  const coleccion = async (nombre) => {
    const x = await l.http(`${FS}:runQuery`, { method: 'POST', body: JSON.stringify({ structuredQuery: { from: [{ collectionId: nombre }], limit: 100 } }) });
    return (x || []).filter((y) => y.document).map((y) => deFirestore(y.document));
  };
  const intentar = async (id, fn) => { try { out[id] = await fn(); } catch (e) { out[id] = r(FALLA, `no se pudo leer: ${String((e && e.message) || e).slice(0, 200)}`); } };

  const servicios = l.gcloud(['run', 'services', 'list', `--region=${REGION}`, P, '--format=json']);
  await intentar('version', async () => {
    if (!Array.isArray(servicios)) return r(FALLA, 'no se pudieron listar los servicios de Cloud Run');
    const porNombre = Object.fromEntries(servicios.map((s) => [s.metadata && s.metadata.name, s]));
    const dif = [];
    for (const f of registro.funciones || []) {
      const vivo = porNombre[f.funcion.toLowerCase()];
      const sirve = vivo ? revisionSirviendo(vivo) : null;
      if (!vivo) dif.push(`${f.funcion}: no existe`);
      else if (sirve !== f.revision) dif.push(`${f.funcion}: sirve ${sirve}, el registro dice ${f.revision}`);
      if (f.enMain === false) dif.push(`${f.funcion}: su código no está en main`);
    }
    const sinRegistro = Object.keys(porNombre).filter((n) => !(registro.funciones || []).some((f) => f.funcion.toLowerCase() === n));
    if (sinRegistro.length) dif.push(`servicios vivos que el registro no conoce: ${sinRegistro.join(', ')}`);
    return dif.length ? r(FALLA, dif.join('; ')) : r(PASA, `${registro.funciones.length} funciones sirven la revisión del registro`);
  });

  let global = null; let routing = {}; let providers = {};
  await intentar('precios', async () => {
    global = await doc('aiSettings/global');
    const s = { ...defectos.settings, ...(global || {}) };
    const modos = [...new Set((servicios || []).map((x) => entornoDe(x).pricingMode).filter(Boolean))];
    const modo = modos.includes('real') ? 'real' : s.pricingMode;
    const mal = [];
    if (modo !== ESPERADO.precios.pricingMode) mal.push(`pricingMode=${modo}${modos.length ? ` (CREATOR_PRICING_MODE: ${modos.join(', ')})` : ''}`);
    if (s.allowMockFallback !== ESPERADO.precios.allowMockFallback) mal.push(`allowMockFallback=${s.allowMockFallback}${global ? '' : ' (no existe aiSettings/global: rige el valor por defecto)'}`);
    return mal.length ? r(FALLA, mal.join('; ')) : r(PASA, `pricingMode=${modo}, allowMockFallback=${s.allowMockFallback}`);
  });
  await intentar('interruptores', async () => {
    const s = { ...defectos.settings, ...(global || {}) };
    routing = { ...defectos.routing, ...Object.fromEntries((await coleccion('aiRouting')).map((d) => [d.id, d])) };
    providers = { ...defectos.providers };
    for (const d of await coleccion('aiProviders')) providers[d.id] = { ...(providers[d.id] || {}), ...d };
    const atiende = atiendeDe(defectos.adapters);
    const vivas = ESPERADO.capacidadesDeVideo.filter((c) => !capacidadApagada({ settings: s, routing, providers, atiende }, c));
    const mal = [];
    if (!!s.iaDetenida !== ESPERADO.interruptores.iaDetenida) mal.push(`iaDetenida=${!!s.iaDetenida}`);
    if (ESPERADO.interruptores.video === 'apagado' && vivas.length) mal.push(`vídeo encendido en ${vivas.join(', ')}`);
    if (ESPERADO.interruptores.video === 'encendido' && vivas.length < ESPERADO.capacidadesDeVideo.length) mal.push('vídeo apagado');
    return mal.length ? r(FALLA, mal.join('; ')) : r(PASA, `iaDetenida=${!!s.iaDetenida}, vídeo ${vivas.length ? 'encendido' : 'apagado'}`);
  });
  await intentar('costes', async () => {
    const tope = global && global.maxUsdPerDay;
    return typeof tope === 'number' && tope > 0 ? r(PASA, `maxUsdPerDay=${tope}`) : r(ESPERADO.costes.maxUsdPerDayObligatorio ? FALLA : PASA, 'aiSettings/global no tiene maxUsdPerDay');
  });

  await intentar('reglas', async () => {
    const base = `https://firebaserules.googleapis.com/v1/projects/${PROYECTO}`;
    const releases = ((await l.http(`${base}/releases`)) || {}).releases || [];
    const fb = leerJson('firebase.json');
    const pares = [['cloud.firestore', fb.firestore.rules], ...releases.filter((x) => String(x.name).includes('/releases/firebase.storage/')).map((x) => [x.name.split('/releases/')[1], fb.storage.rules])];
    const mal = [];
    const ok = [];
    for (const [release, archivo] of pares) {
      const rel = releases.find((x) => x.name.endsWith(`/releases/${release}`));
      if (!rel) { mal.push(`no hay release ${release}`); continue; }
      const rs = await l.http(`https://firebaserules.googleapis.com/v1/${rel.rulesetName}`);
      const vivo = ((rs && rs.source && rs.source.files) || []).map((f) => f.content).join('\n');
      if (huella(vivo) !== huella(leerTexto(archivo))) mal.push(`${archivo}: lo desplegado (${huella(vivo)}) ≠ repositorio (${huella(leerTexto(archivo))})`);
      else ok.push(`${archivo}#${huella(vivo)}`);
    }
    return mal.length ? r(FALLA, mal.join('; ')) : r(PASA, ok.join(', '));
  });
  await intentar('appcheck', async () => {
    const x = await l.http(`https://firebaseappcheck.googleapis.com/v1/projects/${PROYECTO}/services`);
    const modos = ((x && x.services) || []).map((s) => `${String(s.name).split('/').pop()}=${s.enforcementMode || 'OFF'}`);
    const fuera = ((x && x.services) || []).filter((s) => !ESPERADO.appCheck.serviciosPermitidos.includes(s.enforcementMode || 'OFF'));
    const ac = /export const APP_CHECK_OBLIGATORIO = (true|false);/.exec(leerTexto('functions/src/opciones.ts'));
    const mal = fuera.map((s) => `${String(s.name).split('/').pop()} en ${s.enforcementMode}`);
    if (ac && (ac[1] === 'true') !== ESPERADO.appCheck.funcionesObligatorio) mal.push(`APP_CHECK_OBLIGATORIO=${ac[1]}`);
    return mal.length ? r(FALLA, mal.join('; ')) : r(PASA, `servicios: ${modos.join(', ') || 'ninguno configurado (OFF)'}; funciones: APP_CHECK_OBLIGATORIO=${ac && ac[1]}`);
  });
  await intentar('copias', async () => {
    const db = l.gcloud(['firestore', 'databases', 'describe', '--database=(default)', P, '--format=json']);
    const prog = l.gcloud(['firestore', 'backups', 'schedules', 'list', '--database=(default)', P, '--format=json']);
    if (!db) return r(FALLA, 'no se pudo describir la base de datos');
    const mal = [];
    if (ESPERADO.copias.pitr && db.pointInTimeRecoveryEnablement !== 'POINT_IN_TIME_RECOVERY_ENABLED') mal.push(`PITR: ${db.pointInTimeRecoveryEnablement || 'desconocido'}`);
    if (ESPERADO.copias.proteccionDeBorrado && db.deleteProtectionState !== 'DELETE_PROTECTION_ENABLED') mal.push(`protección de borrado: ${db.deleteProtectionState || 'desconocida'}`);
    if (ESPERADO.copias.copiaProgramada && !(Array.isArray(prog) && prog.length)) mal.push('sin copia programada');
    return mal.length ? r(FALLA, mal.join('; ')) : r(PASA, `PITR activo, protección activa, ${prog.length} copia(s) programada(s)`);
  });
  await intentar('alertas', async () => {
    const { planificar } = await importar('ops/observabilidad/aplicar.mjs');
    const { LECTURAS, comparar } = await importar('ops/observabilidad/verificar.mjs');
    const vivo = Object.fromEntries(Object.entries(LECTURAS).map(([k, args]) => [k, l.gcloud(args)]));
    const pendiente = planificar(vivo).filter((a) => a.accion !== 'igual');
    const sinCanal = comparar(vivo).filter((d) => /canal|no avisa/.test(d));
    const mal = [...pendiente.map((a) => `${a.recurso} ${a.nombre}: ${a.accion}`), ...sinCanal];
    return mal.length ? r(FALLA, `${mal.length}: ${mal.slice(0, 8).join('; ')}${mal.length > 8 ? '…' : ''} (node ops/observabilidad/aplicar.mjs)`) : r(PASA, 'todas las alertas, métricas, comprobaciones y el panel, con canal verificado');
  });
  await intentar('claves', async () => {
    const lista = l.gcloud(['secrets', 'list', P, '--format=json(name)']);
    if (!Array.isArray(lista)) return r(FALLA, 'no se pudieron listar los nombres de Secret Manager');
    const existen = new Set(lista.map((x) => String(x.name).split('/').pop()));
    const montadosVivos = new Set((servicios || []).flatMap((s) => entornoDe(s).secretos));
    const faltan = [...montadosVivos].filter((n) => !existen.has(n));
    return faltan.length ? r(FALLA, `montados y sin existir en Secret Manager: ${faltan.join(', ')}`) : r(PASA, `${montadosVivos.size} secretos montados en servicios vivos (${[...montadosVivos].sort().join(', ')}); ${existen.size} en Secret Manager`);
  });
  await intentar('ruleset', async () => {
    const { LECTURAS, RULESET, comparar } = await importar('ops/github/proteccion.mjs');
    const lec = Object.fromEntries(Object.entries(LECTURAS).map(([k, ruta]) => [k, l.gh(['api', ruta])]));
    const resumen = (lec.rulesets || []).find((x) => x.name === RULESET.name);
    lec.ruleset = resumen ? l.gh(['api', `${LECTURAS.rulesets}/${resumen.id}`]) : null;
    const d = comparar(lec);
    return d.length ? r(FALLA, d.join('; ')) : r(PASA, 'conforme con ops/github/');
  });
  await intentar('sondas', async () => {
    const { correrSondas } = await importar('ops/observabilidad/lanzamiento.mjs');
    const { lectorRest } = await importar('ops/observabilidad/sondas.mjs');
    const lector = lectorRest({ token: 'no-se-usa', pedir: async (url, op) => ({ ok: true, text: async () => JSON.stringify(await l.http(url, op)) }) });
    const res = await correrSondas(lector);
    const malas = res.filter((x) => x.estado !== PASA);
    return malas.length ? r(FALLA, malas.map((x) => `${x.id}: ${x.detalle}`).join('; ')) : r(PASA, `${res.length} sondas pasan`);
  });
  return out;
};

export const imprimir = (resultados, { modo, log = console.log }) => {
  log(`# Weë · comprobaciones previas al lanzamiento — modo ${modo}\n`);
  for (const p of PUNTOS) {
    const x = resultados[p.id] || r(FALLA, 'sin resultado');
    log(`${x.estado.padEnd(15)} ${p.titulo}\n${' '.repeat(16)}${x.detalle}`);
  }
  const fallan = PUNTOS.filter((p) => (resultados[p.id] || {}).estado === FALLA).length;
  const solo = PUNTOS.filter((p) => (resultados[p.id] || {}).estado === SOLO_PRODUCCION).length;
  log(`\n${fallan ? `✘ ${fallan} FALLA` : '✔ ninguno FALLA'} · ${PUNTOS.length - fallan - solo} PASA${solo ? ` · ${solo} solo se pueden ver en producción` : ''}`);
  return fallan ? 1 : 0;
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const produccion = process.argv.includes('--produccion');
  const resultados = produccion ? await comprobarProduccion(lectoresReales()) : await comprobarLocal();
  if (!resultados) { console.error('✘ falta functions/lib: npm run build --prefix functions'); process.exit(2); }
  const codigo = imprimir(resultados, { modo: produccion ? `PRODUCCIÓN (${PROYECTO}, solo lectura)` : 'LOCAL (repositorio y valores por defecto del código)' });
  if (process.argv.includes('--json')) console.log(JSON.stringify({ modo: produccion ? 'produccion' : 'local', resultados }, null, 2));
  process.exit(codigo);
}
