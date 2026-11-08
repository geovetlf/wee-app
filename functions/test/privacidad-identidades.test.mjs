/*
 * PRIVACIDAD DE IDENTIDADES — decisión STRICT del dueño (2026-11-07): nunca revelar automáticamente que dos perfiles
 * (Real y Weë) son de la misma cuenta.
 *
 *   node test/privacidad-identidades.test.mjs
 *
 * Fija lo que YA no revela la vinculación, sin emulador (las reglas van en privacidad-identidades.emulator.mjs):
 *
 *   A  las callables de ËContact devuelven la RELACIÓN PÚBLICA: sin `accountUid`, sin tipos ajenos, sin `users`
 *   B  el cliente no recibe ni escribe la cuenta de nadie (`recipientAccountId`)
 *   C  los registros de WeeTalk y de los dos disparadores de push no imprimen rutas con la cuenta ni cuentas
 *   D  los errores de ËContact son textos fijos, sin identidades ni cuentas
 *   E  la copia pública del perfil no lleva `linkedAccountId` ni ningún dato de la cuenta
 *   F  (informativo, no cuenta) lo que la SIGUE revelando: el identificador `hidi_<cuenta>` y las rutas físicas con la
 *      cuenta. Cerrarlo es la migración a identificadores opacos, que espera la autorización del dueño.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const aqui = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(aqui, '../..');
const leer = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const lib = (p) => require(path.join(RAIZ, 'functions/lib', p));

let failures = 0;
let n = 1;
const check = (nombre, cond, extra = '') => {
  console.log(`${cond ? '✔' : '✘'} ${n++}) ${nombre}${extra ? ` — ${extra}` : ''}`);
  if (!cond) failures++;
};
/** Identificadores y textos del CÓDIGO (sin comentarios). */
const nombres = (archivo, texto) => {
  const vistos = new Set();
  const visitar = (nodo) => {
    if (ts.isIdentifier(nodo)) vistos.add(nodo.text);
    if (ts.isStringLiteral(nodo) || ts.isNoSubstitutionTemplateLiteral(nodo)) vistos.add(nodo.text);
    ts.forEachChild(nodo, visitar);
  };
  visitar(ts.createSourceFile(archivo, texto, ts.ScriptTarget.Latest, true));
  return vistos;
};
/** El texto de `export const <nombre> = …` (la callable entera). */
const declaracion = (archivo, texto, nombre) => {
  const sf = ts.createSourceFile(archivo, texto, ts.ScriptTarget.Latest, true);
  const st = sf.statements.find((s) => ts.isVariableStatement(s) && s.declarationList.declarations.some((d) => ts.isIdentifier(d.name) && d.name.text === nombre));
  return st ? st.getText(sf) : '';
};
/**
 * Cada `console.*(…)` del archivo: su texto y los IDENTIFICADORES que imprime (variables y propiedades). Los textos fijos
 * («remitente sin cuenta») no son datos: se miran los identificadores, que es lo que lleva valores al registro.
 */
const registros = (archivo, texto) => {
  const out = [];
  const sf = ts.createSourceFile(archivo, texto, ts.ScriptTarget.Latest, true);
  const visitar = (nodo) => {
    if (ts.isCallExpression(nodo) && ts.isPropertyAccessExpression(nodo.expression) && ts.isIdentifier(nodo.expression.expression)
      && nodo.expression.expression.text === 'console') {
      const ids = [];
      const recoger = (x) => { if (ts.isIdentifier(x)) ids.push(x.text); ts.forEachChild(x, recoger); };
      nodo.arguments.forEach(recoger);
      out.push({ texto: nodo.arguments.map((a) => a.getText(sf)).join(', '), ids });
    }
    ts.forEachChild(nodo, visitar);
  };
  visitar(sf);
  return out;
};

