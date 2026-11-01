/**
 * LA SEGURIDAD DE LAS OPERACIONES DE ADMINISTRACIÓN: quién puede, qué queda escrito y cuándo deja de poder.
 *
 *   node test/admin-seguridad.test.mjs        (después de `npm run build`: usa lib/)
 *
 * Regresión de la auditoría de cierre:
 *   A · A1: un rol LIMITA también en las callables antiguas. Cada operación del catálogo, contra cada rol;
 *   B · A2: las operaciones antiguas dejan constancia en dos tiempos, sin secretos y sin éxito por adelantado;
 *   C · M3: revocación. La fuente es Auth AHORA, no el token: rol retirado, cuenta deshabilitada, sesiones revocadas, y
 *       si Auth no responde no se entra;
 *   D · M1: se audita a quién se miró, y solo si es un identificador de verdad;
 *   E · M4, M5, M6: lo parcial se dice, los atascados se buscan por fecha, la cola se lee;
 *   F · M2: los scripts de roles dicen quién los ejecuta y registran el éxito cuando lo saben;
 *   G · reglas, índices y documentación.
 *
 * Lo que prueba contra Auth y Firestore de verdad está en `admin-seguridad.emulator.mjs`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { administracionDePrueba } from './_admin-de-prueba.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../..');
const require = createRequire(import.meta.url);
const lib = (p) => require(path.resolve(here, '../lib', p));
const leer = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => {
  if (!cond) failures++;
  console.log(`${cond ? '✔' : '✘'} ${name}${extra ? ` — ${extra}` : ''}`);
};
const intentar = (fn) => fn().then((v) => ({ ok: true, v }), (e) => ({ ok: false, code: e?.code, message: e?.message }));
const silenciar = async (fn) => {
  const { warn, error } = console; console.warn = () => {}; console.error = () => {};
  try { return await fn(); } finally { console.warn = warn; console.error = error; }
};

const { getApps, initializeApp } = require(path.resolve(here, '../node_modules/firebase-admin/lib/app/index.js'));
if (!getApps().length) initializeApp({ projectId: 'demo-wee' });
const P = lib('admin/permisos.js');
const { CATALOGO, claseDeCredits, claseDeCreditsAdmin, claseDeEval, claseDelCanary, claseDelMotor, claseDeModeracion, estadoDelMotorPara } = lib('admin/operaciones.js');
const credits = lib('credits/index.js');
const { engineAdmin } = lib('engine/admin.js');
const { moderationAdmin } = lib('moderation/index.js');
const { evalRun } = lib('evals/index.js');
const { mediaCanary } = lib('media/canary.js');
const { creditEngine } = lib('credits/creditEngine.js');
const { atenderOps, atenderCuentas } = lib('admin/index.js');
const { crearAuditoria } = lib('admin/auditoria.js');
const { crearLecturas } = lib('admin/lecturas.js');

/* Cómo se llama a cada operación del catálogo, con datos que no hace falta que sirvan: nunca debe llegar a usarlos si se deniega. */
const LLAMADAS = {
  spendCredits: [credits.spendCredits, { service: 'ai_brain', requestId: 'job_abcd1234' }],
  grantCredits: [credits.grantCredits, { userId: 'bea', amount: 1, requestId: 'r1' }],
  refundCredits: [credits.refundCredits, { userId: 'bea', requestId: 'r1' }],
  'creditsAdmin.stats': [credits.creditsAdmin, { action: 'stats' }],
  'creditsAdmin.costs': [credits.creditsAdmin, { action: 'costs' }],
  'creditsAdmin.userHistory': [credits.creditsAdmin, { action: 'userHistory', userId: 'bea' }],
  'creditsAdmin.balance': [credits.creditsAdmin, { action: 'balance', userId: 'bea' }],
  'creditsAdmin.failed': [credits.creditsAdmin, { action: 'failed' }],
  'creditsAdmin.setCost': [credits.creditsAdmin, { action: 'setCost', service: 'ai_brain', credits: 1 }],
  'engineAdmin.status': [engineAdmin, { action: 'status' }],
  'engineAdmin.seedDefaults': [engineAdmin, { action: 'seedDefaults' }],
  'engineAdmin.setProvider': [engineAdmin, { action: 'setProvider', id: 'gemini', enabled: false }],
  'engineAdmin.setRouting': [engineAdmin, { action: 'setRouting', capability: 'text.generate' }],
  'engineAdmin.setSettings': [engineAdmin, { action: 'setSettings', iaDetenida: true }],
  'engineAdmin.resetHealth': [engineAdmin, { action: 'resetHealth' }],
  'moderationAdmin.list': [moderationAdmin, { action: 'list' }],
  'moderationAdmin.history': [moderationAdmin, { action: 'history', reportId: 'x' }],
  'moderationAdmin.review': [moderationAdmin, { action: 'review', reportId: 'x' }],
  evalRun: [evalRun, {}],
  'mediaCanary.listar': [mediaCanary, { accion: 'listar' }],
  'mediaCanary.subir': [mediaCanary, { accion: 'subir', operationId: 'operacion-1', contentType: 'image/png', bytes: 1 }],
  'mediaCanary.confirmar': [mediaCanary, { accion: 'confirmar', operationId: 'operacion-1' }],
  'mediaCanary.procesar': [mediaCanary, { accion: 'procesar', operationId: 'operacion-1' }],
  'mediaCanary.entregar': [mediaCanary, { accion: 'entregar', operationId: 'operacion-1' }],
};
const OWNER = { uid: 'duena', token: { admin: true, weeRole: 'owner', auth_time: 2_000_000_000 } };
const conRol = (rol) => ({ uid: `u-${rol}`, token: { admin: true, weeRole: rol, auth_time: 2_000_000_000 } });

const A = administracionDePrueba(lib);
const reiniciar = (claims = { admin: true }) => {
  Object.assign(A, { claims, disabled: false, tokensValidAfterTime: undefined, fallaAuth: null, fallaAuditoria: () => false, entradas: [], consultasAuth: 0 });
};
/* El motor de mentira: cuenta lo que se ejecuta y hace de libro. */
const reales = { grant: creditEngine.grantCredits, refund: creditEngine.refundCredits, spend: creditEngine.spendCredits, ensure: creditEngine.ensureAccount, read: creditEngine.readBalance };
const motor = { llamadas: 0, falla: null };
creditEngine.grantCredits = async (e) => { motor.llamadas++; if (motor.falla) throw motor.falla; return { transactionId: 't1', requestId: e.requestId, duplicate: false }; };
creditEngine.refundCredits = async () => { motor.llamadas++; return { transactionId: 't2' }; };
creditEngine.spendCredits = async () => { motor.llamadas++; return { transactionId: 't3' }; };
creditEngine.ensureAccount = async () => ({});
creditEngine.readBalance = async (u) => { motor.llamadas++; return { userId: u, balance: 7, initialized: true }; };

