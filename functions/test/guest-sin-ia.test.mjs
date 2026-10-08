/*
 * GUEST AI GATE — UN INVITADO NO GENERA NADA Y NO RECIBE CREDITS (decisión del dueño, 2026-10-07).
 *
 *   node test/guest-sin-ia.test.mjs
 *
 * Una sesión de Firebase Anonymous («Entrar como invitado») es SOLO exploración. Esta suite EJECUTA las callables
 * compiladas con el token tal cual lo firma Firebase (`token.firebase.sign_in_provider === 'anonymous'`) y comprueba
 * que todas se paran con `ACCOUNT_REQUIRED` ANTES de cualquier efecto: no se inicializa la cuenta de Credits (que da
 * la bienvenida), no se reserva ni se cobra, no se llama a un proveedor, no se toca Firestore. Firestore ni siquiera
 * está inicializado aquí (no hay `initializeApp`): si una callable llegara a él antes de la barrera, fallaría con otro
 * error y la prueba lo diría.
 *
 * Determinista y sin red. Lo que depende de las ramas sin integrar (edad 18+, país, jurisdicción) se marca como
 * «INTEGRACIÓN» y no se finge aquí.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib', p));
const leer = (p) => fs.readFileSync(path.resolve(here, '..', p), 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

/* ── Lo que se cuenta: cada efecto de dinero o de proveedor ─────────────────────────────────────────────── */
const motor = lib('credits/creditEngine.js').creditEngine;
const vertex = lib('vertexAI.js');
const efectos = { ensureAccount: 0, getBalance: 0, readBalance: 0, spendCredits: 0, grant: 0, proveedor: 0 };
const reiniciar = () => { for (const k of Object.keys(efectos)) efectos[k] = 0; };
motor.ensureAccount = async () => { efectos.ensureAccount++; return { balance: 240, welcomeGranted: true }; };
motor.getBalance = async (u) => { efectos.getBalance++; return { userId: u, balance: 240, lifetimeEarned: 240, lifetimeSpent: 0 }; };
motor.readBalance = async (u) => { efectos.readBalance++; return { userId: u, balance: 0, lifetimeEarned: 0, lifetimeSpent: 0, initialized: false }; };
motor.spendCredits = async () => { efectos.spendCredits++; return { status: 'AUTHORIZED', amount: 1 }; };
motor.grantCredits = async () => { efectos.grant++; return {}; };
vertex.generateAvatarWithImagen = async () => { efectos.proveedor++; return 'data:image/png;base64,AAAA'; };
vertex.uploadImageToStorage = async () => { efectos.proveedor++; return 'https://x'; };

const sesion = lib('identity/sesion.js');
/* El enrolamiento (registro 18+ con país) se lee de Firestore; aquí, de un conjunto. Lo LEE solo quien ya pasó el token. */
const enrolados = new Set();
const lecturasDeEnrolamiento = [];
sesion.enrolamiento.leer = async (uid) => { lecturasDeEnrolamiento.push(uid); return enrolados.has(uid); };
const creator = lib('creator/index.js');
const brain = lib('creator/brain.js');
const video = lib('creator/video.js');
const mundo = lib('creator/mundo.js');
const avatar = lib('generateAvatar.js');
const credits = lib('credits/index.js');

const INVITADO = { uid: 'guest0001', token: { firebase: { sign_in_provider: 'anonymous', identities: {} } } };
const REGISTRADO = { uid: 'real0001', token: { firebase: { sign_in_provider: 'password', identities: {} } } };
const ADMIN_INVITADO = { uid: 'guest0002', token: { admin: true, firebase: { sign_in_provider: 'anonymous' } } };

const intento = (callable, auth, data = {}) => callable.run({ auth, data }).then((v) => ({ ok: true, v }), (e) => ({ ok: false, e }));
const codigoDe = (r) => (r.ok ? 'ok' : String(r.e?.details?.code || r.e?.code || r.e?.message));
const esCuentaRequerida = (r) => !r.ok && r.e?.details?.code === 'ACCOUNT_REQUIRED' && r.e?.code === 'unauthenticated';
const sinEfectos = () => Object.values(efectos).every((n) => n === 0);

/* ── 1 · La barrera, pura ─────────────────────────────────────────────────────────────────────────────── */
check('1) anónimo (token de Firebase) → invitado', sesion.esInvitado(INVITADO) === true);
check('2) password / google.com / apple.com / phone / custom → cuenta autenticada',
  ['password', 'google.com', 'apple.com', 'phone', 'custom'].every((p) => sesion.esCuentaAutenticada({ uid: 'u', token: { firebase: { sign_in_provider: p } } })));
check('3) fail-closed: sin auth, sin token, sin firebase, proveedor vacío o no texto → NO autenticada',
  [null, undefined, { uid: 'u' }, { uid: 'u', token: {} }, { uid: 'u', token: { firebase: {} } },
    { uid: 'u', token: { firebase: { sign_in_provider: '' } } }, { uid: 'u', token: { firebase: { sign_in_provider: 7 } } },
    { uid: '', token: { firebase: { sign_in_provider: 'password' } } }].every((a) => !sesion.esCuentaAutenticada(a)));
