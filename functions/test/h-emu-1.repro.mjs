/**
 * H-EMU-1 · REPRODUCCIÓN — un «Crear» que no llega a ejecutar deja ocupado el cupo diario de la persona.
 *
 * NO está en la cadena de `npm test` a propósito (por eso es `*.repro.mjs` y no `*.test.mjs`, como
 * `router-contabilidad.repro.mjs`): sobre el `creatorRun` actual está en ROJO, y es lo que demuestra el defecto. Con el
 * diff propuesto (`docs/propuestas/h-emu-1-cupo.diff`, sin autorizar: toca `creatorRun` y mueve la cerca F4 de
 * `puente-pre-f1d`) sale en VERDE. El caso, el impacto y lo que falta decidir están en `docs/propuestas/H-EMU-1.md`.
 * Se ejecuta suelto (ligero, sin emulador, sin red, sin secretos; ~3 s):
 *
 *     node functions/test/h-emu-1.repro.mjs                 # actual (rojo) + parcheado en memoria (verde)
 *     H_EMU_1_SOLO=parche node functions/test/h-emu-1.repro.mjs   # solo el parcheado: sale con 0 si el diff arregla
 *
 * ── Cómo se prueba el diff SIN aplicarlo ───────────────────────────────────────────────────────────────────────
 * Tres variantes del MISMO `creatorRun`, recorridas con los mismos escenarios:
 *   · `actual`  — `functions/lib/creator/index.js`, el compilado de siempre.
 *   · `control` — `functions/src/creator/index.ts` tal cual, transpilado EN MEMORIA (`ts.transpileModule`, commonjs,
 *                 es2017: las opciones de `functions/tsconfig.json`). Tiene que comportarse igual que `actual`: es la
 *                 prueba de que el método de transpilar no cambia nada por sí mismo.
 *   · `parche`  — el mismo `index.ts` con los hunks del diff aplicados EN MEMORIA (cada hunk tiene que encajar una sola
 *                 vez) y transpilado igual. Ningún archivo se escribe: el módulo se compila con `Module#_compile` bajo
 *                 la ruta de `lib/creator/index.js`, así que todo lo demás —limiter, Credit Engine, libro, Router— es
 *                 el compilado de siempre y es el MISMO objeto en las tres variantes.
 * Lo único que se sustituye es dónde se guardan los documentos (`_firestore-en-memoria.mjs`, la base de las suites de
 * aceptación) y, en un escenario, el adaptador `mock` para que falle.
 *
 * ── Lo que afirma (D = el defecto; en ROJO sobre `actual` y `control`, en VERDE sobre `parche`) ──────────────────
 *   D1  saldo insuficiente → el cupo del día queda como estaba (hoy queda ocupado: text 1 · image 1).
 *   D2  y al reintentar con Credits el MISMO trabajo, el cupo cuenta UNA creación, no dos.
 *   D3  una reserva previa del mismo trabajo ya reembolsada (el Credit Engine contesta ALREADY_REFUNDED) → el cupo queda
 *       como estaba.
 *   D4  una reserva previa del mismo trabajo, AUTHORIZED por otro importe (holdCredits → duplicado no reutilizable,
 *       DUPLICATE_REQUEST) → el cupo queda como estaba.
 *
 * ── Lo que NO debe cambiar (K; en VERDE en las tres) ───────────────────────────────────────────────────────────
 *   K1  Credits idénticos en las tres variantes, escenario por escenario: saldo, transacciones (tipo, estado, importe),
 *       filas del libro y estado del trabajo. El diff no toca dinero.
 *   K2  una creación que sale bien ocupa lo mismo en las tres (text 1 · image 1 para una receta de Chef).
 *   K3  «falta la foto» NO ocupa cupo, tampoco hoy: `exigirFotoSiHaceFalta` corre ANTES de `limiter.reserve`.
 *   K4  RATE_LIMITED (el día ya está lleno) no resta huecos de otras operaciones al «liberar» uno que no llegó a contar.
 *   K5  doble pulsación a la vez: un cobro y una creación contada.
 *
 * ── Lo que el diff NO arregla y se MIDE (O, pregunta para el dueño; ver H-EMU-1.md §5) ─────────────────────────
 *   O1  un fallo DESPUÉS de empezar a ejecutar (el proveedor falla, se reembolsa entero) sigue ocupando el cupo en las
 *       tres variantes. Si debe devolverse es una decisión de producto, no de este diff.
 *
 * Usa el compilado (`npm run build` antes). Sale con 1 si algo no se cumple.
 */
