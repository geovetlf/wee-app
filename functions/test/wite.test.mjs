/*
 * WITE · TRANSFORM YOUR IDENTITY EN WEËLS (2026-11-26, docs/WITE.md).
 *
 * Qué vigila:
 *   A. El modelo: estados y transiciones, la puerta (falla cerrada), la validación de lo que manda la app (sujeto
 *      cerrado, consentimiento obligatorio, duración, voz del personaje rechazada mientras no exista), las etapas que
 *      NO existen declaradas como bloqueadas y la calidad automática (una muestra nunca es publicable).
 *   B. La instrucción interna: solo valores cerrados, @video1/@imagen1, conservar escena y a los demás.
 *   C. Seedance edit: la petición efectiva (precio y cuerpo) sale con ratio adaptive y duración -1, como exige ModelArk.
 *   D. La arquitectura: WITE entra por generateVideo (sin Function nueva, sin claves nuevas, sin Core), no llama a
 *      ningún proveedor, la app no habla con proveedores y publicar exige una decisión de la persona.
 *   E. Reglas, borrado de cuenta, flag apagado y los 42 diccionarios.
 *   F. El orquestador con una Firestore de mentira: puerta cerrada, consentimiento, muestra no publicable, cancelación.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib', p));
const leer = (p) => fs.readFileSync(path.resolve(here, '../../', p), 'utf8');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

/* ── F se prepara antes de cargar el módulo: getFirestore de mentira ── */
const firestore = require('firebase-admin/firestore');
const docs = new Map();
const refDe = (ruta) => ({
  ruta,
  get: async () => ({ exists: docs.has(ruta), data: () => docs.get(ruta) }),
  set: async (d) => { docs.set(ruta, { ...(docs.get(ruta) || {}), ...d }); },
  update: async (d) => { docs.set(ruta, { ...(docs.get(ruta) || {}), ...d }); },
});
const baseFalsa = {
  collection: (c) => ({ doc: (id) => refDe(`${c}/${id}`) }),
  runTransaction: async (fn) => fn({
    get: (ref) => ref.get(),
    create: (ref, d) => { if (docs.has(ref.ruta)) throw new Error('ya existe'); docs.set(ref.ruta, d); },
    update: (ref, d) => {
      const actual = { ...(docs.get(ref.ruta) || {}) };
      for (const [k, v] of Object.entries(d)) {
        if (k.includes('.')) { const [a, b] = k.split('.'); actual[a] = { ...(actual[a] || {}), [b]: v }; } else actual[k] = v;
      }
      docs.set(ref.ruta, actual);
    },
  }),
};
firestore.getFirestore = () => baseFalsa;

const M = lib('wite/modelo.js');
const P = lib('creator/prompts.js');

console.log('\n── A · el modelo ──');
check('A1 · estados del contrato completos', ['QUEUED', 'ANALYZING', 'TRACKING', 'TRANSFORMING', 'AUDIO_PROCESSING', 'COMPOSITING', 'QUALITY_CHECK', 'RENDERING', 'COMPLETED', 'FAILED', 'CANCELLED'].every((e) => M.ESTADOS_DE_WITE.includes(e)));
check('A2 · el camino de hoy solo recorre trabajo real', JSON.stringify(M.CAMINO_ACTUAL) === JSON.stringify(['QUEUED', 'ANALYZING', 'TRANSFORMING', 'QUALITY_CHECK', 'COMPLETED']));
check('A3 · se avanza un paso, nunca se salta', M.puedePasar('QUEUED', 'ANALYZING') && !M.puedePasar('QUEUED', 'TRANSFORMING') && !M.puedePasar('ANALYZING', 'COMPLETED'));
check('A4 · de un terminal no se sale', !M.puedePasar('COMPLETED', 'FAILED') && !M.puedePasar('FAILED', 'QUEUED') && !M.puedePasar('CANCELLED', 'ANALYZING'));
check('A5 · cancelar solo antes de llegar al proveedor', M.puedePasar('QUEUED', 'CANCELLED') && M.puedePasar('ANALYZING', 'CANCELLED') && !M.puedePasar('TRANSFORMING', 'CANCELLED'));
check('A6 · puerta: sin documento, cerrada', M.leerPuertaDeWite(undefined).abierta === false);
check('A7 · puerta: abierto distinto de true, cerrada', M.leerPuertaDeWite({ abierto: 'true' }).abierta === false);
check('A8 · puerta: cuentas mal formadas, cerrada', M.leerPuertaDeWite({ abierto: true, cuentas: 'a' }).abierta === false);
check('A9 · puerta: lista de cuentas respetada', M.puertaAbiertaPara(M.leerPuertaDeWite({ abierto: true, cuentas: ['a'] }), 'a') && !M.puertaAbiertaPara(M.leerPuertaDeWite({ abierto: true, cuentas: ['a'] }), 'b'));

