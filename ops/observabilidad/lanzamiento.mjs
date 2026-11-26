#!/usr/bin/env node
/*
 * LAS ALERTAS DEL LANZAMIENTO — Frente H (docs/LANZAMIENTO.md § Observabilidad).
 *
 * `alertas.mjs` (FASE 14) ya tiene las siete alertas de H0. El lanzamiento pide cinco vigilancias más, y no todas
 * se pueden hacer en Cloud Monitoring:
 *
 *  · errores repetidos POR FUNCIÓN ......... política de Monitoring (métrica de Logging que ya existe, gratis)
 *  · proveedor caído ........................ política de Monitoring (dos métricas basadas en logs, por proveedor)
 *  · coste anómalo .......................... SONDA de datos (aiUsage/{día} contra el tope y contra la semana)
 *  · trabajos estancados .................... SONDA de datos (creatorJobs y jobs que siguen «en marcha»)
 *  · inconsistencias financieras ............ SONDA de datos (reservas AUTHORIZED viejas, generaciones cobradas sin asiento)
 *
 * Cloud Monitoring no lee Firestore. Lo que vive en Firestore lo miran las SONDAS: consultas de solo lectura,
 * definidas aquí con su umbral y con un evaluador PURO que las pruebas ejercitan con datos de ejemplo. Las corre
 * `sondas.mjs` (y `scripts/prelanzamiento.mjs --produccion`), y nunca escriben.
 *
 * Este archivo solo DECLARA. Nada aquí habla con Google Cloud: lo aplica `aplicar.mjs`, que por defecto simula.
 * Las políticas versionadas (JSON) están en `ops/observabilidad/politicas/`; las regenera
 * `node ops/observabilidad/lanzamiento.mjs --escribir` y una prueba falla si se desincronizan.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { METRICAS, POLITICAS, PANEL, COMPROBACIONES, PROYECTO } from './alertas.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const CARPETA_VERSIONADA = 'ops/observabilidad/politicas';

/** Un texto del log, buscado en las dos formas en que Cloud Logging guarda un console.* (igual que alertas.mjs). */
const texto = (t) => `(textPayload:"${t}" OR jsonPayload.message:"${t}")`;

/** Los mensajes en los que se apoyan las métricas nuevas, y qué archivo los escribe (lo comprueba la prueba). */
export const MENSAJES_LANZAMIENTO = {
  'WEË AI ENGINE: ': ['functions/src/engine/router.ts'],
  ' en pausa ': ['functions/src/engine/router.ts'],
  ' por fallos repetidos': ['functions/src/engine/router.ts'],
  'WEË AI GATEWAY: ': ['functions/src/engine/gateway.ts'],
  ' falló en ': ['functions/src/engine/router.ts', 'functions/src/engine/gateway.ts'],
};

/**
 * Métricas basadas en logs CON ETIQUETA de proveedor. Formato de la API de Logging (`LogMetric`): así se crean con
 * `gcloud logging metrics create <nombre> --config-from-file=<archivo>`, que es la única forma de pasar etiquetas.
 * Las líneas salen de `console.warn` como texto plano: la etiqueta se extrae de `textPayload`.
 */
const contadorConProveedor = (name, description, filter, regex) => ({
  name,
  description,
  filter,
  metricDescriptor: {
    metricKind: 'DELTA',
    valueType: 'INT64',
    unit: '1',
    labels: [{ key: 'provider', valueType: 'STRING', description: 'Proveedor de IA (gemini, seedance, deepseek…)' }],
  },
  labelExtractors: { provider: `REGEXP_EXTRACT(textPayload, "${regex}")` },
});

