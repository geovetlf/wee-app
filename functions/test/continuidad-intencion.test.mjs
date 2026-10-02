/**
 * WEË CONTINUITY — C5: DE LO QUE ALGUIEN DIJO A LO QUE HAY QUE CONSERVAR.
 *
 * ── Qué se prueba aquí, y qué NO ────────────────────────────────────────────
 *
 * NO se prueba que el modelo entienda español. Eso es el modelo, y probarlo
 * con frases sería escribir el parser de palabras clave que C5 existe para no
 * escribir.
 *
 * Lo que SÍ se prueba es el CONTRATO de lo que el modelo devuelve y las cuatro
 * garantías que el código pone encima, que son justo las que un modelo no da:
 *
 *   1 · el silencio no es permiso;
 *   2 · no se inventan identificadores;
 *   3 · no se elige entre dos cosas con el mismo nombre;
 *   4 · no se decide una contradicción.
 *
 * Cada caso de la matriz lleva al lado la frase que lo origina, para que se vea
 * qué se está midiendo — pero lo que entra al test es la SALIDA ESTRUCTURADA
 * del modelo, no la frase.
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
  leerIntencionDeContinuidad, resolverIntencionDeContinuidad, sujetosSinResolver,
  interpretarEntendimiento, exigenciaDe, continuidadValida, revisarEstructura,
  ASPECTOS_DE_CONTINUIDAD, SHOT_CONTRACT_VERSION,
} = core;

/* Lo que la cuenta tiene de verdad. Nombre y versión vigente; nada más. */
const LUNA = { elementId: 'el_luna_0001', name: 'Luna', version: 4 };
const CASA = { elementId: 'el_casa_0001', name: 'La casa', version: 2 };
const BOTELLA = { elementId: 'el_botella_001', name: 'Botella', version: 3 };
const SOFA = { elementId: 'el_sofa_0001', name: 'Sofá', version: 1 };
const LAMPARA = { elementId: 'el_lampara_001', name: 'Lámpara', version: 1 };
const MUNDO = [LUNA, CASA, BOTELLA, SOFA, LAMPARA];

/** Lo que el MODELO devolvió. Nunca una frase: esto es su salida ya estructurada. */
const dijo = (intencion, candidatos = MUNDO) =>
  resolverIntencionDeContinuidad(leerIntencionDeContinuidad(intencion), candidatos);

const req = (r) => r.requirements;
const anclajes = (r) => (req(r)?.anchors ?? []).map((a) => `${a.elementId}@${a.version}`).sort().join(' ');

console.log('\n── A · 1..9 · Un dominio cada vez ──');

const r1 = dijo({ preserve: ['identity.face', 'identity.body'], subjects: ['Luna'] });
check('1) «mantén la misma persona» → preserve identity, anclada a Luna v4',
  req(r1).preserve.join(',') === 'identity.face,identity.body' && anclajes(r1) === 'el_luna_0001@4', anclajes(r1));
check('2) «no cambies el rostro» → preserve identity.face',
  req(dijo({ preserve: ['identity.face'], subjects: ['Luna'] })).preserve.join(',') === 'identity.face');
const r3 = dijo({ mayChange: ['outfit.clothing'], subjects: ['Luna'] });
check('3) «cambia el vestido» → mayChange outfit.clothing, y SIN requisitos: nadie pidió conservar nada',
  r3.status === 'sin_intencion' && req(r3) === undefined, r3.status);
const r4 = dijo({ preserve: ['identity.face', 'identity.body'], mayChange: ['outfit.clothing'], subjects: ['Luna'] });
check('4) «solo cambia el vestido» → lo autorizado es el vestido, y nada más',
  exigenciaDe(req(r4), 'outfit.clothing') === 'may_change'
  && exigenciaDe(req(r4), 'outfit.footwear') === 'unspecified'
  && exigenciaDe(req(r4), 'appearance.makeup') === 'unspecified');
check('5) «mantén la casa» → preserve architecture, anclada a la casa v2',
  anclajes(dijo({ preserve: ['architecture.geometry', 'architecture.spatialLayout'], subjects: ['La casa'] })) === 'el_casa_0001@2');
