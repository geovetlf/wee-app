/*
 * COMPROBACIONES PREVIAS AL LANZAMIENTO — Frente H (scripts/prelanzamiento.mjs).
 *
 * ── Qué vigila ─────────────────────────────────────────────────────────────
 *
 *   A · la cerradura de solo lectura: `soloLectura` deja pasar list/describe/print-access-token, GET y las dos
 *       lecturas POST de Firestore, y rechaza cualquier escritura de gcloud, gh o HTTP; cada spawnSync pasa por ella;
 *   B · el modo LOCAL corre de verdad (sin red), imprime los once puntos con PASA/FALLA/SOLO-PRODUCCION y su código
 *       de salida es 1 si y solo si alguno FALLA;
 *   C · el modo PRODUCCIÓN, con lectores FALSOS que devuelven una producción simulada: todas las lecturas pasan la
 *       cerradura, una producción conforme da PASA, y cada desviación (demo que cobra, vídeo encendido, PITR
 *       apagado, reglas distintas, revisión distinta, ruleset con excepción, secreto que falta) da su FALLA.
 *
 * NUNCA toca producción: aquí no hay gcloud, ni gh, ni red.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const leer = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const importar = (p) => import(pathToFileURL(path.join(RAIZ, p)).href);

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const lanza = (fn) => { try { fn(); return false; } catch { return true; } };

const P = await importar('scripts/prelanzamiento.mjs');
const FUENTE = leer('scripts/prelanzamiento.mjs');

/* ═══ A · Solo lectura ═════════════════════════════════════════════════════ */
console.log('\n── A · La cerradura ──');
{
  const permitidas = [
    ['gcloud', ['run', 'services', 'list', '--region=us-central1', '--project=get-wee', '--format=json']],
    ['gcloud', ['firestore', 'databases', 'describe', '--database=(default)', '--project=get-wee']],
    ['gcloud', ['firestore', 'backups', 'schedules', 'list', '--database=(default)']],
    ['gcloud', ['secrets', 'list', '--project=get-wee', '--format=json(name)']],
    ['gcloud', ['monitoring', 'uptime', 'list-configs']],
    ['gcloud', ['auth', 'print-access-token']],
    ['gh', ['api', 'repos/geovetlf/wee-app/rulesets']],
    ['gh', ['api', '--method', 'GET', 'repos/geovetlf/wee-app']],
  ];
  check('deja pasar las lecturas', permitidas.every(([t, a]) => !lanza(() => P.soloLectura(t, a))));
  const prohibidas = [
    ['gcloud', ['run', 'services', 'update-traffic', 'x', '--to-revisions=r=100']],
    ['gcloud', ['run', 'services', 'update', 'x']],
    ['gcloud', ['firestore', 'databases', 'update', '--enable-pitr']],
    ['gcloud', ['secrets', 'versions', 'access', 'latest', '--secret=GEMINI_API_KEY']],
    ['gcloud', ['secrets', 'versions', 'list', 'GEMINI_API_KEY']],
    ['gcloud', ['logging', 'metrics', 'create', 'x']],
    ['gcloud', ['beta', 'monitoring', 'policies', 'delete', 'x']],
    ['gcloud', ['functions', 'deploy', 'x']],
    ['gcloud', ['projects', 'add-iam-policy-binding', 'get-wee']],
    ['gh', ['api', '--method', 'PUT', 'repos/x/rulesets/1']],
    ['gh', ['api', '-X', 'POST', 'repos/x/rulesets']],
    ['gh', ['api', 'repos/x/rulesets', '--input', 'f.json']],
    ['gh', ['api', 'repos/x', '-f', 'a=b']],
    ['gh', ['pr', 'merge', '1']],
  ];
  const pasan = prohibidas.filter(([t, a]) => !lanza(() => P.soloLectura(t, a)));
  check('rechaza toda escritura de gcloud y gh (incluido leer el VALOR de un secreto)', pasan.length === 0, pasan.map(([t, a]) => `${t} ${a.join(' ')}`).join(' | '));
  const F = 'https://firestore.googleapis.com/v1/projects/get-wee/databases/(default)/documents';
  check('HTTP: GET y POST :runQuery/:batchGet sí', !lanza(() => P.soloLectura('http', `${F}/aiSettings/global`)) && !lanza(() => P.soloLectura('http', `${F}:runQuery`, { method: 'POST' })) && !lanza(() => P.soloLectura('http', `${F}:batchGet`, { method: 'POST' })));
  check('HTTP: PATCH, DELETE, :commit y PUT de reglas no',
    lanza(() => P.soloLectura('http', `${F}/aiSettings/global`, { method: 'PATCH' })) && lanza(() => P.soloLectura('http', `${F}/x`, { method: 'DELETE' }))
    && lanza(() => P.soloLectura('http', `${F}:commit`, { method: 'POST' })) && lanza(() => P.soloLectura('http', 'https://firebaserules.googleapis.com/v1/projects/get-wee/releases/cloud.firestore', { method: 'PATCH' })));
  const lineas = FUENTE.split('\n');
  const spawns = lineas.map((l, i) => [l, i]).filter(([l]) => /spawnSync\(/.test(l) && !/^import/.test(l));
  const guardados = spawns.every(([, i]) => lineas.slice(Math.max(0, i - 3), i + 1).some((l) => /soloLectura\(/.test(l)));
  check('cada spawnSync del script va precedido de la cerradura, y solo gcloud o gh', spawns.length === 3 && guardados && spawns.every(([l]) => /spawnSync\('(gcloud|gh)'/.test(l)) && !/execSync|execFile/.test(FUENTE), String(spawns.length));
  check('el fetch también pasa por la cerradura', /soloLectura\('http', url, opciones\);\s*\n\s*if \(!token\)/.test(FUENTE) && (FUENTE.match(/await fetch\(/g) || []).length === 1);
  check('el token no se imprime y los secretos se listan solo por nombre', !/console\.(log|error)\([^)]*token/.test(FUENTE) && /'secrets', 'list', P, '--format=json\(name\)'/.test(FUENTE));
}

/* ═══ B · Modo local de verdad ═════════════════════════════════════════════ */
console.log('\n── B · Modo local ──');
{
  const r = spawnSync(process.execPath, [path.join(RAIZ, 'scripts/prelanzamiento.mjs'), '--json'], { encoding: 'utf8', cwd: RAIZ });
  const salida = r.stdout || '';
  const json = JSON.parse(salida.slice(salida.indexOf('{\n')));
  const estados = Object.values(json.resultados).map((x) => x.estado);
  check('imprime los once puntos, cada uno con PASA, FALLA o SOLO-PRODUCCION', P.PUNTOS.length === 11 && P.PUNTOS.every((p) => json.resultados[p.id] && ['PASA', 'FALLA', 'SOLO-PRODUCCION'].includes(json.resultados[p.id].estado)));
  check('el código de salida es 1 si y solo si alguno FALLA', (r.status === 1) === estados.includes('FALLA') && [0, 1].includes(r.status), `exit ${r.status}`);
  check('en local, lo que no se puede saber sin el proyecto se dice (copias y sondas), no se da por bueno', json.resultados.copias.estado === 'SOLO-PRODUCCION' && json.resultados.sondas.estado === 'SOLO-PRODUCCION');
  check('en local detecta, con los valores por defecto del código, que el demo cobraría y que el vídeo está encendido',
    json.resultados.precios.estado === 'FALLA' && /allowMockFallback=true/.test(json.resultados.precios.detalle)
    && json.resultados.interruptores.estado === 'FALLA' && /vídeo ENCENDIDO/.test(json.resultados.interruptores.detalle));
  check('y que el registro tiene funciones vivas fuera de main (enMain:false)', json.resultados.version.estado === (JSON.parse(leer('ops/produccion.json')).funciones.some((f) => f.enMain === false) ? 'FALLA' : 'PASA'));
  check('las claves se nombran, nunca se leen', json.resultados.claves.estado === 'PASA' && /GEMINI_API_KEY/.test(json.resultados.claves.detalle));
}

/* ═══ C · Modo producción con una producción SIMULADA ══════════════════════ */
console.log('\n── C · Modo producción contra lectores falsos ──');
{
  const registro = JSON.parse(leer('ops/produccion.json'));
  const { metricasDeseadas, politicasDeseadas, COMPROBACIONES, PANEL } = await importar('ops/observabilidad/lanzamiento.mjs');
  const { LECTURAS: LEC_MON } = await importar('ops/observabilidad/verificar.mjs');
  const G = await importar('ops/github/proteccion.mjs');
  const CANAL = 'projects/get-wee/notificationChannels/1';
  const sv = (s) => ({ stringValue: s });

  const base = () => ({
    servicios: registro.funciones.map((f) => ({
      metadata: { name: f.funcion.toLowerCase() },
      status: { traffic: [{ revisionName: f.revision, percent: 100 }] },
      /* La forma REAL de un servicio de Functions: el nombre del secreto es un alias y la anotación `run.googleapis.com/secrets` lo resuelve. */
      spec: { template: { metadata: { annotations: { 'run.googleapis.com/secrets': 'secret-a6a8de8a-8ca0-3495-80a4-386c8b778758:projects/get-wee/secrets/DEEPSEEK_API_KEY' } }, spec: { containers: [{ env: f.funcion === 'brainChat' ? [{ name: 'DEEPSEEK_API_KEY', valueFrom: { secretKeyRef: { name: 'secret-a6a8de8a-8ca0-3495-80a4-386c8b778758', key: 'latest' } } }] : [] }] } } },
    })),
    global: { allowMockFallback: { booleanValue: false }, iaDetenida: { booleanValue: false }, maxUsdPerDay: { integerValue: '20' } },
    routing: ['video.generate', 'video.image_to_video', 'video.reference', 'video.compose'].map((c) => ({ name: `x/documents/aiRouting/${c}`, fields: { chain: { arrayValue: { values: [{ mapValue: { fields: { provider: sv('music-pending') } } }] } } } })),
    reglas: { firestore: leer('firestore.rules'), storage: leer('storage.rules') },
    appcheck: { services: [{ name: 'projects/get-wee/services/firestore.googleapis.com', enforcementMode: 'UNENFORCED' }] },
    db: { pointInTimeRecoveryEnablement: 'POINT_IN_TIME_RECOVERY_ENABLED', deleteProtectionState: 'DELETE_PROTECTION_ENABLED' },
    copias: [{ name: 'diaria' }],
    secretos: ['DEEPSEEK_API_KEY', 'GEMINI_API_KEY'].map((s) => ({ name: `projects/1/secrets/${s}` })),
    monitoring: {
      metricas: metricasDeseadas().map((m) => ({ ...m, name: `projects/get-wee/metrics/${m.name}` })),
      politicas: Object.values(politicasDeseadas()).map((p) => ({ ...p, name: 'projects/get-wee/alertPolicies/1', enabled: true, notificationChannels: [CANAL] })),
      comprobaciones: COMPROBACIONES.map((c) => ({ monitoredResource: { labels: { host: c.host } }, httpCheck: { path: c.ruta, acceptedResponseStatusCodes: [{ statusValue: c.codigo }] } })),
      canales: [{ name: CANAL, type: 'email', enabled: true, verificationStatus: 'VERIFIED' }],
      paneles: [PANEL],
    },
    github: {
      rulesets: [{ id: 1, name: G.RULESET.name }],
      ruleset: JSON.parse(JSON.stringify(G.RULESET)),
      repositorio: { allow_squash_merge: false, allow_rebase_merge: false, allow_merge_commit: true },
      acciones: { enabled: true, allowed_actions: 'selected', sha_pinning_required: true },
      accionesPermitidas: { github_owned_allowed: true, verified_allowed: false, patterns_allowed: G.ACCIONES_PERMITIDAS.patterns_allowed },
      permisos: { default_workflow_permissions: 'read', can_approve_pull_request_reviews: false },
      entorno: { protection_rules: [{ type: 'required_reviewers', reviewers: [{ type: 'User', reviewer: { id: G.ENTORNO_GET_WEE.reviewers[0].id } }] }], deployment_branch_policy: { custom_branch_policies: true } },
      ramasDelEntorno: { branch_policies: [{ type: 'branch', name: 'main' }] },
    },
  });

  const vistas = [];
  const lectores = (d) => ({
    gcloud: (args) => {
      P.soloLectura('gcloud', args); vistas.push(['gcloud', args]);
      const s = args.join(' ');
      if (s.startsWith('run services list')) return d.servicios;
      if (s.startsWith('firestore databases describe')) return d.db;
      if (s.startsWith('firestore backups schedules list')) return d.copias;
      if (s.startsWith('secrets list')) return d.secretos;
      const k = Object.keys(LEC_MON).find((x) => JSON.stringify(LEC_MON[x]) === JSON.stringify(args));
      return k ? d.monitoring[k] : null;
    },
    gh: (args) => {
      P.soloLectura('gh', args); vistas.push(['gh', args]);
      const ruta = args[1];
      if (/rulesets\/1$/.test(ruta)) return d.github.ruleset;
      const k = Object.keys(G.LECTURAS).find((x) => G.LECTURAS[x] === ruta);
      return k ? d.github[k] : null;
    },
    http: async (url, op = {}) => {
      P.soloLectura('http', url, op); vistas.push(['http', [op.method || 'GET', url]]);
      if (url.endsWith(':batchGet')) {
        const docs = JSON.parse(op.body).documents;
        return docs.map((ruta) => (ruta.endsWith('aiSettings/global') && d.global ? { found: { name: ruta, fields: d.global } } : { missing: ruta }));
      }
      if (url.endsWith(':runQuery')) {
        const col = JSON.parse(op.body).structuredQuery.from[0].collectionId;
        if (col === 'aiRouting') return d.routing.map((x) => ({ document: x }));
        return [];
      }
      if (url.endsWith('/releases')) return { releases: [{ name: 'projects/get-wee/releases/cloud.firestore', rulesetName: 'projects/get-wee/rulesets/r1' }, { name: 'projects/get-wee/releases/firebase.storage/get-wee.appspot.com', rulesetName: 'projects/get-wee/rulesets/r2' }] };
      if (url.endsWith('/rulesets/r1')) return { source: { files: [{ content: d.reglas.firestore }] } };
      if (url.endsWith('/rulesets/r2')) return { source: { files: [{ content: d.reglas.storage }] } };
      if (url.includes('firebaseappcheck')) return d.appcheck;
      throw new Error(`lectura inesperada ${url}`);
    },
  });

  const conforme = await P.comprobarProduccion(lectores(base()));
  const noPermitidas = Object.values(conforme).filter((x) => /no permitida/.test(x.detalle));
  check('todas las lecturas del modo producción pasan la cerradura', noPermitidas.length === 0 && vistas.length > 15, noPermitidas.map((x) => x.detalle).join(' | '));
  check('no hay ninguna petición que no sea GET o una lectura de Firestore', vistas.filter(([t]) => t === 'http').every(([, [m, u]]) => m === 'GET' || /:(runQuery|batchGet)$/.test(u)));
  const pasan = P.PUNTOS.filter((p) => p.id !== 'version').filter((p) => conforme[p.id].estado !== 'PASA');
  check('una producción conforme da PASA en los diez puntos que no dependen del registro', pasan.length === 0, pasan.map((p) => `${p.id}: ${conforme[p.id].detalle}`).join(' | '));
  const fuera = registro.funciones.filter((f) => f.enMain === false).map((f) => f.funcion);
  check('versión: con las revisiones del registro, solo señala las funciones cuyo código no está en main', fuera.length ? conforme.version.estado === 'FALLA' && fuera.every((f) => conforme.version.detalle.includes(`${f}: su código no está en main`)) && !/sirve /.test(conforme.version.detalle) : conforme.version.estado === 'PASA', conforme.version.detalle);

  const variante = async (cambiar) => { const d = base(); cambiar(d); return P.comprobarProduccion(lectores(d)); };
  const v1 = await variante((d) => { d.servicios[0].status.traffic = [{ revisionName: 'otra-00009-zzz', percent: 100 }]; });
  check('versión: una revisión distinta de la del registro → FALLA y dice cuál', v1.version.estado === 'FALLA' && v1.version.detalle.includes(`${registro.funciones[0].funcion}: sirve otra-00009-zzz`));
  const v2 = await variante((d) => { d.global = null; d.routing = []; });
  check('sin aiSettings/global ni aiRouting (como hoy): precios FALLA (demo que cobra), vídeo encendido FALLA y sin tope FALLA',
    v2.precios.estado === 'FALLA' && /allowMockFallback=true/.test(v2.precios.detalle) && v2.interruptores.estado === 'FALLA' && /vídeo encendido/.test(v2.interruptores.detalle) && v2.costes.estado === 'FALLA');
  const v3 = await variante((d) => { d.servicios[0].spec.template.spec.containers[0].env = [{ name: 'CREATOR_PRICING_MODE', value: 'real' }]; });
  check('CREATOR_PRICING_MODE=real en una función → precios FALLA', v3.precios.estado === 'FALLA' && /pricingMode=real/.test(v3.precios.detalle));
  const v4 = await variante((d) => { d.reglas.firestore += '\n// cambiado en la consola'; });
  check('reglas cambiadas fuera del repositorio → FALLA con las dos huellas', v4.reglas.estado === 'FALLA' && /firestore\.rules: lo desplegado/.test(v4.reglas.detalle));
  const v5 = await variante((d) => { d.db.pointInTimeRecoveryEnablement = 'POINT_IN_TIME_RECOVERY_DISABLED'; d.copias = []; });
  check('PITR apagado y sin copia programada → FALLA con los dos motivos', v5.copias.estado === 'FALLA' && /PITR/.test(v5.copias.detalle) && /sin copia programada/.test(v5.copias.detalle));
  const v6 = await variante((d) => { d.appcheck.services[0].enforcementMode = 'ENFORCED'; });
  check('App Check exigido antes de tiempo en un servicio → FALLA (dejaría fuera a todo el mundo)', v6.appcheck.estado === 'FALLA');
  const v7 = await variante((d) => { d.monitoring.politicas = d.monitoring.politicas.slice(1); d.monitoring.canales[0].verificationStatus = 'UNVERIFIED'; });
  check('falta una alerta o el canal no está verificado → alertas FALLA', v7.alertas.estado === 'FALLA' && /crear/.test(v7.alertas.detalle) && /canal/.test(v7.alertas.detalle));
  const v8 = await variante((d) => { d.secretos = d.secretos.filter((s) => !s.name.endsWith('DEEPSEEK_API_KEY')); });
  check('un secreto montado que no existe en Secret Manager → claves FALLA (por nombre)', v8.claves.estado === 'FALLA' && /DEEPSEEK_API_KEY/.test(v8.claves.detalle));
  const v9 = await variante((d) => { d.github.ruleset.bypass_actors = [{ actor_type: 'RepositoryRole', actor_id: 5 }]; });
  check('el ruleset de main con una excepción → ruleset FALLA', v9.ruleset.estado === 'FALLA' && /excepciones/.test(v9.ruleset.detalle));
  const v10 = await variante((d) => { d.servicios = null; });
  check('si no puede leer Cloud Run, FALLA (nunca PASA a ciegas)', v10.version.estado === 'FALLA');
  check('el resumen devuelve 1 cuando algo FALLA', P.imprimir(v2, { modo: 'prueba', log: () => {} }) === 1);
}

/* entornoDe y los alias de Secret Manager (forma real de Cloud Run, comprobada en un servicio vivo; solo nombres). */
{
  const con = (secretKeyRef, anot) => ({ spec: { template: { metadata: { annotations: anot }, spec: { containers: [{ env: [{ name: 'X', valueFrom: { secretKeyRef } }] }] } } } });
  const mapa = 'secret-aaaa:projects/get-wee/secrets/GEMINI_API_KEY,secret-bbbb:projects/get-wee/secrets/ARK_API_KEY';
  check('entornoDe resuelve el alias `secret-<uuid>` al nombre de Secret Manager', JSON.stringify(P.entornoDe(con({ name: 'secret-aaaa', key: 'latest' }, { 'run.googleapis.com/secrets': mapa })).secretos) === JSON.stringify(['GEMINI_API_KEY']));
  check('…y un nombre directo (sin alias) se queda como está', JSON.stringify(P.entornoDe(con({ name: 'OPENAI_API_KEY', key: 'latest' }, {})).secretos) === JSON.stringify(['OPENAI_API_KEY']));
  check('…y un alias que la anotación no conoce se queda como viene (para denunciarlo, no para taparlo)', JSON.stringify(P.entornoDe(con({ name: 'secret-zzzz', key: 'latest' }, { 'run.googleapis.com/secrets': mapa })).secretos) === JSON.stringify(['secret-zzzz']));
  check('…y sin metadatos ni anotaciones no se rompe', JSON.stringify(P.entornoDe({ spec: { template: { spec: { containers: [{ env: [] }] } } } }).secretos) === '[]' && JSON.stringify(P.entornoDe(null).secretos) === '[]');
}

const pkg = JSON.parse(leer('functions/package.json'));
check('esta suite está en la cadena de `npm test`', /prelanzamiento\.test\.mjs/.test(pkg.scripts.test));

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