export const METRICAS_LANZAMIENTO = [
  contadorConProveedor(
    'wee_proveedor_en_pausa',
    'El circuito de un proveedor de IA se abrió por fallos repetidos (engine/router.ts)',
    `resource.type="cloud_run_revision" AND ${texto('WEË AI ENGINE: ')} AND ${texto(' en pausa ')} AND ${texto(' por fallos repetidos')}`,
    'AI ENGINE: ([a-z0-9-]+) en pausa',
  ),
  contadorConProveedor(
    'wee_proveedor_fallos',
    'Llamadas a un proveedor de IA que fallaron (router legacy y Gateway del Core)',
    `resource.type="cloud_run_revision" AND (${texto('WEË AI ENGINE: ')} OR ${texto('WEË AI GATEWAY: ')}) AND ${texto(' falló en ')}`,
    'AI (?:ENGINE|GATEWAY): ([a-z0-9-]+)/',
  ),
];

/** Errores (severidad ≥ ERROR) en 10 minutos en UNA función a partir de los cuales se avisa. */
export const UMBRAL_ERRORES_POR_FUNCION = 5;
/** Fallos de UN proveedor en 10 minutos a partir de los cuales se considera caído aunque el circuito no se abra. */
export const UMBRAL_FALLOS_DE_PROVEEDOR = 10;

const porSerie = (titulo, filtro, valor, ventana, agrupar) => ({
  displayName: titulo,
  conditionThreshold: {
    filter: filtro,
    comparison: 'COMPARISON_GT',
    thresholdValue: valor,
    duration: '0s',
    aggregations: [{ alignmentPeriod: ventana, perSeriesAligner: 'ALIGN_SUM', crossSeriesReducer: 'REDUCE_SUM', groupByFields: agrupar }],
  },
});

/** Las políticas nuevas (Cloud Monitoring, API v3), con el mismo estilo que las de alertas.mjs. */
export const POLITICAS_LANZAMIENTO = {
  'errores-por-funcion': {
    displayName: 'Weë · errores repetidos en una función',
    documentation: {
      content: `Más de ${UMBRAL_ERRORES_POR_FUNCION} entradas de log con severidad ≥ ERROR en 10 minutos en UNA función (la etiqueta \`service_name\` dice cuál). En Cloud Run, \`console.error\` y \`console.warn\` salen por stderr y cuentan como ERROR. Mira los logs de ese servicio; si empezó con un despliegue, marcha atrás de esa función (docs/LANZAMIENTO.md § Marcha atrás). docs/OBSERVABILITY.md`,
      mimeType: 'text/markdown',
    },
    combiner: 'OR',
    conditions: [porSerie('Errores por función',
      'metric.type="logging.googleapis.com/log_entry_count" AND resource.type="cloud_run_revision" AND metric.label.severity=one_of("ERROR","CRITICAL","ALERT","EMERGENCY")',
      UMBRAL_ERRORES_POR_FUNCION, '600s', ['resource.label.service_name'])],
    alertStrategy: { notificationRateLimit: { period: '3600s' }, autoClose: '86400s' },
  },
  'proveedor-caido': {
    displayName: 'Weë · proveedor de IA caído',
    documentation: {
      content: `Un proveedor de IA tiene el circuito abierto (fallos repetidos: el router lo aparta unos segundos) o más de ${UMBRAL_FALLOS_DE_PROVEEDOR} fallos en 10 minutos. La etiqueta \`provider\` dice cuál. Mira el estado del proveedor y la rotación de su clave (docs/SECURITY.md §4). Si no vuelve, apaga SOLO esa capacidad (docs/LANZAMIENTO.md § Desactivación selectiva): con \`allowMockFallback\` encendido, apagar el proveedor sin más deja que el modo demo atienda y cobre.`,
      mimeType: 'text/markdown',
    },
    combiner: 'OR',
    conditions: [
      porSerie('Circuito abierto', 'metric.type="logging.googleapis.com/user/wee_proveedor_en_pausa" AND resource.type="cloud_run_revision"', 0, '600s', ['metric.label.provider']),
      porSerie('Fallos repetidos', 'metric.type="logging.googleapis.com/user/wee_proveedor_fallos" AND resource.type="cloud_run_revision"', UMBRAL_FALLOS_DE_PROVEEDOR, '600s', ['metric.label.provider']),
    ],
    alertStrategy: { notificationRateLimit: { period: '1800s' }, autoClose: '86400s' },
  },
};

