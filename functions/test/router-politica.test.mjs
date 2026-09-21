/**
 * S6-C · LA POLÍTICA MANDA SOBRE LA PUNTUACIÓN.
 *
 * S6-B midió que los dos routers de Weë no comparten criterio: el del motor
 * obedece una cadena declarada y el del Core puntúa el registro entero. La
 * decisión de arquitectura fue clara: **gana la cadena**.
 *
 * Esta suite hace cumplir esa decisión, y lo hace SIN tocar el Core. La regla
 * que se prueba, en dos frases:
 *
 *   LA POLÍTICA DECIDE QUÉ SE PUEDE ELEGIR.
 *   LA PUNTUACIÓN ORDENA LO QUE SE PUEDE ELEGIR.
 *
 *   A · La frontera: lo que no está en la cadena no existe
 *   B · La matriz de S6-C, caso por caso
 *   C · Salud y cuota: de quién son, y cómo llegan
 *   D · Lo que el Router sigue SIN hacer
 *   E · Determinismo
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
const { registroConPolitica } = politica;

const llamadas = [];
const modelo = (id, provider, quality, speed, usd) => ({
  id, provider, capabilities: ['text.generate'], quality, speed, cost: { unit: 'call', usd },
});
const adaptador = (id, modelos) => ({
  id, name: id, modalities: ['text'], models: modelos,
  isConfigured: () => true,
  supports: (c) => c === 'text.generate',
  async run(r) { llamadas.push(`${id}:${r.capability}`); return { output: { kind: 'text', content: 'x' }, usage: {}, costUSD: 0, latencyMs: 1 }; },
});

/*
 * Tres proveedores, y `b` es DELIBERADAMENTE el mejor: calidad 5, el más
 * rápido y el más barato. Si la política no mandara, ganaría siempre. Ese es
 * justo el punto de toda la suite.
 */
const ADAPTADORES = {
  a: adaptador('a', [modelo('a-uno', 'a', 3, 3, 0.02)]),
  b: adaptador('b', [modelo('b-uno', 'b', 5, 5, 0.001)]),
  c: adaptador('c', [modelo('c-uno', 'c', 4, 4, 0.01)]),
};
const PROVEEDORES = { a: { enabled: true, priority: 10 }, b: { enabled: true, priority: 20 }, c: { enabled: true, priority: 30 } };

const registroBase = () => core.crearRegistro(registroDeWee.datosDelRegistro(ADAPTADORES, PROVEEDORES));

let caso = 0;
const decidir = (pol) => {
  caso++;
  const router = core.crearRouter({ registry: registroConPolitica(registroBase(), pol ?? {}) });
  const d = router.resolver({
    contract: core.ROUTER_CONTRACT_VERSION,
    capability: 'text.generate',
    trace: { traceId: `s6c_${String(caso).padStart(4, '0')}`, requestId: `s6c_${String(caso).padStart(4, '0')}`, userId: 'user-0001' },
  });
  return {
    status: d.status,
    elegido: d.selected ? d.selected.providerId : null,
    alternativas: d.alternatives.map((a) => a.providerId),
    vistos: d.candidates.map((x) => x.providerId),
    caidos: d.candidates.filter((x) => !x.eligible).map((x) => `${x.providerId}:${x.reason}`),
    puntos: d.selectedScore ? Number(d.selectedScore.total.toFixed(3)) : null,
  };
};
const cadena = (...ids) => ({ cadenas: { 'text.generate': ids.map((providerId) => ({ providerId })) } });

/* ═══ A · LA FRONTERA ═════════════════════════════════════════════════════ */
console.log('\n── A · Lo que no está en la cadena no existe ──');
{
  const sinPolitica = decidir();
  check('A) SIN política, el Core puntúa el registro entero y gana el mejor puntuado',
    sinPolitica.elegido === 'b' && sinPolitica.vistos.length === 3,
    `${sinPolitica.elegido} (${sinPolitica.puntos}) de ${sinPolitica.vistos.join(',')}`);

  const soloA = decidir(cadena('a'));
  check('A) CON cadena «solo a», gana `a` aunque `b` puntúe más: la política manda',
    soloA.elegido === 'a' && soloA.status === 'routed', `${soloA.elegido}`);
  check('A) y `b` NO aparece ni como candidato descartado: el Router nunca lo vio',
    !soloA.vistos.includes('b') && soloA.vistos.length === 1,
    `vistos: ${soloA.vistos.join(',')}`);
  check('A) ni como alternativa: no hay respaldo que la política no permitiera',
    soloA.alternativas.length === 0);

  /* Y la diferencia entre «no hay cadena» y «cadena vacía». */
  const vacia = decidir({ cadenas: { 'text.generate': [] } });
  check('A) una cadena VACÍA no abre el registro: cierra la capacidad entera',
    vacia.status === 'unavailable' && vacia.elegido === null, vacia.status);
  check('A) y una cadena AUSENTE sí deja puntuar: ausente y vacía no son lo mismo',
    decidir({ cadenas: {} }).elegido === 'b');
}

