/**
 * G13.4 / G13.5 — LAS PROPUESTAS POR PASO: UN TECHO, Y UNA AUTORIDAD.
 *
 * Una «propuesta» es una de las salidas alternativas y equivalentes que un paso
 * entrega para que la persona elija: los tres logos de Weë Design, los dos looks
 * de Weë Beauty. Cuántas como mucho lo decía, hasta hoy, cada uno por su cuenta:
 *
 *   `credits/aiPricing.ts`      recortaba a 8   (escrito el 2026-09-07)
 *   `engine/pricing.ts`         recortaba a 4   (del día anterior)
 *   los tres adaptadores        recortaban a 4
 *   el mock del Gateway         recortaba a 4   (el más viejo, del 2026-09-05)
 *
 * Ninguno de los dos números venía de ningún sitio: ni de una API, ni de un
 * modelo, ni de una decisión escrita. Y entre los dos había una ventana. Pedir
 * ocho retoques costaba 108 Credits y devolvía cuatro imágenes; el descuento por
 * volumen más grande de Weë solo se aplicaba dentro de ese hueco.
 *
 * G13.4 dejó el número UNA vez y los seis leyéndolo. G13.5 le puso encima a
 * alguien que sabe decir que no: el Planner del Core, que RECHAZA una cantidad
 * imposible en vez de encogerla. Son dos cosas distintas y esta suite las
 * comprueba por separado, porque pueden romperse por separado.
 *
 *   A · La autoridad: existe, vale 4, y hay una sola declaración.
 *   B · Los seis la consumen, y ninguno guarda un número propio.
 *   C · La segunda barrera: precio y ejecución normalizan IGUAL.
 *   D · Las cantidades que Weë pide hoy pasan intactas.
 *   E · Lo que este techo NO es.
 *   F · G13.5 · el Planner valida: 1–4 valen, todo lo demás es `invalid_request`.
 *   G · Y no arregla nada en silencio.
 *   H · La autoridad es del Core, no de quien cobra ni de quien ejecuta.
 *   I · El puente de Legacy ya no la pierde.
 *   J · Brain sigue sin poder producirla.
 *   K · Y no se ha abierto ninguna otra puerta.
 *
 * ── POR QUÉ SIGUEN EXISTIENDO LOS RECORTES DE LA SECCIÓN C ──────────────────
 *
 * Porque hay DOS caminos hasta un proveedor y el Planner solo vigila uno. El
 * que corre hoy en producción es el otro: `creator/templates.ts` escribe el
 * plan y `creator/index.ts` lo ejecuta sin pasar por el Core. Mientras ese
 * camino exista, los seis recortes son la única protección que tiene, y
 * quitarlos ahora lo dejaría desnudo. Eso es G13.6.
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

let fallos = 0;
let n = 0;
const check = (nombre, cond, extra = '') => {
  n++;
  console.log((cond ? '✔ ' : '✘ ') + n + ') ' + nombre + (extra ? ' — ' + extra : ''));
  if (!cond) fallos++;
};

const { MAX_PROPUESTAS_POR_PASO } = lib('core/contracts.js');
const { priceImage } = lib('credits/aiPricing.js');
const { DEFAULT_SETTINGS } = lib('engine/registry.js');
const { volumeFactor, IMAGE_MODELS } = lib('engine/imageModels.js');
const { mockProvider } = lib('gateway/providers/mock.js');
const { TEMPLATES } = lib('creator/templates.js');

const S = { ...DEFAULT_SETTINGS };

/* Los seis sitios que leen la cantidad, y el nombre por el que los conoce la gente. */
const CONSUMIDORES = [
  ['el precio de una imagen', 'functions/src/credits/aiPricing.ts'],
  ['la estimación del Router', 'functions/src/engine/pricing.ts'],
  ['el adaptador de Gemini', 'functions/src/engine/providers/gemini.ts'],
  ['el adaptador de Flux', 'functions/src/engine/providers/flux.ts'],
  ['el adaptador de Seedream', 'functions/src/engine/providers/seedream.ts'],
  ['el proveedor de demostración', 'functions/src/gateway/providers/mock.ts'],
];