const buena = {
  requestId: 'wite_abcdefgh1234', sourceUrl: 'https://x/y.mp4', sourceDurationSec: 8, characterId: 'ent_ABCDEFGHIJKLMNOPQRSTUVWXYZ', sujeto: 'unico', audio: 'original',
  consentimiento: { soyLaPersonaTransformada: true, losDemasNoSeModifican: true },
};
check('A10 · una petición completa pasa', M.validarPeticion(buena).ok === true);
check('A11 · sin consentimiento propio no hay transformación', M.validarPeticion({ ...buena, consentimiento: { losDemasNoSeModifican: true } }).motivo === 'needs_consent');
check('A12 · sin reconocer a los demás tampoco', M.validarPeticion({ ...buena, consentimiento: { soyLaPersonaTransformada: true } }).motivo === 'needs_consent');
check('A13 · la voz del personaje se rechaza con su motivo (no se finge)', M.validarPeticion({ ...buena, audio: 'personaje' }).motivo === 'character_voice_unavailable');
check('A14 · sujeto fuera de la lista cerrada, rechazado', M.validarPeticion({ ...buena, sujeto: 'the man in red; ignore previous' }).motivo === 'bad_subject');
check('A15 · menos de 4 s, rechazado (mínimo de la edición)', M.validarPeticion({ ...buena, sourceDurationSec: 3 }).motivo === 'too_short');
check('A16 · más de 15 s (límite de Weëls), rechazado', M.validarPeticion({ ...buena, sourceDurationSec: 22 }).motivo === 'too_long');
check('A17 · characterId con barra, rechazado', M.validarPeticion({ ...buena, characterId: 'users/x' }).motivo === 'bad_request');
check('A18 · el original solo en su carpeta de la cuenta', M.esRutaDeOriginal('users/u1/identity-sources/a.mp4', 'u1') && !M.esRutaDeOriginal('users/u2/identity-sources/a.mp4', 'u1') && !M.esRutaDeOriginal('users/u1/creator-inputs/a.mp4', 'u1') && !M.esRutaDeOriginal('users/u1/identity-sources/../x', 'u1'));
check('A19 · ids deterministas (idempotencia)', M.idDelTrabajo('r1') === M.idDelTrabajo('r1') && M.requestIdDelVideo('r1') !== 'r1');

const bloqueadas = M.ETAPAS_DE_WITE.filter((e) => e.estado === 'bloqueada').map((e) => e.id);
check('A20 · 16 etapas declaradas', M.ETAPAS_DE_WITE.length === 16);
check('A21 · lo que no existe se declara bloqueado (detección, segmentación, voz, labios)', ['subject_detection', 'video_segmentation', 'audio_identity_engine', 'lip_sync'].every((id) => bloqueadas.includes(id)), bloqueadas.join(','));
check('A22 · calidad: una muestra nunca es apta', M.revisarResultado({ url: 'u', assetId: 'a', demo: true }, 8).ok === false);
check('A23 · calidad: sin vídeo no es apta', M.revisarResultado({ url: null, assetId: null }, 8).ok === false);
check('A24 · calidad: duración distinta se avisa', M.revisarResultado({ url: 'u', assetId: 'a', durationSec: 3 }, 8).avisos.includes('duracion_distinta'));

console.log('\n── B · la instrucción interna ──');
const pr = P.promptDeSustitucionDeIdentidad('izquierda', false);
check('B1 · nombra @video1 y @imagen1', pr.includes('@video1') && pr.includes('@imagen1'));
check('B2 · pide conservar actuación, escena y a los demás', /performance/.test(pr) && /background/.test(pr) && /every other person/.test(pr));
check('B3 · ropa conservada salvo que se pida', /keep the clothing/.test(pr) && /including the clothing/.test(P.promptDeSustitucionDeIdentidad('unico', true)));
check('B4 · solo valores cerrados: la función no acepta texto libre', P.promptDeSustitucionDeIdentidad.length === 2 && !/\$\{[^}]*(texto|descripcion|prompt)/.test(leer('functions/src/creator/prompts.ts').split('promptDeSustitucionDeIdentidad')[1] || ''));