/* ═══ B · LA MATRIZ DE S6-C ═══════════════════════════════════════════════ */
console.log('\n── B · Los siete casos, uno a uno ──');
{
  /* Caso 1 · cadena a → b, con b mejor puntuado. */
  const caso1 = decidir(cadena('a', 'b'));
  check('B1) cadena a→b con `b` mejor puntuado: los dos son candidatos, y gana el puntuado',
    caso1.vistos.length === 2 && caso1.elegido === 'b',
    `elegido=${caso1.elegido} vistos=${caso1.vistos.join(',')}`);
  check('B1) …pero `c` sigue fuera: la puntuación ordenó DENTRO de la frontera, no la cruzó',
    !caso1.vistos.includes('c'));

  /* Caso 2 · a en pausa, b sano. */
  const caso2 = decidir({ ...cadena('a', 'b'), enPausa: (p) => p === 'a' });
  check('B2) `a` EN PAUSA y `b` sano: se elige `b`, y `a` consta como descartado',
    caso2.elegido === 'b' && caso2.caidos.some((x) => x.startsWith('a:')),
    `elegido=${caso2.elegido} caidos=${caso2.caidos.join(',')}`);
  check('B2) y el motivo lo pone la SALUD del registro, no una regla nueva del Router',
    caso2.caidos.join(',').includes('not_usable'));

  /* Caso 3 · a sin cuota, b disponible. */
  const caso3 = decidir({ ...cadena('a', 'b'), sinCuota: (p) => p === 'a' });
  check('B3) `a` SIN CUOTA y `b` disponible: se elige `b`',
    caso3.elegido === 'b' && caso3.caidos.some((x) => x.startsWith('a:')), `elegido=${caso3.elegido}`);
  check('B3) y la cuota entra como elegibilidad, no como responsabilidad del Router',
    /sinCuota\?: \(providerId: string\) => boolean/.test(leer('functions/src/router/politica.ts'))
    && !/aiUsage|maxCallsPerDay|dayKey|contarLlamadas/.test(sinComentarios(leer('functions/src/router/politica.ts'))));

  /* Caso 4 · proveedor explícito sano, otro mejor puntuado. */
  const caso4 = decidir(cadena('a'));
  check('B4) proveedor EXPLÍCITO sano: conserva la prioridad aunque otro puntúe más',
    caso4.elegido === 'a' && decidir().elegido === 'b',
    `con política=${caso4.elegido} · sin política=b`);

  /* Caso 5 · explícito caído, otro sano. */
  const caso5 = decidir({ ...cadena('a'), enPausa: (p) => p === 'a' });
  check('B5) explícito CAÍDO y sin respaldo en la cadena: NO se inventa uno',
    caso5.elegido === null && caso5.status === 'unavailable', `${caso5.status}`);
  check('B5) el respaldo existe solo si la POLÍTICA lo declaró',
    decidir({ ...cadena('a', 'c'), enPausa: (p) => p === 'a' }).elegido === 'c');

  /* Caso 6 · cambiar puntuaciones no saca de la frontera. */
  const caso6 = decidir(cadena('a', 'c'));
  check('B6) cambien lo que cambien las puntuaciones, `b` —el mejor de todos— nunca entra',
    !caso6.vistos.includes('b') && ['a', 'c'].includes(caso6.elegido),
    `elegido=${caso6.elegido} vistos=${caso6.vistos.join(',')}`);

  /* Caso 7 · determinismo. */
  const tres = [decidir(cadena('a', 'c')), decidir(cadena('a', 'c')), decidir(cadena('a', 'c'))];
  check('B7) tres veces el mismo caso: la misma decisión y la misma puntuación',
    new Set(tres.map((t) => t.elegido)).size === 1 && new Set(tres.map((t) => t.puntos)).size === 1,
    `${tres.map((t) => t.elegido).join(',')}`);
}

