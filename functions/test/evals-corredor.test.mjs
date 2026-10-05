/*
 * WEË AI EVALUATION ENGINE — evalRun CORRE EL CORREDOR COMÚN (F2-C1 sobre el motor por dominios).
 *
 * El motor de evaluaciones es uno (functions/src/evals/motor) y su corredor es el único sitio donde se recorren casos.
 * `evalRun` no tiene bucle propio: aporta un dominio real (registro común) y un ENTORNO de Firestore. Esta suite lo
 * prueba de dos maneras, $0 (sin Firestore, sin red, sin proveedor):
 *  · por el COMPORTAMIENTO del corredor compilado con un entorno de «dinero real» SIMULADO en memoria: reserva antes,
 *    libera siempre, para ante un coste por encima del techo o desconocido (COST_OVERRUN), registra un fallo (FAILED)
 *    sin lanzarlo, salta lo ya hecho, obedece las paradas del entorno, guarda las métricas de lo hecho, cierra con lo
 *    que el entorno añade, no repite una corrida y le dice al dominio en qué corrida y caso está;
 *  · por el FUENTE: evalRun importa el corredor y el registro del motor, no recorre casos ni genera, y su dominio real
 *    está en el registro común y se niega a correr fuera de una corrida gobernada.
 * Lo que solo se ve con Firestore de verdad (transacciones, concurrencia, el libro) lo prueba evals-runner.emulator.mjs.
 *
 *   node functions/test/evals-corredor.test.mjs     (usa el compilado: `npm run build` antes)
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const leer = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const motor = (m) => require(path.join(RAIZ, `functions/lib/evals/motor/${m}.js`));
const { correrEvalGobernada, recorrerCasos, SEGUIR, SALTAR } = motor('corredor');
const { crearRegistroDeDominios } = motor('dominios');
const { almacenMemoria, ESTADOS, transicionValida } = motor('corrida');
const { puede } = motor('permisos');

let failures = 0; let n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log(`✔ ${name}`); else { failures++; console.log(`✘ ${name}${detail ? ` — ${detail}` : ''}`); } };
const falla = async (f) => { try { await f(); return null; } catch (e) { return e.message; } };

/* Un dominio «real» DE PRUEBA: como el de verdad, exige estar en una corrida y apunta lo que le llega. */
const visto = [];
const dominioPrueba = {
  id: 'prueba-real',
  descripcion: 'Dominio de PRUEBA con la forma de uno real: exige contexto de corrida. No es un dominio de Weë.',
  decidir: async (caso, ctx) => {
    if (!ctx || !ctx.evalRunId || !ctx.requestId) throw new Error('sin corrida no hay presupuesto');
    visto.push({ caso: caso.evalCaseId, ctx });
    if (caso.romper) throw new Error(`el proveedor falló en ${caso.evalCaseId}`);
    return { ejecuciones: 1, salida: caso.entrada };
  },
  calificar: (d, caso, medicion) => [
    { id: 'prueba/igual', dimension: 'QUALITY', ok: d.salida === caso.expected.salida },
    { id: 'prueba/coste', dimension: 'COST', ok: Number.isFinite(medicion.costeUsd) && medicion.costeUsd >= 0 },
  ],
  validarCaso: () => [],
};
const DOMINIOS = crearRegistroDeDominios([dominioPrueba]);
const caso = (id, extra = {}) => ({ evalCaseId: id, entrada: id, expected: { salida: id }, ...extra });
const dataset = (casos) => ({ version: 1, dominio: 'prueba-real', casos });
const reloj = () => 't';

/** Un entorno de dinero real SIMULADO: un día con tope, reservas, coste por caso y un diario de lo que pasa. */
const entornoSimulado = ({ tope = 1, techo = 0.05, costes = {}, paradas = {}, hechos = new Set(), medirLanza = new Set() } = {}) => {
  const dia = { gastado: 0, reservado: 0 };
  const diario = [];
  const rastro = {};
  return {
    dia, diario, rastro,
    entorno: {
      capturarFallos: true,
      techoUsd: techo,
      limites: { maxOutputTokens: 64 },
      antesDelCaso: async (c) => {
        if (paradas[c.evalCaseId]) { diario.push(`parar:${c.evalCaseId}`); return paradas[c.evalCaseId]; }
        if (hechos.has(c.evalCaseId)) { diario.push(`saltar:${c.evalCaseId}`); return SALTAR; }
        if (dia.gastado + dia.reservado + techo > tope + 1e-9) { diario.push(`sin-presupuesto:${c.evalCaseId}`); return { estado: 'BUDGET_EXCEEDED' }; }
        dia.reservado += techo; diario.push(`reservar:${c.evalCaseId}`);
        return SEGUIR;
      },
      medir: async (c) => {
        diario.push(`medir:${c.evalCaseId}`);
        if (medirLanza.has(c.evalCaseId)) throw new Error('el libro no responde');
        const coste = costes[c.evalCaseId] ?? 0.001;
        if (Number.isFinite(coste)) dia.gastado += coste;
        return coste;
      },
      liberar: async (c) => { dia.reservado = Math.max(0, dia.reservado - techo); diario.push(`liberar:${c.evalCaseId}`); },
      registrar: async (c, r) => { rastro[c.evalCaseId] = r; },
      alCerrar: async ({ estado }) => ({ budgetUsed: Math.round(dia.gastado * 1e6) / 1e6, budgetReserved: dia.reservado, cerradoComo: estado }),
    },
  };
};
const correr = (casos, sim, opciones = {}) => correrEvalGobernada({
  dataset: dataset(casos), config: {}, spec: { target: 'prueba-real', graderVersion: 'p@1', evalRunId: opciones.evalRunId || `evalrun_${casos.map((c) => c.evalCaseId).join('_')}` },
  ahora: reloj, dominios: DOMINIOS, entorno: sim.entorno, almacen: opciones.almacen || almacenMemoria(),
});

