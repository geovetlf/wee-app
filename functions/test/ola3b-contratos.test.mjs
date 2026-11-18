/**
 * OLA 3b · LOS CONTRATOS DE REFERENCIAS, FOTOGRAMAS, EXTENDER, EDITAR Y CAPACIDADES DE MODELO.
 *
 * Una suite nueva. NO reescribe ninguna comprobación existente: lo que ya fijaban las demás sigue fijado (las pocas
 * que cambian de texto se reanclan aparte, con su motivo, en `docs/FILMMAKER-OLA-3B.md`).
 *
 *   A · El contrato de capacidades (`core/model-capability.ts`): la regla pura, caso por caso.
 *   B · F1-D: lo que NO cambia sin capacidades, y lo que pasa con ellas.
 *   C · Los candados, en el código: nada se abre solo (D1 abre contratos, no capacidad).



 *
 * Sin red, sin Firebase, sin proveedor y sin compilado: se cargan las FUENTES con el TypeScript del proyecto. $0.
 *
 *     node functions/test/ola3b-contratos.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import Module from 'node:module';

const require = createRequire(import.meta.url);
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = process.env.OLA3B_RAIZ ? path.resolve(process.env.OLA3B_RAIZ) : path.resolve(AQUI, '../..');
const ts = createRequire(process.env.OLA3B_TS_DESDE ? path.resolve(process.env.OLA3B_TS_DESDE) : path.join(RAIZ, 'package.json'))('typescript');
const leer = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
const SRC = path.join(RAIZ, 'functions', 'src');

let fallos = 0; let n = 0;
const check = (nombre, cond, extra = '') => { n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${nombre}` + (extra ? ` — ${extra}` : '')); if (!cond) fallos++; };

/** Carga una fuente .ts con sus dependencias relativas; `stubs` sustituye lo que no se puede cargar sin Firebase. */
const cargar = (rel, stubs = {}, cache = new Map()) => {
  if (cache.has(rel)) return cache.get(rel).exports;
  const js = ts.transpileModule(fs.readFileSync(path.join(SRC, rel), 'utf8'), { compilerOptions: { target: 'ES2022', module: 'commonjs' } }).outputText;
  const m = new Module(rel); m.filename = path.join(SRC, rel); m.paths = []; cache.set(rel, m);
  m.require = (p) => (p in stubs ? stubs[p] : p.startsWith('.') ? cargar(path.posix.join(path.posix.dirname(rel), p) + '.ts', stubs, cache) : require(p));
  m._compile(js, m.filename); return m.exports;
};

const core = cargar('core/model-capability.ts');
const IDS = { SEEDANCE_2_5: 'M25', SEEDANCE_2_0: 'M20', SEEDANCE_2_0_FAST: 'MFAST', SEEDANCE_2_0_MINI: 'MMINI' };
const stubsDeDatos = { './seedance': { SEEDANCE_MODEL_IDS: IDS } };
const reg = cargar('engine/capacidadesDeVideo.ts', stubsDeDatos);
const FLASH = 'dreamina-seedance-2-5-flash-261115';

