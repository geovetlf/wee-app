/**
 * FILMMAKER ENGINE · FASE 33 — LOS RIESGOS QUE SE CIERRAN SIN GASTAR Y SIN TOCAR CONTRATOS (filmmaker-riesgos).
 *
 *   A · R2: las órdenes del proveedor (`--dur`, `--rs`…) no llegan a Seedance desde NINGÚN texto, y lo demás del texto
 *       —saltos de línea, un guion suelto— se queda como estaba;
 *   B · R18: los píxeles de la tabla oficial de BytePlus, por resolución, proporción y serie; `adaptive` y lo que no
 *       está en la tabla, con la mayor (un techo); el ejemplo de precio publicado sigue dando lo mismo;
 *   C · R19: editar y extender piden `adaptive` y el tipo de tarea solo va a Seedance 2.5;
 *   D · R20: videos y audios con cupos separados, y el audio solo, rechazado en la serie 2.0 antes de salir;
 *   E · R22: ni la duración `-1` ni los segundos de entrada que declara el cliente abaratan el precio;
 *   F · R15: la toma que salió y no se sabe cómo acabó se dice «se está comprobando», con la misma decisión que el
 *       estado de la toma y la liquidación; en la app, su fase, su frase y el visor;
 *   G · las guardas: sin red, sin tocar el runtime, ni F1-A/F1-D, ni el Credit Engine, ni la huella de la toma; la
 *       matriz al día; en la cadena; y documentado.
 *
 * Sin proveedores de verdad: el cuerpo de Seedance se construye (sin imágenes, que es lo único que leería) y se mira;
 * nunca se llama a `run`.
 */
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const require = createRequire(import.meta.url);
const lib = (p) => require(path.resolve(RAIZ, 'functions/lib', p));
const sinCR = (s) => s.replace(/\r\n/g, '\n');
const leer = (p) => sinCR(fs.readFileSync(path.resolve(RAIZ, p), 'utf8'));
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
const git = (args) => sinCR(execSync(`git ${args}`, { cwd: RAIZ, encoding: 'utf8' }));

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const intentar = async (fn) => { try { return { ok: true, valor: await fn() }; } catch (error) { return { ok: false, error }; } };

/* Nadie sale a la red: si algo intentara llamar a un proveedor, esto lo diría. */
const llamadasDeRed = [];
globalThis.fetch = async (...a) => { llamadasDeRed.push(String(a[0])); throw new Error('sin red en esta suite'); };

const S = lib('engine/providers/seedance.js');
const V = lib('engine/video.js');
const P = lib('credits/aiPricing.js');
const M = S.SEEDANCE_MODEL_IDS;
const cuerpo = async (modelId, input, capability = 'video.reference') =>
  (await S.buildSeedanceBody({ capability, input, model: { id: modelId }, prefs: {} }));
const AJUSTES = { pricingMode: 'real', creditsPerUsd: 100, margin: 0.3 };

/* ═══ A · R2: las órdenes del proveedor ══════════════════════════════════ */
console.log('\n— A · R2: las órdenes del proveedor no viajan —');
{
  const casos = [
    ['Un faro --dur 30 --rs 1080p', 'Un faro dur 30 rs 1080p'],
    ['--seed 7 al principio', 'seed 7 al principio'],
    ['línea uno\n--cf false\nlínea tres', 'línea uno\ncf false\nlínea tres'],
    ['semi--automático, esto -- aquello y un —guion largo—', 'semi--automático, esto -- aquello y un —guion largo—'],
    ['Nada que quitar.', 'Nada que quitar.'],
  ];
  check('A1 se quitan los guiones de las órdenes, y nada más (saltos de línea, guiones sueltos y rayas se quedan)',
    casos.every(([a, b]) => S.sinOrdenesDeSeedance(a) === b), casos.map(([a]) => JSON.stringify(S.sinOrdenesDeSeedance(a))).join(' · '));
  const texto = (await cuerpo(M.SEEDANCE_2_0_FAST, { prompt: 'Un faro de noche --dur 30 --rs 1080p --wm true', aspectRatio: '16:9' }, 'video.generate')).body.content[0].text;
  check('A2 texto a video (Weë Studio, un paso de Weë Creator o una toma): ninguna orden llega', !/(^|\s)--/.test(texto) && texto.startsWith('Un faro de noche'), texto);
  const conReferencias = (await cuerpo(M.SEEDANCE_2_5, { prompt: 'Como este clip --rt 21:9', referenceVideos: ['https://x/v.mp4'], aspectRatio: '16:9' })).body.content[0].text;
  check('A3 con referencias, lo mismo', !/(^|\s)--/.test(conReferencias), conReferencias);
  const src = sinComentarios(leer('functions/src/engine/providers/seedance.ts'));
  check('A4 se limpia ANTES de recortar a 3000, en el único sitio por el que sale un texto hacia Seedance',
    /const prompt = sinOrdenesDeSeedance\(String\(input\.prompt \?\? input\.purpose \?\? ''\)\)\.slice\(0, 3000\);/.test(src)
    && (src.match(/content: any\[\] = \[\{ type: 'text', text: prompt \}\]/g) ?? []).length === 1);
  const plano = lib('creator/plano.js');
  check('A5 el prompt avanzado de un plano sigue con su limpieza de siempre (quita también enlaces y espacios de más)',
    typeof plano.sinOrdenesDeProveedor === 'function' && plano.sinOrdenesDeProveedor('uno  --dur 30   dos') === 'uno dur 30 dos');
}

