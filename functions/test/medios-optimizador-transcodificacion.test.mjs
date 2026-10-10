/**
 * MC-4 · OPTIMIZADOR DE MEDIOS — CONTRATO DE TRANSCODIFICACIÓN DE VÍDEO Y AUDIO.
 *
 * Vídeo y audio siguen BLOQUEADOS por dependencia: esta suite prueba la costura, no una
 * herramienta. Lo que se prueba:
 *
 *   A · Los nombres de capacidad son los que el Core ya declara.
 *   B · Sin dependencia, el adaptador que existe hoy no declara nada y falla cerrado.
 *   C · Una petición inválida se rechaza antes de que el adaptador vea los bytes.
 *   D · Una capacidad no declarada no se pide.
 *   E · El camino feliz, con un adaptador falso, devuelve lo que promete el contrato.
 *   F · Un resultado mal formado se rechaza: nada de bytes que no cuadran.
 *   G · Un fallo sale como error tipado, sin resultado parcial.
 *   H · Pureza: ninguna herramienta de vídeo ni de audio en el código ni en las dependencias.
 *
 * Todo el contenido de aquí es sintético (bytes de relleno). No se ejecuta ninguna herramienta.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(import.meta.url);
const lib = (p) => require(path.resolve(RAIZ, 'functions/lib', p));
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const tr = lib('media/optimizador/transcodificacion.js');
const core = lib('core/media/proceso.js');

let n = 0;
let failures = 0;
const check = (name, cond, extra = '') => {
  n++;
  console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const VIDEO = (extra = {}) => ({
  tipo: 'video', objetivo: 'preview', cuerpo: Buffer.alloc(1234, 7), contentType: 'video/mp4', duracionSegundos: 12, salida: 'video/webm', ...extra,
});
const motivo = (d) => (d.ok ? null : d.error?.details?.reason ?? null);

/* ═══ A · NOMBRES DE CAPACIDAD DEL REGISTRO ═════════════════════════════════ */
console.log('\n── A · Capacidades del registro ──');
check('A · video preview se llama video.preview', tr.capacidadDeTranscodificacion('video', 'preview') === 'video.preview');
check('A · video variant se llama video.variant', tr.capacidadDeTranscodificacion('video', 'variant') === 'video.variant');
check('A · audio preview se llama audio.preview', tr.capacidadDeTranscodificacion('audio', 'preview') === 'audio.preview');
check('A · audio variant se llama audio.variant', tr.capacidadDeTranscodificacion('audio', 'variant') === 'audio.variant');
const fuenteCore = leer('functions/src/core/media/proceso.ts');
check('A · esos nombres están declarados en el Core (no se inventan aquí)',
  ['video.preview', 'video.variant', 'audio.preview', 'audio.variant'].every((c) => fuenteCore.includes(`'${c}'`)));

/* ═══ B · SIN DEPENDENCIA ═══════════════════════════════════════════════════ */
console.log('\n── B · Sin dependencia: el adaptador de hoy ──');
const hoy = tr.crearTranscodificacionNoDisponible();
check('B · el adaptador de hoy no declara ninguna capacidad', hoy.capacidades.length === 0);
const directo = await hoy.transcodificar();
check('B · llamado directamente, responde «no disponible» (sin tocar nada)', motivo(directo) === 'no_disponible');
check('B · por el contrato, un vídeo se rechaza por falta de capacidad', motivo(await tr.transcodificarConContrato(hoy, VIDEO())) === 'sin_capacidad');

/* ═══ C · PETICIONES INVÁLIDAS ══════════════════════════════════════════════ */
console.log('\n── C · Peticiones inválidas: el adaptador no las ve ──');
const { puerto: falso, peticiones } = tr.crearAdaptadorFalsoDeTranscodificacion({ capacidades: ['video.preview', 'audio.preview', 'video.variant', 'audio.variant'] });
const invalidas = [
  ['un tipo que no es vídeo ni audio', VIDEO({ tipo: 'imagen' })],
  ['un objetivo que no está en el contrato (póster)', VIDEO({ objetivo: 'poster' })],
  ['un cuerpo vacío', VIDEO({ cuerpo: Buffer.alloc(0) })],
  ['un origen que no es vídeo (imagen)', VIDEO({ contentType: 'image/png' })],
  ['una salida que no está admitida (x-flv)', VIDEO({ salida: 'video/x-flv' })],
  ['una salida de vídeo en MP4, que no está en la lista', VIDEO({ salida: 'video/mp4' })],
  ['una duración cero', VIDEO({ duracionSegundos: 0 })],
  ['una duración por encima del tope', VIDEO({ duracionSegundos: 3601 })],
  ['una duración fraccionaria', VIDEO({ duracionSegundos: 1.5 })],
  ['un origen por encima del tope de bytes', VIDEO({ cuerpo: Buffer.alloc(64 * 1024 * 1024 + 1) })],
  ['ni siquiera un objeto', null],
];
let rechazadasSinLlegar = true;
for (const [nombre, p] of invalidas) {
  const d = await tr.transcodificarConContrato(falso, p);
  if (motivo(d) !== 'peticion_invalida') rechazadasSinLlegar = false;
  check(`C · ${nombre}: se rechaza como petición inválida`, motivo(d) === 'peticion_invalida', `motivo=${motivo(d)}`);
}
check('C · ninguna de ellas llegó al adaptador', peticiones.length === 0 && rechazadasSinLlegar, `llegadas=${peticiones.length}`);