/* ════════════════════════════════════════════════════════════════════════════
 * LAS SONDAS DE DATOS — lo que Cloud Monitoring no puede ver.
 *
 * Cada sonda: qué colección lee (una consulta de UNA igualdad o UN rango, sin índice compuesto: el filtro fino se
 * hace aquí), su umbral, qué hacer, y un `evaluar(documentos, contexto)` PURO que devuelve PASA/FALLA. Los
 * documentos llegan ya convertidos a valores planos (`deFirestore`): un Timestamp es un número en milisegundos.
 * ════════════════════════════════════════════════════════════════════════════ */

export const MINUTO = 60_000;
export const UMBRALES = Object.freeze({
  /** Una reserva de Credits no debe seguir AUTHORIZED más de esto (decisión del plan de lanzamiento). */
  reservaAutorizadaMin: 15,
  /** Un trabajo de WEË AI en marcha más allá de su `deadlineAt`, o sin moverse este tiempo si no lo tiene. */
  trabajoEstancadoMin: 30,
  /** Un trabajo del Core en `running`/`queued`/`waiting` sin moverse este tiempo (el vídeo admite 20 min). */
  trabajoCoreEstancadoMin: 45,
  /** Fracción del tope diario (`maxUsdPerDay`) a partir de la cual se avisa antes de que la IA se pare. */
  fraccionDelTope: 0.8,
  /** Hoy vale más que esto veces la mediana de los 7 días anteriores… */
  multiploDeLaSemana: 3,
  /** …y más que este suelo en USD (por debajo, el ruido de un día tranquilo no es una anomalía). */
  sueloUsd: 5,
  /** Ventana de generaciones que se cotejan con su asiento. */
  ventanaCotejoHoras: 24,
});

const ms = (v) => (typeof v === 'number' ? v : typeof v === 'string' && v ? Date.parse(v) : NaN);
const viejo = (v, ahora, minutos) => Number.isFinite(ms(v)) && ahora - ms(v) > minutos * MINUTO;
const lista = (xs, n = 5) => xs.slice(0, n).join(', ') + (xs.length > n ? ` y ${xs.length - n} más` : '');
const res = (falla, siFalla, siPasa) => (falla ? { estado: 'FALLA', detalle: siFalla } : { estado: 'PASA', detalle: siPasa });

/** Igual que `usdToday` del motor (engine/limits.ts): dinero medido + dinero en riesgo, sumado por proveedor. */
export const usdDelDia = (uso) => {
  const n = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  return Object.values((uso && uso.byProvider) || {}).reduce((t, f) => t + n(f && f.usd) + n(f && f.usdEnRiesgo), 0);
};

const mediana = (xs) => {
  if (!xs.length) return 0;
  const o = [...xs].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
};

export const diaUtc = (ahora, menos = 0) => new Date(ahora - menos * 86_400_000).toISOString().slice(0, 10);

