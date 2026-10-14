/*
 * FRENTE I · PRUEBA DE CARGA CORTA Y REPRODUCIBLE: 0 DOBLE COBRO Y SALDO COHERENTE BAJO RÁFAGA.
 *
 *   node scripts/carga/tanda.mjs rafaga-dinero.mjs          (arranca y apaga su propio emulador en 18100)
 *
 * Todo contra el Credit Engine y los callables COMPILADOS, en el emulador de Firestore (transacciones y contención de
 * verdad, no un doble en memoria), con la red cortada y el proveedor mock. Con N=25 (por defecto) dura ~60-90 s. Sale con 0 si TODO cuadra.
 *
 *   R1  la MISMA operación (mismo requestId) N veces a la vez → 1 cobro, el resto `duplicate`, saldo −1.
 *   R2  N operaciones distintas sobre una cuenta con saldo S < N → como mucho S cobros, saldo = S − cobros ≥ 0, y
 *       cada rechazo es «sin saldo» o ABORTED (contención agotada: 5 intentos del SDK). Que haya ABORTED no es doble
 *       cobro, es disponibilidad: se informa cuántos.
 *   R3  N operaciones autorizadas y, a la vez, para cada una: completar ×1 y reembolsar ×2 → cada operación acaba
 *       COMPLETED o REFUNDED (nunca las dos), ≤ 1 reembolso por operación, saldo = inicial − completadas.
 *   R4  primera apertura del saldo N veces a la vez (getCreditsBalance) → 1 sola bienvenida, saldo 240.
 *   R5  el mismo mensaje de Weë Brain N veces a la vez → contador +1 (una respuesta contada) y 0 cobros. Además se
 *       INFORMA cuántas veces se llamó al modelo (hallazgo I-2: en origin/main son N, no 1).
 *   R6  la cuenta entera: saldo = 240 + Σ movimientos para todas las cuentas tocadas, y 0 transacciones AUTHORIZED.
 *
 * Criterio de latencia (INFORMATIVO, solo emulador; con CARGA_ESTRICTO=1 también decide la salida): p95 de
 * spend+complete con 25 cuentas distintas a la vez < CARGA_P95_MS (por defecto 1500 ms).
 */
import {
  alta, avisos, contarErrores, creditEngine, cronometrar, db, decir, intentosDeRed, lib, medidor, mock, movimientosDe, nuevaCuenta,
  resumenLatencias, RUN, saldoDe,
} from './_entorno.mjs';

const N = Number(process.env.CARGA_RAFAGA_N || 25);
const P95_MS = Number(process.env.CARGA_P95_MS || 1500);
const resultados = [];
const check = (id, nombre, ok, evid) => { resultados.push({ id, ok }); decir(`${ok ? 'PASA ' : 'FALLA'} [${id}] ${nombre}${evid !== undefined ? '  ← ' + JSON.stringify(evid) : ''}`); };
const tocadas = new Map();
const cuenta = async (saldo) => { const u = await alta(nuevaCuenta(), saldo); tocadas.set(u, saldo ?? 240); return u; };

decir(`Frente I · ráfaga de dinero · ejecución ${RUN} · N=${N}`);

/* R1 */
{
  const u = await cuenta();
  medidor.reiniciar();
  const rs = await Promise.all(Array.from({ length: N }, () => cronometrar(() => creditEngine.spendCredits({ userId: u, service: 'ai_brain', amount: 1, requestId: `r1_${RUN}`, source: 'carga' }))));
  const nuevas = rs.filter((r) => r.ok && !r.v.duplicate).length;
  const usos = (await movimientosDe(u)).filter((m) => m.type === 'usage');
  check('R1', `mismo requestId ×${N} a la vez → 1 cobro`, nuevas === 1 && usos.length === 1 && (await saldoDe(u)) === 239 && rs.every((r) => r.ok),
    { nuevas, usos: usos.length, saldo: await saldoDe(u), errores: contarErrores(rs), tx: medidor.foto(), ...resumenLatencias(rs.map((r) => r.ms)) });
  await creditEngine.completeCredits({ userId: u, requestId: `r1_${RUN}` });
}

