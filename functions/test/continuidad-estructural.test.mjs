/**
 * WEË CONTINUITY — C4: LA COMPROBACIÓN QUE SE HACE SIN MIRAR NADA.
 *
 * ── Lo que esta suite existe para no dejar que se confunda ──────────────────
 *
 *     ESTRUCTURAL PASS  ≠  VISUAL PASS
 *
 * Un `pass` de C4 dice «el requisito tiene a qué agarrarse y lo guardado
 * cuadra». No dice, ni puede decir, que el rostro se parezca. Hay un test
 * dedicado solo a demostrar esa diferencia, porque es la que separa esta fase
 * de C7 y la que sería más fácil de perder.
 *
 * Y las tres reglas de siempre siguen mandando: `unknown` nunca es `pass`, el
 * silencio no es permiso, y lo que no se miró no se aprueba.
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

let failures = 0;
let n = 0;
const check = (name, cond, extra = '') => {
  n++;
  console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const core = lib('core/index.js');
const {
  SHOT_CONTRACT_VERSION, CONTINUITY_CONTRACT_VERSION, ASPECTOS_DE_CONTINUIDAD,
  revisarEstructura, revisarCambioDePlano, evidenciaQuePide, familiasSinEvidencia,
  aspectosSinEvidencia, EVIDENCIA_POR_FAMILIA, familiaDelAspecto,
  revisarAntesDeEjecutar, resumirVeredicto, veredictoValido,
} = core;

const A = 'cuentaA';
const B = 'cuentaB';
const HOY = 1_800_000_000_000;

const LUNA = 'el_luna_0001';
const CASA = 'el_casa_0001';
const BOTELLA = 'el_botella_001';
const MESA = 'el_mesa_0001';
const ASSET = 'asset_abcd1234';

const plano = (extra = {}) => ({
  contract: SHOT_CONTRACT_VERSION, shotId: 'sh_0001', projectId: 'pr_0001',
  ownerAccountId: A, version: 1, order: 0, state: 'draft',
  createdAt: HOY, updatedAt: HOY, ...extra,
});
const escena = (extra = {}) => ({
  contract: SHOT_CONTRACT_VERSION, sceneId: 'sc_0001', projectId: 'pr_0001',
  ownerAccountId: A, version: 1, order: 0, createdAt: HOY, updatedAt: HOY, ...extra,
});
const ficha = (id, extra = {}) => ({ elementId: id, ownerAccountId: A, version: 4, status: 'active', ...extra });
const ctx = (extra = {}) => ({ accountId: A, shot: plano(), elements: [], ...extra });

const rev = (extra = {}) => revisarEstructura(ctx(extra), HOY + 1);
const deAspecto = (r, a) => r.verdict.aspects.find((x) => x.aspect === a);
const motivos = (r) => r.problems.map((p) => `${p.scope}:${p.reason}${p.id ? `(${p.id})` : ''}`).join(' ');

console.log('\n── A · La tabla de evidencia, completa y sin huecos ──');

check('toda familia del vocabulario tiene declarada su evidencia',
  familiasSinEvidencia().length === 0, familiasSinEvidencia().join(',') || 'ninguna suelta');
check('las familias que se anclan a algo piden `element`',
  ['identity', 'appearance', 'outfit', 'object', 'product', 'architecture', 'interior', 'exterior', 'environment']
    .every((f) => EVIDENCIA_POR_FAMILIA[f] === 'element'));
check('lo espacial pide relaciones y lo temporal pide el plano anterior',
  EVIDENCIA_POR_FAMILIA.spatial === 'spatial' && EVIDENCIA_POR_FAMILIA.temporal === 'previous');
check('y lo que NO se puede mirar sin ver el resultado lo dice',
  ['style', 'camera', 'lighting', 'pose', 'action', 'narrative'].every((f) => EVIDENCIA_POR_FAMILIA[f] === 'none'));
check('la familia sale del propio aspecto, no de una segunda lista',
  familiaDelAspecto('architecture.geometry') === 'architecture'
  && ASPECTOS_DE_CONTINUIDAD.every((a) => evidenciaQuePide(a) !== undefined));
check('se puede preguntar de antemano qué NO se va a poder comprobar',
  aspectosSinEvidencia({ preserve: ['identity.face', 'style.visual', 'lighting.type'] }).join(',')
  === 'style.visual,lighting.type');

console.log('\n── B · 1/8/9/10 · Las reglas que no se tocan ──');

check('1) sin requisitos, el estado válido no tiene nada que reprochar',
  rev().ok === true && rev().problems.length === 0 && rev().verdict.status === 'unknown',
  `status=${rev().verdict.status}`);
check('1) y el veredicto sigue siendo un `ContinuityVerdict` de C1, no otro resultado',
  veredictoValido(rev().verdict) && rev().verdict.contract === CONTINUITY_CONTRACT_VERSION);
const soloLiberado = rev({ shot: plano({ elements: [{ elementId: LUNA, version: 4 }], continuity: { preserve: ['identity.face'], mayChange: ['outfit.clothing'] } }), elements: [ficha(LUNA)] });
check('8) `mayChange` no exige ninguna referencia', deAspecto(soloLiberado, 'outfit.clothing').status === 'unknown'
  && deAspecto(soloLiberado, 'outfit.clothing').reason === 'change_allowed');
check('9) y lo liberado NO decide el resumen: solo cuenta lo exigido',
  soloLiberado.verdict.status === 'pass', soloLiberado.verdict.status);
const sinDecir = rev({ shot: plano({ continuity: { preserve: ['identity.face'] } }), elements: [ficha(LUNA)] });
check('9) un aspecto que nadie mencionó no aparece como permitido',
  sinDecir.verdict.aspects.every((x) => x.aspect !== 'lighting.type'));
check('10) lo que no se puede mirar sale `unknown`, y `unknown` no es `pass`',
  deAspecto(rev({ shot: plano({ continuity: { preserve: ['style.visual'] } }) }), 'style.visual').status === 'unknown'
  && rev({ shot: plano({ continuity: { preserve: ['style.visual'] } }) }).verdict.status === 'unknown');

console.log('\n── C · 2..7 · Preservar, con referencia y sin ella ──');

const conLuna = { shot: plano({ elements: [{ elementId: LUNA, version: 4 }], continuity: { preserve: ['identity.face'] } }), elements: [ficha(LUNA)] };
check('2) PRESERVE face con su referencia → `pass` ESTRUCTURAL',
  deAspecto(rev(conLuna), 'identity.face').status === 'pass' && rev(conLuna).verdict.status === 'pass');
check('3) PRESERVE face SIN referencia → `fail`, con su motivo',
  deAspecto(rev({ shot: plano({ continuity: { preserve: ['identity.face'] } }) }), 'identity.face').status === 'fail'
  && deAspecto(rev({ shot: plano({ continuity: { preserve: ['identity.face'] } }) }), 'identity.face').reason === 'reference_unavailable');
const conCasa = { shot: plano({ elements: [{ elementId: CASA, version: 2 }], continuity: { preserve: ['architecture.geometry', 'architecture.spatialLayout'] } }), elements: [ficha(CASA, { version: 2 })] };
check('4) PRESERVE architecture.geometry con referencia → `pass`', rev(conCasa).verdict.status === 'pass');
const conBotella = { shot: plano({ elements: [{ elementId: BOTELLA, version: 3 }], continuity: { preserve: ['product.identity', 'product.label'] } }), elements: [ficha(BOTELLA, { version: 3 })] };
check('5) PRESERVE product.identity con referencia → `pass`', rev(conBotella).verdict.status === 'pass');
const conRopa = { shot: plano({ elements: [{ elementId: LUNA, version: 4 }], continuity: { preserve: ['outfit.clothing'] } }), elements: [ficha(LUNA)] };
check('6) PRESERVE outfit con referencia → `pass`', rev(conRopa).verdict.status === 'pass');

console.log('\n── D · 20/30..33 · Multidominio ──');

const todo = {
  shot: plano({
    elements: [{ elementId: LUNA, version: 4 }, { elementId: CASA, version: 2 }, { elementId: BOTELLA, version: 3 }],
    continuity: {
      preserve: ['identity.face', 'architecture.geometry', 'product.identity', 'object.position', 'environment.location'],
      mayChange: ['outfit.clothing', 'lighting.type'],
    },
  }),
  elements: [ficha(LUNA), ficha(CASA, { version: 2 }), ficha(BOTELLA, { version: 3 })],
};
check('7/20/30) personaje + arquitectura + producto + objeto + entorno, en UN requisito → `pass`',
  rev(todo).verdict.status === 'pass' && rev(todo).ok === true, motivos(rev(todo)));
check('31) arquitectura preservada y mobiliario liberado, sin conflicto',
  rev({ shot: plano({ elements: [{ elementId: CASA, version: 2 }], continuity: { preserve: ['architecture.geometry'], mayChange: ['interior.furniture'] } }), elements: [ficha(CASA, { version: 2 })] }).verdict.status === 'pass');
check('32) identidad preservada y ropa liberada, sin conflicto',
  rev({ shot: plano({ elements: [{ elementId: LUNA, version: 4 }], continuity: { preserve: ['identity.face'], mayChange: ['outfit.clothing'] } }), elements: [ficha(LUNA)] }).verdict.status === 'pass');
check('33) producto preservado y fondo liberado, sin conflicto',
  rev({ shot: plano({ elements: [{ elementId: BOTELLA, version: 3 }], continuity: { preserve: ['product.identity'], mayChange: ['environment.background'] } }), elements: [ficha(BOTELLA, { version: 3 })] }).verdict.status === 'pass');

console.log('\n── E · 11..13 · Elemento: existencia, versión y dueño ──');

const noEsta = rev({ shot: plano({ elements: [{ elementId: LUNA, version: 4 }], continuity: { preserve: ['identity.face'] } }), elements: [], missing: [LUNA] });
check('11) un elemento que no vino se reprocha y su aspecto falla',
  noEsta.problems.some((p) => p.scope === 'element' && p.reason === 'reference_missing' && p.id === LUNA)
  && deAspecto(noEsta, 'identity.face').status === 'fail', motivos(noEsta));
const vFutura = rev({ shot: plano({ elements: [{ elementId: LUNA, version: 9 }], continuity: { preserve: ['identity.face'] } }), elements: [ficha(LUNA, { version: 4 })] });
check('12) anclar una versión que no ha ocurrido se reprocha',
  vFutura.problems.some((p) => p.reason === 'version_unavailable' && p.id === LUNA), motivos(vFutura));
check('12) y NO se sube a la última en silencio: el aspecto falla',
  deAspecto(vFutura, 'identity.face').status === 'fail');
check('12) pero una versión VIEJA sigue valiendo',
  rev({ shot: plano({ elements: [{ elementId: LUNA, version: 2 }], continuity: { preserve: ['identity.face'] } }), elements: [ficha(LUNA, { version: 4 })] }).verdict.status === 'pass');
const ajeno = rev({ shot: plano({ elements: [{ elementId: LUNA, version: 4 }], continuity: { preserve: ['identity.face'] } }), elements: [ficha(LUNA, { ownerAccountId: B })] });
check('13) un elemento de OTRA cuenta se reprocha y no sostiene nada',
  ajeno.problems.some((p) => p.reason === 'owner_mismatch' && p.id === LUNA)
  && deAspecto(ajeno, 'identity.face').status === 'fail', motivos(ajeno));
const archivado = rev({ shot: plano({ elements: [{ elementId: LUNA, version: 4 }], continuity: { preserve: ['identity.face'] } }), elements: [ficha(LUNA, { status: 'archived' })] });
check('un elemento archivado tampoco sostiene: se usa la semántica de Element Core',
  archivado.problems.some((p) => p.reason === 'reference_unusable') && deAspecto(archivado, 'identity.face').status === 'fail');

console.log('\n── F · 14/15 · El material producido ──');

check('14) un material declarado que no vino se reprocha',
  rev({ shot: plano({ producedAssetId: ASSET }) }).problems.some((p) => p.scope === 'asset' && p.reason === 'reference_missing'));
check('15) uno de otra cuenta, también',
  rev({ shot: plano({ producedAssetId: ASSET }), asset: { assetId: ASSET, ownerAccountId: B, status: 'ready' } })
    .problems.some((p) => p.scope === 'asset' && p.reason === 'owner_mismatch'));
check('uno que no está listo, también, con su propio motivo',
  rev({ shot: plano({ producedAssetId: ASSET }), asset: { assetId: ASSET, ownerAccountId: A, status: 'processing' } })
    .problems.some((p) => p.scope === 'asset' && p.reason === 'reference_unusable'));
check('y el suyo y listo no se reprocha',
  rev({ shot: plano({ producedAssetId: ASSET }), asset: { assetId: ASSET, ownerAccountId: A, status: 'ready' } }).ok === true);

console.log('\n── G · 16..18 · Escena, anterior y dependencias ──');

check('16) una escena de otra cuenta se reprocha',
  rev({ shot: plano({ sceneId: 'sc_0001' }), scene: escena({ ownerAccountId: B }) })
    .problems.some((p) => p.scope === 'scene' && p.reason === 'owner_mismatch'));
check('16) y una que el plano dice tener pero no vino, también',
  rev({ shot: plano({ sceneId: 'sc_0001' }) }).problems.some((p) => p.scope === 'scene' && p.reason === 'reference_missing'));
check('16) la escena que vino tiene que ser LA que el plano nombra',
  rev({ shot: plano({ sceneId: 'sc_0001' }), scene: escena({ sceneId: 'sc_9999' }) })
    .problems.some((p) => p.reason === 'scene_mismatch'));
check('17) un plano anterior de otra cuenta se reprocha',
  rev({ shot: plano({ previousShotId: 'sh_0000' }), previous: plano({ shotId: 'sh_0000', ownerAccountId: B }) })
    .problems.some((p) => p.scope === 'previous' && p.reason === 'owner_mismatch'));
const sinAnterior = rev({ shot: plano({ previousShotId: 'sh_0000', continuity: { preserve: ['temporal.previousShot'] } }) });
check('17) y sin el anterior, lo temporal no se puede sostener',
  sinAnterior.problems.some((p) => p.scope === 'previous') && deAspecto(sinAnterior, 'temporal.previousShot').status === 'fail');
check('17) con él, sí',
  deAspecto(rev({ shot: plano({ previousShotId: 'sh_0000', continuity: { preserve: ['temporal.previousShot'] } }), previous: plano({ shotId: 'sh_0000' }) }), 'temporal.previousShot').status === 'pass');
check('18) una dependencia declarada que no se pudo traer se reprocha',
  rev({ shot: plano({ dependsOnShotIds: ['sh_0000'] }), missingDependencies: ['sh_0000'] })
    .problems.some((p) => p.scope === 'dependency' && p.reason === 'dependency_missing'));
check('18) y una que ni vino ni se declaró como ausente, también',
  rev({ shot: plano({ dependsOnShotIds: ['sh_0000'] }) }).problems.some((p) => p.reason === 'dependency_missing'));
check('18) una dependencia de otra cuenta se reprocha',
  rev({ shot: plano({ dependsOnShotIds: ['sh_0000'] }), dependencies: [plano({ shotId: 'sh_0000', ownerAccountId: B })] })
    .problems.some((p) => p.scope === 'dependency' && p.reason === 'owner_mismatch'));
check('18) y las que cuadran no se reprochan',
  rev({ shot: plano({ dependsOnShotIds: ['sh_0000'] }), dependencies: [plano({ shotId: 'sh_0000' })] }).ok === true);

console.log('\n── H · 19..22 · Relaciones espaciales ──');

const espacial = (spatial) => rev({
  shot: plano({ elements: [{ elementId: BOTELLA, version: 3 }, { elementId: MESA, version: 1 }],
    continuity: { preserve: ['spatial.relationships'], spatial } }),
  elements: [ficha(BOTELLA, { version: 3 }), ficha(MESA, { version: 1 })],
});
check('19) una relación con sus dos extremos anclados → `pass`',
  espacial([{ subject: BOTELLA, relation: 'above', object: MESA }]).verdict.status === 'pass');
check('21) si el sujeto no está anclado, se reprocha y no sostiene',
  espacial([{ subject: 'el_nadie_001', relation: 'above', object: MESA }])
    .problems.some((p) => p.scope === 'spatial' && p.reason === 'spatial_reference_missing' && p.id === 'el_nadie_001'));
check('22) si el objeto no está anclado, igual',
  espacial([{ subject: BOTELLA, relation: 'above', object: 'el_nadie_001' }])
    .problems.some((p) => p.scope === 'spatial' && p.id === 'el_nadie_001'));
check('21/22) y entonces el aspecto espacial falla',
  deAspecto(espacial([{ subject: 'el_nadie_001', relation: 'above', object: MESA }]), 'spatial.relationships').status === 'fail');
check('20) un verbo inventado ya lo rechaza el contrato de C2, y aquí se reprocha la forma',
  espacial([{ subject: BOTELLA, relation: 'cerquita', object: MESA }])
    .problems.some((p) => p.scope === 'continuity' && p.reason === 'invalid_shape'), motivos(espacial([{ subject: BOTELLA, relation: 'cerquita', object: MESA }])));
check('exigir lo espacial SIN declarar ninguna relación no se puede sostener',
  deAspecto(rev({ shot: plano({ continuity: { preserve: ['spatial.relationships'] } }) }), 'spatial.relationships').status === 'fail');

console.log('\n── I · 23..29 · Estado, obsoleto y versión ──');

check('23) un plano `stale` es un estado válido, y no significa «hay que rehacerlo»',
  rev({ shot: plano({ state: 'stale', version: 3 }) }).ok === true
  && !/regenerar|regenerate|rehacer autom/i.test(sinComentarios(leer('functions/src/core/continuity-check.ts'))));
const antes = plano({ state: 'generated', version: 2 });
check('24) una transición legal, con la versión subiendo → sin reproches',
  revisarCambioDePlano(antes, plano({ state: 'validated', version: 3 })).length === 0);
check('25) una transición ilegal se reprocha con la máquina de C1',
  revisarCambioDePlano(plano({ state: 'draft', version: 1 }), plano({ state: 'validated', version: 2 }))
    .some((p) => p.reason === 'invalid_transition'));
check('26/27) una versión que no avanza se reprocha',
  revisarCambioDePlano(antes, plano({ state: 'validated', version: 2 })).some((p) => p.reason === 'version_not_advanced'));
check('28) y una que RETROCEDE, también',
  revisarCambioDePlano(antes, plano({ state: 'validated', version: 1 })).some((p) => p.reason === 'version_not_advanced'));
check('26) una versión 0 o negativa ni siquiera es un plano válido',
  revisarCambioDePlano(antes, plano({ version: 0 })).some((p) => p.reason === 'invalid_shape')
  && revisarCambioDePlano(antes, plano({ version: -1 })).some((p) => p.reason === 'invalid_shape'));
check('29) y un incremento correcto, sin cambiar de estado, pasa',
  revisarCambioDePlano(antes, plano({ state: 'generated', version: 3 })).length === 0);
check('cambiar de dueño o de identificador se corta de raíz',
  revisarCambioDePlano(antes, plano({ state: 'generated', version: 3, ownerAccountId: B })).some((p) => p.reason === 'owner_mismatch'));

console.log('\n── J · 34 · Un contexto recortado no se aprueba ──');

const recortado = rev({
  shot: plano({ elements: [{ elementId: LUNA, version: 4 }], continuity: { preserve: ['identity.face', 'architecture.geometry'] } }),
  elements: [ficha(LUNA)], truncated: true,
});
check('34) si se miró menos de lo que hay, se dice', recortado.problems.some((p) => p.reason === 'context_truncated'));
check('34) y NINGÚN aspecto sale `pass`: salen `unknown` por inconcluyentes',
  recortado.verdict.aspects.filter((x) => x.status === 'pass').length === 0
  && recortado.verdict.aspects.every((x) => x.reason === 'inconclusive' || x.reason === 'change_allowed')
  && recortado.verdict.status === 'unknown', recortado.verdict.status);

console.log('\n── K · 27 · ESTRUCTURAL PASS ≠ VISUAL PASS ──');

/*
 * CASO A · nadie sabe conservar la cara. Eso lo contesta C2, ANTES de que
 * exista un trabajo, y su forma no es un veredicto.
 */
