/*
 * WEE AI EVALUATION ENGINE — F2-C1 (hardening): la RESERVA y la RECONCILIACIÓN del presupuesto de evals.
 *
 * Coste $0: sin Firestore, sin red, sin proveedor. Mide el compilado del presupuesto del motor común
 * (functions/lib/evals/motor/presupuesto.js) y, por lectura del fuente, que el corredor COMÚN
 * (functions/src/evals/motor/corredor.ts) con el entorno real de evalRun (functions/src/evals/index.ts) reserva ANTES
 * de generar, libera SIEMPRE, reconcilia el coste de TODOS los intentos y se detiene ante un sobrecoste. La prueba de propiedad simula miles
 * de intercalados de corridas concurrentes y comprueba el hard cap: el gasto REAL nunca pasa del tope mientras
 * cada caso cueste ≤ su techo; y, si un proveedor se pasa del techo, el exceso queda acotado a ese caso.
 *
 *   node functions/test/evals-presupuesto.test.mjs     (usa el compilado: `npm run build` antes)
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const P = require(path.resolve(RAIZ, 'functions/lib/evals/motor/presupuesto.js'));
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');

let failures = 0; let n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log(`✔ ${name}`); else { failures++; console.log(`✘ ${name}${detail ? ` — ${detail}` : ''}`); } };
const E = (limitUsd, committedUsd, reservedUsd) => ({ limitUsd, committedUsd, reservedUsd });

/* ── A · Reserva ──────────────────────────────────────────────────────────── */
check('A1) cabe una reserva que deja gastado + reservado + techo ≤ tope', P.cabeLaReserva(E(10, 5, 2), 3) === true);
check('A2) el borde exacto también cabe (≤, no <)', P.cabeLaReserva(E(10, 8, 0), 2) === true);

/* ── C · Imposible reservar por encima del límite ─────────────────────────── */
check('C1) el caso del dueño: gastado 8, techo 3, tope 10 → NO cabe (acabaría en 11)', P.cabeLaReserva(E(10, 8, 0), 3) === false);
check('C2) lo que otras corridas tienen reservado cuenta: 5 + 4 + 2 = 11 > 10 → NO cabe', P.cabeLaReserva(E(10, 5, 4), 2) === false);
check('C3) un techo mayor que el tope entero nunca cabe', P.cabeLaReserva(E(10, 0, 0), 10.01) === false);
check('C4) fail-closed: con tope 0, negativo o NaN no cabe nada', [0, -1, NaN].every((l) => P.cabeLaReserva(E(l, 0, 0), 0.001) === false));
check('C5) fail-closed: un techo NaN, negativo o infinito no cabe', [NaN, -0.01, Infinity].every((t) => P.cabeLaReserva(E(10, 0, 0), t) === false));
const controlDeAntes = (gastado, estimado, tope) => gastado + estimado <= tope;
check('C6) el control de antes (gastado + estimado) dejaba pasar el ejemplo (8 + 2 ≤ 10) y con real 3 acababa en 11; reservando el TECHO (3) el caso no se inicia',
  controlDeAntes(8, 2, 10) === true && 8 + 3 > 10 && P.cabeLaReserva(E(10, 8, 0), 3) === false);

/* ── D · Reconciliación con el coste real ─────────────────────────────────── */
// Protocolo: reservar el techo → el libro contabiliza lo REAL → liberar el techo. Lo que queda: gastado + real, reservado igual.
const ciclo = (e, techo, real) => {
  if (!P.cabeLaReserva(e, techo)) return null;
  const reservado = { ...e, reservedUsd: P.microUsd(e.reservedUsd + techo) };
  const contabilizado = { ...reservado, committedUsd: P.microUsd(reservado.committedUsd + real) };
  return { ...contabilizado, reservedUsd: P.microUsd(Math.max(0, contabilizado.reservedUsd - techo)) };
};
const tras = ciclo(E(10, 1, 0.5), 0.05, 0.004);
check('D1) tras reconciliar, el gastado sube en lo REAL (0,004), no en el techo (0,05), y lo reservado vuelve a su valor',
  tras && tras.committedUsd === 1.004 && tras.reservedUsd === 0.5, JSON.stringify(tras));
check('D2) un caso que no cabe no reserva ni gasta nada', ciclo(E(10, 9.99, 0), 0.05, 0.001) === null);

