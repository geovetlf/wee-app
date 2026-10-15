/*
 * RÁFAGA DE DINERO — PRUEBA FUNCIONAL: 0 DOBLE COBRO Y SALDO COHERENTE BAJO CONCURRENCIA (Frente I, separada de la medición).
 *
 *   firebase emulators:exec --only firestore --project demo-wee-rafaga "node functions/test/rafaga-dinero.emulator.mjs"
 *
 * Esto es una PRUEBA: dice PASA o FALLA y su salida decide el nivel 2 de la CI. No mide nada de rendimiento: ni un percentil, ni
 * un tiempo, ni un umbral. Eso es otra cosa —`scripts/carga/` (carga.mjs, tanda.mjs)—, es manual, nunca decide una CI, y sus
 * números del emulador no concluyen nada sobre producción. Hasta ahora las dos cosas vivían en el mismo script
 * (`scripts/carga/rafaga-dinero.mjs` traía además un criterio de latencia, L1), y un número de latencia podía confundirse con
 * una prueba de corrección. Aquí quedan separadas: la corrección es esta suite; la medición, el directorio de carga.
 *
 * Todo contra el Credit Engine y los callables COMPILADOS, en el emulador de Firestore (transacciones y contención de verdad, no
 * un doble en memoria), con la red cortada y el proveedor mock. Usa `scripts/carga/_entorno.mjs` (aislamiento + instrumentos).
 *
 *   R1  la MISMA operación (mismo requestId) N veces a la vez → 1 cobro, el resto `duplicate`, saldo −1.
 *   R2  N operaciones distintas sobre una cuenta con saldo S < N → como mucho S cobros, saldo = S − cobros ≥ 0, y cada rechazo es
 *       «sin saldo» o ABORTED (contención agotada: 5 intentos del SDK). Un ABORTED no es doble cobro, es disponibilidad: se informa.
 *   R3  N operaciones autorizadas y, a la vez, para cada una: completar ×1 y reembolsar ×2 → cada operación acaba COMPLETED o
 *       REFUNDED (nunca las dos), ≤ 1 reembolso por operación, saldo = inicial − completadas.
 *   R4  primera apertura del saldo N veces a la vez (getCreditsBalance) → 1 sola bienvenida, saldo 240.
 *   R5  el mismo mensaje de Weë Brain N veces a la vez → contador +1 (una respuesta contada) y 0 cobros. Y, si el código trae la
 *       identidad de operación de Brain (A-02), UNA sola llamada al modelo (R5-coste): sin ella se informa, no se exige.
 *   R6  la cuenta entera: saldo = inicial + Σ movimientos para todas las cuentas tocadas, y 0 transacciones AUTHORIZED.
 *
 * N = RAFAGA_N (16 por defecto): lo bastante para que las transacciones se crucen de verdad, y no tanto como para que la
 * contención del emulador de un ordenador de CI agote los intentos y haga la suite intermitente.
 */
import {
  alta, avisos, contarErrores, creditEngine, cronometrar, db, decir, intentosDeRed, lib, medidor, mock, movimientosDe, nuevaCuenta, RUN, saldoDe,
} from '../../scripts/carga/_entorno.mjs';

const N = Number(process.env.RAFAGA_N || 16);
const resultados = [];
const check = (id, nombre, ok, evid) => { resultados.push({ id, ok }); decir(`${ok ? 'PASA ' : 'FALLA'} [${id}] ${nombre}${evid !== undefined ? '  ← ' + JSON.stringify(evid) : ''}`); };
const tocadas = new Map();
const cuenta = async (saldo) => { const u = await alta(nuevaCuenta(), saldo); tocadas.set(u, saldo ?? 240); return u; };
/* ABORTED (código 10) = la contención agotó los intentos del SDK: disponibilidad, no corrección. */
const sinContencion = (r) => r.ok || r.codigo === '10';

decir(`Ráfaga de dinero (funcional) · ejecución ${RUN} · N=${N}`);