/* ═══ B · R18: los píxeles oficiales ═════════════════════════════════════ */
console.log('\n— B · R18: los píxeles de la tabla oficial —');
{
  const tokens = (res, r, mod, s = 5) => S.seedanceTokens(res, r, s, 0, mod);
  const t = (w, h, s = 5) => Math.round((s * w * h * 24) / 1024);
  const OFICIAL = {
    '720p': { '16:9': [1280, 720], '4:3': [1112, 834], '1:1': [960, 960], '21:9': [1470, 630] },
    '1080p': { '16:9': [1920, 1080], '4:3': [1664, 1248], '1:1': [1440, 1440], '21:9': [2206, 946] },
    '480p': { '4:3': [752, 560], '1:1': [640, 640], '21:9': [992, 432] },
  };
  const malas = [];
  for (const [res, fila] of Object.entries(OFICIAL)) for (const [r, [w, h]] of Object.entries(fila)) {
    for (const mod of [M.SEEDANCE_2_5, M.SEEDANCE_2_0]) if (tokens(res, r, mod) !== t(w, h)) malas.push(`${res} ${r} ${mod}`);
  }
  check('B1 720p, 1080p y 480p en cada proporción, para 2.5 y la serie 2.0: la tabla oficial', malas.length === 0, malas.join(', '));
  check('B2 4K (solo Seedance 2.0): la tabla oficial', tokens('4k', '16:9', M.SEEDANCE_2_0) === t(3840, 2160) && tokens('4k', '4:3', M.SEEDANCE_2_0) === t(3326, 2494)
    && tokens('4k', '1:1', M.SEEDANCE_2_0) === t(2880, 2880) && tokens('4k', '21:9', M.SEEDANCE_2_0) === t(4398, 1886));
  check('B3 480p 16:9: 854×480 en 2.5 y 864×496 en la serie 2.0 (fast y mini incluidos); sin modelo, la mayor',
    tokens('480p', '16:9', M.SEEDANCE_2_5) === t(854, 480) && tokens('480p', '16:9', M.SEEDANCE_2_0_FAST) === t(864, 496)
    && tokens('480p', '16:9', M.SEEDANCE_2_0_MINI) === t(864, 496) && S.seedanceTokens('480p', '16:9', 5) === t(864, 496));
  check('B4 9:16 y 3:4 son 16:9 y 4:3 girados: los mismos píxeles',
    ['480p', '720p', '1080p'].every((res) => tokens(res, '9:16', M.SEEDANCE_2_0_FAST) === tokens(res, '16:9', M.SEEDANCE_2_0_FAST) && tokens(res, '3:4', M.SEEDANCE_2_0) === tokens(res, '4:3', M.SEEDANCE_2_0)));
  const mayor720 = Math.max(...Object.values(OFICIAL['720p']).map(([w, h]) => t(w, h)));
  check('B5 `adaptive` y una proporción que la tabla no tiene (4:5) se cotizan con la mayor de su resolución: un techo',
    tokens('720p', 'adaptive', M.SEEDANCE_2_5) === mayor720 && tokens('720p', '4:5', M.SEEDANCE_2_5) === mayor720);
  const ejemplo = S.seedanceCostUsd({ modelId: M.SEEDANCE_2_5, resolution: '720p', durationSec: 5, ratio: '16:9' });
  check('B6 el ejemplo de precio publicado sigue igual: 720p 16:9 de 5 s en 2.5 = 108 000 tokens = USD 1.1556',
    ejemplo.tokens === 108000 && Math.abs(ejemplo.usd - 1.1556) < 1e-9, JSON.stringify(ejemplo));
  const precio = (r) => P.priceVideo({ modelId: M.SEEDANCE_2_0_FAST, durationSec: 5, aspectRatio: r, resolution: '720p' }, AJUSTES);
  const cuadrado = precio('1:1'); const ancho = precio('16:9');
  check('B7 un video cuadrado ya no se vende por debajo de su coste: cuesta casi lo mismo que uno 16:9 (antes, un 44 % menos)',
    cuadrado.usd === ancho.usd && cuadrado.credits === ancho.credits && cuadrado.detail.estimatedTokens === 108000, `${cuadrado.credits} / ${ancho.credits}`);
  const panoramico = precio('21:9');
  check('B8 y uno 21:9 ya no se cobra un 31 % de más: la tabla oficial (1470×630)', panoramico.detail.estimatedTokens === t(1470, 630));
  const usdOficial = (t(960, 960) * 5.6) / 1_000_000;
  check('B9 el suelo nunca queda por debajo del coste oficial: Credits ≥ USD oficial × Credits por dólar',
    cuadrado.credits >= Math.ceil(usdOficial * AJUSTES.creditsPerUsd), `${cuadrado.credits} ≥ ${Math.ceil(usdOficial * AJUSTES.creditsPerUsd)}`);
}