import fs from 'node:fs';
import path from 'node:path';
import Module, { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { BaseEnMemoria, instalarLaBase, darDeAlta, saldoDe, lib } from './_firestore-en-memoria.mjs';
import { acelerarLasEsperasCortas, apuntarLaConsola } from './_aceptacion.mjs';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(aqui, '../../');
const LIB_INDEX = path.resolve(aqui, '../lib/creator/index.js');
const SRC_INDEX = path.resolve(aqui, '../src/creator/index.ts');
const DIFF = path.resolve(RAIZ, 'docs/propuestas/h-emu-1-cupo.diff');
const ts = createRequire(path.resolve(aqui, '../package.json'))('typescript');
const sinCR = (s) => s.replace(/\r\n/g, '\n');
const out = (s) => process.stdout.write(`${s}\n`);

let fallos = 0;
const check = (variante, nombre, cond, extra = '') => {
  out(`${cond ? '✔' : '✘'} [${variante}] ${nombre}${extra ? ` — ${extra}` : ''}`);
  if (!cond) fallos++;
};

/* ═══ El diff, aplicado en memoria ═══════════════════════════════════════════════════════════════════════════ */

/** Aplica un diff unificado de UN archivo a un texto: cada hunk (contexto + quitadas) tiene que aparecer exactamente una vez. */
const aplicarDiff = (fuente, diff) => {
  const hunks = [];
  let actual = null;
  for (const linea of sinCR(diff).split('\n')) {
    if (linea.startsWith('@@')) { actual = { antes: [], despues: [] }; hunks.push(actual); continue; }
    if (!actual || linea.startsWith('\\')) continue;
    const marca = linea[0]; const resto = linea.slice(1);
    if (marca === ' ' || linea === '') { actual.antes.push(resto); actual.despues.push(resto); } else if (marca === '-') actual.antes.push(resto); else if (marca === '+') actual.despues.push(resto);
  }
  let texto = sinCR(fuente);
  for (const [i, h] of hunks.entries()) {
    while (h.antes.length && h.antes[h.antes.length - 1] === '' && h.despues[h.despues.length - 1] === '') { h.antes.pop(); h.despues.pop(); }
    const antes = h.antes.join('\n');
    const veces = texto.split(antes).length - 1;
    if (veces !== 1) throw new Error(`el hunk ${i + 1} del diff encaja ${veces} veces en index.ts (tiene que ser 1): ¿cambió el archivo o ya está aplicado?`);
    texto = texto.replace(antes, () => h.despues.join('\n'));
  }
  return { texto, hunks: hunks.length };
};

/** Transpila `index.ts` y lo compila bajo la ruta del compilado: sus `require('../engine/limits')`… son los de siempre. */
const compilar = (fuenteTs) => {
  const js = ts.transpileModule(fuenteTs, { fileName: SRC_INDEX, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 } }).outputText;
  const m = new Module(LIB_INDEX, null);
  m.filename = LIB_INDEX;
  m.paths = Module._nodeModulePaths(path.dirname(LIB_INDEX));
  m._compile(js, LIB_INDEX);
  return m.exports;
};

/* ═══ Mundo ══════════════════════════════════════════════════════════════════════════════════════════════════ */

let base = new BaseEnMemoria();
const deshacerLaBase = instalarLaBase(() => base);
const deshacerLasEsperas = acelerarLasEsperasCortas();
const consola = apuntarLaConsola();

const { dayKey } = lib('engine/limits.js');
const { ADAPTERS } = lib('engine/registry.js');
const { ProviderError } = lib('engine/http.js');
const creditos = lib('creator/credits.js');

