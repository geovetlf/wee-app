/**
 * FILMMAKER ENGINE · EL LENGUAJE COMPLETO DE LOS CAMBIOS.
 *
 * F1-A dejó dicho lo que su lenguaje no tenía —«añadir, editar o quitar
 * personajes, lugares, objetos y referencias; cambiar la dirección creativa de
 * la producción; cambiar una transición; mover un plano a otra escena»— y que
 * entraría cuando una fase lo necesitara. Lo necesitan F2 (Weë Brain habla en
 * operaciones), F3 (fichas y continuidad) y F5 (montaje). Aquí se demuestra:
 *
 *   A · Las fichas: añadir, cambiar campo a campo y quitar, con cascada explícita
 *   B · La intención y la dirección de toda la producción
 *   C · Escenas y planos: lo que no tenía operación, y cambiar un plano de escena
 *   D · El montaje: pistas, subtítulos y marcas
 *   E · Lo que no cambia: el orden del lenguaje, la forma, el determinismo y la
 *       entrada intacta
 *
 * Sin red, sin Firestore, sin proveedores, sin Credits, sin reloj. Usa el
 * compilado: `npm run build` antes de `npm test`.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as A from './motor-filmmaker-alcance.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const require = createRequire(import.meta.url);
const lib = (p) => require(path.resolve(RAIZ, 'functions/lib', p));
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const seccion = (letra, fn) => {
  try { fn(); } catch (e) { check(`${letra}) la sección termina sin lanzar`, false, String(e && e.stack ? e.stack : e).split('\n').slice(0, 2).join(' · ')); }
};

const M = lib('filmmaker/modelo.js');
const V = lib('filmmaker/validacion.js');
const O = lib('filmmaker/operaciones.js');

const clon = (x) => JSON.parse(JSON.stringify(x));
const congelar = (x) => { if (x && typeof x === 'object') { Object.values(x).forEach(congelar); Object.freeze(x); } return x; };
const iguales = (a, b) => M.canonico(a) === M.canonico(b);
const op = (p, o) => O.aplicarOperacion(p, o);
const ops = (p, os) => O.aplicarOperaciones(p, os);
/** El primer problema de un resultado fallido: su código, su ruta y su motivo. */
const fallo = (r) => (r.ok ? null : { code: r.problems[0].code, path: r.problems[0].path, reason: r.problems[0].parameters.reason, p: r.problems[0].parameters });
const valida = (p) => V.integridad(p).length === 0;
const sc = (p, id) => p.scenes.find((s) => s.id === id);
const sh = (p, id) => p.scenes.flatMap((s) => s.shots).find((x) => x.id === id);

/** La producción de referencia de F1-A, con una línea de Luna y una relación de Sol con ella. */
const base = () => clon({
  ...M.produccionVacia({ title: 'Anuncio de zapatilla', aspectRatio: '9:16', resolution: '1080p' }),
  ...M.configuracionDePreset('tiktok'),
  intent: { objective: 'Vender la zapatilla nueva', productionType: 'ad', requestedDurationSec: 15, freeText: 'Un anuncio vertical de 15 segundos' },
  creativeDirection: { visualStyle: 'cinematográfico', pacing: 'fast', cinematography: { version: 1, lighting: { type: 'night' } } },
  characters: [
    { id: 'char-luna', name: 'Luna', appearance: { wardrobe: { description: 'chaqueta amarilla' } }, referenceIds: ['ref-luna'], voice: { description: 'cálida', referenceId: 'ref-voz' } },
    { id: 'char-sol', name: 'Sol', relationships: [{ characterId: 'char-luna', kind: 'friend' }] },
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
        { id: 'sh-0101', order: 0, durationSec: 5, description: 'Luna se ata la zapatilla', objectIds: ['obj-shoe'], subject: { objectId: 'obj-shoe', focus: 'detail' } },
        { id: 'sh-0102', order: 1, durationSec: 5, description: 'Luna sale corriendo', dependsOn: ['sh-0101'], dialogue: [{ id: 'ln-0001', kind: 'dialogue', characterId: 'char-luna', text: '¡Vamos!' }] },
      ],
    },
    {
      id: 'sc-0002', order: 1, title: 'Llegada', locationId: 'loc-city', timeOfDay: 'night', characterIds: ['char-luna'],
      shots: [{ id: 'sh-0201', order: 0, durationSec: 5, description: 'Luna cruza la meta' }],
    },
  ],
});

