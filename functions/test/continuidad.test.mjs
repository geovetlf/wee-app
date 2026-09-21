/**
 * WEË CONTINUITY — C1: VOCABULARIO, CONTRATOS Y VALIDADORES PUROS.
 *
 * ── Qué se mide aquí ────────────────────────────────────────────────────────
 *
 * Que se pueda DECIR «cambia la ropa pero no cambies a Luna» sin ambigüedad, y
 * que lo que no se dijo no se pueda leer como un permiso.
 *
 * C1 no genera nada, no valida ninguna imagen y no habla con nadie. Así que lo
 * único que hay que probar —y todo lo que hay que probar— es que el vocabulario
 * cierra: que lo válido pasa, que lo inválido rompe, y que las tres reglas
 * duras del diseño se sostienen:
 *
 *   1 · `unknown` NUNCA es `pass`.
 *   2 · lo que nadie dijo está `unspecified`, que tampoco es `pass`.
 *   3 · exigir y liberar el mismo aspecto es una contradicción, no un matiz.
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
  ASPECTOS_DE_CONTINUIDAD, FUERZAS_DE_CONTINUIDAD, ESTADOS_DE_CONTINUIDAD,
  CONTINUITY_CONTRACT_VERSION, SHOT_CONTRACT_VERSION,
  esAspectoDeContinuidad, validarContinuidad, continuidadValida,
  exigenciaDe, resumirVeredicto, rompeLaContinuidad,
  validarVeredicto, veredictoValido, anclajeValido, claveProhibidaDeContinuidad,
  ESTADOS_DE_PLANO, TRANSICIONES_DE_PLANO, puedePasarDePlano, esEstadoDePlano,
  validarEscena, escenaValida, validarPlano, planoValido,
  nodoEsDeLaCuenta, referenciasDelPlano, claveProhibidaDeNodo,
  MAX_NARRATIVA, MAX_DEPENDENCIAS_DE_PLANO, MAX_ELEMENTOS_POR_NODO,
} = core;

/* ── Fixtures ─────────────────────────────────────────────────────────────── */

const CUENTA = 'acc_0001';
const LUNA = 'el_luna_0001';
const TRAJE = 'el_traje_0001';
const LABORATORIO = 'el_lab_0001';

const escena = (extra = {}) => ({
  contract: SHOT_CONTRACT_VERSION,
  sceneId: 'sc_0001',
  projectId: 'pr_0001',
  ownerAccountId: CUENTA,
  version: 1,
  order: 0,
  createdAt: 1_000,
  updatedAt: 1_000,
  ...extra,
});

const plano = (extra = {}) => ({
  contract: SHOT_CONTRACT_VERSION,
  shotId: 'sh_0001',
  projectId: 'pr_0001',
  ownerAccountId: CUENTA,
  version: 1,
  order: 0,
  state: 'draft',
  createdAt: 1_000,
  updatedAt: 1_000,
  ...extra,
});

const motivos = (problemas) => problemas.map((x) => `${x.field}:${x.reason}`).join(' ');

console.log('\n── A · El vocabulario cierra ──');

check('los diecisiete aspectos están, y la lista es la unión',
  ASPECTOS_DE_CONTINUIDAD.length === 17
  && ['identity.face', 'identity.hair', 'identity.body', 'identity.appearance',
    'appearance.outfit', 'appearance.accessories', 'appearance.colors', 'style',
    'scene.location', 'scene.environment', 'scene.lighting', 'scene.spatial',
    'objects.presence', 'objects.position', 'objects.state', 'temporal', 'narrative']
    .every((a) => ASPECTOS_DE_CONTINUIDAD.includes(a)),
  `${ASPECTOS_DE_CONTINUIDAD.length} aspectos`);
