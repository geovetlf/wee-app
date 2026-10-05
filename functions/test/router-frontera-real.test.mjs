/**
 * S6-D · LA FRONTERA, CONTRA LA CONFIGURACIÓN REAL DE WEË.
 *
 * S6-C fijó la regla y la probó con tres proveedores inventados. Esto la prueba
 * contra `DEFAULT_ROUTING`: las 28 cadenas que Weë tiene declaradas hoy, tal
 * como están, sin tocarlas.
 *
 *   POLICY DEFINES THE BOUNDARY. SCORING ORDERS WITHIN THE BOUNDARY.
 *
 * Y la pregunta que contesta, que es el paso PROBAR de la secuencia acordada:
 * ¿puede la política alimentarse de la configuración que ya existe, sin
 * inventar nada y sin ensanchar la frontera ni una vez?
 *
 *   A · El puente: de `aiRouting` a la frontera, capacidad por capacidad
 *   B · La frontera, medida contra las 28 cadenas reales
 *   C · Lo que NO se pudo traducir, y por qué se dice en vez de aproximar
 *   D · Nada tocado, nada ejecutado
 *
 * Sin proveedor real, sin red, sin libro, sin Credits, sin Firestore.
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

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const core = lib('core/index.js');
const politica = lib('router/politica.js');
const registroDeWee = lib('registry/index.js');
const motorRegistro = lib('engine/registry.js');
const { registroConPolitica, cadenasDesdeLaConfiguracion } = politica;

/** LA CONFIGURACIÓN REAL. No una copia, no una versión de prueba: la que hay. */
const REAL = motorRegistro.DEFAULT_ROUTING;

/* ═══ A · EL PUENTE ═══════════════════════════════════════════════════════ */
console.log('\n── A · De `aiRouting` a la frontera, sin inventar nada ──');
{
  const { cadenas, sinTraducir } = cadenasDesdeLaConfiguracion(REAL);
  const capacidades = Object.keys(REAL);

  /* Las 28 de siempre y world.generate (misión fal, 2026-10-05). */
  check('A) las 29 capacidades declaradas se traducen', capacidades.length === 29 && capacidades.includes('world.generate'), `${capacidades.length}`);
  check('A) y hoy NINGUNA se queda fuera: no hay un solo eslabón con banda de calidad',
    sinTraducir.length === 0, sinTraducir.map((s) => s.capability).join(',') || 'ninguna');

  /* Fidelidad, eslabón a eslabón. */
  const infieles = capacidades.filter((cap) => {
    const dec = REAL[cap].chain;
    const tra = cadenas[cap] ?? [];
    if (dec.length !== tra.length) return true;
    return dec.some((l, i) => l.provider !== tra[i].providerId || (l.model ?? undefined) !== tra[i].modelId);
  });
  check('A) FIEL: mismo orden, mismos proveedores, mismos modelos fijados',
    infieles.length === 0, infieles.join(',') || 'las 28');

  const conModelo = capacidades.filter((c) => (cadenas[c] ?? []).some((e) => e.modelId !== undefined));
  check('A) los seis eslabones con modelo fijado conservan su modelo',
    conModelo.length === 5 && conModelo.includes('image.identity_edit') && conModelo.includes('image.try_on'),
    conModelo.join(','));

  const vacias = capacidades.filter((c) => (cadenas[c] ?? []).length === 0);
  check('A) y las cuatro cadenas vacías siguen vacías: cerrada allí, cerrada aquí',
    vacias.sort().join(',') === 'doc.render,video.compose,video.montage,video.vertical',
    vacias.join(','));
}

