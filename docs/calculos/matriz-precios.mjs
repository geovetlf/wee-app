/*
 * Weë Credits · matriz de precios v6 · ESCENARIO Perú con Mercado Pago (no son precios finales).
 * Solo documentación: no lo usa la app ni el servidor. `node docs/calculos/matriz-precios.mjs`
 *
 * Qué hace (docs/PRECIOS-POR-MERCADO.md §4 y §10):
 *  1. Precio en soles de cada paquete global (Credits fijos) con el TC base.
 *  2. Elegibilidad INDEPENDIENTE de cada combinación  entidad × método de pago × plazo × paquete,
 *     con todos los costes variables (comisión %, fijo, impuesto sobre la comisión, conversión, retiro,
 *     reembolsos y contracargos) y sin contar nada dos veces. Nada de promedios entre métodos.
 *  3. Para cada combinación, el margen REAL de cada operación (no solo un umbral de neto por Credit),
 *     al TC base y en el borde de la banda (+5 %).
 *  4. Los umbrales N_ref / N_hard se DERIVAN de los costes y precios vigentes en cada corrida: son
 *     salvaguardas provisionales, no constantes globales.
 *
 * Cada entrada declara su fuente. Lo que no es 'VERIFICADO*' convierte el resultado en ESCENARIO.
 * Una tarifa DESCONOCIDA (null) bloquea esa combinación: no se rellena con la de otro método.
 */

// ── Entradas globales ──────────────────────────────────────────────────────────
const PAQUETES = [5, 10, 15, 20, 25, 50, 100].map((usdRef) => ({ id: `credits_${usdRef * 100}`, usdRef, credits: usdRef * 100 })); // 100 Credits = US$1
const UMBRAL_TC = 0.05; // banda ±5 %: fuera de ella, recálculo
const MARGEN_MINIMO = 0.40;

/* Operaciones con su coste en USD (fuente en MATRIZ §5), su objetivo de familia y sus Credits del escenario. */
const OPERACIONES = [
  ['Texto ai_text', 0.0046, 0.50, 2], ['Texto pro (tarifa 2027)', 0.0195, 0.50, 6], ['Búsqueda con fuentes', 0.0213, 0.45, 6],
  ['Transcripción 600 s', 0.0118, 0.45, 3], ['Voz /1.000 car.', 0.10, 0.50, 28], ['Voz mínimo 200 car.', 0.02, 0.50, 6],
  ['Imagen NB2 512', 0.045, 0.50, 13], ['Imagen NB2 1K', 0.067, 0.50, 19], ['Imagen NB2 2K', 0.101, 0.50, 28], ['Imagen NB2 4K', 0.151, 0.50, 42],
  ['Imagen rápida flash-lite', 0.0336, 0.50, 10], ['Imagen pro 1K/2K', 0.134, 0.55, 41], ['Imagen pro 4K', 0.24, 0.55, 74],
  ['Foto con avatar Weë', 0.134, 0.55, 41], ['Avatar Weë', 0.268, 0.55, 82], ['Prueba de ropa', 0.134, 0.55, 41], ['Mundo 3D', 0.30, 0.50, 83],
  ['Video 2.5 720p 10 s (provisional)', 2.3112, 0.50, 635], ['Video 2.0 1080p 15 s (provisional)', 5.6133, 0.50, 1541],
].map(([nombre, coste, objetivo, credits]) => ({ nombre, coste, objetivo, credits }));
/* Excluida a propósito de la elegibilidad: Weë Brain (12 respuestas = 1 Credit, decisión del dueño, subvencionada). */

// ── Mercado PE ─────────────────────────────────────────────────────────────────
const MERCADO = {
  id: 'PE', moneda: 'PEN', redondeo: (x) => Math.round(x), // sol entero
  impuesto: { tasa: 0.18, incluido: true, fuente: 'VERIFICADO_SUNAT' }, // IGV 2026: 15,5 % + 2,5 % IPM
  tcBase: { valor: 3.3, fuente: 'PENDIENTE_SBS' }, // escenario: sustituir por el SBS del día de aprobación
};

/* Entidades de facturación posibles. Mercado Pago Perú exige entidad peruana; si cambia la entidad, todo se recalcula. */
const ENTIDADES = {
  PE_entidad_peruana: {
    estado: 'PENDIENTE_CONSTITUCION_O_CONFIRMACION',
    igvComisionRecuperable: { valor: false, fuente: 'PENDIENTE_CONTADOR' }, // prudente: como coste
  },
};

/*
 * Tarifas de Mercado Pago por MÉTODO y PLAZO. `verificada` = cuenta de comerciante de Weë (con evidencia).
 * `provisional` = estimación de TERCEROS (solo se conoce para tarjeta/checkout). null = desconocida → bloquea.
 * conversionPct: cobro en PEN liquidado en PEN → 0 (si alguna vez se cobra en otra moneda, hay que verificarlo).
 */