check('y nada de fuera entra', !esAspectoDeContinuidad('identity.vibe') && !esAspectoDeContinuidad('') && !esAspectoDeContinuidad(7));
check('la fuerza es semántica, no un número', FUERZAS_DE_CONTINUIDAD.join(',') === 'relaxed,standard,strict');
check('y un número no cuela como fuerza', !continuidadValida({ preserve: ['style'], strength: 0.82 }));
check('las listas están congeladas: nadie las amplía en caliente',
  Object.isFrozen(ASPECTOS_DE_CONTINUIDAD) && Object.isFrozen(FUERZAS_DE_CONTINUIDAD) && Object.isFrozen(ESTADOS_DE_CONTINUIDAD));

console.log('\n── B · Requisitos: preserve, mayChange y sus conflictos ──');

check('7) unos requisitos mínimos válidos', continuidadValida({ preserve: ['identity.face'] }));
check('8) con `mayChange` también', continuidadValida({ preserve: ['identity.face'], mayChange: ['appearance.outfit'] }));
check('sin `preserve` no hay requisitos', !continuidadValida({ mayChange: ['style'] }));
check('y con `preserve` vacío tampoco: exigir nada no es exigir',
  validarContinuidad({ preserve: [] }).some((x) => x.reason === 'empty_preserve'));
check('10) el MISMO aspecto exigido y liberado se rechaza',
  validarContinuidad({ preserve: ['identity.face'], mayChange: ['identity.face'] })
    .some((x) => x.reason === 'conflicting_aspect'));
check('un aspecto repetido dentro de una lista se rechaza',
  validarContinuidad({ preserve: ['style', 'style'] }).some((x) => x.reason === 'duplicate_aspect'));
check('un solapamiento de SIGNIFICADO no se rechaza: el Core no adivina intenciones',
  continuidadValida({ preserve: ['identity.appearance'], mayChange: ['appearance.outfit'] }),
  'identity.appearance + appearance.outfit conviven');
check('16) un campo que no existe en el contrato se rechaza',
  validarContinuidad({ preserve: ['style'], urgencia: 'alta' }).some((x) => x.reason === 'unknown_field'));
/*
 * `JSON.parse` sí crea `__proto__` como propiedad PROPIA —un literal no—, así
 * que esto es lo que llegaría de verdad desde un cuerpo de petición.
 */
const conProto = validarContinuidad(JSON.parse('{"preserve":["style"],"__proto__":{"x":1}}'));
const conConstructor = validarContinuidad({ preserve: ['style'], constructor: 'x' });
check('y una clave peligrosa se marca como tal, venga de donde venga',
  conProto.some((x) => x.field === '__proto__' && x.reason === 'dangerous_key')
  && conConstructor.some((x) => x.field === 'constructor' && x.reason === 'dangerous_key'),
  motivos([...conProto, ...conConstructor]));
check('un prompt NO puede viajar dentro de unos requisitos',
  claveProhibidaDeContinuidad('prompt') && claveProhibidaDeContinuidad('negativePrompt')
  && validarContinuidad({ preserve: ['style'], prompt: 'una taza' }).some((x) => x.reason === 'forbidden_key'));
check('ni un embedding, ni un modelo, ni una URL',
  ['embedding', 'vector', 'modelId', 'provider', 'url', 'storageRef', 'apiKey']
    .every((k) => claveProhibidaDeContinuidad(k)));

console.log('\n── C · 12) elementId + version: el corazón ──');

check('12) un anclaje es un id MÁS una versión', anclajeValido({ elementId: LUNA, version: 3 }));
check('sin versión no vale: «la misma Luna» no significa nada sin ella',
  !anclajeValido({ elementId: LUNA }));
check('la versión es un entero desde 1', !anclajeValido({ elementId: LUNA, version: 0 })
  && !anclajeValido({ elementId: LUNA, version: 1.5 }) && !anclajeValido({ elementId: LUNA, version: -3 }));
check('4) un id corto o con forma rara se rechaza',
  !anclajeValido({ elementId: 'ab', version: 1 }) && !anclajeValido({ elementId: 'el luna!', version: 1 }));
check('el NOMBRE no es la fuente de verdad: no hay sitio donde ponerlo',
  !anclajeValido({ elementId: LUNA, version: 3, name: 'Luna' }));
