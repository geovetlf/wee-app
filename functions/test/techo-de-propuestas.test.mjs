/**
 * G13.4 — EL TECHO DE PROPUESTAS POR PASO: UNO, Y EL MISMO PARA TODOS.
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
 * Ahora el número está UNA vez, en `engine/types.ts`, y lo leen los seis. Esta
 * suite existe para que no vuelvan a ser dos.
 *
 *   A · La autoridad: existe, vale 4, y no hay otra.
 *   B · Los seis la consumen, y ninguno guarda un número propio.
 *   C · Precio y ejecución normalizan IGUAL. La ventana está cerrada.
 *   D · Las cantidades que Weë pide hoy pasan intactas.
 *   E · Lo que este techo NO es.
 *
 * ── LO QUE ESTA SUITE NO DICE ───────────────────────────────────────────────
 *
 * Que pedir cinco sea válido. NO lo es. Que hoy se convierta en cuatro en vez de
 * tumbar el plan es una barrera defensiva temporal, no el contrato: significa
 * únicamente que todavía no existe nadie que sepa decir que no. Cuando el
 * Planner del Core valide la cantidad (G13.6), un cinco será `invalid_request` y
 * no llegará ni al precio ni al proveedor — y entonces las comprobaciones de la
 * sección C tendrán que cambiar, porque estarán afirmando algo que ya no pasa.
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

const { MAX_PROPUESTAS_POR_PASO } = lib('engine/types.js');
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

check('y se declara en UN solo sitio de todo el servidor',
  (() => {
    const declaran = [];
    const recorrer = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) recorrer(p);
        else if (e.name.endsWith('.ts') && /export const MAX_PROPUESTAS_POR_PASO/.test(fs.readFileSync(p, 'utf8'))) declaran.push(p);
      }
    };
    recorrer(path.resolve(RAIZ, 'functions/src'));
    return declaran.length === 1 && declaran[0].replace(/\\/g, '/').endsWith('functions/src/engine/types.ts');
  })(),
  'functions/src/engine/types.ts');

check('y dice de sí misma lo que NO es: ni proveedor, ni modelo, ni `maxReferences`, ni una cantidad cualquiera',
  (() => {
    const src = leer('functions/src/engine/types.ts');
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
  (() => {
    const culpables = [];
    const recorrer = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) recorrer(p);
        else if (e.name.endsWith('.ts') && NUMERO_A_MANO.test(sinComentarios(fs.readFileSync(p, 'utf8')))) culpables.push(p);
      }
    };
    recorrer(path.resolve(RAIZ, 'functions/src'));
    return culpables.length === 0;
  })(),
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
  'G13.6 · cuando el Planner valide, un cinco será `invalid_request` y no llegará hasta aquí');

/*
 * Y lo que esta fase NO arregla, dicho en voz alta para que nadie lo dé por
 * cerrado: el suelo y la conversión siguen escritos seis veces, y son ellos los
 * que dejan pasar un decimal y convierten una palabra en NaN. Eso es de G13.6.
 */
check('DEUDA DECLARADA · un decimal todavía sobrevive al techo: 3,7 no se redondea',
  delPrecio(3.7) === 3.7,
  'G13.6 · `Number.isInteger` entra con la validación del Planner, no aquí');

check('DEUDA DECLARADA · una palabra todavía produce NaN en el precio',
  Number.isNaN(delPrecio('tres')),
  'G13.6 · el Credit Engine ya lo rechaza al cobrar (INVALID_AMOUNT), pero el precio no debería llegar a calcularlo');

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

check('y el Core sigue cerrado: nadie ha abierto `count` por la puerta del Planner',
  !/MAX_PROPUESTAS_POR_PASO/.test(leer('functions/src/core/planner.ts') + leer('functions/src/core/brain.ts') + leer('functions/src/creator/necesidades.ts')),
  'G13 sigue abierto: la autoridad del contrato es de G13.5/G13.6');

check('esta suite está en la cadena de `npm test`',
  /techo-de-propuestas\.test\.mjs/.test(leer('functions/package.json')));

// ════════════════════════════════════════════════════════════════════════════
console.log();
console.log(fallos ? `✘ ${fallos} fallos de ${n}` : '✔ todo bien');
process.exit(fallos ? 1 : 0);