check('4) lo que manda el cliente no cuenta: isGuest:false / profileType:"real" / isVerified en el token no cambian nada',
  sesion.esInvitado({ uid: 'u', token: { isGuest: false, profileType: 'real', isVerified: true, firebase: { sign_in_provider: 'anonymous' } } }));
let lanzado = null;
try { sesion.exigirCuentaAutenticada(INVITADO); } catch (e) { lanzado = e; }
check('5) exigirCuentaAutenticada lanza ACCOUNT_REQUIRED con la frase sin detalles técnicos',
  lanzado?.code === 'ACCOUNT_REQUIRED' && /crea o inicia sesión/.test(lanzado.message) && !/anonymous|firebase|token|provider/i.test(lanzado.message));

/* ── 2 · Cada callable de IA: el invitado se para ANTES de cualquier efecto ──────────────────────────────── */
const CALLABLES = [
  ['creatorChat', creator.creatorChat, { experienceId: 'design', goal: 'un logo' }],
  ['creatorQuote', creator.creatorQuote, { jobId: 'job_x' }],
  ['creatorRun', creator.creatorRun, { jobId: 'job_x' }],
  ['brainQuote', brain.brainQuote, { message: 'hola' }],
  ['brainChat', brain.brainChat, { message: 'hola', messageId: 'm_aaaa1111' }],
  ['generateVideo', video.generateVideo, { prompt: 'un gato', requestId: 'req_aaaa1111' }],
  ['generateWorld', mundo.generateWorld, { op: 'crear', prompt: 'un bosque' }],
  ['generateAvatarWithGemini', avatar.generateAvatarWithGemini, { selections: { gender: 'female' }, requestId: 'avatar_g1' }],
  ['avatarReplacement', avatar.avatarReplacement, { selfieUrl: 'x', avatarUrl: 'y', requestId: 'avatar_g2' }],
];
for (const [nombre, callable, data] of CALLABLES) {
  reiniciar();
  const r = await intento(callable, INVITADO, data);
  check(`6) ${nombre}: invitado → ACCOUNT_REQUIRED, sin Credits, sin reserva, sin proveedor`, esCuentaRequerida(r) && sinEfectos(),
    `${codigoDe(r)} ${JSON.stringify(efectos)}`);
}
for (const [nombre, callable, data] of CALLABLES) {
  reiniciar();
  const r = await intento(callable, { uid: 'u-sin-token' }, data);
  check(`7) ${nombre}: token sin proveedor (indeterminable) → ACCOUNT_REQUIRED (fail-closed)`, esCuentaRequerida(r) && sinEfectos(), codigoDe(r));
}

/* ── 3 · Autenticado SIN registro terminado: tampoco genera (cuenta Weë válida = autenticada + enrolada) ───── */
{
  check('8a) el invitado se para en el TOKEN: nunca se llegó a leer su enrolamiento', !lecturasDeEnrolamiento.includes('guest0001'));
  for (const [nombre, callable, data] of CALLABLES.filter(([n]) => !/Quote$/.test(n))) {
    reiniciar();
    const r = await intento(callable, REGISTRADO, data);
    check(`8b) ${nombre}: autenticado que se saltó el registro (sin fecha 18+ ni país) → ACCOUNT_REQUIRED, sin efectos`,
      esCuentaRequerida(r) && sinEfectos(), `${codigoDe(r)} ${JSON.stringify(efectos)}`);
  }
}

/* ── 3b · E) se registra después → flujo normal: la barrera se cruza y sigue lo de siempre ───────────────── */
{
  enrolados.add('real0001'); enrolados.add('g1');
  reiniciar();
  const r = await intento(creator.creatorRun, REGISTRADO, {});
  check('8) creatorRun registrado y enrolado: cruza la barrera y sigue a su validación (INVALID_REQUEST por falta de jobId)',
    !r.ok && r.e?.details?.code === 'INVALID_REQUEST', codigoDe(r));
  const q = await intento(creator.creatorQuote, REGISTRADO, {});
  check('9) creatorQuote registrado: cruza la barrera (INVALID_REQUEST, no ACCOUNT_REQUIRED)', !q.ok && q.e?.details?.code === 'INVALID_REQUEST', codigoDe(q));
  const b = await intento(brain.brainChat, { uid: 'g1', token: { firebase: { sign_in_provider: 'google.com' } } }, { message: '' });
  check('10) brainChat registrado (google.com): cruza la barrera (falla en el mensaje vacío, no en la cuenta)',
    !b.ok && b.e?.details?.code !== 'ACCOUNT_REQUIRED', codigoDe(b));
  reiniciar();
  const a = await intento(avatar.generateAvatarWithGemini, REGISTRADO, {});
  check('11) avatar registrado: cruza la barrera (invalid-argument por falta de selecciones), sin efectos', !a.ok && a.e?.code === 'invalid-argument' && sinEfectos(), codigoDe(a));
}

