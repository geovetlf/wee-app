/*
 * DISPONIBILIDAD DE CAPACIDADES, por cuenta (DEC-06).
 *
 * Qué vigila:
 *  · la decisión pura: cierra ante cualquier duda (configuración ilegible, interruptor, capacidad fuera del registro,
 *    capacidad cerrada por construcción, mock como único candidato, fallo de la ruta);
 *  · la configuración estricta: lanza si no puede leer o si falta `aiSettings/global`, y no recuerda un fallo;
 *  · el callable: sesión obligatoria, validación de la entrada y respuesta sin nombres de proveedor ni de modelo;
 *  · extremo a extremo con el Router real y un Firestore en memoria: con clave, disponible; sin clave, el mock no
 *    cuenta; con el interruptor o sin configuración, cerrado;
 *  · que no escribe, no cobra, reutiliza el Router (no lo copia), no lee las puertas del runtime y deja el país al Router.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib', p));
const fuente = (p) => fs.readFileSync(path.resolve(here, '../src', p), 'utf8');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

let failures = 0;
const check = (name, ok, detail = '') => {
  if (ok) console.log('✔ ' + name);
  else { failures++; console.log('✘ ' + name + (detail ? ' — ' + detail : '')); }
};

/* ── Un Firestore en memoria: lo que leen la configuración y el Router ─────────────────────────────────────────── */
const admin = require('firebase-admin/firestore');
const mundo = { docs: {}, falla: false };
const documentosDe = (nombre) => Object.entries(mundo.docs)
  .filter(([ruta]) => ruta.startsWith(nombre + '/'))
  .map(([ruta, data]) => ({ id: ruta.slice(nombre.length + 1), data: () => data }));
const instantanea = (lista) => ({ size: lista.length, docs: lista, forEach: (fn) => lista.forEach(fn) });
const fallo = () => { if (mundo.falla) throw new Error('fallo de lectura simulado'); };
const fakeDb = {
  collection: (nombre) => ({
    get: async () => { fallo(); return instantanea(documentosDe(nombre)); },
    doc: (id) => ({
      get: async () => { fallo(); const d = mundo.docs[nombre + '/' + id]; return { exists: d !== undefined, data: () => d, id }; },
    }),
    where: (campo, _op, valor) => ({
      limit: () => ({
        get: async () => { fallo(); return instantanea(documentosDe(nombre).filter((x) => x.data()[campo] === valor)); },
      }),
    }),
  }),
};
admin.getFirestore = () => fakeDb;

const reiniciar = (docs = {}, falla = false) => {
  mundo.docs = docs;
  mundo.falla = falla;
  lib('engine/config.js').invalidateConfig();
};
const CONFIG_OK = { 'aiSettings/global': { iaDetenida: false } };
const USUARIO_ES = { 'users/ana-doc': { uid: 'ana', country: 'ES' } };

const D = lib('engine/disponibilidad.js');
const C = lib('engine/config.js');
const DEFAULT_ROUTING = lib('engine/registry.js').DEFAULT_ROUTING;

/* ── A · La decisión pura, con dependencias inyectadas ─────────────────────────────────────────────────────────── */
const configBase = (sobre = {}) => ({
  providers: {}, routing: {}, source: 'firestore',
  settings: { iaDetenida: false, ...sobre },
});
const rutaReal = { candidates: [{ provider: 'gemini', model: {}, priority: 1 }] };
const rutaMock = { candidates: [{ provider: 'mock', model: {}, priority: 999 }] };
const rutaVacia = { candidates: [] };
const depsDePrueba = (sobre = {}) => {
  const llamadas = { rutas: [] };
  const deps = {
    cargarConfig: async () => configBase(),
    ruta: async (request) => { llamadas.rutas.push(request); return rutaReal; },
    ...sobre,
  };
  return { deps, llamadas };
};
const soloDisponibles = (lista) => lista.filter((x) => x.disponible).map((x) => x.capacidad);

