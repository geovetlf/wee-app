/**
 * LA SIEMBRA AUTORIZADA FUNCIONA; UN CONFLICTO LA DETIENE; UN CLIENTE SIN PERMISO NO PUEDE — contra el emulador.
 *
 *   firebase emulators:exec --only firestore --project demo-wee "node functions/test/comunidades-siembra.emulator.mjs"
 *
 *   A · La administración (scripts/sembrar-comunidades.mjs, SDK de administración) siembra las ocho oficiales; una
 *       segunda vez no crea ninguna; y si ya existe una OFICIAL con id automático y el mismo slug, no la duplica.
 *   B · Con las reglas de verdad (firestore.rules), lo que intentaba la app —una oficial sin createdBy, con
 *       moderators: []— se DENIEGA a una sesión normal y a quien no tiene sesión; una oficial a su nombre, también;
 *       solo una sesión con el claim `admin` puede. Y el slug y el id de una oficial están reservados: una persona no
 *       los toma ni al crear ni editando la suya.
 *   C · Si el sitio de una oficial ya lo ocupa algo que no es la oficial (una comunidad de una persona con su slug, de
 *       antes de reservarlo, o el documento `communities/<slug>` con otra cosa), el script lo INFORMA, sale con código
 *       3 y no escribe NADA —ni esa oficial ni las demás—, en dry-run y con --ejecutar; y no toca la ajena.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { proyectoDeEmulador } from './_emulador.mjs';

const PROY = proyectoDeEmulador();
const here = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(here, '../../');
const host = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
const base = `http://${host}/v1/projects/${PROY}/databases/(default)/documents`;
let failures = 0;
const check = (name, cond, extra = '') => {
  if (!cond) failures++;
  console.log(`${cond ? '✔' : '✘'} ${name}${extra ? ` — ${extra}` : ''}`);
};

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const sesion = (uid, claims = {}) => {
  const now = Math.floor(Date.now() / 1000);
  return b64({ alg: 'none', typ: 'JWT' }) + '.' + b64({
    iss: `https://securetoken.google.com/${PROY}`, aud: PROY, auth_time: now, user_id: uid, sub: uid, iat: now, exp: now + 3600,
    firebase: { sign_in_provider: 'password', identities: {} }, ...claims,
  }) + '.';
};
const valor = (v) => {
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'number') return { integerValue: String(v) };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(valor) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, valor(x)])) } };
};
const doc = (o) => ({ fields: Object.fromEntries(Object.entries(o).map(([k, v]) => [k, valor(v)])) });
const crear = async (id, cuerpo, autorizacion) => {
  const headers = { 'Content-Type': 'application/json' };
  if (autorizacion) headers.Authorization = `Bearer ${autorizacion}`;
  const r = await fetch(`${base}/communities?documentId=${id}`, { method: 'POST', headers, body: JSON.stringify(doc(cuerpo)) });
  return r.status;
};
/* Escribir SOLO unos campos, como un `updateDoc` del cliente. */
const editar = async (id, campos, autorizacion) => {
  const mascara = Object.keys(campos).map((k) => `updateMask.fieldPaths=${k}`).join('&');
  const r = await fetch(`${base}/communities/${id}?${mascara}&currentDocument.exists=true`, {
    method: 'PATCH', headers: { Authorization: `Bearer ${autorizacion}`, 'Content-Type': 'application/json' }, body: JSON.stringify(doc(campos)),
  });
  return r.status;
};
/* Como administrador del emulador (sin reglas): los datos que ya había antes de reservar los slugs. */
const sembrarComoServidor = async (id, cuerpo) => crear(id, cuerpo, 'owner');
const listar = async () => {
  const r = await fetch(`${base}/communities?pageSize=100`, { headers: { Authorization: 'Bearer owner' } });
  const j = await r.json();
  return (j.documents || []).map((d) => ({
    id: d.name.split('/').pop(), slug: d.fields?.slug?.stringValue, oficial: d.fields?.isOfficial?.booleanValue,
    nombre: d.fields?.name?.stringValue, autor: d.fields?.createdBy?.stringValue, actualizado: d.updateTime,
  }));
};
const vaciar = async () => fetch(`http://${host}/emulator/v1/projects/${PROY}/databases/(default)/documents`, { method: 'DELETE' });
const cargarReglas = async () => {
  const r = await fetch(`http://${host}/emulator/v1/projects/${PROY}:securityRules`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: fs.readFileSync(path.join(raiz, 'firestore.rules'), 'utf8') }] } }),
  });
  return r.status;
};
/* Siempre con el proyecto del emulador (demo-*, lo garantiza proyectoDeEmulador): nunca uno real. */
const sembrar = (...extra) => spawnSync(process.execPath, [path.join(raiz, 'scripts/sembrar-comunidades.mjs'), '--project', PROY, ...extra], { cwd: raiz, encoding: 'utf8', env: process.env });
const ultimas = (r) => `${r.status} · ${(r.stdout + r.stderr).trim().split('\n').slice(-2).join(' ')}`;