/* ── A ───────────────────────────────────────────────────────────────────── */
console.log('\n── A · Un rol limita, también en lo antiguo ──');
await silenciar(async () => {
  check('A1) el catálogo y este mapa de pruebas son la misma lista: ninguna operación sin probar', JSON.stringify(Object.keys(CATALOGO).sort()) === JSON.stringify(Object.keys(LLAMADAS).sort()));
  check('A2) cada operación pide un permiso que existe', Object.values(CATALOGO).every((o) => P.PERMISOS.includes(o.permiso)));
  check('A3) toda escritura pide un permiso de escritura', Object.values(CATALOGO).filter((o) => o.modo === 'escritura').every((o) => P.PERMISOS_DE_ESCRITURA.includes(o.permiso)));
  const NO_OWNER = ['operations', 'finance', 'moderation', 'support', 'engineering', 'inventado'];
  const coladas = [];
  for (const [nombre, [callable, data]] of Object.entries(LLAMADAS)) {
    const { permiso } = CATALOGO[nombre];
    for (const rol of NO_OWNER) {
      if ((P.MATRIZ[rol] ?? []).includes(permiso)) continue;
      reiniciar({ admin: true, weeRole: rol });
      motor.llamadas = 0;
      const r = await intentar(() => callable.run({ auth: conRol(rol), data }));
      if (r.code !== 'permission-denied' || motor.llamadas !== 0) coladas.push(`${rol}→${nombre}:${r.ok ? 'ok' : r.code}`);
    }
  }
  check('A4) ningún rol hace nada fuera de su matriz, en ninguna de las 24 operaciones, y el motor no llega a moverse', coladas.length === 0, coladas.join(' | '));
  const sinPermiso = [];
  for (const [nombre, [callable, data]] of Object.entries(LLAMADAS)) {
    reiniciar({});
    if ((await intentar(() => callable.run({ auth: { uid: 'x', token: {} }, data }))).code !== 'permission-denied') sinPermiso.push(nombre);
    if ((await intentar(() => callable.run({ auth: undefined, data }))).code !== 'unauthenticated') sinPermiso.push(`${nombre}(sin sesión)`);
    if (A.consultasAuth !== 0) sinPermiso.push(`${nombre}(consultó Auth)`);
  }
  check('A5) una sesión normal o sin sesión: rechazada, sin una sola consulta a Auth (nadie puede provocarlas)', sinPermiso.length === 0, sinPermiso.join(' | '));

  /* Lo que el rol SÍ puede: finanzas lee un saldo, y no da un Credit. */
  reiniciar({ admin: true, weeRole: 'finance' });
  motor.llamadas = 0;
  const sal = await intentar(() => credits.creditsAdmin.run({ auth: conRol('finance'), data: { action: 'balance', userId: 'bea' } }));
  const noDa = await intentar(() => credits.grantCredits.run({ auth: conRol('finance'), data: { userId: 'bea', amount: 5, requestId: 'r1' } }));
  check('A6) CONTROL: finanzas lee un saldo y no puede dar Credits', sal.ok && sal.v.balance === 7 && noDa.code === 'permission-denied' && motor.llamadas === 1);

  /* El comportamiento del owner y del legado: documentado y fijado. */
  reiniciar({ admin: true, weeRole: 'owner' });
  motor.llamadas = 0;
  check('A7) el owner conserva las operaciones antiguas', (await intentar(() => credits.grantCredits.run({ auth: OWNER, data: { userId: 'bea', amount: 5, requestId: 'r1' } }))).ok && motor.llamadas === 1);
  reiniciar({ admin: true });
  motor.llamadas = 0;
  const legado = await intentar(() => credits.grantCredits.run({ auth: { uid: 'a', token: { admin: true, auth_time: 2_000_000_000 } }, data: { userId: 'bea', amount: 5, requestId: 'r1' } }));
  check('A8) administración sin rol conserva las antiguas, auditada igual', legado.ok && A.entradas.map((e) => e.resultado).join() === 'intento,ok' && A.entradas[0].actorRol === null);
  const db = { collection: () => { throw new Error('no debe leer'); } };
  const sinRolOps = await intentar(() => atenderOps({ auditoria: crearAuditoria({ db: { collection: () => ({ doc: () => ({ create: async () => {} }) }) } }), lecturas: crearLecturas({ db, auth: () => ({}) }), vigente: async (x) => x }, { uid: 'a', token: { admin: true } }, { action: 'reservas' }));
  check('A9) y no gana nada nuevo: sigue sin poder usar opsAdmin', sinRolOps.code === 'permission-denied' && P.permisosDe({ uid: 'a', token: { admin: true } }).length === 0);
  process.env.WEE_ADMIN_SIN_ROL = 'cerrado';
  reiniciar({ admin: true });
  const cerrado = await intentar(() => credits.grantCredits.run({ auth: { uid: 'a', token: { admin: true, auth_time: 2_000_000_000 } }, data: { userId: 'bea', amount: 5, requestId: 'r1' } }));
  delete process.env.WEE_ADMIN_SIN_ROL;
  check('A10) el legado tiene salida: WEE_ADMIN_SIN_ROL=cerrado lo cierra', cerrado.code === 'permission-denied');
  reiniciar({ admin: true, weeRole: 'jefa' });
  const inventado = await intentar(() => credits.creditsAdmin.run({ auth: conRol('jefa'), data: { action: 'stats' } }));
  check('A11) un rol mal escrito no cae en el legado: no da nada', inventado.code === 'permission-denied');
  const acciones = [claseDeCreditsAdmin({ action: 'x' }), claseDelMotor('x', {}), claseDeModeracion({ action: 'x' }), claseDelCanary('x', {})];
  /* A13: clasificación y cuerpo tienen que ver la misma acción. Un array es lo que los separaría. */
  check('A13) un array no convierte una escritura en lectura: {action:[setCost]} se clasifica como escritura', claseDeCreditsAdmin({ action: ['setCost'], service: 'ai_brain', credits: 1 }).modo === 'escritura' && claseDeCreditsAdmin({ action: '' }).accion === 'creditsAdmin.stats' && claseDeCreditsAdmin({ action: 0 }).accion === 'creditsAdmin.stats');
  reiniciar({ admin: true, weeRole: 'finance' });
  const disfrazada = await intentar(() => credits.creditsAdmin.run({ auth: conRol('finance'), data: { action: ['setCost'], service: 'ai_brain', credits: 1 } }));
  check('A14) y finanzas no pasa con el disfraz', disfrazada.code === 'permission-denied', disfrazada.code);
  check('A15) un puente con un valor mal escrito está cerrado, no abierto', (() => { process.env.WEE_ADMIN_SIN_ROL = 'cerado'; const r = P.esLegado({ uid: 'a', token: { admin: true } }); process.env.WEE_ADMIN_SIN_ROL = 'abierto'; const s = P.esLegado({ uid: 'a', token: { admin: true } }); delete process.env.WEE_ADMIN_SIN_ROL; return r === false && s === true; })());
  const sinToString = await intentar(() => atenderOps({ auditoria: {}, lecturas: {} }, undefined, { action: { toString: 1 } }));
  check('A16) una acción rara sin sesión es unauthenticated, no un error interno', sinToString.code === 'unauthenticated', sinToString.code);
  check('A12) una acción que no existe no se registra con lo que escribió quien llama', acciones.every((c) => c.modo === 'agregada' && /\.desconocida$/.test(c.accion)));
});