/* R1 */
{
  const u = await cuenta();
  medidor.reiniciar();
  const rs = await Promise.all(Array.from({ length: N }, () => cronometrar(() => creditEngine.spendCredits({ userId: u, service: 'ai_brain', amount: 1, requestId: `r1_${RUN}`, source: 'carga' }))));
  const nuevas = rs.filter((r) => r.ok && !r.v.duplicate).length;
  const usos = (await movimientosDe(u)).filter((m) => m.type === 'usage');
  check('R1', `mismo requestId ×${N} a la vez → 1 cobro`, nuevas === 1 && usos.length === 1 && (await saldoDe(u)) === 239 && rs.every(sinContencion),
    { nuevas, usos: usos.length, saldo: await saldoDe(u), errores: contarErrores(rs), tx: medidor.foto() });
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
    { ok, insuf, abortadas, saldo: s, errores: contarErrores(rs), tx: medidor.foto() });
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
  const raros = rs.filter((r) => !r.ok && r.codigo !== 'NOT_REFUNDABLE' && r.codigo !== '10');
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
  check('R4', `primera apertura del saldo ×${N} a la vez → 1 bienvenida`, bienvenidas === 1 && s === 240 && rs.every((r) => sinContencion(r) && (!r.ok || r.v.balance === 240)),
    { bienvenidas, saldo: s, errores: contarErrores(rs), tx: medidor.foto() });
}

/* R5 */
{
  const brain = lib('creator/brain.js');
  const uso = lib('creator/brainUsage.js');
  const u = await cuenta();
  const abre = await brain.brainChat.run({ auth: { uid: u }, data: { locale: 'es', message: 'abre', messageId: `r5_${RUN}_abre` } });
  const antes = mock.llamadas;
  medidor.reiniciar();
  const iguales = Math.min(N, 20);
  const rs = await Promise.all(Array.from({ length: iguales }, () => cronometrar(() => brain.brainChat.run({ auth: { uid: u }, data: { locale: 'es', message: 'a la vez', messageId: `r5_${RUN}_igual`, chatId: abre.chatId } }))));
  const llamadas = mock.llamadas - antes;
  const c = (await db.collection('brainUsage').doc(u).get()).data() || {};
  /* Rechazos admitidos: duplicado, o contención agotada (ABORTED, que brainChat devuelve como TIMEOUT). */
  const raros = rs.filter((r) => !r.ok && !['DUPLICATE_REQUEST', 'TIMEOUT', '10'].includes(r.codigo));
  const cobros = (await movimientosDe(u)).filter((m) => m.type === 'usage').length;
  check('R5', 'el mismo mensaje de Weë Brain a la vez → una respuesta contada (contador 2), 0 cobros', c.respuestasTotales === 2 && cobros === 0 && raros.length === 0,
    { llamadas, totales: c.respuestasTotales, errores: contarErrores(rs), tx: medidor.foto() });
  /* El coste: con la identidad de operación de A-02, los envíos idénticos a la vez llaman al modelo UNA vez. Sin ella (código anterior) son N: se informa. */
  if (typeof uso.operacionDeBrain === 'function') check('R5-coste', `${iguales} envíos idénticos simultáneos → UNA llamada al modelo (A-02)`, llamadas === 1, { llamadas });
  else decir(`INFO  [R5-coste] el código no trae la identidad de operación de Brain (A-02): ${llamadas} llamadas al modelo por ${iguales} envíos idénticos (se exige 1 cuando A-02 esté)`);
}

/* R6 */
{
  const malas = [];
  for (const [u, inicial] of tocadas) {
    const mov = await movimientosDe(u);
    /* Las cuentas con saldo fijado se ajustaron a mano tras la bienvenida: su base es ese saldo, no 240 + bienvenida. */
    const suma = mov.filter((m) => m.type === 'usage' || m.type === 'refund' || (inicial === 0 && m.type === 'grant')).reduce((a, m) => a + Number(m.amount || 0), 0);
    const s = await saldoDe(u);
    const colgadas = mov.filter((m) => m.type === 'usage' && m.status === 'AUTHORIZED').length;
    const esperado = (inicial === 0 ? 0 : inicial) + suma;
    if (s < 0 || s !== esperado || colgadas) malas.push({ u: u.slice(-5), s, esperado, colgadas });
  }
  check('R6', 'todas las cuentas: saldo = inicial + Σ movimientos, ≥ 0, sin reservas colgadas', malas.length === 0, malas.length ? malas : { cuentas: tocadas.size });
}

check('RED', 'ninguna conexión fuera del emulador', intentosDeRed.length === 0, intentosDeRed.slice(0, 5));
const fallos = resultados.filter((r) => !r.ok);
decir(`${fallos.length ? 'FALLA' : 'OK'} · ${resultados.length - fallos.length}/${resultados.length} · avisos ${avisos.length}`);
process.exit(fallos.length ? 1 : 0);
