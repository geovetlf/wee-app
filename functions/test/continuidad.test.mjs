/**
 * WEË CONTINUITY & PRESERVATION LAYER — C1 + C2.
 *
 * ── Qué se mide aquí ────────────────────────────────────────────────────────
 *
 * Que se pueda DECIR, con el mismo contrato y sin ambigüedad:
 *
 *     «cambia el vestido pero no cambies a Luna»
 *     «conserva esta arquitectura y cambia solo los muebles»
 *     «mantén esta botella y cambia solo el fondo»
 *     «conserva la fachada y cambia las ventanas»
 *
 * Son el mismo requisito. Si hicieran falta cuatro contratos, la capa no sería
 * transversal: sería cuatro capas con el mismo nombre.
 *
 * Y que las cuatro reglas duras se sostengan:
 *
 *   1 · `unknown` NUNCA es `pass`.
 *   2 · el silencio no es permiso: `unspecified` no es `mayChange`.
 *   3 · exigir y liberar lo mismo es una contradicción, no un matiz.
 *   4 · exigir lo que nadie sabe hacer se rechaza ANTES de crear el trabajo,
 *       y eso NO es lo mismo que generar algo y que salga mal.
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

let failures = 0;
let n = 0;
const check = (name, cond, extra = '') => {
  n++;
  console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const core = lib('core/index.js');
const {
  ASPECTOS_DE_CONTINUIDAD, FAMILIAS_DE_CONTINUIDAD, FUERZAS_DE_CONTINUIDAD, ESTADOS_DE_CONTINUIDAD,
  RELACIONES_ESPACIALES, MAX_RELACIONES_ESPACIALES,
  CONTINUITY_CONTRACT_VERSION, SHOT_CONTRACT_VERSION,
  esAspectoDeContinuidad, validarContinuidad, continuidadValida,
  exigenciaDe, resumirVeredicto, rompeLaContinuidad,
  validarVeredicto, veredictoValido, anclajeValido, claveProhibidaDeContinuidad,
  aspectosSinCubrir, puedeCumplir, revisarAntesDeEjecutar,
  ESTADOS_DE_PLANO, TRANSICIONES_DE_PLANO, puedePasarDePlano, esEstadoDePlano,
  validarEscena, escenaValida, validarPlano, planoValido,
  nodoEsDeLaCuenta, referenciasDelPlano, claveProhibidaDeNodo,
  MAX_NARRATIVA, MAX_DEPENDENCIAS_DE_PLANO, MAX_ELEMENTOS_POR_NODO,
  leerHints,
} = core;

/* ── Fixtures ─────────────────────────────────────────────────────────────── */

const CUENTA = 'acc_0001';
const LUNA = 'el_luna_0001';
const VESTIDO = 'el_vestido_001';
const CASA = 'el_casa_0001';
const BOTELLA = 'el_botella_001';
const LAMPARA = 'el_lampara_001';
const MESA = 'el_mesa_0001';

const escena = (extra = {}) => ({
  contract: SHOT_CONTRACT_VERSION,
  sceneId: 'sc_0001', projectId: 'pr_0001', ownerAccountId: CUENTA,
  version: 1, order: 0, createdAt: 1_000, updatedAt: 1_000, ...extra,
});

const plano = (extra = {}) => ({
  contract: SHOT_CONTRACT_VERSION,
  shotId: 'sh_0001', projectId: 'pr_0001', ownerAccountId: CUENTA,
  version: 1, order: 0, state: 'draft', createdAt: 1_000, updatedAt: 1_000, ...extra,
});

const veredicto = (extra = {}) => ({
  contract: CONTINUITY_CONTRACT_VERSION, status: 'pass',
  aspects: [{ aspect: 'identity.face', status: 'pass' }], validatedAt: 2_000, ...extra,
});

const motivos = (problemas) => problemas.map((x) => `${x.field}:${x.reason}`).join(' ');

console.log('\n── A · El vocabulario es de TODO Weë, no solo de personajes ──');