{
  const { deps, llamadas } = depsDePrueba({ cargarConfig: async () => { throw new Error('ilegible'); } });
  const r = await D.disponibilidadDe('ana', ['text.generate'], deps);
  check('A1 sin poder leer la configuración, todo cierra y no se consulta ninguna ruta',
    r[0].disponible === false && r[0].motivo === 'no_disponible' && llamadas.rutas.length === 0);
}
{
  const { deps, llamadas } = depsDePrueba({ cargarConfig: async () => configBase({ iaDetenida: true }) });
  const r = await D.disponibilidadDe('ana', ['text.generate', 'image.generate'], deps);
  check('A2 con el interruptor de la IA activo, todo cierra y no se consulta ninguna ruta',
    soloDisponibles(r).length === 0 && llamadas.rutas.length === 0);
}
{
  let pedida = null;
  const { deps } = depsDePrueba({ ruta: async (request) => { pedida = request; return rutaVacia; } });
  const r = await D.disponibilidadDe('ana', ['text.generate'], deps);
  check('A3 la petición al Router no lleva el país (jurisdicciones) y, sin candidatos, la capacidad no está disponible',
    pedida !== null && pedida.jurisdicciones === undefined && r[0].disponible === false);
}
{
  const { deps } = depsDePrueba();
  const r = await D.disponibilidadDe('ana', ['text.generate'], deps);
  check('A4 una capacidad no territorial con ruta real está disponible aunque la cuenta no tenga país', r[0].disponible === true);
}
{
  const { deps } = depsDePrueba();
  const r = await D.disponibilidadDe('ana', ['inventada.capacidad'], deps);
  check('A5 una capacidad que no está en el registro cierra', r[0].disponible === false);
}
{
  const { deps } = depsDePrueba({ ruta: async () => rutaMock });
  const r = await D.disponibilidadDe('ana', ['text.generate'], deps);
  check('A6 el mock es lo único que queda: no hay ruta real, no está disponible', r[0].disponible === false);
}
{
  const { deps } = depsDePrueba({ ruta: async () => rutaVacia });
  const r = await D.disponibilidadDe('ana', ['text.generate'], deps);
  check('A7 sin candidatos: no disponible', r[0].disponible === false);
}
{
  const { deps } = depsDePrueba();
  const r = await D.disponibilidadDe('ana', ['text.generate'], deps);
  check('A8 un proveedor real ejecutable: disponible', r[0].disponible === true && r[0].motivo === undefined);
}
{
  const { deps } = depsDePrueba({
    ruta: async (request) => { if (request.capability === 'image.generate') throw new Error('ruta rota'); return rutaReal; },
  });
  const r = await D.disponibilidadDe('ana', ['text.generate', 'image.generate'], deps);
  check('A9 si la ruta de una capacidad falla, esa cierra y las demás no se contaminan',
    r[0].disponible === true && r[1].disponible === false);
}
{
  const { deps, llamadas } = depsDePrueba({ ruta: async () => rutaReal });
  const r = await D.disponibilidadDe('ana', ['world.generate'], deps);
  check('A10 world.generate se cierra por construcción: aunque hubiera ruta real, no se consulta y no está disponible',
    r[0].disponible === false && llamadas.rutas.length === 0);
}
{
  const cfg = configBase();
  let recibida = null;
  const { deps } = depsDePrueba({
    cargarConfig: async () => cfg,
    ruta: async (request, config) => { recibida = { request, config }; return rutaReal; },
  });
  await D.disponibilidadDe('ana', ['text.generate'], deps);
  check('A11 la ruta recibe la configuración ya leída y el userId, y ninguna lectura de país por su cuenta',
    recibida && recibida.config === cfg && recibida.request.userId === 'ana' && recibida.request.jurisdicciones === undefined);
}
{
  const { deps } = depsDePrueba({ ruta: async () => rutaReal });
  const r = await D.disponibilidadDe('ana', ['text.generate', 'image.generate'], deps);
  const claves = r.flatMap((x) => Object.keys(x)).sort().join(',');
  const texto = JSON.stringify(r);
  check('A12 la respuesta solo tiene capacidad, disponible y motivo, y ningún nombre de proveedor ni de modelo',
    claves.split(',').every((k) => ['capacidad', 'disponible', 'motivo'].includes(k)) && !/\b(gemini|claude|openai|mock|fal|modelo|provider)\b/i.test(texto));
}
{
  const { deps } = depsDePrueba({
    ruta: async (request) => (request.capability === 'image.generate' ? rutaVacia : rutaReal),
  });
  const pedidas = ['text.generate', 'image.generate', 'text.search'];
  const r = await D.disponibilidadDe('ana', pedidas, deps);
  check('A13 varias capacidades: mismo orden, y una cerrada no cierra a las demás',
    r.map((x) => x.capacidad).join() === pedidas.join() && r[0].disponible && !r[1].disponible && r[2].disponible);
}
{
  const { deps } = depsDePrueba();
  const a = await D.disponibilidadDe('ana', ['text.generate', 'world.generate'], deps);
  const b = await D.disponibilidadDe('ana', ['text.generate', 'world.generate'], deps);
  check('A14 determinista: la misma entrada da la misma salida', JSON.stringify(a) === JSON.stringify(b));
}
{
  const { deps, llamadas } = depsDePrueba();
  await D.disponibilidadDe('ana', ['text.generate', 'image.generate', 'inventada'], deps);
  check('A15 una consulta de ruta por capacidad válida, ni una lectura de más', llamadas.rutas.length === 2);
}