/* ═══ C · R19: editar y extender ═════════════════════════════════════════ */
console.log('\n— C · R19: editar y extender —');
{
  const pedido = (mode, model = 'SEEDANCE_2_5', aspectRatio = '9:16') => V.normalizeVideoRequest({ prompt: 'El faro', references: { videos: ['https://x/v.mp4'] }, mode, aspectRatio, model });
  const ext = pedido('extend'); const edi = pedido('edit'); const ref = pedido('reference');
  check('C1 el engine pide `adaptive` al editar y al extender (la proporción la pone el video de entrada)',
    ext.input.aspectRatio === 'adaptive' && edi.input.aspectRatio === 'adaptive' && ext.capability === 'video.reference');
  check('C2 con referencias para inspirarse, la proporción de la persona se respeta', ref.input.aspectRatio === '9:16');
  check('C3 editar sigue siendo duración -1 (la del video de entrada)', edi.input.durationSec === -1);
  const b25e = (await cuerpo(M.SEEDANCE_2_5, { ...edi.input })).body;
  const b25x = (await cuerpo(M.SEEDANCE_2_5, { ...ext.input })).body;
  check('C4 en Seedance 2.5: editar va con `edit`, `adaptive` y -1; extender con `extend` y `adaptive`',
    b25e.omni_reference_task_type === 'edit' && b25e.ratio === 'adaptive' && b25e.duration === -1
    && b25x.omni_reference_task_type === 'extend' && b25x.ratio === 'adaptive', JSON.stringify({ e: [b25e.omni_reference_task_type, b25e.ratio, b25e.duration], x: [b25x.omni_reference_task_type, b25x.ratio] }));
  /* El adaptador responde de lo suyo aunque quien lo llame no haya pedido `adaptive` (otro camino, o una llamada a mano). */
  const directo = (await cuerpo(M.SEEDANCE_2_5, { prompt: 'Quita el cartel', referenceVideos: ['https://x/v.mp4'], taskType: 'edit', aspectRatio: '16:9', durationSec: -1 })).body;
  check('C4b y si alguien le pide a 2.5 editar con otra proporción, el adaptador pone `adaptive` igualmente', directo.ratio === 'adaptive' && directo.omni_reference_task_type === 'edit', directo.ratio);
  const b25r = (await cuerpo(M.SEEDANCE_2_5, { prompt: 'Como este', referenceVideos: ['https://x/v.mp4'], aspectRatio: '9:16' })).body;
  check('C5 en 2.5, una referencia normal va con `reference` y su proporción', b25r.omni_reference_task_type === 'reference' && b25r.ratio === '9:16');
  const en20 = await Promise.all([M.SEEDANCE_2_0, M.SEEDANCE_2_0_FAST, M.SEEDANCE_2_0_MINI].map((m) => cuerpo(m, { ...edi.input })));
  check('C6 la serie 2.0 no recibe el tipo de tarea (solo existe en 2.5): editar lo dice el texto', en20.every((b) => b.body.omni_reference_task_type === undefined));
  const deTexto = (await cuerpo(M.SEEDANCE_2_5, { prompt: 'Un faro', aspectRatio: '1:1' }, 'video.generate')).body;
  check('C7 texto a video no cambia: ni tipo de tarea ni `adaptive`', deTexto.omni_reference_task_type === undefined && deTexto.ratio === '1:1');
}

