/**
 * MODERATION CORE — casos, acciones, sanciones, apelaciones, auditoría y contratos de la Consola.
 *
 * La fundación (`moderation.test.mjs`, intacta) comprueba que denunciar existe y no se puede falsear. Esta suite
 * comprueba lo que se construye encima, y sobre todo lo que NO se puede hacer:
 *
 *   A · El contrato, ejecutado: catálogo único, estados y transiciones, prioridad, políticas (apagadas y sin
 *       números inventados), peticiones estrictas, custodia, sanciones, apelaciones, vistas y auditoría.
 *   B · La composición contra un Firestore de mentira que se porta como el de verdad (lecturas antes que
 *       escrituras, `create` que choca, `undefined` prohibido): intake, triaje, ocultar/restaurar/retirar,
 *       advertir/suspender/bloquear/levantar, idempotencia, conflicto de interés, apelaciones, barrido, la vista de
 *       la persona afectada y las lecturas de la Consola.
 *   C · Seguridad: autorización en el servidor, identidad protegida, Real y Weë separados, nadie modera lo suyo.
 *   D · Estructura: puro donde tiene que serlo, sin IA, sin Credits, sin avisos de verdad, sin índices compuestos,
 *       sin reglas nuevas, una función por acción, decidido en el despliegue, documentado, con i18n.
 *   M · Las decisiones del dueño del 2026-11-07: autolesiones como señal de riesgo (nunca oculta ni sanciona), la marca
 *       de «mismo revisor», el abuso de reportes solo como señal y WeeTalk fuera del Moderation Core.
 *
 * Usa el compilado (`functions/lib`): `npm run build` antes. Las transacciones de verdad, la concurrencia y las
 * reglas, en `moderation-core.emulator.mjs`.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const require = createRequire(import.meta.url);
const lib = (p) => require(path.resolve(RAIZ, 'functions/lib', p));
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const existe = (p) => fs.existsSync(path.resolve(RAIZ, p));
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const rechazo = async (promesa) => { try { await promesa; return null; } catch (e) { return e; } };

const M = lib('core/moderation.js');
const C = lib('core/moderation-case.js');
const A = lib('core/moderation-action.js');
const P = lib('core/moderation-appeal.js');
const comp = lib('moderation/index.js');
const N = lib('moderation/nucleo.js');
const K = lib('moderation/consola.js');
const AUT = lib('moderation/autorizacion.js');

/* ── Un Firestore de mentira que se porta como el de verdad en lo que importa aquí ─────────────────────────────── */
const sinIndefinidos = (v, ruta = '') => {
  if (v === undefined) throw new Error(`undefined en ${ruta || 'la raíz'}: Firestore no lo acepta`);
  if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) sinIndefinidos(x, `${ruta}.${k}`);
};
const crearDb = () => {
  const docs = new Map();
  let auto = 0;
  const cuenta = { lecturas: 0, escrituras: 0, transacciones: 0 };
  const clon = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  const campo = (d, ruta) => ruta.split('.').reduce((o, k) => (o == null ? undefined : o[k]), d);
  const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  function snap(ruta) {
    const d = docs.get(ruta);
    return { exists: d !== undefined, id: ruta.split('/').pop(), ref: docRef(ruta), data: () => clon(d), get: (c) => campo(clon(d), c) };
  }
  const filtrar = (col, f, o, tope, despues) => {
    let filas = [...docs.entries()].filter(([r]) => r.startsWith(`${col}/`) && !r.slice(col.length + 1).includes('/'));
    for (const { c, op, v } of f) {
      filas = filas.filter(([, d]) => {
        const x = campo(d, c);
        if (x === undefined) return false;
        return op === '==' ? x === v : op === '>=' ? x >= v : op === '<=' ? x <= v : op === '<' ? x < v : op === '>' ? x > v : op === 'in' ? v.includes(x) : false;
      });
    }
    for (const { c } of o) filas = filas.filter(([, d]) => campo(d, c) !== undefined);
    filas.sort((a, b) => {
      for (const { c, dir } of o) { const r = cmp(campo(a[1], c), campo(b[1], c)) * (dir === 'desc' ? -1 : 1); if (r) return r; }
      return cmp(a[0], b[0]);
    });
    if (despues !== undefined && o.length) filas = filas.filter(([, d]) => (o[0].dir === 'desc' ? campo(d, o[0].c) < despues : campo(d, o[0].c) > despues));
    return filas.slice(0, tope);
  };
  const consulta = (col, f = [], o = [], tope = Infinity, despues = undefined) => ({
    _consulta: true,
    where: (c, op, v) => consulta(col, [...f, { c, op, v }], o, tope, despues),
    orderBy: (c, dir = 'asc') => consulta(col, f, [...o, { c, dir }], tope, despues),
    limit: (n) => consulta(col, f, o, n, despues),
    startAfter: (v) => consulta(col, f, o, tope, v),
    count: () => ({ get: async () => ({ data: () => ({ count: filtrar(col, f, o, Infinity, despues).length }) }) }),
    get: async () => { cuenta.lecturas++; const filas = filtrar(col, f, o, tope, despues); return { empty: filas.length === 0, size: filas.length, docs: filas.map(([r]) => snap(r)) }; },
  });
  const colRef = (col) => ({ ...consulta(col), path: col, doc: (id) => docRef(`${col}/${id ?? `auto${String(++auto).padStart(8, '0')}`}`) });
  function docRef(ruta) {
    return {
      path: ruta,
      id: ruta.split('/').pop(),
      get: async () => { cuenta.lecturas++; return snap(ruta); },
      set: async (data, o) => { sinIndefinidos(data); cuenta.escrituras++; docs.set(ruta, o?.merge ? { ...docs.get(ruta), ...clon(data) } : clon(data)); },
      create: async (data) => { sinIndefinidos(data); if (docs.has(ruta)) throw Object.assign(new Error(`ALREADY_EXISTS ${ruta}`), { code: 6 }); cuenta.escrituras++; docs.set(ruta, clon(data)); },
      update: async (data) => { sinIndefinidos(data); if (!docs.has(ruta)) throw new Error(`NOT_FOUND ${ruta}`); cuenta.escrituras++; docs.set(ruta, { ...docs.get(ruta), ...clon(data) }); },
      delete: async () => { cuenta.escrituras++; docs.delete(ruta); },
      collection: (sub) => colRef(`${ruta}/${sub}`),
    };
  }
  const db = {
    collection: colRef,
    doc: (ruta) => docRef(ruta),
    runTransaction: async (cuerpo) => {
      cuenta.transacciones++;
      const pendientes = [];
      let escribio = false;
      const tx = {
        get: async (x) => {
          if (escribio) throw new Error('una lectura después de una escritura en la misma transacción');
          cuenta.lecturas++;
          return x._consulta ? x.get() : snap(x.path);
        },
        set: (ref, data, o) => { sinIndefinidos(data); escribio = true; pendientes.push(['set', ref.path, data, o]); },
        create: (ref, data) => { sinIndefinidos(data); escribio = true; pendientes.push(['create', ref.path, data]); },
        update: (ref, data) => { sinIndefinidos(data); escribio = true; pendientes.push(['update', ref.path, data]); },
        delete: (ref) => { escribio = true; pendientes.push(['delete', ref.path]); },
      };
      const r = await cuerpo(tx);
      const sim = new Map(docs);
      for (const [op, ruta, data, o] of pendientes) {
        if (op === 'create' && sim.has(ruta)) throw Object.assign(new Error(`ALREADY_EXISTS ${ruta}`), { code: 6 });
        if (op === 'update' && !sim.has(ruta)) throw new Error(`NOT_FOUND ${ruta}`);
        if (op === 'delete') sim.delete(ruta);
        else sim.set(ruta, op === 'update' || o?.merge ? { ...sim.get(ruta), ...clon(data) } : clon(data));
      }
      cuenta.escrituras += pendientes.length;
      docs.clear();
      for (const [k, v] of sim) docs.set(k, v);
      return r;
    },
  };
  const de = (col) => [...docs.keys()].filter((r) => r.startsWith(`${col}/`) && !r.slice(col.length + 1).includes('/'));
  return { db, docs, cuenta, poner: (ruta, data) => docs.set(ruta, clon(data)), de, leer: (ruta) => clon(docs.get(ruta)) };
};

/* ── El mundo de prueba (todo ficticio) ─────────────────────────────────────────────────────────────────────── */
const T0 = 1_760_000_000_000;
const ANA = 'anaAAAA0001', BEA = 'beaBBBB0002', CAI = 'caiCCCC0003', DEV = 'devDDDD0004', EVE = 'eveEEEE0005', ADM = 'admZZZZ0009', ADM2 = 'admYYYY0008';
const ENT = (n) => `ent_${String(n).padStart(26, '0')}`;
const E_ANA = ENT(11), E_ANA_WEE = ENT(12), E_BEA = ENT(21), E_BEA_WEE = ENT(22), E_CAI = ENT(31), E_EVE = ENT(51), E_ADM = ENT(91);
/* Identificadores heredados: DATOS de prueba, leídos de la entidad o del perfil. Ninguna lógica los compone. */
const HEREDADO_DE_BEA = `hidi_${BEA}`, HEREDADO_DE_ANA = `hidi_${ANA}`;
const cuentaDe = (uid, real) => ({ contract: '2.0', accountId: uid, accountNumber: '123456789', status: 'ACTIVE', foundingPrincipalId: uid, realProfileEntityId: real, nextPageSequence: 3, createdAt: T0, updatedAt: T0 });
const entidad = (entityId, owner, tipo, seq, perfilUid) => ({ contract: '2.0', entityId, ownerAccountId: owner, entityType: tipo, entitySequence: seq, profileRef: { coleccion: 'users', uid: perfilUid }, status: 'ACTIVE', createdAt: T0, updatedAt: T0 });
const POST_BEA = { userId: BEA, content: 'texto de Bea', imageUrls: [], visibility: 'public', createdAt: T0 };

const mundo = () => {
  const f = crearDb();
  for (const [uid, real] of [[ANA, E_ANA], [BEA, E_BEA], [CAI, E_CAI], [EVE, E_EVE], [ADM, E_ADM]]) f.poner(`accounts/${uid}`, cuentaDe(uid, real));
  f.poner(`entities/${E_ANA}`, entidad(E_ANA, ANA, 'REAL_PROFILE', 1, ANA));
  f.poner(`entities/${E_ANA_WEE}`, entidad(E_ANA_WEE, ANA, 'WEE_PROFILE', 2, HEREDADO_DE_ANA));
  f.poner(`entities/${E_BEA}`, entidad(E_BEA, BEA, 'REAL_PROFILE', 1, BEA));
  f.poner(`entities/${E_BEA_WEE}`, entidad(E_BEA_WEE, BEA, 'WEE_PROFILE', 2, HEREDADO_DE_BEA));
  f.poner(`entities/${E_CAI}`, entidad(E_CAI, CAI, 'REAL_PROFILE', 1, CAI));
  f.poner(`entities/${E_EVE}`, entidad(E_EVE, EVE, 'REAL_PROFILE', 1, EVE));
  f.poner(`entities/${E_ADM}`, entidad(E_ADM, ADM, 'REAL_PROFILE', 1, ADM));
  /* Una persona cuya cuenta todavía no nació: sin entidad, con su perfil guardado (el vínculo se LEE de ahí). */
  f.poner('users/perfilDeDev', { uid: DEV, profileType: 'real' });
  f.poner('posts/postBea', POST_BEA);
  f.poner('posts/weelBeaWee', { userId: HEREDADO_DE_BEA, content: '', videoUrl: 'https://ejemplo.invalido/v.mp4', isWeel: true, createdAt: T0 });
  f.poner('posts/postDev', { userId: DEV, content: 'histórico', createdAt: T0 });
  f.poner('posts/postFantasma', { userId: 'perfilSinNada9', content: 'nadie sabe de quién', createdAt: T0 });
  f.poner('posts/postAdm', { userId: ADM, content: 'del administrador', createdAt: T0 });
  f.poner('posts/postBea2', { userId: BEA, content: 'otra de Bea', createdAt: T0 });
  f.poner('posts/postBea3', { userId: BEA, content: 'y otra', createdAt: T0 });
  f.poner('comments/comBea', { userId: BEA, postId: 'postAdm', content: 'comentario', createdAt: T0 });
  f.poner('communities/comuBea', { name: 'Comunidad de Bea', slug: 'comunidad-bea', status: 'active', isOfficial: false, governance: 'identity', memberCount: 1, postCount: 0 });
  f.poner('communities/comuBea/private/ownership', { ownerAccountId: BEA, ownerIdentity: BEA, creatorAccountId: BEA, creatorIdentity: BEA });
  f.poner('communities/comuApagada', { name: 'Apagada', slug: 'apagada', status: 'rejected' });
  f.poner('pages/paginaBea', { name: 'Marca de Bea', handle: 'marcabea', type: 'brand', status: 'published', ownerAccountId: BEA });
  f.poner('pages/borradorBea', { name: 'Borrador', handle: 'borrador', type: 'brand', status: 'draft', ownerAccountId: BEA });
  return f;
};

