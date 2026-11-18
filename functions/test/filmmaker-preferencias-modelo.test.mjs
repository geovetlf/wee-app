/**
 * CONVERGENCIA · LO QUE LA PERSONA ELIGE DEL MODELO: `preferredModel`, `variants`, `seed` (opcionales, hacia atrás compatibles).
 * Ligera: se cargan las FUENTES con el TypeScript del proyecto; sin red ni Firebase.
 *     node functions/test/filmmaker-preferencias-modelo.test.mjs
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
const leer = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
let fallos = 0; let n = 0;
const check = (nombre, cond, extra = '') => { n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${nombre}` + (extra ? ` — ${extra}` : '')); if (!cond) fallos++; };
const resolver = (rel, p) => {
  const base = path.posix.join(path.posix.dirname(rel), p);
  return fs.existsSync(path.join(SRC, base, 'index.ts')) ? `${base}/index.ts` : `${base}.ts`;
};
const cargar = (rel, stubs = {}, cache = new Map()) => {
  if (cache.has(rel)) return cache.get(rel).exports;
  const js = ts.transpileModule(fs.readFileSync(path.join(SRC, rel), 'utf8'), { compilerOptions: { target: 'ES2022', module: 'commonjs' } }).outputText;
  const m = new Module(rel); m.filename = path.join(SRC, rel); m.paths = []; cache.set(rel, m);
  m.require = (p) => (p in stubs ? stubs[p] : p.startsWith('.') ? cargar(resolver(rel, p), stubs, cache) : require(p));
  m._compile(js, m.filename); return m.exports;
};

const IDS = { SEEDANCE_2_5: 'M25', SEEDANCE_2_0: 'M20', SEEDANCE_2_0_FAST: 'MFAST', SEEDANCE_2_0_MINI: 'MMINI' };
const P = cargar('engine/preferenciasDeModelo.ts', { './seedance': { SEEDANCE_MODEL_IDS: IDS } });
const FLASH = 'dreamina-seedance-2-5-flash-261115';
const v = (x) => P.validarPreferenciasDeModelo(x);

console.log('\n── Validación contra las capacidades ──');
check('1) sin nada elegido, todo vale (comportamiento de siempre)', v({}).ok && v({}).modelo === undefined);
check('2) un modelo integrado se acepta y devuelve sus capacidades', v({ preferredModel: 'M25' }).ok && v({ preferredModel: 'M25' }).modelo.modeloId === 'M25');
check('3) un id desconocido se rechaza: model_unknown', v({ preferredModel: 'inventado' }).codigo === 'model_unknown' && v({ preferredModel: 7 }).codigo === 'model_unknown');
check('4) un modelo no integrado (Flash) se rechaza con motivo claro: model_not_integrated', v({ preferredModel: FLASH }).codigo === 'model_not_integrated' && v({ preferredModel: FLASH }).parametros.model === FLASH);
check('5) variantes 1–4; 0, 5, 2.5 y texto se rechazan', [1, 4].every((x) => v({ variants: x }).ok) && [0, 5, 2.5, '2'].every((x) => v({ variants: x }).codigo === 'variants_invalid'));
check('6) la semilla es un entero 0…4294967295; negativa, decimal o enorme se rechazan', v({ seed: 0 }).ok && v({ seed: 4294967295 }).ok && [-1, 1.5, 4294967296, 'x'].every((x) => v({ seed: x }).codigo === 'seed_invalid'));
check('7) la semilla con un modelo que la soporta vale', v({ preferredModel: 'M25', seed: 42 }).ok);
check('8) variantes por modelo: tope de 4 en los integrados', v({ preferredModel: 'MFAST', variants: 4 }).ok);

console.log('\n── Lo que lee la app ──');
const opc = P.opcionesDeModelo(cargar('engine/capacidadesDeVideo.ts', { './seedance': { SEEDANCE_MODEL_IDS: IDS } }).capacidadesDeModelo('M25'));
check('9) las opciones de un modelo traen duraciones, formatos, resoluciones, audio, semilla y variantes', ['duraciones', 'formatos', 'resoluciones', 'audio', 'semilla', 'variantes'].every((k) => k in opc) && opc.duraciones.maxSec === 30 && opc.variantes.max === 4);
const video = sinComentarios(leer('functions/src/creator/video.ts'));
check('10) `generateVideo({capacidades:true})` incluye `options` por modelo, sin proveedor ni fuentes', /options: opcionesDeModelo\(c\)/.test(video) && /proveedor: _proveedor, fuentes: _fuentes/.test(video));
check('11) la toma valida lo elegido ANTES de evaluar el plano, y pasa semilla y modelo al motor', video.indexOf('validarPreferenciasDeModelo({ preferredModel: d.preferredModel') < video.indexOf('evaluarPlano(requisito, d.quality, capacidadesElegidas)') && /model: claveDelModelo \?\? 'auto'/.test(video) && /seed: d\.seed/.test(video));
const pura = sinComentarios(leer('functions/src/engine/preferenciasDeModelo.ts'));
check('12) la validación es pura: sin Firestore, sin Credits, sin red', !/firebase|firestore|credits|fetch\(|runtime\//i.test(pura));

console.log('\n── El contrato de la producción ──');
const modelo = cargar('filmmaker/modelo.ts');
const validacion = cargar('filmmaker/validacion.ts');
const ops = cargar('filmmaker/operaciones.ts');
const base = () => ({
  ...modelo.produccionVacia({ title: 'Mi película', aspectRatio: '16:9', id: 'prod-0001' }),
  scenes: [{ id: 'sc01', order: 0, title: 'Uno', shots: [{ id: 'sh01', order: 0, durationSec: 5, description: 'Un faro' }] }],
});
const errores = (prod) => validacion.validarProduccion(prod).problems.filter((x) => x.severity === 'error').map((x) => x.path);
let r = ops.aplicarOperaciones(base(), [{ op: 'change_generation', target: { scope: 'shot', shotId: 'sh01' }, preferredModel: 'M25', variants: 3, consistencySeed: 7 }]);
check('13) `change_generation` fija modelo, variantes y semilla de UN cuadro', r.ok && r.production.scenes[0].shots[0].generation.preferredModel === 'M25' && r.production.scenes[0].shots[0].generation.consistencySeed === 7 && errores(r.production).length === 0);
const conTodo = r.production;
r = ops.aplicarOperaciones(conTodo, [{ op: 'change_generation', target: { scope: 'shot', shotId: 'sh01' }, consistencySeed: null, variants: null }]);
check('14) y `null` los quita (la calidad no se toca)', r.ok && r.production.scenes[0].shots[0].generation.consistencySeed === undefined && r.production.scenes[0].shots[0].generation.preferredModel === 'M25');
r = ops.aplicarOperaciones(base(), [{ op: 'change_generation', target: { scope: 'production' }, preferredModel: 'M20' }]);
check('15) también para toda la producción', r.ok && r.production.generation.preferredModel === 'M20');
r = ops.aplicarOperaciones(base(), [{ op: 'change_generation', target: { scope: 'shot', shotId: 'sh01' }, variants: 9 }]);
check('16) la validación del dominio rechaza la forma (variantes fuera de 1–4)', r.ok && errores(r.production).some((p) => /generation\.variants/.test(p)) || !r.ok);
r = ops.aplicarOperaciones(base(), [{ op: 'change_generation', target: { scope: 'shot', shotId: 'sh01' } }]);
check('17) sin nada que cambiar, no es un cambio', !r.ok);
const idx = sinComentarios(leer('functions/src/productions/index.ts'));
check('18) al guardar, el servidor valida el modelo contra las capacidades (production_invalid con el motivo)', /preferenciasRechazadas\(despues\)/.test(idx) && /reason: m\.reason/.test(idx) && sinComentarios(leer('functions/src/productions/preferenciasAlGuardar.ts')).includes('validarPreferenciasDeModelo({'));

console.log(fallos ? `\n✘ ${fallos} fallan de ${n}` : `\n✔ ${n} comprobaciones`);
process.exit(fallos ? 1 : 0);