const ANA = 'AbCdEfGhIjKlMnOpQrStUvWxYz01';
const mundo = async () => { base = new BaseEnMemoria(); await darDeAlta(base, ANA); };
const trabajo = (jobId) => base.leer(`creatorJobs/${jobId}`);
const cupo = () => {
  const d = base.leer(`aiRateLimits/${ANA}_${dayKey()}`) || {};
  return { text: Number(d.text || 0), image: Number(d.image || 0) };
};
const verCupo = (c) => `text ${c.text} · image ${c.image}`;
const intento = async (fn) => { try { return { ok: true, v: await fn() }; } catch (e) { return { ok: false, e }; } };
/** Lo que se compara entre variantes: el dinero, el libro y el trabajo, sin ids aleatorios ni horas. */
const huellaDeCredits = (jobId) => JSON.stringify({
  saldo: saldoDe(base, ANA),
  transacciones: base.de('creditTransactions').map((t) => `${t.type}:${t.status ?? ''}:${t.amount}`).sort(),
  libro: base.de('aiGenerations').map((g) => `${g.status}:${g.creditsCharged ?? 0}`).sort(),
  trabajo: jobId ? `${trabajo(jobId)?.status}:${trabajo(jobId)?.creditsCharged ?? 0}` : null,
});

/** Una receta de Chef (texto + foto del plato), hasta tener plan y precio. Con `cocinar`, la que necesita una foto. */
const planificar = async (creator, { cocinar = false } = {}) => {
  const chat = (data) => creator.creatorChat.run({ auth: { uid: ANA }, data: { ...data, locale: 'es' } });
  let r = await chat(cocinar
    ? { experienceId: 'chef', goal: 'Cocinar con los ingredientes que tengo en casa', presetAnswers: [{ questionId: 'what', optionId: 'cook' }] }
    : { experienceId: 'chef', goal: 'Una receta saludable para dos', presetAnswers: [{ questionId: 'what', optionId: 'healthy' }] });
  let vueltas = 0;
  while (r.status === 'asking' && vueltas++ < 8) {
    const q = r.question;
    const a = q.options.some((o) => o.id === 'idk') ? { optionId: 'idk' } : q.options.length ? { optionId: q.options[0].id } : { text: 'algo' };
    r = await chat({ jobId: r.jobId, answer: { questionId: q.id, ...a } });
  }
  if (r.status !== 'planned') throw new Error(`no se llegó a un plan (${r.status})`);
  return r;
};

/* ═══ Los escenarios: cada uno en un mundo limpio, devuelve lo medido ═════════════════════════════════════════ */

