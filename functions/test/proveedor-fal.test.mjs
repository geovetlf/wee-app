/*
 * fal.ai — UN PROVEEDOR MÁS, DETRÁS DEL MISMO ROUTER Y DEL MISMO GATEWAY (misión fal, 2026-10-05).
 *
 * Lo que se prueba es lo que el adaptador hace de verdad, con la red sustituida por dobles en memoria: qué manda a fal
 * (solo el esquema publicado, las fotos en línea y nunca una URL de Weë, con sus tres cabeceras de siempre), qué
 * sigue (solo URLs de su cola), qué guarda (el resultado copiado al Storage de Weë, con los derechos de su licencia),
 * cómo suelta la llamada cuando se lo piden, cómo verifica un aviso firmado (ED25519/JWKS), cómo cancela y cómo
 * reconcilia. Y lo que NO hace: ser núcleo de nada, decidir elegibilidad, fijar precios, montar su clave en ninguna
 * Function o estar activo. Sin red, sin clave real, sin proveedor. $0.
 *
 *   node functions/test/proveedor-fal.test.mjs     (usa el compilado: `npm run build` antes)
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';

const require = createRequire(import.meta.url);
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '../..');
const lib = (p) => require(path.resolve(AQUI, '../lib/', p));
const leer = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const http = lib('engine/http.js');
const F = lib('engine/providers/fal.js');
const { HUNYUAN_WORLD_IMAGEN_A_MUNDO: HW, MODELOS_FAL } = lib('engine/providers/fal-modelos.js');
const { ADAPTERS, DEFAULT_PROVIDERS, DEFAULT_ROUTING, DEFAULT_SETTINGS } = lib('engine/registry.js');
const { DECLARED } = lib('engine/verification.js');
const { CREDIT_COSTS, SERVICE_LABEL, serviceForCapability } = lib('credits/creditCosts.js');
const { usdToCredits } = lib('credits/aiPricing.js');
const core = lib('core/index.js');

let failures = 0; let n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log(`✔ ${name}`); else { failures++; console.log(`✘ ${name}${detail ? ` — ${detail}` : ''}`); } };
const lanza = async (f) => { try { await f(); return null; } catch (e) { return e; } };

/* ── La red, en memoria ─────────────────────────────────────────────────── */
const ORIGINAL = { fetchJson: http.fetchJson, pollUntil: http.pollUntil, persistRemoteFile: http.persistRemoteFile, readImage: http.readImage };
let llamadas = [];
let respuestas = [];
const red = (lista) => { llamadas = []; respuestas = [...lista]; };
http.fetchJson = async (url, opciones = {}) => {
  llamadas.push({ url, metodo: opciones.method ?? 'GET', cabeceras: opciones.headers, cuerpo: opciones.body });
  const r = respuestas.shift();
  if (r instanceof Error) throw r;
  if (typeof r === 'function') return r(url, opciones);
  return r;
};
http.pollUntil = async (comprobar, opciones) => {
  for (let i = 0; i < 20; i++) {
    const estado = await comprobar();
    if (estado.done) return estado.value;
  }
  throw new http.ProviderError(`${opciones.provider}: el sondeo no terminó`, opciones.provider, 504);
};
const guardados = [];
http.persistRemoteFile = async (userId, url, proveedor, etiqueta) => { guardados.push({ userId, url, proveedor, etiqueta }); return `https://firebasestorage.googleapis.com/v0/b/get-wee.appspot.com/o/users%2F${userId}%2Fgenerated%2F${etiqueta}.bin?alt=media`; };
const leidas = [];
http.readImage = async (url) => { leidas.push(url); return { buffer: Buffer.from('imagen-de-prueba'), contentType: 'image/png' }; };
const restaurar = () => Object.assign(http, ORIGINAL);

const CLAVE_ANTES = process.env.FAL_KEY;
process.env.FAL_KEY = 'clave-de-prueba-no-real';

const FOTO = 'https://firebasestorage.googleapis.com/v0/b/get-wee.appspot.com/o/users%2Fu1%2Fcreator-inputs%2Ffaro.png?alt=media&token=t';
/*
 * La ENTRADA DE WEË de `world.generate` (`core/mundo3d.ts`): la foto, abierto o cerrado, qué destaca delante. Y, de
 * propina, lo que nunca debe viajar: campos sueltos del motor y nombres de fal metidos a mano, que no se traducen.
 */