check('la misma cosa anclada dos veces es una orden imposible',
  validarContinuidad({ preserve: ['identity.face'], anchors: [{ elementId: LUNA, version: 3 }, { elementId: LUNA, version: 4 }] })
    .some((x) => x.reason === 'duplicate_anchor'));

console.log('\n── D · 9) UNKNOWN nunca es PASS ──');

const exigeCara = { preserve: ['identity.face'] };

check('9) un aspecto exigido que no se pudo comprobar deja el veredicto en `unknown`',
  resumirVeredicto(exigeCara, [{ aspect: 'identity.face', status: 'unknown', reason: 'validator_unavailable' }]) === 'unknown');
check('9) y un aspecto exigido SIN veredicto también: no comprobar no es aprobar',
  resumirVeredicto(exigeCara, []) === 'unknown');
check('un `fail` en lo exigido manda sobre todo lo demás',
  resumirVeredicto({ preserve: ['identity.face', 'style'] }, [
    { aspect: 'identity.face', status: 'fail' },
    { aspect: 'style', status: 'pass' },
  ]) === 'fail');
check('un `warn` en lo exigido avisa, no tumba',
  resumirVeredicto(exigeCara, [{ aspect: 'identity.face', status: 'warn' }]) === 'warn');
check('y solo se llega a `pass` con todo lo exigido comprobado y conservado',
  resumirVeredicto(exigeCara, [{ aspect: 'identity.face', status: 'pass', confidence: 'high' }]) === 'pass');
check('un `fail` en algo que NADIE pidió conservar no tumba un resultado ya pagado',
  resumirVeredicto(exigeCara, [
    { aspect: 'identity.face', status: 'pass' },
    { aspect: 'scene.lighting', status: 'fail' },
  ]) === 'pass');
check('sin requisitos no hay nada que aprobar: `unknown`',
  resumirVeredicto(undefined, [{ aspect: 'identity.face', status: 'pass' }]) === 'unknown');
check('`rompeLaContinuidad` solo es cierto sobre lo EXIGIDO',
  rompeLaContinuidad(exigeCara, { aspect: 'identity.face', status: 'fail' })
  && !rompeLaContinuidad(exigeCara, { aspect: 'appearance.outfit', status: 'fail' }));
check('lo que nadie dijo sale `unspecified`, que no es permiso',
  exigenciaDe(exigeCara, 'scene.lighting') === 'unspecified'
  && exigenciaDe(undefined, 'identity.face') === 'unspecified');
check('y lo liberado sale `may_change`',
  exigenciaDe({ preserve: ['identity.face'], mayChange: ['appearance.outfit'] }, 'appearance.outfit') === 'may_change');

console.log('\n── E · El veredicto, como contrato ──');

const veredicto = (extra = {}) => ({
  contract: CONTINUITY_CONTRACT_VERSION,
  status: 'pass',
  aspects: [{ aspect: 'identity.face', status: 'pass' }],
  validatedAt: 2_000,
  ...extra,
});

check('un veredicto mínimo válido', veredictoValido(veredicto()));
check('el mismo aspecto juzgado dos veces se rechaza',
  validarVeredicto(veredicto({ aspects: [{ aspect: 'style', status: 'pass' }, { aspect: 'style', status: 'fail' }] }))
    .some((x) => x.reason === 'duplicate_aspect'));
check('una confianza inventada se rechaza',
  !veredictoValido(veredicto({ aspects: [{ aspect: 'style', status: 'pass', confidence: 'absoluta' }] })));
check('y la confianza puede faltar: no saber cuánto te fías es una respuesta',
  veredictoValido(veredicto({ aspects: [{ aspect: 'style', status: 'pass' }] })));
check('un motivo fuera del vocabulario se rechaza',
  !veredictoValido(veredicto({ aspects: [{ aspect: 'style', status: 'pass', reason: 'porque si' }] })));