await vaciar();
check('0) las reglas de verdad están cargadas', (await cargarReglas()) === 200);

console.log('\n── A · La siembra de la administración ──');
{
  const primera = sembrar('--ejecutar');
  let todas = await listar();
  check('1) siembra limpia: crea las ocho, con id = slug, todas oficiales', primera.status === 0 && /creadas: 8/.test(primera.stdout)
    && todas.length === 8 && todas.every((d) => d.oficial === true && d.id === d.slug), ultimas(primera));
  const segunda = sembrar('--ejecutar');
  todas = await listar();
  check('2) una segunda vez no crea ninguna', segunda.status === 0 && /creadas: 0/.test(segunda.stdout) && todas.length === 8, ultimas(segunda));

  await vaciar();
  /* Como en producción: una oficial que ya existe con id automático. */
  await sembrarComoServidor('AbC123automatico', { name: 'Cine & Animación', slug: 'cine-animacion', isOfficial: true, status: 'active', memberCount: 50, postCount: 3 });
  const conAuto = sembrar('--ejecutar');
  todas = await listar();
  check('3) con una oficial de id automático: crea las siete que faltan', conAuto.status === 0 && /creadas: 7/.test(conAuto.stdout), ultimas(conAuto));
  check('4) ocho en total, una por slug, todas oficiales', todas.length === 8 && new Set(todas.map((d) => d.slug)).size === 8 && todas.every((d) => d.oficial === true));
  check('5) la que ya existía con id automático no se duplica ni se toca', todas.filter((d) => d.slug === 'cine-animacion').length === 1 && todas.some((d) => d.id === 'AbC123automatico'));
}

console.log('\n── B · Un cliente sin permiso no puede, y el sitio de las oficiales está reservado ──');
{
  await vaciar();
  /* Exactamente lo que intentaba la app: sin createdBy, moderators vacío, isOfficial: true. */
  const comoLaApp = { name: 'Futuro y sociedad', slug: 'futuro-x', description: 'x', icon: 'planet', rules: [], memberCount: 0, postCount: 0, isOfficial: true, moderators: [], status: 'active' };
  const deAna = (extra = {}) => ({ ...comoLaApp, isOfficial: false, createdBy: 'ana', moderators: ['ana'], memberCount: 1, ...extra });
  check('6) una sesión normal no puede crear la oficial que intentaba la app', (await crear('intento1', comoLaApp, sesion('ana'))) === 403);
  check('7) ni quien no tiene sesión', (await crear('intento2', comoLaApp, null)) === 403);
  check('8) ni una oficial a su propio nombre', (await crear('intento3', { ...comoLaApp, createdBy: 'ana', moderators: ['ana'] }, sesion('ana'))) === 403);
  check('9) CONTROL: una comunidad de usuario, a su nombre y no oficial, sí (como `createCommunity`: id automático, memberCount 1)',
    (await crear('mia', deAna({ name: 'Amantes del café', slug: 'amantes-del-cafe' }), sesion('ana'))) === 200);
  check('10) y una sesión de administración (claim admin) sí puede sembrar una oficial', (await crear('oficialAdmin', { ...comoLaApp, slug: 'admin-x' }, sesion('jefa', { admin: true }))) === 200);

  check('11) una persona NO crea una comunidad con el slug de una oficial (aunque la oficial aún no exista)',
    (await crear('autoIdAna', deAna({ name: 'Tecnología & IA', slug: 'tecnologia-ia' }), sesion('ana'))) === 403);
  check('12) ni ocupa el id de una oficial con otro slug', (await crear('tecnologia-ia', deAna({ slug: 'mi-tecnologia' }), sesion('ana'))) === 403);
  check('13) ni con el id y el slug a la vez', (await crear('futuro-sociedad', deAna({ name: 'Futuro & Sociedad', slug: 'futuro-sociedad' }), sesion('ana'))) === 403);
  check('14) ni se pasa después al slug de una oficial editando la suya', (await editar('mia', { slug: 'cine-animacion' }, sesion('ana'))) === 403);
  check('15) CONTROL: pero sí edita su nombre y su descripción', (await editar('mia', { name: 'Amantes del café ☕', description: 'Para quien hace latte art con IA' }, sesion('ana'))) === 200);
  check('16) CONTROL: y otra persona sigue uniéndose (contador de uno en uno)', (await editar('mia', { memberCount: 2 }, sesion('beto'))) === 200);
  check('17) administración sí puede crear una oficial en su sitio', (await crear('cine-animacion', { ...comoLaApp, name: 'Cine & Animación', slug: 'cine-animacion' }, sesion('jefa', { admin: true }))) === 200);
  check('18) y una persona tampoco crea una NO oficial con ese slug después', (await crear('autoIdAna2', deAna({ slug: 'cine-animacion' }), sesion('ana'))) === 403);
}