const ENTRADA = {
  modo: 'desde_imagen', imagen: FOTO, espacio: 'exterior', elementos: ['faro', 'barca'],
  prompt: 'no debe viajar', quality: 'max', webhook_url: 'https://evil.test/x', sync_mode: true,
  image_url: 'https://evil.test/inyectada.png', labels_fg1: 'inyectado', classes: 'inyectado', export_drc: true,
};
const ENVIO = { request_id: 'req-123', status_url: 'https://queue.fal.run/fal-ai/hunyuan_world/requests/req-123/status', response_url: 'https://queue.fal.run/fal-ai/hunyuan_world/requests/req-123', cancel_url: 'https://queue.fal.run/fal-ai/hunyuan_world/requests/req-123/cancel' };
const RESULTADO = { world_file: { url: 'https://v3.fal.media/files/abc/world.zip', content_type: 'application/zip', file_name: 'world.zip', file_size: 1234 } };
const peticion = (extra = {}) => ({ capability: 'world.generate', model: HW, input: { ...ENTRADA }, ctx: { userId: 'u1', requestId: 'r1' }, timeoutMs: 60_000, ...extra });

/* ── A · Un proveedor más, no el núcleo de nada ─────────────────────────── */
console.log('── A · Un proveedor más ──');

check('1) fal es UN adaptador del mapa de siempre, multicapacidad por datos: atiende lo que sus modelos declaran y nada más',
  ADAPTERS.fal === F.falAdapter && F.falAdapter.supports('world.generate') && !F.falAdapter.supports('image.generate') && !F.falAdapter.supports('world.expand')
  && F.falAdapter.models.every((m) => MODELOS_FAL.includes(m)) && F.falAdapter.modalities.join() === '3d');

const importan = execSync('git ls-files -co --exclude-standard functions/src', { cwd: RAIZ, encoding: 'utf8' }).trim().split('\n')
  .filter((f) => f.endsWith('.ts') && /from '[./]+(engine\/)?providers\/fal'|from '\.\/fal'/.test(leer(f)));
check('2) solo el registro de adaptadores importa el adaptador: ni el Core, ni el Router, ni el Gateway, ni una experiencia lo conocen',
  JSON.stringify(importan.sort()) === JSON.stringify(['functions/src/engine/registry.ts']), importan.join(', '));

check('3) apagado por defecto, documentado y sin verificar contra la API real: nadie lo ha llamado todavía',
  DEFAULT_PROVIDERS.fal.enabled === false && /Desactivado/.test(DEFAULT_PROVIDERS.fal.note)
  && DECLARED.fal.state === 'DOCUMENTATION_VERIFIED' && DECLARED.fal.credential === 'FAL_KEY');

const fuentesSrc = execSync('git ls-files -co --exclude-standard functions/src', { cwd: RAIZ, encoding: 'utf8' }).trim().split('\n').filter((f) => f.endsWith('.ts'));
const montan = fuentesSrc.filter((f) => f !== 'functions/src/secrets.ts' && /FAL_SECRET|FAL_KEY/.test(sinComentarios(leer(f)))).sort();
check('4) FAL_KEY solo en el servidor y en un llavero DORMIDO: ninguna Function lo monta; solo lo lee el adaptador por su nombre',
  JSON.stringify(montan) === JSON.stringify(['functions/src/engine/providers/fal.ts', 'functions/src/engine/verification.ts'])
  && /FAL_SECRET_NAMES = \['FAL_KEY'\]/.test(leer('functions/src/secrets.ts'))
  && !/FAL_KEY|fal\.run|fal\.ai/.test(execSync('git ls-files -co --exclude-standard app.json app components screens services hooks contexts constants utils navigation', { cwd: RAIZ, encoding: 'utf8' })
    .trim().split('\n').filter((f) => /\.(ts|tsx|js|json)$/.test(f) && !f.startsWith('services/filmmaker/espejo/')).map((f) => leer(f)).join('\n')),
  montan.join(', '));