check('hay familias de sobra para cubrir los dominios pedidos',
  ['identity', 'appearance', 'outfit', 'object', 'product', 'architecture', 'interior',
    'exterior', 'environment', 'style', 'camera', 'lighting', 'pose', 'action',
    'spatial', 'temporal', 'narrative'].every((f) => FAMILIAS_DE_CONTINUIDAD.includes(f)),
  FAMILIAS_DE_CONTINUIDAD.join(' '));
check('las familias se DERIVAN de los aspectos, no se escriben aparte',
  FAMILIAS_DE_CONTINUIDAD.every((f) => ASPECTOS_DE_CONTINUIDAD.some((a) => a.startsWith(`${f}.`))));
check('todo aspecto es `familia.detalle`: no hay comodines de familia entera',
  ASPECTOS_DE_CONTINUIDAD.every((a) => /^[a-z]+\.[A-Za-z]+$/.test(a)),
  `${ASPECTOS_DE_CONTINUIDAD.length} aspectos`);
check('y nada de fuera entra',
  !esAspectoDeContinuidad('architecture') && !esAspectoDeContinuidad('identity.vibe') && !esAspectoDeContinuidad(7));
check('11) la fuerza sigue siendo semántica, no un número',
  FUERZAS_DE_CONTINUIDAD.join(',') === 'relaxed,standard,strict'
  && !continuidadValida({ preserve: ['identity.face'], strength: 0.82 }));
check('las listas están congeladas', [ASPECTOS_DE_CONTINUIDAD, FUERZAS_DE_CONTINUIDAD, ESTADOS_DE_CONTINUIDAD, RELACIONES_ESPACIALES].every(Object.isFrozen));

console.log('\n── B · Las cinco frases, con el MISMO contrato ──');

const r2 = { preserve: ['identity.face'], anchors: [{ elementId: LUNA, version: 4 }] };
check('2) «conserva la cara»', continuidadValida(r2), motivos(validarContinuidad(r2)));

const r3 = { preserve: ['architecture.geometry', 'architecture.spatialLayout', 'architecture.openings', 'architecture.proportions', 'architecture.materials'], mayChange: ['interior.furniture', 'interior.decoration'], anchors: [{ elementId: CASA, version: 2 }] };
check('3/23) «conserva la arquitectura y cambia solo los muebles»', continuidadValida(r3), motivos(validarContinuidad(r3)));

const r4 = { preserve: ['product.identity', 'product.geometry', 'product.label', 'product.branding'], mayChange: ['environment.background', 'environment.scene'], anchors: [{ elementId: BOTELLA, version: 3 }] };
check('4/25) «mantén esta botella y cambia solo el fondo»', continuidadValida(r4), motivos(validarContinuidad(r4)));

const r5 = { preserve: ['identity.face', 'identity.body', 'identity.hair'], mayChange: ['outfit.clothing', 'outfit.footwear', 'outfit.accessories'], anchors: [{ elementId: LUNA, version: 4 }, { elementId: VESTIDO, version: 1 }] };
check('5/24) «cambia el vestido pero no cambies a Luna»', continuidadValida(r5), motivos(validarContinuidad(r5)));

const rFachada = { preserve: ['architecture.facade', 'architecture.geometry', 'architecture.proportions'], mayChange: ['architecture.openings', 'lighting.type', 'lighting.timeOfDay'] };
check('«conserva la fachada, cambia las ventanas y hazlo de noche»', continuidadValida(rFachada));

const rAccion = { preserve: ['identity.face', 'identity.body', 'outfit.complete', 'environment.scene'], mayChange: ['pose.body', 'action.activity', 'action.movement'] };
check('«misma persona, misma ropa, mismo sitio, otra acción»', continuidadValida(rAccion));

console.log('\n── C · 6) Relaciones espaciales ──');

