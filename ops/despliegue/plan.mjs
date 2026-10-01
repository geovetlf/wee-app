/*
 * EL PLAN DE UN DESPLIEGUE — lógica pura del workflow de producción (FASE 6).
 *
 * Todo lo que decide el workflow `.github/workflows/despliegue.yml` vive aquí
 * sin red ni credenciales, para poder probarlo entero
 * (functions/test/despliegue-workflow.test.mjs). Los scripts de al lado solo
 * traen los datos (git, GitHub, Cloud Run) y llaman a estas funciones.
 */

/** Lo que el workflow sabe desplegar. Cualquier otra cosa es un error, no se adivina. */
export const OBJETIVOS_FIJOS = new Set(['firestore:rules', 'firestore:indexes', 'storage', 'hosting:get-wee', 'hosting:wee-app']);
const NOMBRE_DE_FUNCION = /^[A-Za-z][A-Za-z0-9]{0,62}$/;

/** `functions:a,functions:b,firestore:rules` → qué se despliega, o por qué no. */
export const leerObjetivo = (texto) => {
  const piezas = String(texto || '').split(',').map((s) => s.trim()).filter(Boolean);
  const funciones = [];
  const otros = [];
  const errores = [];
  if (!piezas.length) errores.push('falta qué desplegar');
  for (const p of piezas) {
    if (p === 'functions') { errores.push('«functions» a secas desplegaría TODAS: nombra cada función (functions:nombre)'); continue; }
    const f = p.match(/^functions:(.+)$/);
    if (f) {
      if (!NOMBRE_DE_FUNCION.test(f[1])) errores.push(`nombre de función inválido: ${f[1]}`);
      else if (!funciones.includes(f[1])) funciones.push(f[1]);
      continue;
    }
    if (OBJETIVOS_FIJOS.has(p)) { if (!otros.includes(p)) otros.push(p); continue; }
    errores.push(`objetivo desconocido: ${p}`);
  }
  return { funciones, otros, errores, solo: [...funciones.map((f) => `functions:${f}`), ...otros].join(',') };
};

/** Los tres niveles de la CI (los `name` de los jobs de ci.yml). */
export const NIVELES_DE_CI = ['Nivel 1 · tipos y build', 'Nivel 2 · suites, seguridad y configuración', 'Nivel 3 · emuladores demo-*'];

/**
 * ¿Se puede desplegar este commit? Tiene que ser un SHA completo, estar en main
 * y tener la CI en verde (los tres niveles, en ESE commit).
 */
export const motivosContraElCommit = ({ sha, enMain, checkRuns }) => {
  const motivos = [];
  if (!/^[0-9a-f]{40}$/.test(String(sha || ''))) motivos.push('el commit tiene que ser un SHA completo (40 caracteres hexadecimales)');
  if (enMain !== true) motivos.push('el commit no está en main: producción solo se despliega desde main');
  const porNombre = new Map((checkRuns || []).map((c) => [c.name, c]));
  for (const nivel of NIVELES_DE_CI) {
    const c = porNombre.get(nivel);
    if (!c) motivos.push(`la CI no tiene «${nivel}» para este commit`);
    else if (c.status !== 'completed' || c.conclusion !== 'success') motivos.push(`«${nivel}»: ${c.status}${c.conclusion ? ` / ${c.conclusion}` : ''}`);
  }
  return motivos;
};

/** El servicio de Cloud Run de una función gen2 es su nombre en minúsculas. */
export const servicioDe = (funcion) => String(funcion).toLowerCase();

/** Tipo de disparador de una función, a partir de su `__endpoint` compilado. */
export const tipoDeFuncion = (endpoint) => {
  if (!endpoint) return 'desconocido';
  if (endpoint.callableTrigger) return 'callable';
  if (endpoint.httpsTrigger) return 'http';
  if (endpoint.scheduleTrigger) return 'programada';
  if (endpoint.eventTrigger) return 'evento';
  return 'desconocido';
};

/**
 * HUMO SIN GASTO. A una callable o una HTTP se le hace UNA petición sin sesión y
 * con cuerpo vacío: ninguna llama a una IA sin una persona identificada, así que
 * no se gasta nada. Lo que se mide es que la revisión nueva SIRVE: cualquier
 * respuesta 2xx–4xx vale (401/403 son «viva y cerrada»); un 5xx, o no responder,
 * es fallo. Las programadas y las de eventos no se llaman: basta con que su
 * revisión esté lista.
 */