const casoA = revisarAntesDeEjecutar({ preserve: ['identity.face'] }, { preserves: ['style.visual'] });
/* CASO B · sí hay quien lo sabe hacer, se generó, y el estado guardado cuadra. */
const casoB = rev(conLuna);
check('27) CASO A es un rechazo PREVIO: sin trabajo, sin cobro, y no es un veredicto',
  casoA.status === 'pre_execution_rejected' && casoA.missing.join(',') === 'identity.face'
  && casoA.verdict === undefined && casoA.aspects === undefined, JSON.stringify(casoA));
check('27) CASO B es un veredicto ESTRUCTURAL, y son dos cosas distintas',
  casoB.verdict.status === 'pass' && casoB.verdict.aspects.length > 0 && casoB.status === undefined);
check('27) y el `pass` de C4 NO afirma nada visual: no hay confianza, ni comparación, ni parecido',
  deAspecto(casoB, 'identity.face').confidence === undefined
  && deAspecto(casoB, 'identity.face').reason === undefined,
  JSON.stringify(deAspecto(casoB, 'identity.face')));
check('27) el motivo que SÍ afirmaría parecido no lo usa nadie en C4',
  !/matches_reference|differs_from_reference/.test(leer('functions/src/core/continuity-check.ts')));

console.log('\n── L · 35..40 · Lo que C4 no es ──');