const rEspacial = {
  preserve: ['spatial.relationships', 'spatial.containment'],
  spatial: [{ subject: LAMPARA, relation: 'above', object: MESA }, { subject: BOTELLA, relation: 'inside', object: CASA }],
};
check('6) se puede exigir «la lámpara encima de la mesa»', continuidadValida(rEspacial), motivos(validarContinuidad(rEspacial)));
check('las ocho relaciones están', RELACIONES_ESPACIALES.length === 8
  && ['next_to', 'behind', 'in_front_of', 'inside', 'above', 'below', 'aligned_with', 'attached_to'].every((k) => RELACIONES_ESPACIALES.includes(k)));
check('un verbo inventado se rechaza',
  validarContinuidad({ preserve: ['spatial.relationships'], spatial: [{ subject: LAMPARA, relation: 'cerquita', object: MESA }] })
    .some((x) => x.reason === 'invalid_relation'));
check('«A al lado de A» se rechaza: no dice nada',
  validarContinuidad({ preserve: ['spatial.relationships'], spatial: [{ subject: MESA, relation: 'next_to', object: MESA }] })
    .some((x) => x.reason === 'self_relation'));
check('y están acotadas',
  validarContinuidad({ preserve: ['spatial.relationships'], spatial: Array.from({ length: MAX_RELACIONES_ESPACIALES + 1 }, (_, i) => ({ subject: `el_a${String(i).padStart(4, '0')}`, relation: 'next_to', object: MESA })) })
    .some((x) => x.reason === 'too_many'));
check('no hay grafo nuevo: una relación son dos ids y un verbo, y viven dentro del requisito',
  !/graph|Graph|nodes|edges/.test(leer('functions/src/core/continuity.ts')));

console.log('\n── D · 7/22) Varios dominios a la vez ──');

const rTodo = {
  preserve: ['identity.face', 'architecture.geometry', 'product.identity', 'style.visual', 'spatial.relationships'],
  mayChange: ['interior.furniture', 'outfit.clothing', 'lighting.timeOfDay'],
  anchors: [{ elementId: LUNA, version: 4 }, { elementId: CASA, version: 2 }, { elementId: BOTELLA, version: 3 }],
  spatial: [{ subject: BOTELLA, relation: 'above', object: MESA }],
  strength: 'strict',
};
check('22) arquitectura + personaje + producto conviven en UN requisito', continuidadValida(rTodo), motivos(validarContinuidad(rTodo)));
check('7) y cada dominio conserva su exigencia por separado',
  exigenciaDe(rTodo, 'identity.face') === 'preserve'
  && exigenciaDe(rTodo, 'architecture.geometry') === 'preserve'
  && exigenciaDe(rTodo, 'product.identity') === 'preserve'
  && exigenciaDe(rTodo, 'interior.furniture') === 'may_change'
  && exigenciaDe(rTodo, 'camera.framing') === 'unspecified');
check('20) y cada anclaje lleva SU versión',
  rTodo.anchors.map((a) => a.version).join(',') === '4,2,3'
  && rTodo.anchors.every((a) => anclajeValido(a)));

console.log('\n── E · preserve / mayChange: lo que C1 decidió, intacto ──');

check('8) preserve + mayChange sin conflicto es válido', continuidadValida({ preserve: ['identity.face'], mayChange: ['outfit.clothing'] }));
check('el MISMO aspecto exigido y liberado se rechaza',
  validarContinuidad({ preserve: ['identity.face'], mayChange: ['identity.face'] }).some((x) => x.reason === 'conflicting_aspect'));
check('9) `unspecified` NO es `may_change`',
  exigenciaDe({ preserve: ['identity.face'] }, 'lighting.timeOfDay') === 'unspecified'
  && exigenciaDe({ preserve: ['identity.face'] }, 'lighting.timeOfDay') !== 'may_change');
check('sin `preserve`, o con `preserve` vacío, no hay requisitos',
  !continuidadValida({ mayChange: ['style.visual'] })
  && validarContinuidad({ preserve: [] }).some((x) => x.reason === 'empty_preserve'));
check('un aspecto repetido se rechaza',
  validarContinuidad({ preserve: ['style.visual', 'style.visual'] }).some((x) => x.reason === 'duplicate_aspect'));
