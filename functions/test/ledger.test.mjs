// Libro de generaciones contra un Firestore falso ESTRICTO: rechaza undefined a
// cualquier profundidad, igual que el real. Sin esa dureza estas pruebas pasarían
// también con el fallo de 2E-8 dentro, que es justo lo que no puede volver a pasar.
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const noLanza = async (name, fn) => {
  try {
    const out = await fn();
    check(name, true);
    return out;
  } catch (error) {
    check(name, false, 'lanzó: ' + error.message);
    return null;
  }
};

// ─── Firestore falso ────────────────────────────────────────────────────────────
const INC = Symbol('increment');
const clone = (v) => (v && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v);

// La misma comprobación que hace el SDK real antes de enviar nada, con el mismo
// texto: es lo que reventó el cierre de 2E-8.
const rechazaUndefined = (value, ruta = '') => {
  if (value === undefined) {
    throw new Error(
      'Value for argument "data" is not a valid Firestore document. Cannot use "undefined" as a Firestore value' +
        (ruta ? ' (found in field "' + ruta + '").' : '.')
    );
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => rechazaUndefined(v, ruta + '.' + i));
    return;
  }
  if (value && typeof value === 'object' && !value[INC] && !value.__esUnTimestamp) {
    for (const [k, v] of Object.entries(value)) rechazaUndefined(v, ruta ? ruta + '.' + k : k);
  }
};

const fusiona = (patch, existing) => {
  if (patch && typeof patch === 'object' && patch[INC] !== undefined) return (typeof existing === 'number' ? existing : 0) + patch[INC];
  if (patch && typeof patch === 'object' && !Array.isArray(patch) && !patch.__esUnTimestamp) {
    const out = existing && typeof existing === 'object' && !Array.isArray(existing) ? { ...existing } : {};
    for (const [k, v] of Object.entries(patch)) out[k] = fusiona(v, out[k]);
    return out;
  }
  return patch;
};

class FakeDb {
  constructor() {
    this.docs = new Map();
    this.auto = 0;
    this.escrituras = 0;
  }
  collection(p) {
    return new Coll(this, p);
  }
  batch() {
    const ops = [];
    return {
      set: (ref, data, opts) => ops.push([ref, data, opts]),
      commit: async () => ops.forEach(([ref, data, opts]) => ref.setSync(data, opts)),
    };
  }
  read(p) {
    return this.docs.has(p) ? clone(this.docs.get(p)) : undefined;
  }
}
class Ref {
  constructor(db, p) {
    this.db = db;
    this.path = p;
    this.id = p.split('/').pop();
  }
  setSync(data, opts) {
    rechazaUndefined(data); // ← lo que hace el SDK real: falla ANTES de escribir
    this.db.escrituras++;
    const previo = this.db.docs.get(this.path);
    this.db.docs.set(this.path, opts && opts.merge ? fusiona(data, previo || {}) : fusiona(data, {}));
  }
  async set(data, opts) {
    this.setSync(data, opts);
  }
  async get() {
    const data = this.db.docs.get(this.path);
    return { exists: data !== undefined, id: this.id, ref: this, data: () => (data ? { ...data } : undefined), get: (f) => data && data[f] };
  }
}
class Coll {
  constructor(db, p, filtros = []) {
    Object.assign(this, { db, path: p, filtros });
  }
  doc(id) {
    return new Ref(this.db, this.path + '/' + (id || 'gen_' + ++this.db.auto));
  }
  where(field, _op, value) {
    return new Coll(this.db, this.path, [...this.filtros, [field, value]]);
  }
  async get() {
    const filas = [...this.db.docs.entries()]
      .filter(([p]) => p.startsWith(this.path + '/') && !p.slice(this.path.length + 1).includes('/'))
      .filter(([, d]) => this.filtros.every(([f, v]) => d[f] === v));
    const docs = filas.map(([p, d]) => ({ id: p.split('/').pop(), ref: new Ref(this.db, p), data: () => ({ ...d }), get: (f) => d[f] }));
    return { docs, empty: docs.length === 0, size: docs.length };
  }
}