{
  const C4 = sinComentarios(leer('functions/src/core/continuity-check.ts'));
  const RES = sinComentarios(leer('functions/src/shots/validacion.ts'));
  check('35) ni proveedor, ni modelo, ni adaptador, ni clave, ni prompt, ni embedding',
    !/(providerId|modelId|adapterId|apiKey|endpoint|prompt|embedding|vector|storageRef)/i.test(C4 + RES));
  check('36) ni red, ni disco, ni Firestore, ni reloj, ni azar en el comprobador',
    !/firebase|firestore|fetch\(|node:fs|Date\.now\(|Math\.random\(|new Date\(/.test(C4));
  check('36) y no importa nada de fuera del Core',
    [...leer('functions/src/core/continuity-check.ts').matchAll(/from '([^']+)'/g)].every((m) => m[1].startsWith('./')));
  check('37/38/39) ni Credits, ni trabajos, ni regeneración',
    !/(creditEngine|spendCredits|crearTrabajo|JobStore|conductorDeWee|regenerar)/.test(C4 + RES));
  check('40) ni Project State: `projectId` no se valida contra nada',
    !/creatorProjects|proyectoValido|ProjectItem/.test(C4 + RES));
  check('no hay puntuación numérica: los cuatro estados de C1 y nada más',
    !/score|puntuacion|0\.\d/.test(C4));
  check('y no es un motor nuevo: no construye router, planner, gateway ni cola',
    !/crearRouter|crearGateway|crearConductor|crearPlanner|QueuePort/.test(C4 + RES));
  check('la resolución está SEPARADA de la comprobación',
    /revisarEstructura/.test(RES) && !/getFirestore|collection\(/.test(C4)
    && /contextoDeContinuidad/.test(RES));
}

console.log('\n── M · C1, C2 y C3 intactos ──');

check('C4 no añadió ningún estado ni motivo al veredicto de C1',
  /export type MotivoDeVeredicto =\s*\|? ?'not_required'/.test(leer('functions/src/core/continuity.ts'))
  && !/MotivoDeVeredicto/.test(sinComentarios(leer('functions/src/core/continuity-check.ts')).replace(/import[\s\S]*?from '\.\/continuity';/, '')));
check('reutiliza `resumirVeredicto`, `puedePasarDePlano` y `planoValido` en vez de reescribirlos',
  ['resumirVeredicto', 'puedePasarDePlano', 'planoValido', 'continuidadValida']
    .every((f) => new RegExp(f).test(leer('functions/src/core/continuity-check.ts'))));
check('y el resumen sigue siendo el de C1, sin segunda regla',
  resumirVeredicto({ preserve: ['identity.face'] }, [{ aspect: 'identity.face', status: 'unknown' }]) === 'unknown');
check('la puerta de C3 ganó UNA operación, y no genera nada',
  /op === 'shot\.validate'/.test(leer('functions/src/shots/puerta.ts'))
  && !/crearTrabajo|conductorDeWee|generateVideo/.test(leer('functions/src/shots/puerta.ts')));
check('esta suite está en la cadena de `npm test`', /continuidad-estructural\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
