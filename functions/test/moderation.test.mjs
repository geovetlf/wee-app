/**
 * F12-A/B — MODERATION FOUNDATION.
 *
 * Hasta esta fase, denunciar en Weë era un `Alert.alert` que escribía en la
 * consola y daba las gracias por un reporte que no existía. Esta suite comprueba
 * que ahora existe de verdad, y sobre todo que NO SE PUEDE FALSEAR:
 *
 *   A · El contrato (`core/moderation.ts`), ejecutado: petición, identificador,
 *       ritmo, evaluador, nacimiento, transiciones, vista y evento.
 *   B · La composición (`moderation/index.ts`) contra un Firestore de mentira:
 *       quién denuncia lo pone el servidor, qué se denuncia se LEE, lo repetido
 *       no se duplica, lo excesivo se frena y todo deja historial.
 *   C · Seguridad: cada intento de colar identidad, estado o decisión, uno a uno.
 *   D · Estructura: reglas cerradas, índice justificado, ni un segundo cerebro,
 *       ni Credits, ni eventos fingidos, ni acciones que digan haberse ejecutado.
 *   E · La interfaz: el botón de siempre conectado, sin promesas falsas,
 *       accesible, y sin dar por hecho que se lee de izquierda a derecha.
 *   F · Idiomas: los que haya —no «los once»—, con las mismas claves.
 *
 * Usa el compilado (`functions/lib`): `npm run build` antes de `npm test`.
 * Las transacciones de verdad y las reglas, en `moderation.emulator.mjs`.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

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
const core = lib('core/index.js');
const comp = lib('moderation/index.js');

/* ── Un Firestore de mentira, con transacciones que se aplican enteras o nada ── */
const crearDb = () => {
  const docs = new Map();
  const cuenta = { lecturas: 0, escrituras: 0 };
  const clon = (v) => JSON.parse(JSON.stringify(v));
  const campo = (d, ruta) => ruta.split('.').reduce((o, k) => (o == null ? undefined : o[k]), d);
  const snap = (ruta) => {
    const d = docs.get(ruta);
    return { exists: d !== undefined, id: ruta.split('/').pop(), data: () => (d === undefined ? undefined : clon(d)), ref: docRef(ruta) };
  };
  const consulta = (col, filtros = [], orden = null, tope = Infinity) => ({
    where: (c, _op, valor) => consulta(col, [...filtros, { c, valor }], orden, tope),
    orderBy: (c, dir = 'asc') => consulta(col, filtros, { c, dir }, tope),
    limit: (n) => consulta(col, filtros, orden, n),
    get: async () => {
      cuenta.lecturas++;
      let filas = [...docs.entries()].filter(([r]) => r.startsWith(`${col}/`) && !r.slice(col.length + 1).includes('/'));
      for (const f of filtros) filas = filas.filter(([, d]) => campo(d, f.c) === f.valor);
      if (orden) filas.sort((a, b) => (campo(a[1], orden.c) > campo(b[1], orden.c) ? 1 : -1) * (orden.dir === 'desc' ? -1 : 1));
      filas = filas.slice(0, tope);
      return { empty: filas.length === 0, size: filas.length, docs: filas.map(([r]) => snap(r)) };
    },
  });
  const colRef = (col) => ({ doc: (id) => docRef(`${col}/${id}`), ...consulta(col) });
  function docRef(ruta) {
    return { path: ruta, id: ruta.split('/').pop(), get: async () => { cuenta.lecturas++; return snap(ruta); }, collection: (sub) => colRef(`${ruta}/${sub}`) };
  }
  const db = {
    collection: colRef,
    runTransaction: async (cuerpo) => {
      const pendientes = [];
      const tx = {
        get: async (ref) => { cuenta.lecturas++; return snap(ref.path); },
        set: (ref, data) => { pendientes.push(['set', ref.path, data]); },
        create: (ref, data) => { pendientes.push(['create', ref.path, data]); },
        update: (ref, data) => { pendientes.push(['update', ref.path, data]); },
      };
      const r = await cuerpo(tx);
      for (const [op, ruta] of pendientes) if (op === 'create' && docs.has(ruta)) throw new Error(`ALREADY_EXISTS ${ruta}`);
      for (const [op, ruta, data] of pendientes) { cuenta.escrituras++; docs.set(ruta, op === 'update' ? { ...docs.get(ruta), ...clon(data) } : clon(data)); }
      return r;
    },
  };
  return { db, docs, cuenta, poner: (ruta, data) => docs.set(ruta, clon(data)), de: (col) => [...docs.keys()].filter((r) => r.startsWith(`${col}/`)) };
};

/* ── El mundo de prueba ────────────────────────────────────────────────────── */
const T0 = 1_750_000_000_000;
const ANA = 'anaAAAA0001', BEA = 'beaBBBB0002', CAI = 'caiCCCC0003', SUS = 'susSSSS0004', SIN = 'sinCuenta0005', ADMIN = 'adminZZZZ0009';
const ENT = (n) => `ent_${String(n).padStart(26, '0')}`;
const E_ANA_REAL = ENT(11), E_ANA_WEE = ENT(12), E_BEA_REAL = ENT(21), E_BEA_WEE = ENT(22), E_CAI_REAL = ENT(31), E_BEA_PAGE = ENT(23), E_BEA_VIEJA = ENT(24);
/* Identificadores heredados: DATOS de prueba, leídos de la entidad. Ninguna lógica los compone. */
const HEREDADO_DE_BEA = `hidi_${BEA}`, HEREDADO_DE_ANA = `hidi_${ANA}`, HEREDADO_ENGAÑOSO = `hidi_${ANA}x`;

const cuentaDe = (uid, real, status = 'ACTIVE') => ({
  contract: '2.0', accountId: uid, accountNumber: '123456789', status, foundingPrincipalId: uid,
  realProfileEntityId: real, nextPageSequence: 3, createdAt: T0, updatedAt: T0,
});
const entidad = (entityId, owner, tipo, seq, perfilUid, status = 'ACTIVE') => ({
  contract: '2.0', entityId, ownerAccountId: owner, entityType: tipo, entitySequence: seq,
  ...(perfilUid ? { profileRef: { coleccion: 'users', uid: perfilUid } } : {}), status, createdAt: T0, updatedAt: T0,
});

