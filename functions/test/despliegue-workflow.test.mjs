/*
 * EL ÚNICO CAMINO A PRODUCCIÓN — `.github/workflows/despliegue.yml`, `ops/despliegue/` y `ops/iam/wif.mjs`.
 *
 * ── Qué vigila ─────────────────────────────────────────────────────────────
 *
 * El workflow de despliegue (FASE 6) promete: solo un commit de main con la
 * CI en verde, que no pisa producción, aprobado por el dueño (entorno
 * `get-wee`), con una identidad sin claves de permisos mínimos, humo sin gasto,
 * la web comparada por sha256, diez minutos de observación de los 5xx, marcha
 * atrás automática que nunca reabre un arreglo de seguridad, y un tag inmutable
 * con el registro de lo desplegado (revisión, digest de imagen, versión web).
 *
 * Esta suite fija esas promesas en el texto del workflow, EJECUTA la lógica que
 * decide (plan.mjs), el cliente de Cloud Run con una red de mentira (nube.mjs) y
 * comprueba que la identidad de `wif.mjs` solo sirve al workflow aprobado y no
 * tiene permisos de más.
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const importar = (p) => import(pathToFileURL(path.resolve(RAIZ, p)).href);

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const wf = leer('.github/workflows/despliegue.yml');
const sinComentarios = wf.split('\n').map((l) => l.replace(/(^|\s)#.*$/, '')).join('\n');
const job = (nombre) => (sinComentarios.split(/\n  (?=[a-z-]+:\n)/).find((b) => b.startsWith(`${nombre}:`)) || '');

/* ── A. El workflow ─────────────────────────────────────────────────────── */
check('1) solo se lanza a mano (workflow_dispatch): ni un push ni un tag despliegan solos',
  /^on:\s*\n\s+workflow_dispatch:/m.test(sinComentarios) && !/^\s+(push|pull_request|release|schedule):/m.test(sinComentarios));
check('2) por defecto el token solo lee', /^permissions:\s*\n\s+contents:\s*read\s*$/m.test(sinComentarios));
check('3) la identidad de Google (id-token) SOLO en el job que despliega',
  /id-token:\s*write/.test(job('desplegar')) && !/id-token/.test(job('verificar')) && !/id-token/.test(job('registrar')));
check('4) escribir en el repositorio (el tag) SOLO en el job que registra',
  /contents:\s*write/.test(job('registrar')) && !/contents:\s*write/.test(job('desplegar')) && !/contents:\s*write/.test(job('verificar')));
check('5) desplegar exige la aprobación del entorno get-wee y la verificación previa',
  /environment:\s*get-wee/.test(job('desplegar')) && /needs:\s*verificar/.test(job('desplegar')));
