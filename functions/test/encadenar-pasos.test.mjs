/**
 * WEË — C27 / EL CANAL QUE NO EXISTÍA: UN PASO QUE BEBE DE OTRO.
 *
 * ── El agujero ──────────────────────────────────────────────────────────────
 *
 * `StepNeed` existe desde C15c. El Planner lo valida entero —modalidad contra
 * `accepts`, clave contra los pasos ya vistos, `produces` contra lo que se
 * pide— y lo convierte en `dependsOn`. El puente de Legacy lo produce desde
 * C15d. Todo el camino estaba montado menos el primer metro:
 *
 *   · el prompt no mencionaba `needs` ni una sola vez
 *   · `interpretarPasos` construía {key, capability, input} y no lo leía
 *
 * Así que Weë Brain NO PODÍA DECIR que un paso consume lo que otro produjo.
 * No es que lo dijera mal: no tenía dónde decirlo.
 *
 * ── Cómo se vio, y por qué importaba ahora ──────────────────────────────────
 *
 * Midiendo Chef ANTES de gastar una llamada en su canary. «Mira lo que tengo
 * en la nevera y dime qué cocinar» son dos pasos, y el segundo es
 * `text.generate`, que acepta SOLO texto: la foto no le llega nunca, y lo
 * único que le llega de ella es la descripción del primero.
 *
 * Sin este campo ese canary no podía aprobar dijera lo que dijera el modelo, y
 * la llamada habría medido un canal inexistente. Es la misma trampa que C22
 * con Photo, vestida de otra cosa: comprobar la plantilla en vez de medir la
 * necesidad.
 *
 * ── Lo que esta fase NO hace ────────────────────────────────────────────────
 *
 * No cierra B2: que el canal exista no dice que el modelo sepa usarlo, y eso
 * solo lo mide una llamada real. No toca el Planner, que ya lo hacía bien. No
 * toca el puente. Y no le enseña al modelo QUÉ enlaces son legales, que es
 * otro hueco y se reporta aparte.
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
  console.log((cond ? '✔ ' : '✘ ') + `${n} · ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const core = lib('core/index.js');
const { CAPABILITY_CATALOG, PLANNER_CONTRACT_VERSION, interpretarPasos, VARIANTES_DEL_CATALOGO } = core;
const { crearPlannerDeWee, disponibilidadDe, entendimientoParaPlanificar } = lib('planner/index.js');
const { entradaDeEntender } = lib('creator/prompts.js');
const ROUTABLES = CAPABILITY_CATALOG.filter((c) => c.status === 'ROUTABLE').map((c) => c.id);
const TODAS = CAPABILITY_CATALOG.map((c) => c.id);

const leerPasos = (steps) => interpretarPasos(steps, { capabilities: TODAS, variants: VARIANTES_DEL_CATALOGO });

const entender = async (json) => {
  const cerebro = core.crearBrain({
    thinker: {
      async pensar() {
        return {
          response: {
            kind: 'text', content: JSON.stringify(json),
            actual: { provider: { lines: [], usd: 0 }, latencyMs: 1 }, model: 'de-prueba',
          },
          usage: { totalTokens: 9 },
        };
      },
    },
    tracer: { async record() {} }, now: () => 1000, experiences: ['chef'],
  });
  return cerebro.entender({
    contract: '1.0',
    trace: { traceId: 'c27_0001', requestId: 'c27_0001', userId: 'acc_c27', sessionId: 'chat_c27', runId: 'chat_c27', stepId: 'm_0001' },
    message: { text: 'tengo esto en la nevera, ¿qué cocino?' },
    options: { mode: 'understand' },
  });
};
const planear = (u) =>
  crearPlannerDeWee({ availability: disponibilidadDe(ROUTABLES), tracer: { record() {} }, now: () => 1000 })
    .planificar({
      contract: PLANNER_CONTRACT_VERSION,
      trace: { traceId: 'c27_0002', requestId: 'c27_0002', userId: 'acc_c27' },
      understanding: entendimientoParaPlanificar(u),
    });

const MIRAR = { key: 'look', capability: 'vision.describe', needs: [{ from: 'user', modality: 'image', required: true }] };
const RECETA = (needs) => ({
  key: 'recipe', capability: 'text.generate',
  ...(needs ? { needs } : {}),
  input: { kind: 'recipe', brief: 'una receta con lo que hay' },
});
const chefDiciendo = (steps) => ({
  version: 1, intent: 'create', confidence: 1,
  goal: 'Escribir una receta con lo que hay en la nevera',
  capability: 'text.generate', capabilities: [...new Set(steps.map((s) => s.capability))], steps,
  context: [{ kind: 'asset', assetKind: 'image', required: true }],
  suggestedExperience: 'chef',
});
const conLaFoto = (u) => ({ ...u, inputs: { text: 'qué cocino', attachments: [{ kind: 'image', assetId: 'as_nevera' }] } });

console.log('\n── A · Lo que el modelo dice ya no se tira ──');

const leidos = leerPasos([MIRAR, RECETA([{ from: 'upstream', stepKey: 'look' }])]);
check('C27 · un paso puede declarar de qué otro paso bebe, y sobrevive',
  igual(leidos[1]?.needs, [{ from: 'upstream', modality: 'text', stepKey: 'look' }]),
  JSON.stringify(leidos[1]?.needs ?? null));
check('y la MODALIDAD la pone el catálogo, no el modelo',
  igual(leerPasos([MIRAR, RECETA([{ from: 'upstream', stepKey: 'look', modality: 'video' }])])[1]?.needs,
    [{ from: 'upstream', modality: 'text', stepKey: 'look' }]),
  '`vision.describe` produce texto: lo dice `produces`, y no se pregunta dos veces');
check('una necesidad del USUARIO también llega, y con su obligatoriedad',
  igual(leidos[0]?.needs, [{ from: 'user', modality: 'image' }])
  && igual(leerPasos([{ ...MIRAR, needs: [{ from: 'user', modality: 'image', required: false }] }])[0]?.needs,
    [{ from: 'user', modality: 'image', required: false }]),
  JSON.stringify(leidos[0]?.needs ?? null));
check('sin `needs` declarados el campo NO aparece: no se inventa ninguno',
  leerPasos([RECETA()])[0]?.needs === undefined,
  'las implícitas las deriva el Planner de `accepts`, y siguen siendo suyas');
check('la misma necesidad dicha dos veces se cuenta una',
  leerPasos([MIRAR, RECETA([{ from: 'upstream', stepKey: 'look' }, { from: 'upstream', stepKey: 'look' }])])[1]?.needs?.length === 1);

console.log('\n── B · Chef, que es el caso que lo destapó ──');

const sinDecirlo = await entender(chefDiciendo([MIRAR, RECETA()]));
const diciendolo = await entender(chefDiciendo([MIRAR, RECETA([{ from: 'upstream', stepKey: 'look' }])]));
const planSin = await planear(conLaFoto(sinDecirlo.understanding));
const planCon = await planear(conLaFoto(diciendolo.understanding));

check('C27 · declarar que la receta bebe de la mirada produce la arista en el plan',
  planCon.status === 'ready' && igual(planCon.plan?.steps?.[1]?.dependsOn, ['s1-vision_describe']),
  planCon.status === 'ready' ? JSON.stringify(planCon.plan.steps[1].dependsOn ?? null) : planCon.status);
check('y NO declararlo da un plan sin ella: los dos casos ya se distinguen',
  planSin.status === 'ready' && planSin.plan?.steps?.[1]?.dependsOn === undefined,
  'antes de C27 los dos planes salían idénticos, y el correcto no se podía ni escribir');
check('la foto sigue siendo de la persona, y llega por el OTRO canal',
  igual(planCon.plan?.steps?.[0]?.uses, [0])
  && planCon.plan?.steps?.[1]?.uses === undefined
  && planCon.plan?.references?.length === 1,
  'recurso del usuario y material de otro paso siguen sin mezclarse');

console.log('\n── C · Lo imposible viaja, y lo mata el Planner por su nombre ──');

const razon = (r) => r?.error?.details?.reason ?? r?.status;
const planDe = async (steps) => planear(conLaFoto((await entender(chefDiciendo(steps))).understanding));

const haciaAdelante = razon(await planDe([RECETA([{ from: 'upstream', stepKey: 'look' }]), MIRAR]));
check('C27 · señalar hacia ADELANTE no se tira aquí: lo rechaza el Planner',
  haciaAdelante === 'unknown_step_key', haciaAdelante);
const aSiMismo = razon(await planDe([MIRAR, RECETA([{ from: 'upstream', stepKey: 'recipe' }])]));
check('y señalarse a SÍ MISMO igual: el ciclo de largo uno muere donde mueren los ciclos',
  aSiMismo === 'unknown_step_key',
  aSiMismo + ' · no hay una segunda regla anti-ciclos en el Brain');
const noSabeRecibir = razon(await planDe([
  { key: 'dish', capability: 'image.generate', input: { kind: 'dish' } },
  RECETA([{ from: 'upstream', stepKey: 'dish' }]),
]));
check('y beber de un paso cuyo resultado no sabe recibir, también',
  noSabeRecibir === 'modality_not_accepted',
  noSabeRecibir + ' · `text.generate` acepta solo texto, y una imagen no lo es');
check('una necesidad del USUARIO que la capacidad no acepta SÍ se descarta, y es otra cosa',
  leerPasos([{ key: 'recipe', capability: 'text.generate', needs: [{ from: 'user', modality: 'video' }] }])[0]?.needs === undefined,
  'el Planner ya deriva de `accepts` qué tiene que poner la persona: eso es ruido, no información');

console.log('\n── D · Las claves las pone Weë, y una referencia tiene que sobrevivirlo ──');

const renombrados = leerPasos([
  { key: 'look', capability: 'vision.describe' },
  { key: 'look', capability: 'vision.describe' },
  RECETA([{ from: 'upstream', stepKey: 'look' }]),
]);
check('C27 · dos pasos con la misma clave: Weë renombra el segundo',
  igual(renombrados.map((s) => s.key), ['look', 'p2', 'recipe']),
  JSON.stringify(renombrados.map((s) => s.key)));
check('y quien señaló «look» sigue señalando al que el modelo quiso decir',
  igual(renombrados[2]?.needs, [{ from: 'upstream', modality: 'text', stepKey: 'look' }]),
  'la traducción va de la clave PROPUESTA a la PUESTA, y el primero se la queda');
const reescrito = leerPasos([
  { key: 'Mirar La Foto!', capability: 'vision.describe' },
  RECETA([{ from: 'upstream', stepKey: 'Mirar La Foto!' }]),
]);
check('y si la clave del modelo no tenía forma, Weë la sustituye y la referencia SIGUE valiendo',
  reescrito[0]?.key === 'p1'
  && igual(reescrito[1]?.needs, [{ from: 'upstream', modality: 'text', stepKey: 'p1' }]),
  JSON.stringify(reescrito.map((s) => [s.key, s.needs ?? null])));
check('una clave que no existe no se aproxima a la más parecida',
  leerPasos([MIRAR, RECETA([{ from: 'upstream', stepKey: 'looook' }])])[1]?.needs === undefined,
  'o es una clave que alguien dijo, o no viaja: aquí no se adivina');

console.log('\n── E · El prompt, que tampoco lo pedía ──');

const ESPERADO = { intents: core.INTENCIONES, capabilities: TODAS, experiences: ['chef'], variants: VARIANTES_DEL_CATALOGO };
const sistema = String(entradaDeEntender(ESPERADO, 'hola', 100)?.system ?? '');
check('C27 · el prompt dice DÓNDE declarar que un paso bebe de otro',
  /"needs"/.test(sistema) && /upstream/.test(sistema) && /stepKey/.test(sistema),
  'el campo existía en el contrato y no se pedía en ninguna parte');
check('y NO le enseña a mano qué enlaces son legales',
  !/accepts|produces/.test(sistema),
  'HUECO REPORTADO: el vocabulario le pasa ids y variantes, nunca `accepts` ni `produces`');

console.log('\n── G · Lo que se ENSEÑA es lo que se ACEPTA (B2) ──');

/*
 * ── EL CANARY REAL DE B2, Y LO QUE DEJÓ MEDIDO ──────────────────────────────
 *
 * Una llamada a DeepSeek con el prompt de producción. El modelo compuso la
 * tarea entera bien —mirar la foto y luego escribir la receta—, eligió las dos
 * capacidades y las dos variantes, y declaró la dependencia con la clave EXACTA
 * del primer paso. Y la metió DENTRO de `input`:
 *
 *   { key, capability, input: { kind, brief, needs: [...] } }
 *
 * El esquema del prompt se cerraba en `input`, y `needs` se pedía en la frase
 * siguiente, en prosa. «Dilo en ese paso» no dice en qué SITIO del paso, así
 * que se colocó donde cabía. El intérprete lo descartó con razón y la
 * dependencia nunca llegó al Planner.
 *
 * No fue un fallo de razonamiento del modelo: fue un contrato ambiguo.
 *
 * ── Por qué el guard mira la FORMA y no una frase ───────────────────────────
 *
 * Comprobar que el prompt «menciona needs» es lo que ya pasaba, y pasó igual
 * mientras el campo se perdía. Lo que hay que pinchar es que la forma que se le
 * ENSEÑA al modelo y la forma que el intérprete ACEPTA sean la misma. Así que
 * el esquema se saca del prompt de verdad y se le hace viajar entero.
 */
