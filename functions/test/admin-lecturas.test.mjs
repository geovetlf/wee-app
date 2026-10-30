/**
 * LAS LECTURAS DE ADMINISTRACIÓN: `opsAdmin`, `accountsAdmin`, los roles y `adminAudit`.
 *
 *   node test/admin-lecturas.test.mjs        (después de `npm run build`: usa lib/)
 *
 * Ejecuta el código compilado sobre una Firestore en memoria. Vigila:
 *   A · roles: un rol sin `admin` no vale nada, un `admin` sin rol no gana nada, ningún comodín;
 *   B · autorización de cada acción en los tres casos: sin sesión, sin permiso, con permiso;
 *   C · auditoría: quién, qué, sobre qué, cuándo, resultado y correlación; sin secretos; solo crea;
 *       y si no puede dejar constancia, NO devuelve los datos;
 *   D · lista blanca: ni el objetivo, ni las respuestas, ni URLs, ni `json`, ni correos;
 *   E · entradas y techos;
 *   F · no escribe nada más que `adminAudit`, y el código no tiene ni una escritura;
 *   G · lo que no existe se dice (`capacidades`);
 *   H · el mecanismo de owner: explícito, sin crear administradores, sin mezclar entornos.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../..');
const require = createRequire(import.meta.url);
const lib = (p) => require(path.resolve(here, '../lib', p));
const leer = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const sinComentarios = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

let failures = 0;
const check = (name, cond, extra = '') => {
  if (!cond) failures++;
  console.log(`${cond ? '✔' : '✘'} ${name}${extra ? ` — ${extra}` : ''}`);
};

/* ── Una Firestore en memoria, con lo justo y que apunta cada escritura ───── */
const { FieldPath } = require(path.resolve(here, '../node_modules/firebase-admin/lib/firestore/index.js'));
const crearDb = (semilla = {}) => {
  const datos = new Map(Object.entries(semilla).map(([c, docs]) => [c, new Map(Object.entries(docs))]));
  const escrituras = [];
  let contador = 0;
  const col = (c) => { if (!datos.has(c)) datos.set(c, new Map()); return datos.get(c); };
  const snapDoc = (id, d) => ({ id, exists: d !== undefined, data: () => d });
  const consulta = (c, filtros = [], orden = null, tope = Infinity, desde = null) => ({
    where: (campo, op, valor) => consulta(c, [...filtros, { campo, op, valor }], orden, tope, desde),
    orderBy: (campo, dir = 'asc') => consulta(c, filtros, { campo, dir }, tope, desde),
    limit: (n) => consulta(c, filtros, orden, n, desde),
    startAfter: (cursor) => consulta(c, filtros, orden, tope, cursor),
    async get() {
      const valorDe = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : v);
      let filas = [...col(c).entries()].filter(([, d]) => filtros.every((f) => {
        const a = valorDe(d[f.campo]); const b = valorDe(f.valor);
        return f.op === '==' ? a === b : f.op === '<' ? a < b : false;
      }));
      if (orden) {
        const porId = orden.campo instanceof FieldPath || String(orden.campo) === '__name__';
        filas = filas.sort(([ia, a], [ib, b]) => {
          const x = porId ? ia : valorDe(a[orden.campo]); const y = porId ? ib : valorDe(b[orden.campo]);
          return (x < y ? -1 : x > y ? 1 : 0) * (orden.dir === 'desc' ? -1 : 1);
        });
      }
      if (desde) filas = filas.filter(([id]) => id > desde);
      filas = filas.slice(0, tope);
      return { size: filas.length, empty: filas.length === 0, docs: filas.map(([id, d]) => snapDoc(id, d)) };
    },
  });
  const db = {
    escrituras,
    datos,
    fallarAuditoria: false,
    collection: (c) => ({
      ...consulta(c),
      doc: (id) => {
        const idFinal = id ?? `auto_${++contador}`;
        return {
          id: idFinal,
          get: async () => snapDoc(idFinal, col(c).get(idFinal)),
          create: async (d) => {
            if (c === 'adminAudit' && db.fallarAuditoria) throw new Error('firestore caído');
            escrituras.push({ c, id: idFinal, op: 'create' });
            col(c).set(idFinal, d);
          },
          set: async () => { escrituras.push({ c, id: idFinal, op: 'set' }); },
          update: async () => { escrituras.push({ c, id: idFinal, op: 'update' }); },
          delete: async () => { escrituras.push({ c, id: idFinal, op: 'delete' }); },
        };
      },
    }),
  };
  return db;
};

