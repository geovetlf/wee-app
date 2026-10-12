#!/usr/bin/env node
/**
 * 03 · `creatorRun` MULTI-PASO SOBRE EL CÓDIGO REAL — RPC, rondas, escrituras y documentos compartidos.
 *
 * Para cada experiencia de Weë AI con plan por defecto (`TEMPLATES[exp].buildPlan`), siembra un trabajo
 * `planned` y ejecuta el `creatorRun` COMPILADO (reclamo, cupo, reserva de Credits, bucle de pasos, motor,
 * material de la cuenta, liquidación). Los proveedores son dobles (`banco/creador.mjs`).
 *
 * Dos pasadas por experiencia:
 *   A · proveedor a 0 ms  → RPC y rondas SIN el tiempo del proveedor (MEDIDO, determinista).
 *   B · proveedor con los tiempos SUPUESTOS de `banco/creador.mjs` (marcados [E]) → tiempo total en serie,
 *       que se compara con el camino crítico del plan si los pasos independientes corrieran a la vez.
 *
 *     node scripts/bench-r7/03-creatorrun.mjs
 */
import { prepararEntorno, lib, UID, tabla } from './banco/entorno.mjs';
import { guardar } from './banco/salida.mjs';
import { simularProveedoresDeCreador, sembrarTrabajo, leerLibro, acumulados, TIEMPOS } from './banco/creador.mjs';

const EXPERIENCIAS = ['design', 'studio', 'photo', 'writer', 'chef', 'home', 'business', 'travel', 'beauty'];
const CERO = Object.fromEntries(Object.keys(TIEMPOS).map((k) => [k, 0]));

const E = prepararEntorno({ latencia: { get: 1, query: 1, write: 1, commit: 1 } });
const { banco } = E;
const creator = lib('creator/index.js');
const uid = UID(1);