/* ── A · El camino feliz: reservar → decidir → medir → liberar, caso a caso ── */
{
  const sim = entornoSimulado();
  visto.length = 0;
  const r = await correr([caso('a'), caso('b')], sim);
  check('A1) el corredor común corre una corrida «real» entera: COMPLETED, 2 casos aprobados, 2 ejecuciones',
    r.run.status === 'COMPLETED' && r.scores.n === 2 && r.scores.aprobados === 2 && r.ejecuciones === 2, `${r.run.status} ${JSON.stringify(r.scores && { n: r.scores.n, a: r.scores.aprobados })}`);
  check('A2) en cada caso, la RESERVA va antes de decidir, y medir y LIBERAR después, en ese orden',
    sim.diario.join(' ') === 'reservar:a medir:a liberar:a reservar:b medir:b liberar:b', sim.diario.join(' '));
  check('A3) al dominio le llega su corrida: evalRunId, requestId = «corrida:caso» y los límites del entorno (maxOutputTokens)',
    visto.length === 2 && visto.every((v) => v.ctx.evalRunId === 'evalrun_a_b' && v.ctx.requestId === `evalrun_a_b:${v.caso}` && v.ctx.limites.maxOutputTokens === 64));
  check('A4) el coste real medido entra en la corrida (costUsd) y llega a los graders (medicion.costeUsd)',
    r.run.costUsd === 0.002 && r.detalle.every((d) => d.costeUsd === 0.001 && d.graders.find((g) => g.id === 'prueba/coste').ok));
  check('A5) lo que el entorno añade al cerrar queda en el registro de la corrida; no queda nada reservado',
    r.run.budgetUsed === 0.002 && r.run.cerradoComo === 'COMPLETED' && sim.dia.reservado === 0 && r.run.metrics.n === 2);
  check('A6) cada caso deja su rastro con los graders y el veredicto', sim.rastro.a.aprobado === true && Array.isArray(sim.rastro.b.graders) && sim.rastro.b.costeUsd === 0.001);
}

/* ── B · Coste real por encima del techo → COST_OVERRUN y DETENCIÓN ───────── */
{
  const sim = entornoSimulado({ techo: 0.05, costes: { a: 0.08 } });
  visto.length = 0;
  const r = await correr([caso('a'), caso('b'), caso('c')], sim);
  check('B1) un coste real (0,08) por encima del techo (0,05) para la corrida: COST_OVERRUN con su exceso exacto',
    r.run.status === 'COST_OVERRUN' && r.run.sobrecoste.caso === 'a' && r.run.sobrecoste.techoUsd === 0.05 && r.run.sobrecoste.realUsd === 0.08
    && r.run.sobrecoste.excesoUsd === 0.03 && r.run.sobrecoste.motivo === 'coste_real_mayor_que_el_techo', JSON.stringify(r.run.sobrecoste));
  check('B2) tras el sobrecoste NO se inicia ningún caso más; la reserva del caso se liberó igual',
    visto.map((v) => v.caso).join() === 'a' && sim.diario.join(' ') === 'reservar:a medir:a liberar:a' && sim.dia.reservado === 0);
  check('B3) el gasto real del caso SÍ cuenta (costUsd 0,08) y el rastro del caso dice el sobrecoste', r.run.costUsd === 0.08 && sim.rastro.a.parada.estado === 'COST_OVERRUN');
  check('B4) una corrida que no terminó no da scores (no se compara), pero guarda las métricas de lo hecho', r.scores === null && r.run.metrics.n === 0);
}

