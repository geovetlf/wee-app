/**
 * FILMMAKER ENGINE · FASE 17 (D14) — EL VOCABULARIO DE CÁMARA v2.
 *
 * El encargo (2026-09-28): extreme wide, full, MCU, over-the-shoulder, insert, zoom, rack focus y leading lines,
 * integrados en el Core de forma determinista, sin romper los prompts que ya existen, con el contrato versionado y con
 * pruebas de compatibilidad para lo antiguo.
 *
 *   A · el lenguaje, versión 2: nueve valores AL FINAL de tres listas; nada de la 1 se mueve ni cambia;
 *   B · determinista: cada versión habla su idioma —un valor de la 2 con `version: 1` no existe—;
 *   P · compatibilidad: con el código de ANTES de esta fase (F1-A, requisitos, Core y el texto del plano, sacados de
 *       git) y el de ahora, cada valor de la 1 da la MISMA producción, el MISMO requisito y el MISMO prompt, byte a byte;
 *   F · F1-A escribe la versión que hace falta, y el espejo de la app lo hace igual que el servidor;
 *   C · en la app: la biblioteca de cámara, sus nombres en los once idiomas;
 *   W · Weë Brain: en el editor de producciones propone con los nueve; su prompt general no cambia;
 *   G · las guardas: qué se tocó y qué no, la exigencia al proveedor, la documentación y la cadena.
 *
 * Todo puro y en Node: sin red, sin emulador, sin Credits.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { crearCargador, leer, sinComentarios, RAIZ } from './filmmaker-cliente.mjs';

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const sinCR = (s) => s.replace(/\r\n/g, '\n');
const git = (args) => sinCR(execSync(`git ${args}`, { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
const codigo = (p) => sinComentarios(sinCR(leer(p)));
const clon = (x) => JSON.parse(JSON.stringify(x));
/* El tramo de esta fase: desde la Fase 16 hasta su commit (antes del commit, hasta el árbol de trabajo). */
const ANTES = 'decf707';
const HASTA = git('log --format=%H -n 1 --grep "Filmmaker Engine phase 17 "').trim();
const tramo = HASTA ? `${ANTES} ${HASTA}` : ANTES;

/* ── El servidor de AHORA, compilado: la verdad ── */
const requerirFn = createRequire(path.resolve(RAIZ, 'functions/package.json'));
const C = requerirFn('./lib/core/creative.js');
const O = requerirFn('./lib/filmmaker/operaciones.js');
const Rq = requerirFn('./lib/filmmaker/requisitos.js');
const M = requerirFn('./lib/filmmaker/modelo.js');
const Va = requerirFn('./lib/filmmaker/validacion.js');
const PL = requerirFn('./lib/creator/plano.js');
const PR = requerirFn('./lib/creator/prompts.js');
const BR = requerirFn('./lib/core/brain.js');
const CORE = requerirFn('./lib/core/index.js');

/* ── El espejo de la app, AHORA ── */
const cargar = crearCargador({ dobles: {} });
const E = {
  C: cargar('services/filmmaker/espejo/core/creative.ts'),
  O: cargar('services/filmmaker/espejo/filmmaker/operaciones.ts'),
  Rq: cargar('services/filmmaker/espejo/filmmaker/requisitos.ts'),
  M: cargar('services/filmmaker/espejo/filmmaker/modelo.ts'),
};

/* ── ANTES de esta fase, sacado de git: el espejo entero (F1-A y el Core que usa) y el texto del plano ── */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fm-camara-v2-'));
for (const f of git(`ls-tree -r --name-only ${ANTES} services/filmmaker/espejo`).trim().split('\n').filter(Boolean)) {
  const destino = path.join(tmp, f);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, git(`show ${ANTES}:${f}`));
}
const cargarAntes = crearCargador({ dobles: {} });
const A0 = (rel) => cargarAntes(path.join(tmp, 'services/filmmaker/espejo', rel));
const V = { C: A0('core/creative.ts'), O: A0('filmmaker/operaciones.ts'), Rq: A0('filmmaker/requisitos.ts'), M: A0('filmmaker/modelo.ts') };
fs.mkdirSync(path.join(tmp, 'plano/creator'), { recursive: true });
fs.writeFileSync(path.join(tmp, 'plano/creator/plano.ts'), git(`show ${ANTES}:functions/src/creator/plano.ts`));
const PLantes = crearCargador({ dobles: { '../core': V.C } })(path.join(tmp, 'plano/creator/plano.ts'));
const creativoAntes = git(`show ${ANTES}:functions/src/core/creative.ts`);
const promptsAntes = git(`show ${ANTES}:functions/src/creator/prompts.ts`);