const db = new FakeDb();
let reloj = 0;
const marca = () => {
  const n = ++reloj;
  const fecha = new Date(Date.UTC(2026, 8, 8, 12, 0, n));
  return { __esUnTimestamp: true, _n: n, toDate: () => fecha };
};

// El libro pide su Firestore al SDK; se lo damos falso antes de cargarlo.
const idSdk = require.resolve('firebase-admin/firestore');
require.cache[idSdk] = {
  id: idSdk,
  loaded: true,
  exports: { getFirestore: () => db, Timestamp: { now: marca }, FieldValue: { increment: (n) => ({ [INC]: n }) } },
};

const { firestoreLedger: libro, LEDGER_VERSION, distribute } = require(path.resolve(here, '../lib/engine/ledger.js'));
const fila = (id) => db.read('aiGenerations/' + id);
const uso = () => [...db.docs.entries()].filter(([p]) => p.startsWith('aiUsage/')).map(([, d]) => d)[0] || {};
const flux = () => (uso()['image.generate'] || {}).flux || {};

const abrir = (extra = {}) =>
  libro.open({
    userId: 'u1',
    requestId: 'r1',
    capability: 'image.generate',
    modality: 'image',
    provider: 'flux',
    model: 'flux-2-klein-9b',
    attempt: 1,
    estimatedUsd: 0.015,
    ...extra,
  });

console.log('\n── El Firestore de pruebas es tan estricto como el real ──');
{
  let mensaje = '';
  try {
    new Ref(db, 'prueba/x').setSync({ providerMeta: { settledUsd: undefined } });
  } catch (error) {
    mensaje = error.message;
  }
  check('rechaza un undefined anidado y nombra el campo', mensaje.includes('Cannot use "undefined"') && mensaje.includes('providerMeta.settledUsd'), mensaje.slice(0, 60));
  let dentroDeArray = false;
  try {
    new Ref(db, 'prueba/y').setSync({ urls: ['a', undefined] });
  } catch {
    dentroDeArray = true;
  }
  check('rechaza también un undefined dentro de un array', dentroDeArray);
  check(
    'y acepta 0, false, null y cadena vacía',
    (() => {
      try {
        new Ref(db, 'prueba/z').setSync({ a: 0, b: false, c: null, d: '' });
        return true;
      } catch {
        return false;
      }
    })()
  );
}

console.log('\n── A–C · providerMeta a cualquier profundidad ──');
{
  const id = await abrir();
  await noLanza('A) providerMeta completamente definido', () =>
    libro.close(id, { status: 'COMPLETED', providerCost: 0.015, creditsEstimated: 5, durationMs: 100, providerMeta: { references: 0, usdPerImage: 0.015, edited: false } })
  );
  check('A) se guarda entero', JSON.stringify(fila(id).providerMeta) === JSON.stringify({ references: 0, usdPerImage: 0.015, edited: false }));

  const id2 = await abrir();
  await noLanza('B) providerMeta con undefined superficial', () =>
    libro.close(id2, { status: 'COMPLETED', providerCost: 0.015, creditsEstimated: 5, durationMs: 100, providerMeta: { references: 1, settledUsd: undefined } })
  );
  check('B) desaparece solo el campo sin valor', fila(id2).providerMeta.references === 1 && !('settledUsd' in fila(id2).providerMeta));

  const id3 = await abrir();
  await noLanza('C) providerMeta con undefined a tres niveles', () =>
    libro.close(id3, { status: 'COMPLETED', providerCost: 0.015, creditsEstimated: 5, durationMs: 100, providerMeta: { bfl: { cobro: { usd: undefined, credits: 1.5 } } } })
  );
  check('C) el resto del árbol llega intacto', fila(id3).providerMeta.bfl.cobro.credits === 1.5 && !('usd' in fila(id3).providerMeta.bfl.cobro));
}