export const juzgarHumo = ({ tipo, lista, status }) => {
  if (lista !== true) return { ok: false, motivo: 'la revisión nueva no está lista' };
  if (tipo === 'programada' || tipo === 'evento') return { ok: true, motivo: 'revisión lista (no se llama)' };
  if (typeof status !== 'number') return { ok: false, motivo: 'no respondió' };
  if (status >= 500) return { ok: false, motivo: `respondió ${status}` };
  return { ok: true, motivo: `respondió ${status}` };
};

/**
 * LA MARCHA ATRÁS no es un despliegue: es devolver el tráfico a la revisión que
 * servía antes. Solo se tocan los servicios cuya revisión cambió.
 *
 * Nunca se vuelve a una revisión PROHIBIDA: la que no lleva un arreglo de
 * seguridad que exige el mapa. El caso es spendCredits: `firebase deploy` le
 * devuelve el invocador público, y su revisión de antes no tiene `assertAdmin`;
 * devolverle el tráfico reabriría H0 #24. Esa marcha atrás se queda BLOQUEADA y
 * el tráfico, en la revisión nueva, que está cerrada en el código.
 */
export const planDeMarchaAtras = (antes, despues, prohibidas = new Set()) => Object.entries(antes || {})
  .filter(([servicio, revision]) => revision && despues && despues[servicio] && despues[servicio] !== revision)
  .map(([servicio, revision]) => (prohibidas.has(revision)
    ? { servicio, revision, bloqueada: true, motivo: 'esa revisión no lleva un arreglo de seguridad que exige ops/produccion.json: el tráfico se queda en la nueva' }
    : { servicio, revision }));

/** Las revisiones del mapa a las que no se vuelve: las de funciones con arreglos `requiere` pendientes. */
export const revisionesSinArreglo = (manifiesto) => new Set(((manifiesto && manifiesto.funciones) || [])
  .filter((f) => (f.requiere || []).length && f.revision).map((f) => f.revision));

/** El cuerpo del PATCH de Cloud Run (v2) que manda el 100 % del tráfico a una revisión. */
export const cuerpoDeTrafico = (revision) => ({
  traffic: [{ type: 'TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION', revision, percent: 100 }],
});

/** El tag con el que queda registrado un despliegue (inmutable). */
export const tagDeDespliegue = (objetivo, fechaIso) => {
  const m = String(fechaIso).match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
  if (!m) throw new Error(`fecha inválida: ${fechaIso}`);
  const cuando = `${m[1]}T${m[2]}${m[3]}Z`;
  const { funciones, otros } = leerObjetivo(objetivo);
  const que = funciones.length === 1 && !otros.length ? `functions/${funciones[0]}`
    : funciones.length ? `functions/${funciones.length}fn${otros.length ? `+${otros.length}` : ''}`
      : otros.map((o) => o.replace(':', '-')).join('+');
  return `prod/${que}/${cuando}`;
};

/* ── Marcha atrás reproducible, desde el mapa ───────────────────────────────── */

/**
 * La vuelta al ESTADO CONOCIDO: para cada función, el comando que manda todo su
 * tráfico a la revisión que recoge `ops/produccion.json`. Sirve tras un
 * despliegue manual o cuando no hay `antes.json`. Solo genera texto: lo ejecuta
 * el dueño. Una función cuya revisión del mapa no lleva un arreglo de seguridad
 * exigido (`requiere`) NO recibe comando: volver a ella reabriría lo que el
 * arreglo cierra; se vuelve a una revisión desplegada desde ese commit o
 * posterior, que está en el registro de su despliegue.
 */
export const comandosDeVueltaAlMapa = (manifiesto, funciones, { proyecto = 'get-wee', region = 'us-central1' } = {}) => {
  const porNombre = new Map((manifiesto.funciones || []).map((f) => [f.funcion, f]));
  const comandos = [];
  const errores = [];
  for (const nombre of funciones) {
    const f = porNombre.get(nombre);
    if (!f) { errores.push(`${nombre}: no está en ops/produccion.json; no hay estado conocido al que volver`); continue; }
    if ((f.requiere || []).length) {
      errores.push(`${nombre}: su revisión del mapa (${f.revision}) no lleva ${f.requiere.map((r) => `${r.commit.slice(0, 7)} (${r.motivo})`).join(', ')}; `
        + 'volver a ella reabriría lo que cierra. Vuelve a una revisión desplegada desde ese commit o posterior (registro del despliegue).');
      continue;
    }
    if (f.aviso) comandos.push(`# AVISO ${nombre}: ${f.aviso}`);
    comandos.push(`gcloud run services update-traffic ${servicioDe(nombre)} --region ${region} --project ${proyecto} --to-revisions ${f.revision}=100   # ${f.tag}`);
  }
  return { comandos, errores };
};