const TARIFAS = {
  tarjeta: {
    instante: { verificada: null, provisional: { pct: 0.0399, fijo: 1.0, conversionPct: 0 } },
    '14 dias': { verificada: null, provisional: { pct: 0.0379, fijo: 1.0, conversionPct: 0 } },
  },
  yape: { instante: { verificada: null, provisional: null }, '14 dias': { verificada: null, provisional: null } },
  cuenta_mercado_pago: { instante: { verificada: null, provisional: null }, '14 dias': { verificada: null, provisional: null } },
};

/*
 * Costes por orden que no son la comisión. Cada uno con su fuente; null = desconocido (se trata como 0 y se marca).
 *  - retiro: comisión por retirar a la cuenta bancaria, repartida entre las órdenes de un retiro típico.
 *  - reembolso: si se devuelve, los Credits vuelven (no hay pérdida de ingreso); el coste es la comisión que NO se devuelve.
 *  - contracargo: pérdida del importe solo en la parte de Credits ya gastados + tarifa de contracargo.
 */
const OTROS_COSTES = {
  retiroPorOrdenPen: { valor: null, fuente: 'PENDIENTE_CUENTA' },
  tasaReembolso: { valor: 0.01, fuente: 'SUPUESTO_ESCENARIO' }, // 1 % de órdenes
  comisionDevueltaEnReembolso: { valor: false, fuente: 'NO_PUBLICADO' }, // prudente: no se devuelve
  tasaContracargo: { valor: 0.005, fuente: 'SUPUESTO_ESCENARIO' }, // 0,5 % de órdenes
  parteGastadaEnContracargo: { valor: 1.0, fuente: 'SUPUESTO_ESCENARIO' }, // peor caso: todo gastado
  tarifaContracargoPen: { valor: null, fuente: 'NO_PUBLICADO' },
};

// ── Cálculo ────────────────────────────────────────────────────────────────────
const pct = (x) => (x * 100).toFixed(1) + '%';
const usd = (x, d = 3) => '$' + x.toFixed(d);
const pen = (x) => 'S/ ' + x.toFixed(2);
const val = (e) => (e && e.valor != null ? e.valor : 0);

function tarifaDe(metodo, plazo) {
  const t = TARIFAS[metodo][plazo];
  if (t.verificada) return { ...t.verificada, fuente: 'VERIFICADA_CUENTA' };
  if (t.provisional) return { ...t.provisional, fuente: 'PROVISIONAL_TERCEROS' };
  return null;
}

/* Neto de UNA orden en USD. Cada coste aparece una sola vez. */
function netoDeOrden({ precioPen, credits, metodo, plazo, entidad, tc }) {
  const t = tarifaDe(metodo, plazo);
  if (!t) return { bloqueado: 'tarifa desconocida' };
  const bruto = precioPen / tc;
  const impuesto = bruto - bruto / (1 + MERCADO.impuesto.tasa); // incluido: se resta, nunca se suma
  const comision = (precioPen * (t.pct + t.conversionPct) + t.fijo) / tc;
  const impuestoComision = ENTIDADES[entidad].igvComisionRecuperable.valor ? 0 : comision * MERCADO.impuesto.tasa;
  const retiro = val(OTROS_COSTES.retiroPorOrdenPen) / tc;
  // Reembolso: el ingreso neto y el IGV se revierten con los Credits; queda la comisión no devuelta (y su IGV si no se recupera).
  const costeReembolso = val(OTROS_COSTES.tasaReembolso) * (OTROS_COSTES.comisionDevueltaEnReembolso.valor ? 0 : comision + impuestoComision);
  /*
   * Contracargo: se pierde el ingreso sin IGV (bruto − IGV) de la parte ya gastada, más la tarifa de contracargo.
   * La comisión NO se vuelve a restar: ya está una vez arriba (no se devuelve, así que sigue siendo coste).
   * El IGV de la venta se supone recuperable por nota de crédito (PENDIENTE_CONTADOR); si no lo fuera, súmese aquí.
   */
  const netoAntesDeRiesgo = bruto - impuesto - comision - impuestoComision - retiro;
  const costeContracargo = val(OTROS_COSTES.tasaContracargo) * (val(OTROS_COSTES.parteGastadaEnContracargo) * (bruto - impuesto) + val(OTROS_COSTES.tarifaContracargoPen) / tc);
  const neto = netoAntesDeRiesgo - costeReembolso - costeContracargo;
  return { bruto, impuesto, comision, impuestoComision, retiro, costeReembolso, costeContracargo, neto, N: neto / credits, fuenteTarifa: t.fuente };
}

const margenOp = (op, N) => 1 - op.coste / (op.credits * N);
/* Umbrales DERIVADOS de los precios y costes vigentes (salvaguardas provisionales). */
const N_REF = Math.max(...OPERACIONES.filter((o) => o.nombre !== 'Texto ai_text').map((o) => o.coste / (o.credits * (1 - o.objetivo))));
const N_HARD = Math.max(...OPERACIONES.map((o) => o.coste / (o.credits * (1 - MARGEN_MINIMO))));

const pendientes = () => {
  const f = [MERCADO.tcBase.fuente, ...Object.values(ENTIDADES).flatMap((e) => [e.estado, e.igvComisionRecuperable.fuente]), ...Object.values(OTROS_COSTES).map((c) => c.fuente)];
  for (const m of Object.keys(TARIFAS)) for (const p of Object.keys(TARIFAS[m])) { const t = tarifaDe(m, p); f.push(t ? t.fuente : `${m}/${p}: DESCONOCIDA`); }
  return [...new Set(f.filter((x) => !x.startsWith('VERIFICAD')))];
};