/* ═══ B · LA FRONTERA, MEDIDA ═════════════════════════════════════════════ */
console.log('\n── B · Lo que el Router ve, contra lo que la cadena autoriza ──');
{
  /*
   * Adaptadores sintéticos con los NOMBRES REALES de la configuración. Lo que
   * se mide aquí es la FRONTERA —quién entra y quién no—, que es exactamente
   * lo que la regla aceptada gobierna. Las notas de calidad son uniformes a
   * propósito: comparar puntuaciones exigiría el catálogo real de modelos, y
   * la puntuación no decide la frontera. Se dice, no se disimula.
   */
  const { cadenas } = cadenasDesdeLaConfiguracion(REAL);
  const proveedoresReales = [...new Set(Object.values(REAL).flatMap((r) => r.chain.map((l) => l.provider)))];
  const modelosFijados = new Set(Object.values(REAL).flatMap((r) => r.chain.map((l) => l.model).filter(Boolean)));

  const llamadas = [];
  /*
   * CADA PROVEEDOR SABE HACERLO TODO, y es deliberado: así el registro es
   * ANCHO y la frontera tiene algo que estrechar. Un fixture donde cada
   * proveedor solo declara las capacidades en las que ya está autorizado hace
   * que la política no quite nada — y entonces «no ensancha la frontera» se
   * cumple sin que la frontera exista. Este mundo es el caso difícil: todos
   * podrían, y solo entran los que la cadena nombra.
   */
  const TODAS = Object.keys(REAL);
  const ADAPTADORES = Object.fromEntries(proveedoresReales.map((p) => {
    const caps = TODAS;
    /* Cada proveedor trae su modelo genérico y, además, los suyos fijados por la configuración. */
    const suyos = [...modelosFijados].filter((m) => Object.values(REAL).some((r) => r.chain.some((l) => l.provider === p && l.model === m)));
    const models = [
      { id: `${p}-general`, provider: p, capabilities: caps, quality: 4, speed: 4, cost: { unit: 'call', usd: 0.01 } },
      ...suyos.map((m) => ({ id: m, provider: p, capabilities: caps, quality: 4, speed: 4, cost: { unit: 'call', usd: 0.01 } })),
    ];
    return [p, {
      id: p, name: p, modalities: ['text', 'image', 'video', 'voice', 'music', 'doc'], models,
      isConfigured: () => true,
      supports: (c) => caps.includes(c),
      async run(r) { llamadas.push(`${p}:${r.capability}`); return { output: { kind: 'text', content: 'x' }, usage: {}, costUSD: 0, latencyMs: 1 }; },
    }];
  }));
  const provs = Object.fromEntries(proveedoresReales.map((p) => [p, { enabled: true, priority: 50 }]));
  const base = () => core.crearRegistro(registroDeWee.datosDelRegistro(ADAPTADORES, provs));

  const conFrontera = registroConPolitica(base(), { cadenas });
  const sinFrontera = base();

  /* Para cada capacidad: ¿lo que el Router ve es exactamente lo que la cadena autoriza? */
  const fuera = [];
  const ensanchadas = [];
  for (const [cap, r] of Object.entries(REAL)) {
    const autorizados = new Set(r.chain.map((l) => l.provider));
    const vistos = conFrontera.getCapabilityImplementations(cap).map((i) => i.provider.id);
    for (const v of vistos) if (!autorizados.has(v)) ensanchadas.push(`${cap}:${v}`);
    /* Y el orden: el primero que ve el Router es el primero de la cadena. */
    if (r.chain.length && vistos.length && vistos[0] !== r.chain[0].provider) fuera.push(`${cap}: ${vistos[0]} ≠ ${r.chain[0].provider}`);
  }
  check('B) NINGUNA capacidad ensancha la frontera: el Router nunca ve a quien la cadena no autorizó',
    ensanchadas.length === 0, ensanchadas.slice(0, 3).join(' | ') || 'las 28 respetadas');
  check('B) y el registro entrega en el ORDEN de la cadena: el primero es el primero',
    fuera.length === 0, fuera.slice(0, 3).join(' | ') || 'las 28 en orden');

  /* La prueba que le da sentido: SIN frontera, sí se ve a quien no está. */
  const ejemplo = 'vision.describe';
  const autorizadosDelEjemplo = REAL[ejemplo].chain.map((l) => l.provider);
  const sin = sinFrontera.getCapabilityImplementations(ejemplo).map((i) => i.provider.id);
  const con = conFrontera.getCapabilityImplementations(ejemplo).map((i) => i.provider.id);
  check('B) y la frontera HACE algo: sin política se ven más proveedores que los autorizados',
    sin.length > con.length && con.every((p) => autorizadosDelEjemplo.includes(p)),
    `${ejemplo}: sin=${sin.length} con=${con.length} (autorizados: ${autorizadosDelEjemplo.join(',')})`);

  /* Las cuatro vacías: cerradas de verdad. */
  const cerradas = ['video.compose', 'video.montage', 'video.vertical', 'doc.render']
    .filter((c) => conFrontera.getCapabilityImplementations(c).length === 0);
  check('B) las cuatro capacidades declaradas sin cadena quedan CERRADAS',
    cerradas.length === 4, cerradas.join(','));

  /* Y el Router entero, sobre una capacidad real. */
  const router = core.crearRouter({ registry: conFrontera });
  const d = router.resolver({
    contract: core.ROUTER_CONTRACT_VERSION, capability: 'image.generate',
    trace: { traceId: 's6d_uno', requestId: 's6d_uno', userId: 'user-0001' },
  });
  check('B) el Router decide dentro de la frontera de `image.generate`',
    d.status === 'routed' && REAL['image.generate'].chain.some((l) => l.provider === d.selected.providerId)
    && d.candidates.every((c) => REAL['image.generate'].chain.some((l) => l.provider === c.providerId)),
    `${d.selected?.providerId} de ${REAL['image.generate'].chain.map((l) => l.provider).join('→')}`);
  check('B) y una capacidad cerrada NO se enruta: `unavailable`, sin inventar a nadie',
    core.crearRouter({ registry: conFrontera }).resolver({
      contract: core.ROUTER_CONTRACT_VERSION, capability: 'video.compose',
      trace: { traceId: 's6d_dos', requestId: 's6d_dos', userId: 'user-0001' },
    }).status === 'unavailable');

  check('D) NINGÚN adaptador se ejecutó', llamadas.length === 0, `${llamadas.length}`);
}

