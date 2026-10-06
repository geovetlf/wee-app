/*
 * S1.2 · A — LA PUERTA DEL CONTEXTO VISUAL, CERRADA ANTE LO QUE NO SE ENTIENDE.
 *
 * `aiSettings/visualContext` se abría para TODAS las cuentas cuando su lista de
 * cuentas venía mal formada: el lector la descartaba y quedaba `{ habilitado:
 * true }` sin lista, que `decidirContexto` leía como «sin acotar por cuenta».
 * Ahora sigue la regla de la puerta del runtime y la de la sombra: lo que no se
 * entiende entero no abre nada.
 *
 * Lo que NO cambia —y se prueba igual—: con una configuración válida se abre
 * exactamente para las mismas cuentas que antes, y la lista AUSENTE sigue
 * significando lo que dice el contrato («si está, SOLO estas cuentas»).
 *
 *  A. La matriz obligatoria (13 casos).
 *  B. Lo que no cambia.
 *  C. La misma regla que el runtime y la sombra.
 *  D. De punta a punta: cerrada, no se lee nada más.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require_ = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require_(path.resolve(here, '../lib/' + p));

let failures = 0; let n = 0;
const check = (nombre, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${nombre}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const {
  leerConfiguracionDelContexto, decidirContexto, contextoParaBrain, configuracionDelContexto,
  olvidarElContexto, CONTEXTO_CERRADO,
} = lib('elements/contexto.js');
const { leerPuerta } = lib('runtime/puerta.js');
const { leerSombra } = lib('creator/sombra.js');

const A = 'cuenta_autorizada_A';
const B = 'cuenta_ajena_B';
/* ¿Se resuelve contexto para esta cuenta con esto guardado? La pregunta entera: leer + decidir. */
const abre = (crudo, cuenta) => decidirContexto(leerConfiguracionDelContexto(crudo), { accountId: cuenta, necesidades: 1 });
const cerradaPara = (crudo, cuentas = [A, B, '*', '', undefined]) => cuentas.every((c) => abre(crudo, c).resolver === false);
const describir = (crudo) => cuentasQueAbren(crudo).join(',') || 'nadie';
const cuentasQueAbren = (crudo) => [A, B, '*', 'uid'].filter((c) => abre(crudo, c).resolver);

console.log('\n─── A. La matriz obligatoria ───');

check('CASE 1 · configuración ausente → CERRADA', cerradaPara(undefined) && cerradaPara(null)
  && leerConfiguracionDelContexto(undefined) === CONTEXTO_CERRADO, describir(undefined));
check('CASE 2 · habilitado=false → CERRADA, tenga la lista que tenga',
  cerradaPara({ habilitado: false }) && cerradaPara({ habilitado: false, cuentas: [A] }) && abre({ habilitado: false, cuentas: [A] }, A).motivo === 'deshabilitado');
check('CASE 3 · habilitado=true + cuentas=[] → CERRADA para todas',
  cerradaPara({ habilitado: true, cuentas: [] }), describir({ habilitado: true, cuentas: [] }));
check('CASE 4 · habilitado=true + una cuenta autorizada válida → ABIERTA SOLO para esa cuenta',
  abre({ habilitado: true, cuentas: [A] }, A).resolver === true && abre({ habilitado: true, cuentas: [A] }, A).motivo === 'abierto'
  && JSON.stringify(cuentasQueAbren({ habilitado: true, cuentas: [A] })) === JSON.stringify([A]),
  describir({ habilitado: true, cuentas: [A] }));
check('CASE 5 · habilitado=true + una cuenta NO autorizada → CERRADA para ella',
  abre({ habilitado: true, cuentas: [A] }, B).resolver === false && abre({ habilitado: true, cuentas: [A] }, B).motivo === 'cuenta_fuera_de_la_prueba'
  && abre({ habilitado: true, cuentas: [A] }, undefined).resolver === false && abre({ habilitado: true, cuentas: [A] }, '').resolver === false);