const esquemaDelPaso = (() => {
  const marca = 'Cada paso: ';
  const i = sistema.indexOf(marca);
  if (i < 0) return null;
  const s = sistema.slice(i + marca.length);
  let hondo = 0;
  for (let k = 0; k < s.length; k++) {
    if (s[k] === '{') hondo++;
    else if (s[k] === '}') {
      hondo--;
      if (!hondo) { try { return JSON.parse(s.slice(0, k + 1)); } catch { return null; } }
    }
  }
  return null;
})();

check('B2 · el prompt ENSEÑA un esquema de paso, y es JSON legible',
  !!esquemaDelPaso && typeof esquemaDelPaso === 'object',
  esquemaDelPaso ? Object.keys(esquemaDelPaso).join(', ') : 'no se pudo leer');
check('B2 · `needs` es HERMANO de `key`, `capability` e `input`',
  !!esquemaDelPaso?.needs && !('needs' in (esquemaDelPaso?.input ?? {})),
  'en el canary real el modelo lo puso dentro de `input`, y el esquema se lo permitía');
check('y dentro del need se enseña SOLO lo que el contrato usa',
  igual(Object.keys(esquemaDelPaso?.needs?.[0] ?? {}).sort(), ['from', 'stepKey'])
  && esquemaDelPaso?.needs?.[0]?.from === 'upstream',
  'sin `modality`: en un upstream la pone el catálogo, y pedirla invitaría a inventarla');