check('6) un despliegue a medias nunca se cancela por otro', /cancel-in-progress:\s*false/.test(sinComentarios) && /group:\s*despliegue-get-wee/.test(sinComentarios));
const usos = [...sinComentarios.matchAll(/uses:\s*(\S+)/g)].map((m) => m[1]);
check('7) cada acción va fijada por SHA completo', usos.length >= 6 && usos.every((u) => /@[0-9a-f]{40}$/.test(u)), usos.filter((u) => !/@[0-9a-f]{40}$/.test(u)).join(', '));
/* Solo el texto de los `run:` (una línea o bloque `|`): eso es lo que interpreta la shell. */
const bloquesRun = [];
const lineas = sinComentarios.split('\n');
for (let i = 0; i < lineas.length; i++) {
  const m = lineas[i].match(/^(\s*)(?:- )?run:\s*(.*)$/);
  if (!m) continue;
  if (m[2] && m[2] !== '|' && m[2] !== '>') { bloquesRun.push(m[2]); continue; }
  const cuerpo = [];
  for (let j = i + 1; j < lineas.length && (!lineas[j].trim() || lineas[j].match(/^\s*/)[0].length > m[1].length); j++) cuerpo.push(lineas[j]);
  bloquesRun.push(cuerpo.join('\n'));
}
check('8) las entradas llegan a los scripts por variables de entorno, nunca pegadas en `run:` (inyección)',
  bloquesRun.length >= 8 && !bloquesRun.some((b) => /\$\{\{/.test(b)), `${bloquesRun.length} bloques run`);
check('9) despliega con firebase-tools fijado, al proyecto get-wee, sin preguntar y SIN --force',
  /npx --yes firebase-tools@15\.29\.0 deploy --only "\$SOLO" --project get-wee --non-interactive/.test(sinComentarios) && !/--force/.test(sinComentarios));
check('10) primero verifica (main, CI, no pisa producción); luego humo; y si algo falla, marcha atrás',
  /cli\.mjs verificar/.test(job('verificar')) && /cli\.mjs humo/.test(job('desplegar'))
  && /if:\s*failure\(\)[^\n]*\n[\s\S]*?cli\.mjs marcha-atras --desde antes\.json --ejecutar/.test(job('desplegar')));
check('11) ningún secreto de GitHub: solo variables del entorno y el token del propio workflow', !/\$\{\{\s*secrets\./.test(sinComentarios));

/* ── B. La lógica que decide ────────────────────────────────────────────── */
const plan = await importar('ops/despliegue/plan.mjs');
const o1 = plan.leerObjetivo('functions:brainChat, functions:creatorRun,firestore:rules,functions:brainChat');
check('12) el objetivo se lee y se deduplica', o1.errores.length === 0 && o1.solo === 'functions:brainChat,functions:creatorRun,firestore:rules', o1.solo);
check('13) «functions» a secas (TODAS) se rechaza', /TODAS/.test(plan.leerObjetivo('functions').errores[0] || ''));
check('14) un objetivo desconocido o un nombre raro, también',
  plan.leerObjetivo('database').errores.length === 1 && plan.leerObjetivo('functions:a;rm -rf').errores.length === 1);
const SHA = 'a'.repeat(40);
const verde = plan.NIVELES_DE_CI.map((name) => ({ name, status: 'completed', conclusion: 'success' }));
check('15) commit de main con los tres niveles en verde: se puede', plan.motivosContraElCommit({ sha: SHA, enMain: true, checkRuns: verde }).length === 0);
check('16) un SHA corto, uno fuera de main o un nivel sin pasar: no',
  plan.motivosContraElCommit({ sha: 'abc1234', enMain: true, checkRuns: verde }).length === 1
  && plan.motivosContraElCommit({ sha: SHA, enMain: false, checkRuns: verde }).length === 1
  && plan.motivosContraElCommit({ sha: SHA, enMain: true, checkRuns: [{ ...verde[0] }, { ...verde[1], conclusion: 'failure' }] }).length === 2);
const ci = leer('.github/workflows/ci.yml');
check('17) los niveles que exige son exactamente los nombres de los jobs de ci.yml', plan.NIVELES_DE_CI.every((n) => ci.includes(`name: ${n}`)));
check('18) humo: 401/403 = viva y cerrada; 5xx o sin respuesta = fallo; programadas y eventos no se llaman',
  plan.juzgarHumo({ tipo: 'callable', lista: true, status: 401 }).ok && plan.juzgarHumo({ tipo: 'callable', lista: true, status: 403 }).ok
  && !plan.juzgarHumo({ tipo: 'http', lista: true, status: 502 }).ok && !plan.juzgarHumo({ tipo: 'callable', lista: true }).ok
  && plan.juzgarHumo({ tipo: 'programada', lista: true }).ok && !plan.juzgarHumo({ tipo: 'evento', lista: false }).ok);
const ma = plan.planDeMarchaAtras({ a: 'a-00001', b: 'b-00004' }, { a: 'a-00002', b: 'b-00004' });
check('19) la marcha atrás solo toca lo que cambió', ma.length === 1 && ma[0].servicio === 'a' && ma[0].revision === 'a-00001');
check('20) y manda el 100 % del tráfico a la revisión de antes',
  JSON.stringify(plan.cuerpoDeTrafico('a-00001')) === JSON.stringify({ traffic: [{ type: 'TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION', revision: 'a-00001', percent: 100 }] }));
check('21) el tag del despliegue es inmutable y dice qué y cuándo',
  plan.tagDeDespliegue('functions:brainChat', '2026-10-01T12:34:56.000Z') === 'prod/functions/brainChat/2026-10-01T1234Z'
  && plan.tagDeDespliegue('functions:a,functions:b,firestore:rules', '2026-10-01T12:34:00Z') === 'prod/functions/2fn+1/2026-10-01T1234Z');

/* ── C. El cliente de Cloud Run, con una red de mentira ─────────────────── */
const { crearNube } = await importar('ops/despliegue/nube.mjs');
const peticiones = [];
const red = async (url, opts) => {
  peticiones.push({ url, opts });
  if (opts.method === 'PATCH') return { ok: true, status: 200, text: async () => '{}' };
  if (url.endsWith('/services/roto')) return { ok: false, status: 403, text: async () => '{"error":"x"}' };
  if (url.endsWith('/services/nueva')) return { ok: false, status: 404, text: async () => '{"error":"not found"}' };
  if (url.endsWith('/services/fijada')) return { ok: true, status: 200, text: async () => JSON.stringify({ uri: 'https://fijada-x.a.run.app', latestReadyRevision: 'fijada-00009-new', latestCreatedRevision: 'fijada-00009-new', terminalCondition: { state: 'CONDITION_SUCCEEDED' }, trafficStatuses: [{ type: 'TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION', revision: 'fijada-00007-old', percent: 100 }] }) };
  if (url.includes('-run.googleapis.com/apis/serving.knative.dev/v1/')) return { ok: true, status: 200, text: async () => JSON.stringify({ status: { imageDigest: `us-central1-docker.pkg.dev/get-wee/gcf-artifacts/brain_chat@sha256:${'b'.repeat(64)}` } }) };
  if (url.startsWith('https://monitoring.googleapis.com/')) return { ok: true, status: 200, text: async () => JSON.stringify({ timeSeries: [{ points: [{ value: { int64Value: '3' } }, { value: { int64Value: '4' } }] }] }) };
  if (url.startsWith('https://firebasehosting.googleapis.com/')) return { ok: true, status: 200, text: async () => JSON.stringify({ releases: [{ version: { name: 'sites/wee-app/versions/abc123' } }] }) };
  return { ok: true, status: 200, text: async () => JSON.stringify({ uri: 'https://brainchat-x.a.run.app', latestReadyRevision: 'projects/p/locations/l/services/brainchat/revisions/brainchat-00012-abc', latestCreatedRevision: 'projects/p/locations/l/services/brainchat/revisions/brainchat-00012-abc', terminalCondition: { state: 'CONDITION_SUCCEEDED' }, trafficStatuses: [{ type: 'TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST', percent: 100 }] }) };
};
const nube = crearNube({ proyecto: 'get-wee', region: 'us-central1', token: 'TOKEN-SECRETO', fetch: red });
const s = await nube.servicio('brainchat');
check('22) lee la revisión que sirve, su URL y si está lista', s.revision === 'brainchat-00012-abc' && s.lista === true && /a\.run\.app/.test(s.uri));
check('23) con el token en la cabecera (y a la API v2 del proyecto)', peticiones[0].opts.headers.Authorization === 'Bearer TOKEN-SECRETO'
  && peticiones[0].url === 'https://run.googleapis.com/v2/projects/get-wee/locations/us-central1/services/brainchat');
let error = null;
try { await nube.servicio('roto'); } catch (e) { error = e; }
check('24) un error de Cloud Run nunca lleva el token', error && /403/.test(error.message) && !/TOKEN-SECRETO/.test(error.message));
await nube.traficoA('brainchat', 'brainchat-00011-old');
const p = peticiones.at(-1);
check('25) la marcha atrás es un PATCH del tráfico, nada más', p.opts.method === 'PATCH' && p.url.endsWith('/services/brainchat?updateMask=traffic')
  && JSON.parse(p.opts.body).traffic[0].revision === 'brainchat-00011-old');

const fijada = await nube.servicio('fijada');
check('25b) tras una marcha atrás, «la que sirve» es la fijada, no la última lista; y el humo no la da por buena',
  fijada.revision === 'fijada-00007-old' && fijada.creada === 'fijada-00009-new' && fijada.lista === false);
const nueva = await nube.servicio('nueva');
check('25c) una función que aún no existe no rompe nada: no hay revisión de antes a la que volver', nueva.existe === false && nueva.revision === null && nueva.lista === false);
const digest = await nube.digestDe('brainchat-00012-abc');
const pDigest = peticiones.at(-1);
check('25d) el digest exacto de la imagen sale de la API v1 regional (status.imageDigest), con el token en la cabecera',
  plan.digestDeImagen(digest) === `sha256:${'b'.repeat(64)}`
  && pDigest.url === 'https://us-central1-run.googleapis.com/apis/serving.knative.dev/v1/namespaces/get-wee/revisions/brainchat-00012-abc'
  && pDigest.opts.headers.Authorization === 'Bearer TOKEN-SECRETO');
const cinco = await nube.cuenta5xx(['brainchat'], '2026-10-01T10:00:00Z', '2026-10-01T10:10:00Z');
const pMon = peticiones.at(-1);
check('25e) los 5xx se cuentan en Cloud Monitoring, sumando todos los puntos de la ventana',
  cinco === 7 && pMon.url.startsWith('https://monitoring.googleapis.com/v3/projects/get-wee/timeSeries?')
  && new URL(pMon.url).searchParams.get('filter').includes('"brainchat"') && !pMon.url.includes('TOKEN-SECRETO'));
check('25f) y la versión publicada de un sitio, en la API de Hosting', (await nube.versionDeHosting('wee-app')) === 'abc123');

/* ── D. La identidad sin claves ─────────────────────────────────────────── */
const wif = await importar('ops/iam/wif.mjs');
check('26) la credencial solo es para ESTE repositorio, el workflow despliegue.yml de main y el entorno aprobado',
  wif.CONDICION.includes("assertion.repository_id == '1357703472'") && wif.CONDICION.includes("assertion.repository_owner_id == '325097307'")
  && wif.CONDICION.includes("workflow_ref.startsWith('geovetlf/wee-app/.github/workflows/despliegue.yml@refs/heads/main')")
  && wif.CONDICION.includes("assertion.environment == 'get-wee'"));
const roles = wif.ROLES.map(([r]) => r);
check('27) la cuenta de despliegue no tiene ningún rol de los prohibidos (Owner, Editor, IAM, leer secretos, facturación…)',
  roles.length >= 5 && roles.every((r) => !wif.NUNCA.includes(r)) && !roles.some((r) => /owner|editor|secretAccessor|billing|projectIamAdmin/i.test(r)), roles.join(', '));
check('28) el script solo imprime: no ejecuta nada', !/child_process|execSync|spawn|execFile/.test(leer('ops/iam/wif.mjs')));

check('28b) observar los 5xx es solo LEER métricas: monitoring.viewer, nunca un rol que escriba alertas o políticas',
  roles.includes('roles/monitoring.viewer') && !roles.some((r) => /monitoring\.(editor|admin|alertPolicyEditor)/.test(r)));

/* ── F. La revisión que sirve, la marcha atrás que no reabre nada ────────── */
check('30) la revisión que sirve: LATEST → la última lista; fijada → la fijada; repartida → ninguna, y se dice el reparto',
  plan.revisionQueSirve({ latestReadyRevision: 'x/a-00003', trafficStatuses: [{ type: 'TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST', percent: 100 }] }).revision === 'a-00003'
  && plan.revisionQueSirve({ latestReadyRevision: 'a-00003', trafficStatuses: [{ type: 'TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION', revision: 'a-00001', percent: 100 }] }).revision === 'a-00001'
  && plan.revisionQueSirve({ latestReadyRevision: 'a-00003', trafficStatuses: [{ revision: 'a-00001', percent: 50 }, { revision: 'a-00002', percent: 50 }] }).revision === null
  && plan.revisionQueSirve({ trafficStatuses: [{ revision: 'a-00001', percent: 50 }, { revision: 'a-00002', percent: 50 }] }).reparto.join(' ') === 'a-00001=50% a-00002=50%');
const mapa = JSON.parse(leer('ops/produccion.json'));
const prohibidas = plan.revisionesSinArreglo(mapa);
check('31) las revisiones prohibidas son exactamente las del mapa con arreglos pendientes (hoy: spendCredits sin assertAdmin)',
  [...prohibidas].join(',') === mapa.funciones.filter((f) => (f.requiere || []).length).map((f) => f.revision).join(',')
  && prohibidas.has(mapa.funciones.find((f) => f.funcion === 'spendCredits').revision), [...prohibidas].join(', '));
const sc = mapa.funciones.find((f) => f.funcion === 'spendCredits').revision;
const bloqueo = plan.planDeMarchaAtras({ spendcredits: sc, brainchat: 'brainchat-00011-old' }, { spendcredits: 'spendcredits-00006-new', brainchat: 'brainchat-00012-new' }, prohibidas);
check('32) la marcha atrás automática NUNCA devuelve spendCredits a su revisión sin assertAdmin; lo demás sí vuelve',
  bloqueo.length === 2 && bloqueo.find((x) => x.servicio === 'spendcredits').bloqueada === true
  && !bloqueo.find((x) => x.servicio === 'brainchat').bloqueada && bloqueo.find((x) => x.servicio === 'brainchat').revision === 'brainchat-00011-old');
check('32b) sin revisiones prohibidas, el plan es el de siempre (nada bloqueado)', JSON.stringify(plan.planDeMarchaAtras({ a: 'a-1' }, { a: 'a-2' })) === JSON.stringify([{ servicio: 'a', revision: 'a-1' }]));
const vuelta = plan.comandosDeVueltaAlMapa(mapa, ['brainChat', 'spendCredits', 'noExiste']);
const bc = mapa.funciones.find((f) => f.funcion === 'brainChat');
check('33) la vuelta al mapa imprime el comando exacto de cada función; para spendCredits se niega y dice por qué; lo desconocido es error',
  vuelta.comandos.some((c) => c === `gcloud run services update-traffic brainchat --region us-central1 --project get-wee --to-revisions ${bc.revision}=100   # ${bc.tag}`)
  && !vuelta.comandos.some((c) => c.includes('spendcredits')) && vuelta.errores.length === 2
  && vuelta.errores.some((e) => /^spendCredits: .*b878068.*reabriría/.test(e)) && vuelta.errores.some((e) => /^noExiste: /.test(e)));
const { spawnSync } = await import('node:child_process');
const cli = spawnSync(process.execPath, [path.resolve(RAIZ, 'ops/despliegue/cli.mjs'), 'marcha-atras', '--al-mapa', '--funciones', 'brainChat,spendCredits'],
  { cwd: RAIZ, encoding: 'utf8', env: { ...process.env, GCP_TOKEN: '' } });
check('34) «marcha-atras --al-mapa» funciona sin credenciales, solo imprime, y sale con error por spendCredits',
  cli.status === 1 && /NO ejecuta nada/.test(cli.stdout) && cli.stdout.includes(`--to-revisions ${bc.revision}=100`) && /✘ spendCredits:/.test(cli.stdout), `salida ${cli.status}`);
check('34b) y en ese camino no hay forma de mover tráfico: devuelve antes de pedir credenciales',
  (() => { const src = leer('ops/despliegue/cli.mjs'); const ramal = src.slice(src.indexOf("if (args.includes('--al-mapa'))"), src.indexOf('const antes = JSON.parse')); return ramal.length > 50 && !/nube\(\)|traficoA/.test(ramal) && /return;/.test(ramal); })());

/* ── G. Humo sin credenciales, hashes, observación y registro ────────────── */
check('35) humo sin credenciales: 401 es viva y cerrada; 503 o sin respuesta, fallo; programadas y eventos se dicen NO comprobadas',
  plan.juzgarHumoSinCredenciales({ tipo: 'callable', status: 401 }).ok && plan.juzgarHumoSinCredenciales({ tipo: 'callable', status: 401 }).verificado
  && !plan.juzgarHumoSinCredenciales({ tipo: 'http', status: 503 }).ok && !plan.juzgarHumoSinCredenciales({ tipo: 'callable' }).ok
  && plan.juzgarHumoSinCredenciales({ tipo: 'programada' }).ok && plan.juzgarHumoSinCredenciales({ tipo: 'evento' }).verificado === false);
check('36) la URL pública de una función gen2', plan.urlDeFuncion('brainChat') === 'https://us-central1-get-wee.cloudfunctions.net/brainChat');
const hosting = JSON.parse(leer('firebase.json')).hosting;
const ignorarDe = (sitio) => hosting.find((h) => h.site === sitio).ignore;
const rutas = ['index.html', '.well-known/x', 'firebase.json', 'assets/node_modules/@expo/vector-icons/Fonts/Ionicons.ttf', '_expo/static/js/web/index-abc.js', 'a/.git/config'];
const deWeeApp = plan.archivosAComparar(rutas, ignorarDe('wee-app'));
const deGetWee = plan.archivosAComparar(rutas, ignorarDe('get-wee'));
check('37) se comparan TODOS los archivos que publica cada sitio: wee-app incluye las fuentes de node_modules (el fallo de septiembre); nadie publica dotfiles ni firebase.json',
  deWeeApp.includes('assets/node_modules/@expo/vector-icons/Fonts/Ionicons.ttf') && deWeeApp.includes('index.html') && deWeeApp.includes('_expo/static/js/web/index-abc.js')
  && !deWeeApp.includes('firebase.json') && !deWeeApp.includes('.well-known/x') && !deWeeApp.includes('a/.git/config')
  && !deGetWee.includes('assets/node_modules/@expo/vector-icons/Fonts/Ionicons.ttf'), deWeeApp.join(' '));
check('38) los globs de ignore: ** cruza carpetas, * no', plan.globARegex('**/node_modules/**').test('a/b/node_modules/c/d.ttf') && plan.globARegex('**/node_modules/**').test('node_modules/x')
  && !plan.globARegex('*.json').test('a/b.json') && plan.globARegex('*.json').test('b.json') && plan.globARegex('**/.*').test('.env') && plan.globARegex('**/.*').test('a/.env'));
const iguales = plan.compararHashes({ 'index.html': 'h1', 'a.js': 'h2' }, { 'index.html': 'h1', 'a.js': 'h2' });
const distintos = plan.compararHashes({ 'index.html': 'h1', 'a.js': 'h2', 'f.ttf': 'h3' }, { 'index.html': 'hX', 'a.js': 'h2', 'f.ttf': null });
check('39) hashes: todo igual = bien; un archivo con otro contenido o sin poder leerse = fallo, y se nombra',
  iguales.ok && iguales.comparados === 2 && !distintos.ok && distintos.distintos.join() === 'index.html' && distintos.ausentes.join() === 'f.ttf');
check('40) observación: cuenta lo que SUBE sobre lo de antes; si no se puede medir, falla',
  plan.juzgarObservacion({ antes: 12, despues: 15, umbral: 5 }).ok && !plan.juzgarObservacion({ antes: 0, despues: 6, umbral: 5 }).ok
  && !plan.juzgarObservacion({ antes: undefined, despues: 0 }).ok && !plan.juzgarObservacion({ antes: 0, despues: NaN }).ok
  && !plan.juzgarObservacion({ antes: null, despues: 0 }).ok && !plan.juzgarObservacion({ antes: 0, despues: null }).ok
  && plan.OBSERVACION.minutos === 10 && plan.OBSERVACION.umbral === 5);
const q = plan.consultaDe5xx(['brainchat', 'creatorrun', 'brainchat'], '2026-10-01T10:00:00Z', '2026-10-01T10:10:00Z');
check('41) la consulta suma los 5xx de la ventana entera, solo de los servicios desplegados',
  q.get('aggregation.alignmentPeriod') === '600s' && q.get('aggregation.perSeriesAligner') === 'ALIGN_SUM' && q.get('aggregation.crossSeriesReducer') === 'REDUCE_SUM'
  && /response_code_class="5xx"/.test(q.get('filter')) && q.get('filter').includes('("brainchat" OR "creatorrun")')
  && plan.sumarSeries({}) === 0 && plan.sumarSeries({ timeSeries: [{ points: [{ value: { int64Value: '2' } }] }, { points: [{ value: { doubleValue: 1 } }] }] }) === 3);
check('42) un digest solo vale si es un sha256 completo', plan.digestDeImagen(`x/y@sha256:${'c'.repeat(64)}`) === `sha256:${'c'.repeat(64)}` && plan.digestDeImagen('x/y:latest') === null && plan.digestDeImagen(null) === null);
const reg = plan.mensajeDelRegistro({ commit: SHA, objetivo: 'functions:brainChat,hosting:wee-app', run: 'https://github.com/x/y/actions/runs/1',
  funciones: [{ funcion: 'brainChat', revision: 'brainchat-00013-xyz', digest: 'repo@sha256:abc' }], sitios: [{ sitio: 'wee-app', version: 'v1', comparados: 140 }] });
check('43) el registro dice qué commit, qué revisión y qué imagen exacta quedaron sirviendo, y qué versión de cada sitio',
  reg.includes(`Commit: ${SHA}`) && reg.includes('función brainChat: revisión brainchat-00013-xyz · imagen repo@sha256:abc') && reg.includes('hosting wee-app: versión v1 · 140 archivos'));
check('44) el workflow compara la web, observa 10 min, registra y etiqueta con ese registro',
  /cli\.mjs hashes --sitio "\$SITIO"/.test(job('desplegar')) && /cli\.mjs observar --funciones "\$FUNCIONES" --inicio "\$INICIO"/.test(job('desplegar'))
  && /cli\.mjs registro /.test(job('desplegar')) && /git tag -a "\$TAG" "\$COMMIT" -F registro\.txt/.test(job('registrar'))
  && /REGISTRO:\s*\$\{\{\s*needs\.desplegar\.outputs\.registro\s*\}\}/.test(job('registrar')));
const pasosDesplegar = job('desplegar').split(/\n      - /).slice(1);
const indice = (re) => pasosDesplegar.findIndex((paso) => re.test(paso));
check('45) el orden: antes → desplegar → humo → hashes → observar → registro; y la marcha atrás, al final y solo si algo falló',
  [/cli\.mjs revisiones/, /firebase-tools@15\.29\.0 deploy/, /cli\.mjs humo/, /cli\.mjs hashes/, /cli\.mjs observar/, /cli\.mjs registro/, /cli\.mjs marcha-atras/]
    .map(indice).every((v, i, a) => v >= 0 && (i === 0 || v > a[i - 1])));
check('46) la marcha atrás pide su PROPIO token nuevo (el de la autenticación inicial dura una hora); observar y registrar, otro',
  /id: auth-marcha-atras[\s\S]*?if: failure\(\)/.test(job('desplegar'))
  && /GCP_TOKEN: \$\{\{ steps\.auth-marcha-atras\.outputs\.access_token \}\}\s*\n\s*run: node ops\/despliegue\/cli\.mjs marcha-atras/.test(job('desplegar'))
  && /GCP_TOKEN: \$\{\{ steps\.auth-observar\.outputs\.access_token \}\}\s*\n(?:\s+[A-Z_]+: .*\n)*\s*run: node ops\/despliegue\/cli\.mjs observar/.test(job('desplegar')));

/* ── E. Documentado ─────────────────────────────────────────────────────── */
const doc = leer('docs/DEPLOYMENT.md');
check('29) docs/DEPLOYMENT.md explica cómo activarlo', /despliegue\.yml/.test(doc) && /ops\/iam\/wif\.mjs/.test(doc));

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