/* ── B ───────────────────────────────────────────────────────────────────── */
console.log('\n── B · Auditoría en dos tiempos ──');
await silenciar(async () => {
  const dar = () => credits.grantCredits.run({ auth: OWNER, data: { userId: 'bea', amount: 5, requestId: 'req-1', reason: 'compensación', idToken: 'TOKEN-SECRETO', apiKey: 'CLAVE-SECRETA' } });
  reiniciar({ admin: true, weeRole: 'owner' });
  motor.falla = null; motor.llamadas = 0;
  const bien = await intentar(dar);
  const [i, o] = A.entradas;
  check('B1) una escritura: `intento` antes y `ok` después, con la misma correlación', bien.ok && A.entradas.length === 2 && i.resultado === 'intento' && o.resultado === 'ok' && i.correlationId === o.correlationId && /^adm_/.test(i.correlationId));
  check('B2) con actor real, rol, acción, recurso, fecha y entorno', i.actorUid === 'duena' && i.actorRol === 'owner' && i.accion === 'grantCredits' && i.recurso.tipo === 'creditAccount' && i.recurso.id === 'bea' && typeof i.en === 'number' && typeof i.entorno === 'string');
  check('B3) con la llave para conciliar con el libro de Credits', i.metadatos.requestId === 'req-1' && i.metadatos.amount === 5 && i.motivo === 'compensación');
  check('B4) sin secretos ni tokens', !/TOKEN-SECRETO|CLAVE-SECRETA/.test(JSON.stringify(A.entradas)));
  check('B5) la respuesta del motor no cambia de forma', bien.v.transactionId === 't1' && !('correlationId' in bien.v));

  /* Falla el motor: nunca `ok`. */
  reiniciar({ admin: true, weeRole: 'owner' });
  motor.falla = Object.assign(new Error('INSUFFICIENT'), { code: 'x' });
  const mal = await intentar(dar);
  motor.falla = null;
  check('B6) si la operación falla, `error`, y ningún `ok`', !mal.ok && A.entradas.map((e) => e.resultado).join() === 'intento,error' && !!A.entradas[1].codigoDeError);

  /* No se puede escribir el intento: no se actúa. */
  reiniciar({ admin: true, weeRole: 'owner' });
  A.fallaAuditoria = (e) => e.resultado === 'intento';
  motor.llamadas = 0;
  const sinConstancia = await intentar(dar);
  check('B7) sin constancia no se actúa: `unavailable` y el motor no se mueve', sinConstancia.code === 'unavailable' && motor.llamadas === 0);

  /* Se hizo, y no se pudo cerrar: no se finge que no pasó, y el intento queda para conciliar. */
  reiniciar({ admin: true, weeRole: 'owner' });
  A.fallaAuditoria = (e) => e.resultado === 'ok';
  motor.llamadas = 0;
  const sinCierre = await intentar(dar);
  check('B8) si el cierre falla, el resultado se devuelve y queda un `intento` sin cierre', sinCierre.ok && motor.llamadas === 1 && A.entradas.map((e) => e.resultado).join() === 'intento');

  /* Lecturas de personas. */
  reiniciar({ admin: true, weeRole: 'finance' });
  const saldo = await intentar(() => credits.creditsAdmin.run({ auth: conRol('finance'), data: { action: 'balance', userId: 'bea' } }));
  check('B9) mirar el saldo de alguien deja constancia de a quién se miró', saldo.ok && A.entradas.length === 1 && A.entradas[0].resultado === 'ok' && A.entradas[0].recurso.id === 'bea' && !!saldo.v.correlationId);
  reiniciar({ admin: true, weeRole: 'finance' });
  A.fallaAuditoria = () => true;
  const saldoSin = await intentar(() => credits.creditsAdmin.run({ auth: conRol('finance'), data: { action: 'balance', userId: 'bea' } }));
  check('B10) y sin constancia, no salen los datos', saldoSin.code === 'unavailable');

  /* El rechazo. */
  reiniciar({ admin: true, weeRole: 'support' });
  await intentar(() => credits.grantCredits.run({ auth: conRol('support'), data: { userId: 'bea', amount: 5, requestId: 'r1' } }));
  check('B11) un rechazo a administración queda escrito', A.entradas.length === 1 && A.entradas[0].resultado === 'denegado' && A.entradas[0].actorRol === 'support');
  reiniciar({ admin: true, weeRole: 'support' });
  A.fallaAuditoria = () => true;
  const rechazoSin = await intentar(() => credits.grantCredits.run({ auth: conRol('support'), data: { userId: 'bea', amount: 5, requestId: 'r1' } }));
  check('B12) si no se puede escribir el rechazo, sigue siendo un rechazo (no un error del servidor)', rechazoSin.code === 'permission-denied');

  /* Lo que se copia y lo que no. */
  const m = claseDelMotor('setProvider', { id: 'gemini', enabled: false, models: { secreto: 1 }, limits: { a: 1 }, note: 'NOTA-LIBRE' });
  const r = claseDeModeracion({ action: 'review', reportId: 'r1', to: 'closed', reason: 'TEXTO-DE-LA-REVISION' });
  const c = claseDelCanary('subir', { operationId: 'operacion-1', contentType: 'image/png', bytes: 3, urlFirmada: 'URL-PRIVADA' });
  const e = claseDeEval({ dominio: 'router', prompt: 'PROMPT-PRIVADO' });
  const cc = claseDeCredits('refundCredits', 'bea', { requestId: 'r', payload: 'CARGA-PRIVADA' });
  check('B13) ni configuración entera, ni notas, ni textos de una revisión, ni prompts, ni URLs', !/secreto|NOTA-LIBRE|TEXTO-DE-LA-REVISION|URL-PRIVADA|PROMPT-PRIVADO|CARGA-PRIVADA/.test(JSON.stringify([m, r, c, e, cc])));
  check('B14) las agregadas no auditan y no dicen nada de nadie', A.entradas && CATALOGO['creditsAdmin.stats'].modo === 'agregada' && CATALOGO['engineAdmin.status'].modo === 'agregada');
  const quien = Object.entries(CATALOGO).filter(([, o]) => o.modo === 'agregada').map(([k]) => k).sort().join();
  check('B15) y son exactamente cuatro', quien === 'creditsAdmin.costs,creditsAdmin.stats,engineAdmin.status,mediaCanary.listar', quien);
  /* H1: lo que se audita tiene que ser lo que se ejecuta. */
  const disfraces = [
    ['userId en array', credits.grantCredits, { userId: ['victima'], amount: 1000, requestId: 'r-arr-1' }],
    ['amount en array', credits.grantCredits, { userId: 'victima', amount: [1000], requestId: 'r-arr-2' }],
    ['requestId en array', credits.refundCredits, { userId: 'victima', requestId: ['r-arr-3'] }],
    ['saldo con userId en array', credits.creditsAdmin, { action: 'balance', userId: ['victima'] }],
    ['canary con operationId en array', mediaCanary, { accion: 'procesar', operationId: ['operacion-1'] }],
  ];
  for (const [nombre, callable, data] of disfraces) {
    reiniciar({ admin: true, weeRole: 'owner' });
    motor.llamadas = 0;
    const r = await intentar(() => callable.run({ auth: OWNER, data }));
    check(`B17) ${nombre}: se rechaza sin ejecutar y consta`, r.code === 'invalid-argument' && motor.llamadas === 0 && A.entradas.at(-1)?.resultado === 'error', `${r.code} · motor ${motor.llamadas}`);
  }
  reiniciar({ admin: true, weeRole: 'owner' });
  const costeMal = [null, '', true, 'abc', [1]];
  const motivosCoste = [];
  for (const c of costeMal) { const r = await intentar(() => credits.creditsAdmin.run({ auth: OWNER, data: { action: 'setCost', service: 'ai_brain', credits: c } })); if (r.code !== 'invalid-argument') motivosCoste.push(String(c)); }
  check('B18) setCost: null, vacío, true o texto no dejan un servicio gratis', motivosCoste.length === 0, motivosCoste.join());
  const margen = await intentar(() => engineAdmin.run({ auth: OWNER, data: { action: 'setSettings', margin: '0.5' } }));
  check('B19) setSettings: un margen en texto se rechaza (1 + "0.5" sería "10.5" en el precio)', margen.code === 'invalid-argument', margen.code);
  const constructor_ = await intentar(() => engineAdmin.run({ auth: OWNER, data: { action: 'setProvider', id: 'constructor', enabled: true } }));
  check('B20) setProvider: "constructor" no pasa por proveedor', constructor_.code === 'invalid-argument', constructor_.code);
  const ruta = await intentar(() => evalRun.run({ auth: OWNER, data: { cancelar: true, evalRunId: 'run/casos/c1' } }));
  check('B21) evalRun: un identificador con barras no llega a .doc()', ruta.code === 'invalid-argument', ruta.code);

  check('B22) un correo o una frase no llegan a recurso.id ni a metadatos', (() => { const c = claseDeCredits('grantCredits', 'ana@correo.com', { requestId: 'frase con DATOS, privados y comas', service: 'ai_brain' }); return !c.recurso.id && !('requestId' in c.metadatos) && c.metadatos.service === 'ai_brain'; })());

  /* H5: `ok` dice que terminó; el desenlace, lo que pasó. */
  reiniciar({ admin: true, weeRole: 'owner' });
  const conDuplicado = creditEngine.grantCredits;
  creditEngine.grantCredits = async () => ({ transactionId: 'grant_x', amount: 3, duplicate: true });
  await intentar(() => credits.grantCredits.run({ auth: OWNER, data: { userId: 'bea', amount: 999, requestId: 'r-dup' } }));
  creditEngine.grantCredits = conDuplicado;
  const cierreDup = A.entradas.at(-1);
  check('B23) un duplicado se ve en el cierre, con el importe real', cierreDup.resultado === 'ok' && cierreDup.metadatos.resultadoDuplicado === true && cierreDup.metadatos.resultadoImporte === 3 && cierreDup.metadatos.resultadoTransaccion === 'grant_x', JSON.stringify(cierreDup.metadatos));
  reiniciar({ admin: true, weeRole: 'owner' });
  motor.falla = Object.assign(new Error('x'), { code: 'INSUFFICIENT_CREDITS' });
  await intentar(() => credits.grantCredits.run({ auth: OWNER, data: { userId: 'bea', amount: 1, requestId: 'r-sin' } }));
  motor.falla = null;
  check('B24) el error del motor consta con su código', A.entradas.at(-1).codigoDeError === 'INSUFFICIENT_CREDITS', A.entradas.at(-1).codigoDeError);

  /* H6: sin finance.read, el estado del motor no enseña dinero. */
  const estado = { settings: { pricingMode: 'simulated', margin: 0.5, creditsPerUsd: 100, maxUsdPerDay: 10, iaDetenida: false }, providers: [{ id: 'p', models: [{ id: 'm', cost: '$1', quality: 'alta' }], limits: { usdPerDay: 3, rpm: 5 } }] };
  const recortado = estadoDelMotorPara(estado, { uid: 'o', token: { admin: true, weeRole: 'operations' } });
  check('B25) operaciones ve el estado sin márgenes ni costes', !/margin|creditsPerUsd|maxUsdPerDay|cost|usd/i.test(JSON.stringify(recortado)) && recortado.settings.pricingMode === 'simulated' && recortado.providers[0].models[0].quality === 'alta' && recortado.providers[0].limits.rpm === 5, JSON.stringify(recortado));
  check('B26) el owner y el legado lo ven entero', JSON.stringify(estadoDelMotorPara(estado, OWNER)) === JSON.stringify(estado) && JSON.stringify(estadoDelMotorPara(estado, { uid: 'l', token: { admin: true } })) === JSON.stringify(estado));
  check('B16) el Credit Engine no se toca: la auditoría va por fuera de su transacción', !/adminAudit|admin\/auditoria|admin\/autorizacion/.test(leer('functions/src/credits/creditEngine.ts')));
});