/* ═══ D · R20: los cupos de las referencias ═══════════════════════════════ */
console.log('\n— D · R20: videos y audios, cada uno con su cupo —');
{
  const cuenta = (b, papel) => b.body.content.filter((c) => c.role === papel).length;
  const v = (k) => Array.from({ length: k }, (_, i) => `https://x/v${i}.mp4`);
  const a = (k) => Array.from({ length: k }, (_, i) => `https://x/a${i}.mp3`);
  const seis = await cuerpo(M.SEEDANCE_2_0, { prompt: 'Un faro', referenceVideos: v(3), referenceAudios: a(3) });
  check('D1 serie 2.0: tres videos Y tres audios (antes, los audios se quedaban sin sitio)', cuenta(seis, 'reference_video') === 3 && cuenta(seis, 'reference_audio') === 3);
  const demasiados = await cuerpo(M.SEEDANCE_2_0_FAST, { prompt: 'Un faro', referenceVideos: v(5), referenceAudios: a(5) });
  check('D2 serie 2.0: nunca más de tres de cada', cuenta(demasiados, 'reference_video') === 3 && cuenta(demasiados, 'reference_audio') === 3);
  const veinte = await cuerpo(M.SEEDANCE_2_5, { prompt: 'Un faro', referenceVideos: v(12), referenceAudios: a(12) });
  check('D3 Seedance 2.5: diez y diez', cuenta(veinte, 'reference_video') === 10 && cuenta(veinte, 'reference_audio') === 10);
  const soloAudio20 = await intentar(() => cuerpo(M.SEEDANCE_2_0, { prompt: 'Solo sonido', referenceAudios: a(1) }));
  check('D4 serie 2.0: un sonido sin imagen ni video se rechaza ANTES de salir, y no se reintenta con otro modelo',
    !soloAudio20.ok && soloAudio20.error?.retryable === false && /imagen o un video/.test(soloAudio20.error?.message ?? ''), soloAudio20.error?.message);
  const soloAudio25 = await intentar(() => cuerpo(M.SEEDANCE_2_5, { prompt: 'Solo sonido', referenceAudios: a(1) }));
  check('D5 Seedance 2.5 sí admite sonido solo', soloAudio25.ok && cuenta(soloAudio25.valor, 'reference_audio') === 1);
  check('D6 cada modelo declara su cupo, su total y si admite sonido solo',
    [M.SEEDANCE_2_0, M.SEEDANCE_2_0_FAST, M.SEEDANCE_2_0_MINI].every((m) => S.specOf(m).maxReferenceClips === 3 && S.specOf(m).maxReferenceTotalSec === 15 && S.specOf(m).audioSinImagenNiVideo === false)
    && S.specOf(M.SEEDANCE_2_5).maxReferenceClips === 10 && S.specOf(M.SEEDANCE_2_5).maxReferenceTotalSec === 30 && S.specOf(M.SEEDANCE_2_5).audioSinImagenNiVideo === true);
}

