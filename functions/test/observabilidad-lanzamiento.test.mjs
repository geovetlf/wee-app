/*
 * LAS ALERTAS DEL LANZAMIENTO, COMO CÓDIGO — Frente H (ops/observabilidad/lanzamiento.mjs, aplicar.mjs, sondas.mjs).
 *
 * ── Qué vigila ─────────────────────────────────────────────────────────────
 *
 *   A · forma: cada métrica y política nueva es válida para su API, se apoya en mensajes que el código escribe de
 *       verdad, extrae la etiqueta que dice, dice qué hacer y no inunda el correo;
 *   B · versionado: ops/observabilidad/politicas/ es exactamente lo que generan los módulos (sin deriva);
 *   C · aplicar.mjs NO APLICA NADA por defecto: con un ejecutor falso se comprueba que sin `--aplicar` solo corre
 *       `list`, y que `--aplicar` exige el proyecto escrito otra vez y un canal válido; el diff detecta lo que falta,
 *       lo cambiado y lo igual; una política que se actualiza conserva sus canales;
 *   D · sondas: cada evaluador da PASA y FALLA donde debe con datos de ejemplo, el coste suma como el motor
 *       (`usdToday`), y el lector de producción solo hace las dos peticiones de lectura de Firestore.
 *
 * Sin red, sin gcloud, sin Google Cloud. Usa el compilado para comparar con el motor: `npm run build` antes.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const leer = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const importar = (p) => import(pathToFileURL(path.join(RAIZ, p)).href);

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const L = await importar('ops/observabilidad/lanzamiento.mjs');
const A = await importar('ops/observabilidad/aplicar.mjs');
const S = await importar('ops/observabilidad/sondas.mjs');
const H0 = await importar('ops/observabilidad/alertas.mjs');

/* ═══ A · Forma ════════════════════════════════════════════════════════════ */
console.log('\n── A · Forma de métricas y políticas ──');
{
  const perdidos = Object.entries(L.MENSAJES_LANZAMIENTO).flatMap(([m, archivos]) => archivos.filter((a) => !leer(a).includes(m)).map((a) => `«${m}» en ${a}`));
  check('cada mensaje en el que se apoyan las métricas nuevas sigue en el archivo que lo escribe', perdidos.length === 0, perdidos.join(' · '));
  const buscados = [...new Set(L.METRICAS_LANZAMIENTO.flatMap((m) => [...m.filter.matchAll(/textPayload:"([^"]+)"/g)].map((x) => x[1])))];
  check('los filtros solo buscan textos de la lista vigilada', buscados.length >= 4 && buscados.every((t) => t in L.MENSAJES_LANZAMIENTO), buscados.join(' | '));

  /* La etiqueta se extrae de una línea REAL: la que escribe el router, compuesta igual que en el código. */
  const ejemplos = {
    wee_proveedor_en_pausa: 'WEË AI ENGINE: seedance en pausa 60 s por fallos repetidos',
    wee_proveedor_fallos: 'WEË AI ENGINE: music-pending/x-1 falló en text.generate (intento 1): boom',
  };
  const extraen = L.METRICAS_LANZAMIENTO.every((m) => {
    const re = /REGEXP_EXTRACT\(textPayload, "(.+)"\)$/.exec(m.labelExtractors.provider);
    if (!re) return false;
    const x = new RegExp(re[1].replace(/\\\\/g, '\\')).exec(ejemplos[m.name]);
    return x && x.length === 2 && /^[a-z0-9-]+$/.test(x[1]);
  });
  check('cada métrica extrae el proveedor de la línea real con un solo grupo (REGEXP_EXTRACT exige uno)', extraen);
  const gw = 'WEË AI GATEWAY: deepseek/deepseek-chat falló en text.generate (brain_1): x';
  check('…también de la línea del Gateway del Core', /AI (?:ENGINE|GATEWAY): ([a-z0-9-]+)\//.exec(gw)[1] === 'deepseek');
  check('las métricas nuevas son contadores DELTA/INT64 con la etiqueta declarada',
    L.METRICAS_LANZAMIENTO.every((m) => m.metricDescriptor.metricKind === 'DELTA' && m.metricDescriptor.valueType === 'INT64'
      && m.metricDescriptor.labels.map((x) => x.key).join() === Object.keys(m.labelExtractors).join()));
  check('los nombres no chocan con las métricas de H0', L.METRICAS_LANZAMIENTO.every((m) => !H0.METRICAS.some((h) => h.nombre === m.name)));

  const pol = L.POLITICAS_LANZAMIENTO;
  const usadas = Object.values(pol).flatMap((p) => p.conditions.map((c) => (c.conditionThreshold.filter.match(/logging\.googleapis\.com\/user\/(\w+)/) || [])[1])).filter(Boolean);
  check('las políticas usan solo métricas que se crean aquí, o la de Logging que ya existe (log_entry_count)',
    usadas.every((u) => L.metricasDeseadas().some((m) => m.name === u))
    && /logging\.googleapis\.com\/log_entry_count/.test(pol['errores-por-funcion'].conditions[0].conditionThreshold.filter));
  check('errores por función: agrupa por servicio (una alerta dice QUÉ función)', pol['errores-por-funcion'].conditions[0].conditionThreshold.aggregations[0].groupByFields.includes('resource.label.service_name'));
  check('proveedor caído: circuito abierto o fallos repetidos, por proveedor', pol['proveedor-caido'].conditions.length === 2
    && pol['proveedor-caido'].conditions.every((c) => c.conditionThreshold.aggregations[0].groupByFields.includes('metric.label.provider')));
  check('cada política dice qué hacer y tiene límite de avisos', Object.values(pol).every((p) => p.documentation.content.length > 120 && p.alertStrategy.notificationRateLimit));
  check('no pisan ningún nombre de H0', Object.values(pol).every((p) => !Object.values(H0.POLITICAS).some((h) => h.displayName === p.displayName)));
  check('el conjunto que se aplica = H0 (7) + lanzamiento (2), y 4 + 2 métricas', Object.keys(L.politicasDeseadas()).length === 9 && L.metricasDeseadas().length === 6);
}

/* ═══ B · Versionado ═══════════════════════════════════════════════════════ */
console.log('\n── B · ops/observabilidad/politicas/ = lo que generan los módulos ──');
{
  const dir = path.join(RAIZ, L.CARPETA_VERSIONADA);
  const esperados = L.archivosVersionados();
  const presentes = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')) : [];
  const distintos = Object.entries(esperados).filter(([f, c]) => !presentes.includes(f) || fs.readFileSync(path.join(dir, f), 'utf8').replace(/\r\n/g, '\n') !== c).map(([f]) => f);
  const sobran = presentes.filter((f) => !(f in esperados));
  check('cada archivo versionado coincide byte a byte (regenerar: node ops/observabilidad/lanzamiento.mjs --escribir)', distintos.length === 0 && sobran.length === 0, [...distintos, ...sobran.map((f) => `sobra ${f}`)].join(', '));
  check('son JSON válidos con nombres ASCII', presentes.every((f) => /^[a-z0-9_-]+\.json$/.test(f) && JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))));
  check('ningún archivo lleva un correo ni un canal real', presentes.every((f) => !/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}|notificationChannels\/[0-9]/.test(fs.readFileSync(path.join(dir, f), 'utf8'))));
}

/* ═══ C · aplicar.mjs no aplica nada por defecto ═══════════════════════════ */
console.log('\n── C · aplicar.mjs: simula por defecto ──');
{
  const llamadas = [];
  const vivoParcial = {
    metricas: [{ name: 'projects/get-wee/metrics/wee_ia_no_disponible', filter: H0.METRICAS[0].filtro }, { name: 'projects/get-wee/metrics/wee_barrido_incompleto', filter: 'otro filtro' }],
    politicas: [{ name: 'projects/get-wee/alertPolicies/9', displayName: H0.POLITICAS['wee-caido'].displayName, ...H0.POLITICAS['wee-caido'], notificationChannels: ['projects/get-wee/notificationChannels/77'] },
      { name: 'projects/get-wee/alertPolicies/8', ...H0.POLITICAS['tope-diario'], conditions: [{ ...H0.POLITICAS['tope-diario'].conditions[0], conditionThreshold: { ...H0.POLITICAS['tope-diario'].conditions[0].conditionThreshold, thresholdValue: 3 } }], notificationChannels: ['projects/get-wee/notificationChannels/77'] }],
    comprobaciones: [],
    paneles: [],
    canales: [],
  };
  const { LECTURAS } = await importar('ops/observabilidad/verificar.mjs');
  const falso = (args) => {
    llamadas.push(args);
    const clave = Object.keys(LECTURAS).find((x) => JSON.stringify(LECTURAS[x]) === JSON.stringify(args));
    return clave ? { status: 0, stdout: JSON.stringify(vivoParcial[clave] || []) } : { status: 0, stdout: '' };
  };
  const log = [];
  const codigo = A.principal([], { ejecutar: falso, log: (x) => log.push(x) });
  const escritura = /\b(create|update|delete)\b/;
  check('sin --aplicar: código 0 y SOLO órdenes `list` (las de verificar.mjs)', codigo === 0 && llamadas.length > 0
    && llamadas.every((a) => A.ORDENES_DE_LECTURA.some((l) => JSON.stringify(l) === JSON.stringify(a))) && !llamadas.some((a) => escritura.test(a.join(' '))), String(codigo));
  const salida = log.join('\n');
  check('…y enseña el diff: crear lo que falta, actualizar lo cambiado, igual lo igual',
    /crear\s+metrica\s+wee_proveedor_en_pausa/.test(salida) && /actualizar\s+metrica\s+wee_barrido_incompleto\s+\(filter\)/.test(salida)
    && /igual\s+metrica\s+wee_ia_no_disponible/.test(salida) && /igual\s+politica\s+wee-caido/.test(salida)
    && /actualizar\s+politica\s+tope-diario\s+\(conditions\)/.test(salida), salida.split('\n').slice(0, 6).join(' / '));
  check('…y las órdenes que ejecutaría, como texto', /# Lo que haría --aplicar \(no se ejecuta\)/.test(salida) && /gcloud beta monitoring policies create/.test(salida));

  const plan = A.planificar(vivoParcial);
  const { ordenes, archivos } = A.ordenesDelPlan(plan.filter((a) => a.accion === 'crear' || a.accion === 'actualizar'), { canal: 'projects/get-wee/notificationChannels/5' });
  const act = archivos['politica-tope-diario.json'];
  check('una política que se actualiza conserva su canal y añade el nuevo (un update con archivo la reemplaza entera)',
    act && act.name === 'projects/get-wee/alertPolicies/8' && act.notificationChannels.includes('projects/get-wee/notificationChannels/77') && act.notificationChannels.includes('projects/get-wee/notificationChannels/5'));
  check('nunca borra: ninguna orden del plan es delete', ordenes.every((o) => !o.includes('delete')));
  check('las nuevas se crean con el canal indicado', archivos['politica-proveedor-caido.json'].notificationChannels[0] === 'projects/get-wee/notificationChannels/5');

  const pedidas = [];
  const cuenta = (args) => { pedidas.push(args); return { status: 0, stdout: '[]' }; };
  const c1 = A.principal(['--aplicar', '--sin-leer', '--canal', 'projects/get-wee/notificationChannels/5'], { ejecutar: cuenta, log: () => {} });
  const c2 = A.principal(['--aplicar', '--sin-leer', '--confirmo-proyecto', 'get-wee'], { ejecutar: cuenta, log: () => {} });
  const c3 = A.principal(['--aplicar', '--sin-leer', '--confirmo-proyecto', 'otro', '--canal', 'projects/get-wee/notificationChannels/5'], { ejecutar: cuenta, log: () => {} });
  const c4 = A.principal(['--aplicar', '--sin-leer', '--confirmo-proyecto', 'get-wee', '--canal', 'projects/otro/notificationChannels/5'], { ejecutar: cuenta, log: () => {} });
  check('--aplicar sin proyecto confirmado, sin canal, con otro proyecto o con un canal ajeno: código 2 y NINGUNA orden', [c1, c2, c3, c4].every((c) => c === 2) && pedidas.length === 0, `${c1}${c2}${c3}${c4} · ${pedidas.length}`);
  const noLeido = A.principal(['--aplicar', '--confirmo-proyecto', 'get-wee', '--canal', 'projects/get-wee/notificationChannels/5'], { ejecutar: (args) => (args.includes('list') || args.includes('list-configs') ? { status: 1, stdout: '' } : (pedidas.push(args), { status: 0 })), log: () => {} });
  check('si no se pudo leer lo que hay, no se aplica (el diff no sería fiable)', noLeido === 2 && pedidas.length === 0);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aplicar-'));
  const hechas = [];
  const ok = A.principal(['--aplicar', '--sin-leer', '--confirmo-proyecto', 'get-wee', '--canal', 'projects/get-wee/notificationChannels/5'], { ejecutar: (args) => (hechas.push(args), { status: 0 }), log: () => {}, dirTemporal: tmp });
  check('con las tres cosas, ejecuta crear de todo lo que falta (con el ejecutor FALSO de esta prueba)', ok === 0 && hechas.length === 6 + 9 + 2 + 1 && hechas.every((a) => a.includes('create')), String(hechas.length));
  check('…con los archivos de política escritos en una carpeta temporal, no en el repositorio', fs.readdirSync(tmp).length === 6 + 9 + 1);
  fs.rmSync(tmp, { recursive: true, force: true });
  const fuente = leer('ops/observabilidad/aplicar.mjs');
  check('un único spawnSync, de gcloud', (fuente.match(/spawnSync\(/g) || []).length === 1 && /spawnSync\('gcloud', args/.test(fuente) && !/execSync|execFile|exec\(/.test(fuente));
  check('lanzamiento.mjs y sondas.mjs no ejecutan gcloud para escribir', !/child_process/.test(leer('ops/observabilidad/lanzamiento.mjs'))
    && (leer('ops/observabilidad/sondas.mjs').match(/spawnSync\('gcloud', \[(.*?)\]/g) || []).every((x) => /'auth', 'print-access-token'/.test(x)));
}

/* ═══ D · Sondas ═══════════════════════════════════════════════════════════ */
console.log('\n── D · Sondas de datos ──');
{
  const ahora = Date.parse('2026-10-14T12:00:00Z');
  const hace = (min) => ahora - min * 60_000;
  const datos = {
    creditTransactions: [
      { id: 'usage_a', status: 'AUTHORIZED', createdAt: hace(40) },
      { id: 'usage_b', status: 'AUTHORIZED', createdAt: hace(3) },
      { id: 'usage_c', status: 'COMPLETED', createdAt: hace(100) },
      { id: 'usage_d', status: 'AUTHORIZED', createdAt: hace(90) },
    ],
    aiGenerations: [
      { id: 'g1', creditsCharged: 5, creditTransactionId: 'usage_c', createdAt: hace(60) },
      { id: 'g2', creditsCharged: 2, creditTransactionId: 'usage_a', createdAt: hace(60) },
      { id: 'g3', creditsCharged: 1, createdAt: hace(60) },
      { id: 'g4', creditsCharged: 0, createdAt: hace(60) },
      { id: 'g5', creditsCharged: 3, attribution: 'eval', createdAt: hace(60) },
    ],
    creatorJobs: [
      { id: 'j1', status: 'running', deadlineAt: hace(5), updatedAt: hace(10) },
      { id: 'j2', status: 'running', deadlineAt: ahora + 60_000, updatedAt: hace(1) },
      { id: 'j3', status: 'running', updatedAt: hace(45) },
    ],
    jobs: [
      { id: 'k1', state: 'running', updatedAt: hace(60) },
      { id: 'k2', state: 'waiting', updatedAt: hace(2) },
    ],
  };
  const conCoste = (hoy, tope) => ({
    ...datos,
    'aiSettings/global': tope === undefined ? undefined : { maxUsdPerDay: tope },
    ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((i) => [`aiUsage/${L.diaUtc(ahora, i)}`, { byProvider: { gemini: { usd: 2 } } }])),
    [`aiUsage/${L.diaUtc(ahora, 0)}`]: { byProvider: { gemini: { usd: hoy - 1 }, seedance: { usd: 0.5, usdEnRiesgo: 0.5 } } },
  });
  const r1 = Object.fromEntries((await L.correrSondas(S.lectorDeInstantanea(conCoste(4, 50)), { ahora })).map((x) => [x.id, x]));
  check('reservas: FALLA con las dos AUTHORIZED de más de 15 min, y no con la de 3 min', r1['reservas-autorizadas'].estado === 'FALLA' && /2 reserva/.test(r1['reservas-autorizadas'].detalle) && /usage_a/.test(r1['reservas-autorizadas'].detalle) && !/usage_b/.test(r1['reservas-autorizadas'].detalle), r1['reservas-autorizadas'].detalle);
  check('cobradas sin asiento: FALLA con la de transacción AUTHORIZED y la que no tiene transacción; no cuenta la de eval ni la de 0', r1['cobradas-sin-asiento'].estado === 'FALLA' && /2 de 3/.test(r1['cobradas-sin-asiento'].detalle) && /g2/.test(r1['cobradas-sin-asiento'].detalle) && /g3→sin transacción/.test(r1['cobradas-sin-asiento'].detalle), r1['cobradas-sin-asiento'].detalle);
  check('trabajos de WEË AI: FALLA con el pasado de plazo y el que no se mueve; no con el que está en plazo', r1['trabajos-estancados'].estado === 'FALLA' && /j1/.test(r1['trabajos-estancados'].detalle) && /j3/.test(r1['trabajos-estancados'].detalle) && !/j2/.test(r1['trabajos-estancados'].detalle), r1['trabajos-estancados'].detalle);
  check('trabajos del Core: FALLA con el running de 60 min, no con el waiting de 2', r1['trabajos-core-estancados'].estado === 'FALLA' && /k1/.test(r1['trabajos-core-estancados'].detalle) && !/k2/.test(r1['trabajos-core-estancados'].detalle));
  check('coste: con tope y un día normal, PASA', r1['coste-diario'].estado === 'PASA', r1['coste-diario'].detalle);
  check('cada FALLA dice qué hacer', Object.values(r1).filter((x) => x.estado === 'FALLA').every((x) => x.queHacer && x.queHacer.length > 40));
  const r2 = Object.fromEntries((await L.correrSondas(S.lectorDeInstantanea(conCoste(45, 50)), { ahora, solo: ['coste-diario'] })).map((x) => [x.id, x]));
  check('coste: al 90 % del tope y muy por encima de la semana, FALLA con los dos motivos', r2['coste-diario'].estado === 'FALLA' && /tope de 50/.test(r2['coste-diario'].detalle) && /mediana/.test(r2['coste-diario'].detalle), r2['coste-diario'].detalle);
  const r3 = Object.fromEntries((await L.correrSondas(S.lectorDeInstantanea(conCoste(1, undefined)), { ahora, solo: ['coste-diario'] })).map((x) => [x.id, x]));
  check('coste: sin maxUsdPerDay (como hoy en producción), FALLA: el gasto no tiene techo', r3['coste-diario'].estado === 'FALLA' && /no hay `maxUsdPerDay`/.test(r3['coste-diario'].detalle));
  const limpio = { creditTransactions: [{ id: 'usage_c', status: 'COMPLETED', createdAt: hace(100) }], aiGenerations: [{ id: 'g1', creditsCharged: 5, creditTransactionId: 'usage_c' }], creatorJobs: [], jobs: [] };
  const r4 = await L.correrSondas(S.lectorDeInstantanea({ ...limpio, 'aiSettings/global': { maxUsdPerDay: 20 } }), { ahora });
  check('con todo en orden, las cinco PASAN', r4.length === 5 && r4.every((x) => x.estado === 'PASA'), r4.map((x) => `${x.id}:${x.estado}`).join(' '));
  const roto = await L.correrSondas({ consulta: async () => { throw new Error('403'); }, documentos: async () => { throw new Error('403'); } }, { ahora });
  check('si no puede leer, FALLA (nunca PASA a ciegas)', roto.every((x) => x.estado === 'FALLA' && /no se pudo leer/.test(x.detalle)));

  const { usdToday } = require(path.join(RAIZ, 'functions/lib/engine/limits.js'));
  const muestra = { byProvider: { gemini: { usd: 1.25 }, seedance: { usd: 0.5, usdEnRiesgo: 0.75 }, raro: { usd: 'x' } } };
  check('el coste de la sonda suma exactamente como el tope del motor (engine/limits.ts usdToday)', L.usdDelDia(muestra) === usdToday(muestra), `${L.usdDelDia(muestra)} vs ${usdToday(muestra)}`);

  check('ninguna consulta pide un orden (que exigiría índice compuesto): solo where + limit',
    L.SONDAS.filter((s) => s.lectura.tipo === 'consulta').every((s) => { const q = L.consultaDe(s.lectura, ahora).structuredQuery; return !q.orderBy && q.where && q.limit > 0; }));
  check('la conversión de Firestore REST da números para los Timestamp y mapas planos',
    JSON.stringify(L.deFirestore({ name: 'projects/p/databases/(default)/documents/jobs/k1', fields: { updatedAt: { timestampValue: '2026-10-14T12:00:00Z' }, n: { integerValue: '3' }, m: { mapValue: { fields: { a: { booleanValue: true } } } } } }))
      === JSON.stringify({ updatedAt: ahora, n: 3, m: { a: true }, id: 'k1', __ruta: 'jobs/k1' }));

  const urls = [];
  const lector = S.lectorRest({ token: 't', pedir: async (url, op) => { urls.push([op.method, url]); return { ok: true, text: async () => '[]' }; } });
  await lector.consulta('jobs', {}); await lector.documentos(['aiSettings/global']);
  check('el lector de producción solo hace POST :runQuery y :batchGet (lecturas)', urls.length === 2 && urls.every(([m, u]) => m === 'POST' && /documents:(runQuery|batchGet)$/.test(u)));
  let rechazada = false;
  try { await S.lectorRest({ token: 't', pedir: async () => ({ ok: true, text: async () => '[]' }) }).documentos([]); rechazada = true; } catch { /* nada */ }
  check('…y sin rutas no pide nada', rechazada);
  check('sondas.mjs no imprime el token', !/console\.(log|error)\([^)]*token/.test(leer('ops/observabilidad/sondas.mjs')));
}

const pkg = JSON.parse(leer('functions/package.json'));
check('esta suite está en la cadena de `npm test`', /observabilidad-lanzamiento\.test\.mjs/.test(pkg.scripts.test));

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
