/**
 * F1-A · WEË FILMMAKER — EL DOMINIO PURO DE UNA PRODUCCIÓN.
 *
 * Lo que se demuestra aquí: una producción audiovisual entera se puede escribir,
 * comprobar, cambiar y traducir a lo que hace falta para hacerla SIN saber dónde
 * se guarda, con qué se genera, cuánto cuesta ni cómo se ejecuta.
 *
 *   A · El modelo, los formatos y los presets
 *   B · La validación: códigos, no frases
 *   C · Las operaciones: el lenguaje cerrado de los cambios
 *   D · Lo pendiente de rehacer
 *   E · Las recomendaciones: nunca se aplican solas
 *   F · Los requisitos: el QUÉ, nunca el CON QUÉ
 *   G · Las fronteras: lo que Filmmaker no toca
 *   H · Determinismo
 *
 * Sin red, sin Firestore, sin proveedores, sin Credits, sin reloj.
 *
 * Usa el compilado: `npm run build` antes de `npm test`.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const require = createRequire(import.meta.url);
const lib = (p) => require(path.resolve(RAIZ, 'functions/lib', p));
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const M = lib('filmmaker/modelo.js');
const V = lib('filmmaker/validacion.js');
const O = lib('filmmaker/operaciones.js');
const Rc = lib('filmmaker/recomendaciones.js');
const Rq = lib('filmmaker/requisitos.js');
const shotCore = lib('core/shot.js');
const continuidadCore = lib('core/continuity.js');
const creativoCore = lib('core/creative.js');
const contratos = lib('core/contracts.js');
const catalogo = lib('core/registry/capabilities.js');

/* ── Utilidades de la suite ───────────────────────────────────────────────── */

const clon = (x) => JSON.parse(JSON.stringify(x));
const congelar = (x) => { if (x && typeof x === 'object') { Object.values(x).forEach(congelar); Object.freeze(x); } return x; };
const iguales = (a, b) => M.canonico(a) === M.canonico(b);
const validar = (p, stage = 'draft') => V.validarProduccion(p, { stage });
const codigos = (r) => r.problems.map((x) => x.code);
const hay = (r, code, ruta, sev) => r.problems.some((x) => x.code === code && (ruta === undefined || x.path === ruta) && (sev === undefined || x.severity === sev));
const soloAvisos = (r) => r.problems.every((x) => x.severity !== 'error');
const op = (p, o) => O.aplicarOperacion(p, o);
/** Si algo lanza, la comprobación falla con su motivo en vez de tumbar la suite. */
const seguro = (fn) => { try { return fn(); } catch (e) { return { ok: false, lanzo: String(e && e.message), problems: [{ code: 'threw', parameters: {} }] }; } };
/** Una sección que lanza no tumba la suite: su excepción es una comprobación fallida, con el motivo. */
const seccion = (letra, fn) => {
  try { fn(); } catch (e) { check(`${letra}) la sección termina sin lanzar`, false, String(e && e.stack ? e.stack : e).split('\n').slice(0, 2).join(' · ')); }
};
/** Todas las claves de un objeto, a cualquier profundidad. */
const clavesDe = (v, salida = []) => {
  if (Array.isArray(v)) v.forEach((x) => clavesDe(x, salida));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { salida.push(k); clavesDe(x, salida); }
  return salida;
};

/**
 * UNA PRODUCCIÓN DE REFERENCIA: un anuncio vertical de 15 s con dos escenas.
 * Tres planos y un personaje con su lugar, sus referencias y su voz.
 */
const base = () => clon({
  ...M.produccionVacia({ title: 'Anuncio de zapatilla', aspectRatio: '9:16', resolution: '1080p' }),
  ...M.configuracionDePreset('tiktok'),
  intent: { objective: 'Vender la zapatilla nueva', productionType: 'ad', requestedDurationSec: 15, freeText: 'Un anuncio vertical de 15 segundos' },
  creativeDirection: { visualStyle: 'cinematográfico', pacing: 'fast', cinematography: { version: 1, lighting: { type: 'night' } } },
  characters: [
    { id: 'char-luna', name: 'Luna', appearance: { wardrobe: { description: 'chaqueta amarilla' } }, referenceIds: ['ref-luna'], voice: { description: 'cálida', referenceId: 'ref-voz' } },
    { id: 'char-sol', name: 'Sol' },
  ],
  locations: [{ id: 'loc-city', name: 'Ciudad', setting: 'exterior' }],
  objects: [{ id: 'obj-shoe', name: 'Zapatilla', kind: 'product' }],
  references: [
    { id: 'ref-luna', kind: 'image', role: 'character', assetId: 'asset-luna' },
    { id: 'ref-voz', kind: 'audio', role: 'audio', assetId: 'asset-voz' },
    { id: 'ref-frame', kind: 'image', role: 'first_frame', assetId: 'asset-frame' },
  ],
  metadata: { revision: 0, locale: 'es' },
  scenes: [
    {
      id: 'sc-0001', order: 0, title: 'Salida', locationId: 'loc-city', timeOfDay: 'night', characterIds: ['char-luna'],
      shots: [
        { id: 'sh-0101', order: 0, durationSec: 5, description: 'Luna se ata la zapatilla', objectIds: ['obj-shoe'] },
        { id: 'sh-0102', order: 1, durationSec: 5, description: 'Luna sale corriendo', dependsOn: ['sh-0101'] },
      ],
    },
    {
      id: 'sc-0002', order: 1, title: 'Llegada', locationId: 'loc-city', timeOfDay: 'night', characterIds: ['char-luna'],
      shots: [{ id: 'sh-0201', order: 0, durationSec: 5, description: 'Luna cruza la meta' }],
    },
  ],
});

/* ═══ A · EL MODELO, LOS FORMATOS Y LOS PRESETS ════════════════════════════ */
console.log('\n── A · El modelo, los formatos y los presets ──');
seccion('A', () => {
  const vacia = M.produccionVacia({ title: 'Nada', aspectRatio: '16:9' });
  check('A1) la versión del modelo es 1 y una producción vacía la lleva, con revisión 0 y todo vacío',
    M.FILMMAKER_MODEL_VERSION === 1 && vacia.version === 1 && vacia.metadata.revision === 0
    && vacia.scenes.length === 0 && vacia.characters.length === 0 && vacia.audio.cues.length === 0 && vacia.exportPlan.targets.length === 0);
  check('A2) producir una vacía es determinista: dos llamadas dan lo mismo', iguales(vacia, M.produccionVacia({ title: 'Nada', aspectRatio: '16:9' })));
  const formatos = ['16:9', '9:16', '1:1', '4:5'].map((a) => validar(M.produccionVacia({ title: 'F', aspectRatio: a })));
  check('A3) los cuatro formatos pedidos son válidos: 16:9, 9:16, 1:1 y 4:5', formatos.every((r) => r.valid));
  check('A4) y los que admite el Core además —4:3 y 21:9— también, sin inventar otros', validar(M.produccionVacia({ title: 'F', aspectRatio: '21:9' })).valid);
  const raro = validar({ ...base(), format: { aspectRatio: '5:4' } });
  check('A5) un formato que no existe es `format_invalid`', hay(raro, 'format_invalid', 'format.aspectRatio'));
  check('A6) los presets son exactamente seis: TikTok, Reels, Shorts, YouTube, Ads y Stories',
    iguales(Object.keys(M.PRESETS_DE_FORMATO).sort(), ['ads', 'instagram_reels', 'stories', 'tiktok', 'youtube', 'youtube_shorts']));
  const tiktok = M.configuracionDePreset('tiktok');
  check('A7) un preset produce CONFIGURACIÓN: formato y duración, nada más',
    iguales(Object.keys(tiktok).sort(), ['duration', 'format'])
    && iguales(tiktok, { format: { aspectRatio: '9:16', resolution: '1080p', preset: 'tiktok' }, duration: { targetSec: 15 } }));
  check('A8) YouTube es horizontal y los anuncios, 4:5',
    M.configuracionDePreset('youtube').format.aspectRatio === '16:9' && M.configuracionDePreset('ads').format.aspectRatio === '4:5');
  check('A9) una producción hecha desde cada preset es válida',
    M.PRESETS.every((id) => validar({ ...M.produccionVacia({ title: 'P', aspectRatio: '1:1' }), ...M.configuracionDePreset(id) }).valid));
  const p = base();
  check('A10) «la escena 2» de una persona es la de `order` 1, y «el plano 2 de la escena 1» también se encuentra',
    M.escenaPorNumero(p, 2)?.id === 'sc-0002' && M.planoPorNumero(p, 1, 2)?.id === 'sh-0102');
  check('A11) los números humanos empiezan en 1: 0, negativos y decimales no son nada',
    M.escenaPorNumero(p, 0) === undefined && M.escenaPorNumero(p, -1) === undefined && M.escenaPorNumero(p, 1.5) === undefined && M.planoPorNumero(p, 1, 3) === undefined);
  const conImplicita = { ...p, scenes: [...p.scenes, { id: 'sc-0003', order: 2, durationSec: 4, shots: [] }] };
  check('A12) las unidades que se generan son los planos, y la escena sin planos entra entera, en orden',
    iguales(M.unidades(conImplicita).map((u) => u.unitId), ['sh-0101', 'sh-0102', 'sh-0201', 'sc-0003']));
  const ocupados = new Set(['sc-0001', 'sc-0001-2']);
  check('A13) un id nuevo se DERIVA —el primero libre—, sin azar', M.derivarId('sc-0001', ocupados) === 'sc-0001-3');
  const largo = 'x'.repeat(128);
  check('A14) y no pasa nunca de 128 caracteres ni sale de la forma de los ids del Core',
    M.derivarId(largo, new Set()).length === 128 && M.esId(M.derivarId(largo, new Set())));
  check('A15) la forma de un id es la de los planos del Core', M.FORMA_DE_ID === shotCore.FORMA_DE_ID_DE_PLANO);
  check('A16) se suma en milisegundos enteros: 5,1 s + 0,2 s son 5,3 s exactos', M.aSec(M.aMs(5.1) + M.aMs(0.2)) === 5.3);
  check('A16b) y los segundos que en coma flotante no dan exacto se redondean al milisegundo: 4,35 s son 4350 ms y 1,005 s, 1005',
    M.aMs(4.35) === 4350 && M.aMs(1.005) === 1005);
  check('A17) la duración total es la suma de las escenas, y sin una duración no se sabe',
    M.duracionTotalMs(p) === 15000 && M.duracionTotalMs({ ...p, scenes: [{ ...p.scenes[0], shots: [{ id: 'sh-9999', order: 0 }] }] }) === undefined);

  const conCamara = clon(p);
  conCamara.scenes[0].visual = { creative: { version: 1, movement: { type: 'dolly_in', speed: 'slow' }, lighting: { type: 'golden_hour' } } };
  conCamara.scenes[0].shots[0].visual = { creative: { version: 1, movement: { type: 'static' } } };
  const efectivo = M.creativoEfectivo(conCamara, conCamara.scenes[0], conCamara.scenes[0].shots[0]);
  check('A18) la intención creativa efectiva: manda lo más cercano (el plano), rellena la escena y después la producción',
    efectivo.movement?.type === 'static' && efectivo.lighting?.type === 'golden_hour');
  check('A19) el encuadre es SIEMPRE el formato de la producción', efectivo.framing?.aspectRatio === '9:16');
  check('A20) una cámara quieta no hereda la velocidad de fuera: la regla de coherencia del Core',
    efectivo.movement?.speed === undefined && creativoCore.creativosValidos(efectivo));
  const efectivoDelOtro = M.creativoEfectivo(conCamara, conCamara.scenes[0], conCamara.scenes[0].shots[1]);
  check('A21) y el plano que no dice nada hereda la cámara y la velocidad de su escena',
    efectivoDelOtro.movement?.type === 'dolly_in' && efectivoDelOtro.movement?.speed === 'slow');

  const conReglas = clon(p);
  conReglas.continuity = { preserve: ['identity.face', 'outfit.clothing'], strength: 'strict', anchors: ['char-luna'] };
  conReglas.scenes[1].continuity = { preserve: ['environment.location'], mayChange: ['outfit.clothing'], strength: 'relaxed' };
  const regla = M.continuidadEfectiva(conReglas, conReglas.scenes[1], conReglas.scenes[1].shots[0]);
  check('A22) la continuidad efectiva: la escena que libera la ropa manda sobre la producción que la conservaba',
    !!regla?.mayChange?.includes('outfit.clothing') && !regla?.preserve?.includes('outfit.clothing')
    && !!regla?.preserve?.includes('identity.face') && !!regla?.preserve?.includes('environment.location'));
  check('A23) la fuerza es la del nivel más cercano que la dice, y los anclajes se suman',
    regla?.strength === 'relaxed' && iguales(regla?.anchors, ['char-luna']));
  check('A24) sin nada que conservar no hay requisito de continuidad',
    M.continuidadEfectiva({ ...p, continuity: { preserve: ['outfit.clothing'] } }, { ...p.scenes[0], continuity: { preserve: ['identity.face'], mayChange: ['outfit.clothing'] } }) !== undefined
    && M.continuidadEfectiva(p, p.scenes[0], p.scenes[0].shots[0]) === undefined);
  check('A25) la estimación de habla cuenta palabras y no signos: 5 palabras son 5/3 de segundo',
    Math.abs(M.estimarHablaSec('Hola, ¿qué tal estás hoy?') - 5 / 3) < 1e-9 && M.estimarHablaSec('... ¡! —') === 0);
  check('A26) en chino, japonés y coreano cuenta caracteres, y los signos de ancho completo no cuentan',
    Math.abs(M.estimarHablaSec('你好，今天怎么样？') - 7 / 6) < 1e-9 && Math.abs(M.estimarHablaSec('안녕하세요') - 5 / 6) < 1e-9);
  check('A27) si una línea dice cuánto dura, manda sobre la estimación',
    M.duracionDeLineaMs({ id: 'ln-0001', kind: 'dialogue', text: 'uno dos tres', estimatedSec: 7 }) === 7000);
  check('A28) `canonico` no depende del orden de las claves', M.canonico({ b: 1, a: { d: 2, c: [3] } }) === M.canonico({ a: { c: [3], d: 2 }, b: 1 }));
});