console.log('\n── D–F · settledUsd: ausente, cero y con valor ──');
{
  const idD = await abrir();
  await noLanza('D) settledUsd = undefined', () =>
    libro.close(idD, { status: 'COMPLETED', providerCost: 0, creditsEstimated: 5, durationMs: 10, providerMeta: { usdPerImage: 0.015, settledUsd: undefined } })
  );
  check('D) queda ausente, que es lo que significa "no liquidado"', !('settledUsd' in fila(idD).providerMeta));

  const idE = await abrir();
  await noLanza('E) settledUsd = 0', () => libro.close(idE, { status: 'COMPLETED', providerCost: 0, creditsEstimated: 5, durationMs: 10, providerMeta: { settledUsd: 0 } }));
  check('E) el CERO se conserva: no es lo mismo que no saberlo', fila(idE).providerMeta.settledUsd === 0);

  const idF = await abrir();
  await noLanza('F) settledUsd > 0', () => libro.close(idF, { status: 'COMPLETED', providerCost: 0.015, creditsEstimated: 5, durationMs: 10, providerMeta: { settledUsd: 0.015 } }));
  check('F) se guarda el coste liquidado real', fila(idF).providerMeta.settledUsd === 0.015);
}

console.log('\n── G–H · providerCost presente y ausente ──');
{
  const idG = await abrir();
  await libro.close(idG, { status: 'COMPLETED', providerCost: 0.015, creditsEstimated: 5, durationMs: 10 });
  check('G) providerCost definido se registra tal cual', fila(idG).providerCost === 0.015);

  const usdAntes = flux().usd;
  const idH = await abrir();
  await noLanza('H) providerCost ausente no rompe el cierre', () => libro.close(idH, { status: 'COMPLETED', providerCost: undefined, creditsEstimated: 5, durationMs: 10 }));
  check('H) la fila conserva el 0 de la apertura, sin inventar coste', fila(idH).providerCost === 0);
  check('H) y el acumulado del día no se mueve', flux().usd === usdAntes);
}

console.log('\n── I–K · desenlaces ──');
{
  const idI = await abrir();
  await libro.close(idI, { status: 'COMPLETED', providerCost: 0.015, creditsEstimated: 5, durationMs: 250, outputType: 'image' });
  check('I) generación y cierre correctos', fila(idI).status === 'COMPLETED' && !!fila(idI).completedAt && fila(idI).durationMs === 250);

  const idJ = await abrir();
  await noLanza('J) generación correcta con metadata parcial', () =>
    libro.close(idJ, {
      status: 'COMPLETED',
      providerCost: 0.015,
      creditsEstimated: 5,
      durationMs: 250,
      providerMeta: { references: 0, usdPerImage: 0.015, edited: false, settledUsd: undefined },
    })
  );
  check('J) el resultado del proveedor NO se descarta por eso', fila(idJ).status === 'COMPLETED' && fila(idJ).providerCost === 0.015);

  const idK = await abrir();
  await libro.close(idK, { status: 'FAILED', providerCost: 0, creditsEstimated: 0, durationMs: 5, error: 'sin modelo elegible' });
  check('K) fallo antes de llamar al proveedor: 0 coste y sin completedAt', fila(idK).status === 'FAILED' && fila(idK).providerCost === 0 && !fila(idK).completedAt);
  check('K) tampoco declara ningún cobro', !('creditsCharged' in fila(idK)));
}