/* ═══ C · LO QUE NO SE PUEDE TRADUCIR ═════════════════════════════════════ */
console.log('\n── C · Fallar cerrado, y decirlo ──');
{
  /*
   * Hoy no hay ningún eslabón con banda de calidad. El día que lo haya, la
   * capacidad ENTERA se queda sin traducir — porque traducirla sin la banda
   * dejaría ese eslabón SIEMPRE autorizado, y eso es ensanchar la frontera
   * por descuido.
   */
  const conBanda = { 'image.generate': { capability: 'image.generate', chain: [{ provider: 'gemini' }, { provider: 'flux', minQuality: 'max' }] } };
  const r = cadenasDesdeLaConfiguracion(conBanda);
  check('C) un eslabón con banda de calidad deja la capacidad SIN traducir',
    r.sinTraducir.length === 1 && r.sinTraducir[0].capability === 'image.generate'
    && r.sinTraducir[0].motivo === 'banda_de_calidad');
  check('C) y NO se traduce a medias: esa capacidad no aparece en las cadenas',
    r.cadenas['image.generate'] === undefined);
  check('C) sin política, el Core ve el registro entero — y eso se DICE, no se esconde',
    /sinTraducir/.test(leer('functions/src/router/politica.ts'))
    && /una frontera a medias es peor que ninguna/.test(leer('functions/src/router/politica.ts')));

  check('C) una capacidad sin configuración se ignora, no se cierra por accidente',
    Object.keys(cadenasDesdeLaConfiguracion({ 'x.y': undefined }).cadenas).length === 0);
  /* El nombre del módulo del motor aparece en un comentario, explicando por qué NO se importa. */
  check('C) y el puente no importa nada del motor: recibe una forma, no un módulo',
    !/from '\.\.\/engine|CapabilityRouting|ChainLink/.test(sinComentarios(leer('functions/src/router/politica.ts')))
    && [...leer('functions/src/router/politica.ts').matchAll(/^import .* from '([^']+)';$/gm)].every(([, d]) => d === '../core'));
}

/* ═══ D · NADA TOCADO ═════════════════════════════════════════════════════ */
console.log('\n── D · Una costura más, y sigue sin estar conectada ──');
{
  const POL = sinComentarios(leer('functions/src/router/politica.ts'));

  check('D) `core/router.ts` sigue sin enterarse de que existe una frontera',
    !/CadenasDeRuteo|registroConPolitica|cadenasDesdeLaConfiguracion|EslabonDe/.test(leer('functions/src/core/router.ts')));
  check('D) `DEFAULT_ROUTING` no se tocó: es la configuración de producción',
    /export const DEFAULT_ROUTING/.test(leer('functions/src/engine/registry.ts'))
    && !/registroConPolitica|CadenasDeRuteo/.test(leer('functions/src/engine/registry.ts')));
  check('D) el router del motor sigue siendo el de producción',
    /engine\.generate\(/.test(leer('functions/src/gateway/index.ts'))
    && /runCapability\(/.test(leer('functions/src/creator/index.ts'))
    && !/registroConPolitica/.test(leer('functions/src/engine/router.ts')));
  check('D) y NADIE usa la política todavía: sigue siendo una costura',
    !/registroConPolitica|cadenasDesdeLaConfiguracion/.test(
      leer('functions/src/router/index.ts') + leer('functions/src/runtime/index.ts')
      + leer('functions/src/creator/index.ts') + leer('functions/src/index.ts')));
  check('D) sin libro, sin Credits, sin Firestore, sin red, sin reloj',
    !/ledger|aiGenerations|spendCredits|firestore|fetch\(|Date\.now\(|Math\.random\(/.test(POL));
  check('D) y la evidencia de S6-B y S6-C sigue intacta',
    /DIFERENCIA DE CRITERIO/.test(leer('functions/test/router-parity.test.mjs'))
    && /la política manda/.test(leer('functions/test/router-politica.test.mjs')));

  check('esta suite está en la cadena de `npm test`', /router-frontera-real\.test\.mjs/.test(leer('functions/package.json')));
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