/* R2 */
{
  const S = Math.floor(N / 2);
  const u = await cuenta(S);
  medidor.reiniciar();
  const rs = await Promise.all(Array.from({ length: N }, (_, i) => cronometrar(() => creditEngine.spendCredits({ userId: u, service: 'ai_brain', amount: 1, requestId: `r2_${RUN}_${i}`, source: 'carga' }))));
  const ok = rs.filter((r) => r.ok).length;
  const insuf = rs.filter((r) => r.codigo === 'INSUFFICIENT_CREDITS').length;
  const s = await saldoDe(u);
  const abortadas = rs.filter((r) => r.codigo === '10').length;
  check('R2', `${N} cobros distintos con saldo ${S} → ≤ ${S} cobros, saldo = ${S} − cobros ≥ 0, rechazos solo «sin saldo»/ABORTED`,
    ok <= S && s === S - ok && s >= 0 && ok + insuf + abortadas === N,
    { ok, insuf, abortadas, saldo: s, errores: contarErrores(rs), tx: medidor.foto(), ...resumenLatencias(rs.map((r) => r.ms)) });
  await Promise.all(rs.map((r, i) => (r.ok ? creditEngine.completeCredits({ userId: u, requestId: `r2_${RUN}_${i}` }) : null)));
}

/* R3 */
{
  const u = await cuenta(1000);
  const ops = Array.from({ length: Math.min(N, 30) }, (_, i) => `r3_${RUN}_${i}`);
  for (const id of ops) await creditEngine.spendCredits({ userId: u, service: 'ai_brain', amount: 2, requestId: id, source: 'carga' });
  medidor.reiniciar();
  const carrera = ops.flatMap((id) => [
    () => creditEngine.completeCredits({ userId: u, requestId: id }),
    () => creditEngine.refundCredits({ userId: u, requestId: id, reason: 'carga' }),
    () => creditEngine.refundCredits({ userId: u, requestId: id, reason: 'carga' }),
  ]);
  const rs = await Promise.all(carrera.map((f) => cronometrar(f)));
  const mov = await movimientosDe(u);
  const usos = mov.filter((m) => m.type === 'usage');
  const completadas = usos.filter((m) => m.status === 'COMPLETED').length;
  const reembolsadas = usos.filter((m) => m.status === 'REFUNDED').length;
  const reembolsosPorOp = {};
  for (const m of mov.filter((x) => x.type === 'refund' && x.refundOf)) reembolsosPorOp[m.requestId] = (reembolsosPorOp[m.requestId] || 0) + 1;
  const s = await saldoDe(u);
  const raros = rs.filter((r) => !r.ok && r.codigo !== 'NOT_REFUNDABLE');
  check('R3', `completar ×1 y reembolsar ×2 a la vez en ${ops.length} operaciones → cada una acaba en un solo estado`,
    completadas + reembolsadas === ops.length && Object.values(reembolsosPorOp).every((k) => k <= 1) && s === 1000 - 2 * completadas && raros.length === 0,
    { completadas, reembolsadas, saldo: s, errores: contarErrores(rs), tx: medidor.foto() });
}

/* R4 */
{
  const cred = lib('credits/index.js');
  const u = nuevaCuenta();
  await db.collection('users').doc(`doc_${u}`).set({ uid: u, displayName: u });
  tocadas.set(u, 0);
  medidor.reiniciar();
  const rs = await Promise.all(Array.from({ length: N }, () => cronometrar(() => cred.getCreditsBalance.run({ auth: { uid: u }, data: {} }))));
  const bienvenidas = (await movimientosDe(u)).filter((m) => m.source === 'welcome').length;
  const s = await saldoDe(u);
  check('R4', `primera apertura del saldo ×${N} a la vez → 1 bienvenida`, bienvenidas === 1 && s === 240 && rs.every((r) => r.ok && r.v.balance === 240),
    { bienvenidas, saldo: s, errores: contarErrores(rs), tx: medidor.foto(), ...resumenLatencias(rs.map((r) => r.ms)) });
}