/* ── C ───────────────────────────────────────────────────────────────────── */
console.log('\n── C · Revocación: manda Auth, no el token ──');
await silenciar(async () => {
  const pedir = (auth = OWNER) => intentar(() => credits.grantCredits.run({ auth, data: { userId: 'bea', amount: 5, requestId: 'r1' } }));
  const sinMover = async (nombre, preparar, codigo) => {
    reiniciar({ admin: true, weeRole: 'owner' });
    preparar();
    motor.llamadas = 0;
    const r = await pedir();
    check(nombre, r.code === codigo && motor.llamadas === 0, r.ok ? 'pasó' : r.code);
  };
  await sinMover('C1) token de owner, rol ya retirado junto con admin: fuera', () => { A.claims = {}; }, 'permission-denied');
  await sinMover('C2) token de owner, rol rebajado a soporte: fuera', () => { A.claims = { admin: true, weeRole: 'support' }; }, 'permission-denied');
  await sinMover('C3) cuenta deshabilitada: fuera', () => { A.disabled = true; }, 'permission-denied');
  await sinMover('C4) sesiones revocadas después de iniciar sesión: fuera', () => { A.tokensValidAfterTime = new Date(2_000_000_100_000).toUTCString(); }, 'unauthenticated');
  await sinMover('C5) la cuenta ya no existe: fuera', () => { A.fallaAuth = Object.assign(new Error('x'), { code: 'auth/user-not-found' }); }, 'permission-denied');
  await sinMover('C6) Auth no responde: NO se entra, aunque el token diga owner', () => { A.fallaAuth = new Error('red caída'); }, 'unavailable');
  await sinMover('C7) Auth responde con un error de permisos: tampoco', () => { A.fallaAuth = Object.assign(new Error('x'), { code: 'auth/insufficient-permission' }); }, 'unavailable');

  reiniciar({ admin: true, weeRole: 'owner' });
  A.tokensValidAfterTime = new Date(1_999_999_900_000).toUTCString();
  motor.llamadas = 0;
  check('C8) CONTROL: una sesión iniciada DESPUÉS del corte sigue valiendo', (await pedir()).ok && motor.llamadas === 1);
  reiniciar({ admin: true, weeRole: 'owner' });
  A.tokensValidAfterTime = new Date(1_999_999_900_000).toUTCString();
  check('C9) un token sin fecha de autenticación no se da por bueno si hay un corte', (await pedir({ uid: 'duena', token: { admin: true, weeRole: 'owner' } })).code === 'unauthenticated');
  reiniciar({ admin: true, weeRole: 'owner' });
  await pedir(); await pedir();
  check('C10) sin caché: cada llamada pregunta a Auth', A.consultasAuth === 2, String(A.consultasAuth));
  reiniciar({ admin: true });
  const subir = await pedir({ uid: 'duena', token: { admin: true, weeRole: 'support', auth_time: 2_000_000_000 } });
  check('C11) un claim de rol en el token no sobrevive si Auth ya no lo tiene: manda lo de ahora', subir.ok && A.entradas[0].actorRol === null);
  reiniciar({ admin: true, weeRole: 'owner' });
  const nunca = await pedir({ uid: 'x', token: { auth_time: 2_000_000_000 } });
  check('C12) un token sin admin no se eleva leyendo Auth: lo nuevo llega al renovar el token', nunca.code === 'permission-denied' && A.consultasAuth === 0);

  const d = () => ({ auditoria: crearAuditoria({ db: { collection: () => ({ doc: () => ({ create: async () => {} }) }) } }), lecturas: crearLecturas({ db: {}, auth: () => ({}) }) });
  reiniciar({});
  const quien = await intentar(() => atenderOps(d(), OWNER, { action: 'quienSoy' }));
  check('C13) quienSoy también mira a Auth: la consola se entera de que ya no es administración', quien.code === 'permission-denied');
  reiniciar({ admin: true, weeRole: 'support' });
  const quien2 = await intentar(() => atenderOps(d(), OWNER, { action: 'quienSoy' }));
  check('C14) y de que su rol cambió', quien2.ok && quien2.v.rol === 'support' && quien2.v.permisos.join() === 'accounts.read');
  reiniciar({ admin: true, weeRole: 'support' });
  const ops = await intentar(() => atenderOps(d(), OWNER, { action: 'trabajos' }));
  check('C15) opsAdmin con token antiguo de owner y rol rebajado: fuera', ops.code === 'permission-denied');
  const fuente = leer('functions/src/admin/autorizacion.ts');
  check('C16) la puerta no cae al token si Auth falla', !/catch[^}]*return auth\b/.test(fuente) && /'unavailable', 'No se pudo comprobar el permiso'/.test(fuente));
});