seccion('0', () => {
  check('0) la producción de referencia es íntegra', valida(base()), JSON.stringify(V.integridad(base()).map((x) => `${x.code}@${x.path}`)));
});

/* ═══ A · LAS FICHAS ═══════════════════════════════════════════════════════ */
console.log('\n── A · Las fichas: añadir, cambiar campo a campo y quitar ──');
seccion('A', () => {
  const p = base();
  const nuevo = op(p, { op: 'add_character', character: { id: 'char-mar', name: 'Mar', identityDescription: 'la entrenadora' }, atIndex: 1 });
  check('A1) añadir un personaje lo pone donde se pide, sin tocar lo demás y sin nada pendiente',
    nuevo.ok && nuevo.production.characters.map((c) => c.id).join() === 'char-luna,char-mar,char-sol'
    && nuevo.pending.shots.length === 0 && nuevo.production.metadata.revision === 1);
  check('A2) un id que ya existe en la producción —de lo que sea— no entra',
    fallo(op(p, { op: 'add_character', character: { id: 'sc-0001', name: 'Choque' } }))?.reason === 'id_taken');
  check('A3) una ficha rota tampoco: sin nombre, o con una clave que el lenguaje no conoce',
    fallo(op(p, { op: 'add_character', character: { id: 'char-x' } }))?.code === 'operation_would_break_integrity'
    && fallo(op(p, { op: 'add_character', character: { id: 'char-y', name: 'Y', model: 'z' } }))?.code === 'operation_would_break_integrity');

  const ropa = op(p, { op: 'update_character', characterId: 'char-luna', changes: { appearance: { wardrobe: { description: 'chaqueta roja' } } } });
  check('A4) cambiar la ropa de Luna deja pendientes justo los planos en los que sale',
    ropa.ok && ropa.pending.shots.join() === 'sh-0101,sh-0102,sh-0201'
    && M.canonico(ropa.production.characters[0].appearance) === M.canonico({ wardrobe: { description: 'chaqueta roja' } }));
  const otro = op(p, { op: 'update_character', characterId: 'char-sol', changes: { identityDescription: 'el rival' } });
  check('A5) y cambiar a Sol, que no sale en ningún plano, no deja nada pendiente', otro.ok && otro.pending.shots.length === 0 && otro.pending.audio.length === 0);
  const voz = op(p, { op: 'update_character', characterId: 'char-luna', changes: { voice: { description: 'grave' } } });
  check('A6) la voz suena y no se ve: cambiarla deja pendiente su línea y ningún plano',
    voz.ok && voz.pending.shots.length === 0 && voz.pending.audio.join() === 'ln-0001');
  check('A7) un cambio vacío, el id, una clave prohibida o una desconocida no son cambios',
    fallo(op(p, { op: 'update_character', characterId: 'char-luna', changes: {} }))?.reason === 'nothing_to_change'
    && fallo(op(p, { op: 'update_character', characterId: 'char-luna', changes: { id: 'char-otra' } }))?.reason === 'not_editable'
    && fallo(op(p, { op: 'update_character', characterId: 'char-luna', changes: { prompt: 'x' } }))?.reason === 'forbidden_field'
    && fallo(op(p, { op: 'update_character', characterId: 'char-luna', changes: { edad: 30 } }))?.reason === 'unknown_field');
  check('A8) quitar el nombre rompería la ficha, así que no se aplica; un personaje que no existe se dice',
    fallo(op(p, { op: 'update_character', characterId: 'char-luna', changes: { name: null } }))?.code === 'operation_would_break_integrity'
    && fallo(op(p, { op: 'update_character', characterId: 'char-nadie', changes: { name: 'N' } }))?.code === 'operation_target_missing');

  const enUso = op(p, { op: 'remove_character', characterId: 'char-luna' });
  const rutas = fallo(enUso)?.p.paths ?? [];
  check('A9) quitar a Luna, que se usa, se para y dice dónde: el reparto de las escenas, su línea y la relación de Sol',
    fallo(enUso)?.code === 'operation_blocked' && fallo(enUso)?.reason === 'in_use'
    && rutas.includes('scenes.sc-0001.characterIds') && rutas.includes('scenes.sc-0002.characterIds')
    && rutas.includes('scenes.sc-0001.shots.sh-0102.dialogue.ln-0001') && rutas.includes('characters.char-sol.relationships.0'), rutas.join(' · '));
  const cascada = op(p, { op: 'remove_character', characterId: 'char-luna', cascade: true });
  const q = cascada.ok ? cascada.production : null;
  check('A10) con cascada se va con todo lo suyo: el reparto, la línea que decía y la relación, y nada queda colgando',
    !!q && !q.characters.some((c) => c.id === 'char-luna') && sc(q, 'sc-0001').characterIds === undefined
    && sh(q, 'sh-0102').dialogue === undefined && q.characters.find((c) => c.id === 'char-sol').relationships === undefined && valida(q));
  check('A11) y lo pendiente lo dice: los planos en los que salía, y la línea quitada',
    cascada.ok && cascada.pending.shots.join() === 'sh-0101,sh-0102,sh-0201' && cascada.pending.removed.includes('ln-0001'));
  const libre = op(p, { op: 'remove_character', characterId: 'char-mar' });
  check('A12) quitar lo que no existe se dice; quitar a quien nadie usa no necesita cascada',
    fallo(libre)?.code === 'operation_target_missing'
    && op(op(p, { op: 'remove_character', characterId: 'char-sol' }).production, { op: 'add_character', character: { id: 'char-sol', name: 'Sol' } }).ok);

  const lugar = op(p, { op: 'add_location', location: { id: 'loc-beach', name: 'Playa', setting: 'exterior' } });
  check('A13) los lugares: añadir, y cambiar el que usan las dos escenas deja pendiente todo lo que pasa allí',
    lugar.ok && lugar.production.locations.length === 2
    && op(p, { op: 'update_location', locationId: 'loc-city', changes: { description: 'lluviosa' } }).pending.shots.join() === 'sh-0101,sh-0102,sh-0201');
  const sinLugar = op(p, { op: 'remove_location', locationId: 'loc-city', cascade: true });
  check('A14) quitar un lugar en uso se para; con cascada las escenas se quedan sin lugar',
    fallo(op(p, { op: 'remove_location', locationId: 'loc-city' }))?.reason === 'in_use'
    && sinLugar.ok && p.scenes.every((s) => sc(sinLugar.production, s.id).locationId === undefined) && valida(sinLugar.production));

  const sinCosa = op(p, { op: 'remove_object', objectId: 'obj-shoe', cascade: true });
  check('A15) quitar la zapatilla con cascada la saca del plano y de su sujeto, que conserva el resto',
    sinCosa.ok && sh(sinCosa.production, 'sh-0101').objectIds === undefined
    && M.canonico(sh(sinCosa.production, 'sh-0101').subject) === M.canonico({ focus: 'detail' }) && valida(sinCosa.production));
  const soloCosa = clon(p);
  soloCosa.scenes[1].shots[0].subject = { objectId: 'obj-shoe' };
  const sinSujeto = op(soloCosa, { op: 'remove_object', objectId: 'obj-shoe', cascade: true });
  check('A15b) un sujeto que solo era la zapatilla se va entero: vacío no diría nada',
    sinSujeto.ok && sh(sinSujeto.production, 'sh-0201').subject === undefined && valida(sinSujeto.production));
  check('A16) cambiar un objeto a un tipo que no existe no se guarda',
    fallo(op(p, { op: 'update_object', objectId: 'obj-shoe', changes: { kind: 'nave' } }))?.code === 'operation_would_break_integrity');

  const ref = op(p, { op: 'add_reference', reference: { id: 'ref-estilo', kind: 'image', role: 'style', assetId: 'asset-estilo' } });
  check('A17) una referencia nueva entra por su id de material, nunca por una dirección web',
    ref.ok && ref.production.references.some((r) => r.id === 'ref-estilo')
    && fallo(op(p, { op: 'add_reference', reference: { id: 'ref-web', kind: 'image', url: 'https://x.y/z.png' } }))?.code === 'operation_would_break_integrity');
  const sinVoz = op(p, { op: 'remove_reference', referenceId: 'ref-voz', cascade: true });
  check('A18) quitar la referencia de voz con cascada suelta la voz de Luna pero conserva su descripción',
    fallo(op(p, { op: 'remove_reference', referenceId: 'ref-voz' }))?.reason === 'in_use'
    && sinVoz.ok && M.canonico(sinVoz.production.characters[0].voice) === M.canonico({ description: 'cálida' }) && valida(sinVoz.production));
  check('A19) una referencia sin uso se quita sin más, y su material se puede cambiar',
    op(p, { op: 'remove_reference', referenceId: 'ref-frame' }).ok
    && op(p, { op: 'update_reference', referenceId: 'ref-frame', changes: { assetId: 'asset-frame-2' } }).production.references[2].assetId === 'asset-frame-2');
});

