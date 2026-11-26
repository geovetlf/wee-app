/*
 * EMBEDDINGS DE BYTEPLUS (la memoria de los personajes con IA).
 *
 * Qué se vigila:
 *  A · EL CONTRATO con ModelArk, con la red simulada: URL, clave, cuerpo, una
 *      petición por recuerdo, plantillas oficiales de `instructions` por rol, y
 *      que una respuesta mal formada no pase como vector.
 *  B · LA CONFIGURACIÓN: valores por defecto, variables de entorno y Firestore,
 *      validando cada campo; y que pasar a la cuenta de empresa no toca código.
 *  C · QUE NUNCA SE MEZCLEN MODELOS: cada vector lleva su huella; sin clave se usa
 *      el modo simulado con huella propia (o falla si no se permite).
 *  D · EL MODO SIMULADO es determinista y sirve para probar sin red.
 *  E · LAS REGLAS DEL REPO: la llamada vive en un adaptador, no cobra, no hay
 *      clave nueva, no entra en el router (sin respaldo silencioso) y su estado
 *      declarado no presume una verificación real.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib/engine/' + p));
const leer = (p) => fs.readFileSync(path.resolve(here, '../../' + p), 'utf8');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

let failures = 0;
const check = (name, cond, extra = '') => { console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : '')); if (!cond) failures++; };

const limpiarEnv = () => { for (const k of ['ARK_API_KEY', 'ARK_BASE_URL', 'ARK_EMBEDDING_MODEL', 'ARK_EMBEDDING_DIMENSIONS', 'ARK_EMBEDDING_INSTRUCTIONS']) delete process.env[k]; };
limpiarEnv();
const http = lib('http.js');
const A = lib('providers/byteplusEmbedding.js');
const E = lib('embeddings.js');

let calls = [];
const vector = (n, x = 0.5) => Array.from({ length: n }, (_, i) => x + i * 1e-6);
const stub = (respuesta) => { calls = []; http.fetchJson = async (url, options) => { calls.push({ url, headers: options.headers || {}, body: options.body, provider: options.provider }); return typeof respuesta === 'function' ? respuesta(url, options) : respuesta; }; };

console.log('\n── A · El contrato con ModelArk ──');
{
  process.env.ARK_API_KEY = 'clave-de-prueba';
  stub((url, o) => ({ data: { embedding: vector(o.body.dimensions), object: 'embedding' }, usage: { prompt_tokens: 7, total_tokens: 7 } }));
  const r = await A.byteplusEmbeddingAdapter.embed({ entradas: [{ texto: 'Hola, soy Jay Reads' }, { texto: 'Mi libro trata de dragones' }], modelo: 'skylark-embedding-vision-251215', dimensiones: 1024, rol: 'documento', admiteInstrucciones: true });
  check('una petición por recuerdo (BytePlus vectoriza todo el `input` como una sola cosa)', calls.length === 2 && r.vectores.length === 2);
  check('va a la puerta de ModelArk de siempre (región por defecto ap-southeast)', calls.every((c) => c.url === 'https://ark.ap-southeast.bytepluses.com/api/v3/embeddings/multimodal'));
  check('con la misma clave de ModelArk, como Bearer', calls[0].headers.Authorization === 'Bearer clave-de-prueba');
  const b = calls[0].body;
  check('cuerpo según la documentación: model, input de texto, float y dimensiones', b.model === 'skylark-embedding-vision-251215' && b.encoding_format === 'float' && b.dimensions === 1024 && b.input.length === 1 && b.input[0].type === 'text' && b.input[0].text === 'Hola, soy Jay Reads');
  check('el lado DOCUMENTO usa la plantilla oficial fija', b.instructions === 'Instruction:Compress the text into one word.\nQuery:');
  check('suma los tokens que informa BytePlus y guarda su uso tal cual', r.tokens === 14 && r.usoDelProveedor.length === 2);

  stub((url, o) => ({ data: { embedding: vector(o.body.dimensions) }, usage: { total_tokens: 3 } }));
  await A.byteplusEmbeddingAdapter.embed({ entradas: [{ texto: '¿De qué trata tu libro?' }], modelo: 'skylark-embedding-vision-251215', dimensiones: 2048, rol: 'consulta', admiteInstrucciones: true });
  check('el lado CONSULTA usa la plantilla oficial de búsqueda de texto', calls[0].body.instructions === 'Target_modality: text.\nInstruction:Generate an embedding for this sentence to retrieve related articles\nQuery:' && calls[0].body.dimensions === 2048);

  calls = [];
  await A.byteplusEmbeddingAdapter.embed({ entradas: [{ texto: 'x' }], modelo: 'skylark-embedding-vision-250615', dimensiones: 1024, rol: 'consulta', admiteInstrucciones: false });
  check('un modelo que no admite `instructions` no lo recibe', !('instructions' in calls[0].body));

  calls = [];
  await A.byteplusEmbeddingAdapter.embed({ entradas: [{ texto: 'Mi portada', imagenUrl: 'data:image/png;base64,AAAA' }], modelo: 'm', dimensiones: 1024, rol: 'documento', admiteInstrucciones: true });
  const inp = calls[0].body.input;
  check('texto + imagen van juntos y la imagen viaja incrustada', inp.length === 2 && inp[1].type === 'image_url' && inp[1].image_url.url === 'data:image/png;base64,AAAA' && /text and image/.test(calls[0].body.instructions));

  stub({ data: { embedding: [1, 2, 3] } });
  let fallo = '';
  try { await A.byteplusEmbeddingAdapter.embed({ entradas: [{ texto: 'x' }], modelo: 'm', dimensiones: 1024, rol: 'documento', admiteInstrucciones: false }); } catch (e) { fallo = e.message; }
  check('un vector de otro tamaño NO pasa como bueno', /1024 números/.test(fallo));
  stub({ data: { embedding: vector(1024).map((v, i) => (i === 3 ? NaN : v)) } });
  fallo = ''; try { await A.byteplusEmbeddingAdapter.embed({ entradas: [{ texto: 'x' }], modelo: 'm', dimensiones: 1024, rol: 'documento', admiteInstrucciones: false }); } catch (e) { fallo = e.message; }
  check('un vector con un valor no numérico tampoco', /1024 números/.test(fallo));
  fallo = ''; try { await A.byteplusEmbeddingAdapter.embed({ entradas: [{ texto: '   ' }], modelo: 'm', dimensiones: 1024, rol: 'documento', admiteInstrucciones: false }); } catch (e) { fallo = e.message; }
  check('una entrada vacía se rechaza sin llamar a la API', /vacía/.test(fallo));

  stub((url, o) => ({ data: { embedding: vector(o.body.dimensions) } }));
  await A.byteplusEmbeddingAdapter.embed({ entradas: [{ texto: 'a'.repeat(20000) }], modelo: 'm', dimensiones: 1024, rol: 'documento', admiteInstrucciones: false });
  check('un texto larguísimo se corta antes de mandarlo', calls[0].body.input[0].text.length === A.MAX_CARACTERES_POR_TEXTO);

  calls = [];
  process.env.ARK_BASE_URL = 'https://ark.otra-region.example/api/v3';
  await A.byteplusEmbeddingAdapter.embed({ entradas: [{ texto: 'x' }], modelo: 'm', dimensiones: 1024, rol: 'documento', admiteInstrucciones: false });
  check('la región de la cuenta de empresa se cambia con ARK_BASE_URL, sin tocar código', calls[0].url === 'https://ark.otra-region.example/api/v3/embeddings/multimodal');
  delete process.env.ARK_BASE_URL;
  delete process.env.ARK_API_KEY;
  fallo = ''; try { await A.byteplusEmbeddingAdapter.embed({ entradas: [{ texto: 'x' }], modelo: 'm', dimensiones: 1024, rol: 'documento', admiteInstrucciones: false }); } catch (e) { fallo = e.constructor.name + ' ' + e.message; }
  check('sin clave no llama: dice que falta ARK_API_KEY', /ARK_API_KEY/.test(fallo));
}

console.log('\n── B · La configuración ──');
{
  limpiarEnv();
  const d = E.configPorDefecto();
  check('por defecto: BytePlus, el modelo con instructions, 1024 dimensiones, precio sin confirmar', d.proveedor === 'byteplus-embedding' && d.modelo === 'skylark-embedding-vision-251215' && d.dimensiones === 1024 && d.admiteInstrucciones === true && d.precioUsdPorMillonDeTokens === null);
  process.env.ARK_EMBEDDING_MODEL = 'ep-20261122-empresa'; process.env.ARK_EMBEDDING_DIMENSIONS = '2048';
  const e1 = E.configPorDefecto();
  check('un punto de acceso de empresa (`ep-…`) entra por variable de entorno', e1.modelo === 'ep-20261122-empresa' && e1.dimensiones === 2048);
  check('y como no se sabe a qué modelo apunta, no manda instructions salvo que se diga', e1.admiteInstrucciones === false);
  process.env.ARK_EMBEDDING_INSTRUCTIONS = 'true';
  check('ARK_EMBEDDING_INSTRUCTIONS=true lo activa para el punto de acceso', E.configPorDefecto().admiteInstrucciones === true);
  process.env.ARK_EMBEDDING_DIMENSIONS = '777';
  check('unas dimensiones que BytePlus no admite caen a 1024', E.configPorDefecto().dimensiones === 1024);
  limpiarEnv();

  const m = E.mezclarConfig(d, { modelo: 'skylark-embedding-vision-250615', dimensiones: 2048, precioUsdPorMillonDeTokens: 0.1 });
  check('Firestore manda sobre los valores por defecto', m.modelo === 'skylark-embedding-vision-250615' && m.dimensiones === 2048 && m.precioUsdPorMillonDeTokens === 0.1);
  check('al cambiar de modelo, instructions se recalcula según ese modelo', m.admiteInstrucciones === false);
  const malo = E.mezclarConfig(d, { modelo: 'x y/../z', dimensiones: 3000, precioUsdPorMillonDeTokens: -5, proveedor: 'otro', timeoutMs: 5 });
  check('lo inválido de Firestore se ignora campo por campo', JSON.stringify(malo) === JSON.stringify(d));
  check('mezclar con nada devuelve lo mismo (control)', E.mezclarConfig(d, undefined) === d);
}

console.log('\n── C · Nunca se mezclan modelos ──');
{
  limpiarEnv();
  const base = E.configPorDefecto();
  const hR = E.huellaDe('byteplus-embedding', 'skylark-embedding-vision-251215', 1024);
  check('la huella dice proveedor, modelo y dimensiones', hR === 'byteplus-embedding:skylark-embedding-vision-251215:1024');
  check('distinto modelo o distintas dimensiones = no se comparan', !E.puedenCompararse(hR, E.huellaDe('byteplus-embedding', 'skylark-embedding-vision-250615', 1024)) && !E.puedenCompararse(hR, E.huellaDe('byteplus-embedding', 'skylark-embedding-vision-251215', 2048)) && E.puedenCompararse(hR, hR));

  const sim = await E.vectorizar([{ texto: 'hola' }], 'documento', { config: base });
  check('sin clave y con el simulado permitido: modo simulado, marcado como tal', sim.simulado === true && sim.proveedor === 'mock-embedding' && sim.costeUsd === 0);
  check('la huella simulada NUNCA coincide con la real', !E.puedenCompararse(sim.huella, hR));
  let fallo = '';
  try { await E.vectorizar([{ texto: 'hola' }], 'documento', { config: { ...base, permitirSimulado: false } }); } catch (e) { fallo = e.message; }
  check('sin clave y sin simulado permitido: falla y dice qué falta', /ARK_API_KEY/.test(fallo));
  fallo = ''; try { await E.vectorizar([{ texto: 'hola' }], 'documento', { config: { ...base, activo: false } }); } catch (e) { fallo = e.message; }
  check('apagado desde Firestore: no vectoriza', /activo/.test(fallo));

  const falso = { isConfigured: () => true, embed: async (p) => ({ vectores: p.entradas.map(() => vector(p.dimensiones, 3)), tokens: 2_000_000, latenciaMs: 1, modelo: p.modelo, usoDelProveedor: [] }) };
  const real = await E.vectorizar([{ texto: 'a' }, { texto: 'b' }], 'consulta', { config: base, adaptador: falso });
  check('con clave: proveedor real, huella real, sin simulado', !real.simulado && real.huella === hR && real.vectores.length === 2);
  check('los vectores salen normalizados (largo 1)', Math.abs(Math.hypot(...real.vectores[0]) - 1) < 1e-9);
  check('sin precio confirmado, el coste queda en null (no se inventa)', real.costeUsd === null);
  const conPrecio = await E.vectorizar([{ texto: 'a' }], 'consulta', { config: { ...base, precioUsdPorMillonDeTokens: 0.5 }, adaptador: falso });
  check('con precio confirmado, el coste sale de los tokens reales', Math.abs(conPrecio.costeUsd - 1) < 1e-9);
}

console.log('\n── D · El modo simulado ──');
{
  const a = E.vectorSimulado('El dragón vuela sobre la montaña', 1024);
  check('es determinista', JSON.stringify(a) === JSON.stringify(E.vectorSimulado('El dragón vuela sobre la montaña', 1024)));
  check('no distingue tildes ni mayúsculas', JSON.stringify(a) === JSON.stringify(E.vectorSimulado('EL DRAGON VUELA SOBRE LA MONTANA', 1024)));
  const cerca = E.similitudCoseno(a, E.vectorSimulado('Un dragón y una montaña', 1024));
  const lejos = E.similitudCoseno(a, E.vectorSimulado('Receta de pan integral', 1024));
  check('textos con palabras en común quedan más cerca', cerca > lejos);
  let fallo = ''; try { E.similitudCoseno([1, 2], [1, 2, 3]); } catch (e) { fallo = e.message; }
  check('comparar vectores de distinto largo es un error, no un número', /distinta longitud/.test(fallo));
}

console.log('\n── E · Las reglas del repositorio ──');
{
  const adapt = leer('functions/src/engine/providers/byteplusEmbedding.ts');
  const emb = leer('functions/src/engine/embeddings.ts');
  check('la llamada a BytePlus vive en un adaptador de providers/', /\/embeddings\/multimodal/.test(adapt) && !/bytepluses|\/embeddings\/multimodal/.test(sinComentarios(emb)));
  check('usa la puerta compartida de ModelArk (misma clave, misma región)', /from '\.\/ark'/.test(adapt) && /arkBase\(\)/.test(adapt) && /arkHeaders\(/.test(adapt));
  check('ni el adaptador ni el motor de embeddings cobran nada', ![adapt, emb].some((s) => /creditEngine|spendCredits|refundCredits|completeCredits/.test(sinComentarios(s))));
  check('ninguna clave escrita en el código', ![adapt, emb].some((s) => /Bearer [A-Za-z0-9]{12,}|sk-[A-Za-z0-9]{10,}/.test(s)));
  const secretos = leer('functions/src/secrets.ts');
  check('no hay secreto nuevo: es la misma ARK_API_KEY', /'ARK_API_KEY'/.test(secretos) && !/EMBEDDING/.test(secretos));
  const registro = leer('functions/src/engine/registry.ts');
  check('no entra en el router: sin respaldo silencioso entre modelos', !/byteplusEmbedding|byteplus-embedding|text\.embed/.test(registro));
  const { DECLARED, isAtLeast } = lib('verification.js');
  const v = DECLARED['byteplus-embedding'];
  check('declara su estado, su credencial, su documentación y la primera prueba real', !!v && v.credential === 'ARK_API_KEY' && /multimodal-vectorization-api/.test(v.docsUrl) && v.firstTest.length > 20);
  check('y no presume una verificación real (eso lo escribe la primera respuesta de verdad)', v.state === 'DOCUMENTATION_VERIFIED' && !isAtLeast(v.state, 'REAL_API_VERIFIED'));
  check('esta suite está en la cadena de `npm test`', /embeddings-byteplus\.test\.mjs/.test(leer('functions/package.json')));
}

limpiarEnv();
console.log('\nEmbeddings de BytePlus: contrato, configuración, huella y reglas');
if (failures > 0) { console.error(`\n${failures} comprobación(es) fallida(s)`); process.exit(1); }