const { crearAuditoria, metadatosSeguros, COLECCION_DE_AUDITORIA } = lib('admin/auditoria.js');
const { crearLecturas, capacidades, enmascarar } = lib('admin/lecturas.js');
const { atenderOps, atenderCuentas } = lib('admin/index.js');
const P = lib('admin/permisos.js');

const OWNER = { uid: 'duena', token: { admin: true, weeRole: 'owner' } };
const SOPORTE = { uid: 'soporte1', token: { admin: true, weeRole: 'support' } };
const OPERACIONES = { uid: 'ops1', token: { admin: true, weeRole: 'operations' } };
const ADMIN_SIN_ROL = { uid: 'admin1', token: { admin: true } };
const ROL_SIN_ADMIN = { uid: 'colado', token: { weeRole: 'owner' } };
const NORMAL = { uid: 'persona', token: {} };
const T0 = 1_800_000_000_000;

const SEMILLA = () => ({
  jobs: {
    'j.a': { jobId: 'job-a', state: 'running', terminal: false, ownerUserId: 'cuentaLarga123', capability: 'video.generate', providerId: 'seedance', modelId: 'm1', createdAt: T0 - 7_200_000, updatedAt: T0 - 3_600_000, attemptCount: 2, json: '{"prompt":"SECRETO-DEL-TRABAJO"}' },
    'j.b': { jobId: 'job-b', state: 'queued', terminal: false, ownerUserId: 'cuentaLarga456', createdAt: T0, updatedAt: T0, attemptCount: 0 },
    'j.c': { jobId: 'job-c', state: 'completed', terminal: true, ownerUserId: 'cuentaLarga789', createdAt: T0, updatedAt: T0 },
  },
  creatorJobs: {
    c1: { userId: 'cuentaLarga123', experienceId: 'chef', goal: 'OBJETIVO-PRIVADO', answers: ['RESPUESTA-PRIVADA'], results: [{ url: 'https://x/URL-PRIVADA' }], progressText: 'TEXTO-PRIVADO', status: 'running', deadlineAt: T0 - 1000, createdAt: T0 - 100, updatedAt: T0 - 50, demo: false, creditsEstimated: 10, creditsCharged: 0, steps: [{ status: 'failed' }, { status: 'done' }] },
    c2: { userId: 'cuentaLarga456', experienceId: 'travel', goal: 'OTRO', status: 'done', createdAt: T0 - 200, updatedAt: T0 - 150, creditsCharged: 7, steps: [] },
  },
  aiGenerations: {
    g1: { userId: 'cuentaLarga123', experienceId: 'chef', capability: 'text.generate', provider: 'gemini', model: 'g', status: 'FAILED', attempt: 1, durationMs: 900, createdAt: T0, providerCost: 0.5, providerCostStatus: 'estimado', prompt: 'PROMPT-PRIVADO', creditsCharged: 0 },
  },
  aiUsage: { '2027-01-15': { updatedAt: T0, 'text.generate': { gemini: { calls: 3, failed: 1, credits: 6, usd: 0.2, usdEnRiesgo: 0.1 } } } },
  creditTransactions: {
    t1: { userId: 'cuentaLarga123', service: 'ai_video', amount: 160, status: 'AUTHORIZED', createdAt: { toMillis: () => T0 - 86_400_000 } },
    t2: { userId: 'cuentaLarga123', service: 'ai_text', amount: 2, status: 'COMPLETED', createdAt: { toMillis: () => T0 - 86_400_000 } },
  },
  productions: { p1: { ownerAccountId: 'cuentaLarga123', status: 'active', title: 'TITULO-PRIVADO', createdAt: T0, updatedAt: T0 } },
  users: {
    r1: { uid: 'cuentaLarga123', profileType: 'real', email: 'correo@privado.com', displayName: 'NOMBRE-PRIVADO', createdAt: T0 },
    hidi_cuentaLarga123: { uid: 'hidi_cuentaLarga123', profileType: 'hidi', linkedAccountId: 'cuentaLarga123', displayName: 'CARA-PRIVADA', createdAt: T0 },
  },
  accounts: { cuentaLarga123: { accountNumber: '123456789', status: 'ACTIVE', createdAt: T0 } },
  accountNumbers: { 123456789: { accountId: 'cuentaLarga123' } },
});

