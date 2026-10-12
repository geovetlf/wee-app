#!/usr/bin/env node
/**
 * 10 · LAS PROPUESTAS DE IMAGEN, ¿EN SERIE? — los tres adaptadores REALES con la red simulada.
 *
 * Ejecuta `geminiAdapter`, `fluxAdapter` y `seedreamAdapter` (compilados) con:
 *   · Gemini: el cliente falso que el propio adaptador admite (`__setGeminiClient`);
 *   · FLUX y Seedream: un `fetch` simulado (sin red) que tarda T_GEN ms virtuales en «generar» cada imagen;
 *   · el Storage doble para guardar el resultado.
 *
 * Pide N = 1…4 propuestas en UNA llamada al adaptador y mide el tiempo virtual total. Si es ≈ N × T, las propuestas van en
 * serie. Después pide las mismas N con N llamadas de UNA propuesta a la vez (lo que haría un reparto en paralelo) y mide
 * el tiempo y las llamadas al proveedor.
 *
 * T_GEN es un SUPUESTO (10 s por imagen): el tiempo real de cada proveedor es desconocido [D]. Lo que se mide es la
 * ESTRUCTURA (serie vs paralelo), no el segundo exacto. Las claves son marcadores falsos que no salen del proceso.
 *
 *     node scripts/bench-r7/10-adaptadores-en-serie.mjs
 */
import { prepararEntorno, lib, UID, tabla } from './banco/entorno.mjs';
import { guardar } from './banco/salida.mjs';

/* Marcadores falsos: el fetch simulado de abajo es lo único que los ve. */
process.env.BFL_API_KEY = 'marcador-falso-del-banco';
process.env.ARK_API_KEY = 'marcador-falso-del-banco';
process.env.GEMINI_API_KEY = 'marcador-falso-del-banco';
/* Los adaptadores leen su dirección base del entorno: se les da una que no existe, y el fetch simulado reconoce SOLO esas. */
process.env.BFL_BASE_URL = 'https://bfl.invalid';
process.env.ARK_BASE_URL = 'https://ark.invalid/api/v3';

const E = prepararEntorno({ latencia: { get: 1, query: 1, write: 1, commit: 1 }, latenciaAlmacen: { guardar: 300 } });
const { reloj } = E;
const T_GEN = 10_000;
const RED = { crear: 150, bajar: 400 };
const uid = UID(1);

/* ── La red simulada ── */
const llamadasDeRed = [];
const tareas = new Map();
let n = 0;
const respuesta = (cuerpo, { bytes } = {}) => ({
  ok: true, status: 200, headers: { get: () => (bytes ? 'image/png' : 'application/json') },
  text: async () => JSON.stringify(cuerpo ?? {}),
  arrayBuffer: async () => bytes ?? new ArrayBuffer(0),
});
const fetchFalso = async (url, init = {}) => {
  const u = String(url);
  const metodo = init.method ?? (init.body ? 'POST' : 'GET');
  llamadasDeRed.push({ t: reloj.ahora, metodo, u: u.replace(/^https?:\/\/[^/]+/, '').slice(0, 60) });
  if (u.includes('bfl.invalid/v1/')) {
    await reloj.dormir(RED.crear);
    const id = ++n;
    tareas.set(id, reloj.ahora);
    return respuesta({ id: String(id), polling_url: `https://bfl.invalid/poll/${id}` });
  }
  if (u.includes('bfl.invalid/poll/')) {
    await reloj.dormir(50);
    const id = Number(u.split('/').pop());
    return reloj.ahora - tareas.get(id) >= T_GEN
      ? respuesta({ status: 'Ready', result: { sample: `https://cdn.bfl.invalid/${id}.png` } })
      : respuesta({ status: 'Pending' });
  }
  if (u.includes('/images/generations')) {
    await reloj.dormir(T_GEN);
    return respuesta({ data: [{ url: `https://cdn.ark.invalid/${++n}.png` }], usage: { generated_images: 1 } });
  }
  if (u.includes('cdn.')) {
    await reloj.dormir(RED.bajar);
    return respuesta(null, { bytes: new Uint8Array(200_000).buffer });
  }
  throw new Error(`el banco no conoce esta URL: ${u}`);
};
globalThis.fetch = fetchFalso;

