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
 */
export const planDeMarchaAtras = (antes, despues) => Object.entries(antes || {})
  .filter(([servicio, revision]) => revision && despues && despues[servicio] && despues[servicio] !== revision)
  .map(([servicio, revision]) => ({ servicio, revision }));

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