console.log('\n── L–Q · semántica del libro v2, intacta ──');
{
  const idL = await abrir({ creditTransactionId: 'usage_2e11_refund' });
  const usdAntes = flux().usd || 0;
  await libro.close(idL, { status: 'COMPLETED', providerCost: 0.015, creditsEstimated: 5, durationMs: 200 });
  check('Q) el cierre acumula el gasto real del proveedor en el día', Math.abs(flux().usd - (usdAntes + 0.015)) < 1e-9, String(flux().usd));
  check('N) antes de liquidar, creditsCharged NO existe (2E-2)', !('creditsCharged' in fila(idL)));
  check('O) creditsEstimated es el precio de catálogo, se cobre o no', fila(idL).creditsEstimated === 5);
  const creditsAntes = flux().credits || 0;
  const usdTrasCerrar = flux().usd;
  const res = await libro.settle({ creditTransactionId: 'usage_2e11_refund', finalAmount: 0 });
  check('L) reembolso total: creditsCharged = 0 y queda liquidada', fila(idL).creditsCharged === 0 && !!fila(idL).settledAt && res.credited === 0);
  check('M) ledgerVersion 2 en la apertura y tras liquidar', fila(idL).ledgerVersion === LEDGER_VERSION && LEDGER_VERSION === 2);
  check('P) aiUsage.credits no suma nada de una operación reembolsada', (flux().credits || 0) === creditsAntes);
  // El dinero salió de verdad aunque los Credits volvieran enteros: el gasto
  // del proveedor se queda en el día y la liquidación no lo toca.
  check('Q) aiUsage.usd conserva el gasto real aunque se capturen 0 Credits', flux().usd === usdTrasCerrar && flux().usd > 0);

  const idN = await abrir({ creditTransactionId: 'usage_2e11_cobro' });
  await libro.close(idN, { status: 'COMPLETED', providerCost: 0.015, creditsEstimated: 5, durationMs: 200 });
  const cobro = await libro.settle({ creditTransactionId: 'usage_2e11_cobro', finalAmount: 5 });
  check('N) capturado de verdad: creditsCharged = 5', fila(idN).creditsCharged === 5 && cobro.credited === 5);
  check('P) y ahora sí se acumula como ingreso del día', (flux().credits || 0) === creditsAntes + 5);
  const repetida = await libro.settle({ creditTransactionId: 'usage_2e11_cobro', finalAmount: 5 });
  check('la liquidación es idempotente: no cobra dos veces', repetida.already && (flux().credits || 0) === creditsAntes + 5);
}

console.log('\n── R · ningún valor legítimo desaparece ──');
{
  const idR = await abrir();
  await libro.close(idR, {
    status: 'COMPLETED',
    providerCost: 0,
    creditsEstimated: 0,
    durationMs: 0,
    providerMeta: { cero: 0, falso: false, nulo: null, vacio: '', ausente: undefined, dentro: { cero: 0, falso: false, nulo: null, vacio: '', ausente: undefined } },
  });
  const m = fila(idR).providerMeta;
  check('R) 0, false, null y "" sobreviven en el primer nivel', m.cero === 0 && m.falso === false && m.nulo === null && m.vacio === '');
  check('R) y también anidados', m.dentro.cero === 0 && m.dentro.falso === false && m.dentro.nulo === null && m.dentro.vacio === '');
  check('R) solo desaparece lo que no se puede guardar', !('ausente' in m) && !('ausente' in m.dentro));
  check('R) creditsEstimated = 0 se escribe, no se confunde con ausente', fila(idR).creditsEstimated === 0);
  check('R) providerCost = 0 se escribe', fila(idR).providerCost === 0);
}

