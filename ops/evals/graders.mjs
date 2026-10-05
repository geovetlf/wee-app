/*
 * WEË AI EVALUATION ENGINE — GRADERS DETERMINISTAS DEL MODEL ROUTER (F2-A).
 *
 * Cada grader mira la decisión NORMALIZADA del escenario y una propiedad esperada del caso. Son deterministas: sin
 * IA, sin red, sin azar. NO hay juez-LLM en F2-A. Un caso activa SOLO los graders cuya clave `expected.*` trae.
 * `router/eleccion` es GOLDEN (elección estructurada proveedor/modelo); el resto evalúa PROPIEDADES.
 */
import { DIMENSION_DE_GRADER } from './contrato.mjs';

const igualLista = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => x === b[i]);

/* Catálogo de graders: id → (decision, expected, caso) → { ok, detail } | null (null = no aplica a este caso). */
const CATALOGO = {
  'router/eleccion': (d, e) => {
    if (!e.chosen) return null;
    const ok = !!d.chosen && d.chosen.provider === e.chosen.provider && d.chosen.model === e.chosen.model;
    return { ok, detail: ok ? '' : `eligió ${d.chosen ? `${d.chosen.provider}/${d.chosen.model}` : '(nada)'}; esperado ${e.chosen.provider}/${e.chosen.model}` };
  },
  'router/orden': (d, e) => {
    if (!e.orden) return null;
    const ok = igualLista(d.orden, e.orden);
    return { ok, detail: ok ? '' : `orden ${d.orden.join(',')}; esperado ${e.orden.join(',')}` };
  },
  'router/descarte': (d, e) => {
    if (!e.descartes) return null;
    const faltan = e.descartes.filter((x) => !d.descartes.some((s) => s.provider === x.provider && s.reason === x.reason));
    return { ok: faltan.length === 0, detail: faltan.length ? `faltan descartes: ${faltan.map((x) => `${x.provider}:${x.reason}`).join(', ')}` : '' };
  },
  'router/disponibilidad': (d, e) => {
    if (!e.status) return null;
    if (d.status !== e.status) return { ok: false, detail: `status ${d.status}; esperado ${e.status}` };
    if (e.status === 'unavailable' && e.motivo && d.motivo !== e.motivo) return { ok: false, detail: `motivo ${d.motivo}; esperado ${e.motivo}` };
    return { ok: true, detail: '' };
  },
  'router/politica': (d, e, caso) => {
    if (e.politica !== true) return null;
    const prefs = caso.request?.prefs || {};
    const excl = new Set(prefs.excludeProviders || []);
    const malExcl = d.candidatos.filter((c) => excl.has(c.provider));
    if (malExcl.length) return { ok: false, detail: `candidatos excluidos presentes: ${malExcl.map((c) => c.provider).join(',')}` };
    if (prefs.allowedProviders) {
      const fuera = d.candidatos.filter((c) => c.provider !== 'mock' && !prefs.allowedProviders.includes(c.provider));
      if (fuera.length) return { ok: false, detail: `candidatos fuera de la familia permitida: ${fuera.map((c) => c.provider).join(',')}` };
    }
    // El primero debe ser el óptimo de la política entre los candidatos.
    const reales = d.candidatos.filter((c) => c.provider !== 'mock');
    if (reales.length >= 2 && d.chosen && d.chosen.provider !== 'mock') {
      const primero = reales[0];
      if (d.policy === 'cost-first' && reales.some((c) => c.usd < primero.usd)) return { ok: false, detail: 'cost-first pero el primero no es el más barato' };
      if (d.policy === 'quality-first' && reales.some((c) => c.quality > primero.quality)) return { ok: false, detail: 'quality-first pero el primero no es el de más calidad' };
    }
    return { ok: true, detail: '' };
  },
  'router/sin-demo-con-real': (d, e) => {
    if (e.sinDemoConReal !== true) return null;
    const demo = d.candidatos.some((c) => c.provider === 'mock');
    const ok = !(d.realProviderAvailable && demo);
    return { ok, detail: ok ? '' : 'hay candidato demo pese a existir un proveedor real' };
  },
  'router/coste': (d, e) => {
    if (!e.coste) return null;
    if (!d.chosen) return { ok: false, detail: 'no hay elección que medir' };
    const c0 = d.candidatos[0];
    if (e.coste.cheapest === true) {
      const reales = d.candidatos.filter((c) => c.provider !== 'mock');
      const ok = reales.every((c) => c0.usd <= c.usd);
      return { ok, detail: ok ? '' : `el elegido ($${c0.usd}) no es el más barato` };
    }
    if (typeof e.coste.chosenUsdMax === 'number') {
      const ok = c0.usd <= e.coste.chosenUsdMax;
      return { ok, detail: ok ? '' : `coste $${c0.usd} > tope $${e.coste.chosenUsdMax}` };
    }
    return null;
  },
  'router/latencia': (d, e) => {
    if (!e.latencia) return null;
    if (!d.chosen) return { ok: false, detail: 'no hay elección que medir' };
    const c0 = d.candidatos[0];
    if (e.latencia.fastest === true) {
      const reales = d.candidatos.filter((c) => c.provider !== 'mock');
      const ok = reales.every((c) => c0.speed >= c.speed);
      return { ok, detail: ok ? '' : `el elegido (vel ${c0.speed}) no es el más rápido` };
    }
    if (typeof e.latencia.chosenSpeedMin === 'number') {
      const ok = c0.speed >= e.latencia.chosenSpeedMin;
      return { ok, detail: ok ? '' : `velocidad ${c0.speed} < mínimo ${e.latencia.chosenSpeedMin}` };
    }
    return null;
  },
};

/** Corre todos los graders aplicables a un caso sobre su decisión. Devuelve [{ id, dimension, ok, detail }]. */
export const calificar = (decision, caso) => {
  const res = [];
  for (const [id, fn] of Object.entries(CATALOGO)) {
    const r = fn(decision, caso.expected || {}, caso);
    if (r) res.push({ id, dimension: DIMENSION_DE_GRADER[id], ok: r.ok, detail: r.detail });
  }
  return res;
};

export const GRADERS = Object.keys(CATALOGO);