/* Un número escrito a mano donde debería ir la autoridad. Lo que esta suite caza. */
const NUMERO_A_MANO = /Math\.min\(\s*\d+\s*,\s*Number\(\s*input\.count/;
const LEE_LA_AUTORIDAD = /Math\.min\(\s*MAX_PROPUESTAS_POR_PASO\s*,\s*Number\(\s*input\.count/;

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · La autoridad ──');

check('G13.4 · el techo de propuestas por paso es 4',
  MAX_PROPUESTAS_POR_PASO === 4,
  'DECISIÓN DE PRODUCTO (G13.3): cambiarlo aquí no basta, hay que volver a decidirlo');

const ARCHIVOS_TS = (() => {
  const todos = [];
  const recorrer = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) recorrer(p);
      else if (e.name.endsWith('.ts')) todos.push(p.replace(/\\/g, '/'));
    }
  };
  recorrer(path.resolve(RAIZ, 'functions/src').replace(/\\/g, '/'));
  return todos;
})();

/*
 * ── DÓNDE VIVE, Y POR QUÉ SE MUDÓ ───────────────────────────────────────────
 *
 * En G13.4 se declaraba en `engine/types.ts`, que es donde estaban los seis
 * sitios que la recortaban. En G13.5 la declaración se mudó al Core, porque
 * quien tiene que RECHAZAR una cantidad imposible es el Planner y el Core no
 * importa del motor: la dirección es de ida y pedirla desde allí habría cerrado
 * un ciclo. Y no se reexporta desde el motor: cada consumidor la pide donde
 * vive, por lo que dice la comprobación siguiente. Lo que no cambia es que la
 * DECLARACIÓN sigue siendo una sola en todo el servidor.
 */
check('y se declara en UN solo sitio de todo el servidor, que es el Core',
  (() => {
    const declaran = ARCHIVOS_TS.filter((p) => /export const MAX_PROPUESTAS_POR_PASO/.test(fs.readFileSync(p, 'utf8')));
    return declaran.length === 1 && declaran[0].endsWith('functions/src/core/contracts.ts');
  })(),
  'functions/src/core/contracts.ts · una hoja sin imports, para que leerla no cueste nada');

/*
 * ── Y NO PASA POR `engine/types.ts`, QUE ES LO QUE PARECÍA MÁS CÓMODO ───────
 *
 * Reexportarla desde ahí habría ahorrado seis líneas y los seis consumidores no
 * se habrían enterado. Lo que costaba no se veía: `engine/types.ts` lo importa
 * medio motor y todo lo que le pedía al Core eran TIPOS, que el compilador
 * borra al emitir. Colgarle un valor le daba al módulo más compartido del motor
 * una dependencia de EJECUCIÓN con el Core entero — y el arnés de pureza del
 * Core, que incrusta cada módulo dentro de sus dependientes, pasó de 6,9 MB a
 * 37,3 MB y se quedó sin memoria. Un acoplamiento que no se veía avisando de la
 * forma más ruidosa posible.
 */
/*
 * ── Y CADA UNO LA PIDE POR DONDE LE CORRESPONDE ─────────────────────────────
 *
 * Los adaptadores de proveedor tienen PROHIBIDO nombrar al Core —lo vigila
 * `gateway-autoridad`— y con razón: un adaptador traduce para una API concreta
 * y no tiene por qué saber que hay un Core detrás. Así que leen de su propia
 * capa, `engine/types.ts`, que reexporta. Los dos que no son adaptadores la
 * piden directamente donde vive.
 *
 * Lo que sí importa, y es lo que se comprueba, es DESDE DÓNDE reexporta el
 * motor: desde `core/contracts`, que no importa nada, y nunca desde el barril
 * `../core`. La diferencia no es de estilo. `engine/types.ts` lo importa medio
 * motor y todo lo que le pedía al Core eran TIPOS, que el compilador borra al
 * emitir; colgarle el barril le daba una dependencia de EJECUCIÓN con todo el
 * Core, y el arnés de pureza pasó de 6,9 MB a 37,3 MB y se quedó sin memoria.
 */
check('el motor la reexporta desde la HOJA del Core, nunca desde el barril',
  /export \{ MAX_PROPUESTAS_POR_PASO \} from '\.\.\/core\/contracts';/.test(leer('functions/src/engine/types.ts'))
  && !/from '\.\.\/core';/.test(sinComentarios(leer('functions/src/engine/types.ts')).split('\n').filter((l) => /MAX_PROPUESTAS_POR_PASO/.test(l)).join('\n')),
  'el barril habría arrastrado el Core entero al módulo que importa medio motor');

check('y leerla no arrastra nada: el archivo donde vive no importa nada',
  !/^import /m.test(leer('functions/src/core/contracts.ts')),
  'core/contracts.ts es una hoja: leerla cuesta lo que ocupa');

check('los adaptadores NO nombran al Core para leerla: la piden a su propia capa',
  ['gemini', 'flux', 'seedream'].every((p) => {
    const src = leer(`functions/src/engine/providers/${p}.ts`);
    return /import \{ MAX_PROPUESTAS_POR_PASO \} from '\.\.\/types';/.test(src) && !/core\//.test(src);
  }),
  'un adaptador traduce para una API; no tiene por qué saber que hay un Core');

check('y dice de sí misma lo que NO es: ni proveedor, ni modelo, ni `maxReferences`, ni una cantidad cualquiera',
  (() => {
    const src = leer('functions/src/core/contracts.ts');
    const doc = (src.match(/\/\*\*[\s\S]*?\*\/\s*export const MAX_PROPUESTAS_POR_PASO/) || [''])[0];
    return /proveedor/i.test(doc) && /modelo/i.test(doc) && /maxReferences/.test(doc) && /cantidad gen[ée]rica/i.test(doc);
  })());

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · Los seis la consumen, y ninguno guarda un número propio ──');

for (const [quien, archivo] of CONSUMIDORES) {
  const src = sinComentarios(leer(archivo));
  check(quien + ' lee la autoridad compartida',
    LEE_LA_AUTORIDAD.test(src) && /MAX_PROPUESTAS_POR_PASO/.test(src.split('\n').filter((l) => l.startsWith('import')).join('\n')),
    archivo.replace('functions/src/', ''));
  check('  …y no se ha guardado un máximo propio',
    !NUMERO_A_MANO.test(src),
    'ni 8, ni 4, ni ningún otro');
}

check('en TODO el servidor no queda ni un solo máximo de propuestas escrito a mano',
  ARCHIVOS_TS.filter((p) => NUMERO_A_MANO.test(sinComentarios(fs.readFileSync(p, 'utf8')))).length === 0,
  'la ventana 5–8 solo puede volver a abrirse escribiendo un número, y aquí no hay ninguno');

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · Precio y ejecución normalizan IGUAL ──');

/*
 * La cantidad que ACABA cobrándose sale del precio de verdad; la que acaba
 * EJECUTÁNDOSE, de un adaptador de verdad —el de demostración, que es el único
 * que corre sin red ni clave—. Los otros tres escriben exactamente la misma
 * expresión, y eso lo sujeta la sección B: lo que hace este hace los cuatro.
 */
const VALORES = [undefined, 1, 2, 3, 4, 5, 8, 20, 0, -1, 3.7, '3', 'tres', NaN, Infinity];
const eti = (v) => (v === undefined ? 'undefined' : typeof v === 'string' ? JSON.stringify(v) : Number.isNaN(v) ? 'NaN' : String(v));
const ctx = { userId: 'u1', jobId: 'j1', experienceId: 'design', goal: 'tres logos' };

const delPrecio = (v) => priceImage({ capability: 'image.generate', kind: 'logo', count: v, available: () => true }, S).detail.count;
const laEjecucion = async (v) => {
  const r = await mockProvider.run('image.generate', { count: v, purpose: 'Crear logos' }, ctx);
  return r.output.urls ? r.output.urls.length : r.output.url ? 1 : 0;
};

console.log('   valor      precio  ejecución');
const desacuerdos = [];
for (const v of VALORES) {
  const p = delPrecio(v);
  const e = await laEjecucion(v);
  const mismos = Number.isNaN(p) ? Number.isNaN(e) || e === 0 : p === e;
  console.log('   ' + eti(v).padEnd(9) + '  ' + String(Number.isNaN(p) ? 'NaN' : p).padStart(6) + '  ' + String(e).padStart(9) + (mismos ? '' : '   ← DISCREPAN'));
  if (!mismos) desacuerdos.push(eti(v) + ' (precio ' + p + ' · ejecución ' + e + ')');
}

/*
 * ── LO QUE ESTE TECHO ARREGLA, Y LO QUE DEJA ────────────────────────────────
 *
 * Un `count` solo puede ser un entero: pedir tres logos y pedir tres coma siete
 * no son dos cantidades, la segunda no es una cantidad. Para todo entero, el
 * precio y la ejecución llegan ya al mismo número, y eso es lo que G13.4 vino a
 * conseguir.
 *
 * El decimal es otra cosa, y sigue roto. No lo rompe el techo —que es lo que se
 * ha unificado— sino la conversión, que está escrita seis veces y ninguna
 * redondea: `Math.min(4, 3.7)` sigue siendo 3,7. El precio multiplica por 3,7 y
 * el adaptador da tres vueltas al bucle. Es la MISMA forma del fallo que se
 * acaba de cerrar —se cobra de más de lo que se entrega—, más pequeña y por
 * otra causa. Se cierra en G13.6, donde `Number.isInteger` deja de ser opcional.
 *
 * Se deja medido y nombrado, no tapado: la comprobación de abajo se pondrá roja
 * el día que alguien lo arregle a medias en uno solo de los dos lados.
 */
const ENTEROS = VALORES.filter((v) => Number.isInteger(v));
check('para todo valor ENTERO —que es lo único que un count puede ser— el precio y la ejecución llegan al mismo número',
  desacuerdos.every((d) => !ENTEROS.some((v) => d.startsWith(eti(v) + ' '))),
  ENTEROS.length + ' enteros, cero discrepancias');

check('DEUDA DECLARADA · el único que todavía discrepa es el decimal, y discrepa COBRANDO DE MÁS',
  desacuerdos.length === 1 && desacuerdos[0].startsWith('3.7 ') && delPrecio(3.7) > (await laEjecucion(3.7)),
  'precio 3,7 · ejecución 3 — misma forma que la ventana 5–8, otra causa: la conversión, no el techo (G13.6)');

check('y los que se pasan del techo llegan al techo por los dos caminos: 5→4, 8→4, 20→4',
  [5, 8, 20].every((v) => delPrecio(v) === MAX_PROPUESTAS_POR_PASO),
  'antes el precio cobraba 5, 8 y 8 mientras la ejecución entregaba 4');

check('la ventana que cobraba de más está CERRADA: ya no hay ningún valor que cueste más de lo que se entrega',
  ![5, 6, 7, 8, 20, 100].some((v) => delPrecio(v) > MAX_PROPUESTAS_POR_PASO),
  'pedir ocho retoques costaba 108 Credits y devolvía cuatro imágenes');

check('PERO esto NO declara válido un cinco: la barrera es defensiva y temporal',
  delPrecio(5) === delPrecio(4) && delPrecio(5) !== 5,
  'el Planner ya lo rechaza (seccion F); esto vigila el OTRO camino, el de Legacy, que no pasa por el');

/*
 * Y lo que esta fase NO arregla, dicho en voz alta para que nadie lo dé por
 * cerrado: el suelo y la conversión siguen escritos seis veces, y son ellos los
 * que dejan pasar un decimal y convierten una palabra en NaN. Eso es de G13.6.
 */
check('DEUDA DECLARADA · un decimal todavía sobrevive al techo: 3,7 no se redondea',
  delPrecio(3.7) === 3.7,
  'el Planner ya lo rechaza; aqui sigue vivo porque el camino de Legacy no pasa por el (G13.6)');

check('DEUDA DECLARADA · una palabra todavía produce NaN en el precio',
  Number.isNaN(delPrecio('tres')),
  'el Planner ya lo rechaza; y el Credit Engine lo para al cobrar (INVALID_AMOUNT). Queda el hueco de en medio (G13.6)');

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── D · Las cantidades que Weë pide hoy pasan intactas ──');

const base = (t) => Object.fromEntries((t.questions ?? []).map((q) => [q.id, q.options?.[0]?.id ?? '']));
const TUPLAS = new Map();
for (const [exp, t] of Object.entries(TEMPLATES)) {
  const b = base(t);
  const probar = (r) => {
    let p;
    try { p = t.buildPlan('un encargo de ejemplo', r); } catch { return; }
    for (const s of p.steps) {
      const c = s.input && s.input.count;
      if (c === undefined) continue;
      const k = `${exp}|${s.id}|${s.capability}|${c}`;
      if (!TUPLAS.has(k)) TUPLAS.set(k, { exp, paso: s.id, cap: s.capability, count: c, input: s.input });
    }
  };
  probar(b);
  for (const q of (t.questions ?? [])) for (const o of (q.options ?? [])) probar({ ...b, [q.id]: o.id });
}

const referencias = (cap) => (/edit|remove|restyle|try_on|upscale|identity/.test(cap) ? 1 : 0);
const intactas = [...TUPLAS.values()].filter((t) => {
  const i = t.input;
  const p = priceImage({ capability: t.cap, kind: i.kind, count: i.count, quality: i.quality, resolution: i.resolution, references: referencias(t.cap), aspectRatio: i.aspectRatio, available: () => true }, S);
  return p.detail.count === t.count;
});

check('las 20 cantidades que declaran las plantillas llegan al precio sin moverse',
  TUPLAS.size === 20 && intactas.length === 20,
  intactas.length + '/' + TUPLAS.size + ' · ' + [...new Set([...TUPLAS.values()].map((t) => t.count))].sort().map((v) => v + '→' + v).join(' '));

check('ninguna pasa del techo, así que el recorte no toca ni una',
  [...TUPLAS.values()].every((t) => t.count <= MAX_PROPUESTAS_POR_PASO),
  'la mayor es music/scenes con 4, y da justo en el techo');

check('y la ejecución entrega exactamente esas cantidades',
  (await Promise.all([...TUPLAS.values()].map(async (t) => (await laEjecucion(t.count)) === t.count))).every(Boolean),
  TUPLAS.size + ' pasos');

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── E · Lo que este techo NO es ──');

check('NO es `maxReferences`: ese es de ENTRADA, vive en el registro de modelos y VARÍA de un modelo a otro',
  new Set(IMAGE_MODELS.map((m) => m.maxReferences)).size > 1
  && !/MAX_PROPUESTAS_POR_PASO/.test(leer('functions/src/engine/imageModels.ts')),
  [...new Set(IMAGE_MODELS.map((m) => m.maxReferences))].sort((a, b) => a - b).join(' · ') + ' según el modelo');

check('NO es un límite de proveedor: ningún adaptador usa el parámetro de lote de su API, los piden de uno en uno',
  ['gemini', 'flux', 'seedream'].every((p) => {
    const src = sinComentarios(leer(`functions/src/engine/providers/${p}.ts`));
    return /for \(let i = 0; i < count; i\+\+\)/.test(src) && !/numberOfImages|sampleCount|candidateCount|num_images/.test(src);
  }));

check('NO se ha tocado el descuento por volumen, aunque su tramo de 5 quede fuera de alcance',
  volumeFactor(1) === 1 && volumeFactor(2) === 1 && volumeFactor(3) === 0.95 && volumeFactor(4) === 0.95 && volumeFactor(5) === 0.9,
  'G13.4 unifica el techo; no limpia el Pricing histórico');

check('esta suite está en la cadena de `npm test`',
  /techo-de-propuestas\.test\.mjs/.test(leer('functions/package.json')));

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── F · G13.5 · LA AUTORIDAD ES DEL PLANNER ──');

/*
 * Hasta aquí, el techo era una barrera: quien recibía un cinco lo encogía a
 * cuatro y seguía. Eso nunca fue el contrato —era lo único que se podía hacer
 * sin nadie que supiera decir que no—. Desde G13.5 lo hay: el Planner mira la
 * cantidad, y si no cabe, el plan no sale.
 *
 * Se prueba contra el Planner de verdad, no contra un ayudante suelto: lo que
 * importa no es que una función sepa distinguir un 5 de un 4, sino que un
 * entendimiento con un 5 no produzca plan.
 */
const { crearPlannerDeWee, disponibilidadDe } = lib('planner/index.js');
const { CAPABILITY_CATALOG, PLANNER_CONTRACT_VERSION } = lib('core/index.js');
const ROUTABLES = CAPABILITY_CATALOG.filter((c) => c.status === 'ROUTABLE').map((c) => c.id);
const planner = crearPlannerDeWee({ availability: disponibilidadDe(ROUTABLES), tracer: { record() {} }, now: () => 1000 });

const planear = async (paso) => planner.planificar({
  contract: PLANNER_CONTRACT_VERSION,
  trace: { traceId: 'g135', requestId: 'g135', userId: 'acc_x' },
  understanding: {
    intent: 'creation', confidence: 'high', goal: 'tres logos para mi marca',
    capability: 'image.generate', capabilities: ['image.generate'],
    steps: [{ key: 'logos', capability: 'image.generate', input: { kind: 'logo', brief: 'tres logos' }, ...paso }],
    inputs: { text: '', attachments: [] }, references: [], constraints: {},
    needsPlanning: true, missing: [], assumptions: [],
  },
});

const VALIDOS = [1, 2, 3, 4];
for (const v of VALIDOS) {
  const r = await planear({ count: v });
  check(`count=${v} es válido, y llega al plan SIN MOVERSE`,
    r.status === 'ready' && r.plan.steps[0].input.count === v,
    r.status === 'ready' ? JSON.stringify(r.plan.steps[0].input) : r.status);
}

{
  const r = await planear({});
  check('count ausente sigue siendo válido, y NO se inventa un 1',
    r.status === 'ready' && !('count' in r.plan.steps[0].input),
    'ausente ≠ pedir una: 54 de los 74 pasos de Weë no piden varias');
}

const INVALIDOS = [
  [5, 'se pasa del techo por uno'],
  [8, 'el viejo tope del precio'],
  [20, 'muy por encima'],
  [0, 'cero propuestas no es una petición'],
  [-1, 'negativo'],
  [3.7, 'decimal — la deuda D5 de G13.4, cerrada aquí'],
  [NaN, 'no es un número'],
  [Infinity, 'no es un número'],
  [-Infinity, 'no es un número'],
  ['3', 'texto que parece número: NO se convierte'],
  ['tres', 'texto'],
  [true, 'booleano'],
  [null, 'nulo ≠ ausente'],
];
for (const [v, porque] of INVALIDOS) {
  const r = await planear({ count: v });
  const eti2 = typeof v === 'string' ? JSON.stringify(v) : String(v);
  check(`count=${eti2} → invalid_request, y con el campo señalado`,
    r.status === 'invalid'
    && r.error?.code === 'INVALID_REQUEST'
    && r.error?.details?.reason === 'invalid_request'
    && r.error?.details?.field === 'understanding.steps.0.count'
    && r.plan === undefined,
    porque);
}

console.log('\n── G · NADA SE NORMALIZA EN SILENCIO ──');

/*
 * Esta es la comprobación que más importa, porque el fallo que G13 vino a
 * cerrar no era «el número estaba mal»: era que el número se arreglaba solo.
 * Un cinco convertido en cuatro pasa todas las pruebas de coherencia y le
 * entrega a la persona algo distinto de lo que aprobó.
 */
for (const v of [5, 8, 20, 3.7, 0, -1]) {
  const r = await planear({ count: v });
  check(`count=${v} NO acaba siendo otro número: no hay plan, y punto`,
    r.status === 'invalid' && r.plan === undefined,
    'ni 4, ni 3, ni 1');
}

check('el Planner no tiene con qué arreglar una cantidad: ni recorta, ni redondea, ni convierte',
  (() => {
    const src = sinComentarios(leer('functions/src/core/planner.ts'));
    const trozo = (src.match(/if \(paso\.count !== undefined\)[\s\S]*?\n    \}/) || [''])[0];
    return trozo.length > 0
      && !/Math\.(min|max|round|floor|ceil|trunc)/.test(trozo)
      && !/Number\(|parseInt|parseFloat/.test(trozo)
      && /Number\.isInteger/.test(trozo);
  })(),
  'la validación entera cabe en cuatro condiciones y ninguna es una corrección');

console.log('\n── H · LA AUTORIDAD ES DEL CORE, NO DE QUIEN COBRA NI DE QUIEN EJECUTA ──');

const PLANNER_SRC = sinComentarios(leer('functions/src/core/planner.ts'));
check('el Planner lee el techo del propio Core, no se lo pregunta a nadie de fuera',
  /import \{ MAX_PROPUESTAS_POR_PASO,[^}]*\} from '\.\/contracts';/.test(PLANNER_SRC));