const mundo = () => {
  const f = crearDb();
  f.poner(`accounts/${ANA}`, cuentaDe(ANA, E_ANA_REAL));
  f.poner(`accounts/${BEA}`, cuentaDe(BEA, E_BEA_REAL));
  f.poner(`accounts/${CAI}`, cuentaDe(CAI, E_CAI_REAL));
  f.poner(`accounts/${SUS}`, cuentaDe(SUS, ENT(41), 'SUSPENDED'));
  f.poner(`entities/${E_ANA_REAL}`, entidad(E_ANA_REAL, ANA, 'REAL_PROFILE', 1, ANA));
  f.poner(`entities/${E_ANA_WEE}`, entidad(E_ANA_WEE, ANA, 'WEE_PROFILE', 2, HEREDADO_DE_ANA));
  f.poner(`entities/${E_BEA_REAL}`, entidad(E_BEA_REAL, BEA, 'REAL_PROFILE', 1, BEA));
  f.poner(`entities/${E_BEA_WEE}`, entidad(E_BEA_WEE, BEA, 'WEE_PROFILE', 2, HEREDADO_DE_BEA));
  f.poner(`entities/${E_BEA_PAGE}`, entidad(E_BEA_PAGE, BEA, 'PAGE', 3));
  f.poner(`entities/${E_BEA_VIEJA}`, entidad(E_BEA_VIEJA, BEA, 'PAGE', 4, undefined, 'DELETED'));
  /* Una cara cuyo identificador heredado «parece» de Ana pero cuya entidad dice que es de Cai. */
  f.poner(`entities/${E_CAI_REAL}`, entidad(E_CAI_REAL, CAI, 'REAL_PROFILE', 1, HEREDADO_ENGAÑOSO));
  f.poner('posts/postDeBea', { userId: BEA, content: 'texto', imageUrls: [] });
  f.poner('posts/fotoDeBea', { userId: BEA, content: '', imageUrls: ['https://ejemplo.invalido/a.jpg'] });
  f.poner('posts/weelDeBeaWee', { userId: HEREDADO_DE_BEA, content: '', videoUrl: 'https://ejemplo.invalido/v.mp4' });
  f.poner('posts/postDeAna', { userId: ANA, content: 'mío' });
  f.poner('posts/postDeAnaWee', { userId: HEREDADO_DE_ANA, content: 'mío con la otra cara' });
  f.poner('posts/postEnganoso', { userId: HEREDADO_ENGAÑOSO, content: 'de Cai' });
  f.poner('posts/postHuerfano', { userId: 'perfilSinEntidad77', content: 'histórico' });
  f.poner('comments/comDeBea', { userId: BEA, postId: 'postDeBea', content: 'hola' });
  return f;
};
let reloj = T0;
const motor = (f, extra = {}) => comp.crearModeracion({ db: f.db, now: () => reloj, ...extra });
const pet = (extra = {}) => ({ targetType: 'POST', targetId: 'postDeBea', reason: 'SPAM', ...extra });

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · El contrato, ejecutado ──');
{
  check('1) ocho clases de objetivo, diez motivos, cinco estados, tres conclusiones',
    M.TIPOS_DE_OBJETIVO.length === 8 && M.MOTIVOS_DE_REPORTE.length === 10 && M.ESTADOS_DE_REPORTE.length === 5 && M.RESULTADOS_DE_MODERACION.length === 3
    && M.MODERATION_CONTRACT_VERSION === '1.0');
  check('2) un perfil, un Perfil Weë y una Página son ENTITY: no hay clase de objetivo para un «perfil de negocio»',
    M.TIPOS_DE_OBJETIVO.includes('ENTITY') && !M.TIPOS_DE_OBJETIVO.some((t) => /BIZ|BUSINESS|PROFILE|PAGE/.test(t)));
  check('3) vídeo, imagen y audio son MODALIDADES, no clases de objetivo: no hay una moderación por formato',
    igual([...M.MODALIDADES_MODERABLES], ['TEXT', 'IMAGE', 'VIDEO', 'AUDIO']) && !M.TIPOS_DE_OBJETIVO.some((t) => ['VIDEO', 'IMAGE', 'AUDIO'].includes(t)));
  check('4) las transiciones son exactamente el camino acordado',
    igual(M.TRANSICIONES_DE_REPORTE, { RECEIVED: ['REVIEWING'], REVIEWING: ['ACTIONED', 'DISMISSED', 'ESCALATED'], ESCALATED: ['ACTIONED', 'DISMISSED'], ACTIONED: [], DISMISSED: [] }));

  const ok = M.validarPeticionDeReporte(pet());
  check('5) una petición mínima vale, y sale congelada y solo con lo que el contrato admite',
    ok.ok && igual(ok.peticion, pet()) && Object.isFrozen(ok.peticion));

  const mal = (d) => { const r = M.validarPeticionDeReporte(d); return r.ok ? 'OK' : r.code; };
  check('6) lo que no es un objeto llano no es una petición',
    [null, undefined, 'x', 7, true, [], [pet()], new Map(), new (class P { constructor() { Object.assign(this, pet()); } })()].every((d) => mal(d) === 'malformed'));
  check('7) un prototipo envenenado no cuela campos: lo heredado no es de la petición', mal(Object.create(pet())) === 'malformed');
  check('8) `__proto__`, `constructor` y `prototype` como claves tumban la petición',
    ['{"__proto__":{"status":"ACTIONED"}}', '{"constructor":{"prototype":{}}}', '{"prototype":1}'].every((j) => mal({ ...pet(), ...JSON.parse(j) }) === 'unknown_field')
    && mal(JSON.parse(`{"targetType":"POST","targetId":"postDeBea","reason":"SPAM","__proto__":{"reporterAccountId":"x"}}`)) === 'unknown_field');

  const SUPLANTAR = ['reporterAccountId', 'reporterEntityId', 'reporterEntityType', 'status', 'decision', 'reviewer', 'action', 'actionAt', 'decisionAt',
    'createdAt', 'updatedAt', 'reportId', 'targetOwnerAccountId', 'targetOwnerEntityId', 'evaluation', 'historyCount', 'accountId', 'uid', 'userId', 'contract'];
  const colados = SUPLANTAR.filter((k) => mal({ ...pet(), [k]: 'x' }) !== 'unknown_field');
  check(`9) ninguno de los ${SUPLANTAR.length} campos que solo puede poner el servidor se acepta en una petición`, colados.length === 0, colados.join(', '));

  check('10) motivo y clase de objetivo son enumeraciones cerradas: ni minúsculas, ni inventos, ni números',
    ['spam', 'Spam', 'BULLYING', '', 3, null, {}, ['SPAM']].every((r) => mal(pet({ reason: r })) === 'invalid_reason')
    && ['post', 'BIZ_PROFILE', 'PAGE', 'USER', '', 1, null].every((t) => mal(pet({ targetType: t })) === 'invalid_target_type'));
  check('11) el objetivo es un identificador, no una ruta',
    ['', 'a/b', '../x', 'a b', 'a.b', 'posts/x', 'x'.repeat(129), 5, {}, null, ['x']].every((id) => mal(pet({ targetId: id })) === 'invalid_target_id'));
  check('12) una petición gorda se rechaza antes de mirar nada más', mal(pet({ details: 'x'.repeat(3000) })) === 'too_large' && mal(pet({ surface: 'a'.repeat(5000) })) === 'too_large');
  check('13) el detalle es texto y cabe en 500: ni objetos, ni 501',
    mal(pet({ details: 'x'.repeat(501) })) === 'invalid_details' && mal(pet({ details: { a: 1 } })) === 'invalid_details' && mal(pet({ details: 7 })) === 'invalid_details');
  const NUL = String.fromCharCode(0), ESC = String.fromCharCode(27);
  const limpio = M.validarPeticionDeReporte(pet({ details: `  hola${NUL}${ESC} mundo\n  ` }));
  check('14) del detalle se quitan los caracteres de control, y uno vacío no se guarda',
    limpio.ok && limpio.peticion.details === 'hola mundo' && !('details' in M.validarPeticionDeReporte(pet({ details: '   ' })).peticion));
  check('15) la cara activa tiene que tener forma de entidad: un uid, un id corto o uno en mayúsculas no pasan',
    [ANA, `hidi_${ANA}`, 'ent_123', E_ANA_REAL.toUpperCase(), 7, {}].every((e) => mal(pet({ actingEntityId: e })) === 'invalid_entity')
    && M.validarPeticionDeReporte(pet({ actingEntityId: E_ANA_REAL })).ok);
  check('16) la superficie es una etiqueta corta en minúsculas', ['Wall', 'wall!', 'w all', '9wall', 'a'.repeat(33), 5].every((s) => mal(pet({ surface: s })) === 'invalid_surface')
    && M.validarPeticionDeReporte(pet({ surface: 'post_detail' })).ok);

  const h = comp.huellaDelSistema;
  const id = (o = {}) => M.idDeReporte(h, { reporterAccountId: ANA, targetType: 'POST', targetId: 'postDeBea', reason: 'SPAM', ...o });
  check('17) el identificador es la deduplicación: mismos cuatro datos, mismo reporte', id() === id() && M.FORMA_DE_ID_DE_REPORTE.test(id()));
  check('18) y cambia con la cuenta, con el objetivo, con su clase y con el motivo',
    new Set([id(), id({ reporterAccountId: BEA }), id({ targetId: 'otro' }), id({ targetType: 'COMMENT' }), id({ reason: 'HATE' })]).size === 5);
  check('19) no lleva dentro nada legible: ni la cuenta ni el objetivo', !id().includes(ANA) && !id().includes('postDeBea'));
  check('20) con una huella rota o datos inválidos no hay identificador',
    M.idDeReporte(() => 'zz', { reporterAccountId: ANA, targetType: 'POST', targetId: 'p', reason: 'SPAM' }) === undefined
    && id({ reporterAccountId: '123' }) === undefined && id({ reason: 'x' }) === undefined && id({ targetId: 'a/b' }) === undefined);

  const P = M.POLITICA_DE_REPORTES;
  let e; let r; let n = 0;
  for (; n < P.maximoPorVentana; n++) { r = M.evaluarLimite(e, T0 + n, P); e = r.siguiente; }
  check('21) el ritmo: caben exactamente los de la ventana, y el siguiente no', r.ok && e.windowCount === P.maximoPorVentana && !M.evaluarLimite(e, T0 + n, P).ok);
  const frenado = M.evaluarLimite(e, T0 + 5_000, P);
  check('22) frenado, dice cuánto falta y no devuelve un estado que guardar', !frenado.ok && frenado.scope === 'window' && frenado.retryAfterMs === P.ventanaMs - 5_000 && !('siguiente' in frenado));
  const tras = M.evaluarLimite(e, T0 + P.ventanaMs, P);
  check('23) pasada la ventana vuelve a caber, y el día sigue contando', tras.ok && tras.siguiente.windowCount === 1 && tras.siguiente.dayCount === P.maximoPorVentana + 1);
  const lleno = { windowStartedAt: T0 - P.ventanaMs * 2, windowCount: 1, day: Math.floor(T0 / 86_400_000), dayCount: P.maximoPorDia };
  const dia = M.evaluarLimite(lleno, T0, P);
  check('24) el tope del día frena aunque la ventana esté libre, y al día siguiente se abre',
    !dia.ok && dia.scope === 'day' && dia.retryAfterMs > 0 && M.evaluarLimite(lleno, T0 + 86_400_000, P).ok);
  check('25) un estado guardado que no se entiende se trata como vacío: nadie se queda sin poder denunciar por un documento roto',
    [null, 'x', {}, { windowCount: 'mil' }, { windowStartedAt: -1, windowCount: 1, day: 1, dayCount: 1 }].every((g) => M.evaluarLimite(g, T0, P).ok));

  const ev = M.EVALUADOR_DE_REGLAS.evaluar({ contract: '1.0', modality: 'VIDEO', target: { type: 'POST', id: 'x' }, source: 'REPORT', reason: 'VIOLENCE', at: T0 });
  check('26) el evaluador de hoy no sabe y lo dice: REVIEW, siempre, con su nombre y su versión',
    ev.outcome === 'REVIEW' && ev.by.kind === 'EVALUATOR' && ev.by.id === 'wee.rules.v1' && ev.at === T0 && M.decisionValida(ev));

  const nace = (o = {}) => M.nuevoReporte({ reportId: id(), reporter: { accountId: ANA }, peticion: pet(), objetivo: {}, evaluation: ev, at: T0, ...o });
  const rep = nace();
  check('27) un reporte nace RECEIVED, sin decisión, sin acción, con una entrada de historial, y congelado',
    rep.status === 'RECEIVED' && rep.decision === undefined && rep.action === undefined && rep.historyCount === 1 && Object.isFrozen(rep) && rep.createdAt === T0);
  check('28) aunque el evaluador dijera BLOCK: mover un reporte exige una política que aún no existe',
    nace({ evaluation: { ...ev, outcome: 'BLOCK' } }).status === 'RECEIVED' && nace({ evaluation: { ...ev, outcome: 'BLOCK' } }).decision === undefined);
  check('29) media cara no es una cara: o entidad y clase, o ninguna',
    nace({ reporter: { accountId: ANA, entityId: E_ANA_REAL } }) === undefined && nace({ reporter: { accountId: ANA, entityType: 'PAGE' } }) === undefined
    && nace({ reporter: { accountId: ANA, entityId: E_ANA_WEE, entityType: 'WEE_PROFILE' } }).reporterEntityType === 'WEE_PROFILE');
  check('30) y sin cuenta, sin instante o con un identificador que no es un reporte, no nace',
    nace({ reporter: {} }) === undefined && nace({ at: NaN }) === undefined && nace({ reportId: 'rep_x' }) === undefined && nace({ evaluation: { outcome: 'QUIZÁS' } }) === undefined);

  const rev = (r0, p) => M.transicionarReporte(r0, { reviewerId: ADMIN, at: T0 + 1, ...p });
  const cogido = rev(rep, { to: 'REVIEWING' });
  check('31) cogerlo es RECEIVED → REVIEWING, con su entrada, y sin tocar el original',
    cogido.ok && cogido.report.status === 'REVIEWING' && cogido.entradas.length === 1 && cogido.entradas[0].type === 'REVIEW_STARTED' && cogido.entradas[0].seq === 2
    && rep.status === 'RECEIVED' && rep.historyCount === 1);
  check('32) nada salta de RECEIVED a un final', ['ACTIONED', 'DISMISSED', 'ESCALATED', 'RECEIVED'].every((to) => rev(rep, { to, outcome: 'ALLOW' }).code === 'invalid_transition'));
  check('33) coger un reporte no es concluir nada: ni resultado ni acción caben',
    rev(rep, { to: 'REVIEWING', outcome: 'ALLOW' }).code === 'outcome_mismatch' && rev(rep, { to: 'REVIEWING', action: 'CONTENT_HIDDEN' }).code === 'action_not_allowed');
  const R = cogido.report;
  check('34) cada final exige SU conclusión: descartar es ALLOW, actuar es BLOCK, escalar es REVIEW',
    rev(R, { to: 'DISMISSED' }).code === 'outcome_required' && rev(R, { to: 'DISMISSED', outcome: 'BLOCK' }).code === 'outcome_mismatch'
    && rev(R, { to: 'ACTIONED', outcome: 'ALLOW', action: 'CONTENT_HIDDEN' }).code === 'outcome_mismatch' && rev(R, { to: 'ESCALATED', outcome: 'BLOCK' }).code === 'outcome_mismatch');
  check('35) actuar exige decir QUÉ, y descartar o escalar no admiten acción',
    rev(R, { to: 'ACTIONED', outcome: 'BLOCK' }).code === 'action_required' && rev(R, { to: 'ACTIONED', outcome: 'BLOCK', action: 'NONE' }).code === 'action_required'
    && rev(R, { to: 'ACTIONED', outcome: 'BLOCK', action: 'BORRAR_TODO' }).code === 'action_required' && rev(R, { to: 'DISMISSED', outcome: 'ALLOW', action: 'CONTENT_HIDDEN' }).code === 'action_not_allowed');
  const actuado = rev(R, { to: 'ACTIONED', outcome: 'BLOCK', action: 'CONTENT_HIDDEN', reason: '  fuera de lugar  ' });
  check('36) actuar deja decisión, acción PEDIDA —no ejecutada— y dos entradas seguidas',
    actuado.ok && actuado.report.decision.outcome === 'BLOCK' && actuado.report.decision.by.id === ADMIN && actuado.report.decision.reason === 'fuera de lugar'
    && actuado.report.action.status === 'REQUESTED' && actuado.report.action.executedAt === undefined
    && igual(actuado.entradas.map((x) => [x.seq, x.type]), [[3, 'DECISION_MADE'], [4, 'ACTION_REQUESTED']]) && actuado.report.historyCount === 4);
  check('37) una decisión tomada no se reescribe: de ACTIONED y DISMISSED no se sale',
    M.ESTADOS_DE_REPORTE.every((to) => rev(actuado.report, { to, outcome: 'ALLOW' }).code === 'invalid_transition')
    && M.ESTADOS_DE_REPORTE.every((to) => rev(rev(R, { to: 'DISMISSED', outcome: 'ALLOW' }).report, { to, outcome: 'BLOCK', action: 'CONTENT_HIDDEN' }).code === 'invalid_transition'));
  const escalado = rev(R, { to: 'ESCALATED', outcome: 'REVIEW' });
  check('38) lo escalado se resuelve, pero no vuelve atrás',
    escalado.ok && rev(escalado.report, { to: 'DISMISSED', outcome: 'ALLOW' }).ok && rev(escalado.report, { to: 'REVIEWING' }).code === 'invalid_transition');
  check('39) quien revisa tiene que ser alguien, y el motivo cabe en 500',
    rev(R, { to: 'DISMISSED', outcome: 'ALLOW', reviewerId: '' }).code === 'invalid_reviewer' && rev(R, { to: 'DISMISSED', outcome: 'ALLOW', reviewerId: 'a/b' }).code === 'invalid_reviewer'
    && rev(R, { to: 'DISMISSED', outcome: 'ALLOW', reason: 'x'.repeat(501) }).code === 'invalid_reason' && rev(undefined, { to: 'REVIEWING' }).code === 'invalid_report');

  const vista = M.vistaParaQuienDenuncia(actuado.report);
  check('40) quien denunció ve tres palabras y un instante; ni decisión, ni acción, ni dueño, ni quién revisó',
    igual(Object.keys(vista).sort(), ['createdAt', 'status']) && vista.status === 'CLOSED'
    && M.vistaParaQuienDenuncia(rep).status === 'RECEIVED' && M.vistaParaQuienDenuncia(R).status === 'IN_REVIEW' && M.vistaParaQuienDenuncia(escalado.report).status === 'IN_REVIEW');

  const conTodo = M.nuevoReporte({ reportId: id(), reporter: { accountId: ANA, entityId: E_ANA_WEE, entityType: 'WEE_PROFILE' }, peticion: M.validarPeticionDeReporte(pet({ details: 'secreto' })).peticion,
    objetivo: { ownerAccountId: BEA, ownerEntityId: E_BEA_REAL, modality: 'TEXT' }, evaluation: ev, at: T0 });
  const evento = M.eventoDeReporteCreado(conTodo);
  const sobre = core.crearEvento(evento);
  check('41) el evento que un día se emitirá ya tiene forma válida para el sobre del Core', !!sobre && sobre.type === 'REPORT_CREATED' && sobre.aggregate.type === 'REPORT' && sobre.accountId === ANA && sobre.actor.entityId === E_ANA_WEE);
  check('42) es pequeño y va por referencia: ni el detalle ni de quién es lo denunciado',
    igual(Object.keys(evento.payload).sort(), ['reason', 'reportId', 'targetId', 'targetType']) && !JSON.stringify(evento).includes('secreto') && !JSON.stringify(evento).includes(BEA));
  check('43) reintentar no produce dos eventos del mismo hecho', evento.eventId === `REPORT_CREATED:${conTodo.reportId}` && M.eventoDeReporteCreado(conTodo).eventId === evento.eventId);
  check('44) los tres nombres tienen la forma de un tipo de evento del Core', M.EVENTOS_DE_MODERACION.length === 3 && M.EVENTOS_DE_MODERACION.every((t) => core.esTipoDeEvento(t)));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · Denunciar de verdad ──');
{
  reloj = T0;
  let f = mundo();
  const r = await motor(f).reportar(ANA, pet({ actingEntityId: E_ANA_WEE, surface: 'wall' }));
  const guardados = f.de('reports').filter((k) => !k.includes('/history/'));
  const doc = f.docs.get(guardados[0]);
  check('45) una persona con sesión y cuenta denuncia, y el reporte EXISTE', r.received === true && r.duplicate === false && guardados.length === 1);
  check('46) lo que se le contesta son cuatro cosas: ni un identificador, ni de quién era', igual(Object.keys(r).sort(), ['createdAt', 'duplicate', 'received', 'status']) && r.status === 'RECEIVED');
  check('47) la cuenta que denuncia es la de la SESIÓN', doc.reporterAccountId === ANA);
  check('48) la cara es la que se comprobó leyendo la entidad, con su clase guardada', doc.reporterEntityId === E_ANA_WEE && doc.reporterEntityType === 'WEE_PROFILE');
  check('49) de quién es lo denunciado lo LEYÓ el servidor', doc.targetOwnerAccountId === BEA && doc.targetOwnerEntityId === E_BEA_REAL && doc.targetModality === 'TEXT');
  check('50) instante, estado, contrato e identificador los puso el servidor',
    doc.createdAt === T0 && doc.updatedAt === T0 && doc.status === 'RECEIVED' && doc.contract === '1.0' && M.FORMA_DE_ID_DE_REPORTE.test(doc.reportId) && guardados[0] === `reports/${doc.reportId}`);
  const h1 = f.docs.get(`reports/${doc.reportId}/history/0001`);
  check('51) y nace con su historial: REPORT_CREATED, por quien denunció', !!h1 && h1.type === 'REPORT_CREATED' && h1.by.kind === 'REPORTER' && h1.by.id === ANA && h1.seq === 1 && h1.to === 'RECEIVED');
  check('52) crear un reporte lee como mucho seis documentos y escribe tres', f.cuenta.lecturas <= 6 && f.cuenta.escrituras === 3, `${f.cuenta.lecturas} lecturas · ${f.cuenta.escrituras} escrituras`);
  check('53) y no toca nada más: ni usuarios, ni Credits, ni billeteras, ni publicaciones',
    [...f.docs.keys()].every((k) => /^(accounts|entities|posts|comments|reports|moderationLimits)\//.test(k))
    && igual(f.docs.get('posts/postDeBea'), { userId: BEA, content: 'texto', imageUrls: [] }) && igual(f.docs.get(`accounts/${ANA}`), cuentaDe(ANA, E_ANA_REAL)));

  f = mundo();
  await motor(f).reportar(ANA, pet({ targetId: 'weelDeBeaWee' }));
  const w = f.docs.get(f.de('reports')[0]);
  check('54) una publicación de un Perfil Weë: el dueño sale de la ENTIDAD, y es vídeo', w.targetOwnerAccountId === BEA && w.targetOwnerEntityId === E_BEA_WEE && w.targetModality === 'VIDEO');
  f = mundo();
  await motor(f).reportar(ANA, pet({ targetId: 'postEnganoso' }));
  check('55) el dueño se LEE, no se deduce del prefijo: un identificador heredado que «parece» de Ana es de quien diga su entidad',
    f.docs.get(f.de('reports')[0]).targetOwnerAccountId === CAI);
  f = mundo();
  await motor(f).reportar(ANA, pet({ targetId: 'postHuerfano' }));
  const hu = f.docs.get(f.de('reports')[0]);
  check('56) una publicación histórica sin entidad se puede denunciar, y el dueño queda sin decir: no se inventa', hu.status === 'RECEIVED' && !('targetOwnerAccountId' in hu));
  f = mundo();
  await motor(f).reportar(ANA, pet({ targetId: 'fotoDeBea' }));
  await motor(f).reportar(ANA, { targetType: 'COMMENT', targetId: 'comDeBea', reason: 'HARASSMENT' });
  await motor(f).reportar(ANA, { targetType: 'ENTITY', targetId: E_BEA_PAGE, reason: 'IMPERSONATION' });
  const tres = f.de('reports').filter((k) => !k.includes('/history/')).map((k) => f.docs.get(k));
  check('57) una foto, un comentario y una Página —que es una entidad— se denuncian por la misma puerta',
    tres.length === 3 && tres.some((d) => d.targetModality === 'IMAGE') && tres.some((d) => d.targetType === 'COMMENT' && d.targetOwnerAccountId === BEA)
    && tres.some((d) => d.targetType === 'ENTITY' && d.targetId === E_BEA_PAGE && d.targetOwnerAccountId === BEA));

  f = mundo();
  const m = motor(f);
  const a = await m.reportar(ANA, pet());
  const b = await m.reportar(ANA, pet());
  const c = await m.reportar(ANA, pet({ actingEntityId: E_ANA_WEE }));
  const unicos = () => f.de('reports').filter((k) => !k.includes('/history/'));
  check('58) lo mismo dos veces es la MISMA señal: no se crea otro, y se dice', !a.duplicate && b.duplicate && unicos().length === 1 && f.de('reports').filter((k) => k.includes('/history/')).length === 1);
  check('59) y con la otra cara tampoco: una persona con dos caras es una persona', c.duplicate && unicos().length === 1);
  const d = await m.reportar(ANA, pet({ reason: 'HATE' }));
  const e = await m.reportar(CAI, pet());
  check('60) otro motivo sí es otra señal, y otra cuenta también', !d.duplicate && !e.duplicate && unicos().length === 3);
  const original = f.docs.get(unicos()[0]);
  await m.reportar(ANA, pet({ details: 'ahora con detalle', surface: 'weels' }));
  check('61) repetir no reescribe el reporte que ya estaba', igual(f.docs.get(unicos()[0]), original));

  f = mundo(); reloj = T0;
  const lim = motor(f);
  const P = M.POLITICA_DE_REPORTES;
  const razones = M.MOTIVOS_DE_REPORTE;
  for (let i = 0; i < P.maximoPorVentana; i++) await lim.reportar(ANA, pet({ reason: razones[i % razones.length], targetId: i < 5 ? 'postDeBea' : 'fotoDeBea' }));
  const antes = JSON.stringify([...f.docs.entries()]);
  const frenada = await rechazo(lim.reportar(ANA, pet({ targetId: 'weelDeBeaWee' })));
  check('62) la undécima en diez minutos se frena, con su motivo y cuánto falta', frenada?.code === 'rate_limited' && frenada.retryAfterMs > 0 && frenada.retryAfterMs <= P.ventanaMs);
  check('63) y frenada no escribe NADA', JSON.stringify([...f.docs.entries()]) === antes);
  check('64) el freno es por cuenta: a otra persona no le afecta', (await lim.reportar(CAI, pet())).received === true);
  reloj = T0 + P.ventanaMs + 1;
  check('65) pasada la ventana, vuelve a poder', (await lim.reportar(ANA, pet({ targetId: 'weelDeBeaWee' }))).received === true);
  f = mundo(); reloj = T0;
  const rep2 = motor(f);
  for (let i = 0; i < P.maximoPorVentana; i++) await rep2.reportar(ANA, pet());
  check('66) repetir la MISMA petición también agota: el intento cuenta aunque no cree nada',
    (await rechazo(rep2.reportar(ANA, pet())))?.code === 'rate_limited' && f.de('reports').filter((k) => !k.includes('/history/')).length === 1);
  reloj = T0;
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · Lo que no se puede falsear ──');
{
  reloj = T0;
  const intento = async (uid, data, extra) => { const f = mundo(); const e = await rechazo(motor(f, extra).reportar(uid, data)); return { e, f, creados: f.de('reports').length }; };
  const nada = (x, code) => x.e?.code === code && x.creados === 0 && x.f.de('moderationLimits').length === 0;

  check('67) sin sesión no hay reporte', nada(await intento(undefined, pet()), 'unauthenticated') && nada(await intento('', pet()), 'unauthenticated') && nada(await intento(null, pet()), 'unauthenticated'));
  check('68) con sesión pero sin cuenta nacida, tampoco; ni con la cuenta suspendida', nada(await intento(SIN, pet()), 'account_required') && nada(await intento(SUS, pet()), 'account_required'));
  check('69) suplantar la cuenta: se rechaza, y no se guarda ni a nombre de la víctima ni de nadie', nada(await intento(ANA, pet({ reporterAccountId: BEA })), 'unknown_field'));
  check('70) suplantar la cara por el campo prohibido: rechazado', nada(await intento(ANA, pet({ reporterEntityId: E_BEA_REAL })), 'unknown_field'));
  check('71) suplantar la cara por la pista: la entidad de OTRA cuenta no se ignora, se rechaza', nada(await intento(ANA, pet({ actingEntityId: E_BEA_REAL })), 'entity_not_owned'));
  check('72) una entidad que no existe, o que ya no está activa, no sirve para firmar',
    nada(await intento(ANA, pet({ actingEntityId: ENT(99) })), 'entity_not_owned') && nada(await intento(BEA, { ...pet({ targetId: 'postDeAna' }), actingEntityId: E_BEA_VIEJA }), 'entity_not_owned'));
  const espurios = { status: 'ACTIONED', decision: { outcome: 'BLOCK' }, reviewer: ADMIN, action: 'ACCOUNT_RESTRICTED', actionAt: 1, decisionAt: 1 };
  const pasaron = [];
  for (const [k, v] of Object.entries(espurios)) if (!nada(await intento(ANA, pet({ [k]: v })), 'unknown_field')) pasaron.push(k);
  check('73) estado, decisión, revisor y acción: ninguno entra por la petición', pasaron.length === 0, pasaron.join(', '));
  check('74) lo propio no se denuncia: ni lo firmado con la cuenta, ni con la otra cara, ni la propia entidad',
    nada(await intento(ANA, pet({ targetId: 'postDeAna' })), 'own_content') && nada(await intento(ANA, pet({ targetId: 'postDeAnaWee' })), 'own_content')
    && nada(await intento(ANA, { targetType: 'ENTITY', targetId: E_ANA_WEE, reason: 'OTHER' }), 'own_content'));
  check('75) un objetivo que no existe no genera un reporte', nada(await intento(ANA, pet({ targetId: 'noExiste123' })), 'target_not_found')
    && nada(await intento(ANA, { targetType: 'COMMENT', targetId: 'postDeBea', reason: 'SPAM' }), 'target_not_found'));
  const cerradas = [];
  for (const t of ['PUBLICATION', 'MESSAGE', 'ASSET', 'CONTENT', 'COMMUNITY']) if (!nada(await intento(ANA, pet({ targetType: t })), 'target_type_not_enabled')) cerradas.push(t);
  check('76) las clases de objetivo sin nada detrás que leer se rechazan con su motivo, no se guardan a ciegas', cerradas.length === 0, cerradas.join(', '));
  check('77) una petición deformada no llega a leer nada', (await (async () => { const x = await intento(ANA, ['POST', 'postDeBea', 'SPAM']); return nada(x, 'malformed') && x.f.cuenta.lecturas === 0; })()));
  check('78) ni una gorda', (await (async () => { const x = await intento(ANA, pet({ details: 'x'.repeat(4000) })); return nada(x, 'too_large') && x.f.cuenta.lecturas === 0; })()));

  const f = mundo();
  const conBloqueo = motor(f, { evaluador: { id: 'prueba.bloquea.v9', evaluar: (q) => ({ outcome: 'BLOCK', by: { kind: 'EVALUATOR', id: 'prueba.bloquea.v9' }, at: q.at }) } });
  await conBloqueo.reportar(ANA, pet());
  const bloqueado = f.docs.get(f.de('reports').filter((k) => !k.includes('/history/'))[0]);
  check('79) un evaluador que diga BLOCK queda ESCRITO, pero no mueve nada ni actúa: sin política explícita no hay acción automática',
    bloqueado.evaluation.outcome === 'BLOCK' && bloqueado.evaluation.by.id === 'prueba.bloquea.v9' && bloqueado.status === 'RECEIVED' && !('decision' in bloqueado) && !('action' in bloqueado));
  const roto = await intento(ANA, pet(), { evaluador: { id: 'x', evaluar: () => ({ outcome: 'TAL_VEZ' }) } });
  check('80) un evaluador que devuelve basura tumba la petición sin escribir', roto.e instanceof Error && !(roto.e instanceof comp.RechazoDeModeracion) && roto.creados === 0);

  const https = (e) => comp.aHttpsError(e);
  const limitado = https(new comp.RechazoDeModeracion('rate_limited', 1234));
  check('81) al cliente viaja un código y un motivo corto; el mensaje es siempre el mismo y no cuenta nada',
    limitado.code === 'resource-exhausted' && limitado.details.reason === 'rate_limited' && limitado.details.retryAfterMs === 1234 && limitado.message === 'No se pudo completar.'
    && https(new comp.RechazoDeModeracion('entity_not_owned')).code === 'permission-denied' && https(new comp.RechazoDeModeracion('target_not_found')).code === 'not-found'
    && https(new comp.RechazoDeModeracion('unknown_field')).code === 'invalid-argument' && https(new comp.RechazoDeModeracion('own_content')).code === 'failed-precondition');
  const interno = https(new Error(`PERMISSION_DENIED en projects/get-wee/databases/(default)/documents/reports/x para ${ANA}`));
  check('82) un fallo interno no filtra ni la ruta, ni el proyecto, ni la cuenta', interno.code === 'internal' && interno.message === 'No se pudo completar.' && !JSON.stringify(interno.details).includes('get-wee') && !JSON.stringify(interno.details).includes(ANA));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── D · Revisar, y que quede escrito ──');
{
  reloj = T0;
  const f = mundo();
  const avisos = [];
  const m = motor(f, { alCerrar: (r) => { avisos.push(r.status); } });
  await m.reportar(ANA, pet());
  await m.reportar(CAI, pet({ targetId: 'fotoDeBea' }));
  const [primero] = await m.listar('RECEIVED');
  const id = primero.reportId;
  check('83) la cola: los recibidos, el más antiguo primero', (await m.listar()).length === 2 && (await m.listar('REVIEWING')).length === 0);
  check('84) crear un reporte NO avisa a nadie: que exista no es una decisión', avisos.length === 0);
  reloj = T0 + 10;
  const cogido = await m.revisar(ADMIN, { reportId: id, to: 'REVIEWING' });
  check('85) cogerlo lo mueve y lo apunta', cogido.status === 'REVIEWING' && f.docs.get(`reports/${id}`).status === 'REVIEWING' && f.docs.get(`reports/${id}/history/0002`).type === 'REVIEW_STARTED' && avisos.length === 0);
  const mala = await rechazo(m.revisar(ADMIN, { reportId: id, to: 'ACTIONED', outcome: 'BLOCK' }));
  check('86) una revisión mal hecha se rechaza y no deja ni una entrada', mala?.code === 'action_required' && !f.docs.has(`reports/${id}/history/0003`) && f.docs.get(`reports/${id}`).status === 'REVIEWING');
  reloj = T0 + 20;
  const final = await m.revisar(ADMIN, { reportId: id, to: 'ACTIONED', outcome: 'BLOCK', action: 'CONTENT_HIDDEN', reason: 'spam repetido' });
  const guardado = f.docs.get(`reports/${id}`);
  const historia = await m.historial(id);
  check('87) la decisión, quién la tomó, cuándo y por qué quedan en el reporte',
    final.status === 'ACTIONED' && guardado.decision.outcome === 'BLOCK' && guardado.decision.by.kind === 'REVIEWER' && guardado.decision.by.id === ADMIN && guardado.decision.at === T0 + 20 && guardado.decision.reason === 'spam repetido');
  check('88) la acción queda PEDIDA. Nadie escribe que se ejecutó, porque nadie la ejecuta todavía',
    guardado.action.type === 'CONTENT_HIDDEN' && guardado.action.status === 'REQUESTED' && !('executedAt' in guardado.action) && igual(f.docs.get('posts/postDeBea'), { userId: BEA, content: 'texto', imageUrls: [] }));
  check('89) el historial entero, en orden: creado → cogido → decidido → acción pedida',
    igual(historia.map((h) => h.type), ['REPORT_CREATED', 'REVIEW_STARTED', 'DECISION_MADE', 'ACTION_REQUESTED']) && igual(historia.map((h) => h.seq), [1, 2, 3, 4]) && guardado.historyCount === 4);
  check('90) lo que no cambia, no cambia: quién denunció, qué, por qué y cuándo siguen igual',
    guardado.reporterAccountId === primero.reporterAccountId && guardado.targetId === primero.targetId && guardado.reason === primero.reason && guardado.createdAt === primero.createdAt && guardado.updatedAt === T0 + 20);
  check('91) AHORA sí se avisa, una vez: hay una decisión de verdad', igual(avisos, ['ACTIONED']));
  const reabrir = await rechazo(m.revisar(ADMIN, { reportId: id, to: 'REVIEWING' }));
  check('92) una decisión tomada no se reabre por la puerta de atrás', reabrir?.code === 'invalid_transition' && (await m.historial(id)).length === 4);
  check('93) un reporte que no existe, o un identificador que no lo es, no se revisa',
    (await rechazo(m.revisar(ADMIN, { reportId: `rep_${'0'.repeat(32)}`, to: 'REVIEWING' })))?.code === 'report_not_found'
    && (await rechazo(m.revisar(ADMIN, { reportId: '../accounts/x', to: 'REVIEWING' })))?.code === 'report_not_found' && (await rechazo(m.listar('TODOS')))?.code === 'invalid_status');
  const f2 = mundo();
  const roto = motor(f2, { alCerrar: () => { throw new Error('el aviso se cayó'); } });
  await roto.reportar(ANA, pet());
  const [r2] = await roto.listar();
  await roto.revisar(ADMIN, { reportId: r2.reportId, to: 'REVIEWING' });
  const cerrado = await roto.revisar(ADMIN, { reportId: r2.reportId, to: 'DISMISSED', outcome: 'ALLOW' });
  check('94) un aviso que falla no deshace la decisión', cerrado.status === 'DISMISSED' && f2.docs.get(`reports/${r2.reportId}`).status === 'DISMISSED' && !('action' in f2.docs.get(`reports/${r2.reportId}`)));
  reloj = T0;
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── E · Estructura: lo que hay, y lo que a propósito no hay ──');
{
  const CORE = 'functions/src/core/moderation.ts', COMP = 'functions/src/moderation/index.ts';
  const codigoCore = sinComentarios(leer(CORE)), codigoComp = sinComentarios(leer(COMP));
  check('95) el contrato es Core: ni Firebase, ni red, ni disco, ni reloj, ni dados',
    !/firebase|firestore|node:fs|node:http|axios|fetch\(|require\(/.test(codigoCore) && !/Date\.now\(|Math\.random\(|new Date\(/.test(codigoCore));
  check('96) y solo importa del propio Core', [...codigoCore.matchAll(/from ['"]([^'"]+)['"]/g)].every(([, dep]) => dep.startsWith('./')));
  check('97) el archivo no lleva bytes de control crudos: es texto, y git lo ve como texto',
    ![...leer(CORE)].some((ch) => { const n = ch.charCodeAt(0); return (n < 32 && n !== 9 && n !== 10 && n !== 13) || n === 127; }));
  const PROVEEDORES = ['gemini', 'seedance', 'seedream', 'deepseek', 'openai', 'claude', 'anthropic', 'elevenlabs', 'minimax', 'flux', 'perspective', 'rekognition', 'hive'];
  check('98) ningún proveedor, ningún modelo, ninguna API: la moderación de hoy no llama a nadie',
    !PROVEEDORES.some((p) => new RegExp(`(?<![a-z])${p}(?![a-z])`, 'i').test(codigoCore + codigoComp)) && !/fetch\(|https?:\/\/|axios|engine\.generate|runCapability/.test(codigoComp));
  check('99) NO es un segundo cerebro: no importa Brain, Planner, Workflow, Orchestrator, Router, Gateway ni el motor de IA',
    !/from '\.\.\/(brain|planner|workflow|orchestrator|router|gateway|engine|creator|job)['/]/.test(codigoComp) && !/crearBrain|crearPlanner|crearRouter|crearGateway|crearOrchestrator|crearJobEngine/.test(codigoCore + codigoComp));
  check('100) denunciar no cuesta Credits: ni el motor de Credits, ni la billetera, ni el Financial Core',
    !/credits|creditEngine|spendCredits|wallet|financial|billetera/i.test(codigoComp) && !/credit|wallet|financial/i.test(codigoCore));
  check('101) reutiliza el resolutor de cuenta y la regla de la cara; no escribe los suyos',
    /from '\.\.\/identity\/cuentas'/.test(codigoComp) && /cuentaDeWee\(/.test(codigoComp) && /entidadDelPerfil\(/.test(codigoComp) && /actorDeLaCuenta\(/.test(codigoComp)
    && /from '\.\.\/shared\/admin'/.test(codigoComp) && !/collection\('accounts'\)|collection\("accounts"\)/.test(codigoComp));
  check('102) lo heredado solo se toca por su frontera: aquí nadie compone ni parte un identificador antiguo',
    /identidadHeredadaEsDeLaCuenta/.test(codigoComp) && !/hidi/i.test(codigoCore + codigoComp) && !/startsWith\(|\.replace\(\s*['"`]/.test(codigoComp));
  check('103) nadie escribe que una acción se EJECUTÓ: ni `EXECUTED` ni `executedAt` se asignan en ningún sitio',
    !/status:\s*['"]EXECUTED['"]|executedAt\s*:\s*[a-zA-Z(]|ACTION_EXECUTED['"]\s*as const/.test(codigoCore.replace(/status: 'REQUESTED' \| 'EXECUTED'/, '').replace(/executedAt\?: number/, '')) && !/EXECUTED|executedAt/.test(codigoComp));
  check('104) el historial solo se AÑADE: `create`, nunca `set`, `update` ni `delete`',
    (codigoComp.match(/collection\(HISTORIAL\)\.doc\(/g) || []).length === 2 && [...codigoComp.matchAll(/tx\.(\w+)\((?:reporteRef|ref)\.collection\(HISTORIAL\)/g)].every(([, op]) => op === 'create')
    && !/\.delete\(/.test(codigoComp));
  check('105) HONESTIDAD de la Fase 10 intacta: aquí tampoco se emite ningún evento ni se finge un transporte',
    !/crearEvento\(|\.publish\(\s*\[|EventPublisher|OutboxRecord/.test(codigoCore + codigoComp) && /NINGUNO SE EMITE TODAVÍA/.test(leer(CORE)));
  check('106) `principalId` es SIEMPRE la sesión: la callable no lee la identidad de los datos', /reportar\(request\.auth\?\.uid, request\.data\)/.test(codigoComp) && !/request\.data\.(uid|userId|accountId|reporter)/.test(codigoComp));
  check('107) la puerta de revisión comprueba administración ANTES de mirar nada', /moderationAdmin = onCall\(OPTS, async \(request\) => \{\s*assertAdmin\(/.test(codigoComp));
  check('108) y las dos puertas salen de `index.ts`', /export \{ reportContent, moderationAdmin \} from '\.\/moderation';/.test(leer('functions/src/index.ts')));

  const reglas = leer('firestore.rules');
  const bloque = reglas.slice(reglas.indexOf('match /reports/{reportId}'), reglas.indexOf('// === BUSINESS FOLLOWS'));
  check('109) `reports` está CERRADA a los clientes: ya nadie con sesión puede crear ahí lo que quiera', /match \/reports\/\{reportId\} \{\s*allow read, write: if false;/.test(bloque) && !/allow create/.test(bloque) && !/isAuthenticated\(\)/.test(bloque));
  check('110) y su historial y los límites, igual', /match \/history\/\{entryId\} \{\s*allow read, write: if false;/.test(bloque) && /match \/moderationLimits\/\{accountId\} \{\s*allow read, write: if false;/.test(bloque));
  const indices = JSON.parse(leer('firestore.indexes.json')).indexes;
  const deReportes = indices.filter((i) => i.collectionGroup === 'reports');
  /*
   * El total se fija a propósito: que nadie añada un índice sin que se vea. Subió
   * a 30 con el transporte durable (`jobQueue`), a 32 con S4 (`elements` y
   * `projectItems`) y a 35 con C3 (uno de `scenes` y dos de `shots`), los seis
   * preparados y NINGUNO desplegado; la parte de moderación —UNO y solo uno—
   * no se ha movido desde entonces.
   */
  check('111) UN índice nuevo y justificado —la cola: estado + antigüedad—, y los de antes siguen',
    deReportes.length === 1 && igual(deReportes[0].fields.map((c) => [c.fieldPath, c.order]), [['status', 'ASCENDING'], ['createdAt', 'ASCENDING']]) && indices.length === 35,
    `${deReportes.length} de reports, ${indices.length} en total`);
  check('112) el contrato de contenido ya tenía la costura: `moderationStatus` y `moderationCaseId` siguen ahí, sin tocar',
    /export type ModerationStatus = 'clear' \| 'pending' \| 'restricted' \| 'removed';/.test(leer('functions/src/core/content/content.ts')));
  check('113) la documentación existe', existe('docs/MODERATION.md') && /reportContent/.test(leer('docs/MODERATION.md')));
  check('114) esta suite está en la cadena de `npm test`', leer('functions/package.json').includes('node test/moderation.test.mjs'));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── F · La interfaz: el botón de siempre, ahora de verdad ──');
{
  const tarjeta = sinComentarios(leer('components/PostCard.tsx'));
  const hoja = sinComentarios(leer('components/ReportSheet.tsx'));
  const servicio = sinComentarios(leer('services/moderationService.ts'));
  check('115) el botón ya no escribe en la consola ni abre un `Alert.alert` que en la web no se ve', !/Post reportado/.test(leer('components/PostCard.tsx')) && !/reportThanks|reportSent|reportWhy/.test(tarjeta));
  check('116) es el MISMO botón, en el mismo sitio del menú, y abre la hoja común', /onPress=\{handleReportPost\}/.test(tarjeta) && /name="flag-outline"/.test(tarjeta) && /<ReportSheet/.test(tarjeta) && /setDenunciando\(true\)/.test(tarjeta));
  check('117) sin sesión, a registrarse, como el resto del menú', /const handleReportPost = \(\) => \{\s*setMenuVisible\(false\);\s*if \(!user\) \{ navigateToRegister\(\); return; \}/.test(tarjeta));
  check('118) se denuncia la publicación que se VE —en un repost, la original—, y lo propio no ofrece el botón',
    /objetivo=\{\{ type: 'POST', id: displayPost\.id \}\}/.test(tarjeta) && /const puedeDenunciar = !\[user\?\.uid, realProfile\?\.uid, weeProfile\?\.uid\]/.test(tarjeta) && /\{puedeDenunciar && \(/.test(tarjeta));
  check('119) la hoja se monta solo al abrirse: un muro de cien tarjetas no lleva cien hojas', /\{denunciando && !!displayPost\.id && \(\s*<ReportSheet/.test(tarjeta));
  check('120) hay UNA hoja de denunciar, no una por pantalla', fs.readdirSync(path.resolve(RAIZ, 'components')).filter((n) => /report|denunc/i.test(n)).length === 1);

  check('121) el cliente manda cinco cosas como mucho, y ninguna es una identidad de cuenta',
    /targetType: d\.targetType,\s*targetId: d\.targetId,\s*reason: d\.reason,/.test(servicio) && !/uid|accountId|reporterAccountId|status:|decision/.test(servicio.slice(servicio.indexOf('const res = await fn('), servicio.indexOf('const data ='))));
  check('122) la cara viaja solo si es una referencia de entidad: un uid se descarta aquí mismo', /esReferenciaDeEntidad\(d\.actingEntityId\) \? \{ actingEntityId: d\.actingEntityId \} : \{\}/.test(servicio));
  check('123) solo se da por recibido lo que el servidor dijo que recibió', /if \(data\.received !== true\) return \{ ok: false, error: 'unknown' \};/.test(servicio));
  check('124) el servicio no lanza y no enseña el mensaje del servidor: todo fallo es una de cuatro razones', !/\.message/.test(servicio) && !/throw /.test(servicio) && /'offline' \| 'rate_limited' \| 'unavailable' \| 'unknown'/.test(servicio));

  /* La función pura del servicio, ejecutada de verdad. */
  const ts = require('typescript');
  const js = ts.transpileModule(leer('services/moderationService.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} };
  new Function('exports', 'require', 'module', js)(mod.exports, () => new Proxy({}, { get: () => () => ({}) }), mod);
  const fallo = mod.exports.falloDeDenuncia;
  check('125) los fallos se leen bien: límite, contenido que ya no está, sin red, y lo demás',
    fallo({ code: 'functions/resource-exhausted' }) === 'rate_limited' && fallo({ code: 'functions/invalid-argument', details: { reason: 'rate_limited' } }) === 'rate_limited'
    && fallo({ code: 'functions/not-found', details: { reason: 'target_not_found' } }) === 'unavailable' && fallo({ code: 'functions/not-found' }) === 'unknown' && fallo({ code: 'functions/unavailable' }) === 'offline'
    && fallo({ code: 'functions/deadline-exceeded' }) === 'offline' && fallo({}, false) === 'offline' && fallo(new Error('boom')) === 'unknown' && fallo(null) === 'unknown' && fallo({ code: 'functions/internal' }) === 'unknown');
  check('126) diez motivos, los mismos que el servidor, y guardan la CLAVE, no la frase',
    igual(mod.exports.MOTIVOS_DE_REPORTE.map((x) => x.motivo), [...M.MOTIVOS_DE_REPORTE]) && mod.exports.MOTIVOS_DE_REPORTE.every((x) => /^moderation\.reason[A-Z]\w+$/.test(x.clave)));

  check('127) estados de la hoja: elegir, enviando, recibido, duplicado y fallo', /type Paso = 'elegir' \| 'enviando' \| 'recibido' \| 'duplicado' \| 'fallo';/.test(hoja));
  check('128) el doble toque se corta con un cerrojo, no solo desactivando el botón', /if \(!objetivo \|\| !motivo \|\| enviando\.current\) return;\s*enviando\.current = true;/.test(hoja) && /disabled=\{!motivo \|\| ocupado\}/.test(hoja));
  check('129) mientras se envía no se cierra, y al reabrir empieza de cero', /if \(paso !== 'enviando'\) onClose\(\)/.test(hoja) && /setPaso\('elegir'\);\s*setMotivo\(null\);/.test(hoja));
  check('130) si falla NO da las gracias: dice que no se pudo, y se puede reintentar sin salir', /paso === 'fallo' && \(/.test(hoja) && /accessibilityRole="alert"/.test(hoja) && /t\('moderation\.errorTitle'\)/.test(hoja));
  check('131) no enseña identificadores, estados internos ni errores del servidor', !/reportId|reporterAccountId|\.status\b(?!\))|error\.message|retryAfterMs/.test(hoja.replace(/resultado\.(ok|duplicate|error)/g, '')));
  check('132) accesible: grupo de opciones, cada motivo con su estado, cabecera, zona viva y anuncio al terminar',
    /accessibilityRole="radiogroup"/.test(hoja) && /accessibilityRole="radio"/.test(hoja) && /accessibilityState=\{\{ selected: elegido, checked: elegido/.test(hoja) && /accessibilityRole="header"/.test(hoja)
    && /accessibilityLiveRegion="polite"/.test(hoja) && /announceForAccessibility/.test(hoja) && /accessibilityViewIsModal/.test(hoja) && /busy: ocupado/.test(hoja));
  check('133) la elección no depende solo del color: lleva su icono', /name=\{elegido \? 'radio-button-on' : 'radio-button-off'\}/.test(hoja));
  check('134) objetivos táctiles de 44 o más, y sin movimiento si la persona lo pidió',
    /const ALTO_DE_OPCION = Math\.max\(44, scale\(48\)\);/.test(hoja) && /const ALTO_DE_ENLACE = Math\.max\(44, scale\(44\)\);/.test(hoja) && /minHeight: ALTO_DE_OPCION/.test(hoja)
    && /minHeight: ALTO_DE_BOTON/.test(hoja) && /minHeight: ALTO_DE_ENLACE/.test(hoja) && /isReduceMotionEnabled/.test(hoja) && /sinMovimiento \? 'none' : 'slide'/.test(hoja));
  check('134b) en la web el estado de cada motivo llega al lector de pantalla: `aria-checked`, que es lo que React Native Web publica', /aria-checked=\{elegido\}/.test(hoja) && /aria-busy=\{ocupado\}/.test(hoja));
  check('135) en el teléfono es la hoja inferior de siempre; en escritorio, un diálogo centrado', /isDesktop && styles\.contenedorDeEscritorio/.test(hoja) && /justifyContent: 'flex-end'/.test(hoja) && /onRequestClose=\{cerrar\}/.test(hoja));
  /* Texto suelto entre una etiqueta y su cierre: `>Enviar</Text>`. Todo lo que pinta esta hoja tiene que venir de `{t(…)}`. */
  const sueltos = hoja.match(/>\s*[A-Za-zÁÉÍÓÚáéíóúñ¿¡][^<>{}]*<\//g) || [];
  check('136) toda frase sale de i18n: ni una escrita a mano', sueltos.length === 0 && (hoja.match(/\{t\(/g) || []).length >= 12, sueltos.join(' | '));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── G · Idiomas: los que haya, y sin dar por hecho que se lee de izquierda a derecha ──');
{
  const DIR = 'i18n/textos';
  /* Los idiomas se LEEN de la carpeta. El día que llegue el japonés o el árabe, esta suite los exige sin tocarla. */
  const locales = fs.readdirSync(path.resolve(RAIZ, DIR), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  const clavesDe = (loc) => [...leer(`${DIR}/${loc}/moderation.ts`).matchAll(/^ {2}([A-Za-z][A-Za-z0-9_]*): '(.*)',$/gm)].map(([, k, v]) => [k, v]);
  const es = clavesDe('es');
  check('137) el español define veinticuatro claves, y todas con texto', es.length === 24 && es.every(([, v]) => v.trim().length > 0));
  const sinModulo = locales.filter((l) => !existe(`${DIR}/${l}/moderation.ts`));
  check(`138) los ${locales.length} diccionarios que existen tienen el módulo`, sinModulo.length === 0 && locales.length >= 11, sinModulo.join(', '));
  const desparejos = locales.filter((l) => !igual(clavesDe(l).map(([k]) => k), es.map(([k]) => k)) || clavesDe(l).some(([, v]) => !v.trim()));
  check('139) con exactamente las mismas claves, en el mismo orden y sin huecos', desparejos.length === 0, desparejos.join(', '));
  const sinRegistrar = locales.filter((l) => !/import \{ moderation \} from '\.\/moderation';/.test(leer(`${DIR}/${l}/index.ts`)) || !/^ {2}moderation,$/m.test(leer(`${DIR}/${l}/index.ts`)));
  check('140) y registrado en su índice', sinRegistrar.length === 0, sinRegistrar.join(', '));
  check('141) la marca no se traduce: «Weë» en la confirmación de todos', locales.every((l) => clavesDe(l).find(([k]) => k === 'successBody')[1].includes('Weë')));
  check('142) tipados contra el español: si falta una clave, no compila', locales.filter((l) => l !== 'es').every((l) => /export const moderation: typeof import\('\.\.\/es\/moderation'\)\.moderation = \{/.test(leer(`${DIR}/${l}/moderation.ts`))));
  const copiados = locales.filter((l) => l !== 'es' && l !== 'pt-PT' && clavesDe(l).filter(([k, v]) => k !== 'reasonSpam' && v === es.find(([k2]) => k2 === k)[1]).length > 2);
  check('143) traducidos de verdad, no copiados del español', copiados.length === 0, copiados.join(', '));

  const PROMESAS = { es: /revis|elimin|borr|quitar/i, en: /review|remov|delet|taken down/i, pt: /analis|remov|exclu/i, 'pt-PT': /analis|remov|elimin/i, fr: /examin|supprim|retir/i, it: /esamin|rimoss|elimin/i, de: /prüf|entfern|gelösch/i };
  const prometen = Object.entries(PROMESAS).filter(([l, re]) => ['successTitle', 'successBody', 'duplicateTitle', 'duplicateBody'].some((k) => re.test(clavesDe(l).find(([k2]) => k2 === k)[1])));
  check('144) SIN PROMESAS FALSAS: la confirmación dice que se recibió. No que se revisó, ni que se quitó nada', prometen.length === 0, prometen.map(([l]) => l).join(', '));
  const viejas = locales.filter((l) => /^ {2}report(Post|Why|Spam|Offensive|Other|Sent|Thanks):/m.test(leer(`${DIR}/${l}/wall.ts`)));
  check('145) y la frase vieja —«lo revisaremos pronto»— ya no está en ningún diccionario', viejas.length === 0, viejas.join(', '));

  /* La dirección de lectura es un DATO del idioma. */
  const catalogo = leer('i18n/idiomas.ts');
  check('146) la dirección vive en el catálogo de idiomas, y el árabe ya está declarado RTL sin estar ofrecido',
    /direccion: 'ltr' \| 'rtl';/.test(catalogo) && /\{ codigo: 'ar', nombreNativo: '[^']+', direccion: 'rtl', listo: false \}/.test(catalogo) && /export const direccionDe = \(codigo: string\)/.test(catalogo));
  check('147) y el contexto de idioma la entrega a quien monte layouts', /direccion: direccionDe\(idioma\)/.test(leer('contexts/IdiomaContext.tsx')));
  const ts = require('typescript');
  const js = ts.transpileModule(leer('hooks/useDireccion.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} };
  new Function('exports', 'require', 'module', js)(mod.exports, () => ({ useMemo: (f) => f(), useIdioma: () => ({ direccion: 'rtl' }) }), mod);
  const rtl = mod.exports.estilosDeDireccion('rtl'), ltr = mod.exports.estilosDeDireccion('ltr');
  check('148) la costura de los componentes: de una dirección salen el sentido del layout, el del texto y el espejo de los iconos que señalan',
    rtl.esRTL && rtl.contenedor.direction === 'rtl' && rtl.texto.writingDirection === 'rtl' && igual(rtl.espejo.transform, [{ scaleX: -1 }])
    && !ltr.esRTL && ltr.contenedor.direction === 'ltr' && igual(ltr.espejo.transform, []));
  check('149) el hook la saca del idioma activo, no de una lista de idiomas', mod.exports.useDireccion().direccion === 'rtl' && !/'ar'|'he'|'fa'|'ur'|arabic|árabe' ===/.test(sinComentarios(leer('hooks/useDireccion.ts'))));
  check('150) nada aquí activa RTL global: ni `I18nManager`, ni `forceRTL`, ni el `dir` de la página', !/I18nManager|forceRTL|allowRTL|documentElement|setAttribute\(['"]dir/.test(sinComentarios(leer('hooks/useDireccion.ts')) + sinComentarios(leer('components/ReportSheet.tsx'))));

  const hoja = sinComentarios(leer('components/ReportSheet.tsx'));
  check('151) la hoja de denunciar usa la costura: sentido en su raíz y en sus textos', /useDireccion\(\)/.test(hoja) && /\n\s*sentido,\n/.test(hoja) && (hoja.match(/sentidoDelTexto/g) || []).length >= 8);
  const fisicas = hoja.match(/(margin|padding|border)(Left|Right)\w*:|^\s*(left|right):|textAlign: '(left|right)'|row-reverse/gm) || [];
  check('152) no da por hecho que se lee de izquierda a derecha: ninguna propiedad física de lado, ningún `row-reverse`', fisicas.length === 0, fisicas.join(' '));
  check('153) ni separa letras ni fuerza mayúsculas en texto traducido: eso rompe la escritura árabe', !/letterSpacing|textTransform/.test(hoja));
  check('154) sus iconos no señalan ningún sentido, así que no hay nada que reflejar', !/name="(chevron|arrow|caret)-/.test(hoja) && !/name=\{[^}]*(chevron|arrow)-/.test(hoja));

  /* Añadir un idioma no toca la moderación. */
  const LOGICA = ['functions/src/core/moderation.ts', 'functions/src/moderation/index.ts', 'services/moderationService.ts', 'components/ReportSheet.tsx', 'hooks/useDireccion.ts'];
  const CODIGOS = /['"`](es|en|de|fr|it|pt|pt-PT|pt-BR|ru|ko|zh|zh-TW|zh-CN|ja|ar|nl|he)['"`]/;
  const conIdiomas = LOGICA.filter((a) => CODIGOS.test(sinComentarios(leer(a))) || /idioma ===|locale ===|\.startsWith\(['"](es|en|ar)/.test(sinComentarios(leer(a))));
  check('155) AÑADIR UN IDIOMA NO TOCA LA MODERACIÓN: ni el contrato, ni el servidor, ni el servicio, ni la hoja nombran un idioma', conIdiomas.length === 0, conIdiomas.join(', '));
  check('156) el servidor no sabe de idiomas: contesta códigos, y el texto lo pone el cliente en el suyo',
    !/\blocale\b|\bidioma\b|\blanguage\b|i18n|\bt\(/i.test(sinComentarios(leer('functions/src/moderation/index.ts')) + sinComentarios(leer('functions/src/core/moderation.ts')))
    && /reason: error\.code/.test(leer('functions/src/moderation/index.ts')));
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