/* ── Humo sin credenciales (para el dueño, tras un despliegue manual) ──────── */

/** La URL pública de una función gen2 de get-wee (la de cloudfunctions.net sigue sirviendo). */
export const urlDeFuncion = (funcion, { proyecto = 'get-wee', region = 'us-central1' } = {}) => `https://${region}-${proyecto}.cloudfunctions.net/${funcion}`;

/** Sin credenciales no se sabe si la revisión está lista: se juzga solo por la respuesta, y lo que no se puede llamar se dice. */
export const juzgarHumoSinCredenciales = ({ tipo, status }) => {
  if (tipo === 'programada' || tipo === 'evento') return { ok: true, motivo: 'no se puede comprobar sin credenciales (no se llama)', verificado: false };
  if (typeof status !== 'number') return { ok: false, motivo: 'no respondió', verificado: true };
  if (status >= 500) return { ok: false, motivo: `respondió ${status}`, verificado: true };
  return { ok: true, motivo: `respondió ${status}`, verificado: true };
};

/* ── Registro: qué imagen exacta quedó sirviendo ───────────────────────────── */

/** De `…/images/x@sha256:abc` a `sha256:abc`. Una imagen sin digest no sirve como prueba de qué corre. */
export const digestDeImagen = (imagen) => {
  const m = String(imagen || '').match(/@(sha256:[0-9a-f]{64})$/);
  return m ? m[1] : null;
};

/* ── La revisión que SIRVE ─────────────────────────────────────────────────── */

/**
 * Cuál sirve el tráfico, leído de `trafficStatuses` (Cloud Run v2). No es lo mismo
 * que la última lista: tras una marcha atrás el tráfico queda fijado a una
 * revisión vieja y la última lista es justo la mala, así que anotar esa como «la
 * de antes» haría que una segunda marcha atrás devolviera el tráfico a la mala.
 * Si el tráfico está repartido entre varias, no hay UNA a la que volver: se dice
 * y no se adivina.
 */
export const revisionQueSirve = (servicio) => {
  const ultimo = (n) => (n ? String(n).split('/').pop() : null);
  const estados = (servicio && servicio.trafficStatuses) || [];
  const llenos = estados.filter((t) => t.percent === 100);
  if (llenos.length === 1) {
    const t = llenos[0];
    if (t.revision) return { revision: ultimo(t.revision), reparto: null };
    if (t.type === 'TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST') return { revision: ultimo(servicio.latestReadyRevision), reparto: null };
  }
  return { revision: null, reparto: estados.filter((t) => t.percent).map((t) => `${ultimo(t.revision) || 'la última'}=${t.percent}%`) };
};

/* ── Hashes de la web publicada ────────────────────────────────────────────── */

/** Un patrón de `hosting.ignore` (glob: `*`, `**`, `?`) como expresión regular sobre rutas relativas. */
export const globARegex = (glob) => {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') {
      if (glob[i + 2] === '/') { re += '(?:.*/)?'; i += 2; } else { re += '.*'; i += 1; }
    } else if (c === '*') re += '[^/]*';
    else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
};

/**
 * Qué archivos comparar: TODOS los que el sitio publica, es decir, los de la
 * carpeta menos los que su `ignore` de firebase.json deja fuera (un archivo
 * dentro de una carpeta ignorada también queda fuera). Un 200 no prueba nada:
 * con la reescritura de la SPA, un archivo que falta devuelve index.html con 200
 * —lo que tapó las 37 fuentes y los 11 PNG en septiembre, porque `ignore`
 * descartaba `**\/node_modules/**`—. Por eso se compara el CONTENIDO.
 */
export const archivosAComparar = (rutas, ignorar = []) => {
  const patrones = ignorar.map(globARegex);
  const ignorada = (ruta) => {
    const partes = ruta.split('/');
    return partes.some((_, i) => { const tramo = partes.slice(0, i + 1).join('/'); return patrones.some((p) => p.test(tramo)); });
  };
  return rutas.filter((r) => !ignorada(r)).sort();
};