check('y no importa el precio, ni los Credits, ni un proveedor para saberlo',
  !/from '\.\.\/credits|from '\.\.\/engine|aiPricing|providers\//.test(PLANNER_SRC),
  'la dirección es de ida: el motor conoce al Core, nunca al revés');
check('ningún archivo del Core importa del motor',
  ARCHIVOS_TS.filter((p) => p.includes('/src/core/') && /from '\.\.?\/\.\.?\/?engine/.test(fs.readFileSync(p, 'utf8'))).length === 0);

console.log('\n── I · EL PUENTE DE LEGACY YA NO LA PIERDE ──');

const { pasosParaElCore } = lib('creator/necesidades.js');
{
  const conCount = [...TUPLAS.values()].filter((t) => t.count !== undefined);
  const llegan = conCount.filter((t) => {
    const { steps } = pasosParaElCore([{ id: t.paso, capability: t.cap, purpose: 'x', input: t.input }]);
    return steps[0] && steps[0].count === t.count;
  });
  check('las 20 cantidades de las plantillas cruzan el puente intactas',
    llegan.length === conCount.length && conCount.length === 20,
    llegan.length + '/' + conCount.length + ' · antes de G13.5 se perdían las 20');

  const sinCount = pasosParaElCore([{ id: 'guion', capability: 'text.generate', purpose: 'x', input: { kind: 'script', brief: 'un guion' } }]);
  check('y un paso que no la pide sigue sin llevarla: el puente no inventa ninguna',
    sinCount.steps[0].count === undefined);

  check('el puente COPIA, no corrige: una cantidad imposible cruza y la tumba el Planner',
    pasosParaElCore([{ id: 'x', capability: 'image.generate', purpose: 'x', input: { kind: 'logo', count: 9 } }]).steps[0].count === 9,
    'recortarla aquí dejaría al Planner sin nada que rechazar');
}

{
  const t = [...TUPLAS.values()].find((x) => x.count === 4);
  const { steps } = pasosParaElCore([{ id: t.paso, capability: t.cap, purpose: 'x', input: t.input }]);
  const r = await planner.planificar({
    contract: PLANNER_CONTRACT_VERSION, trace: { traceId: 'b', requestId: 'b', userId: 'acc_x' },
    understanding: {
      intent: 'creation', confidence: 'high', goal: 'las escenas del videoclip',
      capability: t.cap, capabilities: [t.cap], steps: [...steps],
      inputs: { text: '', attachments: [] }, references: [], constraints: {},
      needsPlanning: true, missing: [], assumptions: [],
    },
  });
  check('y el borde válido llega entero de punta a punta: plantilla → puente → Planner → plan',
    r.status === 'ready' && r.plan.steps[0].input.count === 4,
    t.exp + '/' + t.paso + ' pide 4, y el plan dice 4');
}

console.log('\n── J · BRAIN SIGUE SIN PODER PRODUCIRLA ──');

check('`BrainStepInput` sigue admitiendo solo `kind` y `brief`',
  /const CLAVES_DE_ENTRADA_DEL_PASO = Object\.keys\(\{ kind: 0, brief: 0 \}\);/.test(PLANNER_SRC)
  && (await planear({ input: { kind: 'logo', count: 3 } })).status === 'invalid',
  'la cantidad es HERMANA de `input`, no vive dentro');

check('el intérprete de lo que contesta el modelo NO lee la cantidad: la descarta antes de que sea un paso',
  (() => {
    const src = sinComentarios(leer('functions/src/core/brain.ts'));
    const trozo = (src.match(/const entrada = esObjetoPlano\(bruto\.input\)[\s\S]*?aceptados\.push\([^\n]*\);/) || [''])[0];
    return trozo.length > 0 && !/count/.test(trozo) && !/bruto\.count/.test(src);
  })(),
  'un modelo que se la inventara la vería caer aquí');

check('y el prompt no se la enseña: lo que no se enseña, no se escribe',
  !/count/.test(leer('functions/src/creator/prompts.ts')),
  'la lección de `needs`: el campo existía en el contrato y no se pedía en ninguna parte');

console.log('\n── K · Y NO SE HA ABIERTO NINGUNA OTRA PUERTA ──');

check('`hints:{count}` sigue rechazado',
  (await planear({ hints: { count: 3 } })).status === 'invalid');
check('`count` NO viaja en `constraints`, ni en `creative`, ni en el plan a pelo',
  (() => {
    return !/count/.test(sinComentarios(leer('functions/src/core/creative.ts')))
      && !/'count'/.test(sinComentarios(leer('functions/src/core/workflow.ts')));
  })(),
  'el único sitio canónico es `PlanStep.input.count`');
check('y sigue sin caber una clave inventada al lado de la cantidad',
  (await planear({ count: 3, cantidad: 3 })).status === 'invalid',
  'la lista de claves de un paso sigue cerrada');

// ════════════════════════════════════════════════════════════════════════════
console.log();
console.log(fallos ? `✘ ${fallos} fallos de ${n}` : '✔ todo bien');
process.exit(fallos ? 1 : 0);