/* ── B · La configuración estricta: lo que no se puede leer no se da por bueno ─────────────────────────────────── */
{
  reiniciar({ ...CONFIG_OK });
  const cfg = await C.loadConfigEstricta();
  check('B1 con aiSettings/global leído, la configuración estricta devuelve los ajustes', cfg.settings.iaDetenida === false);
}
{
  reiniciar({});
  let lanzo = false;
  try { await C.loadConfigEstricta(); } catch (error) { lanzo = error instanceof C.ConfiguracionNoLegible || error.name === 'ConfiguracionNoLegible'; }
  check('B2 sin aiSettings/global (no hay certeza del interruptor): lanza', lanzo);
}
{
  reiniciar({ ...CONFIG_OK }, true);
  let lanzo = false;
  try { await C.loadConfigEstricta(); } catch { lanzo = true; }
  check('B3 si la lectura falla: la configuración estricta lanza', lanzo);
}
{
  reiniciar({ ...CONFIG_OK }, true);
  const cfg = await C.loadConfig(true);
  check('B4 el Router sigue con los valores por defecto ante un fallo (sin cambio de comportamiento)',
    cfg.source === 'defaults' && cfg.settings.iaDetenida === false);
}
{
  reiniciar({ ...CONFIG_OK }, true);
  let primera = false;
  try { await C.loadConfigEstricta(); } catch { primera = true; }
  mundo.falla = false;
  const segunda = await C.loadConfigEstricta();
  check('B5 tras un fallo, la siguiente lectura vuelve a leer (el fallo no se recuerda)', primera && segunda.settings.iaDetenida === false);
}

/* ── C · El callable: sesión, validación y extremo a extremo con el Router real ───────────────────────────────── */
const llamar = (sesion, datos) => D.disponibilidadDeCapacidades.run({ ...(sesion ? { auth: sesion } : {}), data: datos });
const codigoDe = async (promesa) => { try { await promesa; return 'ok'; } catch (error) { return error.code || String(error); } };
check('C1 sin sesión: unauthenticated', (await codigoDe(llamar(null, { capacidades: ['text.generate'] }))) === 'unauthenticated');
check('C2 entrada inválida: invalid-argument', (await codigoDe(llamar({ uid: 'ana' }, { capacidades: 'text.generate' }))) === 'invalid-argument');
check('C3 más de 40 capacidades: invalid-argument',
  (await codigoDe(llamar({ uid: 'ana' }, { capacidades: Array.from({ length: 41 }, (_, i) => 'c' + i) }))) === 'invalid-argument');

/* El extremo a extremo no depende del entorno de quien lo ejecuta: se retiran todas las claves de los modelos. */
const nombresDeClaves = lib('secrets.js').MODEL_SECRETS.map((s) => s.name);
const clavesGuardadas = Object.fromEntries(nombresDeClaves.map((n) => [n, process.env[n]]));
nombresDeClaves.forEach((n) => delete process.env[n]);
const e2e = async (docs, { clave = true, falla = false } = {}) => {
  reiniciar({ ...docs }, falla);
  nombresDeClaves.forEach((n) => delete process.env[n]);
  if (clave) process.env.GEMINI_API_KEY = 'clave-de-prueba';
  const r = await llamar({ uid: 'ana' }, { capacidades: ['text.generate', 'world.generate'] });
  return { lista: r.capacidades, texto: JSON.stringify(r) };
};
{
  const { lista, texto } = await e2e({ ...CONFIG_OK, ...USUARIO_ES });
  const textoDisp = lista.find((x) => x.capacidad === 'text.generate');
  const mundoDisp = lista.find((x) => x.capacidad === 'world.generate');
  check('C4 extremo a extremo: con clave y configuración, text.generate disponible; world.generate no',
    textoDisp.disponible === true && mundoDisp.disponible === false, JSON.stringify(lista));
  check('C5 la respuesta no revela ningún proveedor ni modelo', !/\b(gemini|mock|fal|claude|openai)\b/i.test(texto), texto);
}
{
  const { lista } = await e2e({ ...CONFIG_OK, ...USUARIO_ES }, { clave: false });
  check('C6 sin clave de ningún proveedor real: el mock no cuenta; text.generate no disponible',
    lista.find((x) => x.capacidad === 'text.generate').disponible === false);
}
{
  const { lista } = await e2e({ 'aiSettings/global': { iaDetenida: true }, ...USUARIO_ES });
  check('C7 con el interruptor de la IA activo: cerrado', lista.every((x) => x.disponible === false));
}
{
  const { lista } = await e2e({ ...CONFIG_OK });
  check('C8 cuenta sin país: lo no territorial sigue disponible y world.generate sigue cerrado',
    lista.find((x) => x.capacidad === 'text.generate').disponible === true && lista.find((x) => x.capacidad === 'world.generate').disponible === false);
}
{
  const { lista } = await e2e({ ...USUARIO_ES }, { falla: true });
  check('C9 si la lectura falla: cerrado (no se asume que la IA está activa)', lista.every((x) => x.disponible === false));
}
{
  const { lista } = await e2e({ ...USUARIO_ES });
  check('C10 falta aiSettings/global: cerrado (configuración desconocida)', lista.every((x) => x.disponible === false));
}
nombresDeClaves.forEach((n) => {
  if (clavesGuardadas[n] === undefined) delete process.env[n];
  else process.env[n] = clavesGuardadas[n];
});
reiniciar({});