// ── Salida ─────────────────────────────────────────────────────────────────────
const tc = MERCADO.tcBase.valor;
const lista = PAQUETES.map((p) => ({ ...p, precioPen: MERCADO.redondeo(p.usdRef * tc) }));
console.log(`ESCENARIO (no aprobado). Pendiente o supuesto: ${pendientes().join(' · ')}`);
console.log(`Umbrales derivados (provisionales): N_ref ${usd(N_REF, 6)} (todas las familias en objetivo) · N_hard ${usd(N_HARD, 6)} (ninguna operación < 40 %)`);

console.log(`\n1) LISTA PE · TC base ${tc} (${MERCADO.tcBase.fuente})`);
for (const p of lista) console.log(`${p.id} | ${p.credits} Credits | ${pen(p.precioPen)} (exacto ${pen(p.usdRef * tc)}) | ref $${p.usdRef} → ${usd(p.precioPen / tc, 2)} (${pct(p.precioPen / tc / p.usdRef - 1)})`);

console.log('\n2) ELEGIBILIDAD por entidad × método × plazo × paquete (cada combinación por separado)');
const resultado = [];
for (const entidad of Object.keys(ENTIDADES)) for (const metodo of Object.keys(TARIFAS)) for (const plazo of Object.keys(TARIFAS[metodo])) for (const p of lista) {
  const base = netoDeOrden({ precioPen: p.precioPen, credits: p.credits, metodo, plazo, entidad, tc });
  if (base.bloqueado) { resultado.push({ entidad, metodo, plazo, p, estado: `DESACTIVADO (${base.bloqueado})` }); continue; }
  const borde = netoDeOrden({ precioPen: p.precioPen, credits: p.credits, metodo, plazo, entidad, tc: tc * (1 + UMBRAL_TC) });
  const peorBase = Math.min(...OPERACIONES.map((o) => margenOp(o, base.N)));
  const peorBorde = Math.min(...OPERACIONES.map((o) => margenOp(o, borde.N)));
  const bajoObjetivo = OPERACIONES.filter((o) => margenOp(o, base.N) < o.objetivo).map((o) => o.nombre);
  const pasa = peorBase >= MARGEN_MINIMO && peorBorde >= MARGEN_MINIMO;
  resultado.push({ entidad, metodo, plazo, p, base, borde, peorBase, peorBorde, bajoObjetivo, estado: pasa ? (bajoObjetivo.length ? 'PASA (con familias bajo objetivo)' : 'PASA') : 'DESACTIVADO (margen < 40 %)' });
}
for (const r of resultado) {
  const cab = `${r.entidad} · ${r.metodo} · ${r.plazo} · ${pen(r.p.precioPen)}`;
  if (!r.base) { console.log(`${cab} | ${r.estado}`); continue; }
  const b = r.base;
  console.log(`${cab} | IGV ${usd(b.impuesto, 2)} · comisión ${usd(b.comision)} · IGV comisión ${usd(b.impuestoComision)} · retiro ${usd(b.retiro)} · reembolsos ${usd(b.costeReembolso, 4)} · contracargos ${usd(b.costeContracargo, 4)} | neto ${usd(b.neto)} · N ${usd(b.N, 5)} | peor margen base ${pct(r.peorBase)} / +5 % ${pct(r.peorBorde)} | ${r.estado}`);
}

console.log('\n3) MARGEN REAL POR OPERACIÓN en la combinación más débil que pasa (tarjeta, instante, paquete más pequeño)');
const debil = resultado.find((r) => r.base && r.metodo === 'tarjeta' && r.plazo === 'instante' && r.p.credits === 500);
for (const o of OPERACIONES) console.log(`${o.nombre} | ${o.credits} Credits | objetivo ${pct(o.objetivo)} | base ${pct(margenOp(o, debil.base.N))} | +5 % ${pct(margenOp(o, debil.borde.N))}${margenOp(o, debil.base.N) < o.objetivo ? ' · bajo objetivo' : ''}${margenOp(o, debil.base.N) > 0.60 ? ' · >60 % por Credit entero' : ''}`);

console.log('\n4) Disparadores de recálculo de elegibilidad: coste de proveedor · tarifa de pago · impuesto · TC fuera de ±5 % · entidad de facturación');
export const hayQueRecalcular = (cambio) => ['costeProveedor', 'tarifaPago', 'impuesto', 'entidad'].includes(cambio.tipo) || (cambio.tipo === 'tc' && Math.abs(cambio.valor / MERCADO.tcBase.valor - 1) > UMBRAL_TC);
for (const c of [{ tipo: 'tc', valor: 3.45 }, { tipo: 'tc', valor: 3.47 }, { tipo: 'tarifaPago' }, { tipo: 'entidad' }]) console.log(JSON.stringify(c), '→', hayQueRecalcular(c) ? 'RECALCULAR' : 'sin cambios');