console.log('\n── C · Seedance edit ──');
const { peticionEfectivaDeSeedance, SEEDANCE_MODEL_IDS, specOf } = lib('engine/providers/seedance.js');
const edit = peticionEfectivaDeSeedance('video.reference', SEEDANCE_MODEL_IDS.SEEDANCE_2_5, { taskType: 'edit', durationSec: -1, aspectRatio: '16:9', referenceVideos: ['v'], referenceImages: ['i'] }, {});
check('C1 · edit sale con ratio adaptive (documentación oficial)', edit.ratio === 'adaptive', edit.ratio);
check('C2 · edit sale con duración -1', edit.duration === -1);
check('C3 · edit cotiza con vídeo de entrada', edit.withVideoInput === true && edit.inputVideoSec > 0);
const ref = peticionEfectivaDeSeedance('video.reference', SEEDANCE_MODEL_IDS.SEEDANCE_2_5, { taskType: 'reference', durationSec: 5, aspectRatio: '16:9', referenceVideos: ['v'] }, {});
check('C4 · la referencia normal no cambia (sigue con su proporción)', ref.ratio === '16:9');
const W = lib('wite/index.js');
const { normalizeVideoRequest } = lib('engine/video.js');
const nv = normalizeVideoRequest(W.peticionDeVideo({ ...buena, sourceUrl: 'https://s/v.mp4', cambiarRopa: false }, 'https://s/i.png', 'SEEDANCE_2_0_MINI', '480p'), {});
check('C5 · WITE pide edición a 480p con el modelo de la puerta y SIN audio generado (el original lo pone FFmpeg)', nv.capability === 'video.reference' && nv.input.taskType === 'edit' && nv.modelId === SEEDANCE_MODEL_IDS.SEEDANCE_2_0_MINI && nv.input.durationSec === -1 && nv.input.resolution === '480p' && nv.input.generateAudio === false);
check('C6 · imagen del personaje y vídeo original como referencias', JSON.stringify(nv.input.referenceImages) === '["https://s/i.png"]' && JSON.stringify(nv.input.referenceVideos) === '["https://s/v.mp4"]');