/*
 * El paso se construye CON LA FORMA DEL ESQUEMA, no con una copiada a mano: si
 * alguien devuelve `needs` al interior de `input`, esto lo construye ahí y el
 * viaje falla, que es justo lo que tiene que pasar.
 */
const conLaFormaDelEsquema = (valores) => {
  const paso = {};
  for (const clave of Object.keys(esquemaDelPaso ?? {})) {
    if (clave === 'input') {
      paso.input = {};
      for (const k of Object.keys(esquemaDelPaso.input)) if (valores.input?.[k] !== undefined) paso.input[k] = valores.input[k];
      if (valores.input?.needs) paso.input.needs = valores.input.needs;
    } else if (clave === 'needs') {
      if (valores.needs) paso.needs = valores.needs;
    } else if (valores[clave] !== undefined) paso[clave] = valores[clave];
  }
  return paso;
};

const viaje = leerPasos([
  conLaFormaDelEsquema({ key: 'look', capability: 'vision.describe', input: { kind: 'describe', brief: 'mirar la foto' } }),
  conLaFormaDelEsquema({
    key: 'recipe', capability: 'text.generate',
    input: { kind: 'recipe', brief: 'escribir la receta' },
    needs: [{ from: 'upstream', stepKey: 'look' }],
  }),
]);
check('B2 · un paso con LA FORMA QUE SE ENSEÑA atraviesa el intérprete',
  igual(viaje[1]?.needs, [{ from: 'upstream', modality: 'text', stepKey: 'look' }]),
  JSON.stringify(viaje[1]?.needs ?? null));