/* ═══ E · R22: el precio no lo abarata quien llama ════════════════════════ */
console.log('\n— E · R22: ni `-1` ni los segundos declarados abaratan el precio —');
{
  const c = (m, d) => S.seedanceCostUsd({ modelId: m, resolution: '720p', durationSec: d, ratio: '16:9' });
  check('E1 `-1` se cotiza como el máximo del modelo (2.0: 15 s; 2.5: 30 s), no como 5 s',
    c(M.SEEDANCE_2_0, -1).tokens === c(M.SEEDANCE_2_0, 15).tokens && c(M.SEEDANCE_2_5, -1).tokens === c(M.SEEDANCE_2_5, 30).tokens);
  const conPocos = P.priceVideo({ modelId: M.SEEDANCE_2_0, durationSec: -1, aspectRatio: '16:9', resolution: '720p' }, AJUSTES);
  const conQuince = P.priceVideo({ modelId: M.SEEDANCE_2_0, durationSec: 15, aspectRatio: '16:9', resolution: '720p' }, AJUSTES);
  check('E2 y así llega al precio: pedir -1 cuesta lo mismo que pedir el máximo', conPocos.credits === conQuince.credits && conPocos.credits > 0);
  check('E3 los techos de entrada: 15 s en la serie 2.0 y 30 s en 2.5', S.techoDeVideoDeEntrada(M.SEEDANCE_2_0_FAST) === 15 && S.techoDeVideoDeEntrada(M.SEEDANCE_2_5) === 30);
  const conVideo = await cuerpo(M.SEEDANCE_2_0, { prompt: 'Como este', referenceVideos: ['https://x/v.mp4'], referenceVideoSec: 1, durationSec: 5, aspectRatio: '16:9' });
  check('E4 el adaptador estima con el techo de entrada aunque alguien diga «1 s»',
    conVideo.withVideoInput === true && conVideo.estimatedTokens === S.seedanceTokens('720p', '16:9', 5, 15, M.SEEDANCE_2_0), `${conVideo.estimatedTokens}`);
  const sinDuracion = await cuerpo(M.SEEDANCE_2_0, { prompt: 'Que dure lo que quiera', durationSec: -1, aspectRatio: '16:9' }, 'video.generate');
  check('E4b el adaptador estima `-1` con el máximo del modelo, igual que al cotizar', sinDuracion.body.duration === -1 && sinDuracion.estimatedTokens === S.seedanceTokens('720p', '16:9', 15, 0, M.SEEDANCE_2_0), `${sinDuracion.estimatedTokens}`);
  const puerta = sinComentarios(leer('functions/src/creator/video.ts'));
  check('E5 la puerta ya no deja pasar `videoSeconds` del cliente, y cotiza con el techo del modelo elegido',
    !/videoSeconds:/.test(puerta) && /inputVideoSec: videoRequest\.references\?\.videos\?\.length \? techoDeVideoDeEntrada\(modeloDelPrecio\) : undefined/.test(puerta));
  const motor = sinComentarios(leer('functions/src/engine/video.ts'));
  check('E6 y el engine tampoco lo reenvía al adaptador', !/referenceVideoSec/.test(motor) && !/referenceVideoSec/.test(sinComentarios(leer('functions/src/engine/providers/seedance.ts'))));
  check('E7 la puerta cotiza con la proporción que de verdad se pedirá (la del engine)', /aspectRatio: String\(normalizado\.input\.aspectRatio \?\? videoRequest\.aspectRatio \?\? ''\)/.test(puerta));
}