check('no hay hueco para una puntuación: `score` es un campo desconocido',
  validarVeredicto(veredicto({ score: 0.82 })).some((x) => x.reason === 'unknown_field'));

console.log('\n── F · 2) La escena ──');

check('2) una escena mínima válida', escenaValida(escena()), motivos(validarEscena(escena())));
check('3) sin `ownerAccountId` no hay escena',
  validarEscena({ ...escena(), ownerAccountId: undefined }).some((x) => x.reason === 'invalid_owner'));
check('una escena puede decir dónde ocurre, con versión',
  escenaValida(escena({ location: { elementId: LABORATORIO, version: 2 } })));
check('la luz va por los parámetros creativos, no por un campo nuevo',
  escenaValida(escena({ creative: { version: 1, lighting: { type: 'dramatic' } } }))
  && validarEscena(escena({ lighting: 'rojo' })).some((x) => x.reason === 'unknown_field'));
check('6) el orden es un entero desde 0',
  escenaValida(escena({ order: 0 })) && escenaValida(escena({ order: 12 }))
  && !escenaValida(escena({ order: -1 })) && !escenaValida(escena({ order: 1.5 })));
check('5) la versión es un entero desde 1',
  !escenaValida(escena({ version: 0 })) && !escenaValida(escena({ version: 2.5 })) && escenaValida(escena({ version: 7 })));
check('la narrativa es UNA frase acotada, no un guion',
  escenaValida(escena({ narrative: 'Luna acaba de descubrir la señal' }))
  && !escenaValida(escena({ narrative: 'x'.repeat(MAX_NARRATIVA + 1) })));

console.log('\n── G · 1) El plano ──');

check('1) un plano mínimo válido', planoValido(plano()), motivos(validarPlano(plano())));
check('3) sin `ownerAccountId` no hay plano',
  validarPlano({ ...plano(), ownerAccountId: '' }).some((x) => x.reason === 'invalid_owner'));
check('13) los seis estados valen',
  ESTADOS_DE_PLANO.every((e) => planoValido(plano({ state: e }))),
  ESTADOS_DE_PLANO.join(','));
check('14) un estado inventado no',
  !planoValido(plano({ state: 'running' })) && !planoValido(plano({ state: 'queued' })),
  'running y queued son del Job Engine, no de aquí');
check('16) un campo arbitrario se rechaza',
  validarPlano(plano({ mood: 'triste' })).some((x) => x.reason === 'unknown_field'));
check('el PROMPT no cabe en un plano, que es lo que alguien intentará el primer día',
  claveProhibidaDeNodo('prompt')
  && validarPlano(plano({ prompt: 'Luna entra en la habitación' })).some((x) => x.reason === 'forbidden_key'));
check('11) las dependencias son ids de planos, sin repetir y sin uno mismo',
  planoValido(plano({ dependsOnShotIds: ['sh_0002', 'sh_0003'] }))
  && validarPlano(plano({ dependsOnShotIds: ['sh_0001'] })).some((x) => x.reason === 'self_reference')
  && validarPlano(plano({ dependsOnShotIds: ['sh_0002', 'sh_0002'] })).some((x) => x.reason === 'duplicate_binding'));
check('y están acotadas',
  validarPlano(plano({ dependsOnShotIds: Array.from({ length: MAX_DEPENDENCIAS_DE_PLANO + 1 }, (_, i) => `sh_x${String(i).padStart(3, '0')}`) }))
    .some((x) => x.reason === 'too_many'));
check('un plano no puede continuar de sí mismo',
  validarPlano(plano({ previousShotId: 'sh_0001' })).some((x) => x.reason === 'self_reference'));
check('no hay `nextShotId`: una segunda verdad que podría contradecir a la primera',
  validarPlano(plano({ nextShotId: 'sh_0002' })).some((x) => x.reason === 'unknown_field'));