/* ═══ B · LA INTENCIÓN Y LA DIRECCIÓN ══════════════════════════════════════ */
console.log('\n── B · La intención y la dirección de toda la producción ──');
seccion('B', () => {
  const p = base();
  check('B1) cambiar el título es solo cambiar el título; vacío no se guarda',
    op(p, { op: 'rename_production', title: 'Carrera nocturna' }).production.title === 'Carrera nocturna'
    && fallo(op(p, { op: 'rename_production', title: '' }))?.code === 'operation_would_break_integrity'
    && fallo(op(p, { op: 'rename_production', title: 7 }))?.reason === 'not_text');
  const intencion = op(p, { op: 'change_intent', changes: { audience: 'corredores', freeText: null } });
  check('B2) la intención se cambia campo a campo, y `null` quita',
    intencion.ok && intencion.production.intent.audience === 'corredores' && intencion.production.intent.freeText === undefined
    && intencion.production.intent.objective === 'Vender la zapatilla nueva');
  check('B3) un tipo de producción que no existe no entra',
    fallo(op(p, { op: 'change_intent', changes: { productionType: 'telenovela' } }))?.code === 'operation_would_break_integrity');
  const direccion = op(p, { op: 'change_direction', changes: { tone: 'épico', color: { palette: ['#FFCC00', '#111111'] } } });
  check('B4) la dirección: tono y color, y lo pendiente es todo, porque todo se ve distinto',
    direccion.ok && direccion.production.creativeDirection.tone === 'épico' && direccion.pending.shots.length === 3);
  check('B5) el estilo, el ánimo y la cinematografía tienen su operación: aquí se dice',
    fallo(op(p, { op: 'change_direction', changes: { visualStyle: 'anime' } }))?.reason === 'use_dedicated_operation'
    && fallo(op(p, { op: 'change_direction', changes: { mood: 'tenso' } }))?.reason === 'use_dedicated_operation'
    && fallo(op(p, { op: 'change_direction', changes: { cinematography: {} } }))?.reason === 'use_dedicated_operation');
  const animoPlano = op(p, { op: 'change_mood', target: { scope: 'shot', shotId: 'sh-0201' }, mood: 'eufórico' }).production;
  const animoTodo = op(animoPlano, { op: 'change_mood', target: { scope: 'production' }, mood: 'tenso' });
  check('B6) el ánimo, como el estilo: en la producción vale para todo y quita lo que lo anulaba más abajo',
    sh(animoPlano, 'sh-0201').visual.mood === 'eufórico' && animoTodo.ok
    && animoTodo.production.creativeDirection.mood === 'tenso' && sh(animoTodo.production, 'sh-0201').visual === undefined);
  const fundido = op(p, { op: 'change_transition', target: { scope: 'shot', shotId: 'sh-0101' }, transition: 'dissolve' });
  check('B7) una transición es intención creativa del Core, y cambia el montaje',
    fundido.ok && fundido.timelineChanged === true
    && M.creativoEfectivo(fundido.production, fundido.production.scenes[0], sh(fundido.production, 'sh-0101')).transition?.type === 'dissolve');
  check('B8) una transición que el Core no tiene no se inventa',
    fallo(op(p, { op: 'change_transition', target: { scope: 'shot', shotId: 'sh-0101' }, transition: 'estrella' }))?.reason === 'invalid_creative');
  const cont = op(p, { op: 'change_continuity', target: { scope: 'scene', sceneId: 'sc-0002' }, continuity: { preserve: ['identity.face'], strength: 'strict' } });
  check('B9) la continuidad se pone donde se pide y `null` la quita',
    cont.ok && sc(cont.production, 'sc-0002').continuity?.strength === 'strict'
    && op(cont.production, { op: 'change_continuity', target: { scope: 'scene', sceneId: 'sc-0002' }, continuity: null }).production.scenes[1].continuity === undefined);
  const calidad = op(p, { op: 'change_generation', target: { scope: 'shot', shotId: 'sh-0101' }, quality: 'high' });
  check('B10) la calidad preferida, en la producción o en un plano; la vista previa solo en la producción',
    calidad.ok && sh(calidad.production, 'sh-0101').generation?.quality === 'high'
    && op(p, { op: 'change_generation', target: { scope: 'production' }, preview: 'frames' }).production.generation.preview === 'frames'
    && fallo(op(p, { op: 'change_generation', target: { scope: 'shot', shotId: 'sh-0101' }, preview: 'frames' }))?.reason === 'production_wide'
    && fallo(op(p, { op: 'change_generation', target: { scope: 'production' } }))?.reason === 'nothing_to_change');
});