/* R5 */
{
  const brain = lib('creator/brain.js');
  const u = await cuenta();
  const abre = await brain.brainChat.run({ auth: { uid: u }, data: { locale: 'es', message: 'abre', messageId: `r5_${RUN}_abre` } });
  const antes = mock.llamadas;
  medidor.reiniciar();
  const rs = await Promise.all(Array.from({ length: Math.min(N, 20) }, () => cronometrar(() => brain.brainChat.run({ auth: { uid: u }, data: { locale: 'es', message: 'a la vez', messageId: `r5_${RUN}_igual`, chatId: abre.chatId } }))));
  const llamadas = mock.llamadas - antes;
  const c = (await db.collection('brainUsage').doc(u).get()).data() || {};
  /* Rechazos admitidos: duplicado, o contención agotada (ABORTED, que brainChat devuelve como TIMEOUT). Se informan. */
  const raros = rs.filter((r) => !r.ok && !['DUPLICATE_REQUEST', 'TIMEOUT', '10'].includes(r.codigo));
  /* Informativo (no decide): cuántos huecos del cupo diario de texto ocupó la ráfaga. brain.ts reserva sin `operacion`. */
  const dia = new Date().toISOString().slice(0, 10);
  const cupoTexto = (await db.collection('aiRateLimits').doc(`${u}_${dia}`).get()).data()?.text ?? 0;
  const cobros = (await movimientosDe(u)).filter((m) => m.type === 'usage').length;
  decir(`${llamadas === 1 ? 'OK      ' : 'HALLAZGO'} [R5-coste] llamadas al modelo por ${Math.min(N, 20)} envíos idénticos simultáneos: ${llamadas} (lo correcto es 1)`);
  check('R5', 'el mismo mensaje de Weë Brain a la vez → una respuesta contada (contador 2), 0 cobros', c.respuestasTotales === 2 && cobros === 0 && raros.length === 0,
    { llamadas, totales: c.respuestasTotales, cupoTextoOcupado: cupoTexto, mensajesDistintos: 2, errores: contarErrores(rs), tx: medidor.foto() });
}

/* R6 */
{
  const malas = [];
  for (const [u, inicial] of tocadas) {
    const mov = await movimientosDe(u);
    const base = inicial === 0 ? 0 : 240;
    /* Las cuentas con saldo fijado se ajustaron a mano tras la bienvenida: su base es ese saldo, no 240 + bienvenida. */
    const suma = mov.filter((m) => m.type === 'usage' || m.type === 'refund' || (inicial === 0 && m.type === 'grant')).reduce((a, m) => a + Number(m.amount || 0), 0);
    const s = await saldoDe(u);
    const colgadas = mov.filter((m) => m.type === 'usage' && m.status === 'AUTHORIZED').length;
    const esperado = (inicial === 0 ? 0 : inicial) + suma;
    if (s < 0 || s !== esperado || colgadas) malas.push({ u: u.slice(-5), s, esperado, colgadas, base });
  }
  check('R6', 'todas las cuentas: saldo = inicial + Σ movimientos, ≥ 0, sin reservas colgadas', malas.length === 0, malas.length ? malas : { cuentas: tocadas.size });
}

/* Criterio de latencia (informativo) */
{
  const cuentas = [];
  for (let i = 0; i < 25; i++) cuentas.push(await cuenta());
  medidor.reiniciar();
  const lat = [];
  for (let r = 0; r < 3; r++) {
    const rs = await Promise.all(cuentas.map((u, i) => cronometrar(async () => {
      await creditEngine.spendCredits({ userId: u, service: 'ai_brain', amount: 1, requestId: `lat_${RUN}_${r}_${i}`, source: 'carga' });
      await creditEngine.completeCredits({ userId: u, requestId: `lat_${RUN}_${r}_${i}` });
    })));
    lat.push(...rs.map((x) => x.ms));
  }
  const res = resumenLatencias(lat);
  const ok = res.p95 < P95_MS;
  decir(`${ok ? 'CUMPLE' : 'NO CUMPLE'} [L1] p95 spend+complete, 25 cuentas distintas a la vez (emulador) < ${P95_MS} ms  ← ${JSON.stringify({ ...res, tx: medidor.foto() })}`);
  if (process.env.CARGA_ESTRICTO === '1') resultados.push({ id: 'L1', ok });
}

check('RED', 'ninguna conexión fuera del emulador', intentosDeRed.length === 0, intentosDeRed.slice(0, 5));
const fallos = resultados.filter((r) => !r.ok);
decir(`${fallos.length ? 'FALLA' : 'OK'} · ${resultados.length - fallos.length}/${resultados.length} · avisos ${avisos.length}`);
process.exit(fallos.length ? 1 : 0);
