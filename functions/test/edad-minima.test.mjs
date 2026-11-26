/*
 * LA EDAD MÍNIMA DE WEË ES 18 — y se valida UNA vez, en el registro (la app avisa, las reglas deciden).
 *
 * ── Qué vigila ─────────────────────────────────────────────────────────────
 *
 *   A  la decisión pura (`functions/src/identity/edad.ts`): 17 → no; cumple 18 hoy → sí; 18 → sí; fecha ausente,
 *      mal escrita, inexistente o futura → no; 29 de febrero; y la zona horaria (UTC−12, la más restrictiva).
 *   B  el ESPEJO de la app (`utils/edadMinima.ts`) dice exactamente lo mismo en cada caso, con el mismo número.
 *   C  las reglas de Firestore: el mismo número y el mismo desfase, la fecha obligatoria y de 18+ al crear la cuenta
 *      privada, fija una vez guardada, sin borrar, y el perfil público sigue sin poder llevar `birthDate`.
 *   D  «cuenta Weë válida» (`identity/sesion.ts`): el HECHO del enrolamiento (fecha guardada bajo las reglas + país)
 *      y el VALOR de esa fecha validado con la regla pura única (corrección F); falla cerrada.
 *   E  después del registro NINGUNA función repite la edad; las que generan piden solo la condición única.
 *   F  la app: el registro avisa con el mensaje correcto, guarda la cuenta antes de marcarse terminado, y los
 *      textos (registro, ayuda, Weë AI, términos) dicen 18 en todos los idiomas.
 *
 * Sin red, sin emulador, determinista: el instante se fija en cada caso. Las reglas se prueban DE VERDAD contra el
 * emulador en `fronteras-rules.emulator.mjs` (sección I, casos 57–73).
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import os from 'node:os';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const lib = (p) => require(path.resolve(here, '../lib', p));
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

/* ── Firestore de mentira (antes de cargar nada que la use) ─────────────── */
const firestore = require('firebase-admin/firestore');
let docs = new Map();
let fallarLecturas = false;
const snap = (p) => ({ exists: docs.has(p), id: p.split('/').pop(), ref: ref(p), data: () => docs.get(p) });
const ref = (p) => ({
  id: p.split('/').pop(),
  path: p,
  collection: (sub) => coleccion(`${p}/${sub}`),
  get: async () => { if (fallarLecturas) throw new Error('sin red'); return snap(p); },
});
const coleccion = (c) => ({
  doc: (id) => ref(`${c}/${id}`),
  where: (campo, op, valor) => ({
    limit: () => ({
      get: async () => {
        if (fallarLecturas) throw new Error('sin red');
        const encontrados = [...docs.keys()]
          .filter((k) => k.startsWith(c + '/') && k.split('/').length === c.split('/').length + 1 && docs.get(k)[campo] === valor)
          .map(snap);
        return { empty: encontrados.length === 0, docs: encontrados };
      },
    }),
  }),
});
firestore.getFirestore = () => ({ collection: coleccion });

const E = lib('identity/edad.js');