/* ═══ C · ESCENAS Y PLANOS ═════════════════════════════════════════════════ */
console.log('\n── C · Escenas y planos: lo que no tenía operación, y cambiar un plano de escena ──');
seccion('C', () => {
  const p = base();
  const escena = op(p, { op: 'update_scene', sceneId: 'sc-0002', changes: { narrativePurpose: 'resolution', actions: ['Luna levanta los brazos'] } });
  check('C1) una escena: su propósito y sus acciones', escena.ok && sc(escena.production, 'sc-0002').narrativePurpose === 'resolution');
  check('C2) lo que tiene su operación, o es su identidad, no se cambia aquí',
    fallo(op(p, { op: 'update_scene', sceneId: 'sc-0002', changes: { title: 'Otra' } }))?.reason === 'use_dedicated_operation'
    && fallo(op(p, { op: 'update_scene', sceneId: 'sc-0002', changes: { order: 0 } }))?.reason === 'not_editable');
  const plano = op(p, { op: 'update_shot', shotId: 'sh-0201', changes: { referenceIds: ['ref-frame'], audio: { withSound: true } } });
  check('C3) un plano: sus referencias y su sonido, y queda pendiente solo él',
    plano.ok && sh(plano.production, 'sh-0201').referenceIds[0] === 'ref-frame' && plano.pending.shots.join() === 'sh-0201');
  check('C4) el prompt avanzado se guarda, pero cambiarlo es de F6; un ciclo de dependencias no se guarda',
    fallo(op(p, { op: 'update_shot', shotId: 'sh-0201', changes: { advanced: { prompt: 'x' } } }))?.reason === 'not_editable_yet'
    && fallo(op(p, { op: 'update_shot', shotId: 'sh-0101', changes: { dependsOn: ['sh-0102'] } }))?.code === 'operation_would_break_integrity');
  const movido = op(p, { op: 'move_shot', shotId: 'sh-0102', toSceneId: 'sc-0002', atOrder: 0 });
  const m = movido.ok ? movido.production : null;
  check('C5) mover un plano a otra escena: se va con lo suyo y las dos escenas se renumeran',
    !!m && sc(m, 'sc-0001').shots.map((x) => `${x.id}:${x.order}`).join() === 'sh-0101:0'
    && sc(m, 'sc-0002').shots.map((x) => `${x.id}:${x.order}`).join() === 'sh-0102:0,sh-0201:1'
    && sh(m, 'sh-0102').dialogue[0].id === 'ln-0001' && sh(m, 'sh-0102').dependsOn[0] === 'sh-0101' && valida(m));
  check('C6) y el montaje cambió', movido.ok && movido.timelineChanged === true);
  check('C7) a la misma escena es reordenar, no mover; fuera de rango o a una escena que no existe, no',
    fallo(op(p, { op: 'move_shot', shotId: 'sh-0102', toSceneId: 'sc-0001' }))?.reason === 'same_scene'
    && fallo(op(p, { op: 'move_shot', shotId: 'sh-0102', toSceneId: 'sc-0002', atOrder: 5 }))?.reason === 'out_of_range'
    && fallo(op(p, { op: 'move_shot', shotId: 'sh-0102', toSceneId: 'sc-9999' }))?.code === 'operation_target_missing');
  const declarada = clon(p);
  declarada.scenes[0].durationSec = 10;
  declarada.scenes[1].durationSec = 5;
  const conDuracion = op(declarada, { op: 'move_shot', shotId: 'sh-0102', toSceneId: 'sc-0002' });
  check('C8) si las escenas declaran su duración, las dos se ponen al día',
    conDuracion.ok && sc(conDuracion.production, 'sc-0001').durationSec === 5 && sc(conDuracion.production, 'sc-0002').durationSec === 10);
});