check('la misma cosa anclada dos veces se rechaza',
  validarContinuidad({ preserve: ['identity.face'], anchors: [{ elementId: LUNA, version: 3 }, { elementId: LUNA, version: 4 }] })
    .some((x) => x.reason === 'duplicate_anchor'));

console.log('\n── F · 14) Nada de un proveedor entra aquí ──');

check('14) ni modelo, ni proveedor, ni endpoint, ni clave',
  ['modelId', 'providerId', 'provider', 'model', 'adapter', 'endpoint', 'apiKey', 'token']
    .every((k) => claveProhibidaDeContinuidad(k)));
check('14) ni prompt, ni embedding, ni vector, ni bytes, ni URL',
  ['prompt', 'negativePrompt', 'seed', 'embedding', 'embeddings', 'vector', 'bytes', 'url', 'storageRef']
    .every((k) => claveProhibidaDeContinuidad(k)));
check('14) y un requisito que los lleve se rechaza con motivo',
  validarContinuidad({ preserve: ['style.visual'], modelId: 'x' }).some((x) => x.reason === 'forbidden_key')
  && validarContinuidad({ preserve: ['style.visual'], prompt: 'una casa' }).some((x) => x.reason === 'forbidden_key'));
check('una clave peligrosa se marca, venga de donde venga',
  validarContinuidad(JSON.parse('{"preserve":["style.visual"],"__proto__":{"x":1}}')).some((x) => x.field === '__proto__' && x.reason === 'dangerous_key')
  && validarContinuidad({ preserve: ['style.visual'], constructor: 'x' }).some((x) => x.reason === 'dangerous_key'));
check('el Core de continuidad no nombra a ningún proveedor',
  !/(?<![a-z])(gemini|seedance|openai|anthropic|elevenlabs|flux|minimax|bytedance)(?![a-z])/i
    .test(leer('functions/src/core/continuity.ts')));

console.log('\n── G · 15/16/17) Rechazo ANTES de ejecutar ──');

const soporteCompleto = { preserves: ['identity.face', 'identity.body', 'architecture.geometry'] };
const soportePobre = { preserves: ['style.visual'] };

check('15) lo exigido que nadie sabe hacer se nombra, concreto',
  aspectosSinCubrir({ preserve: ['identity.face', 'architecture.geometry'] }, soportePobre).join(',')
  === 'identity.face,architecture.geometry');
const rechazo = revisarAntesDeEjecutar({ preserve: ['identity.face'] }, soportePobre);
check('15) y se clasifica como PRE_EXECUTION_REJECTED',
  rechazo.status === 'pre_execution_rejected' && rechazo.reason === 'unsupported_aspect'
  && rechazo.missing.join(',') === 'identity.face',
  JSON.stringify(rechazo));
check('si el candidato SÍ lo declara, se puede empezar',
  puedeCumplir({ preserve: ['identity.face', 'identity.body'] }, soporteCompleto)
  && revisarAntesDeEjecutar({ preserve: ['identity.face'] }, soporteCompleto).ok === true);
check('1) sin requisitos no hay nada que rechazar: la continuidad es opcional',
  revisarAntesDeEjecutar(undefined, undefined).ok === true
  && revisarAntesDeEjecutar(undefined, soportePobre).ok === true);
check('lo LIBERADO no se comprueba: da igual si se sabe conservar lo que se autorizó a cambiar',
  revisarAntesDeEjecutar({ preserve: ['style.visual'], mayChange: ['identity.face'] }, soportePobre).ok === true);
check('`strength` no salva un aspecto que nadie sabe hacer: aflojar no es cumplir',
  revisarAntesDeEjecutar({ preserve: ['identity.face'], strength: 'relaxed' }, soportePobre).status === 'pre_execution_rejected');
/*
 * 16 no puede EJECUTAR nada: se comprueba donde está escrito el orden. El
 * conductor resuelve la implementación y solo DESPUÉS crea el trabajo, que es
 * el contrato de F12-D —«el Router va ANTES de crear el trabajo»—.
 */