console.log('\n── CASO CRÍTICO · la generación real de 2E-8, tal como ocurrió ──');
{
  // FLUX ya había generado y BFL ya había cobrado cuando el cierre reventó.
  const id = await libro.open({
    userId: 'u_2e8',
    requestId: 'job_2e8:step_2',
    jobId: 'job_2e8',
    stepId: 'step_2',
    experienceId: 'chef',
    capability: 'image.generate',
    service: 'ai_image',
    modality: 'image',
    provider: 'flux',
    model: 'flux-2-klein-9b',
    attempt: 1,
    estimatedUsd: 0.015,
    creditTransactionId: 'usage_job_2e8',
    pricingMode: 'real',
    inputType: 'text',
  });
  await libro.progress(id, { status: 'PROCESSING', providerTaskId: 'bfl_task_2e8', estimatedTokens: undefined, estimatedUsd: undefined });
  check('el avance con campos sin valor tampoco rompe', fila(id).status === 'PROCESSING' && fila(id).providerTaskId === 'bfl_task_2e8');

  // El meta que devuelve flux.ts cuando BFL no liquida el coste en la respuesta.
  const metaDeFlux = { references: 0, usdPerImage: 0.015, edited: false, settledUsd: undefined };
  await noLanza('el cierre NO lanza excepción (era el fallo de 2E-8)', () =>
    libro.close(id, {
      status: 'COMPLETED',
      providerCost: 0.015,
      creditsEstimated: 5,
      durationMs: 8400,
      usage: { images: 1 },
      outputType: 'image',
      providerMeta: metaDeFlux,
    })
  );
  check('la generación queda registrada como COMPLETED', fila(id).status === 'COMPLETED');
  check('el coste real del proveedor SÍ queda en el libro', fila(id).providerCost === 0.015);
  check(
    'el meta se guarda sin el campo que no se pudo liquidar',
    fila(id).providerMeta.usdPerImage === 0.015 && fila(id).providerMeta.edited === false && !('settledUsd' in fila(id).providerMeta)
  );
  check('sin reintroducir 2E-2: cerrar no declara ningún cobro', !('creditsCharged' in fila(id)));

  // La operación acabó reembolsada: los Credits vuelven y el libro lo dice.
  await libro.settle({ creditTransactionId: 'usage_job_2e8', finalAmount: 0 });
  check('reembolsada: creditsCharged = 0, no ausente', fila(id).creditsCharged === 0 && !!fila(id).settledAt);
  check('creditsEstimated conserva lo que valía el paso', fila(id).creditsEstimated === 5);
  check('el gasto real de BFL no se pierde en el día', flux().usd > 0);
}