/* ═══ C · DE QUIÉN SON LA SALUD Y LA CUOTA ════════════════════════════════ */
console.log('\n── C · El Router no es dueño de nada de esto ──');
{
  const POL = sinComentarios(leer('functions/src/router/politica.ts'));

  check('C) la SALUD la decide otro y ENTRA por parámetro: aquí no se calcula',
    /enPausa\?: \(providerId: string\) => boolean/.test(leer('functions/src/router/politica.ts'))
    && !/isOpen\(|failures|openUntil|contador|circuito/.test(POL));
  check('C) y se expresa donde el Core YA la mira: `provider.health.state`',
    /health: \{ state: 'UNAVAILABLE', reason: motivo \}/.test(leer('functions/src/router/politica.ts'))
    && /provider\.health\?\.state === 'UNAVAILABLE'/.test(leer('functions/src/core/gateway.ts')));
  check('C) así que el Router descarta con la regla que YA tenía: no aprendió nada nuevo',
    !/[Ee]nPausa|sinCuota|cadena/.test(leer('functions/src/core/router.ts')));

  check('C) NO se creó un segundo registro: los otros métodos se delegan tal cual',
    /\.\.\.registro,/.test(leer('functions/src/router/politica.ts'))
    && !/getModel\(|listModels\(|getProvider\(|getAdapter\(/.test(POL));
  check('C) ni un segundo sistema de salud, ni uno de cuotas',
    !/crearSalud|HealthStore|memoryHealth|crearCuotas|QuotaStore/.test(POL));
}

/* ═══ D · LO QUE EL ROUTER SIGUE SIN HACER ════════════════════════════════ */
console.log('\n── D · Decision-only, y sigue siéndolo ──');
{
  const POL = sinComentarios(leer('functions/src/router/politica.ts'));
  const CORE = sinComentarios(leer('functions/src/core/router.ts'));

  check('D) NO hay reintentos: ni aquí, ni en el Router del Core',
    !/reintent|retry|for \(const candidate/.test(POL + CORE));
  check('D) NO hay ejecución: ningún adaptador se llama desde la política',
    !/\.run\(|ejecutar\(|generate\(/.test(POL));
  check('D) NO hay libro: ni `aiGenerations`, ni `ledger`',
    !/aiGenerations|ledger|libro/.test(POL + CORE));
  /*
   * El Router del Core NOMBRA `maxCredits` —acepta un tope como restricción—
   * pero no lo convierte, no lo cobra y no lo pone: avisa `budget_not_checked`
   * y sigue. Eso es lo correcto, y es distinto de cobrar. Lo que se vigila es
   * que no APAREZCA una autoridad financiera aquí dentro.
   */
  check('D) NO se cobra ni se pone precio: convertir a Credits es del Financial Core',
    !/spendCredits|holdCredits|refundCredits|creditsFor|creditEngine/.test(POL + CORE)
    && /budget_not_checked/.test(CORE)
    && !/Credits/.test(POL));
  check('D) NO se lee el texto de nadie: la política trabaja con identificadores',
    !/prompt|goal|input\.text|MAX_HINT|regex/i.test(POL));
  check('D) y no toca Firestore, ni la red, ni el reloj',
    !/firestore|firebase|fetch\(|Date\.now\(|Math\.random\(/.test(POL));

  /* EL CORE NO SE TOCÓ. Es la comprobación que autoriza toda la fase. */
  check('D) `core/router.ts` NO se modificó: la frontera se puso ENVOLVIENDO el registro',
    !/CadenasDeRuteo|EslabonDeCadena|registroConPolitica|enPausa|sinCuota/.test(leer('functions/src/core/router.ts')));
  check('D) ni `core/registry`, ni el Gateway, ni el Planner, ni el Job Engine',
    ['core/registry/registry.ts', 'core/gateway.ts', 'core/planner.ts', 'core/job.ts']
      .every((f) => !/registroConPolitica|CadenasDeRuteo/.test(leer(`functions/src/${f}`))));
  check('D) y NADIE lo usa todavía: es una costura, no una migración',
    !/registroConPolitica/.test(leer('functions/src/router/index.ts') + leer('functions/src/runtime/index.ts')
      + leer('functions/src/creator/index.ts') + leer('functions/src/engine/router.ts')));
}

/* ═══ E · SIN EFECTOS ═════════════════════════════════════════════════════ */
console.log('\n── E · Una frontera no ejecuta nada ──');
{
  check('E) NINGÚN adaptador se ejecutó en toda la suite', llamadas.length === 0, `${llamadas.length} llamadas`);
  check('E) la evidencia de S6-B sigue intacta: no se reescribió para que pasara',
    fs.existsSync(path.resolve(RAIZ, 'functions/test/router-parity.test.mjs'))
    && /DIFERENCIA DE CRITERIO/.test(leer('functions/test/router-parity.test.mjs')));
  check('E) el router del motor sigue siendo el de producción, sin tocar',
    /engine\.generate\(/.test(leer('functions/src/gateway/index.ts'))
    && /runCapability\(/.test(leer('functions/src/creator/index.ts')));
  check('esta suite está en la cadena de `npm test`', /router-politica\.test\.mjs/.test(leer('functions/package.json')));
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