export const SONDAS = [
  {
    id: 'reservas-autorizadas',
    titulo: `Reservas de Credits AUTHORIZED de más de ${UMBRALES.reservaAutorizadaMin} min`,
    lectura: { tipo: 'consulta', coleccion: 'creditTransactions', donde: { campo: 'status', igual: 'AUTHORIZED' }, limite: 500 },
    queHacer: 'Una reserva que no se completa ni se reembolsa retiene Credits de la persona. Busca su trabajo (`requestId`) y ciérrala con el Credit Engine (idempotente). En el camino legacy no hay barrido de reservas (X4/F-02).',
    evaluar: (docs, { ahora }) => {
      const viejas = docs.filter((d) => d.status === 'AUTHORIZED' && viejo(d.createdAt, ahora, UMBRALES.reservaAutorizadaMin));
      return res(viejas.length > 0, `${viejas.length} reserva(s) retenida(s): ${lista(viejas.map((d) => d.id))}`, `ninguna reserva AUTHORIZED de más de ${UMBRALES.reservaAutorizadaMin} min (${docs.length} autorizadas ahora)`);
    },
  },
  {
    id: 'cobradas-sin-asiento',
    titulo: `Generaciones cobradas sin asiento cerrado (últimas ${UMBRALES.ventanaCotejoHoras} h)`,
    lectura: { tipo: 'consulta', coleccion: 'aiGenerations', donde: { campo: 'createdAt', desdeHoras: UMBRALES.ventanaCotejoHoras }, limite: 2000, cotejar: { coleccion: 'creditTransactions', campo: 'creditTransactionId' } },
    queHacer: 'Una generación con `creditsCharged > 0` tiene que estar atada a una transacción COMPLETED del Credit Engine. Si falta o sigue abierta, el libro dice que se cobró algo que el saldo no refleja (o al revés): concilia trabajo → generación → asiento (A-10).',
    evaluar: (docs, { asientos = {} }) => {
      const cobradas = docs.filter((d) => typeof d.creditsCharged === 'number' && d.creditsCharged > 0 && d.attribution !== 'eval');
      const malas = cobradas.filter((d) => {
        const tx = d.creditTransactionId ? asientos[d.creditTransactionId] : undefined;
        return !tx || tx.status !== 'COMPLETED';
      });
      return res(malas.length > 0, `${malas.length} de ${cobradas.length} generaciones cobradas sin asiento COMPLETED: ${lista(malas.map((d) => `${d.id}→${d.creditTransactionId || 'sin transacción'}`))}`, `${cobradas.length} generaciones cobradas, todas con su asiento COMPLETED`);
    },
  },
  {
    id: 'trabajos-estancados',
    titulo: 'Trabajos de WEË AI en marcha más allá de su plazo',
    lectura: { tipo: 'consulta', coleccion: 'creatorJobs', donde: { campo: 'status', igual: 'running' }, limite: 500 },
    queHacer: 'Un `creatorJobs` en `running` pasado su `deadlineAt` no va a terminar solo: su reserva sigue retenida. Mira `liquidacionPendiente` y el log de la función (`creatorRun`).',
    evaluar: (docs, { ahora }) => {
      const parados = docs.filter((d) => d.status === 'running' && (Number.isFinite(ms(d.deadlineAt))
        ? ahora - ms(d.deadlineAt) > 0
        : viejo(d.updatedAt, ahora, UMBRALES.trabajoEstancadoMin)));
      return res(parados.length > 0, `${parados.length} trabajo(s) parado(s): ${lista(parados.map((d) => d.id))}`, `${docs.length} en marcha, ninguno pasado de plazo`);
    },
  },
  {
    id: 'trabajos-core-estancados',
    titulo: `Trabajos del Core sin moverse más de ${UMBRALES.trabajoCoreEstancadoMin} min`,
    lectura: { tipo: 'consulta', coleccion: 'jobs', donde: { campo: 'state', en: ['running', 'queued', 'waiting'] }, limite: 500 },
    queHacer: 'El barrido (`barridoDeLiquidacion`, cada 5 min) debería moverlos. Si no se mueven, mira la alerta «el barrido no termina» y docs/RUNTIME.md.',
    evaluar: (docs, { ahora }) => {
      const parados = docs.filter((d) => ['running', 'queued', 'waiting'].includes(d.state) && viejo(d.updatedAt, ahora, UMBRALES.trabajoCoreEstancadoMin));
      return res(parados.length > 0, `${parados.length} trabajo(s) del Core parado(s): ${lista(parados.map((d) => `${d.id}(${d.state})`))}`, `${docs.length} vivos, ninguno parado`);
    },
  },
  {
    id: 'coste-diario',
    titulo: 'Coste de IA de hoy frente al tope y a la semana',
    lectura: { tipo: 'documentos', rutas: ({ ahora }) => ['aiSettings/global', ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `aiUsage/${diaUtc(ahora, i)}`)] },
    queHacer: 'Sin `maxUsdPerDay` el gasto de proveedor no tiene techo. Cerca del tope, la IA se va a parar sola (sin cobrar). Muy por encima de la semana: abuso o éxito; mira `aiGenerations` de hoy por persona y proveedor.',
    evaluar: (docs, { ahora }) => {
      const porRuta = Object.fromEntries(docs.map((d) => [d.__ruta, d]));
      const tope = porRuta['aiSettings/global'] && porRuta['aiSettings/global'].maxUsdPerDay;
      const hoy = usdDelDia(porRuta[`aiUsage/${diaUtc(ahora, 0)}`]);
      const semana = [1, 2, 3, 4, 5, 6, 7].map((i) => usdDelDia(porRuta[`aiUsage/${diaUtc(ahora, i)}`]));
      const base = mediana(semana);
      const motivos = [];
      if (!(typeof tope === 'number' && tope > 0)) motivos.push('no hay `maxUsdPerDay` en aiSettings/global: el gasto diario de proveedor no tiene techo');
      else if (hoy >= tope * UMBRALES.fraccionDelTope) motivos.push(`hoy van ${hoy.toFixed(2)} USD de un tope de ${tope} (≥ ${UMBRALES.fraccionDelTope * 100} %)`);
      if (hoy > UMBRALES.sueloUsd && hoy > base * UMBRALES.multiploDeLaSemana) motivos.push(`hoy ${hoy.toFixed(2)} USD, más de ${UMBRALES.multiploDeLaSemana}× la mediana de la semana (${base.toFixed(2)} USD)`);
      return res(motivos.length > 0, motivos.join('; '), `hoy ${hoy.toFixed(2)} USD, tope ${tope} USD, mediana de la semana ${base.toFixed(2)} USD`);
    },
  },
];