check('6) «cambia los muebles» → mayChange interior.furniture',
  exigenciaDe(req(dijo({ preserve: ['architecture.geometry'], mayChange: ['interior.furniture'], subjects: ['La casa'] })), 'interior.furniture') === 'may_change');
check('7) «mantén esta botella» → preserve product.identity, anclada a la botella v3',
  anclajes(dijo({ preserve: ['product.identity'], subjects: ['Botella'] })) === 'el_botella_001@3');
check('8) «cambia el fondo» → mayChange environment.background',
  exigenciaDe(req(dijo({ preserve: ['product.identity'], mayChange: ['environment.background'], subjects: ['Botella'] })), 'environment.background') === 'may_change');
check('9) «hazlo de noche» → mayChange lighting, y la arquitectura sigue exigida',
  exigenciaDe(req(dijo({ preserve: ['architecture.facade'], mayChange: ['lighting.type', 'lighting.timeOfDay'], subjects: ['La casa'] })), 'lighting.timeOfDay') === 'may_change'
  && exigenciaDe(req(dijo({ preserve: ['architecture.facade'], mayChange: ['lighting.type', 'lighting.timeOfDay'], subjects: ['La casa'] })), 'architecture.facade') === 'preserve');

console.log('\n── B · 10..12/20..23 · Varios dominios en UN requisito ──');

const multi = dijo({
  preserve: ['identity.face', 'architecture.geometry', 'product.identity'],
  mayChange: ['outfit.clothing', 'interior.furniture', 'lighting.timeOfDay'],
  subjects: ['Luna', 'La casa', 'Botella'],
});
check('10/20/21) «mantén su rostro, la arquitectura y la botella; cambia vestido, muebles y luz»',
  req(multi).preserve.length === 3 && req(multi).mayChange.length === 3
  && anclajes(multi) === 'el_botella_001@3 el_casa_0001@2 el_luna_0001@4', anclajes(multi));
check('10) y es UN solo requisito, válido contra el contrato de C2', continuidadValida(req(multi)));
check('11) «mantén a Luna y cambia su vestido» → personaje + ropa',
  exigenciaDe(req(r4), 'identity.face') === 'preserve' && exigenciaDe(req(r4), 'outfit.clothing') === 'may_change');
const video = dijo({
  preserve: ['identity.face', 'outfit.complete', 'environment.scene'],
  mayChange: ['action.activity', 'pose.body', 'action.movement'],
  subjects: ['Luna'],
});
check('12) «mismo personaje, ropa y escenario; cambia la acción»',
  req(video).preserve.join(',') === 'identity.face,outfit.complete,environment.scene'
  && req(video).mayChange.includes('action.activity'));
check('22) apariencia + ropa conviven',
  continuidadValida(req(dijo({ preserve: ['identity.face'], mayChange: ['appearance.makeup', 'appearance.hairstyle', 'outfit.clothing'], subjects: ['Luna'] }))));
check('23) producto + entorno conviven',
  continuidadValida(req(dijo({ preserve: ['product.identity', 'product.label'], mayChange: ['environment.background'], subjects: ['Botella'] }))));

console.log('\n── C · 13 · Relaciones espaciales ──');

const esp = dijo({
  preserve: ['spatial.relationships'],
  subjects: ['Lámpara', 'Sofá'],
  spatial: [{ subject: 'Lámpara', relation: 'next_to', object: 'Sofá' }],
});
check('13) «pon la lámpara al lado del sofá» → SpatialConstraint por IDENTIFICADOR, no por nombre',
  req(esp).spatial.length === 1 && req(esp).spatial[0].subject === LAMPARA.elementId
  && req(esp).spatial[0].object === SOFA.elementId && req(esp).spatial[0].relation === 'next_to',
  JSON.stringify(req(esp).spatial));
check('13) y los dos extremos quedan anclados con su versión', anclajes(esp) === 'el_lampara_001@1 el_sofa_0001@1');
const espRoto = dijo({ preserve: ['spatial.relationships'], subjects: ['Lámpara'], spatial: [{ subject: 'Lámpara', relation: 'next_to', object: 'Mesa fantasma' }] });
check('13) media relación no viaja: si un extremo no se resuelve, la relación no se inventa',
  (req(espRoto).spatial ?? []).length === 0 && espRoto.unresolved.includes('Mesa fantasma'));