console.log('── A · Las callables de ËContact devuelven la relación pública ──');
{
  const EC = lib('social/econtact.js');
  const completa = {
    contactId: 'ana_hidi_beto', status: 'pending', users: ['ana', 'hidi_beto'],
    from: { identity: 'ana', accountUid: 'ana', type: 'real' }, to: { identity: 'hidi_beto', accountUid: 'beto', type: 'wee' },
  };
  const publica = typeof EC.relacionPublica === 'function' ? EC.relacionPublica(completa) : null;
  check('relacionPublica deja la relación y las identidades que ya conoce quien llama, y nada más',
    !!publica && JSON.stringify(publica) === JSON.stringify({ contactId: 'ana_hidi_beto', status: 'pending', from: { identity: 'ana' }, to: { identity: 'hidi_beto' } }));
  check('no sale ninguna cuenta: ni `accountUid`, ni la cuenta como valor, ni tipos ajenos, ni `users`',
    !!publica && !JSON.stringify(publica).includes('accountUid') && !JSON.stringify(publica).includes('"beto"') && !('users' in publica) && !JSON.stringify(publica).includes('"type"'));
  const fuente = leer('functions/src/social/econtact.ts');
  for (const callable of ['requestEContact', 'acceptEContact']) {
    const cuerpo = declaracion('econtact.ts', fuente, callable);
    check(`${callable} devuelve relacionPublica(…) del motor, nunca el resultado del motor tal cual`,
      /return relacionPublica\(await econtactEngine\.(request|accept)\(/.test(cuerpo) && !/return await econtactEngine\./.test(cuerpo));
  }
  check('CONTROL: el detector ve una callable que devuelve el motor tal cual',
    /return await econtactEngine\./.test("export const x = onCall(OPTS, async () => { return await econtactEngine.request({}); });"));
}

console.log('\n── B · El cliente no recibe ni escribe la cuenta de nadie ──');
{
  const servicio = nombres('econtactService.ts', leer('services/econtactService.ts'));
  check('econtactService no nombra `accountUid` ni `recipientAccountId` en su código', !servicio.has('accountUid') && !servicio.has('recipientAccountId'));
  const avisos = leer('services/notificationService.ts');
  const req = declaracion('notificationService.ts', avisos, 'notificationService');
  check('notificationService no escribe `recipientAccountId` en ningún aviso (solo queda el tipo heredado, para leer los antiguos)',
    !/recipientAccountId:\s*identidad/.test(req) && !/recipientAccountId:\s*\w/.test(req.replace(/recipientAccountId\?:\s*string;/g, '')));
}

console.log('\n── C · Los registros no imprimen rutas con la cuenta ni cuentas ──');
{
  const PROHIBIDOS = new Set(['objectKey', 'accountUid', 'linkedAccountId', 'cuenta', 'cuentaQueAvisa', 'cuentaQueEscribe', 'cuentaDeLaSesion', 'cuentaDestino']);
  const imprimeCuentas = (r) => r.ids.some((id) => PROHIBIDOS.has(id));
  const archivos = ['functions/src/social/weetalk.ts', 'functions/src/social/econtact.ts', 'functions/src/social/weetalkBloqueos.ts',
    'functions/src/social/avisos.ts', 'functions/src/index.ts'];
  for (const f of archivos) {
    const malos = registros(f, leer(f)).filter(imprimeCuentas);
    check(`${f}: ningún console.* imprime rutas con la cuenta ni cuentas`, malos.length === 0, malos.map((m) => m.texto).join(' | ').slice(0, 200));
  }
  check('CONTROL: el detector ve un registro con la ruta de la foto o con la cuenta, y no confunde un texto fijo con un dato',
    registros('x.ts', "console.warn('x', { objectKey: ref.objectKey });").some(imprimeCuentas)
    && registros('x.ts', "console.error('cupo', cuenta, error);").some(imprimeCuentas)
    && !registros('x.ts', "console.warn('remitente sin cuenta');").some(imprimeCuentas));
}

console.log('\n── D · Los errores de ËContact son textos fijos ──');
{
  const EC = lib('social/econtact.js');
  const mensajes = Object.values(EC.MENSAJES || {});
  check('cada motivo tiene un mensaje FIJO: ninguno lleva huecos, identidades ni cuentas',
    mensajes.length >= 5 && mensajes.every((m) => typeof m === 'string' && !/\$\{|hidi_|accountUid|uid/.test(m)), String(mensajes.length));
  const e = new EC.EContactError('relacion-invalida');
  check('y el error que sale es ese texto, sin datos de la petición', e.message === EC.MENSAJES['relacion-invalida'] && !/hidi_|ana|beto/.test(e.message));
}

console.log('\n── E · La copia pública del perfil no lleva datos de la cuenta ──');
{
  const P = lib('identity/perfilPublico.js');
  const campos = new Set(P.CAMPOS_PUBLICOS_DEL_PERFIL);
  const DE_LA_CUENTA = ['linkedAccountId', 'email', 'realName', 'birthDate', 'gender', 'creditsBalance', 'country', 'language', 'phoneNumber'];
  check('la lista blanca de publicProfiles no incluye linkedAccountId ni ningún dato de la cuenta', DE_LA_CUENTA.every((c) => !campos.has(c)));
  const proyectado = P.proyectarPerfilPublico({ uid: 'hidi_beto', profileType: 'hidi', displayName: 'Sombra', linkedAccountId: 'beto', email: 'x@y.z', creditsBalance: 50 });
  check('y la proyección de un documento completo los deja fuera', !!proyectado && DE_LA_CUENTA.every((c) => !(c in proyectado)) && proyectado.displayName === 'Sombra');
}

console.log('\n── F · Informativo: lo que todavía revela la vinculación (riesgo vigente; migración pendiente de autorización) ──');
{
  const modelo = leer('utils/econtactModel.ts');
  console.log(`ⓘ el identificador de la cara Weë se compone como «hidi_» + la cuenta: ${/identidadWeeDe/.test(modelo) ? 'utils/econtactModel.ts → identidadWeeDe' : '(no encontrado)'}. Sigue en publicProfiles.uid, posts, conversaciones, mensajes y avisos.`);
  console.log(`ⓘ las fotos «ver una vez» viven en users/<cuenta>/weetalk/…: la ruta (y su URL) lleva la cuenta (services/storageService.ts).`);
}

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
