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
    /* Los metadatos de las versiones (nombre y estado, nunca el valor): lo único que permite no dar una clave por buena solo porque exista su nombre. */
    ['gcloud', ['secrets', 'versions', 'list', 'GEMINI_API_KEY', '--project=get-wee', '--format=json(name,state)']],
    ['gh', ['api', 'repos/geovetlf/wee-app/rulesets']],
    ['gh', ['api', '--method', 'GET', 'repos/geovetlf/wee-app']],
  ];
  check('deja pasar las lecturas', permitidas.every(([t, a]) => !lanza(() => P.soloLectura(t, a))));
  const prohibidas = [
    ['gcloud', ['run', 'services', 'update-traffic', 'x', '--to-revisions=r=100']],
    ['gcloud', ['run', 'services', 'update', 'x']],
    ['gcloud', ['firestore', 'databases', 'update', '--enable-pitr']],
    ['gcloud', ['secrets', 'versions', 'access', 'latest', '--secret=GEMINI_API_KEY']],
    ['gcloud', ['secrets', 'versions', 'destroy', 'GEMINI_API_KEY']],
    ['gcloud', ['secrets', 'versions', 'disable', 'GEMINI_API_KEY']],
    ['gcloud', ['secrets', 'versions', 'access', 'list']],
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
  const ejecuciones = lineas.map((l, i) => [l, i]).filter(([l]) => /ejecutar\('/.test(l));
  const guardadas = ejecuciones.every(([, i]) => lineas.slice(Math.max(0, i - 3), i + 1).some((l) => /soloLectura\(/.test(l)));
  check('cada ejecución de un programa del script va precedida de la cerradura, y solo gcloud o gh (spawnSync es solo el valor por defecto de `ejecutar`)',
    ejecuciones.length === 3 && guardadas && ejecuciones.every(([l]) => /ejecutar\('(gcloud|gh)'/.test(l)) && (FUENTE.match(/spawnSync\(/g) || []).length === 0 && /ejecutar = spawnSync/.test(FUENTE) && !/execSync|execFile/.test(FUENTE), String(ejecuciones.length));
  check('el fetch también pasa por la cerradura', /soloLectura\('http', url, opciones\);\s*\n\s*if \(!token\)/.test(FUENTE) && (FUENTE.match(/await pedir\(/g) || []).length === 1 && (FUENTE.match(/fetch\(/g) || []).length === 1);
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
      if (s.startsWith('secrets versions list')) return (d.versiones && d.versiones[args[3]]) || [{ name: `projects/1/secrets/${args[3]}/versions/1`, state: 'ENABLED' }];
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

  /* ── Cuando una lectura no se puede hacer: ni PASA ni FALLA ─────────────────────────────────────────────── */
  const E = P.ErrorDeLectura;
  /** Lectores como los de arriba, pero con lecturas que fallan: `fallo(tipo, ref)` devuelve un ErrorDeLectura o null. */
  const conFallos = (d, fallo) => {
    const L = lectores(d);
    return {
      gcloud: (args) => { const e = fallo('gcloud', args); if (e) throw e; return L.gcloud(args); },
      gh: (args) => { const e = fallo('gh', args); if (e) throw e; return L.gh(args); },
      http: async (url, op) => { const e = fallo('http', url); if (e) throw e; return L.http(url, op); },
    };
  };
  const permiso403 = (tipo, ref, texto) => new E('PERMISOS', texto, { estado: 403, permiso: P.permisoDeLectura(tipo, ref) });

  const bReglas = await P.comprobarProduccion(conFallos(base(), (t, u) => (t === 'http' && /firebaserules/.test(u) ? permiso403('http', u, 'firebaserules.googleapis.com respondió 403') : null)));
  check('reglas sin permiso (403) → NO-VERIFICABLE con el permiso que falta; ni PASA ni FALLA', bReglas.reglas.estado === 'NO-VERIFICABLE' && /permisos/.test(bReglas.reglas.detalle)
    && /firebaserules\.releases\.get/.test(bReglas.reglas.detalle) && /no dice nada sobre WEE/.test(bReglas.reglas.detalle), bReglas.reglas.detalle);
  check('…y no contagia al resto: los demás puntos siguen igual que en una producción conforme', P.PUNTOS.filter((p) => !['version', 'reglas'].includes(p.id)).every((p) => bReglas[p.id].estado === conforme[p.id].estado));

  const bAppCheck = await P.comprobarProduccion(conFallos(base(), (t, u) => (t === 'http' && /firebaseappcheck/.test(u) ? new E('AUTENTICACION', 'firebaseappcheck.googleapis.com respondió 401', { estado: 401 }) : null)));
  check('una sesión que no vale (401) → NO-VERIFICABLE «autenticación», y dice cómo arreglarlo', bAppCheck.appcheck.estado === 'NO-VERIFICABLE' && /autenticación/.test(bAppCheck.appcheck.detalle) && /gcloud auth login/.test(bAppCheck.appcheck.detalle));

  const bServicio = await P.comprobarProduccion(conFallos(base(), (t, u) => (t === 'http' && /firebaseappcheck/.test(u) ? new E('SERVICIO', 'firebaseappcheck.googleapis.com respondió 503', { estado: 503 }) : null)));
  check('un servicio que no responde (503) → NO-VERIFICABLE «servicio», y aclara que no es un hallazgo', bServicio.appcheck.estado === 'NO-VERIFICABLE' && /servicio/.test(bServicio.appcheck.detalle) && /no es un hallazgo/.test(bServicio.appcheck.detalle));

  const bNoExiste = await P.comprobarProduccion(conFallos(base(), (t, u) => (t === 'http' && /firebaseappcheck/.test(u) ? new E('NO_EXISTE', 'firebaseappcheck.googleapis.com respondió 404', { estado: 404 }) : null)));
  check('un recurso que NO EXISTE (404) sí es un hallazgo: FALLA «no existe»', bNoExiste.appcheck.estado === 'FALLA' && /no existe/.test(bNoExiste.appcheck.detalle));

  const bDesconocido = await P.comprobarProduccion(conFallos(base(), (t, u) => (t === 'http' && /firebaseappcheck/.test(u) ? new Error('algo raro del propio script') : null)));
  check('un error que NO es una lectura fallida (un fallo del propio script) FALLA: nunca se disfraza de «no verificable»', bDesconocido.appcheck.estado === 'FALLA' && /no se pudo leer/.test(bDesconocido.appcheck.detalle));

  const bSondas = await P.comprobarProduccion(conFallos(base(), (t, u) => (t === 'http' && /firestore\.googleapis\.com/.test(u) ? new E('AUTENTICACION', 'firestore.googleapis.com respondió 401', { estado: 401 }) : null)));
  check('sin acceso a Firestore las sondas son NO-VERIFICABLE y dicen cuántas no pudieron leer (no «FALLA»)', bSondas.sondas.estado === 'NO-VERIFICABLE' && /autenticación/.test(bSondas.sondas.detalle) && /sondas no pudieron leer/.test(bSondas.sondas.detalle), bSondas.sondas.detalle);

  const bServicios = await P.comprobarProduccion(conFallos(base(), (t, a) => (t === 'gcloud' && a.join(' ').startsWith('run services list') ? permiso403('gcloud', a, 'gcloud run services list falló: PERMISSION_DENIED') : null)));
  check('sin poder listar Cloud Run, la versión y las claves son NO-VERIFICABLE (con el permiso run.services.list), no FALLA', bServicios.version.estado === 'NO-VERIFICABLE' && bServicios.claves.estado === 'NO-VERIFICABLE' && /run\.services\.list/.test(bServicios.version.detalle));

  /* ── Una clave no es válida porque exista su nombre ──────────────────────────────────────────────────────── */
  const versiones = (n, estado, hechas = []) => [...hechas, { name: `projects/1/secrets/DEEPSEEK_API_KEY/versions/${n}`, state: estado }];
  const bDesactivada = await P.comprobarProduccion(lectores({ ...base(), versiones: { DEEPSEEK_API_KEY: versiones(3, 'DISABLED') } }));
  check('una clave con su última versión DESHABILITADA → claves FALLA, aunque el nombre exista', bDesactivada.claves.estado === 'FALLA' && /DEEPSEEK_API_KEY: la versión más reciente \(v3\) está DISABLED/.test(bDesactivada.claves.detalle), bDesactivada.claves.detalle);
  const bSinVersion = await P.comprobarProduccion(lectores({ ...base(), versiones: { DEEPSEEK_API_KEY: [] } }));
  check('un secreto que existe pero no tiene ninguna versión → claves FALLA «sin ninguna versión»', bSinVersion.claves.estado === 'FALLA' && /sin ninguna versión/.test(bSinVersion.claves.detalle));
  const bDestruida = await P.comprobarProduccion(lectores({ ...base(), versiones: { DEEPSEEK_API_KEY: versiones(2, 'DESTROYED', versiones(1, 'ENABLED')) } }));
  check('si la más reciente está destruida y una antigua sigue habilitada, FALLA: la que se monta es la última', bDestruida.claves.estado === 'FALLA' && /\(v2\) está DESTROYED/.test(bDestruida.claves.detalle));
  const bNumeros = await P.comprobarProduccion(lectores({ ...base(), versiones: { DEEPSEEK_API_KEY: versiones(9, 'DISABLED', versiones(10, 'ENABLED')) } }));
  check('«más reciente» se decide por el NÚMERO de versión, no por el texto (v10 > v9)', bNumeros.claves.estado === 'PASA' && /DEEPSEEK_API_KEY v10/.test(bNumeros.claves.detalle), bNumeros.claves.detalle);
  check('una clave conforme da PASA y dice que NO se ha comprobado que FUNCIONE (eso exige llamar al proveedor)', conforme.claves.estado === 'PASA' && /HABILITADA/.test(conforme.claves.detalle) && /NO se ha comprobado que cada clave FUNCIONE/.test(conforme.claves.detalle) && /DEEPSEEK_API_KEY v1/.test(conforme.claves.detalle));
  const bListaDenegada = await P.comprobarProduccion(conFallos(base(), (t, a) => (t === 'gcloud' && a.join(' ').startsWith('secrets list') ? permiso403('gcloud', a, 'gcloud secrets list falló: PERMISSION_DENIED') : null)));
  check('sin permiso para listar los secretos → NO-VERIFICABLE con secretmanager.secrets.list', bListaDenegada.claves.estado === 'NO-VERIFICABLE' && /secretmanager\.secrets\.list/.test(bListaDenegada.claves.detalle));
  const bVersionesDenegadas = await P.comprobarProduccion(conFallos(base(), (t, a) => (t === 'gcloud' && a.join(' ').startsWith('secrets versions list') ? permiso403('gcloud', a, 'gcloud secrets versions list falló: PERMISSION_DENIED') : null)));
  check('sin permiso para ver las versiones → NO-VERIFICABLE con secretmanager.versions.list (no se da la clave por buena)', bVersionesDenegadas.claves.estado === 'NO-VERIFICABLE' && /secretmanager\.versions\.list/.test(bVersionesDenegadas.claves.detalle));
  check('el valor de una clave NUNCA se pide: ninguna lectura de gcloud del modo producción es `versions access`', !vistas.some(([t, a]) => t === 'gcloud' && a.includes('access')));

  /* ── Las copias: el hallazgo no se esconde detrás de un permiso que falta ───────────────────────────────── */
  const sinPitr = { ...base(), db: { pointInTimeRecoveryEnablement: 'POINT_IN_TIME_RECOVERY_DISABLED', deleteProtectionState: 'DELETE_PROTECTION_ENABLED' } };
  const progDenegada = (t, a) => (t === 'gcloud' && a.join(' ').startsWith('firestore backups schedules list') ? permiso403('gcloud', a, 'gcloud firestore backups schedules list falló: PERMISSION_DENIED') : null);
  const bCopias = await P.comprobarProduccion(conFallos(sinPitr, progDenegada));
  check('PITR apagado + sin permiso para ver la copia programada → FALLA por el PITR y lo que no se pudo leer se dice', bCopias.copias.estado === 'FALLA' && /PITR: POINT_IN_TIME_RECOVERY_DISABLED/.test(bCopias.copias.detalle) && /copia programada: no se pudo leer/.test(bCopias.copias.detalle), bCopias.copias.detalle);
  const bCopiasOk = await P.comprobarProduccion(conFallos(base(), progDenegada));
  check('todo lo visible conforme pero la copia programada no se pudo ver → NO-VERIFICABLE (no se da por buena)', bCopiasOk.copias.estado === 'NO-VERIFICABLE' && /datastore\.backupSchedules\.list/.test(bCopiasOk.copias.detalle));

  /* ── El resumen y el código de salida ───────────────────────────────────────────────────────────────────── */
  const todoPasa = Object.fromEntries(P.PUNTOS.map((p) => [p.id, { estado: 'PASA', detalle: 'ok' }]));
  const lineasDe = (res) => { const out = []; const codigo = P.imprimir(res, { modo: 'prueba', log: (x) => out.push(x) }); return { codigo, texto: out.join('\n') }; };
  check('todo visto y conforme sale 0', lineasDe(todoPasa).codigo === 0);
  const conBloqueado = { ...todoPasa, reglas: { estado: 'NO-VERIFICABLE', detalle: 'permisos: …' } };
  const sBloq = lineasDe(conBloqueado);
  check('sin hallazgos pero con algo NO-VERIFICABLE sale 3: una producción que no se ha visto entera no está «bien»', sBloq.codigo === 3 && /1 NO VERIFICABLE/.test(sBloq.texto) && /ninguno FALLA/.test(sBloq.texto), sBloq.texto.split('\n').pop());
  const sFalla = lineasDe({ ...conBloqueado, precios: { estado: 'FALLA', detalle: 'x' } });
  check('un FALLA manda sobre lo no verificable: sale 1', sFalla.codigo === 1 && /1 FALLA/.test(sFalla.texto) && /1 NO VERIFICABLE/.test(sFalla.texto));
  check('el estado NO-VERIFICABLE cabe en la columna del informe', 'NO-VERIFICABLE'.length < 15 && /NO-VERIFICABLE/.test(sBloq.texto));
}

/* ═══ D · Los lectores reales, sin gcloud ni red: la sesión que manda, la clase de cada fallo y el permiso que falta ═══════════════════ */
console.log('\n── D · lectoresReales con ejecutar y pedir inyectados ──');
{
  const SESION = 'TOKEN-DE-PRUEBA-NO-REAL';
  const ok = (stdout = '[]') => ({ status: 0, stdout, stderr: '' });
  const falla = (stderr, status = 1) => ({ status, stdout: '', stderr });
  const ejecutarCon = (respuesta) => { const llamadas = []; const f = (cmd, args) => { llamadas.push([cmd, args]); return args[0] === 'auth' ? ok(`${SESION}\n`) : respuesta(cmd, args); }; f.llamadas = llamadas; return f; };
  const res = (status, cuerpo = {}) => ({ ok: status >= 200 && status < 300, status, json: async () => cuerpo });
  const FS = 'https://firestore.googleapis.com/v1/projects/get-wee/databases/(default)/documents';
  const intenta = async (f) => { try { await f(); return null; } catch (e) { return e; } };

  /* La sesión REAL manda: así fallaban las sondas (todas con 401) — `lectorRest` pasa `Authorization: Bearer no-se-usa` y pisaba el token. */
  let enviadas;
  const L1 = P.lectoresReales({ ejecutar: ejecutarCon(() => ok()), pedir: async (url, op) => { enviadas = op.headers; return res(200, { ok: 1 }); } });
  await L1.http(`${FS}:runQuery`, { method: 'POST', headers: { Authorization: 'Bearer no-se-usa', 'X-Otra': 'x' }, body: '{}' });
  check('la sesión real manda: un Authorization de relleno de quien llama NO la pisa (el defecto que daba 401 a todas las sondas)', enviadas.Authorization === `Bearer ${SESION}` && enviadas['X-Otra'] === 'x' && enviadas['Content-Type'] === 'application/json', JSON.stringify(Object.keys(enviadas)));

  /* Firestore se lee con POST (:runQuery/:batchGet); las demás APIs, con GET: la cerradura rechaza cualquier otra cosa antes de llegar a la petición. */
  const fallo = async (status, url = `${FS}:runQuery`) => intenta(() => P.lectoresReales({ ejecutar: ejecutarCon(() => ok()), pedir: async () => res(status) }).http(url, /:(runQuery|batchGet)$/.test(url) ? { method: 'POST', body: '{}' } : {}));
  const e401 = await fallo(401);
  const e403 = await fallo(403, 'https://firebaserules.googleapis.com/v1/projects/get-wee/releases');
  const e404 = await fallo(404);
  const e503 = await fallo(503);
  const e400 = await fallo(400);
  check('HTTP 401 → AUTENTICACION', e401 instanceof P.ErrorDeLectura && e401.clase === 'AUTENTICACION' && e401.estado === 401);
  check('HTTP 403 → PERMISOS, con el permiso exacto de ESA API (firebaserules.releases.get y firebaserules.rulesets.get)', e403.clase === 'PERMISOS' && /firebaserules\.releases\.get/.test(e403.permiso) && /firebaserules\.rulesets\.get/.test(e403.permiso), String(e403.permiso));
  check('HTTP 404 → NO_EXISTE, 503 → SERVICIO, 400 → OTRO', e404.clase === 'NO_EXISTE' && e503.clase === 'SERVICIO' && e400.clase === 'OTRO');
  check('el permiso de Firestore depende de la operación: runQuery → datastore.entities.list; batchGet → datastore.entities.get',
    P.permisoDeLectura('http', `${FS}:runQuery`) === 'datastore.entities.list' && P.permisoDeLectura('http', `${FS}:batchGet`) === 'datastore.entities.get' && P.permisoDeLectura('http', 'https://firebaseappcheck.googleapis.com/v1/projects/get-wee/services') === 'firebaseappcheck.services.get');
  const caida = await intenta(() => P.lectoresReales({ ejecutar: ejecutarCon(() => ok()), pedir: async () => { const x = new Error('socket hang up'); x.code = 'ECONNRESET'; throw x; } }).http(`${FS}:runQuery`, { method: 'POST', body: '{}' }));
  check('una petición que ni siquiera responde → SERVICIO (no «no existe» ni «falla»)', caida.clase === 'SERVICIO' && /ECONNRESET/.test(caida.message));
  check('el token de la sesión NO aparece en ningún mensaje de error ni en el error serializado', [e401, e403, e404, e503, caida].every((e) => !e.message.includes(SESION) && !JSON.stringify(e).includes(SESION)));

  const sinSesion = await intenta(() => P.lectoresReales({ ejecutar: (cmd, args) => (args[0] === 'auth' ? falla('You do not currently have an active account selected.') : ok()), pedir: async () => res(200) }).http(`${FS}:runQuery`, { method: 'POST', body: '{}' }));
  check('sin sesión de gcloud → AUTENTICACION y dice cómo arreglarlo', sinSesion.clase === 'AUTENTICACION' && /gcloud auth login/.test(sinSesion.message));
  const sinGcloud = await intenta(() => P.lectoresReales({ ejecutar: () => ({ error: Object.assign(new Error('spawn gcloud ENOENT'), { code: 'ENOENT' }), status: null, stdout: '', stderr: '' }), pedir: async () => res(200) }).http(`${FS}:runQuery`, { method: 'POST', body: '{}' }));
  check('sin gcloud instalado → SESION', sinGcloud.clase === 'SESION' && /ENOENT/.test(sinGcloud.message));

  /* gcloud y gh: la clase sale de lo que escriben por stderr, y el permiso, de la orden. */
  const gc = (stderr, args = ['secrets', 'list', '--project=get-wee', '--format=json(name)']) => intenta(() => P.lectoresReales({ ejecutar: ejecutarCon(() => falla(stderr)), pedir: async () => res(200) }).gcloud(args));
  const gPermiso = await gc("ERROR: (gcloud.secrets.list) PERMISSION_DENIED: Permission 'secretmanager.secrets.list' denied on resource '//secretmanager.googleapis.com/projects/get-wee'.");
  check('gcloud con PERMISSION_DENIED → PERMISOS con secretmanager.secrets.list', gPermiso.clase === 'PERMISOS' && gPermiso.permiso === 'secretmanager.secrets.list', `${gPermiso.clase} ${gPermiso.permiso}`);
  const gSesion = await gc('ERROR: (gcloud.secrets.list) There was a problem refreshing your current auth tokens: Reauthentication required.');
  check('gcloud con «Reauthentication required» → AUTENTICACION', gSesion.clase === 'AUTENTICACION');
  const gNada = await gc('ERROR: (gcloud.firestore.databases.describe) NOT_FOUND: Database (default) was not found', ['firestore', 'databases', 'describe', '--database=(default)']);
  check('gcloud con NOT_FOUND → NO_EXISTE', gNada.clase === 'NO_EXISTE');
  const gRed = await gc('ERROR: UNAVAILABLE: the service is currently unavailable');
  check('gcloud con UNAVAILABLE → SERVICIO', gRed.clase === 'SERVICIO');
  const gRaro = await gc('ERROR: algo que nadie ha visto nunca');
  check('un fallo que no se reconoce → OTRO, con el texto recortado (nunca silencio)', gRaro.clase === 'OTRO' && /algo que nadie ha visto/.test(gRaro.message));
  const gLargo = await gc(`ERROR: ${'x'.repeat(5000)}`);
  check('el mensaje de gcloud se recorta (≤ ~260 caracteres): un stderr enorme no llena el informe', gLargo.message.length < 260, String(gLargo.message.length));
  const gMalJson = await intenta(() => P.lectoresReales({ ejecutar: ejecutarCon(() => ok('esto no es json')), pedir: async () => res(200) }).gcloud(['secrets', 'list', '--project=get-wee']));
  check('gcloud que sale bien pero no devuelve JSON → OTRO (no null a ciegas)', gMalJson.clase === 'OTRO');
  const ghErr = await intenta(() => P.lectoresReales({ ejecutar: ejecutarCon(() => falla('gh: Must have admin rights to Repository. (HTTP 403)')), pedir: async () => res(200) }).gh(['api', 'repos/geovetlf/wee-app/rulesets']));
  check('gh con HTTP 403 → PERMISOS y dice qué permiso hace falta', ghErr.clase === 'PERMISOS' && /Administration: read/.test(ghErr.permiso));
  const v = P.lectoresReales({ ejecutar: ejecutarCon(() => ok('[{"name":"projects/1/secrets/X/versions/2","state":"ENABLED"}]')), pedir: async () => res(200) }).gcloud(['secrets', 'versions', 'list', 'X', '--format=json(name,state)']);
  check('y una lectura buena devuelve el JSON (la cerradura deja pasar `versions list`)', Array.isArray(v) && v[0].state === 'ENABLED');

  /* La cerradura sigue delante de todo: una escritura ni siquiera llega a ejecutarse. */
  const espia = ejecutarCon(() => ok());
  const L2 = P.lectoresReales({ ejecutar: espia, pedir: async () => res(200) });
  const intentos = [() => L2.gcloud(['run', 'services', 'update', 'x']), () => L2.gcloud(['secrets', 'versions', 'access', 'latest', '--secret=X']), () => L2.gh(['api', '--method', 'PUT', 'repos/x/rulesets/1'])];
  const lanzaron = intentos.filter((f) => lanza(f)).length;
  const http = await intenta(() => L2.http(`${FS}/x`, { method: 'DELETE' }));
  check('una escritura se rechaza ANTES de ejecutar nada (ni un solo proceso lanzado, ni una petición)', lanzaron === 3 && !!http && espia.llamadas.length === 0, String(espia.llamadas.length));

  /* resultadoDeFallo, directamente. */
  const R = P.resultadoDeFallo;
  check('resultadoDeFallo: PERMISOS/AUTENTICACION/SESION/SERVICIO/OTRO son NO-VERIFICABLE; NO_EXISTE y un error ajeno son FALLA',
    ['PERMISOS', 'AUTENTICACION', 'SESION', 'SERVICIO', 'OTRO'].every((c) => R(new P.ErrorDeLectura(c, 'x')).estado === 'NO-VERIFICABLE') && R(new P.ErrorDeLectura('NO_EXISTE', 'x')).estado === 'FALLA' && R(new TypeError('boom')).estado === 'FALLA');
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