const montar = () => {
  const db = crearDb(SEMILLA());
  const auth = {
    getUser: async (uid) => {
      if (uid !== 'cuentaLarga123') throw Object.assign(new Error('no'), { code: 'auth/user-not-found' });
      return { disabled: false, emailVerified: true, email: 'correo@privado.com', phoneNumber: '+34600000000', passwordHash: 'HASH-PRIVADO', tokensValidAfterTime: 'x', providerData: [{ providerId: 'password', email: 'correo@privado.com' }], metadata: { creationTime: 'ayer', lastSignInTime: 'hoy' } };
    },
  };
  const d = {
    auditoria: crearAuditoria({ db, ahora: () => T0, entorno: 'demo-prueba' }),
    lecturas: crearLecturas({ db, auth: () => auth, ahora: () => T0 }),
  };
  return { db, d, ops: (ses, data) => atenderOps(d, ses, data), cuentas: (ses, data) => atenderCuentas(d, ses, data) };
};
const intentar = (fn) => fn().then((v) => ({ ok: true, v }), (e) => ({ ok: false, code: e?.code, message: e?.message }));
const silenciar = async (fn) => {
  const { warn, error } = console; console.warn = () => {}; console.error = () => {};
  try { return await fn(); } finally { console.warn = warn; console.error = error; }
};

/* ── A · roles ───────────────────────────────────────────────────────────── */
console.log('\n── A · Roles y permisos ──');
check('A1) owner tiene todos los permisos, por lista y sin comodín', JSON.stringify([...P.MATRIZ.owner].sort()) === JSON.stringify([...P.PERMISOS].sort()) && !P.PERMISOS.includes('*'));
check('A2) un rol sin ser administración no vale nada', P.rolDe(ROL_SIN_ADMIN) === null && P.permisosDe(ROL_SIN_ADMIN).length === 0);
check('A3) administración sin rol no gana ningún permiso nuevo', P.rolDe(ADMIN_SIN_ROL) === null && P.permisosDe(ADMIN_SIN_ROL).length === 0);
check('A4) un rol inventado no existe', P.permisosDe({ uid: 'x', token: { admin: true, weeRole: 'superadmin' } }).length === 0 && P.permisosDe({ uid: 'x', token: { admin: true, weeRole: '__proto__' } }).length === 0);
check('A5) los permisos de esta fase son todos de lectura', P.PERMISOS.every((p) => p.endsWith('.read')));
check('A6) cada rol de la matriz es de los declarados, con permisos declarados', P.ROLES.every((r) => Array.isArray(P.MATRIZ[r]) && P.MATRIZ[r].every((p) => P.PERMISOS.includes(p))));
const antes = process.env.WEE_ADMIN_UIDS;
process.env.WEE_ADMIN_UIDS = 'porLista';
check('A7) estar en WEE_ADMIN_UIDS no da rol: el rol es otro acto', P.rolDe({ uid: 'porLista', token: {} }) === null);
if (antes === undefined) delete process.env.WEE_ADMIN_UIDS; else process.env.WEE_ADMIN_UIDS = antes;
check('A8) ninguna callable ni módulo del servidor escribe claims', !fs.readdirSync(path.join(RAIZ, 'functions/src'), { recursive: true }).filter((f) => /\.ts$/.test(String(f))).some((f) => /setCustomUserClaims/.test(sinComentarios(leer(`functions/src/${String(f).split(path.sep).join('/')}`)))));