/* ═══ B · LA VALIDACIÓN ════════════════════════════════════════════════════ */
console.log('\n── B · La validación: códigos, no frases ──');
seccion('B', () => {
  const p = base();
  const ok = validar(p, 'ready');
  check('B1) la producción de referencia es válida y está lista', ok.valid && ok.problems.length === 0, JSON.stringify(ok.problems.slice(0, 2)));
  const vacia = M.produccionVacia({ title: 'Nada', aspectRatio: '9:16' });
  check('B2) una producción vacía es un AVISO en borrador…', validar(vacia).valid && hay(validar(vacia), 'production_empty', 'scenes', 'warning'));
  check('B3) …y un ERROR cuando se va a pedir', !validar(vacia, 'ready').valid && hay(validar(vacia, 'ready'), 'production_empty', 'scenes', 'error'));

  for (const [nombre, d] of [['cero', 0], ['negativa', -2], ['NaN', NaN], ['más de 600 s', 601], ['menos de medio segundo', 0.4]]) {
    const x = clon(p); x.scenes[0].shots[0].durationSec = d;
    check(`B4) una duración de plano ${nombre} es \`duration_invalid\``, hay(validar(x), 'duration_invalid', 'scenes.sc-0001.shots.sh-0101.durationSec'));
  }
  const sinDuracion = clon(p); delete sinDuracion.scenes[0].shots[0].durationSec;
  check('B5) un plano sin duración: aviso en borrador',
    hay(validar(sinDuracion), 'shot_duration_missing', 'scenes.sc-0001.shots.sh-0101.durationSec', 'warning') && validar(sinDuracion).valid);
  check('B6) y error cuando se va a pedir', hay(validar(sinDuracion, 'ready'), 'shot_duration_missing', undefined, 'error'));
  const escenaSinNada = clon(p); escenaSinNada.scenes.push({ id: 'sc-0003', order: 2, shots: [] });
  check('B7) una escena sin planos y sin duración es `scene_duration_missing`, según la etapa',
    hay(validar(escenaSinNada), 'scene_duration_missing', 'scenes.sc-0003.durationSec', 'warning')
    && hay(validar(escenaSinNada, 'ready'), 'scene_duration_missing', 'scenes.sc-0003.durationSec', 'error'));
  const escenaConDuracion = clon(p); escenaConDuracion.scenes.push({ id: 'sc-0003', order: 2, durationSec: 3, shots: [] });
  check('B8) con su duración, una escena sin planos es válida (se generará entera)', validar(escenaConDuracion, 'ready').valid);
  const descuadre = clon(p); descuadre.scenes[0].durationSec = 12;
  check('B9) una escena que declara 12 s y cuyos planos suman 10 es `scene_duration_mismatch`',
    hay(validar(descuadre, 'ready'), 'scene_duration_mismatch', 'scenes.sc-0001.durationSec', 'error'));
  const casi = clon(p); casi.scenes[0].durationSec = 10.049;
  const pasado = clon(p); pasado.scenes[0].durationSec = 10.06;
  check('B10) la tolerancia es de 50 ms: 49 ms no es un error y 60 ms sí',
    !hay(validar(casi), 'scene_duration_mismatch') && hay(validar(pasado), 'scene_duration_mismatch'));
  const estricta = clon(p); estricta.duration = { targetSec: 20, strict: true };
  check('B11) con objetivo ESTRICTO, una suma que no llega es `duration_total_mismatch`',
    hay(validar(estricta, 'ready'), 'duration_total_mismatch', 'duration.targetSec', 'error'));
  const orienta = clon(p); orienta.duration = { targetSec: 20 };
  check('B12) sin `strict`, el objetivo solo orienta: la validación no lo exige', !hay(validar(orienta, 'ready'), 'duration_total_mismatch'));

  const colgando = clon(p);
  colgando.scenes[0].shots[0].characterIds = ['char-nadie'];
  colgando.scenes[0].locationId = 'loc-nadie';
  colgando.scenes[0].shots[1].dependsOn = ['sh-nadie'];
  colgando.scenes[0].shots[1].referenceIds = ['ref-nadie'];
  const rc = validar(colgando);
  check('B13) las referencias colgantes se dicen una a una: personaje, lugar, dependencia y referencia',
    hay(rc, 'reference_dangling', 'scenes.sc-0001.shots.sh-0101.characterIds.0') && hay(rc, 'reference_dangling', 'scenes.sc-0001.locationId')
    && hay(rc, 'reference_dangling', 'scenes.sc-0001.shots.sh-0102.dependsOn.0') && hay(rc, 'reference_dangling', 'scenes.sc-0001.shots.sh-0102.referenceIds.0'));
  const tipoEquivocado = clon(p); tipoEquivocado.scenes[0].shots[0].characterIds = ['loc-city'];
  check('B14) un id que existe pero es de OTRO tipo también cuelga: un lugar no es un personaje',
    validar(tipoEquivocado).problems.some((x) => x.code === 'reference_dangling' && iguales(x.parameters.expected, ['character'])));
  const repetida = clon(p); repetida.scenes[0].shots[0].objectIds = ['obj-shoe', 'obj-shoe'];
  check('B15) la misma referencia dos veces en una lista es `reference_duplicated`',
    hay(validar(repetida), 'reference_duplicated', 'scenes.sc-0001.shots.sh-0101.objectIds.1', 'error'));
  const mismoMaterial = clon(p); mismoMaterial.references.push({ id: 'ref-luna2', kind: 'image', role: 'character', assetId: 'asset-luna' });
  check('B16) el mismo material con el mismo papel dos veces sobra, pero es solo un aviso',
    hay(validar(mismoMaterial), 'reference_duplicated', 'references.ref-luna2', 'warning') && validar(mismoMaterial).valid);
  const idRepetido = clon(p); idRepetido.characters.push({ id: 'sc-0001', name: 'Duplicado' });
  const sinOrigen = clon(p); sinOrigen.references.push({ id: 'ref-nada', kind: 'image', role: 'style' });
  check('B16b) una referencia sin material ni Element no señala nada: `reference_source_missing`', hay(validar(sinOrigen), 'reference_source_missing', 'references.ref-nada'));
  check('B17) un id es único en TODA la producción: una escena y un personaje no pueden llamarse igual',
    hay(validar(idRepetido), 'id_duplicated', 'characters.sc-0001.id'));
  for (const malo of ['ab', 'con espacio', 'x'.repeat(129), 'ñandú-01']) {
    const x = clon(p); x.scenes[1].shots[0].id = malo;
    check(`B18) \`${malo.length > 20 ? malo.slice(0, 8) + '…' : malo}\` no tiene forma de id`, codigos(validar(x)).includes('id_invalid'));
  }
  const orden = clon(p); orden.scenes[0].order = 5;
  check('B19) `order` es la posición: una escena 0 que dice ser la 5 es `order_mismatch`', hay(validar(orden), 'order_mismatch', 'scenes.sc-0001.order'));
  const ordenPlano = clon(p); ordenPlano.scenes[0].shots[1].order = 0;
  check('B20) y lo mismo con los planos, dentro de su escena', hay(validar(ordenPlano), 'order_mismatch', 'scenes.sc-0001.shots.sh-0102.order'));

  const ciclo = clon(p); ciclo.scenes[0].shots[0].dependsOn = ['sh-0201']; ciclo.scenes[1].shots[0].dependsOn = ['sh-0102'];
  const rciclo = validar(ciclo);
  check('B21) tres planos que dependen en círculo son `dependency_cycle`, con sus ids ordenados',
    rciclo.problems.some((x) => x.code === 'dependency_cycle' && iguales(x.parameters.ids, ['sh-0101', 'sh-0102', 'sh-0201']) && x.parameters.kind === 'shot'));
  const aSiMismo = clon(p); aSiMismo.scenes[1].shots[0].dependsOn = ['sh-0201'];
  check('B22) un plano que depende de sí mismo es un ciclo de uno',
    validar(aSiMismo).problems.some((x) => x.code === 'dependency_cycle' && iguales(x.parameters.ids, ['sh-0201'])));
  const cicloEscenas = clon(p); cicloEscenas.scenes[0].dependsOn = ['sc-0002']; cicloEscenas.scenes[1].dependsOn = ['sc-0001'];
  check('B23) y las escenas también: dos que continúan la una de la otra',
    validar(cicloEscenas).problems.some((x) => x.code === 'dependency_cycle' && x.parameters.kind === 'scene'));
  const acyclic = clon(p); acyclic.scenes[1].shots[0].dependsOn = ['sh-0101', 'sh-0102'];
  check('B24) depender de dos planos anteriores no es un ciclo', !hay(validar(acyclic), 'dependency_cycle'));
  const muchas = clon(p);
  for (let i = 0; i < 9; i++) muchas.scenes[1].shots.push({ id: `sh-09${i}0`, order: i + 1, durationSec: 1 });
  muchas.scenes[1].shots[0].dependsOn = muchas.scenes[1].shots.slice(1).map((x) => x.id);
  check('B25) más de ocho dependencias es `dependency_invalid`: el límite de `ShotNode`', hay(validar(muchas), 'dependency_invalid', 'scenes.sc-0002.shots.sh-0201.dependsOn'));

  const enfoqueRaro = clon(p); enfoqueRaro.scenes[0].shots[0].subject = { characterId: 'char-luna', focus: 'nariz' };
  check('B25b) el enfoque de un plano es del vocabulario, y nada más', hay(validar(enfoqueRaro), 'value_invalid', 'scenes.sc-0001.shots.sh-0101.subject.focus'));
  const sujetoAusente = clon(p); sujetoAusente.scenes[0].shots[0].subject = { characterId: 'char-sol', focus: 'face' };
  check('B26) mirar a alguien que no está en el plano es `relation_missing`, un aviso',
    hay(validar(sujetoAusente), 'relation_missing', 'scenes.sc-0001.shots.sh-0101.subject.characterId', 'warning') && validar(sujetoAusente).valid);
  const fueraDelReparto = clon(p); fueraDelReparto.scenes[0].shots[0].characterIds = ['char-sol'];
  check('B27) si la escena declara su reparto, un plano no puede sacar a nadie más', hay(validar(fueraDelReparto), 'relation_missing', 'scenes.sc-0001.shots.sh-0101.characterIds'));
  const hablaAusente = clon(p); hablaAusente.scenes[0].shots[0].dialogue = [{ id: 'ln-0001', kind: 'dialogue', characterId: 'char-sol', text: 'Hola' }];
  check('B28) quien habla a cámara tiene que estar en el plano', hay(validar(hablaAusente), 'relation_missing', 'scenes.sc-0001.shots.sh-0101.dialogue.ln-0001.characterId'));
  const enOff = clon(p); enOff.scenes[0].shots[0].dialogue = [{ id: 'ln-0001', kind: 'voiceover', characterId: 'char-sol', text: 'Hola' }];
  check('B29) una voz en off no tiene que estar en el plano', !hay(validar(enOff), 'relation_missing'));
  const narrador = clon(p); narrador.scenes[0].shots[0].dialogue = [{ id: 'ln-0001', kind: 'narration', characterId: 'char-luna', text: 'Hola' }];
  check('B30) una narración con quien habla es incoherente: el narrador no es ningún personaje',
    hay(validar(narrador), 'constraints_incompatible', 'scenes.sc-0001.shots.sh-0101.dialogue.ln-0001.characterId', 'error'));
  const mudo = clon(p); mudo.scenes[0].shots[0].dialogue = [{ id: 'ln-0001', kind: 'dialogue', text: 'Hola' }];
  check('B31) un diálogo sin quién lo dice es `value_invalid`', hay(validar(mudo), 'value_invalid', 'scenes.sc-0001.shots.sh-0101.dialogue.ln-0001.characterId'));

  const restr = (cs, extra = {}) => validar({ ...clon(p), intent: { ...p.intent, constraints: cs }, ...extra }, 'ready');
  check('B32) un mínimo por encima del máximo es `constraints_incompatible`',
    hay(restr([{ kind: 'max_duration', seconds: 10 }, { kind: 'min_duration', seconds: 20 }]), 'constraints_incompatible', 'intent.constraints'));
  check('B33) una producción que dura más que el máximo pedido, también', restr([{ kind: 'max_duration', seconds: 12 }]).problems.some((x) => x.parameters.reason === 'total_above_max'));
  check('B34) y un objetivo por debajo del mínimo pedido', restr([{ kind: 'min_duration', seconds: 20 }]).problems.some((x) => x.parameters.reason === 'target_below_min'));
  check('B35) un formato exigido que no es el de la producción', restr([{ kind: 'aspect_ratio', aspectRatio: '16:9' }]).problems.some((x) => x.parameters.reason === 'format_differs'));
  check('B36) «sin diálogo» con diálogo', hay(restr([{ kind: 'no_dialogue' }], { scenes: hablaAusente.scenes }), 'constraints_incompatible', 'intent.constraints.0'));
  check('B37) «sin música» con música', hay(restr([{ kind: 'no_music' }], { audio: { cues: [{ id: 'cue-0001', kind: 'music', description: 'piano', target: { scope: 'production' } }] } }), 'constraints_incompatible', 'intent.constraints.0'));
  check('B38) «sin narración» con un narrador', hay(restr([{ kind: 'no_narration' }], { audio: { narrator: { description: 'grave' }, cues: [] } }), 'constraints_incompatible', 'intent.constraints.0'));
  check('B39) «que salga Sol» sin que Sol salga: aviso en borrador, error cuando se va a pedir',
    hay(restr([{ kind: 'include_character', characterId: 'char-sol' }]), 'relation_missing', 'intent.constraints.0', 'error')
    && hay(validar({ ...clon(p), intent: { constraints: [{ kind: 'include_character', characterId: 'char-sol' }] } }), 'relation_missing', 'intent.constraints.0', 'warning'));
  check('B40) dos máximos distintos se contradicen', restr([{ kind: 'max_duration', seconds: 30 }, { kind: 'max_duration', seconds: 40 }]).problems.some((x) => x.parameters.reason === 'repeated_constraint'));
  check('B41) y las restricciones que se cumplen no dicen nada', restr([{ kind: 'max_duration', seconds: 20 }, { kind: 'no_music' }, { kind: 'note', text: 'que brille' }]).valid);

  const dosSujetos = clon(p); dosSujetos.scenes[0].shots[0].subject = { characterId: 'char-luna', objectId: 'obj-shoe' };
  check('B42) mirar a la vez a un personaje y a un objeto es incoherente', hay(validar(dosSujetos), 'constraints_incompatible', 'scenes.sc-0001.shots.sh-0101.subject'));
  const dosPrimeros = clon(p);
  dosPrimeros.references.push({ id: 'ref-frame2', kind: 'image', role: 'first_frame', assetId: 'asset-frame2' });
  dosPrimeros.scenes[0].shots[0].referenceIds = ['ref-frame', 'ref-frame2'];
  check('B43) un plano con dos primeros fotogramas es incoherente', validar(dosPrimeros).problems.some((x) => x.parameters.reason === 'more_than_one_frame'));
  const fotogramaVideo = clon(p); fotogramaVideo.references[2].kind = 'video';
  check('B44) un primer fotograma que no es una imagen no encaja con su papel', validar(fotogramaVideo).problems.some((x) => x.parameters.reason === 'kind_does_not_fit_role'));
  const vozImagen = clon(p); vozImagen.characters[0].voice.referenceId = 'ref-luna';
  check('B45) la referencia de una voz tiene que ser audio', validar(vozImagen).problems.some((x) => x.parameters.reason === 'voice_reference_not_audio'));
  const encuadre = clon(p); encuadre.scenes[0].shots[0].visual = { creative: { version: 1, framing: { aspectRatio: '16:9' } } };
  check('B46) un plano encuadrado 16:9 en una producción 9:16 no se puede rodar', validar(encuadre).problems.some((x) => x.parameters.reason === 'framing_differs_from_format'));
  const quieta = clon(p); quieta.scenes[0].shots[0].visual = { creative: { version: 1, movement: { type: 'static', speed: 'fast' } } };
  check('B47) una cámara quieta con velocidad la rechaza el propio validador del Core', hay(validar(quieta), 'constraints_incompatible', 'scenes.sc-0001.shots.sh-0101.visual.creative.movement.speed'));
  const drone = clon(p); drone.scenes[0].shots[0].visual = { creative: { version: 1, camera: { type: 'dronecam' } } };
  check('B48) un valor fuera del vocabulario de cámara es `value_invalid`, con el motivo del Core',
    validar(drone).problems.some((x) => x.code === 'value_invalid' && x.path === 'scenes.sc-0001.shots.sh-0101.visual.creative.camera.type' && x.parameters.reason === 'invalid_value'));

  /* ── Lo que un nodo no puede llevar nunca ── */
  const prohibidas = ['provider', 'model', 'seed', 'prompt', 'url', 'modelId', 'apiKey', 'negative_prompt', 'endpoint', 'embedding'];
  for (const k of prohibidas) {
    const x = clon(p); x.scenes[0].shots[0][k] = 'x';
    check(`B49) \`${k}\` en un plano es \`field_forbidden\``, hay(validar(x), 'field_forbidden', `scenes.sc-0001.shots.sh-0101.${k}`));
  }
  const enTodas = clon(p);
  enTodas.model = 'x'; enTodas.scenes[0].provider = 'x'; enTodas.characters[0].seed = 1; enTodas.references[0].url = 'https://x';
  enTodas.audio.cues = [{ id: 'cue-0001', kind: 'sfx', description: 'viento', target: { scope: 'production' }, model: 'x' }];
  const rt = validar(enTodas);
  check('B50) y en cualquier nodo: la producción, una escena, un personaje, una referencia, un sonido',
    ['model', 'scenes.sc-0001.provider', 'characters.char-luna.seed', 'references.ref-luna.url', 'audio.cues.cue-0001.model'].every((r) => hay(rt, 'field_forbidden', r)));
  const enCreativo = clon(p); enCreativo.scenes[0].shots[0].visual = { creative: { version: 1, seed: 7 } };
  check('B51) dentro de la intención creativa también: el Core no lo reconoce y aquí se dice por qué', hay(validar(enCreativo), 'field_forbidden', 'scenes.sc-0001.shots.sh-0101.visual.creative.seed'));
  const proto = JSON.parse('{"__proto__": {"x": 1}, "version": 1}');
  const conProto = clon(p); conProto.scenes[0].shots[0] = { ...conProto.scenes[0].shots[0], ...{} }; Object.defineProperty(conProto.scenes[0].shots[0], '__proto__', { value: proto.__proto__, enumerable: true });
  check('B52) una clave `__proto__` es peligrosa y se rechaza', validar(conProto).problems.some((x) => x.code === 'field_forbidden' && x.parameters.reason === 'dangerous_key'));
  const desconocido = clon(p); desconocido.scenes[0].shots[0].colorida = true;
  check('B53) una clave que no existe es `field_unknown`', hay(validar(desconocido), 'field_unknown', 'scenes.sc-0001.shots.sh-0101.colorida'));

  /* ── El prompt avanzado: un solo sitio ── */
  const avanzado = clon(p); avanzado.scenes[0].shots[0].advanced = { prompt: 'rain on neon, 35mm, shallow depth' };
  check('B54) el prompt avanzado vive en `advanced.prompt` y es válido ahí', validar(avanzado, 'ready').valid);
  const avanzadoSemilla = clon(p); avanzadoSemilla.scenes[0].shots[0].advanced = { prompt: 'x', seed: 42, model: 'y', provider: 'z' };
  const ras = validar(avanzadoSemilla);
  check('B55) pero ni siquiera ahí caben semilla, modelo ni proveedor',
    ['seed', 'model', 'provider'].every((k) => hay(ras, 'field_forbidden', `scenes.sc-0001.shots.sh-0101.advanced.${k}`)));
  const avanzadoVacio = clon(p); avanzadoVacio.scenes[0].shots[0].advanced = { prompt: '   ' };
  check('B56) un prompt avanzado vacío no es un prompt', hay(validar(avanzadoVacio), 'value_invalid', 'scenes.sc-0001.shots.sh-0101.advanced.prompt'));
  const promptEnEscena = clon(p); promptEnEscena.scenes[0].advanced = { prompt: 'x' };
  check('B57) y `advanced` solo existe en los planos', hay(validar(promptEnEscena), 'field_unknown', 'scenes.sc-0001.advanced'));

  /* ── Continuidad, personajes, audio, montaje, entregas y metadatos ── */
  const aspectoMalo = clon(p); aspectoMalo.scenes[0].continuity = { preserve: ['identity.nariz'] };
  check('B58) un aspecto de continuidad que no existe lo rechaza el validador del Core', validar(aspectoMalo).problems.some((x) => x.parameters.reason === 'invalid_aspect'));
  const conflicto = clon(p); conflicto.scenes[0].continuity = { preserve: ['identity.face'], mayChange: ['identity.face'] };
  check('B59) conservar y liberar lo mismo es incoherente', hay(validar(conflicto), 'constraints_incompatible'));
  const anclaMala = clon(p); anclaMala.scenes[0].continuity = { preserve: ['identity.face'], anchors: ['ref-luna'] };
  check('B60) un anclaje tiene que ser un personaje, un lugar o un objeto de la producción', hay(validar(anclaMala), 'reference_dangling', 'scenes.sc-0001.continuity.anchors.0'));
  const espacial = clon(p); espacial.scenes[0].continuity = { preserve: ['spatial.relationships'], spatial: [{ subject: 'char-luna', relation: 'encima', object: 'char-luna' }] };
  const res = validar(espacial);
  check('B61) una relación espacial fuera del vocabulario, o de algo consigo mismo, no vale',
    res.problems.some((x) => x.path === 'scenes.sc-0001.continuity.spatial.0.relation') && res.problems.some((x) => x.parameters.reason === 'self_relation'));
  const sinNombre = clon(p); delete sinNombre.characters[1].name;
  check('B62) un personaje sin nombre no es válido', hay(validar(sinNombre), 'value_invalid', 'characters.char-sol.name'));
  const edad = clon(p); edad.characters[0].apparentAge = { minYears: 40, maxYears: 20 };
  check('B63) una edad aparente al revés es incoherente', hay(validar(edad), 'constraints_incompatible', 'characters.char-luna.apparentAge'));
  const relacion = clon(p); relacion.characters[0].relationships = [{ characterId: 'char-luna', kind: 'friend' }];
  check('B64) nadie es su propio amigo', validar(relacion).problems.some((x) => x.parameters.reason === 'self_relation'));
  const bloqueo = clon(p); bloqueo.characters[0].continuity = { locked: ['wardrobe', 'alas'] };
  check('B65) los rasgos que se fijan son los de la apariencia, y nada más', hay(validar(bloqueo), 'value_invalid', 'characters.char-luna.continuity.locked.1'));
  const vinculo = clon(p); vinculo.characters[0].element = { elementId: 'elem-luna', version: 0 };
  check('B66) un vínculo con un Element usa la forma del Core: versión desde 1', validar(vinculo).problems.some((x) => x.parameters.reason === 'invalid_binding'));
  const volumen = clon(p); volumen.audio.cues = [{ id: 'cue-0001', kind: 'music', description: 'x', target: { scope: 'scenes', sceneIds: [] }, volume: 2 }];
  const rv = validar(volumen);
  check('B67) un sonido con volumen 2 y un tramo de escenas vacío no es válido',
    hay(rv, 'value_invalid', 'audio.cues.cue-0001.volume') && hay(rv, 'value_invalid', 'audio.cues.cue-0001.target.sceneIds'));
  const pistas = clon(p); pistas.editPlan = { tracks: [{ kind: 'music' }, { kind: 'music', volume: 0.5 }] };
  check('B68) dos veces la misma pista de montaje no', validar(pistas).problems.some((x) => x.parameters.reason === 'duplicate_track'));
  const entrega = clon(p); entrega.exportPlan = { targets: [{ id: 'exp-0001', aspectRatio: '5:4', subtitleMode: 'burned' }] };
  const re = validar(entrega);
  check('B69) una entrega en un formato que no existe es `format_invalid`', hay(re, 'format_invalid', 'exportPlan.targets.exp-0001.aspectRatio'));
  check('B70) y pedir subtítulos grabados sin haberlos planeado es un aviso', hay(re, 'constraints_incompatible', 'exportPlan.targets.exp-0001.subtitleMode', 'warning'));
  const locale = clon(p); locale.metadata.locale = 'es-mx';
  check('B71) el idioma usa la regla del Core: `es-mx` no está normalizado y dice cuál sería',
    validar(locale).problems.some((x) => x.path === 'metadata.locale' && x.parameters.expected === 'es-MX'));
  const revision = clon(p); revision.metadata.revision = -1;
  check('B72) la revisión es un entero desde 0', hay(validar(revision), 'value_invalid', 'metadata.revision'));
  const version = clon(p); version.version = 2;
  check('B73) una versión del modelo que no existe no se lee como si fuera la 1', hay(validar(version), 'value_invalid', 'version'));
  check('B74) algo que no es un objeto no es una producción', hay(V.validarProduccion(null), 'shape_invalid', ''));

  /* ── La forma de lo que se devuelve ── */
  const todos = [rc, rciclo, rt, ras, res, re, rv].reduce((xs, r) => [...xs, ...r.problems], []);
  check('B75) cada problema trae su `messageKey` y es la de su código: `filmmaker.validation.<code>`',
    todos.every((x) => x.messageKey === `filmmaker.validation.${x.code}`));
  check('B76) los códigos y los motivos son identificadores, no frases', todos.every((x) => /^[a-z_]+$/.test(x.code) && (x.parameters.reason === undefined || /^[a-z_]+$/.test(x.parameters.reason))));
  check('B77) los parámetros son datos simples: textos, números, booleanos o listas de textos',
    todos.every((x) => Object.values(x.parameters).every((v) => ['string', 'number', 'boolean'].includes(typeof v) || (Array.isArray(v) && v.every((y) => typeof y === 'string')))));
  const dosVeces = [validar(colgando), validar(colgando)];
  check('B78) la misma producción da exactamente los mismos problemas, en el mismo orden', iguales(dosVeces[0], dosVeces[1]));
  const ordenados = rt.problems.map((x) => x.path);
  check('B79) ordenados por ruta', iguales(ordenados, [...ordenados].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))));
  check('B80) validar no toca la producción: una congelada se valida igual', validar(congelar(clon(colgando))).problems.length === rc.problems.length);
  check('B81) la integridad solo mira la forma: lo que falta en un borrador no la rompe',
    V.integridad(sinDuracion).length === 0 && V.integridad(colgando).length > 0 && V.integridad(vacia).length === 0);
  check('B82) y los códigos de integridad son los de forma, no los de etapa',
    ['shot_duration_missing', 'scene_duration_missing', 'production_empty', 'constraints_incompatible', 'relation_missing'].every((c) => !V.CODIGOS_DE_INTEGRIDAD.has(c))
    && ['field_forbidden', 'reference_dangling', 'dependency_cycle', 'id_duplicated', 'order_mismatch'].every((c) => V.CODIGOS_DE_INTEGRIDAD.has(c)));
});