check('el reparto está acotado y sin repetidos',
  validarPlano(plano({ elements: [{ elementId: LUNA, version: 1 }, { elementId: LUNA, version: 2 }] }))
    .some((x) => x.reason === 'duplicate_binding')
  && validarPlano(plano({ elements: Array.from({ length: MAX_ELEMENTOS_POR_NODO + 1 }, (_, i) => ({ elementId: `el_x${String(i).padStart(4, '0')}`, version: 1 })) }))
    .some((x) => x.reason === 'too_many'));
check('unos requisitos rotos rompen el plano que los lleva',
  validarPlano(plano({ continuity: { preserve: ['identity.face'], mayChange: ['identity.face'] } }))
    .some((x) => x.reason === 'invalid_continuity'));
check('y un veredicto roto también',
  validarPlano(plano({ verdict: { contract: '9.9', status: 'pass', aspects: [], validatedAt: 1 } }))
    .some((x) => x.reason === 'invalid_verdict'));

console.log('\n── H · Las transiciones ──');

check('desde `archived` no se sale',
  TRANSICIONES_DE_PLANO.archived.length === 0 && !puedePasarDePlano('archived', 'ready'));
check('rehacer UN plano es volver a `ready` desde donde estuviera',
  puedePasarDePlano('generated', 'ready') && puedePasarDePlano('validated', 'ready') && puedePasarDePlano('stale', 'ready'));
check('un borrador no puede estar generado sin pasar por listo',
  !puedePasarDePlano('draft', 'generated') && puedePasarDePlano('draft', 'ready') && puedePasarDePlano('ready', 'generated'));
check('validar viene DESPUÉS de generar, nunca antes',
  puedePasarDePlano('generated', 'validated') && !puedePasarDePlano('ready', 'validated'));
check('y `stale` no es un fallo: se llega desde un resultado bueno',
  puedePasarDePlano('generated', 'stale') && puedePasarDePlano('validated', 'stale'));
check('todo estado declarado tiene su fila', ESTADOS_DE_PLANO.every((e) => Array.isArray(TRANSICIONES_DE_PLANO[e])));
check('y todo destino declarado es un estado que existe',
  ESTADOS_DE_PLANO.every((e) => TRANSICIONES_DE_PLANO[e].every((d) => esEstadoDePlano(d))));

console.log('\n── I · Propiedad ──');

check('un nodo de otra cuenta no es de esta', !nodoEsDeLaCuenta(plano(), 'acc_9999'));
check('y sin cuenta con la que comparar, tampoco',
  !nodoEsDeLaCuenta(plano(), undefined) && !nodoEsDeLaCuenta(plano(), '') && !nodoEsDeLaCuenta(undefined, CUENTA));
check('el suyo sí', nodoEsDeLaCuenta(plano(), CUENTA));

console.log('\n── J · Las cinco frases que había que poder decir ──');

const p1 = plano({
  shotId: 'sh_0101', order: 0, state: 'ready',
  elements: [{ elementId: LUNA, version: 3 }],
  continuity: { preserve: ['identity.face', 'identity.hair'], anchors: [{ elementId: LUNA, version: 3 }], strength: 'strict' },
});
check('«la misma Luna, versión 3, conservando la cara»', planoValido(p1), motivos(validarPlano(p1)));

const p2 = plano({
  shotId: 'sh_0102', order: 1, previousShotId: 'sh_0101', state: 'ready',
  elements: [{ elementId: LUNA, version: 3 }, { elementId: TRAJE, version: 2 }],
  continuity: { preserve: ['identity.face', 'identity.hair', 'identity.body'], mayChange: ['appearance.outfit', 'appearance.colors'] },
});
check('«cambia la ropa pero no cambies a Luna»', planoValido(p2), motivos(validarPlano(p2)));
check('   y la ropa queda liberada de verdad',
  exigenciaDe(p2.continuity, 'appearance.outfit') === 'may_change'
  && exigenciaDe(p2.continuity, 'identity.face') === 'preserve');