/* ═══ F · R15: la toma que se está comprobando ════════════════════════════ */
console.log('\n— F · R15: «se está comprobando», no «se están devolviendo» —');
{
  const VID = lib('creator/video.js');
  const EST = lib('creator/estadoDeToma.js');
  const AHORA = 50_000_000;
  const META = { creditRequestId: 'fm.a.1', creditTransactionId: 'usage_fm.a.1', creditsEstimated: 75, service: 'ai_video' };
  const intento = (o) => ({ attemptId: 'a.1', number: 1, startedAt: 1000, providerKey: 'k.1', dispatched: false, ...o });
  const trabajo = (state, attempts, extra = {}) => ({ jobId: 'j.a', state, attempts, metadata: META, updatedAt: 1000, revision: 3, ...extra });
  const REF = { providerId: 'seedance', operationId: 'cgt-1' };
  const casos = [
    ['terminó bien', trabajo('completed', [intento({ dispatched: true, outcome: 'succeeded', providerRef: REF })]), 'succeeded'],
    ['en marcha, con su concesión', trabajo('running', [intento({ dispatched: true, lease: { owner: 'w', until: AHORA + 60_000 } })]), 'in_progress'],
    ['aceptada por el proveedor y viva', trabajo('waiting', [intento({ dispatched: true, outcome: 'unknown', providerRef: REF })]), 'in_progress'],
    ['salió y no volvió nadie, sin terminar', trabajo('waiting', [intento({ dispatched: true, outcome: 'unknown' })]), 'reconciling'],
    ['salió y no volvió nadie, ya terminado', trabajo('failed', [intento({ dispatched: true, outcome: 'unknown' })]), 'reconciling'],
    ['aceptada y muerta por plazo', trabajo('timed_out', [intento({ dispatched: true, outcome: 'unknown', providerRef: REF })]), 'reconciling'],
    ['falló sin dudas', trabajo('failed', [intento({ dispatched: true, outcome: 'failed', error: { code: 'CONTENT_POLICY', message: 'x' } })]), 'failed'],
    ['nunca salió y caducó', trabajo('timed_out', [intento({ dispatched: false, outcome: 'timed_out' })]), 'failed'],
  ];
  const r = casos.map(([nombre, job, esperado]) => [nombre, VID.desenlaceDeUnTrabajo(job, AHORA).outcome, esperado]);
  check('F1 cada caso, su desenlace: lo que salió y no se sabe cómo acabó es `reconciling`, nunca `failed`',
    r.every(([, obtenido, esperado]) => obtenido === esperado), r.filter(([, o, e]) => o !== e).map(([nm, o, e]) => `${nm}: ${o}≠${e}`).join(' · '));
  const cancelada = VID.desenlaceDeUnTrabajo(trabajo('cancelled', [intento({ dispatched: false })], { error: { code: 'CANCELLED', message: 'x', details: { reason: 'cancelled_by_request' } } }), AHORA);
  check('F2 la que paró la persona sin que saliera: «detenida», como siempre', cancelada.outcome === 'failed' && cancelada.cancelled === true);
  const fallo = VID.desenlaceDeUnTrabajo(casos[6][1], AHORA);
  check('F3 un fallo dice su categoría, y nada de dentro', fallo.failure === 'PROVIDER_REJECTED' && Object.keys(fallo).sort().join(',') === 'failure,outcome');
  const reserva = { estado: 'AUTHORIZED', reservado: 75, autorizadaEn: 0 };
  const iguales = casos.every(([, job]) => (VID.desenlaceDeUnTrabajo(job, AHORA).outcome === 'reconciling') === (EST.decidirEstadoDeLaToma({ reserva, trabajo: job }, AHORA, 60_000)?.estado === 'reconciling'));
  check('F4 la misma decisión que el estado de la toma (Fase 2) y la liquidación: `reconciling` ⇔ `reconciling`', iguales);

  /* En la app. */
  const { crearCargador } = await import('./filmmaker-cliente.mjs');
  const requerirApp = createRequire(path.resolve(RAIZ, 'package.json'));
  const React = requerirApp('react');
  const { renderToStaticMarkup } = requerirApp('react-dom/server');
  const hc = React.createElement;
  let botones = [];
  const Caja = ({ children, accessibilityLabel }) => hc('div', { 'aria-label': accessibilityLabel }, children);
  const Texto = ({ children }) => hc('span', null, children);
  const Toque = ({ children, onPress, disabled, accessibilityLabel }) => { botones.push({ etiqueta: accessibilityLabel, tocar: onPress, apagado: !!disabled }); return hc('button', { 'aria-label': accessibilityLabel, disabled: !!disabled }, children); };
  const rn = {
    View: Caja, Text: Texto, TouchableOpacity: Toque, ScrollView: Caja, StyleSheet: { create: (s) => s, flatten: (s) => s },
    Platform: { OS: 'web', select: (o) => o.web ?? o.default }, Linking: { openURL: async () => {} }, ActivityIndicator: () => hc('i', { 'data-girando': 'si' }),
  };
  const colores = new Proxy({}, { get: () => '#000000' });
  const cargarReal = crearCargador({ dobles: { 'react-native': rn } });
  const { crearTraductor } = cargarReal('i18n/traducir.ts');
  const formatoReal = cargarReal('i18n/formato.ts');
  const ES = cargarReal('i18n/textos/es/index.ts').es;
  const faltan = new Set();
  const t = crearTraductor('es', { es: ES }, { alFaltarUnaClave: (k) => faltan.add(k) });
  const formato = { numero: (v, o) => formatoReal.formatearNumero(v, 'es', o), lista: (c, tipo) => formatoReal.formatearLista(c, 'es', tipo) };
  const dobles = {
    react: React,
    'react-native': rn,
    '@expo/vector-icons': { Ionicons: ({ name }) => hc('i', { 'data-icono': name }) },
    'firebase/functions': { httpsCallable: () => async () => ({ data: {} }) },
    '../config/firebase': { db: {}, functions: {} },
    './creditsService': { newRequestId: () => 'id' },
    '../../contexts/ThemeContext': { useTheme: () => ({ theme: { colors: colores } }) },
    '../../contexts/IdiomaContext': { useT: () => t, useIdioma: () => ({ t, formato, locale: 'es' }) },
    '../../../contexts/ThemeContext': { useTheme: () => ({ theme: { colors: colores } }) },
    '../../../contexts/IdiomaContext': { useT: () => t, useIdioma: () => ({ t, formato, locale: 'es' }) },
    '../../utils/scale': { scale: (x) => x },
    '../../../utils/scale': { scale: (x) => x },
    '../../../utils/notify': { notify: () => {}, confirmAction: async () => true },
    '../../workspace/HojaInferior': { __esModule: true, default: () => null },
    '../../workspace/ReproductorDeVideo': { __esModule: true, default: () => null },
  };
  const cargar = crearCargador({ dobles });
  const { crearControladorDeToma } = cargar('utils/controladorDeToma.ts');
  const calma = async () => { for (let i = 0; i < 30; i++) await new Promise((res) => setImmediate(res)); };
  let oyente = null;
  let actual = { take: 2, requestId: 'fm.a.2', status: 'AUTHORIZED', outcome: 'reconciling' };
  const pedidas = [];
  const servicio = {
    cotizar: async () => ({ ok: true, valor: { status: 'QUOTED', allowed: false, reason: 'take_in_flight', takes: { current: actual, next: null, node: null } } }),
    generar: async () => { pedidas.push('generar'); return { ok: false, rechazo: { motivo: 'unknown' } }; },
    enlazar: async () => ({ ok: true, valor: { status: 'not_ready' } }),
    cancelar: async () => ({ ok: true, valor: { status: 'NOT_CANCELLED', reason: 'take_reconciling' } }),
    observarReserva: (_rid, alCambiar) => { oyente = alCambiar; return () => { oyente = null; }; },
    urlDelMaterial: async () => null,
  };
  const UNIDAD = { tipo: 'unidad', unidad: { productionId: 'prodR00001', sceneId: 'sc-0001', unitId: 'sh-0101', revision: 3, requirement: {} } };
  const c = crearControladorDeToma(servicio);
  c.abrir(UNIDAD);
  await calma();
  check('F5 en la app, `reconciling` es «comprobando»: ni «en proceso», ni «cerrando», ni una toma fallida pendiente',
    c.leer().fase.fase === 'comprobando' && c.leer().fase.toma === 2 && !c.leer().ultima, JSON.stringify({ fase: c.leer().fase, ultima: c.leer().ultima }));
  c.generar?.();
  await calma();
  check('F6 mientras se comprueba no se pide otra toma: su dinero sigue apartado', pedidas.length === 0 && c.leer().fase.fase === 'comprobando');
  oyente?.('REFUNDED', { status: 'REFUNDED', amount: -75 });
  await calma();
  check('F7 si al final se devuelve, se dice que no salió y cuánto volvió', c.leer().ultima?.estado === 'fallida' && c.leer().economia?.reembolsados === 75, JSON.stringify(c.leer().ultima));

  const Generacion = cargar('components/studio/produccion/ProductionShotGeneration.tsx').default;
  const ver = (fase) => {
    botones = [];
    const html = renderToStaticMarkup(hc(Generacion, { tipo: 'plano', toma: {
      fase, calidad: null, enElPlano: null, ultima: null, aviso: null, calidades: null, economia: null, cancelacion: null,
      elegirCalidad: () => {}, generar: () => {}, reintentar: () => {}, cancelar: () => {},
    } }));
    return { html, texto: html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '), botones: botones.slice() };
  };
  const comprobando = ver({ fase: 'comprobando', toma: 2 });
  check('F8 el panel del plano dice que se está comprobando, con su icono, y no ofrece «Detener»',
    comprobando.texto.includes(ES.filmmaker.takeReconciling) && comprobando.html.includes('data-icono="search-outline"')
    && !comprobando.texto.includes(ES.filmmaker.takeClosing) && !comprobando.botones.some((b) => b.etiqueta === ES.filmmaker.takeStop));
  const cerrando = ver({ fase: 'cerrando', toma: 2 });
  check('F9 «cerrando» sigue diciendo que se devuelven (el fallo sin dudas no cambia)', cerrando.texto.includes(ES.filmmaker.takeClosing));
  const visor = sinComentarios(leer('components/studio/produccion/ProductionViewer.tsx'));
  const mensaje = sinComentarios(leer('components/workspace/MensajeDeEstado.tsx'));
  check('F10 el visor lo cuenta como «comprobando», con su frase y la rueda de «trabajando»',
    /if \(f === 'comprobando'\) return \{ estado: 'comprobando' \};/.test(visor)
    && /comprobando: \{ icono: 'search-outline', clave: 'workspace\.statusChecking', tono: 'dinero' \}/.test(mensaje)
    && /estado === 'comprobando'/.test(mensaje));
  check('F11 ninguna clave sin frase en español', faltan.size === 0, [...faltan].join(', '));
  const LOCALES = ['es', 'en', 'pt', 'pt-PT', 'fr', 'de', 'it', 'ru', 'ko', 'zh', 'zh-TW'];
  const tiene = (l, mod, k) => new RegExp(`^  ${k}: '`, 'm').test(leer(`i18n/textos/${l}/${mod}.ts`));
  check('F12 las dos frases, en los once diccionarios', LOCALES.every((l) => tiene(l, 'filmmaker', 'takeReconciling') && tiene(l, 'workspace', 'statusChecking')),
    LOCALES.filter((l) => !(tiene(l, 'filmmaker', 'takeReconciling') && tiene(l, 'workspace', 'statusChecking'))).join(','));
  const pt = leer('i18n/textos/pt/workspace.ts'); const ptPT = leer('i18n/textos/pt-PT/workspace.ts');
  check('F13 el portugués es el de Brasil («Seus Credits», «verificando»); el europeo, aparte', /statusChecking: 'Estamos verificando[^']*Seus Credits/.test(pt) && /statusChecking: 'Estamos a verificar[^']*teus Credits/.test(ptPT));
}