/* ═══ C · LAS OPERACIONES ══════════════════════════════════════════════════ */
console.log('\n── C · Las operaciones: el lenguaje cerrado de los cambios ──');
seccion('C', () => {
  const p = base();
  check('C1) el lenguaje tiene las 19 operaciones pedidas',
    ['reorder_scene', 'reorder_shot', 'duplicate_scene', 'duplicate_shot', 'split_scene', 'split_shot', 'merge_scenes', 'merge_shots',
      'extend_duration', 'shorten_duration', 'change_camera', 'change_movement', 'change_lighting', 'change_weather', 'change_style',
      'replace_character', 'replace_reference', 'change_dialogue', 'modify_audio'].every((x) => O.OPERACIONES.includes(x)));
  check('C2) y las que hacen falta para no quedarse a medias: añadir, quitar, editar textos, sujeto, lugar, formato y entregas',
    ['add_scene', 'remove_scene', 'add_shot', 'remove_shot', 'edit_text', 'change_subject', 'change_location', 'change_format', 'change_export',
      'set_character_state', 'add_dialogue', 'remove_dialogue', 'change_time_of_day', 'change_target_duration'].every((x) => O.OPERACIONES.includes(x)));

  /* ── El ejemplo del brief, escrito en el idioma que Brain hablará ── */
  const e2 = M.escenaPorNumero(p, 2);
  const nl = O.aplicarOperaciones(p, [
    { op: 'change_movement', target: { scope: 'scene', sceneId: e2.id }, movement: 'push_in', speed: 'slow' },
    { op: 'change_subject', target: { sceneId: e2.id }, subject: { characterId: 'char-luna', focus: 'face' } },
    { op: 'change_weather', sceneId: e2.id, weather: 'rain' },
  ]);
  const plano = nl.ok && nl.production.scenes[1].shots[0];
  check('C3) «en la escena 2, que la cámara se acerque lentamente al rostro mientras llueve» cabe en tres operaciones',
    nl.ok && nl.production.scenes[1].visual.creative.movement.type === 'push_in' && nl.production.scenes[1].visual.creative.movement.speed === 'slow'
    && plano.subject.focus === 'face' && nl.production.scenes[1].weather === 'rain');
  check('C4) y deja pendiente SOLO el plano de esa escena', nl.ok && iguales(nl.pending.shots, ['sh-0201']) && iguales(nl.pending.scenes, ['sc-0002']));
  check('C5) la revisión sube una vez por cada operación que cambia algo', nl.ok && nl.applied === 3 && nl.production.metadata.revision === 3);
  check('C6) y la producción de entrada no se toca', p.scenes[1].weather === undefined && p.metadata.revision === 0);

  /* ── Escenas ── */
  const reord = op(p, { op: 'reorder_scene', sceneId: 'sc-0002', toOrder: 0 });
  check('C7) reordenar escenas las renumera: `order` sigue siendo la posición',
    reord.ok && iguales(reord.production.scenes.map((s) => [s.id, s.order]), [['sc-0002', 0], ['sc-0001', 1]]) && V.integridad(reord.production).length === 0);
  check('C8) reordenar no obliga a rehacer ningún plano, pero cambia el montaje', reord.ok && reord.pending.shots.length === 0 && reord.timelineChanged);
  check('C9) un destino fuera de rango no se aplica', !op(p, { op: 'reorder_scene', sceneId: 'sc-0002', toOrder: 2 }).ok);
  const dup = op(p, { op: 'duplicate_scene', sceneId: 'sc-0001' });
  const copia = dup.ok && dup.production.scenes[1];
  check('C10) duplicar una escena la pone justo detrás, con ids derivados para ella y sus planos',
    dup.ok && copia.id === 'sc-0001-2' && iguales(copia.shots.map((s) => s.id), ['sh-0101-2', 'sh-0102-2']));
  check('C11) las dependencias dentro de la escena copiada apuntan a las copias', dup.ok && iguales(copia.shots[1].dependsOn, ['sh-0101-2']));
  check('C12) lo copiado es nuevo, así que queda pendiente de generarse', dup.ok && iguales(dup.pending.shots, ['sh-0101-2', 'sh-0102-2']) && iguales(dup.pending.scenes, ['sc-0001-2']));
  check('C13) con un id pedido que ya existe, no, y dice por qué', op(p, { op: 'duplicate_scene', sceneId: 'sc-0001', newSceneId: 'sc-0002' }).problems?.[0].parameters.reason === 'id_taken');
  const split = op(p, { op: 'split_scene', sceneId: 'sc-0001', atShotOrder: 1 });
  check('C14) dividir una escena en dos no cambia ningún plano: nada que rehacer', split.ok && split.pending.shots.length === 0 && split.pending.scenes.length === 0);
  check('C15) pero el montaje cambia: hay una escena más', split.ok && split.timelineChanged && split.production.scenes.length === 3);
  check('C16) dividir por el borde no es dividir', op(p, { op: 'split_scene', sceneId: 'sc-0001', atShotOrder: 0 }).problems?.[0].code === 'operation_not_applicable');
  const unidas = split.ok && op(split.production, { op: 'merge_scenes', sceneId: 'sc-0001', withSceneId: 'sc-0001-2' });
  check('C17) y volver a unirlas deja exactamente las escenas de antes', unidas.ok && iguales(unidas.production.scenes, p.scenes) && iguales(unidas.pending.removed, ['sc-0001-2']));
  check('C18) solo se unen escenas seguidas', op(p, { op: 'merge_scenes', sceneId: 'sc-0002', withSceneId: 'sc-0001' }).problems?.[0].code === 'operation_not_applicable');
  const conMusica = clon(p); conMusica.audio.cues = [{ id: 'cue-0001', kind: 'music', description: 'piano', target: { scope: 'scenes', sceneIds: ['sc-0001'] } }];
  const splitMusica = op(conMusica, { op: 'split_scene', sceneId: 'sc-0001', atShotOrder: 1 });
  check('C19) la música de una escena dividida sigue sonando en sus dos mitades', splitMusica.ok && iguales(splitMusica.production.audio.cues[0].target.sceneIds, ['sc-0001', 'sc-0001-2']));
  const nueva = op(p, { op: 'add_scene', scene: { id: 'sc-0003', durationSec: 3, title: 'Final' }, atOrder: 1 });
  check('C20) añadir una escena en medio la numera y la deja pendiente', nueva.ok && nueva.production.scenes[1].id === 'sc-0003' && nueva.production.scenes[2].order === 2 && iguales(nueva.pending.scenes, ['sc-0003']));
  check('C21) no se añade una escena con un id que ya existe', op(p, { op: 'add_scene', scene: { id: 'sh-0101' } }).problems?.[0].parameters.reason === 'id_taken');
  const conMarca = clon(p); conMarca.editPlan = { markers: [{ id: 'mk-0001', atShotId: 'sh-0201', label: 'meta' }] };
  const quitar = op(conMarca, { op: 'remove_scene', sceneId: 'sc-0002' });
  check('C22) quitar una escena que se llevaría una marca se PARA y dice qué se perdería',
    !quitar.ok && quitar.problems[0].code === 'operation_blocked' && iguales(quitar.problems[0].parameters.paths, ['editPlan.markers.mk-0001']));
  const quitarTodo = op(conMarca, { op: 'remove_scene', sceneId: 'sc-0002', cascade: true });
  check('C23) con `cascade`, se quita y lo dice', quitarTodo.ok && quitarTodo.production.editPlan.markers === undefined && iguales(quitarTodo.pending.removed, ['sc-0002', 'sh-0201']));

  /* ── Planos ── */
  const reordP = op(p, { op: 'reorder_shot', shotId: 'sh-0102', toOrder: 0 });
  check('C24) reordenar planos los renumera dentro de su escena', reordP.ok && iguales(reordP.production.scenes[0].shots.map((s) => [s.id, s.order]), [['sh-0102', 0], ['sh-0101', 1]]));
  const dupP = op(p, { op: 'duplicate_shot', shotId: 'sh-0101', newShotId: 'sh-0103' });
  check('C25) duplicar un plano lo pone detrás del original con el id pedido', dupP.ok && dupP.production.scenes[0].shots[1].id === 'sh-0103' && iguales(dupP.pending.shots, ['sh-0103']));
  const conLinea = clon(p); conLinea.scenes[0].shots[0].dialogue = [{ id: 'ln-0001', kind: 'dialogue', characterId: 'char-luna', text: 'Vamos' }];
  const dupL = op(conLinea, { op: 'duplicate_shot', shotId: 'sh-0101' });
  check('C26) y sus líneas de diálogo se copian con ids nuevos: un id sigue siendo de una sola cosa',
    dupL.ok && dupL.production.scenes[0].shots[1].dialogue[0].id === 'ln-0001-2' && V.integridad(dupL.production).length === 0);
  const splitP = op(conLinea, { op: 'split_shot', shotId: 'sh-0101', atSec: 1.9 });
  const [a, b] = splitP.ok ? splitP.production.scenes[0].shots : [];
  check('C27) dividir un plano de 5 s en 1,9 deja 1,9 y 3,1 exactos', splitP.ok && a.durationSec === 1.9 && b.durationSec === 3.1);
  check('C28) lo que se dice se queda en la primera parte: una línea no se parte en dos', splitP.ok && a.dialogue.length === 1 && b.dialogue === undefined);
  check('C29) las dos partes quedan pendientes, y el plano que dependía de la primera también', splitP.ok && iguales(splitP.pending.shots, ['sh-0101', 'sh-0101-2', 'sh-0102']));
  check('C30) no se divide un plano por debajo de medio segundo', op(p, { op: 'split_shot', shotId: 'sh-0101', atSec: 0.3 }).problems?.[0].parameters.reason === 'out_of_range');
  const sinDur = clon(p); delete sinDur.scenes[0].shots[0].durationSec;
  check('C31) ni uno que no tiene duración', op(sinDur, { op: 'split_shot', shotId: 'sh-0101', atSec: 1 }).problems?.[0].code === 'operation_not_applicable');
  const conAvanzado = clon(p);
  conAvanzado.scenes[0].shots[0].advanced = { prompt: 'uno' };
  conAvanzado.scenes[0].shots[1].advanced = { prompt: 'dos' };
  conAvanzado.scenes[1].shots[0].dependsOn = ['sh-0102'];
  conAvanzado.audio.cues = [{ id: 'cue-0001', kind: 'sfx', description: 'zancada', target: { scope: 'shot', shotId: 'sh-0102' } }];
  const mergeP = op(conAvanzado, { op: 'merge_shots', shotId: 'sh-0101', withShotId: 'sh-0102' });
  const unido = mergeP.ok && mergeP.production.scenes[0].shots[0];
  check('C32) unir dos planos suma sus duraciones y junta sus textos', mergeP.ok && unido.durationSec === 10 && unido.description === 'Luna se ata la zapatilla Luna sale corriendo');
  check('C33) los prompts avanzados de los dos se conservan, uno detrás de otro', mergeP.ok && unido.advanced.prompt === 'uno\n\ndos');
  check('C34) quien dependía del segundo pasa a depender del unido, y su sonido también',
    mergeP.ok && iguales(mergeP.production.scenes[1].shots[0].dependsOn, ['sh-0101']) && mergeP.production.audio.cues[0].target.shotId === 'sh-0101');
  check('C35) un plano no se une con uno que no va justo detrás', op(p, { op: 'merge_shots', shotId: 'sh-0101', withShotId: 'sh-0201' }).problems?.[0].code === 'operation_not_applicable');
  const nuevoP = op(p, { op: 'add_shot', sceneId: 'sc-0002', shot: { id: 'sh-0202', durationSec: 2 } });
  check('C36) añadir un plano al final de su escena', nuevoP.ok && nuevoP.production.scenes[1].shots[1].id === 'sh-0202' && nuevoP.production.scenes[1].shots[1].order === 1);
  const conSonido = clon(p); conSonido.audio.cues = [{ id: 'cue-0001', kind: 'sfx', description: 'meta', target: { scope: 'shot', shotId: 'sh-0201' } }];
  check('C37) quitar un plano que se llevaría un sonido se para', op(conSonido, { op: 'remove_shot', shotId: 'sh-0201' }).problems?.[0].code === 'operation_blocked');
  const quitarP = op(p, { op: 'remove_shot', shotId: 'sh-0101' });
  check('C38) quitar un plano suelta a quien dependía de él, y ese queda pendiente',
    quitarP.ok && quitarP.production.scenes[0].shots[0].dependsOn === undefined && iguales(quitarP.pending.shots, ['sh-0102']) && iguales(quitarP.pending.removed, ['sh-0101']));

  /* ── Tiempo ── */
  const largo = clon(p); largo.scenes[0].shots[0].durationSec = 5.1;
  const estirar = op(largo, { op: 'extend_duration', target: { shotId: 'sh-0101' }, bySec: 0.2 });
  check('C39) alargar 0,2 s un plano de 5,1 s da 5,3 exactos', estirar.ok && estirar.production.scenes[0].shots[0].durationSec === 5.3);
  const conEscenaDeclarada = clon(p); conEscenaDeclarada.scenes[0].durationSec = 10;
  const estirarEscena = op(conEscenaDeclarada, { op: 'extend_duration', target: { sceneId: 'sc-0001' }, bySec: 2 });
  check('C40) una escena con planos se alarga por su último plano, y la cifra que declara se mantiene al día',
    estirarEscena.ok && estirarEscena.production.scenes[0].shots[1].durationSec === 7 && estirarEscena.production.scenes[0].durationSec === 12);
  const implicita = clon(p); implicita.scenes.push({ id: 'sc-0003', order: 2, durationSec: 4, shots: [] });
  const acortar = op(implicita, { op: 'shorten_duration', target: { sceneId: 'sc-0003' }, bySec: 1.5 });
  check('C41) una escena sin planos se acorta ella misma', acortar.ok && acortar.production.scenes[2].durationSec === 2.5);
  check('C42) acortar por debajo de medio segundo no se aplica', !op(p, { op: 'shorten_duration', target: { shotId: 'sh-0101' }, bySec: 4.8 }).ok);
  check('C43) y alargar en cero o en negativo tampoco', !op(p, { op: 'extend_duration', target: { shotId: 'sh-0101' }, bySec: 0 }).ok && !op(p, { op: 'extend_duration', target: { shotId: 'sh-0101' }, bySec: -1 }).ok);
  const objetivo = op(p, { op: 'change_target_duration', targetSec: 20, strict: true });
  check('C44) cambiar el objetivo de duración, y si es estricto', objetivo.ok && iguales(objetivo.production.duration, { targetSec: 20, strict: true }));
  check('C45) `null` lo quita', op(p, { op: 'change_target_duration', targetSec: null }).production?.duration.targetSec === undefined);

  /* ── Cómo se ve ── */
  const conPlanoCamara = clon(p); conPlanoCamara.scenes[0].shots[0].visual = { creative: { version: 1, lighting: { type: 'soft' }, shot: { type: 'close_up' } } };
  const luzEscena = op(conPlanoCamara, { op: 'change_lighting', target: { scope: 'scene', sceneId: 'sc-0001' }, lighting: 'golden_hour' });
  check('C46) cambiar la luz de una escena la hace valer en TODA la escena: se quita la del plano que la contradecía',
    luzEscena.ok && luzEscena.production.scenes[0].visual.creative.lighting.type === 'golden_hour'
    && luzEscena.production.scenes[0].shots[0].visual.creative.lighting === undefined && luzEscena.production.scenes[0].shots[0].visual.creative.shot.type === 'close_up');
  check('C47) y deja pendientes justo los planos de esa escena', luzEscena.ok && iguales(luzEscena.pending.shots, ['sh-0101', 'sh-0102']));
  const luzTodo = op(conPlanoCamara, { op: 'change_lighting', target: { scope: 'production' }, lighting: 'studio' });
  check('C48) cambiarla en la producción la cambia en todas partes', luzTodo.ok && luzTodo.production.creativeDirection.cinematography.lighting.type === 'studio' && luzTodo.pending.shots.length === 3);
  const camara = op(p, { op: 'change_camera', target: { scope: 'shot', shotId: 'sh-0201' }, cameraType: 'aerial', shotType: 'wide', focalLengthMm: 24, composition: 'rule_of_thirds' });
  check('C49) la cámara de un plano: tipo, plano, focal y composición, en el vocabulario del Core',
    camara.ok && iguales(camara.production.scenes[1].shots[0].visual.creative, { version: 1, camera: { type: 'aerial' }, shot: { type: 'wide' }, lens: { focalLengthMm: 24 }, composition: { type: 'rule_of_thirds' } }));
  const dron = op(p, { op: 'change_camera', target: { scope: 'shot', shotId: 'sh-0201' }, cameraType: 'dronecam' });
  check('C50) un valor que el Core no conoce no se aplica, y dice por qué', !dron.ok && dron.problems[0].parameters.reason === 'invalid_creative');
  const quietaRapida = op(p, { op: 'change_movement', target: { scope: 'shot', shotId: 'sh-0201' }, movement: 'static', speed: 'fast' });
  check('C51) una cámara quieta con velocidad tampoco: la regla de coherencia del Core', !quietaRapida.ok);
  const sinNada = op(p, { op: 'change_camera', target: { scope: 'production' } });
  check('C52) un cambio de cámara sin nada que cambiar no es un cambio', !sinNada.ok && sinNada.problems[0].parameters.reason === 'nothing_to_change');
  const estilo = op(p, { op: 'change_style', target: { scope: 'scene', sceneId: 'sc-0002' }, style: 'noir' });
  check('C53) el estilo de una escena', estilo.ok && estilo.production.scenes[1].visual.style === 'noir' && iguales(estilo.pending.shots, ['sh-0201']));
  const hora = op(p, { op: 'change_time_of_day', sceneId: 'sc-0002', timeOfDay: 'dawn' });
  check('C54) la hora del día de una escena', hora.ok && hora.production.scenes[1].timeOfDay === 'dawn' && iguales(hora.pending.shots, ['sh-0201']));
  const lugarMalo = op(p, { op: 'change_location', sceneId: 'sc-0002', locationId: 'loc-nadie' });
  check('C55) un lugar que no existe rompería la producción, y no se aplica',
    !lugarMalo.ok && lugarMalo.problems[0].code === 'operation_would_break_integrity' && lugarMalo.problems.some((x) => x.code === 'reference_dangling'));
  const sinClima = op(nl.production, { op: 'change_weather', sceneId: 'sc-0002', weather: null });
  check('C56) `null` quita el clima', sinClima.ok && sinClima.production.scenes[1].weather === undefined);
  const titulo = op(p, { op: 'edit_text', target: { sceneId: 'sc-0001' }, title: 'Arranque' });
  check('C57) cambiar el título de una escena no obliga a rehacer nada', titulo.ok && titulo.production.scenes[0].title === 'Arranque' && titulo.pending.shots.length === 0);
  check('C58) los planos no tienen título', op(p, { op: 'edit_text', target: { shotId: 'sh-0101' }, title: 'x' }).problems?.[0].parameters.reason === 'shots_have_no_title');
  const descripcion = op(p, { op: 'edit_text', target: { shotId: 'sh-0101' }, description: 'Primer plano del cordón' });
  check('C59) cambiar lo que pasa en un plano sí lo deja pendiente, y a quien depende de él', descripcion.ok && iguales(descripcion.pending.shots, ['sh-0101', 'sh-0102']));
  check('C60) mirar a algo en una escena sin planos no se puede', op(clon({ ...p, scenes: [{ id: 'sc-0009', order: 0, durationSec: 2, shots: [] }] }), { op: 'change_subject', target: { sceneId: 'sc-0009' }, subject: { focus: 'face' } }).problems?.[0].code === 'operation_not_applicable');

  /* ── Quién sale y con qué ── */
  const conSol = clon(p);
  conSol.scenes[0].characterIds = ['char-luna', 'char-sol'];
  conSol.scenes[0].shots[0].subject = { characterId: 'char-luna', focus: 'face' };
  conSol.scenes[0].shots[0].dialogue = [{ id: 'ln-0001', kind: 'dialogue', characterId: 'char-luna', text: 'Vamos' }];
  conSol.scenes[0].shots[0].characterStates = [{ characterId: 'char-luna', wardrobe: 'impermeable' }];
  conSol.continuity = { preserve: ['identity.face'], anchors: ['char-luna'] };
  const cambio = op(conSol, { op: 'replace_character', fromCharacterId: 'char-luna', toCharacterId: 'char-sol' });
  const s0 = cambio.ok && cambio.production.scenes[0];
  check('C61) sustituir a un personaje llega a todas partes: reparto, sujeto, quien habla, su estado y la continuidad',
    cambio.ok && iguales(s0.characterIds, ['char-sol']) && s0.shots[0].subject.characterId === 'char-sol' && s0.shots[0].dialogue[0].characterId === 'char-sol'
    && s0.shots[0].characterStates[0].characterId === 'char-sol' && iguales(cambio.production.continuity.anchors, ['char-sol']));
  check('C62) y la línea que ahora dice otro queda pendiente de voz', cambio.ok && cambio.pending.audio.includes('ln-0001'));
  const soloEscena = op(conSol, { op: 'replace_character', fromCharacterId: 'char-luna', toCharacterId: 'char-sol', scope: { sceneId: 'sc-0002' } });
  check('C63) con ámbito, solo dentro de él', soloEscena.ok && iguales(soloEscena.production.scenes[0].characterIds, ['char-luna', 'char-sol']) && iguales(soloEscena.production.scenes[1].characterIds, ['char-sol']));
  check('C64) sustituir a alguien por sí mismo no es un cambio', op(p, { op: 'replace_character', fromCharacterId: 'char-luna', toCharacterId: 'char-luna' }).problems?.[0].parameters.reason === 'same_character');
  const estado = op(p, { op: 'set_character_state', target: { shotId: 'sh-0102' }, characterId: 'char-luna', wardrobe: 'impermeable' });
  check('C65) poner cómo va un personaje en un plano', estado.ok && iguales(estado.production.scenes[0].shots[1].characterStates, [{ characterId: 'char-luna', wardrobe: 'impermeable' }]));
  const quitarEstado = estado.ok && op(estado.production, { op: 'set_character_state', target: { shotId: 'sh-0102' }, characterId: 'char-luna', wardrobe: null });
  check('C66) y quitárselo: un estado vacío no se guarda', quitarEstado.ok && quitarEstado.production.scenes[0].shots[1].characterStates === undefined);
  const conOtra = clon(p); conOtra.references.push({ id: 'ref-luna-b', kind: 'image', role: 'character', assetId: 'asset-luna-b' });
  const refCambio = op(conOtra, { op: 'replace_reference', fromReferenceId: 'ref-luna', toReferenceId: 'ref-luna-b' });
  check('C67) sustituir una referencia la cambia en todas las listas', refCambio.ok && iguales(refCambio.production.characters[0].referenceIds, ['ref-luna-b']));
  check('C68) y deja pendientes los planos donde sale quien la usa', refCambio.ok && refCambio.pending.shots.length === 3);
  check('C69) no se sustituye una imagen por un audio', op(p, { op: 'replace_reference', fromReferenceId: 'ref-luna', toReferenceId: 'ref-voz' }).problems?.[0].parameters.reason === 'kind_mismatch');

  /* ── Diálogo ── */
  const decir = op(p, { op: 'add_dialogue', target: { shotId: 'sh-0201' }, line: { id: 'ln-0009', kind: 'dialogue', characterId: 'char-luna', text: '¡Lo logré!' } });
  check('C70) añadir una línea a un plano: queda pendiente la voz y el plano, porque se dice a cámara',
    decir.ok && iguales(decir.pending.audio, ['ln-0009']) && iguales(decir.pending.shots, ['sh-0201']));
  const enOff = op(p, { op: 'add_dialogue', target: { sceneId: 'sc-0002' }, line: { id: 'ln-0010', kind: 'narration', text: 'Y llegó.' } });
  check('C71) una narración no cambia la imagen: solo su voz queda pendiente', enOff.ok && iguales(enOff.pending.audio, ['ln-0010']) && enOff.pending.shots.length === 0);
  const retocar = decir.ok && op(decir.production, { op: 'change_dialogue', lineId: 'ln-0009', changes: { text: '¡Lo hice!', emotion: 'euforia' } });
  check('C72) cambiar lo que se dice', retocar.ok && retocar.production.scenes[1].shots[0].dialogue[0].text === '¡Lo hice!' && iguales(retocar.pending.audio, ['ln-0009']));
  check('C73) una línea que no existe no se cambia', op(p, { op: 'change_dialogue', lineId: 'ln-nada', changes: { text: 'x' } }).problems?.[0].code === 'operation_target_missing');
  check('C74) y un cambio con un campo prohibido tampoco', op(decir.production, { op: 'change_dialogue', lineId: 'ln-0009', changes: { model: 'x' } }).problems?.[0].parameters.reason === 'forbidden_field');
  const sinQuien = decir.ok && op(decir.production, { op: 'change_dialogue', lineId: 'ln-0009', changes: { characterId: null } });
  check('C75) dejar un diálogo sin quien lo dice rompería la producción', !sinQuien.ok && sinQuien.problems[0].code === 'operation_would_break_integrity');
  const borrar = decir.ok && op(decir.production, { op: 'remove_dialogue', lineId: 'ln-0009' });
  check('C76) quitar una línea', borrar.ok && borrar.production.scenes[1].shots[0].dialogue === undefined && iguales(borrar.pending.removed, ['ln-0009']));

  /* ── Audio, formato y entregas ── */
  const musica = op(p, { op: 'modify_audio', change: { action: 'upsert', cue: { id: 'cue-0001', kind: 'music', description: 'electrónica', target: { scope: 'production' } } } });
  check('C77) añadir música: queda pendiente ese sonido y ningún plano', musica.ok && iguales(musica.pending.audio, ['cue-0001']) && musica.pending.shots.length === 0);
  const musica2 = musica.ok && op(musica.production, { op: 'modify_audio', change: { action: 'upsert', cue: { id: 'cue-0001', kind: 'music', description: 'piano', target: { scope: 'production' } } } });
  check('C78) cambiarla por su id la sustituye', musica2.ok && musica2.production.audio.cues.length === 1 && musica2.production.audio.cues[0].description === 'piano');
  const narrador = op(p, { op: 'modify_audio', change: { action: 'set_narrator', narrator: { description: 'grave' } } });
  check('C79) poner narrador', narrador.ok && narrador.production.audio.narrator.description === 'grave');
  check('C80) quitar un sonido que no existe no se puede', op(p, { op: 'modify_audio', change: { action: 'remove', cueId: 'cue-nada' } }).problems?.[0].code === 'operation_target_missing');
  const conEncuadre = clon(p); conEncuadre.scenes[0].shots[0].visual = { creative: { version: 1, framing: { aspectRatio: '9:16' }, shot: { type: 'wide' } } };
  const horizontal = op(conEncuadre, { op: 'change_format', preset: 'youtube' });
  check('C81) «hazlo horizontal»: el preset pone el formato y se quita el encuadre que ya no vale',
    horizontal.ok && iguales(horizontal.production.format, { aspectRatio: '16:9', resolution: '1080p', preset: 'youtube' })
    && horizontal.production.scenes[0].shots[0].visual.creative.framing === undefined && horizontal.production.scenes[0].shots[0].visual.creative.shot.type === 'wide');
  check('C82) y todo queda pendiente: el formato cambia cada plano', horizontal.ok && horizontal.pending.shots.length === 3);
  check('C83) un preset y un formato que se contradicen no se aplican', op(p, { op: 'change_format', preset: 'youtube', aspectRatio: '9:16' }).problems?.[0].parameters.reason === 'preset_conflict');
  const aMano = op(p, { op: 'change_format', aspectRatio: '1:1' });
  check('C84) un formato tocado a mano ya no es el del preset', aMano.ok && aMano.production.format.preset === undefined && aMano.production.format.aspectRatio === '1:1');
  const entrega = op(p, { op: 'change_export', change: { action: 'upsert', target: { id: 'exp-0001', context: 'youtube_shorts', subtitleMode: 'sidecar' } } });
  check('C85) añadir una entrega no obliga a rehacer nada', entrega.ok && entrega.production.exportPlan.targets.length === 1 && entrega.pending.shots.length === 0);

  /* ── La forma de una operación ── */
  const rara = op(p, { op: 'teleport_scene', sceneId: 'sc-0001' });
  check('C86) una operación que no existe', !rara.ok && rara.problems[0].parameters.reason === 'unknown_operation');
  check('C87) un campo que la operación no lleva', op(p, { op: 'reorder_scene', sceneId: 'sc-0001', toOrder: 1, rapido: true }).problems?.[0].parameters.reason === 'unknown_field');
  check('C88) un campo prohibido en la operación', op(p, { op: 'reorder_scene', sceneId: 'sc-0001', toOrder: 1, model: 'x' }).problems?.[0].parameters.reason === 'forbidden_field');
  check('C89) y uno obligatorio que falta', op(p, { op: 'reorder_scene', sceneId: 'sc-0001' }).problems?.[0].parameters.reason === 'required');
  check('C90) un objetivo que no existe', op(p, { op: 'reorder_shot', shotId: 'sh-nada', toOrder: 0 }).problems?.[0].code === 'operation_target_missing');
  const nuevoMalo = op(p, { op: 'add_shot', sceneId: 'sc-0001', shot: { id: 'sh-0909', durationSec: 2, model: 'x' } });
  check('C91) un plano nuevo con `model` no entra: rompería la producción',
    !nuevoMalo.ok && nuevoMalo.problems[0].code === 'operation_would_break_integrity' && nuevoMalo.problems.some((x) => x.code === 'field_forbidden'));
  const conAvisos = clon(p); conAvisos.references.push({ id: 'ref-luna2', kind: 'image', role: 'character', assetId: 'asset-luna' });
  check('C91b) una producción con avisos no está rota: se opera sobre ella', validar(conAvisos).problems.length > 0 && op(conAvisos, { op: 'change_weather', sceneId: 'sc-0001', weather: 'rain' }).ok);
  const rota = clon(p); rota.scenes[0].shots[0].characterIds = ['char-nadie'];
  check('C92) sobre una producción rota no se opera: primero hay que arreglarla', op(rota, { op: 'change_weather', sceneId: 'sc-0001', weather: 'rain' }).problems?.[0].code === 'production_invalid');
  const lote = O.aplicarOperaciones(p, [{ op: 'change_weather', sceneId: 'sc-0001', weather: 'rain' }, { op: 'reorder_scene', sceneId: 'sc-nada', toOrder: 0 }]);
  check('C93) un lote es todo o nada: si falla la segunda, no se aplica ni la primera, y dice cuál', !lote.ok && lote.problems[0].parameters.index === 1 && p.scenes[0].weather === undefined);
  const nada = op(p, { op: 'change_weather', sceneId: 'sc-0001', weather: undefined === 1 ? 'rain' : null });
  check('C94) una operación que no cambia nada no sube la revisión', nada.ok && nada.applied === 0 && nada.production.metadata.revision === 0);
  check('C95) las operaciones y su resultado usan `messageKey` de operación', lote.problems[0].messageKey === 'filmmaker.operation.operation_target_missing');

  /* ── Ninguna operación rompe nada, ni toca lo que recibe ── */
  const congelada = congelar(clon(p));
  const corpus = [
    { op: 'reorder_scene', sceneId: 'sc-0002', toOrder: 0 }, { op: 'reorder_shot', shotId: 'sh-0102', toOrder: 0 },
    { op: 'duplicate_scene', sceneId: 'sc-0001' }, { op: 'duplicate_shot', shotId: 'sh-0201' },
    { op: 'split_scene', sceneId: 'sc-0001', atShotOrder: 1 }, { op: 'split_shot', shotId: 'sh-0201', atSec: 2 },
    { op: 'merge_scenes', sceneId: 'sc-0001', withSceneId: 'sc-0002' }, { op: 'merge_shots', shotId: 'sh-0101', withShotId: 'sh-0102' },
    { op: 'extend_duration', target: { sceneId: 'sc-0002' }, bySec: 1 }, { op: 'shorten_duration', target: { shotId: 'sh-0101' }, bySec: 1 },
    { op: 'change_target_duration', targetSec: 30 }, { op: 'change_camera', target: { scope: 'scene', sceneId: 'sc-0001' }, shotType: 'hero' },
    { op: 'change_movement', target: { scope: 'production' }, movement: 'orbit', smoothness: 'smooth' },
    { op: 'change_lighting', target: { scope: 'shot', shotId: 'sh-0101' }, lighting: 'dramatic' },
    { op: 'change_style', target: { scope: 'production' }, style: 'documental' }, { op: 'change_weather', sceneId: 'sc-0001', weather: 'fog' },
    { op: 'change_time_of_day', sceneId: 'sc-0001', timeOfDay: 'dusk' }, { op: 'change_location', sceneId: 'sc-0001', locationId: null },
    { op: 'change_subject', target: { shotId: 'sh-0101' }, subject: { objectId: 'obj-shoe', focus: 'detail' } },
    { op: 'edit_text', target: { sceneId: 'sc-0002' }, description: 'la meta' },
    { op: 'replace_character', fromCharacterId: 'char-luna', toCharacterId: 'char-sol' },
    { op: 'set_character_state', target: { sceneId: 'sc-0001' }, characterId: 'char-luna', appearanceNotes: 'sudada' },
    { op: 'add_dialogue', target: { sceneId: 'sc-0001' }, line: { id: 'ln-0100', kind: 'narration', text: 'Todo empieza aquí.' } },
    { op: 'modify_audio', change: { action: 'upsert', cue: { id: 'cue-0100', kind: 'ambience', description: 'ciudad', target: { scope: 'scenes', sceneIds: ['sc-0001', 'sc-0002'] } } } },
    { op: 'change_format', aspectRatio: '4:5' }, { op: 'change_export', change: { action: 'upsert', target: { id: 'exp-0100', aspectRatio: '16:9' } } },
    { op: 'add_scene', scene: { id: 'sc-0100', durationSec: 2 } }, { op: 'add_shot', sceneId: 'sc-0002', shot: { id: 'sh-0100', durationSec: 1 } },
    { op: 'remove_shot', shotId: 'sh-0101' }, { op: 'remove_scene', sceneId: 'sc-0002' },
  ];
  const resultados = corpus.map((o) => ({ o, r: seguro(() => op(congelada, o)) }));
  const fallidas = resultados.filter(({ r }) => !r.ok).map(({ o, r }) => `${o.op}:${r.problems[0].code}${r.lanzo ? `(${r.lanzo})` : ''}`);
  check('C96) cada operación del corpus se aplica sobre una producción CONGELADA: ninguna toca lo que recibe', fallidas.length === 0, fallidas.join(', '));
  check('C97) y ninguna deja la producción rota', resultados.every(({ r }) => r.ok && V.integridad(r.production).length === 0));
  check('C98) y la producción de entrada sigue siendo la misma, byte a byte', iguales(congelada, p));
  check('C99) cada una sube la revisión en uno', resultados.every(({ r }) => r.production.metadata.revision === 1));
});

