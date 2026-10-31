/**
 * WEË MUSIC v0 — LA SECCIÓN, SU COMPOSER, SU CONTRATO Y LO QUE NO SE ACTIVÓ.
 *
 * Todo local: sin red, sin proveedores, sin coste. Qué fija:
 *
 *   A  honestidad: la generación sigue CERRADA, ningún adaptador musical está registrado ni configurado, el servidor de
 *      Music no hace llamadas de red y el Router/registro del engine no cambiaron.
 *   B  el contrato interno (validación pura) y los adaptadores preparatorios (siempre «no disponible»).
 *   C  los normalizadores de MiniMax (la única API con contrato HTTP oficial legible): solo traducen, nunca envían.
 *   D  la matriz de proveedores: lo no confirmado queda como no confirmado y nada se ofrece como disponible.
 *   E  las reglas del cliente (modelo, audio de referencia, composer, borrador, brief).
 *   F  i18n: 16 idiomas con las mismas claves y huecos, sin nombres de proveedor, sin «Reel», claves usadas que existen.
 *   G  componentes: cajas comunes (ningún TextInput propio), sin imágenes remotas, roles de accesibilidad, puerta de iOS.
 *   H  integración mínima: Specialist → MusicScreen y nada más en los archivos compartidos.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(aqui, '../..');
const require = createRequire(import.meta.url);
const ts = require('typescript');
let fallo = 0;
const check = (nombre, ok, evidencia = '') => { if (!ok) fallo++; process.stdout.write(`${ok ? '✔' : '✘'} ${nombre}${evidencia ? ` — ${evidencia}` : ''}\n`); };
const leer = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const existe = (rel) => fs.existsSync(path.join(RAIZ, rel));
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
const aJs = (rel, reemplazos = []) => {
  let src = leer(rel);
  for (const [de, a] of reemplazos) src = src.split(de).join(a);
  return ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
};
const dataUrl = (js) => 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');
const cargarTs = (rel, reemplazos) => import(dataUrl(aJs(rel, reemplazos)));

const CAP = await cargarTs('constants/musicCapabilities.ts');
const capUrl = dataUrl(aJs('constants/musicCapabilities.ts'));
const COMP = await cargarTs('constants/musicComposer.ts', [["from './musicCapabilities'", `from '${capUrl}'`]]);
const compUrl = dataUrl(aJs('constants/musicComposer.ts', [["from './musicCapabilities'", `from '${capUrl}'`]]));
const MODEL = await cargarTs('utils/musicModel.ts');
const AUDIO = await cargarTs('utils/musicAudio.ts');
const BRIEF = await cargarTs('utils/musicBrief.ts', [["from '../constants/musicComposer'", `from '${compUrl}'`]]);

const lib = (f) => require(path.join(RAIZ, 'functions/lib/music', f));
const CONTRATO = lib('contract.js');
const MATRIZ = lib('matrix.js');
const PROV = lib('providers.js');

const IDIOMAS = ['da', 'de', 'en', 'es', 'fr', 'hi', 'it', 'ja', 'ko', 'pt', 'pt-PT', 'ru', 'sv', 'tr', 'zh', 'zh-TW'];

/* ── A · honestidad ─────────────────────────────────────────────────────────────────────────────────────────────────────────── */
check('A1 la generación de música está CERRADA (MUSIC_GENERACION_VALIDADA = false)', CAP.MUSIC_GENERACION_VALIDADA === false && /MUSIC_GENERACION_VALIDADA = false;/.test(leer('constants/musicCapabilities.ts')));
check('A2 la grabación en iPhone está autorizada (decisión del dueño) y el texto de permiso de iOS lo cubre: música + mensajes de voz, sin WeeTalk', CAP.MUSIC_GRABACION_EN_IOS_AUTORIZADA === true && !/WeeTalk/.test(JSON.parse(leer('app.json')).expo.ios.infoPlist.NSMicrophoneUsageDescription) && /musicales/.test(JSON.parse(leer("app.json")).expo.ios.infoPlist.NSMicrophoneUsageDescription));
const registro = leer('functions/src/engine/registry.ts');
check('A3 ningún adaptador musical nuevo está registrado: el registro no nombra «music-minimax», «music-mureka», etc.', !/music-(minimax|elevenlabs|mureka|yinchao)/.test(registro) && /'music\.generate': routing\('music\.generate', chain\('music-pending'\)/.test(registro));
check('A4 el servidor de Music no se exporta desde functions/src/index.ts', !/\.\/music/.test(leer('functions/src/index.ts')));
const srcMusic = ['contract.ts', 'matrix.ts', 'providers.ts', 'index.ts'].map((f) => sinComentarios(leer(`functions/src/music/${f}`))).join('\n');
check('A5 ningún archivo de functions/src/music llama a la red (fetch, http, axios, node-fetch, XMLHttpRequest, fetchJson)', !/\b(fetch|fetchJson|fetchBytes|axios|XMLHttpRequest)\s*\(|from ['"](node:)?https?['"]|require\(['"](node:)?https?['"]\)/.test(srcMusic));
check('A6 y no importa claves ni secretos (secrets, defineSecret, process.env)', !/defineSecret|process\.env|from '\.\.\/secrets'/.test(srcMusic));
const todasCap = CAP.CAPACIDADES_MUSIC;
check('A7 solo son «implementadas» las que funcionan sin proveedor: grabar, borrador local y biblioteca', todasCap.filter((c) => c.estado === 'implementada').map((c) => c.id).sort().join(',') === 'draft,library,recordReference');
check('A8 ninguna capacidad que dependa de un motor es usable hoy (con el interruptor cerrado)', todasCap.filter((c) => c.estado !== 'implementada').every((c) => CAP.capacidadUsable(c.id) === false));
check('A9 el coste es «pendiente» en todo lo que depende de un motor: no hay cifras inventadas', todasCap.filter((c) => c.responsable === 'music-engine' || c.responsable === 'ninguno').every((c) => c.coste === 'pendiente'));
check('A10 la matriz del cliente no promete tarareo, MIDI, edición de instrumentos ni procesado: son pendientes', ['humToSong', 'midi', 'instrumentEdit', 'audioProcessing'].every((id) => CAP.capacidadDeMusic(id).estado === 'pendiente'));
/*
 * EL ANCLA DE ESTAS COMPROBACIONES CAMBIÓ AL INTEGRAR WEË MUSIC EN WEË VERSIÓN CREATOR.
 * Comparaban con 2845ea94, la base de la rama original de Music, y esa rama ya no es esta: aquí llegó sobre a77ea340, que
 * trae todo el trabajo de por medio. Lo que protegen sigue igual: Music no toca el engine, el Core, Credits, Weë Brain ni
 * nada del servidor fuera de functions/src/music. El ancla es ahora el punto donde se integró.
 */
const ANCLA_DE_INTEGRACION = 'a77ea340';
check('A11 el Router y el registro del engine no se tocaron en esta rama',
  (await import('node:child_process')).execSync(`git diff --name-only ${ANCLA_DE_INTEGRACION} -- functions/src/engine functions/src/core`, { cwd: RAIZ }).toString().trim() === '');

/* ── B · contrato y adaptadores preparatorios ───────────────────────────────────────────────────────────────────────────────── */
const base = { version: CONTRATO.MUSIC_CONTRACT_VERSION, requestId: 'r1' };
const v = (r) => CONTRATO.validarSolicitudMusical({ ...base, ...r });
check('B1 la versión del contrato es la misma en el servidor y en el cliente', CONTRATO.MUSIC_CONTRACT_VERSION === CAP.MUSIC_CONTRATO_VERSION);
check('B2 generate: pide descripción o letra', v({ operation: 'music.generate' }).ok === false && v({ operation: 'music.generate', description: 'una balada' }).ok === true);
check('B3 generate: un instrumental no lleva letra', v({ operation: 'music.generate', instrumental: true, lyrics: 'la la' }).ok === false);
check('B4 reference: exige un asset de referencia (nunca bytes) y editSection: origen, sección e instrucción',
  v({ operation: 'music.reference', description: 'x' }).ok === false && v({ operation: 'music.reference', description: 'x', referenceAssetId: 'a1' }).ok === true
  && v({ operation: 'music.editSection', sourceAssetId: 'a', sectionId: 's' }).ok === false && v({ operation: 'music.editSection', sourceAssetId: 'a', sectionId: 's', instruction: 'más suave' }).ok === true);
check('B5 límites: descripción 500, letra 3000, duración 3–300 s', v({ operation: 'music.generate', description: 'x'.repeat(501) }).ok === false && v({ operation: 'music.generate', lyrics: 'x'.repeat(3001) }).ok === false
  && v({ operation: 'music.generate', description: 'x', durationSec: 2 }).ok === false && v({ operation: 'music.generate', description: 'x', durationSec: 301 }).ok === false && v({ operation: 'music.generate', description: 'x', durationSec: 180 }).ok === true);
check('B6 sin requestId (idempotencia) o con otra versión, no vale', v({ operation: 'music.generate', description: 'x', requestId: '' }).ok === false && CONTRATO.validarSolicitudMusical({ ...base, version: '9.9.9', operation: 'music.generate', description: 'x' }).ok === false);
check('B7 el contrato no tiene campos de audio en bruto (base64, bytes, buffer)', !/base64|bytes|Buffer/i.test(sinComentarios(leer('functions/src/music/contract.ts')).replace(/referenceMaxBytes/g, '')));
const adaptadores = Object.values(PROV.ADAPTADORES_MUSICALES_PREPARADOS);
check('B8 hay cuatro adaptadores preparatorios con id «music-<proveedor>»', adaptadores.length === 4 && adaptadores.every((a) => /^music-(minimax|elevenlabs|mureka|yinchao)$/.test(a.id)), adaptadores.map((a) => a.id).join(','));
const idsRegistro = [...registro.matchAll(/^\s{2}'?([a-z0-9-]+)'?: [a-zA-Z]+Adapter,/gm)].map((m) => m[1]);
check('B9 ningún id de adaptador musical choca con un id del registro (elevenlabs y minimax de voz siguen siendo suyos)', idsRegistro.length > 5 && adaptadores.every((a) => !idsRegistro.includes(a.id)), idsRegistro.join(','));
check('B10 ningún adaptador está configurado ni dice soportar nada: el Router no los ofrecería',
  adaptadores.every((a) => a.isConfigured() === false && ['music.generate', 'audio.sfx', 'voice.tts', 'text.generate'].every((c) => a.supports(c) === false)));
let fallos = 0;
for (const a of adaptadores) { try { await a.run({}); } catch (e) { if (e.name === 'ProviderError' && e.retryable === false) fallos++; } }
check('B11 run() lanza un ProviderError no reintentable: nunca hay red ni coste', fallos === 4);

/* ── C · normalizadores de MiniMax ──────────────────────────────────────────────────────────────────────────────────────────── */
const mm = (r, o) => PROV.normalizarSolicitudMiniMax({ ...base, ...r }, o);
const g = mm({ operation: 'music.generate', description: 'balada tranquila', genres: ['pop'], moods: ['calm'], lyrics: 'Verso uno' });
check('C1 generate → music-3.0, letra propia, salida por URL, mp3 44,1 kHz, sin stream', g.ok && g.endpoint === 'https://api.minimax.io/v1/music_generation' && g.body.model === 'music-3.0' && g.body.lyrics === 'Verso uno'
  && g.body.output_format === 'url' && g.body.stream === false && g.body.audio_setting.format === 'mp3' && g.body.audio_setting.sample_rate === 44100 && g.body.lyrics_optimizer === undefined);
const sinLetra = mm({ operation: 'music.generate', description: 'una canción alegre' });
check('C2 sin letra, pide el optimizador de letra', sinLetra.ok && sinLetra.body.lyrics_optimizer === true);
const ins = mm({ operation: 'music.generate', description: 'piano suave', instrumental: true });
check('C3 instrumental → is_instrumental con prompt, sin letra', ins.ok && ins.body.is_instrumental === true && ins.body.lyrics === undefined && ins.body.lyrics_optimizer === undefined);
check('C4 un prompt de más de 2000 caracteres o una letra de más de 3500 se rechazan', mm({ operation: 'music.generate', description: 'x'.repeat(2001) }).ok === false && mm({ operation: 'music.generate', lyrics: 'x'.repeat(3501) }).ok === false);
const ref = mm({ operation: 'music.reference', description: 'estilo parecido pero más lento', referenceAssetId: 'a' }, { referenciaUrl: 'https://ejemplo.invalid/a.mp3' });
check('C5 reference → music-cover con audio_url (un solo origen) y prompt de 10 a 300', ref.ok && ref.body.model === 'music-cover' && ref.body.audio_url === 'https://ejemplo.invalid/a.mp3' && ref.body.audio_base64 === undefined
  && mm({ operation: 'music.reference', description: 'corto', referenceAssetId: 'a' }, { referenciaUrl: 'u' }).ok === false);
check('C6 extender, remix, secciones y stems no existen en MiniMax: UNSUPPORTED (no se inventan), y tampoco el tempo',
  ['music.extend', 'music.remix', 'music.editSection', 'music.stems'].every((op) => mm({ operation: op }).code === 'UNSUPPORTED') && mm({ operation: 'music.generate', description: 'x', tempoBpm: 120 }).code === 'UNSUPPORTED');
const ahora = 1_000_000;
const ok = PROV.normalizarRespuestaMiniMax({ base_resp: { status_code: 0 }, data: { status: 2, audio: 'https://cdn.invalid/x.mp3' }, extra_info: { music_duration: 61.5 } }, ahora);
check('C7 respuesta completada → URL, mp3, duración y caducidad de 24 h', ok.status === 'completed' && ok.audio.providerUrl === 'https://cdn.invalid/x.mp3' && ok.audio.durationSec === 61.5 && ok.audio.expiresAt === ahora + 86_400_000);
const e1026 = PROV.normalizarRespuestaMiniMax({ base_resp: { status_code: 1026 } }, ahora);
const e1002 = PROV.normalizarRespuestaMiniMax({ base_resp: { status_code: 1002 } }, ahora);
const e1008 = PROV.normalizarRespuestaMiniMax({ base_resp: { status_code: 1008 } }, ahora);
check('C8 errores: 1026 contenido, 1002 límite (reintentable), 1008 saldo (no reintentable)', e1026.code === 'CONTENT_FLAGGED' && !e1026.retryable && e1002.code === 'RATE_LIMITED' && e1002.retryable && e1008.code === 'PROVIDER_ERROR' && !e1008.retryable);
const enCurso = PROV.normalizarRespuestaMiniMax({ base_resp: { status_code: 0 }, data: { status: 1 } }, ahora);
check('C9 «en curso» (status 1) NO se convierte en accepted: la documentación no da con qué sondear', enCurso.status === 'failed' && enCurso.retryable === true);
check('C10 una respuesta basura no revienta ni se toma por buena', PROV.normalizarRespuestaMiniMax(null, ahora).status === 'failed' && PROV.normalizarRespuestaMiniMax({ data: { status: 2 } }, ahora).status === 'failed');

/* ── D · la matriz de proveedores ───────────────────────────────────────────────────────────────────────────────────────────── */
const P = MATRIZ.PROVEEDORES_MUSICALES;
check('D1 cuatro candidatos: Mureka, MiniMax, Yinchao y ElevenLabs; ninguno habilitado; Suno no', P.map((p) => p.id).sort().join(',') === 'elevenlabs,mureka,minimax,yinchao'.split(',').sort().join(',') && P.every((p) => p.habilitado === false) && !/suno/i.test(JSON.stringify(P)));
check('D2 lo que no tiene documentación oficial no trae endpoint: solo MiniMax lo trae', P.filter((p) => p.endpoint).map((p) => p.id).join(',') === 'minimax');
check('D3 Yinchao no tiene ninguna capacidad «documentada»', Object.values(P.find((p) => p.id === 'yinchao').capacidades).every((n) => n !== 'documentada'));
check('D4 ningún coste está confirmado y los derechos comerciales de ninguno están «aprobados»', P.every((p) => p.coste !== 'confirmado' && /por_confirmar|declarados_por_plan/.test(p.derechosComerciales)));
check('D5 la restricción de MiniMax a usuarios nuevos (2026-08-20) consta', /2026-08-20/.test(P.find((p) => p.id === 'minimax').restricciones.join(' ')));
check('D6 capacidadesOfrecibles() es vacía, incluso fingiendo que todo está configurado', Object.keys(MATRIZ.capacidadesOfrecibles()).length === 0 && Object.keys(MATRIZ.capacidadesOfrecibles(() => true)).length === 0);
const idsServidor = new Set(Object.keys(P[0].capacidades));
const idsCliente = new Set(todasCap.map((c) => c.id));
check('D7 los ids de capacidad del servidor existen en el cliente (la matriz es la misma)', [...idsServidor].every((id) => idsCliente.has(id)), [...idsServidor].filter((id) => !idsCliente.has(id)).join(','));
check('D8 la matriz del cliente no cita como proveedor a quien el servidor no confirma (capacidad por capacidad)',
  todasCap.every((c) => c.proveedores.every((id) => P.find((p) => p.id === id).capacidades[c.id] === 'documentada')),
  todasCap.flatMap((c) => c.proveedores.filter((id) => P.find((p) => p.id === id).capacidades[c.id] !== 'documentada').map((id) => `${c.id}:${id}`)).join(','));

/* ── E · reglas del cliente ─────────────────────────────────────────────────────────────────────────────────────────────────── */
const ej = MODEL.cancionDeEjemplo();
const sinStems = { ...ej, esEjemplo: false, pistas: ej.pistas.map((p) => ({ ...p, urlStem: undefined })) };
check('E1 la canción de ejemplo es un dato de diseño: marcada, sin audio, nunca exportable como stems', ej.esEjemplo === true && !ej.audioUrl && MODEL.formatosDeExportacion(ej).every((f) => f.disponible === false));
check('E2 una lista de instrumentos sin audio propio NO es mezcla por pista', MODEL.modoDeMezcla(sinStems) === 'soloEstereo' && MODEL.modoDeMezcla(ej) === 'pistasReales');
check('E3 la edición solo es «localizada» si el motor lo garantiza', MODEL.alcanceDeEdicion({ ...ej, garantizaResto: false }) === 'completa' && MODEL.alcanceDeEdicion(ej) === 'localizada');
check('E4 exportar: el audio solo con audioUrl, la letra solo con letra, MIDI nunca', (() => {
  const f = (c) => Object.fromEntries(MODEL.formatosDeExportacion(c).map((x) => [x.id, x.disponible]));
  const a = f({ ...sinStems, audioUrl: 'https://x.invalid/a.mp3', letra: 'hola' });
  return a.audio && a.lyrics && !a.stems && !a.midi && f(sinStems).audio === false;
})());
check('E5 «solo» silencia a las demás y «silenciada» nunca suena', (() => {
  const ps = [{ ...ej.pistas[0], solo: true }, { ...ej.pistas[1] }, { ...ej.pistas[2], silenciada: true, solo: true }];
  return MODEL.pistaSuena(ps[0], ps) === true && MODEL.pistaSuena(ps[1], ps) === false && MODEL.pistaSuena(ps[2], ps) === false;
})());
check('E6 las secciones sin tiempos no inventan duración', MODEL.duracionDeSeccion({ id: 'x', tipo: 'verse' }) === undefined && MODEL.duracionDeSeccion({ id: 'x', tipo: 'verse', inicioSec: 10, finSec: 40 }) === 30);
const num = (n, o) => new Intl.NumberFormat('es', o).format(n);
check('E7 mm:ss con el formateador del idioma', MODEL.tiempoMmSs(65, num) === '1:05' && MODEL.tiempoMmSs(0, num) === '0:00');
const V = AUDIO.validarAudioDeReferencia;
check('E8 audio de referencia: formato, tamaño y duración se validan', V({ mime: 'audio/mpeg', bytes: 1000, duracionSec: 20 }) === 'ok' && V({ nombre: 'a.wav', bytes: 1000, duracionSec: 20 }) === 'ok'
  && V({ mime: 'video/mp4', nombre: 'a.mp4' }) === 'badFormat' && V({ mime: 'audio/mpeg', bytes: 11 * 1024 * 1024 }) === 'tooBig' && V({ mime: 'audio/mpeg', duracionSec: 61 }) === 'tooLong'
  && V({ mime: 'audio/mpeg', duracionSec: 3 }) === 'tooShort' && V({ mime: 'audio/mpeg', bytes: 0 }) === 'empty');
check('E9 niveles: los decibelios se acotan a 0..1 y sin medidor no hay onda', AUDIO.nivelDeDecibelios(-60) === 0 && AUDIO.nivelDeDecibelios(0) === 1 && AUDIO.nivelDeDecibelios(undefined) === 0 && AUDIO.reducirPicos([], 8).length === 0 && AUDIO.reducirPicos([1, 0, 1, 0], 2).join() === '0.5,0.5');
check('E10 los límites de la referencia son los de la interfaz (6–60 s, 10 MB)', AUDIO.LIMITES_DE_REFERENCIA.minSec === 6 && AUDIO.LIMITES_DE_REFERENCIA.maxSec === 60 && AUDIO.LIMITES_DE_REFERENCIA.maxBytes === 10 * 1024 * 1024);
const sel = COMP.alternarOpcionMusic(COMP.SELECCION_VACIA_MUSIC, COMP.GRUPOS_DE_MUSIC[0], 'pop');
const sel2 = COMP.alternarOpcionMusic(sel, COMP.GRUPOS_DE_MUSIC[0], 'rock');
check('E11 las opciones de un grupo no múltiple son de una; volver a tocar la quita', sel.elegidas.genre.join() === 'pop' && sel2.elegidas.genre.join() === 'rock' && COMP.alternarOpcionMusic(sel, COMP.GRUPOS_DE_MUSIC[0], 'pop').elegidas.genre.length === 0);
const it = COMP.crearIntencionMusic('idea', sel, '  una balada  ', '', undefined);
check('E12 la intención estructurada solo lleva ids y texto: sin audio ni rutas', it.descripcion === 'una balada' && it.generos.join() === 'pop' && it.referencia === undefined && !/uri|file:|blob:/.test(JSON.stringify(it)));
check('E13 qué falta: la letra propia pide letra; tararear pide audio; la idea pide descripción',
  COMP.queFaltaMusic('lyrics', '', '', false).join() === 'lyrics' && COMP.queFaltaMusic('hum', '', '', false).join() === 'audio' && COMP.queFaltaMusic('idea', '', '', false).join() === 'description' && COMP.queFaltaMusic('idea', 'x', '', false).length === 0);
const dummyT = (k, o = {}) => `${k}${Object.values(o).join('|')}`;
const brief = BRIEF.armarBriefMusic({ t: dummyT, lista: (xs) => xs.join('+') }, 'idea', sel, 'MI DESCRIPCIÓN ORIGINAL', '');
check('E14 «No sé»: el brief conserva la descripción original intacta y pide orientación, no la canción', /MI DESCRIPCIÓN ORIGINAL/.test(brief) && /music\.briefAsk/.test(brief));
const guardado = BRIEF.serializarBorrador({ punto: 'idea', descripcion: 'x'.repeat(900), letra: 'y'.repeat(4000), sel: { ...sel, uri: 'file:///audio.m4a' } });
const leido = BRIEF.leerBorrador(guardado);
check('E15 el borrador recorta, no guarda nada que no sea texto o elección (ni audio ni rutas) y se lee de vuelta', leido.descripcion.length === 500 && leido.letra.length === 3000 && !/file:|audio\.m4a|uri/.test(guardado) && leido.sel.elegidas.genre[0] === 'pop');
check('E16 un borrador roto o ajeno se descarta sin romper', BRIEF.leerBorrador('{no es json') === null && BRIEF.leerBorrador(null) === null && BRIEF.leerBorrador('{"punto":"otro"}') === null);

/* ── F · i18n ───────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
const claves = (l) => {
  const m = new Map();
  for (const linea of leer(`i18n/textos/${l}/music.ts`).split('\n')) {
    const x = linea.match(/^  (\w+): '((?:[^'\\]|\\.)*)',$/);
    if (x) m.set(x[1], x[2].replace(/\\'/g, "'"));
  }
  return m;
};
const ES = claves('es');
const huecos = (s) => [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort().join(',');
check('F1 los 16 idiomas tienen music.ts y lo registran en su index', IDIOMAS.every((l) => existe(`i18n/textos/${l}/music.ts`) && /import \{ music \} from '\.\/music';/.test(leer(`i18n/textos/${l}/index.ts`)) && /^\s+music,$/m.test(leer(`i18n/textos/${l}/index.ts`))));
check('F2 cada idioma tiene EXACTAMENTE las claves del español', IDIOMAS.every((l) => { const c = claves(l); return c.size === ES.size && [...ES.keys()].every((k) => c.has(k)); }), IDIOMAS.map((l) => `${l}:${claves(l).size}`).join(' '));
check('F3 y los mismos {{huecos}} en cada frase', IDIOMAS.every((l) => [...ES].every(([k, v]) => huecos(claves(l).get(k) ?? '') === huecos(v))), IDIOMAS.flatMap((l) => [...ES].filter(([k, v]) => huecos(claves(l).get(k) ?? '') !== huecos(v)).map(([k]) => `${l}.${k}`)).slice(0, 5).join(','));
check('F4 el diccionario no tiene claves repetidas dentro de un archivo', IDIOMAS.every((l) => { const ks = [...leer(`i18n/textos/${l}/music.ts`).matchAll(/^  (\w+): /gm)].map((m) => m[1]); return new Set(ks).size === ks.length; }));
const PROVEEDORES_EN_UI = /Mureka|MiniMax|Yinchao|ElevenLabs|Seedance|Gemini|DeepSeek|(?<![\p{L}])Suno(?![\p{L}])|OpenAI/iu;
check('F5 ningún texto de ningún idioma nombra un proveedor o un modelo de IA (la persona no ve proveedores)', IDIOMAS.every((l) => [...claves(l).values()].every((v) => !PROVEEDORES_EN_UI.test(v))));
check('F6 ni «Reel», ni «Wee» sin diéresis, ni «Weë» traducido', IDIOMAS.every((l) => [...claves(l).values()].every((v) => !/\bReels?\b/.test(v) && !/\bWee\b(?! ?Talk)/.test(v))));
check('F7 el ruso va en registro formal (nunca «ты»/«твой») y el portugués de Brasil tutea con «você»',
  ![...claves('ru').values()].some((v) => /(?<![\p{L}])(ты|тебе|тебя|твой|твоя|твоё|твои|тво[её]м)(?![\p{L}])/iu.test(v)) && [...claves('pt').values()].some((v) => /(?<![\p{L}])você(?![\p{L}])/u.test(v)));
check('F8 el diccionario de Brasil no usa palabras de la norma europea que ya conocemos (ficheiro, ecrã, telemóvel)', ![...claves('pt').values()].some((v) => /ficheiro|ecrã|telemóvel/i.test(v)));
const usadas = new Set();
for (const f of fs.readdirSync(path.join(RAIZ, 'components/music')).map((n) => `components/music/${n}`).concat(['screens/MusicScreen.tsx', 'utils/musicBrief.ts'])) {
  for (const m of leer(f).matchAll(/music\.([A-Za-z0-9]+)(?=['"`,)}\s])/g)) usadas.add(m[1]);
}
const dinamicos = ['eqBand_', 'export_', 'fx_', 'genre_', 'instr_', 'missing_', 'refIntent_', 'section_', 'status_', 'voice_', 'mood_', 'duration_', 'result_'];
const comentarios = new Set(['process', 'reference', 'stems', 'editSection', 'borrador', 'brief']);
const faltan = [...usadas].filter((k) => !ES.has(k) && !dinamicos.includes(k) && !comentarios.has(k) && !dinamicos.some((d) => k.startsWith(d)));
check('F9 toda clave estática `music.x` que usa un componente existe en el diccionario', faltan.length === 0, faltan.join(','));
const prefijos = ['eqBand_low', 'export_audio', 'fx_reverb', 'genre_pop', 'instr_vocals', 'missing_audio', 'refIntent_inspire', 'section_intro', 'status_preparada', 'voice_duet', 'mood_calm', 'duration_30', 'result_song'];
check('F10 y las dinámicas más usadas existen', prefijos.every((k) => ES.has(k)));
const catalogosClave = [...leer('constants/musicComposer.ts').matchAll(/(clave\w*|claveTitulo|claveAyuda|clave): '(\w+)'/g)].map((m) => m[2]).concat([...leer('constants/musicCapabilities.ts').matchAll(/clave(?:Titulo|Nota): '(\w+)'/g)].map((m) => m[1]));
check('F11 todas las claves que guardan los catálogos (constants/music*.ts) existen', catalogosClave.every((k) => ES.has(k)), catalogosClave.filter((k) => !ES.has(k)).join(','));
check('F12 CONTROL: el detector de proveedores ve «ElevenLabs» y no ve «motor»', PROVEEDORES_EN_UI.test('Proveedor: ElevenLabs') && !PROVEEDORES_EN_UI.test('Proveedores: 2 motores'));
check('F13 el ruso sigue la regla del plural con `Intl.PluralRules` (music no define variantes _one/_few/_many)', ![...ES.keys()].some((k) => /_(one|few|many)$/.test(k)));

/* ── G · componentes ────────────────────────────────────────────────────────────────────────────────────────────────────────── */
const archivosUI = fs.readdirSync(path.join(RAIZ, 'components/music')).map((n) => `components/music/${n}`).concat(['screens/MusicScreen.tsx']);
const uiSrc = archivosUI.map((f) => [f, sinComentarios(leer(f))]);
check('G1 ningún campo de texto propio: todo se escribe en CajaDePrompt o CampoQueCrece', uiSrc.every(([, s]) => !/<TextInput\b/.test(s)));
check('G2 la descripción y la letra usan la caja común de Weë AI', /<CajaDePrompt/.test(leer('components/music/MusicComposer.tsx')) && /<CajaDePrompt/.test(leer('components/music/LetraYEstilo.tsx')) && /<CampoQueCrece/.test(leer('components/music/ReproductorDeCancion.tsx')));
check('G3 sin imágenes remotas ni URLs escritas en los componentes', uiSrc.every(([, s]) => !/uri:\s*['"]https?:|source=\{\{\s*uri:\s*['"]http|<Image\b/.test(s)));
check('G4 todo TouchableOpacity lleva rol de accesibilidad', uiSrc.every(([f, s]) => (s.match(/<TouchableOpacity\b/g) || []).length <= (s.match(/<TouchableOpacity[^>]*accessibilityRole=|<TouchableOpacity\s*\n(?:[^>]*\n)*?[^>]*accessibilityRole=/g) || []).length), uiSrc.filter(([f, s]) => (s.match(/<TouchableOpacity\b/g) || []).length > (s.match(/accessibilityRole="(button|tab)"/g) || []).length).map(([f]) => f).join(','));
check('G5 el estado de cada capa es TEXTO (ChipDeEstado), nunca solo color, y los avisos usan live region', /accessibilityLabel=\{t\(/.test(leer('components/music/piezas.tsx')) && /accessibilityLiveRegion="polite"/.test(leer('components/music/MelodiaDeReferencia.tsx')));
check('G6 el botón «Generar canción» está desactivado mientras la generación esté cerrada, con su motivo', /desactivado=\{!MUSIC_GENERACION_VALIDADA \|\| falta\.length > 0\}/.test(leer('components/music/MusicComposer.tsx')) && /motivo=\{!MUSIC_GENERACION_VALIDADA/.test(leer('components/music/MusicComposer.tsx')));
check('G7 no hay animación de generación ni progreso simulado (ActivityIndicator solo para Weë Brain y la biblioteca)', uiSrc.every(([f, s]) => !/ActivityIndicator/.test(s) || /MusicComposer|MisCreacionesMusic/.test(f)) && uiSrc.every(([, s]) => !/Animated\.|setInterval\(|setTimeout\(/.test(s)));
check('G8 la grabación en iPhone está tras la puerta del permiso de micrófono', /Platform\.OS === 'ios' && !MUSIC_GRABACION_EN_IOS_AUTORIZADA/.test(leer('components/music/MelodiaDeReferencia.tsx')) && ES.has('refIosPending'));
check('G9 expo-av solo se toca en hooks/useMusicAudio.ts y no se añadió ninguna dependencia', archivosUI.every((f) => !/expo-av/.test(leer(f))) && /expo-av/.test(leer('hooks/useMusicAudio.ts')) && (() => {
  const nuevo = JSON.parse(leer('package.json')); const viejo = JSON.parse((require('node:child_process')).execSync('git show 2845ea94:package.json', { cwd: RAIZ }).toString());
  return JSON.stringify(nuevo.dependencies) === JSON.stringify(viejo.dependencies);
})());
check('G10 el audio de una referencia nunca se sube ni se guarda: el borrador solo serializa texto', !/AsyncStorage\.setItem\([^)]*(uri|grabacion|referencia)/.test(leer('components/music/MusicComposer.tsx')) && !/uploadBytes|putFile|creatorUploads/.test(archivosUI.map(leer).join('\n')));
check('G11 nada llama al Credit Engine desde Music: ni spendCredits, ni creditsService, ni httpsCallable',
  !/spendCredits|creditsService|httpsCallable|refundCredits/.test(archivosUI.map(leer).join('\n')));
check('G12 el único camino que puede consumir Credits es Weë Brain por useBrainChat (una sola referencia)', archivosUI.filter((f) => /useBrainChat/.test(leer(f))).join(',') === 'components/music/MusicComposer.tsx');

check('G13 la canción de ejemplo nunca se presenta como «completada» (ni su audio ni sus pistas)', /esEjemplo \? 'resultadoNoDisponible' : mezcla === 'pistasReales' \? 'completado'/.test(leer('components/music/Workstation.tsx')) && /<ChipDeEstado estado=\{cancion\.audioUrl \? 'completado' : 'resultadoNoDisponible'\} \/>/.test(leer('components/music/Workstation.tsx')));

const compo = leer('components/music/MusicComposer.tsx');
const cuerpoAyuda = (compo.match(/const pedirAyuda = useCallback\(async \(\) => \{[\s\S]*?\n  \}, \[chat, navigation/) || [''])[0];
check('G14 el doble toque no envía dos veces: guarda SÍNCRONA con useRef puesta antes del primer await y liberada en finally',
  /const enVuelo = useRef\(false\)/.test(compo) && /if \(enVuelo\.current \|\| chat\.busy\) return;\s*enVuelo\.current = true;/.test(cuerpoAyuda)
  && cuerpoAyuda.indexOf('enVuelo.current = true') < cuerpoAyuda.indexOf('await chat.send') && /finally \{\s*enVuelo\.current = false;/.test(cuerpoAyuda));
check('G15 los dos botones de «No sé…» ya no se llaman igual: la caja envía «askBrain» y el botón de la fila «helpMeButton», distintos en los 16 idiomas',
  /etiquetaEnviar=\{t\('music\.askBrain'\)\}/.test(compo) && IDIOMAS.every((l) => claves(l).get('askBrain') && claves(l).get('askBrain') !== claves(l).get('helpMeButton')));
check('G16 aviso previo: «ayúdame a elegir» usa Weë Brain y puede consumir Credits por bloques; sin precio inventado en ningún idioma',
  /<Nota>\{t\('music\.brainNotice'\)\}<\/Nota>/.test(compo) && IDIOMAS.every((l) => /Weë Brain/.test(claves(l).get('brainNotice') ?? '') && /Credits/.test(claves(l).get('brainNotice') ?? '') && !/\d/.test(claves(l).get('brainNotice') ?? '')));
check('G17 «dejar de esperar»: botón mientras Brain responde; la respuesta tardía y su error dejan de mostrarse y se avisa de que puede contar para el bloque',
  /music\.stopWaiting/.test(compo) && /pidio && !dejoDeEsperar \? chat\.messages/.test(compo) && /!chat\.busy && pidio && !dejoDeEsperar && chat\.error/.test(compo)
  && /dejoDeEsperar && <Nota fuerte>\{t\('music\.stopWaitingNote'\)\}/.test(compo) && IDIOMAS.every((l) => claves(l).get('stopWaiting') && claves(l).get('stopWaitingNote')));
check('G18 el reintento tras un corte reutiliza el mensaje SOLO si useBrainChat lo permitiera: no lo permite y no se tocó el hook compartido (punto de integración documentado)',
  !/messageId/.test(compo) && !(await import('node:child_process')).execSync(`git diff --name-only ${ANCLA_DE_INTEGRACION}`, { cwd: RAIZ }).toString().split('\n').some((f) => /^(hooks\/useBrainChat|services\/brainService|functions\/src\/(creator|credits))/.test(f)) && /MUSIC\.md/.test('MUSIC.md') && /messageId/.test(leer('docs/MUSIC.md')));

/* ── H · integración mínima ─────────────────────────────────────────────────────────────────────────────────────────────────── */
const spec = leer('screens/SpecialistScreen.tsx');
/* En esta base Weë Fashion aún se pinta con BusinessScreen; FashionScreen llegará con su rama. Vale cualquiera de las dos. */
check('H1 Specialist{id:"music"} entrega a MusicScreen y Fashion sigue entregando a su pantalla', /if \(id === 'music'\) return <MusicScreen \/>;/.test(spec) && (/if \(id === 'fashion' \|\| id === 'business'\) return <FashionScreen \/>;/.test(spec) || /if \(id === 'business'\) return <BusinessScreen \/>;/.test(spec)));
const tocados = (await import('node:child_process')).execSync(`git diff --name-only ${ANCLA_DE_INTEGRACION}`, { cwd: RAIZ }).toString().trim().split('\n');
/* El rediseño de creator toca muchas pantallas a propósito: lo que Music no puede tocar es el servidor ni el cerebro. */
const prohibidos = (f) => /^(functions\/src\/(?!music\/)|functions\/lib\/|hooks\/useBrainChat|services\/)/.test(f);
check('H2 ni el servidor fuera de functions/src/music, ni el cliente de Weë Brain, ni los servicios', !tocados.some(prohibidos), tocados.filter(prohibidos).join(','));

console.log(fallo ? `\n✘ ${fallo} fallos` : '\n✔ todo bien');
process.exit(fallo ? 1 : 0);