const escenarios = {
  async corto(creator) {
    await mundo();
    const plan = await planificar(creator);
    const precio = plan.pricing.total;
    base.docs.get(`users/doc_${ANA}`).creditsBalance = precio - 1;
    const r = await intento(() => creator.creatorRun.run({ auth: { uid: ANA }, data: { jobId: plan.jobId, locale: 'es' } }));
    const tras = { cupo: cupo(), credits: huellaDeCredits(plan.jobId), codigo: r.e?.details?.code };
    base.docs.get(`users/doc_${ANA}`).creditsBalance = precio + 10;
    const hecho = await creator.creatorRun.run({ auth: { uid: ANA }, data: { jobId: plan.jobId, locale: 'es' } });
    return { tras, reintento: { cupo: cupo(), credits: huellaDeCredits(plan.jobId), status: hecho.status } };
  },
  async duplicado(creator) {
    await mundo();
    const plan = await planificar(creator);
    const j = trabajo(plan.jobId);
    /* Una reserva del MISMO trabajo, de un intento anterior, que ya se liquidó (aquí, reembolsada). */
    await creditos.holdCredits(ANA, plan.jobId, j.plan, j.creditsEstimated, 'WEË AI · Weë Chef');
    await creditos.settleCredits(ANA, plan.jobId, j.creditsEstimated, 0, 'WEË AI · Weë Chef');
    const r = await intento(() => creator.creatorRun.run({ auth: { uid: ANA }, data: { jobId: plan.jobId, locale: 'es' } }));
    return { cupo: cupo(), credits: huellaDeCredits(plan.jobId), codigo: r.e?.details?.code };
  },
  async reservaDistinta(creator) {
    await mundo();
    const plan = await planificar(creator);
    const j = trabajo(plan.jobId);
    /* Una reserva del MISMO trabajo, todavía AUTHORIZED, pero por OTRO importe (el precio cambió entre medias). */
    await creditos.holdCredits(ANA, plan.jobId, j.plan, j.creditsEstimated + 1, 'WEË AI · Weë Chef');
    const r = await intento(() => creator.creatorRun.run({ auth: { uid: ANA }, data: { jobId: plan.jobId, locale: 'es' } }));
    return { cupo: cupo(), credits: huellaDeCredits(plan.jobId), codigo: r.e?.details?.code };
  },
  async foto(creator) {
    await mundo();
    const plan = await planificar(creator, { cocinar: true });
    const r = await intento(() => creator.creatorRun.run({ auth: { uid: ANA }, data: { jobId: plan.jobId, locale: 'es' } }));
    return { cupo: cupo(), credits: huellaDeCredits(plan.jobId), razon: r.e?.details?.reason };
  },
  async lleno(creator) {
    await mundo();
    const plan = await planificar(creator);
    /* El día ya está en el límite de imágenes por otras creaciones (80 por defecto). */
    base.docs.set(`aiRateLimits/${ANA}_${dayKey()}`, { userId: ANA, day: dayKey(), text: 5, image: 80 });
    const r = await intento(() => creator.creatorRun.run({ auth: { uid: ANA }, data: { jobId: plan.jobId, locale: 'es' } }));
    return { cupo: cupo(), credits: huellaDeCredits(plan.jobId), codigo: r.e?.details?.code };
  },
  async exito(creator) {
    await mundo();
    const plan = await planificar(creator);
    const hecho = await creator.creatorRun.run({ auth: { uid: ANA }, data: { jobId: plan.jobId, locale: 'es' } });
    const doc = base.leer(`aiRateLimits/${ANA}_${dayKey()}`) || {};
    return { cupo: cupo(), credits: huellaDeCredits(plan.jobId), status: hecho.status, operaciones: Object.values(doc.operaciones || {}) };
  },
  async doble(creator) {
    await mundo();
    const plan = await planificar(creator);
    const crear = () => intento(() => creator.creatorRun.run({ auth: { uid: ANA }, data: { jobId: plan.jobId, locale: 'es' } }));
    await Promise.all([crear(), crear()]);
    return { cupo: cupo(), credits: huellaDeCredits(plan.jobId) };
  },
  async falloTrasEjecutar(creator) {
    await mundo();
    const corre = ADAPTERS.mock.run;
    ADAPTERS.mock.run = async (req) => {
      if (req.capability === 'image.generate') throw new ProviderError('respondió 503', 'mock', 503, true);
      return corre.call(ADAPTERS.mock, req);
    };
    try {
      const plan = await planificar(creator);
      const r = await intento(() => creator.creatorRun.run({ auth: { uid: ANA }, data: { jobId: plan.jobId, locale: 'es' } }));
      return { cupo: cupo(), credits: huellaDeCredits(plan.jobId), codigo: r.e?.details?.code };
    } finally {
      ADAPTERS.mock.run = corre;
    }
  },
};

/* ═══ Las variantes ══════════════════════════════════════════════════════════════════════════════════════════ */

const fuente = fs.readFileSync(SRC_INDEX, 'utf8');
const yaAplicado = /operacionDelCupo/.test(fuente);
const variantes = {};
if (process.env.H_EMU_1_SOLO !== 'parche') {
  variantes.actual = lib('creator/index.js');
  variantes.control = compilar(fuente);
}
if (yaAplicado) {
  out('· el diff ya está en functions/src/creator/index.ts: la variante `parche` es el compilado (`actual`)');
  variantes.parche = lib('creator/index.js');
} else {
  const { texto, hunks } = aplicarDiff(fuente, fs.readFileSync(DIFF, 'utf8'));
  out(`· diff aplicado en memoria: ${hunks} hunks, cada uno encajó una sola vez`);
  variantes.parche = compilar(texto);
}

const medido = {};
for (const [nombre, creator] of Object.entries(variantes)) {
  medido[nombre] = {};
  for (const [esc, fn] of Object.entries(escenarios)) medido[nombre][esc] = await fn(creator);
}

consola.restaurar();
deshacerLasEsperas();
deshacerLaBase();

/* ═══ Lo que se afirma ═══════════════════════════════════════════════════════════════════════════════════════ */

const VACIO = { text: 0, image: 0 };
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const UNA = medido.parche.exito.cupo;