/* ═══ D · LO PENDIENTE DE REHACER ══════════════════════════════════════════ */
console.log('\n── D · Lo pendiente de rehacer ──');
seccion('D', () => {
  const p = base();
  const retocada = clon(p); retocada.characters[0].appearance = { wardrobe: { description: 'chaqueta roja' } };
  const d = O.pendientesEntre(p, retocada);
  check('D1) cambiar la ropa de un personaje deja pendientes justo los planos donde sale', iguales(d.pending.shots, ['sh-0101', 'sh-0102', 'sh-0201']));
  const conSol = clon(p); conSol.scenes[1].characterIds = ['char-sol']; conSol.scenes[1].shots[0].characterIds = ['char-sol'];
  const conSolRetocado = clon(conSol); conSolRetocado.characters[1].identityDescription = 'otro corredor';
  check('D2) y ninguno más: tocar a Sol solo afecta al plano de Sol', iguales(O.pendientesEntre(conSol, conSolRetocado).pending.shots, ['sh-0201']));
  const cadena = clon(p); cadena.scenes[1].shots[0].dependsOn = ['sh-0102'];
  const cambiaPrimero = op(cadena, { op: 'edit_text', target: { shotId: 'sh-0101' }, description: 'otra cosa' });
  check('D3) lo que depende de lo que cambió también queda pendiente, en cadena', cambiaPrimero.ok && iguales(cambiaPrimero.pending.shots, ['sh-0101', 'sh-0102', 'sh-0201']));
  const continua = clon(p); continua.scenes[1].dependsOn = ['sc-0001'];
  const cambiaEscena = op(continua, { op: 'change_weather', sceneId: 'sc-0001', weather: 'rain' });
  check('D4) una escena que continúa otra queda pendiente si la otra cambia', cambiaEscena.ok && iguales(cambiaEscena.pending.scenes, ['sc-0001', 'sc-0002']));
  const previo = clon(p); previo.scenes[0].shots[1].continuity = { preserve: ['temporal.previousShot'] };
  const reorden = clon(previo); reorden.scenes[0].shots = [{ ...previo.scenes[0].shots[1], order: 0, dependsOn: undefined }, { ...previo.scenes[0].shots[0], order: 1 }];
  const conPrevio = op(previo, { op: 'duplicate_shot', shotId: 'sh-0101', newShotId: 'sh-0110' });
  check('D5) un plano que continúa el anterior queda pendiente si su anterior cambia', conPrevio.ok && conPrevio.pending.shots.includes('sh-0102'));
  const sinPrevio = op(p, { op: 'duplicate_shot', shotId: 'sh-0101', newShotId: 'sh-0110' });
  check('D6) y sin esa continuidad, intercalar uno no toca al siguiente', sinPrevio.ok && iguales(sinPrevio.pending.shots, ['sh-0110']));
  const alargar = op(p, { op: 'extend_duration', target: { shotId: 'sh-0201' }, bySec: 1 });
  check('D7) alargar un plano lo deja pendiente y cambia el montaje', alargar.ok && iguales(alargar.pending.shots, ['sh-0201']) && alargar.timelineChanged);
  const conMusica = clon(p); conMusica.audio.cues = [{ id: 'cue-0001', kind: 'music', description: 'piano', target: { scope: 'scenes', sceneIds: ['sc-0002'] } }];
  const musicaMasLarga = op(conMusica, { op: 'extend_duration', target: { shotId: 'sh-0201' }, bySec: 2 });
  check('D8) la música de una escena que se alarga ya no vale: queda pendiente', musicaMasLarga.ok && iguales(musicaMasLarga.pending.audio, ['cue-0001']));
  const vozNueva = clon(p); vozNueva.scenes[1].shots[0].dialogue = [{ id: 'ln-0001', kind: 'voiceover', characterId: 'char-luna', text: 'Ya está' }];
  const conVozCambiada = clon(vozNueva); conVozCambiada.characters[0].voice = { description: 'grave' };
  check('D9) cambiar la voz de un personaje deja pendientes sus líneas…', iguales(O.pendientesEntre(vozNueva, conVozCambiada).pending.audio, ['ln-0001']));
  check('D9b) …y ninguno de sus planos: una voz suena, no se ve', O.pendientesEntre(vozNueva, conVozCambiada).pending.shots.length === 0);
  const conEstilo = clon(p); conEstilo.references.push({ id: 'ref-estilo', kind: 'image', role: 'style', assetId: 'asset-estilo' });
  const conEstiloUsado = clon(conEstilo); conEstiloUsado.creativeDirection.referenceIds = ['ref-estilo'];
  check('D9c) una referencia de estilo de toda la producción deja pendientes todos los planos', O.pendientesEntre(conEstilo, conEstiloUsado).pending.shots.length === 3);
  check('D10) lo pendiente es un cálculo, no un estado: nada se marca como `stale` en la producción',
    !JSON.stringify(cambiaPrimero.production).includes('stale'));
});