/* ── D, E: lecturas contra una Firestore en memoria ──────────────────────── */
const T0 = 1_800_000_000_000;
const crearDb = (semilla = {}) => {
  const datos = new Map(Object.entries(semilla).map(([c, docs]) => [c, new Map(Object.entries(docs))]));
  const consultas = [];
  const col = (c) => { if (!datos.has(c)) datos.set(c, new Map()); return datos.get(c); };
  const snapDoc = (id, d) => ({ id, exists: d !== undefined, data: () => d });
  const valorDe = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : v);
  const consulta = (c, f = [], orden = null, tope = Infinity, desde = null) => ({
    where: (campo, op, valor) => consulta(c, [...f, { campo, op, valor }], orden, tope, desde),
    orderBy: (campo, dir = 'asc') => consulta(c, f, { campo, dir }, tope, desde),
    limit: (n) => consulta(c, f, orden, n, desde),
    startAfter: (cursor) => consulta(c, f, orden, tope, cursor),
    async get() {
      let filas = [...col(c).entries()].filter(([, d]) => f.every((x) => {
        const a = valorDe(d[x.campo]); const b = valorDe(x.valor);
        return x.op === '==' ? a === b : x.op === '<' ? a < b : x.op === '<=' ? a <= b : false;
      }));
      if (orden) filas = filas.sort(([ia, a], [ib, b]) => {
        const porId = typeof orden.campo !== 'string';
        const x = porId ? ia : valorDe(a[orden.campo]); const y = porId ? ib : valorDe(b[orden.campo]);
        return ((x < y ? -1 : x > y ? 1 : ia < ib ? -1 : 1)) * (orden.dir === 'desc' ? -1 : 1);
      });
      if (desde) filas = typeof desde === 'string' ? filas.filter(([id]) => id > desde) : filas.slice(filas.findIndex(([id]) => id === desde.id) + 1);
      filas = filas.slice(0, tope);
      return { size: filas.length, empty: filas.length === 0, docs: filas.map(([id, d]) => snapDoc(id, d)) };
    },
  });
  return { consultas, datos, collection: (c) => ({ ...consulta(c), doc: (id) => ({ id: id ?? `auto_${col(c).size + 1}`, get: async () => snapDoc(id, col(c).get(id)), create: async (d) => { col(c).set(id ?? `auto_${col(c).size + 1}`, d); } }) }) };
};
const montar = (semilla) => {
  const db = crearDb(semilla);
  const d = { auditoria: crearAuditoria({ db, ahora: () => T0, entorno: 'demo' }), lecturas: crearLecturas({ db, auth: () => ({ getUser: async () => { throw Object.assign(new Error('x'), { code: 'auth/user-not-found' }); } }), ahora: () => T0 }), vigente: async (a) => a };
  return { db, ops: (s, data) => atenderOps(d, s, data), cuentas: (s, data) => atenderCuentas(d, s, data), audit: () => [...(db.datos.get('adminAudit')?.values() ?? [])] };
};
const PROPIETARIA = { uid: 'duena', token: { admin: true, weeRole: 'owner' } };
const SOPORTE = { uid: 's', token: { admin: true, weeRole: 'support' } };

console.log('\n── D · A quién se miró ──');
await silenciar(async () => {
  const uidLargo = 'AbCdEfGhIjKlMnOpQrStUvWxYz01';
  const m = montar({ creatorJobs: { c1: { userId: uidLargo, status: 'done', createdAt: T0, updatedAt: T0 } } });
  await m.ops(PROPIETARIA, { action: 'creaciones', uid: uidLargo });
  check('D1) M1: buscar creaciones por cuenta deja escrita esa cuenta', m.audit()[0].recurso.id === uidLargo && m.audit()[0].recurso.tipo === 'creatorJobs', JSON.stringify(m.audit()[0].recurso));
  const m2 = montar();
  await intentar(() => m2.ops(PROPIETARIA, { action: 'creaciones', uid: 'no/es/un uid con DATOS PRIVADOS' }));
  check('D2) una cuenta mal formada no se copia a la auditoría', !m2.audit()[0].recurso.id && !/PRIVADOS/.test(JSON.stringify(m2.audit())));
  const m3 = montar();
  await intentar(() => m3.cuentas(SOPORTE, { action: 'buscar', uid: 'correo@persona.com con texto' }));
  check('D3) tampoco al buscar una cuenta', !m3.audit()[0].recurso.id && !/correo@/.test(JSON.stringify(m3.audit())));
  const m4 = montar();
  await m4.cuentas(SOPORTE, { action: 'buscar', numeroDeCuenta: '123-456-789' });
  check('D4) un número de cuenta se guarda en su forma canónica', m4.audit()[0].recurso.id === '123456789', JSON.stringify(m4.audit()[0].recurso));
  const m5 = montar();
  await m5.ops(PROPIETARIA, { action: 'trabajos' });
  check('D5) sin cuenta concreta, ningún identificador de persona', !('id' in m5.audit()[0].recurso));
});