/* Y la forma que contestó DeepSeek, para que quede medida y nadie la dé por buena. */
const comoContestoDeepSeek = leerPasos([
  { key: 'analizar_foto', capability: 'vision.describe', input: { kind: 'describe', brief: 'mirar' } },
  { key: 'receta', capability: 'text.generate', input: { kind: 'recipe', brief: 'escribir', needs: [{ from: 'upstream', stepKey: 'analizar_foto' }] } },
]);
check('B2 · `needs` dentro de `input` sigue SIN viajar, y eso es lo correcto',
  comoContestoDeepSeek[1]?.needs === undefined,
  'el intérprete lee el contrato; no adivina dónde quiso ponerlo quien contestó');

console.log('\n── H · `confidence`, que tampoco tenía vocabulario ──');

check('B2 · el prompt declara los tres valores que valen',
  /"confidence" admite EXACTAMENTE tres valores: low, medium o high/.test(sistema),
  'el modelo contestó 0.9 porque nadie le había dicho cuáles son');

const base = chefDiciendo([MIRAR, RECETA([{ from: 'upstream', stepKey: 'look' }])]);
const confianzaDe = async (v) => (await entender({ ...base, confidence: v })).understanding?.confidence;
check('y el intérprete acepta exactamente esos tres',
  (await confianzaDe('low')) === 'low'
  && (await confianzaDe('medium')) === 'medium'
  && (await confianzaDe('high')) === 'high');