/* ── D · Estático: no escribe, no cobra, reutiliza el Router, no lee las puertas del runtime ────────────────────── */
{
  const codigo = sinComentarios(fuente('engine/disponibilidad.ts'));
  check('D1 no escribe en la base de datos ni cobra ni reserva: ni set, update, add, delete ni Credits',
    !/\.(set|update|add|delete)\(/.test(codigo) && !/spendCredits|holdCredits|settleCredits|refundCredits|reservar|reserve/.test(codigo));
  check('D2 no llama a ningún proveedor ni genera nada: sin execute ni generate en el código',
    !/\.execute\(|\.generate\(|generateContent|fetch\(/.test(codigo));
  check('D3 reutiliza el Router (engine.route) y no crea otro', /engine\.route\(/.test(codigo) && !/createRouter\(/.test(codigo));
  check('D4 el callable toma la cuenta de la sesión y exige sesión',
    /request\.auth\.uid/.test(codigo) && /unauthenticated/.test(codigo) && !/request\.data[^;]*uid/.test(codigo));
  check('D5 el callable declara los secretos de los proveedores (sin ellos, ningún proveedor se consideraría configurado)',
    /secrets:\s*MODEL_SECRETS/.test(codigo));
  check('D6 la lista de consultables es de permitidos: el código no nombra world.generate, y la lectura no importa nada de las puertas del runtime',
    /CAPACIDADES_ABIERTAS[^=]*= new Set\(\[/.test(codigo) && /CAPACIDADES_ABIERTAS\.has\(/.test(codigo) && !/'world\.generate'/.test(codigo) && !/runtime\//.test(codigo));
  check('D6b la lista nombra solo capacidades del Router, y es todo el Router menos world.generate: una capacidad nueva hay que decidirla',
    [...D.CAPACIDADES_ABIERTAS].every((c) => Object.prototype.hasOwnProperty.call(DEFAULT_ROUTING, c))
    && !D.CAPACIDADES_ABIERTAS.has('world.generate') && D.CAPACIDADES_ABIERTAS.size === Object.keys(DEFAULT_ROUTING).length - 1);

  check('D7 la disponibilidad no nombra el país ni la jurisdicción: la decide el Router con su única fuente',
    !/jurisdic/i.test(codigo));
  const configSrc = fuente('engine/config.ts');
  check('D8 loadConfig sigue cayendo a los valores por defecto ante un fallo (el Router no cambia)',
    /const config = defaultConfig\(\);\s*try \{/.test(configSrc) && /catch \(error\) \{\s*console\.warn\(/.test(configSrc));
}

{
  const { deps, llamadas } = depsDePrueba();
  const r = await D.disponibilidadDe('ana', ['capacidad.que.no.figura'], deps);
  check('A10b una capacidad que no figura en la lista de consultables cierra por defecto, sin preguntar a la ruta',
    r[0].disponible === false && llamadas.rutas.length === 0);
}

{
  /* B3 · Con `estado`, loadConfig lee de nuevo aunque haya caché. Se prueba en este mismo proceso y con el mismo módulo, en
     tres pasos: (a) se demuestra que la caché EXISTE (la lectura sin `estado` devuelve la misma instancia que la del
     calentamiento); (b) se cambia el almacén sin invalidar y se comprueba que, sin `estado`, la caché sigue respondiendo lo
     que había; (c) solo entonces, con `estado`, la lectura tiene que ver el cambio. Sin (a), el caso pasaría sin caché. */
  reiniciar({});
  const calentada = await C.loadConfig(true);
  check('B3a hay una entrada de caché en esta instancia: la lectura sin estado devuelve la misma configuración', (await C.loadConfig()) === calentada);
  mundo.docs = { ...CONFIG_OK };
  check('B3b sin estado, la caché sigue respondiendo lo que había: el almacén cambió y la caché no se invalidó', (await C.loadConfig()) === calentada);
  const estado = { fallo: false, ajustes: false };
  const fresca = await C.loadConfig(false, estado);
  check('B3 con estado, loadConfig no responde desde la caché: aiSettings/global recién creado aparece', estado.ajustes === true && fresca !== calentada);
}

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