/* ═══ D · EL MONTAJE ═══════════════════════════════════════════════════════ */
console.log('\n── D · El montaje: pistas, subtítulos y marcas ──');
seccion('D', () => {
  const p = base();
  const musica = op(p, { op: 'change_edit_plan', change: { action: 'set_track', track: { kind: 'music', muted: true } } });
  const otra = musica.ok ? op(musica.production, { op: 'change_edit_plan', change: { action: 'set_track', track: { kind: 'music', volume: 0.4 } } }) : null;
  check('D1) una pista por clase: ponerla otra vez la sustituye',
    musica.ok && otra?.ok && otra.production.editPlan.tracks.length === 1 && otra.production.editPlan.tracks[0].volume === 0.4 && otra.production.editPlan.tracks[0].muted === undefined);
  check('D2) el montaje no cambia lo que se genera: nada pendiente', musica.ok && musica.pending.shots.length === 0 && musica.pending.audio.length === 0);
  check('D3) quitar una pista que no está se dice; una clase de pista que no existe, también',
    fallo(op(p, { op: 'change_edit_plan', change: { action: 'remove_track', kind: 'music' } }))?.code === 'operation_target_missing'
    && fallo(op(p, { op: 'change_edit_plan', change: { action: 'remove_track', kind: 'banda' } }))?.reason === 'not_in_vocabulary'
    && otra?.ok && op(otra.production, { op: 'change_edit_plan', change: { action: 'remove_track', kind: 'music' } }).production.editPlan.tracks === undefined);
  const subs = op(p, { op: 'change_edit_plan', change: { action: 'set_subtitles', subtitles: { enabled: true, position: 'bottom', style: 'boxed' } } });
  check('D4) los subtítulos se ponen y se quitan',
    subs.ok && subs.production.editPlan.subtitles.style === 'boxed'
    && op(subs.production, { op: 'change_edit_plan', change: { action: 'set_subtitles', subtitles: null } }).production.editPlan.subtitles === undefined);
  const marca = op(p, { op: 'change_edit_plan', change: { action: 'upsert_marker', marker: { id: 'mk-0001', atShotId: 'sh-0201', label: 'Logo' } } });
  check('D5) una marca va sobre un plano que existe, y se quita por su id',
    marca.ok && marca.production.editPlan.markers[0].atShotId === 'sh-0201'
    && fallo(op(p, { op: 'change_edit_plan', change: { action: 'upsert_marker', marker: { id: 'mk-0002', atShotId: 'sh-nada' } } }))?.code === 'operation_would_break_integrity'
    && op(marca.production, { op: 'change_edit_plan', change: { action: 'remove_marker', markerId: 'mk-0001' } }).production.editPlan.markers === undefined);
});