const CONDUCTOR = leer('functions/src/runtime/conductor.ts');
check('16) el orden está en el código: se resuelve la implementación ANTES de crear el trabajo',
  CONDUCTOR.indexOf('await resolver.resolver(') > 0
  && CONDUCTOR.indexOf('await resolver.resolver(') < CONDUCTOR.indexOf('await crearTrabajo('),
  `resolver=${CONDUCTOR.indexOf('await resolver.resolver(')} crearTrabajo=${CONDUCTOR.indexOf('await crearTrabajo(')}`);
check('17) un rechazo previo y un veredicto FAIL son cosas DISTINTAS, y se distinguen por su forma',
  rechazo.status === 'pre_execution_rejected' && rechazo.aspects === undefined
  && veredictoValido(veredicto({ status: 'fail', aspects: [{ aspect: 'identity.face', status: 'fail' }] }))
  && !ESTADOS_DE_CONTINUIDAD.includes(rechazo.status));

console.log('\n── H · 10/18) El veredicto ──');

const exigeCara = { preserve: ['identity.face'] };
check('10) un aspecto exigido sin comprobar deja el veredicto en `unknown`, jamás en `pass`',
  resumirVeredicto(exigeCara, [{ aspect: 'identity.face', status: 'unknown' }]) === 'unknown'
  && resumirVeredicto(exigeCara, []) === 'unknown');
check('18) validador no disponible = UNKNOWN, con su motivo',
  veredictoValido(veredicto({ status: 'unknown', aspects: [{ aspect: 'identity.face', status: 'unknown', reason: 'validator_unavailable' }] }))
  && resumirVeredicto(exigeCara, [{ aspect: 'identity.face', status: 'unknown', reason: 'validator_unavailable' }]) === 'unknown');
check('un `fail` en lo exigido manda',
  resumirVeredicto({ preserve: ['identity.face', 'style.visual'] },
    [{ aspect: 'identity.face', status: 'fail' }, { aspect: 'style.visual', status: 'pass' }]) === 'fail');
check('un `warn` avisa, no tumba', resumirVeredicto(exigeCara, [{ aspect: 'identity.face', status: 'warn' }]) === 'warn');
check('solo se llega a `pass` con todo lo exigido comprobado y conservado',
  resumirVeredicto(exigeCara, [{ aspect: 'identity.face', status: 'pass', confidence: 'high' }]) === 'pass');
check('un `fail` en lo NO exigido no tumba un resultado ya pagado',
  resumirVeredicto(exigeCara, [{ aspect: 'identity.face', status: 'pass' }, { aspect: 'lighting.timeOfDay', status: 'fail' }]) === 'pass');
check('el veredicto es POR ASPECTO: no hay hueco para una puntuación',
  validarVeredicto(veredicto({ score: 0.82 })).some((x) => x.reason === 'unknown_field'));
check('y puede decir a la vez que la cara va bien y que la geometría falló',
  veredictoValido(veredicto({
    status: 'fail',
    aspects: [
      { aspect: 'identity.face', status: 'pass' },
      { aspect: 'architecture.geometry', status: 'fail', reason: 'differs_from_reference' },
      { aspect: 'lighting.timeOfDay', status: 'unknown', reason: 'not_required' },
    ],
  })));
check('`rompeLaContinuidad` solo es cierto sobre lo EXIGIDO',
  rompeLaContinuidad(exigeCara, { aspect: 'identity.face', status: 'fail' })
  && !rompeLaContinuidad(exigeCara, { aspect: 'outfit.clothing', status: 'fail' }));

console.log('\n── I · 12/13) La costura del Gateway ──');

check('12) unas pistas SIN continuidad siguen funcionando igual que antes',
  leerHints({ quality: 'high', durationSec: 4 }, 'hints').ok === true
  && leerHints({}, 'hints').ok === true && leerHints(undefined, 'hints').ok === true);
check('13) unas pistas CON continuidad también',
  leerHints({ quality: 'high', continuity: { preserve: ['architecture.geometry'] } }, 'hints').ok === true);