check('un verbo que no existe se descarta al leer, sin tumbar el resto',
  leerIntencionDeContinuidad({ preserve: ['identity.face'], spatial: [{ subject: 'a', relation: 'cerquita', object: 'b' }] }).spatial === undefined);

console.log('\n── D · 14..17/37/38 · Referencias: reutilizar, no inventar ──');

check('14) una referencia inequívoca se reutiliza con SU versión vigente',
  anclajes(dijo({ preserve: ['identity.face'], subjects: ['Luna'] })) === 'el_luna_0001@4');
check('14) y nunca se sube a otra versión: v4 sigue siendo v4',
  req(dijo({ preserve: ['identity.face'], subjects: ['Luna'] })).anchors[0].version === 4);
const dosLunas = dijo({ preserve: ['identity.face'], subjects: ['Luna'] },
  [LUNA, { elementId: 'el_luna_0002', name: 'Luna', version: 1 }]);
check('15) dos cosas con el mismo nombre → AMBIGÜEDAD, y no se elige ninguna',
  dosLunas.status === 'ambiguo' && dosLunas.ambiguities[0]?.candidates.length === 2
  && (req(dosLunas).anchors ?? []).length === 0,
  `status=${dosLunas.status} anclados=${JSON.stringify((req(dosLunas)?.anchors ?? []).map((a) => a.elementId))}`);
check('15) y la intención SÍ sobrevive: se entendió qué quería, no a qué se refería',
  req(dosLunas).preserve.join(',') === 'identity.face');
const sinNada = dijo({ preserve: ['architecture.geometry'], subjects: ['El chalet de la playa'] });
check('16) un nombre que no cuadra con nada NO fabrica un identificador',
  (req(sinNada).anchors ?? []).length === 0 && sinNada.unresolved.join(',') === 'El chalet de la playa');
check('16) pero la intención se conserva, para poder decírselo con sus palabras',
  req(sinNada).preserve.join(',') === 'architecture.geometry'
  && sujetosSinResolver(sinNada).join(',') === 'El chalet de la playa');
const puesta = dijo({ subjects: ['Luna', 'La casa'] });
check('37) «pon a Luna en la casa» NO inventa ni un preserve ni un mayChange',
  puesta.status === 'sin_intencion' && req(puesta) === undefined, puesta.status);
const conContexto = dijo({ preserve: ['identity.face', 'architecture.geometry'], mayChange: ['outfit.clothing'], subjects: ['Luna', 'La casa'] });
check('38) «mantén a Luna y la casa, cambia el vestido» reutiliza las dos, sin crear nada',
  anclajes(conContexto) === 'el_casa_0001@2 el_luna_0001@4' && req(conContexto).mayChange.join(',') === 'outfit.clothing');

console.log('\n── E · 17/40..41 · El silencio no es permiso ──');

const soloVestido = dijo({ preserve: ['identity.face'], mayChange: ['outfit.clothing'], subjects: ['Luna'] });
check('17) lo no mencionado no aparece en ninguna lista',
  req(soloVestido).preserve.join(',') === 'identity.face'
  && req(soloVestido).mayChange.join(',') === 'outfit.clothing'
  && ASPECTOS_DE_CONTINUIDAD.filter((a) => exigenciaDe(req(soloVestido), a) !== 'unspecified').length === 2,
  `${ASPECTOS_DE_CONTINUIDAD.filter((a) => exigenciaDe(req(soloVestido), a) !== 'unspecified').length} de ${ASPECTOS_DE_CONTINUIDAD.length} mencionados`);
check('40) «exactamente la misma escena, solo la ropa» NO se expande a las 83 claves',
  req(dijo({ preserve: ['environment.scene', 'identity.face'], mayChange: ['outfit.clothing'], strength: 'strict', subjects: ['Luna'] })).preserve.length === 2);
const ventanas = dijo({ preserve: ['architecture.facade', 'architecture.geometry'], mayChange: ['architecture.openings'], subjects: ['La casa'] });
check('39/41) «no cambies la fachada, solo las ventanas» → la fachada exigida y SOLO las aberturas liberadas',
  exigenciaDe(req(ventanas), 'architecture.facade') === 'preserve'
  && exigenciaDe(req(ventanas), 'architecture.openings') === 'may_change'
  && exigenciaDe(req(ventanas), 'architecture.materials') === 'unspecified');