/* ── C · Coste que no se puede saber → COST_OVERRUN «desconocido» (fail-closed) ── */
{
  const simNaN = entornoSimulado({ costes: { a: NaN } });
  const rNaN = await correr([caso('a'), caso('b')], simNaN);
  const simLanza = entornoSimulado({ medirLanza: new Set(['a']) });
  const rLanza = await correr([caso('a'), caso('b')], simLanza);
  check('C1) un coste NaN o un lector que falla DETIENEN la corrida (COST_OVERRUN «coste_real_desconocido») y la reserva se libera',
    [rNaN, rLanza].every((r) => r.run.status === 'COST_OVERRUN' && r.run.sobrecoste.motivo === 'coste_real_desconocido' && r.run.sobrecoste.realUsd === null)
    && simNaN.dia.reservado === 0 && simLanza.dia.reservado === 0 && !simLanza.diario.includes('reservar:b'), `${rNaN.run.status}/${rLanza.run.status}`);
}

/* ── D · Un fallo del proveedor: FAILED registrado (dinero real) o lanzado (desarrollo) ── */
{
  const sim = entornoSimulado();
  const r = await correr([caso('a', { romper: true }), caso('b')], sim);
  check('D1) con dinero real, un fallo del dominio es un ESTADO: FAILED, con su error en la corrida y en el rastro, y no sigue',
    r.run.status === 'FAILED' && /el proveedor falló en a/.test(r.run.error) && /el proveedor falló/.test(String(sim.rastro.a.fallo && sim.rastro.a.fallo.message))
    && !sim.diario.includes('reservar:b') && sim.dia.reservado === 0, `${r.run.status} ${r.run.error}`);
  check('D2) un intento que falló también se mide (pudo costar después de llegar al proveedor)', sim.diario.includes('medir:a') && r.run.costUsd === 0.001);
  const sinCaptura = entornoSimulado();
  const lanzado = await falla(() => correrEvalGobernada({ dataset: dataset([caso('x', { romper: true })]), config: {}, spec: { target: 't', evalRunId: 'evalrun_x' }, ahora: reloj, dominios: DOMINIOS, entorno: { ...sinCaptura.entorno, capturarFallos: false } }));
  check('D3) sin capturar (desarrollo), el mismo fallo se LANZA tal cual —y la reserva se libera igual—', /el proveedor falló en x/.test(lanzado || '') && sinCaptura.dia.reservado === 0, lanzado);
}

/* ── E · Lo ya hecho se salta; las paradas del entorno mandan ────────────── */
{
  const sim = entornoSimulado({ hechos: new Set(['a']) });
  visto.length = 0;
  const r = await correr([caso('a'), caso('b')], sim);
  check('E1) un caso ya hecho se SALTA: ni se reserva, ni se decide, ni se mide, ni se libera', r.run.status === 'COMPLETED' && visto.map((v) => v.caso).join() === 'b'
    && sim.diario.join(' ') === 'saltar:a reservar:b medir:b liberar:b', sim.diario.join(' '));
  const cancelada = await correr([caso('a'), caso('b'), caso('c')], entornoSimulado({ paradas: { b: { estado: 'CANCELLED', motivo: 'cancelada' } } }));
  check('E2) el entorno para la corrida antes de un caso (cancelación): CANCELLED, con su motivo y las métricas de lo hecho (1 caso)',
    cancelada.run.status === 'CANCELLED' && cancelada.run.motivoDeParada === 'cancelada' && cancelada.run.metrics.n === 1 && cancelada.interrumpidoPor === 'CANCELLED');
  const apagada = await correr([caso('a'), caso('b')], entornoSimulado({ paradas: { a: { estado: 'CANCELLED', motivo: 'evals_deshabilitado' } } }));
  check('E3) apagar el interruptor también es una parada del entorno: CANCELLED «evals_deshabilitado», sin decidir nada', apagada.run.status === 'CANCELLED' && apagada.run.motivoDeParada === 'evals_deshabilitado' && apagada.ejecuciones === 0);
  const simTope = entornoSimulado({ tope: 0.06, techo: 0.05, costes: { a: 0.02 } });
  const sinTope = await correr([caso('a'), caso('b')], simTope);
  check('E4) el hard cap del entorno: con tope 0,06 y techo 0,05, el segundo caso no cabe (0,02 gastado + 0,05 > 0,06) → BUDGET_EXCEEDED tras 1 caso',
    sinTope.run.status === 'BUDGET_EXCEEDED' && sinTope.run.metrics.n === 1 && simTope.diario.includes('sin-presupuesto:b') && simTope.dia.reservado === 0, simTope.diario.join(' '));
}