/* ═══ D · CAPACIDAD NO DECLARADA ════════════════════════════════════════════ */
console.log('\n── D · Capacidad no declarada ──');
const soloVideo = tr.crearAdaptadorFalsoDeTranscodificacion({ capacidades: ['video.preview'] });
const audio = await tr.transcodificarConContrato(soloVideo.puerto, { tipo: 'audio', objetivo: 'preview', cuerpo: Buffer.alloc(100, 1), contentType: 'audio/mpeg', duracionSegundos: 3, salida: 'audio/webm' });
check('D · un audio pedido a un adaptador que solo declara vídeo se rechaza', motivo(audio) === 'sin_capacidad');
check('D · y no llegó al adaptador', soloVideo.peticiones.length === 0);

/* ═══ E · CAMINO FELIZ ══════════════════════════════════════════════════════ */
console.log('\n── E · Camino feliz con el adaptador falso ──');
const feliz = tr.crearAdaptadorFalsoDeTranscodificacion({ capacidades: ['video.preview'] });
const entrada = VIDEO();
const ok = await tr.transcodificarConContrato(feliz.puerto, entrada);
check('E · el adaptador devuelve un resultado', ok.ok === true);
check('E · el resultado cumple el contrato: bytes igual al cuerpo, MIME de salida y duración',
  ok.ok && ok.resultado.bytes === 1234 && ok.resultado.cuerpo.length === 1234 && ok.resultado.contentType === 'video/webm' && ok.resultado.duracionSegundos === 12);
check('E · el adaptador recibió exactamente una petición, con el origen intacto',
  feliz.peticiones.length === 1 && feliz.peticiones[0].cuerpo.equals(Buffer.alloc(1234, 7)));

/* ═══ F · RESULTADO MAL FORMADO ═════════════════════════════════════════════ */
console.log('\n── F · Resultado que no cuadra ──');
const malformados = [
  ['bytes que no coinciden con el cuerpo', { cuerpo: Buffer.from('ab'), contentType: 'video/webm', bytes: 99, duracionSegundos: 5 }],
  ['un MIME distinto del pedido', { cuerpo: Buffer.from('ab'), contentType: 'video/mp4', bytes: 2, duracionSegundos: 5 }],
  ['un cuerpo vacío', { cuerpo: Buffer.alloc(0), contentType: 'video/webm', bytes: 0, duracionSegundos: 5 }],
  ['una duración que no es positiva', { cuerpo: Buffer.from('ab'), contentType: 'video/webm', bytes: 2, duracionSegundos: 0 }],
];
for (const [nombre, resultado] of malformados) {
  const bad = { identificador: 'adaptador-defectuoso', capacidades: ['video.preview'], transcodificar: async () => ({ ok: true, resultado }) };
  const d = await tr.transcodificarConContrato(bad, VIDEO());
  check(`F · ${nombre}: se rechaza como proceso fallido`, motivo(d) === 'proceso_fallido' && !('resultado' in d));
}

/* ═══ G · FALLO TIPADO, SIN RESULTADO PARCIAL ═══════════════════════════════ */
console.log('\n── G · Fallo tipado ──');
const roto = tr.crearAdaptadorFalsoDeTranscodificacion({ capacidades: ['video.preview'], fallo: 'origen_ilegible' });
const dRoto = await tr.transcodificarConContrato(roto.puerto, VIDEO());
check('G · un fallo del adaptador sale como error tipado, sin resultado', dRoto.ok === false && motivo(dRoto) === 'origen_ilegible' && !('resultado' in dRoto));
check('G · el identificador del adaptador viaja en el error', dRoto.ok === false && JSON.stringify(dRoto.error).includes('transcodificacion-falsa'));

/* ═══ H · PUREZA: NINGUNA HERRAMIENTA DE VÍDEO NI DE AUDIO ══════════════════ */
console.log('\n── H · Sin herramientas de vídeo ni de audio ──');
const codigo = sinComentarios(leer('functions/src/media/optimizador/transcodificacion.ts'));
const importes = [...codigo.matchAll(/^\s*import[^'"]*['"]([^'"]+)['"]/gm)].map((m) => m[1]);
check('H · el contrato solo importa del Core (sin herramientas externas)',
  importes.length > 0 && importes.every((i) => i.startsWith('../../core/')), JSON.stringify(importes));
check('H · no hay ejecución de comandos, ni procesos, ni red, ni disco, ni nombres de herramientas en el código',
  !/child_process|spawn|exec\(|execSync|fetch\(|https?:|fs\.|ffmpeg|fluent|gstreamer|transcoder/i.test(codigo));
const paquete = JSON.parse(leer('functions/package.json'));
const dependencias = Object.keys({ ...(paquete.dependencies ?? {}), ...(paquete.devDependencies ?? {}) });
check('H · ninguna dependencia de vídeo o audio está en functions/package.json',
  !dependencias.some((d) => /ffmpeg|fluent|transcod|prism|lame|opus|gstreamer/i.test(d)), dependencias.filter((d) => /ffmpeg|media|video|audio/i.test(d)).join(', ') || 'ninguna');
check('H · el tope de origen del contrato es el de la imagen (64 MiB)', tr.LIMITES_DE_TRANSCODIFICACION.maxBytesDeOrigen === core.LIMITES_DE_TRANSFORMACION.maxBytesDeOrigen);

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
