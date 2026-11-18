/**
 * CONVERGENCIA · EL UNIVERSO SE EDITA DESPUÉS DE CREAR, Y LA D1 VIAJA POR OPERACIONES.
 * Las fichas (personajes, lugares, objetos, referencias), `update_scene`, `update_shot` (con `revision`) y `move_shot`.
 * Ligera: se cargan las FUENTES; sin red ni Firebase.      node functions/test/filmmaker-ops-universo.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import Module from 'node:module';

const require = createRequire(import.meta.url);
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ts = createRequire(path.join(RAIZ, 'package.json'))('typescript');
const SRC = path.join(RAIZ, 'functions', 'src');
let fallos = 0; let n = 0;
const check = (nombre, cond, extra = '') => { n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${nombre}` + (extra ? ` — ${extra}` : '')); if (!cond) fallos++; };
const resolver = (rel, p) => {
  const base = path.posix.join(path.posix.dirname(rel), p);
  return fs.existsSync(path.join(SRC, base, 'index.ts')) ? `${base}/index.ts` : `${base}.ts`;
};
const cargar = (rel, cache = new Map()) => {
  if (cache.has(rel)) return cache.get(rel).exports;
  const js = ts.transpileModule(fs.readFileSync(path.join(SRC, rel), 'utf8'), { compilerOptions: { target: 'ES2022', module: 'commonjs' } }).outputText;
  const m = new Module(rel); m.filename = path.join(SRC, rel); m.paths = []; cache.set(rel, m);
  m.require = (p) => (p.startsWith('.') ? cargar(resolver(rel, p), cache) : require(p));
  m._compile(js, m.filename); return m.exports;
};
const modelo = cargar('filmmaker/modelo.ts');
const validacion = cargar('filmmaker/validacion.ts');
const ops = cargar('filmmaker/operaciones.ts');

const base = () => ({
  ...modelo.produccionVacia({ title: 'Mi película', aspectRatio: '16:9', id: 'prod-0001' }),
  scenes: [
    { id: 'sc01', order: 0, title: 'Uno', shots: [{ id: 'sh01', order: 0, durationSec: 5, description: 'Un faro' }, { id: 'sh02', order: 1, durationSec: 5, description: 'El mar' }] },
    { id: 'sc02', order: 1, title: 'Dos', shots: [{ id: 'sh03', order: 0, durationSec: 5, description: 'Un puerto' }] },
  ],
});
const aplica = (prod, lista) => ops.aplicarOperaciones(prod, lista);
const ok = (r) => r.ok === true;
const codes = (r) => (r.problems || []).map((x) => `${x.code}:${x.parameters?.reason ?? ''}`).join(',');

console.log('\n── Las fichas ──');
let p = base();
let r = aplica(p, [{ op: 'add_character', character: { id: 'ana1', name: 'Ana' } }]);
check('1) añadir un personaje', ok(r) && r.production.characters.some((c) => c.id === 'ana1'), codes(r));
p = r.production;
r = aplica(p, [{ op: 'update_character', characterId: 'ana1', changes: { identityDescription: 'Una farera de cuarenta años', voice: { description: 'grave y calmada' } } }]);
check('2) editar su ficha y su voz POR DEFECTO (la que las escenas heredan)', ok(r) && r.production.characters[0].voice?.description === 'grave y calmada', codes(r));
p = r.production;
r = aplica(p, [{ op: 'add_reference', reference: { id: 'ref1', kind: 'image', role: 'character', assetId: 'asset_x1' } }, { op: 'update_character', characterId: 'ana1', changes: { referenceIds: ['ref1'] } }]);
check('3) añadir una referencia y atarla al personaje, en un solo lote', ok(r) && r.production.characters[0].referenceIds?.[0] === 'ref1', codes(r));
p = r.production;
r = aplica(p, [{ op: 'add_location', location: { id: 'faro', name: 'El faro' } }, { op: 'add_object', object: { id: 'linterna', name: 'Linterna', kind: 'prop' } }]);
check('4) añadir un lugar y un objeto', ok(r) && r.production.locations.length === 1 && r.production.objects.length === 1, codes(r));
p = r.production;
r = aplica(p, [{ op: 'update_character', characterId: 'ana1', changes: { id: 'otra1' } }]);
check('5) el id no se cambia: se quita y se pone', !ok(r) && /not_editable/.test(codes(r)), codes(r));
r = aplica(p, [{ op: 'update_character', characterId: 'ana1', changes: {} }]);
check('6) un cambio vacío no es un cambio', !ok(r) && /nothing_to_change/.test(codes(r)), codes(r));
r = aplica(p, [{ op: 'remove_character', characterId: 'ana1' }]);
check('7) quitar una ficha: o se va, o dice por qué no', ok(r) || codes(r).length > 0, codes(r));

console.log('\n── Planos: D1 por `update_shot` ──');
p = aplica(base(), [
  { op: 'add_reference', reference: { id: 'fot1', kind: 'image', role: 'first_frame', assetId: 'asset_f1' } },
  { op: 'add_reference', reference: { id: 'fot2', kind: 'image', role: 'last_frame', assetId: 'asset_u1' } },
]).production;
r = aplica(p, [{ op: 'update_shot', shotId: 'sh01', changes: { referenceIds: ['fot1', 'fot2'] } }]);
check('8) primer y último fotograma = referencias del plano con su papel', ok(r) && r.production.scenes[0].shots[0].referenceIds.join() === 'fot1,fot2', codes(r));
r = aplica(p, [{ op: 'update_shot', shotId: 'sh01', changes: { revision: { mode: 'extend', instruction: 'Que la cámara siga hacia el mar', direction: 'forward', seconds: 6 } } }]);
check('9) extender una toma: `revision` entra por `update_shot`', ok(r) && r.production.scenes[0].shots[0].revision?.mode === 'extend', codes(r));
const conRev = r.production;
r = aplica(conRev, [{ op: 'update_shot', shotId: 'sh01', changes: { revision: null } }]);
check('10) y se retira con `null`', ok(r) && r.production.scenes[0].shots[0].revision === undefined, codes(r));
r = aplica(p, [{ op: 'update_shot', shotId: 'sh01', changes: { revision: { mode: 'edit', instruction: 'Más cálido', seconds: 5 } } }]);
check('11) `seconds` solo al extender: editar con segundos lo rechaza la validación del dominio', ok(r) && validacion.validarProduccion(r.production).problems.some((x) => /revision/.test(x.path) && x.severity === 'error'), codes(r));
r = aplica(p, [{ op: 'update_shot', shotId: 'sh01', changes: { durationSec: 9 } }]);
check('12) la duración tiene su operación: `update_shot` la rechaza con `use_dedicated_operation`', !ok(r) && /use_dedicated_operation/.test(codes(r)), codes(r));
r = aplica(p, [{ op: 'update_shot', shotId: 'sh01', changes: { advanced: { prompt: 'x' } } }]);
check('13) el prompt avanzado no entra por aquí (aún no)', !ok(r), codes(r));
r = aplica(p, [{ op: 'update_scene', sceneId: 'sc01', changes: { narrativePurpose: 'setup' } }]);
check('14) `update_scene` cambia lo de la escena que no tiene operación propia', ok(r), codes(r));
r = aplica(p, [{ op: 'move_shot', shotId: 'sh03', toSceneId: 'sc01' }]);
check('15) `move_shot` mueve un plano a otra escena (la tanda se reorganiza sin inventar jerarquía)', ok(r) && r.production.scenes[0].shots.some((x) => x.id === 'sh03'), codes(r));
r = aplica(p, [{ op: 'rename_production', title: 'Otro título' }, { op: 'change_intent', changes: { freeText: 'Una idea larga' } }]);
check('16) renombrar y cambiar la idea (el universo se edita después de crear)', ok(r) && r.production.title === 'Otro título' && r.production.intent.freeText === 'Una idea larga', codes(r));

console.log(fallos ? `\n✘ ${fallos} fallan de ${n}` : `\n✔ ${n} comprobaciones`);
process.exit(fallos ? 1 : 0);