console.log('\n── E · Lo parcial se dice ──');
await silenciar(async () => {
  /* M4: 200 creaciones recientes de otra experiencia; la de chef queda fuera de la ventana. */
  const muchas = Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`n${String(i).padStart(3, '0')}`, { userId: 'u', experienceId: 'travel', status: 'done', createdAt: T0 - i, updatedAt: T0 - i }]));
  const vieja = { v1: { userId: 'u', experienceId: 'chef', status: 'done', createdAt: T0 - 500_000, updatedAt: T0 - 500_000 } };
  const m = montar({ creatorJobs: { ...muchas, ...vieja } });
  const r1 = await m.ops(PROPIETARIA, { action: 'creaciones', experiencia: 'chef' });
  check('E1) M4: vacío en la ventana NO dice «no hay»: dice parcial, cuántos miró y desde dónde seguir', r1.items.length === 0 && r1.parcial === true && r1.truncado === true && r1.examinados === 200 && !!r1.cursor);
  const r2 = await m.ops(PROPIETARIA, { action: 'creaciones', experiencia: 'chef', cursor: r1.cursor });
  check('E2) y siguiendo el cursor aparece', r2.items.map((x) => x.id).join() === 'v1' && r2.parcial === false, JSON.stringify(r2.items.length));
  const borrada = await intentar(() => m.ops(PROPIETARIA, { action: 'creaciones', cursor: 'ya-no-existe' }));
  check('E3) un cursor que ya no existe se dice, no empieza de cero', borrada.code === 'failed-precondition');
  const malo = await intentar(() => m.ops(PROPIETARIA, { action: 'creaciones', cursor: '../otra/coleccion' }));
  check('E4) un cursor mal formado se rechaza', malo.code === 'invalid-argument');
  const sobran = await m.ops(PROPIETARIA, { action: 'creaciones', experiencia: 'travel', limit: 10 });
  check('E5) con coincidencias de sobra: truncado, y sigue tras la última devuelta', sobran.items.length === 10 && sobran.truncado === true && sobran.cursor === sobran.items[9].id);
  const pocas = montar({ creatorJobs: vieja });
  const r3 = await pocas.ops(PROPIETARIA, { action: 'creaciones', experiencia: 'travel' });
  check('E6) CONTROL: si se miró todo y no hay, no es parcial', r3.items.length === 0 && r3.parcial === false && r3.truncado === false && !r3.cursor);
  const gen = montar({ aiGenerations: Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`g${String(i).padStart(3, '0')}`, { userId: 'u', provider: 'gemini', createdAt: T0 - i }])) });
  const rg = await gen.ops(PROPIETARIA, { action: 'generaciones', proveedor: 'seedance' });
  check('E7) igual en las generaciones', rg.items.length === 0 && rg.parcial === true && !!rg.cursor);

  /* M6: el atascado que queda detrás de una ventana llena de trabajos vivos. */
  const vivos = Object.fromEntries(Array.from({ length: 300 }, (_, i) => [`j.a${String(i).padStart(3, '0')}`, { jobId: `a${i}`, state: 'running', terminal: false, updatedAt: T0 }]));
  const j = montar({ jobs: { ...vivos, 'j.z-viejo': { jobId: 'z-viejo', state: 'running', terminal: false, updatedAt: T0 - 7_200_000 }, 'j.z-acabado': { jobId: 'z-acabado', state: 'completed', terminal: true, updatedAt: T0 - 7_200_000 } } });
  const at = await j.ops(PROPIETARIA, { action: 'atascados', minutos: 30 });
  check('E8) M6: con 300 trabajos vivos delante, vacío NO dice «no hay»: dice parcial y deja seguir', at.items.length === 0 && at.parcial === true && at.examinados === 200 && !!at.cursor);
  const at2 = await j.ops(PROPIETARIA, { action: 'atascados', minutos: 30, cursor: at.cursor });
  check('E9) y siguiendo el cursor aparece; los terminados no', at2.items.map((x) => x.jobId).join() === 'z-viejo' && at2.parcial === false);
  const lleno = montar({ jobs: Object.fromEntries(Array.from({ length: 3 }, (_, i) => [`j.v${i}`, { jobId: `v${i}`, state: 'running', terminal: false, updatedAt: T0 - 7_200_000 - i }])) });
  const a1 = await lleno.ops(PROPIETARIA, { action: 'atascados', limit: 2 });
  const a2 = await lleno.ops(PROPIETARIA, { action: 'atascados', limit: 2, cursor: a1.cursor });
  const plazo = montar({ jobs: { 'j.espera': { jobId: 'espera', state: 'waiting', terminal: false, updatedAt: T0 - 3_600_000, deadlineAt: T0 + 3_600_000 }, 'j.pasado': { jobId: 'pasado', state: 'running', terminal: false, updatedAt: T0 - 3_600_000, deadlineAt: T0 - 1 }, 'j.sin': { jobId: 'sin', state: 'running', terminal: false, updatedAt: T0 - 3_600_000 } } });
  const conPlazo = Object.fromEntries((await plazo.ops(PROPIETARIA, { action: 'atascados' })).items.map((x) => [x.jobId, x.dentroDePlazo]));
  check('E9b) una espera legítima (vídeo: hasta 2 h 15) se distingue de un atasco: dentroDePlazo solo si el plazo aún no ha pasado', conPlazo.espera === true && conPlazo.pasado === false && conPlazo.sin === false, JSON.stringify(conPlazo));
  check('E10) con más atascados que límite: truncado, y el cursor sigue tras el último devuelto', a1.truncado === true && a1.parcial === false && a1.items.length === 2 && a2.items.map((x) => x.jobId).join() === 'v2' && a2.truncado === false);

  const sinPlazo = montar({ creatorJobs: { s1: { userId: 'u', status: 'running', createdAt: T0 - 9e6, updatedAt: T0 - 9e6 }, s2: { userId: 'u', status: 'running', createdAt: T0, updatedAt: T0 }, s3: { userId: 'u', status: 'done', createdAt: T0 - 9e6, updatedAt: T0 - 9e6 } } });
  const ca = await sinPlazo.ops(PROPIETARIA, { action: 'creacionesAtascadas', minutos: 30 });
  check('E11) M6: una creación en marcha sin plazo también sale como atascada', ca.items.map((x) => x.id).join() === 's1' && ca.items[0].limite === null && ca.items[0].abandonado === false);

  const cola = montar({ jobQueue: {
    q1: { jobId: 'q1', reason: 'created', enqueuedAt: T0 - 1000, disponibleEn: T0 - 1000, entregas: 0, particion: 3 },
    q2: { jobId: 'q2', reason: 'retry', enqueuedAt: T0 - 500, disponibleEn: T0 + 500, entregas: 2, particion: 3, vuelo: { token: 'TOKEN-DE-VUELO', until: T0 + 500 } },
  } });
  const c = await cola.ops(PROPIETARIA, { action: 'cola' });
  check('E12) M6: la cola se lee, con lo que espera y lo que está retrasado', c.items.length === 2 && c.items[0].retrasado === true && c.items[1].enVuelo === true && c.items[1].retrasado === false);
  check('E13) sin los datos internos del vuelo', !/TOKEN-DE-VUELO/.test(JSON.stringify(c)));
  const raros = montar({ jobQueue: {
    apartado: { jobId: 'apartado', disponibleEn: T0 - 9000, entregas: 26, apartado: { desde: T0 - 100, entregas: 25 }, vuelo: null },
    vencido: { jobId: 'vencido', disponibleEn: T0 - 5000, entregas: 2, vuelo: { until: T0 - 5000 } },
  } });
  const cr = (await raros.ops(PROPIETARIA, { action: 'cola' })).items;
  check('E13b) un aviso apartado no se cuenta como retrasado, y una concesión vencida no es «en vuelo»', cr.find((x) => x.jobId === 'apartado').apartado === true && cr.find((x) => x.jobId === 'apartado').retrasado === false && cr.find((x) => x.jobId === 'vencido').enVuelo === false && cr.find((x) => x.jobId === 'vencido').retrasado === true, JSON.stringify(cr));
  const denegada = await intentar(() => cola.ops(SOPORTE, { action: 'cola' }));
  check('E14) con el permiso de siempre', denegada.code === 'permission-denied');
  check('E15) cada una deja constancia', cola.audit().some((e) => e.accion === 'opsAdmin.cola' && e.resultado === 'ok'));
  const cap = (await m.ops(PROPIETARIA, { action: 'capacidades' })).disponibles;
  check('E16) y `capacidades` dice que la cola es solo del Job Engine: no representa toda la actividad', /creatorJobs no pasa/.test(cap.find((x) => x.id === 'cola').nota));
  const pr = montar({ productions: { p1: { ownerAccountId: 'u', updatedAt: T0 }, p2: { ownerAccountId: 'u', updatedAt: T0 - 1 } } });
  const p1 = await pr.ops(PROPIETARIA, { action: 'producciones', limit: 1 });
  const p2 = await pr.ops(PROPIETARIA, { action: 'producciones', limit: 1, cursor: p1.cursor });
  check('E17) las producciones también siguen', p1.truncado && p2.items[0].id === 'p2');
});