/* ── E · Coste real mayor que el estimado ─────────────────────────────────── */
check('E1) lo real por encima del techo se detecta, con su exceso exacto', P.huboSobrecoste(0.01, 0.03) === true && P.excesoDeSobrecoste(0.01, 0.03) === 0.02);
check('E2) lo real igual o por debajo del techo no es sobrecoste', !P.huboSobrecoste(0.05, 0.05) && !P.huboSobrecoste(0.05, 0.0001) && P.excesoDeSobrecoste(0.05, 0.01) === 0);
check('E3) el ruido de coma flotante no dispara un falso sobrecoste (0,1 + 0,2 frente a 0,3)', P.huboSobrecoste(0.3, 0.1 + 0.2) === false);

/* ── G · Presupuesto restante ─────────────────────────────────────────────── */
check('G1) restante = tope − gastado − reservado', P.restanteParaReservar(E(10, 6.5, 1.25)) === 2.25);
check('G2) el restante nunca es negativo', P.restanteParaReservar(E(10, 11, 0)) === 0);

/* ── PROPIEDAD · el hard cap bajo concurrencia ─────────────────────────────
 * Varias corridas a la vez; dentro de cada una los casos van en serie (como en el corredor). Cada paso, una corrida
 * elegida al azar (con semilla) avanza: RESERVA (si cabe; si no, BUDGET_EXCEEDED) → el libro CONTABILIZA lo real →
 * LIBERA el techo → siguiente caso; tras un sobrecoste se detiene (COST_OVERRUN). Se mide el gasto real acumulado.
 */
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const simular = (semilla, { conSobrecostes }) => {
  const azar = mulberry32(semilla);
  const L = P.microUsd(0.2 + azar() * 1.8);
  let C = 0; let R = 0; let gastoReal = 0; let excesos = 0; let violacionEnDecision = false;
  const corridas = Array.from({ length: 2 + Math.floor(azar() * 3) }, () => ({
    casos: Array.from({ length: 1 + Math.floor(azar() * 5) }, () => {
      const techo = P.microUsd(0.01 + azar() * 0.4);
      const pasa = conSobrecostes && azar() < 0.15;
      const real = P.microUsd(pasa ? techo * (1 + azar()) : techo * azar());
      return { techo, real };
    }),
    i: 0, fase: 'reservar', fin: false,
  }));
  while (corridas.some((c) => !c.fin)) {
    const vivas = corridas.filter((c) => !c.fin);
    const c = vivas[Math.floor(azar() * vivas.length)];
    const caso = c.casos[c.i];
    if (c.fase === 'reservar') {
      const e = E(L, C, R);
      if (!P.cabeLaReserva(e, caso.techo)) { c.fin = true; continue; }       // BUDGET_EXCEEDED
      if (C + R + caso.techo > L + P.EPSILON) violacionEnDecision = true;
      R = P.microUsd(R + caso.techo); c.fase = 'contabilizar';
    } else if (c.fase === 'contabilizar') {
      C = P.microUsd(C + caso.real); gastoReal = P.microUsd(gastoReal + caso.real); c.fase = 'liberar';
    } else {
      R = P.microUsd(Math.max(0, R - caso.techo));
      if (P.huboSobrecoste(caso.techo, caso.real)) { excesos = P.microUsd(excesos + P.excesoDeSobrecoste(caso.techo, caso.real)); c.fin = true; continue; } // COST_OVERRUN
      c.i++; c.fase = 'reservar'; if (c.i >= c.casos.length) c.fin = true;
    }
  }
  return { L, gastoReal, excesos, R, violacionEnDecision };
};
const SEMILLAS = 3000;
let maxSinSobrecoste = 0; let fallosSinSobrecoste = 0; let fallosConSobrecoste = 0; let reservasColgadas = 0; let decisiones = 0;
for (let s = 1; s <= SEMILLAS; s++) {
  const a = simular(s, { conSobrecostes: false });
  maxSinSobrecoste = Math.max(maxSinSobrecoste, a.gastoReal / a.L);
  if (a.gastoReal > a.L + P.EPSILON) fallosSinSobrecoste++;
  const b = simular(s, { conSobrecostes: true });
  if (b.gastoReal > b.L + b.excesos + P.EPSILON) fallosConSobrecoste++;
  if (a.R > P.EPSILON || b.R > P.EPSILON) reservasColgadas++;
  if (a.violacionEnDecision || b.violacionEnDecision) decisiones++;
}
check(`P1) ${SEMILLAS} intercalados de corridas concurrentes con coste real ≤ techo: el gasto REAL nunca pasa del tope`,
  fallosSinSobrecoste === 0, `fallos=${fallosSinSobrecoste} · máximo gasto/tope=${maxSinSobrecoste.toFixed(4)}`);
check('P2) en cada reserva concedida se cumplía gastado + reservado + techo ≤ tope (la invariante ANTES de generar)', decisiones === 0, `violaciones=${decisiones}`);
check('P3) con proveedores que se pasan del techo, el exceso sobre el tope está acotado por la suma de los excesos de esos casos (peor caso documentado)',
  fallosConSobrecoste === 0, `fallos=${fallosConSobrecoste}`);