// ── REPARTO DE LOS CREDITS CAPTURADOS EN aiUsage ────────────────────────────
// En 2E-12 un trabajo de Chef (2 Credits de Gemini + 3 de FLUX) apuntó los 5 a
// gemini/text.generate y dejó flux/image.generate en 0: la liquidación colapsaba
// todo el importe en el cubo de la primera fila de la consulta.
console.log('\n── A–J · aiUsage reparte lo capturado entre los pasos que lo generaron ──');
{
  // Foto de los cubos de Credits por capacidad y proveedor, para medir deltas.
  const cubos = () => {
    const u = uso();
    const out = {};
    for (const [cap, provs] of Object.entries(u)) {
      if (cap === 'updatedAt' || cap === 'byProvider' || !provs || typeof provs !== 'object') continue;
      for (const [prov, v] of Object.entries(provs)) if (v && typeof v === 'object') out[cap + '/' + prov] = v.credits || 0;
    }
    return out;
  };
  const delta = (antes, ahora) => {
    const out = {};
    for (const k of new Set([...Object.keys(antes), ...Object.keys(ahora)])) {
      const d = (ahora[k] || 0) - (antes[k] || 0);
      if (d !== 0) out[k] = d;
    }
    return out;
  };
  // Un trabajo con varios pasos: se abren, se cierran y se liquidan juntos.
  const trabajo = async (tx, pasos, capturado) => {
    const ids = [];
    for (const p of pasos) {
      const id = await libro.open({
        userId: 'u_reparto',
        requestId: tx + ':' + p.stepId,
        capability: p.capability,
        modality: p.capability.startsWith('image') ? 'image' : 'text',
        provider: p.provider,
        model: p.model,
        attempt: 1,
        estimatedUsd: p.usd,
        creditTransactionId: tx,
      });
      await libro.close(id, {
        status: p.status || 'COMPLETED',
        providerCost: p.usd,
        creditsEstimated: p.credits,
        durationMs: 100,
      });
      ids.push(id);
    }
    const antes = cubos();
    const res = await libro.settle({ creditTransactionId: tx, finalAmount: capturado });
    return { ids, res, reparto: delta(antes, cubos()), cargado: ids.map((id) => fila(id).creditsCharged) };
  };

  // ── CASO CRÍTICO · la estructura exacta de 2E-12 ──
  const chef = await trabajo(
    'usage_2e13_chef',
    [
      { stepId: 'recipe', capability: 'text.generate', provider: 'gemini', model: 'gemini-3.1-flash-lite', credits: 2, usd: 0.000523 },
      { stepId: 'dish', capability: 'image.generate', provider: 'flux', model: 'flux-2-klein-9b', credits: 3, usd: 0.015 },
    ],
    5
  );
  check('A) Chef: 2 de Gemini + 3 de FLUX se reparten a SU cubo', chef.reparto['text.generate/gemini'] === 2 && chef.reparto['image.generate/flux'] === 3, JSON.stringify(chef.reparto));
  check('A) el total capturado no cambia: sigue siendo 5', chef.res.credited === 5);
  check('H) la suma de los cubos coincide con el total capturado', Object.values(chef.reparto).reduce((a, b) => a + b, 0) === 5);
  check('H) y con la suma de los creditsCharged de las filas', chef.cargado.join(',') === '2,3' && chef.cargado.reduce((a, b) => a + b, 0) === 5);
  check('F) ningún Credit se duplica: solo dos cubos se movieron', Object.keys(chef.reparto).length === 2, Object.keys(chef.reparto).join(', '));
  check('G) ningún Credit desaparece: nada quedó sin asignar', 5 - Object.values(chef.reparto).reduce((a, b) => a + b, 0) === 0);

  // B) Un solo paso de texto
  const soloTexto = await trabajo('usage_2e13_texto', [{ stepId: 'r', capability: 'text.generate', provider: 'gemini', model: 'g', credits: 2, usd: 0.0005 }], 2);
  check('B) solo Gemini: 2 capturados → 2 en su cubo', soloTexto.reparto['text.generate/gemini'] === 2 && Object.keys(soloTexto.reparto).length === 1, JSON.stringify(soloTexto.reparto));

  // C) Un solo paso de imagen
  const soloImagen = await trabajo('usage_2e13_imagen', [{ stepId: 'd', capability: 'image.generate', provider: 'flux', model: 'flux-2-klein-9b', credits: 3, usd: 0.015 }], 3);
  check('C) solo imagen: 3 capturados → 3 en su cubo', soloImagen.reparto['image.generate/flux'] === 3 && Object.keys(soloImagen.reparto).length === 1, JSON.stringify(soloImagen.reparto));

  // D) Reembolso total
  const reembolsado = await trabajo(
    'usage_2e13_refund',
    [
      { stepId: 'recipe', capability: 'text.generate', provider: 'gemini', model: 'g', credits: 2, usd: 0.0005 },
      { stepId: 'dish', capability: 'image.generate', provider: 'flux', model: 'flux-2-klein-9b', credits: 3, usd: 0.015 },
    ],
    0
  );
  check('D) reembolso total: ningún cubo se mueve', Object.keys(reembolsado.reparto).length === 0, JSON.stringify(reembolsado.reparto));
  check('D) y las dos filas quedan en creditsCharged = 0', reembolsado.cargado.join(',') === '0,0' && reembolsado.res.credited === 0);

  // E) Varios pasos, incluidos dos del mismo proveedor y capacidad
  const muchos = await trabajo(
    'usage_2e13_muchos',
    [
      { stepId: 'a', capability: 'text.generate', provider: 'gemini', model: 'g', credits: 2, usd: 0.0005 },
      { stepId: 'b', capability: 'text.generate', provider: 'gemini', model: 'g', credits: 2, usd: 0.0005 },
      { stepId: 'c', capability: 'image.generate', provider: 'flux', model: 'flux-2-klein-9b', credits: 3, usd: 0.015 },
      { stepId: 'd', capability: 'image.generate', provider: 'seedream', model: 'seedream-4-0-250828', credits: 3, usd: 0.03 },
    ],
    10
  );
  check('E) cuatro pasos: cada cubo recibe lo suyo', muchos.reparto['text.generate/gemini'] === 4 && muchos.reparto['image.generate/flux'] === 3 && muchos.reparto['image.generate/seedream'] === 3, JSON.stringify(muchos.reparto));
  check('E) dos pasos del mismo cubo SUMAN, no se pisan', muchos.cargado.join(',') === '2,2,3,3');
  check('E) y el total sigue cuadrando', Object.values(muchos.reparto).reduce((a, b) => a + b, 0) === 10 && muchos.res.credited === 10);

  // F–G) Un paso fallido no cobra ni reparte, y el resto no lo hereda
  const conFallo = await trabajo(
    'usage_2e13_fallo',
    [
      { stepId: 'a', capability: 'text.generate', provider: 'gemini', model: 'g', credits: 2, usd: 0.0005 },
      { stepId: 'b', capability: 'image.generate', provider: 'flux', model: 'flux-2-klein-9b', credits: 3, usd: 0, status: 'FAILED' },
    ],
    2
  );
  check('F) el paso fallido no aparece en ningún cubo', !('image.generate/flux' in conFallo.reparto) && conFallo.reparto['text.generate/gemini'] === 2, JSON.stringify(conFallo.reparto));
  check('G) y su fila queda en 0, sin repartirle nada', conFallo.cargado.join(',') === '2,0');

  // I) El gasto real del proveedor sigue siendo por proveedor y ajeno al reparto
  {
    const u = uso();
    check('I) aiUsage.usd sigue siendo el coste real de cada proveedor', u['image.generate'].flux.usd > 0 && u['text.generate'].gemini.usd > 0 && u['image.generate'].seedream.usd > 0);
    check('I) y el coste no se mezcla con los Credits', u['image.generate'].flux.usd !== u['image.generate'].flux.credits);
  }

  // J) La semántica del libro v2 no se ha movido
  check('J) ledgerVersion 2 y settledAt en todas las filas liquidadas', [...chef.ids, ...muchos.ids].every((id) => fila(id).ledgerVersion === 2 && !!fila(id).settledAt));
  check('J) creditsEstimated sigue siendo el precio de catálogo, intacto tras liquidar', fila(chef.ids[0]).creditsEstimated === 2 && fila(chef.ids[1]).creditsEstimated === 3);
}