const p3 = plano({
  shotId: 'sh_0103', order: 2, state: 'ready',
  continuity: { preserve: ['identity.face'], mayChange: ['style'] },
});
check('«cambia el estilo pero la identidad permanece»', planoValido(p3));
check('   y un cambio de estilo NO rompe nada',
  !rompeLaContinuidad(p3.continuity, { aspect: 'style', status: 'fail' })
  && resumirVeredicto(p3.continuity, [{ aspect: 'identity.face', status: 'pass' }, { aspect: 'style', status: 'fail' }]) === 'pass');

const sc = escena({ sceneId: 'sc_0009', location: { elementId: LABORATORIO, version: 1 }, creative: { version: 1, lighting: { type: 'dramatic' } } });
const p4 = plano({
  shotId: 'sh_0104', sceneId: 'sc_0009', order: 3, state: 'ready',
  continuity: { preserve: ['scene.location'], mayChange: ['scene.lighting'] },
});
check('«el mismo lugar pero de noche»', escenaValida(sc) && planoValido(p4), motivos(validarPlano(p4)));
check('   el sitio se exige y la luz se libera',
  exigenciaDe(p4.continuity, 'scene.location') === 'preserve'
  && exigenciaDe(p4.continuity, 'scene.lighting') === 'may_change');

const p5 = plano({
  shotId: 'sh_0105', order: 4, state: 'generated',
  previousShotId: 'sh_0104', dependsOnShotIds: ['sh_0104'],
  producedAssetId: 'asset_a71bbd0518dd4c27a976e36d70087f3b',
  elements: [{ elementId: LUNA, version: 3 }],
  continuity: { preserve: ['identity.face', 'scene.spatial'], anchors: [{ elementId: TRAJE, version: 2 }] },
});
check('«continúa desde el último plano»', planoValido(p5), motivos(validarPlano(p5)));
check('   y las referencias que hay que preparar son la UNIÓN de reparto y anclajes',
  referenciasDelPlano(p5).map((r) => `${r.elementId}@${r.version}`).sort().join(' ') === `${LUNA}@3 ${TRAJE}@2`,
  referenciasDelPlano(p5).map((r) => `${r.elementId}@${r.version}`).join(' '));

console.log('\n── K · 15) Sobrevivir a un viaje de ida y vuelta ──');

const ida = JSON.parse(JSON.stringify(p5));
check('15) un plano guardado y releído sigue siendo válido', planoValido(ida) && JSON.stringify(ida) === JSON.stringify(p5));
check('15) y una escena también', escenaValida(JSON.parse(JSON.stringify(sc))));
check('15) unos requisitos y un veredicto, igual',
  continuidadValida(JSON.parse(JSON.stringify(p5.continuity))) && veredictoValido(JSON.parse(JSON.stringify(veredicto()))));

console.log('\n── L · C1 es SOLO contratos ──');

const FUENTES = ['functions/src/core/continuity.ts', 'functions/src/core/shot.ts'];
const src = FUENTES.map((f) => leer(f)).join('\n');

check('no hay Firestore, ni red, ni disco, ni reloj, ni azar',
  !/firebase|firestore|node:fs|fetch\(|Date\.now\(|Math\.random\(|new Date\(/.test(src));
check('no se importa nada de fuera del Core',
  FUENTES.every((f) => [...leer(f).matchAll(/from '([^']+)'/g)].every((m) => m[1].startsWith('./'))),
  'solo ./');
check('y no se ha tocado nada de lo cerrado',
  !/ExecutionHints/.test(src) && !/ProjectItemKind/.test(src) && !/CoreCapabilityId/.test(src),
  'ni hints, ni project items, ni catálogo — eso es C2+');
check('los dos contratos están registrados y exportados',
  CONTINUITY_CONTRACT_VERSION === '1.0' && SHOT_CONTRACT_VERSION === '1.0'
  && /export \* from '\.\/continuity'/.test(leer('functions/src/core/index.ts'))
  && /export \* from '\.\/shot'/.test(leer('functions/src/core/index.ts')));
check('esta suite está en la cadena de `npm test`', /continuidad\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