/* ── A · La decisión pura ───────────────────────────────────────────────── */
/* 7 de octubre de 2026, 12:00 UTC: en UTC−12 son las 00:00 del 7. */
const AHORA = Date.UTC(2026, 9, 7, 12, 0, 0);
const casos = [
  ['2008-10-07', 'OK', 'cumple 18 HOY → entra'],
  ['2008-10-08', 'MENOR', '17 años: cumple 18 mañana → no'],
  ['2009-01-01', 'MENOR', '17 años → no'],
  ['2012-05-05', 'MENOR', '14 años (antes bastaban 13) → no'],
  ['2008-10-06', 'OK', '18 años y un día → entra'],
  ['2000-01-01', 'OK', '26 años → entra'],
  ['1900-01-01', 'OK', 'el año más antiguo admitido'],
  ['2026-10-08', 'FUTURA', 'mañana → no'],
  ['2030-01-01', 'FUTURA', 'futura → no'],
  [undefined, 'AUSENTE', 'sin fecha → no'],
  [null, 'AUSENTE', 'null → no'],
  ['', 'AUSENTE', 'cadena vacía → no'],
  ['2008-02-30', 'INVALIDA', '30 de febrero no existe'],
  ['2007-02-29', 'INVALIDA', '2007 no es bisiesto'],
  ['2008-04-31', 'INVALIDA', '31 de abril no existe'],
  ['2008-13-01', 'INVALIDA', 'mes 13'],
  ['2008-00-10', 'INVALIDA', 'mes 0'],
  ['2008-10-00', 'INVALIDA', 'día 0'],
  ['07-10-2008', 'INVALIDA', 'otro formato'],
  ['2008-1-7', 'INVALIDA', 'sin ceros'],
  ['2008-10-07T00:00:00Z', 'INVALIDA', 'con hora: no es una fecha de calendario'],
  [' 2008-10-07', 'INVALIDA', 'con espacio'],
  ['1899-12-31', 'INVALIDA', 'anterior a 1900'],
  [20081007, 'INVALIDA', 'un número no es una fecha'],
  [{ anio: 2000 }, 'INVALIDA', 'un objeto no es una fecha'],
];
for (const [fecha, esperado, por] of casos) {
  const v = E.veredictoDeEdad(fecha, AHORA);
  check(`A) ${JSON.stringify(fecha)} → ${esperado} (${por})`, v === esperado, v);
}
check('A) EDAD_MINIMA es 18', E.EDAD_MINIMA === 18);
check('A) un Date y un número dan lo mismo', E.veredictoDeEdad('2008-10-07', new Date(AHORA)) === E.veredictoDeEdad('2008-10-07', AHORA));

/* 29 de febrero: en un año no bisiesto se cumple el 1 de marzo. */
check('A) nacido el 29-02-2008: el 28-02-2026 aún tiene 17', E.veredictoDeEdad('2008-02-29', Date.UTC(2026, 1, 28, 23, 0)) === 'MENOR');
check('A) nacido el 29-02-2008: el 01-03-2026 (12:00 UTC) ya tiene 18', E.veredictoDeEdad('2008-02-29', Date.UTC(2026, 2, 1, 12, 0)) === 'OK');

/* Zonas horarias: «hoy» es la fecha en UTC−12. */
check('A) zona: 07-10 a las 11:59:59 UTC todavía es 06-10 en UTC−12 → aún 17',
  E.veredictoDeEdad('2008-10-07', Date.UTC(2026, 9, 7, 11, 59, 59)) === 'MENOR');
check('A) zona: 07-10 a las 12:00:00 UTC ya es 07-10 en todo el planeta → 18',
  E.veredictoDeEdad('2008-10-07', Date.UTC(2026, 9, 7, 12, 0, 0)) === 'OK');
check('A) zona: medianoche UTC del cumpleaños (00:30Z) — en UTC−12 aún no lo es → no (restrictivo)',
  E.veredictoDeEdad('2008-10-07', Date.UTC(2026, 9, 7, 0, 30)) === 'MENOR');
check('A) zona: 06-10 23:00Z (ya 07-10 en Kiribati, UTC+14) → no: nadie entra antes de su cumpleaños en UTC−12',
  E.veredictoDeEdad('2008-10-07', Date.UTC(2026, 9, 6, 23, 0)) === 'MENOR');