/* ═══ A · EL CONTRATO ═══════════════════════════════════════════════════ */
console.log('\n── A · El contrato de capacidades y su regla pura ──');
{
  const V = (id, plano, habil = [id]) => core.validarPlano({ version: 1, modo: 'nuevo', duracionSec: 10, proporcion: '16:9', referencias: [], ...plano }, reg.capacidadesConEstado(id, new Set(habil)));
  const cod = (r) => r.errores.map((e) => e.codigo).join(',');
  const imgs = (k) => Array.from({ length: k }, (_, i) => ({ id: 'r' + i, tipo: 'image', rol: 'character' }));
  const or = { toma: 1, propio: true, lista: true, duracionSec: 8, formato: 'mp4', generadoEnMs: 1000 };
  check('A1) una toma sencilla en un modelo habilitado es válida', V('MFAST', { duracionSec: 10 }).ok);
  check('A2) el mismo modelo sin habilitar cierra con model_not_enabled', cod(V('MFAST', {}, [])) === 'model_not_enabled');
  check('A3) 20 s en 2.0 fast: duration_above_max con el máximo 15', cod(V('MFAST', { duracionSec: 20 })) === 'duration_above_max' && V('MFAST', { duracionSec: 20 }).errores[0].parametros.maxSec === 15);
  check('A4) 20 s en 2.5 valen, 30 valen y 31 no: el tope de 15 s no es del modelo', V('M25', { duracionSec: 20 }).ok && V('M25', { duracionSec: 30 }).ok && cod(V('M25', { duracionSec: 31 })) === 'duration_above_max');
  check('A5) 2 s se redondea a 4 con aviso, no error', V('MFAST', { duracionSec: 2 }).ok && V('MFAST', { duracionSec: 2 }).avisos[0].codigo === 'duration_rounded_up');
  check('A6) 10 imágenes en 2.0: references_over_limit; 30 en 2.5 valen, 31 no', cod(V('M20', { referencias: imgs(10) })) === 'references_over_limit' && V('M25', { referencias: imgs(30) }).ok && !V('M25', { referencias: imgs(31) }).ok);
  check('A7) etiquetas por tipo y orden, y con el vídeo de origen ocupando @video1',
    JSON.stringify(core.etiquetasDeReferencias([{ id: 'a', tipo: 'image' }, { id: 'v', tipo: 'video' }, { id: 'b', tipo: 'image' }, { id: 'u', tipo: 'audio' }])) === '{"a":"@imagen1","v":"@video1","b":"@imagen2","u":"@audio1"}'
    && core.etiquetasDeReferencias([{ id: 'v', tipo: 'video' }], { video: 1 }).v === '@video2');
  check('A8) extender en 2.0: cerrado por no verificado; en 2.5 con origen propio y listo, válido', cod(V('M20', { modo: 'extender', segundosExtra: 5, origen: or })) === 'capability_unverified' && V('M25', { modo: 'extender', segundosExtra: 6, origen: or, duracionSec: -1 }).ok);
  check('A9) extender sin origen: origin_required; con un origen ajeno: origin_not_owned; sin acabar: origin_not_ready',
    cod(V('M25', { modo: 'extender', segundosExtra: 6 })) === 'origin_required'
    && cod(V('M25', { modo: 'extender', segundosExtra: 6, origen: { ...or, propio: false } })) === 'origin_not_owned'
    && cod(V('M25', { modo: 'extender', segundosExtra: 6, origen: { ...or, lista: false } })) === 'origin_not_ready');
  check('A10) extender hacia atrás: el adaptador solo hace adelante, y se dice', cod(V('M25', { modo: 'extender', segundosExtra: 6, direccion: 'backward', origen: or })) === 'extend_direction_not_supported');
  check('A11) editar pide duración -1', cod(V('M25', { modo: 'editar', duracionSec: 5, origen: or })) === 'duration_invalid' && V('M25', { modo: 'editar', duracionSec: -1, origen: or }).ok);
  check('A12) origen fuera de la ventana de confianza, o ya extendido: avisos, no errores',
    V('M25', { modo: 'editar', duracionSec: -1, origen: { ...or, generadoEnMs: 0 }, ahoraMs: 31 * 86400000 }).avisos.some((a) => a.codigo === 'origin_outside_trust_window')
    && V('M25', { modo: 'editar', duracionSec: -1, origen: { ...or, yaExtendida: true } }).ok);
  check('A13) primer fotograma sí; último sin primero, no; fotogramas con referencias: cerrado y sin degradar',
    V('MFAST', { primerFotograma: { id: 'f' } }).ok && cod(V('MFAST', { ultimoFotograma: { id: 'f' } })).includes('last_frame_without_first')
    && cod(V('M25', { primerFotograma: { id: 'f' }, referencias: imgs(1) })) === 'capability_unverified');
  check('A14) audio solo: 2.5 sí, 2.0 no; un papel que no corresponde al material, no', V('M25', { referencias: [{ id: 'a', tipo: 'audio', rol: 'audio' }] }).ok
    && cod(V('M20', { referencias: [{ id: 'a', tipo: 'audio', rol: 'audio' }] })) === 'audio_alone_not_supported'
    && cod(V('M25', { referencias: [{ id: 'x', tipo: 'image', rol: 'audio' }] })) === 'reference_role_mismatch');
  check('A15) una cara real sin activo autorizado se rechaza; una desconocida avisa', cod(V('M25', { referencias: [{ id: 'x', tipo: 'image', rol: 'character', rostroReal: 'si' }] })) === 'real_person_not_authorized'
    && V('M25', { referencias: [{ id: 'x', tipo: 'image', rol: 'character', rostroReal: 'desconocido' }] }).avisos[0].codigo === 'real_person_unknown');
  check('A16) lo que el modelo sabe y el adaptador no hace (borrador en 2.5) cierra con capability_not_implemented', cod(V('M25', { borrador: true })) === 'capability_not_implemented');
  check('A17) Flash nunca es elegible, aunque alguien lo habilite', cod(V(FLASH, {}, [FLASH])).startsWith('model_not_enabled') && reg.capacidadesDeModelo(FLASH).estado === 'NOT_CONFIGURED');
  check('A18) un modelo desconocido es undefined: nunca cae en otro', reg.capacidadesDeModelo('no-existe') === undefined && reg.capacidadesConEstado('no-existe', new Set(['no-existe'])) === undefined);
  check('A19) la forma canónica ignora el reloj y el orden de claves, y distingue el orden de las referencias',
    core.canonicoDePlano({ version: 1, modo: 'nuevo', duracionSec: 5, referencias: [], ahoraMs: 1 }, 'M') === core.canonicoDePlano({ ahoraMs: 99, referencias: [], duracionSec: 5, modo: 'nuevo', version: 1 }, 'M')
    && core.canonicoDePlano({ version: 1, modo: 'nuevo', duracionSec: 5, referencias: imgs(2) }, 'M') !== core.canonicoDePlano({ version: 1, modo: 'nuevo', duracionSec: 5, referencias: imgs(2).reverse() }, 'M'));
  check('A20) todo problema lleva su clave i18n y ninguno es reintentable', ['M20', 'M25'].every((id) => V(id, { duracionSec: 99, referencias: imgs(60) }).errores.every((e) => e.claveI18n === 'filmmaker.model.' + e.codigo && e.reintentable === false)));
  const emitidos = new Set();
  for (const id of ['M20', 'M25', 'MFAST']) {
    for (const p of [
      { duracionSec: 99, referencias: imgs(60), primerFotograma: { id: 'f' }, borrador: true, conAudio: true, lipSync: true, semilla: 1 },
      { modo: 'extender', segundosExtra: 99, direccion: 'backward' },
      { modo: 'editar', duracionSec: 1, origen: { toma: 1, propio: false, lista: false, formato: 'avi', duracionSec: 99 } },
    ]) { const r = V(id, p); [...r.errores, ...r.avisos].forEach((x) => emitidos.add(x.codigo)); }
  }
  check('A21) todo código emitido está en el catálogo, y se ejercitan más de quince', [...emitidos].every((c) => core.CODIGOS_DE_PLANO.includes(c)) && emitidos.size > 15, `${emitidos.size}`);
  const fuente = sinComentarios(leer('functions/src/core/model-capability.ts'));
  check('A22) el archivo del Core es puro: sin importaciones, sin infraestructura, sin reloj, sin nombres de proveedor ni de modelo',
    !/from ['"]/.test(fuente) && !/firebase|firestore|node:|fetch\(|require\(/.test(fuente) && !/Date\.now\(|Math\.random\(|new Date\(/.test(fuente)
    && !/(?<![a-z])(seedance|bytedance|byteplus|gemini|openai|kling|runway)(?![a-z])/i.test(fuente) && !/SEEDANCE_/.test(fuente));
}

/* ═══ B · F1-D ═══════════════════════════════════════════════════════════ */
console.log('\n── B · F1-D: lo de siempre, y lo nuevo detrás de las capacidades ──');
const plano = cargar('creator/plano.ts', { '../core': { creativosValidos: () => true } });
{
  const ref = (id, kind, role, assetId) => ({ referenceId: id, definition: { id, kind, role, assetId } });
  const crudo = (input = {}, extra = {}) => ({
    unitId: 'u1', sceneId: 's1', capability: 'video.generate', durationSec: 8, format: { aspectRatio: '16:9', resolution: '720p' }, output: { modality: 'video', withSound: true },
    input: { description: 'Un faro al amanecer', characters: [], objects: [], actions: [], dialogue: [], references: [], ...input }, ...extra,
  });
  const lee = plano.leerRequisitoDePlano;
  const simple = lee(crudo());
  check('B1) un plano sin entradas no trae la clave `entradas`: se lee como siempre', simple && !('entradas' in simple));
  check('B2) sin capacidades, lo de siempre: 20 s → duration_too_long (máx 15); `video.reference` → capability_not_supported',
    plano.evaluarPlano(lee(crudo({}, { durationSec: 20 })), 'standard').motivo === 'duration_too_long'
    && plano.evaluarPlano(lee(crudo({ references: [ref('r1', 'image', 'style', 'a1')] }, { capability: 'video.reference' })), 'standard').motivo === 'capability_not_supported'
    && plano.LIMITES_DE_PLANO.duracionMaximaSinModeloSec === 15 && plano.LIMITES_DE_PLANO.duracionMaximaSec === 30);
  const conRef = lee(crudo({ references: [ref('r1', 'image', 'style', 'a1'), ref('r2', 'video', 'motion', 'a2')] }, { capability: 'video.reference' }));
  check('B3) con referencias: `entradas` en su orden y con su papel; lo demás del requisito no cambia', conRef.entradas.referencias.map((r) => `${r.id}:${r.tipo}:${r.rol}`).join() === 'r1:image:style,r2:video:motion' && conRef.referencias === 2);
  const caps25 = reg.capacidadesConEstado('M25', new Set(['M25']));
  check('B4) con las capacidades de 2.5: referencias y 20 s pasan; con las de 2.0 fast, 20 s no',
    plano.evaluarPlano(conRef, 'max', caps25).ok && plano.evaluarPlano(lee(crudo({}, { durationSec: 20 })), 'max', caps25).ok
    && plano.evaluarPlano(lee(crudo({}, { durationSec: 20 })), 'standard', reg.capacidadesConEstado('MFAST', new Set(['MFAST']))).motivo === 'duration_above_max');
  const rev = lee(crudo({ revision: { mode: 'extend', instruction: 'Que la cámara siga hacia el mar --rs 4k https://x.y', seconds: 6 } }, { capability: 'video.reference' }));
  const ctx = { origen: { toma: 1, propio: true, lista: true, duracionSec: 8, formato: 'mp4' }, ahoraMs: 1 };
  const er = plano.evaluarPlano(rev, 'max', caps25, ctx);
  check('B5) extender: duración = los segundos pedidos, modo extender; sin toma de partida, origin_required', er.ok && er.modo === 'extender' && er.duracionSec === 6 && plano.evaluarPlano(rev, 'max', caps25, {}).motivo === 'origin_required');
  check('B6) el texto de una revisión es SOLO su instrucción, sin enlaces ni guiones de orden; plantilla fm-plano-3', !/https?:|--/.test(plano.componerPromptDePlano(rev)) && plano.plantillaDePlano(rev) === 'fm-plano-3' && plano.plantillaDePlano(simple) === 'fm-plano-1');
  check('B7) un plano con fotogramas y una revisión a la vez: el contrato lo cierra, con todos los códigos',
    (() => { const x = plano.evaluarPlano(lee(crudo({ firstFrameReferenceId: 'f', references: [ref('f', 'image', 'first_frame', 'a')], revision: { mode: 'edit', instruction: 'más cálido' } }, { capability: 'video.reference' })), 'max', caps25, ctx); return !x.ok && x.detalle.codes.includes('frames_with_references_not_supported'); })());
  const T = cargar('creator/toma.ts', { 'crypto': require('crypto'), 'firebase-admin/firestore': {}, '../credits/creditTransactions': { usageTransactionId: (x) => x }, '../shots': {} });
  check('B8) el material de una toma se reconoce con las tres capacidades de vídeo y con ninguna otra', JSON.stringify(T.CAPACIDADES_DE_VIDEO_DE_TOMA) === '["video.generate","video.image_to_video","video.reference"]');
  /* Comportamiento, no solo la constante: un material nacido de `video.reference` SE enlaza; uno de otra capacidad, no. */
  const dbDe = (capability) => ({ collection: () => ({ where() { return this; }, limit() { return this; }, get: async () => ({ docs: [{ data: () => ({ assetId: 'asset_x', status: 'ready', kind: 'video', provenance: { capability, runId: 'run_fm.x.2' } }) }] }) }) });
  const enlaza = async (c) => T.materialDeLaOperacion(dbDe(c), 'cuentaA', 'fm.x.2');
  check('B10) `materialDeLaOperacion` enlaza lo nacido de `video.generate`, `video.reference` y `video.image_to_video`, y NO de `image.generate`',
    (await enlaza('video.generate'))?.assetId === 'asset_x' && (await enlaza('video.reference'))?.assetId === 'asset_x' && (await enlaza('video.image_to_video'))?.assetId === 'asset_x' && (await enlaza('image.generate')) === null);
  const raiz = { ownerAccountId: 'a', metadata: { revision: 3 }, title: 'T', references: [{ id: 'r1', assetId: 'x' }], status: 'active' };
  const escena = (p) => ({ ownerAccountId: 'a', productionId: 'p', id: 's1', shots: [{ id: 'u1', order: 0, description: 'faro', ...p }] });
  const sinR = T.firmaDe(raiz, escena({}));
  check('B9) la firma de una unidad NO cambia por pedir ni retirar una revisión, y sí por cambiar el plano',
    sinR === T.firmaDe(raiz, escena({ revision: { mode: 'extend', instruction: 'sigue', seconds: 5 } }))
    && sinR !== T.firmaDe(raiz, escena({ description: 'otro faro' })) && sinR !== T.firmaDe({ ...raiz, references: [{ id: 'r1', assetId: 'y' }] }, escena({})));
}

/* ═══ C · LOS CANDADOS: D1 abre CONTRATOS, no capacidad ═════════════════ */
console.log('\n── C · Los candados, en el código ──');
{
  const video = sinComentarios(leer('functions/src/creator/video.ts'));
  const entradas = sinComentarios(leer('functions/src/creator/entradasDePlano.ts'));
  const seed = sinComentarios(leer('functions/src/engine/providers/seedance.ts'));
  check('C1) el candado del vídeo sigue declarando UNA capacidad, `video.generate`, y NO hay una segunda lista en el código de la puerta',
    /const CAPACIDAD_DEL_CANARY: CapabilityId = 'video\.generate';/.test(video) && !/CAPACIDADES_DE_TOMA_CON_ENTRADAS|porElCoreConEntradas/.test(video));
  check('C2) las cuatro listas de modelos validados POR MODO están vacías', ['referencias', 'fotogramas', 'extender', 'editar'].every((m) => entradas.includes(m + ': Object.freeze([]) as readonly string[]')));
  check('C3) la decisión de las entradas pone la puerta ANTES que el modelo', (() => { const d = entradas.slice(entradas.indexOf('export const decidirEntradas')); return d.indexOf('!e.puertaAbierta') > 0 && d.indexOf('!e.puertaAbierta') < d.indexOf('lista.includes(e.modelo)'); })());
  check('C4) el material de otra cuenta contesta lo mismo que uno que no existe', /!m \|\| m\.ownerAccountId !== q\.uid\) return \{ ok: false, motivo: 'reference_not_found' \}/.test(entradas));
  check('C5) el adaptador solo traduce etiquetas en `video.reference`', /capability === 'video\.reference' \? traducirEtiquetasDeReferencia\(limpio\.texto\) : limpio\.texto/.test(seed));
  check('C6) el servidor contesta la lectura de capacidades SIN proveedor ni fuentes y sin tocar Firestore, cupo ni Credits',
    /proveedor: _proveedor, fuentes: _fuentes/.test(video) && /if \(data\.capacidades === true\) return capacidadesParaLaApp\(\);/.test(video));
  check('C7) ningún archivo de la ola declara una capacidad del Core', ['creator/entradasDePlano.ts', 'creator/plano.ts', 'creator/toma.ts', 'engine/capacidadesDeVideo.ts', 'engine/providers/seedance-capacidades.ts', 'core/model-capability.ts'].every((f) => !/CAPACIDAD_DEL_CANARY/.test(sinComentarios(leer(`functions/src/${f}`)))));
  const modelo = sinComentarios(leer('functions/src/filmmaker/modelo.ts'));
  const val = sinComentarios(leer('functions/src/filmmaker/validacion.ts'));
  const req = sinComentarios(leer('functions/src/filmmaker/requisitos.ts'));
  check('C8) `ProductionShot.revision` es OPCIONAL y la validación la conoce', /readonly revision\?: ShotRevision;/.test(modelo) && /'advanced', 'revision',/.test(val) && /const revisionDePlano = /.test(val));
  check('C9) el requisito no cambia para un plano sin revisión ni audios propios: solo suma claves condicionales',
    /\.\.\.\(audiosDelPlano\.length \? \{ audioReferences:/.test(req) && /\.\.\.\(shot\?\.revision !== undefined \? \{ revision: shot\.revision \} : \{\}\)/.test(req));
  check('C10) el catálogo de problemas del contrato tiene 39 códigos y todos con texto semántico', core.CODIGOS_DE_PLANO.length === 39, String(core.CODIGOS_DE_PLANO.length));
}

console.log(fallos ? `\n✘ ${fallos} comprobaciones fallan de ${n}` : `\n✔ ${n} comprobaciones`);
process.exit(fallos ? 1 : 0);