/* ── F · La misma corrida no se corre dos veces ──────────────────────────── */
{
  const almacen = almacenMemoria();
  const sim = entornoSimulado();
  const primera = await correr([caso('a')], sim, { almacen, evalRunId: 'evalrun_una' });
  visto.length = 0;
  const segunda = await correr([caso('a')], entornoSimulado(), { almacen, evalRunId: 'evalrun_una' });
  check('F1) la misma corrida otra vez se devuelve tal cual (reanudado), sin decidir ni reservar nada', primera.run.status === 'COMPLETED' && segunda.reanudado === true
    && segunda.run.evalRunId === 'evalrun_una' && visto.length === 0 && almacen.n === 1);
}

/* ── G · Sin corrida, un dominio real no corre ───────────────────────────── */
{
  visto.length = 0;
  const { detalle } = await recorrerCasos(DOMINIOS['prueba-real'], [caso('a')], { entorno: { capturarFallos: true } }).catch((e) => ({ detalle: null, e }));
  const sinCorrida = await falla(() => recorrerCasos(DOMINIOS['prueba-real'], [caso('a')]));
  check('G1) fuera de una corrida (sin evalRunId) el dominio real se niega: no hay a quién atribuir el gasto', /sin corrida no hay presupuesto/.test(sinCorrida || '') && visto.length === 0 && Array.isArray(detalle) && detalle.length === 0);
}

/* ── H · Los estados nuevos y los permisos, en el motor ──────────────────── */
check('H1) COST_OVERRUN es un estado del motor: solo desde RUNNING, y terminal',
  ESTADOS.includes('COST_OVERRUN') && transicionValida('RUNNING', 'COST_OVERRUN') && !transicionValida('QUEUED', 'COST_OVERRUN') && !transicionValida('COST_OVERRUN', 'RUNNING'));
check('H2) un rol con nombre de prototipo no puede nada (fail-closed, sin lanzar)', ['__proto__', 'constructor', 'toString'].every((r) => puede(r, 'acceder-holdout') === false && puede(r, 'ejecutar-eval') === false));

/* ── S · evalRun consume el motor, por lectura del fuente ────────────────── */
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ').replace(/\s\/\/[^\n]*$/gm, ' ');
const evalRun = sinComentarios(leer('functions/src/evals/index.ts'));
const registroReal = sinComentarios(leer('functions/src/evals/dominios.ts'));
const dominioReal = sinComentarios(leer('functions/src/evals/dominios/router.ts'));
check('S1) evalRun corre el corredor COMÚN: importa correrEvalGobernada y resolverDominio del motor, y lo llama con su entorno y el registro real',
  /from '\.\/motor\/corredor'/.test(evalRun) && /correrEvalGobernada\(\{/.test(evalRun) && /from '\.\/motor\/dominios'/.test(evalRun)
  && /resolverDominio\(DOMINIOS_REALES,/.test(evalRun) && /dominios: DOMINIOS_REALES, entorno/.test(evalRun));
check('S2) evalRun NO tiene corredor propio: no recorre casos, no decide, no califica, no puntúa ni genera',
  !/for \(const caso of/.test(evalRun) && !/\bdecidirCaso\(|\bcalificarCaso\(|\bpuntuar\(|\bgraduar\(/.test(evalRun) && !/engine\.generate\(/.test(evalRun));
check('S3) el dominio real está en el registro COMÚN (crearRegistroDeDominios) y es el único que genera, por el embudo del motor vivo',
  /crearRegistroDeDominios\(\[dominioRouterReal\]\)/.test(registroReal) && /engine\.generate\(/.test(dominioReal) && /attribution: 'eval'/.test(dominioReal) && /userId: IDENTIDAD_EVAL/.test(dominioReal));
check('S4) el dominio real se niega a correr fuera de una corrida gobernada ANTES de generar',
  dominioReal.indexOf('solo corre dentro de una corrida gobernada') > -1 && dominioReal.indexOf('solo corre dentro de una corrida gobernada') < dominioReal.indexOf('engine.generate('));
const objetoReal = dominioReal.slice(dominioReal.indexOf('= {'), dominioReal.lastIndexOf('};'));
const camposReales = [...objetoReal.matchAll(/^ {2}(?:async\s+)?([a-zA-Z]+)\s*[:(]/gm)].map((m) => m[1]);
check('S5) el dominio real cumple el contrato de dominio del motor: sus campos son los del contrato y ninguno más',
  ['id', 'descripcion', 'decidir', 'calificar', 'validarCaso'].every((k) => camposReales.includes(k))
  && camposReales.every((k) => ['id', 'descripcion', 'decidir', 'calificar', 'validarCaso', 'claveDeCaso'].includes(k)), camposReales.join(', '));
check('S6) un nombre de dominio sin registrar —o sin dataset real— falla cerrado (dominio_no_soportado)', (evalRun.match(/'dominio_no_soportado'/g) || []).length === 2);
check('esta suite está en la cadena de `npm test`', /evals-corredor\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} fallo(s)` : `\n✔ evalRun corre el corredor común: ${n} comprobaciones ($0)`);
process.exit(failures ? 1 : 0);