console.log('\n── G · calidad adaptativa, FFmpeg y consumo real ──');
const Q = lib('wite/calidad.js');
const MD = lib('wite/medios.js');
const seedanceMin = specOf(SEEDANCE_MODEL_IDS.SEEDANCE_2_0_MINI).resolutions;
const d1 = Q.decidirResolucion({ ancho: 720, alto: 1280, areaDelProtagonista: 0.3, personas: 1, cambiosPorSegundo: 0.1 }, ['360p', '480p']);
check('G1 · con detección y escena simple, el producto elige 360p si el modelo lo ofrece', d1.resolucion === '360p' && d1.motivos.includes('360p_suficiente') && d1.siguiente === '480p');
const d2 = Q.decidirResolucion({ ancho: 720, alto: 1280, areaDelProtagonista: 0.3, personas: 1 }, seedanceMin);
check('G2 · Seedance no tiene 360p: sale 480p y se dice por qué', d2.resolucion === '480p' && d2.motivos.includes('minimo_del_proveedor') && d2.preferidaPorElProducto === '360p');
check('G3 · sin detección del protagonista no se arriesga: 480p', Q.decidirResolucion({ ancho: 720, alto: 1280 }, ['360p', '480p']).resolucion === '480p');
const sube = (rasgos) => Q.decidirResolucion({ ancho: 720, alto: 1280, areaDelProtagonista: 0.3, personas: 1, cambiosPorSegundo: 0, ...rasgos }, ['360p', '480p']).motivos;
check('G4 · protagonista pequeño, muchas personas o mucho movimiento suben a 480p', sube({ areaDelProtagonista: 0.05 }).includes('protagonista_pequeno') && sube({ personas: 4 }).includes('muchas_personas') && sube({ cambiosPorSegundo: 2 }).includes('mucho_movimiento'));
check('G5 · nunca HD: la siguiente resolución ofrecida no pasa de 480p', Q.decidirResolucion({ areaDelProtagonista: 0.3 }, seedanceMin).siguiente === null);
const rem = MD.argumentosDeRemezcla('t.mp4', 'o.mp4', 'f.mp4', true).join(' ');
check('G6 · remux: imagen del transformado + audio del original, sin reencodar si ya es H.264', rem.includes('-map 0:v:0 -map 1:a:0?') && rem.includes('-c:v copy') && rem.includes('+faststart'));
check('G7 · si no es H.264 se convierte a H.264 (MP4 / H.264 del producto)', MD.argumentosDeRemezcla('t', 'o', 'f', false).join(' ').includes('-c:v libx264'));
check('G8 · contar cambios de escena', MD.contarCambios('a pts_time:1 b pts_time:2.5') === 2);
check('G9 · sin binario de FFmpeg, WITE no se rompe: sonda nula', (await MD.mediosDeWee(null).sondear('x')) === null);
check('G10 · fps desde la salida de FFmpeg', Q.leerFps('Stream #0:0: Video: h264, yuv420p, 480x854, 24 fps, 24 tbr') === 24);
const V = lib('creator/video.js');
const ajustes = { pricingMode: 'real', creditsPerUsd: 100, margin: 0.3 };
check('G11 · consumo real: se cobra lo que costó si es menos que lo reservado', V.cobroAlCerrar(484, true, 0.81, 'ai_video_advanced', ajustes) < 484);
check('G12 · nunca más de lo reservado', V.cobroAlCerrar(50, true, 5, 'ai_video_advanced', ajustes) === 50);
check('G13 · sin la opción interna, todo sigue como antes', V.cobroAlCerrar(484, false, 0.81, 'ai_video_advanced', ajustes) === 484);
check('G14 · coste desconocido: se cobra lo reservado, no se inventa', V.cobroAlCerrar(484, true, undefined, 'ai_video_advanced', ajustes) === 484);
const videoSrcG = sinComentarios(leer('functions/src/creator/video.ts')).replace(/\s+/g, ' ');
check('G15 · la opción interna solo la pone WITE, con la marca privada; la app no puede fabricarla', videoSrcG.includes('atenderVideo({ ...request, data: datos }, { [MARCA_INTERNA]: true, consumoReal: true, ...extra })') && videoSrcG.includes("const MARCA_INTERNA: unique symbol = Symbol('opcionesInternasDeVideo');") && videoSrcG.includes('[MARCA_INTERNA] === true ? (x as OpcionesInternasDeVideo) : {}') && videoSrcG.includes('}, atenderVideo);'));
check('G16 · el Credit Engine no se toca: se usa su finalAmount', videoSrcG.includes('...(cobrado !== spend.amount ? { finalAmount: cobrado } : {})'));
check('G17 · la puerta elige el modelo de edición, por defecto el más barato', M.leerPuertaDeWite({ abierto: true }).modelo === 'SEEDANCE_2_0_MINI' && M.leerPuertaDeWite({ abierto: true, modelo: 'SEEDANCE_2_5' }).modelo === 'SEEDANCE_2_5' && M.leerPuertaDeWite({ abierto: true, modelo: 'kling' }).modelo === 'SEEDANCE_2_0_MINI');
check('G18 · otra resolución solo 360p o 480p', M.validarPeticion({ ...buena, resolucion: '720p' }).motivo === 'resolution_unavailable' && M.validarPeticion({ ...buena, resolucion: '480p' }).ok);
const idx = sinComentarios(leer('functions/src/wite/index.ts'));
check('G19 · el resultado final es un material aparte, con el original como fuente', idx.includes('assetId: idDelResultado(peticion.requestId)') && idx.includes('sourceAssetIds: [original.assetId]'));
check('G20 · el intermedio mudo se retira (un solo resultado en Mis creaciones)', idx.includes('retirarMaterial(accountId, resultado.assetId)'));