/* ═══ E · LAS RECOMENDACIONES ══════════════════════════════════════════════ */
console.log('\n── E · Las recomendaciones: nunca se aplican solas ──');
seccion('E', () => {
  const p = base();
  const resuelve = (prod, rec) => rec.proposals.length > 0 && rec.proposals.every((ops) => {
    const r = O.aplicarOperaciones(prod, ops);
    return r.ok && !Rc.recomendar(r.production).some((x) => x.code === rec.code && x.path === rec.path && x.parameters.characterId === rec.parameters.characterId && x.parameters.reason === rec.parameters.reason);
  });
  check('E1) la producción de referencia no tiene nada que recomendar', Rc.recomendar(p).length === 0, JSON.stringify(Rc.recomendar(p).map((x) => x.code)));

  const muchas = clon(p);
  muchas.scenes = Array.from({ length: 10 }, (_, i) => ({ id: `sc-00${String(i).padStart(2, '0')}`, order: i, durationSec: 1.5, shots: [] }));
  const rMuchas = Rc.recomendar(muchas).find((x) => x.code === 'too_many_scenes_for_duration');
  check('E2) diez escenas en 15 s son demasiadas', !!rMuchas && rMuchas.parameters.scenes === 10 && rMuchas.parameters.maxScenes === 7);
  check('E3) y hay dos salidas: alargar el objetivo o juntar escenas', rMuchas.proposals.length === 2 && rMuchas.proposals[0][0].op === 'change_target_duration' && rMuchas.proposals[1].every((o) => o.op === 'merge_scenes'));
  check('E4) cualquiera de las dos lo resuelve de verdad', resuelve(muchas, rMuchas));
  const juntadas = O.aplicarOperaciones(muchas, rMuchas.proposals[1]);
  check('E5) juntar deja siete escenas: las que caben', juntadas.ok && juntadas.production.scenes.length === 7);

  const charla = clon(p);
  charla.scenes[1].shots[0].dialogue = [{ id: 'ln-0001', kind: 'dialogue', characterId: 'char-luna', text: 'uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce quince dieciséis diecisiete dieciocho' }];
  const rCharla = Rc.recomendar(charla).find((x) => x.code === 'dialogue_exceeds_duration');
  check('E6) dieciocho palabras no caben en 5 s', !!rCharla && rCharla.path === 'scenes.sc-0002.shots.sh-0201' && rCharla.parameters.estimatedSec === 6 && rCharla.parameters.availableSec === 5);
  check('E7) la propuesta alarga el plano lo que falta, y lo resuelve', rCharla.proposals[0][0].bySec === 1 && resuelve(charla, rCharla));
  const charlaEscena = clon(p);
  charlaEscena.scenes[0].dialogue = [{ id: 'ln-0002', kind: 'narration', text: 'x', estimatedSec: 12 }];
  const rEscena = Rc.recomendar(charlaEscena).find((x) => x.code === 'dialogue_exceeds_duration');
  check('E8) las líneas sin plano cuentan contra la escena entera, y también se resuelve', !!rEscena && rEscena.path === 'scenes.sc-0001' && resuelve(charlaEscena, rEscena));

  const imposible = clon(p);
  imposible.scenes[1].shots[0].dialogue = [{ id: 'ln-0003', kind: 'dialogue', characterId: 'char-luna', text: 'x', estimatedSec: 590 }, { id: 'ln-0004', kind: 'dialogue', characterId: 'char-luna', text: 'y', estimatedSec: 590 }];
  const rImposible = Rc.recomendar(imposible).find((x) => x.code === 'dialogue_exceeds_duration');
  check('E8b) una propuesta que no se podría aplicar no se ofrece: un plano no pasa de 600 s', !!rImposible && rImposible.proposals.length === 0);
  const musicaLarga = clon(p); musicaLarga.audio.cues = [{ id: 'cue-0001', kind: 'music', description: 'piano', target: { scope: 'production' }, durationSec: 40 }];
  const rMusica = Rc.recomendar(musicaLarga).find((x) => x.code === 'audio_longer_than_video');
  check('E9) una música de 40 s para 15 s de vídeo', !!rMusica && rMusica.parameters.availableSec === 15);
  check('E10) la propuesta la recorta a su tramo, y lo resuelve', rMusica.proposals[0][0].change.cue.durationSec === 15 && resuelve(musicaLarga, rMusica));

  const fijada = clon(p); fijada.characters[0].continuity = { locked: ['wardrobe'] };
  fijada.scenes[1].shots[0].characterStates = [{ characterId: 'char-luna', wardrobe: 'impermeable' }];
  const rFijada = Rc.recomendar(fijada).find((x) => x.parameters.reason === 'locked_wardrobe_changed');
  check('E11) un vestuario fijado que un plano cambia es una incoherencia de continuidad', !!rFijada && rFijada.path === 'scenes.sc-0002.shots.sh-0201.characterStates');
  check('E12) la propuesta quita el cambio, y lo resuelve', resuelve(fijada, rFijada));
  const ropa = clon(p); ropa.scenes[0].shots[1].characterStates = [{ characterId: 'char-luna', wardrobe: 'impermeable' }];
  const rRopa = Rc.recomendar(ropa).find((x) => x.parameters.reason === 'wardrobe_changes_within_scene');
  check('E13) «Luna aparece con otra ropa en el plano siguiente»', !!rRopa && rRopa.parameters.characterId === 'char-luna' && rRopa.parameters.to === 'impermeable');
  check('E14) y la propuesta la deja como estaba en el plano anterior', resuelve(ropa, rRopa));

  const sinPlanos = clon(p); sinPlanos.scenes.push({ id: 'sc-0003', order: 2, durationSec: 3, shots: [] });
  const rSin = Rc.recomendar(sinPlanos).find((x) => x.code === 'scene_without_shots');
  check('E15) una escena sin planos: se propone uno, con la duración de la escena', !!rSin && rSin.severity === 'info' && rSin.proposals[0][0].shot.durationSec === 3 && rSin.proposals[0][0].shot.id === 'sc-0003-shot');
  check('E16) y lo resuelve', resuelve(sinPlanos, rSin));
  const acciones = clon(p); acciones.scenes[1].shots[0].actions = ['cruza', 'salta', 'grita', 'cae'];
  const rAcciones = Rc.recomendar(acciones).find((x) => x.code === 'shot_too_short_for_actions');
  check('E17) cuatro acciones no se ven en 5 s', !!rAcciones && rAcciones.parameters.neededSec === 6);
  check('E18) se propone el tiempo que hace falta, y lo resuelve', resuelve(acciones, rAcciones));

  const entregas = clon(p); entregas.exportPlan = { targets: [{ id: 'exp-0001', aspectRatio: '16:9', resolution: '4k' }] };
  const rEntregas = Rc.recomendar(entregas).filter((x) => x.code === 'requirements_incompatible');
  check('E19) una entrega horizontal y en 4k de una producción vertical en 1080p: reencuadre y reescalado',
    iguales(rEntregas.map((x) => x.parameters.reason).sort(), ['reframe_needed', 'upscale_needed']));
  check('E20) y cada una se resuelve con su propuesta', rEntregas.every((x) => resuelve(entregas, x)));
  const continua = clon(p); continua.scenes[1].dependsOn = ['sc-0001']; continua.scenes[1].timeOfDay = 'dawn';
  const rContinua = Rc.recomendar(continua).find((x) => x.code === 'setting_changes_in_continuation');
  check('E21) una escena que continúa otra y pasa de noche a amanecer', !!rContinua && rContinua.parameters.from === 'night' && rContinua.parameters.to === 'dawn');
  check('E22) se propone igualarla, y lo resuelve', resuelve(continua, rContinua));
  const lejos = clon(p); lejos.duration = { targetSec: 30 };
  const rLejos = Rc.recomendar(lejos).find((x) => x.code === 'duration_off_target');
  check('E23) 15 s para un objetivo de 30 que solo orienta: se dice, y se propone ajustar el objetivo', !!rLejos && rLejos.proposals[0][0].targetSec === 15 && resuelve(lejos, rLejos));
  check('E24) con objetivo estricto no se recomienda: ahí manda la validación', !Rc.recomendar({ ...lejos, duration: { targetSec: 30, strict: true } }).some((x) => x.code === 'duration_off_target'));

  const todas = [muchas, charla, charlaEscena, musicaLarga, fijada, ropa, sinPlanos, acciones, entregas, continua, lejos].map((x) => Rc.recomendar(x)).reduce((a, b) => [...a, ...b], []);
  check('E25) ninguna recomendación toca la producción: una congelada se recomienda igual',
    iguales(Rc.recomendar(congelar(clon(charla))), Rc.recomendar(charla)));
  check('E26) ninguna trae una producción: solo propuestas', todas.every((x) => x.production === undefined && Array.isArray(x.proposals)));
  check('E27) toda propuesta ofrecida se puede aplicar tal cual', [muchas, charla, musicaLarga, fijada, ropa, sinPlanos, acciones, entregas, continua, lejos]
    .every((x) => Rc.recomendar(x).every((r) => r.proposals.every((ops) => O.aplicarOperaciones(x, ops).ok))));
  check('E28) cada recomendación trae código, gravedad, ruta, parámetros y su clave de mensaje',
    todas.every((x) => /^[a-z_]+$/.test(x.code) && ['info', 'warning'].includes(x.severity) && typeof x.path === 'string' && x.messageKey === `filmmaker.recommendation.${x.code}`));
  const rota = clon(p); rota.scenes[0].shots[0].characterIds = ['char-nadie']; rota.scenes.push({ id: 'sc-0003', order: 2, durationSec: 3, shots: [] });
  check('E29) sobre una producción rota no se recomienda nada, aunque tuviera algo que sugerir: primero hay que arreglarla', seguro(() => Rc.recomendar(rota)).length === 0);
  check('E30) la misma producción da las mismas recomendaciones', iguales(Rc.recomendar(entregas), Rc.recomendar(entregas)));
});