out('\n── D · el defecto (ROJO hoy en actual y control; VERDE con el diff) ──');
for (const [v, m] of Object.entries(medido)) {
  check(v, 'D1 saldo insuficiente (INSUFFICIENT_CREDITS): el cupo del día queda como estaba',
    m.corto.tras.codigo === 'INSUFFICIENT_CREDITS' && igual(m.corto.tras.cupo, VACIO), `cupo ${verCupo(m.corto.tras.cupo)}`);
  check(v, 'D2 y al reintentar con Credits el MISMO trabajo, el cupo cuenta UNA creación',
    m.corto.reintento.status === 'done' && igual(m.corto.reintento.cupo, UNA), `cupo ${verCupo(m.corto.reintento.cupo)} (una creación = ${verCupo(UNA)})`);
  check(v, 'D3 reserva previa del mismo trabajo ya reembolsada (el Credit Engine dice ALREADY_REFUNDED): el cupo queda como estaba',
    m.duplicado.codigo === 'ALREADY_REFUNDED' && igual(m.duplicado.cupo, VACIO), `${m.duplicado.codigo} · cupo ${verCupo(m.duplicado.cupo)}`);
  check(v, 'D4 reserva previa del mismo trabajo AUTHORIZED por otro importe (DUPLICATE_REQUEST): el cupo queda como estaba',
    m.reservaDistinta.codigo === 'DUPLICATE_REQUEST' && igual(m.reservaDistinta.cupo, VACIO), `${m.reservaDistinta.codigo} · cupo ${verCupo(m.reservaDistinta.cupo)}`);
}

out('\n── K · lo que no debe cambiar (VERDE en todas) ──');
const nombres = Object.keys(medido);
for (const esc of Object.keys(escenarios)) {
  const huellas = nombres.map((v) => (esc === 'corto' ? medido[v][esc].tras.credits + medido[v][esc].reintento.credits : medido[v][esc].credits));
  check(nombres.join('='), `K1 ${esc}: Credits, libro y estado del trabajo idénticos en las variantes`, huellas.every((h) => h === huellas[0]), huellas[0].slice(0, 160));
}
for (const [v, m] of Object.entries(medido)) {
  check(v, 'K2 una creación que sale bien ocupa text 1 · image 1 (una receta de Chef)', m.exito.status === 'done' && igual(m.exito.cupo, { text: 1, image: 1 }), verCupo(m.exito.cupo));
  check(v, 'K3 «falta la foto» no ocupa cupo (se rechaza ANTES de reservar)', m.foto.razon === 'needs_image' && igual(m.foto.cupo, VACIO), `${m.foto.razon} · cupo ${verCupo(m.foto.cupo)}`);
  check(v, 'K4 RATE_LIMITED no resta huecos que contaron otras creaciones', m.lleno.codigo === 'RATE_LIMITED' && igual(m.lleno.cupo, { text: 5, image: 80 }), `${m.lleno.codigo} · cupo ${verCupo(m.lleno.cupo)}`);
  check(v, 'K5 doble pulsación a la vez: una creación contada', igual(m.doble.cupo, { text: 1, image: 1 }), verCupo(m.doble.cupo));
}
check('parche', 'K6 con el diff, la creación que sale bien queda anotada como operación contada (y por eso se podría devolver)',
  igual(medido.parche.exito.operaciones, [true]), JSON.stringify(medido.parche.exito.operaciones));

out('\n── O · lo que el diff NO cambia y es pregunta para el dueño (se mide, no se afirma un deseo) ──');
for (const [v, m] of Object.entries(medido)) {
  out(`  [${v}] O1 fallo DESPUÉS de empezar (${m.falloTrasEjecutar.codigo}, reembolsado): cupo ${verCupo(m.falloTrasEjecutar.cupo)}`);
}
check(nombres.join('='), 'O1 el fallo tras ejecutar ocupa lo mismo con y sin el diff (el diff no lo toca)',
  nombres.every((v) => igual(medido[v].falloTrasEjecutar.cupo, medido[nombres[0]].falloTrasEjecutar.cupo)));

out(fallos ? `\n✘ ${fallos} fallo(s)` : '\n✔ todo bien');
process.exit(fallos ? 1 : 0);