console.log('\n── H · activos de persona real autorizados en BytePlus ──');
const pa = M.leerPuertaDeWite({ abierto: true, activosDePersonaReal: { acct1: { 'v1.mp4': 'asset://abc123', 'malo.mp4': 'https://x/y', '../x': 'asset://zzz999' }, 'a/b': { 'v.mp4': 'asset://qqq111' } } });
check('H1 · solo entra un asset://<id> bien formado, por cuenta y por archivo', pa.activosDePersonaReal.acct1?.['v1.mp4'] === 'asset://abc123' && pa.activosDePersonaReal.acct1?.['malo.mp4'] === undefined && pa.activosDePersonaReal.acct1?.['../x'] === undefined && pa.activosDePersonaReal['a/b'] === undefined);
check('H2 · el activo es de ESE original de ESA cuenta', M.activoParaElOriginal(pa, 'acct1', 'users/acct1/identity-sources/v1.mp4') === 'asset://abc123' && M.activoParaElOriginal(pa, 'acct2', 'users/acct2/identity-sources/v1.mp4') === null && M.activoParaElOriginal(pa, 'acct1', 'users/acct1/identity-sources/otro.mp4') === null);
check('H3 · puerta cerrada o sin mapa: ningún activo', Object.keys(M.leerPuertaDeWite(undefined).activosDePersonaReal).length === 0 && Object.keys(M.leerPuertaDeWite({ abierto: true }).activosDePersonaReal).length === 0);
const nva = normalizeVideoRequest(W.peticionDeVideo({ ...buena, sourceUrl: 'https://s/v.mp4', cambiarRopa: false }, 'https://s/i.png', 'SEEDANCE_2_0_MINI', '480p', 'asset://abc123'), {});
check('H4 · con activo, el vídeo que viaja al proveedor es el asset://, no la URL', JSON.stringify(nva.input.referenceVideos) === '["asset://abc123"]');
const vs = sinComentarios(leer('functions/src/creator/video.ts')).replace(/\s+/g, ' ');
check('H5 · la puerta del vídeo solo deja pasar los activos que le da WITE por dentro (nunca desde data)', vs.includes('activosAutorizados.includes(value) ? value : assertInputImageUrl(value, uid)') && vs.includes('ownUrls(data.references.videos, uid, opciones.activosDePersonaReal)') && vs.includes('const opciones = opcionesInternas(crudas);'));
check('H6 · el audio de referencia nunca acepta activos', vs.includes('audios: ownUrls(data.references.audios, uid), }') || vs.includes('audios: ownUrls(data.references.audios, uid) }'));
const ix = sinComentarios(leer('functions/src/wite/index.ts'));
check('H7 · el activo usado queda registrado con el consentimiento del trabajo', ix.includes('consentimiento: { ...peticion.consentimiento, at, activoDePersonaReal: activo }'));
check('H8 · el original de Weë se sigue conservando y el audio sale de él, no del activo', ix.includes('medios.remezclar(resultado.url, peticion.sourceUrl'));