/* Las listas de una fuente del Core, por su nombre (la forma que ya leen camara-espejo y filmmaker-brain). */
const listaDe = (src, nombre) => JSON.parse(`[${(new RegExp(`const ${nombre}: readonly string\\[\\] = \\[([^\\]]*)\\]`).exec(src) ?? [])[1] ?? ''}]`.replace(/'/g, '"'));
const NUEVOS = {
  'shot.type': ['extreme_wide', 'full', 'medium_close_up', 'over_the_shoulder', 'insert'],
  'movement.type': ['zoom_in', 'zoom_out', 'rack_focus'],
  'composition.type': ['leading_lines'],
};
const NUEVE = Object.entries(NUEVOS).flatMap(([ruta, vs]) => vs.map((v) => [ruta, v]));
const LISTAS = {
  'camera.type': 'CAMARAS', 'camera.perspective': 'PERSPECTIVAS', 'shot.type': 'PLANOS', 'lens.type': 'OPTICAS',
  'movement.type': 'MOVIMIENTOS', 'movement.speed': 'VELOCIDADES', 'motion.smoothness': 'SUAVIDADES', 'lighting.type': 'LUCES',
  'composition.type': 'COMPOSICIONES', 'transition.type': 'TRANSICIONES',
};
const fuenteAhora = leer('functions/src/core/creative.ts');
/** Una intención con un solo valor en una ruta. */
const con = (version, ruta, valor) => { const [g, c] = ruta.split('.'); return { version, [g]: { [c]: valor } }; };

/* ═══ A · EL LENGUAJE, VERSIÓN 2 ══════════════════════════════════════════ */
console.log('\n── A · El lenguaje, versión 2: nueve valores al final, nada de la 1 cambia ──');
{
  const alFinal = Object.entries(NUEVOS).filter(([ruta, vs]) => {
    const antes = listaDe(creativoAntes, LISTAS[ruta]);
    return JSON.stringify(listaDe(fuenteAhora, LISTAS[ruta])) !== JSON.stringify([...antes, ...vs]);
  }).map(([r]) => r);
  check('A1) los nueve, AL FINAL de sus listas: los de la 1, en su sitio y sin cambiar', alFinal.length === 0, alFinal.join(', '));
  const otras = Object.entries(LISTAS).filter(([r]) => !NUEVOS[r]).filter(([, nombre]) => JSON.stringify(listaDe(fuenteAhora, nombre)) !== JSON.stringify(listaDe(creativoAntes, nombre))).map(([r]) => r);
  check('A2) las demás listas, idénticas a antes; ni una ruta nueva (las mismas doce, en el mismo orden)',
    otras.length === 0 && JSON.stringify(C.RUTAS_CREATIVAS) === JSON.stringify(V.C.RUTAS_CREATIVAS) && C.RUTAS_CREATIVAS.length === 12, otras.join(', '));
  check('A3) la versión con que Weë escribe por defecto sigue siendo la 1; la más reciente que entiende, la 2',
    CORE.CREATIVE_PARAMETERS_VERSION === 1 && C.versionCreativaActual() === 1 && C.VERSION_CREATIVA_MAS_RECIENTE === 2
    && git(`diff --name-only ${tramo} -- functions/src/core/contracts.ts`).trim() === '');
  const todosLosDeLaUno = Object.entries(LISTAS).flatMap(([ruta, nombre]) => listaDe(creativoAntes, nombre).map((v) => [ruta, v]));
  check('A4) desde qué versión: los nueve, de la 2; cada valor de la 1 en cada ruta, de la 1; lo desconocido o un número, 1',
    NUEVE.every(([r, v]) => C.desdeQueVersion(r, v) === 2) && todosLosDeLaUno.length === 59 && todosLosDeLaUno.every(([r, v]) => C.desdeQueVersion(r, v) === 1)
    && C.desdeQueVersion('shot.type', 'teleport') === 1 && C.desdeQueVersion('lens.focalLengthMm', 50) === 1 && C.desdeQueVersion('__proto__', 'insert') === 1
    && C.desdeQueVersion('camera.type', 'insert') === 1);
  check('A5) los nueve, tipados en el contrato (sin `string` suelto)',
    /'extreme_wide' \| 'full' \| 'medium_close_up' \| 'over_the_shoulder' \| 'insert'/.test(fuenteAhora) && /'zoom_in' \| 'zoom_out' \| 'rack_focus'/.test(fuenteAhora)
    && /\| 'leading_lines';/.test(fuenteAhora) && !/string;/.test((fuenteAhora.match(/export interface CreativeParameters \{[\s\S]*?\n\}/) || [''])[0]));
}

/* ═══ B · DETERMINISTA: CADA VERSIÓN, SU IDIOMA ═══════════════════════════ */
console.log('\n── B · Cada versión habla su idioma ──');
{
  const conV1 = NUEVE.map(([r, v]) => [r, v, C.validarCreativos(con(1, r, v))]);
  check('B1) un valor de la 2 con `version: 1` no existe: exactamente un problema, «invalid_value» en su ruta',
    conV1.every(([r, , p]) => p.length === 1 && p[0].reason === 'invalid_value' && p[0].path === r), JSON.stringify(conV1.filter(([, , p]) => p.length !== 1).map(([r, v]) => `${r}=${v}`)));
  check('B2) con `version: 2`, los nueve valen', NUEVE.every(([r, v]) => C.creativosValidos(con(2, r, v))));
  const todosLosDeLaUno = Object.entries(LISTAS).flatMap(([ruta, nombre]) => listaDe(creativoAntes, nombre).map((v) => [ruta, v]));
  check('B3) cada valor de la 1 sigue valiendo con la 1, y también con la 2 y más allá',
    todosLosDeLaUno.every(([r, v]) => C.creativosValidos(con(1, r, v)) && C.creativosValidos(con(2, r, v)) && C.creativosValidos(con(99, r, v))));
  check('B4) lo que no existe, no existe en ninguna versión', ['zoom_sideways', 'teleport', 'Insert', 'rack focus'].every((v) =>
    [1, 2, 99].every((ver) => !C.creativosValidos(con(ver, 'movement.type', v)) && !C.creativosValidos(con(ver, 'shot.type', v)))));
  const sinIdioma = [0, '2', 1.5, NaN].map((ver) => C.validarCreativos({ version: ver, shot: { type: 'insert' } }).map((p) => p.reason).sort().join('+'));
  check('B5) una versión que no vale no habla ningún idioma: su error, y el valor de la 2 tampoco cabe',
    sinIdioma.every((s) => s === 'invalid_value+invalid_version'), sinIdioma.join(' · '));
  check('B6) la única regla de coherencia, igual: quieta no tiene velocidad; un zoom sí puede tenerla',
    C.validarCreativos({ version: 2, movement: { type: 'static', speed: 'slow' } }).some((p) => p.reason === 'incoherent')
    && C.creativosValidos({ version: 2, movement: { type: 'zoom_in', speed: 'slow' } }) && C.creativosValidos({ version: 2, movement: { type: 'rack_focus', speed: 'fast' } }));
  check('B7) la versión que necesita una intención: 1 si solo habla la 1; 2 con un solo valor de la 2',
    C.versionCreativaNecesaria(undefined) === 1 && C.versionCreativaNecesaria({ version: 1 }) === 1
    && C.versionCreativaNecesaria({ version: 1, shot: { type: 'close_up' }, movement: { type: 'orbit' }, lens: { focalLengthMm: 35 } }) === 1
    && NUEVE.every(([r, v]) => C.versionCreativaNecesaria(con(2, r, v)) === 2)
    && C.versionCreativaNecesaria({ version: 2, shot: { type: 'close_up' }, composition: { type: 'leading_lines' } }) === 2);
  const junta = C.componerCreativos([{ version: 1, shot: { type: 'close_up' } }, { version: 2, movement: { type: 'rack_focus' } }]);
  const rellena = C.completarCreativos({ version: 1, camera: { type: 'ground' } }, { version: 2, composition: { type: 'leading_lines' } });
  const choque = C.componerCreativos([{ version: 2, shot: { type: 'insert' } }, { version: 1, shot: { type: 'wide' } }]);
  check('B8) juntar y rellenar: la versión más alta de lo que entra, siempre válida; y un choque sigue siendo un choque',
    junta.parameters?.version === 2 && C.creativosValidos(junta.parameters) && rellena?.version === 2 && C.creativosValidos(rellena)
    && JSON.stringify(choque.conflicts) === '["shot.type"]' && !choque.parameters);
  const congelada = Object.freeze({ version: 2, shot: Object.freeze({ type: 'insert' }), movement: Object.freeze({ type: 'zoom_out', speed: 'slow' }) });
  check('B9) puro: lo mismo da lo mismo, y no toca lo que recibe',
    JSON.stringify(C.validarCreativos(congelada)) === JSON.stringify(C.validarCreativos(congelada)) && C.versionCreativaNecesaria(congelada) === 2);
  check('B10) el espejo de la app decide igual que el servidor, valor a valor y versión a versión',
    [...NUEVE, ...todosLosDeLaUno].every(([r, v]) => [1, 2].every((ver) =>
      JSON.stringify(E.C.validarCreativos(con(ver, r, v))) === JSON.stringify(C.validarCreativos(con(ver, r, v)))))
    && E.C.VERSION_CREATIVA_MAS_RECIENTE === 2);
}

/* ── Una producción lista, en el F1-A que se pida (el de antes o el de ahora) ── */
const PID = 'abcdefghijklmnopqrstuvwx';
const produccionCon = (F, avanzado) => clon({
  ...F.M.produccionVacia({ title: 'El día de una panadería', aspectRatio: '16:9', id: PID }),
  ...F.M.configuracionDePreset('youtube'),
  intent: { freeText: 'El día de una panadería, de madrugada al cierre' },
  scenes: [{ id: 'sc-0001', order: 0, title: 'Madrugada', description: 'El obrador se despierta', shots: [
    { id: 'sh-0101', order: 0, durationSec: 5, description: 'Se enciende la luz del obrador', ...(avanzado ? { advanced: { prompt: avanzado } } : {}) },
  ] }],
});
/** Aplica una operación y devuelve la producción, el requisito del plano y su prompt, con el F1-A y el texto que se pidan. */
const recorrido = (F, plano, ops, avanzado) => {
  const r = F.O.aplicarOperaciones(produccionCon(F, avanzado), ops);
  if (!r.ok) return { ok: false, problemas: r.problems };
  const q = F.Rq.requisitosDeProduccion(r.production);
  if (!q.ok) return { ok: false, problemas: q.problems };
  const req = q.requirements.shots.find((s) => s.unitId === 'sh-0101');
  const leido = plano.leerRequisitoDePlano(clon(req));
  return {
    ok: true, produccion: r.production, requisito: req, creativo: r.production.scenes[0].shots[0].visual?.creative,
    prompt: plano.componerPromptDePlano(leido), plantilla: plano.plantillaDePlano(leido),
  };
};
const AHORA = { O, Rq, M };
const OPS_DE = (ruta, valor) => {
  const t = { scope: 'shot', shotId: 'sh-0101' };
  switch (ruta) {
    case 'camera.type': return [{ op: 'change_camera', target: t, cameraType: valor }];
    case 'camera.perspective': return [{ op: 'change_camera', target: t, perspective: valor }];
    case 'shot.type': return [{ op: 'change_camera', target: t, shotType: valor }];
    case 'lens.type': return [{ op: 'change_camera', target: t, lens: valor }];
    case 'composition.type': return [{ op: 'change_camera', target: t, composition: valor }];
    case 'movement.type': return [{ op: 'change_movement', target: t, movement: valor, ...(valor === 'static' ? {} : { speed: 'slow' }) }];
    case 'movement.speed': return [{ op: 'change_movement', target: t, movement: 'orbit', speed: valor }];
    case 'motion.smoothness': return [{ op: 'change_movement', target: t, smoothness: valor }];
    case 'lighting.type': return [{ op: 'change_lighting', target: t, lighting: valor }];
    default: return null;
  }
};

/* ═══ P · LOS PROMPTS DE ANTES, BYTE A BYTE ═══════════════════════════════ */
console.log('\n── P · Compatibilidad: lo de la 1 da lo mismo que antes, byte a byte ──');
{
  const base0 = recorrido(V, PLantes, []);
  const base1 = recorrido(AHORA, PL, []);
  check('P0) sin tocar la cámara: la misma producción, el mismo requisito y el mismo prompt que antes',
    base0.ok && base1.ok && JSON.stringify(base0.produccion) === JSON.stringify(base1.produccion)
    && JSON.stringify(base0.requisito) === JSON.stringify(base1.requisito) && base0.prompt === base1.prompt && base0.plantilla === base1.plantilla, base1.prompt?.slice(0, 80));
  const casos = Object.entries(LISTAS).filter(([r]) => r !== 'transition.type').flatMap(([ruta, nombre]) => listaDe(creativoAntes, nombre).map((v) => [ruta, v]));
  const distintos = [];
  for (const [ruta, valor] of casos) {
    const ops = OPS_DE(ruta, valor);
    const a = recorrido(V, PLantes, ops);
    const b = recorrido(AHORA, PL, ops);
    const igual = a.ok && b.ok && JSON.stringify(a.produccion) === JSON.stringify(b.produccion) && JSON.stringify(a.requisito) === JSON.stringify(b.requisito)
      && a.prompt === b.prompt && a.plantilla === b.plantilla && b.creativo?.version === 1;
    if (!igual) distintos.push(`${ruta}=${valor}`);
  }
  check('P1) CADA valor de la 1 en cada ruta: la misma producción (versión 1), el mismo requisito y el mismo prompt que el código de antes',
    casos.length === 53 && distintos.length === 0, `${casos.length} casos${distintos.length ? ` · distintos: ${distintos.join(', ')}` : ''}`);
  const todo = [
    { op: 'change_camera', target: { scope: 'shot', shotId: 'sh-0101' }, cameraType: 'handheld', perspective: 'low_angle', shotType: 'close_up', lens: 'telephoto', focalLengthMm: 85, composition: 'rule_of_thirds' },
    { op: 'change_movement', target: { scope: 'shot', shotId: 'sh-0101' }, movement: 'dolly_in', speed: 'slow', smoothness: 'smooth' },
    { op: 'change_lighting', target: { scope: 'scene', sceneId: 'sc-0001' }, lighting: 'golden_hour' },
    { op: 'change_camera', target: { scope: 'production' }, composition: 'symmetrical' },
  ];
  const ta = recorrido(V, PLantes, todo);
  const tb = recorrido(AHORA, PL, todo);
  check('P2) todas las rutas a la vez, en tres ámbitos: el mismo prompt de antes, con su «Camera:» entero',
    ta.ok && tb.ok && ta.prompt === tb.prompt && /Camera: close up shot, handheld camera, low angle, telephoto lens 85 mm, movement dolly in \(slow\), smooth motion, golden hour lighting, symmetrical composition\./.test(tb.prompt), tb.prompt);
  const aa = recorrido(V, PLantes, todo, 'Mantén la harina flotando en el aire');
  const ab = recorrido(AHORA, PL, todo, 'Mantén la harina flotando en el aire');
  check('P3) y con prompt avanzado (plantilla fm-plano-2): el mismo texto que antes, con su bloque en la última línea',
    aa.ok && ab.ok && aa.prompt === ab.prompt && ab.plantilla === 'fm-plano-2' && aa.plantilla === 'fm-plano-2'
    && ab.prompt.endsWith('\nAdditional direction: Mantén la harina flotando en el aire'), ab.plantilla);
  const produccionAntigua = clon(tb.produccion);
  check('P4) una producción guardada con la 1 sigue siendo válida tal cual, y su requisito y su prompt no cambian al releerla',
    produccionAntigua.scenes[0].shots[0].visual.creative.version === 1
    && (() => { const q = Rq.requisitosDeProduccion(produccionAntigua); return q.ok && PL.componerPromptDePlano(PL.leerRequisitoDePlano(clon(q.requirements.shots[0]))) === ta.prompt; })());
}

/* ═══ V2 · LOS NUEVE, EN PALABRAS ═════════════════════════════════════════ */
console.log('\n── V · Los nueve, en el texto del plano: con las palabras de siempre ──');
{
  const palabras = {
    'shot.type': { extreme_wide: 'extreme wide shot', full: 'full shot', medium_close_up: 'medium close up shot', over_the_shoulder: 'over the shoulder shot', insert: 'insert shot' },
    'movement.type': { zoom_in: 'movement zoom in (slow)', zoom_out: 'movement zoom out (slow)', rack_focus: 'movement rack focus (slow)' },
    'composition.type': { leading_lines: 'leading lines composition' },
  };
  const malos = [];
  for (const [ruta, valor] of NUEVE) {
    const r = recorrido(AHORA, PL, OPS_DE(ruta, valor));
    const otra = recorrido(AHORA, PL, OPS_DE(ruta, valor));
    const ok = r.ok && r.creativo?.version === 2 && r.requisito.input.creative.version === 2 && r.prompt.includes(`Camera: ${palabras[ruta][valor]}.`)
      && r.plantilla === 'fm-plano-1' && otra.prompt === r.prompt;
    if (!ok) malos.push(`${ruta}=${valor}`);
  }
  check('V1) cada uno de los nueve: la producción y el requisito con la 2, sus palabras en «Camera:», la plantilla de siempre y el mismo texto dos veces',
    malos.length === 0, malos.join(', '));
  const antes = NUEVE.map(([r, v]) => V.O.aplicarOperaciones(produccionCon(V), OPS_DE(r, v)));
  check('V2) el F1-A de antes ni siquiera los admite: invalid_creative (determinista: lo nuevo solo entra por lo nuevo)',
    antes.every((r) => !r.ok && JSON.stringify(r.problems).includes('invalid_creative')));
  const mezcla = recorrido(AHORA, PL, [
    { op: 'change_camera', target: { scope: 'shot', shotId: 'sh-0101' }, shotType: 'over_the_shoulder', composition: 'leading_lines', lens: 'standard' },
    { op: 'change_movement', target: { scope: 'shot', shotId: 'sh-0101' }, movement: 'rack_focus' },
  ]);
  check('V3) juntos y con valores de la 1: en su orden de siempre', mezcla.ok && /Camera: over the shoulder shot, standard lens, movement rack focus, leading lines composition\./.test(mezcla.prompt), mezcla.prompt);
  const prohibido = /\b(seedance|modelark|byteplus|kling|runway|veo|gemini|provider|model)\b/i;
  check('V4) ninguno nombra un proveedor ni un modelo: son del idioma de Weë', NUEVE.every(([, v]) => !prohibido.test(v)));
  const leidoV1 = PL.leerRequisitoDePlano({ ...clon(mezcla.requisito), input: { ...clon(mezcla.requisito.input), creative: { version: 1, shot: { type: 'insert' } } } });
  check('V5) un requisito que dice ser de la 1 y trae uno de la 2 no lleva cámara: no se inventa ni se aproxima', !!leidoV1 && !leidoV1.creativo && !/insert/.test(PL.componerPromptDePlano(leidoV1)));
}

/* ═══ F · F1-A ESCRIBE LA VERSIÓN QUE HACE FALTA ══════════════════════════ */
console.log('\n── F · F1-A escribe la versión que hace falta, y el espejo de la app igual ──');
{
  const t = { scope: 'shot', shotId: 'sh-0101' };
  const r1 = O.aplicarOperaciones(produccionCon(AHORA), [{ op: 'change_camera', target: t, shotType: 'insert' }]);
  const cp1 = r1.ok ? r1.production.scenes[0].shots[0].visual.creative : null;
  check('F1) poner un valor de la 2 lo guarda con la 2, y la producción sigue siendo válida',
    r1.ok && JSON.stringify(cp1) === '{"version":2,"shot":{"type":"insert"}}' && Va.validarProduccion(r1.production, { stage: 'ready' }).valid === true, JSON.stringify(cp1));
  const r2 = O.aplicarOperaciones(produccionCon(AHORA), [{ op: 'change_camera', target: t, shotType: 'close_up' }]);
  check('F2) un valor de la 1 se guarda con la 1, como siempre', r2.ok && JSON.stringify(r2.production.scenes[0].shots[0].visual.creative) === '{"version":1,"shot":{"type":"close_up"}}');
  const r3 = r1.ok ? O.aplicarOperaciones(r1.production, [{ op: 'change_camera', target: t, shotType: 'close_up' }]) : r1;
  check('F3) lo que ya habla la 2 no baja a la 1 al cambiar a un valor de la 1: nunca se reescribe la versión hacia atrás',
    r3.ok && JSON.stringify(r3.production.scenes[0].shots[0].visual.creative) === '{"version":2,"shot":{"type":"close_up"}}');
  const r4 = O.aplicarOperaciones(produccionCon(AHORA), [{ op: 'change_camera', target: { scope: 'production' }, composition: 'leading_lines' }]);
  const r5 = O.aplicarOperaciones(produccionCon(AHORA), [{ op: 'change_movement', target: { scope: 'scene', sceneId: 'sc-0001' }, movement: 'zoom_out', speed: 'fast' }]);
  check('F4) en los tres ámbitos: la producción y la escena también escriben la 2 cuando hace falta',
    r4.ok && r4.production.creativeDirection.cinematography.version === 2 && r5.ok && r5.production.scenes[0].visual.creative.version === 2);
  const iguales = [
    [{ op: 'change_camera', target: t, shotType: 'insert' }],
    [{ op: 'change_camera', target: t, shotType: 'full', composition: 'leading_lines' }, { op: 'change_movement', target: t, movement: 'zoom_in', speed: 'slow' }],
    [{ op: 'change_camera', target: t, shotType: 'close_up' }],
    [{ op: 'change_camera', target: t, shotType: 'insert' }, { op: 'change_camera', target: t, shotType: null }],
  ].every((ops) => JSON.stringify(E.O.aplicarOperaciones(produccionCon(E), ops)) === JSON.stringify(O.aplicarOperaciones(produccionCon(AHORA), ops)));
  check('F5) el espejo de la app aplica lo mismo que el servidor, byte a byte (con la 2, con la 1 y al quitarla)', iguales);
  const r6 = O.aplicarOperaciones(produccionCon(AHORA), [{ op: 'change_camera', target: t, shotType: 'insert' }, { op: 'change_camera', target: t, shotType: null }]);
  check('F6) quitar el valor de la 2 no deja un objeto vacío con versión: sin rutas, no hay intención', r6.ok && r6.production.scenes[0].shots[0].visual?.creative === undefined);
  const req = r1.ok ? Rq.requisitosDeProduccion(r1.production) : null;
  check('F7) el requisito del plano hereda la 2, y su encuadre sigue siendo el del formato',
    !!req?.ok && req.requirements.shots[0].input.creative.version === 2 && req.requirements.shots[0].input.creative.framing?.aspectRatio === '16:9');
}

/* ═══ C · EN LA APP ═══════════════════════════════════════════════════════ */
console.log('\n── C · En la app: la biblioteca de cámara y sus nombres ──');
{
  const cam = cargar('constants/camaraCinematica.ts');
  check('C1) la app acepta los nueve, en el mismo orden que el Core', Object.entries(NUEVOS).every(([ruta]) => JSON.stringify(cam.VALORES_CREATIVOS[ruta]) === JSON.stringify(listaDe(fuenteAhora, LISTAS[ruta]))));
  const esperados = {
    extreme_wide: ['/extremewide', 'studio.shtExtremeWide'], full: ['/fullshot', 'studio.shtFull'], medium_close_up: ['/mediumcloseup', 'studio.shtMediumCloseUp'],
    over_the_shoulder: ['/overshoulder', 'studio.shtOverShoulder'], insert: ['/insert', 'studio.shtInsert'],
    zoom_in: ['/zoomin', 'studio.mvZoomIn'], zoom_out: ['/zoomout', 'studio.mvZoomOut'], rack_focus: ['/rackfocus', 'studio.mvRackFocus'],
    leading_lines: ['/leadinglines', 'studio.cmpLeadingLines'],
  };
  const sinComando = NUEVE.filter(([r, v]) => { const c = cam.comandoPorAlias(esperados[v][0]); return !c || c.ruta !== r || c.valor !== v || c.clave !== esperados[v][1] || cam.claveDelValor(r, v) !== esperados[v][1]; }).map(([, v]) => v);
  check('C2) cada uno, su comando: alias, ruta, valor y nombre', sinComando.length === 0, sinComando.join(', '));
  const antesApp = git(`show ${ANTES}:constants/camaraCinematica.ts`);
  const comandos = (src) => [...sinCR(src).matchAll(/c\('([^']+)', '([^']+)', '([^']+)', '([^']+)', '([^']+)'\)/g)].map((m) => m.slice(1).join('|'));
  const antesC = comandos(antesApp);
  const ahoraC = comandos(leer('constants/camaraCinematica.ts'));
  /* Cada comando nuevo va DETRÁS de todos los de siempre de su ruta: la botonera aprobada no se mueve. */
  const ruta = (c) => c.split('|')[3];
  const nuevosC = ahoraC.filter((c) => !antesC.includes(c));
  const delante = nuevosC.filter((n) => ahoraC.some((c, i) => antesC.includes(c) && ruta(c) === ruta(n) && i > ahoraC.indexOf(n)));
  check('C3) los comandos de antes, todos y en su orden; los nueve, detrás de los de su familia', antesC.every((c) => ahoraC.includes(c))
    && JSON.stringify(ahoraC.filter((c) => antesC.includes(c))) === JSON.stringify(antesC) && ahoraC.length === antesC.length + 9
    && nuevosC.length === 9 && delante.length === 0, delante.join(', '));
  const glifos = JSON.parse(fs.readFileSync(path.resolve(RAIZ, 'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json'), 'utf8'));
  const iconos = NUEVE.map(([, v]) => cam.comandoPorAlias(esperados[v][0])?.icono);
  check('C4) sus iconos existen', iconos.every((i) => !!i && Object.prototype.hasOwnProperty.call(glifos, i)), iconos.join(', '));
  const IDIOMAS = ['es', 'en', 'pt', 'pt-PT', 'fr', 'de', 'it', 'ko', 'ru', 'zh', 'zh-TW'];
  const faltan = IDIOMAS.flatMap((l) => {
    const s = sinCR(leer(`i18n/textos/${l}/studio.ts`));
    return Object.values(esperados).map(([, k]) => k.replace('studio.', '')).filter((k) => !new RegExp(`\\n {2}${k}: '[^'\\n]+',\\n`).test(s)).map((k) => `${l}.${k}`);
  });
  check('C5) sus nombres, en los once idiomas', faltan.length === 0, faltan.join(', '));
  const es = sinCR(leer('i18n/textos/es/studio.ts'));
  const pt = sinCR(leer('i18n/textos/pt/studio.ts'));
  check('C6) en español, como se dice en un rodaje; y en portugués, el de Brasil',
    /shtExtremeWide: 'Gran plano general'/.test(es) && /shtInsert: 'Inserto'/.test(es) && /mvRackFocus: 'Cambio de foco'/.test(es) && /cmpLeadingLines: 'Líneas que guían'/.test(es)
    && /shtOverShoulder: 'Sobre o ombro'/.test(pt) && /mvZoomIn: 'Aproximar com zoom'/.test(pt));
  const t = (k) => ({ 'studio.shtInsert': 'Inserto', 'studio.mvRackFocus': 'Cambio de foco' })[k] ?? k;
  check('C7) lo elegido viaja filtrado y se dice con palabras: los nueve pasan el filtro, lo inventado no',
    JSON.stringify(cam.filtrarCreativo({ 'shot.type': 'insert', 'movement.type': 'rack_focus', 'composition.type': 'teleport' })) === '{"shot.type":"insert","movement.type":"rack_focus"}'
    && cam.creativoEnPalabras({ 'shot.type': 'insert', 'movement.type': 'rack_focus' }, t) === 'inserto, cambio de foco');
}

/* ═══ W · WEË BRAIN ═══════════════════════════════════════════════════════ */
console.log('\n── W · Weë Brain: en el editor, con los nueve; su prompt general, igual ──');
{
  const v = PR.VOCABULARIO_DE_PRODUCCION;
  check('W1) en el editor de producciones, lo que se le enseña es EXACTAMENTE el vocabulario del Core, con los nueve',
    JSON.stringify(v.plano) === JSON.stringify(listaDe(fuenteAhora, 'PLANOS')) && JSON.stringify(v.movimiento) === JSON.stringify(listaDe(fuenteAhora, 'MOVIMIENTOS'))
    && JSON.stringify(v.composicion) === JSON.stringify(listaDe(fuenteAhora, 'COMPOSICIONES')) && NUEVE.every(([, x]) => PR.instruccionDeProduccion('R').includes(x)));
  const bloque = (src) => { const s = sinCR(src); const a = s.indexOf(`'"creative" describe CÓMO`); return a < 0 ? '' : s.slice(a, s.indexOf(`No inventes valores que no estén en esas listas.',`, a)); };
  check('W2) su prompt general —el de todas las cajas— no cambia ni una letra: sigue escribiendo la 1 con los valores de la 1',
    bloque(promptsAntes).length > 200 && bloque(promptsAntes) === bloque(leer('functions/src/creator/prompts.ts')) && !/insert|rack_focus|leading_lines/.test(bloque(leer('functions/src/creator/prompts.ts'))));
  const cat = { intents: ['creation'], capabilities: CORE.CAPABILITY_CATALOG.map((c) => c.id), experiences: [] };
  const conLaUno = BR.interpretarEntendimiento({ intent: 'creation', creative: { version: 1, shot: { type: 'insert' } } }, cat);
  const conLaDos = BR.interpretarEntendimiento({ intent: 'creation', creative: { version: 2, shot: { type: 'insert' } } }, cat);
  check('W3) si aun así escribe uno de la 2 con la 1, se descarta ENTERO; dicho con la 2, llega tal cual',
    conLaUno.creative === undefined && JSON.stringify(conLaDos.creative) === '{"version":2,"shot":{"type":"insert"}}');
}

/* ═══ G · LAS GUARDAS ═════════════════════════════════════════════════════ */
console.log('\n── G · Qué se tocó y qué no ──');
{
  const tocados = git(`diff --name-only ${tramo}`).trim().split('\n').filter(Boolean).filter((f) => !f.startsWith('functions/lib/'));
  const nuevos = git('ls-files --others --exclude-standard').trim().split('\n').filter(Boolean).filter((f) => !f.startsWith('functions/lib/'));
  const todos = [...new Set([...tocados, ...(HASTA ? [] : nuevos)])].sort();
  const PERMITIDOS = [
    /^constants\/camaraCinematica\.ts$/, /^docs\/FILMMAKER\.md$/, /^functions\/package\.json$/, /^functions\/src\/core\/creative\.ts$/,
    /^functions\/src\/creator\/prompts\.ts$/, /^functions\/src\/filmmaker\/operaciones\.ts$/, /^functions\/test\/filmmaker-camara-v2\.test\.mjs$/,
    /^functions\/test\/i18n-preferencia-usuario\.test\.mjs$/, /^functions\/test\/motor-filmmaker-alcance\.mjs$/, /^functions\/test\/runtime-map\.test\.mjs$/,
    /^i18n\/textos\/[a-zA-Z-]+\/studio\.ts$/,
    /^services\/filmmaker\/espejo\/core\/creative\.ts$/, /^services\/filmmaker\/espejo\/filmmaker\/operaciones\.ts$/,
  ];
  const fuera = todos.filter((f) => !PERMITIDOS.some((p) => p.test(f)));
  check('G1) solo se tocó lo del vocabulario: el Core, F1-A (su versión), el espejo, Weë Brain del editor, la biblioteca, los nombres, la doc y las pruebas',
    fuera.length === 0 && todos.length >= 20, fuera.join(', ') || `${todos.length} archivos`);
  check('G2) ni el texto del plano, ni el contrato, ni el Router, ni el Registry, ni los proveedores, ni el dinero, ni la puerta del vídeo',
    git(`diff --name-only ${tramo} -- functions/src/creator/plano.ts functions/src/core/contracts.ts functions/src/core/router.ts functions/src/core/registry functions/src/engine functions/src/credits functions/src/core/financial functions/src/creator/video.ts functions/src/index.ts`).trim() === '');
  const quitadas = git(`diff -U0 ${tramo} -- functions/src/creator/prompts.ts`).split('\n').filter((l) => /^-[^-]/.test(l) && !/^-\s*\*/.test(l));
  check('G3) de Weë Brain solo cambian las tres listas del editor de producciones', quitadas.length === 3 && quitadas.every((l) => /^- {2}(plano|movimiento|composicion): Object\.freeze\(/.test(l)), quitadas.join(' | '));
  const exige = (mov) => C.exigenciasDe({ version: 2, movement: { type: mov } }).cameraMotion;
  check('G4) al proveedor se le exige lo de siempre: un zoom o un cambio de foco piden control de cámara, como cualquier movimiento; un encuadre o una composición, nada',
    exige('zoom_in') === true && exige('zoom_out') === true && exige('rack_focus') === true && exige('static') === false
    && JSON.stringify(C.exigenciasDe({ version: 2, shot: { type: 'insert' }, composition: { type: 'leading_lines' } })) === '{}');
  const DOC = sinCR(leer('docs/FILMMAKER.md'));
  check('G5) documentado', /### Fase 17 · /.test(DOC) && /\| D14 \| [^\n]*\*\*decidida\*\* en la Fase 17/.test(DOC));
  check('G6) esta suite está en la cadena de `npm test`', /filmmaker-camara-v2\.test\.mjs/.test(leer('functions/package.json')));
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(failures ? `\n✘ ${failures} fallos` : `\n✔ Fase 17 · el vocabulario de cámara v2 (${n} comprobaciones)`);
process.exit(failures ? 1 : 0);