/* ── F ───────────────────────────────────────────────────────────────────── */
console.log('\n── F · Los scripts de roles ──');
{
  const O = await import(pathToFileURL(path.join(RAIZ, 'ops/admin/asignar-owner.mjs')).href);
  const R = await import(pathToFileURL(path.join(RAIZ, 'ops/admin/retirar-rol.mjs')).href);
  const real = { proyecto: 'get-wee', uid: 'u1', actor: 'duena', confirmarProyecto: 'get-wee', confirmarUid: 'u1', motivo: 'motivo suficiente', env: {} };
  check('F1) M2: en un proyecto real, sin --actor no se hace nada; en los dos scripts', [O, R].every((S) => { const b = { ...real, fueraDeLaLista: true }; return S.motivosParaNoEjecutar(b).length === 0 && S.motivosParaNoEjecutar({ ...b, actor: undefined }).length === 1 && S.motivosParaNoEjecutar({ ...b, actor: 'con espacio' }).length === 1; }));
  const realR = { ...real, fueraDeLaLista: true };
  check('F2) retirar-rol exige las mismas confirmaciones', R.motivosParaNoEjecutar({ ...realR, confirmarUid: 'otro' }).length === 1 && R.motivosParaNoEjecutar({ ...realR, confirmarProyecto: undefined }).length === 1 && R.motivosParaNoEjecutar({ ...realR, env: { FIRESTORE_EMULATOR_HOST: 'x' } }).length === 1);
  check('F2b) H2: en real, afirmar que el uid no está en la lista: con él, retirar el rol ampliaría su acceso', R.motivosParaNoEjecutar(real).length === 1 && /fuera-de-la-lista/.test(R.motivosParaNoEjecutar(real)[0]) && R.motivosParaNoEjecutar(realR).length === 0);
  check('F2c) una cuenta solo de lista no se asciende sin decirlo: --conceder-admin, confirmado en real', !!O.claimsConOwner({}).error && JSON.stringify(O.claimsConOwner({}, { concederAdmin: true }).claims) === '{"admin":true,"weeRole":"owner"}' && O.claimsConOwner({}, { concederAdmin: true }).concedeAdmin === true && O.motivosParaNoEjecutar({ ...real, concederAdmin: true }).length === 1 && O.motivosParaNoEjecutar({ ...real, concederAdmin: true, confirmarAdmin: 'u1' }).length === 0);
  const fuente = fs.readFileSync(path.join(RAIZ, 'ops/admin/asignar-owner.mjs'), 'utf8') + fs.readFileSync(path.join(RAIZ, 'ops/admin/retirar-rol.mjs'), 'utf8') + fs.readFileSync(path.join(RAIZ, 'ops/admin/_comun.mjs'), 'utf8');
  check('F3) M2: ningún script escribe `ok` por adelantado ni firma con su nombre', !/resultado: 'ok'|script:asignar-owner/.test(fuente));
  const retirar = fs.readFileSync(path.join(RAIZ, 'ops/admin/retirar-rol.mjs'), 'utf8');
  check('F4) retirar-rol: intento, cambio, cierre, en ese orden', retirar.indexOf("await anotar('intento')") < retirar.indexOf('await auth.setCustomUserClaims') && retirar.indexOf('await auth.setCustomUserClaims') < retirar.indexOf("await anotar('ok')"));
  const asignar = fs.readFileSync(path.join(RAIZ, 'ops/admin/asignar-owner.mjs'), 'utf8');
  check('F4b) asignar-owner: intento, cambio, cierre, en ese orden', asignar.indexOf("await anotar('intento')") > 0 && asignar.indexOf("await anotar('intento')") < asignar.indexOf('await auth.setCustomUserClaims') && asignar.indexOf('await auth.setCustomUserClaims') < asignar.indexOf("await anotar('ok')"));
  check('F5) quita rol Y admin, y conserva lo demás: quitar solo el rol AMPLIARÍA su acceso', JSON.stringify(R.claimsSinRol({ admin: true, weeRole: 'support', otro: 1 })) === '{"otro":1}');
  check('F6) mantener admin es una decisión expresa', JSON.stringify(R.claimsSinRol({ admin: true, weeRole: 'support' }, { mantenerAdmin: true })) === '{"admin":true}' && JSON.stringify(R.claimsSinRol(undefined)) === '{}');
  check('F7) y revoca las sesiones', /revokeRefreshTokens/.test(retirar));
  /* Transición: lo puro. Con Auth de verdad, en admin-seguridad.emulator. */
  const I = await import(pathToFileURL(path.join(RAIZ, 'ops/admin/inventario.mjs')).href);
  const sit = (claims, lista = [], uid = 'u') => I.situacionDeCuenta({ uid, claims }, lista).situacion;
  check('F9) inventario: cada situación con su nombre', sit({ admin: true, weeRole: 'owner' }) === 'owner' && sit({ weeRole: 'owner' }, ['u']) === 'owner-solo-por-lista' && sit({ weeRole: 'owner' }) === 'rol-sin-admin' && sit({ admin: true }) === 'legado-por-claim' && sit({}, ['u']) === 'legado-solo-por-lista' && sit({ admin: true, weeRole: 'x' }) === 'rol-invalido' && sit({ admin: true, weeRole: 'support' }) === 'rol-limitado' && sit({}) === 'sin-administracion');
  const cuentas = [I.situacionDeCuenta({ uid: 'l', claims: { admin: true } }), I.situacionDeCuenta({ uid: 'x', claims: { admin: true, weeRole: 'owner' }, disabled: true })];
  check('F10) sin un owner activo no se puede cerrar el legado', I.evaluarCierre(cuentas).sePuedeCerrar === false && I.evaluarCierre(cuentas).pierdenElAcceso.join() === 'l');
  check('F11) con uno sí, y avisa de que uno solo es poco', (() => { const e = I.evaluarCierre([I.situacionDeCuenta({ uid: 'o', claims: { admin: true, weeRole: 'owner' } })]); return e.sePuedeCerrar === true && e.avisos.length === 1; })());
  const C = await import(pathToFileURL(path.join(RAIZ, 'ops/admin/intentos-sin-cierre.mjs')).href);
  const intento = (correlationId, accion, requestId, en = 0) => ({ correlationId, accion, en, resultado: 'intento', actorUid: 'a', recurso: { tipo: 'x' }, metadatos: requestId ? { requestId } : {} });
  const entradas = [
    intento('c1', 'grantCredits', 'consta'),
    intento('c2', 'grantCredits', 'noconsta'),
    intento('c3', 'engineAdmin.setSettings'),
    intento('c4', 'grantCredits', 'conok'), { correlationId: 'c4', resultado: 'ok', metadatos: {} },
    intento('c5', 'grantCredits', 'consta2'), { correlationId: 'c5', resultado: 'error', metadatos: {} },
    intento('c6', 'grantCredits', 'reciente', 9_999_000),
  ];
  const h = await C.clasificarIntentos({ entradas, ahora: 10_000_000, minutos: 30, enLibro: async (_a, r) => ({ existe: ['consta', 'consta2', 'conok'].includes(r) }) });
  const clase = Object.fromEntries(h.map((x) => [x.correlationId, x.clase]));
  check('F12) conciliación: distingue cada caso, y lo que aún puede estar en marcha no se cuenta', JSON.stringify(clase) === JSON.stringify({ c1: 'ocurrio-sin-cierre', c2: 'no-consta', c3: 'revisar-a-mano', c5: 'error-con-movimiento' }), JSON.stringify(clase));
  check('F13) un movimiento de administración sin constancia se ve', C.movimientosSinConstancia([{ id: 'grant_x', requestId: 'x' }, { id: 'grant_consta', requestId: 'consta' }], entradas).map((m) => m.transaccion).join() === 'grant_x');
  const fuentes = ['inventario', 'intentos-sin-cierre'].map((n) => fs.readFileSync(path.join(RAIZ, `ops/admin/${n}.mjs`), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')).join('');
  check('F14) las dos herramientas solo leen', !/\.(set|update|create|delete|add)\(|setCustomUserClaims|revokeRefreshTokens|updateUser|runTransaction/.test(fuentes.replace(/new Set\(|vistos\.add\(|\.set\(e\.correlationId|porCorrelacion\.set\([^)]*\)/g, '')));
  check('F8) ninguna callable toca claims', !/setCustomUserClaims|revokeRefreshTokens/.test(fs.readdirSync(path.join(RAIZ, 'functions/src/admin')).map((f) => leer(`functions/src/admin/${f}`).replace(/\/\*[\s\S]*?\*\//g, '')).join('')));
}

/* ── G ───────────────────────────────────────────────────────────────────── */
console.log('\n── G · Reglas, índices y documentos ──');
{
  const reglas = leer('firestore.rules');
  check('G1) las reglas: un rol que no es owner no hereda la escritura; sin rol y owner, como siempre', /request\.auth\.token\.get\('admin', false\) == true && request\.auth\.token\.get\('weeRole', 'owner'\) == 'owner'/.test(reglas));
  check('G2) adminAudit sigue cerrada a todos los clientes', /match \/adminAudit\/\{entradaId\} \{\s*allow read, write: if false;\s*\}/.test(reglas));
  const indices = JSON.parse(leer('firestore.indexes.json')).indexes;
  const hay = (c, a) => indices.some((i) => i.collectionGroup === c && i.fields.map((f) => `${f.fieldPath}:${f.order}`).join() === `${a}:ASCENDING,updatedAt:ASCENDING`);
  check('G3) el índice de las creaciones atascadas está declarado, y el Job Engine sigue sin ninguno', hay('creatorJobs', 'status') && !indices.some((i) => i.collectionGroup === 'jobs'));
  const seg = leer('docs/admin-console/WEE_ADMIN_CONSOLE_SECURITY_MODEL.md');
  check('G4) M3: el modelo de seguridad ya no dice que revocar el refresh acorta el token', !/revocar[^.\n]*refresco[^.\n]*acorta|acorta[^.\n]*ventana/i.test(seg) && /tiempo máximo/i.test(seg));
  const ci = leer('.github/workflows/ci.yml').replace(/\r/g, '');
  const trozo = (j) => ci.slice(ci.indexOf(`  ${j}:`), (ci.indexOf('\n  nivel-', ci.indexOf(`  ${j}:`) + 5) + 1 || ci.length + 1) - 1);
  check('G7) la consola corre dentro de los niveles que exige el despliegue: tipos y build en el 1, pruebas en el 2', /npm run build --prefix admin-console/.test(trozo('nivel-1')) && /npm test --prefix admin-console/.test(trozo('nivel-2-suites')) && (ci.match(/^  nivel-[a-z0-9-]+:$/gm) ?? []).length === 4);
  check('G6) en móvil una tabla ancha no ensancha la página: el contenedor se desplaza, la página no', /\.consola \{ grid-template-columns: minmax\(0, 1fr\);/.test(leer('admin-console/src/estilos.css')) && /accionFija/.test(leer('admin-console/src/vistas/Moderacion.tsx')) && /accion-fija[^}]*position: sticky/.test(leer('admin-console/src/estilos.css')));
  check('G5) la propuesta de retención existe y no toca nada', /adminAudit/.test(leer('docs/admin-console/WEE_ADMIN_CONSOLE_RETENTION_PROPOSAL.md')));
}

creditEngine.grantCredits = reales.grant; creditEngine.refundCredits = reales.refund; creditEngine.spendCredits = reales.spend; creditEngine.ensureAccount = reales.ensure; creditEngine.readBalance = reales.read;
A.restaurar();
console.log(failures ? `\n${failures} comprobación(es) fallida(s).` : '\nCada operación de administración comprueba Auth, respeta el rol y deja constancia.');
process.exit(failures ? 1 : 0);