let reloj = T0;
const sesion = (uid, claims = { admin: true }, proveedor = 'password') => ({ uid, token: { ...claims, firebase: { sign_in_provider: proveedor }, auth_time: Math.floor(T0 / 1000) } });
const usuario = (uid) => sesion(uid, {});
const holgada = { ...M.POLITICA_DE_REPORTES, maximoPorVentana: 10_000, maximoPorDia: 10_000 };
const denunciador = (f) => comp.crearModeracion({ db: f.db, now: () => reloj, resolutores: comp.RESOLUTORES_DEL_NUCLEO, politica: holgada });
const nucleo = (f, extra = {}) => N.crearNucleoDeModeracion({ db: f.db, now: () => reloj, sesionVigente: async (a) => a, ...extra });
const idRep = (cuenta, tipo, objetivo, motivo) => M.idDeReporte(comp.huellaDelSistema, { reporterAccountId: cuenta, targetType: tipo, targetId: objetivo, reason: motivo });
const idCaso = (tipo, objetivo) => C.idDeCaso(comp.huellaDelSistema, C.claveDeObjetivo(tipo, objetivo));
/** Denunciar y dar caso, como harían reportContent y su disparador. */
const denunciaYCaso = async (f, cuenta, peticion) => {
  const r = await denunciador(f).reportar(cuenta, peticion);
  const id = idRep(cuenta, peticion.targetType, peticion.targetId, peticion.reason);
  const intake = await nucleo(f).adjuntarReporte(id);
  return { r, id, intake };
};
let peticionN = 0;
const pet = (extra = {}) => ({ requestId: `req-${String(++peticionN).padStart(6, '0')}`, justification: 'Revisado según las normas', ...extra });
const auditoria = (f) => f.de('moderationAudit').map((k) => f.leer(k));

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · El contrato, ejecutado ──');
{
  /* La lista del dueño, en su orden, con autolesiones como opción propia antes de «otro» (decisiones del 2026-11-07). */
  const DUENO = ['HARASSMENT', 'SEXUAL_CONTENT', 'VIOLENCE', 'HATE', 'SCAM', 'SPAM', 'IMPERSONATION', 'ILLEGAL_CONTENT', 'INTELLECTUAL_PROPERTY', 'SELF_HARM', 'OTHER'];
  check('1) UN catálogo: los motivos que se ofrecen son la lista del dueño, en su orden, con autolesiones como opción propia', igual([...M.MOTIVOS_DE_REPORTE], DUENO));
  check('2) autolesiones se OFRECE de nuevo como SEÑAL DE RIESGO (no como infracción), y lo antiguo que la envía sigue valiendo',
    M.esMotivoOfrecido('SELF_HARM') && M.esMotivoDeRiesgo('SELF_HARM') && igual([...M.MOTIVOS_DE_RIESGO], ['SELF_HARM']) && M.MOTIVOS_HEREDADOS.length === 0
    && M.GRAVEDAD_POR_MOTIVO.SELF_HARM === 'CRITICAL' && DUENO.filter((m) => m !== 'SELF_HARM').every((m) => !M.esMotivoDeRiesgo(m))
    && M.validarPeticionDeReporte({ targetType: 'POST', targetId: 'p1', reason: 'SELF_HARM' }).ok && M.validarPeticionDeReporte({ targetType: 'POST', targetId: 'p1', reason: 'INTELLECTUAL_PROPERTY' }).ok);
  check('3) toda gravedad está definida para todo motivo admitido, y solo hay cuatro', M.MOTIVOS_ADMITIDOS.every((m) => M.GRAVEDADES.includes(M.GRAVEDAD_POR_MOTIVO[m])) && M.GRAVEDADES.length === 4);
  const ts = require('typescript');
  const js = ts.transpileModule(leer('services/moderationService.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} };
  new Function('exports', 'require', 'module', js)(mod.exports, () => new Proxy({}, { get: () => () => ({}) }), mod);
  check('4) la hoja de denunciar pinta EXACTAMENTE el catálogo del servidor, con la CLAVE de cada texto',
    igual(mod.exports.MOTIVOS_DE_REPORTE.map((x) => x.motivo), DUENO) && mod.exports.MOTIVOS_DE_REPORTE.every((x) => /^moderation\.reason[A-Z]\w+$/.test(x.clave))
    && mod.exports.MOTIVOS_DE_REPORTE.find((x) => x.motivo === 'INTELLECTUAL_PROPERTY').clave === 'moderation.reasonIntellectualProperty'
    && mod.exports.MOTIVOS_DE_REPORTE.find((x) => x.motivo === 'SELF_HARM').clave === 'moderation.reasonSelfHarm');

  check('5) los ocho estados del encargo, y ni uno más', igual([...C.ESTADOS_DE_CASO], ['PENDING', 'PRIORITY_REVIEW', 'UNDER_REVIEW', 'ACTION_REQUIRED', 'ACTION_TAKEN', 'REJECTED', 'RESTORED', 'CLOSED']));
  const permitida = C.transicionDeCasoPermitida;
  check('6) nada salta de la cola a un final: alguien tiene que haberlo cogido antes',
    ['PENDING', 'PRIORITY_REVIEW'].every((d) => ['ACTION_REQUIRED', 'ACTION_TAKEN', 'REJECTED', 'RESTORED', 'CLOSED'].every((h) => ['ADMIN', 'SYSTEM', 'APPEAL'].every((q) => !permitida(d, h, q)))));
  check('7) el sistema solo puede subir a prioritaria y reabrir; nada más',
    permitida('PENDING', 'PRIORITY_REVIEW', 'SYSTEM') && ['REJECTED', 'RESTORED', 'CLOSED'].every((d) => permitida(d, 'PENDING', 'SYSTEM'))
    && !permitida('PENDING', 'UNDER_REVIEW', 'SYSTEM') && !permitida('UNDER_REVIEW', 'ACTION_TAKEN', 'SYSTEM') && !permitida('UNDER_REVIEW', 'REJECTED', 'SYSTEM'));
  check('8) una persona no sube la prioridad a mano, pero sí coge, decide, resuelve y reabre', !permitida('PENDING', 'PRIORITY_REVIEW', 'ADMIN')
    && permitida('PENDING', 'UNDER_REVIEW', 'ADMIN') && permitida('UNDER_REVIEW', 'ACTION_TAKEN', 'ADMIN') && permitida('ACTION_TAKEN', 'CLOSED', 'ADMIN') && permitida('CLOSED', 'PENDING', 'ADMIN'));
  check('9) una apelación solo puede dejar el caso RESTORED', ESTADOS_TODOS().every(([d, h]) => !permitida(d, h, 'APPEAL') || h === 'RESTORED') && permitida('ACTION_TAKEN', 'RESTORED', 'APPEAL') && permitida('CLOSED', 'RESTORED', 'APPEAL'));

  const pun = C.puntuacionDePrioridad;
  check('10) la gravedad manda y los denunciantes desempatan: un CRÍTICO con uno va antes que un LEVE con quinientos',
    pun('CRITICAL', 1) > pun('LOW', 500) && pun('HIGH', 3) > pun('HIGH', 2) && pun('MEDIUM', 5000) === pun('MEDIUM', 999));
  const claves = [C.claveDeCola('PENDING', pun('LOW', 1), T0), C.claveDeCola('PENDING', pun('HIGH', 1), T0 + 5), C.claveDeCola('PENDING', pun('HIGH', 1), T0 + 1), C.claveDeCola('PENDING', pun('CRITICAL', 1), T0 + 9)];
  check('11) la clave de la cola ordena sola: primero lo más prioritario y, a igual prioridad, lo más antiguo',
    igual([...claves].sort(), [claves[3], claves[2], claves[1], claves[0]]) && claves.every((k) => k >= C.rangoDeCola('PENDING').desde && k < C.rangoDeCola('PENDING').hasta)
    && C.claveDeCola('PRIORITY_REVIEW', 1, T0) >= C.rangoDeCola('PRIORITY_REVIEW').desde && !(C.claveDeCola('PRIORITY_REVIEW', 1, T0) < C.rangoDeCola('PENDING').hasta && C.claveDeCola('PRIORITY_REVIEW', 1, T0) >= C.rangoDeCola('PENDING').desde));
  const pol = C.POLITICA_DE_PRIORIDAD;
  check('12) por defecto, solo lo CRÍTICO pide prioritaria, y NO hay umbral de denunciantes: ese número lo decide el dueño',
    pol.umbralDeDenunciantes === null && igual([...pol.gravedadesPrioritarias], ['CRITICAL']) && C.pidePrioridad('CRITICAL', 1, pol) && !C.pidePrioridad('HIGH', 100000, pol));
  const leida = C.leerPoliticaDePrioridad({ gravedadPorMotivo: { SPAM: 'HIGH', OTHER: 'MUY_ALTA' }, gravedadesPrioritarias: ['CRITICAL', 'HIGH'], umbralDeDenunciantes: 25, version: 3 });
  check('13) la política se puede cambiar sin tocar código, campo a campo, y lo que no se entiende se queda por defecto',
    leida.gravedadPorMotivo.SPAM === 'HIGH' && leida.gravedadPorMotivo.OTHER === 'LOW' && leida.umbralDeDenunciantes === 25 && leida.version === 3
    && C.leerPoliticaDePrioridad('basura') === C.POLITICA_DE_PRIORIDAD && C.leerPoliticaDePrioridad({ umbralDeDenunciantes: -4 }).umbralDeDenunciantes === null);

  const op0 = A.POLITICA_DE_OCULTACION_PREVENTIVA;
  check('14) la ocultación preventiva está DESACTIVADA y SIN umbrales', op0.habilitada === false && op0.minimoDeDenunciantes === null && op0.gravedades === null);
  const media = A.leerPoliticaDeOcultacion({ habilitada: true, minimoDeDenunciantes: 3 });
  const completa = A.leerPoliticaDeOcultacion({ habilitada: true, minimoDeDenunciantes: 3, gravedades: ['CRITICAL'], version: 2 });
  check('15) marcarla habilitada sin los DOS umbrales la deja apagada, y lo dice; con los dos, se enciende',
    media.habilitada === false && media.incompleta === true && completa.habilitada === true && A.leerPoliticaDeOcultacion({ habilitada: 'sí', minimoDeDenunciantes: 3, gravedades: ['CRITICAL'] }).habilitada === false);
  check('16) retirar es reversible y no hay plazo de purga: borrar exige una política de retención que el dueño no ha aprobado',
    A.POLITICA_DE_RETIRADA.reversible === true && A.POLITICA_DE_RETIRADA.purgaTrasDias === null && A.leerPoliticaDeRetirada({ reversible: 'no', purgaTrasDias: 30 }).reversible === true
    && A.leerPoliticaDeRetirada({ purgaTrasDias: 30 }).purgaTrasDias === null && A.leerPoliticaDeRetirada({ reversible: false }).reversible === false);
  check('17) el abuso de reportes se MIDE siempre y solo se SEÑALA con los dos números del dueño',
    A.senalesDeAbuso({ reportsFiled: 40, upheld: 1, rejected: 30 }, A.POLITICA_DE_ABUSO).flagged === null
    && A.senalesDeAbuso({ reportsFiled: 40, upheld: 1, rejected: 30 }, A.leerPoliticaDeAbuso({ minimoDeReportes: 10, ratioDeRechazo: 0.8 })).flagged === true
    && Math.abs(A.senalesDeAbuso({ reportsFiled: 4, upheld: 1, rejected: 3 }, A.POLITICA_DE_ABUSO).rejectionRatio - 0.75) < 1e-9);

  const ok = (op, d) => A.validarPeticionDeOperacion(op, d);
  const base = { requestId: 'req-00000001', caseId: `cas_${'a'.repeat(32)}`, justification: 'Contenido de odio explícito' };
  check('18) cada acción admite SOLO sus campos: la cuenta, el estado, la prioridad o el actor no entran por la petición',
    ok('HIDE_CONTENT', base).ok && ['accountId', 'status', 'priority', 'subjectAccountId', 'actor', 'uid', 'operation', 'data', 'path'].every((k) => ok('HIDE_CONTENT', { ...base, [k]: 'x' }).code === 'unknown_field')
    && ok('HIDE_CONTENT', { ...base, durationHours: 2 }).code === 'unknown_field');
  check('19) sin `requestId` válido, sin justificación o sin caso, no hay acción',
    ok('BLOCK_ACCOUNT', { ...base, requestId: 'corto' }).code === 'invalid_request_id' && ok('BLOCK_ACCOUNT', { ...base, justification: '  a ' }).code === 'invalid_justification'
    && ok('BLOCK_ACCOUNT', { ...base, justification: 'x'.repeat(1001) }).code === 'invalid_justification' && ok('BLOCK_ACCOUNT', { ...base, caseId: 'cas_x' }).code === 'invalid_case'
    && ok('WARN_ACCOUNT', { requestId: base.requestId, justification: base.justification }).code === 'invalid_case');
  const NUL = String.fromCharCode(0);
  check('20) la justificación se limpia de caracteres de control', ok('WARN_ACCOUNT', { ...base, justification: `  aviso${NUL} claro  ` }).peticion?.justification === 'aviso claro');
  check('21) suspender exige una duración entre una hora y un año; más es un bloqueo',
    ok('SUSPEND_ACCOUNT', { ...base, durationHours: 24 }).ok && [0, -1, 1.5, 8761, '24', null].every((h) => ok('SUSPEND_ACCOUNT', { ...base, durationHours: h }).code === 'invalid_duration'));
  check('22) abrir un caso pide UNA cosa: un objetivo o un reporte anterior, no las dos ni ninguna',
    ok('OPEN_CASE', { requestId: base.requestId, justification: base.justification, targetType: 'POST', targetId: 'p1' }).ok
    && ok('OPEN_CASE', { requestId: base.requestId, justification: base.justification, fromReportId: `rep_${'b'.repeat(32)}` }).ok
    && ok('OPEN_CASE', { requestId: base.requestId, justification: base.justification }).code === 'target_required'
    && ok('OPEN_CASE', { requestId: base.requestId, justification: base.justification, targetType: 'POST', targetId: 'p1', fromReportId: `rep_${'b'.repeat(32)}` }).code === 'target_required'
    && ok('OPEN_CASE', { requestId: base.requestId, justification: base.justification, targetType: 'PAGE', targetId: 'p1' }).code === 'invalid_target_type');
  check('23) proponer una acción solo vale con una acción que actúe; decidir una apelación, solo UPHELD o DENIED',
    ok('REQUIRE_ACTION', { ...base, proposedAction: 'SUSPEND_ACCOUNT' }).ok && ok('REQUIRE_ACTION', { ...base, proposedAction: 'RESOLVE_CASE' }).code === 'invalid_proposed_action'
    && ok('DECIDE_APPEAL', { requestId: base.requestId, justification: base.justification, appealId: `apl_${'c'.repeat(32)}`, outcome: 'MAYBE' }).code === 'invalid_outcome');
  check('24) prototipos envenenados y peticiones gordas no pasan',
    ok('TAKE_CASE', Object.create(base)).code === 'malformed' && ok('TAKE_CASE', JSON.parse(`{"requestId":"req-00000001","caseId":"${base.caseId}","justification":"bien","__proto__":{"x":1}}`)).code === 'unknown_field'
    && ok('TAKE_CASE', { ...base, justification: 'x'.repeat(5000) }).code === 'too_large' && ok('NO_EXISTE', base).code === 'malformed');

  const h = comp.huellaDelSistema;
  const a1 = A.idDeAccion(h, { kind: 'ADMIN', id: ADM }, 'HIDE_CONTENT', 'req-00000001');
  check('25) el identificador de una acción es su idempotencia: misma persona, misma operación, mismo requestId → mismo id',
    a1 === A.idDeAccion(h, { kind: 'ADMIN', id: ADM }, 'HIDE_CONTENT', 'req-00000001') && A.FORMA_DE_ID_DE_ACCION.test(a1)
    && new Set([a1, A.idDeAccion(h, { kind: 'ADMIN', id: ADM2 }, 'HIDE_CONTENT', 'req-00000001'), A.idDeAccion(h, { kind: 'ADMIN', id: ADM }, 'REMOVE_CONTENT', 'req-00000001'), A.idDeAccion(h, { kind: 'ADMIN', id: ADM }, 'HIDE_CONTENT', 'req-00000002')]).size === 4);
  check('26) un caso por contenido: la misma clave da el mismo caso, y no lleva nada legible dentro',
    idCaso('POST', 'postBea') === idCaso('POST', 'postBea') && idCaso('POST', 'postBea') !== idCaso('COMMENT', 'postBea') && C.FORMA_DE_ID_DE_CASO.test(idCaso('POST', 'postBea')) && !idCaso('POST', 'postBea').includes('postBea')
    && C.idDeCaso(h, undefined) === undefined && C.claveDeObjetivo('POST', 'a/b') === undefined);
  check('27) una sanción y una apelación por acción; un seudónimo estable por cuenta, que no la contiene',
    A.idDeSancion(h, a1) === A.idDeSancion(h, a1) && A.idDeApelacion(h, a1) !== A.idDeSancion(h, a1).replace('msn_', 'apl_') && C.seudonimoDeCuenta(h, ANA) === C.seudonimoDeCuenta(h, ANA)
    && !C.seudonimoDeCuenta(h, ANA).includes(ANA) && C.seudonimoDeCuenta(h, ANA) !== C.seudonimoDeCuenta(h, BEA));

  const cu = (estado, op, fuente, rev = true) => A.decidirCustodia(estado ? { state: estado } : undefined, op, { custodiable: true, fuenteExiste: fuente, retiradaReversible: rev });
  check('28) la custodia: ocultar saca, retirar saca o endurece, restaurar devuelve; nada se destruye',
    cu(null, 'HIDE_CONTENT', true).mover === 'SACAR_A_CUSTODIA' && cu(null, 'REMOVE_CONTENT', true).mover === 'SACAR_A_CUSTODIA' && cu('HIDDEN', 'REMOVE_CONTENT', false).mover === 'NINGUNO'
    && cu('HIDDEN', 'RESTORE_CONTENT', false).mover === 'DEVOLVER_A_SU_SITIO' && cu('REMOVED', 'RESTORE_CONTENT', false).ok && cu('RESTORED', 'HIDE_CONTENT', true).ok);
  check('29) y lo que no cabe: ocultar dos veces, ocultar lo que no está, restaurar lo visible, pisar el sitio ocupado, o deshacer lo irreversible',
    cu('HIDDEN', 'HIDE_CONTENT', false).code === 'content_already_hidden' && cu(null, 'HIDE_CONTENT', false).code === 'content_gone' && cu(null, 'RESTORE_CONTENT', true).code === 'content_not_hidden'
    && cu('HIDDEN', 'RESTORE_CONTENT', true).code === 'restore_conflict' && cu('REMOVED', 'RESTORE_CONTENT', false, false).code === 'restore_not_allowed' && cu('REMOVED', 'REMOVE_CONTENT', false).code === 'content_already_removed'
    && A.decidirCustodia(undefined, 'HIDE_CONTENT', { custodiable: false, fuenteExiste: true, retiradaReversible: true }).code === 'content_not_custodiable');

  const act = `mac_${'1'.repeat(32)}`, caso = `cas_${'2'.repeat(32)}`;
  const susp = A.nuevaSancion({ sanctionId: `msn_${'3'.repeat(32)}`, accountId: BEA, type: 'SUSPENSION', caseId: caso, actionId: act, issuedBy: ADM, justification: 'j', at: T0, durationHours: 48 });
  const bloq = A.nuevaSancion({ sanctionId: `msn_${'4'.repeat(32)}`, accountId: BEA, type: 'BLOCK', caseId: caso, actionId: act, issuedBy: ADM, justification: 'j', at: T0 });
  const adv = A.nuevaSancion({ sanctionId: `msn_${'5'.repeat(32)}`, accountId: BEA, type: 'WARNING', caseId: caso, actionId: act, issuedBy: ADM, justification: 'j', at: T0 });
  check('30) una suspensión termina sola a su hora; un bloqueo dura hasta que alguien lo levanta',
    susp.endsAt === T0 + 48 * 3_600_000 && A.sancionEnVigor(susp, T0 + 1) && !A.sancionEnVigor(susp, T0 + 48 * 3_600_000) && bloq.endsAt === null && A.sancionEnVigor(bloq, T0 + 10 ** 12));
  check('31) la restricción: el bloqueo manda, una advertencia no restringe, y lo vencido no cuenta aunque nadie lo haya barrido',
    A.restriccionDeCuenta([susp, bloq, adv], T0).level === 'BLOCKED' && A.restriccionDeCuenta([susp, adv], T0).level === 'SUSPENDED' && A.restriccionDeCuenta([susp, adv], T0).until === susp.endsAt
    && A.restriccionDeCuenta([adv], T0).level === 'NONE' && A.restriccionDeCuenta([susp], T0 + 49 * 3_600_000).level === 'NONE');
  const lev = A.levantarSancion(susp, { caseId: caso, actionId: `mac_${'6'.repeat(32)}`, by: ADM2, justification: 'error', at: T0 + 5 });
  check('32) levantar: solo lo que está en vigor y de SU caso; la sanción guarda quién, cuándo y por qué',
    lev.ok && lev.sancion.status === 'LIFTED' && lev.sancion.liftedBy === ADM2 && lev.sancion.vencimiento === null && susp.status === 'ACTIVE'
    && A.levantarSancion(lev.sancion, { caseId: caso, actionId: act, by: ADM, justification: 'j', at: T0 + 6 }).code === 'sanction_not_active'
    && A.levantarSancion(susp, { caseId: `cas_${'9'.repeat(32)}`, actionId: act, by: ADM, justification: 'j', at: T0 }).code === 'sanction_not_of_case'
    && A.vencerSancion(susp, T0 + 48 * 3_600_000)?.status === 'EXPIRED' && A.vencerSancion(bloq, T0 + 10 ** 12) === undefined);

  const rep = (cuenta, motivo, extra = {}) => ({ contract: '1.0', reportId: idRep(cuenta, 'POST', 'postBea', motivo), reporterAccountId: cuenta, targetType: 'POST', targetId: 'postBea', reason: motivo, status: 'RECEIVED', historyCount: 1, createdAt: T0, updatedAt: T0, evaluation: { outcome: 'REVIEW', by: { kind: 'EVALUATOR', id: 'wee.rules.v1' }, at: T0 }, ...extra });
  const obj = { type: 'POST', id: 'postBea', kind: 'POST', modality: 'TEXT', path: 'posts/postBea' };
  const suj = { accountId: BEA, entityId: E_BEA, entityType: 'REAL_PROFILE', profileUid: BEA };
  const cid = idCaso('POST', 'postBea');
  const i1 = C.decidirIntake({ caseId: cid, reporte: rep(ANA, 'SPAM'), objetivo: obj, sujeto: suj, accionesPrevias: 2, politica: pol, at: T0 });
  check('33) la primera señal abre el caso en la cola, con su historial, su reincidencia y SIN decisión',
    i1.ok && i1.abierto && i1.caso.status === 'PENDING' && i1.caso.counters.reporters === 1 && i1.caso.recidivism.priorActions === 2 && i1.entradas[0].type === 'CASE_OPENED' && !('decision' in i1.caso) && i1.caso.effects.content === null);
  const i2 = C.decidirIntake({ caseId: cid, caso: i1.caso, reporte: rep(ANA, 'HATE'), objetivo: obj, sujeto: suj, marca: i1.marca, accionesPrevias: 0, politica: pol, at: T0 + 1 });
  check('34) la misma cuenta por otro motivo es otra señal, pero NO otro denunciante: una persona cuenta una vez',
    i2.ok && !i2.nuevoDenunciante && i2.caso.counters.reports === 2 && i2.caso.counters.reporters === 1 && i2.caso.priority.gravity === 'HIGH' && igual(i2.marca.reasons, ['SPAM', 'HATE']));
  const i3 = C.decidirIntake({ caseId: cid, caso: i2.caso, reporte: rep(CAI, 'SPAM'), objetivo: obj, sujeto: suj, accionesPrevias: 0, politica: pol, at: T0 + 2 });
  check('35) otra cuenta sí sube la prioridad —sin cambiar el estado ni decidir nada—', i3.ok && i3.nuevoDenunciante && i3.caso.counters.reporters === 2 && i3.caso.priority.score > i2.caso.priority.score && i3.caso.status === 'PENDING');
  const i4 = C.decidirIntake({ caseId: cid, caso: i3.caso, reporte: rep(EVE, 'ILLEGAL_CONTENT'), objetivo: obj, sujeto: suj, accionesPrevias: 0, politica: pol, at: T0 + 3 });
  check('36) una señal CRÍTICA sube el caso a revisión prioritaria, y queda escrito', i4.ok && i4.caso.status === 'PRIORITY_REVIEW' && i4.entradas.some((e) => e.type === 'PRIORITY_RAISED'));
  const conUmbral = { ...pol, umbralDeDenunciantes: 2 };
  check('37) con el umbral que fije el dueño, los repetidos también suben de estado', C.decidirIntake({ caseId: cid, caso: i2.caso, reporte: rep(CAI, 'SPAM'), objetivo: obj, sujeto: suj, accionesPrevias: 0, politica: conUmbral, at: T0 + 2 }).caso.status === 'PRIORITY_REVIEW');
  const cerrado = { ...i3.caso, status: 'REJECTED', decision: 'REJECTED', decidedAt: T0 + 5, assignee: { uid: ADM, at: T0 } };
  const re = C.decidirIntake({ caseId: cid, caso: cerrado, reporte: rep(EVE, 'SPAM'), objetivo: obj, sujeto: suj, accionesPrevias: 0, politica: pol, at: T0 + 9 });
  check('38) algo nuevo sobre un caso rechazado lo REABRE: lo nuevo no hereda la decisión', re.ok && re.reabierto && re.caso.status === 'PENDING' && !('decision' in re.caso) && !('assignee' in re.caso) && re.entradas[0].type === 'CASE_REOPENED');
  const enAccion = { ...i3.caso, status: 'ACTION_TAKEN' };
  check('39) sobre un caso con acción, la señal suma y espera; no lo mueve', C.decidirIntake({ caseId: cid, caso: enAccion, reporte: rep(EVE, 'SPAM'), objetivo: obj, sujeto: suj, accionesPrevias: 0, politica: pol, at: T0 }).caso.status === 'ACTION_TAKEN');
  check('40) un reporte ya adjuntado, o de otro contenido, no entra',
    C.decidirIntake({ caseId: cid, reporte: rep(ANA, 'SPAM', { caseId: cid }), objetivo: obj, sujeto: suj, accionesPrevias: 0, politica: pol, at: T0 }).code === 'already_attached'
    && C.decidirIntake({ caseId: cid, reporte: rep(ANA, 'SPAM'), objetivo: { ...obj, id: 'otro' }, sujeto: suj, accionesPrevias: 0, politica: pol, at: T0 }).code === 'invalid_target'
    && C.decidirIntake({ caseId: cid, caso: i1.caso, reporte: rep(ANA, 'SPAM'), objetivo: obj, sujeto: suj, marca: i1.marca, accionesPrevias: 0, politica: pol, at: T0 }).code === 'already_attached');

  const m1 = C.moverCaso(i1.caso, { hacia: 'UNDER_REVIEW', quien: 'ADMIN', por: { kind: 'ADMIN', id: ADM }, at: T0 + 7, justificacion: 'lo cojo', cambios: { assignee: { uid: ADM, at: T0 + 7 } } });
  check('41) mover el caso: valida, recalcula la cola, deja su entrada con el siguiente número y no toca el original',
    m1.ok && m1.caso.status === 'UNDER_REVIEW' && m1.caso.cola.startsWith('UNDER_REVIEW|') && m1.entrada.seq === 2 && m1.entrada.from === 'PENDING' && i1.caso.status === 'PENDING'
    && C.moverCaso(i1.caso, { hacia: 'CLOSED', quien: 'ADMIN', por: { kind: 'ADMIN', id: ADM }, at: T0 }).code === 'invalid_transition' && C.moverCaso(undefined, { hacia: 'CLOSED', quien: 'ADMIN', por: { kind: 'ADMIN', id: ADM }, at: T0 }).code === 'invalid_case');

  const accion = { actionId: act, operation: 'HIDE_CONTENT', family: 'CONTENT', caseId: caso, subjectAccountId: BEA, actor: { kind: 'ADMIN', id: ADM }, at: T0, result: {}, appealable: true, vaultId: `vlt_${'7'.repeat(32)}`, contentKind: 'POST', justification: 'j' };
  const apId = A.idDeApelacion(h, act);
  check('42) apelar: solo la cuenta AFECTADA, solo lo apelable, y no lo ya deshecho',
    P.nuevaApelacion({ appealId: apId, accion, principalId: BEA, reason: 'No era odio', yaDeshecha: false, at: T0 }).ok
    && P.nuevaApelacion({ appealId: apId, accion, principalId: ANA, reason: 'No era odio', yaDeshecha: false, at: T0 }).code === 'not_affected'
    && P.nuevaApelacion({ appealId: apId, accion: { ...accion, operation: 'TAKE_CASE', appealable: false }, principalId: BEA, reason: 'x y z', yaDeshecha: false, at: T0 }).code === 'action_not_appealable'
    && P.nuevaApelacion({ appealId: apId, accion, principalId: BEA, reason: 'No era odio', yaDeshecha: true, at: T0 }).code === 'action_not_appealable');
  const ap = P.nuevaApelacion({ appealId: apId, accion, principalId: BEA, reason: 'No era odio', yaDeshecha: false, at: T0 }).apelacion;
  check('43) la apelación guarda la decisión ORIGINAL tal como era, y nace SUBMITTED', ap.status === 'SUBMITTED' && ap.original.operation === 'HIDE_CONTENT' && ap.original.actorId === ADM && ap.original.vaultId === accion.vaultId && ap.accountId === BEA);
  const tomada = P.tomarApelacion(ap, { uid: ADM, at: T0 + 1, politica: A.POLITICA_DE_APELACIONES, justificacion: 'reviso' });
  check('44) quien decidió lo apelado PUEDE revisarla por defecto (con un solo administrador no habría otra), y queda anotado; con revisión independiente, no',
    tomada.ok && tomada.apelacion.review.sameReviewer === true && P.tomarApelacion(ap, { uid: ADM, at: T0, politica: { version: 1, revisionIndependiente: true }, justificacion: 'x' }).code === 'same_reviewer'
    && P.tomarApelacion(ap, { uid: BEA, at: T0, politica: A.POLITICA_DE_APELACIONES, justificacion: 'x' }).code === 'not_affected');
  check('45) la resuelve quien la cogió, una vez: UPHELD y DENIED son finales',
    P.decidirApelacion(tomada.apelacion, { uid: ADM2, at: T0 + 2, outcome: 'UPHELD', justificacion: 'x' }).code === 'invalid_reviewer'
    && P.decidirApelacion(tomada.apelacion, { uid: ADM, at: T0 + 2, outcome: 'UPHELD', justificacion: 'x', reversalActionId: act }).apelacion.status === 'UPHELD'
    && P.decidirApelacion(P.decidirApelacion(tomada.apelacion, { uid: ADM, at: T0 + 2, outcome: 'DENIED', justificacion: 'x' }).apelacion, { uid: ADM, at: T0 + 3, outcome: 'UPHELD', justificacion: 'x' }).code === 'invalid_transition');
  check('46) apelar admite tres campos: ni la cuenta, ni el estado', P.validarPeticionDeApelacion({ actionId: act, reason: 'explicación' }).ok
    && ['accountId', 'status', 'appealId', 'uid'].every((k) => P.validarPeticionDeApelacion({ actionId: act, reason: 'explicación', [k]: 'x' }).code === 'unknown_field')
    && P.validarPeticionDeApelacion({ actionId: 'mac_x', reason: 'explicación' }).code === 'invalid_action' && P.validarPeticionDeApelacion({ actionId: act, reason: 'x'.repeat(1001) }).code === 'invalid_reason');

  check('47) nadie modera lo suyo: ni lo que publicó con cualquiera de sus caras, ni lo que denunció',
    A.conflictoDeInteres(BEA, { subject: { accountId: BEA } }, false) === 'SUBJECT' && A.conflictoDeInteres(ANA, { subject: { accountId: BEA } }, true) === 'REPORTER' && A.conflictoDeInteres(ADM, { subject: { accountId: BEA } }, false) === null);

  const vista = C.vistaDeCasoParaConsola(i1.caso, { revelarIdentidad: false });
  const vistaR = C.vistaDeCasoParaConsola(i1.caso, { revelarIdentidad: true });
  check('48) la Consola ve la CARA denunciada, no la cuenta que hay detrás (el vínculo Real–Weë), salvo revelándolo',
    !JSON.stringify(vista).includes(BEA) && vista.subject.entityId === E_BEA && vista.subject.known === true && !('path' in vista.target) && vistaR.subject.accountId === BEA);
  const senal = C.vistaDeSenalParaConsola(i1.senal, h, { revelarIdentidad: false });
  check('49) quien denunció es un seudónimo para quien revisa', !JSON.stringify(senal).includes(ANA) && /^per_[0-9a-f]{16}$/.test(senal.reporterRef) && C.vistaDeSenalParaConsola(i1.senal, h, { revelarIdentidad: true }).reporterAccountId === ANA);
  const paraElAfectado = JSON.stringify([A.vistaDeSancionParaElAfectado(susp, T0), A.vistaDeAccionParaElAfectado(accion), P.vistaDeApelacionParaElAfectado(tomada.apelacion)]);
  check('50) lo que ve la persona afectada no lleva ni quién la denunció, ni quién la revisó, ni la justificación interna',
    !paraElAfectado.includes(ANA) && !paraElAfectado.includes(ADM) && !/justification|issuedBy|actor|reviewer|review"/.test(paraElAfectado));
  const ESC = String.fromCharCode(27);
  const au = A.entradaDeAuditoria({ at: T0, actor: { kind: 'ADMIN', id: ADM }, operation: `HIDE${ESC}_CONTENT`, result: 'OK', correlationId: 'c1', justification: 'x'.repeat(5000), inventado: 'no' });
  check('51) la auditoría se sanea campo a campo: sin controles, acotada, y solo con sus campos', au.operation === 'HIDE_CONTENT' && au.justification.length === 1000 && !('inventado' in au) && Object.isFrozen(au));
}

function ESTADOS_TODOS() { return C.ESTADOS_DE_CASO.flatMap((d) => C.ESTADOS_DE_CASO.map((h) => [d, h])); }

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · Denunciar, y que cada señal llegue a su caso ──');
{
  reloj = T0;
  const f = mundo();
  const base = comp.crearModeracion({ db: f.db, now: () => reloj, politica: holgada });
  check('52) la fundación sigue igual: sin el Core, una comunidad no se denuncia', (await rechazo(base.reportar(ANA, { targetType: 'COMMUNITY', targetId: 'comuBea', reason: 'HATE' })))?.code === 'target_type_not_enabled');
  const den = denunciador(f);
  const cerradas = [];
  for (const t of ['PUBLICATION', 'ASSET', 'CONTENT', 'MESSAGE']) if ((await rechazo(den.reportar(ANA, { targetType: t, targetId: 'x1', reason: 'SPAM' })))?.code !== 'target_type_not_enabled') cerradas.push(t);
  check('53) con el Core se abren comunidades y Páginas; lo que no tiene nada detrás —ni los mensajes privados— sigue cerrado', cerradas.length === 0, cerradas.join(', '));
  check('54) una comunidad apagada o una Página en borrador no se denuncian: no se ven en Weë',
    (await rechazo(den.reportar(ANA, { targetType: 'COMMUNITY', targetId: 'comuApagada', reason: 'HATE' })))?.code === 'target_not_found'
    && (await rechazo(den.reportar(ANA, { targetType: 'ENTITY', targetId: 'borradorBea', reason: 'SCAM' })))?.code === 'target_not_found'
    && (await rechazo(den.reportar(BEA, { targetType: 'COMMUNITY', targetId: 'comuBea', reason: 'HATE' })))?.code === 'own_content'
    && (await rechazo(den.reportar(BEA, { targetType: 'ENTITY', targetId: 'paginaBea', reason: 'SCAM' })))?.code === 'own_content');

  const { r, id, intake } = await denunciaYCaso(f, ANA, { targetType: 'POST', targetId: 'postBea', reason: 'HARASSMENT', actingEntityId: E_ANA_WEE, details: 'me insulta' });
  const cid = idCaso('POST', 'postBea');
  const caso = f.leer(`moderationCases/${cid}`);
  check('55) lo que contesta denunciar no cambia: cuatro cosas, ni el caso ni de quién era', igual(Object.keys(r).sort(), ['createdAt', 'duplicate', 'received', 'status']));
  check('56) el reporte entra en SU caso (id determinista por contenido), en la cola, con la cara y la cuenta de quien publicó',
    intake.estado === 'adjuntado' && intake.caseId === cid && caso.status === 'PENDING' && caso.subject.accountId === BEA && caso.subject.entityId === E_BEA && caso.target.kind === 'POST' && caso.target.path === 'posts/postBea');
  const repDoc = f.leer(`reports/${id}`);
  const h2 = f.leer(`reports/${id}/history/0002`);
  check('57) el reporte sabe su caso y su prioridad, y lo apunta en SU historial (que solo se añade)', repDoc.caseId === cid && repDoc.priority === 'HIGH' && repDoc.historyCount === 2 && h2.type === 'REPORT_ATTACHED_TO_CASE' && repDoc.status === 'RECEIVED');
  const sen = f.leer(`moderationCases/${cid}/signals/${id}`);
  check('58) el caso conserva cada reporte y su procedencia —la cara desde la que se denunció—, sin copiar el texto del detalle',
    sen.reporterAccountId === ANA && sen.reporterEntityId === E_ANA_WEE && sen.reporterEntityType === 'WEE_PROFILE' && sen.hasDetails === true && !('details' in sen));
  check('59) denunciar NO oculta ni toca nada: la publicación sigue igual', igual(f.leer('posts/postBea'), POST_BEA));
  const otra = await nucleo(f).adjuntarReporte(id);
  check('60) dar caso dos veces al mismo reporte no hace nada', otra.estado === 'ya_adjuntado' && f.de(`moderationCases/${cid}/signals`).length === 1 && f.leer(`moderationCases/${cid}`).counters.reports === 1);

  reloj = T0 + 10;
  await denunciaYCaso(f, ANA, { targetType: 'POST', targetId: 'postBea', reason: 'HATE' });
  await denunciaYCaso(f, CAI, { targetType: 'POST', targetId: 'postBea', reason: 'SPAM' });
  const c2 = f.leer(`moderationCases/${cid}`);
  check('61) tres reportes del mismo contenido: UN caso, tres señales, DOS personas (Ana con sus dos caras cuenta una vez)',
    f.de('moderationCases').length === 1 && f.de(`moderationCases/${cid}/signals`).length === 3 && c2.counters.reports === 3 && c2.counters.reporters === 2 && f.de(`moderationCases/${cid}/reporters`).length === 2);
  check('62) cada denunciante suma en su situación; la persona denunciada, un caso abierto',
    f.leer(`moderationStanding/${ANA}`).reporter.reportsFiled === 2 && f.leer(`moderationStanding/${CAI}`).reporter.reportsFiled === 1 && f.leer(`moderationStanding/${BEA}`).subject.casesOpened === 1);
  await denunciaYCaso(f, EVE, { targetType: 'POST', targetId: 'postBea', reason: 'ILLEGAL_CONTENT' });
  check('63) una señal crítica lo sube a revisión prioritaria', f.leer(`moderationCases/${cid}`).status === 'PRIORITY_REVIEW');

  const w = await denunciaYCaso(f, CAI, { targetType: 'POST', targetId: 'weelBeaWee', reason: 'VIOLENCE' });
  const cw = f.leer(`moderationCases/${w.intake.caseId}`);
  check('64) un Weël es un Weël, y su dueño sale de la entidad del Perfil Weë (la cara), no de un prefijo', cw.target.kind === 'WEEL' && cw.subject.accountId === BEA && cw.subject.entityId === E_BEA_WEE && cw.subject.entityType === 'WEE_PROFILE' && cw.target.modality === 'VIDEO');
  const d = await denunciaYCaso(f, CAI, { targetType: 'POST', targetId: 'postDev', reason: 'SPAM' });
  const cd = f.leer(`moderationCases/${d.intake.caseId}`);
  check('65) lo histórico sin entidad: la cuenta se LEE del perfil guardado (frontera de compatibilidad), no se deduce', cd.subject.accountId === DEV && cd.subject.entityType === 'REAL_PROFILE' && !('entityId' in cd.subject));
  const g = await denunciaYCaso(f, CAI, { targetType: 'POST', targetId: 'postFantasma', reason: 'SPAM' });
  check('66) y si los datos no dan, el dueño queda sin decir: no se inventa', !('accountId' in f.leer(`moderationCases/${g.intake.caseId}`).subject));
  const cm = await denunciaYCaso(f, CAI, { targetType: 'COMMUNITY', targetId: 'comuBea', reason: 'HATE' });
  const pg = await denunciaYCaso(f, CAI, { targetType: 'ENTITY', targetId: 'paginaBea', reason: 'IMPERSONATION' });
  const co = await denunciaYCaso(f, CAI, { targetType: 'COMMENT', targetId: 'comBea', reason: 'HARASSMENT' });
  const pr = await denunciaYCaso(f, CAI, { targetType: 'ENTITY', targetId: E_BEA_WEE, reason: 'IMPERSONATION' });
  const kinds = [cm, pg, co, pr].map((x) => f.leer(`moderationCases/${x.intake.caseId}`));
  check('67) comunidades, Páginas, comentarios y perfiles: cada uno con su clase y su dueño; un perfil no es custodiable',
    igual(kinds.map((k) => k.target.kind), ['COMMUNITY', 'PAGE', 'COMMENT', 'WEE_PROFILE']) && kinds.every((k) => k.subject.accountId === BEA)
    && kinds[0].target.path === 'communities/comuBea' && kinds[1].target.path === 'pages/paginaBea' && !('path' in kinds[3].target));
  check('68) ni una escritura en `notifications`, `posts`, `users` ni Credits por denunciar y dar caso',
    f.de('notifications').length === 0 && igual(f.leer('posts/postBea'), POST_BEA) && f.de('creditTransactions').length === 0 && f.de('users').length === 1);
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · Autorización: en el servidor, y por permiso ──');
{
  reloj = T0;
  const f = mundo();
  const { intake } = await denunciaYCaso(f, ANA, { targetType: 'POST', targetId: 'postBea', reason: 'HATE' });
  const cid = intake.caseId;
  const n = nucleo(f);
  const intento = async (auth, extra = {}, op = 'TAKE_CASE') => rechazo(n.ejecutar(op, auth, pet({ caseId: cid, ...extra })));
  const auditAntes = auditoria(f).length;
  check('69) sin sesión no hay moderación', (await intento(undefined))?.code === 'unauthenticated' && (await intento({}))?.code === 'unauthenticated');
  check('70) una sesión de invitado no administra, aunque traiga el claim', (await intento(sesion(ADM, { admin: true }, 'anonymous')))?.code === 'admin_required');
  check('71) quien no es administración se rechaza sin escribir NADA, ni en la auditoría', (await intento(usuario(BEA)))?.code === 'admin_required' && auditoria(f).length === auditAntes);
  const sinPermiso = nucleo(f, { permisosDe: () => ['moderation.read'] });
  const e72 = await rechazo(sinPermiso.ejecutar('HIDE_CONTENT', sesion(ADM), pet({ caseId: cid })));
  const den72 = auditoria(f).find((x) => x.result === 'DENIED');
  check('72) administración SIN el permiso específico: denegado, y queda constancia', e72?.code === 'permission_denied' && den72?.permission === 'moderation.content.hide' && den72?.actor.id === ADM);
  check('73) cada operación pide SU permiso: poder ocultar no da poder para suspender',
    (await rechazo(nucleo(f, { permisosDe: () => ['moderation.content.hide'] }).ejecutar('SUSPEND_ACCOUNT', sesion(ADM), pet({ caseId: cid, durationHours: 1 }))))?.code === 'permission_denied');
  check('74) una sesión con rol de la Consola (`weeRole`) no recibe nada aquí: su matriz no está en esta rama, y se cierra',
    (await intento(sesion(ADM, { admin: true, weeRole: 'owner' })))?.code === 'permission_denied' && AUT.permisosDelPuente(sesion(ADM, { admin: true, weeRole: 'support' })).length === 0);
  process.env.WEE_ADMIN_SIN_ROL = 'cerrado';
  const cerrado = await intento(sesion(ADM));
  process.env.WEE_ADMIN_SIN_ROL = 'tal vez';
  const malEscrito = await intento(sesion(ADM));
  delete process.env.WEE_ADMIN_SIN_ROL;
  check('75) el puente de administración sin rol se cierra con el mismo interruptor que la Consola; un valor mal escrito cierra, no abre', cerrado?.code === 'permission_denied' && malEscrito?.code === 'permission_denied');
  const revocada = nucleo(f, { sesionVigente: async () => { throw new comp.RechazoDeModeracion('session_revoked'); } });
  const caido = nucleo(f, { sesionVigente: async () => { throw new Error('Auth no contesta'); } });
  const quitado = nucleo(f, { sesionVigente: async (a) => ({ uid: a.uid, token: { firebase: a.token.firebase } }) });
  check('76) la sesión vigente manda: revocada no entra; sin Auth no se entra; y un claim retirado AHORA surte efecto aunque el token lo traiga',
    (await rechazo(revocada.ejecutar('TAKE_CASE', sesion(ADM), pet({ caseId: cid }))))?.code === 'session_revoked'
    && (await rechazo(caido.ejecutar('TAKE_CASE', sesion(ADM), pet({ caseId: cid }))))?.code === 'unavailable'
    && (await rechazo(quitado.ejecutar('TAKE_CASE', sesion(ADM), pet({ caseId: cid }))))?.code === 'admin_required');
  check('77) y la cuenta administrativa es el PRINCIPAL: el permiso no viene de ninguna cara (Real o Weë) ni de un dato de la petición',
    (await intento(sesion(ADM), { actingEntityId: E_ADM }))?.code === 'unknown_field' && !/actingEntityId|entityId/.test(sinComentarios(leer('functions/src/moderation/autorizacion.ts')).replace(/Perfil Real|Perfil Weë/g, '')));
  const ok = await n.ejecutar('TAKE_CASE', sesion(ADM), pet({ caseId: cid }));
  check('78) con identidad, sesión y permiso, sí', ok.caseStatus === 'UNDER_REVIEW' && f.leer(`moderationCases/${cid}`).assignee.uid === ADM);
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── D · Triaje: coger, soltar, proponer, rechazar, resolver ──');
{
  reloj = T0;
  const f = mundo();
  const n = nucleo(f);
  await denunciaYCaso(f, ANA, { targetType: 'POST', targetId: 'postBea', reason: 'SPAM' });
  await denunciaYCaso(f, CAI, { targetType: 'POST', targetId: 'postBea', reason: 'OTHER' });
  const cid = idCaso('POST', 'postBea');
  reloj = T0 + 100;
  const t = await n.ejecutar('TAKE_CASE', sesion(ADM), pet({ caseId: cid }));
  check('79) coger: UNDER_REVIEW, con quién y cuándo', t.caseStatus === 'UNDER_REVIEW' && f.leer(`moderationCases/${cid}`).assignee.at === T0 + 100);
  check('80) coger lo cogido no se puede: dos personas no revisan lo mismo a la vez', (await rechazo(n.ejecutar('TAKE_CASE', sesion(ADM2), pet({ caseId: cid }))))?.code === 'invalid_transition');
  const s = await n.ejecutar('RELEASE_CASE', sesion(ADM), pet({ caseId: cid }));
  check('81) soltar lo devuelve a SU cola —la decide la política, no quien suelta— y sin asignación', s.caseStatus === 'PENDING' && !('assignee' in f.leer(`moderationCases/${cid}`)));
  await n.ejecutar('TAKE_CASE', sesion(ADM2), pet({ caseId: cid }));
  const ra = await n.ejecutar('REQUIRE_ACTION', sesion(ADM2), pet({ caseId: cid, proposedAction: 'WARN_ACCOUNT' }));
  check('82) proponer una acción no es hacerla: ACTION_REQUIRED con la propuesta, y nada se mueve en el mundo',
    ra.caseStatus === 'ACTION_REQUIRED' && f.leer(`moderationCases/${cid}`).proposedAction === 'WARN_ACCOUNT' && f.de('moderationSanctions').length === 0 && igual(f.leer('posts/postBea'), POST_BEA));
  reloj = T0 + 200;
  const rj = await n.ejecutar('REJECT_CASE', sesion(ADM2), pet({ caseId: cid }));
  const cr = f.leer(`moderationCases/${cid}`);
  check('83) rechazar: «no hay infracción», con la decisión fechada y sin tocar el contenido', rj.caseStatus === 'REJECTED' && cr.decision === 'REJECTED' && cr.decidedAt === T0 + 200 && igual(f.leer('posts/postBea'), POST_BEA));
  check('84) y a cada denunciante se le anota que su señal se rechazó (de ahí sale la señal de abuso)',
    f.leer(`moderationStanding/${ANA}`).reporter.rejected === 1 && f.leer(`moderationStanding/${CAI}`).reporter.rejected === 1 && f.leer(`moderationCases/${cid}`).reporterOutcomes === 'DONE'
    && f.leer(`moderationCases/${cid}/reporters/${ANA}`).outcome === 'REJECTED');
  const rs = await n.ejecutar('RESOLVE_CASE', sesion(ADM2), pet({ caseId: cid }));
  check('85) resolver: CLOSED', rs.caseStatus === 'CLOSED');
  reloj = T0 + 300;
  await denunciaYCaso(f, EVE, { targetType: 'POST', targetId: 'postBea', reason: 'SPAM' });
  const reab = f.leer(`moderationCases/${cid}`);
  check('86) alguien nuevo lo denuncia: el caso se REABRE en la cola, y su historial lo cuenta todo, en orden',
    reab.status === 'PENDING' && !('decision' in reab) && f.de(`moderationCases/${cid}/history`).map((k) => f.leer(k).seq).join() === Array.from({ length: reab.historyCount }, (_, i) => i + 1).join()
    && f.leer(`moderationCases/${cid}/history/${String(reab.historyCount).padStart(4, '0')}`).type === 'CASE_REOPENED');
  check('87) lo ya rechazado no se puede volver a anotar: la marca dice que esa señal ya tuvo desenlace', f.leer(`moderationStanding/${ANA}`).reporter.rejected === 1);
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── E · Contenido: ocultar, retirar, restaurar — y nada se destruye ──');
{
  reloj = T0;
  const f = mundo();
  const n = nucleo(f);
  await denunciaYCaso(f, ANA, { targetType: 'POST', targetId: 'postBea', reason: 'HATE' });
  const cid = idCaso('POST', 'postBea');
  check('88) no se actúa sin haberlo cogido', (await rechazo(n.ejecutar('HIDE_CONTENT', sesion(ADM), pet({ caseId: cid }))))?.code === 'invalid_transition' && !!f.leer('posts/postBea'));
  await n.ejecutar('TAKE_CASE', sesion(ADM), pet({ caseId: cid }));
  reloj = T0 + 50;
  const req = pet({ caseId: cid });
  const o = await n.ejecutar('HIDE_CONTENT', sesion(ADM), req);
  const vaultId = A.idDeCustodia(comp.huellaDelSistema, 'POST:postBea');
  const v = f.leer(`moderationVault/${vaultId}`);
  check('89) ocultar: la publicación sale de su sitio y queda ENTERA en la custodia', o.vaultState === 'HIDDEN' && !f.leer('posts/postBea') && v.state === 'HIDDEN' && igual(v.data, POST_BEA) && v.hiddenAt === T0 + 50);
  const caso = f.leer(`moderationCases/${cid}`);
  check('90) el caso: ACTION_TAKEN, con el efecto vivo, la decisión y el historial (abierto → cogido → acción)', caso.status === 'ACTION_TAKEN' && caso.effects.content === 'HIDDEN' && caso.decision === 'UPHELD' && caso.historyCount === 3
    && f.leer(`moderationCases/${cid}/history/0003`).type === 'ACTION_APPLIED' && f.leer(`moderationCases/${cid}/history/0003`).actionId === o.actionId);
  const accion = f.leer(`moderationActions/${o.actionId}`);
  check('91) la acción queda escrita para siempre: quién, con qué permiso, por qué, cuándo y sobre qué caso',
    accion.actor.id === ADM && accion.permission === 'moderation.content.hide' && accion.justification === req.justification && accion.at === T0 + 50 && accion.caseId === cid && accion.appealable === true && accion.requestId === req.requestId);
  const au = auditoria(f).filter((x) => x.actionId === o.actionId);
  check('92) con su entrada de auditoría, UNA, escrita en la misma transacción', au.length === 1 && au[0].result === 'OK' && au[0].operation === 'HIDE_CONTENT' && au[0].correlationId);
  const aviso = f.de('moderationNotices').map((k) => f.leer(k)).find((x) => x.actionId === o.actionId);
  check('93) el aviso a la persona afectada queda ESCRITO y SIN ENVIAR: un código, nunca una frase, y nada en `notifications`',
    aviso.kind === 'CONTENT_HIDDEN' && aviso.recipientAccountId === BEA && aviso.delivery === 'PENDING_INTEGRATION' && f.de('notifications').length === 0 && !JSON.stringify(aviso).includes(ANA) && !JSON.stringify(aviso).includes(ADM));
  check('94) y la reincidencia de la cuenta suma la acción', f.leer(`moderationStanding/${BEA}`).subject.actions.HIDE_CONTENT === 1);
  const dup = await n.ejecutar('HIDE_CONTENT', sesion(ADM), req);
  check('95) repetir la MISMA petición no repite nada: la misma acción, marcada como duplicada',
    dup.duplicate === true && dup.actionId === o.actionId && f.de('moderationActions').filter((k) => f.leer(k).operation === 'HIDE_CONTENT').length === 1 && auditoria(f).some((x) => x.result === 'DUPLICATE'));
  check('96) ocultar lo ya oculto, con otra petición, se rechaza con su motivo', (await rechazo(n.ejecutar('HIDE_CONTENT', sesion(ADM2), pet({ caseId: cid }))))?.code === 'content_already_hidden');
  reloj = T0 + 60;
  const rm = await n.ejecutar('REMOVE_CONTENT', sesion(ADM), pet({ caseId: cid }));
  const v2 = f.leer(`moderationVault/${vaultId}`);
  check('97) retirar lo oculto lo endurece a REMOVED y CONSERVA la copia: retirar no borra', rm.vaultState === 'REMOVED' && igual(v2.data, POST_BEA) && f.leer(`moderationCases/${cid}`).effects.content === 'REMOVED');
  reloj = T0 + 70;
  const rt = await n.ejecutar('RESTORE_CONTENT', sesion(ADM), pet({ caseId: cid }));
  const v3 = f.leer(`moderationVault/${vaultId}`);
  check('98) restaurar lo devuelve IDÉNTICO a su sitio; la custodia suelta la copia y guarda el rastro', rt.vaultState === 'RESTORED' && igual(f.leer('posts/postBea'), POST_BEA) && v3.state === 'RESTORED' && !('data' in v3) && v3.restoredAt === T0 + 70);
  check('99) sin nada hecho que siga vivo, el caso queda RESTORED, y la restauración dice qué deshace',
    f.leer(`moderationCases/${cid}`).status === 'RESTORED' && f.leer(`moderationActions/${rt.actionId}`).reverses === rm.actionId);

  const f2 = mundo();
  const n2 = nucleo(f2);
  await denunciaYCaso(f2, ANA, { targetType: 'POST', targetId: 'postBea', reason: 'HATE' });
  await n2.ejecutar('TAKE_CASE', sesion(ADM), pet({ caseId: cid }));
  await n2.ejecutar('HIDE_CONTENT', sesion(ADM), pet({ caseId: cid }));
  f2.poner('posts/postBea', { userId: BEA, content: 'otra cosa con el mismo id' });
  check('100) restaurar NO pisa: si alguien ocupó el sitio, se rechaza y la custodia sigue intacta',
    (await rechazo(n2.ejecutar('RESTORE_CONTENT', sesion(ADM), pet({ caseId: cid }))))?.code === 'restore_conflict' && f2.leer(`moderationVault/${vaultId}`).state === 'HIDDEN' && igual(f2.leer(`moderationVault/${vaultId}`).data, POST_BEA));
  f2.poner('moderationPolicies/removal', { reversible: false, version: 1 });
  f2.docs.delete('posts/postBea');
  await n2.ejecutar('REMOVE_CONTENT', sesion(ADM), pet({ caseId: cid }));
  check('101) con una política de retirada IRREVERSIBLE (que solo el dueño puede escribir), lo retirado ya no se restaura', (await rechazo(n2.ejecutar('RESTORE_CONTENT', sesion(ADM), pet({ caseId: cid }))))?.code === 'restore_not_allowed');

  const f3 = mundo();
  const n3 = nucleo(f3);
  const p = await denunciaYCaso(f3, CAI, { targetType: 'ENTITY', targetId: E_BEA_WEE, reason: 'IMPERSONATION' });
  await n3.ejecutar('TAKE_CASE', sesion(ADM), pet({ caseId: p.intake.caseId }));
  check('102) un perfil no se esconde: sobre una persona se actúa con sanciones', (await rechazo(n3.ejecutar('HIDE_CONTENT', sesion(ADM), pet({ caseId: p.intake.caseId }))))?.code === 'content_not_custodiable');
  const c = await denunciaYCaso(f3, CAI, { targetType: 'COMMUNITY', targetId: 'comuBea', reason: 'HATE' });
  await n3.ejecutar('TAKE_CASE', sesion(ADM), pet({ caseId: c.intake.caseId }));
  await n3.ejecutar('HIDE_CONTENT', sesion(ADM), pet({ caseId: c.intake.caseId }));
  check('103) una comunidad oculta sale de las listas (su documento no está), y su propiedad privada y sus miembros siguen ahí, intactos',
    !f3.leer('communities/comuBea') && !!f3.leer('communities/comuBea/private/ownership') && f3.leer(`moderationVault/${A.idDeCustodia(comp.huellaDelSistema, 'COMMUNITY:comuBea')}`).data.slug === 'comunidad-bea');
  const g = await denunciaYCaso(f3, CAI, { targetType: 'POST', targetId: 'postBea2', reason: 'SPAM' });
  await n3.ejecutar('TAKE_CASE', sesion(ADM), pet({ caseId: g.intake.caseId }));
  f3.docs.delete('posts/postBea2');
  check('104) lo que su autor ya borró no se puede ocultar: se dice, no se finge', (await rechazo(n3.ejecutar('HIDE_CONTENT', sesion(ADM), pet({ caseId: g.intake.caseId }))))?.code === 'content_gone');
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── F · La cuenta: advertir, suspender, bloquear, levantar ──');
{
  reloj = T0;
  const f = mundo();
  const n = nucleo(f);
  await denunciaYCaso(f, ANA, { targetType: 'POST', targetId: 'postBea', reason: 'HARASSMENT' });
  const cid = idCaso('POST', 'postBea');
  await n.ejecutar('TAKE_CASE', sesion(ADM), pet({ caseId: cid }));
  const wa = await n.ejecutar('WARN_ACCOUNT', sesion(ADM), pet({ caseId: cid }));
  check('105) advertir: una sanción de la CUENTA que no restringe, apelable', wa.sanctionStatus === 'ACTIVE' && f.leer(`moderationSanctions/${wa.sanctionId}`).type === 'WARNING' && f.leer(`moderationStanding/${BEA}`).restriction.level === 'NONE');
  reloj = T0 + 1000;
  const su = await n.ejecutar('SUSPEND_ACCOUNT', sesion(ADM), pet({ caseId: cid, durationHours: 24 }));
  const st = f.leer(`moderationStanding/${BEA}`);
  check('106) suspender: hasta una hora concreta, y la situación de la cuenta lo dice', st.restriction.level === 'SUSPENDED' && st.restriction.until === T0 + 1000 + 24 * 3_600_000 && f.leer(`moderationSanctions/${su.sanctionId}`).vencimiento.startsWith('ACTIVE|'));
  const bl = await n.ejecutar('BLOCK_ACCOUNT', sesion(ADM), pet({ caseId: cid }));
  check('107) bloquear: indefinido, y manda sobre la suspensión', f.leer(`moderationStanding/${BEA}`).restriction.level === 'BLOCKED' && f.leer(`moderationSanctions/${bl.sanctionId}`).endsAt === null);
  check('108) las sanciones son de la PERSONA: su Perfil Weë no queda libre (la cuenta es la misma)', f.leer(`moderationSanctions/${bl.sanctionId}`).accountId === BEA && f.leer(`moderationCases/${cid}`).effects.sanctionIds.length === 3);
  const lb = await n.ejecutar('LIFT_SANCTION', sesion(ADM), pet({ caseId: cid, sanctionId: bl.sanctionId }));
  check('109) levantar el bloqueo: la restricción se recalcula con lo que queda (la suspensión), y el caso no se da por restaurado mientras quede algo',
    lb.sanctionStatus === 'LIFTED' && f.leer(`moderationStanding/${BEA}`).restriction.level === 'SUSPENDED' && f.leer(`moderationCases/${cid}`).status === 'ACTION_TAKEN'
    && f.leer(`moderationActions/${lb.actionId}`).reverses === bl.actionId);
  check('110) lo levantado no se vuelve a levantar', (await rechazo(n.ejecutar('LIFT_SANCTION', sesion(ADM), pet({ caseId: cid, sanctionId: bl.sanctionId }))))?.code === 'sanction_not_active');
  await n.ejecutar('LIFT_SANCTION', sesion(ADM), pet({ caseId: cid, sanctionId: su.sanctionId }));
  await n.ejecutar('LIFT_SANCTION', sesion(ADM), pet({ caseId: cid, sanctionId: wa.sanctionId }));
  check('111) sin nada vivo, RESTORED; y la cuenta sin restricción', f.leer(`moderationCases/${cid}`).status === 'RESTORED' && f.leer(`moderationStanding/${BEA}`).restriction.level === 'NONE' && f.leer(`moderationStanding/${BEA}`).activeSanctionIds.length === 0);
  check('112) una sanción de otro caso no se levanta desde este', (await rechazo(n.ejecutar('LIFT_SANCTION', sesion(ADM), pet({ caseId: idCaso('POST', 'postDev'), sanctionId: bl.sanctionId }))))?.code === 'case_not_found');
  const g = await denunciaYCaso(f, CAI, { targetType: 'POST', targetId: 'postFantasma', reason: 'SPAM' });
  await n.ejecutar('TAKE_CASE', sesion(ADM), pet({ caseId: g.intake.caseId }));
  check('113) sin saber de quién es, no se sanciona a nadie', (await rechazo(n.ejecutar('WARN_ACCOUNT', sesion(ADM), pet({ caseId: g.intake.caseId }))))?.code === 'subject_unknown');
  const rid = pet({ caseId: cid });
  await n.ejecutar('RESOLVE_CASE', sesion(ADM), rid);
  check('114) un requestId reutilizado para OTRO caso no ejecuta nada: se rechaza', (await rechazo(n.ejecutar('RESOLVE_CASE', sesion(ADM), { ...rid, caseId: g.intake.caseId })))?.code === 'request_id_reused');
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── G · Nadie modera lo suyo ──');
{
  reloj = T0;
  const f = mundo();
  const n = nucleo(f);
  const a = await denunciaYCaso(f, CAI, { targetType: 'POST', targetId: 'postAdm', reason: 'SPAM' });
  check('115) quien administra no coge un caso sobre su propio contenido', (await rechazo(n.ejecutar('TAKE_CASE', sesion(ADM), pet({ caseId: a.intake.caseId }))))?.code === 'conflict_of_interest');
  await denunciaYCaso(f, ADM, { targetType: 'POST', targetId: 'postBea', reason: 'SPAM' });
  check('116) ni uno que denunció él mismo', (await rechazo(n.ejecutar('TAKE_CASE', sesion(ADM), pet({ caseId: idCaso('POST', 'postBea') }))))?.code === 'conflict_of_interest');
  check('117) otra persona de moderación, sí', (await n.ejecutar('TAKE_CASE', sesion(ADM2), pet({ caseId: idCaso('POST', 'postBea') }))).caseStatus === 'UNDER_REVIEW');
  check('118) y el rechazo por conflicto queda en la auditoría', auditoria(f).filter((x) => x.code === 'conflict_of_interest').length === 2);
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── H · Apelaciones ──');
{
  reloj = T0;
  const f = mundo();
  const n = nucleo(f);
  await denunciaYCaso(f, ANA, { targetType: 'POST', targetId: 'postBea', reason: 'HATE' });
  const cid = idCaso('POST', 'postBea');
  await n.ejecutar('TAKE_CASE', sesion(ADM), pet({ caseId: cid }));
  const o = await n.ejecutar('HIDE_CONTENT', sesion(ADM), pet({ caseId: cid }));
  await n.ejecutar('RESOLVE_CASE', sesion(ADM), pet({ caseId: cid }));
  const original = f.leer(`moderationActions/${o.actionId}`);
  check('119) quien no es la persona afectada no puede apelar —ni saber si la acción existe—',
    (await rechazo(n.apelar(usuario(ANA), { actionId: o.actionId, reason: 'quiero apelar esto' })))?.code === 'action_not_found'
    && (await rechazo(n.apelar(usuario(BEA), { actionId: `mac_${'0'.repeat(32)}`, reason: 'quiero apelar esto' })))?.code === 'action_not_found');
  check('120) un invitado tampoco', (await rechazo(n.apelar(sesion(BEA, {}, 'anonymous'), { actionId: o.actionId, reason: 'quiero apelar esto' })))?.code === 'unauthenticated');
  reloj = T0 + 500;
  const ap = await n.apelar(usuario(BEA), { actionId: o.actionId, reason: 'No era odio, era una cita' });
  const apDoc = f.leer(`moderationAppeals/${ap.appealId}`);
  check('121) la persona afectada apela: SUBMITTED, con la decisión original, su motivo y la fecha', ap.received && !ap.duplicate && ap.status === 'SUBMITTED' && apDoc.original.operation === 'HIDE_CONTENT' && apDoc.reason === 'No era odio, era una cita' && apDoc.createdAt === T0 + 500);
  check('122) lo que se le contesta no lleva ni quién denunció ni quién decidió', !JSON.stringify(ap).includes(ANA) && !JSON.stringify(ap).includes(ADM));
  check('123) apelar dos veces lo mismo no crea otra apelación', (await n.apelar(usuario(BEA), { actionId: o.actionId, reason: 'otra vez' })).duplicate === true && f.de('moderationAppeals').length === 1);
  check('124) el caso y la auditoría registran la apelación', f.de(`moderationCases/${cid}/history`).some((k) => f.leer(k).type === 'APPEAL_FILED') && auditoria(f).some((x) => x.operation === 'SUBMIT_APPEAL' && x.actor.kind === 'USER'));
  check('125) la persona afectada no la puede revisar ni decidir', (await rechazo(n.ejecutar('TAKE_APPEAL', usuario(BEA), pet({ appealId: ap.appealId }))))?.code === 'admin_required');
  await n.ejecutar('TAKE_APPEAL', sesion(ADM2), pet({ appealId: ap.appealId }));
  check('126) solo la decide quien la cogió', (await rechazo(n.ejecutar('DECIDE_APPEAL', sesion(ADM), pet({ appealId: ap.appealId, outcome: 'UPHELD' }))))?.code === 'invalid_reviewer');
  reloj = T0 + 900;
  const dec = await n.ejecutar('DECIDE_APPEAL', sesion(ADM2), pet({ appealId: ap.appealId, outcome: 'UPHELD' }));
  check('127) se le da la razón: el contenido vuelve IDÉNTICO y el caso queda RESTORED, en la misma transacción',
    dec.appealStatus === 'UPHELD' && dec.vaultState === 'RESTORED' && igual(f.leer('posts/postBea'), POST_BEA) && f.leer(`moderationCases/${cid}`).status === 'RESTORED');
  check('128) NO se borra ni se sobrescribe nada: la acción original sigue entera, y la apelación tiene sus tres entradas',
    igual(f.leer(`moderationActions/${o.actionId}`), original) && f.de(`moderationAppeals/${ap.appealId}/history`).map((k) => f.leer(k).type).join() === 'APPEAL_SUBMITTED,APPEAL_TAKEN,APPEAL_UPHELD'
    && f.leer(`moderationActions/${dec.actionId}`).reverses === o.actionId && f.leer(`moderationAppeals/${ap.appealId}`).resolution.reversalActionId === dec.actionId);

  const f2 = mundo();
  const n2 = nucleo(f2);
  await denunciaYCaso(f2, ANA, { targetType: 'POST', targetId: 'postBea', reason: 'HATE' });
  await n2.ejecutar('TAKE_CASE', sesion(ADM), pet({ caseId: cid }));
  const su = await n2.ejecutar('SUSPEND_ACCOUNT', sesion(ADM), pet({ caseId: cid, durationHours: 72 }));
  const ap2 = await n2.apelar(usuario(BEA), { actionId: su.actionId, reason: 'Me suspendieron por error' });
  await n2.ejecutar('TAKE_APPEAL', sesion(ADM), pet({ appealId: ap2.appealId }));
  const no = await n2.ejecutar('DECIDE_APPEAL', sesion(ADM), pet({ appealId: ap2.appealId, outcome: 'DENIED' }));
  check('129) se le niega: la sanción se queda, y queda anotado que revisó quien decidió (revisión independiente, apagada)',
    no.appealStatus === 'DENIED' && f2.leer(`moderationSanctions/${su.sanctionId}`).status === 'ACTIVE' && f2.leer(`moderationAppeals/${ap2.appealId}`).review.sameReviewer === true);
  const lw = await n2.ejecutar('WARN_ACCOUNT', sesion(ADM), pet({ caseId: cid }));
  await n2.ejecutar('LIFT_SANCTION', sesion(ADM), pet({ caseId: cid, sanctionId: lw.sanctionId }));
  check('130) lo que ya se deshizo no se apela', (await rechazo(n2.apelar(usuario(BEA), { actionId: lw.actionId, reason: 'quiero apelar esto' })))?.code === 'action_not_appealable');
  const mia = await n2.miModeracion(usuario(BEA));
  const texto = JSON.stringify(mia);
  check('131) «mi moderación»: mi restricción, mis sanciones, lo que se hizo, mis apelaciones y mis avisos',
    mia.restriction.level === 'SUSPENDED' && mia.sanctions.length === 2 && mia.actions.some((a) => a.operation === 'SUSPEND_ACCOUNT' && a.appealable) && mia.appeals.length === 1 && mia.notices.length >= 3);
  check('132) y NUNCA quién me denunció, quién revisó ni su justificación', !texto.includes(ANA) && !texto.includes(ADM) && !/justification|issuedBy|reporter|actor"/.test(texto));
  check('133) lo de otra persona no aparece en lo mío', (await n2.miModeracion(usuario(CAI))).sanctions.length === 0 && (await rechazo(n2.miModeracion(undefined)))?.code === 'unauthenticated');
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── I · Lo automático: la ocultación preventiva (apagada) y el barrido ──');
{
  reloj = T0;
  const f = mundo();
  for (const quien of [ANA, CAI, EVE]) await denunciaYCaso(f, quien, { targetType: 'POST', targetId: 'postBea', reason: 'ILLEGAL_CONTENT' });
  check('134) con la política por defecto, ni tres denuncias críticas ocultan nada: un reporte no oculta', igual(f.leer('posts/postBea'), POST_BEA) && f.de('moderationVault').length === 0);
  const f2 = mundo();
  f2.poner('moderationPolicies/preventiveHiding', { habilitada: true, minimoDeDenunciantes: 2 });
  for (const quien of [ANA, CAI]) await denunciaYCaso(f2, quien, { targetType: 'POST', targetId: 'postBea', reason: 'ILLEGAL_CONTENT' });
  check('135) habilitada a medias (sin gravedades) sigue apagada', !!f2.leer('posts/postBea'));
  const f3 = mundo();
  f3.poner('moderationPolicies/preventiveHiding', { habilitada: true, minimoDeDenunciantes: 2, gravedades: ['CRITICAL'], version: 7 });
  await denunciaYCaso(f3, ANA, { targetType: 'POST', targetId: 'postBea', reason: 'ILLEGAL_CONTENT' });
  check('136) con la política completa que escriba el dueño (aquí, una de prueba), por debajo del umbral no actúa', !!f3.leer('posts/postBea'));
  await denunciaYCaso(f3, CAI, { targetType: 'POST', targetId: 'postBea', reason: 'ILLEGAL_CONTENT' });
  const cid = idCaso('POST', 'postBea');
  const c3 = f3.leer(`moderationCases/${cid}`);
  const sis = f3.de('moderationActions').map((k) => f3.leer(k)).find((x) => x.operation === 'PREVENTIVE_HIDE');
  check('137) al llegar al umbral oculta como lo haría una persona —a la custodia, reversible— pero NO decide el caso',
    !f3.leer('posts/postBea') && c3.effects.preventive === true && c3.status === 'PRIORITY_REVIEW' && !('decision' in c3) && sis.actor.kind === 'SYSTEM' && sis.actor.policyVersion === 7 && sis.appealable === true);
  const n3 = nucleo(f3);
  await n3.ejecutar('TAKE_CASE', sesion(ADM), pet({ caseId: cid }));
  check('138) rechazar con el contenido escondido preventivamente exige devolverlo antes', (await rechazo(n3.ejecutar('REJECT_CASE', sesion(ADM), pet({ caseId: cid }))))?.code === 'content_hidden_restore_first');
  await n3.ejecutar('RESTORE_CONTENT', sesion(ADM), pet({ caseId: cid }));
  check('139) y se devuelve idéntico; el caso sigue en revisión', igual(f3.leer('posts/postBea'), POST_BEA) && f3.leer(`moderationCases/${cid}`).status === 'UNDER_REVIEW');

  const f4 = mundo();
  const n4 = nucleo(f4);
  await denunciaYCaso(f4, ANA, { targetType: 'POST', targetId: 'postBea', reason: 'HATE' });
  await n4.ejecutar('TAKE_CASE', sesion(ADM), pet({ caseId: cid }));
  reloj = T0 + 10;
  const su = await n4.ejecutar('SUSPEND_ACCOUNT', sesion(ADM), pet({ caseId: cid, durationHours: 1 }));
  /* Un reporte que se quedó sin caso (su disparador falló). */
  await denunciador(f4).reportar(CAI, { targetType: 'POST', targetId: 'postDev', reason: 'SPAM' });
  check('140) antes del barrido: la suspensión vencida ya no restringe aunque nadie la haya cerrado', A.restriccionDeCuenta([f4.leer(`moderationSanctions/${su.sanctionId}`)], T0 + 10 + 3_600_001).level === 'NONE');
  const informe = await n4.barrer(T0 + 10 + 3_600_001);
  check('141) el barrido cierra la suspensión vencida, da caso a lo huérfano, y es idempotente',
    informe.vencidas === 1 && informe.adjuntados === 1 && f4.leer(`moderationSanctions/${su.sanctionId}`).status === 'EXPIRED' && f4.leer(`moderationStanding/${BEA}`).restriction.level === 'NONE'
    && f4.leer(`moderationCases/${cid}`).status === 'ACTION_TAKEN' && igual(await n4.barrer(T0 + 10 + 3_600_002), { vencidas: 0, adjuntados: 0, desenlaces: 0 }));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── J · La Consola: solo lectura, con permiso, y la identidad protegida ──');
{
  reloj = T0;
  const f = mundo();
  const n = nucleo(f);
  await denunciaYCaso(f, ANA, { targetType: 'POST', targetId: 'postBea', reason: 'SPAM', details: 'mensaje del denunciante' });
  reloj = T0 + 5;
  await denunciaYCaso(f, CAI, { targetType: 'POST', targetId: 'postDev', reason: 'ILLEGAL_CONTENT' });
  reloj = T0 + 6;
  await denunciaYCaso(f, EVE, { targetType: 'POST', targetId: 'postBea2', reason: 'HATE' });
  reloj = T0 + 7;
  await denunciaYCaso(f, CAI, { targetType: 'POST', targetId: 'postBea3', reason: 'HATE' });
  reloj = T0 + 8;
  const consola = (extra = {}) => K.crearConsolaDeModeracion(nucleo(f, extra), { db: f.db });
  const leerC = (auth, data, extra) => consola(extra).leer(auth, data);
  const pend = await leerC(sesion(ADM), { view: 'cases', status: 'PENDING' });
  const prio = await leerC(sesion(ADM), { view: 'cases', status: 'PRIORITY_REVIEW' });
  check('142) las colas: cada estado la suya, lo más prioritario primero y, a igual prioridad, lo más antiguo',
    prio.cases.length === 1 && prio.cases[0].target.id === 'postDev' && igual(pend.cases.map((c) => c.target.id), ['postBea2', 'postBea3', 'postBea']));
  const cid = idCaso('POST', 'postBea');
  const caso = await leerC(sesion(ADM), { view: 'case', caseId: cid });
  const t = JSON.stringify(caso);
  check('143) el caso entero, con el detalle de cada señal, pero sin QUIÉN denunció ni la cuenta del denunciado',
    caso.signals[0].details === 'mensaje del denunciante' && !t.includes(ANA) && !t.includes(BEA) && caso.signals[0].reporterRef && caso.case.subject.entityId === E_BEA && caso.history.length >= 1);
  check('144) revelar exige `moderation.identity.read`', (await rechazo(leerC(sesion(ADM), { view: 'case', caseId: cid, reveal: true }, { permisosDe: () => ['moderation.read'] })))?.code === 'permission_denied');
  const rev = await leerC(sesion(ADM), { view: 'case', caseId: cid, reveal: true });
  check('145) y revelado, deja constancia en la auditoría', rev.signals[0].reporterAccountId === ANA && rev.case.subject.accountId === BEA && auditoria(f).some((x) => x.operation === 'console.case' && x.code === 'identity_revealed' && x.caseId === cid));
  const sig = caso.signals[0];
  check('146) quién denunció una señal concreta: solo con el permiso de identidad, y con sus señales de abuso medidas (sin señalar)',
    (await rechazo(leerC(sesion(ADM), { view: 'reporter', caseId: cid, reportId: sig.reportId }, { permisosDe: () => ['moderation.read'] })))?.code === 'permission_denied'
    && (await leerC(sesion(ADM), { view: 'reporter', caseId: cid, reportId: sig.reportId })).reporterAccountId === ANA
    && (await leerC(sesion(ADM), { view: 'reporter', caseId: cid, reportId: sig.reportId })).abuse.flagged === null);
  check('147) leer no da ninguna escritura: con solo `moderation.read`, ninguna acción', (await rechazo(nucleo(f, { permisosDe: () => ['moderation.read'] }).ejecutar('TAKE_CASE', sesion(ADM), pet({ caseId: cid }))))?.code === 'permission_denied');
  check('148) y sin permiso de lectura, nada', (await rechazo(leerC(sesion(ADM), { view: 'cases', status: 'PENDING' }, { permisosDe: () => [] })))?.code === 'permission_denied'
    && (await rechazo(leerC(usuario(BEA), { view: 'cases', status: 'PENDING' })))?.code === 'admin_required');
  check('149) una vista que no existe o un parámetro de más se rechazan', (await rechazo(leerC(sesion(ADM), { view: 'todo' })))?.code === 'unknown_read'
    && (await rechazo(leerC(sesion(ADM), { view: 'cases', status: 'PENDING', where: 'x' })))?.code === 'unknown_field' && (await rechazo(leerC(sesion(ADM), { view: 'cases', status: 'TODOS' })))?.code === 'invalid_status');
  await n.ejecutar('TAKE_CASE', sesion(ADM), pet({ caseId: cid }));
  reloj = T0 + 9;
  await n.ejecutar('HIDE_CONTENT', sesion(ADM), pet({ caseId: cid }));
  const cont = await leerC(sesion(ADM), { view: 'content', caseId: cid });
  check('150) el contenido denunciado se puede revisar aunque esté oculto: sale de la custodia, solo con sus campos de lectura',
    cont.state === 'HIDDEN' && cont.content.content === 'texto de Bea' && !('userId' in cont.content));
  const st = await leerC(sesion(ADM), { view: 'stats' });
  check('151) estadísticas agregadas por estado, apelaciones, sanciones y reportes', st.cases.ACTION_TAKEN === 1 && st.cases.PRIORITY_REVIEW === 1 && st.cases.PENDING === 2 && st.reports.last24h === 4 && typeof st.activeSanctions === 'number');
  const acc = await leerC(sesion(ADM), { view: 'actions' });
  check('152) el historial de acciones, del más reciente al más antiguo, sin la cuenta de la persona afectada', acc.actions[0].operation === 'HIDE_CONTENT' && !JSON.stringify(acc).includes(BEA));
  check('153) la auditoría de moderación pide su propio permiso', (await rechazo(leerC(sesion(ADM), { view: 'audit' }, { permisosDe: () => ['moderation.read'] })))?.code === 'permission_denied'
    && (await leerC(sesion(ADM), { view: 'audit' })).entries.length > 0);
  const pol = await leerC(sesion(ADM), { view: 'policies' });
  check('154) las políticas vigentes se pueden leer, y dicen que la ocultación preventiva está apagada', pol.policies.ocultacion.habilitada === false && pol.policies.ocultacion.minimoDeDenunciantes === null);
  const auditadas = auditoria(f).filter((x) => x.result === 'READ').map((x) => x.operation);
  check('155) las lecturas de datos de personas quedan auditadas; los agregados no', auditadas.includes('console.cases') && auditadas.includes('console.content') && !auditadas.includes('console.stats') && !auditadas.includes('console.policies'));
  const sinConstancia = K.crearConsolaDeModeracion(nucleo(f), { db: { ...f.db, collection: (c) => (c === 'moderationAudit' ? { doc: () => ({ create: async () => { throw new Error('caído'); } }) } : f.db.collection(c)) } });
  check('156) sin constancia, no se devuelven los datos', (await rechazo(sinConstancia.leer(sesion(ADM), { view: 'cases', status: 'PENDING' })))?.code === 'unavailable');
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── K · La puerta antigua de revisión, sin dos verdades ──');
{
  reloj = T0;
  const f = mundo();
  const { id } = await denunciaYCaso(f, ANA, { targetType: 'POST', targetId: 'postBea', reason: 'SPAM' });
  const legado = comp.crearModeracion({ db: f.db, now: () => reloj });
  check('157) un reporte que ya está en un caso no se revisa suelto por `moderationAdmin`: se revisa por su caso', (await rechazo(legado.revisar(ADM, { reportId: id, to: 'REVIEWING' })))?.code === 'managed_by_case'
    && f.leer(`reports/${id}`).status === 'RECEIVED');
  await denunciador(f).reportar(CAI, { targetType: 'POST', targetId: 'postBea', reason: 'HATE' });
  const viejo = idRep(CAI, 'POST', 'postBea', 'HATE');
  check('158) uno anterior al Core (sin caso) sigue revisándose como siempre', (await legado.revisar(ADM, { reportId: viejo, to: 'REVIEWING' })).status === 'REVIEWING');
  const n = nucleo(f);
  const ab = await n.ejecutar('OPEN_CASE', sesion(ADM2), pet({ fromReportId: idRep(CAI, 'POST', 'postBea', 'HATE') }));
  check('159) y si se le quiere dar caso a uno sin él, se abre a mano desde el reporte: entra en el caso de su contenido', ab.caseId === idCaso('POST', 'postBea') && f.leer(`reports/${viejo}`).caseId === ab.caseId);
  const pro = await n.ejecutar('OPEN_CASE', sesion(ADM2), pet({ targetType: 'POST', targetId: 'postBea3', gravity: 'HIGH' }));
  check('160) moderación proactiva: abrir un caso sin denuncia, en la cola, con quién lo abrió', pro.caseStatus === 'PENDING' && f.leer(`moderationCases/${pro.caseId}`).openedBy.kind === 'ADMIN' && f.leer(`moderationCases/${pro.caseId}`).counters.reports === 0);
  check('161) abrir lo ya abierto no duplica nada', (await n.ejecutar('OPEN_CASE', sesion(ADM2), pet({ targetType: 'POST', targetId: 'postBea3' }))).alreadyOpen === true && f.de('moderationCases').length === 2);
  await n.ejecutar('TAKE_CASE', sesion(ADM2), pet({ caseId: pro.caseId }));
  await n.ejecutar('REJECT_CASE', sesion(ADM2), pet({ caseId: pro.caseId }));
  await n.ejecutar('RESOLVE_CASE', sesion(ADM2), pet({ caseId: pro.caseId }));
  const reab = await n.ejecutar('OPEN_CASE', sesion(ADM2), pet({ targetType: 'POST', targetId: 'postBea3' }));
  const ultima = f.leer(`moderationCases/${pro.caseId}/history/${String(f.leer(`moderationCases/${pro.caseId}`).historyCount).padStart(4, '0')}`);
  check('161b) un caso cerrado se REABRE a mano, a la cola que dice la política, y queda escrito quién y por qué',
    reab.caseStatus === 'PENDING' && ultima.type === 'CASE_REOPENED' && ultima.by.kind === 'ADMIN' && ultima.by.id === ADM2 && ultima.reason === 'Revisado según las normas');
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── M · Las decisiones del dueño del 2026-11-07 ──');
{
  /* Autolesiones: SEÑAL DE RIESGO para revisión humana prioritaria. Nunca sanciona, nunca oculta, no es una infracción. */
  reloj = T0;
  const f = mundo();
  const r = await denunciaYCaso(f, ANA, { targetType: 'POST', targetId: 'postBea', reason: 'SELF_HARM' });
  const caso = f.leer(`moderationCases/${r.intake.caseId}`);
  check('M1) una denuncia de autolesiones pide revisión HUMANA prioritaria, y nada más: ni oculta, ni sanciona, ni decide',
    caso.status === 'PRIORITY_REVIEW' && caso.counters.byReason.SELF_HARM === 1 && !('decision' in caso) && caso.effects.content === null
    && igual(f.leer('posts/postBea'), POST_BEA) && f.de('moderationVault').length === 0 && f.de('moderationSanctions').length === 0 && f.de('moderationActions').length === 0);
  check('M2) no es una infracción: la gravedad de INFRACCIÓN de un caso sin otra cosa es ninguna, y con un spam es la del spam',
    C.tieneSenalDeRiesgo(caso) && C.gravedadDeInfraccion(caso) === undefined && C.gravedadDeInfraccion({ counters: { byReason: { SELF_HARM: 3, SPAM: 1 } } }) === 'LOW'
    && C.gravedadDeInfraccion({ counters: { byReason: { ILLEGAL_CONTENT: 1 } } }) === 'CRITICAL');
  /* Ni con una ocultación preventiva encendida (aquí, de prueba y en un almacén de mentira) se oculta por autolesiones. */
  const f2 = mundo();
  f2.poner('moderationPolicies/preventiveHiding', { habilitada: true, minimoDeDenunciantes: 1, gravedades: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'], version: 9 });
  await denunciaYCaso(f2, ANA, { targetType: 'POST', targetId: 'postBea', reason: 'SELF_HARM' });
  await denunciaYCaso(f2, CAI, { targetType: 'POST', targetId: 'postBea', reason: 'SPAM' });
  await denunciaYCaso(f2, CAI, { targetType: 'POST', targetId: 'postBea2', reason: 'ILLEGAL_CONTENT' });
  check('M3) la ocultación preventiva NUNCA actúa sobre un caso con una señal de riesgo, ni sumándole otro motivo; sobre otro caso, sí (control)',
    igual(f2.leer('posts/postBea'), POST_BEA) && !f2.leer('posts/postBea2') && f2.de('moderationActions').map((k) => f2.leer(k)).filter((a) => a.operation === 'PREVENTIVE_HIDE').length === 1
    && !A.ocultacionPreventivaAplica(A.leerPoliticaDeOcultacion({ habilitada: true, minimoDeDenunciantes: 1, gravedades: ['CRITICAL'] }), { ...caso, status: 'PENDING' }));
  /* Quien solo avisó de un riesgo no acumula «rechazos» si no había infracción; quien acusó de spam, sí (control). */
  const f3 = mundo();
  const n3 = nucleo(f3);
  await denunciaYCaso(f3, ANA, { targetType: 'POST', targetId: 'postBea', reason: 'SELF_HARM' });
  await denunciaYCaso(f3, CAI, { targetType: 'POST', targetId: 'postBea', reason: 'SPAM' });
  const cid = idCaso('POST', 'postBea');
  await n3.ejecutar('TAKE_CASE', sesion(ADM), pet({ caseId: cid }));
  await n3.ejecutar('REJECT_CASE', sesion(ADM), pet({ caseId: cid }));
  check('M4) avisar de que alguien puede estar sufriendo no cuenta como denuncia rechazada; acusar sin razón, sí',
    f3.leer(`moderationStanding/${ANA}`).reporter.rejected === 0 && f3.leer(`moderationStanding/${ANA}`).reporter.upheld === 0 && f3.leer(`moderationStanding/${CAI}`).reporter.rejected === 1
    && f3.leer(`moderationCases/${cid}/reporters/${ANA}`).outcome === 'REJECTED' && f3.leer(`moderationCases/${cid}`).reporterOutcomes === 'DONE');

  /* 5.6 · La marca de «mismo revisor»: se anota en la apelación, en su acción y en la auditoría, y NO se impide. */
  const f4 = mundo();
  const n4 = nucleo(f4);
  await denunciaYCaso(f4, ANA, { targetType: 'POST', targetId: 'postBea', reason: 'HATE' });
  await n4.ejecutar('TAKE_CASE', sesion(ADM), pet({ caseId: cid }));
  const o = await n4.ejecutar('HIDE_CONTENT', sesion(ADM), pet({ caseId: cid }));
  const ap = await n4.apelar(usuario(BEA), { actionId: o.actionId, reason: 'No era odio' });
  const tomada = await n4.ejecutar('TAKE_APPEAL', sesion(ADM), pet({ appealId: ap.appealId }));
  const decidida = await n4.ejecutar('DECIDE_APPEAL', sesion(ADM), pet({ appealId: ap.appealId, outcome: 'DENIED' }));
  const audTomada = auditoria(f4).find((x) => x.actionId === tomada.actionId && x.result === 'OK');
  const audDecidida = auditoria(f4).find((x) => x.actionId === decidida.actionId && x.result === 'OK');
  check('M5) quien tomó la decisión apelada PUEDE revisarla (la matriz no está aprobada), pero queda marcado: en la apelación, en sus acciones y en la auditoría',
    tomada.appealStatus === 'UNDER_REVIEW' && decidida.appealStatus === 'DENIED' && f4.leer(`moderationAppeals/${ap.appealId}`).review.sameReviewer === true
    && f4.leer(`moderationActions/${tomada.actionId}`).result.sameReviewer === true && f4.leer(`moderationActions/${decidida.actionId}`).result.sameReviewer === true
    && audTomada?.sameReviewer === true && audDecidida?.sameReviewer === true);
  const vistaAp = await K.crearConsolaDeModeracion(nucleo(f4), { db: f4.db }).leer(sesion(ADM2), { view: 'appeals', status: 'DENIED' });
  const vistaAud = await K.crearConsolaDeModeracion(nucleo(f4), { db: f4.db }).leer(sesion(ADM2), { view: 'audit' });
  check('M6) y la Consola lo ve: en la apelación y en la auditoría', vistaAp.appeals[0].review.sameReviewer === true && vistaAud.entries.some((e) => e.sameReviewer === true && e.operation === 'TAKE_APPEAL'));
  const f5 = mundo();
  const n5 = nucleo(f5);
  await denunciaYCaso(f5, ANA, { targetType: 'POST', targetId: 'postBea', reason: 'HATE' });
  await n5.ejecutar('TAKE_CASE', sesion(ADM), pet({ caseId: cid }));
  const o5 = await n5.ejecutar('HIDE_CONTENT', sesion(ADM), pet({ caseId: cid }));
  const ap5 = await n5.apelar(usuario(BEA), { actionId: o5.actionId, reason: 'No era odio' });
  const t5 = await n5.ejecutar('TAKE_APPEAL', sesion(ADM2), pet({ appealId: ap5.appealId }));
  check('M7) con otra persona revisando, no hay marca (control)', f5.leer(`moderationAppeals/${ap5.appealId}`).review.sameReviewer === false
    && !('sameReviewer' in f5.leer(`moderationActions/${t5.actionId}`).result) && !auditoria(f5).some((x) => x.sameReviewer === true));

  /* 5.7 · Nunca se sanciona a nadie por denunciar mucho o por que le rechacen denuncias: solo hay señales. */
  const f6 = mundo();
  const n6 = nucleo(f6);
  for (const objetivo of ['postBea', 'postBea2', 'postBea3']) {
    await denunciaYCaso(f6, CAI, { targetType: 'POST', targetId: objetivo, reason: 'SPAM' });
    await n6.ejecutar('TAKE_CASE', sesion(ADM), pet({ caseId: idCaso('POST', objetivo) }));
    await n6.ejecutar('REJECT_CASE', sesion(ADM), pet({ caseId: idCaso('POST', objetivo) }));
  }
  f6.poner('moderationPolicies/abuse', { minimoDeReportes: 1, ratioDeRechazo: 0.5 });
  const quien = await K.crearConsolaDeModeracion(nucleo(f6), { db: f6.db }).leer(sesion(ADM), { view: 'reporter', caseId: idCaso('POST', 'postBea'), reportId: idRep(CAI, 'POST', 'postBea', 'SPAM') });
  const compo = ['functions/src/moderation/nucleo.ts', 'functions/src/moderation/consola.ts', 'functions/src/moderation/puertas.ts', 'functions/src/moderation/autorizacion.ts', 'functions/src/moderation/resolutores.ts']
    .map((p) => [p, sinComentarios(leer(p))]);
  check('M8) tres denuncias rechazadas, y con una política que SEÑALA: la señal sale, pero ninguna sanción ni restricción',
    f6.leer(`moderationStanding/${CAI}`).reporter.rejected === 3 && quien.abuse.flagged === true && f6.de('moderationSanctions').length === 0 && f6.leer(`moderationStanding/${CAI}`).restriction.level === 'NONE');
  check('M9) estructura: las señales de abuso solo las LEE la Consola, y una sanción solo la crea la operación de una persona',
    compo.filter(([, s]) => /senalesDeAbuso\(/.test(s)).map(([p]) => p).join() === 'functions/src/moderation/consola.ts'
    && compo.filter(([, s]) => /nuevaSancion\(/.test(s)).map(([p]) => p).join() === 'functions/src/moderation/nucleo.ts'
    && (sinComentarios(leer('functions/src/moderation/nucleo.ts')).match(/nuevaSancion\(/g) || []).length === 1
    && /const sobreLaCuenta = async \(actor: ActorDeModeracion/.test(leer('functions/src/moderation/nucleo.ts')));

  /* 3 · WeeTalk queda FUERA, como decisión definitiva: ni denuncias de mensajes, ni casos, ni inspección, ni acceso. */
  const fuera = compo.filter(([, s]) => /['"`]conversations['"`]|collection\(['"`]messages['"`]\)|\/messages\//.test(s)).map(([p]) => p);
  check('M10) WeeTalk está fuera del Moderation Core: ningún módulo nombra conversaciones ni mensajes, y MESSAGE sigue cerrado en producción',
    fuera.length === 0 && comp.RESOLUTORES_DEL_NUCLEO.MESSAGE === undefined
    && (await lib('moderation/resolutores.js').localizarContenido(mundo().db, 'MESSAGE', 'm1')) === null
    && !Object.keys(A.LECTURAS_DE_CONSOLA).some((v) => /message|conversation|chat|talk/i.test(v)), fuera.join(', '));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── L · Estructura: lo que hay, y lo que a propósito no hay ──');
{
  const CORE = ['functions/src/core/moderation-case.ts', 'functions/src/core/moderation-action.ts', 'functions/src/core/moderation-appeal.ts'];
  const COMP = ['functions/src/moderation/nucleo.ts', 'functions/src/moderation/consola.ts', 'functions/src/moderation/autorizacion.ts', 'functions/src/moderation/resolutores.ts', 'functions/src/moderation/puertas.ts'];
  const core = CORE.map((p) => sinComentarios(leer(p))).join('\n');
  const compo = COMP.map((p) => sinComentarios(leer(p))).join('\n');
  check('162) el contrato es Core: ni Firebase, ni red, ni disco, ni reloj, ni dados, y solo importa del propio Core',
    !/firebase|firestore|node:fs|node:http|axios|fetch\(|require\(/.test(core) && !/Date\.now\(|Math\.random\(|new Date\(/.test(core) && CORE.every((p) => [...sinComentarios(leer(p)).matchAll(/from ['"]([^'"]+)['"]/g)].every(([, d]) => d.startsWith('./'))));
  const PROVEEDORES = ['gemini', 'seedance', 'seedream', 'deepseek', 'openai', 'claude', 'anthropic', 'elevenlabs', 'minimax', 'flux', 'perspective', 'rekognition', 'hive', 'vertex'];
  check('163) SIN IA: ni proveedores, ni modelos, ni el motor, ni el router, ni ninguna llamada de red',
    !PROVEEDORES.some((p) => new RegExp(`(?<![a-z])${p}(?![a-z])`, 'i').test(core + compo)) && !/fetch\(|https?:\/\/|axios|engine\.generate|runCapability/.test(compo)
    && !/from '\.\.\/(brain|planner|workflow|orchestrator|router|gateway|engine|creator|job|runtime)['/]/.test(compo));
  check('164) SIN Credits: moderar no cobra ni toca la billetera', !/credit|wallet|financial|billetera/i.test(core + compo));
  check('165) los historiales y la auditoría solo se AÑADEN: `create`, nunca `update` ni `delete` sobre ellos',
    !/collection\((HISTORIAL_DEL_CASO|HISTORIAL_DE_APELACION|HISTORIAL)\)\.doc\([^)]*\)\.(set|update|delete)\(/.test(compo) && [...compo.matchAll(/tx\.(\w+)\(historialDelCaso\(/g)].every(([, op]) => op === 'create')
    && [...compo.matchAll(/tx\.(\w+)\([^,]*collection\(HISTORIAL_DE_APELACION\)/g)].every(([, op]) => op === 'create') && [...compo.matchAll(/tx\.(\w+)\(db\.collection\(AUDITORIA\)/g)].every(([, op]) => op === 'create')
    && !/AUDITORIA\)\.doc\([^)]*\)\.(set|update|delete)\(/.test(compo) && [...compo.matchAll(/tx\.(\w+)\(accionRef\(/g)].every(([, op]) => op === 'create' || op === 'get')
    && [...compo.matchAll(/tx\.(\w+)\(accionRef\(/g)].some(([, op]) => op === 'create'));
  check('166) los avisos se escriben y NO se envían: nada en `notifications`, ningún push, y la entrega dice PENDING_INTEGRATION',
    !/collection\(['"]notifications['"]\)|sendExpoPush|exp\.host|messaging\(/.test(compo) && A.ENTREGA_DE_AVISOS === 'PENDING_INTEGRATION');
  check('167) NO es un segundo motor de eventos: ni crearEvento ni bandeja de salida', !/crearEvento\(|\.publish\(|EventPublisher|OutboxRecord/.test(core + compo));
  const puertas = leer('functions/src/moderation/puertas.ts');
  const indice = leer('functions/src/index.ts');
  check('168) UNA función por acción: cada operación tiene su callable, exportada, y no hay una puerta genérica de escritura',
    Object.values(A.OPERACIONES).every((o) => new RegExp(`export const ${o.callable} = operacion\\('`).test(puertas) && indice.includes(o.callable))
    && new Set(Object.values(A.OPERACIONES).map((o) => o.callable)).size === Object.keys(A.OPERACIONES).length
    && !/request\.data\.(operation|operacion|action)/.test(sinComentarios(puertas)) && !/ejecutar\([^,]*request\.data/.test(sinComentarios(puertas)));
  check('169) la Consola lee por una función de solo lectura: ninguna de sus vistas escribe más que su constancia',
    !/tx\.|runTransaction|\.set\(|\.update\(|\.delete\(/.test(sinComentarios(leer('functions/src/moderation/consola.ts')).replace(/collection\(AUDITORIA\)\.doc\(\)\.create\(/g, '')));
  /* Ninguna consulta pide un índice compuesto: un `where` de rango u orden y su `orderBy` hablan del MISMO campo, y no hay grupos de colecciones. */
  const cadenas = [...compo.matchAll(/\.where\(([^;]*?)\.get\(\)/gs)].map((m) => m[0]);
  const compuestas = cadenas.filter((c) => {
    const igualdad = [...c.matchAll(/\.where\('([\w.]+)', '=='/g)].map((m) => m[1]);
    const rango = [...c.matchAll(/\.where\('([\w.]+)', '(?:>=|<=|<|>)'/g)].map((m) => m[1]);
    const orden = [...c.matchAll(/\.orderBy\('([\w.]+)'/g)].map((m) => m[1]);
    const campos = new Set([...rango, ...orden]);
    return campos.size > 1 || (igualdad.length > 0 && campos.size > 0);
  });
  check('170) ni un índice compuesto que desplegar: las colas son un rango sobre un solo campo, y no hay grupos de colecciones', compuestas.length === 0 && !/collectionGroup\(/.test(compo), compuestas.join(' | ').slice(0, 300));
  const reglas = leer('firestore.rules');
  check('171) las colecciones nuevas NO tienen regla: la denegación por defecto las cierra a todo cliente (y `reports` sigue cerrada)',
    N.COLECCIONES_DEL_NUCLEO.every((c) => !reglas.includes(`match /${c}/`)) && !/match \/\{(document|path|todo)=\*\*\}/.test(reglas) && /match \/reports\/\{reportId\} \{\s*allow read, write: if false;/.test(reglas));
  const grupos = JSON.parse(leer('ops/despliegue/grupos.json'));
  const nuevas = [...Object.values(A.OPERACIONES).map((o) => o.callable), 'moderationConsole', 'submitModerationAppeal', 'getMyModeration', 'moderationIntake', 'moderationSweep'];
  const enNoSe = new Set(grupos.no_se_despliegan.map((x) => x.funcion));
  const enGrupos = grupos.grupos.flatMap((g) => g.funciones);
  check('172) NINGUNA se despliega: las veinte están en «no se despliegan», cada una con su porqué', nuevas.length === 20 && nuevas.every((n) => enNoSe.has(n) && !enGrupos.includes(n))
    && grupos.no_se_despliegan.filter((x) => nuevas.includes(x.funcion)).every((x) => x.porque.length > 30 && /Moderation Core/.test(x.porque)));
  const cadena = leer('functions/package.json');
  const dominios = JSON.parse(leer('ops/guardian/dominios.json'));
  check('173) esta suite está en la cadena de `npm test`, junto a la de moderación, y vigilada por el mismo dominio',
    cadena.includes('node test/moderation.test.mjs && node test/moderation-core.test.mjs') && dominios.dominios.some((d) => d.suites.includes('moderation') && d.suites.includes('moderation-core')));
  check('174) la suite de emulador existe y documenta cómo se lanza, en un proyecto demo-*',
    existe('functions/test/moderation-core.emulator.mjs') && /firebase emulators:exec --only firestore(,auth)? --project demo-[\w-]+/.test(leer('functions/test/moderation-core.emulator.mjs')));
  const backup = lib('core/backup.js');
  check('175) toda colección nueva está clasificada para las copias de seguridad, y lo de moderación es CRÍTICO',
    [...N.COLECCIONES_DEL_NUCLEO, 'moderationCases/{caseId}/signals', 'moderationCases/{caseId}/reporters', 'moderationCases/{caseId}/history', 'moderationAppeals/{appealId}/history'].every((c) => backup.clasificarColeccion(c).ok)
    && ['moderationCases', 'moderationActions', 'moderationAudit', 'moderationVault', 'moderationSanctions', 'moderationAppeals'].every((c) => backup.clasificarColeccion(c).clase.criticidad === 'CRITICAL'));
  const doc = existe('docs/MODERATION-CORE.md') ? leer('docs/MODERATION-CORE.md') : '';
  const integracion = existe('docs/MODERATION-CORE-INTEGRACION.md') ? leer('docs/MODERATION-CORE-INTEGRACION.md') : '';
  check('176) la documentación existe y cubre lo que pide el encargo, con las decisiones aprobadas, WeeTalk fuera y el enlace a la revisión de traducciones',
    ['Arquitectura', 'Modelo de datos', 'Contratos', 'Matriz de permisos', 'Consola', 'Decisiones aprobadas', 'Integración', 'WeeTalk', 'REVISION-TRADUCCIONES-MODERACION.md'].every((s) => doc.includes(s))
    && ['5.1', '5.3', '5.4', '5.5', '5.6', '5.7'].every((d) => doc.includes(`**${d}**`)) && /MODERATION-CORE\.md/.test(leer('docs/MODERATION.md'))
    && ['803b6bdc', 'e02dbc9b', '323d3c6c', 'guardian-dominios', 'firestore.rules', 'Condiciones de aceptación'].every((s) => integracion.includes(s)));

  /* i18n: el catálogo único en todos los idiomas, con autolesiones RECUPERADA tal como estaba en d9abcf0c. */
  const DIR = 'i18n/textos';
  const locales = fs.readdirSync(path.resolve(RAIZ, DIR), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  const malos = locales.filter((l) => { const s = leer(`${DIR}/${l}/moderation.ts`); return !/^ {2}reasonIntellectualProperty: '[^']+',$/m.test(s) || !/^ {2}reasonSelfHarm: '[^']+',$/m.test(s); });
  check(`177) los ${locales.length} diccionarios dicen «propiedad intelectual» y «autolesiones», cada uno en su idioma`, malos.length === 0 && locales.length >= 42, malos.join(', '));
  const registros = fs.readdirSync(path.resolve(RAIZ, 'i18n/revision')).filter((l) => existe(`i18n/revision/${l}/registro.json`));
  const marcadas = registros.filter((l) => JSON.parse(leer(`i18n/revision/${l}/registro.json`)).some((e) => e.clave === 'moderation.reasonSelfHarm' && e.obsoleta));
  check('178) la clave recuperada vuelve a estar viva en los registros de revisión: ninguna entrada suya queda marcada obsoleta', marcadas.length === 0, marcadas.join(', '));
  const C2 = await import(pathToFileURL(path.resolve(RAIZ, 'ops/integracion/capacidades.mjs')).href);
  check('178b) y su retirada ya no está registrada: no se retira nada', !Object.values(C2.RETIRADAS).some((r) => (r.claves || []).includes('moderation.reasonSelfHarm')) && !('motivoAutolesiones' in C2.RETIRADAS));
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