for (const [caso, nombre, cuentas] of [
  ['CASE 6', 'cuentas=null', null],
  ['CASE 7', 'cuentas={}', {}],
  ['CASE 8', 'cuentas="uid" (una cadena suelta, aunque sea la cuenta)', A],
  ['CASE 9', 'cuentas=[123]', [123]],
  ['CASE 9b', 'cuentas=123 (un número suelto)', 123],
  ['CASE 10', 'cuentas=[null]', [null]],
  ['CASE 11', 'cuentas=[""]', ['']],
  ['CASE 12', 'cuentas=["*"] — el comodín no existe', ['*']],
]) {
  const crudo = { habilitado: true, cuentas };
  check(`${caso} · ${nombre} → CERRADA para todas, también para la autorizada`,
    cerradaPara(crudo) && leerConfiguracionDelContexto(crudo).habilitado === false, describir(crudo));
}
/*
 * CASE 13 · Estructura desconocida. Ni el lector de la puerta del runtime ni el
 * de la sombra son estrictos con las claves que no conocen —las ignoran—, así que
 * éste tampoco: una clave de más no cierra, pero NUNCA abre más de lo que abren
 * las que sí conoce. Lo que se prueba es eso.
 */
const conExtras = { habilitado: true, cuentas: [A], comodin: true, todas: true, cuentasExtra: ['*', B], abiertaPara: 'todos' };
check('CASE 13 · estructura desconocida → se ignora y NUNCA abre más: la misma decisión que sin ella',
  JSON.stringify(cuentasQueAbren(conExtras)) === JSON.stringify([A])
  && JSON.stringify(leerConfiguracionDelContexto(conExtras)) === JSON.stringify(leerConfiguracionDelContexto({ habilitado: true, cuentas: [A] }))
  && cerradaPara({ habilitado: true, cuentas: null, comodin: true, todas: true }),
  describir(conExtras));
check('13b · y lo mismo hacen las otras dos puertas con una clave desconocida: la ignoran',
  leerPuerta({ habilitado: true, porCapacidad: { 'text.generate': { cuentas: [A], comodin: true } }, comodin: true }).ok === true
  && leerSombra({ habilitado: true, cuentas: [A], comodin: true }).ok === true);

console.log('\n─── Más allá de la matriz ───');

check('14 · una lista con UN elemento malo se cierra entera: no se «limpia» quedándose con los buenos',
  cerradaPara({ habilitado: true, cuentas: [A, 123] }) && cerradaPara({ habilitado: true, cuentas: [A, ''] }) && cerradaPara({ habilitado: true, cuentas: [A, '*'] }));
check('15 · más de 64 cuentas → CERRADA', cerradaPara({ habilitado: true, cuentas: Array.from({ length: 65 }, (_, i) => `c${i}`) }));
check('16 · un «habilitado» que no es un booleano → CERRADA',
  ['true', 1, 'sí', null, {}].every((h) => cerradaPara({ habilitado: h, cuentas: [A] })));
check('17 · un documento que no es un objeto → CERRADA', ['abierto', [], 42, true].every((x) => cerradaPara(x)));
check('18 · y con la lista válida más larga posible (64) sigue abriendo solo para las suyas',
  (() => { const l = Array.from({ length: 64 }, (_, i) => `c${i}`); return abre({ habilitado: true, cuentas: l }, 'c63').resolver && !abre({ habilitado: true, cuentas: l }, 'c64').resolver; })());

console.log('\n─── B. Lo que no cambia ───');

/*
 * La lista AUSENTE —no rota, no vacía: ausente— significa «sin acotar por cuenta».
 * Es el contrato del tipo («Si está, SOLO estas cuentas») de ESTA puerta. No es un
 * comodín accidental: es la forma declarada de abrir para todos, y S1.2 no la
 * cambia (A4). La sombra es más estricta —sin lista no abre— y tampoco cambia. Y la
 * del runtime, desde el 2026-10-06, también: cada capacidad con SU lista, y sin
 * ella no pasa nadie (`listas-por-capacidad`); lo de aquí no la toca.
 */
check('19 · lista AUSENTE + habilitado=true → sin acotar por cuenta, como dice el contrato (sin cambios); la del runtime, sin lista, no abre',
  abre({ habilitado: true }, A).resolver && abre({ habilitado: true }, B).resolver
  && JSON.stringify(leerConfiguracionDelContexto({ habilitado: true })) === JSON.stringify({ habilitado: true })
  && leerPuerta({ habilitado: true, porCapacidad: { 'text.generate': {} } }).ok === true
  && leerPuerta({ habilitado: true, porCapacidad: { 'text.generate': {} } }).config.porCapacidad['text.generate'].cuentas === undefined);
check('20 · con una configuración válida, lo leído es lo guardado: ni se añade ni se quita una cuenta',
  JSON.stringify(leerConfiguracionDelContexto({ habilitado: true, cuentas: [A, B] })) === JSON.stringify({ habilitado: true, cuentas: [A, B] }));