/* ═══ F · LOS REQUISITOS ═══════════════════════════════════════════════════ */
console.log('\n── F · Los requisitos: el QUÉ, nunca el CON QUÉ ──');
seccion('F', () => {
  const p = base();
  const rica = clon(p);
  rica.characters[0].element = { elementId: 'elem-luna', version: 2 };
  rica.locations[0].element = { elementId: 'elem-city', version: 1 };
  rica.continuity = { preserve: ['identity.face', 'outfit.clothing'], anchors: ['char-luna'] };
  rica.generation = { preview: 'frames', quality: 'high' };
  rica.editPlan = { subtitles: { enabled: true }, markers: [{ id: 'mk-0001', atShotId: 'sh-0201', label: 'meta' }] };
  rica.exportPlan = { targets: [{ id: 'exp-tiktok', context: 'tiktok', subtitleMode: 'burned' }, { id: 'exp-yt', aspectRatio: '16:9', resolution: '4k', maxDurationSec: 10 }] };
  rica.audio = { narrator: { description: 'grave' }, cues: [
    { id: 'cue-music', kind: 'music', description: 'electrónica', target: { scope: 'production' } },
    { id: 'cue-steps', kind: 'sfx', description: 'zancadas', target: { scope: 'shot', shotId: 'sh-0102' } },
    { id: 'cue-city', kind: 'ambience', description: 'ciudad de noche', target: { scope: 'scenes', sceneIds: ['sc-0002'] } },
  ] };
  rica.scenes[0].shots[0].referenceIds = ['ref-frame'];
  rica.scenes[0].shots[0].advanced = { prompt: 'macro shot of laces, neon rim light' };
  rica.scenes[0].shots[0].description = 'x'.repeat(300) + '😀';
  rica.scenes[0].shots[1].dialogue = [{ id: 'ln-0001', kind: 'dialogue', characterId: 'char-luna', text: 'Vamos allá' }];
  rica.scenes[1].shots[0].continuity = { preserve: ['temporal.previousShot'] };
  rica.scenes.push({ id: 'sc-0003', order: 2, durationSec: 4, description: 'Cartel final', dialogue: [{ id: 'ln-0002', kind: 'narration', text: 'Corre más' }], shots: [] });
  rica.duration = { targetSec: 19 };
  const r = Rq.requisitosDeProduccion(rica);
  const q = r.ok ? r.requirements : undefined;
  check('F1) una producción lista se traduce a requisitos', r.ok, r.ok ? '' : JSON.stringify(r.problems.slice(0, 3)));

  check('F2) la línea de tiempo: cada plano con su inicio y su fin, y la escena sin planos entera',
    iguales(q.timeline.segments.map((s) => [s.unitId, s.startSec, s.endSec]), [['sh-0101', 0, 5], ['sh-0102', 5, 10], ['sh-0201', 10, 15], ['sc-0003', 15, 19]]) && q.timeline.totalSec === 19);
  check('F3) con las escenas y las marcas en su sitio',
    iguales(q.timeline.scenes, [{ sceneId: 'sc-0001', startSec: 0, endSec: 10 }, { sceneId: 'sc-0002', startSec: 10, endSec: 15 }, { sceneId: 'sc-0003', startSec: 15, endSec: 19 }])
    && iguales(q.timeline.markers, [{ markerId: 'mk-0001', atShotId: 'sh-0201', atSec: 10, label: 'meta' }]));
  const porId = new Map(q.shots.map((s) => [s.id, s]));
  check('F4) con un primer fotograma, la capacidad es animar esa imagen', porId.get('shot:sh-0101').capability === 'video.image_to_video' && porId.get('shot:sh-0101').input.firstFrameReferenceId === 'ref-frame');
  check('F5) con imágenes del personaje, generar a partir de ellas', porId.get('shot:sh-0102').capability === 'video.reference' && porId.get('shot:sh-0102').input.references.some((x) => x.referenceId === 'ref-luna'));
  check('F6) sin referencias, desde la descripción', porId.get('shot:sc-0003').capability === 'video.generate' && porId.get('shot:sc-0003').implicit === true);
  check('F7) lo que se dice a cámara va en el plano; la narración, no', porId.get('shot:sh-0102').input.dialogue.length === 1 && porId.get('shot:sc-0003').input.dialogue.length === 0);
  check('F8) el orden: lo que depende de otro va después, y el que continúa el plano anterior también',
    iguales(porId.get('shot:sh-0102').after, ['shot:sh-0101']) && iguales(porId.get('shot:sh-0201').after, []) );
  const cont = clon(rica); delete cont.scenes[0].shots[1].dependsOn; cont.scenes[0].shots[1].continuity = { preserve: ['temporal.previousShot'] };
  const rCont = Rq.requisitosDeProduccion(cont);
  const sinContinuar = clon(cont); delete sinContinuar.scenes[0].shots[1].continuity;
  const rSinContinuar = Rq.requisitosDeProduccion(sinContinuar);
  check('F9) un plano que continúa el anterior lo pide como requisito previo, aunque no dependa de él por `dependsOn`',
    rCont.ok && iguales(rCont.requirements.shots[1].after, ['shot:sh-0101']) && rSinContinuar.ok && iguales(rSinContinuar.requirements.shots[1].after, []));
  check('F10) la calidad y el formato se piden como QUÉ: sin modelo ni proveedor',
    porId.get('shot:sh-0101').quality === 'high' && iguales(porId.get('shot:sh-0101').format, { aspectRatio: '9:16', resolution: '1080p' }));
  check('F11) la intención creativa del requisito es la efectiva, con el encuadre del formato',
    porId.get('shot:sh-0101').input.creative.lighting.type === 'night' && porId.get('shot:sh-0101').input.creative.framing.aspectRatio === '9:16');
  check('F12) la continuidad del requisito es la efectiva, con los ids de la producción',
    iguales(porId.get('shot:sh-0101').continuity, { preserve: ['identity.face', 'outfit.clothing'], anchors: ['char-luna'] }));
  check('F13) el prompt avanzado llega al requisito de SU plano, y a ningún otro', porId.get('shot:sh-0101').input.advancedPrompt === 'macro shot of laces, neon rim light' && q.shots.filter((s) => s.input.advancedPrompt).length === 1);

  const lineas = q.audio.filter((a) => a.id.startsWith('line:'));
  check('F14) cada línea es un requisito de voz, en su tramo', iguales(lineas.map((a) => [a.id, a.capability, a.placement.startSec, a.placement.endSec]), [['line:ln-0001', 'voice.tts', 5, 10], ['line:ln-0002', 'voice.tts', 15, 19]]));
  check('F15) con la voz de quien la dice: la del personaje o la del narrador', lineas[0].input.voice.referenceId === 'ref-voz' && lineas[1].input.voice.description === 'grave');
  check('F16) y la referencia de audio de esa voz', iguales(lineas[0].input.references.map((x) => x.referenceId), ['ref-voz']));
  const sonidos = new Map(q.audio.filter((a) => a.id.startsWith('cue:')).map((a) => [a.id, a]));
  check('F17) música, efectos y ambiente van a capacidades del catálogo, sin inventar ninguna',
    sonidos.get('cue:cue-music').capability === 'music.generate' && sonidos.get('cue:cue-steps').capability === 'audio.sfx' && sonidos.get('cue:cue-city').capability === 'audio.generate');
  check('F18) cada sonido en su tramo: la producción, un plano, una escena',
    iguales([sonidos.get('cue:cue-music').placement.endSec, sonidos.get('cue:cue-steps').placement.startSec, sonidos.get('cue:cue-city').placement.startSec], [19, 5, 10]));
  check('F19) la vista previa, un fotograma por plano porque la producción la pide', q.previews.length === 4 && q.previews[0].forRequirementId === 'shot:sh-0101');
  check('F20) sin pedirla, no hay vista previa', Rq.requisitosDeProduccion(p).requirements.previews.length === 0);

  const ens = new Map(q.assembly.map((a) => [a.id, a]));
  check('F21) varios planos y audio se MONTAN: el montaje recibe todos los requisitos', ens.get('assembly:montage').capability === 'video.montage' && ens.get('assembly:montage').inputs.length === q.shots.length + q.audio.length);
  check('F22) los subtítulos, con las líneas y el idioma de trabajo', ens.get('assembly:subtitles').capability === 'subtitle.generate' && ens.get('assembly:subtitles').output.language === 'es');
  check('F23) grabarlos en la entrega de TikTok es componer', ens.get('assembly:exp-tiktok:subtitles').capability === 'video.compose');
  check('F24) una entrega de 10 s de algo que dura 19 se CORTA, y una horizontal de algo vertical se REENCUADRA',
    ens.get('assembly:exp-yt:cut').capability === 'video.montage' && ens.get('assembly:exp-yt:cut').output.durationSec === 10
    && ens.get('assembly:exp-yt:reframe').capability === 'video.compose' && iguales(ens.get('assembly:exp-yt:reframe').inputs, ['assembly:exp-yt:cut']));
  const vertical = Rq.requisitosDeProduccion({ ...clon(p), format: { aspectRatio: '16:9' }, exportPlan: { targets: [{ id: 'exp-0001', aspectRatio: '9:16' }] } });
  check('F25) pasar a vertical es la capacidad de formato vertical', vertical.ok && vertical.requirements.assembly.some((a) => a.id === 'assembly:exp-0001:reframe' && a.capability === 'video.vertical'));
  check('F26) un reescalado a 4k no está en el catálogo: se declara SIN RESOLVER, no se inventa',
    q.unresolved.length === 1 && q.unresolved[0].code === 'capability_not_in_catalog' && q.unresolved[0].parameters.need === 'video_upscale');
  const sinAudio = Rq.requisitosDeProduccion(p);
  check('F27a) varios planos, aunque no haya audio, se montan', sinAudio.ok && sinAudio.requirements.assembly.some((a) => a.id === 'assembly:montage'));
  const uno = Rq.requisitosDeProduccion({ ...clon(p), scenes: [{ ...clon(p).scenes[1], order: 0 }] });
  check('F27) un solo plano sin audio no necesita montaje', uno.ok && uno.requirements.assembly.length === 0);

  const resumen = new Map(q.capabilities.map((c) => [c.capability, c]));
  check('F28) el resumen por capacidad cuenta y suma: 3 vídeos por referencia, imagen o texto, y sus segundos',
    resumen.get('video.image_to_video').count === 1 && resumen.get('video.image_to_video').totalSec === 5 && resumen.get('video.generate').totalSec === 4);
  check('F29) ordenado por capacidad', iguales(q.capabilities.map((c) => c.capability), [...q.capabilities.map((c) => c.capability)].sort()));
  const ids = [...q.shots, ...q.audio, ...q.previews, ...q.assembly].map((x) => x.capability);
  const delCatalogo = new Set(catalogo.CAPABILITY_CATALOG.map((c) => c.id));
  check('F30) toda capacidad pedida existe en el catálogo del Core', ids.every((c) => delCatalogo.has(c)), ids.filter((c) => !delCatalogo.has(c)).join(','));
  check('F31) y lo que se espera de ella es lo que el catálogo dice que produce',
    [...q.shots, ...q.audio, ...q.previews].every((x) => catalogo.CAPABILITY_CATALOG.find((c) => c.id === x.capability).produces === x.output.modality));

  /* ── Lo que nunca aparece en un requisito ── */
  const claves = clavesDe(q);
  check('F32) ningún requisito lleva proveedor, modelo, semilla, dirección de API ni prompt como clave',
    claves.every((k) => !shotCore.claveProhibidaDeNodo(k)), claves.filter((k) => shotCore.claveProhibidaDeNodo(k)).join(','));
  check('F33) ni precio ni Credits', claves.every((k) => !/price|precio|credit|cost|usd/i.test(k)));

  /* ── Los borradores, contra el Core ── */
  const infra = { projectId: 'proj-0001', ownerAccountId: 'acct-0001', createdAt: 0, updatedAt: 0 };
  check('F34) cada borrador de escena, con lo que pone quien guarda, es un `SceneNode` que el Core acepta tal cual',
    q.drafts.scenes.every((d) => shotCore.validarEscena({ ...d.node, ...infra }).length === 0), JSON.stringify(q.drafts.scenes.map((d) => shotCore.validarEscena({ ...d.node, ...infra }))));
  check('F35) y cada borrador de plano, un `ShotNode`',
    q.drafts.shots.every((d) => shotCore.validarPlano({ ...d.node, ...infra }).length === 0), JSON.stringify(q.drafts.shots.map((d) => shotCore.validarPlano({ ...d.node, ...infra }))));
  check('F36) el prompt avanzado NO llega a ningún `ShotNode`', !JSON.stringify(q.drafts).includes('neon rim light'));
  const b1 = q.drafts.shots.find((d) => d.unitId === 'sh-0101').node;
  check('F37) la continuidad del borrador está en el idioma del Core: anclajes a Elements, con su versión',
    iguales(b1.continuity, { preserve: ['identity.face', 'outfit.clothing'], anchors: [{ elementId: 'elem-luna', version: 2 }] }) && continuidadCore.continuidadValida(b1.continuity));
  check('F38) quién sale, como `ElementBinding` del Core', iguales(b1.elements, [{ elementId: 'elem-luna', version: 2 }]));
  check('F39) la escena sin planos se genera como un plano implícito con id derivado', q.drafts.shots.find((d) => d.unitId === 'sc-0003').node.shotId === 'sc-0003-shot' && q.drafts.shots.find((d) => d.unitId === 'sc-0003').implicit);
  check('F40) `previousShotId` solo dentro de la escena', q.drafts.shots.find((d) => d.unitId === 'sh-0102').node.previousShotId === 'sh-0101' && q.drafts.shots.find((d) => d.unitId === 'sh-0201').node.previousShotId === undefined);
  check('F41) la narrativa del borrador cabe en el límite del Core, sin partir un carácter', b1.narrative.length <= shotCore.MAX_NARRATIVA && b1.narrative.endsWith('…'));
  check('F42) la escena lleva su lugar como Element', iguales(q.drafts.scenes[0].node.location, { elementId: 'elem-city', version: 1 }));

  /* ── Solo lo que está listo ── */
  const sinDuracion = clon(p); delete sinDuracion.scenes[0].shots[0].durationSec;
  const rsd = seguro(() => Rq.requisitosDeProduccion(sinDuracion));
  check('F43) una producción que no está lista no se traduce: devuelve los errores que lo impiden',
    !rsd.ok && rsd.problems.every((x) => x.severity === 'error') && rsd.problems.some((x) => x.code === 'shot_duration_missing'));
  check('F44) sin todas las duraciones no hay línea de tiempo', Rq.lineaDeTiempo(sinDuracion) === undefined);
  const tarjetas = Rq.tarjetasDeStoryboard(sinDuracion);
  check('F45) el storyboard como datos: una tarjeta por plano, con su número humano', iguales(tarjetas.map((t) => [t.unitId, t.sceneNumber, t.shotNumber]), [['sh-0101', 1, 1], ['sh-0102', 1, 2], ['sh-0201', 2, 1]]));
  check('F46) y lo que le falta a cada una, como estado CREATIVO, no de ningún trabajo',
    tarjetas[0].readiness === 'incomplete' && iguales(tarjetas[0].missing, ['durationSec']) && tarjetas[1].readiness === 'complete' && tarjetas[0].previewRequirementId === 'preview:sh-0101');
});