check('5) la capacidad entra por el catálogo común: world.generate ROUTABLE, de imagen o texto a 3D, con la cadena de fal y sin ampliar mundos',
  DEFAULT_ROUTING['world.generate']?.chain.map((e) => e.provider).join() === 'fal'
  && core.CAPABILITY_CATALOG.some((c) => c.id === 'world.generate' && c.status === 'ROUTABLE' && c.produces === '3d')
  && !core.CAPABILITY_CATALOG.some((c) => c.id === 'world.expand') && HW.gobierno.noSoportado.includes('world.expand'));

const CAMPOS = ['providerModelId', 'version', 'reviewStatus', 'active', 'commercialUseStatus', 'licenseStatus', 'outputRightsStatus', 'attributionRequired',
  'licencias', 'pricingMode', 'providerPricing', 'inputSchema', 'outputSchema', 'fuentes', 'lastVerifiedAt', 'motivo'];
check('6) cada modelo de fal declara su gobierno completo, con fuentes oficiales, y nace DISABLED',
  MODELOS_FAL.every((m) => m.gobierno && CAMPOS.every((c) => m.gobierno[c] !== undefined) && m.id === m.gobierno.providerModelId
    && m.gobierno.active === 'DISABLED' && m.gobierno.licencias.every((l) => /^https:\/\//.test(l.url) && l.notas.length > 0)
    && m.gobierno.fuentes.every((u) => /^https:\/\//.test(u)) && /^https:\/\//.test(m.gobierno.providerPricing.fuente)));

const adaptador = sinComentarios(leer('functions/src/engine/providers/fal.ts'));
check('7) el adaptador no lleva precios, margen ni Credits: el coste sale de los datos del modelo y el precio, del motor de coste',
  !/\bmargin\b|creditsPerUsd|CREDIT_COSTS|creditCosts|usdToCredits|aiPricing|\b0\.3\b|\b39\b/.test(adaptador) && /model\.cost\.usd/.test(adaptador));

/* ── B · Lo que manda a fal ─────────────────────────────────────────────── */
console.log('── B · Lo que sale hacia fal ──');

const cab = F.cabecerasDeFal();
check('8) siempre con su clave del servidor, SIN desvío a otro modelo, SIN que fal guarde entradas y salidas, y con caducidad corta',
  cab.Authorization === 'Key clave-de-prueba-no-real' && cab['x-app-fal-disable-fallback'] === 'true' && cab['X-Fal-Store-IO'] === '0'
  && JSON.parse(cab['X-Fal-Object-Lifecycle-Preference']).expiration_duration_seconds === 3600);
delete process.env.FAL_KEY;
const sinClave = await lanza(() => F.cabecerasDeFal());
check('9) sin FAL_KEY no hay cabeceras ni llamada: error que no se reintenta', sinClave?.name === 'ProviderError' && sinClave.retryable === false && !F.isFalConfigured());
process.env.FAL_KEY = 'clave-de-prueba-no-real';

const cuerpo = F.cuerpoParaFal(HW, 'world.generate', { ...ENTRADA }, 'u1');
check('10) al modelo solo le llega su esquema publicado, TRADUCIDO desde la entrada de Weë: ni el prompt, ni la calidad, ni un webhook, ni los nombres de fal que alguien colara',
  Object.keys(cuerpo).sort().join() === 'classes,image_url,labels_fg1,labels_fg2'
  && cuerpo.image_url === FOTO && cuerpo.classes === 'outdoor' && cuerpo.labels_fg1 === 'faro' && cuerpo.labels_fg2 === 'barca',
  JSON.stringify(cuerpo));
const rechazos = await Promise.all([
  lanza(() => F.cuerpoParaFal(HW, 'world.generate', { ...ENTRADA, imagen: undefined }, 'u1')),
  lanza(() => F.cuerpoParaFal(HW, 'world.generate', { ...ENTRADA, imagen: 'https://evil.test/foto.png' }, 'u1')),
  lanza(() => F.cuerpoParaFal(HW, 'world.generate', { ...ENTRADA, imagen: 'http://169.254.169.254/latest' }, 'u1')),
  lanza(() => F.cuerpoParaFal(HW, 'world.generate', { ...ENTRADA, imagen: 'data:text/html;base64,PGh0bWw+' }, 'u1')),
  lanza(() => F.cuerpoParaFal(HW, 'world.generate', { ...ENTRADA, imagen: FOTO.replace('users%2Fu1', 'users%2Fotra') }, 'u1')),
  lanza(() => F.cuerpoParaFal(HW, 'world.generate', { ...ENTRADA, elementos: ['x'.repeat(61)] }, 'u1')),
  lanza(() => F.cuerpoParaFal(HW, 'world.generate', { ...ENTRADA, elementos: ['a', 'b', 'c'] }, 'u1')),
  lanza(() => F.cuerpoParaFal(HW, 'world.generate', { ...ENTRADA, espacio: 'costa' }, 'u1')),
  lanza(() => F.cuerpoParaFal(HW, 'world.generate', { ...ENTRADA, modo: 'desde_texto' }, 'u1')),
  lanza(() => F.cuerpoParaFal(HW, 'world.generate', { image_url: FOTO, labels_fg1: 'faro', labels_fg2: 'barca', classes: 'outdoor' }, 'u1')),
  lanza(() => F.cuerpoParaFal(HW, 'image.generate', { ...ENTRADA }, 'u1')),
  lanza(() => F.cuerpoParaFal({ ...HW, gobierno: { ...HW.gobierno, inputSchema: [] } }, 'world.generate', { ...ENTRADA }, 'u1')),
]);
check('11) y se rechaza ANTES de llamar a nadie lo que falta o no vale: sin foto, URL de fuera, metadatos, HTML, foto ajena, elementos de más o enormes, espacio o modo que no existen, una entrada escrita CON NOMBRES DE fal, otra capacidad, modelo sin esquema',
  rechazos.every((e) => e?.name === 'ProviderError' && e.status === 400 && e.retryable === false), rechazos.map((e) => e?.message ?? 'no lanzó').join(' | '));

red([ENVIO]);
leidas.length = 0;
const aceptada = await F.falAdapter.run(peticion({ acceptAsync: true }));
const envio = llamadas[0];
check('12) la foto viaja EN LÍNEA (leída del Storage en el servidor): fal nunca recibe una URL de Weë',
  envio?.metodo === 'POST' && envio.url === 'https://queue.fal.run/fal-ai/hunyuan_world/image-to-world'
  && /^data:image\/png;base64,/.test(envio.cuerpo.image_url) && leidas.join() === FOTO && !JSON.stringify(envio.cuerpo).includes('firebasestorage'),
  JSON.stringify({ url: envio?.url, imagen: String(envio?.cuerpo?.image_url).slice(0, 30) }));
const ajena = await lanza(() => F.falAdapter.run(peticion({ input: { ...ENTRADA, imagen: FOTO.replace('users%2Fu1', 'users%2Fotra') } })));
check('13) y solo si es de la carpeta de quien pide: la foto de otra persona no sale, ni se lee',
  ajena?.status === 400 && ajena.retryable === false && leidas.length === 1);

check('14) con `acceptAsync` suelta la llamada y devuelve SOLO el nombre de la operación (modelo::request_id), su coste conocido y nada más',
  aceptada.accepted?.operationId === 'fal-ai/hunyuan_world/image-to-world::req-123' && llamadas.length === 1 && aceptada.costUSD === HW.cost.usd && !aceptada.output);

red([{ ...ENVIO, status_url: 'https://evil.test/status', response_url: 'https://queue.fal.run.evil.test/r' }, { status: 'IN_QUEUE' }, { status: 'IN_PROGRESS' }, { status: 'COMPLETED' }, RESULTADO]);
guardados.length = 0;
const hecho = await F.falAdapter.run(peticion());
const seguidas = llamadas.slice(1).map((l) => l.url);
check('15) sin `acceptAsync` sondea; y solo sigue URLs de SU cola: una status_url o response_url ajena se ignora y se usa la de la cola',
  seguidas.length === 4 && seguidas.every((u) => u.startsWith('https://queue.fal.run/fal-ai/hunyuan_world/image-to-world/requests/req-123')), seguidas.join(' | '));
check('16) el resultado se copia al Storage de Weë en el momento —la URL de fal no se queda— y sale como un mundo, con los derechos de su licencia',
  hecho.output.kind === 'world' && hecho.output.url.startsWith('https://firebasestorage.googleapis.com/') && guardados.length === 1 && guardados[0].url === RESULTADO.world_file.url
  && hecho.meta.derechos.jurisdiccionesBloqueadas.join() === 'EU,GB,KR' && hecho.meta.derechos.licencias.length === 2 && hecho.meta.operationId === aceptada.accepted.operationId,
  JSON.stringify(hecho.output));

const forjado = { ...HW, gobierno: { ...HW.gobierno, providerModelId: 'fal-ai/otro-modelo' } };
red([ENVIO]);
await F.falAdapter.run(peticion({ model: forjado, acceptAsync: true }));
const desconocido = await lanza(() => F.falAdapter.run(peticion({ model: { ...HW, id: 'fal-ai/no-revisado' } })));
check('17) el endpoint, el esquema y la licencia salen de SU catálogo revisado: un gobierno forjado no lo redirige y un modelo que no conoce no se llama',
  llamadas[0]?.url === 'https://queue.fal.run/fal-ai/hunyuan_world/image-to-world' && desconocido?.status === 400 && desconocido.retryable === false);

const casos = [
  [[ENVIO, { status: 'COMPLETED' }, { otra_cosa: 1 }], 502, 'sin archivo'],
  [[ENVIO, { status: 'COMPLETED' }, { world_file: { ...RESULTADO.world_file, file_size: F.MAX_BYTES_DE_RESULTADO + 1 } }], 413, 'demasiado grande'],
  [[ENVIO, { status: 'COMPLETED' }, { world_file: { ...RESULTADO.world_file, url: 'http://v3.fal.media/x.zip' } }], 502, 'sin https'],
  [[{ request_id: 'a/b' }], 502, 'request_id roto'],
];
const fallos = [];
for (const [lista, esperado, nombre] of casos) {
  red(lista);
  const e = await lanza(() => F.falAdapter.run(peticion()));
  if (e?.status !== esperado) fallos.push(`${nombre}: ${e?.status}`);
}
check('18) un resultado sin archivo, demasiado grande, sin https o un request_id roto fallan con su motivo, sin guardar nada', fallos.length === 0, fallos.join(' | '));

/* ── C · Operaciones, avisos firmados, cancelación y reconciliación ─────── */
console.log('── C · Lo asíncrono ──');

const op = F.nombreDeOperacion('fal-ai/hunyuan_world/image-to-world', 'req-123');
const malas = ['fal-ai/x::a::b', 'Fal-AI/x::a', 'fal-ai/x::a/b', 'fal-ai/../x::a', `fal-ai/x::${'a'.repeat(300)}`, 42, null];
check('19) el nombre de la operación va y vuelve, y uno mal formado no se lee (ni sale de su sitio en una URL)',
  JSON.stringify(F.leerOperacion(op)) === JSON.stringify({ modelo: 'fal-ai/hunyuan_world/image-to-world', requestId: 'req-123' }) && malas.every((m) => F.leerOperacion(m) === undefined));

const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const jwk = publicKey.export({ format: 'jwk' });
const otra = generateKeyPairSync('ed25519').publicKey.export({ format: 'jwk' });
const CUERPO = JSON.stringify({ request_id: 'req-123', status: 'OK', payload: RESULTADO });
const AHORA = 1_780_000_000;
const firmar = (cuerpo, marca = AHORA, clave = privateKey) => {
  const mensaje = ['req-123', 'usuario-fal', String(marca), createHash('sha256').update(cuerpo).digest('hex')].join('\n');
  return sign(null, Buffer.from(mensaje), clave).toString('hex');
};
const cabeceras = (extra = {}) => ({ 'X-Fal-Webhook-Request-Id': 'req-123', 'X-Fal-Webhook-User-Id': 'usuario-fal', 'X-Fal-Webhook-Timestamp': String(AHORA), 'X-Fal-Webhook-Signature': firmar(CUERPO), ...extra });
const firmas = {
  valida: F.verificarFirmaDeFal(cabeceras(), CUERPO, [jwk], AHORA + 10),
  enMinusculas: F.verificarFirmaDeFal(Object.fromEntries(Object.entries(cabeceras()).map(([k, v]) => [k.toLowerCase(), [v]])), Buffer.from(CUERPO), [{ kty: 'OKP', crv: 'Ed25519', x: 'roto' }, jwk], AHORA),
  cuerpoTocado: F.verificarFirmaDeFal(cabeceras(), CUERPO.replace('OK', 'ERROR'), [jwk], AHORA),
  viejo: F.verificarFirmaDeFal(cabeceras(), CUERPO, [jwk], AHORA + 301),
  otraClave: F.verificarFirmaDeFal(cabeceras(), CUERPO, [otra], AHORA),
  sinCabecera: F.verificarFirmaDeFal({ ...cabeceras(), 'X-Fal-Webhook-Signature': undefined }, CUERPO, [jwk], AHORA),
  sinClaves: F.verificarFirmaDeFal(cabeceras(), CUERPO, [], AHORA),
  firmaRara: F.verificarFirmaDeFal(cabeceras({ 'X-Fal-Webhook-Signature': 'zz' }), CUERPO, [jwk], AHORA),
};
check('20) un aviso solo vale si lo firmó fal (ED25519 sobre request_id, user_id, hora y huella del cuerpo CRUDO, contra su JWKS) y a ±300 s',
  firmas.valida.valida && firmas.enMinusculas.valida && ['cuerpoTocado', 'viejo', 'otraClave', 'sinCabecera', 'sinClaves', 'firmaRara'].every((k) => firmas[k].valida === false),
  JSON.stringify(Object.fromEntries(Object.entries(firmas).map(([k, v]) => [k, v.valida]))));
check('21) y las claves se piden a la dirección oficial de fal', F.URL_DE_CLAVES_DE_FAL === 'https://rest.fal.ai/.well-known/jwks.json' && F.TOLERANCIA_DE_FIRMA_S === 300);

const modelo = 'fal-ai/hunyuan_world/image-to-world';
const avisos = {
  ok: F.leerAvisoDeFal({ request_id: 'req-123', status: 'OK', payload: RESULTADO }, modelo),
  error: F.leerAvisoDeFal({ request_id: 'req-123', status: 'ERROR', error: 'x'.repeat(500) }, modelo),
  marcha: F.leerAvisoDeFal({ request_id: 'req-123', status: 'IN_PROGRESS' }, modelo),
  raro: F.leerAvisoDeFal({ request_id: 'req-123', status: 'QUIZÁ' }, modelo),
};
check('22) un aviso se lee sin fiarse: OK → terminado (con su enlace temporal), ERROR → fallado (motivo acotado), en marcha, y lo que no se entiende → desconocido',
  avisos.ok.desenlace === 'terminado' && avisos.ok.recurso === RESULTADO.world_file.url && avisos.ok.operationId === op
  && avisos.error.desenlace === 'fallado' && avisos.error.motivo.length === 200 && avisos.marcha.desenlace === 'en_marcha' && avisos.raro.desenlace === 'desconocido'
  && [[[], modelo], [{ request_id: 'a/b', status: 'OK' }, modelo], [{ request_id: 'r', status: 'OK' }, 'Modelo Malo']].every(([c, m]) => F.leerAvisoDeFal(c, m) === undefined));

const Err = (status) => new http.ProviderError(`fal ${status}`, 'fal', status, status >= 500);
const consultas = [];
for (const lista of [[{ status: 'IN_PROGRESS' }], [{ status: 'COMPLETED' }, RESULTADO], [{ status: 'COMPLETED' }, Err(422)], [Err(404)], [new Error('red caída')], [{ status: '???' }]]) {
  red(lista);
  consultas.push(await F.resolutorDeFal.consultar({ providerId: 'fal', operationId: op }));
}
check('23) la reconciliación nunca lanza: en marcha, terminado, fallado (4xx del modelo), no la conoce, no contesta, ilegible',
  consultas[0].aviso?.desenlace === 'en_marcha' && consultas[1].aviso?.desenlace === 'terminado' && consultas[2].aviso?.desenlace === 'fallado'
  && consultas[3].motivo === 'no_la_conoce' && consultas[4].motivo === 'no_contesta' && consultas[5].motivo === 'ilegible',
  JSON.stringify(consultas.map((c) => c.aviso?.desenlace ?? c.motivo)));

const cancelaciones = [];
for (const r of [{}, Err(400), Err(404), Err(500)]) { red([r]); cancelaciones.push(await F.cancelarEnFal(op)); }
cancelaciones.push(await F.cancelarEnFal('roto'));
check('24) cancelar contesta y no lanza: pedida, ya terminada, no existe, no contesta; y un nombre roto no llega a fal',
  cancelaciones.join() === 'pedida,ya_terminada,no_existe,no_contesta,no_configurado' && llamadas.every((l) => l.metodo === 'PUT' && l.url.endsWith('/cancel')), cancelaciones.join());

/* ── D · Credits, material y contratos ──────────────────────────────────── */
console.log('── D · Credits, material y contratos ──');

const precio = usdToCredits(HW.gobierno.providerPricing.usd, DEFAULT_SETTINGS);
check('25) el precio de prueba en Credits sale del precio publicado con la fórmula del motor (`usdToCredits`: coste × Credits por dólar × margen), no de un número suelto',
  CREDIT_COSTS.ai_world === precio && serviceForCapability('world.generate', {}) === 'ai_world' && SERVICE_LABEL.ai_world === 'Generación de mundo 3D', `${CREDIT_COSTS.ai_world} vs ${precio}`);

const mundo = { contract: core.CONTENT_CORE_CONTRACT_VERSION, assetId: 'asset_mundo_1', ownerAccountId: 'cuenta-a', kind: 'world' };
check('26) `world` es un tipo de material del Core, y unos derechos mal formados no pasan', core.esTipoDeMaterial('world') && core.derechosValidos(hecho.meta.derechos)
  && !core.derechosValidos({ ...hecho.meta.derechos, licencias: [{ nombre: 'x', url: 'http://inseguro' }] }) && mundo.kind === 'world');

const contratos = execSync('git diff 63bb4a3 -- functions/src/core/contracts.ts', { cwd: RAIZ, encoding: 'utf8' });
check('27) ningún contrato existente sube de versión: lo nuevo es aditivo (solo nace ESCENA3D_CONTRACT_VERSION)',
  !contratos.split('\n').some((l) => /^-(?!--)/.test(l)) && /\+export const ESCENA3D_CONTRACT_VERSION = '1\.0'/.test(contratos));

/* ── E · Nada encendido ─────────────────────────────────────────────────── */
console.log('── E · Nada encendido ──');

const nombran = fuentesSrc.filter((f) => /'world\.generate'/.test(sinComentarios(leer(f)))).sort();
check('28) ninguna experiencia, plantilla ni pantalla pide un mundo por su cuenta: world.generate vive en el catálogo, su contrato canónico, el registro, el precio, fal y la clase de material que deja (un mundo es `world`)',
  JSON.stringify(nombran) === JSON.stringify(['functions/src/core/capability.ts', 'functions/src/core/mundo3d.ts', 'functions/src/core/registry/capabilities.ts', 'functions/src/credits/creditCosts.ts',
    'functions/src/engine/providers/fal-modelos.ts', 'functions/src/engine/providers/fal.ts', 'functions/src/engine/registry.ts', 'functions/src/runtime/materializacion.ts']), nombran.join(', '));
check('29) y no hay ningún webhook de fal desplegable: verificar y leer un aviso son funciones puras que nadie expone todavía',
  !/onRequest|onCall/.test(adaptador) && !/\bfal\b|fal\.ai|providers\/fal/i.test(sinComentarios(leer('functions/src/engine/webhooks.ts'))) && !/\bfal\b|fal\.ai|providers\/fal/i.test(sinComentarios(leer('functions/src/index.ts'))));

check('esta suite está en la cadena de `npm test`', /proveedor-fal\.test\.mjs/.test(leer('functions/package.json')));

restaurar();
if (CLAVE_ANTES === undefined) delete process.env.FAL_KEY; else process.env.FAL_KEY = CLAVE_ANTES;
console.log(failures ? `\n✘ ${failures} fallo(s)` : `\n✔ proveedor fal: ${n} comprobaciones ($0)`);
process.exit(failures ? 1 : 0);