check('21 · y sin necesidades no se resuelve nada aunque esté abierta: el caso normal cuesta cero',
  decidirContexto(leerConfiguracionDelContexto({ habilitado: true, cuentas: [A] }), { accountId: A, necesidades: 0 }).motivo === 'sin_necesidades');

console.log('\n─── C. La misma regla que el runtime y la sombra ───');

/* Para cada lista rota: la del runtime la da por ilegible, la de la sombra también, y ésta la cierra. */
const ROTAS = [null, {}, A, [123], [null], [''], ['*'], [A, 123]];
const alRuntime = (cuentas) => leerPuerta({ habilitado: true, porCapacidad: { 'text.generate': { cuentas } } }).ok;
const aLaSombra = (cuentas) => leerSombra({ habilitado: true, cuentas }).ok;
check('22 · cada lista rota: ilegible para el runtime, ilegible para la sombra y CERRADA aquí',
  ROTAS.every((c) => alRuntime(c) === false && aLaSombra(c) === false && cerradaPara({ habilitado: true, cuentas: c })),
  ROTAS.filter((c) => alRuntime(c) !== false || aLaSombra(c) !== false || !cerradaPara({ habilitado: true, cuentas: c })).map((c) => JSON.stringify(c)).join(' ') || 'las ocho');

console.log('\n─── D. De punta a punta ───');

/* Un Firestore de mentira: solo existe el documento de la puerta. Consultar cualquier otra cosa se anota y revienta. */
const baseCon = (doc) => {
  const lecturas = [];
  const db = {
    lecturas,
    collection: (c) => ({
      doc: (id) => ({ get: async () => { lecturas.push(`${c}/${id}`); return { exists: doc !== undefined, data: () => doc }; } }),
      where: () => { lecturas.push(`${c}?consulta`); throw new Error('cerrada, no se consulta nada'); },
      get: async () => { lecturas.push(`${c}?todo`); throw new Error('cerrada, no se consulta nada'); },
    }),
  };
  return db;
};
const NECESITA_ALGO = { intent: 'creation', confidence: 'high', goal: 'usa lo de ayer', inputs: { text: 'x', attachments: [] },
  references: [], constraints: {}, needsPlanning: true, missing: [], assumptions: [],
  context: [{ kind: 'element', elementType: 'product', required: true }] };
for (const [nombre, doc] of [['cuentas=null', { habilitado: true, cuentas: null }], ['cuentas=["*"]', { habilitado: true, cuentas: ['*'] }],
  ['cuentas={}', { habilitado: true, cuentas: {} }], ['cuentas=[123]', { habilitado: true, cuentas: [123] }]]) {
  olvidarElContexto();
  const db = baseCon(doc);
  let r; let lanzo = null;
  try { r = await contextoParaBrain(B, NECESITA_ALGO, { db }); } catch (e) { lanzo = e; }
  check(`23 · guardado ${nombre}: Brain no resuelve contexto, no lanza y no lee NADA más que la puerta`,
    lanzo === null && r?.motivo === 'deshabilitado' && r?.adjuntos?.length === 0
    && JSON.stringify(db.lecturas) === JSON.stringify(['aiSettings/visualContext']),
    `${lanzo ? 'lanzó ' + lanzo.message : r?.motivo} · ${db.lecturas.join(' ')}`);
}
olvidarElContexto();
check('24 · y la lectura con caché devuelve la puerta CERRADA ante una lista rota',
  (await configuracionDelContexto(baseCon({ habilitado: true, cuentas: '*' }), 1)).habilitado === false);
olvidarElContexto();
check('25 · si Firestore no contesta, también cerrada',
  (await configuracionDelContexto({ collection: () => ({ doc: () => ({ get: async () => { throw new Error('caído'); } }) }) }, 1)).habilitado === false);
olvidarElContexto();
check('26 · decidir con una configuración inyectada sin leer, tampoco abre por error: una lista que no es lista cierra',
  decidirContexto({ habilitado: true, cuentas: null }, { accountId: A, necesidades: 1 }).resolver === false
  && decidirContexto({ habilitado: 'true' }, { accountId: A, necesidades: 1 }).resolver === false
  && decidirContexto({ habilitado: true, cuentas: [''] }, { accountId: '', necesidades: 1 }).resolver === false
  && decidirContexto({ habilitado: true, cuentas: [A] }, { accountId: A, necesidades: 1 }).resolver === true);

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nS1.2 · A: una configuración que no se entiende entera no abre el contexto visual para nadie');
process.exit(failures ? 1 : 0);