check('A) zona: el veredicto no depende de la zona del proceso (TZ)', (() => {
  const antes = process.env.TZ;
  const r = [];
  for (const tz of ['UTC', 'Pacific/Kiritimati', 'Pacific/Pago_Pago', 'America/Mexico_City', 'Europe/Madrid']) {
    process.env.TZ = tz;
    r.push(E.veredictoDeEdad('2008-10-07', Date.UTC(2026, 9, 7, 11, 0)), E.veredictoDeEdad('2008-10-07', Date.UTC(2026, 9, 7, 13, 0)));
  }
  if (antes === undefined) delete process.env.TZ; else process.env.TZ = antes;
  return r.every((v, i) => v === (i % 2 === 0 ? 'MENOR' : 'OK'));
})());
check('A) hoyEnLaZonaMasRestrictiva(07-10 05:00Z) = 06-10', JSON.stringify(E.hoyEnLaZonaMasRestrictiva(Date.UTC(2026, 9, 7, 5))) === JSON.stringify({ anio: 2026, mes: 10, dia: 6 }));

/* ── B · El espejo de la app ─────────────────────────────────────────────── */
const ts = require('typescript');
const fuenteApp = leer('utils/edadMinima.ts');
const js = ts.transpileModule(fuenteApp, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const tmp = path.join(os.tmpdir(), `edad-minima-espejo-${process.pid}.mjs`);
fs.writeFileSync(tmp, js);
const A = await import(pathToFileURL(tmp).href);
fs.unlinkSync(tmp);
check('B) la app no importa nada (pura, sin Firebase)', !/^import /m.test(fuenteApp));
check('B) mismo número, mismo desfase, mismo año mínimo, mismo código',
  A.EDAD_MINIMA === E.EDAD_MINIMA && A.DESFASE_DE_LA_ZONA_MAS_RESTRICTIVA_H === E.DESFASE_DE_LA_ZONA_MAS_RESTRICTIVA_H
  && A.ANIO_MINIMO_DE_NACIMIENTO === E.ANIO_MINIMO_DE_NACIMIENTO && A.CODIGO_DE_EDAD_MINIMA === E.CODIGO_DE_EDAD_MINIMA);
{
  const fechas = [...casos.map((c) => c[0]), '2008-02-29', '2004-02-29', '2008-12-31', '2009-01-01', '1999-06-15'];
  const instantes = [AHORA, Date.UTC(2026, 9, 7, 11, 59, 59), Date.UTC(2026, 1, 28, 23), Date.UTC(2026, 2, 1, 12), Date.UTC(2027, 0, 1, 12), Date.UTC(2028, 1, 29, 12)];
  const distintos = [];
  for (const f of fechas) for (const i of instantes) {
    if (A.veredictoDeEdad(f, i) !== E.veredictoDeEdad(f, i)) distintos.push(`${JSON.stringify(f)}@${new Date(i).toISOString()}`);
  }
  check(`B) app y servidor dan el mismo veredicto en ${fechas.length * instantes.length} casos`, distintos.length === 0, distintos.join(', '));
}

/* ── C · Las reglas ──────────────────────────────────────────────────────── */
const reglas = leer('firestore.rules');
check('C) las reglas usan el mismo número que el servidor', new RegExp(`function edadMinimaDeWee\\(\\) \\{\\s*return ${E.EDAD_MINIMA};`).test(reglas));
check('C) y el mismo desfase de zona (UTC−12)', reglas.includes(`request.time - duration.value(${E.DESFASE_DE_LA_ZONA_MAS_RESTRICTIVA_H}, 'h')`));
check('C) y el mismo año mínimo', reglas.includes(`a >= ${E.ANIO_MINIMO_DE_NACIMIENTO}`));
check('C) la fecha es AAAA-MM-DD, real (días del mes, bisiestos) y de 18+',
  reglas.includes("f.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}$')") && /d <= diasDelMes\(a, m\)/.test(reglas) && /function esBisiesto\(a\)/.test(reglas));
{
  const privado = reglas.slice(reglas.indexOf('match /private/{documento}'), reglas.indexOf('match /bookmarks/{postId}'));
  check('C) crear la cuenta privada EXIGE la fecha y que sea de 18+',
    /allow create: if esDuenyoDelPerfil\(userId\) && documento == 'account' &&\s*request\.resource\.data\.keys\(\)\.hasOnly\(camposPrivadosDeCuenta\(\)\) &&\s*'birthDate' in request\.resource\.data &&\s*fechaDeNacimientoAdulta\(request\.resource\.data\.birthDate\);/.test(privado));
  check('C) actualizarla exige la fecha FIJA (o ponerla por primera vez, de 18+)',
    /allow update: if [^;]*fechaDeNacimientoFija\(\);/.test(privado));
  check('C) no se borra', /allow delete: if false;/.test(privado));
  check('C) ya no hay un «create, update» que deje pasar cualquier fecha', !/allow create, update:/.test(privado));
}
check('C) fechaDeNacimientoFija: si ya había fecha, tiene que seguir siendo la misma',
  /resource\.data\.birthDate != ''\)\s*\?\s*request\.resource\.data\.get\('birthDate', null\) == resource\.data\.birthDate\s*:\s*\('birthDate' in request\.resource\.data && fechaDeNacimientoAdulta\(request\.resource\.data\.birthDate\)\)/.test(reglas));