check('P4) al terminar todas las corridas no queda ninguna reserva colgada', reservasColgadas === 0, `con reserva viva=${reservasColgadas}`);

/* ── El corredor COMÚN con el entorno real, por lectura del fuente ──────────
 * El bucle es el del motor (motor/corredor.ts, uno para todo WEE); evalRun solo aporta su entorno (index.ts: leer el
 * interruptor y el tope, reservar, liberar, leer el coste real, el rastro) y el dominio real (dominios/router.ts: la
 * generación). Se comprueba en los tres sitios, que es donde vive cada cosa.
 */
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ').replace(/\s\/\/[^\n]*$/gm, ' ');
const fuente = sinComentarios(leer('functions/src/evals/index.ts'));
const corredor = sinComentarios(leer('functions/src/evals/motor/corredor.ts'));
const dominioReal = sinComentarios(leer('functions/src/evals/dominios/router.ts'));
const bucle = corredor.slice(corredor.indexOf('for (const caso of casos)'));
const antesDelCaso = fuente.slice(fuente.indexOf('antesDelCaso: async'), fuente.indexOf('medir: ('));
check('S1) la RESERVA va antes de la generación: el corredor pregunta al entorno (que reserva) ANTES de que el dominio decida (que genera)',
  bucle.indexOf('entorno.antesDelCaso(') > -1 && bucle.indexOf('entorno.antesDelCaso(') < bucle.indexOf('decidirCaso(')
  && /reservarTecho\(/.test(antesDelCaso) && /engine\.generate\(/.test(dominioReal) && !/engine\.generate\(/.test(fuente));
check('S2) la reserva se libera en un `finally` del corredor (siempre, haya ido bien o mal), y liberar es devolver el techo',
  /finally\s*\{\s*if \(entorno\.liberar\) await entorno\.liberar\(caso\);/.test(bucle) && /liberar: \(\) => liberarTecho\(dia, techoPorCaso\)/.test(fuente));
check('S3) el coste real suma TODOS los intentos del caso (consulta por requestId, con el coste en riesgo), en una consulta ACOTADA que, si se desborda, da el coste por desconocido',
  /where\('requestId', '==', requestId\)\.limit\(MAX_INTENTOS_POR_CASO \+ 1\)/.test(fuente) && /snap\.size > MAX_INTENTOS_POR_CASO\) return NaN/.test(fuente) && /providerCostEstimated/.test(fuente));
check('S4) la generación lleva `maxOutputTokens` (la palanca de coste por llamada): el entorno lo da y el dominio real se niega a generar sin él',
  /input: \{ prompt: caso\.prompt, maxOutputTokens \}/.test(dominioReal) && /el dominio real exige maxOutputTokens/.test(dominioReal)
  && /limites: \{ maxOutputTokens: presupuesto\.maxOutputTokens \}/.test(fuente));
check('S5) un sobrecoste o un coste desconocido DETIENE la corrida (COST_OVERRUN, sin seguir), en el corredor común, contra el techo del entorno',
  /'COST_OVERRUN'/.test(bucle) && /!conocido \|\| \(techo !== undefined && huboSobrecoste\(techo, costeUsd\)\)/.test(bucle) && /techoUsd: techoPorCaso/.test(fuente));
check('S6) quien llama solo puede SUBIR el techo, nunca bajarlo', /Math\.max\(presupuesto\.techoPorCasoUsd, pedido\)/.test(fuente));
check('S8) el interruptor y el tope se RELEEN antes de cada caso, antes de reservar (apagar o bajar el tope surte efecto entre casos)',
  antesDelCaso.indexOf('leerPresupuesto()') > -1 && antesDelCaso.indexOf('leerPresupuesto()') < antesDelCaso.indexOf('reservarTecho(') && /reservarTecho\(dia, limite, techoPorCaso\)/.test(antesDelCaso));
check('S7) J · ni el corredor ni la reserva ni el dominio real tocan Credits de usuario (sin Credit Engine ni sus colecciones)',
  [fuente, corredor, dominioReal, sinComentarios(leer('functions/src/evals/motor/presupuesto.ts'))]
    .every((s) => !/creditEngine|spendCredits|grantCredits|refundCredits|creditsBalance|creditTransactions/.test(s)));
check('esta suite está en la cadena de `npm test`', /evals-presupuesto\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} fallo(s)` : `\n✔ reserva y reconciliación del presupuesto de evals: ${n} comprobaciones ($0)`);
process.exit(failures ? 1 : 0);