/* ── Firestore REST → valores planos (las sondas evalúan esto) ───────────────── */
export const valorDe = (v) => {
  if (!v || typeof v !== 'object') return undefined;
  if ('nullValue' in v) return null;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('timestampValue' in v) return Date.parse(v.timestampValue);
  if ('stringValue' in v) return v.stringValue;
  if ('referenceValue' in v) return v.referenceValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(valorDe);
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, valorDe(x)]));
  return undefined;
};
export const deFirestore = (doc) => ({
  ...Object.fromEntries(Object.entries((doc && doc.fields) || {}).map(([k, v]) => [k, valorDe(v)])),
  id: String((doc && doc.name) || '').split('/').pop(),
  __ruta: String((doc && doc.name) || '').split('/documents/')[1] || '',
});

/** La consulta REST (`:runQuery`) de una sonda. Solo `where` + `limit`: nunca un orden que exija índice compuesto. */
export const consultaDe = (lectura, ahora) => {
  const d = lectura.donde;
  let where;
  if (d.igual !== undefined) where = { fieldFilter: { field: { fieldPath: d.campo }, op: 'EQUAL', value: { stringValue: d.igual } } };
  else if (d.en) where = { fieldFilter: { field: { fieldPath: d.campo }, op: 'IN', value: { arrayValue: { values: d.en.map((x) => ({ stringValue: x })) } } } };
  else if (d.desdeHoras) where = { fieldFilter: { field: { fieldPath: d.campo }, op: 'GREATER_THAN_OR_EQUAL', value: { timestampValue: new Date(ahora - d.desdeHoras * 3_600_000).toISOString() } } };
  return { structuredQuery: { from: [{ collectionId: lectura.coleccion }], where, limit: lectura.limite } };
};