check('C) el perfil público sigue sin poder llevar `birthDate` (ni al crear ni al actualizar)',
  /function accountFields\(\) \{\s*return \[[^\]]*'birthDate'/.test(reglas) && reglas.includes('!createsAccountFields()') && reglas.includes('!touchesAccountFields()'));

/* ── D · «Cuenta Weë válida»: el HECHO del enrolamiento y el VALOR de su fecha (corrección F) ──────────────
 * Una sola condición en el servidor (`identity/sesion.ts`): autenticada + `private/account` con una fecha que la
 * regla pura única (`identity/edad.ts`) da por 18+ + país del catálogo. Un documento histórico con fecha de menor,
 * inválida o futura NO es cuenta Weë válida. El birthDate heredado de users/<id> no cuenta. */
const S = lib('identity/sesion.js');
const enrolada = (uid) => S.enrolamiento.leer(uid).then((v) => v, () => 'error');
docs = new Map([
  ['users/adulta', { uid: 'adulta', profileType: 'real', country: 'ES' }],
  ['users/adulta/private/account', { birthDate: '1990-01-01' }],
  ['users/sinPais', { uid: 'sinPais', profileType: 'real' }],
  ['users/sinPais/private/account', { birthDate: '1990-01-01' }],
  ['users/paisRaro', { uid: 'paisRaro', profileType: 'real', country: 'ZZ' }],
  ['users/paisRaro/private/account', { birthDate: '1990-01-01' }],
  ['users/sinRegistro', { uid: 'sinRegistro', profileType: 'real', country: 'ES' }],
  ['users/sinFecha', { uid: 'sinFecha', country: 'ES' }],
  ['users/sinFecha/private/account', { realName: 'Sin Fecha' }],
  /* Perfil antiguo: id automático; su enrolamiento es el mismo hecho, en su documento. */
  ['users/AutoId123', { uid: 'antigua', country: 'MX' }],
  ['users/AutoId123/private/account', { birthDate: '1985-05-05' }],
  /* Un documento users/<uid> con OTRO `uid` no es de esa cuenta. */
  ['users/impostor', { uid: 'otra-cuenta', country: 'ES' }],
  ['users/impostor/private/account', { birthDate: '1990-01-01' }],
  /* Corrección F: documentos HISTÓRICOS anteriores a la regla (las reglas de hoy no los dejarían nacer). */
  ['users/menorHist', { uid: 'menorHist', country: 'ES' }],
  ['users/menorHist/private/account', { birthDate: '2015-06-01' }],
  ['users/invalida', { uid: 'invalida', country: 'ES' }],
  ['users/invalida/private/account', { birthDate: '1990-02-30' }],
  ['users/futura', { uid: 'futura', country: 'ES' }],
  ['users/futura/private/account', { birthDate: '2999-01-01' }],
  ['users/vacia', { uid: 'vacia', country: 'ES' }],
  ['users/vacia/private/account', { birthDate: '' }],
  /* Solo el birthDate HEREDADO en el documento público (sin private/account): no es enrolamiento. */
  ['users/heredada', { uid: 'heredada', country: 'ES', birthDate: '1980-01-01' }],
  /* Cumple 18 en el instante fijado abajo (UTC−12): el límite exacto. */
  ['users/limite', { uid: 'limite', country: 'ES' }],
  ['users/limite/private/account', { birthDate: '2008-10-07' }],
]);
check('D) cuenta enrolada (fecha guardada bajo las reglas + país) → válida', (await enrolada('adulta')) === true);
check('D) sin país en el Perfil Real → no enrolada', (await enrolada('sinPais')) === false);
check('D) país fuera del catálogo → no enrolada', (await enrolada('paisRaro')) === false);
check('D) se saltó el registro (sin private/account) → no enrolada', (await enrolada('sinRegistro')) === false);
check('D) private/account sin fecha → no enrolada', (await enrolada('sinFecha')) === false);
check('D) perfil antiguo con id automático y su registro → enrolada', (await enrolada('antigua')) === true);
check('D) un documento users/<uid> con OTRO `uid` no cuenta', (await enrolada('impostor')) === false);
check('D) sin perfil (una sesión que nunca hizo el registro) → no enrolada', (await enrolada('nadie')) === false && (await enrolada('')) === false);
check('D) corrección F: fecha histórica de MENOR en private/account → no es cuenta Weë válida', (await enrolada('menorHist')) === false);
check('D) corrección F: fecha inválida (30 de febrero) → no válida', (await enrolada('invalida')) === false);
check('D) corrección F: fecha futura → no válida', (await enrolada('futura')) === false);
check('D) corrección F: fecha vacía → no válida', (await enrolada('vacia')) === false);
check('D) corrección F: solo el birthDate heredado de users/<id> (sin private/account) → no válida', (await enrolada('heredada')) === false);
{
  const enUTC12 = (iso) => Date.parse(iso) + 12 * 3_600_000; /* medianoche civil en UTC−12 */
  check('D) corrección F: cumple 18 HOY (fecha civil UTC−12) → válida', (await S.enrolamiento.leer('limite', enUTC12('2026-10-07T00:00:00Z'))) === true);
  check('D) corrección F: un día antes de cumplir 18 → no válida', (await S.enrolamiento.leer('limite', enUTC12('2026-10-06T23:59:00Z'))) === false);
}
fallarLecturas = true;
check('D) si la lectura falla → la condición falla cerrada (lanza), no deja pasar', (await enrolada('adulta')) === 'error');
fallarLecturas = false;
{
  const ses = leer('functions/src/identity/sesion.ts').replace(/\/\*[\s\S]*?\*\//g, '');
  check('D) corrección F: la condición usa LA regla única (import de ./edad, veredictoDeEdad === OK), sin un segundo cálculo',
    /import \{ veredictoDeEdad \} from '\.\/edad';/.test(ses) && /veredictoDeEdad\(datos\?\.birthDate, ahora\) === 'OK'/.test(ses)
    && !/EDAD_MINIMA|getUTCFullYear|365|\b18\b|cumpleEdadMinima/.test(ses));
  check('D) corrección F: sin puertas internas nuevas — una sola lectura del enrolamiento, en exigirCuentaWeeValida',
    (ses.match(/enrolamiento\.leer\(/g) || []).length === 1);
}

/* ── E · Post-enrolamiento: ninguna función interna repite la edad ───────────────────────────────────────── */
const intento = (p) => p.then(() => ({ ok: true }), (e) => ({ ok: false, code: e.code, detalle: e.details, mensaje: e.message }));
const AUTENTICADA = (uid) => ({ uid, token: { firebase: { sign_in_provider: 'password' } } });
const CALLABLES = [
  ['creator/index.js', 'creatorChat', { experienceId: 'design', goal: 'un logo', locale: 'es' }],
  ['creator/index.js', 'creatorRun', { jobId: 'job_x' }],
  ['creator/brain.js', 'brainChat', { message: 'hola', messageId: 'm_abcdef12' }],
  ['creator/video.js', 'generateVideo', {}],
  ['creator/mundo.js', 'generateWorld', { op: 'crear' }],
  ['generateAvatar.js', 'generateAvatarWithGemini', { prompt: 'x' }],
  ['generateAvatar.js', 'avatarReplacement', { selfieUrl: 'x', avatarUrl: 'y' }],
];
for (const [modulo, nombre, data] of CALLABLES) {
  docs = new Map([['users/sinRegistro', { uid: 'sinRegistro', profileType: 'real', country: 'ES' }]]);
  const tamano = docs.size;
  let r;
  try {
    r = await intento(Promise.resolve().then(() => lib(modulo)[nombre].run({ auth: AUTENTICADA('sinRegistro'), data })));
  } catch (e) { r = { ok: false, code: 'carga', mensaje: String(e) }; }
  check(`E) ${nombre}: autenticada sin registro terminado → ACCOUNT_REQUIRED (no un mensaje de edad), antes de escribir nada`,
    !r.ok && r.detalle?.code === 'ACCOUNT_REQUIRED' && docs.size === tamano && !/18|edad|age/i.test(String(r.mensaje)), JSON.stringify({ code: r.code, d: r.detalle, m: r.mensaje }));
}
{
  const fuentes = ['functions/src/creator/index.ts', 'functions/src/creator/brain.ts', 'functions/src/creator/video.ts', 'functions/src/creator/mundo.ts',
    'functions/src/generateAvatar.ts', 'functions/src/social/econtact.ts', 'functions/src/credits/index.ts'];
  const conEdad = fuentes.filter((f) => /elegibilidadDeCuenta|veredictoDeEdad|cumpleEdadMinima|rechazoPorEdad|identity\/edad/.test(leer(f)));
  check('E) ninguna callable (IA, ËContact, Credits) tiene una puerta de edad: la edad solo se valida en el registro', conEdad.length === 0, conEdad.join(', '));
  const usos = { 'functions/src/creator/index.ts': 2, 'functions/src/creator/brain.ts': 1, 'functions/src/creator/video.ts': 1, 'functions/src/creator/mundo.ts': 1, 'functions/src/generateAvatar.ts': 2 };
  const mal = Object.entries(usos).filter(([f, k]) => (leer(f).match(/await exigirCuentaWeeValida\(request\.auth\)/g) || []).length !== k);
  check('E) cada callable que genera pide UNA vez la condición única «cuenta Weë válida»', mal.length === 0, mal.map(([f]) => f).join(', '));
  const quote = leer('functions/src/creator/index.ts');
  const cuerpo = quote.slice(quote.indexOf('export const creatorQuote'), quote.indexOf('export const peticionesDelPlan'));
  check('E) creatorQuote: sin puerta de edad ni de enrolamiento; solo cotiza (sin spend/hold/limiter; no crea trabajo)',
    cuerpo.length > 200 && !/exigirCuentaWeeValida|elegibilidadDeCuenta|EDAD/.test(cuerpo) && !/spendCredits|holdCredits|limiter\.reserve|jobs\(\)\.add|\.create\(/.test(cuerpo));
  check('E) ËContact vuelve a ser como en main: sin puerta de edad', !/elegibilidadDeCuenta|identity\/edad/.test(leer('functions/src/social/econtact.ts')));
  check('E) identity/edad.ts queda como regla pura: sin Firestore ni HttpsError (ninguna callable la llama)',
    !/getFirestore|HttpsError|elegibilidadDeCuenta/.test(leer('functions/src/identity/edad.ts').replace(/\/\*[\s\S]*?\*\//g, '')));
}
check('E) la condición no toca el Credit Engine, el Router ni el Gateway',
  !/credits|router|gateway|registry/.test(leer('functions/src/identity/sesion.ts').split('\n').filter((l) => l.startsWith('import ')).join('\n')));

/* ── F · La app ──────────────────────────────────────────────────────────── */
const onboarding = leer('screens/OnboardingScreen.tsx');
check('F) el registro usa la regla común (veredictoDeEdad + EDAD_MINIMA) y no un 13 suelto',
  onboarding.includes("import { EDAD_MINIMA, veredictoDeEdad } from '../utils/edadMinima';")
  && onboarding.includes('const maxYear = currentYear - EDAD_MINIMA;') && !/currentYear - 13/.test(onboarding));
check('F) a quien no tiene 18 se le dice el mensaje de edad mínima, y la fecha inexistente tiene el suyo',
  onboarding.includes("notify(t('onboarding.underAgeTitle'), t('onboarding.birthDateHint', { edad: EDAD_MINIMA }));")
  && onboarding.includes("notify(t('onboarding.birthInvalidTitle'), t('onboarding.birthInvalid'));"));
check('F) la pista bajo la fecha dice el mensaje de edad mínima', onboarding.includes("{t('onboarding.birthDateHint', { edad: EDAD_MINIMA })}"));
check('F) la cuenta privada (con la fecha) se guarda ANTES de marcar el registro como terminado',
  onboarding.indexOf('usersService.guardarDatosPrivados(userProfile.id') > 0
  && onboarding.indexOf('usersService.guardarDatosPrivados(userProfile.id') < onboarding.indexOf('await updateProfile(updateData);')
  && onboarding.includes("if (!userProfile?.id) throw new Error("));
check('F) Weë AI ya no habla de edad: el servidor no rechaza por edad después del registro',
  !/EDAD_MINIMA|birthDateHint/.test(leer('services/creatorService.ts')));
check('F) el registro exige el país (cuenta válida = fecha 18+ Y país)',
  onboarding.includes("notify(t('onboarding.countryMissingTitle'), t('onboarding.countryMissing'));") && onboarding.includes("country: selectedCountry?.code || ''"));
check('F) la Ayuda tiene la pregunta de la edad, con el mismo número',
  leer('screens/HelpScreen.tsx').includes("question: 'help.q10'") && leer('screens/HelpScreen.tsx').includes("item.answer === 'help.a10' ? { edad: EDAD_MINIMA }"));

const idiomas = fs.readdirSync(path.join(RAIZ, 'i18n/textos')).filter((d) => fs.existsSync(path.join(RAIZ, 'i18n/textos', d, 'onboarding.ts')));
const esOn = leer('i18n/textos/es/onboarding.ts');
check('F) el mensaje en español es el que pidió el dueño', esOn.includes("birthDateHint: 'Weë está disponible únicamente para personas de {{edad}} años o más.',"));
for (const l of idiomas) {
  const on = leer(`i18n/textos/${l}/onboarding.ts`);
  const ay = leer(`i18n/textos/${l}/help.ts`);
  const linea = (src, k) => (src.match(new RegExp(`^  ${k}: (.*),$`, 'm')) || [])[1] || '';
  const ok = ['birthDateHint', 'underAgeTitle', 'birthInvalidTitle', 'birthInvalid'].every((k) => linea(on, k))
    && linea(on, 'birthDateHint').includes('{{edad}}') && linea(on, 'birthDateHint').includes('Weë')
    && linea(ay, 'q10') && linea(ay, 'a10').includes('{{edad}}')
    && !/\b13\b/.test(linea(on, 'birthDateHint') + linea(ay, 'a10'));
  check(`F) ${l}: registro y ayuda con la edad mínima interpolada (sin el 13)`, ok);
}
for (const f of ['legal/terms.html', 'legal/privacy-policy.html', 'public/privacy-policy.html', 'public/terms.html']) {
  const t = leer(f);
  check(`F) ${f} dice 18 y ya no 13`, /18 años/.test(t) && !/13 años/.test(t));
}

console.log(failures ? `\n✘ ${failures} fallo(s)` : `\n✔ edad mínima: ${n} comprobaciones`);
process.exit(failures ? 1 : 0);