/* ═══ G · las guardas ═════════════════════════════════════════════════════ */
console.log('\n— G · las guardas —');
{
  check('G1 nadie salió a la red en toda la suite', llamadasDeRed.length === 0, llamadasDeRed.join(','));
  const ANTES = git('log --format=%H -n 1 --grep "Phase 32: capability master matrix"').trim();
  const HASTA = git('log --format=%H -n 1 --grep "Phase 33: engine risks"').trim();
  const tramo = HASTA ? `${ANTES} ${HASTA}` : ANTES;
  const tocados = git(`diff --name-only ${tramo}`).trim().split('\n').filter(Boolean).filter((p) => !p.startsWith('functions/lib/'));
  const intocables = [/^functions\/src\/runtime\//, /^functions\/src\/job\//, /^functions\/src\/settlement\//, /^functions\/src\/credits\/(creditEngine|creditTransactions|creditValidation|creditCosts)\.ts$/,
    /^functions\/src\/creator\/(plano|toma|estadoDeToma|lotes|recuperacionDeTomas|requisitoDelServidor)\.ts$/, /^services\/filmmaker\/espejo\//, /^functions\/src\/filmmaker\//, /\.rules$/, /firestore\.indexes\.json$/];
  const pisados = tocados.filter((p) => intocables.some((re) => re.test(p)));
  check('G2 ni el runtime, ni el Job Engine, ni el barrido, ni el Credit Engine, ni F1-A/F1-D (plano, toma, requisito, espejo), ni reglas', pisados.length === 0, pisados.join(','));
  const plano = sinComentarios(leer('functions/src/creator/plano.ts'));
  check('G3 la huella y la plantilla de la toma no cambian: su versión es la misma', /fm-plano-\d/.test(plano) && git(`diff ${tramo} -- functions/src/creator/plano.ts`).trim() === '');
  const doc = leer('docs/FILMMAKER-CAPABILITY-MASTER.md');
  const fila = (id) => (doc.match(new RegExp(`^\\| ${id} \\| ([^|]+) \\|`, 'm')) ?? [])[1]?.trim();
  check('G4 la matriz dice cerrados R2, R15, R18, R19, R20 y R22 en la Fase 33, y R3 y R4 esperando una decisión',
    ['R2', 'R15', 'R18', 'R19', 'R20', 'R22'].every((r) => fila(r) === 'cerrado (Fase 33)') && fila('R3') === 'decisión' && fila('R4') === 'decisión',
    ['R2', 'R3', 'R4', 'R15', 'R18', 'R19', 'R20', 'R22'].map((r) => `${r}:${fila(r)}`).join(' '));
  check('G5 R3 y R4 quedan preparados con su cambio exacto, sus archivos y sus pruebas', /#### R3 · /.test(doc) && /#### R4 · /.test(doc) && /barrerRecuperables/.test(doc) && /reconciliarTrabajos/.test(doc));
  check('G6 documentado', /### Fase 33 · /.test(leer('docs/FILMMAKER.md')));
  check('G7 en la cadena, detrás de la matriz maestra', /filmmaker-capability-master\.test\.mjs && node test\/filmmaker-riesgos\.test\.mjs/.test(leer('functions/package.json')));
}

console.log(`\n${failures ? '✘' : '✔'} filmmaker-riesgos: ${n - failures}/${n}`);
process.exit(failures ? 1 : 0);