console.log('\n── C · Un conflicto se informa y detiene la siembra: no se escribe NADA ──');
{
  await vaciar();
  /* La comunidad de una persona con el slug de una oficial, de ANTES de reservarlo (la escribe el servidor del emulador). */
  const okupa = { name: 'Tecnología & IA', slug: 'tecnologia-ia', description: 'La de Ana', icon: 'hardware-chip', rules: [], memberCount: 3, postCount: 0, isOfficial: false, createdBy: 'ana', moderators: ['ana'], status: 'active' };
  await sembrarComoServidor('zzOkupaDeAna', okupa);
  const [antes] = await listar();

  const ensayo = sembrar();
  check('19) dry-run con un slug oficial ocupado: informa el conflicto y sale con código 3',
    ensayo.status === 3 && /CONFLICTO tecnologia-ia/.test(ensayo.stderr) && /zzOkupaDeAna/.test(ensayo.stderr), ultimas(ensayo));
  const real = sembrar('--ejecutar');
  let todas = await listar();
  check('20) con --ejecutar: el mismo conflicto, código 3, y «No se ha escrito NADA»',
    real.status === 3 && /CONFLICTO tecnologia-ia/.test(real.stderr) && /No se ha escrito NADA/.test(real.stderr) && !/creadas:/.test(real.stdout), ultimas(real));
  check('21) y es verdad: ni la oficial en conflicto ni las otras siete se han creado', todas.length === 1 && todas[0].id === 'zzOkupaDeAna');
  check('22) la comunidad de la persona sigue intacta: ni apropiada, ni sobrescrita, ni borrada',
    todas[0].oficial === false && todas[0].nombre === 'Tecnología & IA' && todas[0].autor === 'ana' && todas[0].actualizado === antes.actualizado);

  await vaciar();
  /* El documento con el id de una oficial, ocupado por otra cosa. Antes se daba por «la creó otra ejecución». */
  await sembrarComoServidor('futuro-sociedad', { name: 'Mi futuro', slug: 'mi-futuro', isOfficial: false, createdBy: 'beto', moderators: ['beto'], memberCount: 1, postCount: 0, status: 'active' });
  const idOcupado = sembrar('--ejecutar');
  todas = await listar();
  check('23) el id communities/<slug> ocupado por otra cosa: conflicto, código 3, nada escrito y nada tocado',
    idOcupado.status === 3 && /CONFLICTO futuro-sociedad/.test(idOcupado.stderr) && todas.length === 1 && todas[0].slug === 'mi-futuro' && todas[0].oficial === false, ultimas(idOcupado));

  await vaciar();
  const limpia = sembrar('--ejecutar');
  check('24) quitado el conflicto (por una persona), la siembra vuelve a crear las ocho', limpia.status === 0 && /creadas: 8/.test(limpia.stdout) && (await listar()).length === 8, ultimas(limpia));
}

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