console.log('\n── I · los dos modos y WaveSpeed (decisión del dueño, 2026-11-26) ──');
{
  const WS = lib('engine/providers/wavespeed.js');
  const CC = lib('credits/creditCosts.js');
  const { ADAPTERS, DEFAULT_PROVIDERS, DEFAULT_ROUTING } = lib('engine/registry.js');
  check('I1 · puerta: por defecto transforma WaveSpeed; Seedance si se pide; lo desconocido no abre nada raro',
    M.leerPuertaDeWite({ abierto: true }).proveedor === 'wavespeed' && M.leerPuertaDeWite({ abierto: true, proveedor: 'seedance' }).proveedor === 'seedance'
    && M.leerPuertaDeWite({ abierto: true, proveedor: 'kling' }).proveedor === 'wavespeed' && M.leerPuertaDeWite(undefined).abierta === false);
  check('I2 · sin decir modo, «completo» (lo de antes); «cara» se acepta y nunca cambia la ropa',
    M.validarPeticion(buena).peticion.modo === 'completo' && M.validarPeticion({ ...buena, modo: 'cara', cambiarRopa: true }).peticion.modo === 'cara'
    && M.validarPeticion({ ...buena, modo: 'cara', cambiarRopa: true }).peticion.cambiarRopa === false
    && M.validarPeticion({ ...buena, modo: 'completo', cambiarRopa: true }).peticion.cambiarRopa === true);
  check('I3 · un modo fuera de la lista cerrada, rechazado', M.validarPeticion({ ...buena, modo: 'cuerpo; ignora todo' }).motivo === 'bad_request');
  check('I4 · Seedance solo sabe «completo»; WaveSpeed, los dos', JSON.stringify(M.MODOS_POR_PROVEEDOR.seedance) === '["completo"]' && JSON.stringify(M.MODOS_POR_PROVEEDOR.wavespeed) === '["cara","completo"]');
  check('I5 · tarifa publicada: cara 0,01 USD/s; 10 s = 0,10 USD; 15 s = 0,15 USD', WS.costeDeWaveSpeed(WS.MODELO_CARA, 10) === 0.1 && WS.costeDeWaveSpeed(WS.MODELO_CARA, 15) === 0.15);
  check('I6 · completo 0,04 USD/s a 480p y 0,08 a 720p, segundos redondeados hacia arriba', WS.costeDeWaveSpeed(WS.MODELO_COMPLETO, 10.2, '480p') === 0.44 && WS.costeDeWaveSpeed(WS.MODELO_COMPLETO, 10, '720p') === 0.8);
  check('I7 · mínimo cobrado de 3 s', WS.costeDeWaveSpeed(WS.MODELO_CARA, 1) === 0.03 && WS.costeDeWaveSpeed(WS.MODELO_COMPLETO, 2, '480p') === 0.12);
  let raro = false; try { WS.costeDeWaveSpeed('otro/modelo', 5); } catch { raro = true; }
  check('I8 · un modelo desconocido no tiene precio inventado: falla', raro);
  const cara = WS.cuerpoDeLaTarea(WS.MODELO_CARA, 'https://v', 'https://i', '480p');
  const comp = WS.cuerpoDeLaTarea(WS.MODELO_COMPLETO, 'https://v', 'https://i', '480p');
  check('I9 · cuerpo de cara: video + face_image, la cara más grande, sin prompt', cara.video === 'https://v' && cara.face_image === 'https://i' && cara.target_index === 0 && !('prompt' in cara));
  check('I10 · cuerpo de completo: modo replace a 480p con la imagen del personaje', comp.mode === 'replace' && comp.resolution === '480p' && comp.image === 'https://i' && comp.video === 'https://v');
  const sinClave = ADAPTERS.wavespeed?.isConfigured?.() === false;
  process.env.WAVESPEED_API_KEY = 'valor-de-prueba-wavespeed-no-real-0001';
  const conClave = ADAPTERS.wavespeed?.isConfigured?.() === true;
  delete process.env.WAVESPEED_API_KEY;
  check('I11 · adaptador registrado; lee su clave por el nombre (sin ella, no configurado)', sinClave && conClave);
  check('I12 · fuera de TODA cadena por defecto: nunca es respaldo de nada', Object.values(DEFAULT_ROUTING).every((r) => !r.chain.some((l) => l.provider === 'wavespeed')));
  check('I13 · con topes de llamadas y gasto diario', DEFAULT_PROVIDERS.wavespeed?.limits?.maxCallsPerDay > 0 && DEFAULT_PROVIDERS.wavespeed?.limits?.maxUsdPerDay > 0);
  check('I14 · dos servicios propios en el catálogo de Credits, con el mínimo de WaveSpeed como suelo', CC.CREDIT_COSTS.ai_identity_face === 4 && CC.CREDIT_COSTS.ai_identity_full === 16 && !!CC.SERVICE_LABEL.ai_identity_face && !!CC.SERVICE_LABEL.ai_identity_full);
  const src = sinComentarios(leer('functions/src/wite/index.ts'));
  check('I15 · el cobro: reserva → motor → consumo real nunca mayor que lo reservado → o reembolso', /creditEngine\.spendCredits\(/.test(src) && /Math\.min\(spend\.amount, creditosDeUnCoste\(/.test(src)
    && /catch \(error\) \{\s*await devolver\(/.test(src) && /if \(result\.demo\) \{\s*\/\*[^]*?\*\/\s*await devolver\(/.test(leer('functions/src/wite/index.ts')));
  check('I16 · el adaptador solo lee del Storage de Weë y no repite el POST de la tarea', /objetoDelStorageDeWee\(url\)/.test(leer('functions/src/engine/providers/wavespeed.ts')) && /new ProviderError\(error\.message, 'wavespeed', error\.status, false\)/.test(leer('functions/src/engine/providers/wavespeed.ts')));
}

console.log('\n── D · arquitectura ──');
const witeSrc = ['modelo.ts', 'personajes.ts', 'index.ts'].map((f) => sinComentarios(leer(`functions/src/wite/${f}`))).join('\n');
check('D1 · WITE no declara ninguna Function', !/onCall|onRequest|onSchedule|onDocument/.test(witeSrc));
/* De los adaptadores solo lee tablas (modelos, tarifas) y si hay clave; generar SIEMPRE va por el WEË AI ENGINE o por la puerta del vídeo. */
check('D2 · WITE no monta claves ni llama a proveedores (de los adaptadores solo lee tablas y si están configurados)', !/AI_SECRETS|MODEL_SECRETS|fetch\(|ARK_API_KEY|WAVESPEED_API_KEY|bytepluses|api\.wavespeed|\.run\(/.test(witeSrc)
  && (witeSrc.match(/from '\.\.\/engine\/providers\/[^']+'/g) || []).every((l) => l === "from '../engine/providers/seedance'" || l === "from '../engine/providers/wavespeed'")
  && /import \{ SEEDANCE_MODEL_IDS, specOf \} from '\.\.\/engine\/providers\/seedance'/.test(witeSrc)
  && /import \{ MODELO_CARA, MODELO_COMPLETO, costeDeWaveSpeed, wavespeedAdapter \} from '\.\.\/engine\/providers\/wavespeed'/.test(witeSrc)
  && /wavespeedAdapter\.isConfigured\(\)/.test(witeSrc) && (witeSrc.match(/wavespeedAdapter\./g) || []).length === 1);
check('D2b · WaveSpeed se pide POR SU NOMBRE al motor (nunca como respaldo) y está fuera de toda cadena por defecto',
  /engine\.generate\(\{[\s\S]{0,900}prefs: \{ allowedProviders: \['wavespeed'\], modelId: p\.modelId/.test(witeSrc)
  && !/'wavespeed'/.test(sinComentarios(leer('functions/src/engine/registry.ts')).split('DEFAULT_ROUTING')[1] || ''));
check('D3 · WITE no pasa por el Core Runtime (regla 10)', !/from '\.\.\/runtime/.test(witeSrc) && !/conductorDeWee|pedirMedio/.test(witeSrc));
const videoSrc = sinComentarios(leer('functions/src/creator/video.ts'));
check('D4 · entra por generateVideo, que se reinvoca a sí misma', /transformarIdentidad !== undefined/.test(videoSrc) && /atenderTransformacion\(uid, data\.transformarIdentidad, \{ porVideo/.test(videoSrc));
check('D5 · la reentrada es la misma puerta (atenderVideo), con la marca interna', /porVideo = \(datos: Record<string, unknown>, extra: \{ activosDePersonaReal\?: readonly string\[\] \} = \{\}\): Promise<unknown> =>\s*atenderVideo\(\{ \.\.\.request, data: datos \}, \{ \[MARCA_INTERNA\]: true, consumoReal: true, \.\.\.extra \}\)/.test(videoSrc));
check('D6 · el Content Core solo enlaza material de la misma cuenta', /anotarOrigenDelDerivado[\s\S]{0,700}materialEsDeLaCuenta\(fuente, accountId\)/.test(leer('functions/src/content/index.ts')));
const app = sinComentarios(leer('services/witeService.ts') + leer('screens/TransformarIdentidadScreen.tsx'));
check('D7 · la app no habla con proveedores', !/bytepluses|seedance|elevenlabs|ARK_|api\.|fetch\('http/i.test(app));
check('D8 · la app llama a generateVideo con transformarIdentidad', /'generateVideo'/.test(app) && /transformarIdentidad: datos/.test(app));
check('D9 · publicar exige aceptar primero (decidir → compositor)', /decidir\(trabajo\.jobId, 'aceptado'\)[\s\S]{0,400}navigate\('Create'/.test(app));
check('D10 · una muestra no se puede usar para publicar', /deshabilitado=\{trabajo\.demo \|\| !trabajo\.outputUrl\}/.test(app));
check('D11 · la app no calcula Credits: el precio llega del servidor', /witeService\.cotizar/.test(app) && !/creditsFor|priceVideo/.test(app));

console.log('\n── E · reglas, borrado, flag, idiomas ──');
const reglas = leer('firestore.rules');
check('E1 · trabajos: solo lectura de la cuenta dueña (o de uno que aún no existe, para escucharlo), ninguna escritura', /match \/identityTransformJobs\/\{jobId\} \{(?:\s*\/\/[^\n]*)*\s*allow read: if isAuthenticated\(\) && \(resource == null \|\| resource\.data\.accountId == request\.auth\.uid\);\s*allow write: if false;/.test(reglas));
const storage = leer('storage.rules');
check('E2 · originales: solo vídeo mp4/mov de la propia cuenta, ≤200 MB, sin reescribir', /identity-sources[\s\S]{0,700}video\/\(mp4\|quicktime\)[\s\S]{0,120}allow update, delete: if false/.test(storage) && /200 \* 1024 \* 1024/.test(storage));
check('E3 · eliminar la cuenta borra sus trabajos de WITE', /coleccion: 'identityTransformJobs', campo: 'accountId'/.test(leer('functions/src/cuenta/borrado.ts')));
check('E4 · el botón del compositor nace apagado', /TRANSFORMAR_IDENTIDAD_EN_WEELS: boolean = false;/.test(leer('constants/transformarIdentidad.ts')));
check('E5 · y el compositor lo respeta', /isWeel && TRANSFORMAR_IDENTIDAD_EN_WEELS &&/.test(leer('screens/CreateScreen.tsx')));
const usadas = [...new Set((leer('screens/TransformarIdentidadScreen.tsx').match(/weels\.wite[A-Za-z]+/g) || []))].map((k) => k.slice(6));
const idiomas = fs.readdirSync(path.resolve(here, '../../i18n/textos')).filter((d) => fs.statSync(path.resolve(here, '../../i18n/textos', d)).isDirectory());
const huecos = [];
for (const l of idiomas) {
  const t = leer(`i18n/textos/${l}/weels.ts`);
  for (const k of usadas) if (!new RegExp(`\\b${k}:`).test(t)) huecos.push(`${l}:${k}`);
}
check(`E6 · las ${usadas.length} claves en los ${idiomas.length} idiomas`, idiomas.length === 42 && huecos.length === 0, huecos.slice(0, 5).join(','));
check('E7 · Credits sin traducir en las claves de WITE (el precio máximo)', idiomas.every((l) => /witeUpTo: '.*\{\{credits\}\} Credits/.test(leer(`i18n/textos/${l}/weels.ts`))));
check('E8 · portugués de Brasil (você) en WITE', /witeIntro: '[^']*seus personagens/.test(leer('i18n/textos/pt/weels.ts')) && /Você/.test(leer('i18n/textos/pt/weels.ts')));

console.log('\n── F · el orquestador ──');
const ctx = { porVideo: async () => { throw new Error('no debe llamarse'); }, plazoMs: 1_500_000 };
const r1 = await W.atenderTransformacion('acct1', { accion: 'personajes' }, ctx);
check('F1 · puerta cerrada: no hay personajes ni nada', r1.status === 'REJECTED' && r1.reason === 'not_available');
const r2 = await W.atenderTransformacion('acct1', { accion: 'ejecutar', ...buena }, ctx);
check('F2 · puerta cerrada: ejecutar no toca nada', r2.reason === 'not_available' && ![...docs.keys()].some((k) => k.startsWith('identityTransformJobs/')));
docs.set('aiSettings/identityTransform', { abierto: true, cuentas: ['acct1'] });
const r3 = await W.atenderTransformacion('acct2', { accion: 'cotizar', ...buena }, ctx);
check('F3 · puerta abierta solo a su lista', r3.reason === 'not_available');
const r4 = await W.atenderTransformacion('acct1', { accion: 'ejecutar', ...buena, consentimiento: { soyLaPersonaTransformada: true } }, ctx);
check('F4 · sin consentimiento completo, rechazo antes de cualquier trabajo', r4.reason === 'needs_consent' && ![...docs.keys()].some((k) => k.startsWith('identityTransformJobs/')));
const r5 = await W.atenderTransformacion('acct1', { accion: 'ejecutar', ...buena, sourceUrl: 'https://evil.example/v.mp4' }, ctx);
check('F5 · un vídeo de fuera del Storage de la cuenta, rechazado', r5.reason === 'needs_video');

docs.set('identityTransformJobs/wite_demo12345', { jobId: 'wite_demo12345', accountId: 'acct1', status: 'COMPLETED', decision: 'pendiente', demo: true });
const r6 = await W.atenderTransformacion('acct1', { accion: 'decidir', jobId: 'wite_demo12345', decision: 'aceptado' }, ctx);
check('F6 · una muestra no se acepta para publicar', r6.reason === 'demo_not_publishable' && docs.get('identityTransformJobs/wite_demo12345').decision === 'pendiente');
const r7 = await W.atenderTransformacion('acct2', { accion: 'decidir', jobId: 'wite_demo12345', decision: 'descartado' }, ctx);
check('F7 · nadie decide sobre el trabajo de otra cuenta', r7.reason === 'not_found');
docs.set('identityTransformJobs/wite_real12345', { jobId: 'wite_real12345', accountId: 'acct1', status: 'COMPLETED', decision: 'pendiente', demo: false });
const r8 = await W.atenderTransformacion('acct1', { accion: 'decidir', jobId: 'wite_real12345', decision: 'aceptado' }, ctx);
check('F8 · un resultado real se acepta (y aun así publicar es aparte)', r8.status === 'DECIDED' && docs.get('identityTransformJobs/wite_real12345').decision === 'aceptado');
docs.set('identityTransformJobs/wite_cola12345', { jobId: 'wite_cola12345', accountId: 'acct1', status: 'QUEUED' });
docs.set('identityTransformJobs/wite_prov12345', { jobId: 'wite_prov12345', accountId: 'acct1', status: 'TRANSFORMING' });
const r9 = await W.atenderTransformacion('acct1', { accion: 'cancelar', jobId: 'wite_cola12345' }, ctx);
const r10 = await W.atenderTransformacion('acct1', { accion: 'cancelar', jobId: 'wite_prov12345' }, ctx);
check('F9 · en cola se cancela', r9.status === 'CANCELLED' && docs.get('identityTransformJobs/wite_cola12345').status === 'CANCELLED');
check('F10 · en el proveedor no se finge una cancelación', r10.status === 'NOT_CANCELLED' && r10.reason === 'already_at_provider' && docs.get('identityTransformJobs/wite_prov12345').status === 'TRANSFORMING');

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ WITE: todo en orden');
process.exit(failures ? 1 : 0);