/**
 * Corre las sondas con un lector inyectado (SOLO LECTURA): `leer.consulta(coleccion, cuerpo)` y
 * `leer.documentos(rutas)` devuelven documentos ya planos. Las pruebas le pasan datos de ejemplo; `sondas.mjs`,
 * la API REST de Firestore.
 */
export const correrSondas = async (leer, { ahora = Date.now(), solo } = {}) => {
  const out = [];
  for (const s of SONDAS.filter((x) => !solo || solo.includes(x.id))) {
    try {
      let docs;
      let asientos;
      if (s.lectura.tipo === 'consulta') {
        docs = await leer.consulta(s.lectura.coleccion, consultaDe(s.lectura, ahora));
        if (s.lectura.cotejar) {
          const ids = [...new Set(docs.map((d) => d[s.lectura.cotejar.campo]).filter(Boolean))];
          const leidos = ids.length ? await leer.documentos(ids.map((id) => `${s.lectura.cotejar.coleccion}/${id}`)) : [];
          asientos = Object.fromEntries(leidos.map((d) => [d.id, d]));
        }
      } else docs = await leer.documentos(s.lectura.rutas({ ahora }));
      const r = s.evaluar(docs, { ahora, asientos });
      out.push({ id: s.id, titulo: s.titulo, ...r, ...(r.estado === 'FALLA' ? { queHacer: s.queHacer } : {}) });
    } catch (e) {
      out.push({ id: s.id, titulo: s.titulo, estado: 'FALLA', detalle: `no se pudo leer: ${String((e && e.message) || e).slice(0, 200)}` });
    }
  }
  return out;
};

/* ── Lo que se aplica: H0 (alertas.mjs) + lanzamiento, en un solo conjunto ───── */

/** Todas las métricas basadas en logs, en formato `LogMetric` (las de alertas.mjs no llevan etiquetas). */
export const metricasDeseadas = () => [
  ...METRICAS.map((m) => ({ name: m.nombre, description: m.descripcion, filter: m.filtro })),
  ...METRICAS_LANZAMIENTO,
];
export const politicasDeseadas = () => ({ ...POLITICAS, ...POLITICAS_LANZAMIENTO });
export { PANEL, COMPROBACIONES, PROYECTO };

/** Los archivos versionados: nombre → contenido. Una política por archivo, cada métrica por archivo, y el panel. */
export const archivosVersionados = () => {
  const a = {};
  for (const m of metricasDeseadas()) a[`metrica-${m.name}.json`] = m;
  for (const [n, p] of Object.entries(politicasDeseadas())) a[`politica-${n}.json`] = p;
  a['panel.json'] = PANEL;
  a['comprobaciones.json'] = COMPROBACIONES;
  return Object.fromEntries(Object.entries(a).map(([n, c]) => [n, JSON.stringify(c, null, 2) + '\n']));
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (process.argv.includes('--escribir')) {
    const dir = path.join(RAIZ, CARPETA_VERSIONADA);
    fs.mkdirSync(dir, { recursive: true });
    const quedan = new Set(Object.keys(archivosVersionados()));
    for (const f of fs.readdirSync(dir)) if (f.endsWith('.json') && !quedan.has(f)) fs.rmSync(path.join(dir, f));
    for (const [n, c] of Object.entries(archivosVersionados())) fs.writeFileSync(path.join(dir, n), c);
    console.log(`escritos ${quedan.size} archivos en ${CARPETA_VERSIONADA}/`);
  } else {
    console.log('# Weë · alertas del lanzamiento. Solo declara: para ver el diff contra Google Cloud, node ops/observabilidad/aplicar.mjs');
    for (const n of Object.keys(archivosVersionados())) console.log(`  ${CARPETA_VERSIONADA}/${n}`);
    for (const s of SONDAS) console.log(`  sonda ${s.id}: ${s.titulo}`);
  }
}