/* ── B · autorización ────────────────────────────────────────────────────── */
console.log('\n── B · Autorización de cada acción ──');
const ACCIONES_OPS = [['trabajos', 'ops.read'], ['atascados', 'ops.read'], ['creaciones', 'ops.read'], ['producciones', 'ops.read'], ['generaciones', 'ai.read'], ['usoIa', 'ai.read'], ['reservas', 'finance.read'], ['auditoria', 'audit.read'], ['capacidades', 'ops.read']];
await silenciar(async () => {
  for (const [action] of ACCIONES_OPS) {
    const { ops } = montar();
    const sin = await intentar(() => ops(undefined, { action }));
    const normal = await intentar(() => ops(NORMAL, { action }));
    const colado = await intentar(() => ops(ROL_SIN_ADMIN, { action }));
    const sinRol = await intentar(() => ops(ADMIN_SIN_ROL, { action }));
    const dueña = await intentar(() => ops(OWNER, { action, dia: '2027-01-15' }));
    check(`B1) ${action}: sin sesión, normal, rol sin admin, admin sin rol → rechazado; owner → sí`,
      sin.code === 'unauthenticated' && normal.code === 'permission-denied' && colado.code === 'permission-denied' && sinRol.code === 'permission-denied' && dueña.ok,
      [sin.code, normal.code, colado.code, sinRol.code, dueña.ok ? 'ok' : dueña.code].join(','));
  }
  const m = montar();
  const sinC = await intentar(() => m.cuentas(undefined, { action: 'buscar', uid: 'cuentaLarga123' }));
  const normalC = await intentar(() => m.cuentas(NORMAL, { action: 'buscar', uid: 'cuentaLarga123' }));
  const opsC = await intentar(() => m.cuentas(OPERACIONES, { action: 'buscar', uid: 'cuentaLarga123' }));
  const sopC = await intentar(() => m.cuentas(SOPORTE, { action: 'buscar', uid: 'cuentaLarga123' }));
  check('B2) accountsAdmin.buscar: solo con accounts.read', sinC.code === 'unauthenticated' && normalC.code === 'permission-denied' && opsC.code === 'permission-denied' && sopC.ok);
  const opsNo = await intentar(() => m.ops(OPERACIONES, { action: 'reservas' }));
  const opsSi = await intentar(() => m.ops(OPERACIONES, { action: 'trabajos' }));
  const sopNo = await intentar(() => m.ops(SOPORTE, { action: 'trabajos' }));
  check('B3) mínimo privilegio: operaciones ve trabajos y no Credits; soporte ve cuentas y no trabajos', opsNo.code === 'permission-denied' && opsSi.ok && sopNo.code === 'permission-denied');
  const quien = await intentar(() => m.ops(ADMIN_SIN_ROL, { action: 'quienSoy' }));
  const quienNo = await intentar(() => m.ops(NORMAL, { action: 'quienSoy' }));
  const quienDueña = await intentar(() => m.ops(OWNER, { action: 'quienSoy' }));
  check('B4) quienSoy: administración sin rol lo sabe; una sesión normal, no', quien.ok && quien.v.rol === null && quien.v.permisos.length === 0 && quienNo.code === 'permission-denied' && quienDueña.v.rol === 'owner');
  const rara = await intentar(() => m.ops(OWNER, { action: 'setProvider', id: 'x' }));
  const raraN = await intentar(() => m.ops(NORMAL, { action: 'nadaDeEsto' }));
  const cuentaRara = await intentar(() => m.cuentas(OWNER, { action: 'suspender', uid: 'x' }));
  check('B5) una acción desconocida (o de escritura) no existe; y a quien no tiene permiso ni se le dice cuáles hay', rara.code === 'invalid-argument' && raraN.code === 'permission-denied' && cuentaRara.code === 'invalid-argument');
});