/* ═══ G · LAS FRONTERAS ════════════════════════════════════════════════════ */
console.log('\n── G · Las fronteras: lo que Filmmaker no toca ──');
seccion('G', () => {
  const DIR = 'functions/src/filmmaker';
  const archivos = fs.readdirSync(path.resolve(RAIZ, DIR)).sort();
  check('G1) Filmmaker son cinco archivos, y los cinco son dominio', iguales(archivos, ['modelo.ts', 'operaciones.ts', 'recomendaciones.ts', 'requisitos.ts', 'validacion.ts']));
  const fuentes = archivos.map((f) => [f, leer(`${DIR}/${f}`)]);
  const importaciones = fuentes.reduce((xs, [f, s]) => [...xs, ...[...sinComentarios(s).matchAll(/from '([^']+)'/g)].map((m) => [f, m[1]])], []);
  const PERMITIDAS = ['../core/capability', '../core/content/asset', '../core/continuity', '../core/contracts', '../core/creative', '../core/gateway',
    '../core/language', '../core/registry/capabilities', '../core/shot'];
  check('G2) solo importa del Core, y de estos módulos: ni del motor, ni de los Credits, ni del runtime, ni del Creator, ni del Algorithm Engine',
    importaciones.every(([, m]) => m.startsWith('./') || PERMITIDAS.includes(m)), importaciones.filter(([, m]) => !m.startsWith('./') && !PERMITIDAS.includes(m)).map((x) => x.join('→')).join(' '));
  check('G3) de `core/gateway` solo toma un tipo', /import type \{ ExecutionHints \} from '\.\.\/core\/gateway'/.test(leer(`${DIR}/modelo.ts`)) && importaciones.filter(([, m]) => m === '../core/gateway').length === 1);
  const codigo = fuentes.map(([f, s]) => [f, sinComentarios(s)]);
  check('G4) sin Firebase, sin disco, sin red', codigo.every(([, s]) => !/firebase|firestore|node:fs|node:http|fetch\(|axios|require\(/.test(s)));
  check('G5) sin reloj ni azar: el mismo dato da siempre lo mismo', codigo.every(([, s]) => !/Date\.now\(|new Date\(|Math\.random\(|randomUUID|uuid/.test(s)));
  const PROVEEDORES = ['gemini', 'seedance', 'seedream', 'deepseek', 'openai', 'claude', 'anthropic', 'elevenlabs', 'minimax', 'flux',
    'kling', 'runway', 'veo', 'suno', 'bytedance', 'byteplus', 'replicate', 'fal.ai', 'openrouter', 'huggingface'];
  const nombran = fuentes.filter(([, s]) => PROVEEDORES.some((pr) => new RegExp(`(?<![a-z])${pr.replace('.', '\\.')}(?![a-z])`, 'i').test(s)));
  check('G6) ni un proveedor nombrado, ni en el código ni en los comentarios', nombran.length === 0, nombran.map((x) => x[0]).join(','));
  check('G7) no cobra ni pone precio', codigo.every(([, s]) => !/spendCredits|refundCredits|completeCredits|creditEngine|creditsBalance|priceVideo|usdToCredits|creditCosts|aiPricing/.test(s)));
  check('G8) no llama a ningún adaptador, ni al motor', codigo.every(([, s]) => !/\.run\(\{|engine\.generate|generateVideo|creatorRun|creatorChat|brainChat/.test(s)));
  check('G9) no crea trabajos ni estados de ejecución', codigo.every(([, s]) => !/crearJobEngine|JobStore|'queued'|'running'|'completed'/.test(s)));
  check('G10) y nada se llama «Engine»: Filmmaker no es otro motor', codigo.every(([, s]) => !/(?:const|class|interface|type|function)\s+\w*Engine\b/.test(s)));
  check('G11) producción no lo despliega: `index.ts` no lo exporta', !/filmmaker/i.test(leer('functions/src/index.ts')));
  /*
   * G12 · LO QUE EL COMPILADO CARGA DE FILMMAKER, MEDIDO EN SU GRAFO DE `require`. Desde la conexión de
   * `productions` (ADR-FM-010) el dominio SÍ se carga: `productions` lo usa para validar y aplicar operaciones.
   * Lo que se vigila es que entre SOLO por ahí y SOLO lo que la puerta necesita: `modelo`, `validacion` y
   * `operaciones`. `requisitos` y `recomendaciones` siguen fuera de lo que se despliega, ninguna otra Function lo
   * alcanza y `lib/index.js` no lo nombra. Corregida en F1-C con autorización: la versión anterior miraba solo el
   * texto de `lib/index.js` y ya no decía la verdad.
   */
  const LIB = path.resolve(RAIZ, 'functions/lib');
  const requiresDe = (abs) => [...sinComentarios(fs.readFileSync(abs, 'utf8')).matchAll(/require\(["'](\.{1,2}\/[^"']+)["']\)/g)]
    .map((m) => path.resolve(path.dirname(abs), m[1])).map((d) => (fs.existsSync(`${d}.js`) ? `${d}.js` : path.join(d, 'index.js')))
    .filter((d) => fs.existsSync(d));
  const alcanzables = (sinPasarPor) => {
    const vistos = new Set(); const cola = [path.join(LIB, 'index.js')];
    while (cola.length) {
      const f = cola.shift();
      if (vistos.has(f) || f === sinPasarPor) continue;
      vistos.add(f); cola.push(...requiresDe(f));
    }
    return [...vistos].map((f) => path.relative(LIB, f).split(path.sep).join('/'));
  };
  const deFilmmaker = (xs) => xs.filter((r) => r.startsWith('filmmaker/')).sort();
  const cargados = deFilmmaker(alcanzables());
  const sinProductions = deFilmmaker(alcanzables(path.join(LIB, 'productions/puerta.js')));
  check('G12) el compilado que se despliega carga el dominio SOLO a través de `productions`, y solo `modelo`, `validacion` y `operaciones`: ni `requisitos` ni `recomendaciones`, ninguna otra Function lo alcanza y `lib/index.js` no lo nombra',
    iguales(cargados, ['filmmaker/modelo.js', 'filmmaker/operaciones.js', 'filmmaker/validacion.js'])
    && sinProductions.length === 0 && !/filmmaker/.test(leer('functions/lib/index.js')),
    `carga [${cargados.join(', ')}] · sin productions [${sinProductions.join(', ') || 'nada'}]`);
  check('G13) el contrato del Algorithm Engine sigue en 1.12, y los del Core, donde estaban',
    contratos.ALGORITHM_CONTRACT_VERSION === '1.12' && contratos.SHOT_CONTRACT_VERSION === '1.0' && contratos.CONTINUITY_CONTRACT_VERSION === '1.0'
    && contratos.CREATIVE_PARAMETERS_VERSION === 1 && contratos.ELEMENT_CONTRACT_VERSION === '1.0');
  check('G14) `ShotNode` sigue prohibiendo prompt, semilla, modelo y proveedor',
    ['prompt', 'seed', 'model', 'provider', 'negativePrompt'].every((k) => shotCore.claveProhibidaDeNodo(k))
    && shotCore.validarPlano({ contract: '1.0', shotId: 'sh-0001', projectId: 'proj-0001', version: 1, order: 0, state: 'draft', ownerAccountId: 'a', createdAt: 0, updatedAt: 0, prompt: 'x' })
      .some((x) => x.field === 'prompt' && x.reason === 'forbidden_key'));
  check('G15) la regla de las claves prohibidas es la del Core, importada, no una copia', /import \{ claveProhibidaDeNodo \} from '\.\.\/core\/shot'/.test(leer(`${DIR}/validacion.ts`)) && !/PROHIBIDAS\s*=/.test(codigo.map(([, s]) => s).join('\n')));
  check('G16) el vocabulario de cámara no se duplica: se usa el del Core', codigo.every(([, s]) => !/'dolly_in'|'close_up'|'rule_of_thirds'|'golden_hour'/.test(s.replace(/import[^;]+;/g, ''))));
  check('G17) esta suite está en la cadena de `npm test`', /filmmaker-modelo\.test\.mjs/.test(leer('functions/package.json')));
  const doc = leer('docs/FILMMAKER.md');
  check('G18) `docs/FILMMAKER.md` dice sus límites: sin tocar 1.12, ni S2, ni `ShotNode`, ni proveedores, ni Credits, ni el Job Engine',
    ['1.12', 'S2', 'ShotNode', 'proveedor', 'Credits', 'Job Engine', 'Brain', 'Planner'].every((x) => doc.includes(x)));
  check('G19) y deja D1–D14 como decisiones pendientes', Array.from({ length: 14 }, (_, i) => `D${i + 1}`).every((d) => doc.includes(d)) && /pendiente/i.test(doc));
});

/* ═══ H · DETERMINISMO ═════════════════════════════════════════════════════ */
console.log('\n── H · Determinismo ──');
seccion('H', () => {
  const p = base();
  const hacer = () => {
    const a = O.aplicarOperaciones(p, [
      { op: 'duplicate_scene', sceneId: 'sc-0001' },
      { op: 'split_shot', shotId: 'sh-0201', atSec: 2.5 },
      { op: 'change_movement', target: { scope: 'production' }, movement: 'tracking', speed: 'fast' },
    ]);
    return { a, v: validar(a.production, 'ready'), r: Rc.recomendar(a.production), q: Rq.requisitosDeProduccion(a.production) };
  };
  const [x, y] = [hacer(), hacer()];
  check('H1) las mismas operaciones sobre la misma producción dan la misma producción', iguales(x.a, y.a));
  check('H2) la misma validación', iguales(x.v, y.v));
  check('H3) las mismas recomendaciones', iguales(x.r, y.r));
  check('H4) y los mismos requisitos', iguales(x.q, y.q));
  check('H5) y todo es JSON: se puede guardar y leer sin perder nada', iguales(JSON.parse(JSON.stringify(x.q)), x.q) && iguales(JSON.parse(JSON.stringify(x.a.production)), x.a.production));
});

console.log(failures ? `\n✘ ${failures} fallos` : `\n✔ Filmmaker F1-A: ${n} comprobaciones, el dominio de una producción sin ejecutar nada`);
process.exit(failures ? 1 : 0);