/* ═══ E · LO QUE NO CAMBIA ═════════════════════════════════════════════════ */
console.log('\n── E · Lo que no cambia ──');
seccion('E', () => {
  const ANTES = ['add_scene', 'remove_scene', 'reorder_scene', 'duplicate_scene', 'split_scene', 'merge_scenes', 'add_shot', 'remove_shot',
    'reorder_shot', 'duplicate_shot', 'split_shot', 'merge_shots', 'extend_duration', 'shorten_duration', 'change_target_duration', 'change_camera',
    'change_movement', 'change_lighting', 'change_style', 'change_weather', 'change_time_of_day', 'change_location', 'change_subject', 'edit_text',
    'replace_character', 'set_character_state', 'replace_reference', 'add_dialogue', 'change_dialogue', 'remove_dialogue', 'modify_audio',
    'change_format', 'change_export'];
  const NUEVAS = ['add_character', 'update_character', 'remove_character', 'add_location', 'update_location', 'remove_location', 'add_object',
    'update_object', 'remove_object', 'add_reference', 'update_reference', 'remove_reference', 'rename_production', 'change_intent',
    'change_direction', 'change_mood', 'change_transition', 'change_continuity', 'change_generation', 'update_scene', 'update_shot', 'move_shot',
    'change_edit_plan'];
  check('E1) las 33 de F1-A siguen en su sitio y en su orden, y detrás van las 23 nuevas: 56',
    iguales(O.OPERACIONES, [...ANTES, ...NUEVAS]), `${O.OPERACIONES.length}`);
  check('E2) la forma de cada una sigue cerrada: un campo de más o uno prohibido no pasan',
    fallo(op(base(), { op: 'rename_production', title: 'T', extra: 1 }))?.reason === 'unknown_field'
    && fallo(op(base(), { op: 'change_intent', changes: { audience: 'x' }, seed: 3 }))?.reason === 'forbidden_field');
  const lote = [
    { op: 'add_character', character: { id: 'char-mar', name: 'Mar' } },
    { op: 'update_scene', sceneId: 'sc-0002', changes: { characterIds: ['char-luna', 'char-mar'] } },
    { op: 'move_shot', shotId: 'sh-0102', toSceneId: 'sc-0002' },
    { op: 'change_transition', target: { scope: 'production' }, transition: 'fade' },
  ];
  const a = ops(base(), lote);
  const b = ops(base(), lote);
  check('E3) determinista: el mismo lote sobre la misma producción da lo mismo, pendiente incluido',
    a.ok && b.ok && iguales(a.production, b.production) && iguales(a.pending, b.pending) && a.applied === 4);
  const congelada = congelar(base());
  const r = ops(congelada, lote);
  check('E4) la producción de entrada no se toca', r.ok && congelada.characters.length === 2);
  check('E5) todas o ninguna: si la última falla, no se aplica nada',
    fallo(ops(base(), [...lote, { op: 'remove_character', characterId: 'char-luna' }]))?.p.index === 4);
  const fuente = leer('functions/src/filmmaker/operaciones.ts');
  check('E6) sin red, sin proveedores, sin Credits ni reloj en el lenguaje',
    !/fetch\(|firebase|Date\.now|Math\.random|spendCredits|creditsBalance/.test(fuente.replace(/\/\*[\s\S]*?\*\//g, '')));
  check('E7) la app usa el mismo lenguaje: el espejo trae las 56', (() => {
    const espejo = leer('services/filmmaker/espejo/filmmaker/operaciones.ts');
    return NUEVAS.every((x) => espejo.includes(`case '${x}'`));
  })());
  check('E8) esta suite está en la cadena de `npm test`', /filmmaker-lenguaje\.test\.mjs/.test(leer('functions/package.json')));
  /*
   * Las vallas de las fases anteriores dejan pasar lo que el motor dice que toca,
   * y nada más. El dinero no puede estar en esa lista: el Credit Engine,
   * creditCosts, el Financial Core y el Router siguen siendo de otro encargo.
   */
  check('E9) lo que el motor tiene dicho que toca no incluye nada del dinero',
    A.TOCADOS_POR_EL_MOTOR.length > 0 && !A.TOCADOS_POR_EL_MOTOR.some((f) => A.DINERO.some((re) => re.test(f)))
    && A.TOCADOS_POR_EL_MOTOR.every((f) => fs.existsSync(path.resolve(RAIZ, f))), A.TOCADOS_POR_EL_MOTOR.join(' · '));
});

console.log(failures ? `\n${failures} comprobación(es) fallaron` : `\n✔ El lenguaje de Filmmaker, completo: fichas, intención, dirección, escenas, planos y montaje (${n} comprobaciones)`);
process.exit(failures ? 1 : 0);