/* ── C · auditoría ───────────────────────────────────────────────────────── */
console.log('\n── C · Auditoría ──');
await silenciar(async () => {
  const m = montar();
  const r = await m.cuentas(OWNER, { action: 'buscar', uid: 'cuentaLarga123' });
  const [e] = [...m.db.datos.get('adminAudit').values()];
  check('C1) consta actor, rol, acción, recurso, fecha, resultado, correlación y entorno',
    e.actorUid === 'duena' && e.actorRol === 'owner' && e.accion === 'accountsAdmin.buscar' && e.recurso.tipo === 'cuenta' && e.recurso.id === 'cuentaLarga123' && e.en === T0 && e.resultado === 'ok' && e.correlationId === r.correlationId && /^adm_[0-9a-f]{24}$/.test(r.correlationId) && e.entorno === 'demo-prueba', JSON.stringify(e));
  check('C2) la respuesta lleva su correlación y cuándo se generó', typeof r.generadoEn === 'number');

  const m2 = montar();
  m2.db.fallarAuditoria = true;
  const sinConstancia = await intentar(() => m2.cuentas(OWNER, { action: 'buscar', uid: 'cuentaLarga123' }));
  const sinConstanciaOps = await intentar(() => m2.ops(OWNER, { action: 'trabajos' }));
  check('C3) si no se puede dejar constancia, NO se devuelven los datos', !sinConstancia.ok && sinConstancia.code === 'unavailable' && !sinConstanciaOps.ok && sinConstanciaOps.code === 'unavailable');

  const m3 = montar();
  await intentar(() => m3.ops(ADMIN_SIN_ROL, { action: 'reservas' }));
  const denegada = [...m3.db.datos.get('adminAudit').values()][0];
  check('C4) un intento denegado de administración queda registrado', denegada?.resultado === 'denegado' && denegada.codigoDeError === 'permission-denied' && denegada.actorUid === 'admin1');
  const m4 = montar();
  await intentar(() => m4.ops(NORMAL, { action: 'reservas' }));
  await intentar(() => m4.ops(undefined, { action: 'reservas' }));
  check('C5) el de una sesión cualquiera no escribe: nadie puede llenar la colección a golpes', m4.db.escrituras.length === 0);

  const seguros = metadatosSeguros({ limit: 5, password: 'x', idToken: 'y', apiKey: 'z', AUTHORIZATION: 'q', clientSecret: 'w', objeto: { a: 1 }, lista: [1], ok: true, texto: 'hola' });
  check('C6) los metadatos no guardan credenciales ni objetos', JSON.stringify(seguros) === JSON.stringify({ limit: 5, ok: true, texto: 'hola' }), JSON.stringify(seguros));

  const fuente = sinComentarios(leer('functions/src/admin/auditoria.ts'));
  check('C7) el módulo de auditoría solo crea: ni update, ni set, ni delete', /\.create\(registro\)/.test(fuente) && !/\.(update|set|delete)\(/.test(fuente));
  const m5 = montar();
  await m5.ops(OWNER, { action: 'trabajos' });
  await m5.ops(OWNER, { action: 'atascados' });
  const leida = await m5.ops(OWNER, { action: 'auditoria', limit: 5 });
  check('C8) el owner lee el registro, de lo más reciente a lo más antiguo, y la lectura también consta', leida.items.length === 2 && [...m5.db.datos.get('adminAudit').values()].length === 3);
  const reglas = leer('firestore.rules');
  check('C9) las reglas cierran adminAudit a todos los clientes', /match \/adminAudit\/\{entradaId\} \{\s*allow read, write: if false;\s*\}/.test(reglas));
  check('C10) la colección es la del contrato', COLECCION_DE_AUDITORIA === 'adminAudit');
});

/* ── D · lista blanca ────────────────────────────────────────────────────── */
console.log('\n── D · Solo los campos permitidos ──');
await silenciar(async () => {
  const m = montar();
  const todo = JSON.stringify(await Promise.all([
    m.ops(OWNER, { action: 'trabajos' }), m.ops(OWNER, { action: 'atascados' }), m.ops(OWNER, { action: 'creaciones' }),
    m.ops(OWNER, { action: 'generaciones' }), m.ops(OWNER, { action: 'producciones' }), m.cuentas(OWNER, { action: 'buscar', uid: 'cuentaLarga123' }),
  ]));
  const prohibidos = ['SECRETO-DEL-TRABAJO', 'OBJETIVO-PRIVADO', 'RESPUESTA-PRIVADA', 'URL-PRIVADA', 'TEXTO-PRIVADO', 'PROMPT-PRIVADO', 'TITULO-PRIVADO', 'NOMBRE-PRIVADO', 'CARA-PRIVADA', 'correo@privado.com', '+34600000000', 'HASH-PRIVADO', 'tokensValidAfterTime', '"json"'];
  const salen = prohibidos.filter((p) => todo.includes(p));
  check('D1) ni el contenido de la persona, ni su correo, ni credenciales, aunque quien mira sea el owner', salen.length === 0, salen.join(', '));

  const conCuenta = await m.ops(OWNER, { action: 'trabajos' });
  const sinCuenta = await m.ops(OPERACIONES, { action: 'trabajos' });
  check('D2) la cuenta entera solo con accounts.read; sin él, enmascarada', conCuenta.items[0].cuenta === 'cuentaLarga123' && sinCuenta.items[0].cuenta === 'cuen…23' && enmascarar('abc', false) === '…' && enmascarar(null, true) === null, sinCuenta.items[0].cuenta);
  const genOwner = await m.ops(OWNER, { action: 'generaciones' });
  const genOps = await m.ops(OPERACIONES, { action: 'generaciones' });
  check('D3) el coste de proveedor solo con finance.read', genOwner.items[0].costeProveedorUsd === 0.5 && !('costeProveedorUsd' in genOps.items[0]));
  const usoOps = await m.ops(OPERACIONES, { action: 'usoIa', dia: '2027-01-15' });
  const usoOwner = await m.ops(OWNER, { action: 'usoIa', dia: '2027-01-15' });
  check('D4) también en el agregado del día', usoOwner.existe && usoOwner.items[0].usd === 0.2 && usoOwner.items[0].llamadas === 3 && !('usd' in usoOps.items[0]));
  const porCuentaOps = await intentar(() => m.ops(OPERACIONES, { action: 'creaciones', uid: 'cuentaLarga123' }));
  check('D5) sin ver cuentas no se puede buscar por cuenta (la máscara no se esquiva filtrando)', porCuentaOps.code === 'permission-denied');
  const b = await m.cuentas(OWNER, { action: 'buscar', uid: 'cuentaLarga123' });
  check('D6) la cuenta: sus perfiles Real y Weë, su estado y su acceso, sin decir que existe una restricción que no existe',
    b.encontrada === true && b.perfiles.map((p) => p.tipo).sort().join() === 'real,wee' && b.cuenta.estado === 'ACTIVE' && b.cuenta.numero === '123456789' && b.acceso.tieneCorreo === true && b.acceso.proveedores.join() === 'password' && b.restricciones.disponible === false);
  const porNumero = await m.cuentas(OWNER, { action: 'buscar', numeroDeCuenta: '123-456-789' });
  const noEsta = await m.cuentas(OWNER, { action: 'buscar', uid: 'nadie' });
  const numeroNo = await m.cuentas(OWNER, { action: 'buscar', numeroDeCuenta: '999999999' });
  check('D7) por número de cuenta llega a la misma; lo que no existe es una respuesta, no un error', porNumero.uid === 'cuentaLarga123' && noEsta.encontrada === false && numeroNo.encontrada === false);
});

/* ── E · entradas y techos ───────────────────────────────────────────────── */
console.log('\n── E · Entradas y techos ──');
await silenciar(async () => {
  const m = montar();
  const malas = [
    ['trabajos', { estado: 'inventado' }], ['trabajos', { cursor: 'users/x' }],
    ['atascados', { minutos: 1 }], ['atascados', { minutos: 'x' }], ['atascados', { minutos: 99_999_999 }],
    ['creaciones', { experiencia: 'nope' }], ['creaciones', { estado: 'nope' }], ['creaciones', { uid: 'a/b' }],
    ['generaciones', { proveedor: 'a/b' }], ['usoIa', { dia: '../../x' }], ['reservas', { minutos: 0 }],
  ];
  const fallos = [];
  for (const [action, datos] of malas) {
    const r = await intentar(() => m.ops(OWNER, { action, ...datos }));
    if (r.code !== 'invalid-argument') fallos.push(`${action}:${JSON.stringify(datos)}→${r.ok ? 'ok' : r.code}`);
  }
  check(`E1) las ${malas.length} entradas malas se rechazan`, fallos.length === 0, fallos.join(' | '));
  const { leerLimite } = lib('admin/lecturas.js');
  check('E1) el techo de resultados se cumple siempre: lo que pase de 50 se recorta, y lo raro no abre la consulta', [leerLimite(500), leerLimite(51), leerLimite(50)].every((n) => n === 50) && [leerLimite('x'), leerLimite(undefined), leerLimite(-1)].every((n) => n >= 1 && n <= 50), [leerLimite(500), leerLimite('x'), leerLimite(-1)].join(','));
  const malasC = [{}, { uid: 'a', numeroDeCuenta: '123456789' }, { uid: 'a/b' }, { numeroDeCuenta: 'abc' }];
  const fallosC = [];
  for (const datos of malasC) {
    const r = await intentar(() => m.cuentas(OWNER, { action: 'buscar', ...datos }));
    if (r.code !== 'invalid-argument') fallosC.push(JSON.stringify(datos));
  }
  check('E2) una cuenta se busca por uid o por número, uno solo y bien formado', fallosC.length === 0, fallosC.join(' | '));
  const at = await m.ops(OWNER, { action: 'atascados', minutos: 30 });
  check('E3) atascados: los no terminados sin moverse desde hace más de N minutos', at.items.map((j) => j.jobId).join() === 'job-a' && at.examinados === 2 && at.truncado === false);
  const cr = await m.ops(OWNER, { action: 'creaciones', experiencia: 'chef' });
  check('E4) creaciones: filtra por experiencia, avisa de lo que miró y marca lo abandonado', cr.items.length === 1 && cr.items[0].abandonado === true && cr.items[0].pasosFallidos === 1 && cr.examinados === 2);
  const res = await m.ops(OWNER, { action: 'reservas', minutos: 120 });
  check('E5) reservas: solo las AUTHORIZED viejas, con el mismo criterio que el script', res.items.length === 1 && res.items[0].id === 't1');
  const sinDia = await m.ops(OWNER, { action: 'usoIa', dia: '2020-01-01' });
  check('E6) un día sin datos lo dice (existe:false), no inventa ceros', sinDia.existe === false && sinDia.items.length === 0);
});

/* ── F · solo lectura ────────────────────────────────────────────────────── */
console.log('\n── F · Solo leen ──');
await silenciar(async () => {
  const m = montar();
  for (const [action] of ACCIONES_OPS) await m.ops(OWNER, { action, dia: '2027-01-15' });
  await m.cuentas(OWNER, { action: 'buscar', uid: 'cuentaLarga123' });
  const fuera = m.db.escrituras.filter((e) => e.c !== 'adminAudit' || e.op !== 'create');
  check('F1) tras todas las acciones, lo único escrito son entradas nuevas de adminAudit', fuera.length === 0 && m.db.escrituras.length > 0, JSON.stringify(fuera));
});
for (const f of ['functions/src/admin/lecturas.ts', 'functions/src/admin/index.ts']) {
  const c = sinComentarios(leer(f));
  check(`F2) ${path.basename(f)} no escribe ni llama a ningún motor que escriba`, !/\.(set|update|delete|add|create|runTransaction|batch|setCustomUserClaims|updateUser|deleteUser)\(/.test(c.replace(/d\.auditoria\.registrar\(/g, '')) && !/creditEngine|grantCredits|spendCredits|refundCredits|validatePurchase|engine\.generate/.test(c));
}

/* ── G · lo que no existe se dice ────────────────────────────────────────── */
console.log('\n── G · Lo que no existe se dice ──');
{
  const c = capacidades();
  const no = c.noDisponibles.map((x) => x.id);
  check('G1) incidentes, Guardian, Music y Design constan como no disponibles, con su motivo', ['incidentes', 'guardian', 'music', 'design', 'restricciones'].every((x) => no.includes(x)) && c.noDisponibles.every((x) => x.motivo && x.dependencia));
  check('G2) ninguna fuente de Music o Design en lo disponible', !c.disponibles.some((x) => (x.experiencias ?? []).some((e) => e === 'music' || e === 'design')));
  check('G3) y nada se monta con datos de ejemplo', !/mock|demoData|ejemplo/i.test(sinComentarios(leer('functions/src/admin/lecturas.ts')).replace(/demo: j\.demo === true/, '')));
}

/* ── H · el mecanismo de owner ───────────────────────────────────────────── */
console.log('\n── H · Asignar owner ──');
{
  const S = await import(pathToFileURL(path.join(RAIZ, 'ops/admin/asignar-owner.mjs')).href);
  const EMU = { FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099', FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' };
  check('H1) en un proyecto demo con emuladores locales, se puede', S.motivosParaNoEjecutar({ proyecto: 'demo-wee', uid: 'u1', env: EMU }).length === 0);
  check('H2) demo sin emuladores, o con emuladores fuera de esta máquina, no', S.motivosParaNoEjecutar({ proyecto: 'demo-wee', uid: 'u1', env: {} }).length > 0 && S.motivosParaNoEjecutar({ proyecto: 'demo-wee', uid: 'u1', env: { FIREBASE_AUTH_EMULATOR_HOST: '10.0.0.4:9099', FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' } }).length > 0);
  const real = { proyecto: 'get-wee', uid: 'u1', confirmarProyecto: 'get-wee', confirmarUid: 'u1', motivo: 'la persona dueña de Weë', env: {} };
  check('H3) en un proyecto real exige las dos confirmaciones y el motivo', S.motivosParaNoEjecutar(real).length === 0
    && S.motivosParaNoEjecutar({ ...real, confirmarProyecto: undefined }).length > 0 && S.motivosParaNoEjecutar({ ...real, confirmarUid: 'otro' }).length > 0 && S.motivosParaNoEjecutar({ ...real, motivo: 'x' }).length > 0);
  check('H4) y un proyecto real no se mezcla con variables de emulador', S.motivosParaNoEjecutar({ ...real, env: EMU }).length > 0);
  check('H5) no crea administradores: sin claim admin, se niega', !!S.claimsConOwner({}).error && !!S.claimsConOwner(undefined).error && !!S.claimsConOwner({ admin: 'true' }).error);
  check('H6) conserva los demás claims y solo añade el rol', JSON.stringify(S.claimsConOwner({ admin: true, otro: 1 }).claims) === JSON.stringify({ admin: true, otro: 1, weeRole: 'owner' }));
  const c = sinComentarios(leer('ops/admin/asignar-owner.mjs'));
  check('H7) deja constancia ANTES de cambiar el rol', c.indexOf("collection('adminAudit')") > 0 && c.indexOf("collection('adminAudit')") < c.indexOf('setCustomUserClaims'));
  check('H8) el modo --owner del script local sigue encerrado en el emulador', /motivosParaNoUsar/.test(leer('admin-console/scripts/admin-local.mjs')));
}

console.log(failures ? `\n${failures} comprobación(es) fallida(s).` : '\nLas lecturas de administración cumplen: permiso, constancia, lista blanca y solo lectura.');
process.exit(failures ? 1 : 0);