check('un número NO pasa: cae a lo que digan las señales, no a lo que dijo el modelo',
  (await confianzaDe(0.9)) !== 0.9 && ['low', 'medium', 'high'].includes(await confianzaDe(0.9)),
  'lo que llegó en el canary real: 0.9 acabó en «' + (await confianzaDe(0.9)) + '»');
check('y una palabra inventada tampoco',
  (await confianzaDe('altísima')) !== 'altísima'
  && ['low', 'medium', 'high'].includes(await confianzaDe('altísima')),
  'el vocabulario es cerrado, y lo era antes de decirlo: lo que faltaba era decirlo');


console.log('\n── I · `constraints`, el tercer campo sin forma (B3.2) ──');

/*
 * ── LO QUE MIDIÓ EL CANARY DE TRAVEL ────────────────────────────────────────
 *
 * El modelo devolvió cinco restricciones REALES de la persona —Lisboa, cinco
 * días, abril, la comida, sin prisas— en forma de LISTA DE FRASES. El contrato
 * espera pares sueltos de nombre y valor, así que el intérprete no vio un
 * objeto plano y el entendimiento llegó con `constraints: {}`.
 *
 * El contrato no estaba mal: el prompt nombraba `constraints` en la lista de
 * campos y no lo explicaba en ninguna parte. Tercera vez que el mismo hueco
 * produce el mismo fallo, después de `needs` (que acabó dentro de `input`) y
 * de `confidence` (que llegó como 0.9).
 *
 * Lo que se pincha aquí es lo mismo que en la sección G: que la FORMA que se
 * le enseña al modelo y la forma que el intérprete ACEPTA sean la misma. El
 * ejemplo se saca del prompt de verdad y se le hace viajar.
 */
const ejemploDeConstraints = (() => {
  const marca = '"constraints" son los límites que puso la persona, en pares sueltos de nombre y valor: ';
  const i = sistema.indexOf(marca);
  if (i < 0) return null;
  const s = sistema.slice(i + marca.length);
  const fin = s.indexOf('}');
  try { return JSON.parse(s.slice(0, fin + 1)); } catch { return null; }
})();

check('B3.2 · el prompt ENSEÑA la forma de `constraints`, y es JSON legible',
  !!ejemploDeConstraints && typeof ejemploDeConstraints === 'object' && !Array.isArray(ejemploDeConstraints),
  JSON.stringify(ejemploDeConstraints));