console.log('\n── F · 18 · Fuerza, sin inventar números ──');

check('18) «exactamente» viaja como `strict`, que es una palabra del contrato',
  req(dijo({ preserve: ['identity.face'], strength: 'strict', subjects: ['Luna'] })).strength === 'strict');
check('18) y una fuerza que no existe se descarta, sin tumbar la intención',
  req(dijo({ preserve: ['identity.face'], strength: 'absoluta', subjects: ['Luna'] })).strength === undefined);
check('18) no hay ninguna puntuación numérica en C5',
  !/score|confidence\s*[:=]\s*0\.|0\.\d{2}/.test(sinComentarios(leer('functions/src/core/continuity-intent.ts'))));

console.log('\n── G · 19 · Contradicciones: no se elige ganador ──');

const choque = dijo({ preserve: ['outfit.clothing'], mayChange: ['outfit.clothing'], subjects: ['Luna'] });
check('19) exigir y liberar lo mismo → CONFLICTO, y sin requisitos',
  choque.status === 'en_conflicto' && choque.conflicts[0].aspect === 'outfit.clothing'
  && choque.conflicts[0].reason === 'preserve_and_may_change' && req(choque) === undefined, JSON.stringify(choque.conflicts));
check('19) y no gana ni la primera lista ni la última: no se decide',
  choque.requirements === undefined && choque.ambiguities.length === 0);

console.log('\n── H · 35/42 · Ni palabras clave, ni ramas por idioma ──');