// ── K–M · DIMENSIONES REALES EN LA FILA DE IMAGEN ───────────────────────────
console.log('\n── K–M · la fila guarda la resolución que se ejecutó ──');
{
  const idK = await abrir();
  await libro.close(idK, { status: 'COMPLETED', providerCost: 0.015, creditsEstimated: 3, durationMs: 100, width: 1024, height: 1024, providerMeta: { references: 0, usdPerImage: 0.015, edited: false, settledUsd: undefined, width: 1024, height: 1024 } });
  check('K) la fila de image.generate recibe las dimensiones ejecutadas', fila(idK).width === 1024 && fila(idK).height === 1024);
  check('L) FLUX 1024x1024 se conserva tal cual', fila(idK).width + 'x' + fila(idK).height === '1024x1024');
  check('K) sin mezclarse con resolution, que es la etiqueta de vídeo', !('resolution' in fila(idK)));

  const idM = await abrir();
  await libro.close(idM, { status: 'COMPLETED', providerCost: 0.015, creditsEstimated: 3, durationMs: 100, width: undefined, height: undefined, providerMeta: { references: 0 } });
  check('M) sin dimensiones declaradas no se inventa ninguna', !('width' in fila(idM)) && !('height' in fila(idM)));

  const idV = await abrir({ capability: 'video.generate', provider: 'seedance', model: 'seedance-2-5' });
  await libro.close(idV, { status: 'COMPLETED', providerCost: 0.5, creditsEstimated: 20, durationMs: 100, resolution: '1080p', videoDurationSec: 5 });
  check('M) el vídeo sigue guardando su etiqueta en resolution, sin width ni height', fila(idV).resolution === '1080p' && !('width' in fila(idV)));
}

console.log('\n── reparto de lo capturado entre pasos ──');
{
  check('reparte enteros sin perder ni inventar Credits', distribute(5, [3, 2]).join(',') === '3,2' && distribute(5, [1, 1]).reduce((a, b) => a + b, 0) === 5);
  check('sin captura no reparte nada', distribute(0, [3, 2]).join(',') === '0,0');
}

console.log(failures ? `\n${failures} prueba(s) fallaron` : '\nLibro de generaciones: metadata parcial, semántica v2 y el caso de 2E-8 en orden');
process.exit(failures ? 1 : 0);