const gemini = lib('engine/providers/gemini.js');
let llamadasGemini = 0;
gemini.__setGeminiClient({
  models: {
    generateContent: async () => {
      llamadasGemini++;
      await reloj.dormir(T_GEN);
      return { candidates: [{ content: { parts: [{ inlineData: { data: 'iVBORw0KGgo=', mimeType: 'image/png' } }] } }] };
    },
  },
});

const { ADAPTERS } = E;
const adaptadores = [
  ['gemini', 'image.generate', (m) => m.id.includes('image')],
  ['flux', 'image.generate', (m) => m.id.startsWith('flux-2-klein')],
  ['seedream', 'image.generate', () => true],
];
const filas = [];
for (const [id, capability, elegir] of adaptadores) {
  const adaptador = ADAPTERS[id];
  const modelo = adaptador.models.find((m) => m.capabilities.includes(capability) && elegir(m)) ?? adaptador.models.find((m) => m.capabilities.includes(capability));
  const peticion = (count) => ({
    capability, model: modelo, input: { prompt: 'Un logo moderno para una panadería', count, kind: 'logo', quality: 'standard', resolution: '1K' },
    ctx: { userId: uid, jobId: 'trabajoDeImagen01', stepId: 's1' }, prefs: { quality: 'standard' }, timeoutMs: 240_000, onStatus: async () => undefined,
  });
  const medida = {};
  for (const N of [1, 2, 3, 4]) {
    llamadasDeRed.length = 0;
    llamadasGemini = 0;
    E.almacen.llamadas.length = 0;
    const serie = await E.preparar(async () => {
      const t0 = reloj.ahora;
      await adaptador.run(peticion(N));
      return reloj.ahora - t0;
    });
    const redSerie = llamadasDeRed.length + llamadasGemini;
    llamadasDeRed.length = 0;
    llamadasGemini = 0;
    const paralelo = await E.preparar(async () => {
      const t0 = reloj.ahora;
      await Promise.all(Array.from({ length: N }, () => adaptador.run(peticion(1))));
      return reloj.ahora - t0;
    });
    const redParalelo = llamadasDeRed.length + llamadasGemini;
    medida[N] = { serieMs: serie, paraleloMs: paralelo, llamadasSerie: redSerie, llamadasParalelo: redParalelo };
  }
  filas.push({ adaptador: id, modelo: modelo.id, medida });
}
E.restaurar();

const md = [];
md.push('# 10 · Propuestas de imagen: serie frente a paralelo (adaptadores reales, red simulada)\n');
md.push(`Medido con \`scripts/bench-r7/10-adaptadores-en-serie.mjs\`. T_GEN = ${T_GEN / 1000} s por imagen (SUPUESTO [E]); creación de tarea ${RED.crear} ms, descarga ${RED.bajar} ms, guardado en Storage 300 ms. «Serie» = UNA llamada al adaptador pidiendo N propuestas (lo que hace hoy el motor). «Paralelo» = N llamadas de una propuesta a la vez (lo que haría un reparto).\n`);
md.push(tabla(['Adaptador', 'Modelo', 'N', 'Serie (ms)', 'Serie / (N=1)', 'Paralelo (ms)', 'Ahorro', 'Llamadas a la red (serie / paralelo)'],
  filas.flatMap((f) => Object.entries(f.medida).map(([N, m]) => [f.adaptador, f.modelo, N, m.serieMs, (m.serieMs / f.medida[1].serieMs).toFixed(2), m.paraleloMs, `${(100 * (1 - m.paraleloMs / m.serieMs)).toFixed(0)} %`, `${m.llamadasSerie} / ${m.llamadasParalelo}`]))));
const dir = guardar('10-adaptadores-en-serie', { T_GEN, RED, filas }, md.join('\n'));
console.log(md.join('\n'));
console.log(`\n(salidas en ${dir})`);
process.exit(0);