/* ── 4 · Credits: el invitado recibe 0 ────────────────────────────────────────────────────────────────── */
{
  reiniciar();
  const r = await intento(credits.getCreditsBalance, INVITADO);
  check('12) getCreditsBalance invitado: se LEE (readBalance) y NO se inicializa la cuenta → sin bienvenida, saldo 0',
    r.ok && r.v.balance === 0 && efectos.readBalance === 1 && efectos.getBalance === 0 && efectos.ensureAccount === 0 && !('initialized' in r.v),
    `${codigoDe(r)} ${JSON.stringify(efectos)}`);
  reiniciar();
  const g = await intento(credits.getCreditsBalance, REGISTRADO);
  check('13) getCreditsBalance registrado: el camino de siempre (getBalance, que da la bienvenida una vez)', g.ok && efectos.getBalance === 1 && efectos.readBalance === 0);
  reiniciar();
  const p = await intento(credits.validatePurchaseCallable, INVITADO, { provider: 'test', packageId: 'p' });
  check('14) validatePurchase invitado → ACCOUNT_REQUIRED, sin ensureAccount (ni bienvenida ni compra)', esCuentaRequerida(p) && sinEfectos(), codigoDe(p));
  reiniciar();
  const s = await intento(credits.spendCredits, ADMIN_INVITADO, { service: 'ai_brain', requestId: 'job_abcd1234' });
  check('15) spendCredits con un token anónimo (aunque traiga admin) → ACCOUNT_REQUIRED, sin gasto', esCuentaRequerida(s) && sinEfectos(), codigoDe(s));
}

/* ── 5 · Rutas indirectas y alcance: lo que se lee en el código ───────────────────────────────────────── */
const fuentes = {
  'creator/index.ts': leer('src/creator/index.ts'), 'creator/brain.ts': leer('src/creator/brain.ts'), 'creator/video.ts': leer('src/creator/video.ts'),
  'creator/mundo.ts': leer('src/creator/mundo.ts'), 'generateAvatar.ts': leer('src/generateAvatar.ts'), 'credits/index.ts': leer('src/credits/index.ts'),
};
const antes = (src, a, b) => { const i = src.indexOf(a); const j = src.indexOf(b, i); return i >= 0 && j > i; };
check('16) en cada callable que genera, la condición «cuenta Weë válida» va ANTES de ensureAccount / cobro / proveedor; las cotizaciones, solo el token',
  antes(fuentes['creator/brain.ts'], 'await exigirCuentaWeeValida(request.auth)', 'ensureAccount(uid)')
  && antes(fuentes['creator/video.ts'], 'await exigirCuentaWeeValida(request.auth)', 'ensureAccount(uid)')
  && antes(fuentes['creator/mundo.ts'], 'await exigirCuentaWeeValida(request.auth)', 'ensureAccount(uid)')
  && (fuentes['creator/index.ts'].match(/await exigirCuentaWeeValida\(request\.auth\)/g) || []).length === 2
  && (fuentes['creator/index.ts'].match(/exigirCuentaAutenticada\(request\.auth\)/g) || []).length === 1
  && (fuentes['creator/brain.ts'].match(/exigirCuentaAutenticada\(request\.auth\)/g) || []).length === 1
  && (fuentes['generateAvatar.ts'].match(/await exigirCuentaWeeValida\(request\.auth\)/g) || []).length === 2
  && antes(fuentes['generateAvatar.ts'], 'await exigirCuentaWeeValida(request.auth)', 'withCredits('));
const nacimiento = leer('src/identity/nacimiento.ts');
check('17) nacimientoDeCuenta no da Credits (la bienvenida solo nace en ensureAccount, que el invitado ya no alcanza)',
  !/ensureAccount|grantCredits|WELCOME_CREDITS|creditsBalance/.test(nacimiento));
/* Perfil Weë: la regla no lo toca. Crear la cara social seudónima es de la app (usersService), no de una callable de IA. */
check('18) Perfil Weë no se bloquea: identidad social (utils/perfilCanonico, usersService) sin la barrera del invitado',
  !/exigirCuentaAutenticada|sign_in_provider/.test(fs.readFileSync(path.resolve(here, '../../utils/perfilCanonico.ts'), 'utf8'))
  && !/exigirCuentaAutenticada/.test(nacimiento));

console.log('\nINTEGRACIÓN (no en origin/main, se cubren en sus ramas): autenticado menor de 18 / sin fecha de nacimiento → `scratchpad/edad-18`');
console.log('(`exigirCuentaWeeValida`, que va DESPUÉS de esta barrera y valida la fecha con identity/edad.ts); país inválido / jurisdicción → `scratchpad/fase1-jurisdiccion`.');

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ Guest AI Gate: el invitado explora y no genera');
process.exit(failures ? 1 : 0);