{
  const C5 = sinComentarios(leer('functions/src/core/continuity-intent.ts'));
  check('35) no hay ningún `includes` sobre texto de la persona',
    !/includes\(['"](cara|face|casa|house|vestido|dress|producto|product|rostro|ropa)['"]\)/i.test(C5));
  check('35) ni una tabla de sinónimos, ni un diccionario de palabras',
    !/sinonimo|synonym|palabras|keywords|diccionario/i.test(C5));
  check('42) ni una rama por idioma',
    !/\b(spanish|english|portuguese|espanol|ingles|locale|idioma)\b/i.test(C5));
  check('42) lo único que se normaliza es el NOMBRE que la persona le puso a su cosa',
    /normalize\('NFD'\)/.test(C5) && /toLowerCase/.test(C5));
  check('42) y la equivalencia semántica la pone el modelo: el mismo resultado estructurado da el mismo requisito',
    JSON.stringify(req(dijo({ preserve: ['identity.face'], mayChange: ['outfit.clothing'], subjects: ['Luna'] })))
    === JSON.stringify(req(dijo({ preserve: ['identity.face'], mayChange: ['outfit.clothing'], subjects: ['luna'] }))),
    'mayúsculas y acentos no cambian a qué se resuelve');
  check('el vocabulario se le ENSEÑA al modelo en el prompt, no se implementa como reglas',
    /"continuity" dice QUÉ DEBE QUEDARSE IGUAL/.test(leer('functions/src/creator/prompts.ts'))
    && /el silencio no es permiso/.test(leer('functions/src/creator/prompts.ts'))
    && /nunca identificadores: no los conoces y no debes inventarlos/.test(leer('functions/src/creator/prompts.ts')));
}

console.log('\n── I · 24..31 · Lo que C5 no es ──');

{
  const C5 = sinComentarios(leer('functions/src/core/continuity-intent.ts'));
  check('24/25/26/27) ni proveedor, ni modelo, ni endpoint, ni clave, ni prompt de proveedor',
    !/(providerId|modelId|adapterId|apiKey|endpoint|storageRef|embedding|vector)/i.test(C5));
  check('28/29/30) ni Credits, ni trabajos, ni llamadas',
    !/(creditEngine|spendCredits|crearTrabajo|conductorDeWee|fetch\(|firebase|firestore)/.test(C5));
  check('31) ni Project State', !/creatorProjects|ProjectItem|proyectoValido/.test(C5));
  check('no lee el reloj ni tira dados, y no importa nada de fuera del Core',
    !/Date\.now\(|Math\.random\(|new Date\(/.test(C5)
    && [...leer('functions/src/core/continuity-intent.ts').matchAll(/from '([^']+)'/g)].every((m) => m[1].startsWith('./')));
  check('no es un segundo Brain: no hay pensador, ni conversación, ni segunda llamada',
    !/Thinker|pensar|ThoughtRequest|BrainRequest/.test(C5));
  check('no ejecuta la comprobación previa del Router',
    !/revisarAntesDeEjecutar|ContinuitySupport/.test(C5));
}

console.log('\n── J · La costura con Brain ──');

const delModelo = interpretarEntendimiento({
  intent: 'creation', confidence: 'high', goal: 'un retrato',
  continuity: { preserve: ['identity.face'], mayChange: ['outfit.clothing'], subjects: ['Luna'], strength: 'strict' },
}, { intents: ['creation'], capabilities: ['image.generate'], experiences: ['photo'] });
check('la intención entra por el MISMO intérprete que ya lee `creative` y `context`',
  delModelo.continuity.preserve.join(',') === 'identity.face'
  && delModelo.continuity.subjects.join(',') === 'Luna' && delModelo.continuity.strength === 'strict');
check('un aspecto mal escrito se descarta, pero NO tumba lo que sí se entendió',
  interpretarEntendimiento({ continuity: { preserve: ['identity.face', 'identity.vibe'] } },
    { intents: [], capabilities: [], experiences: [] }).continuity.preserve.join(',') === 'identity.face');
check('sin continuidad, el entendimiento sigue exactamente igual que antes',
  interpretarEntendimiento({ intent: 'creation' }, { intents: ['creation'], capabilities: [], experiences: [] }).continuity === undefined);
check('`BrainUnderstanding` la declara, y es opcional: nada de lo de antes se rompe',
  /continuity\?: ContinuityIntent;/.test(leer('functions/src/core/brain.ts')));
check('y el modelo NO devuelve identificadores: solo nombres',
  !/elementId/.test(sinComentarios(leer('functions/src/creator/prompts.ts'))));

console.log('\n── K · El relevo a C4 ──');

const plano = (continuity) => ({
  contract: SHOT_CONTRACT_VERSION, shotId: 'sh_0001', projectId: 'pr_0001',
  ownerAccountId: 'cuentaA', version: 1, order: 0, state: 'draft',
  createdAt: 1, updatedAt: 1, continuity,
  elements: (continuity.anchors ?? []).map((a) => ({ elementId: a.elementId, version: a.version })),
});
const resuelto = revisarEstructura({
  accountId: 'cuentaA', shot: plano(req(r1)),
  elements: [{ elementId: LUNA.elementId, ownerAccountId: 'cuentaA', version: 4, status: 'active' }],
}, 2);
check('lo que C5 produce lo puede comprobar C4 sin traducir nada',
  resuelto.verdict.status === 'pass' && resuelto.ok === true);
const huerfano = revisarEstructura({ accountId: 'cuentaA', shot: plano(req(sinNada)), elements: [] }, 2);
check('y un requisito sin referencia llega a C4 como `fail`, que es el relevo correcto',
  huerfano.verdict.status === 'fail', huerfano.verdict.status);

console.log('\n── L · 32 · C1..C4 intactos ──');

check('32) ni continuity, ni shot, ni continuity-check se tocaron',
  !/ContinuityIntent/.test(leer('functions/src/core/continuity.ts'))
  && !/ContinuityIntent/.test(leer('functions/src/core/shot.ts'))
  && !/ContinuityIntent/.test(leer('functions/src/core/continuity-check.ts')));
check('32) C5 reutiliza el vocabulario de C2 en vez de copiarlo',
  /from '\.\/continuity'/.test(leer('functions/src/core/continuity-intent.ts'))
  && !/ContinuityAspect =/.test(leer('functions/src/core/continuity-intent.ts')));
check('el resultado es un `ContinuityRequirements` de C1, no otro contrato',
  continuidadValida(req(r1)) && req(r1).preserve !== undefined);
check('esta suite está en la cadena de `npm test`', /continuidad-intencion\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