check('y es un objeto PLANO de escalares, ni listas ni objetos dentro',
  /* Con el ejemplo ausente, `Object.values({}).every()` es `true`: habia que
     exigir que HAYA claves, o el guard pasaba justo cuando no habia nada. */
  Object.keys(ejemploDeConstraints ?? {}).length > 0
  && Object.values(ejemploDeConstraints ?? {}).every((v) => ['string', 'number', 'boolean'].includes(typeof v)),
  Object.entries(ejemploDeConstraints ?? {}).map(([k, v]) => `${k}:${typeof v}`).join(' '));

const conConstraints = async (c) => (await entender({ ...chefDiciendo([MIRAR, RECETA()]), constraints: c })).understanding?.constraints;

check('F1 · un objeto plano válido se conserva entero',
  igual(await conConstraints(ejemploDeConstraints), ejemploDeConstraints),
  JSON.stringify(await conConstraints(ejemploDeConstraints)));
check('F2 · texto, número y sí/no: los tres sobreviven',
  igual(await conConstraints({ sitio: 'Lisboa', dias: 5, urgente: true }), { sitio: 'Lisboa', dias: 5, urgente: true }),
  JSON.stringify(await conConstraints({ sitio: 'Lisboa', dias: 5, urgente: true })));
check('F3 · una LISTA no cuela como `constraints`: no se acepta en silencio',
  igual(await conConstraints(['Lisboa ya decidido', 'cinco días', 'abril']), {}),
  'lo que llegó en el canary de Travel · ahora el prompt enseña la forma que sí entra');
check('F4 · sin restricciones, el campo queda vacío: no se inventa ninguna',
  igual(await conConstraints(undefined), {}) && igual(await conConstraints({}), {}));
check('F5 · con varias claves, se preservan TODAS',
  Object.keys((await conConstraints({ a: 1, b: 'dos', c: true, d: 4, e: 'cinco' })) ?? {}).length === 5);
check('F6 · las claves siguen ABIERTAS: un nombre que Weë nunca declaró también entra',
  igual(await conConstraints({ que_quepa_en_el_maletero: true, sin_gluten: 'estricto' }),
    { que_quepa_en_el_maletero: true, sin_gluten: 'estricto' }),
  'no es un catálogo: el prompt dice que los nombres los elige el modelo');
check('y el prompt lo dice explícitamente, para que no se lea como lista cerrada',
  /Los nombres de esas claves los eliges t/.test(sistema) && /no hay lista cerrada/.test(sistema));
check('`constraints` sigue siendo un Record abierto en el contrato: no se cerró nada',
  /constraints: Readonly<Record<string, string \| number \| boolean>>/.test(leer('functions/src/core/brain.ts')),
  'el contrato no cambió; lo que faltaba era enseñarlo');

console.log('\n── J · `suggestedExperience`: sugerencia, no autoridad del plan ──');

/*
 * En el canary de Travel el modelo sugirió `business` para un viaje. Es un id
 * válido, así que pasó el validador; era la experiencia equivocada. No tocó el
 * plan, y esta sección fija por qué: el Planner no lo lee.
 *
 * Fuera del plan SÍ tiene autoridad —`core/skill.ts` lo usa como experiencia
 * activa cuando no hay una elegida, y el chat de `creator/brain.ts` decide con
 * él a qué especialista deriva—. Eso pertenece a Skills y al chat, y esta fase
 * no lo toca: solo deja escrita la frontera.
 */
const cerebroDe = (experiencias, json) => core.crearBrain({
  thinker: { async pensar() { return { response: { kind: 'text', content: JSON.stringify(json), actual: { provider: { lines: [], usd: 0 }, latencyMs: 1 }, model: 'de-prueba' }, usage: { totalTokens: 9 } }; } },
  tracer: { async record() {} }, now: () => 1000, experiences: experiencias,
});
const entenderCon = (experiencias, json) => cerebroDe(experiencias, json).entender({
  contract: '1.0',
  trace: { traceId: 'b32_0001', requestId: 'b32_0001', userId: 'acc_b32', sessionId: 'chat_b32', runId: 'chat_b32', stepId: 'm_0001' },
  message: { text: 'un viaje a Lisboa' },
  options: { mode: 'understand' },
});
const VIAJE = {
  version: 1, intent: 'planning', confidence: 'high', goal: 'un viaje',
  capability: 'text.search', capabilities: ['text.search'],
  steps: [{ key: 'ruta', capability: 'text.search', input: { kind: 'itinerary', brief: 'el itinerario' } }],
};