const conHints = leerHints({ continuity: r5 }, 'hints');
check('13) y los requisitos llegan enteros al otro lado',
  conHints.ok && JSON.stringify(conHints.hints.continuity) === JSON.stringify(r5));
check('unos requisitos rotos se rechazan en la costura, no a medias',
  leerHints({ continuity: { preserve: ['identity.face'], mayChange: ['identity.face'] } }, 'hints').ok === false
  && leerHints({ continuity: { preserve: ['no.existe'] } }, 'hints').ok === false
  && leerHints({ continuity: { preserve: ['style.visual'], modelId: 'x' } }, 'hints').field === 'hints.continuity');
check('la continuidad es UNA clave de pista, no una tubería nueva',
  /const CLAVES_DE_HINTS = \[[^\]]*'continuity'[^\]]*\];/.test(leer('functions/src/core/gateway.ts'))
  && /continuity\?: ContinuityRequirements;/.test(leer('functions/src/core/gateway.ts')));
check('y el Gateway no aprende el vocabulario: lo delega entero',
  /!continuidadValida\(crudo\.continuity\)/.test(leer('functions/src/core/gateway.ts'))
  && !/ContinuityAspect|architecture\.|identity\.face/.test(leer('functions/src/core/gateway.ts').replace(/\/\*[\s\S]*?\*\//g, ' ')));

console.log('\n── J · 19/21) Propiedad y referencias ──');

check('2) una escena mínima válida', escenaValida(escena()), motivos(validarEscena(escena())));
check('1) un plano mínimo válido', planoValido(plano()), motivos(validarPlano(plano())));
check('19) sin `ownerAccountId` no hay nodo',
  validarPlano({ ...plano(), ownerAccountId: '' }).some((x) => x.reason === 'invalid_owner')
  && validarEscena({ ...escena(), ownerAccountId: undefined }).some((x) => x.reason === 'invalid_owner'));
check('19) un nodo de otra cuenta no es de esta',
  !nodoEsDeLaCuenta(plano(), 'acc_9999') && !nodoEsDeLaCuenta(plano(), undefined) && nodoEsDeLaCuenta(plano(), CUENTA));
check('21) un plano referencia escena, plano anterior, dependencias y su resultado',
  planoValido(plano({ sceneId: 'sc_0009', previousShotId: 'sh_0000', dependsOnShotIds: ['sh_0000'], producedAssetId: 'asset_abcd1234' })));
check('21) y un plano no puede continuar de sí mismo ni depender de sí mismo',
  validarPlano(plano({ previousShotId: 'sh_0001' })).some((x) => x.reason === 'self_reference')
  && validarPlano(plano({ dependsOnShotIds: ['sh_0001'] })).some((x) => x.reason === 'self_reference'));
check('20) el reparto es id MÁS versión, y el nombre no cabe',
  planoValido(plano({ elements: [{ elementId: LUNA, version: 4 }] }))
  && !anclajeValido({ elementId: LUNA }) && !anclajeValido({ elementId: LUNA, version: 4, name: 'Luna' }));
check('las referencias a preparar son la UNIÓN de reparto y anclajes',
  referenciasDelPlano(plano({ elements: [{ elementId: LUNA, version: 4 }], continuity: r3 }))
    .map((r) => `${r.elementId}@${r.version}`).sort().join(' ') === `${CASA}@2 ${LUNA}@4`);
check('13) los seis estados valen y uno inventado no',
  ESTADOS_DE_PLANO.every((e) => planoValido(plano({ state: e })))
  && !planoValido(plano({ state: 'running' })) && !planoValido(plano({ state: 'queued' })));
check('rehacer UN plano es volver a `ready`; de `archived` no se sale',
  puedePasarDePlano('validated', 'ready') && puedePasarDePlano('stale', 'ready')
  && !puedePasarDePlano('archived', 'ready') && TRANSICIONES_DE_PLANO.archived.length === 0);
check('validar viene DESPUÉS de generar',
  puedePasarDePlano('generated', 'validated') && !puedePasarDePlano('ready', 'validated')
  && ESTADOS_DE_PLANO.every((e) => TRANSICIONES_DE_PLANO[e].every((d) => esEstadoDePlano(d))));
check('un plano rechaza campos arbitrarios y el prompt',
  validarPlano(plano({ mood: 'triste' })).some((x) => x.reason === 'unknown_field')
  && claveProhibidaDeNodo('prompt')
  && validarPlano(plano({ prompt: 'Luna entra' })).some((x) => x.reason === 'forbidden_key'));
check('la narrativa es una frase acotada y las dependencias están acotadas',
  !planoValido(plano({ narrative: 'x'.repeat(MAX_NARRATIVA + 1) }))
  && validarPlano(plano({ dependsOnShotIds: Array.from({ length: MAX_DEPENDENCIAS_DE_PLANO + 1 }, (_, i) => `sh_z${String(i).padStart(3, '0')}`) })).some((x) => x.reason === 'too_many')
  && validarPlano(plano({ elements: Array.from({ length: MAX_ELEMENTOS_POR_NODO + 1 }, (_, i) => ({ elementId: `el_y${String(i).padStart(4, '0')}`, version: 1 })) })).some((x) => x.reason === 'too_many'));

console.log('\n── K · Un proyecto entero, de punta a punta ──');

const sc = escena({ sceneId: 'sc_0009', location: { elementId: CASA, version: 2 }, creative: { version: 1, lighting: { type: 'dramatic' } } });
const p1 = plano({ shotId: 'sh_0101', sceneId: 'sc_0009', order: 0, state: 'ready', elements: [{ elementId: LUNA, version: 4 }], continuity: r5 });
const p2 = plano({
  shotId: 'sh_0102', sceneId: 'sc_0009', order: 1, state: 'generated',
  previousShotId: 'sh_0101', dependsOnShotIds: ['sh_0101'],
  elements: [{ elementId: LUNA, version: 4 }, { elementId: CASA, version: 2 }],
  continuity: rTodo, producedAssetId: 'asset_a71bbd0518dd4c27a976e36d70087f3b',
  verdict: veredicto({ status: 'warn', aspects: [{ aspect: 'identity.face', status: 'pass' }, { aspect: 'architecture.geometry', status: 'warn' }] }),
});
check('una escena y dos planos encadenados, todo válido',
  escenaValida(sc) && planoValido(p1) && planoValido(p2), motivos([...validarEscena(sc), ...validarPlano(p1), ...validarPlano(p2)]));
check('y sobreviven a guardarse y releerse',
  planoValido(JSON.parse(JSON.stringify(p2))) && escenaValida(JSON.parse(JSON.stringify(sc)))
  && continuidadValida(JSON.parse(JSON.stringify(rTodo))) && veredictoValido(JSON.parse(JSON.stringify(veredicto()))));

console.log('\n── L · La capa sigue siendo SOLO contratos ──');

const FUENTES = ['functions/src/core/continuity.ts', 'functions/src/core/shot.ts'];
const src = FUENTES.map((f) => leer(f)).join('\n');
check('no hay Firestore, ni red, ni disco, ni reloj, ni azar',
  !/firebase|firestore|node:fs|fetch\(|Date\.now\(|Math\.random\(|new Date\(/.test(src));
check('no se importa nada de fuera del Core',
  FUENTES.every((f) => [...leer(f).matchAll(/from '([^']+)'/g)].every((m) => m[1].startsWith('./'))));
check('no hay segundo motor: ni router, ni planner, ni job, ni gateway propios',
  !/crearRouter|crearJobEngine|crearGateway|crearPlanner|JobStore|QueuePort/.test(src));
check('los dos contratos siguen registrados y exportados',
  CONTINUITY_CONTRACT_VERSION === '1.0' && SHOT_CONTRACT_VERSION === '1.0'
  && /export \* from '\.\/continuity'/.test(leer('functions/src/core/index.ts'))
  && /export \* from '\.\/shot'/.test(leer('functions/src/core/index.ts')));
check('esta suite está en la cadena de `npm test`', /continuidad\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
