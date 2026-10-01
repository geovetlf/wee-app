/*
 * EL ÚNICO CAMINO A PRODUCCIÓN — `.github/workflows/despliegue.yml`, `ops/despliegue/` y `ops/iam/wif.mjs`.
 *
 * ── Qué vigila ─────────────────────────────────────────────────────────────
 *
 * El workflow de despliegue (FASE 6) promete: solo un commit de main con la
 * CI en verde, que no pisa producción, aprobado por el dueño (entorno
 * `get-wee`), con una identidad sin claves de permisos mínimos, humo sin gasto
 * y marcha atrás automática, y un tag inmutable de lo desplegado.
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
  return { ok: true, status: 200, text: async () => JSON.stringify({ uri: 'https://brainchat-x.a.run.app', latestReadyRevision: 'projects/p/locations/l/services/brainchat/revisions/brainchat-00012-abc', latestCreatedRevision: 'projects/p/locations/l/services/brainchat/revisions/brainchat-00012-abc', terminalCondition: { state: 'CONDITION_SUCCEEDED' } }) };
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

/* ── E. Documentado ─────────────────────────────────────────────────────── */
const doc = leer('docs/DEPLOYMENT.md');
check('29) docs/DEPLOYMENT.md explica cómo activarlo', /despliegue\.yml/.test(doc) && /ops\/iam\/wif\.mjs/.test(doc));

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