const malSugerida = (await entenderCon(['chef', 'travel', 'business'], { ...VIAJE, suggestedExperience: 'business' })).understanding;
const planConSugerenciaMala = await planear({ ...malSugerida, inputs: { text: 'un viaje', attachments: [] } });
const planSinSugerencia = await planear({
  ...(await entenderCon(['chef', 'travel', 'business'], VIAJE)).understanding,
  inputs: { text: 'un viaje', attachments: [] },
});
check('F7 · una sugerencia válida pero equivocada NO cambia el plan',
  malSugerida.suggestedExperience === 'business'
  && igual(planConSugerenciaMala.plan?.steps?.map((s) => `${s.capability}/${s.input?.kind}`),
    planSinSugerencia.plan?.steps?.map((s) => `${s.capability}/${s.input?.kind}`)),
  `con=${JSON.stringify(planConSugerenciaMala.plan?.steps?.map((s) => s.capability))} sin=${JSON.stringify(planSinSugerencia.plan?.steps?.map((s) => s.capability))}`);
check('F8 · una experiencia desconocida se descarta, como hacía el contrato',
  (await entenderCon(['chef', 'travel'], { ...VIAJE, suggestedExperience: 'no_existe' })).understanding?.suggestedExperience === undefined,
  'se valida contra las experiencias declaradas; no se inventa autoridad nueva');
check('F9 · el Core Planner NO lee `suggestedExperience` para elegir capacidades',
  !/suggestedExperience/.test(leer('functions/src/core/planner.ts'))
  && !/suggestedExperience/.test(leer('functions/src/planner/index.ts')),
  'cero apariciones en las dos capas del Planner');
check('y donde SÍ manda es fuera del plan, en Skills y en el chat',
  /suggestedExperience/.test(leer('functions/src/core/skill.ts'))
  && /suggestedExperience/.test(leer('functions/src/creator/brain.ts')),
  'frontera documentada: sugerencia del Brain ≠ autoridad del Plan');
check('F10 · Legacy no entra en la construcción del plan del Core',
  !/templates|buildPlan|KIND_INSTRUCTIONS/.test(sinComentarios(leer('functions/src/planner/index.ts')))
  && !/templates|buildPlan/.test(sinComentarios(leer('functions/src/core/planner.ts'))),
  'ni el Planner del Core ni su frontera importan nada de `creator/templates`');

console.log('\n── F · Lo que no se tocó ──');

const cerebro = sinComentarios(leer('functions/src/core/brain.ts'));
check('el Brain sigue sin saber de proveedor, modelo, precio ni trabajo',
  !/providerId|modelId|creditsCharged|jobId|outputRef/.test(cerebro));
check('el Planner NO se tocó: ya sabía convertir `needs` en `dependsOn`',
  /unknown_step_key/.test(leer('functions/src/core/planner.ts'))
  && /modality_not_accepted/.test(leer('functions/src/core/planner.ts')));
check('el puente de Legacy tampoco: lo que mide C15d sigue siendo suyo',
  /clasificarArista/.test(leer('functions/src/creator/necesidades.ts'))
  && !/interpretarPasos/.test(leer('functions/src/creator/necesidades.ts')));
check('G19 congelado: las 53 variantes siguen con su significado',
  CAPABILITY_CATALOG.filter((c) => c.variants?.length).flatMap((c) => c.variants).length === 53
  && CAPABILITY_CATALOG.filter((c) => c.variants?.length).flatMap((c) => c.variants).every((v) => v.description));
check('el replanteamiento de G6 sigue abierto y sin tocar',
  /GAP MEDIDO . G6/.test(leer('functions/test/photo-canary.test.mjs')));
check('B2 NO se cierra aquí: que el canal exista no dice que el modelo lo use',
  /No cierra B2/.test(leer('functions/test/encadenar-pasos.test.mjs')),
  'el canary de Chef/cook ya corrió: el modelo compuso bien y colocó el need dentro de `input`');
check('esta suite está en la cadena de `npm test`',
  /encadenar-pasos\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