const COMPARTIDOS = [
  [/^aiUsage\//, 'aiUsage/{día}'],
  [/^aiProviderVerification\//, 'aiProviderVerification/{proveedor}'],
  [/^creatorUsage\//, 'creatorUsage/{día}'],
  [/^creditStats\/global$/, 'creditStats/global'],
  [/^creditStats\/daily_/, 'creditStats/daily_{día}'],
  [/^aiRateLimits\//, 'aiRateLimits/{persona}_{día}'],
];
const compartidosDe = (porDocumento) => {
  const salida = {};
  for (const [p, v] of Object.entries(porDocumento)) {
    const hit = COMPARTIDOS.find(([re]) => re.test(p));
    if (!hit) continue;
    const k = hit[1];
    salida[k] = salida[k] || { lecturas: 0, escrituras: 0 };
    salida[k].lecturas += v.lecturas;
    salida[k].escrituras += v.escrituras;
  }
  return salida;
};

/** Camino crítico del plan: la suma más larga de tiempos de proveedor siguiendo `dependsOn` (si lo independiente corriera a la vez). */
const caminoCritico = (plan, tiempoDe) => {
  const por = new Map(plan.steps.map((s) => [s.id, s]));
  const memo = new Map();
  const fin = (id) => {
    if (memo.has(id)) return memo.get(id);
    const s = por.get(id);
    const v = tiempoDe(s) + Math.max(0, ...(s.dependsOn || []).map(fin));
    memo.set(id, v);
    return v;
  };
  return Math.max(...plan.steps.map((s) => fin(s.id)));
};
const tiempoDePaso = (s) => {
  const n = Math.max(1, Number(s.input?.count ?? 1));
  if (s.capability.startsWith('image.')) return TIEMPOS.imagen * n;
  if (s.capability.startsWith('video.')) return TIEMPOS.video;
  return TIEMPOS[s.capability] ?? TIEMPOS['text.generate'];
};

const ejecutar = async (experiencia, tiempos, { quality } = {}) => {
  simularProveedoresDeCreador(E, { tiempos });
  E.reiniciarBase();
  E.enfriarCaches();
  E.sembrarCuenta(uid, 5000);
  /* Calentamiento: un trabajo previo del mismo tipo llena las cachés de 60 s y deja la cuenta como cualquier cuenta con historial. */
  await E.preparar(() => sembrarTrabajo(E, { uid, experiencia, jobId: `calentamiento${experiencia}01`, quality }));
  const w = await E.medir(() => creator.creatorRun.run({ auth: { uid }, data: { jobId: `calentamiento${experiencia}01`, locale: 'es' } }));
  if (w.error) throw new Error(`${experiencia}: el calentamiento falló: ${w.error.message}`);
  const jobId = `medido${experiencia}000001`;
  const { plan, creditsEstimated } = await E.preparar(() => sembrarTrabajo(E, { uid, experiencia, jobId, quality }));
  const antes = acumulados(E);
  const m = await E.medir(() => creator.creatorRun.run({ auth: { uid }, data: { jobId, locale: 'es' } }));
  return { m, plan, creditsEstimated, jobId, antes };
};

const filas = [];
const detalle = {};
for (const experiencia of EXPERIENCIAS) {
  const A = await ejecutar(experiencia, CERO);
  if (A.m.error) {
    filas.push({ experiencia, ok: false, error: String(A.m.error.message).slice(0, 140) });
    continue;
  }
  const libro = leerLibro(E, { uid, jobId: A.jobId, antes: A.antes });
  const docTrabajo = A.m.resumen.porDocumento[`creatorJobs/${A.jobId}`] ?? { escrituras: 0, bytes: 0 };
  const compartidos = compartidosDe(A.m.resumen.porDocumento);
  const B = await ejecutar(experiencia, TIEMPOS);
  const seriePrv = A.plan.steps.reduce((a, s) => a + tiempoDePaso(s), 0);
  const criticoPrv = caminoCritico(A.plan, tiempoDePaso);
  const pasos = A.plan.steps.map((s) => `${s.id}:${s.capability}${s.input?.count ? ` ×${s.input.count}` : ''}${(s.dependsOn || []).length ? ` ←${s.dependsOn.join('+')}` : ''}`);
  const f = {
    experiencia, ok: true, pasos: A.plan.steps.length, estructura: pasos,
    rpc: A.m.resumen.rpc, rondas: A.m.virtualMs, rpcPorPaso: Number((A.m.resumen.rpc / A.plan.steps.length).toFixed(1)),
    lecturas: A.m.resumen.lecturas, escrituras: A.m.resumen.escrituras,
    escriturasAlTrabajo: docTrabajo.escrituras, bytesAlTrabajo: docTrabajo.bytes,
    compartidos,
    tiempoSerieProveedorMs: seriePrv, tiempoCriticoProveedorMs: criticoPrv,
    ahorroPosibleMs: seriePrv - criticoPrv,
    totalVirtualConProveedorMs: B.m.virtualMs,
    creditsEstimatedDelTrabajo: A.creditsEstimated, libro,
    almacen: { llamadas: E.almacen.llamadas.length },
  };
  filas.push(f);
  detalle[experiencia] = { entradas: A.m.entradas.map((e) => `${e.desde - A.m.entradas[0].desde}:${e.tipo}:${(e.lee ?? []).concat(e.escribe ?? []).join(',') || e.consulta || ''}`.replace(/auto\d+/g, 'auto…').replace(/\d{4}-\d{2}-\d{2}/g, '{día}')) };
}
E.restaurar();

const ok = filas.filter((f) => f.ok);
const md = [];
md.push('# 03 · creatorRun multi-paso sobre el código real\n');
md.push('Medido con `scripts/bench-r7/03-creatorrun.mjs`. Pasada A (RPC y rondas, proveedor a 0 ms) = MEDIDO. Los tiempos de proveedor de la pasada B son SUPUESTOS [E] (`banco/creador.mjs`: texto 3 s, búsqueda 5 s, visión 4 s, imagen 12 s por propuesta, voz 4 s, vídeo 78,9 s).\n');
md.push(tabla(
  ['Experiencia', 'Pasos', 'RPC', 'Rondas', 'RPC/paso', 'Lect.', 'Escr.', 'Escr. al doc del trabajo', 'Bytes al doc', 'Estructura del plan'],
  filas.map((f) => (f.ok ? [f.experiencia, f.pasos, f.rpc, f.rondas, f.rpcPorPaso, f.lecturas, f.escrituras, f.escriturasAlTrabajo, f.bytesAlTrabajo, f.estructura.join(' · ')] : [f.experiencia, '—', '—', '—', '—', '—', '—', '—', '—', `FALLÓ: ${f.error}`])),
));
md.push('\n## Escrituras por documento COMPARTIDO entre personas (por trabajo)\n');
const claves = [...new Set(ok.flatMap((f) => Object.keys(f.compartidos)))];
md.push(tabla(['Experiencia', ...claves.map((c) => `${c} (L/E)`)], ok.map((f) => [f.experiencia, ...claves.map((c) => (f.compartidos[c] ? `${f.compartidos[c].lecturas}/${f.compartidos[c].escrituras}` : '—'))])));
md.push('\n## Serie frente a camino crítico (tiempos de proveedor SUPUESTOS [E], sin contar RPC)\n');
md.push(tabla(['Experiencia', 'Σ pasos en serie (ms)', 'Camino crítico del plan (ms)', 'Ahorro posible (ms)', '% del total'], ok.map((f) => [f.experiencia, f.tiempoSerieProveedorMs, f.tiempoCriticoProveedorMs, f.ahorroPosibleMs, `${((100 * f.ahorroPosibleMs) / f.tiempoSerieProveedorMs).toFixed(0)} %`])));
md.push('\n## Coherencia del libro tras cada trabajo (modo de precios por defecto: simulated)\n');
md.push(tabla(
  ['Experiencia', 'Job creditsEstimated', 'Tx autorizado', 'Tx final', 'Σ filas creditsEstimated', 'Σ filas creditsCharged', 'Σ providerCost (USD)', 'Δ aiUsage credits', 'Δ creditStats gastado', 'Trabajo creditsCharged'],
  ok.map((f) => [f.experiencia, f.creditsEstimatedDelTrabajo, f.libro.transaccion?.autorizado, f.libro.transaccion?.final, f.libro.sumaCreditsEstimatedFilas, f.libro.sumaCreditsChargedFilas, f.libro.sumaProviderCost, f.libro.acumuladoDelTrabajo.aiUsageCredits, f.libro.acumuladoDelTrabajo.creditStatsGastado, f.libro.trabajo.creditsCharged]),
));
md.push('\n## Secuencia de RPC de `design` (ronda:tipo:documento)\n```\n' + (detalle.design?.entradas ?? []).join('\n') + '\n```');

const dir = guardar('03-creatorrun', { filas, detalle }, md.join('\n'));
console.log(md.join('\n').split('\n').slice(0, 60).join('\n'));
console.log(`\n(salidas completas en ${dir})`);
process.exit(0);