/** Compara lo local con lo publicado. `remotos[ruta]` es el sha256 servido, o null si no se pudo leer. */
export const compararHashes = (locales, remotos) => {
  const distintos = [];
  const ausentes = [];
  for (const [ruta, hash] of Object.entries(locales)) {
    if (!(ruta in remotos) || remotos[ruta] === null) ausentes.push(ruta);
    else if (remotos[ruta] !== hash) distintos.push(ruta);
  }
  return { ok: distintos.length === 0 && ausentes.length === 0, distintos, ausentes, comparados: Object.keys(locales).length };
};

/* ── Observación después del despliegue ────────────────────────────────────── */

/** El filtro de Cloud Monitoring para las respuestas 5xx de unos servicios de Cloud Run. */
export const filtroDe5xx = (servicios) => {
  const nombres = [...new Set(servicios)].map((s) => `"${s}"`).join(' OR ');
  return `metric.type="run.googleapis.com/request_count" AND resource.type="cloud_run_revision" AND metric.label.response_code_class="5xx" AND resource.label.service_name=(${nombres})`;
};

/** La política de observación, escrita aquí y en ningún otro sitio (docs/DEPLOYMENT.md §6). */
export const OBSERVACION = { minutos: 10, umbral: 5 };

/**
 * La regla de la ventana de observación: se cuentan los 5xx de los servicios
 * desplegados en los minutos que siguen al despliegue y en otros tantos de antes.
 * Un proveedor caído ya produce 5xx controlados (503) sin que nadie despliegue
 * nada, así que lo que cuenta es lo que SUBE: si después hay más de `umbral`
 * por encima de antes, el despliegue se da por fallido y el workflow devuelve el
 * tráfico (marcha atrás). Si no se puede medir, también: lo que no se sabe no
 * se da por bueno. La decide código, con una cifra escrita: nunca una IA.
 */
export const juzgarObservacion = ({ antes, despues, umbral = OBSERVACION.umbral }) => {
  if (!Number.isFinite(antes) || !Number.isFinite(despues)) return { ok: false, motivo: 'no se pudo medir: se trata como fallo' };
  const subida = despues - antes;
  const motivo = `${despues} respuestas 5xx después, ${antes} antes (subida ${subida}, umbral ${umbral})`;
  return { ok: subida <= umbral, motivo };
};

/** Los parámetros de `projects.timeSeries.list` que suman los 5xx de una ventana en un solo número por serie. */
export const consultaDe5xx = (servicios, desdeIso, hastaIso) => {
  const segundos = Math.max(60, Math.round((Date.parse(hastaIso) - Date.parse(desdeIso)) / 1000));
  return new URLSearchParams({
    filter: filtroDe5xx(servicios),
    'interval.startTime': desdeIso,
    'interval.endTime': hastaIso,
    'aggregation.alignmentPeriod': `${segundos}s`,
    'aggregation.perSeriesAligner': 'ALIGN_SUM',
    'aggregation.crossSeriesReducer': 'REDUCE_SUM',
  });
};

/** Suma lo que devuelve esa consulta (sin series = cero respuestas 5xx). */
export const sumarSeries = (respuesta) => ((respuesta && respuesta.timeSeries) || [])
  .flatMap((s) => s.points || [])
  .reduce((total, p) => total + Number(p.value?.int64Value ?? p.value?.doubleValue ?? 0), 0);

/* ── El registro del despliegue ────────────────────────────────────────────── */

/**
 * El mensaje del tag `prod/…`: qué commit, qué objetivo, quién lo lanzó, y para
 * cada función la revisión que quedó sirviendo y el digest exacto de su imagen;
 * para cada sitio, la versión publicada y cuántos archivos se compararon. Es lo
 * que la auditoría H0 tuvo que reconstruir a mano.
 */
export const mensajeDelRegistro = ({ commit, objetivo, run, funciones = [], sitios = [] }) => [
  `Desplegado en get-wee: ${objetivo}`,
  `Commit: ${commit}`,
  `Workflow: ${run}`,
  ...funciones.map((f) => `función ${f.funcion}: revisión ${f.revision || '¿?'} · imagen ${f.digest || 'sin digest'}`),
  ...sitios.map((s) => `hosting ${s.sitio}: versión ${s.version || '¿?'} · ${s.comparados} archivos con el mismo sha256 que el commit`),
].join('\n');
